// Judaea Universalis — the estates and court factions (SPEC §34, §81): the
// realm's internal parties. Each playable tag carries two or three estates
// defined by its bookmark (content owns the politics; this engine owns the
// arithmetic). Approval runs 0-100 and drifts monthly with the era's mood.
// Loyalty is graduated: loyal/discontent estates apply half of their authored
// boon/bane, devoted/hostile estates apply the full effect. Both ride the
// ordinary tag-modifier stream. Player-only, the same rule as ultimatums
// (SPEC §33): AI realms keep their politics offstage. DOM-free.

import { num, clamp } from './military.js';
import { fireEvent } from './events.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/factions]', ...args);
}

export const FACTION = {
  devotedAt: 80,
  loyalAt: 60,
  discontentAt: 40,
  hostileAt: 20,
  demandAt: 35,
  demandCdMonths: 24,
  appeaseCdMonths: 12,
  appeaseGain: 10,
  demandGrant: 12,  // approval for granting a demand…
  demandRefuse: -8, // …and the cost of sending it away
};

function monthIndex(d) { return d.y * 12 + (d.m - 1); }

// The era's faction definitions for a tag (bookmark content), or null.
export function factionDefs(ctx, tag) {
  const all = ctx.bookmark && ctx.bookmark.factions;
  const list = all && all[tag];
  return Array.isArray(list) && list.length ? list : null;
}

// Factions convene only in the player's own court, and only under a human
// hand — an AI-driven player tag (balance autoruns) has no court to hold.
function activeDefs(ctx, tag) {
  const g = ctx.game;
  if (!g || tag !== g.playerTag) return null;
  const t = g.tags[tag];
  if (!t || !t.alive || t.ai) return null;
  return factionDefs(ctx, tag);
}

// Seed (or heal) the approval table: unknown ids start at their def's `start`.
export function ensureFactions(ctx, tag) {
  const defs = activeDefs(ctx, tag);
  if (!defs) return null;
  const t = ctx.game.tags[tag];
  if (!t.factions || typeof t.factions !== 'object') t.factions = {};
  for (const d of defs) {
    if (d && d.id && !Number.isFinite(t.factions[d.id])) {
      t.factions[d.id] = clamp(num(d.start, 50), 0, 100);
    }
  }
  return t.factions;
}

export function factionState(approval) {
  return approval >= FACTION.devotedAt ? 'devoted'
    : approval >= FACTION.loyalAt ? 'loyal'
      : approval <= FACTION.hostileAt ? 'hostile'
        : approval <= FACTION.discontentAt ? 'discontent' : 'content';
}

function effectProfile(approval) {
  const state = factionState(approval);
  if (state === 'devoted') return { state, kind: 'boon', scale: 1 };
  if (state === 'loyal') return { state, kind: 'boon', scale: 0.5 };
  if (state === 'hostile') return { state, kind: 'bane', scale: 1 };
  if (state === 'discontent') return { state, kind: 'bane', scale: 0.5 };
  return { state, kind: '', scale: 0 };
}

// Additive effects scale from zero; multipliers scale from their neutral 1.
// Thus +10% manpower becomes +5% while merely loyal, and −6% morale becomes
// −3% while discontent. Authored bookmark effects stay the single source.
function scaledEffects(effects, scale) {
  const out = {};
  for (const [key, raw] of Object.entries(effects || {})) {
    if (!Number.isFinite(raw)) {
      if (scale >= 1) out[key] = raw;
      continue;
    }
    out[key] = key.endsWith('Mult') ? 1 + (raw - 1) * scale : raw * scale;
  }
  return out;
}

// Move a faction's approval — scripted events, demand cards and appeasement
// all land here. No-op for AI realms and unknown ids: content fails soft.
export function shiftFaction(ctx, tag, fid, delta) {
  try {
    const defs = activeDefs(ctx, tag);
    if (!defs || !defs.some((d) => d && d.id === fid)) return false;
    const table = ensureFactions(ctx, tag);
    if (!table) return false;
    table[fid] = clamp(num(table[fid], 50) + num(delta, 0), 0, 100);
    return true;
  } catch (e) { warnOnce('shift:' + fid, 'shiftFaction failed', e); return false; }
}

// Replace-or-remove one faction modifier on the tag's ordinary stream.
function setFactionModifier(t, id, mod) {
  t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== id);
  if (mod) t.modifiers.push(mod);
}

