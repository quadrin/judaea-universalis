// js/data/tech.js — technology ladders (SPEC §22). DOM-free data + pure helpers.
// Three ladders bought level by level with the matching monarch point, like the
// reform trees but era-long: government (income & order), influence (trade,
// legitimacy, the sea), military (the strength of armies and the pattern of
// their equipment). Effects merge into tag.ideas via applyReformsToTag —
// resolveTagMult / resolveTagAdd consume them like every other modifier.
//
// The AGE moves: a bookmark sets `techBase` (its era's level) and the baseline
// creeps up +1 per 25 game years. Buying past the age costs +50% per level of
// ambition — keeping pace is cheap, racing history is dear (EU4's ahead-of-time
// penalty).

export const TECH_MAX = 24;

export const TECH_CATEGORIES = {
  gov: {
    name: 'Government', point: 'gov',
    desc: 'Census, coin and courts: +3% income and −0.03 unrest per level.',
  },
  infl: {
    name: 'Influence', point: 'infl',
    desc: 'Letters, markets and hulls: +5% trade and +4% fleet strength per level, a little legitimacy.',
  },
  mar: {
    name: 'Military', point: 'mar',
    desc: 'Drill, steel and doctrine: +4% army strength and +2% manpower per level; new levels unlock new patterns of soldier.',
  },
};

// Cost in monarch points to BUY `level` (the level you end up at, 1-based).
export function techCost(level) {
  return 250 + 15 * Math.max(1, level | 0);
}

// The age's expected level: the bookmark's base, +1 per 25 years of play.
export function eraBaseline(techBase, monthsElapsed) {
  return Math.max(0, techBase | 0) + Math.floor(Math.max(0, monthsElapsed | 0) / 300);
}

// Ahead-of-the-age cost multiplier for buying `level` when the age expects
// eraBase (+1 grace level is free of penalty).
export function aheadMult(level, eraBase) {
  const ahead = Math.max(0, (level | 0) - (eraBase | 0) - 1);
  return 1 + 0.5 * ahead;
}

// One effects map for a tag's tech levels. Keys ending in 'Mult' multiply,
// everything else adds — same contract as the reform trees.
export function computeTechEffects(tech) {
  const L = (k) => Math.max(0, (tech && tech[k]) | 0);
  const g = L('gov'), i = L('infl'), m = L('mar');
  return {
    incomeMult: Math.pow(1.03, g),
    unrestAll: -0.03 * g,
    growthMult: 1 + 0.04 * g, // towns grow faster in ordered ages (SPEC §24)
    tradeMult: Math.pow(1.05, i),
    navalMult: Math.pow(1.04, i),
    legitimacyAdd: 0.01 * i,
    milPowerMult: Math.pow(1.04, m),
    manpowerMult: Math.pow(1.02, m),
    siegeBonus: Math.floor(m / 6),
  };
}

// ---------------------------------------------------------------- unit patterns
// The pattern of soldier a nation fields, unlocked by military tech. Armies
// remember the pattern they were raised to (army.gen); Modernize re-equips
// them to the nation's current pattern for gold. The mult multiplies army
// strength in battle — the single biggest lever tech owns.
// `upkeep` scales BASE.maintPerReg (SPEC §52): a levy eats bread, a legion
// draws pay, an armored corps devours pay, parts and shells. Better patterns
// hit harder AND cost more to keep standing — the maintenance line finally
// grows with the age instead of billing 1948 like 167 BCE.
export const UNIT_GENS = [
  { at: 0,  inf: 'Tribal Levies',       cav: 'Raider Horse',      mult: 1.0,  upkeep: 1.0 },
  { at: 4,  inf: 'Drilled Spearmen',    cav: 'Noble Cavalry',     mult: 1.25, upkeep: 1.1 },
  { at: 6,  inf: 'Professional Legions', cav: 'Cataphract Horse', mult: 1.55, upkeep: 1.25 },
  { at: 10, inf: 'Thematic Regulars',   cav: 'Armored Lancers',   mult: 1.9,  upkeep: 1.5 },
  { at: 14, inf: 'Musket Battalions',   cav: 'Dragoon Squadrons', mult: 2.3,  upkeep: 1.9 },
  { at: 19, inf: 'Rifle Brigades',      cav: 'Armored Corps',     mult: 2.8,  upkeep: 2.4 },
];

