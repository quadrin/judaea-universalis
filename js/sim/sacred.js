// Judaea Universalis — the hope and the office (SPEC §169). DOM-free.
//
// Three things this game kept as prose and never as arithmetic, all of them
// about the same institution, all of them cheap once the political engines of
// §163–§167 exist to hang them on.
//
// 1. THE EXPECTATION. Bar Kokhba was hailed "son of a star" by Akiva; Rabbi
//    Yohanan ben Torta told him grass would grow on his cheeks first. The game
//    had both as event cards and no way to be a state carrying a messianic
//    expectation — which is a specific and terrible condition, not a flavour
//    text. A movement that has declared its king wins battles it should lose
//    and cannot survive a defeat, because the claim is falsifiable and everyone
//    is watching. So: a 0–100 gauge that pays real manpower and morale at the
//    top and takes legitimacy and stability out of you on every setback, and
//    which decays if nothing is delivered. It is the only system in this game
//    where success is dangerous.
//
// 2. THE OFFICE. The High Priesthood was the thing the whole period fought
//    over: Jason bought it, Menelaus outbid him, Jonathan took it from a
//    Seleucid civil war, Herod appointed and deposed at will, and by the first
//    century it was, in the Talmud's own account, an auction. The game had it
//    as a statecraft card. Now it is an OFFICE with an occupant, seated from
//    one of the court's parties, vacant when its holder dies, and worth a real
//    fight — because whoever holds it lends their party weight and pays the
//    crown legitimacy for as long as the two of them agree.
//
// 3. THE PILGRIMAGE. A temple that draws three festivals a year from every
//    community in the world is an ECONOMY, and the half-shekel is a tax that
//    arrives from places the tax collector cannot reach. It pays while the
//    roads are open and the realm is at peace, it pays more while the
//    expectation is high, and it stops the month a war closes the ascents —
//    which is exactly the pressure that makes a pious realm think twice about
//    a campaign.
//
// All three are the PLAYER's, on the same rule as §34's estates: an AI realm
// has no expectation gauge and no priesthood, because an unseen system that
// silently reshapes a foreign court is §163's business and this is not that.

import { num, clamp, chronicle, resolveTagMult } from './military.js';
import { factionApproval, shiftFaction, factionDefs } from './factions.js';

const _warned = new Set();
function warnOnce(key, ...args) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[sim/sacred]', ...args);
}

export const SACRED = {
  // ---- the expectation ----
  stirringAt: 25,
  expectantAt: 50,
  feveredAt: 75,
  // What it pays at the top, and what a setback costs at the top. The asymmetry
  // is the point: a fevered movement fields men it does not have and loses its
  // legitimacy the first time it is beaten.
  manpowerAtFever: 0.25,
  moraleAtFever: 0.12,
  unrestAtFever: 1.6,
  setbackLegitimacy: 14,
  setbackStability: 1,
  // …and it cools if nothing arrives. Deliverance keeps it up; a decade of
  // waiting does not.
  decayPerMonth: 0.35,
  // ---- the office ----
  officeLegitimacy: 0.35, // a month, while the office is filled and agreeable
  vacancyLegitimacy: -0.5, // …and while it is empty
  officeInfluence: 0.15, // what the seated party gains in weight
  // ---- the pilgrimage ----
  pilgrimPerHolyDev: 0.8,
  pilgrimFeverBonus: 0.5,
  pilgrimWarMult: 0.25,
};

function jewish(ctx, tag) {
  const t = ctx.game.tags[tag];
  return !!(t && (t.religion === 'judaism' || t.religion === 'samaritanism'));
}

// Is there a Temple to argue about? This gate is the difference between a
// system and an anachronism, and the first run of this file failed it: 1948
// Israel was cheerfully offered a High Priest, from the Coalition.
//
// The office exists where it historically existed. A Samaritan realm has one
// unconditionally — the Samaritan High Priesthood is a continuous line and is
// the SAM standard's whole constitution (§136). A Jewish realm has one while
// the House stands: before the burning in 70, or after a chapter's own chain
// has raised the altar again (`altarRaised` in 132, `altarRestored` in 614).
// A modern state has none, and no year test would have said so on its own —
// the flag does.
export function templeStands(ctx) {
  const g = ctx.game;
  const tag = g.playerTag;
  const t = g.tags[tag];
  if (!t) return false;
  if (t.religion === 'samaritanism') return true;
  if (t.religion !== 'judaism') return false;
  const f = g.flags || {};
  if (f.altarRaised || f.altarRestored || f.templeRededicated) return true;
  if (f.templeBurned) return false;
  return num(g.date.y) < 70;
}

