// Judaea Universalis — the courts nobody plays (SPEC §163). DOM-free.
//
// WHY THIS FILE EXISTS. `js/sim/factions.js` opens by saying it out loud:
// "Player-only, the same rule as ultimatums: AI realms keep their politics
// offstage." `activeDefs` returns null for every tag that is not
// `g.playerTag`, so `factionApproval` reads null for Antioch, `shiftFaction`
// is a no-op against Rome, and `monthlyFactions` returns on its first line for
// thirty-nine of the forty courts on the map. Foreign powers could go bankrupt
// and could lose a king, because those two clocks were written for everybody —
// but nothing could ever go wrong inside one for reasons of its own.
//
// That is most of the difference between a world and a set of opponents. The
// thing a player remembers about a grand-strategy campaign is usually not
// their own war; it is the year the rival empire tore itself in half and they
// were close enough to take a bite. Here every foreign power was a treasury,
// an army, an opinion score and an aggression multiplier, and the only bad
// thing that ever happened to one was the player.
//
// WHAT THIS IS NOT. It is not `factions.js` with the player check deleted.
// The estates in the bookmarks are authored, named, era-windowed constituencies
// with boons, banes, demand cards and an appeasement price — a hand-written
// court for the seven or eight thrones a human may sit on. Handing all of that
// to forty AI tags would mean authoring three hundred estates, and it would put
// the player's own carefully-priced modifier stream on every court in the game,
// which is a balance change disguised as a feature.
//
// So a foreign court is a cheaper thing that obeys the same arithmetic: two or
// three parties, approval 0-100, the same four bands at the same four numbers,
// drifting monthly on signals the engine already computes. What it produces at
// the bottom of the scale is not a modifier. It is an EVENT IN THE WORLD:
//
//   1. a policy reversed   — the court stops wanting what it wanted
//   2. the court purged    — whoever is on the throne is taken off it
//   3. a province defects  — the realm is smaller on the map, and someone else
//                            is larger, and neither of them is the player
//   4. a civil war         — the thing you were waiting for
//
// Those escalate on a pressure clock, so a bad year is a bad year and only a
// bad decade is a catastrophe. And every one of them is visible: the Chronicle
// records it, a "News from abroad" toast carries it, and the foreign court's
// own panel shows the bars that produced it. The player did not cause it and
// cannot be blamed for it — which is exactly what makes it worth exploiting.
//
// The player's own court is untouched. `factions.js` still owns it; this
// module returns immediately for `g.playerTag` so the two can never both be
// holding the same throne.

import {
  num, clamp, chronicle, armiesOf, tagDef, livingTag, changeOwnerCore, isOffmapTag,
} from './military.js';
import { rulerDies } from './realm.js';
import { fireRevolt } from './unrest.js';
import { registerSeatSource, registerApprovalSource } from './estates.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/courts]', ...args);
}

