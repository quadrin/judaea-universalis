// Headless regression — SPEC §238: the West comes apart, 395–439.
//
// The 351 chapter runs to 430 and used to paint one Rome from the Clyde to
// the Euphrates for the whole of it, with the division of 395 modelled as a
// −10% manpower modifier. This package puts the collapse on the map. What
// would rot silently here:
//
//   1. A province name that does not resolve. Every transfer in this arc is
//      by name, and `handOver`/`secedeTag` skip what they cannot find — so a
//      typo does not throw, it just quietly leaves Egypt in the western
//      Empire for ever. The whole of THE_EAST, HISPANIA, MAURETANIA and
//      AFRICA is checked against the chapter's own map.
//   2. The line of 395 itself. Pannonia, Dalmatia and Noricum stayed western
//      and eastern Illyricum did not; getting that backwards is the sort of
//      thing that reads fine in a list and is wrong on a map.
//   3. The war. `secedeTag` deliberately gives the child none of the parent's
//      wars — right for a union coming apart in 1961, catastrophic here,
//      where the war is ABOUT the ground that just changed hands. A campaign
//      at war with Rome in 394 must be at war with Constantinople in 395,
//      with its war score intact, or the division hands the player a free
//      peace and an enemy they never declared on.
//   4. The courts arrive dressed by the chapter (§236): what leaves Rome is
//      the Eastern Empire, not "Byzantium".
//   5. Rome survives all of it. The West is dismembered, not deleted — it
//      still holds Italy in 439, which is what makes the arithmetic legible.
//   6. And the East never collapses. That is what the East is for.
//
// The suite settles the chapter's own civil war before it starts (see `boot`):
// this arc begins in 395 and Magnentius has been dead since 353.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { BOOKMARK_351 } = await import(R + '/js/data/bookmark_351ce.js');
const { EVENTS_351_COLLAPSE } = await import(R + '/js/data/events_351ce_collapse.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { tagDef } = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const era351 = ERAS.find((e) => e.bookmark.id === '351ce');

function boot(tag = 'JUD') {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_351);
  const events = era351.events;
  const game = initGame({
    DEFINES, MAP_DATA, geom: null, bookmark: BOOKMARK_351, events,
    playerTag: tag, rngSeed: 23, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: null,
    bus: { emit() {}, on() { return () => {}; } },
    bookmark: BOOKMARK_351, events, provinceMap,
  });
  // The chapter opens in the middle of a civil war (SPEC §239): Magnentius
  // holds Britain, Gaul, Spain, Italy and Africa in 351, and Constantius does
  // not get them back until Lugdunum in 353. Every card in THIS arc is dated
  // 395 or later, by which time the West has been one empire again for forty
  // years — so the suite settles that war first and then asks its questions,
  // rather than testing the division of 395 against the map of 351.
  const fall = era351.events.find((c) => c && c.id === 'ev351w_magnentius_falls');
  if (game.tags.USR && fall) fall.options[0].effects(ctx);
  return { game, ctx };
}

const card = (id) => EVENTS_351_COLLAPSE.find((c) => c && c.id === id);
const play = (ctx, id) => { const c = card(id); if (c) c.options[0].effects(ctx); return !!c; };
const owned = (game, tag) => game.provinces.filter((p) => p && !p.impassable && p.owner === tag).length;

// ---------------------------------------------------------------------------
console.log('== the package is registered, dated, and worldly ==');
{
  ok(EVENTS_351_COLLAPSE.length === 8, 'eight cards, 395 to 439 (' + EVENTS_351_COLLAPSE.length + ')');
  const ids = era351.events.filter(Boolean).map((c) => c.id);
  for (const c of EVENTS_351_COLLAPSE) {
    ok(ids.filter((i) => i === c.id).length === 1, '  ' + c.id + ' is in the chapter exactly once');
  }
  ok(EVENTS_351_COLLAPSE.every((c) => c.world === true && c.date && c.date.y >= 395 && c.date.y <= 439),
    '  every card is a dated world card inside the arc');
  ok(EVENTS_351_COLLAPSE.every((c) => Array.isArray(c.options) && c.options.length >= 1
    && typeof c.options[0].effects === 'function'), '  and every one of them does something');
  // The division kept its id when it moved packages, so a save mid-countdown
  // and the outliner's own "in 50 months" notice still name the same card.
  ok(card('ev351w_the_division'), 'the division kept the id it shipped with');
}

