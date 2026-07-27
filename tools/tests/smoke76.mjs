// Headless regression — the royal century (SPEC §106): the wars of Alexander
// Jannaeus and the nine years of Salome Alexandra, from the disaster at
// Asophon to the war of the brothers that opens the 67 BCE chapter.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { doctrineScores } = await import(R + '/js/sim/doctrine.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const EV = (ERAS.find((e) => e.bookmark.id === '167bce') || {}).events || [];
const byId = (id) => EV.find((e) => e && e.id === id);
const KINGS = EV.filter((e) => e && /^ev_k_/.test(e.id));

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
function boot(seed = 9) {
  const bus = { emit() {}, on() { return () => {}; } };
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_167);
  const N = snap.neighbors.length - 1;
  const to = (id) => provinceMap[id] || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    for (const nb of snap.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  const geom = {
    neighbors,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_167, events: EV,
    playerTag: 'HAS', rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_167, events: EV, provinceMap });
  // The royal century begins after the revolt: clear the opening war and put
  // the clock and the flags where the existing chain leaves them.
  game.wars = [];
  for (const t of Object.values(game.tags)) if (t) t.atWarWith = [];
  return { game, ctx, actions: gameActions(ctx) };
}
const pick = (ctx, ev, idx) => ev.options[idx].effects(ctx);
const asJannaeus = (o) => { o.game.date.y = -103; o.game.flags.jannaeusKing = true; return o; };
const asQueen = (o) => { o.game.date.y = -76; o.game.flags.queensPeace = true; return o; };
const mod = (t, id) => (t.modifiers || []).some((m) => m && m.id === id);

console.log('== §106: the century is on the calendar ==');
{
  ok(KINGS.length === 10, 'the royal century adds ' + KINGS.length + ' cards');
  for (const id of ['ev_k_asophon', 'ev_k_ananias', 'ev_k_gaza', 'ev_k_obodas',
    'ev_k_queen_and_priest', 'ev_k_simeon_ben_shetach', 'ev_k_queens_army',
    'ev_k_tigranes', 'ev_k_twenty_two_fortresses', 'ev_k_salome_dies']) {
    ok(!!byId(id), 'the chain carries ' + id);
  }
  const unbounded = KINGS.filter((e) => !Number.isFinite(e.minYear) || !Number.isFinite(e.maxYear));
  ok(!unbounded.length, 'every card carries an era window ('
    + (unbounded.map((e) => e.id).join(', ') || 'none') + ')');
  const both = KINGS.filter((e) => e.date && typeof e.trigger === 'function');
  ok(!both.length, 'and none carries both a date and a trigger');
  const noAi = KINGS.filter((e) => e.options.length > 1 && !Number.isFinite(e.aiOption)
    && typeof e.aiOption !== 'function');
  ok(!noAi.length, 'and every card pins its historical course');
  // The century belongs between the revolt and the brothers' war.
  const spanLo = Math.min(...KINGS.map((e) => e.minYear));
  const spanHi = Math.max(...KINGS.map((e) => e.maxYear));
  ok(spanLo === -103 && spanHi === -64,
    'the span runs ' + spanLo + ' to ' + spanHi + ' — Jannaeus\'s accession to Pompey\'s approach');
}

