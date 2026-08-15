// Headless regression — SPEC §250: the crown is the form of government.
//
// §227 gave every Jewish constitution a banner of its own — ten crowns, ten
// colours, ten trees — and it was too many and named wrong. The Commonwealth
// of the Lot and the Two Houses are the mechanism of a decision, not the thing
// a chancery writes on an envelope, and ten banners over one city is a table
// nobody can hold in their head.
//
// §250 cuts them to five, names each for the FORM of government, and puts an
// empire above the lot. The contracts:
//
//   THE TABLE — five crowns on two axes (crowned or not, priestly or not),
//   every adoptable Jewish constitution reaching exactly one of them, each
//   crown fully outfitted (a tag def, an emblem, an AI temper, a payoff, a
//   chain), no two sharing three letters, a name, a colour or an emblem, and
//   none of §227's ten surviving anywhere in the data.
//
//   THE PLUMBING, INVERTED — this is the load-bearing claim. §227's crowns
//   each declared a constitution in GOV_OF, so proclaiming one ADOPTED it.
//   These declare none: the government decides what the crown is called, and
//   taking the name changes nothing about how the state is governed — the
//   election clock keeps running, the heirless stay heirless, and two realms
//   under one banner remain two different constitutions.
//
//   THE GATE — the first requirement of every crown is the form of government,
//   read off govType as a SET. A realm that answered the fork the other way
//   sees the rival crowns of its own chapter unticked.
//
//   FORK TO CROWN, LIVE — the four settlements of 71 fired through the real
//   event cards: two of them land on the priestly republic and two on the
//   republic, and each opens exactly one crown.
//
//   FIVE DIFFERENT TREES — every crown carries a chain; every node is dressed,
//   seated and reachable; no node waits on one that does not exist; and the
//   five branches share no node with each other.
//
//   PAY — every node of every crown AND of both empires completes in a maximal
//   realm. A node that cannot pay there is dead content.
//
//   THE ROAD ONWARD — the greater crown is not closed off by naming the lesser
//   one: every crown of government keeps a Kingdom of Israel formable, and
//   proclaiming it DOES end the constitution, because MLI declares a monarchy
//   in GOV_OF and these five declare nothing.
//
//   THE EMPIRE — the crown above the crown, reached by the map: the heartland,
//   the land bridge from the River of Egypt to the desert road, four of the
//   seats of the world annexed, fifty-five provinces and a first-three
//   standing. Shut on a realm that holds only its own country, open on one
//   that holds the world; Israel's own empire restyles its head of state and
//   the Judaean one deliberately does not.
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
//
// One row per ROAD — a form of government may be reached out of more than one
// court, and the priestly republic is, which is the whole reason the crowns
// are fewer than the constitutions.
const ROADS = [
  { id: 'form_prj_jud', tag: 'PRJ', from: 'JUD', govs: ['sanhedrin', 'lot'], chapters: ['66ce'] },
  // The diadem is offered between 128 and 95 BCE, and the 167 court is not the
  // same court on day one: the Hasideans are gone by 140 and the Pharisees and
  // Sadducees take their chairs (SPEC §127). A crown taken at the chapter's
  // opening month would be judged against a room that does not exist when the
  // fork actually fires, so the two Hasmonean roads run on the fork's clock.
  { id: 'form_prj_has', tag: 'PRJ', from: 'HAS', govs: ['gerousia'], chapters: ['167bce'], year: -100 },
  { id: 'form_rpj_jud', tag: 'RPJ', from: 'JUD', govs: ['jubilee', 'noRuler'], chapters: ['66ce'] },
  { id: 'form_epj_jud', tag: 'EPJ', from: 'JUD', govs: ['nasi', 'dyarchy'], chapters: ['132ce'] },
  { id: 'form_kgj_jud', tag: 'KGJ', from: 'JUD', govs: ['diadem', 'davidic'], chapters: ['132ce', '614ce'] },
  { id: 'form_pkj_has', tag: 'PKJ', from: 'HAS', govs: ['priestKing'], chapters: ['167bce'], year: -100 },
];
const CROWNS = ['PRJ', 'RPJ', 'EPJ', 'KGJ', 'PKJ'];
// The ten banners this section retires. Nothing may answer to them anywhere.
const RETIRED = ['SNH', 'GRL', 'YVL', 'HRZ', 'KHN', 'GRS', 'KTR', 'BTD', 'SHB', 'NSI'];
// The empires, and every crown that can reach one.
const EMPIRES = [
  { id: 'form_iem_mli', tag: 'IEM', from: 'MLI', chapter: '132ce', styles: true },
  { id: 'form_jem_jud', tag: 'JEM', from: 'JUD', chapter: '132ce', styles: false },
  { id: 'form_jem_prj', tag: 'JEM', from: 'PRJ', chapter: '66ce', styles: false },
];
// The republic is constituted on the refusal of ties, so "every dial at its
// stop" means something different for it: a maximal Republic of Judaea has no
// allies by construction, and a fixture that forced allies on would report the
// form of government's own dividend as dead content.
const ISOLATIONISTS = new Set(['RPJ']);

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
const roadOf = (id) => FORMABLES.find((f) => f && f.id === id);
const doneIds = (t) => new Set(t.missionsDone || []);

