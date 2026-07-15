// Headless smoke test — SPEC §33: objectives per bookmark tag, the winning
// enemy's ultimatum card, and the withdrawal from a losing battle.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const { runMonthlyAI } = await import(R + '/js/sim/ai.js');

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
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 51 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
const actions = gameActions(ctx);

console.log('== the era states its objectives ==');
const obj = actions.getObjectives();
ok(Array.isArray(obj) && obj.length >= 2, 'JUD 66 CE objectives: ' + obj.length + ' lines');
ok(obj.some((l) => /^Win:/.test(l)) && obj.some((l) => /^Lose:/.test(l)), 'they name a win and a loss');
// every bookmark states objectives for every victory-branch tag
for (const [f, ex, tags] of [
  ['bookmark_167bce', 'BOOKMARK_167', ['HAS', 'SEL']],
  ['bookmark_67bce', 'BOOKMARK_67', ['HYR', 'ARI']],
  ['bookmark_40bce', 'BOOKMARK_40', ['HER', 'ATG']],
  ['bookmark_66ce', 'BOOKMARK_66', ['JUD', 'ROM']],
  ['bookmark_115ce', 'BOOKMARK_115', ['JUD', 'ROM']],
  ['bookmark_132ce', 'BOOKMARK_132', ['JUD', 'ROM']],
  ['bookmark_614ce', 'BOOKMARK_614', ['JUD', 'BYZ']],
  ['bookmark_1948', 'BOOKMARK_1948', ['ISR', 'JOR']],
]) {
  const { [ex]: bm } = await import(R + '/js/data/' + f + '.js');
  ok(tags.every((t) => Array.isArray(bm.objectives[t]) && bm.objectives[t].length >= 2),
    f.replace('bookmark_', '') + ': objectives for ' + tags.join('+'));
}

console.log('== the winning enemy dictates ==');
// Rome dominates the scripted war — scripted wars send no ultimatums…
const revolt = game.wars.find((w) => (w.attackers.concat(w.defenders)).indexOf('JUD') >= 0);
revolt.warscore.ROM = 60;
runMonthlyAI(ctx);
ok(!game.pendingEvents.some((pe) => pe && String(pe.eventId).startsWith('dyn_ultimatum')),
  'no ultimatum inside a fight-to-the-death war');
// …but a negotiable war does, when the enemy holds our land at +40.
ctx.helpers.declareWar(ctx, 'NAB', 'JUD', 'The Nabataean War');
const nw = game.wars.find((w) => w.name === 'The Nabataean War');
nw.warscore.NAB = 55;
nw.warscore.JUD = -55;
const lost = game.provinces.find((p) => p && p.owner === 'JUD');
lost.controller = 'NAB';
runMonthlyAI(ctx);
const ult = game.pendingEvents.find((pe) => pe && String(pe.eventId).startsWith('dyn_ultimatum'));
ok(!!ult, 'the winning enemy sends an ultimatum card');
const ev = ctx.dynEvents.get(ult.eventId);
ok(ev && /Terms from/.test(ev.title) && ev.options.length === 2, 'terms with two answers: ' + ev.title);
runMonthlyAI(ctx);
ok(game.pendingEvents.filter((pe) => pe && String(pe.eventId).startsWith('dyn_ultimatum')).length === 1,
  'the herald is not sent twice inside the cooldown');
// accept: they take what the card demanded
actions.chooseEventOption(ult.instanceId, 0);
ok(game.wars.indexOf(nw) < 0, 'accepting the ultimatum ends the war');
ok(lost.owner === 'NAB', 'the demanded province is ceded: ' + lost.name);

console.log('== the withdrawal is sounded ==');
mil.spawnArmy(ctx, 'JUD', 'Jerusalem', { inf: 3, cav: 0, name: 'Doomed Band' });
mil.spawnArmy(ctx, 'ROM', 'Jerusalem', { inf: 9, cav: 0, name: 'Iron Legion' });
const mine = Object.values(game.armies).find((a) => a && a.name === 'Doomed Band');
const theirs = Object.values(game.armies).find((a) => a && a.name === 'Iron Legion');
game.battles.push({ prov: mine.prov, atk: [theirs.id], def: [mine.id], day: 2, warId: revolt.id });
mine.inBattle = true;
theirs.inBattle = true;
const res = mil.withdrawFromBattle(ctx, 'JUD', mine.prov);
ok(res.ok && res.armies === 1, 'our side quits the field: ' + res.armies + ' army');
ok(!mine.inBattle && mine.retreating && mine.shatteredDays > 0, 'shattered and marching: '
  + mine.shatteredDays + ' days of broken morale');
ok(mine.morale <= 0.3 * mine.maxMorale + 1e-9, 'morale broken by the rout: ' + mine.morale.toFixed(2));
const res2 = mil.withdrawFromBattle(ctx, 'JUD', 999);
ok(!res2.ok, 'no battle, no withdrawal');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
