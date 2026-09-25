// Judaea Universalis — the war planner (SPEC §284). DOM-free.
//
// The old field AI was one rule: gather every army into one stack, march it
// at the nearest cheap province, and run to a fort when anything bigger came
// near. It could not defend two places, it never went back for what it had
// lost, and it gave the other side a battle whenever it misjudged the odds.
//
// War score is three sums (military.js `sideComponents`): the share of the
// enemy's development you occupy (to 60), two points per won battle (to 40),
// and the war goal that ticks for whoever holds it (to 25). So the planner
// asks, for every court at war, what each of those sums is worth to it this
// week, and spends its armies where they buy the most:
//
//   · relieve a siege of its own land, and take back what it has lost —
//     every occupied province is score the enemy is holding;
//   · fight the enemy's field armies only where the forecast says it wins,
//     and meet them on ground of its own choosing when it can get there first;
//   · hold the war goal and the capital against anyone who could take them;
//   · besiege the enemy where no army that could beat the besiegers is near;
//   · and never stand where it would lose — a lost battle is two points and a
//     rout, so an outmatched army leaves before the enemy arrives.
//
// Every judgement about a battle goes through `forecastBattle`, which runs
// the real combat formulas (military.js `battleRound`) forward on expected
// dice. There is no separate guess about "strength" to drift out of step
// with the battle system: the same discipline, morale, generals, terrain,
// doctrine, air, armor and arm-mix pips the battle will roll are the ones
// the planner reads.
//
// The planner runs monthly from `runTagAI` and again from the daily tick
// (`runTacticalAI`): every five days for a court at war with a human, so it
// answers a march the week it starts rather than the month after it ends,
// and at mid-month for wars the AI fights among itself.

import {
  num, clamp, devTotal, regCount, armiesOf, isHostile, sameSide, canEnter,
  hopDays, genSpeed, armSpeedOf, splitArmyCore, mergeInto, sideStats, airNet, airPips, armorPips, armPips,
  warGoalInfo, sideComponents, tagDef, ceasefireHolds, isHumanChair, battleScoreFor, resolveTagMult,
} from './military.js';
import { doctrinePips } from '../data/tech.js';
import { MOUNTED_TERRAIN } from '../data/units.js';
import { seasonSiegeFactor } from './seasons.js';
import { reservedForNavalOp } from './invasion.js';

// How far ahead the planner looks, in days of march.
const HORIZON = 45;
// A threat is an army that could reach us inside this many days. Two
// tactical passes: anything slower than that we will see coming next time.
const THREAT_DAYS = 12;
// Armies ordered to the same battle move together: an army that would arrive
// more than this many days before the slowest of its comrades waits for them.
const SYNC_DAYS = 4;
// The odds it takes. An army attacks at three in four, holds ground it is
// sent to at three in five, and stays where it is while its chance of
// holding is at least even. Calibrated against real battles in smoke196.
const ATTACK_ODDS = 0.75;
const HOLD_ODDS = 0.6;
const STAND_ODDS = 0.5;
// What a province the chapter's verdict turns on is worth to the court that
// needs it, on top of its war score (bookmark.aiObjectives).
const OBJECTIVE_VALUE = 15;
// The least a siege must be worth, in war score per unit of time and road,
// before an army leaves home for it.
const MIN_SIEGE_SCORE = 0.8;

// ------------------------------------------------------------ the forecast
// E[max(0, X − Y + d)] for X, Y uniform on 0..9 — the expected "edge" the
// battle round multiplies casualties and morale damage by.
const EDGE = new Map();
function edgeAt(k) {
  let v = EDGE.get(k);
  if (v !== undefined) return v;
  let s = 0;
  for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) s += Math.max(0, x - y + k);
  v = s / 100;
  EDGE.set(k, v);
  return v;
}
// Between whole pips the expectation is interpolated, so a fractional shift
// of luck moves the forecast smoothly.
function expEdge(d) {
  const x = clamp(d, -25, 25);
  const k = Math.floor(x);
  const f = x - k;
  return f ? edgeAt(k) * (1 - f) + edgeAt(k + 1) * f : edgeAt(k);
}

// The pips each side rolls with in each phase, exactly as battleRound adds
// them. Positive = the attacker's advantage.
function phasePips(ctx, atk, def, provId) {
  const p = ctx.byId(provId);
  const terrain = (p && p.terrain) || '';
  const terr = ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[terrain] : null;
  const defBonus = terr ? num(terr.defBonus, 0) : 0;
  const hilly = terrain === 'hills' || terrain === 'mountains';
  const rough = MOUNTED_TERRAIN[terrain] || null;
  const roughArmor = (n) => (rough ? Math.floor(n * rough.armor) : n);
  const out = {};
  let base = null;
  for (const phase of ['fire', 'shock']) {
    const A = sideStats(ctx, atk, phase);
    const D = sideStats(ctx, def, phase);
    if (!base) base = { A, D };
    const net = airNet(ctx, provId, A.tags, D.tags);
    const armorNet = A.armor - D.armor;
    const armA = phase === 'shock' ? roughArmor(armorPips(ctx, armorNet)) : 0;
    const armD = phase === 'shock' ? roughArmor(armorPips(ctx, -armorNet)) : 0;
    const bA = A.pip + (hilly ? A.hill : 0) + doctrinePips(A.gen, phase, false)
      + airPips(ctx, net) + armA + armPips(ctx, phase, A, D, terrain);
    const bD = D.pip + defBonus + (hilly ? D.hill : 0) + doctrinePips(D.gen, phase, true)
      + airPips(ctx, -net) + armD + armPips(ctx, phase, D, A, terrain);
    out[phase] = bA - bD;
  }
  return { pips: out, A: base.A, D: base.D };
}

