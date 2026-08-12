// Headless regression — SPEC §138: the crown of Israel costs a dynasty.
//
// Proclaiming the Kingdom of Israel is proclaiming the united monarchy, and the
// united monarchy is David's. The formable used to ask for twenty-five
// provinces, six named cities, stability and legitimacy — a conquest checklist
// any large Jewish state could tick, which made the greater crown a reward for
// arithmetic. It is also the one objection this game's own history keeps
// making: the Hasmoneans were priests of Joarib and were told so for a century,
// Herod married Mariamne for a pedigree he lacked, and the Exilarchs of
// Babylonia were the one Jewish authority nobody argued with.
//
// So MLI now requires a son of David on the throne, and every chapter that can
// proclaim it offers a road to one — the shared house-of-David arc, or the
// chapter's own version where it has a better one (Beit Kosiba in 132, the
// crown of David in 614). All three raise the same flag.
//
// FIVE THINGS.
//   1. The requirement is real: everything else met and the crown still refused.
//   2. The shared card reaches a seated Jewish crown of scale — in every chapter
//      that can form MLI, and in none where the player keeps a different Torah.
//   3. The arc works end to end: marriage, a generation, the son, the crown.
//   4. Ezekiel's prince forecloses it, deliberately and permanently.
//   5. The two bespoke arcs raise the same flag, and the shared cards stand
//      down while either of them is running.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { FORMABLES } = await import(R + '/js/data/formables.js');
const { EVENTS_DAVID } = await import(R + '/js/data/events_house_of_david.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { allowedOptions, checkTriggeredEvents, resolveEventOption } = await import(R + '/js/sim/events.js');
const { EVENTS_132_KOSIBA } = await import(R + '/js/data/events_132ce_kosiba.js');

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
const card = (id) => EVENTS_DAVID.find((e) => e && e.id === id) || null;
const HOUSE = card('ev_hd_the_house_that_is_not_davids');
const SON = card('ev_hd_the_son_of_the_marriage');

function boot(eraId, tag, y) {
  const era = ERAS.find((e) => e.bookmark.id === eraId);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const game = initGame({
    DEFINES, MAP_DATA, geom: flatGeom, bookmark: era.bookmark, events: era.events,
    playerTag: tag, rngSeed: 9, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: flatGeom, bus: { emit() {}, on() { return () => {}; } },
    bookmark: era.bookmark, events: era.events, provinceMap,
  });
  game.wars = [];
  for (const k of Object.keys(game.tags)) game.tags[k].atWarWith = [];
  const t = game.tags[tag];
  t.alive = true; t.ai = false; t.overlord = null;
  if (y) game.date = { y, m: 6, d: 1 };
  return { game, ctx, era };
}

// A crown that has done everything the old checklist asked: the heartland, the
// twenty-five provinces, the faith, stability, legitimacy, peace.
function greatCrown(eraId, tag, y) {
  const w = boot(eraId, tag, y);
  const g = w.game;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable) continue;
    if (n++ < 40) {
      p.owner = tag; p.controller = tag; p.integration = 1;
      if (n <= 20) p.religion = 'judaism';
    }
  }
  for (const name of ['Jerusalem', 'Hebron', 'Neapolis', 'Sepphoris', 'Tiberias', 'Adora']) {
    const p = w.ctx.prov(name);
    if (p && !p.impassable) { p.owner = tag; p.controller = tag; p.integration = 1; p.religion = 'judaism'; }
  }
  const t = g.tags[tag];
  t.stability = 3; t.legitimacy = 100;
  t.ruler = { name: 'The King', title: 'King', gov: 4, infl: 4, mar: 4, age: 50 };
  return w;
}

function mliRows(w, tag) {
  const f = FORMABLES.find((x) => x.to === 'MLI' && x.from === tag);
  if (!f) return null;
  return (f.requires || []).map((r) => {
    let good = false;
    try { good = !!r.check(w.ctx, tag); } catch (e) { good = false; }
    return { label: r.label, ok: good };
  });
}

// ---------------------------------------------------------------------------
console.log('== the requirement is real ==');
{
  const w = greatCrown('66ce', 'JUD', 90);
  const rows = mliRows(w, 'JUD');
  ok(!!rows, 'the Kingdom of Israel is a formable of this chapter');
  const david = rows.find((r) => /son of David/.test(r.label));
  ok(!!david, '  and it asks for a son of David on the throne');
  const others = rows.filter((r) => r !== david);
  ok(others.every((r) => r.ok),
    '  a crown that meets every OTHER requirement: '
    + others.filter((r) => !r.ok).map((r) => r.label).join(', ') || '  every other requirement met');
  ok(david.ok === false, '  is still refused the crown');
  w.game.flags.davidicThrone = true;
  const after = mliRows(w, 'JUD');
  ok(after.every((r) => r.ok), 'and granted it the moment a Davidide is seated');
}

