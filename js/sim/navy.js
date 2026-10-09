// js/sim/navy.js — fleets, sea transport, blockades, sea battles (SPEC §20).
// DOM-free. Fleets live in g.fleets keyed by id and ride at the offshore
// anchor of a coastal province (fleet.prov). Movement is port-to-port across
// open water (straight line — the Mediterranean has no walls). Each ship
// carries 1000 men. Armies aboard (a.aboard=true) are out of land play.

import { num, clamp, isHostile, sameSide, armiesInProv, resolveTagMult, rollGeneral, hasBuilding, opinionOf, devTotal, ceasefireHolds } from './military.js';
import { unlockedGen, cappedGen, genMult, navalGenName, MODERNIZE_COST_PER_SHIP_PER_GEN } from '../data/tech.js';
import { queueUnitRecruitment } from './recruitment.js';
// Mare clausum (SPEC §272): from the early rain to the latter rain the
// ancient Mediterranean was shut, and the grain fleets waited for March.
import { seasonSeaFactor } from './seasons.js';

const SHIP_COST = 30;        // talents to lay down a hull
const SHIP_UPKEEP = 0.5;     // talents per ship per month
const SEA_PX_PER_DAY = 34;   // fleets are faster than legions
const CAPACITY = 1000;       // men per ship
const MERCHANT_PX_PER_DAY = 22;           // round-bellied tubs sail slower than war fleets

const warned = new Set();
function warnOnce(key, ...msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[sim/navy]', ...msg);
}

export function isCoastal(ctx, provId) {
  if (ctx.geom && Array.isArray(ctx.geom.coastal)) return !!ctx.geom.coastal[provId];
  const p = ctx.byId(provId);
  return !!p && p.terrain === 'coast';
}

function anchor(ctx, provId) {
  const off = ctx.geom && ctx.geom.offshore && ctx.geom.offshore[provId];
  return off || (ctx.geom.centroids && ctx.geom.centroids[provId]) || { x: 0, y: 0 };
}

export function seaHopDays(ctx, fromId, toId) {
  const a = anchor(ctx, fromId), b = anchor(ctx, toId);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  // The winter sea (SPEC §272). Vegetius puts the close at 11 November and
  // the open at 10 March, and what it meant in practice was not that nobody
  // sailed but that sailing cost you: hugging the coast, waiting out weeks in
  // harbour, and arriving when you arrived. A crossing that takes a fortnight
  // in Nisan takes well over a month in Tevet — which is the whole reason a
  // winter invasion from over the sea is a different proposition from a
  // spring one. Steam ends it: by 1900 the factor is 1.
  //
  // The SUMMER voyage is clamped first, at the 30 days it was always clamped
  // at, and only then does the winter stretch it. Applying the season before
  // the old ceiling would have quietly lengthened the longest fair-weather
  // crossings on the map as well, which is not what a winter is.
  const open = clamp(Math.round(2 + dist / SEA_PX_PER_DAY), 2, 30);
  return clamp(Math.round(open * seaSeasonFactor(ctx)), 2, 90);
}
// One call site's worth of guard: a fleet must still be able to move at all
// if a future atlas ships a date the season table cannot read.
function seaSeasonFactor(ctx) {
  const f = seasonSeaFactor(ctx);
  return Number.isFinite(f) && f >= 1 ? f : 1;
}

export function fleetsOf(ctx, tag) {
  return Object.values(ctx.game.fleets || {}).filter((f) => f && f.tag === tag);
}
export function fleetsAt(ctx, provId) {
  return Object.values(ctx.game.fleets || {}).filter((f) => f && f.prov === provId && f.ships > 0);
}

// A hostile fleet riding off a port blockades it: sieges bite harder, the
// harbor earns nothing (economy + trade consult this).
export function blockadedBy(ctx, provId) {
  const p = ctx.byId(provId);
  if (!p || !isCoastal(ctx, provId)) return null;
  for (const f of fleetsAt(ctx, provId)) {
    if (isHostile(ctx, f.tag, p.controller)) return f.tag;
  }
  return null;
}

