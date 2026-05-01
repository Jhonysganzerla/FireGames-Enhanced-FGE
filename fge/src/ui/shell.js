// HTML shell completo do painel + modal de token.
// Cada feature popula seus subcontainers (#inv-list, #srv-grid, etc).

import baseCss      from '../styles/base.css';
import panelCss     from '../styles/panel.css';
import inventoryCss from '../styles/inventory.css';
import overlaysCss  from '../styles/overlays.css';
import serversCss   from '../styles/servers.css';

const CSS = [baseCss, panelCss, inventoryCss, overlaysCss, serversCss].join('\n');

export const SHELL_HTML = `
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

  <!-- Painel principal -->
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
                  <select id="f-team"></select>
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
              </div>
              <div id="test-result" class="hint" style="text-align:left;white-space:pre-wrap;max-height:150px;overflow-y:auto;color:#aaa;font-size:11px"></div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Overlay: servidores -->
    <div id="servers-overlay" class="fge-overlay">
      <div class="ov-hdr">
        <button id="srv-back" class="ov-back"><span class="arr">←</span> Voltar</button>
        <span class="ov-title">🎮 Servidores ao vivo <span id="srv-status" style="font-size:11px;color:#555;font-weight:400;margin-left:6px">conectando…</span></span>
        <button id="srv-close" class="ov-close">×</button>
      </div>
      <div id="srv-modes" class="ov-types"></div>
      <div class="ov-search-wrap"><input id="srv-search" class="ov-search" type="text" placeholder="Buscar servidor / mapa…"></div>
      <div id="srv-grid"></div>
    </div>

    <!-- Overlay: adicionar item -->
    <div id="create-overlay" class="fge-overlay">
      <div class="ov-hdr">
        <button id="co-back" class="ov-back"><span class="arr">←</span> Voltar</button>
        <span class="ov-title">Adicionar item</span>
        <button id="co-close" class="ov-close">×</button>
      </div>
      <div id="co-types" class="ov-types"></div>
      <div class="ov-search-wrap"><input id="co-search" class="ov-search" type="text" placeholder="Buscar…"></div>
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
