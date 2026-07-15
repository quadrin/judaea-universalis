// Judaea Universalis — economy: monthly income/expenses, manpower, income breakdown.
// DOM-free.

import { num, clamp, B, regCount, resolveTagMult, armiesOf, airWingsOf, hasBuilding, devTotal } from './military.js';
import { blockadedBy } from './navy.js';
import { TRADE_ROUTES } from '../data/trade.js';

export const LOAN_SIZE = 150;            // talents received / repaid per loan
export const LOAN_INTEREST_PER_MONTH = 3; // talents per loan per month
export const MAX_LOANS = 5;

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/economy]', ...args);
}

function goodPrice(ctx, good) {
  const g = ctx.DEFINES.GOODS ? ctx.DEFINES.GOODS[good] : null;
  return g ? num(g.price, 2) : 2;
}
function provMult(p, key) {
  let m = 1;
  for (const mod of p.modifiers || []) {
    const e = mod && mod.effects ? mod.effects[key] : undefined;
    if (Number.isFinite(e) && e > 0) m *= e;
  }
  return m;
}

export const TRIBUTE_SHARE = 0.15; // of a client kingdom's income, paid to its overlord

// Own-provinces income only (tax + production × national multiplier) — shared
// by incomeBreakdown and the tribute pass, which must not recurse.
function ownIncome(ctx, tag) {
  const g = ctx.game;
  const out = { tax: 0, prod: 0, mult: 1, base: 0, income: 0 };
  const taxPerDev = B(ctx, 'taxPerDevPerYear', 1.0);
  const prodMult = B(ctx, 'prodMult', 0.6);
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner !== tag || p.controller !== tag) continue; // owned AND controlled
    // Market: local tax & production ×1.2. The owned-AND-controlled gate above
    // already denies an occupier the benefit (owner === controller here).
    const market = hasBuilding(p, 'market') ? 1.2 : 1;
    const autonomy = clamp(num(p.autonomy, 0.25), 0, 0.9);
    out.tax += num(p.dev && p.dev.tax) * (1 - autonomy) * (taxPerDev / 12) * provMult(p, 'taxMult') * market;
    out.prod += goodPrice(ctx, p.good) * num(p.dev && p.dev.prod) * (prodMult / 12) * provMult(p, 'prodMult') * market;
  }
  out.mult = resolveTagMult(ctx, tag, 'incomeMult');
  out.base = out.tax + out.prod;
  out.income = out.base * out.mult;
  return out;
}

// Returns {tax, prod, mult, base, income, tributeIn, tributeOut, maint,
// interest, net} for a tag (monthly figures).
// The routes pay whoever holds their stops — nothing from an occupied,
// besieged, or (sea routes) blockaded harbor; the chokepoint pays double.
export function tradeIncome(ctx, tag) {
  let sum = 0;
  for (const r of TRADE_ROUTES) {
    const share = r.value / r.stops.length;
    for (const stop of r.stops) {
      const id = ctx.provId ? ctx.provId(stop) : 0;
      const p = id ? ctx.byId(id) : null;
      if (!p || p.owner !== tag) continue;
      if (p.controller !== p.owner || p.siege) continue;
      if (r.sea && blockadedBy(ctx, id)) continue;
      sum += share * (r.chokepoint === stop ? 2 : 1);
    }
  }
  // Influence tech widens the caravans' margins (tradeMult, SPEC §22).
  sum *= resolveTagMult(ctx, tag, 'tradeMult');
  return Math.round(sum * 100) / 100;
}

