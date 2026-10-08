const DEFAULTS = { isEnabled: true, logs: [], settings: { allowlist: [], blockedDomains: [], customPatterns: [], retentionDays: 30, detectors: { creditCard: true, email: true, ssn: true, apiKey: true, phone: true } } };
const hostnameOf = (value) => { try { return new URL(value).hostname.toLowerCase(); } catch { return ''; } };
const matchesDomain = (host, domains) => domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
const prune = (logs, days) => logs.filter((log) => new Date(log.timestamp).getTime() >= Date.now() - Number(days) * 86400000).slice(0, 50);

chrome.runtime.onInstalled.addListener(() => chrome.storage.local.get(DEFAULTS, (stored) => chrome.storage.local.set({ ...DEFAULTS, ...stored, settings: { ...DEFAULTS.settings, ...stored.settings } })));
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'LOG_FLOW_EVENT') return;
  chrome.storage.local.get(DEFAULTS, ({ isEnabled, logs, settings }) => {
    if (!isEnabled) return sendResponse({ ok: false });
    const destinationDomain = hostnameOf(message.data.destination);
    const allowed = matchesDomain(destinationDomain, settings.allowlist);
    const blocked = Boolean(message.data.blocked) || matchesDomain(destinationDomain, settings.blockedDomains);
    if (allowed && !blocked) return sendResponse({ ok: true, skipped: 'allowlisted' });
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, sourceUrl: sender.tab?.url || 'Unknown source', sourceDomain: hostnameOf(sender.tab?.url || ''), destinationDomain: destinationDomain || 'Unknown destination', tabTitle: sender.tab?.title || 'Active tab', severity: message.data.severity || 'moderate', ...message.data, blocked };
    chrome.storage.local.set({ logs: [entry, ...prune(logs, settings.retentionDays)].slice(0, 50) }, () => sendResponse({ ok: true }));
  });
  return true;
});
