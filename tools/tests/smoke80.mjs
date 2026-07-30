// Headless regression — SPEC §113: the Levant without a Lebanon.
//
// The 1948 chapter's whole northern arc — nine major world cards, the Cairo
// Agreement through the Mire — is guarded `when: alive(LEB)`. That guard is
// correct: a state that does not exist cannot have its confessional settlement
// collapse. But `when` RETIRES a card rather than holding it, so an Israel that
// took Beirut before 1969 deleted fifty years of the region's history and got
// nothing whatever in its place — silence, in the loudest corner of the map.
//
// This suite pins both halves of the fix: the new arc fires when Lebanon is
// gone, and it stays out of a campaign where Lebanon lives, where the original
// nine cards must still run untouched. A branch that fired in both would be
// worse than the hole it was written for.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { EVENTS_1948_LEVANT } = await import(R + '/js/data/events_1948_levant.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const EV = (ERAS.find((e) => e.bookmark.id === '1948ce') || {}).events || [];
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const LEBANON = ['Tripolis', 'Byblos', 'Berytus', 'Chalcis', 'Sidon', 'Tyre',
  'Gischala', 'Jotapata', 'Sepphoris'];
const HISTORICAL_ARC = ['ev_i_cairo_agreement', 'ev_i_lebanon_civil_war',
  'ev_i_syrian_intervention', 'ev_i_litani', 'ev_i_peace_for_galilee',
  'ev_i_sabra_shatila', 'ev_i_hezbollah', 'ev_i_barracks', 'ev_i_the_mire'];

function boot(seed = 5) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
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
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_1948, events: EV, playerTag: 'ISR', rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: EV, provinceMap });
  return { game, ctx, actions: gameActions(ctx) };
}

// Play the chapter out and report which of the two northern arcs ran.
function play(annexLebanon, years = 54) {
  const o = boot();
  const { game, ctx, actions } = o;
  game.tags.ISR.ai = true;
  game.paused = false;
  if (annexLebanon) {
    for (let i = 1; i < game.provinces.length; i++) {
      const p = game.provinces[i];
      if (p && !p.impassable && p.owner === 'LEB') { p.owner = 'ISR'; p.controller = 'ISR'; }
    }
    // Annexed means annexed. The bookmark's own setup has already enrolled
    // Lebanon in the War of Independence and given it a host, so clearing the
    // provinces and flipping `alive` left a landless belligerent still in the
    // war with an army in the field — and this scenario only ever held
    // because Israel happened to finish the job before 2002. That made a
    // content-gating test a hostage to combat balance: SPEC §154 made air
    // power decisive, the AI war went the other way, and six assertions about
    // which EVENTS fire started failing for reasons that had nothing to do
    // with events. Take the army and the war away too, and the premise is the
    // thing the section is actually about.
    for (const id of Object.keys(game.armies || {})) {
      if (game.armies[id] && game.armies[id].tag === 'LEB') delete game.armies[id];
    }
    for (const w of game.wars || []) {
      w.attackers = (w.attackers || []).filter((t) => t !== 'LEB');
      w.defenders = (w.defenders || []).filter((t) => t !== 'LEB');
    }
    for (const t of Object.values(game.tags)) {
      if (t && Array.isArray(t.atWarWith)) t.atWarWith = t.atWarWith.filter((x) => x !== 'LEB');
    }
    game.tags.LEB.atWarWith = [];
    game.tags.LEB.alive = false;
  }
  const fired = new Set();
  for (let y = 0; y < years; y++) for (let d = 0; d < 360; d++) {
    tickDay(ctx);
    let guard = 0;
    while (game.pendingEvents.length && guard++ < 50) {
      const pe = game.pendingEvents[0];
      const e = EV.find((x) => x && x.id === pe.eventId);
      fired.add(pe.eventId);
      try { actions.chooseEventOption(pe.instanceId, (e && e.aiOption) || 0); }
      catch (err) { game.pendingEvents.shift(); }
      game.paused = false;
    }
    if (game.paused) game.paused = false;
    if (game.over) game.over = false;
  }
  return { fired, game, ctx };
}

