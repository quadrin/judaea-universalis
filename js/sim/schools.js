// Judaea Universalis — the religious quarrels (SPEC §190, §201). DOM-free.
//
// §190 built this for one quarrel and §201 made it every chapter's. The
// arithmetic below is unchanged and shared; which two seats are arguing, what
// they are arguing about and what either answer costs all come from the
// chapter's own entry in js/data/schools.js, resolved through the bookmark.
//
// §34 gave the court parties an approval bar each and a lever to raise it.
// That is the right engine for five estates who want five different things,
// and it is the wrong one for these two, because the Pharisees and the
// Sadducees do not want different things from the crown — they want the SAME
// thing, which is to be the reading of the Law that the crown administers, and
// there is exactly one of those. Two bars cannot say that. A player could keep
// both houses at 75 for a century and never learn that the historical crown
// could not, because every ruling it made cost it one of them.
//
// This module is the thing the two bars were missing:
//
//   THE READING     −10..+10, the realm's standing answer to the quarrel.
//                   Built from the rulings the crown has actually given, and
//                   paying a realm-wide benefit and price the whole way out to
//                   both poles: the schools buy the country, the houses buy
//                   the treasury, and neither buys both.
//
//   THE RULINGS     The chapter's own recorded disputes (js/data/schools.js) —
//                   the Omer count and the red heifer in the Hasmonean
//                   chapters, the golden eagle and the prosbul under Herod,
//                   the offering for Caesar in 66, the date on the documents
//                   in 132, the reckoning of the feasts on Gerizim, the first
//                   fire on a restored Mount, the letter of June in 1948. Each
//                   is given once, permanently, for points; each grants a
//                   named modifier for the rest of the campaign; each raises
//                   one side and drops the other by the same fixed swing, so
//                   no entry can be authored soft enough to be free.
//
//   THE COURT       What the two houses do TOGETHER — concord, one-sided
//                   breach, or schism. This is the read that two independent
//                   bars structurally could not produce: a crown with one
//                   devoted house and one broken one is in a worse position
//                   than a crown both houses merely tolerate, and until now
//                   the arithmetic said the opposite.
//
//   THE OFFICE      Whose house the High Priest comes from, measured against
//                   the reading the crown has ruled for. A Sadducean priest
//                   performing rites the crown has ruled Pharisaic is the
//                   single most quoted fact about the late Second Temple, and
//                   it now costs what it should.
//
//   THE BREACH      A side on the floor for two years deals its card: the
//                   citrons at the water-gate, the golden eagle, the lot that
//                   fell on a stonecutter, the test at the muster, the feast
//                   proclaimed late, the morning they would light it, the four
//                   hundred. Both poles have one; all of them are forks rather
//                   than punishments.
//
// Player's own realm only, on the same rule as §34's estates and §169's
// office: an AI court's theology is its own business. Everything fails soft —
// a court whose bookmark declares no quarrel, or which does not seat both of
// its quarrel's sides, never sees any of it.

import { num, clamp, chronicle } from './military.js';
import { factionApproval, shiftFaction, factionDefs, factionState } from './factions.js';
import { templeStands } from './sacred.js';
import { fireEvent } from './events.js';
import { QUARRELS, DEFAULT_QUARREL, COURT_EFFECTS, COURT_TEXT } from '../data/schools.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/schools]', ...args);
}

export const SCHOOLS = {
  max: 10, // the reading's poles
  committedAt: 6, // …and where the panel stops saying "leaning"
  leaningAt: 2,
  rulingSwing: 10, // what a ruling gives one house and takes from the other
  rulingCdMonths: 18, // the court does not reopen the Law twice in a year and a half
  readingPull: 0.5, // …and what a standing reading is worth to them every month
  // The court states, read off both approvals at once.
  concordAt: 60, // both houses here or better
  brokenAt: 25, // one house here or worse…
  backedAt: 55, // …while the other is here or better: a breach
  schismAt: 40, // both here or worse
  // The office, measured against the reading.
  officeAligned: 0.3, // legitimacy a month when the priest's house is the crown's reading
  officeAtOdds: -0.35, // …and when it is the other one
  vacancyUnderLo: -0.3, // an empty office under a `lo` reading: the custodians need a priest
  // The breach cards.
  breachMonthsToCrisis: 24,
  crisisCdMonths: 120,
};

