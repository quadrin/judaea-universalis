// Headless regression — the anti-snowball batch (SPEC §21 extended):
// force limit & overlimit maintenance, escalating peace prices with the
// alien-land surcharge and the per-treaty dev cap, infamy tuning (war-time
// decay), the punitive coalition and hegemon containment (human-only),
// war-exhaustion morale recovery, and the Veteran difficulty multipliers.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const { incomeBreakdown, explainIncome } = await import(R + '/js/sim/economy.js');
const { runMonthlyAI } = await import(R + '/js/sim/ai.js');
const { monthlyOpinionDrift } = await import(R + '/js/sim/unrest.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, (_, i) => {
    const s = new Set();
    if (i > 1) s.add(i - 1);
    if (i >= 1 && i < N) s.add(i + 1);
    return s;
  }),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
};

function boot(playerTag, seed = 60) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: [], playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: [] });
  return { game, ctx, actions: gameActions(ctx) };
}
function disarmWorld(game) {
  // A clean slate for war-declaration tests: no wars, no truces.
  game.wars = [];
  game.truces = {};
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
}

console.log('== force limit & overlimit maintenance ==');
{
  const { game, ctx } = boot('JUD');
  const fl = mil.forceLimitOf(ctx, 'JUD');
  let dev = 0;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'JUD') dev += (p.dev.tax + p.dev.prod + p.dev.mp);
  }
  ok(fl === Math.max(4, Math.round(8 + dev * 0.15)), `force limit follows the land: ${fl} regiments for ${dev} dev`);
  const under = incomeBreakdown(ctx, 'JUD');
  const army = Object.values(game.armies).find((a) => a && a.tag === 'JUD');
  army.regiments.inf = fl + 20; // a doomstack far past the limit
  army.men = (fl + 20) * 1000;
  const over = incomeBreakdown(ctx, 'JUD');
  ok(over.overLimit > 0, `overlimit maintenance bills: +${over.overLimit.toFixed(2)}/mo`);
  ok(over.maint > under.maint * 1.5, 'a deep-overlimit host is dramatically dearer');
  ok(explainIncome(ctx, 'JUD').some((r) => /force limit/i.test(r.label)), 'the ledger names the overlimit line');
}

console.log('== peace: escalating packages, the alien surcharge, the dev cap ==');
{
  const { ctx } = boot('JUD');
  const flat = [{ cost: 10, dev: 10 }, { cost: 10, dev: 10 }, { cost: 10, dev: 10 }];
  ok(mil.priceProvincePackage(ctx, flat) === 35, 'three equal provinces price 10+11.5+13 = 35, not 30');
  ok(mil.peaceDevCap(ctx, { theirSideDev: 200 }) === 80, 'a 200-dev side surrenders at most 80 dev per treaty');
  ok(mil.peaceDevCap(ctx, { theirSideDev: 10 }) === 25, 'small realms stay annexable (floor 25)');
  disarmWorld(ctx.game);
  mil.declareWar(ctx, 'JUD', 'PAR', 'Test War');
  const dura = ctx.prov('Dura-Europos');
  dura.controller = 'JUD';
  const war = ctx.game.wars.find((w) => w.attackers.includes('JUD'));
  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  const row = info.provinces.find((r) => r.id === dura.id);
  const d = dura.dev.tax + dura.dev.prod + dura.dev.mp;
  ok(row && row.cost === Math.round(d * 0.9 * 1.25),
    `iranic land costs judaic conquerors the alien surcharge: ${row && row.cost} for ${d} dev`);
  ok(info.theirSideDev > 0, 'the deal knows the enemy side\'s full weight');
  // A demand past the treaty cap is refused no matter the score.
  const big = { provinces: info.provinces.map((r) => r.id), gold: 0 };
  war.warscore.JUD = 100;
  const evBig = mil.evaluatePeaceDeal(ctx, war, 'JUD', big);
  const bigDev = info.provinces.reduce((s, r) => s + r.dev, 0);
  if (bigDev > mil.peaceDevCap(ctx, info)) {
    ok(!evBig.acceptable && /No single treaty/.test(evBig.reason), 'the dev cap refuses a total dismemberment');
  } else {
    ok(true, 'occupations too small to test the cap here (skipped)');
  }
}

console.log('== infamy: slower decay at war, subjugation counted ==');
{
  const { game, ctx } = boot('JUD');
  disarmWorld(game);
  const t = game.tags.JUD;
  t.aggression = 10;
  monthlyOpinionDrift(ctx);
  ok(Math.abs(t.aggression - 9) < 1e-9, 'at peace, infamy decays a full point');
  t.atWarWith = ['PAR'];
  monthlyOpinionDrift(ctx);
  ok(Math.abs(t.aggression - 8.75) < 1e-9, 'at war, only a quarter-point fades');
}

