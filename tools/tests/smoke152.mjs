// Headless regression — SPEC §227: the constitution takes a name of its own.
//
// §214 made the five constitutional forks bite: the Government row moves with
// the answer and the succession rules move with it. What it could not do is
// make the answer a COUNTRY — all four settlements of 71 left the same three
// letters on the map in the same blue, under the same emblem, working the same
// chapter tree.
//
// §227 gives every Jewish constitution a crown of its own on the §22 formable
// machinery. Ten constitutions, ten banners, ten trees. The contracts:
//
//   THE TABLE — every constitution the four Jewish forks adopt has exactly one
//   crown; every crown is fully outfitted (a tag def, a flag, a government, an
//   AI temper, a payoff, a chain); no two of them share three letters, a name,
//   a colour, a constitution or an emblem; all ten are player-only.
//
//   THE PLUMBING — this is the load-bearing claim of the section. Proclaiming
//   a crown IS adopting its constitution, because switchTagCore reads GOV_OF
//   for the new banner: the government lands, the election clock starts where
//   it votes, and the heir is gone where nothing inherits.
//
//   THE GATE — the first requirement of every crown is the constitution, read
//   off govType. A realm that answered the fork the other way sees the other
//   nine crowns unticked and cannot enact them.
//
//   FORK TO CROWN, LIVE — the four settlements of 71 fired through the real
//   event cards, each landing on its own constitution, each opening exactly
//   one crown and closing the other three.
//
//   TEN DIFFERENT TREES — every crown carries a chain; every node is dressed
//   and seated; no node waits on one that does not exist; and the ten branches
//   share no node with each other, which is what "different mission trees"
//   has to mean mechanically.
//
//   PAY — every node of every crown completes in a maximal realm. A node that
//   cannot pay THERE is dead content: a misspelled field, a threshold no
//   campaign can reach, a check reading something never written. None of those
//   throw, which is why this suite exists.
//
//   THE ROAD ONWARD — the greater crown is not closed off by naming the lesser
//   one. Every constitutional banner keeps a Kingdom of Israel formable, and
//   proclaiming it ENDS the constitution, because MLI's own government is a
//   monarchy and switchTagCore applies the new banner's.
import { readFileSync, readdirSync } from 'fs';
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import { bus } from '../../js/core/bus.js';
import { initGame, makeCtx } from '../../js/sim/init.js';
import { liveInstitutions, universalInstitutions } from '../../js/sim/institutions.js';
import * as realm from '../../js/sim/realm.js';
import { FORMABLES } from '../../js/data/formables.js';
import { switchTagCore } from '../../js/sim/military.js';
import { factionDefs } from '../../js/sim/factions.js';
import { FLAGS } from '../../js/ui/icons.js';

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// The section's own table, written out here rather than derived from the file
// under test: a suite that reads its expectations out of the data it is
// checking proves only that the data equals itself.
const CROWNS = [
  { tag: 'SNH', gov: 'sanhedrin', from: 'JUD', chapters: ['66ce'] },
  { tag: 'GRL', gov: 'lot', from: 'JUD', chapters: ['66ce'] },
  { tag: 'YVL', gov: 'jubilee', from: 'JUD', chapters: ['66ce'] },
  { tag: 'HRZ', gov: 'noRuler', from: 'JUD', chapters: ['66ce'] },
  // The diadem is offered between 128 and 95 BCE, and the 167 court is not the
  // same court on day one: the Hasideans are gone by 140 and the Pharisees and
  // Sadducees take their chairs (SPEC §127). A crown taken at the chapter's
  // opening month would be judged against a room that does not exist when the
  // fork actually fires, so these two are proclaimed on the fork's own clock.
  { tag: 'KHN', gov: 'priestKing', from: 'HAS', chapters: ['167bce'], year: -100 },
  { tag: 'GRS', gov: 'gerousia', from: 'HAS', chapters: ['167bce'], year: -100 },
  { tag: 'KTR', gov: 'diadem', from: 'JUD', chapters: ['132ce', '614ce'] },
  { tag: 'BTD', gov: 'davidic', from: 'JUD', chapters: ['132ce', '614ce'] },
  { tag: 'SHB', gov: 'dyarchy', from: 'JUD', chapters: ['132ce'] },
  { tag: 'NSI', gov: 'nasi', from: 'JUD', chapters: ['132ce'] },
];
// Two of the ten are constituted on the refusal of ties, so "every dial at its
// stop" means something different for them: a maximal Lot has no allies by
// construction, and a fixture that forced allies on would report the
// constitution's own dividend as dead content.
const ISOLATIONISTS = new Set(['GRL', 'HRZ']);

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
function boot(era, playerTag) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, playerTag, rngSeed: 11 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events });
  return { game, ctx, era };
}
const eraOf = (id) => ERAS.find((x) => x.bookmark.id === id);
const formableFor = (tag) => FORMABLES.find((f) => f && f.to === tag);
const doneIds = (t) => new Set(t.missionsDone || []);

