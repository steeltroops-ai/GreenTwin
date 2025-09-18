import { ToolRecommendation, ChatMessage } from "./types";
import { geminiClient } from "./client";

export class ToolRecommendationService {
  
  // Comprehensive database of environmental tools and resources
  private readonly toolDatabase: ToolRecommendation[] = [
    // Carbon Tracking Tools
    {
      toolName: "Carbon Footprint Calculator",
      description: "Comprehensive personal carbon footprint calculator with detailed breakdowns",
      relevanceScore: 0,
      category: "carbon_tracking",
      estimatedImpact: {
        carbonSavings: 0,
        costSavings: 0,
        timeInvestment: 30,
      },
      actionSteps: [
        "Visit EPA's carbon footprint calculator",
        "Input your energy, transportation, and consumption data",
        "Review your baseline footprint",
        "Identify top reduction opportunities",
        "Set monthly tracking reminders"
      ],
    },
    {
      toolName: "Smart Home Energy Monitor",
      description: "Real-time energy monitoring system to track and optimize home electricity usage",
      relevanceScore: 0,
      category: "energy_efficiency",
      estimatedImpact: {
        carbonSavings: 500,
        costSavings: 200,
        timeInvestment: 120,
      },
      actionSteps: [
        "Research compatible smart meters (Sense, Emporia Vue)",
        "Install energy monitoring hardware",
        "Set up mobile app and alerts",
        "Identify energy-hungry appliances",
        "Create automated energy-saving schedules"
      ],
    },
    {
      toolName: "LED Bulb Replacement Program",
      description: "Systematic replacement of incandescent bulbs with energy-efficient LEDs",
      relevanceScore: 0,
      category: "energy_efficiency",
      estimatedImpact: {
        carbonSavings: 200,
        costSavings: 150,
        timeInvestment: 60,
      },
      actionSteps: [
        "Audit current lighting throughout home",
        "Calculate potential savings with LED calculator",
        "Purchase ENERGY STAR certified LED bulbs",
        "Replace bulbs room by room",
        "Track energy bill changes over 3 months"
      ],
    },
    {
      toolName: "Public Transit Apps",
      description: "Mobile apps for optimizing public transportation routes and schedules",
      relevanceScore: 0,
      category: "transportation",
      estimatedImpact: {
        carbonSavings: 1200,
        costSavings: 800,
        timeInvestment: 15,
      },
      actionSteps: [
        "Download local transit apps (Transit, Citymapper)",
        "Set up home and work locations",
        "Enable real-time notifications",
        "Plan weekly commute alternatives",
        "Track monthly transportation savings"
      ],
    },
    {
      toolName: "Bike Share Membership",
      description: "Access to city-wide bike sharing network for short trips and commuting",
      relevanceScore: 0,
      category: "transportation",
      estimatedImpact: {
        carbonSavings: 800,
        costSavings: 400,
        timeInvestment: 30,
      },
      actionSteps: [
        "Research local bike share programs",
        "Sign up for monthly or annual membership",
        "Download bike share app",
        "Plan bike-friendly routes to common destinations",
        "Start with 2-3 bike trips per week"
      ],
    },
    {
      toolName: "Plant-Based Meal Planning App",
      description: "Meal planning and recipe apps focused on plant-based, low-carbon meals",
      relevanceScore: 0,
      category: "diet",
      estimatedImpact: {
        carbonSavings: 1500,
        costSavings: 300,
        timeInvestment: 45,
      },
      actionSteps: [
        "Download meal planning apps (PlantJammer, Forks Over Knives)",
        "Set dietary preferences and restrictions",
        "Plan 3-4 plant-based meals per week",
        "Generate shopping lists automatically",
        "Track carbon savings from dietary changes"
      ],
    },
    {
      toolName: "Sustainable Shopping Browser Extension",
      description: "Browser extension that suggests eco-friendly alternatives while shopping online",
      relevanceScore: 0,
      category: "shopping",
      estimatedImpact: {
        carbonSavings: 300,
        costSavings: 100,
        timeInvestment: 10,
      },
      actionSteps: [
        "Install browser extensions (HoneyComb, Buycott)",
        "Set sustainability preferences",
        "Enable product impact notifications",
        "Review alternative suggestions before purchases",
        "Track sustainable purchase decisions"
      ],
    },
    {
      toolName: "Home Insulation Assessment",
      description: "Professional energy audit to identify insulation and weatherization opportunities",
      relevanceScore: 0,
      category: "energy_efficiency",
      estimatedImpact: {
        carbonSavings: 2000,
        costSavings: 600,
        timeInvestment: 240,
      },
      actionSteps: [
        "Schedule professional energy audit",
        "Review audit report and recommendations",
        "Prioritize improvements by cost-effectiveness",
        "Get quotes for insulation and weatherization",
        "Apply for energy efficiency rebates and incentives"
      ],
    },
  ];

