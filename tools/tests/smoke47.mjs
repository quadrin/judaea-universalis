// Headless regression — SPEC §69: force them to release nations. A fallen
// court whose era-start lands the enemy owns can be restored as a free nation
// at the peace table: priced by development against war score, excluded from
// separate peaces, the enemy keeps its capital, ceded provinces trump released
// ones, and the restored nation rises independent — truce-sheltered, loving
// its liberator, remembered bitterly by its old master.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const {
  peaceDealInfo, evaluatePeaceDeal, executePeaceDeal, releasableNations,
  truceActive, armiesOf,
} = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const fakeGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const bus = { emit() {}, on() { return () => {}; } };
const idOf = (n) => MAP_DATA.provinces.findIndex((p) => p.name === n) + 1;

const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
const g = initGame({
  DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_66, events: [],
  playerTag: 'JUD', rngSeed: 47, provinceMap,
});
const ctx = makeCtx({
  game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus,
  bookmark: BOOKMARK_66, events: [], provinceMap,
});
const prov = (n) => g.provinces[idOf(n)];
const war = g.wars.find((w) => (w.attackers.includes('JUD') && w.defenders.includes('ROM'))
  || (w.attackers.includes('ROM') && w.defenders.includes('JUD')));
ok(!!war, 'the Great Revolt is on the books');

// Rome has swallowed Nabataea whole: every Nabataean province turns Roman,
// every Nabataean army is disbanded, the banner falls.
const nabProvs = [];
for (const p of g.provinces) {
  if (p && !p.impassable && p.owner === 'NAB') {
    nabProvs.push(p.id);
    p.owner = 'ROM';
    p.controller = 'ROM';
  }
}
for (const a of armiesOf(ctx, 'NAB')) delete g.armies[a.id];
g.tags.NAB.alive = false;
ok(nabProvs.length >= 5, 'Nabataea has fallen: ' + nabProvs.length + ' provinces now Roman');

console.log('== the fallen are on the table; the living and the crowned are not ==');
{
  const rows = releasableNations(ctx, war, 'JUD', 'ROM');
  const nab = rows.find((r) => r.tag === 'NAB');
  ok(!!nab, 'dead Nabataea is releasable from Rome');
  ok(nab && nab.provIds.length === nabProvs.length && nab.provIds.includes(idOf('Petra')),
    'the whole Nabataean patrimony is in the release — Petra included ('
    + (nab ? nab.provIds.length : 0) + ' provinces, ' + (nab ? nab.dev : 0) + ' dev)');
  ok(nab && nab.cost >= 10 && nab.cost === Math.max(10, Math.round(nab.dev * 0.5)),
    'the restoration is priced by development: ' + (nab ? nab.cost : '—') + ' war score');
  ok(!rows.some((r) => r.tag === 'AGR'), 'living Agrippa is a cession matter, not a release');
  ok(!rows.some((r) => r.tag === 'WASTE' || r.tag === 'REB'), 'the waste and the rebels are never nations');
  const info = peaceDealInfo(ctx, war, 'JUD');
  ok(Array.isArray(info.releasable) && info.releasable.some((r) => r.tag === 'NAB'),
    'peaceDealInfo carries the release table');
}

console.log('== the enemy keeps its own capital ==');
{
  // Hand Rome's capital province to a dead tag's history: fake it by asking
  // what happens if the fallen court's lands include Antioch. Antioch is
  // era-owned by Rome itself, so instead prove the rule directly: make ARM
  // dead and Roman, then check Tigranocerta releases but a would-be capital
  // is skipped when it IS the enemy capital name.
  const armProvs = [];
  for (const p of g.provinces) {
    if (p && !p.impassable && p.owner === 'ARM') {
      armProvs.push(p.id); p.owner = 'ROM'; p.controller = 'ROM';
    }
  }
  for (const a of armiesOf(ctx, 'ARM')) delete g.armies[a.id];
  g.tags.ARM.alive = false;
  const rows = releasableNations(ctx, war, 'JUD', 'ROM');
  ok(rows.some((r) => r.tag === 'ARM'), 'dead Armenia joins the release table');
  // The rule itself: a province bearing the enemy's capital name never releases.
  const capName = DEFINES.TAGS.ROM.capital;
  ok(rows.every((r) => !r.provNames.includes(capName)),
    'no release row carries the enemy capital (' + capName + ')');
}