// Every ruling in the game, by id, across every quarrel. Ids are unique by
// construction and the loader below says so out loud rather than letting one
// chapter's dispute silently answer another chapter's.
const RULING_BY_ID = new Map();
for (const q of Object.values(QUARRELS)) {
  for (const r of q.rulings || []) {
    if (RULING_BY_ID.has(r.id)) warnOnce('dup:' + r.id, 'two quarrels declare the ruling id', r.id);
    RULING_BY_ID.set(r.id, r);
  }
}

function monthIndex(d) { return d.y * 12 + (d.m - 1); }

// Which quarrel this court is having (SPEC §201). The bookmark maps a tag to a
// quarrel id — `schools: { HER: 'fence_and_gate' }` — because whose argument a
// court is in is a fact about that court and belongs beside its estates. A
// bookmark that declares nothing falls back to the Hasmonean pair, which is
// how the two chapters §190 shipped for keep working without an edit.
function quarrelFor(ctx, tag) {
  const table = ctx.bookmark && ctx.bookmark.schools;
  if (table && typeof table === 'object') {
    const named = table[tag];
    if (typeof named === 'string') return QUARRELS[named] || null;
    if (named === false) return null; // a court explicitly given no quarrel
    if (!Object.prototype.hasOwnProperty.call(table, tag)) return null;
  }
  return QUARRELS[DEFAULT_QUARREL] || null;
}

// The quarrel convenes where BOTH of its sides sit at the player's own court,
// under a human hand. In the 167 chapter that is 140 BCE onward and not before
// it (§127 hands the court over from the Hasideans and the Hellenizers on that
// year), which is also when Josephus first names the three schools — so the
// system arrives in the campaign on the year the sources produce it, without
// anything anywhere having to know that was the intention.
export function schoolsSeated(ctx) {
  try {
    const g = ctx.game;
    const tag = g.playerTag;
    const t = g.tags[tag];
    if (!t || !t.alive || t.ai) return null;
    const q = quarrelFor(ctx, tag);
    if (!q) return null;
    const defs = factionDefs(ctx, tag);
    if (!Array.isArray(defs) || !defs.length) return null;
    const hi = defs.find((d) => d && d.id === q.hi.seat);
    const lo = defs.find((d) => d && d.id === q.lo.seat);
    if (!hi || !lo) return null;
    return { quarrel: q, hi, lo, hiId: q.hi.seat, loId: q.lo.seat };
  } catch (e) { warnOnce('seated', 'schoolsSeated failed', e); return null; }
}

// A state's effects and its printed line, with the quarrel's overrides on top
// (1948 has no ascents to charge, so it re-points the breach and the schism at
// things that chapter actually has).
function courtEffects(q, key) {
  const over = q && q.stateEffects && q.stateEffects[key];
  return over || COURT_EFFECTS[key];
}
function courtTextOf(q, key) {
  const over = q && q.stateText && q.stateText[key];
  return over || COURT_TEXT[key];
}

// ─────────────────────────────────────────────────────────────── the state
function stateOf(ctx) {
  const g = ctx.game;
  if (!g.schools || typeof g.schools !== 'object') g.schools = {};
  const s = g.schools;
  if (!s.rulings || typeof s.rulings !== 'object') s.rulings = {};
  if (!s.breach || typeof s.breach !== 'object') s.breach = {};
  return s;
}

// Which side of each dispute the crown has come down on. Pure read: an absent
// `game.schools` is a crown that has ruled on nothing, which is what an old
// save is and what a new campaign is, and neither needs migrating.
export function rulingsGiven(ctx) {
  const out = {};
  try {
    const s = ctx.game && ctx.game.schools;
    const table = s && s.rulings;
    if (!table) return out;
    for (const id of RULING_BY_ID.keys()) {
      const side = table[id];
      if (side === 'hi' || side === 'lo') out[id] = side;
    }
  } catch (e) { warnOnce('given', 'rulingsGiven failed', e); }
  return out;
}

// The reading: the sum of what the crown has ruled, plus whatever the breach
// cards swung, clamped to the poles. Positive is the `hi` pole and negative
// the `lo`; a crown that has ruled on nothing reads zero — undecided, not
// balanced. Pure: computed from stored sides on every call, so no save is
// migrated and a mid-campaign load reads exactly what the campaign ruled.
export function readingScore(ctx) {
  try {
    const given = rulingsGiven(ctx);
    let sum = 0;
    for (const id of Object.keys(given)) {
      const r = RULING_BY_ID.get(id);
      if (!r) continue;
      sum += num(r[given[id]] && r[given[id]].push, 0);
    }
    const s = ctx.game && ctx.game.schools;
    if (s && Number.isFinite(s.pushed)) sum += s.pushed;
    return clamp(Math.round(sum), -SCHOOLS.max, SCHOOLS.max);
  } catch (e) { warnOnce('reading', 'readingScore failed', e); return 0; }
}

