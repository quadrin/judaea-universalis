// Headless regression — SPEC §130–§131: the settlement, the store, the line.
//
// THREE THINGS.
//
// §130a. Winning the Great Revolt ended the chapter's argument. It should
// start one: Ananus' provisional government of 66 was destroyed by the Zealots
// eighteen months later, and a Judaea that WINS has the same three parties in
// the same walls with Rome no longer available as the thing they agree about.
// Four settlements, each of them something somebody in Jerusalem actually did,
// and which ones are offered depends on who is strong when the war ends —
// which needs the engine to be able to READ a faction and not only push one.
//
// §130b. A decision that steers sixty years of content cannot live in a
// scatter of booleans. It is stored once, by name, and it is write-once: a
// constitution that can be silently replaced is not a constitution.
//
// §131. The 1949 armistice line, which §125 got wrong in both directions — it
// gave back eight hill towns and forgot the Jerusalem corridor, leaving the
// capital an island, and it ignored the entire Negev, which is where the line
// actually runs from Beersheba to Eilat.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, simHelpers } = await import(R + '/js/sim/init.js');
const { checkTriggeredEvents, allowedOptions } = await import(R + '/js/sim/events.js');
const { ensureFactions, shiftFaction } = await import(R + '/js/sim/factions.js');

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
const EV66 = (ERAS.find((e) => e.bookmark.id === '66ce') || {}).events || [];
const EV48 = (ERAS.find((e) => e.bookmark.id === '1948ce') || {}).events || [];
const C66 = (id) => EV66.find((e) => e && e.id === id);
const C48 = (id) => EV48.find((e) => e && e.id === id);

function boot(bm, events, tag, y, opts = {}) {
  const provinceMap = buildProvinceMapping(MAP_DATA, bm);
  const game = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: bm, events,
    playerTag: tag, rngSeed: 4, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: bm, events, provinceMap,
  });
  game.date = { y, m: 6, d: 1 };
  game.wars = [];
  for (const k of Object.keys(game.tags)) game.tags[k].atWarWith = [];
  const t = game.tags[tag];
  t.alive = true; t.ai = false; t.overlord = null;
  Object.assign(game.flags, opts.flags || {});
  return { game, ctx };
}

// A Judaea that won: sovereign, in Jerusalem, the House standing, at peace,
// with a court whose parties can be set to whatever the case needs.
function won(parties = {}, y = 75) {
  const w = boot(BOOKMARK_66, EV66, 'JUD', y, { flags: { secondKingdom: true } });
  const jer = w.ctx.prov('Jerusalem');
  if (jer) { jer.owner = 'JUD'; jer.controller = 'JUD'; }
  ensureFactions(w.ctx, 'JUD');
  w.game.tags.JUD.factions = Object.assign(
    { zealots: 50, notables: 50, priesthood: 50 }, parties);
  return w;
}

console.log('== §130: the engine can read a faction, not only push one ==');
{
  const w = won({ zealots: 72 });
  ok(typeof simHelpers.faction === 'function' && typeof simHelpers.factionAtLeast === 'function',
    'the helpers exist');
  ok(simHelpers.faction(w.ctx, 'JUD', 'zealots') === 72,
    'and read what is actually there (' + simHelpers.faction(w.ctx, 'JUD', 'zealots') + ')');
  ok(simHelpers.factionAtLeast(w.ctx, 'JUD', 'zealots', 70) === true,
    'the threshold form says yes above the line');
  ok(simHelpers.factionAtLeast(w.ctx, 'JUD', 'zealots', 80) === false, '  and no below it');
  // A push and a read agree, which is the only thing that makes gates honest.
  shiftFaction(w.ctx, 'JUD', 'zealots', -30);
  ok(simHelpers.faction(w.ctx, 'JUD', 'zealots') === 42,
    'a shift is visible to the read (' + simHelpers.faction(w.ctx, 'JUD', 'zealots') + ')');
  // No court, no answer — and no misleading 50.
  const ai = won({ zealots: 90 });
  ai.game.tags.JUD.ai = true;
  ok(simHelpers.faction(ai.ctx, 'JUD', 'zealots') === null,
    'an AI realm holds no court and reads null rather than a number');
  ok(simHelpers.factionAtLeast(ai.ctx, 'JUD', 'zealots', 10) === false,
    '  and every gate on it is closed rather than crashing');
}

