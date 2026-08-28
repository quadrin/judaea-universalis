// Headless smoke test §260/§261: the six things the diplomacy ledger was
// getting wrong, and the two conveniences that came with them.
//
// §260 — an alliance was an automatic belligerent (every ally of either
// principal enrolled the moment the herald left, whatever it thought of the
// war), a standing bond's regard cooled a point a month toward indifference
// however hard it had been earned, legitimacy only ever went up, breaking a
// state off an enemy at the table cost half what annexing the same ground
// did, and a subsidy was a free +20 that could be cancelled and re-signed all
// afternoon.
//
// §261 — writing to the dispersion was one province at a time, and a UN truce
// was a suggestion to the AI while the columns kept marching.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const { monthlyOpinionDrift } = await import(R + '/js/sim/unrest.js');
const { monthlyIntegration } = await import(R + '/js/sim/realm.js');
const { tickDay } = await import(R + '/js/sim/tick.js');

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
  areas: new Int32Array(N + 1),
  bbox: [],
};
// The harness ships an empty adjacency (the real one is rastered at load), so
// the cease-fire section below lays one road of its own between two cells and
// marches an army down it.
const link = (a, b) => { geom.neighbors[a].add(b); geom.neighbors[b].add(a); };
function boot(bookmark, events, playerTag, seed) {
  const ev = events.concat(GENERIC_EVENTS);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: ev, playerTag, rngSeed: seed || 11 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: ev });
  return { game, ctx, actions: gameActions(ctx) };
}
// A court fit to march: a full purse, men in hand, and no war of its own.
const readyCourt = (game, tag) => {
  const t = game.tags[tag];
  t.alive = true;
  t.treasury = 200;
  t.manpower = 20000;
  t.maxManpower = 20000;
  t.warExhaustion = 0;
  t.atWarWith = [];
  return t;
};
const ally = (game, a, b, opinion) => {
  const ta = game.tags[a]; const tb = game.tags[b];
  ta.allies = [...new Set([...(ta.allies || []), b])];
  tb.allies = [...new Set([...(tb.allies || []), a])];
  if (!ta.opinion) ta.opinion = {};
  if (!tb.opinion) tb.opinion = {};
  ta.opinion[b] = opinion;
  tb.opinion[a] = opinion;
};

console.log('== §260 an ally is asked, not enrolled ==');
{
  const { game, ctx } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  for (const k of ['JUD', 'ROM', 'PAR', 'ADI', 'AGR']) readyCourt(game, k);
  game.wars = [];
  for (const k of Object.keys(game.tags)) game.tags[k].atWarWith = [];
  // Two allies of the attacker: one devoted, one merely warm.
  ally(game, 'JUD', 'PAR', 90);
  ally(game, 'JUD', 'ADI', 30);
  const war = mil.declareWar(ctx, 'JUD', 'ROM', 'The Test War');
  ok(!!war, 'the war opens');
  ok(war.attackers.indexOf('PAR') >= 0, 'the ally that thinks well of us marches: ' + war.attackers.join(','));
  ok(war.attackers.indexOf('ADI') < 0, 'the ally at +30 stays out of a war we started');
  ok(mil.allyAnswersCall(ctx, 'ADI', 'JUD', false).ok === false
    && mil.allyAnswersCall(ctx, 'ADI', 'JUD', true).ok === true,
    'and the same court WOULD answer an attack on us — the defensive bar is lower');
}
{
  // Militarily poised, read out: no war of its own, not sick of war, not
  // bankrupt, and with a host to send.
  const { game, ctx } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  for (const k of ['JUD', 'ROM', 'PAR']) readyCourt(game, k);
  game.wars = [];
  for (const k of Object.keys(game.tags)) game.tags[k].atWarWith = [];
  ally(game, 'JUD', 'PAR', 120);
  const t = game.tags.PAR;
  t.atWarWith = ['ADI'];
  game.tags.ADI.alive = true;
  ok(mil.allyAnswersCall(ctx, 'PAR', 'JUD', false).ok === false, 'a court with a war of its own has no army to lend');
  t.atWarWith = [];
  t.warExhaustion = 14;
  ok(mil.allyAnswersCall(ctx, 'PAR', 'JUD', false).ok === false, 'nor a court sick of war');
  ok(mil.allyAnswersCall(ctx, 'PAR', 'JUD', true).ok === true, '...though it will still defend us at that exhaustion');
  t.warExhaustion = 0;
  t.treasury = -400;
  ok(mil.allyAnswersCall(ctx, 'PAR', 'JUD', false).ok === false, 'nor a court that cannot pay for a campaign');
  t.treasury = 100;
  t.manpower = 0;
  t.maxManpower = 40000;
  for (const id of Object.keys(game.armies)) if (game.armies[id].tag === 'PAR') delete game.armies[id];
  ok(mil.allyAnswersCall(ctx, 'PAR', 'JUD', false).ok === false, 'nor a court with no host to send');
  t.manpower = 30000;
  ok(mil.allyAnswersCall(ctx, 'PAR', 'JUD', false).ok === true, 'and one with men, money and quiet answers');
}