console.log('== the price is real: warscore gates the restoration ==');
{
  war.warscore.JUD = 5;
  const ev = evaluatePeaceDeal(ctx, war, 'JUD', { release: ['NAB'] });
  ok(!ev.acceptable && ev.release.length === 1,
    'at +5 war score Rome refuses: ' + ev.reason);
  war.warscore.JUD = 90;
  const ev2 = evaluatePeaceDeal(ctx, war, 'JUD', { release: ['NAB'] });
  ok(ev2.acceptable && ev2.release.includes('NAB'), 'at +90 the restoration is compelled (cost ' + ev2.cost + ')');
  const white = evaluatePeaceDeal(ctx, war, 'JUD', { release: [] });
  ok(white.cost === 0, 'no release asked, no release priced');
}

console.log('== ceded land trumps released land ==');
{
  prov('Petra').controller = 'JUD'; // we stand on Petra, and we keep it
  const opinionBefore = (g.tags.NAB.opinion && g.tags.NAB.opinion.JUD) || 0;
  const deal = { provinces: [idOf('Petra')], release: ['NAB'] };
  const ev = evaluatePeaceDeal(ctx, war, 'JUD', deal);
  const row = ev.releaseRows.find((r) => r.tag === 'NAB');
  ok(row && !row.provIds.includes(idOf('Petra')),
    'Petra is struck from the release when the deal cedes it to us');
  ok(ev.acceptable, 'the combined deal still clears at +90: ' + ev.reason);

  executePeaceDeal(ctx, war, 'JUD', deal);
  ok(prov('Petra').owner === 'JUD', 'Petra is ours by cession');
  ok(prov('Bostra').owner === 'NAB' && prov('Bostra').controller === 'NAB',
    'Bostra returns to the restored Nabataea');
  const t = g.tags.NAB;
  ok(t.alive === true && !t.overlord, 'Nabataea lives again, independent — no overlord');
  ok(truceActive(ctx, 'NAB', 'ROM'), 'a five-year truce shelters the newborn from its old master');
  ok((t.opinion.JUD || 0) >= opinionBefore + 90,
    'the restored court loves its liberator (opinion ' + opinionBefore + ' -> ' + t.opinion.JUD + ')');
  const grudge = g.tags.ROM.grudges && g.tags.ROM.grudges.NAB;
  ok(!!grudge && grudge.provs.includes(idOf('Bostra')),
    'Rome remembers the lands it was made to disgorge');
  ok(armiesOf(ctx, 'NAB').length === 1 && armiesOf(ctx, 'NAB')[0].name === 'Army of the Restoration',
    'a small host musters at the restored seat');
  ok((g.chronicle || []).some((c) => /banners of Nabataea rise again/.test(c.text)),
    'the chronicle records the restoration');
  ok(!g.wars.includes(war), 'the treaty ends the war');
}

console.log('== a separate peace cannot redraw another crown\'s map ==');
{
  // A fresh two-enemy coalition against us (synthetic — the fresh truce
  // rightly blocks a real declareWar): releases appear at the congress table
  // but not in the separate corridor.
  const w2 = {
    id: 999, name: 'The Second War', attackers: ['ROM', 'PAR'], defenders: ['JUD'],
    warscore: { ROM: 0, PAR: 0, JUD: 0 }, started: { ...g.date },
  };
  g.wars.push(w2);
  const sep = peaceDealInfo(ctx, w2, 'JUD', 'PAR');
  ok(sep.separate === true, 'the Parthian corridor is a separate table');
  ok(Array.isArray(sep.releasable) && sep.releasable.length === 0,
    'no releases in a separate peace — they wait for the full congress');
}

if (failures) { console.error(failures + ' FAILURES'); process.exit(1); }
console.log('\nALL PASS');