// ------------------------------------------------------------------ the table
console.log('== §250: five forms of government, five crowns, fully outfitted ==');
{
  // Every non-starting Jewish constitution reaches exactly one crown, and no
  // crown names a government that does not exist. The four a bookmark boots
  // with keep no banner of their own — a realm does not "become" a monarchy.
  const STARTING = new Set(['monarchy', 'republic', 'theocracy', 'tribal']);
  const adopted = Object.keys(DEFINES.GOV_TYPES).filter((k) => !STARTING.has(k) && k !== 'company');
  const reached = new Map();
  for (const r of ROADS) for (const g of r.govs) reached.set(g, (reached.get(g) || []).concat(r.tag));
  const uncrowned = adopted.filter((g) => !reached.has(g));
  ok(!uncrowned.length, 'every one of the ' + adopted.length + ' adoptable constitutions reaches a crown ('
    + (uncrowned.join(', ') || 'all covered') + ')');
  const doubled = [...reached.entries()].filter(([, tags]) => new Set(tags).size > 1);
  ok(!doubled.length, 'and no constitution reaches two ('
    + (doubled.map(([g, t]) => g + '→' + t.join('/')).join(', ') || 'each has one form') + ')');
  ok(CROWNS.length === 5 && adopted.length === 10,
    'ten constitutions, five crowns — the trim this section is (' + adopted.length + '→' + CROWNS.length + ')');
  const invented = [...reached.keys()].filter((g) => !DEFINES.GOV_TYPES[g]);
  ok(!invented.length, 'no crown gates on a constitution the table does not have ('
    + (invented.join(', ') || 'all real') + ')');

  for (const tag of CROWNS) {
    const def = DEFINES.TAGS[tag];
    const f = formableFor(tag);
    ok(!!def && def.religion === 'judaism' && def.capital === 'Jerusalem',
      tag + ': a Jewish court seated at Jerusalem');
    ok(!!def && typeof def.name === 'string' && def.name.length > 4
      && Array.isArray(def.color) && def.color.length === 3
      && typeof def.description === 'string' && def.description.length > 40
      && def.ideas && Object.keys(def.ideas).length >= 2,
      tag + ': named, coloured, described and given ideas of its own');
    // The name is the form of government and says so in plain words.
    ok(/^(Priestly )?(Republic|Kingdom|Ethnarchy) of Judaea$/.test((def || {}).name || ''),
      tag + ': is called what it IS — "' + ((def || {}).name || '?') + '"');
    ok(typeof FLAGS[tag] === 'string' && FLAGS[tag].length > 100, tag + ': flies real emblem art');
    ok(!!DEFINES.PERSONALITIES[tag], tag + ': has an AI temper');
    ok(!!f && !f.ai, tag + ': is player-only — no AI court re-brands mid-chapter');
    const b = (f && f.bonus) || {};
    ok(Number.isFinite(b.legitimacy) && !!b.grant && !!b.modifier && !!b.modifier2,
      tag + ': the crown pays — legitimacy, a grant and two permanent modifiers');
  }
  for (const r of ROADS) {
    const f = roadOf(r.id);
    ok(!!f && f.from === r.from && f.to === r.tag, r.id + ': runs ' + r.from + ' → ' + r.tag);
    ok(!!f && JSON.stringify(f.bookmarks) === JSON.stringify(r.chapters),
      r.id + ': offered in ' + r.chapters.join(', '));
  }

  // Nothing blurs: three letters, a name, a colour, an emblem.
  const seen = { tag: new Set(), name: new Set(), color: new Set(), art: new Set() };
  const dupes = [];
  for (const tag of CROWNS) {
    const def = DEFINES.TAGS[tag] || {};
    for (const [k, v] of [['tag', tag], ['name', def.name],
      ['color', (def.color || []).join(',')], ['art', FLAGS[tag]]]) {
      if (seen[k].has(v)) dupes.push(tag + ' repeats a ' + k);
      seen[k].add(v);
    }
  }
  ok(!dupes.length, 'no two crowns share three letters, a name, a colour or an emblem ('
    + (dupes.join('; ') || 'all five distinct') + ')');
  const borrowed = CROWNS.filter((t) => FLAGS[t] === FLAGS.JUD || FLAGS[t] === FLAGS.MLI);
  ok(!borrowed.length, 'no crown borrows Judaea\'s menorah or Israel\'s hexagram');

  // And the ten are gone — from the catalog, the emblems, the tempers, the
  // constitution table and the formables alike. A banner half-retired is a
  // banner a save can still be holding.
  const ghosts = [];
  for (const t of RETIRED) {
    if (DEFINES.TAGS[t]) ghosts.push(t + '/TAGS');
    if (DEFINES.GOV_OF[t]) ghosts.push(t + '/GOV_OF');
    if (DEFINES.PERSONALITIES[t]) ghosts.push(t + '/PERSONALITIES');
    if (FLAGS[t]) ghosts.push(t + '/FLAGS');
    if (FORMABLES.some((f) => f && (f.to === t || f.from === t))) ghosts.push(t + '/FORMABLES');
  }
  ok(!ghosts.length, 'none of §227\'s ten survives anywhere ('
    + (ghosts.join(', ') || 'all ten retired') + ')');
}