// ------------------------------------------------------------------ the table
console.log('== §227: ten constitutions, ten crowns, fully outfitted ==');
{
  // Every non-starting Jewish constitution in GOV_TYPES gets a crown, and no
  // crown names a government that does not exist. The four a bookmark boots
  // with keep no banner of their own — a realm does not "become" a monarchy.
  const STARTING = new Set(['monarchy', 'republic', 'theocracy', 'tribal']);
  const adopted = Object.keys(DEFINES.GOV_TYPES).filter((k) => !STARTING.has(k) && k !== 'company');
  ok(adopted.length === CROWNS.length,
    'the ' + adopted.length + ' adoptable Jewish constitutions have ' + CROWNS.length + ' crowns');
  const covered = new Set(CROWNS.map((c) => c.gov));
  const uncrowned = adopted.filter((g) => !covered.has(g));
  ok(!uncrowned.length, 'no constitution is left without a name of its own ('
    + (uncrowned.join(', ') || 'all ten crowned') + ')');
  ok(!DEFINES.GOV_OF.LST || DEFINES.GOV_OF.LST === 'company',
    'the band that stopped moving keeps its own constitution and takes no crown here');

  for (const c of CROWNS) {
    const def = DEFINES.TAGS[c.tag];
    const f = formableFor(c.tag);
    ok(!!def && def.religion === 'judaism' && def.capital === 'Jerusalem',
      c.tag + ': a Jewish court seated at Jerusalem');
    ok(!!def && typeof def.name === 'string' && def.name.length > 4
      && Array.isArray(def.color) && def.color.length === 3
      && typeof def.description === 'string' && def.description.length > 40
      && def.ideas && Object.keys(def.ideas).length >= 2,
      c.tag + ': named, coloured, described and given ideas of its own');
    ok(typeof FLAGS[c.tag] === 'string' && FLAGS[c.tag].length > 100,
      c.tag + ': flies real emblem art');
    ok(DEFINES.GOV_OF[c.tag] === c.gov,
      c.tag + ': declares its constitution in GOV_OF (' + DEFINES.GOV_OF[c.tag] + ')');
    ok(!!DEFINES.PERSONALITIES[c.tag], c.tag + ': has an AI temper');
    ok(!!f && f.from === c.from, c.tag + ': is formable out of ' + c.from);
    ok(!!f && JSON.stringify(f.bookmarks) === JSON.stringify(c.chapters),
      c.tag + ': offered in ' + c.chapters.join(', '));
    ok(!!f && !f.ai, c.tag + ': is player-only — no AI court re-brands mid-chapter');
    const b = (f && f.bonus) || {};
    ok(Number.isFinite(b.legitimacy) && !!b.grant && !!b.modifier && !!b.modifier2 && !!b.rulerTitle,
      c.tag + ': the crown pays — legitimacy, a grant, two permanent modifiers and a style');
  }

  // Nothing blurs: three letters, a name, a colour, a constitution, an emblem.
  const seen = { tag: new Set(), name: new Set(), color: new Set(), gov: new Set(), art: new Set() };
  const dupes = [];
  for (const c of CROWNS) {
    const def = DEFINES.TAGS[c.tag] || {};
    const pairs = [
      ['tag', c.tag], ['name', def.name], ['color', (def.color || []).join(',')],
      ['gov', c.gov], ['art', FLAGS[c.tag]],
    ];
    for (const [k, v] of pairs) {
      if (seen[k].has(v)) dupes.push(c.tag + ' repeats a ' + k);
      seen[k].add(v);
    }
  }
  ok(!dupes.length, 'no two crowns share three letters, a name, a colour, a constitution or '
    + 'an emblem (' + (dupes.join('; ') || 'all ten distinct') + ')');
  // And none of them wears Judaea's menorah or Israel's hexagram — those two
  // are the faith and the kingdom, not an arrangement.
  const borrowed = CROWNS.filter((c) => FLAGS[c.tag] === FLAGS.JUD || FLAGS[c.tag] === FLAGS.MLI);
  ok(!borrowed.length, 'no crown borrows Judaea\'s or Israel\'s banner');
}

