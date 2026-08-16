// Headless regression — SPEC §251: the hulls come under one command.
//
// A yard's launches join the idle fleet OF THEIR OWN PATTERN and nothing else
// does. Re-rig the yard between two orders, sail a squadron in from another
// port, hire an admiral for one of them — and the anchorage holds two, three,
// four fleets that the player has no way to make into one. Armies have had a
// merge button since the outliner shipped; the ships had `mergeFleetsCore`,
// used by the AI's invasion planner and by nobody the player could reach.
//
// Five contracts:
//
//   1. THE ANCHORAGE IS READ: every other squadron of ours riding this anchor
//      is offered, with its hulls counted, and a fleet under sail offers none.
//   2. ONE COMMAND: the merge folds them all into the one that was clicked —
//      hulls added, fleets gone, nothing conjured.
//   3. WHAT FOLLOWS THE HULLS: the cargo, the better admiral, and the OLDEST
//      pattern, because a mixed line fights at its weakest rig.
//   4. NOBODY ELSE'S SHIPS: a foreign squadron at the same anchor is never
//      taken, and the action refuses a fleet that is not ours to command.
//   5. THE BUTTON EXISTS and is wired to the action.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const navy = await import(R + '/js/sim/navy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const OUTLINER = readFileSync(R + '/js/ui/outliner.js', 'utf8');
const era = ERAS.find((e) => e.bookmark.id === '66ce');

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  coastal: [false, ...MAP_DATA.provinces.map((p) => p.terrain === 'coast')],
  areas: new Int32Array(N + 1), bbox: [],
};

const bus = { emit() {}, on() { return () => {}; } };
const game = initGame({
  DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events,
  playerTag: 'JUD', rngSeed: 2510,
});
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events, bus });
const actions = gameActions(ctx);
game.tags.JUD.ai = false;

// A harbour of ours, and a second one to sail to.
const ports = game.provinces.filter((p) => p && p.owner === 'JUD' && geom.coastal[p.id]);
ok(ports.length >= 1, 'the chapter gives Judaea a coast to anchor at');
const port = ports[0];
const other = game.provinces.find((p) => p && geom.coastal[p.id] && p.id !== port.id);

const fleetsOfMine = () => Object.values(game.fleets).filter((f) => f && f.tag === 'JUD');
const hulls = () => fleetsOfMine().reduce((n, f) => n + (f.ships || 0), 0);
const navyRow = (id) => (actions.getNavy().fleets || []).find((f) => f.id === id);

console.log('== 1 · the anchorage is read ==');
// Three squadrons at one port, exactly as three yards and a re-rig produce
// them: different patterns, one with an admiral, one carrying an army.
const flag = ctx.helpers.spawnFleet(ctx, 'JUD', port.name, 4, { name: 'The Flagship Squadron', gen: 2 });
const older = ctx.helpers.spawnFleet(ctx, 'JUD', port.name, 3, { name: 'The Old Pattern', gen: 0 });
const third = ctx.helpers.spawnFleet(ctx, 'JUD', port.name, 2, { name: 'The Levy Hulls', gen: 2 });
older.admiral = { name: 'Yohanan of Jaffa', fire: 2, shock: 1, maneuver: 4 };
const startHulls = hulls();
ok(startHulls === 9 && fleetsOfMine().length === 3, 'three squadrons of nine hulls ride one anchor');

let row = navyRow(flag.id);
ok(row && row.canMerge === true, 'the fleet reports that it may take the others under command');
ok(row.mergeCount === 2 && row.mergeShips === 5, 'it counts two squadrons and five hulls, not its own four');

// A squadron under sail neither merges nor is merged.
actions.moveFleet(third.id, other.id);
ok(navyRow(third.id).canMerge === false
  && /under sail/i.test(navyRow(third.id).whyMerge),
'a fleet under sail takes nothing under its command, and says why');
ok(navyRow(flag.id).mergeCount === 1 && navyRow(flag.id).mergeShips === 3,
  'a squadron already under sail is not offered to the fleet at the anchor');
third.path = []; third.moveDaysLeft = 0; // back to anchor for the merge proper

console.log('== 2 · one command ==');
// An army aboard the squadron that is folded in has to still be aboard after.
const cargo = ctx.helpers.spawnArmy(ctx, 'JUD', port.name, { inf: 2, name: 'The Embarked Cohort' });
const cargoArmy = game.armies[cargo];
ok(navy.embarkCore(ctx, older, cargoArmy.id).ok, 'an army boards the squadron that is about to be folded in');

actions.mergeAllFleets(flag.id);
ok(fleetsOfMine().length === 1 && game.fleets[flag.id], 'one fleet is left riding the anchor, and it is the one commanded');
ok(hulls() === startHulls, 'nine hulls before, nine hulls after — nothing is conjured or drowned');
ok(game.fleets[flag.id].ships === 9, 'every hull is under the one command');
ok(!game.fleets[older.id] && !game.fleets[third.id], 'the folded squadrons are gone from the roster');

console.log('== 3 · what follows the hulls ==');
ok(cargoArmy.aboard === flag.id, 'the cargo is re-pointed at the fleet that now carries it');
ok(flag.admiral && flag.admiral.name === 'Yohanan of Jaffa', 'the admiral of a folded squadron takes the deck of the merged one');
ok(flag.gen === 0, 'the merged line fights at its OLDEST pattern');
ok(navyRow(flag.id).canMerge === false
  && /no other squadron/i.test(navyRow(flag.id).whyMerge),
'with the anchorage under one command there is nothing left to merge, and the button says so');

console.log('== 4 · nobody else\'s ships ==');
const foreignTag = Object.keys(game.tags).find((t) => t !== 'JUD' && game.tags[t] && game.tags[t].alive);
const foreign = ctx.helpers.spawnFleet(ctx, foreignTag, port.name, 5, { name: 'A Foreign Squadron' });
ok(navyRow(flag.id).canMerge === false, 'a foreign squadron at our own anchor is not ours to take');
actions.mergeAllFleets(flag.id);
ok(game.fleets[foreign.id] && foreign.ships === 5 && game.fleets[flag.id].ships === 9,
  'the merge leaves the foreign squadron exactly where it was');
const foreignBefore = Object.keys(game.fleets).length;
actions.mergeAllFleets(foreign.id);
ok(Object.keys(game.fleets).length === foreignBefore && game.fleets[flag.id].ships === 9,
  'the action refuses a fleet that is not the player\'s to command');
// …and the core primitive keeps its own guard, whoever calls it.
ok(navy.mergeFleetsCore(ctx, foreign, game.fleets[flag.id]) === false,
  'the primitive itself refuses two flags at one anchor');

console.log('== 5 · the button ==');
ok(/data-fleet-merge=/.test(OUTLINER), 'the fleet row carries a merge button');
ok(/mergeAllFleets/.test(OUTLINER), 'the button is wired to the merge action');
ok(/canMerge \? '' : ' disabled'/.test(OUTLINER), 'it greys out when there is nothing to merge');
ok(/whyMerge/.test(OUTLINER), 'and the dead button carries the reason');

console.log(failures ? `\n${failures} FAIL` : '\nALL PASS');
process.exit(failures ? 1 : 0);
