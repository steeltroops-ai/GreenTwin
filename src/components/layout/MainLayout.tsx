"use client";

import React from "react";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { AiCoachSidebar, AiCoachToggleButton } from "@/components/ai-coach/AiCoachSidebar";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayoutContent({ children }: MainLayoutProps) {
  const { isOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      {/* Main content area */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          // On desktop, shift content when sidebar is open
          "lg:mr-0",
          isOpen && "lg:mr-96"
        )}
      >
        {children}
      </div>

      {/* AI Coach Sidebar */}
      <AiCoachSidebar />

      {/* Toggle Button */}
      <AiCoachToggleButton />
    </div>
  );
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  );
}
