(() => {
  const patterns = {
    creditCard: /\b(?:\d[ -]*?){13,19}\b/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/,
    apiKey: /(?:api_key|access_token|secret_key|bearer)\s*[:=]\s*["']?([a-zA-Z0-9_-]{16,})["']?/i
  };
  const luhnValid = (value) => {
    const digits = value.replace(/\D/g, ''); let sum = 0;
    if (digits.length < 13 || digits.length > 19) return false;
    for (let i = digits.length - 1, double = false; i >= 0; i--, double = !double) { let d = +digits[i]; if (double && (d *= 2) > 9) d -= 9; sum += d; }
    return sum % 10 === 0;
  };
  const findSensitive = (value) => {
    const cards = value.match(patterns.creditCard) || [];
    return [cards.some(luhnValid) && 'Credit Card', patterns.email.test(value) && 'Email', patterns.ssn.test(value) && 'SSN', patterns.apiKey.test(value) && 'API Key'].filter(Boolean);
  };
  const enabled = () => new Promise((resolve) => chrome.storage.local.get({ isEnabled: true }, ({ isEnabled }) => resolve(isEnabled)));
  const injectHook = () => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('page_hook.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).append(script);
  };
  injectHook();

  const clearWarning = (input) => { input.classList.remove('datashield-highlight'); input.nextElementSibling?.classList.contains('datashield-badge') && input.nextElementSibling.remove(); };
  const showWarning = (input, types) => {
    input.classList.add('datashield-highlight');
    let badge = input.nextElementSibling;
    if (!badge?.classList.contains('datashield-badge')) { badge = document.createElement('span'); badge.className = 'datashield-badge'; input.after(badge); }
    badge.textContent = `⚠ DataShield: ${types.join(', ')} detected`;
  };
  document.addEventListener('input', async (event) => {
    if (!(await enabled())) return;
    const input = event.target;
    if (!['INPUT', 'TEXTAREA'].includes(input.tagName) && !input.isContentEditable) return;
    const types = findSensitive(input.value || input.innerText || ''); clearWarning(input);
    if (types.length) showWarning(input, types);
  }, true);

  const confirmSubmission = (form, types) => {
    document.getElementById('datashield-modal-overlay')?.remove();
    const overlay = document.createElement('div'); overlay.id = 'datashield-modal-overlay';
    overlay.innerHTML = '<section class="datashield-modal-content" role="dialog" aria-modal="true"><h3>🛡 DataShield Warning</h3><p class="datashield-modal-copy"></p><p>Target: <code></code></p><div class="datashield-modal-actions"><button type="button" class="datashield-cancel">Cancel</button><button type="button" class="datashield-proceed">Proceed & Send</button></div></section>';
    overlay.querySelector('.datashield-modal-copy').textContent = `You are about to submit: ${types.join(', ')}.`;
    overlay.querySelector('code').textContent = location.hostname;
    overlay.querySelector('.datashield-cancel').onclick = () => overlay.remove();
    overlay.querySelector('.datashield-proceed').onclick = () => { form.dataset.datashieldBypass = 'true'; overlay.remove(); form.requestSubmit ? form.requestSubmit() : form.submit(); };
    document.body.append(overlay);
  };
  document.addEventListener('submit', async (event) => {
    if (!(await enabled())) return;
    const form = event.target;
    const types = [...new Set([...form.querySelectorAll('input, textarea')].flatMap((input) => findSensitive(input.value || '')))];
    if (types.length && !form.dataset.datashieldBypass) { event.preventDefault(); event.stopImmediatePropagation(); confirmSubmission(form, types); }
  }, true);
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.data?.type !== 'DATASHIELD_NETWORK_FLOW' || !(await enabled())) return;
    chrome.runtime.sendMessage({ action: 'LOG_FLOW_EVENT', data: event.data.payload });
  });
})();