// The office and the gauge belong to the player's own realm, on the same rule
// as §34's estates — and only where the chapter has a Temple.
function sacredSeats(ctx) {
  const g = ctx.game;
  const tag = g.playerTag;
  const t = g.tags[tag];
  if (!t || !t.alive || t.ai) return null;
  if (!jewish(ctx, tag)) return null;
  if (!templeStands(ctx)) return null;
  const defs = factionDefs(ctx, tag);
  return Array.isArray(defs) && defs.length ? defs : null;
}

// ───────────────────────────────────────────────────────── the expectation
export function expectation(ctx) {
  const t = ctx.game.tags[ctx.game.playerTag];
  return t ? clamp(num(t.messianic), 0, 100) : 0;
}

export function expectationBand(v) {
  return v >= SACRED.feveredAt ? 'fevered'
    : v >= SACRED.expectantAt ? 'expectant'
      : v >= SACRED.stirringAt ? 'stirring' : 'quiet';
}

// Content moves it: a claimed mantle, a relit altar, a prophet in the desert.
// Fails soft for an AI hand and a chapter with no Temple in it, exactly like
// `shiftFaction`.
export function raiseExpectation(ctx, delta, why) {
  try {
    if (!sacredSeats(ctx)) return false;
    const t = ctx.game.tags[ctx.game.playerTag];
    const was = clamp(num(t.messianic), 0, 100);
    t.messianic = clamp(was + num(delta, 0), 0, 100);
    const band = expectationBand(t.messianic);
    if (band !== expectationBand(was) && why) {
      chronicle(ctx, 'faith', 'The expectation is ' + band + ': ' + why);
    }
    return true;
  } catch (e) { warnOnce('raise', 'raiseExpectation failed', e); return false; }
}

// A setback, when the whole country is watching for a deliverer. This is the
// only place in the engine where losing hurts MORE because things were going
// well, and it is the reason the gauge is worth carrying rather than simply
// worth maxing.
export function messianicSetback(ctx, what) {
  try {
    if (!sacredSeats(ctx)) return false;
    const t = ctx.game.tags[ctx.game.playerTag];
    const v = clamp(num(t.messianic), 0, 100);
    if (v < SACRED.stirringAt) return false;
    const scale = v / 100;
    t.legitimacy = clamp(num(t.legitimacy, 50) - SACRED.setbackLegitimacy * scale, 0, 100);
    t.stability = clamp(num(t.stability) - (v >= SACRED.feveredAt ? SACRED.setbackStability : 0), -3, 3);
    t.messianic = clamp(v - 18 * scale, 0, 100);
    chronicle(ctx, 'faith',
      'The hope is answered with ' + (what || 'a defeat') + ', and the country counts the cost. '
      + '(−' + Math.round(SACRED.setbackLegitimacy * scale) + ' legitimacy)');
    try {
      if (ctx.bus) {
        ctx.bus.emit('notify', {
          title: 'Grass on Akiva\'s cheeks',
          text: 'A movement that has named its deliverer cannot afford ' + (what || 'a defeat') + '. The expectation collapses.',
          type: 'bad',
        });
      }
    } catch (e) { warnOnce('setbacknotify', 'setback notice failed', e); }
    return true;
  } catch (e) { warnOnce('setback', 'messianicSetback failed', e); return false; }
}

// ───────────────────────────────────────────────────────────── the office
export function highPriest(ctx) {
  const t = ctx.game.tags[ctx.game.playerTag];
  return t && t.highPriest ? t.highPriest : null;
}

// Who could be seated: every party at court that could actually hold an altar,
// with the price of seating them — the party gains, the others lose, because
// there is one office.
//
// `priestly: false` is content's veto (SPEC §190). The first cut of this panel
// offered the office to every seat at court, which put the Brothers' Captains
// and the House of Antipater on the list of candidates for the High
// Priesthood — one a company of hill commanders, the other an Idumean family
// no reading of the Law would let past the altar rail. A faction says so about
// itself; everything unmarked stays a candidate, which is why the zealots of
// 66 keep theirs (they seated Phanni ben Samuel by lot, and that is the point
// of them).
function priestEligible(d) { return !!(d && d.id && d.priestly !== false); }

