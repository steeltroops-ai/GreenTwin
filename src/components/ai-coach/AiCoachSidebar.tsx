"use client";

import React from "react";
import { X, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatInterface } from "./ChatInterface";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";

export function AiCoachSidebar() {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full bg-background/95 backdrop-blur-md border-l border-border/50 z-50 transition-transform duration-300 ease-in-out shadow-2xl",
          "flex flex-col",
          // Desktop: Fixed width sidebar
          "lg:w-96",
          // Mobile: Full width overlay
          "w-full sm:w-96",
          // Transform based on open state
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <Sparkles className="size-4 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">AI Coach</h2>
              <p className="text-xs text-muted-foreground">
                Your climate companion
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="size-4" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface className="h-full" isSidebar={true} />
        </div>
      </div>
    </>
  );
}

export function AiCoachToggleButton() {
  const { isOpen, toggle } = useSidebar();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggle}
            variant="outline"
            size="sm"
            className={cn(
              "fixed bottom-6 right-6 z-30 shadow-lg transition-all duration-300 ease-in-out",
              "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700",
              "text-white border-green-500/30 hover:border-green-600/30",
              "backdrop-blur-sm hover:shadow-xl",
              "font-medium px-4 py-2 h-auto",
              // Move button when sidebar is open on desktop
              isOpen && "lg:right-[25rem]"
            )}
          >
            <MessageSquare className="size-4 mr-2" />
            <span className="hidden sm:inline">
              {isOpen ? "Close AI Coach" : "AI Coach"}
            </span>
            <span className="sm:hidden">{isOpen ? "Close" : "Chat"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          className="bg-popover text-popover-foreground"
        >
          <p className="text-sm">
            {isOpen ? "Close AI Coach" : "Open AI Coach"}
            <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-muted rounded border">
              Ctrl+K
            </kbd>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
