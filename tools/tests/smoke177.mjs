// Headless smoke test §259: a mission's land is land HELD, not land stood in.
// Every mission chain in the game asks its land question through
// `helpers.controls` / `helpers.countControlled`, and those answer "whose flag
// flies there this month" — so a column marched into Caesarea in the second
// year of the war lit the medallion, banked the reward, and the white peace
// three months later took the city back with nothing to give back. Missions
// now read the same board through POSSESSION (owned AND controlled, §80's own
// rule for a crown), and nothing else in the game changes: a siege, a supply
// lane and an event card still ask where the armies are.
//
// This suite pins all of it: the two helpers, the view the checks run under,
// the player's ready list, the claim, the AI's calendar, the panel's word for
// why a medallion the map looks ready for is dark, and §80's own family of
// formables, whose "Hold Jerusalem" rows were asking `controls`.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { FORMABLES } = await import(R + '/js/data/formables.js');
const { initGame, makeCtx, gameActions, simHelpers } = await import(R + '/js/sim/init.js');
const { missionCtx } = await import(R + '/js/sim/military.js');
const { missionCosts } = await import(R + '/js/sim/mission_cost.js');
const realm = await import(R + '/js/sim/realm.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1),
  bbox: [],
};
function boot(playerTag, seed) {
  const events = EVENTS_66.concat(GENERIC_EVENTS);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events });
  return { game, ctx, actions: gameActions(ctx) };
}
// The occupation this whole section is about: our men in their city.
const occupy = (ctx, name, by) => { const p = ctx.prov(name); p.controller = by; return p; };
// And the peace that follows it.
const annex = (ctx, name, by) => { const p = ctx.prov(name); p.owner = by; p.controller = by; return p; };

console.log('== the two helpers: held, owned, controlled ==');
{
  const { ctx } = boot('JUD', 7);
  const caesarea = ctx.prov('Caesarea Maritima');
  const jerusalem = ctx.prov('Jerusalem');
  ok(caesarea.owner !== 'JUD', 'Caesarea Maritima opens the chapter in Roman hands: ' + caesarea.owner);
  occupy(ctx, 'Caesarea Maritima', 'JUD');
  ok(simHelpers.controls(ctx, 'JUD', 'Caesarea Maritima'),
    'an occupation is still an occupation: `controls` says yes, as a siege and a supply lane need it to');
  ok(!simHelpers.holds(ctx, 'JUD', 'Caesarea Maritima'),
    'but `holds` says no — the treaty has not made the city ours');

  // The mirror case: our own province with somebody else's army in it. It is
  // owned and it is not held — a realm cannot claim a reward for ground it
  // has lost the use of.
  annex(ctx, 'Jerusalem', 'JUD');
  const heldWithCity = simHelpers.countHeld(ctx, 'JUD', {});
  occupy(ctx, 'Jerusalem', 'ROM');
  ok(!simHelpers.holds(ctx, 'JUD', 'Jerusalem') && jerusalem.owner === 'JUD',
    'an enemy standing in our own capital: owned, not held');
  ok(simHelpers.countOwned(ctx, 'JUD', {}) > simHelpers.countHeld(ctx, 'JUD', {}),
    'countOwned counts the occupied province, countHeld does not: '
    + simHelpers.countOwned(ctx, 'JUD', {}) + ' vs ' + simHelpers.countHeld(ctx, 'JUD', {}));
  ok(simHelpers.countHeld(ctx, 'JUD', {}) === heldWithCity - 1,
    'and it is exactly one province of difference');
  ok(simHelpers.countControlled(ctx, 'JUD', {}) > simHelpers.countHeld(ctx, 'JUD', {}),
    'countControlled still counts the city we are only standing in: '
    + simHelpers.countControlled(ctx, 'JUD', {}) + ' vs ' + simHelpers.countHeld(ctx, 'JUD', {}));
}

console.log('== the view a mission check runs under ==');
{
  const { ctx } = boot('JUD', 7);
  occupy(ctx, 'Caesarea Maritima', 'JUD');
  const mctx = missionCtx(ctx);
  ok(mctx.helpers.controls(mctx, 'JUD', 'Caesarea Maritima') === false,
    'inside a mission, `controls` means held — the occupied city does not count');
  ok(ctx.helpers.controls(ctx, 'JUD', 'Caesarea Maritima') === true,
    'and the live ctx is untouched: the rest of the game still asks where the flags are');
  ok(mctx.helpers.countControlled(mctx, 'JUD', {}) === simHelpers.countHeld(ctx, 'JUD', {}),
    'the counting half agrees with countHeld');
  ok(mctx.game === ctx.game && mctx.prov('Jerusalem') === ctx.prov('Jerusalem'),
    'the view is the same world — same game, same provinces');
  ok(typeof mctx.helpers.adjust === 'function' && missionCtx(ctx) === mctx,
    'every other helper is inherited, and the view is made once per ctx');
}

