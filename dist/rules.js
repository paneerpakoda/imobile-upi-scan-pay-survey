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
