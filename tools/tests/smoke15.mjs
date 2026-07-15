// Headless smoke test — SPEC §31: peace agency (the player can always sue,
// even in scripted wars), the Terms-from-Antioch choice (no more free Syria),
// naval eras (fleet patterns, re-rigging, admirals), and wing commanders.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { EVENTS_167 } = await import(R + '/js/data/events_167bce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const navy = await import(R + '/js/sim/navy.js');
const tech = await import(R + '/js/data/tech.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const mkGeom = () => ({
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
});
const mkGame = (seed) => {
  const geom = mkGeom();
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_167, events: EVENTS_167, playerTag: 'HAS', rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_167, events: EVENTS_167 });
  return { game, ctx, actions: gameActions(ctx) };
};

console.log('== the player can always sue for peace ==');
{
  const { game, ctx, actions } = mkGame(31);
  const war = game.wars.find((w) => w && (w.attackers.concat(w.defenders)).indexOf('HAS') >= 0);
  ok(war && war.noNegotiation, 'the Maccabean Revolt starts as a fight to the death: ' + war.name);
  war.warscore.HAS = 60;
  war.warscore.SEL = -60;
  const selProvsBefore = game.provinces.filter((p) => p && p.owner === 'SEL').length;
  actions.offerPeaceDeal(war.id, { provinces: [], gold: 0 });
  ok(game.wars.indexOf(war) < 0, 'the white peace was heard and taken — the scripted war ends at the table');
  const selProvsAfter = game.provinces.filter((p) => p && p.owner === 'SEL').length;
  ok(selProvsAfter === selProvsBefore, 'a white peace moves no borders: SEL holds ' + selProvsAfter);
}

console.log('== Terms from Antioch is an offer, not a verdict ==');
{
  const { game, ctx, actions } = mkGame(32);
  const war = game.wars.find((w) => w && (w.attackers.concat(w.defenders)).indexOf('HAS') >= 0);
  const holy = game.provinces.find((p) => p && p.owner === 'SEL' && p.religion === 'judaism');
  const greek = game.provinces.find((p) => p && p.owner === 'SEL' && p.religion !== 'judaism');
  holy.controller = 'HAS';
  greek.controller = 'HAS';
  war.warscore.HAS = 55;
  BOOKMARK_167.checkVictory(ctx);
  ok(!game.result, 'no auto-verdict at 50% — the decree waits on the elders');
  const pending = game.pendingEvents.find((pe) => pe && pe.eventId === 'ev_terms_antioch');
  ok(!!pending, 'the Terms arrive as an event card');
  ok(game.flags.termsOffered, 'and are offered once');
  BOOKMARK_167.checkVictory(ctx);
  ok(game.pendingEvents.filter((pe) => pe && pe.eventId === 'ev_terms_antioch').length === 1, 'no second copy on the next check');
  actions.chooseEventOption(pending.instanceId, 0);
  ok(game.result === 'win', 'accepting the decree is the victory');
  ok(game.wars.indexOf(war) < 0, 'the revolt is over');
  ok(holy.owner === 'HAS', 'the province of the faith stays: ' + holy.name);
  ok(greek.owner === 'SEL' && greek.controller === 'SEL', 'the Greek city returns: ' + greek.name);
}
{
  const { game, ctx, actions } = mkGame(33);
  const war = game.wars.find((w) => w && (w.attackers.concat(w.defenders)).indexOf('HAS') >= 0);
  war.warscore.HAS = 55;
  BOOKMARK_167.checkVictory(ctx);
  const pending = game.pendingEvents.find((pe) => pe && pe.eventId === 'ev_terms_antioch');
  const legBefore = game.tags.HAS.legitimacy || 0;
  actions.chooseEventOption(pending.instanceId, 1);
  ok(!game.result && game.wars.indexOf(war) >= 0, 'refusing sends the envoys home — the war goes on');
  ok(game.flags.termsRefused && (game.tags.HAS.legitimacy || 0) === legBefore + 5, 'defiance is remembered: +5 legitimacy');
}

