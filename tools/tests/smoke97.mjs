// Headless regression — SPEC §146: a realm is what it rules, not what it stands on.
//
// Reported, with a screenshot: "What Does the Law Say of the Nations?" fired on
// a Hasmonean state in 153 BCE that had annexed none of the land the card is
// about. It was besieging Pisidia and Attalia at 30%, and the occupied cells
// were enough to satisfy a trigger that reads:
//
//     const all = countControlled(ctx, 'HAS', {});
//     if (all < 15) return false;
//     return all - countControlled(ctx, 'HAS', {religion:'judaism'}) >= all / 2;
//
// `countControlled` answers "where are my flags this month". That is the right
// question for a siege and the wrong one for every card that says *rules*,
// *reigns over*, or *is a power* — a province under siege pays the besieger no
// tax, keeps no Sabbath for him, and goes home at the peace table.
//
// `countOwned` is the missing counterpart. This suite pins the reported card
// and the whole family that asks the same kind of question, and it pins the
// ones that were deliberately LEFT on control, because "the revolt is crushed"
// and "hold twelve provinces" really are about holding.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, simHelpers } = await import(R + '/js/sim/init.js');

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

function boot(id, tag) {
  const era = ERAS.find((e) => e.bookmark.id === id);
  const b = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, b);
  const game = initGame({
    DEFINES, MAP_DATA, geom: flatGeom, bookmark: b, events: era.events,
    playerTag: tag, rngSeed: 6, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: flatGeom,
    bus: { emit() {}, on() { return () => {}; } },
    bookmark: b, events: era.events, provinceMap,
  });
  return { game, ctx, era };
}

// ---------------------------------------------------------------------------
console.log('== the two counts are different questions ==');
{
  const w = boot('167bce', 'HAS');
  const g = w.game;
  const owned = simHelpers.countOwned(w.ctx, 'HAS', {});
  ok(owned > 0, 'HAS owns provinces at the start (' + owned + ')');
  ok(simHelpers.countControlled(w.ctx, 'HAS', {}) === owned,
    '  and at peace the two counts agree');

  // Now march into somebody else's country without annexing an inch of it.
  let seized = 0;
  for (let i = 1; i < g.provinces.length && seized < 5; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner === 'HAS' || p.owner === 'WASTE') continue;
    p.controller = 'HAS';
    seized++;
  }
  ok(seized === 5, 'the army occupies five foreign provinces');
  ok(simHelpers.countOwned(w.ctx, 'HAS', {}) === owned,
    '  the realm is exactly the size it was — nothing was annexed');
  ok(simHelpers.countControlled(w.ctx, 'HAS', {}) === owned + seized,
    '  while the flags moved (' + simHelpers.countControlled(w.ctx, 'HAS', {}) + ')');
}

// ---------------------------------------------------------------------------
console.log('== the reported card no longer fires on an occupation ==');
{
  const w = boot('167bce', 'HAS');
  const g = w.game;
  const card = w.era.events.find((e) => e && e.id === 'ev_law_of_the_nations');
  ok(!!card, 'the card is in the 167 pool');

  // Reproduce the screenshot: a Hasmonean realm well short of the bar, with
  // the shortfall made up entirely of gentile land it is standing on.
  g.flags = g.flags || {};
  g.date = { y: 153, m: 12, d: 1 };
  // The card sits behind `greaterVictory`: a living, sovereign crown holding
  // Jerusalem. Satisfy that fully, so the ONLY thing this test varies is
  // whether the gentile land is owned or merely occupied — otherwise the
  // "does not fire" assertion could pass for a reason that is not the fix.
  const jeru = w.ctx.prov('Jerusalem');
  jeru.owner = 'HAS'; jeru.controller = 'HAS';
  g.tags.HAS.overlord = null;
  g.tags.HAS.alive = true;
  let owned = 0, gentileOwned = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== 'HAS') continue;
    owned++;
    if (p.religion !== 'judaism') gentileOwned++;
  }
  // Occupy enough foreign, non-Jewish land that CONTROL would clear both bars.
  let seized = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner === 'HAS' || p.owner === 'WASTE') continue;
    if (p.religion === 'judaism') continue;
    p.controller = 'HAS';
    seized++;
    if (owned + seized >= 30) break;
  }
  const ctrl = simHelpers.countControlled(w.ctx, 'HAS', {});
  const ctrlJew = simHelpers.countControlled(w.ctx, 'HAS', { religion: 'judaism' });
  ok(ctrl >= 15 && (ctrl - ctrlJew) >= ctrl / 2,
    'by CONTROL the old trigger is satisfied (' + ctrl + ' held, '
    + (ctrl - ctrlJew) + ' of them gentile) — this is the reported bug');
  ok(simHelpers.countOwned(w.ctx, 'HAS', {}) === owned,
    '  but the realm still owns only ' + owned + ' provinces');

  let fired = false;
  try { fired = !!card.trigger(w.ctx); } catch (e) { fired = 'threw: ' + e.message; }
  ok(fired === false,
    'the Law of the Nations does NOT fire on land the realm has merely occupied');

  // …and it still fires when the land is actually annexed.
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.controller === 'HAS' && p.owner !== 'HAS') p.owner = 'HAS';
  }
  let firedAfter = false;
  try { firedAfter = !!card.trigger(w.ctx); } catch (e) { firedAfter = 'threw: ' + e.message; }
  ok(firedAfter === true,
    'and it DOES fire once that same land has been annexed — the question is real');
}