console.log('== §130: the settlement is produced by the room, not picked from a menu ==');
{
  const card = C66('ev_s_the_second_government');
  ok(!!card, 'the second government is asked of a victorious Judaea');
  ok(card.options.length === 4, '  with four settlements (' + card.options.length + ')');
  ok(typeof card.options[0].when !== 'function',
    '  the temple-state always available: an exhausted elite reaches for what worked');

  const CASES = [
    ['a court with no radical party', { zealots: 30 }, ['temple']],
    ['zealots strong', { zealots: 65, notables: 60, priesthood: 60 }, ['temple', 'lot']],
    ['zealots strong and the men of property broken', { zealots: 65, notables: 20, priesthood: 60 },
      ['temple', 'lot', 'jubilee']],
    ['nobody left to institute anything', { zealots: 80, notables: 15, priesthood: 15 },
      ['temple', 'lot', 'jubilee', 'noruler']],
  ];
  for (const [label, parties, expect] of CASES) {
    const w = won(parties);
    const mask = allowedOptions(w.ctx, card) || card.options.map((_, i) => i);
    ok(mask.length === expect.length,
      label + ': ' + mask.length + ' settlement(s) on the table, expected ' + expect.length);
    ok(mask.indexOf(0) >= 0, '  and the temple-state is one of them');
  }

  // The gate is real in both directions: the Jubilee needs the notables weak,
  // because it is their ledgers that burn.
  const rich = won({ zealots: 80, notables: 70, priesthood: 15 });
  const mask = allowedOptions(rich.ctx, card) || card.options.map((_, i) => i);
  ok(mask.indexOf(2) < 0,
    'a strong Peace Party keeps the Jubilee off the table, which is what a credit class is for');
}

