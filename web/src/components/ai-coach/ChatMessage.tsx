"use client";

import React from "react";
import { ChatMessage as ChatMessageType } from "@/lib/gemini/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Bot, 
  User, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  ExternalLink,
  Leaf,
  Clock,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  onCopy?: (content: string) => void;
  onFeedback?: (messageId: string, feedback: "positive" | "negative") => void;
  onRetry?: (messageId: string) => void;
}

export function ChatMessage({ 
  message, 
  isStreaming = false,
  onCopy,
  onFeedback,
  onRetry 
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const extractCarbonSavings = (content: string): string | null => {
    const match = content.match(/(\d+\.?\d*)\s*kg\s*CO[₂2]e?/i);
    return match ? match[0] : null;
  };

  const extractCostSavings = (content: string): string | null => {
    const match = content.match(/\$(\d+\.?\d*)/);
    return match ? match[0] : null;
  };

  return (
    <div className={cn(
      "flex gap-3 p-4 group hover:bg-muted/30 transition-colors",
      isUser && "flex-row-reverse"
    )}>
      {/* Avatar */}
      <Avatar className={cn(
        "size-8 shrink-0",
        isUser && "bg-primary",
        isAssistant && "bg-gradient-to-br from-green-500 to-emerald-600"
      )}>
        <AvatarFallback className="text-white">
          {isUser ? <User className="size-4" /> : <Leaf className="size-4" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn(
        "flex-1 space-y-2 max-w-[85%]",
        isUser && "flex flex-col items-end"
      )}>
        {/* Message Bubble */}
        <Card className={cn(
          "p-3 relative",
          isUser && "bg-primary text-primary-foreground ml-auto",
          isAssistant && "bg-background border-border/50"
        )}>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className={cn(
              "whitespace-pre-wrap break-words",
              isUser && "text-primary-foreground",
              isStreaming && "animate-pulse"
            )}>
              {message.content}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
              )}
            </div>
          </div>

          {/* Carbon & Cost Savings Badges */}
          {isAssistant && !isStreaming && (
            <div className="flex flex-wrap gap-2 mt-3">
              {extractCarbonSavings(message.content) && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <Leaf className="size-3 mr-1" />
                  {extractCarbonSavings(message.content)} saved
                </Badge>
              )}
              {extractCostSavings(message.content) && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Zap className="size-3 mr-1" />
                  {extractCostSavings(message.content)} saved
                </Badge>
              )}
              {message.metadata?.factChecked && (
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  ✓ Fact-checked
                </Badge>
              )}
            </div>
          )}
        </Card>

        {/* Message Metadata */}
        <div className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          isUser && "justify-end"
        )}>
          <Clock className="size-3" />
          <span>{formatTimestamp(message.timestamp)}</span>
          
          {message.metadata?.processingTime && (
            <>
              <span>•</span>
              <span>{message.metadata.processingTime}ms</span>
            </>
          )}
          
          {message.metadata?.tokens && (
            <>
              <span>•</span>
              <span>{message.metadata.tokens} tokens</span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        {!isStreaming && (
          <div className={cn(
            "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            isUser && "justify-end"
          )}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs"
            >
              <Copy className="size-3 mr-1" />
              Copy
            </Button>
            
            {isAssistant && onFeedback && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(message.id, "positive")}
                  className="h-7 px-2 text-xs"
                >
                  <ThumbsUp className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(message.id, "negative")}
                  className="h-7 px-2 text-xs"
                >
                  <ThumbsDown className="size-3" />
                </Button>
              </>
            )}
            
            {isAssistant && onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRetry(message.id)}
                className="h-7 px-2 text-xs"
              >
                Retry
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
