// Headless regression — SPEC §211: the civil half of the mission tree.
//
// The trees were war ladders. Audited before this section: 101 of 258
// objectives were conquest checks, 39% of them purely martial, and NOTHING
// in the game read the court, the estates, the institutions or a realm's
// standing among the powers — all of which the sim ticks every month.
//
// §211 gives every playable chain a three-strand civil band, marked in the
// data with `civil`: 'govt' (col 0, what the state becomes), 'region'
// (col 1, its place among its neighbours), 'court' (col 2, the estates and
// the men around the throne). This suite holds four contracts:
//
//   SHAPE — every playable chain carries all three strands, every civil node
//   is fully dressed and declares its own seat, and the band is APPENDED:
//   it sits before the roads not taken and nothing older waits on it.
//
//   THE AI WALL — the thing that makes the band honest. `monthlyFactions`
//   runs for the player alone, so `estateFavor`, `factions`, `advisors`,
//   `messianic` and `schools` are empty in every AI hand. The govt and
//   region strands must therefore be earnable WITHOUT them (§102: the AI
//   earns its branches on the same terms), and the court strand — which may
//   read them — is fenced so nothing outside col 2 ever waits on a col-2
//   node and an AI chain never stalls against politics it does not have.
//   Proved by behaviour, not by pattern-matching check sources: a chapter is
//   booted with somebody else on the throne, which is the true condition and
//   one that indirection through a file's own `approval()` wrapper hides.
//
//   NO FREE LUNCH — no civil node is accomplished at boot.
//
//   PAY — every civil node completes in a MAXIMAL realm: every dial the
//   engine has, turned to its stop. A node that does not pay there is dead
//   content — a misspelled field, an unreachable threshold, a check reading
//   something no campaign can produce. That is the failure this suite is
//   built to hear, because none of those throw.
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

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

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
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, playerTag, rngSeed: 5 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events });
  return { game, ctx, era };
}
const pump = (ctx, n) => { for (let i = 0; i < n; i++) realm.checkMissions(ctx); };
const civilOf = (list) => (list || []).filter((m) => m && m.civil);
const doneIds = (t) => new Set(t.missionsDone || []);

// Every playable chain in the game, discovered rather than typed.
const CHAINS = [];
for (const e of ERAS) {
  for (const p of (e.bookmark.playableTags || [])) {
    const list = e.bookmark.missions && e.bookmark.missions[p.tag];
    if (Array.isArray(list) && list.length) CHAINS.push({ era: e, tag: p.tag, list, id: e.bookmark.id });
  }
}

const STRANDS = { govt: 0, region: 1, court: 2 };
// (The AI wall is proved behaviourally in the live section below, not by
// pattern-matching check sources — indirection through a file's own local
// `approval()`/`favor()` wrappers defeats any such regex.)

