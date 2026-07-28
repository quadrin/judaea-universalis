// Headless regression — SPEC §135: the long afternoon.
//
// The report was one line — "man this shit too easy" — over a screenshot of
// the Kingdom of Israel in 541 CE: 41,108 talents at +1,116 a month, 1,292,000
// men in reserve against 83,000 in the field, and G 999 / I 808 / M 999. Four
// measured causes, and this suite pins each one:
//
// §135a. Development had no roof. Every peaceful province rolled a flat ~5-19%
// chance of +1 each January, forever, and the AI spent banked points on top of
// that. Over the spans this game actually runs — a 167 BCE campaign will reach
// 541 CE without leaving the chapter — the median province went 10 -> 82 and
// the world's development went 1,459 -> 12,264 with nobody doing anything.
// Tax, production, manpower, force limit and the administration bill are all
// linear in development, so every one of them inflated eightfold too.
//
// §135b. Monarch points had nowhere to go. The tech ladder is capped by the
// age (techCeiling 9 for the antique chapters, reached inside a century) and
// nothing else on offer costs more than sixty, so the pools pinned at 999 and
// stayed there for four hundred years. A counter that cannot move is not a
// resource, and no scripted grant of points can mean anything against it.
//
// §135c. Governing scaled linearly. adminPerDev billed a hegemon's five
// thousandth point of development at exactly the rate it billed its fiftieth.
//
// §135d. Containment switched itself off. hegemonContainment — the mechanism
// written for precisely "beat the scripted enemy, then snowball unopposed" —
// only recruits `ponderous` great powers, and a campaign carried three
// centuries past its chapter has buried all of them.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const { devTotal } = await import(R + '/js/sim/military.js');
const { runMonthlyAI } = await import(R + '/js/sim/ai.js');
const {
  devCeilingFor, devCeilingOf, growthSaturation, yearlyGrowth,
  pointCap, bleedPoints, adminExpense, developInfo,
} = await import(R + '/js/sim/economy.js');
const { techCeiling, nextRungCost } = await import(R + '/js/data/tech.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// Real adjacency, so the play-forward tests run the game the player plays.
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
function boot(bookmarkId, tag, seed = 3) {
  const era = ERAS.find((e) => e.bookmark.id === bookmarkId);
  const bookmark = era.bookmark, events = era.events;
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const N = snap.neighbors.length - 1;
  const to = (id) => provinceMap[id] || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    for (const nb of snap.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  const geom = {
    neighbors,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark, events, playerTag: tag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap });
  return { game, ctx, bookmark };
}
const worldDev = (game) => {
  let sum = 0;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && game.tags[p.owner]) sum += devTotal(p);
  }
  return sum;
};
const quiet = (fn) => {
  const w = console.warn;
  console.warn = () => {};
  try { return fn(); } finally { console.warn = w; }
};

console.log('== §135a: every town is stamped with a roof, and they are not the same roof ==');
{
  const { game, ctx } = boot('167bce', 'HAS');
  const live = [];
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && game.tags[p.owner]) live.push(p);
  }
  ok(live.length > 100 && live.every((p) => Number.isFinite(p.devMax)),
    'every settled province carries a devMax (' + live.length + ' provinces)');
  ok(live.every((p) => p.devMax > devTotal(p)),
    'and every roof is above what the town already is — nothing starts capped');
  const alex = ctx.prov('Alexandria');
  const small = live.slice().sort((a, b) => devTotal(a) - devTotal(b))[0];
  ok(alex && small && alex.devMax > small.devMax * 1.5,
    'the roof follows the town: Alexandria ' + (alex && alex.devMax)
    + ' against ' + (small && small.name) + ' ' + (small && small.devMax));
  // The formula itself: proportional, floored, and never below the minimum.
  ok(devCeilingFor(ctx, 30) > devCeilingFor(ctx, 10),
    'devCeilingFor rises with what a place starts as ('
    + devCeilingFor(ctx, 10) + ' -> ' + devCeilingFor(ctx, 30) + ')');
  ok(devCeilingFor(ctx, 0) >= 24,
    'and empty land still has somewhere to go (' + devCeilingFor(ctx, 0) + ')');
  // No stamp — a save from before §135 — falls back to one roof for the age.
  const orphan = { dev: { tax: 5, prod: 5, mp: 5 } };
  ok(devCeilingOf(ctx, orphan) === Math.round(18 + 3 * techCeiling(ctx.bookmark)),
    'unstamped land falls back to the age ceiling (' + devCeilingOf(ctx, orphan) + ')');
}

