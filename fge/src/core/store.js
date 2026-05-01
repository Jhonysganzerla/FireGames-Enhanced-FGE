// Mini store reativa. Sem dependência externa.
//
// Uso:
//   const store = createStore({ count: 0 });
//   store.subscribe(s => console.log(s.count));
//   store.set({ count: 1 });            // patch shallow
//   store.update(s => ({ count: s.count + 1 }));
//   store.get().count;

export function createStore(initial = {}) {
  let state = initial;
  const subs = new Set();
  const notify = () => subs.forEach(fn => { try { fn(state); } catch (e) { console.error('[store] sub error', e); } });

  return {
    get: () => state,
    set: (patch) => { state = { ...state, ...patch }; notify(); },
    update: (fn) => { state = { ...state, ...fn(state) }; notify(); },
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  };
}
