// Judaea Universalis — institutions: the geography of falling behind (SPEC §166).
// DOM-free.
//
// WHY THIS FILE EXISTS. Technology was three ladders bought with monarch
// points, capped per era, and priced by one formula that took a level and a
// baseline (`js/data/tech.js`). Nothing in it knew where anybody was. Judaea
// climbed the same stairs as Rome at the same conceptual rate, and the only
// reason Judaea was behind was that Judaea had fewer points.
//
// That is a real hole. "Behind" is not a point total in this period; it is a
// place. The Greek way of running a government arose in Alexandria and Antioch
// and spread outward from them, and a kingdom in the hills was behind because
// of where the hills were — and could stop being behind by adopting something,
// at a price its own people would make it pay. A game about the second century
// BCE that cannot represent that is missing its own subject.
//
// HOW IT WORKS, IN FOUR SENTENCES.
//
//   1. Every institution is born in a place in a year (`js/data/institutions.js`)
//      and spreads province by province — faster along a border it already
//      crossed, faster inside one realm, faster into a rich province.
//   2. A realm may EMBRACE an institution once enough of its own land has it.
//      Embracing costs points and gold once, grants a permanent modifier, and
//      moves the estates — which is where the Hellenizer quarrel finally gets
//      teeth.
//   3. Every institution that exists in the world and that a realm has NOT
//      embraced multiplies the price of every technology level that realm buys.
//   4. An institution older than three centuries at the chapter's start is
//      furniture: everyone has it, nobody pays for it, and it is not counted.
//
// WHAT IT DELIBERATELY IS NOT. It is not a fourth ladder and it is not a
// research minigame. There is exactly one number it produces for the rest of
// the engine — `institutionMult(ctx, tag)` — and exactly two places consume it,
// the player's tech price and the AI's. Everything else here exists to make
// that number mean something.

import {
  num, clamp, chronicle, livingTag, setDiploCd, diploCdActive, diploCdMonthsLeft,
} from './military.js';
import { INSTITUTIONS, UNIVERSAL_AFTER_YEARS } from '../data/institutions.js';
import { TRADE_ROUTES } from '../data/trade.js';
import { shiftFaction } from './factions.js';
import { shiftCourt, courtSeats } from './courts.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/institutions]', ...args);
}

export const INST = {
  // Progress at or above this counts a province as having the institution,
  // and only such a province pushes it to its neighbours.
  presentAt: 50,
  // A realm may embrace once this share of its development has it.
  embraceShare: 0.35,
  // What each un-embraced live institution adds to every tech price.
  penaltyPer: 0.15,
  penaltyMax: 0.9,
  // Spread multipliers.
  sameOwnerMult: 1.6,
  richMult: 0.04, // per development point of the receiving province
  tradeMult: 1.2, // a route stop hears from the other end of the route
  momentum: 2, // …and everything moves faster once the world is doing it
  maxMonthly: 6, // …but nowhere converts in a single month
  // …and it slows to a crawl at the edge of a religious group. This is the
  // single most load-bearing number in the file. Without it the Greek chancery
  // walks from Alexandria into the Judaean hill country in about forty years
  // and the whole Hellenizer quarrel is settled before 167 BCE opens — which
  // is not merely a balance problem, it is the wrong history. What actually
  // stopped the chancery at the hills was that the people in the hills did not
  // want it, and this is where the model says so.
  alienMult: 0.18,
  alienCap: 40, // …and never past this, short of schooling it or embracing it
  // How long a pre-existing institution is given to have spread before the
  // chapter opens, and how long a court must have lived with one before it
  // counts as already embraced at the start.
  preSpreadMonthsMax: 720,
  preSpreadStep: 6,
  settledYears: 60,
  // The catch-up lever: what one province costs to school, and how much of
  // the way it goes.
  promote: { infl: 15, treasury: 45, progress: 34, cooldownMonths: 6 },
};

function startYear(ctx) {
  const b = ctx.bookmark;
  const d = b && b.startDate ? b.startDate : null;
  return d && Number.isFinite(d.y) ? d.y : num(ctx.game.date.y);
}