// ---------------------------------------------------------------------------
console.log('== the question reaches every chapter that can proclaim the crown ==');
{
  // Every chapter MLI is formable in must offer a road to the title, or the
  // formable is dead content there — the §135 lesson, applied forward.
  const chapters = new Set();
  for (const f of FORMABLES) {
    if (f.to !== 'MLI') continue;
    for (const b of (f.bookmarks || [])) chapters.add(b);
  }
  // Seven since §237 opened the crown to the rising of 351 — which plays the
  // house of David like its neighbours, and had nowhere to crown him.
  ok(chapters.size === 7,
    'MLI is formable in seven chapters (' + [...chapters].sort().join(', ') + ')');
  const missing = [];
  for (const id of chapters) {
    const era = ERAS.find((e) => e.bookmark.id === id);
    const ids = new Set((era ? era.events : []).filter(Boolean).map((e) => e.id));
    if (!ids.has('ev_hd_the_house_that_is_not_davids') || !ids.has('ev_hd_the_son_of_the_marriage')) {
      missing.push(id);
    }
  }
  ok(!missing.length, 'and every one of them plays the house of David ('
    + (missing.join(', ') || 'all ' + chapters.size) + ')');
}
{
  const w = greatCrown('167bce', 'HAS', -120);
  ok(HOUSE.trigger(w.ctx) === true, 'a seated Hasmonean crown of scale is asked the question');
  // …and a rising that is not yet a kingdom is not.
  const small = boot('167bce', 'HAS', -160);
  ok(HOUSE.trigger(small.ctx) === false, 'a band in the hills is not');
}
{
  // The Keepers reject the claim outright and have no king in their Torah.
  const w = greatCrown('529ce', 'SAM', 560);
  ok(HOUSE.trigger(w.ctx) === false,
    'a crown that keeps a different Torah is never asked');
  const era = ERAS.find((e) => e.bookmark.id === '529ce');
  const ids = new Set(era.events.map((e) => e && e.id));
  ok(ids.has('ev_hd_the_house_that_is_not_davids'),
    '  though the package is registered there, and shuts itself');
}

// ---------------------------------------------------------------------------
console.log('== …and not until the house has been a house (SPEC §148) ==');
{
  // Reported: this card arrived on the Maccabees on 1 August 166 BCE — eleven
  // months into the revolt, 1,800 men in the field, a battle running at Lydda —
  // opening with "the realm is large, the crown is secure, the succession is
  // orderly" and "the question has been asked for a generation". A rising that
  // overruns ten provinces in its first summer met the old gate exactly.
  const w = greatCrown('167bce', 'HAS', -166);
  w.game.date = { y: -166, m: 8, d: 1 };
  ok(w.ctx.helpers.chapterYears(w.ctx) < 1,
    'August 166 BCE is under a year into the chapter ('
    + w.ctx.helpers.chapterYears(w.ctx).toFixed(2) + ')');
  ok(HOUSE.trigger(w.ctx) === false,
    'and a crown that meets every OTHER test is still not asked in its first year');

  // The boundary, walked. The chapter opens in month 11, so twenty years lands
  // in month 11 of 147 BCE — which is also roughly where the history puts the
  // question: Simon wins independence in 142, Aristobulus takes the diadem 104.
  w.game.date = { y: -148, m: 11, d: 1 };
  ok(HOUSE.trigger(w.ctx) === false, 'nineteen years in: still not asked');
  w.game.date = { y: -147, m: 10, d: 1 };
  ok(HOUSE.trigger(w.ctx) === false, '  nor at nineteen years and eleven months');
  w.game.date = { y: -147, m: 11, d: 1 };
  ok(HOUSE.trigger(w.ctx) === true, 'at twenty years exactly, the chamber asks');

  // The other two sentences the card makes, now tested rather than assumed.
  const t = w.game.tags.HAS;
  t.regency = true;
  ok(HOUSE.trigger(w.ctx) === false,
    'a realm under a regency is not told its succession is orderly');
  t.regency = false;
  t.stability = -1;
  ok(HOUSE.trigger(w.ctx) === false, 'nor an unsettled one that its crown is secure');
  t.stability = 3;
  t.legitimacy = 20;
  ok(HOUSE.trigger(w.ctx) === false, '  nor one the country does not believe in');
  t.legitimacy = 100;
  ok(HOUSE.trigger(w.ctx) === true, 'and it returns when the realm is itself again');
}
{
  // The generation fits inside every chapter that can reach the card. The
  // tightest is 66 CE, which runs 34 years against a 20-year gate.
  const need = 20;
  for (const id of ['167bce', '67bce', '40bce', '66ce', '614ce']) {
    const era = ERAS.find((e) => e.bookmark.id === id);
    const span = (era.bookmark.generationHorizon || 0) - era.bookmark.startDate.y;
    ok(span > need,
      id + ' runs ' + span + ' years, so a ' + need + '-year gate leaves room');
  }
}

