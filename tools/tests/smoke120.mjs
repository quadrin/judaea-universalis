// Headless regression — SPEC §189: the crown speaks in the age it was crowned in.
//
// The Kingdom of Israel is formable in six chapters and used to read the same
// four missions in all of them. §189 keeps those four as the SPINE and hangs a
// BRANCH per chapter off the crowning, selected by the `chapters` field
// through `chapterChain`. §211 then deepened both halves — the spine to
// fifteen (five more kingdom rungs plus the civil band) and every branch to
// seven — because until then proclaiming the greater crown SHRANK the
// objectives panel from the chapter's twenty-odd nodes to seven. This suite
// holds both ends of it:
//
//   STATIC — every chapter reads spine + its own seven and nothing else; no
//   branch leaks across a chapter line; every branch mission carries the kit
//   (icon, a desc that teaches the route, rewardText, check, reward), seats
//   itself in the branch columns clear of the spine, and names prerequisites
//   that exist in its own chapter's chain. The spine keeps the old ladder's
//   order, because an old save's `missionIdx` is a prefix of exactly that.
//
//   LIVE — the engine hands each chapter its own chain (and the same array
//   twice, since the monthly pass and the panel both ask); nothing on a
//   branch is accomplished by the act of proclamation ("no free lunch"); and
//   EVERY branch mission pays when the world its desc promises is built by
//   hand. A province misspelled in a check would make a mission no campaign
//   can ever be paid for — this is the test that hears it.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { FORMABLES } = await import(R + '/js/data/formables.js');
const { bus } = await import(R + '/js/core/bus.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { switchTagCore } = await import(R + '/js/sim/military.js');
const realm = await import(R + '/js/sim/realm.js');

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

const CHAPTERS = ['167bce', '67bce', '40bce', '66ce', '132ce', '614ce'];
const SPINE = ['mli_the_crowning', 'mli_the_muster', 'mli_the_land', 'mli_the_house'];
const crown = FORMABLES.find((f) => f.id === 'form_mli_jud');
const crownHas = FORMABLES.find((f) => f.id === 'form_mli_has');
const branchOf = (id) => crown.missions.filter((m) => Array.isArray(m.chapters)
  && m.chapters.indexOf(id) >= 0);

// The chapter's own Israelite side takes the crown. In 67 and 40 the road runs
// through the restored Hasmonean crown first (HYR → HAS → MLI); the sim does
// not care which banner the realm wore on the way, so the test does not either.
function proclaim(chapterId, tagOverride) {
  const era = ERAS.find((e) => e.bookmark.id === chapterId);
  const tag = tagOverride || era.bookmark.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events,
    playerTag: tag, rngSeed: 11,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events,
  });
  game.wars = [];
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
  switchTagCore(ctx, tag, 'MLI');
  game.playerTag = 'MLI';
  const t = game.tags.MLI;
  t.missionIdx = 0; t.missionsDone = [];
  return { game, ctx, era, from: tag };
}
const doneSet = (game) => new Set(game.tags.MLI.missionsDone || []);
const grant = (ctx, names) => { for (const n of names) ctx.helpers.changeOwner(ctx, n, 'MLI'); };
const stand = (ctx, name, v) => { const p = ctx.prov(name); if (p) p.dia = { standing: v }; };
// The §207 drumbeat: one completion a pass, then the chain rests — a forced
// world is paid off over a run of pumped months, not a pair of passes.
const pump = (ctx, n) => { for (let i = 0; i < n; i++) realm.checkMissions(ctx); };

