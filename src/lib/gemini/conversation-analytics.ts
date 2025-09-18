import { ChatMessage, Conversation, ConversationAnalytics } from "./types";

export class ConversationAnalyticsService {
  
  // Analyze conversation to extract insights and metrics
  analyzeConversation(conversation: Conversation): ConversationAnalytics {
    const messages = conversation.messages;
    const userMessages = messages.filter(m => m.role === "user");
    const assistantMessages = messages.filter(m => m.role === "assistant");
    
    // Calculate basic metrics
    const duration = conversation.updatedAt - conversation.createdAt;
    const messageCount = messages.length;
    const userEngagement = this.calculateEngagementScore(messages);
    
    // Extract topics discussed
    const topicsDiscussed = this.extractTopics(messages);
    
    // Calculate carbon savings identified
    const carbonSavingsIdentified = this.extractCarbonSavings(assistantMessages);
    
    // Count fact checks performed
    const factChecksPerformed = assistantMessages.filter(
      m => m.metadata?.factChecked
    ).length;
    
    // Count tools recommended
    const toolsRecommended = this.extractToolsRecommended(assistantMessages);
    
    // Analyze primary intent
    const primaryIntent = this.analyzePrimaryIntent(userMessages);
    
    // Identify knowledge gaps
    const knowledgeGaps = this.identifyKnowledgeGaps(messages);
    
    // Generate follow-up recommendations
    const recommendedFollowUp = this.generateFollowUpRecommendations(
      topicsDiscussed,
      primaryIntent
    );
    
    // Identify behavior change opportunities
    const behaviorChangeOpportunities = this.identifyBehaviorChangeOpportunities(
      messages
    );

    return {
      conversationId: conversation.id,
      userId: conversation.userId,
      metrics: {
        duration,
        messageCount,
        userEngagement,
        topicsDiscussed,
        carbonSavingsIdentified,
        factChecksPerformed,
        toolsRecommended: toolsRecommended.length,
      },
      insights: {
        primaryIntent,
        knowledgeGaps,
        recommendedFollowUp,
        behaviorChangeOpportunities,
      },
    };
  }

  // Calculate user engagement score based on message patterns
  private calculateEngagementScore(messages: ChatMessage[]): number {
    let score = 0;
    const userMessages = messages.filter(m => m.role === "user");
    
    // Base score from message count
    score += Math.min(userMessages.length * 10, 50);
    
    // Bonus for message length (indicates thoughtful responses)
    const avgMessageLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;
    if (avgMessageLength > 50) score += 20;
    if (avgMessageLength > 100) score += 10;
    
    // Bonus for follow-up questions
    const followUpQuestions = userMessages.filter(m => 
      m.content.includes("?") || 
      m.content.toLowerCase().includes("what about") ||
      m.content.toLowerCase().includes("how about")
    ).length;
    score += followUpQuestions * 5;
    
    // Bonus for specific requests
    const specificRequests = userMessages.filter(m =>
      m.content.toLowerCase().includes("calculate") ||
      m.content.toLowerCase().includes("analyze") ||
      m.content.toLowerCase().includes("compare")
    ).length;
    score += specificRequests * 10;
    
    return Math.min(score, 100);
  }

