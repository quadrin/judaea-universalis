// Headless regression — SPEC §256: the provinces the Republic made.
//
// The 167 chapter runs from the year after Pydna to 6 CE and used to move the
// Mediterranean boundary exactly twice in a hundred and seventy-three years:
// Macedonia in 148 and Numantia in 133. Its own sibling chapters say what that
// century produced — political_maps.js deals the 67 board with Rome holding
// Africa and Spain, and the 40 board with Rome holding Gaul and Massalia — and
// the chapter that is supposed to PRODUCE those boards produced neither. A
// campaign played to its last card ended with Carthage standing, the leagues of
// Hellas a court, Numidia a kingdom, and a Ptolemy reigning in Alexandria
// thirty-six years after Octavian took it.
//
// Seven contracts:
//
//   1. THE MAP ARRIVES WHERE ITS SIBLINGS OPEN. Play the package and Rome holds
//      what MAP_67 and MAP_40 say it holds; the four courts the century ended
//      stop being courts.
//   2. §111'S TRANSFER DISCIPLINE. Every card takes off its named loser and off
//      nobody else — a Judaea that took Cyprus for itself keeps Cyprus.
//   3. NO ORPHANS, EVER. After every card in turn: no province owned by a court
//      that does not exist, no army or fleet flying a dead banner, no war with
//      an empty side.
//   4. A CARD ASKS BEFORE IT ACTS. With Rome gone, every gate is shut, every
//      effect is a no-op, and nothing throws.
//   5. THE CALENDAR IS THE RECORD'S. Every card dated, in order, inside the
//      chapter, between the ultimatum of 149 and the division of 27.
//   6. THE CARD THIS REPLACED IS GONE, AND ITS INHERITANCE IS NOT. No
//      `ev_w_carthage_corinth`; the Lesson of the Two Cities and the `twoCities`
//      flag land on the Achaean War card, in the same year, second.
//   7. THE ONE PLAYER CARD IS A CHOICE. Pelusium is decided by the crown, not
//      by Rome, and both of its roads cost something.
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

function boot(seed) {
  const era = ERAS.find((e) => e.bookmark.id === '167bce');
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({
    DEFINES, MAP_DATA, geom: null, bookmark: era.bookmark, events: era.events,
    playerTag: 'HAS', rngSeed: seed || 256, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: null, bus,
    bookmark: era.bookmark, events: era.events, provinceMap,
  });
  return { game, ctx, era };
}
const era0 = ERAS.find((e) => e.bookmark.id === '167bce');
const PACKAGE = era0.events.filter((e) => e && typeof e.id === 'string' && e.id.startsWith('ev_pv_'));
const card = (w, id) => w.era.events.find((e) => e && e.id === id);
const gateOpen = (w, id) => {
  const c = card(w, id);
  return !c || typeof c.when !== 'function' ? true : !!c.when(w.ctx);
};
const owner = (w, name) => {
  const p = w.ctx.prov(name);
  return p ? p.owner : null;
};
const held = (w, tag) => w.game.provinces.filter((p) => p && !p.impassable && p.owner === tag).length;
const isCourt = (w, tag) => {
  const t = w.game.tags[tag];
  return !!(t && t.alive !== false);
};
// Play the whole package in calendar order, honouring each card's own gate.
function playPackage(w, opts = {}) {
  const played = [];
  for (const c of PACKAGE) {
    if (opts.skip && opts.skip.indexOf(c.id) >= 0) continue;
    if (!gateOpen(w, c.id)) continue;
    c.options[0].effects(w.ctx);
    played.push(c.id);
    if (opts.after) opts.after(c.id);
  }
  return played;
}

