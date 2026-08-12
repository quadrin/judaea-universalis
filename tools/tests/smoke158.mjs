// Headless regression — SPEC §235: The Rising Against Gallus, 351 CE.
//
// The chapter whose antagonist is a century rather than an army, and the
// assertions that matter are the ones that would rot silently if somebody
// later tidied the assumptions it does not share with its neighbours:
//
//   1. The start position IS three towns. The sources give the rising
//      Diocaesarea and the lake villages and give TIBERIAS — the Patriarch's
//      own city, three miles down the shore — to the Empire, and the chapter's
//      whole first fork depends on that. An owners table that quietly handed
//      Tiberias to the rising would delete the decision without failing
//      anything else.
//   2. The window is a modifier with a counter on it. Constantius takes the
//      field army west in the spring of 351 and is not finished with Magnentius
//      until August 353; if `the_empire_fights_itself` stops being on Rome's
//      books at month one, the chapter is simply a smaller 132.
//   3. The map wears 351 and not 132: Aelia Capitolina, Diocaesarea, Diospolis,
//      Nicopolis, Constantinople — and Jerusalem is a CHRISTIAN province,
//      because Constantine's basilica is sixteen years old.
//   4. The century is a mechanic before it is a card. `faithDrift` runs on its
//      own clock whoever wins the war, and it dips — really dips, in the
//      curve — for the twenty months Julian reigns.
//   5. Every fork marker is this chapter's own. 132 asks the same question
//      about the same mountain in the same year (§119 says the chapters do not
//      know about each other), so the flags must not be the same flags.
//   6. The victory contract is two-ended: the Galilee entire by 356, or a
//      sovereign Jewish country still standing in 364 — and the loss is the
//      history that happened.
//   7. The quarrel is the moon and the reckoning, both seats seated, and the
//      statecraft pool finds its three chairs.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { BOOKMARK_351 } = await import(R + '/js/data/bookmark_351ce.js');
const { EVENTS_351 } = await import(R + '/js/data/events_351ce.js');
const { EVENTS_351_WORLD } = await import(R + '/js/data/events_351ce_world.js');
const { POLITICAL_MAPS } = await import(R + '/js/data/political_maps.js');
const { CHAPTER_PATHS } = await import(R + '/js/data/chapter_paths.js');
const { QUARRELS } = await import(R + '/js/data/schools.js');
const { eraIdeaGroupsFor, eraIdeaUnlocked } = await import(R + '/js/data/era_ideas.js');
const { campaignGuidance } = await import(R + '/js/data/campaign_guidance.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
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

const era351 = ERAS.find((e) => e.bookmark.id === '351ce');
const card = (id) => era351.events.find((e) => e && e.id === id) || null;

function boot(tag, { bus, y, m } = {}) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_351);
  const events = era351.events;
  const game = initGame({
    DEFINES, MAP_DATA, geom: flatGeom, bookmark: BOOKMARK_351, events,
    playerTag: tag, rngSeed: 17, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: flatGeom,
    bus: bus || { emit() {}, on() { return () => {}; } },
    bookmark: BOOKMARK_351, events, provinceMap,
  });
  if (y) game.date = { y, m: m || 6, d: 1 };
  const t = game.tags[tag];
  if (t) { t.alive = true; t.ai = false; t.overlord = null; }
  return { game, ctx, events, actions: gameActions(ctx) };
}
const modOf = (t, id) => ((t && t.modifiers) || []).find((x) => x && x.id === id);
// endGame does not store its title on the game: it writes a 'verdict' line to
// the chronicle and lets the campaign carry on (SPEC §32). That line is where
// a headless suite reads the ending back from.
const verdict = (g) => {
  const row = ((g && g.chronicle) || []).filter((c) => c && c.kind === 'verdict').pop();
  return (row && row.text) || String((g && g.result) || 'nothing');
};

// ---------------------------------------------------------------------------
console.log('== the chapter is registered, and it is the sixth ==');
{
  ok(!!era351, 'the era registry carries 351ce');
  ok(ERAS.indexOf(era351) === 5,
    '  in chronological order, between the Bar Kokhba revolt and the Keepers');
  const years = ERAS.map((e) => e.bookmark.startDate.y);
  ok(years.every((y, i) => i === 0 || y > years[i - 1]),
    '  and the carousel is still sorted by date ('
    + ERAS.map((e) => e.bookmark.id).join(' → ') + ')');
  ok(BOOKMARK_351.playableTags.length === 1 && BOOKMARK_351.playableTags[0].tag === 'JUD',
    'the rising is the only chair — the Empire keeps a full court and is never offered');
  ok(!!campaignGuidance('351ce', 'JUD', { y: 351, m: 6 }), 'the outliner has guidance for the rising');
  ok(!!campaignGuidance('351ce', 'ROM', { y: 351, m: 6 }), '  and for the Empire');
  ok(BOOKMARK_351.techBase === 7 && BOOKMARK_351.techCeiling === 11,
    'the age runs from the comitatenses to the thematic pattern (7..11)');
  ok(BOOKMARK_351.generationHorizon === 430,
    '  and its undated cards stop belonging to anybody after 430');
}

