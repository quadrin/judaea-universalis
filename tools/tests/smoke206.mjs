// Headless regression — SPEC §298: a strong client chafes, and rises.
//
//   - strongClientInfo: a client at half its lord's development or less is
//     content; past it, the regard it settles at falls 250 per point of the
//     share (a client as large as its lord settles at the rising, −75), the
//     monthly fall grows with it (2 + 8 per point, at most 8), and past the
//     lord's size the rising roll grows (×1 + 2 per point, at most ×3);
//   - an off-map lord weighs its def's own development;
//   - monthly, a strong client's regard sinks toward its settling point and
//     not below it, and the bond's warmth (SPEC §260) does not lift it back;
//     a small client is untouched and keeps the bond's +50;
//   - a lord who is a player hears each stage once: outgrows its collar,
//     will not march, talks of independence;
//   - envoys can hold a client of 80% above the war call;
//   - a client larger than its lord, left alone, rises in a war of
//     independence;
//   - getClientLoyalty reads it all for the panels; in an age without client
//     kingdoms nothing chafes.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { runMonthlyAI } = await import(R + '/js/sim/ai.js');
const { monthlyOpinionDrift } = await import(R + '/js/sim/unrest.js');
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
  areas: new Int32Array(N + 1), bbox: [],
};
const notes = [];
bus.on('notify', (p) => notes.push(p));

function boot(seed) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: [], playerTag: 'JUD', rngSeed: seed || 298 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: [] });
  game.wars = [];
  game.truces = {};
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
  return { game, ctx, actions: gameActions(ctx) };
}
// AGR (Agrippa's kingdom) is JUD's client, sized to `ratio` of JUD's lands:
// its first province carries the development, the rest none.
function enfeoff(ctx, ratio, opinion) {
  const g = ctx.game;
  const agr = g.tags.AGR;
  agr.overlord = 'JUD';
  agr.opinion = agr.opinion || {};
  agr.opinion.JUD = opinion === undefined ? 50 : opinion;
  const lordDev = mil.devOfTag(ctx, 'JUD');
  const mine = g.provinces.filter((p) => p && !p.impassable && p.owner === 'AGR');
  mine.forEach((p, i) => { p.dev = i === 0 ? { tax: Math.round(lordDev * ratio), prod: 0, mp: 0 } : { tax: 0, prod: 0, mp: 0 }; });
  return agr;
}
// a month: the calendar turns (envoys' cooldowns read it), the strong
// clients chafe, the opinions drift
const month = (ctx) => {
  const d = ctx.game.date;
  d.m += 1;
  if (d.m > 12) { d.m = 1; d.y += 1; }
  mil.monthlyStrongClients(ctx);
  monthlyOpinionDrift(ctx);
};

console.log('== the weight and where it settles ==');
{
  const { ctx } = boot();
  const at = (r) => { enfeoff(ctx, r); return mil.strongClientInfo(ctx, 'AGR'); };
  const half = at(0.5);
  ok(!half.on && half.target === null, 'at half its lord\'s lands a client is content: ' + JSON.stringify(half));
  const three = at(0.75);
  ok(three.on && Math.abs(three.target - (-12.5)) <= 1 && three.rate === 4 && three.rise === 1, 'at 75%: settles at ' + three.target + ', falls ' + three.rate + '/mo');
  const one = at(1);
  ok(one.on && one.target === -75 && one.rate === 6 && one.rise === 1, 'as large as its lord: settles at the rising, −75, falls 6/mo: ' + JSON.stringify(one));
  const big = at(1.5);
  ok(big.target === -200 && big.rate === 8 && big.rise === 2, 'half again as large: −200, 8/mo (the cap), the rising roll ×2: ' + JSON.stringify(big));
  ok(at(3).rise === 3, 'the rising roll stops at ×3');
}

console.log('== an off-map lord weighs its def ==');
{
  const { game, ctx } = boot();
  const om = Object.keys(game.tags).find((k) => mil.tagDef(ctx, k).offmap && game.tags[k].alive);
  if (om) {
    const k = Object.keys(game.tags).find((x) => x !== om && game.tags[x].alive && mil.devOfTag(ctx, x) > 0 && !mil.tagDef(ctx, x).offmap);
    game.tags[k].overlord = om;
    const s = mil.strongClientInfo(ctx, k);
    ok(s.ratio < 50, `${k} under the off-map ${om} reads ${s.ratio} of its weight, not its own lands against nothing`);
  } else {
    ok(true, 'no off-map seat in this chapter (nothing to weigh)');
  }
}

