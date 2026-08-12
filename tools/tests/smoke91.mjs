// Headless regression — SPEC §136: The Keepers, 529 CE.
//
// The one chapter whose player is not Jewish, and the assertions that matter
// are the ones that would silently rot if somebody later "tidied" the shared
// assumptions this chapter breaks:
//
//   1. The start position IS four hill provinces. Two of the four are latent
//      cells of SEBASTE — the Christian garrison town five miles away — so a
//      missing `activeProvinces` would quietly hand the community's own
//      farmland to the thing watching it and nobody would notice until they
//      played it.
//   2. Gerizim is the holy site and it is keyed to samaritanism, not judaism.
//      `monthlyHolySites` pays whoever CONTROLS it and docks every realm of
//      that faith while it is in the wrong hands, so the mountain is a live
//      mechanic before a single card fires — and the empire starts holding it.
//   3. The chapter opens with a statute, not an army: the opening modifier is
//      on the books at month one and the war exists at month one.
//   4. The five opening cards reach a player, in order, and the register is
//      right — restraint at the bishop's card must NOT buy imperial goodwill.
//   5. The victory contract counts PEOPLE, not provinces: the survival win
//      reads provinces of the Torah wherever their banner flies, so it still
//      answers for a community that has lost its state.
//   6. The shared antique pool is registered but the annexation cards stay
//      shut, because `jewishCrown` gates on the crown's own religion.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS, GENERIC_EVENTS } = await import(R + '/js/data/compendium.js');
const { BOOKMARK_529 } = await import(R + '/js/data/bookmark_529ce.js');
const { EVENTS_529 } = await import(R + '/js/data/events_529ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { fireEvent, checkTriggeredEvents } = await import(R + '/js/sim/events.js');
const { HOLY_FAITH } = await import(R + '/js/sim/realm.js');
const { campaignGuidance } = await import(R + '/js/data/campaign_guidance.js');

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
const era529 = ERAS.find((e) => e.bookmark.id === '529ce');
const card = (id) => EVENTS_529.find((e) => e && e.id === id) || null;

function boot(tag, { bus, y, m } = {}) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_529);
  const events = era529.events;
  const game = initGame({
    DEFINES, MAP_DATA, geom: flatGeom, bookmark: BOOKMARK_529, events,
    playerTag: tag, rngSeed: 11, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: flatGeom,
    bus: bus || { emit() {}, on() { return () => {}; } },
    bookmark: BOOKMARK_529, events, provinceMap,
  });
  if (y) game.date = { y, m: m || 6, d: 1 };
  const t = game.tags[tag];
  if (t) { t.alive = true; t.ai = false; t.overlord = null; }
  return { game, ctx, events };
}

// ---------------------------------------------------------------------------
console.log('== the chapter is registered and it is the seventh ==');
{
  ok(!!era529, 'the era registry carries 529ce');
  ok(ERAS.indexOf(era529) === 6,
    '  in chronological order, between the rising against Gallus and the Persian conquest');
  const ids = ERAS.map((e) => e.bookmark.id);
  const years = ERAS.map((e) => e.bookmark.startDate.y);
  ok(years.every((y, i) => i === 0 || y > years[i - 1]),
    '  and the carousel is still sorted by date (' + ids.join(' → ') + ')');
  ok(!!DEFINES.TAGS.SAM && DEFINES.TAGS.SAM.religion === 'samaritanism'
    && DEFINES.TAGS.SAM.culture === 'samaritan',
  'SAM exists and keeps its own Torah and its own culture');
  ok(DEFINES.GOV_OF.SAM === 'theocracy',
    '  under a priesthood, which is the office the chapter puts in dispute');
  ok(!!campaignGuidance('529ce', 'SAM', { y: 529, m: 3 }),
    'the outliner has guidance for the Keepers');
  ok(!!campaignGuidance('529ce', 'BYZ', { y: 529, m: 3 }),
    '  and for the empire');
}

