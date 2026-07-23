// js/sim/navy.js — fleets, sea transport, blockades, sea battles (SPEC §20).
// DOM-free. Fleets live in g.fleets keyed by id and ride at the offshore
// anchor of a coastal province (fleet.prov). Movement is port-to-port across
// open water (straight line — the Mediterranean has no walls). Each ship
// carries 1000 men. Armies aboard (a.aboard=true) are out of land play.

import { num, clamp, isHostile, sameSide, armiesInProv, resolveTagMult, rollGeneral, hasBuilding, opinionOf, devTotal } from './military.js';
import { unlockedGen, genMult, navalGenName, MODERNIZE_COST_PER_SHIP_PER_GEN } from '../data/tech.js';
import { queueUnitRecruitment } from './recruitment.js';

const SHIP_COST = 30;        // talents to lay down a hull
const SHIP_UPKEEP = 0.5;     // talents per ship per month
const SEA_PX_PER_DAY = 34;   // fleets are faster than legions
const CAPACITY = 1000;       // men per ship
export const MERCHANT_SHIP_COST = 25;
export const MERCHANT_SHIP_INCOME = 0.75; // talents/month while the home port trades
export const MERCHANT_SHIP_CAP = 3;       // berths supported by one shipyard (SPEC §58)
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
  if (!hasBuilding(p, 'shipyard')) return { ok: false, why: 'build a shipyard before laying down warships' };
  if (num(t.treasury) < SHIP_COST) return { ok: false, why: 'a hull costs ' + SHIP_COST + ' talents' };
  t.treasury = num(t.treasury) - SHIP_COST;
  const queued = queueUnitRecruitment(ctx, tag, provId, 'ship', {
    cost: SHIP_COST,
    gen: navalGen(ctx, tag), // the pattern the hull is laid down to (SPEC §31)
  });
  return queued ? { ok: true, queued } : { ok: false, why: 'the hull could not be scheduled' };
}

// Civilian hulls are a port investment, not military counters. They live at a
// harbor (p.merchantShips), where occupation or blockade suspends their trade
// income, and they can SAIL: a hull may be sent to any other friendly shipyard
// harbor with a free berth (SPEC §58). A shipyard supports a deliberately
// small merchant marine — three berths — so the fleet spreads across ports
// instead of stacking in one.
export function merchantInbound(ctx, provId) {
  let n = 0;
  for (const v of ctx.game.merchantVoyages || []) {
    if (!v) continue;
    // A rebase reserves its destination berth; a trade run reserves its HOME
    // berth for the whole round trip (the foreign harbor lends an anchorage,
    // never a berth — their cap is their own).
    if (v.kind === 'trade' ? v.home === provId : v.to === provId) n++;
  }
  return n;
}
export function merchantBerthsFree(ctx, provId) {
  const p = ctx.byId(provId);
  const count = Math.max(0, Math.round(num(p && p.merchantShips)));
  return Math.max(0, MERCHANT_SHIP_CAP - count - merchantInbound(ctx, provId));
}
export function merchantShipInfo(ctx, tag, provId) {
  const t = ctx.game.tags[tag];
  const p = ctx.byId(provId);
  const count = Math.max(0, Math.round(num(p && p.merchantShips)));
  const inbound = p ? merchantInbound(ctx, provId) : 0;
  let why = '';
  if (!t || !p) why = 'No such port.';
  else if (!isCoastal(ctx, provId)) why = 'Merchant ships need a coastal harbor.';
  else if (p.owner !== tag || p.controller !== tag) why = 'The harbor is not in our hands.';
  else if (!hasBuilding(p, 'shipyard')) why = 'Build a shipyard first.';
  else if (p.siege || blockadedBy(ctx, provId)) why = 'A besieged or blockaded harbor cannot fit out merchantmen.';
  else if (count + inbound >= MERCHANT_SHIP_CAP) why = 'Every shipyard berth is claimed' + (inbound ? ' (some by ships at sea)' : '') + '.';
  else if (num(t.treasury) < MERCHANT_SHIP_COST) why = 'A merchantman costs ' + MERCHANT_SHIP_COST + ' talents.';
  return {
    visible: !!t && !!p && isCoastal(ctx, provId) && hasBuilding(p, 'shipyard'),
    can: !why, why, count, inbound, cap: MERCHANT_SHIP_CAP, cost: MERCHANT_SHIP_COST,
    incomeEach: MERCHANT_SHIP_INCOME,
  };
}
export function commissionMerchantShipCore(ctx, tag, provId) {
  const info = merchantShipInfo(ctx, tag, provId);
  if (!info.can) return { ok: false, why: info.why, ...info };
  const t = ctx.game.tags[tag];
  const p = ctx.byId(provId);
  t.treasury = num(t.treasury) - info.cost;
  p.merchantShips = info.count + 1;
  return { ok: true, count: p.merchantShips, cap: info.cap, cost: info.cost, incomeEach: info.incomeEach };
}
export function merchantShipsOf(ctx, tag) {
  const out = [];
  for (let i = 1; i < ctx.game.provinces.length; i++) {
    const p = ctx.game.provinces[i];
    const count = Math.max(0, Math.round(num(p && p.merchantShips)));
    if (!p || p.owner !== tag || !count) continue;
    out.push({ prov: i, provName: p.name, count, active: p.controller === tag && !p.siege && !blockadedBy(ctx, i) });
  }
  return out;
}

