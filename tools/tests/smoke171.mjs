// Headless regression — SPEC §251: the civil wars the rest of the chapters
// never fought.
//
// §239 put five scripted civil wars on the map and §249 added the 132
// chapter's two. Everywhere else a civil war was still a ruler swap and a
// modifier: the First Fitna was −10% income on one green Caliphate that never
// divided; the Second Fitna, nine years in which most of the Muslim world
// prayed for a caliph in Mecca, was the same modifier again; Caesar crossed the
// Rubicon and Rome stayed one colour; the Liberators assessed Judaea for seven
// hundred talents from provinces they did not appear to hold; Labienus overran
// Roman Asia and Rome lost nothing; Italy raised its own senate and its own
// coinage and the map showed Roman Italy; Sulla landed at Brundisium and the
// war was three unrest points in the Forum; the Gallic units swore an empire of
// the Gauls and it existed in a tooltip; and the Judaean civil war of the 90s —
// six years, a Seleucid king invited in by Judaeans, eight hundred crosses —
// consisted of a flag called `etrogimSpilled`.
//
// Six contracts, per arc where they apply:
//
//   1. THE CLAIM IS A COUNTRY: the card puts provinces under another banner
//      and the parent is exactly that much smaller, with a war on.
//   2. ON EITHER ROAD. The options are what this court does about a civil war,
//      not whether there is one.
//   3. ONE BANNER. `USR` is singular; every arc gives it back before the next
//      chapter arc needs it, and a whole campaign's worth run in sequence.
//   4. THE SETTLEMENT IS WHOLE: ground, garrisons, treasury, and the civil war
//      itself, with the letters forwarding home.
//   5. ONLY WHAT THE PARENT HOLDS goes over — a player's own province is never
//      handed to somebody else's claimant.
//   6. THE JUDAEAN RISING is the sectarian half: rebel-held districts and
//      hosts in the field, put down by the card that ends the war.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { livingTag } = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

function boot(eraId, tag, seed) {
  const era = ERAS.find((e) => e.bookmark.id === eraId);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const bus = {
    _h: {},
    emit(k, p) { (this._h[k] || []).forEach((f) => f(p)); },
    on(k, f) { (this._h[k] = this._h[k] || []).push(f); return () => {}; },
  };
  const game = initGame({
    DEFINES, MAP_DATA, geom: null, bookmark: era.bookmark, events: era.events,
    playerTag: tag, rngSeed: seed || 251, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: null, bus,
    bookmark: era.bookmark, events: era.events, provinceMap,
  });
  return { game, ctx, era, bus };
}
const card = (w, id) => w.era.events.find((e) => e && e.id === id);
const owned = (game, tag) => game.provinces.filter((p) => p && !p.impassable && p.owner === tag).length;
const play = (w, id, opt) => {
  const c = card(w, id);
  if (!c || !c.options[opt || 0] || typeof c.options[opt || 0].effects !== 'function') return false;
  c.options[opt || 0].effects(w.ctx);
  return true;
};
const usrWar = (game) => game.wars.some((x) => x
  && ((x.attackers || []).concat(x.defenders || [])).indexOf('USR') >= 0);
// The caliphate has to have taken its conquests before it can lose them to
// itself: the AI chapter may or may not have, and this suite is about the
// division rather than about the conquest. Hand the parent the ground the arc
// is fought over, the way the conquest cards would have.
function grant(w, tag, names) {
  // A dormant court cannot lose a civil war it is not awake for: the 614
  // chapter's caliphate wakes on its own card, and every one of these arcs
  // presumes that card has already been answered.
  const t = w.game.tags[tag];
  if (t) t.alive = true;
  for (const n of names) {
    const p = w.ctx.prov(n);
    if (!p || p.impassable) continue;
    p.owner = tag;
    p.controller = tag;
  }
}

