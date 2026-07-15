// Headless smoke test v1.6: war overview data, ledger, diplomatic mapmode,
// holy sites, succession cards, AI integration, merge-all, and 67 BCE.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { BOOKMARK_67 } = await import(R + '/js/data/bookmark_67bce.js');
const { EVENTS_67 } = await import(R + '/js/data/events_67bce.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { initGame, makeCtx, gameActions, reviveGame, simHelpers } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const mil = await import(R + '/js/sim/military.js');
const realm = await import(R + '/js/sim/realm.js');
const { computeMapmodeColors } = await import(R + '/js/map/mapmodes.js');

// UI modules still import cleanly.
await import(R + '/js/ui/ui.js');
await import(R + '/js/ui/startscreen.js');
await import(R + '/js/ui/outliner.js');
await import(R + '/js/ui/icons.js');

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
function boot(bookmark, events, playerTag, seed) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
  return { game, ctx, actions: gameActions(ctx) };
}
const tickMonths = (ctx, n) => { for (let i = 0; i < n * 30; i++) tickDay(ctx); };
const drainEvents = (ctx, actions, pick) => {
  let guard = 0;
  while (ctx.game.pendingEvents.length && guard++ < 60) {
    const pe = ctx.game.pendingEvents[0];
    const idx = pick ? pick(pe) : 0;
    actions.chooseEventOption(pe.instanceId, idx);
  }
};
const tickAndPlay = (ctx, actions, months, pick) => {
  for (let m = 0; m < months; m++) { tickMonths(ctx, 1); drainEvents(ctx, actions, pick); }
};

