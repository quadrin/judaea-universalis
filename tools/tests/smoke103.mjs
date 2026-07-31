// Headless regression — SPEC §154: air power as a quantity.
//
// `airCoverFor` returned a BOOLEAN and that was the whole of air power. It was
// worth +1 to the die in the fire phase only, and it cancelled outright the
// moment one enemy wing stood anywhere in the ring. One wing was +1. Twenty
// wings were +1. An entire air force was worth less than one doctrine level —
// which gives +1 in every phase — and cost 40 talents each plus fuel.
//
// What this suite holds:
//   - wings are COUNTED, and the count is signed: one side's pips are the
//     other side's absence of them.
//   - the pips land in EVERY phase, not just fire.
//   - fighters contest and strike wings work, and an enemy with fighters and
//     no bombers can ground yours without gaining anything.
//   - a wing with no `kind` is a strike wing, so no existing save is silently
//     re-armed or disarmed.
//   - the three non-combat jobs are real and threshold-gated: interdiction in
//     `hopDays`, sieges in the siege tick, monthly attrition without a battle.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');

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
const ERA = ERAS.find((e) => e.bookmark.id === '1948ce');

function boot() {
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: ERA.bookmark, events: ERA.events,
    playerTag: 'ISR', rngSeed: 3,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: ERA.bookmark, events: ERA.events,
  });
  game.airwings = {};
  game.nextWingId = 1;
  return { game, ctx };
}
// Put `n` wings of `kind` for `tag` on a province id, bypassing airfields —
// this suite is about what wings DO, not how they are bought.
function put(game, tag, provId, kind, n) {
  for (let i = 0; i < n; i++) {
    const id = game.nextWingId++;
    game.airwings[id] = { id, tag, prov: provId, kind, name: tag + ' ' + kind + ' ' + id };
  }
}
const ISR_HOME = 1;

// ---------------------------------------------------------------------------
console.log('== the count is a count, and it is signed ==');
{
  const { game, ctx } = boot();
  ok(mil.airNet(ctx, ISR_HOME, ['ISR'], ['EGY']) === 0, 'an empty sky is zero');
  put(game, 'ISR', ISR_HOME, 'strike', 1);
  ok(mil.airNet(ctx, ISR_HOME, ['ISR'], ['EGY']) === 1, 'one strike wing is one');
  put(game, 'ISR', ISR_HOME, 'strike', 5);
  ok(mil.airNet(ctx, ISR_HOME, ['ISR'], ['EGY']) === 6, 'six are six — the old flag saturated at one');
  ok(mil.airNet(ctx, ISR_HOME, ['EGY'], ['ISR']) === -6, 'and the same sky is −6 from the other chair');
}

// ---------------------------------------------------------------------------
console.log('== pips scale, cap, and land in every phase ==');
{
  const { ctx } = boot();
  ok(mil.airPips(ctx, 0) === 0 && mil.airPips(ctx, -3) === 0, 'no pips without the sky');
  ok(mil.airPips(ctx, 1) === 1, 'the first net wing is the pip cover always was');
  ok(mil.airPips(ctx, 2) === 1 && mil.airPips(ctx, 3) === 2, 'then one per two beyond it');
  ok(mil.airPips(ctx, 100) === DEFINES.AIR.dieCap, 'and it caps at ' + DEFINES.AIR.dieCap);
  const src = readFileSync(R + '/js/sim/military.js', 'utf8');
  ok(!/phase === 'fire' && air/.test(src), 'the fire-phase-only restriction is gone from the roll');
  // §179 later added the armor term to the same sum — the claim held here is
  // that airA rides the roll unconditionally, whatever else joins it.
  ok(/const docA = doctrinePips\(A\.gen, phase, false\) \+ airA \+ armA;/.test(src),
    'and the pips are added in whatever phase is being resolved');
}

