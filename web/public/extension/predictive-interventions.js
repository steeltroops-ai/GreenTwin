// Predictive Intervention Triggers System
class PredictiveInterventions {
  constructor() {
    this.behaviorPatterns = this.loadBehaviorPatterns();
    this.sessionData = {
      sitesVisited: [],
      timeSpent: 0,
      searchQueries: [],
      startTime: Date.now()
    };
    this.interventionTriggers = this.initializeTriggers();
    this.confidenceThreshold = 0.7;
  }

  loadBehaviorPatterns() {
    // Load from storage or initialize with defaults
    return {
      shoppingPatterns: {
        averageSessionTime: 15 * 60 * 1000, // 15 minutes
        commonSites: ['amazon.com', 'ebay.com', 'walmart.com'],
        purchaseIndicators: ['add to cart', 'buy now', 'checkout', 'purchase']
      },
      travelPatterns: {
        averageSessionTime: 20 * 60 * 1000, // 20 minutes
        commonSites: ['google.com/travel', 'expedia.com', 'booking.com', 'kayak.com'],
        bookingIndicators: ['book now', 'reserve', 'confirm booking', 'payment']
      },
      foodPatterns: {
        averageSessionTime: 5 * 60 * 1000, // 5 minutes
        commonSites: ['ubereats.com', 'doordash.com', 'grubhub.com'],
        orderIndicators: ['add to cart', 'place order', 'checkout']
      }
    };
  }

  initializeTriggers() {
    return [
      {
        id: 'multiple_shopping_sites',
        pattern: (session) => this.detectMultipleShoppingSites(session),
        probability: 0.8,
        action: 'purchase',
        category: 'shopping',
        intervention: 'shopping_delay_suggestion'
      },
      {
        id: 'flight_search_terms',
        pattern: (session) => this.detectFlightSearchTerms(session),
        probability: 0.9,
        action: 'travel_booking',
        category: 'travel',
        intervention: 'travel_alternatives'
      },
      {
        id: 'food_delivery_sites',
        pattern: (session) => this.detectFoodDeliverySites(session),
        probability: 0.7,
        action: 'food_order',
        category: 'food',
        intervention: 'sustainable_food_options'
      },
      {
        id: 'high_value_shopping',
        pattern: (session) => this.detectHighValueShopping(session),
        probability: 0.85,
        action: 'expensive_purchase',
        category: 'shopping',
        intervention: 'purchase_delay_mandatory'
      },
      {
        id: 'repeated_product_views',
        pattern: (session) => this.detectRepeatedProductViews(session),
        probability: 0.75,
        action: 'purchase_consideration',
        category: 'shopping',
        intervention: 'alternatives_suggestion'
      }
    ];
  }

  trackPageVisit(url, title, timeSpent = 0) {
    this.sessionData.sitesVisited.push({
      url,
      title,
      timeSpent,
      timestamp: Date.now()
    });
    this.sessionData.timeSpent += timeSpent;
    
    // Analyze current session for predictive triggers
    this.analyzeCurrentSession();
  }

  trackSearchQuery(query) {
    this.sessionData.searchQueries.push({
      query: query.toLowerCase(),
      timestamp: Date.now()
    });
    
    // Analyze search patterns
    this.analyzeCurrentSession();
  }

  analyzeCurrentSession() {
    const predictions = [];
    
    for (const trigger of this.interventionTriggers) {
      if (trigger.pattern(this.sessionData)) {
        const confidence = this.calculateConfidence(trigger, this.sessionData);
        
        if (confidence >= this.confidenceThreshold) {
          predictions.push({
            triggerId: trigger.id,
            action: trigger.action,
            category: trigger.category,
            confidence,
            intervention: trigger.intervention,
            context: this.getContextForTrigger(trigger)
          });
        }
      }
    }
    
    // Execute interventions for high-confidence predictions
    predictions.forEach(prediction => {
      this.executeIntervention(prediction);
    });
    
    return predictions;
  }

  detectMultipleShoppingSites(session) {
    const shoppingSites = session.sitesVisited.filter(site => 
      this.behaviorPatterns.shoppingPatterns.commonSites.some(shopSite => 
        site.url.includes(shopSite)
      )
    );
    
    return shoppingSites.length >= 2;
  }

