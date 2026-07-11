// Judaea Universalis — unrest, revolt progression, rebel spawning, war exhaustion.
// DOM-free.

import {
  num, clamp, B, resolveTagAdd, isHostile, spawnArmy, changeControllerCore,
} from './military.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/unrest]', ...args);
}

function U(ctx, key, fallback) {
  const u = ctx.DEFINES && ctx.DEFINES.UNREST;
  const v = u ? u[key] : undefined;
  return Number.isFinite(v) ? v : fallback;
}
function religionGroup(ctx, rel) {
  const r = ctx.DEFINES.RELIGIONS ? ctx.DEFINES.RELIGIONS[rel] : null;
  return r ? r.group : null;
}
function cultureGroup(ctx, cul) {
  const c = ctx.DEFINES.CULTURES ? ctx.DEFINES.CULTURES[cul] : null;
  return c ? c.group : null;
}

const r2 = (v) => Math.round(v * 100) / 100;

// Full labeled breakdown; also returns total (raw, may be negative).
export function computeUnrestBreakdown(ctx, prov) {
  const rows = [];
  const g = ctx.game;
  const owner = g.tags[prov.owner];
  if (!owner) return { total: 0, rows };
  if (prov.religion && owner.religion && prov.religion !== owner.religion) {
    const gp = religionGroup(ctx, prov.religion);
    const go = religionGroup(ctx, owner.religion);
    if (gp && go && gp === go) rows.push({ label: 'Heretic faith', value: U(ctx, 'sameGroupHeretic', 1.5) });
    else rows.push({ label: 'Heathen faith', value: U(ctx, 'heathen', 3) });
  }
  if (prov.culture && owner.culture && cultureGroup(ctx, prov.culture) !== cultureGroup(ctx, owner.culture)) {
    rows.push({ label: 'Foreign culture', value: U(ctx, 'wrongCultureGroup', 1) });
  }
  if (prov.controller !== prov.owner) {
    rows.push({ label: 'Enemy occupation', value: U(ctx, 'occupied', 3) });
  }
  const we = num(owner.warExhaustion) * U(ctx, 'perWarExhaustion', 0.25);
  if (we > 0.001) rows.push({ label: 'War exhaustion', value: r2(we) });
  const stab = num(owner.stability);
  if (stab < 0) rows.push({ label: 'Instability', value: r2(-stab * U(ctx, 'perNegativeStability', 1)) });
  else if (stab > 0) rows.push({ label: 'Stability', value: r2(stab * U(ctx, 'perPositiveStability', -0.75)) });
  for (const mod of prov.modifiers || []) {
    const e = mod && mod.effects ? mod.effects.unrest : undefined;
    if (Number.isFinite(e) && e !== 0) rows.push({ label: mod.name || mod.id || 'Modifier', value: e });
  }
  const nat = resolveTagAdd(ctx, prov.owner, 'unrestAll');
  if (Math.abs(nat) > 0.001) rows.push({ label: 'National unrest', value: r2(nat) });
  if (num(prov.garrison) > 0) rows.push({ label: 'Garrison', value: -1 });
  let total = 0;
  for (const r of rows) total += num(r.value);
  return { total: r2(total), rows };
}

export function explainUnrest(ctx, provId) {
  try {
    const p = ctx.byId(provId);
    if (!p || p.impassable) return [];
    const { rows } = computeUnrestBreakdown(ctx, p);
    return rows;
  } catch (e) {
    warnOnce('explainUnrest', 'explainUnrest failed', e);
    return [];
  }
}

function fireRevolt(ctx, p) {
  const g = ctx.game;
  const size = Math.max(1, Math.round(num(p.dev && p.dev.mp) * B(ctx, 'rebelSizePerDev', 0.4)));
  let rebelTag = 'REB';
  if (p.religion === 'judaism' && p.owner !== 'JUD' &&
      g.tags.JUD && g.tags.JUD.alive && isHostile(ctx, 'JUD', p.owner)) {
    rebelTag = 'JUD'; // the faithful rise for Judaea
  }
  // Throttle the tide: at most 8 rebel bands under arms at once, and a province
  // that has risen cannot rise again for 30 months.
  if (rebelTag === 'REB') {
    let rebCount = 0;
    for (const id of Object.keys(g.armies)) { const a = g.armies[id]; if (a && a.tag === 'REB' && a.men > 0) rebCount++; }
    if (rebCount >= 8) { p.revoltProgress = 0; p.revoltCooldownMonths = 6; return; }
  }
  const name = rebelTag === 'JUD' ? 'Zealots of ' + p.name : 'Rebels of ' + p.name;
  spawnArmy(ctx, rebelTag, p.name, { inf: size, name });
  if (num(p.garrison) <= 0) changeControllerCore(ctx, p, rebelTag);
  p.revoltProgress = 0;
  p.revoltCooldownMonths = 30;
  p.unrest = Math.max(0, num(p.unrest) - 4); // steam vented
  ctx.bus.emit('notify', {
    title: 'Revolt in ' + p.name,
    text: (rebelTag === 'JUD' ? 'The province rises for Judaea — ' : 'Rebels take up arms — ') + size + ',000 men in the streets.',
    type: 'war', provName: p.name,
  });
}

export function monthlyUnrest(ctx) {
  const g = ctx.game;
  const threshold = B(ctx, 'unrestRevoltThreshold', 5);
  const fireAt = B(ctx, 'revoltFireAt', 100);
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    try {
      if (!g.tags[p.owner]) { p.unrest = 0; continue; }
      const { total } = computeUnrestBreakdown(ctx, p);
      p.unrest = Math.max(0, total);
      if (num(p.revoltCooldownMonths) > 0) {
        // The province spent its fury; a fresh rising takes years to gather.
        p.revoltCooldownMonths--;
        p.revoltProgress = 0;
        continue;
      }
      if (p.unrest > threshold) {
        p.revoltProgress = Math.min(fireAt, num(p.revoltProgress) + (p.unrest - threshold) * 2);
      } else {
        p.revoltProgress = Math.max(0, num(p.revoltProgress) - 10);
      }
      if (p.revoltProgress >= fireAt) fireRevolt(ctx, p);
    } catch (e) { warnOnce('unrest:' + i, 'unrest failed for province', i, e); }
  }
}

// +0.05/month at war, decays at peace; battle/siege bumps applied in military.js.
export function monthlyWarExhaustion(ctx) {
  const g = ctx.game;
  const max = B(ctx, 'warExhaustionMax', 20);
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive) continue;
    const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
    t.warExhaustion = clamp(num(t.warExhaustion) + (atWar ? 0.05 : -0.25), 0, max);
  }
}

// Decrement timed tag & province modifiers; drop expired (months === -1 is permanent).
export function tickModifiers(ctx) {
  const g = ctx.game;
  const sweep = (arr) => {
    if (!Array.isArray(arr)) return arr;
    return arr.filter((mod) => {
      if (!mod) return false;
      if (!Number.isFinite(mod.months) || mod.months < 0) return true;
      mod.months -= 1;
      return mod.months > 0;
    });
  };
  for (const tag of Object.keys(g.tags)) {
    g.tags[tag].modifiers = sweep(g.tags[tag].modifiers);
  }
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p) p.modifiers = sweep(p.modifiers);
  }
}
