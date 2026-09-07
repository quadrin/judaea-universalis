// Headless smoke test §265: a client goes free from its lord's wars, and its
// lord signs for it while it stays.
//
// Agrippa's kingdom opens the Great Revolt on Rome's side as Rome's client.
// "Throw Off the Yoke" was refused for as long as that war ran — which was the
// whole chapter — because the rising counted every war the court stood in,
// its lord's included. The Agrippa card bypassed the refusal by nulling the
// overlord and declaring, and left the Babylonian horse at war with Rome and
// in Rome's line against Judaea in the same month. And a human Agrippa's
// Great Revolt never ended: a client cannot send envoys, and the table would
// not settle over a human.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const { independenceInfo, declareIndependenceCore, truceActive, warBetween, declareWar } = await import(R + '/js/sim/military.js');
const { fireEvent, resolveEventOption, findEventById } = await import(R + '/js/sim/events.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};
const N = MAP_DATA.provinces.length;
const mkGeom = () => ({
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => { const [x, y] = MAP_DATA.project(p.lon, p.lat); return { x, y }; })],
  areas: new Int32Array(N + 1), bbox: [],
});
const ev = EVENTS_66.concat(GENERIC_EVENTS);
function boot(playerTag) {
  const geom = mkGeom();
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: ev, playerTag, rngSeed: 11 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: ev });
  return { game, ctx, actions: gameActions(ctx) };
}
const revolt = (g) => (g.wars || []).find((w) => w.name === 'The Great Revolt');
const inWar = (w, t) => !!w && ((w.attackers || []).indexOf(t) >= 0 || (w.defenders || []).indexOf(t) >= 0);

// ---------------------------------------------------------------------------
console.log('== the yoke can be thrown off while the lord\'s war runs ==');
{
  const { game, ctx } = boot('AGR');
  const w = revolt(game);
  ok(!!w && inWar(w, 'AGR') && game.tags.AGR.overlord === 'ROM', 'Agrippa opens the chapter in the Great Revolt as Rome\'s client');
  const info = independenceInfo(ctx, 'AGR');
  ok(info && info.can === true, 'and may declare independence: ' + (info && (info.why || 'no bar')));
  ok(info && info.sheds.length === 1 && info.sheds[0] === 'The Great Revolt', '  the rising would leave the Great Revolt (' + (info && info.sheds.join(', ')) + ')');
}

// ---------------------------------------------------------------------------
console.log('== the rising leaves the lord\'s war at status quo and faces one enemy ==');
{
  const { game, ctx } = boot('AGR');
  // Agrippa is standing in Judaean ground when the letter goes.
  const jer = ctx.prov('Jerusalem'); const cp = ctx.prov('Caesarea Philippi');
  jer.controller = 'AGR';
  const res = declareIndependenceCore(ctx, 'AGR');
  ok(res.ok, 'the declaration goes: ' + (res.ok ? res.name + ', ' + res.shed.join(', ') + ' left' : res.why));
  ok(game.tags.AGR.overlord === null, 'the bond is struck');
  ok(!inWar(revolt(game), 'AGR'), 'Agrippa is out of the Great Revolt');
  ok(!!revolt(game) && inWar(revolt(game), 'ROM') && inWar(revolt(game), 'JUD'), '  which goes on between Rome and Judaea');
  ok((game.tags.AGR.atWarWith || []).indexOf('JUD') < 0 && (game.tags.JUD.atWarWith || []).indexOf('AGR') < 0,
    '  Agrippa and Judaea are no longer at war');
  ok(truceActive(ctx, 'AGR', 'JUD'), '  and truced');
  ok(jer.controller === 'JUD', '  the ground it held in Judaea is handed back');
  const ind = warBetween(ctx, 'AGR', 'ROM');
  ok(!!ind && /Independence/.test(ind.name) && ind.cb === 'independence' || (!!ind && /Independence/.test(ind.name)),
    'a war of independence stands against Rome: ' + (ind && ind.name));
  ok((game.tags.AGR.atWarWith || []).indexOf('ROM') >= 0, '  and Agrippa is at war with Rome');
  ok((game.tags.AGR.allies || []).indexOf('ROM') < 0 && (game.tags.ROM.allies || []).indexOf('AGR') < 0,
    '  the alliance that came with the collar is gone');
  ok(cp.controller === 'AGR' && cp.owner === 'AGR', '  and the home province is still ours');
  const only = (game.wars || []).filter((w) => inWar(w, 'AGR'));
  ok(only.length === 1, '  one war, one enemy (' + only.map((w) => w.name).join(', ') + ')');
}

