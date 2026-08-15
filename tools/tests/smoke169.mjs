// Headless regression — SPEC §249: the two civil wars the East was told about
// and never saw.
//
// §239 gave five scripted civil wars a real court. The 132 chapter's own two —
// Avidius Cassius in 175 and Pescennius Niger in 193, the cards that file
// header calls "the two civil-war cards", the only two in the chapter where an
// eastern court has to pick a side — were not among them. Both fired on their
// date, both offered the choice, and neither one divided anything: Rome stayed
// one colour, there was no war, and the man the player had just declared for
// did not exist. Reported as "some of the civil wars aren't actually
// triggering".
//
// What would rot silently:
//
//   1. The rising going back to being a modifier. The whole point is that the
//      East is a different country for the months it was one, so the test is
//      province counts on the map, not a flag on a tag.
//   2. The rising happening only on the road the player takes. Cassius is
//      acclaimed whether or not this court writes to Alexandria; both options
//      must raise him, exactly as the Palmyra card already does.
//   3. A claimant left standing. `USR` is SINGULAR and reused four times in
//      this chapter — 175, 193, 269, 286. A civil war that does not end
//      poisons every later claim, because `secedeTag` refuses a banner
//      somebody is already flying.
//   4. The settlement being partial. Everything the claimant held has to come
//      home: ground, garrisons, treasury, and the civil war itself.
//   5. The ground being Rome's to give. A chapter in which the Nasi's state
//      holds the Galilee does not hand it to a Roman usurper.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const { livingTag } = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const ERA = ERAS.find((e) => e.bookmark.id === '132ce');
function boot(tag, seed) {
  const provinceMap = buildProvinceMapping(MAP_DATA, ERA.bookmark);
  const bus = {
    _h: {},
    emit(k, p) { (this._h[k] || []).forEach((f) => f(p)); },
    on(k, f) { (this._h[k] = this._h[k] || []).push(f); return () => {}; },
  };
  const game = initGame({
    DEFINES, MAP_DATA, geom: null, bookmark: ERA.bookmark, events: ERA.events,
    playerTag: tag || 'JUD', rngSeed: seed || 7, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: null, bus,
    bookmark: ERA.bookmark, events: ERA.events, provinceMap,
  });
  return { game, ctx, bus };
}
const card = (id) => ERA.events.find((e) => e && e.id === id);
const owned = (game, tag) => game.provinces.filter((p) => p && !p.impassable && p.owner === tag).length;
const play = (w, id, opt) => {
  const c = card(id);
  if (!c || !c.options[opt || 0]) return false;
  c.options[opt || 0].effects(w.ctx);
  return true;
};
const usrWar = (game) => game.wars.some((x) => x
  && ((x.attackers || []).concat(x.defenders || [])).indexOf('USR') >= 0);

// The pair, and what each claimant is supposed to be holding.
const ARCS = [
  {
    rise: 'ev2_avidius_cassius', end: 'ev2_cassius_killed',
    name: 'The Empire of Avidius Cassius',
    riseAt: { y: 175, m: 5 }, endAt: { y: 175, m: 8 },
    his: ['Antioch', 'Alexandria', 'Damascus', 'Caesarea Maritima', 'Tarsus', 'Petra'],
    // Cappadocia held for Marcus, and the commission stops short of the Aegean.
    notHis: ['Caesarea Mazaca', 'Byzantion', 'Roma', 'Smyrna'],
  },
  {
    rise: 'ev2_pescennius_niger', end: 'ev2_issus',
    name: 'The Empire of Pescennius Niger',
    riseAt: { y: 193, m: 4 }, endAt: { y: 194, m: 5 },
    his: ['Antioch', 'Alexandria', 'Byzantion', 'Nicaea', 'Caesarea Mazaca', 'Smyrna'],
    // The two harbours that read the field right on the first ballot.
    notHis: ['Laodicea', 'Tyre', 'Roma', 'Carthago'],
  },
];

