// Judaea Universalis — the geography of the estates (SPEC §167). DOM-free.
//
// WHY THIS FILE EXISTS. `factions.js` gave the player's court two or three
// named parties with an approval bar each. What it could not give them was a
// PLACE. The Pharisees stood at 62 everywhere at once; the Hellenizers stood
// at 31 in Ptolemais and at 31 in the Judaean hills, which is the one thing
// they demonstrably did not do. So the estates could be courted, appeased and
// offended, and they could never be fought over — and taking a Greek city,
// which is the most politically loaded act available in this whole period, was
// arithmetic about province counts.
//
// THREE THINGS THIS ADDS, AND NOTHING ELSE.
//
//   1. STRENGTH. Every party has a strength in every province, computed from
//      what the province IS — town or country, coast or hills, its faith
//      against its ruler's, a trade stop, a fort, a holy site, its development.
//      The weights are authored in `js/data/estate_ground.js`; the signals are
//      computed here. Nothing is stored: a province's politics follow the
//      province, so a town that grows or a faith that drifts moves them with
//      no bookkeeping and no save-format change.
//
//   2. INFLUENCE. A party's weight at court is the development-weighted share
//      of the realm that is its ground. This is the number that makes conquest
//      political: take the coast and the Hellenizers matter more at YOUR
//      court, whether or not they like you. `factions.js` scales each estate's
//      boon and bane by it, so a party with no ground in your realm is a party
//      whose approval barely moves anything, and a party that holds half your
//      development is one you cannot ignore at any approval.
//
//   3. LOCAL UNREST. A province whose dominant party is hostile to the crown
//      is a province with a reason to riot, and one whose dominant party is
//      devoted is quiet. It rides the ordinary unrest breakdown as a labelled
//      row, so the province panel says WHICH party is angry here.
//
// And it gives the map a mapmode, which is the cheapest legibility in the game.

import { num, clamp, tagDef, livingTag } from './military.js';
import { ESTATE_GROUND, ESTATE_FLAT } from '../data/estate_ground.js';
import { TRADE_ROUTES } from '../data/trade.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/estates]', ...args);
}

export const ESTATE = {
  // What a dominant party's mood does to its own ground, at the extremes.
  unrestHostile: 2.2,
  unrestDiscontent: 1.1,
  unrestDevoted: -1,
  unrestLoyal: -0.5,
  // Influence is expressed as a multiplier on the estate's authored effects,
  // centred on an even split: a party holding exactly its even share pushes
  // 1.0×, one holding twice that pushes 1.4×, one holding none pushes 0.6×.
  // Narrow on purpose — this tilts the balance the bookmarks were tuned at,
  // it does not replace it.
  influenceSlope: 0.4,
  influenceFloor: 0.6,
  influenceCeil: 1.4,
};

const HAB = { urban: 1, town: 0.6, rural: 0.2, frontier: 0, uninhabited: 0 };

let _tradeStops = null;
function tradeStops() {
  if (_tradeStops) return _tradeStops;
  _tradeStops = new Set();
  try {
    for (const r of TRADE_ROUTES || []) for (const s of (r && r.stops) || []) _tradeStops.add(s);
  } catch (e) { warnOnce('trade', 'trade stop index failed', e); }
  return _tradeStops;
}

function devTotal(p) {
  return p && p.dev ? num(p.dev.tax) + num(p.dev.prod) + num(p.dev.mp) : 0;
}

