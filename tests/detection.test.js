const assert = require('node:assert/strict');
const cardPattern = /\b(?:\d[ -]*?){13,19}\b/g;
function luhn(value) { const digits = value.replace(/\D/g, ''); let sum = 0; for (let i = digits.length - 1, double = false; i >= 0; i--, double = !double) { let d = +digits[i]; if (double && (d *= 2) > 9) d -= 9; sum += d; } return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0; }
function types(text) { const cards = text.match(cardPattern) || []; return [cards.some(luhn) && 'Credit Card', /[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(text) && 'Email', /\b\d{3}-\d{2}-\d{4}\b/.test(text) && 'SSN', /(?:api_key|access_token|secret_key|bearer)\s*[:=]\s*["']?([A-Za-z0-9_-]{16,})/i.test(text) && 'API Key/Secret'].filter(Boolean); }
assert.equal(luhn('4111 1111 1111 1111'), true);
assert.equal(luhn('4111 1111 1111 1112'), false);
assert.deepEqual(types('mail a@b.com, SSN 123-45-6789'), ['Email', 'SSN']);
assert.deepEqual(types('api_key=abcdefghijklmnop'), ['API Key/Secret']);
console.log('Detection tests passed');