// ---------------------------------------------------------------- shape
console.log('== §211 static: every playable chain grew a civil band ==');
ok(CHAINS.length >= 15, 'the game offers ' + CHAINS.length + ' playable chains');
for (const c of CHAINS) {
  const key = c.id + '/' + c.tag;
  const civil = civilOf(c.list);
  const kinds = new Set(civil.map((m) => m.civil));
  ok(civil.length >= 3, key + ': carries ' + civil.length + ' civil objectives');
  ok(kinds.has('govt') && kinds.has('region') && kinds.has('court'),
    key + ': covers the government, the region AND the court (' + [...kinds].join(', ') + ')');
  for (const m of civil) {
    ok(STRANDS[m.civil] !== undefined && m.col === STRANDS[m.civil],
      key + '/' + m.id + ': the ' + m.civil + ' strand sits in its own column (col ' + m.col + ')');
    ok(!m.hypothetical, key + '/' + m.id + ': is an objective, not a road not taken');
    ok(!!m.icon && typeof m.desc === 'string' && m.desc.length > 60 && !!m.rewardText
      && typeof m.check === 'function' && typeof m.reward === 'function'
      && Number.isFinite(m.col) && Number.isFinite(m.row),
      key + '/' + m.id + ': dressed and seated (col ' + m.col + ', row ' + m.row + ')');
  }
  // Appended: every objective still precedes every road not taken.
  const firstHy = c.list.findIndex((m) => m.hypothetical);
  const lastBase = c.list.reduce((last, m, i) => (m.hypothetical ? last : i), -1);
  if (firstHy >= 0) ok(firstHy > lastBase, key + ': the band appended ahead of the roads not taken');
  // One node per cell, counting the new band.
  const seats = new Set();
  let collide = null;
  const ids = c.list.map((m, i) => realm.missionId(m, i));
  const row = [];
  c.list.forEach((m, i) => {
    const col = Math.max(0, Math.min(4, (m.col || 0) | 0));
    let r = Number.isFinite(m.row) ? Math.max(0, m.row | 0) : null;
    if (r === null) {
      if (Array.isArray(m.requires) && m.requires.length) {
        r = 0;
        for (const rid of m.requires) {
          const pi = ids.indexOf(String(rid));
          if (pi >= 0 && pi < i && Number.isFinite(row[pi])) r = Math.max(r, row[pi] + 1);
        }
      } else r = 0;
    }
    row[i] = r;
    const k = col + ':' + r;
    if (seats.has(k)) collide = ids[i] + ' @ ' + k;
    seats.add(k);
  });
  ok(!collide, key + ': still seats every node in its own cell' + (collide ? ' (' + collide + ')' : ''));
}

// ---------------------------------------------------------------- fencing
console.log('== §211 static: the court strand is fenced and the band is additive ==');
for (const c of CHAINS) {
  const key = c.id + '/' + c.tag;
  const civil = civilOf(c.list);
  const civilIds = new Set(civil.map((m) => m.id));
  const courtIds = new Set(civil.filter((m) => m.civil === 'court').map((m) => m.id));

  // The court strand is fenced: nothing outside it may wait on it.
  const hostages = c.list.filter((m) => !courtIds.has(m.id)
    && (m.requires || []).some((r) => courtIds.has(String(r))));
  ok(!hostages.length, key + ': nothing outside the court waits on the court ('
    + (hostages.map((m) => m.id).join(', ') || 'fenced') + ')');

  // The band is purely additive: no older mission waits on a new one.
  const older = c.list.filter((m) => !civilIds.has(m.id)
    && (m.requires || []).some((r) => civilIds.has(String(r))));
  ok(!older.length, key + ': no older objective was made to wait on the band ('
    + (older.map((m) => m.id).join(', ') || 'additive') + ')');

  // Strand roots must be workable from turn one — a civil node may wait only
  // on another civil node of its own strand, never on the war.
  for (const m of civil) {
    const bad = (m.requires || []).filter((r) => {
      const p = civil.find((x) => x.id === String(r));
      return !p || p.civil !== m.civil;
    });
    const label = bad.length ? bad.join(', ')
      : ((m.requires || []).length ? 'its own root' : 'a root');
    ok(!bad.length, key + '/' + m.id + ': waits only inside its own strand (' + label + ')');
  }
}

// ------------------------------------------------------- seats, everywhere
// The seat check the other suites run walks PLAYABLE sides only, because the
// panel draws the player's own tree and nobody else's. That left the AI-only
// chains unchecked, and six of them were quietly stacking two medallions in
// one cell — invisible only because those trees are never rendered, and a
// landmine the day a chapter makes one of those tags playable. This walks
// every chain in the game, with the engine's real ladder/tree branch: a
// ladder seats one node per row in column zero, a tree derives an undeclared
// row one below its deepest parent.
console.log('== every chain in the game seats one node per cell ==');
{
  const collisions = [];
  for (const e of ERAS) {
    const b = e.bookmark;
    for (const tag of Object.keys(b.missions || {})) {
      const list = b.missions[tag];
      const tree = realm.isMissionTree(list);
      const ids = list.map((m, i) => realm.missionId(m, i));
      const row = [];
      const seats = new Map();
      list.forEach((m, i) => {
        const col = tree ? Math.max(0, Math.min(4, (m.col || 0) | 0)) : 0;
        let r = Number.isFinite(m.row) ? Math.max(0, m.row | 0) : null;
        if (r === null) {
          if (tree && Array.isArray(m.requires) && m.requires.length) {
            r = 0;
            for (const rid of m.requires) {
              const pi = ids.indexOf(String(rid));
              if (pi >= 0 && pi < i && Number.isFinite(row[pi])) r = Math.max(r, row[pi] + 1);
            }
          } else r = tree ? 0 : i;
        }
        row[i] = r;
        const k = col + ':' + r;
        if (seats.has(k)) collisions.push(b.id + '/' + tag + ': ' + seats.get(k) + ' vs ' + ids[i] + ' @ ' + k);
        seats.set(k, ids[i]);
      });
    }
  }
  ok(!collisions.length, 'no chain stacks two medallions, playable or AI-only ('
    + (collisions.join(', ') || 'all clear') + ')');
}

