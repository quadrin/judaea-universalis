// Headless regression — v5.5 air & naval UX sim surface: the unit inspector
// action (any banner readable, friend or foe), and the bombsight legality
// feed (getWingRaidTargets).
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');

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

const game = initGame({
  DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: [],
  playerTag: 'ISR', rngSeed: 55,
});
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: [] });
const actions = gameActions(ctx);

console.log('== the unit inspector reads any banner ==');
const own = Object.values(game.armies).find((a) => a.tag === 'ISR');
const foe = Object.values(game.armies).find((a) => a.tag === 'EGY');
ok(!!own && !!foe, '1948 starts with Israeli and Egyptian hosts');
const mine = actions.getUnitDetails({ armyIds: [own.id] });
ok(mine && mine.armies.length === 1 && mine.armies[0].isOwn === true,
  'own army details resolve with isOwn');
const theirs = actions.getUnitDetails({ armyIds: [foe.id] });
const row = theirs && theirs.armies[0];
ok(!!row && row.isOwn === false && row.tag === 'EGY',
  'an enemy army is readable through the glasses');
ok(row.men > 0 && (row.inf + row.cav) > 0 && /Rifle|Armored/.test(row.infName + row.cavName),
  `enemy composition speaks its pattern (${row.inf} × ${row.infName})`);
ok(Number.isFinite(row.morale) && row.maxMorale > 0,
  'enemy morale and ceiling are reported');
ok(theirs.provName.length > 0, 'the inspector names the ground: ' + theirs.provName);
ok(actions.getUnitDetails({ armyIds: [99999] }) === null,
  'a dead or unknown id yields null, not a crash');

console.log('== the bombsight legality feed ==');
// Fabricate a rearmed wing at the Egyptian host's doorstep.
const wid = game.nextWingId++;
const baseProv = Math.max(1, foe.prov - 1); // chain-geom neighbor of the foe
game.airwings[wid] = { id: wid, tag: 'ISR', prov: baseProv, raidCd: 0 };
const targets = actions.getWingRaidTargets(wid);
ok(Array.isArray(targets) && targets.includes(foe.prov),
  'a hostile host within reach appears in the wing\'s target list');
const far = targets.every((id) => Math.abs(id - baseProv) <= (DEFINES.AIR.rangeHops || 2));
ok(far, 'no target lies beyond the range ring');
// A foreign wing must never feed the player's bombsight.
const wid2 = game.nextWingId++;
game.airwings[wid2] = { id: wid2, tag: 'EGY', prov: foe.prov, raidCd: 0 };
ok(actions.getWingRaidTargets(wid2).length === 0,
  'a foreign wing yields no targets to the player');
// Fleet & wing inspector shapes.
const fid = game.nextFleetId++;
game.fleets[fid] = { id: fid, tag: 'EGY', prov: foe.prov, ships: 3, gen: 5 };
const fd = actions.getUnitDetails({ fleetId: fid });
ok(fd && fd.fleet && fd.fleet.ships === 3 && /Destroyer/.test(fd.fleet.patternName)
    && fd.fleet.isOwn === false,
  'an enemy flotilla reports ships and pattern: ' + (fd && fd.fleet && fd.fleet.patternName));
const wd = actions.getUnitDetails({ wingId: wid2 });
ok(wd && wd.wing && wd.wing.isOwn === false && wd.wing.rearming === 0,
  'an enemy wing reports readiness');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