export function incomeBreakdown(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const out = { tax: 0, prod: 0, mult: 1, base: 0, income: 0, tributeIn: 0, tributeOut: 0, maint: 0, interest: 0, trade: 0, net: 0 };
  if (!t) return out;
  Object.assign(out, ownIncome(ctx, tag));
  try { out.trade = tradeIncome(ctx, tag); } catch (e) { out.trade = 0; }
  out.income += out.trade;
  // Client tribute: a share of each vassal's own income flows to the overlord.
  if (t.overlord && g.tags[t.overlord] && g.tags[t.overlord].alive) {
    out.tributeOut = out.income * TRIBUTE_SHARE;
  }
  for (const k of Object.keys(g.tags)) {
    const v = g.tags[k];
    if (!v || !v.alive || v.overlord !== tag) continue;
    out.tributeIn += ownIncome(ctx, k).income * TRIBUTE_SHARE;
  }
  const maintPerReg = B(ctx, 'maintPerReg', 0.35);
  for (const a of armiesOf(ctx, tag)) out.maint += regCount(a) * maintPerReg;
  // Irregular hosts, subsidized expeditionary forces, and unusually costly
  // modern establishments can tune upkeep without changing the global price
  // of a regiment. Missing effects resolve to 1 for old saves/bookmarks.
  out.maint *= resolveTagMult(ctx, tag, 'maintMult');
  // Air wings (SPEC §29): fuel, spares and pay ride the maintenance line.
  const wingUpkeep = (ctx.DEFINES.AIR && ctx.DEFINES.AIR.wingUpkeep) || 1;
  out.maint += airWingsOf(ctx, tag).length * wingUpkeep;
  out.interest = Math.max(0, Math.round(num(t.loans))) * LOAN_INTEREST_PER_MONTH;
  // Subsidies & reparations (SPEC §24): monthly flows between courts. Both
  // sides read the same list, so the transfer balances by construction.
  out.subsIn = 0;
  out.subsOut = 0;
  for (const s of g.subsidies || []) {
    if (!s || !(s.monthsLeft > 0)) continue;
    if (s.to === tag) out.subsIn += num(s.amount);
    if (s.from === tag) out.subsOut += num(s.amount);
  }
  out.net = out.income + out.tributeIn + out.subsIn - out.tributeOut - out.subsOut - out.maint - out.interest;
  return out;
}

// Monthly upkeep of the subsidy book: count the flows down, and let a payer in
// deep debt default (their creditors are told).
export function monthlySubsidies(ctx) {
  const g = ctx.game;
  if (!Array.isArray(g.subsidies) || !g.subsidies.length) return;
  const keep = [];
  for (const s of g.subsidies) {
    if (!s) continue;
    const payer = g.tags[s.from];
    const taker = g.tags[s.to];
    if (!payer || !payer.alive || !taker || !taker.alive) continue; // a dead court owes nothing
    if (num(payer.treasury) <= -150) {
      if (s.from === g.playerTag || s.to === g.playerTag) {
        ctx.bus.emit('notify', {
          title: s.reparation ? 'Reparations default' : 'A subsidy lapses',
          text: (payer.name || s.from) + ' can no longer pay ' + (taker.name || s.to) + '.',
          type: s.to === g.playerTag ? 'bad' : 'info',
        });
      }
      continue;
    }
    s.monthsLeft = num(s.monthsLeft) - 1;
    if (s.monthsLeft > 0) keep.push(s);
    else if (s.from === g.playerTag || s.to === g.playerTag) {
      ctx.bus.emit('notify', {
        title: s.reparation ? 'Reparations paid in full' : 'A subsidy ends',
        text: 'The agreed flow from ' + (payer.name || s.from) + ' to ' + (taker.name || s.to) + ' is complete.',
        type: 'info',
      });
    }
  }
  g.subsidies = keep;
}

export function runMonthlyEconomy(ctx) {
  const g = ctx.game;
  for (const tag of Object.keys(g.tags)) {
    try {
      const t = g.tags[tag];
      if (!t || !t.alive || tag === 'REB') { if (t) { t.income = 0; t.expenses = 0; } continue; }
      const bd = incomeBreakdown(ctx, tag);
      t.income = Math.round((bd.income + bd.tributeIn) * 100) / 100;
      t.expenses = Math.round((bd.maint + bd.interest + bd.tributeOut) * 100) / 100; // interest & tribute folded in
      t.treasury = num(t.treasury) + bd.net;
      if (!Number.isFinite(t.treasury)) t.treasury = 0;
    } catch (e) { warnOnce('eco:' + tag, 'economy failed for', tag, e); }
  }
}

