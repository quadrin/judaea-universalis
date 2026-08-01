// Judaea Universalis — daily tick orchestration (SPEC §6.3). DOM-free.

import {
  moveArmiesDaily, tickBattles, tickSieges, monthlyReinforce, monthlyMoraleRecovery,
  monthlyAttrition, monthlyGarrisons, updateWarscores, updateTagLife, checkElimination,
  sweepAirfields, flyPendingRaids, monthlyIncorporation, monthlyClaimFabrications,
  monthlyChancery, declaredRivals, num,
} from './military.js';
import { runMonthlyEconomy, monthlyManpower, monthlyConstruction, monthlySettlement, monthlyExpeditions, yearlyGrowth, monthlySubsidies } from './economy.js';
import { monthlyUnrest, monthlyWarExhaustion, monthlyOpinionDrift, tickModifiers } from './unrest.js';
import { monthlySuccession, monthlyIntegration, checkMissions, monthlyHolySites, monthlyFaithDrift } from './realm.js';
import { monthlyFactions } from './factions.js';
import { monthlyCourts } from './courts.js';
import { monthlyStanding } from './standing.js';
import { monthlyInstitutions } from './institutions.js';
import { monthlyAges } from './ages.js';
import { monthlySacred } from './sacred.js';
import { monthlySchools } from './schools.js';
import { monthlyWeather } from './weather.js';
import { monthlyDiaspora } from './diaspora.js';
import { checkDateEvents, checkTriggeredEvents } from './events.js';
import { runMonthlyAI } from './ai.js';
import { fleetsDaily, merchantVoyagesDaily, monthlyNavy } from './navy.js';
import { monthlyRecruitment } from './recruitment.js';
import { monthlyArms } from './arms.js';
import { monthlyAid } from './aid.js';
import { monthlySupply } from './supply.js';
import { monthlyChapters } from './chapters.js';
import { monthlyPretenders, monthlyRisings } from './revolt.js';
import { monthlyCrises } from './crisis.js';
import { monthlyEmbargoAI } from './embargo.js';

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
    // Declared rivalries (SPEC §86): a court kept on a war footing against a
    // named enemy learns something for it. This is what the player buys by
    // choosing an enemy — and what they give up by choosing to reconcile.
    const rivals = declaredRivals(ctx, tag).filter((k) => g.tags[k] && g.tags[k].alive);
    if (rivals.length) {
      const per = num((ctx.DEFINES.BALANCE || {}).rivalMarPerMonth, 1);
      t.points.mar = Math.min(999, t.points.mar + per * rivals.length);
    }
  }
}

