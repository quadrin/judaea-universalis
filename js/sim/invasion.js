// Judaea Universalis — AI naval invasions (SPEC §82). DOM-free.
//
// A warring AI whose enemy cannot be reached overland stops shrugging and
// plans a real amphibious operation, one honest step at a time:
//
//   1. RECOGNIZE  — no enemy-controlled province is reachable by land.
//   2. CHOOSE     — a beachhead on the enemy coast: ports first, low walls,
//                   weak defenders, short sailing.
//   3. MUSTER     — an invasion army marches to a friendly staging port; the
//                   realm's squadrons gather there and merge into one armada.
//                   Missing hulls are BUILT at the yards (never conjured),
//                   and the operation waits for them.
//   4. ESCORT     — a superior hostile fleet forces a postponement; one that
//                   appears mid-crossing turns the armada for home.
//   5. LAND       — the troops go ashore and fight for the beachhead.
//   6. REINFORCE  — once ashore, later waves are sealifted to the front that
//                   the land AI cannot march to.
//
// One operation per court at a time, recorded in tag.aiState.navalOp so a
// save mid-crossing resumes mid-crossing. The land AI leaves reserved armies
// alone (ai.js consults reservedForNavalOp).

import {
  num, clamp, armiesOf, armiesInProv, regCount, isHostile, sameSide, canEnter,
  issueMove, findPath, bfsDistances, hasBuilding, devTotal, disciplineOf,
  engageIfNeeded, splitArmyCore,
} from './military.js';
import {
  isCoastal, seaHopDays, buildShipCore, issueFleetMove, embarkCore,
  disembarkCore, fleetPowerOf, mergeFleetsCore, navalStrengthOf,
} from './navy.js';
import { queuedUnitsOf } from './recruitment.js';
import { seaLaneCut } from './supply.js';

const warned = new Set();
function warnOnce(key, ...msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[sim/invasion]', ...msg);
}

function I(ctx, key, fallback) {
  const inv = ctx.DEFINES && ctx.DEFINES.INVASION;
  return inv && Number.isFinite(inv[key]) ? inv[key] : fallback;
}

function opOf(t) {
  return (t && t.aiState && t.aiState.navalOp) || null;
}
function setOp(t, op) {
  if (!t.aiState) t.aiState = {};
  t.aiState.navalOp = op;
}
// The land AI asks before re-tasking an army: reserved troops belong to the sea.
export function reservedForNavalOp(t, armyId) {
  const op = opOf(t);
  return !!(op && Array.isArray(op.armyIds) && op.armyIds.indexOf(armyId) >= 0);
}

function armyStrength(ctx, a) {
  const moraleFrac = a.maxMorale > 0 ? Math.max(0.1, Math.min(1, num(a.morale) / a.maxMorale)) : 0.5;
  return num(a.men) * disciplineOf(ctx, a.tag) * (0.5 + 0.5 * moraleFrac);
}
function hostileStackStrength(ctx, tag, provId) {
  let s = 0;
  for (const a of armiesInProv(ctx, provId)) {
    if (!a.retreating && a.men > 0 && isHostile(ctx, tag, a.tag)) s += armyStrength(ctx, a);
  }
  return s;
}

// Where the realm stands: the biggest army's square, else the capital.
function vantage(ctx, tag) {
  let main = null;
  for (const a of armiesOf(ctx, tag)) {
    if (!a.aboard && a.men > 0 && (!main || a.men > main.men)) main = a;
  }
  if (main) return main.prov;
  const capName = ctx.DEFINES.TAGS && ctx.DEFINES.TAGS[tag] ? ctx.DEFINES.TAGS[tag].capital : null;
  const cap = capName ? ctx.prov(capName) : null;
  return cap && cap.owner === tag ? cap.id : 0;
}

// Can any province this enemy controls be marched to? canEnter refuses the
// neutral third parties between the courts — exactly the case that wants ships.
export function enemyReachableOverland(ctx, tag, enemy) {
  const g = ctx.game;
  const from = vantage(ctx, tag);
  if (!from) return false;
  const dists = bfsDistances(ctx, from, (id) => canEnter(ctx, tag, id), 64);
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.controller === enemy && dists.has(i)) return true;
  }
  return false;
}

function homePorts(ctx, tag) {
  const g = ctx.game;
  const out = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag || p.controller !== tag) continue;
    if (!isCoastal(ctx, i) || seaLaneCut(ctx, tag, i)) continue;
    out.push(i);
  }
  return out;
}