// ---- merchant voyages (SPEC §58): the tubs are navigable -------------------
// A voyage is {tag, from, to, daysLeft, daysTotal}. The hull leaves its home
// count when it sails and joins the destination count when it docks; at sea it
// earns nothing (income reads p.merchantShips). Berths are reserved when the
// voyage is booked so two ports cannot both promise the same anchorage.
export function merchantHopDays(ctx, fromId, toId) {
  const a = anchor(ctx, fromId), b = anchor(ctx, toId);
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  return clamp(Math.round(2 + dist / MERCHANT_PX_PER_DAY), 2, 45);
}
// A harbor a tag's merchantmen may dock at: theirs, working, with a shipyard.
function merchantHarborOpen(ctx, tag, provId) {
  const p = ctx.byId(provId);
  return !!p && isCoastal(ctx, provId) && p.owner === tag && p.controller === tag
    && hasBuilding(p, 'shipyard') && !p.siege && !blockadedBy(ctx, provId);
}
export function merchantDestinations(ctx, tag, fromId) {
  const out = [];
  for (let i = 1; i < ctx.game.provinces.length; i++) {
    if (i === fromId || !merchantHarborOpen(ctx, tag, i)) continue;
    const p = ctx.byId(i);
    out.push({
      prov: i, provName: p.name,
      count: Math.max(0, Math.round(num(p.merchantShips))),
      inbound: merchantInbound(ctx, i), cap: MERCHANT_SHIP_CAP,
      free: merchantBerthsFree(ctx, i), days: merchantHopDays(ctx, fromId, i),
    });
  }
  out.sort((a, b) => a.days - b.days);
  return out;
}
export function sendMerchantCore(ctx, tag, fromId, toId) {
  const g = ctx.game;
  const from = ctx.byId(fromId);
  if (!from || from.owner !== tag) return { ok: false, why: 'The home port is not ours.' };
  if (Math.max(0, Math.round(num(from.merchantShips))) <= 0) return { ok: false, why: 'No merchantman rides at this harbor.' };
  if (blockadedBy(ctx, fromId)) return { ok: false, why: 'A blockade seals the harbor mouth.' };
  if (fromId === toId) return { ok: false, why: 'The ship is already home.' };
  if (!merchantHarborOpen(ctx, tag, toId)) return { ok: false, why: 'Merchantmen dock only at our own working shipyard harbors.' };
  if (merchantBerthsFree(ctx, toId) <= 0) return { ok: false, why: 'Every berth there is claimed.' };
  const days = merchantHopDays(ctx, fromId, toId);
  from.merchantShips = Math.max(0, Math.round(num(from.merchantShips))) - 1;
  if (!Array.isArray(g.merchantVoyages)) g.merchantVoyages = [];
  g.merchantVoyages.push({ tag, from: fromId, to: toId, daysLeft: days, daysTotal: days });
  return { ok: true, days, toName: ctx.byId(toId).name };
}
export function merchantVoyagesOf(ctx, tag) {
  return (ctx.game.merchantVoyages || []).filter((v) => v && v.tag === tag);
}

