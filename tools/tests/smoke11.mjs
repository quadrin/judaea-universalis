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
// rule exists for: the client king who ends the rising and is given the whole
// country. Judaea's banner is the revolt's while the revolt lives; when it
// falls, the house that put it down may take the name.
console.log('== the crown of a fallen court (SPEC §221) ==');
{
  const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
  const geom4 = makeGeom();
  const g4 = initGame({ DEFINES, MAP_DATA, geom: geom4, bookmark: BOOKMARK_66, events: [], playerTag: 'AGR', rngSeed: 67 });
  const ctx4 = makeCtx({ game: g4, DEFINES, MAP_DATA, geom: geom4, bus, bookmark: BOOKMARK_66, events: [] });
  const act4 = gameActions(ctx4);
  const mil4 = await import(R + '/js/sim/military.js');

  const dec0 = act4.getDecisions().find((d) => d.key === 'form_jud_agr');
  ok(!!dec0, 'Agrippa II has a crown to work toward from the first day');
  ok(dec0 && !dec0.canEnact && /rising is ended/.test(dec0.desc),
    'refused while the revolt flies the banner: ' + (dec0 && dec0.whyNot));

  // Somebody's ledger records a bond with the revolt — the trap the banner rule
  // exists to disarm. Without `freeBanner`, the house that takes the name would
  // inherit the dead court's friendships.
  g4.tags.PAR.allies = ['JUD'];
  g4.tags.JUD.allies = ['PAR'];

  // The rising is put down — every province of it, the §220 way — and the
  // country is held.
  for (let i = 1; i < g4.provinces.length; i++) {
    const p = g4.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner === 'JUD') { p.owner = 'AGR'; p.controller = 'AGR'; }
    if (p.owner === 'AGR') p.controller = 'AGR';
  }
  for (const a of mil4.armiesOf(ctx4, 'JUD')) mil4.removeArmy(ctx4, a.id);
  mil4.updateTagLife(ctx4);
  ok(g4.tags.JUD.alive === false, 'the rising is ended');
  g4.tags.AGR.legitimacy = 40;
  g4.tags.AGR.stability = 1;
  g4.tags.ROM.opinion = g4.tags.ROM.opinion || {};
  g4.tags.ROM.opinion.AGR = 60; // Caesar is content
  const dec = act4.getDecisions().find((d) => d.key === 'form_jud_agr');
  ok(dec && dec.canEnact, 'and with Caesar content and the country held, the crown is his'
    + (dec && dec.canEnact ? '' : ': ' + dec.desc.split('\n').filter((l) => l.includes('✗')).join(' / ')));

  act4.enactDecision('form_jud_agr');
  const jud = g4.tags.JUD;
  ok(!!jud && !g4.tags.AGR && g4.playerTag === 'JUD', 'the Kingdom of Judaea is proclaimed');
  ok(jud.ruler && jud.ruler.title === 'King of the Jews', 'and its king is styled for it: ' + (jud.ruler && jud.ruler.title));
  ok((jud.modifiers || []).some((m) => m.id === 'the_whole_country')
    && (jud.modifiers || []).some((m) => m.id === 'custody_of_the_vestments'),
  'the crown pays in country and in Temple');
  ok(g4.tagAliases && g4.tagAliases.AGR === 'JUD', 'and the chapter finds the house under its new name');
  ok((g4.tags.PAR.allies || []).indexOf('JUD') < 0,
    'and the dead revolt\'s alliances do not come with its name (SPEC §221)');
  ok(!Object.keys(g4.truces || {}).some((k) => k.split('|').indexOf('JUD') >= 0),
    'nor its truces');

  // The other road: a house that has stopped asking Caesar.
  const geom5 = makeGeom();
  const g5 = initGame({ DEFINES, MAP_DATA, geom: geom5, bookmark: BOOKMARK_66, events: [], playerTag: 'AGR', rngSeed: 68 });
  const ctx5 = makeCtx({ game: g5, DEFINES, MAP_DATA, geom: geom5, bus, bookmark: BOOKMARK_66, events: [] });
  const act5 = gameActions(ctx5);
  const mil5 = await import(R + '/js/sim/military.js');
  for (let i = 1; i < g5.provinces.length; i++) {
    const p = g5.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner === 'JUD') { p.owner = 'AGR'; p.controller = 'AGR'; }
    if (p.owner === 'AGR') p.controller = 'AGR';
  }
  for (const a of mil5.armiesOf(ctx5, 'JUD')) mil5.removeArmy(ctx5, a.id);
  mil5.updateTagLife(ctx5);
  g5.tags.AGR.legitimacy = 40;
  g5.tags.AGR.stability = 1;
  g5.tags.ROM.opinion = { AGR: -100 }; // Caesar is furious
  ok(!act5.getDecisions().find((d) => d.key === 'form_jud_agr').canEnact,
    'a client whose patron is furious may not simply take the title');
  g5.tags.AGR.overlord = null; // …unless it has stopped being a client at all
  ok(act5.getDecisions().find((d) => d.key === 'form_jud_agr').canEnact,
    'but a house that answers to nobody takes it anyway');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
