// js/sim/trade.js — markets, merchants and the sea lanes (SPEC §292). DOM-free.
//
// EU4's trade, in this world. Every province belongs to a market (a node,
// js/data/trade_nodes.js). A node is worth what its provinces produce plus
// what flows into it from upstream. Every court with TRADE POWER in a node
// holds a share of that value: its provinces there, its merchants posted
// there, its warships protecting the lanes. A court COLLECTS its share in its
// home node (the node of its capital), and anywhere it has posted a merchant
// to collect. Everywhere else its share is not money but direction: it STEERS
// that much of the value downstream, toward home by default, or wherever a
// merchant posted to steer sends it. The court that holds a node's own market
// town collects there too, without a merchant: the customs house is its. What
// nobody collects runs on, node to node, to the end of the roads (Tyre, Rome
// or Byzantion, by age), which keeps whatever reaches it.
//
// Merchants are built: a merchant ship at a shipyard harbor, a caravan at a
// market town or the capital. Each is sent to a node, travels there (on the
// sea route, or overland), and gives its court power there while it stays.
// Warships can PROTECT trade in a node (more power) or RAID it: a raider takes
// a share of the node's value before anyone else does, and a raider at war
// with a posted merchant ship's court may take the ship.
//
// Everything that pays here pays through tradeIncome (economy.js), so it is
// part of the month's net like every other line of the ledger.

import { TRADE_NODES, TRADE_NODE_BY_ID, tradeGraph, tradeAgeOf } from '../data/trade_nodes.js';
import {
  num, clamp, devTotal, hasBuilding, isHostile, sameSide, resolveTagMult, addOpinion, chronicle,
  capitalProvince, isHumanChair, ceasefireHolds,
} from './military.js';
import { isCoastal, blockadedBy, fleetPowerOf, issueFleetMove, merchantHopDays } from './navy.js';
import { embargoTradeMult } from './embargo.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/trade]', ...args);
}

export const TRADE = {
  goodsPerProd: 0.2,       // goods a point of production development yields (EU4)
  valueScale: 0.1,         // talents a month per goods × price (calibrated, SPEC §292)
  offmapScale: 0.7,        // the off-map inflow of the source nodes, scaled with it
  powerPerDev: 0.2,        // a province's trade power per point of development
  coastPower: 1,           // a harbor
  marketPower: 2,
  shipyardPower: 1,
  centerPower: 5,          // the node's own market town
  blockadedPowerMult: 0.5, // a hostile squadron off the port
  merchantPower: 8,        // a posted merchant
  protectPowerPerShip: 2,  // a warship guarding the lanes
  raidPowerPerShip: 2,     // a warship taking prizes
  steerBonusEach: 0.05,    // each merchant steering a lane adds this to what flows along it…
  steerBonusCap: 0.25,     // …up to this
  shipCost: 30,
  caravanCost: 20,
  capBase: 2,              // merchants a court may keep: two…
  capPerWorks: 3,          // …and one more for every three markets and shipyards it holds
  capMax: 6,
  shipPxPerDay: 22,
  caravanPxPerDay: 16,
  captureMax: 0.3,         // the most a month at sea under raiders can cost a ship
  peaceRaidOpinion: -4,    // what a month of privateering in peace costs with the courts it robs
};

// ------------------------------------------------------------ the geography --
// Province → node, by the base map's name (a chapter may rename a province,
// never move it). Placed by hand where the data says; else the nearest center.
let _nodeOfName = null;
function nodeOfBaseName(MAP_DATA) {
  if (_nodeOfName) return _nodeOfName;
  const m = new Map();
  const provs = (MAP_DATA && MAP_DATA.provinces) || [];
  const at = new Map(provs.map((p) => [p.name, p]));
  for (const n of TRADE_NODES) {
    m.set(n.center, n.id);
    for (const name of n.members) m.set(name, n.id);
  }
  const centers = TRADE_NODES.map((n) => ({ id: n.id, p: at.get(n.center) })).filter((c) => c.p);
  for (const p of provs) {
    if (!p || m.has(p.name)) continue;
    let best = null;
    let bestD = Infinity;
    for (const c of centers) {
      const dx = (num(p.lon) - num(c.p.lon)) * Math.cos((num(p.lat) * Math.PI) / 180);
      const dy = num(p.lat) - num(c.p.lat);
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = c.id; }
    }
    if (best) m.set(p.name, best);
  }
  _nodeOfName = m;
  return m;
}

export function nodeOfProv(ctx, id) {
  const src = ctx.MAP_DATA && ctx.MAP_DATA.provinces ? ctx.MAP_DATA.provinces[id - 1] : null;
  const p = ctx.byId(id);
  const name = (src && src.name) || (p && (p.canon || p.name));
  return name ? nodeOfBaseName(ctx.MAP_DATA).get(name) || null : null;
}

