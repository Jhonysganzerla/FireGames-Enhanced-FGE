// Overlay "Adicionar item" — browse master lists e cria item via POST /inventory.

import { $ } from '../core/dom.js';
import { ITEM_SCHEMAS, TYPE_LABELS } from '../data/schemas.js';
import { inventoryAPI } from '../core/api.js';

export function init({ store, bus }) {
  let coType = 'skin';

  function open() {
    $('create-overlay').classList.add('visible');
    $('co-search').value = '';
    renderTypes();
    renderGrid('');
  }
  function close() {
    $('create-overlay').classList.remove('visible');
  }

  function renderTypes() {
    const { masterLists } = store.get();
    $('co-types').innerHTML = Object.keys(TYPE_LABELS).map(t => {
      const cnt = (masterLists[t] || []).length;
      return `<div class="chip ${coType === t ? 'on' : ''}" data-t="${t}">${TYPE_LABELS[t]}<span class="chip-count">${cnt}</span></div>`;
    }).join('');
    $('co-types').querySelectorAll('.chip').forEach(el =>
      el.addEventListener('click', () => {
        coType = el.dataset.t;
        renderTypes();
        renderGrid($('co-search').value);
      })
    );
  }

  function renderGrid(filter = '') {
    const { masterLists } = store.get();
    const f = filter.toLowerCase();
    const items = (masterLists[coType] || [])
      .filter(m => !f || (m.name || '').toLowerCase().includes(f))
      .slice(0, 200);
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
        const schema = ITEM_SCHEMAS[coType];
        if (!schema) return;
        const payload = schema.build(m);
        el.style.opacity = '0.5'; el.style.pointerEvents = 'none';
        try {
          await inventoryAPI.create(payload);
          close();
          bus.emit('toast', { msg: `✓ "${m.name || 'Item'}" adicionado!`, type: 'success', ms: 2600 });
          bus.emit('inventory:reload');
        } catch (err) {
          bus.emit('toast', { msg: `✕ ${err.message}`, type: 'error', ms: 3500 });
          el.style.opacity = '1'; el.style.pointerEvents = '';
        }
      })
    );
  }

  $('btn-add')   .addEventListener('click', open);
  $('co-close')  .addEventListener('click', close);
  $('co-back')   .addEventListener('click', close);
  $('co-search').addEventListener('input', e => renderGrid(e.target.value));

  return { open, close };
}
