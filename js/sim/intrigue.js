// Judaea Universalis — paying into somebody else's politics (SPEC §164). DOM-free.
//
// Open gifts to foreign court parties remain ordinary diplomacy. Offensive
// intrigue and claimants now use national paths (SPEC §314); old commands
// return a refusal without spending resources or advancing the RNG.

import {
  num, chronicle, addOpinion, livingTag,
  setDiploCd, diploCdActive, diploCdMonthsLeft,
} from './military.js';
import { courtSeats, courtApproval, shiftCourt } from './courts.js';
import { standingOf } from './standing.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/intrigue]', ...args);
}

// Prices are in the same currencies the rest of the diplomacy layer spends:
// influence points for the operation, talents for the bribe itself. A claim
// fabrication is 30 influence and four months (SPEC §75); these sit around it
// deliberately, so no single operation is obviously the best thing to do with
// a point pool.
export const INTRIGUE = {
  patronize: {
    id: 'patronize',
    name: 'Pay into their court',
    infl: 20,
    gold: 40,
    shift: 8,
    cooldownMonths: 24,
    // Nobody is scandalised by a foreign king's gift to a party at court; that
    // is what gifts are. A small warming, and no risk worth pricing.
    detect: 0,
    warmth: 5,
  },

};

// ------------------------------------------------------------------- reach
//
// Can our agents get there at all. Adjacency is walked once per call over the
// province list, which is the same cost the peace table pays to decide what
// may be demanded (SPEC §116) — a demand has to be somewhere, and so does a
// bribe.
function hasReach(ctx, tag, target) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t) return false;
  if ((t.atWarWith || []).includes(target)) return true;
  if ((t.allies || []).includes(target)) return true;
  if (t.overlord === target) return true;
  const o = g.tags[target];
  if (o && o.overlord === tag) return true;
  // A shared border anywhere on the map.
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    const adj = ctx.geom && ctx.geom.neighbors ? ctx.geom.neighbors[p.id] : null;
    if (!adj) continue;
    for (const nid of adj) {
      const q = g.provinces[nid];
      if (q && q.owner === target) return true;
    }
  }
  return false;
}

// Everyone has heard of the biggest court in the room, and everyone's cousin
// knows somebody in it. Standing (SPEC §165) decides who that is; where the
// standing table has not been computed yet this falls back to province count,
// so the module works standalone and the two agree once both are running.
function isWellKnown(ctx, target) {
  const g = ctx.game;
  const known = standingOf(ctx, target);
  if (known) return !!known.isPower;
  let mine = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === target) mine++;
  }
  return mine >= 8;
}

// Per ACTOR as well as per channel and target (SPEC §216): two courts run
// their own agents, and at a table with two Jewish states one crown's
// operation used to go cold on the other's.
function cdKey(actor, kind, target) { return actor + '>intrigue:' + kind + ':' + target; }