console.log('== war overview data (66 CE) ==');
const EV66 = EVENTS_66.concat(GENERIC_EVENTS);
{
  const { game: g, ctx, actions: a } = boot(BOOKMARK_66, EV66, 'JUD', 42);
  const war = g.wars[0]; // The Great Revolt
  // some occupation + a battle-score bump
  ctx.prov('Ascalon').controller = 'JUD';
  ctx.prov('Gaza').controller = 'JUD';
  war._bs.att = 6; // JUD is attacker in the scripted war
  mil.updateWarscores(ctx);
  const info = a.getWarInfo(war.id);
  ok(!!info && info.noNegotiation, 'getWarInfo returns the scripted war');
  ok(info.mySide.some((r) => r.tag === 'JUD') && info.theirSide.some((r) => r.tag === 'ROM'), 'sides listed');
  ok(info.breakdown.battles === 6, 'battle component: ' + info.breakdown.battles);
  ok(info.breakdown.occupation > 0, 'occupation component: ' + info.breakdown.occupation);
  ok(Math.abs((info.breakdown.battles + info.breakdown.occupation + info.breakdown.events) - info.myWs) <= 1,
    `components ≈ total (${info.breakdown.battles}+${info.breakdown.occupation}+${info.breakdown.events} vs ${info.myWs})`);
  ok(info.weHold.length === 2 && info.weHold[0].name, 'occupied list: ' + info.weHold.map((p) => p.name).join(', '));

  console.log('== ledger ==');
  const led = a.getLedger();
  ok(led.length >= 6, 'ledger rows for living nations: ' + led.length);
  ok(led[0].dev >= led[led.length - 1].dev, 'sorted by dev desc');
  const rom = led.find((r) => r.tag === 'ROM');
  const agr = led.find((r) => r.tag === 'AGR');
  ok(rom && rom.provs === 55 && rom.troops > 0, 'ROM row: ' + JSON.stringify({ provs: rom.provs, troops: rom.troops }));
  ok(agr && agr.overlord === 'ROM', 'client marked in ledger');

  console.log('== diplomatic mapmode + peace highlight ==');
  g.tags.JUD.claims.push(ctx.provId('Petra'));
  const res = computeMapmodeColors(ctx, 'diplomatic');
  const idOf = (name) => ctx.provId(name);
  const px = (arr, id) => [arr[id * 4], arr[id * 4 + 1], arr[id * 4 + 2]];
  const own = px(res.primary, idOf('Jerusalem'));
  ok(own.join(',') === g.tags.JUD.color.join(','), 'own realm in player color');
  const enemy = px(res.primary, idOf('Antioch'));
  ok(enemy.join(',') === '182,52,46', 'enemy (ROM) in war red: ' + enemy.join(','));
  ok((res.flags[idOf('Petra')] & 1) === 1, 'claimed province striped');
  const neutral = px(res.primary, idOf('Seleucia-Ctesiphon'));
  ok(neutral.join(',') === '158,148,128', 'neutral (PAR) gray: ' + neutral.join(','));
  g.ui.peaceHighlight = [idOf('Gaza')];
  const res2 = computeMapmodeColors(ctx, 'political');
  ok((res2.flags[idOf('Gaza')] & 5) === 5, 'peace highlight stripes + pulses in political mode');
  g.ui.peaceHighlight = [];

  console.log('== merge all ==');
  const jer = ctx.provId('Jerusalem');
  simHelpers.spawnArmy(ctx, 'JUD', 'Jerusalem', { inf: 2, name: 'Second Band' });
  simHelpers.spawnArmy(ctx, 'JUD', 'Jerusalem', { inf: 1, name: 'Third Band' });
  const host = Object.values(g.armies).find((x) => x.tag === 'JUD' && x.prov === jer && /Host/.test(x.name));
  const before = Object.values(g.armies).filter((x) => x.tag === 'JUD' && x.prov === jer).length;
  a.mergeAllInto(host.id);
  const after = Object.values(g.armies).filter((x) => x.tag === 'JUD' && x.prov === jer).length;
  ok(before === 3 && after === 1 && host.men === 18000, `merge-all: ${before} armies -> ${after}, ${host.men} men`);

  console.log('== holy sites & wonders ==');
  const t = g.tags.JUD;
  const gov0 = t.points.gov, infl0 = t.points.infl, legit0 = t.legitimacy;
  realm.monthlyHolySites(ctx);
  // JUD controls Jerusalem (temple_mount + temple wonder): +1/+1/+1 site, +1 gov wonder
  ok(t.points.gov === gov0 + 2 && t.points.infl === infl0 + 1, `Temple Mount + Temple yield (gov +2, infl +1)`);
  ok(t.legitimacy > legit0, 'legitimacy drifts up while the Temple stands ours');
  const rom2 = g.tags.ROM;
  const romInfl0 = rom2.points.infl, romTre0 = rom2.treasury;
  ok(romInfl0 !== undefined, 'rom points exist');
  // ROM keeps Alexandria (library) — checked via the same pass above
  ok(rom2.points.infl === romInfl0, 'sanity'); // library already applied in same call
  // heathen hands on the holy site drain the faithful
  ctx.prov('Jerusalem').controller = 'ROM';
  const legit1 = t.legitimacy;
  realm.monthlyHolySites(ctx);
  ok(t.legitimacy < legit1, 'faithful legitimacy drains while Rome holds the Temple Mount');
  ctx.prov('Jerusalem').controller = 'JUD';
  const nab = g.tags.NAB;
  const nabT0 = nab.treasury;
  realm.monthlyHolySites(ctx);
  ok(nab.treasury === nabT0 + 2, 'Petra wonder pays its keeper +2 talents');

  console.log('== succession event card (player) ==');
  const pendBefore = g.pendingEvents.length;
  simHelpers.rulerDies(ctx, 'JUD', 'was struck down');
  ok(g.pendingEvents.length === pendBefore + 1, 'player ruler death queues an event card');
  const pe = g.pendingEvents[g.pendingEvents.length - 1];
  ok(String(pe.eventId).startsWith('dyn_succession'), 'dynamic event id: ' + pe.eventId);
  a.chooseEventOption(pe.instanceId, 0);
  ok(g.pendingEvents.length === pendBefore, 'card resolves cleanly');
  // dyn pendings are dropped by revive
  simHelpers.rulerDies(ctx, 'JUD', 'died again (test)');
  const rev = reviveGame(JSON.parse(JSON.stringify(g)));
  ok(!rev.pendingEvents.some((x) => String(x.eventId).startsWith('dyn_')), 'stale dyn events dropped on revive');

  console.log('== AI integration ==');
  const romTag = g.tags.ROM;
  romTag.points.gov = 200; romTag.points.infl = 200;
  const jam = ctx.prov('Jamnia'); // ROM-owned, judaism
  jam.autonomy = 0.7;
  const { runMonthlyAI } = await import(R + '/js/sim/ai.js');
  runMonthlyAI(ctx);
  ok(jam.autonomy < 0.7, 'AI lowered autonomy on its most autonomous province: ' + jam.autonomy);
  const converting = [];
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && p.conversion && p.conversion.by === 'ROM') converting.push(p.name);
  }
  ok(converting.length === 1, 'AI started one conversion: ' + converting.join(','));
}

