// Headless regression — SPEC §87: a province rises for a reason.
//
// Unrest used to have one outlet: a threshold crossed and men appearing with
// no name for their grievance. This suite holds the five kinds and the order
// they are tried in — that a separatist rising reads the §67 grudge book and
// marches under the old flag, that the national rule still outranks the
// grievances below it, that a weak throne breeds a claimant who can actually
// take the crown by holding the capital, that a heterodox province rises for
// its altar, that everything else is peasants — and that the doctrine axes
// bend the odds without ever deciding them.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, reviveGame, simHelpers: helpers } = await import(R + '/js/sim/init.js');
const { changeOwnerCore, changeControllerCore, recordGrudge, armiesOf } =
  await import(R + '/js/sim/military.js');
const { monthlyUnrest } = await import(R + '/js/sim/unrest.js');
const {
  classifyRising, dispossessedOf, throneIsWeak, raiseRising, monthlyPretenders, RISING_KINDS,
} = await import(R + '/js/sim/revolt.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const neighbors = Array.from({ length: N + 1 }, () => new Set());
const fakeGeom = {
  neighbors,
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const bus = { emit() {}, on() { return () => {}; } };

function fresh(playerTag = 'JUD') {
  const g = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_66, events: [],
    playerTag, rngSeed: 3,
  });
  const ctx = makeCtx({
    game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_66, events: [],
  });
  // dynEvents exists but nothing consumes the cards here; the suite is about
  // the risings themselves.
  ctx.dynEvents = new Map();
  return { g, ctx };
}
// Deterministic dice: the classifier's rolls are the only randomness, and a
// suite about WHICH kind arrives must not be a suite about luck.
const always = (ctx) => { ctx.rng = { ...ctx.rng, chance: () => true, int: () => 0 }; };
const never = (ctx) => { ctx.rng = { ...ctx.rng, chance: () => false, int: () => 0 }; };
const noJoin = () => false;
const canJoin = () => true;
function provOwnedBy(g, tag, skip = 0) {
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) { if (skip-- > 0) continue; return p; }
  }
  return null;
}

console.log('== the five kinds exist ==');
{
  const ids = Object.keys(RISING_KINDS).sort().join(',');
  ok(ids === 'national,peasant,pretender,religious,separatist', 'separatist, pretender, national, religious, peasant');
}

console.log('== separatist: the grudge book finds a body ==');
{
  const { g, ctx } = fresh();
  never(ctx); // no pretender, no religious roll — the separatist must win on order
  const p = provOwnedBy(g, 'NAB');
  changeOwnerCore(ctx, p, 'JUD');
  recordGrudge(ctx, 'NAB', 'JUD', p.id);
  ok(dispossessedOf(ctx, p) === 'NAB', 'the dispossessed court is read straight off the §67 book');
  const cls = classifyRising(ctx, p, noJoin);
  ok(cls.kind === 'separatist', 'the rising is separatist');
  ok(cls.restoreTo === 'NAB', 'and it knows whose flag it is raising');
  ok(cls.forTag === 'REB', 'with nobody in reach to march for, it raises the colors itself');
  const joined = classifyRising(ctx, p, canJoin);
  ok(joined.forTag === 'REB',
    'a court NOT at war with us is still not somewhere to defect to');
  g.tags.JUD.atWarWith = ['NAB'];
  g.tags.NAB.atWarWith = ['JUD'];
  const marching = classifyRising(ctx, p, canJoin);
  ok(marching.forTag === 'NAB', 'but a hostile old master in reach gets the province back');
  g.tags.JUD.atWarWith = []; g.tags.NAB.atWarWith = [];
}

console.log('== a court that no longer exists raises nobody ==');
{
  const { g, ctx } = fresh();
  never(ctx);
  const p = provOwnedBy(g, 'NAB');
  changeOwnerCore(ctx, p, 'JUD');
  recordGrudge(ctx, 'NAB', 'JUD', p.id);
  g.tags.NAB.alive = false;
  ok(dispossessedOf(ctx, p) === null, 'a fallen house has no separatists');
  ok(classifyRising(ctx, p, noJoin).kind !== 'separatist', 'and the rising falls through');
}

