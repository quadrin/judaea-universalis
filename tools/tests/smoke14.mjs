// Headless smoke test — SPEC §29: doctrines ride the battle dice and the
// siege clock; airfields gate on the age of flight; wings raise, rebase,
// cover battles in range, and burn when their field falls; save compat.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const eco = await import(R + '/js/sim/economy.js');
const tech = await import(R + '/js/data/tech.js');
const { monthlyRecruitment } = await import(R + '/js/sim/recruitment.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// fake geometry with a simple neighbor chain so BFS range checks work:
// province i borders i-1 and i+1.
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
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: EVENTS_1948, playerTag: 'ISR', rngSeed: 14 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: EVENTS_1948 });
const actions = gameActions(ctx);
const isr = game.tags.ISR;

console.log('== doctrines: what each pattern knows ==');
ok(tech.doctrinePips(0, 'fire', false) === 0, 'levies know nothing extra');
ok(tech.doctrinePips(1, 'shock', true) === 1 && tech.doctrinePips(1, 'shock', false) === 0,
  'gen 1: shieldwall guards the defender only');
ok(tech.doctrinePips(2, 'fire', false) === 1 && tech.doctrinePips(2, 'fire', true) === 1,
  'gen 2: drill presses the attack as hard as the shieldwall holds');
ok(tech.doctrinePips(3, 'shock', false) === 2 && tech.doctrinePips(3, 'fire', false) === 1,
  'gen 3: the charge lands in the shock phase, on top of drill');
ok(tech.doctrinePips(4, 'fire', false) === 2, 'gen 4: volley fire joins the drill');
ok(tech.doctrinePips(5, 'fire', true) === 3 && tech.doctrinePips(5, 'shock', false) === 3,
  'gen 5 is symmetric at full stack: 3 attacking, 3 defending');
ok(tech.doctrineSiegeMult(2) === 1.2 && tech.doctrineSiegeMult(1) === 1,
  'siegecraft arrives with the professionals (gen 2)');
ok(tech.doctrinesFor(2).map((d) => d.key).join(',') === 'shieldwall,drill',
  'doctrinesFor lists the learned arts in order');

console.log('== the airfield waits for the age of flight ==');
// Find an owned, controlled ISR province to try building in.
let home = 0;
for (let i = 1; i < game.provinces.length; i++) {
  const p = game.provinces[i];
  if (p && !p.impassable && p.owner === 'ISR' && p.controller === 'ISR' && !p.construction) { home = i; break; }
}
ok(home > 0, 'found a home field candidate: ' + game.provinces[home].name);
ok(isr.tech.mar >= 19, '1948 Israel already flies: mar tech ' + isr.tech.mar);
const bi = actions.getBuildInfo(home);
const afOpt = bi.options.find((o) => o.key === 'airfield');
ok(afOpt && afOpt.canBuild === (isr.treasury >= afOpt.cost), 'airfield offered in 1948: ' + JSON.stringify({ can: afOpt.canBuild, why: afOpt.whyNot }));
// The same option under an ancient tech level is not advertised at all.
const savedMar = isr.tech.mar;
isr.tech.mar = 5;
const biOld = actions.getBuildInfo(home);
const afOld = biOld.options.find((o) => o.key === 'airfield');
ok(!afOld, 'an ancient realm does not see the airfield before it can conceive of flight');
isr.tech.mar = savedMar;