// A node's market town, by the base map's name: a chapter's label (1948's
// Cádiz for Gades) must not lose the node its town. Where a chapter folds the
// town into a larger province (SPEC §232), that province is the town, if it
// is still in the node; folded into another node's province (1948's Soviet
// Union holds Merv), the node has no town: it is beyond the frame, its goods
// still flow, but no merchant goes there and nobody keeps its customs.
let _idOfBaseName = null;
export function nodeCenterId(ctx, nodeId) {
  const n = TRADE_NODE_BY_ID[nodeId];
  if (!n) return 0;
  const provs = ctx.MAP_DATA && ctx.MAP_DATA.provinces;
  if (!provs) return ctx.provId ? ctx.provId(n.center) || 0 : 0;
  if (!_idOfBaseName) _idOfBaseName = new Map(provs.map((p, i) => [p && p.name, i + 1]));
  const base = _idOfBaseName.get(n.center) || 0;
  const id = base && ctx.provinceMap && ctx.provinceMap[base] ? ctx.provinceMap[base] : base;
  if (!id || !ctx.game || !ctx.game.provinces[id]) return 0;
  return id === base || nodeOfProv(ctx, id) === nodeId ? id : 0;
}

// The age's graph (js/data/trade_nodes.js): where the roads end moves with
// the centuries, Tyre, then Rome, then Byzantion.
export function graphOf(ctx) {
  const id = (ctx.bookmark && ctx.bookmark.id) || ctx.game.bookmarkId;
  return tradeGraph(tradeAgeOf(id));
}
// The lane out of `from` that leads to `home`, or null if home is not downstream.
function laneToward(G, from, home) {
  if (!home || from === home) return null;
  for (const t of G.to[from]) if (t === home || G.reach[t].has(home)) return t;
  return null;
}

export function homeNodeOf(ctx, tag) {
  try {
    const cap = capitalProvince(ctx, tag);
    return cap ? nodeOfProv(ctx, cap.id) : null;
  } catch (e) { warnOnce('home', e); return null; }
}

// ---------------------------------------------------------------- the flow --
function goodPrice(ctx, good) {
  const g = ctx.DEFINES && ctx.DEFINES.GOODS ? ctx.DEFINES.GOODS[good] : null;
  return g ? num(g.price, 2) : 2;
}

function provPower(ctx, p) {
  let pw = devTotal(p) * TRADE.powerPerDev;
  if (isCoastal(ctx, p.id)) pw += TRADE.coastPower;
  if (hasBuilding(p, 'market')) pw += TRADE.marketPower;
  if (hasBuilding(p, 'shipyard')) pw += TRADE.shipyardPower;
  if (blockadedBy(ctx, p.id)) pw *= TRADE.blockadedPowerMult;
  return pw;
}

// Is this fleet on its trade mission now (at anchor in the node)?
export function fleetMissionActive(ctx, f) {
  if (!f || !f.mission || f.ships <= 0) return false;
  if (Array.isArray(f.path) && f.path.length) return false;
  return nodeOfProv(ctx, f.prov) === f.mission.node;
}

const _cache = new WeakMap();
// Bump after anything that changes trade within a day (orders, missions).
export function touchTrade(g) { if (g) g.tradeRev = num(g.tradeRev) + 1; }

// The whole month's trade, every node upstream first. Cached per game, day
// and revision: the economy asks for it once per court, the panels per frame.
export function computeTrade(ctx) {
  const g = ctx.game;
  const key = `${g.date.y}.${g.date.m}.${g.date.d}|${num(g.tradeRev)}`;
  const hit = _cache.get(g);
  if (hit && hit.key === key) return hit.res;
  const res = computeTradeNow(ctx);
  _cache.set(g, { key, res });
  return res;
}

