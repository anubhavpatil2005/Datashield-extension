document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle-shield');
  const container = document.getElementById('flow-container');
  const clear = document.getElementById('clear-logs');
  const allowlist = document.getElementById('allowlist');
  const blocked = document.getElementById('blocked-domains');
  const customPatterns = document.getElementById('custom-patterns');
  const retention = document.getElementById('retention-days');
  const detectorInputs = [...document.querySelectorAll('[data-detector]')];
  const defaults = { allowlist: [], blockedDomains: [], customPatterns: [], retentionDays: 30, detectors: { creditCard: true, email: true, ssn: true, apiKey: true, phone: true } };
  const domains = (value) => value.split(/[\n,]/).map((entry) => entry.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')).filter((entry) => /^[a-z0-9.-]+$/.test(entry));
  const empty = () => { container.innerHTML = ''; const message = document.createElement('p'); message.className = 'empty-state'; message.textContent = 'No sensitive data travel detected in this session yet.'; container.append(message); };
  const el = (tag, className, value) => { const element = document.createElement(tag); element.className = className; element.textContent = value; return element; };
  function render(logs) {
    if (!logs.length) return empty();
    container.innerHTML = '';
    for (const log of logs) {
      const card = document.createElement('article'); card.className = `log-card ${log.isThirdParty ? 'third-party' : 'first-party'}`;
      const header = document.createElement('div'); header.className = 'log-header';
      header.append(el('span', `badge-type severity-${log.severity || 'moderate'}`, `${(log.detectedTypes || []).join(', ')} · ${log.severity || 'moderate'}`), el('time', 'timestamp', new Date(log.timestamp).toLocaleTimeString()));
      const flow = document.createElement('div'); flow.className = 'flow-diagram';
      flow.append(el('span', 'node', log.sourceDomain || 'User input'), el('span', 'arrow', '→'), el('span', 'node', `${log.method || 'POST'} · ${log.channel || 'form'}`), el('span', 'arrow', '→'), el('span', 'node dest', `${log.blocked ? '⛔ ' : log.isThirdParty ? '⚠ ' : ''}${log.destinationDomain || log.destination || 'Unknown destination'}`));
      card.append(header, flow); container.append(card);
    }
  }
  const load = () => chrome.storage.local.get({ isEnabled: true, logs: [], settings: defaults }, ({ isEnabled, logs, settings }) => { const config = { ...defaults, ...settings, detectors: { ...defaults.detectors, ...settings.detectors } }; toggle.checked = isEnabled; allowlist.value = config.allowlist.join(', '); blocked.value = config.blockedDomains.join(', '); customPatterns.value = config.customPatterns.join('\n'); retention.value = String(config.retentionDays); detectorInputs.forEach((input) => input.checked = config.detectors[input.dataset.detector] !== false); render(logs); });
  load();
  toggle.addEventListener('change', () => chrome.storage.local.set({ isEnabled: toggle.checked }));
  clear.addEventListener('click', () => chrome.storage.local.set({ logs: [] }, () => empty()));
  document.getElementById('save-settings').addEventListener('click', () => { const detectors = Object.fromEntries(detectorInputs.map((input) => [input.dataset.detector, input.checked])); const patterns = customPatterns.value.split('\n').map((pattern) => pattern.trim()).filter((pattern) => { try { new RegExp(pattern); return true; } catch { return false; } }); chrome.storage.local.set({ settings: { allowlist: domains(allowlist.value), blockedDomains: domains(blocked.value), customPatterns: patterns, retentionDays: Number(retention.value), detectors } }); });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes.logs || changes.settings)) load(); });
  const download = (name, text, type) => { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([text], { type })); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 0); };
  document.getElementById('export-json').addEventListener('click', () => chrome.storage.local.get({ logs: [] }, ({ logs }) => download('datashield-flows.json', JSON.stringify(logs, null, 2), 'application/json')));
  document.getElementById('export-csv').addEventListener('click', () => chrome.storage.local.get({ logs: [] }, ({ logs }) => { const headers = ['timestamp', 'sourceDomain', 'destinationDomain', 'method', 'channel', 'detectedTypes', 'severity', 'isThirdParty', 'blocked']; const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`; download('datashield-flows.csv', [headers.join(','), ...logs.map((log) => headers.map((key) => escape(Array.isArray(log[key]) ? log[key].join('; ') : log[key])).join(','))].join('\n'), 'text/csv'); }));
});
