# Deployment and DevOps Guide

## 🎯 Overview

This guide covers the complete deployment pipeline for Green Twin AI, including Chrome Web Store submission, web application deployment, CI/CD setup, and production monitoring.

## 🏗️ Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Architecture                  │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Chrome Store  │   Web App       │    Infrastructure       │
│   (Extension)   │   (Vercel)      │    (APIs & Monitoring)  │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • Extension     │ • Next.js App   │ • External APIs         │
│   Distribution  │ • Edge Functions│ • Database (Future)     │
│ • Auto Updates  │ • CDN Delivery  │ • Analytics             │
│ • User Reviews  │ • SSL/Security  │ • Error Tracking        │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 🌐 Web Application Deployment

### Vercel Deployment (Recommended)

**Prerequisites:**
- Vercel account (free tier available)
- GitHub repository with Next.js app
- Environment variables configured

**Deployment Steps:**

1. **Connect Repository**:
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel
```

2. **Environment Configuration**:
```bash
# Set production environment variables
vercel env add CARBON_INTERFACE_API_KEY
vercel env add OPENWEATHER_API_KEY
vercel env add GRID_INTENSITY_API_KEY
vercel env add NEXTAUTH_SECRET
```

3. **Custom Domain Setup**:
```bash
# Add custom domain
vercel domains add greentwin.ai
vercel alias set greentwin-ai.vercel.app greentwin.ai
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "chrome-extension://*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        }
      ]
    }
  ]
}
```

### Alternative Deployment Options

**Netlify Deployment:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=.next
```

**Railway Deployment:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway link
railway up
```

## 🔧 Chrome Extension Deployment

### Chrome Web Store Submission

**Prerequisites:**
- Google Developer Account ($5 one-time fee)
- Extension package prepared
- Store assets created

**Submission Process:**

1. **Prepare Extension Package**:
```bash
# Create production build
cd public/extension
zip -r green-twin-extension.zip .
```

2. **Required Assets**:
```
assets/
├── icon-16.png          # 16x16 toolbar icon
├── icon-48.png          # 48x48 management page icon
├── icon-128.png         # 128x128 Chrome Web Store icon
├── screenshot-1.png     # 1280x800 or 640x400
├── screenshot-2.png     # Additional screenshots
├── promotional-440.png  # 440x280 promotional image
└── promotional-920.png  # 920x680 promotional image (optional)
```

3. **Store Listing Information**:
```yaml
Name: "Green Twin - AI Carbon Tracker"
Summary: "Passive carbon footprint tracking with AI-powered climate insights"
Description: |
  Transform your environmental impact with Green Twin, the intelligent carbon 
  companion that passively tracks your digital footprint and provides 
  AI-powered insights to reduce emissions effortlessly.
  
  ✨ Key Features:
  • Passive tracking of shopping and travel searches
  • Real-time carbon footprint calculations
  • AI-powered misinformation detection
  • Personalized green alternatives
  • Grid-aware energy timing suggestions
  
Category: "Productivity"
Language: "English"
```

4. **Privacy Policy Requirements**:
```markdown
# Green Twin Privacy Policy

## Data Collection
- Shopping and travel search data (processed locally)
- Carbon footprint calculations (anonymous)
- Extension usage statistics (aggregated)

## Data Usage
- Provide personalized carbon insights
- Improve AI prediction accuracy
- Generate sustainability recommendations

## Data Storage
- All personal data stored locally in browser
- No personal information transmitted to servers
- Anonymous analytics only

## Third-Party Services
- Carbon calculation APIs (anonymous requests)
- Grid intensity data (public APIs)
```

### Extension Update Process

**Automated Updates:**
```json
{
  "manifest_version": 3,
  "version": "1.0.1",
  "update_url": "https://clients2.google.com/service/update2/crx"
}
```

**Version Management:**
```bash
# Update version in manifest.json
# Increment: 1.0.0 -> 1.0.1 (patch)
#           1.0.1 -> 1.1.0 (minor)
#           1.1.0 -> 2.0.0 (major)

# Create new package
zip -r green-twin-v1.0.1.zip public/extension/

# Upload to Chrome Web Store Developer Dashboard
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

**`.github/workflows/deploy.yml`:**
```yaml
name: Deploy Green Twin

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build

  deploy-web:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'

  package-extension:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Package Extension
        run: |
          cd public/extension
          zip -r ../../green-twin-extension.zip .
      
      - uses: actions/upload-artifact@v3
        with:
          name: extension-package
          path: green-twin-extension.zip
```

