// Context-Aware Nudge Timing Optimizer
class NudgeTimingOptimizer {
  constructor() {
    this.userActivity = new Array(24).fill(0);
    this.nudgeHistory = [];
    this.loadActivityPattern();
  }

  async loadActivityPattern() {
    const stats = await this.getStats();
    this.userActivity = stats.userActivity || new Array(24).fill(0);
    this.nudgeHistory = stats.nudgeHistory || [];
  }

  async saveActivityPattern() {
    const stats = await this.getStats();
    stats.userActivity = this.userActivity;
    stats.nudgeHistory = this.nudgeHistory;
    await this.setStats(stats);
  }

  async getStats() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'get_stats' }, resolve);
    });
  }

  async setStats(stats) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'set_stats', payload: stats }, resolve);
    });
  }

  shouldShowNudge(context) {
    const currentHour = new Date().getHours();
    const activityLevel = this.userActivity[currentHour] || 0;
    const recentNudges = this.getRecentNudgeCount();
    const timeSinceLastNudge = this.getTimeSinceLastNudge();
    
    // Don't show nudges during high activity periods
    if (activityLevel > 0.8) {
      return { show: false, reason: 'high_activity' };
    }
    
    // Limit nudges to prevent fatigue (max 3 per hour)
    if (recentNudges >= 3) {
      return { show: false, reason: 'nudge_fatigue' };
    }
    
    // Minimum time between nudges (15 minutes)
    if (timeSinceLastNudge < 15 * 60 * 1000) {
      return { show: false, reason: 'too_recent' };
    }
    
    // Calculate nudge probability based on context
    const probability = this.calculateNudgeProbability(context, currentHour);
    
    return {
      show: probability > 0.3,
      probability,
      reason: probability > 0.3 ? 'optimal_timing' : 'low_probability'
    };
  }

  calculateNudgeProbability(context, currentHour) {
    let baseProbability = 0.5;
    
    // Time-based adjustments
    const timeMultiplier = this.getTimeMultiplier(currentHour);
    baseProbability *= timeMultiplier;
    
    // Activity-based adjustments
    const activityLevel = this.userActivity[currentHour] || 0;
    const activityMultiplier = Math.max(0.2, 1 - activityLevel);
    baseProbability *= activityMultiplier;
    
    // Context-based adjustments
    if (context.type === 'high_impact_purchase') {
      baseProbability *= 1.5; // Higher priority for high-impact items
    }
    
    if (context.userEngagement === 'high') {
      baseProbability *= 1.2; // User is actively browsing
    }
    
    // Historical success rate adjustments
    const historicalSuccess = this.getHistoricalSuccessRate(currentHour);
    baseProbability *= (0.5 + historicalSuccess);
    
    return Math.min(1.0, baseProbability);
  }

  getTimeMultiplier(hour) {
    // Peak engagement hours: 10-12, 14-16, 19-21
    const peakHours = [10, 11, 14, 15, 16, 19, 20, 21];
    const lowHours = [0, 1, 2, 3, 4, 5, 6, 22, 23]; // Late night/early morning
    
    if (peakHours.includes(hour)) {
      return 1.3;
    } else if (lowHours.includes(hour)) {
      return 0.4;
    }
    return 1.0;
  }

  getRecentNudgeCount() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.nudgeHistory.filter(nudge => nudge.timestamp > oneHourAgo).length;
  }

  getTimeSinceLastNudge() {
    if (this.nudgeHistory.length === 0) return Infinity;
    const lastNudge = this.nudgeHistory[0];
    return Date.now() - lastNudge.timestamp;
  }

  getHistoricalSuccessRate(hour) {
    const hourlyNudges = this.nudgeHistory.filter(nudge => {
      const nudgeHour = new Date(nudge.timestamp).getHours();
      return nudgeHour === hour;
    });
    
    if (hourlyNudges.length === 0) return 0.5; // Default success rate
    
    const successful = hourlyNudges.filter(nudge => 
      nudge.action === 'accepted' || nudge.action === 'delayed'
    ).length;
    
    return successful / hourlyNudges.length;
  }

  trackUserActivity() {
    const hour = new Date().getHours();
    this.userActivity[hour] = Math.min((this.userActivity[hour] || 0) + 0.1, 1.0);
    this.saveActivityPattern();
  }

  trackNudgeInteraction(nudgeType, action, context) {
    const interaction = {
      nudgeType,
      action,
      context,
      timestamp: Date.now(),
      hour: new Date().getHours()
    };
    
    this.nudgeHistory.unshift(interaction);
    
    // Keep only last 100 interactions
    if (this.nudgeHistory.length > 100) {
      this.nudgeHistory = this.nudgeHistory.slice(0, 100);
    }
    
    this.saveActivityPattern();
  }

  getOptimalNudgeTime(context) {
    const currentHour = new Date().getHours();
    const scores = [];
    
    // Calculate scores for next 6 hours
    for (let i = 0; i < 6; i++) {
      const hour = (currentHour + i) % 24;
      const probability = this.calculateNudgeProbability(context, hour);
      scores.push({ hour, probability, delay: i });
    }
    
    // Find the hour with highest probability
    const optimal = scores.reduce((best, current) => 
      current.probability > best.probability ? current : best
    );
    
    return {
      optimalHour: optimal.hour,
      delayHours: optimal.delay,
      probability: optimal.probability,
      shouldDelay: optimal.delay > 0 && optimal.probability > 0.7
    };
  }

  createSnoozeOptions() {
    return [
      { label: '15 minutes', value: 15 * 60 * 1000 },
      { label: '1 hour', value: 60 * 60 * 1000 },
      { label: '4 hours', value: 4 * 60 * 60 * 1000 },
      { label: 'Tomorrow', value: this.getMillisecondsUntilTomorrow() }
    ];
  }

  getMillisecondsUntilTomorrow() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow
    return tomorrow.getTime() - now.getTime();
  }

  scheduleDelayedNudge(context, delayMs) {
    const scheduleTime = Date.now() + delayMs;
    
    // Store the scheduled nudge
    chrome.storage.local.get('scheduled_nudges', (result) => {
      const scheduled = result.scheduled_nudges || [];
      scheduled.push({
        context,
        scheduleTime,
        id: 'nudge_' + Date.now()
      });
      
      chrome.storage.local.set({ scheduled_nudges: scheduled });
    });
    
    // Set alarm for the nudge
    chrome.alarms.create(`delayed_nudge_${Date.now()}`, { when: scheduleTime });
  }

  // Method to be called when user dismisses a nudge with snooze
  snoozeNudge(context, snoozeMs) {
    this.trackNudgeInteraction(context.type, 'snoozed', context);
    this.scheduleDelayedNudge(context, snoozeMs);
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NudgeTimingOptimizer;
} else {
  window.NudgeTimingOptimizer = NudgeTimingOptimizer;
}
