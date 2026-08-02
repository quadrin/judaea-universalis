// Headless regression — SPEC §183: the tree shows the roads not taken.
//
// The §119 path tree charts what every chapter can become; §183 seats those
// forks in the mission tree as standing hypotheticals with bonuses, so a
// player browsing the panel learns the alternate histories exist. This suite
// holds the contract from both ends:
//
//   STATIC — every hypothetical names a real fork of its own chapter, sits
//   appended after the era's objectives (the missionIdx prefix and smoke16's
//   raw indexing both depend on that), declares its own grid seat clear of
//   the objective columns, and lives only on playable sides — the AI-only
//   chains (Vespasian's ladder above all) stay exactly what §177 pinned.
//
//   LIVE — no hypothetical is completable at boot ("no free lunch"), and
//   EVERY one of them completes when the world state its desc promises is
//   actually reached: the fork markers set, the provinces held, the war
//   settled early. A flag name typo'd in a check would make a road no
//   campaign can ever be paid for — this is the test that hears it.
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { CHAPTER_PATHS } from '../../js/data/chapter_paths.js';
import { ERAS } from '../../js/data/compendium.js';
import { bus } from '../../js/core/bus.js';
import { initGame, makeCtx, gameActions } from '../../js/sim/init.js';
import * as realm from '../../js/sim/realm.js';

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
  areas: new Int32Array(N + 1),
  bbox: [],
};

function boot(era, playerTag) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, playerTag, rngSeed: 7 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events });
  return { game, ctx, actions: gameActions(ctx) };
}

const era = (id) => ERAS.find((e) => e.bookmark.id === id);
const hyposOf = (list) => (list || []).filter((m) => m && m.hypothetical);
const doneHy = (t) => (t.missionsDone || []).filter((id) => /^hy_/.test(id));
// The §206 drumbeat: one completion a pass, then the chain rests. Where this
// suite means "let the months go by until everything satisfiable has paid",
// it pumps the monthly pass — each call is one synthetic month, and a big
// forced world needs a run of them, not a pair.
const pump = (ctx, n) => { for (let i = 0; i < n; i++) realm.checkMissions(ctx); };

// ---------------------------------------------------------------- static
console.log('== §183 static: every hypothetical is a charted fork, appended, seated ==');
{
  const forksByChapter = new Map(CHAPTER_PATHS.map((c) => [c.id, new Set(c.forks.map((f) => f.id))]));
  let total = 0;
  const chaptersCovered = new Set();
  for (const e of ERAS) {
    const b = e.bookmark;
    const playable = new Set((b.playableTags || []).map((p) => p.tag));
    for (const tag of Object.keys(b.missions || {})) {
      const list = b.missions[tag];
      const hypos = hyposOf(list);
      const lastBase = list.reduce((last, m, i) => (m.hypothetical ? last : i), -1);
      const firstHy = list.findIndex((m) => m.hypothetical);
      if (!playable.has(tag)) {
        ok(!hypos.length, b.id + '/' + tag + ' is AI-only and carries no hypotheticals');
        continue;
      }
      ok(hypos.length >= 1, b.id + '/' + tag + ' offers ' + hypos.length + ' roads not taken');
      if (firstHy >= 0) {
        ok(firstHy > lastBase, b.id + '/' + tag + ' appends them after every objective (prefix contract)');
      }
      const ids = new Set(list.map((m, i) => realm.missionId(m, i)));
      for (const m of hypos) {
        total++;
        chaptersCovered.add(String(m.fork || '').split('/')[0]);
        const [ch, fk] = String(m.fork || '').split('/');
        ok(ch === b.id && forksByChapter.has(ch) && forksByChapter.get(ch).has(fk),
          b.id + '/' + tag + '/' + m.id + ' names a real fork of its own chapter: ' + m.fork);
        ok(/^hy_/.test(m.id), m.id + ' wears the hy_ prefix');
        ok(!!m.icon && typeof m.desc === 'string' && m.desc.length > 60 && !!m.rewardText
          && typeof m.check === 'function' && typeof m.reward === 'function',
          m.id + ' carries icon, a desc that teaches the route, rewardText, check, reward');
        ok(Number.isFinite(m.col) && m.col >= 3 && m.col <= 4 && Number.isFinite(m.row),
          m.id + ' declares its own seat in the spare columns: col ' + m.col + ', row ' + m.row);
        for (const rid of (m.requires || [])) {
          const parent = list.find((x, i) => realm.missionId(x, i) === String(rid));
          ok(!!parent && ids.has(String(rid)) && !!parent.hypothetical,
            m.id + ' waits only on other roads not taken (' + rid + ')');
        }
      }
    }
  }
  ok(total >= 24, 'the game offers ' + total + ' hypotheticals in all');
  const uncovered = CHAPTER_PATHS.map((c) => c.id).filter((id) => !chaptersCovered.has(id));
  ok(!uncovered.length, 'every charted chapter shows at least one road in its tree ('
    + (uncovered.join(', ') || 'all covered') + ')');
}

