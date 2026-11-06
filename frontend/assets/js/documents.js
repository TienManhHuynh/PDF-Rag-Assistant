import { request } from './api.js';
import { state, currentFiles } from './state.js';
import { runConversation } from './chat.js';
import { renderSources } from './render.js';
import { $, formatText, showToast } from './utils.js';

export function toggleSrc(index) {
  state.activeSrc = state.activeSrc === index ? -1 : index;
  renderSources();
}

export function highlightSrc(name) {
  const index = currentFiles().findIndex(file => file.name === name);
  if (index < 0) return;
  state.activeSrc = index; renderSources();
  document.body.classList.remove('sidebar-open');
  document.body.classList.add('sources-open');
  $('btnSources').setAttribute('aria-expanded', 'true');
  $(`sc${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export async function doSummarize() {
  if (!state.selectedWs || !currentFiles().length) {
    showToast('Thêm tài liệu PDF trước khi tóm tắt.', true); return;
  }
  // Read the actual filename from state, independent of icon or display text.
  const file = currentFiles()[state.activeSrc]?.name || null;
  await runConversation(async () => {
    const data = await request('/api/summarize', {
      method: 'POST', json: { workspace_name: state.selectedWs, file_name: file },
    });
    state.chatHistory.push({ role: 'assistant',
      content: `**${file ? `Tóm tắt: ${file}` : `Tóm tắt workspace: ${state.selectedWs}`}**\n\n${data.summary}`,
      citations: [],
    });
  });
}

let explaining = false;
export async function doPanelExplain() {
  const term = $('peInput').value.trim();
  if (!term || !state.selectedWs || explaining) return;
  const workspace = state.selectedWs;
  explaining = true; $('btnPanelExplain').disabled = true;
  $('peResult').textContent = 'Đang tra cứu…'; $('peResult').classList.add('show');
  try {
    const data = await request('/api/explain', { method: 'POST', json: { term, workspace_name: workspace } });
    if (workspace === state.selectedWs) $('peResult').innerHTML = formatText(data.explanation || 'Không tìm thấy.');
  } catch (error) {
    if (workspace === state.selectedWs) $('peResult').textContent = error.message;
  } finally { explaining = false; $('btnPanelExplain').disabled = false; }
}
