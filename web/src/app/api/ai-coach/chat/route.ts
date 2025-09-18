import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { aiCoachService } from "@/lib/gemini/coach-service";
import { factChecker } from "@/lib/gemini/fact-checker";
import { toolRecommender } from "@/lib/gemini/tool-recommender";
import { performanceMonitor } from "@/lib/monitoring/performance-monitor";
import {
  errorHandler,
  withErrorHandling,
} from "@/lib/monitoring/error-handler";
import { checkRateLimit, consumeRateLimit } from "@/lib/gemini/rate-limiter";
import { ChatMessage } from "@/lib/gemini/types";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    // Authenticate user
    const authResult = await auth();
    userId = authResult.userId || undefined;

    if (!userId) {
      performanceMonitor.trackAPICall(
        "/api/ai-coach/chat",
        "POST",
        Date.now() - startTime,
        401,
        undefined,
        "Authentication required"
      );
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check rate limits
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      performanceMonitor.trackAPICall(
        "/api/ai-coach/chat",
        "POST",
        Date.now() - startTime,
        429,
        userId,
        "Rate limit exceeded"
      );
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded. Please wait a moment before sending another message.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter:
            Math.ceil(rateLimitCheck.info.resetTime - Date.now()) / 1000,
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { messages, stream = false, options = {} } = body;

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Validate message format
    const validMessages: ChatMessage[] = messages.map((msg, index) => {
      if (!msg.content || typeof msg.content !== "string") {
        throw new Error(`Message at index ${index} must have content`);
      }

      return {
        id: msg.id || `msg_${Date.now()}_${index}`,
        role: msg.role || "user",
        content: msg.content,
        timestamp: msg.timestamp || Date.now(),
        userId,
        conversationId: msg.conversationId || `conv_${Date.now()}`,
        metadata: msg.metadata || {},
      };
    });

    // Handle streaming response
    if (stream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of aiCoachService.generateStreamingCoachResponse(
              validMessages,
              userId!
            )) {
              const data = JSON.stringify(chunk) + "\n";
              controller.enqueue(encoder.encode(data));
            }
            controller.close();
          } catch (error) {
            console.error("Streaming error:", error);
            const errorChunk = {
              chunk:
                "I apologize, but I encountered an error. Please try again.",
              isComplete: true,
              messageId: `error_${Date.now()}`,
            };
            controller.enqueue(
              encoder.encode(JSON.stringify(errorChunk) + "\n")
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Handle regular response
    const response = await aiCoachService.generateCoachResponse(
      validMessages,
      userId,
      undefined, // userProfile - TODO: implement user profile retrieval
      {
        ...options,
        includeFactCheck: options.includeFactCheck ?? true,
        includeToolRecommendations: options.includeToolRecommendations ?? true,
      }
    );

    // Generate additional insights if requested
    let factChecks: any[] = [];
    let toolRecommendations: any[] = [];

    if (options.includeFactCheck !== false) {
      // Extract claims from the latest user message for fact-checking
      const latestUserMessage = validMessages
        .filter((m) => m.role === "user")
        .pop();
      if (latestUserMessage) {
        const claims = factChecker.extractClaimsFromMessage(
          latestUserMessage.content
        );
        if (claims.length > 0) {
          factChecks = await factChecker.batchFactCheck(claims, userId);
        }
      }
    }

    if (options.includeToolRecommendations !== false) {
      // Generate tool recommendations based on conversation
      toolRecommendations = await toolRecommender.generateRecommendations(
        validMessages,
        userId,
        3
      );
    }

    // Consume rate limit after successful processing
    consumeRateLimit(userId);

    // Track successful API call
    const responseTime = Date.now() - startTime;
    performanceMonitor.trackAPICall(
      "/api/ai-coach/chat",
      "POST",
      responseTime,
      200,
      userId
    );

    // Track conversation metrics
    performanceMonitor.trackConversation({
      conversationId: validMessages[0]?.conversationId || `conv_${Date.now()}`,
      userId,
      messageCount: validMessages.length,
      duration: responseTime,
      tokensUsed: response.metadata?.tokens || 0,
      factChecksPerformed: factChecks.length,
      toolsRecommended: toolRecommendations.length,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: response,
      insights: {
        factChecks,
        toolRecommendations,
        factCheckSummary:
          factChecks.length > 0
            ? factChecker.generateFactCheckSummary(factChecks)
            : null,
        toolSummary:
          toolRecommendations.length > 0
            ? toolRecommender.generateRecommendationSummary(toolRecommendations)
            : null,
      },
      metadata: {
        userId,
        timestamp: Date.now(),
        model: response.metadata?.model,
        tokens: response.metadata?.tokens,
        processingTime: response.metadata?.processingTime,
        factChecksPerformed: factChecks.length,
        toolsRecommended: toolRecommendations.length,
        responseTime,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log error with context
    const errorId = errorHandler.logError(
      error instanceof Error ? error : new Error(errorMessage),
      userId,
      "/api/ai-coach/chat",
      {
        requestBody: "present",
        userAgent: request.headers.get("user-agent"),
        responseTime,
      }
    );

    // Determine appropriate status code and response
    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";
    let userMessage = "Internal server error. Please try again.";

    if (errorMessage.includes("rate limit")) {
      statusCode = 429;
      errorCode = "RATE_LIMIT_EXCEEDED";
      userMessage =
        "Rate limit exceeded. Please wait a moment before sending another message.";
    } else if (errorMessage.includes("quota")) {
      statusCode = 503;
      errorCode = "QUOTA_EXCEEDED";
      userMessage = "Service temporarily unavailable. Please try again later.";
    } else if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("unauthorized")
    ) {
      statusCode = 401;
      errorCode = "AUTHENTICATION_ERROR";
      userMessage = "Authentication failed. Please sign in again.";
    } else if (
      errorMessage.includes("validation") ||
      errorMessage.includes("invalid")
    ) {
      statusCode = 400;
      errorCode = "VALIDATION_ERROR";
      userMessage = "Invalid request data. Please check your input.";
    }

    // Track failed API call
    performanceMonitor.trackAPICall(
      "/api/ai-coach/chat",
      "POST",
      responseTime,
      statusCode,
      userId,
      errorMessage
    );

    return NextResponse.json(
      {
        error: userMessage,
        code: errorCode,
        errorId,
        ...(statusCode === 429 && { retryAfter: 60 }),
      },
      { status: statusCode }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