console.log('== the coalition marches on a human conqueror ==');
{
  const { game, ctx } = boot('JUD');
  disarmWorld(game);
  const t = game.tags.JUD;
  t.aggression = 40; // a career of conquest
  const haters = ['PAR', 'NAB', 'ARM', 'AGR'];
  for (const k of haters) {
    const o = game.tags[k];
    o.opinion = o.opinion || {};
    o.opinion.JUD = -100;
    o.manpower = 40000; // strength enough to dare
    o.stability = 1;
    o.warExhaustion = 0;
  }
  let coalWar = null;
  for (let m = 0; m < 120 && !coalWar; m++) {
    runMonthlyAI(ctx);
    coalWar = game.wars.find((w) => w.cb === 'coalition' && w.defenders.includes('JUD'));
  }
  ok(!!coalWar, 'the punitive coalition declares within ten years');
  ok(coalWar && coalWar.attackers.length >= 2, `the league marches together (${coalWar && coalWar.attackers.length} banners)`);
}

console.log('== hegemon containment watches the human player ==');
{
  const { game, ctx } = boot('JUD');
  disarmWorld(game);
  // Hand the player the east: everything not Rome's becomes Judaea's.
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (!p || p.impassable || !game.tags[p.owner]) continue;
    if (p.owner !== 'ROM' && p.owner !== 'JUD') { p.owner = 'JUD'; p.controller = 'JUD'; }
  }
  const rom = game.tags.ROM;
  rom.opinion = rom.opinion || {};
  rom.opinion.JUD = 0;
  rom.stability = 1;
  rom.warExhaustion = 0;
  let containWar = null;
  let months = 0;
  for (let m = 0; m < 120 && !containWar; m++) {
    months++;
    runMonthlyAI(ctx);
    containWar = game.wars.find((w) => w.cb === 'containment' && w.defenders.includes('JUD'));
  }
  ok(game.flags.containmentWatch === true, 'the powers announce their watch');
  ok(rom.opinion.JUD < 0, `Rome sours month by month (opinion ${rom.opinion.JUD} after ${months} months)`);
  const P = DEFINES.PERSONALITIES || {};
  ok(!!containWar && containWar.attackers.some((k) => P[k] && P[k].ponderous),
    'a great power opens its war of containment ('
    + (containWar ? containWar.attackers.join(', ') : 'never') + ')');
}

console.log('== all-AI worlds stay scripted: no human, no punitive wars ==');
{
  const { game, ctx } = boot('JUD');
  disarmWorld(game);
  game.tags.JUD.ai = true; // an abandoned chair — the harness case
  game.tags.JUD.aggression = 60;
  for (const k of ['PAR', 'NAB', 'ARM']) {
    game.tags[k].opinion = { JUD: -120 };
    game.tags[k].manpower = 40000;
  }
  for (let m = 0; m < 24; m++) runMonthlyAI(ctx);
  ok(!game.wars.some((w) => w.cb === 'coalition' || w.cb === 'containment'),
    'neither league nor containment fires against an AI-driven realm');
}

console.log('== war exhaustion drags morale recovery ==');
{
  const { game, ctx } = boot('JUD');
  const armies = Object.values(game.armies).filter((a) => a && a.tag === 'JUD');
  for (const a of armies) { a.morale = 0; a.inBattle = false; }
  game.tags.JUD.warExhaustion = 20;
  mil.monthlyMoraleRecovery(ctx);
  const weary = armies[0].morale;
  for (const a of armies) a.morale = 0;
  game.tags.JUD.warExhaustion = 0;
  mil.monthlyMoraleRecovery(ctx);
  const fresh = armies[0].morale;
  ok(Math.abs(weary - fresh * 0.5) < 1e-9, `at 20 exhaustion the ranks mend at half pace (${weary} vs ${fresh})`);
}

console.log('== Veteran difficulty hardens only the AI ==');
{
  const { game, ctx } = boot('JUD');
  const before = mil.resolveTagMult(ctx, 'ROM', 'incomeMult');
  game.difficulty = 'hard';
  ok(Math.abs(mil.resolveTagMult(ctx, 'ROM', 'incomeMult') - before * 1.25) < 1e-9,
    'a Veteran AI court earns +25%');
  ok(Math.abs(mil.resolveTagMult(ctx, 'JUD', 'incomeMult')
    - mil.resolveTagMult(ctx, 'JUD', 'incomeMult')) < 1e-9
    && mil.resolveTagMult(ctx, 'JUD', 'incomeMult') < 1.2,
    'the human pays full price (no bonus on JUD)');
  const revived = reviveGame(JSON.parse(JSON.stringify({ ...game, difficulty: undefined })));
  ok(revived && revived.difficulty === 'normal', 'pre-difficulty saves revive as Normal');
}

if (failures) { console.error(failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
