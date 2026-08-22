// Headless regression — SPEC §257: the wars the conquest took.
//
// §256 moved the boundary and was reported back on twice: the conquest of
// Greece and Egypt is not absolute, and there are too few wars. Both were
// measurable. Rome ended the chapter without Pontus, without the Anatolian
// interior Pompey's own settlement organized, without Damascus (held by the
// SOUTHERN Seleucid crown, which that card did not name as a loser), without
// Halicarnassus, Toletum, the Rhine bank, the Spanish northwest, the Alps,
// Illyricum, Moesia, Pannonia or Germania — every one of them ground the 40 or
// 66 board hands to the chapters after this one as Roman. And it took all of it
// by transfer: one declared war in the package, and Greece and Egypt each
// changed hands in a card about an aftermath.
//
// Six contracts:
//
//   1. THE CONQUEST IS ABSOLUTE WHERE THE BOARDS SAY IT IS. Fire the chapter
//      and Rome holds every cell the 40 BCE board holds, Greece and Egypt cell
//      by cell included.
//   2. AND STOPS WHERE THEY SAY IT STOPS. Thrace, Commagene, Osroene, Ituraea,
//      Armenia, the Bosporus, Mauretania and Britain are not annexed, because
//      they were not — not inside this chapter.
//   3. THEY ARE WARS. Six Roman wars open on the map and six close; Greece and
//      Egypt are each taken by one, declared before and settled after.
//   4. NO WAR IS LEFT HANGING, AND NOTHING IS ORPHANED — after every card in
//      turn.
//   5. §111 STILL HOLDS. The player's own conquests survive every one of these
//      cards, and so does a living third court standing on the ground.
//   6. THE CHAPTER DID NOT GROW. Every card dated inside it, in order, and the
//      6 CE horizon the era page measures communities by has not moved.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const era = ERAS.find((e) => e.bookmark.id === '167bce');
// Every dated card the chapter plays, in calendar order — this suite is about
// what the CHAPTER produces, not what one package does.
const DATED = era.events
  .filter((e) => e && e.date && Number.isFinite(e.date.y) && Array.isArray(e.options) && e.options.length)
  .slice()
  .sort((a, b) => (a.date.y - b.date.y) || ((a.date.m || 1) - (b.date.m || 1)));
const PACKAGE = era.events.filter((e) => e && typeof e.id === 'string' && e.id.startsWith('ev_pw_'));

function boot(seed) {
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({
    DEFINES, MAP_DATA, geom: null, bookmark: era.bookmark, events: era.events,
    playerTag: 'HAS', rngSeed: seed || 257, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: null, bus,
    bookmark: era.bookmark, events: era.events, provinceMap,
  });
  return { game, ctx };
}
// Play the chapter's whole calendar, advancing the clock as it goes so that
// truces, windows and gates answer the way they would in a campaign.
function playChapter(w, after) {
  for (const c of DATED) {
    w.game.date = { y: c.date.y, m: c.date.m || 1, d: 1 };
    if (typeof c.when === 'function' && !c.when(w.ctx)) continue;
    const i = Number.isFinite(c.aiOption) ? c.aiOption : 0;
    const o = c.options[i] || c.options[0];
    if (!o || typeof o.effects !== 'function') continue;
    o.effects(w.ctx);
    if (after) after(c);
  }
}
const owner = (w, n) => { const p = w.ctx.prov(n); return p ? p.owner : null; };
const isCourt = (w, t) => { const x = w.game.tags[t]; return !!(x && x.alive !== false); };

