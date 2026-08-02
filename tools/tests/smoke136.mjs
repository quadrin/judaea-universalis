// Headless regression — SPEC §209: the constitutions a fork adopts.
//
// THE COMPLAINT. Five chapters ask a playable court what kind of state it is —
// the Hasmonean diadem (167), the second government (66), the accession of the
// house of Kosiba (132), the crown at Neapolis (529), the line of Jehoiachin
// (614) — and the answers are the best-written decisions in the game. Every one
// of them left the realm a **Theocracy**. The panel said Theocracy before the
// fork and Theocracy after it whichever road was taken; the succession rules
// were the same rules; a Judaea that had just abolished hereditary priestly
// power by drawing lots went on designating heirs the following spring.
//
// So each road now adopts a government of its own, and a government is a set of
// declared RULES rather than one of four names the engine matches by string:
// `elects`, `heirless`, `regency`, `dynastic`, `drawn`, plus the `archetype`
// that says which party-set a foreign court of this kind convenes.
//
// WHAT THIS SUITE HOLDS.
//   1. the table itself — every government declares what it is, and the four
//      starting constitutions keep exactly the effects they were balanced with
//   2. the engine reads the table, not the names — no `govType === '...'`
//      comparisons left anywhere the rules are decided
//   3. the rules bite: elections, regencies, the drawn seat, the marriage
//      table, and the succession crisis that cannot open where nothing is
//      inherited
//   4. no court silently becomes a monarchy — every government names a real
//      party-set, and courts.js seats the one it names
//   5. every option of the five fork cards lands on its constitution — fifteen
//      of the sixteen adopt one — fired through the live cards rather than
//      read off a table in this file
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, simHelpers } = await import(R + '/js/sim/init.js');
const { govDef, govHas, royalMarriageInfo } = await import(R + '/js/sim/military.js');
const { rulerDies, monthlySuccession } = await import(R + '/js/sim/realm.js');
const { SUCCESSION_CRISIS } = await import(R + '/js/sim/crisis.js');
const { getCourtInfo } = await import(R + '/js/sim/courts.js');
const { ensureFactions } = await import(R + '/js/sim/factions.js');

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
const era = (id) => ERAS.find((e) => e.bookmark.id === id) || {};
const CARD = (id, evId) => ((era(id).events) || []).find((e) => e && e.id === evId);

function boot(bookmarkId, tag, y) {
  const bm = era(bookmarkId).bookmark;
  const events = era(bookmarkId).events || [];
  const provinceMap = buildProvinceMapping(MAP_DATA, bm);
  const game = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: bm, events,
    playerTag: tag, rngSeed: 7, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: bm, events, provinceMap,
  });
  game.date = { y, m: 6, d: 1 };
  game.wars = [];
  for (const k of Object.keys(game.tags)) game.tags[k].atWarWith = [];
  const t = game.tags[tag];
  t.alive = true; t.ai = false; t.overlord = null;
  return { game, ctx };
}

// The four a bookmark can START with, and the ten a fork can adopt.
const STARTERS = ['monarchy', 'republic', 'theocracy', 'tribal'];
const ADOPTED = ['sanhedrin', 'lot', 'jubilee', 'noRuler',
  'priestKing', 'gerousia', 'diadem', 'davidic', 'dyarchy', 'nasi'];