// The same four numbers factions.js uses. A court is a court.
export const COURT = {
  devotedAt: 80,
  loyalAt: 60,
  discontentAt: 40,
  hostileAt: 20,
  // A realm too small to have a court: a one-province rump is a garrison with
  // a flag, and the parties in it are the same six men.
  minProvinces: 2,
  // The pressure clock, in months of accumulated hostility. These numbers were
  // four times smaller in the first draft and the balance harness caught it in
  // one run: the Seleucid Empire lost ten provinces in the first eight years of
  // the 167 chapter, and the all-AI Maccabees — who start a war against those
  // provinces — went from three to eleven without declaring a single one. A
  // chapter's opening is balanced against the antagonist it was authored with,
  // and a system that quietly dismantles that antagonist is not adding drama,
  // it is rewriting the scenario.
  //
  // So this is a once-a-generation clock, not a once-a-decade one. Two years of
  // sustained hostility reverses a policy; nine years of it, with the whole
  // court on the floor, is what it takes to reach a civil war.
  reversalAt: 24,
  purgeAt: 54,
  defectionAt: 84,
  civilWarAt: 128,
  // Nothing tears itself apart twice in a generation.
  outcomeCdMonths: 96,
  // How hard one hostile party pushes per month. Two hostile parties push
  // twice as fast, which is what "the court came apart" actually means.
  pressurePerHostile: 1,
  pressureDecay: 0.9,
  // Big realms absorb discontent that would tear a small one apart: an empire
  // has more provinces to be unhappy in and more court to buy off. Thresholds
  // scale by this per province above the reference size, capped — so a
  // seventy-province empire needs roughly twice the pressure a five-province
  // kingdom does, and is correspondingly harder to break.
  sizeRef: 6,
  sizePerProv: 0.014,
  sizeMax: 2.2,
  // And nothing fires at all until a chapter's authored opening has played.
  // The scripted first years are tuned; this system arrives afterwards.
  graceMonths: 72,
  // The pull back toward a wary 50, PROPORTIONAL to how far from it a party
  // has drifted — which is the one thing this engine does differently from
  // `factions.js`, and it is not a stylistic difference.
  //
  // The player's estates regress by a flat ±0.3 a month. That is fine for a
  // hand-authored court whose drift rules were written against a flat pull:
  // any drift under 0.3 settles at exactly 50 and any drift over it walks to
  // 100, so the author simply keeps the rules under 0.3 and steers with the
  // scripted shifts. Generated rules cannot be trusted to stay under a cliff
  // they cannot see, and the first run of this file proved it — every court on
  // the map sat pinned at 100 within a decade, because a stable solvent realm
  // drifts about +0.6 and +0.6 beats a flat 0.3 for ever.
  //
  // Proportional regression has no cliff. A party settles where its drift and
  // its distance from 50 balance: equilibrium is 50 + drift/0.04, so the
  // ordinary good year (about +0.6) rests a court at LOYAL, one thing going
  // wrong (about −0.5) rests it at DISCONTENT, and only a genuinely bad
  // situation — an unpaid army, a losing war, land lost this year — reaches
  // the −1.2 that rests a party on the floor at HOSTILE. The drift clamp is
  // ±2 rather than ±1.5 for the same reason: the bottom of the scale has to
  // be reachable, or the ladder below never fires and this file is decoration.
  regression: 0.04,
  driftClamp: 2,
};

function monthIndex(d) { return d.y * 12 + (d.m - 1); }

// Months since the chapter opened, so the authored first years play out before
// this system starts having opinions about them.
function monthsElapsed(ctx) {
  const s = ctx.bookmark && ctx.bookmark.startDate;
  if (!s || !Number.isFinite(s.y)) return COURT.graceMonths; // no declared start: no grace to give
  return monthIndex(ctx.game.date) - monthIndex({ y: s.y, m: num(s.m, 1) });
}

// Is this one of the thrones the chapter was written around? `playableTags` is
// the bookmark's own list of standards, and `livingTag` forwarding means a
// court that took a greater crown is still the principal it was.
function isChapterPrincipal(ctx, tag) {
  const list = ctx.bookmark && ctx.bookmark.playableTags;
  if (!Array.isArray(list)) return false;
  for (const row of list) {
    const t = row && (typeof row === 'string' ? row : row.tag);
    if (!t) continue;
    if (t === tag || livingTag(ctx, t) === tag) return true;
  }
  return false;
}

// How much more pressure a big realm needs before the same thing happens to it.
function sizeScale(provinces) {
  const over = Math.max(0, num(provinces) - COURT.sizeRef);
  return clamp(1 + over * COURT.sizePerProv, 1, COURT.sizeMax);
}

