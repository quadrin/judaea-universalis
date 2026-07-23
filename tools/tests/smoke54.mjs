// Headless regression — SPEC §77: AI courts negotiate instead of merely
// annexing every occupied province. The shared planner uses political terms,
// exhausted coalition members initiate separate offers, and a demand just
// beyond the score can return as an affordable counteroffer.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
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
function boot(bookmark, playerTag, seed) {
  const geom = {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
  };
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark, events: [],
    playerTag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus,
    bookmark, events: [], provinceMap,
  });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== the treaty plan follows the war’s political purpose ==');
{
  const { game, ctx } = boot(BOOKMARK_66, 'JUD', 770);
  const war = game.wars.find((w) => w.attackers.concat(w.defenders).includes('ROM'));
  war.noNegotiation = false;
  war.cb = 'containment';
  war.warscore.JUD = 100;
  war.warscore.ROM = -100;
  const deal = ai.buildAiPeaceDeal(ctx, war, 'JUD');
  const priced = mil.evaluatePeaceDeal(ctx, war, 'JUD', deal);
  ok(priced.acceptable && priced.release.length > 0,
    'a containment victor dismantles the rival with legal release clauses');
  ok(priced.cost <= 100,
    'mixed political terms stay inside the ordinary war-score budget: ' + priced.cost);
}

console.log('== a conqueror can prefer an enemy client to empty annexation ==');
{
  const { game, ctx } = boot(BOOKMARK_66, 'JUD', 771);
  const war = game.wars.find((w) => w.attackers.concat(w.defenders).includes('ROM'));
  war.noNegotiation = false;
  war.cb = null;
  war.warscore.JUD = 100;
  war.warscore.ROM = -100;
  // No Roman province is occupied, so the political house is the prize.
  for (const p of game.provinces) {
    if (p && p.owner === 'ROM') p.controller = 'ROM';
  }
  const deal = ai.buildAiPeaceDeal(ctx, war, 'JUD');
  const priced = mil.evaluatePeaceDeal(ctx, war, 'JUD', deal);
  ok(priced.acceptable && priced.transferVassals.includes('AGR'),
    'the planner takes over Agrippa intact when no sensible cession is available');
}

console.log('== an exhausted coalition member asks to leave ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_1948, 'ISR', 772);
  const war = game.wars.find((w) => w.attackers.concat(w.defenders).includes('ISR'));
  war.noNegotiation = false;
  for (const p of game.provinces) {
    if (p && !p.impassable && p.owner === 'LEB') p.controller = 'ISR';
  }
  game.tags.LEB.warExhaustion = 10;
  ai.runMonthlyAI(ctx);
  const pending = game.pendingEvents.find((pe) => pe
    && String(pe.eventId).startsWith('dyn_separate_peace_'));
  const offer = pending && ctx.dynEvents.get(pending.eventId);
  ok(!!offer && /seeks a separate peace/.test(offer.title),
    'Lebanon initiates a two-answer separate-peace offer');
  if (pending) actions.chooseEventOption(pending.instanceId, 0);
  ok(game.wars.includes(war) && !war.attackers.includes('LEB')
      && war.attackers.includes('EGY') && war.defenders.includes('ISR'),
    'acceptance removes only Lebanon; the coalition war continues');
}

console.log('== AI coalitions also settle their own exhausted fronts ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, 'ISR', 774);
  const war = game.wars.find((w) => w.attackers.concat(w.defenders).includes('ISR'));
  war.noNegotiation = false;
  game.tags.ISR.ai = true; // balance-harness world: no human belligerent
  game.humanTags = [];
  for (const p of game.provinces) {
    if (p && !p.impassable && p.owner === 'LEB') p.controller = 'ISR';
  }
  game.tags.LEB.warExhaustion = 10;
  ai.runMonthlyAI(ctx);
  ok(game.wars.includes(war) && !war.attackers.includes('LEB')
      && war.attackers.includes('EGY'),
    'AI Israel signs Lebanon out while the rest of the AI war continues');
}

console.log('== refused maximal terms can return as a counteroffer ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_66, 'JUD', 773);
  mil.declareWar(ctx, 'JUD', 'NAB', 'The War for the Southern Road', 'claim');
  const war = game.wars.find((w) => w.name === 'The War for the Southern Road');
  for (const p of game.provinces) {
    if (p && !p.impassable && p.owner === 'NAB') p.controller = 'JUD';
  }
  let info = mil.peaceDealInfo(ctx, war, 'JUD');
  const rows = info.provinces.slice().sort((a, b) => a.cost - b.cost);
  const one = mil.evaluatePeaceDeal(ctx, war, 'JUD', { provinces: [rows[0].id] });
  war.warscore.JUD = one.cost;
  war.warscore.NAB = -one.cost;
  info = mil.peaceDealInfo(ctx, war, 'JUD');
  const overreach = { provinces: rows.slice(0, Math.min(3, rows.length)).map((r) => r.id) };
  ok(rows.length >= 2 && !mil.evaluatePeaceDeal(ctx, war, 'JUD', overreach).acceptable,
    'the opening demand exceeds what the current score can compel');
  actions.offerPeaceDeal(war.id, overreach);
  const pending = game.pendingEvents.find((pe) => pe
    && String(pe.eventId).startsWith('dyn_peace_counter_'));
  const counter = pending && ctx.dynEvents.get(pending.eventId);
  ok(!!counter && counter.options.length === 2,
    'the enemy answers with an affordable counteroffer instead of a flat refusal');
  if (pending) actions.chooseEventOption(pending.instanceId, 0);
  const ceded = rows.filter((row) => game.provinces[row.id].owner === 'JUD');
  ok(!game.wars.includes(war) && ceded.length === 1,
    'accepting signs the reduced treaty and cedes only the affordable province');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