// The 40 BCE board's own Roman cells that the 167 chapter has to produce, read
// off js/data/political_maps.js and bookmark_40bce.js. Grouped by what the
// report named.
const MUST_BE_ROMAN = {
  Greece: ['Corinth', 'Athens', 'Sparta', 'Gortyn', 'Rhodes', 'Halicarnassus',
    'Thessalonica', 'Hadrianopolis', 'Byzantion', 'Nicaea', 'Ancyra', 'Smyrna'],
  Egypt: ['Alexandria', 'Memphis', 'Pelusium', 'Rhinocolura', 'Athribis', 'Leontopolis',
    'Arsinoe', 'Oxyrhynchus', 'Thebes', 'Myos Hormos', 'Syene', 'Berenice',
    'Paraetonium', 'Cyrene', 'Marmarica', 'Salamis', 'Paphos'],
  Pontus: ['Sinope', 'Trapezus', 'Phasis'],
  Anatolia: ['Caesarea Mazaca', 'Tyana', 'Iconium', 'Melitene', 'Attalia', 'Pisidia'],
  Syria: ['Antioch', 'Damascus', 'Emesa', 'Tyre', 'Sidon', 'Tarsus'],
  Africa: ['Carthago', 'Hadrumetum', 'Thysdrus', 'Tacape', 'Cirta', 'Hippo Regius',
    'Capsa', 'Theveste'],
  Hispania: ['Bracara', 'Asturica', 'Toletum', 'Numantia', 'Emerita', 'Olisipo',
    'Salmantica', 'Baleares', 'Emporiae'],
  Gaul: ['Narbo', 'Tolosa', 'Lugdunum', 'Lutetia', 'Massilia',
    'Colonia Agrippina', 'Mogontiacum', 'Batavia', 'Atuatuca', 'Argentorate'],
  Danube: ['Salona', 'Delminium', 'Siscia', 'Sirmium', 'Singidunum', 'Novae', 'Naissus',
    'Carnuntum', 'Aquincum', 'Virunum', 'Augusta Vindelicorum', 'Tomis'],
};

// ---------------------------------------------------------------------------
console.log('== 1 · absolute where the boards say absolute ==');
{
  const w = boot();
  playChapter(w);
  for (const region of Object.keys(MUST_BE_ROMAN)) {
    const missing = MUST_BE_ROMAN[region].filter((n) => owner(w, n) !== 'ROM');
    ok(missing.length === 0,
      region + ' is Roman entire' + (missing.length ? ' — still outside: ' + missing.join(', ') : ''));
  }
  for (const t of ['CAR', 'GRC', 'NUM', 'PTO', 'PNT']) {
    ok(!isCourt(w, t), t + ' is no longer a court');
  }
  const romeHolds = w.game.provinces.filter((p) => p && !p.impassable && p.owner === 'ROM').length;
  ok(romeHolds >= 135, `Rome ends the chapter on ${romeHolds} provinces`);
}

// ---------------------------------------------------------------------------
console.log('== 2 · and stops where they say it stops ==');
{
  const w = boot();
  playChapter(w);
  // Client crowns and outside-the-chapter conquests. Each one is a date this
  // chapter does not reach, and a card that would be a lie if it existed.
  const KEPT = [
    ['THR', ['Serdica', 'Philippopolis'], 'Thrace stays a client crown — annexed 46 CE'],
    ['CMG', ['Samosata'], 'Commagene keeps Samosata — 72 CE'],
    ['OSR', ['Edessa', 'Carrhae'], 'Osroene keeps the Roman-Parthian border towns'],
    ['ITU', ['Chalcis'], 'Ituraea keeps Chalcis'],
    ['ARM', ['Tigranocerta', 'Sophene'], 'Armenia is beaten twice here and annexed never'],
    ['BOS', ['Panticapaeum'], 'the Bosporus is a client kingdom, not a province'],
    ['MAU', ['Volubilis', 'Tingis'], 'Mauretania is a kingdom until 40 CE'],
    ['BRT', ['Britannia'], 'Britain is 43 CE and is not in this chapter'],
    ['GRM', ['Garama'], 'and the Garamantes were never anybody\'s'],
  ];
  for (const [tag, cells, why] of KEPT) {
    ok(isCourt(w, tag) && cells.every((n) => owner(w, n) === tag), why);
  }
}