function computeTradeNow(ctx) {
  const g = ctx.game;
  const G = graphOf(ctx);
  const nodes = {};
  for (const n of TRADE_NODES) {
    nodes[n.id] = {
      id: n.id, local: 0, incoming: 0, value: 0, out: {}, power: {}, raid: {},
      collect: {}, steer: {}, collected: {}, stolen: {}, totalPower: 0, totalRaid: 0, merchants: {}, protect: {},
    };
  }
  const homes = {};
  const home = (tag) => {
    if (!(tag in homes)) homes[tag] = homeNodeOf(ctx, tag);
    return homes[tag];
  };
  // who holds each node's market town (owned and controlled, not besieged)
  const customs = {};
  for (const n of TRADE_NODES) {
    const c = ctx.byId(nodeCenterId(ctx, n.id));
    if (c && c.owner && c.owner === c.controller && !c.siege) customs[n.id] = c.owner;
  }
  // goods from beyond the map enter at the sources
  for (const n of TRADE_NODES) if (n.offmap) nodes[n.id].local += num(n.offmap) * TRADE.offmapScale;
  // provinces: goods and power
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p) continue;
    const nid = nodeOfProv(ctx, i);
    const N = nid && nodes[nid];
    if (!N) continue;
    N.local += num(p.dev && p.dev.prod) * TRADE.goodsPerProd * goodPrice(ctx, p.good) * TRADE.valueScale;
    if (p.impassable || !p.owner || p.owner === 'REB' || p.owner !== p.controller || p.siege) continue;
    const t = g.tags[p.owner];
    if (!t || !t.alive) continue;
    let pw = provPower(ctx, p);
    if (TRADE_NODE_BY_ID[nid].center === (p.canon || p.name) || nodeCenterId(ctx, nid) === i) pw += TRADE.centerPower;
    N.power[p.owner] = num(N.power[p.owner]) + pw;
  }
  // merchants posted
  for (const m of g.merchants || []) {
    if (!m || m.state !== 'posted' || !nodes[m.node]) continue;
    const t = g.tags[m.tag];
    if (!t || !t.alive) continue;
    const N = nodes[m.node];
    N.power[m.tag] = num(N.power[m.tag]) + TRADE.merchantPower;
    N.merchants[m.tag] = N.merchants[m.tag] || [];
    N.merchants[m.tag].push(m);
  }
  // fleets on trade missions
  for (const f of Object.values(g.fleets || {})) {
    if (!fleetMissionActive(ctx, f)) continue;
    const t = g.tags[f.tag];
    if (!t || !t.alive) continue;
    const N = nodes[f.mission.node];
    const strength = f.ships * fleetPowerOf(ctx, f);
    if (f.mission.kind === 'raid') {
      N.raid[f.tag] = num(N.raid[f.tag]) + strength * TRADE.raidPowerPerShip;
    } else {
      N.power[f.tag] = num(N.power[f.tag]) + strength * TRADE.protectPowerPerShip;
      N.protect[f.tag] = num(N.protect[f.tag]) + strength * TRADE.protectPowerPerShip;
    }
  }
  // flow, upstream first
  const income = {};
  for (const id of G.order) {
    const N = nodes[id];
    const to = G.to[id];
    N.value = N.local + N.incoming;
    let P = 0;
    for (const k in N.power) P += N.power[k];
    let R = 0;
    for (const k in N.raid) R += N.raid[k];
    N.totalPower = P;
    N.totalRaid = R;
    let V = N.value;
    if (R > 0) {
      for (const k in N.raid) {
        const s = V * (N.raid[k] / (P + R));
        N.stolen[k] = s;
        income[k] = num(income[k]) + s;
      }
      V = V * (P / (P + R));
    }
    const lanes = {};
    for (const t of to) lanes[t] = 0;
    const steering = {};
    if (P <= 0) {
      // nobody holds power here: it all runs on, evenly, or (at the end) is lost
      for (const t of to) lanes[t] += V / to.length;
    } else {
      for (const tag in N.power) {
        const share = V * (N.power[tag] / P);
        const ms = N.merchants[tag] || [];
        const steerM = ms.find((m) => m.order === 'steer' && to.indexOf(m.steerTo) >= 0);
        const collects = !to.length || home(tag) === id || customs[id] === tag || ms.some((m) => m.order === 'collect');
        if (collects && !steerM) {
          N.collect[tag] = share;
          N.collected[tag] = share;
          income[tag] = num(income[tag]) + share;
          continue;
        }
        const lane = (steerM && steerM.steerTo) || laneToward(G, id, home(tag));
        N.steer[tag] = { to: lane || null, amount: share };
        if (lane) {
          lanes[lane] += share;
        } else {
          for (const t of to) lanes[t] += share / to.length;
        }
        for (const m of ms) if (m.order === 'steer' && m.steerTo) steering[m.steerTo] = num(steering[m.steerTo]) + 1;
      }
    }
    for (const t of to) {
      const bonus = Math.min(TRADE.steerBonusCap, num(steering[t]) * TRADE.steerBonusEach);
      const amt = lanes[t] * (1 + bonus);
      N.out[t] = amt;
      nodes[t].incoming += amt;
    }
  }
  return { nodes, income, homes, customs, graph: G };
}

// What a court earns from trade this month, after its own efficiency (the
// tradeMult of tech and ideas) and any embargo on it.
export function tradeIncomeOf(ctx, tag) {
  const res = computeTrade(ctx);
  const raw = num(res.income[tag]);
  if (!raw) return 0;
  return raw * resolveTagMult(ctx, tag, 'tradeMult') * embargoTradeMult(ctx, tag);
}

// --------------------------------------------------------------- merchants --
export function merchantsOf(ctx, tag) {
  return (ctx.game.merchants || []).filter((m) => m && m.tag === tag);
}

export function merchantCap(ctx, tag) {
  let works = 0;
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.owner !== tag) continue;
    if (hasBuilding(p, 'market')) works++;
    if (hasBuilding(p, 'shipyard')) works++;
  }
  return clamp(TRADE.capBase + Math.floor(works / TRADE.capPerWorks), TRADE.capBase, TRADE.capMax);
}

function shipHomeOk(ctx, tag, id) {
  const p = ctx.byId(id);
  return !!p && p.owner === tag && p.controller === tag && isCoastal(ctx, id)
    && hasBuilding(p, 'shipyard') && !p.siege && !blockadedBy(ctx, id);
}
function caravanHomeOk(ctx, tag, id) {
  const p = ctx.byId(id);
  if (!p || p.owner !== tag || p.controller !== tag || p.siege) return false;
  if (hasBuilding(p, 'market')) return true;
  const cap = capitalProvince(ctx, tag);
  return !!cap && cap.id === id;
}

// Can a merchant of this kind be fitted out here?
export function buildMerchantInfo(ctx, tag, provId, kind) {
  const t = ctx.game.tags[tag];
  const cost = kind === 'ship' ? TRADE.shipCost : TRADE.caravanCost;
  const have = merchantsOf(ctx, tag).length;
  const cap = merchantCap(ctx, tag);
  let why = '';
  if (!t) why = 'No such court.';
  else if (kind === 'ship' && !shipHomeOk(ctx, tag, provId)) why = 'A merchant ship is fitted out at a working shipyard harbor of ours.';
  else if (kind === 'caravan' && !caravanHomeOk(ctx, tag, provId)) why = 'A caravan sets out from a market town of ours, or the capital.';
  else if (have >= cap) why = 'We keep ' + cap + ' merchants and no more (two, and one for every three markets and shipyards we hold).';
  else if (num(t.treasury) < cost) why = (kind === 'ship' ? 'A merchant ship' : 'A caravan') + ' costs ' + cost + ' talents.';
  return { can: !why, why, cost, have, cap, kind };
}