// ------------------------------------------------- no prerequisite dangles
// Every chain in the game, not only the playable ones and not only the ids a
// given section added. A `requires` naming a mission that does not exist
// locks that node and everything under it out of the game permanently, and
// nothing throws: the panel just draws a medallion that never opens. §211
// found one that had been shipping for several sections — ARI's `a4_sea_gates`
// waiting on `a4_priest_kings_school` when the mission is `..._charter`,
// which had quietly killed two nodes of Aristobulus' court branch.
console.log('== every prerequisite in the game names a mission that exists ==');
{
  const dangling = [];
  for (const e of ERAS) {
    const b = e.bookmark;
    for (const tag of Object.keys(b.missions || {})) {
      const list = b.missions[tag];
      const ids = new Set(list.map((m, i) => realm.missionId(m, i)));
      for (const m of list) {
        for (const r of (m.requires || [])) {
          if (!ids.has(String(r))) dangling.push(b.id + '/' + tag + '/' + m.id + ' → ' + r);
        }
      }
    }
  }
  ok(!dangling.length, 'no mission waits on one that does not exist ('
    + (dangling.join(', ') || 'all resolve') + ')');
}

// ------------------------------------------------------- the reward's keys
// Nothing validated a MISSION reward's modifier keys before this. smoke85
// harvests the engine's vocabulary out of `js/sim/` and checks it against the
// event packages — the bookmarks' mission tables were never in its reach, so
// a misspelled effect key on a mission reward seated a modifier the engine
// never reads: the tooltip promises +10% income, the reward runs without
// throwing, and nothing happens. Seventy-eight new rewards is exactly the
// wrong moment to leave that unchecked, so this runs each civil reward for
// real and reads the keys off the modifiers it actually seats.
console.log('== §211: every civil reward seats keys the engine reads ==');
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
  // Scope bites the same way it does in smoke85: `taxMult` and `unrest` are
  // walked off a PROVINCE's modifiers and never off a tag's, so either one on
  // a tag modifier is a correctly-spelled key doing nothing.
  const PROV_ONLY = new Set(['taxMult', 'unrest']);
  for (const c of CHAINS) {
    const key = c.id + '/' + c.tag;
    const dead = [];
    const misscoped = [];
    for (const m of civilOf(c.list)) {
      const w = boot(c.era, c.tag);
      const t = w.game.tags[c.tag];
      const before = new Set((t.modifiers || []).map((x) => x.id));
      const provBefore = new Map();
      for (const p of w.game.provinces) {
        if (p) provBefore.set(p, new Set((p.modifiers || []).map((x) => x.id)));
      }
      try { m.reward(w.ctx); } catch (e) { dead.push(m.id + ' (reward threw: ' + e.message + ')'); continue; }
      for (const mod of (t.modifiers || [])) {
        if (before.has(mod.id)) continue;
        for (const k of Object.keys(mod.effects || {})) {
          if (!TAG_KEYS.has(k)) dead.push(m.id + '→' + k);
          else if (PROV_ONLY.has(k)) misscoped.push(m.id + '→' + k + ' (province-scope key on a tag modifier)');
        }
      }
      for (const p of w.game.provinces) {
        if (!p) continue;
        const had = provBefore.get(p) || new Set();
        for (const mod of (p.modifiers || [])) {
          if (had.has(mod.id)) continue;
          for (const k of Object.keys(mod.effects || {})) {
            if (!TAG_KEYS.has(k)) dead.push(m.id + '→' + k + ' (province)');
          }
        }
      }
    }
    ok(!dead.length, key + ': no civil reward seats a key the engine never reads ('
      + ([...new Set(dead)].join(', ') || 'clean') + ')');
    ok(!misscoped.length, key + ': and none of them is scoped to the wrong object ('
      + ([...new Set(misscoped)].join(', ') || 'clean') + ')');
  }
}