// ---------------------------------------------------------------------------
console.log('== 3 · they are wars ==');
{
  const w = boot();
  const opened = [];
  const seen = new Set();
  playChapter(w, () => {
    for (const war of w.game.wars || []) {
      if (!war || seen.has(war.name)) continue;
      seen.add(war.name);
      const all = (war.attackers || []).concat(war.defenders || []);
      if (all.indexOf('ROM') >= 0) opened.push(war.name);
    }
  });
  const WANT = ['The Third Punic War', 'The Achaean War', 'The First Mithridatic War',
    'The Third Mithridatic War', 'The Illyrian War', 'The War with the Queen of Egypt'];
  for (const name of WANT) ok(opened.indexOf(name) >= 0, `Rome fights ${name} on the map`);
  ok(!(w.game.wars || []).some((x) => x && WANT.indexOf(x.name) >= 0),
    'and every one of them is over by the last page');

  // Greece and Egypt specifically: declared before, settled after — the two the
  // report named, and the two that used to be bare transfers.
  const w2 = boot();
  const order = [];
  playChapter(w2, (c) => {
    if (['ev_pw_achaean_defiance', 'ev_pv_achaean_war', 'ev_pw_war_on_the_queen',
      'ev_pw_actium', 'ev_pv_egypt_annexed'].indexOf(c.id) >= 0) order.push(c.id);
  });
  ok(order.indexOf('ev_pw_achaean_defiance') >= 0
    && order.indexOf('ev_pw_achaean_defiance') < order.indexOf('ev_pv_achaean_war'),
    'Greece: the league declares, and the sack is that war\'s peace');
  ok(order.indexOf('ev_pw_war_on_the_queen') < order.indexOf('ev_pw_actium')
    && order.indexOf('ev_pw_actium') < order.indexOf('ev_pv_egypt_annexed'),
    'Egypt: the fetial spear, then Actium, then the annexation — in that order');

  // A war with armies in it, not a line in a ledger.
  const w3 = boot();
  const card = (id) => era.events.find((e) => e && e.id === id);
  w3.game.date = { y: -88, m: 6, d: 1 };
  card('ev_pw_mithridates_crosses').options[0].effects(w3.ctx);
  ok(Object.values(w3.game.armies).filter((a) => a.tag === 'PNT').length >= 2
    && Object.values(w3.game.fleets).some((f) => f.tag === 'PNT'),
    'Mithridates crosses with armies in Asia and Attica and a fleet at Sinope');
  w3.game.date = { y: -86, m: 8, d: 1 };
  card('ev_pw_chaeronea').options[0].effects(w3.ctx);
  const inGreece = Object.values(w3.game.armies).filter((a) => {
    const p = w3.game.provinces[a.prov];
    return a.tag === 'PNT' && p && ['Athens', 'Corinth', 'Sparta', 'Thessalonica'].indexOf(p.canon || p.name) >= 0;
  });
  ok(inGreece.length === 0, 'and Chaeronea and Orchomenus clear Greece of them');
}

// ---------------------------------------------------------------------------
console.log('== 4 · nothing hanging, nothing orphaned ==');
{
  const w = boot();
  const bad = [];
  playChapter(w, (c) => {
    const g = w.game;
    for (let i = 1; i < g.provinces.length; i++) {
      const p = g.provinces[i];
      if (!p || p.impassable) continue;
      if (p.owner !== 'WASTE' && !g.tags[p.owner]) bad.push(c.id + ': ' + p.name + ' owned by ' + p.owner);
      if (p.controller && p.controller !== 'WASTE' && p.controller !== 'REB' && !g.tags[p.controller]) {
        bad.push(c.id + ': ' + p.name + ' controlled by ' + p.controller);
      }
    }
    for (const a of Object.values(g.armies || {})) if (a && !g.tags[a.tag]) bad.push(c.id + ': army ' + a.tag);
    for (const f of Object.values(g.fleets || {})) if (f && !g.tags[f.tag]) bad.push(c.id + ': fleet ' + f.tag);
    for (const war of g.wars || []) {
      if (!war) continue;
      if (!war.attackers.length || !war.defenders.length) bad.push(c.id + ': empty side in ' + war.name);
      for (const t of war.attackers.concat(war.defenders)) {
        if (!g.tags[t]) bad.push(c.id + ': ' + war.name + ' fought by ' + t);
      }
    }
  });
  ok(bad.length === 0, 'the whole calendar runs without an orphan'
    + (bad.length ? ' — ' + bad.slice(0, 4).join(' · ') : ''));

  // With Rome gone, none of the seventeen throws and none of them moves a
  // province: a player can take Roma.
  const w2 = boot();
  delete w2.game.tags.ROM;
  const before = w2.game.provinces.map((p) => (p ? p.owner : null)).join('|');
  let threw = null;
  for (const c of PACKAGE) {
    w2.game.date = { y: c.date.y, m: c.date.m || 1, d: 1 };
    if (typeof c.when === 'function' && !c.when(w2.ctx)) continue;
    try { c.options[0].effects(w2.ctx); } catch (e) { threw = c.id + ': ' + e.message; }
  }
  ok(!threw, 'with Rome gone nothing throws' + (threw ? ' — ' + threw : ''));
  ok(before === w2.game.provinces.map((p) => (p ? p.owner : null)).join('|'),
    'and not one province changes hands');
}

