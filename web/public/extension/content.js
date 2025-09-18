// Content script for shopping/travel passive tracking with on-page nudges

let nudgeShown = false;
let nudgeOptimizer = null;
let predictiveInterventions = null;
let behaviorProfiler = null;
let adaptiveNudgeSelector = null;

// Initialize AI systems
async function initializeAISystems() {
  if (typeof NudgeTimingOptimizer !== "undefined") {
    nudgeOptimizer = new NudgeTimingOptimizer();
    await nudgeOptimizer.loadActivityPattern();
  }

  if (typeof PredictiveInterventions !== "undefined") {
    predictiveInterventions = new PredictiveInterventions();
  }

  if (typeof BehaviorProfiler !== "undefined") {
    behaviorProfiler = new BehaviorProfiler();
    console.log("Green Twin: Behavior profiler initialized");
  }

  if (typeof AdaptiveNudgeSelector !== "undefined" && behaviorProfiler) {
    adaptiveNudgeSelector = new AdaptiveNudgeSelector(behaviorProfiler);
    console.log("Green Twin: Adaptive nudge selector initialized");
  }
}

// Track page visits for predictive analysis
function trackPageVisit() {
  if (predictiveInterventions) {
    const timeSpent = performance.now(); // Approximate time spent
    predictiveInterventions.trackPageVisit(
      location.href,
      document.title,
      timeSpent
    );
  }
}

function usdFromText(text) {
  const m = (text || "").replace(/[,\s]/g, "").match(/\$?(\d+(?:\.\d{1,2})?)/);
  return m ? parseFloat(m[1]) : NaN;
}

function estimateKgForProduct(title, priceUSD, category) {
  // Very rough category multipliers (kg CO2e per $)
  const base = {
    electronics: 0.8,
    fashion: 0.5,
    grocery: 0.2,
    toy: 0.3,
    default: 0.35,
  };
  const key = /laptop|phone|tv|headphone|camera|ssd|gpu|console/i.test(title)
    ? "electronics"
    : /shirt|pants|jean|shoe|dress|jacket|cotton|poly/i.test(title)
      ? "fashion"
      : /beef|steak|cheese|milk|butter/i.test(title)
        ? "grocery"
        : /lego|toy|game/i.test(title)
          ? "toy"
          : category?.toLowerCase() || "default";
  const mult = base[key] || base.default;
  const est = Math.max(0.2, (isNaN(priceUSD) ? 25 : priceUSD) * mult);
  return Number(est.toFixed(2));
}

function estimateFlightKg(distanceKm) {
  // 0.115 kg CO2e per passenger-km (short/med haul incl. RFI ~1.9)
  return Number((distanceKm * 0.115).toFixed(1));
}

function injectNudge(root, html) {
  if (document.getElementById("gt-nudge")) return;
  const el = document.createElement("div");
  el.id = "gt-nudge";
  el.innerHTML = html;
  Object.assign(el.style, {
    position: "fixed",
    bottom: "16px",
    right: "16px",
    zIndex: 2147483647,
    maxWidth: "320px",
    fontFamily: "Inter, system-ui, sans-serif",
  });
  document.body.appendChild(el);
}

