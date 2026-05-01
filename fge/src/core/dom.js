// Singleton de host + shadow DOM. Inicializado uma vez no boot.

let _shadow = null;
let _host = null;

export const ROOT_ID = 'fge-root';

export function mountHost() {
  // Toggle: re-execução remove
  const existing = document.getElementById(ROOT_ID);
  if (existing) { existing.remove(); throw new Error('TOGGLE'); }

  _host = document.createElement('div');
  _host.id = ROOT_ID;
  document.body.appendChild(_host);
  _shadow = _host.attachShadow({ mode: 'open' });
  return { host: _host, shadow: _shadow };
}

export function shadow() { return _shadow; }
export function host()   { return _host; }

export const $  = (id)  => _shadow.getElementById(id);
export const $q = (sel) => _shadow.querySelectorAll(sel);
export const $1 = (sel) => _shadow.querySelector(sel);