// ---------------------------------------------------------------------------
console.log('== three towns, and Tiberias is not one of them ==');
{
  const w = boot('JUD');
  const mine = [];
  for (let i = 1; i < w.game.provinces.length; i++) {
    const p = w.game.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner === 'JUD') mine.push(p.canon || p.name);
  }
  ok(mine.length === 3, 'the rising starts with three provinces (' + mine.join(', ') + ')');
  for (const n of ['Sepphoris', 'Tarichaea', 'Gischala']) {
    ok(mine.indexOf(n) >= 0, '  ' + n + ' rose with the arms chest');
  }
  const tib = w.ctx.prov('Tiberias');
  ok(tib && tib.owner === 'ROM' && tib.religion === 'judaism',
    'Tiberias is the Empire\'s — a Jewish city under Roman government, which is the first fork');
  ok(w.ctx.prov('Caesarea Maritima').owner === 'ROM',
    'Caesarea Maritima is the governor\'s seat and the Empire\'s');
  const jer = w.ctx.prov('Jerusalem');
  ok(jer && jer.owner === 'ROM' && jer.religion === 'christianity',
    'and Aelia is Roman and Christian — the basilica is sixteen years old');
  ok(!jer.wonder, '  with nothing standing on the Mount (SPEC §32)');
  // The four towns the Great Revolt consumed are still gone, as in 132 and 614.
  for (const n of ['Jotapata', 'Gamala', 'Machaerus', 'Masada']) {
    const p = w.ctx.prov(n);
    ok(!p || (p.canon || p.name) !== n, '  ' + n + ' is not a province in this century');
  }
}

// ---------------------------------------------------------------------------
console.log('== the map wears 351 ==');
{
  const w = boot('JUD');
  const named = (canon, era) => {
    const p = w.ctx.prov(canon);
    return !!p && p.name === era;
  };
  ok(named('Jerusalem', 'Aelia Capitolina'), 'Jerusalem is signposted Aelia Capitolina');
  ok(named('Sepphoris', 'Diocaesarea'), 'Sepphoris is Diocaesarea');
  ok(named('Lydda', 'Diospolis'), 'Lydda is Diospolis');
  ok(named('Emmaus', 'Nicopolis'), 'Emmaus is Nicopolis');
  ok(named('Byzantion', 'Constantinople'), 'and Byzantion is Constantinople, twenty-one years old');
  const pen = BOOKMARK_351.integratedNames.JUD;
  ok(pen && pen.Jerusalem === 'Yerushalayim' && pen.Sepphoris === 'Tzippori',
    'the Hebrew pen waits on the ground being truly ours (SPEC §66)');
  ok(!BOOKMARK_351.integratedNames.ROM,
    '  and there is no Roman pen, because the signposts above already are one');
}

// ---------------------------------------------------------------------------
console.log('== the window, and the two wars ==');
{
  const w = boot('JUD');
  const rom = w.game.tags.ROM;
  const jud = w.game.tags.JUD;
  const window = modOf(rom, 'the_empire_fights_itself');
  ok(!!window, 'the Empire is fighting itself at month one');
  ok(window && window.months === 30,
    '  for thirty months — spring 351 to Magnentius\' death (' + (window && window.months) + ')');
  ok(window && window.effects.manpowerMult < 1 && window.effects.reinforceMult < 1,
    '  and what it costs is the field army, not the treasury');
  ok(!!modOf(jud, 'the_arms_of_the_night'), 'the rising opens on the arms it stole');
  ok(!!modOf(jud, 'no_administration'),
    '  and on having no government to spend them through');
  const rising = (w.game.wars || []).find((x) => x && /Rising at Diocaesarea/.test(x.name || ''));
  ok(!!rising, 'the rising is a war from month one');
  ok(rising && rising.noNegotiation === true,
    '  with no table: a provincial rising is not a belligerent until a card says so');
  const persia = (w.game.wars || []).find((x) => x && /Shapur/.test(x.name || ''));
  ok(!!persia, 'and the Persian war is running beside it, which is why there is a window at all');
  ok(w.game.tags.ARM && w.game.tags.ARM.overlord === 'ROM',
    'Armenia is Rome\'s client and Shapur\'s objective');
}

