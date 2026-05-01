(async function FireGamesEnhanced() {
  'use strict';

  // Network interception to capture tokens from fetch/XHR
  let interceptedTokenData = null;

  // Override fetch to capture Authorization headers
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const [url, init] = args;
    if (init && init.headers) {
      let authHeader;
      if (init.headers instanceof Headers) {
        authHeader = init.headers.get('Authorization');
      } else if (typeof init.headers === 'object') {
        authHeader = init.headers['Authorization'] || init.headers['authorization'];
      }
      if (authHeader && typeof authHeader === 'string') {
        const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
        if (bearerMatch) {
          const tok = bearerMatch[1].trim();
          if (isJwt(tok)) {
            try {
              const parts = tok.split('.');
              const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
              const exp = payload.exp || 0;
              if (!interceptedTokenData || exp > interceptedTokenData.exp) {
                interceptedTokenData = { token: tok, exp };
              }
            } catch (e) {}
          }
        }
      }
    }
    return originalFetch.apply(this, args);
  };

  // Override XMLHttpRequest to capture Authorization headers
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
    if (header.toLowerCase() === 'authorization' && typeof value === 'string') {
      const bearerMatch = value.match(/^Bearer\s+(.+)$/i);
      if (bearerMatch) {
        const tok = bearerMatch[1].trim();
        if (isJwt(tok)) {
          try {
            const parts = tok.split('.');
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            const exp = payload.exp || 0;
            if (!interceptedTokenData || exp > interceptedTokenData.exp) {
              interceptedTokenData = { token: tok, exp };
            }
          } catch (e) {}
        }
      }
    }
    return originalXHRSetRequestHeader.call(this, header, value);
  };

  // Toggle: colar novamente fecha/reabre
  const ROOT_ID = 'fge-root';
  const existing = document.getElementById(ROOT_ID);
  if (existing) { existing.remove(); return; }

  // ── Host + Shadow DOM criados antes de tudo (modal precisa deles) ─────────
  const host = document.createElement('div');
  host.id = ROOT_ID;
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const $  = id  => shadow.getElementById(id);
  const $q = sel => shadow.querySelectorAll(sel);

  // ── CSS ───────────────────────────────────────────────────────────────────
  const CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :host { font-family: 'Segoe UI', system-ui, sans-serif; }

    /* ════════════════════════════════════
       TOKEN MODAL
    ════════════════════════════════════ */
    #token-modal {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 480px; max-width: calc(100vw - 32px);
      background: #12121f; border: 1px solid #272743;
      border-radius: 12px; box-shadow: 0 12px 48px rgba(0,0,0,.8);
      display: flex; flex-direction: column;
      color: #dde0ff; z-index: 2147483647; overflow: hidden;
    }
    #tm-hdr {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; background: #0e0e1c;
      border-bottom: 1px solid #272743;
      cursor: move; user-select: none;
    }
    #tm-title { font-weight: 700; font-size: 13px; color: #818cf8; }
    #tm-close {
      background: none; border: none; color: #555;
      cursor: pointer; font-size: 20px; line-height: 1; padding: 0 4px;
      border-radius: 4px; transition: background .1s, color .1s;
    }
    #tm-close:hover { background: #e44; color: #fff; }
    #tm-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
    #tm-status {
      font-size: 12px; padding: 8px 12px; border-radius: 6px;
      background: #1e1e35; color: #888;
    }
    #tm-status.found  { background: #0d2e1a; color: #4eff8a; border: 1px solid #1a5030; }
    #tm-status.missing { background: #2a1a0a; color: #ffaa44; border: 1px solid #5a3a0a; }
    #tm-lbl { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: .5px; }
    #tm-input {
      width: 100%; min-height: 80px; resize: vertical;
      background: #0a0a18; border: 1px solid #272743;
      border-radius: 6px; color: #dde0ff; padding: 8px 10px;
      font-size: 12px; font-family: monospace; outline: none;
      transition: border-color .1s; line-height: 1.4;
    }
    #tm-input:focus { border-color: #818cf8; }
    #tm-error { font-size: 11px; color: #ff6666; min-height: 16px; }
    #tm-footer {
      display: flex; align-items: center; justify-content: flex-end;
      gap: 10px; padding: 12px 20px;
      border-top: 1px solid #272743; background: #0e0e1c;
    }
    #tm-hint { flex: 1; font-size: 11px; color: #555; }
    #tm-ok {
      background: #818cf8; border: none; color: #fff;
      border-radius: 7px; padding: 8px 22px; cursor: pointer;
      font-size: 13px; font-weight: 600;
      transition: background .1s, opacity .1s;
    }
    #tm-ok:hover { background: #9aa0ff; }
    #tm-ok:disabled { opacity: .45; cursor: default; }

    /* ════════════════════════════════════
       PAINEL PRINCIPAL
    ════════════════════════════════════ */
    #panel {
      position: fixed; top: 16px; right: 16px;
      width: 920px; min-width: 560px; max-width: calc(100vw - 32px);
      height: 600px; min-height: 380px; max-height: calc(100vh - 32px);
      background: #12121f; border: 1px solid #272743;
      border-radius: 12px; box-shadow: 0 12px 48px rgba(0,0,0,.7);
      display: none; flex-direction: column;
      color: #dde0ff; overflow: hidden; z-index: 2147483647;
      resize: both;
    }
    #panel.visible { display: flex; }
    /* Custom resize handle visual (canto inferior direito) */
    #resize-grip {
      position: absolute; right: 2px; bottom: 2px;
      width: 14px; height: 14px; cursor: nwse-resize;
      pointer-events: none; opacity: .35;
      background:
        linear-gradient(135deg, transparent 0 60%, #818cf8 60% 65%, transparent 65% 75%, #818cf8 75% 80%, transparent 80% 90%, #818cf8 90% 95%, transparent 95%);
    }

    #hdr {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; background: #0e0e1c;
      border-bottom: 1px solid #272743;
      cursor: move; user-select: none; flex-shrink: 0;
    }
    #hdr-left { display: flex; align-items: center; gap: 6px; }
    #hdr-title { font-weight: 700; font-size: 13px; color: #818cf8; letter-spacing: .4px; }
    #hdr-sub   { font-size: 11px; color: #555; }
    #btn-token {
      background: #1e1e35; border: none; color: #818cf8;
      cursor: pointer; font-size: 10px; padding: 2px 8px;
      border-radius: 4px; letter-spacing: .3px;
      transition: background .1s;
    }
    #btn-token:hover { background: #2a2a50; }
    #btn-close {
      background: none; border: none; color: #555;
      cursor: pointer; font-size: 20px; line-height: 1; padding: 0 4px;
      border-radius: 4px; transition: background .1s, color .1s;
    }
    #btn-close:hover { background: #e44; color: #fff; }

    #body { display: flex; flex: 1; overflow: hidden; }

    #sidebar {
      width: 210px; border-right: 1px solid #272743;
      display: flex; flex-direction: column; flex-shrink: 0;
    }
    #inv-search-wrap { padding: 8px; border-bottom: 1px solid #272743; flex-shrink: 0; }
    #inv-search {
      width: 100%; background: #0a0a18; border: 1px solid #272743;
      border-radius: 6px; color: #dde0ff; padding: 6px 8px;
      font-size: 12px; outline: none;
    }
    #inv-search:focus { border-color: #818cf8; }
    #inv-list { flex: 1; overflow-y: auto; padding: 4px; }
    #inv-list::-webkit-scrollbar { width: 3px; }
    #inv-list::-webkit-scrollbar-thumb { background: #272743; border-radius: 2px; }

    .inv-item {
      padding: 7px 10px; border-radius: 6px; cursor: pointer;
      transition: background .1s; display: flex; flex-direction: column; gap: 2px;
    }
    .inv-item:hover { background: #1e1e35; }
    .inv-item.active { background: #2a2a50; }
    .inv-name {
      font-size: 12px; font-weight: 600; color: #ccd;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .inv-item.active .inv-name { color: #818cf8; }
    .inv-meta { font-size: 10px; color: #555; }
    .inv-item.equipped .inv-name::after { content: ' ✓'; color: #818cf8; }

    #main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    #no-sel {
      flex: 1; display: flex; align-items: center; justify-content: center;
      color: #444; font-size: 14px;
    }
    #editor { display: none; flex-direction: column; flex: 1; overflow: hidden; }
    #editor.visible { display: flex; }

    #tabs {
      display: flex; border-bottom: 1px solid #272743;
      padding: 0 12px; gap: 2px; flex-shrink: 0; background: #0e0e1c;
    }
    .tab {
      padding: 8px 14px; background: none; border: none;
      color: #666; cursor: pointer; font-size: 12px;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: color .1s; white-space: nowrap;
    }
    .tab:hover { color: #aaa; }
    .tab.on { color: #818cf8; border-bottom-color: #818cf8; }

    #tab-body { flex: 1; overflow-y: auto; padding: 16px; }
    #tab-body::-webkit-scrollbar { width: 3px; }
    #tab-body::-webkit-scrollbar-thumb { background: #272743; border-radius: 2px; }

    .pane { display: none; }
    .pane.on { display: block; }

    .row { display: flex; gap: 14px; margin-bottom: 14px; }
    .row .fld { flex: 1; margin-bottom: 0; }
    .fld { margin-bottom: 14px; }
    .lbl { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }

    input[type=text], input[type=number], select, textarea {
      width: 100%; background: #0a0a18; border: 1px solid #272743;
      border-radius: 6px; color: #dde0ff; padding: 7px 10px;
      font-size: 13px; outline: none; transition: border-color .1s;
    }
    input[type=text]:focus, input[type=number]:focus, select:focus { border-color: #818cf8; }
    select option { background: #12121f; }

    .chk-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
    .chk-row label { font-size: 13px; color: #ccd; cursor: pointer; }
    input[type=checkbox] { width: 15px; height: 15px; cursor: pointer; accent-color: #818cf8; }

    .st-badge {
      display: inline-block; background: #c45a00; color: #ffe0c0;
      padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 700;
      letter-spacing: .3px; margin-bottom: 14px;
    }

    .grid-search {
      width: 100%; background: #0a0a18; border: 1px solid #272743;
      border-radius: 6px; color: #dde0ff; padding: 7px 10px;
      font-size: 13px; outline: none; margin-bottom: 10px; transition: border-color .1s;
    }
    .grid-search:focus { border-color: #818cf8; }

    .item-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
      gap: 6px; max-height: 280px; overflow-y: auto;
    }
    .item-grid::-webkit-scrollbar { width: 3px; }
    .item-grid::-webkit-scrollbar-thumb { background: #272743; border-radius: 2px; }

    .gi {
      display: flex; flex-direction: column; align-items: center;
      padding: 8px 4px; border-radius: 8px; cursor: pointer;
      border: 2px solid transparent; background: #0a0a18;
      transition: border-color .12s, background .12s; text-align: center;
    }
    .gi:hover { background: #1e1e35; }
    .gi.on { border-color: #818cf8; background: #1a1a40; }
    .gi img { width: 62px; height: 62px; object-fit: contain; }
    .gi-img-ph { width: 62px; height: 62px; background: #1e1e35; border-radius: 4px; }
    .gi-name { font-size: 9px; color: #888; margin-top: 4px; line-height: 1.3; word-break: break-word; }
    .gi.on .gi-name { color: #818cf8; }

    .clear-btn {
      background: #1e1e35; border: none; color: #888;
      border-radius: 6px; padding: 5px 14px; cursor: pointer;
      font-size: 12px; margin-bottom: 10px; transition: color .1s;
    }
    .clear-btn:hover { color: #e44; }

    .hint { font-size: 11px; color: #444; text-align: center; padding: 20px 0; }

    #footer {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-top: 1px solid #272743;
      background: #0e0e1c; flex-shrink: 0;
    }
    #item-info { flex: 1; font-size: 11px; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #btn-reload {
      background: #1e1e35; border: none; color: #888;
      border-radius: 7px; padding: 7px 13px; cursor: pointer; font-size: 12px;
      transition: color .1s;
    }
    #btn-reload:hover { color: #ccd; }
    #btn-save {
      background: #818cf8; border: none; color: #fff;
      border-radius: 7px; padding: 8px 22px; cursor: pointer;
      font-size: 13px; font-weight: 600; transition: background .1s, opacity .1s;
    }
    #btn-save:hover:not(:disabled) { background: #9aa0ff; }
    #btn-save:disabled { opacity: .45; cursor: default; }

    #toast {
      display: none; position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -50%) scale(.92);
      padding: 14px 28px; border-radius: 10px;
      font-size: 14px; font-weight: 700; letter-spacing: .3px;
      pointer-events: none; z-index: 30;
      box-shadow: 0 10px 30px rgba(0,0,0,.5);
      animation: toast-in .22s ease-out forwards;
    }
    @keyframes toast-in {
      0%   { transform: translate(-50%, -50%) scale(.85); opacity: 0; }
      100% { transform: translate(-50%, -50%) scale(1);   opacity: 1; }
    }
    .t-info    { background: #1e1e35; color: #ccd; border: 1px solid #2a2a50; }
    .t-success { background: #0d2e1a; color: #4eff8a; border: 1px solid #1a5030; }
    .t-error   { background: #2e0d0d; color: #ff6666; border: 1px solid #5a1a1a; }

    /* ════════════════════════════════════
       NEW: Type chips, badges, add flow
    ════════════════════════════════════ */
    #type-chips {
      display: flex; flex-wrap: wrap; gap: 4px;
      padding: 8px; border-bottom: 1px solid #272743; flex-shrink: 0;
    }
    .chip {
      background: #0a0a18; border: 1px solid #272743; color: #888;
      border-radius: 999px; padding: 3px 9px; font-size: 10px;
      cursor: pointer; transition: all .12s; white-space: nowrap;
      font-weight: 600; letter-spacing: .3px; text-transform: uppercase;
    }
    .chip:hover { border-color: #818cf8; color: #ccd; }
    .chip.on { background: #818cf8; color: #fff; border-color: #818cf8; }
    .chip-count { opacity: .65; margin-left: 4px; font-size: 9px; }

    .type-badge {
      display: inline-block; font-size: 9px; padding: 1px 6px;
      border-radius: 3px; font-weight: 700; letter-spacing: .4px;
      text-transform: uppercase; margin-right: 4px;
    }
    .tb-skin     { background: #1a3a5a; color: #6ec1ff; }
    .tb-knife    { background: #4a1a3a; color: #ff8ad9; }
    .tb-glove    { background: #3a1a1a; color: #ff8a8a; }
    .tb-agent    { background: #1a3a1a; color: #8aff8a; }
    .tb-musickit { background: #3a3a1a; color: #ffeb8a; }
    .tb-pin      { background: #3a1a3a; color: #d98aff; }
    .tb-graffiti { background: #1a3a3a; color: #8affff; }

    #btn-add {
      background: #818cf8; color: #fff; border: none;
      border-radius: 6px; padding: 7px; cursor: pointer;
      font-size: 12px; font-weight: 600; transition: background .1s;
      width: 100%;
    }
    #btn-add:hover { background: #9aa0ff; }

    /* Create overlay (browse master lists) */
    #create-overlay {
      position: absolute; inset: 0;
      background: rgba(8,8,18,.96); backdrop-filter: blur(4px);
      display: none; flex-direction: column; z-index: 20;
    }
    #create-overlay.visible { display: flex; }
    #co-hdr {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-bottom: 1px solid #272743;
      background: #0e0e1c; flex-shrink: 0;
    }
    #co-title { flex: 1; font-size: 13px; font-weight: 700; color: #818cf8; }
    #co-back {
      background: #1e1e35; border: none; color: #aaa;
      cursor: pointer; font-size: 13px; padding: 5px 12px;
      border-radius: 6px; display: inline-flex; align-items: center; gap: 6px;
      transition: background .1s, color .1s;
    }
    #co-back:hover { background: #2a2a50; color: #818cf8; }
    #co-back .arr { font-size: 16px; line-height: 1; }
    #co-close {
      background: none; border: none; color: #555;
      cursor: pointer; font-size: 20px; padding: 0 4px;
    }
    #co-close:hover { color: #e44; }
    #co-types { display: flex; gap: 4px; padding: 8px 12px; border-bottom: 1px solid #272743; flex-wrap: wrap; }
    #co-search-wrap { padding: 8px 12px; border-bottom: 1px solid #272743; }
    #co-search {
      width: 100%; background: #0a0a18; border: 1px solid #272743;
      border-radius: 6px; color: #dde0ff; padding: 7px 10px;
      font-size: 13px; outline: none;
    }
    #co-search:focus { border-color: #818cf8; }
    #co-grid {
      flex: 1; overflow-y: auto; padding: 12px;
      display: grid; gap: 8px;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      align-content: start;
    }
    #co-grid::-webkit-scrollbar { width: 4px; }
    #co-grid::-webkit-scrollbar-thumb { background: #272743; border-radius: 2px; }
    .co-card {
      background: #0a0a18; border: 1px solid #272743; border-radius: 8px;
      padding: 8px; cursor: pointer; transition: all .12s;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      text-align: center;
    }
    .co-card:hover { border-color: #818cf8; background: #1a1a40; }
    .co-card img { width: 90px; height: 70px; object-fit: contain; }
    .co-card-ph { width: 90px; height: 70px; background: #1e1e35; border-radius: 4px; }
    .co-card-name { font-size: 10px; color: #aaa; line-height: 1.3; word-break: break-word; }

    /* Footer destructive buttons */
    .btn-foot {
      background: #1e1e35; border: none; color: #888;
      border-radius: 7px; padding: 7px 13px; cursor: pointer; font-size: 12px;
      transition: color .1s, background .1s;
    }
    .btn-foot:hover { color: #ccd; }
    .btn-foot.danger:hover { color: #fff; background: #5a1a1a; }
    .btn-foot.action:hover { color: #fff; background: #1a5030; }

    /* Hide-by-type helper */
    .hide-this { display: none !important; }

    /* ════════════════════════════════════
       SERVERS OVERLAY
    ════════════════════════════════════ */
    #btn-servers {
      background: #1e3a5a; color: #6ec1ff; border: none;
      border-radius: 6px; padding: 7px; cursor: pointer;
      font-size: 12px; font-weight: 600; transition: background .1s;
      width: 100%; margin-bottom: 8px;
    }
    #btn-servers:hover { background: #2a4a70; }
    #btn-servers .ws-dot {
      display: inline-block; width: 7px; height: 7px; border-radius: 50%;
      background: #555; margin-right: 4px; vertical-align: middle;
    }
    #btn-servers.live  .ws-dot { background: #4eff8a; box-shadow: 0 0 6px #4eff8a; }
    #btn-servers.error .ws-dot { background: #ff6666; }

    #srv-grid {
      flex: 1; overflow-y: auto; padding: 12px;
      display: grid; gap: 10px;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      grid-auto-rows: 158px;
      align-content: start;
    }
    #srv-grid::-webkit-scrollbar { width: 4px; }
    #srv-grid::-webkit-scrollbar-thumb { background: #272743; border-radius: 2px; }

    .srv-card {
      background: #12121f; border: 1px solid #272743; border-radius: 10px;
      padding: 10px 12px;
      display: flex; flex-direction: column; gap: 8px;
      height: 100%; box-sizing: border-box;
      transition: border-color .12s;
    }
    .srv-card:hover    { border-color: #3a3a60; }
    .srv-card.full     { border-color: #5a1a1a; }
    .srv-card.full .srv-stats .srv-players { color: #ff8a8a; }
    .srv-card.offline  { opacity: .55; }
    .srv-card.watched  { border-color: #818cf8; box-shadow: 0 0 0 1px #818cf8 inset; }

    .srv-head { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .srv-thumb {
      width: 40px; height: 40px; border-radius: 6px;
      background: #1e1e35 center/cover no-repeat; flex-shrink: 0;
      border: 1px solid #272743;
    }
    .srv-thumb.empty { display: flex; align-items: center; justify-content: center; font-size: 16px; color: #444; }
    .srv-info { flex: 1; min-width: 0; }
    .srv-name {
      font-size: 13px; font-weight: 700; color: #e0e0ff;
      line-height: 1.2; margin-bottom: 3px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .srv-sub {
      display: flex; align-items: center; gap: 6px;
      font-size: 10px; color: #777;
    }
    .srv-mode {
      font-size: 9px; color: #818cf8; text-transform: uppercase;
      letter-spacing: .5px; font-weight: 700;
      background: #1a1a3a; padding: 2px 6px; border-radius: 3px;
    }
    .srv-map { color: #999; }

    .srv-stats { display: flex; align-items: baseline; gap: 8px; flex-shrink: 0; }
    .srv-players {
      font-size: 20px; font-weight: 800; color: #fff;
      line-height: 1; letter-spacing: -.3px;
    }
    .srv-players .max { font-size: 12px; font-weight: 600; color: #666; margin-left: 2px; }
    .srv-occ-tag {
      flex: 1; text-align: right; font-size: 10px; font-weight: 700;
      letter-spacing: .3px; text-transform: uppercase;
    }
    .srv-bar { flex-shrink: 0; }

    .srv-bar { height: 5px; background: #1e1e35; border-radius: 3px; overflow: hidden; }
    .srv-bar > div { height: 100%; transition: width .3s; }
    .occ-low  > div { background: linear-gradient(90deg, #4eff8a, #2ec468); }
    .occ-mid  > div { background: linear-gradient(90deg, #ffd24e, #d4a000); }
    .occ-high > div { background: linear-gradient(90deg, #ff6666, #c43030); }
    .occ-off  > div { background: #444; width: 0 !important; }
    .occ-low  ~ * .srv-occ-tag, .srv-card .occ-low + .srv-occ-tag { color: #4eff8a; }

    .srv-tag-low  { color: #4eff8a; }
    .srv-tag-mid  { color: #ffd24e; }
    .srv-tag-high { color: #ff6666; }
    .srv-tag-off  { color: #666; }
    .srv-tag-full { color: #ff6666; }

    .srv-actions { display: flex; gap: 6px; margin-top: auto; flex-shrink: 0; }
    .srv-btn {
      background: #1e1e35; border: 1px solid transparent; color: #aaa;
      font-size: 11px; padding: 7px 10px; border-radius: 7px;
      cursor: pointer; font-weight: 600;
      transition: background .1s, color .1s, border-color .1s;
      display: inline-flex; align-items: center; justify-content: center; gap: 4px;
    }
    .srv-btn:hover { background: #2a2a50; color: #ccd; }
    .srv-btn.primary {
      background: #818cf8; color: #fff; flex: 1;
      box-shadow: 0 2px 8px -2px rgba(129,140,248,.5);
    }
    .srv-btn.primary:hover { background: #9aa0ff; }
    .srv-btn.primary:disabled {
      opacity: .35; cursor: default; background: #1e1e35; color: #555;
      box-shadow: none;
    }
    .srv-btn.queue.on {
      background: #3a1a00; color: #ff944e;
      border-color: #5a2a00;
      animation: queue-pulse 1.6s ease-in-out infinite;
    }
    .srv-btn.queue.on:hover { background: #4a2200; color: #ffaa66; }
    @keyframes queue-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(255,148,78,.55); }
      50%     { box-shadow: 0 0 0 7px rgba(255,148,78,0); }
    }
    .srv-card.armed { border-color: #ff944e; }
  `;

  // ── HTML base (modal + painel, painel oculto até token confirmado) ─────────
  shadow.innerHTML = `
    <style>${CSS}</style>

    <!-- Token modal -->
    <div id="token-modal">
      <div id="tm-hdr">
        <span id="tm-title">⚡ FireGames Enhanced — Token</span>
        <button id="tm-close">×</button>
      </div>
      <div id="tm-body">
        <div id="tm-status"></div>
        <div id="tm-lbl">Bearer Token</div>
        <textarea id="tm-input" spellcheck="false" placeholder="Cole aqui o token JWT (eyJhbGci…)"></textarea>
        <div id="tm-error"></div>
      </div>
      <div id="tm-footer">
        <span id="tm-hint"></span>
        <button id="tm-ok">Continuar →</button>
      </div>
    </div>

    <!-- Painel principal (oculto até token ok) -->
    <div id="panel">
      <div id="hdr">
        <div id="hdr-left">
          <span id="hdr-title">⚡ FireGames Enhanced</span>
          <span id="hdr-sub"></span>
          <button id="btn-token" title="Editar token">TOKEN</button>
        </div>
        <button id="btn-close">×</button>
      </div>

      <div id="body">
        <div id="sidebar">
          <div id="inv-search-wrap">
            <button id="btn-servers"><span class="ws-dot"></span>🎮 Servidores</button>
            <button id="btn-add" style="margin-bottom:8px">+ Adicionar item</button>
            <input id="inv-search" type="text" placeholder="Buscar item…">
          </div>
          <div id="type-chips"></div>
          <div id="inv-list"></div>
        </div>

        <div id="main">
          <div id="no-sel">← Selecione um item para editar</div>
          <div id="editor">
            <div id="tabs">
              <button class="tab on" data-tab="basic">Base</button>
              <button class="tab" data-tab="stattrak">StatTrak™</button>
              <button class="tab" data-tab="stickers">Stickers</button>
              <button class="tab" data-tab="keychain">Keychain</button>
              <button class="tab" data-tab="test">Test</button>
            </div>
            <div id="tab-body">

              <div class="pane on" id="pane-basic">
                <div class="row">
                  <div class="fld">
                    <div class="lbl">Float (0.000001 – 1)</div>
                    <input type="number" id="f-float" min="0.000001" max="1" step="0.000001">
                  </div>
                  <div class="fld">
                    <div class="lbl">Pattern (0 – 999)</div>
                    <input type="number" id="f-pattern" min="0" max="999" step="1">
                  </div>
                </div>
                <div class="fld">
                  <div class="lbl">Nametag</div>
                  <input type="text" id="f-nametag" maxlength="20" placeholder="Nome da arma…">
                </div>
                <div class="row">
                  <div class="fld">
                    <div class="lbl">Time</div>
                    <select id="f-team">
                      <option value="both">Ambos</option>
                      <option value="ct">CT</option>
                      <option value="t">TR</option>
                    </select>
                  </div>
                  <div class="fld" style="display:flex;align-items:center;padding-top:14px">
                    <div class="chk-row" style="margin:0">
                      <input type="checkbox" id="f-equipped">
                      <label for="f-equipped">Equipado</label>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pane" id="pane-stattrak">
                <div class="st-badge">StatTrak™</div>
                <div class="chk-row">
                  <input type="checkbox" id="f-st-on">
                  <label for="f-st-on">Ativar StatTrak™</label>
                </div>
                <div class="fld" id="st-count-wrap" style="display:none">
                  <div class="lbl">Contagem de kills</div>
                  <input type="number" id="f-st-count" min="0" max="999999" step="1" placeholder="0">
                </div>
              </div>

              <div class="pane" id="pane-stickers">
                <div class="row">
                  <div class="fld">
                    <div class="lbl">Slot ativo (0 – 4)</div>
                    <select id="st-slot">
                      <option value="0">Slot 0</option>
                      <option value="1">Slot 1</option>
                      <option value="2">Slot 2</option>
                      <option value="3">Slot 3</option>
                      <option value="4">Slot 4</option>
                    </select>
                  </div>
                  <div class="fld">
                    <div class="lbl">Wear (0 – 1)</div>
                    <input type="number" id="st-wear" min="0" max="1" step="0.001" placeholder="0">
                  </div>
                  <div class="fld">
                    <div class="lbl">Scale</div>
                    <input type="number" id="st-scale" min="0" step="0.01" placeholder="1">
                  </div>
                  <div class="fld">
                    <div class="lbl">Rotation</div>
                    <input type="number" id="st-rotation" step="1" placeholder="0">
                  </div>
                </div>
                <button class="clear-btn" id="btn-st-clear">✕ Remover sticker do slot atual</button>
                <input class="grid-search" type="text" id="stk-search" placeholder="Buscar sticker…">
                <div class="item-grid" id="stk-grid"></div>
              </div>

              <div class="pane" id="pane-keychain">
                <div class="row">
                  <div class="fld">
                    <div class="lbl">ID (def_index)</div>
                    <input type="number" id="kc-def" min="0" step="1" placeholder="0">
                  </div>
                  <div class="fld">
                    <div class="lbl">Pattern (0 – 99999)</div>
                    <input type="number" id="kc-pattern" min="0" max="99999" step="1" placeholder="0">
                  </div>
                  <div class="fld">
                    <div class="lbl">Slot (0 – 4)</div>
                    <input type="number" id="kc-slot" min="0" max="4" step="1" placeholder="0">
                  </div>
                </div>
                <button class="clear-btn" id="btn-kc-clear">✕ Remover keychain atual</button>
                <input class="grid-search" type="text" id="kc-search" placeholder="Buscar keychain…">
                <div class="item-grid" id="kc-grid"></div>
              </div>

              <div class="pane" id="pane-test">
                <div class="fld">
                  <div class="lbl">JSON Payload (edite antes de enviar)</div>
                  <textarea id="test-json" style="min-height:200px;font-family:monospace;font-size:11px" placeholder="{}"></textarea>
                </div>
                <div style="display:flex;gap:8px;margin-bottom:14px">
                  <button id="btn-test-send" style="background:#818cf8;border:none;color:#fff;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:12px;font-weight:600">Enviar PUT</button>
                  <button id="btn-test-log" style="background:#1e1e35;border:none;color:#888;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:12px">Abrir Log</button>
                </div>
                <div id="test-result" class="hint" style="text-align:left;white-space:pre-wrap;max-height:150px;overflow-y:auto;color:#aaa;font-size:11px"></div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Overlay: servidores (live via WebSocket) -->
      <div id="servers-overlay" class="" style="display:none;position:absolute;inset:0;background:rgba(8,8,18,.96);backdrop-filter:blur(4px);flex-direction:column;z-index:20">
        <div id="co-hdr" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #272743;background:#0e0e1c">
          <button id="srv-back" class="srv-btn" style="display:inline-flex;align-items:center;gap:6px"><span style="font-size:16px">←</span> Voltar</button>
          <span id="srv-title" style="flex:1;font-size:13px;font-weight:700;color:#6ec1ff">🎮 Servidores ao vivo <span id="srv-status" style="font-size:11px;color:#555;font-weight:400;margin-left:6px">conectando…</span></span>
          <button id="srv-close" style="background:none;border:none;color:#555;cursor:pointer;font-size:20px;padding:0 4px">×</button>
        </div>
        <div id="srv-modes" style="display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid #272743;flex-wrap:wrap"></div>
        <div id="srv-search-wrap" style="padding:8px 12px;border-bottom:1px solid #272743">
          <input id="srv-search" type="text" placeholder="Buscar servidor / mapa…" style="width:100%;background:#0a0a18;border:1px solid #272743;border-radius:6px;color:#dde0ff;padding:7px 10px;font-size:13px;outline:none">
        </div>
        <div id="srv-grid"></div>
      </div>

      <!-- Overlay: adicionar item (browse master lists) -->
      <div id="create-overlay">
        <div id="co-hdr">
          <button id="co-back" title="Voltar para o inventário"><span class="arr">←</span> Voltar</button>
          <span id="co-title">Adicionar item</span>
          <button id="co-close">×</button>
        </div>
        <div id="co-types"></div>
        <div id="co-search-wrap"><input id="co-search" type="text" placeholder="Buscar…"></div>
        <div id="co-grid"></div>
      </div>

      <div id="footer">
        <div id="item-info">Nenhum item selecionado</div>
        <button id="btn-equip"   class="btn-foot action" disabled title="Equipar/desequipar">⇅ Equipar</button>
        <button id="btn-delete"  class="btn-foot danger" disabled title="Excluir item">🗑 Excluir</button>
        <button id="btn-reload"  class="btn-foot">↺ Recarregar</button>
        <button id="btn-save" disabled>Salvar</button>
      </div>
      <div id="toast"></div>
      <div id="resize-grip"></div>
    </div>
  `;

  // ── Drag helper (reutilizado pelo modal e pelo painel) ────────────────────
  function makeDraggable(handleEl, targetEl) {
    let dragging = false, ox = 0, oy = 0;
    handleEl.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      dragging = true;
      const r = targetEl.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      targetEl.style.transition = 'none';
      // ancora pelo canto esquerdo/topo ao iniciar drag
      targetEl.style.right  = 'auto';
      targetEl.style.bottom = 'auto';
      targetEl.style.left   = r.left + 'px';
      targetEl.style.top    = r.top  + 'px';
      targetEl.style.transform = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(window.innerWidth  - targetEl.offsetWidth,  e.clientX - ox));
      const y = Math.max(0, Math.min(window.innerHeight - targetEl.offsetHeight, e.clientY - oy));
      targetEl.style.left = x + 'px';
      targetEl.style.top  = y + 'px';
    });
    document.addEventListener('mouseup', () => (dragging = false));
  }

  makeDraggable($('tm-hdr'),  $('token-modal'));
  makeDraggable($('hdr'),     $('panel'));

  // ── Token ─────────────────────────────────────────────────────────────────
  let token = null;

  function findToken() {
    const candidates = [];
    try {
      // 1. Check intercepted token from network (most reliable)
      if (interceptedTokenData && interceptedTokenData.token) {
        candidates.push(interceptedTokenData);
      }

      // 2. Check localStorage and sessionStorage
      for (const store of [localStorage, sessionStorage]) {
        try {
          for (let i = 0; i < store.length; i++) {
            const val = store.getItem(store.key(i));
            if (typeof val === 'string' && val.startsWith('eyJ')) {
              const parts = val.split('.');
              if (parts.length === 3) {
                try {
                  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                  candidates.push({ token: val, exp: payload.exp || 0 });
                } catch (_) {}
              }
            }
          }
        } catch (_) {}
      }

      // 3. Check cookies
      try {
        if (document.cookie) {
          const cookies = document.cookie.split(';').map(c => c.trim());
          for (const cookie of cookies) {
            const eqIdx = cookie.indexOf('=');
            if (eqIdx === -1) continue;
            const val = cookie.substring(eqIdx + 1);
            if (isJwt(val)) {
              try {
                const parts = val.split('.');
                const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                candidates.push({ token: val, exp: payload.exp || 0 });
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
    } catch (e) {
      console.warn('[FGE] findToken erro inesperado:', e);
    }

    if (!candidates.length) return null;
    return candidates.sort((a, b) => b.exp - a.exp)[0].token;
  }

  function tokenExpiry(tok) {
    try {
      const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp) return null;
      return new Date(payload.exp * 1000);
    } catch (_) { return null; }
  }

  function isJwt(val) {
    return typeof val === 'string' && val.startsWith('eyJ') && val.split('.').length === 3;
  }

  // Mostra o modal e resolve quando o usuário confirma um token válido
  function showTokenModal(prefill = '', message = '') {
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
          ? `✓ Token encontrado automaticamente — expira ${exp.toLocaleDateString('pt-BR')} ${exp.toLocaleTimeString('pt-BR')}`
          : '✓ Token encontrado automaticamente';
        hint.textContent = 'Edite se necessário ou clique em Continuar';
      } else {
        status.className = 'missing';
        status.textContent = message || '⚠ Token não encontrado automaticamente — cole abaixo';
        hint.textContent = 'Copie o Bearer token do DevTools (Network > qualquer request > Authorization)';
      }

      modal.style.display = 'flex';

      function tryConfirm() {
        const val = input.value.trim().replace(/^Bearer\s+/i, '');
        if (!isJwt(val)) {
          error.textContent = 'Token inválido — deve começar com eyJ e ter 3 partes separadas por ponto.';
          return;
        }
        error.textContent = '';
        modal.style.display = 'none';
        resolve(val);
      }

      okBtn.onclick = tryConfirm;
      input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); tryConfirm(); } };
      $('tm-close').onclick = () => { modal.style.display = 'none'; host.remove(); reject(new Error('Cancelado')); };
    });
  }

  // Abre o modal com o token atual para edição (botão TOKEN no header)
  function openTokenEditor() {
    showTokenModal(token, '')
      .then(newTok => { token = newTok; console.log('[FGE] Token atualizado.'); })
      .catch(() => {});
  }

  // Obtém o token: automático ou via modal
  async function acquireToken() {
    const found = findToken();
    if (found) {
      // Token encontrado — mostra modal pré-preenchido por 0ms se quiser skip direto
      // Para não interromper o fluxo, apenas resolve imediatamente
      token = found;
      return;
    }
    // Não encontrado — exige interação
    token = await showTokenModal('');
  }

  await acquireToken();

  // ── API ───────────────────────────────────────────────────────────────────
  const BASE = 'https://api.firegamesnetwork.com';

  // API toda retorna ACAO:* — credentials precisa ser 'omit' em todos os endpoints.
  // Auth é via Bearer token (header Authorization), não por cookie.
  async function apiGet(path) {
    const r = await fetch(`${BASE}${path}`, {
      headers: { accept: 'application/json', authorization: `Bearer ${token}` },
      credentials: 'omit',
    });
    if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
    return r.json();
  }

  async function apiSend(method, path, body) {
    const opts = {
      method,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
      },
      credentials: 'omit',
    };
    if (body !== undefined) {
      opts.headers['content-type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const r = await fetch(`${BASE}${path}`, opts);
    if (!r.ok) {
      const txt = await r.text().catch(() => r.statusText);
      throw new Error(`${r.status}: ${txt}`);
    }
    return r.json().catch(() => ({}));
  }
  const apiPut    = (path, body) => apiSend('PUT',    path, body);
  const apiPost   = (path, body) => apiSend('POST',   path, body);
  const apiDelete = (path)       => apiSend('DELETE', path);

  function toArray(val) {
    if (Array.isArray(val)) return val;
    if (val && Array.isArray(val.items)) return val.items;
    if (val && Array.isArray(val.data))  return val.data;
    if (val && typeof val === 'object')  return Object.values(val);
    return [];
  }

  // ── Carregamento paralelo ─────────────────────────────────────────────────
  console.log('[FGE] Carregando dados...');
  const [
    invR, skinsR, agentsR, musickitsR, pinsR, graffitiR, stickersR, keychainsR
  ] = await Promise.allSettled([
    apiGet('/inventory'),
    apiGet('/cs-api/en/skins.json'),
    apiGet('/cs-api/en/agents.json'),
    apiGet('/cs-api/en/music_kits.json'),
    apiGet('/cs-api/en/collectibles.json'),
    apiGet('/cs-api/en/graffiti.json'),
    apiGet('/cs-api/en/stickers.json'),
    apiGet('/cs-api/en/keychains.json'),
  ]);

  const fulfilled = r => r.status === 'fulfilled' ? toArray(r.value) : [];
  const inventory = fulfilled(invR);
  const allSkins  = fulfilled(skinsR);
  // Master lists (skins.json contém todas — separamos por category.name)
  const masterLists = {
    skin:     allSkins.filter(s => !['Knives','Gloves'].includes(s?.category?.name)),
    knife:    allSkins.filter(s =>  s?.category?.name === 'Knives'),
    glove:    allSkins.filter(s =>  s?.category?.name === 'Gloves'),
    agent:    fulfilled(agentsR),
    musickit: fulfilled(musickitsR),
    pin:      fulfilled(pinsR),
    graffiti: fulfilled(graffitiR),
  };
  const stickers  = fulfilled(stickersR);
  const keychains = fulfilled(keychainsR);

  if (invR.status !== 'fulfilled') {
    console.error('[FGE] Falha ao carregar inventário:', invR.reason);
    // Se o token for inválido (401), abre modal de edição
    if (invR.reason?.message?.includes('401')) {
      try { token = await showTokenModal(token, '⚠ Token expirado ou inválido (401) — cole um novo'); }
      catch (_) { return; }
    }
  }

  // ── Exibe painel principal ────────────────────────────────────────────────
  $('token-modal').style.display = 'none';
  $('panel').classList.add('visible');

  // ── Toast ─────────────────────────────────────────────────────────────────
  function toast(msg, type = 'info', ms = 2200) {
    const el = $('toast');
    el.textContent = msg;
    el.className = `t-${type}`;
    el.style.display = 'block';
    // Re-trigger CSS animation
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = '';
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.style.display = 'none'), ms);
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let sel        = null;
  let edit       = null;
  let typeFilter = 'all';
  let stkSlot    = 0;

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Look up master entry by paint_index (works for all types)
  function masterEntry(item) {
    const list = masterLists[item.type] || [];
    const pi = String(item.paint_index);
    return list.find(m => String(m.paint_index) === pi)
        || list.find(m => String(m.def_index)   === pi);
  }
  function itemName(item) {
    const m = masterEntry(item);
    if (m?.name) return m.name;
    return item.name || item.weapon_name || item.skin_name
      || (item.type ? `${item.type[0].toUpperCase()}${item.type.slice(1)} #${item.id}` : `Item #${item.id}`);
  }
  function itemImage(item) {
    return masterEntry(item)?.image || '';
  }
  function itemMeta(item) {
    const p = [];
    if (item.float != null && ['skin','knife','glove'].includes(item.type)) p.push(`F:${parseFloat(item.float).toFixed(4)}`);
    if (item.stattrak != null) p.push('ST™');
    if (item.keychain) p.push('🔗');
    if (item.stickers?.length) p.push(`★${item.stickers.length}`);
    return p.join(' · ');
  }
  const TYPE_LABELS = {
    skin:'Skin', knife:'Faca', glove:'Luva', agent:'Agente',
    musickit:'Music Kit', pin:'Pin', graffiti:'Graffiti'
  };

  // ── Type chips (filtro de tipo) ───────────────────────────────────────────
  function renderTypeChips() {
    const counts = {};
    inventory.forEach(i => counts[i.type] = (counts[i.type] || 0) + 1);
    const types = Object.keys(TYPE_LABELS).filter(t => counts[t]);
    const html = ['all', ...types].map(t => {
      const lbl = t === 'all' ? 'Todos' : TYPE_LABELS[t];
      const cnt = t === 'all' ? inventory.length : counts[t] || 0;
      return `<div class="chip ${typeFilter === t ? 'on' : ''}" data-t="${t}">${lbl}<span class="chip-count">${cnt}</span></div>`;
    }).join('');
    $('type-chips').innerHTML = html;
    $('type-chips').querySelectorAll('.chip').forEach(el =>
      el.addEventListener('click', () => {
        typeFilter = el.dataset.t;
        renderTypeChips();
        renderList($('inv-search').value);
      })
    );
  }

  // ── Inventory list ────────────────────────────────────────────────────────
  function renderList(filter = '') {
    const f = filter.toLowerCase();
    const items = inventory
      .filter(i => typeFilter === 'all' || i.type === typeFilter)
      .filter(i => itemName(i).toLowerCase().includes(f));
    $('hdr-sub').textContent = `${inventory.length} itens`;
    $('inv-list').innerHTML = items.map(item => `
      <div class="inv-item ${item.equipped ? 'equipped' : ''} ${sel?.id === item.id ? 'active' : ''}"
           data-id="${item.id}">
        <div class="inv-name"><span class="type-badge tb-${item.type}">${item.type}</span>${itemName(item)}</div>
        <div class="inv-meta">${itemMeta(item)}</div>
      </div>
    `).join('') || '<div style="padding:12px;font-size:11px;color:#444">Nenhum item</div>';

    $('inv-list').querySelectorAll('.inv-item').forEach(el =>
      el.addEventListener('click', () => {
        const found = inventory.find(i => i.id === +el.dataset.id);
        if (found) selectItem(found);
      })
    );
  }

  // ── Select item ───────────────────────────────────────────────────────────
  function selectItem(item) {
    sel  = item;
    edit = JSON.parse(JSON.stringify(item));
    if (!edit.stickers) edit.stickers = [];

    $('no-sel').style.display = 'none';
    $('editor').classList.add('visible');
    $('item-info').innerHTML = `<span class="type-badge tb-${item.type}">${item.type}</span>${itemName(item)}`;
    $('btn-save').disabled    = false;
    $('btn-equip').disabled   = false;
    $('btn-delete').disabled  = false;
    $('btn-equip').textContent = item.equipped ? '⇅ Desequipar' : '⇅ Equipar';

    // Type-aware visibility
    const isSkinLike = ['skin','knife','glove'].includes(item.type);
    $('f-float').closest('.fld').classList.toggle('hide-this', !isSkinLike);
    $('f-pattern').closest('.fld').classList.toggle('hide-this', !isSkinLike);
    $('f-nametag').closest('.fld').classList.toggle('hide-this', !isSkinLike);
    // Team field: agent é T/CT, demais both/CT/T
    const teamSel = $('f-team');
    teamSel.innerHTML = item.type === 'agent'
      ? '<option value="CT">CT</option><option value="T">TR</option>'
      : '<option value="both">Ambos</option><option value="ct">CT</option><option value="t">TR</option>';

    $('f-float').value      = item.float   ?? '';
    $('f-pattern').value    = item.pattern ?? 0;
    $('f-nametag').value    = item.nametag ?? '';
    $('f-team').value       = item.team    ?? (item.type === 'agent' ? 'CT' : 'both');
    $('f-equipped').checked = !!item.equipped;

    const stOn = item.stattrak != null;
    $('f-st-on').checked = stOn;
    $('st-count-wrap').style.display = stOn ? 'block' : 'none';
    $('f-st-count').value = stOn ? item.stattrak : 0;

    // Tabs disponíveis por tipo
    const showStickers = isSkinLike;
    const showKeychain = isSkinLike;
    const showStattrak = isSkinLike;
    shadow.querySelector('[data-tab="stattrak"]').classList.toggle('hide-this', !showStattrak);
    shadow.querySelector('[data-tab="stickers"]').classList.toggle('hide-this', !showStickers);
    shadow.querySelector('[data-tab="keychain"]').classList.toggle('hide-this', !showKeychain);

    stkSlot = 0;
    $('st-slot').value = '0';

    renderList($('inv-search').value);
    renderKcGrid($('kc-search').value);
    renderStickerGrid($('stk-search').value);
    syncStickerInputs();
    updateTestJson();
  }

  // ── Stickers ──────────────────────────────────────────────────────────────
  function currentStickerInSlot() {
    return edit?.stickers?.find(s => Number(s.slot) === Number(stkSlot)) || null;
  }
  function setStickerInSlot(stk) {
    if (!edit) return;
    edit.stickers = (edit.stickers || []).filter(s => Number(s.slot) !== Number(stkSlot));
    if (stk) edit.stickers.push({ ...stk, slot: Number(stkSlot) });
  }
  function syncStickerInputs() {
    const cur = currentStickerInSlot();
    $('st-wear').value     = cur?.wear     ?? 0;
    $('st-scale').value    = cur?.scale    ?? 1;
    $('st-rotation').value = cur?.rotation ?? 0;
  }
  function renderStickerGrid(filter = '') {
    const f = filter.toLowerCase();
    const cur = currentStickerInSlot();
    const items = stickers.filter(s => !f || (s.name || '').toLowerCase().includes(f));
    if (!stickers.length) {
      $('stk-grid').innerHTML = '<div class="hint">Stickers não carregados</div>';
      return;
    }
    $('stk-grid').innerHTML = items.map(s => `
      <div class="gi ${cur && String(cur.paint_index) === String(s.def_index) ? 'on' : ''}"
           data-def="${s.def_index}" title="${s.name || ''}">
        ${s.image ? `<img src="${s.image}" alt="" loading="lazy">` : '<div class="gi-img-ph"></div>'}
        <span class="gi-name">${s.name || `Def ${s.def_index}`}</span>
      </div>
    `).join('');
    $('stk-grid').querySelectorAll('.gi').forEach(el =>
      el.addEventListener('click', () => {
        const defIdx = parseInt(el.dataset.def) || 0;
        setStickerInSlot({
          id: 0,
          paint_index: defIdx,
          slot: stkSlot,
          wear:     parseFloat($('st-wear').value)     || 0,
          scale:    parseFloat($('st-scale').value)    || 1,
          rotation: parseFloat($('st-rotation').value) || 0,
        });
        renderStickerGrid(filter);
        updateTestJson();
      })
    );
  }
  $('st-slot').addEventListener('change', e => {
    stkSlot = parseInt(e.target.value) || 0;
    syncStickerInputs();
    renderStickerGrid($('stk-search').value);
  });
  ['st-wear','st-scale','st-rotation'].forEach(id =>
    $(id).addEventListener('input', () => {
      const cur = currentStickerInSlot();
      if (!cur) return;
      cur.wear     = parseFloat($('st-wear').value)     || 0;
      cur.scale    = parseFloat($('st-scale').value)    || 1;
      cur.rotation = parseFloat($('st-rotation').value) || 0;
      updateTestJson();
    })
  );
  $('btn-st-clear').addEventListener('click', () => {
    if (!edit) return;
    setStickerInSlot(null);
    syncStickerInputs();
    renderStickerGrid($('stk-search').value);
    updateTestJson();
  });
  $('stk-search').addEventListener('input', e => renderStickerGrid(e.target.value));

  // ── Keychain grid ─────────────────────────────────────────────────────────
  function renderKcGrid(filter = '') {
    const f     = filter.toLowerCase();
    const items = keychains.filter(k => !f || (k.name || '').toLowerCase().includes(f));
    const kc    = edit?.keychain;
    const selDef = kc?.id;

    if (!keychains.length) {
      $('kc-grid').innerHTML = '<div class="hint">Keychains não carregados — verifique o console</div>';
      return;
    }
    $('kc-grid').innerHTML = items.map(k => `
      <div class="gi ${String(k.def_index) === String(selDef) ? 'on' : ''}"
           data-def="${k.def_index}" data-id="${k.id}" title="${k.name || ''}">
        ${k.image ? `<img src="${k.image}" alt="" loading="lazy">` : '<div class="gi-img-ph"></div>'}
        <span class="gi-name">${k.name || `Def ${k.def_index}`}</span>
      </div>
    `).join('');

    const kcDef  = $('kc-def');
    const kcPatt = $('kc-pattern');
    const kcSlot = $('kc-slot');
    kcDef.value  = kc?.id      ?? '';
    kcPatt.value = kc?.pattern ?? 0;
    kcSlot.value = kc?.slot    ?? 0;

    $('kc-grid').querySelectorAll('.gi').forEach(el =>
      el.addEventListener('click', () => {
        const defIdx = parseInt(el.dataset.def) || 0;
        kcDef.value = defIdx;
        kcPatt.value = 0;
        kcSlot.value = edit.keychain?.slot ?? 0;
        edit.keychain = {
          id: defIdx,
          pattern: 0,
          slot: parseInt(kcSlot.value) || 0
        };
        renderKcGrid(filter);
        updateTestJson();
      })
    );
  }

  // ── Keychain fields ─────────────────────────────────────────────────
  $('kc-def').addEventListener('input', e => {
    if (!edit) return;
    const def  = parseInt(e.target.value) || 0;
    const pat  = parseInt($('kc-pattern').value) || 0;
    const slot = parseInt($('kc-slot').value) || 0;
    edit.keychain = def ? { id: def, pattern: pat, slot } : null;
    renderKcGrid($('kc-search').value);
    updateTestJson();
  });
  $('kc-pattern').addEventListener('input', e => {
    if (!edit || !edit.keychain) return;
    edit.keychain.pattern = parseInt(e.target.value) || 0;
    updateTestJson();
  });
  $('kc-slot').addEventListener('input', e => {
    if (!edit || !edit.keychain) return;
    edit.keychain.slot = parseInt(e.target.value) || 0;
    updateTestJson();
  });

  // ── Tabs ──────────────────────────────────────────────────────────────────
  $q('.tab').forEach(btn =>
    btn.addEventListener('click', () => {
      $q('.tab').forEach(b => b.classList.remove('on'));
      $q('.pane').forEach(p => p.classList.remove('on'));
      btn.classList.add('on');
      shadow.getElementById(`pane-${btn.dataset.tab}`).classList.add('on');
    })
  );

  // ── Form ──────────────────────────────────────────────────────────────────
  $('f-float').addEventListener('input',    e => { if (edit) edit.float    = parseFloat(e.target.value) || 0; });
  $('f-pattern').addEventListener('input',  e => { if (edit) edit.pattern  = parseInt(e.target.value)   || 0; });
  $('f-nametag').addEventListener('input',  e => { if (edit) edit.nametag  = e.target.value; });
  $('f-team').addEventListener('change',    e => { if (edit) edit.team     = e.target.value; });
  $('f-equipped').addEventListener('change',e => { if (edit) edit.equipped = e.target.checked; });

  $('f-st-on').addEventListener('change', e => {
    if (!edit) return;
    const on = e.target.checked;
    $('st-count-wrap').style.display = on ? 'block' : 'none';
    edit.stattrak = on ? (parseInt($('f-st-count').value) || 0) : null;
  });
  $('f-st-count').addEventListener('input', e => {
    if (edit && edit.stattrak != null) edit.stattrak = parseInt(e.target.value) || 0;
  });
  $('btn-kc-clear').addEventListener('click', () => {
    if (edit) { edit.keychain = null; renderKcGrid($('kc-search').value); }
  });
  $('inv-search').addEventListener('input', e => renderList(e.target.value));
  $('kc-search').addEventListener('input',  e => renderKcGrid(e.target.value));

  // ── Test tab ────────────────────────────────────────────────────────────────
  const testJson = $('test-json');
  const testResult = $('test-result');

  function updateTestJson() {
    if (!edit) return;
    testJson.value = JSON.stringify(edit, null, 2);
  }

  $('btn-test-send').addEventListener('click', async () => {
    if (!sel) { testResult.textContent = '❌ Nenhum item selecionado'; return; }
    let payload;
    try {
      payload = JSON.parse(testJson.value);
    } catch(e) {
      testResult.textContent = '❌ JSON inválido: ' + e.message;
      return;
    }
    $('btn-test-send').disabled = true;
    $('btn-test-send').textContent = 'Enviando…';
    testResult.textContent = '→ PUT /inventory\n' + JSON.stringify(payload, null, 2).substring(0, 500);
    try {
      const res = await apiPut('/inventory', payload);
      testResult.textContent = '✅ Sucesso!\n' + JSON.stringify(res, null, 2);
      const idx = inventory.findIndex(i => i.id === sel.id);
      if (idx !== -1) { Object.assign(inventory[idx], payload); sel = inventory[idx]; }
      renderList($('inv-search').value);
    } catch(err) {
      testResult.textContent = '❌ Erro: ' + err.message + '\n\nPayload enviado:\n' + JSON.stringify(payload, null, 2);
      console.log('[FGE] Test payload:', payload);
    } finally {
      $('btn-test-send').disabled = false;
      $('btn-test-send').textContent = 'Enviar PUT';
    }
  });

  $('btn-test-log').addEventListener('click', () => {
    if (!sel) { testResult.textContent = '❌ Nenhum item selecionado'; return; }
    const kc = edit?.keychain;
    let log = '=== KEYCHAIN DEBUG ===\n';
    log += 'Item ID: ' + sel.id + '\n';
    log += 'Keychain atual: ' + JSON.stringify(kc, null, 2) + '\n';
    log += '\nFormato esperado: { id: <def_index>, pattern: <num>, slot: 0-4 }';
    if (kc) log += '\nKeys: ' + Object.keys(kc).join(', ');
    testResult.textContent = log;
    console.log('[FGE] Debug keychain:', kc);
  });

  testJson.addEventListener('input', () => {
    try { updateTestJson(); } catch(e) {}
  });

  // ── Save ──────────────────────────────────────────────────────────────────
  $('btn-save').addEventListener('click', async () => {
    if (!edit) return;
    const btn = $('btn-save');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      await apiPut('/inventory', edit);
      const idx = inventory.findIndex(i => i.id === sel.id);
      if (idx !== -1) { Object.assign(inventory[idx], edit); sel = inventory[idx]; }
      toast('✓ Salvo com sucesso!', 'success');
      renderList($('inv-search').value);
    } catch (err) {
      toast(`✕ Erro: ${err.message}`, 'error');
      console.error('[FGE] Save error:', err);
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  });

  // ── Reload ────────────────────────────────────────────────────────────────
  $('btn-reload').addEventListener('click', async () => {
    try {
      const fresh = toArray(await apiGet('/inventory'));
      inventory.length = 0;
      fresh.forEach(i => inventory.push(i));
      renderList($('inv-search').value);
      if (sel) { const u = inventory.find(i => i.id === sel.id); if (u) selectItem(u); }
      toast('Inventário recarregado', 'info');
    } catch (err) { toast(`Erro ao recarregar: ${err.message}`, 'error'); }
  });

  // ── Equip / Unequip ───────────────────────────────────────────────────────
  $('btn-equip').addEventListener('click', async () => {
    if (!sel) return;
    const btn = $('btn-equip'); btn.disabled = true;
    try {
      await apiPut(`/inventory/equipped/${sel.id}`);
      sel.equipped = !sel.equipped;
      const idx = inventory.findIndex(i => i.id === sel.id);
      if (idx !== -1) inventory[idx].equipped = sel.equipped;
      $('f-equipped').checked = sel.equipped;
      $('btn-equip').textContent = sel.equipped ? '⇅ Desequipar' : '⇅ Equipar';
      toast(sel.equipped ? '✓ Equipado' : '✓ Desequipado', 'success');
      renderList($('inv-search').value);
    } catch (err) { toast(`✕ ${err.message}`, 'error'); }
    finally { btn.disabled = false; }
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  $('btn-delete').addEventListener('click', async () => {
    if (!sel) return;
    if (!confirm(`Excluir "${itemName(sel)}"?`)) return;
    const btn = $('btn-delete'); btn.disabled = true;
    try {
      await apiDelete(`/inventory/${sel.id}`);
      const idx = inventory.findIndex(i => i.id === sel.id);
      if (idx !== -1) inventory.splice(idx, 1);
      sel = null; edit = null;
      $('editor').classList.remove('visible');
      $('no-sel').style.display = 'flex';
      $('item-info').textContent = 'Nenhum item selecionado';
      $('btn-save').disabled = true;
      $('btn-equip').disabled = true;
      $('btn-delete').disabled = true;
      renderTypeChips();
      renderList($('inv-search').value);
      toast('✓ Item excluído', 'success');
    } catch (err) { toast(`✕ ${err.message}`, 'error'); btn.disabled = false; }
  });

  // ── Create flow (Adicionar item) ──────────────────────────────────────────
  let coType = 'skin';
  function buildNewItemFromMaster(type, m) {
    const isSkinLike = ['skin','knife','glove'].includes(type);
    const base = {
      id: 0, type, equipped: true,
      float: 0.0001, pattern: 0, nametag: '',
      stattrak: null, keychain: null, stickers: [],
    };
    if (isSkinLike) {
      base.team = 'both';
      base.weapon_id   = m.weapon?.weapon_id;
      base.paint_index = Number(m.paint_index);
    } else if (type === 'agent') {
      base.team        = m.team?.id === 'terrorists' ? 'T' : 'CT';
      base.weapon_id   = Number(m.def_index);
      base.paint_index = Number(m.def_index);
    } else if (type === 'graffiti') {
      base.team        = 'both';
      base.weapon_id   = Number(m.def_index);
      base.paint_index = m.color_index !== undefined ? Number(m.color_index) : Number(m.def_index);
    } else { // musickit, pin
      base.team        = 'both';
      base.weapon_id   = Number(m.def_index);
      base.paint_index = Number(m.def_index);
    }
    return base;
  }

  function renderCoTypes() {
    $('co-types').innerHTML = Object.keys(TYPE_LABELS).map(t => {
      const cnt = (masterLists[t] || []).length;
      return `<div class="chip ${coType === t ? 'on' : ''}" data-t="${t}">${TYPE_LABELS[t]}<span class="chip-count">${cnt}</span></div>`;
    }).join('');
    $('co-types').querySelectorAll('.chip').forEach(el =>
      el.addEventListener('click', () => {
        coType = el.dataset.t;
        renderCoTypes();
        renderCoGrid($('co-search').value);
      })
    );
  }

  function renderCoGrid(filter = '') {
    const f = filter.toLowerCase();
    const items = (masterLists[coType] || [])
      .filter(m => !f || (m.name || '').toLowerCase().includes(f))
      .slice(0, 200); // perf cap
    if (!items.length) {
      $('co-grid').innerHTML = '<div class="hint" style="grid-column:1/-1">Nenhum resultado</div>';
      return;
    }
    $('co-grid').innerHTML = items.map((m, i) => `
      <div class="co-card" data-i="${i}" title="${m.name || ''}">
        ${m.image ? `<img src="${m.image}" alt="" loading="lazy">` : '<div class="co-card-ph"></div>'}
        <div class="co-card-name">${m.name || `#${m.def_index || m.paint_index}`}</div>
      </div>
    `).join('');
    $('co-grid').querySelectorAll('.co-card').forEach(el =>
      el.addEventListener('click', async () => {
        const m = items[+el.dataset.i];
        const payload = buildNewItemFromMaster(coType, m);
        el.style.opacity = '0.5'; el.style.pointerEvents = 'none';
        try {
          const res = await apiPost('/inventory', payload);
          const created = Array.isArray(res) ? null : (res?.id ? res : null);
          if (created) inventory.push(created);
          else {
            const fresh = toArray(await apiGet('/inventory'));
            inventory.length = 0;
            fresh.forEach(i => inventory.push(i));
          }
          renderTypeChips();
          renderList($('inv-search').value);
          closeCreateOverlay();
          toast(`✓ "${m.name || 'Item'}" adicionado!`, 'success', 2600);
        } catch (err) {
          toast(`✕ ${err.message}`, 'error', 3500);
          el.style.opacity = '1'; el.style.pointerEvents = '';
        }
      })
    );
  }

  function openCreateOverlay() {
    $('create-overlay').classList.add('visible');
    $('co-search').value = '';
    renderCoTypes();
    renderCoGrid('');
  }
  function closeCreateOverlay() {
    $('create-overlay').classList.remove('visible');
  }
  $('btn-add').addEventListener('click', openCreateOverlay);
  $('co-close').addEventListener('click', closeCreateOverlay);
  $('co-back').addEventListener('click',  closeCreateOverlay);
  $('co-search').addEventListener('input', e => renderCoGrid(e.target.value));

  // ── Servidores (WebSocket) ────────────────────────────────────────────────
  const AC_KEY      = 'fge_server_autoconnect';
  const autoConnects = new Set(JSON.parse(localStorage.getItem(AC_KEY) || '[]'));
  const saveAC      = () => localStorage.setItem(AC_KEY, JSON.stringify([...autoConnects]));

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

  let wsConn      = null;
  let wsGroups    = []; // [{ gameMode:{name}, servers:[...] }, ...]
  let wsPrevSnap  = new Map(); // key → players (para detectar liberação)
  let modeFilter  = 'all';

  function setWsStatus(text, cls) {
    $('srv-status').textContent = text;
    const btn = $('btn-servers');
    btn.classList.remove('live', 'error');
    if (cls) btn.classList.add(cls);
  }

  function notify(title, body) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'https://cdn.firegamesnetwork.com/assets/logo/logo.png' });
      }
    } catch (_) {}
    toast(`${title} — ${body}`, 'success', 4500);
  }

  function flatServers() {
    const out = [];
    for (const grp of wsGroups) {
      for (const s of (grp.servers || [])) out.push({ ...s, _mode: grp.gameMode?.name || '—' });
    }
    return out;
  }
  const srvKey = s => `${s.ip}:${s.port}`;

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
        renderServerGrid($('srv-search').value);
      })
    );
  }

  function occClass(s) {
    if (s.status === 'offline') return 'occ-off';
    const r = s.players / s.maxPlayers;
    if (r > 0.9)  return 'occ-high';
    if (r > 0.5)  return 'occ-mid';
    return 'occ-low';
  }

  function renderServerGrid(filter = '') {
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
      const mapImg  = s.map && s.map.toLowerCase() !== 'offline'
        ? `https://cdn.firegamesnetwork.com/${s.game || 'cs2'}/maps/${s.map}.webp` : '';
      const occCls  = occClass(s);
      let tagText, tagCls;
      if (offline)      { tagText = 'OFFLINE';  tagCls = 'srv-tag-off';  }
      else if (full)    { tagText = 'CHEIO';    tagCls = 'srv-tag-full'; }
      else if (occ > 90){ tagText = `${Math.round(occ)}%`; tagCls = 'srv-tag-high'; }
      else if (occ > 50){ tagText = `${Math.round(occ)}%`; tagCls = 'srv-tag-mid';  }
      else              { tagText = `${Math.round(occ)}%`; tagCls = 'srv-tag-low';  }

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
            <button class="srv-btn queue ${armed ? 'on' : ''}" data-act="auto" title="${armed ? 'Sair da fila' : 'Ficar na fila — conecta automaticamente quando liberar vaga'}">⏳</button>
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
            toast('IP copiado', 'success', 1400);
          } else if (act === 'auto') {
            if (autoConnects.has(key)) {
              autoConnects.delete(key);
              saveAC();
              toast('⏳ Saiu da fila', 'info', 1600);
            } else {
              const players = Number(s.players) || 0;
              const max     = Number(s.maxPlayers) || 0;
              if (s.status !== 'offline' && max > 0 && players < max) {
                fireConnect(s);
                toast(`▶ Conectando em ${s.name || s.ip}…`, 'success', 2200);
              } else {
                autoConnects.add(key);
                saveAC();
                if ('Notification' in window && Notification.permission === 'default') {
                  Notification.requestPermission();
                }
                toast('⏳ Na fila — entra sozinho quando liberar', 'success', 2600);
              }
            }
            renderServerGrid($('srv-search').value);
          }
        })
      );
    });
  }

  function openServersWS() {
    if (wsConn && wsConn.readyState <= 1) return; // já aberto
    setWsStatus('conectando…');
    try {
      wsConn = new WebSocket('wss://api.firegamesnetwork.com/ws/servers');
    } catch (e) {
      setWsStatus('erro', 'error');
      return;
    }
    wsConn.onopen    = () => setWsStatus('ao vivo', 'live');
    wsConn.onerror   = () => setWsStatus('erro', 'error');
    wsConn.onclose   = () => {
      setWsStatus('desconectado');
      // Auto-reconect se overlay continua aberto
      if ($('servers-overlay').style.display === 'flex') {
        setTimeout(openServersWS, 3000);
      }
    };
    wsConn.onmessage = ev => {
      let data; try { data = JSON.parse(ev.data); } catch { return; }
      const groups = Array.isArray(data) ? data : (data.servers || data.data || []);
      // Snapshot para detecção
      const next = new Map();
      for (const grp of groups) {
        for (const s of (grp.servers || [])) next.set(srvKey(s), s);
      }
      checkAutoConnects(next);
      wsPrevSnap = next;
      wsGroups = groups;
      if ($('servers-overlay').style.display === 'flex') {
        renderModeChips();
        renderServerGrid($('srv-search').value);
      }
    };
  }
  function closeServersWS() {
    if (wsConn) { try { wsConn.close(); } catch (_) {} wsConn = null; }
    setWsStatus('desconectado');
  }

  function openServersOverlay() {
    $('servers-overlay').style.display = 'flex';
    $('srv-search').value = '';
    if (!wsGroups.length) $('srv-grid').innerHTML = '<div class="hint" style="grid-column:1/-1">Aguardando dados do servidor…</div>';
    else { renderModeChips(); renderServerGrid(''); }
    openServersWS();
  }
  function closeServersOverlay() {
    $('servers-overlay').style.display = 'none';
    // Mantém WS aberto se houver auto-connects pendentes
    if (!autoConnects.size) closeServersWS();
  }

  $('btn-servers').addEventListener('click', openServersOverlay);
  $('srv-back').addEventListener('click', closeServersOverlay);
  $('srv-close').addEventListener('click', closeServersOverlay);
  $('srv-search').addEventListener('input', e => renderServerGrid(e.target.value));

  // Se há auto-connects salvos, abre WS em background ao iniciar
  if (autoConnects.size) openServersWS();

  // ── Botão TOKEN (editar token sem fechar o painel) ────────────────────────
  $('btn-token').addEventListener('click', openTokenEditor);

  // ── Close ─────────────────────────────────────────────────────────────────
  $('btn-close').addEventListener('click', () => host.remove());

  // ── Debug helpers ─────────────────────────────────────────────────────────
  window.fge = {
    keychains() {
      const withKc = inventory.filter(i => i.keychain != null);
      if (!withKc.length) console.log('[FGE] Nenhum item com keychain.');
      else console.log('[FGE] Keychains:', withKc.map(i => ({ name: itemName(i), keychain: i.keychain })));
      return withKc;
    },
    // Aplica keychain { id (def_index), pattern, slot } no item
    async applyKeychain(itemId, defIndex, pattern = 0, slot = 0) {
      const item = inventory.find(i => i.id === itemId);
      if (!item) { console.error('[FGE] Item não encontrado:', itemId); return; }
      const body = { ...item, keychain: { id: Number(defIndex), pattern: Number(pattern) || 0, slot: Number(slot) || 0 } };
      console.log('[FGE] PUT /inventory →', body);
      try { const r = await apiPut('/inventory', body); console.log('[FGE] ✓', r); return r; }
      catch (err) { console.error('[FGE] ✕', err.message); }
    },
    async removeKeychain(itemId) {
      const item = inventory.find(i => i.id === itemId);
      if (!item) { console.error('[FGE] Item não encontrado:', itemId); return; }
      try { return await apiPut('/inventory', { ...item, keychain: null }); }
      catch (err) { console.error('[FGE] ✕', err.message); }
    },
    // Endpoints adicionais descobertos no chunk 608
    async toggleEquip(itemId) {
      try { return await apiPut(`/inventory/equipped/${itemId}`); }
      catch (err) { console.error('[FGE] ✕', err.message); }
    },
    async setTeam(itemId, team) {
      try { return await apiPut(`/inventory/team/${itemId}/${team}`); }
      catch (err) { console.error('[FGE] ✕', err.message); }
    },
    async deleteItem(itemId) {
      try { return await apiDelete(`/inventory/${itemId}`); }
      catch (err) { console.error('[FGE] ✕', err.message); }
    },
    async createItem(payload) {
      try { return await apiPost('/inventory', payload); }
      catch (err) { console.error('[FGE] ✕', err.message); }
    },
    inspect(itemId) {
      const item = itemId ? inventory.find(i => i.id === itemId) : sel;
      if (!item) { console.log('[FGE] Nenhum item.'); return; }
      console.log('[FGE] Item:', JSON.parse(JSON.stringify(item)));
      return item;
    },
    get inv() { return inventory; },
    get kcs() { return keychains; },
    get servers() { return flatServers(); },
    queue(ipPort)        { autoConnects.add(ipPort); saveAC(); openServersWS(); console.log('[FGE] Na fila:', ipPort); },
    unqueue(ipPort)      { autoConnects.delete(ipPort); saveAC(); console.log('[FGE] Saiu da fila:', ipPort); },
    listQueue()          { console.log('[FGE] Fila:', [...autoConnects]); return [...autoConnects]; },
  };

  // ── Render inicial ────────────────────────────────────────────────────────
  renderTypeChips();
  renderList();
  renderKcGrid();

  console.log(
    `[FGE] ✓ Iniciado — ${inventory.length} itens | ` +
    `master: skins ${masterLists.skin.length}, knives ${masterLists.knife.length}, gloves ${masterLists.glove.length}, ` +
    `agents ${masterLists.agent.length}, musickits ${masterLists.musickit.length}, pins ${masterLists.pin.length}, ` +
    `graffiti ${masterLists.graffiti.length} | stickers ${stickers.length} | keychains ${keychains.length}`
  );
  console.log('[FGE] Debug: fge.inspect() | fge.applyKeychain(id, defIdx, pattern, slot) | fge.createItem(payload)');
})();