// Run the battle forward on expected dice. `shift` moves every round's pips
// toward the attacker (negative: toward the defender).
function runForecast(prep, shift) {
  const { pips, A, D } = prep;
  let aM = A.men, dM = D.men, aMo = A.morale, dMo = D.morale;
  const aDi = A.disc, dDi = D.disc;
  let winner = null, day = 0;
  for (day = 1; day <= 120; day++) {
    const phase = Math.floor((day - 1) / 3) % 2 === 0 ? 'fire' : 'shock';
    const d = pips[phase] + shift;
    const eA = expEdge(d), eD = expEdge(-d);
    const casOnD = Math.min(aM * 0.010 * (1 + 0.12 * eA) * (aDi / Math.max(0.5, dDi)), dM * 0.12);
    const casOnA = Math.min(dM * 0.010 * (1 + 0.12 * eD) * (dDi / Math.max(0.5, aDi)), aM * 0.12);
    const mdOnD = (0.16 + 0.045 * eA) * clamp(aM / Math.max(1, dM), 0.05, 2.5) * aDi;
    const mdOnA = (0.16 + 0.045 * eD) * clamp(dM / Math.max(1, aM), 0.05, 2.5) * dDi;
    aM -= casOnA; dM -= casOnD; aMo -= mdOnA; dMo -= mdOnD;
    if (aM <= 0 || dM <= 0) { winner = aM > 0 ? 'atk' : 'def'; break; }
    const aBroke = aMo <= 0.05, dBroke = dMo <= 0.05;
    if (aBroke || dBroke) { winner = aBroke ? 'def' : 'atk'; break; }
  }
  if (!winner) winner = aMo / Math.max(0.01, A.morale) >= dMo / Math.max(0.01, D.morale) ? 'atk' : 'def';
  aM = Math.max(0, aM); dM = Math.max(0, dM);
  const wM = winner === 'atk' ? aM : dM, lM = winner === 'atk' ? dM : aM;
  return {
    winner, days: Math.min(day, 120),
    atkMen: Math.round(aM), defMen: Math.round(dM),
    atkLoss: Math.round(A.men - aM), defLoss: Math.round(D.men - dM),
    wipe: wM >= 10 * Math.max(1, lM) || lM < 300,
  };
}
function prepare(ctx, atkArmies, defArmies, provId) {
  const atk = (atkArmies || []).filter((a) => a && num(a.men) > 0);
  const def = (defArmies || []).filter((a) => a && num(a.men) > 0);
  if (!atk.length || !def.length) return { atk, def, prep: null };
  return { atk, def, prep: phasePips(ctx, atk, def, provId) };
}
function trivial(atk, def) {
  const empty = { winner: null, days: 0, atkMen: 0, defMen: 0, atkLoss: 0, defLoss: 0, wipe: false };
  if (!atk.length && !def.length) return empty;
  if (!def.length) return { ...empty, winner: 'atk', atkMen: menOf(atk) };
  return { ...empty, winner: 'def', defMen: menOf(def) };
}

// The expected-dice result of a battle, with `opts.shift` pips of luck given
// to the attacker. Exported for the regression suite.
export function forecastBattle(ctx, atkArmies, defArmies, provId, opts) {
  const { atk, def, prep } = prepare(ctx, atkArmies, defArmies, provId);
  if (!prep) return trivial(atk, def);
  return runForecast(prep, num(opts && opts.shift, 0));
}

// The dice are the whole difference in a close fight. A battle runs about a
// week of d10 against d10, so the luck either side brings to it averages out
// to something like a pip and a half either way (LUCK). The chance the
// attacker wins is the chance its luck clears the point where the expected-
// dice result flips — found by bisecting the shift, then read off a normal
// curve. The balance harness keeps this honest: smoke196 checks predicted
// odds against real battles.
const LUCK = 1.5;
function normalCdf(x) {
  // Abramowitz–Stegun 7.1.26 through erf.
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}
export function winChance(ctx, atkArmies, defArmies, provId) {
  const { atk, def, prep } = prepare(ctx, atkArmies, defArmies, provId);
  if (!prep) return atk.length ? 1 : 0;
  const atkWins = (s) => runForecast(prep, s).winner === 'atk';
  if (atkWins(-6)) return 0.999;
  if (!atkWins(6)) return 0.001;
  let lo = -6, hi = 6; // atkWins(lo) false, atkWins(hi) true
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    if (atkWins(mid)) hi = mid; else lo = mid;
  }
  const flip = (lo + hi) / 2; // the luck the attacker needs
  return 1 - normalCdf(flip / LUCK);
}

