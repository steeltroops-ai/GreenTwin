// Green Twin background service worker (MV3)
const STORAGE_KEY = "gt_stats_v1";
const DELAY_KEY = "gt_delays_v1";

async function getStats() {
  const { [STORAGE_KEY]: data } = await chrome.storage.local.get(STORAGE_KEY);
  return (
    data || {
      totals: { views: 0, items: 0, estKgMonth: 0, misinfoFlags: 0 },
      events: [], // {type, ts, meta, kg}
      settings: { misinfoEnabled: true },
      userActivity: new Array(24).fill(0), // Activity by hour
      nudgeHistory: [], // Recent nudge interactions
    }
  );
}

// Purchase Delay Manager
class PurchaseDelayManager {
  constructor() {
    this.delayedPurchases = new Map();
    this.loadDelayedPurchases();
  }

  async loadDelayedPurchases() {
    const { [DELAY_KEY]: data } = await chrome.storage.local.get(DELAY_KEY);
    if (data) {
      this.delayedPurchases = new Map(Object.entries(data));
    }
  }

  async saveDelayedPurchases() {
    const data = Object.fromEntries(this.delayedPurchases);
    await chrome.storage.local.set({ [DELAY_KEY]: data });
  }

  generateId() {
    return (
      "delay_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  async addDelayedPurchase(productData) {
    const delayId = this.generateId();
    const delayEnd = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    const delayData = {
      ...productData,
      delayId,
      delayEnd,
      createdAt: Date.now(),
      potentialSavings: this.calculateSavings(productData),
      status: "active",
    };

    this.delayedPurchases.set(delayId, delayData);
    await this.saveDelayedPurchases();

    // Schedule reminder notification
    await this.scheduleReminder(delayId, delayEnd);

    return delayId;
  }

  calculateSavings(productData) {
    return {
      co2: Math.round((productData.estKg || 0) * 0.7 * 10) / 10, // 70% reduction from alternatives
      money: Math.round((productData.priceUSD || 0) * 0.15 * 100) / 100, // 15% savings from alternatives
    };
  }

  async scheduleReminder(delayId, delayEnd) {
    const reminderTime = delayEnd - 2 * 60 * 60 * 1000; // 2 hours before end
    const now = Date.now();

    if (reminderTime > now) {
      chrome.alarms.create(`reminder_${delayId}`, { when: reminderTime });
    }
  }

  async getActiveDelays() {
    const now = Date.now();
    const activeDelays = [];

    for (const [delayId, delayData] of this.delayedPurchases) {
      if (delayData.delayEnd > now && delayData.status === "active") {
        activeDelays.push({
          ...delayData,
          timeRemaining: delayData.delayEnd - now,
        });
      }
    }

    return activeDelays;
  }

  async completeDelay(delayId, outcome) {
    const delayData = this.delayedPurchases.get(delayId);
    if (delayData) {
      delayData.status = "completed";
      delayData.outcome = outcome; // 'purchased', 'skipped', 'alternative'
      delayData.completedAt = Date.now();

      this.delayedPurchases.set(delayId, delayData);
      await this.saveDelayedPurchases();

      // Track the outcome for learning
      await this.trackDelayOutcome(delayData);
    }
  }

  async trackDelayOutcome(delayData) {
    const stats = await getStats();
    stats.events.unshift({
      type: "delay_completed",
      ts: Date.now(),
      meta: {
        delayId: delayData.delayId,
        outcome: delayData.outcome,
        originalKg: delayData.estKg,
        savedKg:
          delayData.outcome === "skipped"
            ? delayData.estKg
            : delayData.outcome === "alternative"
              ? delayData.potentialSavings.co2
              : 0,
      },
      kg:
        delayData.outcome === "skipped"
          ? delayData.estKg
          : delayData.outcome === "alternative"
            ? delayData.potentialSavings.co2
            : 0,
    });

    await setStats(stats);
  }
}

// Initialize delay manager
const delayManager = new PurchaseDelayManager();

// Initialize WebSocket client for real-time sync
let wsClient = null;
let offlineQueue = null;

async function initializeWebSocketClient() {
  try {
    // Import and initialize offline queue
    const { OfflineEventQueue } = await import("./offline-queue.js");
    offlineQueue = new OfflineEventQueue();

    // Import WebSocket client
    const { ExtensionWebSocketClient } = await import("./websocket-client.js");
    wsClient = new ExtensionWebSocketClient();

    // Make wsClient available globally for offline queue
    globalThis.wsClient = wsClient;

    // Set up event handlers
    wsClient.addEventListener("connection_change", (data) => {
      console.log("Green Twin: WebSocket connection changed:", data.connected);

      // Trigger queue processing when connection is restored
      if (data.connected && offlineQueue) {
        setTimeout(() => offlineQueue.processQueue(), 1000);
      }
    });

    wsClient.addEventListener("remote_event", (data) => {
      console.log("Green Twin: Received remote event:", data);
      // Handle events from web dashboard
    });

    wsClient.addEventListener("preference_update", (data) => {
      console.log("Green Twin: Received preference update:", data);
      // Update local preferences
      updateLocalPreferences(data);
    });

    console.log("Green Twin: WebSocket client and offline queue initialized");
  } catch (error) {
    console.error("Green Twin: Failed to initialize WebSocket client:", error);
  }
}

async function updateLocalPreferences(preferences) {
  const stats = await getStats();
  stats.settings = { ...stats.settings, ...preferences };
  await setStats(stats);
}

// Initialize WebSocket client
initializeWebSocketClient();

async function setStats(next) {
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
}

chrome.runtime.onInstalled.addListener(() => {
  getStats().then((stats) => setStats(stats));
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const stats = await getStats();

    if (msg.type === "track_product_view") {
      const { title, priceUSD, category, estKg } = msg.payload;
      stats.totals.views += 1;
      stats.totals.items += 1;
      stats.totals.estKgMonth += estKg;
      const event = {
        type: "product",
        ts: Date.now(),
        meta: { title, priceUSD, category },
        kg: estKg,
      };
      stats.events.unshift(event);
      await setStats(stats);

      // Sync with WebSocket server (with offline queue fallback)
      const syncData = {
        type: "product_view",
        data: event,
        source: "extension",
      };

      if (offlineQueue) {
        offlineQueue.addEvent(syncData);
      } else if (wsClient && wsClient.isConnected()) {
        wsClient.sendUpdate(syncData);
      }

      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "track_travel_search") {
      const { mode, from, to, distanceKm, estKg } = msg.payload;
      stats.totals.views += 1;
      stats.totals.estKgMonth += estKg;
      stats.events.unshift({
        type: "travel",
        ts: Date.now(),
        meta: { mode, from, to, distanceKm },
        kg: estKg,
      });
      await setStats(stats);
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "misinfo_flag") {
      stats.totals.misinfoFlags += 1;
      stats.events.unshift({
        type: "misinfo",
        ts: Date.now(),
        meta: { snippet: msg.payload?.text?.slice(0, 120) || "" },
        kg: 0,
      });
      await setStats(stats);
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "get_stats") {
      sendResponse(await getStats());
      return;
    }

    if (msg.type === "set_settings") {
      stats.settings = { ...stats.settings, ...msg.payload };
      await setStats(stats);

      // Sync settings with WebSocket server
      if (wsClient && wsClient.isConnected()) {
        wsClient.sendPreferenceUpdate(msg.payload);
      }

      sendResponse({ ok: true });
      return;
    }

    // Purchase delay handlers
    if (msg.type === "create_delay") {
      const delayId = await delayManager.addDelayedPurchase(msg.payload);
      sendResponse({ ok: true, delayId });
      return;
    }

    if (msg.type === "get_active_delays") {
      const delays = await delayManager.getActiveDelays();
      sendResponse({ ok: true, delays });
      return;
    }

    if (msg.type === "complete_delay") {
      await delayManager.completeDelay(
        msg.payload.delayId,
        msg.payload.outcome
      );
      sendResponse({ ok: true });
      return;
    }

    // Activity tracking
    if (msg.type === "track_activity") {
      const hour = new Date().getHours();
      stats.userActivity[hour] = Math.min(
        (stats.userActivity[hour] || 0) + 0.1,
        1.0
      );
      await setStats(stats);
      sendResponse({ ok: true });
      return;
    }

    // Nudge interaction tracking
    if (msg.type === "track_nudge_interaction") {
      const interaction = {
        ...msg.payload,
        timestamp: Date.now(),
      };
      stats.nudgeHistory.unshift(interaction);
      // Keep only last 50 interactions
      if (stats.nudgeHistory.length > 50) {
        stats.nudgeHistory = stats.nudgeHistory.slice(0, 50);
      }
      await setStats(stats);
      sendResponse({ ok: true });
      return;
    }

    // Predictive intervention tracking
    if (msg.type === "track_predictive_intervention") {
      const intervention = {
        ...msg.payload,
        timestamp: Date.now(),
      };

      // Add to events for analytics
      const event = {
        type: "predictive_intervention",
        ts: Date.now(),
        meta: {
          triggerId: intervention.triggerId,
          action: intervention.action,
          confidence: intervention.confidence,
          context: intervention.context,
        },
        kg: 0, // Predictive interventions don't have direct carbon impact
      };
      stats.events.unshift(event);

      // Track intervention success rates
      if (!stats.interventionStats) {
        stats.interventionStats = {};
      }

      const triggerId = intervention.triggerId;
      if (!stats.interventionStats[triggerId]) {
        stats.interventionStats[triggerId] = {
          triggered: 0,
          successful: 0,
          totalConfidence: 0,
        };
      }

      stats.interventionStats[triggerId].triggered++;
      stats.interventionStats[triggerId].totalConfidence +=
        intervention.confidence;

      await setStats(stats);

      // Sync with WebSocket server (with offline queue fallback)
      const syncData = {
        type: "predictive_intervention",
        data: event,
        source: "extension",
      };

      if (offlineQueue) {
        offlineQueue.addEvent(syncData);
      } else if (wsClient && wsClient.isConnected()) {
        wsClient.sendUpdate(syncData);
      }

      sendResponse({ ok: true });
      return;
    }

    // Connection status updates
    if (msg.type === "connection_status") {
      // Update connection status in storage for popup display
      stats.connectionStatus = msg.payload;
      await setStats(stats);
      sendResponse({ ok: true });
      return;
    }

    // Sync updates from WebSocket
    if (msg.type === "sync_update") {
      // Handle updates received from WebSocket server
      console.log("Green Twin: Processing sync update:", msg.payload);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message" });
  })();
  // Keep the message channel open for async response
  return true;
});

// Handle alarm notifications for purchase delays
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith("reminder_")) {
    const delayId = alarm.name.replace("reminder_", "");
    const delays = await delayManager.getActiveDelays();
    const delay = delays.find((d) => d.delayId === delayId);

    if (delay) {
      // Create notification for delay reminder
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon-48.png",
        title: "Green Twin Reminder",
        message: `Your 24-hour cooling-off period for "${delay.title}" ends in 2 hours. Consider the alternatives!`,
        buttons: [
          { title: "View Alternatives" },
          { title: "Complete Purchase" },
        ],
      });
    }
  }
});
