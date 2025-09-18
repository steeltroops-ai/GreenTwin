// User Behavior Profiling for Smart Nudge Personalization
class BehaviorProfiler {
  constructor() {
    this.profile = {
      nudge_interactions: [],
      response_patterns: {},
      preferences: {
        nudge_types: {},
        timing_preferences: {},
        effort_tolerance: 'medium',
        categories: []
      },
      effectiveness_scores: {},
      learning_data: {
        successful_nudges: [],
        ignored_nudges: [],
        context_factors: []
      }
    };
    
    this.storageKey = 'gt_behavior_profile_v1';
    this.maxInteractions = 500; // Limit stored interactions
    
    this.loadProfile();
  }

  async loadProfile() {
    try {
      const { [this.storageKey]: data } = await chrome.storage.local.get(this.storageKey);
      if (data) {
        this.profile = { ...this.profile, ...data };
        console.log('Green Twin: Behavior profile loaded');
      }
    } catch (error) {
      console.error('Green Twin: Failed to load behavior profile:', error);
    }
  }

  async saveProfile() {
    try {
      await chrome.storage.local.set({ [this.storageKey]: this.profile });
    } catch (error) {
      console.error('Green Twin: Failed to save behavior profile:', error);
    }
  }

  recordNudgeInteraction(nudgeData) {
    const interaction = {
      id: this.generateInteractionId(),
      timestamp: Date.now(),
      nudge_type: nudgeData.type,
      category: nudgeData.category,
      context: {
        time_of_day: new Date().getHours(),
        day_of_week: new Date().getDay(),
        page_url: nudgeData.context?.url || '',
        product_category: nudgeData.context?.category || '',
        emission_level: nudgeData.context?.kg || 0,
        grid_intensity: nudgeData.context?.grid_intensity || 0
      },
      response: null, // Will be updated when user responds
      outcome: null   // Will be updated with final result
    };

    this.profile.nudge_interactions.push(interaction);
    
    // Limit stored interactions
    if (this.profile.nudge_interactions.length > this.maxInteractions) {
      this.profile.nudge_interactions.shift();
    }

    this.saveProfile();
    return interaction.id;
  }

  recordNudgeResponse(interactionId, response) {
    const interaction = this.profile.nudge_interactions.find(i => i.id === interactionId);
    if (!interaction) return;

    interaction.response = {
      type: response.type, // 'accepted', 'dismissed', 'snoozed', 'ignored'
      timestamp: Date.now(),
      delay_time: response.delay_time || 0,
      alternative_chosen: response.alternative || null,
      snooze_duration: response.snooze_duration || 0
    };

    // Update response patterns
    this.updateResponsePatterns(interaction);
    
    // Update learning data
    if (response.type === 'accepted') {
      this.profile.learning_data.successful_nudges.push({
        nudge_type: interaction.nudge_type,
        context: interaction.context,
        timestamp: Date.now()
      });
    } else if (response.type === 'ignored' || response.type === 'dismissed') {
      this.profile.learning_data.ignored_nudges.push({
        nudge_type: interaction.nudge_type,
        context: interaction.context,
        timestamp: Date.now()
      });
    }

    this.saveProfile();
  }

  recordNudgeOutcome(interactionId, outcome) {
    const interaction = this.profile.nudge_interactions.find(i => i.id === interactionId);
    if (!interaction) return;

    interaction.outcome = {
      type: outcome.type, // 'purchase_delayed', 'alternative_chosen', 'purchase_cancelled', 'no_change'
      co2_saved: outcome.co2_saved || 0,
      cost_saved: outcome.cost_saved || 0,
      timestamp: Date.now()
    };

    // Update effectiveness scores
    this.updateEffectivenessScores(interaction);
    
    this.saveProfile();
  }

  updateResponsePatterns(interaction) {
    const key = `${interaction.nudge_type}_${interaction.context.time_of_day}`;
    
    if (!this.profile.response_patterns[key]) {
      this.profile.response_patterns[key] = {
        total_shown: 0,
        accepted: 0,
        dismissed: 0,
        snoozed: 0,
        ignored: 0
      };
    }

    const pattern = this.profile.response_patterns[key];
    pattern.total_shown++;
    
    if (interaction.response) {
      pattern[interaction.response.type]++;
    }
  }