// -------------------------------------------------------------- the plumbing
// The load-bearing claim, and it is the OPPOSITE of §227's: proclaiming the
// crown does not touch the constitution, because these banners declare none.
console.log('== §250: proclaiming a crown does not change how the state is governed ==');
for (const r of ROADS) {
  ok(!DEFINES.GOV_OF[r.tag],
    r.tag + ': declares no government of its own (' + (DEFINES.GOV_OF[r.tag] || 'silent') + ')');
  for (const gov of r.govs) {
    const era = eraOf(r.chapters[0]);
    const w = boot(era, r.from);
    if (Number.isFinite(r.year)) w.game.date = { ...w.game.date, y: r.year };
    w.ctx.helpers.setGovernment(w.ctx, r.from, gov);
    const before = w.game.tags[r.from];
    const def = DEFINES.GOV_TYPES[gov];
    // Seat an heir only where the constitution has one to seat: the fixture
    // may not hand a state the thing its own form of government abolished.
    if (!def.heirless) before.heir = { name: 'The Heir', gov: 3, infl: 3, mar: 3, age: 22 };
    const clock = before.electionIn;
    ok(switchTagCore(w.ctx, r.from, r.tag), r.tag + '/' + gov + ': the banner may be taken up');
    const t = w.game.tags[r.tag];
    ok(!!t && t.govType === gov,
      r.tag + '/' + gov + ': the realm is still a ' + (t && t.govType) + ' afterwards');
    if (def.elects) {
      ok(t.electionIn === clock, r.tag + '/' + gov + ': and the election clock was not reset');
    }
    if (def.heirless) {
      ok(!t.heir, r.tag + '/' + gov + ': nothing inherits here, and the crown did not invent an heir');
    } else {
      ok(!!t.heir, r.tag + '/' + gov + ': it inherits, so the heir it had is still standing');
    }
    ok(t.name === DEFINES.TAGS[r.tag].name && Array.isArray(t.lineage)
      && t.lineage.indexOf(r.from) >= 0,
      r.tag + '/' + gov + ': wears its own name and remembers what it was');
    ok(w.game.tagAliases[r.from] === r.tag,
      r.tag + '/' + gov + ': the chapter\'s cards forward to it (SPEC §135)');
  }
}
{
  // Two realms, one banner, two constitutions — which is the sentence the
  // whole inversion exists to make true.
  const era = eraOf('66ce');
  const a = boot(era, 'JUD');
  const b = boot(era, 'JUD');
  a.ctx.helpers.setGovernment(a.ctx, 'JUD', 'sanhedrin');
  b.ctx.helpers.setGovernment(b.ctx, 'JUD', 'lot');
  switchTagCore(a.ctx, 'JUD', 'PRJ');
  switchTagCore(b.ctx, 'JUD', 'PRJ');
  ok(a.game.tags.PRJ.govType === 'sanhedrin' && b.game.tags.PRJ.govType === 'lot',
    'two priestly republics under one banner stay two different states ('
    + a.game.tags.PRJ.govType + ' / ' + b.game.tags.PRJ.govType + ')');
}

