// Judaea Universalis — economy: monthly income/expenses, manpower, income breakdown.
// DOM-free.

import { num, clamp, B, regCount, resolveTagMult, armiesOf, hasBuilding } from './military.js';

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

// Returns {tax, prod, mult, base, income, maint, interest, net} for a tag (monthly figures).
export function incomeBreakdown(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const out = { tax: 0, prod: 0, mult: 1, base: 0, income: 0, maint: 0, interest: 0, net: 0 };
  if (!t) return out;
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
  const maintPerReg = B(ctx, 'maintPerReg', 0.35);
  for (const a of armiesOf(ctx, tag)) out.maint += regCount(a) * maintPerReg;
  out.interest = Math.max(0, Math.round(num(t.loans))) * LOAN_INTEREST_PER_MONTH;
  out.net = out.income - out.maint - out.interest;
  return out;
}

export function runMonthlyEconomy(ctx) {
  const g = ctx.game;
  for (const tag of Object.keys(g.tags)) {
    try {
      const t = g.tags[tag];
      if (!t || !t.alive || tag === 'REB') { if (t) { t.income = 0; t.expenses = 0; } continue; }
      const bd = incomeBreakdown(ctx, tag);
      t.income = Math.round(bd.income * 100) / 100;
      t.expenses = Math.round((bd.maint + bd.interest) * 100) / 100; // loan interest folded in
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
    rows.push({ label: 'Army maintenance', value: r2(-bd.maint) });
    if (bd.interest > 0) rows.push({ label: 'Loan interest', value: r2(-bd.interest) });
    rows.push({ label: 'Monthly balance', value: r2(bd.net) });
    return rows;
  } catch (e) {
    warnOnce('explainIncome', 'explainIncome failed', e);
    return [];
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