// -------------------------------------------------------------- the plumbing
// The load-bearing claim: proclaiming the crown adopts the constitution,
// because switchTagCore reads GOV_OF for the target banner. If this stops
// being true the whole section is a re-skin.
console.log('== §227: proclaiming a crown adopts its constitution ==');
for (const c of CROWNS) {
  const era = eraOf(c.chapters[0]);
  const w = boot(era, c.from);
  const before = w.game.tags[c.from];
  before.heir = { name: 'The Heir', gov: 3, infl: 3, mar: 3, age: 22 };
  ok(switchTagCore(w.ctx, c.from, c.tag), c.tag + ': the banner may be taken up');
  const t = w.game.tags[c.tag];
  ok(!!t && t.govType === c.gov,
    c.tag + ': the realm\'s constitution is now ' + (t && t.govType));
  const def = DEFINES.GOV_TYPES[c.gov];
  if (def.elects) {
    ok(Number.isFinite(t.electionIn) && t.electionIn > 0,
      c.tag + ': it votes, so the clock is running (' + t.electionIn + ' months)');
  }
  if (def.heirless) {
    ok(!t.heir && !t.regency, c.tag + ': nothing inherits here, so the heir is gone');
  } else {
    ok(!!t.heir, c.tag + ': it inherits, so the heir it had is still standing');
  }
  ok(t.name === DEFINES.TAGS[c.tag].name && Array.isArray(t.lineage)
    && t.lineage.indexOf(c.from) >= 0,
    c.tag + ': wears its own name and remembers what it was');
  ok(w.game.tagAliases[c.from] === c.tag,
    c.tag + ': the chapter\'s cards forward to it (SPEC §135)');
}

// ------------------------------------------------------------------ the gate
console.log('== §227: the constitution is the first requirement of its own crown ==');
for (const c of CROWNS) {
  const era = eraOf(c.chapters[0]);
  const f = formableFor(c.tag);
  const w = boot(era, c.from);
  if (Number.isFinite(c.year)) w.game.date = { ...w.game.date, y: c.year };
  const t = w.game.tags[c.from];
  const row = f.requires[0];
  // On the constitution the chapter boots with, the gate is shut.
  ok(!row.check(w.ctx, c.from),
    c.tag + ': shut while the realm is a ' + t.govType);
  // Adopt it the way a fork does, and the gate opens.
  ok(w.ctx.helpers.setGovernment(w.ctx, c.from, c.gov), c.tag + ': the fork\'s helper adopts it');
  ok(row.check(w.ctx, c.from), c.tag + ': open once the realm IS a ' + c.gov);
  // …and every OTHER crown of the same chapter is shut by the same row.
  const rivals = CROWNS.filter((o) => o.tag !== c.tag && o.from === c.from
    && o.chapters.indexOf(c.chapters[0]) >= 0);
  const leaks = rivals.filter((o) => formableFor(o.tag).requires[0].check(w.ctx, c.from));
  ok(!leaks.length, c.tag + ': and it shuts the ' + rivals.length + ' rival crowns of its chapter ('
    + (leaks.map((o) => o.tag).join(', ') || 'all shut') + ')');
}

