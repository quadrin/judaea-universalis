// Headless regression — SPEC §135: a greater crown is a new name, not a new
// country.
//
// Every chapter in this game is written against the three letters its bookmark
// shipped with. `greaterVictory` asks whether HAS holds Jerusalem; the sovereign
// road of 67 asks whether the player is HYR or ARI; the Second Kingdom asks
// after JUD. And every one of those chapters ALSO offers the player a greater
// crown — Restore Hasmonean Judaea, Proclaim the Kingdom of Israel — which runs
// switchTagCore, deletes the old tag, and files the whole realm under a new one.
//
// So the reward for playing a chapter well was the chapter going quiet. Measured
// against the live chains, taking the crown cost the player twenty-two cards in
// 167 (the entire royal century — Jannaeus at Gaza, at Asophon, Medaba, Samaria,
// the twenty-two fortresses; the Akra; the bronze tablets; Gerizim; the Idumea
// policy), eighteen in 66 (the whole Second Kingdom road, including the card
// that opens it), thirteen in 132 (including `ev2_era_of_redemption`, the entry
// to the best outcome in the game) and seven in 614. Nothing warned anybody:
// the cards are all still listed in the Compendium, and a player who reads them
// there and then goes and earns them gets silence.
//
// The fix is one lookup — `livingTag` — plus the discipline of routing every
// tag a card names through it: the engine's audience and decider match, the
// helpers content calls, and the predicates content keeps for itself.
//
// FOUR THINGS.
//   1. The forwarding address itself: chains collapse, revivals clear, a tag
//      that merely DIED is not forwarded anywhere.
//   2. A card addressed to the old name reaches the player wearing the new one.
//   3. The chapter predicates that gate whole strands still answer yes.
//   4. The end-to-end claim: play 167 forward twice from the same seed, once
//      taking the crown and once not, and the crown costs nothing.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions, simHelpers, reviveGame } = await import(R + '/js/sim/init.js');
const { livingTag, switchTagCore } = await import(R + '/js/sim/military.js');
const { fireEvent } = await import(R + '/js/sim/events.js');
const { tickDay } = await import(R + '/js/sim/tick.js');

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
const era = (id) => ERAS.find((e) => e.bookmark.id === id);

function boot(id, tag, { geom = flatGeom, seed = 4, bus } = {}) {
  const e = era(id);
  const provinceMap = buildProvinceMapping(MAP_DATA, e.bookmark);
  const events = e.events;
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: e.bookmark, events,
    playerTag: tag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus: bus || { emit() {}, on() { return () => {}; } },
    bookmark: e.bookmark, events, provinceMap,
  });
  return { game, ctx, events, bookmark: e.bookmark };
}
const card = (id, evId) => (era(id).events.find((e) => e && e.id === evId) || null);

// ---------------------------------------------------------------------------
console.log('== the forwarding address ==');
{
  const w = boot('167bce', 'HAS');
  ok(livingTag(w.ctx, 'HAS') === 'HAS', 'a living tag answers for itself');
  ok(livingTag(w.ctx, 'ZZZ') === 'ZZZ', 'a tag nobody ever had is returned unchanged');

  ok(switchTagCore(w.ctx, 'HAS', 'MLI') === true, 'the Kingdom of Israel is proclaimed');
  ok(!w.game.tags.HAS && !!w.game.tags.MLI, '  and the old banner is gone from the roster');
  ok(w.game.playerTag === 'MLI', '  the player is sitting in the new chair');
  ok(livingTag(w.ctx, 'HAS') === 'MLI', 'HAS now forwards to MLI');
  ok((w.game.tagAliases || {}).HAS === 'MLI', '  and the address is on the save-able state');

  // A tag that simply died is NOT forwarded — content must still see it dead.
  w.game.tags.SEL.alive = false;
  ok(livingTag(w.ctx, 'SEL') === 'SEL', 'a conquered court is not forwarded to anyone');

  // A save written before any of this existed still has `lineage` on the
  // formed tag, so the table rebuilds exactly and an in-progress campaign gets
  // its chapter back on load rather than on a new game.
  const stale = JSON.parse(JSON.stringify(w.game));
  delete stale.tagAliases;
  const revived = reviveGame(stale);
  ok(!!revived && revived.tagAliases && revived.tagAliases.HAS === 'MLI',
    'a pre-§135 save rebuilds its forwarding table from the lineage');
  ok(!revived.tagAliases.SEL, '  and does not invent one for a court that merely died');
}
{
  // Chains collapse as they form: HYR → HAS → MLI leaves both pointing at MLI,
  // so the lookup is one hop no matter how many crowns a campaign takes.
  const w = boot('67bce', 'HYR');
  switchTagCore(w.ctx, 'HYR', 'HAS');
  switchTagCore(w.ctx, 'HAS', 'MLI');
  ok(livingTag(w.ctx, 'HYR') === 'MLI', 'a two-step chain forwards straight to the end (HYR→MLI)');
  ok(livingTag(w.ctx, 'HAS') === 'MLI', '  and so does its middle (HAS→MLI)');
  ok(w.game.tagAliases.HYR === 'MLI' && w.game.tagAliases.HAS === 'MLI',
    '  with no chain left on the state to walk');
}
{
  // A banner content revives later is itself again, not its own successor.
  const w = boot('40bce', 'ATG');
  switchTagCore(w.ctx, 'ATG', 'HAS');
  ok(livingTag(w.ctx, 'ATG') === 'HAS', 'Antigonus restores the Hasmonean name');
  ok(w.game.tagAliases.HAS === undefined, '  and the revived banner keeps no stale address');
}

