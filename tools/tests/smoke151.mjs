// Headless regression — the crown war (SPEC §226): Herod begins the chapter
// inside Rome's system, a crown war's pen belongs to the claimant rather than
// to his protectors, and at war score the table can hand one claimant the
// whole kingdom instead of arguing it out town by town.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_40 } = await import(R + '/js/data/bookmark_40bce.js');
const { BOOKMARK_67 } = await import(R + '/js/data/bookmark_67bce.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { buildAiPeaceDeal, describeAiPeaceDeal } = await import(R + '/js/sim/ai.js');
const mil = await import(R + '/js/sim/military.js');

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

function boot(bookmark, playerTag, seed = 60) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: [] });
  return { game, ctx, actions: gameActions(ctx) };
}
const crownWar = (g) => g.wars.find((w) => w && w.name === 'The War for the Crown');
const brothersWar = (g) => g.wars.find((w) => w && w.name === 'The War of the Brothers');
const provsOf = (g, tag) => {
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) n++;
  }
  return n;
};

console.log('== Herod begins as Rome\'s client (40 BCE) ==');
{
  const { game, ctx } = boot(BOOKMARK_40, 'HER');
  ok(game.tags.HER.overlord === 'ROM', 'the collar is on from the first day of the chapter');
  ok(mil.vassalsOf(ctx, 'ROM').indexOf('HER') >= 0, 'and Rome counts him among its client kingdoms');
  const w = crownWar(game);
  ok(!!w, 'the War for the Crown is declared at setup');
  ok(w.defenders.indexOf('ROM') < 0 && (game.tags.ROM.atWarWith || []).indexOf('ATG') < 0,
    'but the collar does NOT drag the legions into it — Antony is busy with Fulvia\'s war');
  ok(w.attackers.indexOf('PAR') >= 0, 'Parthia rides with Antigonus as before');
  // §61's other half still applies to him: a client keeps no clients.
  const offer = mil.clientOfferInfo(ctx, 'HER', 'NAB');
  ok(!offer.can && /client kingdom does not keep client kingdoms/i.test(offer.why || ''),
    'a client crown may not collar anybody itself: ' + offer.why);
}

console.log('== the collar thrown off from below (SPEC §226) ==');
{
  // §219 catalogued the four ways a collar comes off and none of them was the
  // client's; `vassalIndependence` begins `if (!t.ai) continue`. A human client
  // — Herod here, Adiabene in three chapters — could not reach its own chapter's
  // sovereignty conditions at all.
  const { game, ctx } = boot(BOOKMARK_40, 'HER');
  const w = crownWar(game);
  const midWar = mil.independenceInfo(ctx, 'HER');
  ok(midWar && !midWar.can && /middle of another war/i.test(midWar.why),
    'not while our levies stand in somebody else\'s line: ' + (midWar && midWar.why));
  // The crown war settled; now the collar is the only thing left.
  game.tags.HER.atWarWith = [];
  game.tags.PAR.atWarWith = [];
  game.wars.splice(game.wars.indexOf(w), 1);
  const info = mil.independenceInfo(ctx, 'HER');
  ok(info && info.can && info.tag === 'ROM', 'the client may renounce: the crown that holds our leash is named');
  ok(info.dev > 0 && info.ourDev > 0, 'and the odds are stated before the herald rides');
  const res = mil.declareIndependenceCore(ctx, 'HER');
  ok(res.ok, 'the declaration is made');
  ok(game.tags.HER.overlord === null, 'the bond breaks FIRST — free courts declare, clients cannot');
  const iw = game.wars.find((x) => x && x.id === res.warId);
  ok(!!iw && iw.cb === 'independence' && iw.attackers.indexOf('HER') >= 0 && iw.defenders.indexOf('ROM') >= 0,
    'and what follows is an ordinary war of independence');
  ok(mil.independenceSideOf(iw) === 'att', 'the side fighting for its own soil is marked (SPEC §174)');
  // With the collar off, §91's alternate-history gate is reachable again.
  ok(!game.tags.HER.overlord, 'and the chapter\'s "answer to no overlord" strand is no longer a locked door');
  // A crown that answers to nobody has nothing to renounce.
  ok(mil.independenceInfo(ctx, 'ROM') === null, 'a sovereign crown is offered no such move');
}
{
  // And the same move as the panel presses it: the action layer, player-only.
  const { game, actions } = boot(BOOKMARK_67, 'ADI');
  ok(game.tags.ADI.overlord === 'PAR', 'Adiabene rides in Parthia\'s train, as three chapters seat it');
  const d = actions.getDiplomacy('PAR');
  ok(d && d.ourOverlord && d.independence && d.independence.can,
    'the panel that draws the King of Kings is handed the move');
  ok(!(actions.getDiplomacy('ARM') || {}).independence,
    'and no other court on the map is offered it');
  actions.declareIndependence();
  ok(game.tags.ADI.overlord === null,
    'the client tag the chapters actually hand a player can now reach its own victory text');
  ok(game.wars.some((w) => w && w.cb === 'independence' && w.attackers.indexOf('ADI') >= 0),
    'and it costs exactly one war with the King of Kings');
}

