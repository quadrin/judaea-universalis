// Judaea Universalis — the estates and court factions (SPEC §34, §81): the
// realm's internal parties. Each playable tag carries two or three estates
// defined by its bookmark (content owns the politics; this engine owns the
// arithmetic). Approval runs 0-100 and drifts monthly with the era's mood.
// Loyalty is graduated: loyal/discontent estates apply half of their authored
// boon/bane, devoted/hostile estates apply the full effect. Both ride the
// ordinary tag-modifier stream. Player-only, the same rule as ultimatums
// (SPEC §33): AI realms keep their politics offstage. DOM-free.

import { num, clamp, contentForTag, chronicle } from './military.js';
import { fireEvent } from './events.js';
import { influenceScale, estateInfluence, estateGroundSummary, registerSeatSource, registerApprovalSource } from './estates.js';
import { ESTATE_ASKS, ASK_FALLBACK, ASK_KINDS } from '../data/estate_asks.js';

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

// Favor (SPEC §196): the credit an estate extends a crown that keeps it warm.
// Approval is a mood and favor is a BANK — the mood fills it, the crown spends
// it on asks, and the two must not be one number or every ask would also be an
// insult (spending "approval" would cool the very party that just did you a
// service). It accrues monthly by warmth band, decays while the party is
// against you, and what an ask PAYS is scaled by the party's share of the
// realm's ground (influenceScale, SPEC §167) — which is the estates mapmode
// made into a promise: take the coast and the Hellenizers' silver is worth
// more, lose the hills and the villages' levy thins.
export const FAVOR = {
  seed: 10, // a new court extends a token of credit, not a war chest
  cap: 100,
  gainDevoted: 1,
  gainLoyal: 0.5,
  gainContent: 0.15,
  gainDiscontent: -0.5,
  gainHostile: -1.5,
  askFloor: 40, // at or below this approval they will not hear an ask at all
};

function favorGain(state) {
  return state === 'devoted' ? FAVOR.gainDevoted
    : state === 'loyal' ? FAVOR.gainLoyal
      : state === 'hostile' ? FAVOR.gainHostile
        : state === 'discontent' ? FAVOR.gainDiscontent : FAVOR.gainContent;
}

function monthIndex(d) { return d.y * 12 + (d.m - 1); }

