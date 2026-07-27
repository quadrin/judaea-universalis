// Headless regression — SPEC §128: Beit Kosiba, and options that a world can close.
//
// Two things, and the first is an engine capability the game did not have.
//
// A card's answers were always all of its answers. That is right for almost
// every card in the game and wrong for an accession: a house cannot marry into
// the line of Jehoiachin if it cannot reach Babylonia, and showing the option
// greyed out is a different card from not showing it — one says "you failed to
// arrange this", the other says "this was never on the table". Options may now
// declare `when(ctx)`, the mask is fixed at the moment the card fires, and the
// original indices survive all the way to resolution, because an off-by-one
// between what the modal renders and what resolveEventOption applies would
// silently execute the wrong road.
//
// The second is the content: the founder left no rule of succession — there
// are leases at Ein Gedi in his own name and letters threatening his own
// commanders in irons and not one word about an heir — and the redemption road
// runs three hundred years past him without ever asking what the house is.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_132 } = await import(R + '/js/data/bookmark_132ce.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { CHAPTER_PATHS } = await import(R + '/js/data/chapter_paths.js');
const { EVENTS_132_KOSIBA } = await import(R + '/js/data/events_132ce_kosiba.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { checkTriggeredEvents, allowedOptions, resolveEventOption, fireEvent, findEventById } = await import(R + '/js/sim/events.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const fakeGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const events = [];
const bus = { emit(k, p) { events.push([k, p]); }, on() { return () => {}; } };
const EV = (ERAS.find((e) => e.bookmark.id === '132ce') || {}).events || [];
const CARD = (id) => EV.find((e) => e && e.id === id);

// A redemption campaign: sovereign, in Jerusalem, the flag set, a realm big
// enough for `endurance`, and a court seated so faction gates can be read.
function world(y, opts = {}) {
  const game = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_132, events: EV,
    playerTag: 'JUD', rngSeed: 4,
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_132, events: EV });
  game.date = { y, m: 6, d: 1 };
  game.wars = [];
  for (const k of Object.keys(game.tags)) game.tags[k].atWarWith = [];
  const t = game.tags.JUD;
  t.alive = true; t.ai = false; t.overlord = null;
  let n = 0;
  for (let i = 1; i < game.provinces.length && n < 14; i++) {
    const p = game.provinces[i];
    if (!p || p.impassable) continue;
    p.owner = 'JUD'; p.controller = 'JUD'; n++;
  }
  const jer = ctx.prov('Jerusalem');
  if (jer) { jer.owner = 'JUD'; jer.controller = 'JUD'; }
  game.flags.redemptionEra = true;
  t.ruler = opts.ruler || { name: 'Yehudah ben Shimon', title: 'Nasi Israel', gov: 4, infl: 3, mar: 3, age: 44 };
  t.factions = Object.assign({ captains: 50, sages: 50, villages: 50 }, opts.factions || {});
  Object.assign(game.flags, opts.flags || {});
  if (opts.east === false && game.tags.PAR) {
    game.tags.PAR.opinion = { JUD: -80 };
  } else if (game.tags.PAR) {
    game.tags.PAR.alive = true;
    game.tags.PAR.opinion = { JUD: 20 };
  }
  return { game, ctx };
}
const labels = (ev, allowed) => (allowed || ev.options.map((_, i) => i)).map((i) => ev.options[i].label);

console.log('== the option gate: a world can close a road (SPEC §128) ==');
{
  const ev = CARD('ev_bk_the_accession');
  ok(!!ev, 'the accession card is registered in the 132 chain');
  ok(ev.options.length === 4, '  and offers four constitutions (' + ev.options.length + ')');
  ok(typeof ev.options[0].when !== 'function', '  the crown is always available');
  ok(ev.options.slice(1).every((o) => typeof o.when === 'function'),
    '  and the other three are gated on the state');

  // A house with nothing: no east, no party strong enough to force anything.
  const bare = world(160, { factions: { sages: 20, captains: 50 }, east: false });
  const bareMask = allowedOptions(bare.ctx, ev);
  ok(Array.isArray(bareMask) && bareMask.length === 1 && bareMask[0] === 0,
    'a house with no east and no party is offered the crown alone ('
    + labels(ev, bareMask).join(' / ') + ')');

  // The east open: the marriage appears and nothing else does.
  const east = world(160, { factions: { sages: 20 } });
  const eastMask = allowedOptions(east.ctx, ev);
  ok(eastMask.length === 2 && eastMask.indexOf(1) >= 0,
    'with Babylonia reachable the marriage is on the table (' + labels(ev, eastMask).join(' / ') + ')');

  // Sages strong: the constitution appears.
  const sages = world(160, { factions: { sages: 75 }, east: false });
  const sageMask = allowedOptions(sages.ctx, ev);
  ok(sageMask.indexOf(3) >= 0, 'strong sages open the prince of Ezekiel');
  ok(sageMask.indexOf(1) < 0, '  and do not open the marriage, which needs the east');

  // Everything open: no mask at all, which is how the engine says "all of them".
  const all = world(160, { factions: { sages: 75, captains: 50 }, flags: { coursesChoose: true } });
  ok(allowedOptions(all.ctx, ev) === null,
    'a house with every road open is not masked at all');

  // And a card with no gated options is never masked — every card that
  // shipped before this one.
  const plain = CARD('ev_bk_the_prince_is_mortal');
  ok(allowedOptions(all.ctx, plain) === null, 'an ungated card is never masked');
}

