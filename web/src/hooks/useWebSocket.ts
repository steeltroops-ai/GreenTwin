"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketMessage {
  type: "event" | "preference" | "heartbeat" | "sync_request" | "sync_response";
  timestamp: number;
  clientId: string;
  data: any;
  sequenceId?: number;
}

interface WebSocketStats {
  connected: boolean;
  connectionState: "disconnected" | "connecting" | "connected";
  lastMessage?: number;
  messagesSent: number;
  messagesReceived: number;
  reconnectAttempts: number;
}

interface UseWebSocketOptions {
  url?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = "ws://localhost:8080",
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    heartbeatInterval = 30000,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const connectRef = useRef<(() => void) | null>(null);

  const [stats, setStats] = useState<WebSocketStats>({
    connected: false,
    connectionState: "disconnected",
    messagesSent: 0,
    messagesReceived: 0,
    reconnectAttempts: 0,
  });

  const updateStats = useCallback((updates: Partial<WebSocketStats>) => {
    setStats((prev) => ({ ...prev, ...updates }));
  }, []);

  const connect = useCallback(() => {
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    updateStats({ connectionState: "connecting" });

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log("Green Twin: WebSocket connected to dashboard");
        updateStats({
          connected: true,
          connectionState: "connected",
          reconnectAttempts: 0,
        });

        startHeartbeat();
        processMessageQueue();
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          updateStats((prev) => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
            lastMessage: Date.now(),
          }));

          // Handle server messages
          if (message.type === "sync_response" && message.data.clientId) {
            clientIdRef.current = message.data.clientId;
          }

          onMessage?.(message);
        } catch (error) {
          console.error("Green Twin: Invalid WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(
          "Green Twin: WebSocket disconnected",
          event.code,
          event.reason
        );
        updateStats({
          connected: false,
          connectionState: "disconnected",
        });

        stopHeartbeat();
        onDisconnect?.();

        // Don't auto-reconnect if WebSocket server is not available (code 1006)
        // This prevents endless reconnection attempts
        if (event.code === 1006) {
          console.log(
            "Green Twin: WebSocket server not available, running in offline mode"
          );
          return;
        }

        // Attempt reconnection for other disconnect reasons
        setStats((prev) => {
          if (prev.reconnectAttempts < reconnectAttempts) {
            // Use setTimeout to avoid circular dependency
            setTimeout(() => scheduleReconnect(), 0);
          }
          return prev;
        });
      };

      wsRef.current.onerror = (error) => {
        console.error("Green Twin: WebSocket error:", error);
        onError?.(error);

        updateStats((prev) => ({
          ...prev,
          connected: false,
          connectionState: "disconnected",
          reconnectAttempts: prev.reconnectAttempts + 1,
        }));
      };
    } catch (error) {
      console.error(
        "Green Twin: Failed to create WebSocket connection:",
        error
      );
      setStats((prev) => {
        const newAttempts = prev.reconnectAttempts + 1;

        if (newAttempts < reconnectAttempts) {
          // Use setTimeout to avoid circular dependency
          setTimeout(() => scheduleReconnect(), 0);
        }

        return {
          ...prev,
          connectionState: "disconnected",
          reconnectAttempts: newAttempts,
        };
      });
    }
  }, [
    url,
    reconnectAttempts,
    onConnect,
    onMessage,
    onDisconnect,
    onError,
    updateStats,
  ]);

  // Store connect function in ref to avoid circular dependency
  connectRef.current = connect;

  const scheduleReconnect = useCallback(() => {
    setStats((prev) => {
      const delay = Math.min(
        reconnectDelay * Math.pow(2, prev.reconnectAttempts),
        30000
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(
          `Green Twin: Attempting WebSocket reconnection (${prev.reconnectAttempts + 1}/${reconnectAttempts})`
        );
        // Use a ref to avoid circular dependency
        if (connectRef.current) {
          connectRef.current();
        }
      }, delay);

      return prev; // Don't update state here to avoid infinite loops
    });
  }, [reconnectDelay, reconnectAttempts]);

  const startHeartbeat = useCallback(() => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({
          type: "heartbeat",
          timestamp: Date.now(),
          clientId: clientIdRef.current || "web-client",
          data: { ping: true },
        });
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    (message: Omit<WebSocketMessage, "clientId"> & { clientId?: string }) => {
      const fullMessage: WebSocketMessage = {
        ...message,
        clientId: message.clientId || clientIdRef.current || "web-client",
      };

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(fullMessage));
          updateStats((prev) => ({
            ...prev,
            messagesSent: prev.messagesSent + 1,
          }));
          return true;
        } catch (error) {
          console.error("Green Twin: Failed to send WebSocket message:", error);
          queueMessage(fullMessage);
          return false;
        }
      } else {
        queueMessage(fullMessage);
        return false;
      }
    },
    [updateStats]
  );

  const queueMessage = useCallback((message: WebSocketMessage) => {
    messageQueueRef.current.push(message);

    // Limit queue size
    if (messageQueueRef.current.length > 100) {
      messageQueueRef.current.shift();
    }
  }, []);

  const processMessageQueue = useCallback(() => {
    if (messageQueueRef.current.length === 0) return;

    console.log(
      `Green Twin: Processing ${messageQueueRef.current.length} queued messages`
    );

    const messages = [...messageQueueRef.current];
    messageQueueRef.current = [];

    messages.forEach((message) => {
      sendMessage(message);
    });
  }, [sendMessage]);

  const sendEvent = useCallback(
    (eventData: any) => {
      return sendMessage({
        type: "event",
        timestamp: Date.now(),
        data: {
          ...eventData,
          source: "web",
        },
      });
    },
    [sendMessage]
  );

  const sendPreference = useCallback(
    (preferences: any) => {
      return sendMessage({
        type: "preference",
        timestamp: Date.now(),
        data: preferences,
      });
    },
    [sendMessage]
  );

  const requestSync = useCallback(
    (since: number = 0) => {
      return sendMessage({
        type: "sync_request",
        timestamp: Date.now(),
        data: { since },
      });
    },
    [sendMessage]
  );

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    updateStats({
      connected: false,
      connectionState: "disconnected",
    });
  }, [stopHeartbeat, updateStats]);

  // Initialize connection on mount
  useEffect(() => {
    // Initialize WebSocket server first
    fetch("/api/websocket")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Green Twin: WebSocket server status:", data);
        // Connect after server is ready
        setTimeout(connect, 1000);
      })
      .catch((error) => {
        console.log(
          "Green Twin: WebSocket server not available, running in offline mode"
        );
        // Set to disconnected state but don't spam console with errors
        updateStats({
          connected: false,
          connectionState: "disconnected",
        });
      });

    return () => {
      disconnect();
    };
  }, [connect, disconnect, updateStats]);

  return {
    connected: stats.connected,
    connectionState: stats.connectionState,
    stats,
    sendMessage,
    sendEvent,
    sendPreference,
    requestSync,
    connect,
    disconnect,
  };
}
