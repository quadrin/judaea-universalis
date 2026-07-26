// Headless regression — the crises batch (SPEC §98–§102):
//   §98  crises that brew: succession and bankruptcy everywhere, the era's own
//        crisis where a bookmark declares one, and the heirless death that
//        opens the question outright.
//   §99  the ladder ends where the age does: no rifle brigades at Masada.
//   §100 the pressure short of war: embargo, blockade, and no punitive league
//        in the modern bookmark.
//   §101 what a treasury can hold, and what an heir to a client inherits.
//   §102 a formed crown keeps its court and gets a programme of its own.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { FORMABLES } = await import(R + '/js/data/formables.js');
const { techCeiling, cappedGen, genName, UNIT_GENS, TECH_MAX } = await import(R + '/js/data/tech.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const {
  tagGen, casusBelli, successionClaim, coalitionAgainst, switchTagCore,
  incorporateCore, declareWar, contentForTag, tagLineage,
} = await import(R + '/js/sim/military.js');
const { monthlyCrises, stokeCrisis, crisisHeat, crisisStage, crisisReport } = await import(R + '/js/sim/crisis.js');
const { rulerDies, missionsFor } = await import(R + '/js/sim/realm.js');
const { factionDefs } = await import(R + '/js/sim/factions.js');
const { incomeBreakdown, runMonthlyEconomy, hoardCap, hoardBleed } = await import(R + '/js/sim/economy.js');
const { declareEmbargoCore, liftEmbargoCore, embargoTradeMult, blockadeIncomeMult, monthlyEmbargoAI } = await import(R + '/js/sim/embargo.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
function geomFor() {
  return {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [],
    coastal: [false, ...MAP_DATA.provinces.map(() => true)],
    offshore: [],
  };
}
function boot(bookmark, events, playerTag, seed = 31) {
  const geom = geomFor();
  const bus = { emit() {}, on() { return () => {}; } };
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap });
  return { game, ctx, actions: gameActions(ctx) };
}
const months = (ctx, n) => { for (let i = 0; i < n; i++) monthlyCrises(ctx); };

console.log('== §99: the ladder ends where the age does ==');
{
  ok(techCeiling(BOOKMARK_167) === 9 && techCeiling(BOOKMARK_614) === 13 && techCeiling(BOOKMARK_1948) === TECH_MAX,
    'each age declares how far up the ladder it can climb');
  const rifles = UNIT_GENS.findIndex((g) => /Rifle/.test(g.inf));
  ok(rifles > 0 && UNIT_GENS[rifles].at > techCeiling(BOOKMARK_167),
    'the rifle pattern sits above every ancient ceiling');
  ok(genName(cappedGen(99, BOOKMARK_167), 'inf') === 'Professional Legions',
    'a Maccabean realm with unlimited martial levels still fields legions (got '
    + genName(cappedGen(99, BOOKMARK_167), 'inf') + ')');
  ok(genName(cappedGen(99, BOOKMARK_614), 'inf') === 'Thematic Regulars',
    '614 stops at the thematic regulars');
  ok(genName(cappedGen(99, BOOKMARK_1948), 'inf') === 'Rifle Brigades',
    '1948 is the age that really has them');
  const { game, ctx, actions } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  game.tags.JUD.tech.mar = 24; // a save, an event, or a very long campaign
  ok(tagGen(ctx, 'JUD') === cappedGen(9, BOOKMARK_66),
    'even a tech level past the ceiling fields the era\'s pattern');
  game.tags.JUD.points.mar = 9999;
  game.tags.JUD.tech.mar = 9;
  const info = actions.getTech();
  const mar = info.rows.find((r) => r.key === 'mar');
  ok(!mar.canBuy && /age itself stops here/.test(mar.whyNot),
    'the panel refuses the purchase past the ceiling, in the age\'s words');
  actions.buyTech('mar');
  ok(game.tags.JUD.tech.mar === 9, 'and the action refuses it too');
  ok(info.unit.nextAt === null, 'no unreachable "next pattern" is dangled in front of the player');
}

