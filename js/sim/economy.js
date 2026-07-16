// Judaea Universalis — economy: monthly income/expenses, manpower, income breakdown.
// DOM-free.

import { num, clamp, B, regCount, resolveTagMult, armiesOf, airWingsOf, hasBuilding, buildingFace, devTotal } from './military.js';
import { blockadedBy, MERCHANT_SHIP_INCOME } from './navy.js';
import { TRADE_ROUTES } from '../data/trade.js';
import { genUpkeepMult } from '../data/tech.js';

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

// Oil spending (SPEC §52): does the realm pump its own fuel? Owned AND
// controlled — an occupied field pumps for the occupier's ledger, not ours.
export function controlsOilProvince(ctx, tag) {
  const g = ctx.game;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.good === 'oil' && p.owner === tag && p.controller === tag) return true;
  }
  return false;
}

// The monthly fuel line (SPEC §52): mechanized regiments and every air wing
// burn oil; realms without a controlled oil province import at a premium.
// Zero before the fuel generation, so the ancient chapters never pay it.
export function fuelExpense(ctx, tag) {
  const F = ctx.DEFINES.FUEL;
  if (!F) return 0;
  const fuelGen = num(F.gen, 5);
  let regs = 0;
  for (const a of armiesOf(ctx, tag)) {
    if (num(a.gen, 0) >= fuelGen) regs += regCount(a);
  }
  const wings = airWingsOf(ctx, tag).length;
  let fuel = regs * num(F.perReg, 0.2) + (wings ? wings * num(F.perWing, 0.5) : 0);
  if (fuel > 0 && !controlsOilProvince(ctx, tag)) fuel *= num(F.importMult, 2);
  return fuel;
}

// Administration (SPEC §52): every governed dev point beyond the free
// allowance costs adminPerDev a month. This is the expense that finally grows
// with the realm — conquest doubles the rolls AND the bureaucracy that counts
// them. Only owned-AND-controlled land bills (nobody administers a province
// the enemy holds — and income already stops there, so admin must too or
// occupation becomes a debt ratchet). `adminMult` is the era-tuning lever,
// same class as maintMult: Parthian favor or senatorial credit can carry a
// client king's clerks through a scripted war.
export function adminExpense(ctx, tag) {
  const g = ctx.game;
  const perDev = B(ctx, 'adminPerDev', 0);
  if (!(perDev > 0)) return 0;
  let dev = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag || p.controller !== tag) continue;
    dev += devTotal(p);
  }
  return Math.max(0, dev - B(ctx, 'adminFreeDev', 0)) * perDev
    * resolveTagMult(ctx, tag, 'adminMult');
}

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
    const shipyard = hasBuilding(p, 'shipyard') ? 1.15 : 1;
    out.prod += goodPrice(ctx, p.good) * num(p.dev && p.dev.prod) * (prodMult / 12) * provMult(p, 'prodMult') * market * shipyard;
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
  // A shipyard's civilian hulls earn at their home port. Occupation, siege and
  // blockade halt the flow without deleting the long-lived investment.
  for (let i = 1; i < ctx.game.provinces.length; i++) {
    const p = ctx.game.provinces[i];
    const ships = Math.max(0, Math.round(num(p && p.merchantShips)));
    if (!p || p.owner !== tag || p.controller !== tag || p.siege || !ships) continue;
    if (!hasBuilding(p, 'shipyard') || blockadedBy(ctx, i)) continue;
    sum += ships * MERCHANT_SHIP_INCOME;
  }
  // Influence tech widens the caravans' margins (tradeMult, SPEC §22).
  sum *= resolveTagMult(ctx, tag, 'tradeMult');
  return Math.round(sum * 100) / 100;
}