console.log('== §113: the package is wired and well-formed ==');
{
  ok(EVENTS_1948_LEVANT.length >= 5,
    'the alternate arc has ' + EVENTS_1948_LEVANT.length + ' cards');
  const inChain = EVENTS_1948_LEVANT.filter((e) => EV.some((x) => x && x.id === e.id));
  ok(inChain.length === EVENTS_1948_LEVANT.length,
    'and every one of them is in the 1948 chain the engine plays');
  ok(EVENTS_1948_LEVANT.every((e) => e.world === true),
    'all of them are world notices — the region is not the player\'s private business');
  ok(EVENTS_1948_LEVANT.every((e) => !!e.when),
    'and every one is guarded, so none can fire in a campaign where Lebanon lives');
  ok(EVENTS_1948_LEVANT.every((e) => !(e.date && e.trigger)),
    'none is both a date and a trigger');
  const years = EVENTS_1948_LEVANT.map((e) => e.date && e.date.y).filter(Boolean);
  ok(Math.min(...years) <= 1971 && Math.max(...years) >= 2000,
    'and they span ' + Math.min(...years) + '–' + Math.max(...years)
    + ', the same fifty years the guard was deleting');
}

console.log('== §113: Lebanon lives — the historical arc runs, the alternate stays out ==');
{
  const { fired, game } = play(false);
  ok(game.tags.LEB.alive !== false, 'Lebanon survives the campaign');
  const ran = HISTORICAL_ARC.filter((id) => fired.has(id));
  ok(ran.length >= 8, 'the historical northern arc runs (' + ran.length + '/'
    + HISTORICAL_ARC.length + ' cards)');
  const intruders = EVENTS_1948_LEVANT.map((e) => e.id).filter((id) => fired.has(id));
  ok(!intruders.length, 'and not one alternate card fires beside it ('
    + (intruders.join(', ') || 'none') + ')');
}

console.log('== §113: Lebanon annexed — the alternate arc runs instead ==');
{
  const { fired, game, ctx } = play(true);
  ok(game.tags.LEB.alive === false, 'Lebanon is gone from the map');
  const ran = EVENTS_1948_LEVANT.map((e) => e.id).filter((id) => fired.has(id));
  ok(ran.length === EVENTS_1948_LEVANT.length,
    'every card of the alternate arc fires (' + ran.length + '/'
    + EVENTS_1948_LEVANT.length + ')');
  const ghosts = HISTORICAL_ARC.filter((id) => fired.has(id));
  ok(!ghosts.length, 'and the arc about a Lebanese state stays silent ('
    + (ghosts.join(', ') || 'none') + ')');
  // The whole point: the north is still loud, and loud at the occupier.
  ok(!!game.flags.noLebanonArc, 'the chapter records that it took this road');
  ok(!!game.flags.hezbollah,
    'the Guard reaches the Beqaa anyway — the occupation produces the adversary');
  ok(!!game.flags.northernQuestionClosed,
    'and the century closes on the northern question rather than on silence');
  const isr = game.tags.ISR;
  const carried = (isr.modifiers || []).map((m) => m && m.id);
  ok(carried.some((id) => /attrition_in_the_south|the_long_north|northern_question/.test(id || '')),
    'the occupier is carrying what it cost (' + carried.filter(Boolean).join(', ') + ')');
}

console.log('== §113: the arc needs a real occupation, not a border adjustment ==');
{
  // `occupier` requires four of the nine provinces. A state that took Tyre in a
  // border war has not inherited Lebanon's arithmetic and must not be handed
  // its cards.
  const { game, ctx } = boot();
  const ev = EVENTS_1948_LEVANT.find((e) => e.id === 'ev_l_nowhere_to_regroup');
  game.tags.LEB.alive = false;
  for (const n of LEBANON) {
    const p = ctx.prov(n);
    if (p) { p.owner = 'REB'; p.controller = 'REB'; }
  }
  const tyre = ctx.prov('Tyre');
  tyre.owner = 'ISR'; tyre.controller = 'ISR';
  ok(!ev.when(ctx), 'one province is a border adjustment, not the possession of a country');
  for (const n of ['Sidon', 'Berytus', 'Chalcis']) {
    const p = ctx.prov(n);
    if (p) { p.owner = 'ISR'; p.controller = 'ISR'; }
  }
  ok(ev.when(ctx), 'four of the nine is an occupation, and the arc opens');
  game.tags.LEB.alive = true;
  ok(!ev.when(ctx), 'and a living Lebanon closes it again however much ground is held');
}

console.log(failures ? `smoke80: ${failures} FAIL` : 'smoke80: ALL PASS');
process.exit(failures ? 1 : 0);
