export const $ = id => document.getElementById(id);

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

// Escape model/user text before adding the small supported Markdown subset.
export function formatText(value) {
  return esc(value).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');
}

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

let toastTimer;
export function showToast(message, isError = false, ms = 5000) {
  const toast = $('uploadToast');
  toast.textContent = message;
  toast.className = `upload-toast show${isError ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
}

export function autoH(element) {
  element.style.height = 'auto';
  element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
}

export function closePanels() {
  document.body.classList.remove('sidebar-open', 'sources-open');
  $('btnSidebar').setAttribute('aria-expanded', 'false');
  $('btnSources').setAttribute('aria-expanded', 'false');
}