console.log('== the mask survives the round trip to resolution ==');
{
  // The failure this guards is an off-by-one: the modal renders a subset and
  // the resolver reads an index. If those disagree the player clicks one
  // constitution and the state adopts another.
  const ev = CARD('ev_bk_the_accession');
  const w = world(160, { factions: { sages: 75 }, east: false });
  fireEvent(w.ctx, ev);
  const pe = w.game.pendingEvents.find((p) => p.eventId === ev.id);
  ok(!!pe, 'the card is queued for the player');
  ok(Array.isArray(pe.allowed) && pe.allowed.indexOf(1) < 0 && pe.allowed.indexOf(3) >= 0,
    '  carrying the mask that was true when it fired (' + JSON.stringify(pe.allowed) + ')');

  // Clicking the closed road cannot take it.
  resolveEventOption(w.ctx, pe.instanceId, 1);
  ok(!w.game.flags.kosibaMarriedDavid,
    'a closed road cannot be taken by asking for its index');
  ok(!!w.game.flags.beitKosibaSettled, '  and the card still resolves rather than hanging');

  // Clicking an open one takes exactly that one.
  const w2 = world(160, { factions: { sages: 75 }, east: false });
  fireEvent(w2.ctx, ev);
  const pe2 = w2.game.pendingEvents.find((p) => p.eventId === ev.id);
  resolveEventOption(w2.ctx, pe2.instanceId, 3);
  ok(w2.game.flags.kosibaNasiConstitution === true,
    'and an open road is taken by its own original index, not its position in the filtered list');
}

console.log('== the question opens, and the accession follows it ==');
{
  const open = CARD('ev_bk_the_prince_is_mortal');
  // Too early, and with the founder alive and young: nothing.
  const young = world(145, { ruler: { name: 'Simon bar Kosiba', title: 'Nasi Israel', gov: 2, infl: 3, mar: 5, age: 58 } });
  checkTriggeredEvents(young.ctx);
  ok(young.game.pendingEvents.every((p) => p.eventId !== open.id),
    'a founder of 58 in 145 raises no succession question');

  // Old enough that the council cannot pretend.
  const old = world(155, { ruler: { name: 'Simon bar Kosiba', title: 'Nasi Israel', gov: 2, infl: 3, mar: 5, age: 68 } });
  checkTriggeredEvents(old.ctx);
  ok(old.game.pendingEvents.some((p) => p.eventId === open.id),
    'a founder of 68 does');

  // Or simply gone.
  const gone = world(155, { ruler: { name: 'Yehudah ben Shimon', title: 'Nasi Israel', gov: 4, infl: 3, mar: 3, age: 40 } });
  checkTriggeredEvents(gone.ctx);
  ok(gone.game.pendingEvents.some((p) => p.eventId === open.id),
    'and so does a seat the founder is no longer in');

  // The accession is not scheduled — it is fired by the card before it.
  ok(typeof CARD('ev_bk_the_accession').trigger !== 'function' && !CARD('ev_bk_the_accession').date,
    'the accession has neither trigger nor date: a succession is not a month');
  const w = world(155, { ruler: { name: 'Yehudah ben Shimon', title: 'Nasi', gov: 4, infl: 3, mar: 3, age: 40 } });
  checkTriggeredEvents(w.ctx);
  const pe = w.game.pendingEvents.find((p) => p.eventId === open.id);
  resolveEventOption(w.ctx, pe.instanceId, 0);
  ok(w.game.flags.kosibaSuccessionOpen === true, 'reading the four documents opens the question');
  ok(w.game.pendingEvents.some((p) => p.eventId === 'ev_bk_the_accession'),
    '  and the accession is on the table the same morning');
}

