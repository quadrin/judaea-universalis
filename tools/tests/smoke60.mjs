// Headless regression — SPEC §85: the doctrine axes. The game already wrote
// its memory as opposed pairs of narrative flags; this suite proves the axes
// read them back — that opposed choices cancel, that only
// choice-discriminating flags count, that content can push an axis without a
// flag, that the scores clamp, and that a save round-trip keeps the explicit
// pushes while the flag-derived half is recomputed from scratch.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { initGame, makeCtx, reviveGame, simHelpers: helpers } = await import(R + '/js/sim/init.js');
const {
  AXES, AXIS_MAX, FLAG_AXES, doctrineScores, axisOf, pushDoctrine,
  doctrineView, doctrineEpithet, axisBand, lean,
} = await import(R + '/js/sim/doctrine.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const fakeGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const bus = { emit() {}, on() { return () => {}; } };

const g = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_167, events: [],
  playerTag: 'HAS', rngSeed: 7,
});
const ctx = makeCtx({
  game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_167, events: [],
});

console.log('== the axes exist and start silent ==');
{
  ok(AXES.length === 4, 'four axes');
  const ids = AXES.map((a) => a.id).sort().join(',');
  ok(ids === 'alignment,authority,conquest,zeal', 'zeal, alignment, authority, conquest');
  const s = doctrineScores(ctx);
  ok(AXES.every((a) => s[a.id] === 0), 'a fresh campaign has committed to nothing');
  const v = doctrineView(ctx);
  ok(v && v.decided === 0, 'the view reports nothing decided');
  ok(v.axes.every((a) => a.band === 'mid' && a.label === 'Undecided'),
    'every needle sits at the center post');
  ok(doctrineEpithet(ctx) === '', 'a realm with no convictions has no epithet');
}

console.log('== flags move the needle, and opposed flags cancel ==');
{
  helpers.setFlag(ctx, 'lawIsAWall', true);
  ok(axisOf(ctx, 'zeal') === 2, 'the Law as a wall pushes zeal to +2');
  ok(helpers.axis(ctx, 'zeal') === 2, 'the helper contract reads the same number');
  helpers.setFlag(ctx, 'gerizimRazed', true);
  ok(axisOf(ctx, 'zeal') === 4, 'razing Gerizim compounds it to +4');
  ok(axisOf(ctx, 'alignment') === 0, 'an unrelated axis is untouched');
  // The opposed pair the content already wrote: a realm that did both is a
  // realm that decided neither.
  helpers.setFlag(ctx, 'lawIsAGate', true);
  helpers.setFlag(ctx, 'gerizimSpared', true);
  ok(axisOf(ctx, 'zeal') === 0, 'the opposed choices cancel exactly');
  helpers.setFlag(ctx, 'lawIsAGate', false);
  helpers.setFlag(ctx, 'gerizimSpared', false);
  ok(axisOf(ctx, 'zeal') === 4, 'a false flag counts as unset, not as its opposite');
}

console.log('== multi-axis flags land on every axis they name ==');
{
  helpers.setFlag(ctx, 'idumeaTributary', true);
  ok(axisOf(ctx, 'zeal') === 3, 'tributaries-not-brethren softens zeal by 1');
  ok(axisOf(ctx, 'conquest') === -1, '...and leans the same choice toward the purse');
}

console.log('== bands, labels and the lean() gate ==');
{
  ok(axisBand(0) === 'mid' && axisBand(1) === 'mid', 'the center band is genuinely middling');
  ok(axisBand(2) === 'hi' && axisBand(-2) === 'lo', 'two points is a commitment');
  ok(axisBand(6) === 'strongHi' && axisBand(-6) === 'strongLo', 'six is a conviction');
  ok(lean(ctx, 'zeal', 1) === true, 'a +3 realm leans zealous');
  ok(lean(ctx, 'zeal', 1, true) === false, '...but not wholly');
  ok(lean(ctx, 'zeal', -1) === false, 'it does not lean accommodating');
  const v = doctrineView(ctx);
  const zeal = v.axes.find((a) => a.id === 'zeal');
  ok(zeal.marks.length >= 2, 'the view lists the decisions that moved the axis');
  ok(zeal.marks.every((m) => typeof m.text === 'string' && m.text.length > 0),
    'every mark carries its printed line');
  ok(doctrineEpithet(ctx).length > 0, 'a committed realm has an epithet');
}

console.log('== only choice-discriminating flags are mapped ==');
{
  // `templeRededicated` is set by BOTH options of its event: it records that
  // the rededication happened, not what was chosen. Mapping it would measure
  // the calendar rather than the player.
  for (const flag of ['templeRededicated', 'vespasianArrived', 'masadaFallen',
    'antiochusDead', 'herodKing', 'secondKingdom', 'firstFitna']) {
    ok(FLAG_AXES[flag] === undefined, flag + ' is not an axis flag (both options set it)');
  }
  ok(FLAG_AXES.gerizimRazed && FLAG_AXES.gerizimSpared, 'the opposed pairs are mapped');
}

console.log('== content can push an axis with no flag at all ==');
{
  const before = axisOf(ctx, 'alignment');
  helpers.doctrine(ctx, 'alignment', -4);
  ok(axisOf(ctx, 'alignment') === before - 4, 'an explicit push moves the axis');
  ok(g.doctrine && g.doctrine.alignment === -4, '...and persists on game.doctrine');
  pushDoctrine(ctx, 'notAnAxis', 5);
  ok(!g.doctrine.notAnAxis, 'an unknown axis is refused, not invented');
  helpers.doctrine(ctx, 'alignment', 4);
  ok(axisOf(ctx, 'alignment') === before, 'pushes are reversible');
}

console.log('== the scores clamp at the ends ==');
{
  helpers.doctrine(ctx, 'authority', 50);
  ok(axisOf(ctx, 'authority') === AXIS_MAX, 'a runaway push clamps to +' + AXIS_MAX);
  helpers.doctrine(ctx, 'authority', -100);
  ok(axisOf(ctx, 'authority') === -AXIS_MAX, '...and to -' + AXIS_MAX + ' the other way');
  helpers.doctrine(ctx, 'authority', 100);
  ok(axisOf(ctx, 'authority') === AXIS_MAX,
    'the stored push is itself bounded, so the needle can be driven back');
}

console.log('== a save round-trip keeps the character ==');
{
  const zealBefore = axisOf(ctx, 'zeal');
  const authBefore = axisOf(ctx, 'authority');
  const loaded = reviveGame(JSON.parse(JSON.stringify(g)));
  const ctx2 = makeCtx({
    game: loaded, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_167, events: [],
  });
  ok(axisOf(ctx2, 'zeal') === zealBefore, 'the flag-derived half survives (recomputed, not stored)');
  ok(axisOf(ctx2, 'authority') === authBefore, 'the explicit pushes survive on game.doctrine');
}

console.log('== an older save with no doctrine block reads as silence ==');
{
  const old = JSON.parse(JSON.stringify(g));
  delete old.doctrine;
  old.flags = {};
  const ctxOld = makeCtx({
    game: old, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_167, events: [],
  });
  const s = doctrineScores(ctxOld);
  ok(AXES.every((a) => s[a.id] === 0), 'no migration needed: an absent block is all zeros');
  ok(doctrineView(ctxOld).decided === 0, 'and the panel simply shows an undecided realm');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
