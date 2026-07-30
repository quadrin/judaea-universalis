// Judaea Universalis — the years and the eye (SPEC §170). DOM-free.
//
// Two pressures the world applies to a realm over time, neither of which
// existed, and both of which are about the same thing: a campaign that has
// been going well for twenty years should not feel identical to one that has
// been going well for two.
//
// THE YEARS. The generic pool (SPEC §52) has good harvests and failed rains,
// and it rolls each of them independently at a flat chance every month, which
// makes weather a coin. Weather in this region is not a coin — it is a cycle,
// and every agrarian state in it knew that. A wet decade fills the granaries
// and the treasury and grows the towns; a dry one empties them, and the dry
// one arrives whether or not you deserved it. So there is a slow climate index
// that wanders between wet and dry over roughly a generation, it multiplies
// the harvest events' odds in both directions, and it is legible: the realm
// panel says what kind of years these are, which is the difference between
// bad luck and a bad decade you can plan around.
//
// THE EYE. Empires do not apply constant pressure; they apply pressure
// proportional to how much of a problem you are. A revolt that takes two hill
// forts is a governor's problem. A revolt that takes Jerusalem, mints its own
// coinage and beats a legion is an emperor's problem, and the response is not
// the same size. The game had this as authored escalation inside individual
// chains — Severus sent for from Britain, Vespasian given the East — which is
// right for the scripted war and does nothing at all for the campaign that has
// outrun its own chapter. `attention` is that as a system: it rises with what
// you have actually done (land taken from the era's great powers, wars won
// against them, your standing among them, your infamy), it decays while you are
// quiet, and it feeds the one number the AI already uses to size its armies.
//
// It is deliberately NOT a difficulty setting. It reads only what the player
// did, so a player who conquers nothing is never noticed, and a player who
// takes half the east is noticed whether or not they wanted to be.

import { num, clamp, chronicle } from './military.js';
import { standingOf } from './standing.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/weather]', ...args);
}

export const WEATHER = {
  // The climate index runs −100 (drought years) to +100 (wet years) and turns
  // over roughly every twenty-five years, which is about the period the
  // sources themselves treat as a cycle of plenty and famine.
  swingMonths: 300,
  // How far the index bends the generic pool's harvest odds at its extremes.
  harvestSwing: 0.7,
  // ---- the eye ----
  attentionMax: 100,
  attentionDecay: 0.25, // a month, while nothing is happening
  // What raises it, per month, from what is true right now.
  perGreatPowerProvince: 0.09, // land held that a top-table court used to own
  perInfamy: 0.02,
  perRankStep: 0.05, // …and simply for climbing the table
  // What it does: a multiplier on the threat share the AI sizes its hosts
  // against. Narrow, because that dial is load-bearing.
  threatAtMax: 0.45,
};

function monthIndex(d) { return d.y * 12 + (d.m - 1); }

// ─────────────────────────────────────────────────────────────── the years
//
// A deterministic wander rather than a random walk: the index is a function of
// the date and the campaign's seed, so it costs nothing to store, it cannot
// drift out of sync across a save, and two players on the same seed get the
// same decade of drought — which is what makes it a fact about the world
// rather than a fact about your luck.
export function climateIndex(ctx) {
  try {
    const g = ctx.game;
    const m = monthIndex(g.date);
    const seed = num(g.rngSeed, 1);
    // Two incommensurable periods so the cycle never repeats exactly.
    const a = Math.sin((m / WEATHER.swingMonths) * Math.PI * 2 + seed * 0.7);
    const b = Math.sin((m / (WEATHER.swingMonths * 0.41)) * Math.PI * 2 + seed * 1.3);
    return clamp(Math.round((a * 0.72 + b * 0.28) * 100), -100, 100);
  } catch (e) { warnOnce('climate', 'climateIndex failed', e); return 0; }
}

export function climateBand(v) {
  return v >= 55 ? 'abundant' : v >= 18 ? 'good' : v <= -55 ? 'drought' : v <= -18 ? 'lean' : 'ordinary';
}

// What the generic pool multiplies its harvest odds by. `good` events scale up
// in a wet decade and down in a dry one; `bad` events do the reverse. Content
// calls this through `ctx.helpers.climate`, so `js/data/events_generic.js`
// keeps its zero imports.
export function harvestOdds(ctx, kind) {
  const v = climateIndex(ctx) / 100;
  const s = WEATHER.harvestSwing;
  return kind === 'bad' ? clamp(1 - v * s, 1 - s, 1 + s) : clamp(1 + v * s, 1 - s, 1 + s);
}