### Automated Testing

**Jest Configuration** (`jest.config.js`):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
```

**Test Scripts** (`package.json`):
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test"
  }
}
```

## 📊 Environment Configuration

### Environment Variables

**Development** (`.env.local`):
```bash
# API Keys
CARBON_INTERFACE_API_KEY=your_dev_key_here
OPENWEATHER_API_KEY=your_weather_key_here
GRID_INTENSITY_API_KEY=your_grid_key_here

# Database (Future)
DATABASE_URL=postgresql://localhost:5432/greentwin_dev

# Authentication (Future)
NEXTAUTH_SECRET=your_dev_secret_here
NEXTAUTH_URL=http://localhost:3000

# Analytics
GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
```

**Production** (Vercel Dashboard):
```bash
# Set via Vercel CLI or Dashboard
vercel env add CARBON_INTERFACE_API_KEY production
vercel env add OPENWEATHER_API_KEY production
vercel env add NEXTAUTH_SECRET production
```

### Secrets Management

**GitHub Secrets:**
```yaml
# Repository Settings > Secrets and Variables > Actions
VERCEL_TOKEN: "your_vercel_token"
ORG_ID: "your_vercel_org_id"
PROJECT_ID: "your_vercel_project_id"
CHROME_EXTENSION_ID: "your_extension_id"
CHROME_CLIENT_ID: "your_chrome_client_id"
CHROME_CLIENT_SECRET: "your_chrome_client_secret"
```

## 📈 Monitoring & Analytics

### Error Tracking (Sentry)

**Installation:**
```bash
npm install @sentry/nextjs @sentry/react
```

**Configuration** (`sentry.client.config.js`):
```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    // Filter out sensitive data
    if (event.user) {
      delete event.user.email;
    }
    return event;
  },
});
```

### Performance Monitoring

**Web Vitals Tracking:**
```typescript
// src/lib/analytics.ts
export function reportWebVitals(metric: any) {
  // Send to analytics service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: Math.round(metric.value),
      event_label: metric.id,
      non_interaction: true,
    });
  }
}
```

**Usage in `_app.tsx`:**
```typescript
import { reportWebVitals } from '@/lib/analytics';

export { reportWebVitals };
```

### Application Monitoring

**Health Check Endpoint** (`/api/health`):
```typescript
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    apis: {
      carbonInterface: await checkApiHealth('carbon-interface'),
      gridIntensity: await checkApiHealth('grid-intensity'),
    }
  };
  
  return Response.json(health);
}
```

### User Analytics

**Google Analytics 4:**
```typescript
// src/lib/gtag.ts
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

export const pageview = (url: string) => {
  window.gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

export const event = ({ action, category, label, value }: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};
```

## 🔒 Security & Compliance

### Security Headers

**Next.js Configuration:**
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### SSL/TLS Configuration

**Vercel (Automatic):**
- Automatic SSL certificate provisioning
- HTTP to HTTPS redirects
- HSTS headers enabled

**Custom Domain SSL:**
```bash
# Verify SSL configuration
curl -I https://greentwin.ai
# Should return: strict-transport-security header
```

## 🚀 Production Checklist

### Pre-Launch Checklist

**Code Quality:**
- [ ] All tests passing
- [ ] Code coverage >80%
- [ ] No console errors or warnings
- [ ] Performance optimized (Lighthouse score >90)
- [ ] Accessibility compliance (WCAG 2.1 AA)

**Security:**
- [ ] Environment variables secured
- [ ] API keys rotated for production
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Input validation implemented

**Monitoring:**
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Health checks implemented
- [ ] Analytics tracking setup
- [ ] Alerting rules configured

**Documentation:**
- [ ] API documentation complete
- [ ] User guides written
- [ ] Privacy policy published
- [ ] Terms of service finalized

### Launch Day Procedures

1. **Final Testing:**
   - Smoke tests on production environment
   - Extension functionality verification
   - API endpoint testing
   - Cross-browser compatibility check

2. **Monitoring Setup:**
   - Enable real-time alerts
   - Monitor error rates and performance
   - Track user adoption metrics
   - Watch for API rate limits

3. **Communication:**
   - Announce launch on social media
   - Send press release to tech blogs
   - Update project documentation
   - Notify beta users

---

*This deployment guide ensures a smooth, secure, and monitored launch of Green Twin AI across all platforms.*