// Years between two years with no year zero, which this calendar does not have.
function yearsBetween(a, b) {
  const aa = a < 0 ? a + 1 : a;
  const bb = b < 0 ? b + 1 : b;
  return bb - aa;
}

// The institutions this chapter actually plays with: born, or about to be
// born, and not already three centuries old when the campaign opened.
export function liveInstitutions(ctx) {
  const y0 = startYear(ctx);
  return INSTITUTIONS.filter((inst) => yearsBetween(inst.from, y0) < UNIVERSAL_AFTER_YEARS);
}

// …and the ones that are simply the world by now.
export function universalInstitutions(ctx) {
  const y0 = startYear(ctx);
  return INSTITUTIONS.filter((inst) => yearsBetween(inst.from, y0) >= UNIVERSAL_AFTER_YEARS);
}

// Has it been born yet, in this campaign's now?
function born(ctx, inst) {
  return yearsBetween(inst.from, num(ctx.game.date.y)) >= 0;
}

export function institutionById(id) {
  return INSTITUTIONS.find((i) => i && i.id === id) || null;
}

// ------------------------------------------------------------------- seeding
//
// Runs once per campaign (and once more on any save made before this existed,
// which is why it is idempotent and keyed on a flag rather than on a version).
export function ensureInstitutions(ctx) {
  const g = ctx.game;
  if (!g.inst || typeof g.inst !== 'object') g.inst = {};
  if (g.inst._seeded) return g.inst;
  g.inst._seeded = true;
  const universal = universalInstitutions(ctx).map((i) => i.id);
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p) continue;
    if (!p.inst || typeof p.inst !== 'object') p.inst = {};
    for (const id of universal) p.inst[id] = 100;
  }
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t) continue;
    if (!Array.isArray(t.embraced)) t.embraced = [];
    for (const id of universal) if (t.embraced.indexOf(id) < 0) t.embraced.push(id);
  }

  // THE WORLD DID NOT START THIS MONTH. An institution born inside the
  // three-century window but before the chapter opens has already been
  // travelling for a century or two, and a campaign that starts it at its
  // birthplace with a clean map is telling a lie the player can see: the
  // Greek chancery does not arrive in Antioch in 165 BCE, it has been there
  // since Seleucus.
  //
  // So the spread is simply RUN FORWARD from the birth year to the opening
  // date, with the live rules — not approximated by a distance formula that
  // would then have to be kept in sync with them. It costs a few hundred
  // milliseconds once per campaign and it is the only way the two can never
  // disagree.
  const y0 = startYear(ctx);
  for (const inst of liveInstitutions(ctx)) {
    const age = yearsBetween(inst.from, y0);
    if (age <= 0) continue; // not born yet when the chapter opens
    birth(ctx, inst, true);
    const b = g.inst.born && g.inst.born[inst.id];
    if (!b || !b.prov) continue;
    const months = Math.min(INST.preSpreadMonthsMax, Math.round(age * 12));
    const step = INST.preSpreadStep;
    for (let i = 0; i < months; i += step) spreadOnce(ctx, inst, step);
    // …and a court that has lived with it for two generations is not "deciding
    // whether to adopt" it at the opening bell. It adopted it, off-screen,
    // before the campaign, and pays no opening surcharge for a question its
    // grandparents settled.
    if (age >= INST.settledYears) {
      for (const tag of Object.keys(g.tags)) {
        const t = g.tags[tag];
        if (!t || !t.alive || tag === 'REB' || tag === 'WASTE') continue;
        if (t.embraced.indexOf(inst.id) >= 0) continue;
        if (institutionShare(ctx, tag, inst.id) < INST.embraceShare) continue;
        t.embraced.push(inst.id); // no modifier: see `embraceCore`
      }
    }
  }
  return g.inst;
}

