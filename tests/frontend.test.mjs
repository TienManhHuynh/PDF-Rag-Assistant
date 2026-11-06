import test from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../frontend/assets/js/state.js';
import { request } from '../frontend/assets/js/api.js';
import { formatText, safeUrl } from '../frontend/assets/js/utils.js';
import { sendMsg } from '../frontend/assets/js/chat.js';
import { doSummarize } from '../frontend/assets/js/documents.js';
import { persistSession } from '../frontend/assets/js/sessions.js';
import { deleteCurrentWs, uploadFiles } from '../frontend/assets/js/workspaces.js';

const elements = new Map();
globalThis.document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, {
      value: '', style: {}, classList: { add() {}, remove() {} },
      setAttribute() {}, insertAdjacentHTML() {},
    });
    return elements.get(id);
  },
};
const reply = data => ({ ok: true, status: 200, json: async () => data });
function reset() {
  elements.clear();
  Object.assign(state, { selectedWs: 'study', workspaces: [{ name: 'study', file_count: 1, files: [{ name: "lesson's.pdf" }] }],
    chatHistory: [], activeSrc: -1, currentUser: null, activeSession: null, sessions: [], busy: false, uploading: false, webSearchOn: false });
}

test('model text and unsafe URLs cannot inject HTML', () => {
  assert.equal(formatText('<img src=x onerror=alert(1)>\n**bold**'), '&lt;img src=x onerror=alert(1)&gt;\n<strong>bold</strong>');
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('https://example.com'), 'https://example.com/');
});

test('API wrapper rejects HTTP failures and preserves empty 204 responses', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({ detail: [{ msg: 'Invalid workspace' }] }) });
  await assert.rejects(request('/api/workspaces'), /Invalid workspace/);
  globalThis.fetch = async () => ({ ok: true, status: 204 });
  assert.equal(await request('/api/workspaces/study'), null);
});

test('chat prevents duplicate requests while generation is pending', async () => {
  reset(); document.getElementById('chatInput').value = 'A < B?';
  let resolveAnswer; let calls = 0;
  globalThis.fetch = () => { calls++; return new Promise(resolve => { resolveAnswer = resolve; }); };
  const first = sendMsg();
  document.getElementById('chatInput').value = 'second';
  await sendMsg();
  assert.equal(calls, 1);
  assert.equal(state.busy, true);
  resolveAnswer(reply({ answer: 'Answer', citations: [] })); await first;
  assert.equal(state.chatHistory.length, 2);
  assert.equal(state.chatHistory[0].content, 'A < B?');
  assert.equal(state.busy, false);
});

test('summarize sends filename from state without the display icon', async () => {
  reset(); state.activeSrc = 0;
  let payload;
  globalThis.fetch = async (path, options) => { payload = JSON.parse(options.body); return reply({ summary: 'Summary' }); };
  await doSummarize();
  assert.equal(payload.file_name, "lesson's.pdf");
  assert.equal(state.chatHistory[0].role, 'assistant');
});

test('saved history retains web links and web mode', async () => {
  reset(); state.currentUser = { sub: 'test-user' }; state.activeSession = 'session';
  state.chatHistory = [{ role: 'assistant', content: 'Answer', webResults: [{ url: 'https://example.com' }], isWeb: true }];
  let payload;
  globalThis.fetch = async (path, options) => {
    if (options.method === 'PUT') { payload = JSON.parse(options.body); return reply({ status: 'ok' }); }
    return reply([]);
  };
  await persistSession();
  assert.equal(payload.messages[0].is_web, true);
  assert.equal(payload.messages[0].web_results.length, 1);
});

test('failed workspace deletion preserves current selection and messages', async () => {
  reset(); globalThis.confirm = () => true;
  state.chatHistory = [{ role: 'user', content: 'Keep this' }];
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({ detail: 'DB error' }) });
  await deleteCurrentWs();
  assert.equal(state.selectedWs, 'study');
  assert.equal(state.chatHistory.length, 1);
});

test('multi-file upload keeps original workspace when user switches', async () => {
  reset(); const destinations = [];
  globalThis.fetch = async (path, options) => {
    if (path === '/api/upload') {
      destinations.push(options.body.get('workspace_name'));
      state.selectedWs = 'another';
      return reply({ status: 'success' });
    }
    return reply(['a.pdf', 'b.pdf']);
  };
  await uploadFiles([new File(['a'], 'a.pdf'), new File(['b'], 'b.pdf')]);
  assert.deepEqual(destinations, ['study', 'study']);
  assert.equal(state.uploading, false);
});
