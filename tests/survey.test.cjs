const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'dist/rules.js'), 'utf8'), context);
const rules = context.SurveyRules;

function empty() {
  const answers = Object.fromEntries(Object.keys(rules.fields).map(key => [key, '']));
  answers.concept_1_likelihood = 'likely';
  answers.concept_2_likelihood = 'neutral';
  return answers;
}

function response(overrides = {}) {
  return {
    version: rules.version,
    id: '01234567-89ab-4cde-8fab-0123456789ab',
    answers: { ...empty(), ...overrides }
  };
}

function noticeRatings(overrides = {}) {
  return {
    concept_1_likelihood: 'clearer',
    concept_2_likelihood: 'same',
    ...overrides
  };
}

test('answer keys match the schema', () => {
  assert.deepEqual(Object.keys(empty()).sort(), Object.keys(rules.fields).sort());
});

test('iMobile user who already scans before the PIN is asked whether the screen is clearer', () => {
  const answers = noticeRatings({
    upi_app: 'imobile',
    scan_method: 'login_screen',
    found_scan: 'noticed',
    almost_stopped: 'nothing',
    knew_widget: 'no'
  });
  assert.equal(rules.stepVisible('opens_imobile', answers), false);
  assert.equal(rules.stepVisible('knew_scan', answers), false);
  assert.equal(rules.conceptSegment(answers), 'notice');
  assert.equal(rules.stepVisible('knew_widget', answers), true);
  assert.equal(rules.validate(response(answers)).answers.found_scan, 'noticed');
});

test('widget users are recorded and skip widget awareness', () => {
  const answers = { upi_app: 'imobile', scan_method: 'widget' };
  assert.equal(rules.stepVisible('knew_widget', answers), false);
  assert.equal(rules.stepVisible('found_scan', answers), false);
  assert.equal(rules.conceptSegment(answers), 'try');
  assert.equal(rules.stepVisible('concept_1', answers), true);
  assert.equal(rules.validate(response(answers)).answers.scan_method, 'widget');
});

test('people who do not open iMobile get the reason path and an open-the-app concept stem', () => {
  const answers = {
    upi_app: 'phonepe',
    opens_imobile: 'rarely',
    nonuser_reason: 'login'
  };
  assert.equal(rules.stepVisible('nonuser_reason', answers), true);
  assert.equal(rules.stepVisible('scan_method', answers), false);
  assert.equal(rules.stepVisible('knew_widget', answers), false);
  assert.equal(rules.conceptSegment(answers), 'open');
  assert.equal(rules.validate(response(answers)).answers.nonuser_reason, 'login');
  assert.equal(rules.stepVisible('nonuser_reason', { upi_app: 'google_pay', opens_imobile: 'no' }), true);
});

test('why another app accepts multiple reasons in option order', () => {
  const answers = {
    upi_app: 'phonepe',
    opens_imobile: 'rarely',
    nonuser_reason: 'login,rewards,habit'
  };
  assert.equal(rules.stepComplete('nonuser_reason', answers), true);
  assert.equal(rules.validate(response(answers)).answers.nonuser_reason, 'login,rewards,habit');
  assert.equal(rules.toggleMulti('nonuser_reason', 'login,rewards', 'habit'), 'login,rewards,habit');
  assert.equal(rules.toggleMulti('nonuser_reason', 'login,rewards', 'login'), 'rewards');
  assert.equal(rules.hasChoice('login,other', 'other'), true);
  assert.throws(() => rules.validate(response({
    upi_app: 'phonepe',
    opens_imobile: 'rarely',
    nonuser_reason: 'other',
    nonuser_reason_other: ''
  })));
  assert.doesNotThrow(() => rules.validate(response({
    upi_app: 'phonepe',
    opens_imobile: 'rarely',
    nonuser_reason: 'login,other',
    nonuser_reason_other: 'Cashback club'
  })));
  assert.throws(() => rules.validate(response({
    upi_app: 'phonepe',
    opens_imobile: 'rarely',
    nonuser_reason: 'login,not_a_reason'
  })));
});