// Put a newly-born institution on the map at its origin. The first origin name
// that exists on this map wins; if none does — a chapter whose frame does not
// reach Britain, say — the institution is simply not born here, which is a
// truer answer than teleporting it to the nearest city.
function birth(ctx, inst, quiet) {
  const g = ctx.game;
  if (!g.inst.born) g.inst.born = {};
  if (g.inst.born[inst.id]) return;
  for (const name of inst.origin || []) {
    const p = ctx.prov(name);
    if (!p || p.impassable) continue;
    if (!p.inst || typeof p.inst !== 'object') p.inst = {};
    p.inst[inst.id] = 100;
    // An institution born BEFORE the chapter opened was born in the record,
    // not in the campaign: it gets its birth year from the data, and it does
    // not announce itself to a player who was not alive for it.
    const back = quiet === true;
    g.inst.born[inst.id] = {
      prov: p.name,
      y: back ? inst.from : g.date.y,
      m: back ? 1 : g.date.m,
      faith: p.religion || null, // the world it belongs to, for `resistance`
    };
    if (back) return;
    chronicle(ctx, 'world', inst.name + ' takes hold at ' + p.name + '.');
    try {
      if (ctx.bus) {
        ctx.bus.emit('notify', {
          title: 'A new way of doing things',
          text: inst.name + ' has taken hold at ' + p.name + '. ' + inst.desc,
          type: 'info', provName: p.name,
        });
      }
    } catch (e) { warnOnce('notify', 'birth notice failed', e); }
    return;
  }
  // Nowhere on this map to be born: mark it so we stop looking every month.
  g.inst.born[inst.id] = { prov: null, y: g.date.y, m: g.date.m };
}

// ------------------------------------------------------------------- spread
function devTotal(p) {
  return p && p.dev ? num(p.dev.tax) + num(p.dev.prod) + num(p.dev.mp) : 0;
}

// An institution has a home, and it is the faith-world it was born into.
//
// The first version of this charged resistance at the BORDER between two
// religious worlds, which was wrong in a way that took a test run to see: a
// barrier one province thick is not a barrier. The Greek chancery crossed into
// the Judaean foothills once, slowly, and from there spread through the whole
// hill country at full speed, because every further step was Jewish-to-Jewish.
// A hundred and thirty years of that and Judaea was fully Hellenized before
// the Maccabean chapter opened.
//
// Resistance is a property of the RECEIVING land measured against where the
// thing came from, and it does not wear off because the last village gave in.
// A Jewish province resists the Greek chancery whether it hears of it from
// Alexandria or from the next town over, for the whole length of the chapter,
// until somebody decides otherwise and pays for it.
function faithGroup(ctx, religion) {
  const R = ctx.DEFINES.RELIGIONS || {};
  return religion && R[religion] ? R[religion].group : null;
}
// WHICH institutions a faith-world resists is authored, not derived. The first
// version derived it — anything born outside your religious group met the
// wall — and it produced a 1948 Israel that could not adopt Industry or the
// National Idea because they were invented by Christians, which is not a
// subtle mistake. Coined money, gunpowder, a general staff and a factory are
// not confessional questions and nobody in any century treated them as such.
//
// The ones that ARE confessional questions are named in the data: the Greek
// chancery, the established faith of somebody else's church, the polis, the
// diwan, Roman law. Those are the arrangements that carry a whole way of
// living inside them, which is why refusing them was a thing people did.
function isAlien(ctx, inst, q) {
  if (!inst.alien) return false;
  const b = ctx.game.inst && ctx.game.inst.born && ctx.game.inst.born[inst.id];
  if (!b || !b.faith) return false;
  if (!q.religion || q.religion === b.faith) return false;
  const home = faithGroup(ctx, b.faith);
  const here = faithGroup(ctx, q.religion);
  return !(home && here && home === here);
}

// AND — this is the part a rate multiplier could never express — alien ground
// has a CEILING, not merely a slower climb. Any multiplier, however small,
// converges given a century, and a century is what these chapters have: at
// 0.12 the Greek chancery still saturated the Judaean hill country before 167
// BCE opened, which is the same wrong answer arrived at more slowly.
//
// What actually happened is that it reached the coastal cities and the court
// and stopped. So an alien province tops out below the threshold that counts
// as "present", and the only two things that carry it past are the two things
// that carried it past historically: somebody pays to school the place
// (`promoteCore`), or the state itself adopts the thing, after which its own
// administration propagates it and the ceiling comes off.
//
// The consequence worth naming, because it is the best thing in this file:
// a Hasmonean Judaea that conquers the Greek coast INHERITS the chancery, at
// 100, in the cities that already had it. Taking Joppa and Ptolemais is how
// you stop being behind — and it is exactly how the Hasmoneans stopped being
// behind. Nobody authored that; it falls out of the rule.
function ceilingFor(ctx, inst, q) {
  if (!isAlien(ctx, inst, q)) return 100;
  const owner = q.owner ? ctx.game.tags[q.owner] : null;
  if (owner && Array.isArray(owner.embraced) && owner.embraced.indexOf(inst.id) >= 0) return 100;
  return Number.isFinite(inst.alien && inst.alien.cap) ? inst.alien.cap : INST.alienCap;
}
function alienRate(inst) {
  return Number.isFinite(inst.alien && inst.alien.mult) ? inst.alien.mult : INST.alienMult;
}