// The arcs: chapter, the card that raises the claim, the card that settles it,
// what the claimant is called, and a province it must and must not hold.
const ARCS = [
  {
    era: '614ce', player: 'JUD', parent: 'RSH',
    rise: 'ev_p_uthman_slain', end: 'ev_p_ali_falls',
    name: 'The Caliphate at Damascus',
    grantTo: ['Damascus', 'Emesa', 'Antioch', 'Bostra', 'Chalcis'],
    his: ['Damascus', 'Emesa', 'Antioch'],
    // Medina is the parent court's seat; the Syrian claim never takes it.
    notHis: ['Yathrib'],
  },
  {
    era: '614ce', player: 'JUD', parent: 'RSH',
    rise: 'ev_p_second_fitna', end: 'ev_p_zubayr_falls',
    name: 'The Caliphate of Ibn al-Zubayr',
    grantTo: ['Macoraba', 'Yamama', 'Najran', 'Uruk', 'Babylon', 'Yathrib', 'Damascus'],
    his: ['Macoraba', 'Uruk', 'Babylon'],
    // Syria and the seat stay Umayyad — that is the shape of the war.
    notHis: ['Damascus', 'Yathrib'],
  },
  {
    era: '67bce', player: 'HYR', parent: 'ROM',
    rise: 'ev4_caesar_civil_war', end: 'ev4_pharsalus',
    name: 'The Republic in the East',
    his: ['Corinth', 'Thessalonica', 'Smyrna'],
    notHis: ['Roma', 'Narbo', 'Carthago'],
  },
  {
    era: '67bce', player: 'HYR', parent: 'ROM',
    rise: 'ev4_cassius_talents', end: 'ev4_w_philippi',
    name: 'The Liberators',
    his: ['Corinth', 'Thessalonica', 'Smyrna'],
    notHis: ['Roma', 'Narbo', 'Carthago'],
  },
  {
    era: '40bce', player: 'HER', parent: 'ROM',
    rise: 'ev5_labienus', end: 'ev5_cilician_gates',
    name: 'Labienus Parthicus',
    his: ['Tarsus', 'Iconium', 'Smyrna'],
    notHis: ['Roma', 'Antioch', 'Corinth'],
  },
  {
    era: '66ce', player: 'JUD', parent: 'ROM',
    rise: 'ev_fw_civilis', end: 'ev_fw_civilis_ends',
    name: 'The Empire of the Gauls',
    his: ['Batavia', 'Colonia Agrippina', 'Augusta Treverorum'],
    notHis: ['Roma', 'Lugdunum', 'Narbo'],
  },
  {
    era: '167bce', player: 'HAS', parent: 'ROM',
    rise: 'ev_rw_social_war', end: 'ev_rw_italia_enrolled',
    name: 'Italia',
    his: ['Capua', 'Tarentum', 'Rhegium'],
    // Rome itself, and everything north of the Apennines: the Po did not rise.
    notHis: ['Roma', 'Mediolanum', 'Ravenna'],
  },
  {
    era: '167bce', player: 'HAS', parent: 'ROM',
    rise: 'ev_rw_sulla_returns', end: 'ev_rw_proscriptions',
    name: 'The Proconsul\'s Army',
    his: ['Brundisium', 'Tarentum', 'Capua'],
    notHis: ['Roma', 'Ancona', 'Mediolanum'],
  },
  {
    era: '1948ce', player: 'ISR', parent: 'YEM',
    rise: 'ev_s48_sanaa_officers', end: 'ev_s48_yemen_compromise',
    name: 'The Mutawakkilite Imamate',
    // One province is a whole third of this republic, and it is the third the
    // Imam actually got out to.
    minHeld: 1,
    his: ['Marib'],
    notHis: ['Sanaa', 'Hodeida'],
  },
];

// ---------------------------------------------------------------------------
console.log('== 1 · every claim is a country, and the parent is that much smaller ==');
for (const arc of ARCS) {
  const w = boot(arc.era, arc.player);
  if (arc.grantTo) grant(w, arc.parent, arc.grantTo);
  const whole = owned(w.game, arc.parent);
  ok(!w.game.tags.USR, `${arc.rise}: no claimant before the card`);
  ok(play(w, arc.rise, 0), '  the card plays');
  const held = owned(w.game, 'USR');
  ok(!!w.game.tags.USR && w.game.tags.USR.name === arc.name, `  ${arc.name} is on the map`);
  ok(held >= (arc.minHeld || 3), `  holding ${held} provinces of its own`);
  ok(owned(w.game, arc.parent) === whole - held,
    `  and ${arc.parent} is exactly that much smaller (${owned(w.game, arc.parent)}/${whole})`);
  ok(usrWar(w.game), '  with a civil war on between the two of them');
  for (const n of arc.his) ok(w.ctx.prov(n).owner === 'USR', `  ${n} obeys the claimant`);
  for (const n of arc.notHis) ok(w.ctx.prov(n).owner !== 'USR', `  ${n} does not`);
}

// ---------------------------------------------------------------------------
console.log('== 2 · the rising is not the player\'s to decline ==');
for (const arc of ARCS) {
  const w = boot(arc.era, arc.player);
  const c = card(w, arc.rise);
  if (!c || c.options.length < 2) continue; // one-road cards have nothing to test
  if (arc.grantTo) grant(w, arc.parent, arc.grantTo);
  ok(play(w, arc.rise, 1), `${arc.rise} opt1 plays`);
  ok(!!w.game.tags.USR && owned(w.game, 'USR') >= (arc.minHeld || 3),
    `  the second road raises ${arc.name} too`);
  ok(usrWar(w.game), '  and declares the same war');
}

