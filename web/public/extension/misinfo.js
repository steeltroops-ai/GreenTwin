// Advanced Misinformation Detection System with NLP Analysis

class AdvancedMisinfoDetector {
  constructor() {
    this.patterns = this.initializePatterns();
    this.contextualAnalyzer = new ContextualAnalyzer();
    this.confidenceScorer = new ConfidenceScorer();
    this.factCheckDatabase = new FactCheckDatabase();
    this.detectionHistory = [];
    this.isEnabled = true;

    this.loadSettings();
  }

  initializePatterns() {
    return {
      // Direct denial patterns (high confidence)
      denial: [
        {
          pattern: /climate change is a hoax/i,
          confidence: 0.95,
          category: "denial",
        },
        {
          pattern: /global warming is fake/i,
          confidence: 0.95,
          category: "denial",
        },
        {
          pattern: /climate change is natural/i,
          confidence: 0.85,
          category: "denial",
        },
        {
          pattern: /co2 is not a pollutant/i,
          confidence: 0.9,
          category: "denial",
        },
        {
          pattern: /greenhouse effect is a myth/i,
          confidence: 0.95,
          category: "denial",
        },
      ],

      // Misleading comparisons (medium-high confidence)
      misleading: [
        {
          pattern: /volcanoes emit more co2 than humans/i,
          confidence: 0.85,
          category: "misleading",
        },
        {
          pattern: /co2 is plant food/i,
          confidence: 0.8,
          category: "misleading",
        },
        {
          pattern: /ice age is coming/i,
          confidence: 0.75,
          category: "misleading",
        },
        {
          pattern: /solar activity causes warming/i,
          confidence: 0.7,
          category: "misleading",
        },
        {
          pattern: /medieval warm period was warmer/i,
          confidence: 0.75,
          category: "misleading",
        },
      ],

      // Economic misinformation (medium confidence)
      economic: [
        {
          pattern: /too expensive to transition/i,
          confidence: 0.65,
          category: "economic",
        },
        {
          pattern: /renewable energy is unreliable/i,
          confidence: 0.7,
          category: "economic",
        },
        {
          pattern: /wind turbines cause cancer/i,
          confidence: 0.9,
          category: "health",
        },
        {
          pattern: /electric cars are worse for environment/i,
          confidence: 0.75,
          category: "economic",
        },
      ],

      // Conspiracy theories (high confidence)
      conspiracy: [
        { pattern: /climate agenda/i, confidence: 0.8, category: "conspiracy" },
        { pattern: /climate cult/i, confidence: 0.85, category: "conspiracy" },
        { pattern: /climate scam/i, confidence: 0.85, category: "conspiracy" },
        {
          pattern: /weather manipulation/i,
          confidence: 0.75,
          category: "conspiracy",
        },
      ],
    };
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get("gt_stats_v1");
      this.isEnabled = result?.gt_stats_v1?.settings?.misinfoEnabled ?? true;
    } catch (error) {
      console.error("Green Twin: Failed to load misinfo settings:", error);
    }
  }

  async analyzeContent(text, context = {}) {
    if (!this.isEnabled || text.length < 20) return null;

    const analysis = {
      text: text.slice(0, 500), // Limit text length
      timestamp: Date.now(),
      url: window.location.href,
      context,
      detections: [],
      overallConfidence: 0,
      category: null,
      factChecks: [],
      explanation: null,
    };

    // Pattern-based detection
    const patternResults = this.detectPatterns(text);
    analysis.detections.push(...patternResults);

    // Contextual analysis
    const contextualResults = await this.contextualAnalyzer.analyze(
      text,
      context
    );
    if (contextualResults.isSuspicious) {
      analysis.detections.push(contextualResults);
    }

    // Calculate overall confidence
    if (analysis.detections.length > 0) {
      analysis.overallConfidence =
        this.confidenceScorer.calculateOverallConfidence(analysis.detections);
      analysis.category = this.getMostLikelyCategory(analysis.detections);

      // Get fact-check information
      analysis.factChecks = await this.factCheckDatabase.getRelevantFactChecks(
        text,
        analysis.category
      );

      // Generate explanation
      analysis.explanation = this.generateExplanation(analysis);
    }

    return analysis.overallConfidence > 0.6 ? analysis : null;
  }

  detectPatterns(text) {
    const detections = [];

    Object.entries(this.patterns).forEach(([type, patterns]) => {
      patterns.forEach(({ pattern, confidence, category }) => {
        const matches = text.match(pattern);
        if (matches) {
          detections.push({
            type: "pattern",
            pattern: pattern.source,
            confidence,
            category,
            matches: matches.map((m) => m.toLowerCase()),
            method: "regex",
          });
        }
      });
    });

    return detections;
  }

  getMostLikelyCategory(detections) {
    const categoryScores = {};

    detections.forEach((detection) => {
      const category = detection.category || "general";
      categoryScores[category] =
        (categoryScores[category] || 0) + detection.confidence;
    });

    return (
      Object.entries(categoryScores).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "general"
    );
  }

  generateExplanation(analysis) {
    const category = analysis.category;
    const confidence = analysis.overallConfidence;

    const explanations = {
      denial:
        "This content appears to deny established climate science. The scientific consensus on climate change is supported by overwhelming evidence.",
      misleading:
        "This content contains misleading information about climate science. While it may contain partial truths, the overall message misrepresents scientific findings.",
      economic:
        "This content makes unsupported claims about the economics of climate action. Economic analyses show that climate action is cost-effective.",
      conspiracy:
        "This content promotes conspiracy theories about climate science. Climate research is conducted by thousands of independent scientists worldwide.",
      health:
        "This content makes false health claims related to clean energy technologies. These technologies are safe and well-regulated.",
      general:
        "This content contains potential climate misinformation that contradicts established scientific evidence.",
    };

    let explanation = explanations[category] || explanations.general;

    if (confidence > 0.9) {
      explanation += " This appears to be clear misinformation.";
    } else if (confidence > 0.75) {
      explanation += " This likely contains misinformation.";
    } else {
      explanation += " This may contain misleading information.";
    }

    return explanation;
  }

  createFactCheckOverlay(analysis, element) {
    const overlay = document.createElement("div");
    overlay.className = "gt-misinfo-overlay";
    overlay.innerHTML = `
      <div class="gt-misinfo-header">
        <span class="gt-misinfo-icon">⚠️</span>
        <span class="gt-misinfo-title">Potential Climate Misinformation</span>
        <span class="gt-misinfo-confidence">${Math.round(analysis.overallConfidence * 100)}% confidence</span>
      </div>
      <div class="gt-misinfo-explanation">
        ${analysis.explanation}
      </div>
      <div class="gt-misinfo-actions">
        <button class="gt-fact-check-btn">View Fact Checks</button>
        <button class="gt-dismiss-btn">Dismiss</button>
      </div>
    `;

    // Add styles
    this.addOverlayStyles();

    // Add event listeners
    overlay
      .querySelector(".gt-fact-check-btn")
      .addEventListener("click", () => {
        this.showFactCheckModal(analysis);
      });

    overlay.querySelector(".gt-dismiss-btn").addEventListener("click", () => {
      overlay.remove();
      this.recordUserFeedback(analysis.timestamp, "dismissed");
    });

    return overlay;
  }

  addOverlayStyles() {
    if (document.getElementById("gt-misinfo-styles")) return;

    const styles = document.createElement("style");
    styles.id = "gt-misinfo-styles";
    styles.textContent = `
      .gt-misinfo-overlay {
        position: absolute;
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        border: 2px solid #f59e0b;
        border-radius: 8px;
        padding: 12px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
      }

      .gt-misinfo-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        font-weight: 600;
      }

      .gt-misinfo-icon {
        font-size: 16px;
      }

      .gt-misinfo-title {
        flex: 1;
        color: #92400e;
      }

      .gt-misinfo-confidence {
        background: #f59e0b;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
      }

      .gt-misinfo-explanation {
        color: #78350f;
        margin-bottom: 12px;
      }

      .gt-misinfo-actions {
        display: flex;
        gap: 8px;
      }

      .gt-fact-check-btn, .gt-dismiss-btn {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
      }

      .gt-fact-check-btn {
        background: #3b82f6;
        color: white;
      }

      .gt-dismiss-btn {
        background: #6b7280;
        color: white;
      }

      .gt-misinfo-highlight {
        background: linear-gradient(90deg, rgba(251,191,36,0.3), rgba(251,191,36,0.1));
        border-bottom: 2px dashed #f59e0b;
        cursor: help;
        position: relative;
      }
    `;

    document.head.appendChild(styles);
  }

  showFactCheckModal(analysis) {
    const modal = document.createElement("div");
    modal.className = "gt-fact-check-modal";
    modal.innerHTML = `
      <div class="gt-modal-backdrop">
        <div class="gt-modal-content">
          <div class="gt-modal-header">
            <h3>Fact Check Information</h3>
            <button class="gt-modal-close">×</button>
          </div>
          <div class="gt-modal-body">
            <div class="gt-analysis-summary">
              <h4>Analysis Summary</h4>
              <p><strong>Category:</strong> ${analysis.category}</p>
              <p><strong>Confidence:</strong> ${Math.round(analysis.overallConfidence * 100)}%</p>
              <p><strong>Explanation:</strong> ${analysis.explanation}</p>
            </div>

            ${
              analysis.factChecks.length > 0
                ? `
              <div class="gt-fact-checks">
                <h4>Related Fact Checks</h4>
                ${analysis.factChecks
                  .map(
                    (fc) => `
                  <div class="gt-fact-check-item">
                    <h5>${fc.title}</h5>
                    <p>${fc.summary}</p>
                    <a href="${fc.url}" target="_blank">Read more →</a>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
                : ""
            }

            <div class="gt-sources">
              <h4>Reliable Sources</h4>
              <ul>
                <li><a href="https://www.ipcc.ch/" target="_blank">IPCC - Intergovernmental Panel on Climate Change</a></li>
                <li><a href="https://climate.nasa.gov/" target="_blank">NASA Climate Change</a></li>
                <li><a href="https://www.noaa.gov/climate" target="_blank">NOAA Climate.gov</a></li>
                <li><a href="https://www.skepticalscience.com/" target="_blank">Skeptical Science</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    this.addModalStyles();
    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector(".gt-modal-close").addEventListener("click", () => {
      modal.remove();
    });

    modal.querySelector(".gt-modal-backdrop").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        modal.remove();
      }
    });

    this.recordUserFeedback(analysis.timestamp, "fact_check_viewed");
  }

  addModalStyles() {
    if (document.getElementById("gt-modal-styles")) return;

    const styles = document.createElement("style");
    styles.id = "gt-modal-styles";
    styles.textContent = `
      .gt-fact-check-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100000;
      }

      .gt-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .gt-modal-content {
        background: white;
        border-radius: 12px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      }

      .gt-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
      }

      .gt-modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }

      .gt-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .gt-modal-body {
        padding: 20px;
      }

      .gt-analysis-summary, .gt-fact-checks, .gt-sources {
        margin-bottom: 24px;
      }

      .gt-analysis-summary h4, .gt-fact-checks h4, .gt-sources h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #111827;
      }

      .gt-fact-check-item {
        background: #f9fafb;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 12px;
      }

      .gt-fact-check-item h5 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #111827;
      }

      .gt-fact-check-item p {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #6b7280;
        line-height: 1.5;
      }

      .gt-fact-check-item a {
        color: #3b82f6;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
      }

      .gt-sources ul {
        margin: 0;
        padding-left: 20px;
      }

      .gt-sources li {
        margin-bottom: 8px;
      }

      .gt-sources a {
        color: #3b82f6;
        text-decoration: none;
      }
    `;

    document.head.appendChild(styles);
  }

  async recordUserFeedback(timestamp, action) {
    try {
      await chrome.runtime.sendMessage({
        type: "misinfo_feedback",
        payload: { timestamp, action },
      });
    } catch (error) {
      console.error("Green Twin: Failed to record feedback:", error);
    }
  }

  async flagContent(element, analysis) {
    // Create highlight
    const highlight = document.createElement("span");
    highlight.className = "gt-misinfo-highlight";
    highlight.textContent = element.textContent;
    highlight.title = `Potential misinformation (${Math.round(analysis.overallConfidence * 100)}% confidence)`;

    // Replace original element
    element.replaceWith(highlight);

    // Add click handler for overlay
    highlight.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Remove existing overlays
      document
        .querySelectorAll(".gt-misinfo-overlay")
        .forEach((o) => o.remove());

      // Create and position overlay
      const overlay = this.createFactCheckOverlay(analysis, highlight);
      const rect = highlight.getBoundingClientRect();

      overlay.style.position = "fixed";
      overlay.style.top = `${rect.bottom + 10}px`;
      overlay.style.left = `${Math.max(10, rect.left)}px`;

      document.body.appendChild(overlay);

      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 10000);
    });

    // Record detection
    this.detectionHistory.push({
      timestamp: analysis.timestamp,
      url: analysis.url,
      confidence: analysis.overallConfidence,
      category: analysis.category,
      text: analysis.text.slice(0, 100),
    });

    // Send to background script
    try {
      await chrome.runtime.sendMessage({
        type: "misinfo_flag",
        payload: {
          text: analysis.text,
          confidence: analysis.overallConfidence,
          category: analysis.category,
          url: analysis.url,
        },
      });
    } catch (error) {
      console.error("Green Twin: Failed to send misinfo flag:", error);
    }
  }
}

// Supporting classes for advanced misinformation detection

class ContextualAnalyzer {
  constructor() {
    this.suspiciousContexts = [
      "social media post",
      "comment section",
      "blog post",
      "opinion article",
      "forum discussion",
    ];

    this.credibleSources = [
      "nasa.gov",
      "noaa.gov",
      "ipcc.ch",
      "nature.com",
      "science.org",
      "climate.gov",
      "epa.gov",
    ];
  }

  async analyze(text, context) {
    const analysis = {
      isSuspicious: false,
      confidence: 0,
      factors: [],
      method: "contextual",
    };

    // Check source credibility
    const domain = window.location.hostname.toLowerCase();
    const isCredibleSource = this.credibleSources.some((source) =>
      domain.includes(source)
    );

    if (isCredibleSource) {
      analysis.confidence -= 0.3; // Reduce suspicion for credible sources
      analysis.factors.push("credible_source");
    }

    // Check for emotional language
    const emotionalWords =
      /\b(hoax|scam|lie|fake|fraud|conspiracy|agenda|cult)\b/gi;
    const emotionalMatches = text.match(emotionalWords);
    if (emotionalMatches && emotionalMatches.length > 2) {
      analysis.confidence += 0.2;
      analysis.factors.push("emotional_language");
    }

    // Check for lack of scientific citations
    const hasCitations =
      /\b(study|research|journal|peer.?review|doi|citation)\b/i.test(text);
    if (!hasCitations && text.length > 200) {
      analysis.confidence += 0.15;
      analysis.factors.push("no_citations");
    }

    // Check for absolute statements
    const absoluteStatements =
      /\b(never|always|all|none|completely|totally|absolutely)\b/gi;
    const absoluteMatches = text.match(absoluteStatements);
    if (absoluteMatches && absoluteMatches.length > 3) {
      analysis.confidence += 0.1;
      analysis.factors.push("absolute_statements");
    }

    analysis.isSuspicious = analysis.confidence > 0.3;
    return analysis;
  }
}

class ConfidenceScorer {
  calculateOverallConfidence(detections) {
    if (detections.length === 0) return 0;

    // Weight different detection methods
    const weights = {
      pattern: 1.0,
      contextual: 0.7,
      semantic: 0.8,
      source: 0.6,
    };

    let totalScore = 0;
    let totalWeight = 0;

    detections.forEach((detection) => {
      const weight = weights[detection.method] || 0.5;
      totalScore += detection.confidence * weight;
      totalWeight += weight;
    });

    const baseConfidence = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Apply multipliers based on detection count
    let multiplier = 1.0;
    if (detections.length > 2) multiplier = 1.2;
    if (detections.length > 4) multiplier = 1.4;

    // Cap at 0.98 to avoid overconfidence
    return Math.min(0.98, baseConfidence * multiplier);
  }
}

class FactCheckDatabase {
  constructor() {
    this.factChecks = this.initializeFactChecks();
  }

  initializeFactChecks() {
    return {
      denial: [
        {
          title: "Climate Change is Real and Human-Caused",
          summary:
            "97% of climate scientists agree that climate change is real and primarily caused by human activities.",
          url: "https://climate.nasa.gov/scientific-consensus/",
          keywords: ["hoax", "fake", "natural"],
        },
        {
          title: "CO2 is a Greenhouse Gas",
          summary:
            "Carbon dioxide is scientifically established as a greenhouse gas that traps heat in Earth's atmosphere.",
          url: "https://www.epa.gov/ghgemissions/overview-greenhouse-gases",
          keywords: ["co2", "pollutant", "greenhouse"],
        },
      ],
      misleading: [
        {
          title: "Human vs Natural CO2 Emissions",
          summary:
            "While volcanoes do emit CO2, human activities emit about 100 times more CO2 than volcanoes each year.",
          url: "https://www.climate.gov/news-features/climate-qa/which-emits-more-carbon-dioxide-volcanoes-or-human-activities",
          keywords: ["volcano", "natural", "co2"],
        },
        {
          title: "CO2 and Plant Growth",
          summary:
            "While plants use CO2, the 'CO2 is plant food' argument ignores limiting factors like water, nutrients, and temperature.",
          url: "https://www.skepticalscience.com/co2-plant-food.htm",
          keywords: ["plant food", "co2", "growth"],
        },
      ],
      economic: [
        {
          title: "Cost of Climate Action vs Inaction",
          summary:
            "Economic studies show that the cost of climate action is far less than the cost of climate inaction.",
          url: "https://www.ipcc.ch/report/ar6/wg3/",
          keywords: ["expensive", "cost", "economy"],
        },
      ],
      health: [
        {
          title: "Wind Turbine Health Effects",
          summary:
            "Scientific studies have found no evidence that wind turbines cause cancer or other serious health effects.",
          url: "https://www.cancer.org/cancer/cancer-causes/radiation-exposure/radiofrequency-radiation.html",
          keywords: ["wind turbine", "cancer", "health"],
        },
      ],
    };
  }

  async getRelevantFactChecks(text, category) {
    const categoryFactChecks = this.factChecks[category] || [];
    const relevantChecks = [];

    categoryFactChecks.forEach((factCheck) => {
      const isRelevant = factCheck.keywords.some((keyword) =>
        text.toLowerCase().includes(keyword.toLowerCase())
      );

      if (isRelevant) {
        relevantChecks.push(factCheck);
      }
    });

    // Add general fact checks if none found
    if (relevantChecks.length === 0 && category !== "general") {
      relevantChecks.push({
        title: "Climate Science Consensus",
        summary:
          "There is overwhelming scientific consensus that climate change is real and primarily caused by human activities.",
        url: "https://www.ipcc.ch/",
        keywords: ["climate", "science"],
      });
    }

    return relevantChecks.slice(0, 3); // Limit to 3 fact checks
  }
}

// Main scanning and initialization
class MisinfoScanner {
  constructor() {
    this.detector = new AdvancedMisinfoDetector();
    this.scanInterval = null;
    this.processedNodes = new WeakSet();
  }

  async scan() {
    if (!this.detector.isEnabled) return;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip if already processed
          if (this.processedNodes.has(node)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip short text nodes
          if (!node.textContent || node.textContent.trim().length < 30) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip script and style elements
          const parent = node.parentElement;
          if (
            parent &&
            ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let node;
    let processedCount = 0;
    const maxProcessPerScan = 50; // Limit processing to avoid performance issues

    while ((node = walker.nextNode()) && processedCount < maxProcessPerScan) {
      try {
        await this.processTextNode(node);
        this.processedNodes.add(node);
        processedCount++;
      } catch (error) {
        console.error("Green Twin: Error processing text node:", error);
      }
    }
  }

  async processTextNode(node) {
    const text = node.textContent.trim();
    if (text.length < 30) return;

    const context = {
      element_type: node.parentElement?.tagName?.toLowerCase(),
      page_url: window.location.href,
      domain: window.location.hostname,
    };

    const analysis = await this.detector.analyzeContent(text, context);

    if (analysis && analysis.overallConfidence > 0.6) {
      await this.detector.flagContent(node, analysis);
    }
  }

  startContinuousScanning() {
    // Initial scan
    this.scan();

    // Set up periodic scanning for dynamic content
    this.scanInterval = setInterval(() => {
      this.scan();
    }, 5000); // Scan every 5 seconds

    // Set up mutation observer for immediate detection of new content
    const observer = new MutationObserver((mutations) => {
      let hasNewText = false;

      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeType === Node.TEXT_NODE ||
              (node.nodeType === Node.ELEMENT_NODE && node.textContent)
            ) {
              hasNewText = true;
            }
          });
        }
      });

      if (hasNewText) {
        // Debounce scanning
        clearTimeout(this.scanTimeout);
        this.scanTimeout = setTimeout(() => this.scan(), 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  stopScanning() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }
}

// Initialize the scanner
let misinfoScanner;

chrome.storage?.local.get("gt_stats_v1", (res) => {
  const enabled = res?.gt_stats_v1?.settings?.misinfoEnabled ?? true;
  if (enabled) {
    misinfoScanner = new MisinfoScanner();
    misinfoScanner.startContinuousScanning();
    console.log("Green Twin: Advanced misinformation detection initialized");
  }
});

// Listen for settings changes
chrome.runtime?.onMessage?.addListener((message, sender, sendResponse) => {
  if (
    message.type === "settings_changed" &&
    message.payload.misinfoEnabled !== undefined
  ) {
    if (message.payload.misinfoEnabled) {
      if (!misinfoScanner) {
        misinfoScanner = new MisinfoScanner();
        misinfoScanner.startContinuousScanning();
      }
    } else {
      if (misinfoScanner) {
        misinfoScanner.stopScanning();
        misinfoScanner = null;
      }
      // Remove existing highlights
      document.querySelectorAll(".gt-misinfo-highlight").forEach((el) => {
        el.replaceWith(document.createTextNode(el.textContent));
      });
    }
  }
});
