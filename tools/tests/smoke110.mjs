// Headless regression — SPEC §176: the half-shekel is weighed, and the east
// empties.
//
// Two fixes to §172's dispersion, one balance and one history. The balance
// fix: silver was a flat 22 talents a size point on a 30-month clock, which
// made Alexandria worth 110 talents every two and a half years — a mint, not
// a collection. It is pegged to the host province's development now, on a
// 60-month clock. The history fix: the eastern windows never closed, so the
// 1948 chapter could write to Salonica five years after the deportations and
// farm Baghdad for decades after the airlift emptied it. The windows close on
// their own dates now — Iraq 1952, Syria 1950, Salonica 1943, Lebanon 1968,
// Iran 1979 — and the absorption chain carries Israel's end of the departure.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const { devTotal } = await import(R + '/js/sim/military.js');
const { DIASPORA, DIASPORA_ASKS, communityOf, openAt, shutBy, communitiesBetween } =
  await import(R + '/js/data/diaspora.js');
const { EVENTS_1948_ABSORPTION } = await import(R + '/js/data/events_1948_absorption.js');
const { computeMapmodeColors } = await import(R + '/js/map/mapmodes.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

function loadGeom() {
  const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
  return {
    neighbors: snap.neighbors.map((a) => new Set(a)),
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
}
function foldGeom(raw, mapping) {
  const N = raw.neighbors.length - 1;
  const to = (id) => (mapping && mapping[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  const areas = new Int32Array(N + 1);
  const coastal = new Array(N + 1).fill(false);
  const centroids = raw.centroids.slice();
  const offshore = raw.offshore.slice();
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    areas[t] += raw.areas[id];
    if (raw.coastal[id]) coastal[t] = true;
    if (!offshore[t] && raw.offshore[id]) offshore[t] = raw.offshore[id];
    for (const nb of raw.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  for (let id = 1; id <= N; id++) {
    if (to(id) !== id) { centroids[id] = centroids[to(id)]; offshore[id] = offshore[to(id)]; }
  }
  return { neighbors, centroids, areas, coastal, offshore, bbox: [] };
}
const RAW = loadGeom();
function boot(bookmarkId, { seed = 13 } = {}) {
  const era = ERAS.find((e) => e.bookmark.id === bookmarkId);
  const bm = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bm);
  const geom = foldGeom(RAW, provinceMap);
  const tag = bm.playableTags[0].tag;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: bm, events: era.events, playerTag: tag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus: { emit() {}, on() {} }, bookmark: bm, events: era.events, provinceMap,
  });
  game.tags[tag].ai = false;
  return { bm, game, ctx, actions: gameActions(ctx), tag };
}
const run = (ctx, years) => { for (let i = 0; i < years * 360; i++) tickDay(ctx); };

console.log('== the half-shekel is weighed, not minted ==');
{
  const silver = DIASPORA_ASKS.find((a) => a.id === 'silver');
  ok(silver.cd === 60, 'the silver clock is a generation\'s patience: 60 months, up from 30');
  ok(!Number.isFinite(silver.treasuryPer), 'the flat per-size rate is gone from the data');
  ok(silver.treasuryPerDev === 0.4, 'and the rate is per point of host development');

  const { game, ctx, actions, tag } = boot('66ce', { seed: 4 });
  run(ctx, 1);
  const t = game.tags[tag];
  t.points.infl = 400;

  const bab = ctx.provId('Babylon');
  const p = game.provinces[bab];
  const c = actions.getCommunity(bab);
  const ask = c.asks.find((a) => a.id === 'silver');
  const expected = Math.round(0.4 * devTotal(p) * 4);
  ok(ask.gain.treasury === expected,
    `Babylon's silver is dev × size (${devTotal(p)} dev × size 4 × 0.4 = ${expected})`);
  ok(ask.gain.treasury < 88, `and less than the flat rate it replaced (${ask.gain.treasury} < 88)`);

  // Same size, different city: the yield is a fact about the province now.
  const roma = actions.getCommunity(ctx.provId('Roma'));
  const cyrene = actions.getCommunity(ctx.provId('Cyrene'));
  const romaSilver = roma.asks.find((a) => a.id === 'silver').gain.treasury;
  const cyreneSilver = cyrene.asks.find((a) => a.id === 'silver').gain.treasury;
  ok(roma.size === cyrene.size && romaSilver > cyreneSilver,
    `two size-${roma.size} communities differ by their city: Rome ${romaSilver}, Cyrene ${cyreneSilver}`);

  // The ask pays exactly what the panel promised.
  const before = t.treasury;
  const r = actions.askCommunity(bab, 'silver');
  ok(r.ok && Math.round(t.treasury - before) === ask.gain.treasury,
    `what arrives is what was shown (${ask.gain.treasury} talents)`);
  const again = actions.getCommunity(bab).asks.find((a) => a.id === 'silver');
  const m = /(\d+) months/.exec(again.whyNot || '');
  ok(!again.can && !!m && Number(m[1]) >= 55,
    'and the clock reads in decades now: ' + (again.whyNot || ''));

  // A city that grows sends more; the other asks kept their flat rates.
  p.dev.prod += 10;
  const grown = actions.getCommunity(bab).asks.find((a) => a.id === 'silver');
  ok(grown.gain.treasury === expected + 16, 'ten points of growth raise the gathering by 16');
  const letters = c.asks.find((a) => a.id === 'letters');
  ok(letters.gain.infl === 7 * 4, 'letters still scale by size alone — the nerf is the silver\'s');
}

console.log('== the windows of the east close on their own dates ==');
{
  for (const [prov, y] of [
    ['Babylon', 1952], ['Nehardea', 1952], ['Seleucia-Ctesiphon', 1952], ['Arbela', 1952],
    ['Damascus', 1950], ['Nisibis', 1950],
    ['Thessalonica', 1943], ['Tyre', 1968],
    ['Susa', 1979], ['Ecbatana', 1979],
  ]) {
    ok(communityOf(prov).until === y, `${prov} closes in ${y}`);
  }
  // …and nothing leaks backwards: every one of them is open for the ancient
  // chapters that were tuned against it.
  ok([66, 132, 614].every((y) => openAt(communityOf('Babylon'), y)),
    'Babylon still answers 66, 132 and 614');
  // Nobody is expelled from Rome or Istanbul: a window that closed itself out
  // of tidiness would be the same lie in the other direction.
  for (const prov of ['Roma', 'Antioch', 'Byzantion', 'Corinth']) {
    ok(openAt(communityOf(prov), 1955), `${prov} stays open in 1955`);
  }
  ok(shutBy(communityOf('Thessalonica'), 1948),
    'Salonica is already shut when the 1948 chapter opens');
}
{
  const { game, ctx, actions } = boot('1948ce');
  run(ctx, 0.1);
  ok(!actions.getCommunity(ctx.provId('Thessalonica')),
    '1948 cannot write to Salonica: the community was murdered five years before the chapter opens');
  ok(!!actions.getCommunity(ctx.provId('Seleucia-Ctesiphon')),
    'but Baghdad\'s community is still there in May 1948, and can still be asked');
  ok(!!actions.getCommunity(ctx.provId('Babylon')), '…and Hilla\'s');

  game.date.y = 1953;
  for (const n of ['Babylon', 'Nehardea', 'Seleucia-Ctesiphon', 'Arbela', 'Damascus', 'Nisibis']) {
    ok(!actions.getCommunity(ctx.provId(n)), `by 1953 ${n} has gone out`);
  }
  ok(!!actions.getCommunity(ctx.provId('Susa')) && !!actions.getCommunity(ctx.provId('Ecbatana')),
    'Iran is not Iraq: the Persian communities stand');
  ok(!!actions.getCommunity(ctx.provId('Tyre')), 'and Lebanon\'s grows before it goes');
  game.date.y = 1969;
  ok(!actions.getCommunity(ctx.provId('Tyre')), 'until after 1967');
  game.date.y = 1979;
  ok(!actions.getCommunity(ctx.provId('Susa')), 'the Revolution closes Susa');

  // The map carries it (§175): hatched, not forgotten.
  game.date.y = 1948;
  const idx = {};
  game.provinces.forEach((q, i) => { if (q) idx[q.canon || q.name] = i; });
  const r48 = computeMapmodeColors({ game, DEFINES }, 'diaspora');
  ok((r48.flags[idx.Thessalonica] & 2) === 2, 'the 1948 map hatches Salonica from the first day');
  ok((r48.flags[idx.Babylon] & 2) === 0, 'while Babylon still reads as a living community');
  game.date.y = 1955;
  const r55 = computeMapmodeColors({ game, DEFINES }, 'diaspora');
  ok((r55.flags[idx.Babylon] & 2) === 2, 'and after the airlift, Babylon is hatched too');
  ok((r55.flags[idx.Susa] & 2) === 0, 'Susa is not');

  // The Compendium's era page tells the same story (§175: one predicate).
  const names = communitiesBetween(1948, 2005).map((d) => d.prov);
  ok(names.indexOf('Babylon') >= 0,
    'the era page lists Babylon — present for part of the chapter is present');
  ok(names.indexOf('Thessalonica') < 0, 'and does not list Salonica');
}

console.log('== Ezra and Nehemiah: Israel\'s end of the departure ==');
{
  const ev = EVENTS_1948_ABSORPTION.find((e) => e.id === 'ev_ab_ezra_and_nehemiah');
  ok(!!ev && ev.date.y === 1950 && ev.date.m === 3, 'the card is dated to the Denaturalisation Law');

  const { game, ctx, tag } = boot('1948ce', { seed: 4 });
  run(ctx, 0.2); // long enough for the monthly pass to seed the community records
  game.date.y = 1950; game.date.m = 3;
  ok(ev.trigger(ctx), 'it fires for a player Israel while Baghdad is Iraq\'s');

  const bag = ctx.prov('Seleucia-Ctesiphon');
  const wasOwner = bag.owner;
  bag.owner = tag;
  ok(!ev.trigger(ctx), 'a Baghdad that is not Iraq\'s passes no law');
  bag.owner = wasOwner;

  const t = game.tags[tag];
  const irq = game.tags.IRQ;
  const before = { tr: t.treasury, mp: t.manpower, irq: irq.treasury };
  ev.options[0].effects(ctx);
  ok(Math.round(before.tr - t.treasury) === 80, 'the charters cost 80 talents');
  ok(Math.round(t.manpower - before.mp) === 2000, 'the young men clear the camps first: +2,000 reserves');
  ok((t.modifiers || []).some((m) => m && m.id === 'ezra_and_nehemiah'),
    'and the airlift rides the ordinary modifier stream');
  ok(Math.round(irq.treasury - before.irq) === 120, 'Baghdad keeps what it froze');
  ok((bag.modifiers || []).some((m) => m && m.id === 'the_frozen_property'),
    '…and finds it traded its merchant class for a warehouse receipt');
  ok(!!game.flags.easternAirlift, 'the flag is set for the chapter to read');
}
{
  // The other answer: the metered airlift, and the dispersion hears about it.
  const { game, ctx, tag } = boot('1948ce', { seed: 5 });
  run(ctx, 0.2);
  game.date.y = 1950; game.date.m = 3;
  const ev = EVENTS_1948_ABSORPTION.find((e) => e.id === 'ev_ab_ezra_and_nehemiah');
  const t = game.tags[tag];
  const rome = ctx.prov('Roma');
  const legit = t.legitimacy;
  const standing = rome.dia && rome.dia.standing;
  ok(Number.isFinite(standing), 'Rome\'s community record exists before the card');
  ev.options[1].effects(ctx);
  ok(Math.round(legit - t.legitimacy) === 8, 'a state that told Jews to wait pays 8 legitimacy');
  ok((t.modifiers || []).some((m) => m && m.id === 'the_metered_airlift'), 'the smaller airlift still runs');
  ok((ctx.prov('Seleucia-Ctesiphon').modifiers || []).some((m) => m && m.id === 'the_stranded_registry'),
    'those still queued when the registry closes are stranded in Baghdad');
  ok(rome.dia.standing === Math.max(0, standing - 6),
    'and every community still on the board hears that the ships were made to wait');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