// ------------------------------------------------------------ geography
// March time between neighbours, cached for the day. Without aircraft the
// cost of a hop depends only on the two provinces and the column's pace
// (terrain, distance, the season), so every court planning today shares it.
let _costDay = -1;
const _cost = new Map();
function edgeCost(ctx, from, to, army) {
  const g = ctx.game;
  let air = false;
  for (const k in g.airwings || {}) { if (g.airwings[k]) { air = true; break; } }
  if (air) return hopDays(ctx, from, to, army);
  const day = g.date.y * 400 + g.date.m * 32 + g.date.d;
  if (day !== _costDay) { _cost.clear(); _costDay = day; }
  const pace = genSpeed(num(army.gen, 0)) * armSpeedOf(army);
  let byPace = _cost.get(pace);
  if (!byPace) { byPace = new Map(); _cost.set(pace, byPace); }
  const key = from * 65536 + to;
  let c = byPace.get(key);
  if (c === undefined) { c = hopDays(ctx, from, to, army); byPace.set(key, c); }
  return c;
}
// Travel time in days from an army's province to everything within the
// horizon, by the same hop cost the march uses, and the route there.
// `avoid`: provinces a route may end in but not pass through — where an
// enemy stands that would stop the column on its way somewhere else.
function travelFrom(ctx, army, maxDays, avoid) {
  const dist = new Map();
  const prev = new Map();
  const nbs = ctx.geom && ctx.geom.neighbors;
  if (!nbs || !army || !army.prov) return { dist, prev };
  // A column already in the middle of a hop finishes it first.
  dist.set(army.prov, 0);
  const heap = [[0, army.prov]];
  const push = (d, id) => {
    heap.push([d, id]);
    let i = heap.length - 1;
    while (i > 0) {
      const j = (i - 1) >> 1;
      if (heap[j][0] <= heap[i][0]) break;
      [heap[i], heap[j]] = [heap[j], heap[i]]; i = j;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]]; i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, cur] = pop();
    if (d > (dist.has(cur) ? dist.get(cur) : Infinity)) continue;
    if (avoid && cur !== army.prov && avoid.has(cur)) continue; // arrive, but no further
    const set = nbs[cur];
    if (!set) continue;
    for (const nb of set) {
      if (!canEnter(ctx, army.tag, nb)) continue;
      const nd = d + edgeCost(ctx, cur, nb, army);
      if (nd > maxDays) continue;
      if (nd < (dist.has(nb) ? dist.get(nb) : Infinity)) {
        dist.set(nb, nd);
        prev.set(nb, cur);
        push(nd, nb);
      }
    }
  }
  return { dist, prev };
}
function routeTo(tr, from, to) {
  const path = [];
  let at = to;
  while (at !== from) {
    path.unshift(at);
    at = tr.prev.get(at);
    if (at === undefined) return null;
  }
  return path;
}
// March by the fastest road rather than the fewest hops. Nothing moves under
// a cease-fire (SPEC §261) or out of a battle.
function marchTo(ctx, army, dest, tr) {
  if (ceasefireHolds(ctx) || !army || army.inBattle) return false;
  if (army.prov === dest) { halt(army); return true; }
  const cur = army.path && army.path.length ? army.path[army.path.length - 1] : null;
  if (cur === dest) return true; // already on the way; don't restart the hop
  const path = tr ? routeTo(tr, army.prov, dest) : null;
  if (!path || !path.length) return false;
  army.path = path;
  army.moveDaysLeft = 0;
  army.retreating = false;
  return true;
}
function halt(army) {
  if (army.path && army.path.length && num(army.moveDaysLeft) > 0) {
    // Mid-hop: finish the hop already begun, then stop.
    army.path = army.path.slice(0, 1);
    return;
  }
  army.path = [];
  army.moveDaysLeft = 0;
}
// Days until a marching army reaches each province on its route.
function pathEta(ctx, army) {
  const eta = new Map();
  if (!army.path || !army.path.length) { eta.set(army.prov, 0); return eta; }
  let t = num(army.moveDaysLeft) > 0 ? num(army.moveDaysLeft) : hopDays(ctx, army.prov, army.path[0], army);
  let at = army.prov;
  eta.set(at, 0);
  for (let i = 0; i < army.path.length; i++) {
    const nx = army.path[i];
    if (i > 0) t += hopDays(ctx, at, nx, army);
    eta.set(nx, t);
    at = nx;
  }
  return eta;
}
function centroidGap(ctx, a, b) {
  const cs = ctx.geom && ctx.geom.centroids;
  const p = cs && cs[a], q = cs && cs[b];
  if (!p || !q || !Number.isFinite(p.x) || !Number.isFinite(q.x)) return 0;
  return Math.hypot(p.x - q.x, p.y - q.y);
}
function supportLimit(ctx, p) {
  const B = ctx.DEFINES.BASE || {};
  const granary = p && Array.isArray(p.buildings) && p.buildings.indexOf('granary') >= 0;
  return num(B.supportLimitBase, 8) + devTotal(p) * num(B.supportLimitPerDev, 0.8) + (granary ? 3 : 0);
}

// ------------------------------------------------------------ the picture
function fit(a) {
  return a && num(a.men) > 0 && !a.aboard && !a.retreating && num(a.shatteredDays) <= 0;
}
function menOf(list) { let s = 0; for (const a of list) s += num(a.men); return s; }

function readWar(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const hostileGroups = new Map();
  const friendsAt = new Map();
  const hostilesAt = new Map();
  for (const id in g.armies) {
    const a = g.armies[id];
    if (!fit(a) || a.tag === tag) continue;
    if (isHostile(ctx, tag, a.tag)) {
      if (!hostilesAt.has(a.prov)) hostilesAt.set(a.prov, []);
      hostilesAt.get(a.prov).push(a);
      let grp = hostileGroups.get(a.prov);
      if (!grp) { grp = { prov: a.prov, armies: [], lead: a }; hostileGroups.set(a.prov, grp); }
      grp.armies.push(a);
      if (a.men > grp.lead.men) grp.lead = a;
    } else if (sameSide(ctx, tag, a.tag) && !a.inBattle) {
      if (!friendsAt.has(a.prov)) friendsAt.set(a.prov, []);
      friendsAt.get(a.prov).push(a);
    }
  }
  const groups = [...hostileGroups.values()];
  for (const grp of groups) {
    grp.men = menOf(grp.armies);
    grp.human = grp.armies.some((a) => isHumanChair(g, a.tag));
    grp.moving = !!(grp.lead.path && grp.lead.path.length) && !grp.lead.inBattle;
    grp.dest = grp.moving ? grp.lead.path[grp.lead.path.length - 1] : grp.prov;
    grp.eta = grp.moving ? pathEta(ctx, grp.lead) : new Map([[grp.prov, 0]]);
    const here = ctx.byId(grp.prov);
    grp.besieging = !!(here && here.siege && isHostile(ctx, tag, here.siege.by));
    grp.inBattle = grp.armies.some((a) => a.inBattle);
    grp._reach = null;
  }
  const mine = armiesOf(ctx, tag).filter((a) => fit(a) && !a.inBattle && !reservedForNavalOp(t, a.id));
  const travel = new Map();
  for (const a of mine) {
    // A column does not march THROUGH a province where an enemy half its
    // size or more is standing: it would fight there, on ground it did not
    // choose, on its way somewhere else.
    const avoid = new Set();
    for (const [prov, list] of hostilesAt) if (menOf(list) >= 0.5 * num(a.men)) avoid.add(prov);
    travel.set(a.id, travelFrom(ctx, a, HORIZON, avoid));
  }
  // The chapter's objectives for this court (bookmark.aiObjectives), by the
  // names the victory rules use.
  const objectives = ((ctx.bookmark && ctx.bookmark.aiObjectives) || {})[tag] || [];
  const objIds = new Set(objectives.map((n) => (ctx.provId ? ctx.provId(n) : 0)).filter(Boolean));
  const objective = (p) => !!p && objIds.has(p.id);
  return { tag, t, groups, friendsAt, hostilesAt, mine, travel, objectives, objective };
}

