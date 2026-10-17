// Fort-controlled approaches. Pure readers shared by orders, AI and the map.
import { canEnter, isHostile, sameSide, effectiveFort } from './military.js';

export function fortRegions(ctx) {
  const regions = [];
  for (const p of ctx.game.provinces || []) {
    if (!p || p.impassable || effectiveFort(p) <= 0 || !(p.garrison > 0)) continue;
    const approaches = [];
    for (const id of ctx.geom?.neighbors?.[p.id] || []) {
      const q = ctx.byId(id);
      if (q && !q.impassable && sameSide(ctx, p.owner, q.owner)) approaches.push(id);
    }
    regions.push({ id: p.id, controller: p.controller, approaches });
  }
  return regions;
}

export function fortControl(ctx, tag, regions = fortRegions(ctx)) {
  const forts = new Set(), guards = new Map(), friendly = new Set();
  const add = (id, fort) => {
    if (!guards.has(id)) guards.set(id, []);
    guards.get(id).push(fort);
  };
  for (const r of regions) {
    if (!isHostile(ctx, tag, r.controller)) continue;
    forts.add(r.id); add(r.id, r.id);
    for (const id of r.approaches) {
      // Occupying the countryside does not turn off its fortress. Defenders
      // can still maneuver through their own countryside around a lost fort.
      if (isHostile(ctx, tag, ctx.byId(id).owner)) add(id, r.id);
    }
  }
  for (const p of ctx.game.provinces || []) {
    if (p && sameSide(ctx, tag, p.owner) && sameSide(ctx, tag, p.controller)
        && !forts.has(p.id)) friendly.add(p.id);
  }
  return { forts, guards, friendly };
}

// null means blocked; an array is the approach trail after a legal hop.
// Only an approach and its fortress can be advanced into before a capture,
// so the return trail stays short. Reversing it is always a legal withdrawal.
export function fortStep(control, from, to, trail = []) {
  const guarded = control.guards.get(from);
  const back = guarded && Array.isArray(trail) ? trail : [];
  const returning = back.length > 0 && to === back[back.length - 1];
  if (guarded && !returning && !control.friendly.has(to)
      && (control.forts.has(from) || !guarded.includes(to))) return null;
  if (!control.guards.has(to)) return [];
  return returning ? back.slice(0, -1) : [...back, from];
}

// An old save or a force raised/landed inside a guarded region has no entry
// history. Give it a homeward withdrawal, never an arbitrary onward exit.
export function fortApproachFor(ctx, army, control) {
  if (!control.guards.has(army.prov)) return [];
  if (Array.isArray(army.fortApproach) && army.fortApproach.length) return army.fortApproach;
  const queue = [army.prov], prev = new Map([[army.prov, null]]);
  for (let i = 0; i < queue.length; i++) {
    for (const id of ctx.geom?.neighbors?.[queue[i]] || []) {
      if (prev.has(id) || !canEnter(ctx, army.tag, id)) continue;
      prev.set(id, queue[i]);
      if (control.friendly.has(id)) {
        const trail = [];
        let at = id;
        while (at !== army.prov) { trail.push(at); at = prev.get(at); }
        return trail;
      }
      queue.push(id);
    }
  }
  return [];
}

// State includes the approach trail: two routes to the same province can
// have different legal withdrawals. Both player and AI searches use this.
export function landRoutes(ctx, army, options = {}) {
  const { target, maxCost = 64, cost = () => 1, avoid, ignoreForts = false } = options;
  const control = options.control || fortControl(ctx, army.tag);
  const dist = new Map(), best = new Map(), seen = new Map();
  const startTrail = ignoreForts ? [] : fortApproachFor(ctx, army, control);
  const key = (id, trail) => id + ':' + trail.join(',');
  const first = { id: army.prov, trail: startTrail, d: 0, prev: null };
  seen.set(key(first.id, first.trail), 0);
  const heap = [];
  const push = (node) => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].d <= node.d) break;
      heap[i] = heap[p]; i = p;
    }
    heap[i] = node;
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      let i = 0;
      while (true) {
        let child = i * 2 + 1;
        if (child >= heap.length) break;
        if (child + 1 < heap.length && heap[child + 1].d < heap[child].d) child++;
        if (last.d <= heap[child].d) break;
        heap[i] = heap[child]; i = child;
      }
      heap[i] = last;
    }
    return top;
  };
  push(first);
  while (heap.length) {
    const node = pop();
    if (node.d !== seen.get(key(node.id, node.trail))) continue;
    if (!dist.has(node.id)) { dist.set(node.id, node.d); best.set(node.id, node); }
    if (node.id === target) break;
    if (avoid?.has(node.id) && node.id !== army.prov) continue;
    for (const id of ctx.geom?.neighbors?.[node.id] || []) {
      if (!canEnter(ctx, army.tag, id)) continue;
      const trail = ignoreForts ? [] : fortStep(control, node.id, id, node.trail);
      if (trail === null) continue;
      const d = node.d + cost(node.id, id);
      if (d > maxCost) continue;
      const k = key(id, trail);
      if (seen.has(k) && seen.get(k) <= d) continue;
      seen.set(k, d); push({ id, trail, d, prev: node });
    }
  }
  return {
    dist, control,
    pathTo(id) {
      let node = best.get(id);
      if (!node) return null;
      const path = [];
      while (node.prev) { path.unshift(node.id); node = node.prev; }
      return path;
    },
  };
}

export function fortBlockReason(ctx, army, target) {
  const routes = landRoutes(ctx, army, { target });
  if (routes.dist.has(target)) return '';
  // Name the first blocked approach on an otherwise legal land route, rather
  // than blaming an unrelated fort when the destination is across the sea.
  const raw = landRoutes(ctx, army, { target, ignoreForts: true }).pathTo(target);
  if (!raw) return '';
  let from = army.prov, trail = fortApproachFor(ctx, army, routes.control);
  for (const to of raw) {
    const next = fortStep(routes.control, from, to, trail);
    if (next === null) {
      const names = (routes.control.guards.get(from) || []).map(id => ctx.byId(id).name);
      return names.join(', ') + (names.length > 1 ? ' guard' : ' guards')
        + ' this approach. Capture the fort, retrace your approach, or find a route around its guarded land.';
    }
    trail = next; from = to;
  }
  return '';
}
