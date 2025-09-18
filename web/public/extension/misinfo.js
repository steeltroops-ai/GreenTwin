// Simple misinformation detector content script

const MISINFO_PATTERNS = [
  /climate change is a hoax/i,
  /co2 is not a pollutant/i,
  /global cooling is coming/i,
  /volcanoes emit more co2 than humans/i,
  /wind turbines cause cancer/i,
  /too expensive to transition/i,
];

function flag(textNode) {
  const span = document.createElement('span');
  span.textContent = textNode.textContent;
  span.style.background = 'linear-gradient(90deg, rgba(255,231,150,.5), rgba(255,231,150,0))';
  span.style.borderBottom = '2px dashed #eab308';
  span.style.cursor = 'help';
  span.title = 'Potential climate misinformation. Tap for sources';
  span.addEventListener('click', () => {
    window.open('https://www.ipcc.ch/resources/faq/', '_blank');
  });
  textNode.replaceWith(span);
}

function scan() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    const t = node.textContent || '';
    if (t.length < 24) continue;
    if (MISINFO_PATTERNS.some((re) => re.test(t))) {
      flag(node);
      chrome.runtime.sendMessage({ type: 'misinfo_flag', payload: { text: t.slice(0, 140) } });
    }
  }
}

chrome.storage?.local.get('gt_stats_v1', (res) => {
  const enabled = res?.gt_stats_v1?.settings?.misinfoEnabled ?? true;
  if (enabled) scan();
});