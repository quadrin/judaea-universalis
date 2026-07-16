// js/sim/population.js — who actually lives in a province (SPEC §56). DOM-free.
// A province may carry a population makeup: p.pop = [{r, c, n}] — religion,
// culture, headcount. The largest community IS the province's religion and
// culture (every legacy consumer keeps working); the UNINTEGRATED minority
// share is what drives communal unrest; the Integrate project (schools, land,
// civil service) raises p.integration toward 1 and calms it — the modern
// answer where missionary conversion is era-gated off, and a gentler tool
// beside it everywhere else. Provinces without a makeup (old saves) fall back
// to the classic binary faith/culture unrest.

import { num, clamp } from './military.js';

// Total souls per point of development; a bookmark's popMult scales the age
// (the crowded 20th century vs the thinner ancient world).
export const POP_PER_DEV = 2500;

export function devTotalOf(p) {
  if (!p || !p.dev) return 0;
  return num(p.dev.tax) + num(p.dev.prod) + num(p.dev.mp);
}

// Seed a makeup at province creation. `mix` is the bookmark's share table
// ([{r, c, share}]) or null for a homogeneous province of the majority faith.
export function seedPop(p, mix, popMult) {
  const total = Math.max(0, Math.round(devTotalOf(p) * POP_PER_DEV * (Number.isFinite(popMult) ? popMult : 1)));
  if (!total) { p.pop = []; return; }
  if (Array.isArray(mix) && mix.length) {
    p.pop = mix
      .map((m) => ({ r: m.r, c: m.c, n: Math.round(total * clamp(num(m.share), 0, 1)) }))
      .filter((e) => e.n > 0);
  } else {
    p.pop = [{ r: p.religion, c: p.culture, n: total }];
  }
  normalizePop(p);
}

// Merge duplicate communities, drop empties, sort largest-first, and let the
// majority community name the province's religion and culture.
export function normalizePop(p) {
  if (!Array.isArray(p.pop)) return;
  const byKey = new Map();
  for (const e of p.pop) {
    if (!e || !(e.n > 0)) continue;
    const key = e.r + '|' + e.c;
    const cur = byKey.get(key);
    if (cur) cur.n += Math.round(e.n);
    else byKey.set(key, { r: e.r, c: e.c, n: Math.round(e.n) });
  }
  p.pop = [...byKey.values()].sort((a, b) => b.n - a.n);
  if (p.pop.length) {
    p.religion = p.pop[0].r;
    p.culture = p.pop[0].c;
  }
}

export function popTotal(p) {
  if (!Array.isArray(p.pop)) return 0;
  let s = 0;
  for (const e of p.pop) s += num(e.n);
  return s;
}

// The communal-tension shares against a state religion/culture, 0..1 each.
// Integration is NOT applied here — the caller scales by (1 - integration).
export function popTension(ctx, p, owner) {
  const total = popTotal(p);
  if (!total || !owner) return null;
  const RELS = ctx.DEFINES.RELIGIONS || {};
  const CULS = ctx.DEFINES.CULTURES || {};
  const og = RELS[owner.religion] && RELS[owner.religion].group;
  const ocg = CULS[owner.culture] && CULS[owner.culture].group;
  let heathen = 0;
  let heretic = 0;
  let foreignCulture = 0;
  for (const e of p.pop) {
    const share = e.n / total;
    if (e.r !== owner.religion) {
      const gr = RELS[e.r] && RELS[e.r].group;
      if (gr && og && gr === og) heretic += share;
      else heathen += share;
    }
    const cg = CULS[e.c] && CULS[e.c].group;
    if (cg !== ocg) foreignCulture += share;
  }
  return { heathen, heretic, foreignCulture, minority: heathen + heretic };
}

// Conversion's hand on the makeup: a fraction of every foreign-faith
// community adopts the state religion (keeping its culture). The centuries
// of missionaries move people, not map paint.
export function shiftPopToReligion(p, religion, fraction) {
  if (!Array.isArray(p.pop) || !p.pop.length) return;
  const f = clamp(num(fraction, 1), 0, 1);
  const moved = [];
  for (const e of p.pop) {
    if (e.r === religion) continue;
    const n = Math.round(e.n * f);
    if (n <= 0) continue;
    e.n -= n;
    moved.push({ r: religion, c: e.c, n });
  }
  p.pop.push(...moved);
  normalizePop(p);
}

// Immigration and flight (events, SPEC §56): add (or with n<0 remove) souls.
export function addPopulation(p, entry) {
  if (!p || !entry || !entry.r || !entry.c) return;
  if (!Array.isArray(p.pop)) p.pop = [];
  const n = Math.round(num(entry.n));
  if (n >= 0) p.pop.push({ r: entry.r, c: entry.c, n });
  else {
    // Removal drains the matching community, floor zero.
    for (const e of p.pop) {
      if (e.r === entry.r && e.c === entry.c) { e.n = Math.max(0, e.n + n); break; }
    }
  }
  normalizePop(p);
}

// Display names: an ethno-religious community reads as people, not keys.
const DEMONYMS = {
  judaism: 'Jews', samaritanism: 'Samaritans', hellenism: 'Greeks',
  roman_cult: 'Romans', nabataean: 'Nabataeans', zoroastrianism: 'Zoroastrians',
  egyptian: 'Egyptians', christianity: 'Christians', islam: 'Muslims',
};
export function communityLabel(DEFINES, r, c) {
  const base = DEMONYMS[r] || ((DEFINES.RELIGIONS || {})[r] ? DEFINES.RELIGIONS[r].name : r);
  const cul = (DEFINES.CULTURES || {})[c];
  const group = cul && cul.group;
  // Arab Christians/Muslims read by both halves; elsewhere faith says enough.
  if ((group === 'arab' || group === 'arab_modern') && (r === 'christianity' || r === 'islam')) {
    return r === 'islam' ? 'Muslim Arabs' : 'Christian Arabs';
  }
  return base;
}