// ------------------------------------------------------- fork to crown, live
// The four settlements of 71 through the REAL cards. This is the join between
// §214 and §227: the card writes the constitution, the constitution opens one
// crown and no other.
console.log('== §227: the settlement of 71, fired live, opens exactly its own crown ==');
{
  const era = eraOf('66ce');
  const card = era.events.find((e) => e && e.id === 'ev_s_the_second_government');
  ok(!!card && card.options.length === 4, 'the second government still offers four settlements');
  const ROADS = [
    { i: 0, gov: 'sanhedrin', tag: 'SNH' },
    { i: 1, gov: 'lot', tag: 'GRL' },
    { i: 2, gov: 'jubilee', tag: 'YVL' },
    { i: 3, gov: 'noRuler', tag: 'HRZ' },
  ];
  for (const r of ROADS) {
    const w = boot(era, 'JUD');
    card.options[r.i].effects(w.ctx);
    const t = w.game.tags.JUD;
    ok(t.govType === r.gov, 'road ' + r.i + ': the realm becomes a ' + t.govType);
    ok(w.ctx.helpers.constitutionOf(w.ctx, '66ce'),
      'road ' + r.i + ': §130\'s store still records the settlement ('
      + w.ctx.helpers.constitutionOf(w.ctx, '66ce') + ')');
    const open = CROWNS.filter((c) => c.chapters.indexOf('66ce') >= 0
      && formableFor(c.tag).requires[0].check(w.ctx, 'JUD'));
    ok(open.length === 1 && open[0].tag === r.tag,
      'road ' + r.i + ': opens ' + r.tag + ' and nothing else ('
      + (open.map((c) => c.tag).join(', ') || 'none') + ')');
  }
}

// --------------------------------------------------------- ten different trees
console.log('== §227: ten crowns, ten chains, and no two of them the same ==');
{
  const STRANDS = { govt: 0, region: 1, court: 2 };
  const branchIds = new Map();
  for (const c of CROWNS) {
    const f = formableFor(c.tag);
    const list = f.missions;
    ok(Array.isArray(list) && list.length >= 12,
      c.tag + ': carries a chain of ' + (list || []).length + ' nodes');
    // Dressed and seated.
    const undressed = list.filter((m) => !(m && m.id && m.name && m.icon
      && typeof m.desc === 'string' && m.desc.length > 60 && m.rewardText
      && typeof m.check === 'function' && typeof m.reward === 'function'
      && Number.isFinite(m.col) && Number.isFinite(m.row)));
    ok(!undressed.length, c.tag + ': every node dressed and seated ('
      + (undressed.map((m) => m && m.id).join(', ') || list.length + ' clean') + ')');
    // One node per cell.
    const seats = new Set();
    const collide = [];
    for (const m of list) {
      const k = (m.col | 0) + ':' + (m.row | 0);
      if (seats.has(k)) collide.push(m.id + ' @ ' + k);
      seats.add(k);
    }
    ok(!collide.length, c.tag + ': seats every node in its own cell ('
      + (collide.join(', ') || 'no collisions') + ')');
    // No prerequisite dangles.
    const ids = new Set(list.map((m, i) => realm.missionId(m, i)));
    const dangling = [];
    for (const m of list) for (const r of (m.requires || [])) {
      if (!ids.has(String(r))) dangling.push(m.id + ' → ' + r);
    }
    ok(!dangling.length, c.tag + ': no node waits on one that does not exist ('
      + (dangling.join(', ') || 'all resolve') + ')');
    // Reachable: every node hangs off a root by requires.
    const reachable = new Set(list.filter((m) => !(m.requires || []).length).map((m) => m.id));
    for (let pass = 0; pass < list.length; pass++) {
      for (const m of list) {
        if (reachable.has(m.id)) continue;
        if ((m.requires || []).every((r) => reachable.has(String(r)))) reachable.add(m.id);
      }
    }
    const orphans = list.filter((m) => !reachable.has(m.id));
    ok(!orphans.length, c.tag + ': every node is reachable from a root ('
      + (orphans.map((m) => m.id).join(', ') || 'all reachable') + ')');
    // Nothing on a mission may claim a civil strand's column without saying so
    // — §211's grammar, which the spine deliberately does not use.
    const mislabelled = list.filter((m) => m.civil && STRANDS[m.civil] !== m.col);
    ok(!mislabelled.length, c.tag + ': no node mislabels a civil strand');
    branchIds.set(c.tag, new Set(list.filter((m) => m.col >= 2).map((m) => m.id)));
  }
  // "Different mission trees" has to mean something mechanically: the branches
  // share no node at all.
  const shared = [];
  for (let i = 0; i < CROWNS.length; i++) {
    for (let j = i + 1; j < CROWNS.length; j++) {
      const a = branchIds.get(CROWNS[i].tag);
      const b = branchIds.get(CROWNS[j].tag);
      for (const id of a) if (b.has(id)) shared.push(CROWNS[i].tag + '/' + CROWNS[j].tag + ': ' + id);
    }
  }
  ok(!shared.length, 'no two crowns share a branch node ('
    + (shared.join(', ') || 'ten distinct branches') + ')');
  const branchSizes = CROWNS.map((c) => branchIds.get(c.tag).size);
  ok(Math.min(...branchSizes) >= 8,
    'every branch is at least eight nodes deep (smallest ' + Math.min(...branchSizes) + ')');
}

