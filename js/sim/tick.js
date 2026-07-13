// Judaea Universalis — daily tick orchestration (SPEC §6.3). DOM-free.

import {
  moveArmiesDaily, tickBattles, tickSieges, monthlyReinforce, monthlyMoraleRecovery,
  monthlyAttrition, monthlyGarrisons, updateWarscores, updateTagLife, checkElimination,
} from './military.js';
import { runMonthlyEconomy, monthlyManpower, monthlyConstruction } from './economy.js';
import { monthlyUnrest, monthlyWarExhaustion, monthlyOpinionDrift, tickModifiers } from './unrest.js';
import { monthlySuccession, monthlyIntegration, checkMissions, monthlyHolySites } from './realm.js';
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
    if (g.date.m > 12) {
      g.date.m = 1;
      g.date.y += 1;
      if (g.date.y === 0) g.date.y = 1; // no year zero: 1 BCE -> 1 CE
    }
  }
}

// Base +2/month per pool, plus the ruler's matching skill (0-6). Tags without
// a ruler (defensive fallback) keep the old 3-5 random gain.
function monthlyMonarchPoints(ctx) {
  const g = ctx.game;
  for (const tag of Object.keys(g.tags)) {
    const t = g.tags[tag];
    if (!t || !t.alive || tag === 'REB') continue;
    const r = t.ruler;
    // Advisors: +skill to their pool, wage skill*2 talents a month; an unpaid
    // court (deep debt) walks out.
    const adv = t.advisors || {};
    const advGain = (k) => {
      const a = adv[k];
      if (!a) return 0;
      if (t.treasury <= -200) { adv[k] = null; return 0; }
      t.treasury -= (a.skill || 1) * 2;
      return Math.max(0, Math.min(3, a.skill || 1));
    };
    if (r) {
      const skill = (k) => Math.max(0, Math.min(6, Number.isFinite(r[k]) ? r[k] : 2));
      t.points.gov = Math.min(999, t.points.gov + 2 + skill('gov') + advGain('gov'));
      t.points.infl = Math.min(999, t.points.infl + 2 + skill('infl') + advGain('infl'));
      t.points.mar = Math.min(999, t.points.mar + 2 + skill('mar') + advGain('mar'));
    } else {
      t.points.gov = Math.min(999, t.points.gov + 3 + ctx.rng.int(3));
      t.points.infl = Math.min(999, t.points.infl + 3 + ctx.rng.int(3));
      t.points.mar = Math.min(999, t.points.mar + 3 + ctx.rng.int(3));
    }
  }
}

function monthlyBlock(ctx) {
  const g = ctx.game;
  safe('modifiers', () => tickModifiers(ctx));
  safe('construction', () => monthlyConstruction(ctx)); // before economy: a finished market earns this month
  safe('economy', () => runMonthlyEconomy(ctx));
  safe('manpower', () => monthlyManpower(ctx));
  safe('reinforce', () => monthlyReinforce(ctx));
  safe('morale', () => monthlyMoraleRecovery(ctx));
  safe('attrition', () => monthlyAttrition(ctx));
  safe('garrisons', () => monthlyGarrisons(ctx));
  safe('unrest', () => monthlyUnrest(ctx)); // includes revolt progression & rebel spawns
  safe('succession', () => monthlySuccession(ctx));
  safe('integration', () => monthlyIntegration(ctx));
  safe('holySites', () => monthlyHolySites(ctx));
  safe('missions', () => checkMissions(ctx));
  safe('trigEvents', () => checkTriggeredEvents(ctx));
  safe('ai', () => runMonthlyAI(ctx));
  safe('warExh', () => monthlyWarExhaustion(ctx));
  safe('opinions', () => monthlyOpinionDrift(ctx));
  safe('warscore', () => updateWarscores(ctx));
  safe('tagLife', () => updateTagLife(ctx));
  safe('elimination', () => checkElimination(ctx));
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
