# Chrome Extension Development Guide

## 🎯 Overview

The Green Twin Chrome Extension is the core tracking component that passively monitors user behavior and provides real-time carbon footprint insights. Built with Manifest V3 for modern Chrome compatibility.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Popup UI      │  Background     │    Content Scripts      │
│   (popup.html)  │  Service Worker │   (content.js,          │
│                 │  (background.js)│    misinfo.js)          │
├─────────────────┼─────────────────┼─────────────────────────┤
│ • Statistics    │ • Data Storage  │ • DOM Monitoring        │
│ • Settings      │ • Message Hub   │ • Product Extraction    │
│ • Dashboard     │ • API Calls     │ • Nudge Injection       │
│   Link          │ • Calculations  │ • Misinfo Detection     │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 📁 File Structure

```
public/extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (data management)
├── content.js            # Shopping/travel tracking
├── misinfo.js            # Misinformation detection
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── nudge.css             # Styling for on-page nudges
└── icons/                # Extension icons (16x16, 48x48, 128x128)
```

## ⚙️ Manifest V3 Configuration

### Core Manifest Settings

<augment_code_snippet path="public/extension/manifest.json" mode="EXCERPT">
````json
{
  "manifest_version": 3,
  "name": "Green Twin",
  "description": "Passive shopping/travel carbon tracking + misinformation detection with grid-aware nudges.",
  "version": "0.1.0",
  "action": {
    "default_title": "Green Twin",
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
````
</augment_code_snippet>

### Permissions & Host Access

**Required Permissions:**
- `storage` - Local data persistence
- `activeTab` - Current tab access for tracking
- `scripting` - Content script injection

**Host Permissions:**
- Amazon domains (`*.amazon.com/*`, `*.amazon.*/*`)
- Travel sites (`*.kayak.com/*`, `*.expedia.*/*`, `*.booking.com/*`)
- Google Flights (`www.google.com/travel/flights/*`)
- All HTTPS/HTTP sites for misinformation detection

## 🔧 Development Setup

### Prerequisites
- Chrome Browser (latest version)
- Code editor (VS Code recommended)
- Basic JavaScript/HTML/CSS knowledge

### Installation Steps

1. **Clone the project**:
```bash
git clone <repository-url>
cd GreenTwin
```

2. **Enable Developer Mode**:
   - Open Chrome → `chrome://extensions/`
   - Toggle "Developer mode" (top right)

3. **Load Extension**:
   - Click "Load unpacked"
   - Select `public/extension/` folder
   - Extension should appear in toolbar

4. **Pin Extension**:
   - Click puzzle piece icon in Chrome toolbar
   - Pin "Green Twin" for easy access

### Development Workflow

1. **Make code changes** in `public/extension/` files
2. **Reload extension** in `chrome://extensions/` (click refresh icon)
3. **Test functionality** on target websites
4. **Check console** for errors (`F12` → Console tab)
5. **Iterate** until features work correctly

## 🎨 Popup Interface Development

### HTML Structure

<augment_code_snippet path="public/extension/popup.html" mode="EXCERPT">
````html
<div class="card">
  <div class="title">🌿 Green Twin</div>
  <div class="muted">Passive tracker · Grid-aware nudges</div>
</div>

<div class="card" id="stats">
  <div class="row"><span>Monthly est. CO₂e</span><b id="kg">–</b></div>
  <div class="row"><span>Items tracked</span><b id="items">–</b></div>
  <div class="row"><span>Misinformation flags</span><b id="flags">–</b></div>
</div>
````
</augment_code_snippet>

### JavaScript Functionality

**Key Functions:**
- `formatKg()` - Format carbon values with units
- `chrome.runtime.sendMessage()` - Communicate with background script
- Real-time statistics updates
- Settings synchronization

## 🔄 Background Service Worker

### Data Management

<augment_code_snippet path="public/extension/background.js" mode="EXCERPT">
````javascript
const STORAGE_KEY = 'gt_stats_v1';

async function getStats() {
  const { [STORAGE_KEY]: data } = await chrome.storage.local.get(STORAGE_KEY);
  return data || {
    totals: { views: 0, items: 0, estKgMonth: 0, misinfoFlags: 0 },
    events: [],
    settings: { misinfoEnabled: true }
  };
}
````
</augment_code_snippet>

### Message Handling

**Supported Message Types:**
- `track_product_view` - Shopping activity tracking
- `track_travel_search` - Travel search monitoring
- `misinfo_flag` - Misinformation detection
- `get_stats` - Statistics retrieval

## 📊 Content Script Implementation

### Shopping Tracking Logic

**Product Detection:**
1. Monitor page loads on e-commerce sites
2. Extract product information via DOM queries
3. Calculate estimated carbon footprint
4. Display real-time nudges with alternatives
5. Send tracking data to background script

**Key Functions:**
- `usdFromText()` - Parse price from text
- `estimateProductKg()` - Calculate carbon footprint
- `shoppingNudge()` - Generate intervention HTML
- `injectNudge()` - Display nudge on page

### Travel Monitoring

**Flight Search Detection:**
1. Parse airport codes from URLs
2. Calculate flight distances using Haversine formula
3. Estimate CO2 emissions based on distance
4. Suggest alternative transportation
5. Track search behavior

## 🛡️ Misinformation Detection

### Pattern Matching

<augment_code_snippet path="public/extension/misinfo.js" mode="EXCERPT">
````javascript
const MISINFO_PATTERNS = [
  /climate change is a hoax/i,
  /global warming is fake/i,
  /co2 is plant food/i,
  /fossil fuels are clean/i
];
````
</augment_code_snippet>

### Detection Process

1. **Scan page text** using TreeWalker API
2. **Match patterns** against known misinformation
3. **Flag suspicious content** with visual indicators
4. **Track encounters** in user statistics
5. **Provide fact-check overlays** (future enhancement)

## 🎨 Styling & UI Guidelines

### Design Principles
- **Minimal Intrusion**: Nudges should be helpful, not annoying
- **Clear Hierarchy**: Important information stands out
- **Consistent Branding**: Green Twin visual identity
- **Accessibility**: WCAG 2.1 AA compliance

### CSS Architecture

**Nudge Styling:**
- Subtle shadows and rounded corners
- Green accent colors (`oklch(0.2 0 0)`)
- Readable typography (13px minimum)
- Responsive design for all screen sizes

## 🔧 Testing & Debugging

### Manual Testing Checklist

**Shopping Tracking:**
- [ ] Visit Amazon product page
- [ ] Verify nudge appears with CO2 estimate
- [ ] Check popup shows updated statistics
- [ ] Test "Add to Plan" functionality

**Travel Monitoring:**
- [ ] Search flights on Google Flights
- [ ] Verify route detection and CO2 calculation
- [ ] Check alternative suggestions appear
- [ ] Confirm tracking in popup statistics

**Misinformation Detection:**
- [ ] Visit page with climate misinformation
- [ ] Verify content gets flagged
- [ ] Check flag count in popup
- [ ] Test toggle on/off functionality

### Debugging Tools

**Chrome DevTools:**
- **Console**: `F12` → Console for error messages
- **Network**: Monitor API calls and data flow
- **Application**: Inspect local storage data
- **Sources**: Set breakpoints in extension code

**Extension-Specific:**
- **Extension Console**: Right-click extension → "Inspect popup"
- **Background Page**: `chrome://extensions/` → "Inspect views"
- **Content Script**: Regular page DevTools

## 🚀 Chrome Web Store Deployment

### Pre-Submission Checklist

**Code Quality:**
- [ ] All console errors resolved
- [ ] Performance optimized (<100ms response)
- [ ] Memory leaks eliminated
- [ ] Cross-browser compatibility tested

**Assets Required:**
- [ ] Extension icons (16x16, 48x48, 128x128 PNG)
- [ ] Screenshots (1280x800 or 640x400)
- [ ] Promotional images (440x280)
- [ ] Detailed description (up to 132 characters)

### Submission Process

1. **Create Developer Account** ($5 one-time fee)
2. **Prepare Extension Package** (ZIP all files)
3. **Upload to Chrome Web Store**
4. **Fill Store Listing** (description, screenshots, etc.)
5. **Submit for Review** (typically 1-3 days)
6. **Publish** once approved

### Store Optimization

**Title**: "Green Twin - AI Carbon Tracker"
**Description**: Focus on passive tracking and AI features
**Keywords**: carbon footprint, sustainability, climate, AI
**Category**: Productivity or Lifestyle

## 🔄 Update & Maintenance

### Version Management
- Increment version in `manifest.json`
- Document changes in release notes
- Test thoroughly before publishing updates
- Monitor user feedback and crash reports

### Performance Monitoring
- Track extension load times
- Monitor memory usage patterns
- Analyze user engagement metrics
- Optimize based on real-world usage data

---

*This development guide provides everything needed to build, test, and deploy the Green Twin Chrome Extension successfully.*
