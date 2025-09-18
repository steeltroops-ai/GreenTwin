import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { aiCoachService } from "@/lib/gemini/coach-service";

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
    const { productUrl, productDescription } = body;

    // Validate input
    if (!productUrl && !productDescription) {
      return NextResponse.json(
        { error: "Either productUrl or productDescription is required" },
        { status: 400 }
      );
    }

    // Analyze product footprint
    const analysis = await aiCoachService.analyzeProductFootprint(
      productUrl || "",
      productDescription || "",
      userId
    );

    return NextResponse.json({
      success: true,
      analysis,
      metadata: {
        userId,
        timestamp: Date.now(),
        productUrl,
        productDescription,
      },
    });

  } catch (error) {
    console.error("Product Analysis API Error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to analyze product. Please try again.",
        code: "ANALYSIS_ERROR" 
      },
      { status: 500 }
    );
  }
}

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