// ------------------------------------------------------------------ the gate
console.log('== §250: the form of government is the first requirement of its own crown ==');
for (const r of ROADS) {
  const era = eraOf(r.chapters[0]);
  const f = roadOf(r.id);
  const w = boot(era, r.from);
  if (Number.isFinite(r.year)) w.game.date = { ...w.game.date, y: r.year };
  const t = w.game.tags[r.from];
  const row = f.requires[0];
  ok(!row.check(w.ctx, r.from), r.tag + ': shut while the realm is a ' + t.govType);
  for (const gov of r.govs) {
    ok(w.ctx.helpers.setGovernment(w.ctx, r.from, gov), r.tag + '/' + gov + ': the fork\'s helper adopts it');
    ok(row.check(w.ctx, r.from), r.tag + ': open once the realm IS a ' + gov);
    // …and every OTHER crown of the same chapter is shut by the same row.
    const rivals = ROADS.filter((o) => o.tag !== r.tag && o.from === r.from
      && o.chapters.indexOf(r.chapters[0]) >= 0);
    const leaks = rivals.filter((o) => roadOf(o.id).requires[0].check(w.ctx, r.from));
    ok(!leaks.length, r.tag + '/' + gov + ': and it shuts the ' + rivals.length
      + ' rival crowns of its chapter (' + (leaks.map((o) => o.tag).join(', ') || 'all shut') + ')');
  }
}

// ------------------------------------------------------- fork to crown, live
// The four settlements of 71 through the REAL cards. This is the join between
// §214 and §250: the card writes the constitution, the constitution opens one
// crown and no other — and two roads now share a crown, because two roads are
// two versions of the same form of government.
console.log('== §250: the settlement of 71, fired live, opens exactly one crown ==');
{
  const era = eraOf('66ce');
  const card = era.events.find((e) => e && e.id === 'ev_s_the_second_government');
  ok(!!card && card.options.length === 4, 'the second government still offers four settlements');
  const SETTLEMENTS = [
    { i: 0, gov: 'sanhedrin', tag: 'PRJ' },
    { i: 1, gov: 'lot', tag: 'PRJ' },
    { i: 2, gov: 'jubilee', tag: 'RPJ' },
    { i: 3, gov: 'noRuler', tag: 'RPJ' },
  ];
  for (const s of SETTLEMENTS) {
    const w = boot(era, 'JUD');
    card.options[s.i].effects(w.ctx);
    const t = w.game.tags.JUD;
    ok(t.govType === s.gov, 'road ' + s.i + ': the realm becomes a ' + t.govType);
    ok(w.ctx.helpers.constitutionOf(w.ctx, '66ce'),
      'road ' + s.i + ': §130\'s store still records the settlement ('
      + w.ctx.helpers.constitutionOf(w.ctx, '66ce') + ')');
    const open = ROADS.filter((o) => o.chapters.indexOf('66ce') >= 0
      && roadOf(o.id).requires[0].check(w.ctx, 'JUD'));
    ok(open.length === 1 && open[0].tag === s.tag,
      'road ' + s.i + ': opens ' + s.tag + ' and nothing else ('
      + (open.map((o) => o.tag).join(', ') || 'none') + ')');
  }
}