// ---------------------------------------------------------------------------
console.log('== the arc: a marriage, a generation, a son, a crown ==');
{
  const w = greatCrown('167bce', 'HAS', -120);
  // The eastern road has to be open: the line is kept at Nehardea.
  const marry = HOUSE.options.findIndex((o) => /Send to Babylonia/.test(o.label));
  ok(marry === 0, 'the Babylonian marriage is the first answer');
  ok(typeof HOUSE.options[marry].when === 'function',
    '  and it is gated on a road east rather than merely priced');
  for (const k of ['PAR', 'SAS', 'ADI', 'OSR', 'CHX']) {
    if (w.game.tags[k]) w.game.tags[k].alive = false;
  }
  let allowed = allowedOptions(w.ctx, HOUSE);
  ok(!!allowed && allowed.indexOf(marry) < 0,
    '  with the east shut, the marriage is not offered at all (§128)');
  for (const k of ['PAR']) if (w.game.tags[k]) w.game.tags[k].alive = true;
  allowed = allowedOptions(w.ctx, HOUSE);
  ok(!allowed || allowed.indexOf(marry) >= 0, '  and with Parthia standing, it is');

  HOUSE.options[marry].effects(w.ctx);
  ok(!!w.game.flags.davidicMarriage && w.game.flags.davidicMarriageYear === -120,
    'the marriage is made, and the year is remembered');
  ok(!w.game.flags.davidicThrone, '  and a wedding is not a pedigree');
  ok(SON.trigger(w.ctx) === false, '  the son is not asked for the year after');

  w.game.date = { y: -96, m: 6, d: 1 }; // a generation
  ok(SON.trigger(w.ctx) === true, 'a generation later the son is asked for');
  const seat = SON.options.findIndex((o) => /Seat him/.test(o.label));
  SON.options[seat].effects(w.ctx);
  ok(!!w.game.flags.davidicThrone, 'and seating him puts a son of David on the throne');
  ok(!!w.game.flags.exilarchateHasAClaim,
    '  at the price Babylonia came to name');
  const rows = mliRows(w, 'HAS');
  ok(rows.every((r) => r.ok), 'the Kingdom of Israel is now within reach');
}
{
  // Passing him over is the other half of Herod's answer, minus the murders.
  const w = greatCrown('167bce', 'HAS', -120);
  HOUSE.options[0].effects(w.ctx);
  w.game.date = { y: -96, m: 6, d: 1 };
  const pass = SON.options.findIndex((o) => /crown stays where it is/.test(o.label));
  SON.options[pass].effects(w.ctx);
  ok(!w.game.flags.davidicThrone, 'passing him over leaves the throne where it was');
  ok(SON.trigger(w.ctx) === false, '  and the question is not asked twice');
  const rows = mliRows(w, 'HAS');
  ok(rows.some((r) => /son of David/.test(r.label) && !r.ok),
    '  and the crown of Israel stays out of reach');
}

