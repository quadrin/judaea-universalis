// js/data/programs.js — the works of one's own (SPEC §209). DOM-free data +
// pure helpers, the era_ideas.js pattern: one module owns the whole table.
//
// §181 priced an air force and an armored corps at what they were in 1948 —
// an IMPORT, signed for in somebody else's capital and cut off the month that
// capital changed its mind. This is the other half of that sentence: what a
// state does about it. An **arms program** is a named weapon system a court
// develops at home. It opens at a rung of the military ladder, costs talents
// and martial points to begin, bills a monthly development line while it
// runs, and delivers years later — permanently.
//
// Two things a delivered program can be worth:
//   - **effects**, merged into tag.ideas by applyReformsToTag like every
//     other modifier (same contract: keys ending in 'Mult' multiply);
//   - **`works`**, the §181-gated arm this court can from now on build in
//     its own shops. A court that owns the works for EVERY gated arm needs
//     no supplier at all — and becomes a supplier, signable by anyone, with
//     the fee landing in its own treasury. That is the whole arc the chapter
//     is about: Žatec in 1948, an embargo in 1967, and a fighter of one's
//     own two decades later.
//
// Contracts (pinned by smoke136):
// - program keys are globally unique (effects resolve from the flat registry,
//   because applyReformsToTag has a tag but no bookmark);
// - every unlock level sits inside the bookmark's base..ceiling window, so
//   nothing is dangled that the century cannot reach;
// - every prerequisite names a program on the SAME court's roster, and no
//   prerequisite opens later than the program that needs it;
// - every effects key is one the sim already consumes;
// - every `works` value is an arm §181 actually gates.
//
// State: `t.programs = { key: monthsLeft }` — absent is unstarted, a positive
// number is under development, 0 is delivered. Plain numbers, rides saves.

// The arms §181 gates, and therefore the arms a program can free (SPEC §181:
// air wings and armor are the imports; foot, guns and hulls never were).
export const GATED_ARMS = ['wing', 'armor'];

