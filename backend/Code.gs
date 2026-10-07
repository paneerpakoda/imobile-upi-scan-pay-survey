/* Shared by the browser and backend/Code.gs. */
var SurveyRules = (function () {
  'use strict';
  const version = 'imobile-upi-scan-pay-2026-10-v1';
  const likert = ['very_unlikely', 'unlikely', 'neutral', 'likely', 'very_likely'];
  const importance = ['least', 'moderate', 'most'];
  const upiApps = ['imobile', 'google_pay', 'phonepe', 'paytm', 'bhim', 'other'];
  const qrPaths = [
    'unlock_upi_scan',
    'unlock_send_money_upi_scan',
    'landing_scan_any_qr',
    'dont_use_imobile_qr'
  ];
  const unlockFeel = [
    'already_use_convenient',
    'know_would_like',
    'know_prefer_login',
    'didnt_know_would_try',
    'didnt_know_no_need'
  ];
  const unlockReasons = [
    'usual_habit',
    'comfortable_after_login',
    'check_balance',
    'feels_more_secure',
    'unaware_of_no_login',
    'other'
  ];
  const fields = {
    upi_app: upiApps,
    upi_app_other: 200,
    qr_path: qrPaths,
    unlock_feel: unlockFeel,
    unlock_reason: unlockReasons,
    unlock_reason_other: 200,
    importance_speed: importance,
    importance_ease: importance,
    importance_security: importance,
    importance_confirmation: importance,
    importance_no_login: importance,
    concept_1_likelihood: likert,
    concept_1_feedback: 1500,
    concept_2_likelihood: likert,
    concept_2_feedback: 1500
  };
  const optionalEnums = new Set([
    'unlock_feel',
    'importance_speed',
    'importance_ease',
    'importance_security',
    'importance_confirmation',
    'importance_no_login'
  ]);
  const optionalText = new Set(['upi_app_other', 'unlock_reason_other', 'concept_1_feedback', 'concept_2_feedback']);

  function validAnswer(key, value) {
    if (!Object.prototype.hasOwnProperty.call(fields, key) || typeof value !== 'string') return false;
    const rule = fields[key];
    if (typeof rule === 'number') {
      if (value.length > rule) return false;
      if (optionalText.has(key)) return true;
      return true;
    }
    if (value === '' && optionalEnums.has(key)) return true;
    return rule.includes(value);
  }

  function validate(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p) || p.version !== version) throw Error('Unsupported survey version.');
    if (Object.keys(p).some(k => !['version', 'id', 'answers'].includes(k))) throw Error('Unexpected response field.');
    if (typeof p.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)) throw Error('Invalid response ID.');
    if (!p.answers || typeof p.answers !== 'object' || Array.isArray(p.answers)) throw Error('Missing answers.');
    if (Object.keys(p.answers).some(k => !Object.prototype.hasOwnProperty.call(fields, k))) throw Error('Unexpected answer field.');
    for (const k of Object.keys(fields)) if (!validAnswer(k, p.answers[k])) throw Error('Missing or invalid answer: ' + k);
    if (!p.answers.upi_app) throw Error('Missing or invalid answer: upi_app');
    if (p.answers.upi_app === 'other' && !p.answers.upi_app_other.trim()) throw Error('Missing or invalid answer: upi_app_other');
    if (p.answers.upi_app !== 'other' && p.answers.upi_app_other) throw Error('Unexpected other text for upi_app.');
    if (!p.answers.qr_path) throw Error('Missing or invalid answer: qr_path');
    if (!p.answers.unlock_reason) throw Error('Missing or invalid answer: unlock_reason');
    if (p.answers.unlock_reason === 'other' && !p.answers.unlock_reason_other.trim()) throw Error('Missing or invalid answer: unlock_reason_other');
    if (p.answers.unlock_reason !== 'other' && p.answers.unlock_reason_other) throw Error('Unexpected other text for unlock_reason.');
    if (!p.answers.concept_1_likelihood || !p.answers.concept_2_likelihood) throw Error('Missing concept likelihood.');
    return p;
  }

  function stepComplete(stepId, answers) {
    switch (stepId) {
      case 'intro': return true;
      case 'upi_app':
        return validAnswer('upi_app', answers.upi_app) && answers.upi_app !== '' &&
          (answers.upi_app !== 'other' || !!answers.upi_app_other.trim());
      case 'qr_path':
        return validAnswer('qr_path', answers.qr_path) && answers.qr_path !== '';
      case 'unlock_feel':
        return validAnswer('unlock_feel', answers.unlock_feel);
      case 'unlock_reason':
        return validAnswer('unlock_reason', answers.unlock_reason) && answers.unlock_reason !== '' &&
          (answers.unlock_reason !== 'other' || !!answers.unlock_reason_other.trim());
      case 'importance':
        return ['importance_speed', 'importance_ease', 'importance_security', 'importance_confirmation', 'importance_no_login']
          .every(k => validAnswer(k, answers[k]));
      case 'concept_1':
        return validAnswer('concept_1_likelihood', answers.concept_1_likelihood) &&
          answers.concept_1_likelihood !== '' &&
          validAnswer('concept_1_feedback', answers.concept_1_feedback);
      case 'concept_2':
        return validAnswer('concept_2_likelihood', answers.concept_2_likelihood) &&
          answers.concept_2_likelihood !== '' &&
          validAnswer('concept_2_feedback', answers.concept_2_feedback);
      default: return false;
    }
  }

  return {
    version, likert, importance, upiApps, qrPaths, unlockFeel, unlockReasons,
    fields, optionalEnums, optionalText, validAnswer, validate, stepComplete
  };
})();
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