// ------------------------------------------------------------ no free lunch
console.log('== §211 live: nothing civil is accomplished at boot ==');
const booted = new Map();
for (const c of CHAINS) {
  const key = c.id + '/' + c.tag;
  const w = boot(c.era, c.tag);
  booted.set(key, w);
  pump(w.ctx, 24);
  const done = doneIds(w.game.tags[c.tag]);
  const free = civilOf(c.list).filter((m) => done.has(m.id));
  ok(!free.length, key + ': no civil objective completes on day one ('
    + (free.map((m) => m.id).join(', ') || 'none') + ')');
}

// -------------------------------------------------------------------- pay
// Every dial to its stop. A civil node that does not pay HERE cannot be paid
// by any campaign — the check is reading a field that is never written, or
// asking for a number the engine cannot reach.
console.log('== §211 live: every civil objective pays in a maximal realm ==');
// The dials, re-asserted before EVERY pass. They have to be sustained rather
// than set once: the missions above the band pay out as they complete, and
// some of those rewards shift a faction or spend a treasury — so a snapshot
// maximal realm decays out from under the band it is supposed to be testing,
// and a perfectly good court mission reads as dead content.
// `court: false` models a REAL AI campaign — `monthlyFactions` never runs for
// an AI hand, so its court table is never written at all. Forcing it full
// would fake reachability for any check that reads `t.factions` directly
// instead of going through `factionApproval`, and the AI-hand test below
// exists precisely to tell those apart.
function remax(w, tag, { court = true } = {}) {
  const g = w.game;
  const ctx = w.ctx;
  const t = g.tags[tag];
  const bookmark = w.era.bookmark;
  g.wars = [];
  for (const k of Object.keys(g.tags)) if (g.tags[k]) g.tags[k].atWarWith = [];
  t.alive = true; t.overlord = null;
  t.treasury = 100000; t.stability = 3; t.legitimacy = 100; t.manpower = 500000;
  t.tech = { gov: 25, infl: 25, mar: 25 };
  t.reforms = { mil: 9, civ: 9, rel: 9 };
  t.eraIdeas = { forced_one: 9, forced_two: 9, forced_three: 9 };
  t.points = { gov: 9999, infl: 9999, mar: 9999 };
  const inst = [...universalInstitutions(ctx), ...liveInstitutions(ctx)]
    .map((i) => i && i.id).filter(Boolean);
  t.embraced = [...new Set(inst)];
  if (court) {
    // The court at its warmest — player-only state, for the col-2 strand.
    // Ask the ENGINE which estates are in this tag's room rather than the
    // bookmark's table: a formed crown (SPEC §127) inherits the court of the
    // tag it grew out of and appears in no bookmark's `factions` at all, so
    // reading the table leaves its court empty and its whole court strand
    // reads as dead content.
    t.estateFavor = t.estateFavor || {}; t.factions = t.factions || {};
    let defs = [];
    try { defs = factionDefs(ctx, tag) || []; } catch (e) { defs = []; }
    if (!defs.length) defs = ((bookmark.factions || {})[tag] || []);
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
    if (!t.heir) {
      t.heir = { name: 'The Heir', gov: 4, infl: 4, mar: 4, age: 24 };
    }
  } else {
    // An AI hand has no court at all — not an empty one, an absent one.
    t.estateFavor = {}; t.factions = {};
    t.advisors = { gov: null, infl: null, mar: null };
    t.messianic = 0;
  }
  // First among the powers, and everyone's friend.
  const others = Object.keys(g.tags).filter((k) => k !== tag && g.tags[k]);
  g.standing = { order: [tag, ...others], score: { [tag]: 9999 }, month: 0 };
  t.allies = others.slice(0, 4);
  for (const k of others) g.tags[k].opinion = { ...(g.tags[k].opinion || {}), [tag]: 100 };
  t.opinion = t.opinion || {};
  for (const k of others.slice(0, 6)) t.opinion[k] = 100;
  for (const k of others.slice(0, 3)) g.tags[k].overlord = tag; // clients
}