// ---------------------------------------------------------------- the table
// Each program: what opens it (`unlock.level` on the military ladder, plus
// any `needs`), what beginning it costs (`cost` talents + `points` martial),
// what it bills monthly while it runs (`strain`), how long it takes
// (`months`), and what delivery is worth (`effects`, `works`, `opinion`).
export const ARMS_PROGRAMS = {
  // ---- Israel: the works that grew out of a war fought on other people's
  // surplus. Dates in the text are the historical deliveries; the campaign
  // reaches them when its ladder does, which may be sooner or never.
  uzi: {
    name: 'The Uzi', icon: 'spears', year: 1951,
    unlock: { ladder: 'mar', level: 20 }, needs: [],
    cost: 45, points: 60, months: 12, strain: 0.3,
    desc: 'Uziel Gal\'s submachine gun: stamped, cheap, and short enough for a half-track. '
      + 'The first thing the state\'s own shops made in quantity — and the first thing they sold abroad.',
    effects: { reinforceMult: 1.1, incomeMult: 1.03 },
  },
  shafrir: {
    name: 'The Shafrir', icon: 'flame', year: 1969,
    unlock: { ladder: 'mar', level: 21 }, needs: ['uzi'],
    cost: 80, points: 90, months: 18, strain: 0.8,
    desc: 'An air-to-air missile designed at home because the sellers would not sell one. '
      + 'The first mark was a failure; the second made every imported airframe worth more than its seller intended.',
    effects: { disciplineMult: 1.05 },
  },
  gabriel: {
    name: 'The Gabriel and the Boats', icon: 'ship', year: 1973,
    unlock: { ladder: 'mar', level: 21 }, needs: ['shafrir'],
    cost: 110, points: 100, months: 24, strain: 1.2,
    desc: 'A sea-skimming missile and the small fast hulls to carry it. At Latakia the boats fought '
      + 'the first missile action in the history of navies — decoying what was fired at them, and hitting with everything they fired.',
    effects: { navalMult: 1.3 },
  },
  nesher: {
    name: 'The Nesher', icon: 'helmet', year: 1971,
    unlock: { ladder: 'mar', level: 22 }, needs: ['uzi'],
    cost: 150, points: 120, months: 30, strain: 2,
    // The §181 answer to §181: the embargo is why this exists.
    works: 'wing',
    desc: 'The fighter the supplier was paid for and never delivered, built anyway. An overhaul shop '
      + 'becomes a manufacturer — and the sky stops being something another capital can switch off.',
    effects: { milPowerMult: 1.04 },
  },
  merkava: {
    name: 'The Merkava', icon: 'shield', year: 1979,
    unlock: { ladder: 'mar', level: 23 }, needs: ['uzi'],
    cost: 200, points: 150, months: 36, strain: 3,
    works: 'armor',
    desc: 'Engine forward, crew behind it, a door in the back. A tank laid out by a state that could '
      + 'replace the tank and not the four men in it — which is a doctrine before it is a vehicle.',
    effects: { milPowerMult: 1.06, manpowerMult: 1.05 },
  },
  kfir: {
    name: 'The Kfir', icon: 'star8', year: 1975,
    unlock: { ladder: 'mar', level: 23 }, needs: ['nesher'],
    cost: 200, points: 160, months: 30, strain: 2.5,
    works: 'wing',
    desc: 'The same airframe around a bigger engine, and the first aircraft this state ever sold to '
      + 'another. Buyers on two continents, and a lease to the navy that built the engine.',
    effects: { incomeMult: 1.06, disciplineMult: 1.05 },
  },
  ofek: {
    name: 'The Ofek and the Shavit', icon: 'star8', year: 1988,
    unlock: { ladder: 'mar', level: 24 }, needs: ['kfir'],
    cost: 170, points: 170, months: 30, strain: 2,
    desc: 'A satellite, and a rocket of one\'s own to put it up. It launches westward over the sea — '
      + 'backwards, against the turn of the earth, at a cost in payload — because everything eastward is somebody\'s airspace.',
    effects: { disciplineMult: 1.06, deterrent: 0.25 },
  },
  lavi: {
    name: 'The Lavi', icon: 'flame', year: 1986,
    unlock: { ladder: 'mar', level: 24 }, needs: ['kfir', 'merkava'],
    cost: 420, points: 260, months: 48, strain: 8,
    works: 'wing',
    // The one program the age argued about (SPEC §209): it flies, and the
    // capital that pays for it would rather it did not.
    desc: 'Not a foreign airframe improved — an aircraft of this state\'s own drawing, at the top of '
      + 'the ladder and the top of the budget. It flies beautifully. The capital whose money is building it '
      + 'would rather sell you its own.',
    effects: { milPowerMult: 1.1, disciplineMult: 1.05, incomeMult: 1.05 },
    opinion: { USA: -20 },
    cancelOpinion: { USA: 20 },
  },

  // ---- Egypt: Nasser's works at Helwan, which were real, were announced
  // loudly, and ran out of money. Priced against Egypt's own books on
  // purpose — a court that finishes either has chosen it over an army.
  helwan: {
    name: 'The Helwan Works', icon: 'helmet', year: 1964,
    unlock: { ladder: 'mar', level: 22 }, needs: [],
    cost: 180, points: 140, months: 36, strain: 4,
    works: 'wing',
    desc: 'A German design bureau, an Austrian engine team, a prototype that flew over the desert, '
      + 'and a treasury that had to choose between the works and the army.',
    effects: { milPowerMult: 1.04 },
  },
  qaher: {
    name: 'The Rockets of Al-Qahir', icon: 'flame', year: 1962,
    unlock: { ladder: 'mar', level: 22 }, needs: [],
    cost: 140, points: 120, months: 30, strain: 3.5,
    desc: 'Paraded through the capital on the anniversary of the revolution, with the range announced '
      + 'to the crowd. Making them fly where they were aimed was the part that was not announced.',
    effects: { deterrent: 0.2, milPowerMult: 1.02 },
  },
};

// ---------------------------------------------------------------- the roster
// Which chapter teaches which court which works. A chapter absent from this
// table has no arms programs at all — which is every chapter but 1948, and
// deliberately: a Hasmonean foundry is not this mechanic.
export const ARMS_PROGRAMS_BY_BOOKMARK = {
  '1948ce': {
    ISR: ['uzi', 'shafrir', 'gabriel', 'nesher', 'merkava', 'kfir', 'ofek', 'lavi'],
    EGY: ['helwan', 'qaher'],
  },
};

// Does this chapter have works to build at all?
export function armsProgramsOn(bookmark) {
  return !!(bookmark && ARMS_PROGRAMS_BY_BOOKMARK[bookmark.id]);
}

