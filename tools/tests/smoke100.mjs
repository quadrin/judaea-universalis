// Headless regression — SPEC §151: the Keepers' roads, 531–614.
//
// SPEC §136 shipped a chapter whose every road was declared open. Five entries
// in `KNOWN_GAPS`, five roads that stopped at the phylarch in 531, and a
// chapter that ran to 614 with nothing in it after the second year. This suite
// holds the tail that closed them, and it holds the four things about the tail
// that would rot quietly:
//
//   1. The gap list is EMPTY for this chapter and every road ends at a card the
//      chain plays. smoke83 proves that structurally for the whole game; what
//      is asserted here is the chapter-specific claim — fourteen roads across
//      five forks, no gaps, which is the state §151 put it in.
//   2. The 551 easing is a mechanic and not a paragraph. The statute is the
//      chapter's enemy (§136) and Sergius' card must actually replace it;
//      refusing the relief must leave it exactly as it was.
//   3. Each fork is reachable in the world it was written for and in no other:
//      Ctesiphon after the rising is broken, the Taheb only once the phylarch
//      has been answered, and the no-king terminal only for a community that
//      declined the diadem in 529.
//   4. The chapter's last card obeys the chapter's own victory contract — it
//      counts PEOPLE, so it fires for a community with one province of its
//      Torah and no state at all, and retires when there is nobody left.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { BOOKMARK_529 } = await import(R + '/js/data/bookmark_529ce.js');
const { EVENTS_529_ROADS } = await import(R + '/js/data/events_529ce_roads.js');
const { CHAPTER_PATHS, KNOWN_GAPS } = await import(R + '/js/data/chapter_paths.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { checkTriggeredEvents } = await import(R + '/js/sim/events.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const flatGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const era529 = ERAS.find((e) => e.bookmark.id === '529ce');
const chapter = CHAPTER_PATHS.find((c) => c.id === '529ce');
const card = (id) => EVENTS_529_ROADS.find((e) => e && e.id === id) || null;

function boot({ y, m, flags } = {}) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_529);
  const events = era529.events;
  const game = initGame({
    DEFINES, MAP_DATA, geom: flatGeom, bookmark: BOOKMARK_529, events,
    playerTag: 'SAM', rngSeed: 17, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: flatGeom,
    bus: { emit() {}, on() { return () => {}; } },
    bookmark: BOOKMARK_529, events, provinceMap,
  });
  game.date = { y: y || 545, m: m || 6, d: 1 };
  const t = game.tags.SAM;
  if (t) { t.alive = true; t.ai = false; t.overlord = null; }
  for (const k of Object.keys(flags || {})) game.flags[k] = flags[k];
  return { game, ctx };
}

const mods = (game) => (game.tags.SAM.modifiers || []);
const mod = (game, id) => mods(game).find((x) => x && x.id === id) || null;
const opt = (c, re) => c.options[c.options.findIndex((o) => re.test(o.label))];

// ---------------------------------------------------------------------------
console.log('== the chapter has no open roads left ==');
{
  ok(EVENTS_529_ROADS.length === 9, 'the tail is nine cards ('
    + EVENTS_529_ROADS.length + ')');
  const registered = EVENTS_529_ROADS.filter((c) => era529.events.indexOf(c) >= 0);
  ok(registered.length === EVENTS_529_ROADS.length,
    '  and every one of them is registered in the chapter the header names');
  ok(KNOWN_GAPS.every((g) => g.chapter !== '529ce'),
    'the Keepers declare no gap (the five §136 entries are closed)');
  const roads = chapter.forks.flatMap((f) => f.roads);
  ok(chapter.forks.length === 5 && roads.length === 14,
    'the tree charts five forks and fourteen roads (' + chapter.forks.length + '/'
    + roads.length + ')');
  const open = roads.filter((r) => !r.terminal).map((r) => r.id);
  ok(!open.length, '  and every road ends somewhere (' + (open.join(', ') || 'none open') + ')');
  // The three forks §136 charted as design and left unwritten.
  for (const id of ['ctesiphon', 'the_two_houses', 'the_taheb']) {
    ok(chapter.forks.some((f) => f.id === id), '  the ' + id + ' fork exists');
  }
  const chainIds = new Set(era529.events.map((e) => e && e.id));
  const dangling = roads.filter((r) => !chainIds.has(r.terminal)).map((r) => r.terminal);
  ok(!dangling.length, '  and every terminal is a card the chapter plays ('
    + (dangling.join(', ') || 'all present') + ')');
}

