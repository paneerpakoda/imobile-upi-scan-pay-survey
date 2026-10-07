/* Shared by the browser and backend/Code.gs. */
var SurveyRules = (function () {
  'use strict';
  const version = 'imobile-upi-scan-pay-2026-10-v9';
  const upiApps = ['imobile', 'google_pay', 'phonepe', 'paytm', 'whatsapp', 'cred', 'amazon_pay', 'super_money', 'bhim', 'other'];
  const opensImobileOptions = ['yes', 'rarely', 'no'];
  const nonuserReasons = ['separate_app', 'login', 'trust', 'bad_experience', 'rewards', 'upi_id', 'habit', 'other'];
  const awareness = ['yes', 'no', 'not_sure'];
  const scanMethods = ['login_screen', 'log_in_then_scan', 'widget', 'dont_scan'];
  const foundScan = ['noticed', 'someone', 'bank_message', 'dont_remember', 'other'];
  const almostStopped = ['slow_launch', 'safety', 'confirmation', 'failed', 'nothing'];
  const likert = ['very_unlikely', 'unlikely', 'neutral', 'likely', 'very_likely', 'already_do'];
  const noticeScale = ['clearer', 'same', 'more_confusing'];
  const persuadeReasons = ['balance', 'trust', 'failed', 'no_harder', 'other'];
  const stepIds = ['intro', 'upi_app', 'opens_imobile', 'nonuser_reason', 'scan_method', 'found_scan', 'almost_stopped', 'knew_scan', 'persuade_reason', 'knew_widget', 'concept_1', 'concept_2'];
  const fields = {
    upi_app: upiApps,
    upi_app_other: 200,
    opens_imobile: opensImobileOptions,
    nonuser_reason: nonuserReasons,
    nonuser_reason_other: 200,
    scan_method: scanMethods,
    found_scan: foundScan,
    found_scan_other: 200,
    almost_stopped: almostStopped,
    knew_scan: awareness,
    persuade_reason: persuadeReasons,
    persuade_reason_other: 200,
    knew_widget: awareness,
    concept_1_likelihood: likert,
    concept_1_feedback: 1500,
    concept_2_likelihood: likert,
    concept_2_feedback: 1500
  };
  const optionalText = new Set(['upi_app_other', 'nonuser_reason_other', 'found_scan_other', 'persuade_reason_other', 'concept_1_feedback', 'concept_2_feedback']);

  function opensImobile(answers) {
    return answers.upi_app === 'imobile' || answers.opens_imobile === 'yes';
  }

  function nonUser(answers) {
    return !!answers.upi_app && answers.upi_app !== 'imobile' &&
      opensImobileOptions.includes(answers.opens_imobile);
  }

  function teachOrPersuade(answers) {
    return answers.scan_method === 'log_in_then_scan' || answers.scan_method === 'dont_scan';
  }

  function conceptSegment(answers) {
    if (answers.scan_method === 'login_screen') return 'notice';
    if (opensImobile(answers)) return 'try';
    return 'open';
  }

  function conceptScale(answers) {
    return conceptSegment(answers) === 'notice' ? noticeScale : likert;
  }

  function stepVisible(stepId, answers) {
    switch (stepId) {
      case 'intro':
      case 'upi_app':
      case 'concept_1':
      case 'concept_2':
        return true;
      case 'opens_imobile':
        return !!answers.upi_app && answers.upi_app !== 'imobile';
      case 'nonuser_reason':
        return nonUser(answers);
      case 'scan_method':
        return opensImobile(answers);
      case 'found_scan':
      case 'almost_stopped':
        return answers.scan_method === 'login_screen';
      case 'knew_scan':
        return teachOrPersuade(answers);
      case 'persuade_reason':
        return teachOrPersuade(answers) && answers.knew_scan === 'yes';
      case 'knew_widget':
        return opensImobile(answers) && !!answers.scan_method && answers.scan_method !== 'widget';
      default:
        return false;
    }
  }

  function clearHiddenAnswers(answers) {
    const blank = key => { answers[key] = ''; };
    if (!stepVisible('opens_imobile', answers)) blank('opens_imobile');
    if (!stepVisible('nonuser_reason', answers)) {
      blank('nonuser_reason');
      blank('nonuser_reason_other');
    }
    if (!stepVisible('scan_method', answers)) blank('scan_method');
    if (!stepVisible('found_scan', answers)) {
      blank('found_scan');
      blank('found_scan_other');
    }
    if (!stepVisible('almost_stopped', answers)) blank('almost_stopped');
    if (!stepVisible('knew_scan', answers)) blank('knew_scan');
    if (!stepVisible('persuade_reason', answers)) {
      blank('persuade_reason');
      blank('persuade_reason_other');
    }
    if (!stepVisible('knew_widget', answers)) blank('knew_widget');
    if (answers.upi_app !== 'other') blank('upi_app_other');
    if (answers.nonuser_reason !== 'other') blank('nonuser_reason_other');
    if (answers.found_scan !== 'other') blank('found_scan_other');
    if (answers.persuade_reason !== 'other') blank('persuade_reason_other');
    const scale = conceptScale(answers);
    if (answers.concept_1_likelihood && !scale.includes(answers.concept_1_likelihood)) blank('concept_1_likelihood');
    if (answers.concept_2_likelihood && !scale.includes(answers.concept_2_likelihood)) blank('concept_2_likelihood');
    return answers;
  }

  function maxVisibleCount(answers) {
    function search(a) {
      if (!a.upi_app) {
        return Math.max(search({ ...a, upi_app: 'imobile' }), search({ ...a, upi_app: 'phonepe' }));
      }
      if (a.upi_app !== 'imobile' && !a.opens_imobile) {
        return Math.max(search({ ...a, opens_imobile: 'yes' }), search({ ...a, opens_imobile: 'rarely' }));
      }
      if ((a.upi_app === 'imobile' || a.opens_imobile === 'yes') && !a.scan_method) {
        return Math.max(
          search({ ...a, scan_method: 'login_screen' }),
          search({ ...a, scan_method: 'log_in_then_scan' }),
          search({ ...a, scan_method: 'widget' }),
          search({ ...a, scan_method: 'dont_scan' })
        );
      }
      if ((a.scan_method === 'log_in_then_scan' || a.scan_method === 'dont_scan') && !a.knew_scan) {
        return Math.max(search({ ...a, knew_scan: 'yes' }), search({ ...a, knew_scan: 'no' }));
      }
      return stepIds.filter(id => stepVisible(id, a)).length;
    }
    return search({ ...answers });
  }

  function validAnswer(key, value, answers) {
    if (!Object.prototype.hasOwnProperty.call(fields, key) || typeof value !== 'string') return false;
    if (key === 'concept_1_likelihood' || key === 'concept_2_likelihood') return conceptScale(answers).includes(value);
    const rule = fields[key];
    if (typeof rule === 'number') return value.length <= rule;
    if (value === '') {
      const stepFor = {
        opens_imobile: 'opens_imobile',
        nonuser_reason: 'nonuser_reason',
        scan_method: 'scan_method',
        found_scan: 'found_scan',
        almost_stopped: 'almost_stopped',
        knew_scan: 'knew_scan',
        persuade_reason: 'persuade_reason',
        knew_widget: 'knew_widget'
      };
      if (stepFor[key]) return !stepVisible(stepFor[key], answers);
      return false;
    }
    return rule.includes(value);
  }

  function requireShown(a, stepId, key, label) {
    if (stepVisible(stepId, a)) {
      if (!a[key]) throw Error('Missing or invalid answer: ' + (label || key));
    } else if (a[key]) throw Error('Unexpected ' + (label || key) + ' for skipped step.');
  }

  function requireOther(a, choiceKey, textKey, when) {
    if (!when) {
      if (a[textKey]) throw Error('Unexpected ' + textKey + ' for skipped step.');
      return;
    }
    if (a[choiceKey] === 'other' && !a[textKey].trim()) throw Error('Missing or invalid answer: ' + textKey);
    if (a[choiceKey] !== 'other' && a[textKey]) throw Error('Unexpected other text for ' + choiceKey + '.');
  }

  function validate(p) {
    if (!p || typeof p !== 'object' || Array.isArray(p) || p.version !== version) throw Error('Unsupported survey version.');
    if (Object.keys(p).some(k => !['version', 'id', 'answers'].includes(k))) throw Error('Unexpected response field.');
    if (typeof p.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)) throw Error('Invalid response ID.');
    if (!p.answers || typeof p.answers !== 'object' || Array.isArray(p.answers)) throw Error('Missing answers.');
    if (Object.keys(p.answers).some(k => !Object.prototype.hasOwnProperty.call(fields, k))) throw Error('Unexpected answer field.');
    const a = p.answers;
    for (const k of Object.keys(fields)) if (!validAnswer(k, a[k], a)) throw Error('Missing or invalid answer: ' + k);
    if (!a.upi_app) throw Error('Missing or invalid answer: upi_app');
    requireOther(a, 'upi_app', 'upi_app_other', true);
    requireShown(a, 'opens_imobile', 'opens_imobile');
    requireShown(a, 'nonuser_reason', 'nonuser_reason');
    requireOther(a, 'nonuser_reason', 'nonuser_reason_other', stepVisible('nonuser_reason', a));
    requireShown(a, 'scan_method', 'scan_method');
    requireShown(a, 'found_scan', 'found_scan');
    requireOther(a, 'found_scan', 'found_scan_other', stepVisible('found_scan', a));
    requireShown(a, 'almost_stopped', 'almost_stopped');
    requireShown(a, 'knew_scan', 'knew_scan');
    requireShown(a, 'persuade_reason', 'persuade_reason');
    requireOther(a, 'persuade_reason', 'persuade_reason_other', stepVisible('persuade_reason', a));
    requireShown(a, 'knew_widget', 'knew_widget');
    if (!conceptScale(a).includes(a.concept_1_likelihood) || !conceptScale(a).includes(a.concept_2_likelihood)) {
      throw Error('Missing concept likelihood.');
    }
    return p;
  }

  function stepComplete(stepId, answers) {
    if (!stepVisible(stepId, answers)) return true;
    switch (stepId) {
      case 'intro':
        return true;
      case 'upi_app':
        return upiApps.includes(answers.upi_app) && answers.upi_app !== '' &&
          (answers.upi_app !== 'other' || !!answers.upi_app_other.trim());
      case 'opens_imobile':
        return opensImobileOptions.includes(answers.opens_imobile);
      case 'nonuser_reason':
        return nonuserReasons.includes(answers.nonuser_reason) &&
          (answers.nonuser_reason !== 'other' || !!answers.nonuser_reason_other.trim());
      case 'scan_method':
        return scanMethods.includes(answers.scan_method);
      case 'found_scan':
        return foundScan.includes(answers.found_scan) &&
          (answers.found_scan !== 'other' || !!answers.found_scan_other.trim());
      case 'almost_stopped':
        return almostStopped.includes(answers.almost_stopped);
      case 'knew_scan':
        return awareness.includes(answers.knew_scan);
      case 'persuade_reason':
        return persuadeReasons.includes(answers.persuade_reason) &&
          (answers.persuade_reason !== 'other' || !!answers.persuade_reason_other.trim());
      case 'knew_widget':
        return awareness.includes(answers.knew_widget);
      case 'concept_1':
        return conceptScale(answers).includes(answers.concept_1_likelihood) &&
          answers.concept_1_feedback.length <= 1500;
      case 'concept_2':
        return conceptScale(answers).includes(answers.concept_2_likelihood) &&
          answers.concept_2_feedback.length <= 1500;
      default: return false;
    }
  }

  return {
    version, upiApps, opensImobileOptions, nonuserReasons, awareness, scanMethods,
    foundScan, almostStopped, persuadeReasons, likert, noticeScale,
    stepIds, fields, optionalText,
    opensImobile, nonUser, teachOrPersuade, conceptSegment, conceptScale,
    stepVisible, clearHiddenAnswers, maxVisibleCount,
    validAnswer, validate, stepComplete
  };
})();
