// Headless regression — SPEC §174: winning free is not conquest.
//
//  1. The scripted risings carry the freedom marker, and the settlement that
//     keeps the rising side's own homeland adds no infamy — no coalition
//     leagues against a people for throwing off its own yoke.
//  2. The exemption is the homeland, not the war: alien land taken in the
//     same settlement still prices as conquest, to the point.
//  3. The generic independence CB stamps the marker itself, and the peace
//     table honors it — same-faith soil free, alien soil priced.
//  4. Old saves reconstruct the side from `war.cb`.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { BOOKMARK_132 } = await import(R + '/js/data/bookmark_132ce.js');
const { BOOKMARK_529 } = await import(R + '/js/data/bookmark_529ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const mkGeom = () => ({
  neighbors: Array.from({ length: N + 1 }, (_, i) => {
    const s = new Set();
    if (i > 1) s.add(i - 1);
    if (i >= 1 && i < N) s.add(i + 1);
    return s;
  }),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
});
const boot = (bookmark, playerTag, seed) => {
  const geom = mkGeom();
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: [] });
  return { game, ctx };
};
const findWarOf = (game, a, b) => (game.wars || []).find((w) => {
  const all = (w.attackers || []).concat(w.defenders || []);
  return all.indexOf(a) >= 0 && all.indexOf(b) >= 0;
});
const isDiaspora = (p) => (DEFINES.DIASPORA || []).indexOf(p.canon || p.name) >= 0;

console.log('== the Maccabean settlement frees the hills without infamy ==');
{
  const { game, ctx } = boot(BOOKMARK_167, 'HAS', 108);
  const war = findWarOf(game, 'HAS', 'SEL');
  ok(!!war, 'the Maccabean Revolt is on foot');
  ok(mil.independenceSideOf(war) === 'att', 'the revolt carries the freedom marker on the rising side');
  // The rising holds the hills of the faith: every Seleucid town of the faith
  // outside the diaspora falls under Hasmonean control.
  const hills = [];
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (!p || p.impassable || p.owner !== 'SEL') continue;
    if (p.religion === 'judaism' && !isDiaspora(p)) { p.controller = 'HAS'; hills.push(i); }
  }
  ok(hills.length >= 3, 'the Seleucids hold a Jewish heartland worth freeing (' + hills.length + ' towns)');
  const before = game.tags.HAS.aggression || 0;
  // Terms from Antioch: the authored concession keeps only the provinces of
  // the faith (events_167bce ev_terms_antioch).
  mil.endWarBySword(ctx, war, 'att', {
    keep: (p) => p.religion === 'judaism' && !isDiaspora(p), silent: true,
  });
  ok(game.provinces[hills[0]].owner === 'HAS', 'the hills of the faith are kept');
  ok((game.tags.HAS.aggression || 0) === before,
    'winning free is not conquest: the settlement adds no infamy (' + (game.tags.HAS.aggression || 0) + ')');
  // The league that would have marched: the same hostile courts, given the
  // infamy the settlement used to charge, would form a coalition — and with
  // the homeland exempt they do not.
  for (const k of ['SEL', 'PTO', 'NAB', 'ARM']) {
    if (game.tags[k]) { game.tags[k].opinion = game.tags[k].opinion || {}; game.tags[k].opinion.HAS = -100; }
  }
  ok(mil.coalitionAgainst(ctx, 'HAS').length === 0,
    'no coalition leagues against the freed');
  game.tags.HAS.aggression = 35; // the control: a real rampage would still league them
  ok(mil.coalitionAgainst(ctx, 'HAS').length >= 3,
    'the same courts would march against a conqueror — the gate is the infamy, not the wiring');
  game.tags.HAS.aggression = 0;
}

console.log('== the exemption is the homeland, not the war ==');
{
  const { game, ctx } = boot(BOOKMARK_167, 'HAS', 109);
  const war = findWarOf(game, 'HAS', 'SEL');
  const side = (war.attackers || []).concat(war.defenders || []);
  // A clean slate: no cross-belligerent occupations but the two we plant.
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.controller !== p.owner
      && side.indexOf(p.owner) >= 0 && side.indexOf(p.controller) >= 0) p.controller = p.owner;
  }
  let home = null;
  let alien = null;
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (!p || p.impassable || p.owner !== 'SEL') continue;
    if (!home && p.religion === 'judaism' && !isDiaspora(p)) home = p;
    else if (!alien && p.religion !== 'judaism') alien = p;
    if (home && alien) break;
  }
  ok(!!home && !!alien, 'a town of the faith and a Greek town both stand on Seleucid soil');
  home.controller = 'HAS';
  alien.controller = 'HAS';
  const before = game.tags.HAS.aggression || 0;
  // An authored total settlement: everything held is kept.
  mil.endWarBySword(ctx, war, 'att', { keep: () => true, silent: true });
  const per = mil.BAL(ctx, 'infamyPerDev', 0.5);
  const expected = Math.round(mil.devTotal(alien) * per);
  ok(home.owner === 'HAS' && alien.owner === 'HAS', 'both towns are annexed');
  ok((game.tags.HAS.aggression || 0) - before === expected,
    'only the Greek town is counted: +' + ((game.tags.HAS.aggression || 0) - before)
    + ' infamy (expected ' + expected + ')');
}