// ---------------------------------------------------------------------------
console.log('== the 551 easing is a mechanic, not a paragraph ==');
{
  // The statute is the enemy of this chapter (SPEC §136): the war ends and it
  // does not. A card that says the disabilities were eased and leaves the
  // modifier untouched would be the chapter lying about its own subject.
  const c = card('ev529_sergius_of_caesarea');
  ok(!!c && c.date.y === 551 && c.world === true,
    'Sergius of Caesarea is dated 551 and is world history');
  const w = boot({ y: 551, m: 9 });
  const before = mod(w.game, 'the_statutes');
  ok(!!before && before.effects.incomeMult === 0.75,
    '  the statutes are still costing a quarter of the income when it fires');
  opt(c, /Take it\. A law half-lifted/).effects(w.ctx);
  ok(!mod(w.game, 'the_statutes'), '  taking the relief removes the statute modifier');
  const eased = mod(w.game, 'the_statutes_eased');
  ok(!!eased && eased.effects.incomeMult > 0.75 && eased.effects.unrestAll < 1.5,
    '  and replaces it with a lighter one that still bites (income '
    + (eased && eased.effects.incomeMult) + ', unrest ' + (eased && eased.effects.unrestAll) + ')');
  ok(!!w.game.flags.disabilitiesEased, '  and the record says the disabilities were eased');

  const r = boot({ y: 551, m: 9 });
  opt(c, /We will not be grateful/).effects(r.ctx);
  const kept = mod(r.game, 'the_statutes');
  ok(!!kept && kept.effects.incomeMult === 0.75,
    'refusing it leaves the statute exactly where it was');
  ok(!mod(r.game, 'the_statutes_eased') && !!r.game.flags.easingRefused,
    '  and buys a grievance instead, which is the trade the card offers');
}

// ---------------------------------------------------------------------------
console.log('== Ctesiphon is asked of the broken rising, and not before ==');
{
  const c = card('ev529_the_letter_to_ctesiphon');
  const w = boot({ y: 531, m: 3 });
  ok(c.trigger(w.ctx) === true, 'the letter is offered in 531');
  ok(c.options.length === 3, '  with three answers: the promise, the men, and the refusal');
  const early = boot({ y: 530, m: 6 });
  ok(c.trigger(early.ctx) === false, '  and not in 530, while the war is still being fought');

  // Each road moves the two courts that care, in opposite directions.
  const promise = boot({ y: 531, m: 3 });
  opt(c, /Fifty thousand men/).effects(promise.ctx);
  const sas = (promise.game.tags.SAS.opinion || {}).SAM || 0;
  const byz = (promise.game.tags.BYZ.opinion || {}).SAM || 0;
  ok(sas > 0 && byz < -160, 'the promise buys a friendly file in Ctesiphon (' + sas
    + ') and a worse one in Constantinople (' + byz + ')');
  const refuse = boot({ y: 531, m: 3 });
  const byzBefore = (refuse.game.tags.BYZ.opinion || {}).SAM || 0;
  opt(c, /a pretext/).effects(refuse.ctx);
  ok(((refuse.game.tags.BYZ.opinion || {}).SAM || 0) > byzBefore,
    '  and disowning the delegation is the only road the empire notices favourably');
  ok(!!refuse.game.flags.ctesiphonRefused && !refuse.game.flags.ctesiphonPromised,
    '  the two roads are mutually exclusive marks');
}

// ---------------------------------------------------------------------------
console.log('== 556: the one thing the two houses ever did together ==');
{
  const c = card('ev529_the_praetorium_at_caesarea');
  ok(!!c && c.date.y === 556 && c.date.m === 7,
    'the praetorium is dated to July 556, where Malalas puts it');
  const w = boot({ y: 556, m: 7 });
  const samOfJud = ((w.game.tags.SAM.opinion || {}).JUD) || 0;
  opt(c, /Both houses/).effects(w.ctx);
  const after = ((w.game.tags.SAM.opinion || {}).JUD) || 0;
  const judOfSam = ((w.game.tags.JUD.opinion || {}).SAM) || 0;
  ok(after > samOfJud && judOfSam > 0,
    'the joint rising moves BOTH communities toward each other (' + samOfJud + ' → '
    + after + ', and ' + judOfSam + ' the other way)');
  ok(!!w.game.flags.roseWithTheJews, '  and the road is marked');
  const shut = boot({ y: 556, m: 7 });
  opt(c, /Keep the quarter shut/).effects(shut.ctx);
  ok(((shut.game.tags.JUD.opinion || {}).SAM || 0) < 0
    && ((shut.game.tags.BYZ.opinion || {}).SAM || 0) > -160,
  'and holding the quarter indoors costs the other house and buys the empire');
}

