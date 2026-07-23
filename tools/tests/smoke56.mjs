// Headless regression — paid, timed claim fabrication:
// influence is spent at the start, the CB stays unavailable for four monthly
// ticks, progress survives save/revive, and an operation whose target becomes
// our land lapses without producing a nonsensical claim.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);

function bind(game, notices) {
  const bus = {
    emit(kind, payload) { if (kind === 'notify') notices.push(payload); },
    on() { return () => {}; },
  };
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus,
    bookmark: BOOKMARK_66, events: [], provinceMap,
  });
  return { ctx, actions: gameActions(ctx) };
}

function boot(seed, notices) {
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: [],
    playerTag: 'JUD', rngSeed: seed, provinceMap,
  });
  for (const tag of Object.keys(game.tags)) game.tags[tag].ai = false;
  return { game, ...bind(game, notices) };
}

function tickMonths(ctx, months) {
  for (let i = 0; i < months * DEFINES.DAYS_PER_MONTH; i++) tickDay(ctx);
}

const notices = [];
console.log('== fabrication spends now and becomes a CB later ==');
{
  let { game, ctx, actions } = boot(790, notices);
  const target = ctx.prov('Dura-Europos');
  const other = game.provinces.find((p) => p && !p.impassable
    && p.owner === target.owner && p.id !== target.id);
  const beforeOpinion = mil.opinionOf(ctx, target.owner, 'JUD');
  game.tags.JUD.points.infl = 100;
  actions.fabricateClaim(target.id);
  let info = actions.getClaimInfo(target.id);
  ok(game.tags.JUD.points.infl === 70 && info.fabricating && info.monthsLeft === 4,
    '30 influence is paid up front and four months are recorded');
  ok(!mil.hasClaim(ctx, 'JUD', target.id)
      && (!actions.getDiplomacy(target.owner).cb
        || actions.getDiplomacy(target.owner).cb.type !== 'claim'),
  'the unfinished operation grants no claim or claim CB');
  ok(mil.opinionOf(ctx, target.owner, 'JUD') === beforeOpinion - 20,
    'the target court resents the operation when it begins');
  const afterStart = game.tags.JUD.points.infl;
  actions.fabricateClaim(target.id);
  ok(game.tags.JUD.points.infl === afterStart
      && game.tags.JUD.claimFabrications.length === 1,
  'clicking the pending operation again neither spends nor duplicates it');
  const otherInfo = actions.getClaimInfo(other.id);
  ok(otherInfo && !otherInfo.canFabricate && /forgers need time/.test(otherInfo.whyNot),
    'the existing per-country cooldown blocks a second simultaneous case');

  tickMonths(ctx, 3);
  info = actions.getClaimInfo(target.id);
  ok(info.fabricating && info.monthsLeft === 1 && !mil.hasClaim(ctx, 'JUD', target.id),
    'three monthly ticks leave one month and still no CB');

  const saved = reviveGame(JSON.parse(JSON.stringify(game)));
  ({ ctx, actions } = bind(saved, notices));
  ok(actions.getClaimInfo(target.id).monthsLeft === 1,
    'save/revive preserves the pending operation and its remaining month');
  tickMonths(ctx, 1);
  ok(mil.hasClaim(ctx, 'JUD', target.id)
      && actions.getDiplomacy(target.owner).cb.type === 'claim',
  'the fourth monthly tick creates the usable claim CB');
  ok(notices.some((n) => n && n.title === 'The claim is ready'),
    'completion tells the player the claim is ready');
}

console.log('== a target that becomes ours makes the operation lapse ==');
{
  const lapseNotices = [];
  const { game, ctx, actions } = boot(791, lapseNotices);
  const target = ctx.prov('Petra');
  game.tags.JUD.points.infl = 100;
  actions.fabricateClaim(target.id);
  target.owner = 'JUD';
  target.controller = 'JUD';
  for (let i = 0; i < mil.CLAIM_FABRICATION.months; i++) mil.monthlyClaimFabrications(ctx);
  ok(!mil.hasClaim(ctx, 'JUD', target.id)
      && game.tags.JUD.claimFabrications.length === 0,
  'the completed operation does not create a claim on our own province');
  ok(lapseNotices.some((n) => n && n.title === 'The claim lapses'),
    'the player is told why the spent operation ended');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
