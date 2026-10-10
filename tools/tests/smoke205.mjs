// Headless regression — SPEC §297: split an army by unit type.
//
//   - getArmyActions names the arms and offers the split when there are two
//     or more; one arm, a battle, a rout or a ship's hold refuses it, with a
//     reason (and the ship's hold refuses the half-split too);
//   - the arm with the most regiments keeps the army: its name, its general,
//     its orders (a tie goes to the foot); every other arm becomes its own
//     army in the same province, named for its pattern, general-less, with
//     the army's morale and pattern and its share of the men by regiment;
//   - nothing is lost: regiments and men add up to what the army had;
//   - another court's army, or one too hollow to give every arm a man, is
//     not divided.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { regCount, splitArmyByArmCore } = await import(R + '/js/sim/military.js');
const { armGenName } = await import(R + '/js/data/units.js');

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
  coastal: [false, ...MAP_DATA.provinces.map((p) => p.terrain === 'coast')],
  areas: new Int32Array(N + 1), bbox: [],
};
const era = ERAS.find((e) => e.bookmark.id === '66ce');
const bookmark = era.bookmark;
const events = era.events;
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag: 'JUD', rngSeed: 297 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
const actions = gameActions(ctx);
game.paused = true;
// quiet the toasts
const said = [];
bus.on('notify', (p) => said.push(p));

const home = game.provinces.find((p) => p && p.owner === 'JUD' && p.controller === 'JUD'
  && !Object.values(game.armies).some((a) => a && a.prov === p.id && a.tag !== 'JUD'));
const mine = () => Object.values(game.armies).filter((a) => a && a.tag === 'JUD');
let seq = 0;
function muster(regs, men, extra) {
  const id = game.nextArmyId++;
  game.armies[id] = {
    id, tag: 'JUD', name: 'Test Column ' + (++seq), prov: home.id, path: [home.id + 0], moveDaysLeft: 3,
    regiments: { inf: 0, cav: 0, art: 0, ...regs }, men,
    morale: 2.5, maxMorale: 3, general: { name: 'Eleazar', fire: 1, shock: 2, maneuver: 1, traits: [] },
    gen: 1, inBattle: false, retreating: false, ...(extra || {}),
  };
  return game.armies[id];
}

console.log('== two arms: the larger keeps the army ==');
const a = muster({ inf: 3, cav: 4 }, 7000);
let aa = actions.getArmyActions(a.id);
ok(aa.canSplitType && aa.splitTypeArms.length === 2
  && aa.splitTypeArms.map((x) => x.arm + ':' + x.regs).join(',') === 'inf:3,cav:4',
'the actions name the arms and offer the split: ' + JSON.stringify(aa.splitTypeArms));
const before = mine().length;
const ids = actions.splitArmyByType(a.id);
ok(Array.isArray(ids) && ids.length === 1 && mine().length === before + 1, 'one new army: ' + JSON.stringify(ids));
const d = game.armies[ids[0]];
ok(a.regiments.cav === 4 && a.regiments.inf === 0 && a.general && a.general.name === 'Eleazar' && a.name === 'Test Column 1'
  && a.path.length === 1, 'the horse (4) keeps the name, the general and the orders');
ok(d.regiments.inf === 3 && d.regiments.cav === 0 && d.regiments.art === 0 && !d.general && d.prov === home.id
  && d.path.length === 0, 'the foot (3) stand as their own army, general-less, in the same province');
ok(d.name === 'Test Column 1 — ' + armGenName(1, 'inf'), 'named for its pattern: ' + d.name);
ok(d.men === 3000 && a.men === 4000, `the men go by regiment: ${a.men} + ${d.men}`);
ok(d.morale === 2.5 && d.maxMorale === 3 && d.gen === 1 && !d.inBattle && !d.retreating, 'with the army\'s morale and pattern');

console.log('== three arms, and a tie ==');
const b = muster({ inf: 2, cav: 2, art: 1 }, 4999);
const ids3 = actions.splitArmyByType(b.id);
const parts = [b, ...ids3.map((id) => game.armies[id])];
ok(ids3.length === 2 && b.regiments.inf === 2 && regCount(b) === 2, 'a tie goes to the foot: the foot keep the army');
ok(parts.every((x) => ['inf', 'cav', 'art'].filter((k) => x.regiments[k] > 0).length === 1),
  'every army is one arm: ' + parts.map((x) => JSON.stringify(x.regiments)).join(' '));
ok(parts.reduce((n, x) => n + regCount(x), 0) === 5 && parts.reduce((n, x) => n + x.men, 0) === 4999,
  'nothing is lost: 5 regiments, ' + parts.reduce((n, x) => n + x.men, 0) + ' men');
ok(parts.slice(1).map((x) => x.name.split(' — ')[1]).join(',') === [armGenName(1, 'cav'), armGenName(1, 'art')].join(','),
  'the horse and the guns by their names: ' + parts.slice(1).map((x) => x.name).join(', '));

console.log('== what refuses it ==');
const one = muster({ inf: 5 }, 5000);
aa = actions.getArmyActions(one.id);
ok(!aa.canSplitType && /one kind/i.test(aa.whySplitType), 'one arm: ' + aa.whySplitType);
const n0 = mine().length;
ok(actions.splitArmyByType(one.id).length === 0 && mine().length === n0, 'and nothing happens');
const fight = muster({ inf: 2, cav: 1 }, 3000, { inBattle: true });
aa = actions.getArmyActions(fight.id);
ok(!aa.canSplitType && /battle/.test(aa.whySplitType), 'in battle: ' + aa.whySplitType);
const rout = muster({ inf: 2, cav: 1 }, 3000, { retreating: true });
ok(!actions.getArmyActions(rout.id).canSplitType, 'in retreat');
const ship = muster({ inf: 2, cav: 1 }, 3000, { aboard: 999 });
aa = actions.getArmyActions(ship.id);
ok(!aa.canSplitType && !aa.canSplit && /aboard/.test(aa.whySplitType) && /aboard/.test(aa.whySplit),
  'aboard ship, neither split: ' + aa.whySplitType);
const n2 = mine().length;
ok(actions.splitArmy(ship.id) === 0 && actions.splitArmyByType(ship.id).length === 0 && mine().length === n2, 'and nothing happens');
const theirs = Object.values(game.armies).find((x) => x && x.tag !== 'JUD');
if (theirs) {
  const n1 = Object.values(game.armies).length;
  ok(actions.splitArmyByType(theirs.id).length === 0 && Object.values(game.armies).length === n1, 'another court\'s army is not ours to divide');
}
const hollow = muster({ inf: 1, cav: 1 }, 1);
ok(splitArmyByArmCore(ctx, hollow).length === 0 && hollow.regiments.inf === 1 && hollow.regiments.cav === 1,
  'an army too hollow to give every arm a man is not divided');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
