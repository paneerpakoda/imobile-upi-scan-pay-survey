'use strict';
const $ = selector => document.querySelector(selector);
const R = window.SurveyRules;
const C = window.SURVEY_CONTENT;
const storageKey = R.version;
const blankAnswers = () => Object.fromEntries(Object.keys(R.fields).map(k => [k, '']));
let state = {
  version: R.version,
  id: crypto.randomUUID(),
  answers: blankAnswers(),
  step: 0
};
try {
  const saved = JSON.parse(sessionStorage.getItem(storageKey));
  if (saved?.version === R.version) {
    if (saved.pendingResponse) {
      R.validate(saved.pendingResponse);
      state = { ...saved.pendingResponse, pendingResponse: saved.pendingResponse, step: C.steps.length - 1 };
    } else if (saved.submitted === true) state.submitted = true;
    else if (saved.answers) state = { ...state, ...saved, answers: { ...blankAnswers(), ...saved.answers } };
  }
} catch {}

const answers = state.answers;
let step = state.step || 0;
let busy = false;
const endpoint = window.SURVEY_CONFIG?.endpoint || '';
const connected = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function persist() {
  try { sessionStorage.setItem(storageKey, JSON.stringify({ ...state, step })); } catch {}
}
function showError(message) {
  $('#form-error').textContent = message;
  $('#form-error').hidden = false;
}
function updateNext(disabled, text) {
  const el = $('#next');
  if (!el) return;
  if (disabled !== undefined) el.disabled = disabled;
  if (text !== undefined) el.textContent = text;
}
function currentStep() { return C.steps[step]; }
function conceptFor(stepDef) {
  return C.concepts.find(c => c.id === stepDef.conceptId);
}
function stepReady() {
  return R.stepComplete(currentStep().id, answers);
}

function choiceOptions(stepDef) {
  const labels = C.labels[stepDef.optionsKey];
  const keys = Object.keys(labels);
  return `<div class="choice-options" role="radiogroup" aria-label="${escape(stepDef.question)}">${keys.map(value => {
    const selected = answers[stepDef.field] === value;
    return `<button type="button" class="choice-option" data-field="${stepDef.field}" data-choice="${value}" aria-pressed="${selected}">${escape(labels[value])}</button>`;
  }).join('')}</div>` + (stepDef.otherField ? otherField(stepDef) : '');
}

function otherField(stepDef) {
  const show = answers[stepDef.field] === 'other';
  return `<div class="other-text" ${show ? '' : 'hidden'}><label for="${stepDef.otherField}">Please specify</label><input id="${stepDef.otherField}" name="${stepDef.otherField}" type="text" maxlength="200" value="${escape(answers[stepDef.otherField])}" placeholder="Your answer" autocomplete="off"></div>`;
}

function matrixBlock() {
  const cols = Object.entries(C.labels.importance);
  return `<div class="matrix" role="group" aria-label="${escape(currentStep().question)}">
    <div class="matrix-head" aria-hidden="true"><span></span>${cols.map(([, label]) => `<span>${escape(label)}</span>`).join('')}</div>
    ${C.importanceRows.map(row => `<div class="matrix-row" role="radiogroup" aria-label="${escape(row.label)}">
      <span class="matrix-row-label">${escape(row.label)}</span>
      ${cols.map(([value, label]) => `<button type="button" class="matrix-cell" data-field="${row.key}" data-choice="${value}" aria-pressed="${answers[row.key] === value}" aria-label="${escape(label)}, ${escape(row.label)}"></button>`).join('')}
    </div>`).join('')}
  </div>
  <p class="instruction optional-note">Optional — you can skip any or all factors.</p>`;
}

