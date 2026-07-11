// Tiny pub/sub. Event catalog in SPEC.md §7.
export const bus = {
  _h: new Map(),
  on(ev, cb) {
    if (!this._h.has(ev)) this._h.set(ev, new Set());
    this._h.get(ev).add(cb);
    return () => { const s = this._h.get(ev); if (s) s.delete(cb); };
  },
  emit(ev, payload) {
    const s = this._h.get(ev);
    if (!s) return;
    for (const cb of [...s]) {
      try { cb(payload); } catch (e) { console.error(`[bus:${ev}]`, e); }
    }
  },
};