// ------------------------------------------------------------ the reward keys
// A misspelled effect key seats a modifier the engine never reads: the tooltip
// promises +10% income, the reward runs without throwing, and nothing happens.
console.log('== §227: every reward seats keys the engine reads ==');
{
  const TAG_KEYS = new Set();
  const simDir = new URL('../../js/sim/', import.meta.url);
  for (const f of readdirSync(simDir)) {
    if (!f.endsWith('.js')) continue;
    const src = readFileSync(new URL(f, simDir), 'utf8');
    for (const m of src.matchAll(/resolveTag(?:Mult|Add)\(\s*ctx\s*,[^,]+,\s*'([a-zA-Z]+)'/g)) TAG_KEYS.add(m[1]);
    for (const m of src.matchAll(/effects\.([a-zA-Z]+)/g)) TAG_KEYS.add(m[1]);
  }
  ok(TAG_KEYS.size > 15, 'the engine\'s modifier vocabulary was read from the sim ('
    + TAG_KEYS.size + ' keys)');
  const PROV_ONLY = new Set(['taxMult', 'unrest']);
  for (const c of CROWNS) {
    const f = formableFor(c.tag);
    const dead = [];
    // The crown's own two permanent modifiers…
    for (const m of [f.bonus.modifier, f.bonus.modifier2]) {
      for (const k of Object.keys((m && m.effects) || {})) {
        if (!TAG_KEYS.has(k) || PROV_ONLY.has(k)) dead.push('bonus→' + k);
      }
    }
    // …and every mission reward, run for real against a live sim.
    const era = eraOf(c.chapters[0]);
    for (const m of f.missions) {
      const w = boot(era, c.from);
      switchTagCore(w.ctx, c.from, c.tag);
      w.game.playerTag = c.tag;
      const t = w.game.tags[c.tag];
      const before = new Set((t.modifiers || []).map((x) => x.id));
      try { m.reward(w.ctx); } catch (e) { dead.push(m.id + ' (reward threw: ' + e.message + ')'); continue; }
      for (const mod of (t.modifiers || [])) {
        if (before.has(mod.id)) continue;
        for (const k of Object.keys(mod.effects || {})) {
          if (!TAG_KEYS.has(k)) dead.push(m.id + '→' + k);
          else if (PROV_ONLY.has(k)) dead.push(m.id + '→' + k + ' (province-scope key on a tag)');
        }
      }
    }
    ok(!dead.length, c.tag + ': no reward seats a key the engine never reads ('
      + ([...new Set(dead)].join(', ') || 'clean') + ')');
  }
}

// ------------------------------------------------- no modifier lands on another
// `addTagModifier` replaces by id, so a crown that seats a modifier under an id
// some other package already uses does not stack with it — it REPLACES it, and
// a crown proclaimed after the 132 marriage would have quietly downgraded the
// very thing it was celebrating. Nothing throws; the number just gets smaller.
console.log('== §227: no crown\'s modifier lands on top of another package\'s ==');
{
  const src = readFileSync(new URL('../../js/data/formables.js', import.meta.url), 'utf8');
  const head = src.indexOf('// ---- the constitution takes a name of its own');
  const tail = src.indexOf('export const FORMABLES = [');
  ok(head > 0 && tail > head, 'the section\'s own block was located in the source');
  const mine = new Set([...src.slice(head, tail).matchAll(/id: '([a-zA-Z0-9_]+)', name: '/g)]
    .map((m) => m[1]));
  ok(mine.size > 90, 'the section seats ' + mine.size + ' named modifiers of its own');
  // The Kingdom of Israel's own pair is shared with the older MLI formables on
  // purpose — the same crown, the same two permanent modifiers.
  const SHARED = new Set(['crown_of_david', 'the_law_is_the_charter']);
  const dataDir = new URL('../../js/data/', import.meta.url);
  const clashes = [];
  for (const f of readdirSync(dataDir)) {
    if (!f.endsWith('.js')) continue;
    const other = readFileSync(new URL(f, dataDir), 'utf8');
    const body = f === 'formables.js' ? other.slice(0, head) + other.slice(tail) : other;
    for (const m of body.matchAll(/id: '([a-zA-Z0-9_]+)'/g)) {
      if (mine.has(m[1]) && !SHARED.has(m[1])) clashes.push(f + ':' + m[1]);
    }
  }
  ok(!clashes.length, 'no modifier id is already spoken for elsewhere ('
    + ([...new Set(clashes)].join(', ') || 'all clear') + ')');
}

// ------------------------------------------------------------------ the fixture
// Every dial the engine has, turned to its stop, re-asserted before every pass
// — the missions above pay out as they complete and some of them spend a
// treasury or shift a party, so a snapshot decays out from under the tree it
// is meant to be testing.
function remax(w, tag) {
  const g = w.game;
  const ctx = w.ctx;
  const t = g.tags[tag];
  g.wars = [];
  for (const k of Object.keys(g.tags)) if (g.tags[k]) g.tags[k].atWarWith = [];
  t.alive = true; t.overlord = null;
  t.treasury = 100000; t.stability = 3; t.legitimacy = 100; t.manpower = 500000;
  t.tech = { gov: 25, infl: 25, mar: 25 };
  t.reforms = { mil: 9, civ: 9, rel: 9 };
  t.points = { gov: 9999, infl: 9999, mar: 9999 };
  const inst = [...universalInstitutions(ctx), ...liveInstitutions(ctx)]
    .map((i) => i && i.id).filter(Boolean);
  t.embraced = [...new Set(inst)];
  // The court at its warmest. Ask the ENGINE which estates are in this tag's
  // room: a formed crown inherits the court of the tag it grew out of (§127)
  // and appears in no bookmark's `factions` at all.
  t.estateFavor = t.estateFavor || {}; t.factions = t.factions || {};
  let defs = [];
  try { defs = factionDefs(ctx, tag) || []; } catch (e) { defs = []; }
  if (!defs.length) defs = ((w.era.bookmark.factions || {})[tag] || []);
  for (const d of defs) {
    if (!d || !d.id) continue;
    t.estateFavor[d.id] = 100;
    t.factions[d.id] = 100;
  }
  t.advisors = {
    gov: { name: 'The Chancellor', skill: 6 },
    infl: { name: 'The Envoy', skill: 6 },
    mar: { name: 'The Marshal', skill: 6 },
  };
  t.messianic = 100;
  if (!t.heir) t.heir = { name: 'The Heir', gov: 4, infl: 4, mar: 4, age: 24 };
  // A head of state at the top of the courtier roll — the same dial the
  // advisors are set by, and the one the Lot's own vindication reads.
  t.ruler = { ...(t.ruler || { name: 'The Incumbent', title: 'Ruler', age: 40 }), gov: 6, infl: 6, mar: 6 };
  const others = Object.keys(g.tags).filter((k) => k !== tag && g.tags[k]);
  g.standing = { order: [tag, ...others], score: { [tag]: 9999 }, month: 0 };
  t.allies = ISOLATIONISTS.has(tag) ? [] : others.slice(0, 4);
  for (const k of others) g.tags[k].opinion = { ...(g.tags[k].opinion || {}), [tag]: 100 };
  t.opinion = t.opinion || {};
  for (const k of others.slice(0, 6)) t.opinion[k] = 100;
  for (const k of others.slice(0, 3)) g.tags[k].overlord = tag; // clients
}
function maximalGround(w, tag) {
  const g = w.game;
  const ctx = w.ctx;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    p.owner = tag; p.controller = tag;
    const faith = (g.tags[tag] || {}).religion;
    if (faith) p.religion = faith;
    p.dev = { tax: 12, prod: 12, mp: 12 };
    p.buildings = ['market', 'walls', 'temple', 'granary', 'shipyard'];
    if (!p.dia || typeof p.dia !== 'object') p.dia = {};
    if (!p.dia.by || typeof p.dia.by !== 'object') p.dia.by = {};
    p.dia.by[tag] = { standing: 100, asked: 0 };
  }
  const jer = g.provinces.find((p) => p && p.canon === 'Jerusalem');
  if (jer) jer.wonder = 'temple';
  try {
    ctx.helpers.spawnArmy(ctx, tag, (jer && jer.name) || g.provinces[1].name, { inf: 60, name: 'The Host' });
  } catch (e) { /* geometry-free boot */ }
}
// Proclaim the crown the way a campaign does: the chapter's own side answers
// its fork and then takes the name.
function proclaim(chapterId, c) {
  const era = eraOf(chapterId);
  const w = boot(era, c.from);
  w.game.wars = [];
  for (const k of Object.keys(w.game.tags)) if (w.game.tags[k]) w.game.tags[k].atWarWith = [];
  if (Number.isFinite(c.year)) w.game.date = { ...w.game.date, y: c.year };
  w.ctx.helpers.setGovernment(w.ctx, c.from, c.gov);
  switchTagCore(w.ctx, c.from, c.tag);
  w.game.playerTag = c.tag;
  const t = w.game.tags[c.tag];
  t.missionIdx = 0; t.missionsDone = []; t.missionRest = 0;
  return w;
}

// ------------------------------------------------------------------ no free lunch
console.log('== §227: nothing on a crown is free on the day it is proclaimed ==');
for (const c of CROWNS) {
  for (const id of c.chapters) {
    const w = proclaim(id, c);
    for (let i = 0; i < 24; i++) realm.checkMissions(w.ctx);
    const done = doneIds(w.game.tags[c.tag]);
    const free = formableFor(c.tag).missions.filter((m) => done.has(m.id));
    ok(!free.length, id + '/' + c.tag + ': nothing completes at the proclamation ('
      + (free.map((m) => m.id).join(', ') || 'none') + ')');
  }
}

// ---------------------------------------------------------------------- pay
console.log('== §227: every node of every crown pays in a maximal realm ==');
for (const c of CROWNS) {
  for (const id of c.chapters) {
    const w = proclaim(id, c);
    maximalGround(w, c.tag);
    // §207 paces one completion a month, so a whole tree needs the room.
    for (let i = 0; i < 400; i++) { remax(w, c.tag); realm.checkMissions(w.ctx); }
    const done = doneIds(w.game.tags[c.tag]);
    const list = formableFor(c.tag).missions;
    const unpaid = list.filter((m) => !done.has(m.id));
    ok(!unpaid.length, id + '/' + c.tag + ': every objective paid ('
      + (unpaid.length ? 'DEAD CONTENT: ' + unpaid.map((m) => m.id).join(', ')
        : list.length + ' paid') + ')');
  }
}

// -------------------------------------------------------- the panel reads it
// The realm panel and the monthly pass both go through missionsFor, and a
// crown whose chain is filed only in FORMABLES is exactly the case §215 had to
// repair once already. Ask the engine, not the file.
console.log('== §227: the panel finds the crown\'s own chain, not the chapter\'s ==');
for (const c of CROWNS) {
  const w = proclaim(c.chapters[0], c);
  const list = realm.missionsFor(w.ctx, c.tag);
  ok(Array.isArray(list) && list.length === formableFor(c.tag).missions.length,
    c.tag + ': missionsFor returns its own ' + (list || []).length + ' nodes');
  const chapter = (w.era.bookmark.missions || {})[c.from] || [];
  ok(!chapter.length || list[0].id !== chapter[0].id,
    c.tag + ': and not the chapter\'s tree it has outgrown');
  ok(realm.isMissionTree(list), c.tag + ': reads as a tree rather than a ladder');
}

// ------------------------------------------------------------- the road onward
console.log('== §227: the greater crown stays reachable, and ends the constitution ==');
for (const c of CROWNS) {
  const mli = FORMABLES.find((f) => f && f.from === c.tag && f.to === 'MLI');
  ok(!!mli, c.tag + ': keeps a road to the Kingdom of Israel');
  ok(!!mli && JSON.stringify(mli.bookmarks) === JSON.stringify(c.chapters),
    c.tag + ': in the same chapters the crown itself is offered in');
  ok(!!mli && Array.isArray(mli.missions) && mli.missions.length >= 18,
    c.tag + ': and inherits Israel\'s own tree (' + ((mli && mli.missions) || []).length + ' nodes)');
  // Proclaiming it ends the constitution — MLI's government is a monarchy, and
  // switchTagCore applies the NEW banner's.
  const w = proclaim(c.chapters[0], c);
  ok(switchTagCore(w.ctx, c.tag, 'MLI'), c.tag + ': the kingdom may be proclaimed over it');
  ok(w.game.tags.MLI.govType === 'monarchy',
    c.tag + ': and the commonwealth ends with it (' + w.game.tags.MLI.govType + ')');
  ok(w.game.tagAliases[c.tag] === 'MLI' && w.game.tagAliases[c.from] === 'MLI',
    c.tag + ': the forwarding chain collapses rather than walking');
}

// ------------------------------------------------- §214 and §22 pass unmoved
console.log('== §227: the fork, the store and the older crowns are untouched ==');
{
  ok(Object.keys(DEFINES.GOV_TYPES).length === 15,
    'the constitution table is still fifteen governments — §214\'s fourteen and §217\'s Company');
  for (const g of ['monarchy', 'republic', 'theocracy', 'tribal']) {
    ok(!!DEFINES.GOV_TYPES[g], 'the starting constitution ' + g + ' is where it was');
  }
  const olds = ['form_has_hyr', 'form_has_ari', 'form_has_atg', 'form_jud_her',
    'form_jud_agr', 'form_mli_jud', 'form_mli_has', 'form_uar_egy', 'form_uar_jor',
    'form_rom_byz'];
  const missing = olds.filter((id) => !FORMABLES.some((f) => f && f.id === id));
  ok(!missing.length, 'every crown that shipped before this section is still here ('
    + (missing.join(', ') || olds.length + ' intact') + ')');
  // No bookmark boots one of the new banners: they are formable crowns, and a
  // chapter that seated one would be a chapter with two Judaeas in it.
  const booted = [];
  for (const e of ERAS) {
    const active = new Set(e.bookmark.activeTags || []);
    for (const c of CROWNS) if (active.has(c.tag)) booted.push(e.bookmark.id + '/' + c.tag);
  }
  ok(!booted.length, 'no chapter boots a constitutional crown ('
    + (booted.join(', ') || 'all ten are formable only') + ')');
}

console.log(failures ? `smoke152: ${failures} FAIL` : 'smoke152: ALL PASS');
process.exit(failures ? 1 : 0);
