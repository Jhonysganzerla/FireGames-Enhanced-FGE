// Editor central com 5 abas (base, stattrak, stickers, keychain, test).
// Os modules de stickers/keychain populam suas próprias panes.

import { $, $q } from '../core/dom.js';
import { ITEM_SCHEMAS, isSkinLike } from '../data/schemas.js';
import { inventoryAPI } from '../core/api.js';
import { itemName } from './inventory.js';

export function init({ store, bus }) {
  // Tabs
  $q('.tab').forEach(btn =>
    btn.addEventListener('click', () => {
      $q('.tab').forEach(b => b.classList.remove('on'));
      $q('.pane').forEach(p => p.classList.remove('on'));
      btn.classList.add('on');
      $(`pane-${btn.dataset.tab}`).classList.add('on');
    })
  );

  // ── Form fields ─────────────────────────────────────────────────────
  const fld = (id) => $(id);

  fld('f-float')   .addEventListener('input',  e => patch({ float:    parseFloat(e.target.value) || 0 }));
  fld('f-pattern') .addEventListener('input',  e => patch({ pattern:  parseInt(e.target.value)   || 0 }));
  fld('f-nametag') .addEventListener('input',  e => patch({ nametag:  e.target.value }));
  fld('f-team')    .addEventListener('change', e => patch({ team:     e.target.value }));
  fld('f-equipped').addEventListener('change', e => patch({ equipped: e.target.checked }));

  fld('f-st-on').addEventListener('change', e => {
    const on = e.target.checked;
    $('st-count-wrap').style.display = on ? 'block' : 'none';
    patch({ stattrak: on ? (parseInt($('f-st-count').value) || 0) : null });
  });
  fld('f-st-count').addEventListener('input', e => {
    const { edit } = store.get();
    if (edit?.stattrak != null) patch({ stattrak: parseInt(e.target.value) || 0 });
  });

  function patch(p) {
    const { edit } = store.get();
    if (!edit) return;
    store.set({ edit: { ...edit, ...p } });
  }

  // ── Test JSON ───────────────────────────────────────────────────────
  const testJson = $('test-json');
  function updateTestJson() {
    const { edit } = store.get();
    if (!edit) return;
    testJson.value = JSON.stringify(edit, null, 2);
  }
  $('btn-test-send').addEventListener('click', async () => {
    const result = $('test-result');
    let payload;
    try { payload = JSON.parse(testJson.value); }
    catch (e) { result.textContent = '❌ JSON inválido: ' + e.message; return; }
    $('btn-test-send').disabled = true;
    try {
      const res = await inventoryAPI.update(payload);
      result.textContent = '✅ Sucesso!\n' + JSON.stringify(res, null, 2);
      bus.emit('inventory:reload');
    } catch (err) {
      result.textContent = '❌ Erro: ' + err.message + '\n\nPayload:\n' + JSON.stringify(payload, null, 2);
    } finally { $('btn-test-send').disabled = false; }
  });

  // ── Apply selected item to form ─────────────────────────────────────
  function applyItemToForm(item) {
    if (!item) {
      $('editor').classList.remove('visible');
      $('no-sel').style.display = 'flex';
      $('item-info').textContent = 'Nenhum item selecionado';
      $('btn-save').disabled = true;
      $('btn-equip').disabled = true;
      $('btn-delete').disabled = true;
      return;
    }
    $('no-sel').style.display = 'none';
    $('editor').classList.add('visible');
    const { masterLists } = store.get();
    $('item-info').innerHTML = `<span class="type-badge tb-${item.type}">${item.type}</span>${itemName(item, masterLists)}`;
    $('btn-save').disabled    = false;
    $('btn-equip').disabled   = false;
    $('btn-delete').disabled  = false;
    $('btn-equip').textContent = item.equipped ? '⇅ Desequipar' : '⇅ Equipar';

    const skinLike = isSkinLike(item.type);
    $('f-float').closest('.fld').classList.toggle('hide-this', !skinLike);
    $('f-pattern').closest('.fld').classList.toggle('hide-this', !skinLike);
    $('f-nametag').closest('.fld').classList.toggle('hide-this', !skinLike);

    // Team options por schema
    const schema = ITEM_SCHEMAS[item.type];
    const teams = schema?.teams || ['both'];
    const labels = { both: 'Ambos', ct: 'CT', t: 'TR', CT: 'CT', T: 'TR' };
    $('f-team').innerHTML = teams.map(v => `<option value="${v}">${labels[v] || v}</option>`).join('');

    $('f-float').value      = item.float   ?? '';
    $('f-pattern').value    = item.pattern ?? 0;
    $('f-nametag').value    = item.nametag ?? '';
    $('f-team').value       = item.team    ?? teams[0];
    $('f-equipped').checked = !!item.equipped;

    const stOn = item.stattrak != null;
    $('f-st-on').checked = stOn;
    $('st-count-wrap').style.display = stOn ? 'block' : 'none';
    $('f-st-count').value = stOn ? item.stattrak : 0;

    // Tabs visíveis por tipo
    $q('[data-tab="stattrak"]').forEach(b => b.classList.toggle('hide-this', !skinLike));
    $q('[data-tab="stickers"]').forEach(b => b.classList.toggle('hide-this', !skinLike));
    $q('[data-tab="keychain"]').forEach(b => b.classList.toggle('hide-this', !skinLike));
  }

  // Escuta seleção (vinda de inventory) e clona pra edit draft
  bus.on('item:select', (item) => {
    const edit = JSON.parse(JSON.stringify(item));
    if (!edit.stickers) edit.stickers = [];
    store.set({ selected: item, edit });
    bus.emit('item:selected', item);
  });

  // Re-render quando selected/edit mudam
  let lastSelectedId = null;
  store.subscribe((s) => {
    if (s.selected?.id !== lastSelectedId) {
      lastSelectedId = s.selected?.id ?? null;
      applyItemToForm(s.selected);
    }
    if (s.edit && testJson) updateTestJson();
  });

  // ── Save ────────────────────────────────────────────────────────────
  $('btn-save').addEventListener('click', async () => {
    const { edit } = store.get();
    if (!edit) return;
    const btn = $('btn-save');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      await inventoryAPI.update(edit);
      bus.emit('toast', { msg: '✓ Salvo com sucesso!', type: 'success' });
      bus.emit('item:saved', edit);
      bus.emit('inventory:reload');
    } catch (err) {
      bus.emit('toast', { msg: `✕ Erro: ${err.message}`, type: 'error' });
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar';
    }
  });

  // ── Equip / Delete ──────────────────────────────────────────────────
  $('btn-equip').addEventListener('click', async () => {
    const { selected } = store.get();
    if (!selected) return;
    const btn = $('btn-equip'); btn.disabled = true;
    try {
      await inventoryAPI.toggleEquip(selected.id);
      bus.emit('toast', { msg: selected.equipped ? '✓ Desequipado' : '✓ Equipado', type: 'success' });
      bus.emit('inventory:reload');
    } catch (err) {
      bus.emit('toast', { msg: `✕ ${err.message}`, type: 'error' });
    } finally { btn.disabled = false; }
  });

  $('btn-delete').addEventListener('click', async () => {
    const { selected, masterLists } = store.get();
    if (!selected) return;
    if (!confirm(`Excluir "${itemName(selected, masterLists)}"?`)) return;
    const btn = $('btn-delete'); btn.disabled = true;
    try {
      await inventoryAPI.remove(selected.id);
      store.set({ selected: null, edit: null });
      bus.emit('toast', { msg: '✓ Item excluído', type: 'success' });
      bus.emit('inventory:reload');
    } catch (err) {
      bus.emit('toast', { msg: `✕ ${err.message}`, type: 'error' });
      btn.disabled = false;
    }
  });

  return { applyItemToForm, updateTestJson };
}