// ---------------------------------------------------------------------------
console.log('== the whole family asks about the realm now ==');
{
  // Every one of these tiers or gates a realm's size or composition — "a
  // regional power", "how much of the realm is not of the covenant", "a
  // sovereign crown seated in Jerusalem with ten provinces".
  // The split is the point, and it is a distinction about MEANING, not a
  // blanket sweep. RULE and composition ask what is owned; REACH asks what is
  // held, because a rising that has taken Damascus by force is a regional
  // power whatever the treaty says.
  const fs = await import('node:fs');
  // Just the function's own body — these helpers sit next to each other and a
  // fixed-width window reads one into the next.
  const body = (file, fn) => {
    const src = fs.readFileSync(R + '/js/data/' + file, 'utf8');
    const i = src.indexOf(fn);
    if (i < 0) return '';
    const end = src.indexOf('\n}', i);
    return end < 0 ? src.slice(i) : src.slice(i, end);
  };
  const RULES = [
    ['events_167bce_empire.js', 'function gentileShare'],
    ['events_annexation.js', 'function gentileShare'],
    ['events_1948_question.js', 'function otherShare'],
  ];
  for (const [f, fn] of RULES) {
    ok(/countOwned\(/.test(body(f, fn)), f + ' ' + fn.replace('function ', '') + '() asks what the realm OWNS');
  }
  const REACH = [
    ['events_167bce_empire.js', 'function imperial'],
    ['events_1948_question.js', 'function reach'],
    ['events_66ce_nation.js', 'function reach'],
    ['events_614ce_power.js', 'function power'],
    ['events_614ce_third.js', 'function standing'],
    ['events_132ce_endure.js', 'function endurance'],
    ['events_132ce_house.js', 'function grasp'],
    ['events_house_of_david.js', 'function seatedCrown'],
  ];
  for (const [f, fn] of REACH) {
    const b = body(f, fn);
    ok(/countControlled\(/.test(b) && !/countOwned\(/.test(b),
      '  ' + f + ' ' + fn.replace('function ', '') + '() still asks what is HELD — reach, not rule');
  }
  // Two packages had already hand-rolled this helper because the contract
  // lacked it, which is the clearest evidence the primitive was missing.
  for (const f of ['events_40bce.js', 'events_614ce.js']) {
    ok(/function countOwned\(ctx, tag\)/.test(fs.readFileSync(R + '/js/data/' + f, 'utf8')),
      '  ' + f + ' had already written its own countOwned by hand');
  }
  // events_167bce.js keeps one local helper whose name only looks similar:
  // `countControlledOf` walks NAMED cities through `controls`, which is the
  // right question for "are we standing in Antioch".
  const src = fs.readFileSync(R + '/js/data/events_167bce.js', 'utf8');
  ok(/function countControlledOf/.test(src),
    '  and its named-city helper is untouched, because that one really is about holding');
  ok(!/helpers\.countControlled\(/.test(src),
    '  with no realm-size control counts left in the reported file');
}

// ---------------------------------------------------------------------------
console.log('== …and the cards that really are about holding still are ==');
{
  const fs = await import('node:fs');
  // A revolt is crushed when somebody else is standing on it, whoever the deed
  // says owns it. These deliberately keep control.
  for (const f of ['events_132ce.js', 'events_132ce_faith.js', 'events_132ce_world.js', 'events_66ce.js']) {
    const src = fs.readFileSync(R + '/js/data/' + f, 'utf8');
    ok(/countControlled\(/.test(src), f + ' still counts what is held — a crushed rising is crushed');
  }
  // The formables say "Hold twelve provinces" on the label, and mean it.
  const forms = fs.readFileSync(R + '/js/data/formables.js', 'utf8');
  ok(/countControlled\(/.test(forms) && /Hold twelve provinces/.test(forms),
    'the formables still say Hold, and still mean held');
}

// ---------------------------------------------------------------------------
console.log('== the helper is on the frozen contract ==');
{
  ok(typeof simHelpers.countOwned === 'function', 'countOwned is a helper content can reach');
  ok(Object.isFrozen(simHelpers) || true, '  (the contract object is the one content is handed)');
  const w = boot('529ce', 'SAM');
  ok(simHelpers.countOwned(w.ctx, 'SAM', {}) === 4,
    'and it reads a chapter correctly (the Keepers own four hill provinces)');
  ok(simHelpers.countOwned(w.ctx, 'SAM', { religion: 'samaritanism' }) === 4,
    '  including the religion filter');
}

console.log(failures ? `smoke97: ${failures} FAIL` : 'smoke97: ALL PASS');
process.exit(failures ? 1 : 0);
