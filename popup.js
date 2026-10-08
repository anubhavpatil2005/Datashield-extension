document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle-shield');
  const container = document.getElementById('flow-container');
  const clear = document.getElementById('clear-logs');
  const empty = () => { container.innerHTML = ''; const message = document.createElement('p'); message.className = 'empty-state'; message.textContent = 'No sensitive data travel detected in this session yet.'; container.append(message); };
  const el = (tag, className, value) => { const element = document.createElement(tag); element.className = className; element.textContent = value; return element; };
  function render(logs) {
    if (!logs.length) return empty();
    container.innerHTML = '';
    for (const log of logs) {
      const card = document.createElement('article'); card.className = `log-card ${log.isThirdParty ? 'third-party' : 'first-party'}`;
      const header = document.createElement('div'); header.className = 'log-header';
      header.append(el('span', 'badge-type', (log.detectedTypes || []).join(', ')), el('time', 'timestamp', new Date(log.timestamp).toLocaleTimeString()));
      const flow = document.createElement('div'); flow.className = 'flow-diagram';
      flow.append(el('span', 'node', 'User input'), el('span', 'arrow', '→'), el('span', 'node', log.method || 'POST'), el('span', 'arrow', '→'), el('span', 'node dest', `${log.isThirdParty ? '⚠ ' : ''}${log.destination || 'Unknown destination'}`));
      card.append(header, flow); container.append(card);
    }
  }
  chrome.storage.local.get({ isEnabled: true, logs: [] }, ({ isEnabled, logs }) => { toggle.checked = isEnabled; render(logs); });
  toggle.addEventListener('change', () => chrome.storage.local.set({ isEnabled: toggle.checked }));
  clear.addEventListener('click', () => chrome.storage.local.set({ logs: [] }, () => empty()));
});
