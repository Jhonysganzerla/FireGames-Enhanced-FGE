// Lista de itens do inventário com filtro por tipo e busca textual.
// Lê store.inventory + store.masterLists, escuta selected/typeFilter/inventory.

import { $ } from '../core/dom.js';
import { TYPE_LABELS } from '../data/schemas.js';
import { masterEntry } from '../data/master-lists.js';

export function itemName(item, masterLists) {
  const m = masterEntry(masterLists, item);
  if (m?.name) return m.name;
  return item.name || item.weapon_name || item.skin_name
    || (item.type ? `${item.type[0].toUpperCase()}${item.type.slice(1)} #${item.id}` : `Item #${item.id}`);
}

function itemMeta(item) {
  const p = [];
  if (item.float != null && ['skin','knife','glove'].includes(item.type)) p.push(`F:${parseFloat(item.float).toFixed(4)}`);
  if (item.stattrak != null) p.push('ST™');
  if (item.keychain) p.push('🔗');
  if (item.stickers?.length) p.push(`★${item.stickers.length}`);
  return p.join(' · ');
}

export function init({ store, bus }) {
  function renderTypeChips() {
    const { inventory, typeFilter } = store.get();
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
      el.addEventListener('click', () => store.set({ typeFilter: el.dataset.t }))
    );
  }

  function renderList() {
    const { inventory, typeFilter, masterLists, selected, search } = store.get();
    const f = (search || '').toLowerCase();
    const items = inventory
      .filter(i => typeFilter === 'all' || i.type === typeFilter)
      .filter(i => itemName(i, masterLists).toLowerCase().includes(f));

    $('hdr-sub').textContent = `${inventory.length} itens`;
    $('inv-list').innerHTML = items.map(item => `
      <div class="inv-item ${item.equipped ? 'equipped' : ''} ${selected?.id === item.id ? 'active' : ''}"
           data-id="${item.id}">
        <div class="inv-name"><span class="type-badge tb-${item.type}">${item.type}</span>${itemName(item, masterLists)}</div>
        <div class="inv-meta">${itemMeta(item)}</div>
      </div>
    `).join('') || '<div style="padding:12px;font-size:11px;color:#444">Nenhum item</div>';

    $('inv-list').querySelectorAll('.inv-item').forEach(el =>
      el.addEventListener('click', () => {
        const found = inventory.find(i => i.id === +el.dataset.id);
        if (found) bus.emit('item:select', found);
      })
    );
  }

  $('inv-search').addEventListener('input', e => store.set({ search: e.target.value }));

  // Re-render quando algo relevante mudar
  store.subscribe(() => { renderTypeChips(); renderList(); });
  bus.on('inventory:loaded', () => { renderTypeChips(); renderList(); });

  // Render inicial
  renderTypeChips();
  renderList();

  return { renderList, renderTypeChips };
}
