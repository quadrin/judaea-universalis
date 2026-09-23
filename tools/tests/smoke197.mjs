// Headless regression — SPEC §284: the Iron Age keeps its own religion.
//
// The three chapters before the exile (931, 732, 597 BCE) are played in
// Yahwism — the First Temple's religion, which is not Judaism — and there is
// no Samaritan faith for four centuries after the last of them. This suite
// holds that no Judaism and no Samaritanism reaches those chapters:
//
//   - the religion is called Yahwism;
//   - no province and no court opens in either faith;
//   - the two holy mountains are Yahwism's here, and a Yahwist king holding
//     Jerusalem draws on it;
//   - the 713 BCE ruling on the resettled district keeps it Yahwist;
//   - no Iron Age card converts anything to Judaism or Samaritanism.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync, readdirSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { holyFaithOf, monthlyHolySites } = await import(R + '/js/sim/realm.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const IRON = ['931bce', '732bce', '597bce'];
const LATER = new Set(['judaism', 'samaritanism']);
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const bus = { emit() {}, on() { return () => {}; } };
function boot(id, player = 'JDH') {
  const era = ERAS.find((e) => e.bookmark.id === id);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const geom = {
    neighbors: snap.neighbors.map((a) => new Set(a)),
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: [], offshore: [], areas: Int32Array.from(snap.areas), bbox: [],
  };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events,
    playerTag: player, rngSeed: 3, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events, provinceMap });
  return { era, game, ctx };
}

console.log('== the religion is called Yahwism ==');
ok(DEFINES.RELIGIONS.yahwism && DEFINES.RELIGIONS.yahwism.name === 'Yahwism',
  'the name on the map and the panels: ' + (DEFINES.RELIGIONS.yahwism || {}).name);

console.log('== nobody opens an Iron Age chapter in a later faith ==');
for (const id of IRON) {
  const { game } = boot(id);
  const provs = game.provinces.filter((p) => p && !p.impassable && LATER.has(p.religion));
  const pops = game.provinces.filter((p) => p && Array.isArray(p.pop) && p.pop.some((e) => e && LATER.has(e.r)));
  const tags = Object.entries(game.tags).filter(([, t]) => t && t.alive && LATER.has(t.religion));
  ok(!provs.length, id + ': no province is Jewish or Samaritan'
    + (provs.length ? ' (' + provs.map((p) => p.name + '=' + p.religion).join(', ') + ')' : ''));
  ok(!pops.length, '  and no community in any province is either');
  ok(!tags.length, '  and no court is' + (tags.length ? ' (' + tags.map(([k]) => k).join(', ') + ')' : ''));
}

console.log('== the holy mountains are Yahwism\'s in this age ==');
for (const id of IRON) {
  const { game, ctx } = boot(id);
  const jer = ctx.prov('Jerusalem');
  const shechem = game.provinces.find((p) => p && p.holy === 'gerizim');
  ok(jer && jer.holy === 'temple_mount' && holyFaithOf(ctx, jer) === 'yahwism',
    id + ': the Temple Mount is Yahwism\'s');
  ok(shechem && holyFaithOf(ctx, shechem) === 'yahwism', '  and so is Gerizim, at ' + (shechem && shechem.name));
}
{
  // A Yahwist king in his own capital draws on it — he used to draw nothing,
  // because the table gave the site to Judaism. (Jerusalem is also the
  // Temple's wonder, which pays its keeper either way; the difference between
  // the two runs is the holy site alone.)
  const gain = (withOverride) => {
    const { game, ctx } = boot('931bce');
    if (!withOverride) ctx.bookmark = { ...ctx.bookmark, holyFaith: undefined };
    ctx.prov('Jerusalem').controller = 'JDH';
    const t = game.tags.JDH;
    const gov = t.points.gov;
    monthlyHolySites(ctx);
    return t.points.gov - gov;
  };
  const now = gain(true), then = gain(false);
  ok(now === then + 1, 'Judah holding Jerusalem draws on the holy site: +' + now + ' governance, was +' + then);
}
{
  // The later chapters keep the table: the Mount is Judaism's there.
  const { ctx } = boot('66ce', 'JUD');
  ok(holyFaithOf(ctx, ctx.prov('Jerusalem')) === 'judaism', '66 CE: the Mount is still Judaism\'s');
}

console.log('== the resettled district keeps the god of the land ==');
{
  const { era, ctx } = boot('732bce');
  const card = era.events.find((e) => e && e.id === 'ev732h_feared_and_served');
  ok(!!card, 'the 713 BCE ruling is on the board');
  const towns = ['Sebaste', 'Neapolis'].map((n) => ctx.prov(n));
  const before = towns.map((p) => p.religion);
  card.options[0].effects(ctx);
  ok(towns.every((p, i) => p.religion === before[i] && !LATER.has(p.religion)),
    'letting them keep both leaves the district Yahwist: ' + towns.map((p) => p.name + '=' + p.religion).join(', '));
  ok(towns.every((p) => (p.modifiers || []).some((m) => m && m.id === 'h732_the_mixed_district')),
    '  and the mixed practice is carried by the modifier');
}

console.log('== no Iron Age card converts anything to a later faith ==');
{
  const files = readdirSync(R + '/js/data').filter((f) => /^(events|bookmark)_(931|732|597)bce/.test(f) || f === 'iron_age_map.js');
  const bad = [];
  for (const f of files) {
    const src = readFileSync(R + '/js/data/' + f, 'utf8');
    const re = /(changeFaith\([^)]*'(judaism|samaritanism)'|religion:\s*'(judaism|samaritanism)'|=\s*'(judaism|samaritanism)')/g;
    let m;
    while ((m = re.exec(src))) bad.push(f + ': ' + m[0]);
  }
  ok(files.length >= 20, 'read ' + files.length + ' Iron Age files');
  ok(!bad.length, 'none of them names Judaism or Samaritanism as a faith to give' + (bad.length ? ': ' + bad.join('; ') : ''));
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