console.log('== the crown war\'s pen belongs to the claimant (SPEC §226) ==');
{
  const { game, ctx } = boot(BOOKMARK_40, 'HER');
  const w = crownWar(game);
  // Rome takes the field beside its client, as ev5_senate has it.
  w.defenders.push('ROM');
  game.tags.ROM.atWarWith.push('ATG');
  game.tags.ATG.atWarWith.push('ROM');
  ok(mil.sideLeaderOf(ctx, w, w.defenders) === 'HER',
    'Herod holds his own side\'s pen even with his overlord in the war beside him');
  const info = mil.peaceDealInfo(ctx, w, 'HER');
  ok(info.exit === false, 'so his table is a congress table, not a junior\'s withdrawal');
  ok(info.enemyLeader === 'ATG', 'and the court across it is the rival claimant');
  // The protector, meanwhile, is the junior here: this is not Rome's crown.
  const romInfo = mil.peaceDealInfo(ctx, w, 'ROM');
  ok(romInfo.exit === true && romInfo.sideLeader === 'HER',
    'Rome fights the crown war and does not settle it — its table is a withdrawal');
  ok(romInfo.canUnifyCrown === false && /No crown of ours/i.test(romInfo.whyNotUnifyCrown),
    'and Rome cannot take a crown it is not claiming: ' + romInfo.whyNotUnifyCrown);
  // Ordinary wars keep §61/§74's promotion exactly as it was.
  const other = mil.declareWar(ctx, 'PAR', 'NAB', 'A War Over Land');
  const ow = game.wars.find((x) => x && x.name === 'A War Over Land');
  ok(!!other && !!ow, 'an ordinary war for the control');
  ok(mil.crownWarOf(ctx, ow) === null, 'which is not a crown war');
}