// ---------------------------------------------------------------------------
console.log('== both cards raise a country, on either road ==');
for (const arc of ARCS) {
  for (const opt of [0, 1]) {
    const w = boot('JUD');
    const whole = owned(w.game, 'ROM');
    ok(!w.game.tags.USR, `${arc.rise} opt${opt}: no claimant before the card`);
    ok(play(w, arc.rise, opt), `  the card plays`);
    const held = owned(w.game, 'USR');
    ok(!!w.game.tags.USR && w.game.tags.USR.name === arc.name, `  ${arc.name} is on the map`);
    ok(held > 40, `  holding ${held} provinces of its own`);
    ok(owned(w.game, 'ROM') === whole - held, `  and Rome is that much smaller (${owned(w.game, 'ROM')}/${whole})`);
    ok(usrWar(w.game), '  with a war on between the two purples');
    if (opt === 1) {
      // The road the player does NOT take is still the road the world takes.
      ok(held > 40, '  the rising is not the player\'s to decline');
    }
  }
}

// ---------------------------------------------------------------------------
console.log('== each claimant holds what he actually held ==');
for (const arc of ARCS) {
  const w = boot('JUD');
  play(w, arc.rise, 0);
  for (const n of arc.his) ok(w.ctx.prov(n).owner === 'USR', `${arc.name}: ${n} obeys the claimant`);
  for (const n of arc.notHis) ok(w.ctx.prov(n).owner === 'ROM', `  ${n} does not`);
}

// ---------------------------------------------------------------------------
console.log('== and only what Rome still holds goes over ==');
{
  // A chapter in which the Nasi's state kept the Galilee keeps it: the
  // usurper's roster names those cells and `secedeTag` passes over them.
  const w = boot('JUD');
  const mine = ['Sepphoris', 'Tiberias', 'Gischala'];
  for (const n of mine) w.ctx.prov(n).owner = 'JUD';
  play(w, 'ev2_avidius_cassius', 0);
  for (const n of mine) ok(w.ctx.prov(n).owner === 'JUD', `${n} is the Nasi's and stays the Nasi's`);
  ok(w.ctx.prov('Antioch').owner === 'USR', 'and Rome\'s own eastern capital still goes over');
}

// ---------------------------------------------------------------------------
console.log('== every claim is put out by the card that settles it ==');
for (const arc of ARCS) {
  const w = boot('JUD');
  const whole = owned(w.game, 'ROM');
  play(w, arc.rise, 0);
  w.game.tags.USR.treasury = 300;
  const purse = w.game.tags.ROM.treasury + 300;
  const men = Object.values(w.game.armies).filter((a) => a && a.tag === 'ROM').length
    + Object.values(w.game.armies).filter((a) => a && a.tag === 'USR').length;
  ok(play(w, arc.end), `${arc.end} plays`);
  ok(!w.game.tags.USR, '  the claimant is off the map');
  ok(owned(w.game, 'ROM') === whole, `  every province is back under one banner (${owned(w.game, 'ROM')}/${whole})`);
  ok(w.game.provinces.filter((p) => p && !p.impassable && p.owner === 'USR').length === 0,
    '  and nothing is left owned by a banner nobody flies');
  ok(Math.round(w.game.tags.ROM.treasury) === Math.round(purse), '  the treasury came home too');
  ok(Object.values(w.game.armies).filter((a) => a && a.tag === 'ROM').length === men,
    '  and so did the garrisons');
  ok(!usrWar(w.game), '  with no war left being fought by a country that does not exist');
  ok(livingTag(w.ctx, 'USR') === 'ROM', '  and the letters forward home');
}

// ---------------------------------------------------------------------------
console.log('== the settling card is a notice, the raising card is a choice ==');
for (const arc of ARCS) {
  const rise = card(arc.rise);
  const end = card(arc.end);
  ok(!!rise && !rise.decider && rise.options.length === 2,
    `${arc.rise} asks an eastern court to pick a side`);
  ok(!!end && end.decider === 'ROM' && end.options.length === 1,
    `${arc.end} is Rome's business and arrives as a notice`);
  ok(end.date.y * 12 + end.date.m > rise.date.y * 12 + rise.date.m,
    '  and it lands after the card that raised the claim');
}

