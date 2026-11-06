import { request } from './api.js';
import { state } from './state.js';
import { renderAll, renderHistoryList } from './render.js';
import { reloadWsFiles } from './workspaces.js';
import { showToast, closePanels } from './utils.js';

export async function loadSessions() {
  if (!state.currentUser) return;
  try { state.sessions = await request('/api/history/sessions'); }
  catch (error) { showToast(error.message, true); }
  renderHistoryList();
}

export async function newChatSession() {
  if (!state.currentUser || !state.selectedWs || state.busy) return;
  try {
    const session = await request('/api/history/sessions', {
      method: 'POST', json: { workspace_name: state.selectedWs, title: 'Cuộc hội thoại mới' },
    });
    state.activeSession = session.session_id;
    state.chatHistory = [];
    await loadSessions();
    renderAll();
  } catch (error) { showToast(error.message, true); }
}

export async function loadSession(id) {
  if (state.busy) return;
  try {
    const session = await request(`/api/history/sessions/${encodeURIComponent(id)}`);
    if (!state.workspaces.some(ws => ws.name === session.workspace_name)) {
      showToast('Workspace của cuộc hội thoại này đã bị xóa.', true); return;
    }
    state.activeSession = id;
    state.selectedWs = session.workspace_name;
    state.activeSrc = -1;
    state.chatHistory = session.messages.map(m => ({ ...m, webResults: m.web_results || [], isWeb: m.is_web }));
    await reloadWsFiles(state.selectedWs);
    renderAll(); closePanels();
  } catch (error) { showToast(error.message, true); }
}

export async function persistSession() {
  if (!state.currentUser || !state.activeSession) return;
  const title = state.chatHistory.find(m => m.role === 'user')?.content.slice(0, 40) || 'Cuộc hội thoại';
  await request(`/api/history/sessions/${encodeURIComponent(state.activeSession)}`, {
    method: 'PUT', json: { session_id: state.activeSession, title,
      messages: state.chatHistory.map(m => ({ ...m, web_results: m.webResults || [], is_web: !!m.isWeb })),
    },
  });
  await loadSessions();
}

export async function deleteSession(id) {
  if (state.busy) return;
  try {
    await request(`/api/history/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (state.activeSession === id) { state.activeSession = null; state.chatHistory = []; }
    await loadSessions(); renderAll();
  } catch (error) { showToast(error.message, true); }
}
