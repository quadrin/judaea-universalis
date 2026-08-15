// Headless regression — SPEC §239: the rival purple.
//
// A civil war is not two countries. It is one country with two men claiming
// it, and for the months or years that lasts the map has to be able to say
// which provinces obey which. Until now every scripted civil war in the game
// was a ruler swap and a modifier: Magnentius held nothing, Vitellius held
// nothing, Zenobia governed the Levant for five years without appearing on
// it. One tag — `USR` — is raised by the card that raises the claim, dressed
// for the man whose it is, and dissolved by the card that settles it.
//
// What would rot silently:
//
//   1. A court that is raised and never put out. The tag is SINGULAR and
//      reused across chapters; a chapter that leaves it standing poisons
//      every later claim in that campaign, because `secedeTag` refuses a
//      banner somebody is already flying.
//   2. The civil war outliving the claimant. `dissolveTag` has to end the war
//      between the two halves and keep every other war the dying court was
//      in — a usurper's war with Persia is the survivor's problem.
//   3. The ground going missing. Everything the court held must come back to
//      somebody; a province left owned by a deleted tag is a hole in the map.
//   4. 351's opening in particular: the chapter's whole premise is that Rome
//      is fighting itself, and the West is a different colour from month one.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { dissolveTagCore, secedeTagCore, livingTag } = await import(R + '/js/sim/military.js');
const { FLAGS } = await import(R + '/js/ui/icons.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

function boot(id, tag) {
  const era = ERAS.find((e) => e.bookmark.id === id);
  const provinceMap = buildProvinceMapping(MAP_DATA, era.bookmark);
  const game = initGame({
    DEFINES, MAP_DATA, geom: null, bookmark: era.bookmark, events: era.events,
    playerTag: tag || era.bookmark.playableTags[0].tag, rngSeed: 31, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: null,
    bus: { emit() {}, on() { return () => {}; } },
    bookmark: era.bookmark, events: era.events, provinceMap,
  });
  return { game, ctx, era };
}
const owned = (game, tag) => game.provinces.filter((p) => p && !p.impassable && p.owner === tag).length;
const play = (w, id, opt) => {
  const c = w.era.events.find((e) => e && e.id === id);
  if (!c) return false;
  c.options[opt || 0].effects(w.ctx);
  return true;
};

// ---------------------------------------------------------------------------
console.log('== the banner exists, and nobody flies it by default ==');
{
  ok(!!DEFINES.TAGS.USR && DEFINES.TAGS.USR.name === 'The Rival Purple',
    'USR is a court in the definitions');
  ok(typeof FLAGS.USR === 'string' && FLAGS.USR.length > 60, '  with an emblem of its own');
  ok(DEFINES.GOV_OF.USR === 'monarchy', '  and a government (acclamation, held by the army)');
  for (const era of ERAS) {
    ok((era.bookmark.activeTags || []).indexOf('USR') < 0,
      era.bookmark.id + ' does not seat it in its roster');
  }
}

// ---------------------------------------------------------------------------
console.log('== the primitive: a court that stops existing ==');
{
  const w = boot('66ce', 'JUD');
  const { game, ctx } = w;
  // Raise a court out of Rome by hand, give it a war of its own, then put it out.
  const child = secedeTagCore(ctx, 'ROM', 'USR', {
    provinces: ['Roma', 'Capua', 'Mediolanum'], share: 0.25, name: 'A Claimant',
  });
  ok(!!child, 'a court can be raised out of the empire');
  game.tags.USR.treasury = 100;
  game.tags.ROM.treasury = 400;
  game.wars.push({ attackers: ['ROM'], defenders: ['USR'], warscore: { ROM: 10, USR: -10 }, name: 'The Civil War' });
  game.wars.push({ attackers: ['USR'], defenders: ['PAR'], warscore: {}, name: 'A Frontier War' });
  game.tags.ROM.atWarWith.push('USR');
  game.tags.USR.atWarWith.push('ROM', 'PAR');
  game.tags.PAR.atWarWith.push('USR');
  const armies = Object.values(game.armies).filter((a) => a.tag === 'ROM').length;
  ok(dissolveTagCore(ctx, 'USR', 'ROM') === true, 'and put out again');
  ok(!game.tags.USR, '  the tag is gone from the roster');
  ok(ctx.prov('Roma').owner === 'ROM' && ctx.prov('Mediolanum').owner === 'ROM',
    '  its ground went back to the country it came out of');
  ok(game.tags.ROM.treasury === 500, '  and so did its treasury (' + game.tags.ROM.treasury + ')');
  ok(Object.values(game.armies).filter((a) => a.tag === 'ROM').length >= armies,
    '  its garrisons are the survivor\'s');
  ok(!game.wars.some((x) => x && x.name === 'The Civil War'),
    '  the civil war ends with the man who was fighting it');
  const frontier = game.wars.find((x) => x && x.name === 'A Frontier War');
  ok(!!frontier && (frontier.attackers || []).indexOf('ROM') >= 0,
    '  and the war it was fighting with somebody else is inherited');
  ok((game.tags.PAR.atWarWith || []).indexOf('USR') < 0
    && (game.tags.PAR.atWarWith || []).indexOf('ROM') >= 0,
  '  the third party is now at war with the survivor, not with a ghost');
  ok(livingTag(ctx, 'USR') === 'ROM', '  and the letters forward to the country that survived');
  // Nothing anywhere still owned by a court that does not exist.
  const orphan = game.provinces.filter((p) => p && !p.impassable && p.owner === 'USR').length;
  ok(orphan === 0, '  no province is left owned by a deleted banner');
}

// ---------------------------------------------------------------------------
console.log('== the primitive never deletes a human chair ==');
{
  const w = boot('66ce', 'JUD');
  secedeTagCore(w.ctx, 'ROM', 'USR', { provinces: ['Roma'], share: 0.1 });
  w.game.playerTag = 'USR';
  w.game.humanTags = ['USR'];
  dissolveTagCore(w.ctx, 'USR', 'ROM');
  ok(w.game.playerTag === 'ROM' && w.game.humanTags.join() === 'ROM',
    'a player sitting in a dissolved court is moved, not deleted');
}

// ---------------------------------------------------------------------------
// Every scripted civil war in the game: the card that raises it, the card
// that settles it, and the empire whole again afterwards.
const ARCS = [
  { era: '351ce', player: 'JUD', imperial: 'ROM', name: 'The Empire of Magnentius',
    seated: true, // this one is standing when the chapter opens
    end: 'ev351w_magnentius_falls' },
  { era: '66ce', player: 'JUD', imperial: 'ROM', name: 'The Empire of Vitellius',
    rise: 'ev_year_of_four_emperors', end: 'ev_vespasian_emperor' },
  { era: '132ce', player: 'JUD', imperial: 'ROM', name: 'The Empire of Avidius Cassius',
    rise: 'ev2_avidius_cassius', end: 'ev2_cassius_killed' },
  { era: '132ce', player: 'JUD', imperial: 'ROM', name: 'The Empire of Pescennius Niger',
    rise: 'ev2_pescennius_niger', end: 'ev2_issus' },
  { era: '132ce', player: 'JUD', imperial: 'ROM', name: 'The Palmyrene Empire',
    rise: 'ev2_palmyra_rises', end: 'ev2_aurelian_palmyra' },
  { era: '132ce', player: 'JUD', imperial: 'ROM', name: 'The British Empire of Carausius',
    rise: 'ev2_eu_carausius', end: 'ev2_eu_tetrarchy' },
  { era: '529ce', player: 'SAM', imperial: 'BYZ', name: 'The Exarch\'s Rising',
    rise: 'ev529_w_africa_revolts', end: 'ev529_w_heraclius' },
];

console.log('== every civil war in the game raises a court and takes it down ==');
for (const arc of ARCS) {
  const w = boot(arc.era, arc.player);
  const whole = owned(w.game, arc.imperial) + (arc.seated ? owned(w.game, 'USR') : 0);
  if (arc.seated) {
    ok(!!w.game.tags.USR, arc.era + ': the claimant is on the map when the chapter opens');
  } else {
    ok(!w.game.tags.USR, arc.era + ': no claimant before the card that raises one');
    ok(play(w, arc.rise), '  ' + arc.rise + ' plays');
  }
  ok(!!w.game.tags.USR && w.game.tags.USR.name === arc.name,
    '  ' + (w.game.tags.USR || {}).name);
  const held = owned(w.game, 'USR');
  ok(held >= 1, '  holding ' + held + ' provinces of its own');
  ok(w.game.wars.some((x) => x
    && ((x.attackers || []).concat(x.defenders || [])).indexOf('USR') >= 0),
  '  and at war with the government it is claiming from');
  // …and then it is over.
  ok(play(w, arc.end), '  ' + arc.end + ' plays');
  ok(!w.game.tags.USR, '  the court is off the map when the war is over');
  ok(owned(w.game, arc.imperial) === whole,
    '  and every province it held is back under one banner (' + owned(w.game, arc.imperial)
      + '/' + whole + ')');
  ok(!w.game.wars.some((x) => x
    && ((x.attackers || []).concat(x.defenders || [])).indexOf('USR') >= 0),
  '  with no war left being fought by a country that does not exist');
  ok(livingTag(w.ctx, 'USR') === arc.imperial, '  and the letters forward home');
}

// ---------------------------------------------------------------------------
console.log('== 351: the chapter opens on a divided empire ==');
{
  const w = boot('351ce', 'JUD');
  const west = owned(w.game, 'USR');
  const east = owned(w.game, 'ROM');
  ok(west > 60 && east > 80, 'Magnentius holds ' + west + ' provinces, Constantius ' + east);
  for (const n of ['Roma', 'Lugdunum', 'Britannia', 'Carthago', 'Tarraco', 'Mediolanum']) {
    ok(w.ctx.prov(n).owner === 'USR', '  ' + n + ' obeys the usurper');
  }
  for (const n of ['Antioch', 'Alexandria', 'Sirmium', 'Thessalonica', 'Byzantion']) {
    ok(w.ctx.prov(n).owner === 'ROM', '  ' + n + ' obeys Constantius');
  }
  ok(w.game.tags.ARM && (w.game.tags.ARM.atWarWith || []).indexOf('USR') < 0,
    'and Rome\'s Armenian client is not marched into a civil war in Gaul');
  // Mursa is the battle that decides it and does not end it.
  ok(play(w, 'ev351_mursa'), 'Mursa plays');
  const after = owned(w.game, 'USR');
  ok(after < west && after > 0,
    '  Italy, Africa and Spain go over; Gaul and Britain hold (' + after + ' left)');
  ok(w.ctx.prov('Roma').owner === 'ROM' && w.ctx.prov('Lugdunum').owner === 'USR',
    '  Rome is Constantius\', Lyon is still Magnentius\'');
  ok(play(w, 'ev351w_magnentius_falls'), 'Lugdunum plays');
  ok(!w.game.tags.USR && owned(w.game, 'ROM') === west + east,
    '  and the empire is one again (' + owned(w.game, 'ROM') + ')');
  // The chapter's own two wars are untouched by any of it.
  const still = (w.game.tags.ROM.atWarWith || []).slice().sort().join(',');
  ok(still === 'JUD,SAS', '  Rome is still fighting the rising and Persia (' + still + ')');
}

console.log(failures ? failures + ' FAILURES' : 'smoke160: ALL PASS');