console.log('== §209: every government declares what it is ==');
{
  const G = DEFINES.GOV_TYPES;
  for (const key of STARTERS.concat(ADOPTED)) {
    const g = G[key];
    ok(!!g, key + ' is in the table');
    if (!g) continue;
    ok(typeof g.name === 'string' && g.name.length > 2, '  ' + key + ' has a name for the panel: ' + g.name);
    ok(typeof g.desc === 'string' && g.desc.length > 40, '  ' + key + ' says what it does');
    ok(g.effects && typeof g.effects === 'object' && Object.keys(g.effects).length > 0,
      '  ' + key + ' carries effects that fold into t.ideas');
    ok(typeof g.archetype === 'string' && ['monarchy', 'republic', 'theocracy', 'tribal'].includes(g.archetype),
      '  ' + key + ' names the party-set a foreign court convenes: ' + g.archetype);
  }
  // No two constitutions read the same in the panel — the whole complaint.
  const names = STARTERS.concat(ADOPTED).map((k) => G[k].name);
  ok(new Set(names).size === names.length,
    'no two governments wear the same name (' + names.length + ' distinct)');
  // The starting four are balance-pinned: this section adds constitutions, it
  // does not re-tune the ones every bookmark already boots with.
  ok(G.monarchy.effects.legitimacyAdd === 0.05 && G.republic.effects.incomeMult === 1.05
    && G.theocracy.effects.convertMult === 1.2 && G.tribal.effects.manpowerMult === 1.1,
    'the four starting constitutions keep the effects they were balanced with');
  ok(G.republic.elects === true && G.republic.heirless === true, 'a republic still votes and still has no heirs');
  ok(G.monarchy.regency === true && G.monarchy.dynastic === true, 'a monarchy still seats councils and still marries');
  ok(!G.theocracy.regency && G.theocracy.dynastic === true, 'a theocracy still refuses a child regency and still has a house');
  ok(!G.tribal.dynastic, 'a confederation still has no house to join');
  // And every adopted one is actually a different STATE, not a relabel.
  for (const key of ADOPTED) {
    const g = G[key];
    ok(!!(g.elects || g.heirless || g.regency || g.dynastic || g.drawn),
      '  ' + key + ' declares at least one rule of its own');
  }
  for (const key of ['lot', 'noRuler']) {
    ok(DEFINES.GOV_TYPES[key].drawn === true && typeof DEFINES.GOV_TYPES[key].vacancy === 'string',
      key + ' fills its own vacancy and says how: "' + DEFINES.GOV_TYPES[key].vacancy + '"');
  }
}

console.log('== §209: the engine reads the table, not the four old names ==');
{
  const SOURCES = ['js/sim/realm.js', 'js/sim/crisis.js', 'js/sim/revolt.js',
    'js/sim/military.js', 'js/sim/courts.js', 'js/ui/nation_panel.js'];
  for (const f of SOURCES) {
    const src = readFileSync(R + '/' + f, 'utf8');
    // Comments may name the old shape; code may not decide on it.
    const code = src.split('\n').filter((ln) => !/^\s*(\/\/|\*|\/\*)/.test(ln)).join('\n');
    ok(!/govType\s*[=!]==?\s*'(republic|theocracy|monarchy|tribal)'/.test(code),
      f + ' decides nothing by matching a government name');
  }
  ok(typeof govDef === 'function' && typeof govHas === 'function',
    'the rules are read through govDef/govHas');
  const w = boot('66ce', 'JUD', 70);
  w.game.tags.JUD.govType = 'no-such-government';
  ok(govDef(w.ctx, 'JUD') === DEFINES.GOV_TYPES.monarchy,
    'an unknown government falls back to the plainest crown rather than to nothing');
  ok(govHas(w.ctx, 'JUD', 'regency') === true && govHas(w.ctx, 'JUD', 'elects') === false,
    '  and answers the rules from that fallback');
}