// ------------------------------------------------------------- the archetypes
//
// Four constitutions, three parties each, and every drift rule reads a number
// the engine was already keeping. Nothing here is authored per nation, because
// the point is coverage: the fortieth court on the map has to have politics
// too, and nobody is going to write them by hand.
//
// `drift` returns approval change per month, before clamping to ±1.5 — the
// same ceiling the player's estates drift under, so no foreign court can swing
// faster than the player's own.
const ARCHETYPES = {
  monarchy: [
    {
      id: 'crown',
      name: 'The King\'s Men',
      desc: 'The household, the chancery, and whoever currently has the ear.',
      drift: (s) => s.stability * 0.35 + (s.legitimacy - 50) * 0.012 + (s.regency ? -0.5 : 0)
        + (s.solvent ? 0.15 : -0.55),
    },
    {
      id: 'magnates',
      name: 'The Great Houses',
      desc: 'Land, lineage, and a long memory for what the crown last took.',
      drift: (s) => (s.atWar ? -0.3 : 0.2) - s.exhaustion * 0.06 - s.freshConquestShare * 1.2
        + (s.taxPressure ? -0.35 : 0.1) + s.lostThisYear * -0.45
        - s.occupiedShare * 1.6 + (s.foreignYoke ? -0.25 : 0),
    },
    {
      id: 'army',
      name: 'The Soldiers',
      desc: 'Paid or unpaid, victorious or not, and always the last word.',
      drift: (s) => (s.paid ? 0.25 : -0.8) + s.wonThisYear * 0.5 + s.lostThisYear * -0.5
        + (s.atWar && s.exhaustion > 8 ? -0.4 : 0) + (s.rulerMar - 2) * 0.12
        - s.occupiedShare * 1.2,
    },
  ],
  republic: [
    {
      id: 'senate',
      name: 'The Senate',
      desc: 'The men who vote the money and remember who asked for it.',
      drift: (s) => s.stability * 0.3 + (s.solvent ? 0.25 : -0.7) - s.freshConquestShare * 0.6
        + (s.rulerGov - 2) * 0.12,
    },
    {
      id: 'people',
      name: 'The People',
      desc: 'Bread, games, and the price of both.',
      drift: (s) => (s.taxPressure ? -0.45 : 0.2) - s.exhaustion * 0.07 + (s.atWar ? -0.15 : 0.15)
        + (s.solvent ? 0.1 : -0.3) - s.occupiedShare * 1.8,
    },
    {
      id: 'legions',
      name: 'The Legions',
      desc: 'Soldiers who have noticed that the Republic pays them last.',
      drift: (s) => (s.paid ? 0.2 : -0.9) + s.wonThisYear * 0.55 + s.lostThisYear * -0.5
        + (s.rulerMar - 2) * 0.15 - s.occupiedShare * 1.2,
    },
  ],
  theocracy: [
    {
      id: 'priesthood',
      name: 'The Priesthood',
      desc: 'The office, its courses, and its revenues.',
      drift: (s) => s.stability * 0.3 + (s.solvent ? 0.2 : -0.5) + (s.regency ? -0.3 : 0)
        + (s.rulerGov - 2) * 0.1,
    },
    {
      id: 'zealots',
      name: 'The Zealous',
      desc: 'Those for whom an accommodation is the same word as a betrayal.',
      drift: (s) => (s.foreignYoke ? -0.7 : 0.2) - s.freshConquestShare * 0.3
        + (s.atWar ? 0.25 : -0.1) - s.occupiedShare * 1.4,
    },
    {
      id: 'notables',
      name: 'The Notables',
      desc: 'The city families who would like the roads open and the ships sailing.',
      drift: (s) => (s.atWar ? -0.35 : 0.3) + (s.solvent ? 0.2 : -0.4)
        - s.exhaustion * 0.05 + (s.taxPressure ? -0.3 : 0.1) - s.occupiedShare * 1.8,
    },
  ],
  tribal: [
    {
      id: 'chiefs',
      name: 'The Chiefs',
      desc: 'Every tent that can field sons has an opinion about the share.',
      drift: (s) => s.wonThisYear * 0.5 + s.lostThisYear * -0.55 + (s.solvent ? 0.2 : -0.35)
        + s.stability * 0.25,
    },
    {
      id: 'warriors',
      name: 'The Young Men',
      desc: 'A confederation at peace is a confederation with nothing to divide.',
      drift: (s) => (s.atWar ? 0.3 : -0.25) + s.wonThisYear * 0.6 - s.exhaustion * 0.05
        - s.occupiedShare * 1.2,
    },
    {
      id: 'elders',
      name: 'The Elders',
      desc: 'The custom, the grazing, and the memory of the last bad bargain.',
      drift: (s) => (s.atWar ? -0.3 : 0.25) - s.freshConquestShare * 0.5
        + (s.regency ? -0.4 : 0) - s.exhaustion * 0.06 - s.occupiedShare * 1.6,
    },
  ],
};

