// Headless regression — the late Seleucid world fragments into real states.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { FLAGS } = await import(R + '/js/ui/icons.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { EVENTS_167 } = await import(R + '/js/data/events_167bce.js');
const { BOOKMARK_67 } = await import(R + '/js/data/bookmark_67bce.js');
const { EVENTS_67 } = await import(R + '/js/data/events_67bce.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');

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
  return { game, ctx };
}
function ev(id) {
  return EVENTS_167.find((e) => e && e.id === id);
}
function owns(ctx, name, tag) {
  return ctx.prov(name)?.owner === tag;
}
function armyNamed(game, tag, name) {
  return Object.values(game.armies).some((a) => a && a.tag === tag && a.name === name);
}

console.log('== the new states have full nation definitions ==');
for (const tag of ['CMG', 'CYZ', 'ITU']) {
  ok(!!DEFINES.TAGS[tag], tag + ' has a tag definition');
  ok(typeof FLAGS[tag] === 'string' && FLAGS[tag].length > 20, tag + ' has a flag');
  ok(!!DEFINES.GOV_OF[tag] && !!DEFINES.PERSONALITIES[tag],
    tag + ' has a government and AI personality');
}

console.log('== 167 BCE loads the future states dormant ==');
{
  const { game, ctx } = boot(BOOKMARK_167, EVENTS_167, 'HAS', 7101);
  for (const tag of ['CMG', 'OSR', 'CHX', 'CYZ', 'ITU']) {
    ok(game.tags[tag] && game.tags[tag].alive === false, tag + ' exists but has not formed');
  }
  ok(owns(ctx, 'Samosata', 'SEL') && owns(ctx, 'Edessa', 'SEL')
    && owns(ctx, 'Charax', 'SEL') && owns(ctx, 'Chalcis', 'SEL'),
  'their future capitals still belong to the opening Seleucid empire');
}

console.log('== the mountain, river, and Gulf kingdoms break away on the live map ==');
{
  const { game, ctx } = boot(BOOKMARK_167, EVENTS_167, 'HAS', 7102);
  ev('ev_commagene_breaks_away').options[0].effects(ctx);
  ok(game.tags.CMG.alive && owns(ctx, 'Samosata', 'CMG') && owns(ctx, 'Melitene', 'CMG'),
    'Commagene receives its still-Seleucid mountain territory');
  ok(game.tags.CMG.ruler.name === 'Ptolemaeus'
    && armyNamed(game, 'CMG', 'Host of Commagene'),
  'Commagene has its ruler and field force');

  ev('ev_osrhoene_breaks_away').options[0].effects(ctx);
  ok(game.tags.OSR.alive && owns(ctx, 'Edessa', 'OSR') && owns(ctx, 'Carrhae', 'OSR'),
    'Osrhoene becomes a real upper-Mesopotamian kingdom');

  ev('ev_characene_breaks_away').options[0].effects(ctx);
  ok(game.tags.CHX.alive && owns(ctx, 'Charax', 'CHX') && owns(ctx, 'Gerrha', 'CHX'),
    'Characene controls the river mouth and the map abstraction of its Gulf sphere');
  ok(game.tags.CHX.ruler.name === 'Hyspaosines'
    && armyNamed(game, 'CHX', 'Army of the River Mouths'),
  'Characene has Hyspaosines and an army');
}

console.log('== breakaway events respect alternate conquests and Seleucid resistance ==');
{
  const { game, ctx } = boot(BOOKMARK_167, EVENTS_167, 'SEL', 7103);
  ctx.helpers.changeOwner(ctx, 'Samosata', 'ARM');
  ev('ev_commagene_breaks_away').options[0].effects(ctx);
  ok(owns(ctx, 'Samosata', 'ARM') && owns(ctx, 'Melitene', 'CMG'),
    'the event takes eligible Seleucid land but never steals an Armenian conquest');

  const money = game.tags.SEL.treasury;
  const men = game.tags.SEL.manpower;
  ev('ev_osrhoene_breaks_away').options[1].effects(ctx);
  ok(!game.tags.OSR.alive && owns(ctx, 'Edessa', 'SEL') && owns(ctx, 'Carrhae', 'SEL'),
    'a human Seleucid court can prevent the Edessan breakaway');
  ok(game.tags.SEL.treasury === money - 100 && game.tags.SEL.manpower === men - 2500,
    'preventing it charges the promised treasury and manpower');
  ok(ctx.prov('Edessa').modifiers.some((m) => m.id === 'osrhoene_garrisons'),
    'suppression leaves visible occupation unrest');
}

console.log('== the rival Seleucid king is a tag, an army, and a war ==');
{
  const { game, ctx } = boot(BOOKMARK_167, EVENTS_167, 'HAS', 7104);
  ev('ev_antiochus_cyzicenus').options[0].effects(ctx);
  ok(game.tags.CYZ.alive && owns(ctx, 'Damascus', 'CYZ')
    && owns(ctx, 'Chalcis', 'CYZ') && owns(ctx, 'Emesa', 'CYZ'),
  'Cyzicene Syria receives the still-Seleucid southern cities');
  ok(game.tags.CYZ.ruler.name === 'Antiochus IX Cyzicenus'
    && game.tags.SEL.ruler.name === 'Antiochus VIII Grypus',
  'the two crowns have the two rival kings');
  ok(armyNamed(game, 'CYZ', 'Army of Antiochus Cyzicenus'),
    'the rival crown has its own army');
  ok(game.wars.some((w) => w && (w.attackers || []).includes('CYZ')
    && (w.defenders || []).includes('SEL')),
  'the rival kingdoms immediately fight the War of the Half-Brothers');
  ok(game.tags.HAS.modifiers.some((m) => m.id === 'no_hand_from_the_north'
    && m.effects.siegeBonus === 1),
  'their civil war opens a real expansion window for Judaea');

  ev('ev_ituraean_tetrarchy').options[0].effects(ctx);
  ok(game.tags.ITU.alive && owns(ctx, 'Chalcis', 'ITU'),
    'Ituraea can later detach from the southern Seleucid crown');
  ok(game.tags.ITU.ruler.name === 'Ptolemy son of Mennaeus'
    && armyNamed(game, 'ITU', 'Archers of the Lebanon'),
  'the mountain state has its priest-king and archers');
}

console.log('== the 67 BCE bookmark starts with the surviving small states ==');
{
  const { game, ctx } = boot(BOOKMARK_67, EVENTS_67, 'HYR', 7105);
  ok(owns(ctx, 'Samosata', 'CMG') && game.tags.CMG.ruler.name === 'Antiochus I Theos',
    'Commagene is independent at Samosata');
  ok(owns(ctx, 'Chalcis', 'ITU') && game.tags.ITU.ruler.name === 'Ptolemy son of Mennaeus',
    'Ituraea is independent at Chalcis');
  ok(armyNamed(game, 'CMG', 'Host of Commagene')
    && armyNamed(game, 'ITU', 'Archers of the Lebanon'),
  'both small states begin with viable forces');
  ok(!game.tags.CMG.overlord && !game.tags.ITU.overlord,
    'neither is accidentally made a Parthian client');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