export function readingBand(score) {
  const s = num(score);
  if (s >= SCHOOLS.committedAt) return 'hi';
  if (s >= SCHOOLS.leaningAt) return 'toHi';
  if (s <= -SCHOOLS.committedAt) return 'lo';
  if (s <= -SCHOOLS.leaningAt) return 'toLo';
  return 'mid';
}

// The band's label is the quarrel's own pole name, because "the schools' Law"
// is the right sentence in 140 BCE and the wrong one in 1948. Only the middle
// is shared, and only because an unruled crown reads the same in every century.
function bandLabel(band, q) {
  if (band === 'mid' || !q) return 'Unruled';
  const pole = band === 'hi' || band === 'toHi' ? q.hi : q.lo;
  const name = (pole && pole.name) || '';
  return (band === 'hi' || band === 'lo') ? name : 'Leaning: ' + name;
}

// The one-line read the rest of the sim and the content can gate on:
// `leanOfLaw(ctx) >= 6` is a realm that has committed to its quarrel's `hi`.
export function leanOfLaw(ctx) {
  return schoolsSeated(ctx) ? readingScore(ctx) : 0;
}

// Both sides' standing, and what the two of them come to together.
function courtRead(ctx, seats) {
  const tag = ctx.game.playerTag;
  const q = seats.quarrel;
  const hi = num(factionApproval(ctx, tag, seats.hiId), 50);
  const lo = num(factionApproval(ctx, tag, seats.loId), 50);
  let key = '';
  if (hi >= SCHOOLS.concordAt && lo >= SCHOOLS.concordAt) key = 'concord';
  else if (hi <= SCHOOLS.schismAt && lo <= SCHOOLS.schismAt) key = 'schism';
  else if (hi <= SCHOOLS.brokenAt && lo >= SCHOOLS.backedAt) key = 'breachHi';
  else if (lo <= SCHOOLS.brokenAt && hi >= SCHOOLS.backedAt) key = 'breachLo';
  const words = key && q.states ? q.states[key] : null;
  return {
    hi, lo, key,
    def: key ? {
      name: (words && words.name) || key,
      blurb: (words && words.blurb) || '',
      text: courtTextOf(q, key),
      effects: courtEffects(q, key),
    } : null,
  };
}

// Scale the reading's authored effect block by how far out the realm actually
// is. Additive keys scale from zero, multipliers from their neutral 1 — the
// same rule §34 uses for a half-loyal estate, for the same reason.
function scaled(effects, scale) {
  const out = {};
  for (const [key, raw] of Object.entries(effects || {})) {
    if (!Number.isFinite(raw)) continue;
    out[key] = key.endsWith('Mult') ? 1 + (raw - 1) * scale : raw * scale;
  }
  return out;
}

function setMod(t, id, mod) {
  t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== id);
  if (mod) t.modifiers.push(mod);
}

// ────────────────────────────────────────────────────────────── the lever
// Two forms, because two things print the price. The chip beside a dispute's
// name is a `.np-fac-name` row and `text-overflow: ellipsis` will eat the name
// if the chip is long — "20 governance, 20 influence" truncated The Water at
// the Altar's Foot to "The Water at the Altar…" — so the chip uses the short
// form the institutions block already uses, and the tooltip spells it out.
function costText(cost, short) {
  if (!cost) return 'nothing';
  const parts = [];
  if (cost.gov) parts.push(cost.gov + (short ? ' gov' : ' governance'));
  if (cost.infl) parts.push(cost.infl + (short ? ' infl' : ' influence'));
  if (cost.mar) parts.push(cost.mar + (short ? ' mar' : ' martial'));
  if (cost.treasury) parts.push(cost.treasury + (short ? 't' : ' talents'));
  return parts.join(short ? ' · ' : ', ') || 'nothing';
}