console.log('== the clause: one kingdom, one price, war score alone ==');
{
  const { game, ctx } = boot(BOOKMARK_40, 'HER');
  const w = crownWar(game);
  const info = mil.peaceDealInfo(ctx, w, 'HER');
  ok(info.crownWar === true && info.crownRival === 'ATG' && info.crownOf === 'Judaea',
    'the table knows whose crown is in dispute');
  ok(info.canUnifyCrown === true, 'and offers the clause to the claimant');
  ok(info.unifyCrownCost === 80, 'priced at 80 war score: ' + info.unifyCrownCost);

  // It is not the dismemberment budget under another name: Antigonus' kingdom
  // is far past what §69 lets one treaty strip, and past what a province list
  // could ever pay for.
  const atgDev = mil.devOfTag(ctx, 'ATG');
  ok(atgDev > mil.peaceDevCap(ctx, info),
    `the whole kingdom (${atgDev} dev) is far past one treaty's dismemberment cap (${mil.peaceDevCap(ctx, info)})`);
  ok(atgDev * 0.9 > 100, 'and past anything 100 war score could buy province by province');

  w.warscore.HER = 79;
  const shortOfIt = mil.evaluatePeaceDeal(ctx, w, 'HER', { unifyCrown: true });
  ok(!shortOfIt.acceptable && /crown is not signed away/i.test(shortOfIt.reason),
    'one point short and the crown stays where it is: ' + shortOfIt.reason);
  w.warscore.HER = 80;
  const bought = mil.evaluatePeaceDeal(ctx, w, 'HER', { unifyCrown: true });
  ok(bought.acceptable && bought.cost === 80 && bought.unifyCrown,
    'at 80 the argument is settled: ' + bought.reason);

  // It supersedes the whole rest of the table — there is no court left to
  // cede a town, pay an indemnity, or be humiliated next month.
  // A protector who never fought this war still answers for its client: the
  // pen rule lets a claimant settle his own crown, not delete a court whose
  // guarantor was never in the field.
  game.tags.ATG.overlord = 'PTO';
  const sheltered = mil.peaceDealInfo(ctx, w, 'HER');
  ok(!sheltered.canUnifyCrown && /not at this table/i.test(sheltered.whyNotUnifyCrown),
    'a collar worn to a court outside the war holds the clause off: ' + sheltered.whyNotUnifyCrown);
  game.tags.ATG.overlord = null;

  const kitchenSink = mil.evaluatePeaceDeal(ctx, w, 'HER', {
    unifyCrown: true, subjugate: true, provinces: info.provinces.map((r) => r.id),
    gold: info.maxGold, humiliate: true, reparations: true, release: ['HAS'],
  });
  ok(kitchenSink.cost === 80, 'and carries one price whatever else is ticked: ' + kitchenSink.cost);
  ok(!kitchenSink.provinces.length && !kitchenSink.subjugate && !kitchenSink.gold
    && !kitchenSink.humiliate && !kitchenSink.reparations && !kitchenSink.releaseRows.length,
  'every other clause falls away beside it');
}

console.log('== the treaty executed: the kingdom is one ==');
{
  const { game, ctx } = boot(BOOKMARK_40, 'HER');
  const w = crownWar(game);
  w.warscore.HER = 100;
  const atgProvs = provsOf(game, 'ATG');
  const herBefore = provsOf(game, 'HER');
  const infamyBefore = game.tags.HER.aggression || 0;
  ok(atgProvs > 0 && mil.armiesOf(ctx, 'ATG').length > 0, 'Antigonus holds a kingdom and a host');
  mil.executePeaceDeal(ctx, w, 'HER', { unifyCrown: true });
  ok(provsOf(game, 'ATG') === 0, 'every province of his passes at the treaty');
  ok(provsOf(game, 'HER') === herBefore + atgProvs, 'and every one of them to Herod');
  ok(mil.armiesOf(ctx, 'ATG').length === 0, 'the host that carried the claim goes with it');
  ok(game.tags.ATG.alive === false, 'the court passes into memory at the table, not a month later');
  ok(!game.wars.some((x) => x.id === w.id), 'the war is over');
  ok((game.tags.HER.aggression || 0) === infamyBefore + 10,
    'the world counts a crown made whole once, not by the acre');
  const jerusalem = ctx.prov('Jerusalem');
  ok(jerusalem.owner === 'HER' && jerusalem.controller === 'HER', 'Jerusalem is Herod\'s');
  ok((jerusalem.modifiers || []).some((m) => m && m.id === 'recent_conquest'),
    'and arrives on a conqueror\'s terms all the same');
  // Parthia was on the losing side and is not annexed by a clause about Judaea.
  ok(game.tags.PAR.alive !== false && provsOf(game, 'PAR') > 0,
    'the clause takes the rival claimant\'s realm and nobody else\'s');
}