function monthlyBlock(ctx) {
  const g = ctx.game;
  safe('modifiers', () => tickModifiers(ctx));
  if (g.date.m === 1) safe('growth', () => yearlyGrowth(ctx)); // towns grow each January (SPEC §24)
  safe('construction', () => monthlyConstruction(ctx)); // before economy: a finished market earns this month
  safe('expeditions', () => monthlyExpeditions(ctx)); // camps in the waste check their supply line (SPEC §64)
  safe('settlement', () => monthlySettlement(ctx)); // frontier land climbs the habitation ladder (SPEC §43)
  safe('recruitment', () => monthlyRecruitment(ctx)); // one queued unit per province advances
  safe('economy', () => runMonthlyEconomy(ctx));
  safe('subsidies', () => monthlySubsidies(ctx)); // after economy: this month's flow was paid, now count it down
  safe('manpower', () => monthlyManpower(ctx));
  safe('supply', () => monthlySupply(ctx)); // every army traces its line BEFORE the month's bread is handed out (SPEC §82)
  safe('reinforce', () => monthlyReinforce(ctx));
  safe('morale', () => monthlyMoraleRecovery(ctx));
  safe('attrition', () => monthlyAttrition(ctx));
  safe('garrisons', () => monthlyGarrisons(ctx));
  safe('navy', () => monthlyNavy(ctx));
  safe('unrest', () => monthlyUnrest(ctx)); // includes revolt progression & rebel spawns
  safe('pretenders', () => monthlyPretenders(ctx)); // a claim in the field bleeds the throne (SPEC §87)
  safe('risings', () => monthlyRisings(ctx)); // and a band nobody answers burns out (SPEC §112)
  safe('succession', () => monthlySuccession(ctx));
  safe('crises', () => monthlyCrises(ctx)); // what has been brewing gets a month older (SPEC §98)
  safe('embargo', () => monthlyEmbargoAI(ctx)); // the pressure short of war (SPEC §100)
  safe('integration', () => monthlyIntegration(ctx));
  safe('incorporation', () => monthlyIncorporation(ctx)); // unions weave, or unravel (SPEC §61)
  safe('holySites', () => monthlyHolySites(ctx));
  safe('faithDrift', () => monthlyFaithDrift(ctx)); // what spreads without a state behind it (SPEC §104)
  safe('missions', () => checkMissions(ctx));
  safe('factions', () => monthlyFactions(ctx)); // the court convenes (SPEC §34)
  safe('courts', () => monthlyCourts(ctx)); // and so does everybody else's (SPEC §163)
  safe('standing', () => monthlyStanding(ctx)); // who is big, quarterly (SPEC §165)
  safe('institutions', () => monthlyInstitutions(ctx)); // what arose where, and who took it up (SPEC §166)
  safe('ages', () => monthlyAges(ctx)); // and what kind of world it is now (SPEC §168)
  safe('sacred', () => monthlySacred(ctx)); // the hope, the office and the ascents (SPEC §169)
  safe('schools', () => monthlySchools(ctx)); // …and whose reading of the Law it is (SPEC §190)
  safe('weather', () => monthlyWeather(ctx)); // the years, and whether they have noticed us (SPEC §170)
  safe('diaspora', () => monthlyDiaspora(ctx)); // how the communities feel about this crown (SPEC §172)
  safe('claims', () => monthlyClaimFabrications(ctx)); // paid diplomatic operations mature into usable CBs
  safe('trigEvents', () => checkTriggeredEvents(ctx));
  safe('ai', () => runMonthlyAI(ctx));
  safe('warExh', () => monthlyWarExhaustion(ctx));
  safe('chancery', () => monthlyChancery(ctx)); // the establishment is paid for, and the collars chafe (SPEC §201)
  safe('opinions', () => monthlyOpinionDrift(ctx));
  safe('arms', () => monthlyArms(ctx)); // pipelines lapse, and the AI signs its own (SPEC §181)
  safe('aid', () => monthlyAid(ctx)); // war and embargo stop the checks, and the poor petition (SPEC §186)
  safe('warscore', () => updateWarscores(ctx));
  safe('tagLife', () => updateTagLife(ctx));
  safe('elimination', () => checkElimination(ctx));
  if (!g.over && !g.result) {
    safe('victory', () => {
      if (ctx.bookmark && typeof ctx.bookmark.checkVictory === 'function') ctx.bookmark.checkVictory(ctx);
    });
  }
  safe('chapters', () => monthlyChapters(ctx)); // the second act after the verdict (SPEC §83)
  safe('points', () => monthlyMonarchPoints(ctx));
}

export function tickDay(ctx) {
  if (!ctx || !ctx.game) return;
  const g = ctx.game;
  try {
    advanceDate(ctx);
    safe('move', () => moveArmiesDaily(ctx));
    safe('fleets', () => fleetsDaily(ctx));
    safe('merchants', () => merchantVoyagesDaily(ctx));
    safe('battles', () => tickBattles(ctx));
    safe('sieges', () => tickSieges(ctx));
    safe('raids', () => flyPendingRaids(ctx)); // ordered strikes fly when time moves
    safe('airfields', () => sweepAirfields(ctx)); // wings caught on fallen fields
    safe('dateEvents', () => checkDateEvents(ctx));
    const monthly = g.date.d === 1;
    if (monthly) monthlyBlock(ctx);
    ctx.bus.emit('day', { date: { ...g.date } });
    if (monthly) ctx.bus.emit('month', { date: { ...g.date } });
  } catch (e) {
    warnOnce('tickDay', 'tickDay failed', e);
  }
}