export function priesthoodInfo(ctx) {
  try {
    const seats = sacredSeats(ctx);
    if (!seats) return null;
    const g = ctx.game;
    const t = g.tags[g.playerTag];
    const held = t.highPriest || null;
    return {
      seated: held ? { name: held.name, faction: held.faction, since: held.since } : null,
      vacant: !held,
      candidates: seats.filter(priestEligible).map((d) => ({
        id: d.id,
        name: d.name || d.id,
        approval: factionApproval(ctx, g.playerTag, d.id),
        isSeated: !!(held && held.faction === d.id),
      })),
    };
  } catch (e) { warnOnce('priestinfo', 'priesthoodInfo failed', e); return null; }
}

const PRIEST_NAMES = [
  'Yehohanan', 'Shimon', 'Eleazar', 'Yehoshua', 'Yehoyariv', 'Hananiah',
  'Mattityahu', 'Yehudah', 'Yonatan', 'Pinchas', 'Yishmael', 'Tzadok',
];

export function seatHighPriest(ctx, factionId) {
  try {
    const seats = sacredSeats(ctx);
    if (!seats) return { ok: false, why: 'There is no Temple to appoint to.' };
    const def = seats.find((d) => d && d.id === factionId);
    if (!def) return { ok: false, why: 'No such party sits at our court.' };
    if (!priestEligible(def)) return { ok: false, why: 'No man of theirs may stand at that altar.' };
    const g = ctx.game;
    const t = g.tags[g.playerTag];
    const name = ctx.rng.pick(PRIEST_NAMES);
    t.highPriest = { name, faction: factionId, since: g.date.y };
    // One office, and everybody knows who did not get it.
    for (const d of seats) {
      if (!d || !d.id) continue;
      shiftFaction(ctx, g.playerTag, d.id, d.id === factionId ? 10 : -5);
    }
    chronicle(ctx, 'faith', name + ' is anointed High Priest, from ' + (def.name || factionId) + '.');
    return { ok: true, name, faction: factionId, factionName: def.name || factionId };
  } catch (e) { warnOnce('seat', 'seatHighPriest failed', e); return { ok: false, why: 'The chamber is in confusion.' }; }
}

// The office falls vacant — a death, a deposition, a Roman prefect's decision.
export function vacateHighPriesthood(ctx, why) {
  try {
    const g = ctx.game;
    const t = g.tags[g.playerTag];
    if (!t || !t.highPriest) return false;
    const was = t.highPriest.name;
    t.highPriest = null;
    chronicle(ctx, 'faith', 'The High Priesthood is vacant: ' + was + ' ' + (why || 'is dead') + '.');
    return true;
  } catch (e) { warnOnce('vacate', 'vacateHighPriesthood failed', e); return false; }
}

// ─────────────────────────────────────────────────────────── the pilgrimage
//
// What the ascents are worth this month. Read by the economy through
// `pilgrimageIncome`, and shown in the treasury tooltip so the player can see
// the war they are about to start costing them the festivals.
export function pilgrimageIncome(ctx, tag) {
  try {
    const g = ctx.game;
    const t = g.tags[tag];
    if (!t || !t.alive) return 0;
    let holy = 0;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable || p.owner !== tag) continue;
      if (!p.holy && !p.wonder) continue;
      if (p.controller && p.controller !== tag) continue; // an occupied shrine draws nobody
      const dev = p.dev ? num(p.dev.tax) + num(p.dev.prod) : 0;
      holy += (p.holy ? 1 : 0.5) * (2 + dev * 0.2);
    }
    if (holy <= 0) return 0;
    // `pilgrimMult` is the ordinary modifier stream's handle on the festivals
    // (SPEC §190): the water-drawing ruling, the ashes of the heifer, and a
    // breach with the priestly houses all reach the ascents through it, so the
    // player sees a doctrinal quarrel land on a number they watch every month.
    let v = holy * SACRED.pilgrimPerHolyDev * resolveTagMult(ctx, tag, 'pilgrimMult');
    // The whole world comes when the whole world is expecting something.
    if (tag === g.playerTag) {
      const e = expectation(ctx) / 100;
      v *= 1 + e * SACRED.pilgrimFeverBonus;
    }
    // …and nobody travels through a war.
    const atWar = (t.atWarWith || []).some((k) => g.tags[k] && g.tags[k].alive);
    if (atWar) v *= SACRED.pilgrimWarMult;
    return Math.max(0, v);
  } catch (e) { warnOnce('pilgrim', 'pilgrimageIncome failed', e); return 0; }
}

