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

console.log('== incorporation: slow, dear, and only for the nearly devoted ==');
{
  const { game, ctx } = boot();
  const agr = enfeoff(game);
  const me = game.tags.JUD;
  agr.opinion.JUD = 60; // warm, but not devoted
  me.points.infl = 999;
  let info = mil.incorporateInfo(ctx, 'JUD', 'AGR');
  ok(!info.can && /devoted/.test(info.why), 'even +60 opinion is not enough: ' + info.why);
  agr.opinion.JUD = 90;
  info = mil.incorporateInfo(ctx, 'JUD', 'AGR');
  ok(info.can && info.cost === Math.round(75 + info.dev * 2.5),
    `at +90 the union is priced dear: ${info.cost} influence for ${info.dev} dev`);
  ok(info.months >= 12, `and slow: ${info.months} months of weaving`);
  const agrProvs = [];
  for (let i = 1; i < game.provinces.length; i++) {
    if (game.provinces[i] && game.provinces[i].owner === 'AGR') agrProvs.push(i);
  }
  agr.treasury = 120;
  const mpBefore = me.manpower;
  const infamyBefore = me.aggression || 0;
  const res = mil.incorporateCore(ctx, 'JUD', 'AGR');
  ok(res.ok && res.started && game.tags.AGR.alive, 'the union BEGINS — nothing transfers on day one');
  ok(me.points.infl === 999 - res.cost, 'the influence is spent up front');
  for (let m = 0; m < res.months; m++) mil.monthlyIncorporation(ctx);
  ok(agrProvs.every((i) => game.provinces[i].owner === 'JUD'), 'months later, every client province joins the realm');
  ok(game.tags.AGR.alive === false, 'the client crown is retired');
  ok(me.treasury >= 120, 'their treasury comes to the union');
  ok(me.manpower > mpBefore, 'half their host returns to our rolls');
  ok((me.aggression || 0) > infamyBefore, 'the world counts the absorption');
  ok(game.provinces[agrProvs[0]].modifiers.some((m) => m.id === 'incorporated'),
    'the new provinces feel a season of adjustment');
}

console.log('== the union unravels when affection cools or war comes ==');
{
  const { game, ctx } = boot();
  const agr = enfeoff(game);
  game.tags.JUD.points.infl = 999;
  agr.opinion.JUD = 90;
  const res = mil.incorporateCore(ctx, 'JUD', 'AGR');
  ok(res.ok, 'the union begins');
  agr.opinion.JUD = 60; // their court cools mid-weave
  mil.monthlyIncorporation(ctx);
  ok(!agr.incorporating && agr.alive, 'cooled affection unravels the work — the client stands');
  ok(game.tags.JUD.points.infl === 999 - res.cost, 'and the influence spent is simply lost');
  // War voids it too.
  agr.opinion.JUD = 90;
  const res2 = mil.incorporateCore(ctx, 'JUD', 'AGR');
  ok(res2.ok, 'the union begins again');
  mil.declareWar(ctx, 'NAB', 'JUD', 'Test War');
  mil.monthlyIncorporation(ctx);
  ok(!agr.incorporating && agr.alive, 'war interrupts the weaving');
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

console.log('== liberation, not occupation: a retaken client town goes home ==');
{
  const { game, ctx } = boot();
  const agr = enfeoff(game);
  agr.opinion.JUD = 20;
  mil.declareWar(ctx, 'NAB', 'AGR', 'Test War'); // JUD defends its client
  const prov = game.provinces.findIndex((p) => p && !p.impassable && p.owner === 'AGR');
  const p = game.provinces[prov];
  p.controller = 'NAB'; // the enemy took it
  p.siege = { by: 'JUD', progress: 99, breach: 0, days: 0 }; // and we took it back
  mil.siegeFall(ctx, p);
  ok(p.controller === 'AGR', 'the overlord hands back the keys: controller is the client, not us');
  // Our own land, by contrast, returns to us as ever.
  const own = game.provinces.findIndex((q) => q && !q.impassable && q.owner === 'JUD');
  const q = game.provinces[own];
  q.controller = 'NAB';
  q.siege = { by: 'JUD', progress: 99, breach: 0, days: 0 };
  mil.siegeFall(ctx, q);
  ok(q.controller === 'JUD', 'our own province returns to our own hand');
  // Enemy land we take stays OCCUPIED by us — conquest is still conquest.
  const theirs = game.provinces.findIndex((r) => r && !r.impassable && r.owner === 'NAB');
  const r = game.provinces[theirs];
  r.siege = { by: 'JUD', progress: 99, breach: 0, days: 0 };
  mil.siegeFall(ctx, r);
  ok(r.controller === 'JUD', 'enemy land falls to the besieger as before');
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

console.log('== royal marriage: beds, cradles, and the age that has them (SPEC §62) ==');
{
  const { game, ctx } = boot();
  const { heirChance } = await import(R + '/js/sim/realm.js');
  const me = game.tags.JUD;
  const nab = game.tags.NAB;
  me.govType = 'monarchy';
  nab.govType = 'monarchy';
  me.points.infl = 999;
  nab.opinion = { JUD: 0 };
  let info = mil.royalMarriageInfo(ctx, 'JUD', 'NAB');
  ok(!info.can && /too cool/.test(info.why), 'a cool court declines the match: ' + info.why);
  nab.opinion.JUD = 30;
  nab.govType = 'republic';
  info = mil.royalMarriageInfo(ctx, 'JUD', 'NAB');
  ok(!info.can && /crowned/.test(info.why), 'only two crowned houses can be joined');
  nab.govType = 'monarchy';
  const baseChance = heirChance(ctx, 'JUD');
  const res = mil.royalMarriageCore(ctx, 'JUD', 'NAB');
  ok(res.ok && mil.marriedTo(ctx, 'JUD', 'NAB') && mil.marriedTo(ctx, 'NAB', 'JUD'),
    'the houses are joined, mutually');
  ok(me.points.infl === 999 - 25, 'the match costs its influence');
  ok((nab.opinion.JUD | 0) >= 55, 'their court warms on the wedding day');
  ok(Math.abs(heirChance(ctx, 'JUD') - baseChance * 2) < 1e-9,
    `a married dynasty is likelier blessed: heir chance ${baseChance} → ${heirChance(ctx, 'JUD')}`);
  // War annuls the match, and is not forgotten.
  mil.declareWar(ctx, 'JUD', 'NAB', 'Test War');
  ok(!mil.marriedTo(ctx, 'JUD', 'NAB'), 'war sunders the joined houses');
  ok((nab.opinion.JUD | 0) < 30, 'and the annulment is remembered bitterly');
  ok(Math.abs(heirChance(ctx, 'JUD') - baseChance) < 1e-9, 'the blessing fades with the match');
}
{
  // The modern age does not arrange its marriages.
  const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: [], playerTag: 'ISR', rngSeed: 63 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: [] });
  const info = mil.royalMarriageInfo(ctx, 'ISR', 'JOR');
  ok(!info.can && /age/.test(info.why), '1948 has no royal marriages: ' + info.why);
}

if (failures) { console.error(failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
