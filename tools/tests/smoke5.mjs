// Headless smoke test — war endings: noNegotiation unlock at 75% dominance,
// sue-for-peace after unlock, endGame closing the player's wars (uti
// possidetis), and dead-side wars dissolving instead of lingering.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');

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
function boot() {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 11 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
  return { game, ctx, actions: gameActions(ctx) };
}
const notes = [];
bus.on('notify', (p) => notes.push(p));

console.log('== A. total dominance opens a fight-to-the-death war ==');
{
  const { game, ctx, actions } = boot();
  const war = game.wars.find((w) => w.noNegotiation);
  ok(!!war, 'the Great Revolt starts noNegotiation: ' + (war && war.name));
  // Occupy every defender-owned province and max the battle score.
  const defs = war.defenders;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && defs.includes(p.owner)) p.controller = 'JUD';
  }
  war._bs = { att: 40, def: 0 };
  mil.updateWarscores(ctx);
  ok(war.warscore.JUD >= 75, 'warscore reflects dominance: ' + war.warscore.JUD);
  ok(war.noNegotiation === false && war._negOpened === true, 'negotiation unlocked');
  ok(notes.some((n) => /Envoys may cross the lines/.test(n.title)), 'the unlock is announced');

  // The dove now works: demand an occupied province and Rome accepts.
  const info = actions.getPeaceInfo(war.id);
  ok(!!info && !info.noNegotiation && info.provinces.length > 0,
    'peace dialog opens with ' + (info ? info.provinces.length : 0) + ' demandable provinces');
  const demand = { provinces: [info.provinces[0].id], gold: 0, humiliate: false, subjugate: false };
  const ev = actions.evaluatePeace(war.id, demand);
  ok(ev && ev.acceptable, 'a modest demand is acceptable at ' + war.warscore.JUD + '% warscore');
  actions.offerPeaceDeal(war.id, demand);
  ok(!game.wars.includes(war), 'the war is DISSOLVED after the treaty');
  const truce = game.truces[['JUD', 'ROM'].sort().join('|')];
  ok(!!truce, 'a truce follows the treaty: ' + JSON.stringify(truce));
  ok(game.provinces[info.provinces[0].id].owner === 'JUD', 'the ceded province changed owner');
}

console.log('== B. the verdict closes the war (win keeps what the sword holds) ==');
{
  const { game, ctx } = boot();
  const war = game.wars[0];
  // JUD occupies a Roman province, then the chapter is won.
  let romProv = 0;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'ROM') { romProv = i; p.controller = 'JUD'; break; }
  }
  ok(romProv > 0, 'occupied a Roman province: ' + game.provinces[romProv].name);
  ctx.helpers.endGame(ctx, { result: 'win', title: 'Test Verdict', text: 'x', score: 100 });
  ok(game.result === 'win' && game.over === false, 'verdict chronicled, no game-over while the nation stands');
  ok(notes.some((n) => /Test Verdict/.test(n.title) && /campaign continues/.test(n.text)), 'the chronicle toast fired');
  ok(!game.wars.includes(war), 'the scripted war ended with the verdict');
  ok(game.provinces[romProv].owner === 'JUD', 'the sword keeps what it holds (owner flipped)');
  const t = game.tags.JUD.atWarWith || [];
  ok(t.length === 0, 'JUD is at war with no one afterwards');
}

console.log('== D. elimination is the ONLY full game-over card ==');
{
  const { game, ctx } = boot();
  const overs = [];
  const off = (p) => overs.push(p);
  bus.on('gameover', off);
  // still standing: no card
  mil.checkElimination(ctx);
  ok(!game.over && overs.length === 0, 'a living nation gets no card');
  // wiped from the map: provinces gone, armies gone
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && p.owner === 'JUD') { p.owner = 'ROM'; if (p.controller === 'JUD') p.controller = 'ROM'; }
  }
  for (const a of Object.values(game.armies).filter((x) => x && x.tag === 'JUD')) mil.removeArmy(ctx, a.id);
  mil.updateTagLife(ctx);
  mil.checkElimination(ctx);
  ok(game.over && game.result === 'loss', 'elimination ends the game');
  ok(overs.length === 1 && /Extinguished/.test(overs[0].title), 'the card names the extinction: ' + (overs[0] && overs[0].title));
  ok(game.wars.length === 0, 'its wars died with it');
  // "continue observing" must not re-fire the card
  game.over = false;
  mil.checkElimination(ctx);
  ok(overs.length === 1, 'the card fires once');
}

console.log('== C. a war against the dead dissolves ==');
{
  const { game, ctx } = boot();
  mil.declareWar(ctx, 'JUD', 'NAB', 'Test War on Nabataea', 'conquest');
  const war = game.wars.find((w) => w.name === 'Test War on Nabataea');
  ok(!!war, 'second war declared');
  // Nabataea is wiped from the map by the hand of fate.
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && p.owner === 'NAB') { p.owner = 'ROM'; if (p.controller === 'NAB') p.controller = 'ROM'; }
  }
  for (const a of Object.values(game.armies).filter((x) => x && x.tag === 'NAB')) mil.removeArmy(ctx, a.id);
  mil.updateTagLife(ctx);
  ok(game.tags.NAB.alive === false, 'Nabataea is dead');
  mil.updateWarscores(ctx);
  ok(!game.wars.includes(war), 'the war against the dead is gone');
  ok((game.tags.JUD.atWarWith || []).indexOf('NAB') < 0, 'no ghost atWarWith entry');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