// ------------------------------------------------------------- no free lunch
console.log('== §183 live: nothing is accomplished at boot ==');
const booted = new Map(); // id -> {game, ctx, actions}
for (const e of ERAS) {
  const playerTag = e.bookmark.playableTags[0].tag;
  const s = boot(e, playerTag);
  booted.set(e.bookmark.id, s);
  // Pump past the §206 rests: an era objective satisfiable at boot absorbs
  // a pass, and a genuinely free road must not get to hide behind it.
  pump(s.ctx, 16);
  const free = [];
  for (const tag of Object.keys(e.bookmark.missions || {})) {
    const t = s.game.tags[tag];
    if (t) free.push(...doneHy(t).map((id) => tag + '/' + id));
  }
  ok(!free.length, e.bookmark.id + ': no hypothetical completes on day one ('
    + (free.join(', ') || 'none') + ')');
  const view = s.actions.getMissions();
  const seats = new Set();
  let collide = false;
  for (const m of view) {
    const key = m.col + ':' + m.row;
    if (seats.has(key)) collide = true;
    seats.add(key);
  }
  ok(!collide, e.bookmark.id + ': the player tree seats every node in its own cell');
  ok(view.some((m) => m.hypothetical), e.bookmark.id + ': the view carries the hypothetical flag');
}

// -------------------------------------------------------------- completability
// Reach each road's world-state by hand — markers set, provinces held, the
// war settled early — then let the ordinary monthly pass pay for it. Since
// §206 the pass banks ONE mission and rests between, so a forced world is
// paid off over a long run of pumped months; 40 BCE still needs a second
// world, and its first must be fully paid while Antigonus lives.
console.log('== §183 live: every road pays when the world it names arrives ==');
function grant(ctx, tag, names) {
  for (const n of names) ctx.helpers.changeOwner(ctx, n, tag);
}
function expectAllDone(g, bookmark, tags, label) {
  for (const tag of tags) {
    const all = hyposOf(bookmark.missions[tag]).map((m) => m.id);
    const done = new Set(doneHy(g.tags[tag]));
    const missing = all.filter((id) => !done.has(id));
    ok(!missing.length, label + ' ' + tag + ': every road paid ('
      + (missing.length ? 'missing ' + missing.join(', ') : all.length + ' done') + ')');
  }
}

{ // 167 BCE — the imperial ladder by conquest, the rest by marker.
  const { game, ctx } = booted.get('167bce');
  const t = game.tags.HAS;
  t.overlord = null;
  grant(ctx, 'HAS', ['Jerusalem', 'Damascus', 'Apamea', 'Joppa', 'Azotus', 'Ascalon', 'Gaza']);
  for (let i = 1; i < game.provinces.length && ctx.helpers.countControlled(ctx, 'HAS', {}) < 15; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable) { p.owner = 'HAS'; p.controller = 'HAS'; }
  }
  Object.assign(game.flags, {
    seleucidSuccessor: true, greekJerusalem: true, westernMarch: true,
    priesthoodAlone: true,
  });
  game.retiredChapters = [{ id: 'ev_royal_expedition', y: -162, m: 3, title: 'The Boy King Takes the Field', why: 'the war it belonged to was already settled' }];
  pump(ctx, 120);
  expectAllDone(game, era('167bce').bookmark, ['HAS'], '167bce');
  ok((t.modifiers || []).some((m) => m.id === 'the_harbors_taken'), '167bce: the coast paid its modifier');
  ok((t.modifiers || []).some((m) => m.id === 'hy_successor_state'), '167bce: the successor state pays permanently');
}

{ // 67 BCE — the ev4_v_* strand pays both brothers' chains off one world,
  // the §187 forks (Moab, Crassus, the two Roman civil wars) by marker, and
  // the Tigris client's road pays off the same unrenamed west (§185).
  const { game, ctx } = booted.get('67bce');
  Object.assign(game.flags, {
    eagleRefused: true, neverRenamed: true,
    moabKept: true, crassusRefused: true, jvBackedPompey: true, jvBackedAntony: true,
    successionSettled: true,
  });
  pump(ctx, 120);
  expectAllDone(game, era('67bce').bookmark, ['HYR', 'ARI', 'ADI'], '67bce');
  ok((game.tags.HYR.modifiers || []).some((m) => m.id === 'hy_unrenamed_crown')
    && (game.tags.ARI.modifiers || []).some((m) => m.id === 'hy_unrenamed_crown'),
    '67bce: the unrenamed crown settles on whichever brother kept it');
}

