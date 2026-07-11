// Judaea Universalis — economy: monthly income/expenses, manpower, income breakdown.
// DOM-free.

import { num, clamp, B, regCount, resolveTagMult, armiesOf } from './military.js';

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

// Returns {tax, prod, mult, base, income, maint, net} for a tag (monthly figures).
export function incomeBreakdown(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const out = { tax: 0, prod: 0, mult: 1, base: 0, income: 0, maint: 0, net: 0 };
  if (!t) return out;
  const taxPerDev = B(ctx, 'taxPerDevPerYear', 1.0);
  const prodMult = B(ctx, 'prodMult', 0.6);
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner !== tag || p.controller !== tag) continue; // owned AND controlled
    const autonomy = clamp(num(p.autonomy, 0.25), 0, 0.9);
    out.tax += num(p.dev && p.dev.tax) * (1 - autonomy) * (taxPerDev / 12) * provMult(p, 'taxMult');
    out.prod += goodPrice(ctx, p.good) * num(p.dev && p.dev.prod) * (prodMult / 12) * provMult(p, 'prodMult');
  }
  out.mult = resolveTagMult(ctx, tag, 'incomeMult');
  out.base = out.tax + out.prod;
  out.income = out.base * out.mult;
  const maintPerReg = B(ctx, 'maintPerReg', 0.35);
  for (const a of armiesOf(ctx, tag)) out.maint += regCount(a) * maintPerReg;
  out.net = out.income - out.maint;
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
      t.expenses = Math.round(bd.maint * 100) / 100;
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
    rows.push({ label: 'Monthly balance', value: r2(bd.net) });
    return rows;
  } catch (e) {
    warnOnce('explainIncome', 'explainIncome failed', e);
    return [];
  }
}
