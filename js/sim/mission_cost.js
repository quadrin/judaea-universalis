// js/sim/mission_cost.js — how hard a mission actually is (SPEC §254). DOM-free.
//
// WHY THIS FILE EXISTS. A mission tree is supposed to say, by its shape, what
// a realm has to become and in what order. Ours said it by hand: an author
// picked a column, sometimes a row, and wrote `requires` where a causal chain
// felt right. That produced trees where "hold six provinces of the faith" sits
// above "take Jerusalem", where a war-score objective and a conquest of half
// the Levant share a row, and where the only thing actually SPACING the
// accomplishments out was a clock — §207's two-month rest, which delayed
// medallions the realm had already earned so they would not arrive in a
// volley. That is a metronome standing in for a difficulty curve.
//
// This is the difficulty curve. Every mission carries a `check(ctx)`, and a
// check is a predicate over one realm's state; so the honest way to ask how
// hard a mission is, is to ASK IT — against a realm that is a tenth of the way
// grown, then a fifth, then a third, and see where it turns true.
//
// THE PROBE WORLD. `probeAt(ctx, tag, p)` builds a throwaway ctx whose game is
// the same board with one realm scaled to power level p ∈ (0,1]: it controls
// the p-share of the map nearest its seat, fields p×the map's whole military
// weight, banks p×a chapter's plausible treasury, sits at p×full tech, and is
// regarded by every court at p×+100. Nothing about the live game is touched —
// the provinces and the tag are shallow copies, and the probe's ctx carries no
// bus, so a check that tries to notify writes into a sink.
//
// WHAT COMES BACK. A cost in [0,1] for a mission the ladder can move — the
// lowest level at which its check turns true — and `null` for the two kinds it
// cannot. A check already true of a realm at level zero is asking for
// something growth does not buy (a flag an event sets, a date, a court's own
// politics); so is one still false at level one. Both keep the place their
// author gave them, which is the right answer: the engine sorts what it can
// measure and does not pretend to measure the rest.
//
// The measurement is MONOTONE by construction — every quantity the ladder
// raises, it raises — so a binary search would be sound. It runs a linear
// sweep of twelve rungs anyway, because a check is cheap, twelve is exact
// enough to sort by, and a non-monotone check (there are a few: "at peace
// with everybody" is easier at level zero) then reports its FIRST true rung
// rather than an interval endpoint, which is what an author means by hard.

// `military.js` only: the probe borrows the LIVE ctx's helpers rather than
// importing the sim's entry point, which would make this module and init.js a
// cycle for the sake of one object that is already in the ctx it is handed.
import { num, clamp, tagDef, livingTag } from './military.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/mission_cost]', ...args);
}

// Twelve rungs, so the coarsest thing a tree can say is "a twelfth of the way
// there" and the finest is "everything".
export const RUNGS = 12;
// What a realm at full power looks like, in the units the checks read. These
// are deliberately generous: the ladder is a measuring stick and not a
// balance table, and a stick that stops short of the hardest mission in the
// game measures nothing at the top.
const FULL = {
  men: 200000,
  treasury: 4000,
  manpower: 200000,
  tech: 20,
  dev: 40,        // per province, added on top of what the board already has
  opinion: 120,
  warscore: 100,
  legitimacy: 100,
  stability: 3,
  reforms: 8,
  eraIdeas: 12,
};

function seatOf(ctx, tag) {
  const def = tagDef(ctx, tag) || {};
  if (def.capital) {
    const p = ctx.prov(def.capital);
    if (p) return p;
  }
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) return p;
  }
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable) return p;
  }
  return null;
}

// The order a realm eats the map in: its own ground first, then outward from
// its seat. A mission that asks for Antioch is therefore harder for a court in
// Jerusalem than one that asks for Joppa, which is the entire point.
function conquestOrder(ctx, tag) {
  const g = ctx.game;
  const seat = seatOf(ctx, tag);
  const sx = seat ? num(seat.x, num(seat.lon, 0)) : 0;
  const sy = seat ? num(seat.y, num(seat.lat, 0)) : 0;
  const rows = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    const mine = p.owner === tag ? 0 : 1;
    const dx = num(p.x, num(p.lon, 0)) - sx;
    const dy = num(p.y, num(p.lat, 0)) - sy;
    rows.push({ id: i, key: mine * 1e6 + Math.hypot(dx, dy) });
  }
  rows.sort((a, b) => a.key - b.key || a.id - b.id);
  return rows.map((r) => r.id);
}

// The shape of growth. A realm does not acquire the map at a constant rate and
// a tree that measured it that way would call everything easy: a twelfth of
// four hundred provinces is thirty-four, which is the whole Levant, so a
// linear ladder rated "take Jerusalem" and "hold the coast from Gaza to Tyre"
// as the same rung. Ground goes as the SQUARE of the level — the first rungs
// hand a district, the last hand a world — and armies and money, which a small
// realm can concentrate, go as the power of one and a half.
function shaped(level, exp) {
  return Math.pow(clamp(level, 0, 1), exp);
}