// The constitution a court keeps, defaulting the way the rest of the engine
// defaults: a tag with no declared government is a monarchy.
//
// There are more governments than there are party-sets (SPEC §209), and there
// should be: the four sets above are a coverage device for forty AI courts,
// while the adopted constitutions are authored answers to one chapter's
// question. So a government NAMES the set it convenes (`archetype`) instead of
// matching one by id — otherwise a Temple-State or a Patriarchate, being
// neither of the four names, would quietly seat the Great Houses and the
// King's Men, and the fourth-century Sanhedrin would have a war party of
// magnates in it.
function archetypeFor(ctx, tag) {
  const t = ctx.game.tags[tag];
  const gov = (t && t.govType) || 'monarchy';
  const def = ((ctx.DEFINES && ctx.DEFINES.GOV_TYPES) || {})[gov];
  return ARCHETYPES[(def && def.archetype) || gov] || ARCHETYPES.monarchy;
}

// Every court on the map except the player's, the rebels, and the rumps.
// `livingTag` forwarding means a court that took a greater crown keeps the
// parties it had under the old name, exactly as §102 keeps the player's.
export function courtSeats(ctx, tag) {
  const g = ctx.game;
  if (!g || !tag || tag === 'REB' || tag === 'WASTE') return null;
  if (tag === g.playerTag) return null; // factions.js owns this throne
  const t = g.tags[tag];
  if (!t || !t.alive) return null;
  // An off-map seat (SPEC §180) owns no cell and convenes anyway — watching
  // Washington's parties is most of what the ledger's chip is FOR.
  if (!isOffmapTag(ctx, tag) && provinceCount(ctx, tag) < COURT.minProvinces) return null;
  return archetypeFor(ctx, tag);
}

// …and the foreign courts hand theirs over too (SPEC §167), so a Seleucid
// province knows whether it is the Friends of the King's ground or the
// Phalanx's. Registered after `factions.js` so the player's authored estates
// always answer first for the player's own tag.
registerSeatSource((ctx, tag) => courtSeats(ctx, tag));
registerApprovalSource((ctx, tag, fid) => courtApproval(ctx, tag, fid));

function provinceCount(ctx, tag) {
  const g = ctx.game;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) n++;
  }
  return n;
}

// Seed (or heal) a court's table. Parties open at 50, the same neutral the
// player's estates open at when a bookmark declares no `start`.
export function ensureCourt(ctx, tag) {
  const seats = courtSeats(ctx, tag);
  if (!seats) return null;
  const t = ctx.game.tags[tag];
  if (!t.court || typeof t.court !== 'object') t.court = {};
  if (!t.court.f || typeof t.court.f !== 'object') t.court.f = {};
  for (const def of seats) {
    if (def && def.id && !Number.isFinite(t.court.f[def.id])) t.court.f[def.id] = 50;
  }
  if (!Number.isFinite(t.court.pressure)) t.court.pressure = 0;
  if (!Number.isFinite(t.court.pv)) t.court.pv = provinceCount(ctx, tag);
  if (!Number.isFinite(t.court.won)) t.court.won = 0;
  if (!Number.isFinite(t.court.lost)) t.court.lost = 0;
  return t.court;
}

export function courtState(approval) {
  return approval >= COURT.devotedAt ? 'devoted'
    : approval >= COURT.loyalAt ? 'loyal'
      : approval <= COURT.hostileAt ? 'hostile'
        : approval <= COURT.discontentAt ? 'discontent' : 'content';
}

// Read one party's standing at a foreign court, or null where no court sits.
// This is the number the intrigue module moves and the nation panel prints.
export function courtApproval(ctx, tag, fid) {
  try {
    const live = livingTag(ctx, tag);
    const table = ensureCourt(ctx, live);
    if (!table) return null;
    return Number.isFinite(table.f[fid]) ? clamp(table.f[fid], 0, 100) : null;
  } catch (e) { warnOnce('read:' + tag, 'courtApproval failed', e); return null; }
}

