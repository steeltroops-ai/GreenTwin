interface UserProfile {
  preferences: {
    effort_level: 'low' | 'medium' | 'high';
    categories: string[];
    notification_frequency: 'minimal' | 'moderate' | 'frequent';
    goals: {
      daily_target: number;
      weekly_target: number;
      monthly_target: number;
    };
  };
  behavior_patterns: {
    active_hours: number[];
    shopping_frequency: number;
    travel_patterns: string[];
    energy_usage: string;
  };
  intervention_history: {
    type: string;
    success: boolean;
    timestamp: number;
    context: any;
  }[];
}

interface SmartRecommendation {
  id: string;
  type: 'immediate' | 'scheduled' | 'habit' | 'goal';
  category: 'transport' | 'shopping' | 'energy' | 'food' | 'general';
  title: string;
  description: string;
  impact: {
    co2_saving: number;
    cost_saving?: number;
    effort_required: 'low' | 'medium' | 'high';
  };
  timing: {
    optimal_time?: number; // Hour of day
    duration_minutes?: number;
    deadline?: number; // Timestamp
  };
  personalization: {
    confidence: number;
    reasoning: string[];
    alternatives: string[];
  };
  action: {
    type: 'delay' | 'substitute' | 'schedule' | 'avoid' | 'optimize';
    instructions: string[];
    success_criteria: string;
  };
  context: {
    triggers: string[];
    location?: string;
    weather_dependent?: boolean;
    grid_dependent?: boolean;
  };
}

export class SmartRecommendationsEngine {
  private userProfile: UserProfile;
  private currentContext: any = {};
  private recommendationHistory: SmartRecommendation[] = [];

  constructor(userProfile: UserProfile) {
    this.userProfile = userProfile;
  }

  updateContext(context: {
    current_time?: number;
    location?: string;
    weather?: string;
    grid_intensity?: number;
    recent_activity?: any[];
    upcoming_events?: any[];
  }) {
    this.currentContext = { ...this.currentContext, ...context };
  }

  generateRecommendations(
    predictions: any[],
    currentEmissions: number,
    maxRecommendations: number = 5
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];

    // Generate different types of recommendations
    recommendations.push(...this.generateImmediateRecommendations(currentEmissions));
    recommendations.push(...this.generateScheduledRecommendations(predictions));
    recommendations.push(...this.generateHabitRecommendations());
    recommendations.push(...this.generateGoalBasedRecommendations(predictions));

    // Score and rank recommendations
    const scoredRecommendations = recommendations.map(rec => ({
      ...rec,
      score: this.calculateRecommendationScore(rec)
    }));