// How soon a hostile group could stand in `prov`. Computed lazily and only
// for groups near enough to matter.
function reachOf(ctx, W, grp, prov, maxDays) {
  if (grp.eta.has(prov)) return grp.eta.get(prov);
  if (centroidGap(ctx, grp.prov, prov) > 30 * maxDays) return Infinity;
  if (!grp._reach) grp._reach = travelFrom(ctx, grp.lead, 30).dist;
  // A marching group reaches the rest of the map from where it is going.
  const d = grp._reach.get(prov);
  return d === undefined ? Infinity : d;
}

// The hostile armies that could join a fight at `prov` by day `by`.
function enemiesFor(ctx, W, prov, by, primary) {
  const out = [...(W.hostilesAt.get(prov) || [])];
  const seen = new Set(out);
  if (primary) for (const a of primary.armies) if (!seen.has(a)) { out.push(a); seen.add(a); }
  for (const grp of W.groups) {
    if (grp === primary || grp.prov === prov) continue;
    if (grp.inBattle || grp.besieging) continue; // busy elsewhere
    if (reachOf(ctx, W, grp, prov, by + 6) <= by + 6) {
      for (const a of grp.armies) if (!seen.has(a)) { out.push(a); seen.add(a); }
    }
  }
  return out;
}

// Would these armies hold `prov` if everything hostile that can get there
// in `window` days attacked them?
function holds(ctx, W, force, prov, window) {
  const foes = [];
  for (const grp of W.groups) {
    if (grp.inBattle) continue;
    if (grp.prov === prov || reachOf(ctx, W, grp, prov, window) <= window) foes.push(...grp.armies);
  }
  if (!foes.length) return true;
  const ours = force.concat(W.friendsAt.get(prov) || []);
  return winChance(ctx, foes, ours, prov) <= 1 - HOLD_ODDS;
}

// ------------------------------------------------------------ what it is worth
function warsOf(ctx, tag) {
  return (ctx.game.wars || []).filter((w) => w && (w.attackers.indexOf(tag) >= 0 || w.defenders.indexOf(tag) >= 0));
}
function warAgainst(wars, tag, other) {
  for (const w of wars) {
    const mineAtt = w.attackers.indexOf(tag) >= 0;
    const side = mineAtt ? w.defenders : w.attackers;
    if (side.indexOf(other) >= 0) return w;
  }
  return null;
}
function siegeDays(ctx, p, regs, byTag) {
  const fort = p.fort | 0;
  if (fort <= 0) return 10;
  const need = Math.max(1, Math.ceil(num(p.garrison) / 1000));
  if (regs < need) return Infinity;
  const season = Math.max(0.3, num(seasonSiegeFactor(ctx), 1));
  const walls = p.controller ? resolveTagMult(ctx, p.controller, 'siegeDefenseMult') : 1;
  const rate = (1.2 + 0.6 + 0.03 * clamp(regs - need, 0, 20)) * season / (fort * walls);
  const left = 100 - (p.siege && (p.siege.by === byTag) ? num(p.siege.progress) : 0);
  return Math.max(3, left / Math.max(0.05, rate));
}

// Every province worth sending an army to, and why.
function provinceTasks(ctx, W) {
  const g = ctx.game;
  const { tag } = W;
  const wars = warsOf(ctx, tag);
  const devCache = new Map();
  const sideDev = (w, key) => {
    const k = w.id + ':' + key;
    if (!devCache.has(k)) devCache.set(k, Math.max(1, sideComponents(ctx, w, key).enemyDev));
    return devCache.get(k);
  };
  const goalOf = new Map();
  for (const w of wars) {
    const gi = warGoalInfo(ctx, w);
    if (gi) for (const id of gi.targetProvIds || []) goalOf.set(id, (goalOf.get(id) || 0) + 1);
  }
  const capName = tagDef(ctx, tag).capital || null;
  const tasks = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    const ctrl = p.controller;
    if (!ctrl || !isHostile(ctx, tag, ctrl)) continue;
    const ours = p.owner === tag || sameSide(ctx, tag, p.owner);
    const theirs = !ours && isHostile(ctx, tag, p.owner);
    let value = 0;
    const w = warAgainst(wars, tag, ctrl);
    if (w) {
      const mineAtt = w.attackers.indexOf(tag) >= 0;
      if (ours) value = devTotal(p) / sideDev(w, mineAtt ? 'def' : 'att') * 60;
      else if (theirs) value = devTotal(p) / sideDev(w, mineAtt ? 'att' : 'def') * 60;
      if (w.attackers.concat(w.defenders).some((x) => isHumanChair(g, x))) value *= 1.25;
    } else if (ours) {
      value = devTotal(p) * 0.4; // rebels, or a war that is not ours to score
    }
    if (goalOf.has(i)) value += 10;
    if (W.objective(p)) value += OBJECTIVE_VALUE;
    if (ours && capName && (p.canon || p.name) === capName) value += 6;
    if (value <= 0.3) continue;
    tasks.push({ kind: 'siege', prov: i, value, retake: ours });
  }
  return tasks;
}

