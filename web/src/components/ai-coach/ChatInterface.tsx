"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage as ChatMessageType } from "@/lib/gemini/types";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { ConversationHistory } from "./ConversationHistory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight,
  MessageSquare,
  AlertCircle,
  Sparkles,
  Leaf,
  Zap,
  ShoppingCart,
  Link as LinkIcon,
  History,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useConversations } from "@/hooks/useConversations";
import { useAIChat } from "@/hooks/useAIChat";

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const { user } = useUser();
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  // Conversation management
  const {
    conversations,
    currentConversation,
    currentConversationId,
    createConversation,
    addMessage,
    deleteConversation,
    updateConversationTitle,
    setCurrentConversationId,
    searchConversations,
    getStatistics,
    exportConversations,
    importConversations,
  } = useConversations();

  // AI Chat functionality with conversation integration
  const welcomeMessage: ChatMessageType = {
    id: "welcome",
    role: "assistant",
    content:
      "👋 Hi! I'm your Green Twin AI coach. I'm here to help you reduce your carbon footprint with personalized, science-based advice.\n\nI can help you with:\n• **Product carbon analysis** - Paste any product link\n• **Climate myth-busting** - Ask me about environmental claims\n• **Sustainable alternatives** - Find eco-friendly swaps\n• **Carbon calculations** - Estimate your footprint\n• **Action planning** - Create your reduction strategy\n\nWhat would you like to explore today?",
    timestamp: Date.now(),
    conversationId: currentConversationId || "welcome",
    metadata: {
      model: "welcome-message",
      tokens: 0,
      temperature: 0,
      processingTime: 0,
    },
  };

  const {
    messages,
    isLoading,
    error,
    streamingMessageId,
    sendMessage,
    analyzeProduct,
    setError,
  } = useAIChat({
    initialMessages: currentConversation?.messages || [welcomeMessage],
    onMessageSent: (message) => {
      addMessage(message);
    },
    onMessageReceived: (message) => {
      addMessage(message);
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;

    // Create conversation if none exists
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = createConversation();
    }

    // Send message using the hook
    await sendMessage(input.trim(), {
      includeFactCheck: true,
      includeToolRecommendations: true,
    });

    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // You could add a toast notification here
  };

  const handleFeedback = (
    messageId: string,
    feedback: "positive" | "negative"
  ) => {
    // TODO: Implement feedback collection
    console.log(`Feedback for ${messageId}: ${feedback}`);
  };

  const handleRetry = (messageId: string) => {
    // TODO: Implement message retry
    console.log(`Retry message: ${messageId}`);
  };

  const isProductUrl = (text: string) => {
    return (
      /https?:\/\/[^\s]+/.test(text) &&
      (text.includes("amazon") ||
        text.includes("shop") ||
        text.includes("store"))
    );
  };

  return (
    <div className={cn("h-full flex gap-4", className)}>
      {/* Conversation History Sidebar */}
      {showHistory && (
        <div className="w-80 shrink-0">
          <ConversationHistory
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={setCurrentConversationId}
            onCreateConversation={createConversation}
            onDeleteConversation={deleteConversation}
            onUpdateTitle={updateConversationTitle}
            onSearch={searchConversations}
            onExport={exportConversations}
            onImport={importConversations}
            statistics={(() => {
              const stats = getStatistics();
              return stats
                ? {
                    totalConversations: stats.totalConversations,
                    totalMessages: stats.totalMessages,
                    carbonSavingsTotal: stats.carbonSavingsTotal,
                  }
                : undefined;
            })()}
          />
        </div>
      )}

      {/* Main Chat Interface */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="h-8 w-8 p-0 mr-2"
            >
              {showHistory ? (
                <X className="size-4" />
              ) : (
                <History className="size-4" />
              )}
            </Button>
            <MessageSquare className="size-5" />
            AI Coach
            <Badge variant="secondary" className="ml-auto">
              <Sparkles className="size-3 mr-1" />
              Powered by Gemini
            </Badge>
          </CardTitle>
          <CardDescription>
            Get personalized carbon reduction advice, product analysis, and
            climate fact-checking
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto border-t border-border/50">
            <div className="space-y-0">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={streamingMessageId === message.id}
                  onCopy={handleCopy}
                  onFeedback={handleFeedback}
                  onRetry={handleRetry}
                />
              ))}

              {isLoading && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="mx-4 mb-4" variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-border/50 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                placeholder="Ask about carbon footprints, paste a product link, or request eco-friendly alternatives..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
              >
                Send <ArrowRight className="ml-1 size-3" />
              </Button>
            </div>

            {/* Quick Action Badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setInput("What's the carbon footprint of my daily commute?")
                }
              >
                <Zap className="size-3 mr-1" />
                Commute analysis
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setInput("Find me sustainable alternatives to fast fashion")
                }
              >
                <Leaf className="size-3 mr-1" />
                Sustainable swaps
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() =>
                  setInput(
                    "Is it true that electric cars are worse for the environment?"
                  )
                }
              >
                <AlertCircle className="size-3 mr-1" />
                Myth busting
              </Badge>
              {isProductUrl(input) && (
                <Badge variant="secondary">
                  <LinkIcon className="size-3 mr-1" />
                  Product detected
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
