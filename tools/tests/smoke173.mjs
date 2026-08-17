// Headless regression — SPEC §254: the tree is a ladder of difficulty, and
// the clock stops pacing it.
//
// A mission tree is supposed to say by its shape what a realm has to become
// and in what order. Ours said it by hand — an author picked a column,
// sometimes a row — and then §207's metronome did the actual spacing: one
// accomplishment a month, then two months of rest, so a realm that had
// genuinely earned three medallions was told to wait for two of them. What
// replaces it is the thing a tree should have been all along: each mission's
// own `check` asked against a realm grown a twelfth at a time, and seated as
// deep as the answer says.
//
// Six contracts:
//
//   1. THE LADDER MEASURES. Harder objectives cost more than easier ones, in
//      the chapters' own tables, by the checks' own arithmetic.
//   2. THE PROBE IS A QUESTION, NOT A TURN. Measuring must not touch the live
//      board: not a province, not a tag, not the seeded stream.
//   3. IT IS DETERMINISTIC AND MEMOIZED — the panel asks on every repaint.
//   4. THE LAYOUT OBEYS IT: no two medallions in one cell, no child above its
//      parent, and within a column the measured missions go down in order of
//      what they cost.
//   5. NOTHING RESTS. Two medallions earned in one month are claimable in one
//      month, and a save carrying §207's rest loads into a world without one.
//   6. THE AI BANKS WHAT IT HAS EARNED, in the month it earns it — §102's
//      symmetry, which the metronome had been breaking on both sides.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { missionsFor, checkMissions } = await import(R + '/js/sim/realm.js');
const { missionCosts, costBand } = await import(R + '/js/sim/mission_cost.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

function boot(eraId, tag, seed) {
  const era = ERAS.find((e) => e.bookmark.id === eraId);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({
    DEFINES, MAP_DATA, geom: null, bookmark: era.bookmark, events: era.events,
    playerTag: tag, rngSeed: seed || 254, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: null, bus,
    bookmark: era.bookmark, events: era.events, provinceMap,
  });
  game.tags[tag].ai = false;
  return { game, ctx, era, actions: gameActions(ctx) };
}

// The chairs the chapters are written around: one playable tag each.
const CHAIRS = [
  ['167bce', 'HAS'], ['67bce', 'HYR'], ['40bce', 'HER'], ['66ce', 'JUD'],
  ['132ce', 'JUD'], ['351ce', 'JUD'], ['529ce', 'SAM'], ['614ce', 'JUD'],
  ['1948ce', 'ISR'],
];

// ---------------------------------------------------------------------------
console.log('== 1 · the ladder measures what a mission actually asks ==');
{
  const w = boot('167bce', 'HAS');
  const list = missionsFor(w.ctx, 'HAS');
  const costs = missionCosts(w.ctx, 'HAS', list);
  const cost = (id) => costs.get(id);
  ok(Number.isFinite(cost('hm_hills')), 'eleven thousand men under arms is measurable');
  ok(Number.isFinite(cost('hm_freedom')), 'so is a war score of forty');
  ok(cost('hm_freedom') > cost('hm_ascents'),
    `+40 war score costs more than +20 (${cost('hm_freedom')} > ${cost('hm_ascents')})`);
  ok(cost('hm_queens_peace') > cost('hm_city'),
    `the Queen's Peace costs more than taking Jerusalem (${cost('hm_queens_peace')} > ${cost('hm_city')})`);
  ok(cost('hm_akra') >= cost('hm_hills'),
    'holding the city with seventeen thousand men costs at least what raising eleven did');
  // A flag an event sets is not a thing growth buys, and the ladder says so
  // rather than guessing.
  const unmeasured = list.filter((m) => costs.get(m.id) === null || costs.get(m.id) === undefined);
  ok(unmeasured.length > 0 && unmeasured.length < list.length,
    `some of the chain is narrative and keeps its author's seat (${unmeasured.length}/${list.length})`);
  // Every chapter's chain has to price SOMETHING, or the tree it draws is the
  // hand-authored one with extra steps.
  for (const [era, tag] of CHAIRS) {
    const ww = boot(era, tag);
    const ll = missionsFor(ww.ctx, tag);
    const cc = missionCosts(ww.ctx, tag, ll);
    const priced = ll.filter((m) => Number.isFinite(cc.get(m.id))).length;
    ok(priced >= Math.max(3, Math.floor(ll.length * 0.3)),
      `${era}/${tag}: the ladder prices ${priced} of ${ll.length}`);
  }
}

// ---------------------------------------------------------------------------
console.log('== 2 · the probe is a question, not a turn ==');
{
  const w = boot('66ce', 'JUD');
  const g = w.game;
  const list = missionsFor(w.ctx, 'JUD');
  const before = {
    rng: g.rngState,
    owners: g.provinces.map((p) => (p ? p.owner + '/' + p.controller : '')).join(','),
    tag: JSON.stringify({
      t: g.tags.JUD.treasury, m: g.tags.JUD.manpower, tech: g.tags.JUD.tech,
      leg: g.tags.JUD.legitimacy, st: g.tags.JUD.stability,
    }),
    armies: Object.keys(g.armies).length,
    flags: JSON.stringify(g.flags),
    wars: JSON.stringify(g.wars),
  };
  missionCosts(w.ctx, 'JUD', list);
  ok(g.rngState === before.rng, 'the seeded stream is untouched — measuring is not playing');
  ok(g.provinces.map((p) => (p ? p.owner + '/' + p.controller : '')).join(',') === before.owners,
    'not one province changed hands');
  ok(JSON.stringify({
    t: g.tags.JUD.treasury, m: g.tags.JUD.manpower, tech: g.tags.JUD.tech,
    leg: g.tags.JUD.legitimacy, st: g.tags.JUD.stability,
  }) === before.tag, 'the realm is exactly as rich, as manned and as advanced as it was');
  ok(Object.keys(g.armies).length === before.armies, 'no probe army is left standing on the board');
  ok(JSON.stringify(g.flags) === before.flags, 'and no flag was written');
  ok(JSON.stringify(g.wars) === before.wars, 'and no war score moved');
}

// ---------------------------------------------------------------------------
console.log('== 3 · deterministic, and answered once ==');
{
  const a = boot('132ce', 'JUD');
  const b = boot('132ce', 'JUD');
  const la = missionsFor(a.ctx, 'JUD');
  const lb = missionsFor(b.ctx, 'JUD');
  const ca = missionCosts(a.ctx, 'JUD', la);
  const cb = missionCosts(b.ctx, 'JUD', lb);
  const dump = (m) => [...m.entries()].map(([k, v]) => k + '=' + v).sort().join('|');
  ok(dump(ca) === dump(cb), 'two campaigns of the same chapter measure the same ladder');
  ok(missionCosts(a.ctx, 'JUD', la) === ca, 'and the answer is memoized rather than re-measured');
}

// ---------------------------------------------------------------------------
console.log('== 4 · the layout obeys the ladder ==');
for (const [era, tag] of CHAIRS) {
  const w = boot(era, tag);
  const ms = w.actions.getMissions();
  const list = missionsFor(w.ctx, tag);
  const costs = missionCosts(w.ctx, tag, list);
  ok(ms.length > 0, `${era}/${tag}: the chain draws (${ms.length} medallions)`);
  const seats = new Set();
  let dup = 0;
  for (const m of ms) {
    const k = m.col + ':' + m.row;
    if (seats.has(k)) dup++;
    seats.add(k);
  }
  ok(dup === 0, '  no two medallions share a cell');
  let inverted = 0;
  for (const m of ms) {
    for (const rid of m.requires || []) {
      const p = ms.find((x) => x.id === rid);
      if (p && p.row >= m.row) inverted++;
    }
  }
  ok(inverted === 0, '  no child draws above its parent');
  // What difficulty actually promises, stated the way the layout can keep it.
  // A mission sits at least as deep as the ladder priced it, and at least one
  // below every prerequisite; and where two priced missions in one column are
  // held down by the same chain, the cheaper of them is the higher. A cheap
  // mission hanging off a deep parent is deeper than a dear one with no
  // parents at all, and that is the tree being right rather than the ladder
  // being ignored.
  const rowOf = new Map(ms.map((m) => [m.id, m.row]));
  const floorOf = (m) => {
    let f = 0;
    for (const rid of m.requires || []) {
      if (rowOf.has(rid)) f = Math.max(f, rowOf.get(rid) + 1);
    }
    return f;
  };
  let tooShallow = 0;
  for (const m of ms) {
    const band = costBand(costs.get(m.id));
    if (Number.isFinite(band) && m.row < band) tooShallow++;
  }
  ok(tooShallow === 0, `  every priced mission sits at least as deep as it costs (${tooShallow} too shallow)`);
  let outOfOrder = 0;
  const byCol = new Map();
  for (const m of ms) {
    const c = costs.get(m.id);
    if (!Number.isFinite(c)) continue;
    if (!byCol.has(m.col)) byCol.set(m.col, []);
    byCol.get(m.col).push({ row: m.row, cost: c, name: m.name, floor: floorOf(m) });
  }
  for (const rows of byCol.values()) {
    rows.sort((x, y) => x.row - y.row);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].cost + 1e-9 >= rows[i - 1].cost) continue;
      if (rows[i].floor > rows[i - 1].floor) continue; // held down by its own chain
      outOfOrder++;
    }
  }
  ok(outOfOrder === 0, `  and where two share a floor, the cheaper is the higher (${outOfOrder})`);
}

