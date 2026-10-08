(() => {
  'use strict';

  let settings = { allowlist: [], blockedDomains: [], customPatterns: [], detectors: {} };
  const patterns = { creditCard: /\b(?:\d[ -]*?){13,19}\b/g, email: /[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/, apiKey: /(?:api_key|access_token|secret_key|bearer)\s*[:=]\s*["']?([A-Za-z0-9_-]{16,})["']?/i, ssn: /\b\d{3}-\d{2}-\d{4}\b/, phone: /\b(?:\+?\d{1,3}[-. ]?)?(?:\(?\d{2,4}\)?[-. ]?)?\d{3,4}[-. ]\d{4}\b/ };
  window.addEventListener('message', (event) => { if (event.source === window && event.data?.type === 'DATASHIELD_SETTINGS') settings = { ...settings, ...event.data.settings }; });

  const luhnValid = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    for (let i = digits.length - 1, double = false; i >= 0; i--, double = !double) {
      let digit = Number(digits[i]);
      if (double && (digit *= 2) > 9) digit -= 9;
      sum += digit;
    }
    return sum % 10 === 0;
  };

  const stringifyBody = (body) => {
    if (typeof body === 'string') return body;
    if (body instanceof URLSearchParams) return body.toString();
    if (body instanceof FormData) return [...body.entries()].map(([k, v]) => `${k}=${typeof v === 'string' ? v : '[file]'}`).join('&');
    try { return JSON.stringify(body); } catch { return ''; }
  };

  const scan = (text) => {
    if (!text) return [];
    const found = [];
    const cards = text.match(patterns.creditCard) || [];
    if (settings.detectors.creditCard !== false && cards.some(luhnValid)) found.push('Credit Card');
    if (settings.detectors.email !== false && patterns.email.test(text)) found.push('Email');
    if (settings.detectors.ssn !== false && patterns.ssn.test(text)) found.push('SSN');
    if (settings.detectors.apiKey !== false && patterns.apiKey.test(text)) found.push('API Key/Secret');
    if (settings.detectors.phone !== false && patterns.phone.test(text)) found.push('Phone');
    if ((settings.customPatterns || []).some((pattern) => { try { return new RegExp(pattern, 'i').test(text); } catch { return false; } })) found.push('Custom pattern');
    return found;
  };

  const report = (destination, method, body, channel) => {
    const detectedTypes = scan(body);
    if (!detectedTypes.length) return;
    let destinationUrl; try { destinationUrl = new URL(destination, location.href); } catch { return false; }
    const domainMatches = (domains) => domains.some((domain) => destinationUrl.hostname === domain || destinationUrl.hostname.endsWith(`.${domain}`));
    const blocked = domainMatches(settings.blockedDomains || []);
    if (domainMatches(settings.allowlist || []) && !blocked) return false;
    window.postMessage({ type: 'DATASHIELD_NETWORK_FLOW', payload: {
      timestamp: new Date().toISOString(), destination: destinationUrl.href, method: method || 'POST', channel, detectedTypes, blocked,
      severity: detectedTypes.some((type) => ['Credit Card', 'SSN', 'API Key/Secret'].includes(type)) ? 'critical' : 'moderate', isThirdParty: destinationUrl.hostname !== location.hostname
    } }, '*');
    return blocked;
  };

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const request = args[0];
    const options = args[1] || {};
    const destination = typeof request === 'string' ? request : request?.url || '';
    if (report(destination, options.method || request?.method || 'GET', stringifyBody(options.body), 'fetch')) return Promise.reject(new DOMException('Blocked by DataShield', 'SecurityError'));
    return originalFetch.apply(this, args);
  };

  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__dataShieldMethod = method;
    this.__dataShieldUrl = url;
    return open.call(this, method, url, ...rest);
  };
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (body) {
    if (report(this.__dataShieldUrl || 'XHR endpoint', this.__dataShieldMethod, stringifyBody(body), 'xhr')) return;
    return send.apply(this, arguments);
  };

  const originalBeacon = navigator.sendBeacon?.bind(navigator);
  if (originalBeacon) navigator.sendBeacon = (url, data) => report(url, 'POST', stringifyBody(data), 'beacon') ? false : originalBeacon(url, data);
  const NativeWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) { const socket = protocols === undefined ? new NativeWebSocket(url) : new NativeWebSocket(url, protocols); const sendSocket = socket.send; socket.send = function (data) { if (report(url, 'SEND', stringifyBody(data), 'websocket')) { socket.close(1008, 'Blocked by DataShield'); return; } return sendSocket.apply(this, arguments); }; return socket; };
  window.WebSocket.prototype = NativeWebSocket.prototype;
})();
