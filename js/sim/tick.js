// Judaea Universalis — daily tick orchestration (SPEC §6.3). DOM-free.

import {
  moveArmiesDaily, tickBattles, tickSieges, monthlyReinforce, monthlyMoraleRecovery,
  monthlyAttrition, monthlyGarrisons, updateWarscores, updateTagLife,
} from './military.js';
import { runMonthlyEconomy, monthlyManpower } from './economy.js';
import { monthlyUnrest, monthlyWarExhaustion, tickModifiers } from './unrest.js';
import { checkDateEvents, checkTriggeredEvents } from './events.js';
import { runMonthlyAI } from './ai.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/tick]', ...args);
}
function safe(key, fn) {
  try { fn(); } catch (e) { warnOnce(key, key + ' failed', e); }
}

function advanceDate(ctx) {
  const g = ctx.game;
  const dpm = Number.isFinite(ctx.DEFINES.DAYS_PER_MONTH) ? ctx.DEFINES.DAYS_PER_MONTH : 30;
  g.date.d += 1;
  if (g.date.d > dpm) {
    g.date.d = 1;
    g.date.m += 1;
    if (g.date.m > 12) { g.date.m = 1; g.date.y += 1; }
  }
}

function monthlyMonarchPoints(ctx) {
  const g = ctx.game;
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || tag === 'REB') continue;
    t.points.gov = Math.min(999, t.points.gov + 3 + ctx.rng.int(3));
    t.points.infl = Math.min(999, t.points.infl + 3 + ctx.rng.int(3));
    t.points.mar = Math.min(999, t.points.mar + 3 + ctx.rng.int(3));
  }
}

function monthlyBlock(ctx) {
  const g = ctx.game;
  safe('modifiers', () => tickModifiers(ctx));
  safe('economy', () => runMonthlyEconomy(ctx));
  safe('manpower', () => monthlyManpower(ctx));
  safe('reinforce', () => monthlyReinforce(ctx));
  safe('morale', () => monthlyMoraleRecovery(ctx));
  safe('attrition', () => monthlyAttrition(ctx));
  safe('garrisons', () => monthlyGarrisons(ctx));
  safe('unrest', () => monthlyUnrest(ctx)); // includes revolt progression & rebel spawns
  safe('trigEvents', () => checkTriggeredEvents(ctx));
  safe('ai', () => runMonthlyAI(ctx));
  safe('warExh', () => monthlyWarExhaustion(ctx));
  safe('warscore', () => updateWarscores(ctx));
  safe('tagLife', () => updateTagLife(ctx));
  if (!g.over && !g.result) {
    safe('victory', () => {
      if (ctx.bookmark && typeof ctx.bookmark.checkVictory === 'function') ctx.bookmark.checkVictory(ctx);
    });
  }
  safe('points', () => monthlyMonarchPoints(ctx));
}

export function tickDay(ctx) {
  if (!ctx || !ctx.game) return;
  const g = ctx.game;
  try {
    advanceDate(ctx);
    safe('move', () => moveArmiesDaily(ctx));
    safe('battles', () => tickBattles(ctx));
    safe('sieges', () => tickSieges(ctx));
    safe('dateEvents', () => checkDateEvents(ctx));
    const monthly = g.date.d === 1;
    if (monthly) monthlyBlock(ctx);
    ctx.bus.emit('day', { date: { ...g.date } });
    if (monthly) ctx.bus.emit('month', { date: { ...g.date } });
  } catch (e) {
    warnOnce('tickDay', 'tickDay failed', e);
  }
}