// ---------------------------------------------------------------------------
console.log('== 5 · nothing rests ==');
{
  const w = boot('167bce', 'HAS');
  const t = w.game.tags.HAS;
  const list = missionsFor(w.ctx, 'HAS');
  // Make the first two roots claimable at once: eleven thousand men, and the
  // city. A realm that has done both in one month may be paid for both.
  w.ctx.helpers.spawnArmy(w.ctx, 'HAS', 'Modi\'in', { inf: 20, name: 'The Probe Host' });
  const jer = w.ctx.prov('Jerusalem');
  jer.owner = 'HAS'; jer.controller = 'HAS';
  checkMissions(w.ctx);
  const ready = new Set((t.missionReady || []).map(String));
  ok(ready.has('hm_hills'), 'the muster is ready to claim');
  const first = w.actions.claimMission('hm_hills');
  ok(first && first.ok, 'and claims');
  ok(!(t.missionRest > 0), 'claiming charges no rest');
  checkMissions(w.ctx);
  const second = w.actions.claimMission('hm_city');
  ok(second && second.ok, 'the second medallion earned this month claims in the same month');
  ok((t.missionsDone || []).length === 2, 'both are banked');
  // …and a save from before this section, carrying a rest, loads into a world
  // that does not owe one.
  t.missionRest = 3;
  checkMissions(w.ctx);
  ok(!(t.missionRest > 0), 'an old save\'s rest is cleared rather than served');
  const third = w.actions.claimMission('hm_ascents');
  ok(third && third.why !== 'resting', 'and no claim is ever refused for resting');
}

// ---------------------------------------------------------------------------
console.log('== 6 · the AI banks what it has earned ==');
{
  const w = boot('167bce', 'HAS');
  w.game.tags.HAS.ai = true;            // nobody home: the chain banks itself
  w.game.humanTags = [];
  const t = w.game.tags.HAS;
  w.ctx.helpers.spawnArmy(w.ctx, 'HAS', 'Modi\'in', { inf: 20, name: 'The Probe Host' });
  const jer = w.ctx.prov('Jerusalem');
  jer.owner = 'HAS'; jer.controller = 'HAS';
  checkMissions(w.ctx);
  const done = new Set((t.missionsDone || []).map(String));
  ok(done.size >= 2, `one pass banks everything earned, not one a month (${done.size})`);
  ok(done.has('hm_hills') && done.has('hm_city'), 'both roots are paid in the month they were met');
  ok(!(t.missionRest > 0), 'and the chain is not resting afterwards');
}

console.log(failures ? failures + ' FAILURES' : 'smoke173: ALL PASS');
process.exit(failures ? 1 : 0);
