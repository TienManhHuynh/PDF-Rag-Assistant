import { request, workspacePath } from './api.js';
import { state } from './state.js';
import { renderAll, renderControls, renderSources, renderWsList } from './render.js';
import { $, showToast, closePanels } from './utils.js';

export async function loadWorkspaces() {
  try {
    // Fetch documents only when a workspace is opened, avoiding N extra requests.
    state.workspaces = (await request('/api/workspaces')).map(ws => ({
      ...ws, files: state.workspaces.find(cached => cached.name === ws.name)?.files || [],
    }));
  } catch (error) { showToast(`Không tải được workspace: ${error.message}`, true); }
}

export async function reloadWsFiles(name) {
  const files = await request(`${workspacePath(name)}/files`);
  const workspace = state.workspaces.find(ws => ws.name === name);
  if (workspace) {
    workspace.files = files.map(file => typeof file === 'string' ? { name: file } : file);
    workspace.file_count = files.length;
  }
}

export async function selectWs(name) {
  if (state.busy || name === state.selectedWs) return;
  state.selectedWs = name; state.chatHistory = []; state.activeSrc = -1; state.activeSession = null;
  $('peResult').classList.remove('show');
  renderAll(); closePanels();
  try { await reloadWsFiles(name); renderAll(); }
  catch (error) { showToast(error.message, true); }
}

export async function createWs() {
  const name = $('newWsInput').value.trim();
  if (!name || state.busy) return;
  try {
    await request('/api/workspaces', { method: 'POST', json: { name } });
    $('newWsInput').value = '';
    await loadWorkspaces();
    await selectWs(name);
    renderAll();
    showToast(`Đã tạo workspace "${name}"`);
  } catch (error) { showToast(error.message, true); }
}

export async function deleteCurrentWs() {
  if (!state.selectedWs || state.busy || state.uploading) return;
  if (!confirm(`Xóa workspace "${state.selectedWs}" và các tài liệu bên trong?`)) return;
  try {
    await request(workspacePath(state.selectedWs), { method: 'DELETE' });
    state.selectedWs = null; state.chatHistory = []; state.activeSrc = -1; state.activeSession = null;
    await loadWorkspaces(); renderAll();
    showToast('Đã xóa workspace');
  } catch (error) { showToast(error.message, true); }
}

export function doClearChat() {
  if (state.busy) return;
  state.chatHistory = []; state.activeSession = null; renderAll();
}

export function triggerUpload() {
  if (!state.selectedWs) { showToast('Chọn workspace trước khi thêm tài liệu.', true); return; }
  $('fileInput').click();
}

export async function uploadFiles(fileList) {
  if (!fileList?.length || state.uploading) return;
  if (!state.selectedWs) { showToast('Chọn workspace trước khi thêm tài liệu.', true); return; }
  const files = Array.from(fileList);
  const workspace = state.selectedWs; // A workspace switch must not redirect later uploads.
  state.uploading = true; renderControls();
  $('uploadProgress').classList.add('show');
  let done = 0;
  try {
    for (const [index, file] of files.entries()) {
      $('progressLabel').textContent = `Đang xử lý ${index + 1}/${files.length}: ${file.name}`;
      try {
        if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('Chỉ hỗ trợ file PDF');
        const body = new FormData(); body.append('file', file); body.append('workspace_name', workspace);
        await request('/api/upload', { method: 'POST', body });
        done++;
      } catch (error) { showToast(`${file.name}: ${error.message}`, true); }
      $('progressBar').style.width = `${Math.round((index + 1) / files.length * 100)}%`;
    }
    await reloadWsFiles(workspace); renderWsList(); renderSources();
    showToast(`Đã thêm ${done}/${files.length} tài liệu vào "${workspace}".`, done < files.length);
  } catch (error) { showToast(error.message, true); }
  finally {
    state.uploading = false; renderControls();
    $('fileInput').value = ''; $('uploadProgress').classList.remove('show');
    $('progressBar').style.width = '0%';
  }
}