console.log('== the generic rising: the independence CB at the peace table ==');
{
  const { game, ctx } = boot(BOOKMARK_167, 'HAS', 110);
  // Nabataea rises against Antioch. The CB stamps the marker by itself; the
  // same-faith town it frees costs nothing, and the truce binds.
  const plant = (tag) => {
    for (let i = 2; i < game.provinces.length; i++) {
      const p = game.provinces[i];
      const n = game.provinces[i - 1];
      if (!p || p.impassable || p.owner !== 'SEL') continue;
      if (!n || n.impassable || n.owner === 'SEL' || n.owner === tag) continue;
      if (isDiaspora(p)) continue;
      n.owner = tag; n.controller = tag; // the rising has a country to attach the town to (SPEC §116)
      p.controller = tag;
      return p;
    }
    return null;
  };
  const dealFor = (id) => ({
    provinces: [id], provinceTo: {}, gold: 0,
    humiliate: false, subjugate: false, reparations: false,
    release: [], transferVassals: [],
  });
  {
    const q = plant('NAB');
    ok(!!q, 'a Seleucid border town stands beside Nabataean soil (' + (q && q.name) + ')');
    q.religion = game.tags.NAB.religion; // its people are the rising's own
    const war = mil.declareWar(ctx, 'NAB', 'SEL', 'The Nabataean Rising', 'independence');
    ok(!!war && mil.independenceSideOf(war) === 'att', 'the independence CB stamps the freedom marker');
    war.warscore.NAB = 80;
    const before = game.tags.NAB.aggression || 0;
    mil.executePeaceDeal(ctx, war, 'NAB', dealFor(q.id));
    ok(q.owner === 'NAB', 'the town of their own people is ceded at the table');
    ok((game.tags.NAB.aggression || 0) === before,
      'freeing your own soil at the table carries no infamy');
  }
  {
    const q = plant('ARM');
    ok(!!q, 'a Seleucid border town stands beside Armenian soil (' + (q && q.name) + ')');
    const alienFaith = ['hellenism', 'judaism'].find((r) => r !== game.tags.ARM.religion);
    q.religion = alienFaith; // somebody else's town, taken on the way out
    const war = mil.declareWar(ctx, 'ARM', 'SEL', 'The Armenian Rising', 'independence');
    ok(!!war && mil.independenceSideOf(war) === 'att', 'the second rising is marked the same way');
    war.warscore.ARM = 80;
    const before = game.tags.ARM.aggression || 0;
    mil.executePeaceDeal(ctx, war, 'ARM', dealFor(q.id));
    ok(q.owner === 'ARM', 'the alien town is ceded at the table');
    ok((game.tags.ARM.aggression || 0) > before,
      'alien land taken in an independence war still prices as conquest (+'
      + ((game.tags.ARM.aggression || 0) - before) + ')');
  }
}

console.log('== every scripted rising carries the marker ==');
{
  const { game } = boot(BOOKMARK_66, 'JUD', 111);
  ok(mil.independenceSideOf(findWarOf(game, 'JUD', 'ROM')) === 'att', 'the Great Revolt rises on the attack');
}
{
  const { game } = boot(BOOKMARK_132, 'JUD', 112);
  ok(mil.independenceSideOf(findWarOf(game, 'JUD', 'ROM')) === 'att', 'Bar Kokhba rises on the attack');
}
{
  const { game } = boot(BOOKMARK_529, 'SAM', 113);
  ok(mil.independenceSideOf(findWarOf(game, 'SAM', 'BYZ')) === 'att', 'the Keepers rise on the attack');
}
{
  const { game } = boot(BOOKMARK_1948, 'ISR', 114);
  ok(mil.independenceSideOf(findWarOf(game, 'EGY', 'ISR')) === 'def', 'the new state of 1948 defends its freedom');
}

console.log('== old saves reconstruct the side from the CB ==');
ok(mil.independenceSideOf({ cb: 'independence' }) === 'att', 'a saved independence war reads as a rising');
ok(mil.independenceSideOf({ cb: 'conquest' }) === null, 'a conquest war has no freedom side');
ok(mil.independenceSideOf({ cb: 'independence', independenceSide: 'def' }) === 'def', 'an explicit side outranks the CB');
ok(mil.independenceSideOf(null) === null, 'no war, no side');

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
