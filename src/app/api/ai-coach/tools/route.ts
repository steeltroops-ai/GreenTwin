import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { toolRecommender } from "@/lib/gemini/tool-recommender";
import { ChatMessage } from "@/lib/gemini/types";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { messages, category, query, maxRecommendations = 3 } = body;

    let recommendations;

    if (messages && Array.isArray(messages)) {
      // Generate recommendations based on conversation context
      const validMessages: ChatMessage[] = messages.map((msg: any, index: number) => ({
        id: msg.id || `msg_${Date.now()}_${index}`,
        role: msg.role || "user",
        content: msg.content,
        timestamp: msg.timestamp || Date.now(),
        userId,
        conversationId: msg.conversationId || `conv_${Date.now()}`,
        metadata: msg.metadata || {},
      }));

      recommendations = await toolRecommender.generateRecommendations(
        validMessages,
        userId,
        maxRecommendations
      );
    } else if (category) {
      // Get tools by category
      recommendations = toolRecommender.getToolsByCategory(category);
    } else if (query) {
      // Search tools by keyword
      recommendations = toolRecommender.searchTools(query);
    } else {
      return NextResponse.json(
        { error: "Either 'messages', 'category', or 'query' is required" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      recommendations,
      summary: toolRecommender.generateRecommendationSummary(recommendations),
      metadata: {
        userId,
        timestamp: Date.now(),
        toolsRecommended: recommendations.length,
        method: messages ? "context-based" : category ? "category-based" : "search-based",
      },
    });

  } catch (error) {
    console.error("Tool Recommendation API Error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to generate tool recommendations. Please try again.",
        code: "TOOL_RECOMMENDATION_ERROR" 
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for browsing tools
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const query = searchParams.get("query");

    let recommendations;

    if (category) {
      recommendations = toolRecommender.getToolsByCategory(category as any);
    } else if (query) {
      recommendations = toolRecommender.searchTools(query);
    } else {
      // Return all tools with default scoring
      recommendations = toolRecommender.getToolsByCategory("carbon_tracking")
        .concat(toolRecommender.getToolsByCategory("energy_efficiency"))
        .concat(toolRecommender.getToolsByCategory("transportation"))
        .concat(toolRecommender.getToolsByCategory("diet"))
        .concat(toolRecommender.getToolsByCategory("shopping"));
    }

    return NextResponse.json({
      success: true,
      recommendations,
      summary: toolRecommender.generateRecommendationSummary(recommendations),
      metadata: {
        userId,
        timestamp: Date.now(),
        toolsReturned: recommendations.length,
        method: category ? "category-filter" : query ? "search" : "all-tools",
      },
    });

  } catch (error) {
    console.error("Tool Browse API Error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to retrieve tools. Please try again.",
        code: "TOOL_BROWSE_ERROR" 
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