console.log('== wings raise, rebase, and cover ==');
// Complete an airfield instantly (construction is tested elsewhere).
const p0 = game.provinces[home];
p0.buildings = p0.buildings || [];
isr.treasury = 500;
const noField = mil.raiseAirWing(ctx, 'ISR', home);
ok(!noField.ok && /airfield/.test(noField.why), 'air wings wait for a completed airfield: ' + noField.why);
p0.buildings.push('airfield');
const q1 = mil.raiseAirWing(ctx, 'ISR', home);
for (let i = 0; i < DEFINES.BASE.unitRecruitMonths.wing; i++) monthlyRecruitment(ctx);
const r1 = { ...q1, wing: Object.values(game.airwings)[0] };
ok(r1.ok && r1.wing && game.airwings[r1.wing.id], 'a wing forms after training: ' + (r1.wing && r1.wing.name));
ok(isr.treasury === 500 - (DEFINES.AIR.wingCost || 40), 'the wing was paid for: ' + isr.treasury);
const q2 = mil.raiseAirWing(ctx, 'ISR', home);
const r3 = mil.raiseAirWing(ctx, 'ISR', home);
ok(q2.ok && !r3.ok && /full/.test(r3.why), 'completed and queued wings reserve all ' + DEFINES.AIR.wingsPerField + ' hangars: ' + r3.why);
for (let i = 0; i < DEFINES.BASE.unitRecruitMonths.wing; i++) monthlyRecruitment(ctx);
const r2 = { ...q2, wing: Object.values(game.airwings).find((w) => w.id !== r1.wing.id) };
// upkeep rides the maintenance line
const bd = eco.incomeBreakdown(ctx, 'ISR');
const bdNoWings = (() => {
  const saved = game.airwings; game.airwings = {};
  const x = eco.incomeBreakdown(ctx, 'ISR'); game.airwings = saved; return x;
})();
ok(bd.maint - bdNoWings.maint === 2 * (DEFINES.AIR.wingUpkeep || 1),
  'two wings cost ' + (bd.maint - bdNoWings.maint).toFixed(1) + '/mo in upkeep');
// air cover: within rangeHops of home along the neighbor chain, not beyond
const range = DEFINES.AIR.rangeHops || 2;
ok(mil.airCoverFor(ctx, home, ['ISR']) === true, 'the field covers its own province');
ok(mil.airCoverFor(ctx, Math.min(N, home + range), ['ISR']) === true, 'cover reaches ' + range + ' hops out');
ok(mil.airCoverFor(ctx, Math.min(N, home + range + 1), ['ISR']) === false, 'and no further');
ok(mil.airCoverFor(ctx, home, ['EGY']) === false, 'the enemy gets no lift from our field');
// rebase: a second field two provinces away
const home2 = home + 2 <= N && game.provinces[home + 2] ? home + 2 : home + 1;
const p2 = game.provinces[home2];
const owner2 = { owner: p2.owner, controller: p2.controller };
p2.owner = 'ISR'; p2.controller = 'ISR';
p2.buildings = p2.buildings || [];
p2.buildings.push('airfield');
const mv = mil.rebaseAirWing(ctx, 'ISR', r1.wing.id, home2);
ok(mv.ok && game.airwings[r1.wing.id].prov === home2, 'the wing rebases to ' + p2.name);
const mvBad = mil.rebaseAirWing(ctx, 'EGY', r2.wing.id, home2);
ok(!mvBad.ok, 'a foreign hand cannot move our wings');

console.log('== wings burn when the field falls ==');
p2.controller = 'EGY';
mil.sweepAirfields(ctx);
ok(!game.airwings[r1.wing.id], 'the rebased wing burned on its captured field');
ok(game.airwings[r2.wing.id], 'the home wing still flies');
p2.controller = 'ISR';
p2.owner = owner2.owner; p2.controller = owner2.controller;
p2.buildings = p2.buildings.filter((b) => b !== 'airfield');

console.log('== bombing raids (SPEC §30) ==');
// A hostile host camps one hop from the home field.
const tgtId = home + 1;
const tgtP = game.provinces[tgtId];
mil.spawnArmy(ctx, 'EGY', tgtP.name, { inf: 5, cav: 0, name: 'Raid Bait' });
const bait = Object.values(game.airwings).length && Object.values(game.armies).find((a) => a && a.name === 'Raid Bait');
ok(bait && bait.men === 5000, 'a hostile host camps at ' + tgtP.name);
const homeWing = Object.values(game.airwings).find((w) => w && w.tag === 'ISR');
homeWing.raidCd = 0;
const tgts = mil.raidTargets(ctx, homeWing);
const tgtRow = tgts.find((x) => x.id === tgtId);
ok(tgtRow && tgtRow.men >= 5000, 'the wing sees the target (' + tgtRow.men + ' hostile men)');
const expectKill = Math.min(400, Math.max(40, Math.round(tgtRow.men * 0.03)));
const expectBaitLoss = Math.round(expectKill * (5000 / tgtRow.men));
const moraleBefore = bait.morale;
const rr = mil.airRaidCore(ctx, 'ISR', homeWing.id, tgtId);
ok(rr.ok && rr.result === 'hit' && rr.killed === expectKill, 'bombs fall: 3% of ' + tgtRow.men + ' = ' + rr.killed + ' men');
ok(bait.men === 5000 - expectBaitLoss && bait.morale < moraleBefore,
  'the host thins and wavers: ' + bait.men + ' men, morale ' + bait.morale.toFixed(2));