// ---------------------------------------------------------------------------
console.log('== the answers that close the door, and the one that does not ==');
{
  const w = greatCrown('66ce', 'JUD', 90);
  const ezek = HOUSE.options.findIndex((o) => /A prince, not a king/.test(o.label));
  HOUSE.options[ezek].effects(w.ctx);
  ok(!!w.game.flags.davidicRenounced && !!w.game.flags.davidicAnswered,
    'Ezekiel\'s prince is an answer, and a final one');
  ok(HOUSE.trigger(w.ctx) === false, '  the question is not reopened');
  ok(!w.game.flags.davidicThrone,
    '  and it forecloses the crown of Israel, which is what the card says it does');
}
{
  const w = greatCrown('66ce', 'JUD', 90);
  const defer = HOUSE.options.findIndex((o) => /stands on what it won/.test(o.label));
  HOUSE.options[defer].effects(w.ctx);
  ok(!!w.game.flags.davidicDeferred, 'the Hasmonean non-answer is recorded');
  ok(!w.game.flags.davidicAnswered && HOUSE.trigger(w.ctx) === true,
    '  and it postpones rather than settles: a later reign may take it up');
}
{
  const w = greatCrown('66ce', 'JUD', 90);
  const forge = HOUSE.options.findIndex((o) => /Search the archives/.test(o.label));
  HOUSE.options[forge].effects(w.ctx);
  ok(!!w.game.flags.davidicForged, 'the commissioned genealogy is an answer');
  ok(!w.game.flags.davidicThrone,
    '  and it does not seat a Davidide, it only says one is seated');
}

// ---------------------------------------------------------------------------
console.log('== the chapters that ask it in their own voice ==');
{
  const src132 = (await import('fs')).readFileSync(R + '/js/data/events_132ce_kosiba.js', 'utf8');
  ok(/setFlag\(ctx, 'davidicThrone', true\)/.test(src132),
    '132: the grandson of the Davidic marriage raises the shared flag');
  const src614 = (await import('fs')).readFileSync(R + '/js/data/events_614ce_david.js', 'utf8');
  ok(/setFlag\(ctx, 'davidicThrone', true\)/.test(src614),
    '614: the crown of David raises it too');
}
{
  // …and while either arc is running the shared cards keep quiet, so a court
  // is never asked the same question twice in one campaign.
  const w = greatCrown('132ce', 'JUD', 200);
  ok(HOUSE.trigger(w.ctx) === true, '132 before the redemption: the shared card is available');
  w.game.flags.redemptionEra = true;
  ok(HOUSE.trigger(w.ctx) === false, '  and stands down once Beit Kosiba is asked instead');
  const v = greatCrown('614ce', 'JUD', 640);
  v.game.flags.oneCrownBothCentres = true;
  ok(HOUSE.trigger(v.ctx) === false, '614: it stands down for the line of Jehoiachin');
}

// ---------------------------------------------------------------------------
// SPEC §178 — the road to the crown was longer than the game. §148 sized the
// generation gate against the chapters and measured one card of a two-card
// arc: 20 (the question) + 22 (the son) is 42, so in 66 CE (span 34) the son
// could arrive no earlier than 108 — eight years past the horizon — and in
// 67 BCE he landed on the horizon year itself. The gate now bends to the
// chapter; the seated son is a real king; the deferred question returns; the
// proclamation styles its proclaimer.
console.log('== §178: the road fits the chapter ==');
{
  // 66 CE: span 34 → gate 7. The question comes two years after the
  // negotiated peace of 71, not twenty years into a 34-year chapter.
  const w = greatCrown('66ce', 'JUD', 73);
  w.game.date = { y: 73, m: 5, d: 1 };
  ok(HOUSE.trigger(w.ctx) === false, '66 CE at six years and eleven months: not asked');
  w.game.date = { y: 73, m: 6, d: 1 };
  ok(HOUSE.trigger(w.ctx) === true, '  at seven — two years after the peace of 71 — asked');
  HOUSE.options[0].effects(w.ctx);
  w.game.date = { y: 95, m: 6, d: 1 };
  ok(SON.trigger(w.ctx) === true,
    'and the son arrives at 95, inside a chapter whose horizon is 100');
}
{
  // 67 BCE: span 42 → gate 15. The arc used to complete at the horizon
  // year −25 at the theoretical earliest; now the son can arrive by −30.
  const w = greatCrown('67bce', 'HYR', -52);
  w.game.date = { y: -53, m: 4, d: 1 };
  ok(HOUSE.trigger(w.ctx) === false, '67 BCE at fourteen years: not asked');
  w.game.date = { y: -52, m: 4, d: 1 };
  ok(HOUSE.trigger(w.ctx) === true, '  at fifteen, it is');
  // (167 keeps the full twenty — the §148 boundary walk above is unchanged.)
}

