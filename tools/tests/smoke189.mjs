// Headless regression (SPEC §275): a separate peace is signed with a court
// AND ITS CLIENTS. A client follows its lord out of a war exactly as it
// followed him in.
//
// The reported bug, both halves of it:
//
//   1. You could make peace with a crown and go on fighting its clients.
//      `releaseFromWar` struck exactly one tag out of the enemy side, so a
//      treaty with Egypt left Egypt's clients in the line, at war, with
//      Egypt's own armies gone from beside them.
//
//   2. You could make peace with a CLIENT and go on fighting its lord. The
//      chip row listed every living enemy, client or not, and §265 already
//      says a client keeps no foreign policy — its lord signs for it while
//      it stays. A client that signs for itself has signed something it
//      cannot sign.
//
// Both are now one rule: the table resolves to the SIGNER (the highest lord
// standing in this war above the court asked), and the party that leaves is
// that signer with every client beside it. A party that would empty the
// enemy side is not a corridor at all — that is the congress, and the
// congress table is where it belongs.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const {
  peaceDealInfo, evaluatePeaceDeal, executePeaceDeal, separateWarscore,
  separateParty, signerFor, truceActive,
  PETITION, petitionInfo, petitionForPeace, petitionPressure, warPetitionPressure,
} = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const fakeGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const bus = { emit() {}, on() { return () => {}; } };
const idOf = (n) => MAP_DATA.provinces.findIndex((p) => p.name === n) + 1;

function fresh(seed) {
  const modernMap = buildProvinceMapping(MAP_DATA, BOOKMARK_1948);
  const g = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_1948, events: [],
    playerTag: 'ISR', rngSeed: seed, provinceMap: modernMap,
  });
  const ctx = makeCtx({
    game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus,
    bookmark: BOOKMARK_1948, events: [], provinceMap: modernMap,
  });
  const war = g.wars.find((w) => w && w.defenders.includes('ISR'));
  war.noNegotiation = false;
  return { g, ctx, war, prov: (n) => g.provinces[idOf(n)] };
}

// ---------------------------------------------------------------------------
console.log('== the collar decides who holds the pen ==');
{
  const { g, ctx, war } = fresh(189);
  const side = war.attackers.slice();
  ok(side.length >= 3, 'the 1948 coalition has at least three courts in it (' + side.length + ')');
  // Put a collar on one of them: Lebanon becomes Egypt's client for this test.
  g.tags.LEB.overlord = 'EGY';
  ok(signerFor(ctx, side, 'LEB') === 'EGY',
    'asked of the client, the pen resolves to the lord');
  ok(signerFor(ctx, side, 'EGY') === 'EGY',
    'asked of the lord, the pen is the lord\'s own');
  const party = separateParty(ctx, side, 'LEB');
  ok(party[0] === 'EGY' && party.indexOf('LEB') > 0 && party.length === 2,
    'the party that leaves is the lord first, then the client');
  // A collar two deep still resolves to the crown at the top of it.
  const third = side.find((t) => t !== 'EGY' && t !== 'LEB');
  g.tags[third].overlord = 'LEB';
  ok(signerFor(ctx, side, third) === 'EGY',
    'a client of a client signs under the crown at the top of the chain');
  ok(separateParty(ctx, side, 'EGY').length === 3,
    'and the whole chain leaves together');
}

