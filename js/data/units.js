// js/data/units.js — the land roster (SPEC §186). DOM-free data + pure helpers.
//
// Three arms, six patterns each, eighteen soldiers with names. Before this the
// game had two arms and one of them was a costume: `cav` was a 25-talent
// infantryman that happened to be called Cataphract Horse, and the whole
// difference between a spear wall and a tank column lived in one multiplier.
//
// What an arm IS, here:
//   inf  the foot     — the line. Holds ground, brakes a charge, takes guns.
//   cav  the mounted  — the shock. Fast, and death to anything not braced.
//   art  the shot     — the missile. Slings, bows, engines, cannon, guns.
//
// and they answer each other in a triangle that the phase clock already
// implied: the shot speaks in the FIRE phase, the charge in the SHOCK phase,
// and the foot's business is standing there while both happen.
//
//   the shot breaks the line  ·  the line brakes the charge  ·  the charge
//   rides down the shot
//
// One exception, and it is the whole of the twentieth century: at pattern 5
// the mounted arm is armor (SPEC §181), and armor does not lose to a braced
// line — it loses to the guns and to the ground. §154's sky is the third
// counter, and it was already there.
//
// The faces are path data on a 24×24 grid (icons.js' own grid), authored once
// here and drawn twice: as `new Path2D(d)` on the map counters, and inside an
// <svg> in the recruit buttons and the inspector. One source of truth for what
// a soldier looks like, so a Dragoon Squadron is the same silhouette wherever
// the game draws it.

import { UNIT_GENS, genName } from './tech.js';

