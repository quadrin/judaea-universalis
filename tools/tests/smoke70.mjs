// Headless regression — the missing early-bookmark content tranche:
// Jannaeus's civil-war arc, both sects at both 67 BCE courts, and the
// national delegation that asked Pompey for neither brother.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { EVENTS_167 } = await import(R + '/js/data/events_167bce.js');
const { BOOKMARK_67 } = await import(R + '/js/data/bookmark_67bce.js');
const { EVENTS_67 } = await import(R + '/js/data/events_67bce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');

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
const bus = { emit() {}, on() { return () => {}; } };

function boot(bookmark, events, playerTag, seed) {
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark, events,
  });
  ctx.dynEvents = new Map();
  return { game, ctx, actions: gameActions(ctx) };
}
function ev(list, id) {
  return list.find((e) => e && e.id === id);
}
function mod(tag, id) {
  return (tag.modifiers || []).find((m) => m && m.id === id);
}

console.log('== the absent 103–76 BCE bridge is now a four-card spine ==');
{
  const ids = ['ev_etrogim', 'ev_demetrius_invited', 'ev_eight_hundred', 'ev_deathbed_advice'];
  const cards = ids.map((id) => ev(EVENTS_167, id));
  ok(cards.every(Boolean), 'all four Jannaeus cards exist');
  ok(cards.every((e) => e.major && e.aiOption === 0 && e.historical && e.historical.length > 60),
    'each card marks its historical course and source caveat');
  ok(cards[0].date.y === -94 && cards[3].date.y === -76,
    'the bridge runs from the citron riot to Salome Alexandra');
  ok(typeof cards[1].trigger === 'function' && typeof cards[2].trigger === 'function',
    'the middle cards are consequences, not bare calendar gifts');
}

console.log('== the historical Jannaeus course has real state consequences ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_167, EVENTS_167, 'HAS', 7001);
  const t = game.tags.HAS;
  const court = actions.getFactions();
  ok(court && court.length === 3, 'the Hasmonean court is active');
  ctx.helpers.setFlag(ctx, 'jannaeusKing', true);

  const citrons = ev(EVENTS_167, 'ev_etrogim');
  const legit0 = t.legitimacy;
  const authority0 = ctx.helpers.axis(ctx, 'authority');
  citrons.options[0].effects(ctx);
  ok(t.legitimacy === legit0 - 20 && !!game.flags.etrogimSpilled,
    'clearing the court costs legitimacy and opens the civil war');
  ok(Math.round(t.factions.hasideans) === 20 && Math.round(t.factions.warparty) === 65,
    'the pious and the captains divide over the slaughter');
  ok(mod(t, 'slaughter_at_the_feast')?.months === 36
    && mod(t, 'slaughter_at_the_feast')?.effects.unrestAll === 2,
  'the feast leaves three years of unrest');
  ok(ctx.helpers.axis(ctx, 'authority') === authority0 + 2,
    'the mercenary answer moves authority toward the crown');

  game.date = { y: -88, m: 1, d: 1 };
  const demetrius = ev(EVENTS_167, 'ev_demetrius_invited');
  ok(demetrius.trigger(ctx), 'the appeal to Demetrius follows only after the riot and its war');
  const legit1 = t.legitimacy;
  demetrius.options[0].effects(ctx);
  ok(t.legitimacy === legit1 + 15 && !!game.flags.defectorsReturned,
    'the returning six thousand restore legitimacy and advance the chain');
  ok(Object.values(game.armies).some((a) => a && a.tag === 'HAS'
    && a.name === 'The Six Thousand' && a.regiments.inf === 6),
  'the six thousand appear as an actual six-regiment army');

  game.date = { y: -88, m: 6, d: 1 };
  const crosses = ev(EVENTS_167, 'ev_eight_hundred');
  ok(crosses.trigger(ctx), 'the executions wait for the defectors and the later date');
  t.manpower = 12000;
  crosses.options[0].effects(ctx);
  ok(t.manpower === 4000 && !!game.flags.lionOfWrath,
    'the exiles leave the manpower pool and the historical flag is set');
  ok(mod(t, 'the_lion_of_wrath')?.months === -1
    && mod(t, 'the_lion_of_wrath')?.effects.disciplineMult === 1.1,
  'the terror is a permanent discipline bargain with permanent unrest');
}

