// Headless regression — SPEC §55, retired by SPEC §180.
//
// This suite pinned "The Powers Beyond the Map": standing bars, courting
// with the Cold War seesaw, ask gates, monthly drift, and the pre-powers
// save backfill. §180 retired the whole system — the one power the frame
// genuinely could not reach (the United States) is a seated off-map COURT
// now, and every other row of the old panel was a shadow copy of a tag the
// board already held. The §180 seat contract lives in smoke115; the §181
// arms-market contract (the reason the powers existed) lives in smoke113.
//
// What remains here is the tombstone's own duty: assert the old machinery
// is really gone, so a stray revival cannot ship half a system back.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

console.log('== §55 is retired (§180) ==');
{
  let simGone = false;
  try { await import(R + '/js/sim/powers.js'); } catch (e) { simGone = true; }
  ok(simGone, 'js/sim/powers.js is gone');
  let dataGone = false;
  try { await import(R + '/js/data/powers.js'); } catch (e) { dataGone = true; }
  ok(dataGone, 'js/data/powers.js is gone');
  const initSrc = (await import('fs')).readFileSync(R + '/js/sim/init.js', 'utf8');
  ok(initSrc.indexOf('getPowers(') < 0 && initSrc.indexOf('courtPower(') < 0,
    'the six power actions are gone from the contract');
  ok(initSrc.indexOf("saved.powers = {}") < 0, 'and the §55 save backfill went with them');
}

console.log(failures ? `smoke34: ${failures} FAILURES` : 'smoke34: ALL PASS');
process.exit(failures ? 1 : 0);