function applyCost(ctx, cost) {
  const t = ctx.game.tags[ctx.game.playerTag];
  if (!t || !cost) return;
  if (Number.isFinite(cost.gov)) t.points.gov = clamp(num(t.points.gov) - cost.gov, 0, 999);
  if (Number.isFinite(cost.infl)) t.points.infl = clamp(num(t.points.infl) - cost.infl, 0, 999);
  if (Number.isFinite(cost.mar)) t.points.mar = clamp(num(t.points.mar) - cost.mar, 0, 999);
  if (Number.isFinite(cost.treasury)) t.treasury = num(t.treasury) - cost.treasury;
}

// Why this ruling cannot be given right now, or '' when it can — the ONE place
// the cooldown, the Temple gate and the four cost gates live, so the panel's
// disabled tooltip and the click path can never disagree (§34's rule).
function rulingBlocker(ctx, ruling) {
  const g = ctx.game;
  const t = g.tags[g.playerTag];
  const s = stateOf(ctx);
  if (s.rulings[ruling.id]) return 'The court has already ruled on this, and it does not rule twice.';
  if (ruling.needsTemple && !templeStands(ctx)) {
    return 'This is a dispute about a rite, and there is no House standing to perform it.';
  }
  const until = num(s.lastRulingAt, -Infinity) + SCHOOLS.rulingCdMonths;
  const now = monthIndex(g.date);
  if (now < until) {
    return 'The Law was reopened too recently (' + Math.ceil(until - now) + ' months before the court will sit on it again).';
  }
  const cost = ruling.cost || {};
  if (Number.isFinite(cost.gov) && num(t.points.gov) < cost.gov) return 'Not enough governance points (' + cost.gov + ' required).';
  if (Number.isFinite(cost.infl) && num(t.points.infl) < cost.infl) return 'Not enough influence points (' + cost.infl + ' required).';
  if (Number.isFinite(cost.mar) && num(t.points.mar) < cost.mar) return 'Not enough martial points (' + cost.mar + ' required).';
  if (Number.isFinite(cost.treasury) && num(t.treasury) < cost.treasury) return 'The treasury cannot spare ' + cost.treasury + ' talents.';
  return '';
}

// Give a ruling. Permanent: the modifier it grants carries no `months`, so
// tickModifiers never expires it, and the reading is recomputed from the
// stored side rather than accumulated — which means a save that loses the
// modifier still knows what this crown ruled.
export function issueRulingCore(ctx, rulingId, side) {
  try {
    const seats = schoolsSeated(ctx);
    if (!seats) return { ok: false, why: 'The two schools do not sit at our court.' };
    const ruling = RULING_BY_ID.get(String(rulingId));
    if (!ruling) return { ok: false, why: 'No such question is before the court.' };
    if (side !== 'hi' && side !== 'lo') return { ok: false, why: 'The court must come down on one side.' };
    const why = rulingBlocker(ctx, ruling);
    if (why) return { ok: false, why };

    const g = ctx.game;
    const t = g.tags[g.playerTag];
    const s = stateOf(ctx);
    applyCost(ctx, ruling.cost);
    s.rulings[ruling.id] = side;
    s.lastRulingAt = monthIndex(g.date);

    const chosen = ruling[side];
    setMod(t, 'ruling_' + ruling.id, {
      id: 'ruling_' + ruling.id,
      name: chosen.name,
      effects: { ...(chosen.effects || {}) },
    });
    // One reading wins and the other house pays for it, every time and by the
    // same amount. This is the line that makes the axis a choice rather than a
    // shopping list.
    const winner = side === 'hi' ? seats.hiId : seats.loId;
    const loser = side === 'hi' ? seats.loId : seats.hiId;
    shiftFaction(ctx, g.playerTag, winner, SCHOOLS.rulingSwing);
    shiftFaction(ctx, g.playerTag, loser, -SCHOOLS.rulingSwing);
    chronicle(ctx, 'faith', 'The court rules on ' + ruling.name + ': ' + chosen.blurb);
    return {
      ok: true,
      name: ruling.name,
      side,
      label: chosen.label,
      blurb: chosen.blurb,
      house: (side === 'hi' ? seats.hi.name : seats.lo.name) || winner,
      other: (side === 'hi' ? seats.lo.name : seats.hi.name) || loser,
      swing: SCHOOLS.rulingSwing,
      reading: readingScore(ctx),
    };
  } catch (e) {
    warnOnce('issue:' + rulingId, 'issueRulingCore failed', e);
    return { ok: false, why: 'The chamber is in confusion.' };
  }
}