console.log('== §209: the rules bite — succession, marriage, the crisis that cannot open ==');
{
  // A child heir under a constitution that seats councils, and under one that
  // does not. Same death, two different states afterwards.
  for (const [gov, wantsRegency] of [['monarchy', true], ['diadem', true], ['sanhedrin', false], ['nasi', false]]) {
    const w = boot('66ce', 'JUD', 75);
    const t = w.game.tags.JUD;
    t.govType = gov;
    t.ruler = { name: 'The Incumbent', title: 'High Priest', gov: 2, infl: 2, mar: 2, age: 70 };
    t.heir = { name: 'The Child', gov: 2, infl: 2, mar: 2, age: 7 };
    rulerDies(w.ctx, 'JUD', 'has died');
    ok(!!t.regency === wantsRegency,
      gov + ': a child heir ' + (wantsRegency ? 'gets a council' : 'waits while an elder takes the seat'));
  }

  // The drawn seat: no heir, no crisis, and the state carries on.
  for (const gov of ['lot', 'noRuler']) {
    const w = boot('66ce', 'JUD', 75);
    const t = w.game.tags.JUD;
    t.govType = gov;
    t.heir = null;
    t.legitimacy = 60;
    t.stability = 1;
    t.ruler = { name: 'The Incumbent', title: 'High Priest', gov: 2, infl: 2, mar: 2, age: 70 };
    rulerDies(w.ctx, 'JUD', 'has died');
    ok(!!t.ruler && t.ruler.name !== 'The Incumbent', gov + ': the office is filled the month it empties');
    ok(t.legitimacy === 55, '  at a cost of five legitimacy, not twenty-five (' + t.legitimacy + ')');
    ok(t.stability === 1, '  and no loss of stability: nobody\'s claim died with him');
    ok(!(t.crises && t.crises.succession && t.crises.succession.heat > 0),
      '  and no succession crisis opens over a seat nobody inherits');
    const line = (w.game.chronicle || []).map((c) => c.text || '').join(' | ');
    ok(line.includes(DEFINES.GOV_TYPES[gov].vacancy),
      '  and the chronicle says how it was filled: "' + DEFINES.GOV_TYPES[gov].vacancy + '"');
  }

  // …and the crisis that CAN open still does, everywhere it did before.
  for (const [gov, applies] of [['monarchy', true], ['theocracy', true], ['sanhedrin', true],
    ['diadem', true], ['republic', false], ['jubilee', false], ['lot', false], ['noRuler', false]]) {
    const w = boot('66ce', 'JUD', 75);
    w.game.tags.JUD.govType = gov;
    ok(SUCCESSION_CRISIS.applies(w.ctx, 'JUD') === applies,
      gov + ': the succession crisis ' + (applies ? 'applies' : 'cannot open'));
  }

  // Heirs: a constitution that does not inherit never designates one, however
  // long it is left running.
  for (const [gov, wantsHeir] of [['sanhedrin', true], ['lot', false], ['jubilee', false], ['noRuler', false]]) {
    const w = boot('66ce', 'JUD', 75);
    const t = w.game.tags.JUD;
    t.govType = gov;
    t.heir = null;
    t.ruler = { name: 'The Incumbent', title: 'High Priest', gov: 2, infl: 2, mar: 2, age: 40 };
    let sawHeir = false;
    for (let i = 0; i < 600 && !sawHeir; i++) {
      w.game.date.m = (w.game.date.m % 12) + 1;
      monthlySuccession(w.ctx);
      if (t.heir) sawHeir = true;
    }
    ok(sawHeir === wantsHeir,
      gov + ': fifty years of running ' + (wantsHeir ? 'names an heir eventually' : 'names no heir at all'));
  }

  // The vote: an elective constitution counts down and then chooses.
  {
    const w = boot('66ce', 'JUD', 75);
    const t = w.game.tags.JUD;
    t.govType = 'jubilee';
    t.electionIn = 3;
    t.ruler = { name: 'The Incumbent', title: 'Nasi', gov: 0, infl: 0, mar: 0, age: 40 };
    for (let i = 0; i < 3; i++) { w.game.date.m = 6; monthlySuccession(w.ctx); }
    ok(t.electionIn === 48, 'the Jubilee\'s assembly votes on the clock and resets it (' + t.electionIn + ')');
    ok(t.ruler.name !== 'The Incumbent', '  and an officer with no merit at all loses the vote');
  }

  // The marriage table asks the government whether there is a house here.
  {
    const w = boot('66ce', 'JUD', 75);
    const g = w.game;
    g.tags.JUD.points = { gov: 99, infl: 99, mar: 99 };
    const other = 'PAR';
    g.tags[other].opinion = Object.assign({}, g.tags[other].opinion, { JUD: 100 });
    g.tags[other].govType = 'monarchy';
    for (const [gov, can] of [['sanhedrin', true], ['nasi', true], ['gerousia', true], ['diadem', true],
      ['lot', false], ['noRuler', false], ['jubilee', false]]) {
      g.tags.JUD.govType = gov;
      const info = royalMarriageInfo(w.ctx, 'JUD', other);
      ok(!!info.can === can, gov + ': a match with a foreign house is ' + (can ? 'possible' : 'refused — there is none to join'));
    }
  }
}