// The routes are edges too, and long ones. This is the difference between an
// institution that has to walk from Roma to Jerusalem province by province —
// fifteen cells at roughly five years a cell, which is longer than most of the
// chapters last — and one that arrives with the grain fleet, which is how the
// Greek chancery actually reached Judaea. Built once per campaign and cached
// on the game, because the routes do not move.
function tradeEdges(ctx) {
  const g = ctx.game;
  if (g.inst && Array.isArray(g.inst._tradeEdges)) return g.inst._tradeEdges;
  const edges = [];
  try {
    for (const route of TRADE_ROUTES || []) {
      const stops = (route && route.stops) || [];
      for (let i = 0; i + 1 < stops.length; i++) {
        const a = ctx.provId(stops[i]);
        const b = ctx.provId(stops[i + 1]);
        if (a && b && a !== b) edges.push([a, b]);
      }
    }
  } catch (e) { warnOnce('trade', 'trade edge build failed', e); }
  if (g.inst) g.inst._tradeEdges = edges;
  return edges;
}

// How much of the map already has it. An arrangement that everyone around you
// uses arrives faster than one two cities have heard of — this is the S-curve
// every diffusion has, and without it the tail of the spread takes centuries.
function worldShare(ctx, id) {
  const g = ctx.game;
  let have = 0;
  let all = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    all++;
    if (num(p.inst && p.inst[id]) >= INST.presentAt) have++;
  }
  return all > 0 ? have / all : 0;
}

// `scale` runs several months of spread in one pass. Only the pre-spread uses
// it (six months at a time over as much as sixty years is a few hundred passes
// instead of a few thousand, and the difference in the result is under a
// percent); the live monthly call always passes 1.
function spreadOnce(ctx, inst, scale) {
  const g = ctx.game;
  const gain = new Map();
  const step = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const momentum = (1 + worldShare(ctx, inst.id) * INST.momentum) * step;
  const push = (from, toId, mult) => {
    const q = g.provinces[toId];
    if (!q || q.impassable) return;
    const cap = ceilingFor(ctx, inst, q);
    if (num(q.inst && q.inst[inst.id]) >= cap) return;
    let rate = num(inst.spread, 0.8) * momentum * mult;
    // Inside one realm an arrangement travels on the government's own roads.
    if (from.owner && q.owner === from.owner) rate *= INST.sameOwnerMult;
    // And it settles first where there is enough of a town to hold it.
    rate *= 1 + devTotal(q) * INST.richMult;
    // …and it crawls in another faith's world before it stops there.
    if (isAlien(ctx, inst, q)) rate *= alienRate(inst);
    // Contributions SUM: a province with four converted neighbours converts
    // four times as fast, which is what a wavefront closing on a pocket looks
    // like. Capped so a well-connected cell cannot convert in a single month.
    gain.set(toId, Math.min(INST.maxMonthly * step, num(gain.get(toId)) + rate));
  };
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (num(p.inst && p.inst[inst.id]) < INST.presentAt) continue;
    const adj = ctx.geom && ctx.geom.neighbors ? ctx.geom.neighbors[p.id] : null;
    if (!adj) continue;
    for (const nid of adj) push(p, nid, 1);
  }
  for (const [a, b] of tradeEdges(ctx)) {
    const pa = g.provinces[a];
    const pb = g.provinces[b];
    if (!pa || !pb) continue;
    if (num(pa.inst && pa.inst[inst.id]) >= INST.presentAt) push(pa, b, INST.tradeMult);
    if (num(pb.inst && pb.inst[inst.id]) >= INST.presentAt) push(pb, a, INST.tradeMult);
  }
  for (const [nid, rate] of gain) {
    const q = g.provinces[nid];
    if (!q.inst || typeof q.inst !== 'object') q.inst = {};
    q.inst[inst.id] = clamp(num(q.inst[inst.id]) + rate, 0, ceilingFor(ctx, inst, q));
  }
}

