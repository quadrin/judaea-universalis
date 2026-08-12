// Headless regression — SPEC §197: the estates can be asked.
//
// §167 gave every party ground and spent all of it on pressure; this suite
// holds the other half of the bargain. Favor is a BANK beside the approval
// mood: it seeds, fills by warmth band at pinned rates, drains under
// hostility, heals into old saves, and is inherited through `succeeds` like
// the mood is. Spending it on an ask pays EXACTLY what the tooltip promised
// (one payoff object serves both), scaled by the party's share of the
// realm's ground — the §167 number the estates mapmode paints — which is
// asserted here the only honest way: hand the crown the coast and watch the
// moneyed party's subscription grow. The gates live in one place; the AI
// keeps its politics offstage; §34's demand/appease machinery is untouched
// beside all of it (smoke18 stays green on the same court).
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const fac = await import(R + '/js/sim/factions.js');
const est = await import(R + '/js/sim/estates.js');
const { ESTATE_ASKS, ASK_FALLBACK, ASK_KINDS } = await import(R + '/js/data/estate_asks.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// ---------------------------------------------------------------------------
console.log('== the ask book is complete and well-formed ==');
{
  const badPairs = [];
  for (const [id, list] of Object.entries(ESTATE_ASKS)) {
    if (!Array.isArray(list) || list.length !== 2) { badPairs.push(id + ' is not a pair'); continue; }
    if (new Set(list.map((a) => a && a.kind)).size !== 2) badPairs.push(id + ' repeats a kind');
    for (const a of list) {
      if (!a || !ASK_KINDS[a.kind]) badPairs.push(id + ' names an unknown kind');
      else if (!a.name || !a.text) badPairs.push(id + ' is missing its words');
      else if (a.point && ['gov', 'infl', 'mar'].indexOf(a.point) < 0) badPairs.push(id + ' pays an unknown point');
    }
  }
  ok(!badPairs.length, Object.keys(ESTATE_ASKS).length + ' authored pairs, all valid'
    + (badPairs.length ? ' (' + badPairs.slice(0, 3).join('; ') + ')' : ''));
  ok(Array.isArray(ASK_FALLBACK) && ASK_FALLBACK.length === 2
    && ASK_FALLBACK.every((a) => a && ASK_KINDS[a.kind] && a.name && a.text),
    'and the fallback pair is a valid pair too');

  // Every party every bookmark seats has its OWN words — the fallback is for
  // chapters not yet written, not for the nine that are.
  const files = ['bookmark_167bce.js', 'bookmark_67bce.js', 'bookmark_40bce.js', 'bookmark_66ce.js',
    'bookmark_132ce.js', 'bookmark_351ce.js', 'bookmark_529ce.js', 'bookmark_614ce.js',
    'bookmark_1948.js'];
  const missing = new Set();
  for (const f of files) {
    const m = await import(R + '/js/data/' + f);
    const bm = Object.values(m).find((v) => v && v.factions);
    for (const list of Object.values((bm && bm.factions) || {})) {
      for (const d of list || []) if (d && d.id && !ESTATE_ASKS[d.id]) missing.add(d.id);
    }
  }
  ok(!missing.size, 'every seated party of all nine chapters is authored'
    + (missing.size ? ' (missing: ' + [...missing].join(', ') + ')' : ''));
}

// ---------------------------------------------------------------------------
console.log('== the bank seeds, fills by band, drains under hostility ==');
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
const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 77 });
const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
const actions = gameActions(ctx);
const t = game.tags.JUD;

fac.monthlyFactions(ctx);
ok(t.estateFavor && Object.keys(t.estateFavor).length === 3,
  'the favor table seeds beside the approval table');
ok(Math.abs(t.estateFavor.zealots - (fac.FAVOR.seed + fac.FAVOR.gainContent)) < 0.0001,
  'a content court opens at the seed and banks its first +0.15: ' + t.estateFavor.zealots.toFixed(2));

