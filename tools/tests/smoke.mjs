// Headless smoke test: rulers, decisions, declare war, EU4-style peace deal.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions, reviveGame, DECISIONS } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const mil = await import(R + '/js/sim/military.js');

// Import the ui modules too — a syntax/undefined-import check (no DOM calls at import time).
await import(R + '/js/ui/nation_panel.js');
await import(R + '/js/ui/ui.js');
await import(R + '/js/ui/topbar.js');
await import(R + '/js/ui/province_panel.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// Fake geometry: centroids from lon/lat, empty adjacency (no pathing needed here).
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

const notifications = [];
bus.on('notify', (p) => notifications.push(p));

console.log('== boot 66 CE as JUD ==');
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 42 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
const actions = gameActions(ctx);

ok(game.tags.JUD.ruler && game.tags.JUD.ruler.name === 'Ananus ben Ananus', 'JUD ruler from bookmark: ' + game.tags.JUD.ruler.name);
ok(game.tags.ROM.ruler && game.tags.ROM.ruler.name === 'Nero Claudius Caesar', 'ROM ruler from bookmark');
ok(!game.tags.REB.ruler, 'REB has no ruler');

console.log('== 65 daily ticks (2 monthly blocks) ==');
const govBefore = game.tags.JUD.points.gov;
for (let i = 0; i < 65; i++) tickDay(ctx);
const govGain = game.tags.JUD.points.gov - govBefore;
// JUD ruler gov 3 -> +5/month, plus Temple Mount (+1) and the Temple wonder (+1): +7/month, 14 over 2 months
ok(govGain === 14, `ruler+temple point gain: gov +${govGain} over 2 months (expected 14)`);

console.log('== decisions ==');
const t = game.tags.JUD;
let list = actions.getDecisions();
ok(list.length >= Object.keys(DECISIONS).length, 'getDecisions lists the base set (+ any formable crowns): ' + list.length);
const resettle = list.find((d) => d.key === 'resettle_land');
ok(resettle && !resettle.canEnact && /at war/.test(resettle.whyNot), 'resettle_land blocked at war: ' + (resettle && resettle.whyNot));
t.points.gov = 100;
actions.enactDecision('great_rites');
ok(t.points.gov === 50, 'great_rites spent 50 gov (now ' + t.points.gov + ')');
ok((t.modifiers || []).some((m) => m.id === 'pious_rule'), 'pious_rule modifier applied');
const legit1 = t.legitimacy;
actions.enactDecision('great_rites');
ok(t.points.gov === 50 && t.legitimacy === legit1, 'cooldown blocks immediate repeat');

console.log('== declare war ==');
const stabBefore = t.stability;
actions.declareWarOn('NAB');
const nabWar = game.wars.find((w) => (w.attackers.includes('JUD') && w.defenders.includes('NAB')));
ok(!!nabWar, 'war with NAB exists');
ok(t.stability === Math.max(-3, stabBefore - 2), `stability paid (was ${stabBefore}, now ${t.stability})`);
ok(game.tags.NAB.atWarWith.includes('JUD'), 'NAB atWarWith JUD');

console.log('== peace deal ==');
// Occupy all of Nabataea, then demand Petra + gold + humiliation.
const nabProvs = [];
for (let i = 1; i < game.provinces.length; i++) {
  const p = game.provinces[i];
  if (p && !p.impassable && p.owner === 'NAB') { p.controller = 'JUD'; nabProvs.push(p); }
}
mil.updateWarscores(ctx);
const info = actions.getPeaceInfo(nabWar.id);
ok(info && info.myWs >= 55, 'full occupation warscore: ' + (info && info.myWs));
ok(info.provinces.length === nabProvs.length, `all ${info.provinces.length} occupied provinces demandable`);
const petra = info.provinces.find((p) => p.name === 'Petra');
ok(!!petra, 'Petra on the table (cost ' + (petra && petra.cost) + ')');
const deal = { provinces: [petra.id], gold: 100, humiliate: true };
const ev = actions.evaluatePeace(nabWar.id, deal);
ok(ev && ev.cost === petra.cost + 10 + 15, `deal cost ${ev.cost} = ${petra.cost}+10+15`);
ok(ev.acceptable, 'deal acceptable at ws ' + info.myWs);
const treasuryBefore = t.treasury;
const legitBefore = t.legitimacy;
actions.offerPeaceDeal(nabWar.id, deal);
ok(!game.wars.includes(nabWar), 'war dissolved');
ok(game.provinces[petra.id].owner === 'JUD' && game.provinces[petra.id].controller === 'JUD', 'Petra ceded to JUD');
const otherNab = nabProvs.find((p) => p.id !== petra.id);
ok(otherNab.controller === 'NAB', 'unclaimed occupation reverted to NAB');
ok(t.treasury === treasuryBefore + 100, 'indemnity paid (+100)');
ok(t.legitimacy === Math.min(100, legitBefore + 10), 'humiliation legitimacy gained');
ok(!!game.truces[mil.truceKey('JUD', 'NAB')], 'truce recorded');
ok(!game.tags.JUD.atWarWith.includes('NAB'), 'atWarWith rebuilt');
const d2 = actions.getDiplomacy('NAB');
ok(d2 && !d2.canWar && /truce/i.test(d2.whyNotWar), 'truce blocks re-declaration: ' + (d2 && d2.whyNotWar));

console.log('== unacceptable deal refused with envoy cooldown ==');
actions.declareWarOn('PAR'); // no truce with PAR
const parWar = game.wars.find((w) => w.attackers.includes('JUD') && w.defenders.includes('PAR'));
ok(!!parWar, 'war with PAR exists');
const bigDeal = { provinces: [], gold: 0, humiliate: true }; // ws 0 < 15
const ev2 = actions.evaluatePeace(parWar.id, bigDeal);
ok(ev2 && !ev2.acceptable, 'humiliation at ws 0 not acceptable');
actions.offerPeaceDeal(parWar.id, bigDeal);
ok(game.wars.includes(parWar), 'war continues after refusal');
const info2 = actions.getPeaceInfo(parWar.id);
ok(info2.envoyMonthsLeft === 6, 'envoy cooldown 6 months: ' + info2.envoyMonthsLeft);

console.log('== scripted war stays closed ==');
const romWar = game.wars.find((w) => w.noNegotiation);
ok(!!romWar, 'noNegotiation war present');
const info3 = actions.getPeaceInfo(romWar.id);
ok(info3 && info3.noNegotiation, 'getPeaceInfo flags noNegotiation');

console.log('== AI sue-for-peace nudge ==');
notifications.length = 0;
parWar.warscore.PAR = -50;
parWar.warscore.JUD = 50;
// run one monthly boundary
while (game.date.d !== 30) tickDay(ctx);
tickDay(ctx);
ok(notifications.some((n) => /sues for peace/.test(n.title || '')), 'losing AI sues for peace: '
  + JSON.stringify(notifications.map((n) => n.title)));

console.log('== save / revive keeps rulers; pre-ruler saves get them back ==');
const saved = JSON.parse(JSON.stringify(game));
const rev = reviveGame(saved);
ok(rev.tags.JUD.ruler.name === 'Ananus ben Ananus', 'ruler survives save round-trip');
delete rev.tags.JUD.ruler; // simulate a pre-ruler save
delete rev.tags.PAR.ruler;
const ctx2 = makeCtx({ game: rev, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
ok(rev.tags.JUD.ruler && rev.tags.JUD.ruler.name === 'Ananus ben Ananus', 'pre-ruler save re-crowned from bookmark');
ok(rev.flags._setupDone === true && rev.wars.length > 0, 'revive did not re-run setup');

console.log('== 6 more months of ticks, watch for console warnings above ==');
for (let i = 0; i < 180; i++) tickDay(ctx);
ok(true, 'ticked to ' + JSON.stringify(game.date));

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