// ------------------------------------------------------- five different trees
console.log('== §250: five crowns, five chains, and no two of them the same ==');
{
  const STRANDS = { govt: 0, region: 1, court: 2 };
  const branchIds = new Map();
  const trees = CROWNS.concat(['JEM', 'IEM']);
  for (const tag of trees) {
    const list = formableFor(tag).missions;
    ok(Array.isArray(list) && list.length >= 7,
      tag + ': carries a chain of ' + (list || []).length + ' nodes');
    const undressed = list.filter((m) => !(m && m.id && m.name && m.icon
      && typeof m.desc === 'string' && m.desc.length > 60 && m.rewardText
      && typeof m.check === 'function' && typeof m.reward === 'function'
      && Number.isFinite(m.col) && Number.isFinite(m.row)));
    ok(!undressed.length, tag + ': every node dressed and seated ('
      + (undressed.map((m) => m && m.id).join(', ') || list.length + ' clean') + ')');
    const seats = new Set();
    const collide = [];
    for (const m of list) {
      const k = (m.col | 0) + ':' + (m.row | 0);
      if (seats.has(k)) collide.push(m.id + ' @ ' + k);
      seats.add(k);
    }
    ok(!collide.length, tag + ': seats every node in its own cell ('
      + (collide.join(', ') || 'no collisions') + ')');
    const ids = new Set(list.map((m, i) => realm.missionId(m, i)));
    const dangling = [];
    for (const m of list) for (const q of (m.requires || [])) {
      if (!ids.has(String(q))) dangling.push(m.id + ' → ' + q);
    }
    ok(!dangling.length, tag + ': no node waits on one that does not exist ('
      + (dangling.join(', ') || 'all resolve') + ')');
    const reachable = new Set(list.filter((m) => !(m.requires || []).length).map((m) => m.id));
    for (let pass = 0; pass < list.length; pass++) {
      for (const m of list) {
        if (reachable.has(m.id)) continue;
        if ((m.requires || []).every((q) => reachable.has(String(q)))) reachable.add(m.id);
      }
    }
    const orphans = list.filter((m) => !reachable.has(m.id));
    ok(!orphans.length, tag + ': every node is reachable from a root ('
      + (orphans.map((m) => m.id).join(', ') || 'all reachable') + ')');
    const mislabelled = list.filter((m) => m.civil && STRANDS[m.civil] !== m.col);
    ok(!mislabelled.length, tag + ': no node mislabels a civil strand');
    if (CROWNS.indexOf(tag) >= 0) branchIds.set(tag, new Set(list.filter((m) => m.col >= 2).map((m) => m.id)));
  }
  const shared = [];
  for (let i = 0; i < CROWNS.length; i++) {
    for (let j = i + 1; j < CROWNS.length; j++) {
      const a = branchIds.get(CROWNS[i]);
      const b = branchIds.get(CROWNS[j]);
      for (const id of a) if (b.has(id)) shared.push(CROWNS[i] + '/' + CROWNS[j] + ': ' + id);
    }
  }
  ok(!shared.length, 'no two crowns share a branch node ('
    + (shared.join(', ') || 'five distinct branches') + ')');
  const branchSizes = CROWNS.map((t) => branchIds.get(t).size);
  ok(Math.min(...branchSizes) >= 6,
    'every branch is at least six nodes deep (smallest ' + Math.min(...branchSizes) + ')');
  // The two empires read ONE tree under two names, on purpose: what a hegemon
  // has to do is the same act whoever is styled at the top of it.
  const jem = formableFor('JEM').missions;
  const iem = formableFor('IEM').missions;
  ok(jem.length === iem.length && jem[0].id !== iem[0].id,
    'the empires read the same seven rungs under their own two names');
}

// ------------------------------------------------------------ the reward keys
// A misspelled effect key seats a modifier the engine never reads: the tooltip
// promises +10% income, the reward runs without throwing, and nothing happens.
console.log('== §250: every reward seats keys the engine reads ==');
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
  const SUBJECTS = ROADS.map((r) => ({ tag: r.tag, from: r.from, chapter: r.chapters[0], gov: r.govs[0], year: r.year }))
    .concat(EMPIRES.map((e) => ({ tag: e.tag, from: e.from, chapter: e.chapter })));
  for (const s of SUBJECTS) {
    const f = formableFor(s.tag);
    const dead = [];
    for (const m of [f.bonus.modifier, f.bonus.modifier2]) {
      for (const k of Object.keys((m && m.effects) || {})) {
        if (!TAG_KEYS.has(k) || PROV_ONLY.has(k)) dead.push('bonus→' + k);
      }
    }
    const era = eraOf(s.chapter);
    for (const m of f.missions) {
      const w = boot(era, s.from === 'MLI' || s.from === 'PRJ' ? 'JUD' : s.from);
      const from = s.from === 'MLI' || s.from === 'PRJ' ? 'JUD' : s.from;
      switchTagCore(w.ctx, from, s.tag);
      w.game.playerTag = s.tag;
      const t = w.game.tags[s.tag];
      const before = new Set((t.modifiers || []).map((x) => x.id));
      try { m.reward(w.ctx); } catch (e) { dead.push(m.id + ' (reward threw: ' + e.message + ')'); continue; }
      for (const mo of (t.modifiers || [])) {
        if (before.has(mo.id)) continue;
        for (const k of Object.keys(mo.effects || {})) {
          if (!TAG_KEYS.has(k)) dead.push(m.id + '→' + k);
          else if (PROV_ONLY.has(k)) dead.push(m.id + '→' + k + ' (province-scope key on a tag)');
        }
      }
    }
    ok(!dead.length, s.tag + ': no reward seats a key the engine never reads ('
      + ([...new Set(dead)].join(', ') || 'clean') + ')');
  }
}

