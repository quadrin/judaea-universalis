// Headless regression — war goals and ticking score:
//   * diplomatic wars persist a concrete objective;
//   * holding it after six months moves up to 25 war score;
//   * treaty prices favor the declared purpose and tax unrelated annexation;
//   * independence and succession restore the correct political relationship;
//   * scripted no-CB wars retain their old score model.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const ai = await import(R + '/js/sim/ai.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
function boot(seed) {
  const geom = {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
  };
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: [],
    playerTag: 'JUD', rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus,
    bookmark: BOOKMARK_66, events: [], provinceMap,
  });
  game.wars = [];
  game.truces = {};
  for (const tag of Object.keys(game.tags)) game.tags[tag].atWarWith = [];
  return { game, ctx, actions: gameActions(ctx) };
}

function addMonths(date, months) {
  let total = date.m - 1 + months;
  let y = date.y + Math.floor(total / 12);
  if (date.y < 0 && y >= 0) y++;
  return { y, m: (total % 12) + 1, d: date.d };
}

console.log('== a pressed claim becomes a visible, ticking objective ==');
{
  const { game, ctx, actions } = boot(780);
  const nab = game.provinces.filter((p) => p && !p.impassable && p.owner === 'NAB');
  const target = nab.slice().sort((a, b) => mil.devTotal(b) - mil.devTotal(a))[0];
  game.tags.JUD.claims = [target.id];
  const cb = mil.casusBelli(ctx, 'JUD', 'NAB');
  const war = mil.declareWar(ctx, 'JUD', 'NAB', 'The Claim on ' + target.name, cb);
  const goal = mil.warGoalInfo(ctx, war);
  ok(cb && cb.provId === target.id && goal && goal.targetProvIds[0] === target.id,
    'the CB remembers which province the claim names');
  ok(goal && goal.scoreCap === 25 && goal.graceMonths === 6,
    'the objective exposes its six-month grace and 25-point cap');

  game.date = addMonths(war.started, 7);
  mil.updateWarscores(ctx);
  ok(war._goalScore === -1 && war.warscore.NAB >= 1,
    'the defender earns the first tick by still holding the objective');

  target.controller = 'JUD';
  game.date = addMonths(war.started, 12);
  mil.updateWarscores(ctx);
  ok(war._goalScore === 4,
    'occupation reverses ticking control and moves the accumulated score toward the attacker');
  const panel = actions.getWarInfo(war.id);
  ok(panel.goal && panel.goal.holder === 'ours' && panel.breakdown.goal === 4,
    'the war overview contract exposes holder, objective, and ticking contribution');

  for (const p of nab) p.controller = 'JUD';
  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  const named = info.provinces.find((r) => r.id === target.id);
  const unrelated = info.provinces.find((r) => r.id !== target.id);
  ok(named && named.goalAligned && named.goalMult < 1,
    'the named province receives goal-aligned treaty terms');
  ok(unrelated && !unrelated.goalAligned && unrelated.goalMult > 1,
    'annexation outside the stated claim costs extra');
}

console.log('== political goals favor the matching settlement ==');
{
  const { game, ctx } = boot(781);
  const war = mil.declareWar(ctx, 'JUD', 'NAB', 'Judaean Independence', 'independence');
  war.warscore.JUD = 100;
  war.warscore.NAB = -100;
  for (const p of game.provinces) {
    if (p && !p.impassable && p.owner === 'NAB') p.controller = 'JUD';
  }
  const rebelDeal = ai.buildAiPeaceDeal(ctx, war, 'JUD');
  ok(!rebelDeal.subjugate,
    'an independence victor does not put the former overlord under the yoke');

  war.warscore.JUD = -100;
  war.warscore.NAB = 100;
  const restoration = mil.peaceDealInfo(ctx, war, 'NAB');
  const base = Math.min(mil.PEACE.subjugateMax, Math.max(mil.PEACE.subjugateBase,
    Math.round(mil.PEACE.subjugateBase
      + game.provinces.filter((p) => p && !p.impassable && p.owner === 'JUD')
        .reduce((s, p) => s + mil.devTotal(p), 0) * mil.PEACE.subjugatePerDev)));
  ok(restoration.subjugateGoalAligned && restoration.subjugateCost < base,
    'the former overlord receives favored terms to restore the yoke');
  const lordDeal = ai.buildAiPeaceDeal(ctx, war, 'NAB');
  ok(lordDeal.subjugate,
    'the defending AI uses those terms when it wins the independence war');
}

console.log('== succession and scripted wars keep distinct contracts ==');
{
  const { game, ctx } = boot(782);
  const succession = mil.declareWar(ctx, 'JUD', 'NAB', 'The Nabataean Succession', 'succession');
  const terms = mil.peaceDealInfo(ctx, succession, 'JUD');
  ok(terms.goal && terms.goal.type === 'succession' && terms.subjugateGoalAligned,
    'a succession war targets the rival crown and discounts political submission');
  game.wars = [];
  for (const tag of Object.keys(game.tags)) game.tags[tag].atWarWith = [];
  const scripted = mil.declareWar(ctx, 'JUD', 'NAB', 'A Scripted Historical War');
  ok(scripted.cb === null && mil.warGoalInfo(ctx, scripted) === null,
    'a scripted war without an explicit CB receives no inferred ticking objective');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