console.log('== the prince of Ezekiel brings its own bill ==');
{
  // 46:18 forbids the prince taking the people's land, and the founder leased
  // the land of Israel in his own name. The sub-card is the barb.
  const ev = CARD('ev_bk_the_accession');
  const w = world(160, { factions: { sages: 75 }, east: false });
  fireEvent(w.ctx, ev);
  const pe = w.game.pendingEvents.find((p) => p.eventId === ev.id);
  resolveEventOption(w.ctx, pe.instanceId, 3);
  ok(w.game.pendingEvents.some((p) => p.eventId === 'ev_bk_the_land_of_the_prince'),
    'adopting the constitution raises the leases immediately');
  const land = w.game.pendingEvents.find((p) => p.eventId === 'ev_bk_the_land_of_the_prince');
  resolveEventOption(w.ctx, land.instanceId, 1);
  ok(w.game.flags.landRenounced === true, 'and it can be answered by giving them up');
  const mods = (w.game.tags.JUD.modifiers || []).map((m) => m.id);
  ok(mods.indexOf('the_leases_surrendered') >= 0, '  which costs the treasury, permanently');

  // No other constitution raises it, because no other one forbids it.
  for (const [idx, name] of [[0, 'the crown'], [2, 'two houses']]) {
    const other = world(160, { factions: { sages: 75, priests: 70 }, flags: { coursesChoose: true } });
    fireEvent(other.ctx, ev);
    const p2 = other.game.pendingEvents.find((p) => p.eventId === ev.id);
    resolveEventOption(other.ctx, p2.instanceId, idx);
    ok(other.game.pendingEvents.every((p) => p.eventId !== 'ev_bk_the_land_of_the_prince'),
      '  ' + name + ' does not raise the leases, because it does not forbid them');
  }
}

console.log('== the memory, and the bill on the first defeat ==');
{
  const grass = CARD('ev_bk_grass_on_akivas_cheeks');
  ok(grass.options.length === 3, 'the doubt has three answers (' + grass.options.length + ')');
  const w = world(200, { flags: { beitKosibaSettled: true, kosibaCrowned: true } });
  checkTriggeredEvents(w.ctx);
  ok(w.game.pendingEvents.some((p) => p.eventId === grass.id),
    'and it is asked of a settled house a generation on');

  const koziba = CARD('ev_bk_bar_kokhba_or_bar_koziba');
  // No defeat, no card: this one waits, possibly forever, which is correct.
  const calm = world(220, { flags: { beitKosibaSettled: true, kosibaCrowned: true } });
  checkTriggeredEvents(calm.ctx);
  ok(calm.game.pendingEvents.every((p) => p.eventId !== koziba.id),
    'a state that never loses a battle is never asked which spelling it is');

  // A frontier breaks.
  function defeat(flags) {
    const d = world(240, { flags: Object.assign({ beitKosibaSettled: true }, flags) });
    let broke = 0;
    for (let i = 1; i < d.game.provinces.length && broke < 3; i++) {
      const p = d.game.provinces[i];
      if (!p || p.impassable || p.owner !== 'JUD' || p.name === 'Jerusalem') continue;
      p.controller = 'ROM'; broke++;
    }
    checkTriggeredEvents(d.ctx);
    return d;
  }
  const lost = defeat({ kosibaCrowned: true });
  ok(lost.game.pendingEvents.some((p) => p.eventId === koziba.id),
    'a broken frontier brings the other spelling back');

  // And the constitution is what answers it — four different answers, and a
  // fifth for a campaign that never settled the question at all.
  const outcomes = [
    ['kosibaCrowned', 'kozibaByForce'],
    ['kosibaMarriedDavid', 'kozibaByPedigree'],
    ['kosibaTwoHouses', 'kozibaByAltar'],
    ['kosibaNasiConstitution', 'kozibaByOffice'],
  ];
  for (const [constitution, mark] of outcomes) {
    const d = defeat({ [constitution]: true });
    const pe = d.game.pendingEvents.find((p) => p.eventId === koziba.id);
    ok(!!pe, constitution + ' reaches the card');
    resolveEventOption(d.ctx, pe.instanceId, 1);
    ok(d.game.flags[mark] === true, '  and answers it as ' + mark);
  }
  // The one road the sketch says has the best answer also has the only one
  // that leaves the state steadier than it found it.
  const nasi = defeat({ kosibaNasiConstitution: true });
  const before = nasi.game.tags.JUD.stability;
  const pe = nasi.game.pendingEvents.find((p) => p.eventId === koziba.id);
  resolveEventOption(nasi.ctx, pe.instanceId, 1);
  ok(nasi.game.tags.JUD.stability > before,
    'a magistrate who loses a battle is still a magistrate (' + before + ' → ' + nasi.game.tags.JUD.stability + ')');
  const crowned = defeat({ kosibaCrowned: true });
  const cbefore = crowned.game.tags.JUD.stability;
  const cpe = crowned.game.pendingEvents.find((p) => p.eventId === koziba.id);
  resolveEventOption(crowned.ctx, cpe.instanceId, 1);
  ok(crowned.game.tags.JUD.stability < cbefore,
    '  and a crown with no title to it is not (' + cbefore + ' → ' + crowned.game.tags.JUD.stability + ')');
}

