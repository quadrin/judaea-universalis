// Headless regression — SPEC §153, §154. Two reports about the greater crown,
// both of the same shape: a card that says a thing happens, and nothing happens.
//
// §154. THE SON IS NOT SEATED. The house-of-David arc collects on the marriage
// a generation later with an option labelled "Seat him", whose chronicle line
// reads "the son of the Babylonian marriage is seated". It set four flags, paid
// thirty-five legitimacy, and left the same man on the ruler card. The 132
// chapter's own version of the card — "Let the succession pass to him", "The
// succession passes to the son of the Babylonian marriage" — did the same. The
// 614 chapter's version always seated its Davidide, which is the shape the
// other two were supposed to have.
//
// §153. THE CROWN ATE THE CHAPTER'S MISSIONS. `missionsFor` returned the formed
// crown's own chain INSTEAD of the one the realm was working through, and both
// proclamation paths reset `missionIdx` to zero. Proclaiming the Kingdom of
// Israel is the reward for exactly the campaign the chapter's missions are
// about, so the proclamation deleted the war it was won with: a player who took
// the crown mid-revolt lost Brothers of the Diaspora, Cleanse Samaria and The
// Freedom of Zion unfinished and unpaid, and lost the completed ones off the
// panel with them. This is the §135 lesson on a surface §135 did not reach.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { FORMABLES } = await import(R + '/js/data/formables.js');
const { EVENTS_DAVID } = await import(R + '/js/data/events_house_of_david.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { missionsFor, checkMissions } = await import(R + '/js/sim/realm.js');
const { gameActions } = await import(R + '/js/sim/init.js');

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

// A crown that meets the whole MLI checklist except the one being tested.
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

const card = (id) => EVENTS_DAVID.find((e) => e && e.id === id) || null;
const SON = card('ev_hd_the_son_of_the_marriage');
const HOUSE = card('ev_hd_the_house_that_is_not_davids');

// ---------------------------------------------------------------------------
console.log('== §154: "Seat him" seats him ==');
{
  const w = greatCrown('167bce', 'HAS', -120);
  HOUSE.options.find((o) => /Send to Babylonia/.test(o.label)).effects(w.ctx);
  w.game.date = { y: -96, m: 6, d: 1 };
  const before = { ...w.game.tags.HAS.ruler };
  const seat = SON.options.find((o) => /Seat him/.test(o.label));
  seat.effects(w.ctx);
  const after = w.game.tags.HAS.ruler;
  ok(!!w.game.flags.davidicThrone, 'the flag is raised, as it always was');
  ok(after.name !== before.name,
    'and the man on the throne is a different man ("' + before.name + '" → "' + after.name + '")');
  ok(after.age === 26, '  he is the twenty-six-year-old the card describes (age ' + after.age + ')');
  ok(after.gov >= 4 && after.infl >= 4 && after.mar <= 2,
    '  a chancery man and no soldier (gov ' + after.gov + ', infl ' + after.infl + ', mar ' + after.mar + ')');
  ok(after.title === before.title,
    '  wearing the crown\'s own title, not a new one (' + after.title + ')');
  ok(!w.game.tags.HAS.regency, '  and he rules in his own name');
  // The name comes from the chapter's court pool (SPEC §143), which is how any
  // other successor is named — the shared card runs in six chapters and cannot
  // hard-code a name that is right in all of them.
  ok(typeof after.name === 'string' && after.name.length > 2 && after.name !== 'The Heir',
    '  named out of the chapter\'s own pool: ' + after.name);
}
{
  // Passing him over must leave the throne alone — the same test from the
  // other side, so the fix cannot be "always change the ruler".
  const w = greatCrown('167bce', 'HAS', -120);
  HOUSE.options.find((o) => /Send to Babylonia/.test(o.label)).effects(w.ctx);
  w.game.date = { y: -96, m: 6, d: 1 };
  const before = { ...w.game.tags.HAS.ruler };
  SON.options.find((o) => /crown stays where it is/.test(o.label)).effects(w.ctx);
  ok(w.game.tags.HAS.ruler.name === before.name,
    'and passing him over leaves the reigning king exactly where he was');
}
{
  // 132's own version of the card, which asks the question in its own voice.
  const era = ERAS.find((e) => e.bookmark.id === '132ce');
  const gs = era.events.find((e) => e && e.id === 'ev_bk_the_grandson');
  ok(!!gs, 'the 132 chapter asks it too, as the grandson of Jehoiachin');
  const w = greatCrown('132ce', 'JUD', 180);
  const before = { ...w.game.tags.JUD.ruler };
  gs.options.find((o) => /Let the succession pass to him/.test(o.label)).effects(w.ctx);
  const after = w.game.tags.JUD.ruler;
  ok(!!w.game.flags.davidicThrone, '  and its answer raises the same flag');
  ok(after.name !== before.name,
    '  and the succession actually passes ("' + before.name + '" → "' + after.name + '")');
  ok(after.age === 31, '  to the thirty-one-year-old the card describes (age ' + after.age + ')');
}
{
  // 614 always did this correctly; it is the shape the other two now have.
  const era = ERAS.find((e) => e.bookmark.id === '614ce');
  const crown = era.events.find((e) => e && e.id === 'ev_d_the_crown_of_david');
  ok(!!crown, '614 crowns its Davidide by name, and always did');
  const w = greatCrown('614ce', 'JUD', 660);
  const before = { ...w.game.tags.JUD.ruler };
  crown.options[0].effects(w.ctx);
  ok(w.game.tags.JUD.ruler.name !== before.name && /David/.test(w.game.tags.JUD.ruler.name),
    '  David ben Zakkai takes the throne (' + w.game.tags.JUD.ruler.name + ')');
}

// ---------------------------------------------------------------------------
console.log('== §153: a greater crown inherits the chapter\'s business ==');
{
  const w = greatCrown('66ce', 'JUD', 90);
  const chapterChain = missionsFor(w.ctx, 'JUD').map((m) => m.name);
  ok(chapterChain.indexOf('Brothers of the Diaspora') >= 0,
    'Judaea works through the revolt\'s chain (' + chapterChain.length + ' missions)');

  // Three of them already done, which is the half of the loss that cannot be
  // earned back: the list the panel reads is the list that records what is done.
  w.game.tags.JUD.missionIdx = 3;
  w.game.flags.davidicThrone = true;
  const before = w.ctx.helpers.livingTag(w.ctx, 'JUD');
  ok(before === 'JUD', 'and it is Judaea that proclaims the kingdom');
  gameActions(w.ctx).enactDecision('form_mli_jud');
  ok(w.game.playerTag === 'MLI', 'the Kingdom of Israel is proclaimed');

  const chain = missionsFor(w.ctx, 'MLI').map((m) => m.name);
  for (const name of chapterChain) {
    ok(chain.indexOf(name) >= 0, '  the crown keeps "' + name + '"');
  }
  const own = FORMABLES.find((f) => f.id === 'form_mli_jud').missions.map((m) => m.name);
  for (const name of own) ok(chain.indexOf(name) >= 0, '  and adds "' + name + '"');
  ok(chain.indexOf(own[0]) > chain.indexOf(chapterChain[chapterChain.length - 1]),
    '  the kingdom\'s work comes after the chapter\'s, not instead of it');
  ok(w.game.tags.MLI.missionIdx === 3,
    '  and the three already earned are still earned (idx ' + w.game.tags.MLI.missionIdx + ')');
  ok(chain.length === chapterChain.length + own.length,
    '  nothing is duplicated (' + chain.length + ' = ' + chapterChain.length + ' + ' + own.length + ')');
}
{
  // The chain must still RUN under the new banner, not merely be listed: the
  // chapter's checks are written against 'JUD' and reach the crown through the
  // forwarding address (SPEC §135).
  const w = greatCrown('66ce', 'JUD', 90);
  w.game.flags.davidicThrone = true;
  w.game.tags.JUD.missionIdx = 2; // The Coastal Road: take Caesarea Maritima
  const chain = missionsFor(w.ctx, 'JUD');
  ok(chain[2].name === 'The Coastal Road', 'the current mission is ' + chain[2].name);
  gameActions(w.ctx).enactDecision('form_mli_jud');
  const p = w.ctx.prov('Caesarea Maritima');
  p.owner = 'MLI'; p.controller = 'MLI';
  checkMissions(w.ctx);
  ok(w.game.tags.MLI.missionIdx > 2,
    'and a mission written for Judaea is completed by the Kingdom of Israel '
    + '(idx 2 → ' + w.game.tags.MLI.missionIdx + ')');
}
{
  // A tag with no inherited chain at all still gets the crown's own, and a
  // chapter tag with a chain of its own is untouched by any of this.
  const w = greatCrown('66ce', 'JUD', 90);
  const rom = missionsFor(w.ctx, 'ROM');
  ok(Array.isArray(rom) && rom.length, 'Rome still reads its own chain (' + rom.length + ')');
  ok(missionsFor(w.ctx, 'PAR') === null, 'and a tag the chapter gave none has none');
}

console.log(failures ? `smoke101: ${failures} FAILURES` : 'smoke101: ALL PASS');
process.exit(failures ? 1 : 0);