// ---------------------------------------------------------------------------
console.log('== a war of the court\'s own still bars it ==');
{
  const { game, ctx } = boot('JUD');
  // Nabataea picks a fight of its own, then takes Rome's collar: Rome is not in that war.
  const w = declareWar(ctx, 'NAB', 'ARM', 'A Quarrel of Nabataea\'s Own');
  ok(!!w, 'a war of Nabataea\'s own is declared');
  game.tags.NAB.overlord = 'ROM';
  const info = independenceInfo(ctx, 'NAB');
  ok(info && !info.can && /war of our own/.test(info.why) && /Nabataea's Own/.test(info.why),
    'a client in a war its lord does not stand in is refused, and told which war: ' + (info && info.why));
  const res = declareIndependenceCore(ctx, 'NAB');
  ok(!res.ok && game.tags.NAB.overlord === 'ROM', '  and the bond stands');
}

// ---------------------------------------------------------------------------
console.log('== the Agrippa card takes the same road ==');
{
  const { game, ctx } = boot('AGR');
  game.date.y = 69; game.date.m = 6;
  game.firedEvents.ev_year_of_four_emperors = true;
  const card = findEventById(ctx, 'ev_ag_the_clients_war');
  ok(!!card && card.trigger(ctx), 'the card is offered while Rome\'s hands are full');
  fireEvent(ctx, card);
  const pe = game.pendingEvents.find((p) => p.eventId === 'ev_ag_the_clients_war');
  ok(!!pe, '  and lands on the table');
  resolveEventOption(ctx, pe.instanceId, 0);
  ok(game.tags.AGR.overlord === null && !inWar(revolt(game), 'AGR') && !!warBetween(ctx, 'AGR', 'ROM'),
    'the crown comes out of Rome\'s gift: out of the Great Revolt, at war with Rome');
  ok((game.tags.AGR.atWarWith || []).indexOf('JUD') < 0, '  and not at war with Judaea');
  ok((game.tags.AGR.modifiers || []).some((m) => m && m.id === 'the_kingdom_declared'), '  with the kingdom declared');
  ok(game.flags.agrippaRose === true, '  and the flag set for the chapter\'s later cards');
  const SRC = readFileSync(R + '/js/data/events_66ce.js', 'utf8');
  ok(/h\.declareIndependence\(ctx, 'AGR'\)/.test(SRC) && !/agr\.overlord = null;\n\s+h\.declareWar\(ctx, 'AGR', 'ROM'/.test(SRC),
    '  the card calls the rising rather than nulling the bond by hand');
}

// ---------------------------------------------------------------------------
console.log('== the lord signs for a human client ==');
{
  const { game, ctx } = boot('AGR');
  const w = revolt(game);
  // The war has found its master and has run long enough to settle.
  w.noNegotiation = false; w._negOpened = true;
  w.started = { y: 62, m: 1 };
  const notes = [];
  bus.on('notify', (n) => notes.push(n));
  // Give Rome the field: every Judaean province in Roman hands.
  for (let i = 1; i < game.provinces.length; i++) { const p = game.provinces[i]; if (p && p.owner === 'JUD' && p.name !== 'Jerusalem') p.controller = 'ROM'; }
  let months = 0;
  while (revolt(game) && months < 6) { for (let d = 0; d < 30; d++) tickDay(ctx); months++; }
  ok(!revolt(game), 'the Great Revolt settles at Rome\'s table with a human Agrippa in the war (' + months + ' month' + (months === 1 ? '' : 's') + ')');
  ok(notes.some((n) => /Our lord has signed/.test(n.title)), '  and the client is told: '
    + ((notes.find((n) => /Our lord has signed/.test(n.title)) || {}).text || '').slice(0, 80));
  const AI = readFileSync(R + '/js/sim/ai.js', 'utf8');
  ok(/const speaksFor = \(t\) =>/.test(AI) && /!speaksFor\(player\)/.test(AI), 'monthlyWarDiplomacy reads a client\'s chair as its lord\'s');
}

console.log(failures ? `smoke181: ${failures} FAIL` : 'smoke181: ALL PASS');
process.exit(failures ? 1 : 0);