console.log('== silence is a bet on the constitution, not a use of it ==');
{
  function defeat2(flags) {
    const d = world(240, { flags: Object.assign({ beitKosibaSettled: true }, flags) });
    let broke = 0;
    for (let i = 1; i < d.game.provinces.length && broke < 3; i++) {
      const p = d.game.provinces[i];
      if (!p || p.impassable || p.owner !== 'JUD' || p.name === 'Jerusalem') continue;
      p.controller = 'ROM'; broke++;
    }
    checkTriggeredEvents(d.ctx);
    return d;
  }
  const koziba = CARD('ev_bk_bar_kokhba_or_bar_koziba');
  const nasi = defeat2({ kosibaNasiConstitution: true });
  const nb = nasi.game.tags.JUD.legitimacy;
  resolveEventOption(nasi.ctx, nasi.game.pendingEvents.find((p) => p.eventId === koziba.id).instanceId, 0);
  ok(nasi.game.flags.kozibaMetWithSilence === true, 'a state may decline to answer a pun');
  ok(nasi.game.tags.JUD.legitimacy >= nb,
    '  and a house whose founding is a document survives the silence (' + nb + ' → ' + nasi.game.tags.JUD.legitimacy + ')');
  const crown = defeat2({ kosibaCrowned: true });
  const cb = crown.game.tags.JUD.legitimacy;
  resolveEventOption(crown.ctx, crown.game.pendingEvents.find((p) => p.eventId === koziba.id).instanceId, 0);
  ok(crown.game.tags.JUD.legitimacy < cb,
    '  and a house whose founding is an assertion does not (' + cb + ' → ' + crown.game.tags.JUD.legitimacy + ')');
}

console.log('== the rest of the chapter reads off what they decided ==');
{
  // The point of the whole package: four cards in the 150s that the terminals
  // two hundred and fifty years later still know about.
  const term = readFileSync(R + '/js/data/events_132ce_redemption.js', 'utf8');
  const FOUR = ['kosibaNasiConstitution', 'kosibaTwoHouses', 'kosibaMarriedDavid', 'kosibaCrowned'];
  ok(FOUR.every((f) => term.includes(f)),
    'the 425 redemption terminal reads all four constitutions back');
  const endure = readFileSync(R + '/js/data/events_132ce_endure.js', 'utf8');
  ok(FOUR.every((f) => endure.includes(f)),
    'and so does the endure terminal, in the year Rome abolished the office');

  // And the card whose premise the constitution destroys stands down.
  const chair = CARD('ev_e_the_king_and_the_nasi');
  for (const [constitution, expect] of [
    ['kosibaNasiConstitution', false], ['kosibaTwoHouses', false],
    ['kosibaCrowned', true], ['kosibaMarriedDavid', true],
  ]) {
    const w = world(300, {
      flags: { beitKosibaSettled: true, [constitution]: true },
      ruler: { name: 'X', title: 'Nasi', gov: 5, infl: 4, mar: 3, age: 50 },
    });
    const asked = !!chair.trigger(w.ctx);
    ok(asked === expect, (expect ? 'the crown and the chair is still open under ' : 'it is settled already under ')
      + constitution);
  }
}

console.log('== the tree knows the roads, and every card is windowed ==');
{
  const chapter = CHAPTER_PATHS.find((c) => c.id === '132ce');
  const forks = chapter.forks.map((f) => f.id);
  ok(forks.indexOf('the_accession') >= 0 && forks.indexOf('the_grass_on_akivas_cheeks') >= 0,
    'both forks are on the tree (' + forks.join(', ') + ')');
  const acc = chapter.forks.find((f) => f.id === 'the_accession');
  ok(acc.roads.length === 4, '  the accession branches four ways');
  ok(acc.roads.every((r) => r.terminal === 'ev_bk_bar_kokhba_or_bar_koziba'),
    '  and every one of them is answerable for on the day it goes wrong');

  for (const c of EVENTS_132_KOSIBA) {
    const scheduled = typeof c.trigger === 'function' || !!c.date;
    if (!scheduled) {
      ok(true, c.id + ' is fired by another card, so it needs no window');
      continue;
    }
    ok(Number.isFinite(c.maxYear) || !!c.date,
      c.id + ' declares its years, so §121\'s horizon cannot retire it');
  }
  ok(EVENTS_132_KOSIBA.every((c) => c.options.every((o) => typeof o.tooltip === 'string' && o.tooltip.length > 40)),
    'every answer prices itself before it is taken');
}

console.log(failures ? `smoke87: ${failures} FAIL` : 'smoke87: ALL PASS');
process.exit(failures ? 1 : 0);