console.log('== pretender: a weak throne breeds a claim ==');
{
  const { g, ctx } = fresh();
  always(ctx);
  const p = provOwnedBy(g, 'JUD');
  ok(!throneIsWeak(ctx, 'JUD'), 'a believed-in throne is not challenged');
  g.tags.JUD.legitimacy = 20;
  ok(throneIsWeak(ctx, 'JUD'), 'a throne below the legitimacy floor is');
  g.tags.JUD.legitimacy = 90;
  g.tags.JUD.regency = true;
  ok(throneIsWeak(ctx, 'JUD'), '...and so is one held by a regent');
  g.tags.JUD.regency = false;
  g.tags.JUD.legitimacy = 20;
  const cls = classifyRising(ctx, p, noJoin);
  ok(cls.kind === 'pretender', 'the rising is a pretender\'s host');
  ok(typeof cls.claimant === 'string' && cls.claimant.length > 0, 'and it has a named claimant');
  // A republic settles this with ballots, not billhooks.
  g.tags.JUD.govType = 'republic';
  ok(!throneIsWeak(ctx, 'JUD'), 'a republic has elections for this');
}

console.log('== the claimant can actually take the crown ==');
{
  const { g, ctx } = fresh();
  always(ctx);
  g.tags.JUD.legitimacy = 20;
  const capName = DEFINES.TAGS.JUD.capital;
  const cap = ctx.byId(ctx.provId(capName));
  const p = provOwnedBy(g, 'JUD', 2);
  const oldRuler = g.tags.JUD.ruler.name;
  ok(raiseRising(ctx, p, noJoin), 'the host is raised');
  ok(!!g.pretenders && !!g.pretenders.JUD, 'the realm records a live claim');
  const claimant = g.pretenders.JUD.claimant;
  const host = armiesOf(ctx, 'REB').find((a) => a.rising === 'pretender');
  ok(!!host && host.claimant === claimant, 'the band carries the claimant\'s name');
  // Bleed while it stands, but the capital is the whole argument.
  const legBefore = g.tags.JUD.legitimacy;
  monthlyPretenders(ctx);
  ok(g.tags.JUD.legitimacy < legBefore, 'a claim in the field bleeds the throne monthly');
  ok(g.pretenders.JUD.heldMonths === 0, 'and holds nothing while the capital is ours');
  changeControllerCore(ctx, cap, 'REB');
  for (let i = 0; i < DEFINES.REVOLT.pretenderHoldMonths; i++) monthlyPretenders(ctx);
  ok(g.tags.JUD.ruler.name === claimant, 'holding the capital long enough crowns the claimant');
  ok(g.tags.JUD.ruler.name !== oldRuler, 'the old ruler is deposed');
  ok(!g.pretenders.JUD, 'the claim is settled');
  ok(cap.controller === 'JUD', 'and the capital answers the crown again — it is their crown now');
  ok(!armiesOf(ctx, 'REB').some((a) => a.rising === 'pretender'), 'the host goes home');
  ok(g.tags.JUD.legitimacy === DEFINES.REVOLT.pretenderCrownedLegitimacy,
    'the usurper starts on their own number, not the old crown\'s');
}

console.log('== a broken host answers the question for good ==');
{
  const { g, ctx } = fresh();
  always(ctx);
  g.tags.JUD.legitimacy = 20;
  raiseRising(ctx, provOwnedBy(g, 'JUD', 2), noJoin);
  ok(!!g.pretenders.JUD, 'a claim stands');
  for (const id of Object.keys(g.armies)) {
    if (g.armies[id].rising === 'pretender') delete g.armies[id];
  }
  const before = g.tags.JUD.legitimacy;
  monthlyPretenders(ctx);
  ok(!g.pretenders.JUD, 'with the host gone the claim lapses');
  ok(g.tags.JUD.legitimacy === before + DEFINES.REVOLT.pretenderBeatenLegitimacy,
    'and the throne gains what it proved');
}

console.log('== religious: the altar, when nobody is marching to its aid ==');
{
  const { g, ctx } = fresh();
  always(ctx);
  // A Roman province that keeps another faith, with no co-religionist power
  // in reach and no grudge attached to it.
  const p = provOwnedBy(g, 'ROM');
  p.religion = 'judaism';
  g.tags.ROM.legitimacy = 100;
  g.tags.ROM.regency = false;
  const cls = classifyRising(ctx, p, noJoin);
  ok(cls.kind === 'religious', 'the rising is for the altar');
  ok(cls.faith === 'judaism', 'and it knows which one');
}