console.log('== §98: the succession brews, and a heirless death opens it ==');
{
  const { game, ctx } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  const t = game.tags.JUD;
  t.heir = null;
  t.ruler.age = 62;
  months(ctx, 40);
  ok(crisisHeat(ctx, 'JUD', 'succession') <= 46,
    'an aging heirless king alone brews to whispers and plateaus there (heat '
    + crisisHeat(ctx, 'JUD', 'succession') + ')');
  ok(crisisStage(ctx, 'JUD', 'succession') === 1, 'which is stage one, and no further');
  ok((t.modifiers || []).some((m) => m.id === 'crisis_succession'),
    'the stage carries exactly one crisis modifier');
  // The death itself is the event that opens the question.
  rulerDies(ctx, 'JUD', 'has died');
  ok(crisisHeat(ctx, 'JUD', 'succession') >= 67 && crisisHeat(ctx, 'JUD', 'succession') < 100,
    'the heirless death lands the crisis at its second stage — not straight at war');
  months(ctx, 1);
  ok(crisisStage(ctx, 'JUD', 'succession') === 2, 'and the stage follows the heat');
  // An heir and belief cool it again, and the modifier goes with it.
  if (game.pretenders) delete game.pretenders.JUD;
  game.tags.JUD.heir = { name: 'A designated heir', gov: 2, infl: 2, mar: 2, age: 24 };
  game.tags.JUD.legitimacy = 80;
  months(ctx, 20);
  ok(crisisHeat(ctx, 'JUD', 'succession') === 0, 'a seated heir cools the crisis to nothing');
  ok(!(game.tags.JUD.modifiers || []).some((m) => m.id === 'crisis_succession'),
    'and the crisis modifier is cleared, not left behind');
}

console.log('== §98: the succession war, and the claims it hands out ==');
{
  const { game, ctx } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  game.tags.JUD.heir = null;
  game.tags.JUD.legitimacy = 20; // the acute case: belief has gone
  stokeCrisis(ctx, 'JUD', 'succession', 95);
  months(ctx, 3);
  ok(crisisStage(ctx, 'JUD', 'succession') === 3, 'the crisis reaches its third stage');
  ok(!!(game.pretenders && game.pretenders.JUD), 'a pretender takes the field');
  ok(Object.values(game.armies).some((a) => a && a.tag === 'REB' && a.rising === 'pretender'),
    'and the claim is an army, not a modifier');
  // A house bound by marriage holds the claim; a stranger needs the war itself.
  game.tags.ROM.marriages = ['JUD'];
  game.tags.JUD.marriages = ['ROM'];
  ok(!!successionClaim(ctx, 'ROM', 'JUD'), 'a married house holds a succession claim');
  const cb = casusBelli(ctx, 'ROM', 'JUD');
  ok(cb && cb.type === 'succession', 'and it is the casus belli their court reaches for first');
  ok(!successionClaim(ctx, 'JUD', 'ROM'), 'the claim does not run backwards into a healthy court');
  const report = crisisReport(ctx, 'JUD');
  const row = report.find((r) => r.id === 'succession');
  ok(!!row && row.stage === 3 && !!row.bite, 'the panel can name the crisis, its stage and its bite');
}

