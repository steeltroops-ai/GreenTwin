'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface WebSocketMessage {
  type: 'event' | 'preference' | 'heartbeat' | 'sync_request' | 'sync_response';
  timestamp: number;
  clientId: string;
  data: any;
}

interface ExtensionEvent {
  type: string;
  ts: number;
  meta: any;
  kg: number;
}

interface WebSocketContextType {
  connected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected';
  stats: any;
  recentEvents: ExtensionEvent[];
  sendEvent: (eventData: any) => boolean;
  sendPreference: (preferences: any) => boolean;
  requestSync: (since?: number) => boolean;
  connect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [recentEvents, setRecentEvents] = useState<ExtensionEvent[]>([]);
  const [preferences, setPreferences] = useState<any>({});

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'event':
        handleEventMessage(message);
        break;
      case 'preference':
        handlePreferenceMessage(message);
        break;
      case 'sync_response':
        handleSyncResponse(message);
        break;
    }
  };

  const handleEventMessage = (message: WebSocketMessage) => {
    const { data } = message;
    
    if (data.source === 'extension') {
      // Handle events from extension
      if (data.type === 'product_view' || data.type === 'predictive_intervention') {
        setRecentEvents(prev => {
          const newEvents = [data.data, ...prev];
          return newEvents.slice(0, 50); // Keep last 50 events
        });
      }
      
      console.log('Green Twin: Received extension event:', data);
    }
  };

  const handlePreferenceMessage = (message: WebSocketMessage) => {
    console.log('Green Twin: Received preference update:', message.data);
    setPreferences(prev => ({ ...prev, ...message.data }));
  };

  const handleSyncResponse = (message: WebSocketMessage) => {
    if (message.data.events) {
      console.log('Green Twin: Syncing events from server:', message.data.events.length);
      setRecentEvents(prev => {
        const combined = [...message.data.events, ...prev];
        return combined.slice(0, 50);
      });
    }
  };

  const handleConnect = () => {
    console.log('Green Twin: Dashboard connected to WebSocket');
    // Request sync of recent data
    requestSync(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
  };

  const handleDisconnect = () => {
    console.log('Green Twin: Dashboard disconnected from WebSocket');
  };

  const handleError = (error: Event) => {
    console.error('Green Twin: WebSocket error in dashboard:', error);
  };

  const {
    connected,
    connectionState,
    stats,
    sendEvent,
    sendPreference,
    requestSync,
    connect,
    disconnect
  } = useWebSocket({
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onError: handleError
  });

  // Sync preferences when they change locally
  useEffect(() => {
    if (connected && Object.keys(preferences).length > 0) {
      sendPreference(preferences);
    }
  }, [preferences, connected, sendPreference]);

  const contextValue: WebSocketContextType = {
    connected,
    connectionState,
    stats,
    recentEvents,
    sendEvent,
    sendPreference,
    requestSync,
    connect,
    disconnect
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

// Connection status indicator component
export function ConnectionStatus() {
  const { connected, connectionState } = useWebSocketContext();

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected': return 'Extension Synced';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Extension Offline';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-muted-foreground">{getStatusText()}</span>
    </div>
  );
}

// Real-time events feed component
export function RealtimeEventsFeed() {
  const { recentEvents } = useWebSocketContext();

  const formatEvent = (event: ExtensionEvent) => {
    switch (event.type) {
      case 'product':
        return `Viewed: ${event.meta.title} (${event.kg}kg CO₂)`;
      case 'predictive_intervention':
        return `AI Intervention: ${event.meta.action} (${Math.round(event.meta.confidence * 100)}% confidence)`;
      case 'delay_completed':
        return `Purchase Delay: ${event.meta.outcome} (saved ${event.kg}kg CO₂)`;
      default:
        return `${event.type}: ${event.kg}kg CO₂`;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (recentEvents.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No recent activity</p>
        <p className="text-sm">Extension events will appear here in real-time</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">Recent Extension Activity</h3>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {recentEvents.map((event, index) => (
          <div key={`${event.ts}-${index}`} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
            <span>{formatEvent(event)}</span>
            <span className="text-muted-foreground text-xs">{formatTime(event.ts)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