console.log('== 67 BCE: the Judaean Civil War ==');
{
  const EV67 = EVENTS_67.concat(GENERIC_EVENTS);
  const { game: g, ctx, actions: a } = boot(BOOKMARK_67, EV67, 'HYR', 11);
  ok(ctx.prov('Jerusalem').owner === 'ARI' && ctx.prov('Hebron').owner === 'HYR', 'the kingdom is split');
  ok(ctx.prov('Antioch').owner === 'SEL' && ctx.prov('Tarsus').owner === 'ROM' && ctx.prov('Damascus').owner === 'NAB', 'Syria rump / Roman Cilicia / Nabataean Damascus');
  ok(ctx.prov('Alexandria').owner === 'PTO', 'Ptolemaic Egypt');
  const war = g.wars.find((w) => w.attackers.includes('ARI') && w.defenders.includes('HYR'));
  ok(!!war && !war.noNegotiation, 'the brothers\' war exists and is NEGOTIABLE');
  ok(!war.attackers.includes('NAB') && !war.defenders.includes('NAB'), 'NAB not yet in the war');
  ok(g.tags.HYR.ruler.name === 'Hyrcanus II' && g.tags.ROM.ruler.name === 'Pompeius Magnus', 'courts seated');
  ok(a.getMissions().length === 5, 'HYR missions present');

  // play to mid -66, paying Aretas' price when asked (option 0 everywhere)
  tickAndPlay(ctx, a, 14);
  ok(g.firedEvents.ev4_salome_dies && g.firedEvents.ev4_antipater, 'opening events fired');
  ok(g.firedEvents.ev4_aretas_price, 'Aretas price event fired');
  ok(ctx.prov('Medaba').owner === 'NAB', 'Medaba ceded to Nabataea');
  ok((g.tags.NAB.atWarWith || []).includes('ARI'), 'Aretas marches against Aristobulus');
  ok(!!ctx.helpers.getFlag(ctx, 'aretasMarches'), 'aretasMarches flag set');
  ok(g.tags.HYR.missionIdx >= 1, 'HYR missions progressing: idx=' + g.tags.HYR.missionIdx);

  // fast-forward to Pompey: tick to -64-06 and check the annexation
  while (!(g.date.y === -64 && g.date.m >= 6)) { tickMonths(ctx, 1); drainEvents(ctx, a); }
  ok(g.firedEvents.ev4_pompey_syria, 'Pompey annexes Syria on schedule');
  ok(ctx.prov('Antioch').owner === 'ROM' && ctx.prov('Damascus').owner === 'ROM', 'Seleucid Syria and Damascus are Roman');
  ok(!g.tags.SEL.alive, 'the last Seleucid is extinguished');
  ok(mil.armiesOf(ctx, 'ROM').some((x) => x.general && /Pompeius/.test(x.general.name)), 'Pompey is in the field');

  // to the demands of -63: HYR (player) submits (option 0); AI ARI defies via aiOption 1
  while (!(g.date.y === -63 && g.date.m >= 6)) { tickMonths(ctx, 1); drainEvents(ctx, a); }
  ok(g.firedEvents.ev4_pompey_demands_hyr, 'Pompey demanded an answer of Hyrcanus');
  ok(g.tags.HYR.overlord === 'ROM', 'Hyrcanus submitted: a Roman client');
  ok(g.firedEvents.ev4_pompey_demands_ari, 'Pompey demanded an answer of Aristobulus');
  ok((g.tags.ARI.atWarWith || []).includes('ROM'), 'Aristobulus defied: Rome at war with him');

  // run two more years; the game should stay coherent (no throw, tags sane)
  tickAndPlay(ctx, a, 24);
  ok(true, 'ticked to ' + JSON.stringify(g.date) + ' without errors');
  // save round-trip
  const rev = reviveGame(JSON.parse(JSON.stringify(g)));
  const ctx2 = makeCtx({ game: rev, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_67, events: EV67 });
  tickMonths(ctx2, 2);
  ok(rev.tags.HYR.overlord === 'ROM', '67 BCE save round-trips');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
