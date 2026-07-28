// Headless regression — SPEC §139: three letters outlive their century.
//
// `JUD` is Judaea in the seven chapters that turn on Jerusalem. In 529 it is
// GALILEE, seated at Tiberias, because Judaea by then is a Christian province
// with no Jewish polity in it and the four towns that court actually holds are
// all around the Sea of Galilee.
//
// The assertions here are the ones that rot silently:
//
//   1. The rename lands where the game reads names — the LIVE tag — and every
//      other chapter that seats JUD is untouched.
//   2. It is a lens and never a write. DEFINES is one object shared by the
//      start screen, the compendium and the next campaign begun without a
//      reload; a chapter that renamed it in place would rename it for all of
//      them, and the leak would only show up two campaigns later.
//   3. The seat moved too. Jerusalem in 529 is the Empire's, and eight
//      consumers read a capital — growth, AI development, AI airfields, the
//      shipyard/vantage search, chapter distance scoring, the pretender's
//      prize, and the crown the peace table refuses to release.
//   4. A save written before the chapter declared the tweak heals on load;
//      a court that renamed ITSELF in play (a greater crown, §135, or a
//      revolution calling rebrandTag) keeps the name it chose.
//   5. The chapter's prose keeps the three OTHER senses of the word: the
//      Judaean desert, the Jewish text of Deuteronomy, and the people.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, reviveGame } = await import(R + '/js/sim/init.js');
const { tagDef } = await import(R + '/js/sim/military.js');

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
const eraOf = (id) => ERAS.find((e) => e.bookmark.id === id) || null;

function boot(id, tag) {
  const era = eraOf(id);
  const bookmark = era.bookmark;
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const game = initGame({
    DEFINES, MAP_DATA, geom: flatGeom, bookmark, events: era.events,
    playerTag: tag, rngSeed: 7, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: flatGeom,
    bus: { emit() {}, on() { return () => {}; } },
    bookmark, events: era.events, provinceMap,
  });
  return { game, ctx, bookmark, era, provinceMap };
}

// The static truth every assertion below is measured against, captured before
// a single chapter has booted.
const STATIC_JUD_NAME = DEFINES.TAGS.JUD.name;
const STATIC_JUD_CAPITAL = DEFINES.TAGS.JUD.capital;

// ---------------------------------------------------------------------------
console.log('== the chapter declares the rename, and declares it about the right court ==');
{
  const b = eraOf('529ce').bookmark;
  ok(!!b.tagTweaks, 'the 529 chapter carries tagTweaks');
  ok(!!(b.tagTweaks && b.tagTweaks.JUD), '  and it is JUD that is tweaked');
  ok(b.tagTweaks.JUD.name === 'Galilee', '  the name is Galilee');
  ok(b.tagTweaks.JUD.capital === 'Tiberias', '  and the seat is Tiberias, not Jerusalem');
  // The rename would be a lie if the court held anything in Judaea.
  const owned = Object.keys(b.owners).filter((n) => b.owners[n] === 'JUD').sort();
  ok(owned.length === 4, 'the court holds four provinces (' + owned.join(', ') + ')');
  for (const n of ['Tiberias', 'Sepphoris', 'Tarichaea', 'Gischala']) {
    ok(owned.indexOf(n) >= 0, '  ' + n + ' — and it is in Galilee');
  }
  for (const n of ['Jerusalem', 'Hebron', 'Lydda', 'Emmaus', 'Jericho']) {
    ok(b.owners[n] === 'BYZ', '  ' + n + ' is the Empire\'s, which is why the old name was wrong');
  }
  ok(b.tagTweaks.JUD.capital === 'Tiberias' && b.owners.Tiberias === 'JUD',
    'and the declared seat is a province the court actually owns');
}