test('what gets in the way accepts several answers and keeps Nothing exclusive', () => {
  const base = noticeRatings({
    upi_app: 'imobile',
    scan_method: 'login_screen',
    found_scan: 'noticed',
    knew_widget: 'no'
  });
  assert.equal(rules.stepComplete('almost_stopped', { ...base, almost_stopped: 'slow_launch,failed' }), true);
  assert.equal(rules.validate(response({ ...base, almost_stopped: 'slow_launch,failed' })).answers.almost_stopped, 'slow_launch,failed');
  assert.doesNotThrow(() => rules.validate(response({ ...base, almost_stopped: 'nothing' })));
  assert.throws(() => rules.validate(response({ ...base, almost_stopped: 'slow_launch,nothing' })));
  assert.equal(rules.toggleMulti('almost_stopped', 'slow_launch,safety', 'nothing'), 'nothing');
  assert.equal(rules.toggleMulti('almost_stopped', 'nothing', 'failed'), 'failed');
  assert.equal(rules.toggleMulti('almost_stopped', 'slow_launch', 'safety'), 'slow_launch,safety');
});

test('someone who opens iMobile but usually pays elsewhere still says why, then how they scan', () => {
  const answers = { upi_app: 'paytm', opens_imobile: 'yes', nonuser_reason: 'rewards' };
  assert.equal(rules.stepVisible('nonuser_reason', answers), true);
  assert.equal(rules.stepVisible('scan_method', answers), true);
  assert.equal(rules.conceptSegment(answers), 'try');
});

test('not knowing Scan any QR skips the reason and not sure is a valid answer', () => {
  const answers = {
    upi_app: 'imobile',
    scan_method: 'log_in_then_scan',
    knew_scan: 'not_sure',
    knew_widget: 'yes'
  };
  assert.equal(rules.stepVisible('persuade_reason', answers), false);
  assert.equal(rules.validate(response(answers)).answers.knew_scan, 'not_sure');
});

test('knowing and not using Scan any QR is the persuade path', () => {
  const answers = {
    upi_app: 'imobile',
    scan_method: 'dont_scan',
    knew_scan: 'yes',
    persuade_reason: 'balance',
    knew_widget: 'not_sure'
  };
  assert.equal(rules.stepVisible('persuade_reason', answers), true);
  assert.equal(rules.validate(response(answers)).answers.persuade_reason, 'balance');
  assert.throws(() => rules.validate(response({ ...answers, concept_1_likelihood: '' })));
});

test('try segment accepts already doing it and notice segment rejects that answer', () => {
  assert.doesNotThrow(() => rules.validate(response({
    upi_app: 'imobile',
    scan_method: 'widget',
    concept_1_likelihood: 'already_do',
    concept_2_likelihood: 'already_do'
  })));
  assert.throws(() => rules.validate(response(noticeRatings({
    upi_app: 'imobile',
    scan_method: 'login_screen',
    found_scan: 'noticed',
    almost_stopped: 'nothing',
    knew_widget: 'no',
    concept_1_likelihood: 'already_do'
  }))));
});

test('an iMobile user cannot carry a reason from another app', () => {
  assert.throws(() => rules.validate(response({
    upi_app: 'imobile',
    scan_method: 'widget',
    nonuser_reason: 'habit'
  })));
});

test('clearHiddenAnswers drops answers from paths the respondent left', () => {
  const answers = {
    upi_app: 'phonepe',
    opens_imobile: 'rarely',
    scan_method: 'login_screen',
    found_scan: 'noticed',
    knew_widget: 'yes',
    nonuser_reason: 'habit',
    concept_1_likelihood: 'clearer',
    concept_2_likelihood: 'same'
  };
  rules.clearHiddenAnswers(answers);
  assert.equal(answers.scan_method, '');
  assert.equal(answers.found_scan, '');
  assert.equal(answers.knew_widget, '');
  assert.equal(answers.nonuser_reason, 'habit');
  assert.equal(answers.concept_1_likelihood, '');
});

