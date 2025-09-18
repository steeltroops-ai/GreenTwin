// Green Twin background service worker (MV3)
const STORAGE_KEY = 'gt_stats_v1';

async function getStats() {
  const { [STORAGE_KEY]: data } = await chrome.storage.local.get(STORAGE_KEY);
  return (
    data || {
      totals: { views: 0, items: 0, estKgMonth: 0, misinfoFlags: 0 },
      events: [], // {type, ts, meta, kg}
      settings: { misinfoEnabled: true }
    }
  );
}

async function setStats(next) {
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
}

chrome.runtime.onInstalled.addListener(() => {
  getStats().then((stats) => setStats(stats));
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const stats = await getStats();

    if (msg.type === 'track_product_view') {
      const { title, priceUSD, category, estKg } = msg.payload;
      stats.totals.views += 1;
      stats.totals.items += 1;
      stats.totals.estKgMonth += estKg;
      stats.events.unshift({ type: 'product', ts: Date.now(), meta: { title, priceUSD, category }, kg: estKg });
      await setStats(stats);
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === 'track_travel_search') {
      const { mode, from, to, distanceKm, estKg } = msg.payload;
      stats.totals.views += 1;
      stats.totals.estKgMonth += estKg;
      stats.events.unshift({ type: 'travel', ts: Date.now(), meta: { mode, from, to, distanceKm }, kg: estKg });
      await setStats(stats);
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === 'misinfo_flag') {
      stats.totals.misinfoFlags += 1;
      stats.events.unshift({ type: 'misinfo', ts: Date.now(), meta: { snippet: msg.payload?.text?.slice(0, 120) || '' }, kg: 0 });
      await setStats(stats);
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === 'get_stats') {
      sendResponse(await getStats());
      return;
    }

    if (msg.type === 'set_settings') {
      stats.settings = { ...stats.settings, ...msg.payload };
      await setStats(stats);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: 'Unknown message' });
  })();
  // Keep the message channel open for async response
  return true;
});