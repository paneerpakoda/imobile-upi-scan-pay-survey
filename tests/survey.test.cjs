const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'dist/rules.js'), 'utf8'), context);
const rules = context.SurveyRules;

function response(overrides = {}) {
  const answers = {
    upi_app: 'imobile',
    upi_app_other: '',
    qr_path: 'unlock_upi_scan',
    unlock_feel: 'already_use_convenient',
    unlock_reason: 'usual_habit',
    unlock_reason_other: '',
    importance_speed: 'most',
    importance_ease: 'moderate',
    importance_security: 'most',
    importance_confirmation: 'least',
    importance_no_login: '',
    concept_1_likelihood: 'likely',
    concept_1_feedback: 'Clear onboarding',
    concept_2_likelihood: 'neutral',
    concept_2_feedback: '',
    ...overrides
  };
  return { version: rules.version, id: '01234567-89ab-4cde-8fab-0123456789ab', answers };
}

test('complete response validates', () => {
  assert.equal(rules.validate(response()).answers.upi_app, 'imobile');
});

test('required behaviour answers cannot be blank', () => {
  assert.throws(() => rules.validate(response({ upi_app: '' })));
  assert.throws(() => rules.validate(response({ qr_path: '' })));
  assert.throws(() => rules.validate(response({ unlock_reason: '' })));
});

test('unlock feel and importance rows may be blank', () => {
  const p = response({ unlock_feel: '', importance_speed: '', importance_ease: '', importance_security: '', importance_confirmation: '', importance_no_login: '' });
  assert.equal(rules.validate(p).answers.unlock_feel, '');
});

test('other requires accompanying text and rejects stray other text', () => {
  assert.throws(() => rules.validate(response({ upi_app: 'other', upi_app_other: '' })));
  assert.equal(rules.validate(response({ upi_app: 'other', upi_app_other: 'Amazon Pay' })).answers.upi_app_other, 'Amazon Pay');
  assert.throws(() => rules.validate(response({ upi_app: 'imobile', upi_app_other: 'extra' })));
});

test('concept likelihood is required; feedback is optional', () => {
  assert.throws(() => rules.validate(response({ concept_1_likelihood: '' })));
  assert.equal(rules.validate(response({ concept_2_feedback: '' })).answers.concept_2_feedback, '');
});

test('unknown fields and oversized text are rejected', () => {
  const p = response();
  p.answers.email = 'private@example.com';
  assert.throws(() => rules.validate(p));
  assert.throws(() => rules.validate(response({ concept_1_feedback: 'x'.repeat(1501) })));
});

test('stepComplete mirrors required flags from the Google Form', () => {
  const a = response().answers;
  assert.equal(rules.stepComplete('unlock_feel', { ...a, unlock_feel: '' }), true);
  assert.equal(rules.stepComplete('upi_app', { ...a, upi_app: '' }), false);
  assert.equal(rules.stepComplete('concept_1', a), true);
});

test('unknown survey versions are rejected', () => {
  const p = response();
  p.version = 'wrong';
  assert.throws(() => rules.validate(p));
});

module.exports = { response, rules, root };