console.log('== §260 the panel says whether the pact would answer ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  for (const k of ['JUD', 'PAR']) readyCourt(game, k);
  ally(game, 'JUD', 'PAR', 90);
  const warm = actions.getDiplomacy('PAR');
  ok(warm.allyCall && warm.allyCall.marches && warm.allyCall.defends,
    'a devoted, unengaged ally reads as one that would march');
  game.tags.PAR.opinion.JUD = 30;
  const cool = actions.getDiplomacy('PAR');
  ok(cool.allyCall && !cool.allyCall.marches && cool.allyCall.defends && /too little/.test(cool.allyCall.why),
    'a cool one reads as defensive only, with the reason: ' + (cool.allyCall && cool.allyCall.why));
  game.tags.PAR.opinion.JUD = 10;
  const cold = actions.getDiplomacy('PAR');
  ok(cold.allyCall && !cold.allyCall.marches && !cold.allyCall.defends,
    'and a cold one reads as an alliance that answers nothing');
}

console.log('== §260 a standing bond does not cool ==');
{
  const { game, ctx } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  ally(game, 'JUD', 'PAR', 140);
  // A client of ours, crowned at our own hand and grateful for it.
  game.tags.ADI.overlord = 'JUD';
  game.tags.ADI.opinion = { ...(game.tags.ADI.opinion || {}), JUD: 90 };
  // …and a stranger, who still cools toward indifference.
  game.tags.ROM.opinion = { ...(game.tags.ROM.opinion || {}), JUD: 40 };
  for (let i = 0; i < 24; i++) monthlyOpinionDrift(ctx);
  ok(game.tags.PAR.opinion.JUD === 140, 'two years on, the ally still thinks what it thought: ' + game.tags.PAR.opinion.JUD);
  ok(game.tags.ADI.opinion.JUD === 90, 'and so does the client: ' + game.tags.ADI.opinion.JUD);
  ok(game.tags.ROM.opinion.JUD === 16, 'a court bound to us by nothing still cools to neutral: ' + game.tags.ROM.opinion.JUD);
  // Below the floor a bond still warms — the drift was never only a decay.
  game.tags.ADI.opinion.JUD = 10;
  for (let i = 0; i < 12; i++) monthlyOpinionDrift(ctx);
  ok(game.tags.ADI.opinion.JUD === 22, 'a soured client warms back toward the bond: ' + game.tags.ADI.opinion.JUD);
}

console.log('== §260 legitimacy is maintained, not banked ==');
{
  const { game, ctx } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  const t = game.tags.JUD;
  t.legitimacy = 100;
  const drips = [];
  for (let i = 0; i < 12; i++) { monthlyIntegration(ctx); drips.push(Math.round(t.legitimacy)); }
  ok(t.legitimacy < 100, 'a crown at 100 with no institutions behind it slides: ' + Math.round(t.legitimacy));
  ok(t.legitimacy > 80, '...slowly, over years and not months: ' + Math.round(t.legitimacy));
  // …and back up from a disaster, toward where the realm's own settle point is.
  t.legitimacy = 10;
  for (let i = 0; i < 24; i++) monthlyIntegration(ctx);
  ok(t.legitimacy > 20 && t.legitimacy < 60,
    'and a shaken crown recovers toward the settle point rather than sticking: ' + Math.round(t.legitimacy));
  // The equilibrium is the drip's, not a ceiling: run it long and it settles.
  const before = Math.round(t.legitimacy);
  for (let i = 0; i < 600; i++) monthlyIntegration(ctx);
  const settled = Math.round(t.legitimacy);
  for (let i = 0; i < 60; i++) monthlyIntegration(ctx);
  ok(Math.abs(Math.round(t.legitimacy) - settled) <= 1,
    'it comes to REST somewhere (from ' + before + ' to ' + settled + ', and stays)');
}