export function buildMerchantCore(ctx, tag, provId, kind) {
  const info = buildMerchantInfo(ctx, tag, provId, kind);
  if (!info.can) return { ok: false, why: info.why };
  const g = ctx.game;
  const t = g.tags[tag];
  t.treasury = num(t.treasury) - info.cost;
  if (!Array.isArray(g.merchants)) g.merchants = [];
  if (!Number.isFinite(g.nextMerchantId)) g.nextMerchantId = 1;
  const m = { id: g.nextMerchantId++, tag, kind, home: provId, at: provId, state: 'home', node: null, order: null, steerTo: null };
  g.merchants.push(m);
  touchTrade(g);
  return { ok: true, merchant: m, cost: info.cost };
}

// Where a merchant is now: a province id (home, or the center it is posted at).
function merchantSpot(ctx, m) {
  if (m.state === 'posted') return nodeCenterId(ctx, m.node);
  return m.at || m.home;
}

// The overland road for a caravan: a breadth-first walk over the land
// adjacency, the provinces it passes, or null if no road joins them.
function landPath(ctx, fromId, toId) {
  if (fromId === toId) return [fromId];
  const nb = ctx.geom && ctx.geom.neighbors;
  if (!nb) return [fromId, toId];
  const prev = new Map([[fromId, 0]]);
  let frontier = [fromId];
  while (frontier.length) {
    const next = [];
    for (const id of frontier) {
      for (const n of nb[id] || []) {
        if (prev.has(n) || !ctx.byId(n)) continue;
        prev.set(n, id);
        if (n === toId) {
          const out = [toId];
          for (let c = id; c; c = prev.get(c)) out.push(c);
          return out.reverse();
        }
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}
function pathLen(ctx, path) {
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    const a = ctx.byId(path[i - 1]);
    const b = ctx.byId(path[i]);
    if (a && b) len += Math.hypot(num(b.x) - num(a.x), num(b.y) - num(a.y));
  }
  return len;
}

// How a merchant gets from where it is to a node's market: days, and for a
// caravan the road. Null if this kind cannot get there.
export function merchantRoute(ctx, m, nodeId) {
  const to = nodeCenterId(ctx, nodeId);
  const from = merchantSpot(ctx, m);
  if (!to || !from) return null;
  if (m.kind === 'ship') {
    if (!isCoastal(ctx, to) || !isCoastal(ctx, from)) return null;
    return { to, from, days: from === to ? 0 : merchantHopDays(ctx, from, to) };
  }
  const path = landPath(ctx, from, to);
  if (!path) return null;
  return { to, from, path, days: from === to ? 0 : clamp(Math.round(3 + pathLen(ctx, path) / TRADE.caravanPxPerDay), 3, 90) };
}

function validOrder(ctx, nodeId, order, steerTo) {
  const def = TRADE_NODE_BY_ID[nodeId];
  if (!def) return 'No such market.';
  if (order !== 'collect' && order !== 'steer') return 'A merchant collects or steers.';
  const to = graphOf(ctx).to[nodeId];
  if (order === 'steer' && !to.length) return def.name + ' is where the roads end: there is nowhere to steer from it.';
  if (order === 'steer' && to.indexOf(steerTo) < 0) return 'A merchant steers trade down one of the lanes out of its market.';
  return '';
}

// Send a merchant to a node with an order. Already there: the order changes
// at once. Elsewhere: it travels, and serves when it arrives.
export function sendMerchantCore(ctx, tag, merchantId, nodeId, order, steerTo) {
  const g = ctx.game;
  const m = (g.merchants || []).find((x) => x && x.id === merchantId && x.tag === tag);
  if (!m) return { ok: false, why: 'No such merchant of ours.' };
  const bad = validOrder(ctx, nodeId, order, steerTo);
  if (bad) return { ok: false, why: bad };
  if (m.state === 'out' || m.state === 'back') return { ok: false, why: 'The merchant is on the road. Send it on when it arrives.' };
  if (m.state === 'posted' && m.node === nodeId) {
    m.order = order;
    m.steerTo = order === 'steer' ? steerTo : null;
    touchTrade(g);
    return { ok: true, days: 0, merchant: m };
  }
  const r = merchantRoute(ctx, m, nodeId);
  if (!r) {
    return { ok: false, why: m.kind === 'ship'
      ? 'A merchant ship sails only to a market on the sea.'
      : 'No road joins the caravan to that market.' };
  }
  m.node = nodeId;
  m.order = order;
  m.steerTo = order === 'steer' ? steerTo : null;
  m.from = r.from;
  m.to = r.to;
  m.path = r.path || null;
  m.daysTotal = Math.max(1, r.days);
  m.daysLeft = m.daysTotal;
  m.state = r.days > 0 ? 'out' : 'posted';
  touchTrade(g);
  return { ok: true, days: r.days, merchant: m };
}

// Bring a merchant home (it serves nowhere while it travels).
export function recallMerchantCore(ctx, tag, merchantId) {
  const g = ctx.game;
  const m = (g.merchants || []).find((x) => x && x.id === merchantId && x.tag === tag);
  if (!m) return { ok: false, why: 'No such merchant of ours.' };
  if (m.state === 'home') return { ok: false, why: 'The merchant is already home.' };
  if (m.state === 'out' || m.state === 'back') return { ok: false, why: 'The merchant is on the road.' };
  sendHome(ctx, m);
  touchTrade(g);
  return { ok: true, merchant: m };
}

function sendHome(ctx, m) {
  const from = merchantSpot(ctx, m);
  const home = homeFor(ctx, m);
  m.node = null;
  m.order = null;
  m.steerTo = null;
  if (!home) { m.lost = true; return; }
  m.home = home;
  if (!from || from === home) { m.state = 'home'; m.at = home; return; }
  let days = 0;
  let path = null;
  if (m.kind === 'ship') days = merchantHopDays(ctx, from, home);
  else {
    path = landPath(ctx, from, home) || [from, home];
    days = clamp(Math.round(3 + pathLen(ctx, path) / TRADE.caravanPxPerDay), 3, 90);
  }
  m.state = 'back';
  m.from = from;
  m.to = home;
  m.path = path;
  m.daysTotal = days;
  m.daysLeft = days;
}

// A merchant's home: where it set out, while that is still ours and working;
// else another harbor (a ship) or the capital (a caravan); else nowhere.
function homeFor(ctx, m) {
  const ok = m.kind === 'ship' ? shipHomeOk : caravanHomeOk;
  if (ok(ctx, m.tag, m.home)) return m.home;
  const g = ctx.game;
  if (m.kind === 'ship') {
    for (let i = 1; i < g.provinces.length; i++) if (shipHomeOk(ctx, m.tag, i)) return i;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (p && p.owner === m.tag && p.controller === m.tag && isCoastal(ctx, i)) return i;
    }
    return 0;
  }
  const cap = capitalProvince(ctx, m.tag);
  return cap ? cap.id : 0;
}

// Daily: merchants on the road make their way; arrivals take up their post.
export function merchantsDaily(ctx) {
  const g = ctx.game;
  const list = g.merchants;
  if (!Array.isArray(list) || !list.length) return;
  let changed = false;
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    const t = m && g.tags[m.tag];
    if (!m || !t || !t.alive || m.lost) { list.splice(i, 1); changed = true; continue; }
    if (m.state !== 'out' && m.state !== 'back') continue;
    m.daysLeft = num(m.daysLeft) - 1;
    if (m.daysLeft > 0) continue;
    changed = true;
    if (m.state === 'out') { m.state = 'posted'; m.at = m.to; }
    else { m.state = 'home'; m.at = m.to; }
  }
  if (changed) touchTrade(g);
}