// Adaptive nudge HTML template
function adaptiveShoppingNudge(nudgeData, { title, estKg, priceUSD }) {
  const styleClass =
    nudgeData.style === "urgent"
      ? "gt-urgent"
      : nudgeData.style === "friendly"
        ? "gt-friendly"
        : nudgeData.style === "informative"
          ? "gt-informative"
          : "gt-direct";

  return `
    <div id="gt-nudge" class="gt-nudge ${styleClass}" style="
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      background: white; border: 2px solid #10b981; border-radius: 12px;
      padding: 16px; width: 320px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px; line-height: 1.4; color: #1f2937;
      animation: gtSlideIn 0.3s ease-out;
    ">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        ">
          <span style="color: white; font-size: 16px;">🌱</span>
        </div>
        <div style="flex: 1;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
            ${nudgeData.title}
          </h3>
          <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">
            ${nudgeData.message}
          </p>
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <button id="gt-add-plan" style="
              background: #10b981; color: white; border: none; border-radius: 6px;
              padding: 8px 12px; font-size: 12px; font-weight: 500; cursor: pointer;
              transition: background 0.2s;
            " onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
              ${nudgeData.action}
            </button>
            ${
              nudgeData.duration > 0
                ? `
              <button id="gt-snooze" style="
                background: #f3f4f6; color: #6b7280; border: none; border-radius: 6px;
                padding: 8px 12px; font-size: 12px; font-weight: 500; cursor: pointer;
                transition: background 0.2s;
              " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                Snooze
              </button>
            `
                : ""
            }
          </div>
          <div style="font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between;">
            <span>Impact: ${estKg}kg CO₂</span>
            <span>Confidence: ${Math.round(nudgeData.confidence * 100)}%</span>
          </div>
        </div>
        <button id="gt-close" style="
          background: none; border: none; color: #9ca3af; cursor: pointer;
          font-size: 18px; line-height: 1; padding: 0; width: 20px; height: 20px;
          display: flex; align-items: center; justify-content: center;
        " onmouseover="this.style.color='#6b7280'" onmouseout="this.style.color='#9ca3af'">
          ×
        </button>
      </div>
    </div>
    <style>
      @keyframes gtSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .gt-urgent { border-color: #ef4444 !important; }
      .gt-urgent h3 { color: #dc2626 !important; }
      .gt-friendly { border-color: #8b5cf6 !important; }
      .gt-informative { border-color: #3b82f6 !important; }
    </style>
  `;
}

// Original nudge HTML template (fallback)
function shoppingNudge({ title, estKg, priceUSD }) {
  const alt = /beef|steak/i.test(title)
    ? "Swap to lentils 1×/wk to cut ~18 kg/mo"
    : "Buy used/refurb to cut ~40–70% embodied CO₂e";
  const isHighImpact = estKg > 5 || priceUSD > 100;
  const potentialSavings = {
    co2: Math.round(estKg * 0.7 * 10) / 10,
    money: Math.round(priceUSD * 0.15 * 100) / 100,
  };

  return `
    <div style="background: oklch(0.98 0 0); border:1px solid oklch(0.92 0 0); padding:12px; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,.1)">
      <div style="display:flex; gap:8px; align-items:center;">
        <div style="width:28px;height:28px;display:grid;place-items:center;background:oklch(0.2 0 0);color:white;border-radius:8px">🌿</div>
        <div style="font-weight:600">Green Twin AI</div>
        ${isHighImpact ? '<div style="background:#ef4444;color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600">HIGH IMPACT</div>' : ""}
      </div>
      <div style="margin-top:8px; font-size:13px; color:oklch(0.55 0 0)">
        Estimated footprint: <b>${estKg} kg CO₂e</b>. ${alt}.
        ${isHighImpact ? `<br><strong>💡 Smart suggestion:</strong> Wait 24 hours? Save ~${potentialSavings.co2}kg CO₂ + $${potentialSavings.money}` : ""}
      </div>
      <div style="display:flex; gap:8px; margin-top:10px">
        ${
          isHighImpact
            ? `<button id="gt-delay-purchase" style="flex:1;padding:8px 10px;border-radius:10px;border:none;background:#10b981;color:white;font-weight:600">⏰ Delay 24h</button>`
            : `<button id="gt-add-plan" style="flex:1;padding:8px 10px;border-radius:10px;border:1px solid oklch(0.92 0 0);background:oklch(0.97 0 0)">Add to plan</button>`
        }
        <button id="gt-snooze" style="padding:8px 10px;border-radius:10px;border:1px solid oklch(0.92 0 0);background:#f59e0b;color:white">💤</button>
        <button id="gt-close" style="padding:8px 10px;border-radius:10px;border:1px solid oklch(0.92 0 0);background:white">Dismiss</button>
      </div>
      <div id="gt-snooze-options" style="display:none; margin-top:8px; padding:8px; background:#f9f9f9; border-radius:8px;">
        <div style="font-size:12px; margin-bottom:6px; font-weight:600;">Remind me in:</div>
        <div style="display:flex; gap:4px; flex-wrap:wrap;">
          <button class="gt-snooze-option" data-minutes="15" style="padding:4px 8px; border:1px solid #ddd; border-radius:6px; background:white; font-size:11px;">15 min</button>
          <button class="gt-snooze-option" data-minutes="60" style="padding:4px 8px; border:1px solid #ddd; border-radius:6px; background:white; font-size:11px;">1 hour</button>
          <button class="gt-snooze-option" data-minutes="240" style="padding:4px 8px; border:1px solid #ddd; border-radius:6px; background:white; font-size:11px;">4 hours</button>
          <button class="gt-snooze-option" data-minutes="tomorrow" style="padding:4px 8px; border:1px solid #ddd; border-radius:6px; background:white; font-size:11px;">Tomorrow</button>
        </div>
      </div>
    </div>`;
}