export function buildShipCore(ctx, tag, provId) {
  const g = ctx.game;
  const t = g.tags[tag];
  const p = ctx.byId(provId);
  if (!t || !p) return { ok: false, why: 'invalid province' };
  if (!isCoastal(ctx, provId)) return { ok: false, why: 'not a port — the sea is elsewhere' };
  if (p.owner !== tag || p.controller !== tag) return { ok: false, why: 'the harbor is not in our hands' };
  if (!hasBuilding(p, 'shipyard')) return { ok: false, why: 'build a shipyard before laying down warships' };
  if (num(t.treasury) < SHIP_COST) return { ok: false, why: 'a hull costs ' + SHIP_COST + ' talents' };
  t.treasury = num(t.treasury) - SHIP_COST;
  const queued = queueUnitRecruitment(ctx, tag, provId, 'ship', {
    cost: SHIP_COST,
    gen: navalGen(ctx, tag), // the pattern the hull is laid down to (SPEC §31)
  });
  return queued ? { ok: true, queued } : { ok: false, why: 'the hull could not be scheduled' };
}

// ---- merchant ships at sea (SPEC §58, §292) ---------------------------------
// The merchant marine of §58 (hulls at their shipyards) and the trade runs of
// v6.1 became the merchants of §292 (js/sim/trade.js). What stays here is how
// long a round-bellied merchant ship takes between two harbors: slower than a
// war fleet, and, like a 1st-century grain ship, not held in port by winter.
export function merchantHopDays(ctx, fromId, toId) {
  const a = anchor(ctx, fromId), b = anchor(ctx, toId);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  return clamp(Math.round(2 + dist / MERCHANT_PX_PER_DAY), 2, 45);
}

// ---- eras at sea & the men who command them (SPEC §31) ----------------------
export function navalGen(ctx, tag) {
  const t = ctx.game.tags[tag];
  return cappedGen(num(t && t.tech && t.tech.mar, 0), ctx && ctx.bookmark);
}
export function fleetPowerOf(ctx, fleet) {
  return resolveTagMult(ctx, fleet.tag, 'navalMult') * genMult(num(fleet.gen, 0));
}
export function modernizeFleetInfo(ctx, fleet) {
  const cur = navalGen(ctx, fleet.tag);
  const gen = num(fleet.gen, 0);
  if (gen >= cur) return { can: false, why: 'The fleet already sails the newest pattern.', cost: 0, cur };
  const cost = fleet.ships * MODERNIZE_COST_PER_SHIP_PER_GEN * (cur - gen);
  const t = ctx.game.tags[fleet.tag];
  if (num(t && t.treasury) < cost) return { can: false, why: 'Re-rigging costs ' + cost + ' talents.', cost, cur };
  if (fleet.path && fleet.path.length) return { can: false, why: 'The fleet must ride at anchor to refit.', cost, cur };
  return { can: true, cost, cur };
}
export function modernizeFleetCore(ctx, fleet) {
  const mi = modernizeFleetInfo(ctx, fleet);
  if (!mi.can) return mi;
  const t = ctx.game.tags[fleet.tag];
  t.treasury = num(t.treasury) - mi.cost;
  fleet.gen = mi.cur;
  return { ok: true, cost: mi.cost, name: navalGenName(mi.cur) };
}
export function hireAdmiralCore(ctx, fleet) {
  const t = ctx.game.tags[fleet.tag];
  if (!t) return { ok: false, why: 'no such nation' };
  if (fleet.admiral) return { ok: false, why: 'the fleet already has its admiral' };
  if (num(t.points && t.points.mar) < 50) return { ok: false, why: 'an admiral costs 50 martial points' };
  t.points.mar = num(t.points.mar) - 50;
  fleet.admiral = rollGeneral(ctx, fleet.tag);
  return { ok: true, admiral: fleet.admiral };
}

export function issueFleetMove(ctx, fleet, targetId) {
  // The truce is on the water too (SPEC §261).
  if (ceasefireHolds(ctx)) return false;
  if (!fleet || fleet.ships <= 0) return false;
  if (!isCoastal(ctx, targetId)) return false;
  if (targetId === fleet.prov) { fleet.path = []; fleet.moveDaysLeft = 0; return true; }
  fleet.path = [targetId]; // open water: one direct hop
  fleet.moveDaysLeft = 0;
  return true;
}

