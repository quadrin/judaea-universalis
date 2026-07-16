// js/sim/powers.js — the powers beyond the map (SPEC §55). DOM-free.
// Off-map great powers: no provinces, no armies — a standing per court,
// courting actions, and asks whose effects ride the ordinary modifier and
// adjustment machinery. State lives in game.powers = { [id]: { s: {TAG: n} } }
// so saves carry it for free; cooldowns reuse game.diploCooldowns with
// 'P:<power>:<kind>' keys.

import { num, clamp, setDiploCd, diploCdActive, diploCdMonthsLeft } from './military.js';
import { POWERS } from '../data/powers.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/powers]', ...args);
}

export function powerDefs(ctx) {
  const g = ctx.game;
  return POWERS[g.bookmarkId] || [];
}

export function ensurePowers(ctx) {
  const g = ctx.game;
  if (!g.powers || typeof g.powers !== 'object') g.powers = {};
  for (const def of powerDefs(ctx)) {
    if (!g.powers[def.id]) g.powers[def.id] = { s: {} };
    const st = g.powers[def.id];
    if (!st.s || typeof st.s !== 'object') st.s = {};
    for (const tag of Object.keys(g.tags)) {
      if (tag === 'REB') continue;
      if (!Number.isFinite(st.s[tag])) st.s[tag] = baseline(def, tag);
    }
  }
  return g.powers;
}

function baseline(def, tag) {
  const v = def.start ? def.start[tag] : undefined;
  return clamp(Number.isFinite(v) ? v : 25, 0, 100);
}

export function standingOf(ctx, powerId, tag) {
  ensurePowers(ctx);
  const st = ctx.game.powers[powerId];
  return st && Number.isFinite(st.s[tag]) ? st.s[tag] : 0;
}

function addStanding(ctx, powerId, tag, delta) {
  ensurePowers(ctx);
  const st = ctx.game.powers[powerId];
  if (!st) return;
  st.s[tag] = clamp(num(st.s[tag], 25) + delta, 0, 100);
}

const pKey = (tag, powerId, kind) => tag + '>P:' + powerId + ':' + kind;

// Send an envoy: influence for standing; the rival power takes it coldly.
export function courtPowerCore(ctx, tag, powerId) {
  const g = ctx.game;
  const t = g.tags[tag];
  const def = powerDefs(ctx).find((d) => d.id === powerId);
  if (!t || !def) return { ok: false, why: 'no such power in this age' };
  const c = def.court || { cost: { infl: 25 }, gain: 10, cd: 6 };
  const key = pKey(tag, powerId, 'court');
  if (diploCdActive(ctx, key)) {
    return { ok: false, why: 'our envoys were just there (' + diploCdMonthsLeft(ctx, key) + ' months)' };
  }
  const inflCost = num(c.cost && c.cost.infl, 25);
  if (num(t.points.infl) < inflCost) {
    return { ok: false, why: 'not enough influence points (' + inflCost + ' required)' };
  }
  t.points.infl = num(t.points.infl) - inflCost;
  addStanding(ctx, powerId, tag, num(c.gain, 10));
  if (c.rival) addStanding(ctx, c.rival, tag, -Math.ceil(num(c.gain, 10) / 2));
  setDiploCd(ctx, key, Math.max(1, num(c.cd, 6) | 0));
  return { ok: true, standing: standingOf(ctx, powerId, tag), rival: c.rival || null, name: def.name };
}

// An ask: the power delivers, if the standing (and its patron) allows.
export function askPowerCore(ctx, tag, powerId, askId) {
  const g = ctx.game;
  const t = g.tags[tag];
  const def = powerDefs(ctx).find((d) => d.id === powerId);
  const ask = def && (def.asks || []).find((a) => a.id === askId);
  if (!t || !def || !ask) return { ok: false, why: 'no such favor' };
  const gate = askGate(ctx, tag, def, ask);
  if (gate) return { ok: false, why: gate };
  const cost = ask.cost || {};
  if (num(cost.treasury) > 0) t.treasury = num(t.treasury) - num(cost.treasury);
  for (const k of ['gov', 'infl', 'mar']) {
    if (num(cost[k]) > 0) t.points[k] = num(t.points[k]) - num(cost[k]);
  }
  applyAskEffects(ctx, tag, ask.effects || {});
  setDiploCd(ctx, pKey(tag, powerId, ask.id), Math.max(1, num(ask.cd, 24) | 0));
  try {
    ctx.helpers.chronicle(ctx, 'diplo', (t.name || tag) + ' calls on ' + def.name + ': ' + ask.name.toLowerCase() + '.');
  } catch (e) { /* chronicle is flavor */ }
  return { ok: true, name: ask.name, power: def.name };
}