// Move it. Returns false when there is no such court or no such party, so a
// caller that guessed wrong learns rather than silently succeeding.
export function shiftCourt(ctx, tag, fid, delta) {
  try {
    const live = livingTag(ctx, tag);
    const table = ensureCourt(ctx, live);
    if (!table || !Number.isFinite(table.f[fid])) return false;
    table.f[fid] = clamp(num(table.f[fid], 50) + num(delta, 0), 0, 100);
    return true;
  } catch (e) { warnOnce('shift:' + tag, 'shiftCourt failed', e); return false; }
}

// ------------------------------------------------------------------- signals
//
// One pass per tag per month. Every field here is something the engine already
// knew; nothing is stored for the drift rules' benefit except the two counters
// that need a year's memory (wars won and lost), which ride on the court itself
// and therefore save for free.
function signalsFor(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const provinces = provinceCount(ctx, tag);
  let fresh = 0;
  let occupied = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    if (Array.isArray(p.modifiers) && p.modifiers.some((m) => m && m.id === 'recent_conquest')) fresh++;
    if (p.controller && p.controller !== tag) occupied++;
  }
  const army = armiesOf(ctx, tag).reduce((n, a) => n + num(a.men), 0);
  const treasury = num(t.treasury);
  const income = num(t.income);
  return {
    provinces,
    atWar: (t.atWarWith || []).some((k) => g.tags[k] && g.tags[k].alive),
    exhaustion: num(t.warExhaustion),
    stability: clamp(num(t.stability), -3, 3),
    legitimacy: clamp(num(t.legitimacy, 50), 0, 100),
    regency: !!t.regency,
    rulerGov: t.ruler ? num(t.ruler.gov, 2) : 2,
    rulerMar: t.ruler ? num(t.ruler.mar, 2) : 2,
    // Solvent: not merely positive, but not sliding either. A court reads the
    // ledger the way a court does — is there money next month.
    solvent: treasury > 0 || income > 0,
    // Paid: an army in the field with an empty chest is the oldest political
    // fact in this period, and it is the one the archetypes lean on hardest.
    paid: !(army > 0 && treasury < -50),
    taxPressure: num(t.loans) > 2 || treasury < -100,
    freshConquestShare: provinces > 0 ? clamp(fresh / provinces, 0, 1) : 0,
    // A realm with a lord is a realm whose zealous party has something to be
    // zealous about.
    foreignYoke: !!t.overlord,
    occupiedShare: provinces > 0 ? clamp(occupied / provinces, 0, 1) : 0,
    wonThisYear: num(t.court && t.court.won),
    lostThisYear: num(t.court && t.court.lost),
  };
}

// Wars won and lost are the two signals the engine does not keep a running
// count of, so the court keeps its own — decayed yearly, because a victory
// stops being current eventually and so does a defeat.
export function noteCourtWar(ctx, tag, won) {
  try {
    const table = ensureCourt(ctx, livingTag(ctx, tag));
    if (!table) return;
    if (won) table.won = clamp(num(table.won) + 1, 0, 3);
    else table.lost = clamp(num(table.lost) + 1, 0, 3);
  } catch (e) { warnOnce('note:' + tag, 'noteCourtWar failed', e); }
}

// ------------------------------------------------------------------ outcomes
//
// The ladder. Each rung spends the pressure clock and starts the cooldown, so
// a court that has just come apart is a country again for four years.

function announce(ctx, tag, kind, text) {
  const t = ctx.game.tags[tag];
  const name = (t && t.name) || tag;
  chronicle(ctx, kind, name + ': ' + text);
  try {
    if (ctx.bus) ctx.bus.emit('notify', { title: 'News from abroad', text: name + ': ' + text, type: 'info' });
  } catch (e) { warnOnce('notify', 'court notice failed', e); }
}