// ---------------------------------------------------------------------------
console.log('== the live court is Galilee, and the lens reads it ==');
{
  const w = boot('529ce', 'SAM');
  ok(w.game.tags.JUD.name === 'Galilee',
    'the live tag is named Galilee at month one — which is what every panel reads');
  ok(tagDef(w.ctx, 'JUD').name === 'Galilee', 'tagDef agrees through the ctx');
  ok(tagDef(w.ctx, 'JUD').capital === 'Tiberias', '  and hands out the era\'s seat');
  ok(w.ctx.tagDef('JUD').capital === 'Tiberias',
    '  and the ctx carries it for the panels, which may not import the sim');
  // The lens must not invent a court where the chapter is silent.
  ok(tagDef(w.ctx, 'BYZ').name === DEFINES.TAGS.BYZ.name,
    'a tag the chapter does not tweak keeps its own name');
  ok(tagDef(w.ctx, 'BYZ').capital === DEFINES.TAGS.BYZ.capital, '  and its own seat');
  ok(w.game.tags.SAM.name === DEFINES.TAGS.SAM.name, '  as do the Keepers themselves');
  // Inherited fields survive the spread — a tweak is a lens, not a replacement.
  const d = tagDef(w.ctx, 'JUD');
  ok(d.religion === 'judaism', 'the tweaked court keeps its faith');
  ok(d.culture === DEFINES.TAGS.JUD.culture, '  its culture');
  ok(!!d.ideas && d.ideas.moraleMult === DEFINES.TAGS.JUD.ideas.moraleMult,
    '  and its national character');
}

// ---------------------------------------------------------------------------
console.log('== it is a lens and never a write ==');
{
  ok(DEFINES.TAGS.JUD.name === STATIC_JUD_NAME,
    'booting 529 left the shared definition alone (still ' + DEFINES.TAGS.JUD.name + ')');
  ok(DEFINES.TAGS.JUD.capital === STATIC_JUD_CAPITAL,
    '  including its capital (still ' + DEFINES.TAGS.JUD.capital + ')');
  ok(STATIC_JUD_NAME !== 'Galilee',
    '  and the static name was never Galilee to begin with');
  // The leak this guards against only shows up in the NEXT chapter.
  const after = boot('614ce', 'JUD');
  ok(after.game.tags.JUD.name === STATIC_JUD_NAME,
    'a chapter started after 529 in the same page seats ' + STATIC_JUD_NAME + ', not Galilee');
}

// ---------------------------------------------------------------------------
console.log('== every other chapter that seats JUD is untouched ==');
{
  for (const era of ERAS) {
    const b = era.bookmark;
    if (b.id === '529ce') continue;
    if (!(b.activeTags || []).includes('JUD')) continue;
    const w = boot(b.id, (b.playableTags && b.playableTags[0] && b.playableTags[0].tag) || 'JUD');
    ok(w.game.tags.JUD && w.game.tags.JUD.name === STATIC_JUD_NAME,
      b.id + ' seats JUD as ' + STATIC_JUD_NAME);
    ok(tagDef(w.ctx, 'JUD').capital === STATIC_JUD_CAPITAL,
      '  and its seat is still ' + STATIC_JUD_CAPITAL);
  }
}

// ---------------------------------------------------------------------------
console.log('== the seat is the half that was not cosmetic ==');
{
  const w = boot('529ce', 'SAM');
  const seat = w.ctx.prov(tagDef(w.ctx, 'JUD').capital);
  ok(!!seat, 'the era seat resolves to a province on the map');
  ok(seat.owner === 'JUD' && seat.controller === 'JUD',
    '  and the court both owns and holds it — the old seat was neither');
  const oldSeat = w.ctx.prov(STATIC_JUD_CAPITAL);
  ok(oldSeat && oldSeat.owner === 'BYZ',
    'the static seat (' + STATIC_JUD_CAPITAL + ') belongs to the Empire in this chapter');
  // yearlyGrowth builds a name→tag index off the same lens; the bonus is paid
  // to a court sitting in its own capital, and before the lens JUD never was.
  ok((seat.canon || seat.name) === 'Tiberias',
    'the growth index keys on Tiberias, so the capital bonus can actually land');
}

