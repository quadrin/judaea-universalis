// Headless regression — SPEC §137: two dials, neither of them a block.
//
// §137a. THE UNION AND THE WAR. `incorporateInfo` will only START a union from
// a court at peace, and `aiConsiderWar` hunts exactly that: a stable, unengaged
// neighbour. So the months a weaving needs were also the months it was most
// likely to be attacked in, and an attack voided the union outright — thirty
// months and several hundred influence gone to a war the player did not start.
// War now SUSPENDS the weaving instead: the clock stops, the work is kept, and
// it starts again at peace. The invasion is not prevented and it is not free —
// a client whose devotion cools below the keep line during the fighting still
// breaks the union.
//
// §137b. DEFERENCE. §67 caps what goodwill can buy while the taker sits on the
// land and §86 lets the wound close halfway over ten quiet years, so a small,
// shaky neighbour could hold a permanent −50 against a power six times its
// weight — a court in no position to act on it, refusing to be bought, forever.
// A weight gap now carries the thaw further than the plain reach, all the way
// off when the gap is wide and the little court has troubles at home. Between
// equals it changes nothing, which is every rivalry the chapters are about.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const {
  monthlyIncorporation, incorporateInfo, incorporateCore,
  thawProgress, deference, realmWeight, grudgeCeiling, addOpinion, declareWar,
} = await import(R + '/js/sim/military.js');

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

function boot(eraId, tag) {
  const era = ERAS.find((e) => e.bookmark.id === eraId);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const game = initGame({
    DEFINES, MAP_DATA, geom: flatGeom, bookmark: era.bookmark, events: era.events,
    playerTag: tag, rngSeed: 5, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: flatGeom, bus: { emit() {}, on() { return () => {}; } },
    bookmark: era.bookmark, events: era.events, provinceMap,
  });
  game.wars = [];
  for (const k of Object.keys(game.tags)) game.tags[k].atWarWith = [];
  return { game, ctx };
}

// A lord with a devoted client, at peace, mid-weave.
function weaving() {
  const w = boot('167bce', 'HAS');
  const g = w.game;
  const lord = g.tags.HAS, client = g.tags.NAB;
  lord.alive = true; client.alive = true;
  client.overlord = 'HAS';
  lord.stability = 2;
  lord.points.infl = 999;
  client.opinion = client.opinion || {};
  client.opinion.HAS = 95;
  const info = incorporateInfo(w.ctx, 'HAS', 'NAB');
  const res = incorporateCore(w.ctx, 'HAS', 'NAB');
  return { ...w, lord, client, info, res };
}

// ---------------------------------------------------------------------------
console.log('== §137a: a war holds the union, it does not burn it ==');
{
  const w = weaving();
  ok(w.res.ok && w.res.started, 'the weaving begins (' + w.res.months + ' months, '
    + w.res.cost + ' influence)');
  const started = w.client.incorporating.monthsLeft;
  // Three quiet months.
  for (let i = 0; i < 3; i++) monthlyIncorporation(w.ctx);
  const afterPeace = w.client.incorporating.monthsLeft;
  ok(afterPeace === started - 3, 'three months of peace advance it by three ('
    + started + ' → ' + afterPeace + ')');

  // Somebody invades. Under the old rule this deleted the union and the cost.
  declareWar(w.ctx, 'SEL', 'HAS', 'A War of Opportunity');
  for (let i = 0; i < 6; i++) monthlyIncorporation(w.ctx);
  ok(!!w.client.incorporating, 'the union survives an invasion it did not start');
  ok(w.client.incorporating.suspended === true, '  and says so: the weaving is held');
  ok(w.client.incorporating.monthsLeft === afterPeace,
    '  with the clock stopped where it was (' + w.client.incorporating.monthsLeft + ')');
  const info = incorporateInfo(w.ctx, 'HAS', 'NAB');
  ok(info.suspended === true && /halted by the war/.test(info.why),
    '  and the panel is told why rather than counting down at nothing');

  // Peace: it takes up where it left off.
  // Peace everywhere: a client follows its overlord to war, so the vassal is
  // in it too and the weaving is held by BOTH courts' wars.
  for (const k of Object.keys(w.game.tags)) w.game.tags[k].atWarWith = [];
  w.game.wars = [];
  monthlyIncorporation(w.ctx);
  ok(w.client.incorporating && !w.client.incorporating.suspended,
    'peace restarts the clock');
  ok(w.client.incorporating.monthsLeft === afterPeace - 1,
    '  from where it stopped (' + w.client.incorporating.monthsLeft + ')');
}
{
  // The invasion is still not free: a client whose devotion cools below the
  // keep line during the war breaks the union exactly as before.
  const w = weaving();
  declareWar(w.ctx, 'SEL', 'HAS', 'A War of Opportunity');
  monthlyIncorporation(w.ctx);
  ok(!!w.client.incorporating, 'the union is held while the fighting runs');
  w.client.opinion.HAS = 20; // the war has cost the lord their devotion
  monthlyIncorporation(w.ctx);
  ok(!w.client.incorporating,
    'and a client whose devotion breaks during the war still ends it');
}
{
  // …and the union still dies with the bond, which is the one thing that
  // should end it outright.
  const w = weaving();
  w.client.overlord = null;
  monthlyIncorporation(w.ctx);
  ok(!w.client.incorporating, 'a broken client bond still voids the weaving outright');
}