// ─────────────────────────────────────────────────────────────── the panel
export function sacredReport(ctx) {
  try {
    if (!sacredSeats(ctx)) return null;
    const g = ctx.game;
    const v = expectation(ctx);
    const band = expectationBand(v);
    const scale = v / 100;
    const pil = pilgrimageIncome(ctx, g.playerTag);
    const atWar = (g.tags[g.playerTag].atWarWith || []).some((k) => g.tags[k] && g.tags[k].alive);
    return {
      expectation: Math.round(v),
      band,
      boon: band === 'quiet' ? '' :
        '+' + Math.round(SACRED.manpowerAtFever * scale * 100) + '% manpower, +'
        + Math.round(SACRED.moraleAtFever * scale * 100) + '% morale',
      bane: band === 'quiet' ? '' :
        '+' + (SACRED.unrestAtFever * scale).toFixed(1) + ' unrest, and a defeat costs '
        + Math.round(SACRED.setbackLegitimacy * scale) + ' legitimacy'
        + (band === 'fevered' ? ' and a point of stability' : ''),
      priesthood: priesthoodInfo(ctx),
      pilgrimage: Math.round(pil * 10) / 10,
      pilgrimageBlocked: atWar && pil > 0,
    };
  } catch (e) { warnOnce('report', 'sacredReport failed', e); return null; }
}

// ────────────────────────────────────────────────────────────────── monthly
export function monthlySacred(ctx) {
  const g = ctx.game;
  const seats = sacredSeats(ctx);
  if (!seats) return;
  const tag = g.playerTag;
  const t = g.tags[tag];
  try {
    // The hope cools if nothing arrives. Holding the holy city slows it;
    // holding nothing does not.
    let holds = false;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (p && p.owner === tag && p.controller === tag && (p.holy || p.wonder)) { holds = true; break; }
    }
    const v = clamp(num(t.messianic), 0, 100);
    if (v > 0) t.messianic = clamp(v - SACRED.decayPerMonth * (holds ? 0.5 : 1), 0, 100);

    // The effects ride the ordinary modifier stream, refreshed monthly and
    // self-expiring, exactly like an estate's boon (§34).
    const s = clamp(num(t.messianic), 0, 100) / 100;
    t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== 'messianic');
    if (s > SACRED.stirringAt / 100) {
      t.modifiers.push({
        id: 'messianic',
        name: 'The Expectation (' + expectationBand(s * 100) + ')',
        months: 2,
        effects: {
          manpowerMult: 1 + SACRED.manpowerAtFever * s,
          moraleMult: 1 + SACRED.moraleAtFever * s,
          unrestAll: SACRED.unrestAtFever * s,
        },
      });
    }

    // The office. A filled and agreeable priesthood pays legitimacy monthly; an
    // empty one costs it; a priesthood whose own party has turned on the crown
    // pays nothing, because the two of them are no longer the same government.
    t.modifiers = (t.modifiers || []).filter((m) => m && m.id !== 'high_priesthood');
    const hp = t.highPriest;
    if (hp && seats.some((d) => d && d.id === hp.faction)) {
      const app = factionApproval(ctx, tag, hp.faction);
      const agreeable = Number.isFinite(app) && app > 40;
      t.modifiers.push({
        id: 'high_priesthood',
        name: agreeable ? 'The High Priesthood' : 'A High Priest at Odds With the Crown',
        months: 2,
        effects: { legitimacyAdd: agreeable ? SACRED.officeLegitimacy : -SACRED.officeLegitimacy },
      });
    } else if (hp) {
      // The party that held it has left the room (§127): the office lapses.
      vacateHighPriesthood(ctx, 'belonged to a party that no longer sits');
    } else {
      t.modifiers.push({
        id: 'high_priesthood',
        name: 'The High Priesthood Stands Empty',
        months: 2,
        effects: { legitimacyAdd: SACRED.vacancyLegitimacy },
      });
    }
  } catch (e) { warnOnce('tick', 'monthlySacred failed', e); }
}