// ---------------------------------------------------------------------------
console.log('== fighters contest, strike wings work ==');
{
  const { game, ctx } = boot();
  put(game, 'ISR', ISR_HOME, 'strike', 4);
  ok(mil.airNet(ctx, ISR_HOME, ['ISR'], ['EGY']) === 4, 'four bombers in an uncontested sky are four');

  // An enemy with fighters and NO bombers denies the bonus without gaining one.
  put(game, 'EGY', ISR_HOME, 'fighter', 1);
  ok(mil.airNet(ctx, ISR_HOME, ['ISR'], ['EGY']) === 0,
    'one enemy fighter grounds all four and gains nothing (net 0)');
  ok(mil.airNet(ctx, ISR_HOME, ['EGY'], ['ISR']) === 0, '  and it is zero from their chair too');

  // Buying a fighter back retakes the sky and the bombers fly again.
  put(game, 'ISR', ISR_HOME, 'fighter', 2);
  ok(mil.airNet(ctx, ISR_HOME, ['ISR'], ['EGY']) === 4, 'two fighters retake the sky for the four bombers');

  // Equal fighters: contested, and both sides' bombers fly.
  const b = boot();
  put(b.game, 'ISR', ISR_HOME, 'fighter', 2);
  put(b.game, 'ISR', ISR_HOME, 'strike', 3);
  put(b.game, 'EGY', ISR_HOME, 'fighter', 2);
  put(b.game, 'EGY', ISR_HOME, 'strike', 1);
  ok(mil.airNet(b.ctx, ISR_HOME, ['ISR'], ['EGY']) === 2,
    'evenly contested air lets both sides fly, and the difference is the net (3−1)');
}

// ---------------------------------------------------------------------------
console.log('== a wing with no kind is a strike wing ==');
{
  const { game, ctx } = boot();
  const id = game.nextWingId++;
  game.airwings[id] = { id, tag: 'ISR', prov: ISR_HOME, name: 'pre-§154 squadron' };
  const c = mil.airWingsInRange(ctx, ISR_HOME, ['ISR']);
  ok(c.strike === 1 && c.fighters === 0, 'an old save\'s wing reads as strike, not fighter');
  ok(mil.airNet(ctx, ISR_HOME, ['ISR'], ['EGY']) === 1, '  and it still owns an empty sky');
}

// ---------------------------------------------------------------------------
console.log('== the boolean survives for the question it answers ==');
{
  const { game, ctx } = boot();
  ok(mil.airCoverFor(ctx, ISR_HOME, ['ISR']) === false, 'no wings, no cover');
  put(game, 'ISR', ISR_HOME, 'fighter', 1);
  ok(mil.airCoverFor(ctx, ISR_HOME, ['ISR']) === true, 'a wing of any kind is cover');
}

// ---------------------------------------------------------------------------
console.log('== interdiction slows hostile columns ==');
{
  const { game, ctx } = boot();
  // Find a real adjacent pair so hopDays has geometry to read.
  let from = 0; let to = 0;
  for (let i = 1; i < game.provinces.length && !from; i++) {
    const nb = geom.neighbors[i];
    if (nb && nb.size) { from = i; to = [...nb][0]; }
  }
  // Interdiction is scoped to ground the mover does not hold — a column going
  // somewhere, not a standing weather condition. So the destination has to be
  // in someone else's hands for it to bite.
  const dest = ctx.byId(to);
  dest.owner = 'ISR'; dest.controller = 'ISR';
  const army = { tag: 'EGY', gen: 5, prov: from };
  const base = mil.hopDays(ctx, from, to, army);
  put(game, 'ISR', to, 'strike', 2);
  const soft = mil.hopDays(ctx, from, to, army);
  put(game, 'ISR', to, 'strike', 2);
  const hard = mil.hopDays(ctx, from, to, army);
  ok(soft > base, 'two net wings over a hostile destination cost the column time ('
    + base + ' → ' + soft + ' days)');
  ok(hard > soft, 'and four cost it more (' + hard + ' days)');

  // …and the scope itself, which is the half that keeps this from rewriting
  // fifty years of a chapter: an army moving inside its own country is not
  // interdicted, however much hostile air is in the ring.
  const b = boot();
  const d2 = b.ctx.byId(to);
  d2.owner = 'EGY'; d2.controller = 'EGY';
  const own = { tag: 'EGY', gen: 5, prov: from };
  const clear = mil.hopDays(b.ctx, from, to, own);
  put(b.game, 'ISR', to, 'strike', 6);
  ok(mil.hopDays(b.ctx, from, to, own) === clear,
    'a march into our own territory is not slowed (' + clear + ' days, six hostile wings overhead)');
}