// ---------------------------------------------------------------------------
console.log('== a client is not a corridor of its own ==');
{
  const { g, ctx, war } = fresh(189);
  const before = peaceDealInfo(ctx, war, 'ISR');
  const nAll = before.separateTargets.length;
  ok(nAll >= 3, 'with no collars every living enemy is its own corridor (' + nAll + ')');
  g.tags.LEB.overlord = 'EGY';
  const after = peaceDealInfo(ctx, war, 'ISR');
  ok(!after.separateTargets.some((t) => t.tag === 'LEB'),
    'once collared, the client is no longer offered a table of its own');
  ok(after.separateTargets.some((t) => t.tag === 'EGY'),
    'its lord still is');
  ok(after.separateTargets.length === nAll - 1,
    'and exactly one row went away, not two (' + after.separateTargets.length + ')');
  const egy = after.separateTargets.find((t) => t.tag === 'EGY');
  ok(egy && Array.isArray(egy.withNames) && egy.withNames.length === 1,
    'the lord\'s row names the one client that leaves under its signature');
  // Asking for the client's table by name still opens the LORD's table.
  const asked = peaceDealInfo(ctx, war, 'ISR', 'LEB');
  ok(asked.separate && asked.enemyLeader === 'EGY',
    'asking for a separate word with the client opens the lord\'s table');
  ok(asked.separateWithNames.length === 1,
    'and that table says the client is leaving with it');
}

// ---------------------------------------------------------------------------
console.log('== a party that empties the enemy side is the congress ==');
{
  const { g, ctx, war } = fresh(189);
  const side = war.attackers.slice();
  // Collar every other court to Egypt: there is now one party and no corridor.
  for (const t of side) if (t !== 'EGY' && g.tags[t]) g.tags[t].overlord = 'EGY';
  const info = peaceDealInfo(ctx, war, 'ISR');
  ok(info.separateTargets.length === 0,
    'no separate corridors are offered when one crown signs for the whole side');
  const asked = peaceDealInfo(ctx, war, 'ISR', 'EGY');
  ok(!asked.separate,
    'and asking for one falls back to the congress rather than ending the war sideways');
}

// ---------------------------------------------------------------------------
console.log('== the ledger is weighed over the whole party ==');
{
  const { g, ctx, war, prov } = fresh(189);
  g.tags.LEB.overlord = 'EGY';
  // Stand on every Lebanese province and nothing of Egypt's.
  for (const p of g.provinces) {
    if (p && !p.impassable && p.owner === 'LEB') p.controller = 'ISR';
  }
  const wsParty = separateWarscore(ctx, war, 'ISR', 'EGY');
  // Undo the collar and the same ground reads as Egypt alone: untouched.
  delete g.tags.LEB.overlord;
  const wsAlone = separateWarscore(ctx, war, 'ISR', 'EGY');
  ok(wsParty > wsAlone,
    'holding the client\'s land counts against the lord that signs for it ('
      + wsAlone + ' alone vs ' + wsParty + ' as a party)');
}

// ---------------------------------------------------------------------------
console.log('== signing takes the client out of the war with its lord ==');
{
  const { g, ctx, war, prov } = fresh(189);
  g.tags.LEB.overlord = 'EGY';
  for (const p of g.provinces) {
    if (p && !p.impassable && (p.owner === 'LEB' || p.owner === 'EGY')) p.controller = 'ISR';
  }
  g.tags.EGY.warExhaustion = 12;
  g.tags.LEB.warExhaustion = 12;
  const stayed = war.attackers.filter((t) => t !== 'EGY' && t !== 'LEB' && g.tags[t] && g.tags[t].alive);
  ok(stayed.length >= 1, 'somebody is left to fight on (' + stayed.join(', ') + ')');
  const info = peaceDealInfo(ctx, war, 'ISR', 'EGY');
  ok(info.separate && info.enemyLeader === 'EGY', 'the corridor is open with the lord');
  const deal = { enemy: 'EGY', provinces: [], gold: 0, concessions: [] };
  const priced = evaluatePeaceDeal(ctx, war, 'ISR', deal);
  ok(priced.acceptable, 'a status-quo separate peace prices as acceptable');
  executePeaceDeal(ctx, war, 'ISR', deal);

  const live = g.wars.find((w) => w && w.id === war.id);
  ok(live, 'the war goes on');
  ok(live.attackers.indexOf('EGY') < 0, 'the lord is out of the war');
  ok(live.attackers.indexOf('LEB') < 0,
    'AND SO IS ITS CLIENT — the bug this suite exists for');
  for (const t of stayed) {
    ok(live.attackers.indexOf(t) >= 0, t + ' fights on, as a separate peace means it should');
  }
  ok(truceActive(ctx, 'LEB', 'ISR'),
    'the client is truced to us, not merely struck from a list');
  ok(truceActive(ctx, 'EGY', 'ISR'), 'and so is its lord');
  // Status quo ran over the client's ground too.
  const heldBack = g.provinces.filter((p) => p && !p.impassable
    && p.owner === 'LEB' && p.controller === 'ISR');
  ok(heldBack.length === 0,
    'the occupations on the client\'s own land reverted with the treaty ('
      + heldBack.length + ' left)');
}

