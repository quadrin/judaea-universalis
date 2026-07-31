// Headless regression — SPEC §186: the purse is somebody else's too.
//
// Where a bookmark names donor courts, any other court may petition one for
// financial aid. The petition is weighed on the donor's regard (need), costs
// the mission's influence, and a grant is an ordinary §24 subsidy row sized
// to the donor's own purse — so the ledger, the panels, the countdown and
// the default rule all come free. A granted package runs its term whatever
// the friendship does afterward; only war or a §100 embargo between the two
// courts stops the checks early. Asking leaves a mark on the donor's regard,
// one purse at a time, one petition per donor per window. What this suite
// holds:
//   - the donor list is the bookmark's own: CZE sells arms but funds nobody;
//   - the gates: the regard bar, the influence fee, the donor's real books,
//     one purse at a time, and the petition window;
//   - the grant: the subsidy row with the aid marker, both ledgers agreeing,
//     the mark on the donor's regard, and the chronicle line;
//   - a package survives cooling (no drift anchor, no regard cut) and dies
//     to war or embargo with notice — and the term runs out on schedule;
//   - the AI petitions when poor, never for the player, and the friendless
//     get nothing;
//   - the ancient chapters declare no donors and see none of it;
//   - a save carries a live package through reviveGame intact.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const aid = await import(R + '/js/sim/aid.js');
const eco = await import(R + '/js/sim/economy.js');
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

console.log('== the donors of the age ==');
{
  const { ctx } = boot('1948ce', 'ISR');
  ok(aid.aidOn(ctx), '1948 names its donor courts');
  ok(['USA', 'SOV', 'UK', 'FRA'].every((t) => aid.isAidDonor(ctx, t)), 'Washington, Moscow, London and Paris underwrite');
  ok(!aid.isAidDonor(ctx, 'CZE'), 'Prague, arsenal though it is, funds nobody — it sells');
  ok(/underwrites nobody/.test(aid.aidRequestGate(ctx, 'ISR', 'CZE')), 'and the gate says so');
  ok(/purse others petition/.test(aid.aidRequestGate(ctx, 'USA', 'FRA')), 'a donor does not petition a donor');
  const info = aid.aidInfo(ctx, 'ISR', 'USA');
  ok(info && info.offered && !info.flowing, 'the petition is offered against a donor court');
  ok(aid.aidInfo(ctx, 'ISR', 'JOR') === null, 'and against an ordinary court there is nothing to show');
}

console.log('== the bar is their regard, and the purse is real ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  ok(/regard for us is too low \(55 required\)/.test(aid.aidRequestGate(ctx, 'ISR', 'USA')),
    'the opening regard (40) is under the bar (' + DEFINES.AID.need + ')');
  game.tags.USA.opinion.ISR = DEFINES.AID.need;
  ok(/not enough influence/.test(aid.aidRequestGate(ctx, 'ISR', 'USA')), 'at the bar, the mission still wants its influence');
  game.tags.ISR.points.infl = 25;
  ok(aid.aidRequestGate(ctx, 'ISR', 'USA') === '', 'regard and influence together open the door');
  ok(aid.aidAmount(ctx, 'USA') === 15, 'Washington\'s package rides the stipend: a quarter of 60');
  ok(aid.aidAmount(ctx, 'UK') === DEFINES.AID.amountFloor, 'London\'s thin on-map books floor out');
  // The purse must be real: Moscow's fragment nets almost nothing and its
  // chest opens empty, so even a warm Kremlin has nothing to vote.
  game.tags.SOV.opinion.ISR = 80;
  ok(/books cannot carry it/.test(aid.aidRequestGate(ctx, 'ISR', 'SOV')), 'a warm donor with empty books refuses');
  game.tags.SOV.treasury = 200;
  ok(aid.aidRequestGate(ctx, 'ISR', 'SOV') === '', 'a saved-up chest that covers the package grants');
}

console.log('== the grant: the row, the mark, the clock ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  game.tags.USA.opinion.ISR = 60;
  game.tags.ISR.points.infl = 25;
  const res = aid.requestAidCore(ctx, 'ISR', 'USA');
  ok(res.ok && res.amount === 15 && res.months === DEFINES.AID.months, 'the petition is granted at the declared size and term');
  const row = (game.subsidies || []).find((s) => s && s.aid);
  ok(!!row && row.from === 'USA' && row.to === 'ISR' && row.amount === 15 && row.monthsLeft === DEFINES.AID.months,
    'the grant is a §24 subsidy row wearing the aid marker');
  ok(game.tags.ISR.points.infl === 5, 'the mission cost its ' + DEFINES.AID.infl + ' influence');
  ok(game.tags.USA.opinion.ISR === 60 + DEFINES.AID.askOpinion, 'asking left its mark (' + DEFINES.AID.askOpinion + ')');
  ok(eco.incomeBreakdown(ctx, 'ISR').subsIn === 15 && eco.incomeBreakdown(ctx, 'USA').subsOut === 15,
    'both ledgers read the same 15 talents');
  ok((game.chronicle || []).some((c) => c && /opens its purse to Israel/.test(c.text || '')), 'the chronicle records the opening');
  ok(/already flows/.test(aid.aidRequestGate(ctx, 'ISR', 'USA')), 'no second petition while the first still pays');
  game.tags.FRA.opinion.ISR = 90;
  ok(/leans on The United States — one purse at a time/.test(aid.aidRequestGate(ctx, 'ISR', 'FRA')),
    'and no second purse while the first is open');
  const info = aid.aidInfo(ctx, 'ISR', 'USA');
  ok(info && info.flowing && info.amount === 15 && info.monthsLeft === DEFINES.AID.months, 'the panel sees the live flow');
}