{ // 40 BCE — first the kingdom's statue answer and the Hasmonean hold (with
  // the §187 markers: the groves refused, the fleet sailed, the old man home
  // — set before the first pass, because ATG must be paid while it lives),
  // then a second world in which Herod outgrew the favour.
  const { game, ctx } = booted.get('40bce');
  Object.assign(game.flags, {
    hasmoneanHolds: true, orderNeverGiven: true,
    grovesRefused: true, sailedWithAntony: true, hyrcanusHome: true,
    kingdomWhole: true,
  });
  pump(ctx, 120);
  const her = game.tags.HER;
  her.overlord = null;
  game.tags.ATG.alive = false;
  grant(ctx, 'HER', ['Jerusalem', 'Damascus']);
  pump(ctx, 120);
  expectAllDone(game, era('40bce').bookmark, ['HER', 'ATG', 'ADI'], '40bce');
}

{ // 66 CE — the Second Kingdom and both of its dependent questions pay off
  // one forced world — the client courts' roads (§185, grown by §196) read
  // the same standing House, and the §192 forks (the royal robes, the
  // granaries) by marker. The nation question (§196: Agrippa hears the
  // answer too) pays over the same pumped months; each court drums at its
  // own §206 pace, so the run covers the longest chain among them.
  const { game, ctx } = booted.get('66ce');
  Object.assign(game.flags, {
    secondKingdom: true, kingdomOfTheAltar: true, roadHeldOpen: true,
    menahemLives: true, storesSealed: true, speakerForTheNation: true,
    agrippaRose: true, tigrisFree: true,
  });
  pump(ctx, 120);
  expectAllDone(game, era('66ce').bookmark, ['JUD', 'AGR', 'ADI'], '66ce');
}

{ // 132 CE — redemption, the accession, the recorded doubt, three deep,
  // and the §192 forks (the Nasi's letters, the letters east) by marker;
  // the restored house's mint (§185) reads the same redemption.
  const { game, ctx } = booted.get('132ce');
  Object.assign(game.flags, {
    redemptionEra: true, beitKosibaSettled: true, doubtPreserved: true,
    lettersMercy: true, dispersionCalled: true, julianRefused: true,
  });
  pump(ctx, 120);
  expectAllDone(game, era('132ce').bookmark, ['JUD', 'ADI'], '132ce');
}

{ // 529 CE — the mountain, the letter, and the Taheb.
  const { game, ctx } = booted.get('529ce');
  Object.assign(game.flags, { gerizimCleared: true, ctesiphonPromised: true, tahebAwaited: true });
  pump(ctx, 120);
  expectAllDone(game, era('529ce').bookmark, ['SAM'], '529ce');
}

{ // 614 CE — the century, its three dependents, and the §187 forks: the
  // Exilarchate, the caliph's categories, and the other Israel.
  const { game, ctx } = booted.get('614ce');
  Object.assign(game.flags, {
    charterDavidic: true, altarRestored: true, tookTheEmptyGround: true, davidCrowned: true,
    twoHousesOnePeople: true, theTreatyState: true, twoTorahsPeace: true,
  });
  pump(ctx, 120);
  expectAllDone(game, era('614ce').bookmark, ['JUD'], '614ce');
}

{ // 1948 — Dimona and the question by marker; the Levant without a Lebanon
  // by standing in most of what was Lebanon.
  const { game, ctx } = booted.get('1948ce');
  Object.assign(game.flags, {
    dimonaOpaque: true, oneCitizenship: true,
    altalenaAshore: true, shilumimRefused: true,
  });
  game.tags.LEB.alive = false;
  grant(ctx, 'ISR', ['Tyre', 'Sidon', 'Berytus', 'Byblos']);
  pump(ctx, 120);
  expectAllDone(game, era('1948ce').bookmark, ['ISR'], '1948ce');
  ok((game.tags.ISR.modifiers || []).some((m) => m.id === 'hy_certain_ambiguity'),
    '1948ce: a certain ambiguity settles over the state');
}

console.log(failures ? `smoke116: ${failures} FAIL` : 'smoke116: ALL PASS');
process.exit(failures ? 1 : 0);
