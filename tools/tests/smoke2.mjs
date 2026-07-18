// Headless smoke test v1.5: succession, integration, claims/CBs, missions,
// generic events, vassals, AI wars, and the Bar Kokhba bookmark.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { EVENTS_167 } = await import(R + '/js/data/events_167bce.js');
const { BOOKMARK_132 } = await import(R + '/js/data/bookmark_132ce.js');
const { EVENTS_132 } = await import(R + '/js/data/events_132ce.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { initGame, makeCtx, gameActions, reviveGame, simHelpers } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const mil = await import(R + '/js/sim/military.js');
const { runMonthlyAI } = await import(R + '/js/sim/ai.js');
const { incomeBreakdown } = await import(R + '/js/sim/economy.js');
const realm = await import(R + '/js/sim/realm.js');

// UI modules import cleanly (no DOM at import time).
await import(R + '/js/ui/nation_panel.js');
await import(R + '/js/ui/ui.js');
await import(R + '/js/ui/province_panel.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const makeGeom = () => ({
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1),
  bbox: [],
});
const geom = makeGeom();
const notifications = [];
bus.on('notify', (p) => notifications.push(p));

function boot(bookmark, events, playerTag, seed) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
  return { game, ctx, actions: gameActions(ctx) };
}
const tickMonths = (ctx, n) => { for (let i = 0; i < n * 30; i++) tickDay(ctx); };
// Player-facing events queue and wait for a choice; pick option 0 like a player would.
const drainEvents = (ctx, actions) => {
  let guard = 0;
  while (ctx.game.pendingEvents.length && guard++ < 50) {
    actions.chooseEventOption(ctx.game.pendingEvents[0].instanceId, 0);
  }
};
const tickAndPlay = (ctx, actions, months) => {
  for (let m = 0; m < months; m++) { tickMonths(ctx, 1); drainEvents(ctx, actions); }
};

console.log('== 66 CE: rulers, heirs, vassal AGR ==');
const EV66 = EVENTS_66.concat(GENERIC_EVENTS);
const { game: g1, ctx: c1, actions: a1 } = boot(BOOKMARK_66, EV66, 'JUD', 42);
ok(g1.tags.JUD.ruler.age === 53 && g1.tags.JUD.heir && g1.tags.JUD.heir.name === 'Eleazar ben Ananias', 'JUD ruler age + heir from bookmark');
ok(g1.tags.AGR.overlord === 'ROM', 'AGR is a Roman client');
ok(mil.sameSide(c1, 'AGR', 'ROM'), 'sameSide honors overlord relation');
const bd = incomeBreakdown(c1, 'ROM');
ok(bd.tributeIn > 0, 'ROM collects tribute from AGR: +' + bd.tributeIn.toFixed(2) + '/mo');
const bdA = incomeBreakdown(c1, 'AGR');
ok(bdA.tributeOut > 0, 'AGR pays tribute: -' + bdA.tributeOut.toFixed(2) + '/mo');

console.log('== succession machinery ==');
simHelpers.rulerDies(c1, 'JUD', 'was slain in the streets');
ok(g1.tags.JUD.ruler.name === 'Eleazar ben Ananias', 'adult heir crowned: ' + g1.tags.JUD.ruler.name);
ok(g1.tags.JUD.heir === null, 'heir slot cleared');
// JUD is a theocracy since v2.5 (elders, never regents) — test the regency
// path under a monarchy constitution.
g1.tags.JUD.govType = 'monarchy';
simHelpers.setHeir(c1, 'JUD', { name: 'A Child', gov: 1, infl: 1, mar: 1, age: 8 });
simHelpers.rulerDies(c1, 'JUD', 'has died');
ok(g1.tags.JUD.regency === true && /Regency/.test(g1.tags.JUD.ruler.name), 'child heir triggers regency (monarchy)');
g1.tags.JUD.heir.age = 15;
// next January the heir turns 16 and is crowned
{
  const before = g1.date.y;
  while (!(g1.date.m === 1 && g1.date.d === 1)) tickDay(c1);
  ok(g1.tags.JUD.regency === false && g1.tags.JUD.ruler.name === 'A Child', 'regency ends when heir comes of age (year ' + g1.date.y + ', was ' + before + ')');
}
simHelpers.setHeir(c1, 'JUD', null);
simHelpers.rulerDies(c1, 'JUD', 'has died');
ok(g1.tags.JUD.ruler.name !== 'A Child' && !g1.tags.JUD.regency, 'heirless death seats a usurper: ' + g1.tags.JUD.ruler.name);