// 1. A policy is reversed. The cheapest rung and the most common: a court under
// pressure stops wanting the thing that put it under pressure. Aggression is
// the engine's own dial for "how much does this realm want a war", so halving
// it is a real change in the world's weather and costs nobody a province.
function reversePolicy(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  t.aggression = num(t.aggression) * 0.4;
  // A court that has been told to stop also stops holding a grudge quite so
  // hard against whoever it is currently angriest at — one step, not amnesty.
  let worst = null;
  for (const [k, v] of Object.entries(t.opinion || {})) {
    if (!g.tags[k] || !g.tags[k].alive) continue;
    if (worst === null || num(v) < num(t.opinion[worst])) worst = k;
  }
  if (worst) t.opinion[worst] = clamp(num(t.opinion[worst]) + 25, -200, 200);
  t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== 'court_retrenchment');
  t.modifiers.push({
    id: 'court_retrenchment',
    name: 'The Court Retrenches',
    months: 36,
    effects: { incomeMult: 1.05, maintMult: 0.92, milPowerMult: 0.95 },
  });
  announce(ctx, tag, 'politics',
    'the court forces a reversal. The war party is out, the purse is closed, and the policy of the last few years is quietly abandoned.');
}

// 2. The court is purged. Whoever is on the throne comes off it — through the
// engine's own succession, so an heir inherits, a regency opens, a republic
// holds an emergency election, and a court with nobody named gets the full
// §98 crisis. A deposition is not a special case of dying; it is dying.
function purgeCourt(ctx, tag) {
  const t = ctx.game.tags[tag];
  const was = t.ruler ? t.ruler.name : 'The ruler';
  try {
    rulerDies(ctx, tag, 'was deposed by their own court');
  } catch (e) { warnOnce('purge:' + tag, 'purge failed', e); return false; }
  t.stability = clamp(num(t.stability) - 1, -3, 3);
  // A purge IS a settlement: the parties that made it get most of what they
  // wanted, so the whole court resets toward a wary middle rather than staying
  // on the floor and firing the next rung next month.
  const table = t.court;
  if (table && table.f) {
    for (const k of Object.keys(table.f)) table.f[k] = clamp(num(table.f[k], 50) * 0.35 + 45 * 0.65, 0, 100);
  }
  announce(ctx, tag, 'politics',
    was + ' is removed by the court. (−1 stability, and the parties have their settlement.)');
  return true;
}

// 3. A province defects. The realm is smaller, and — this is the part that
// makes it worth watching — someone who is not the player is larger. The land
// goes to a neighbour that shares its faith or its people and is not at war
// with its owner; failing that it rises under its own flag through the ordinary
// §xx rising machinery, which already knows how to pick the right kind.
function defectProvince(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const capital = tagDef(ctx, tag).capital || null;
  let best = null;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    if (capital && p.name === capital) continue; // a court does not lose its own seat this way
    if (p.controller && p.controller !== tag) continue; // already somebody else's problem
    const score = num(p.unrest) * 2
      + (p.religion && p.religion !== t.religion ? 3 : 0)
      + (p.culture && p.culture !== t.culture ? 3 : 0);
    if (!best || score > best.score) best = { p, score };
  }
  if (!best) return false;
  const p = best.p;
  // Who would take it: a living neighbour sharing faith or people, at peace
  // with the realm it is leaving, and not the player — the player does not get
  // free provinces out of somebody else's bad decade.
  const neighbors = new Set();
  try {
    const adj = ctx.geom && ctx.geom.neighbors && ctx.geom.neighbors[p.id !== undefined ? p.id : 0];
    if (adj) for (const nid of adj) {
      const q = g.provinces[nid];
      if (q && q.owner && q.owner !== tag && q.owner !== 'WASTE') neighbors.add(q.owner);
    }
  } catch (e) { warnOnce('adj', 'neighbour walk failed', e); }
  let taker = null;
  for (const k of neighbors) {
    const o = g.tags[k];
    if (!o || !o.alive || k === g.playerTag || k === 'REB') continue;
    if ((o.atWarWith || []).includes(tag)) continue;
    const kin = (p.religion && o.religion === p.religion ? 1 : 0) + (p.culture && o.culture === p.culture ? 1 : 0);
    if (kin <= 0) continue;
    if (!taker || kin > taker.kin) taker = { k, kin };
  }
  if (taker) {
    const to = g.tags[taker.k];
    try {
      changeOwnerCore(ctx, p, taker.k);
    } catch (e) { warnOnce('defect', 'ownership transfer failed', e); return false; }
    p.unrest = Math.max(0, num(p.unrest) - 4);
    t.stability = clamp(num(t.stability) - 1, -3, 3);
    announce(ctx, tag, 'politics',
      p.name + ' will not answer the summons and has gone over to ' + ((to && to.name) || taker.k) + '. (−1 stability)');
    return true;
  }
  return raiseRisingAt(ctx, p, tag);
}