export function maxManpowerOf(ctx, tag) {
  const g = ctx.game;
  const mpPerDev = B(ctx, 'mpPerDev', 250);
  let mp = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    mp += num(p.dev && p.dev.mp) * mpPerDev;
  }
  return Math.round(mp * resolveTagMult(ctx, tag, 'manpowerMult'));
}

export function monthlyManpower(ctx) {
  const g = ctx.game;
  const months = Math.max(1, B(ctx, 'mpRecoveryMonths', 60));
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || tag === 'REB') continue;
    t.maxManpower = maxManpowerOf(ctx, tag);
    const regen = t.maxManpower / months;
    t.manpower = clamp(Math.round(num(t.manpower) + regen), 0, Math.max(t.maxManpower, num(t.manpower)));
  }
}

const r2 = (v) => Math.round(v * 100) / 100;

// UI-facing labeled breakdown (monthly talents).
export function explainIncome(ctx, tag) {
  try {
    const bd = incomeBreakdown(ctx, tag);
    const rows = [
      { label: 'Taxation', value: r2(bd.tax) },
      { label: 'Production', value: r2(bd.prod) },
    ];
    if (Math.abs(bd.mult - 1) > 0.001) {
      rows.push({ label: 'National modifiers', value: r2(bd.base * (bd.mult - 1)) });
    }
    if (bd.trade > 0) rows.push({ label: 'Trade routes', value: r2(bd.trade) });
    if (bd.tributeIn > 0) rows.push({ label: 'Tribute from clients', value: r2(bd.tributeIn) });
    if (bd.tributeOut > 0) rows.push({ label: 'Tribute to our overlord', value: r2(-bd.tributeOut) });
    if (bd.subsIn > 0) rows.push({ label: 'Subsidies & reparations in', value: r2(bd.subsIn) });
    if (bd.subsOut > 0) rows.push({ label: 'Subsidies & reparations out', value: r2(-bd.subsOut) });
    rows.push({ label: 'Army maintenance', value: r2(-bd.maint) });
    if (bd.interest > 0) rows.push({ label: 'Loan interest', value: r2(-bd.interest) });
    rows.push({ label: 'Monthly balance', value: r2(bd.net) });
    return rows;
  } catch (e) {
    warnOnce('explainIncome', 'explainIncome failed', e);
    return [];
  }
}

// ---------------------------------------------------------------- development (SPEC §24)
// Towns grow. Each January every settled, peaceful, integrated province rolls
// for +1 development — markets and granaries help, capitals bloom, war and
// unrest freeze everything. Government tech raises the whole curve (growthMult).
export function yearlyGrowth(ctx) {
  const g = ctx.game;
  const capitals = {};
  for (const k of Object.keys(ctx.DEFINES.TAGS || {})) {
    const c = ctx.DEFINES.TAGS[k] && ctx.DEFINES.TAGS[k].capital;
    if (c) capitals[c] = k;
  }
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    const t = g.tags[p.owner];
    if (!t || !t.alive || p.owner === 'REB') continue;
    if (p.controller !== p.owner || p.siege) continue; // war-torn towns don't grow
    if (num(p.unrest) > 4) continue; // nor restive ones
    let chance = 0.05;
    if (hasBuilding(p, 'market')) chance += 0.04;
    if (hasBuilding(p, 'granary')) chance += 0.04;
    if (capitals[p.canon || p.name] === p.owner) chance += 0.06;
    chance += (0.9 - clamp(num(p.autonomy, 0.25), 0, 0.9)) * 0.05; // integrated land grows
    if (t.atWarWith && t.atWarWith.length) chance *= 0.5; // wartime economy
    chance *= resolveTagMult(ctx, p.owner, 'growthMult');
    if (!(ctx.rng.next() < chance)) continue;
    const roll = ctx.rng.next();
    const kind = roll < 0.4 ? 'tax' : roll < 0.75 ? 'prod' : 'mp';
    p.dev[kind] = num(p.dev[kind]) + 1;
    ctx.bus.emit('provinceDev', { id: i });
    if (p.owner === g.playerTag) {
      ctx.bus.emit('notify', {
        title: (p.name || 'A town') + ' grows',
        text: 'Prosperity: +1 ' + (kind === 'tax' ? 'tax' : kind === 'prod' ? 'production' : 'manpower')
          + ' development (' + devTotal(p) + ' total).',
        type: 'good', provName: p.name,
      });
    }
  }
}

