"use client";

import { useState, useCallback, useRef } from "react";
import { ChatMessage } from "@/lib/gemini/types";
import { useUser } from "@clerk/nextjs";

interface UseAIChatOptions {
  initialMessages?: ChatMessage[];
  onError?: (error: string) => void;
  onMessageSent?: (message: ChatMessage) => void;
  onMessageReceived?: (message: ChatMessage) => void;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>(
    options.initialMessages || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      content: string,
      options: {
        stream?: boolean;
        includeFactCheck?: boolean;
        includeToolRecommendations?: boolean;
      } = {}
    ) => {
      if (!content.trim() || isLoading || !user) return;

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
        userId: user.id,
        conversationId: messages[0]?.conversationId || `conv_${Date.now()}`,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Call onMessageSent callback
      options.onMessageSent?.(userMessage);

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        if (options.stream) {
          await handleStreamingResponse(userMessage, options);
        } else {
          await handleRegularResponse(userMessage, options);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Request was cancelled
        }

        console.error("Chat error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Something went wrong";
        setError(errorMessage);

        // Add error message to chat
        const errorChatMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: "assistant",
          content:
            "I apologize, but I'm experiencing technical difficulties. Please try again in a moment. 🌱",
          timestamp: Date.now(),
          userId: user.id,
          conversationId: userMessage.conversationId,
          metadata: {
            model: "error-fallback",
            tokens: 0,
            temperature: 0,
            processingTime: 0,
          },
        };

        setMessages((prev) => [...prev, errorChatMessage]);
        options.onError?.(errorMessage);
      } finally {
        setIsLoading(false);
        setStreamingMessageId(null);
        abortControllerRef.current = null;
      }
    },
    [messages, isLoading, user, options]
  );

  const handleRegularResponse = async (
    userMessage: ChatMessage,
    requestOptions: any
  ) => {
    const response = await fetch("/api/ai-coach/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [...messages, userMessage],
        stream: false,
        options: {
          includeFactCheck: requestOptions.includeFactCheck || false,
          includeToolRecommendations:
            requestOptions.includeToolRecommendations || false,
        },
      }),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get response");
    }

    const data = await response.json();

    if (data.success && data.message) {
      setMessages((prev) => [...prev, data.message]);
      options?.onMessageReceived?.(data.message);
    } else {
      throw new Error("Invalid response format");
    }
  };

  const handleStreamingResponse = async (
    userMessage: ChatMessage,
    requestOptions: any
  ) => {
    const response = await fetch("/api/ai-coach/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [...messages, userMessage],
        stream: true,
        options: requestOptions,
      }),
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get streaming response");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }

    const decoder = new TextDecoder();
    let streamingMessage: ChatMessage | null = null;
    let accumulatedContent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (!streamingMessage) {
              // Initialize streaming message
              streamingMessage = {
                id: data.messageId,
                role: "assistant",
                content: "",
                timestamp: Date.now(),
                userId: user!.id,
                conversationId: userMessage.conversationId,
                metadata: {
                  model: "gemini-1.5-pro-latest",
                  tokens: 0,
                  temperature: 0.7,
                  processingTime: 0,
                },
              };

              setStreamingMessageId(data.messageId);
              setMessages((prev) => [...prev, streamingMessage!]);
            }

            if (!data.isComplete) {
              accumulatedContent += data.chunk;

              // Update the streaming message
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === data.messageId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            } else {
              // Streaming complete
              if (data.metadata) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === data.messageId
                      ? {
                          ...msg,
                          content: accumulatedContent,
                          metadata: { ...msg.metadata, ...data.metadata },
                        }
                      : msg
                  )
                );
              }

              if (streamingMessage) {
                options?.onMessageReceived?.({
                  ...streamingMessage,
                  content: accumulatedContent,
                });
              }
            }
          } catch (parseError) {
            console.warn("Failed to parse streaming chunk:", parseError);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const analyzeProduct = useCallback(
    async (productUrl: string, productDescription?: string) => {
      if (!user) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/ai-coach/analyze-product", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productUrl,
            productDescription,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to analyze product");
        }

        const data = await response.json();

        if (data.success && data.analysis) {
          setMessages((prev) => [...prev, data.analysis]);
          options?.onMessageReceived?.(data.analysis);
          return data.analysis;
        } else {
          throw new Error("Invalid analysis response format");
        }
      } catch (err) {
        console.error("Product analysis error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to analyze product";
        setError(errorMessage);
        options?.onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [user, options]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    streamingMessageId,
    sendMessage,
    analyzeProduct,
    clearMessages,
    cancelRequest,
    setError,
  };
}
