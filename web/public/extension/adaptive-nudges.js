// Adaptive Nudge Selection System
class AdaptiveNudgeSelector {
  constructor(behaviorProfiler) {
    this.behaviorProfiler = behaviorProfiler;
    this.nudgeTemplates = this.initializeNudgeTemplates();
    this.messageStyles = this.initializeMessageStyles();
    this.currentContext = {};
  }

  initializeNudgeTemplates() {
    return {
      delay_purchase: {
        type: 'delay_purchase',
        category: 'shopping',
        effort_levels: {
          low: {
            title: 'Quick pause?',
            message: 'Consider waiting 24 hours before purchasing.',
            action: 'Set reminder',
            duration: 24 * 60 * 60 * 1000 // 24 hours
          },
          medium: {
            title: 'Smart delay suggestion',
            message: 'This item has high carbon impact. Waiting 24 hours could help you find better alternatives.',
            action: 'Delay & find alternatives',
            duration: 24 * 60 * 60 * 1000
          },
          high: {
            title: 'High-impact purchase detected',
            message: 'This purchase will significantly impact your carbon footprint. Consider delaying 48 hours to research sustainable alternatives.',
            action: 'Research alternatives',
            duration: 48 * 60 * 60 * 1000
          }
        }
      },
      
      alternative_suggestion: {
        type: 'alternative_suggestion',
        category: 'shopping',
        effort_levels: {
          low: {
            title: 'Better option available',
            message: 'Found a similar item with 40% less carbon impact.',
            action: 'View alternative',
            duration: 0
          },
          medium: {
            title: 'Sustainable alternatives',
            message: 'We found 3 eco-friendly alternatives with lower carbon footprint and similar features.',
            action: 'Compare options',
            duration: 0
          },
          high: {
            title: 'Carbon-conscious choice',
            message: 'Consider these sustainable alternatives that could reduce your carbon impact by up to 60% while meeting your needs.',
            action: 'Detailed comparison',
            duration: 0
          }
        }
      },

      energy_timing: {
        type: 'energy_timing',
        category: 'energy',
        effort_levels: {
          low: {
            title: 'Clean energy window',
            message: 'Grid is cleaner in 2 hours. Delay energy-intensive tasks?',
            action: 'Schedule for later',
            duration: 2 * 60 * 60 * 1000
          },
          medium: {
            title: 'Optimize energy timing',
            message: 'Running this task during clean grid hours (2-4 PM) could reduce emissions by 50%.',
            action: 'Auto-schedule',
            duration: 0
          },
          high: {
            title: 'Smart energy management',
            message: 'Current grid intensity is high. Scheduling energy tasks for optimal times could save 2.5kg CO₂ this week.',
            action: 'Set up smart scheduling',
            duration: 0
          }
        }
      },

      transport_alternative: {
        type: 'transport_alternative',
        category: 'transport',
        effort_levels: {
          low: {
            title: 'Quick transport tip',
            message: 'Public transport available for this route.',
            action: 'Check options',
            duration: 0
          },
          medium: {
            title: 'Greener travel option',
            message: 'Taking public transport for this trip could save 3.2kg CO₂ and $12.',
            action: 'Plan route',
            duration: 0
          },
          high: {
            title: 'Sustainable travel planning',
            message: 'Multiple eco-friendly options available: public transport (3.2kg saved), bike sharing (4.1kg saved), or carpooling (2.1kg saved).',
            action: 'Compare & book',
            duration: 0
          }
        }
      },

      food_choice: {
        type: 'food_choice',
        category: 'food',
        effort_levels: {
          low: {
            title: 'Plant-based option?',
            message: 'Vegetarian alternative available.',
            action: 'See options',
            duration: 0
          },
          medium: {
            title: 'Lower-carbon meal',
            message: 'Choosing the plant-based option could reduce this meal\'s carbon footprint by 70%.',
            action: 'View menu',
            duration: 0
          },
          high: {
            title: 'Sustainable dining choice',
            message: 'Plant-based alternatives at this restaurant could save 2.8kg CO₂ per meal while supporting local sustainable farming.',
            action: 'Explore sustainable menu',
            duration: 0
          }
        }
      }
    };
  }

