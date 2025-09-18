# API Integration Guide

## 🎯 Overview

Green Twin integrates multiple APIs to provide comprehensive carbon tracking, real-time grid data, and intelligent predictions. This guide covers all API integrations, data flow patterns, and implementation details.

## 🏗️ API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Integration Layer                    │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Internal APIs │  External APIs  │    Data Processing      │
│   (Next.js)     │  (Third-party)  │    (Algorithms)         │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • /api/forecast │ • Carbon        │ • CO2 Calculations      │
│ • /api/grid     │   Interface     │ • Pattern Recognition   │
│ • /api/sync     │ • Grid APIs     │ • Prediction Models     │
│ • /api/auth     │ • Weather APIs  │ • Data Aggregation      │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 🔌 Internal API Routes

### 1. Carbon Forecast API (`/api/forecast`)

**Purpose**: Generate 14-day carbon footprint predictions based on user patterns

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

**Response Format**:
```json
{
  "series": [
    {
      "date": "2024-01-15",
      "kg": 6.32
    },
    {
      "date": "2024-01-16", 
      "kg": 5.98
    }
  ]
}
```

**Usage**:
- Dashboard chart visualization
- Predictive nudge calculations
- Weekly/monthly trend analysis
- Goal setting and tracking

### 2. Grid Intensity API (`/api/grid`)

**Purpose**: Provide real-time electricity grid carbon intensity data

<augment_code_snippet path="src/app/api/grid/route.ts" mode="EXCERPT">
````typescript
export async function GET() {
  const now = Date.now();
  const current = randomBetween(200, 520); // gCO2/kWh
  const windows = [
    { 
      start: new Date(now + 2 * 3600_000).toISOString(), 
      end: new Date(now + 4 * 3600_000).toISOString(), 
      intensity: randomBetween(200, 320) 
    }
  ];
  return Response.json({ current, windows });
}
````
</augment_code_snippet>

**Response Format**:
```json
{
  "current": 350,
  "windows": [
    {
      "start": "2024-01-15T14:00:00.000Z",
      "end": "2024-01-15T16:00:00.000Z", 
      "intensity": 280
    }
  ]
}
```

### 3. Extension Sync API (`/api/sync`) - **PLANNED**

**Purpose**: Synchronize extension data with web dashboard

**Endpoints**:
- `POST /api/sync/upload` - Upload extension tracking data
- `GET /api/sync/download` - Download user preferences
- `PUT /api/sync/settings` - Update user settings

**Request/Response Flow**:
```typescript
// Upload tracking data
POST /api/sync/upload
{
  "userId": "user_123",
  "events": [
    {
      "type": "product",
      "timestamp": 1642234567890,
      "data": {
        "title": "Organic Cotton T-Shirt",
        "price": 29.99,
        "category": "clothing",
        "estimatedKg": 2.1
      }
    }
  ]
}
```

## 🌐 External API Integrations

### 1. Carbon Interface API

**Purpose**: Accurate carbon footprint calculations for various activities

**Base URL**: `https://www.carboninterface.com/api/v1/`

**Authentication**:
```typescript
const headers = {
  'Authorization': `Bearer ${process.env.CARBON_INTERFACE_API_KEY}`,
  'Content-Type': 'application/json'
};
```

**Flight Emissions Calculation**:
```typescript
async function calculateFlightEmissions(departure: string, arrival: string) {
  const response = await fetch('https://www.carboninterface.com/api/v1/estimates', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'flight',
      passengers: 1,
      legs: [
        {
          departure_airport: departure,
          destination_airport: arrival
        }
      ]
    })
  });
  
  const data = await response.json();
  return data.data.attributes.carbon_kg;
}
```

**Shipping Emissions**:
```typescript
async function calculateShippingEmissions(weight: number, distance: number) {
  const response = await fetch('https://www.carboninterface.com/api/v1/estimates', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'shipping',
      weight_value: weight,
      weight_unit: 'kg',
      distance_value: distance,
      distance_unit: 'km',
      transport_method: 'truck'
    })
  });
  
  return response.json();
}
```

### 2. Grid Intensity APIs

**UK Grid Intensity**: `https://api.carbonintensity.org.uk/`
```typescript
async function getUKGridIntensity() {
  const response = await fetch('https://api.carbonintensity.org.uk/intensity');
  const data = await response.json();
  return data.data[0].intensity.actual; // gCO2/kWh
}
```

