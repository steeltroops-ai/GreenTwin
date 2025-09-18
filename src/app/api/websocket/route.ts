import { NextRequest, NextResponse } from "next/server";
import { GreenTwinWebSocketServer } from "../../../lib/websocket-server";

// Global WebSocket server instance
let wsServer: GreenTwinWebSocketServer | null = null;

export async function GET(request: NextRequest) {
  try {
    // Initialize WebSocket server if not already running
    if (!wsServer) {
      const port = process.env.WEBSOCKET_PORT
        ? parseInt(process.env.WEBSOCKET_PORT)
        : 8080;
      wsServer = new GreenTwinWebSocketServer(port);
      console.log(`WebSocket server initialized on port ${port}`);
    }

    // Return server status
    const stats = wsServer.getStats();

    return NextResponse.json({
      status: "running",
      stats,
      message: "WebSocket server is active",
    });
  } catch (error) {
    console.error("Failed to initialize WebSocket server:", error);

    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to start WebSocket server",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!wsServer) {
      return NextResponse.json(
        {
          error: "WebSocket server not initialized",
        },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (body.action) {
      case "broadcast":
        const sentCount = wsServer.broadcastUpdate(body.data);
        return NextResponse.json({
          success: true,
          message: `Broadcast sent to ${sentCount} clients`,
          sentCount,
        });

      case "stats":
        const stats = wsServer.getStats();
        return NextResponse.json({
          success: true,
          stats,
        });

      default:
        return NextResponse.json(
          {
            error: "Unknown action",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("WebSocket API error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Cleanup on process exit
process.on("SIGINT", () => {
  if (wsServer) {
    wsServer.close();
  }
});

process.on("SIGTERM", () => {
  if (wsServer) {
    wsServer.close();
  }
});
