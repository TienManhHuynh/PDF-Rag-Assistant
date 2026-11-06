import { request } from './api.js';
import { state } from './state.js';
import { $ } from './utils.js';
import { loadSessions } from './sessions.js';

export async function fetchCurrentUser() {
  try { state.currentUser = (await request('/auth/me')).user || null; }
  catch { state.currentUser = null; }
  const user = state.currentUser;
  $('userNameEl').textContent = user?.name || user?.email || 'Chế độ khách';
  $('btnAuth').textContent = user ? 'Đăng xuất' : 'Đăng nhập';
  $('historySection').style.display = user ? '' : 'none';
  $('userAvatarPlaceholder').textContent = user ? (user.name || user.email || '?')[0] : 'K';
  if (user) await loadSessions();
}

export function handleAuth() {
  window.location.href = state.currentUser ? '/auth/logout' : '/auth/login';
}