console.log('== §260 breaking a state off an enemy costs more than taking the land ==');
{
  ok(mil.PEACE.releaseCostPerDev > mil.PEACE.provCostPerDev,
    'a release now prices above an annexation of the same ground: '
    + mil.PEACE.releaseCostPerDev + ' vs ' + mil.PEACE.provCostPerDev);
  ok(mil.PEACE.releaseCostMin >= 20, 'and the floor per state is ' + mil.PEACE.releaseCostMin);
}

console.log('== §260 the subsidy treadmill ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  const me = game.tags.JUD;
  me.treasury = 5000;
  me.points.infl = 500;
  game.tags.PAR.atWarWith = [];
  me.atWarWith = [];
  const start = mil.opinionOf(ctx, 'PAR', 'JUD');
  const infl0 = me.points.infl;
  actions.sendSubsidy('PAR');
  const afterSend = mil.opinionOf(ctx, 'PAR', 'JUD');
  ok(afterSend === start + mil.DIPLO.subsidyGain, 'the silver buys its regard once: ' + start + ' → ' + afterSend);
  ok(infl0 - me.points.infl === mil.DIPLO.subsidyInfl,
    'and the order costs influence like any standing bond: ' + (infl0 - me.points.infl));
  actions.cancelSubsidy('PAR');
  const afterCancel = mil.opinionOf(ctx, 'PAR', 'JUD');
  ok(afterCancel === start, 'ending it early costs back exactly what it bought: ' + afterCancel);
  const d = actions.getDiplomacy ? actions.getDiplomacy('PAR') : null;
  ok(d && !d.canSubsidize && /too recently/.test(d.whyNotSubsidize || ''),
    'and the same court cannot be bought again this decade: ' + (d && d.whyNotSubsidize));
  // Ten round trips used to walk a court to adoration. Now they buy nothing.
  for (let i = 0; i < 10; i++) { actions.sendSubsidy('PAR'); actions.cancelSubsidy('PAR'); }
  ok(mil.opinionOf(ctx, 'PAR', 'JUD') === start,
    'ten more round trips move nothing: ' + mil.opinionOf(ctx, 'PAR', 'JUD'));
}

console.log('== §260 an envoy to a bond we already keep ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  game.tags.JUD.points.infl = 900;
  game.tags.ADI.overlord = 'JUD';
  game.tags.ADI.opinion = { JUD: 0 };
  game.tags.PAR.opinion = { JUD: 0 };
  const dc = actions.getDiplomacy('ADI');
  const ds = actions.getDiplomacy('PAR');
  ok(dc.improveGain > ds.improveGain,
    'our own client hears us better than a stranger: ' + dc.improveGain + ' vs ' + ds.improveGain);
  actions.improveRelations('ADI');
  ok(mil.opinionOf(ctx, 'ADI', 'JUD') === dc.improveGain,
    'and the mission pays what the card said: ' + mil.opinionOf(ctx, 'ADI', 'JUD'));
  ok(mil.DIPLO.improveGain >= 20 && mil.DIPLO.improveCdMonths <= 3,
    'the ordinary envoy is warmer and quicker too: +' + mil.DIPLO.improveGain
    + ' every ' + mil.DIPLO.improveCdMonths + ' months');
}