// ---------------------------------------------------------------------------
console.log('== four hill provinces, and two of them are latent cells of Sebaste ==');
{
  const w = boot('SAM');
  const mine = [];
  let keepers = 0;
  for (let i = 1; i < w.game.provinces.length; i++) {
    const p = w.game.provinces[i];
    if (!p || p.impassable) continue;
    if (p.owner === 'SAM') mine.push(p.name);
    if (p.religion === 'samaritanism') keepers++;
  }
  ok(mine.length === 4, 'the rising starts with four provinces (' + mine.join(', ') + ')');
  for (const n of ['Neapolis', 'Jenin', 'Tulkarm', 'Qalqilya']) {
    ok(mine.indexOf(n) >= 0, '  ' + n + ' is its own cell and it is ours');
  }
  ok(keepers === 4, 'and four provinces on the map keep that Torah');
  // The knife in the middle, and the port.
  ok(w.ctx.prov('Sebaste').owner === 'BYZ' && w.ctx.prov('Sebaste').religion === 'christianity',
    'Sebaste is the empire\'s and Christian — Herod\'s foundation, five miles away');
  ok(w.ctx.prov('Caesarea Maritima').owner === 'BYZ',
    'Caesarea Maritima is the empire\'s: the seat of the dux and the only port that matters');
  // Surrounded by people who share the Torah and not the mountain.
  const jewishNeighbours = ['Antipatris', 'Sepphoris', 'Tiberias']
    .filter((n) => w.ctx.prov(n) && w.ctx.prov(n).religion === 'judaism');
  ok(jewishNeighbours.length === 3,
    'and the neighbours are Jewish provinces (' + jewishNeighbours.join(', ') + ')');
  const jud = w.game.tags.JUD;
  ok(!!jud && jud.alive !== false,
    'the Jews are a live tag with their own interests, not a faction of somebody\'s court');
}

// ---------------------------------------------------------------------------
console.log('== the mountain is a mechanic before it is a card ==');
{
  const w = boot('SAM');
  const neapolis = w.ctx.prov('Neapolis');
  ok(neapolis.holy === 'gerizim', 'Gerizim is the holy site of the town below it');
  ok(HOLY_FAITH.gerizim === 'samaritanism',
    '  and the engine keys it to samaritanism, not to judaism');
  ok(HOLY_FAITH.temple_mount === 'judaism',
    '  while the Mount is still keyed to Judaism — two holy sites, two faiths, one game');
  // The summit is garrisoned at the start: the card that clears it is the fork,
  // and the flag it sets is what the victory contract reads.
  ok(!w.game.flags.gerizimCleared,
    'the summit is not cleared at the opening — Zeno\'s church is on it');
}

// ---------------------------------------------------------------------------
console.log('== the chapter opens with a law ==');
{
  const w = boot('SAM');
  const t = w.game.tags.SAM;
  const statute = (t.modifiers || []).find((m) => m && m.id === 'the_statutes');
  ok(!!statute, 'the statutes of Justinian are in force at month one');
  ok(statute && statute.months === -1, '  permanently, until something repeals them');
  ok(statute && statute.effects.incomeMult < 1 && statute.effects.unrestAll > 0,
    '  and they cost the community income and quiet, which is what the law actually did');
  const war = (w.game.wars || []).find((x) => x && /Rising of the Keepers/.test(x.name || ''));
  ok(!!war, 'the rising is a war from month one');
  const byzSide = war && ((war.attackers || []).indexOf('BYZ') >= 0 ? war.attackers : war.defenders);
  ok(!!byzSide && byzSide.indexOf('GHA') >= 0,
    '  with the Ghassanid phylarchate on the empire\'s side — the instrument Justinian used');
  const legis = card('ev529_the_legislation');
  ok(!!legis && legis.date && legis.date.y === 529 && legis.world === true,
    'the opening card is the legislation, and it is world history');
}

// ---------------------------------------------------------------------------
console.log('== the five opening cards reach a player ==');
{
  const seen = [];
  const bus = { emit(k, p) { if (k === 'event') seen.push(p); }, on() { return () => {}; } };
  const w = boot('SAM', { bus, y: 530, m: 6 });
  const neapolis = w.ctx.prov('Neapolis');
  neapolis.owner = 'SAM'; neapolis.controller = 'SAM';

  const games = card('ev529_the_games_at_neapolis');
  ok(!!games && games.trigger(w.ctx) === true, 'the games at Neapolis are offered');
  ok(games.options.length === 3, '  with three answers, one of which refuses the crown');
  fireEvent(w.ctx, games);
  ok(seen.length === 1 && seen[0].event.id === games.id, '  and the card reaches the player');
  // The crown, and the charioteer.
  const idx = games.options.findIndex((o) => /Take him off the track/.test(o.label));
  ok(idx >= 0, '  the historical answer is on the card');
  games.options[idx].effects(w.ctx);
  ok(!!w.game.flags.kingAtNeapolis && !!w.game.flags.niciasKilled,
    '  taking it crowns the king and kills the charioteer');

  const bishop = card('ev529_the_bishops_fingers');
  ok(!!bishop && bishop.trigger(w.ctx) === true, 'the bishop\'s card follows the crown');
  // Restraint must not buy goodwill. That is the whole register of the card.
  const before = (w.game.tags.BYZ.opinion || {}).SAM || 0;
  const restrain = bishop.options.findIndex((o) => /Post a guard/.test(o.label));
  ok(restrain >= 0, '  restraint is one of the answers');
  bishop.options[restrain].effects(w.ctx);
  const after = (w.game.tags.BYZ.opinion || {}).SAM || 0;
  ok(after === before,
    '  and it does not move the empire an inch (' + before + ' → ' + after + ')');
  ok(!!w.game.flags.churchesGuarded, '  though the villages do stay quiet');

  const gerizim = card('ev529_gerizim');
  ok(!!gerizim && gerizim.trigger(w.ctx) === true, 'the mountain is asked once the rising stands');
  const clear = gerizim.options.findIndex((o) => /Clear the summit/.test(o.label));
  gerizim.options[clear].effects(w.ctx);
  ok(!!w.game.flags.gerizimCleared, '  and clearing the summit is recorded');
  const mods = w.game.tags.SAM.modifiers || [];
  const altar = mods.find((m) => m && m.id === 'the_altar_on_the_mountain');
  ok(!!altar && altar.effects.reinforceMult < 1,
    '  with the garrison it costs: the altar is theology and the summit is a bare rock');

  const phylarch = card('ev529_the_phylarch');
  ok(!!phylarch && Array.isArray(phylarch.requiresWar),
    'the phylarch belongs to the war and says so');
  ok(phylarch.options.length === 3,
    '  and offers three answers, including buying a season from al-Harith');
}