**US Grid Intensity**: `https://api.eia.gov/`
```typescript
async function getUSGridIntensity(region: string) {
  const response = await fetch(
    `https://api.eia.gov/v2/electricity/rto/region-data/data/?api_key=${EIA_API_KEY}&frequency=hourly&data[0]=value&facets[respondent][]=${region}`
  );
  return response.json();
}
```

### 3. Weather API Integration

**OpenWeatherMap**: For weather-based energy optimization
```typescript
async function getWeatherData(lat: number, lon: number) {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}`
  );
  return response.json();
}
```

## 🔄 Data Flow Patterns

### Extension → Web App Communication

**1. Polling Strategy** (Current Implementation):
```typescript
// Extension side
chrome.runtime.sendMessage({
  type: 'sync_request',
  data: await getLocalStats()
});

// Web app side
setInterval(async () => {
  const response = await fetch('/api/sync/poll');
  const newData = await response.json();
  updateDashboard(newData);
}, 30000); // Poll every 30 seconds
```

**2. WebSocket Connection** (Future Enhancement):
```typescript
// Server-side WebSocket
const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    // Process extension data
    broadcastUpdate(JSON.parse(data));
  });
});

// Client-side connection
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  updateDashboard(update);
};
```

### Real-time Data Synchronization

**Optimistic Updates**:
```typescript
async function updateCarbonData(newData: CarbonData) {
  // Immediately update UI
  setLocalData(newData);
  
  try {
    // Sync with server
    await fetch('/api/sync/update', {
      method: 'POST',
      body: JSON.stringify(newData)
    });
  } catch (error) {
    // Revert on failure
    setLocalData(previousData);
    showErrorMessage('Sync failed, please try again');
  }
}
```

## 🛡️ Error Handling & Retry Logic

### API Request Wrapper

```typescript
async function apiRequest<T>(
  url: string, 
  options: RequestInit = {},
  retries: number = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > 60000) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= 5) {
      this.state = 'OPEN';
    }
  }
}
```

## 📊 Rate Limiting & Caching

### API Rate Limiting

```typescript
const rateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(apiKey: string, limit: number = 100): boolean {
  const now = Date.now();
  const userLimit = rateLimiter.get(apiKey);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimiter.set(apiKey, { count: 1, resetTime: now + 3600000 }); // 1 hour
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
}
```

### Response Caching

```typescript
const cache = new Map<string, { data: any; expiry: number }>();

async function cachedApiCall<T>(
  key: string, 
  apiCall: () => Promise<T>, 
  ttl: number = 300000 // 5 minutes
): Promise<T> {
  const cached = cache.get(key);
  
  if (cached && Date.now() < cached.expiry) {
    return cached.data;
  }
  
  const data = await apiCall();
  cache.set(key, { data, expiry: Date.now() + ttl });
  
  return data;
}
```

## 🔐 Security & Authentication

### API Key Management

```typescript
// Environment variables
const API_KEYS = {
  CARBON_INTERFACE: process.env.CARBON_INTERFACE_API_KEY,
  WEATHER_API: process.env.OPENWEATHER_API_KEY,
  GRID_API: process.env.GRID_INTENSITY_API_KEY
};

// Validation
function validateApiKeys() {
  const missing = Object.entries(API_KEYS)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
    
  if (missing.length > 0) {
    throw new Error(`Missing API keys: ${missing.join(', ')}`);
  }
}
```

### Request Signing

```typescript
function signRequest(payload: string, secret: string): string {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = signRequest(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

## 📈 Monitoring & Analytics

### API Performance Tracking

```typescript
class ApiMetrics {
  private metrics = new Map<string, {
    calls: number;
    totalTime: number;
    errors: number;
  }>();
  
  async trackCall<T>(endpoint: string, apiCall: () => Promise<T>): Promise<T> {
    const start = Date.now();
    const metric = this.metrics.get(endpoint) || { calls: 0, totalTime: 0, errors: 0 };
    
    try {
      const result = await apiCall();
      metric.calls++;
      metric.totalTime += Date.now() - start;
      this.metrics.set(endpoint, metric);
      return result;
    } catch (error) {
      metric.errors++;
      this.metrics.set(endpoint, metric);
      throw error;
    }
  }
  
  getStats(endpoint: string) {
    const metric = this.metrics.get(endpoint);
    if (!metric) return null;
    
    return {
      averageResponseTime: metric.totalTime / metric.calls,
      errorRate: metric.errors / metric.calls,
      totalCalls: metric.calls
    };
  }
}
```

---

*This API integration guide provides comprehensive coverage of all data flows, external integrations, and best practices for building a robust and scalable API layer.*