// The ground, once: the whole map, developed, built up, and holy.
function maximalGround(w, tag) {
  const g = w.game;
  const ctx = w.ctx;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    p.owner = tag; p.controller = tag;
    // A realm at its stop has finished converting: several chains count
    // provinces "keeping the Law" rather than merely held, and owning the map
    // without the faith leaves those unreachable however long the pass runs.
    const faith = (g.tags[tag] || {}).religion;
    if (faith) p.religion = faith;
    p.dev = { tax: 12, prod: 12, mp: 12 };
    p.buildings = ['market', 'walls', 'temple', 'granary', 'shipyard'];
    if (p.dia && typeof p.dia === 'object') p.dia.standing = 100;
    else p.dia = { standing: 100 };
  }
  const jer = g.provinces.find((p) => p && p.canon === 'Jerusalem');
  if (jer) jer.wonder = 'temple';
  const ger = g.provinces.find((p) => p && p.canon === 'Neapolis');
  if (ger) ger.wonder = ger.wonder || 'temple';
  try {
    ctx.helpers.spawnArmy(ctx, tag, (jer && jer.name) || g.provinces[1].name, { inf: 60, name: 'The Host' });
  } catch (e) { /* geometry-free boot */ }
}

for (const c of CHAINS) {
  const key = c.id + '/' + c.tag;
  const w = boot(c.era, c.tag);
  maximalGround(w, c.tag);
  // §207 paces one completion a month, so a whole tree needs the room.
  for (let i = 0; i < 400; i++) { remax(w, c.tag); realm.checkMissions(w.ctx); }
  const done = doneIds(w.game.tags[c.tag]);
  const unpaid = civilOf(c.list).filter((m) => !done.has(m.id));
  ok(!unpaid.length, key + ': every civil objective paid ('
    + (unpaid.length ? 'DEAD CONTENT: ' + unpaid.map((m) => m.id).join(', ')
      : civilOf(c.list).length + ' paid') + ')');
}

// ---------------------------------------------------------------- the wall
// The AI wall, proved by BEHAVIOUR rather than by reading source. Boot each
// chapter with somebody else on the throne and our tag on the AI hand, so
// `activeDefs` refuses the court exactly as it does in a real campaign —
// `factionApproval` then returns null however the table is filled in, which
// is the true condition and one no regex over check sources can establish.
// Under a maximal realm the government and the region must STILL pay (§102:
// the AI earns its branches), and the court must NOT (§34: its politics are
// the player's alone), which is what makes col 2 a fenced leaf strand.
console.log('== §211 live: the AI earns the government and the region, never the court ==');
for (const c of CHAINS) {
  const key = c.id + '/' + c.tag;
  const others = (c.era.bookmark.playableTags || []).map((p) => p.tag).filter((x) => x !== c.tag);
  const seat = others[0] || Object.keys(c.era.bookmark.missions).find((x) => x !== c.tag);
  if (!seat) { console.log('  SKIP ' + key + ': no other seat to hand the throne to'); continue; }
  const w = boot(c.era, seat);
  w.game.tags[c.tag].ai = true;
  maximalGround(w, c.tag);
  for (let i = 0; i < 400; i++) { remax(w, c.tag, { court: false }); realm.checkMissions(w.ctx); }
  const done = doneIds(w.game.tags[c.tag]);
  const civil = civilOf(c.list);
  const earned = civil.filter((m) => m.civil !== 'court');
  const missed = earned.filter((m) => !done.has(m.id));
  ok(!missed.length, key + ': an AI hand still earns the government and the region ('
    + (missed.map((m) => m.id).join(', ') || earned.length + ' earned') + ')');
  const court = civil.filter((m) => m.civil === 'court');
  const reached = court.filter((m) => done.has(m.id));
  ok(reached.length < court.length,
    key + ': the court strand is genuinely the player\'s ('
    + (court.length - reached.length) + ' of ' + court.length + ' out of an AI\'s reach)');
}

