// Headless regression — SPEC §129: the diaspora rising is not Judaea.
//
// The Kitos War of 115–117 was modelled as something the player's own state
// did. Three cards across two packages offered "rise with the diaspora", and
// what that meant mechanically was: Judaea declares war on Rome, and Cyrene,
// Cyprus, Egypt and Babylonia receive a +3 unrest modifier for eight years.
// The communities that actually rose were not a belligerent. They were weather
// on somebody else's provinces.
//
// That gets the causation backwards, and the backwards version is the one
// thing the period is famous for NOT being. The rising happened without
// Judaea. Its people were Greek-speaking, had never been governed from
// Jerusalem, and answered to nobody there; Eusebius says the Jews of Cyrene
// appointed a king of their own. Judaea's question in 116 was never whether to
// rise. It was whether to join somebody else's war.
//
// So the rising secedes from Rome as its own tag with its own colour, on every
// road and whatever Judaea decides, and this suite holds that: it exists, it
// is not the player, it is at war on its own account, it takes the ground it
// historically took and no more, and joining it is an alliance rather than an
// identity.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');

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
const EV = (ERAS.find((e) => e.bookmark.id === '66ce') || {}).events || [];
const CARD = (id) => EV.find((e) => e && e.id === id);

const ROMAN_GROUND = ['Cyrene', 'Marmarica', 'Alexandria', 'Leontopolis', 'Oxyrhynchus',
  'Salamis', 'Paphos'];
const OCCUPIED = ['Nehardea', 'Babylon', 'Seleucia-Ctesiphon'];

function world(opts = {}) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
  const game = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_66, events: EV,
    playerTag: 'JUD', rngSeed: 4, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_66,
    events: EV, provinceMap,
  });
  game.date = { y: 116, m: 6, d: 1 };
  game.wars = [];
  for (const k of Object.keys(game.tags)) game.tags[k].atWarWith = [];
  const t = game.tags.JUD;
  t.alive = true; t.ai = false; t.overlord = null;
  const jer = ctx.prov('Jerusalem');
  if (jer) { jer.owner = 'JUD'; jer.controller = 'JUD'; }
  Object.assign(game.flags, opts.flags || {});
  if (opts.trajanTookMesopotamia) {
    for (const n of OCCUPIED) {
      const p = ctx.prov(n);
      if (p) { p.owner = 'ROM'; p.controller = 'ROM'; }
    }
  }
  if (opts.romeHasNoAfrica) {
    for (const n of ROMAN_GROUND) {
      const p = ctx.prov(n);
      if (p) { p.owner = 'PAR'; p.controller = 'PAR'; }
    }
  }
  return { game, ctx };
}
const held = (ctx, names, tag) => names.filter((n) => {
  const p = ctx.prov(n); return p && p.owner === tag;
});
const atWar = (game, a, b) => (game.wars || []).some((w) => w
  && (((w.attackers || []).indexOf(a) >= 0 && (w.defenders || []).indexOf(b) >= 0)
    || ((w.attackers || []).indexOf(b) >= 0 && (w.defenders || []).indexOf(a) >= 0)));

console.log('== the rising has a tag of its own, and it is not Judaea ==');
{
  const def = (DEFINES.TAGS || {}).LUK;
  ok(!!def, 'the roster has a state for it');
  ok(def && def.religion === 'judaism' && def.culture === 'greek',
    '  Jewish and Greek-speaking, which is the whole argument (' + (def && def.religion) + '/' + (def && def.culture) + ')');
  ok(def && def.name !== 'Judaea' && !/Jude/i.test(def.name || ''),
    '  and it does not wear Judaea\'s name (' + (def && def.name) + ')');
  const jud = (DEFINES.TAGS || {}).JUD;
  ok(!jud || String(def.color) !== String(jud.color),
    '  nor Judaea\'s colour, so the map can tell them apart');
  ok((DEFINES.GOV_OF || {}).LUK && (DEFINES.PERSONALITIES || {}).LUK,
    '  and the AI knows how to play it');
}

console.log('== it rises on every road, including the ones where Judaea refuses ==');
{
  // The fallen road (Yavneh) and the standing road (the kingdom), every answer.
  const CASES = [
    ['ev_a_the_east_is_burning', 0, 'the academy answers that the hour has come'],
    ['ev_a_the_east_is_burning', 1, 'the academy forbids it in writing'],
    ['ev_b_the_flank_of_the_war', 0, 'the kingdom holds the corridor open'],
    ['ev_b_the_flank_of_the_war', 1, 'the kingdom shuts the road'],
    ['ev_b_the_flank_of_the_war', 2, 'the kingdom rises with the whole East'],
  ];
  for (const [id, idx, label] of CASES) {
    const w = world();
    const card = CARD(id);
    ok(!!card, id + ' is in the chain');
    card.options[idx].effects(w.ctx);
    ok(!!w.game.tags.LUK, label + ': the rising exists');
    ok(w.game.flags.theRisingLives === true, '  and the record says so');
    ok(atWar(w.game, 'LUK', 'ROM'), '  and it is at war with Rome on its own account');
  }
}