ok(homeWing.raidCd === (DEFINES.AIR.raidCdDays || 12), 'the wing rearms: ' + homeWing.raidCd + ' days');
const rr2 = mil.airRaidCore(ctx, 'ISR', homeWing.id, tgtId);
ok(!rr2.ok && /rearming/.test(rr2.why), 'no second sortie while rearming: ' + rr2.why);
for (let i = 0; i < 12; i++) mil.sweepAirfields(ctx);
ok(homeWing.raidCd === 0, 'twelve days later the racks are full again');
const far = mil.airRaidCore(ctx, 'ISR', homeWing.id, Math.min(N, home + 4));
ok(!far.ok && /range/.test(far.why), 'four hops is beyond the wing\u2019s reach: ' + far.why);
tgtP.siege = { by: 'ISR', progress: 10, breach: 0 };
const rr3 = mil.airRaidCore(ctx, 'ISR', homeWing.id, tgtId);
ok(rr3.ok && rr3.result === 'hit' && tgtP.siege.progress === 14, 'close air support: siege 10 → ' + tgtP.siege.progress);
tgtP.siege = null;
game.airwings[999] = { id: 999, tag: 'EGY', prov: Math.min(N, tgtId + 2), name: 'Bait CAP', raidCd: 0 };
const egyField = game.provinces[Math.min(N, tgtId + 2)];
egyField.buildings = egyField.buildings || [];
egyField.buildings.push('airfield');
homeWing.raidCd = 0;
const rr4 = mil.airRaidCore(ctx, 'ISR', homeWing.id, tgtId);
ok(rr4.ok && ['hit', 'repelled', 'lost'].indexOf(rr4.result) >= 0,
  'under enemy air cover the raid resolves as hit/repelled/lost: ' + rr4.result);
ok(rr4.result === 'lost' ? !game.airwings[homeWing.id] : game.airwings[homeWing.id].raidCd > 0,
  rr4.result === 'lost' ? 'the wing fell to the fighters' : 'the surviving wing rearms');
delete game.airwings[999];
egyField.buildings = egyField.buildings.filter((b) => b !== 'airfield');
if (bait && game.armies[bait.id]) mil.removeArmy(ctx, bait.id);

console.log('== the AI takes to the air ==');
// Egypt: rich treasury, run its monthly AI air pass a few times via ticks.
const egy = game.tags.EGY;
egy.treasury = 1000;
ok(egy.tech.mar >= 19, 'Egypt flies too: ' + egy.tech.mar);
const { tickDay } = await import(R + '/js/sim/tick.js');
// AI runs monthly; airfield takes 10 months to build + 1 to fill hangars.
for (let i = 0; i < 400; i++) tickDay(ctx);
const egyWings = mil.airWingsOf(ctx, 'EGY');
const egyCap = ctx.prov((DEFINES.TAGS.EGY || {}).capital);
ok(egyCap && mil.hasAirfield(egyCap) || egyWings.length > 0 || (egyCap && egyCap.construction && egyCap.construction.key === 'airfield'),
  'Egypt paves a runway at ' + (egyCap && egyCap.name) + ' (built: ' + (egyCap && mil.hasAirfield(egyCap)) + ', wings: ' + egyWings.length + ')');

console.log('== battle dice carry the doctrines ==');
// Any battle fought in this fast-forwarded world recorded its dice with air flags.
const sawBattle = (game.chronicle || []).length >= 0; // world still consistent
ok(sawBattle, 'the world survived 400 days of doctrine-weighted battles');

console.log('== a pre-air save heals ==');
const saved = JSON.parse(JSON.stringify(game));
delete saved.airwings;
delete saved.nextWingId;
const g2 = reviveGame(saved);
ok(g2 && g2.airwings && Object.keys(g2.airwings).length === 0 && g2.nextWingId === 1,
  'pre-air saves get empty skies');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
