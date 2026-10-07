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
    else if (saved.answers) {
      const known = blankAnswers();
      for (const key of Object.keys(known)) if (typeof saved.answers[key] === 'string') known[key] = saved.answers[key];
      state = { ...state, ...saved, answers: known };
    }
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
function visibleSteps() {
  return C.steps.filter(s => R.stepVisible(s.id, answers));
}
function visibleIndex() {
  return visibleSteps().findIndex(s => s.id === currentStep().id);
}
function findVisibleStep(from, direction) {
  let i = from + direction;
  while (i >= 0 && i < C.steps.length) {
    if (R.stepVisible(C.steps[i].id, answers)) return i;
    i += direction;
  }
  return from;
}
function syncBranchAnswers() {
  R.clearHiddenAnswers(answers);
}
function progressMeta() {
  const visible = visibleSteps();
  const index = Math.max(0, visible.findIndex(s => s.id === currentStep().id));
  return { current: index + 1, total: R.maxVisibleCount(answers) };
}

function choiceOptions(stepDef) {
  const labels = C.labels[stepDef.optionsKey];
  const keys = Object.keys(labels);
  const withLogos = stepDef.withLogos === true;
  const figure = stepDef.image
    ? `<figure class="prompt-figure"><img src="${escape(stepDef.image)}" alt="${escape(stepDef.imageAlt || '')}" width="360" height="800"></figure>`
    : '';
  return `${figure}<div class="choice-options" role="radiogroup" aria-label="${escape(stepDef.question)}">${keys.map(value => {
    const selected = answers[stepDef.field] === value;
    const logo = withLogos ? C.upiAppLogos[value] : '';
    const mark = logo
      ? `<span class="choice-logo" aria-hidden="true"><img src="${escape(logo)}" alt="" width="28" height="28"></span>`
      : '';
    return `<button type="button" class="choice-option${withLogos ? ' has-logo' : ''}" data-field="${stepDef.field}" data-choice="${value}" aria-pressed="${selected}">${mark}<span class="choice-label">${escape(labels[value])}</span></button>`;
  }).join('')}</div>` + (stepDef.otherField ? otherField(stepDef) : '');
}

function otherField(stepDef) {
  const show = answers[stepDef.field] === 'other';
  return `<div class="other-text" ${show ? '' : 'hidden'}><label for="${stepDef.otherField}">Please specify</label><input id="${stepDef.otherField}" name="${stepDef.otherField}" type="text" maxlength="200" value="${escape(answers[stepDef.otherField])}" placeholder="Your answer" autocomplete="off"></div>`;
}

function optionButtons(field, legend, labels) {
  return `<div class="choice-options" role="radiogroup" aria-label="${escape(legend)}">${Object.entries(labels).map(([value, label]) =>
    `<button type="button" class="choice-option" data-field="${field}" data-choice="${value}" aria-pressed="${answers[field] === value}">${escape(label)}</button>`
  ).join('')}</div>`;
}

function conceptBlock(stepDef) {
  const concept = conceptFor(stepDef);
  const segment = R.conceptSegment(answers);
  const prompt = C.conceptPrompts[segment];
  const scale = segment === 'notice' ? C.labels.notice : C.labels.likert;
  const caption = concept.caption ? `<figcaption>${escape(concept.caption)}</figcaption>` : '';
  const tooltip = concept.tooltip ? `<p class="concept-tooltip">${escape(concept.tooltip)}</p>` : '';
  return `<p class="instruction">Look at this screen, then answer below.</p>
  <figure class="concept-figure"><img src="${concept.image}" alt="">${tooltip}${caption}</figure>
  <p class="subquestion concept-prompt">${escape(prompt)}</p>
  ${optionButtons(concept.likelihoodKey, prompt, scale)}
  <div class="comment-field">
    <label for="${concept.feedbackKey}">${escape(C.commentPrompt)} <span>(optional)</span></label>
    <textarea id="${concept.feedbackKey}" name="${concept.feedbackKey}" maxlength="1500" rows="3" placeholder="Your answer">${escape(answers[concept.feedbackKey])}</textarea>
  </div>`;
}

function introBlock() {
  return `<div class="survey-intro-card">
    <div class="intro-card-header"><strong>About this survey</strong></div>
    <p class="intro-card-desc">${escape(C.description)}</p>
    <p class="intro-card-footer">${escape(C.duration)}</p>
  </div>`;
}

