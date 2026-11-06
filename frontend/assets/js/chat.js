import { request } from './api.js';
import { state } from './state.js';
import { renderAll } from './render.js';
import { persistSession } from './sessions.js';
import { $, autoH, showToast } from './utils.js';

// One lock covers session creation, generation and saving the answer.
export async function runConversation(action) {
  if (state.busy || !state.selectedWs) return;
  state.busy = true; renderAll();
  try {
    if (state.currentUser && !state.activeSession) {
      const session = await request('/api/history/sessions', {
        method: 'POST', json: { workspace_name: state.selectedWs, title: 'Cuộc hội thoại mới' },
      });
      state.activeSession = session.session_id;
    }
    await action();
    try { await persistSession(); }
    catch (error) { showToast(`Chưa lưu được lịch sử: ${error.message}`, true); }
  } catch (error) { showToast(error.message, true); }
  finally { state.busy = false; renderAll(); }
}

export async function sendMsg() {
  const question = $('chatInput').value.trim();
  if (!question || !state.selectedWs || state.busy) return;
  await runConversation(async () => {
    $('chatInput').value = ''; autoH($('chatInput'));
    state.chatHistory.push({ role: 'user', content: question, citations: [] });
    renderAll();
    try {
      const data = await request(state.webSearchOn ? '/api/chat/web' : '/api/chat', {
        method: 'POST', json: { question, workspace_name: state.selectedWs, top_k: 5 },
      });
      state.chatHistory.push({ role: 'assistant', content: data.answer || 'Chưa có câu trả lời.',
        citations: data.citations || [], webResults: data.web_results || [], isWeb: state.webSearchOn });
    } catch (error) {
      state.chatHistory.push({ role: 'assistant', content: `Không thể trả lời: ${error.message}`, citations: [] });
    }
  });
}

export function toggleWebSearch() {
  if (state.busy) return;
  state.webSearchOn = !state.webSearchOn;
  $('btnWebSearch').classList.toggle('active', state.webSearchOn);
  $('btnWebSearch').setAttribute('aria-pressed', String(state.webSearchOn));
}

export async function checkApiHealth() {
  try {
    await request('/health', { signal: AbortSignal.timeout(3000) });
    $('apiDot').className = 'api-dot ok'; $('apiLabel').textContent = 'Đã kết nối';
  } catch {
    $('apiDot').className = 'api-dot err'; $('apiLabel').textContent = 'Mất kết nối';
  }
}
