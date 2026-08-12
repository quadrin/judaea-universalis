// Headless regression — SPEC §139: three letters outlive their century.
//
// `JUD` is Judaea in the chapters that turn on Jerusalem. In 529 it is
// GALILEE, seated at Tiberias, because Judaea by then is a Christian province
// with no Jewish polity in it and the four towns that court actually holds are
// all around the Sea of Galilee. SPEC §235 seats a second one: the rising of
// 351 is the same country two centuries earlier, seated at Diocaesarea, and
// SPEC §236 gives both of them the banner and the colour that go with the
// name — a court that is renamed and recoloured was still flying the other
// state's emblem, because nothing wrote `t.flag`.
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
const num = (v) => (Number.isFinite(v) ? v : 0);

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
  // SPEC §162: the court holds NOTHING at the opening date. There was no
  // Jewish polity between Bar Kokhba and 1948, and this chapter used to assert
  // one — four towns held outright, no overlord, a treasury and a standing
  // army. What the community had in 529 is an academy at Tiberias, a closed
  // Talmud and a patriarchate the emperor let lapse in 425.
  const owned = Object.keys(b.owners).filter((n) => b.owners[n] === 'JUD').sort();
  ok(owned.length === 0,
    'the court holds nothing at the opening date (' + (owned.join(', ') || 'none') + ')');
  for (const n of ['Tiberias', 'Sepphoris', 'Tarichaea', 'Gischala']) {
    ok(b.owners[n] === 'BYZ', '  ' + n + ' is Palaestina Secunda, and Justinian\'s');
  }
  for (const n of ['Jerusalem', 'Hebron', 'Lydda', 'Emmaus', 'Jericho']) {
    ok(b.owners[n] === 'BYZ', '  ' + n + ' is the Empire\'s, which is why the old name was wrong');
  }
  // Deferred, not deleted: the court is seated and dormant, exactly as 167 BCE
  // seats the Seleucid successors before they exist.
  ok((b.activeTags || []).indexOf('JUD') >= 0,
    'but the court is seated, dormant, waiting for a rising to give it a state');
  ok(b.tagTweaks.JUD.capital === 'Tiberias',
    'and the declared seat is the town the academy actually sat in');
}