  detectFlightSearchTerms(session) {
    const flightKeywords = ['flight', 'flights', 'airline', 'airport', 'travel', 'trip', 'vacation'];
    const travelSites = session.sitesVisited.filter(site => 
      this.behaviorPatterns.travelPatterns.commonSites.some(travelSite => 
        site.url.includes(travelSite)
      )
    );
    
    const hasFlightQueries = session.searchQueries.some(query => 
      flightKeywords.some(keyword => query.query.includes(keyword))
    );
    
    return travelSites.length > 0 || hasFlightQueries;
  }

  detectFoodDeliverySites(session) {
    const foodSites = session.sitesVisited.filter(site => 
      this.behaviorPatterns.foodPatterns.commonSites.some(foodSite => 
        site.url.includes(foodSite)
      )
    );
    
    return foodSites.length > 0;
  }

  detectHighValueShopping(session) {
    const recentSites = session.sitesVisited.filter(site => 
      Date.now() - site.timestamp < 30 * 60 * 1000 // Last 30 minutes
    );
    
    const highValueIndicators = ['expensive', 'premium', 'luxury', 'professional', 'electronics'];
    
    return recentSites.some(site => 
      highValueIndicators.some(indicator => 
        site.title.toLowerCase().includes(indicator)
      )
    );
  }

  detectRepeatedProductViews(session) {
    const productPages = session.sitesVisited.filter(site => 
      site.url.includes('amazon.com') && site.url.includes('/dp/')
    );
    
    // Check for repeated views of similar products
    const productIds = productPages.map(page => {
      const match = page.url.match(/\/dp\/([A-Z0-9]+)/);
      return match ? match[1] : null;
    }).filter(Boolean);
    
    return productIds.length > 1;
  }

  calculateConfidence(trigger, session) {
    let confidence = trigger.probability;
    
    // Adjust based on session duration
    const sessionDuration = Date.now() - session.startTime;
    const expectedDuration = this.behaviorPatterns[trigger.category + 'Patterns']?.averageSessionTime || 10 * 60 * 1000;
    
    if (sessionDuration > expectedDuration * 0.5) {
      confidence *= 1.2; // Increase confidence for longer sessions
    }
    
    // Adjust based on number of relevant sites visited
    const relevantSites = session.sitesVisited.filter(site => 
      this.isRelevantSite(site.url, trigger.category)
    ).length;
    
    if (relevantSites > 2) {
      confidence *= 1.1;
    }
    
    // Adjust based on time of day (people shop more in evenings)
    const hour = new Date().getHours();
    if (trigger.category === 'shopping' && (hour >= 19 && hour <= 22)) {
      confidence *= 1.15;
    }
    
    return Math.min(1.0, confidence);
  }

  isRelevantSite(url, category) {
    const patterns = this.behaviorPatterns[category + 'Patterns'];
    if (!patterns) return false;
    
    return patterns.commonSites.some(site => url.includes(site));
  }

  getContextForTrigger(trigger) {
    return {
      sessionDuration: Date.now() - this.sessionData.startTime,
      sitesVisited: this.sessionData.sitesVisited.length,
      searchQueries: this.sessionData.searchQueries.length,
      category: trigger.category,
      triggerId: trigger.id
    };
  }

  executeIntervention(prediction) {
    console.log(`Green Twin: Executing intervention for ${prediction.action} (confidence: ${prediction.confidence})`);
    
    switch (prediction.intervention) {
      case 'shopping_delay_suggestion':
        this.showShoppingDelayIntervention(prediction);
        break;
      case 'travel_alternatives':
        this.showTravelAlternativesIntervention(prediction);
        break;
      case 'sustainable_food_options':
        this.showSustainableFoodIntervention(prediction);
        break;
      case 'purchase_delay_mandatory':
        this.showMandatoryDelayIntervention(prediction);
        break;
      case 'alternatives_suggestion':
        this.showAlternativesSuggestion(prediction);
        break;
    }
    
    // Track intervention execution
    this.trackInterventionExecution(prediction);
  }

