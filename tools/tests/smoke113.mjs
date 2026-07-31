// Headless regression — SPEC §181: the arsenal is somebody else's.
//
// Where a bookmark declares an arms market, only its arsenal states raise
// the gated arms (air wings, armor) from their own works; everyone else
// needs a weapons transfer agreement with ONE supplier at a time, opened at
// the supplier's regard, anchored while it stands, and cut by cooling, war,
// or a §100 embargo. Armor is the mounted arm at pattern 5+: priced like
// tanks, fitted slower, and worth shock-phase pips on §154's signed design.
// What this suite holds:
//   - the gates: a client without a pipeline raises neither wings nor
//     armor, an arsenal raises both, infantry is never gated;
//   - the opening book is the treaty system of May '48;
//   - signing pays the supplier at the regard bar; switching drops (and
//     offends) the old supplier; the deal survives neglect via the drift
//     anchor and dies to embargo in one month;
//   - the AI signs its own deals and the AI muster falls back to foot
//     rather than stalling on a shut market;
//   - armor prices and fitting time read from DEFINES.ARMOR, armorPips
//     scale and cap, the pips land in the SHOCK phase of a real battle,
//     and the ancient chapters can never see any of it;
//   - reviveGame defaults the book for pre-§181 saves.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');
const arms = await import(R + '/js/sim/arms.js');
const { monthlyOpinionDrift } = await import(R + '/js/sim/unrest.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const geom = {
  neighbors: snap.neighbors.map((a) => new Set(a)),
  centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  coastal: snap.coastal.map(Boolean),
  offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  areas: Int32Array.from(snap.areas), bbox: [],
};
let notices = [];
const bus = { emit(kind, payload) { notices.push({ kind, payload }); }, on() { return () => {}; } };

function boot(eraId, playerTag, seed = 9) {
  const ERA = ERAS.find((e) => e.bookmark.id === eraId);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: ERA.bookmark, events: ERA.events,
    playerTag, rngSeed: seed,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: ERA.bookmark, events: ERA.events,
  });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== the gates ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  const joppa = ctx.provId('Joppa');
  game.tags.ISR.treasury = 500;
  ok(mil.armsMarketOn(ctx), '1948 declares the market');
  ok(!mil.raiseAirWing(ctx, 'ISR', joppa, 'fighter').ok, 'a client with no pipeline raises no wing');
  ok(!mil.recruitRegiment(ctx, 'ISR', joppa, 'cav').ok, '…and no armor');
  ok(mil.recruitRegiment(ctx, 'ISR', joppa, 'inf').ok, 'while the rifle brigades muster freely');
  const salamis = ctx.provId('Salamis');
  game.tags.UK.treasury = 500;
  ok(mil.recruitRegiment(ctx, 'UK', salamis, 'cav').ok, 'an arsenal builds armor from its own works');
  ok(mil.armsGate(ctx, 'UK') === '', 'the gate answers "" for an arsenal');
}

console.log('== the opening book is the treaty system ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  const book = game.armsDeals;
  ok(book.EGY === 'UK' && book.JOR === 'UK' && book.IRQ === 'UK', 'the Anglo- treaties stand');
  ok(book.SYR === 'FRA' && book.LEB === 'FRA', 'the mandate clients buy French');
  ok(book.TUR === 'USA' && book.GRC === 'USA', 'the Truman doctrine\'s two buy American');
  ok(!book.ISR, 'Israel opens under nobody — the market is shut on day one');
  ok(mil.armsDealState(ctx, 'EGY').live, 'and the seeded regard keeps the book live');
}

console.log('== signing, switching, and what it costs ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  game.tags.ISR.treasury = 200;
  ok(!arms.signArmsDealCore(ctx, 'ISR', 'CZE').ok, 'Prague refuses at regard 45 (need 50)');
  game.tags.CZE.opinion.ISR = 60;
  const czeBefore = game.tags.CZE.treasury;
  const r = arms.signArmsDealCore(ctx, 'ISR', 'CZE');
  ok(r.ok, 'courted to 60, Prague signs');
  ok(game.tags.ISR.treasury === 150 && game.tags.CZE.treasury === czeBefore + 50, 'the fee moves, and lands in the supplier\'s treasury');
  ok(game.armsDeals.ISR === 'CZE', 'the book records one supplier');
  const joppa = ctx.provId('Joppa');
  ok(mil.raiseAirWing(ctx, 'ISR', joppa, 'fighter').ok, 'and the hangars open');
  game.tags.FRA.opinion.ISR = 70;
  const czeRegard = game.tags.CZE.opinion.ISR;
  ok(arms.signArmsDealCore(ctx, 'ISR', 'FRA').ok, 'signing Paris drops Prague', true);
  ok(game.armsDeals.ISR === 'FRA', 'one supplier at a time');
  ok(game.tags.CZE.opinion.ISR === czeRegard + DEFINES.ARMS.switchOpinion, 'and the dropped supplier notices (−10)');
}