// Monthly: raiders take prizes; peacetime privateering costs goodwill.
export function tradeMonthly(ctx) {
  const g = ctx.game;
  if (!Array.isArray(g.merchants)) g.merchants = [];
  const res = computeTrade(ctx);
  // a merchant ship posted where hostile raiders work may be taken
  for (let i = g.merchants.length - 1; i >= 0; i--) {
    const m = g.merchants[i];
    if (!m || m.kind !== 'ship' || m.state !== 'posted') continue;
    const N = res.nodes[m.node];
    if (!N || !(N.totalRaid > 0)) continue;
    let hostile = 0;
    let taker = null;
    for (const k in N.raid) {
      if (!isHostile(ctx, k, m.tag)) continue;
      hostile += N.raid[k];
      if (!taker || N.raid[k] > N.raid[taker]) taker = k;
    }
    if (!hostile) continue;
    let guard = 0;
    for (const k in N.protect) if (k === m.tag || sameSide(ctx, k, m.tag)) guard += N.protect[k];
    const p = clamp((hostile / (hostile + guard + 20)) * TRADE.captureMax, 0, TRADE.captureMax);
    if (!ctx.rng.chance(p)) continue;
    g.merchants.splice(i, 1);
    touchTrade(g);
    const nodeName = TRADE_NODE_BY_ID[m.node].name;
    const takerName = (g.tags[taker] && g.tags[taker].name) || taker;
    const ownerName = (g.tags[m.tag] && g.tags[m.tag].name) || m.tag;
    chronicle(ctx, 'trade', takerName + '\'s raiders take a merchant ship of ' + ownerName + ' off ' + nodeName + '.');
    if (isHumanChair(g, m.tag)) {
      ctx.bus.emit('notify', { title: 'A merchant ship is taken', text: 'Raiders of ' + takerName + ' take our merchant ship in the waters of ' + nodeName + '. Protect the lanes, or keep our ships out of them.', type: 'bad' });
    }
    if (isHumanChair(g, taker)) {
      ctx.bus.emit('notify', { title: 'A prize', text: 'Our raiders take a merchant ship of ' + ownerName + ' off ' + nodeName + '.', type: 'good' });
    }
  }
  // privateering in peace: the courts it robs remember
  for (const id in res.nodes) {
    const N = res.nodes[id];
    for (const raider in N.raid) {
      for (const victim in N.power) {
        if (victim === raider || isHostile(ctx, raider, victim) || sameSide(ctx, raider, victim)) continue;
        addOpinion(ctx, victim, raider, TRADE.peaceRaidOpinion);
      }
    }
  }
}

