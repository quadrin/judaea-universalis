// Headless regression — SPEC §180: the world is not beyond the map.
//
// The off-map powers panel is retired; the one power the frame genuinely
// cannot reach — the United States — is a COURT now: a seated tag with no
// cell, alive without land, beyond every army, barred from alliances, with
// a court, an opinion, a treasury and a ledger row like anyone else. What
// this suite holds:
//   - the USA is seated in 1948, landless, and cannot die to updateTagLife;
//   - war and alliance are refused from both chairs, with reasons;
//   - Washington convenes a §163 court despite owning nothing;
//   - the ledger row, the §165 standing table and incomeBreakdown all read
//     the same off-map economy;
//   - a pre-§180 save revives with the powers book dropped, the orphaned
//     power_* modifiers stripped, and the missing seat backfilled;
//   - the ancient chapters seat nothing off-map, and the old machinery is
//     really gone.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const { courtSeats, getCourtInfo, monthlyCourts } = await import(R + '/js/sim/courts.js');
const { incomeBreakdown } = await import(R + '/js/sim/economy.js');
const { refreshStanding } = await import(R + '/js/sim/standing.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const geom = {
  neighbors: snap.neighbors.map((a) => new Set(a)),
  centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  coastal: snap.coastal.map(Boolean),
  offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  areas: Int32Array.from(snap.areas), bbox: [],
};
const bus = { emit() {}, on() { return () => {}; } };

function boot(eraId, playerTag, seed = 5) {
  const ERA = ERAS.find((e) => e.bookmark.id === eraId);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: ERA.bookmark, events: ERA.events,
    playerTag, rngSeed: seed,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: ERA.bookmark, events: ERA.events,
  });
  return { game, ctx, actions: gameActions(ctx), bookmark: ERA.bookmark };
}

console.log('== the seat exists, landless and unkillable ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  const usa = game.tags.USA;
  ok(!!usa && usa.alive, 'the United States is seated and alive in 1948');
  ok(mil.isOffmapTag(ctx, 'USA'), 'and its def marks it off-map');
  let owned = 0;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && p.owner === 'USA') owned++;
  }
  ok(owned === 0, 'it owns no cell on the board');
  ok(usa.ruler && usa.ruler.name === 'Harry S. Truman', 'Truman is at the desk');
  mil.updateTagLife(ctx);
  ok(game.tags.USA.alive, 'updateTagLife cannot kill a seat (no land, no armies, alive)');
}

console.log('== beyond every army ==');
{
  const { game, ctx, actions } = boot('1948ce', 'ISR');
  ok(mil.declareWar(ctx, 'ISR', 'USA', null, 'conquest') === null, 'declareWar refuses a war ON a seat');
  ok(mil.declareWar(ctx, 'USA', 'EGY', null, 'conquest') === null, '…and a war BY a seat');
  ok(game.wars.length >= 1, '(the 1948 war itself is untouched)');
  game.tags.ISR.points.infl = 50; // a fresh boot has no points banked yet
  const d = actions.getDiplomacy('USA');
  ok(d && !d.canWar && /No army on this map/.test(d.whyNotWar), 'the panel refuses war with its own reason');
  ok(d && !d.canAlly && /beyond the map/.test(d.whyNotAlly), 'and refuses alliance with its own reason');
  ok(d && d.offmap === true, 'the panel data says why: the court is off-map');
  ok(d && d.canImprove, 'while envoys still work — the civil verbs stay open');
}

console.log('== a real court, from the ledger ==');
{
  const { game, ctx, actions } = boot('1948ce', 'ISR');
  ok(!!courtSeats(ctx, 'USA'), 'Washington convenes despite the two-province floor');
  const info = getCourtInfo(ctx, 'USA');
  ok(info && Array.isArray(info.seats) && info.seats.length >= 2, 'its parties are readable like any court\'s');
  monthlyCourts(ctx);
  ok(game.tags.USA.court && typeof game.tags.USA.court.f === 'object', 'and the monthly pass runs it without land');
  const row = actions.getLedger().find((r) => r.tag === 'USA');
  ok(!!row, 'the ledger lists the seat — the chip in this row is the door to the court');
  ok(row.provs === 0 && row.dev === (DEFINES.TAGS.USA.offmap.dev | 0), 'provs 0, dev from the def\'s own number');
  const bd = incomeBreakdown(ctx, 'USA');
  ok(Math.abs(bd.offmapIn - DEFINES.TAGS.USA.offmap.income) < 0.01, 'incomeBreakdown carries the stipend');
  ok(Math.abs(row.income - Math.round(bd.net * 10) / 10) < 0.01, 'and the ledger prints the same money');
  refreshStanding(ctx, true);
  const order = game.standing.order;
  ok(order.indexOf('USA') >= 0 && order.indexOf('USA') < 8, 'the seat sits at the top table of the age (§165)');
}

console.log('== the migration: a pre-§180 save ==');
{
  const { game } = boot('1948ce', 'ISR');
  const saved = JSON.parse(JSON.stringify(game));
  delete saved.tags.USA; // the save predates the seat
  delete saved.armsDeals;
  saved.powers = { USA: { s: { ISR: 60 } } }; // the retired book
  saved.tags.ISR.modifiers.push({ id: 'power_pact_USA', name: 'American Alignment', months: -1, effects: { incomeMult: 1.05 } });
  const revived = reviveGame(saved);
  ok(revived && revived.powers === undefined, 'the powers book is dropped on revive');
  ok(!revived.tags.ISR.modifiers.some((m) => m && String(m.id).startsWith('power_')),
    'the orphaned pact modifier is stripped — no permanent bonus without an owner');
  ok(revived.armsDeals && typeof revived.armsDeals === 'object', 'the arms book defaults in (§181)');
  const ERA = ERAS.find((e) => e.bookmark.id === '1948ce');
  const ctx2 = makeCtx({ game: revived, DEFINES, MAP_DATA, geom, bus, bookmark: ERA.bookmark, events: ERA.events });
  ok(!!ctx2.game.tags.USA && ctx2.game.tags.USA.alive, 'makeCtx seats the missing USA on bind');
  ok(!!ctx2.game.tags.USA.tech, '…with a tech block, so every downstream read works');
}

console.log('== the old machinery is really gone; the old chapters seat nothing ==');
{
  let vanished = false;
  try { await import(R + '/js/sim/powers.js'); } catch (e) { vanished = true; }
  ok(vanished, 'js/sim/powers.js no longer exists');
  const { game, actions } = boot('167bce', 'HAS');
  const offmap = Object.keys(game.tags).filter((t) => DEFINES.TAGS[t] && DEFINES.TAGS[t].offmap);
  ok(offmap.length === 0, '167 BCE seats no off-map court');
  ok(typeof actions.getPowers !== 'function', 'and the getPowers action is gone from the contract');
}

console.log(failures ? `smoke115: ${failures} FAILURES` : 'smoke115: ALL PASS');
process.exit(failures ? 1 : 0);