  // Generate tool recommendations based on conversation context
  async generateRecommendations(
    messages: ChatMessage[],
    userId: string,
    maxRecommendations: number = 3
  ): Promise<ToolRecommendation[]> {
    try {
      // Analyze conversation context
      const context = this.analyzeConversationContext(messages);
      
      // Score tools based on relevance
      const scoredTools = this.scoreToolRelevance(context);
      
      // Use AI to enhance recommendations with personalized insights
      const enhancedTools = await this.enhanceWithAI(scoredTools, context, userId);
      
      // Return top recommendations
      return enhancedTools
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxRecommendations);
        
    } catch (error) {
      console.error("Tool recommendation error:", error);
      return this.getFallbackRecommendations();
    }
  }

  // Analyze conversation to extract context for tool recommendations
  private analyzeConversationContext(messages: ChatMessage[]): {
    topics: string[];
    userGoals: string[];
    constraints: string[];
    urgency: "low" | "medium" | "high";
  } {
    const allContent = messages
      .filter(m => m.role === "user")
      .map(m => m.content.toLowerCase())
      .join(" ");

    // Extract topics
    const topics = this.extractTopics(allContent);
    
    // Extract user goals
    const userGoals = this.extractUserGoals(allContent);
    
    // Extract constraints
    const constraints = this.extractConstraints(allContent);
    
    // Determine urgency
    const urgency = this.determineUrgency(allContent);

    return { topics, userGoals, constraints, urgency };
  }

  private extractTopics(content: string): string[] {
    const topicKeywords = {
      energy: ["energy", "electricity", "power", "heating", "cooling"],
      transportation: ["car", "drive", "commute", "transport", "travel"],
      diet: ["food", "eat", "meat", "diet", "meal"],
      shopping: ["buy", "purchase", "product", "shopping"],
      home: ["home", "house", "insulation", "appliance"],
    };

    const topics: string[] = [];
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private extractUserGoals(content: string): string[] {
    const goals: string[] = [];
    
    if (content.includes("reduce") || content.includes("lower")) {
      goals.push("reduce_emissions");
    }
    if (content.includes("save money") || content.includes("cost")) {
      goals.push("save_money");
    }
    if (content.includes("quick") || content.includes("easy")) {
      goals.push("quick_wins");
    }
    if (content.includes("long term") || content.includes("investment")) {
      goals.push("long_term_impact");
    }

    return goals;
  }

  private extractConstraints(content: string): string[] {
    const constraints: string[] = [];
    
    if (content.includes("budget") || content.includes("expensive") || content.includes("cheap")) {
      constraints.push("budget_conscious");
    }
    if (content.includes("time") || content.includes("busy")) {
      constraints.push("time_limited");
    }
    if (content.includes("rent") || content.includes("apartment")) {
      constraints.push("rental_property");
    }

    return constraints;
  }

  private determineUrgency(content: string): "low" | "medium" | "high" {
    if (content.includes("urgent") || content.includes("asap") || content.includes("immediately")) {
      return "high";
    }
    if (content.includes("soon") || content.includes("this month")) {
      return "medium";
    }
    return "low";
  }

  // Score tools based on conversation context
  private scoreToolRelevance(context: {
    topics: string[];
    userGoals: string[];
    constraints: string[];
    urgency: "low" | "medium" | "high";
  }): ToolRecommendation[] {
    return this.toolDatabase.map(tool => {
      let score = 0;

      // Topic relevance (40% of score)
      const topicMatch = context.topics.some(topic => 
        tool.category.includes(topic) || 
        tool.description.toLowerCase().includes(topic)
      );
      if (topicMatch) score += 40;

      // Goal alignment (30% of score)
      if (context.userGoals.includes("reduce_emissions") && tool.estimatedImpact.carbonSavings > 500) {
        score += 15;
      }
      if (context.userGoals.includes("save_money") && tool.estimatedImpact.costSavings > 100) {
        score += 15;
      }
      if (context.userGoals.includes("quick_wins") && tool.estimatedImpact.timeInvestment < 60) {
        score += 15;
      }

      // Constraint consideration (20% of score)
      if (context.constraints.includes("budget_conscious") && tool.estimatedImpact.costSavings > 0) {
        score += 10;
      }
      if (context.constraints.includes("time_limited") && tool.estimatedImpact.timeInvestment < 30) {
        score += 10;
      }

      // Urgency factor (10% of score)
      if (context.urgency === "high" && tool.estimatedImpact.timeInvestment < 30) {
        score += 10;
      }

      return {
        ...tool,
        relevanceScore: Math.min(score, 100),
      };
    });
  }

  // Use AI to enhance tool recommendations with personalized insights
  private async enhanceWithAI(
    tools: ToolRecommendation[],
    context: any,
    userId: string
  ): Promise<ToolRecommendation[]> {
    try {
      const topTools = tools.filter(t => t.relevanceScore > 30).slice(0, 5);
      
      const enhancementPrompt = `As an environmental coach, provide personalized insights for these sustainability tools based on the user's context:

User Context: ${JSON.stringify(context, null, 2)}

Tools to enhance:
${topTools.map((tool, i) => `${i + 1}. ${tool.toolName}: ${tool.description}`).join('\n')}

For each tool, provide:
1. Personalized relevance explanation (2-3 sentences)
2. Specific implementation tips for this user
3. Potential challenges and how to overcome them

Keep responses concise and actionable.`;

      const enhancementMessage: ChatMessage = {
        id: `enhancement_${Date.now()}`,
        role: "user",
        content: enhancementPrompt,
        timestamp: Date.now(),
        userId,
        conversationId: `enhancement_${Date.now()}`,
      };

      const response = await geminiClient.generateResponse(
        [enhancementMessage],
        userId,
        { temperature: 0.7, maxTokens: 2048 }
      );

      // Parse AI response and enhance tools (simplified implementation)
      return this.parseEnhancementResponse(topTools, response.content);
      
    } catch (error) {
      console.error("AI enhancement error:", error);
      return tools;
    }
  }

  private parseEnhancementResponse(
    tools: ToolRecommendation[],
    aiResponse: string
  ): ToolRecommendation[] {
    // Simplified parsing - in production, use more sophisticated NLP
    const sections = aiResponse.split(/\d+\./);
    
    return tools.map((tool, index) => {
      const section = sections[index + 1];
      if (section) {
        // Extract enhanced action steps from AI response
        const lines = section.split('\n').filter(line => line.trim());
        const enhancedSteps = lines.slice(1, 4).map(line => line.trim());
        
        if (enhancedSteps.length > 0) {
          return {
            ...tool,
            actionSteps: [...tool.actionSteps, ...enhancedSteps].slice(0, 7),
          };
        }
      }
      return tool;
    });
  }

  // Get fallback recommendations when AI enhancement fails
  private getFallbackRecommendations(): ToolRecommendation[] {
    return this.toolDatabase
      .sort((a, b) => b.estimatedImpact.carbonSavings - a.estimatedImpact.carbonSavings)
      .slice(0, 3)
      .map(tool => ({ ...tool, relevanceScore: 75 }));
  }

  // Get tools by category
  getToolsByCategory(category: ToolRecommendation['category']): ToolRecommendation[] {
    return this.toolDatabase
      .filter(tool => tool.category === category)
      .map(tool => ({ ...tool, relevanceScore: 80 }));
  }

  // Search tools by keyword
  searchTools(query: string): ToolRecommendation[] {
    const lowercaseQuery = query.toLowerCase();
    
    return this.toolDatabase
      .filter(tool => 
        tool.toolName.toLowerCase().includes(lowercaseQuery) ||
        tool.description.toLowerCase().includes(lowercaseQuery) ||
        tool.actionSteps.some(step => step.toLowerCase().includes(lowercaseQuery))
      )
      .map(tool => ({ ...tool, relevanceScore: 70 }))
      .sort((a, b) => b.estimatedImpact.carbonSavings - a.estimatedImpact.carbonSavings);
  }

  // Generate tool recommendation summary
  generateRecommendationSummary(recommendations: ToolRecommendation[]): string {
    if (recommendations.length === 0) return "No tool recommendations available.";

    const totalCarbonSavings = recommendations.reduce((sum, tool) => sum + tool.estimatedImpact.carbonSavings, 0);
    const totalCostSavings = recommendations.reduce((sum, tool) => sum + tool.estimatedImpact.costSavings, 0);
    const totalTimeInvestment = recommendations.reduce((sum, tool) => sum + tool.estimatedImpact.timeInvestment, 0);

    return `Tool Recommendations Summary:
• ${recommendations.length} tools recommended
• Potential CO₂ savings: ${totalCarbonSavings.toFixed(1)} kg/year
• Potential cost savings: $${totalCostSavings}/year
• Total time investment: ${Math.round(totalTimeInvestment / 60)} hours
• Top category: ${recommendations[0]?.category.replace('_', ' ')}`;
  }
}

// Singleton instance
export const toolRecommender = new ToolRecommendationService();