export function incomeBreakdown(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const out = { tax: 0, prod: 0, mult: 1, base: 0, income: 0, tributeIn: 0, tributeOut: 0, maint: 0, fuel: 0, admin: 0, interest: 0, trade: 0, net: 0 };
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
  // A regiment costs what its pattern costs (SPEC §52): an Armored Corps
  // draws pay, parts and shells where a tribal levy drew bread — armies
  // remember the pattern they were raised to, and pay for that one.
  for (const a of armiesOf(ctx, tag)) out.maint += regCount(a) * maintPerReg * genUpkeepMult(num(a.gen, 0));
  // Irregular hosts, subsidized expeditionary forces, and unusually costly
  // modern establishments can tune upkeep without changing the global price
  // of a regiment. Missing effects resolve to 1 for old saves/bookmarks.
  out.maint *= resolveTagMult(ctx, tag, 'maintMult');
  // Air wings (SPEC §29): spares and pay ride the maintenance line.
  const wingUpkeep = (ctx.DEFINES.AIR && ctx.DEFINES.AIR.wingUpkeep) || 1;
  out.maint += airWingsOf(ctx, tag).length * wingUpkeep;
  // Oil (SPEC §52) and administration (SPEC §52): the two lines that grow
  // with the age and the realm respectively.
  out.fuel = fuelExpense(ctx, tag);
  out.admin = adminExpense(ctx, tag);
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
  out.net = out.income + out.tributeIn + out.subsIn
    - out.tributeOut - out.subsOut - out.maint - out.fuel - out.admin - out.interest;
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
      t.expenses = Math.round((bd.maint + bd.fuel + bd.admin + bd.interest + bd.tributeOut) * 100) / 100; // fuel, admin, interest & tribute folded in
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
    if (bd.fuel > 0) rows.push({ label: 'Fuel', value: r2(-bd.fuel) });
    if (bd.admin > 0) rows.push({ label: 'Administration', value: r2(-bd.admin) });
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
  if (p.habitation === 'uninhabited') why = 'The region needs a settlement project first.';
  else if (p.impassable) why = 'The land is currently impassable.';
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

// ---------------------------------------------------------------- settlement
// A settlement project (actions.settleProvince, SPEC §43) raises a settleable
// province one habitation tier over a few months: empty land is claimed, a
// frontier is planted, a town takes root. It spends influence and grants a
// little development on completion. Only prosperity (yearly growth + develop)
// ever reaches `urban`; a settlement project caps at `town`.
const HAB_ORDER = ['uninhabited', 'frontier', 'rural', 'town', 'urban'];
export function habLevel(ctx, p) {
  const def = ctx.DEFINES.HABITATION && ctx.DEFINES.HABITATION[p && p.habitation];
  if (def && Number.isFinite(def.level)) return def.level | 0;
  const i = HAB_ORDER.indexOf(p && p.habitation);
  return i < 0 ? 2 : i; // absent/unknown reads as rural, matching inferredHabitation
}
function settlementCfg(ctx) { return (ctx.DEFINES && ctx.DEFINES.SETTLEMENT) || {}; }
function tierName(ctx, level) {
  const key = HAB_ORDER[Math.max(0, Math.min(HAB_ORDER.length - 1, level | 0))];
  const def = ctx.DEFINES.HABITATION && ctx.DEFINES.HABITATION[key];
  return { key, name: (def && def.name) || key };
}
export function settlementCost(ctx, targetLevel) {
  const s = settlementCfg(ctx);
  return num(s.baseCost, 40) + num(s.perTier, 35) * Math.max(1, targetLevel | 0);
}
export function settlementInfo(ctx, tag, provId) {
  const p = ctx.byId(provId);
  const t = ctx.game.tags[tag];
  if (!p || !t) return { can: false, why: 'invalid', cost: 0 };
  const maxTier = num(settlementCfg(ctx).maxTier, 3);
  const level = habLevel(ctx, p);
  const target = tierName(ctx, level + 1);
  const cost = settlementCost(ctx, level + 1);
  let why = '';
  if (p.settleable === false) why = 'This land cannot support a permanent settlement.';
  else if (p.impassable) why = 'The land is currently impassable.';
  else if (level >= maxTier) why = 'A thriving town already — only prosperity makes it a city.';
  else if (p.owner !== tag) why = 'Not our province.';
  else if (p.controller !== tag) why = 'Occupied — drive the enemy out first.';
  else if (p.siege) why = 'Under siege.';
  else if (p.settlement) why = 'A settlement project is already under way.';
  else if (num(t.points.infl) < cost) why = 'Needs ' + cost + ' influence points.';
  return {
    can: !why, why, cost, pool: 'infl',
    toLevel: level + 1, toTier: target.key, toName: target.name,
  };
}
export function settlementStart(ctx, tag, provId) {
  const info = settlementInfo(ctx, tag, provId);
  if (!info.can) return { ok: false, why: info.why };
  const p = ctx.byId(provId);
  const t = ctx.game.tags[tag];
  const s = settlementCfg(ctx);
  t.points.infl = num(t.points.infl) - info.cost;
  p.settlement = { by: tag, monthsLeft: Math.max(1, num(s.months, 6) | 0), toTier: info.toTier };
  const um = Math.max(0, num(s.unrestMonths, 6) | 0);
  const uu = num(s.unrest, 1);
  if (uu > 0 && um > 0) {
    p.modifiers = (p.modifiers || []).filter((m) => m && m.id !== 'settling');
    p.modifiers.push({ id: 'settling', name: 'Newcomers Settling', months: um, effects: { unrest: uu } });
  }
  return { ok: true, cost: info.cost, toName: info.toName };
}
// Monthly: advance every province's settlement project. Occupation, loss of the
// province, a change of owner, or the land turning impassable/unsettleable voids
// it. On completion the province climbs one habitation tier and gains a little
// development — and, if it was uninhabited, becomes developable at last.
export function monthlySettlement(ctx) {
  const g = ctx.game;
  const maxTier = num(settlementCfg(ctx).maxTier, 3);
  const reward = settlementCfg(ctx).devReward || {};
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || !p.settlement) continue;
    try {
      const c = p.settlement;
      if (p.owner !== c.by || p.controller !== p.owner || p.impassable || p.settleable === false) {
        p.settlement = null;
        continue;
      }
      c.monthsLeft = num(c.monthsLeft, 1) - 1;
      if (c.monthsLeft > 0) continue;
      p.settlement = null;
      const level = habLevel(ctx, p);
      if (level >= maxTier) continue; // capped since the project began; drop it quietly
      p.habitation = HAB_ORDER[level + 1];
      if (!p.dev) p.dev = { tax: 0, prod: 0, mp: 0 };
      p.dev.tax = num(p.dev.tax) + num(reward.tax);
      p.dev.prod = num(p.dev.prod) + num(reward.prod);
      p.dev.mp = num(p.dev.mp) + num(reward.mp);
      ctx.bus.emit('provinceDev', { id: i });
      if (p.owner === g.playerTag) {
        const def = ctx.DEFINES.HABITATION && ctx.DEFINES.HABITATION[p.habitation];
        ctx.bus.emit('notify', {
          title: p.name + ' takes root',
          text: p.name + ' grows into a ' + (((def && def.name) || p.habitation).toLowerCase()) + '.',
          type: 'good', provName: p.name,
        });
      }
    } catch (e) { warnOnce('settle:' + i, 'settlement tick failed for province', i, e); }
  }
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
      // The finished work is announced under the face of its age (SPEC §52).
      const ot = g.tags[p.owner];
      const face = buildingFace(def, num(ot && ot.tech && ot.tech.mar, 0));
      if (c.key === 'walls') {
        if ((p.fort | 0) >= 3) {
          // Fort rose to 3 some other way while we built — the bump is skipped.
          if (mine) {
            ctx.bus.emit('notify', {
              title: (face.name || 'Walls') + ' completed',
              text: 'The ' + (face.name || 'walls').toLowerCase() + ' of ' + p.name + ' are finished, but the fortress can rise no higher (fort 3).',
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
          title: (face.name || c.key) + ' completed',
          text: 'The ' + (face.name || c.key).toLowerCase() + ' of ' + p.name + ' stands finished.',
          type: 'good', provName: p.name,
        });
      }
    } catch (e) { warnOnce('construct:' + i, 'construction tick failed for province', i, e); }
  }
}