console.log('== §261 a cease-fire stops the war ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_1948, EVENTS_1948, 'ISR');
  // Somebody to fight, an army in the field, and a siege under way.
  const isr = game.tags.ISR;
  let army = null;
  for (const id of Object.keys(game.armies)) if (game.armies[id].tag === 'ISR') { army = game.armies[id]; break; }
  ok(!!army, 'Israel has a host in the field');
  const besieged = game.provinces.find((p) => p && !p.impassable && p.owner && p.owner !== 'ISR');
  besieged.siege = { by: 'ISR', progress: 10 };
  const wing = { id: 1, tag: 'ISR', prov: army.prov, planes: 12, raidCd: 0 };
  game.airwings = { 1: wing };

  // One road, to somewhere our own men may lawfully march — so a refusal below
  // is the truce speaking and not the map.
  const target = game.provinces.findIndex((q, i) => i > 0 && q && !q.impassable
    && q.owner === 'ISR' && q.controller === 'ISR' && i !== army.prov);
  link(army.prov, target);
  ok(mil.issueMove(ctx, army, target) === true, 'in an ordinary month the road is open');
  army.path = [];
  army.moveDaysLeft = 0;

  // Two months, so the day loop below stays inside it whatever day of the
  // month the chapter opens on — the one-month case is the expiry test below.
  const cf = ctx.helpers.imposeCeasefire(ctx, 'The First Truce', 2);
  ok(!!cf && !!mil.ceasefireHolds(ctx), 'the truce is in force');
  ok(mil.issueMove(ctx, army, target) === false, 'and now no column takes the same road');
  ok(mil.orderAirRaid(ctx, 'ISR', 1, target).ok === false, 'and no aircraft leaves the ground');
  const progress = besieged.siege.progress;
  const where = army.prov;
  for (let i = 0; i < 25; i++) tickDay(ctx);
  ok(army.prov === where, 'a month of days moves nobody');
  ok(besieged.siege && besieged.siege.progress === progress,
    'and the siege line does not advance: ' + (besieged.siege && besieged.siege.progress)
    + ' (was ' + progress + ')');
  ok(isr.treasury !== undefined, 'the country goes on living around it');
  // …and it lifts on its own, without a monthly pass to sweep it.
  game.date.m += 3;
  while (game.date.m > 12) { game.date.m -= 12; game.date.y += 1; }
  ok(mil.ceasefireHolds(ctx) === null, 'the month runs out and the war is on again');
  ok(mil.issueMove(ctx, army, target) === true, 'the columns move once more');
}

console.log('== §261 the 1948 truce cards raise a real one ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, EVENTS_1948, 'ISR');
  ok(typeof ctx.helpers.imposeCeasefire === 'function', 'content can order a cease-fire through the helpers');
  const card = EVENTS_1948.find((e) => e && e.id === 'ev_i_truce1');
  ok(!!card && Array.isArray(card.options), 'the First Truce card is on the books');
  card.options[0].effects(ctx);
  const cf = mil.ceasefireHolds(ctx);
  ok(!!cf && /First Truce/.test(cf.name || ''), 'accepting it stops the war: ' + (cf && cf.name));
  ok((game.tags.ISR.modifiers || []).some((m) => m && m.id === 'truce_1'),
    'and the standing-down modifier is still set beside it');
}

console.log('== §261 one crown, every congregation ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  const t = game.tags.JUD;
  t.ai = false;
  t.religion = 'judaism';
  t.points.infl = 900;
  // Rome's Jews: the report already knows where they live.
  const rep = actions.getDiaspora() || [];
  const host = (rep.find((r) => r.host && r.host !== 'JUD' && rep.filter((x) => x.host === r.host).length > 1) || {}).host;
  ok(!!host, 'some empire hosts more than one community: ' + host);
  const mine = rep.filter((r) => r.host === host);
  for (const r of mine) {
    if (!r.provId) continue;
    const p = ctx.byId(r.provId);
    const st = p.communities && (p.communities.JUD || p.communities);
    if (st) st.standing = 95;
  }
  const court = actions.getCourtDiaspora(host);
  ok(!!court && court.seats === mine.length,
    'the court answers for all of them: ' + (court && court.seats) + ' of ' + mine.length);
  const letters = court.asks.find((a) => a.id === 'letters');
  ok(!!letters && letters.total > 1, 'and offers the same question to each: ' + letters.ready + '/' + letters.total);
  const before = Math.round(t.points.infl);
  const res = actions.askCourtCommunities(host, 'letters');
  ok(res && res.ok && res.sent.length === letters.ready,
    'one click, every congregation that would answer: ' + (res && res.sent && res.sent.join(', ')));
  ok(Math.round(t.points.infl) > before || res.gain.infl > 0,
    'the letters are worth something: +' + res.gain.infl + ' influence');
  // Each was asked on its own terms: a second click finds them all cooling.
  const again = actions.getCourtDiaspora(host);
  const letters2 = again.asks.find((a) => a.id === 'letters');
  ok(letters2.ready === 0, 'and each carries its own cooldown afterwards: ' + letters2.ready + '/' + letters2.total);
}

console.log('== the save carries all of it ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, EVENTS_1948, 'ISR');
  ctx.helpers.imposeCeasefire(ctx, 'The Second Truce', 1);
  const revived = reviveGame(JSON.parse(JSON.stringify(game)));
  ok(!!revived && revived.ceasefire && revived.ceasefire.name === 'The Second Truce',
    'the truce rides the save');
  revived.ceasefire = { name: 'broken', y: null, m: null };
  const fixed = reviveGame(revived);
  ok(fixed.ceasefire === null, 'and a malformed record loads as no truce at all');
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