// ------------------------------------------------------------ fleet missions --
// A squadron set to protect or raid a node sails for its market town (or the
// nearest harbor of the node it can reach) and serves while it rides there.
export function setFleetMissionCore(ctx, tag, fleetId, kind, nodeId) {
  const g = ctx.game;
  const f = g.fleets && g.fleets[fleetId];
  if (!f || f.tag !== tag || f.ships <= 0) return { ok: false, why: 'No such squadron of ours.' };
  if (!kind) {
    f.mission = null;
    touchTrade(g);
    return { ok: true };
  }
  if (kind !== 'protect' && kind !== 'raid') return { ok: false, why: 'A squadron protects trade or raids it.' };
  const def = TRADE_NODE_BY_ID[nodeId];
  if (!def) return { ok: false, why: 'No such market.' };
  const station = missionStation(ctx, nodeId, f.prov, kind === 'raid' ? tag : null);
  if (!station) return { ok: false, why: def.name + ' has no harbor a squadron can ride off.' };
  if (station !== f.prov) {
    if (ceasefireHolds(ctx)) return { ok: false, why: 'The truce holds on the water too.' };
    if (!issueFleetMove(ctx, f, station)) return { ok: false, why: 'The squadron cannot sail there.' };
  }
  f.mission = { kind, node: nodeId };
  touchTrade(g);
  return { ok: true, station, stationName: (ctx.byId(station) || {}).name || '' };
}

// Where a squadron rides to serve a node: a guard at the market town if it is
// on the sea; a raider off a harbor of the node that no enemy of its own
// holds, so that working the lanes is not by itself a blockade of the
// enemy's port (a hostile squadron off a port blockades it, navy.js). Else
// the node's harbor nearest the squadron.
export function missionStation(ctx, nodeId, nearProv, raider) {
  const center = nodeCenterId(ctx, nodeId);
  if (!raider && center && isCoastal(ctx, center)) return center;
  const g = ctx.game;
  const near = ctx.byId(nearProv);
  let best = 0;
  let bestD = Infinity;
  for (let pass = 0; pass < 2 && !best; pass++) {
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || !isCoastal(ctx, i) || nodeOfProv(ctx, i) !== nodeId) continue;
      if (raider && pass === 0 && p.owner && isHostile(ctx, raider, p.owner)) continue;
      const d = near ? Math.hypot(num(p.x) - num(near.x), num(p.y) - num(near.y)) : 0;
      if (d < bestD) { bestD = d; best = i; }
    }
  }
  return best || (center && isCoastal(ctx, center) ? center : 0);
}

// ------------------------------------------------------------- what to show --
// A court's view of the trade of the world: every node, its value, our power
// and share there, what we take from it, and what we could take with one more
// merchant. Read by the Trade tab, the province panel and the map mode.
export function tradeView(ctx, tag) {
  const res = computeTrade(ctx);
  const G = res.graph;
  const g = ctx.game;
  const home = homeNodeOf(ctx, tag);
  const mult = resolveTagMult(ctx, tag, 'tradeMult') * embargoTradeMult(ctx, tag);
  const nodes = TRADE_NODES.map((def) => {
    const N = res.nodes[def.id];
    const mine = num(N.power[tag]);
    const share = N.totalPower > 0 ? mine / N.totalPower : 0;
    const top = Object.keys(N.power).sort((a, b) => N.power[b] - N.power[a]).slice(0, 4)
      .map((k) => ({ tag: k, name: (g.tags[k] && g.tags[k].name) || k, share: N.totalPower > 0 ? N.power[k] / N.totalPower : 0 }));
    const steer = N.steer[tag];
    // what one more merchant collecting here would bring (the AI's yardstick too)
    const withM = N.value * ((mine + TRADE.merchantPower) / (N.totalPower + TRADE.merchantPower));
    const collecting = N.collect[tag] != null;
    return {
      id: def.id, name: def.name, blurb: def.blurb, center: def.center, centerId: nodeCenterId(ctx, def.id),
      to: G.to[def.id].slice(), toNames: G.to[def.id].map((t) => TRADE_NODE_BY_ID[t].name), end: !G.to[def.id].length,
      local: N.local, incoming: N.incoming, value: N.value, out: { ...N.out },
      totalPower: N.totalPower, raid: N.totalRaid, myPower: mine, share,
      collecting, income: (num(N.collected[tag]) + num(N.stolen[tag])) * mult,
      steerTo: steer ? steer.to : null, steering: steer ? steer.amount : 0,
      stolen: num(N.stolen[tag]) * mult, raidedBy: Object.keys(N.raid),
      merchantGain: (collecting ? withM - num(N.collected[tag]) : withM) * mult,
      top, home: def.id === home, sea: isCoastal(ctx, nodeCenterId(ctx, def.id)),
      merchants: (N.merchants[tag] || []).length,
    };
  });
  const list = merchantsOf(ctx, tag).map((m) => ({
    id: m.id, kind: m.kind, state: m.state, node: m.node, nodeName: m.node ? TRADE_NODE_BY_ID[m.node].name : '',
    order: m.order, steerTo: m.steerTo, steerName: m.steerTo ? TRADE_NODE_BY_ID[m.steerTo].name : '',
    home: m.home, homeName: (ctx.byId(m.home) || {}).name || '', daysLeft: num(m.daysLeft),
  }));
  const fleets = Object.values(g.fleets || {}).filter((f) => f && f.tag === tag && f.ships > 0).map((f) => ({
    id: f.id, name: f.name, ships: f.ships, prov: f.prov, provName: (ctx.byId(f.prov) || {}).name || '',
    mission: f.mission ? { ...f.mission, nodeName: TRADE_NODE_BY_ID[f.mission.node] ? TRADE_NODE_BY_ID[f.mission.node].name : '' } : null,
    active: fleetMissionActive(ctx, f), node: nodeOfProv(ctx, f.prov),
  }));
  return {
    home, homeName: home ? TRADE_NODE_BY_ID[home].name : '', income: tradeIncomeOf(ctx, tag), mult,
    age: G.age, ends: G.sinks.map((id) => TRADE_NODE_BY_ID[id].name),
    cap: merchantCap(ctx, tag), merchants: list, nodes, fleets,
    costs: { ship: TRADE.shipCost, caravan: TRADE.caravanCost },
  };
}