// ─────────────────────────────────────────────────────────── the breach card
function dealBreachCard(ctx, which, seats) {
  const g = ctx.game;
  const spec = seats.quarrel.crises && seats.quarrel.crises[which];
  if (!ctx.dynEvents || !spec) return;
  const tag = g.playerTag;
  g.flags._dynEvN = num(g.flags._dynEvN, 0) + 1;
  const ev = {
    id: 'dyn_schools_' + g.flags._dynEvN,
    title: spec.title,
    desc: spec.text,
    forTag: tag,
    options: spec.options.map((opt) => ({
      label: opt.label,
      tooltip: opt.tooltip,
      effects: () => {
        try {
          const t = g.tags[tag];
          if (!t) return;
          applyCost(ctx, opt.cost);
          if (Number.isFinite(opt.treasury)) t.treasury = num(t.treasury) + opt.treasury;
          if (Number.isFinite(opt.legitimacy)) t.legitimacy = clamp(num(t.legitimacy, 50) + opt.legitimacy, 0, 100);
          if (Number.isFinite(opt.stability)) t.stability = clamp(num(t.stability) + opt.stability, -3, 3);
          if (Number.isFinite(opt.hi)) shiftFaction(ctx, tag, seats.hiId, opt.hi);
          if (Number.isFinite(opt.lo)) shiftFaction(ctx, tag, seats.loId, opt.lo);
          if (Number.isFinite(opt.push)) {
            // A card's swing is not a ruling — it has no dispute to store — so
            // it rides its own persisted term and the reading sums both.
            const s = stateOf(ctx);
            s.pushed = clamp(num(s.pushed) + opt.push, -SCHOOLS.max, SCHOOLS.max);
          }
          if (opt.flag) g.flags[opt.flag] = true;
          if (opt.chronicle) chronicle(ctx, 'faith', opt.chronicle);
        } catch (e) { warnOnce('breachopt:' + spec.id, 'breach option failed', e); }
      },
    })),
  };
  ctx.dynEvents.set(ev.id, ev);
  try { fireEvent(ctx, ev); } catch (e) { warnOnce('breachcard', 'breach card failed', e); }
}