// The provinces our side holds that the enemy would score by taking. A guard
// is the fallback: an army that can beat the threat on the road does that
// instead, which guards the town too — so the guard is worth less than the
// battle that would make it unnecessary.
function guardTasks(ctx, W) {
  const { tag } = W;
  const out = [];
  const seen = new Set();
  const add = (id, value) => {
    if (!id || seen.has(id)) return;
    const p = ctx.byId(id);
    if (!p || p.impassable || !(p.controller === tag || sameSide(ctx, tag, p.controller))) return;
    seen.add(id);
    out.push({ kind: 'guard', prov: id, value });
  };
  for (const w of warsOf(ctx, tag)) {
    const gi = warGoalInfo(ctx, w);
    if (gi) for (const id of gi.targetProvIds || []) add(id, 5);
  }
  const capName = tagDef(ctx, tag).capital || null;
  if (capName) add(ctx.provId ? ctx.provId(capName) : 0, 3);
  for (const name of W.objectives) add(ctx.provId ? ctx.provId(name) : 0, OBJECTIVE_VALUE / 2);
  // Guard only against someone who can actually come.
  return out.filter((task) => W.groups.some((grp) => !grp.inBattle
    && reachOf(ctx, W, grp, task.prov, 25) <= 25));
}

function battleTasks(ctx, W) {
  const out = [];
  for (const grp of W.groups) {
    if (grp.inBattle) continue;
    // What beating this host is worth beyond the battle's own score (which
    // planBattle reads off the forecast): an army destroyed is an army that
    // cannot take our towns next month.
    let value = grp.men / 2000;
    if (grp.human) value *= 1.3;
    // A column marching on one of our towns is worth stopping for what the
    // town is worth to us: the score it would cost to lose it.
    if (grp.moving && W.townValue) value += W.townValue(grp.dest);
    const here = ctx.byId(grp.prov);
    if (grp.besieging && here) {
      // Breaking a siege of our own land is worth what the fall would cost us.
      value += 4 + devTotal(here) * 0.6 + num(here.siege && here.siege.progress) / 12;
    }
    // Where the fight happens: where they stand, or — if they are marching —
    // the best spot on their road we can reach before they do.
    const spots = [];
    if (grp.moving) {
      for (const [prov, eta] of grp.eta) if (prov !== grp.prov || eta === 0) spots.push({ prov, eta });
    } else {
      spots.push({ prov: grp.prov, eta: 0 });
    }
    out.push({ kind: 'battle', grp, spots, value });
  }
  return out;
}

// ------------------------------------------------------------ forces
function arrivals(W, list, prov) {
  let latest = 0;
  for (const a of list) {
    const d = W.travel.get(a.id).dist.get(prov);
    if (d === undefined) return Infinity;
    latest = Math.max(latest, d);
  }
  return latest;
}
function byArrival(W, free, prov, maxDays) {
  const out = [];
  for (const a of free) {
    const d = W.travel.get(a.id).dist.get(prov);
    if (d !== undefined && d <= maxDays) out.push({ a, d });
  }
  out.sort((x, y) => x.d - y.d || x.a.id - y.a.id);
  return out;
}

// The smallest set of free armies (nearest first) that wins this battle.
function planBattle(ctx, W, task, free) {
  let best = null;
  for (const spot of task.spots) {
    const cands = byArrival(W, free, spot.prov, 45);
    if (!cands.length) continue;
    const force = [];
    for (const c of cands) {
      force.push(c.a);
      const arrive = arrivals(W, force, spot.prov);
      // First on the field defends it; last arrives as the attacker.
      const iDefend = arrive + 1 < spot.eta;
      if (task.grp.moving && !iDefend && spot.prov !== task.grp.dest) break; // no chasing a column
      const start = Math.max(arrive, spot.eta);
      const foes = enemiesFor(ctx, W, spot.prov, start, task.grp);
      const ours = force.concat(W.friendsAt.get(spot.prov) || []);
      const p = iDefend ? 1 - winChance(ctx, foes, ours, spot.prov) : winChance(ctx, ours, foes, spot.prov);
      if (p < ATTACK_ODDS) continue;
      const f = iDefend ? forecastBattle(ctx, foes, ours, spot.prov) : forecastBattle(ctx, ours, foes, spot.prov);
      const myMen = menOf(ours);
      const myLoss = iDefend ? f.defLoss : f.atkLoss;
      const theirLoss = iDefend ? f.atkLoss : f.defLoss;
      if (myLoss > 0.55 * myMen) continue; // a win that costs the army is not one
      const terrainGain = iDefend ? 1.15 : 1;
      // And afterwards? A field the enemy's main army can reach within a
      // fortnight of the battle is a field the victors may not walk away from.
      const after = start + num(f.days, 5) + 14;
      const exposed = !holds(ctx, W, force.filter((a) => a), spot.prov, after);
      // The battle's own score is the war score it earns — the loser's losses,
      // and the whole host on a wipe — less what the same arithmetic says our
      // own dead will cost us in the next one.
      const earned = battleScoreFor(ctx, theirLoss + (f.wipe ? (iDefend ? f.atkMen : f.defMen) : 0));
      const score = (task.value + earned - myLoss / 3000) * p * terrainGain
        * (exposed ? 0.45 : 1) / (1 + start / 15);
      if (!best || score > best.score) best = { force: force.slice(), prov: spot.prov, score, arrive, iDefend };
      break; // more armies than this would only be idle
    }
  }
  return best;
}

