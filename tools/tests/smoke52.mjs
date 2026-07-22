// Headless regression — the yoke settles the quarrel (SPEC §75).
//  1. declareWar refuses a war between a crown and its own client while the
//     bond stands — the independence rising (which severs first) remains the
//     one legal road.
//  2. The Parthian flood respects a settled house: no Antigonus coup inside
//     a client court, no scripted fraternal war, no Parthian invasion of a
//     court that answers to its brother — while the Syrian (Roman) front
//     still opens.
//  3. Dated chapters declare the world they require (`when`): with the house
//     under one roof, the night flight, Herod's crown and Sosius' expedition
//     retire silently instead of hijacking a client court.
//  4. Incorporation survives ordinary cooling: begun at devotion, it holds
//     until real disaffection (keep threshold), and the weaving itself tends
//     the client's opinion instead of letting it drift to indifference.
import { readFileSync } from 'node:fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_67 } = await import(R + '/js/data/bookmark_67bce.js');
const { EVENTS_67 } = await import(R + '/js/data/events_67bce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const { checkDateEvents } = await import(R + '/js/sim/events.js');
const { monthlyOpinionDrift } = await import(R + '/js/sim/unrest.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const N = MAP_DATA.provinces.length;
const bus = { emit() {}, on() { return () => {}; } };
function boot(playerTag, seed) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_67);
  const geom = {
    neighbors: snap.neighbors.map((arr) => new Set(arr)),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [], coastal: snap.coastal || [], offshore: [],
  };
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_67, events: EVENTS_67,
    playerTag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_67,
    events: EVENTS_67, provinceMap,
  });
  return { game, ctx };
}
function warOf(game, a, b) {
  return (game.wars || []).find((w) => {
    const all = (w.attackers || []).concat(w.defenders || []);
    return all.includes(a) && all.includes(b);
  }) || null;
}
function vassalize(ctx, lord, client) {
  const g = ctx.game;
  const brothers = warOf(g, 'HYR', 'ARI');
  if (brothers) mil.dissolveWar(ctx, brothers);
  delete g.truces[client < lord ? client + '|' + lord : lord + '|' + client];
  g.tags[client].overlord = lord;
}
function effect(id, ctx, idx) {
  const ev = EVENTS_67.find((e) => e && e.id === id);
  ev.options[idx == null ? (ev.aiOption || 0) : idx].effects(ctx);
}

console.log('== the bond refuses the sword ==');
{
  const { game, ctx } = boot('ARI', 61);
  vassalize(ctx, 'ARI', 'HYR');
  const war = mil.declareWar(ctx, 'ARI', 'HYR', 'A War That Must Not Be');
  ok(war === null && !warOf(game, 'ARI', 'HYR'),
    'an overlord cannot declare war on its own client');
  const rev = mil.declareWar(ctx, 'HYR', 'ARI', 'A Rising Without a Severing');
  ok(rev === null, 'nor a client on its overlord — the independence rising severs first');
  game.tags.HYR.overlord = null; // the rising's severing
  const free = mil.declareWar(ctx, 'HYR', 'ARI', 'The War of Independence');
  ok(!!free, 'with the bond severed, the war of independence declares normally');
}

console.log('== the Parthian flood respects a settled house ==');
{
  const { game, ctx } = boot('ARI', 62);
  vassalize(ctx, 'ARI', 'HYR');
  const rulerBefore = game.tags.ARI.ruler && game.tags.ARI.ruler.name;
  effect('ev4_parthian_flood', ctx);
  ok(!!warOf(game, 'PAR', 'ROM'), 'Parthia still crosses the Euphrates against Rome');
  ok(!warOf(game, 'PAR', 'HYR'),
    'a Hyrcanid court under its brother\'s roof is not Rome\'s client to invade');
  ok(!warOf(game, 'ARI', 'HYR'), 'no scripted fraternal war splits the settled house');
  ok(game.tags.ARI.ruler && game.tags.ARI.ruler.name === rulerBefore,
    'no Antigonus coup rewrites the sovereign\'s court (' + rulerBefore + ' still rules)');
}

console.log('== dated chapters retire when the world no longer fits ==');
{
  const { game, ctx } = boot('ARI', 63);
  vassalize(ctx, 'ARI', 'HYR');
  const hyrRuler = game.tags.HYR.ruler && game.tags.HYR.ruler.name;
  game.date = { y: -37, m: 6, d: 1 }; // past the flood, the flight, the crown and Sosius
  checkDateEvents(ctx);
  ok(!!game.firedEvents.ev4_night_flight
    && !game.pendingEvents.some((pe) => pe.eventId === 'ev4_night_flight'),
  'the night flight retires silently — no card, no betrayal narrated');
  ok(!!game.firedEvents.ev4_king_without_kingdom
    && game.tags.HYR.ruler && game.tags.HYR.ruler.name === hyrRuler,
  'Herod is not crowned by script inside our client\'s court');
  ok(!!game.firedEvents.ev4_siege_37 && !warOf(game, 'ROM', 'ARI') && !warOf(game, 'HYR', 'ARI'),
    'Sosius finds the question of Judaea settled — no expedition, no war');
  ok(!Object.values(game.armies).some((a) => a && a.name === 'Legions of Sosius'),
    'no scripted legions land at Emmaus');
}
{
  const { game, ctx } = boot('ARI', 64); // control: the free house keeps its canon
  const brothers = warOf(game, 'HYR', 'ARI');
  if (brothers) mil.dissolveWar(ctx, brothers); // at peace but NOT vassalized
  game.date = { y: -40, m: 8, d: 1 };
  checkDateEvents(ctx);
  ok(game.pendingEvents.some((pe) => pe.eventId === 'ev4_night_flight')
    || game.firedEvents.ev4_night_flight,
  'with both courts free, the canon night flight still arrives on schedule');
}

console.log('== the union survives ordinary cooling ==');
{
  const { game, ctx } = boot('ARI', 65);
  vassalize(ctx, 'ARI', 'HYR');
  const hyr = game.tags.HYR;
  hyr.opinion.ARI = 80;
  hyr.incorporating = { by: 'ARI', monthsLeft: 10 };
  hyr.opinion.ARI = 68; // natural drift dipped below the START threshold...
  mil.monthlyIncorporation(ctx);
  ok(!!hyr.incorporating && hyr.incorporating.monthsLeft === 9,
    'a dip below the start threshold no longer unravels the weaving');
  // ...and the weaving itself tends the court back toward devotion.
  monthlyOpinionDrift(ctx);
  ok(Math.round(hyr.opinion.ARI) === 69,
    'while the union is woven, the client\'s opinion drifts UP toward the threshold, not down to indifference');
  hyr.opinion.ARI = 55; // real disaffection — an insult, a grudge, an infamy slide
  mil.monthlyIncorporation(ctx);
  ok(!hyr.incorporating,
    'true disaffection (below the keep threshold) still breaks the union');
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
