// js/sim/seasons.js — the month of the year, and what it does (SPEC §272).
// DOM-free, and deliberately free of sim imports: military.js, navy.js and
// weather.js all consult it, so it may import none of them.
//
// §170 gave the campaign a CLIMATE — a slow wander between wet decades and
// dry ones that bends the odds on two harvest cards. That is a fact about the
// decade. This is the fact about the MONTH, and it is the older one: every
// army in this theatre, from Thutmose to Allenby, fought a calendar before it
// fought an enemy.
//
// "And it came to pass, at the turn of the year, at the time when kings go out
// to battle" (2 Sam 11:1) is not a figure of speech. It is a logistics
// statement. The Levantine year has two halves and they are not alike:
//
//   THE RAINS (Marheshvan–Adar; here November–February). The yoreh comes in
//   October or November and the malkosh in March, and between them the
//   country is mud. The wadis run, the fords go, the coast road floods at
//   Caesarea, and the unpaved interior will not carry a wagon. Rome's own sea
//   closed — mare clausum, roughly 11 November to 10 March in Vegetius —
//   because the Mediterranean in winter sinks grain fleets. An army kept in
//   the field through it does not fight; it dissolves. Sieges stall with it:
//   a camp in the mud digs nothing, and the besieged have all the water in
//   the world falling on them.
//
//   THE DRY (Nisan–Tishri; here March–October). Not one season but three.
//   SPRING is the campaign season proper — the ground is firm, the wadis
//   still have water, and the barley is standing for the taking. HEAT is
//   Tammuz through Elul, when the desert is a weapon that belongs to whoever
//   is not crossing it, and when a besieged town's cisterns run dry: Masada,
//   Jerusalem in 70, Jotapata — the sieges of this country are decided by
//   water, and in August the besieger has it and the besieged does not.
//   HARVEST is Tishri: the threshing floors are full, so a column feeds
//   itself off the country it is standing in, and then the rains come.
//
// WHAT THIS IS FOR. Before it, a campaign could be prosecuted in February
// exactly as in April, which made war a pure function of army size and made
// twelve of twelve months interchangeable. The point is not to punish the
// player; it is that the year now has a SHAPE — an opening, a window, a
// decision about whether the siege can be closed before the rains, and a
// winter to spend paying for it. That is the difference between a war and a
// subtraction.
//
// EVERY NUMBER HERE IS LEGIBLE. The realm panel names the season and says
// what it is doing, because a cost the player cannot see is not difficulty,
// it is noise.
//
// MODERNITY. Trucks, metalled roads, steamships and radio did not abolish
// the Levantine winter — the 1948 convoys bogged in it like everyone else's —
// but they blunted it, and a motor ship sails in January. So every figure
// below is scaled by `modernity`, from full bite in antiquity to about a
// third by 1948, and the closed sea is antiquity's alone.

// Which months belong to which season. m is 1..12 as the sim's date carries
// it. The boundaries are the rains' own: the early rain in Marheshvan
// (Oct/Nov) and the latter rain in Adar (Feb/Mar).
const MONTH_SEASON = [
  'rains',   // 1  January — the deep of the wet season
  'rains',   // 2  February
  'spring',  // 3  March — the latter rain, then the ground firms
  'spring',  // 4  April — the time when kings go out
  'spring',  // 5  May
  'heat',    // 6  June
  'heat',    // 7  July — Tammuz
  'heat',    // 8  August — Av; the cisterns
  'heat',    // 9  September — Elul, still no rain
  'harvest', // 10 October — Tishri; the threshing floors, the first clouds
  'rains',   // 11 November — the early rain; the sea closes
  'rains',   // 12 December
];

// Terrain that turns to mud, and terrain that does not. A limestone ridge in
// the rain is unpleasant; the Sharon in the rain is impassable, and the
// Huleh marsh in the rain is a lake. Desert is the one ground the rains
// IMPROVE — the winter is when the Negev and the Arabah can be crossed at
// all, which is why the incense road ran in the months the sea did not.
const MUD = { farmland: 1, marsh: 1.4, coast: 0.8, drylands: 0.5, hills: 0.5, steppe: 0.7 };
const ARID = { desert: 1, drylands: 0.6, steppe: 0.4, wasteland: 1 };