// ---------------------------------------------------------------------------
console.log('== a stale save heals; a court that renamed itself does not ==');
{
  const era = eraOf('529ce');
  // The real load path: reviveGame heals the saved object, makeCtx rebuilds
  // the ctx around it with the chapter in hand. The name heals in the second
  // step, because that is the step that knows which chapter this is.
  const reload = (mutate) => {
    const w = boot('529ce', 'SAM');
    const saved = JSON.parse(JSON.stringify(w.game));
    mutate(saved);
    const game = reviveGame(saved);
    makeCtx({
      game, DEFINES, MAP_DATA, geom: flatGeom,
      bus: { emit() {}, on() { return () => {}; } },
      bookmark: era.bookmark, events: era.events, provinceMap: w.provinceMap,
    });
    return game;
  };

  // A save written before the chapter declared the tweak: the court carries
  // the STATIC name, which is exactly the case worth healing.
  ok(reload((s) => { s.tags.JUD.name = STATIC_JUD_NAME; }).tags.JUD.name === 'Galilee',
    'a save written before the tweak loads as Galilee');
  // …and one written after it is already right, and stays right.
  ok(reload(() => {}).tags.JUD.name === 'Galilee', 'a current save round-trips unchanged');

  // A court that renamed itself in play — a greater crown (§135) or a
  // revolution calling rebrandTag — wrote over the top and must keep it.
  ok(reload((s) => { s.tags.JUD.name = 'The Kingdom of Israel'; }).tags.JUD.name
    === 'The Kingdom of Israel',
  'a court that chose its own name keeps it across a load');
  ok(DEFINES.TAGS.JUD.name === STATIC_JUD_NAME,
    'and three revivals later the shared definition is still untouched');
}

// ---------------------------------------------------------------------------
console.log('== the other three senses of the word survive the sweep ==');
{
  const bookmarkSrc = await import('node:fs').then((fs) =>
    fs.readFileSync(R + '/js/data/bookmark_529ce.js', 'utf8'));
  const eventsSrc = await import('node:fs').then((fs) =>
    fs.readFileSync(R + '/js/data/events_529ce.js', 'utf8'));
  ok(/monasteries of the Judaean desert/.test(bookmarkSrc),
    'the Judaean desert is a real place and the bishops still keep it');
  ok(/Gerizim where the Jewish text reads Ebal/.test(eventsSrc),
    'the Jewish text of Deuteronomy 27:4 is a people\'s scripture, not a state');
  const paths = await import(R + '/js/data/chapter_paths.js');
  const gaps529 = paths.KNOWN_GAPS.filter((g) => g.chapter === '529ce');
  ok(gaps529.length === 5, 'the chapter still declares its five open roads');
  ok(gaps529.some((g) => /Caesarea in 556/.test(g.why)),
    '  and the joint rising of 556 is still the terminal they wait for');
}

// ---------------------------------------------------------------------------
console.log('== the compendium can tell the reader which name it flew ==');
{
  // The nation page is the TAG's and a tag outlives its names, so the era row
  // is the only honest place to say "as Galilee".
  const wiki = await import('node:fs').then((fs) =>
    fs.readFileSync(R + '/js/ui/wiki.js', 'utf8'));
  ok(/tagTweaks\[tag\]/.test(wiki),
    'the compendium reads the chapter\'s own name for the court');
  const start = await import('node:fs').then((fs) =>
    fs.readFileSync(R + '/js/ui/startscreen.js', 'utf8'));
  ok(/tagDef\(\{ DEFINES, bookmark \}/.test(start),
    'and the roster offers the standard the campaign will actually fly');
}

console.log(failures ? `smoke94: ${failures} FAIL` : 'smoke94: ALL PASS');
process.exit(failures ? 1 : 0);
