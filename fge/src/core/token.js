// Descoberta + interceptação + UI modal de Bearer token.
//
// install()    — patch fetch+XHR (chame ANTES de qualquer outro request)
// findToken()  — varre interceptados/storage/cookies, retorna o de maior exp
// showModal($) — abre modal pedindo confirmação/colar de token

let interceptedTokenData = null;

export function isJwt(val) {
  return typeof val === 'string' && val.startsWith('eyJ') && val.split('.').length === 3;
}

export function decodeJwtPayload(jwt) {
  try {
    return JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch (_) { return null; }
}

export function tokenExpiry(tok) {
  const p = decodeJwtPayload(tok);
  if (!p?.exp) return null;
  return new Date(p.exp * 1000);
}

function captureFromHeader(value) {
  if (typeof value !== 'string') return;
  const m = value.match(/^Bearer\s+(.+)$/i);
  if (!m) return;
  const tok = m[1].trim();
  if (!isJwt(tok)) return;
  const payload = decodeJwtPayload(tok);
  const exp = payload?.exp || 0;
  if (!interceptedTokenData || exp > interceptedTokenData.exp) {
    interceptedTokenData = { token: tok, exp };
  }
}

// Patch fetch + XHR pra capturar Bearer tokens trafegando.
// Idempotente — chame antes do app subir.
export function install() {
  const origFetch = window.fetch;
  window.fetch = async function(...args) {
    const init = args[1];
    if (init?.headers) {
      let auth;
      if (init.headers instanceof Headers) auth = init.headers.get('Authorization');
      else if (typeof init.headers === 'object') {
        auth = init.headers['Authorization'] || init.headers['authorization'];
      }
      if (auth) captureFromHeader(auth);
    }
    return origFetch.apply(this, args);
  };

  const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    if (header.toLowerCase() === 'authorization') captureFromHeader(value);
    return origSetHeader.call(this, header, value);
  };
}

export function findToken() {
  const candidates = [];
  try {
    if (interceptedTokenData?.token) candidates.push(interceptedTokenData);

    for (const store of [localStorage, sessionStorage]) {
      try {
        for (let i = 0; i < store.length; i++) {
          const val = store.getItem(store.key(i));
          if (!isJwt(val)) continue;
          const p = decodeJwtPayload(val);
          if (p) candidates.push({ token: val, exp: p.exp || 0 });
        }
      } catch (_) {}
    }

    try {
      if (document.cookie) {
        for (const cookie of document.cookie.split(';').map(c => c.trim())) {
          const eqIdx = cookie.indexOf('=');
          if (eqIdx === -1) continue;
          const val = cookie.substring(eqIdx + 1);
          if (!isJwt(val)) continue;
          const p = decodeJwtPayload(val);
          if (p) candidates.push({ token: val, exp: p.exp || 0 });
        }
      }
    } catch (_) {}
  } catch (e) {
    console.warn('[token] findToken erro inesperado:', e);
  }

  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.exp - a.exp)[0].token;
}

// Mostra modal e resolve com token confirmado.
// $ = scoped getElementById factory do core/dom.js
export function showModal($, prefill = '', message = '') {
  return new Promise((resolve, reject) => {
    const modal  = $('token-modal');
    const input  = $('tm-input');
    const status = $('tm-status');
    const error  = $('tm-error');
    const hint   = $('tm-hint');
    const okBtn  = $('tm-ok');

    input.value = prefill;
    error.textContent = '';

    if (prefill) {
      const exp = tokenExpiry(prefill);
      status.className = 'found';
      status.textContent = exp
        ? `✓ Token encontrado — expira ${exp.toLocaleDateString('pt-BR')} ${exp.toLocaleTimeString('pt-BR')}`
        : '✓ Token encontrado';
      hint.textContent = 'Edite se necessário ou clique em Continuar';
    } else {
      status.className = 'missing';
      status.textContent = message || '⚠ Token não encontrado — cole abaixo';
      hint.textContent = 'Copie do DevTools: Network > qualquer request > Authorization';
    }

    modal.style.display = 'flex';

    function tryConfirm() {
      const val = input.value.trim().replace(/^Bearer\s+/i, '');
      if (!isJwt(val)) {
        error.textContent = 'Token inválido — deve começar com eyJ e ter 3 partes.';
        return;
      }
      modal.style.display = 'none';
      resolve(val);
    }

    okBtn.onclick = tryConfirm;
    input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); tryConfirm(); } };
    $('tm-close').onclick = () => {
      modal.style.display = 'none';
      reject(new Error('Cancelado'));
    };
  });
}
