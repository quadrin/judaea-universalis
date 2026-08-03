// Headless smoke test — formable nations (SPEC §22): requirement gating, the
// full tag switch (provinces, armies, wars, opinions, truces, player chair),
// idea rebuild, bonuses, chronicle, AI formation, save round-trip.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_67 } = await import(R + '/js/data/bookmark_67bce.js');
const { EVENTS_67 } = await import(R + '/js/data/events_67bce.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const ai = await import(R + '/js/sim/ai.js');

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
  areas: new Int32Array(N + 1), bbox: [],
});

const geom = makeGeom();
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_67, events: EVENTS_67, playerTag: 'HYR', rngSeed: 11 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_67, events: EVENTS_67 });
const actions = gameActions(ctx);

console.log('== the crown is offered but not yet earned ==');
let decs = actions.getDecisions();
const form = decs.find((d) => d.key === 'form_has_hyr');
ok(!!form, 'Restore Hasmonean Judaea appears in the decisions');
ok(!form.canEnact, 'requirements gate it: ' + form.whyNot);
ok(form.desc.includes('✗'), 'the checklist shows unmet rows');
actions.enactDecision('form_has_hyr');
ok(!!game.tags.HYR && !game.tags.HAS, 'enacting early is refused');

console.log('== the requirements are met ==');
const hyr = game.tags.HYR;
let mine = 0;
for (let i = 1; i < game.provinces.length; i++) {
  const p = game.provinces[i];
  if (!p || p.impassable) continue;
  if (p.owner === 'HYR') { p.controller = 'HYR'; mine++; }
}
// take Jerusalem and enough of the brother's realm to break him
const ariProvs = [];
for (let i = 1; i < game.provinces.length; i++) {
  const p = game.provinces[i];
  if (p && !p.impassable && p.owner === 'ARI') ariProvs.push(p);
}
for (const p of ariProvs.slice(0, ariProvs.length - 2)) {
  p.owner = 'HYR'; p.controller = 'HYR'; mine++;
}
hyr.legitimacy = 60;
const jer = ctx.prov('Jerusalem');
ok(jer.owner === 'HYR' || jer.controller === 'HYR', 'Jerusalem is ours after the sweep: ' + jer.owner);
decs = actions.getDecisions();
ok(decs.find((d) => d.key === 'form_has_hyr').canEnact, 'the crown is within reach');

console.log('== the kingdom is restored ==');
const armyCount = Object.values(game.armies).filter((a) => a && a.tag === 'HYR').length;
const ariOpinionOfHyr = (game.tags.ARI.opinion || {}).HYR;
actions.enactDecision('form_has_hyr');
ok(!game.tags.HYR && !!game.tags.HAS, 'HYR is no more; HAS rises');
ok(game.playerTag === 'HAS', 'the player sits the new throne: ' + game.playerTag);
const has = game.tags.HAS;
ok(has.name === (DEFINES.TAGS.HAS.name || 'HAS'), 'the new name: ' + has.name);
ok(has.legitimacy >= 80, 'the bonus lands: legitimacy ' + has.legitimacy);
ok((has.modifiers || []).some((m) => m && m.id === 'kingdom_restored'), 'The Kingdom Restored modifier');
let owned = 0;
for (let i = 1; i < game.provinces.length; i++) {
  const p = game.provinces[i];
  if (p && !p.impassable && p.owner === 'HAS') owned++;
  if (p && !p.impassable && (p.owner === 'HYR' || p.controller === 'HYR')) owned = -999;
}
ok(owned > 10, 'every province re-flagged: ' + owned);
ok(Object.values(game.armies).filter((a) => a && a.tag === 'HAS').length === armyCount, 'the armies march under the new banner');
ok(!Object.values(game.armies).some((a) => a && a.tag === 'HYR'), 'no army left under the old one');
const warHasIt = game.wars.every((w) =>
  (w.attackers.indexOf('HYR') < 0 && w.defenders.indexOf('HYR') < 0));