// The 0-1 readings of one province. Everything here is already on the province
// or one lookup away; nothing is cached, because the caller that walks 307 of
// them does it a handful of times a month and the alternative is a cache that
// goes stale the first time a town grows.
export function groundSignals(ctx, p) {
  const g = ctx.game;
  const owner = p.owner ? g.tags[p.owner] : null;
  const city = Number.isFinite(HAB[p.habitation]) ? HAB[p.habitation]
    : clamp(devTotal(p) / 20, 0, 1); // a chapter that declares no habitation reads the town off its size
  const terr = p.terrain;
  const capital = owner ? (tagDef(ctx, p.owner).capital || null) : null;
  const faith = owner && p.religion && owner.religion ? (p.religion === owner.religion ? 1 : 0) : 0.5;
  return {
    city,
    rural: 1 - city,
    coast: terr === 'coast' ? 1 : 0,
    hills: terr === 'hills' || terr === 'mountains' ? 1 : 0,
    desert: terr === 'desert' || terr === 'drylands' || terr === 'steppe' ? 1 : 0,
    faith,
    alien: 1 - faith,
    trade: tradeStops().has(p.canon || p.name) || tradeStops().has(p.name) ? 1 : 0,
    fort: clamp(num(p.fort) / 3, 0, 1),
    holy: p.holy ? 1 : 0,
    dev: clamp(devTotal(p) / 24, 0, 1),
    capital: capital && (p.name === capital || p.canon === capital) ? 1 : 0,
  };
}

// One party's strength on one province, 0-100.
export function estateStrength(ctx, p, fid) {
  const w = ESTATE_GROUND[fid] || ESTATE_FLAT;
  const s = groundSignals(ctx, p);
  let v = num(w.base, 40);
  for (const [axis, weight] of Object.entries(w)) {
    if (axis === 'base') continue;
    const sig = s[axis];
    if (Number.isFinite(sig) && Number.isFinite(weight)) v += weight * sig;
  }
  return clamp(v, 0, 100);
}

// Which party owns the ground here, out of the ones seated at its ruler's
// court. Returns null where nobody is seated — an unowned province, a rump,
// a chapter with no estates.
export function dominantEstate(ctx, p, seats) {
  if (!p || !p.owner) return null;
  const defs = seats || seatsFor(ctx, p.owner);
  if (!defs || !defs.length) return null;
  let best = null;
  for (const d of defs) {
    if (!d || !d.id) continue;
    const v = estateStrength(ctx, p, d.id);
    if (!best || v > best.v) best = { id: d.id, name: d.name || d.id, v };
  }
  return best;
}

// The parties seated at a tag's court, whoever runs it: the player's authored
// estates or the generated foreign archetypes. Injected rather than imported
// so this module stays free of a cycle with factions.js and courts.js — both
// of which want to CALL this one.
let _seatSources = [];
export function registerSeatSource(fn) {
  if (typeof fn === 'function' && _seatSources.indexOf(fn) < 0) _seatSources.push(fn);
}
export function seatsFor(ctx, tag) {
  for (const fn of _seatSources) {
    try {
      const defs = fn(ctx, tag);
      if (Array.isArray(defs) && defs.length) return defs;
    } catch (e) { warnOnce('seats:' + tag, 'seat source threw', e); }
  }
  return null;
}

// The development-weighted share of a realm that each party's ground accounts
// for. Shares sum to 1. This is the number `factions.js` and `courts.js` use
// to scale what an estate's mood is worth.
export function estateInfluence(ctx, tag) {
  const g = ctx.game;
  const live = livingTag(ctx, tag);
  const defs = seatsFor(ctx, live);
  if (!defs || !defs.length) return null;
  const totals = {};
  for (const d of defs) if (d && d.id) totals[d.id] = 0;
  let any = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== live) continue;
    const weight = Math.max(1, devTotal(p));
    any += weight;
    for (const d of defs) {
      if (!d || !d.id) continue;
      totals[d.id] += estateStrength(ctx, p, d.id) * weight;
    }
  }
  if (!any) return null;
  let sum = 0;
  for (const k of Object.keys(totals)) sum += totals[k];
  if (sum <= 0) return null;
  const out = {};
  for (const k of Object.keys(totals)) out[k] = totals[k] / sum;
  return out;
}