// ------------------------------------------------------------------- the read
//
// One function the panel and the click path both call, so a disabled button's
// tooltip and the refusal it would have produced can never disagree. Same
// contract as `claimFabricationInfo` (SPEC §75).
export function intrigueInfo(ctx, tag, target, kind, fid) {
  const g = ctx.game;
  const spec = INTRIGUE[kind];
  const out = {
    kind, target, fid,
    name: spec ? spec.name : kind,
    infl: spec ? spec.infl : 0,
    gold: spec ? spec.gold : 0,
    detect: spec ? spec.detect : 0,
    can: false,
    whyNot: '',
  };
  try {
    if (kind === 'subvert' || kind === 'pretender') {
      out.whyNot = kind === 'subvert' ? 'Develop a provincial network in Ideas → Subversion.'
        : 'Shelter a named claimant in Ideas → Dynastic Ambition.';
      return out;
    }
    if (!spec) { out.whyNot = 'No such operation.'; return out; }
    const live = livingTag(ctx, target);
    const t = g.tags[tag];
    const o = g.tags[live];
    if (!t || !o || !o.alive) { out.whyNot = 'There is no such court any more.'; return out; }
    if (live === tag) { out.whyNot = 'We do not need agents in our own court.'; return out; }
    if (live === 'REB') { out.whyNot = 'Rebels keep no court to pay into.'; return out; }
    const seats = courtSeats(ctx, live);
    if (!seats) { out.whyNot = 'That realm is too small to have a court worth buying.'; return out; }
    if (kind !== 'pretender') {
      if (!fid || !seats.some((d) => d && d.id === fid)) {
        out.whyNot = 'No such party sits at that court.';
        return out;
      }
      const app = courtApproval(ctx, live, fid);
      if (kind === 'patronize' && app !== null && app >= 100) { out.whyNot = 'They could not be more with us than they are.'; return out; }
      if (kind === 'subvert' && app !== null && app <= 0) { out.whyNot = 'That party is already on the floor.'; return out; }
    }
    if (!hasReach(ctx, tag, live) && !isWellKnown(ctx, live)) {
      out.whyNot = 'Our agents have no way into ' + ((o.name) || live) + ' — no border, no war, no treaty.';
      return out;
    }
    if (diploCdActive(ctx, cdKey(tag, kind, live))) {
      out.whyNot = 'That channel is cold (' + diploCdMonthsLeft(ctx, cdKey(tag, kind, live)) + ' months).';
      return out;
    }
    if (num(t.points && t.points.infl) < spec.infl) { out.whyNot = 'Not enough influence points (' + spec.infl + ' required).'; return out; }
    if (num(t.treasury) < spec.gold) { out.whyNot = 'The treasury cannot spare ' + spec.gold + ' talents.'; return out; }
    out.can = true;
    return out;
  } catch (e) { warnOnce('info', 'intrigueInfo failed', e); out.whyNot = 'The channel is confused.'; return out; }
}

// ------------------------------------------------------------------- the act
export function runIntrigue(ctx, tag, target, kind, fid) {
  const info = intrigueInfo(ctx, tag, target, kind, fid);
  if (!info.can) return { ok: false, why: info.whyNot };
  const g = ctx.game;
  const spec = INTRIGUE[kind];
  const live = livingTag(ctx, target);
  const t = g.tags[tag];
  const o = g.tags[live];
  const oname = (o && o.name) || live;
  t.points.infl = num(t.points.infl) - spec.infl;
  t.treasury = num(t.treasury) - spec.gold;
  setDiploCd(ctx, cdKey(tag, kind, live), spec.cooldownMonths);

  const seats = courtSeats(ctx, live) || [];
  const def = seats.find((d) => d && d.id === fid);
  const pname = def ? def.name : 'the court';

  if (kind === 'patronize') {
    shiftCourt(ctx, live, fid, spec.shift);
    addOpinion(ctx, live, tag, spec.warmth);
    chronicle(ctx, 'politics', 'Silver to ' + pname + ' at ' + oname + '. (+' + spec.shift + ' to their standing)');
    return { ok: true, kind, target: live, party: pname, shift: spec.shift, caught: false };
  }
}

// The panel's read: every operation available against one foreign court, with
// its price and its refusal already resolved, plus the parties to aim at.
export function intrigueMenu(ctx, tag, target) {
  try {
    const live = livingTag(ctx, target);
    const seats = courtSeats(ctx, live);
    if (!seats) return null;
    const parties = seats.filter((d) => d && d.id).map((d) => {
      const app = courtApproval(ctx, live, d.id);
      return {
        id: d.id,
        name: d.name || d.id,
        // Rounded at the panel boundary, not in the store: the drift needs the
        // fraction and the reader never does.
        approval: app === null ? null : Math.round(app),
      };
    });
    const first = parties.length ? parties[0].id : null;
    return {
      target: live,
      parties,
      ops: ['patronize'].map((kind) => {
        const probe = intrigueInfo(ctx, tag, live, kind, first);
        return {
          kind,
          name: INTRIGUE[kind].name,
          infl: INTRIGUE[kind].infl,
          gold: INTRIGUE[kind].gold,
          detect: INTRIGUE[kind].detect,
          // A per-party check still runs at click time; this is the shape of
          // the refusal that does not depend on which party is picked.
          can: probe.can,
          whyNot: probe.whyNot,
        };
      }),
    };
  } catch (e) { warnOnce('menu', 'intrigueMenu failed', e); return null; }
}
