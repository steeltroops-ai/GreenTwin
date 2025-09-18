"use client";

import React from "react";
import { MessageSquare, PanelRightClose } from "lucide-react";
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
          "fixed top-[77px] right-0 h-[calc(100vh-77px)] bg-background/98 backdrop-blur-md border-l border-border/30 z-50 transition-transform duration-300 ease-in-out shadow-lg",
          "flex flex-col",
          // Desktop: Fixed width sidebar
          "lg:w-96",
          // Mobile: Full width overlay
          "w-full sm:w-96",
          // Transform based on open state
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Clean Header matching main header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border/30 bg-background/98 backdrop-blur-md">
          <div>
            <h2 className="text-base font-bold tracking-tight bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              AI Coach
            </h2>
            <p className="text-sm font-semibold text-foreground/90">
              Your AI Carbon Companion
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            className="h-8 w-8 p-0 hover:bg-muted/50 rounded-lg transition-all duration-200 button-enhanced"
          >
            <PanelRightClose className="size-4" />
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

  // Hide button when sidebar is open
  if (isOpen) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggle}
            variant="outline"
            size="sm"
            className={cn(
              "fixed bottom-8 right-8 z-30 shadow-lg transition-all duration-300 ease-in-out",
              "bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 hover:from-green-600 hover:via-emerald-600 hover:to-teal-700",
              "text-white border-0 hover:border-0",
              "backdrop-blur-md hover:shadow-xl hover:scale-105",
              "font-semibold px-4 py-3 h-auto rounded-xl",
              "ring-1 ring-green-500/20 hover:ring-green-400/30"
            )}
          >
            <div className="relative">
              <MessageSquare className="size-5 mr-2" />
              <div className="absolute -top-1 -right-1 size-2 bg-green-300 rounded-full animate-pulse"></div>
            </div>
            <span className="hidden sm:inline text-sm">AI Coach</span>
            <span className="sm:hidden text-sm">Chat</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="left"
          className="bg-popover text-popover-foreground"
        >
          <p className="text-sm">
            Open AI Coach
            <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-muted rounded border">
              Ctrl+K
            </kbd>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