  updateEffectivenessScores(interaction) {
    const nudgeType = interaction.nudge_type;
    
    if (!this.profile.effectiveness_scores[nudgeType]) {
      this.profile.effectiveness_scores[nudgeType] = {
        total_attempts: 0,
        successful_outcomes: 0,
        total_co2_saved: 0,
        total_cost_saved: 0,
        average_response_time: 0
      };
    }

    const score = this.profile.effectiveness_scores[nudgeType];
    score.total_attempts++;
    
    if (interaction.outcome && interaction.outcome.co2_saved > 0) {
      score.successful_outcomes++;
      score.total_co2_saved += interaction.outcome.co2_saved;
      score.total_cost_saved += interaction.outcome.cost_saved || 0;
    }

    // Calculate average response time
    if (interaction.response) {
      const responseTime = interaction.response.timestamp - interaction.timestamp;
      score.average_response_time = (score.average_response_time * (score.total_attempts - 1) + responseTime) / score.total_attempts;
    }
  }

  getPersonalizedNudgeStrategy(context) {
    const strategy = {
      recommended_type: this.getBestNudgeType(context),
      optimal_timing: this.getOptimalTiming(context),
      message_style: this.getPreferredMessageStyle(context),
      effort_level: this.getAppropriateEffortLevel(context),
      confidence: 0.5
    };

    // Calculate confidence based on data quality
    const totalInteractions = this.profile.nudge_interactions.length;
    if (totalInteractions > 50) strategy.confidence += 0.3;
    else if (totalInteractions > 20) strategy.confidence += 0.2;
    else if (totalInteractions > 5) strategy.confidence += 0.1;

    // Adjust confidence based on context similarity
    const similarContexts = this.findSimilarContexts(context);
    if (similarContexts.length > 10) strategy.confidence += 0.2;
    else if (similarContexts.length > 5) strategy.confidence += 0.1;

    strategy.confidence = Math.min(0.95, strategy.confidence);

    return strategy;
  }

  getBestNudgeType(context) {
    const categoryScores = {};
    
    // Analyze effectiveness by nudge type
    Object.entries(this.profile.effectiveness_scores).forEach(([type, score]) => {
      if (score.total_attempts > 0) {
        const successRate = score.successful_outcomes / score.total_attempts;
        const avgSaving = score.total_co2_saved / score.total_attempts;
        categoryScores[type] = successRate * 0.7 + (avgSaving / 5) * 0.3; // Weight success rate more
      }
    });

    // Consider context-specific patterns
    const timeOfDay = context.time_of_day || new Date().getHours();
    const contextualScores = {};
    
    Object.entries(this.profile.response_patterns).forEach(([key, pattern]) => {
      const [type, hour] = key.split('_');
      if (Math.abs(parseInt(hour) - timeOfDay) <= 2) { // Within 2 hours
        const acceptanceRate = pattern.accepted / pattern.total_shown;
        contextualScores[type] = (contextualScores[type] || 0) + acceptanceRate;
      }
    });

    // Combine scores
    const combinedScores = {};
    const allTypes = new Set([...Object.keys(categoryScores), ...Object.keys(contextualScores)]);
    
    allTypes.forEach(type => {
      combinedScores[type] = (categoryScores[type] || 0) * 0.6 + (contextualScores[type] || 0) * 0.4;
    });

    // Return best type or default
    const bestType = Object.entries(combinedScores).sort(([,a], [,b]) => b - a)[0];
    return bestType ? bestType[0] : 'delay_purchase';
  }

  getOptimalTiming(context) {
    const hourlyAcceptance = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    this.profile.nudge_interactions.forEach(interaction => {
      if (interaction.response && interaction.response.type === 'accepted') {
        const hour = interaction.context.time_of_day;
        hourlyAcceptance[hour]++;
      }
      hourlyCounts[interaction.context.time_of_day]++;
    });

    // Calculate acceptance rates by hour
    const acceptanceRates = hourlyAcceptance.map((accepted, hour) => ({
      hour,
      rate: hourlyCounts[hour] > 0 ? accepted / hourlyCounts[hour] : 0,
      count: hourlyCounts[hour]
    }));

    // Find best hours with sufficient data
    const goodHours = acceptanceRates
      .filter(h => h.count >= 3) // At least 3 interactions
      .sort((a, b) => b.rate - a.rate);

    if (goodHours.length > 0) {
      return {
        preferred_hours: goodHours.slice(0, 3).map(h => h.hour),
        avoid_hours: acceptanceRates
          .filter(h => h.count >= 3 && h.rate < 0.2)
          .map(h => h.hour)
      };
    }

    // Default timing if insufficient data
    return {
      preferred_hours: [9, 14, 19], // Morning, afternoon, evening
      avoid_hours: [0, 1, 2, 3, 4, 5] // Late night/early morning
    };
  }

