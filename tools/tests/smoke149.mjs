// Headless regression — SPEC §224: one war, and the six things that were
// keeping it from happening.
//
// The section's claims, and this suite in order: `joinWar` puts a court into a
// war that already exists, with the bookkeeping and without the treaties, and
// refuses for the reasons a declaration refuses; the 1948 chapter's coalition
// wars are ONE war each — June 1967, October 1973, Lebanon 1982 and the Gulf
// coalition — and their cease-fires bind every court in them rather than the
// two the card can name; a truced coalition still goes to war and a coalition
// that cannot be fought at all leaves the aftermath flags unset; `after` defers
// a card whose predecessor is still on the table instead of retiring it, which
// is what keeps the Suez arc alive through its own October; `ev_i_suez`
// declares nothing; the Arab League's joint defence lapses at the separate
// peace, a guarantor of both sides stays home, and a guarantee does not survive
// the guns; and the Gulf strand's debt outlives the AI's bookkeeping while a
// rebel camp on a capital stops reading as a conquest.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { declareWar, joinWar, warBetween, recognizeCore } = await import(R + '/js/sim/military.js');
const { checkDateEvents } = await import(R + '/js/sim/events.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const makeGeom = () => ({
  neighbors: Array.from({ length: N + 1 }, (_, i) => {
    const s = new Set();
    if (i > 1) s.add(i - 1);
    if (i >= 1 && i < N) s.add(i + 1);
    return s;
  }),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
});

const ERA = ERAS.find((e) => e.bookmark.id === '1948ce');
const EVENTS = ERA.events;
const card = (id) => EVENTS.find((e) => e && e.id === id);

function boot(seed = 224) {
  const geom = makeGeom();
  const bookmark = ERA.bookmark;
  const playerTag = (bookmark.playableTags[0] || {}).tag || bookmark.playerTag;
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: EVENTS, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: EVENTS });
  return { game, ctx, bookmark, playerTag, actions: gameActions(ctx) };
}
// A world with no war in it and no ink on any treaty: every suite below starts
// from the chapter's own cast, with the opening war of 1948 cleared away.
function quiet(seed = 224) {
  const w = boot(seed);
  w.game.wars = [];
  w.game.truces = {};
  for (const t of Object.keys(w.game.tags)) {
    const tt = w.game.tags[t];
    if (tt) { tt.atWarWith = []; tt.guarantees = []; tt.allies = []; }
  }
  return w;
}
const warsNamed = (game, name) => game.wars.filter((x) => x && x.name === name);
// Play a card's chosen answer directly, the way the AI resolves one.
function play(ctx, id, idx = 0) {
  const ev = card(id);
  ev.options[idx].effects(ctx);
  return ev;
}

console.log('== joinWar: a court brought into a war already running ==');
{
  const { game, ctx } = quiet();
  const war = declareWar(ctx, 'EGY', 'ISR', 'The Test War');
  ok(!!war && war.attackers.length === 1 && war.defenders.length === 1,
    'a war opens with the two principals and nobody else');
  const before = game.wars.length;
  const same = joinWar(ctx, war, 'SYR', 'att');
  ok(same === war && game.wars.length === before,
    'a third court joins THAT war — no second war is opened');
  ok(war.attackers.indexOf('SYR') >= 0,
    '  and stands on the side it was enrolled onto');
  ok(game.tags.SYR.atWarWith.indexOf('ISR') >= 0 && game.tags.ISR.atWarWith.indexOf('SYR') >= 0,
    '  with atWarWith mirrored on both courts');
  ok(warBetween(ctx, 'SYR', 'ISR') === war,
    '  so warBetween finds the one war for the new pair too');
  ok(joinWar(ctx, war, 'SYR', 'att') === war && war.attackers.filter((t) => t === 'SYR').length === 1,
    'joining twice is a no-op, not a duplicate');
  // Where it refuses: the truce, the recognized peace, the collar, and a war
  // these two are already fighting somewhere else.
  ok(joinWar(ctx, war, 'ISR', 'att') === null || war.attackers.indexOf('ISR') < 0,
    'a court cannot be enrolled against itself');
  {
    const w2 = quiet();
    const t = declareWar(w2.ctx, 'EGY', 'ISR', 'The Test War');
    w2.game.truces['ISR|JOR'] = { y: w2.game.date.y + 5, m: w2.game.date.m };
    ok(joinWar(w2.ctx, t, 'JOR', 'att') === null && t.attackers.indexOf('JOR') < 0,
      'a truce still in ink refuses the enrolment');
  }
  {
    const w3 = quiet();
    const t = declareWar(w3.ctx, 'EGY', 'ISR', 'The Test War');
    recognizeCore(w3.ctx, 'JOR', 'ISR');
    ok(joinWar(w3.ctx, t, 'JOR', 'att') === null && t.attackers.indexOf('JOR') < 0,
      'a recognized peace refuses it too (SPEC §96)');
  }
  {
    const w4 = quiet();
    const t = declareWar(w4.ctx, 'EGY', 'ISR', 'The Test War');
    declareWar(w4.ctx, 'JOR', 'ISR', 'Somebody Else\'s War');
    ok(joinWar(w4.ctx, t, 'JOR', 'att') === null,
      'and so does a war the two courts are already fighting elsewhere');
    ok(warsNamed(w4.game, 'The Test War').length === 1
      && warsNamed(w4.game, 'Somebody Else\'s War').length === 1,
      '  — two courts are never in two wars with each other at once');
  }
}