console.log('== §106: the wars of Jannaeus ==');
{
  const o = asJannaeus(boot());
  const { game, ctx } = o;
  const asophon = byId('ev_k_asophon');
  ok(asophon.trigger(ctx), 'Asophon waits on the new king, and he is on the throne');
  const mp = game.tags.HAS.manpower;
  pick(ctx, asophon, 0);
  ok(game.tags.HAS.manpower < mp && mod(game.tags.HAS, 'year_without_an_army'),
    'the battle costs the kingdom its army');
  ok((game.wars || []).some((w) => w && [].concat(w.attackers, w.defenders).includes('PTO')),
    'and puts a Ptolemaic host in the country');

  const ananias = byId('ev_k_ananias');
  game.date.y = -102; game.date.m = 4; // Cleopatra comes north the next spring
  ok(ananias.trigger(ctx), 'which is the world Cleopatra arrives in');
  pick(ctx, ananias, 0);
  ok(!!game.flags.ananiasSpoke
    && !(game.wars || []).some((w) => w && [].concat(w.attackers, w.defenders).includes('PTO')),
    'Ananias talks her out of it and the war ends');
  ok(mod(game.tags.HAS, 'alexandrian_understanding'),
    'and the diaspora that saved the kingdom is also a market');

  // The other branch: Egypt takes the country lying open.
  const b = asJannaeus(boot());
  pick(b.ctx, asophon, 0);
  b.game.date.y = -102; b.game.date.m = 4;
  pick(b.ctx, ananias, 1);
  ok(!!b.game.flags.egyptTookJudaea
    && (b.ctx.prov('Alexandria').modifiers || []).some((m) => m.id === 'the_jews_of_egypt'),
    'and overruling him costs Cleopatra her own capital\'s goodwill');
}
{
  const { game, ctx } = asJannaeus(boot());
  game.date.y = -96;
  const gaza = byId('ev_k_gaza');
  ok(gaza.trigger(ctx), 'Gaza is the last free city of the coast, and not yet ours');
  pick(ctx, gaza, 0);
  ok(ctx.prov('Gaza').owner === 'HAS'
    && (ctx.prov('Gaza').modifiers || []).some((m) => m.id === 'levelling_of_gaza'),
    'levelling it takes the city and ruins it');
  ok(!gaza.trigger(ctx), 'and the card does not offer itself twice');
  const b = asJannaeus(boot());
  b.game.date.y = -96;
  pick(b.ctx, gaza, 1);
  ok(b.ctx.prov('Gaza').owner === 'HAS' && mod(b.game.tags.HAS, 'incense_terminus')
    && !(b.ctx.prov('Gaza').modifiers || []).some((m) => m.id === 'levelling_of_gaza'),
    'keeping it takes the city and the caravan customs instead');
}
{
  const { game, ctx } = asJannaeus(boot());
  game.date.y = -93;
  const obodas = byId('ev_k_obodas');
  ok(!obodas.trigger(ctx), 'the ravines wait on the rising having already begun');
  game.flags.etrogimSpilled = true;
  ok(obodas.trigger(ctx), '...and fire once it has');
  pick(ctx, obodas, 0);
  ok(!!game.flags.obodasAmbush
    && (game.wars || []).some((w) => w && [].concat(w.attackers, w.defenders).includes('NAB')),
    'the ambush opens a Nabataean war');
  ok(Object.values(game.armies).some((a) => a && a.tag === 'REB'),
    'and puts the six-year rising in the field as a real host');
}

console.log('== §106: the queen ==');
{
  const o = asQueen(boot());
  const { game, ctx } = o;
  const qp = byId('ev_k_queen_and_priest');
  ok(qp.trigger(ctx), 'the queen reigns, and cannot stand at the altar');
  pick(ctx, qp, 0);
  ok(!!game.flags.officesDivided && mod(game.tags.HAS, 'offices_divided'),
    'so the offices divide — the dynasty\'s constitutional idea, undone as a convenience');
  ok(game.tags.HAS.heir && game.tags.HAS.heir.name === 'Hyrcanus II',
    'and the mitre goes to the elder son');
  const before = doctrineScores(ctx).authority;

  const simeon = byId('ev_k_simeon_ben_shetach');
  game.date.y = -75;
  ok(simeon.trigger(ctx), 'the elders come back to the chamber');
  pick(ctx, simeon, 0);
  ok(!!game.flags.schoolsFounded && mod(game.tags.HAS, 'schools_of_the_queen'),
    'the restoration founds the schools');
  ok(!!game.flags.theReckoning,
    'and the reckoning runs — which is where her younger son gets his party');
  const after = doctrineScores(ctx).authority;
  ok(after < before, 'the realm moves toward the chamber and away from the crown');

  game.date.y = -74;
  ok(byId('ev_k_queens_army').trigger(ctx), 'the establishment follows');
  pick(ctx, byId('ev_k_queens_army'), 0);
  ok(mod(game.tags.HAS, 'queens_establishment') && mod(game.tags.HAS, 'formidable_to_princes'),
    'nine years of peace, bought with the largest army the dynasty ever paid for');
}
{
  // The pardon branch is the one that changes 67.
  const { game, ctx } = asQueen(boot());
  pick(ctx, byId('ev_k_queen_and_priest'), 0);
  game.date.y = -75;
  pick(ctx, byId('ev_k_simeon_ben_shetach'), 1);
  ok(!!game.flags.counsellorsPardoned && !game.flags.theReckoning,
    'pardoning the counsellors keeps the old guard inside the state');
}
{
  const { game, ctx } = asQueen(boot());
  game.date.y = -69;
  const tig = byId('ev_k_tigranes');
  ok(!!tig.date && tig.date.y === -69 && tig.world === true,
    'Tigranes is a dated world event, not a trigger');
  ok(tig.when(ctx), 'and it fits a world with an Armenia in it');
  const t0 = game.tags.HAS.treasury;
  pick(ctx, tig, 0);
  ok(game.tags.HAS.treasury < t0 && !!game.flags.tigranesTurnedBack
    && mod(game.tags.ARM, 'lucullus_comes'),
    'presents and a Roman general a thousand miles away lift the siege');
  const b = asQueen(boot());
  b.game.date.y = -69;
  pick(b.ctx, tig, 1);
  ok(!!b.game.flags.stoodAtThePasses
    && (b.game.wars || []).some((w) => w && [].concat(w.attackers, w.defenders).includes('ARM')),
    'and standing at the passes is a real war with the largest army in the world');
}

