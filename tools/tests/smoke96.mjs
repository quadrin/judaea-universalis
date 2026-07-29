// Headless regression — SPEC §145: the number on the chrome is the number the
// treasury moves.
//
// Reported: "occasionally, when I have positive talent flow, my income still
// goes down." It does, and it is not occasional — it is exact and it is large.
//
// The topbar and the realm panel both rendered `t.income - t.expenses`. That
// pair is the OPERATING LEDGER — taxes and trade against upkeep, admin,
// interest and tribute — and it is deliberately not the whole purse. Two other
// flows move the treasury and appear in neither:
//
//   · the court's own consumption (§101), which drains 6% of any reserve past
//     eighteen months of gross income, and
//   · subsidies and reparations in and out, which are in `bd.net` but in
//     neither `t.income` nor `t.expenses`.
//
// So a realm sitting on a war-chest read a cheerful +0.4 a month while the
// treasury fell by hundreds. `explainIncome` was honest the whole time — it
// lists the court's consumption and totals a true "Monthly balance" — but the
// headline the player actually reads was the ledger.
//
// The fix is `t.netFlow`: MEASURED, not re-derived. It is the difference the
// treasury saw between the start and end of the month, so it cannot disagree
// with itself. `income`/`expenses` stay exactly as they were, because
// `crisis.js` and `ai.js` read `income < expenses` to mean "this realm cannot
// pay its bills" — which a court spending down a hoard emphatically can.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { runMonthlyEconomy, incomeBreakdown, explainIncome } = await import(R + '/js/sim/economy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const flatGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};

function boot(id, tag) {
  const era = ERAS.find((e) => e.bookmark.id === id);
  const b = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, b);
  const game = initGame({
    DEFINES, MAP_DATA, geom: flatGeom, bookmark: b, events: era.events,
    playerTag: tag, rngSeed: 4, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: flatGeom,
    bus: { emit() {}, on() { return () => {}; } },
    bookmark: b, events: era.events, provinceMap,
  });
  return { game, ctx };
}

// What the chrome does, in one line, exactly as topbar.js and nation_panel.js
// now do it.
const chrome = (t) => (Number.isFinite(t.netFlow) ? t.netFlow : (t.income || 0) - (t.expenses || 0));

// ---------------------------------------------------------------------------
console.log('== the report: a war-chest, a surplus, and a falling treasury ==');
{
  const w = boot('167bce', 'HAS');
  const t = w.game.tags.HAS;
  for (const chest of [200, 1000, 3000, 8000]) {
    t.treasury = chest;
    const opened = t.treasury;
    runMonthlyEconomy(w.ctx);
    const moved = Math.round((t.treasury - opened) * 100) / 100;
    const ledger = Math.round(((t.income || 0) - (t.expenses || 0)) * 100) / 100;
    ok(Math.abs(chrome(t) - moved) < 0.011,
      'at ' + chest + ' talents the chrome reads ' + chrome(t) + ' and the treasury moved ' + moved);
    if (chest >= 1000) {
      ok(ledger > 0 && moved < 0,
        '  …and this is the reported case: the ledger says ' + ledger + ' while the purse falls');
    }
  }
}

// ---------------------------------------------------------------------------
console.log('== the operating ledger is left exactly alone ==');
{
  // crisis.js raises fiscal heat on `income < expenses`, and ai.js sheds
  // regiments on it. A court draining a hoard is RICH; if the bleed were
  // folded into expenses, both would read it as insolvency.
  const w = boot('167bce', 'HAS');
  const t = w.game.tags.HAS;
  t.treasury = 20000;                     // far past any reserve cap
  runMonthlyEconomy(w.ctx);
  ok(num(t.income) >= num(t.expenses),
    'a court consuming a vast hoard still reads as solvent to the crisis and AI checks');
  ok(chrome(t) < 0, '  even though the chrome correctly shows the treasury falling');
  ok(t.treasury < 20000, '  and the treasury did fall');
}

// ---------------------------------------------------------------------------
console.log('== and the tooltip agreed all along ==');
{
  const w = boot('167bce', 'HAS');
  const t = w.game.tags.HAS;
  t.treasury = 8000;
  const rows = explainIncome(w.ctx, 'HAS');
  const consume = rows.find((r) => /court consumes/.test(r.label));
  const balance = rows.find((r) => /Monthly balance/.test(r.label));
  ok(!!consume, 'the breakdown names the court\'s consumption');
  ok(!!balance, '  and totals a monthly balance');
  const opened = t.treasury;
  runMonthlyEconomy(w.ctx);
  const moved = Math.round((t.treasury - opened) * 100) / 100;
  ok(Math.abs(balance.value - moved) < 0.05,
    '  which was the true figure the whole time (' + balance.value + ' vs ' + moved + ')');
  ok(Math.abs(chrome(t) - balance.value) < 0.05,
    'so the headline and the breakdown now say the same thing');
}

// ---------------------------------------------------------------------------
console.log('== an ordinary realm is unaffected ==');
{
  // Below the reserve cap and with no subsidies, the two must be identical —
  // this change must not put a phantom discrepancy on every normal campaign.
  for (const [id, tag] of [['167bce', 'HAS'], ['66ce', 'JUD'], ['1948ce', 'ISR'], ['529ce', 'SAM']]) {
    const w = boot(id, tag);
    const t = w.game.tags[tag];
    const bd = incomeBreakdown(w.ctx, tag);
    const gross = Math.max(0, bd.income + bd.tributeIn + (bd.subsIn || 0) + (bd.powerIn || 0));
    t.treasury = Math.min(100, Math.max(0, gross * 2)); // comfortably under the cap
    runMonthlyEconomy(w.ctx);
    const ledger = Math.round(((t.income || 0) - (t.expenses || 0)) * 100) / 100;
    const subs = (bd.subsIn || 0) - (bd.subsOut || 0);
    ok(Math.abs(chrome(t) - ledger - subs) < 0.05,
      id + '/' + tag + ': under the cap the chrome equals the ledger (' + chrome(t) + ' vs ' + ledger + ')');
  }
}

// ---------------------------------------------------------------------------
console.log('== a save written before this loads without a phantom reading ==');
{
  const w = boot('167bce', 'HAS');
  const t = w.game.tags.HAS;
  runMonthlyEconomy(w.ctx);
  delete t.netFlow;                       // a pre-§145 save carries no measurement
  ok(chrome(t) === Math.round(((t.income || 0) - (t.expenses || 0)) * 100) / 100
    || Math.abs(chrome(t) - ((t.income || 0) - (t.expenses || 0))) < 0.011,
  'with no measurement yet the chrome falls back to the ledger, as before');
  runMonthlyEconomy(w.ctx);
  ok(Number.isFinite(t.netFlow), '  and the first month of play measures it');
}

function num(v) { return Number.isFinite(v) ? v : 0; }

console.log(failures ? `smoke96: ${failures} FAIL` : 'smoke96: ALL PASS');
process.exit(failures ? 1 : 0);