// ---------------------------------------------------------------------------
console.log('== the sky over a siege, and hosts that bleed unfought ==');
{
  const src = readFileSync(R + '/js/sim/military.js', 'utf8');
  ok(/airSiege \* resolveTagMult\(ctx, s\.by, 'siegeMult'\)/.test(src),
    'the siege rate really multiplies by the air term');
  ok(/const airSiege = airNetHere >= siegeAt \? 2 : \(airNetHere <= -siegeAt \? 0\.25 : 1\)/.test(src),
    '  doubling for the side that owns the sky and stalling the side that lost it');
  ok(/if \(airAgainst >= attrAt\) attr \+= Math\.min\(3, 1 \+ \(airAgainst - attrAt\)\)/.test(src),
    'and hostile air adds monthly attrition with no battle at all');
  ok(/if \(isHostile\(ctx, a\.tag, p\.controller\) \|\| !sameSide\(ctx, a\.tag, p\.controller\)\) \{/.test(src),
    '  but only to a host in the field, never to a garrison at home');
  // The thresholds are configuration, not magic numbers in the sim.
  for (const k of ['diePerWings', 'dieCap', 'interdictAt', 'interdictHardAt', 'siegeAt', 'attritionAt']) {
    ok(Number.isFinite(DEFINES.AIR[k]), 'AIR.' + k + ' is tunable (' + DEFINES.AIR[k] + ')');
  }
}

// ---------------------------------------------------------------------------
console.log('== an air force costs what an air force is now worth ==');
{
  ok(DEFINES.AIR.wingCost >= 80 && DEFINES.AIR.wingCost <= 100,
    'a wing costs ' + DEFINES.AIR.wingCost + ' talents, not 40');
  const regCost = DEFINES.BASE.regCost;
  ok(DEFINES.AIR.wingCost > regCost.cav * 3,
    '  which is more than three cavalry regiments — the thing you build instead of an army');
}

// ---------------------------------------------------------------------------
console.log('== raising a wing picks an arm, and the AI wins the air first ==');
{
  const { game, ctx } = boot();
  const p = game.provinces.find((x) => x && x.owner === 'ISR' && !x.impassable);
  if (!Array.isArray(p.buildings)) p.buildings = [];
  if (p.buildings.indexOf('airfield') < 0) p.buildings.push('airfield');
  game.tags.ISR.treasury = 5000;
  // §179: wings are imports and Israel opens with the market shut. This
  // suite is about which ARM an order picks, not how it is bought
  // (smoke113), so sign the scripted pipeline first.
  ctx.helpers.setArmsDeal(ctx, 'ISR', 'CZE');
  const r1 = mil.raiseAirWing(ctx, 'ISR', p.id, 'fighter');
  ok(r1.ok && r1.queued.kind === 'fighter', 'a fighter can be ordered');
  const r2 = mil.raiseAirWing(ctx, 'ISR', p.id, 'strike');
  ok(r2.ok && r2.queued.kind === undefined, 'and a strike wing, which carries no kind on the order');
  const aiSrc = readFileSync(R + '/js/sim/ai.js', 'utf8');
  ok(/if \(!myFighters\) return 'fighter';/.test(aiSrc),
    'the AI never flies without at least one fighter');
  ok(/return myFighters < enemyFighters \? 'fighter' : 'strike';/.test(aiSrc),
    '  and matches the enemy\'s fighters before buying bombers, rather than out-buying them');
}

// ---------------------------------------------------------------------------
console.log('== the AI can reach the thresholds §154 built ==');
{
  // The defect this closes: §154 shipped effects gated at 3 and 4 net wings
  // while ai.js capped every court at TWO wings nationally, capital only. With
  // a fighter apiece every AI ring tied 1-1, both sides' bombers flew, and net
  // came out zero — air scaled beautifully for a human and was inert between
  // AI courts, which is also why the balance harness looked so clean.
  const aiSrc = readFileSync(R + '/js/sim/ai.js', 'utf8');
  ok(!/airWingsOf\(ctx, tag\)\.length \+ queuedUnitsOf\(ctx, tag, \['wing'\]\) < 2/.test(aiSrc),
    'the flat two-wing national cap is gone');
  ok(/function airTarget\(ctx, tag\)/.test(aiSrc) && /Math\.floor\(inc \/ 12\)/.test(aiSrc),
    'and what a court wants scales with what it can pay for');
  ok(Number.isFinite(DEFINES.AIR.aiWingCap) && DEFINES.AIR.aiWingCap >= DEFINES.AIR.siegeAt + 1,
    'the ceiling (' + DEFINES.AIR.aiWingCap + ') is above the siege threshold ('
    + DEFINES.AIR.siegeAt + '), so an AI can actually cross it');
  ok(/function nextAirfieldSite\(ctx, tag\)/.test(aiSrc),
    'and a court whose hangars are full lays another runway rather than stopping');
  // Wings die with their field, so one airfield is one siege from no air force.
  ok(/if \(hasAirfield\(p\) \|\| p\.construction \|\| p\.siege\) continue;/.test(aiSrc),
    '  skipping fields it already has, is building, or is losing');
}

console.log(failures ? `smoke103: ${failures} FAIL` : 'smoke103: ALL PASS');
process.exit(failures ? 1 : 0);
