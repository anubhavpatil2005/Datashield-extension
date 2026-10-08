# DataShield & Privacy Flow Tracker

DataShield is a Manifest V3 Chrome extension that highlights sensitive data before it leaves a page and records privacy-safe flow metadata. It never stores raw form values or request bodies.

## What it detects

- Luhn-valid payment card numbers
- Email addresses and phone numbers
- US Social Security numbers
- API keys, bearer tokens, access tokens, and secret keys
- User-defined regular-expression patterns

## How it protects data

- Adds an inline warning whenever sensitive data is entered.
- Confirms sensitive form submissions, using the form's actual `action` destination.
- Observes sensitive payloads sent through `fetch`, XHR, `navigator.sendBeacon`, and WebSocket messages.
- Labels flows as first- or third-party and assigns moderate or critical severity.
- Allows trusted domains to be excluded from logging and can block sensitive payloads sent to configured domains.

## Dashboard controls

Open the extension popup to:

- Enable or disable protection.
- Configure trusted and blocked domains (comma- or line-separated).
- Enable individual detectors and define one custom regex per line.
- Choose 1-, 7-, 30-, or 90-day log retention.
- Review live source-to-destination flow cards.
- Export privacy-safe metadata as JSON or CSV, or clear it locally.

## Install locally

1. Clone or download this repository.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and choose this project folder.
5. Pin the DataShield icon and open the popup to configure controls.

After editing `manifest.json`, reload the extension from `chrome://extensions`.

## Testing

Run the detector unit tests:

```bash
npm test
```

For an interactive check, open `tests/manual-test.html` in Chrome after the extension has been loaded. It includes a sample form and a `fetch` request.

## Privacy note

DataShield is a client-side warning and visibility tool, not a replacement for application security controls. It records only metadata such as domains, transport type, detected categories, severity, and time. Review custom regular expressions before saving them, especially on pages containing confidential material.