  initializeMessageStyles() {
    return {
      direct: {
        tone: 'straightforward',
        urgency: 'medium',
        personalization: 'low',
        examples: {
          prefix: '',
          suffix: '',
          emphasis: 'bold'
        }
      },
      friendly: {
        tone: 'conversational',
        urgency: 'low',
        personalization: 'high',
        examples: {
          prefix: 'Hey! ',
          suffix: ' 🌱',
          emphasis: 'gentle'
        }
      },
      urgent: {
        tone: 'action-oriented',
        urgency: 'high',
        personalization: 'medium',
        examples: {
          prefix: '⚡ ',
          suffix: ' Act now!',
          emphasis: 'strong'
        }
      },
      informative: {
        tone: 'educational',
        urgency: 'low',
        personalization: 'medium',
        examples: {
          prefix: '💡 Did you know? ',
          suffix: ' Learn more →',
          emphasis: 'subtle'
        }
      }
    };
  }

  selectOptimalNudge(context) {
    // Get personalized strategy from behavior profiler
    const strategy = this.behaviorProfiler.getPersonalizedNudgeStrategy(context);
    
    // Check if we should show a nudge at all
    const shouldShow = this.behaviorProfiler.shouldShowNudge(context);
    if (!shouldShow.show) {
      return {
        show: false,
        reason: shouldShow.reason,
        strategy
      };
    }

    // Select nudge template based on strategy
    const nudgeTemplate = this.nudgeTemplates[strategy.recommended_type];
    if (!nudgeTemplate) {
      console.warn('Green Twin: Unknown nudge type:', strategy.recommended_type);
      return { show: false, reason: 'unknown_nudge_type' };
    }

    // Get appropriate effort level
    const effortLevel = strategy.effort_level;
    const nudgeConfig = nudgeTemplate.effort_levels[effortLevel];

    // Personalize the message
    const personalizedNudge = this.personalizeNudge(nudgeConfig, strategy, context);

    // Add interaction tracking
    const interactionId = this.behaviorProfiler.recordNudgeInteraction({
      type: strategy.recommended_type,
      category: nudgeTemplate.category,
      context: {
        ...context,
        strategy,
        effort_level: effortLevel
      }
    });

    return {
      show: true,
      nudge: {
        ...personalizedNudge,
        id: interactionId,
        type: strategy.recommended_type,
        category: nudgeTemplate.category,
        confidence: strategy.confidence,
        timing: strategy.optimal_timing
      },
      strategy
    };
  }

  personalizeNudge(nudgeConfig, strategy, context) {
    const messageStyle = this.messageStyles[strategy.message_style];
    
    // Personalize title
    let title = nudgeConfig.title;
    if (strategy.message_style === 'friendly') {
      title = messageStyle.examples.prefix + title;
    } else if (strategy.message_style === 'urgent') {
      title = messageStyle.examples.prefix + title;
    }

    // Personalize message
    let message = nudgeConfig.message;
    
    // Add context-specific information
    if (context.emission_level) {
      message = message.replace(/\d+(\.\d+)?kg CO₂/, `${context.emission_level}kg CO₂`);
    }
    
    if (context.cost_saving) {
      message = message.replace(/\$\d+/, `$${context.cost_saving}`);
    }

    // Add style-specific elements
    if (strategy.message_style === 'friendly') {
      message += messageStyle.examples.suffix;
    } else if (strategy.message_style === 'informative') {
      message = messageStyle.examples.prefix + message;
    }

    // Personalize action button
    let action = nudgeConfig.action;
    if (strategy.message_style === 'urgent') {
      action += ' now';
    }

    return {
      title,
      message,
      action,
      duration: nudgeConfig.duration,
      style: strategy.message_style,
      effort_level: strategy.effort_level
    };
  }

  recordNudgeResponse(nudgeId, response) {
    this.behaviorProfiler.recordNudgeResponse(nudgeId, response);
    
    // Learn from the response for future improvements
    this.updateAdaptiveStrategy(nudgeId, response);
  }

  recordNudgeOutcome(nudgeId, outcome) {
    this.behaviorProfiler.recordNudgeOutcome(nudgeId, outcome);
  }

  updateAdaptiveStrategy(nudgeId, response) {
    // This method would implement online learning to improve nudge selection
    // For now, we rely on the behavior profiler's learning mechanisms
    
    const context = this.currentContext;
    const responseType = response.type;
    
    // Log for future analysis
    console.log('Green Twin: Nudge response recorded', {
      nudgeId,
      responseType,
      context: {
        time: new Date().getHours(),
        category: context.category,
        emission_level: context.emission_level
      }
    });
  }