console.log('== missions ==');
// JUD starts with 26k men -> mission 1 (20k) completes on the first monthly tick.
ok(g1.tags.JUD.missionIdx >= 1, 'JUD mission 1 (Arm the Nation) completed, idx=' + g1.tags.JUD.missionIdx);
ok((g1.tags.JUD.modifiers || []).some((m) => m.id === 'levies_of_zion'), 'mission reward modifier applied');
const ml = a1.getMissions();
ok(ml.length === 6 && ml[0].status === 'done' && ml.some((m) => m.status === 'current'), 'getMissions statuses: ' + ml.map((m) => m.status).join(','));

console.log('== claims & casus belli ==');
const t1 = g1.tags.JUD;
t1.points.infl = 100;
const dura = c1.provId('Dura-Europos'); // PAR-owned
a1.fabricateClaim(dura);
ok(t1.claims.includes(dura) && t1.points.infl === 70, 'claim fabricated (infl 100->70)');
const dip = a1.getDiplomacy('PAR');
ok(dip.cb && dip.cb.type === 'claim', 'CB vs PAR is a claim');
const dipNab = a1.getDiplomacy('NAB');
ok(!dipNab.cb, 'no CB vs NAB (no claim, no co-religionists): ' + JSON.stringify(dipNab.cb));
const stabBefore = t1.stability;
a1.declareWarOn('PAR');
ok(t1.stability === stabBefore, 'claim war costs no stability');
const parWar = g1.wars.find((w) => w.attackers.includes('JUD') && w.defenders.includes('PAR'));
ok(parWar && parWar.cb === 'claim', 'war carries its CB: ' + (parWar && parWar.cb));

console.log('== peace: claim discount + integration effects on cession ==');
// occupy Dura-Europos and a non-claimed PAR province of equal footing
const duraP = c1.byId(dura);
duraP.controller = 'JUD';
const hatra = c1.provId('Hatra');
c1.byId(hatra).controller = 'JUD';
// v2.1: PAR's client kingdoms (OSR/ADI/CHX) join their overlord's defense,
// widening the enemy side — occupy Singara too so the score covers the demand.
c1.byId(c1.provId('Singara')).controller = 'JUD';
// v6.0 (anti-snowball): land of another religious group costs peaceAlienMult
// more at the table (Dura is 6 -> 7 warscore for judaic JUD taking iranic
// PAR's land) — occupy Nehardea too so the score still covers the demand.
c1.byId(c1.provId('Nehardea')).controller = 'JUD';
mil.updateWarscores(c1);
const pinfo = a1.getPeaceInfo(parWar.id);
const rowDura = pinfo.provinces.find((r) => r.id === dura);
const rowHatra = pinfo.provinces.find((r) => r.id === hatra);
ok(rowDura.discount === 'claim' && rowDura.cost < Math.max(4, Math.round(((duraP.dev.tax + duraP.dev.prod + duraP.dev.mp) * 0.9))), 'claimed province discounted: ' + rowDura.cost);
ok(!rowHatra.discount, 'unclaimed province full price: ' + rowHatra.cost);
a1.offerPeaceDeal(parWar.id, { provinces: [dura], gold: 0, humiliate: false });
ok(duraP.owner === 'JUD', 'Dura-Europos ceded');
ok(duraP.autonomy >= 0.6, 'ceded province arrives at high autonomy: ' + duraP.autonomy);
ok((duraP.modifiers || []).some((m) => m.id === 'recent_conquest'), 'Recent Conquest modifier applied');
ok(!t1.claims.includes(dura), 'claim satisfied and removed');