// ---------------------------------------------------------------------------
console.log('== the opening cards reach a player ==');
{
  const seen = [];
  const bus = { emit(k, p) { if (k === 'event') seen.push(p); }, on() { return () => {}; } };
  const w = boot('JUD', { bus });
  for (const id of ['ev351_the_arms_of_the_night', 'ev351_what_he_is_called',
    'ev351_the_house_of_the_nasi', 'ev351_ursicinus_marches']) {
    const ev = card(id);
    ok(!!ev, id + ' is in the chain');
    if (ev) fireEvent(w.ctx, ev);
  }
  ok(seen.length >= 4, 'four opening cards reached the player (' + seen.length + ')');
  const arms = card('ev351_the_arms_of_the_night');
  ok(arms && arms.date && arms.date.y === 351 && arms.major === true,
    'the chapter opens on the robbery, in 351, and it is a major card');
  const ursicinus = card('ev351_ursicinus_marches');
  ok(ursicinus && ursicinus.options.length === 3,
    'the counter-stroke offers three answers: meet him, hold the towns, take to the hills');
  ok(ursicinus && /hills/i.test(ursicinus.options[2].label),
    '  and the third of them gives up the towns on purpose');
}

// ---------------------------------------------------------------------------
console.log('== every fork is this chapter\'s own ==');
{
  const chapter = CHAPTER_PATHS.find((c) => c.id === '351ce');
  ok(!!chapter && chapter.lastYear === 429,
    'the tree charts the chapter and runs it to 429 — the year the crown gold was diverted');
  const forks = (chapter ? chapter.forks : []);
  ok(forks.length === 6, 'six forks: the name, the house, the calendar, the offer, '
    + 'the bishops, the office (' + forks.length + ')');
  const markers = forks.flatMap((f) => f.roads.map((r) => r.marker));
  ok(markers.length === 12 && new Set(markers).size === 12,
    'twelve roads, twelve distinct markers');
  // §119: 132 asks the same question about the same mountain in the same year.
  // The two chapters must not share a flag, or a campaign could answer one
  // chapter's fork out of the other's card.
  ok(markers.indexOf('julianTemple') < 0 && markers.indexOf('julianRefused') < 0,
    'and Julian\'s offer here is not 132\'s flags — the chapters do not know about each other');
  const hypos = BOOKMARK_351.missions.JUD.filter((m) => m.hypothetical);
  ok(hypos.length === 6, 'the tree shows all six as roads not taken');
  ok(hypos.every((m) => String(m.fork).startsWith('351ce/')),
    '  every one of them naming a fork of its own chapter');
}

// ---------------------------------------------------------------------------
console.log('== the century is the antagonist ==');
{
  const drift = BOOKMARK_351.faithDrift && BOOKMARK_351.faithDrift.christianity;
  ok(!!drift, 'the fourth century is declared as a drift, not as a card');
  ok(drift && drift.resistedBy && drift.resistedBy.judaism > 0.5,
    '  which the Torah resists and does not stop (' + (drift && drift.resistedBy.judaism) + ')');
  ok(drift && drift.seeds.indexOf('Jerusalem') >= 0 && drift.seeds.indexOf('Caesarea Maritima') >= 0,
    '  seeded where Constantine built and where the metropolitan sat');
  const plain = drift.curve(363, { game: { flags: {} } });
  const apostate = drift.curve(363, { game: { flags: { apostateReigns: true } } });
  ok(apostate < plain * 0.6,
    '  and it dips hard for the twenty months the temples are open again ('
    + apostate.toFixed(3) + ' against ' + plain.toFixed(3) + ')');
  const late = drift.curve(420, { game: { flags: {} } });
  ok(late > plain, '  and it is still climbing after Julian is dead (' + late.toFixed(3) + ')');
  // The mission that reads it back: a Galilee that is still Jewish in 400.
  const century = BOOKMARK_351.missions.JUD.find((m) => m.id === 'dc_the_century');
  ok(!!century && /Torah/.test(century.desc),
    'and the chapter\'s capstone counts provinces that still keep the Torah, not provinces held');
}