console.log('== hulls speak the age ==');
{
  const { game, ctx } = mkGame(34);
  const sel = game.tags.SEL;
  const port = game.provinces.find((p) => p && p.owner === 'SEL' && p.terrain === 'coast' && p.controller === 'SEL');
  ok(!!port, 'a Seleucid harbor found: ' + (port && port.name));
  sel.treasury = 500;
  port.buildings = Array.from(new Set([...(port.buildings || []), 'shipyard']));
  const b1 = navy.buildShipCore(ctx, 'SEL', port.id);
  ok(b1.ok && Number.isFinite(b1.fleet.gen) && b1.fleet.gen === navy.navalGen(ctx, 'SEL'),
    'the hull is laid down to the age’s pattern: gen ' + b1.fleet.gen + ' (' + tech.navalGenName(b1.fleet.gen) + ')');
  const f = b1.fleet;
  f.ships = 5;
  f.gen = 0;
  sel.tech.mar = 6;
  const mi = navy.modernizeFleetInfo(ctx, f);
  ok(mi.can && mi.cost === 5 * 4 * 2, 're-rigging five hulls two patterns costs ' + mi.cost + ' talents');
  const before = sel.treasury;
  const res = navy.modernizeFleetCore(ctx, f);
  ok(res.ok && f.gen === 2 && sel.treasury === before - mi.cost, 'the fleet refits as ' + res.name);
  ok(navy.fleetPowerOf(ctx, f) > navy.fleetPowerOf(ctx, { tag: 'SEL', gen: 0 }), 'the new pattern hits harder at sea');
  sel.points.mar = 100;
  const adm = navy.hireAdmiralCore(ctx, f);
  ok(adm.ok && f.admiral && typeof f.admiral.name === 'string', 'an admiral is hired: ' + f.admiral.name);
  ok(sel.points.mar === 50, 'for 50 martial points');
  ok(!navy.hireAdmiralCore(ctx, f).ok, 'one admiral per fleet');
  game.fleets[900] = { id: 900, tag: 'HAS', prov: port.id, ships: 6, path: [], moveDaysLeft: 0, hopTotal: 0, name: 'Test', gen: 0, admiral: null };
  const shipsBefore = f.ships + game.fleets[900].ships;
  navy.fleetsDaily(ctx);
  const shipsAfter = (game.fleets[f.id] ? game.fleets[f.id].ships : 0) + (game.fleets[900] ? game.fleets[900].ships : 0);
  ok(shipsAfter < shipsBefore, 'broadsides traded off ' + port.name + ': ' + shipsBefore + ' → ' + shipsAfter + ' hulls');
}

console.log('== squadron commanders ==');
{
  const geom = mkGeom();
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: EVENTS_1948, playerTag: 'ISR', rngSeed: 35 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: EVENTS_1948 });
  const isr = game.tags.ISR;
  let home = 0;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'ISR' && p.controller === 'ISR') { home = i; break; }
  }
  game.provinces[home].buildings = ['airfield'];
  isr.treasury = 200;
  const wing = mil.raiseAirWing(ctx, 'ISR', home).wing;
  isr.points.mar = 100;
  const hire = mil.hireWingLeaderCore(ctx, 'ISR', wing.id);
  ok(hire.ok && wing.leader && typeof wing.leader.name === 'string',
    'a commander takes the squadron: ' + wing.leader.name + ' (' + wing.leader.fire + '/' + wing.leader.maneuver + ')');
  ok(isr.points.mar === 50, 'for 50 martial points');
  ok(!mil.hireWingLeaderCore(ctx, 'ISR', wing.id).ok, 'one commander per wing');
  mil.spawnArmy(ctx, 'EGY', game.provinces[home + 1].name, { inf: 5, cav: 0, name: 'Bait' });
  const bait = Object.values(game.armies).find((a) => a && a.name === 'Bait');
  const men = mil.raidTargets(ctx, wing).find((t) => t.id === home + 1).men;
  const expect = Math.min(400, Math.max(40, Math.round(men * 0.03 * (1 + 0.1 * wing.leader.fire))));
  const rr = mil.airRaidCore(ctx, 'ISR', wing.id, home + 1);
  ok(rr.ok && rr.result === 'hit' && rr.killed === expect,
    'the bombs land truer: ' + rr.killed + ' men (fire ' + wing.leader.fire + ')');
}

console.log('== pre-era saves heal at sea ==');
{
  const { game } = mkGame(36);
  game.fleets[7] = { id: 7, tag: 'SEL', prov: 3, ships: 2, path: [], moveDaysLeft: 0, hopTotal: 0, name: 'Old' };
  const saved = JSON.parse(JSON.stringify(game));
  const g2 = reviveGame(saved);
  ok(g2 && g2.fleets[7].gen === 0 && g2.fleets[7].admiral === null, 'an old save’s fleet heals to gen 0, no admiral');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