function planSiege(ctx, W, task, free) {
  const p = ctx.byId(task.prov);
  if (!p) return null;
  const need = (p.fort | 0) > 0 ? Math.max(1, Math.ceil(num(p.garrison) / 1000)) : 1;
  // Only fight for the province here if its defenders are beatable.
  const standing = W.hostilesAt.get(task.prov) || [];
  const cands = byArrival(W, free, task.prov, HORIZON);
  if (!cands.length) return null;
  const force = [];
  let regs = 0;
  for (const c of cands) {
    force.push(c.a);
    regs += regCount(c.a);
    if (regs < need) continue;
    const arrive = arrivals(W, force, task.prov);
    if (standing.length
        && winChance(ctx, force.concat(W.friendsAt.get(task.prov) || []), standing, task.prov) < ATTACK_ODDS) continue;
    // Whoever could come and break the siege within the first fortnight.
    const window = arrive + Math.min(14, siegeDays(ctx, p, regs, W.tag));
    if (!holds(ctx, W, force, task.prov, window)) {
      // An army already sitting in the siege lines leaves only when the
      // relief is actually close — the planner will see it coming.
      if (arrive > 0 || !holds(ctx, W, force, task.prov, THREAT_DAYS)) continue;
    }
    const days = siegeDays(ctx, p, regs, W.tag);
    if (!Number.isFinite(days)) continue;
    const progress = p.siege && sameSide(ctx, W.tag, p.siege.by) ? num(p.siege.progress) : 0;
    const value = task.value * (1 + progress / 60);
    const score = value / (1 + arrive / 15 + days / 45);
    // Not worth the march: a town that barely moves the score is not worth an
    // army out of its country and out of reach of its friends.
    if (score < MIN_SIEGE_SCORE) return null;
    return { force, prov: task.prov, score, arrive, regs, need };
  }
  return null;
}

function planGuard(ctx, W, task, free) {
  const cands = byArrival(W, free, task.prov, 25);
  const force = [];
  for (const c of cands) {
    force.push(c.a);
    const arrive = arrivals(W, force, task.prov);
    // It has to get there before the threat does, and hold when it arrives.
    const first = Math.min(...W.groups.filter((grp) => !grp.inBattle)
      .map((grp) => reachOf(ctx, W, grp, task.prov, 25)));
    if (arrive >= first) return null;
    if (holds(ctx, W, force, task.prov, 25)) {
      return { force: force.slice(), prov: task.prov, score: task.value / (1 + arrive / 20), arrive };
    }
  }
  return null;
}

// ------------------------------------------------------------ evasion
// Would the army lose where it stands to what can reach it in THREAT_DAYS?
// Returns the day the first of those foes could arrive, or 0 if it is safe.
function beatenHere(ctx, W, army) {
  const ours = [army, ...(W.friendsAt.get(army.prov) || [])];
  const foes = [];
  let first = Infinity;
  for (const grp of W.groups) {
    if (grp.inBattle) continue;
    const heading = grp.moving && grp.eta.has(army.prov);
    const d = heading ? grp.eta.get(army.prov) : reachOf(ctx, W, grp, army.prov, THREAT_DAYS);
    if (d <= THREAT_DAYS) { foes.push(...grp.armies); first = Math.min(first, d); }
  }
  if (!foes.length) return 0;
  return winChance(ctx, foes, ours, army.prov) >= 1 - STAND_ODDS ? Math.max(0.5, first) : 0;
}
function evade(ctx, W, army) {
  const tr = W.travel.get(army.id);
  const threats = W.groups.filter((grp) => !grp.inBattle
    && reachOf(ctx, W, grp, army.prov, THREAT_DAYS + 5) <= THREAT_DAYS + 5);
  let best = null, bestScore = -Infinity;
  for (const [id, days] of tr.dist) {
    if (id === army.prov || days > 25) continue;
    const p = ctx.byId(id);
    if (!p || !(p.controller === W.tag || sameSide(ctx, W.tag, p.controller))) continue;
    let first = Infinity;
    for (const grp of threats) first = Math.min(first, reachOf(ctx, W, grp, id, 40));
    if (days + 1 >= first) continue; // they would catch us on the road or there
    const friends = W.friendsAt.get(id) || [];
    const mineThere = W.mine.filter((a) => a !== army && a.prov === id);
    const safe = !threats.length || holds(ctx, W, [army, ...mineThere], id, 20);
    // Run home, and uphill: our own country feeds us and the hills fight for
    // us. Running is not a reason to march into a corner of somebody else's.
    const terr = ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[p.terrain] : null;
    const score = (safe ? 40 : 0) + Math.min(first, 20) + menOf(friends.concat(mineThere)) / 1000
      + (p.owner === W.tag ? 12 : 0) + (terr ? num(terr.defBonus, 0) * 4 : 0)
      + ((p.fort | 0) > 0 ? 3 : 0) - days * 0.8;
    if (score > bestScore) { bestScore = score; best = id; }
  }
  if (best) return marchTo(ctx, army, best, tr);
  // Nowhere to run: the best of bad choices is a fort at home.
  let fort = 0, fd = Infinity;
  for (const [id, days] of tr.dist) {
    const p = ctx.byId(id);
    if (p && p.controller === W.tag && (p.fort | 0) > 0 && days < fd) { fd = days; fort = id; }
  }
  if (fort && fort !== army.prov) return marchTo(ctx, army, fort, tr);
  return false;
}

// ------------------------------------------------------------ orders
function execute(ctx, W, plan, kind) {
  for (const a of plan.force) {
    const tr = W.travel.get(a.id);
    const d = tr.dist.get(plan.prov);
    if (kind === 'battle' && !plan.iDefend && plan.arrive - d > SYNC_DAYS && !beatenHere(ctx, W, a)) {
      halt(a); // wait for the slower columns: no arriving alone
      continue;
    }
    marchTo(ctx, a, plan.prov, tr);
  }
}