console.log('== a guarantee is not a suicide pact ==');
{
  // The Joint Defence Council as the chapter writes it: six capitals, each
  // guaranteeing the other five.
  const { game, ctx } = quiet();
  play(ctx, 'ev_i_joint_defence', 0);
  const pact = game.flags.jointDefencePact;
  ok(Array.isArray(pact) && pact.length >= 5 && game.tags.SAU.guarantees.indexOf('LEB') >= 0,
    'the pact is written down, and Riyadh guarantees Beirut');
  // Jordan on Egypt: both are guaranteed by the other four, so the other four
  // cannot honour either word and stay home.
  const w = declareWar(ctx, 'JOR', 'EGY', 'The Quarrel Inside the Pact');
  const inIt = w.attackers.concat(w.defenders).sort().join(',');
  ok(inIt === 'EGY,JOR', 'a war between two signatories summons neither of the other four: ' + inIt);
  ok(game.tags.JOR.guarantees.indexOf('EGY') < 0 && game.tags.EGY.guarantees.indexOf('JOR') < 0,
    'and the pledge between the two of them does not survive the guns');
  ok(game.tags.SAU.guarantees.indexOf('EGY') >= 0,
    '  while everybody else\'s pledges stand');
}
{
  // The word still means something where only one side holds it.
  const { game, ctx } = quiet();
  play(ctx, 'ev_i_joint_defence', 0);
  const w = declareWar(ctx, 'ISR', 'LEB', 'The Outsider\'s War');
  ok(w.defenders.indexOf('SAU') >= 0 && w.defenders.indexOf('IRQ') >= 0,
    'a guarantor of one side only marches, as it always did');
  ok(!game.flags.jointDefenceLapsed, '  and the pact is still standing at this point');
}

console.log('== the pact lapses at the separate peace ==');
for (const answer of [0, 1]) {
  const { game, ctx } = quiet();
  play(ctx, 'ev_i_joint_defence', 0);
  // The world the treaty card needs: Sadat has come, Camp David is initialed,
  // and Cairo and Jerusalem are not at war.
  game.flags.sadatVisit = true;
  game.flags.campDavid = true;
  play(ctx, 'ev_i_treaty_washington', answer);
  ok(!!game.flags.jointDefenceLapsed,
    'answer ' + answer + ': the Joint Defence Council is struck');
  const left = ['EGY', 'JOR', 'SYR', 'LEB', 'IRQ', 'SAU']
    .filter((t) => game.tags[t] && (game.tags[t].guarantees || []).length);
  ok(!left.length, '  and not one of the six signatures still summons anybody: [' + left.join(' ') + ']');
  // Which is the whole point: Israel's Lebanon war of 1982 is Israel's.
  const w = declareWar(ctx, 'ISR', 'LEB', 'Peace for Galilee');
  const inIt = w.attackers.concat(w.defenders).sort().join(',');
  ok(inIt === 'ISR,LEB', '  so Riyadh and Baghdad are not in it: ' + inIt);
}