console.log('== §209: no court silently becomes a monarchy ==');
{
  // courts.js has four party-sets and there are fourteen governments. Each one
  // names the set it convenes; an unnamed one would read as King's Men.
  const w = boot('66ce', 'JUD', 80);
  const g = w.game;
  const foreign = 'PAR';
  g.tags[foreign].alive = true;
  for (const key of STARTERS.concat(ADOPTED)) {
    g.tags[foreign].govType = key;
    g.tags[foreign].court = null;
    const info = getCourtInfo(w.ctx, foreign);
    ok(!!info && info.seats.length === 3, key + ': a foreign court of this kind convenes three parties');
    const want = { monarchy: 'crown', republic: 'senate', theocracy: 'priesthood', tribal: 'chiefs' }[DEFINES.GOV_TYPES[key].archetype];
    ok(!!info && info.seats[0].id === want, '  and they are the ones the table names (' + info.seats[0].id + ')');
  }
}

console.log('== §209: every fork option lands on its constitution, fired live ==');
{
  // 66 CE — the second government (SPEC §130). Four settlements, four states.
  {
    const card = CARD('66ce', 'ev_s_the_second_government');
    ok(!!card && card.options.length === 4, 'the second government still offers four settlements');
    const WANT = ['sanhedrin', 'lot', 'jubilee', 'noRuler'];
    for (let i = 0; i < 4; i++) {
      const w = boot('66ce', 'JUD', 75);
      ensureFactions(w.ctx, 'JUD');
      w.game.flags.secondKingdom = true;
      card.options[i].effects(w.ctx);
      ok(w.game.tags.JUD.govType === WANT[i],
        '  settlement #' + i + ' makes the realm a ' + WANT[i] + ' (' + w.game.tags.JUD.govType + ')');
      ok(w.game.tags.JUD.ideas && Number.isFinite(w.game.tags.JUD.ideas.incomeMult),
        '    and rebuilds the realm\'s effects around it');
    }
  }

  // 132 CE — the accession (SPEC §134). The four answers to "what is the house
  // of Kosiba" are four different constitutions.
  {
    const card = CARD('132ce', 'ev_bk_the_accession');
    ok(!!card && card.options.length === 4, 'the accession still offers four answers');
    const WANT = ['diadem', 'davidic', 'dyarchy', 'nasi'];
    for (let i = 0; i < 4; i++) {
      const w = boot('132ce', 'JUD', 160);
      ensureFactions(w.ctx, 'JUD');
      card.options[i].effects(w.ctx);
      ok(w.game.tags.JUD.govType === WANT[i],
        '  accession #' + i + ' makes the realm a ' + WANT[i] + ' (' + w.game.tags.JUD.govType + ')');
    }
  }

  // 167 BCE — the diadem (SPEC §197). The quarrel the next two chapters
  // descend from, and now the two roads are two governments.
  {
    const card = CARD('167bce', 'ev_h_the_diadem');
    ok(!!card && card.options.length === 2, 'the diadem is still asked with two answers');
    const WANT = ['priestKing', 'gerousia'];
    for (let i = 0; i < 2; i++) {
      const w = boot('167bce', 'HAS', -110);
      ensureFactions(w.ctx, 'HAS');
      card.options[i].effects(w.ctx);
      ok(w.game.tags.HAS.govType === WANT[i],
        '  diadem #' + i + ' makes the realm a ' + WANT[i] + ' (' + w.game.tags.HAS.govType + ')');
    }
  }

  // 529 CE — the games at Neapolis (SPEC §136). Two crowned roads and one that
  // refuses; the crown is the constitution either way it is worn.
  {
    const card = CARD('529ce', 'ev529_the_games_at_neapolis');
    ok(!!card && card.options.length === 3, 'the games are still asked with three answers');
    const WANT = ['diadem', 'diadem', 'gerousia'];
    for (let i = 0; i < 3; i++) {
      const w = boot('529ce', 'SAM', 530);
      ensureFactions(w.ctx, 'SAM');
      card.options[i].effects(w.ctx);
      ok(w.game.tags.SAM.govType === WANT[i],
        '  Neapolis #' + i + ' makes the rising a ' + WANT[i] + ' (' + w.game.tags.SAM.govType + ')');
    }
  }

  // 614 CE — the line of Jehoiachin (SPEC §126). Crowned, declined, kept.
  {
    const card = CARD('614ce', 'ev_d_the_crown_of_david');
    ok(!!card && card.options.length === 3, 'the crown of David is still asked with three answers');
    const WANT = ['davidic', null, 'diadem'];
    for (let i = 0; i < 3; i++) {
      const w = boot('614ce', 'JUD', 660);
      ensureFactions(w.ctx, 'JUD');
      const was = w.game.tags.JUD.govType;
      card.options[i].effects(w.ctx);
      const now = w.game.tags.JUD.govType;
      ok(now === (WANT[i] || was),
        '  crown #' + i + ' leaves the realm ' + (WANT[i] || 'as it was') + ' (' + now + ')');
    }
  }
}