// ---------------------------------------------------------------------------
console.log('== 3 · the settlement is whole ==');
for (const arc of ARCS) {
  const w = boot(arc.era, arc.player);
  if (arc.grantTo) grant(w, arc.parent, arc.grantTo);
  const whole = owned(w.game, arc.parent);
  play(w, arc.rise, 0);
  w.game.tags.USR.treasury = 300;
  const hosts = Object.values(w.game.armies).filter((a) => a && (a.tag === arc.parent || a.tag === 'USR')).length;
  ok(play(w, arc.end, 0), `${arc.end} plays`);
  ok(!w.game.tags.USR, '  the claimant is off the map');
  ok(owned(w.game, arc.parent) === whole,
    `  every province is back under one banner (${owned(w.game, arc.parent)}/${whole})`);
  ok(w.game.provinces.filter((p) => p && !p.impassable && p.owner === 'USR').length === 0,
    '  nothing is left owned by a banner nobody flies');
  // The settling card may spend or confiscate on its own account, so the
  // claimant's chest is measured against the same card played over an empty
  // one: the difference is exactly what the dying court was carrying.
  const control = boot(arc.era, arc.player);
  if (arc.grantTo) grant(control, arc.parent, arc.grantTo);
  play(control, arc.rise, 0);
  control.game.tags.USR.treasury = 0;
  play(control, arc.end, 0);
  ok(Math.round(w.game.tags[arc.parent].treasury - control.game.tags[arc.parent].treasury) === 300,
    '  the claimant\'s treasury came home with it');
  ok(Object.values(w.game.armies).filter((a) => a && a.tag === arc.parent).length === hosts,
    '  and so did the garrisons');
  ok(!usrWar(w.game), '  with no war left being fought by a country that does not exist');
  ok(livingTag(w.ctx, 'USR') === arc.parent, '  and the letters forward home');
}

// ---------------------------------------------------------------------------
console.log('== 4 · only what the parent still holds goes over ==');
{
  // The Return holding Palestine does not hand it to a rival caliph.
  const w = boot('614ce', 'JUD');
  grant(w, 'RSH', ['Damascus', 'Emesa', 'Antioch', 'Bostra', 'Chalcis']);
  const mine = ['Jerusalem', 'Caesarea Maritima', 'Joppa'];
  for (const n of mine) { w.ctx.prov(n).owner = 'JUD'; w.ctx.prov(n).controller = 'JUD'; }
  play(w, 'ev_p_uthman_slain', 0);
  for (const n of mine) ok(w.ctx.prov(n).owner === 'JUD', `${n} is the Return's and stays the Return's`);
  ok(w.ctx.prov('Damascus').owner === 'USR', 'and the jund the caliphate does hold still goes over');
}
{
  // …and a Judaea that has taken the Phoenician coast keeps it out of
  // Pompey's Republic.
  const w = boot('67bce', 'HYR');
  const mine = ['Tyre', 'Sidon', 'Ptolemais'];
  for (const n of mine) { w.ctx.prov(n).owner = 'HYR'; w.ctx.prov(n).controller = 'HYR'; }
  play(w, 'ev4_caesar_civil_war', 0);
  for (const n of mine) ok(w.ctx.prov(n).owner === 'HYR', `${n} is ours and stays ours`);
  ok(w.ctx.prov('Corinth').owner === 'USR', 'and Rome\'s own Greece still goes over');
}

// ---------------------------------------------------------------------------
console.log('== 5 · one banner, in sequence, for a whole chapter ==');
{
  // 167 BCE flies it twice, three years apart; 614 twice, thirty years apart;
  // 67 BCE twice, five years apart; 66 CE twice in one year — Vitellius in
  // January and the Gauls in September. Each must give the banner back.
  const runs = [
    ['167bce', 'HAS', [['ev_rw_social_war', 'ev_rw_italia_enrolled'], ['ev_rw_sulla_returns', 'ev_rw_proscriptions']]],
    ['67bce', 'HYR', [['ev4_caesar_civil_war', 'ev4_pharsalus'], ['ev4_cassius_talents', 'ev4_w_philippi']]],
    ['66ce', 'JUD', [['ev_year_of_four_emperors', 'ev_vespasian_emperor'], ['ev_fw_civilis', 'ev_fw_civilis_ends']]],
  ];
  for (const [eraId, tag, seq] of runs) {
    const w = boot(eraId, tag);
    const parent = 'ROM';
    const whole = owned(w.game, parent);
    for (const [rise, end] of seq) {
      play(w, rise, 0);
      ok(!!w.game.tags.USR && owned(w.game, 'USR') >= 1, `${eraId}: ${rise} raises a court`);
      play(w, end, 0);
      ok(!w.game.tags.USR, `  ${end} puts it out again`);
    }
    ok(owned(w.game, parent) === whole,
      `  and ${parent} is whole at the end of it (${owned(w.game, parent)}/${whole})`);
  }
  // The two fitnas, on the one banner, thirty years apart.
  const w = boot('614ce', 'JUD');
  grant(w, 'RSH', ['Damascus', 'Emesa', 'Antioch', 'Bostra', 'Chalcis', 'Macoraba', 'Yamama', 'Uruk']);
  const whole = owned(w.game, 'RSH');
  play(w, 'ev_p_uthman_slain', 0);
  ok(!!w.game.tags.USR, '614ce: the Sufyanid claim is raised');
  play(w, 'ev_p_ali_falls', 0);
  ok(!w.game.tags.USR, '  and folded up at Ali\'s death');
  ok(w.game.tags.RSH.name === 'Umayyad Caliphate', '  leaving the state the winner renamed');
  play(w, 'ev_p_second_fitna', 0);
  ok(!!w.game.tags.USR, '  the banner is free for Ibn al-Zubayr');
  play(w, 'ev_p_zubayr_falls', 0);
  ok(!w.game.tags.USR, '  and put out again at the sanctuary door');
  ok(owned(w.game, 'RSH') === whole, `  with the caliphate whole (${owned(w.game, 'RSH')}/${whole})`);
}