function conceptBlock(stepDef) {
  const concept = conceptFor(stepDef);
  const likelihood = answers[concept.likelihoodKey];
  return `<div class="concept-card">
    <p class="concept-kicker">${escape(C.conceptSection.title)}</p>
    <h2 class="concept-title">${escape(concept.title)}</h2>
    <p class="instruction">${escape(concept.description)}</p>
    <figure class="concept-figure"><img src="${concept.image}" alt="${escape(concept.title)} concept preview" width="360" height="800"></figure>
  </div>
  <p class="subquestion">How likely would you be to use Scan &amp; Pay after seeing this? <span class="required" aria-hidden="true">*</span></p>
  <div class="choice-options" role="radiogroup" aria-label="How likely would you be to use Scan & Pay after seeing this?">${Object.entries(C.labels.likert).map(([value, label]) =>
    `<button type="button" class="choice-option" data-field="${concept.likelihoodKey}" data-choice="${value}" aria-pressed="${likelihood === value}">${escape(label)}</button>`
  ).join('')}</div>
  <div class="comment-field">
    <label for="${concept.feedbackKey}">What do you like about this concept, and what would you improve? <span>(optional)</span></label>
    <textarea id="${concept.feedbackKey}" name="${concept.feedbackKey}" maxlength="1500" rows="3" placeholder="Your answer">${escape(answers[concept.feedbackKey])}</textarea>
  </div>`;
}

function introBlock() {
  return `<div class="survey-intro-card">
    <div class="intro-card-header"><strong>About this survey</strong></div>
    <p class="intro-card-desc">${escape(C.description)}</p>
    <p class="intro-card-footer">${escape(C.duration)}</p>
  </div>
  <div class="survey-intro-card concept-preview-note">
    <div class="intro-card-header"><strong>${escape(C.conceptSection.title)}</strong></div>
    <p class="intro-card-desc">${escape(C.conceptSection.description)}</p>
  </div>`;
}

function render(focus = false) {
  $('#form-error').hidden = true;
  if (state.submitted) { showSuccess(); return; }
  const q = currentStep();
  const final = step === C.steps.length - 1;
  const kind = q.kind === 'intro' ? 'iMobile research'
    : q.kind === 'concept' ? C.conceptSection.title
    : q.kind === 'matrix' ? 'Payment priorities'
    : 'Current behaviour';
  const title = q.kind === 'intro' ? C.title
    : q.kind === 'concept' ? conceptFor(q).title
    : q.question;
  const requiredMark = q.required ? ' <span class="required" aria-hidden="true">*</span>' : '';
  const body = q.kind === 'intro' ? introBlock()
    : q.kind === 'choice' ? choiceOptions(q)
    : q.kind === 'matrix' ? matrixBlock()
    : conceptBlock(q);

  $('#screen').innerHTML = `<p class="question-kind">${kind}</p>
    <div class="question-heading"><h1 tabindex="-1">${q.kind === 'choice' || q.kind === 'matrix' ? escape(title) + requiredMark : escape(title)}</h1></div>
    ${q.kind === 'concept' ? '' : q.kind === 'intro' ? '' : ''}
    ${body}`;

  $('#step-label').textContent = `${step + 1} / ${C.steps.length}`;
  $('#progress-fill').style.width = `${(step + 1) / C.steps.length * 100}%`;
  $('#back').hidden = step === 0;
  updateNext(!stepReady() || (final && !connected), final
    ? (state.pendingResponse ? 'Try sending again' : 'Send feedback')
    : (step === 0 ? 'Start survey →' : 'Next →'));
  $('#back').disabled = !!state.pendingResponse;
  if (state.pendingResponse) document.querySelectorAll('[data-choice],textarea,input').forEach(el => el.disabled = true);
  if (focus) {
    $('#screen h1').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

$('#survey').addEventListener('click', event => {
  const button = event.target.closest('[data-choice]');
  if (!button || button.disabled || busy || state.pendingResponse) return;
  const field = button.dataset.field;
  const value = button.dataset.choice;
  if (!R.validAnswer(field, value) && value !== '') return;
  answers[field] = value;
  if (field === 'upi_app' && value !== 'other') answers.upi_app_other = '';
  if (field === 'unlock_reason' && value !== 'other') answers.unlock_reason_other = '';
  document.querySelectorAll(`[data-field="${field}"][data-choice]`).forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.choice === answers[field])));
  const otherWrap = $('.other-text');
  if (otherWrap) otherWrap.hidden = answers[currentStep().field] !== 'other';
  updateNext(!stepReady() || (step === C.steps.length - 1 && !connected));
  $('#form-error').hidden = true;
  persist();
});