export function embarkCore(ctx, fleet, armyId) {
  const g = ctx.game;
  const a = g.armies[armyId];
  if (!fleet || !a) return { ok: false, why: 'no such army' };
  if (a.tag !== fleet.tag && !sameSide(ctx, a.tag, fleet.tag)) return { ok: false, why: 'not our fleet' };
  if (a.prov !== fleet.prov) return { ok: false, why: 'the army is not at the harbor' };
  if (a.inBattle || a.aboard) return { ok: false, why: 'the army cannot board now' };
  const aboardMen = Object.values(g.armies)
    .filter((x) => x && x.aboard === fleet.id)
    .reduce((s, x) => s + num(x.men), 0);
  if (aboardMen + num(a.men) > fleet.ships * CAPACITY) {
    return { ok: false, why: 'not enough hulls — each ship carries ' + CAPACITY + ' men' };
  }
  a.aboard = fleet.id;
  a.path = [];
  a.moveDaysLeft = 0;
  a.retreating = false;
  return { ok: true };
}

export function disembarkCore(ctx, fleet) {
  const g = ctx.game;
  let n = 0;
  for (const a of Object.values(g.armies)) {
    if (!a || a.aboard !== fleet.id) continue;
    a.aboard = null;
    a.prov = fleet.prov;
    n++;
  }
  return n;
}

// Two idle squadrons of one flag riding the same anchor become one command
// (SPEC §82: an invasion built at three yards must sail as a single armada).
// Cargo and the better admiral follow the hulls; the older pattern names the
// merged fleet's broadside (a mixed line fights at its weakest rig).
//
// The hulls a given fleet may take under its command right now: our own, at
// this anchor, riding at it rather than under sail. `completeShip` only adds a
// launch to an idle fleet OF THE SAME PATTERN, so a yard that has been
// re-rigged between two orders leaves two squadrons at one port with no way to
// make them one — which is the whole reason this is a player-facing action and
// not only the invasion planner's private arithmetic.
export function mergeableFleetsAt(ctx, fleet) {
  if (!fleet || fleet.ships <= 0) return [];
  if (fleet.path && fleet.path.length) return [];
  return fleetsAt(ctx, fleet.prov).filter((f) => f && f.id !== fleet.id
    && f.tag === fleet.tag && !(f.path && f.path.length));
}
// …and why not, in the words the outliner prints on a dead button.
export function mergeFleetsInfo(ctx, fleet) {
  if (!fleet || fleet.ships <= 0) return { can: false, count: 0, ships: 0, why: 'No such fleet.' };
  if (fleet.path && fleet.path.length) {
    return { can: false, count: 0, ships: 0, why: 'A fleet under sail takes nothing under its command.' };
  }
  const here = mergeableFleetsAt(ctx, fleet);
  const ships = here.reduce((n, f) => n + num(f.ships), 0);
  if (!here.length) return { can: false, count: 0, ships: 0, why: 'No other squadron of ours rides at this anchor.' };
  return { can: true, count: here.length, ships, why: '' };
}
export function mergeFleetsCore(ctx, fromFleet, intoFleet) {
  const g = ctx.game;
  if (!fromFleet || !intoFleet || fromFleet.id === intoFleet.id) return false;
  if (fromFleet.tag !== intoFleet.tag || fromFleet.prov !== intoFleet.prov) return false;
  if ((fromFleet.path && fromFleet.path.length) || (intoFleet.path && intoFleet.path.length)) return false;
  intoFleet.ships = num(intoFleet.ships) + num(fromFleet.ships);
  intoFleet.gen = Math.min(num(intoFleet.gen, 0), num(fromFleet.gen, 0));
  if (!intoFleet.admiral && fromFleet.admiral) intoFleet.admiral = fromFleet.admiral;
  for (const a of Object.values(g.armies)) {
    if (a && a.aboard === fromFleet.id) a.aboard = intoFleet.id;
  }
  delete g.fleets[fromFleet.id];
  return true;
}

// The weight of broadside a tag (with its side) or its enemies keep afloat —
// the invasion planner's go/no-go arithmetic (SPEC §82).
export function navalStrengthOf(ctx, tag, opts) {
  let s = 0;
  const hostile = !!(opts && opts.hostile);
  const at = opts && Number.isFinite(opts.at) ? opts.at : null;
  for (const f of Object.values(ctx.game.fleets || {})) {
    if (!f || f.ships <= 0) continue;
    if (at !== null && f.prov !== at) continue;
    const mine = f.tag === tag || sameSide(ctx, tag, f.tag);
    if (hostile ? !isHostile(ctx, tag, f.tag) : !mine) continue;
    s += f.ships * fleetPowerOf(ctx, f);
  }
  return s;
}

