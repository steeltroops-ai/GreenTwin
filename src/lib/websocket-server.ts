import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";

interface ClientConnection {
  ws: WebSocket;
  id: string;
  lastSeen: number;
  metadata: {
    userAgent?: string;
    origin?: string;
    type: "extension" | "web" | "unknown";
  };
}

interface WebSocketMessage {
  type: "event" | "preference" | "heartbeat" | "sync_request" | "sync_response";
  timestamp: number;
  clientId: string;
  data: any;
  sequenceId?: number;
}

export class GreenTwinWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, ClientConnection>();
  private messageQueue = new Map<string, WebSocketMessage[]>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private port: number = 8080) {
    this.setupServer();
  }

  private setupServer() {
    try {
      // In Next.js environment, we'll simulate the WebSocket server
      // The actual WebSocket connections will be handled differently
      console.log(`Green Twin WebSocket server initialized (simulated mode)`);

      // Start heartbeat and cleanup intervals for simulated clients
      this.startHeartbeat();
      this.startCleanup();
    } catch (error) {
      console.error("Failed to start WebSocket server:", error);
    }
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const clientId = this.generateClientId();
    const userAgent = req.headers["user-agent"] || "";
    const origin = req.headers.origin || "";

    // Determine client type
    const clientType = this.determineClientType(userAgent, origin);

    const client: ClientConnection = {
      ws,
      id: clientId,
      lastSeen: Date.now(),
      metadata: {
        userAgent,
        origin,
        type: clientType,
      },
    };

    this.clients.set(clientId, client);
    console.log(`Client connected: ${clientId} (${clientType})`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: "sync_response",
      timestamp: Date.now(),
      clientId: "server",
      data: {
        message: "Connected to Green Twin sync server",
        clientId,
        serverTime: Date.now(),
      },
    });

    // Send any queued messages
    this.sendQueuedMessages(clientId);

    ws.on("message", (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(clientId, message);
      } catch (error) {
        console.error("Invalid message format:", error);
      }
    });

    ws.on("close", () => {
      this.handleDisconnection(clientId);
    });

    ws.on("error", (error) => {
      console.error(`Client ${clientId} error:`, error);
      this.handleDisconnection(clientId);
    });

    ws.on("pong", () => {
      // Update last seen time on pong response
      const client = this.clients.get(clientId);
      if (client) {
        client.lastSeen = Date.now();
      }
    });
  }

  private determineClientType(
    userAgent: string,
    origin: string
  ): "extension" | "web" | "unknown" {
    if (userAgent.includes("Chrome") && !origin) {
      return "extension";
    } else if (
      origin &&
      (origin.includes("localhost") || origin.includes("vercel.app"))
    ) {
      return "web";
    }
    return "unknown";
  }

  private handleMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastSeen = Date.now();

    switch (message.type) {
      case "event":
        this.handleEventMessage(clientId, message);
        break;
      case "preference":
        this.handlePreferenceMessage(clientId, message);
        break;
      case "heartbeat":
        this.handleHeartbeat(clientId, message);
        break;
      case "sync_request":
        this.handleSyncRequest(clientId, message);
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private handleEventMessage(clientId: string, message: WebSocketMessage) {
    // Broadcast event to all other clients
    this.broadcastToOthers(clientId, {
      type: "event",
      timestamp: Date.now(),
      clientId,
      data: message.data,
    });

    // Store event for offline clients
    this.storeForOfflineClients(message);
  }

  private handlePreferenceMessage(clientId: string, message: WebSocketMessage) {
    // Broadcast preference changes to all other clients
    this.broadcastToOthers(clientId, {
      type: "preference",
      timestamp: Date.now(),
      clientId,
      data: message.data,
    });
  }

  private handleHeartbeat(clientId: string, message: WebSocketMessage) {
    // Respond to heartbeat
    this.sendToClient(clientId, {
      type: "heartbeat",
      timestamp: Date.now(),
      clientId: "server",
      data: { pong: true, serverTime: Date.now() },
    });
  }

  private handleSyncRequest(clientId: string, message: WebSocketMessage) {
    // Send recent events to requesting client
    const recentEvents = this.getRecentEvents(message.data?.since || 0);

    this.sendToClient(clientId, {
      type: "sync_response",
      timestamp: Date.now(),
      clientId: "server",
      data: {
        events: recentEvents,
        serverTime: Date.now(),
      },
    });
  }

  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`Client disconnected: ${clientId} (${client.metadata.type})`);
      this.clients.delete(clientId);
    }
  }

  private sendToClient(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Failed to send message to ${clientId}:`, error);
        this.handleDisconnection(clientId);
        return false;
      }
    } else {
      // Queue message for later delivery
      this.queueMessage(clientId, message);
      return false;
    }
  }

  private broadcastToOthers(
    excludeClientId: string,
    message: WebSocketMessage
  ) {
    let sentCount = 0;

    for (const [clientId, client] of this.clients) {
      if (
        clientId !== excludeClientId &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        }
      }
    }

    return sentCount;
  }

  public broadcastUpdate(data: any) {
    const message: WebSocketMessage = {
      type: "event",
      timestamp: Date.now(),
      clientId: "server",
      data,
    };

    return this.broadcastToOthers("", message);
  }

  private queueMessage(clientId: string, message: WebSocketMessage) {
    if (!this.messageQueue.has(clientId)) {
      this.messageQueue.set(clientId, []);
    }

    const queue = this.messageQueue.get(clientId)!;
    queue.push(message);

    // Limit queue size to prevent memory issues
    if (queue.length > 100) {
      queue.shift(); // Remove oldest message
    }
  }

  private sendQueuedMessages(clientId: string) {
    const queue = this.messageQueue.get(clientId);
    if (queue && queue.length > 0) {
      console.log(`Sending ${queue.length} queued messages to ${clientId}`);

      for (const message of queue) {
        this.sendToClient(clientId, message);
      }

      this.messageQueue.delete(clientId);
    }
  }

  private storeForOfflineClients(message: WebSocketMessage) {
    // Store recent events for clients that might reconnect
    // This is a simple in-memory store - in production, use Redis or database
    const key = `recent_events`;
    // Implementation would store in persistent storage
  }

  private getRecentEvents(since: number): any[] {
    // Return recent events since timestamp
    // Implementation would query persistent storage
    return [];
  }

  private generateClientId(): string {
    return (
      "client_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      for (const [clientId, client] of this.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.ping();
          } catch (error) {
            console.error(`Failed to ping client ${clientId}:`, error);
            this.handleDisconnection(clientId);
          }
        }
      }
    }, 30000); // Ping every 30 seconds
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 1 minute timeout

      for (const [clientId, client] of this.clients) {
        if (now - client.lastSeen > timeout) {
          console.log(`Cleaning up stale client: ${clientId}`);
          this.handleDisconnection(clientId);
        }
      }

      // Clean up old message queues
      for (const [clientId, queue] of this.messageQueue) {
        if (!this.clients.has(clientId) && queue.length === 0) {
          this.messageQueue.delete(clientId);
        }
      }
    }, 60000); // Cleanup every minute
  }

  public getStats() {
    return {
      connectedClients: this.clients.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce(
        (sum, queue) => sum + queue.length,
        0
      ),
      clientTypes: Array.from(this.clients.values()).reduce(
        (acc, client) => {
          acc[client.metadata.type] = (acc[client.metadata.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.wss) {
      this.wss.close();
    }

    console.log("Green Twin WebSocket server closed");
  }
}