// ---- trade runs (v6.1): the tubs go abroad ---------------------------------
// A merchantman may be sent to a FRIENDLY FOREIGN shipyard harbor whose court
// thinks well enough of us (opinion >= TRADE_RUN.opinionMin). The run is a
// round trip — out, a month in their market, home — and pays a single lump
// sum when the hull ties up at its home berth again, instead of the docked
// trickle. War with the host while trading seizes ship and cargo both.
export const TRADE_RUN = {
  opinionMin: 25,       // how warmly the host court must regard us
  dwellDays: 30,        // days spent trading in the foreign market
  payoutBase: 6,        // talents per completed run...
  payoutPerDev: 0.5,    // ...plus per point of the foreign port's development
  distFactorMin: 0.6,   // short hops earn thin margins...
  distFactorMax: 1.5,   // ...the long hauls earn the fortunes
  saturationMonths: 6,  // a market wants no more of our goods for this long after a run
};
// The glut ledger: after a run books at a foreign port, that market is
// saturated for OUR goods until saturationMonths pass — no shuttle-spamming
// Alexandria into a money press. Keyed 'tag|provId' on game.tradeGluts.
function glutMonthsLeft(ctx, tag, provId) {
  const g = ctx.game;
  const stamp = g.tradeGluts && g.tradeGluts[tag + '|' + provId];
  if (!stamp) return 0;
  const elapsed = (g.date.y - stamp.y) * 12 + (g.date.m - stamp.m);
  return Math.max(0, TRADE_RUN.saturationMonths - elapsed);
}
// A foreign harbor open to OUR traders: theirs, working, welcoming, hungry.
// opts.ignoreGlut: the run already at sea OWNS its market — the glut gate is
// for booking new runs, never for turning away the one that set it.
export function tradeHarborStatus(ctx, tag, provId, opts) {
  const p = ctx.byId(provId);
  if (!p || !isCoastal(ctx, provId) || !hasBuilding(p, 'shipyard')) return { can: false, why: 'No working foreign harbor there.' };
  const host = p.owner;
  const ht = ctx.game.tags[host];
  if (!ht || !ht.alive || host === 'REB') return { can: false, why: 'No court rules that harbor.' };
  if (host === tag) return { can: false, why: 'That harbor is our own.' };
  if (p.controller !== p.owner || p.siege || blockadedBy(ctx, provId)) return { can: false, why: 'Their harbor is not at peace.' };
  if (isHostile(ctx, tag, host)) return { can: false, why: 'We are at war with ' + (ht.name || host) + '.' };
  const op = opinionOf(ctx, host, tag);
  if (op < TRADE_RUN.opinionMin) {
    return {
      can: false, opinion: op, host, hostName: ht.name || host,
      why: (ht.name || host) + ' will not open its market to us (opinion ' + Math.round(op) + ', needs ' + TRADE_RUN.opinionMin + '+).',
    };
  }
  const glut = (opts && opts.ignoreGlut) ? 0 : glutMonthsLeft(ctx, tag, provId);
  if (glut > 0) {
    return {
      can: false, opinion: op, host, hostName: ht.name || host, glut,
      why: 'Their market is glutted with our goods — no buyers for another '
        + glut + ' month' + (glut === 1 ? '' : 's') + '.',
    };
  }
  return { can: true, opinion: op, host, hostName: ht.name || host, why: '' };
}
// The margin follows the risk: a run pays for the port's wealth AND the
// length of the haul — short shuttles earn short money.
export function tradeRunPayout(ctx, tag, provId, fromId) {
  const p = ctx.byId(provId);
  const base = TRADE_RUN.payoutBase + devTotal(p) * TRADE_RUN.payoutPerDev;
  let dist = 1;
  if (fromId) {
    const roundTrip = merchantHopDays(ctx, fromId, provId) + merchantHopDays(ctx, provId, fromId);
    dist = clamp(0.5 + roundTrip / 60, TRADE_RUN.distFactorMin, TRADE_RUN.distFactorMax);
  }
  return Math.round(base * dist * resolveTagMult(ctx, tag, 'tradeMult'));
}
// Every foreign shipyard harbor, marked eligible or not (the UI shows the
// closed ones grey with the reason — the opinion gate should be learnable).
export function tradeRunDestinations(ctx, tag, fromId) {
  const out = [];
  for (let i = 1; i < ctx.game.provinces.length; i++) {
    const p = ctx.byId(i);
    if (!p || p.impassable || i === fromId) continue;
    if (!isCoastal(ctx, i) || !hasBuilding(p, 'shipyard') || p.owner === tag) continue;
    if (!ctx.game.tags[p.owner] || !ctx.game.tags[p.owner].alive || p.owner === 'REB') continue;
    const st = tradeHarborStatus(ctx, tag, i);
    const outDays = merchantHopDays(ctx, fromId, i);
    const homeDays = merchantHopDays(ctx, i, fromId);
    out.push({
      prov: i, provName: p.name, host: p.owner,
      hostName: (ctx.game.tags[p.owner] && ctx.game.tags[p.owner].name) || p.owner,
      can: st.can, why: st.why, opinion: Math.round(num(st.opinion, opinionOf(ctx, p.owner, tag))),
      days: outDays + TRADE_RUN.dwellDays + homeDays,
      payout: tradeRunPayout(ctx, tag, i, fromId),
    });
  }
  out.sort((a, b) => (b.can - a.can) || (b.payout / b.days - a.payout / a.days));
  return out;
}
export function sendTradeRunCore(ctx, tag, fromId, toId) {
  const g = ctx.game;
  const from = ctx.byId(fromId);
  if (!from || from.owner !== tag) return { ok: false, why: 'The home port is not ours.' };
  if (Math.max(0, Math.round(num(from.merchantShips))) <= 0) return { ok: false, why: 'No merchantman rides at this harbor.' };
  if (blockadedBy(ctx, fromId)) return { ok: false, why: 'A blockade seals the harbor mouth.' };
  const st = tradeHarborStatus(ctx, tag, toId);
  if (!st.can) return { ok: false, why: st.why };
  const days = merchantHopDays(ctx, fromId, toId);
  const payout = tradeRunPayout(ctx, tag, toId, fromId);
  from.merchantShips = Math.max(0, Math.round(num(from.merchantShips))) - 1;
  if (!Array.isArray(g.merchantVoyages)) g.merchantVoyages = [];
  g.merchantVoyages.push({
    tag, kind: 'trade', leg: 'out', home: fromId,
    from: fromId, to: toId, daysLeft: days, daysTotal: days, payout,
  });
  // The market is spoken for the moment the run books (not when it lands) —
  // three hulls cannot promise the same buyers.
  if (!g.tradeGluts) g.tradeGluts = {};
  g.tradeGluts[tag + '|' + toId] = { y: g.date.y, m: g.date.m };
  return { ok: true, days, payout, toName: ctx.byId(toId).name, hostName: st.hostName };
}
// The trade legs, advanced from merchantVoyagesDaily. Returns true when the
// voyage entry should be removed from the list.
function tradeVoyageArrive(ctx, v) {
  const g = ctx.game;
  const mine = v.tag === g.playerTag;
  if (v.leg === 'out') {
    const st = tradeHarborStatus(ctx, v.tag, v.to, { ignoreGlut: true });
    if (st.can) {
      // Ride at anchor in their roads and trade a month (from=to keeps the
      // map drawing the hull in the foreign harbor).
      v.leg = 'dwell';
      v.from = v.to;
      v.daysLeft = TRADE_RUN.dwellDays;
      v.daysTotal = TRADE_RUN.dwellDays;
      return false;
    }
    if (mine) {
      ctx.bus.emit('notify', {
        title: 'The market is closed',
        text: 'No trading at ' + ((ctx.byId(v.to) || {}).name || 'the far port') + ' — ' + st.why + ' The master turns for home empty.',
        type: 'econ',
      });
    }
    v.leg = 'home';
    v.payout = 0;
    const days = merchantHopDays(ctx, v.to, v.home);
    v.from = v.to; v.to = v.home; v.daysLeft = days; v.daysTotal = days;
    return false;
  }
  if (v.leg === 'dwell') {
    v.leg = 'home';
    const days = merchantHopDays(ctx, v.from, v.home);
    v.to = v.home; v.daysLeft = days; v.daysTotal = days;
    return false;
  }
  // leg 'home': tie up and land the profit. The run reserved its own home
  // berth (merchantInbound counts v.home), so only the raw cap is checked.
  if (merchantHarborOpen(ctx, v.tag, v.home)
      && Math.max(0, Math.round(num(ctx.byId(v.home).merchantShips))) < MERCHANT_SHIP_CAP) {
    const home = ctx.byId(v.home);
    home.merchantShips = Math.max(0, Math.round(num(home.merchantShips))) + 1;
    const t = g.tags[v.tag];
    if (t && v.payout > 0) t.treasury = num(t.treasury) + v.payout;
    if (mine) {
      ctx.bus.emit('notify', {
        title: v.payout > 0 ? 'A trade run pays' : 'A merchantman returns',
        text: v.payout > 0
          ? 'The hull ties up at ' + home.name + ' with ' + v.payout + ' talents of cargo sold.'
          : 'The hull is home at ' + home.name + ', hold empty.',
        type: v.payout > 0 ? 'good' : 'econ',
      });
    }
    return true;
  }
  // Home is closed: run for any other harbor of ours; else sold abroad.
  let best = 0, bestDays = Infinity;
  for (let i = 1; i < g.provinces.length; i++) {
    if (!merchantHarborOpen(ctx, v.tag, i) || merchantBerthsFree(ctx, i) <= 0) continue;
    const d = merchantHopDays(ctx, v.to, i);
    if (d < bestDays) { bestDays = d; best = i; }
  }
  if (best) {
    v.home = best; v.from = v.to; v.to = best; v.daysLeft = bestDays; v.daysTotal = bestDays;
    return false;
  }
  if (mine) {
    ctx.bus.emit('notify', {
      title: 'A merchantman is lost',
      text: 'With no port left open to her, the hull is sold off in foreign waters.',
      type: 'bad',
    });
  }
  return true;
}
// War reaches into the harbor: a trading hull caught in a now-hostile port is
// seized with its cargo. Checked daily for dwelling voyages.
function tradeSeizures(ctx) {
  const g = ctx.game;
  const list = g.merchantVoyages;
  if (!Array.isArray(list)) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const v = list[i];
    if (!v || v.kind !== 'trade' || v.leg !== 'dwell') continue;
    const p = ctx.byId(v.to);
    const host = p ? p.owner : null;
    if (host && isHostile(ctx, v.tag, host)) {
      list.splice(i, 1);
      if (v.tag === g.playerTag) {
        ctx.bus.emit('notify', {
          title: 'Merchantman seized',
          text: 'War closes ' + ((p && p.name) || 'the foreign harbor') + ' around our trader — ship and cargo are taken.',
          type: 'bad',
        });
      }
    }
  }
}
// Daily: the tubs make way. A voyage whose destination has fallen (or filled)
// turns for home; if home too is closed, the hull is lost with a notice.
export function merchantVoyagesDaily(ctx) {
  const g = ctx.game;
  const list = g.merchantVoyages;
  if (!Array.isArray(list) || !list.length) return;
  tradeSeizures(ctx);
  for (let i = list.length - 1; i >= 0; i--) {
    const v = list[i];
    if (!v || !(v.daysLeft > 0)) { list.splice(i, 1); continue; }
    v.daysLeft--;
    if (v.daysLeft > 0) continue;
    // Trade runs live across several legs; the entry survives until the
    // round trip closes (or the hull is lost).
    if (v.kind === 'trade') {
      if (tradeVoyageArrive(ctx, v)) list.splice(i, 1);
      continue;
    }
    list.splice(i, 1);
    const dest = ctx.byId(v.to);
    const docked = merchantHarborOpen(ctx, v.tag, v.to)
      && Math.max(0, Math.round(num(dest.merchantShips))) < MERCHANT_SHIP_CAP;
    if (docked) {
      dest.merchantShips = Math.max(0, Math.round(num(dest.merchantShips))) + 1;
      if (v.tag === g.playerTag) {
        ctx.bus.emit('notify', {
          title: 'A merchantman docks',
          text: 'Our hull ties up at ' + dest.name + ' — ' + dest.merchantShips + ' / ' + MERCHANT_SHIP_CAP + ' berths taken.',
          type: 'econ',
        });
      }
      continue;
    }
    // Divert home; the home leg is a fresh voyage at sea speed.
    if (v.from !== v.to && merchantHarborOpen(ctx, v.tag, v.from) && merchantBerthsFree(ctx, v.from) > 0) {
      const days = merchantHopDays(ctx, v.to, v.from);
      list.push({ tag: v.tag, from: v.to, to: v.from, daysLeft: days, daysTotal: days });
      if (v.tag === g.playerTag) {
        const destName = (dest && dest.name) || 'the far port';
        ctx.bus.emit('notify', {
          title: 'A merchantman turns back',
          text: 'No safe berth at ' + destName + ' — the master runs for home.',
          type: 'econ',
        });
      }
      continue;
    }
    if (v.tag === g.playerTag) {
      ctx.bus.emit('notify', {
        title: 'A merchantman is lost',
        text: 'With no port left open to her, the hull is sold off in foreign waters.',
        type: 'bad',
      });
    }
  }
}

// ---- eras at sea & the men who command them (SPEC §31) ----------------------
export function navalGen(ctx, tag) {
  const t = ctx.game.tags[tag];
  return unlockedGen(num(t && t.tech && t.tech.mar, 0));
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
