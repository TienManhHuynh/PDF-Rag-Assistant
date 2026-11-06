import { state, currentFiles } from './state.js';
import { $, esc, formatText, safeUrl } from './utils.js';

export function renderControls() {
  const unavailable = !state.selectedWs || state.busy;
  $('wsPill').textContent = state.selectedWs || 'Chưa chọn workspace';
  $('chatInput').placeholder = state.selectedWs ? `Hỏi về "${state.selectedWs}"…` : 'Chọn hoặc tạo workspace để bắt đầu…';
  for (const id of ['btnSend', 'btnSummarize', 'btnVoice', 'btnClearChat', 'btnDeleteWs']) {
    $(id).disabled = unavailable;
  }
  for (const id of ['btnCreateWs', 'newWsInput', 'btnNewChat']) $(id).disabled = state.busy;
  $('btnDeleteWs').disabled ||= state.uploading;
  $('chatMsgs').setAttribute('aria-busy', String(state.busy));
}

export function renderWsList() {
  $('wsList').innerHTML = state.workspaces.length ? state.workspaces.map(ws => `
    <button class="ws-item ${ws.name === state.selectedWs ? 'active' : ''}"
      data-ws-name="${esc(ws.name)}" aria-pressed="${ws.name === state.selectedWs}">
      <span aria-hidden="true">▤</span><span class="ws-item-name">${esc(ws.name)}</span>
      <span class="ws-item-count">${ws.file_count}</span>
    </button>`).join('') : '<div class="ws-empty-hint">Tạo workspace đầu tiên để nhóm tài liệu theo chủ đề.</div>';
}

export function renderHistoryList() {
  $('historyList').innerHTML = state.sessions.length ? state.sessions.map(session => `
    <div class="hist-item ${session.session_id === state.activeSession ? 'active' : ''}">
      <button class="hist-item-name" data-session="${esc(session.session_id)}">${esc(session.title)}</button>
      <button class="hist-item-del" data-delete-session="${esc(session.session_id)}" aria-label="Xóa cuộc hội thoại">×</button>
    </div>`).join('') : '<div class="ws-empty-hint">Chưa có cuộc hội thoại.</div>';
}

export function renderChat() {
  renderControls();
  if (!state.chatHistory.length) {
    $('chatMsgs').innerHTML = `<div class="chat-empty"><p>${state.selectedWs
      ? 'Thêm tài liệu PDF và đặt câu hỏi để bắt đầu.'
      : 'Chọn hoặc tạo workspace để bắt đầu hỏi đáp tài liệu.'}</p></div>`;
  } else {
    $('chatMsgs').innerHTML = state.chatHistory.map(messageHTML).join('');
  }
  if (state.busy) $('chatMsgs').insertAdjacentHTML('beforeend', '<div class="msg" role="status" aria-label="Đang tạo câu trả lời"><div class="av bot">✦</div><div class="typing"><span></span><span></span><span></span></div></div>');
  $('chatMsgs').scrollTop = $('chatMsgs').scrollHeight;
}

function messageHTML(message) {
  const user = message.role === 'user';
  const citations = (message.citations || []).map(c => `<button class="cite-chip" data-file-name="${esc(c.file_name)}">${esc(c.file_name)} · Tr. ${esc(c.page)}</button>`).join('');
  const links = (message.webResults || []).slice(0, 3).map(link => {
    const url = safeUrl(link.url);
    return url ? `<a class="web-chip" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(link.title || url)}</a>` : '';
  }).join('');
  return `<div class="msg ${user ? 'user' : ''}"><div class="av ${user ? 'user' : 'bot'}">${user ? 'B' : '✦'}</div>
    <div class="message-body"><div class="message-label">${user ? 'Bạn' : 'PDF Assistant'}${message.isWeb ? ' · Web Search' : ''}</div>
      <div class="bub ${user ? 'user' : 'bot'}">${formatText(message.content)}</div>
      ${user ? '' : `<div class="cite-chips">${citations}</div><div class="web-chips">${links}</div><button class="btn-tts" data-text="${esc(message.content)}" aria-label="Đọc to câu trả lời">◖ Đọc to</button>`}
    </div></div>`;
}

export function renderSources() {
  const files = currentFiles();
  $('srcBadge').textContent = `${files.length} tài liệu`;
  $('srcList').innerHTML = files.length ? files.map((file, index) => {
    const citation = state.chatHistory.flatMap(m => m.citations || []).find(c => c.file_name === file.name);
    return `<button class="src-card ${index === state.activeSrc ? 'active' : ''}" id="sc${index}" data-src-idx="${index}" aria-expanded="${index === state.activeSrc}">
      <span class="src-card-name"><span class="pdf-ico">PDF</span>${esc(file.name)}</span>
      <span class="src-card-meta">${citation ? `Đã trích dẫn · Trang ${esc(citation.page)}` : 'Sẵn sàng để hỏi đáp'}</span>
      <span class="src-snippet">${esc(citation?.snippet || 'Chọn Tóm tắt để xem nội dung chính của tài liệu này.')}</span></button>`;
  }).join('') : '<div class="src-empty"><div class="src-empty-icon">▤</div><strong>Thư viện của bạn</strong><div>Thêm PDF vào workspace.<br>Nguồn trích dẫn sẽ xuất hiện tại đây.</div></div>';
}

export function renderAll() {
  renderWsList(); renderHistoryList(); renderChat(); renderSources();
}
