// Headless regression — SPEC §149: a client cannot take the field against its
// own lord.
//
// Reported: "why do coalitions get waged WITH a country I just vassaled?"
//
// `declareWar` has always refused to OPEN a war between an overlord and its
// client (§75), and that was the only place the rule lived — so it held in one
// direction and not the other. A war is a persistent list of belligerents, and
// the bond can be made afterwards: by the peace table's subjugation clause, by
// a scripted overlord, or by the AI restoring a client whose independence
// declaration failed. Nothing went back and looked at the wars already running,
// so a court could be your client on Tuesday and marching against you in a
// coalition on Wednesday, with tribute still flowing the other way.
//
// The yoke IS the settlement of that quarrel — which is what the declareWar
// guard says in its own comment — so the client leaves the war rather than the
// war being cancelled. Everyone else fights on.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const MIL = await import(R + '/js/sim/military.js');

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

function boot() {
  const era = ERAS.find((e) => e.bookmark.id === '167bce');
  const b = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, b);
  const game = initGame({
    DEFINES, MAP_DATA, geom: flatGeom, bookmark: b, events: era.events,
    playerTag: 'HAS', rngSeed: 7, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: flatGeom,
    bus: { emit() {}, on() { return () => {}; } },
    bookmark: b, events: era.events, provinceMap,
  });
  game.tags.HAS.ai = false;
  game.wars = [];
  for (const k of Object.keys(game.tags)) game.tags[k].atWarWith = [];
  return { game, ctx };
}

// ---------------------------------------------------------------------------
console.log('== the reported case: a coalition marching with our own client ==');
{
  const { game, ctx } = boot();
  // A league against us: SEL leads, PTO and ROM march with it.
  const war = MIL.declareWar(ctx, 'SEL', 'HAS', 'The League against Judaea', 'conquest');
  for (const m of ['PTO', 'ROM']) {
    if (!war.attackers.includes(m)) war.attackers.push(m);
    if (!game.tags[m].atWarWith.includes('HAS')) game.tags[m].atWarWith.push('HAS');
    if (!game.tags.HAS.atWarWith.includes(m)) game.tags.HAS.atWarWith.push(m);
    war.warscore = war.warscore || {};
    war.warscore[m] = 0;
  }
  ok(war.attackers.includes('PTO'), 'the league forms with PTO in it');

  // …and now PTO becomes our client, by whatever road.
  game.tags.PTO.overlord = 'HAS';
  MIL.updateTagLife(ctx);   // the monthly sweep that carries the invariant

  const live = game.wars.find((w) => w && w.id === war.id);
  ok(!!live, 'the war goes on — the league is not cancelled by one defection');
  ok(!live.attackers.includes('PTO'),
    'but our client is no longer marching against us');
  ok(live.attackers.includes('SEL') && live.attackers.includes('ROM'),
    '  and everyone else is still in it');
  ok(!(game.tags.HAS.atWarWith || []).includes('PTO'),
    'we are not at war with our own client');
  ok(!(game.tags.PTO.atWarWith || []).includes('HAS'),
    '  nor it with us');
}

// ---------------------------------------------------------------------------
console.log('== the client takes its own clients home with it ==');
{
  const { game, ctx } = boot();
  const war = MIL.declareWar(ctx, 'SEL', 'HAS', 'The Seleucid War', 'conquest');
  // PTO marches with SEL, and NAB is PTO's own client.
  for (const m of ['PTO', 'NAB']) {
    if (!war.attackers.includes(m)) war.attackers.push(m);
    game.tags[m].atWarWith.push('HAS');
    game.tags.HAS.atWarWith.push(m);
  }
  game.tags.NAB.overlord = 'PTO';
  game.tags.PTO.overlord = 'HAS';    // PTO now bends the knee to us
  MIL.updateTagLife(ctx);
  const live = game.wars.find((w) => w && w.id === war.id);
  ok(!live.attackers.includes('PTO'), 'our new client leaves');
  ok(!live.attackers.includes('NAB'),
    '  and its own client goes with it — it was only there under that banner');
  ok(live.attackers.includes('SEL'), '  while the war itself continues');
}

// ---------------------------------------------------------------------------
console.log('== occupations between lord and client revert ==');
{
  const { game, ctx } = boot();
  const war = MIL.declareWar(ctx, 'PTO', 'HAS', 'The Ptolemaic War', 'conquest');
  const took = [];
  for (let i = 1; i < game.provinces.length && took.length < 3; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'HAS' && p.controller === 'HAS') {
      p.controller = 'PTO'; took.push(p);
    }
  }
  ok(took.length === 3, 'they hold three of our provinces (' + took.map((p) => p.name).join(', ') + ')');
  game.tags.PTO.overlord = 'HAS';
  MIL.updateTagLife(ctx);
  const still = took.filter((p) => p.controller !== p.owner);
  ok(still.length === 0,
    'and every one reverts when the bond is made'
    + (still.length ? ' — still held: ' + still.map((p) => p.name).join(', ') : ''));
  ok(!game.wars.find((w) => w && w.id === war.id),
    'a war with nobody left on one side dissolves');
}