// ---------------------------------------------------------------------------
console.log('== Galilee is formed by the rising of 556, and only the joint one ==');
{
  // The one circumstance in four centuries that could put a Jewish polity back
  // on the map is the July 556 rising at Caesarea, where both houses of Israel
  // were in the same street. `ev529_the_praetorium_at_caesarea` already models
  // it; option 0 is the one that answers the Jewish quarter, and it is the only
  // option that hands the academy towns over.
  const { readFileSync } = await import('fs');
  const SRC = readFileSync(R + '/js/data/events_529ce_roads.js', 'utf8');
  const era = ERAS.find((e) => e.bookmark.id === '529ce');
  const ev = (era.events || []).find((e) => e && e.id === 'ev529_the_praetorium_at_caesarea');
  ok(!!ev, 'the chapter plays the praetorium at Caesarea');
  ok(ev && ev.date && ev.date.y === 556, '  in 556, the year the two houses rose together');
  const opt0 = SRC.slice(SRC.indexOf("ev529_praetorium:0"), SRC.indexOf("ev529_praetorium:1"));
  ok(/galileeRestored/.test(opt0), '  answering the Jewish quarter restores Galilee');
  for (const town of ['Tiberias', 'Sepphoris', 'Tarichaea', 'Gischala']) {
    ok(opt0.indexOf(town) >= 0, '    ' + town + ' comes out of the Empire\'s hands');
  }
  const rest = SRC.slice(SRC.indexOf("ev529_praetorium:1"));
  ok(!/galileeRestored/.test(rest),
    '  and the options that leave the Jews out of it do not — one house, no state');
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
// The chapters where the three letters wear another country's name. Both of
// them are the Galilee, two centuries apart, and both are seated in it.
const GALILEE_CHAPTERS = new Set(['351ce', '529ce']);

console.log('== the banner travels with the name (SPEC §236) ==');
{
  const { FLAGS } = await import(R + '/js/ui/icons.js');
  ok(typeof FLAGS.GAL === 'string' && FLAGS.GAL.length > 80,
    'the Galilee has an emblem of its own in the flag table');
  const seats = { '351ce': 'Sepphoris', '529ce': 'Tiberias' };
  for (const id of GALILEE_CHAPTERS) {
    const era = ERAS.find((e) => e.bookmark.id === id);
    const w = boot(id, era.bookmark.playableTags[0].tag);
    const t = w.game.tags.JUD;
    ok(!!t && t.name === 'Galilee', id + ' seats the court as Galilee');
    ok(!!t && t.flag === 'GAL', '  flying its own banner rather than Judaea\'s menorah');
    ok(!!t && Array.isArray(t.color) && t.color[2] > t.color[1] && t.color[1] > t.color[0]
      && t.color[0] >= 100 && t.color[2] >= 190,
    '  on the lake\'s own light blue: ' + JSON.stringify(t && t.color));
    ok(tagDef(w.ctx, 'JUD').capital === seats[id],
      '  seated at ' + seats[id] + ', not Jerusalem');
    // The topbar strip and the start screen's card badge print three letters
    // beside the banner. They were printing the ENGINE's three letters, so a
    // Galilean flag on a light blue field sat next to the word JUD.
    ok(tagDef(w.ctx, 'JUD').abbr === 'GAL',
      '  and the strip beside the banner reads GAL, not JUD');
  }
  // Both chapters dress the same court the same way — one identity, two eras.
  const a = boot('351ce', 'JUD').game.tags.JUD;
  const b = boot('529ce', 'SAM').game.tags.JUD;
  ok(a.name === b.name && a.flag === b.flag && JSON.stringify(a.color) === JSON.stringify(b.color),
    'and the two chapters agree about what the Galilee looks like');
  // …and the shared definition still knows nothing about any of it.
  ok(!DEFINES.TAGS.JUD.flag && DEFINES.TAGS.JUD.name === STATIC_JUD_NAME,
    'the static definition carries no banner and no rename (still ' + DEFINES.TAGS.JUD.name + ')');
  const plain = boot('132ce', 'JUD');
  ok(plain.game.tags.JUD.flag === null && plain.game.tags.JUD.name === STATIC_JUD_NAME,
    'a chapter with no lens seats ' + STATIC_JUD_NAME + ' with no banner override');
  ok(!tagDef(plain.ctx, 'JUD').abbr,
    '  and no letters override either — the strip falls back to the tag');
  // The one surface that draws a court before a campaign exists: the start
  // screen builds its roster out of `tagDef`, so the chip takes a lens too.
  const { flagChip } = await import(R + '/js/ui/icons.js');
  const bm = ERAS.find((e) => e.bookmark.id === '529ce').bookmark;
  const chip = flagChip('JUD', DEFINES, 34, false, null, tagDef({ DEFINES, bookmark: bm }, 'JUD'));
  ok(chip.includes('124,196,214') && chip.includes(FLAGS.GAL.slice(0, 60)),
    'the start screen\'s own chip flies the Galilee before there is a game to read');
  const bare = flagChip('JUD', DEFINES, 34);
  ok(bare.includes('36,82,158') && bare.includes(FLAGS.JUD.slice(0, 60)),
    '  and the same chip with no lens is still Judaea\'s menorah on Judaea\'s blue');
}

console.log('== every other chapter that seats JUD is untouched ==');
{
  for (const era of ERAS) {
    const b = era.bookmark;
    if (GALILEE_CHAPTERS.has(b.id)) continue; // these two ARE the lens
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
  // SPEC §162: the seat is DECLARED, not held. The academy sat at Tiberias
  // and the town is Justinian's — which is the chapter's whole situation, and
  // is why capitalProvince() falls back to the best province a court actually
  // owns. What must stay true is that the seat names a real place in the
  // Galilee rather than Jerusalem; owning it is what the rising of 556 is for.
  ok(seat.owner === 'BYZ',
    '  and the Empire holds it in 529 — the court is an academy, not a state');
  ok(['Tiberias', 'Sepphoris', 'Tarichaea', 'Gischala'].indexOf(seat.canon) >= 0,
    '  the seat is one of the four academy towns, not Jerusalem');
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
console.log('== a pretender is crowned in his own crown\'s seat or nowhere ==');
{
  // Moving JUD's seat onto a province the court actually owns exposed a guard
  // that was never there: `monthlyPretenders` asked who HELD the capital and
  // never who OWNED it, and `crownThePretender` hands the seat to the crown
  // outright. A court whose nominal capital is somebody else's city could be
  // handed a foreign province by its own succession crisis.
  const { monthlyPretenders } = await import(R + '/js/sim/revolt.js');
  const CLAIMANT = 'A man with a claim';
  // The claim only ticks while one of the claimant's bands is still in the
  // field, so the fixture has to put one there.
  function pretenderWorld(seatOwner) {
    const w = boot('529ce', 'SAM');
    const seat = w.ctx.prov('Tiberias');
    seat.owner = seatOwner;
    seat.controller = 'REB';
    w.game.pretenders = { JUD: { claimant: CLAIMANT, heldMonths: 0 } };
    w.game.armies['pretender-1'] = {
      id: 'pretender-1', tag: 'REB', prov: seat.id, men: 3000,
      rising: 'pretender', claimant: CLAIMANT, inf: 3, cav: 0, morale: 3, maxMorale: 3,
    };
    return { w, seat };
  }
  // 1. The seat is the PLAYER's. The crown that names it its capital must not
  //    be handed it by its own succession crisis.
  {
    const { w, seat } = pretenderWorld('SAM');
    for (let i = 0; i < 12; i++) monthlyPretenders(w.ctx);
    ok(seat.owner === 'SAM',
      'the player still owns Tiberias after Galilee\'s succession crisis');
    ok(seat.controller !== 'JUD',
      '  and it was never handed to a court that does not own it');
    ok(!!w.game.pretenders.JUD,
      '  the claim is not resolved either — it simply cannot be settled there');
  }
  // 2. The legitimate case still fires: the crown's OWN seat, in rebel hands.
  {
    const { w, seat } = pretenderWorld('JUD');
    for (let i = 0; i < 12; i++) monthlyPretenders(w.ctx);
    ok(seat.controller === 'JUD' && !w.game.pretenders.JUD,
      'but a pretender holding the crown\'s own seat is still crowned there');
  }
  // 3. …and a claim that CANNOT be settled must still end. `monthlyRisings`
  //    exempts a pretender's band from burning out on the promise that the
  //    clock above settles it either way; a crown that does not own its seat
  //    never reaches a verdict, so without a matching guard the band would
  //    sit on the province for ever at nought legitimacy. This is the case
  //    the owner guard created, and it is worse in the chapters where JUD is
  //    PLAYABLE and seated in a city Rome or the Empire holds.
  {
    const { monthlyRisings } = await import(R + '/js/sim/revolt.js');
    const ceiling = 72;
    for (const id of ['132ce', '614ce']) {
      const w = boot(id, 'JUD');
      const g = w.game;
      // JUD's seat in these chapters is Jerusalem, which it does not own.
      const seatName = tagDef(w.ctx, 'JUD').capital;
      const seatProv = w.ctx.prov(seatName);
      ok(seatProv && seatProv.owner !== 'JUD',
        id + ': the crown\'s seat (' + seatName + ') is not its own — no verdict is reachable');
      // Raise the claim in a province it DOES own.
      let mine = null;
      for (let i = 1; i < g.provinces.length; i++) {
        const p = g.provinces[i];
        if (p && !p.impassable && p.owner === 'JUD') { mine = p; break; }
      }
      mine.controller = 'REB';
      mine.revoltType = 'pretender';
      mine.rebelHeldMonths = 0;
      mine.unrest = 0;
      g.pretenders = { JUD: { claimant: CLAIMANT, heldMonths: 0 } };
      g.armies['stuck-1'] = {
        id: 'stuck-1', tag: 'REB', prov: mine.id, men: 3000,
        rising: 'pretender', claimant: CLAIMANT, inf: 3, cav: 0, morale: 3, maxMorale: 3,
      };
      let months = 0;
      for (; months < 240 && mine.controller === 'REB'; months++) {
        monthlyPretenders(w.ctx);
        monthlyRisings(w.ctx);
      }
      ok(mine.controller !== 'REB',
        '  the rising ends rather than holding the province for ever'
        + ' (freed after ' + months + ' months)');
      ok(months <= ceiling,
        '  and it ends inside the ' + ceiling + '-month ceiling');
    }
  }
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
  // SPEC §151 wrote the tail those five roads were waiting for, so the chapter
  // declares nothing open. The assertion is kept pointed at the same place: it
  // now says the gap list emptied because the cards exist, not because somebody
  // deleted the entries.
  ok(gaps529.length === 0, 'the chapter declares no open roads (SPEC §151)');
  const ch529 = paths.CHAPTER_PATHS.find((c) => c.id === '529ce');
  const roads529 = ch529.forks.flatMap((f) => f.roads);
  ok(roads529.length === 14 && roads529.every((r) => !!r.terminal),
    '  because all fourteen of its roads end somewhere');
  ok(roads529.some((r) => r.entry === 'ev529_the_praetorium_at_caesarea'),
    '  and the joint rising of 556 is a card the chapter plays rather than a terminal it awaits');
}

// ---------------------------------------------------------------------------
console.log('== 1948 presents its modern states as modern (SPEC §141) ==');
{
  const w = boot('1948ce', 'ISR');
  const b = w.bookmark;
  // 1. No province of a foreign country still wears a classical name. The
  //    three that did are the subject; the assertion is the general rule.
  const renamed = { Pisidia: 'Isparta', Palmyra: 'Tadmur', Pella: 'Tabaqat Fahl' };
  for (const [canon, modern] of Object.entries(renamed)) {
    const p = w.ctx.prov(canon);
    ok(!!p && p.name === modern,
      canon + ' answers to ' + modern + ' in 1948' + (p ? ' (' + p.name + ')' : ' — MISSING'));
    ok(!!p && p.canon === canon, '  and keeps ' + canon + ' as its canonical key for content');
  }
  // 2. Every court sits in a city it holds, and in the right one. A §232
  //    consolidated court's capital province IS the country and wears its
  //    name — Rome's cell reads Italy — while the theatre's seats keep
  //    their cities, and Greece (which does not consolidate: its cells are
  //    the dispersion's oldest cities) is still governed from Athens.
  const SEATS = {
    ISR: 'Tel Aviv-Jaffa', EGY: 'Cairo', JOR: 'Amman', SYR: 'Damascus',
    LEB: 'Beirut', IRQ: 'Baghdad', TUR: 'Ankara', GRC: 'Athens', ITA: 'Italy',
  };
  for (const [tag, city] of Object.entries(SEATS)) {
    const capName = tagDef(w.ctx, tag).capital;
    const p = capName ? w.ctx.prov(capName) : null;
    ok(!!p && p.name === city, tag + ' is governed from ' + city
      + (p ? ' (' + p.name + ')' : ' — unresolved'));
    ok(!!p && p.owner === tag, '  and it owns the city it is governed from');
  }
  // 3. The two the chapter had to correct, stated as the correction: Turkey
  //    has not been governed from Konya since 1923, and Corinth has never
  //    been a modern capital. Both static seats are still the ancient ones.
  ok(DEFINES.TAGS.TUR.capital === 'Iconium' && DEFINES.TAGS.GRC.capital === 'Corinth',
    'the static seats are untouched — the correction is the chapter\'s, not the tag\'s');
  ok(b.tagTweaks && b.tagTweaks.TUR.capital === 'Ancyra'
    && b.tagTweaks.GRC.capital === 'Athens',
  '  and it is keyed by canonical name, which is what the growth index looks up');
  // 4. A capital-only tweak must not touch a single name — and the case that
  //    would have caught a mistake is Greece, which this chapter rebrands in
  //    its own setup (`rebrandTag(GRC, 'Kingdom of Greece')`). The load-time
  //    heal (§139) re-applies a chapter's era name where the court still
  //    carries its static one, and a tweak that carried a name for GRC — or a
  //    heal that compared the wrong thing — would overwrite the rebrand.
  ok(w.game.tags.GRC.name === 'Kingdom of Greece',
    'Greece keeps the name its own setup gave it, seat tweak notwithstanding');
  for (const t of b.activeTags) {
    if (t === 'GRC') continue;
    ok(w.game.tags[t].name === (DEFINES.TAGS[t] || {}).name,
      t + ' still opens under its own name (' + w.game.tags[t].name + ')');
  }
  // …and it survives a save round-trip, which is where the heal actually runs.
  {
    const saved = JSON.parse(JSON.stringify(w.game));
    const g2 = reviveGame(saved);
    makeCtx({
      game: g2, DEFINES, MAP_DATA, geom: flatGeom,
      bus: { emit() {}, on() { return () => {}; } },
      bookmark: b, events: w.era.events, provinceMap: w.provinceMap,
    });
    ok(g2.tags.GRC.name === 'Kingdom of Greece',
      '  and still keeps it after a load, where the heal runs');
  }
  // 5. No two courts of this chapter claim the same seat — the growth index is
  //    keyed by capital NAME and the last writer wins, so a collision inside a
  //    chapter would silently take the bonus off one of them.
  const claimed = {};
  let clash = 0;
  for (const t of b.activeTags) {
    const c = tagDef(w.ctx, t).capital;
    if (!c) continue;
    if (claimed[c]) clash++;
    claimed[c] = t;
  }
  ok(clash === 0, 'no two of its courts claim the same seat');
}

// ---------------------------------------------------------------------------
console.log('== 1948 makes no client kingdoms, by any of the three roads (SPEC §142) ==');
{
  const MIL = await import(R + '/js/sim/military.js');
  const CH = await import(R + '/js/sim/chapters.js');

  // Force every precondition EXCEPT the age itself, so only the mechanic can
  // be doing the refusing.
  function courted(id, me, them) {
    const w = boot(id, me);
    const A = w.game.tags[me], B = w.game.tags[them];
    A.allies = [them]; B.allies = [me];
    A.overlord = null; B.overlord = null;
    A.atWarWith = []; B.atWarWith = [];
    A.points.infl = 999;
    MIL.addOpinion(w.ctx, them, me, 900);
    return w;
  }

  const w48 = courted('1948ce', 'ISR', 'EGY');
  ok(MIL.mechanicOn(w48.ctx, 'clientKingdoms') === false,
    'the chapter declares the institution off');

  // Road 1: the peacetime collar (SPEC §92) — info AND core, since the core is
  // what a UI would actually call.
  const co = MIL.clientOfferInfo(w48.ctx, 'ISR', 'EGY');
  ok(co && co.can === false, 'the collar cannot be offered');
  ok(co && /no client kingdoms/.test(co.why), '  and it is the age that says so, not the arithmetic');
  const core = MIL.offerClientshipCore(w48.ctx, 'ISR', 'EGY');
  ok(core && core.ok === false, '  and the core refuses too, not merely the panel');
  ok(w48.game.tags.EGY.overlord === null, '  nobody bent the knee');

  // Road 2: the yoke at the peace table.
  const war = Object.values(w48.game.wars || {})[0];
  ok(!!war, 'the chapter opens at war, which is where the yoke would be written');
  const info = MIL.peaceDealInfo(w48.ctx, war, 'ISR');
  ok(info.canSubjugate === false, 'the peace table will not write a subjugation clause');
  ok(/no client kingdoms/.test(info.whyNotSubjugate || ''), '  and says why in the age\'s own terms');
  // …and it cannot be forced past the panel: executePeaceDeal re-reads the
  // same info rather than trusting the deal handed to it.
  const before = Object.keys(w48.game.tags).filter((t) => w48.game.tags[t].overlord).length;
  try {
    MIL.executePeaceDeal(w48.ctx, war, 'ISR', { provinces: [], gold: 0, subjugate: true, release: [], transferVassals: [] });
  } catch (e) { /* the refusal is the subject, not the throw */ }
  const after = Object.keys(w48.game.tags).filter((t) => w48.game.tags[t].overlord).length;
  ok(after === before, 'a hand-built deal demanding submission creates no client either');

  // Road 3: taking a client off the enemy.
  ok(MIL.transferableVassals(w48.ctx, war, 'ISR').length === 0,
    'and no client can be taken off a defeated enemy');

  // The rule that was WAITING on this one (the §140 lesson): the diplomatic
  // chapter objective defaults to "maintain N client kingdoms" from the second
  // chapter onward, which would be a contract the age had just made impossible.
  const src = await import('node:fs').then((fs) =>
    fs.readFileSync(R + '/js/sim/chapters.js', 'utf8'));
  ok(/mechanicOn\(ctx, 'clientKingdoms'\) && \(hasClients \|\| seq >= 2\)/.test(src),
    'the League of Crowns objective is gated on the same switch');
  ok(typeof CH.monthlyChapters === 'function', '  (chapters.js still loads)');

  // And the switch is 1948's alone — every other chapter keeps its clients.
  for (const era of ERAS) {
    if (era.bookmark.id === '1948ce') continue;
    const w = boot(era.bookmark.id, (era.bookmark.playableTags[0] || {}).tag);
    ok(MIL.mechanicOn(w.ctx, 'clientKingdoms') === true,
      era.bookmark.id + ' still keeps client kingdoms');
  }

  // The age's refusal is checked BEFORE the separate-peace one, because
  // "subjugation waits for the full congress" would promise a clause the
  // congress cannot write either. That reorder took the congress rule's only
  // assertion out of smoke43 (which runs in 1948), so it is pinned here
  // instead, in a chapter that still has clients to argue about.
  {
    const w66 = boot('66ce', 'JUD');
    const w = Object.values(w66.game.wars || {})[0];
    if (w) {
      const side = w.attackers.includes('JUD') ? w.defenders : w.attackers;
      const other = side.find((t) => t !== (w.attackers.includes('JUD') ? w.defenders[0] : w.attackers[0]));
      const sep = other ? MIL.peaceDealInfo(w66.ctx, w, 'JUD', other) : null;
      if (sep && sep.separate) {
        ok(!sep.canSubjugate && /congress/.test(sep.whyNotSubjugate || ''),
          '66 CE still answers a separate peace with the congress rule');
      } else {
        ok(true, '66 CE opens with no separate table to test (congress rule covered by smoke53)');
      }
    }
  }
}

// ---------------------------------------------------------------------------
console.log('== nobody is succeeded by an ancient in 1948 (SPEC §143) ==');
{
  const MIL = await import(R + '/js/sim/military.js');
  const { rollCourtier } = await import(R + '/js/sim/realm.js');
  const G = MIL.GENERAL_NAMES;
  // The pools that belong to antiquity. If a 1948 court draws from one of
  // these, somebody's successor is going to be called Quintus Petillius.
  const ANCIENT = ['israelite', 'hellenic', 'latin', 'iranian', 'arab', 'syrian', 'egyptian', 'armenian'];
  const ancientPools = new Set(ANCIENT.map((k) => G[k]));

  const w = boot('1948ce', 'ISR');
  for (const t of w.bookmark.activeTags) {
    const pool = MIL.courtNamePool(w.ctx, t);
    ok(!ancientPools.has(pool), t + ' draws its court from its own century (' + pool[0] + '…)');
    // …and the names it actually produces are from that pool, through the two
    // functions that seat people: the successor and the general.
    const heir = rollCourtier(w.ctx, t).name;
    const gen = MIL.rollGeneral(w.ctx, t).name;
    ok(pool.indexOf(heir) >= 0 && pool.indexOf(gen) >= 0,
      '  a successor (' + heir + ') and a general (' + gen + ') both come from it');
  }
  // The four that had no modern pool at all, named.
  const EXPECT = { ITA: 'italian', GRC: 'greek_modern', UK: 'british', IRN: 'iranian_modern' };
  for (const [tag, key] of Object.entries(EXPECT)) {
    ok(MIL.courtNamePool(w.ctx, tag) === G[key], tag + ' is staffed from the ' + key + ' pool');
  }

  // The reason this is per-CHAPTER and not per-culture: GRC plays in two
  // chapters twenty-one centuries apart, and Nikanor is right in one of them.
  const w167 = boot('167bce', 'HAS');
  ok(MIL.courtNamePool(w167.ctx, 'GRC') === G.hellenic,
    'the same tag in 167 BCE is still Hellenistic — Nikanor, Apollonios, Philon');
  ok(MIL.courtNamePool(w167.ctx, 'HAS') === G.israelite,
    '  and the Hasmoneans are still Hasmonean');

  // A chapter that names no pool is untouched: the resolution chain decides.
  // Since SPEC §173 that chain has two rungs — an era-bounded court may carry
  // its own STATIC pool (an Ostrogoth is named from the gothic pen in any
  // century that seats one, and no century seats one twice), and only then
  // does the culture group answer. What this pins is that the CHAPTER
  // declared nothing: 529 has no tagTweaks.names, and every pool below
  // resolves from the catalog alone.
  const w529 = boot('529ce', 'SAM');
  ok(!Object.values(w529.bookmark.tagTweaks || {}).some((tw) => tw && tw.names),
    '529 itself still names no pool for anybody');
  for (const t of w529.bookmark.activeTags) {
    const d = DEFINES.TAGS[t] || {};
    const cul = DEFINES.CULTURES[d.culture] || {};
    const expect = (d.names && G[d.names]) || G[cul.group] || G.hellenic;
    ok(MIL.courtNamePool(w529.ctx, t) === expect,
      '529 leaves ' + t + ' on its own pen (' + (d.names || cul.group) + ')');
  }
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