  showShoppingDelayIntervention(prediction) {
    this.injectProactiveNudge(`
      <div style="position:fixed; top:20px; right:20px; z-index:10000; background:#10b981; color:white; padding:16px; border-radius:12px; box-shadow:0 8px 25px rgba(0,0,0,0.15); max-width:300px;">
        <div style="font-weight:600; margin-bottom:8px;">🤖 AI Prediction Alert</div>
        <div style="font-size:14px; margin-bottom:12px;">I predict you're about to make a purchase. Consider waiting 24 hours to reduce impulse buying and carbon impact!</div>
        <div style="display:flex; gap:8px;">
          <button onclick="this.parentElement.parentElement.remove()" style="flex:1; padding:6px 12px; background:rgba(255,255,255,0.2); border:none; border-radius:6px; color:white; font-size:12px;">Maybe Later</button>
          <button onclick="this.parentElement.parentElement.remove()" style="padding:6px 12px; background:rgba(255,255,255,0.9); border:none; border-radius:6px; color:#10b981; font-size:12px;">Got It!</button>
        </div>
      </div>
    `);
  }

  showTravelAlternativesIntervention(prediction) {
    this.injectProactiveNudge(`
      <div style="position:fixed; top:20px; right:20px; z-index:10000; background:#3b82f6; color:white; padding:16px; border-radius:12px; box-shadow:0 8px 25px rgba(0,0,0,0.15); max-width:300px;">
        <div style="font-weight:600; margin-bottom:8px;">✈️ Travel Impact Alert</div>
        <div style="font-size:14px; margin-bottom:12px;">Planning a trip? Consider train/bus for shorter distances or direct flights to minimize your carbon footprint!</div>
        <div style="display:flex; gap:8px;">
          <button onclick="this.parentElement.parentElement.remove()" style="flex:1; padding:6px 12px; background:rgba(255,255,255,0.2); border:none; border-radius:6px; color:white; font-size:12px;">Show Alternatives</button>
          <button onclick="this.parentElement.parentElement.remove()" style="padding:6px 12px; background:rgba(255,255,255,0.9); border:none; border-radius:6px; color:#3b82f6; font-size:12px;">Dismiss</button>
        </div>
      </div>
    `);
  }

  showMandatoryDelayIntervention(prediction) {
    this.injectProactiveNudge(`
      <div style="position:fixed; top:20px; right:20px; z-index:10000; background:#ef4444; color:white; padding:16px; border-radius:12px; box-shadow:0 8px 25px rgba(0,0,0,0.15); max-width:300px;">
        <div style="font-weight:600; margin-bottom:8px;">🚨 High-Impact Purchase Detected</div>
        <div style="font-size:14px; margin-bottom:12px;">This appears to be a high-value purchase. I strongly recommend a 24-hour cooling-off period to consider alternatives.</div>
        <div style="display:flex; gap:8px;">
          <button onclick="this.parentElement.parentElement.remove()" style="flex:1; padding:6px 12px; background:#dc2626; border:none; border-radius:6px; color:white; font-size:12px;">Delay Purchase</button>
          <button onclick="this.parentElement.parentElement.remove()" style="padding:6px 12px; background:rgba(255,255,255,0.9); border:none; border-radius:6px; color:#ef4444; font-size:12px;">Continue</button>
        </div>
      </div>
    `);
  }

  injectProactiveNudge(html) {
    // Remove any existing proactive nudges
    document.querySelectorAll('[data-gt-proactive]').forEach(el => el.remove());
    
    const nudgeEl = document.createElement('div');
    nudgeEl.setAttribute('data-gt-proactive', 'true');
    nudgeEl.innerHTML = html;
    document.body.appendChild(nudgeEl);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      nudgeEl.remove();
    }, 10000);
  }

  trackInterventionExecution(prediction) {
    chrome.runtime.sendMessage({
      type: 'track_predictive_intervention',
      payload: {
        triggerId: prediction.triggerId,
        action: prediction.action,
        confidence: prediction.confidence,
        context: prediction.context,
        timestamp: Date.now()
      }
    });
  }

  // Reset session data (call when user navigates away or after long inactivity)
  resetSession() {
    this.sessionData = {
      sitesVisited: [],
      timeSpent: 0,
      searchQueries: [],
      startTime: Date.now()
    };
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PredictiveInterventions;
} else {
  window.PredictiveInterventions = PredictiveInterventions;
}