console.log('== §209: the roads are wired at the call site, where they can be read ==');
{
  // Same rule as the road markers (smoke83): a government written through a
  // table in a header is invisible to a reader checking the chapter's own text.
  const FILES = [
    ['js/data/events_66ce_settlement.js', ['sanhedrin', 'lot', 'jubilee', 'noRuler']],
    ['js/data/events_132ce_kosiba.js', ['diadem', 'davidic', 'dyarchy', 'nasi']],
    ['js/data/events_167bce.js', ['priestKing', 'gerousia']],
    ['js/data/events_529ce.js', ['diadem', 'gerousia']],
    ['js/data/events_614ce_david.js', ['davidic', 'diadem']],
  ];
  for (const [f, govs] of FILES) {
    const src = readFileSync(R + '/' + f, 'utf8');
    for (const gov of govs) {
      ok(src.includes("setGovernment(ctx, '" + (f.includes('167bce') ? 'HAS' : f.includes('529ce') ? 'SAM' : 'JUD') + "', '" + gov + "')"),
        f.split('/').pop() + ' adopts ' + gov + ' in the card that offers it');
    }
  }
  // The tooltip is the contract with the player: a road that changes the
  // constitution has to SAY so before it is taken.
  for (const [f] of FILES) {
    const src = readFileSync(R + '/' + f, 'utf8');
    const calls = (src.match(/setGovernment\(/g) || []).length;
    const said = (src.match(/tooltip:[^]*?effects:/g) || []).join(' ');
    ok(calls > 0 && /(constitution|the realm becomes)/i.test(said),
      f.split('/').pop() + ': the tooltips name the constitution the road adopts');
  }
}

console.log('== §209: the helper refuses what it cannot do ==');
{
  const w = boot('66ce', 'JUD', 75);
  const realWarn = console.warn; let warned = 0;
  console.warn = () => { warned++; };
  const bad = simHelpers.setGovernment(w.ctx, 'JUD', 'gerousiaa');
  const noTag = simHelpers.setGovernment(w.ctx, 'NOSUCHTAG', 'diadem');
  console.warn = realWarn;
  ok(bad === false && warned > 0, 'a government that does not exist is refused and reported');
  ok(w.game.tags.JUD.govType === 'theocracy', '  and the realm keeps the constitution it had');
  ok(noTag === false, 'and so is a court that does not exist');
  // Electing and heirless are applied, not merely recorded.
  const t = w.game.tags.JUD;
  t.heir = { name: 'The Child', gov: 2, infl: 2, mar: 2, age: 7 };
  t.regency = true;
  t.electionIn = 2;
  simHelpers.setGovernment(w.ctx, 'JUD', 'jubilee');
  ok(t.heir === null && t.regency === false, 'adopting a constitution that does not inherit clears the heir and the council');
  ok(t.electionIn === 48, '  and starts the clock the new constitution votes on');
  ok(simHelpers.setGovernment(w.ctx, 'JUD', 'jubilee') === true, 'adopting the same constitution twice is quiet');
}

console.log(failures ? `\n${failures} FAILURES` : '\nsmoke136: ALL PASS');
process.exit(failures ? 1 : 0);