// The multiplier on one estate's authored boon/bane, from its share of the
// realm's ground against an even split.
// NEUTRAL AT AN EVEN SHARE, and that is a contract, not a nicety. Shares sum
// to one across the seats at a court, so a party holding exactly its even
// share has `rel === 1` and must come back with exactly 1.0 — otherwise this
// module silently re-tunes every authored boon and bane in eight bookmarks,
// which is what the first draft did (it returned 0.865 for a perfectly
// balanced court, and smoke18 caught it on the next run).
export function influenceScale(ctx, tag, fid) {
  try {
    const shares = estateInfluence(ctx, tag);
    if (!shares || !Number.isFinite(shares[fid])) return 1;
    const n = Object.keys(shares).length || 1;
    const even = 1 / n;
    const rel = even > 0 ? shares[fid] / even : 1;
    return clamp(1 + (rel - 1) * ESTATE.influenceSlope, ESTATE.influenceFloor, ESTATE.influenceCeil);
  } catch (e) { warnOnce('infl:' + fid, 'influenceScale failed', e); return 1; }
}

// The two political engines also hand over their approval readers, for the
// same reason they hand over their seat lists: `unrest.js` has no business
// importing both of them to ask one question, and `courts.js` already imports
// `unrest.js`, so the direct route would be a cycle.
let _approvalSources = [];
export function registerApprovalSource(fn) {
  if (typeof fn === 'function' && _approvalSources.indexOf(fn) < 0) _approvalSources.push(fn);
}
export function estateApproval(ctx, tag, fid) {
  for (const fn of _approvalSources) {
    try {
      const v = fn(ctx, tag, fid);
      if (Number.isFinite(v)) return v;
    } catch (e) { warnOnce('approval:' + tag, 'approval source threw', e); }
  }
  return null;
}

// The unrest one province owes to the mood of whichever party owns its ground.
export function localEstateUnrest(ctx, p) {
  try {
    if (!p || !p.owner) return null;
    const dom = dominantEstate(ctx, p);
    if (!dom) return null;
    const app = estateApproval(ctx, p.owner, dom.id);
    if (!Number.isFinite(app)) return null;
    const v = app <= 20 ? ESTATE.unrestHostile
      : app <= 40 ? ESTATE.unrestDiscontent
        : app >= 80 ? ESTATE.unrestDevoted
          : app >= 60 ? ESTATE.unrestLoyal : 0;
    if (!v) return null;
    return { id: dom.id, name: dom.name, approval: Math.round(app), unrest: v };
  } catch (e) { warnOnce('localUnrest', 'localEstateUnrest failed', e); return null; }
}

// Where one party's ground actually IS (SPEC §197): the provinces of the
// realm it is dominant on — its colour on the estates mapmode — counted, and
// the best of them named, ordered by development. This is the line that lets
// the realm panel say "their ground: 12 provinces, strongest in Jerusalem,
// Gophna, Hebron" and mean exactly what the map paints. A party dominant
// nowhere still gets its strongest ground named, because "nowhere" is an
// answer the panel must phrase rather than a row it may drop.
export function estateGroundSummary(ctx, tag, fid, cap = 3) {
  try {
    const g = ctx.game;
    const live = livingTag(ctx, tag);
    const seats = seatsFor(ctx, live);
    if (!seats || !seats.length) return null;
    const mine = [];
    const best = [];
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== live) continue;
      const own = estateStrength(ctx, p, fid);
      const row = { name: p.name, v: own, dev: devTotal(p) };
      best.push(row);
      const dom = dominantEstate(ctx, p, seats);
      if (dom && dom.id === fid) mine.push(row);
    }
    if (!best.length) return null;
    const pick = (mine.length ? mine : best)
      .sort((a, b) => (b.dev - a.dev) || (b.v - a.v)).slice(0, cap);
    return {
      count: mine.length,
      total: best.length,
      dominant: mine.length > 0,
      names: pick.map((x) => x.name),
    };
  } catch (e) { warnOnce('ground:' + fid, 'estateGroundSummary failed', e); return null; }
}

// The province panel's read: every seated party's strength on this ground,
// strongest first.
export function estateReport(ctx, p) {
  try {
    if (!p || !p.owner) return null;
    const defs = seatsFor(ctx, p.owner);
    if (!defs || !defs.length) return null;
    return defs.filter((d) => d && d.id).map((d) => ({
      id: d.id,
      name: d.name || d.id,
      strength: Math.round(estateStrength(ctx, p, d.id)),
    })).sort((a, b) => b.strength - a.strength);
  } catch (e) { warnOnce('report', 'estateReport failed', e); return null; }
}