// ------------------------------------------------- no modifier lands on another
// `addTagModifier` replaces by id, so a crown that seats a modifier under an id
// some other package already uses does not stack with it — it REPLACES it.
// Nothing throws; the number just gets smaller.
console.log('== §250: no crown\'s modifier lands on top of another package\'s ==');
{
  const src = readFileSync(new URL('../../js/data/formables.js', import.meta.url), 'utf8');
  const head = src.indexOf('// ---- the crown is the form of government');
  const tail = src.indexOf('export const FORMABLES = [');
  ok(head > 0 && tail > head, 'the section\'s own block was located in the source');
  const mine = new Set([...src.slice(head, tail).matchAll(/id: '([a-zA-Z0-9_]+)', name: '/g)]
    .map((m) => m[1]));
  ok(mine.size >= 40, 'the section seats ' + mine.size + ' named modifiers of its own');
  // The Kingdom of Israel's own pair is shared with the older MLI formables on
  // purpose — the same crown, the same two permanent modifiers — and so is the
  // empire's, which is one crown wearing two names.
  const SHARED = new Set(['crown_of_david', 'the_law_is_the_charter',
    'from_the_river_to_the_river', 'the_seats_of_the_world']);
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
  // A maximal realm of a constitution that inherits nothing has NO heir, the
  // same way a maximal Republic of Judaea has no allies: the fixture may not
  // hand a state the one thing its own form of government abolished.
  const heirless = ((DEFINES.GOV_TYPES[t.govType] || {}).heirless) === true;
  if (heirless) { t.heir = null; t.regency = false; }
  else if (!t.heir) t.heir = { name: 'The Heir', gov: 4, infl: 4, mar: 4, age: 24 };
  t.ruler = { ...(t.ruler || { name: 'The Incumbent', title: 'Ruler', age: 40 }), gov: 6, infl: 6, mar: 6 };
  const others = Object.keys(g.tags).filter((k) => k !== tag && g.tags[k]);
  g.standing = { order: [tag, ...others], score: { [tag]: 9999 }, month: 0 };
  t.allies = ISOLATIONISTS.has(tag) ? [] : others.slice(0, 4);
  for (const k of others) g.tags[k].opinion = { ...(g.tags[k].opinion || {}), [tag]: 100 };
  t.opinion = t.opinion || {};
  for (const k of others.slice(0, 6)) t.opinion[k] = 100;
  for (const k of others.slice(0, 3)) { g.tags[k].alive = true; g.tags[k].overlord = tag; }
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
    // An empire garrisons where a kingdom marches, and its tree says so —
    // the host has to be an empire's host or that rung reads as dead content.
    ctx.helpers.spawnArmy(ctx, tag, (jer && jer.name) || g.provinces[1].name, { inf: 120, name: 'The Host' });
  } catch (e) { /* geometry-free boot */ }
}
// Proclaim the crown the way a campaign does: the chapter's own side answers
// its fork and then takes the name. An empire is proclaimed over whatever
// crown it grew out of, which for PRJ means two switches.
function proclaim(chapterId, s) {
  const era = eraOf(chapterId);
  const start = s.from === 'MLI' || s.from === 'PRJ' ? 'JUD' : s.from;
  const w = boot(era, start);
  w.game.wars = [];
  for (const k of Object.keys(w.game.tags)) if (w.game.tags[k]) w.game.tags[k].atWarWith = [];
  if (Number.isFinite(s.year)) w.game.date = { ...w.game.date, y: s.year };
  if (s.gov) w.ctx.helpers.setGovernment(w.ctx, start, s.gov);
  if (s.from !== start) switchTagCore(w.ctx, start, s.from);
  switchTagCore(w.ctx, s.from, s.tag);
  w.game.playerTag = s.tag;
  const t = w.game.tags[s.tag];
  t.missionIdx = 0; t.missionsDone = []; t.missionRest = 0;
  return w;
}
const SUBJECTS = ROADS.flatMap((r) => r.chapters.map((c) => ({
  tag: r.tag, from: r.from, chapter: c, gov: r.govs[0], year: r.year,
}))).concat(EMPIRES.map((e) => ({ tag: e.tag, from: e.from, chapter: e.chapter })));

// ------------------------------------------------------------------ no free lunch
console.log('== §250: nothing on a crown is free on the day it is proclaimed ==');
for (const s of SUBJECTS) {
  const w = proclaim(s.chapter, s);
  for (let i = 0; i < 24; i++) realm.checkMissions(w.ctx);
  const done = doneIds(w.game.tags[s.tag]);
  const free = formableFor(s.tag).missions.filter((m) => done.has(m.id));
  ok(!free.length, s.chapter + '/' + s.tag + ': nothing completes at the proclamation ('
    + (free.map((m) => m.id).join(', ') || 'none') + ')');
}

// ---------------------------------------------------------------------- pay
console.log('== §250: every node of every crown pays in a maximal realm ==');
for (const s of SUBJECTS) {
  const w = proclaim(s.chapter, s);
  maximalGround(w, s.tag);
  // §207 paces one completion a month, so a whole tree needs the room — and
  // since §229 a seated chain is CLAIMED rather than banked, so the room has
  // to be pumped with a hand on the panel: one claim a month, which is
  // exactly the drum's own pace.
  for (let i = 0; i < 400; i++) {
    remax(w, s.tag);
    realm.checkMissions(w.ctx);
    const t = w.game.tags[w.game.playerTag];
    for (const rid of ((t && t.missionReady) || []).slice()) {
      if (realm.claimMission(w.ctx, rid).ok) break;
    }
  }
  const done = doneIds(w.game.tags[s.tag]);
  const list = formableFor(s.tag).missions;
  const unpaid = list.filter((m) => !done.has(m.id));
  ok(!unpaid.length, s.chapter + '/' + s.tag + ': every objective paid ('
    + (unpaid.length ? 'DEAD CONTENT: ' + unpaid.map((m) => m.id).join(', ')
      : list.length + ' paid') + ')');
}

// -------------------------------------------------------- the panel reads it
console.log('== §250: the panel finds the crown\'s own chain, not the chapter\'s ==');
for (const s of SUBJECTS) {
  const w = proclaim(s.chapter, s);
  const list = realm.missionsFor(w.ctx, s.tag);
  ok(Array.isArray(list) && list.length === formableFor(s.tag).missions.length,
    s.chapter + '/' + s.tag + ': missionsFor returns its own ' + (list || []).length + ' nodes');
  ok(realm.isMissionTree(list), s.tag + ': reads as a tree rather than a ladder');
}

// ------------------------------------------------------------- the road onward
console.log('== §250: the greater crown stays reachable, and ends the constitution ==');
for (const r of ROADS) {
  const mli = FORMABLES.find((f) => f && f.from === r.tag && f.to === 'MLI');
  ok(!!mli, r.tag + ': keeps a road to the Kingdom of Israel');
  ok(!!mli && Array.isArray(mli.missions) && mli.missions.length >= 18,
    r.tag + ': and inherits Israel\'s own tree (' + ((mli && mli.missions) || []).length + ' nodes)');
  for (const c of r.chapters) {
    ok(!!mli && mli.bookmarks.indexOf(c) >= 0, r.tag + ': offered in ' + c + ', where the crown is');
  }
  // Proclaiming Israel DOES end the constitution — MLI declares a monarchy in
  // GOV_OF and these five declare nothing, so the asymmetry is the point.
  const w = proclaim(r.chapters[0], { tag: r.tag, from: r.from, gov: r.govs[0], year: r.year });
  ok(switchTagCore(w.ctx, r.tag, 'MLI'), r.tag + ': the kingdom may be proclaimed over it');
  ok(w.game.tags.MLI.govType === 'monarchy',
    r.tag + ': and the form of government ends with it (' + w.game.tags.MLI.govType + ')');
  ok(w.game.tagAliases[r.tag] === 'MLI' && w.game.tagAliases[r.from] === 'MLI',
    r.tag + ': the forwarding chain collapses rather than walking');
}

// ---------------------------------------------------------------- the empire
console.log('== §250: the empire is reached by the map, and keeps the constitution ==');
{
  for (const tag of ['JEM', 'IEM']) {
    const def = DEFINES.TAGS[tag];
    ok(!!def && /Empire$/.test(def.name || ''), tag + ': is called an empire — "' + ((def || {}).name || '?') + '"');
    ok(typeof FLAGS[tag] === 'string' && FLAGS[tag].length > 100, tag + ': flies real emblem art');
    ok(!!DEFINES.PERSONALITIES[tag] && DEFINES.PERSONALITIES[tag].ponderous,
      tag + ': is read as a great power by the courts around it');
    ok(!DEFINES.GOV_OF[tag], tag + ': declares no government — an empire does not restyle a republic');
  }
  // Israel's empire is Israel's alone; every other Jewish crown reaches the
  // Judaean one, and no crown reaches both.
  const iemFrom = FORMABLES.filter((f) => f.to === 'IEM').map((f) => f.from);
  const jemFrom = FORMABLES.filter((f) => f.to === 'JEM').map((f) => f.from);
  ok(JSON.stringify(iemFrom) === JSON.stringify(['MLI']),
    'the Israelite Empire is proclaimed out of the Kingdom of Israel alone (' + iemFrom.join(', ') + ')');
  ok(!jemFrom.some((t) => iemFrom.indexOf(t) >= 0) && jemFrom.length >= 6,
    'and the Judaean Empire out of the ' + jemFrom.length + ' other Jewish crowns');
  const both = CROWNS.concat(['JUD', 'HAS']).filter((t) => jemFrom.indexOf(t) < 0);
  ok(!both.length, 'every Jewish crown short of Israel can reach it (' + (both.join(', ') || 'all covered') + ')');
  ok(FORMABLES.find((f) => f.id === 'form_iem_mli').bonus.rulerTitle === 'King of Kings of Israel',
    'Israel\'s emperor is styled for it');
  ok(!FORMABLES.find((f) => f.id === 'form_jem_prj').bonus.rulerTitle,
    'and a priestly republic that conquers the East keeps its High Priest');

  // The gate: shut on the country, open on the world.
  const s = { tag: 'JEM', from: 'JUD', chapter: '132ce' };
  const shut = proclaim('132ce', s);
  // proclaim() switches the banner; the requirement rows are asked of the tag
  // that has not yet taken it, so boot a clean campaign for the reading.
  const w = boot(eraOf('132ce'), 'JUD');
  const f = FORMABLES.find((x) => x.id === 'form_jem_jud');
  const rowsOn = (world) => f.requires.map((q) => {
    let v = false;
    try { v = !!q.check(world.ctx, 'JUD'); } catch (e) { v = false; }
    return v;
  });
  ok(rowsOn(w).some((v) => !v), 'the empire is shut on the chapter\'s opening realm');
  maximalGround(w, 'JUD');
  remax(w, 'JUD');
  const open = rowsOn(w);
  ok(open.every((v) => v), 'and open on a realm that holds the heartland, the bridge, the seats and the world ('
    + open.filter((v) => !v).length + ' rows still unmet)');
  // The land bridge and the seats are real asks: drop one seat and it shuts.
  for (const name of ['Antioch', 'Alexandria', 'Memphis', 'Babylon', 'Seleucia-Ctesiphon', 'Roma']) {
    const p = w.ctx.prov(name);
    if (p) { p.owner = 'REB'; p.controller = 'REB'; }
  }
  ok(!rowsOn(w).every((v) => v), 'losing the seats of the world shuts it again');
  ok(shut.game.tags.JEM.govType === w.game.tags.JUD.govType,
    'and proclaiming it leaves the constitution exactly where it was ('
    + shut.game.tags.JEM.govType + ')');
}

// ------------------------------------------------- §214 and §22 pass unmoved
console.log('== §250: the fork, the store and the older crowns are untouched ==');
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
  ok(!missing.length, 'every crown that shipped before §227 is still here ('
    + (missing.join(', ') || olds.length + ' intact') + ')');
  const booted = [];
  for (const e of ERAS) {
    const active = new Set(e.bookmark.activeTags || []);
    for (const t of CROWNS.concat(['JEM', 'IEM'])) if (active.has(t)) booted.push(e.bookmark.id + '/' + t);
  }
  ok(!booted.length, 'no chapter boots a crown of government or an empire ('
    + (booted.join(', ') || 'all seven are formable only') + ')');
}

console.log(failures ? `smoke152: ${failures} FAIL` : 'smoke152: ALL PASS');
process.exit(failures ? 1 : 0);
