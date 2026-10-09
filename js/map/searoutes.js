// js/map/searoutes.js — the water a ship actually sails (SPEC §290).
//
// The sim moves a hull from one harbor to another in days (seaHopDays,
// merchantHopDays) and never asks which way it went. The map has to draw the
// way: a straight line from Joppa to Alexandria crosses the Nile delta, and a
// ship sliding over Sinai is not at sea. computeGeometry keeps a coarse grid
// of open sea (`geom.seaGrid`); this module finds a path through it, pulls the
// path taut, rounds its corners where the water allows, and caches it per pair
// of harbors. The overlay asks it for the point and the heading a fraction of
// the way along.
//
// Pure: no DOM, no game state. Without a grid (the headless harnesses use a
// fake geometry) every route is the straight line it always was.

const SQRT2 = Math.SQRT2;

export function createSeaRoutes(geom) {
  const cache = new Map();
  let gridRef = null;

  function grid() {
    const g = geom && geom.seaGrid;
    if (g !== gridRef) { cache.clear(); gridRef = g; } // a new map profile: new water
    return g && g.nav && g.gw > 0 ? g : null;
  }

  function anchorOf(id) {
    return (geom.offshore && geom.offshore[id]) || (geom.centroids && geom.centroids[id]) || null;
  }

  // Route between two harbors (province ids), or null when either has no
  // anchor. Always starts and ends exactly on the anchors.
  function route(fromId, toId) {
    grid(); // a new map profile empties the cache before it is read
    const key = fromId + '|' + toId;
    let r = cache.get(key);
    if (r !== undefined) return r;
    const back = cache.get(toId + '|' + fromId);
    if (back) {
      r = finish(back.pts.slice().reverse());
    } else {
      const a = anchorOf(fromId);
      const b = anchorOf(toId);
      r = a && b ? finish(findPath(a, b)) : null;
    }
    cache.set(key, r);
    return r;
  }

  // Open water first. Only when it does not join the two harbors is the
  // route allowed into the shallows (`wet`: any cell with sea in it), and
  // then at eight times the cost, so it takes the fewest it can — a strait.
  function findPath(a, b) {
    const g = grid();
    if (!g || (a.x === b.x && a.y === b.y)) return [a, b];
    const open = (i, p) => g.nav[i] === 1 && fineSea(g, p);
    let cells = astar(g, g.nav, null, a, b);
    if (cells) return smooth(g, open, a, b, cells);
    if (g.wet) {
      cells = astar(g, g.wet, g.nav, a, b);
      if (cells) {
        // the taut line may cross a shallow cell only where the path itself did
        const onPath = new Set(cells);
        return smooth(g, (i, p) => open(i, p) || (onPath.has(i) && g.wet[i] === 1), a, b, cells);
      }
    }
    return [a, b]; // no water joins them on this grid: the old straight line
  }

  return { route, pointAt, clear: () => cache.clear() };
}

// ---------------------------------------------------------------- the grid --
function cellOf(g, p) {
  const cx = Math.max(0, Math.min(g.gw - 1, Math.floor(p.x / g.cell)));
  const cy = Math.max(0, Math.min(g.gh - 1, Math.floor(p.y / g.cell)));
  return cy * g.gw + cx;
}
function centerOf(g, i) {
  return { x: ((i % g.gw) + 0.5) * g.cell, y: (Math.floor(i / g.gw) + 0.5) * g.cell };
}

// The nearest open cell to a point (a harbor anchor sits on the coast's edge,
// often in a cell that is mostly land). Breadth-first, a few cells out.
function snap(g, layer, p) {
  const start = cellOf(g, p);
  if (layer[start]) return start;
  const seen = new Set([start]);
  let ring = [start];
  for (let d = 0; d < 10 && ring.length; d++) {
    const next = [];
    let best = -1;
    let bestD = Infinity;
    for (const i of ring) {
      const x = i % g.gw;
      const y = (i / g.gw) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= g.gw || ny >= g.gh) continue;
          const j = ny * g.gw + nx;
          if (seen.has(j)) continue;
          seen.add(j);
          if (layer[j]) {
            const c = centerOf(g, j);
            const dd = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
            if (dd < bestD) { bestD = dd; best = j; }
          } else next.push(j);
        }
      }
    }
    if (best >= 0) return best;
    ring = next;
  }
  return -1;
}

// A* over the 8-connected grid; no diagonal slips between two land cells.
// A cell beside the coast costs a little more, so the route keeps to open
// water where it has the choice; with `deep` given, a cell of `layer` that is
// not in `deep` costs eight times as much.
function astar(g, layer, deep, a, b) {
  const s = snap(g, layer, a);
  const t = snap(g, layer, b);
  if (s < 0 || t < 0) return null;
  if (s === t) return [s];
  const n = g.gw * g.gh;
  const gScore = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const tx = t % g.gw;
  const ty = (t / g.gw) | 0;
  const h = (i) => {
    const dx = Math.abs((i % g.gw) - tx);
    const dy = Math.abs(((i / g.gw) | 0) - ty);
    return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
  };
  // binary heap of [f, i]
  const heapF = [];
  const heapI = [];
  const push = (f, i) => {
    let k = heapF.length;
    heapF.push(f); heapI.push(i);
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heapF[p] <= heapF[k]) break;
      [heapF[p], heapF[k]] = [heapF[k], heapF[p]];
      [heapI[p], heapI[k]] = [heapI[k], heapI[p]];
      k = p;
    }
  };
  const pop = () => {
    const top = heapI[0];
    const lastF = heapF.pop();
    const lastI = heapI.pop();
    if (heapF.length) {
      heapF[0] = lastF; heapI[0] = lastI;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heapF.length && heapF[l] < heapF[m]) m = l;
        if (r < heapF.length && heapF[r] < heapF[m]) m = r;
        if (m === k) break;
        [heapF[m], heapF[k]] = [heapF[k], heapF[m]];
        [heapI[m], heapI[k]] = [heapI[k], heapI[m]];
        k = m;
      }
    }
    return top;
  };
  gScore[s] = 0;
  push(h(s), s);
  while (heapF.length) {
    const i = pop();
    if (i === t) {
      const out = [t];
      for (let c = came[t]; c >= 0; c = came[c]) out.push(c);
      return out.reverse();
    }
    if (closed[i]) continue;
    closed[i] = 1;
    const x = i % g.gw;
    const y = (i / g.gw) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= g.gw || ny >= g.gh) continue;
        const j = ny * g.gw + nx;
        if (!layer[j] || closed[j]) continue;
        if (dx && dy && (!layer[y * g.gw + nx] || !layer[ny * g.gw + x])) continue;
        let step = dx && dy ? SQRT2 : 1;
        if (deep && !deep[j]) step *= 8;
        else if (coastal(g, layer, nx, ny)) step *= 1.6;
        const ng = gScore[i] + step;
        if (ng < gScore[j]) {
          gScore[j] = ng;
          came[j] = i;
          push(ng + h(j), j);
        }
      }
    }
  }
  return null;
}

