function formatKg(n) {
  return `${n.toFixed(1)} kg CO₂e`;
}

function formatTimeRemaining(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function renderDelayItem(delay) {
  const timeRemaining = formatTimeRemaining(delay.timeRemaining);
  const savings = delay.potentialSavings;

  return `
    <div style="border:1px solid #e6e6e6; border-radius:8px; padding:8px; margin:6px 0; font-size:12px;">
      <div style="font-weight:600; margin-bottom:4px;">${delay.title.slice(0, 40)}${delay.title.length > 40 ? "..." : ""}</div>
      <div style="color:#666; margin-bottom:6px;">
        ⏰ ${timeRemaining} remaining • Save ~${savings.co2}kg CO₂ + $${savings.money}
      </div>
      <div style="display:flex; gap:6px;">
        <button onclick="completeDelay('${delay.delayId}', 'alternative')" style="flex:1; padding:4px 6px; font-size:11px; background:#10b981; border:none; border-radius:6px; color:white;">
          Find Alternative
        </button>
        <button onclick="completeDelay('${delay.delayId}', 'skipped')" style="flex:1; padding:4px 6px; font-size:11px; background:#ef4444; border:none; border-radius:6px; color:white;">
          Skip Purchase
        </button>
        <button onclick="completeDelay('${delay.delayId}', 'purchased')" style="padding:4px 6px; font-size:11px; background:#666; border:none; border-radius:6px; color:white;">
          Buy Anyway
        </button>
      </div>
    </div>
  `;
}

function completeDelay(delayId, outcome) {
  chrome.runtime.sendMessage(
    {
      type: "complete_delay",
      payload: { delayId, outcome },
    },
    () => {
      loadDelays(); // Refresh the delays list
    }
  );
}

function loadDelays() {
  chrome.runtime.sendMessage({ type: "get_active_delays" }, (response) => {
    const delaysCard = document.getElementById("delays-card");
    const delaysList = document.getElementById("delays-list");

    if (response.ok && response.delays.length > 0) {
      delaysCard.style.display = "block";
      delaysList.innerHTML = response.delays.map(renderDelayItem).join("");
    } else {
      delaysCard.style.display = "none";
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const kgEl = document.getElementById("kg");
  const itemsEl = document.getElementById("items");
  const flagsEl = document.getElementById("flags");
  const misinfo = document.getElementById("misinfo");
  const openBtn = document.getElementById("open-dashboard");

  chrome.runtime.sendMessage({ type: "get_stats" }, (stats) => {
    const totals = stats?.totals || {
      estKgMonth: 0,
      items: 0,
      misinfoFlags: 0,
    };
    kgEl.textContent = formatKg(totals.estKgMonth || 0);
    itemsEl.textContent = String(totals.items || 0);
    flagsEl.textContent = String(totals.misinfoFlags || 0);
    misinfo.checked = stats?.settings?.misinfoEnabled ?? true;
  });

  // Load active delays
  loadDelays();

  misinfo.addEventListener("change", () => {
    chrome.runtime.sendMessage(
      { type: "set_settings", payload: { misinfoEnabled: misinfo.checked } },
      () => {}
    );
  });

  openBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "/" });
  });
});

// Make completeDelay available globally for onclick handlers
window.completeDelay = completeDelay;