console.log('== §135a: growth runs free, then tapers, then stops ==');
{
  const { ctx } = boot('167bce', 'HAS');
  const p = { dev: { tax: 0, prod: 0, mp: 0 }, devMax: 50 };
  const at = (d) => { p.dev.tax = d; return growthSaturation(ctx, p); };
  ok(at(10) === 1 && at(29) === 1, 'full pace below the soft line (0.6 x 50 = 30)');
  ok(at(40) > 0 && at(40) < 1, 'tapering above it (' + at(40).toFixed(2) + ' at 40)');
  ok(at(49) < at(40), 'and tapering monotonically (' + at(49).toFixed(2) + ' at 49)');
  ok(at(50) === 0 && at(80) === 0, 'nothing at all at the roof or past it');
}

console.log('== §135a: the roof binds the plough AND the ledger ==');
{
  // Mutation check: run January five hundred times over a province at its roof
  // and over an identical one below it. The engine must move one and not the
  // other, or the ceiling is a comment.
  const { game, ctx } = boot('167bce', 'HAS');
  const hi = ctx.prov('Jerusalem');
  const lo = ctx.prov('Hebron');
  for (const p of [hi, lo]) { p.owner = 'HAS'; p.controller = 'HAS'; p.unrest = 0; p.siege = null; }
  game.tags.HAS.atWarWith = [];
  hi.dev = { tax: hi.devMax, prod: 0, mp: 0 }; // exactly at its roof
  lo.dev = { tax: 3, prod: 3, mp: 3 };
  const hiBefore = devTotal(hi), loBefore = devTotal(lo);
  quiet(() => { for (let i = 0; i < 500; i++) yearlyGrowth(ctx); });
  ok(devTotal(hi) === hiBefore,
    'five hundred Januaries do not move a town at its roof (' + hiBefore + ')');
  ok(devTotal(lo) > loBefore,
    'and they do move one below it (' + loBefore + ' -> ' + devTotal(lo) + ')');
  ok(devTotal(lo) <= lo.devMax,
    'and it stopped at its own roof, not somebody else\'s (' + devTotal(lo) + '/' + lo.devMax + ')');

  // Bought development was the LARGER of the two sources: banked points walked
  // Rome from 27 to 83 in the old build, straight through any ceiling on
  // January's free growth. It has to answer to the same roof.
  const t = game.tags.HAS;
  t.points = { gov: 999, infl: 999, mar: 999 };
  const atRoof = developInfo(ctx, 'HAS', hi.id, 'tax');
  ok(!atRoof.can && /as far as it can/.test(atRoof.why),
    'and a full treasury of points cannot buy past it: "' + atRoof.why + '"');
  lo.dev = { tax: 3, prod: 3, mp: 3 };
  ok(developInfo(ctx, 'HAS', lo.id, 'tax').can,
    'while a town with room to grow may still be developed');
}

console.log('== §135a: seven centuries of an untouched world no longer inflate it ==');
{
  // The headline claim, measured the way the complaint was: leave the map
  // alone and see what it is worth later. Before §135 this reached 12,264 and
  // was still climbing at the end; the roofs make it converge instead.
  const { game, ctx } = boot('167bce', 'HAS', 3);
  for (const k of Object.keys(game.tags)) game.tags[k].ai = true;
  game.paused = false;
  const start = worldDev(game);
  quiet(() => { for (let y = 0; y < 300; y++) for (let d = 0; d < 365; d++) tickDay(ctx); });
  const at300 = worldDev(game);
  quiet(() => { for (let y = 0; y < 200; y++) for (let d = 0; d < 365; d++) tickDay(ctx); });
  const at500 = worldDev(game);
  ok(at300 > start * 1.5,
    'the world still develops — five centuries are not five centuries of nothing ('
    + start + ' -> ' + at300 + ')');
  ok(at300 < start * 4,
    'but nothing like eightfold (' + (at300 / start).toFixed(1) + 'x at year ' + game.date.y + ')');
  ok(at500 - at300 < (at300 - start) * 0.2,
    'and it has converged: the last two centuries added '
    + (at500 - at300) + ' against ' + (at300 - start) + ' for the first three');
}