console.log('== integration: establish rule + conversion ==');
t1.points.gov = 100; t1.points.infl = 100;
const integ0 = a1.getIntegration(dura);
ok(integ0 && integ0.canEstablish && integ0.canConvert, 'integration actions available on the new province');
a1.establishRule(dura);
ok(Math.abs(duraP.autonomy - 0.45) < 1e-9, 'autonomy 0.6 -> 0.45: ' + duraP.autonomy);
a1.convertProvince(dura);
ok(duraP.conversion && duraP.conversion.monthsLeft === 12, 'conversion started');
duraP.revoltCooldownMonths = 30; // keep rebels out of this window: occupation pausing conversion is tested implicitly elsewhere
tickMonths(c1, 13);
ok(duraP.religion === 'judaism' && !duraP.conversion, 'province converted to the state faith: ' + duraP.religion);

console.log('== vassalize ARM via peace ==');
a1.declareWarOn('ARM'); // no CB: -2 stability
const armWar = g1.wars.find((w) => w.attackers.includes('JUD') && w.defenders.includes('ARM'));
ok(!!armWar, 'war with ARM exists');
for (let i = 1; i < g1.provinces.length; i++) {
  const p = g1.provinces[i];
  if (p && !p.impassable && p.owner === 'ARM') p.controller = 'JUD';
}
mil.updateWarscores(c1);
const ainfo = a1.getPeaceInfo(armWar.id);
ok(ainfo.canSubjugate && ainfo.subjugateCost <= ainfo.myWs, `subjugation affordable (${ainfo.subjugateCost} <= ${ainfo.myWs})`);
const evS = a1.evaluatePeace(armWar.id, { provinces: [c1.provId('Sophene')], gold: 0, humiliate: false, subjugate: true });
ok(evS.subjugate && evS.provinces.length === 0, 'subjugation supersedes province demands');
a1.offerPeaceDeal(armWar.id, { provinces: [], gold: 0, humiliate: false, subjugate: true });
ok(g1.tags.ARM.overlord === 'JUD', 'ARM bends the knee to JUD');
ok(c1.prov('Tigranocerta').controller === 'ARM', 'client keeps its lands');
const dipArm = a1.getDiplomacy('ARM');
ok(dipArm.ourClient && !dipArm.canWar && /client/.test(dipArm.whyNotWar), 'cannot declare war on own client');
const bdJ = incomeBreakdown(c1, 'JUD');
ok(bdJ.tributeIn > 0, 'JUD collects ARM tribute: +' + bdJ.tributeIn.toFixed(2) + '/mo');

console.log('== opportunistic AI war (deterministic seed) ==');
{
  const { game: g2, ctx: c2 } = boot(BOOKMARK_66, EV66, 'JUD', 7);
  // Starve JUD of defenders and make NAB hate them: the gates should open.
  for (const a of mil.armiesOf(c2, 'JUD')) simHelpers.removeArmy(c2, a.id);
  g2.tags.JUD.manpower = 500;
  g2.tags.NAB.opinion.JUD = -100;
  g2.tags.NAB.stability = 2;
  // Give NAB adjacency to JUD in the fake geometry (Medaba <-> Machaerus).
  const medaba = c2.provId('Medaba'), machaerus = c2.provId('Machaerus');
  c2.geom.neighbors[medaba].add(machaerus);
  c2.geom.neighbors[machaerus].add(medaba);
  let declared = false;
  for (let i = 0; i < 50 && !declared; i++) {
    runMonthlyAI(c2);
    declared = (g2.tags.NAB.atWarWith || []).includes('JUD');
  }
  ok(declared, 'NAB declares an opportunistic war on a weakened, hated JUD');
  const w = g2.wars.find((x) => x.attackers.includes('NAB'));
  ok(w && (w.cb === null || w.cb === 'holy' || w.cb === 'claim'), 'AI war carries a cb field: ' + (w && String(w.cb)));
}