// ---------------------------------------------------------------------------
console.log('== 5 · §111 still holds ==');
{
  const w = boot();
  const mine = ['Corinth', 'Athens', 'Alexandria', 'Sinope', 'Halicarnassus', 'Caesarea Mazaca',
    'Bracara', 'Toletum', 'Siscia', 'Virunum', 'Mogontiacum', 'Chatti'];
  for (const n of mine) { const p = w.ctx.prov(n); p.owner = 'HAS'; p.controller = 'HAS'; }
  playChapter(w);
  const lost = mine.filter((n) => owner(w, n) !== 'HAS');
  ok(lost.length === 0, 'a crown holding twelve of the century\'s prizes keeps every one of them'
    + (lost.length ? ' — lost ' + lost.join(', ') : ''));

  const w2 = boot();
  for (const n of ['Delminium', 'Novae', 'Frisia', 'Trapezus']) {
    const p = w2.ctx.prov(n); p.owner = 'PAR'; p.controller = 'PAR';
  }
  playChapter(w2);
  ok(['Delminium', 'Novae', 'Frisia', 'Trapezus'].every((n) => owner(w2, n) === 'PAR'),
    'and a living third court on the ground keeps it');
}

// ---------------------------------------------------------------------------
console.log('== 6 · the chapter did not grow ==');
{
  ok(PACKAGE.length === 18, `the package is eighteen cards (${PACKAGE.length})`);
  ok(PACKAGE.every((c) => c.date && Number.isFinite(c.date.y) && c.world === true),
    'every one of them dated, and a world card');
  let ordered = true;
  for (let i = 1; i < PACKAGE.length; i++) {
    const a = PACKAGE[i - 1].date, b = PACKAGE[i].date;
    if (b.y < a.y || (b.y === a.y && b.m < a.m)) ordered = false;
  }
  ok(ordered, 'written down in the order they happened');
  const first = PACKAGE[0].date.y, last = PACKAGE[PACKAGE.length - 1].date.y;
  ok(first === -146 && last === -7, `spanning the Achaean war to the German province (${first} → ${last})`);
  const horizon = era.events.reduce((y, e) => (e && e.date && Number.isFinite(e.date.y) && e.date.y > y ? e.date.y : y), -999);
  ok(horizon === 6, 'and the chapter still ends at 6 CE, which the era page measures communities by');
  ok(PACKAGE.every((c) => c.options.every((o) => o && typeof o.label === 'string'
    && typeof o.tooltip === 'string' && typeof o.effects === 'function')),
    'every road labelled, priced and live');
  ok(PACKAGE.every((c) => typeof c.historical === 'string' && c.historical.length > 20),
    'and every card says what actually happened, for the divergence ledger to read');
}

console.log(failures ? `smoke175: ${failures} FAILURES` : 'smoke175: ALL PASS');
process.exit(failures ? 1 : 0);