function idleOrders(ctx, W, army) {
  const tr = W.travel.get(army.id);
  if (beatenHere(ctx, W, army)) { evade(ctx, W, army); return; }
  // An army cut off from its bread goes home before it melts (SPEC §82).
  const here = ctx.byId(army.prov);
  const atHome = here && (here.controller === W.tag || sameSide(ctx, W.tag, here.controller));
  if (num(army.oosMonths) > 0 || !atHome) {
    let best = 0, bd = Infinity;
    for (const [id, days] of tr.dist) {
      const p = ctx.byId(id);
      if (p && p.owner === W.tag && p.controller === W.tag && days < bd) { bd = days; best = id; }
    }
    if (best) { marchTo(ctx, army, best, tr); return; }
  }
  // Nothing to do: stand somewhere useful — in our own country, between the
  // enemy and the most valuable ground he could reach, and not so many
  // regiments in one place that the land cannot feed them.
  let target = null, bestScore = -Infinity;
  const nearest = W.groups.filter((grp) => !grp.inBattle);
  for (const [id, days] of tr.dist) {
    if (days > 30) continue;
    const p = ctx.byId(id);
    if (!p || p.controller !== W.tag) continue;
    let regs = 0;
    for (const a of W.mine) if (a !== army && a.prov === id) regs += regCount(a);
    if (regs + regCount(army) > supportLimit(ctx, p)) continue;
    let closeness = 0;
    for (const grp of nearest) {
      const r = reachOf(ctx, W, grp, id, 30);
      if (Number.isFinite(r)) closeness = Math.max(closeness, 30 - r);
    }
    const terr = ctx.DEFINES.TERRAINS ? ctx.DEFINES.TERRAINS[p.terrain] : null;
    const score = closeness * 0.5 + devTotal(p) * 0.15 + (p.fort | 0) * 1.5
      + (terr ? num(terr.defBonus, 0) * 2 : 0) - days * 0.4;
    if (score > bestScore) { bestScore = score; target = id; }
  }
  if (target && target !== army.prov && holds(ctx, W, [army], target, THREAT_DAYS)) marchTo(ctx, army, target, tr);
  else halt(army);
}

// Co-located armies fight as one anyway, so the planner keeps them apart
// (two armies can hold two places). The exception is a remnant: under three
// regiments it is a battle the enemy wins for two points, so it folds into a
// bigger army standing beside it — never past what the province can feed,
// and never inside a siege camp, where a fresh detachment is waiting for its
// orders.
function consolidate(ctx, W) {
  const byProv = new Map();
  for (const a of W.mine) {
    if (a.inBattle || (a.path && a.path.length)) continue;
    if (!byProv.has(a.prov)) byProv.set(a.prov, []);
    byProv.get(a.prov).push(a);
  }
  for (const [prov, list] of byProv) {
    if (list.length < 2) continue;
    const p = ctx.byId(prov);
    if (!p || (p.siege && sameSide(ctx, W.tag, p.siege.by))) continue;
    const limit = supportLimit(ctx, p);
    list.sort((x, y) => y.men - x.men || x.id - y.id);
    const head = list[0];
    for (let i = 1; i < list.length; i++) {
      if (regCount(list[i]) >= 3 && regCount(head) >= 3) continue;
      if (regCount(head) + regCount(list[i]) > limit) continue;
      if (mergeInto(ctx, list[i].id, head.id)) W.mine = W.mine.filter((a) => a !== list[i]);
    }
  }
}

// A big army with nothing near that could beat half of it sends a
// detachment after the next town — war score comes from ground held, and one
// host can only stand in one place.
function detach(ctx, W, plans) {
  if (W.mine.length >= 8) return;
  for (const plan of plans) {
    if (plan.kind !== 'siege' || plan.force.length !== 1) continue;
    const a = plan.force[0];
    if (a.prov !== plan.prov) continue;
    const spare = regCount(a) - plan.need;
    if (spare < Math.max(4, plan.need + 2)) continue;
    const halfMen = a.men / 2;
    const near = W.groups.some((grp) => !grp.inBattle && grp.men > halfMen * 0.6
      && reachOf(ctx, W, grp, a.prov, 20) <= 20);
    if (near) continue;
    splitArmyCore(ctx, a);
    return; // one a pass; the detachment gets its orders next time
  }
}

// ------------------------------------------------------------ the planner
// `opts.passive`: a scripted lull (aiPassive) holds every army where it is —
// except one that would be destroyed standing there, which steps out of the
// way. A lull is a court that will not start anything; it is not a court that
// waits to be wiped out.
export function planWar(ctx, tag, opts) {
  const passive = !!(opts && opts.passive);
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t || !t.alive) return;
  if (ceasefireHolds(ctx)) return;
  let W = readWar(ctx, tag);
  if (!W.mine.length) return;
  consolidate(ctx, W);
  W = readWar(ctx, tag);
  if (!W.mine.length) return;

  // An army that would lose where it stands leaves first; everything else
  // is assigned from what is still free.
  const free = new Set();
  for (const a of W.mine) {
    const p = ctx.byId(a.prov);
    const danger = beatenHere(ctx, W, a);
    if (danger) {
      // A siege that falls before the relief can arrive is finished first:
      // the town is taken and the army leaves from inside its walls.
      const inSiege = p && p.siege && sameSide(ctx, tag, p.siege.by);
      let regs = 0;
      for (const o of W.mine) if (o.prov === a.prov) regs += regCount(o);
      const finishes = inSiege && siegeDays(ctx, p, regs, p.siege.by) + 1 < danger;
      if (!finishes) { evade(ctx, W, a); continue; }
    }
    free.add(a);
  }
  if (passive) return;

  // What each of our own towns is worth to hold: its share of our side's
  // development, as the occupation score reads it.
  {
    const wars = warsOf(ctx, tag);
    const cache = new Map();
    W.townValue = (id) => {
      const p = ctx.byId(id);
      if (!p || p.impassable || !(p.controller === tag || sameSide(ctx, tag, p.controller))) return 0;
      let best = 0;
      for (const w of wars) {
        const key = w.attackers.indexOf(tag) >= 0 ? 'def' : 'att';
        const k = w.id + ':' + key;
        if (!cache.has(k)) cache.set(k, Math.max(1, sideComponents(ctx, w, key).enemyDev));
        best = Math.max(best, devTotal(p) / cache.get(k) * 60);
      }
      return best;
    };
  }
  // Only what some army of ours can actually reach is a task.
  const reach = new Set();
  for (const tr of W.travel.values()) for (const id of tr.dist.keys()) reach.add(id);
  const tasks = [
    ...battleTasks(ctx, W).filter((task) => task.spots.some((s) => reach.has(s.prov))),
    ...provinceTasks(ctx, W).filter((task) => reach.has(task.prov)),
    ...guardTasks(ctx, W).filter((task) => reach.has(task.prov)),
  ];
  // The nearest and most valuable first; the tail cannot win an assignment.
  tasks.sort((x, y) => y.value - x.value);
  const pool = tasks.slice(0, 40);
  const plans = [];
  while (free.size && pool.length) {
    let pick = null, pickIdx = -1;
    for (let i = 0; i < pool.length; i++) {
      const task = pool[i];
      const plan = task.kind === 'battle' ? planBattle(ctx, W, task, free)
        : task.kind === 'siege' ? planSiege(ctx, W, task, free)
          : planGuard(ctx, W, task, free);
      if (!plan) continue;
      if (!pick || plan.score > pick.score) { pick = { ...plan, kind: task.kind }; pickIdx = i; }
    }
    if (!pick) break;
    pool.splice(pickIdx, 1);
    // One errand per province: a siege and a guard of the same place are one.
    for (let i = pool.length - 1; i >= 0; i--) if (pool[i].prov === pick.prov) pool.splice(i, 1);
    for (const a of pick.force) free.delete(a);
    execute(ctx, W, pick, pick.kind);
    plans.push(pick);
    if (opts && Array.isArray(opts.log)) {
      opts.log.push({ kind: pick.kind, prov: pick.prov, score: pick.score, armies: pick.force.map((a) => a.id) });
    }
  }
  for (const a of free) idleOrders(ctx, W, a);
  detach(ctx, W, plans);
}