// The vulnerable coastal province (SPEC §82): ports first, low fortification,
// weak defenders, a short crossing, something worth holding. Lower is better.
function pickBeachhead(ctx, tag, enemy, portId) {
  const g = ctx.game;
  let best = 0, bestScore = Infinity;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.controller !== enemy || !isCoastal(ctx, i)) continue;
    if (!canEnter(ctx, tag, i)) continue;
    const score = (p.fort | 0) * 10
      + hostileStackStrength(ctx, tag, i) / 800
      + num(p.garrison) / 800
      + navalStrengthOf(ctx, tag, { hostile: true, at: i }) * 4 // never land into a waiting squadron
      + (portId ? seaHopDays(ctx, portId, i) * 0.6 : 0)
      - devTotal(p) * 0.15
      - (hasBuilding(p, 'shipyard') ? 6 : 0);
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return best;
}

// The staging port: a working home harbor, shipyards first, nearest the war.
function pickPort(ctx, tag, enemy) {
  const ports = homePorts(ctx, tag);
  if (!ports.length) return 0;
  const g = ctx.game;
  const enemyCoast = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.controller === enemy && isCoastal(ctx, i)) enemyCoast.push(i);
  }
  let best = 0, bestScore = Infinity;
  for (const id of ports) {
    let sail = 30;
    for (const c of enemyCoast) sail = Math.min(sail, seaHopDays(ctx, id, c));
    const score = sail - (hasBuilding(ctx.byId(id), 'shipyard') ? 8 : 0);
    if (score < bestScore) { bestScore = score; best = id; }
  }
  return best;
}

function fleetsAtPort(ctx, tag, portId) {
  return Object.values(ctx.game.fleets || {})
    .filter((f) => f && f.tag === tag && f.ships > 0 && f.prov === portId && !(f.path && f.path.length));
}

// Lay hulls where the realm can build them — up to the cap, never into debt.
// Yards with short queues first: a keel behind twenty infantry musters is a
// keel that never touches water (the province queue is FIFO).
function buildToward(ctx, tag, missing) {
  const g = ctx.game;
  const t = g.tags[tag];
  const cap = I(ctx, 'maxShipsBuilding', 3);
  const reserve = I(ctx, 'shipReserve', 80);
  let building = queuedUnitsOf(ctx, tag, ['ship']);
  if (building >= Math.min(cap, missing)) return;
  const yards = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag || p.controller !== tag) continue;
    if (!isCoastal(ctx, i) || !hasBuilding(p, 'shipyard') || p.siege) continue;
    if ((p.unitQueue || []).some((o) => o && o.type === 'ship')) continue;
    yards.push({ id: i, queued: (p.unitQueue || []).length });
  }
  yards.sort((a, b) => a.queued - b.queued);
  for (const y of yards) {
    if (building >= Math.min(cap, missing)) break;
    if (num(t.treasury) < 30 + reserve) break;
    const res = buildShipCore(ctx, tag, y.id);
    if (res.ok) building++;
  }
}

// A landlocked-at-heart realm that means to invade needs a yard first: one
// shipyard construction at its best home harbor, the ordinary way.
function ensureShipyard(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const def = (ctx.DEFINES.BUILDINGS || {}).shipyard;
  if (!def) return;
  let best = 0, bestDev = -1;
  for (const i of homePorts(ctx, tag)) {
    const p = ctx.byId(i);
    if (hasBuilding(p, 'shipyard')) return; // one exists — nothing to do
    if (!p.construction && devTotal(p) > bestDev) { bestDev = devTotal(p); best = i; }
  }
  if (!best) return;
  const p = ctx.byId(best);
  if ((p.construction && p.construction.key) || num(t.treasury) < num(def.cost) + 150) return;
  t.treasury = num(t.treasury) - num(def.cost);
  p.construction = { key: 'shipyard', monthsLeft: Math.max(1, num(def.months, 1)) };
}

function abortOp(ctx, t) {
  setOp(t, null);
}

// Recall: the armada turns for the nearest open home harbor. A realm with no
// harbor left recalls in place — the troops go ashore wherever the hulls sit.
function beginRecall(ctx, tag, op, fleet) {
  const ports = homePorts(ctx, tag);
  let best = 0, bestDays = Infinity;
  for (const id of ports) {
    const d = seaHopDays(ctx, fleet.prov, id);
    if (d < bestDays) { bestDays = d; best = id; }
  }
  if (!best) best = op.port;
  if (best && best !== fleet.prov) issueFleetMove(ctx, fleet, best);
  op.stage = 'recall';
  op.dest = best || fleet.prov;
}