// ------------------------------------------------------------------ the read
//
// What share of a realm's development has this institution.
export function institutionShare(ctx, tag, id) {
  const g = ctx.game;
  let have = 0;
  let all = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    const d = Math.max(1, devTotal(p));
    all += d;
    if (num(p.inst && p.inst[id]) >= INST.presentAt) have += d;
  }
  return all > 0 ? have / all : 0;
}

export function hasEmbraced(ctx, tag, id) {
  const t = ctx.game.tags[livingTag(ctx, tag)];
  return !!(t && Array.isArray(t.embraced) && t.embraced.indexOf(id) >= 0);
}

// The number the tech price multiplies by. One per realm, recomputed on demand
// — it walks the province list once per live institution, which at eleven
// institutions and 307 provinces is cheap enough to call from a panel.
export function institutionMult(ctx, tag) {
  try {
    ensureInstitutions(ctx);
    const live = liveInstitutions(ctx);
    let behind = 0;
    for (const inst of live) {
      if (!born(ctx, inst)) continue;
      // An institution nobody in the world has yet costs nobody anything.
      const b = ctx.game.inst && ctx.game.inst.born && ctx.game.inst.born[inst.id];
      if (!b || !b.prov) continue;
      if (!hasEmbraced(ctx, tag, inst.id)) behind++;
    }
    return clamp(1 + behind * INST.penaltyPer, 1, 1 + INST.penaltyMax);
  } catch (e) { warnOnce('mult:' + tag, 'institutionMult failed', e); return 1; }
}

// ------------------------------------------------------------------ embracing
export function embraceInfo(ctx, tag, id) {
  const inst = institutionById(id);
  const out = {
    id,
    name: inst ? inst.name : id,
    desc: inst ? inst.desc : '',
    share: 0,
    need: INST.embraceShare,
    embraced: false,
    present: false,
    cost: inst ? (inst.embrace || {}) : {},
    can: false,
    whyNot: '',
  };
  try {
    if (!inst) { out.whyNot = 'No such institution.'; return out; }
    const g = ctx.game;
    const t = g.tags[livingTag(ctx, tag)];
    if (!t || !t.alive) { out.whyNot = 'There is no such realm.'; return out; }
    ensureInstitutions(ctx);
    out.embraced = hasEmbraced(ctx, tag, id);
    const b = g.inst.born && g.inst.born[id];
    out.present = !!(b && b.prov);
    out.share = institutionShare(ctx, tag, id);
    if (out.embraced) { out.whyNot = 'We have already taken it up.'; return out; }
    if (!out.present) { out.whyNot = 'Nobody in the world does this yet.'; return out; }
    if (out.share < INST.embraceShare) {
      out.whyNot = 'Too little of the realm knows it yet ('
        + Math.round(out.share * 100) + '% of ' + Math.round(INST.embraceShare * 100) + '% needed).';
      return out;
    }
    const c = out.cost;
    if (Number.isFinite(c.gov) && num(t.points.gov) < c.gov) { out.whyNot = 'Not enough governance points (' + c.gov + ' required).'; return out; }
    if (Number.isFinite(c.infl) && num(t.points.infl) < c.infl) { out.whyNot = 'Not enough influence points (' + c.infl + ' required).'; return out; }
    if (Number.isFinite(c.mar) && num(t.points.mar) < c.mar) { out.whyNot = 'Not enough martial points (' + c.mar + ' required).'; return out; }
    if (Number.isFinite(c.treasury) && num(t.treasury) < c.treasury) { out.whyNot = 'The treasury cannot spare ' + c.treasury + ' talents.'; return out; }
    out.can = true;
    return out;
  } catch (e) { warnOnce('info:' + id, 'embraceInfo failed', e); out.whyNot = 'The question is confused.'; return out; }
}

