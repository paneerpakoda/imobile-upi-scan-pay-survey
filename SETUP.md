# Setup — iMobile UPI Scan & Pay survey collector

Same pattern as the UX Squad illustration survey: private Google Sheet + Apps Script web app + static page in `dist/`.

## 1. Create the response Sheet

1. Create a blank Google Sheet (for example **iMobile — UPI Scan & Pay feedback**). Keep sharing restricted.
2. **Extensions → Apps Script**. Replace the starter code with the entire contents of **backend/Code.gs**.
3. Update `SURVEY_ORIGINS` in that file for your publish origin and local preview (`http://127.0.0.1:8893` is included by default).
4. Save, run `setup`, authorize.
5. **Deploy → New deployment → Web app**. Execute as **Me**, access **Anyone**. Copy the `/exec` URL.

## 2. Connect the page

Edit **dist/config.js**:

```js
window.SURVEY_CONFIG = Object.freeze({
  endpoint: "https://script.google.com/macros/s/YOUR-DEPLOYMENT-ID/exec"
});
```

## 3. Host (GitHub Pages)

Same as the illustration survey: a dedicated public repo under `paneerpakoda`, with Actions publishing **only** `dist/`.

1. Create repo `imobile-upi-scan-pay-survey` (public is fine; responses stay in the private Sheet).
2. Push this project to `main` (includes `.github/workflows/pages.yml`).
3. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. After the workflow succeeds, open `https://paneerpakoda.github.io/imobile-upi-scan-pay-survey/`.
5. Confirm `SURVEY_ORIGINS` in `backend/Code.gs` includes `https://paneerpakoda.github.io` (already default). Redeploy the web app if you change origins.

## 4. Verify

Complete a test response, confirm “Thank you” / save acknowledgment, and confirm one new row in **Responses**. Remove the test row before inviting participants.

Regenerate Code.gs after editing rules or server:

```bash
node generate_code_gs.js
```

Then update the Apps Script project and deploy a **new version** of the same deployment.