// ---------------------------------------------------------------------------
console.log('== a card addressed to the old name reaches the new court ==');
{
  const seen = [];
  const bus = { emit(k, p) { if (k === 'event') seen.push(p); }, on() { return () => {}; } };
  const w = boot('167bce', 'HAS', { bus });
  switchTagCore(w.ctx, 'HAS', 'MLI');
  const ev = card('167bce', 'ev_hammer_beyond_hills'); // forTag: 'HAS'
  ok(!!ev && ev.forTag === 'HAS', 'the Hammer Beyond the Hills is addressed to HAS');
  fireEvent(w.ctx, ev);
  ok(seen.length === 1 && seen[0].event.id === ev.id,
    '  and a player flying the Kingdom of Israel is still shown it');
  ok(w.game.pendingEvents.length === 1 && w.game.pendingEvents[0].forTag === 'MLI',
    '  as their own card, not a foreign court\'s notice');
}
{
  // The decider notice (§70) resolves through the same address, so a chapter
  // that hands a choice to HAS does not hand it to nobody.
  const seen = [];
  const bus = { emit(k, p) { if (k === 'event') seen.push(p); }, on() { return () => {}; } };
  const w = boot('167bce', 'SEL', { bus });
  switchTagCore(w.ctx, 'HAS', 'MLI');
  const ev = card('167bce', 'ev_rededication'); // forTag 'both', decider 'HAS'
  ok(!!ev && ev.decider === 'HAS', 'the Dedication of the Altar is the Hasmonean court\'s call');
  fireEvent(w.ctx, ev);
  ok(seen.length === 1 && seen[0].notice === true && seen[0].decider === 'MLI',
    '  and a Seleucid player is notified of the Kingdom of Israel\'s course, not of nothing');
}

// ---------------------------------------------------------------------------
console.log('== the helpers content calls follow the crown ==');
{
  const w = boot('167bce', 'HAS');
  const jer = w.ctx.prov('Jerusalem');
  jer.owner = 'HAS'; jer.controller = 'HAS';
  switchTagCore(w.ctx, 'HAS', 'MLI');
  ok(jer.owner === 'MLI', 'the city is filed under the new banner');
  ok(simHelpers.controls(w.ctx, 'HAS', 'Jerusalem') === true,
    'controls(HAS) still answers for the city we are standing in');
  ok(simHelpers.countControlled(w.ctx, 'HAS', {}) >= 1, 'countControlled(HAS) counts the realm');
  const before = w.game.tags.MLI.treasury;
  simHelpers.adjust(w.ctx, 'HAS', { treasury: 50 });
  ok(w.game.tags.MLI.treasury === before + 50, 'adjust(HAS) pays the court that exists');
  simHelpers.addTagModifier(w.ctx, 'HAS', { id: 'tt', name: 'T', months: 6, effects: {} });
  ok((w.game.tags.MLI.modifiers || []).some((m) => m.id === 'tt'),
    'addTagModifier(HAS) lands on the Kingdom of Israel');
  ok(simHelpers.livingTag(w.ctx, 'HAS') === 'MLI', 'and the address is on the frozen helper contract');
}

