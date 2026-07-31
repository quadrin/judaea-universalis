// Headless regression — SPEC §57, retired by SPEC §178/§179.
//
// This suite pinned the powers' deeper relationships: pacts with bloc
// exclusivity, trade agreements, monthly funding through the ledger
// (`powerIn`), lapse-on-neglect, and the matériel purchases. §178 retired
// the system and §179 rebuilt the load-bearing parts on real tags: the
// weapons transfer agreement IS the pact-with-an-arsenal (smoke113 holds
// its exclusivity, its funding direction — the fee lands in the supplier's
// treasury — its drift anchor and its lapse rules), and §57's "no
// auto-truce" fix was never powers code at all and stands untested here
// because the war machinery's own suites hold it.
//
// The tombstone's duty: the old ledger row and flows must stay gone.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

console.log('== §57 is retired (§178/§179) ==');
{
  const eco = readFileSync(R + '/js/sim/economy.js', 'utf8');
  ok(eco.indexOf('powerFlows') < 0, 'powerFlows no longer feeds the treasury');
  ok(eco.indexOf('powerIn') < 0, 'the powerIn line is gone from the breakdown');
  ok(eco.indexOf("The powers: aid & trade") < 0, 'and the ledger row went with it');
  ok(eco.indexOf('offmapIn') >= 0, 'the off-map stipend (§178) took the seam over');
  const tick = readFileSync(R + '/js/sim/tick.js', 'utf8');
  ok(tick.indexOf('monthlyPowers') < 0 && tick.indexOf('monthlyArms') >= 0,
    'the tick runs the arms market where the powers drift ran');
}

console.log(failures ? `smoke36: ${failures} FAILURES` : 'smoke36: ALL PASS');
process.exit(failures ? 1 : 0);
