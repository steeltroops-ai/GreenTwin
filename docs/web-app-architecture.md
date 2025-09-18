# Web Application Architecture

## 🎯 Overview

The Green Twin web application serves as the central intelligence hub, providing comprehensive carbon footprint analytics, AI-powered predictions, and user management. Built with Next.js 15 and modern React patterns.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                     │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Frontend      │   API Routes    │    External Services    │
│   (React/TSX)   │   (Next.js)     │    (Third-party APIs)   │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • Dashboard     │ • /api/forecast │ • Carbon Interface      │
│ • Components    │ • /api/grid     │ • Grid Intensity        │
│ • Visualizations│ • /api/auth     │ • Weather APIs          │
│ • User Interface│ • /api/sync     │ • Transportation APIs   │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with metadata
│   ├── page.tsx                 # Home page entry point
│   ├── globals.css              # Global styles
│   ├── api/                     # API route handlers
│   │   ├── forecast/route.ts    # Carbon prediction API
│   │   └── grid/route.ts        # Grid intensity API
│   └── pitch/                   # Hackathon pitch page
│       └── page.tsx
├── components/                   # Reusable React components
│   ├── home/                    # Home page specific components
│   │   └── home-client.tsx      # Main dashboard client component
│   └── ui/                      # Shared UI components (Radix + Tailwind)
├── hooks/                       # Custom React hooks
├── lib/                         # Utility functions and configurations
└── visual-edits/               # Visual editing tools (development)
```

## ⚙️ Technology Stack

### Core Framework
- **Next.js 15.3.5** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling framework

### UI Components
- **Radix UI** - Accessible component primitives
- **Lucide React** - Modern icon library
- **Framer Motion** - Animation and transitions
- **Recharts** - Data visualization library

### Development Tools
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing and optimization
- **Turbopack** - Fast bundler for development

## 🎨 Component Architecture

### Main Dashboard Component

<augment_code_snippet path="src/components/home/home-client.tsx" mode="EXCERPT">
````typescript
export function HomeClient() {
  const [footprint, setFootprint] = useState({ 
    today: 6.4, 
    week: 41.2, 
    month: 171.5 
  });
  const [forecast, setForecast] = useState<{ day: number; kg: number }[]>([]);
  
  useEffect(() => {
    // Fetch forecast data from API
    fetch("/api/forecast")
      .then(res => res.json())
      .then(data => setForecast(data.series));
  }, []);
}
````
</augment_code_snippet>

### Key Component Features

**Digital Twin Visualization:**
- Real-time carbon footprint display
- 14-day predictive forecasting
- Interactive charts and graphs
- Grid intensity monitoring

**User Interface Elements:**
- Responsive design for all screen sizes
- Dark/light mode toggle
- Smooth animations and transitions
- Accessible keyboard navigation

## 🔌 API Route Implementation

### Carbon Forecast API

<augment_code_snippet path="src/app/api/forecast/route.ts" mode="EXCERPT">
````typescript
export async function GET() {
  const today = new Date();
  const series = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const base = 6.5 - i * 0.18 + Math.sin(i * 0.7) * 0.4;
    return {
      date: d.toISOString().slice(0, 10),
      kg: Number(Math.max(2.1, base).toFixed(2)),
    };
  });
  return Response.json({ series });
}
````
</augment_code_snippet>

### Grid Intensity API

**Features:**
- Real-time electricity grid carbon intensity
- Optimal time windows for energy usage
- Regional grid data simulation
- Historical trend analysis

### API Design Principles

**RESTful Architecture:**
- Clear endpoint naming conventions
- Proper HTTP status codes
- JSON response format
- Error handling and validation

**Performance Optimization:**
- Response caching strategies
- Minimal payload sizes
- Efficient data structures
- Edge function deployment

## 📊 Data Flow Architecture

### Extension → Web App Sync

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Chrome         │    │  Local Storage  │    │  Web Dashboard  │
│  Extension      │───►│  (Browser)      │───►│  (Next.js)      │
│  (Tracking)     │    │                 │    │  (Visualization)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Synchronization Process:**
1. Extension tracks user behavior
2. Data stored in Chrome local storage
3. Web app polls for updates via API
4. Dashboard updates in real-time
5. Predictions recalculated based on new data

### State Management

**Client-Side State:**
- React useState for component state
- useEffect for data fetching
- Custom hooks for shared logic
- Context API for global state (future)

**Server-Side State:**
- API routes handle data processing
- Mock databases for development
- External API integration
- Caching layer for performance

## 🎨 Styling Architecture

### Tailwind CSS Configuration

**Design System:**
- Consistent color palette
- Typography scale
- Spacing system
- Component variants

**Responsive Design:**
- Mobile-first approach
- Breakpoint system (sm, md, lg, xl)
- Flexible grid layouts
- Adaptive component sizing

### Component Styling Patterns

**Utility Classes:**
```css
.card {
  @apply rounded-lg border bg-card text-card-foreground shadow-sm;
}