console.log('== a package outlives the cooling ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  game.tags.USA.opinion.ISR = 60;
  game.tags.ISR.points.infl = 25;
  aid.requestAidCore(ctx, 'ISR', 'USA');
  monthlyOpinionDrift(ctx);
  ok(game.tags.USA.opinion.ISR < 55, 'aid anchors nothing: the regard cools like any other (§181\'s anchor is the arms deal\'s alone)');
  game.tags.USA.opinion.ISR = -100;
  aid.monthlyAid(ctx);
  ok((game.subsidies || []).some((s) => s && s.aid && s.from === 'USA'), 'and a voted credit clears whatever the regard does');
}

console.log('== war and embargo stop the checks ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  // War: a French package, then the courts fall out.
  game.tags.FRA.opinion.ISR = 70;
  game.tags.FRA.treasury = 200;
  game.tags.ISR.points.infl = 45;
  aid.requestAidCore(ctx, 'ISR', 'FRA');
  notices = [];
  game.tags.ISR.atWarWith.push('FRA');
  game.tags.FRA.atWarWith.push('ISR');
  aid.monthlyAid(ctx);
  ok(!(game.subsidies || []).some((s) => s && s.aid && s.from === 'FRA'), 'war between the courts stops the checks');
  ok(notices.some((n) => n.kind === 'notify' && /aid stops/i.test(n.payload.title) && n.payload.type === 'bad'),
    'and the taker is told, badly');
  // Embargo: a Soviet package, then Moscow signs something.
  game.tags.ISR.atWarWith = game.tags.ISR.atWarWith.filter((t) => t !== 'FRA');
  game.tags.FRA.atWarWith = game.tags.FRA.atWarWith.filter((t) => t !== 'ISR');
  game.tags.SOV.opinion.ISR = 70;
  game.tags.SOV.treasury = 200;
  aid.requestAidCore(ctx, 'ISR', 'SOV');
  ok((game.subsidies || []).some((s) => s && s.aid && s.from === 'SOV'), '(the Soviet package opens…)');
  game.embargoes['SOV>ISR'] = { y: game.date.y, m: game.date.m };
  aid.monthlyAid(ctx);
  ok(!(game.subsidies || []).some((s) => s && s.aid && s.from === 'SOV'), '…until the donor signs an embargo: one signature, no checks');
  // And a closed market bars the next petition before it is sent.
  ok(/closed its markets to us/.test(aid.aidRequestGate(ctx, 'ISR', 'SOV')), 'the same signature bars the next petition');
}

console.log('== the term runs out ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  game.tags.USA.opinion.ISR = 60;
  game.tags.ISR.points.infl = 25;
  aid.requestAidCore(ctx, 'ISR', 'USA');
  const row = (game.subsidies || []).find((s) => s && s.aid);
  row.monthsLeft = 1;
  notices = [];
  eco.monthlySubsidies(ctx);
  ok(!(game.subsidies || []).some((s) => s && s.aid), 'the last month is the last check');
  ok(notices.some((n) => n.kind === 'notify' && /aid package ends/i.test(n.payload.title)), 'and the end is announced as aid, not as a subsidy');
  ok(/patience with petitions/.test(aid.aidRequestGate(ctx, 'ISR', 'USA')), 'the window holds: the donor hears no new petition yet');
}

console.log('== the AI petitions ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  game.tags.JOR.treasury = 5;
  game.tags.JOR.points.infl = 25;
  aid.monthlyAid(ctx);
  const jor = (game.subsidies || []).find((s) => s && s.aid && s.to === 'JOR');
  ok(!!jor && jor.from === 'UK', 'a poor court petitions the friendliest donor: the Anglo-Jordanian subvention, emergent');
  ok(!(game.subsidies || []).some((s) => s && s.aid && s.to === 'SAU'), 'the friendless get nothing: no donor\'s regard reaches the bar for Riyadh');
  game.tags.ISR.treasury = 5;
  game.tags.ISR.points.infl = 25;
  game.tags.USA.opinion.ISR = 90;
  aid.monthlyAid(ctx);
  ok(!(game.subsidies || []).some((s) => s && s.aid && s.to === 'ISR'), 'the AI never petitions for the player — that chair asks for itself');
}

console.log('== the ancient chapters have no donors ==');
{
  const { game, ctx } = boot('167bce', 'HAS');
  ok(!aid.aidOn(ctx), '167 BCE names no donor courts');
  ok(aid.aidInfo(ctx, 'HAS', 'SEL') === null, 'no court offers the petition');
  ok(/no donor courts to petition/.test(aid.aidRequestGate(ctx, 'HAS', 'SEL')), 'and the gate answers for the age');
  const before = JSON.stringify(game.subsidies || []);
  aid.monthlyAid(ctx);
  ok(JSON.stringify(game.subsidies || []) === before, 'the monthly pass is a no-op outside the declaring chapter');
}

console.log('== the save contract ==');
{
  const { game, ctx } = boot('1948ce', 'ISR');
  game.tags.USA.opinion.ISR = 60;
  game.tags.ISR.points.infl = 25;
  aid.requestAidCore(ctx, 'ISR', 'USA');
  const saved = JSON.parse(JSON.stringify(game));
  const revived = reviveGame(saved);
  const row = (revived.subsidies || []).find((s) => s && s.aid);
  ok(!!row && row.from === 'USA' && row.to === 'ISR' && row.amount === 15, 'a live package rides the save intact, marker and all');
  const old = JSON.parse(JSON.stringify(game));
  delete old.diploCooldowns;
  const revivedOld = reviveGame(old);
  ok(revivedOld && Array.isArray(revivedOld.subsidies), 'a pre-§186 save revives without a crash');
}

console.log(failures ? `smoke118: ${failures} FAILURES` : 'smoke118: ALL PASS');
process.exit(failures ? 1 : 0);
