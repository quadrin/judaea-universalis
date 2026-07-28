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
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { allowedOptions } = await import(R + '/js/sim/events.js');

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
  const w = greatCrown('66ce', 'JUD', 80);
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
  ok(chapters.size === 6,
    'MLI is formable in six chapters (' + [...chapters].sort().join(', ') + ')');
  const missing = [];
  for (const id of chapters) {
    const era = ERAS.find((e) => e.bookmark.id === id);
    const ids = new Set((era ? era.events : []).filter(Boolean).map((e) => e.id));
    if (!ids.has('ev_hd_the_house_that_is_not_davids') || !ids.has('ev_hd_the_son_of_the_marriage')) {
      missing.push(id);
    }
  }
  ok(!missing.length, 'and every one of them plays the house of David ('
    + (missing.join(', ') || 'all six') + ')');
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
  const w = greatCrown('66ce', 'JUD', 80);
  const ezek = HOUSE.options.findIndex((o) => /A prince, not a king/.test(o.label));
  HOUSE.options[ezek].effects(w.ctx);
  ok(!!w.game.flags.davidicRenounced && !!w.game.flags.davidicAnswered,
    'Ezekiel\'s prince is an answer, and a final one');
  ok(HOUSE.trigger(w.ctx) === false, '  the question is not reopened');
  ok(!w.game.flags.davidicThrone,
    '  and it forecloses the crown of Israel, which is what the card says it does');
}
{
  const w = greatCrown('66ce', 'JUD', 80);
  const defer = HOUSE.options.findIndex((o) => /stands on what it won/.test(o.label));
  HOUSE.options[defer].effects(w.ctx);
  ok(!!w.game.flags.davidicDeferred, 'the Hasmonean non-answer is recorded');
  ok(!w.game.flags.davidicAnswered && HOUSE.trigger(w.ctx) === true,
    '  and it postpones rather than settles: a later reign may take it up');
}
{
  const w = greatCrown('66ce', 'JUD', 80);
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

console.log(failures ? `smoke93: ${failures} FAIL` : 'smoke93: ALL PASS');
process.exit(failures ? 1 : 0);