// ---------------------------------------------------------------- static
console.log('== §189 static: one spine, six branches, nothing crossing ==');
{
  ok(crown.missions === crownHas.missions,
    'both roads to the crown read the same programme');
  const spine = crown.missions.filter((m) => !Array.isArray(m.chapters));
  // §211 deepened the spine: the original four still lead it, in the ladder's
  // own order (an old save's missionIdx is a prefix of exactly that), followed
  // by five more kingdom rungs and the six-node civil band.
  ok(spine.length === 15 && spine.slice(0, 4).map((m) => m.id).join() === SPINE.join(),
    'the spine leads with the four a kingdom does anywhere, in the ladder\'s order ('
    + spine.length + ' rungs)');
  ok(spine.filter((m) => m.civil).length === 6,
    '  and carries the §211 civil band: government, region, court');
  ok(spine[1].requires[0] === 'mli_the_crowning' && spine[2].requires[0] === 'mli_the_crowning'
    && spine[3].requires[0] === 'mli_the_land',
    '  and its prerequisites are a subset of the old ladder (missionIdx keeps its meaning)');

  const seen = new Set();
  for (const id of CHAPTERS) {
    const branch = branchOf(id);
    ok(branch.length === 7, id + ' adds seven missions of its own (' + branch.length + ')');
    for (const m of branch) {
      ok(m.chapters.length === 1 && m.chapters[0] === id,
        '  ' + m.id + ' belongs to ' + id + ' alone');
      ok(!seen.has(m.id), '  ' + m.id + ' is a mission id nothing else claims');
      seen.add(m.id);
      ok(!!m.icon && typeof m.desc === 'string' && m.desc.length > 60 && !!m.rewardText
        && typeof m.check === 'function' && typeof m.reward === 'function',
        '  ' + m.id + ' carries icon, a desc that teaches the route, rewardText, check, reward');
      ok(Number.isFinite(m.col) && m.col >= 2 && m.col <= 3 && Number.isFinite(m.row),
        '  ' + m.id + ' seats itself in the branch columns: col ' + m.col + ', row ' + m.row);
    }
  }
  ok(seen.size === 42, 'forty-two chapter missions in all (' + seen.size + ')');

  for (const id of CHAPTERS) {
    const list = realm.chapterChain(crown.missions, id);
    const ids = list.map((m, i) => realm.missionId(m, i));
    ok(list.length === 22 && ids.slice(0, 4).join() === SPINE.join(),
      id + ': the chain is the spine, in table order, plus seven (' + list.length + ')');
    const foreign = list.filter((m) => Array.isArray(m.chapters) && m.chapters.indexOf(id) < 0);
    ok(!foreign.length, id + ': no other age\'s mission is offered here');
    const seats = list.map((m) => m.col + ':' + m.row);
    ok(new Set(seats).size === seats.length, id + ': every node seats in its own cell');
    const dangling = [];
    for (const m of list) {
      for (const rid of (m.requires || [])) if (ids.indexOf(String(rid)) < 0) dangling.push(m.id + '→' + rid);
    }
    ok(!dangling.length, id + ': every prerequisite is in this chapter\'s own chain ('
      + (dangling.join(', ') || 'all resolve') + ')');
  }
}

// ---------------------------------------------------------------- the engine
console.log('== §189 engine: the chapter filter is wired, and it only speaks when asked ==');
{
  for (const id of CHAPTERS) {
    const w = proclaim(id);
    const list = realm.missionsFor(w.ctx, 'MLI');
    ok(Array.isArray(list) && list.length === 22,
      id + ': the proclaimed crown is handed a twenty-two mission tree — no longer a '
      + 'stub beside the chapter it replaced (' + list.length + ')');
    ok(list === realm.missionsFor(w.ctx, 'MLI'),
      id + ': and the same array twice — the monthly pass and the panel agree');
    const mine = new Set(branchOf(id).map((m) => m.id));
    ok(list.filter((m) => mine.has(m.id)).length === 7,
      id + ': the seven it is handed are this chapter\'s');
  }
  const has = FORMABLES.find((f) => f.id === 'form_has_hyr');
  ok(realm.chapterChain(has.missions, '67bce') === has.missions,
    'a chain that names no chapters is handed back untouched (the Hasmonean crown)');
  const w = proclaim('66ce');
  ok(realm.chapterChain(crown.missions, 'nosuchchapter').length === 15,
    'and a chapter the crown does not belong to reads the spine alone');
  ok(!realm.missionsFor(w.ctx, 'NAB'), 'no chain is invented for a tag that has none');
}
{
  // What the panel is handed (SPEC §177's shape, for the crown's own tree).
  const w = proclaim('132ce');
  const view = gameActions(w.ctx).getMissions();
  ok(view.length === 22, 'the panel is handed the whole chapter tree (' + view.length + ' medallions)');
  const byId = {};
  for (const m of view) byId[m.id] = m;
  ok(byId.mli_the_crowning.status === 'current' && byId.mli_132_colony.status === 'locked',
    '  the crowning is the open root and the chapter branch waits on it');
  ok(byId.mli_132_third_house.requiresNames.join() === 'The Colony Unmade',
    '  prerequisites come back as names the panel can print');
  ok(view.every((m) => !m.hypothetical),
    '  and the crown\'s tree carries no roads not taken — those stay with the chapter\'s own side');
}