// ───────────────────────────────────────────────────────────────── the eye
export function attention(ctx) {
  const t = ctx.game.tags[ctx.game.playerTag];
  return t ? clamp(num(t.attention), 0, WEATHER.attentionMax) : 0;
}

export function attentionBand(v) {
  return v >= 75 ? 'an imperial problem' : v >= 50 ? 'a standing concern'
    : v >= 25 ? 'a provincial nuisance' : 'beneath notice';
}

// The multiplier the AI's threat sizing gets. 1 at the bottom of the scale,
// so a quiet realm is exactly where it was before this file existed.
export function attentionThreat(ctx, tag) {
  try {
    if (!ctx.game || tag !== ctx.game.playerTag) return 1;
    return 1 + (attention(ctx) / WEATHER.attentionMax) * WEATHER.threatAtMax;
  } catch (e) { warnOnce('threat', 'attentionThreat failed', e); return 1; }
}

// How much of what the player holds was, at the campaign's opening, the land of
// a court now at the top table. This is the honest measure of "have you become
// somebody's problem": not how big you are, but how much of somebody big you
// are standing on.
function takenFromThePowers(ctx) {
  const g = ctx.game;
  const me = g.playerTag;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner !== me && p.controller !== me) continue;
    const was = p.canonOwner || (ctx.MAP_DATA && ctx.MAP_DATA.provinces[p.id - 1]
      ? ctx.MAP_DATA.provinces[p.id - 1].owner : null);
    if (!was || was === me || was === 'WASTE') continue;
    const st = standingOf(ctx, was);
    if (st && st.isPower) n++;
  }
  return n;
}

export function attentionReport(ctx) {
  try {
    const g = ctx.game;
    const t = g.tags[g.playerTag];
    if (!t || t.ai) return null;
    const v = attention(ctx);
    return {
      value: Math.round(v),
      band: attentionBand(v),
      threat: Math.round((attentionThreat(ctx, g.playerTag) - 1) * 100),
      onPowerLand: takenFromThePowers(ctx),
      infamy: Math.round(num(t.aggression)),
    };
  } catch (e) { warnOnce('attreport', 'attentionReport failed', e); return null; }
}

export function climateReport(ctx) {
  try {
    const v = climateIndex(ctx);
    return {
      value: v,
      band: climateBand(v),
      text: v >= 55 ? 'The rains have come every year anyone can remember.'
        : v >= 18 ? 'Good years — the granaries hold.'
          : v <= -55 ? 'A drought that has outlasted the men who remember the last one.'
            : v <= -18 ? 'Lean years. The reservoirs are watched.'
              : 'Ordinary years, neither full nor empty.',
    };
  } catch (e) { warnOnce('climreport', 'climateReport failed', e); return null; }
}

export function monthlyWeather(ctx) {
  const g = ctx.game;
  if (!g || !g.tags) return;
  try {
    const me = g.playerTag;
    const t = g.tags[me];
    if (!t || !t.alive || t.ai) return;
    const rise = takenFromThePowers(ctx) * WEATHER.perGreatPowerProvince
      + num(t.aggression) * WEATHER.perInfamy
      + (() => {
        const st = standingOf(ctx, me);
        if (!st || !st.isPower) return 0;
        return (st.seats - st.rank + 1) * WEATHER.perRankStep;
      })();
    const was = attentionBand(num(t.attention));
    t.attention = clamp(num(t.attention) + rise - WEATHER.attentionDecay, 0, WEATHER.attentionMax);
    const now = attentionBand(t.attention);
    if (now !== was) {
      chronicle(ctx, 'era', 'The great powers now consider this realm ' + now + '.');
      try {
        if (ctx.bus) {
          ctx.bus.emit('notify', {
            title: 'They have noticed us',
            text: 'This realm is ' + now + '. Armies raised against us will be sized accordingly.',
            type: attention(ctx) > num(t.attention) ? 'info' : 'bad',
          });
        }
      } catch (e) { warnOnce('attnotify', 'attention notice failed', e); }
    }
  } catch (e) { warnOnce('tick', 'monthlyWeather failed', e); }
}
