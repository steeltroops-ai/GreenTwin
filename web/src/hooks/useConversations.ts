"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { ConversationStorage } from "@/lib/storage/conversation-storage";
import { Conversation, ChatMessage, ConversationAnalytics } from "@/lib/gemini/types";

export function useConversations() {
  const { user } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize storage when user is available
  const storage = useMemo(() => {
    return user ? new ConversationStorage(user.id) : null;
  }, [user]);

  // Load conversations on mount
  useEffect(() => {
    if (storage) {
      setIsLoading(true);
      try {
        const loadedConversations = storage.getConversations();
        setConversations(loadedConversations);
        
        // Set current conversation to the most recent one
        if (loadedConversations.length > 0 && !currentConversationId) {
          setCurrentConversationId(loadedConversations[0].id);
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [storage, currentConversationId]);

  // Get current conversation
  const currentConversation = useMemo(() => {
    if (!currentConversationId) return null;
    return conversations.find(conv => conv.id === currentConversationId) || null;
  }, [conversations, currentConversationId]);

  // Create a new conversation
  const createConversation = useCallback((title?: string): string => {
    if (!storage || !user) return "";

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newConversation: Conversation = {
      id: conversationId,
      userId: user.id,
      title: title || "New Conversation",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        totalMessages: 0,
        totalTokens: 0,
        topics: [],
        carbonSavingsDiscussed: 0,
        factChecksPerformed: 0,
        toolsRecommended: [],
      },
    };

    storage.saveConversation(newConversation);
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(conversationId);
    
    return conversationId;
  }, [storage, user]);

  // Add message to conversation
  const addMessage = useCallback((message: ChatMessage) => {
    if (!storage) return;

    const conversationId = message.conversationId;
    
    // Add message to storage
    storage.addMessageToConversation(conversationId, message);
    
    // Update local state
    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv.id === conversationId) {
          const updatedConv = { ...conv };
          updatedConv.messages = [...conv.messages, message];
          updatedConv.updatedAt = Date.now();
          updatedConv.metadata.totalMessages = updatedConv.messages.length;
          updatedConv.metadata.totalTokens += message.metadata?.tokens || 0;
          return updatedConv;
        }
        return conv;
      });
      
      // If conversation doesn't exist, create it
      if (!updated.find(conv => conv.id === conversationId)) {
        const newConv: Conversation = {
          id: conversationId,
          userId: user?.id || "",
          title: message.content.slice(0, 50) + (message.content.length > 50 ? "..." : ""),
          messages: [message],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {
            totalMessages: 1,
            totalTokens: message.metadata?.tokens || 0,
            topics: [],
            carbonSavingsDiscussed: 0,
            factChecksPerformed: 0,
            toolsRecommended: [],
          },
        };
        return [newConv, ...updated];
      }
      
      return updated.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, [storage, user]);

  // Delete conversation
  const deleteConversation = useCallback((conversationId: string) => {
    if (!storage) return;

    storage.deleteConversation(conversationId);
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    if (currentConversationId === conversationId) {
      const remaining = conversations.filter(conv => conv.id !== conversationId);
      setCurrentConversationId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [storage, currentConversationId, conversations]);

  // Update conversation title
  const updateConversationTitle = useCallback((conversationId: string, title: string) => {
    if (!storage) return;

    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv.id === conversationId) {
          const updatedConv = { ...conv, title, updatedAt: Date.now() };
          storage.saveConversation(updatedConv);
          return updatedConv;
        }
        return conv;
      });
      return updated;
    });
  }, [storage]);

  // Search conversations
  const searchConversations = useCallback((query: string): Conversation[] => {
    if (!storage || !query.trim()) return conversations;
    return storage.searchConversations(query);
  }, [storage, conversations]);

  // Get conversation statistics
  const getStatistics = useCallback(() => {
    if (!storage) return null;
    return storage.getStatistics();
  }, [storage]);

  // Save analytics
  const saveAnalytics = useCallback((analytics: ConversationAnalytics) => {
    if (!storage) return;
    storage.saveAnalytics(analytics);
  }, [storage]);

  // Get user preferences
  const getUserPreferences = useCallback(() => {
    if (!storage) return null;
    return storage.getUserPreferences();
  }, [storage]);

  // Save user preferences
  const saveUserPreferences = useCallback((preferences: any) => {
    if (!storage) return;
    storage.saveUserPreferences(preferences);
  }, [storage]);

  // Clear all data
  const clearAllData = useCallback(() => {
    if (!storage) return;
    
    storage.clearAllData();
    setConversations([]);
    setCurrentConversationId(null);
  }, [storage]);

  // Export conversations (for backup/sharing)
  const exportConversations = useCallback(() => {
    const exportData = {
      conversations,
      statistics: getStatistics(),
      preferences: getUserPreferences(),
      exportedAt: Date.now(),
      version: "1.0",
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `green-twin-conversations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [conversations, getStatistics, getUserPreferences]);

  // Import conversations (from backup)
  const importConversations = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          
          if (data.conversations && Array.isArray(data.conversations)) {
            // Validate and import conversations
            const validConversations = data.conversations.filter((conv: any) => 
              conv.id && conv.userId && conv.messages && Array.isArray(conv.messages)
            );
            
            if (storage) {
              validConversations.forEach((conv: Conversation) => {
                storage.saveConversation(conv);
              });
              
              // Reload conversations
              const loadedConversations = storage.getConversations();
              setConversations(loadedConversations);
              
              if (data.preferences) {
                storage.saveUserPreferences(data.preferences);
              }
            }
            
            resolve();
          } else {
            reject(new Error("Invalid conversation data format"));
          }
        } catch (error) {
          reject(new Error("Failed to parse conversation data"));
        }
      };
      
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }, [storage]);

  return {
    // State
    conversations,
    currentConversation,
    currentConversationId,
    isLoading,
    
    // Actions
    createConversation,
    addMessage,
    deleteConversation,
    updateConversationTitle,
    setCurrentConversationId,
    
    // Search & Analytics
    searchConversations,
    getStatistics,
    saveAnalytics,
    
    // Preferences
    getUserPreferences,
    saveUserPreferences,
    
    // Data Management
    clearAllData,
    exportConversations,
    importConversations,
  };
}
