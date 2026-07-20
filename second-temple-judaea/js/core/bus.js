// Minimal pub/sub event bus. DOM-free.
const handlers = new Map();

export const bus = {
  on(event, fn) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(fn);
    return () => handlers.get(event)?.delete(fn);
  },
  emit(event, payload) {
    const set = handlers.get(event);
    if (!set) return;
    for (const fn of set) {
      try { fn(payload); } catch (e) { console.warn(`bus handler for "${event}" failed`, e); }
    }
  },
};