// ---------------------------------------------------------------------------
console.log('== and an ordinary war is untouched ==');
{
  const { game, ctx } = boot();
  const war = MIL.declareWar(ctx, 'SEL', 'HAS', 'The Seleucid War', 'conquest');
  const before = JSON.stringify({ a: war.attackers, d: war.defenders });
  MIL.updateTagLife(ctx);
  const live = game.wars.find((w) => w && w.id === war.id);
  ok(!!live, 'a war between two sovereigns survives the sweep');
  ok(JSON.stringify({ a: live.attackers, d: live.defenders }) === before,
    '  with both sides exactly as they were');
  // A client fighting BESIDE its lord is the normal case and must not be touched.
  const { game: g2, ctx: c2 } = boot();
  g2.tags.PTO.overlord = 'HAS';
  const w2 = MIL.declareWar(c2, 'SEL', 'HAS', 'Another War', 'conquest');
  ok(w2.defenders.includes('PTO'), 'a loyal client is called to its lord\'s defence');
  MIL.updateTagLife(c2);
  const l2 = g2.wars.find((w) => w && w.id === w2.id);
  ok(l2 && l2.defenders.includes('PTO'),
    '  and the sweep leaves it there, because it is on the right side');
}

// ---------------------------------------------------------------------------
console.log('== a siege does not outlive the war that raised it (SPEC §150) ==');
{
  // Reported: "why is the Seleucid Empire still occupying my territory even
  // when I peaced out with them?" Occupation reverted — it always did. What did
  // not was a siege in PROGRESS, and the political layer stripes a cell on
  // `p.controller !== p.owner || p.siege`. So the camp stayed, the outliner
  // went on listing it, and the map went on showing enemy stripes.
  const striped = (p) => (p.controller !== p.owner || !!p.siege);
  {
    const { game, ctx } = boot();
    const war = MIL.declareWar(ctx, 'SEL', 'HAS', 'The Seleucid War', 'conquest');
    const p = game.provinces.find((q) => q && !q.impassable && q.owner === 'HAS');
    p.siege = { by: 'SEL', progress: 30, days: 40 };
    ok(striped(p), p.name + ' is striped while the siege runs');
    MIL.executePeaceDeal(ctx, war, 'HAS', { provinces: [], gold: 0, release: [], transferVassals: [] });
    ok(!game.wars.length, 'the war ends');
    ok(!p.siege, '  and the siege is lifted with it');
    ok(!striped(p), '  so the province stops reading as occupied');
  }
  {
    // The same at a separate peace, and ONLY on the front that settled.
    const { game, ctx } = boot();
    const war = MIL.declareWar(ctx, 'SEL', 'HAS', 'The League', 'conquest');
    war.attackers.push('PTO');
    game.tags.PTO.atWarWith.push('HAS');
    game.tags.HAS.atWarWith.push('PTO');
    war.warscore = war.warscore || {};
    war.warscore.PTO = 0;
    const ours = game.provinces.filter((q) => q && !q.impassable && q.owner === 'HAS').slice(0, 2);
    ours[0].siege = { by: 'PTO', progress: 30, days: 40 };
    ours[1].siege = { by: 'SEL', progress: 55, days: 70 };
    MIL.executePeaceDeal(ctx, war, 'HAS', { enemy: 'PTO', provinces: [], gold: 0, release: [], transferVassals: [] });
    ok(!ours[0].siege, 'a separate peace lifts the leaver\'s siege');
    ok(!!ours[1].siege, '  and leaves the siege of the court still fighting');
  }
  {
    // …and when a client bond ends a war (§149), its camps go too.
    const { game, ctx } = boot();
    MIL.declareWar(ctx, 'PTO', 'HAS', 'The Ptolemaic War', 'conquest');
    const p = game.provinces.find((q) => q && !q.impassable && q.owner === 'HAS');
    p.siege = { by: 'PTO', progress: 40, days: 50 };
    game.tags.PTO.overlord = 'HAS';
    MIL.updateTagLife(ctx);
    ok(!p.siege, 'a court that bends the knee lifts its siege of its new lord');
  }
}

// ---------------------------------------------------------------------------
console.log('== declareWar still refuses the other direction ==');
{
  const { game, ctx } = boot();
  game.tags.PTO.overlord = 'HAS';
  const w = MIL.declareWar(ctx, 'HAS', 'PTO', 'A war on our own client', 'conquest');
  ok(!w, 'a lord cannot declare on its own client (SPEC §75, unchanged)');
  const w2 = MIL.declareWar(ctx, 'PTO', 'HAS', 'A client rising', 'conquest');
  ok(!w2, '  nor a client on its lord — that road is the independence rising');
}

console.log(failures ? `smoke99: ${failures} FAIL` : 'smoke99: ALL PASS');
process.exit(failures ? 1 : 0);