function raiseRisingAt(ctx, p, tag) {
  const t = ctx.game.tags[tag];
  try {
    if (!fireRevolt(ctx, p)) return false;
  } catch (e) { warnOnce('rise', 'rising failed', e); return false; }
  t.stability = clamp(num(t.stability) - 1, -3, 3);
  announce(ctx, tag, 'politics', p.name + ' has raised its own banner against the court. (−1 stability)');
  return true;
}

// 4. Civil war. Stability to the floor, and risings in the two or three
// unhappiest provinces at once — the ordinary rising machinery, so each band
// is classified the way it would be anywhere else (separatists under the old
// flag, a pretender, a religious rising, peasants). What makes it a civil war
// rather than a bad month is that they all happen together to a court that
// cannot pay for three armies.
function civilWar(ctx, tag) {
  const g = ctx.game;
  const t = g.tags[tag];
  const rows = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    if (p.controller && p.controller !== tag) continue;
    rows.push(p);
  }
  rows.sort((a, b) => num(b.unrest) - num(a.unrest));
  let raised = 0;
  for (const p of rows.slice(0, 2)) {
    try { if (fireRevolt(ctx, p)) raised++; } catch (e) { warnOnce('cw', 'civil war rising failed', e); }
  }
  if (!raised) return false;
  t.stability = clamp(num(t.stability) - 2, -3, 3);
  t.legitimacy = clamp(num(t.legitimacy, 50) - 15, 0, 100);
  t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== 'court_civil_war');
  t.modifiers.push({
    id: 'court_civil_war',
    name: 'Civil War',
    months: 48,
    effects: { incomeMult: 0.85, manpowerMult: 0.85, moraleMult: 0.95, unrestAll: 1.5 },
  });
  announce(ctx, tag, 'war',
    'the quarrel in the court has become a war in the country — ' + raised
    + (raised === 1 ? ' host' : ' hosts') + ' in the field against the throne. (stability −3, legitimacy −25)');
  return true;
}

