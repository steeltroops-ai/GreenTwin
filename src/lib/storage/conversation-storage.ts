"use client";

import { ChatMessage, Conversation, ConversationAnalytics } from "@/lib/gemini/types";

// Local storage keys
const CONVERSATIONS_KEY = "green_twin_conversations";
const ANALYTICS_KEY = "green_twin_analytics";
const USER_PREFERENCES_KEY = "green_twin_preferences";

export class ConversationStorage {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Get all conversations for the current user
  getConversations(): Conversation[] {
    try {
      const stored = localStorage.getItem(`${CONVERSATIONS_KEY}_${this.userId}`);
      if (!stored) return [];
      
      const conversations = JSON.parse(stored) as Conversation[];
      return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      return [];
    }
  }

  // Get a specific conversation by ID
  getConversation(conversationId: string): Conversation | null {
    const conversations = this.getConversations();
    return conversations.find(conv => conv.id === conversationId) || null;
  }

  // Save or update a conversation
  saveConversation(conversation: Conversation): void {
    try {
      const conversations = this.getConversations();
      const existingIndex = conversations.findIndex(conv => conv.id === conversation.id);
      
      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
      } else {
        conversations.push(conversation);
      }

      // Keep only the last 50 conversations to prevent storage bloat
      const trimmedConversations = conversations
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 50);