// The era's faction definitions for a tag (bookmark content), or null. A
// formed nation keeps its predecessor's court (SPEC §102): the Kingdom of
// Israel still has the zealots and the notables it had as Judaea, because they
// are the same men.
export function factionDefs(ctx, tag) {
  const all = ctx.bookmark && ctx.bookmark.factions;
  const list = contentForTag(ctx, all, tag);
  if (!Array.isArray(list) || !list.length) return null;
  // A court is not a fixed cast (SPEC §127). A faction def may declare the
  // years it exists — `fromYear`, `untilYear` — and the parties in the room
  // change while the chapter runs, which for a chapter that runs 173 years is
  // the difference between a court and a photograph. The 167 chapter opens
  // with the Hasideans, who are attested fighting for the Law in the 160s and
  // gone from the record by the 140s, and it now runs to 6 CE through the
  // whole quarrel between the two parties that replaced them. Without this
  // the player was still appeasing the Hasideans in 40 BCE.
  //
  // A def with no window is timeless, exactly like an event with no era
  // window; the filter costs one pass and only chapters that ask for it pay.
  //
  // The list is returned BY IDENTITY when no def in it declares a window, so
  // a court that never changes hands allocates nothing per month and stays
  // `===` to itself across a proclamation — which is how §102 checks that a
  // formed crown kept the same men.
  const y = ctx.game && ctx.game.date ? ctx.game.date.y : null;
  if (y === null) return list;
  let windowed = false;
  for (const d of list) {
    if (d && (Number.isFinite(d.fromYear) || Number.isFinite(d.untilYear))) { windowed = true; break; }
  }
  if (!windowed) return list;
  const live = list.filter((d) => d
    && (!Number.isFinite(d.fromYear) || y >= d.fromYear)
    && (!Number.isFinite(d.untilYear) || y < d.untilYear));
  return live.length ? live : null;
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

// `estates.js` needs to know which parties sit at a court to give them ground,
// and it must not import either political engine to find out (both of them
// call IT). So each engine hands its own seat list over on load. The player's
// court registers first and therefore answers first, which is correct: a tag
// the bookmark has authored estates for is that tag's real court, and the
// generated archetypes are only for the ones it has not.
registerSeatSource((ctx, tag) => activeDefs(ctx, tag));
registerApprovalSource((ctx, tag, fid) => factionApproval(ctx, tag, fid));

// Seed (or heal) the approval table: unknown ids start at their def's `start`.
export function ensureFactions(ctx, tag) {
  const defs = activeDefs(ctx, tag);
  if (!defs) return null;
  const t = ctx.game.tags[tag];
  if (!t.factions || typeof t.factions !== 'object') t.factions = {};
  // The favor bank rides beside the approval table and heals the same way:
  // an old save without one wakes up with every party at the seed, exactly
  // like a new campaign (SPEC §196).
  if (!t.estateFavor || typeof t.estateFavor !== 'object') t.estateFavor = {};
  for (const d of defs) {
    if (d && d.id && !Number.isFinite(t.estateFavor[d.id])) {
      // Credit follows the seat like the mood does (SPEC §127): the Pharisees
      // inherit whatever the Hasideans had banked, because they are the same
      // men and the crown's debts to them did not expire with the name.
      const from = d.succeeds && Number.isFinite(t.estateFavor[d.succeeds])
        ? t.estateFavor[d.succeeds] : null;
      t.estateFavor[d.id] = clamp(from === null ? FAVOR.seed : from, 0, FAVOR.cap);
    }
    if (d && d.id && !Number.isFinite(t.factions[d.id])) {
      // A party that succeeds another inherits where it stood (SPEC §127).
      // The Pharisees are not a new constituency introduced to a court that
      // has never met them; they are, as far as this crown's relationship
      // with the pious is concerned, the same men under a name the record
      // starts using around 140. Reseeding them at neutral would hand a king
      // who spent thirty years courting the Hasideans a clean slate he did
      // not earn, and one who spent thirty years affronting them an amnesty.
      const from = d.succeeds && Number.isFinite(t.factions[d.succeeds])
        ? t.factions[d.succeeds] : null;
      t.factions[d.id] = clamp(from === null ? num(d.start, 50) : from, 0, 100);
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
    if (!defs) return false;
    const id = seatedHeir(ctx, tag, defs, fid);
    if (!id) return false;
    const table = ensureFactions(ctx, tag);
    if (!table) return false;
    table[id] = clamp(num(table[id], 50) + num(delta, 0), 0, 100);
    return true;
  } catch (e) { warnOnce('shift:' + fid, 'shiftFaction failed', e); return false; }
}

// The seat, not the name (SPEC §127). A card written for the Hasideans that
// fires in 90 BCE means the pious party, and the pious party is by then called
// the Pharisees. Without this, thirteen cards of the 167 chain that name the
// Hasideans — the eight hundred crosses, Salome's deathbed, the admonition,
// the Law of the Nations — would shift a faction no longer seated and do
// nothing at all, which is exactly the silence this whole section is about.
// A card is free to name the successor directly, and the empire package does;
// this is for the older cards, which are correct on both sides of the change
// and should not have to know which side they landed on.
function seatedHeir(ctx, tag, defs, fid) {
  if (defs.some((d) => d && d.id === fid)) return fid;
  const all = contentForTag(ctx, ctx.bookmark && ctx.bookmark.factions, tag);
  if (!Array.isArray(all)) return null;
  const byId = new Map(all.map((d) => [d && d.id, d]));
  for (const live of defs) {
    let step = live;
    for (let hop = 0; step && hop < 8; hop++) {
      if (step.succeeds === fid) return live.id;
      step = byId.get(step.succeeds);
    }
  }
  return null;
}

// Read a faction's standing (SPEC §130). Content could always MOVE a faction
// and never ask where one stood, which meant a card could not be gated on the
// court that would have to live with it — and the four constitutions of 66 are
// exactly that gate: which settlement the room can produce depends on who is
// strong in it when the war ends.
//
// Returns 0–100, or null when no court sits here at all: factions convene only
// in the player's own court and only under a human hand, so an AI realm and an
// era without factions both read null rather than a misleading 50. A departed
// faction resolves through `succeeds` exactly as `shiftFaction` does, so a card
// may ask after the Hasideans in 90 BCE and get the Pharisees' answer.
export function factionApproval(ctx, tag, fid) {
  try {
    const defs = activeDefs(ctx, tag);
    if (!defs) return null;
    const id = seatedHeir(ctx, tag, defs, fid);
    if (!id) return null;
    const table = ensureFactions(ctx, tag);
    if (!table) return null;
    return clamp(num(table[id], 50), 0, 100);
  } catch (e) { warnOnce('read:' + fid, 'factionApproval failed', e); return null; }
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
      // The favor bank fills from the mood (SPEC §196): a devoted party
      // extends credit twice as fast as a loyal one, a hostile one calls
      // its credit in three times as fast as a discontent one lets it lapse.
      if (t.estateFavor) {
        t.estateFavor[def.id] = clamp(
          num(t.estateFavor[def.id], FAVOR.seed) + favorGain(profile.state), 0, FAVOR.cap);
      }
      // …times what this party actually holds of the realm (SPEC §167). An
      // estate whose ground you do not rule is an estate whose mood barely
      // reaches the ledger; one that holds half your development is one you
      // cannot ignore at any approval. This is the line that makes taking the
      // Greek coast an act of domestic politics rather than map-painting.
      const weight = influenceScale(ctx, tag, def.id);
      setFactionModifier(t, boonId, profile.kind === 'boon' && def.boon ? {
        id: boonId,
        name: (profile.scale < 1 ? 'Loyal: ' : '') + (def.boon.name || def.name + ' Devoted'),
        months: 2,
        effects: scaledEffects(def.boon.effects, profile.scale * weight),
      } : null);
      setFactionModifier(t, baneId, profile.kind === 'bane' && def.bane ? {
        id: baneId,
        name: (profile.scale < 1 ? 'Discontent: ' : '') + (def.bane.name || def.name + ' Hostile'),
        months: 2,
        effects: scaledEffects(def.bane.effects, profile.scale * weight),
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

// ---------------------------------------------------------------------------
// The asks (SPEC §196): what a trusted estate can be leaned on FOR.
//
// A bookmark may author `asks` directly on a faction def (content owns the
// politics); otherwise the party's id finds its authored pair in
// js/data/estate_asks.js, and an id nobody has written asks for degrades to
// the generic fallback rather than to silence.
function asksFor(def) {
  const authored = def && Array.isArray(def.asks) && def.asks.length ? def.asks : null;
  const list = authored || ESTATE_ASKS[def && def.id] || ASK_FALLBACK;
  return list.filter((a) => a && a.kind && ASK_KINDS[a.kind]);
}

// One ask keeps one modifier slot: asking again refreshes the clock rather
// than stacking the effect — favor is the throttle, not a cooldown table.
function setAskModifier(t, def, ask, effects, months) {
  const id = 'ask_' + def.id + '_' + ask.kind;
  t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== id);
  t.modifiers.push({ id, name: ask.name, months, effects });
}

// What one ask would grant RIGHT NOW, measured against the realm as it
// stands — the same object serves the tooltip and the grant, so the promise
// and the payment cannot disagree. Every payoff is scaled by the party's
// share of the realm's ground (influenceScale, SPEC §167): this is the line
// that makes the estates mapmode a promise. `t.income` and `t.maxManpower`
// are the tag's own monthly-cached figures, so no import edge into the
// economy is needed (sacred.js already imports this module).
function askPayoff(ctx, tag, def, ask) {
  const t = ctx.game.tags[tag];
  const k = ASK_KINDS[ask.kind];
  if (!t || !k) return null;
  const scale = influenceScale(ctx, tag, def.id);
  switch (ask.kind) {
    case 'coin': {
      const amt = Math.max(k.floor, Math.round(num(t.income) * k.incomeMonths * scale));
      return { text: '+' + amt + ' talents, at once', apply() { t.treasury = num(t.treasury) + amt; } };
    }
    case 'men': {
      const amt = Math.max(k.floor, Math.round(num(t.maxManpower) * k.share * scale));
      return {
        text: '+' + amt.toLocaleString('en-US') + ' manpower, at once',
        apply() { t.manpower = clamp(num(t.manpower) + amt, 0, Math.max(0, num(t.maxManpower))); },
      };
    }
    case 'blessing': {
      const amt = Math.round(k.legitimacy * scale);
      return { text: '+' + amt + ' legitimacy, at once', apply() { t.legitimacy = clamp(num(t.legitimacy, 50) + amt, 0, 100); } };
    }
    case 'counsel': {
      const pt = ask.point || k.point || 'gov';
      const amt = Math.round(k.points * scale);
      const ptName = pt === 'mar' ? 'martial' : pt === 'infl' ? 'influence' : 'governance';
      return { text: '+' + amt + ' ' + ptName + ' points', apply() { t.points[pt] = clamp(num(t.points[pt]) + amt, 0, 999); } };
    }
    case 'hands': {
      const mult = 1 + k.incomeMult * scale;
      return {
        text: '+' + Math.round((mult - 1) * 100) + '% income for ' + k.months + ' months',
        apply() { setAskModifier(t, def, ask, { incomeMult: mult }, k.months); },
      };
    }
    case 'zeal': {
      const mult = 1 + k.moraleMult * scale;
      return {
        text: '+' + Math.round((mult - 1) * 100) + '% morale for ' + k.months + ' months',
        apply() { setAskModifier(t, def, ask, { moraleMult: mult }, k.months); },
      };
    }
    case 'calm': {
      const amt = Math.round(k.unrest * scale * 10) / 10;
      return {
        text: '−' + amt + ' unrest everywhere for ' + k.months + ' months',
        apply() { setAskModifier(t, def, ask, { unrestAll: -amt }, k.months); },
      };
    }
    default: return null;
  }
}

// Why this ask cannot be made right now, or '' when it can — the ONE place
// the gates live, so the disabled-tooltip and the click path never disagree
// (the same contract appeaseBlocker keeps for its lever).
function askBlocker(ctx, t, def, ask) {
  const k = ASK_KINDS[ask.kind];
  const app = num(t.factions && t.factions[def.id], 50);
  if (app <= FAVOR.askFloor) {
    return 'They are in no mood to be asked (approval ' + Math.round(app)
      + ' — above ' + FAVOR.askFloor + ' required).';
  }
  const have = num(t.estateFavor && t.estateFavor[def.id], 0);
  if (have < k.favor) return 'Not enough favor banked (' + Math.floor(have) + ' of ' + k.favor + ').';
  if (ask.kind === 'men') {
    if (num(t.maxManpower) <= 0) return 'The realm has no muster rolls to add to.';
    if (num(t.manpower) >= num(t.maxManpower)) return 'The muster rolls are already full.';
  }
  if (ask.kind === 'blessing' && num(t.legitimacy, 50) >= 100) {
    return 'The crown\'s standing is already beyond question.';
  }
  return '';
}

// The ask lever (realm panel): spend banked favor, receive what this party's
// ground can actually deliver.
export function askEstateCore(ctx, tag, fid, askKind) {
  const defs = activeDefs(ctx, tag);
  const def = defs && defs.find((d) => d && d.id === fid);
  if (!def) return { ok: false, why: 'No such party sits at our court.' };
  const t = ctx.game.tags[tag];
  if (!ensureFactions(ctx, tag)) return { ok: false, why: 'The court is not in session.' };
  const ask = asksFor(def).find((a) => a.kind === askKind);
  if (!ask) return { ok: false, why: 'They have nothing of that kind to give.' };
  const why = askBlocker(ctx, t, def, ask);
  if (why) return { ok: false, why };
  const pay = askPayoff(ctx, tag, def, ask);
  if (!pay) return { ok: false, why: 'They have nothing of that kind to give.' };
  t.estateFavor[fid] = clamp(num(t.estateFavor[fid], 0) - ASK_KINDS[ask.kind].favor, 0, FAVOR.cap);
  pay.apply();
  chronicle(ctx, 'politics', def.name + ' grant what the crown asked: '
    + ask.name + ' (' + pay.text + ').');
  return { ok: true, name: def.name, ask: ask.name, granted: pay.text };
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
  // One province walk for the shares, one per party for its named ground —
  // the same arithmetic the estates mapmode paints (SPEC §167/§196).
  let shares = null;
  try { shares = estateInfluence(ctx, tag); } catch (e) { warnOnce('shares', 'estateInfluence failed', e); }
  return defs.filter((d) => d && d.id).map((def) => {
    const app = Math.round(num(table[def.id], 50));
    const profile = effectProfile(app);
    const cost = (def.appease && def.appease.cost) || {};
    const whyNot = appeaseBlocker(ctx, t, def.id, cost);
    const active = profile.kind === 'boon' ? def.boon : profile.kind === 'bane' ? def.bane : null;
    const strength = profile.scale >= 1 ? 'full' : profile.scale > 0 ? 'half' : '';
    let ground = null;
    try { ground = estateGroundSummary(ctx, tag, def.id); } catch (e) { warnOnce('gs:' + def.id, 'ground summary failed', e); }
    return {
      favor: Math.floor(num(t.estateFavor && t.estateFavor[def.id], 0)),
      favorCap: FAVOR.cap,
      favorGain: favorGain(profile.state),
      influencePct: shares && Number.isFinite(shares[def.id]) ? Math.round(shares[def.id] * 100) : null,
      ground,
      asks: asksFor(def).map((a) => {
        const blocked = askBlocker(ctx, t, def, a);
        const pay = askPayoff(ctx, tag, def, a);
        return {
          key: a.kind,
          name: a.name,
          text: a.text || '',
          favorCost: ASK_KINDS[a.kind].favor,
          grants: pay ? pay.text : '',
          ready: !blocked,
          whyNot: blocked,
        };
      }),
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
