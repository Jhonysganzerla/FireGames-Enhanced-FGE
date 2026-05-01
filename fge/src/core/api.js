// Wrapper de fetch com Bearer token. Token é injetado via setToken()
// (geralmente pelo módulo core/token.js após descobrir/aceitar do usuário).

export const BASE = 'https://api.firegamesnetwork.com';

let _token = null;
export function setToken(t) { _token = t; }
export function getToken()  { return _token; }

export async function apiSend(method, path, body) {
  const opts = {
    method,
    headers: { accept: 'application/json' },
    credentials: 'omit', // a API exige credentials:omit
  };
  if (_token) opts.headers.authorization = `Bearer ${_token}`;
  if (body !== undefined) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(`${BASE}${path}`, opts);
  if (!r.ok) {
    const txt = await r.text().catch(() => r.statusText);
    const err = new Error(`${r.status}: ${txt}`);
    err.status = r.status;
    throw err;
  }
  return r.json().catch(() => ({}));
}

export const apiGet    = (path)       => apiSend('GET',    path);
export const apiPut    = (path, body) => apiSend('PUT',    path, body);
export const apiPost   = (path, body) => apiSend('POST',   path, body);
export const apiDelete = (path)       => apiSend('DELETE', path);

// Helpers de inventário
export const inventoryAPI = {
  list:        ()             => apiGet('/inventory'),
  create:      (item)         => apiPost('/inventory', item),
  update:      (item)         => apiPut('/inventory', item),
  remove:      (id)           => apiDelete(`/inventory/${id}`),
  toggleEquip: (id)           => apiPut(`/inventory/equipped/${id}`),
  setTeam:     (id, team)     => apiPut(`/inventory/team/${id}/${team}`),
};

export function toArray(val) {
  if (Array.isArray(val)) return val;
  if (val && Array.isArray(val.items)) return val.items;
  if (val && Array.isArray(val.data))  return val.data;
  if (val && typeof val === 'object')  return Object.values(val);
  return [];
}
