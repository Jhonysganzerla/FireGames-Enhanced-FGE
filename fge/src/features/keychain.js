// Keychain tab: grid + 3 inputs (id/pattern/slot).
// Formato no item: keychain: { id: <def_index>, pattern: number, slot: 0-4 } | null

import { $ } from '../core/dom.js';

export function init({ store, bus }) {
  function patchKc(p) {
    const { edit } = store.get();
    if (!edit) return;
    const kc = edit.keychain ? { ...edit.keychain, ...p } : p;
    store.set({ edit: { ...edit, keychain: kc.id ? kc : null } });
  }

  function renderKcGrid(filter = '') {
    const { keychains, edit } = store.get();
    const f = filter.toLowerCase();
    const items = keychains.filter(k => !f || (k.name || '').toLowerCase().includes(f));
    const kc = edit?.keychain;
    const selDef = kc?.id;

    if (!keychains.length) {
      $('kc-grid').innerHTML = '<div class="hint">Keychains não carregados</div>';
      return;
    }
    $('kc-grid').innerHTML = items.map(k => `
      <div class="gi ${String(k.def_index) === String(selDef) ? 'on' : ''}"
           data-def="${k.def_index}" title="${k.name || ''}">
        ${k.image ? `<img src="${k.image}" alt="" loading="lazy">` : '<div class="gi-img-ph"></div>'}
        <span class="gi-name">${k.name || `Def ${k.def_index}`}</span>
      </div>
    `).join('');

    $('kc-def').value     = kc?.id      ?? '';
    $('kc-pattern').value = kc?.pattern ?? 0;
    $('kc-slot').value    = kc?.slot    ?? 0;

    $('kc-grid').querySelectorAll('.gi').forEach(el =>
      el.addEventListener('click', () => {
        const defIdx = parseInt(el.dataset.def) || 0;
        patchKc({
          id: defIdx,
          pattern: parseInt($('kc-pattern').value) || 0,
          slot: parseInt($('kc-slot').value) || 0,
        });
      })
    );
  }

  $('kc-def').addEventListener('input', e => patchKc({
    id:      parseInt(e.target.value) || 0,
    pattern: parseInt($('kc-pattern').value) || 0,
    slot:    parseInt($('kc-slot').value) || 0,
  }));
  $('kc-pattern').addEventListener('input', e => patchKc({ pattern: parseInt(e.target.value) || 0 }));
  $('kc-slot').addEventListener('input',    e => patchKc({ slot:    parseInt(e.target.value) || 0 }));

  $('btn-kc-clear').addEventListener('click', () => {
    const { edit } = store.get();
    if (!edit) return;
    store.set({ edit: { ...edit, keychain: null } });
  });

  $('kc-search').addEventListener('input', e => renderKcGrid(e.target.value));

  // Re-render quando keychains carregar OU edit mudar
  let lastEditKey = null;
  store.subscribe((s) => {
    const editKey = JSON.stringify(s.edit?.keychain) + '|' + (s.selected?.id || '');
    if (editKey !== lastEditKey) {
      lastEditKey = editKey;
      renderKcGrid($('kc-search').value);
    }
  });

  return { renderKcGrid };
}