function landArmies(ctx, tag, op, fleet) {
  const g = ctx.game;
  const p = ctx.byId(fleet.prov);
  const landed = disembarkCore(ctx, fleet);
  if (!landed) return;
  let men = 0;
  const ashore = [];
  for (const a of Object.values(g.armies)) {
    if (a && a.tag === tag && a.prov === fleet.prov && !a.aboard) { ashore.push(a); men += num(a.men); }
  }
  for (const a of ashore) engageIfNeeded(ctx, a);
  if (op.kind === 'invasion' && p && (p.owner === g.playerTag || p.controller === g.playerTag)) {
    const tname = (g.tags[tag] && g.tags[tag].name) || tag;
    ctx.bus.emit('notify', {
      title: 'Invasion!',
      text: tname + ' puts ' + Math.round(men / 100) / 10 + 'k men ashore at ' + p.name
        + ' — the war has crossed the water.',
      type: 'war', provName: p.name,
    });
  }
}

// One month of one court's naval thinking. `passive` courts service what is
// already at sea but plan nothing new (scripted lulls stay lulls).
export function aiNavalOperation(ctx, tag, passive) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t || !t.alive || tag === 'REB') return;
  const enemies = (t.atWarWith || []).filter((e) => g.tags[e] && g.tags[e].alive);
  let op = opOf(t);

  // ---- validate / service the running operation --------------------------
  if (op) {
    op.armyIds = (op.armyIds || []).filter((id) => g.armies[id]);
    const fleet = op.fleetId != null ? g.fleets[op.fleetId] : null;
    const warOn = op.enemy ? enemies.indexOf(op.enemy) >= 0 : enemies.length > 0;
    const targetP = op.target ? ctx.byId(op.target) : null;
    const targetStands = op.kind !== 'invasion'
      || (warOn && targetP && targetP.controller === op.enemy && canEnter(ctx, tag, op.target));

    if (op.stage === 'muster') {
      if (!targetStands || !op.armyIds.length) { abortOp(ctx, t); op = null; }
      else if (!passive && (op.wait = num(op.wait) + 1) > I(ctx, 'patienceMonths', 30)) { abortOp(ctx, t); op = null; }
    } else if (op.stage === 'sail') {
      if (!fleet) { abortOp(ctx, t); op = null; } // the armada is sunk; survivors are ashore where it died
      else if (!fleet.path || !fleet.path.length) {
        if (fleet.prov === op.dest) {
          // arrived — the troops go ashore and the land war takes over
          landArmies(ctx, tag, op, fleet);
          abortOp(ctx, t);
          op = null;
        } else {
          // beached somewhere unplanned (a sea fight, a stale order):
          // never strand the cargo — turn for home and put it ashore there
          beginRecall(ctx, tag, op, fleet);
        }
      } else if (!targetStands && op.kind === 'invasion') {
        beginRecall(ctx, tag, op, fleet);
      } else if (op.kind === 'invasion') {
        // a superior squadron waiting off the beach turns the armada around
        const oursAfloat = fleet.ships * fleetPowerOf(ctx, fleet);
        const offBeach = navalStrengthOf(ctx, tag, { hostile: true, at: op.dest });
        if (offBeach > oursAfloat * I(ctx, 'escortRatio', 1.15)) beginRecall(ctx, tag, op, fleet);
      }
    } else if (op.stage === 'recall') {
      if (!fleet) { abortOp(ctx, t); op = null; }
      else if (!fleet.path || !fleet.path.length) {
        disembarkCore(ctx, fleet);
        for (const id of op.armyIds) { if (g.armies[id]) engageIfNeeded(ctx, g.armies[id]); }
        abortOp(ctx, t);
        op = null;
      }
    }
  }

  // ---- muster: gather the armada, build the missing hulls ----------------
  // A scripted lull holds the armada in port: what is already at sea sails
  // on (above), but no new offensive leaves the quay under aiPassive.
  op = opOf(t);
  if (op && op.stage === 'muster' && !passive) {
    const army = g.armies[op.armyIds[0]];
    if (!army || army.aboard) { abortOp(ctx, t); return; }
    if (army.prov !== op.port && !army.inBattle && !(army.path && army.path.length)) {
      if (!issueMove(ctx, army, op.port)) { abortOp(ctx, t); return; } // no road to the sea
    }
    // squadrons converge on the staging port...
    for (const f of Object.values(g.fleets || {})) {
      if (!f || f.tag !== tag || f.ships <= 0 || f.prov === op.port) continue;
      if (f.path && f.path.length) continue;
      issueFleetMove(ctx, f, op.port);
    }
    // ...and merge into one command at the quay
    const here = fleetsAtPort(ctx, tag, op.port);
    while (here.length > 1) mergeFleetsCore(ctx, here.pop(), here[0]);
    const armada = here[0] || null;
    // The armada is a bounded expedition (maxShips hulls), not the whole
    // levy: a mustering army that keeps recruiting cannot demand an ever
    // larger fleet — at the quay the surplus is split off as the garrison
    // and second wave, and the expedition that FITS sails.
    const have = armada ? armada.ships : 0;
    const power = armada ? fleetPowerOf(ctx, armada) : 1;
    const minShips = Math.max(1, Math.ceil(I(ctx, 'minMen', 4000) / 1000));
    const fullLift = clamp(Math.ceil(num(army.men) / 1000), minShips, I(ctx, 'maxShips', 8));
    // hulls sliding down the ways ARE progress: the patience clock measures
    // stalls, not shipbuilding — it rewinds whenever the armada grows
    if (have > num(op.lastShips, 0)) { op.lastShips = have; op.wait = 0; }
    // is the sea ours to cross? a superior enemy fleet raises the yard order
    const theirsAfloat = navalStrengthOf(ctx, tag, { hostile: true });
    const escortShort = theirsAfloat > have * power * I(ctx, 'escortRatio', 1.15);
    let wantShips = fullLift;
    if (escortShort) {
      wantShips = Math.max(wantShips, Math.min(fullLift + 6,
        Math.ceil(theirsAfloat / Math.max(0.01, power * I(ctx, 'escortRatio', 1.15))) + 1));
    }
    if (have < wantShips) buildToward(ctx, tag, wantShips - have);
    // sail once a MEANINGFUL expedition fits and the sea allows: waiting for
    // the perfect lift while the army recruits would postpone forever
    if (!armada || have < minShips || escortShort) return;
    // the beach may have hardened while we built — judge with the force that
    // actually fits the hulls, and re-pick a softer shore if needed
    const liftMen = Math.min(num(army.men), have * 1000);
    const liftStrength = armyStrength(ctx, army) * (liftMen / Math.max(1, num(army.men)));
    let target = op.target;
    const beachDef = hostileStackStrength(ctx, tag, target);
    if (beachDef * I(ctx, 'defenderEdge', 1.25) > liftStrength) {
      const alt = pickBeachhead(ctx, tag, op.enemy, op.port);
      if (alt && alt !== target
          && hostileStackStrength(ctx, tag, alt) * I(ctx, 'defenderEdge', 1.25) <= liftStrength) {
        target = op.target = alt;
      } else {
        return; // wait for a better hour (patience clock is running)
      }
    }
    if (army.prov !== op.port || army.inBattle) return; // still marching
    // a host that outgrew its hulls leaves the surplus on the quay: split
    // until the expedition fits (the remainder garrisons, or sails later)
    let guard = 0;
    while (num(army.men) > armada.ships * 1000 && regCount(army) > 1 && guard++ < 5) {
      if (!splitArmyCore(ctx, army)) break;
    }
    if (num(army.men) > armada.ships * 1000) return; // still too big: wait for hulls
    // load the reserved army, then any idle friend at the quay while room remains
    if (!embarkCore(ctx, armada, army.id).ok) return;
    for (const a of armiesInProv(ctx, op.port)) {
      if (a.id === army.id || a.tag !== tag || a.inBattle || a.retreating) continue;
      const res = embarkCore(ctx, armada, a.id);
      if (res.ok && op.armyIds.indexOf(a.id) < 0) op.armyIds.push(a.id);
    }
    issueFleetMove(ctx, armada, target);
    op.fleetId = armada.id;
    op.dest = target;
    op.stage = 'sail';
    return;
  }
  if (op || passive) return;

  // ---- recognize: does this war need the sea? ----------------------------
  if (!enemies.length) return;
  try {
    let anyLand = false;
    for (const e of enemies) { if (enemyReachableOverland(ctx, tag, e)) { anyLand = true; break; } }
    if (anyLand) { aiSealift(ctx, tag); return; } // the land war is on — but the far front may need ferries
    let enemy = null, target = 0, port = 0;
    for (const e of enemies) {
      const pt = pickPort(ctx, tag, e);
      if (!pt) continue;
      const bh = pickBeachhead(ctx, tag, e, pt);
      if (bh) { enemy = e; target = bh; port = pt; break; }
    }
    if (!enemy) { ensureShipyard(ctx, tag); return; } // no beach, or no harbor: dig the harbor first
    // the invasion army: the largest host free to march, big enough to matter
    let army = null;
    for (const a of armiesOf(ctx, tag)) {
      if (a.aboard || a.inBattle || a.retreating || a.men <= 0) continue;
      if (!army || a.men > army.men) army = a;
    }
    if (!army || army.men < I(ctx, 'minMen', 4000)) { ensureShipyard(ctx, tag); return; } // recruit on; the sea can wait
    ensureShipyard(ctx, tag);
    setOp(t, {
      kind: 'invasion', stage: 'muster', enemy, target, port,
      armyIds: [army.id], fleetId: null, dest: 0, wait: 0,
      started: { y: g.date.y, m: g.date.m },
    });
    if (army.prov !== port) issueMove(ctx, army, port);
  } catch (e) { warnOnce('plan:' + tag, 'invasion planning failed for', tag, e); }
}