// ---------------------------------------------------------------------------
console.log('== 1 · the map arrives where the sibling chapters open ==');
{
  const w = boot();
  const romeBefore = held(w, 'ROM');
  const played = playPackage(w);
  ok(played.length === PACKAGE.length,
    `every card in the package fires on an untouched board (${played.length}/${PACKAGE.length})`);

  // MAP_67's own lines, in political_maps.js: provincia Africa, Lusitania south
  // of the Tagus, the Baleares, the provincia of 121-118, Salona and Tomis.
  const IN_67 = ['Carthago', 'Hadrumetum', 'Thysdrus', 'Tacape',
    'Emerita', 'Salmantica', 'Olisipo', 'Baleares',
    'Narbo', 'Nemausus', 'Tolosa', 'Genava', 'Salona', 'Tomis'];
  const missing67 = IN_67.filter((n) => owner(w, n) !== 'ROM');
  ok(missing67.length === 0,
    'Rome holds the 67 BCE board\'s own Roman west' + (missing67.length ? ' — missing ' + missing67.join(', ') : ''));

  // MAP_40's: Gallia Comata, Massilia, Africa Nova, and the Masaesyli marches
  // in Mauretanian hands rather than Roman.
  const IN_40 = ['Lugdunum', 'Augustodunum', 'Avaricum', 'Lutetia', 'Durocortorum',
    'Augusta Treverorum', 'Vesontio', 'Burdigala', 'Condate',
    'Massilia', 'Emporiae', 'Cirta', 'Hippo Regius', 'Capsa', 'Theveste'];
  const missing40 = IN_40.filter((n) => owner(w, n) !== 'ROM');
  ok(missing40.length === 0,
    'and the 40 BCE board\'s: Gaul, Massalia and Africa Nova' + (missing40.length ? ' — missing ' + missing40.join(', ') : ''));
  const moorish = ['Saldae', 'Icosium', 'Caesarea Mauretaniae', 'Portus Magnus'];
  ok(moorish.every((n) => owner(w, n) === 'MAU'),
    'the Masaesyli marches go to Mauretania, which backed the winner, and not to Rome');

  // The east and south the package also settles.
  ok(owner(w, 'Corinth') === 'ROM' && owner(w, 'Athens') === 'ROM' && owner(w, 'Rhodes') === 'ROM'
    && owner(w, 'Gortyn') === 'ROM' && owner(w, 'Sparta') === 'ROM',
    'Greece is Roman: Corinth in 146, Athens in 86, Rhodes in 42, Crete in 67, the rest in 27');
  ok(owner(w, 'Cyrene') === 'ROM' && owner(w, 'Salamis') === 'ROM' && owner(w, 'Alexandria') === 'ROM',
    'and so are Cyrene by will, Cyprus by statute, and Egypt by conquest');

  // The four courts the century ended.
  for (const t of ['CAR', 'GRC', 'NUM', 'PTO']) {
    ok(!isCourt(w, t) && held(w, t) === 0, t + ' is no longer a court, and holds nothing');
  }
  ok(held(w, 'ROM') > romeBefore * 2.5,
    `Rome ends the chapter with the empire it had: ${romeBefore} → ${held(w, 'ROM')} provinces`);
  // And the peoples history did NOT finish are still there.
  ok(isCourt(w, 'LUS') && held(w, 'LUS') > 0,
    'the Lusitani keep the northwest: Augustus takes Bracara and Asturica, not Brutus');
  ok(isCourt(w, 'MAU') && held(w, 'MAU') > 0, 'and Mauretania is still a kingdom in 6 CE, because it was');
}