function travelNudge({ from, to, distanceKm, estKg }) {
  const swap =
    distanceKm < 800
      ? "Consider train/bus: <b>~85% lower</b> emissions"
      : "Choose nonstop + economy to reduce footprint";
  return `
    <div style="background: oklch(0.98 0 0); border:1px solid oklch(0.92 0 0); padding:12px; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,.1)">
      <div style="display:flex; gap:8px; align-items:center;">
        <div style="width:28px;height:28px;display:grid;place-items:center;background:oklch(0.2 0 0);color:white;border-radius:8px">⚡</div>
        <div style="font-weight:600">Grid-aware tip</div>
      </div>
      <div style="margin-top:8px; font-size:13px; color:oklch(0.55 0 0)">${from || "Origin"} → ${to || "Destination"} · ~${distanceKm} km ≈ <b>${estKg} kg CO₂e</b>. ${swap}.</div>
      <div style="display:flex; gap:8px; margin-top:10px">
        <button id="gt-add-plan" style="flex:1;padding:8px 10px;border-radius:10px;border:1px solid oklch(0.92 0 0);background:oklch(0.97 0 0)">Add to plan</button>
        <button id="gt-close" style="padding:8px 10px;border-radius:10px;border:1px solid oklch(0.92 0 0);background:white">Dismiss</button>
      </div>
    </div>`;
}

function haversineKm(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat),
    lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const airportDB = {
  SFO: { lat: 37.6213, lon: -122.379 },
  LAX: { lat: 33.9416, lon: -118.4085 },
  JFK: { lat: 40.6413, lon: -73.7781 },
  BOS: { lat: 42.3656, lon: -71.0096 },
  ORD: { lat: 41.9742, lon: -87.9073 },
  SEA: { lat: 47.4502, lon: -122.3088 },
  DEN: { lat: 39.8561, lon: -104.6737 },
  ATL: { lat: 33.6407, lon: -84.4277 },
  LHR: { lat: 51.47, lon: -0.4543 },
  CDG: { lat: 49.0097, lon: 2.5479 },
};