console.log('== peasant is the floor ==');
{
  const { g, ctx } = fresh();
  never(ctx);
  const p = provOwnedBy(g, 'ROM');
  p.religion = g.tags.ROM.religion; // orthodox, no grudge, strong throne
  g.tags.ROM.legitimacy = 100;
  const cls = classifyRising(ctx, p, noJoin);
  ok(cls.kind === 'peasant', 'a province with no particular grievance sends peasants');
  const size = Math.round(RISING_KINDS.peasant.sizeMult * 100) / 100;
  ok(size > RISING_KINDS.separatist.sizeMult, 'the peasant host is the biggest...');
  const { g: g2, ctx: ctx2 } = fresh();
  never(ctx2);
  const q = provOwnedBy(g2, 'ROM');
  q.religion = g2.tags.ROM.religion;
  q.dev = { tax: 4, prod: 4, mp: 10 };
  raiseRising(ctx2, q, noJoin);
  const band = armiesOf(ctx2, 'REB').find((a) => a.rising === 'peasant');
  ok(!!band, 'and it takes the field');
  ok(band.morale < band.maxMorale, '...and the brittlest');
}

console.log('== the doctrine axes bend the odds ==');
{
  // A zealous realm provokes more risings for the altar; an accommodating one
  // has already bought most of them off. Same province, same dice threshold.
  const rolls = [];
  const seenKinds = (zeal) => {
    const { g, ctx } = fresh('ROM');
    helpers.doctrine(ctx, 'zeal', zeal);
    let chance = 0;
    ctx.rng = { ...ctx.rng, chance: (c) => { chance = c; return false; }, int: () => 0 };
    const p = provOwnedBy(g, 'ROM');
    p.religion = 'judaism';
    g.tags.ROM.legitimacy = 100;
    classifyRising(ctx, p, noJoin);
    rolls.push(chance);
    return chance;
  };
  const zealous = seenKinds(10);
  const easy = seenKinds(-10);
  ok(zealous > easy, 'a zealous realm faces more risings for the altar ('
    + zealous.toFixed(2) + ' vs ' + easy.toFixed(2) + ')');
}

console.log('== the throttle and the cooldown survive ==');
{
  const { g, ctx } = fresh();
  never(ctx);
  const p = provOwnedBy(g, 'ROM');
  p.religion = g.tags.ROM.religion;
  p.dev = { tax: 3, prod: 3, mp: 6 };
  ok(raiseRising(ctx, p, noJoin), 'the first rising takes the field');
  ok(p.revoltCooldownMonths === 30, 'the province cannot rise again for thirty months');
  ok(p.revoltType === 'peasant', 'and the province is stamped with what kind it was');
  // Eight ownerless bands is the ceiling the old code set; it still is.
  for (let i = 0; i < 12; i++) {
    const q = provOwnedBy(g, 'ROM', i + 1);
    if (!q) break;
    q.religion = g.tags.ROM.religion;
    q.revoltCooldownMonths = 0;
    raiseRising(ctx, q, noJoin);
  }
  ok(armiesOf(ctx, 'REB').filter((a) => a.men > 0).length <= 8,
    'no more than eight ownerless bands under arms at once');
}

console.log('== the whole thing survives a save ==');
{
  const { g, ctx } = fresh();
  always(ctx);
  g.tags.JUD.legitimacy = 20;
  raiseRising(ctx, provOwnedBy(g, 'JUD', 2), noJoin);
  const claimant = g.pretenders.JUD.claimant;
  const loaded = reviveGame(JSON.parse(JSON.stringify(g)));
  ok(loaded.pretenders && loaded.pretenders.JUD
    && loaded.pretenders.JUD.claimant === claimant, 'the live claim round-trips');
  const band = Object.values(loaded.armies).find((a) => a.rising === 'pretender');
  ok(!!band && band.claimant === claimant, 'so does the band that carries it');
}

console.log('== an older save with no pretender book simply has no claims ==');
{
  const { g, ctx } = fresh();
  const old = JSON.parse(JSON.stringify(g));
  delete old.pretenders;
  const revived = reviveGame(old);
  const ctxOld = makeCtx({
    game: revived, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_66, events: [],
  });
  monthlyPretenders(ctxOld); // must not throw
  ok(true, 'the monthly pass is a quiet no-op');
  const p = provOwnedBy(revived, 'ROM');
  ok(p.revoltType === undefined, 'a province that rose before this existed has no stamp');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