// ---------------------------------------------------------------------------
console.log('== every province the arc names is on this chapter\'s map ==');
{
  const { ctx } = boot();
  // Pull the four lists straight out of the module's own text so the check
  // cannot drift from the lists the cards actually use.
  const fs = await import('fs');
  const text = fs.readFileSync(R + '/js/data/events_351ce_collapse.js', 'utf8');
  const listNames = ['THE_EAST', 'HISPANIA', 'MAURETANIA', 'AFRICA_PROCONSULARIS'];
  let checked = 0;
  const dead = [];
  for (const name of listNames) {
    const m = text.match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\n\\];'));
    ok(!!m, name + ' is declared');
    if (!m) continue;
    for (const q of m[1].matchAll(/'([^']+)'/g)) {
      checked++;
      if (!ctx.prov(q[1])) dead.push(name + '/' + q[1]);
    }
  }
  ok(!dead.length, checked + ' province names, all of them seated'
    + (dead.length ? ' (' + dead.slice(0, 6).join(', ') + ')' : ''));
}

// ---------------------------------------------------------------------------
console.log('== 395: the line of the division ==');
{
  const { game, ctx } = boot();
  const before = owned(game, 'ROM');
  play(ctx, 'ev351w_the_division');
  ok(!!game.tags.BYZ, 'the East is on the map');
  const east = owned(game, 'BYZ');
  const west = owned(game, 'ROM');
  ok(east > 90 && west > 70, '  ' + west + ' provinces west, ' + east + ' east (of ' + before + ')');
  ok(east + west === before, '  and every province Rome held went to one half or the other');
  // Oriens, Egypt, Asia, Thrace and eastern Illyricum go east…
  for (const n of ['Jerusalem', 'Antioch', 'Alexandria', 'Byzantion', 'Thessalonica',
    'Ancyra', 'Corinth', 'Naissus', 'Cyrene', 'Nisibis']) {
    ok(ctx.prov(n).owner === 'BYZ', '  ' + n + ' answers to Constantinople');
  }
  // …and Italy, Africa, Gaul, Spain, Britain and Pannonia stay western.
  for (const n of ['Roma', 'Ravenna', 'Carthago', 'Lugdunum', 'Tarraco', 'Britannia',
    'Sirmium', 'Salona', 'Carnuntum', 'Virunum']) {
    ok(ctx.prov(n).owner === 'ROM', '  ' + n + ' stays with Honorius');
  }
  // The chapter dresses it (SPEC §236): three letters, this century's state.
  ok(game.tags.BYZ.name === 'The Eastern Empire',
    '  and it is called ' + game.tags.BYZ.name + ', not Byzantium');
  ok(tagDef(ctx, 'BYZ').capital === 'Byzantion', '  seated at Constantinople');
  ok(game.tags.BYZ.ruler && game.tags.BYZ.ruler.name === 'Arcadius', '  under Arcadius');
}

// ---------------------------------------------------------------------------
console.log('== 395: the war goes with the ground ==');
{
  const { game, ctx } = boot();
  const w = (game.wars || []).find((x) => x
    && ((x.attackers || []).concat(x.defenders || [])).indexOf('JUD') >= 0
    && ((x.attackers || []).concat(x.defenders || [])).indexOf('ROM') >= 0);
  ok(!!w, 'the chapter opens with a war between the rising and Rome');
  w.warscore = { JUD: 22, ROM: -22 };
  play(ctx, 'ev351w_the_division');
  const sides = (w.attackers || []).concat(w.defenders || []);
  ok(sides.indexOf('BYZ') >= 0 && sides.indexOf('ROM') < 0,
    '  and after the division it is fought against the East (' + sides.join(' vs ') + ')');
  ok(w.warscore.BYZ === -22 && w.warscore.JUD === 22 && !('ROM' in w.warscore),
    '  with the war score carried over, not reset');
  ok((game.tags.JUD.atWarWith || []).indexOf('BYZ') >= 0
    && (game.tags.JUD.atWarWith || []).indexOf('ROM') < 0,
  '  the player is at war with Constantinople and at peace with Milan');
  ok((game.tags.ROM.atWarWith || []).indexOf('JUD') < 0,
    '  and the West has stopped fighting a war it cannot reach');
  // Persia's war is an eastern war too — it was always about Mesopotamia.
  ok((game.tags.BYZ.atWarWith || []).indexOf('SAS') >= 0,
    '  Persia\'s war goes east with everything else');
}