console.log('== §98: the books, and the bankruptcy at the end of them ==');
{
  const { game, ctx } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  const t = game.tags.JUD;
  t.treasury = -400;
  t.loans = 5;
  t.advisors = { gov: { name: 'A clerk', skill: 2 } };
  // Watch the collapse month by month: the arrears, the creditors, the default
  // itself — and then the cooling, because bankruptcy is a moment, not a state.
  const menOf = () => Object.values(game.armies).filter((a) => a.tag === 'JUD').reduce((s, a) => s + a.men, 0);
  const seen = new Set();
  let advisersGoneAt = 0, menBefore = menOf(), menAfter = menOf(), defaultedAt = 0;
  for (let m = 1; m <= 14; m++) {
    const was = menOf();
    monthlyCrises(ctx);
    const st = crisisStage(ctx, 'JUD', 'bankruptcy');
    if (!seen.has(st)) {
      seen.add(st);
      if (st === 2 && (!t.advisors || !t.advisors.gov)) advisersGoneAt = m;
      if (st === 3) { defaultedAt = m; menBefore = was; menAfter = menOf(); }
    }
  }
  ok(seen.has(1), 'sustained debt starts the clock');
  ok(seen.has(2) && advisersGoneAt > 0, 'the creditors call, and the unpaid advisers go home');
  ok(seen.has(3) && defaultedAt > 0, 'and the state reaches bankruptcy (month ' + defaultedAt + ')');
  ok(t.treasury === 0 && t.loans === 0, 'the debts are repudiated and the chest is empty');
  ok(menAfter < menBefore, 'a quarter of the army walks home (' + menBefore + ' → ' + menAfter + ')');
  ok(crisisStage(ctx, 'JUD', 'bankruptcy') < 3,
    'and the crisis cools once the books are clear — the penalty is not permanent');
  t.treasury = 500;
  for (let m = 0; m < 20; m++) monthlyCrises(ctx);
  ok(crisisHeat(ctx, 'JUD', 'bankruptcy') === 0 && crisisStage(ctx, 'JUD', 'bankruptcy') === 0,
    'solvency ends it');
  ok(!(t.modifiers || []).some((m) => m.id === 'crisis_bankruptcy'), 'and lifts its penalties');
}

console.log('== §98: the era\'s own crisis ==');
{
  ok((BOOKMARK_1948.crises || []).some((c) => c.id === 'closed_sea'),
    '1948 declares The Closed Sea');
  ok((BOOKMARK_66.crises || []).some((c) => c.id === 'factions_in_the_city'),
    '66 CE declares The Factions in the City');
  const { game, ctx } = boot(BOOKMARK_1948, EVENTS_1948, 'ISR');
  months(ctx, 24);
  ok(crisisStage(ctx, 'ISR', 'succession') === 0
    && !(game.tags.ISR.crises && game.tags.ISR.crises.succession),
  'the modern bookmark has no dynastic succession crisis at all');
  declareEmbargoCore(ctx, 'UK', 'ISR');
  declareEmbargoCore(ctx, 'ITA', 'ISR');
  declareEmbargoCore(ctx, 'UK', 'ISR', { blockade: true });
  months(ctx, 8);
  ok(crisisStage(ctx, 'ISR', 'closed_sea') >= 1,
    'a blockaded modern state feels the closed sea (heat ' + crisisHeat(ctx, 'ISR', 'closed_sea') + ')');
  liftEmbargoCore(ctx, 'UK', 'ISR');
  liftEmbargoCore(ctx, 'ITA', 'ISR');
  months(ctx, 14);
  ok(crisisHeat(ctx, 'ISR', 'closed_sea') === 0, 'and it passes when the markets reopen');
}

console.log('== §100: the pressure short of war ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_1948, EVENTS_1948, 'ISR');
  ok(coalitionAgainst(ctx, 'ISR').length === 0, 'the modern bookmark raises no punitive leagues');
  game.tags.ISR.aggression = 200;
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].opinion = { ISR: -200 };
  ok(coalitionAgainst(ctx, 'ISR').length === 0,
    'not even against an infamous conqueror everybody hates');
  const before = incomeBreakdown(ctx, 'ISR');
  declareEmbargoCore(ctx, 'UK', 'ISR');
  const embargoed = incomeBreakdown(ctx, 'ISR');
  ok(embargoTradeMult(ctx, 'ISR') < 1 && embargoed.trade < before.trade,
    'an embargo bites the trade routes (' + before.trade.toFixed(1) + ' → ' + embargoed.trade.toFixed(1) + ')');
  ok(Math.abs(embargoed.tax - before.tax) < 0.001,
    'but a letter alone does not touch the customs house');
  declareEmbargoCore(ctx, 'UK', 'ISR', { blockade: true });
  const blockaded = incomeBreakdown(ctx, 'ISR');
  ok(blockadeIncomeMult(ctx, 'ISR') < 1 && blockaded.tax < before.tax && blockaded.prod < before.prod,
    'a blockade closes the harbors: tax and production fall with the trade ('
    + before.income.toFixed(1) + ' → ' + blockaded.income.toFixed(1) + ')');
  const d = actions.getDiplomacy('UK');
  ok(d.embargo && d.embargo.offered && d.embargo.againstUs,
    'the panel knows whose markets are shut against us');
  liftEmbargoCore(ctx, 'UK', 'ISR');
  ok(Math.abs(incomeBreakdown(ctx, 'ISR').income - before.income) < 0.001,
    'lifting it restores the ledger exactly');
}