// Reinforcements follow the beachhead (SPEC §82): idle armies that cannot
// MARCH to the main overseas stack are ferried to the nearest friendly coast
// beside it — the same honest machinery, pointed at a friendly quay.
function aiSealift(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  // the war's main stack
  let main = null;
  for (const a of armiesOf(ctx, tag)) {
    if (!a.aboard && a.men > 0 && (!main || a.men > main.men)) main = a;
  }
  if (!main) return;
  // a stranded second wave: idle, no road to the front
  let wave = null;
  for (const a of armiesOf(ctx, tag)) {
    if (a === main || a.aboard || a.inBattle || a.retreating || a.men <= 0) continue;
    if (a.path && a.path.length) continue;
    if (reservedForNavalOp(t, a.id)) continue;
    if (findPath(ctx, tag, a.prov, main.prov)) continue; // it can march — let it
    if (!wave || a.men > wave.men) wave = a;
  }
  if (!wave) return;
  // a friendly, unblockaded shore within a short march of the front
  const near = bfsDistances(ctx, main.prov, (id) => canEnter(ctx, tag, id), 10);
  let dest = 0, bestD = Infinity;
  for (const [id, d] of near) {
    const p = ctx.byId(id);
    if (!p || !isCoastal(ctx, id)) continue;
    if (!(p.controller === tag || sameSide(ctx, tag, p.controller))) continue;
    if (seaLaneCut(ctx, tag, id)) continue;
    if (d < bestD) { bestD = d; dest = id; }
  }
  if (!dest) return;
  // an idle fleet with room, at (or sent to) the wave's port
  const ports = homePorts(ctx, tag);
  if (!ports.length) return;
  let fleet = null;
  for (const f of Object.values(g.fleets || {})) {
    if (!f || f.tag !== tag || f.ships <= 0 || (f.path && f.path.length)) continue;
    if (Object.values(g.armies).some((a) => a && a.aboard === f.id)) continue;
    if (f.ships * 1000 < wave.men) continue;
    if (!fleet || f.ships > fleet.ships) fleet = f;
  }
  if (!fleet) return;
  const port = ports.indexOf(wave.prov) >= 0 ? wave.prov
    : ports.reduce((best, id) => {
      const d = seaHopDays(ctx, fleet.prov, id);
      return !best || d < best.d ? { id, d } : best;
    }, null).id;
  if (wave.prov !== port) { issueMove(ctx, wave, port); return; }
  if (fleet.prov !== port) { issueFleetMove(ctx, fleet, port); return; }
  if (!embarkCore(ctx, fleet, wave.id).ok) return;
  issueFleetMove(ctx, fleet, dest);
  setOp(t, {
    kind: 'sealift', stage: 'sail', enemy: null, target: 0, port,
    armyIds: [wave.id], fleetId: fleet.id, dest, wait: 0,
    started: { y: g.date.y, m: g.date.m },
  });
}