// Why an ask is barred right now — or '' when it may be taken.
export function askGate(ctx, tag, def, ask) {
  const g = ctx.game;
  const t = g.tags[tag];
  if (Array.isArray(ask.tags) && ask.tags.indexOf(tag) < 0) return 'not offered to our court';
  if (ask.war) {
    const atWar = (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive);
    if (!atWar) return 'only in wartime';
  }
  const need = num(ask.need, 50);
  if (standingOf(ctx, def.id, tag) < need) return 'our standing is too low (' + need + ' required)';
  if (ask.needsPower) {
    for (const pid of Object.keys(ask.needsPower)) {
      if (standingOf(ctx, pid, tag) < num(ask.needsPower[pid], 50)) {
        const patron = powerDefs(ctx).find((d) => d.id === pid);
        return 'requires standing ' + ask.needsPower[pid] + ' with ' + ((patron && patron.name) || pid);
      }
    }
  }
  const key = pKey(tag, def.id, ask.id);
  if (diploCdActive(ctx, key)) return 'granted recently (' + diploCdMonthsLeft(ctx, key) + ' months)';
  const cost = ask.cost || {};
  if (num(cost.treasury) > 0 && num(t.treasury) < num(cost.treasury)) {
    return 'not enough treasury (' + cost.treasury + ' talents)';
  }
  for (const k of ['gov', 'infl', 'mar']) {
    if (num(cost[k]) > 0 && num(t.points[k]) < num(cost[k])) {
      return 'not enough ' + (k === 'mar' ? 'martial' : k === 'gov' ? 'governance' : 'influence') + ' points (' + cost[k] + ')';
    }
  }
  return '';
}

function applyAskEffects(ctx, tag, fx) {
  const flat = {};
  for (const k of ['treasury', 'manpower', 'legitimacy', 'stability', 'gov', 'infl', 'mar']) {
    if (Number.isFinite(fx[k])) flat[k] = fx[k];
  }
  if (Object.keys(flat).length) ctx.helpers.adjust(ctx, tag, flat);
  if (fx.modifier && fx.modifier.id) {
    ctx.helpers.addTagModifier(ctx, tag, {
      id: fx.modifier.id, name: fx.modifier.name || fx.modifier.id,
      months: fx.modifier.months, effects: { ...(fx.modifier.effects || {}) },
    });
  }
}

// Monthly: standing drifts one point back toward its baseline — friendship
// with the great must be tended or it cools to the old climate.
export function monthlyPowers(ctx) {
  const g = ctx.game;
  const defs = powerDefs(ctx);
  if (!defs.length) return;
  ensurePowers(ctx);
  for (const def of defs) {
    const st = g.powers[def.id];
    for (const tag of Object.keys(st.s)) {
      const t = g.tags[tag];
      if (!t || !t.alive) continue;
      const base = baseline(def, tag);
      const cur = num(st.s[tag], base);
      if (cur > base) st.s[tag] = Math.max(base, cur - 1);
      else if (cur < base) st.s[tag] = Math.min(base, cur + 1);
    }
  }
}

// The UI's whole picture for one court.
export function getPowersInfo(ctx, tag) {
  try {
    const g = ctx.game;
    const t = g.tags[tag];
    const defs = powerDefs(ctx);
    if (!t || !defs.length) return [];
    ensurePowers(ctx);
    return defs.map((def) => {
      const c = def.court || { cost: { infl: 25 }, gain: 10, cd: 6 };
      const courtKey = pKey(tag, def.id, 'court');
      const courtCd = diploCdActive(ctx, courtKey) ? diploCdMonthsLeft(ctx, courtKey) : 0;
      const inflCost = num(c.cost && c.cost.infl, 25);
      let whyNotCourt = '';
      if (courtCd > 0) whyNotCourt = 'our envoys were just there (' + courtCd + ' months)';
      else if (num(t.points.infl) < inflCost) whyNotCourt = 'not enough influence points (' + inflCost + ' required)';
      return {
        id: def.id, name: def.name, blurb: def.blurb || '', color: def.color || [120, 120, 120],
        standing: Math.round(standingOf(ctx, def.id, tag)),
        court: {
          can: !whyNotCourt, whyNot: whyNotCourt, cdLeft: courtCd,
          cost: inflCost, gain: num(c.gain, 10),
          rivalName: c.rival ? (((defs.find((d) => d.id === c.rival)) || {}).name || c.rival) : null,
        },
        asks: (def.asks || [])
          .filter((a) => !Array.isArray(a.tags) || a.tags.indexOf(tag) >= 0)
          .map((a) => {
            const why = askGate(ctx, tag, def, a);
            const key = pKey(tag, def.id, a.id);
            return {
              id: a.id, name: a.name, desc: a.desc || '', need: num(a.need, 50),
              can: !why, whyNot: why,
              cdLeft: diploCdActive(ctx, key) ? diploCdMonthsLeft(ctx, key) : 0,
              cost: a.cost || {},
            };
          }),
      };
    });
  } catch (e) { warnOnce('info', 'getPowersInfo failed', e); return []; }
}
