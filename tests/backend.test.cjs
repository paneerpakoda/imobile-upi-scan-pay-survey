const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { response } = require('./survey.test.cjs');
const root = path.resolve(__dirname, '..');

function fixture() {
  const rows = [];
  let writes = 0;
  let locked = false;
  let columns = 26;
  const sheet = {
    getMaxColumns: () => columns,
    insertColumnsAfter(after, count) { assert.equal(after, columns); columns += count; },
    getLastRow: () => rows.length,
    setFrozenRows() {},
    appendRow(row) { writes++; rows.push(Array.from(row)); },
    getRange(row, col, count = 1, width = 1) {
      assert.ok(col + width - 1 <= columns);
      return {
        getValues: () => rows.slice(row - 1, row - 1 + count).map(r => Array.from({ length: width }, (_, i) => r[col - 1 + i] ?? '')),
        getValue: () => rows[row - 1][col - 1],
        createTextFinder(value) {
          return {
            matchEntireCell() { return this; },
            findNext() {
              const i = rows.findIndex((r, j) => j >= row - 1 && r[col - 1] === value);
              return i < 0 ? null : { getRow: () => i + 1 };
            }
          };
        }
      };
    }
  };
  const ctx = vm.createContext({
    Date,
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: () => sheet }),
      flush() {}
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'test-sheet' }) },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => { locked = true; return true; },
        releaseLock: () => { locked = false; }
      })
    },
    HtmlService: {
      XFrameOptionsMode: { ALLOWALL: 'allowall' },
      createHtmlOutput: html => ({ html, setXFrameOptionsMode() { return this; } })
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'backend/Code.gs'), 'utf8'), ctx);
  return { ctx, p: response(), rows, getWrites: () => writes, isLocked: () => locked };
}

function post(f, origin = 'https://paneerpakoda.github.io') {
  return f.ctx.doPost({
    parameter: {
      origin,
      nonce: '01234567-89ab-4cde-8fab-0123456789ab',
      payload: JSON.stringify(f.p)
    }
  }).html;
}

test('valid response stores one row plus header', () => {
  const f = fixture();
  f.ctx.saveResponse(f.p);
  assert.equal(f.rows.length, 2);
  assert.equal(f.rows[1][f.rows[0].indexOf('upi_app')], 'imobile');
  assert.equal(f.isLocked(), false);
});

test('retry of the same response never adds a second row', () => {
  const f = fixture();
  f.ctx.saveResponse(f.p);
  f.ctx.saveResponse(f.p);
  assert.equal(f.rows.length, 2);
});

test('changing an already saved response fails rather than overwriting it', () => {
  const f = fixture();
  f.ctx.saveResponse(f.p);
  f.p.answers.concept_1_likelihood = 'very_likely';
  assert.throws(() => f.ctx.saveResponse(f.p));
  assert.equal(f.rows.length, 2);
});

test('formula-like comments are stored as literal text', () => {
  const f = fixture();
  f.p.answers.concept_1_feedback = ' =IMPORTXML("https://example.com")';
  f.ctx.saveResponse(f.p);
  const col = f.rows[0].indexOf('concept_1_feedback');
  assert.equal(f.rows[1][col][0], "'");
});

test('wrong page origin cannot write and cannot receive success acknowledgment', () => {
  const f = fixture();
  assert.match(post(f, 'https://unrelated.example'), /"ok":false/);
  assert.equal(f.getWrites(), 0);
});

test('confirmation is emitted only after valid storage', () => {
  const f = fixture();
  assert.match(post(f), /"ok":true/);
  assert.equal(f.rows.length, 2);
});
