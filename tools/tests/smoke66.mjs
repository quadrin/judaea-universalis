// Headless regression — SPEC §91: no strand card in a world it does not fit.
//
// The victory strands are the worlds that outran the record, and every one of
// them gated on "alive, and holding the capital". None of them asked whether
// the realm was still SOVEREIGN — so a Judaea that bent the knee at a peace
// table went on drawing cards congratulating it on its independence, and one
// 167 BCE card (`ev_yoke_reversed`) had no world condition at all: a war score
// of 75 was enough for Antioch to sue for terms while Jerusalem was in
// Seleucid hands.
//
// This suite is deliberately data-driven: it reads the strand regions out of
// the packages themselves, so a card added to a strand tomorrow is covered by
// it without anyone remembering to add a case. The contract is one sentence —
// put the realm under a collar, and NOTHING in its victory strand fires.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');

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

// era → [bookmark module, export, events module, export, strand banner,
//        the realm the strand belongs to, an overlord to put it under, a date]
const ERAS = [
  ['167 BCE', 'bookmark_167bce.js', 'BOOKMARK_167', 'events_167bce.js', 'EVENTS_167',
    /greater victory: the world/i, 'HAS', 'SEL', -140],
  ['67 BCE', 'bookmark_67bce.js', 'BOOKMARK_67', 'events_67bce.js', 'EVENTS_67',
    /ROAD NOT TAKEN/, 'HYR', 'ROM', -40],
  ['40 BCE', 'bookmark_40bce.js', 'BOOKMARK_40', 'events_40bce.js', 'EVENTS_40',
    /HASMONEAN RESTORATION/, 'ATG', 'PAR', -30],
  ['66 CE', 'bookmark_66ce.js', 'BOOKMARK_66', 'events_66ce.js', 'EVENTS_66',
    /Second Kingdom: the victory/i, 'JUD', 'ROM', 95],
  ['132 CE', 'bookmark_132ce.js', 'BOOKMARK_132', 'events_132ce.js', 'EVENTS_132',
    /THE STANDING STATE/, 'JUD', 'ROM', 150],
  ['614 CE', 'bookmark_614ce.js', 'BOOKMARK_614', 'events_614ce.js', 'EVENTS_614',
    /THE RETURN THAT STOOD/, 'JUD', 'SAS', 660],
];

// The strand's event ids, read out of the package source so the suite grows
// with the content instead of going quietly stale.
function strandIds(file, banner) {
  const lines = readFileSync(R + '/js/data/' + file, 'utf8').split('\n');
  const start = lines.findIndex((l) => banner.test(l));
  if (start < 0) return null;
  const ids = [];
  for (let i = start; i < lines.length; i++) {
    const m = lines[i].match(/^\s{2,6}id: '([^']+)',/);
    if (m) ids.push(m[1]);
  }
  return ids;
}