// The four other bands, each measured as one month's delta from a reset bank.
// (Approval drifts a hair inside the month; the band it lands in does not.)
const bandDelta = (app) => {
  t.factions.zealots = app;
  t.estateFavor.zealots = 50;
  game.pendingEvents.length = 0; // a despairing estate also sends its demand; not this suite's business
  fac.monthlyFactions(ctx);
  return t.estateFavor.zealots - 50;
};
ok(Math.abs(bandDelta(90) - fac.FAVOR.gainDevoted) < 0.0001, 'devoted banks +' + fac.FAVOR.gainDevoted + ' a month');
ok(Math.abs(bandDelta(70) - fac.FAVOR.gainLoyal) < 0.0001, 'loyal banks +' + fac.FAVOR.gainLoyal);
ok(Math.abs(bandDelta(30) - fac.FAVOR.gainDiscontent) < 0.0001, 'discontent drains ' + fac.FAVOR.gainDiscontent);
ok(Math.abs(bandDelta(10) - fac.FAVOR.gainHostile) < 0.0001, 'hostile drains ' + fac.FAVOR.gainHostile);

// An old save has factions but no favor: it wakes at the seed, not at zero.
delete t.estateFavor;
fac.ensureFactions(ctx, 'JUD');
ok(t.estateFavor && t.estateFavor.zealots === fac.FAVOR.seed,
  'a pre-§197 save heals to the seed on the next court session');
const json = JSON.parse(JSON.stringify(game.tags.JUD));
ok(json.estateFavor && json.estateFavor.zealots === fac.FAVOR.seed,
  'and the bank is plain data — it rides a save round-trip untouched');

// ---------------------------------------------------------------------------
console.log('== the panel row carries the map\'s arithmetic ==');
{
  t.factions.zealots = 50; // the band tests above left them hostile; this section is about the bank
  game.pendingEvents.length = 0;
  const rows = actions.getFactions();
  ok(rows.every((r) => Number.isFinite(r.favor) && Number.isFinite(r.favorGain) && Array.isArray(r.asks) && r.asks.length === 2),
    'every row carries favor, its monthly gain, and two asks');
  ok(rows.every((r) => Number.isFinite(r.influencePct) && r.influencePct >= 0 && r.influencePct <= 100),
    'every row carries its share of the realm\'s ground: '
    + rows.map((r) => r.id + ' ' + r.influencePct + '%').join(', '));
  const sum = rows.reduce((a, r) => a + r.influencePct, 0);
  ok(Math.abs(sum - 100) <= 2, 'the shares are shares — they sum to ~100: ' + sum);
  ok(rows.every((r) => r.ground && r.ground.names.length > 0 && r.ground.count <= r.ground.total),
    'every row names the provinces where the party is strongest');
  ok(rows.every((r) => r.asks.every((a) => a.name && a.text && a.grants && Number.isFinite(a.favorCost))),
    'every ask states its words, its price and what it would grant');
  ok(rows.every((r) => r.asks.every((a) => !a.ready && /favor/i.test(a.whyNot))),
    'at the opening bank of 10, every ask is priced out and says so');
}