async function detectAmazon() {
  if (!/amazon\./.test(location.host)) return;

  // Initialize AI systems if not already done
  if (!nudgeOptimizer || !predictiveInterventions) {
    await initializeAISystems();
  }

  // Track page visit for predictive analysis
  trackPageVisit();

  const title =
    document.querySelector("#productTitle")?.textContent?.trim() ||
    document.title;
  const priceText =
    document.querySelector(
      "#corePrice_feature_div .a-offscreen, #priceblock_ourprice, #priceblock_dealprice"
    )?.textContent || "";
  const priceUSD = usdFromText(priceText);
  const category =
    document
      .querySelector("#wayfinding-breadcrumbs_feature_div a")
      ?.textContent?.trim() || "default";
  const estKg = estimateKgForProduct(title, priceUSD, category);

  // Track activity for timing optimization
  chrome.runtime.sendMessage({ type: "track_activity" });
  if (nudgeOptimizer) {
    nudgeOptimizer.trackUserActivity();
  }

  chrome.runtime.sendMessage({
    type: "track_product_view",
    payload: { title, priceUSD, category, estKg },
  });

  // Check if we should show nudge based on timing optimization
  const nudgeContext = {
    type:
      estKg > 5 || priceUSD > 100 ? "high_impact_purchase" : "regular_purchase",
    userEngagement: "high", // User is actively browsing product
    productData: { title, estKg, priceUSD, category },
  };

  // Use adaptive nudge selector if available, fallback to basic logic
  let nudgeResult = { show: true, reason: "default" };

  if (adaptiveNudgeSelector) {
    const context = {
      ...nudgeContext,
      emission_level: estKg,
      category: category,
      time_of_day: new Date().getHours(),
      url: window.location.href,
    };

    nudgeResult = adaptiveNudgeSelector.selectOptimalNudge(context);
  } else if (nudgeOptimizer) {
    nudgeResult = nudgeOptimizer.shouldShowNudge(nudgeContext);
  }

  if (!nudgeResult.show) {
    console.log(`Green Twin: Nudge not shown - ${nudgeResult.reason}`);

    // If timing is not optimal, schedule for later (fallback behavior)
    if (
      nudgeOptimizer &&
      (nudgeResult.reason === "high_activity" ||
        nudgeResult.reason === "nudge_fatigue")
    ) {
      const optimal = nudgeOptimizer.getOptimalNudgeTime(nudgeContext);
      if (optimal.shouldDelay) {
        nudgeOptimizer.scheduleDelayedNudge(
          nudgeContext,
          optimal.delayHours * 60 * 60 * 1000
        );
      }
    }
    return;
  }

  // Use adaptive nudge if available, otherwise use default
  const nudgeContent = nudgeResult.nudge
    ? adaptiveShoppingNudge(nudgeResult.nudge, { title, estKg, priceUSD })
    : shoppingNudge({ title, estKg, priceUSD });

  injectNudge(document.body, nudgeContent);
  const close = () => document.getElementById("gt-nudge")?.remove();

  document.getElementById("gt-close")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "track_nudge_interaction",
      payload: {
        nudgeType: "shopping",
        action: "dismissed",
        context: { title, estKg, priceUSD },
      },
    });

    // Record response in adaptive system
    if (adaptiveNudgeSelector && nudgeResult.nudge) {
      adaptiveNudgeSelector.recordNudgeResponse(nudgeResult.nudge.id, {
        type: "dismissed",
        timestamp: Date.now(),
      });
    } else if (nudgeOptimizer) {
      nudgeOptimizer.trackNudgeInteraction(
        "shopping",
        "dismissed",
        nudgeContext
      );
    }
    close();
  });

  document.getElementById("gt-add-plan")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "track_nudge_interaction",
      payload: {
        nudgeType: "shopping",
        action: "accepted",
        context: { title, estKg, priceUSD },
      },
    });

    // Record response in adaptive system
    if (adaptiveNudgeSelector && nudgeResult.nudge) {
      adaptiveNudgeSelector.recordNudgeResponse(nudgeResult.nudge.id, {
        type: "accepted",
        timestamp: Date.now(),
      });

      // Record potential outcome (estimated)
      setTimeout(() => {
        adaptiveNudgeSelector.recordNudgeOutcome(nudgeResult.nudge.id, {
          type: "purchase_delayed",
          co2_saved: estKg * 0.3, // Estimate 30% savings from delay
          timestamp: Date.now(),
        });
      }, 1000);
    } else if (nudgeOptimizer) {
      nudgeOptimizer.trackNudgeInteraction(
        "shopping",
        "accepted",
        nudgeContext
      );
    }

    alert("Saved to your Green Twin plan for later.");
    close();
  });

  // Handle snooze button
  document.getElementById("gt-snooze")?.addEventListener("click", () => {
    const snoozeOptions = document.getElementById("gt-snooze-options");
    snoozeOptions.style.display =
      snoozeOptions.style.display === "none" ? "block" : "none";
  });

  // Handle snooze option selection
  document.querySelectorAll(".gt-snooze-option").forEach((button) => {
    button.addEventListener("click", () => {
      const minutes = button.dataset.minutes;
      let snoozeMs;

      if (minutes === "tomorrow") {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        snoozeMs = tomorrow.getTime() - now.getTime();
      } else {
        snoozeMs = parseInt(minutes) * 60 * 1000;
      }

      if (nudgeOptimizer) {
        nudgeOptimizer.snoozeNudge(nudgeContext, snoozeMs);
      }

      chrome.runtime.sendMessage({
        type: "track_nudge_interaction",
        payload: {
          nudgeType: "shopping",
          action: "snoozed",
          context: { ...nudgeContext, snoozeMinutes: minutes },
        },
      });

      // Show snooze confirmation
      document.getElementById("gt-nudge").innerHTML = `
        <div style="background: #f59e0b; color: white; padding:12px; border-radius:12px; text-align:center;">
          <div style="font-weight:600; margin-bottom:4px;">💤 Nudge Snoozed</div>
          <div style="font-size:13px;">We'll remind you ${minutes === "tomorrow" ? "tomorrow at 9 AM" : `in ${minutes} minutes`}</div>
        </div>
      `;

      setTimeout(close, 2000);
    });
  });

  // Handle delay purchase button
  document
    .getElementById("gt-delay-purchase")
    ?.addEventListener("click", async () => {
      const productData = {
        title,
        priceUSD,
        estKg,
        category,
        url: location.href,
        imageUrl: document.querySelector("#landingImage")?.src || "",
      };

      try {
        const response = await chrome.runtime.sendMessage({
          type: "create_delay",
          payload: productData,
        });

        if (response.ok) {
          chrome.runtime.sendMessage({
            type: "track_nudge_interaction",
            payload: {
              nudgeType: "shopping",
              action: "delayed",
              context: { title, estKg, priceUSD },
            },
          });

          // Show success message
          document.getElementById("gt-nudge").innerHTML = `
          <div style="background: #10b981; color: white; padding:12px; border-radius:12px; text-align:center;">
            <div style="font-weight:600; margin-bottom:4px">⏰ Purchase Delayed!</div>
            <div style="font-size:13px">We'll remind you in 22 hours to reconsider. Check your extension popup to see alternatives!</div>
          </div>
        `;

          setTimeout(close, 3000);
        }
      } catch (error) {
        console.error("Failed to create delay:", error);
        alert("Failed to create delay. Please try again.");
      }
    });
}

