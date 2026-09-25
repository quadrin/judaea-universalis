// Headless regression — SPEC §287: the United Kingdom's road names the map's
// towns, and "+N% siege defence" means siege defence.
//
//   - the UKI requirement lists its seven cells by the names each Iron Age
//     map shows (Tirzah or Samaria, Shechem, Beth-Shean, Shimron, Dan), and
//     still checks the same cells;
//   - `siegeDefenseMult` on the court that holds the walls slows a siege of
//     them, by the factor it names;
//   - the six cards that promise "+N% siege defence" grant exactly that, and
//     no effect anywhere hands out ten or more pips of hill battle bonus.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync, readdirSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const bus = { emit() {}, on() { return () => {}; } };
function boot(id, player = 'JDH', seed = 3) {
  const era = ERAS.find((e) => e.bookmark.id === id);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const geom = {
    neighbors: snap.neighbors.map((a) => new Set(a)),
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: [], offshore: [], areas: Int32Array.from(snap.areas), bbox: [],
  };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events,
    playerTag: player, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events, provinceMap });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== the United Kingdom names the towns the map shows ==');
const CANON = /Sebaste|Neapolis|Scythopolis|Sepphoris|Caesarea Philippi/;
for (const [id, north] of [['931bce', 'Tirzah'], ['732bce', 'Samaria'], ['597bce', 'Samaria']]) {
  const { actions } = boot(id);
  const row = (actions.getDecisions() || []).find((r) => r.key === 'form_ais_jdh');
  const line = row ? row.desc.split('\n').find((l) => /Own and control Jerusalem/.test(l)) || '' : '';
  ok(line.includes(north) && /Shechem/.test(line) && /Beth-Shean/.test(line) && /Shimron/.test(line) && /\bDan\b/.test(line),
    id + ': ' + line.replace(/^[✓✗]\s*/, ''));
  ok(!CANON.test(line), '  and no Roman name in it');
}
{
  // Same cells, whatever they are called: hand Judah the seven and the row ticks.
  const { ctx, actions } = boot('732bce');
  for (const n of ['Jerusalem', 'Hebron', 'Sebaste', 'Neapolis', 'Scythopolis', 'Sepphoris', 'Caesarea Philippi']) {
    const p = ctx.prov(n); p.owner = 'JDH'; p.controller = 'JDH';
  }
  const row = (actions.getDecisions() || []).find((r) => r.key === 'form_ais_jdh');
  const line = row ? row.desc.split('\n').find((l) => /Own and control Jerusalem/.test(l)) || '' : '';
  ok(line.startsWith('✓'), 'holding the seven cells ticks the row: ' + line.slice(0, 40) + '…');
}

console.log('== siege defence slows a siege of the walls ==');
{
  const run = (mult) => {
    const { game, ctx } = boot('931bce', 'JDH', 11);
    for (const id of Object.keys(game.armies)) delete game.armies[id];
    game.battles.length = 0;
    const jer = ctx.prov('Jerusalem');
    jer.owner = 'JDH'; jer.controller = 'JDH';
    if (mult) game.tags.JDH.modifiers.push({ id: 't_walls', name: 'Walls', months: -1, effects: { siegeDefenseMult: mult } });
    game.armies[mil.spawnArmy(ctx, 'ISL', 'Jerusalem', { inf: 12 })];
    mil.ensureSiege(ctx, jer, 'ISL');
    for (let d = 0; d < 30 && jer.siege; d++) mil.tickSieges(ctx);
    return jer.siege ? jer.siege.progress : 100;
  };
  const base = run(0), walled = run(1.25);
  ok(base > 0 && walled > 0, 'Israel lays siege to Jerusalem: ' + base.toFixed(1) + ' after thirty days');
  ok(Math.abs(walled * 1.25 - base) < 0.05 * base,
    '  and +25% siege defence makes it a quarter slower: ' + walled.toFixed(1) + ' (×1.25 = ' + (walled * 1.25).toFixed(1) + ')');
}

console.log('== the cards that promise siege defence grant it ==');
{
  const files = readdirSync(R + '/js/data').filter((f) => f.endsWith('.js'));
  const big = [];
  let sd = 0;
  for (const f of files) {
    const src = readFileSync(R + '/js/data/' + f, 'utf8');
    for (const m of src.matchAll(/hillDefBonus:\s*([0-9.]+)/g)) if (Number(m[1]) >= 5) big.push(f + ': ' + m[0]);
    sd += (src.match(/siegeDefenseMult:\s*1\.\d+/g) || []).length;
  }
  ok(!big.length, 'no effect hands out five or more pips of hill bonus' + (big.length ? ': ' + big.join('; ') : ''));
  ok(sd >= 6, 'the six siege-defence cards speak siegeDefenseMult (' + sd + ' found)');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