console.log('== §135b: a pool is a fund for the next rung, not a vault ==');
{
  const { game, ctx } = boot('167bce', 'HAS');
  const t = game.tags.HAS;
  const months = 0;
  for (const key of ['gov', 'infl', 'mar']) {
    const rung = nextRungCost(ctx.bookmark, t.tech, key, months);
    ok(rung > 0 && pointCap(ctx, 'HAS', key) >= rung,
      key + ': the cap always covers the next rung (' + pointCap(ctx, 'HAS', key)
      + ' against a price of ' + rung + ')');
  }
  // A court that has climbed the age's ladder has nothing left to save for.
  const ceil = techCeiling(ctx.bookmark);
  t.tech = { gov: ceil, infl: ceil, mar: ceil };
  ok(nextRungCost(ctx.bookmark, t.tech, 'gov', months) === 0,
    'at the age\'s ceiling there is no next rung to price');
  ok(pointCap(ctx, 'HAS', 'gov') === DEFINES.BALANCE.pointCapFloor,
    'so the cap falls to the floor (' + pointCap(ctx, 'HAS', 'gov') + ')');
}

console.log('== §135b: the excess drains, and only the excess ==');
{
  const { game, ctx } = boot('167bce', 'HAS');
  const t = game.tags.HAS;
  const ceil = techCeiling(ctx.bookmark);
  t.tech = { gov: ceil, infl: ceil, mar: ceil };
  const cap = pointCap(ctx, 'HAS', 'gov');
  t.points = { gov: 999, infl: cap, mar: Math.round(cap / 2) };
  bleedPoints(ctx, 'HAS');
  ok(t.points.gov < 999 && t.points.gov > cap,
    'one month takes a bite out of 999 without emptying it (' + t.points.gov + ')');
  ok(t.points.infl === cap, 'a pool exactly at the cap is untouched (' + t.points.infl + ')');
  ok(t.points.mar === Math.round(cap / 2), 'and one below it is untouched');
  // The screenshot's condition, played out: 999 for a maxed court converges to
  // the cap in a human number of months, and does not overshoot to zero.
  for (let m = 0; m < 240; m++) bleedPoints(ctx, 'HAS');
  ok(t.points.gov <= cap + 1 && t.points.gov >= cap - 1,
    'and twenty years of drain settles ON the cap, not through it (' + t.points.gov + ')');
}

console.log('== §135b: played forward, the three numbers stop reading 999 ==');
{
  const { game, ctx } = boot('132ce', 'JUD', 7);
  for (const k of Object.keys(game.tags)) game.tags[k].ai = true;
  game.paused = false;
  quiet(() => { for (let y = 0; y < 250; y++) for (let d = 0; d < 365; d++) tickDay(ctx); });
  const t = game.tags.JUD;
  if (t && t.alive) {
    const worst = Math.max(t.points.gov, t.points.infl, t.points.mar);
    ok(worst < 700,
      'after two and a half centuries no pool is anywhere near the clamp ('
      + Math.round(t.points.gov) + '/' + Math.round(t.points.infl) + '/' + Math.round(t.points.mar) + ')');
  } else {
    ok(true, 'JUD did not survive this seed — nothing to assert about its pools');
  }
  let pinned = 0, live = 0;
  for (const k of Object.keys(game.tags)) {
    const o = game.tags[k];
    if (!o || !o.alive || k === 'REB' || !o.points) continue;
    live++;
    if (Math.min(o.points.gov, o.points.infl, o.points.mar) >= 999) pinned++;
  }
  ok(live > 0 && pinned === 0,
    'and no court in the world is sitting on a full 999/999/999 (' + live + ' courts)');
}