function parseFlightParams() {
  const u = new URL(location.href);
  // heuristic: look for 3-letter codes in path
  const m = u.pathname.match(/([A-Z]{3})-([A-Z]{3})/i);
  if (m) return { from: m[1].toUpperCase(), to: m[2].toUpperCase() };
  return null;
}

function detectTravel() {
  if (!/travel|flights|kayak|expedia|booking/.test(location.href)) return;
  const codes = parseFlightParams();
  const from = codes?.from || "SFO";
  const to = codes?.to || "LAX";
  const a = airportDB[from] || airportDB["SFO"];
  const b = airportDB[to] || airportDB["LAX"];
  const distanceKm = haversineKm(a, b);
  const estKg = estimateFlightKg(distanceKm);
  chrome.runtime.sendMessage({
    type: "track_travel_search",
    payload: { mode: "flight", from, to, distanceKm, estKg },
  });
  injectNudge(document.body, travelNudge({ from, to, distanceKm, estKg }));
  document
    .getElementById("gt-close")
    ?.addEventListener("click", () =>
      document.getElementById("gt-nudge")?.remove()
    );
  document.getElementById("gt-add-plan")?.addEventListener("click", () => {
    alert("Added travel optimization to your plan.");
    document.getElementById("gt-nudge")?.remove();
  });
}

(async function init() {
  try {
    // Initialize AI systems first
    await initializeAISystems();

    // Then run detection
    detectAmazon();
  } catch (e) {
    console.error("Green Twin: Error in Amazon detection:", e);
  }
  try {
    detectTravel();
  } catch (e) {
    console.error("Green Twin: Error in travel detection:", e);
  }
})();
