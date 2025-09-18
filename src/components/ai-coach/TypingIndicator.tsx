"use client";

import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Leaf } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-3 p-4 animate-in fade-in-0 duration-300">
      {/* Avatar */}
      <Avatar className="size-8 shrink-0 bg-gradient-to-br from-green-500 to-emerald-600">
        <AvatarFallback className="text-white">
          <Leaf className="size-4" />
        </AvatarFallback>
      </Avatar>

      {/* Typing Bubble */}
      <Card className="p-3 bg-background border-border/50 max-w-[200px]">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">Green Twin is thinking</span>
          <div className="flex gap-1 ml-2">
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
          </div>
        </div>
      </Card>
    </div>
  );
}
