// Judaea Universalis — paying into somebody else's politics (SPEC §164). DOM-free.
//
// WHY THIS FILE EXISTS. The diplomacy a player could do to a foreign court was
// a closed list: subsidise it, guarantee it, name it a rival, league against
// it, take it as a client, or fight it. Every one of those is a transaction
// between two courts conducted in daylight between the two rulers. None of
// them reaches INSIDE the other court.
//
// Which is a strange hole for this period specifically, because reaching
// inside somebody else's court is most of what actually happened in it. The
// Pharisee rebels invited Demetrius III to invade their own country. Antipater
// ran Hyrcanus like a hand puppet for twenty years. Both Hasmonean brothers
// sent money to Rome and the legate Scaurus took four hundred talents from one
// of them. Herod bought a Senate. Every one of those is in this game already —
// as a scripted card, fired on a date, with the player watching. The verbs
// existed in the fiction and not in the hands.
//
// So: three operations, priced in influence and gold, aimed at a named party
// in a named foreign court (SPEC §163 gave every court parties to aim at).
//
//   PATRONIZE  raise a party. The cheap, open, deniable one. Nobody minds very
//              much; their court warms to you slightly. This is how you buy a
//              friendly neighbour without a treaty.
//   SUBVERT    lower a party. This is the one that matters, because §163's
//              pressure clock counts hostile parties — so a court you have
//              been paying against for a decade reverses its policy, then loses
//              its ruler, then loses a province, then comes apart. You did that.
//              It can be traced back to you, and when it is, it is expensive.
//   PRETENDER  back a claimant. Not a nudge — an intervention. It opens the
//              §98 succession crisis at the stage where the houses married into
//              theirs discover an interest in their constitution, and where the
//              throne is already weak it puts a banner in the field. Caught
//              doing this, you are not a rival; you are an enemy.
//
// TWO RULES THE WHOLE FILE OBEYS.
//
// First, you cannot reach a court you have no way of reaching. Adjacency, a
// war, an alliance, or the target being a power everyone has heard of — one of
// those, or your agents have nowhere to walk. A landlocked Judaea does not run
// operations in Britain.
//
// Second, this is the PLAYER's verb. The AI does not run intrigue against the
// player or against each other, for the same reason it does not raise punitive
// coalitions (SPEC §59): an unseen system that quietly wrecks your court is not
// a game mechanic, it is a bug report. What the AI gets instead is §163 —
// courts that come apart on their own, honestly, whether or not anybody paid.

import {
  num, clamp, chronicle, addOpinion, tagDef, livingTag,
  setDiploCd, diploCdActive, diploCdMonthsLeft,
} from './military.js';
import { raiseCrisisTo } from './crisis.js';
import { courtSeats, courtApproval, shiftCourt, ensureCourt, COURT } from './courts.js';
import { standingOf } from './standing.js';
import { fireRevolt } from './unrest.js';

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
  subvert: {
    id: 'subvert',
    name: 'Pay against them',
    infl: 35,
    gold: 60,
    shift: -10,
    cooldownMonths: 24,
    detect: 0.35,
    opinionHit: -25,
    infamy: 2,
  },
  pretender: {
    id: 'pretender',
    name: 'Back a claimant',
    infl: 60,
    gold: 150,
    cooldownMonths: 120,
    detect: 0.5,
    opinionHit: -50,
    infamy: 5,
    crisisTo: 70,
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

// Discovery. A single roll at the moment of the act — the period's own
// standard of tradecraft, which is to say a letter is intercepted or it is not.
function caught(ctx, spec) {
  if (!spec.detect) return false;
  try { return ctx.rng.chance(spec.detect); }
  catch (e) { warnOnce('roll', 'detection roll failed', e); return false; }
}

function exposure(ctx, tag, target, spec, what) {
  const g = ctx.game;
  const t = g.tags[tag];
  const o = g.tags[target];
  addOpinion(ctx, target, tag, spec.opinionHit);
  t.aggression = num(t.aggression) + num(spec.infamy);
  chronicle(ctx, 'politics',
    ((o && o.name) || target) + ' has our letters: ' + what + ' (opinion '
    + spec.opinionHit + ', infamy +' + spec.infamy + ')');
  try {
    if (ctx.bus) {
      ctx.bus.emit('notify', {
        title: 'Our hand is seen',
        text: ((o && o.name) || target) + ' has the correspondence. ' + what,
        type: 'bad',
      });
    }
  } catch (e) { warnOnce('notify', 'exposure notice failed', e); }
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

  if (kind === 'subvert') {
    shiftCourt(ctx, live, fid, spec.shift);
    const seen = caught(ctx, spec);
    if (seen) exposure(ctx, tag, live, spec, 'we were paying against ' + pname + '.');
    else chronicle(ctx, 'politics', 'Our money is working against ' + pname + ' at ' + oname + '. (' + spec.shift + ' to their standing)');
    return { ok: true, kind, target: live, party: pname, shift: spec.shift, caught: seen };
  }

  // pretender: the succession question is opened whether or not a banner goes
  // up, because that is what backing a claimant DOES — it turns a settled
  // house into a disputed one, and every court married into it notices.
  try { raiseCrisisTo(ctx, live, 'succession', spec.crisisTo); } catch (e) { warnOnce('crisis', 'pretender crisis failed', e); }
  o.legitimacy = clamp(num(o.legitimacy, 50) - 15, 0, 100);
  let raised = false;
  // A banner only goes up where the ground will hold one: a weak throne and a
  // province unhappy enough to raise men. The ordinary rising machinery
  // classifies it, so what appears may be a pretender, a separatist band or a
  // religious rising — whichever that province was actually going to produce.
  if (num(o.legitimacy, 50) < 55 || num(o.stability) < 1) {
    const capital = tagDef(ctx, live).capital || null;
    let best = null;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== live) continue;
      if (capital && p.name === capital) continue;
      if (p.controller && p.controller !== live) continue;
      if (!best || num(p.unrest) > num(best.unrest)) best = p;
    }
    if (best) { try { raised = !!fireRevolt(ctx, best); } catch (e) { warnOnce('rise', 'pretender rising failed', e); } }
  }
  // The court itself learns that the throne is disputed, whoever wins.
  try {
    const table = ensureCourt(ctx, live);
    if (table && table.f) {
      for (const k of Object.keys(table.f)) table.f[k] = clamp(num(table.f[k], 50) - 6, 0, 100);
      table.pressure = num(table.pressure) + COURT.reversalAt * 0.5;
    }
  } catch (e) { warnOnce('court', 'pretender court shock failed', e); }
  const seen = caught(ctx, spec);
  if (seen) exposure(ctx, tag, live, spec, 'the claimant was ours.');
  else chronicle(ctx, 'politics', 'A claimant to ' + oname + ' has found a purse, and nobody knows whose.');
  return { ok: true, kind, target: live, raised, caught: seen };
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
      ops: ['patronize', 'subvert', 'pretender'].map((kind) => {
        const probe = intrigueInfo(ctx, tag, live, kind, kind === 'pretender' ? null : first);
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