console.log('== the deathbed choice installs Salome and distinguishes her settlement ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_167, EVENTS_167, 'HAS', 7002);
  actions.getFactions();
  ctx.helpers.setFlag(ctx, 'jannaeusKing', true);
  const before = ctx.helpers.axis(ctx, 'authority');
  ev(EVENTS_167, 'ev_deathbed_advice').options[0].effects(ctx);
  const t = game.tags.HAS;
  ok(t.ruler.name === 'Salome Alexandra' && t.heir.name === 'Hyrcanus II',
    'the crown and succession pass to Salome and Hyrcanus');
  ok(!!game.flags.queensPeace && mod(t, 'the_queens_peace')?.effects.unrestAll === -1,
    'the reconciliation creates the Queen’s Peace');
  ok(ctx.helpers.axis(ctx, 'authority') === before - 3,
    'the settlement moves authority toward the council');
}

console.log('== both sects now contest both brothers’ courts ==');
for (const [tag, pharisees, sadducees] of [
  ['HYR', 70, 30],
  ['ARI', 25, 75],
]) {
  const { actions } = boot(BOOKMARK_67, EVENTS_67, tag, tag === 'HYR' ? 7003 : 7004);
  const rows = actions.getFactions();
  const p = rows.find((r) => r.id === 'pharisees');
  const s = rows.find((r) => r.id === 'sadducees');
  ok(rows.length === 4 && p && s, tag + ' seats both Pharisees and Sadducees');
  ok(p.approval === pharisees && s.approval === sadducees,
    tag + ' opens with its historical political asymmetry (' + pharisees + '/' + sadducees + ')');
}

console.log('== the third embassy is its own playable decision ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_67, EVENTS_67, 'HYR', 7005);
  const t = game.tags.HYR;
  actions.getFactions();
  game.flags.pompeyCame = true;
  const third = ev(EVENTS_67, 'ev4_the_third_embassy');
  ok(third && third.trigger(ctx), 'the national delegation arrives once Pompey and both brothers are present');
  const legit0 = t.legitimacy;
  const opinion0 = game.tags.ROM.opinion.HYR;
  const authority0 = ctx.helpers.axis(ctx, 'authority');
  third.options[0].effects(ctx);
  ok(t.legitimacy === legit0 + 10 && !!game.flags.thirdEmbassy,
    'hearing the delegation records the historical choice');
  ok(t.factions.pharisees === 90 && t.factions.sadducees === 20,
    'letting it speak rewards the sages and alarms the great houses');
  ok(game.tags.ROM.opinion.HYR === Math.min(200, (opinion0 || 0) + 20),
    'Rome notices the appearance of consent');
  ok(ctx.helpers.axis(ctx, 'authority') === authority0 - 3,
    'the plea for priestly government moves the realm toward the council');
}
{
  const { game, ctx, actions } = boot(BOOKMARK_67, EVENTS_67, 'ARI', 7006);
  const t = game.tags.ARI;
  actions.getFactions();
  game.flags.pompeyCame = true;
  const before = ctx.helpers.axis(ctx, 'authority');
  ev(EVENTS_67, 'ev4_the_third_embassy').options[1].effects(ctx);
  ok(t.factions.pharisees === 5 && !!game.flags.thirdEmbassySilenced,
    'Aristobulus can instead silence the delegation and alienate the Pharisees');
  ok(mod(t, 'the_silenced_embassy')?.months === 24
    && mod(t, 'the_silenced_embassy')?.effects.unrestAll === 1,
  'the arrest creates the promised two years of unrest');
  ok(ctx.helpers.axis(ctx, 'authority') === before + 2,
    'silencing it moves authority toward the crown');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