function num(v, d = 0) { return Number.isFinite(v) ? v : d; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

export const ARMS = ['inf', 'cav', 'art'];

// What each arm is, before any pattern is applied to it. `speed` multiplies
// the pattern's marching speed (SPEC §25's GEN_SPEED): horse outruns foot,
// and a gun train sets the pace of whatever it travels with.
export const ARM = {
  inf: {
    id: 'inf', label: 'Foot', plural: 'foot',
    speed: 1.0,
    blurb: 'The line. Cheap, quick to raise, and the only arm that brakes a charge.',
  },
  cav: {
    id: 'cav', label: 'Horse', plural: 'horse',
    speed: 1.25,
    blurb: 'The shock arm. Outruns everything, rides down guns, and breaks anything that has not braced for it.',
  },
  art: {
    id: 'art', label: 'Shot', plural: 'shot',
    speed: 0.85,
    blurb: 'The missile arm. Breaks a formed line at range — and cannot save itself once the horse is inside it.',
  },
};

// The shot arm's patterns, one per UNIT_GENS row. The foot and horse columns
// live in UNIT_GENS itself (SPEC §22 wrote them); this is the column §186
// adds, kept beside the arm it belongs to rather than bolted onto the pattern
// table two modules away.
export const ART_GENS = [
  'Slinger Bands',      // 0 — the shepherd's arm, and Judaea's own
  'Archer Companies',   // 1 — massed bow, drilled to volley
  'Bolt Engines',       // 2 — scorpiones and carroballistae with the legion
  'Naphtha Crews',      // 3 — the siphon and the fire that water does not put out
  'Field Batteries',    // 4 — cannon that travel with the army instead of behind it
  'Gun Regiments',      // 5 — howitzers, and the anti-tank gun that answers §181
];

export function armGenName(genIdx, arm) {
  const gi = clamp(genIdx | 0, 0, UNIT_GENS.length - 1);
  if (arm === 'art') return ART_GENS[Math.min(gi, ART_GENS.length - 1)];
  return genName(gi, arm === 'cav' ? 'cav' : 'inf');
}

// True where the mounted arm of this pattern is armor rather than horse
// (SPEC §181 owns the threshold; this reads it, and defaults to its value so
// a bookmark without the block still answers).
export function isArmorGen(genIdx, DEFINES) {
  const minGen = num(DEFINES && DEFINES.ARMOR && DEFINES.ARMOR.minGen, 5);
  return (genIdx | 0) >= minGen;
}

// ------------------------------------------------------------------ the faces
// 24×24, stroke-drawn, origin top-left — the icons.js grid exactly. One `d`
// string per soldier, all subpaths in it, because the same string is handed to
// `new Path2D()` on the map's canvas and dropped into a `<path d>` in a
// button. Authored so each silhouette survives being drawn at ten pixels on a
// counter: one dominant diagonal or one dominant mass per soldier, and no
// interior detail that closes up.
export const UNIT_GLYPHS = {
  // --- the foot ------------------------------------------------------------
  // Tribal Levies: a knobbed club raised over an oval hide shield. No line,
  // no drill — a shape that is deliberately cruder than everything after it.
  levy:
    'M3.6 13.6a4.1 5.7 0 1 0 8.2 0 4.1 5.7 0 1 0-8.2 0'
    + 'M6.5 13.6a1.2 1.2 0 1 0 2.4 0 1.2 1.2 0 1 0-2.4 0'
    + 'M14.2 20.8 17.6 10.4'
    + 'M16.6 9.2c1.7-1.3 3.4-.9 4.3.8.9 1.8.2 3.5-1.6 4.1-1.7.6-3.1-.3-3.6-2',
  // Drilled Spearmen: the spear, upright, and a round shield behind it.
  spear:
    'M13.8 3.2 15.6 7l-1.8 3-1.8-3 1.8-3.8Z'
    + 'M13.8 10v10.5'
    + 'M3 13.4a4.4 4.4 0 1 0 8.8 0 4.4 4.4 0 1 0-8.8 0'
    + 'M7.4 9v8.8M3 13.4h8.8',
  // Professional Legions: the gladius laid across the scutum's curve.
  legion:
    'M5 5.6c2.6-1 5.4-1 8 0v8.9c0 2.6-1.6 4.4-4 5.4-2.4-1-4-2.8-4-5.4V5.6Z'
    + 'M9 8.4v6.6M6.6 11.7h4.8'
    + 'M14.6 20.2 20 8.4'
    + 'M17.4 14.6 20.6 16'
    + 'M19.2 10.6 21 6',
  // Thematic Regulars: the kite shield and the couched spear of the themes.
  kite:
    'M6.4 4.6c2.4-.9 4.8-.9 7.2 0v6.6c0 3.6-1.6 6.4-3.6 8.6-2-2.2-3.6-5-3.6-8.6V4.6Z'
    + 'M10 4.1v14.4'
    + 'M15.6 20 21 5.4'
    + 'M19.9 8.9 21.6 3.6 17.4 5.5',
  // Musket Battalions: two muskets crossed at the sling swivel, bayonets up.
  musket:
    'M7 20 16.4 5.2M17 20 7.6 5.2'
    + 'M16.4 5.2 17.6 2.8M7.6 5.2 6.4 2.8'
    + 'M9.4 12.6h5.2'
    + 'M6.4 18.6 8.6 20M17.6 18.6 15.4 20',
  // Rifle Brigades: crossed rifles with the magazine and the sling loop.
  rifles:
    'M6.2 19.4 17.4 5M17.8 19.4 6.6 5'
    + 'M10.8 10.2 13 12.9'
    + 'M11.4 15.6c1.4 1 2.6 1 4 0'
    + 'M6.6 5 5.2 3.2M17.4 5l1.4-1.8',

  // --- the mounted ---------------------------------------------------------
  // The whole mounted arm shares ONE head — the arched neck, the muzzle out
  // to the left, the ears — because a horse has to read as a horse at ten
  // pixels, and four differently-drawn attempts at one all read as a squiggle
  // instead. What changes between the patterns is what is ON the horse.
  horse:
    'M7.6 21.4c0-4.8-.6-6.8-2.2-8.2L2.8 11.4 4.2 8.6c1.4-2.8 4.2-4.8 7.4-5.2'
    + 'L11.2 1.2 13.4 2.8c3.2.6 5.2 3 5.8 6.6.6 4.2-.2 8.4-.8 12Z'
    + 'M5.4 13.2c1.8.6 3.4.2 4.6-1.2'
    + 'M9.4 7.4a.65.65 0 1 0 1.3 0 .65.65 0 1 0-1.3 0',
  // Noble Cavalry: the same head, and a plain lance carried across it.
  lancehorse:
    'M7.6 21.4c0-4.8-.6-6.8-2.2-8.2L2.8 11.4 4.2 8.6c1.4-2.8 4.2-4.8 7.4-5.2'
    + 'L11.2 1.2 13.4 2.8c3.2.6 5.2 3 5.8 6.6.6 4.2-.2 8.4-.8 12Z'
    + 'M5.4 13.2c1.8.6 3.4.2 4.6-1.2'
    + 'M2.4 21.6 22 6.4'
    + 'M20.2 7.8 22.6 5.2 21.4 8.4',
  // Cataphract Horse: the head, barded — scale armor banding the whole neck.
  cataphract:
    'M7.6 21.4c0-4.8-.6-6.8-2.2-8.2L2.8 11.4 4.2 8.6c1.4-2.8 4.2-4.8 7.4-5.2'
    + 'L11.2 1.2 13.4 2.8c3.2.6 5.2 3 5.8 6.6.6 4.2-.2 8.4-.8 12Z'
    + 'M5.4 13.2c1.8.6 3.4.2 4.6-1.2'
    + 'M8.6 13.4c3.4 1.4 6.8 1.4 10.2 0'
    + 'M7.2 16.8c3.9 1.4 7.8 1.4 11.7 0'
    + 'M6.5 20.1c4.2 1.2 8.4 1.2 12.1 0',
  // Armored Lancers: the head, and the couched lance with its pennon flying —
  // the high-medieval knight, and the reason this pattern hits like it does.
  lancer:
    'M7.6 21.4c0-4.8-.6-6.8-2.2-8.2L2.8 11.4 4.2 8.6c1.4-2.8 4.2-4.8 7.4-5.2'
    + 'L11.2 1.2 13.4 2.8c3.2.6 5.2 3 5.8 6.6.6 4.2-.2 8.4-.8 12Z'
    + 'M5.4 13.2c1.8.6 3.4.2 4.6-1.2'
    + 'M2 21.8 22.4 5.6'
    + 'M12.4 13.6 17 9.9l.6 3.7-4.5 3.6Z',
  // Dragoon Squadrons: the head over a drawn sabre — they fight dismounted
  // as often as not, and the sabre is the half of them that still rides.
  dragoon:
    'M7.1 17.4c0-3.9-.5-5.5-1.8-6.6L3.7 9.4 4.8 7.2c1.1-2.3 3.4-3.9 6-4.2'
    + 'L10.5 1.6 12.3 2.9c2.6.5 4.2 2.4 4.7 5.3.5 3.4-.2 6.8-.6 9.7Z'
    + 'M4.9 10.9c1.4.5 2.8.2 3.7-1'
    + 'M2.4 20.4c4.8.9 9.2 0 13-2.6 2.4-1.6 4.3-2.2 5.6-1.9'
    + 'M19.6 14.4 22.4 15.9 19.9 18.2',
  // Armored Corps: hull, turret, gun, and the road wheels under it.
  tank:
    'M2.6 16.6h18.8v3.2H2.6z'
    + 'M4.6 13.2h14.2v3.4H4.6z'
    + 'M8.8 9.4h5.6v3.8H8.8z'
    + 'M14.4 10.8h7'
    + 'M5.6 18.2h1.2M8.8 18.2H10M12 18.2h1.2M15.2 18.2h1.2M18.4 18.2h1.2',

  // --- the shot ------------------------------------------------------------
  // Slinger Bands: the sling whirling, the stone away from it.
  sling:
    'M6.4 4.2c5.2 0 9 3.4 9 8 0 3.6-2.4 6.4-5.8 6.4-2.6 0-4.4-1.8-4.4-4.2 0-2 1.4-3.4 3.2-3.4'
    + 'M6.4 4.2 4 7.4M6.4 4.2l3.4-1.6'
    + 'M17.2 17.4a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0',
  // Archer Companies: the bow drawn, the arrow on the string.
  bow:
    'M8 3.4c4.6 3 6.4 6.2 6.4 8.8s-1.8 5.8-6.4 8.8'
    + 'M8 3.4 6.2 5.4M8 20.6l-1.8-2'
    + 'M7.2 5.6c3.8 2.2 3.8 11 0 13.2'
    + 'M4 12.2h16'
    + 'M17.6 10.2 20.4 12.2 17.6 14.2',
  // Bolt Engines: the scorpio in profile — stock, torsion bow at the muzzle,
  // the bolt lying in its groove, and the post it traverses on.
  ballista:
    'M3.6 13.4h13.8'
    + 'M17.4 9.4 19.8 13.4 17.4 17.4'
    + 'M6.4 10.6h9.8'
    + 'M16.2 10.6 14 9M16.2 10.6l-2.2 1.6'
    + 'M10.4 13.4v7'
    + 'M6.8 20.4h7.2'
    + 'M3.6 11.2v4.4',
  // Naphtha Crews: the cauldron on its tripod, the siphon tube, and the fire
  // at the nozzle — the thing that burned a fleet off the walls of the City.
  siphon:
    'M2.6 11.8h9.6v4.4H2.6z'
    + 'M12.2 14h3.4'
    + 'M5.6 16.2v3.4M9.2 16.2v3.4'
    + 'M15.8 14.4c1.6-1.4 2.3-2.9 2.1-4.5 2.2 1.7 3.4 3.5 3.4 5.3 0 2-1.5 3.4-3.4 3.4s-3.2-1.3-3.2-2.9c0-.8.3-1.6.8-2.1'
    + 'M4.4 11.8V9.6',
  // Field Batteries: the cannon on its carriage, muzzle up and to the right.
  cannon:
    'M4.2 15.2 19.4 7.4'
    + 'M4.2 15.2 3 12.8l1.8-1 1.4 2.4'
    + 'M18.6 5.8 20.8 9.2 19.4 7.4'
    + 'M6.6 17.4a3 3 0 1 0 6 0 3 3 0 1 0-6 0'
    + 'M9.6 17.4 3.6 20.6M9.6 17.4l5.8 3.2',
  // Gun Regiments: the long barrel over a split trail — the anti-tank gun.
  gun:
    'M3.6 12.4h16.8'
    + 'M20.4 10.6v3.6'
    + 'M8.4 12.4c-1.4 0-2.4 1-2.4 2.4v1'
    + 'M6 15.8 2.4 20.4M6 15.8l3.4 4.6'
    + 'M7.8 15a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0',
};

// pattern → face. Every one of the eighteen has its own silhouette; nothing
// falls through to a shared "soldier" icon, because the point of the table is
// that a Cataphract and a Dragoon do not look alike on the map.
const GLYPH_BY_ARM = {
  inf: ['levy', 'spear', 'legion', 'kite', 'musket', 'rifles'],
  cav: ['horse', 'lancehorse', 'cataphract', 'lancer', 'dragoon', 'tank'],
  art: ['sling', 'bow', 'ballista', 'siphon', 'cannon', 'gun'],
};

export function unitGlyphKey(genIdx, arm) {
  const row = GLYPH_BY_ARM[arm] || GLYPH_BY_ARM.inf;
  return row[clamp(genIdx | 0, 0, row.length - 1)];
}
// The `d` string — Path2D on the map, `<path d>` in the panels.
export function unitGlyphPath(genIdx, arm) {
  return UNIT_GLYPHS[unitGlyphKey(genIdx, arm)] || '';
}
// Ready-made SVG markup for icons.js' 24×24 stroke grid.
export function unitGlyphSvg(genIdx, arm) {
  const d = unitGlyphPath(genIdx, arm);
  return d ? '<path d="' + d + '"/>' : '';
}

// ------------------------------------------------------------ what it sounds like
// The cue key sound.js plays when a column of this pattern is put on the road,
// and when a host led by this arm goes into the line. Grouped by what the
// listener would actually hear, which is a shorter list than the roster:
// hooves are hooves in every century until they are engines.
const MOVE_CUE = {
  inf: ['march', 'march', 'march', 'march', 'marchDrum', 'marchBoots'],
  cav: ['hooves', 'hooves', 'hooves', 'hooves', 'hooves', 'engines'],
  art: ['timber', 'timber', 'timber', 'timber', 'limber', 'limber'],
};
const BATTLE_CUE = {
  inf: ['clash', 'clash', 'clash', 'clash', 'volley', 'rifleFire'],
  cav: ['charge', 'charge', 'charge', 'charge', 'charge', 'armorFire'],
  art: ['stones', 'stones', 'engines_', 'engines_', 'cannonade', 'cannonade'],
};
export function unitMoveCue(genIdx, arm) {
  const row = MOVE_CUE[arm] || MOVE_CUE.inf;
  return row[clamp(genIdx | 0, 0, row.length - 1)];
}
export function unitBattleCue(genIdx, arm) {
  const row = BATTLE_CUE[arm] || BATTLE_CUE.inf;
  return row[clamp(genIdx | 0, 0, row.length - 1)];
}

// ------------------------------------------------------------------ the triangle
// M[phase][mine][theirs] — what one full share of MY arm is worth against one
// full share of THEIRS, in that phase, expressed in die pips. Both sides are
// scored the same way from their own row, so an edge is never double-counted:
// a spear wall's +1.6 against horse is the spear wall's, and the horse's own
// row answers for what the horse is doing back.
export const MATCHUPS = {
  fire: {
    inf: { inf: 0, cav: 0.4, art: 0 },      // javelins and skirmishers gall the horse
    cav: { inf: 0, cav: 0, art: 0 },        // the charge is not a fire-phase act
    art: { inf: 2.4, cav: 1.6, art: 0 },    // massed shot into a formed line
  },
  shock: {
    inf: { inf: 0, cav: 1.6, art: 0.8 },    // the spear wall, and foot overruns guns too
    cav: { inf: 0.6, cav: 0, art: 2.4 },    // ride down the shot
    art: { inf: 0, cav: 0, art: 0 },        // guns are not a melee arm
  },
};
// The twentieth century's two amendments (SPEC §181's armor). Applied only
// where the arm in question is at ARMOR.minGen or beyond.
export const ARMOR_MATCHUPS = {
  // armor's own shock row, replacing cav's
  shock: { inf: 2.2, cav: 0, art: 0.9 },
  // what a braced line is worth against armor instead of against horse: a
  // rifle company does not stop a Sherman by forming square
  infVsArmorShock: 0.2,
  // the answer, and it is the guns: anti-tank fire, in the phase guns speak
  artVsArmorFire: 2.6,
};

// Where the mounted arm cannot do what it does. Broken and boggy ground has
// always cost cavalry its charge; it costs armor more, because a tank that
// cannot go around is a pillbox that burns fuel.
export const MOUNTED_TERRAIN = {
  hills: { cav: 0.5, armor: 0.35 },
  mountains: { cav: 0.25, armor: 0.1 },
  marsh: { cav: 0.4, armor: 0.2 },
  wasteland: { cav: 0.6, armor: 0.4 },
};

// How much of a host an arm has to be before it leads it.
export const LEAD_SHARE = { cav: 0.3, art: 0.35 };

// The arm a host reads as — the one the counter draws, the one you hear when
// it takes the road, and the one the field sounds like when it goes in.
//
// NOT simply "most regiments": every real army in this game is mostly foot, so
// a plurality rule would put a spear on every standard in every century and
// the tank glyph would never once be drawn. A host that is a third horse IS a
// cavalry host — that is the arm that decides its battle and sets its pace —
// and a host that is a third guns is a gun line. Foot leads what is left,
// which is most things, which is correct.
export function dominantArm(regiments) {
  const r = regiments || {};
  const inf = Math.max(0, num(r.inf));
  const cav = Math.max(0, num(r.cav));
  const art = Math.max(0, num(r.art));
  const total = inf + cav + art;
  if (total <= 0) return 'inf';
  const cavShare = cav / total, artShare = art / total;
  if (cavShare >= LEAD_SHARE.cav && cavShare >= artShare) return 'cav';
  if (artShare >= LEAD_SHARE.art) return 'art';
  if (inf > 0) return 'inf';
  return cav >= art ? 'cav' : 'art';
}

// Regiment counts → shares that sum to 1 (an empty army is all foot, which is
// what a skeleton formation fights as).
export function armShares(regiments) {
  const inf = Math.max(0, num(regiments && regiments.inf));
  const cav = Math.max(0, num(regiments && regiments.cav));
  const art = Math.max(0, num(regiments && regiments.art));
  const total = inf + cav + art;
  if (total <= 0) return { inf: 1, cav: 0, art: 0 };
  return { inf: inf / total, cav: cav / total, art: art / total };
}

// The signed pip contribution MY mix earns against THEIRS, this phase.
//   mine/theirs: { shares, armor, artModern }  — armor/artModern are booleans
//     saying whether that side's mounted arm is tanks and whether its guns are
//     of the pattern that can kill them.
//   terrain:     the destination province's terrain key, or ''.
// Returns an unrounded number; the caller scales it to pips and caps it.
export function armEdge(phase, mine, theirs, terrain) {
  const table = MATCHUPS[phase === 'shock' ? 'shock' : 'fire'];
  const ms = mine.shares || armShares(null);
  const ts = theirs.shares || armShares(null);
  const rough = MOUNTED_TERRAIN[terrain] || null;
  let edge = 0;
  for (const a of ARMS) {
    const share = num(ms[a]);
    if (share <= 0) continue;
    for (const b of ARMS) {
      const against = num(ts[b]);
      if (against <= 0) continue;
      let v = num(table[a][b]);
      // armor's own shock row replaces the horse's
      if (a === 'cav' && mine.armor && phase === 'shock') v = num(ARMOR_MATCHUPS.shock[b]);
      // a braced line against armor is not a braced line against horse
      if (a === 'inf' && b === 'cav' && theirs.armor && phase === 'shock') {
        v = ARMOR_MATCHUPS.infVsArmorShock;
      }
      // the guns answer the tanks, where the guns are new enough to
      if (a === 'art' && b === 'cav' && theirs.armor && phase === 'fire' && mine.artModern) {
        v = ARMOR_MATCHUPS.artVsArmorFire;
      }
      // the ground takes the charge away
      if (a === 'cav' && rough) v *= mine.armor ? rough.armor : rough.cav;
      edge += share * against * v;
    }
  }
  return edge;
}

// The line the battle window prints under a side's dice: which arm is earning
// the pips, in words. '' when the mix is doing nothing in this phase.
export function armEdgeText(phase, mine, theirs, terrain) {
  const parts = [];
  const ms = mine.shares || armShares(null);
  const ts = theirs.shares || armShares(null);
  const rough = MOUNTED_TERRAIN[terrain] || null;
  if (phase === 'fire' && ms.art > 0 && (ts.inf > 0 || ts.cav > 0)) {
    parts.push(theirs.armor && mine.artModern
      ? 'the guns are firing over open sights at their armor'
      : 'our shot is telling on their line');
  }
  if (phase === 'shock' && ms.cav > 0 && ts.art > 0) {
    parts.push(mine.armor ? 'our armor is among their guns' : 'our horse is in among their shot');
  }
  if (phase === 'shock' && ms.cav > 0 && ts.inf > 0 && mine.armor) {
    parts.push('their foot has nothing that stops armor');
  }
  if (phase === 'shock' && ms.inf > 0 && ts.cav > 0 && !theirs.armor) {
    parts.push('our line is braced against their horse');
  }
  if (phase === 'shock' && rough && ts.cav > 0) {
    parts.push('the ground here is no place for ' + (theirs.armor ? 'armor' : 'cavalry'));
  }
  return parts.join('; ');
}