console.log('== §106: and the door into 67 BCE ==');
{
  const { game, ctx } = asQueen(boot());
  game.date.y = -68;
  const forts = byId('ev_k_twenty_two_fortresses');
  ok(forts.trigger(ctx), 'the younger son leaves Jerusalem');
  pick(ctx, forts, 0);
  ok(!!game.flags.fortressesTaken && mod(game.tags.HAS, 'fortresses_are_his'),
    'and the queen\'s peace holds exactly as long as the queen does');

  game.date.y = -67;
  const dies = byId('ev_k_salome_dies');
  ok(dies.trigger(ctx), 'she dies in the ninth year');
  pick(ctx, dies, 0);
  ok(!!game.flags.brothersWar && mod(game.tags.HAS, 'war_of_the_brothers'),
    'the war of the brothers opens');
  ok(Object.values(game.armies).some((a) => a && a.tag === 'REB'
    && a.general && a.general.name === 'Aristobulus II'),
    'with Aristobulus in the field — which is the state the 67 BCE chapter opens in');
  ok(game.tags.HAS.ruler && game.tags.HAS.ruler.name === 'Hyrcanus II',
    'and his brother on the throne');
}
{
  // The council branch: the chamber she restored does what a council is for.
  const { game, ctx } = asQueen(boot());
  game.date.y = -68;
  pick(ctx, byId('ev_k_twenty_two_fortresses'), 1);
  ok(!!game.flags.fortressesHeld, 'or the dying queen takes the fortresses back');
  game.date.y = -67;
  pick(ctx, byId('ev_k_salome_dies'), 1);
  ok(!!game.flags.chamberSettled && !game.flags.brothersWar
    && !Object.values(game.armies).some((a) => a && a.tag === 'REB'
      && a.general && a.general.name === 'Aristobulus II'),
    'and the Chamber names a successor before the armies can — no brothers\' war');
}

console.log('== §106: the century survives a diverged map ==');
{
  // Every card resolves the crown at runtime, so a campaign that formed a
  // greater kingdom still gets its own royal century.
  const { game, ctx } = asJannaeus(boot());
  ok(byId('ev_k_asophon').trigger(ctx), 'the Hasmonean crown answers');
  const dead = asJannaeus(boot());
  dead.game.tags.HAS.alive = false;
  ok(!byId('ev_k_asophon').trigger(dead.ctx)
    && !byId('ev_k_salome_dies').trigger(dead.ctx),
    'and with no crown in Jerusalem at all, the century retires instead of narrating');
}