$('#survey').addEventListener('input', event => {
  if (busy || state.pendingResponse) return;
  const el = event.target;
  if (!el.name || !Object.prototype.hasOwnProperty.call(R.fields, el.name)) return;
  answers[el.name] = el.value;
  updateNext(!stepReady() || (step === C.steps.length - 1 && !connected));
  persist();
});

$('#back').addEventListener('click', () => {
  if (step > 0 && !busy && !state.pendingResponse) {
    step--;
    persist();
    render(true);
  }
});

function payload() {
  return R.validate({ version: state.version, id: state.id, answers: { ...answers } });
}

function showSuccess() {
  $('#survey').innerHTML = '<section class="success"><h1 tabindex="-1">Thank you.</h1><p>Your feedback is saved.</p><button id="next-person" type="button" class="send">Start for next person</button></section>';
  $('#next-person').addEventListener('click', () => {
    try { sessionStorage.removeItem(storageKey); } catch {}
    location.reload();
  });
  $('.progress').hidden = true;
  $('#step-label').hidden = true;
  $('#survey h1').focus();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

$('#survey').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !stepReady()) return;
  if (step < C.steps.length - 1) {
    if (state.pendingResponse) return;
    step++;
    persist();
    render(true);
    return;
  }
  if (!connected) {
    showError('The response connection is unavailable. Add a collector endpoint in config.js (see SETUP.md), or browse locally to review the questions.');
    return;
  }
  let data;
  try {
    data = state.pendingResponse || payload();
    state.pendingResponse = data;
    persist();
  } catch {
    showError('Please complete the required questions.');
    return;
  }
  busy = true;
  updateNext(true, 'Sending…');
  $('#back').disabled = true;
  $('#form-error').hidden = true;
  document.querySelectorAll('[data-choice],textarea,input').forEach(el => el.disabled = true);
  try {
    await sendResponse(data);
    state.submitted = true;
    state.answers = blankAnswers();
    delete state.pendingResponse;
    persist();
    showSuccess();
  } catch {
    showError('Could not confirm your response. Your answers are kept here. Please retry; it won’t send a duplicate.');
    updateNext(false, 'Try sending again');
  } finally {
    busy = false;
  }
});

function sendResponse(data) {
  return new Promise((resolve, reject) => {
    const nonce = crypto.randomUUID();
    const iframe = document.createElement('iframe');
    iframe.name = 'survey-submit-' + nonce;
    iframe.hidden = true;
    iframe.title = 'Save survey response';
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = endpoint;
    form.target = iframe.name;
    form.hidden = true;
    for (const [key, value] of Object.entries({ payload: JSON.stringify(data), nonce, origin: location.origin })) {
      const input = document.createElement('input');
      input.name = key;
      input.value = value;
      form.append(input);
    }
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      form.remove();
      iframe.remove();
    };
    const receive = event => {
      let host;
      try { host = new URL(event.origin).hostname; } catch { return; }
      const trusted = event.origin.startsWith('https://') &&
        (host === 'script.google.com' || host === 'script.googleusercontent.com' || host.endsWith('-script.googleusercontent.com'));
      const m = event.data;
      if (!trusted || !m || m.type !== 'ux-survey-saved' || m.nonce !== nonce || m.id !== data.id) return;
      cleanup();
      m.ok === true ? resolve() : reject(Error('Save rejected.'));
    };
    const timer = setTimeout(() => { cleanup(); reject(Error('Confirmation timed out.')); }, 45000);
    window.addEventListener('message', receive);
    document.body.append(iframe, form);
    form.submit();
  });
}

render();