// ────────────────────────────────────────────────────────────────── monthly
export function monthlySchools(ctx) {
  const g = ctx.game;
  const seats = schoolsSeated(ctx);
  const t = g.tags[g.playerTag];
  if (!t) return;
  if (!seats) {
    // The quarrel has not started, or the court has changed hands out from
    // under it (§127). Leave the rulings on the record — a crown that ruled
    // keeps having ruled — but stop charging for a court that is not sitting.
    for (const id of ['schools_reading', 'schools_court', 'schools_office']) setMod(t, id, null);
    return;
  }
  try {
    const s = stateOf(ctx);
    const now = monthIndex(g.date);

    // ---- what has been ruled, re-asserted --------------------------------
    // The stored side is the truth and the modifier is derived from it, so a
    // ruling cannot be lost by anything that touches the modifier list. These
    // carry no `months`: tickModifiers leaves an undated modifier alone, and a
    // ruling of the court is not a mood that wears off.
    for (const r of seats.quarrel.rulings) {
      const side = s.rulings[r.id];
      if (side !== 'hi' && side !== 'lo') continue;
      setMod(t, 'ruling_' + r.id, {
        id: 'ruling_' + r.id,
        name: r[side].name,
        effects: { ...(r[side].effects || {}) },
      });
    }

    // ---- the reading -----------------------------------------------------
    const score = readingScore(ctx);
    const mag = Math.abs(score) / SCHOOLS.max;
    const pole = score > 0 ? seats.quarrel.hi : seats.quarrel.lo;
    setMod(t, 'schools_reading', mag > 0 ? {
      id: 'schools_reading',
      name: pole.name,
      months: 2,
      effects: scaled(pole.effects, mag),
    } : null);

    // ---- and what having a reading does to the two houses -----------------
    // The ruling itself is a one-off swing; this is the part that makes a
    // committed crown's position get harder rather than settle. A house whose
    // Law is being administered warms every month it goes on being
    // administered, and the other one cools — against §34's own regression to
    // the middle, so it is a slow slide and not a cliff, and appeasement and
    // the demand cards can still fight it. This is the historical trap: the
    // longer Hyrcanus governed as a Sadducee the less the Pharisees would take
    // from him, and the fix was never available at the price he wanted.
    if (mag >= SCHOOLS.leaningAt / SCHOOLS.max) {
      const pull = SCHOOLS.readingPull * mag;
      shiftFaction(ctx, g.playerTag, score > 0 ? seats.hiId : seats.loId, pull);
      shiftFaction(ctx, g.playerTag, score > 0 ? seats.loId : seats.hiId, -pull);
    }

    // ---- what the two houses come to together ----------------------------
    const court = courtRead(ctx, seats);
    setMod(t, 'schools_court', court.def ? {
      id: 'schools_court',
      name: court.def.name,
      months: 2,
      effects: { ...(court.def.effects || {}) },
    } : null);

    // ---- the office, measured against the reading ------------------------
    // The High Priest is seated by §169 from one of the court's parties. When
    // that party is a school, the crown has a priest who either does or does
    // not perform the rites the crown has ruled for, and the country can tell.
    const hp = t.highPriest;
    const priestHouse = hp && (hp.faction === seats.hiId ? 1 : hp.faction === seats.loId ? -1 : 0);
    let office = null;
    if (priestHouse && Math.abs(score) >= SCHOOLS.leaningAt) {
      const aligned = (priestHouse > 0) === (score > 0);
      office = {
        id: 'schools_office',
        name: aligned ? 'A High Priest of the Crown\'s Own Reading' : 'A High Priest of the Other Reading',
        months: 2,
        effects: { legitimacyAdd: aligned ? SCHOOLS.officeAligned : SCHOOLS.officeAtOdds },
      };
    } else if (!hp && score <= -SCHOOLS.leaningAt && templeStands(ctx)) {
      // A custodial reading with nobody in the office is the one combination
      // that cannot work: the whole case for that side is that the altar
      // governs, and there is nobody at the altar to govern.
      //
      // The Temple test is not decoration. Without it, a 1948 cabinet that has
      // ruled for the Rabbinate would be charged legitimacy every month for
      // failing to appoint a High Priest — which is precisely the anachronism
      // §169's own gate exists to catch, arriving by a different door.
      office = {
        id: 'schools_office',
        name: (seats.quarrel.lo.name || 'That Reading') + ', and No Priest to Keep It',
        months: 2,
        effects: { legitimacyAdd: SCHOOLS.vacancyUnderLo },
      };
    }
    setMod(t, 'schools_office', office);

    // ---- the breach, and the card it eventually deals ---------------------
    for (const which of ['hi', 'lo']) {
      const broken = court.key === (which === 'hi' ? 'breachHi' : 'breachLo');
      s.breach[which] = broken ? num(s.breach[which]) + 1 : 0;
      if (!broken || s.breach[which] < SCHOOLS.breachMonthsToCrisis) continue;
      if (!s.crisisAt || typeof s.crisisAt !== 'object') s.crisisAt = {};
      const until = s.crisisAt[which];
      if (Number.isFinite(until) && now < until) continue;
      // Never two dynamic cards on the table at once — the estate demands use
      // the same guard, and two courts shouting at a player in one month is
      // how a system stops being read.
      const onTable = (g.pendingEvents || []).some((pe) => pe
        && (String(pe.eventId).startsWith('dyn_schools_') || String(pe.eventId).startsWith('dyn_faction_')));
      if (onTable) continue;
      s.crisisAt[which] = now + SCHOOLS.crisisCdMonths;
      s.breach[which] = 0;
      dealBreachCard(ctx, which, seats);
    }
  } catch (e) { warnOnce('tick', 'monthlySchools failed', e); }
}

