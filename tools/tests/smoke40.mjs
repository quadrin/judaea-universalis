// Headless regression — the vassal loop (SPEC §61): incorporation of a
// willing client, loyalty-gated war calls, and the independence rising with
// the subjugation clause as the road back.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { runMonthlyAI } = await import(R + '/js/sim/ai.js');
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
  areas: new Int32Array(N + 1), bbox: [],
};

function boot() {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: [], playerTag: 'JUD', rngSeed: 62 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: [] });
  game.wars = [];
  game.truces = {};
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
  return { game, ctx, actions: gameActions(ctx) };
}
// AGR (Agrippa's kingdom) becomes JUD's client for these tests.
function enfeoff(game) {
  game.tags.AGR.overlord = 'JUD';
  game.tags.AGR.opinion = game.tags.AGR.opinion || {};
  return game.tags.AGR;
}

console.log('== incorporation: a willing client joins the realm ==');
{
  const { game, ctx } = boot();
  const agr = enfeoff(game);
  const me = game.tags.JUD;
  agr.opinion.JUD = 0;
  me.points.infl = 999;
  let info = mil.incorporateInfo(ctx, 'JUD', 'AGR');
  ok(!info.can && /not willing/.test(info.why), 'a cool client cannot be absorbed: ' + info.why);
  agr.opinion.JUD = 60;
  info = mil.incorporateInfo(ctx, 'JUD', 'AGR');
  ok(info.can && info.cost === Math.round(50 + info.dev * 1.5),
    `at +60 opinion the union is priced: ${info.cost} influence for ${info.dev} dev`);
  const agrProvs = [];
  for (let i = 1; i < game.provinces.length; i++) {
    if (game.provinces[i] && game.provinces[i].owner === 'AGR') agrProvs.push(i);
  }
  agr.treasury = 120;
  const mpBefore = me.manpower;
  const infamyBefore = me.aggression || 0;
  const res = mil.incorporateCore(ctx, 'JUD', 'AGR');
  ok(res.ok, 'the incorporation seals');
  ok(agrProvs.every((i) => game.provinces[i].owner === 'JUD'), 'every client province joins the realm');
  ok(game.tags.AGR.alive === false, 'the client crown is retired');
  ok(me.treasury >= 120, 'their treasury comes to the union');
  ok(me.manpower > mpBefore, 'half their host returns to our rolls');
  ok((me.aggression || 0) > infamyBefore, 'the world counts the absorption');
  ok(game.provinces[agrProvs[0]].modifiers.some((m) => m.id === 'incorporated'),
    'the new provinces feel a season of adjustment');
}

console.log('== a wartime or unwilling union is refused ==');
{
  const { game, ctx } = boot();
  const agr = enfeoff(game);
  agr.opinion.JUD = 60;
  game.tags.JUD.points.infl = 999;
  mil.declareWar(ctx, 'JUD', 'NAB', 'Test War');
  const info = mil.incorporateInfo(ctx, 'JUD', 'AGR');
  ok(!info.can && /peace/.test(info.why), 'no annexations mid-war: ' + info.why);
}

console.log('== a resentful client stays home from our wars ==');
{
  const { game, ctx } = boot();
  const agr = enfeoff(game);
  agr.opinion.JUD = -40; // below loyalOpinion (−25)
  const war = mil.declareWar(ctx, 'JUD', 'NAB', 'Test War');
  ok(war && war.attackers.indexOf('AGR') < 0, 'the disloyal client refuses the call');
  ok((game.tags.AGR.atWarWith || []).length === 0, 'and stays wholly out of the war');
}
{
  const { game, ctx } = boot();
  const agr = enfeoff(game);
  agr.opinion.JUD = 10; // loyal enough
  const war = mil.declareWar(ctx, 'JUD', 'NAB', 'Test War');
  ok(war && war.attackers.indexOf('AGR') >= 0, 'a loyal client marches');
}
{
  // The bargain's other half never lapses: attacking the client still brings
  // the overlord, however the client feels.
  const { game, ctx } = boot();
  const agr = enfeoff(game);
  agr.opinion.JUD = -100;
  const war = mil.declareWar(ctx, 'NAB', 'AGR', 'Test War');
  ok(war && war.defenders.indexOf('JUD') >= 0, 'the overlord still defends its client');
}

console.log('== the yoke thrown off: the independence rising ==');
{
  const { game, ctx } = boot();
  const agr = enfeoff(game);
  agr.opinion.JUD = -100;
  agr.manpower = 60000; // the strength to dare (JUD strength ~36k)
  agr.stability = 1;
  let war = null;
  for (let m = 0; m < 120 && !war; m++) {
    runMonthlyAI(ctx);
    war = game.wars.find((w) => w.cb === 'independence');
  }
  ok(!!war, 'the rising comes within ten years');
  ok(war && war.attackers.indexOf('AGR') >= 0 && war.defenders.indexOf('JUD') >= 0,
    'the client marches on its overlord');
  ok(game.tags.AGR.overlord === null, 'the bond is severed the day they rise');
  // The road back: win and subjugate at the table.
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'AGR') p.controller = 'JUD';
  }
  mil.updateWarscores(ctx);
  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  ok(info.canSubjugate, 'the subjugation clause offers the yoke again');
  mil.executePeaceDeal(ctx, war, 'JUD', { provinces: [], gold: 0, humiliate: false, subjugate: true });
  ok(game.tags.AGR.overlord === 'JUD', 'the war won, the client kneels again');
}

if (failures) { console.error(failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