// The programs a chapter offers THIS court, def + key, in roster order. Empty
// array off the map, off the chapter, or for a court the chapter wrote no
// works for — never null. A formed crown keeps its founder's roster the way
// it keeps its founder's ideas (SPEC §102): the Kingdom of Israel inherits
// Israel's shops, because they are the same shops.
export function armsProgramsFor(bookmark, tag, t) {
  const table = bookmark && ARMS_PROGRAMS_BY_BOOKMARK[bookmark.id];
  if (!table) return [];
  let keys = table[tag];
  if (!keys && t && Array.isArray(t.lineage)) {
    for (const old of t.lineage) {
      if (table[old]) { keys = table[old]; break; }
    }
  }
  if (!keys) keys = table.default;
  const out = [];
  for (const key of keys || []) {
    const def = ARMS_PROGRAMS[key];
    if (def) out.push({ key, ...def });
  }
  return out;
}

// ---------------------------------------------------------------- reading state
// A program's state on one court, from `t.programs` alone: 'none' (never
// begun), 'work' (under development, `monthsLeft` to go) or 'done'.
export function programStatus(t, key) {
  const book = t && t.programs;
  if (!book || !Object.prototype.hasOwnProperty.call(book, key)) return 'none';
  return (book[key] | 0) > 0 ? 'work' : 'done';
}
export function programMonthsLeft(t, key) {
  const book = t && t.programs;
  if (!book) return 0;
  return Math.max(0, book[key] | 0);
}
export function programDelivered(t, key) {
  return programStatus(t, key) === 'done';
}

// Has this court's ladder reached the program's rung?
export function programLadderReached(t, def) {
  if (!def || !def.unlock) return false;
  const lvl = t && t.tech && Number.isFinite(t.tech[def.unlock.ladder]) ? t.tech[def.unlock.ladder] : 0;
  return (lvl | 0) >= (def.unlock.level | 0);
}

// Prerequisites, all delivered? (A program under development is not a
// prerequisite met — the shops have to finish one thing before the next.)
export function programNeedsMet(t, def) {
  for (const need of (def && def.needs) || []) {
    if (!programDelivered(t, need)) return false;
  }
  return true;
}

// The names of the prerequisites this court still owes, for the locked card.
export function programNeedsMissing(t, def) {
  const out = [];
  for (const need of (def && def.needs) || []) {
    if (programDelivered(t, need)) continue;
    const nd = ARMS_PROGRAMS[need];
    out.push(nd ? nd.name : need);
  }
  return out;
}

// Every arm this court's own shops can build, from its delivered programs.
// A Set so the caller can ask about one arm without walking the roster twice.
export function ownWorksOf(t) {
  const out = new Set();
  const book = (t && t.programs) || {};
  for (const key of Object.keys(book)) {
    if ((book[key] | 0) > 0) continue;          // still in the shops
    const def = ARMS_PROGRAMS[key];
    if (def && def.works) out.add(def.works);
  }
  return out;
}

// Does this court build every arm the market gates? Then it needs nobody —
// and, per §209, anybody may need it.
export function selfSufficientWorks(t) {
  const own = ownWorksOf(t);
  for (const arm of GATED_ARMS) if (!own.has(arm)) return false;
  return true;
}

// The monthly development bill: every program still in the shops, summed.
export function programStrain(t) {
  const book = (t && t.programs) || {};
  let out = 0;
  for (const key of Object.keys(book)) {
    if ((book[key] | 0) <= 0) continue;
    const def = ARMS_PROGRAMS[key];
    if (def && Number.isFinite(def.strain)) out += def.strain;
  }
  return out;
}

// How many works this court has delivered — mission checks read this.
export function programsDelivered(t) {
  const book = (t && t.programs) || {};
  let n = 0;
  for (const key of Object.keys(book)) {
    if (ARMS_PROGRAMS[key] && (book[key] | 0) === 0) n++;
  }
  return n;
}

// Merge every delivered program into one effects map — same contract as
// computeEraIdeaEffects (Mult keys multiply, everything else adds). Keys
// resolve from the flat registry, so a formed crown that carries the state
// into a chapter with no works still keeps what its shops already built.
export function computeProgramEffects(programs) {
  const out = {};
  if (!programs) return out;
  for (const key of Object.keys(programs)) {
    if ((programs[key] | 0) !== 0) continue;    // only what has been delivered
    const def = ARMS_PROGRAMS[key];
    if (!def || !def.effects) continue;
    for (const k of Object.keys(def.effects)) {
      if (k.endsWith('Mult')) out[k] = (out[k] === undefined ? 1 : out[k]) * def.effects[k];
      else out[k] = (out[k] === undefined ? 0 : out[k]) + def.effects[k];
    }
  }
  return out;
}