// ---------------------------------------------------------------------------
console.log('== a western war stays west ==');
{
  const { game, ctx } = boot();
  // Synthesize the other case: Rome at war with a barbarian court on the
  // Danube. Nothing about that quarrel belongs to Arcadius.
  game.wars.push({ attackers: ['GOT'], defenders: ['ROM'], warscore: { GOT: 5, ROM: -5 }, name: 'A Gothic War' });
  game.tags.ROM.atWarWith.push('GOT');
  game.tags.GOT.atWarWith.push('ROM');
  play(ctx, 'ev351w_the_division');
  const gothic = game.wars.find((x) => x && x.name === 'A Gothic War');
  ok(gothic && (gothic.defenders || []).indexOf('ROM') >= 0,
    'the Gothic war is still Rome\'s');
  ok((game.tags.GOT.atWarWith || []).indexOf('ROM') >= 0,
    '  and the Goths are still fighting the West');
}

// ---------------------------------------------------------------------------
console.log('== the arc, in order: five courts out of one ==');
{
  const { game, ctx } = boot();
  const order = ['ev351w_the_division', 'ev351c_the_rhine_crossing',
    'ev351c_britain_looks_to_itself', 'ev351c_the_lot_in_spain',
    'ev351c_the_burgundians_on_the_rhine', 'ev351c_the_federates_of_aquitaine',
    'ev351c_the_crossing_to_africa', 'ev351c_carthage'];
  let last = owned(game, 'ROM') + 1;
  for (const id of order) {
    ok(play(ctx, id), id + ' plays');
    const now = owned(game, 'ROM');
    ok(now <= last, '  and the West is no larger than it was (' + now + ')');
    last = now;
  }
  for (const [tag, name] of [['BYZ', 'The Eastern Empire'], ['BRT', 'The Britons'],
    ['VAN', 'The Vandals and Alans'], ['BGD', 'The Burgundians'], ['VIS', 'The Goths of Toulouse']]) {
    ok(!!game.tags[tag] && game.tags[tag].alive !== false && game.tags[tag].name === name,
      tag + ' is a court on the map: ' + (game.tags[tag] || {}).name);
    ok(owned(game, tag) >= 1, '  standing on ground of its own (' + owned(game, tag) + ')');
  }
  ok(ctx.prov('Britannia').owner === 'BRT', 'Britain sees to its own defence');
  ok(ctx.prov('Hispalis').owner === 'VAN' && ctx.prov('Tarraco').owner === 'ROM',
    'Spain is divided at the Ebro');
  ok(ctx.prov('Tolosa').owner === 'VIS', 'Aquitaine is Gothic');
  ok(ctx.prov('Carthago').owner === 'VAN', 'Carthage is Vandal');
  // The West is dismembered, not deleted.
  ok(game.tags.ROM.alive !== false && ctx.prov('Roma').owner === 'ROM'
    && ctx.prov('Mediolanum').owner === 'ROM',
  'and Rome still holds Italy in 439 (' + owned(game, 'ROM') + ' provinces left)');
  // The East loses nothing to any of it.
  ok(owned(game, 'BYZ') >= 100, 'the East never collapses (' + owned(game, 'BYZ') + ')');
  ok(ctx.prov('Jerusalem').owner === 'BYZ', '  and still governs Palestine at the end of the arc');
}

// ---------------------------------------------------------------------------
console.log('== a chapter where Rome lost the ground first ==');
{
  // The player who has taken Britain, Spain and Africa off Rome — or Persia
  // who has taken Syria — must not have a kingdom spawned on top of them, and
  // the cards must not throw when there is nothing to give away.
  const { game, ctx } = boot();
  for (const n of ['Britannia', 'Hispalis', 'Corduba', 'Malaca', 'Gades', 'Emerita',
    'Olisipo', 'Carthago Nova', 'Toletum', 'Bracara', 'Asturica', 'Salmantica',
    'Tolosa', 'Burdigala']) {
    const p = ctx.prov(n);
    if (p) { p.owner = 'JUD'; p.controller = 'JUD'; }
  }
  let threw = null;
  try {
    play(ctx, 'ev351w_the_division');
    play(ctx, 'ev351c_britain_looks_to_itself');
    play(ctx, 'ev351c_the_lot_in_spain');
    play(ctx, 'ev351c_the_federates_of_aquitaine');
  } catch (e) { threw = e && e.message; }
  ok(!threw, 'the arc runs over ground Rome no longer holds' + (threw ? ' (' + threw + ')' : ''));
  ok(!game.tags.BRT && !game.tags.VAN && !game.tags.VIS,
    '  and seats no kingdom on somebody else\'s provinces');
  ok(ctx.prov('Britannia').owner === 'JUD' && ctx.prov('Tolosa').owner === 'JUD',
    '  the conqueror keeps what it took');
}

console.log(failures ? failures + ' FAILURES' : 'smoke159: ALL PASS');