ok(warHasIt, 'no war still names the old tag');
ok(game.tags.ARI.atWarWith.indexOf('HYR') < 0, "the brother's war book is rewritten: " + game.tags.ARI.atWarWith.join(','));
ok((game.tags.ARI.opinion || {}).HAS === ariOpinionOfHyr, 'opinions carried over');
const hasStatic = DEFINES.TAGS.HAS.ideas || {};
const key0 = Object.keys(hasStatic)[0];
ok(key0 === undefined || has.ideas[key0] !== undefined, 'national ideas rebuilt from the new banner');
ok(game.chronicle.some((e) => e.kind === 'era' && /is no more/.test(e.text)), 'the chronicle remembers: '
  + game.chronicle.filter((e) => e.kind === 'era').map((e) => e.text).slice(-1));

console.log('== the world keeps turning ==');
game.paused = false;
for (let d = 0; d < 90; d++) {
  tickDay(ctx);
  while (game.pendingEvents.length) {
    const pe = game.pendingEvents[0];
    const ev = EVENTS_67.find((e) => e && e.id === pe.eventId);
    try { actions.chooseEventOption(pe.instanceId, (ev && ev.aiOption) || 0); } catch (e) { game.pendingEvents.shift(); }
    game.paused = false;
  }
  if (game.paused) game.paused = false;
}
ok(game.tags.HAS.alive, 'the restored kingdom survives three months of ticks');

console.log('== the save carries the new banner ==');
const revived = reviveGame(JSON.parse(JSON.stringify(game)));
ok(revived && revived.tags.HAS && !revived.tags.HYR && revived.playerTag === 'HAS', 'save round-trips as HAS');

console.log('== the AI takes a crown within reach (when the formable opts in) ==');
const { FORMABLES } = await import(R + '/js/data/formables.js');
const fHyr = FORMABLES.find((f) => f.id === 'form_has_hyr');
fHyr.ai = true; // opt this one in for the test; it ships player-only
const geom2 = makeGeom();
const g2 = initGame({ DEFINES, MAP_DATA, geom: geom2, bookmark: BOOKMARK_67, events: EVENTS_67, playerTag: 'ARI', rngSeed: 12 });
const ctx2 = makeCtx({ game: g2, DEFINES, MAP_DATA, geom: geom2, bus, bookmark: BOOKMARK_67, events: EVENTS_67 });
gameActions(ctx2);
for (let i = 1; i < g2.provinces.length; i++) {
  const p = g2.provinces[i];
  if (!p || p.impassable) continue;
  if (p.owner === 'ARI' && p.name !== 'Masada' && p.name !== 'Machaerus') { p.owner = 'HYR'; p.controller = 'HYR'; }
  if (p.owner === 'HYR') p.controller = 'HYR';
}
g2.tags.HYR.legitimacy = 70;
ai.runMonthlyAI(ctx2);
ok(!!g2.tags.HAS && !g2.tags.HYR, 'the AI Hyrcanus proclaims Hasmonean Judaea');