export const SEASONS = {
  rains: {
    key: 'rains',
    name: 'The rains',
    // What a player needs to know before ordering a march in Kislev.
    blurb: 'The wadis run and the roads are mud. A host kept in the field bleeds, '
      + 'a siege camp digs nothing, and the sea is shut.',
    fieldAttrition: 2.0,   // added, for a host in the open on ground its side does not hold
    aridAttrition: -1.5,   // …and the desert is the one place this is a mercy
    mudMove: 0.45,         // × terrain's own mud share, added to the hop multiplier
    siege: 0.7,            // the camp's progress
    seaClosed: true,       // mare clausum — antiquity only
    forage: 0,
  },
  spring: {
    key: 'spring',
    name: 'The campaign season',
    blurb: 'Firm ground, full wadis and standing barley. This is the season armies were built for.',
    fieldAttrition: 0,
    aridAttrition: 0,
    mudMove: 0,
    siege: 1,
    seaClosed: false,
    forage: 0,
  },
  heat: {
    key: 'heat',
    name: 'The heat',
    blurb: 'Nothing has fallen since Adar. The desert kills whoever is crossing it — '
      + 'and inside a besieged town the cisterns are going down.',
    fieldAttrition: 0,
    aridAttrition: 2.5,
    mudMove: 0,
    siege: 1.2,            // water, not walls, decides a siege in Av
    seaClosed: false,
    forage: 0,
  },
  harvest: {
    key: 'harvest',
    name: 'The harvest',
    blurb: 'The threshing floors are full and a column can feed itself off the country it stands in. '
      + 'The first clouds are already over the sea.',
    fieldAttrition: -1.0,  // forage is free where there is grain
    aridAttrition: 1.0,
    mudMove: 0,
    siege: 1,
    seaClosed: false,
    forage: 1,
  },
};

export function seasonKeyOf(date) {
  const m = date && Number.isFinite(date.m) ? date.m : 4;
  return MONTH_SEASON[Math.min(11, Math.max(0, (m | 0) - 1))] || 'spring';
}

export function seasonOf(ctx) {
  try {
    return SEASONS[seasonKeyOf(ctx && ctx.game && ctx.game.date)] || SEASONS.spring;
  } catch (e) { return SEASONS.spring; }
}

// How far into the machine age this campaign is: 0 for every antique chapter,
// 1 from 1900. The nineteenth century interpolates, so a future chapter seated
// in it inherits a sensible half-measure rather than a cliff. Read from the
// date rather than from tech, because what blunts a winter is the road and the
// engine, and both are facts about the century rather than about a realm's
// investment.
export function modernity(ctx) {
  const y = (ctx && ctx.game && ctx.game.date && ctx.game.date.y) || 0;
  if (y < 1800) return 0;
  if (y >= 1900) return 1;
  return (y - 1800) / 100;
}

// Everything the season does is scaled through here: full in antiquity,
// `modernFloor` of itself by 1948. Not zero — the Jerusalem convoys of the
// winter of 1948 bogged in exactly the mud Vespasian's did.
const MODERN_FLOOR = 0.35;
function scale(ctx, v) {
  if (!v) return 0;
  return v * (1 - modernity(ctx) * (1 - MODERN_FLOOR));
}

function terrainOf(ctx, prov) {
  return (prov && typeof prov.terrain === 'string') ? prov.terrain : 'farmland';
}

// ───────────────────────────────────────────────────────── what it costs
//
// Attrition added to a host standing in `prov`. `exposed` is the caller's own
// judgement — military.js passes true for a column in the open on ground its
// side does not hold, which is the same scope air interdiction uses and for
// the same reason: a garrison at home in its own country is not a column in
// the rain, and taxing it would be a permanent tax on peacetime.
export function seasonAttrition(ctx, prov, exposed) {
  try {
    const s = seasonOf(ctx);
    const t = terrainOf(ctx, prov);
    let v = 0;
    if (exposed) v += s.fieldAttrition;
    const arid = ARID[t] || 0;
    if (arid) v += s.aridAttrition * arid;
    // The rains' misery is the open field's; the harvest's mercy is the
    // farmland's. Both are already in `fieldAttrition`, so the only terrain
    // correction left is the wet ground that is worse than open field.
    if (s.key === 'rains' && exposed && t === 'marsh') v += 1;
    return scale(ctx, v);
  } catch (e) { return 0; }
}