// ---------------------------------------------------------------------------
console.log('== the ask spends its price and pays its promise ==');
{
  t.factions.zealots = 85;
  t.estateFavor.zealots = 100;
  const scale = est.influenceScale(ctx, 'JUD', 'zealots');
  ok(Math.abs(scale - 1) > 0.01, 'the zealots do not hold an even share, so the scale is live: ' + scale.toFixed(3));

  // zeal: a timed modifier, promised and paid at 1 + 0.06 × scale.
  const row = actions.getFactions().find((r) => r.id === 'zealots');
  const zeal = row.asks.find((a) => a.key === 'zeal');
  ok(zeal && zeal.ready, 'with 100 banked and the court devoted, the ask is ready');
  const res = fac.askEstateCore(ctx, 'JUD', 'zealots', 'zeal');
  ok(res.ok && res.granted === zeal.grants, 'the toast repeats the tooltip verbatim: ' + res.granted);
  ok(Math.abs(t.estateFavor.zealots - (100 - ASK_KINDS.zeal.favor)) < 0.0001,
    'the price was exactly ' + ASK_KINDS.zeal.favor + ' favor');
  let mods = (t.modifiers || []).filter((m) => m && m.id === 'ask_zealots_zeal');
  ok(mods.length === 1 && Math.abs(mods[0].effects.moraleMult - (1 + ASK_KINDS.zeal.moraleMult * scale)) < 0.0001,
    'the modifier is the authored magnitude times the party\'s ground: ×' + mods[0].effects.moraleMult.toFixed(4));
  mods[0].months = 3; // run the clock down, then ask again
  const res2 = fac.askEstateCore(ctx, 'JUD', 'zealots', 'zeal');
  mods = (t.modifiers || []).filter((m) => m && m.id === 'ask_zealots_zeal');
  ok(res2.ok && mods.length === 1 && mods[0].months === ASK_KINDS.zeal.months,
    'asking again refreshes the one slot rather than stacking a second');

  // men: instant manpower, clamped to the ceiling.
  t.estateFavor.zealots = 100;
  t.manpower = 1000;
  const menRow = actions.getFactions().find((r) => r.id === 'zealots').asks.find((a) => a.key === 'men');
  const expectMen = Math.max(ASK_KINDS.men.floor, Math.round(t.maxManpower * ASK_KINDS.men.share * scale));
  ok(menRow.grants.indexOf(expectMen.toLocaleString('en-US')) >= 0,
    'the men ask promises the ground-scaled levy: ' + menRow.grants);
  const before = t.manpower;
  const res3 = fac.askEstateCore(ctx, 'JUD', 'zealots', 'men');
  ok(res3.ok && t.manpower - before === expectMen, 'and pays exactly that: +' + (t.manpower - before));

  // coin: months of the cached ledger income, floored for the destitute.
  t.factions.notables = 85;
  t.estateFavor.notables = 100;
  t.income = 0;
  let coinRow = actions.getFactions().find((r) => r.id === 'notables').asks.find((a) => a.key === 'coin');
  ok(coinRow.grants.indexOf('+' + ASK_KINDS.coin.floor + ' talents') >= 0,
    'a destitute ledger still pays the floor: ' + coinRow.grants);
  t.income = 40;
  const nScale = est.influenceScale(ctx, 'JUD', 'notables');
  const expectCoin = Math.max(ASK_KINDS.coin.floor, Math.round(40 * ASK_KINDS.coin.incomeMonths * nScale));
  coinRow = actions.getFactions().find((r) => r.id === 'notables').asks.find((a) => a.key === 'coin');
  ok(coinRow.grants.indexOf('+' + expectCoin + ' talents') >= 0,
    'a working ledger promises months of income times their ground: ' + coinRow.grants);
  const purse = t.treasury;
  const nName = actions.getFactions().find((r) => r.id === 'notables').name;
  const res4 = fac.askEstateCore(ctx, 'JUD', 'notables', 'coin');
  ok(res4.ok && Math.round(t.treasury - purse) === expectCoin, 'and the treasury sees that exact figure');
  ok((game.chronicle || []).some((c) => c.kind === 'politics' && c.text.indexOf(nName) >= 0 && c.text.indexOf('+' + expectCoin) >= 0),
    'the chronicle records who granted what');
}