// Hulls age like soldiers (SPEC §31): same thresholds, same power curve.
// A fleet remembers the pattern it was laid down to; modernizing re-rigs it.
export const NAVAL_GENS = [
  { at: 0,  name: 'Penteconters' },
  { at: 4,  name: 'Trireme Squadrons' },
  { at: 6,  name: 'Quinquereme Fleets' },
  { at: 10, name: 'Dromon Flotillas' },
  { at: 14, name: 'Galleon Squadrons' },
  { at: 19, name: 'Destroyer Flotillas' },
];
export function navalGenName(genIdx) {
  const n = NAVAL_GENS[Math.max(0, Math.min(NAVAL_GENS.length - 1, genIdx | 0))];
  return n ? n.name : '';
}
// Talents to re-rig one hull one full pattern-generation forward.
export const MODERNIZE_COST_PER_SHIP_PER_GEN = 4;

// Index of the newest pattern a military tech level has unlocked.
export function unlockedGen(marLevel) {
  let gi = 0;
  for (let i = 0; i < UNIT_GENS.length; i++) {
    if ((marLevel | 0) >= UNIT_GENS[i].at) gi = i;
  }
  return gi;
}

export function genMult(genIdx) {
  const g = UNIT_GENS[Math.max(0, Math.min(UNIT_GENS.length - 1, genIdx | 0))];
  return g ? g.mult : 1;
}

export function genUpkeepMult(genIdx) {
  const g = UNIT_GENS[Math.max(0, Math.min(UNIT_GENS.length - 1, genIdx | 0))];
  return g && Number.isFinite(g.upkeep) ? g.upkeep : 1;
}

export function genName(genIdx, kind) {
  const g = UNIT_GENS[Math.max(0, Math.min(UNIT_GENS.length - 1, genIdx | 0))];
  return g ? g[kind === 'cav' ? 'cav' : 'inf'] : '';
}

// Talents to re-equip one regiment one full pattern-generation forward.
export const MODERNIZE_COST_PER_REG_PER_GEN = 6;

// ---------------------------------------------------------------- doctrines
// What each pattern generation KNOWS, beyond raw power (SPEC §29). Cumulative:
// a generation keeps everything the earlier ones learned. These ride the
// battle dice (a pip is worth as much as a general's star) and the siege
// clock, so a stack a generation ahead fights meaningfully differently —
// not just harder.
export const DOCTRINES = [
  { at: 1, key: 'shieldwall', name: 'Shieldwall',
    desc: 'Drilled ranks hold ground: +1 to the die when defending.' },
  { at: 2, key: 'drill', name: 'Professional Drill',
    desc: 'Standing soldiers press the assault: +1 to the die when attacking, and sieges progress 20% faster.' },
  { at: 3, key: 'charge', name: 'Shock Charge',
    desc: 'Armored lancers break lines: +1 to the die in the shock phase.' },
  { at: 4, key: 'volley', name: 'Volley Fire',
    desc: 'Massed muskets: +1 to the die in the fire phase.' },
  { at: 5, key: 'combined', name: 'Combined Arms',
    desc: 'Armor, artillery and radio: +1 to the die in every phase, half-again march speed, and artillery that breaks old walls.' },
];

export function doctrinesFor(genIdx) {
  const gi = genIdx | 0;
  return DOCTRINES.filter((d) => gi >= d.at);
}

// Die-roll bonus a side's best pattern earns in the given phase. Shieldwall
// and drill balance each other in equal-generation fights, so scripted-era
// battle arcs hold; the edge appears when one side is a generation ahead.
export function doctrinePips(genIdx, phase, defending) {
  const gi = genIdx | 0;
  let pips = 0;
  if (defending && gi >= 1) pips += 1;            // shieldwall
  if (!defending && gi >= 2) pips += 1;           // professional drill
  if (phase === 'shock' && gi >= 3) pips += 1;    // shock charge
  if (phase === 'fire' && gi >= 4) pips += 1;     // volley fire
  if (gi >= 5) pips += 1;                         // combined arms, every phase
  return pips;
}

export function doctrineSiegeMult(genIdx) {
  return (genIdx | 0) >= 2 ? 1.2 : 1;             // siegecraft
}
