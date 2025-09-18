import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { performanceMonitor } from "@/lib/monitoring/performance-monitor";
import { errorHandler } from "@/lib/monitoring/error-handler";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user (in production, add admin role check)
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // TODO: Add admin role verification
    // const user = await clerkClient.users.getUser(userId);
    // if (!user.publicMetadata.isAdmin) {
    //   return NextResponse.json(
    //     { error: "Admin access required" },
    //     { status: 403 }
    //   );
    // }

    const { searchParams } = new URL(request.url);
    const timeRange = parseInt(searchParams.get("timeRange") || "86400000"); // Default 24 hours

    // Get comprehensive monitoring data
    const dashboardData = performanceMonitor.getDashboardData();
    const errorStats = errorHandler.getErrorStats(timeRange);
    const recentErrors = errorHandler.getRecentErrors(20);
    const errorTrends = errorHandler.getErrorTrends(timeRange);

    return NextResponse.json({
      success: true,
      data: {
        performance: dashboardData,
        errors: {
          stats: errorStats,
          recent: recentErrors,
          trends: errorTrends,
        },
        summary: {
          systemHealth: dashboardData.systemHealth,
          totalRequests: dashboardData.apiStats.totalRequests,
          errorRate: errorStats.errorRate,
          averageResponseTime: dashboardData.apiStats.averageResponseTime,
          totalConversations: dashboardData.conversationStats.totalConversations,
          unresolvedErrors: errorStats.unresolvedErrors,
        },
      },
      metadata: {
        userId,
        timestamp: Date.now(),
        timeRange,
      },
    });

  } catch (error) {
    console.error("Monitoring Dashboard API Error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to retrieve monitoring data. Please try again.",
        code: "MONITORING_ERROR" 
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