// Where our merchants can be fitted out: shipyard harbors (ships) and
// market towns or the capital (caravans), each with what it would say.
export function buildSites(ctx, tag) {
  const g = ctx.game;
  const out = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.owner !== tag) continue;
    if (shipHomeOk(ctx, tag, i)) out.push({ prov: i, name: p.name, kind: 'ship', ...buildMerchantInfo(ctx, tag, i, 'ship') });
    if (caravanHomeOk(ctx, tag, i)) out.push({ prov: i, name: p.name, kind: 'caravan', ...buildMerchantInfo(ctx, tag, i, 'caravan') });
  }
  return out;
}

// The market a province belongs to, as our court sees it, and what can be
// fitted out there (the province panel's Market block).
export function provinceTrade(ctx, tag, provId) {
  const id = nodeOfProv(ctx, provId);
  if (!id) return null;
  const view = tradeView(ctx, tag);
  const node = view.nodes.find((n) => n.id === id) || null;
  const p = ctx.byId(provId);
  const ours = !!p && p.owner === tag;
  return {
    node, home: view.home === id, isCenter: !!node && node.centerId === provId,
    ship: ours && isCoastal(ctx, provId) && hasBuilding(p, 'shipyard') ? buildMerchantInfo(ctx, tag, provId, 'ship') : null,
    caravan: ours && caravanHomeOk(ctx, tag, provId) ? buildMerchantInfo(ctx, tag, provId, 'caravan') : null,
  };
}

// The nodes a merchant can be sent to, with the days it takes.
export function merchantTargets(ctx, tag, merchantId) {
  const m = merchantsOf(ctx, tag).find((x) => x.id === merchantId);
  if (!m) return [];
  const view = tradeView(ctx, tag);
  return view.nodes.map((n) => {
    const r = merchantRoute(ctx, m, n.id);
    return { ...n, reachable: !!r, days: r ? r.days : 0 };
  });
}

// ------------------------------------------------------------------ the AI --
// A court that can afford it keeps its merchants: builds up to its cap, and
// posts each one where one more merchant collects the most (or, upstream of
// home, steers home). At war it raids the enemy's richest lane it can reach
// and hunts raiders in its own; at peace a spare squadron guards home.
export function aiTrade(ctx, tag, opts) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (!t || !t.alive || tag === 'REB') return;
  const passive = !!(opts && opts.passive);
  if (!Array.isArray(g.merchants)) g.merchants = [];
  // build: one merchant at most every six months, and only from a surplus.
  // At war, a caravan only, and only from a deep purse: a merchant ship in a
  // war is a prize for the enemy's raiders, and a small court that keeps
  // replacing them ruins itself (the 614 harness, SPEC §292).
  const mine = merchantsOf(ctx, tag);
  const now = g.date.y * 12 + g.date.m;
  if (!t.aiState) t.aiState = {};
  const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
  const due = !Number.isFinite(t.aiState.merchantBuilt) || now - t.aiState.merchantBuilt >= 6;
  if (!passive && due && mine.length < merchantCap(ctx, tag) && num(t.income) >= num(t.expenses)) {
    const reserve = atWar ? 300 : 120;
    let built = false;
    if (!atWar) {
      for (let i = 1; i < g.provinces.length && !built; i++) {
        if (num(t.treasury) < TRADE.shipCost + reserve) break;
        if (shipHomeOk(ctx, tag, i)) built = buildMerchantCore(ctx, tag, i, 'ship').ok;
      }
    }
    if (!built && num(t.treasury) >= TRADE.caravanCost + reserve) {
      const cap = capitalProvince(ctx, tag);
      if (cap) built = buildMerchantCore(ctx, tag, cap.id, 'caravan').ok;
    }
    if (built) t.aiState.merchantBuilt = now;
  }
  // post: idle merchants, and once a year everyone reconsiders
  const reconsider = g.date.m === 1;
  for (const m of merchantsOf(ctx, tag)) {
    if (m.state === 'out' || m.state === 'back') continue;
    if (m.state === 'posted' && !reconsider) continue;
    const best = aiBestPost(ctx, tag, m);
    if (!best) continue;
    if (m.state === 'posted' && best.node === m.node && best.order === m.order && best.steerTo === m.steerTo) continue;
    sendMerchantCore(ctx, tag, m.id, best.node, best.order, best.steerTo);
  }
  aiTradeFleets(ctx, tag, passive);
}