// Move the estates. The SAME id list reaches the player's authored estates and
// the generated foreign courts, and both fail soft on ids they do not seat —
// so `chancery` can name the Hasideans, the Pharisees, the Sages, the Church
// and the Demes in one table and be correct in whichever chapter is running.
function moveTheRoom(ctx, tag, inst) {
  const shifts = inst.factions || {};
  const g = ctx.game;
  for (const [fid, d] of Object.entries(shifts)) {
    if (!Number.isFinite(d)) continue;
    if (tag === g.playerTag) {
      try { shiftFaction(ctx, tag, fid, d); } catch (e) { warnOnce('sf:' + fid, 'faction shift failed', e); }
    } else if (courtSeats(ctx, tag)) {
      try { shiftCourt(ctx, tag, fid, d); } catch (e) { warnOnce('sc:' + fid, 'court shift failed', e); }
    }
  }
}

export function embraceCore(ctx, tag, id) {
  const info = embraceInfo(ctx, tag, id);
  if (!info.can) return { ok: false, why: info.whyNot };
  const g = ctx.game;
  const live = livingTag(ctx, tag);
  const t = g.tags[live];
  const inst = institutionById(id);
  const c = inst.embrace || {};
  if (Number.isFinite(c.gov)) t.points.gov = Math.max(0, num(t.points.gov) - c.gov);
  if (Number.isFinite(c.infl)) t.points.infl = Math.max(0, num(t.points.infl) - c.infl);
  if (Number.isFinite(c.mar)) t.points.mar = Math.max(0, num(t.points.mar) - c.mar);
  if (Number.isFinite(c.treasury)) t.treasury = num(t.treasury) - c.treasury;
  if (!Array.isArray(t.embraced)) t.embraced = [];
  t.embraced.push(id);
  // AN INSTITUTION IS NOT A BONUS. It grants no modifier, and the first draft
  // of this file — which granted three to nine permanent multiplicative buffs
  // to every court on the map the moment the campaign seeded — was caught by
  // the balance harness in a single run: the 167 chapter went from a clean
  // sheet to an all-AI Hasmonean Judaea tripling its size in eight years, and
  // the bisect put the whole change on the modifiers rather than on the price.
  //
  // The right shape was always the simpler one. What embracing buys is that
  // you stop paying MORE for technology than the world does. That is a real,
  // legible, sufficient reward — the whole point of the system is that being
  // behind is expensive, not that being ahead is a stat line — and it means
  // this file cannot quietly re-tune eight chapters that were balanced without
  // it. The only other thing embracing does is move the estates, which is the
  // argument it exists to give teeth to.
  moveTheRoom(ctx, live, inst);
  chronicle(ctx, 'world', (t.name || live) + ' takes up ' + inst.name + '.');
  return { ok: true, name: inst.name, id };
}

// ------------------------------------------------------- the catch-up lever
//
// Being behind because of where you are is only half a mechanic; the other
// half is that catching up has to be something you DO. Send for the teachers:
// pay influence and gold to school one province you own, three times to carry
// it the whole way. It is the only way a hill kingdom whose faith-world the
// institution does not belong to ever reaches the 35% that lets it embrace —
// and it is deliberately expensive per province, so a large realm pays a large
// bill for a decision a small one can make cheaply.
export function promoteInfo(ctx, tag, provName, id) {
  const P = INST.promote;
  const out = { id, prov: provName, infl: P.infl, gold: P.treasury, progress: P.progress, can: false, whyNot: '', at: 0 };
  try {
    const inst = institutionById(id);
    if (!inst) { out.whyNot = 'No such institution.'; return out; }
    ensureInstitutions(ctx);
    const g = ctx.game;
    const t = g.tags[livingTag(ctx, tag)];
    const p = ctx.prov(provName);
    if (!t || !p) { out.whyNot = 'No such province.'; return out; }
    if (p.owner !== t.tag) { out.whyNot = 'We do not rule ' + p.name + '.'; return out; }
    const b = g.inst.born && g.inst.born[id];
    if (!b || !b.prov) { out.whyNot = 'Nobody in the world does this yet.'; return out; }
    out.at = Math.round(num(p.inst && p.inst[id]));
    if (out.at >= 100) { out.whyNot = p.name + ' knows it as well as anywhere.'; return out; }
    const key = 'inst:' + id + ':' + p.id;
    if (diploCdActive(ctx, key)) { out.whyNot = 'The teachers have only just arrived (' + diploCdMonthsLeft(ctx, key) + ' months).'; return out; }
    if (num(t.points.infl) < P.infl) { out.whyNot = 'Not enough influence points (' + P.infl + ' required).'; return out; }
    if (num(t.treasury) < P.treasury) { out.whyNot = 'The treasury cannot spare ' + P.treasury + ' talents.'; return out; }
    out.can = true;
    return out;
  } catch (e) { warnOnce('promoteInfo', 'promoteInfo failed', e); out.whyNot = 'The question is confused.'; return out; }
}

