// Headless smoke test — technology (SPEC §22): era starting levels, effect
// merge, buying with the ahead-of-age penalty, AI purchases, unit patterns,
// modernization, merge blending, save compat.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const eco = await import(R + '/js/sim/economy.js');
const tech = await import(R + '/js/data/tech.js');

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
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 10 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
const actions = gameActions(ctx);
const jud = game.tags.JUD, rom = game.tags.ROM;

console.log('== the age sets the level ==');
ok(jud.tech && jud.tech.gov === 5 && jud.tech.mar === 5, 'JUD starts at the era base: ' + JSON.stringify(jud.tech));
ok(rom.tech.mar === 7 && rom.tech.gov === 6, 'Rome a pattern ahead: ' + JSON.stringify(rom.tech));
ok(jud.ideas.incomeMult > 1.1, 'gov tech pays: JUD incomeMult ' + jud.ideas.incomeMult.toFixed(3));
ok(rom.ideas.milPowerMult > jud.ideas.milPowerMult, 'Rome hits harder: ' + rom.ideas.milPowerMult.toFixed(3) + ' vs ' + jud.ideas.milPowerMult.toFixed(3));

console.log('== patterns of soldier ==');
ok(tech.unlockedGen(5) === 1 && tech.unlockedGen(7) === 2, 'thresholds: mar 5 → gen 1, mar 7 → gen 2');
const judArmy = Object.values(game.armies).find((a) => a && a.tag === 'JUD');
const romArmy = Object.values(game.armies).find((a) => a && a.tag === 'ROM');
ok(judArmy.gen === 1, 'Judaean host raised as Drilled Spearmen (gen ' + judArmy.gen + ')');
ok(romArmy.gen === 2, 'the legion raised as Professional Legions (gen ' + romArmy.gen + ')');
ok(mil.armyPowerOf(ctx, romArmy) > mil.armyPowerOf(ctx, judArmy) * 1.2,
  'the pattern tells in the field: ' + mil.armyPowerOf(ctx, romArmy).toFixed(2) + ' vs ' + mil.armyPowerOf(ctx, judArmy).toFixed(2));

console.log('== the ladder is bought with points ==');
const info = actions.getTech();
ok(info && info.rows.length === 3, 'getTech returns three ladders');
const govRow = info.rows.find((r) => r.key === 'gov');
ok(govRow.level === 5 && govRow.cost > 0, 'gov: level 5, next costs ' + govRow.cost);
ok(!govRow.ahead, 'the grace level (era+1) carries no markup');
jud.points.gov = 999;
const incomeBefore = eco.incomeBreakdown(ctx, 'JUD').income;
actions.buyTech('gov');
ok(jud.tech.gov === 6, 'gov tech rises to 6');
ok(jud.points.gov === 999 - govRow.cost, 'points were spent: ' + (999 - jud.points.gov));
const incomeAfter = eco.incomeBreakdown(ctx, 'JUD').income;
ok(incomeAfter > incomeBefore, 'income follows: ' + incomeBefore.toFixed(1) + ' → ' + incomeAfter.toFixed(1));
const info2 = actions.getTech();
const govRow2 = info2.rows.find((r) => r.key === 'gov');
ok(govRow2.ahead && govRow2.cost > tech.techCost(7), 'level 7 IS ahead of the age: ' + govRow2.cost + ' pts (+50%)');

console.log('== a new pattern unlocks and armies modernize ==');
jud.points.mar = 999;
actions.buyTech('mar'); // 5 → 6: unlocks Professional Legions
ok(jud.tech.mar === 6 && tech.unlockedGen(6) === 2, 'mar 6 unlocks gen 2');
ok(judArmy.gen === 1, 'the old host still carries the old pattern');
jud.treasury = 500;
const mi = mil.modernizeInfo(ctx, judArmy);
ok(mi.can && mi.cost > 0, 'modernize offered for ' + mi.cost + ' talents');
actions.modernizeArmy(judArmy.id);
ok(judArmy.gen === 2, 'the host re-equips to gen 2');
ok(jud.treasury === 500 - mi.cost, 'the treasury paid: ' + (500 - jud.treasury));

console.log('== merging blends patterns ==');
const oldId = mil.spawnArmy(ctx, 'JUD', 'Jerusalem', { inf: 3, gen: 0, name: 'Old Levies' });
const old = game.armies[oldId];
mil.mergeInto(ctx, oldId, judArmy.id);
ok(!game.armies[oldId] && judArmy.gen >= 1 && judArmy.gen <= 2,
  'levies dilute the legion: merged gen ' + judArmy.gen);

console.log('== the AI keeps pace but never races the age ==');
rom.points.gov = 999; rom.points.infl = 0; rom.points.mar = 0;
rom.tech.gov = 3; // fallen behind the age (era base 5)
const ai = await import(R + '/js/sim/ai.js');
game.tags.JUD.ai = true;
ai.runMonthlyAI(ctx);
ok(rom.tech.gov === 4, 'Rome catches up: 3 → ' + rom.tech.gov);
rom.tech.gov = 6; rom.tech.infl = 6; rom.tech.mar = 6; // at era+1 already
ai.runMonthlyAI(ctx);
ok(rom.tech.gov === 6 && rom.tech.infl === 6 && rom.tech.mar === 6,
  'at era+1 the AI never races the age');

console.log('== saves carry the ladder ==');
const revived = reviveGame(JSON.parse(JSON.stringify(game)));
ok(revived.tags.JUD.tech.gov === jud.tech.gov, 'tech survives a save');
const oldSave = JSON.parse(JSON.stringify(game));
for (const k of Object.keys(oldSave.tags)) delete oldSave.tags[k].tech;
for (const id of Object.keys(oldSave.armies)) delete oldSave.armies[id].gen;
const healed = reviveGame(oldSave);
ok(healed.tags.JUD.tech && healed.tags.JUD.tech.mar === 3, 'pre-tech saves join the age at 3');
const healedArmy = Object.values(healed.armies).find((a) => a && a.tag === 'JUD');
ok(Number.isFinite(healedArmy.gen), 'pre-tech armies get a pattern: gen ' + healedArmy.gen);

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