// One rung of the ladder: the same board, with `tag` grown to level p.
function probeAt(ctx, tag, p, order) {
  const g = ctx.game;
  const level = clamp(p, 0, 1);
  const take = Math.round(order.length * shaped(level, 2));
  const wanted = new Set(order.slice(0, take));
  const provinces = new Array(g.provinces.length);
  for (let i = 1; i < g.provinces.length; i++) {
    const src = g.provinces[i];
    if (!src) continue;
    if (!wanted.has(i)) { provinces[i] = src; continue; }
    provinces[i] = {
      ...src,
      owner: tag,
      controller: tag,
      siege: null,
      dev: {
        tax: num(src.dev && src.dev.tax) + Math.round(FULL.dev * shaped(level, 1.5)),
        prod: num(src.dev && src.dev.prod) + Math.round(FULL.dev * shaped(level, 1.5)),
        mp: num(src.dev && src.dev.mp) + Math.round(FULL.dev * shaped(level, 1.5)),
      },
    };
  }
  const tags = {};
  for (const k of Object.keys(g.tags || {})) {
    const t = g.tags[k];
    if (!t) continue;
    if (k !== tag) {
      // Everyone else thinks better of us the larger we get, which is how the
      // "reach +50 with Rome" objectives are meant to be reached.
      tags[k] = { ...t, opinion: { ...(t.opinion || {}), [tag]: Math.round(FULL.opinion * level) } };
      continue;
    }
    tags[k] = {
      ...t,
      treasury: Math.round(FULL.treasury * shaped(level, 1.5)),
      manpower: Math.round(FULL.manpower * shaped(level, 1.5)),
      maxManpower: Math.round(FULL.manpower * shaped(level, 1.5)),
      legitimacy: Math.round(FULL.legitimacy * level),
      stability: Math.round(FULL.stability * level),
      warExhaustion: 0,
      loans: 0,
      tech: {
        gov: Math.round(FULL.tech * level),
        infl: Math.round(FULL.tech * level),
        mar: Math.round(FULL.tech * level),
      },
      points: { gov: Math.round(1000 * level), infl: Math.round(1000 * level), mar: Math.round(1000 * level) },
      reforms: {
        mil: Math.round(FULL.reforms * level),
        civ: Math.round(FULL.reforms * level),
        rel: Math.round(FULL.reforms * level),
      },
    };
  }
  const armies = {};
  const seat = seatOf(ctx, tag);
  if (seat && level > 0) {
    const men = Math.round(FULL.men * shaped(level, 1.5));
    armies[1] = {
      id: 1, tag, name: 'The Probe', prov: seat.id,
      regiments: { inf: Math.max(1, Math.round(men / 1000)), cav: 0, art: 0 },
      men, morale: 3, maxMorale: 3, path: [], moveDaysLeft: 0, inBattle: false, retreating: false,
    };
  }
  // The wars: whatever the realm is actually fighting, with the score at
  // p×won. A war-score objective is then exactly as hard as its number.
  const wars = (g.wars || []).map((w) => {
    if (!w) return w;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(tag) < 0) return w;
    return { ...w, warscore: { ...(w.warscore || {}), [tag]: Math.round(FULL.warscore * level) } };
  });
  const game = {
    ...g,
    provinces,
    tags,
    armies,
    fleets: {},
    wars,
    // A probe never writes to the campaign's own books.
    flags: { ...(g.flags || {}) },
  };
  const nameToId = new Map();
  for (let i = 1; i < provinces.length; i++) {
    const q = provinces[i];
    if (!q) continue;
    nameToId.set(q.name, i);
    if (q.canon && q.canon !== q.name) nameToId.set(q.canon, i);
  }
  const probe = {
    ...ctx,
    game,
    bus: { emit() {}, on() { return () => {}; } },
    prov(name) { const id = nameToId.get(name); return id ? provinces[id] : null; },
    provId(name) { return nameToId.get(name) || 0; },
    byId(id) { return provinces[id] || null; },
    tagDef(t) { return tagDef(probe, t); },
    // A probe is a question, not a turn: nothing it runs may draw from the
    // campaign's seeded stream, or measuring the tree would change the world.
    rng: { int: () => 0, chance: () => false, next: () => 0.5, range: (a) => a },
  };
  return probe;
}

// The cost of every mission in one chain, memoized per (list, tag) — the
// panel asks on every repaint and the audit suite asks for every chapter.
const COSTS = new WeakMap();

export function missionCosts(ctx, tag, list) {
  if (!Array.isArray(list) || !list.length) return new Map();
  const live = livingTag(ctx, tag);
  let byTag = COSTS.get(list);
  if (!byTag) { byTag = new Map(); COSTS.set(list, byTag); }
  const key = String(live) + '|' + ((ctx.bookmark && ctx.bookmark.id) || '');
  const had = byTag.get(key);
  if (had) return had;

  const out = new Map();
  try {
    const order = conquestOrder(ctx, live);
    // Rung zero first: a check already true of a realm with nothing is not
    // measuring growth, and must keep its author's seat rather than sorting
    // to the top of every tree in the game.
    const rungs = [];
    for (let r = 0; r <= RUNGS; r++) rungs.push(probeAt(ctx, live, r / RUNGS, order));
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m || typeof m.check !== 'function') { out.set(String(m && m.id ? m.id : 'm' + i), null); continue; }
      const id = String(m.id ? m.id : 'm' + i);
      let cost = null;
      let free = false;
      for (let r = 0; r <= RUNGS; r++) {
        let ok = false;
        try { ok = !!m.check(rungs[r]); } catch (e) { ok = false; }
        if (!ok) continue;
        if (r === 0) { free = true; break; }
        cost = r / RUNGS;
        break;
      }
      out.set(id, free ? null : cost);
    }
  } catch (e) {
    warnOnce('probe:' + tag, 'the mission ladder would not build', e);
  }
  byTag.set(key, out);
  return out;
}

// The band a cost sits in: which row of the tree a mission has earned. Twelve
// rungs collapse to five bands, because a tree five deep is a tree a player
// can read and twelve is a spreadsheet.
export const BANDS = 5;
export function costBand(cost) {
  if (!Number.isFinite(cost)) return null;
  const b = Math.floor(clamp(cost, 0, 1) * BANDS);
  return Math.max(0, Math.min(BANDS - 1, b === BANDS ? BANDS - 1 : b));
}