// ---------------------------------------------------------------------------
console.log('== the strand gates that a crown used to close ==');
{
  // 167: the greater victory — the cards about conquering past every border
  // the chronicles record. Its gate asks whether HAS owns Jerusalem.
  const w = boot('167bce', 'HAS');
  for (const n of ['Jerusalem', 'Damascus']) {
    const p = w.ctx.prov(n);
    p.owner = 'HAS'; p.controller = 'HAS';
  }
  const hammer = card('167bce', 'ev_hammer_beyond_hills');
  ok(hammer.trigger(w.ctx) === true, '167: the Hammer fires for a Judaea in Coele-Syria');
  switchTagCore(w.ctx, 'HAS', 'MLI');
  ok(hammer.trigger(w.ctx) === true, '  and goes on firing after the Kingdom of Israel is proclaimed');
}
{
  // 67: the sovereign road — six cards about the Roman civil wars, gated on
  // the player being one of the brothers. Restoring the Hasmonean kingdom is
  // the chapter's own reward and used to close every one of them.
  const w = boot('67bce', 'HYR');
  w.game.date = { y: -35, m: 6, d: 1 };
  w.game.flags.pompeyCame = true;
  const jer = w.ctx.prov('Jerusalem');
  jer.owner = 'HYR'; jer.controller = 'HYR';
  w.game.tags.ARI.alive = false;
  for (let i = 1; i < w.game.provinces.length; i++) {
    const p = w.game.provinces[i];
    if (p && p.owner === 'ROM') { p.owner = 'PTO'; p.controller = 'PTO'; }
  }
  const renamed = card('67bce', 'ev4_v_never_renamed');
  ok(renamed.trigger(w.ctx) === true, '67: the Kingdom They Never Renamed fires for Hyrcanus');
  switchTagCore(w.ctx, 'HYR', 'HAS');
  ok(renamed.trigger(w.ctx) === true, '  and still fires once the Hasmonean crown is restored');
  const choice = card('67bce', 'ev4_v_caesar_or_pompey');
  w.game.date = { y: -45, m: 6, d: 1 };
  ok(choice.trigger(w.ctx) === true,
    '  as does the Sovereign\'s Choice between Caesar and Pompey');
}
{
  // 66: the Second Kingdom. 132: the redemption. Both gate on JUD.
  const w = boot('66ce', 'JUD');
  const jer = w.ctx.prov('Jerusalem');
  jer.owner = 'JUD'; jer.controller = 'JUD';
  w.game.wars = [];
  for (const k of Object.keys(w.game.tags)) w.game.tags[k].atWarWith = [];
  const stood = card('66ce', 'ev_house_that_stood');
  const beforeCrown = stood.trigger(w.ctx);
  switchTagCore(w.ctx, 'JUD', 'MLI');
  ok(stood.trigger(w.ctx) === beforeCrown,
    '66: the House That Stood reads the same world under either banner');
}

// ---------------------------------------------------------------------------
console.log('== 1948 is the exception, and stays it ==');
{
  // The modern chapter is ABOUT which banner is flying: Cairo becomes the
  // United Arab Republic and back, Damascus leaves it as the Syrian Arab
  // Republic, and `syrOwn` excludes the union on purpose. A forwarding `alive`
  // there would make `alive('UAR')` true after the union came apart, so those
  // packages keep the raw question and resolve their cast by name (§105).
  const w = boot('1948ce', 'ISR');
  switchTagCore(w.ctx, 'EGY', 'UAR');
  const card48 = (evId) => era('1948ce').events.find((e) => e && e.id === evId);
  const union = card48('ev_i_union_endures');
  ok(!!union && typeof union.when === 'function', 'the union-endures card reads the world');
  ok(union.when(w.ctx) !== undefined, '  and does not throw with Egypt inside the union');
  // The union comes apart again: the address collapses rather than chaining.
  switchTagCore(w.ctx, 'UAR', 'EGY');
  ok(livingTag(w.ctx, 'UAR') === 'EGY', 'the union forwards to Egypt once it is dissolved');
  ok(livingTag(w.ctx, 'EGY') === 'EGY', '  and Egypt answers for itself again');
  ok(!!w.game.tags.EGY && !w.game.tags.UAR,
    '  with only one of the two banners on the roster');
}