function render(focus = false) {
  $('#form-error').hidden = true;
  if (state.submitted) { showSuccess(); return; }
  syncBranchAnswers();
  if (!R.stepVisible(currentStep().id, answers)) {
    step = findVisibleStep(step, step > 0 ? -1 : 1);
  }
  const q = currentStep();
  const visible = visibleSteps();
  const final = visible[visible.length - 1]?.id === q.id;
  const progress = progressMeta();
  const title = q.kind === 'intro' ? C.title
    : q.kind === 'concept' ? conceptFor(q).title
    : q.question;
  const body = q.kind === 'intro' ? introBlock()
    : q.kind === 'choice' ? choiceOptions(q)
    : conceptBlock(q);

  $('#screen').innerHTML = `<div class="question-heading"><h1 tabindex="-1">${escape(title)}</h1></div>
    ${body}`;

  $('#step-label').textContent = `${progress.current} / ${progress.total}`;
  $('#progress-fill').style.width = `${progress.current / progress.total * 100}%`;
  $('#back').hidden = progress.current <= 1;
  updateNext(!stepReady(), final
    ? (connected
      ? (state.pendingResponse ? 'Try sending again' : 'Send feedback')
      : 'Finish preview')
    : (q.kind === 'intro' ? 'Start survey →' : 'Next →'));
  updateHint();
  $('#back').disabled = !!state.pendingResponse;
  if (state.pendingResponse) document.querySelectorAll('[data-choice],textarea,input').forEach(el => el.disabled = true);
  if (focus) {
    $('#screen h1').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function updateHint() {
  const hint = $('#next-hint');
  if (!hint) return;
  hint.textContent = 'Choose an answer to continue.';
  hint.hidden = stepReady();
}

function isFinalVisibleStep() {
  const visible = visibleSteps();
  return visible[visible.length - 1]?.id === currentStep().id;
}

$('#survey').addEventListener('click', event => {
  const button = event.target.closest('[data-choice]');
  if (!button || button.disabled || busy || state.pendingResponse) return;
  const field = button.dataset.field;
  const value = button.dataset.choice;
  if (!R.validAnswer(field, value, answers) && value !== '') return;
  answers[field] = value;
  if (field === 'upi_app' && value !== 'other') answers.upi_app_other = '';
  if (field === 'nonuser_reason' && value !== 'other') answers.nonuser_reason_other = '';
  if (field === 'found_scan' && value !== 'other') answers.found_scan_other = '';
  if (field === 'persuade_reason' && value !== 'other') answers.persuade_reason_other = '';
  if (field === 'upi_app' || field === 'opens_imobile' || field === 'scan_method' || field === 'knew_scan') syncBranchAnswers();
  document.querySelectorAll(`[data-field="${field}"][data-choice]`).forEach(b =>
    b.setAttribute('aria-pressed', String(b.dataset.choice === answers[field])));
  const otherWrap = $('.other-text');
  if (otherWrap) otherWrap.hidden = answers[currentStep().field] !== 'other';
  updateNext(!stepReady());
  updateHint();
  $('#form-error').hidden = true;
  persist();
});

$('#survey').addEventListener('input', event => {
  if (busy || state.pendingResponse) return;
  const el = event.target;
  if (!el.name || !Object.prototype.hasOwnProperty.call(R.fields, el.name)) return;
  answers[el.name] = el.type === 'checkbox' ? (el.checked ? el.value : '') : el.value;
  updateNext(!stepReady());
  updateHint();
  persist();
});

$('#back').addEventListener('click', () => {
  if (busy || state.pendingResponse) return;
  const prev = findVisibleStep(step, -1);
  if (prev === step) return;
  step = prev;
  persist();
  render(true);
});

function payload() {
  syncBranchAnswers();
  return R.validate({ version: state.version, id: state.id, answers: { ...answers } });
}

function showSuccess(preview = false) {
  const note = preview
    ? 'This was a preview. Answers were not saved.'
    : 'Your feedback is saved.';
  $('#survey').innerHTML = `<section class="success"><h1 tabindex="-1">Thank you.</h1><p>${note}</p><button id="next-person" type="button" class="send">Start for next person</button></section>`;
  $('#next-person').addEventListener('click', () => {
    try { sessionStorage.removeItem(storageKey); } catch {}
    location.reload();
  });
  const progressRow = $('.progress-row');
  if (progressRow) progressRow.hidden = true;
  $('#survey h1').focus();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

$('#survey').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !stepReady()) return;
  if (!isFinalVisibleStep()) {
    if (state.pendingResponse) return;
    syncBranchAnswers();
    step = findVisibleStep(step, 1);
    persist();
    render(true);
    return;
  }
  if (!connected) {
    try {
      payload();
    } catch {
      showError('Please complete the required questions.');
      return;
    }
    state.submitted = true;
    state.answers = blankAnswers();
    delete state.pendingResponse;
    persist();
    showSuccess(true);
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
    showSuccess(false);
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