  getPreferredMessageStyle(context) {
    // Analyze response patterns to different message styles
    const stylePreferences = {
      direct: 0,
      friendly: 0,
      urgent: 0,
      informative: 0
    };

    // This would be enhanced with actual message style tracking
    // For now, return a default based on user behavior patterns
    const totalSuccessful = this.profile.learning_data.successful_nudges.length;
    const totalIgnored = this.profile.learning_data.ignored_nudges.length;

    if (totalSuccessful > totalIgnored * 2) {
      return 'friendly'; // User responds well to nudges
    } else if (totalIgnored > totalSuccessful * 2) {
      return 'direct'; // User needs more direct approach
    } else {
      return 'informative'; // Balanced approach
    }
  }

  getAppropriateEffortLevel(context) {
    // Analyze user's tolerance for different effort levels
    const effortTolerance = this.profile.preferences.effort_tolerance;
    
    // Consider context - higher emissions might justify higher effort
    const emissionLevel = context.emission_level || 0;
    
    if (emissionLevel > 5) return 'high'; // High impact justifies high effort
    if (emissionLevel > 2) return 'medium';
    
    return effortTolerance;
  }

  findSimilarContexts(context) {
    return this.profile.nudge_interactions.filter(interaction => {
      const ctx = interaction.context;
      let similarity = 0;
      
      // Time similarity (within 2 hours)
      if (Math.abs(ctx.time_of_day - (context.time_of_day || new Date().getHours())) <= 2) {
        similarity += 0.3;
      }
      
      // Category similarity
      if (ctx.product_category === context.category) {
        similarity += 0.4;
      }
      
      // Emission level similarity (within 50%)
      const emissionDiff = Math.abs(ctx.emission_level - (context.emission_level || 0));
      if (emissionDiff < Math.max(ctx.emission_level, context.emission_level || 0) * 0.5) {
        similarity += 0.3;
      }
      
      return similarity >= 0.5; // At least 50% similar
    });
  }

  shouldShowNudge(context) {
    // Check if user is experiencing nudge fatigue
    const recentNudges = this.profile.nudge_interactions.filter(
      i => Date.now() - i.timestamp < 60 * 60 * 1000 // Last hour
    );

    if (recentNudges.length >= 3) {
      return { show: false, reason: 'nudge_fatigue' };
    }

    // Check if similar nudges have been consistently ignored
    const similarContexts = this.findSimilarContexts(context);
    const recentSimilar = similarContexts.filter(
      i => Date.now() - i.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const ignoredRate = recentSimilar.filter(
      i => i.response && (i.response.type === 'ignored' || i.response.type === 'dismissed')
    ).length / Math.max(recentSimilar.length, 1);

    if (ignoredRate > 0.8 && recentSimilar.length >= 3) {
      return { show: false, reason: 'consistently_ignored' };
    }

    // Check optimal timing
    const timing = this.getOptimalTiming(context);
    const currentHour = new Date().getHours();
    
    if (timing.avoid_hours.includes(currentHour)) {
      return { show: false, reason: 'suboptimal_timing' };
    }

    return { show: true, confidence: this.getPersonalizedNudgeStrategy(context).confidence };
  }

  generateInteractionId() {
    return 'int_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getProfileSummary() {
    const totalInteractions = this.profile.nudge_interactions.length;
    const successfulNudges = this.profile.learning_data.successful_nudges.length;
    const ignoredNudges = this.profile.learning_data.ignored_nudges.length;
    
    return {
      total_interactions: totalInteractions,
      success_rate: totalInteractions > 0 ? successfulNudges / totalInteractions : 0,
      ignore_rate: totalInteractions > 0 ? ignoredNudges / totalInteractions : 0,
      most_effective_nudge: this.getMostEffectiveNudgeType(),
      preferred_timing: this.getOptimalTiming({}),
      data_quality: totalInteractions > 20 ? 'good' : totalInteractions > 5 ? 'fair' : 'poor'
    };
  }

  getMostEffectiveNudgeType() {
    let bestType = null;
    let bestScore = 0;

    Object.entries(this.profile.effectiveness_scores).forEach(([type, score]) => {
      if (score.total_attempts > 0) {
        const effectiveness = (score.successful_outcomes / score.total_attempts) * 
                            (score.total_co2_saved / score.total_attempts);
        if (effectiveness > bestScore) {
          bestScore = effectiveness;
          bestType = type;
        }
      }
    });

    return bestType || 'delay_purchase';
  }

  exportProfile() {
    return JSON.stringify(this.profile, null, 2);
  }

  clearProfile() {
    this.profile = {
      nudge_interactions: [],
      response_patterns: {},
      preferences: {
        nudge_types: {},
        timing_preferences: {},
        effort_tolerance: 'medium',
        categories: []
      },
      effectiveness_scores: {},
      learning_data: {
        successful_nudges: [],
        ignored_nudges: [],
        context_factors: []
      }
    };
    this.saveProfile();
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BehaviorProfiler;
} else {
  window.BehaviorProfiler = BehaviorProfiler;
}