// Demand cost / appeasement cost: {gov, infl, mar, treasury} — points clamp
// at zero (a poor court pays what it has and owes the rest in resentment),
// treasury may run into debt like any other spending.
function applyCost(ctx, tag, cost) {
  const t = ctx.game.tags[tag];
  if (!t || !cost) return;
  if (Number.isFinite(cost.gov)) t.points.gov = clamp(num(t.points.gov) - cost.gov, 0, 999);
  if (Number.isFinite(cost.infl)) t.points.infl = clamp(num(t.points.infl) - cost.infl, 0, 999);
  if (Number.isFinite(cost.mar)) t.points.mar = clamp(num(t.points.mar) - cost.mar, 0, 999);
  if (Number.isFinite(cost.treasury)) t.treasury = num(t.treasury) - cost.treasury;
  if (Number.isFinite(cost.stability)) t.stability = clamp(num(t.stability) - cost.stability, -3, 3);
}

function costText(cost) {
  if (!cost) return 'nothing';
  const parts = [];
  if (cost.gov) parts.push(cost.gov + ' governance');
  if (cost.infl) parts.push(cost.infl + ' influence');
  if (cost.mar) parts.push(cost.mar + ' martial');
  if (cost.treasury) parts.push(cost.treasury + ' talents');
  if (cost.stability) parts.push(cost.stability + ' stability');
  return parts.join(', ') || 'nothing';
}

// A despairing faction states its price — a dynamic card, the ultimatum's
// machinery (SPEC §33): dyn_* events are rebuilt per session, never saved.
function sendDemand(ctx, tag, def) {
  const g = ctx.game;
  if (!ctx.dynEvents || !def.demand) return;
  const d = def.demand;
  g.flags._dynEvN = num(g.flags._dynEvN, 0) + 1;
  const ev = {
    id: 'dyn_faction_' + g.flags._dynEvN,
    title: d.title || 'A Demand from ' + def.name,
    desc: d.text || def.name + ' demands satisfaction.',
    forTag: tag,
    options: [
      {
        label: (d.grant && d.grant.label) || 'Grant it',
        tooltip: 'Costs ' + costText(d.grant && d.grant.cost) + '. '
          + def.name + ': +' + FACTION.demandGrant + ' approval.'
          + ((d.grant && d.grant.tooltip) ? ' ' + d.grant.tooltip : ''),
        effects: () => {
          try {
            applyCost(ctx, tag, d.grant && d.grant.cost);
            shiftFaction(ctx, tag, def.id, FACTION.demandGrant);
          } catch (e) { warnOnce('grant:' + def.id, 'demand grant failed', e); }
        },
      },
      {
        label: (d.refuse && d.refuse.label) || 'Refuse them',
        tooltip: def.name + ': ' + FACTION.demandRefuse + ' approval.'
          + ((d.refuse && d.refuse.tooltip) ? ' ' + d.refuse.tooltip : ' They will remember.'),
        effects: () => {
          try { shiftFaction(ctx, tag, def.id, FACTION.demandRefuse); } catch (e) { warnOnce('refuse:' + def.id, 'demand refuse failed', e); }
        },
      },
    ],
  };
  ctx.dynEvents.set(ev.id, ev);
  try { fireEvent(ctx, ev); } catch (e) { warnOnce('demand', 'demand card failed', e); }
}

// Monthly: drift, boons and banes, and the demands of the despairing.
export function monthlyFactions(ctx) {
  const g = ctx.game;
  const tag = g.playerTag;
  const defs = activeDefs(ctx, tag);
  if (!defs) return; // no court convenes (AI hand, or an era without factions)
  const t = g.tags[tag];
  const table = ensureFactions(ctx, tag);
  if (!table) return;
  const now = monthIndex(g.date);
  for (const def of defs) {
    if (!def || !def.id) continue;
    try {
      let app = num(table[def.id], 50);
      // slow regression to the middle, then the era's own politics
      app += app > 50 ? -0.3 : app < 50 ? 0.3 : 0;
      if (typeof def.drift === 'function') {
        let d = 0;
        try { d = num(def.drift(ctx, t), 0); } catch (e) { warnOnce('drift:' + def.id, 'faction drift threw', def.id, e); }
        app += clamp(d, -1.5, 1.5);
      }
      app = clamp(app, 0, 100);
      table[def.id] = app;
      // The warmth ladder rides the ordinary modifier stream. months: 2 —
      // refreshed every court session, self-expiring if the court stops.
      const boonId = 'faction_' + def.id + '_boon';
      const baneId = 'faction_' + def.id + '_bane';
      const profile = effectProfile(app);
      setFactionModifier(t, boonId, profile.kind === 'boon' && def.boon ? {
        id: boonId,
        name: (profile.scale < 1 ? 'Loyal: ' : '') + (def.boon.name || def.name + ' Devoted'),
        months: 2,
        effects: scaledEffects(def.boon.effects, profile.scale),
      } : null);
      setFactionModifier(t, baneId, profile.kind === 'bane' && def.bane ? {
        id: baneId,
        name: (profile.scale < 1 ? 'Discontent: ' : '') + (def.bane.name || def.name + ' Hostile'),
        months: 2,
        effects: scaledEffects(def.bane.effects, profile.scale),
      } : null);
      // The demand: one card per faction per two years, never two at once.
      if (app <= FACTION.demandAt && def.demand) {
        if (!g.flags._factionDemandCd) g.flags._factionDemandCd = {};
        const until = g.flags._factionDemandCd[def.id];
        const onTable = (g.pendingEvents || []).some((pe) => pe && String(pe.eventId).startsWith('dyn_faction_'));
        if (!onTable && !(Number.isFinite(until) && now < until)) {
          g.flags._factionDemandCd[def.id] = now + FACTION.demandCdMonths;
          sendDemand(ctx, tag, def);
        }
      }
    } catch (e) { warnOnce('tick:' + def.id, 'faction tick failed for', def.id, e); }
  }
}

