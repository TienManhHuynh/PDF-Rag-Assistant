// The UI and API are served by FastAPI on the same origin.
export async function request(path, { json, ...options } = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    ...(json === undefined ? {} : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
    }),
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map(item => item.msg).join('; ') : data.detail;
    throw new Error(detail || `Yêu cầu thất bại (${response.status})`);
  }
  return data;
}

export const workspacePath = name => `/api/workspaces/${encodeURIComponent(name)}`;