console.log('== generic events fire (repeatable, cooldown) ==');
{
  const { game: g3, ctx: c3 } = boot(BOOKMARK_66, EV66, 'JUD', 99);
  tickMonths(c3, 24);
  const gens = Object.keys(g3.firedEvents).filter((id) => id.startsWith('gen_'));
  ok(gens.length >= 1, 'generic events fired in 24 months: ' + gens.join(', '));
  ok(g3.flags._evCd && Object.keys(g3.flags._evCd).length >= 1, 'cooldowns recorded for repeatables');
}

console.log('== 132 CE bookmark boots and runs ==');
{
  const EV132 = EVENTS_132.concat(GENERIC_EVENTS);
  const { game: g4, ctx: c4, actions: a4 } = boot(BOOKMARK_132, EV132, 'JUD', 5);
  ok(c4.prov('Hebron').owner === 'JUD' && c4.prov('Jerusalem').owner === 'ROM', 'owner overrides applied');
  ok(c4.prov('Petra').owner === 'ROM', 'Nabataea is Provincia Arabia');
  ok(!g4.tags.NAB && !g4.tags.AGR && !g4.tags.SEL, 'inactive tags absent');
  ok(g4.tags.ROM.ruler.name === 'Hadrian' && g4.tags.JUD.ruler.name === 'Simon bar Kosiba', 'rulers seated');
  const war = g4.wars.find((w) => w.noNegotiation);
  ok(!!war, 'scripted war exists and is closed to negotiation');
  ok(a4.getMissions().length === 6, 'JUD 132 missions present (incl. the Third House, SPEC §32)');
  const men = mil.armiesOf(c4, 'JUD').reduce((s, a) => s + a.men, 0);
  ok(men >= 20000, 'JUD starts with a real host: ' + men);
  tickMonths(c4, 6);
  ok(g4.firedEvents.ev2_aelia && g4.firedEvents.ev2_decrees, 'opening events fired');
  ok(!g4.over, 'no premature game over after 6 months');
}

console.log('== 167 BCE still boots; Mattathias succession wired ==');
{
  const EV167 = EVENTS_167.concat(GENERIC_EVENTS);
  const { game: g5, ctx: c5, actions: a5 } = boot(BOOKMARK_167, EV167, 'HAS', 3);
  ok(g5.tags.HAS.ruler.name === 'Mattathias ben Yohanan' && g5.tags.HAS.heir.name === 'Judah Maccabee', 'HAS court seated');
  tickAndPlay(c5, a5, 8); // Nov -167 .. ~Jul -166; ev_death_of_mattathias fires -166-04
  ok(g5.firedEvents.ev_death_of_mattathias, 'Mattathias testament fired');
  ok(g5.tags.HAS.ruler.name === 'Judah Maccabee', 'Judah rules after the testament: ' + g5.tags.HAS.ruler.name);
  ok(g5.tags.HAS.heir && g5.tags.HAS.heir.name === 'Jonathan Apphus', 'Jonathan is heir');
}

console.log('== save round-trip with new fields ==');
{
  const saved = reviveGame(JSON.parse(JSON.stringify(g1)));
  ok(Array.isArray(saved.tags.JUD.claims), 'claims survive');
  ok(saved.tags.ARM.overlord === 'JUD', 'overlord survives');
  ok(saved.tags.JUD.missionIdx >= 1, 'missionIdx survives');
  const c6 = makeCtx({ game: saved, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EV66 });
  ok(saved.tags.JUD.ruler && Number.isFinite(saved.tags.JUD.ruler.age), 'ruler age present after revive');
  tickMonths(c6, 2);
  ok(true, 'revived game ticks');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