console.log('== §100: the letters are an age\'s instrument, not every age\'s ==');
{
  const { ctx } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  const before = incomeBreakdown(ctx, 'JUD').income;
  monthlyEmbargoAI(ctx);
  ok(!ctx.game.embargoes || Object.keys(ctx.game.embargoes).length === 0,
    'no ancient court closes its markets by decree');
  ok(Math.abs(incomeBreakdown(ctx, 'JUD').income - before) < 0.001, 'and nothing in the ledger moves');
}

console.log('== §101: what a treasury can hold ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, EVENTS_1948, 'ISR');
  const t = game.tags.SAU; // a small, poor, untroubled realm
  const cap = hoardCap(ctx, 'SAU');
  ok(cap >= DEFINES.BASE.hoardCapFloor, 'even a pauper may hold the floor (' + Math.round(cap) + ')');
  t.treasury = cap * 4;
  const bleed = hoardBleed(ctx, 'SAU');
  ok(bleed > 0, 'a hoard far past the country\'s means bleeds');
  const started = t.treasury;
  for (let i = 0; i < 60; i++) runMonthlyEconomy(ctx);
  ok(t.treasury < started * 0.6,
    'and five years of it drains most of the excess away ('
    + Math.round(started) + ' → ' + Math.round(t.treasury) + ', cap ' + Math.round(cap) + ')');
  // Left alone, the treasury settles where the drain matches the surplus —
  // a real ceiling instead of the old unbounded climb.
  const net = Math.max(0, incomeBreakdown(ctx, 'SAU').net);
  const settled = cap + net / DEFINES.BASE.hoardDecayPerMonth;
  const before240 = t.treasury;
  for (let i = 0; i < 240; i++) runMonthlyEconomy(ctx);
  ok(t.treasury <= settled * 1.15,
    'a hoard left alone settles where the drain meets the surplus ('
    + Math.round(t.treasury) + ' vs the settling point ' + Math.round(settled) + ')');
  ok(t.treasury < before240 + net * 240 * 0.5,
    'which is far below where twenty years of unchecked banking would have put it');
  const poor = game.tags.IRN;
  poor.treasury = 50;
  const capPoor = hoardCap(ctx, 'IRN');
  ok(hoardBleed(ctx, 'IRN') === 0 && capPoor > 50, 'a treasury under the cap is never touched');
}

console.log('== §101: a client\'s chest does not travel ==');
{
  const { game, ctx } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  const { monthlyIncorporation } = await import(R + '/js/sim/military.js');
  const lord = game.tags.JUD, client = game.tags.AGR;
  // The union is woven in peace: the bookmark's opening war is not our subject.
  const { endWarBySword } = await import(R + '/js/sim/military.js');
  for (const w of (game.wars || []).slice()) endWarBySword(ctx, w, null, { silent: true });
  game.wars.length = 0;
  for (const k of Object.keys(game.tags)) if (game.tags[k]) game.tags[k].atWarWith = [];
  client.overlord = 'JUD';
  client.opinion = { JUD: 90 };   // a devoted client, as the union requires
  lord.points.infl = 999;
  client.treasury = 4000;         // decades of quiet banking
  client.income = 5;              // …on an economy that earns five a month
  lord.treasury = 100;
  const res = incorporateCore(ctx, 'JUD', 'AGR');
  ok(res.ok && res.started, 'the union begins');
  for (let m = 0; m < res.months; m++) monthlyIncorporation(ctx);
  ok(game.tags.AGR.alive === false, 'and completes');
  const gained = lord.treasury - 100;
  ok(gained > 0, 'the crown does inherit something (' + Math.round(gained) + ')');
  ok(gained <= 4000 * DEFINES.BASE.inheritTreasuryShare + 1,
    'but a share of the chest, not the chest (cap ' + Math.round(4000 * DEFINES.BASE.inheritTreasuryShare) + ')');
  ok(gained <= client.income * DEFINES.BASE.inheritTreasuryCapMonths + 26,
    'and never more than the client\'s own economy could plausibly hold');
}