  generateNudgeVariations(baseNudge, count = 3) {
    const variations = [];
    const styles = Object.keys(this.messageStyles);
    const effortLevels = ['low', 'medium', 'high'];

    for (let i = 0; i < count; i++) {
      const style = styles[i % styles.length];
      const effort = effortLevels[i % effortLevels.length];
      
      // Create a variation with different style and effort level
      const mockStrategy = {
        message_style: style,
        effort_level: effort,
        recommended_type: baseNudge.type
      };

      const nudgeTemplate = this.nudgeTemplates[baseNudge.type];
      const nudgeConfig = nudgeTemplate.effort_levels[effort];
      
      const variation = this.personalizeNudge(nudgeConfig, mockStrategy, this.currentContext);
      variations.push({
        ...variation,
        id: `${baseNudge.id}_var_${i}`,
        variation_of: baseNudge.id,
        style,
        effort_level: effort
      });
    }

    return variations;
  }

  A_B_testNudges(nudgeA, nudgeB, context) {
    // Simple A/B testing implementation
    const testId = 'ab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const selectedNudge = Math.random() < 0.5 ? nudgeA : nudgeB;
    
    // Track the A/B test
    console.log('Green Twin: A/B test started', {
      testId,
      selectedNudge: selectedNudge.id,
      context
    });

    return {
      ...selectedNudge,
      ab_test_id: testId,
      ab_test_variant: selectedNudge === nudgeA ? 'A' : 'B'
    };
  }

  getAdaptiveInsights() {
    const profile = this.behaviorProfiler.getProfileSummary();
    
    return {
      profile_summary: profile,
      recommendations: this.generateAdaptiveRecommendations(profile),
      learning_status: {
        data_quality: profile.data_quality,
        confidence_level: profile.success_rate > 0.6 ? 'high' : 
                         profile.success_rate > 0.3 ? 'medium' : 'low',
        next_optimization: this.suggestNextOptimization(profile)
      }
    };
  }

  generateAdaptiveRecommendations(profile) {
    const recommendations = [];

    if (profile.ignore_rate > 0.7) {
      recommendations.push({
        type: 'reduce_frequency',
        message: 'Consider reducing nudge frequency to avoid fatigue',
        priority: 'high'
      });
    }

    if (profile.success_rate < 0.3 && profile.total_interactions > 10) {
      recommendations.push({
        type: 'adjust_strategy',
        message: 'Current nudge strategy may not be effective for this user',
        priority: 'high'
      });
    }

    if (profile.data_quality === 'poor') {
      recommendations.push({
        type: 'collect_more_data',
        message: 'More interaction data needed for better personalization',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  suggestNextOptimization(profile) {
    if (profile.total_interactions < 20) {
      return 'Collect more interaction data';
    }
    
    if (profile.success_rate < 0.4) {
      return 'Experiment with different nudge types and timing';
    }
    
    if (profile.ignore_rate > 0.6) {
      return 'Reduce nudge frequency and improve targeting';
    }
    
    return 'Fine-tune message personalization';
  }

  updateContext(context) {
    this.currentContext = { ...this.currentContext, ...context };
  }

  // Method to test different nudge strategies
  simulateNudgeStrategy(context, strategyOverrides = {}) {
    const originalStrategy = this.behaviorProfiler.getPersonalizedNudgeStrategy(context);
    const testStrategy = { ...originalStrategy, ...strategyOverrides };
    
    const nudgeTemplate = this.nudgeTemplates[testStrategy.recommended_type];
    if (!nudgeTemplate) return null;

    const nudgeConfig = nudgeTemplate.effort_levels[testStrategy.effort_level];
    const personalizedNudge = this.personalizeNudge(nudgeConfig, testStrategy, context);

    return {
      strategy: testStrategy,
      nudge: personalizedNudge,
      predicted_effectiveness: this.predictNudgeEffectiveness(testStrategy, context)
    };
  }

  predictNudgeEffectiveness(strategy, context) {
    // Simple effectiveness prediction based on historical data
    const similarContexts = this.behaviorProfiler.findSimilarContexts(context);
    const relevantInteractions = similarContexts.filter(
      interaction => interaction.nudge_type === strategy.recommended_type
    );

    if (relevantInteractions.length === 0) {
      return 0.5; // Default prediction
    }

    const successfulInteractions = relevantInteractions.filter(
      interaction => interaction.response && interaction.response.type === 'accepted'
    );

    return successfulInteractions.length / relevantInteractions.length;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AdaptiveNudgeSelector;
} else {
  window.AdaptiveNudgeSelector = AdaptiveNudgeSelector;
}
