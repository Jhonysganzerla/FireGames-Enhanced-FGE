// Servidores ao vivo via WebSocket + fila de auto-conectar persistida.
//
// Eventos:
//   bus.emit('toast', ...) — feedback ao usuário
//
// Persistência:
//   localStorage 'fge_server_autoconnect' — Set<"ip:port">

import { $ } from '../core/dom.js';

const WS_URL  = 'wss://api.firegamesnetwork.com/ws/servers';
const AC_KEY  = 'fge_server_autoconnect';

export function init({ store, bus }) {
  const autoConnects = new Set(JSON.parse(localStorage.getItem(AC_KEY) || '[]'));
  const saveAC = () => localStorage.setItem(AC_KEY, JSON.stringify([...autoConnects]));

  let wsConn     = null;
  let wsGroups   = [];
  let wsPrevSnap = new Map();
  let modeFilter = 'all';

  // ── Helpers ─────────────────────────────────────────────────────────
  const srvKey = s => `${s.ip}:${s.port}`;

  function flatServers() {
    const out = [];
    for (const grp of wsGroups) {
      for (const s of (grp.servers || [])) out.push({ ...s, _mode: grp.gameMode?.name || '—' });
    }
    return out;
  }

  function steamConnectURL(s) {
    const appid = s.game === 'csgo' ? 4465480 : 730;
    return `steam://run/${appid}//+connect ${s.ip}:${s.port}`;
  }
  function fireConnect(s) {
    const url = steamConnectURL(s);
    let opened = false;
    try { opened = !!window.open(url, '_blank'); } catch (_) {}
    if (!opened) { try { window.location.href = url; } catch (_) {} }
  }

  function notify(title, body) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    } catch (_) {}
    bus.emit('toast', { msg: `${title} — ${body}`, type: 'success', ms: 4500 });
  }

  function checkAutoConnects(next) {
    if (!autoConnects.size) return;
    for (const key of [...autoConnects]) {
      const s = next.get(key);
      if (!s) continue;
      const players = Number(s.players) || 0;
      const max     = Number(s.maxPlayers) || 0;
      const ok = s.status !== 'offline' && max > 0 && players < max;
      if (ok) {
        autoConnects.delete(key);
        saveAC();
        fireConnect(s);
        notify(`🚀 Auto-conectando: ${s.name || s.ip}`, `${players}/${max} — ${s.map}`);
      }
    }
  }

  function occClass(s) {
    if (s.status === 'offline') return 'occ-off';
    const r = (Number(s.players) || 0) / (Number(s.maxPlayers) || 1);
    if (r > 0.9)  return 'occ-high';
    if (r > 0.5)  return 'occ-mid';
    return 'occ-low';
  }

  // ── Render ──────────────────────────────────────────────────────────
  function setWsStatus(text, cls) {
    $('srv-status').textContent = text;
    const btn = $('btn-servers');
    btn.classList.remove('live', 'error');
    if (cls) btn.classList.add(cls);
  }

  function renderModeChips() {
    const counts = { all: 0 };
    for (const grp of wsGroups) {
      const m = grp.gameMode?.name || '—';
      counts[m] = (counts[m] || 0) + (grp.servers?.length || 0);
      counts.all += grp.servers?.length || 0;
    }
    const modes = ['all', ...Object.keys(counts).filter(k => k !== 'all')];
    $('srv-modes').innerHTML = modes.map(m => {
      const lbl = m === 'all' ? 'Todos' : m;
      return `<div class="chip ${modeFilter === m ? 'on' : ''}" data-m="${m}">${lbl}<span class="chip-count">${counts[m]}</span></div>`;
    }).join('');
    $('srv-modes').querySelectorAll('.chip').forEach(el =>
      el.addEventListener('click', () => {
        modeFilter = el.dataset.m;
        renderModeChips();
        renderGrid($('srv-search').value);
      })
    );
  }

  function renderGrid(filter = '') {
    const f = filter.toLowerCase();
    let list = flatServers();
    if (modeFilter !== 'all') list = list.filter(s => s._mode === modeFilter);
    if (f) list = list.filter(s =>
      (s.name || '').toLowerCase().includes(f) ||
      (s.map  || '').toLowerCase().includes(f) ||
      (s.ip   || '').includes(f));

    if (!list.length) {
      $('srv-grid').innerHTML = '<div class="hint" style="grid-column:1/-1">Nenhum servidor</div>';
      return;
    }

    $('srv-grid').innerHTML = list.map(s => {
      const key = srvKey(s);
      const armed   = autoConnects.has(key);
      const offline = s.status === 'offline' || (!s.maxPlayers);
      const players = Number(s.players) || 0;
      const max     = Number(s.maxPlayers) || 0;
      const full    = !offline && max > 0 && players >= max;
      const occ     = offline || max === 0 ? 0 : Math.min(100, (players / max) * 100);
      const occCls  = occClass(s);
      let tagText, tagCls;
      if (offline)       { tagText = 'OFFLINE';            tagCls = 'srv-tag-off';  }
      else if (full)     { tagText = 'CHEIO';              tagCls = 'srv-tag-full'; }
      else if (occ > 90) { tagText = `${Math.round(occ)}%`; tagCls = 'srv-tag-high'; }
      else if (occ > 50) { tagText = `${Math.round(occ)}%`; tagCls = 'srv-tag-mid';  }
      else               { tagText = `${Math.round(occ)}%`; tagCls = 'srv-tag-low';  }

      const mapImg = s.map && s.map.toLowerCase() !== 'offline'
        ? `https://cdn.firegamesnetwork.com/${s.game || 'cs2'}/maps/${s.map}.webp` : '';

      return `
        <div class="srv-card ${full ? 'full' : ''} ${offline ? 'offline' : ''} ${armed ? 'armed' : ''}" data-key="${key}">
          <div class="srv-head">
            <div class="srv-thumb ${mapImg ? '' : 'empty'}" ${mapImg ? `style="background-image:url('${mapImg}')"` : ''}>${mapImg ? '' : '🗺'}</div>
            <div class="srv-info">
              <div class="srv-name" title="${(s.name || '').replace(/"/g,'&quot;')}">${s.name || `${s.ip}:${s.port}`}</div>
              <div class="srv-sub">
                <span class="srv-mode">${s._mode}</span>
                <span class="srv-map">${s.map || '—'}</span>
              </div>
            </div>
          </div>
          <div class="srv-stats">
            <div class="srv-players">${offline ? '—' : players}<span class="max">/${max || '?'}</span></div>
            <div class="srv-occ-tag ${tagCls}">${tagText}</div>
          </div>
          <div class="srv-bar ${occCls}"><div style="width:${occ}%"></div></div>
          <div class="srv-actions">
            <button class="srv-btn primary" data-act="connect" ${offline ? 'disabled' : ''}>▶ Conectar</button>
            <button class="srv-btn" data-act="copy" title="Copiar 'connect ip:port'">📋</button>
            <button class="srv-btn queue ${armed ? 'on' : ''}" data-act="auto" title="${armed ? 'Sair da fila' : 'Ficar na fila — conecta automaticamente quando liberar'}">⏳</button>
          </div>
        </div>`;
    }).join('');

    $('srv-grid').querySelectorAll('.srv-card').forEach(card => {
      const key = card.dataset.key;
      const s = flatServers().find(x => srvKey(x) === key);
      if (!s) return;
      card.querySelectorAll('.srv-btn').forEach(btn =>
        btn.addEventListener('click', () => {
          const act = btn.dataset.act;
          if (act === 'connect') {
            fireConnect(s);
          } else if (act === 'copy') {
            navigator.clipboard.writeText(`connect ${s.ip}:${s.port}`);
            bus.emit('toast', { msg: 'IP copiado', type: 'success', ms: 1400 });
          } else if (act === 'auto') {
            if (autoConnects.has(key)) {
              autoConnects.delete(key);
              saveAC();
              bus.emit('toast', { msg: '⏳ Saiu da fila', type: 'info', ms: 1600 });
            } else {
              const players = Number(s.players) || 0;
              const max     = Number(s.maxPlayers) || 0;
              if (s.status !== 'offline' && max > 0 && players < max) {
                fireConnect(s);
                bus.emit('toast', { msg: `▶ Conectando em ${s.name || s.ip}…`, type: 'success', ms: 2200 });
              } else {
                autoConnects.add(key);
                saveAC();
                if ('Notification' in window && Notification.permission === 'default') {
                  Notification.requestPermission();
                }
                bus.emit('toast', { msg: '⏳ Na fila — entra sozinho quando liberar', type: 'success', ms: 2600 });
              }
            }
            renderGrid($('srv-search').value);
          }
        })
      );
    });
  }

  // ── WebSocket lifecycle ─────────────────────────────────────────────
  function openWS() {
    if (wsConn && wsConn.readyState <= 1) return;
    setWsStatus('conectando…');
    try { wsConn = new WebSocket(WS_URL); }
    catch (e) { setWsStatus('erro', 'error'); return; }

    wsConn.onopen  = () => setWsStatus('ao vivo', 'live');
    wsConn.onerror = () => setWsStatus('erro', 'error');
    wsConn.onclose = () => {
      setWsStatus('desconectado');
      if ($('servers-overlay').classList.contains('visible')) {
        setTimeout(openWS, 3000);
      }
    };
    wsConn.onmessage = ev => {
      let data; try { data = JSON.parse(ev.data); } catch { return; }
      const groups = Array.isArray(data) ? data : (data.servers || data.data || []);
      const next = new Map();
      for (const grp of groups) for (const s of (grp.servers || [])) next.set(srvKey(s), s);
      checkAutoConnects(next);
      wsPrevSnap = next;
      wsGroups = groups;
      if ($('servers-overlay').classList.contains('visible')) {
        renderModeChips();
        renderGrid($('srv-search').value);
      }
    };
  }
  function closeWS() {
    if (wsConn) { try { wsConn.close(); } catch (_) {} wsConn = null; }
    setWsStatus('desconectado');
  }

  // ── UI overlay open/close ───────────────────────────────────────────
  function openOverlay() {
    $('servers-overlay').classList.add('visible');
    $('srv-search').value = '';
    if (!wsGroups.length) $('srv-grid').innerHTML = '<div class="hint" style="grid-column:1/-1">Aguardando dados…</div>';
    else { renderModeChips(); renderGrid(''); }
    openWS();
  }
  function closeOverlay() {
    $('servers-overlay').classList.remove('visible');
    if (!autoConnects.size) closeWS();
  }

  $('btn-servers').addEventListener('click', openOverlay);
  $('srv-back')   .addEventListener('click', closeOverlay);
  $('srv-close')  .addEventListener('click', closeOverlay);
  $('srv-search').addEventListener('input', e => renderGrid(e.target.value));

  // Background WS se há fila pendente
  if (autoConnects.size) openWS();

  return {
    openWS, closeWS,
    queue:    (k) => { autoConnects.add(k); saveAC(); openWS(); },
    unqueue:  (k) => { autoConnects.delete(k); saveAC(); },
    list:     () => [...autoConnects],
    servers:  () => flatServers(),
  };
}