// ---------------------------------------------------------------------------
console.log('== end to end: the crown costs the chapter nothing ==');
{
  // The real map, the real chain, 167 played to the year the chapter ends —
  // once taking the Kingdom of Israel the month it is offered, once never
  // taking it. Same seed, same grant of conquests. The measurement that found
  // this bug: before the fix the crowned run was twenty-two scripted cards
  // short. It is allowed to drift by a card or two (a renamed realm is a
  // different realm to the AI), never by a strand.
  const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
  const raw = {
    neighbors: snap.neighbors.map((a) => new Set(a)),
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
  const fold = (mapping) => {
    const M = raw.neighbors.length - 1;
    const to = (id) => (mapping && mapping[id]) || id;
    const neighbors = Array.from({ length: M + 1 }, () => new Set());
    const areas = new Int32Array(M + 1);
    const coastal = new Array(M + 1).fill(false);
    const centroids = raw.centroids.slice();
    const offshore = raw.offshore.slice();
    for (let id = 1; id <= M; id++) {
      const t = to(id);
      areas[t] += raw.areas[id];
      if (raw.coastal[id]) coastal[t] = true;
      if (!offshore[t] && raw.offshore[id]) offshore[t] = raw.offshore[id];
      for (const nb of raw.neighbors[id]) {
        const tn = to(nb);
        if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
      }
    }
    for (let id = 1; id <= M; id++) {
      if (to(id) !== id) { centroids[id] = centroids[to(id)]; offshore[id] = offshore[to(id)]; }
    }
    return { neighbors, centroids, areas, coastal, offshore, bbox: [] };
  };
  const GRANT = ['Jerusalem', 'Hebron', 'Adora', 'Emmaus', 'Sebaste', 'Neapolis', 'Engaddi',
    'Sepphoris', 'Tiberias', 'Joppa', 'Azotus', 'Ascalon', 'Gaza', 'Jamnia', 'Ptolemais', 'Dora',
    'Scythopolis', 'Gadara', 'Pella', 'Gerasa', 'Philadelphia', 'Damascus', 'Tyre', 'Sidon',
    'Berytus', 'Chalcis', 'Jericho', 'Gischala'];

  function play(takeTheCrown) {
    const e = era('167bce');
    const provinceMap = buildProvinceMapping(MAP_DATA, e.bookmark);
    const geom = fold(provinceMap);
    const w = boot('167bce', 'HAS', { geom, seed: 1234567 });
    // initGame needs the real geometry, so rebuild through boot's own path.
    const acts = gameActions(w.ctx);
    w.game.tags.HAS.ai = true; // the world runs itself; only the crown is our variable
    w.game.paused = false;
    let granted = false; let crowned = null;
    while (w.game.date.y <= 6) {
      tickDay(w.ctx);
      if (!granted && w.game.date.y >= -161) {
        granted = true;
        for (const n of GRANT) {
          const p = w.ctx.prov(n);
          if (!p || p.impassable) continue;
          p.owner = w.game.playerTag; p.controller = w.game.playerTag; p.siege = null;
        }
        w.game.tags[w.game.playerTag].stability = 3;
        w.game.tags[w.game.playerTag].legitimacy = 100;
        // SPEC §138 gates the crown of Israel on a son of David. This suite is
        // about what taking a crown COSTS a chapter, not about how a court
        // qualifies for one, so the qualification is granted outright — §138's
        // own suite owns the dynastic arc.
        w.game.flags.davidicThrone = true;
      }
      let guard = 0;
      while (w.game.pendingEvents.length && guard++ < 50) {
        const pe = w.game.pendingEvents[0];
        const ev = e.events.find((x) => x && x.id === pe.eventId);
        let idx = 0;
        try {
          idx = typeof (ev && ev.aiOption) === 'function' ? (ev.aiOption(w.ctx) | 0) : ((ev && ev.aiOption) | 0);
        } catch (err) { idx = 0; }
        try { acts.chooseEventOption(pe.instanceId, idx); } catch (err) { w.game.pendingEvents.shift(); }
        w.game.paused = false;
      }
      if (w.game.paused) w.game.paused = false;
      if (w.game.over) w.game.over = false;
      if (takeTheCrown && !crowned && granted) {
        // The Kingdom of Israel specifically, not "the first crown on offer".
        // §226 put nine more `form_` decisions in this panel — the ten
        // constitutional crowns — and two of them are formable out of HAS on
        // far easier terms than MLI's, so a run told to take any crown took
        // the Priest-Kingdom in the 90s BCE and never reached the one this
        // suite is measuring.
        const d = (acts.getDecisions() || []).find((x) => String(x.key).indexOf('form_mli_') === 0 && x.canEnact);
        if (d) { acts.enactDecision(d.key); crowned = w.game.playerTag; }
      }
    }
    return { fired: new Set(Object.keys(w.game.firedEvents)), crowned };
  }

  const plain = play(false);
  const crowned = play(true);
  ok(crowned.crowned === 'MLI', 'the crowned run really did proclaim the Kingdom of Israel');
  const scripted = (id) => !/^dyn_/.test(id);
  const lost = [...plain.fired].filter((id) => !crowned.fired.has(id) && scripted(id));
  ok(lost.length <= 2,
    'taking the crown costs at most a card of seeded drift, not a strand ('
      + lost.length + (lost.length ? ': ' + lost.join(', ') : '') + ')');
  const ROYAL = ['ev_k_asophon', 'ev_k_obodas', 'ev_k_twenty_two_fortresses', 'ev_k_queen_and_priest',
    'ev_k_salome_dies', 'ev_akra_falls', 'ev_bronze_tablets', 'ev_gerizim', 'ev_idumea_policy',
    'ev_samaria_falls', 'ev_medaba_campaign'];
  const missing = ROYAL.filter((id) => plain.fired.has(id) && !crowned.fired.has(id));
  ok(missing.length === 0,
    'the royal century survives the proclamation' + (missing.length ? ' (lost ' + missing.join(', ') + ')' : ''));
}

console.log(failures ? `smoke90: ${failures} FAIL` : 'smoke90: ALL PASS');
process.exit(failures ? 1 : 0);