.button-primary {
  @apply bg-primary text-primary-foreground hover:bg-primary/90;
}
```

## 🔧 Development Workflow

### Local Development Setup

1. **Install Dependencies**:
```bash
npm install
# or
bun install
```

2. **Start Development Server**:
```bash
npm run dev
# Runs on http://localhost:3000
```

3. **Build for Production**:
```bash
npm run build
npm run start
```

### Code Organization Principles

**File Naming:**
- `kebab-case` for files and folders
- `PascalCase` for React components
- `camelCase` for functions and variables

**Import Structure:**
```typescript
// External libraries
import React from 'react';
import { NextRequest } from 'next/server';

// Internal components
import { Button } from '@/components/ui/button';
import { HomeClient } from '@/components/home/home-client';

// Utilities and types
import { cn } from '@/lib/utils';
import type { ForecastData } from '@/types';
```

## 🔒 Security Implementation

### Data Protection
- Client-side data validation
- API route input sanitization
- CORS configuration
- Environment variable management

### Privacy Considerations
- No personal data collection
- Anonymous usage analytics
- Local data storage preference
- GDPR compliance ready

## 📱 Responsive Design Strategy

### Breakpoint System
- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+
- **Large**: 1440px+

### Component Adaptations
- Collapsible navigation on mobile
- Stacked layouts for small screens
- Touch-friendly interactive elements
- Optimized font sizes and spacing

## 🚀 Performance Optimization

### Next.js Optimizations
- **App Router** for improved performance
- **Server Components** for reduced bundle size
- **Image Optimization** with next/image
- **Font Optimization** with next/font

### Bundle Optimization
- **Tree Shaking** for unused code elimination
- **Code Splitting** for lazy loading
- **Dynamic Imports** for large components
- **Compression** for smaller payloads

### Runtime Performance
- **React 19 Features** for concurrent rendering
- **Memoization** for expensive calculations
- **Virtual Scrolling** for large datasets
- **Debounced Updates** for real-time features

## 🔄 Data Integration Patterns

### Real-time Updates
- **Polling Strategy** for extension data sync
- **WebSocket Connection** for live updates (future)
- **Server-Sent Events** for push notifications
- **Optimistic Updates** for better UX

### API Integration
- **Fetch API** with error handling
- **Retry Logic** for failed requests
- **Caching Strategy** for repeated calls
- **Rate Limiting** for external APIs

## 🧪 Testing Strategy

### Component Testing
- **React Testing Library** for component tests
- **Jest** for unit testing
- **Cypress** for end-to-end testing
- **Storybook** for component documentation

### API Testing
- **Supertest** for API route testing
- **Mock Service Worker** for API mocking
- **Integration Tests** for data flow
- **Performance Testing** for load handling

---

*This architecture provides a scalable, maintainable foundation for the Green Twin web application, supporting both current features and future enhancements.*