// ---------------------------------------------------------------------------
console.log('== 2 · §111: off the named loser, and off nobody else ==');
{
  const w = boot();
  // A Judaea that has taken these for itself before the cards come.
  const mine = ['Salamis', 'Paphos', 'Corinth', 'Cyrene', 'Alexandria', 'Rhodes', 'Gortyn', 'Athens'];
  for (const n of mine) {
    const p = w.ctx.prov(n);
    p.owner = 'HAS'; p.controller = 'HAS';
  }
  playPackage(w);
  const taken = mine.filter((n) => owner(w, n) !== 'HAS');
  ok(taken.length === 0,
    'a crown that took Cyprus, Corinth, Cyrene, Rhodes, Crete, Athens and Alexandria for itself keeps all of them'
    + (taken.length ? ' — lost ' + taken.join(', ') : ''));
  // …and the cards still do their work on what the losers DO still hold.
  ok(owner(w, 'Carthago') === 'ROM' && owner(w, 'Marmarica') === 'ROM',
    'while what the named losers still held passes exactly as it should');

  // The other half of the same rule: a third court holding the ground is not a
  // loser either. Parthia in Massilia is absurd and that is the point — the
  // predicate must not care why a living court is standing there.
  const w2 = boot();
  for (const n of ['Massilia', 'Narbo', 'Salona', 'Tomis']) {
    const p = w2.ctx.prov(n);
    p.owner = 'PAR'; p.controller = 'PAR';
  }
  playPackage(w2);
  ok(['Massilia', 'Narbo', 'Salona', 'Tomis'].every((n) => owner(w2, n) === 'PAR'),
    'and a living third court on the ground keeps it — the rule is the loser\'s name, not the map square');

  // And the rule one step further in: a card ruins only what it takes. If
  // Judaea got to the Isthmus before Mummius did, what Mummius has is a war,
  // not a sack — so the razing, the ruin and the colonies must all be silent.
  const w3 = boot();
  const before = {};
  for (const n of ['Corinth', 'Carthago', 'Athens', 'Rhodes', 'Massilia', 'Baleares', 'Narbo', 'Cyrene']) {
    const p = w3.ctx.prov(n);
    p.owner = 'HAS'; p.controller = 'HAS';
    before[n] = (p.dev.tax || 0) + (p.dev.prod || 0);
  }
  playPackage(w3);
  const scarred = [];
  for (const n of Object.keys(before)) {
    const p = w3.ctx.prov(n);
    if ((p.dev.tax || 0) + (p.dev.prod || 0) !== before[n]) scarred.push(n + ': development');
    if ((p.modifiers || []).length) scarred.push(n + ': ' + p.modifiers.map((m) => m.id).join('/'));
  }
  ok(scarred.length === 0,
    'a city the crown already holds is neither razed, ruined, colonized nor roaded by a Roman card'
    + (scarred.length ? ' — ' + scarred.join(' · ') : ''));
  // …while the same cards, on ground Rome does take, still do all of it.
  const w4 = boot();
  playPackage(w4);
  const marks = (n) => (w4.ctx.prov(n).modifiers || []).map((m) => m.id);
  ok(marks('Carthago').indexOf('ground_where_carthage_stood') >= 0
    && marks('Athens').indexOf('the_piraeus_burned') >= 0
    && marks('Rhodes').indexOf('all_but_the_chariot') >= 0
    && marks('Baleares').indexOf('colonists_out_of_spain') >= 0
    && marks('Narbo').indexOf('via_domitia') >= 0,
    'and every one of those marks lands where Rome is the one standing there');
}

// ---------------------------------------------------------------------------
console.log('== 3 · no orphans, after every card in turn ==');
{
  const w = boot();
  const bad = [];
  playPackage(w, {
    after: (id) => {
      const g = w.game;
      for (let i = 1; i < g.provinces.length; i++) {
        const p = g.provinces[i];
        if (!p || p.impassable) continue;
        if (p.owner !== 'WASTE' && !g.tags[p.owner]) bad.push(id + ': province ' + p.name + ' owned by ' + p.owner);
        if (p.controller && p.controller !== 'WASTE' && p.controller !== 'REB' && !g.tags[p.controller]) {
          bad.push(id + ': province ' + p.name + ' controlled by ' + p.controller);
        }
      }
      for (const a of Object.values(g.armies || {})) {
        if (a && !g.tags[a.tag]) bad.push(id + ': army ' + a.name + ' flying ' + a.tag);
      }
      for (const f of Object.values(g.fleets || {})) {
        if (f && !g.tags[f.tag]) bad.push(id + ': fleet ' + f.name + ' flying ' + f.tag);
      }
      for (const war of g.wars || []) {
        if (!war) continue;
        if (!war.attackers.length || !war.defenders.length) bad.push(id + ': war ' + war.name + ' with an empty side');
        for (const t of war.attackers.concat(war.defenders)) {
          if (!g.tags[t]) bad.push(id + ': war ' + war.name + ' fought by ' + t);
        }
      }
    },
  });
  ok(bad.length === 0, 'nothing is left pointing at a court that stopped existing' + (bad.length ? ' — ' + bad.slice(0, 4).join(' · ') : ''));

  // The war the package opens is a real war, and it is over when the city is.
  const w2 = boot();
  card(w2, 'ev_pv_carthage_ultimatum').options[0].effects(w2.ctx);
  const punic = (w2.game.wars || []).find((x) => x && /Punic/.test(x.name || ''));
  ok(!!punic && punic.attackers.indexOf('ROM') >= 0 && punic.defenders.indexOf('CAR') >= 0,
    'the ultimatum of 149 opens the Third Punic War on the map, Rome against Carthage');
  ok(Object.values(w2.game.armies).some((a) => a.tag === 'CAR')
    && Object.values(w2.game.armies).some((a) => a.tag === 'ROM' && /Africa/.test(a.name || '')),
    'and both sides field an army for it');
  card(w2, 'ev_pv_carthage_falls').options[0].effects(w2.ctx);
  ok(!(w2.game.wars || []).some((x) => x && /Punic/.test(x.name || '')),
    'and the war ends with the city, because there is nobody left to fight it');
}