console.log('== §130: the settlement is stored once, by name, and cannot be overwritten ==');
{
  for (const [idx, name] of [[0, 'templeState'], [1, 'lottery'], [2, 'jubilee'], [3, 'noRuler']]) {
    const w = won({ zealots: 85, notables: 10, priesthood: 10 });
    w.ctx.events = EV66;
    C66('ev_s_the_second_government').options[idx].effects(w.ctx);
    ok(simHelpers.constitutionOf(w.ctx, '66ce') === name,
      'option #' + idx + ' stores "' + name + '" (' + simHelpers.constitutionOf(w.ctx, '66ce') + ')');
    ok(w.game.flags.settlementChosen === true, '  and marks the question answered');
    // Write-once: a second constitution is refused.
    const second = simHelpers.setConstitution(w.ctx, '66ce', 'somethingElse');
    ok(second === false && simHelpers.constitutionOf(w.ctx, '66ce') === name,
      '  and a second one is refused rather than applied');
  }
  // …and it says so, once, because that is a bug and not a feature. warnOnce
  // dedupes by key, so the complaint is made the first time and not the
  // hundredth — which is why this is checked here rather than in the loop.
  {
    const fresh = won();
    simHelpers.setConstitution(fresh.ctx, 'testera', 'first');
    const realWarn = console.warn; let warned = 0;
    console.warn = () => { warned++; };
    simHelpers.setConstitution(fresh.ctx, 'testera', 'second');
    console.warn = realWarn;
    ok(warned > 0, 'a refused overwrite is reported rather than swallowed');
  }

  // Re-writing the SAME value is idempotent, not an error: a card that fires
  // twice through some future path should not shout about it.
  const w = won();
  ok(simHelpers.setConstitution(w.ctx, '66ce', 'templeState') === true
    && simHelpers.setConstitution(w.ctx, '66ce', 'templeState') === true,
    'writing the same settlement twice is quiet');
  ok(simHelpers.constitutionOf(w.ctx, '167bce') === '',
    'and a chapter that never answered reads empty rather than undefined');

  // The 132 chapter is on the same store (the brief asked for both).
  const kos = readFileSync(R + '/js/data/events_132ce_kosiba.js', 'utf8');
  ok(/setConstitution\(ctx, ERA/.test(kos), 'the Bar Kokhba accession uses the same store');
  ok(/constitutionOf\(ctx, ERA\)/.test(kos), '  and reads from it rather than from its flags');
  ok(/kosibaCrowned|kosibaNasiConstitution/.test(kos),
    '  while still writing the road markers the path tree checks');
}

console.log('== §130: the cards that assumed a temple-state now know better ==');
{
  const nation = readFileSync(R + '/js/data/events_66ce_nation.js', 'utf8');
  ok(/constitutionOf\(ctx, '66ce'\)/.test(nation),
    'the half-shekel and the Kitos cards read the settlement');

  // The half-shekel: a government that cancelled the debts of the men who
  // forward the money collects a good deal less of it.
  const card = C66('ev_n_half_shekel_of_the_world');
  const temple = won(); simHelpers.setConstitution(temple.ctx, '66ce', 'templeState');
  card.options[0].effects(temple.ctx);
  const tMod = (temple.game.tags.JUD.modifiers || []).find((m) => m.id === 'the_shekel_of_the_nations');
  const radical = won(); simHelpers.setConstitution(radical.ctx, '66ce', 'jubilee');
  card.options[0].effects(radical.ctx);
  const rMod = (radical.game.tags.JUD.modifiers || []).find((m) => m.id === 'the_shekel_of_the_nations');
  ok(!!tMod && !!rMod, 'both settlements can claim the levy');
  ok(rMod.effects.incomeMult < tMod.effects.incomeMult,
    '  and the one that burned the ledgers collects less of it ('
    + rMod.effects.incomeMult + ' vs ' + tMod.effects.incomeMult + ')');

  // …and can refuse it outright on its own first principle, which only it can.
  const refuse = won(); simHelpers.setConstitution(refuse.ctx, '66ce', 'noRuler');
  const mask = allowedOptions(refuse.ctx, card) || card.options.map((_, i) => i);
  ok(mask.indexOf(1) >= 0, 'a state that refuses the census may refuse the head tax');
  const plain = won(); simHelpers.setConstitution(plain.ctx, '66ce', 'templeState');
  const mask2 = allowedOptions(plain.ctx, card) || card.options.map((_, i) => i);
  ok(mask2.indexOf(1) < 0, '  and a temple-state may not, because it has no grounds to');

  // Agrippa: four settlements, four different answers about the same man.
  const agr = C66('ev_s_the_king_at_caesarea');
  ok(!!agr, 'the king with nowhere to go is asked');
  const MARKS = [['templeState', 'agrippaRehabilitated'], ['lottery', 'agrippaObsolete'],
    ['jubilee', 'agrippaDispossessed'], ['noRuler', 'agrippaUnrecognised']];
  for (const [kind, mark] of MARKS) {
    const w = won({}, 80);
    w.game.flags.settlementChosen = true;
    simHelpers.setConstitution(w.ctx, '66ce', kind);
    agr.options[0].effects(w.ctx);
    ok(w.game.flags[mark] === true, '  ' + kind + ' answers him as ' + mark);
  }

  // The annexation pool: a state founded on cancelling debt cannot open a
  // tribute roll on somebody else.
  const { EVENTS_ANNEX } = await import(R + '/js/data/events_annexation.js');
  const annex = EVENTS_ANNEX[0];
  const jub = won(); simHelpers.setConstitution(jub.ctx, '66ce', 'jubilee');
  const am = allowedOptions(jub.ctx, annex) || annex.options.map((_, i) => i);
  ok(am.indexOf(1) < 0, 'the Jubilee cannot levy tribute on the conquered');
  const ts = won(); simHelpers.setConstitution(ts.ctx, '66ce', 'templeState');
  const am2 = allowedOptions(ts.ctx, annex) || annex.options.map((_, i) => i);
  ok(am2.indexOf(1) >= 0, '  and a temple-state can');
}

console.log('== §130: the argument runs sixty years and then closes ==');
{
  const term = C66('ev_s_the_argument_at_sixty');
  ok(!!term && term.date && term.date.y === 130, 'the settlement is read back in 130');
  const w = won({}, 130);
  simHelpers.setConstitution(w.ctx, '66ce', 'lottery');
  ok(term.when(w.ctx) === true, '  for a state that made one');
  const none = won({}, 130);
  ok(term.when(none.ctx) === false, '  and not for a state that never did');
}

console.log('== §131: the withdrawal is the armistice line, both halves of it ==');
{
  const card = C48('ev_z_the_question_that_came_back');
  const w = boot(BOOKMARK_1948, EV48, 'ISR', 1975);
  // A state holding everything: the hills, Gaza, the corridor and the Negev.
  const BEYOND = ['Neapolis', 'Sebaste', 'Jenin', 'Tulkarm', 'Qalqilya', 'Ramallah',
    'Bethlehem', 'Hebron', 'Adora', 'Jericho', 'Gaza', 'Khan Yunis', 'Rafah'];
  const INSIDE = ['Lydda', 'Emmaus', 'Beit Shemesh', 'Modi\'in Hills',
    'Beersheba', 'Arad', 'Oboda', 'Dimona', 'Mitzpe Ramon', 'Paran', 'Eilat'];
  for (const n of BEYOND.concat(INSIDE, ['Jerusalem'])) {
    const p = w.ctx.prov(n);
    if (p) { p.owner = 'ISR'; p.controller = 'ISR'; }
  }
  for (const tag of ['JOR', 'EGY']) if (w.game.tags[tag]) w.game.tags[tag].alive = true;
  card.options[1].effects(w.ctx);

  const stillOurs = BEYOND.filter((n) => { const p = w.ctx.prov(n); return p && p.owner === 'ISR'; });
  ok(!stillOurs.length, 'everything beyond the line goes back ('
    + (stillOurs.join(', ') || 'nothing kept') + ')');

  // The half §125 forgot, and the half the report was about.
  const lostNegev = ['Beersheba', 'Dimona', 'Mitzpe Ramon', 'Paran', 'Eilat', 'Arad', 'Oboda']
    .filter((n) => { const p = w.ctx.prov(n); return p && p.owner !== 'ISR'; });
  ok(!lostNegev.length, 'the Negev to Eilat is inside the line and stays ('
    + (lostNegev.join(', ') || 'all kept') + ')');
  const lostCorridor = ['Lydda', 'Emmaus', 'Beit Shemesh', 'Modi\'in Hills']
    .filter((n) => { const p = w.ctx.prov(n); return p && p.owner !== 'ISR'; });
  ok(!lostCorridor.length, 'and so does the Jerusalem corridor ('
    + (lostCorridor.join(', ') || 'all kept') + ')');
  ok(w.ctx.prov('Jerusalem').owner === 'ISR',
    'so the capital is not left an island in a Jordanian West Bank');

  // Eilat by its 1948 name, because that is what the province is called and
  // the whole point of the report was that it was missing.
  const eilat = w.ctx.prov('Eilat');
  ok(eilat && eilat.name === 'Umm Rashrash' && eilat.owner === 'ISR',
    'Umm Rashrash is held, which is why this state has a Red Sea coast');

  // Nothing is handed to a state that no longer exists.
  const gone = boot(BOOKMARK_1948, EV48, 'ISR', 1975);
  for (const n of BEYOND) { const p = gone.ctx.prov(n); if (p) { p.owner = 'ISR'; p.controller = 'ISR'; } }
  if (gone.game.tags.JOR) gone.game.tags.JOR.alive = false;
  card.options[1].effects(gone.ctx);
  ok(gone.ctx.prov('Hebron').owner === 'ISR',
    'a hill town is not handed to a Jordan that has ceased to exist');
}

console.log(failures ? `smoke89: ${failures} FAIL` : 'smoke89: ALL PASS');
process.exit(failures ? 1 : 0);
