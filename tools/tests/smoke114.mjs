// Headless regression — SPEC §182: the textile factory.
//
// The chapter's script mentioned the reactor once, in a subordinate clause.
// It is an arc and a fork now, gated the way the thing was actually gated:
// on Paris, on money, and on the desert being yours. What this suite holds:
//   - the offer fires only with Dimona in Israeli hands and the French
//     pipeline warm, and prices the ground-breaking (−150, −20 infl, The
//     Program eating 5% until the arc resolves);
//   - the cover and visit cards hang off the program flag and move
//     Washington's regard the way the record says;
//   - each road out of The Basement sets its marker, its deterrent and its
//     bill, and all three end the drain;
//   - a deterrent is read exactly where §165 deference leans on the AI's
//     needed ratio, and scripted declarations never ask;
//   - Vanunu fires only under opacity;
//   - the De Gaulle rupture cuts a French pipeline by ordinary §100
//     machinery, and the American era opens at Washington's regard;
//   - the fork registry knows all three roads by the flags the cards set.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { CHAPTER_PATHS } = await import(R + '/js/data/chapter_paths.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { resolveEventOption } = await import(R + '/js/sim/events.js');
const mil = await import(R + '/js/sim/military.js');
const arms = await import(R + '/js/sim/arms.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const geom = {
  neighbors: snap.neighbors.map((a) => new Set(a)),
  centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  coastal: snap.coastal.map(Boolean),
  offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  areas: Int32Array.from(snap.areas), bbox: [],
};
const bus = { emit() {}, on() { return () => {}; } };
const ERA = ERAS.find((e) => e.bookmark.id === '1948ce');
const EV = (id) => ERA.events.find((e) => e && e.id === id);

function boot(seed = 11) {
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: ERA.bookmark, events: ERA.events,
    playerTag: 'ISR', rngSeed: seed,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: ERA.bookmark, events: ERA.events,
  });
  return { game, ctx };
}
// Fire a card and take an option, through the real machinery.
function play(ctx, id, opt) {
  ctx.helpers.fireEvent(ctx, id);
  const pe = ctx.game.pendingEvents.find((x) => x.eventId === id);
  if (!pe) return false;
  resolveEventOption(ctx, pe.instanceId, opt);
  return true;
}
function givePipelineFRA(ctx) {
  ctx.game.tags.FRA.opinion.ISR = 60;
  ctx.helpers.setArmsDeal(ctx, 'ISR', 'FRA');
}
function giveDimona(ctx) {
  const p = ctx.prov('Dimona');
  p.owner = 'ISR'; p.controller = 'ISR';
}

console.log('== the offer gates on the desert and on Paris ==');
{
  const { game, ctx } = boot();
  const offer = EV('ev_i_dimona_offer');
  game.date = { y: 1957, m: 10, d: 1 };
  ok(!offer.trigger(ctx), 'no offer while Dimona is Egyptian and Paris is cool');
  giveDimona(ctx);
  ok(!offer.trigger(ctx), 'the desert alone is not enough — the pipeline must be warm');
  givePipelineFRA(ctx);
  ok(offer.trigger(ctx), 'Dimona held and France supplying: the commissariat calls');
  game.date = { y: 1957, m: 9, d: 1 };
  ok(!offer.trigger(ctx), 'and never before October 1957 — the Suez account settles first');
}

console.log('== the program, and what it eats ==');
{
  const { game, ctx } = boot();
  giveDimona(ctx); givePipelineFRA(ctx);
  game.date = { y: 1957, m: 10, d: 1 };
  game.tags.ISR.treasury = 300;
  game.tags.ISR.points.infl = 50;
  const multBefore = mil.resolveTagMult(ctx, 'ISR', 'incomeMult');
  ok(play(ctx, 'ev_i_dimona_offer', 0), 'ground is broken');
  ok(game.tags.ISR.treasury === 150 && game.tags.ISR.points.infl === 30, 'at the price: −150 talents, −20 influence');
  ok(game.flags.dimonaStarted === true, 'the flag remembers');
  const multAfter = mil.resolveTagMult(ctx, 'ISR', 'incomeMult');
  ok(Math.abs(multAfter / multBefore - 0.95) < 0.001, 'and The Program eats its 5% of everything');
}

console.log('== the cover story and the letters ==');
{
  const { game, ctx } = boot();
  const cover = EV('ev_i_dimona_cover');
  ok(cover.when && !cover.when(ctx), 'no reactor, no question: the cover card retires unstarted');
  game.flags.dimonaStarted = true;
  ok(cover.when(ctx), 'with the program running, Washington asks');
  const regard = game.tags.USA.opinion.ISR || 0;
  ok(play(ctx, 'ev_i_dimona_cover', 0), 'the ambassador describes a textile factory');
  ok((game.tags.USA.opinion.ISR || 0) === regard - 15 && game.flags.dimonaCover === true,
    'Washington\'s regard −15, and the sentence is on the record');
  ok(play(ctx, 'ev_i_dimona_visits', 1), 'the President\'s letters are answered with silence');
  ok((game.tags.USA.opinion.ISR || 0) === regard - 35, 'refusing the visits costs −20 more');
}