// ─────────────────────────────────────────────────────────────────── panel
// Everything the Faith tab prints: the reading with the decisions that made
// it, both houses with the effect each is actually applying, what the two of
// them come to, the office's alignment, and every dispute still open with the
// price of ruling either way.
export function schoolsReport(ctx) {
  try {
    const seats = schoolsSeated(ctx);
    if (!seats) return null;
    const g = ctx.game;
    const t = g.tags[g.playerTag];
    const s = stateOf(ctx);
    const given = rulingsGiven(ctx);
    const score = readingScore(ctx);
    const band = readingBand(score);
    const mag = Math.abs(score) / SCHOOLS.max;
    const q = seats.quarrel;
    const pole = score > 0 ? q.hi : score < 0 ? q.lo : null;
    const court = courtRead(ctx, seats);
    const now = monthIndex(g.date);
    const cd = Math.max(0, Math.ceil(num(s.lastRulingAt, -Infinity) + SCHOOLS.rulingCdMonths - now));

    const marks = [];
    for (const r of q.rulings) {
      const side = given[r.id];
      if (side) marks.push({ text: r.name + ': ' + r[side].label + '.', d: num(r[side].push) });
    }
    if (Number.isFinite(s.pushed) && s.pushed) {
      marks.push({ text: 'What the court did when it was tested.', d: num(s.pushed) });
    }

    const house = (def, id, approvalv) => {
      const state = factionState(approvalv);
      const active = state === 'devoted' || state === 'loyal' ? def.boon
        : state === 'hostile' || state === 'discontent' ? def.bane : null;
      return {
        id,
        name: def.name || id,
        approval: Math.round(approvalv),
        state,
        effect: active ? ((active.name || '') + (active.text ? ' — ' + active.text : '')) : 'Nothing, at this approval.',
        kind: state === 'devoted' || state === 'loyal' ? 'boon'
          : state === 'hostile' || state === 'discontent' ? 'bane' : '',
      };
    };

    const hp = t.highPriest;
    let office = null;
    if (hp) {
      const fromHi = hp.faction === seats.hiId;
      const fromLo = hp.faction === seats.loId;
      if (fromHi || fromLo) {
        const aligned = Math.abs(score) < SCHOOLS.leaningAt ? null : (fromHi === (score > 0));
        office = {
          name: hp.name,
          house: (fromHi ? seats.hi.name : seats.lo.name) || hp.faction,
          aligned,
          text: aligned === null
            ? 'The crown has ruled on nothing, so the office contradicts nothing.'
            : aligned
              ? 'The priest keeps the Law the crown has ruled for: +' + SCHOOLS.officeAligned + ' legitimacy a month.'
              : 'The priest performs rites the crown has ruled against: ' + SCHOOLS.officeAtOdds + ' legitimacy a month.',
        };
      }
    } else if (score <= -SCHOOLS.leaningAt && templeStands(ctx)) {
      office = {
        name: '', house: '', aligned: false,
        text: (q.lo.name || 'That reading') + ' with an empty office: ' + SCHOOLS.vacancyUnderLo
          + ' legitimacy a month on top of the ordinary vacancy.',
      };
    }

    return {
      title: q.title || 'The Law and Its Readers',
      quarrel: q.id,
      reading: {
        score,
        band,
        max: SCHOOLS.max,
        label: bandLabel(band, q),
        hiPole: seats.hi.name || q.hi.name,
        loPole: seats.lo.name || q.lo.name,
        name: pole ? pole.name : '',
        text: pole ? pole.text + (mag < 1 ? ' — at ' + Math.round(mag * 100) + '% while the reading stands here' : '') : '',
        blurb: pole ? pole.blurb : (q.mid || 'The court has ruled on nothing yet.'),
        marks,
      },
      houses: [
        house(seats.hi, seats.hiId, court.hi),
        house(seats.lo, seats.loId, court.lo),
      ],
      court: court.def ? {
        key: court.key,
        name: court.def.name,
        text: court.def.text,
        blurb: court.def.blurb,
        good: court.key === 'concord',
      } : {
        // The fifth state is the absence of the other four, so it is named
        // from the quarrel's own two sides rather than from a fixed phrase —
        // "the houses coexist" is the right sentence in 140 BCE and a very
        // strange one about an Israeli cabinet (SPEC §201).
        key: '', name: 'Neither Side Owns the Chamber', good: false,
        text: seats.hi.name + ' and ' + seats.lo.name + ' are both still in the room.',
        blurb: 'Nothing extra either way — which is itself an achievement once the rulings start.',
      },
      office,
      cooldown: cd,
      rulings: q.rulings.map((r) => {
        const side = given[r.id];
        const whyNot = rulingBlocker(ctx, r);
        const price = costText(r.cost, true);
        const fullPrice = costText(r.cost);
        const opt = (k) => ({
          label: r[k].label,
          name: r[k].name,
          text: r[k].text,
          blurb: r[k].blurb,
          push: num(r[k].push),
        });
        return {
          id: r.id,
          name: r.name,
          question: r.question,
          source: r.source || '',
          given: side || '',
          price,
          fullPrice,
          can: !side && !whyNot,
          whyNot: side ? '' : whyNot,
          hi: opt('hi'),
          lo: opt('lo'),
          swing: SCHOOLS.rulingSwing,
        };
      }),
    };
  } catch (e) { warnOnce('report', 'schoolsReport failed', e); return null; }
}