// ---------------------------------------------------------------------------
console.log('== the Taheb waits for the rising to be over, and the priest says no ==');
{
  const c = card('ev529_the_taheb');
  const cold = boot({ y: 545, m: 1 });
  ok(c.trigger(cold.ctx) === false,
    'the restorer is not asked about while the phylarch\'s card is still open');
  const w = boot({ y: 545, m: 1, flags: { phylarchAnswered: true } });
  ok(c.trigger(w.ctx) === true, '  and is asked once the rising has been answered');
  const before = w.ctx.helpers.faction(w.ctx, 'SAM', 'priesthood');
  opt(c, /Fanuta is over/).effects(w.ctx);
  const after = w.ctx.helpers.faction(w.ctx, 'SAM', 'priesthood');
  ok(Number.isFinite(before) && Number.isFinite(after) && after < before,
    'proclaiming him costs the Eleazarite line, which will not certify a claim it cannot test ('
    + before + ' → ' + after + ')');
  ok(!!w.game.flags.tahebProclaimed && !!mod(w.game, 'the_rahuta'),
    '  and the age is declared turned, with the modifier that says what that does to a people');
  const held = boot({ y: 545, m: 1, flags: { phylarchAnswered: true } });
  opt(c, /The age is not the age/).effects(held.ctx);
  ok(!!held.game.flags.tahebAwaited && !!mod(held.game, 'the_office_kept_open'),
    'declining to certify keeps the office open rather than closing the question');
}

// ---------------------------------------------------------------------------
console.log('== the road with no king on it gets its own ending ==');
{
  const c = card('ev529_the_office_they_never_filled');
  const crowned = boot({ y: 575, m: 6, flags: { kingAtNeapolis: true, niciasKilled: true } });
  ok(c.trigger(crowned.ctx) === false,
    'a community that crowned a man in 529 is never asked about the empty office');
  const refused = boot({ y: 575, m: 6, flags: { crownRefused: true } });
  ok(c.trigger(refused.ctx) === true, '  and one that declined the diadem is');
  opt(c, /Crown one now/).effects(refused.ctx);
  ok(!!refused.game.flags.crownedAtLast && !!mod(refused.game, 'a_head_at_last'),
    '  and may still take one, forty-four years late, which is how the road ends');
  ok(!mod(refused.game, 'no_head_to_take'),
    '  the thing the refusal bought is given up in the same breath');
}

// ---------------------------------------------------------------------------
console.log('== the last card counts people, like the contract it closes ==');
{
  const c = card('ev529_what_the_villages_kept');
  ok(!!c && c.date.y === chapter.lastYear && c.world === true,
    'the chapter\'s last card lands on its last year (' + c.date.y + ')');
  // No state, one province of the Torah in somebody else's hands: this chapter
  // is the one whose verdict still fires there (SPEC §136).
  const remnant = boot({ y: 614, m: 3 });
  for (let i = 1; i < remnant.game.provinces.length; i++) {
    const p = remnant.game.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner === 'SAM') { p.owner = 'BYZ'; p.controller = 'BYZ'; }
    if (p.religion === 'samaritanism' && p.name !== 'Jenin') p.religion = 'christianity';
  }
  ok(c.when(remnant.ctx) === true,
    '  and it is still asked of a community that has lost the state and kept the calendar');
  const gone = boot({ y: 614, m: 3 });
  for (let i = 1; i < gone.game.provinces.length; i++) {
    const p = gone.game.provinces[i];
    if (p && p.religion === 'samaritanism') p.religion = 'christianity';
  }
  ok(c.when(gone.ctx) === false,
    '  and retired rather than fired into a chapter with nobody left in it');
}

// ---------------------------------------------------------------------------
console.log('== eighty-five years of trigger checks raise no guarded failure ==');
{
  const w = boot({ y: 529, m: 3 });
  const warns = [];
  const realWarn = console.warn;
  console.warn = (...a) => warns.push(a.join(' '));
  try {
    for (let y = 529; y <= 614; y++) {
      for (let m = 1; m <= 12; m++) {
        w.game.date = { y, m, d: 1 };
        checkTriggeredEvents(w.ctx);
        w.game.pendingEvents.length = 0;
      }
    }
  } finally { console.warn = realWarn; }
  const bad = warns.filter((s) => /events_529ce/.test(s));
  ok(bad.length === 0, 'the whole chapter is walked month by month without one'
    + (bad.length ? ' (' + bad[0] + ')' : ''));
}

console.log(failures ? `smoke100: ${failures} FAIL` : 'smoke100: ALL PASS');
process.exit(failures ? 1 : 0);
