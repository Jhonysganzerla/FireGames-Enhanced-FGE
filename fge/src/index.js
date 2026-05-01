// Entry point. Orquestra:
//   1. instala interceptor de fetch/XHR (descobre Bearer token)
//   2. monta host + shadow DOM com o shell HTML
//   3. resolve token (auto ou via modal)
//   4. carrega inventário + master lists em paralelo
//   5. inicializa cada feature passando { store, bus }

import { mountHost, shadow, $ }   from './core/dom.js';
import { createStore }            from './core/store.js';
import { createBus }              from './core/bus.js';
import { setToken, inventoryAPI, toArray } from './core/api.js';
import * as Token                 from './core/token.js';
import { loadAllMaster }          from './data/master-lists.js';
import { SHELL_HTML }             from './ui/shell.js';
import { makeDraggable }          from './ui/drag.js';
import { bindToBus as bindToast } from './ui/toast.js';

import * as inventoryFeat from './features/inventory.js';
import * as editorFeat    from './features/editor.js';
import * as keychainFeat  from './features/keychain.js';
import * as stickersFeat  from './features/stickers.js';
import * as createFeat    from './features/create.js';
import * as serversFeat   from './features/servers.js';

// Patch fetch/XHR ANTES de qualquer coisa, pra captar tokens em vôo.
Token.install();

(async function boot() {
  // 1. Mount (toggle: re-execução remove)
  let host;
  try { host = mountHost(); }
  catch (e) { if (e.message === 'TOGGLE') return; throw e; }

  shadow().innerHTML = SHELL_HTML;

  // Drag dos handles
  makeDraggable($('tm-hdr'), $('token-modal'));
  makeDraggable($('hdr'),    $('panel'));

  // 2. Token (auto ou modal)
  let token = Token.findToken();
  if (!token) {
    try { token = await Token.showModal($, ''); }
    catch (_) { host.host.remove(); return; }
  }
  setToken(token);

  // 3. Carrega tudo em paralelo
  console.log('[FGE] Carregando dados…');
  const [invR, masterR] = await Promise.allSettled([
    inventoryAPI.list(),
    loadAllMaster(),
  ]);

  if (invR.status !== 'fulfilled') {
    console.error('[FGE] Falha no inventário:', invR.reason);
    if (invR.reason?.status === 401) {
      try {
        token = await Token.showModal($, token, '⚠ Token expirado — cole um novo');
        setToken(token);
      } catch (_) { host.host.remove(); return; }
    }
  }

  const inventory   = invR.status    === 'fulfilled' ? toArray(invR.value)         : [];
  const master      = masterR.status === 'fulfilled' ? masterR.value               : { masterLists: {}, stickers: [], keychains: [] };

  // 4. Store + bus globais
  const store = createStore({
    inventory,
    masterLists: master.masterLists,
    stickers:    master.stickers,
    keychains:   master.keychains,
    selected:    null,
    edit:        null,
    typeFilter:  'all',
    search:      '',
  });
  const bus = createBus();

  // 5. Bindings UI globais
  $('token-modal').style.display = 'none';
  $('panel').classList.add('visible');
  bindToast(bus);

  $('btn-token').addEventListener('click', async () => {
    try {
      const t = await Token.showModal($, token, '');
      token = t; setToken(t);
      bus.emit('toast', { msg: '✓ Token atualizado', type: 'success' });
    } catch (_) {}
  });
  $('btn-close').addEventListener('click', () => host.host.remove());

  $('btn-reload').addEventListener('click', () => bus.emit('inventory:reload'));

  // Reload sempre re-busca da API
  bus.on('inventory:reload', async () => {
    try {
      const fresh = toArray(await inventoryAPI.list());
      store.set({ inventory: fresh });
      // Se item atual sumiu (ex: deletado), limpa seleção
      const { selected } = store.get();
      if (selected && !fresh.find(i => i.id === selected.id)) {
        store.set({ selected: null, edit: null });
      } else if (selected) {
        // re-aplica versão atualizada do item
        const updated = fresh.find(i => i.id === selected.id);
        if (updated) store.set({ selected: updated });
      }
      bus.emit('inventory:loaded', fresh);
    } catch (err) {
      bus.emit('toast', { msg: `Erro ao recarregar: ${err.message}`, type: 'error' });
    }
  });

  // 6. Inicializa features
  const deps = { store, bus };
  inventoryFeat.init(deps);
  editorFeat.init(deps);
  keychainFeat.init(deps);
  stickersFeat.init(deps);
  createFeat.init(deps);
  const servers = serversFeat.init(deps);

  // 7. API pública no console
  window.fge = {
    get state()   { return store.get(); },
    get inv()     { return store.get().inventory; },
    get kcs()     { return store.get().keychains; },
    get servers() { return servers.servers(); },
    queue:    servers.queue,
    unqueue:  servers.unqueue,
    listQueue: () => servers.list(),
    inspect: (id) => {
      const item = id ? store.get().inventory.find(i => i.id === id) : store.get().selected;
      console.log('[FGE] Item:', item);
      return item;
    },
    reload:  () => bus.emit('inventory:reload'),
    bus, store,
  };

  console.log(
    `[FGE] ✓ ${inventory.length} itens · ` +
    `master: skins ${master.masterLists.skin?.length || 0}, knives ${master.masterLists.knife?.length || 0}, ` +
    `gloves ${master.masterLists.glove?.length || 0}, agents ${master.masterLists.agent?.length || 0}, ` +
    `musickits ${master.masterLists.musickit?.length || 0}, pins ${master.masterLists.pin?.length || 0}, ` +
    `graffiti ${master.masterLists.graffiti?.length || 0} · ` +
    `stickers ${master.stickers.length} · keychains ${master.keychains.length}`
  );
  console.log('[FGE] Console: fge.inspect() · fge.queue("ip:port") · fge.reload()');
})();
