import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { factChecker } from "@/lib/gemini/fact-checker";

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
    const { claim, claims, context } = body;

    // Validate input
    if (!claim && (!claims || !Array.isArray(claims))) {
      return NextResponse.json(
        { error: "Either 'claim' or 'claims' array is required" },
        { status: 400 }
      );
    }

    let results;

    if (claim) {
      // Single claim fact-check
      results = await factChecker.factCheckClaim(claim, userId, context);
    } else {
      // Batch fact-check
      results = await factChecker.batchFactCheck(claims, userId, context);
    }

    return NextResponse.json({
      success: true,
      results,
      summary: Array.isArray(results) 
        ? factChecker.generateFactCheckSummary(results)
        : `Fact-check completed with ${results.confidence}% confidence`,
      metadata: {
        userId,
        timestamp: Date.now(),
        claimsChecked: Array.isArray(results) ? results.length : 1,
      },
    });

  } catch (error) {
    console.error("Fact-check API Error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to fact-check claim(s). Please try again.",
        code: "FACT_CHECK_ERROR" 
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