// ---------------------------------------------------------------------------
console.log('== §137b: a court that cannot afford a grievance stops paying for it ==');
{
  const w = boot('167bce', 'HAS');
  const g = w.game;
  // Two courts of equal weight: deference must be exactly zero.
  const equalise = (a, b) => {
    let n = 0;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable) continue;
      p.owner = (n++ % 2) ? a : b;
      p.controller = p.owner;
      p.dev = { tax: 3, prod: 3, mp: 3 };
    }
  };
  equalise('HAS', 'SEL');
  g.tags.HAS.stability = 1; g.tags.SEL.stability = 1;
  const wa = realmWeight(w.ctx, 'HAS'), wb = realmWeight(w.ctx, 'SEL');
  ok(Math.abs(wa - wb) <= 9, 'two courts of a weight (' + wa + ' vs ' + wb + ')');
  ok(deference(w.ctx, 'SEL', 'HAS') === 0,
    'an equal deferring to nobody: deference 0 — every rivalry the chapters are about');
}
{
  const w = boot('167bce', 'HAS');
  const g = w.game;
  // A giant and a minnow: everything to HAS but four cells for SEL.
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    p.dev = { tax: 3, prod: 3, mp: 3 };
    p.owner = (n++ < 4) ? 'SEL' : 'HAS';
    p.controller = p.owner;
  }
  g.tags.SEL.stability = 1;
  const d = deference(w.ctx, 'SEL', 'HAS');
  ok(d > 0.5, 'a court a fraction of the taker\'s weight defers (' + d.toFixed(2) + ')');
  // A grudge that has run its ten quiet years.
  const victim = g.tags.SEL;
  victim.grudges = { HAS: { provs: [], thaw: 240 } };
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === 'HAS') { victim.grudges.HAS.provs.push(i); break; }
  }
  const matured = thawProgress(w.ctx, 'SEL', 'HAS');
  ok(matured > 0.5, 'and carries its thaw past the plain half-reach (' + matured.toFixed(2) + ')');
  const ceiling = grudgeCeiling(w.ctx, 'SEL', 'HAS');
  ok(ceiling > -50, 'so the ceiling on what goodwill can buy lifts (' + ceiling + ')');

  // Troubles at home carry it further still.
  const steady = deference(w.ctx, 'SEL', 'HAS');
  g.tags.SEL.stability = -3;
  const shaken = deference(w.ctx, 'SEL', 'HAS');
  ok(shaken > steady,
    'a court that cannot keep its own house quiet defers further ('
    + steady.toFixed(2) + ' → ' + shaken.toFixed(2) + ')');
  const shakenCeiling = grudgeCeiling(w.ctx, 'SEL', 'HAS');
  ok(shakenCeiling >= ceiling,
    '  and its ceiling lifts with it (' + ceiling + ' → ' + shakenCeiling + ')');
}
{
  // The fury is untouched — only the persistence was wrong. A fresh grudge
  // caps hard however small the victim is.
  const w = boot('167bce', 'HAS');
  const g = w.game;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    p.dev = { tax: 3, prod: 3, mp: 3 };
    p.owner = (n++ < 4) ? 'SEL' : 'HAS';
    p.controller = p.owner;
  }
  const victim = g.tags.SEL;
  victim.grudges = { HAS: { provs: [], thaw: 0 } };
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === 'HAS') { victim.grudges.HAS.provs.push(i); break; }
  }
  ok(thawProgress(w.ctx, 'SEL', 'HAS') === 0, 'a fresh grudge has matured not at all');
  ok(grudgeCeiling(w.ctx, 'SEL', 'HAS') <= -100,
    '  and caps as hard as it ever did (' + grudgeCeiling(w.ctx, 'SEL', 'HAS') + ')');
  victim.opinion = victim.opinion || {};
  victim.opinion.HAS = -150;
  addOpinion(w.ctx, 'SEL', 'HAS', 200);
  ok((victim.opinion.HAS || 0) <= -100,
    '  and no amount of goodwill buys past it while the wound is fresh ('
    + victim.opinion.HAS + ')');
}

console.log(failures ? `smoke92: ${failures} FAIL` : 'smoke92: ALL PASS');
process.exit(failures ? 1 : 0);