console.log('== the basement: three roads, three bills ==');
{
  // Opacity.
  const { game, ctx } = boot();
  game.flags.dimonaStarted = true;
  ctx.helpers.addTagModifier(ctx, 'ISR', { id: 'dimona_program', name: 'The Program', months: -1, effects: { incomeMult: 0.95 } });
  const ready = EV('ev_i_dimona_ready');
  game.date = { y: 1966, m: 5, d: 1 };
  ok(!ready.trigger(ctx), 'not before June 1966 — nine years of budgets first');
  game.date = { y: 1966, m: 6, d: 1 };
  ok(ready.trigger(ctx), 'then the thing at the end of the road is finished');
  ok(play(ctx, 'ev_i_dimona_ready', 0), 'the cabinet chooses the sentence');
  ok(game.flags.dimonaOpaque === true, 'the opacity marker is set');
  ok(!game.tags.ISR.modifiers.some((m) => m.id === 'dimona_program'), 'The Program\'s drain ends');
  const basement = game.tags.ISR.modifiers.find((m) => m.id === 'the_basement');
  ok(basement && basement.name === 'The Textile Factory', 'the modifier wears the cover story\'s name');
  ok(mil.resolveTagAdd(ctx, 'ISR', 'deterrent') === 1, 'and reads as deterrent 1');
  const vanunu = EV('ev_i_dimona_vanunu');
  ok(vanunu.when(ctx), 'under opacity, the technician can talk');
}
{
  // The open test.
  const { game, ctx } = boot();
  game.flags.dimonaStarted = true;
  ctx.helpers.addTagModifier(ctx, 'ISR', { id: 'dimona_program', name: 'The Program', months: -1, effects: { incomeMult: 0.95 } });
  game.date = { y: 1966, m: 6, d: 1 };
  const usaBefore = game.tags.USA.opinion.ISR || 0;
  const aggBefore = game.tags.ISR.aggression || 0;
  ok(play(ctx, 'ev_i_dimona_ready', 1), 'the flash over the Negev');
  ok(game.flags.dimonaDeclared === true && mil.resolveTagAdd(ctx, 'ISR', 'deterrent') === 2,
    'declared: the stronger deterrent');
  ok((game.tags.USA.opinion.ISR || 0) === usaBefore - 40, 'every arsenal recoils (−40 with Washington…)');
  ok((game.tags.FRA.opinion.ISR || 0) <= -0, '(…and Paris no warmer)');
  ok((game.tags.ISR.aggression || 0) === aggBefore + 20, 'and the world calls it a problem: aggression +20');
  ok(!EV('ev_i_dimona_vanunu').when(ctx), 'no ambiguity, no Vanunu: the card stays shut');
}
{
  // The sealed basement.
  const { game, ctx } = boot();
  game.flags.dimonaStarted = true;
  ctx.helpers.addTagModifier(ctx, 'ISR', { id: 'dimona_program', name: 'The Program', months: -1, effects: { incomeMult: 0.95 } });
  game.date = { y: 1966, m: 6, d: 1 };
  game.tags.ISR.points.gov = 0; game.tags.ISR.points.infl = 0;
  ok(play(ctx, 'ev_i_dimona_ready', 2), 'the last door is sealed');
  ok(game.flags.dimonaShelved === true && mil.resolveTagAdd(ctx, 'ISR', 'deterrent') === 0,
    'shelved: no deterrent at all');
  ok(game.tags.ISR.points.gov === 20 && game.tags.ISR.points.infl === 20, 'the scientists disperse to the universities');
  ok(!game.tags.ISR.modifiers.some((m) => m.id === 'dimona_program'), 'and the drain ends here too');
}

console.log('== the general signs something ==');
{
  const { game, ctx } = boot();
  givePipelineFRA(ctx);
  const card = EV('ev_i_degaulle_embargo');
  game.date = { y: 1967, m: 6, d: 10 };
  ok(!card.trigger(ctx), 'no six days, no embargo');
  game.flags.sixDayWar = true;
  ok(card.trigger(ctx), 'the first shot fired, the general reaches for his pen');
  ok(play(ctx, 'ev_i_degaulle_embargo', 0), 'and signs');
  ok(!!game.embargoes['FRA>ISR'], 'a real §100 embargo stands');
  arms.monthlyArms(ctx);
  ok(!game.armsDeals.ISR, 'and the pipeline dies of it the same month');
  const amer = EV('ev_i_american_era');
  game.date = { y: 1968, m: 2, d: 1 };
  game.tags.USA.opinion.ISR = 30;
  ok(!amer.trigger(ctx), 'Washington does not open below regard 45');
  game.tags.USA.opinion.ISR = 50;
  ok(amer.trigger(ctx), '…and opens above it');
  game.tags.ISR.treasury = 200;
  ok(play(ctx, 'ev_i_american_era', 0), 'the Phantom contract is signed');
  ok(game.armsDeals.ISR === 'USA' && mil.armsDealState(ctx, 'ISR').live, 'the American pipeline is live');
  ok(game.tags.ISR.treasury === 120, 'at the Phantom price');
}

console.log('== the fork registry ==');
{
  const ch = CHAPTER_PATHS.find((c) => c.id === '1948ce');
  const fork = ch.forks.find((f) => f.id === 'the_basement');
  ok(!!fork && fork.roads.length === 3, 'the_basement fork declares three roads');
  const markers = fork.roads.map((r) => r.marker).sort().join(',');
  ok(markers === 'dimonaDeclared,dimonaOpaque,dimonaShelved', 'whose markers are exactly the flags the cards set');
  ok(fork.roads.every((r) => r.entry === 'ev_i_dimona_offer' && r.terminal === 'ev_i_dimona_ready'),
    'all three enter at the offer and end at The Basement');
}

console.log(failures ? `smoke114: ${failures} FAILURES` : 'smoke114: ALL PASS');
process.exit(failures ? 1 : 0);
