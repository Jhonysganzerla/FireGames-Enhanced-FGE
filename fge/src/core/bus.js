// Pub/sub minimalista. Permite features se comunicarem sem se conhecerem.
//
// Eventos canônicos do app:
//   'token:updated'         (token: string)
//   'inventory:loaded'      (inventory: Item[])
//   'inventory:reload'      (sem payload — pede reload)
//   'item:saved'            (item)
//   'item:created'          (item)
//   'item:deleted'          (id)
//   'item:equipped'         ({ id, equipped })
//   'item:selected'         (item | null)
//   'toast'                 ({ msg, type, ms })

export function createBus() {
  const handlers = new Map(); // event → Set<fn>

  return {
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(fn);
      return () => handlers.get(event)?.delete(fn);
    },
    emit(event, payload) {
      const set = handlers.get(event);
      if (!set) return;
      for (const fn of set) {
        try { fn(payload); } catch (e) { console.error(`[bus] handler error em '${event}'`, e); }
      }
    },
    once(event, fn) {
      const off = this.on(event, (p) => { off(); fn(p); });
      return off;
    },
  };
}