// The most permissive world the strand could ask for: the realm holds
// everything it could hold, every narrative flag is set, nobody is at war,
// and the calendar is well past every date floor. If a trigger will not fire
// HERE it will not fire anywhere — which is what makes the vassal case proof
// rather than coincidence.
function bestWorld(bookmark, events, tag, year) {
  const g = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark, events, playerTag: tag, rngSeed: 21,
  });
  const ctx = makeCtx({
    game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark, events,
  });
  ctx.dynEvents = new Map();
  g.date = { y: year, m: 7, d: 1 };
  g.wars = [];
  for (const k of Object.keys(g.tags)) {
    g.tags[k].atWarWith = [];
    g.tags[k].overlord = null;
  }
  // The realm holds the whole map it is allowed to hold.
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    p.owner = tag;
    p.controller = tag;
  }
  return { g, ctx };
}
function setAllFlags(g, files) {
  const flags = new Set();
  for (const f of files) {
    const src = readFileSync(R + '/js/data/' + f, 'utf8');
    for (const m of src.matchAll(/setFlag\(ctx, '([a-zA-Z0-9_]+)'/g)) flags.add(m[1]);
    for (const m of src.matchAll(/flags\.([a-zA-Z0-9_]+) = true/g)) flags.add(m[1]);
  }
  for (const f of flags) g.flags[f] = true;
  return flags.size;
}
// How many of the strand's triggers say yes right now.
function firing(ctx, events, ids) {
  const out = [];
  for (const id of ids) {
    const ev = events.find((e) => e && e.id === id);
    if (!ev || typeof ev.trigger !== 'function') continue;
    let t = false;
    try { t = !!ev.trigger(ctx); } catch (e) { t = false; }
    if (t) out.push(id);
  }
  return out;
}

for (const [era, bmF, bmN, evF, evN, banner, tag, lord, year] of ERAS) {
  const bookmark = (await import(R + '/js/data/' + bmF))[bmN];
  const events = (await import(R + '/js/data/' + evF))[evN];
  const ids = strandIds(evF, banner);
  console.log('== ' + era + ' — the ' + (ids ? ids.length : 0) + '-card victory strand ==');
  ok(!!ids && ids.length > 0, 'the strand region is found in the package');
  if (!ids || !ids.length) continue;

  // 1. Sovereign and victorious: the strand is alive.
  const { g, ctx } = bestWorld(bookmark, events, tag, year);
  setAllFlags(g, [evF]);
  const live = firing(ctx, events, ids);
  ok(live.length > 0, 'in the sovereign victory world the strand fires ('
    + live.length + '/' + ids.length + ')');

  // 2. The same world, with a collar on. Nothing may fire.
  g.tags[tag].overlord = lord;
  const underYoke = firing(ctx, events, ids);
  ok(underYoke.length === 0, 'under ' + lord + '\'s yoke NOTHING in the strand fires'
    + (underYoke.length ? ': ' + underYoke.join(', ') : ''));

  // 3. Sovereign again, but the capital is gone. Nothing may fire either —
  //    a realm that has lost Jerusalem has not outrun any chronicle.
  g.tags[tag].overlord = null;
  const jer = ctx.prov('Jerusalem');
  if (jer) { jer.owner = lord; jer.controller = lord; }
  const capitalLost = firing(ctx, events, ids);
  ok(capitalLost.length === 0, 'with Jerusalem lost NOTHING in the strand fires'
    + (capitalLost.length ? ': ' + capitalLost.join(', ') : ''));
}

console.log('== the specific card that had no world condition at all ==');
{
  // ev_yoke_reversed asked for a war score of 75 and nothing else, so Antioch
  // sued for terms to a court whose own capital it was sitting in.
  const bookmark = (await import(R + '/js/data/bookmark_167bce.js')).BOOKMARK_167;
  const events = (await import(R + '/js/data/events_167bce.js')).EVENTS_167;
  const ev = events.find((e) => e && e.id === 'ev_yoke_reversed');
  ok(!!ev, 'the card exists');
  const { g, ctx } = bestWorld(bookmark, events, 'HAS', -140);
  // A war Judaea is winning on points.
  g.wars = [{
    attackers: ['HAS'], defenders: ['SEL'], warscore: { HAS: 90, SEL: -90 },
    name: 'The Syrian War',
  }];
  g.tags.HAS.atWarWith = ['SEL'];
  g.tags.SEL.atWarWith = ['HAS'];
  ok(!!ev.trigger(ctx), 'winning on points, sovereign, holding Syria: it fires');
  const jer = ctx.prov('Jerusalem');
  jer.owner = 'SEL'; jer.controller = 'SEL';
  ok(!ev.trigger(ctx), '...and with Jerusalem in Seleucid hands it does not');
  jer.owner = 'HAS'; jer.controller = 'HAS';
  for (const n of ['Damascus', 'Tyre', 'Sidon', 'Berytus', 'Chalcis']) {
    const p = ctx.prov(n);
    if (p) { p.owner = 'SEL'; p.controller = 'SEL'; }
  }
  ok(!ev.trigger(ctx), '...nor with the war score alone and no ground in Syria');
}

console.log('== 67 BCE already had it right, and still does ==');
{
  // freeOfRome has always checked !overlord — the model the other five eras
  // now follow. This asserts the patch did not loosen it.
  const bookmark = (await import(R + '/js/data/bookmark_67bce.js')).BOOKMARK_67;
  const events = (await import(R + '/js/data/events_67bce.js')).EVENTS_67;
  const ev = events.find((e) => e && e.id === 'ev4_v_one_crown_hyr');
  const { g, ctx } = bestWorld(bookmark, events, 'HYR', -40);
  setAllFlags(g, ['events_67bce.js']);
  g.tags.ARI.overlord = 'HYR';
  ok(!!ev.trigger(ctx), 'a unified sovereign Hyrcanus draws the card');
  g.tags.HYR.overlord = 'ROM';
  ok(!ev.trigger(ctx), 'a Roman client Hyrcanus does not');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
