// Cliente HTTP simples para a API local.
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.erro || `Erro ${res.status}`);
  }
  return data;
}

export const api = {
  // Config
  getConfig: () => request('/config'),
  updateConfig: (minhaParticipacao) => request('/config', { method: 'PUT', body: { minhaParticipacao } }),
  getConfigHistorico: () => request('/config/historico'),

  // Influenciadores
  listInfluenciadores: () => request('/influenciadores'),
  getInfluenciador: (id) => request(`/influenciadores/${id}`),
  createInfluenciador: (body) => request('/influenciadores', { method: 'POST', body }),
  updateInfluenciador: (id, body) => request(`/influenciadores/${id}`, { method: 'PUT', body }),
  deleteInfluenciador: (id) => request(`/influenciadores/${id}`, { method: 'DELETE' }),

  // Lançamentos
  createLancamento: (body) => request('/lancamentos', { method: 'POST', body }),
  updateLancamento: (id, body) => request(`/lancamentos/${id}`, { method: 'PUT', body }),
  deleteLancamento: (id) => request(`/lancamentos/${id}`, { method: 'DELETE' }),

  // Dashboard / Ranking
  getDashboard: (inicio, fim) => request(`/dashboard?inicio=${inicio}&fim=${fim}`),
  getRanking: () => request('/ranking'),
};