  // Extract environmental topics from conversation
  private extractTopics(messages: ChatMessage[]): string[] {
    const topics = new Set<string>();
    const content = messages.map(m => m.content.toLowerCase()).join(" ");
    
    const topicKeywords = {
      "carbon footprint": ["carbon", "footprint", "co2", "emissions"],
      "energy efficiency": ["energy", "electricity", "efficiency", "power"],
      "transportation": ["transport", "commute", "car", "bike", "public transit"],
      "diet": ["food", "diet", "meat", "vegetarian", "vegan"],
      "waste reduction": ["waste", "recycling", "plastic", "packaging"],
      "renewable energy": ["solar", "wind", "renewable", "clean energy"],
      "sustainable shopping": ["shopping", "products", "alternatives", "eco-friendly"],
      "home improvements": ["home", "house", "insulation", "heating", "cooling"],
      "climate science": ["climate", "global warming", "greenhouse", "ipcc"],
      "behavior change": ["habit", "routine", "lifestyle", "behavior"],
    };
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        topics.add(topic);
      }
    }
    
    return Array.from(topics);
  }

  // Extract carbon savings mentioned in assistant messages
  private extractCarbonSavings(assistantMessages: ChatMessage[]): number {
    let totalSavings = 0;
    
    for (const message of assistantMessages) {
      const matches = message.content.match(/(\d+\.?\d*)\s*kg\s*CO[₂2]e?/gi);
      if (matches) {
        for (const match of matches) {
          const value = parseFloat(match.match(/(\d+\.?\d*)/)?.[1] || "0");
          totalSavings += value;
        }
      }
    }
    
    return totalSavings;
  }

  // Extract tools and resources recommended
  private extractToolsRecommended(assistantMessages: ChatMessage[]): string[] {
    const tools = new Set<string>();
    
    for (const message of assistantMessages) {
      const content = message.content.toLowerCase();
      
      // Common environmental tools and apps
      const toolKeywords = [
        "carbon tracker", "energy monitor", "smart thermostat",
        "led bulbs", "solar panels", "electric vehicle",
        "bike sharing", "public transit app", "meal planning",
        "composting", "recycling app", "energy audit"
      ];
      
      for (const tool of toolKeywords) {
        if (content.includes(tool)) {
          tools.add(tool);
        }
      }
      
      // Extract from metadata if available
      if (message.metadata?.toolsUsed) {
        message.metadata.toolsUsed.forEach(tool => tools.add(tool));
      }
    }
    
    return Array.from(tools);
  }

  // Analyze the primary intent of the conversation
  private analyzePrimaryIntent(userMessages: ChatMessage[]): string {
    const allContent = userMessages.map(m => m.content.toLowerCase()).join(" ");
    
    const intentPatterns = {
      "carbon calculation": ["calculate", "footprint", "emissions", "co2"],
      "product analysis": ["product", "alternative", "compare", "better"],
      "myth busting": ["true", "false", "myth", "fact", "really"],
      "action planning": ["plan", "strategy", "goal", "reduce", "improve"],
      "education": ["learn", "understand", "explain", "how", "why"],
      "habit formation": ["habit", "routine", "daily", "change", "start"],
    };
    
    let maxScore = 0;
    let primaryIntent = "general inquiry";
    
    for (const [intent, keywords] of Object.entries(intentPatterns)) {
      const score = keywords.reduce((sum, keyword) => {
        const matches = (allContent.match(new RegExp(keyword, "g")) || []).length;
        return sum + matches;
      }, 0);
      
      if (score > maxScore) {
        maxScore = score;
        primaryIntent = intent;
      }
    }
    
    return primaryIntent;
  }

  // Identify knowledge gaps based on user questions
  private identifyKnowledgeGaps(messages: ChatMessage[]): string[] {
    const gaps = new Set<string>();
    const userMessages = messages.filter(m => m.role === "user");
    
    for (const message of userMessages) {
      const content = message.content.toLowerCase();
      
      // Common knowledge gap indicators
      if (content.includes("don't know") || content.includes("not sure")) {
        gaps.add("general uncertainty");
      }
      
      if (content.includes("how much") && content.includes("co2")) {
        gaps.add("carbon quantification");
      }
      
      if (content.includes("is it worth") || content.includes("cost")) {
        gaps.add("cost-benefit analysis");
      }
      
      if (content.includes("how to") || content.includes("where to")) {
        gaps.add("implementation guidance");
      }
      
      if (content.includes("really") || content.includes("actually")) {
        gaps.add("fact verification");
      }
    }
    
    return Array.from(gaps);
  }

  // Generate follow-up recommendations
  private generateFollowUpRecommendations(
    topics: string[],
    primaryIntent: string
  ): string[] {
    const recommendations = new Set<string>();
    
    // Intent-based recommendations
    const intentRecommendations = {
      "carbon calculation": [
        "Create a comprehensive carbon audit",
        "Set up regular footprint tracking",
        "Compare with national averages"
      ],
      "product analysis": [
        "Explore lifecycle assessments",
        "Research sustainable brands",
        "Calculate long-term cost savings"
      ],
      "action planning": [
        "Develop implementation timeline",
        "Set measurable goals",
        "Create accountability system"
      ],
    };
    
    if (intentRecommendations[primaryIntent as keyof typeof intentRecommendations]) {
      intentRecommendations[primaryIntent as keyof typeof intentRecommendations].forEach(rec => 
        recommendations.add(rec)
      );
    }
    
    // Topic-based recommendations
    if (topics.includes("transportation")) {
      recommendations.add("Explore local public transit options");
      recommendations.add("Calculate bike commute feasibility");
    }
    
    if (topics.includes("energy efficiency")) {
      recommendations.add("Schedule home energy audit");
      recommendations.add("Research renewable energy options");
    }
    
    if (topics.includes("diet")) {
      recommendations.add("Try plant-based meal planning");
      recommendations.add("Explore local sustainable food sources");
    }
    
    return Array.from(recommendations).slice(0, 5); // Limit to top 5
  }

  // Identify behavior change opportunities
  private identifyBehaviorChangeOpportunities(messages: ChatMessage[]): string[] {
    const opportunities = new Set<string>();
    const allContent = messages.map(m => m.content.toLowerCase()).join(" ");
    
    // Look for behavior change indicators
    const behaviorPatterns = {
      "transportation habits": ["drive", "car", "commute", "travel"],
      "energy consumption": ["electricity", "heating", "cooling", "lights"],
      "consumption patterns": ["buy", "purchase", "shopping", "products"],
      "waste generation": ["throw away", "garbage", "plastic", "packaging"],
      "dietary choices": ["eat", "food", "meat", "restaurant"],
    };
    
    for (const [opportunity, keywords] of Object.entries(behaviorPatterns)) {
      if (keywords.some(keyword => allContent.includes(keyword))) {
        opportunities.add(opportunity);
      }
    }
    
    return Array.from(opportunities);
  }

  // Generate conversation summary
  generateConversationSummary(conversation: Conversation): string {
    const analytics = this.analyzeConversation(conversation);
    const { metrics, insights } = analytics;
    
    return `Conversation Summary:
• Duration: ${Math.round(metrics.duration / 60000)} minutes
• Messages: ${metrics.messageCount}
• Topics: ${metrics.topicsDiscussed.join(", ")}
• Carbon Savings Discussed: ${metrics.carbonSavingsIdentified.toFixed(1)} kg CO₂e
• Primary Intent: ${insights.primaryIntent}
• Engagement Score: ${metrics.userEngagement}/100
• Follow-up Opportunities: ${insights.recommendedFollowUp.length}`;
  }
}

// Singleton instance
export const conversationAnalytics = new ConversationAnalyticsService();