test('the longest remaining path shrinks and does not grow', () => {
  const unanswered = empty();
  unanswered.upi_app = '';
  unanswered.opens_imobile = '';
  unanswered.scan_method = '';
  unanswered.knew_scan = '';
  const start = rules.maxVisibleCount(unanswered);
  const imobile = rules.maxVisibleCount({ ...unanswered, upi_app: 'imobile' });
  const rare = rules.maxVisibleCount({ ...unanswered, upi_app: 'phonepe', opens_imobile: 'rarely' });
  assert.equal(start, 10);
  assert.equal(imobile, 8);
  assert.equal(rare, 6);
  assert.ok(imobile < start && rare < imobile);
});

test('knowledge questions do not include a screenshot, and age is gone', () => {
  assert.doesNotThrow(() => rules.validate(response({
    upi_app: 'imobile',
    scan_method: 'widget'
  })));
  const questions = fs.readFileSync(path.join(root, 'dist/questions.js'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');
  const steps = questions.slice(questions.indexOf('steps:'));
  assert.deepEqual([...steps.matchAll(/id: '([^']+)'/g)].map(match => match[1]), Array.from(rules.stepIds));
  assert.doesNotMatch(questions, /Under 25/);
  assert.doesNotMatch(questions, /Prefer not to say/);
  assert.doesNotMatch(questions, /Your age group/);
  assert.doesNotMatch(questions, /age_bracket/);
  assert.doesNotMatch(questions, /id: 'age'/);
  assert.doesNotMatch(app, /age-group/);
  assert.doesNotMatch(app, /pill-btn/);
  assert.match(questions, /It is slow to open/);
  assert.match(questions, /what gets in the way/);
  assert.match(questions, /First screen/);
  assert.match(questions, /Second screen/);
  assert.match(questions, /easier to notice/);
  assert.match(questions, /open iMobile and try/);
  assert.doesNotMatch(questions, /not tied to your account/);
  assert.doesNotMatch(questions, /for this research/);
  assert.doesNotMatch(app, /class="privacy"/);
  assert.match(questions, /What should change/);
  assert.match(questions, /bhim: 'BHIM'/);
  assert.doesNotMatch(questions, /Bharat Interface/);
  assert.doesNotMatch(questions, /login-scan-any-qr/);
  assert.doesNotMatch(questions, /kind: 'rank'/);
  assert.doesNotMatch(questions, /without logging in/);
  assert.doesNotMatch(questions, /portfolio/);
  assert.doesNotMatch(questions, /Would Scan any QR/);
  assert.doesNotMatch(questions, /nonuser_fix/);
  assert.doesNotMatch(app, /I am 18 or older/);
  assert.doesNotMatch(questions, /is_adult/);
  assert.doesNotMatch(questions, /mainly offering/);
  assert.doesNotMatch(app, /mainly offering/);
  assert.doesNotMatch(app, /class="required"/);
  assert.match(app, /Choose an answer to continue/);
  assert.match(app, /Choose at least one answer to continue/);
  assert.match(questions, /Select all that apply/);
  assert.match(questions, /multi: true/);
  assert.match(questions, /Why do you pay in another app instead of iMobile/);
  assert.doesNotMatch(questions, /What’s the main reason you pay in another app/);
  assert.match(app, /Finish preview/);
  assert.match(app, /Answers were not saved/);
  assert.match(app, /maxVisibleCount/);
  assert.doesNotMatch(app, /Current behaviour/);
  assert.doesNotMatch(app, /iMobile research/);
  assert.doesNotMatch(app, /How likely would you be to try Scan any QR after seeing this/);
  assert.doesNotMatch(app, /Would this remove the reason you just gave/);
  assert.doesNotMatch(app, /concept-kicker/);
  assert.doesNotMatch(app, /rank-list/);
});

test('other requires text', () => {
  assert.throws(() => rules.validate(response({
    upi_app: 'other',
    upi_app_other: '',
    opens_imobile: 'no',
    nonuser_reason: 'habit'
  })));
});

module.exports = { response, rules, root };