console.log('== June 1967 is one war, and it happens ==');
{
  const { game, ctx } = quiet();
  // The coalition of the chapter, hostile enough to fight, and every one of
  // them inside a five-year truce with Israel — which used to mean no war.
  for (const t of ['EGY', 'JOR', 'SYR']) {
    game.tags[t].opinion.ISR = -120;
    game.truces[t < 'ISR' ? t + '|ISR' : 'ISR|' + t] = { y: game.date.y + 5, m: game.date.m };
  }
  game.date = { y: 1967, m: 6, d: 1 };
  play(ctx, 'ev_i_moked', 0);
  ok(!!game.flags.sixDayWar, 'the ink does not cancel the June war');
  ok(game.wars.length === 1, '  and it is ONE war, not three: ' + game.wars.length);
  const w = game.wars[0];
  ok(w.attackers.indexOf('ISR') >= 0 && ['EGY', 'JOR', 'SYR'].every((t) => w.defenders.indexOf(t) >= 0),
    '  with the whole coalition on the far side of it: [' + w.defenders.join(' ') + ']');
  // …and the cease-fire binds all of them, not the ones the card names.
  game.date = { y: 1967, m: 9, d: 1 };
  play(ctx, 'ev_i_lines_of_june', 0);
  ok(!game.wars.length, 'the lines of June end the war for every court in it');
  ok(['EGY', 'JOR', 'SYR'].every((t) => !game.tags[t].atWarWith.length),
    '  and nobody is left fighting a war their principals signed out of');
}
{
  // The other door: a coalition that genuinely cannot be brought to a war
  // leaves the aftermath unwritten rather than fighting an imaginary one.
  const { game, ctx } = quiet();
  for (const t of ['EGY', 'JOR', 'SYR']) game.tags[t].opinion.ISR = -120;
  for (const t of ['EGY', 'JOR', 'SYR']) recognizeCore(ctx, t, 'ISR');
  game.date = { y: 1967, m: 6, d: 1 };
  play(ctx, 'ev_i_moked', 0);
  ok(!game.wars.length && !game.flags.sixDayWar,
    'a coalition at recognized peace fights no June war — and the flag stays unset');
}

console.log('== October 1973 and Lebanon 1982 are one war each ==');
{
  const { game, ctx } = quiet();
  for (const t of ['EGY', 'SYR', 'JOR']) game.tags[t].opinion.ISR = -120;
  game.date = { y: 1973, m: 10, d: 1 };
  play(ctx, 'ev_i_yom_kippur', 1); // the door that does not preempt
  ok(!!game.flags.yomKippurWar && game.wars.length === 1,
    'the October war is one war: ' + game.wars.length);
  ok(warsNamed(game, 'The Yom Kippur War').length === 1,
    '  and one war NAMED that, not three of them side by side');
  const w = game.wars[0];
  ok(w.attackers.indexOf('EGY') >= 0 && w.defenders.indexOf('ISR') >= 0,
    '  opened by the court that crossed the Canal');
  game.date = { y: 1974, m: 2, d: 1 };
  play(ctx, 'ev_i_agranat', 0);
  ok(!game.wars.length, 'and the disengagement accords end it for everyone in it');
}
{
  const { game, ctx } = quiet();
  game.flags.lebanonCivilWar = true;
  game.date = { y: 1982, m: 6, d: 1 };
  // Damascus holding the Beqaa is the condition the card reads.
  const beqaa = ctx.prov('Chalcis');
  if (beqaa) { beqaa.owner = 'SYR'; beqaa.controller = 'SYR'; }
  play(ctx, 'ev_i_peace_for_galilee', 0);
  ok(game.wars.length === 1, 'the Lebanon war is one war, Beqaa and all: ' + game.wars.length);
  const w = game.wars[0];
  ok(w.name === 'Peace for Galilee' && w.defenders.indexOf('LEB') >= 0 && w.defenders.indexOf('SYR') >= 0,
    '  with Syria a front of it rather than a war of its own: [' + w.defenders.join(' ') + ']');
}

console.log('== `after`: a card still on the table has not happened yet ==');
{
  const kadesh = card('ev_i_kadesh');
  const portSaid = card('ev_i_port_said');
  ok(kadesh.after === 'ev_i_sevres' && portSaid.after === 'ev_i_kadesh',
    'the Suez arc says out loud which card each of its links comes after');
  ok(card('ev_i_sevres').date.y === 1956 && card('ev_i_sevres').date.m === 10
    && kadesh.date.m === 10,
    '  and Sèvres and Kadesh do in fact share October 1956');
  const { game, ctx } = quiet();
  game.date = { y: 1956, m: 10, d: 1 };
  checkDateEvents(ctx);
  const queued = game.pendingEvents.map((pe) => pe.eventId);
  ok(queued.indexOf('ev_i_sevres') >= 0, 'October deals the protocol');
  ok(queued.indexOf('ev_i_kadesh') < 0, '  and does not deal the campaign in the same breath');
  ok(!game.firedEvents.ev_i_kadesh
    && !(game.retiredChapters || []).some((r) => r.id === 'ev_i_kadesh'),
    '  and — this is the bug — does not RETIRE it either');
  // Answer the protocol; the campaign is dealt the following month.
  const sevres = game.pendingEvents.find((pe) => pe.eventId === 'ev_i_sevres');
  gameActions(ctx).chooseEventOption(sevres.instanceId, 0);
  game.pendingEvents.length = 0;
  ok(!!game.flags.sevresProtocol, 'the protocol is signed');
  game.date = { y: 1956, m: 11, d: 1 };
  checkDateEvents(ctx);
  ok(game.pendingEvents.some((pe) => pe.eventId === 'ev_i_kadesh'),
    'and November deals the Sinai campaign, against a world that has been decided');
}
{
  // `after` defers; it never retires, and it never blocks on a card that is
  // not on the table. A world with no Israel retires Kadesh on its own `when`.
  const { game, ctx } = quiet();
  game.tags.ISR.alive = false;
  game.date = { y: 1956, m: 11, d: 1 };
  checkDateEvents(ctx);
  ok(!!game.firedEvents.ev_i_kadesh
    && (game.retiredChapters || []).some((r) => r.id === 'ev_i_kadesh'),
    'a predecessor nobody is waiting for holds nothing up: the card retires on its own gate');
}