// ---------------------------------------------------------------------------
console.log('== a live campaign: raised on the date, put out on the date ==');
{
  const w = boot('JUD', 1234567);
  const { game, ctx, bus } = w;
  const actions = gameActions(ctx);
  game.paused = false;
  const shown = new Map();
  bus.on('event', (p) => { if (p && p.event && !shown.has(p.event.id)) shown.set(p.event.id, `${game.date.y}/${game.date.m}`); });
  const swings = [];
  let had = false;
  const whole = owned(game, 'ROM');
  const dpm = DEFINES.DAYS_PER_MONTH || 30;
  // 132 → 195: far enough for both arcs and nothing else that flies the banner.
  for (let d = 0; d < dpm * 12 * 63; d++) {
    tickDay(ctx);
    let guard = 0;
    while (game.pendingEvents.length && guard++ < 300) {
      const pe = game.pendingEvents[0];
      const ev = card(pe.eventId) || (ctx.dynEvents && ctx.dynEvents.get(pe.eventId));
      try { actions.chooseEventOption(pe.instanceId, (ev && typeof ev.aiOption === 'number') ? ev.aiOption : 0); }
      catch (e) { game.pendingEvents.shift(); }
      game.paused = false;
    }
    if (game.paused) game.paused = false;
    if (game.over) game.over = false;
    const now = !!(game.tags.USR && game.tags.USR.alive);
    if (now !== had) { had = now; swings.push({ up: now, y: game.date.y, m: game.date.m, held: now ? owned(game, 'USR') : 0 }); }
  }
  for (const arc of ARCS) {
    ok(!!game.firedEvents[arc.rise] && shown.has(arc.rise), `${arc.rise} reached the table`);
    ok(!!game.firedEvents[arc.end] && shown.has(arc.end), `${arc.end} reached the table`);
  }
  ok(swings.length === 4, `the East changed hands four times, not none (${swings.length})`);
  const [up1, down1, up2, down2] = swings;
  ok(up1 && up1.up && up1.y === 175 && up1.m === 5 && up1.held > 40,
    `Cassius is a country in 175/5 with ${up1 && up1.held} provinces`);
  ok(down1 && !down1.up && down1.y === 175 && down1.m === 8, 'and is not one by 175/8');
  ok(up2 && up2.up && up2.y === 193 && up2.m === 4 && up2.held > 40,
    `Niger is a country in 193/4 with ${up2 && up2.held} provinces`);
  ok(down2 && !down2.up && down2.y === 194 && down2.m === 5, 'and is not one by 194/5');
  ok(!game.tags.USR, 'the banner is free again when the century needs it');
  ok(owned(game, 'ROM') === whole, `and the empire is whole (${owned(game, 'ROM')}/${whole})`);
}

// ---------------------------------------------------------------------------
console.log('== four claims, one banner, one campaign ==');
{
  const w = boot('JUD');
  const whole = owned(w.game, 'ROM');
  const seq = [
    ['ev2_avidius_cassius', 'ev2_cassius_killed'],
    ['ev2_pescennius_niger', 'ev2_issus'],
    ['ev2_palmyra_rises', 'ev2_aurelian_palmyra'],
    ['ev2_eu_carausius', 'ev2_eu_tetrarchy'],
  ];
  for (const [rise, end] of seq) {
    play(w, rise, 0);
    ok(!!w.game.tags.USR && owned(w.game, 'USR') >= 1, rise + ' raises a court');
    play(w, end, 0);
    ok(!w.game.tags.USR, '  ' + end + ' puts it out again');
  }
  ok(owned(w.game, 'ROM') === whole, `and the empire is whole at the end of it (${owned(w.game, 'ROM')}/${whole})`);
}

console.log(failures ? failures + ' FAILURES' : 'smoke169: ALL PASS');
