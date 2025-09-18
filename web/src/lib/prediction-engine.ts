interface CarbonEvent {
  timestamp: number;
  type: 'product' | 'travel' | 'energy' | 'food' | 'predictive_intervention' | 'delay_completed';
  kg: number;
  metadata: any;
}

interface BehaviorPatterns {
  dailyAverage: number;
  weeklyPattern: number[];
  seasonalTrends: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  timeOfDayPattern: number[];
  interventionEffectiveness: number;
}

interface Prediction {
  date: string;
  predictedKg: number;
  confidence: number;
  breakdown: {
    transport: number;
    shopping: number;
    energy: number;
    food: number;
  };
  interventionOpportunities: InterventionOpportunity[];
  factors: PredictionFactor[];
}

interface InterventionOpportunity {
  type: 'delay_purchase' | 'alternative_transport' | 'energy_timing' | 'sustainable_food';
  description: string;
  potentialSaving: number;
  effort: 'low' | 'medium' | 'high';
  confidence: number;
}

interface PredictionFactor {
  name: string;
  impact: number;
  description: string;
}

export class CarbonPredictionEngine {
  private history: CarbonEvent[] = [];
  private patterns: BehaviorPatterns | null = null;
  private minDataPoints = 7; // Minimum days of data for reliable predictions

  constructor(events: CarbonEvent[] = []) {
    this.history = events.sort((a, b) => a.timestamp - b.timestamp);
    this.analyzePatterns();
  }

  addEvent(event: CarbonEvent) {
    this.history.push(event);
    this.history.sort((a, b) => a.timestamp - b.timestamp);
    
    // Re-analyze patterns if we have enough new data
    if (this.history.length % 10 === 0) {
      this.analyzePatterns();
    }
  }

  analyzePatterns(): BehaviorPatterns {
    if (this.history.length === 0) {
      return this.getDefaultPatterns();
    }

    const patterns: BehaviorPatterns = {
      dailyAverage: this.calculateDailyAverage(),
      weeklyPattern: this.calculateWeeklyPattern(),
      seasonalTrends: this.calculateSeasonalTrends(),
      categoryBreakdown: this.calculateCategoryBreakdown(),
      timeOfDayPattern: this.calculateTimeOfDayPattern(),
      interventionEffectiveness: this.calculateInterventionEffectiveness()
    };

    this.patterns = patterns;
    return patterns;
  }

  private getDefaultPatterns(): BehaviorPatterns {
    return {
      dailyAverage: 2.5, // Default 2.5kg CO2 per day
      weeklyPattern: [1.0, 1.1, 1.2, 1.1, 1.3, 1.4, 0.8], // Mon-Sun multipliers
      seasonalTrends: {
        'winter': 1.2,
        'spring': 1.0,
        'summer': 0.9,
        'fall': 1.1
      },
      categoryBreakdown: {
        transport: 0.4,
        shopping: 0.3,
        energy: 0.2,
        food: 0.1
      },
      timeOfDayPattern: new Array(24).fill(1.0),
      interventionEffectiveness: 0.3 // 30% reduction from interventions
    };
  }

  private calculateDailyAverage(): number {
    if (this.history.length === 0) return 2.5;

    const dailyTotals = new Map<string, number>();
    
    this.history.forEach(event => {
      const date = new Date(event.timestamp).toDateString();
      dailyTotals.set(date, (dailyTotals.get(date) || 0) + event.kg);
    });

    const totals = Array.from(dailyTotals.values());
    return totals.reduce((sum, total) => sum + total, 0) / totals.length;
  }

  private calculateWeeklyPattern(): number[] {
    const weeklyTotals = new Array(7).fill(0);
    const weeklyCounts = new Array(7).fill(0);

    this.history.forEach(event => {
      const dayOfWeek = new Date(event.timestamp).getDay();
      weeklyTotals[dayOfWeek] += event.kg;
      weeklyCounts[dayOfWeek]++;
    });

    const weeklyAverages = weeklyTotals.map((total, i) => 
      weeklyCounts[i] > 0 ? total / weeklyCounts[i] : 0
    );

    const overallAverage = weeklyAverages.reduce((sum, avg) => sum + avg, 0) / 7;
    
    // Return as multipliers relative to overall average
    return weeklyAverages.map(avg => 
      overallAverage > 0 ? avg / overallAverage : 1.0
    );
  }

