const DEFAULTS = { isEnabled: true, logs: [] };

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(DEFAULTS, (stored) => chrome.storage.local.set(stored));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'LOG_FLOW_EVENT') return;

  chrome.storage.local.get(DEFAULTS, ({ isEnabled, logs }) => {
    if (!isEnabled) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sourceUrl: sender.tab?.url || 'Unknown source',
      tabTitle: sender.tab?.title || 'Active tab',
      ...message.data
    };
    chrome.storage.local.set({ logs: [entry, ...logs].slice(0, 50) });
    sendResponse({ ok: true });
  });
  return true;
});