function aiBestPost(ctx, tag, m) {
  const view = tradeView(ctx, tag);
  const home = view.home;
  let best = null;
  for (const n of view.nodes) {
    const r = merchantRoute(ctx, m, n.id);
    if (!r) continue;
    const here = m.state === 'posted' && m.node === n.id;
    const travel = 1 + r.days / 60;
    // collect: what one more merchant here would take
    const gain = (here ? num(n.income) : n.merchantGain) / travel;
    if (!best || gain > best.gain) best = { node: n.id, order: 'collect', steerTo: null, gain };
    // steer home: half of what it pushes down the lane, if home is downstream
    const lane = home ? laneToward(graphOf(ctx), n.id, home) : null;
    if (lane && !n.home) {
      const push = n.value * (TRADE.merchantPower / (n.totalPower + TRADE.merchantPower)) * 0.5 / travel;
      if (push > best.gain) best = { node: n.id, order: 'steer', steerTo: lane, gain: push };
    }
  }
  return best && best.gain > 0.05 ? best : null;
}

function aiTradeFleets(ctx, tag, passive) {
  const g = ctx.game;
  const t = g.tags[tag];
  const enemies = (t.atWarWith || []).filter((e) => g.tags[e] && g.tags[e].alive);
  const fleets = Object.values(g.fleets || {}).filter((f) => f && f.tag === tag && f.ships > 0);
  if (!fleets.length) return;
  // A naval invasion (invasion.js) calls every squadron to its staging port:
  // while one is planned or under way, the fleets are its, not trade's.
  if (t.aiState && t.aiState.navalOp) return;
  const res = computeTrade(ctx);
  const free = fleets.filter((f) => !(Array.isArray(f.path) && f.path.length && !f.mission));
  if (!free.length) return;
  if (enemies.length) {
    // hunt: a hostile raider working our home node or a node we collect in
    const ours = Object.keys(res.nodes).filter((id) => res.nodes[id].collect[tag] != null);
    for (const id of ours) {
      const N = res.nodes[id];
      for (const k in N.raid) {
        if (!isHostile(ctx, tag, k)) continue;
        const raider = Object.values(g.fleets).find((f) => f && f.tag === k && f.mission && f.mission.kind === 'raid' && f.mission.node === id && f.ships > 0);
        if (!raider) continue;
        const hunter = free.filter((f) => f.ships * fleetPowerOf(ctx, f) >= raider.ships * fleetPowerOf(ctx, raider))
          .sort((a, b) => b.ships - a.ships)[0];
        if (!hunter) continue;
        hunter.mission = { kind: 'protect', node: id };
        if (hunter.prov !== raider.prov) issueFleetMove(ctx, hunter, raider.prov);
        touchTrade(g);
        free.splice(free.indexOf(hunter), 1);
        if (!free.length) return;
      }
    }
    if (passive || !free.length) return;
    // raid: the richest node an enemy collects in, with no stronger hostile
    // squadron in its waters
    let target = null;
    for (const id in res.nodes) {
      const N = res.nodes[id];
      let enemyTake = 0;
      for (const e of enemies) enemyTake += num(N.collected[e]);
      if (enemyTake <= 0) continue;
      if (!missionStation(ctx, id, free[0].prov, tag)) continue;
      if (!target || enemyTake > target.take) target = { id, take: enemyTake };
    }
    if (target) {
      const raider = free.sort((a, b) => b.ships - a.ships)[0];
      if (!(raider.mission && raider.mission.kind === 'raid' && raider.mission.node === target.id)) {
        setFleetMissionCore(ctx, tag, raider.id, 'raid', target.id);
      }
      free.splice(free.indexOf(raider), 1);
    }
    return;
  }
  // peace: no raiding; a spare squadron guards home if home is on the sea
  for (const f of free) if (f.mission && f.mission.kind === 'raid') { f.mission = null; touchTrade(g); }
  const home = homeNodeOf(ctx, tag);
  if (!home || passive) return;
  const guard = free.find((f) => f.mission && f.mission.kind === 'protect' && f.mission.node === home);
  if (guard) return;
  const spare = free.find((f) => !f.mission);
  if (spare && missionStation(ctx, home, spare.prov)) setFleetMissionCore(ctx, tag, spare.id, 'protect', home);
}

// --------------------------------------------------------------- old saves --
// Before §292 a court's merchant marine was hulls at its shipyards
// (p.merchantShips) and voyages between them (g.merchantVoyages, with the
// trade runs of v6.1). Each hull becomes an idle merchant ship at the harbor
// it rode at or was bound home to; the voyages and the market gluts are done
// with. Works on the bare saved object (reviveGame), before any ctx exists.
export function migrateTradeState(g) {
  if (!g || Array.isArray(g.merchants)) return;
  g.merchants = [];
  if (!Number.isFinite(g.nextMerchantId)) g.nextMerchantId = 1;
  const add = (tag, prov) => {
    if (!tag || !prov || !g.tags || !g.tags[tag]) return;
    g.merchants.push({ id: g.nextMerchantId++, tag, kind: 'ship', home: prov, at: prov, state: 'home', node: null, order: null, steerTo: null });
  };
  for (let i = 1; i < (g.provinces || []).length; i++) {
    const p = g.provinces[i];
    if (!p) continue;
    const n = Math.max(0, Math.round(num(p.merchantShips)));
    for (let k = 0; k < n; k++) add(p.owner, i);
    delete p.merchantShips;
  }
  for (const v of g.merchantVoyages || []) {
    if (v && v.tag) add(v.tag, v.kind === 'trade' ? v.home : v.to);
  }
  g.merchantVoyages = [];
  delete g.tradeGluts;
}