  private calculateSeasonalTrends(): Record<string, number> {
    const seasonalTotals = { winter: 0, spring: 0, summer: 0, fall: 0 };
    const seasonalCounts = { winter: 0, spring: 0, summer: 0, fall: 0 };

    this.history.forEach(event => {
      const month = new Date(event.timestamp).getMonth();
      const season = this.getSeason(month);
      seasonalTotals[season] += event.kg;
      seasonalCounts[season]++;
    });

    const seasonalAverages = Object.keys(seasonalTotals).reduce((acc, season) => {
      const count = seasonalCounts[season as keyof typeof seasonalCounts];
      acc[season] = count > 0 ? seasonalTotals[season as keyof typeof seasonalTotals] / count : 0;
      return acc;
    }, {} as Record<string, number>);

    const overallAverage = Object.values(seasonalAverages).reduce((sum, avg) => sum + avg, 0) / 4;
    
    // Return as multipliers
    return Object.keys(seasonalAverages).reduce((acc, season) => {
      acc[season] = overallAverage > 0 ? seasonalAverages[season] / overallAverage : 1.0;
      return acc;
    }, {} as Record<string, number>);
  }

  private getSeason(month: number): string {
    if (month >= 11 || month <= 1) return 'winter';
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    return 'fall';
  }

  private calculateCategoryBreakdown(): Record<string, number> {
    const categoryTotals = { transport: 0, shopping: 0, energy: 0, food: 0 };
    
    this.history.forEach(event => {
      const category = this.categorizeEvent(event);
      categoryTotals[category] += event.kg;
    });

    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    
    if (total === 0) {
      return { transport: 0.4, shopping: 0.3, energy: 0.2, food: 0.1 };
    }

    return Object.keys(categoryTotals).reduce((acc, category) => {
      acc[category] = categoryTotals[category as keyof typeof categoryTotals] / total;
      return acc;
    }, {} as Record<string, number>);
  }

  private categorizeEvent(event: CarbonEvent): string {
    if (event.type === 'travel') return 'transport';
    if (event.type === 'product') {
      const category = event.metadata?.category?.toLowerCase() || '';
      if (category.includes('food') || category.includes('grocery')) return 'food';
      return 'shopping';
    }
    if (event.type === 'energy') return 'energy';
    return 'shopping'; // Default
  }