// ------------------------------------------------------------ the march guard
// Between plans the world moves: a column ordered somewhere a week ago may be
// a day from a province an enemy host has since walked into. Every day, an
// AI column about to arrive where hostile armies stand checks the odds of the
// fight it is about to start — with every friend already there and every
// comrade arriving the same day — and halts short if they are worse than
// even. The next plan decides what it does instead.
export function aiMarchGuard(ctx) {
  const g = ctx.game;
  const arriving = new Map();
  for (const id in g.armies) {
    const a = g.armies[id];
    if (!a || a.inBattle || a.retreating || a.aboard || !a.path || !a.path.length) continue;
    if (num(a.moveDaysLeft) > 1) continue;
    const next = a.path[0];
    if (!arriving.has(next)) arriving.set(next, []);
    arriving.get(next).push(a);
  }
  for (const [prov, cols] of arriving) {
    for (const a of cols) {
      const t = g.tags[a.tag];
      if (a.tag === 'REB' || !t || !t.ai) continue; // only the AI's columns are guarded
      // Whoever stands there, and whoever else is walking in tomorrow.
      const foes = cols.filter((c) => isHostile(ctx, a.tag, c.tag));
      for (const id in g.armies) {
        const o = g.armies[id];
        if (o && o.prov === prov && fit(o) && isHostile(ctx, a.tag, o.tag)) foes.push(o);
      }
      if (!foes.length) continue;
      const ours = cols.filter((c) => sameSide(ctx, a.tag, c.tag));
      for (const id in g.armies) {
        const o = g.armies[id];
        if (o && o.prov === prov && fit(o) && !o.inBattle && sameSide(ctx, a.tag, o.tag)) ours.push(o);
      }
      if (winChance(ctx, ours, foes, prov) < STAND_ODDS) { a.path = []; a.moveDaysLeft = 0; }
    }
  }
}

// ------------------------------------------------------------ the watch
// The planner looks at the field on a calendar; the enemy does not march on
// one. Every day, each AI army checks the routes of every column marching
// against it: if one will stand in its province inside WATCH_DAYS — long
// enough to march out of the way — and would win when it got there, that
// court plans again at once instead of waiting for its next look. A court
// re-plans on the watch at most once every three days.
const WATCH_DAYS = THREAT_DAYS;
export function aiDangerWatch(ctx) {
  const g = ctx.game;
  const incoming = new Map(); // prov -> [{ a, eta }]
  for (const id in g.armies) {
    const a = g.armies[id];
    if (!a || !a.path || !a.path.length || a.inBattle || a.retreating || a.aboard) continue;
    const eta = pathEta(ctx, a);
    for (const [prov, d] of eta) {
      if (d <= 0 || d > WATCH_DAYS) continue;
      if (!incoming.has(prov)) incoming.set(prov, []);
      incoming.get(prov).push({ a, eta: d });
    }
  }
  if (!incoming.size) return;
  const today = g.date.y * 400 + g.date.m * 32 + g.date.d;
  const replan = new Set();
  for (const id in g.armies) {
    const a = g.armies[id];
    if (!fit(a) || a.inBattle || a.tag === 'REB') continue;
    const t = g.tags[a.tag];
    if (!t || !t.ai || replan.has(a.tag)) continue;
    if (Number.isFinite(t._watchDay) && today - t._watchDay < 3) continue;
    const list = incoming.get(a.prov);
    if (!list) continue;
    const foes = list.filter((x) => isHostile(ctx, a.tag, x.a.tag)).map((x) => x.a);
    if (!foes.length) continue;
    const ours = [];
    for (const oid in g.armies) {
      const o = g.armies[oid];
      if (o && o.prov === a.prov && fit(o) && !o.inBattle && sameSide(ctx, a.tag, o.tag)) ours.push(o);
    }
    if (winChance(ctx, foes, ours, a.prov) >= STAND_ODDS) replan.add(a.tag);
  }
  for (const tag of replan) {
    g.tags[tag]._watchDay = today;
    try { planWar(ctx, tag, { passive: !!(g.tags[tag].modifiers || []).some((m) => m && m.effects && m.effects.aiPassive) }); }
    catch (e) { warnOnce('watch:' + tag, 'watch re-plan failed for', tag, e); }
  }
}

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/ai_war]', ...args);
}