// SPEC §221 — a banner nobody is flying may be taken up, and the crown the
// rule exists for: the revolt that beats the last Herodian and takes his.
console.log('== the crown of a fallen court (SPEC §221) ==');
{
  const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
  const geom3 = makeGeom();
  const g3 = initGame({ DEFINES, MAP_DATA, geom: geom3, bookmark: BOOKMARK_66, events: [], playerTag: 'JUD', rngSeed: 66 });
  const ctx3 = makeCtx({ game: g3, DEFINES, MAP_DATA, geom: geom3, bus, bookmark: BOOKMARK_66, events: [] });
  const act3 = gameActions(ctx3);
  const mil = await import(R + '/js/sim/military.js');

  // While Agrippa reigns his banner is his — but the crown is VISIBLE from the
  // first day, because a decision a player cannot see is a decision that does
  // not exist. It is listed, greyed, with the row about his house unticked.
  ok(!!g3.tags.AGR && g3.tags.AGR.alive, 'Agrippa II opens the chapter alive');
  const early = act3.getDecisions().find((d) => d.key === 'form_agr_jud');
  ok(!!early, 'his crown is in the decisions from the first day, contested');
  ok(early && !early.canEnact, 'and cannot be taken while he flies it: ' + (early && early.whyNot));
  ok(early && /house of Herod is ended/.test(early.desc) && early.desc.includes('✗'),
    'the checklist says what is missing');
  act3.enactDecision('form_agr_jud');
  ok(!!g3.tags.JUD && g3.tags.AGR.alive, 'and enacting it early changes nothing');

  // Take his kingdom the way it would be taken: every province of it.
  const his = [];
  for (let i = 1; i < g3.provinces.length; i++) {
    const p = g3.provinces[i];
    if (p && !p.impassable && p.owner === 'AGR') his.push(p);
  }
  ok(his.length === 3, "the king's country is Caesarea Philippi, Batanea and Gamala: " + his.map((p) => p.name).join(', '));
  for (const p of his) { p.owner = 'JUD'; p.controller = 'JUD'; }
  for (const a of mil.armiesOf(ctx3, 'AGR')) mil.removeArmy(ctx3, a.id);
  mil.updateTagLife(ctx3);
  ok(g3.tags.AGR.alive === false, 'the house of Herod is ended');

  // Rome's ledger still records the alliance it had with him — the trap the
  // banner rule exists to disarm.
  ok((g3.tags.ROM.allies || []).indexOf('AGR') >= 0, "Rome's ledger still lists the dead king as an ally");

  let dec = act3.getDecisions().find((d) => d.key === 'form_agr_jud');
  ok(!!dec, 'with nobody flying it, the crown is offered');
  const jud = g3.tags.JUD;
  for (let i = 1; i < g3.provinces.length; i++) {
    const p = g3.provinces[i];
    if (p && !p.impassable && p.owner === 'JUD') p.controller = 'JUD';
  }
  jud.stability = 1;
  jud.legitimacy = 40;
  jud.overlord = null;
  dec = act3.getDecisions().find((d) => d.key === 'form_agr_jud');
  ok(dec && dec.canEnact, 'and once the country is held it can be taken: ' + (dec && dec.whyNot));

  const beforeInfl = jud.points.infl;
  act3.enactDecision('form_agr_jud');
  const agr = g3.tags.AGR;
  ok(!!agr && !g3.tags.JUD && g3.playerTag === 'AGR', 'the realm takes the name: Kingdom of Agrippa II');
  ok(agr.name === DEFINES.TAGS.AGR.name && agr.govType === 'monarchy',
    'with the banner\'s own name and constitution: ' + agr.name + ', ' + agr.govType);
  ok(agr.ruler && agr.ruler.title === 'King', 'and the man on the throne is styled by it');
  ok((agr.modifiers || []).some((m) => m.id === 'agrippas_peace')
    && (agr.modifiers || []).some((m) => m.id === 'the_kings_chancery'),
    'the crown pays in coin and standing');
  ok(mil.diploCapacity(ctx3, 'AGR') > mil.diploCapacity(ctx3, 'ROM') - 99
    && (agr.modifiers || []).some((m) => m.effects && m.effects.diploSeats === 1),
    'including the envoy no other crown grants');
  ok(agr.points.infl === beforeInfl + 50, 'and the founding grant is paid');

  // The debts of the dead king are NOT inherited.
  ok((g3.tags.ROM.allies || []).indexOf('AGR') < 0,
    'Rome is not suddenly allied to the revolt that took the crown');
  ok(!Object.keys(g3.truces || {}).some((k) => k.split('|').indexOf('AGR') >= 0 && k.split('|').indexOf('ROM') >= 0)
    || (g3.tags.AGR.atWarWith || []).indexOf('ROM') >= 0,
    'and no dead king\'s truce shelters it from the war it is fighting');
  ok(g3.tagAliases && g3.tagAliases.JUD === 'AGR', 'the chapter\'s cards find it under its old name (SPEC §135)');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
