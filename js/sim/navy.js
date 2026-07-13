// js/sim/navy.js — fleets, sea transport, blockades, sea battles (SPEC §20).
// DOM-free. Fleets live in g.fleets keyed by id and ride at the offshore
// anchor of a coastal province (fleet.prov). Movement is port-to-port across
// open water (straight line — the Mediterranean has no walls). Each ship
// carries 1000 men. Armies aboard (a.aboard=true) are out of land play.

import { num, clamp, isHostile, sameSide, armiesInProv } from './military.js';

const SHIP_COST = 30;        // talents to lay down a hull
const SHIP_UPKEEP = 0.5;     // talents per ship per month
const SEA_PX_PER_DAY = 34;   // fleets are faster than legions
const CAPACITY = 1000;       // men per ship

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
  return clamp(Math.round(2 + dist / SEA_PX_PER_DAY), 2, 30);
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
  if (num(t.treasury) < SHIP_COST) return { ok: false, why: 'a hull costs ' + SHIP_COST + ' talents' };
  t.treasury = num(t.treasury) - SHIP_COST;
  let fleet = fleetsAt(ctx, provId).find((f) => f.tag === tag && !f.path.length);
  if (!fleet) {
    g.nextFleetId = num(g.nextFleetId, 1);
    fleet = {
      id: g.nextFleetId++, tag, prov: provId, ships: 0,
      path: [], moveDaysLeft: 0, hopTotal: 0,
      name: 'Fleet of ' + p.name,
    };
    if (!g.fleets) g.fleets = {};
    g.fleets[fleet.id] = fleet;
  }
  fleet.ships++;
  return { ok: true, fleet };
}

export function issueFleetMove(ctx, fleet, targetId) {
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
        const rollA = ctx.rng.int(6) + 1, rollB = ctx.rng.int(6) + 1;
        const lossB = Math.max(0, Math.round(A.ships * 0.12 * (1 + 0.15 * Math.max(0, rollA - rollB))));
        const lossA = Math.max(0, Math.round(B.ships * 0.12 * (1 + 0.15 * Math.max(0, rollB - rollA))));
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

// Monthly: upkeep. An exhausted treasury lets hulls rot.
export function monthlyNavy(ctx) {
  const g = ctx.game;
  for (const f of Object.values(g.fleets || {})) {
    if (!f || f.ships <= 0) continue;
    const t = g.tags[f.tag];
    if (!t) continue;
    t.treasury = num(t.treasury) - f.ships * SHIP_UPKEEP;
    if (t.treasury <= -150 && f.ships > 0) f.ships--; // rot
  }
}