// Deliberate development: monarch points buy +1 dev — tax with government,
// production with influence, manpower with martial. Dearer as the town grows.
export const DEV_KINDS = { tax: 'gov', prod: 'infl', mp: 'mar' };
export function developCost(p) {
  return 50 + 5 * devTotal(p);
}
export function developInfo(ctx, tag, provId, kind) {
  const p = ctx.byId(provId);
  const t = ctx.game.tags[tag];
  const pool = DEV_KINDS[kind];
  if (!p || !t || !pool) return { can: false, why: 'invalid', cost: 0 };
  const cost = developCost(p);
  let why = '';
  if (p.impassable) why = 'The wasteland cannot be developed.';
  else if (p.owner !== tag) why = 'Not our province.';
  else if (p.controller !== tag) why = 'Occupied — drive the enemy out first.';
  else if (p.siege) why = 'Under siege.';
  else if (num(t.points[pool]) < cost) why = 'Needs ' + cost + ' ' + (pool === 'gov' ? 'government' : pool === 'infl' ? 'influence' : 'martial') + ' points.';
  return { can: !why, why, cost, pool };
}
export function developCore(ctx, tag, provId, kind) {
  const info = developInfo(ctx, tag, provId, kind);
  if (!info.can) return { ok: false, why: info.why };
  const p = ctx.byId(provId);
  const t = ctx.game.tags[tag];
  t.points[info.pool] = num(t.points[info.pool]) - info.cost;
  p.dev[kind] = num(p.dev[kind]) + 1;
  ctx.bus.emit('provinceDev', { id: provId });
  return { ok: true, cost: info.cost };
}

// ---------------------------------------------------------------- construction
// Monthly: advance every province's building site; on completion add the key,
// apply walls' one-time fort/garrison bump (fort hard-capped at 3), and tell
// the player about their own finished works.
export function monthlyConstruction(ctx) {
  const g = ctx.game;
  const catalog = ctx.DEFINES.BUILDINGS || {};
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || !p.construction) continue;
    try {
      const c = p.construction;
      c.monthsLeft = num(c.monthsLeft, 1) - 1;
      if (c.monthsLeft > 0) continue;
      p.construction = null;
      const def = catalog[c.key];
      if (!def) { warnOnce('cons:' + c.key, 'unknown building under construction:', c.key); continue; }
      if (!Array.isArray(p.buildings)) p.buildings = [];
      if (p.buildings.indexOf(c.key) < 0) p.buildings.push(c.key);
      const mine = p.owner === g.playerTag;
      if (c.key === 'walls') {
        if ((p.fort | 0) >= 3) {
          // Fort rose to 3 some other way while we built — the bump is skipped.
          if (mine) {
            ctx.bus.emit('notify', {
              title: 'Walls completed', text: 'The walls of ' + p.name + ' are finished, but the fortress can rise no higher (fort 3).',
              type: 'info', provName: p.name,
            });
          }
          continue;
        }
        const perLevel = B(ctx, 'fortGarrisonPerLevel', 1000);
        p.fort = (p.fort | 0) + 1;
        p.maxGarrison = num(p.maxGarrison) + perLevel;
        p.garrison = Math.min(p.maxGarrison, num(p.garrison) + perLevel);
      }
      if (mine) {
        ctx.bus.emit('notify', {
          title: (def.name || c.key) + ' completed',
          text: 'The ' + (def.name || c.key).toLowerCase() + ' of ' + p.name + ' stands finished.',
          type: 'good', provName: p.name,
        });
      }
    } catch (e) { warnOnce('construct:' + i, 'construction tick failed for province', i, e); }
  }
}