console.log('== the player\'s tree: an occupation lights nothing ==');
{
  const { game, ctx, actions } = boot('JUD', 7);
  const t = game.tags.JUD;
  // 'The Coastal Road' — take Caesarea Maritima — with its one prerequisite
  // already accomplished, so the only question left is the city itself.
  t.missionsDone = ['jm_arm_the_nation'];
  occupy(ctx, 'Caesarea Maritima', 'JUD');
  realm.checkMissions(ctx);
  ok((t.missionReady || []).indexOf('jm_coastal_road') < 0,
    'the medallion is not ready while the city is merely occupied: [' + (t.missionReady || []).join(',') + ']');
  const claim = realm.claimMission(ctx, 'jm_coastal_road');
  ok(claim.ok === false && claim.why === 'unmet',
    'and a hand on it is refused as unmet: ' + JSON.stringify(claim));
  ok((t.missionsDone || []).indexOf('jm_coastal_road') < 0, 'nothing was banked');

  const view = actions.getMissions();
  const node = view.find((m) => m.id === 'jm_coastal_road');
  ok(node && node.status === 'current' && node.occupation === true,
    'the panel says why: workable, and satisfied by the sword alone');
  ok(view.filter((m) => m.occupation).length === 1,
    'and only that one node wears it: ' + view.filter((m) => m.occupation).map((m) => m.id).join(','));

  // The peace. The same board, one owner changed.
  const treasury = t.treasury;
  annex(ctx, 'Caesarea Maritima', 'JUD');
  realm.checkMissions(ctx);
  ok((t.missionReady || []).indexOf('jm_coastal_road') >= 0,
    'the treaty makes the city ours and the medallion lights');
  const after = actions.getMissions().find((m) => m.id === 'jm_coastal_road');
  ok(after && after.status === 'ready' && after.occupation === false,
    'the panel drops the sword-alone line the moment possession answers');
  const paid = realm.claimMission(ctx, 'jm_coastal_road');
  ok(paid.ok === true, 'and the claim goes through: ' + JSON.stringify(paid));
  ok((t.treasury - treasury) === 200, 'the procurator\'s treasury is paid once: +' + (t.treasury - treasury));
}

console.log('== the AI\'s calendar reads the same rule (§102 symmetry) ==');
{
  const { game, ctx } = boot('JUD', 7);
  const t = game.tags.JUD;
  t.ai = true; // an empty chair banks on the calendar instead of waiting for a hand
  t.missionsDone = ['jm_arm_the_nation'];
  occupy(ctx, 'Caesarea Maritima', 'JUD');
  realm.checkMissions(ctx);
  ok((t.missionsDone || []).indexOf('jm_coastal_road') < 0,
    'an AI court banks nothing for an occupation either: [' + (t.missionsDone || []).join(',') + ']');
  annex(ctx, 'Caesarea Maritima', 'JUD');
  realm.checkMissions(ctx);
  ok((t.missionsDone || []).indexOf('jm_coastal_road') >= 0,
    'and banks it the month the city is actually theirs');
}

console.log('== the difficulty ladder still measures the tree ==');
{
  const { ctx } = boot('JUD', 7);
  const list = realm.missionsFor(ctx, 'JUD');
  const costs = missionCosts(ctx, 'JUD', list);
  const road = costs.get('jm_coastal_road');
  ok(Number.isFinite(road) && road > 0 && road <= 1,
    'the ladder still seats "The Coastal Road" at a rung it can measure: ' + road);
  const measured = [...costs.values()].filter((c) => Number.isFinite(c)).length;
  ok(measured >= Math.round(list.length / 3),
    'and the tree as a whole is still measurable: ' + measured + ' of ' + list.length);
}

console.log('== §80\'s own family: a crown is not manufactured by an occupation ==');
{
  const { ctx } = boot('JUD', 7);
  const f = FORMABLES.find((x) => x.id === 'form_has_hyr');
  const row = f.requires.find((r) => r.label === 'Hold Jerusalem');
  const count = f.requires.find((r) => (r.label || '').indexOf('twelve provinces') >= 0);
  // Jerusalem opens the chapter in the revolt's hands, so put it plainly in
  // Rome's deed book first and then march back in: owner theirs, flag ours.
  ctx.prov('Jerusalem').owner = 'ROM';
  occupy(ctx, 'Jerusalem', 'JUD');
  ok(row.check(ctx, 'JUD') === false, 'standing in Jerusalem does not satisfy "Hold Jerusalem"');
  annex(ctx, 'Jerusalem', 'JUD');
  ok(row.check(ctx, 'JUD') === true, 'owning and controlling it does');
  // And the count: twelve provinces means twelve that are ours in law and fact.
  const held = simHelpers.countHeld(ctx, 'JUD', {});
  for (let i = 1; i < ctx.game.provinces.length && simHelpers.countHeld(ctx, 'JUD', {}) < 12; i++) {
    const p = ctx.game.provinces[i];
    if (p && !p.impassable && p.owner !== 'JUD') { p.owner = 'JUD'; p.controller = 'JUD'; }
  }
  ok(count.check(ctx, 'JUD') === true, 'twelve held provinces satisfy the count (from ' + held + ')');
  // Now hand the flags of three of them to Rome without moving a deed: the
  // count must fall, because a province under occupation is not one the realm
  // can raise a crown on.
  let taken = 0;
  for (let i = 1; i < ctx.game.provinces.length && taken < 3; i++) {
    const p = ctx.game.provinces[i];
    if (p && !p.impassable && p.owner === 'JUD' && p.controller === 'JUD') { p.controller = 'ROM'; taken++; }
  }
  ok(count.check(ctx, 'JUD') === false,
    'and three provinces under enemy occupation break it again: ' + simHelpers.countHeld(ctx, 'JUD', {}) + ' held');
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