console.log('== the same answer from the other side, and in the brothers\' war ==');
{
  // Antigonus wins it instead: the clause is symmetric, which is the whole
  // point of "one of them".
  const { game, ctx } = boot(BOOKMARK_40, 'ATG');
  const w = crownWar(game);
  w.defenders.push('ROM'); // Rome in the field beside its client, and it changes nothing
  w.warscore.ATG = 100;
  const info = mil.peaceDealInfo(ctx, w, 'ATG');
  ok(info.canUnifyCrown && info.crownRival === 'HER',
    'the last Hasmonean may take the Idumean\'s kingdom on the same terms');
  const herProvs = provsOf(game, 'HER');
  mil.executePeaceDeal(ctx, w, 'ATG', { unifyCrown: true });
  ok(provsOf(game, 'HER') === 0 && game.tags.HER.alive === false && herProvs > 0,
    'and does: Herod\'s realm passes whole to Jerusalem');
  ok(game.tags.ROM.alive !== false && provsOf(game, 'ROM') > 0,
    'while the protector keeps every acre it owns');
}
{
  const { game, ctx } = boot(BOOKMARK_67, 'HYR');
  const w = brothersWar(game);
  ok(!!w, 'the War of the Brothers is declared at setup');
  w.warscore.HYR = 100;
  const info = mil.peaceDealInfo(ctx, w, 'HYR');
  ok(info.crownWar && info.crownRival === 'ARI' && info.canUnifyCrown,
    'Salome Alexandra\'s sons are claimants to one crown too');
  const ariProvs = provsOf(game, 'ARI');
  mil.executePeaceDeal(ctx, w, 'HYR', { unifyCrown: true });
  ok(ariProvs > 0 && provsOf(game, 'ARI') === 0 && game.tags.ARI.alive === false,
    'and the civil war can end before Pompey arrives to end it for them');
}

console.log('== the control: no crown, no clause ==');
{
  // A chapter that names no crown war has none, and a hand-edited deal cannot
  // buy a kingdom the table never offered.
  const { game, ctx } = boot(BOOKMARK_66, 'JUD');
  const w = game.wars.find((x) => x && x.attackers.indexOf('JUD') >= 0);
  ok(!!w, 'the Great Revolt is running');
  ok(mil.crownWarOf(ctx, w) === null, 'and is not a war between two claimants to one crown');
  const info = mil.peaceDealInfo(ctx, w, 'JUD');
  ok(info.crownWar === false && info.crownRival === null && !info.canUnifyCrown,
    'so the table offers no crown: ' + info.whyNotUnifyCrown);
  w.warscore.JUD = 100;
  const forged = mil.evaluatePeaceDeal(ctx, w, 'JUD', { unifyCrown: true });
  ok(!forged.unifyCrown && forged.cost === 0,
    'and a deal that claims the clause anyway buys nothing with it');
}

console.log('== the AI signs it, and only when the score is there ==');
{
  const { game, ctx } = boot(BOOKMARK_40, 'ATG');
  const w = crownWar(game);
  w.warscore.HER = 100; w.warscore.ATG = -100;
  const rich = buildAiPeaceDeal(ctx, w, 'HER');
  ok(rich.unifyCrown === true, 'a claimant that has won the argument writes the answer into the treaty');
  ok(!rich.provinces.length && !rich.subjugate, 'and asks for nothing else beside it');
  const priced = describeAiPeaceDeal(ctx, w, 'HER', rich);
  ok(priced.ev.acceptable && /crown renounced and the whole kingdom surrendered/.test(priced.text),
    'and the herald reads it out plainly: ' + priced.text);
  w.warscore.HER = 70; w.warscore.ATG = -70;
  const poor = buildAiPeaceDeal(ctx, w, 'HER');
  ok(!poor.unifyCrown, 'a claimant that is merely winning takes towns instead');
  // And an ally of a claimant never reaches for a crown that is not its own.
  w.defenders.push('ROM');
  w.warscore.ROM = 100;
  const romDeal = buildAiPeaceDeal(ctx, w, 'ROM');
  ok(!romDeal.unifyCrown, 'Rome, at 100 war score, still does not take a Jewish crown at this table');
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
