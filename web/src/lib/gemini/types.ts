// Message types for the AI coach chat system
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  userId?: string;
  conversationId: string;
  metadata?: {
    tokens?: number;
    model?: string;
    temperature?: number;
    processingTime?: number;
    sources?: string[];
    factChecked?: boolean;
    toolsUsed?: string[];
  };
}

// Conversation management types
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  metadata: {
    totalMessages: number;
    totalTokens: number;
    topics: string[];
    carbonSavingsDiscussed: number;
    factChecksPerformed: number;
    toolsRecommended: string[];
  };
}

// AI Coach context and user profile
export interface UserProfile {
  userId: string;
  preferences: {
    carbonGoals: number;
    interests: string[];
    communicationStyle: "casual" | "professional" | "technical";
    factCheckingLevel: "basic" | "thorough" | "expert";
    location?: string;
    lifestyle?: string;
  };
  history: {
    totalConversations: number;
    carbonSavingsAchieved: number;
    topTopics: string[];
    engagementScore: number;
  };
}

// Gemini API response types
export interface GeminiResponse {
  content: string;
  metadata: {
    model: string;
    tokens: number;
    temperature: number;
    processingTime: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
}

// Streaming response types
export interface StreamingResponse {
  chunk: string;
  isComplete: boolean;
  metadata?: {
    totalTokens?: number;
    processingTime?: number;
  };
}

// Rate limiting types
export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
  windowStart: number;
}

// Error types
export interface GeminiError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  rateLimited?: boolean;
}

// Fact-checking types
export interface FactCheckResult {
  claim: string;
  verdict: "accurate" | "inaccurate" | "partially_accurate" | "unverifiable";
  confidence: number;
  sources: Array<{
    url: string;
    title: string;
    reliability: number;
  }>;
  explanation: string;
}

// Tool recommendation types
export interface ToolRecommendation {
  toolName: string;
  description: string;
  relevanceScore: number;
  category:
    | "carbon_tracking"
    | "energy_efficiency"
    | "transportation"
    | "diet"
    | "shopping";
  estimatedImpact: {
    carbonSavings: number;
    costSavings: number;
    timeInvestment: number;
  };
  actionSteps: string[];
}

// Coaching prompt templates
export interface CoachingPrompt {
  id: string;
  name: string;
  category:
    | "carbon_reduction"
    | "myth_busting"
    | "product_analysis"
    | "behavior_change";
  template: string;
  variables: string[];
  expectedOutputFormat: "conversational" | "structured" | "analytical";
}

// Analytics types
export interface ConversationAnalytics {
  conversationId: string;
  userId: string;
  metrics: {
    duration: number;
    messageCount: number;
    userEngagement: number;
    topicsDiscussed: string[];
    carbonSavingsIdentified: number;
    factChecksPerformed: number;
    toolsRecommended: number;
    userSatisfaction?: number;
  };
  insights: {
    primaryIntent: string;
    knowledgeGaps: string[];
    recommendedFollowUp: string[];
    behaviorChangeOpportunities: string[];
  };
}