function coastal(g, layer, x, y) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= g.gw || ny >= g.gh) continue;
      if (!layer[ny * g.gw + nx]) return true;
    }
  }
  return false;
}

// Is a point on sea at the fine grid (10-pixel cells), and is the water 4
// pixels to each side of it sea too? The margin covers the gap between two
// samples, so a line cannot clip a cape's corner between them, and it keeps
// a hull's width off the shore. With no fine grid, the coarse one is all
// there is.
const MARGIN = [[0, 0], [4, 0], [-4, 0], [0, 4], [0, -4]];
function fineSea(g, p) {
  const f = g.fine;
  if (!f) return true;
  for (const [dx, dy] of MARGIN) {
    const cx = Math.max(0, Math.min(f.gw - 1, Math.floor((p.x + dx) / f.cell)));
    const cy = Math.max(0, Math.min(f.gh - 1, Math.floor((p.y + dy) / f.cell)));
    if (f.sea[cy * f.gw + cx] !== 1) return false;
  }
  return true;
}

// Is the straight segment p→q on water the route may use? Sampled every
// half fine cell (a third of a coarse one without it); `ok(i, point)` says
// whether coarse cell i may be crossed at that point.
function clear(g, ok, p, q) {
  const len = Math.hypot(q.x - p.x, q.y - p.y);
  const step = g.fine ? g.fine.cell / 2 : g.cell / 3;
  const steps = Math.max(1, Math.ceil(len / step));
  for (let k = 0; k <= steps; k++) {
    const f = k / steps;
    const pt = { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
    if (!ok(cellOf(g, pt), pt)) return false;
  }
  return true;
}

// Cells → a taut polyline (each point the farthest one still in plain sight
// of the last), then its corners rounded twice, but never onto land.
function smooth(g, ok, a, b, cells) {
  const raw = cells.map((i) => centerOf(g, i));
  const taut = [raw[0]];
  let i = 0;
  while (i < raw.length - 1) {
    let j = raw.length - 1;
    while (j > i + 1 && !clear(g, ok, raw[i], raw[j])) j--;
    taut.push(raw[j]);
    i = j;
  }
  let pts = [a, ...taut, b];
  for (let pass = 0; pass < 2; pass++) {
    const out = [pts[0]];
    for (let k = 1; k < pts.length - 1; k++) {
      const p = pts[k - 1];
      const c = pts[k];
      const n = pts[k + 1];
      const q1 = { x: c.x + (p.x - c.x) * 0.25, y: c.y + (p.y - c.y) * 0.25 };
      const q2 = { x: c.x + (n.x - c.x) * 0.25, y: c.y + (n.y - c.y) * 0.25 };
      if (clear(g, ok, q1, q2)) out.push(q1, q2);
      else out.push(c);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

// Arc lengths, for walking the route at a steady speed.
function finish(pts) {
  const cum = [0];
  for (let k = 1; k < pts.length; k++) {
    cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  }
  return { pts, cum, len: cum[cum.length - 1] };
}

function at(r, s) {
  const { pts, cum } = r;
  if (s <= 0 || pts.length < 2) return { x: pts[0].x, y: pts[0].y };
  if (s >= r.len) return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= s) lo = mid; else hi = mid;
  }
  const seg = cum[hi] - cum[lo] || 1;
  const f = (s - cum[lo]) / seg;
  return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * f, y: pts[lo].y + (pts[hi].y - pts[lo].y) * f };
}

// The point a fraction f (0–1) of the way along, its heading (radians, from
// a short span either side so turns are eased), and the distance run.
export function pointAt(r, f, span) {
  const s = Math.max(0, Math.min(1, f)) * r.len;
  const p = at(r, s);
  const w = span || 14;
  const p0 = at(r, s - w);
  const p1 = at(r, s + w);
  const heading = (p1.x === p0.x && p1.y === p0.y) ? 0 : Math.atan2(p1.y - p0.y, p1.x - p0.x);
  return { x: p.x, y: p.y, heading, s };
}

// Points along the route between two distances (for wakes and order lines).
export function slice(r, s0, s1, step) {
  const out = [];
  const a = Math.max(0, Math.min(r.len, s0));
  const b = Math.max(0, Math.min(r.len, s1));
  const n = Math.max(1, Math.ceil(Math.abs(b - a) / (step || 8)));
  for (let k = 0; k <= n; k++) out.push(at(r, a + (b - a) * (k / n)));
  return out;
}