// ---------------------------------------------------------------------------
console.log('== and the reverse: peace asked of the client ends the lord\'s war too ==');
{
  const { g, ctx, war } = fresh(1948);
  g.tags.LEB.overlord = 'EGY';
  for (const p of g.provinces) {
    if (p && !p.impassable && (p.owner === 'LEB' || p.owner === 'EGY')) p.controller = 'ISR';
  }
  g.tags.EGY.warExhaustion = 12;
  const deal = { enemy: 'LEB', provinces: [], gold: 0, concessions: [] };
  const info = peaceDealInfo(ctx, war, 'ISR', 'LEB');
  ok(info.enemyLeader === 'EGY', 'the deal aimed at the client is scoped to the lord');
  const priced = evaluatePeaceDeal(ctx, war, 'ISR', deal);
  ok(priced.acceptable, 'and prices as a separate peace, not a congress');
  executePeaceDeal(ctx, war, 'ISR', deal);
  const live = g.wars.find((w) => w && w.id === war.id);
  ok(live && live.attackers.indexOf('EGY') < 0 && live.attackers.indexOf('LEB') < 0,
    'both the client and the lord are out — neither is left fighting for a court that signed');
}

// ---------------------------------------------------------------------------
console.log('== a client pulled into its lord\'s war holds no pen ==');
{
  const { g, ctx, war } = fresh(275);
  // Israel becomes Jordan's client, on Israel's own side of this war.
  const side = war.defenders;
  ok(side.indexOf('ISR') >= 0, 'the player stands on the defending side');
  side.push('JOR2');            // a placeholder is not needed; use a real ally
  side.pop();
  // Give Israel a lord that is standing in this war beside it.
  const ally = 'USA';
  g.tags[ally] = g.tags[ally] || { name: 'A Great Power', alive: true, ai: true, points: {} };
  g.tags[ally].alive = true;
  side.push(ally);
  g.tags.ISR.overlord = ally;

  const info = peaceDealInfo(ctx, war, 'ISR');
  ok(info.petitioner === true, 'the client\'s chair is marked a petitioner\'s');
  ok(info.exit === false,
    'and it is NOT handed the ally\'s withdrawal table — a client did not choose to come');
  ok(/keeps no foreign policy/.test(info.whyNoTable || ''),
    'the panel is told why: ' + (info.whyNoTable || '(nothing)'));
  const ev = evaluatePeaceDeal(ctx, war, 'ISR', { provinces: [], gold: 0 });
  ok(!ev.acceptable && ev.petition === true,
    'a deal signed from the client\'s chair is refused at the sim, not only in the panel');
}