console.log('== and it takes the ground it took, and no more ==');
{
  const w = world();
  CARD('ev_a_the_east_is_burning').options[1].effects(w.ctx);
  const theirs = held(w.ctx, ROMAN_GROUND, 'LUK');
  ok(theirs.length === ROMAN_GROUND.length,
    'Cyrenaica, Egypt and Cyprus change hands (' + theirs.length + '/' + ROMAN_GROUND.length + ')');
  ok(!held(w.ctx, ROMAN_GROUND, 'ROM').length, '  and Rome holds none of them');
  ok(!held(w.ctx, ['Jerusalem'], 'LUK').length,
    '  and the rising does not hold Jerusalem, which is the point of it');

  // Mesopotamia rose against Trajan's occupying army. No occupation, no rising
  // there — Parthia keeps Babylonia and the card does not pretend otherwise.
  ok(held(w.ctx, OCCUPIED, 'LUK').length === 0,
    'Babylonia stays Parthian when Rome never took it');
  const occupied = world({ trajanTookMesopotamia: true });
  CARD('ev_a_the_east_is_burning').options[1].effects(occupied.ctx);
  ok(held(occupied.ctx, OCCUPIED, 'LUK').length === OCCUPIED.length,
    '  and rises with the rest when Trajan is standing on it');
}

console.log('== joining is an alliance, not an identity ==');
{
  const w = world();
  CARD('ev_b_the_flank_of_the_war').options[2].effects(w.ctx);
  ok(!!w.game.tags.LUK && w.game.tags.LUK !== w.game.tags.JUD,
    'the kingdom and the rising are two states');
  ok(w.game.flags.joinedTheirRising === true, '  and the kingdom joined theirs');
  ok(atWar(w.game, 'JUD', 'ROM') && atWar(w.game, 'LUK', 'ROM'),
    '  both are at war with Rome');
  ok(!atWar(w.game, 'JUD', 'LUK'), '  and not with each other');
  ok((w.game.tags.JUD.allies || []).indexOf('LUK') >= 0
    && (w.game.tags.LUK.allies || []).indexOf('JUD') >= 0,
    '  they are allies on both sides of the ledger');
  ok(Number((w.game.tags.LUK.opinion || {}).JUD) > 80,
    '  and the rising thinks well of the kingdom that came');

  // Refusing does not ally, and does not stop the rising.
  const cold = world();
  CARD('ev_b_the_flank_of_the_war').options[0].effects(cold.ctx);
  ok(!!cold.game.tags.LUK, 'a kingdom that holds the corridor still has a rising next door');
  ok(!cold.game.flags.joinedTheirRising, '  which it has not joined');
  ok(!atWar(cold.game, 'JUD', 'ROM'), '  and it is not at war with Rome');
}

console.log('== the §125 card asks the same question the same way ==');
{
  const card = CARD('ev_n_the_east_is_burning');
  ok(!!card, 'the nation package still asks whether the kingdom marches');
  for (const [idx, label] of [[0, 'march'], [1, 'hold the frontier']]) {
    const w = world({ flags: { secondKingdom: true } });
    card.options[idx].effects(w.ctx);
    ok(!!w.game.tags.LUK, label + ': the rising is a state');
    ok(atWar(w.game, 'LUK', 'ROM'), '  at war with Rome');
  }
  const marched = world({ flags: { secondKingdom: true } });
  card.options[0].effects(marched.ctx);
  ok(marched.game.flags.joinedTheirRising === true,
    'marching means joining theirs rather than declaring its own');
  const stayed = world({ flags: { secondKingdom: true } });
  card.options[1].effects(stayed.ctx);
  ok(!stayed.game.flags.joinedTheirRising && !atWar(stayed.game, 'JUD', 'ROM'),
    'and holding the frontier leaves the kingdom out of a war that happens anyway');
}

console.log('== it never rises twice, and never rises out of nothing ==');
{
  // Both roads' cards can be reached in one campaign only in odd worlds, but
  // the spawner is called from six places and must be idempotent.
  const w = world();
  CARD('ev_a_the_east_is_burning').options[1].effects(w.ctx);
  const first = w.game.tags.LUK;
  const wars = (w.game.wars || []).length;
  CARD('ev_b_the_flank_of_the_war').options[0].effects(w.ctx);
  ok(w.game.tags.LUK === first, 'a second call does not raise a second rising');
  ok((w.game.wars || []).length === wars, '  nor a second war');

  // A world where Rome holds no Cyrenaica has no Cyrenean rising, and the
  // card falls back to the old behaviour rather than inventing a state.
  const nowhere = world({ romeHasNoAfrica: true });
  CARD('ev_a_the_east_is_burning').options[0].effects(nowhere.ctx);
  ok(!nowhere.game.tags.LUK, 'no Roman ground, no rising');
  ok(atWar(nowhere.game, 'JUD', 'ROM'),
    '  and the land that meant to rise rises by itself instead');
}

console.log('== no card still models the rising as Judaea ==');
{
  // The regression in one line: a diaspora card that declares Judaea's war
  // WITHOUT first raising the rising is the old bug returning.
  for (const f of ['events_66ce_after.js', 'events_66ce_nation.js']) {
    const src = readFileSync(R + '/js/data/' + f, 'utf8');
    ok(/function raiseTheRising/.test(src) && /function joinTheRising/.test(src),
      f + ' knows how to raise the rising and how to join it');
    ok(/secedeTag\(ctx, 'ROM', 'LUK'/.test(src),
      '  and raises it out of Rome rather than out of Judaea');
  }
}

console.log(failures ? `smoke88: ${failures} FAIL` : 'smoke88: ALL PASS');
process.exit(failures ? 1 : 0);