// Daily: fleets sail, cargo follows, rival squadrons fight where they meet.
export function fleetsDaily(ctx) {
  const g = ctx.game;
  for (const id of Object.keys(g.fleets || {})) {
    const f = g.fleets[id];
    if (!f) continue;
    if (f.ships <= 0) { disembarkCore(ctx, f); delete g.fleets[id]; continue; }
    if (!f.path || !f.path.length) continue;
    if (f.moveDaysLeft <= 0) { f.moveDaysLeft = seaHopDays(ctx, f.prov, f.path[0]); f.hopTotal = f.moveDaysLeft; }
    f.moveDaysLeft--;
    if (f.moveDaysLeft > 0) continue;
    f.prov = f.path.shift();
    f.moveDaysLeft = 0;
    // cargo rides along
    for (const a of Object.values(g.armies)) if (a && a.aboard === f.id) a.prov = f.prov;
  }
  // sea battles: hostile squadrons off the same shore trade broadsides daily
  const byProv = new Map();
  for (const f of Object.values(g.fleets || {})) {
    if (!f || f.ships <= 0) continue;
    if (!byProv.has(f.prov)) byProv.set(f.prov, []);
    byProv.get(f.prov).push(f);
  }
  for (const fleets of byProv.values()) {
    for (let i = 0; i < fleets.length; i++) {
      for (let j = i + 1; j < fleets.length; j++) {
        const A = fleets[i], B = fleets[j];
        if (!isHostile(ctx, A.tag, B.tag) || A.ships <= 0 || B.ships <= 0) continue;
        // The admiral's seamanship rides the die; the hull pattern rides the
        // broadside (SPEC §31) on top of influence tech's navalMult.
        const pipA = A.admiral ? num(A.admiral.maneuver, 0) : 0;
        const pipB = B.admiral ? num(B.admiral.maneuver, 0) : 0;
        const rollA = ctx.rng.int(6) + 1 + pipA, rollB = ctx.rng.int(6) + 1 + pipB;
        const nmA = fleetPowerOf(ctx, A);
        const nmB = fleetPowerOf(ctx, B);
        const lossB = Math.max(0, Math.round(A.ships * 0.12 * nmA * (1 + 0.15 * Math.max(0, rollA - rollB))));
        const lossA = Math.max(0, Math.round(B.ships * 0.12 * nmB * (1 + 0.15 * Math.max(0, rollB - rollA))));
        A.ships = Math.max(0, A.ships - lossA);
        B.ships = Math.max(0, B.ships - lossB);
        const player = g.playerTag;
        if ((A.tag === player || B.tag === player) && (lossA || lossB)) {
          const p = ctx.byId(A.prov);
          ctx.bus.emit('notify', {
            title: 'Battle at sea',
            text: 'Rams and fire off ' + ((p && p.name) || 'the coast') + ' — we lose '
              + (A.tag === player ? lossA : lossB) + ' ships, they lose '
              + (A.tag === player ? lossB : lossA) + '.',
            type: 'war',
          });
        }
        // drowned cargo: a fleet that loses every hull drowns what it carried
        for (const F of [A, B]) {
          if (F.ships > 0) continue;
          for (const a of Object.values(g.armies)) {
            if (a && a.aboard === F.id) {
              a.aboard = null;
              a.men = Math.max(0, Math.round(num(a.men) * 0.25)); // survivors wash ashore
              a.prov = F.prov;
              a.morale = 0.2;
            }
          }
        }
      }
    }
  }
}

// Monthly: upkeep. An exhausted treasury lets hulls rot. Oil-fired patterns
// (SPEC §52) pay a fuel premium — a destroyer flotilla bunkers oil where a
// penteconter shipped oars.
export function monthlyNavy(ctx) {
  const g = ctx.game;
  const F = ctx.DEFINES.FUEL;
  const fuelGen = F ? num(F.gen, 5) : Infinity;
  const shipMult = F ? num(F.shipMult, 1.5) : 1;
  for (const f of Object.values(g.fleets || {})) {
    if (!f || f.ships <= 0) continue;
    const t = g.tags[f.tag];
    if (!t) continue;
    const fueled = num(f.gen, 0) >= fuelGen;
    t.treasury = num(t.treasury) - f.ships * SHIP_UPKEEP * (fueled ? shipMult : 1);
    if (t.treasury <= -150 && f.ships > 0) f.ships--; // rot
  }
}