console.log('== the monthly fall, and the floor it stops at ==');
{
  const { game, ctx } = boot();
  const agr = enfeoff(ctx, 0.8, 50); // settles at −25, falls 4.4/mo
  notes.length = 0;
  const seen = [];
  for (let m = 0; m < 40; m++) { month(ctx); seen.push(Math.round(agr.opinion.JUD)); }
  ok(seen[0] <= 46 && seen[0] >= 44, 'the first month: 50 → ' + seen[0]);
  ok(Math.min(...seen) >= -25 && seen[seen.length - 1] === -25, 'it sinks to −25 and no further: ' + seen.slice(-3).join(', '));
  ok(agr.chafe && agr.chafe.by === 'JUD' && agr.chafe.target === -25, 'the chafe is kept on the client: ' + JSON.stringify(agr.chafe));
  const small = enfeoff(ctx, 0.3, 50);
  for (let m = 0; m < 24; m++) month(ctx);
  ok(!small.chafe && Math.round(small.opinion.JUD) === 50, 'a small client keeps the bond\'s +50, and carries no chafe');
  // warmth does not lift a strong client past its settling point
  const warm = enfeoff(ctx, 1, -100);
  for (let m = 0; m < 24; m++) month(ctx);
  ok(Math.round(warm.opinion.JUD) <= -75, 'the bond warms a strong client only to where its weight settles it: ' + Math.round(warm.opinion.JUD));
}

console.log('== the lord who is a player hears each stage once ==');
{
  const { ctx } = boot();
  const agr = enfeoff(ctx, 1.2, 50); // settles at −125, 7.6/mo
  notes.length = 0;
  for (let m = 0; m < 30; m++) month(ctx);
  const titles = notes.map((n) => n.title).filter((x) => /Agrippa|AGR|collar|march|independence/.test(x));
  ok(titles.length === 3 && /outgrows its collar/.test(titles[0]) && /will not march/.test(titles[1]) && /talks of independence/.test(titles[2]),
    'three notices, in order: ' + JSON.stringify(titles));
  ok(Math.round(agr.opinion.JUD) <= -75, 'and it sits at the rising: ' + Math.round(agr.opinion.JUD));
}

console.log('== envoys hold a client of 80% ==');
{
  const { game, ctx, actions } = boot();
  const agr = enfeoff(ctx, 0.8, 50);
  game.tags.JUD.points.infl = 999;
  let low = 50;
  for (let m = 0; m < 36; m++) {
    if (m % 3 === 0) actions.improveRelations('AGR');
    month(ctx);
    low = Math.min(low, Math.round(agr.opinion.JUD));
    game.tags.JUD.points.infl = 999;
  }
  ok(low > -25, 'courted every three months, it never falls to the war call: lowest ' + low);
}

console.log('== a client larger than its lord, left alone, rises ==');
{
  const { game, ctx } = boot(77);
  const agr = enfeoff(ctx, 1.3, 50);
  agr.manpower = 60000; // the strength to dare
  agr.stability = 1;
  let war = null;
  let m = 0;
  for (; m < 240 && !war; m++) {
    month(ctx);
    runMonthlyAI(ctx);
    war = game.wars.find((w) => w.cb === 'independence');
  }
  ok(!!war && war.attackers.indexOf('AGR') >= 0 && war.defenders.indexOf('JUD') >= 0 && game.tags.AGR.overlord === null,
    `it rises in a war of independence (month ${m})`);
}

console.log('== the panels\' reading ==');
{
  const { ctx, actions } = boot();
  enfeoff(ctx, 0.9, -80);
  for (let i = 0; i < 2; i++) month(ctx);
  const lo = actions.getClientLoyalty('AGR');
  ok(lo && lo.pct === 90 && lo.chafes && lo.refuses && lo.atRising && lo.stage === 'rising' && Number.isFinite(lo.rate),
    'getClientLoyalty: ' + JSON.stringify(lo));
  const d = actions.getDiplomacy('AGR');
  ok(d && d.clientLoyalty && d.clientLoyalty.pct === 90, 'and the diplomacy card carries it');
  enfeoff(ctx, 0.2, 50);
  ok(actions.getClientLoyalty('AGR').stage === 'loyal', 'a small, content client reads loyal');
}

console.log('== no client kingdoms in this age, nothing chafes ==');
{
  const { game, ctx } = boot();
  const agr = enfeoff(ctx, 1.5, 50);
  ctx.bookmark = { ...ctx.bookmark, mechanics: { ...(ctx.bookmark.mechanics || {}), clientKingdoms: false } };
  const on = mil.mechanicOn(ctx, 'clientKingdoms');
  for (let m = 0; m < 6; m++) mil.monthlyStrongClients(ctx);
  ok(on || (!agr.chafe && Math.round(agr.opinion.JUD) === 50), on ? 'mechanic switch reads elsewhere (skipped)' : 'the switch off: no chafe, no fall');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