console.log('== §108: occupation is not possession ==');
{
  // The reported bug: "Damascus, Which David Took" and "The Gates of the Sea"
  // fired while those cities were merely OCCUPIED in an unsettled war, and
  // uti possidetis could hand them straight back at the peace table.
  const STRAND = ['ev_hammer_beyond_hills', 'ev_damascus_of_david', 'ev_gates_of_the_sea',
    'ev_border_of_philistines', 'ev_cities_of_the_nations', 'ev_yoke_reversed',
    'ev_diadem_in_dust'];
  for (const id of STRAND) ok(!!byId(id), 'the greater-kingdom strand carries ' + id);

  const occupy = (ctx, names, tag) => {
    for (const n of names) {
      const p = ctx.prov(n);
      if (p) { p.controller = tag; }        // an army stands there; the deed has not moved
    }
  };
  const annex = (ctx, names, tag) => {
    for (const n of names) {
      const p = ctx.prov(n);
      if (p) { p.owner = tag; p.controller = tag; }
    }
  };

  // Jerusalem itself: the bookmark opens with it OWNED BY THE SELEUCIDS, so
  // the strand's own gate used to open the moment a column held the city.
  {
    const { ctx } = boot();
    ok(ctx.prov('Jerusalem').owner === 'SEL',
      'Jerusalem opens the chapter under Seleucid ownership — the Akra is a royal garrison');
    occupy(ctx, ['Jerusalem'], 'HAS');
    occupy(ctx, ['Damascus', 'Tyre', 'Sidon'], 'HAS');
    for (const id of ['ev_damascus_of_david', 'ev_gates_of_the_sea', 'ev_hammer_beyond_hills']) {
      ok(!byId(id).trigger(ctx), id + ' does not fire on an occupation');
    }
  }
  // ...and the same map, settled.
  {
    const { ctx } = boot();
    annex(ctx, ['Jerusalem', 'Damascus', 'Tyre', 'Sidon'], 'HAS');
    for (const id of ['ev_damascus_of_david', 'ev_gates_of_the_sea', 'ev_hammer_beyond_hills']) {
      ok(byId(id).trigger(ctx), id + ' fires once the cities are actually ours');
    }
  }
  // Owned but occupied by somebody else is not possession either.
  {
    const { ctx } = boot();
    annex(ctx, ['Jerusalem', 'Damascus'], 'HAS');
    ctx.prov('Damascus').controller = 'SEL'; // the deed is ours; the city is not
    ok(!byId('ev_damascus_of_david').trigger(ctx),
      'nor does it fire on a province we own and an enemy is sitting in');
  }
  // The counted strands move together.
  {
    const { ctx } = boot();
    annex(ctx, ['Jerusalem'], 'HAS');
    occupy(ctx, ['Joppa', 'Azotus', 'Ascalon', 'Gaza'], 'HAS');
    ok(!byId('ev_border_of_philistines').trigger(ctx),
      'the Philistine coast is not claimed by occupying it');
    annex(ctx, ['Joppa', 'Azotus', 'Ascalon', 'Gaza'], 'HAS');
    ok(byId('ev_border_of_philistines').trigger(ctx), '...and is once it is annexed');
  }
  // The royal century's own siege card asks the same question.
  {
    const { ctx, game } = asJannaeus(boot());
    game.date.y = -96;
    const gaza = byId('ev_k_gaza');
    ok(gaza.trigger(ctx), 'Gaza is not ours, so the siege card offers itself');
    occupy(ctx, ['Gaza'], 'HAS');
    ok(gaza.trigger(ctx),
      'occupying Gaza does not count as having taken it — the card still stands');
    annex(ctx, ['Gaza'], 'HAS');
    ok(!gaza.trigger(ctx), 'owning it retires the card');
  }
  // A campaign check that legitimately means "our army is here" is untouched.
  {
    const { ctx } = boot();
    occupy(ctx, ['Emmaus'], 'HAS');
    ok(ctx.helpers.controls(ctx, 'HAS', 'Emmaus'),
      'and the revolt-era checks that really do mean control still mean it');
  }
}

console.log(failures ? `smoke76: ${failures} FAIL` : 'smoke76: ALL PASS');
process.exit(failures ? 1 : 0);