// ---------------------------------------------------------------------------
console.log('== the foreign patron is the Empire\'s own church ==');
{
  const fp = BOOKMARK_351.foreignPatron && BOOKMARK_351.foreignPatron.christianity;
  ok(!!fp && fp.patron === 'ROM',
    'a Jewish state that takes Caesarea governs a church whose patron is the enemy');
  ok(fp && fp.freedFlag === 'bishopsSettled',
    '  and the one thing that ends it is the settlement card (' + (fp && fp.freedFlag) + ')');
  const terms = card('ev351_the_bishops_terms');
  ok(!!terms && terms.options.length === 2, 'the terms card is a fork with two roads');
  const w = boot('JUD');
  terms.options[0].effects(w.ctx);
  ok(w.game.flags.bishopsSettled === true,
    '  and signing sets the flag the patron rule reads');
  const w2 = boot('JUD');
  terms.options[1].effects(w2.ctx);
  ok(w2.game.flags.bishopsRefused === true && !w2.game.flags.bishopsSettled,
    '  while assessing them like landholders sets the other one, and only the other one');
}

// ---------------------------------------------------------------------------
console.log('== the quarrel is the moon and the reckoning ==');
{
  const q = QUARRELS.moon_and_reckoning;
  ok(!!q, 'the quarrel exists');
  ok(BOOKMARK_351.schools.JUD === 'moon_and_reckoning', '  and the chapter names it');
  const seated = (BOOKMARK_351.factions.JUD || []).map((f) => f.id);
  ok(seated.indexOf(q.hi.seat) >= 0 && seated.indexOf(q.lo.seat) >= 0,
    '  with both seats seated: ' + q.hi.seat + ' and ' + q.lo.seat);
  ok(q.rulings.length >= 5, '  and ' + q.rulings.length + ' disputes before the court');
  const w = boot('JUD');
  for (let i = 0; i < 40; i++) tickDay(w.ctx);
  const rep = w.actions.getSchools();
  ok(rep && rep.quarrel === 'moon_and_reckoning',
    '  which convenes for the player: "' + (rep ? rep.title : 'nothing') + '"');
  ok(rep && rep.reading.band === 'mid', '  unruled at the opening, like every chapter');
}

// ---------------------------------------------------------------------------
console.log('== the curriculum opens at the rung the age starts on ==');
{
  const w = boot('JUD');
  const groups = eraIdeaGroupsFor(BOOKMARK_351, 'JUD', w.game.tags.JUD);
  ok(groups.length === 4, 'the rising is taught four arts of the age (' + groups.length + ')');
  const open = groups.filter((g) => eraIdeaUnlocked(w.game.tags.JUD, g));
  ok(open.length >= 1, '  and at least one of them is open at the starting rungs ('
    + open.map((g) => g.name).join(', ') + ')');
  const romGroups = eraIdeaGroupsFor(BOOKMARK_351, 'ROM', w.game.tags.ROM);
  ok(romGroups.length === 3, 'the Empire has a curriculum of its own (' + romGroups.length + ')');
}

// ---------------------------------------------------------------------------
console.log('== the political map is 351 and not 132 ==');
{
  const map = POLITICAL_MAPS['351ce'];
  ok(!!map, 'the registry carries a political map for the chapter');
  ok(map.owners.Sarmizegetusa === 'GOT' && map.owners.Napoca === 'GOT',
    'Dacia is Gothic — Aurelian pulled the province out eighty years ago');
  ok(map.owners.Nisa === 'SAS' && map.owners.Carmana === 'SAS',
    'and Iran answers to one court, because Parthia has been gone since 224');
  ok(map.owners.Meroe === 'NOB' && map.owners.Dodekaschoinos === 'BLM',
    'Meroe is finished and the Blemmyes hold the ground Diocletian gave up');
  ok(map.religions && map.religions.Aksum === 'christianity',
    'Ezana\'s Aksum has taken the Cross');
  const painted = Object.values(map.owners).filter((v) => v !== 'WASTE').length;
  ok(painted >= 100, 'the west, the east and the south are filled (' + painted + ' cells)');
  const w = boot('JUD');
  const unseated = [];
  for (let i = 1; i < w.game.provinces.length; i++) {
    const p = w.game.provinces[i];
    if (!p || p.impassable || p.owner === 'WASTE') continue;
    if (map.owners[p.canon] && !w.game.tags[p.owner]) unseated.push(p.canon);
  }
  ok(!unseated.length, 'and every painted cell has a court that exists ('
    + (unseated.slice(0, 4).join(', ') || 'all seated') + ')');
}

