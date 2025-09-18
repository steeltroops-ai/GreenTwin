function formatKg(n){return `${n.toFixed(1)} kg CO₂e`}

document.addEventListener('DOMContentLoaded', async () => {
  const kgEl = document.getElementById('kg');
  const itemsEl = document.getElementById('items');
  const flagsEl = document.getElementById('flags');
  const misinfo = document.getElementById('misinfo');
  const openBtn = document.getElementById('open-dashboard');

  chrome.runtime.sendMessage({ type: 'get_stats' }, (stats) => {
    const totals = stats?.totals || { estKgMonth: 0, items: 0, misinfoFlags: 0 };
    kgEl.textContent = formatKg(totals.estKgMonth || 0);
    itemsEl.textContent = String(totals.items || 0);
    flagsEl.textContent = String(totals.misinfoFlags || 0);
    misinfo.checked = (stats?.settings?.misinfoEnabled ?? true);
  });

  misinfo.addEventListener('change', () => {
    chrome.runtime.sendMessage({ type: 'set_settings', payload: { misinfoEnabled: misinfo.checked } }, () => {});
  });

  openBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: '/' });
  });
});