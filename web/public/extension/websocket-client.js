// WebSocket Client for Chrome Extension
class ExtensionWebSocketClient {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.heartbeatInterval = null;
    this.connectionState = 'disconnected'; // disconnected, connecting, connected
    this.messageQueue = [];
    this.eventHandlers = new Map();
    
    // Try to connect immediately
    this.connect();
    
    // Set up periodic connection attempts
    setInterval(() => {
      if (this.connectionState === 'disconnected') {
        this.connect();
      }
    }, 10000); // Try to reconnect every 10 seconds if disconnected
  }

  connect() {
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      return;
    }

    this.connectionState = 'connecting';
    
    try {
      // Try multiple possible WebSocket URLs
      const urls = [
        'ws://localhost:8080',
        'ws://127.0.0.1:8080',
        'wss://greentwin.vercel.app/ws' // Fallback to production if available
      ];
      
      const url = urls[Math.min(this.reconnectAttempts, urls.length - 1)];
      console.log(`Green Twin: Attempting WebSocket connection to ${url}`);
      
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('Green Twin: WebSocket connected');
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.startHeartbeat();
        this.syncPendingData();
        this.processMessageQueue();
        this.notifyConnectionChange(true);
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch (error) {
          console.error('Green Twin: Invalid WebSocket message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('Green Twin: WebSocket disconnected', event.code, event.reason);
        this.handleDisconnection();
      };
      
      this.ws.onerror = (error) => {
        console.error('Green Twin: WebSocket error:', error);
        this.handleConnectionError();
      };
      
    } catch (error) {
      console.error('Green Twin: Failed to create WebSocket connection:', error);
      this.handleConnectionError();
    }
  }

  handleServerMessage(message) {
    switch (message.type) {
      case 'sync_response':
        this.handleSyncResponse(message);
        break;
      case 'event':
        this.handleEventMessage(message);
        break;
      case 'preference':
        this.handlePreferenceMessage(message);
        break;
      case 'heartbeat':
        // Server responded to our heartbeat
        break;
      default:
        console.warn('Green Twin: Unknown message type:', message.type);
    }
  }

  handleSyncResponse(message) {
    if (message.data.clientId) {
      this.clientId = message.data.clientId;
    }
    
    if (message.data.events) {
      // Process synced events
      message.data.events.forEach(event => {
        this.notifyEventHandlers('sync_event', event);
      });
    }
    
    console.log('Green Twin: Sync completed');
  }

  handleEventMessage(message) {
    // Forward event to extension components
    this.notifyEventHandlers('remote_event', message.data);
    
    // Update local storage if needed
    if (message.data.type === 'stats_update') {
      this.updateLocalStats(message.data);
    }
  }

  handlePreferenceMessage(message) {
    // Update local preferences
    this.notifyEventHandlers('preference_update', message.data);
  }

  sendUpdate(eventData) {
    const message = {
      type: 'event',
      timestamp: Date.now(),
      clientId: this.clientId || 'unknown',
      data: eventData
    };

    if (this.isConnected()) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Green Twin: Failed to send message:', error);
        this.queueMessage(message);
        return false;
      }
    } else {
      this.queueMessage(message);
      return false;
    }
  }

  sendPreferenceUpdate(preferences) {
    const message = {
      type: 'preference',
      timestamp: Date.now(),
      clientId: this.clientId || 'unknown',
      data: preferences
    };

    if (this.isConnected()) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Green Twin: Failed to send preference update:', error);
        return false;
      }
    }
    return false;
  }

  requestSync(since = 0) {
    const message = {
      type: 'sync_request',
      timestamp: Date.now(),
      clientId: this.clientId || 'unknown',
      data: { since }
    };

    if (this.isConnected()) {
      this.ws.send(JSON.stringify(message));
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState() {
    return this.connectionState;
  }

  queueMessage(message) {
    this.messageQueue.push(message);
    
    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift(); // Remove oldest message
    }
    
    console.log(`Green Twin: Message queued (${this.messageQueue.length} pending)`);
  }

  processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    console.log(`Green Twin: Processing ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(message => {
      if (this.isConnected()) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Green Twin: Failed to send queued message:', error);
          this.queueMessage(message); // Re-queue if failed
        }
      } else {
        this.queueMessage(message); // Re-queue if disconnected
      }
    });
  }

  handleDisconnection() {
    this.connectionState = 'disconnected';
    this.stopHeartbeat();
    this.notifyConnectionChange(false);
    
    // Schedule reconnection
    setTimeout(() => {
      if (this.connectionState === 'disconnected') {
        this.reconnect();
      }
    }, this.reconnectDelay);
  }

  handleConnectionError() {
    this.connectionState = 'disconnected';
    this.stopHeartbeat();
    this.notifyConnectionChange(false);
    
    // Exponential backoff for reconnection
    this.reconnectAttempts++;
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      this.maxReconnectDelay
    );
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log(`Green Twin: Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => {
        if (this.connectionState === 'disconnected') {
          this.connect();
        }
      }, this.reconnectDelay);
    } else {
      console.log('Green Twin: Max reconnection attempts reached');
    }
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.connect();
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        const heartbeat = {
          type: 'heartbeat',
          timestamp: Date.now(),
          clientId: this.clientId || 'unknown',
          data: { ping: true }
        };
        
        try {
          this.ws.send(JSON.stringify(heartbeat));
        } catch (error) {
          console.error('Green Twin: Failed to send heartbeat:', error);
        }
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  syncPendingData() {
    // Get recent data from extension storage and sync with server
    chrome.runtime.sendMessage({ type: 'get_stats' }, (stats) => {
      if (stats && stats.events && stats.events.length > 0) {
        // Send recent events to server
        const recentEvents = stats.events.slice(0, 10); // Last 10 events
        recentEvents.forEach(event => {
          this.sendUpdate({
            type: 'extension_event',
            eventType: event.type,
            data: event,
            source: 'extension'
          });
        });
      }
    });
  }

  updateLocalStats(data) {
    // Update extension storage with synced data
    chrome.runtime.sendMessage({
      type: 'sync_update',
      payload: data
    });
  }

  // Event handler management
  addEventListener(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType).push(handler);
  }

  removeEventListener(eventType, handler) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  notifyEventHandlers(eventType, data) {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Green Twin: Event handler error:', error);
        }
      });
    }
  }

  notifyConnectionChange(connected) {
    this.notifyEventHandlers('connection_change', { connected });
    
    // Update extension badge or popup to show connection status
    chrome.runtime.sendMessage({
      type: 'connection_status',
      payload: { connected, state: this.connectionState }
    });
  }

  // Cleanup method
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
    }
    this.connectionState = 'disconnected';
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionWebSocketClient;
} else {
  window.ExtensionWebSocketClient = ExtensionWebSocketClient;
}
