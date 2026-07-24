// Headless regression — SPEC §86: declared rivalries and reconciliation.
//
// §67 made a grudge permanent for as long as the taker held the land. That is
// true of a wound and false of a memory: courts that were friends before the
// quarrel do come back together, and what decides it is not the map but
// whether either of them keeps choosing the other for an enemy. This suite
// holds that contract — the wound matures only in quiet, a named rivalry
// freezes it, a fresh seizure reopens it, historical friends close nearly all
// the way (and may ally again while still holding the land), strangers only
// half, a lapsed doctrine condition lapses the friendship with it, and the
// whole thing survives a save.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { initGame, makeCtx, reviveGame, gameActions, simHelpers: helpers } =
  await import(R + '/js/sim/init.js');
const {
  changeOwnerCore, recordGrudge, liveGrudge, grudgeCeiling, grudgeCeilingRaw,
  addOpinion, opinionOf, areRivals, declaredRival, declareRivalCore, renounceRivalCore,
  rivalDeclareInfo, haveAffinity, thawQuiet, thawProgress, reconciled, claimCostFor,
  CLAIM_FABRICATION,
} = await import(R + '/js/sim/military.js');
const { monthlyOpinionDrift } = await import(R + '/js/sim/unrest.js');

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

function fresh(playerTag = 'JUD') {
  const g = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_614, events: [],
    playerTag, rngSeed: 11,
  });
  const ctx = makeCtx({
    game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_614, events: [],
  });
  return { g, ctx };
}
// The 614 case the whole feature exists for: the Return takes Jerusalem back
// from Persia. The bookmark starts the two allied — Persia armed the Return —
// so the quarrel begins by ending that, exactly as 617 did. Returns the
// province ids seized.
function seizeFromPersia(ctx, g, count = 1) {
  g.tags.JUD.allies = (g.tags.JUD.allies || []).filter((k) => k !== 'SAS');
  g.tags.SAS.allies = (g.tags.SAS.allies || []).filter((k) => k !== 'JUD');
  const taken = [];
  for (let i = 1; i < g.provinces.length && taken.length < count; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== 'SAS') continue;
    changeOwnerCore(ctx, p, 'JUD');
    recordGrudge(ctx, 'SAS', 'JUD', i);
    taken.push(i);
  }
  return taken;
}
const months = (ctx, n) => { for (let i = 0; i < n; i++) monthlyOpinionDrift(ctx); };
const BAL = DEFINES.BALANCE;

console.log('== the bookmark names its historical friends ==');
{
  const { ctx } = fresh();
  ok(Array.isArray(BOOKMARK_614.affinities) && BOOKMARK_614.affinities.length > 0,
    '614 declares affinities');
  // The pair is gated on the realm still facing east.
  ok(!haveAffinity(ctx, 'SAS', 'JUD'),
    'an undecided realm has no claim on the old Persian friendship');
  helpers.doctrine(ctx, 'alignment', -4);
  ok(haveAffinity(ctx, 'SAS', 'JUD'), 'a realm that faces east keeps it');
  ok(haveAffinity(ctx, 'JUD', 'SAS'), 'the affinity reads the same both ways');
  helpers.doctrine(ctx, 'alignment', 8);
  ok(!haveAffinity(ctx, 'SAS', 'JUD'),
    'swing west and Persia is just an empire that lost a city');
  ok(haveAffinity(ctx, 'BYZ', 'GHA'), 'an ungated pair needs no doctrine at all');
}

console.log('== the wound opens exactly as §67 left it ==');
{
  const { g, ctx } = fresh();
  const taken = seizeFromPersia(ctx, g, 1);
  ok(taken.length === 1, 'Persia lost a province to the Return');
  ok(!!liveGrudge(ctx, 'SAS', 'JUD'), 'the grudge is recorded');
  ok(grudgeCeilingRaw(ctx, 'SAS', 'JUD') === -BAL.grudgeCeilingBase,
    'the raw ceiling is the old -' + BAL.grudgeCeilingBase);
  ok(grudgeCeiling(ctx, 'SAS', 'JUD') === -BAL.grudgeCeilingBase,
    'and on day one the live ceiling matches it — nothing has healed yet');
  ok(opinionOf(ctx, 'SAS', 'JUD') <= -BAL.grudgeCeilingBase, 'their regard drops to the floor');
}