console.log('== §178: seating him means seating him ==');
{
  const w = greatCrown('167bce', 'HAS', -120);
  HOUSE.options[0].effects(w.ctx);
  w.game.date = { y: -96, m: 6, d: 1 };
  w.game.tags.HAS.heir = { name: 'Somebody Else', gov: 2, infl: 2, mar: 2, age: 20 };
  const seat = SON.options.findIndex((o) => /Seat him/.test(o.label));
  SON.options[seat].effects(w.ctx);
  const r = w.game.tags.HAS.ruler;
  ok(!!r && r.name === 'Zerubbabel' && r.age === 26,
    'the son takes the throne by name, at the card\'s own age');
  ok(w.game.tags.HAS.heir === null,
    '  and the old house\'s designated heir goes with the old house');
}
{
  // 132's verb is "pass": heir today, crowned by the ordinary machinery
  // when the present reign ends.
  const w = boot('132ce', 'JUD', 200);
  const grand = EVENTS_132_KOSIBA.find((e) => e && e.id === 'ev_bk_the_grandson');
  const pass = grand.options.findIndex((o) => /succession pass/.test(o.label));
  grand.options[pass].effects(w.ctx);
  const h = w.game.tags.JUD.heir;
  ok(!!h && h.name === 'Yehoyakhin bar Kosiba' && h.age === 31,
    '132: the grandson stands first in the succession');
  ok(!!w.game.flags.davidicThrone, '  and the shared flag is already up');
  w.ctx.helpers.rulerDies(w.ctx, 'JUD', 'has died');
  ok(!!w.game.tags.JUD.ruler && w.game.tags.JUD.ruler.name === 'Yehoyakhin bar Kosiba',
    '  and the ordinary machinery crowns him when the reign ends');
}

console.log('== §178: the postponed question returns ==');
{
  const w = greatCrown('167bce', 'HAS', -120);
  checkTriggeredEvents(w.ctx);
  const mine = w.game.pendingEvents.filter((pe) => pe.eventId === HOUSE.id);
  ok(mine.length === 1, 'the pipeline queues the question');
  const defer = HOUSE.options.findIndex((o) => /stands on what it won/.test(o.label));
  resolveEventOption(w.ctx, mine[0].instanceId, defer);
  ok(!!w.game.flags.davidicDeferred && !w.game.flags.davidicAnswered,
    '  the Hasmonean non-answer defers rather than settles');
  w.game.pendingEvents.length = 0;
  checkTriggeredEvents(w.ctx);
  ok(w.game.pendingEvents.every((pe) => pe.eventId !== HOUSE.id),
    '  and the chamber does not ask again the same month');
  w.game.date = { y: -106, m: 6, d: 1 };
  checkTriggeredEvents(w.ctx);
  ok(w.game.pendingEvents.every((pe) => pe.eventId !== HOUSE.id),
    '  nor fourteen years on');
  w.game.date = { y: -105, m: 6, d: 1 };
  checkTriggeredEvents(w.ctx);
  const again = w.game.pendingEvents.find((pe) => pe.eventId === HOUSE.id);
  ok(!!again, 'a reign later, it asks again — the §138 postponement is real now');
  const ezek = HOUSE.options.findIndex((o) => /A prince, not a king/.test(o.label));
  resolveEventOption(w.ctx, again.instanceId, ezek);
  w.game.pendingEvents.length = 0;
  w.game.date = { y: -80, m: 6, d: 1 };
  checkTriggeredEvents(w.ctx);
  ok(w.game.pendingEvents.every((pe) => pe.eventId !== HOUSE.id),
    '  while a real answer shuts it for good');
}

console.log('== §178: the proclamation styles the king ==');
{
  const w = greatCrown('167bce', 'HAS', -120);
  w.game.flags.davidicThrone = true;
  gameActions(w.ctx).enactDecision('form_mli_has');
  ok(w.game.playerTag === 'MLI', 'the Kingdom of Israel is proclaimed through the decision surface');
  ok(!!w.game.tags.MLI.ruler && w.game.tags.MLI.ruler.title === 'King of Israel',
    '  and the proclaimer is styled King of Israel');
}
{
  const w = greatCrown('167bce', 'HAS', -120);
  w.game.flags.davidicThrone = true;
  w.game.tags.HAS.ruler.title = 'King of Israel, of the House of David';
  gameActions(w.ctx).enactDecision('form_mli_has');
  ok(!!w.game.tags.MLI && w.game.tags.MLI.ruler.title === 'King of Israel, of the House of David',
    'the 614 coronation\'s fuller style is not shortened by the proclamation');
}

console.log(failures ? `smoke93: ${failures} FAIL` : 'smoke93: ALL PASS');
process.exit(failures ? 1 : 0);
