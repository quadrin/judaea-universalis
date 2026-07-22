// Headless regression — the invasions that must actually arrive (SPEC §72):
//  1. The Rashidun awakening settles the northern oases (the Ridda), so the
//     Caliphate's armies muster at the frontier with a real road into Iraq
//     and the Levant — not boxed in Yathrib behind neutral Ghassanid land.
//  2. The campaign wars carry a generational settlement horizon and the
//     Ghassanid screen joins the Levantine front, so the conquest is fought
//     rather than white-peaced out on the three-year clock.
//  3. A player's oasis is never script-taken by the Ridda.
//  4. The Sasanian collapse hollows the army that history hollowed.
//  5. Pompey's settlement of the East survives an early peace between the
//     brothers: the embassies, the ultimatum, and Rome's war still come.
import { readFileSync } from 'node:fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { EVENTS_614 } = await import(R + '/js/data/events_614ce.js');
const { BOOKMARK_67 } = await import(R + '/js/data/bookmark_67bce.js');
const { EVENTS_67 } = await import(R + '/js/data/events_67bce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { findPath, dissolveWar } = await import(R + '/js/sim/military.js');
const { checkDateEvents, checkTriggeredEvents } = await import(R + '/js/sim/events.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// Real adjacency, folded through the bookmark's province mapping — the whole
// point of section 1 is that the road north physically exists.
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const N = MAP_DATA.provinces.length;
function foldGeom(mapping) {
  const to = (id) => (mapping && mapping[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    for (const nb of snap.neighbors[id] || []) {
      const t = to(id), tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  return {
    neighbors,
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [], coastal: snap.coastal || [], offshore: [],
  };
}
const bus = { emit() {}, on() { return () => {}; } };

function boot614(playerTag) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_614);
  const geom = foldGeom(provinceMap);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_614, events: EVENTS_614,
    playerTag, rngSeed: 4949, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_614,
    events: EVENTS_614, provinceMap,
  });
  return { game, ctx };
}

function effect(events, id, ctx, idx) {
  const ev = events.find((e) => e && e.id === id);
  if (!ev) throw new Error('missing event ' + id);
  ev.options[idx == null ? (ev.aiOption || 0) : idx].effects(ctx);
  return ev;
}

function warOf(game, a, b) {
  return (game.wars || []).find((w) => {
    const all = (w.attackers || []).concat(w.defenders || []);
    return all.includes(a) && all.includes(b);
  }) || null;
}

console.log('== the Ridda opens the desert road ==');
{
  const { game, ctx } = boot614('JUD');
  ok(ctx.prov('Hegra').owner === 'GHA' && ctx.prov('Tayma').owner === 'GHA'
    && ctx.prov('Dumatha').owner === 'GHA',
  'the northern oases begin as Ghassanid outposts');
  ok(ctx.prov('Yathrib').owner === 'RSH' && !game.tags.RSH.alive,
    'the dormant Caliphate holds only the deep Hijaz');
  effect(EVENTS_614, 'ev_p_rashidun', ctx);
  ok(game.tags.RSH.alive, 'the succession awakens the polity');
  ok(ctx.prov('Hegra').owner === 'RSH' && ctx.prov('Tayma').owner === 'RSH'
    && ctx.prov('Dumatha').owner === 'RSH',
  'the Ridda settles Hegra, Tayma and Dumatha behind Medina');
  const host = Object.values(game.armies).find((a) => a && a.tag === 'RSH');
  ok(!!host && host.prov === ctx.prov('Dumatha').id,
    'the field army musters at Dumatha, the northern frontier — not back in Yathrib');
  ok((game.tags.RSH.modifiers || []).some((m) => m && m.id === 'diwan_of_the_conquests'),
    'the diwan of the conquests will pay the armies the oases never could');

  effect(EVENTS_614, 'ev_p_iraq_raids', ctx);
  const iraq = warOf(game, 'RSH', 'SAS');
  ok(!!iraq, 'the Iraq campaign opens against the holder of the rivers');
  ok(!!iraq && iraq.settleMonths === 84,
    'the Conquest of Iraq is a generational war, not a three-year raid');
  const path = findPath(ctx, 'RSH', ctx.prov('Dumatha').id, ctx.prov('Uruk').id);
  ok(Array.isArray(path) && path.length > 0,
    'the mustered host can actually march from Dumatha onto the enemy rivers');

  effect(EVENTS_614, 'ev_p_levant_campaign', ctx);
  ok(!!warOf(game, 'RSH', 'BYZ'), 'the Levant campaign opens the Byzantine front');
  ok(!!warOf(game, 'RSH', 'GHA'),
    'the Ghassanid screen stands with its patron instead of neutrally barring the road');
}

console.log('== the Ridda never script-takes a player\'s land ==');
{
  const { game, ctx } = boot614('JUD');
  const tayma = ctx.prov('Tayma');
  tayma.owner = 'JUD';
  tayma.controller = 'JUD';
  effect(EVENTS_614, 'ev_p_rashidun', ctx);
  ok(tayma.owner === 'JUD', 'a player-held oasis stays with the player');
  ok(ctx.prov('Hegra').owner === 'RSH' && ctx.prov('Dumatha').owner === 'RSH',
    'the rest of the north still passes to Medina');
  ok(!!game.tags.RSH.alive, 'the awakening itself is unaffected');
}

console.log('== the house eats itself in earnest ==');
{
  const { game, ctx } = boot614('JUD');
  effect(EVENTS_614, 'ev_p_khosrow_falls', ctx);
  const mod = (game.tags.SAS.modifiers || []).find((m) => m && m.id === 'house_eats_itself');
  ok(!!mod && mod.months === 60 && mod.effects && mod.effects.moraleMult < 1
    && mod.effects.reinforceMult < 1,
  'the succession chaos hollows Persian morale and reinforcement for the conquest decade');
  const before = game.tags.SAS.manpower;
  effect(EVENTS_614, 'ev_p_plague', ctx, 0);
  ok(game.tags.SAS.manpower === Math.round(before * 0.5),
    'the Plague of Sheroe empties half the muster rolls');
}

console.log('== Pompey comes whether or not the brothers still fight ==');
{
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_67);
  const geom = foldGeom(provinceMap);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_67, events: EVENTS_67,
    playerTag: 'HYR', rngSeed: 6767, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_67,
    events: EVENTS_67, provinceMap,
  });
  const actions = gameActions(ctx);

  // The player signs an early peace with their brother — the very move that
  // used to erase Rome from the chapter.
  const brothers = warOf(game, 'HYR', 'ARI');
  ok(!!brothers, 'the war of the brothers is live at the start');
  dissolveWar(ctx, brothers);
  ok(!!(game.flags._settledWars && game.flags._settledWars['ARI|HYR']),
    'the settlement is on the books');

  // -64/5: the dated settlement of the East arrives regardless.
  game.date = { y: -64, m: 5, d: 1 };
  checkDateEvents(ctx);
  while (game.pendingEvents.length) {
    const pe = game.pendingEvents[0];
    actions.chooseEventOption(pe.instanceId, 0);
  }
  ok(!!game.flags.pompeyCame, 'Pompey still reaches Syria after the brothers\' peace');

  // -63/4: the ultimatum still comes to both courts.
  game.date = { y: -63, m: 4, d: 1 };
  checkTriggeredEvents(ctx);
  ok(game.pendingEvents.some((pe) => pe.eventId === 'ev4_pompey_demands_hyr'),
    'the proconsul\'s demand reaches the player\'s court');
  ok(!!warOf(game, 'ROM', 'ARI'),
    'Aristobulus defies Rome and Pompey\'s Judaean War begins — the Roman conquest is back on the rails');
  ok(!game.firedEvents.ev4_arbitration,
    'with the brothers at peace there is nothing for Pompey to arbitrate');
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