console.log('== §102: a formed crown keeps its court and gets a programme ==');
{
  const { game, ctx, actions } = boot(BOOKMARK_66, EVENTS_66, 'JUD');
  ok(!!factionDefs(ctx, 'JUD'), 'Judaea convenes its estates');
  const beforeObjectives = actions.getObjectives ? actions.getObjectives() : null;
  ok(switchTagCore(ctx, 'JUD', 'MLI'), 'the Kingdom of Israel is proclaimed');
  game.playerTag = 'MLI';
  ok(tagLineage(ctx, 'MLI').indexOf('JUD') > 0, 'the new crown remembers what it was');
  ok(!!factionDefs(ctx, 'MLI') && factionDefs(ctx, 'MLI') === factionDefs(ctx, 'JUD'),
    'the estates do not vanish with the proclamation — they are the same men');
  ok(!!contentForTag(ctx, BOOKMARK_66.objectives, 'MLI'),
    'and the age still tells the kingdom what it asks of it');
  const missions = missionsFor(ctx, 'MLI');
  ok(Array.isArray(missions) && missions.length >= 4,
    'the crown carries a mission chain of its own (' + (missions || []).length + ')');
  ok(missions.every((m) => m.check && m.reward && m.rewardText), 'each with a real check and a real reward');
  const view = actions.getMissions();
  ok(view.length === missions.length && view[0].status === 'current',
    'and the panel shows it from the first line');
}

console.log('== §102: the crowns pay differently ==');
{
  const mli = FORMABLES.find((f) => f.id === 'form_mli_jud');
  const has = FORMABLES.find((f) => f.id === 'form_has_hyr');
  const her = FORMABLES.find((f) => f.id === 'form_jud_her');
  ok(mli.bonus.grant && mli.bonus.grant.manpower >= 8000 && mli.bonus.modifier2,
    'the Kingdom of Israel pays in coin, men, ministries and a second permanent modifier');
  ok(has.bonus.grant && has.bonus.modifier2.id === 'priestly_crown',
    'the Hasmonean restoration pays like a priest-king');
  ok(her.bonus.grant && !her.bonus.grant.manpower && her.bonus.modifier2.id === 'the_builder_king',
    'and Herod\'s crown pays in money and mortar, not levies');
  const ids = new Set();
  for (const f of FORMABLES) {
    for (const m of [f.bonus.modifier, f.bonus.modifier2]) if (m) ids.add(m.id);
  }
  ok(ids.size >= 8, 'the crowns do not all hand out the same modifier');
}

console.log('== the books ride the save ==');
{
  const { game, ctx } = boot(BOOKMARK_1948, EVENTS_1948, 'ISR');
  const { reviveGame } = await import(R + '/js/sim/init.js');
  declareEmbargoCore(ctx, 'UK', 'ISR', { blockade: true });
  stokeCrisis(ctx, 'ISR', 'closed_sea', 80);
  monthlyCrises(ctx);
  const loaded = reviveGame(JSON.parse(JSON.stringify(game)));
  ok(loaded && loaded.embargoes && loaded.embargoes['UK>ISR'],
    'a loaded campaign still knows whose markets are shut');
  ok(loaded.tags.ISR.crises && loaded.tags.ISR.crises.closed_sea
    && loaded.tags.ISR.crises.closed_sea.heat > 0,
  'and how hot its crisis had grown');
  const old = reviveGame(JSON.parse(JSON.stringify(Object.assign({}, game, { embargoes: undefined }))));
  ok(old && old.embargoes && Object.keys(old.embargoes).length === 0,
    'a pre-§100 save loads with an empty book rather than a crash');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