    // Sort by score and return top recommendations
    return scoredRecommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRecommendations)
      .map(({ score, ...rec }) => rec);
  }

  private generateImmediateRecommendations(currentEmissions: number): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    const now = Date.now();
    const currentHour = new Date().getHours();

    // High emissions alert
    if (currentEmissions > this.userProfile.preferences.goals.daily_target * 0.8) {
      recommendations.push({
        id: `immediate_${now}_high_emissions`,
        type: 'immediate',
        category: 'general',
        title: 'Daily Target Alert',
        description: 'You\'re approaching your daily carbon target. Consider postponing non-essential activities.',
        impact: {
          co2_saving: currentEmissions * 0.2,
          effort_required: 'low'
        },
        timing: {
          optimal_time: currentHour,
          duration_minutes: 5
        },
        personalization: {
          confidence: 0.9,
          reasoning: ['Current emissions exceed 80% of daily target'],
          alternatives: ['Review planned activities', 'Reschedule energy-intensive tasks']
        },
        action: {
          type: 'delay',
          instructions: [
            'Review your planned activities for today',
            'Consider postponing non-urgent purchases',
            'Reschedule energy-intensive tasks to cleaner grid hours'
          ],
          success_criteria: 'Stay within daily carbon target'
        },
        context: {
          triggers: ['high_daily_emissions'],
          grid_dependent: true
        }
      });
    }

    // Grid-based energy recommendation
    if (this.currentContext.grid_intensity > 400) { // High grid intensity
      recommendations.push({
        id: `immediate_${now}_grid_delay`,
        type: 'immediate',
        category: 'energy',
        title: 'Delay Energy-Intensive Tasks',
        description: 'Grid is currently high-carbon. Delay laundry, charging, and other energy tasks.',
        impact: {
          co2_saving: 1.2,
          cost_saving: 0.15,
          effort_required: 'low'
        },
        timing: {
          optimal_time: this.findNextCleanGridHour(),
          duration_minutes: 2
        },
        personalization: {
          confidence: 0.95,
          reasoning: [
            'Current grid intensity is high',
            'Delaying by 3-4 hours could reduce emissions by 60%'
          ],
          alternatives: ['Use battery power if available', 'Reduce overall energy usage']
        },
        action: {
          type: 'schedule',
          instructions: [
            'Postpone running dishwasher, laundry, or dryer',
            'Delay charging electric vehicles',
            'Set reminders for cleaner grid hours'
          ],
          success_criteria: 'Tasks completed during cleaner grid period'
        },
        context: {
          triggers: ['high_grid_intensity'],
          grid_dependent: true
        }
      });
    }

    return recommendations;
  }

  private generateScheduledRecommendations(predictions: any[]): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    const now = Date.now();

    // Find high-emission days in predictions
    const highEmissionDays = predictions.filter(p => 
      p.predictedKg > this.userProfile.preferences.goals.daily_target * 1.2
    );

    highEmissionDays.forEach((day, index) => {
      if (index < 3) { // Only recommend for next 3 high days
        recommendations.push({
          id: `scheduled_${now}_high_day_${index}`,
          type: 'scheduled',
          category: 'general',
          title: `Prepare for High-Carbon Day`,
          description: `${this.formatDate(day.date)} is predicted to be high-emission. Plan alternatives now.`,
          impact: {
            co2_saving: day.predictedKg * 0.3,
            effort_required: 'medium'
          },
          timing: {
            optimal_time: 9, // 9 AM
            deadline: new Date(day.date).getTime() - 24 * 60 * 60 * 1000 // Day before
          },
          personalization: {
            confidence: day.confidence,
            reasoning: [
              `Predicted emissions: ${day.predictedKg}kg CO₂`,
              'Historical patterns suggest high activity'
            ],
            alternatives: day.interventionOpportunities.map((opp: any) => opp.description)
          },
          action: {
            type: 'optimize',
            instructions: [
              'Review planned activities for this day',
              'Pre-schedule energy tasks for clean grid hours',
              'Consider alternative transport options',
              'Batch errands to reduce travel'
            ],
            success_criteria: 'Reduce predicted emissions by 30%'
          },
          context: {
            triggers: ['high_predicted_emissions'],
            grid_dependent: true
          }
        });
      }
    });

    return recommendations;
  }

  private generateHabitRecommendations(): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    const now = Date.now();

    // Analyze intervention history for patterns
    const recentInterventions = this.userProfile.intervention_history
      .filter(i => now - i.timestamp < 30 * 24 * 60 * 60 * 1000) // Last 30 days
      .filter(i => i.success);

    const successfulTypes = recentInterventions.reduce((acc, intervention) => {
      acc[intervention.type] = (acc[intervention.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Recommend building on successful intervention types
    Object.entries(successfulTypes).forEach(([type, count]) => {
      if (count >= 3) { // At least 3 successful interventions
        recommendations.push({
          id: `habit_${now}_${type}`,
          type: 'habit',
          category: this.getCategory(type),
          title: `Build ${type.replace('_', ' ')} Habit`,
          description: `You've successfully used ${type.replace('_', ' ')} ${count} times. Make it a daily habit!`,
          impact: {
            co2_saving: 0.5 * count, // Estimate based on frequency
            effort_required: 'low'
          },
          timing: {
            optimal_time: this.findOptimalHabitTime(type),
            duration_minutes: 10
          },
          personalization: {
            confidence: Math.min(0.9, count * 0.2),
            reasoning: [
              `${count} successful ${type} interventions in 30 days`,
              'Building habits increases long-term impact'
            ],
            alternatives: ['Set daily reminders', 'Track progress weekly']
          },
          action: {
            type: 'optimize',
            instructions: [
              `Set daily reminder for ${type.replace('_', ' ')}`,
              'Track your progress weekly',
              'Gradually increase frequency or impact'
            ],
            success_criteria: `Perform ${type.replace('_', ' ')} daily for 7 days`
          },
          context: {
            triggers: ['successful_intervention_pattern']
          }
        });
      }
    });

    return recommendations;
  }

  private generateGoalBasedRecommendations(predictions: any[]): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];
    const now = Date.now();

    const totalPredicted = predictions.reduce((sum, p) => sum + p.predictedKg, 0);
    const weeklyTarget = this.userProfile.preferences.goals.weekly_target;

    // Weekly goal tracking
    if (totalPredicted > weeklyTarget * 1.1) {
      recommendations.push({
        id: `goal_${now}_weekly_target`,
        type: 'goal',
        category: 'general',
        title: 'Weekly Goal at Risk',
        description: `Predicted emissions (${Math.round(totalPredicted)}kg) exceed weekly target. Take action now.`,
        impact: {
          co2_saving: totalPredicted - weeklyTarget,
          effort_required: 'medium'
        },
        timing: {
          optimal_time: 8, // 8 AM
          duration_minutes: 15
        },
        personalization: {
          confidence: 0.85,
          reasoning: [
            `Predicted: ${Math.round(totalPredicted)}kg vs Target: ${weeklyTarget}kg`,
            'Early intervention prevents goal overshoot'
          ],
          alternatives: [
            'Adjust daily targets',
            'Focus on highest-impact categories',
            'Increase intervention frequency'
          ]
        },
        action: {
          type: 'optimize',
          instructions: [
            'Review and adjust daily carbon targets',
            'Focus interventions on highest-emission categories',
            'Set more frequent check-ins',
            'Consider more aggressive alternatives'
          ],
          success_criteria: 'Reduce weekly predicted emissions to target level'
        },
        context: {
          triggers: ['weekly_goal_risk']
        }
      });
    }

    return recommendations;
  }

  private calculateRecommendationScore(recommendation: SmartRecommendation): number {
    let score = 0;

    // Impact score (40% of total)
    score += (recommendation.impact.co2_saving / 5) * 40; // Normalize to 5kg max

    // Confidence score (25% of total)
    score += recommendation.personalization.confidence * 25;

    // Effort score (20% of total) - lower effort = higher score
    const effortScores = { low: 20, medium: 15, high: 10 };
    score += effortScores[recommendation.impact.effort_required];

    // User preference alignment (15% of total)
    if (this.userProfile.preferences.categories.includes(recommendation.category)) {
      score += 15;
    }

    // Timing relevance (bonus)
    if (recommendation.timing.optimal_time) {
      const currentHour = new Date().getHours();
      const timeDiff = Math.abs(currentHour - recommendation.timing.optimal_time);
      if (timeDiff <= 2) score += 5; // Bonus for timely recommendations
    }

    return Math.min(100, score);
  }

  private findNextCleanGridHour(): number {
    // Mock implementation - in real app, would use grid data
    const currentHour = new Date().getHours();
    const cleanHours = [2, 3, 4, 13, 14, 15]; // Typical clean hours
    
    return cleanHours.find(hour => hour > currentHour) || cleanHours[0] + 24;
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  private getCategory(type: string): 'transport' | 'shopping' | 'energy' | 'food' | 'general' {
    if (type.includes('transport') || type.includes('travel')) return 'transport';
    if (type.includes('purchase') || type.includes('shopping')) return 'shopping';
    if (type.includes('energy') || type.includes('grid')) return 'energy';
    if (type.includes('food')) return 'food';
    return 'general';
  }

  private findOptimalHabitTime(type: string): number {
    // Analyze user's active hours and successful intervention times
    const activeHours = this.userProfile.behavior_patterns.active_hours;
    const successfulInterventions = this.userProfile.intervention_history
      .filter(i => i.type === type && i.success);

    if (successfulInterventions.length > 0) {
      const successfulHours = successfulInterventions.map(i => 
        new Date(i.timestamp).getHours()
      );
      
      // Find most common successful hour
      const hourCounts = successfulHours.reduce((acc, hour) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const mostSuccessfulHour = Object.entries(hourCounts)
        .sort(([,a], [,b]) => b - a)[0];

      if (mostSuccessfulHour) {
        return parseInt(mostSuccessfulHour[0]);
      }
    }

    // Fallback to most active hour
    return activeHours.length > 0 ? activeHours[0] : 9; // Default 9 AM
  }

  trackRecommendationOutcome(recommendationId: string, success: boolean, context: any = {}) {
    this.userProfile.intervention_history.push({
      type: recommendationId.split('_')[0],
      success,
      timestamp: Date.now(),
      context: { recommendationId, ...context }
    });

    // Keep only last 100 interventions
    if (this.userProfile.intervention_history.length > 100) {
      this.userProfile.intervention_history = this.userProfile.intervention_history.slice(-100);
    }
  }

  updateUserProfile(updates: Partial<UserProfile>) {
    this.userProfile = { ...this.userProfile, ...updates };
  }

  getUserProfile(): UserProfile {
    return this.userProfile;
  }

  getRecommendationHistory(): SmartRecommendation[] {
    return this.recommendationHistory;
  }
}