// ---------------------------------------------------------------------------
console.log('== what they can give follows the map ==');
{
  // Hand the crown the coast — the act §167 was built around — and the
  // moneyed party's ground share, and therefore its subscription, grows.
  const beforeRow = actions.getFactions().find((r) => r.id === 'notables');
  const beforePct = beforeRow.influencePct;
  const beforeCoin = Math.round(40 * ASK_KINDS.coin.incomeMonths * est.influenceScale(ctx, 'JUD', 'notables'));
  const taken = [];
  for (let i = 1; i < game.provinces.length && taken.length < 6; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'ROM' && p.terrain === 'coast') { p.owner = 'JUD'; taken.push(p.name); }
  }
  ok(taken.length >= 3, 'the crown takes the Greek coast: ' + taken.join(', '));
  const afterRow = actions.getFactions().find((r) => r.id === 'notables');
  const afterCoin = Math.round(40 * ASK_KINDS.coin.incomeMonths * est.influenceScale(ctx, 'JUD', 'notables'));
  ok(afterRow.influencePct > beforePct,
    'the moneyed party\'s share of the realm grows: ' + beforePct + '% → ' + afterRow.influencePct + '%');
  ok(afterCoin > beforeCoin,
    'and with it what its favor pays: ' + beforeCoin + ' → ' + afterCoin + ' talents');
  ok(afterRow.ground.count > 0 && afterRow.ground.names.length > 0,
    'the row names its new ground: ' + afterRow.ground.names.join(', '));
  for (const nm of taken) { // put the map back for the gates below
    const p = game.provinces.find((x) => x && x.name === nm);
    if (p) p.owner = 'ROM';
  }
}

// ---------------------------------------------------------------------------
console.log('== the gates hold, in one place ==');
{
  t.factions.priesthood = 85;
  t.estateFavor.priesthood = 5;
  let res = fac.askEstateCore(ctx, 'JUD', 'priesthood', 'blessing');
  ok(!res.ok && /favor/i.test(res.why), 'an empty bank refuses: ' + res.why);
  t.estateFavor.priesthood = 100;
  t.factions.priesthood = 35;
  res = fac.askEstateCore(ctx, 'JUD', 'priesthood', 'blessing');
  ok(!res.ok && /mood|approval/i.test(res.why), 'a despairing party will not hear an ask: ' + res.why);
  t.factions.priesthood = 85;
  t.legitimacy = 100;
  res = fac.askEstateCore(ctx, 'JUD', 'priesthood', 'blessing');
  ok(!res.ok, 'a blessing with nothing to bless refuses rather than wastes: ' + res.why);
  t.legitimacy = 60;
  t.factions.zealots = 85;
  t.estateFavor.zealots = 100;
  t.manpower = t.maxManpower;
  res = fac.askEstateCore(ctx, 'JUD', 'zealots', 'men');
  ok(!res.ok && /muster/i.test(res.why), 'a full muster refuses the levy: ' + res.why);
  res = fac.askEstateCore(ctx, 'JUD', 'zealots', 'nothing');
  ok(!res.ok, 'an unknown kind fails soft');
  res = fac.askEstateCore(ctx, 'JUD', 'nobody', 'coin');
  ok(!res.ok, 'an unseated party fails soft');
  const rowTip = actions.getFactions().find((r) => r.id === 'zealots').asks.find((a) => a.key === 'men');
  ok(!rowTip.ready && rowTip.whyNot === res.why || /muster/i.test(rowTip.whyNot),
    'the disabled tooltip gives the click path\'s own reason: ' + rowTip.whyNot);
}

// ---------------------------------------------------------------------------
console.log('== the AI keeps its politics offstage ==');
{
  const game2 = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66, playerTag: 'JUD', rngSeed: 78 });
  const ctx2 = makeCtx({ game: game2, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66 });
  game2.tags.JUD.ai = true;
  fac.monthlyFactions(ctx2);
  ok(!game2.tags.JUD.estateFavor, 'no favor table under an AI hand');
  const res = fac.askEstateCore(ctx2, 'JUD', 'zealots', 'men');
  ok(!res.ok, 'and no ask either: ' + res.why);
  ok(!(game2.tags.JUD.modifiers || []).some((m) => m && String(m.id).startsWith('ask_')),
    'no ask modifiers appear on the harness\'s stream');
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