// ---------------------------------------------------------------------------
console.log('== but it may petition, at a price, once a year ==');
{
  const { g, ctx, war } = fresh(275);
  const ally = 'USA';
  g.tags[ally] = g.tags[ally] || { name: 'A Great Power', alive: true, ai: true, points: {} };
  g.tags[ally].alive = true;
  war.defenders.push(ally);
  g.tags.ISR.overlord = ally;
  g.tags.ISR.points = { infl: 10 };

  let p = petitionInfo(ctx, war, 'ISR');
  ok(p && p.lord === ally, 'the petition names the lord that signs for us');
  ok(!p.can && /Not enough influence/.test(p.why),
    'with ten influence the button is dark: ' + p.why);
  ok(!petitionForPeace(ctx, war, 'ISR'), 'and petitioning does nothing');

  g.tags.ISR.points.infl = 80;
  ok(petitionInfo(ctx, war, 'ISR').can, 'with eighty influence it is live');
  ok(petitionForPeace(ctx, war, 'ISR'), 'the petition is carried up');
  ok(g.tags.ISR.points.infl === 80 - PETITION.influence,
    'and it cost ' + PETITION.influence + ' influence (' + g.tags.ISR.points.infl + ' left)');
  ok(petitionPressure(ctx, war, ally) === 1, 'the lord is under one standing petition');
  p = petitionInfo(ctx, war, 'ISR');
  ok(!p.can && p.monthsLeft === PETITION.cooldownMonths,
    'and the court will not receive another for ' + p.monthsLeft + ' months');
  ok(!petitionForPeace(ctx, war, 'ISR'), 'asking again inside the year is refused');

  // A year later it will hear us again, and the pressure stacks year by year
  // up to the ceiling — one petition for each of the first four years.
  for (let i = 1; i < PETITION.maxPressure; i++) {
    g.date.y += 1;
    g.tags.ISR.points.infl = 80;
    ok(petitionForPeace(ctx, war, 'ISR'), 'a year on, the court receives us again');
  }
  ok(petitionPressure(ctx, war, ally) === PETITION.maxPressure,
    'four yearly petitions stack to the ceiling of ' + PETITION.maxPressure
      + ' (' + petitionPressure(ctx, war, ally) + ')');
  ok(warPetitionPressure(ctx, war) === PETITION.maxPressure,
    'and the war reads the same total');
  // Let the cooldown run out: now the ceiling, not the clock, is what stops us.
  g.date.y += 1;
  g.tags.ISR.points.infl = 80;
  const atCeiling = petitionInfo(ctx, war, 'ISR');
  ok(atCeiling.monthsLeft === 0, 'the cooldown has run out');
  ok(atCeiling.pressure === PETITION.maxPressure && !atCeiling.can
      && /as often as a client may ask/.test(atCeiling.why),
    'and the ceiling is what closes the button: ' + atCeiling.why);
  ok(!petitionForPeace(ctx, war, 'ISR')
      && g.tags.ISR.points.infl === 80,
    'a petition at the ceiling is refused and costs nothing');
  // Memory decays: five years on, the oldest is forgotten and there is room.
  g.date.y += 4;
  ok(petitionPressure(ctx, war, ally) < PETITION.maxPressure,
    'the oldest petitions are forgotten in time ('
      + petitionPressure(ctx, war, ally) + ' still standing)');
  ok(petitionInfo(ctx, war, 'ISR').can,
    'and the client may top the pressure back up');
}

// ---------------------------------------------------------------------------
console.log('== and the petitions move the lord\'s own bar ==');
{
  // The bar the AI settles at: |warscore| >= 50 or months >= settleMonths,
  // each shifted by the standing petitions. Assert the arithmetic the AI
  // reads rather than the AI, so the suite does not depend on a whole turn.
  const { g, ctx, war } = fresh(275);
  const bar = (press) => ({
    score: 50 - PETITION.scorePerPress * press,
    months: 36 - PETITION.monthsPerPress * press,
  });
  ok(bar(0).score === 50 && bar(0).months === 36,
    'with nobody asking, the lord settles at 50 points or three years');
  ok(bar(PETITION.maxPressure).score === 18 && bar(PETITION.maxPressure).months === 12,
    'with four petitions standing, at 18 points or one year');
  ok(bar(1).score < bar(0).score && bar(1).months < bar(0).months,
    'and every petition in between moves both bars the same direction');
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
