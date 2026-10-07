/* Allowed survey origins. Loopback supports local integration checks. */
const SURVEY_ORIGINS = ['https://paneerpakoda.github.io', 'http://127.0.0.1:8891', 'http://127.0.0.1:8892', 'http://127.0.0.1:8893'];
const SHEET_NAME = 'Responses';
const HEADER = ['received_at', 'response_id', 'survey_version', ...Object.keys(SurveyRules.fields), 'response_json'];

/** Run once from the Apps Script editor attached to your Google Sheet. */
function setup() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw Error('Open this script using Extensions → Apps Script from your Google Sheet.');
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', book.getId());
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = book.insertSheet(SHEET_NAME);
  ensureHeader(sheet);
}

function ensureHeader(sheet, header = HEADER) {
  const columns = sheet.getMaxColumns();
  if (columns < header.length) sheet.insertColumnsAfter(columns, header.length - columns);
  if (sheet.getLastRow() === 0) { sheet.appendRow(header); sheet.setFrozenRows(1); return header; }
  const existing = sheet.getRange(1, 1, 1, header.length).getValues()[0];
  if (JSON.stringify(existing) === JSON.stringify(header)) return header;
  throw Error('Unexpected response sheet columns.');
}

function cell(value) {
  const text = String(value);
  return /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
}

function canonical(p) {
  return JSON.stringify({
    version: p.version,
    id: p.id,
    answers: Object.fromEntries(Object.keys(SurveyRules.fields).map(k => [k, p.answers[k]]))
  });
}

function saveResponse(p) {
  SurveyRules.validate(p);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw Error('Please retry.');
  try {
    const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    if (!id) throw Error('Run setup first.');
    const book = SpreadsheetApp.openById(id);
    let sheet = book.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = book.insertSheet(SHEET_NAME);
    const actualHeader = ensureHeader(sheet, HEADER);
    const serialized = canonical(p);
    if (sheet.getLastRow() > 1) {
      const match = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).createTextFinder(p.id).matchEntireCell(true).findNext();
      if (match) {
        if (sheet.getRange(match.getRow(), actualHeader.indexOf('response_json') + 1).getValue() !== serialized) {
          throw Error('Response already saved with different answers.');
        }
        return;
      }
    }
    const rowObj = {
      received_at: new Date().toISOString(),
      response_id: p.id,
      survey_version: p.version,
      response_json: serialized
    };
    for (const k of Object.keys(SurveyRules.fields)) {
      rowObj[k] = cell(p.answers[k] ?? '');
    }
    const row = actualHeader.map(h => rowObj[h] !== undefined ? rowObj[h] : '');
    sheet.appendRow(row);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const input = e && e.parameter || {};
  const nonce = typeof input.nonce === 'string' && /^[0-9a-f-]{36}$/i.test(input.nonce) ? input.nonce : '';
  let id = '', ok = false, err = '';
  try {
    if (!SURVEY_ORIGINS.includes(input.origin) || !nonce) throw Error('Invalid origin.');
    if (typeof input.payload !== 'string' || input.payload.length > 32000) throw Error('Invalid response size.');
    const p = JSON.parse(input.payload);
    id = typeof p.id === 'string' ? p.id : '';
    saveResponse(p);
    ok = true;
  } catch (error) {
    err = error && error.message || String(error);
  }
  const message = JSON.stringify({ type: 'ux-survey-saved', nonce, id, ok, error: err }).replace(/</g, '\\u003c');
  const target = JSON.stringify(SURVEY_ORIGINS.includes(input.origin) ? input.origin : SURVEY_ORIGINS[0]).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><body><p>' +
    (ok ? 'Feedback saved.' : ('Feedback could not be saved.' + (err ? ' ' + err : '') + ' Please return to the survey and retry.')) +
    '</p><script>const m=' + message + ';const o=' + target + ';for(const w of [window.parent,window.parent.parent,window.top]){try{w.postMessage(m,o);}catch(e){}}</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doGet() {
  return HtmlService.createHtmlOutput('iMobile UPI Scan & Pay survey collector. Open the survey link to participate.');
}
