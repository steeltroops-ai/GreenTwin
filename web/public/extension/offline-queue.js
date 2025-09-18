// Offline Event Queue for Chrome Extension
class OfflineEventQueue {
  constructor() {
    this.queue = [];
    this.isOnline = navigator.onLine;
    this.maxQueueSize = 1000;
    this.storageKey = 'gt_offline_queue_v1';
    this.syncInProgress = false;
    
    this.loadQueue();
    this.setupEventListeners();
  }

  async loadQueue() {
    try {
      const { [this.storageKey]: data } = await chrome.storage.local.get(this.storageKey);
      if (data && Array.isArray(data)) {
        this.queue = data;
        console.log(`Green Twin: Loaded ${this.queue.length} queued events from storage`);
      }
    } catch (error) {
      console.error('Green Twin: Failed to load offline queue:', error);
    }
  }

  async saveQueue() {
    try {
      await chrome.storage.local.set({ [this.storageKey]: this.queue });
    } catch (error) {
      console.error('Green Twin: Failed to save offline queue:', error);
    }
  }

  setupEventListeners() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Green Twin: Connection restored');
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('Green Twin: Connection lost');
      this.isOnline = false;
    });

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity();
    }, 30000); // Check every 30 seconds
  }

  async checkConnectivity() {
    try {
      // Try to fetch a small resource to test connectivity
      const response = await fetch('/api/websocket', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const wasOnline = this.isOnline;
      this.isOnline = response.ok;
      
      // If we just came back online, process the queue
      if (!wasOnline && this.isOnline) {
        console.log('Green Twin: Connectivity restored via health check');
        this.processQueue();
      }
    } catch (error) {
      this.isOnline = false;
    }
  }

  addEvent(eventData) {
    const queuedEvent = {
      ...eventData,
      timestamp: Date.now(),
      queued: true,
      id: this.generateEventId()
    };

    if (this.isOnline && !this.syncInProgress) {
      // Try to send immediately if online
      this.sendEventImmediately(queuedEvent);
    } else {
      // Queue for later if offline or sync in progress
      this.queueEvent(queuedEvent);
    }
  }

  queueEvent(eventData) {
    this.queue.push(eventData);
    
    // Limit queue size to prevent memory issues
    if (this.queue.length > this.maxQueueSize) {
      const removed = this.queue.shift();
      console.warn(`Green Twin: Queue full, removed oldest event: ${removed.type}`);
    }
    
    this.saveQueue();
    console.log(`Green Twin: Event queued (${this.queue.length} pending): ${eventData.type}`);
  }

  async sendEventImmediately(eventData) {
    try {
      // Try to send via WebSocket first
      if (window.wsClient && window.wsClient.isConnected()) {
        const success = window.wsClient.sendUpdate(eventData);
        if (success) {
          console.log(`Green Twin: Event sent immediately via WebSocket: ${eventData.type}`);
          return true;
        }
      }

      // Fallback to HTTP API
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        console.log(`Green Twin: Event sent immediately via HTTP: ${eventData.type}`);
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn(`Green Twin: Failed to send event immediately, queuing: ${error.message}`);
      this.queueEvent(eventData);
      return false;
    }
  }

  async processQueue() {
    if (this.syncInProgress || this.queue.length === 0 || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    console.log(`Green Twin: Processing ${this.queue.length} queued events`);

    const batchSize = 10; // Process in batches to avoid overwhelming the server
    let processedCount = 0;
    let failedCount = 0;

    while (this.queue.length > 0 && this.isOnline) {
      const batch = this.queue.splice(0, batchSize);
      
      for (const event of batch) {
        try {
          const success = await this.sendEvent(event);
          if (success) {
            processedCount++;
          } else {
            // Re-queue failed events at the beginning
            this.queue.unshift(event);
            failedCount++;
          }
        } catch (error) {
          console.error(`Green Twin: Failed to process queued event:`, error);
          this.queue.unshift(event);
          failedCount++;
        }

        // Small delay between events to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Break if we're offline or have too many failures
      if (!this.isOnline || failedCount > 5) {
        break;
      }
    }

    await this.saveQueue();
    this.syncInProgress = false;

    console.log(`Green Twin: Queue processing complete. Processed: ${processedCount}, Failed: ${failedCount}, Remaining: ${this.queue.length}`);
  }

  async sendEvent(eventData) {
    try {
      // Try WebSocket first
      if (window.wsClient && window.wsClient.isConnected()) {
        const success = window.wsClient.sendUpdate(eventData);
        if (success) {
          return true;
        }
      }

      // Fallback to HTTP API
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData),
        signal: AbortSignal.timeout(10000)
      });

      return response.ok;
    } catch (error) {
      console.error('Green Twin: Failed to send queued event:', error);
      return false;
    }
  }

  generateEventId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getQueueStats() {
    return {
      queueLength: this.queue.length,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      oldestEvent: this.queue.length > 0 ? this.queue[0].timestamp : null,
      newestEvent: this.queue.length > 0 ? this.queue[this.queue.length - 1].timestamp : null
    };
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
    console.log('Green Twin: Offline queue cleared');
  }

  // Force sync attempt (useful for testing or manual retry)
  forcSync() {
    if (!this.syncInProgress) {
      console.log('Green Twin: Force syncing offline queue');
      this.processQueue();
    }
  }

  // Get events by type for debugging
  getEventsByType(type) {
    return this.queue.filter(event => event.type === type);
  }

  // Remove events older than specified time
  cleanupOldEvents(maxAgeMs = 7 * 24 * 60 * 60 * 1000) { // Default: 7 days
    const cutoff = Date.now() - maxAgeMs;
    const originalLength = this.queue.length;
    
    this.queue = this.queue.filter(event => event.timestamp > cutoff);
    
    const removedCount = originalLength - this.queue.length;
    if (removedCount > 0) {
      console.log(`Green Twin: Cleaned up ${removedCount} old events from queue`);
      this.saveQueue();
    }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OfflineEventQueue;
} else {
  window.OfflineEventQueue = OfflineEventQueue;
}
