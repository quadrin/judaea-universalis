// Headless regression — habitation is independent of terrain, ownership, and
// passability; old saves gain the new fields without changing their politics.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA, validateMapData } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { initGame, reviveGame } = await import(R + '/js/sim/init.js');
const { computeMapmodeColors } = await import(R + '/js/map/mapmodes.js');

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
  areas: new Int32Array(N + 1), bbox: [],
};
const game = initGame({
  DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: [],
  playerTag: 'ISR', rngSeed: 2601,
});
const byCanon = (g, name) => g.provinces.find((p) => p && p.canon === name);
const rgb = (arr, id) => [arr[id * 4], arr[id * 4 + 1], arr[id * 4 + 2]];

console.log('== explicit land state ==');
ok(validateMapData().length === 0, 'the expanded map schema validates cleanly');
ok(!DEFINES.TERRAINS.wasteland.impassable,
  'wasteland terrain no longer makes every such cell automatically impassable');
ok(byCanon(game, 'Joppa').habitation === 'urban',
  'modern Tel Aviv-Jaffa infers an urban habitation tier from bookmark development');
ok(byCanon(game, 'Philadelphia').habitation === 'town',
  'modern Amman infers a town tier without changing the permanent map cell');
const syrian = byCanon(game, 'Syrian Desert');
ok(syrian.owner === 'SYR' && syrian.habitation === 'uninhabited'
    && syrian.impassable && syrian.settleable,
  'the 1948 Syrian Desert is sovereign land while staying empty, blocked, and settleable');
ok(byCanon(game, 'Sinai Interior').owner === 'EGY'
    && byCanon(game, 'Arabian Desert').owner === 'SAU',
  'the 1948 Sinai and Arabian deserts likewise sit inside sovereign borders');

console.log('== old saves migrate ==');
const legacy = JSON.parse(JSON.stringify(game));
for (const p of legacy.provinces) {
  if (!p) continue;
  delete p.habitation;
  delete p.settleable;
}
const revived = reviveGame(legacy);
ok(byCanon(revived, 'Joppa').habitation === 'urban',
  'an old modern-era save reconstructs its urban tier');
// Saves made before the 1948 ownership overlay still carried WASTE here.
byCanon(revived, 'Syrian Desert').owner = 'WASTE';
delete byCanon(revived, 'Syrian Desert').habitation;
const reRevived = reviveGame(revived);
ok(byCanon(reRevived, 'Syrian Desert').habitation === 'uninhabited'
    && byCanon(reRevived, 'Syrian Desert').settleable,
  'an old wasteland save reconstructs empty, settleable land');

console.log('== sovereignty survives empty land ==');
const colors = computeMapmodeColors({ game, DEFINES }, 'political');
ok(rgb(colors.primary, syrian.id).join(',') === game.tags.SYR.color.join(','),
  'sovereign-owned empty land uses its real political color');
ok((colors.flags[syrian.id] & 2) === 2,
  'the same land keeps an uninhabited cross-hatch independent of its owner');
const arabian = byCanon(game, 'Arabian Desert');
arabian.owner = 'WASTE';
const unownedColors = computeMapmodeColors({ game, DEFINES }, 'political');
ok(rgb(unownedColors.primary, arabian.id).join(',') === DEFINES.TAGS.WASTE.color.join(','),
  'truly unowned land still uses the WASTE political color');

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