  private calculateTimeOfDayPattern(): number[] {
    const hourlyTotals = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    this.history.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyTotals[hour] += event.kg;
      hourlyCounts[hour]++;
    });

    const hourlyAverages = hourlyTotals.map((total, i) => 
      hourlyCounts[i] > 0 ? total / hourlyCounts[i] : 0
    );

    const overallAverage = hourlyAverages.reduce((sum, avg) => sum + avg, 0) / 24;
    
    return hourlyAverages.map(avg => 
      overallAverage > 0 ? avg / overallAverage : 1.0
    );
  }

  private calculateInterventionEffectiveness(): number {
    const interventions = this.history.filter(e => 
      e.type === 'predictive_intervention' || e.type === 'delay_completed'
    );
    
    if (interventions.length === 0) return 0.3; // Default 30%

    const totalSaved = interventions.reduce((sum, event) => sum + event.kg, 0);
    const totalPotential = interventions.length * this.patterns?.dailyAverage || 2.5;
    
    return totalPotential > 0 ? Math.min(totalSaved / totalPotential, 0.8) : 0.3;
  }

  predictFutureEmissions(days: number = 14): Prediction[] {
    if (!this.patterns) {
      this.analyzePatterns();
    }

    const predictions: Prediction[] = [];
    const baseDate = new Date();

    for (let day = 1; day <= days; day++) {
      const predictionDate = new Date(baseDate);
      predictionDate.setDate(predictionDate.getDate() + day);
      
      const prediction = this.generateDayPrediction(predictionDate, day);
      predictions.push(prediction);
    }

    return predictions;
  }

  private generateDayPrediction(date: Date, dayOffset: number): Prediction {
    const patterns = this.patterns || this.getDefaultPatterns();
    
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    const season = this.getSeason(month);
    
    // Base prediction
    let predictedKg = patterns.dailyAverage;
    
    // Apply weekly pattern
    predictedKg *= patterns.weeklyPattern[dayOfWeek] || 1.0;
    
    // Apply seasonal trend
    predictedKg *= patterns.seasonalTrends[season] || 1.0;
    
    // Add some randomness for realism
    const randomFactor = 0.8 + (Math.random() * 0.4); // ±20% variation
    predictedKg *= randomFactor;
    
    // Apply intervention effectiveness
    const interventionReduction = predictedKg * patterns.interventionEffectiveness;
    const finalPrediction = Math.max(0.5, predictedKg - interventionReduction);
    
    // Calculate confidence (decreases with distance)
    const confidence = Math.max(0.3, 0.9 - (dayOffset * 0.05));
    
    // Generate breakdown
    const breakdown = {
      transport: finalPrediction * patterns.categoryBreakdown.transport,
      shopping: finalPrediction * patterns.categoryBreakdown.shopping,
      energy: finalPrediction * patterns.categoryBreakdown.energy,
      food: finalPrediction * patterns.categoryBreakdown.food
    };

    // Generate intervention opportunities
    const interventionOpportunities = this.generateInterventionOpportunities(finalPrediction, breakdown);
    
    // Generate prediction factors
    const factors = this.generatePredictionFactors(patterns, dayOfWeek, season);

    return {
      date: date.toISOString().split('T')[0],
      predictedKg: Math.round(finalPrediction * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      breakdown,
      interventionOpportunities,
      factors
    };
  }

  private generateInterventionOpportunities(totalKg: number, breakdown: any): InterventionOpportunity[] {
    const opportunities: InterventionOpportunity[] = [];

    if (breakdown.shopping > 1.0) {
      opportunities.push({
        type: 'delay_purchase',
        description: 'Consider delaying non-essential purchases by 24 hours',
        potentialSaving: breakdown.shopping * 0.4,
        effort: 'low',
        confidence: 0.8
      });
    }

    if (breakdown.transport > 1.5) {
      opportunities.push({
        type: 'alternative_transport',
        description: 'Use public transport or bike for short trips',
        potentialSaving: breakdown.transport * 0.6,
        effort: 'medium',
        confidence: 0.7
      });
    }

    if (breakdown.energy > 0.8) {
      opportunities.push({
        type: 'energy_timing',
        description: 'Schedule energy-intensive tasks during clean grid hours',
        potentialSaving: breakdown.energy * 0.3,
        effort: 'low',
        confidence: 0.9
      });
    }

    return opportunities;
  }

  private generatePredictionFactors(patterns: BehaviorPatterns, dayOfWeek: number, season: string): PredictionFactor[] {
    const factors: PredictionFactor[] = [];

    const weeklyMultiplier = patterns.weeklyPattern[dayOfWeek];
    if (weeklyMultiplier > 1.1) {
      factors.push({
        name: 'High Activity Day',
        impact: (weeklyMultiplier - 1) * 100,
        description: 'Historically higher emissions on this day of week'
      });
    }

    const seasonalMultiplier = patterns.seasonalTrends[season];
    if (seasonalMultiplier > 1.1) {
      factors.push({
        name: 'Seasonal Increase',
        impact: (seasonalMultiplier - 1) * 100,
        description: `${season} typically shows higher emissions`
      });
    }

    if (patterns.interventionEffectiveness > 0.4) {
      factors.push({
        name: 'AI Interventions',
        impact: -patterns.interventionEffectiveness * 100,
        description: 'Smart nudges and delays reducing predicted emissions'
      });
    }

    return factors;
  }

  getDataQuality(): { score: number; description: string; recommendations: string[] } {
    const dataPoints = this.history.length;
    const daysCovered = this.getDaysCovered();
    
    let score = 0;
    const recommendations: string[] = [];
    
    if (daysCovered >= 14) score += 40;
    else if (daysCovered >= 7) score += 25;
    else recommendations.push('Use extension for at least 7 days for better predictions');
    
    if (dataPoints >= 50) score += 30;
    else if (dataPoints >= 20) score += 20;
    else recommendations.push('More browsing activity will improve prediction accuracy');
    
    const categoryDiversity = Object.values(this.patterns?.categoryBreakdown || {}).filter(v => v > 0.05).length;
    if (categoryDiversity >= 3) score += 20;
    else recommendations.push('Diverse activity types improve prediction quality');
    
    score += Math.min(10, dataPoints / 10); // Bonus for more data
    
    let description = 'Poor';
    if (score >= 80) description = 'Excellent';
    else if (score >= 60) description = 'Good';
    else if (score >= 40) description = 'Fair';
    
    return { score: Math.min(100, score), description, recommendations };
  }

  private getDaysCovered(): number {
    if (this.history.length === 0) return 0;
    
    const firstEvent = this.history[0].timestamp;
    const lastEvent = this.history[this.history.length - 1].timestamp;
    
    return Math.ceil((lastEvent - firstEvent) / (24 * 60 * 60 * 1000));
  }

  getPatterns(): BehaviorPatterns | null {
    return this.patterns;
  }

  hasEnoughData(): boolean {
    return this.getDaysCovered() >= this.minDataPoints;
  }
}
