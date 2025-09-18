# AI Coach Sidebar Implementation

## Overview

The AI Coach has been implemented as a right-side sidebar that can be toggled on/off, providing a seamless chat experience without disrupting the main dashboard functionality.

## Features Implemented

### 1. Sidebar Context Management
- **File**: `src/contexts/SidebarContext.tsx`
- Manages sidebar open/closed state
- Persists state in localStorage across page navigation
- Provides keyboard shortcuts (Ctrl+K to toggle, Escape to close)

### 2. AI Coach Sidebar Component
- **File**: `src/components/ai-coach/AiCoachSidebar.tsx`
- Right-side sliding sidebar with smooth animations
- Responsive design (full-width on mobile, fixed-width on desktop)
- Backdrop overlay on mobile for better UX
- Professional header with close button

### 3. Toggle Button
- **File**: `src/components/ai-coach/AiCoachSidebar.tsx` (AiCoachToggleButton)
- Fixed position floating action button
- Moves position when sidebar is open on desktop
- Tooltip with keyboard shortcut hint
- Responsive text (different labels for mobile/desktop)

### 4. Main Layout Integration
- **File**: `src/components/layout/MainLayout.tsx`
- Wraps the entire application
- Handles content shifting when sidebar is open
- Integrates with existing layout structure

### 5. Chat Interface Optimization
- **File**: `src/components/ai-coach/ChatInterface.tsx`
- Added `isSidebar` prop for sidebar-specific styling
- Removes header when used in sidebar (to avoid duplication)
- Optimized layout for narrow sidebar width
- Maintains all existing AI coaching functionality

## Integration Points

### Root Layout
- Updated `src/app/layout.tsx` to include MainLayout wrapper
- Maintains all existing providers (Clerk, WebSocket, etc.)

### Home Client
- Updated `src/components/home/home-client.tsx`
- Removed "AI Coach" tab from navigation
- Updated existing buttons to open sidebar instead of switching tabs
- Added useSidebar hook integration

## Responsive Behavior

### Desktop (lg and above)
- Sidebar: Fixed 384px width (w-96)
- Content: Shifts left by 384px when sidebar is open
- Toggle button: Moves left when sidebar is open

### Mobile/Tablet
- Sidebar: Full-width overlay with backdrop
- Content: No shifting (overlay behavior)
- Toggle button: Stays in fixed position

## Keyboard Shortcuts

- **Ctrl+K** (or Cmd+K on Mac): Toggle sidebar
- **Escape**: Close sidebar when open

## State Persistence

- Sidebar open/closed state is saved to localStorage
- State persists across page navigation and browser sessions
- Key: `sidebar-open`

## Styling Features

- Backdrop blur effects for modern appearance
- Smooth 300ms transitions for all animations
- Shadow effects for depth perception
- Consistent with existing design system
- Professional gradient styling for toggle button

## Usage

The AI Coach sidebar can be accessed through:
1. Floating toggle button (bottom-right corner)
2. "AI Coach" buttons in the dashboard
3. Keyboard shortcut (Ctrl+K)

All existing AI coaching functionality is preserved, including:
- Streaming responses from Google Gemini
- Conversation history
- Fact-checking capabilities
- Product analysis
- Tool recommendations
