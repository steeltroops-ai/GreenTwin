import { geminiClient } from "./client";
import {
  ChatMessage,
  UserProfile,
  FactCheckResult,
  ToolRecommendation,
} from "./types";
import {
  SYSTEM_PROMPT,
  COACHING_PROMPTS,
  enhancePromptWithContext,
  generateContextualPrompt,
  getFollowUpQuestions,
} from "./prompts";

export class AICoachService {
  private readonly baseSystemPrompt = SYSTEM_PROMPT;

  async generateCoachResponse(
    messages: ChatMessage[],
    userId: string,
    userProfile?: UserProfile,
    options: {
      stream?: boolean;
      includeFactCheck?: boolean;
      includeToolRecommendations?: boolean;
    } = {}
  ): Promise<ChatMessage> {
    // Get the latest user message to determine context
    const latestUserMessage = messages.filter((m) => m.role === "user").pop();

    // Generate contextual prompt based on user input
    const contextualPrompt = latestUserMessage
      ? generateContextualPrompt(
          latestUserMessage.content,
          messages.map((m) => m.content)
        )
      : this.baseSystemPrompt;

    // Enhance prompt with user profile context
    const enhancedPrompt = userProfile
      ? enhancePromptWithContext(contextualPrompt, {
          location: userProfile.preferences?.location,
          lifestyle: userProfile.preferences?.lifestyle,
          carbonGoals: userProfile.preferences.carbonGoals,
          previousTopics: userProfile.history.topTopics,
          communicationStyle: userProfile.preferences.communicationStyle,
        })
      : contextualPrompt;

    // Add enhanced system context to messages
    const contextualMessages = this.addContextToMessages(
      messages,
      userProfile,
      enhancedPrompt
    );

    try {
      const response = await geminiClient.generateResponse(
        contextualMessages,
        userId,
        {
          temperature: 0.7,
          maxTokens: 8192,
        }
      );

      const coachMessage: ChatMessage = {
        id: this.generateMessageId(),
        role: "assistant",
        content: response.content,
        timestamp: Date.now(),
        userId,
        conversationId:
          messages[0]?.conversationId || this.generateConversationId(),
        metadata: {
          ...response.metadata,
          factChecked: options.includeFactCheck || false,
          toolsUsed: options.includeToolRecommendations ? ["gemini-ai"] : [],
        },
      };

      return coachMessage;
    } catch (error) {
      // Return error message as assistant response
      return {
        id: this.generateMessageId(),
        role: "assistant",
        content:
          "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment. In the meantime, remember that small changes like using LED bulbs or taking shorter showers can make a meaningful impact on your carbon footprint!",
        timestamp: Date.now(),
        userId,
        conversationId:
          messages[0]?.conversationId || this.generateConversationId(),
        metadata: {
          model: "error-fallback",
          tokens: 0,
          temperature: 0,
          processingTime: 0,
        },
      };
    }
  }

  async *generateStreamingCoachResponse(
    messages: ChatMessage[],
    userId: string,
    userProfile?: UserProfile
  ): AsyncGenerator<
    { chunk: string; isComplete: boolean; messageId: string },
    void,
    unknown
  > {
    const messageId = this.generateMessageId();
    const contextualMessages = this.addContextToMessages(messages, userProfile);

    try {
      for await (const response of geminiClient.generateStreamingResponse(
        contextualMessages,
        userId,
        { temperature: 0.7, maxTokens: 8192 }
      )) {
        yield {
          chunk: response.chunk,
          isComplete: response.isComplete,
          messageId,
        };
      }
    } catch (error) {
      yield {
        chunk:
          "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
        isComplete: true,
        messageId,
      };
    }
  }