console.log('== quiet years close a friend\'s wound, and an alliance follows ==');
{
  const { g, ctx } = fresh();
  helpers.doctrine(ctx, 'alignment', -4); // the Return keeps facing east
  seizeFromPersia(ctx, g, 1);
  ok(thawQuiet(ctx, 'SAS', 'JUD'), 'no war, no rivalry: the wound is closing');
  months(ctx, 60);
  const half = thawProgress(ctx, 'SAS', 'JUD');
  ok(half > 0.4 && half < 0.5, 'five years in, roughly half matured (' + half.toFixed(2) + ')');
  ok(grudgeCeiling(ctx, 'SAS', 'JUD') > grudgeCeilingRaw(ctx, 'SAS', 'JUD'),
    'the ceiling has risen off the floor');
  ok(opinionOf(ctx, 'SAS', 'JUD') > -BAL.grudgeCeilingBase,
    'and their actual regard warmed into the room the years made');
  months(ctx, 80);
  ok(thawProgress(ctx, 'SAS', 'JUD') >= BAL.thawReachAffinity - 0.001,
    'past ten years it reaches the friends\' full reach');
  ok(grudgeCeiling(ctx, 'SAS', 'JUD') >= -15,
    'the ceiling has come back to within 15 of neutral (' + grudgeCeiling(ctx, 'SAS', 'JUD') + ')');
  ok(!!liveGrudge(ctx, 'SAS', 'JUD'), 'and Persia STILL does not have the land back');
  ok(reconciled(ctx, 'SAS', 'JUD'), 'the pair count as reconciled');
  // §67 refused an alliance outright while a grudge lived; §86 lets a mended
  // friendship sign without giving the land back.
  const actions = gameActions(ctx);
  addOpinion(ctx, 'SAS', 'JUD', 100);
  const dip = actions.getDiplomacy('SAS');
  ok(dip && dip.reconcile && dip.reconcile.done, 'the diplomacy view reports it mended');
  ok(dip.whyNotAlly !== 'No alliance while we hold ' + dip.grudge.names,
    'the flat §67 refusal is gone');
  ok(dip.canAlly, 'an alliance is on the table again');
}

console.log('== strangers only half-close ==');
{
  const { g, ctx } = fresh();
  helpers.doctrine(ctx, 'alignment', 8); // faces west: no Persian friendship
  seizeFromPersia(ctx, g, 1);
  months(ctx, 200);
  const p = thawProgress(ctx, 'SAS', 'JUD');
  ok(Math.abs(p - BAL.thawReachPlain) < 0.001,
    'the wound stops halfway (' + p.toFixed(2) + ')');
  ok(grudgeCeiling(ctx, 'SAS', 'JUD') === Math.round(-BAL.grudgeCeilingBase * 0.5),
    'the ceiling settles at half the original');
  ok(!reconciled(ctx, 'SAS', 'JUD'), 'strangers never count as reconciled');
  const dip = gameActions(ctx).getDiplomacy('SAS');
  ok(!dip.canAlly && /lost lands are remembered/.test(dip.whyNotAlly),
    'and they will still not ally with us');
}

console.log('== naming a rival freezes the wound where it stands ==');
{
  const { g, ctx } = fresh();
  helpers.doctrine(ctx, 'alignment', -4);
  seizeFromPersia(ctx, g, 1);
  months(ctx, 36);
  const before = thawProgress(ctx, 'SAS', 'JUD');
  ok(before > 0, 'three quiet years bought some healing');
  g.tags.JUD.points.infl = 500;
  const res = declareRivalCore(ctx, 'JUD', 'SAS');
  ok(res.ok, 'the Return names Persia its rival');
  ok(declaredRival(ctx, 'JUD', 'SAS'), 'the declaration is recorded');
  ok(areRivals(ctx, 'JUD', 'SAS') && areRivals(ctx, 'SAS', 'JUD'),
    'a declared rivalry reads as a rivalry from both sides');
  ok(!thawQuiet(ctx, 'SAS', 'JUD'), 'the quiet is over');
  ok(opinionOf(ctx, 'SAS', 'JUD') <= BAL.rivalOpinion,
    'their regard is slammed to the cold baseline');
  months(ctx, 60);
  ok(Math.abs(thawProgress(ctx, 'SAS', 'JUD') - before) < 0.001,
    'five more years buy nothing — the clock is held, not reset');
  // ...and unsaying it starts the clock again from where it stopped.
  const back = renounceRivalCore(ctx, 'JUD', 'SAS');
  ok(back.ok, 'the quarrel can be set aside');
  ok(!declaredRival(ctx, 'JUD', 'SAS'), 'the declaration is withdrawn');
  ok(thawQuiet(ctx, 'SAS', 'JUD'), 'and the wound begins closing again');
  months(ctx, 12);
  ok(thawProgress(ctx, 'SAS', 'JUD') > before, 'from where it stopped, not from zero');
}

console.log('== a fresh seizure reopens what the years closed ==');
{
  const { g, ctx } = fresh();
  helpers.doctrine(ctx, 'alignment', -4);
  seizeFromPersia(ctx, g, 1);
  months(ctx, 90);
  ok(thawProgress(ctx, 'SAS', 'JUD') > 0.5, 'most of the way mended');
  const more = seizeFromPersia(ctx, g, 1);
  ok(more.length === 1, 'the Return takes another Persian province');
  ok(thawProgress(ctx, 'SAS', 'JUD') === 0, 'the clock is back at zero');
  ok(grudgeCeiling(ctx, 'SAS', 'JUD') === grudgeCeilingRaw(ctx, 'SAS', 'JUD'),
    'and the ceiling is the full raw wound again');
}

