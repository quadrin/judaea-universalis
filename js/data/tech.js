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
export const UNIT_GENS = [
  { at: 0,  inf: 'Tribal Levies',       cav: 'Raider Horse',      mult: 1.0 },
  { at: 4,  inf: 'Drilled Spearmen',    cav: 'Noble Cavalry',     mult: 1.25 },
  { at: 6,  inf: 'Professional Legions', cav: 'Cataphract Horse', mult: 1.55 },
  { at: 10, inf: 'Thematic Regulars',   cav: 'Armored Lancers',   mult: 1.9 },
  { at: 14, inf: 'Musket Battalions',   cav: 'Dragoon Squadrons', mult: 2.3 },
  { at: 19, inf: 'Rifle Brigades',      cav: 'Armored Corps',     mult: 2.8 },
];

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

export function genName(genIdx, kind) {
  const g = UNIT_GENS[Math.max(0, Math.min(UNIT_GENS.length - 1, genIdx | 0))];
  return g ? g[kind === 'cav' ? 'cav' : 'inf'] : '';
}

// Talents to re-equip one regiment one full pattern-generation forward.
export const MODERNIZE_COST_PER_REG_PER_GEN = 6;