// ---------------------------------------------------------------------------
console.log('== the world spine runs on its own clock ==');
{
  const dated = EVENTS_351_WORLD.filter((e) => e && e.date);
  ok(dated.length === EVENTS_351_WORLD.length,
    'every world card is dated (' + dated.length + ' of them)');
  const years = dated.map((e) => e.date.y);
  ok(Math.min(...years) === 353 && Math.max(...years) === 410,
    '  running from Magnentius\' death to the sack of Rome (' + Math.min(...years)
    + '–' + Math.max(...years) + ')');
  ok(EVENTS_351_WORLD.every((e) => e.world === true), '  and all of it is world history');
  const mursa = card('ev351_mursa');
  ok(!!mursa && mursa.date.y === 351 && mursa.date.m === 10,
    'Mursa is in the chapter\'s own chain, in September of the first year');
  const jovian = EVENTS_351_WORLD.find((e) => e.id === 'ev351w_the_peace_of_jovian');
  ok(!!jovian && /Nisibis/.test(jovian.desc),
    'and the peace of 363 gives away Nisibis, which the Empire had never done before');
}

// ---------------------------------------------------------------------------
console.log('== the victory contract is two-ended ==');
{
  // The Galilee entire, five years on.
  const w = boot('JUD', { y: 356, m: 6 });
  for (const n of ['Sepphoris', 'Tiberias', 'Tarichaea', 'Gischala', 'Ptolemais', 'Scythopolis']) {
    w.ctx.helpers.changeOwner(w.ctx, n, 'JUD');
  }
  BOOKMARK_351.checkVictory(w.ctx);
  ok(w.game.result === 'win' && /Galilee Held/.test(verdict(w.game)),
    'six towns held into 356 wins the chapter (' + verdict(w.game) + ')');
}
{
  // A sovereign country still standing after the one emperor who would have
  // helped it is dead.
  const w = boot('JUD', { y: 364, m: 6 });
  for (const n of ['Tiberias', 'Ptolemais']) w.ctx.helpers.changeOwner(w.ctx, n, 'JUD');
  BOOKMARK_351.checkVictory(w.ctx);
  ok(w.game.result === 'win' && /Fourth Century/i.test(verdict(w.game)),
    'and so does simply still being there in 364 (' + verdict(w.game) + ')');
}
{
  // Occupied is not extinguished: the chapter's own answer to Ursicinus is
  // "into the hills, let him have the towns", so a rising whose towns are all
  // under enemy control but still its own, with men left to raise, is still
  // playing.
  const w = boot('JUD', { y: 353, m: 6 });
  for (let i = 1; i < w.game.provinces.length; i++) {
    const p = w.game.provinces[i];
    if (p && p.owner === 'JUD') p.controller = 'ROM';
  }
  w.game.armies = {};
  BOOKMARK_351.checkVictory(w.ctx);
  ok(!w.game.result, 'every town occupied is not a verdict — the hills are an option');
}
{
  // The history that happened: the ground gone, the host gone, and nobody
  // left to raise another.
  const w = boot('JUD', { y: 353, m: 6 });
  for (let i = 1; i < w.game.provinces.length; i++) {
    const p = w.game.provinces[i];
    if (p && p.owner === 'JUD') { p.owner = 'ROM'; p.controller = 'ROM'; }
  }
  w.game.armies = {};
  w.game.tags.JUD.manpower = 0;
  BOOKMARK_351.checkVictory(w.ctx);
  ok(w.game.result === 'loss' && /Ursicinus/.test(verdict(w.game)),
    'and losing everything is the sentence and a half it actually got ('
    + verdict(w.game) + ')');
}

// ---------------------------------------------------------------------------
console.log('== the chain is dense and its ids are its own ==');
{
  const chain = EVENTS_351.concat(EVENTS_351_WORLD);
  ok(chain.every((c) => c && typeof c.id === 'string' && /^ev351/.test(c.id)),
    'every card of both packages wears the chapter\'s prefix (' + chain.length + ' cards)');
  const ids = chain.map((c) => c.id);
  ok(new Set(ids).size === ids.length, '  and no id is used twice');
  const other = new Set();
  for (const e of ERAS) {
    if (e.bookmark.id === '351ce') continue;
    for (const c of e.events) if (c && c.id) other.add(c.id);
  }
  const stolen = ids.filter((id) => other.has(id));
  ok(!stolen.length, '  and none of them belongs to another chapter ('
    + (stolen.join(', ') || 'none') + ')');
  ok(chain.every((c) => Array.isArray(c.options) && c.options.length >= 1
    && c.options.every((o) => o && o.label && typeof o.effects === 'function')),
  'every card offers at least one answer, and every answer does something');
}

console.log(failures ? failures + ' FAILURES' : 'smoke158: ALL PASS');