// ---------------------------------------------------------------------------
console.log('== 4 · a card asks before it acts ==');
{
  // Rome gone: every gate shut, every effect harmless. A chapter can lose Rome
  // — a player can take Roma — and the century's dispatches must not throw.
  const w = boot();
  delete w.game.tags.ROM;
  let threw = null;
  const before = w.game.provinces.map((p) => (p ? p.owner : null)).join('|');
  for (const c of PACKAGE) {
    if (gateOpen(w, c.id)) {
      try { c.options[0].effects(w.ctx); } catch (e) { threw = c.id + ': ' + e.message; }
    }
  }
  const after = w.game.provinces.map((p) => (p ? p.owner : null)).join('|');
  ok(!threw, 'with Rome gone, no card in the package throws' + (threw ? ' — ' + threw : ''));
  ok(before === after, 'and not one province changes hands');

  // Each of the four dissolutions is gated on the court it dissolves, so a
  // player who finished Carthage or Egypt first does not fire a card into a
  // hole. (Egypt's card is checked on a board where PTO is already gone.)
  const w2 = boot();
  delete w2.game.tags.PTO;
  delete w2.game.tags.CAR;
  delete w2.game.tags.NUM;
  delete w2.game.tags.GRC;
  ok(!gateOpen(w2, 'ev_pv_egypt_annexed') && !gateOpen(w2, 'ev_pv_carthage_falls')
    && !gateOpen(w2, 'ev_pv_africa_nova') && !gateOpen(w2, 'ev_pv_achaea_provincia'),
    'and a court already off the board is not annexed a second time');
}

// ---------------------------------------------------------------------------
console.log('== 5 · the calendar is the record\'s ==');
{
  const era = ERAS.find((e) => e.bookmark.id === '167bce');
  const dated = PACKAGE.every((c) => c.date && Number.isFinite(c.date.y) && Number.isFinite(c.date.m));
  ok(dated, 'every card in the package is dated');
  let ordered = true;
  for (let i = 1; i < PACKAGE.length; i++) {
    const a = PACKAGE[i - 1].date, b = PACKAGE[i].date;
    if (b.y < a.y || (b.y === a.y && b.m < a.m)) ordered = false;
  }
  ok(ordered, 'and they are written down in the order they happened');
  const first = PACKAGE[0].date, last = PACKAGE[PACKAGE.length - 1].date;
  ok(first.y === -149 && last.y === -27,
    `the span is the ultimatum to the division of the provinces (${first.y} → ${last.y})`);
  ok(PACKAGE.every((c) => c.date.y >= era.bookmark.startDate.y),
    'nothing is dated before the chapter opens');
  // The chapter already reached 6 CE before this package; it must not have
  // grown a longer horizon, because the era page measures communities by it.
  const lastOfAll = era.events.reduce((y, e) => (e && e.date && Number.isFinite(e.date.y) && e.date.y > y ? e.date.y : y), -999);
  ok(lastOfAll === 6, 'and the chapter still ends where it ended: 6 CE, the year of the other history');
  ok(PACKAGE.every((c) => c.world === true), 'every card is a world card');
  ok(PACKAGE.every((c) => Array.isArray(c.options) && c.options.length >= 1
    && c.options.every((o) => o && typeof o.label === 'string' && typeof o.tooltip === 'string'
      && typeof o.effects === 'function')),
    'and every road on every card is labelled, priced in its tooltip, and does something');
}