// ------------------------------------------------------------ the crown
// The Kingdom of Israel is a playable chain too — the moment it is proclaimed
// it is the tree the player reads — but it lives in FORMABLES rather than in a
// bookmark's `missions`, so the §211 pass above walks straight past it. That
// was how the crown ended up the one side in the game with no civil band, and
// worse: taking the greater crown SHRANK the objectives panel from the
// chapter's twenty-odd nodes to seven. Same contracts, applied to the chain a
// player actually inherits when the crown goes on.
console.log('== §211: the crown carries a civil band in every chapter it is formable in ==');
{
  const crown = FORMABLES.find((f) => f && f.to === 'MLI' && Array.isArray(f.missions) && f.missions.length);
  ok(!!crown, 'the Kingdom of Israel carries a mission table');
  const CROWN_CHAPTERS = ['167bce', '67bce', '40bce', '66ce', '132ce', '614ce'];

  // Proclaim the crown: the chapter's own side takes it, exactly as a campaign
  // would. `seatFor` decides who is holding the throne — pass a foreign tag to
  // model an AI hand, which is what puts the court out of reach.
  function proclaim(chapterId, { aiHand = false } = {}) {
    const e = ERAS.find((x) => x.bookmark.id === chapterId);
    const from = e.bookmark.playableTags[0].tag;
    const w = boot(e, from);
    w.game.wars = [];
    for (const k of Object.keys(w.game.tags)) if (w.game.tags[k]) w.game.tags[k].atWarWith = [];
    switchTagCore(w.ctx, from, 'MLI');
    const t = w.game.tags.MLI;
    t.missionIdx = 0; t.missionsDone = []; t.missionRest = 0;
    if (aiHand) {
      // Somebody else on the throne, the crown on the AI hand — the true
      // condition under which `activeDefs` refuses the court.
      const other = Object.keys(w.game.tags).find((k) => k !== 'MLI' && w.game.tags[k] && w.game.tags[k].alive);
      w.game.playerTag = other;
      t.ai = true;
    } else {
      w.game.playerTag = 'MLI';
    }
    return w;
  }

  for (const id of CROWN_CHAPTERS) {
    const list = realm.chapterChain(crown.missions, id);
    const civil = civilOf(list);
    const kinds = new Set(civil.map((m) => m.civil));
    ok(list.length >= 18, id + '/MLI: the crown reads ' + list.length
      + ' nodes — no longer a stub beside the chapter it replaced');
    ok(civil.length >= 3 && kinds.has('govt') && kinds.has('region') && kinds.has('court'),
      id + '/MLI: covers the government, the region AND the court (' + [...kinds].join(', ') + ')');
    for (const m of civil) {
      ok(m.col === STRANDS[m.civil],
        id + '/MLI/' + m.id + ': the ' + m.civil + ' strand sits in its own column');
    }
    // The court fence and the strand rule, on the filtered chain.
    const courtIds = new Set(civil.filter((m) => m.civil === 'court').map((m) => m.id));
    const hostages = list.filter((m) => !courtIds.has(m.id)
      && (m.requires || []).some((r) => courtIds.has(String(r))));
    ok(!hostages.length, id + '/MLI: nothing outside the court waits on the court ('
      + (hostages.map((m) => m.id).join(', ') || 'fenced') + ')');
    // Seats, on the chain a chapter actually renders.
    const ids = list.map((m, i) => realm.missionId(m, i));
    const row = [];
    const seats = new Set();
    let collide = null;
    list.forEach((m, i) => {
      const col = Math.max(0, Math.min(4, (m.col || 0) | 0));
      let r = Number.isFinite(m.row) ? Math.max(0, m.row | 0) : null;
      if (r === null) {
        if (Array.isArray(m.requires) && m.requires.length) {
          r = 0;
          for (const rid of m.requires) {
            const pi = ids.indexOf(String(rid));
            if (pi >= 0 && pi < i && Number.isFinite(row[pi])) r = Math.max(r, row[pi] + 1);
          }
        } else r = 0;
      }
      row[i] = r;
      const k = col + ':' + r;
      if (seats.has(k)) collide = ids[i] + ' @ ' + k;
      seats.add(k);
    });
    ok(!collide, id + '/MLI: seats every node in its own cell' + (collide ? ' (' + collide + ')' : ''));
  }

  console.log('== §211: nothing on the crown is free on the day of the crowning ==');
  for (const id of CROWN_CHAPTERS) {
    const w = proclaim(id);
    const list = realm.chapterChain(crown.missions, id);
    pump(w.ctx, 24);
    const done = doneIds(w.game.tags.MLI);
    const free = civilOf(list).filter((m) => done.has(m.id));
    ok(!free.length, id + '/MLI: no civil objective completes at the proclamation ('
      + (free.map((m) => m.id).join(', ') || 'none') + ')');
  }

  console.log('== §211: every node of the crown pays in a maximal realm ==');
  for (const id of CROWN_CHAPTERS) {
    const w = proclaim(id);
    const list = realm.chapterChain(crown.missions, id);
    maximalGround(w, 'MLI');
    for (let i = 0; i < 500; i++) { remax(w, 'MLI'); realm.checkMissions(w.ctx); }
    const done = doneIds(w.game.tags.MLI);
    // The whole chain, not only the band: a stub tree hid its own dead content.
    const unpaid = list.filter((m) => !done.has(m.id));
    ok(!unpaid.length, id + '/MLI: every objective paid ('
      + (unpaid.length ? 'DEAD CONTENT: ' + unpaid.map((m) => m.id).join(', ')
        : list.length + ' paid') + ')');
  }

  console.log('== §211: an AI-held crown earns the government and the region, never the court ==');
  for (const id of CROWN_CHAPTERS) {
    const w = proclaim(id, { aiHand: true });
    const list = realm.chapterChain(crown.missions, id);
    maximalGround(w, 'MLI');
    for (let i = 0; i < 500; i++) { remax(w, 'MLI', { court: false }); realm.checkMissions(w.ctx); }
    const done = doneIds(w.game.tags.MLI);
    const civil = civilOf(list);
    const missed = civil.filter((m) => m.civil !== 'court' && !done.has(m.id));
    ok(!missed.length, id + '/MLI: an AI hand still earns the government and the region ('
      + (missed.map((m) => m.id).join(', ') || 'earned') + ')');
    const court = civil.filter((m) => m.civil === 'court');
    const reached = court.filter((m) => done.has(m.id));
    ok(reached.length < court.length, id + '/MLI: the court strand stays the player\'s ('
      + (court.length - reached.length) + ' of ' + court.length + ' out of reach)');
  }
}

// ------------------------------------------------------------- the balance
// The point of the section, measured: the trees are no longer war ladders.
console.log('== §211: the martial share of the trees ==');
{
  const MARTIAL = /warscore|warScore|atWarWith|controls\(|countControlled|holds\(|totalMen|\.men\b/i;
  let martial = 0, total = 0;
  for (const c of CHAINS) {
    for (const m of c.list) {
      if (!m || m.hypothetical || typeof m.check !== 'function') continue;
      total++;
      if (MARTIAL.test(String(m.check))) martial++;
    }
  }
  const pct = Math.round((100 * martial) / total);
  console.log(`  ${martial} of ${total} playable objectives read the map or the host (${pct}%)`);
  ok(pct <= 45, 'the war is no longer the majority of what a chapter asks (' + pct + '%)');
}

console.log(failures ? `smoke138: ${failures} FAIL` : 'smoke138: ALL PASS');
process.exit(failures ? 1 : 0);
