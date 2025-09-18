// Content script for shopping/travel passive tracking with on-page nudges

function usdFromText(text) {
  const m = (text || '').replace(/[,\s]/g, '').match(/\$?(\d+(?:\.\d{1,2})?)/);
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
  const key = /laptop|phone|tv|headphone|camera|ssd|gpu|console/i.test(title) ? 'electronics'
    : /shirt|pants|jean|shoe|dress|jacket|cotton|poly/i.test(title) ? 'fashion'
    : /beef|steak|cheese|milk|butter/i.test(title) ? 'grocery'
    : /lego|toy|game/i.test(title) ? 'toy'
    : (category?.toLowerCase() || 'default');
  const mult = base[key] || base.default;
  const est = Math.max(0.2, (isNaN(priceUSD) ? 25 : priceUSD) * mult);
  return Number(est.toFixed(2));
}

function estimateFlightKg(distanceKm) {
  // 0.115 kg CO2e per passenger-km (short/med haul incl. RFI ~1.9)
  return Number((distanceKm * 0.115).toFixed(1));
}

function injectNudge(root, html) {
  if (document.getElementById('gt-nudge')) return;
  const el = document.createElement('div');
  el.id = 'gt-nudge';
  el.innerHTML = html;
  Object.assign(el.style, {
    position: 'fixed', bottom: '16px', right: '16px', zIndex: 2147483647,
    maxWidth: '320px', fontFamily: 'Inter, system-ui, sans-serif'
  });
  document.body.appendChild(el);
}

function shoppingNudge({ title, estKg }) {
  const alt = /beef|steak/i.test(title) ? 'Swap to lentils 1×/wk to cut ~18 kg/mo' : 'Buy used/refurb to cut ~40–70% embodied CO₂e';
  return `
    <div style="background: oklch(0.98 0 0); border:1px solid oklch(0.92 0 0); padding:12px; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,.1)">
      <div style="display:flex; gap:8px; align-items:center;">
        <div style="width:28px;height:28px;display:grid;place-items:center;background:oklch(0.2 0 0);color:white;border-radius:8px">🌿</div>
        <div style="font-weight:600">Green Twin</div>
      </div>
      <div style="margin-top:8px; font-size:13px; color:oklch(0.55 0 0)">Estimated footprint: <b>${estKg} kg CO₂e</b>. ${alt}.</div>
      <div style="display:flex; gap:8px; margin-top:10px">
        <button id="gt-add-plan" style="flex:1;padding:8px 10px;border-radius:10px;border:1px solid oklch(0.92 0 0);background:oklch(0.97 0 0)">Add to plan</button>
        <button id="gt-close" style="padding:8px 10px;border-radius:10px;border:1px solid oklch(0.92 0 0);background:white">Dismiss</button>
      </div>
    </div>`;
}

function travelNudge({ from, to, distanceKm, estKg }) {
  const swap = distanceKm < 800 ? 'Consider train/bus: <b>~85% lower</b> emissions' : 'Choose nonstop + economy to reduce footprint';
  return `
    <div style="background: oklch(0.98 0 0); border:1px solid oklch(0.92 0 0); padding:12px; border-radius:12px; box-shadow:0 6px 20px rgba(0,0,0,.1)">
      <div style="display:flex; gap:8px; align-items:center;">
        <div style="width:28px;height:28px;display:grid;place-items:center;background:oklch(0.2 0 0);color:white;border-radius:8px">⚡</div>
        <div style="font-weight:600">Grid-aware tip</div>
      </div>
      <div style="margin-top:8px; font-size:13px; color:oklch(0.55 0 0)">${from || 'Origin'} → ${to || 'Destination'} · ~${distanceKm} km ≈ <b>${estKg} kg CO₂e</b>. ${swap}.</div>
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
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const airportDB = {
  SFO:{lat:37.6213,lon:-122.379}, LAX:{lat:33.9416,lon:-118.4085}, JFK:{lat:40.6413,lon:-73.7781}, BOS:{lat:42.3656,lon:-71.0096}, ORD:{lat:41.9742,lon:-87.9073}, SEA:{lat:47.4502,lon:-122.3088}, DEN:{lat:39.8561,lon:-104.6737}, ATL:{lat:33.6407,lon:-84.4277}, LHR:{lat:51.4700,lon:-0.4543}, CDG:{lat:49.0097,lon:2.5479}
};

function detectAmazon() {
  if (!/amazon\./.test(location.host)) return;
  const title = document.querySelector('#productTitle')?.textContent?.trim() || document.title;
  const priceText = document.querySelector('#corePrice_feature_div .a-offscreen, #priceblock_ourprice, #priceblock_dealprice')?.textContent || '';
  const priceUSD = usdFromText(priceText);
  const category = document.querySelector('#wayfinding-breadcrumbs_feature_div a')?.textContent?.trim() || 'default';
  const estKg = estimateKgForProduct(title, priceUSD, category);

  chrome.runtime.sendMessage({ type: 'track_product_view', payload: { title, priceUSD, category, estKg } });
  injectNudge(document.body, shoppingNudge({ title, estKg }));
  const close = () => document.getElementById('gt-nudge')?.remove();
  document.getElementById('gt-close')?.addEventListener('click', close);
  document.getElementById('gt-add-plan')?.addEventListener('click', () => {
    alert('Saved to your Green Twin plan for later.');
    close();
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
  const from = codes?.from || 'SFO';
  const to = codes?.to || 'LAX';
  const a = airportDB[from] || airportDB['SFO'];
  const b = airportDB[to] || airportDB['LAX'];
  const distanceKm = haversineKm(a, b);
  const estKg = estimateFlightKg(distanceKm);
  chrome.runtime.sendMessage({ type: 'track_travel_search', payload: { mode: 'flight', from, to, distanceKm, estKg } });
  injectNudge(document.body, travelNudge({ from, to, distanceKm, estKg }));
  document.getElementById('gt-close')?.addEventListener('click', () => document.getElementById('gt-nudge')?.remove());
  document.getElementById('gt-add-plan')?.addEventListener('click', () => {
    alert('Added travel optimization to your plan.');
    document.getElementById('gt-nudge')?.remove();
  });
}

(function init() {
  try { detectAmazon(); } catch (e) {}
  try { detectTravel(); } catch (e) {}
})();