console.log('== war holds the wound open ==');
{
  const { g, ctx } = fresh();
  helpers.doctrine(ctx, 'alignment', -4);
  seizeFromPersia(ctx, g, 1);
  g.tags.JUD.atWarWith = ['SAS'];
  g.tags.SAS.atWarWith = ['JUD'];
  ok(!thawQuiet(ctx, 'SAS', 'JUD'), 'courts at war are not quiet');
  months(ctx, 40);
  ok(thawProgress(ctx, 'SAS', 'JUD') === 0, 'forty months of war heal nothing');
  g.tags.JUD.atWarWith = [];
  g.tags.SAS.atWarWith = [];
  months(ctx, 12);
  ok(thawProgress(ctx, 'SAS', 'JUD') > 0, 'peace restarts the clock');
}

console.log('== a martial realm is trusted back more slowly ==');
{
  const a = fresh(); const b = fresh();
  for (const s of [a, b]) { helpers.doctrine(s.ctx, 'alignment', -4); seizeFromPersia(s.ctx, s.g, 1); }
  helpers.doctrine(b.ctx, 'conquest', 10); // a realm that lives by the sword
  months(a.ctx, 48); months(b.ctx, 48);
  ok(thawProgress(b.ctx, 'SAS', 'JUD') < thawProgress(a.ctx, 'SAS', 'JUD'),
    'the same quiet buys the sword-realm less');
}

console.log('== what a named rivalry is worth, and what it costs ==');
{
  const { g, ctx } = fresh();
  g.tags.JUD.allies = [];
  g.tags.SAS.allies = (g.tags.SAS.allies || []).filter((k) => k !== 'JUD');
  g.tags.JUD.points.infl = 500;
  const info = rivalDeclareInfo(ctx, 'JUD', 'SAS');
  ok(info && info.can && info.max === BAL.rivalMax, 'a rival may be named, up to ' + BAL.rivalMax);
  ok(claimCostFor(ctx, 'JUD', 'SAS') === CLAIM_FABRICATION.cost, 'claims cost full price first');
  declareRivalCore(ctx, 'JUD', 'SAS');
  ok(claimCostFor(ctx, 'JUD', 'SAS') === Math.round(CLAIM_FABRICATION.cost * BAL.rivalClaimMult),
    'against a named enemy the forgers work at half price');
  declareRivalCore(ctx, 'JUD', 'BYZ');
  const full = rivalDeclareInfo(ctx, 'JUD', 'GHA');
  ok(!full.can && /named enemies/.test(full.why), 'the realm cannot name a third');
  // The era's own weather is not the player's to declare.
  const era = rivalDeclareInfo(ctx, 'RSH', 'BYZ');
  ok(era && era.eraRival, 'a standing bookmark rivalry is marked as the age\'s, not ours');
}

console.log('== a save carries the rivalries and the healing ==');
{
  const { g, ctx } = fresh();
  helpers.doctrine(ctx, 'alignment', -4);
  seizeFromPersia(ctx, g, 1);
  months(ctx, 40);
  g.tags.JUD.points.infl = 500;
  declareRivalCore(ctx, 'JUD', 'BYZ');
  const thawBefore = thawProgress(ctx, 'SAS', 'JUD');
  const loaded = reviveGame(JSON.parse(JSON.stringify(g)));
  const ctx2 = makeCtx({
    game: loaded, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_614, events: [],
  });
  ok(declaredRival(ctx2, 'JUD', 'BYZ'), 'the named rival survives the round-trip');
  ok(Math.abs(thawProgress(ctx2, 'SAS', 'JUD') - thawBefore) < 0.001,
    'so does the maturity of the wound');
}

console.log('== an older save with no rival book is simply a realm with no enemies ==');
{
  const { g, ctx } = fresh();
  seizeFromPersia(ctx, g, 1);
  const old = JSON.parse(JSON.stringify(g));
  delete old.rivals;
  delete old.tags.SAS.grudges.JUD.thaw;
  const revived = reviveGame(old);
  const ctxOld = makeCtx({
    game: revived, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_614, events: [],
  });
  ok(!declaredRival(ctxOld, 'JUD', 'SAS'), 'no rivals declared');
  ok(thawProgress(ctxOld, 'SAS', 'JUD') === 0, 'an unstamped grudge starts its clock at zero');
  ok(grudgeCeiling(ctxOld, 'SAS', 'JUD') === grudgeCeilingRaw(ctxOld, 'SAS', 'JUD'),
    'and behaves exactly as §67 left it until the quiet months accrue');
  monthlyOpinionDrift(ctxOld);
  ok(thawProgress(ctxOld, 'SAS', 'JUD') > 0, 'then it starts healing like any other');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