export function promoteCore(ctx, tag, provName, id) {
  const info = promoteInfo(ctx, tag, provName, id);
  if (!info.can) return { ok: false, why: info.whyNot };
  const P = INST.promote;
  const t = ctx.game.tags[livingTag(ctx, tag)];
  const p = ctx.prov(provName);
  t.points.infl = Math.max(0, num(t.points.infl) - P.infl);
  t.treasury = num(t.treasury) - P.treasury;
  if (!p.inst || typeof p.inst !== 'object') p.inst = {};
  p.inst[id] = clamp(num(p.inst[id]) + P.progress, 0, 100);
  setDiploCd(ctx, 'inst:' + id + ':' + p.id, P.cooldownMonths);
  return { ok: true, prov: p.name, id, at: Math.round(p.inst[id]), name: (institutionById(id) || {}).name || id };
}

// The panel's read: every live institution, where it stands here, and whether
// it can be taken up — plus what refusing all of them currently costs.
export function institutionsReport(ctx, tag) {
  try {
    ensureInstitutions(ctx);
    const g = ctx.game;
    const rows = liveInstitutions(ctx).map((inst) => {
      const b = g.inst.born && g.inst.born[inst.id];
      const info = embraceInfo(ctx, tag, inst.id);
      return {
        id: inst.id,
        name: inst.name,
        desc: inst.desc,
        from: inst.from,
        bornAt: b && b.prov ? b.prov : null,
        bornYear: b && b.prov ? b.y : null,
        share: Math.round(info.share * 100),
        need: Math.round(INST.embraceShare * 100),
        embraced: info.embraced,
        present: info.present,
        cost: info.cost,
        can: info.can,
        whyNot: info.whyNot,
      };
    });
    const mult = institutionMult(ctx, tag);
    return {
      rows,
      mult,
      penaltyPct: Math.round((mult - 1) * 100),
      behind: rows.filter((r) => r.present && !r.embraced).length,
    };
  } catch (e) { warnOnce('report', 'institutionsReport failed', e); return { rows: [], mult: 1, penaltyPct: 0, behind: 0 }; }
}

// ------------------------------------------------------------------- monthly
//
// The AI embraces on sight, as soon as it can pay — a court does not agonise
// about the Greek chancery for forty years the way a player may. Its estates
// still move for it (SPEC §163), so a foreign court that adopts the chancery
// pays for it in exactly the currency the player would.
export function monthlyInstitutions(ctx) {
  const g = ctx.game;
  if (!g || !g.provinces) return;
  ensureInstitutions(ctx);
  const live = liveInstitutions(ctx);
  for (const inst of live) {
    if (!born(ctx, inst)) continue;
    birth(ctx, inst);
    const b = g.inst.born && g.inst.born[inst.id];
    if (!b || !b.prov) continue;
    spreadOnce(ctx, inst);
  }
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || t.ai !== true || tag === 'REB' || tag === 'WASTE') continue;
    for (const inst of live) {
      if (hasEmbraced(ctx, tag, inst.id)) continue;
      const info = embraceInfo(ctx, tag, inst.id);
      if (info.can) { try { embraceCore(ctx, tag, inst.id); } catch (e) { warnOnce('ai:' + inst.id, 'AI embrace failed', e); } }
    }
  }
}