console.log('== §135c: the twentieth province costs more to hold than the fifth ==');
{
  const { game, ctx } = boot('167bce', 'HAS');
  const E = DEFINES.BASE;
  // Give one tag a stated amount of governed development and read the bill.
  const billFor = (target) => {
    for (let i = 1; i < game.provinces.length; i++) {
      const p = game.provinces[i];
      if (p && !p.impassable && p.owner === 'HAS') { p.owner = 'WASTE'; p.controller = 'WASTE'; }
    }
    let given = 0, i = 1;
    for (; i < game.provinces.length && given < target; i++) {
      const p = game.provinces[i];
      if (!p || p.impassable || !game.tags[p.owner]) continue;
      p.owner = 'HAS'; p.controller = 'HAS';
      p.dev = { tax: 10, prod: 10, mp: 10 };
      given += 30;
    }
    return { dev: given, bill: adminExpense(ctx, 'HAS') };
  };
  const small = billFor(E.adminWideDev - 60);
  const flatRate = small.bill / Math.max(1, small.dev - E.adminFreeDev);
  ok(Math.abs(flatRate - E.adminPerDev) < 1e-6,
    'a realm inside the allowance still bills the plain rate ('
    + flatRate.toFixed(3) + '/dev over ' + small.dev + ' development)');
  const big = billFor(E.adminWideDev * 4);
  const bigRate = big.bill / Math.max(1, big.dev - E.adminFreeDev);
  ok(bigRate > flatRate * 1.5,
    'an empire pays a steeper average (' + bigRate.toFixed(3) + '/dev over '
    + big.dev + ' development)');
  const flatWouldBe = (big.dev - E.adminFreeDev) * E.adminPerDev;
  ok(big.bill > flatWouldBe * 1.8,
    'and far more in total than the old linear bill (' + Math.round(big.bill)
    + ' against ' + Math.round(flatWouldBe) + ')');
}

console.log('== §135d: somebody is always watching a realm that owns a third of the world ==');
{
  // The exact late-campaign condition: a human hegemon, every ponderous power
  // dead, ordinary neighbours left. Before §135 nobody took any notice at all.
  const { game, ctx } = boot('167bce', 'HAS');
  const P = DEFINES.PERSONALITIES || {};
  const pond = Object.keys(game.tags).filter((k) => P[k] && P[k].ponderous);
  ok(pond.length > 0, 'the era does name ponderous powers (' + pond.join(', ') + ')');
  const t = game.tags.HAS;
  t.ai = false; t.alive = true; t.overlord = null;
  game.humanTags = ['HAS'];
  // Hand HAS well past containWarShare of the settled world, and bury Rome,
  // Parthia and the Seleucids so the old watcher list comes back empty.
  let n = 0, total = 0;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && game.tags[p.owner]) total++;
  }
  for (let i = 1; i < game.provinces.length && n < total * 0.6; i++) {
    const p = game.provinces[i];
    if (!p || p.impassable || !game.tags[p.owner] || p.owner === 'HAS') continue;
    p.owner = 'HAS'; p.controller = 'HAS'; n++;
  }
  for (const k of pond) { game.tags[k].alive = false; }
  const survivors = Object.keys(game.tags).filter((k) => {
    const o = game.tags[k];
    return o && o.alive && o.ai && k !== 'HAS' && k !== 'REB';
  });
  ok(survivors.length > 0, 'and ordinary courts outlive them (' + survivors.join(', ') + ')');
  const before = survivors.map((k) => {
    const o = game.tags[k];
    return (o.opinion && o.opinion.HAS) || 0;
  });
  game.paused = false;
  quiet(() => { for (let m = 0; m < 12; m++) runMonthlyAI(ctx); });
  ok(game.flags && game.flags.containmentWatch === true,
    'the powers take notice even with every great power in the ground');
  const soured = survivors.filter((k, i) => {
    const o = game.tags[k];
    return ((o.opinion && o.opinion.HAS) || 0) < before[i];
  });
  ok(soured.length > 0,
    'and somebody\'s opinion of the hegemon is sliding (' + soured.join(', ') + ')');
}

console.log(failures ? `smoke90: ${failures} FAILURES` : 'smoke90: ALL PASS');
process.exit(failures ? 1 : 0);