console.log('== the nationalization is not the crisis ==');
{
  const suez = card('ev_i_suez');
  ok(suez.date.y === 1956 && suez.date.m === 7,
    'Suez is dated to the nationalization itself, 26 July 1956');
  const src = suez.options[0].effects.toString();
  ok(!/declareWar/.test(src),
    'and the card declares no war at all — neither Israel\'s nor Britain\'s');
  const { game, ctx } = quiet();
  play(ctx, 'ev_i_suez', 0);
  ok(!game.wars.length, 'so nationalizing the canal opens no war on the map');
  ok(!!game.flags.canalNationalized && game.tags.EGY.ruler.name.indexOf('Nasser') >= 0,
    '  it does what it says: Nasser, the shares, the tolls');
  // The intervention it used to declare is the card that also ends it.
  const portSaid = card('ev_i_port_said');
  ok(!/declareWar/.test(portSaid.options[0].effects.toString()),
    'and Port Said is a landing with a bill, not a war Britain cannot get out of');
}

console.log('== the Gulf strand survives Baghdad\'s bookkeeping ==');
{
  const { game, ctx } = quiet();
  game.flags.saddamIraq = true;
  game.date = { y: 1980, m: 9, d: 1 };
  play(ctx, 'ev_i_iran_iraq_war', 0);
  ok(game.tags.IRQ.loans >= 5 && !!game.flags.gulfDebt,
    'the eight years are borrowed for, and the debt is remembered as well as carried');
  // The two systems that used to erase it, both applied at once.
  game.tags.IRQ.loans = 0;          // the AI repaying while flush (ai.js)
  game.tags.IRQ.treasury = 900;     // …and rich with it
  const wells = card('ev_g_the_wells');
  game.flags.iranIraqEnded = true;
  game.date = { y: 1990, m: 8, d: 1 };
  ok(wells.when(ctx), 'August 1990 still comes for an Iraq whose loan column has been paid down');
  play(ctx, 'ev_g_the_wells', 2); // accept the schedule: the one road out
  ok(!!game.flags.gulfDebtSettled && !wells.when(ctx),
    'and settling the debt by decision is what closes it, not an accounting routine');
}
{
  // A rebel camp on a capital is not the long war decided.
  const { game, ctx } = quiet();
  game.flags.iranIraqWar = true;
  game.date = { y: 1988, m: 8, d: 1 };
  const ctes = ctx.prov('Seleucia-Ctesiphon');
  const ecb = ctx.prov('Ecbatana');
  ok(!!ctes && !!ecb, 'both capitals are on this map');
  ctes.owner = 'IRQ'; ctes.controller = 'REB';
  ecb.owner = 'IRN'; ecb.controller = 'IRN';
  ok(!card('ev_g_the_line_broken').when(ctx),
    'a rising sitting on Baghdad does not read as Iran taking Baghdad');
  ok(card('ev_g_the_river_holds').when(ctx),
    '  so August 1988 gets the cease-fire card it is supposed to get');
  ctes.controller = 'IRN';
  ok(card('ev_g_the_line_broken').when(ctx),
    'and the enemy on the capital still reads as the long war decided');
}

console.log('== the coalition of 1990 is one war ==');
{
  const { game, ctx } = quiet();
  game.flags.kuwaitTaken = true;
  game.date = { y: 1990, m: 11, d: 1 };
  declareWar(ctx, 'IRQ', 'SAU', 'The Wells');
  play(ctx, 'ev_g_thirty_five_states', 1);
  ok(game.wars.length === 1, 'thirty-five states, one war: ' + game.wars.length);
  const w = game.wars[0];
  ok(w.defenders.indexOf('SAU') >= 0 && w.defenders.indexOf('UK') >= 0 && w.defenders.indexOf('EGY') >= 0,
    '  Riyadh, London and Cairo on the same side of the same war: [' + w.defenders.join(' ') + ']');
  const syr = ['SAR', 'SYR', 'UAR'].find((t) => game.tags[t] && game.tags[t].alive);
  ok(!syr || w.defenders.indexOf(syr) >= 0,
    '  and Damascus under whatever name the century left it (' + syr + ')');
}

console.log(failures ? `smoke149: ${failures} FAIL` : 'smoke149: ALL PASS');
process.exit(failures ? 1 : 0);
