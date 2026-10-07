# iMobile UPI Scan & Pay survey

Base recreation of the Google Form **Understanding iMobile UPI Scan & Pay behaviour**, using the same static-page + Apps Script collector architecture as the UX Squad illustration survey.

Source form: [Google Form](https://docs.google.com/forms/d/e/1FAIpQLSe8PZaq5_1kKoAVxP-CTS4s-cq_x0vjWhveOEMpf6jL5HdaaQ/viewform)

[Public survey](https://paneerpakoda.github.io/imobile-upi-scan-pay-survey/) · Repo: [paneerpakoda/imobile-upi-scan-pay-survey](https://github.com/paneerpakoda/imobile-upi-scan-pay-survey)

**Responses:** Private Google Sheet + Apps Script web app (see **SETUP.md**). Endpoint goes in `dist/config.js` only; never commit Sheet contents.

## Local preview

```bash
cd imobile-upi-scan-pay-survey
npm run preview
```

Open http://127.0.0.1:8893/

Without a collector endpoint in `dist/config.js`, you can walk every step; final send stays disabled until setup is complete.

## Architecture (mirrors illustration survey)

| Piece | Path |
| --- | --- |
| Static UI | `dist/` (`index.html`, `app.js`, `base.css`) |
| Question copy | `dist/questions.js` |
| Validation schema | `dist/rules.js` (shared with collector) |
| Collector endpoint config | `dist/config.js` |
| Apps Script collector | `backend/server.js` → generated `backend/Code.gs` |
| Pages deploy | `.github/workflows/pages.yml` |
| Tests | `tests/*.test.cjs` |

Flow: multi-step form with progress, Back/Next, session persistence, UUID dedupe, and postMessage acknowledgment after Google save.

## Checks

```bash
npm test
```

## Setup / publish

1. Create the private Sheet + deploy Apps Script (**SETUP.md** steps 1–2).
2. Put the `/exec` URL in `dist/config.js`.
3. Push `main` to GitHub; Pages workflow publishes `dist/`. Enable **Settings → Pages → GitHub Actions** on the new repo if prompted.
4. Complete one test response, confirm the Sheet row, then remove it before inviting participants.

Do not publish Sheet contents or credentials.

## Question content

See **SURVEY.md** for the mirrored question set and required flags. Iterate questions in Design Mode / `dist/questions.js`.