      localStorage.setItem(
        `${CONVERSATIONS_KEY}_${this.userId}`,
        JSON.stringify(trimmedConversations)
      );
    } catch (error) {
      console.error("Failed to save conversation:", error);
    }
  }

  // Add a message to a conversation
  addMessageToConversation(conversationId: string, message: ChatMessage): void {
    const conversation = this.getConversation(conversationId);
    
    if (conversation) {
      conversation.messages.push(message);
      conversation.updatedAt = Date.now();
      conversation.metadata.totalMessages = conversation.messages.length;
      conversation.metadata.totalTokens += message.metadata?.tokens || 0;
      
      // Update topics based on message content
      this.updateConversationTopics(conversation, message);
      
      this.saveConversation(conversation);
    } else {
      // Create new conversation
      const newConversation: Conversation = {
        id: conversationId,
        userId: this.userId,
        title: this.generateConversationTitle(message.content),
        messages: [message],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          totalMessages: 1,
          totalTokens: message.metadata?.tokens || 0,
          topics: this.extractTopics(message.content),
          carbonSavingsDiscussed: 0,
          factChecksPerformed: 0,
          toolsRecommended: [],
        },
      };
      
      this.saveConversation(newConversation);
    }
  }

  // Delete a conversation
  deleteConversation(conversationId: string): void {
    try {
      const conversations = this.getConversations();
      const filteredConversations = conversations.filter(conv => conv.id !== conversationId);
      
      localStorage.setItem(
        `${CONVERSATIONS_KEY}_${this.userId}`,
        JSON.stringify(filteredConversations)
      );
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  }

  // Get conversation analytics
  getAnalytics(): ConversationAnalytics[] {
    try {
      const stored = localStorage.getItem(`${ANALYTICS_KEY}_${this.userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load analytics:", error);
      return [];
    }
  }

  // Save conversation analytics
  saveAnalytics(analytics: ConversationAnalytics): void {
    try {
      const allAnalytics = this.getAnalytics();
      const existingIndex = allAnalytics.findIndex(a => a.conversationId === analytics.conversationId);
      
      if (existingIndex >= 0) {
        allAnalytics[existingIndex] = analytics;
      } else {
        allAnalytics.push(analytics);
      }

      // Keep only the last 100 analytics records
      const trimmedAnalytics = allAnalytics.slice(-100);
      
      localStorage.setItem(
        `${ANALYTICS_KEY}_${this.userId}`,
        JSON.stringify(trimmedAnalytics)
      );
    } catch (error) {
      console.error("Failed to save analytics:", error);
    }
  }

  // Get user preferences
  getUserPreferences(): any {
    try {
      const stored = localStorage.getItem(`${USER_PREFERENCES_KEY}_${this.userId}`);
      return stored ? JSON.parse(stored) : {
        theme: "system",
        notifications: true,
        autoSave: true,
        factCheckingLevel: "thorough",
        communicationStyle: "professional",
      };
    } catch (error) {
      console.error("Failed to load user preferences:", error);
      return {};
    }
  }

  // Save user preferences
  saveUserPreferences(preferences: any): void {
    try {
      localStorage.setItem(
        `${USER_PREFERENCES_KEY}_${this.userId}`,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error("Failed to save user preferences:", error);
    }
  }

  // Search conversations
  searchConversations(query: string): Conversation[] {
    const conversations = this.getConversations();
    const lowercaseQuery = query.toLowerCase();
    
    return conversations.filter(conversation => 
      conversation.title.toLowerCase().includes(lowercaseQuery) ||
      conversation.messages.some(message => 
        message.content.toLowerCase().includes(lowercaseQuery)
      ) ||
      conversation.metadata.topics.some(topic => 
        topic.toLowerCase().includes(lowercaseQuery)
      )
    );
  }

  // Get conversation statistics
  getStatistics(): {
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    averageMessagesPerConversation: number;
    topTopics: Array<{ topic: string; count: number }>;
    carbonSavingsTotal: number;
  } {
    const conversations = this.getConversations();
    
    const totalConversations = conversations.length;
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.metadata.totalMessages, 0);
    const totalTokens = conversations.reduce((sum, conv) => sum + conv.metadata.totalTokens, 0);
    const carbonSavingsTotal = conversations.reduce((sum, conv) => sum + conv.metadata.carbonSavingsDiscussed, 0);
    
    // Calculate top topics
    const topicCounts = new Map<string, number>();
    conversations.forEach(conv => {
      conv.metadata.topics.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      });
    });
    
    const topTopics = Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalConversations,
      totalMessages,
      totalTokens,
      averageMessagesPerConversation: totalConversations > 0 ? totalMessages / totalConversations : 0,
      topTopics,
      carbonSavingsTotal,
    };
  }

  // Helper methods
  private generateConversationTitle(firstMessage: string): string {
    const words = firstMessage.split(" ").slice(0, 6);
    let title = words.join(" ");
    
    if (firstMessage.length > title.length) {
      title += "...";
    }
    
    return title || "New Conversation";
  }

  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    const lowercaseContent = content.toLowerCase();
    
    // Environmental topics
    const environmentalKeywords = [
      "carbon", "co2", "emissions", "footprint", "climate", "energy", "renewable",
      "solar", "wind", "electric", "sustainable", "green", "eco", "environment",
      "recycling", "waste", "transportation", "diet", "food", "shopping", "product"
    ];
    
    environmentalKeywords.forEach(keyword => {
      if (lowercaseContent.includes(keyword)) {
        topics.push(keyword);
      }
    });
    
    return [...new Set(topics)]; // Remove duplicates
  }

  private updateConversationTopics(conversation: Conversation, message: ChatMessage): void {
    const newTopics = this.extractTopics(message.content);
    const existingTopics = new Set(conversation.metadata.topics);
    
    newTopics.forEach(topic => existingTopics.add(topic));
    conversation.metadata.topics = Array.from(existingTopics);
    
    // Update carbon savings if mentioned
    const carbonMatch = message.content.match(/(\d+\.?\d*)\s*kg\s*CO[₂2]e?/i);
    if (carbonMatch) {
      conversation.metadata.carbonSavingsDiscussed += parseFloat(carbonMatch[1]);
    }
    
    // Update fact checks
    if (message.metadata?.factChecked) {
      conversation.metadata.factChecksPerformed += 1;
    }
    
    // Update tools recommended
    if (message.metadata?.toolsUsed) {
      const existingTools = new Set(conversation.metadata.toolsRecommended);
      message.metadata.toolsUsed.forEach(tool => existingTools.add(tool));
      conversation.metadata.toolsRecommended = Array.from(existingTools);
    }
  }

  // Clear all data (for privacy/reset purposes)
  clearAllData(): void {
    try {
      localStorage.removeItem(`${CONVERSATIONS_KEY}_${this.userId}`);
      localStorage.removeItem(`${ANALYTICS_KEY}_${this.userId}`);
      localStorage.removeItem(`${USER_PREFERENCES_KEY}_${this.userId}`);
    } catch (error) {
      console.error("Failed to clear data:", error);
    }
  }
}