// ---------------------------------------------------------------------------
console.log('== 6 · the card this replaced is gone, and its inheritance is not ==');
{
  const era = ERAS.find((e) => e.bookmark.id === '167bce');
  ok(!era.events.some((e) => e && e.id === 'ev_w_carthage_corinth'),
    'the one-card version of 146 — two cities, no boundary moved — is gone');
  const w = boot();
  card(w, 'ev_pv_carthage_falls').options[0].effects(w.ctx);
  ok(!w.game.flags.twoCities, 'the lesson is not complete when only Carthage has burned');
  card(w, 'ev_pv_achaean_war').options[0].effects(w.ctx);
  ok(w.game.flags.twoCities === true, 'and it is when Corinth has, second, in the same year');
  const mods = (w.game.tags.ROM.modifiers || []).map((m) => m.id);
  ok(mods.indexOf('lesson_of_two_cities') >= 0 && mods.indexOf('province_of_africa') >= 0,
    'Rome carries both the Lesson of the Two Cities and the Province of Africa');
  const sel = w.game.tags.SEL;
  ok(sel && sel.opinion && sel.opinion.ROM <= -20,
    'and the eastern chanceries still cool by what that year cost them');
  // The ruin of Corinth is lifted by the colony that replaces it, not left to
  // sit under a Roman colonia for three hundred years.
  const w2 = boot();
  playPackage(w2);
  const corinth = w2.ctx.prov('Corinth');
  const cmods = (corinth.modifiers || []).map((m) => m.id);
  ok(cmods.indexOf('the_sack_of_corinth') < 0 && cmods.indexOf('colony_on_the_isthmus') >= 0,
    'Corinth is refounded in 27, and the sack does not outlive the colony that ends it');
  // Cyrenaica's twenty-two years of nobody are twenty-two years, not for ever.
  const cyrene = w2.ctx.prov('Cyrene');
  ok(!(cyrene.modifiers || []).some((m) => m.id === 'province_nobody_was_sent_to'),
    'and the province nobody was sent to has a governor once Metellus brings it one');
}

// ---------------------------------------------------------------------------
console.log('== 7 · Pelusium is the crown\'s to answer ==');
{
  const w = boot();
  const c = card(w, 'ev_pv_alexandrian_war');
  ok(typeof c.decider === 'function' && c.decider(w.ctx) === 'HAS',
    'the road at Pelusium is decided in Jerusalem, not in Rome');
  ok(c.options.length === 2, 'and it is a choice with two roads');
  const t0 = w.game.tags.HAS;
  const mp0 = t0.manpower, tr0 = t0.treasury;
  c.options[0].effects(w.ctx);
  ok(t0.manpower < mp0 && t0.treasury < tr0,
    'sending the men costs men and money');
  ok(w.game.tags.ROM.opinion.HAS >= 70
    && (t0.modifiers || []).some((m) => m.id === 'what_was_done_at_pelusium'),
    'and buys the privileges a grateful dictator grants');
  const w2 = boot();
  card(w2, 'ev_pv_alexandrian_war').options[1].effects(w2.ctx);
  ok((w2.game.tags.ROM.opinion.HAS || 0) < 0
    && !(w2.game.tags.HAS.modifiers || []).some((m) => m.id === 'what_was_done_at_pelusium'),
    'and staying out costs the favour, which is the other half of a real choice');
  ok(w2.game.flags.pelusiumRefused === true && !w2.game.flags.pelusiumOpened,
    'the two roads write different world facts, and never both');
  // Every OTHER card in the package is a notice from a foreign capital: this is
  // §104's rule about what a world card is for, checked rather than asserted.
  const noticeOnly = PACKAGE.filter((x) => x.id !== 'ev_pv_alexandrian_war');
  ok(noticeOnly.every((x) => x.decider === 'ROM' && x.options.length === 1),
    'and the other eighteen are dispatches Rome decides and Jerusalem reads');
}

console.log(failures ? `smoke174: ${failures} FAILURES` : 'smoke174: ALL PASS');
process.exit(failures ? 1 : 0);