// ---------------------------------------------------------------------------
console.log('== the victory contract counts people, not provinces ==');
{
  // Survival: four provinces of the Torah on the map in 614, whoever owns them.
  const ended = [];
  const w = boot('SAM', { y: 614, m: 2 });
  w.ctx.helpers.endGame = (ctx, o) => ended.push(o);
  // Hand every hill province to the empire: the STATE is gone, the people are not.
  for (const n of ['Neapolis', 'Jenin', 'Tulkarm', 'Qalqilya']) {
    const p = w.ctx.prov(n);
    p.owner = 'BYZ'; p.controller = 'BYZ';
  }
  BOOKMARK_529.checkVictory(w.ctx);
  ok(ended.length === 1 && ended[0].result === 'win',
    'a community with no state left still wins if the Torah is still kept');
  ok(ended.length === 1 && /There Are Still Keepers/.test(ended[0].title || ''),
    '  and the verdict says so by name');
}
{
  // The other end of the same rule: the people gone is the loss, whatever the
  // state is doing.
  const ended = [];
  const w = boot('SAM', { y: 545, m: 6 });
  w.ctx.helpers.endGame = (ctx, o) => ended.push(o);
  for (let i = 1; i < w.game.provinces.length; i++) {
    const p = w.game.provinces[i];
    if (p && p.religion === 'samaritanism') p.religion = 'christianity';
  }
  BOOKMARK_529.checkVictory(w.ctx);
  ok(ended.length === 1 && ended[0].result === 'loss',
    'and no province of that Torah anywhere is the loss, however much ground is held');
}

// ---------------------------------------------------------------------------
console.log('== the shared pool is registered, and knows this crown is not Jewish ==');
{
  const genericIds = new Set(GENERIC_EVENTS.map((e) => e && e.id).filter(Boolean));
  const ids = era529.events.map((e) => e && e.id);
  ok(genericIds.size > 0 && [...genericIds].every((id) => ids.indexOf(id) >= 0),
    'the omens and incidents play in this chapter like any other');
  const annex = era529.events.find((e) => e && e.id === 'ev_a_what_these_people_now_are');
  ok(!!annex, 'the annexation question is registered too');
  const w = boot('SAM');
  // Give the crown two undigested foreign provinces: a Jewish crown would be
  // asked. This one is not, because it keeps a different Torah.
  for (const n of ['Sebaste', 'Antipatris']) {
    const p = w.ctx.prov(n);
    p.owner = 'SAM'; p.controller = 'SAM'; p.integration = 0;
  }
  ok(annex.trigger(w.ctx) === false,
    '  and it stays shut for a crown that is not Jewish, rather than misfiring');
}

// ---------------------------------------------------------------------------
console.log('== nothing in the chapter throws over a played year ==');
{
  const w = boot('SAM');
  const warns = [];
  const realWarn = console.warn;
  console.warn = (...a) => warns.push(a.join(' '));
  try {
    for (let m = 0; m < 24; m++) {
      w.game.date = { y: 529 + Math.floor(m / 12), m: (m % 12) + 1, d: 1 };
      checkTriggeredEvents(w.ctx);
      w.game.pendingEvents.length = 0;
    }
  } finally { console.warn = realWarn; }
  const bad = warns.filter((s) => /events_529ce|bookmark_529ce/.test(s));
  ok(bad.length === 0, 'two years of trigger checks raise no guarded failure'
    + (bad.length ? ' (' + bad[0] + ')' : ''));
}

console.log(failures ? `smoke91: ${failures} FAIL` : 'smoke91: ALL PASS');
process.exit(failures ? 1 : 0);