// ------------------------------------------------------------- no free lunch
console.log('== §189 live: proclamation accomplishes nothing on the branch ==');
for (const id of CHAPTERS) {
  const w = proclaim(id);
  w.game.tags.MLI.stability = 3;
  // Pump past the §207 rests: a spine mission satisfiable at the crowning
  // absorbs a pass, and a free branch node must not get to hide behind it.
  pump(w.ctx, 24);
  const mine = new Set(branchOf(id).map((m) => m.id));
  const free = [...doneSet(w.game)].filter((x) => mine.has(x));
  ok(!free.length, id + ': no chapter mission completes on the day of the crowning ('
    + (free.join(', ') || 'none') + ')');
}

// ------------------------------------------------------------ completability
// Build the world each branch names — provinces held, empires broken or bound,
// the treasury full, the communities won — and let the ordinary monthly pass
// pay for it. Anything that stays unpaid here is content no campaign can reach.
console.log('== §189 live: every chapter mission pays when its world arrives ==');
// The three §189 nodes each hand-built world below was written for. §211 grew
// every branch to seven, and the four it added reach for worlds this fixture
// does not build (a converted realm, the communities east, a treasury that has
// already paid for a harbour). Those are not unchecked: smoke138 proves ALL
// twenty-two nodes of every chapter's crown pay in a maximal realm, which is
// the stronger claim. What this suite still owns is that the §189 three pay
// off the specific world their descs name.
const ORIGINAL_BRANCH = {
  '167bce': ['mli_167_yoke', 'mli_167_isles', 'mli_167_bronze'],
  '67bce': ['mli_67_cities', 'mli_67_academies', 'mli_67_petra'],
  '40bce': ['mli_40_balsam', 'mli_40_harbour', 'mli_40_east'],
  '66ce': ['mli_66_coast', 'mli_66_unburned', 'mli_66_herodian'],
  '132ce': ['mli_132_colony', 'mli_132_third_house', 'mli_132_east'],
  '614ce': ['mli_614_altar', 'mli_614_exilarch', 'mli_614_south'],
};
function expectAllPaid(w, id) {
  pump(w.ctx, 40); // spine + branch, one §207 beat at a time
  const done = doneSet(w.game);
  const missing = ORIGINAL_BRANCH[id].filter((x) => !done.has(x));
  ok(!missing.length, id + ': the chapter\'s own three paid ('
    + (missing.length ? 'missing ' + missing.join(', ') : 'three done') + ')');
}

