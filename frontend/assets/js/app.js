import { $, autoH, closePanels } from './utils.js';
import { renderAll } from './render.js';
import { fetchCurrentUser, handleAuth } from './auth.js';
import { newChatSession, loadSession, deleteSession } from './sessions.js';
import { loadWorkspaces, selectWs, createWs, deleteCurrentWs, doClearChat, triggerUpload, uploadFiles } from './workspaces.js';
import { sendMsg, toggleWebSearch, checkApiHealth } from './chat.js';
import { toggleSrc, highlightSrc, doSummarize, doPanelExplain } from './documents.js';
import { toggleVoice, speakText } from './voice.js';

const actions = {
  btnAuth: handleAuth, btnNewChat: newChatSession, btnClearChat: doClearChat,
  btnDeleteWs: deleteCurrentWs, btnCreateWs: createWs, btnUploadZone: triggerUpload,
  btnSummarize: doSummarize, btnSend: sendMsg, btnPanelExplain: doPanelExplain,
  btnWebSearch: toggleWebSearch, btnVoice: toggleVoice, panelBackdrop: closePanels,
};
for (const [id, action] of Object.entries(actions)) $(id).addEventListener('click', action);

for (const [id, action] of [['newWsInput', createWs], ['peInput', doPanelExplain]]) {
  $(id).addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) action(); });
}
$('chatInput').addEventListener('input', () => autoH($('chatInput')));
$('chatInput').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendMsg(); }
});
$('wsList').addEventListener('click', event => {
  const item = event.target.closest('[data-ws-name]');
  if (item) selectWs(item.dataset.wsName);
});
$('historyList').addEventListener('click', event => {
  const remove = event.target.closest('[data-delete-session]');
  const session = event.target.closest('[data-session]');
  if (remove) deleteSession(remove.dataset.deleteSession);
  else if (session) loadSession(session.dataset.session);
});
$('srcList').addEventListener('click', event => {
  const card = event.target.closest('[data-src-idx]');
  if (card) toggleSrc(Number(card.dataset.srcIdx));
});
$('chatMsgs').addEventListener('click', event => {
  const chip = event.target.closest('[data-file-name]');
  const tts = event.target.closest('.btn-tts');
  if (chip) highlightSrc(chip.dataset.fileName);
  if (tts) speakText(tts.dataset.text, tts);
});
$('fileInput').addEventListener('change', () => uploadFiles($('fileInput').files));
const zone = $('btnUploadZone');
zone.addEventListener('keydown', event => {
  if (['Enter', ' '].includes(event.key)) { event.preventDefault(); triggerUpload(); }
});
zone.addEventListener('dragover', event => { event.preventDefault(); zone.classList.add('dragover'); });
zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
zone.addEventListener('drop', event => {
  event.preventDefault(); zone.classList.remove('dragover'); uploadFiles(event.dataTransfer.files);
});
for (const [id, panel] of [['btnSidebar', 'sidebar'], ['btnSources', 'sources']]) {
  $(id).addEventListener('click', () => {
    const open = document.body.classList.contains(`${panel}-open`);
    closePanels();
    if (!open) {
      document.body.classList.add(`${panel}-open`);
      $(id).setAttribute('aria-expanded', 'true');
    }
  });
}
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanels(); });
renderAll();
await Promise.all([checkApiHealth(), fetchCurrentUser(), loadWorkspaces()]);
renderAll();