  async analyzeProductFootprint(
    productUrl: string,
    productDescription: string,
    userId: string
  ): Promise<ChatMessage> {
    const analysisPrompt = `Analyze the carbon footprint of this product and provide alternatives:

Product URL: ${productUrl}
Product Description: ${productDescription}

Please provide:
1. Estimated carbon footprint (in kg CO2e)
2. Key environmental impacts
3. 2-3 more sustainable alternatives
4. Specific actions to reduce impact
5. Estimated carbon savings from alternatives

Be specific with numbers and provide actionable advice.`;

    const messages: ChatMessage[] = [
      {
        id: this.generateMessageId(),
        role: "user",
        content: analysisPrompt,
        timestamp: Date.now(),
        userId,
        conversationId: this.generateConversationId(),
      },
    ];

    return this.generateCoachResponse(messages, userId, undefined, {
      includeFactCheck: true,
      includeToolRecommendations: true,
    });
  }

  async factCheckClaim(
    claim: string,
    userId: string
  ): Promise<FactCheckResult> {
    const factCheckPrompt = `Fact-check this environmental claim with scientific rigor:

Claim: "${claim}"

Please provide:
1. Verdict: accurate, inaccurate, partially_accurate, or unverifiable
2. Confidence level (0-100%)
3. Scientific explanation
4. Credible sources (if available)
5. Context or nuances

Base your analysis on peer-reviewed research and authoritative sources.`;

    const messages: ChatMessage[] = [
      {
        id: this.generateMessageId(),
        role: "user",
        content: factCheckPrompt,
        timestamp: Date.now(),
        userId,
        conversationId: this.generateConversationId(),
      },
    ];

    try {
      const response = await this.generateCoachResponse(messages, userId);

      // Parse the response to extract structured fact-check data
      // This is a simplified version - in production, you'd use more sophisticated parsing
      return {
        claim,
        verdict: this.extractVerdict(response.content),
        confidence: this.extractConfidence(response.content),
        sources: this.extractSources(response.content),
        explanation: response.content,
      };
    } catch (error) {
      return {
        claim,
        verdict: "unverifiable",
        confidence: 0,
        sources: [],
        explanation:
          "Unable to fact-check this claim at the moment. Please try again later.",
      };
    }
  }

  private addContextToMessages(
    messages: ChatMessage[],
    userProfile?: UserProfile,
    customPrompt?: string
  ): ChatMessage[] {
    const systemMessage: ChatMessage = {
      id: "system",
      role: "system",
      content:
        (customPrompt || this.baseSystemPrompt) +
        (userProfile ? this.formatUserProfile(userProfile) : ""),
      timestamp: Date.now(),
      conversationId:
        messages[0]?.conversationId || this.generateConversationId(),
    };

    return [systemMessage, ...messages];
  }

  private formatUserProfile(profile: UserProfile): string {
    return `

User Context:
- Carbon Goals: ${profile.preferences.carbonGoals} kg CO2e reduction target
- Interests: ${profile.preferences.interests.join(", ")}
- Communication Style: ${profile.preferences.communicationStyle}
- Previous Conversations: ${profile.history.totalConversations}
- Carbon Savings Achieved: ${profile.history.carbonSavingsAchieved} kg CO2e
- Top Topics: ${profile.history.topTopics.join(", ")}

Tailor your responses to their goals and communication preferences.`;
  }

  private extractVerdict(
    content: string
  ): "accurate" | "inaccurate" | "partially_accurate" | "unverifiable" {
    const lower = content.toLowerCase();
    if (lower.includes("accurate") && !lower.includes("inaccurate"))
      return "accurate";
    if (lower.includes("inaccurate")) return "inaccurate";
    if (lower.includes("partially")) return "partially_accurate";
    return "unverifiable";
  }

  private extractConfidence(content: string): number {
    const match = content.match(/(\d+)%/);
    return match ? parseInt(match[1]) : 50;
  }

  private extractSources(
    content: string
  ): Array<{ url: string; title: string; reliability: number }> {
    // Simplified source extraction - in production, use more sophisticated parsing
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];

    return urls.map((url) => ({
      url,
      title: "Source",
      reliability: 80, // Default reliability score
    }));
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Singleton instance
export const aiCoachService = new AICoachService();
