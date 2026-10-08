# Setup — iMobile UPI Scan & Pay survey collector

Same collection pattern as the **UX Squad illustration (3D) survey**: private Google Sheet + Apps Script web app + static page in `dist/`.

How it works (identical to the illustration survey):

1. The page posts the JSON response into a hidden iframe aimed at the Apps Script `/exec` URL (`dist/config.js`).
2. Apps Script validates the payload, appends one row to a **Responses** tab, and posts back `ux-survey-saved` via `postMessage`.
3. Only then does the page show **Your feedback is saved.** A loaded iframe alone is never treated as success (45s timeout; safe retry by response id).

**Do not reuse** the illustration survey’s `/exec` URL or Sheet. Column schemas differ; `ensureHeader` will reject a mismatched header.

**Guided setup:**

```bash
cd imobile-upi-scan-pay-survey
./scripts/setup-collector.sh
```

Manual steps below if you prefer not to use the wizard.

## 1. Create the response Sheet

1. Create a blank Google Sheet named **iMobile — UPI Scan & Pay feedback**. Keep sharing restricted to the survey owner and intended reviewers.
2. Choose **Extensions → Apps Script**.
3. Replace the editor’s starter code with the entire contents of **backend/Code.gs**. This is one self-contained script (rules + collector); do not paste `server.js` separately.
4. `SURVEY_ORIGINS` is already set for `https://paneerpakoda.github.io` and local preview `http://127.0.0.1:8893`. For a different host, update that array with the exact origin (no path, no trailing slash).
5. Save, choose the `setup` function, and run it. Authorize the script. This stores the Sheet ID in Script Properties and creates the **Responses** tab with the correct headers. It does not send any responses.
6. **Deploy → New deployment → Web app**. Execute as **Me**, access **Anyone** (so phone / WhatsApp browsers can submit without a Google login).
7. Deploy and copy the web-app URL ending in `/exec` (not `/dev`).

The Sheet stays private. The write-only endpoint is visible to the browser (same as the illustration survey). Anyone with the survey link can submit; there is no login.

## 2. Connect the page

Edit **dist/config.js**:

```js
window.SURVEY_CONFIG = Object.freeze({
  endpoint: "https://script.google.com/macros/s/YOUR-DEPLOYMENT-ID/exec"
});
```

Use this survey’s deployment only. No API keys or Google credentials belong here.

## 3. Host (GitHub Pages)

Already publishing `dist/` via `.github/workflows/pages.yml` to:

https://paneerpakoda.github.io/imobile-upi-scan-pay-survey/

After changing `config.js`, push `main` so Pages picks up the endpoint. Last button becomes **Send feedback** instead of **Finish preview**.

## 4. Verify once before inviting people

Same checklist as the illustration survey:

- Open the published page on your phone.
- Complete a test response. Put **SETUP TEST — remove this row** in an optional comment if you use one.
- Confirm the page says **Your feedback is saved** (not the preview message).
- Confirm exactly one new row in the Sheet **Responses** tab.
- If confirmation fails: origin must match `SURVEY_ORIGINS`, `setup` must have run, web app must be **Anyone**. After code changes: **Deploy → Manage deployments → Edit → New version → Deploy** (keep the same deployment URL).
- If the row exists but the page timed out, use **Try sending again** — same response id is deduplicated.
- Remove only the test row, leave the headers.
- If WhatsApp’s in-app browser blocks Google’s frame, open the link in Safari/Chrome.

## Maintenance

```bash
npm test          # regenerates backend/Code.gs from dist/rules.js + backend/server.js
```

Paste the new `Code.gs` into Apps Script, save, then deploy a **new version** of the same web app.

Official references (same as illustration survey): [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [HTML restrictions](https://developers.google.com/apps-script/guides/html/restrictions), [iframe XFrameOptions](https://developers.google.com/apps-script/reference/html/html-output#setXFrameOptionsMode(XFrameOptionsMode)).