// Why the appeasement lever cannot pull right now, or '' when it can — the
// ONE place the cooldown and the four cost gates live, so the panel's
// disabled-tooltip and the click path can never disagree.
function appeaseBlocker(ctx, t, fid, cost) {
  const g = ctx.game;
  const now = monthIndex(g.date);
  const until = g.flags._factionAppCd && g.flags._factionAppCd[fid];
  if (Number.isFinite(until) && now < until) {
    return 'We courted them too recently (' + (until - now) + ' months before they will hear us again).';
  }
  if (Number.isFinite(cost.gov) && num(t.points.gov) < cost.gov) return 'Not enough governance points (' + cost.gov + ' required).';
  if (Number.isFinite(cost.infl) && num(t.points.infl) < cost.infl) return 'Not enough influence points (' + cost.infl + ' required).';
  if (Number.isFinite(cost.mar) && num(t.points.mar) < cost.mar) return 'Not enough martial points (' + cost.mar + ' required).';
  if (Number.isFinite(cost.treasury) && num(t.treasury) < cost.treasury) return 'The treasury cannot spare ' + cost.treasury + ' talents.';
  return '';
}

// The appeasement lever (realm panel): pay the faction's price for +10
// approval, once a year per faction.
export function appeaseFactionCore(ctx, tag, fid) {
  const g = ctx.game;
  const defs = activeDefs(ctx, tag);
  const def = defs && defs.find((d) => d && d.id === fid);
  if (!def) return { ok: false, why: 'No such faction sits at our court.' };
  const t = g.tags[tag];
  const table = ensureFactions(ctx, tag);
  if (!table) return { ok: false, why: 'The court is not in session.' };
  const cost = (def.appease && def.appease.cost) || {};
  const why = appeaseBlocker(ctx, t, fid, cost);
  if (why) return { ok: false, why };
  applyCost(ctx, tag, cost);
  table[fid] = clamp(num(table[fid], 50) + FACTION.appeaseGain, 0, 100);
  if (!g.flags._factionAppCd) g.flags._factionAppCd = {};
  g.flags._factionAppCd[fid] = monthIndex(g.date) + FACTION.appeaseCdMonths;
  return { ok: true, name: def.name, approval: Math.round(table[fid]) };
}

// The panel's read: every faction with approval, state, what the devotion
// grants and the hostility costs, and whether the appeasement lever can pull.
export function getFactionsInfo(ctx) {
  const g = ctx.game;
  const tag = g.playerTag;
  const defs = activeDefs(ctx, tag);
  if (!defs) return null;
  const t = g.tags[tag];
  const table = ensureFactions(ctx, tag);
  if (!table) return null;
  return defs.filter((d) => d && d.id).map((def) => {
    const app = Math.round(num(table[def.id], 50));
    const profile = effectProfile(app);
    const cost = (def.appease && def.appease.cost) || {};
    const whyNot = appeaseBlocker(ctx, t, def.id, cost);
    const active = profile.kind === 'boon' ? def.boon : profile.kind === 'bane' ? def.bane : null;
    const strength = profile.scale >= 1 ? 'full' : profile.scale > 0 ? 'half' : '';
    return {
      id: def.id,
      name: def.name || def.id,
      desc: def.desc || '',
      approval: app,
      state: profile.state,
      boonName: def.boon ? (def.boon.name || '') : '',
      boonText: def.boon ? (def.boon.text || '') : '',
      baneName: def.bane ? (def.bane.name || '') : '',
      baneText: def.bane ? (def.bane.text || '') : '',
      activeKind: profile.kind,
      activeScale: profile.scale,
      activeName: active ? (active.name || '') : '',
      activeText: active
        ? (strength.charAt(0).toUpperCase() + strength.slice(1)
          + (profile.scale < 1 ? ' of ' : ' ')
          + (profile.kind === 'boon' ? 'benefit: ' : 'penalty: ') + (active.text || ''))
        : 'No estate effect at this approval.',
      appeaseLabel: (def.appease && def.appease.label) || ('Court them (' + costText(cost) + ')'),
      appeaseGain: FACTION.appeaseGain,
      canAppease: !whyNot,
      whyNot,
    };
  });
}