{ // 167 BCE — the Seleucid throne finished, the harbours taken, Rome friendly.
  const w = proclaim('167bce');
  grant(w.ctx, ['Jerusalem', 'Joppa', 'Azotus', 'Gaza']);
  w.game.tags.MLI.stability = 3;
  w.game.tags.SEL.alive = false;
  w.game.tags.ROM.opinion = Object.assign({}, w.game.tags.ROM.opinion, { MLI: 60 });
  expectAllPaid(w, '167bce');
}
{ // 67 BCE — the cities of the Jordan, Petra brought to heel, Babylonia answering.
  const w = proclaim('67bce');
  grant(w.ctx, ['Scythopolis', 'Pella', 'Gadara', 'Gerasa', 'Philadelphia', 'Petra', 'Bostra']);
  w.game.tags.MLI.stability = 3;
  stand(w.ctx, 'Babylon', 78);
  expectAllPaid(w, '67bce');
}
{ // 40 BCE — the groves, the harbour bought and built, the east bound in writing.
  const w = proclaim('40bce');
  grant(w.ctx, ['Jericho', 'Engaddi', 'Caesarea Maritima', 'Dora']);
  w.game.tags.MLI.stability = 3;
  w.game.tags.MLI.treasury = 900;
  w.game.tags.MLI.allies = ['PAR'];
  stand(w.ctx, 'Seleucia-Ctesiphon', 74);
  expectAllPaid(w, '40bce');
  // 900 banked, +120 from the groves, −250 sunk in the moles.
  ok(Math.round(w.game.tags.MLI.treasury) === 770, '  and the harbour was actually paid for ('
    + Math.round(w.game.tags.MLI.treasury) + ' talents left of 900)');
}
{ // 66 CE — the procurators' coast, the House unburned, the tetrarchy taken in.
  const w = proclaim('66ce');
  grant(w.ctx, ['Caesarea Maritima', 'Ptolemais', 'Joppa', 'Ascalon', 'Jerusalem',
    'Caesarea Philippi', 'Batanea', 'Tiberias']);
  w.game.tags.MLI.stability = 3;
  w.game.tags.MLI.treasury = 900;
  if (w.game.tags.AGR) w.game.tags.AGR.alive = false;
  ok(w.ctx.prov('Jerusalem').wonder === 'temple',
    '  the Second House is still standing in this chapter, as it is until 70');
  expectAllPaid(w, '66ce');
}
{ // 132 CE — the colony unmade, the House raised on a bare Mount, Rome two-handed.
  const w = proclaim('132ce');
  grant(w.ctx, ['Jerusalem', 'Caesarea Maritima', 'Sebaste', 'Emmaus', 'Lydda']);
  w.game.tags.MLI.stability = 3;
  w.game.tags.MLI.treasury = 900;
  w.game.tags.PAR.atWarWith = ['ROM'];
  ok(!w.ctx.prov('Jerusalem').wonder, '  the Mount starts bare in this chapter');
  expectAllPaid(w, '132ce');
  ok(w.ctx.prov('Jerusalem').wonder === 'temple', '  and the Third House now stands on it');
  ok(w.game.tags.MLI.treasury <= 900 - 300, '  paid for out of the treasury ('
    + Math.round(w.game.tags.MLI.treasury) + ' talents left of 900)');
}
{ // 132 CE again — a House the chapter's own side already raised is endowed,
  // not billed a second time (the crown must not charge for a standing Temple).
  const w = proclaim('132ce');
  grant(w.ctx, ['Jerusalem', 'Caesarea Maritima', 'Sebaste', 'Emmaus', 'Lydda']);
  w.game.tags.MLI.stability = 3;
  w.game.tags.MLI.treasury = 900;
  w.game.tags.PAR.atWarWith = ['ROM'];
  w.ctx.prov('Jerusalem').wonder = 'temple';
  pump(w.ctx, 40);
  ok(doneSet(w.game).has('mli_132_third_house'), '132ce: a standing House still completes it');
  ok(w.game.tags.MLI.treasury >= 900, '  and the silver stays banked ('
    + Math.round(w.game.tags.MLI.treasury) + ' talents)');
}
{ // 614 CE — the altar, the Exilarchate, and the road up from Arabia watched.
  const w = proclaim('614ce');
  grant(w.ctx, ['Jerusalem', 'Nehardea', 'Babylon', 'Aila', 'Petra', 'Bostra']);
  w.game.tags.MLI.stability = 3;
  w.game.tags.MLI.treasury = 900;
  w.ctx.helpers.spawnArmy(w.ctx, 'MLI', 'Jerusalem', { inf: 22 });
  expectAllPaid(w, '614ce');
  ok(w.ctx.prov('Jerusalem').wonder === 'temple',
    '  and the House stands on a Mount that has been empty since Titus');
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
