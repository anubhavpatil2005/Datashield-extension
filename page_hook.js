(() => {
  'use strict';

  const patterns = {
    creditCard: /\b(?:\d[ -]*?){13,19}\b/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    apiKey: /(?:api_key|access_token|secret_key|bearer)\s*[:=]\s*["']?([a-zA-Z0-9_-]{16,})["']?/i,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/
  };

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
    if (cards.some(luhnValid)) found.push('Credit Card');
    if (patterns.email.test(text)) found.push('Email');
    if (patterns.ssn.test(text)) found.push('SSN');
    if (patterns.apiKey.test(text)) found.push('API Key/Secret');
    return found;
  };

  const report = (destination, method, body) => {
    const detectedTypes = scan(body);
    if (!detectedTypes.length) return;
    let isThirdParty = false;
    try { isThirdParty = new URL(destination, location.href).hostname !== location.hostname; } catch { /* display endpoint as-is */ }
    window.postMessage({ type: 'DATASHIELD_NETWORK_FLOW', payload: {
      timestamp: new Date().toISOString(), destination, method: method || 'POST', detectedTypes, isThirdParty
    } }, '*');
  };

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const request = args[0];
    const options = args[1] || {};
    const destination = typeof request === 'string' ? request : request?.url || '';
    report(destination, options.method || request?.method || 'GET', stringifyBody(options.body));
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
    report(this.__dataShieldUrl || 'XHR endpoint', this.__dataShieldMethod, stringifyBody(body));
    return send.apply(this, arguments);
  };
})();