// ------------------------------------------------------------------- monthly
export function monthlyCourts(ctx) {
  const g = ctx.game;
  if (!g || !g.tags) return;
  const now = monthIndex(g.date);
  for (const tag of Object.keys(g.tags)) {
    try {
      const seats = courtSeats(ctx, tag);
      if (!seats) continue;
      const t = g.tags[tag];
      const table = ensureCourt(ctx, tag);
      if (!table) continue;
      const sig = signalsFor(ctx, tag);

      // A realm that lost ground since last month has lost it in the eyes of
      // its own parties, whoever took it.
      if (sig.provinces < num(table.pv, sig.provinces)) table.lost = clamp(num(table.lost) + 1, 0, 3);
      table.pv = sig.provinces;
      // Both counters cool once a year, in the month the campaign started, so
      // a victory five years old stops arguing for the general who won it.
      if (g.date.m === 1) {
        table.won = Math.max(0, num(table.won) - 1);
        table.lost = Math.max(0, num(table.lost) - 1);
      }

      let hostile = 0;
      for (const def of seats) {
        if (!def || !def.id) continue;
        let app = num(table.f[def.id], 50);
        app += (50 - app) * COURT.regression; // proportional pull to the wary middle
        let d = 0;
        try { d = num(def.drift(sig, t), 0); } catch (e) { warnOnce('drift:' + def.id, 'court drift threw', tag, def.id, e); }
        app = clamp(app + clamp(d, -COURT.driftClamp, COURT.driftClamp), 0, 100);
        table.f[def.id] = app;
        if (app <= COURT.hostileAt) hostile++;
      }

      // The pressure clock. Hostility accumulates; anything else bleeds off.
      table.pressure = Math.max(0, num(table.pressure)
        + (hostile ? hostile * COURT.pressurePerHostile : -COURT.pressureDecay));

      if (monthsElapsed(ctx) < COURT.graceMonths) continue;
      if (Number.isFinite(table.cd) && now < table.cd) continue;
      const scale = sizeScale(sig.provinces);
      const p = table.pressure;
      // THE CHAPTER'S PRINCIPALS KEEP THEIR MAP. The two rungs that move
      // provinces are withheld from any court the bookmark names as a playable
      // standard — the Judaea and the Rome of 132 CE, the Herod and the
      // Antigonus of 40 BCE — and `smoke81` is why.
      //
      // That suite runs three centuries of an all-AI 132 chapter over six
      // seeds and asserts each one lands on EXACTLY ONE of the chapter's three
      // roads: the kingdom in the hills, the last stand, or the aftermath. The
      // roads are gated on who holds what, so a court outcome that hands a
      // province across in year 180 can satisfy a second road's gate in year
      // 240, and a chapter that was written to end one way ends two ways. Two
      // seeds did exactly that.
      //
      // The principals still get the two rungs that move POLITICS — a reversed
      // policy and a purged court — because those change what a realm wants
      // and who leads it without touching the board the authored chains read.
      // Every other court on the map keeps the full ladder, which is most of
      // the world: this is a rule about the eight or nine thrones a chapter
      // was written around, not about the forty it merely contains.
      const principal = isChapterPrincipal(ctx, tag);
      let fired = false;
      if (p >= COURT.civilWarAt * scale) fired = principal ? purgeCourt(ctx, tag) : civilWar(ctx, tag);
      else if (p >= COURT.defectionAt * scale) fired = principal ? purgeCourt(ctx, tag) : defectProvince(ctx, tag);
      else if (p >= COURT.purgeAt * scale) fired = purgeCourt(ctx, tag);
      else if (p >= COURT.reversalAt * scale) { reversePolicy(ctx, tag); fired = true; }
      if (fired) {
        table.pressure = 0;
        table.cd = now + COURT.outcomeCdMonths;
      }
    } catch (e) { warnOnce('tick:' + tag, 'court tick failed for', tag, e); }
  }
}

// The panel's read of a foreign court: the same shape `getFactionsInfo`
// returns for the player's own, minus the levers a foreigner does not get to
// pull. Returns null where no court sits — an eliminated realm, a rump, the
// rebels, or the player's own throne, which has its own panel.
export function getCourtInfo(ctx, tag) {
  try {
    const seats = courtSeats(ctx, tag);
    if (!seats) return null;
    const table = ensureCourt(ctx, tag);
    if (!table) return null;
    const pressure = num(table.pressure);
    const nextAt = pressure >= COURT.civilWarAt ? null
      : pressure >= COURT.defectionAt ? COURT.civilWarAt
        : pressure >= COURT.purgeAt ? COURT.defectionAt
          : pressure >= COURT.reversalAt ? COURT.purgeAt : COURT.reversalAt;
    const nextName = nextAt === COURT.reversalAt ? 'a policy reversed'
      : nextAt === COURT.purgeAt ? 'the court purged'
        : nextAt === COURT.defectionAt ? 'a province gone over'
          : nextAt === COURT.civilWarAt ? 'civil war' : 'nothing further';
    return {
      tag,
      pressure: Math.round(pressure),
      nextAt,
      nextName,
      // A court that has just come apart is quiet by right, and the panel says so.
      quietFor: Number.isFinite(table.cd) ? Math.max(0, table.cd - monthIndex(ctx.game.date)) : 0,
      seats: seats.filter((d) => d && d.id).map((def) => {
        const app = Math.round(num(table.f[def.id], 50));
        return {
          id: def.id,
          name: def.name || def.id,
          desc: def.desc || '',
          approval: app,
          state: courtState(app),
        };
      }),
    };
  } catch (e) { warnOnce('info:' + tag, 'getCourtInfo failed', e); return null; }
}
