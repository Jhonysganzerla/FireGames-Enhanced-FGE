// Stickers tab: 4 slots, com wear/scale/rotation por slot.
// Formato no item: stickers: [{ id, paint_index, slot, wear, scale, rotation }, ...]

import { $ } from '../core/dom.js';

export function init({ store, bus }) {
  let slot = 0;

  const currentInSlot = () => {
    const { edit } = store.get();
    return edit?.stickers?.find(s => Number(s.slot) === Number(slot)) || null;
  };

  function setSticker(stk) {
    const { edit } = store.get();
    if (!edit) return;
    const stickers = (edit.stickers || []).filter(s => Number(s.slot) !== Number(slot));
    if (stk) stickers.push({ ...stk, slot: Number(slot) });
    store.set({ edit: { ...edit, stickers } });
  }

  function syncInputs() {
    const cur = currentInSlot();
    $('st-wear').value     = cur?.wear     ?? 0;
    $('st-scale').value    = cur?.scale    ?? 1;
    $('st-rotation').value = cur?.rotation ?? 0;
  }

  function renderGrid(filter = '') {
    const { stickers } = store.get();
    const cur = currentInSlot();
    const f = filter.toLowerCase();
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
        setSticker({
          id: 0,
          paint_index: defIdx,
          slot,
          wear:     parseFloat($('st-wear').value)     || 0,
          scale:    parseFloat($('st-scale').value)    || 1,
          rotation: parseFloat($('st-rotation').value) || 0,
        });
      })
    );
  }

  $('st-slot').addEventListener('change', e => {
    slot = parseInt(e.target.value) || 0;
    syncInputs();
    renderGrid($('stk-search').value);
  });
  ['st-wear','st-scale','st-rotation'].forEach(id =>
    $(id).addEventListener('input', () => {
      const cur = currentInSlot();
      if (!cur) return;
      setSticker({
        ...cur,
        wear:     parseFloat($('st-wear').value)     || 0,
        scale:    parseFloat($('st-scale').value)    || 1,
        rotation: parseFloat($('st-rotation').value) || 0,
      });
    })
  );
  $('btn-st-clear').addEventListener('click', () => {
    setSticker(null);
    syncInputs();
    renderGrid($('stk-search').value);
  });
  $('stk-search').addEventListener('input', e => renderGrid(e.target.value));

  // Reset slot ao trocar de item selecionado
  bus.on('item:selected', () => {
    slot = 0;
    $('st-slot').value = '0';
    syncInputs();
    renderGrid($('stk-search').value);
  });

  return { renderGrid };
}