// The multiplier on a land hop's days. 1 in every season but the rains, and
// in the rains it depends on what the ground is made of.
export function seasonMoveFactor(ctx, prov) {
  try {
    const s = seasonOf(ctx);
    if (!s.mudMove) return 1;
    const mud = MUD[terrainOf(ctx, prov)];
    if (!mud) return 1;
    return 1 + scale(ctx, s.mudMove * mud);
  } catch (e) { return 1; }
}

// The multiplier on a siege camp's daily progress.
export function seasonSiegeFactor(ctx) {
  try {
    const s = seasonOf(ctx);
    if (s.siege === 1) return 1;
    return 1 + scale(ctx, s.siege - 1);
  } catch (e) { return 1; }
}

// Mare clausum. Antiquity's winter sea is not slow, it is SHUT: the grain
// fleets did not sail and neither does anything here. Returns the multiplier
// on a sea hop's days — 1 when the sea is open, large when it is not — and
// `seaShut` answers the harder question for the callers that would rather
// hold a voyage than crawl it.
//
// Modernity opens it: by 1900 a hull with an engine sails in January, so the
// factor decays to 1 exactly as every other figure here decays toward its
// floor. The one difference is that this one reaches 1 and stops mattering,
// because a steamship really is a different thing and not a hardier galley.
const SEA_WINTER_FACTOR = 2.6;
export function seasonSeaFactor(ctx) {
  try {
    const s = seasonOf(ctx);
    if (!s.seaClosed) return 1;
    const m = modernity(ctx);
    if (m >= 1) return 1;
    return 1 + (SEA_WINTER_FACTOR - 1) * (1 - m);
  } catch (e) { return 1; }
}
export function seaShut(ctx) {
  try { return !!seasonOf(ctx).seaClosed && modernity(ctx) < 0.5; } catch (e) { return false; }
}

// ───────────────────────────────────────────────────────────── the panel
//
// What the realm panel prints. Every line is a cost the player can act on:
// which season it is, what it is doing right now, and when it turns. A
// difficulty the player cannot read is not difficulty.
export function seasonReport(ctx) {
  try {
    const g = ctx && ctx.game;
    if (!g || !g.date) return null;
    const s = seasonOf(ctx);
    const m = g.date.m | 0;
    // How many months until the key changes.
    let turns = 1;
    while (turns < 12 && MONTH_SEASON[((m - 1 + turns) % 12)] === s.key) turns++;
    const next = SEASONS[MONTH_SEASON[((m - 1 + turns) % 12)]] || SEASONS.spring;
    const bite = 1 - modernity(ctx) * (1 - MODERN_FLOOR);
    const lines = [];
    if (s.fieldAttrition > 0) lines.push('A host in the open on foreign ground loses '
      + (s.fieldAttrition * bite).toFixed(1) + '% more a month.');
    if (s.fieldAttrition < 0) lines.push('A column can forage: '
      + (-s.fieldAttrition * bite).toFixed(1) + '% less attrition on grain country.');
    if (s.aridAttrition > 0) lines.push('The desert takes '
      + (s.aridAttrition * bite).toFixed(1) + '% more a month from whoever is in it.');
    if (s.aridAttrition < 0) lines.push('The desert is crossable: '
      + (-s.aridAttrition * bite).toFixed(1) + '% less attrition on dry ground.');
    if (s.mudMove) lines.push('Marches through farmland, marsh and the coast road take up to '
      + Math.round(s.mudMove * bite * 140) + '% longer.');
    if (s.siege !== 1) {
      lines.push(s.siege > 1
        ? 'Siege camps press ' + Math.round((s.siege - 1) * bite * 100) + '% faster — the cisterns are going down.'
        : 'Siege camps dig ' + Math.round((1 - s.siege) * bite * 100) + '% slower.');
    }
    if (seaShut(ctx)) lines.push('The sea is shut: voyages take more than twice as long.');
    return {
      key: s.key,
      name: s.name,
      blurb: s.blurb,
      months: turns,
      nextName: next.name,
      effects: lines,
      modern: modernity(ctx) > 0,
    };
  } catch (e) { return null; }
}
