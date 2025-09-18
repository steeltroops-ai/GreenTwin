import { getGeminiModel, safetySettings } from "./config";
import {
  GeminiResponse,
  GeminiError,
  StreamingResponse,
  ChatMessage,
} from "./types";
import { checkRateLimit, consumeRateLimit } from "./rate-limiter";

export class GeminiClient {
  private model = getGeminiModel();

  async generateResponse(
    messages: ChatMessage[],
    userId: string,
    options: {
      stream?: boolean;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<GeminiResponse> {
    const startTime = Date.now();

    try {
      // Check rate limits
      const { allowed, info } = checkRateLimit(userId);
      if (!allowed) {
        throw this.createError(
          "RATE_LIMIT_EXCEEDED",
          `Rate limit exceeded. Try again in ${Math.ceil(info.resetTime - Date.now()) / 1000} seconds.`,
          { rateLimited: true, resetTime: info.resetTime }
        );
      }

      // Consume rate limit
      if (!consumeRateLimit(userId)) {
        throw this.createError(
          "RATE_LIMIT_EXCEEDED",
          "Rate limit exceeded during request processing.",
          { rateLimited: true }
        );
      }

      // Prepare the conversation context
      const conversationHistory = this.formatMessagesForGemini(messages);

      // Generate response
      const result = await this.model.generateContent({
        contents: conversationHistory,
        safetySettings: [...safetySettings],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 8192,
        },
      });

      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw this.createError(
          "EMPTY_RESPONSE",
          "Gemini returned an empty response. This might be due to safety filters.",
          { retryable: true }
        );
      }

      const processingTime = Date.now() - startTime;

      return {
        content: text,
        metadata: {
          model: "gemini-1.5-pro-latest",
          tokens: this.estimateTokens(text),
          temperature: options.temperature || 0.7,
          processingTime,
          safetyRatings: response.candidates?.[0]?.safetyRatings?.map(
            (rating) => ({
              category: rating.category,
              probability: rating.probability,
            })
          ),
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      if (error instanceof Error && error.message.includes("rate limit")) {
        throw this.createError("RATE_LIMIT_EXCEEDED", error.message, {
          rateLimited: true,
          retryable: true,
        });
      }

      if (error instanceof Error && error.message.includes("safety")) {
        throw this.createError(
          "SAFETY_FILTER",
          "Content was blocked by safety filters. Please rephrase your message.",
          { retryable: false }
        );
      }

      if (error instanceof Error && error.message.includes("quota")) {
        throw this.createError(
          "QUOTA_EXCEEDED",
          "API quota exceeded. Please try again later.",
          { retryable: true }
        );
      }

      // Generic error handling
      throw this.createError(
        "API_ERROR",
        error instanceof Error ? error.message : "Unknown error occurred",
        { retryable: true, processingTime }
      );
    }
  }

  async *generateStreamingResponse(
    messages: ChatMessage[],
    userId: string,
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    const startTime = Date.now();

    try {
      // Check rate limits
      const { allowed } = checkRateLimit(userId);
      if (!allowed) {
        throw this.createError(
          "RATE_LIMIT_EXCEEDED",
          "Rate limit exceeded for streaming."
        );
      }

      // Consume rate limit
      consumeRateLimit(userId);

      // Prepare conversation context
      const conversationHistory = this.formatMessagesForGemini(messages);

      // Generate streaming response
      const result = await this.model.generateContentStream({
        contents: conversationHistory,
        safetySettings: [...safetySettings],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 8192,
        },
      });

      let fullText = "";

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;

        yield {
          chunk: chunkText,
          isComplete: false,
        };
      }

      // Final chunk with metadata
      yield {
        chunk: "",
        isComplete: true,
        metadata: {
          totalTokens: this.estimateTokens(fullText),
          processingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      throw this.createError(
        "STREAMING_ERROR",
        error instanceof Error ? error.message : "Streaming failed",
        { retryable: true }
      );
    }
  }

  private formatMessagesForGemini(messages: ChatMessage[]) {
    return messages
      .filter((msg) => msg.role !== "system") // Gemini doesn't use system messages the same way
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  private createError(
    code: string,
    message: string,
    details: any = {}
  ): GeminiError {
    return {
      code,
      message,
      details,
      retryable: details.retryable || false,
      rateLimited: details.rateLimited || false,
    };
  }
}

// Singleton instance
export const geminiClient = new GeminiClient();
