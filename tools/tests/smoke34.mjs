// Headless regression — SPEC §55: the powers beyond the map. Standing,
// courting (with the Cold War seesaw), asks and their gates, monthly drift,
// and old-save backfill.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { BOOKMARK_67 } = await import(R + '/js/data/bookmark_67bce.js');
const { POWERS } = await import(R + '/js/data/powers.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const { standingOf, courtPowerCore, askPowerCore, monthlyPowers, getPowersInfo } = await import(R + '/js/sim/powers.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
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
};

function boot(bookmark, playerTag, seed = 55) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: [] });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== the roster of the age ==');
ok((POWERS['1948ce'] || []).map((p) => p.id).join(',') === 'USA,USSR,CZE,FRA,UN',
  '1948 fields the five: USA, USSR, Czechoslovakia, France, the UN');
ok((POWERS['614ce'] || []).map((p) => p.id).join(',') === 'GOK,AVR',
  '614 fields the two khaganates');
// SPEC §172 moved the Diaspora off this roster and onto the map: the ancient
// Jewish chapters now declare NO off-map power, and the panel hides itself.
// The tag-gating contract this file used the Diaspora to test has not gone
// anywhere — it is tested below against the khaganate, which gates the same way.
ok(!POWERS['167bce'] && !POWERS['66ce'] && !POWERS['132ce'],
  'and the ancient Jewish chapters field none: the dispersion is on the map now (§172)');
{
  const { ctx } = boot(BOOKMARK_67, 'HYR');
  ok(getPowersInfo(ctx, 'HYR').length === 0, 'eras without powers show an empty roster');
}

console.log('== courting and the Cold War seesaw ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const t = game.tags.ISR;
  t.points.infl = 100;
  const usa0 = standingOf(ctx, 'USA', 'ISR');
  const ussr0 = standingOf(ctx, 'USSR', 'ISR');
  const res = courtPowerCore(ctx, 'ISR', 'USA');
  ok(res.ok && standingOf(ctx, 'USA', 'ISR') === usa0 + 10,
    'an envoy raises standing by the courting gain');
  ok(standingOf(ctx, 'USSR', 'ISR') === ussr0 - 5,
    'courting Washington chills Moscow');
  ok(t.points.infl === 75, 'the envoy cost influence points');
  const again = courtPowerCore(ctx, 'ISR', 'USA');
  ok(!again.ok && /envoys were just there/.test(again.why),
    'the courting cooldown holds: ' + again.why);
}

console.log('== asks and their gates ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const t = game.tags.ISR;
  // Too low: USA credits need 50, ISR starts at 30.
  const low = askPowerCore(ctx, 'ISR', 'USA', 'usa_credits');
  ok(!low.ok && /standing is too low/.test(low.why), 'an ask below the bar is refused');
  // Raise standing directly and take the credits.
  game.powers.USA.s.ISR = 60;
  const tre0 = t.treasury;
  const granted = askPowerCore(ctx, 'ISR', 'USA', 'usa_credits');
  ok(granted.ok && t.treasury === tre0 + 120, 'Export-Import credits land in the treasury');
  const repeat = askPowerCore(ctx, 'ISR', 'USA', 'usa_credits');
  ok(!repeat.ok && /granted recently/.test(repeat.why), 'the ask cooldown holds');
  // The Prague deal needs Moscow's nod AND its own standing AND the cash.
  game.powers.CZE.s.ISR = 70;
  game.powers.USSR.s.ISR = 10;
  const noNod = askPowerCore(ctx, 'ISR', 'CZE', 'cze_arms');
  ok(!noNod.ok && /requires standing 45 with The Soviet Union/.test(noNod.why),
    'the Czech deal waits on Moscow: ' + noNod.why);
  game.powers.USSR.s.ISR = 50;
  t.treasury = 200;
  const mp0 = t.manpower;
  const deal = askPowerCore(ctx, 'ISR', 'CZE', 'cze_arms');
  ok(deal.ok && t.treasury === 110 && t.manpower >= mp0,
    'the arms deal costs hard currency and delivers');
  ok((t.modifiers || []).some((m) => m.id === 'power_czech_arms'),
    'the Prague Arsenal modifier is mounted');
  // War-gated asks: the UN appeal needs a war (1948 starts in one).
  game.powers.UN.s.ISR = 60;
  t.points.infl = 50;
  const appeal = askPowerCore(ctx, 'ISR', 'UN', 'un_appeal');
  ok(appeal.ok, 'the wartime UN appeal goes through');
}

console.log('== a power is for the house it was offered to ==');
{
  // The fixture used to be the Diaspora in 66 CE; §172 moved that onto the map,
  // so the same contract is checked against the khaganate in 614, which gates
  // its pact and its ask on `tags: ['BYZ']` exactly as the Diaspora gated on
  // the Jewish crown.
  const { game, ctx } = boot(BOOKMARK_614, 'JUD');
  game.powers = {};
  const denied = askPowerCore(ctx, 'JUD', 'GOK', 'gok_rides');
  ok(!denied.ok && /not offered/.test(denied.why),
    'the Return cannot call the khagan south — that oath was sworn to Byzantium');
  const info = getPowersInfo(ctx, 'JUD').find((p) => p.id === 'GOK');
  ok(info && info.asks.length === 0,
    'it sees the khaganate and holds no claim on its horsemen');
  const byzInfo = getPowersInfo(ctx, 'BYZ').find((p) => p.id === 'GOK');
  ok(byzInfo && byzInfo.asks.length === 1 && byzInfo.standing === 40,
    'while Byzantium, who paid for it, may ask');
}

console.log('== the climate reasserts itself ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  standingOf(ctx, 'USA', 'ISR'); // lazy-seed the book
  game.powers.USA.s.ISR = 40; // ten above the baseline of 30
  for (let i = 0; i < 4; i++) monthlyPowers(ctx);
  ok(standingOf(ctx, 'USA', 'ISR') === 36, 'standing drifts one point a month toward baseline');
  game.powers.USA.s.ISR = 10;
  for (let i = 0; i < 25; i++) monthlyPowers(ctx);
  ok(standingOf(ctx, 'USA', 'ISR') === 30, 'and climbs back up to it, never past');
}

console.log('== old saves learn the powers ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR');
  const legacy = JSON.parse(JSON.stringify(game));
  delete legacy.powers;
  const revived = reviveGame(legacy);
  ok(revived && typeof revived.powers === 'object',
    'reviveGame backfills the powers book');
  const ctx2 = makeCtx({ game: revived, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_1948, events: [] });
  ok(standingOf(ctx2, 'USA', 'ISR') === 30,
    'a pre-powers save seeds baseline standings on first touch');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