// ---------------------------------------------------------------------------
console.log('== 6 · a claim with no ground is a proclamation, and is not made ==');
for (const arc of ARCS) {
  const w = boot(arc.era, arc.player);
  // Strip the parent of everything: no province, no claimant, no war, and no
  // throw either — the card falls back to the ledger it always was.
  for (const p of w.game.provinces) {
    if (p && p.owner === arc.parent) { p.owner = 'WASTE'; p.controller = 'WASTE'; }
  }
  ok(play(w, arc.rise, 0), `${arc.rise} still plays with nothing to divide`);
  ok(!w.game.tags.USR, '  and raises nobody');
}

// ---------------------------------------------------------------------------
console.log('== 7 · the Judaean civil war is on the ground ==');
{
  const w = boot('167bce', 'HAS');
  const has = w.game.tags.HAS;
  ok(!!has, 'the Hasmonean crown is seated');
  // Give the crown the hill country the schools rose in.
  const hills = ['Jerusalem', 'Neapolis', 'Sebaste', 'Hebron', 'Adora', 'Emmaus'];
  grant(w, 'HAS', hills);
  const rebelHeld = () => w.game.provinces.filter((p) => p && p.owner === 'HAS' && p.controller === 'REB').length;
  const bands = () => Object.values(w.game.armies).filter((a) => a && a.tag === 'REB' && a.name === 'The Country in Arms').length;
  ok(rebelHeld() === 0 && bands() === 0, 'no rising before the feast');
  ok(play(w, 'ev_etrogim', 0), 'the citrons are answered with the guards');
  ok(rebelHeld() >= 2, `  the country is in arms in ${rebelHeld()} districts`);
  ok(bands() >= 2, `  with ${bands()} hosts standing on them`);
  ok(w.ctx.prov('Jerusalem').controller === 'HAS', '  and the king keeps his own seat');
  ok((has.modifiers || []).some((m) => m && m.id === 'the_king_and_the_nation'),
    '  the war of the king and the nation is on the ledger');

  // The invitation road that brings the six thousand back takes a host home.
  const before = bands();
  play(w, 'ev_demetrius_invited', 0);
  ok(bands() === before - 1, '  the Six Thousand walk out of the largest band');

  // …and Bethome ends it.
  play(w, 'ev_eight_hundred', 0);
  ok(bands() === 0, '  the crosses leave nobody in the field');
  ok(rebelHeld() === 0, '  and every district answers the crown again');
  ok(!(has.modifiers || []).some((m) => m && m.id === 'the_king_and_the_nation'),
    '  with the war off the ledger');

  // The other road at the feast avoids the war entirely.
  const w2 = boot('167bce', 'HAS');
  grant(w2, 'HAS', hills);
  play(w2, 'ev_etrogim', 1);
  ok(w2.game.provinces.filter((p) => p && p.controller === 'REB' && p.owner === 'HAS').length === 0,
    'withdrawing from the altar raises nobody');
}

// ---------------------------------------------------------------------------
console.log('== 8 · the settling cards exist, are dated after their claim, and are the world\'s ==');
for (const arc of ARCS) {
  const w = boot(arc.era, arc.player);
  const rise = card(w, arc.rise);
  const end = card(w, arc.end);
  ok(!!rise && !!end, `${arc.rise} → ${arc.end}: both cards are in the chapter`);
  if (rise && end && rise.date && end.date) {
    const at = (d) => (d.y > 0 ? d.y - 1 : d.y) * 12 + d.m;
    ok(at(end.date) > at(rise.date), '  and the settlement lands after the claim');
  }
}

console.log(failures ? failures + ' FAILURES' : 'smoke171: ALL PASS');
process.exit(failures ? 1 : 0);