console.log('== lapse: neglect is anchored, rupture is not ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  // The anchor: a live deal holds the supplier's drift at the anchor line.
  game.tags.UK.opinion.EGY = DEFINES.ARMS.anchor;
  monthlyOpinionDrift(ctx);
  ok(game.tags.UK.opinion.EGY === DEFINES.ARMS.anchor, 'the drift anchors a live pipeline at ' + DEFINES.ARMS.anchor);
  game.tags.UK.opinion.EGY = DEFINES.ARMS.anchor + 10;
  monthlyOpinionDrift(ctx);
  ok(game.tags.UK.opinion.EGY === DEFINES.ARMS.anchor + 9, '…from above it still cools toward it');
  // Rupture: a scripted blow through the floor kills the deal, with notice.
  notices = [];
  game.tags.UK.opinion.EGY = DEFINES.ARMS.floor - 1;
  game.playerTag = 'EGY'; // watch the notice from the client's chair
  arms.monthlyArms(ctx);
  game.playerTag = 'ISR';
  ok(!game.armsDeals.EGY, 'regard through the floor cuts the pipeline');
  ok(notices.some((n) => n.kind === 'notify' && /pipeline/i.test(n.payload.title)), 'and the client is told');
  // Embargo: the §100 signature is the cutoff.
  ok(game.armsDeals.JOR === 'UK', '(Jordan\'s deal still stands…)');
  game.embargoes['UK>JOR'] = { y: game.date.y, m: game.date.m };
  arms.monthlyArms(ctx);
  ok(!game.armsDeals.JOR, '…until the supplier signs an embargo: one signature, no pipeline');
}

console.log('== the AI plays it ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  delete game.armsDeals.SYR;
  game.tags.SYR.treasury = 200;
  game.tags.FRA.opinion.SYR = 60;
  arms.monthlyArms(ctx);
  ok(game.armsDeals.SYR === 'FRA', 'a clientless AI court signs with the friendliest arsenal that will have it');
  ok(mil.armsGate(ctx, 'SAU') !== '', '(Saudi Arabia stays shut out: nobody\'s regard reaches the bar)');
}

console.log('== armor: the price, the clock, the pips, the phase ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  const AR = DEFINES.ARMOR;
  game.tags.EGY.treasury = 300;
  const memphis = ctx.provId('Memphis');
  const before = game.tags.EGY.treasury;
  ok(mil.recruitRegiment(ctx, 'EGY', memphis, 'cav').ok, 'Egypt buys armor through the London pipeline');
  ok(before - game.tags.EGY.treasury === AR.cost, 'at the ARMOR price (' + AR.cost + '), not the horse price');
  const order = ctx.byId(memphis).unitQueue.find((o) => o.type === 'cav');
  ok(order && order.totalMonths === AR.months, 'fitted in ' + AR.months + ' months, not 3');
  ok(mil.armorPips(ctx, 1) === 1 && mil.armorPips(ctx, 4) === 2, 'armor pips scale at 1 per ' + AR.pipsPer);
  ok(mil.armorPips(ctx, 99) === AR.pipCap, '…and cap at ' + AR.pipCap);
  ok(mil.armorPips(ctx, 0) === 0 && mil.armorPips(ctx, -3) === 0, 'no advantage, no pips — the term is signed');
  // A real battle: six armored regiments against foot, on flat empty ground
  // (Jamnia is farmland; hills would gift the defender the dice that ended
  // this test's first draft in two rounds). Shock rounds carry the pips;
  // fire rounds carry none (fire belongs to the sky). Deep morale so both
  // sides survive to the shock phase whatever the dice do.
  const jamnia = ctx.provId('Jamnia');
  for (const a of Object.values(game.armies)) if (a.prov === jamnia) mil.removeArmy(ctx, a.id);
  const armored = mil.spawnArmy(ctx, 'ISR', 'Jamnia', { inf: 8, cav: 6, name: 'Armored Fist' });
  mil.spawnArmy(ctx, 'EGY', 'Jamnia', { inf: 14, name: 'Foot Column' });
  for (const a of Object.values(game.armies)) if (a.prov === jamnia) { a.gen = 5; a.morale = 30; a.maxMorale = 30; }
  mil.engageIfNeeded(ctx, game.armies[armored]);
  const b = game.battles.find((x) => x && x.prov === jamnia);
  ok(!!b, 'the engagement opens a battle at Jamnia');
  const seen = { shock: null, fire: null };
  for (let d = 0; d < 8 && game.battles.indexOf(b) >= 0 && !(seen.shock && seen.fire); d++) {
    mil.tickBattles(ctx);
    if (b.last && seen[b.last.phase] === null) {
      const isrAtk = (b.atk || []).some((id) => game.armies[id] && game.armies[id].tag === 'ISR');
      seen[b.last.phase] = { us: isrAtk ? b.last.armA : b.last.armD, them: isrAtk ? b.last.armD : b.last.armA };
    }
  }
  ok(seen.shock && seen.shock.us === Math.min(AR.pipCap, Math.ceil(6 / AR.pipsPer)) && seen.shock.them === 0,
    'in the shock phase the armored side rolls its pips and the foot side rolls none');
  ok(seen.fire && seen.fire.us === 0 && seen.fire.them === 0, 'in the fire phase armor adds nothing');
}

console.log('== the ancient chapters cannot see any of this ==');
{
  const { game, ctx } = boot('167bce', 'HAS');
  ok(!mil.armsMarketOn(ctx), '167 BCE declares no market');
  ok(mil.armsGate(ctx, 'HAS') === '', 'so the gate never bars a Maccabean muster');
  game.tags.HAS.treasury = 200;
  const jer = ctx.provId('Jerusalem');
  const before = game.tags.HAS.treasury;
  ok(mil.recruitRegiment(ctx, 'HAS', jer, 'cav').ok, 'cavalry raises as it always did');
  ok(before - game.tags.HAS.treasury === DEFINES.BASE.regCost.cav, 'at the horse price — pattern 0 is not armor');
}

console.log('== the save contract ==');
{
  const { game } = boot('1948ce', 'ISR');
  const saved = JSON.parse(JSON.stringify(game));
  delete saved.armsDeals;
  const revived = reviveGame(saved);
  ok(revived && revived.armsDeals && typeof revived.armsDeals === 'object', 'a pre-§181 save gets an empty book, not a crash');
}

console.log(failures ? `smoke113: ${failures} FAILURES` : 'smoke113: ALL PASS');
process.exit(failures ? 1 : 0);
