// Feature modules share one explicit state; no global window variables.
export const state = {
  workspaces: [], selectedWs: null, chatHistory: [], activeSrc: -1,
  currentUser: null, sessions: [], activeSession: null,
  webSearchOn: false, busy: false, uploading: false,
};

export function currentFiles() {
  return state.workspaces.find(ws => ws.name === state.selectedWs)?.files || [];
}
