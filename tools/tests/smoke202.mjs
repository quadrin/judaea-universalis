// Headless regression — SPEC §292: markets, merchants and the lanes.
//
//   1. The graph of every age: every node is run once, upstream first; no
//      lane runs back up; every road ends at the age's end (Tyre, Rome,
//      Byzantion, Suez), and each chapter knows its age.
//   2. Every province of the map is in one market, and every market town is
//      in its own market, also where a chapter folds the map (1948).
//   3. Nothing is made and nothing lost: in every node, what is collected,
//      steered and stolen is the node's value; what a node takes in is what
//      the nodes upstream send it; at the end of the roads everything is
//      collected; the courts' income is the sum of what they collect and steal.
//   4. Who collects: a court in its home node; the holder of a market town
//      (not while it is besieged); a court with a merchant collecting. Every
//      other share is steered, toward home if home is downstream.
//   5. A merchant steering a lane sends its court's share down that lane and
//      adds to what flows along it.
//   6. The ledger shows Trade (and Tolls) and the economy pays them.
//   7. A save keeps its merchants.
//   8. The AI plays: a year and a half of 66 CE with every court an AI
//      leaves merchants built, posted on valid orders, under every cap.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const { TRADE_NODES, TRADE_NODE_BY_ID, tradeGraph, tradeAgeOf } = await import(R + '/js/data/trade_nodes.js');
const trade = await import(R + '/js/sim/trade.js');
const { tradeIncome, tollIncome, explainIncome } = await import(R + '/js/sim/economy.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};
const num = (v) => Number(v) || 0;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
function geomFor(provinceMap) {
  const N = snap.neighbors.length - 1;
  const to = (id) => (provinceMap && provinceMap[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  const coastal = new Array(N + 1).fill(false);
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    if (snap.coastal[id]) coastal[t] = true;
    for (const nb of snap.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  return {
    neighbors, coastal,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
}
const era = (id) => ERAS.find((e) => e.bookmark.id === id);
function boot(id, tag, seed = 292) {
  const e = era(id);
  const provinceMap = buildProvinceMapping(MAP_DATA, e.bookmark);
  const geom = geomFor(provinceMap);
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: e.bookmark, events: e.events, playerTag: tag, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: e.bookmark, events: e.events, provinceMap });
  return { game, ctx, actions: gameActions(ctx) };
}

console.log('== 1. the graph of every age ==');
{
  const ends = { tyre: ['tyre'], rome: ['rome'], byzantion: ['byzantion'], suez: ['egypt'] };
  for (const age of Object.keys(ends)) {
    const G = tradeGraph(age);
    const pos = new Map(G.order.map((id, i) => [id, i]));
    ok(G.order.length === TRADE_NODES.length && pos.size === TRADE_NODES.length, age + ': every node is run once');
    const back = [];
    for (const id of G.order) for (const t of G.to[id]) if (!(pos.get(t) > pos.get(id))) back.push(id + '→' + t);
    ok(back.length === 0, age + ': every lane runs downstream' + (back.length ? ' — ' + back.join(', ') : ''));
    ok(JSON.stringify(G.sinks) === JSON.stringify(ends[age]), age + ': the roads end at ' + G.sinks.join(', '));
    const stranded = G.order.filter((id) => !ends[age].includes(id) && !ends[age].some((s) => G.reach[id].has(s)));
    ok(stranded.length === 0, age + ': every road reaches the end' + (stranded.length ? ' — not ' + stranded.join(', ') : ''));
  }
  ok(tradeAgeOf('931bce') === 'tyre' && tradeAgeOf('66ce') === 'rome' && tradeAgeOf('529ce') === 'byzantion'
    && tradeAgeOf('1948ce') === 'suez', 'Solomon trades toward Tyre, the Revolt toward Rome, Justinian toward Byzantion, 1948 toward Suez');
  const unknown = ERAS.filter((e) => !['tyre', 'rome', 'byzantion', 'suez'].includes(tradeAgeOf(e.bookmark.id)));
  ok(unknown.length === 0, 'every chapter has an age (' + ERAS.length + ' chapters)');
}

console.log('== 2. every province is in one market ==');
{
  const w = boot('66ce', 'JUD');
  const counts = {};
  const loose = [];
  for (let i = 1; i <= MAP_DATA.provinces.length; i++) {
    const id = trade.nodeOfProv(w.ctx, i);
    if (!id || !TRADE_NODE_BY_ID[id]) loose.push(MAP_DATA.provinces[i - 1].name);
    else counts[id] = (counts[id] || 0) + 1;
  }
  ok(loose.length === 0, 'all ' + MAP_DATA.provinces.length + ' provinces belong to a market' + (loose.length ? ' — not ' + loose.slice(0, 5).join(', ') : ''));
  const empty = TRADE_NODES.filter((n) => !counts[n.id]);
  ok(empty.length === 0, 'and every market has provinces' + (empty.length ? ' — not ' + empty.map((n) => n.id).join(', ') : ''));
  const off = TRADE_NODES.filter((n) => trade.nodeOfProv(w.ctx, trade.nodeCenterId(w.ctx, n.id)) !== n.id);
  ok(off.length === 0, 'every market town is in its own market' + (off.length ? ' — not ' + off.map((n) => n.center).join(', ') : ''));
  // 1948 folds the far countries into one province each (SPEC §232): Gades
  // is Spain, and Spain is the town of its market; Merv is in the Soviet
  // Union, a province of the Pontic market, so the steppe has no town.
  const m = boot('1948ce', 'ISR');
  const towns = TRADE_NODES.map((n) => [n.id, trade.nodeCenterId(m.ctx, n.id)]);
  const wrong = towns.filter(([id, c]) => c && trade.nodeOfProv(m.ctx, c) !== id);
  ok(wrong.length === 0, 'in 1948 every market town is in its own market' + (wrong.length ? ' — not ' + wrong.map((r) => r[0]).join(', ') : ''));
  ok((m.ctx.byId(trade.nodeCenterId(m.ctx, 'hispania')) || {}).name === 'Spain', 'Spain is the town of the Hispanic market');
  ok(trade.nodeCenterId(m.ctx, 'transoxiana') === 0, 'the steppe market has no town in 1948');
  ok(TRADE_NODES.filter((n) => !trade.nodeCenterId(m.ctx, n.id)).length <= 2, 'and no more than two markets lose theirs: '
    + TRADE_NODES.filter((n) => !trade.nodeCenterId(m.ctx, n.id)).map((n) => n.id).join(', '));
}

function conservation(label, ctx) {
  const res = trade.computeTrade(ctx);
  const bad = [];
  const incoming = {};
  let collectedAll = 0;
  for (const id of res.graph.order) {
    const N = res.nodes[id];
    if (!near(N.incoming, num(incoming[id]))) bad.push(id + ' takes in ' + N.incoming.toFixed(3) + ' of ' + num(incoming[id]).toFixed(3));
    let split = 0;
    for (const k in N.collected) { split += N.collected[k]; collectedAll += N.collected[k]; }
    for (const k in N.steer) split += N.steer[k].amount;
    for (const k in N.stolen) { split += N.stolen[k]; collectedAll += N.stolen[k]; }
    if (N.totalPower > 0 && !near(split, N.value)) bad.push(id + ' splits ' + split.toFixed(3) + ' of ' + N.value.toFixed(3));
    if (!res.graph.to[id].length && Object.keys(N.steer).length) bad.push(id + ' is the end and still steers');
    for (const t in N.out) incoming[t] = num(incoming[t]) + N.out[t];
  }
  let income = 0;
  for (const k in res.income) income += res.income[k];
  ok(bad.length === 0, label + ': every node splits its value exactly, and takes in what upstream sends' + (bad.length ? ' — ' + bad.slice(0, 4).join('; ') : ''));
  ok(near(income, collectedAll), label + ': the courts earn what is collected and stolen, ' + income.toFixed(1) + ' a month');
  return res;
}

console.log('== 3. nothing made, nothing lost ==');
{
  for (const id of ['931bce', '66ce', '529ce', '1948ce']) {
    const e = era(id);
    const w = boot(id, (e.bookmark.factions || [])[0] || 'JUD');
    conservation(id, w.ctx);
  }
}

console.log('== 4. who collects, who steers ==');
{
  const w = boot('66ce', 'JUD');
  const { ctx, game } = w;
  let res = trade.computeTrade(ctx);
  // In 66 CE Rome's capital in this world is Antioch, the seat of the war.
  const romHome = trade.homeNodeOf(ctx, 'ROM');
  ok(romHome === 'antioch' && res.nodes.antioch.collect.ROM > 0, 'Rome collects in its home market, ' + romHome);
  ok(res.nodes.rome.collect.ROM > 0 && !res.nodes.rome.steer.ROM, 'and at Rome, where the roads end, everyone collects');
  ok(trade.homeNodeOf(ctx, 'JUD') === 'judaea' && res.nodes.judaea.collect.JUD != null, 'Judaea collects in its own, Joppa');
  const alex = ctx.byId(trade.nodeCenterId(ctx, 'egypt'));
  ok(res.customs.egypt === alex.owner && res.nodes.egypt.collect[alex.owner] != null,
    'the holder of Alexandria (' + alex.owner + ') collects there: the customs house is his');
  alex.siege = { by: 'JUD', progress: 0 };
  trade.touchTrade(game);
  res = trade.computeTrade(ctx);
  ok(!res.customs.egypt && res.nodes.egypt.collect[alex.owner] == null, 'not while Alexandria is besieged');
  delete alex.siege;
  trade.touchTrade(game);
  res = trade.computeTrade(ctx);
  // a court with power where it neither lives, nor holds the town, nor posts a merchant
  const strays = [];
  for (const id of res.graph.order) {
    const N = res.nodes[id];
    for (const k in N.power) {
      if (!res.graph.to[id].length || trade.homeNodeOf(ctx, k) === id || res.customs[id] === k) continue;
      if ((N.merchants[k] || []).some((m) => m.order === 'collect')) continue;
      const s = N.steer[k];
      const home = trade.homeNodeOf(ctx, k);
      const wantLane = home && res.graph.to[id].find((t) => t === home || res.graph.reach[t].has(home));
      if (N.collect[k] != null || !s || (wantLane && s.to !== wantLane)) strays.push(k + '@' + id);
    }
  }
  ok(strays.length === 0, 'every other share is steered, home where home is downstream' + (strays.length ? ' — not ' + strays.slice(0, 5).join(', ') : ''));
  conservation('66 CE, after the siege', ctx);
}

console.log('== 5. a merchant steers a lane ==');
{
  const w = boot('66ce', 'JUD');
  const { ctx, game } = w;
  const G = trade.graphOf(ctx);
  ok(JSON.stringify(G.to.tyre) === JSON.stringify(['egypt', 'aegean']), 'Tyre\'s lanes run to Alexandria and the Aegean');
  const before = trade.computeTrade(ctx).nodes.tyre;
  const outE0 = num(before.out.egypt);
  game.merchants.push({ id: game.nextMerchantId++, tag: 'JUD', kind: 'ship', home: ctx.provId('Joppa'), at: trade.nodeCenterId(ctx, 'tyre'),
    state: 'posted', node: 'tyre', order: 'steer', steerTo: 'egypt' });
  trade.touchTrade(game);
  const N = trade.computeTrade(ctx).nodes.tyre;
  ok(N.steer.JUD && N.steer.JUD.to === 'egypt' && N.power.JUD >= trade.TRADE.merchantPower, 'Judaea\'s merchant steers its share at Tyre toward Alexandria');
  ok(N.out.egypt > outE0, 'more flows down the lane to Alexandria: ' + outE0.toFixed(2) + ' → ' + N.out.egypt.toFixed(2));
  let steered = 0;
  for (const k in N.steer) if (N.steer[k].to === 'egypt') steered += N.steer[k].amount;
  ok(near(N.out.egypt, steered * (1 + trade.TRADE.steerBonusEach)), 'and the lane carries a steering bonus of ' + trade.TRADE.steerBonusEach * 100 + '%');
  conservation('66 CE, steered', ctx);
}

console.log('== 6. the ledger ==');
{
  const w = boot('66ce', 'JUD');
  const { ctx } = w;
  const rows = explainIncome(ctx, 'ROM');
  const tr = rows.find((r) => r.label === 'Trade');
  ok(!!tr && tr.value > 0, 'Rome\'s ledger has a Trade line: ' + (tr && tr.value));
  const total = trade.tradeIncomeOf(ctx, 'ROM') + tollIncome(ctx, 'ROM');
  ok(near(tradeIncome(ctx, 'ROM'), total, 0.01), 'and trade income is the markets plus the tolls: ' + total.toFixed(2));
  const view = w.actions.getTrade();
  ok(view && view.home === 'judaea' && view.nodes.length === TRADE_NODES.length && view.cap >= 2, 'the Trade tab sees every market from Jerusalem');
}

console.log('== 7. a save keeps its merchants ==');
{
  const w = boot('66ce', 'JUD');
  const { ctx, game } = w;
  game.tags.JUD.treasury = 500;
  const site = trade.buildSites(ctx, 'JUD').find((s) => s.can);
  ok(!!site && w.actions.buildMerchant(site.prov, site.kind), 'Judaea fits out a ' + (site && site.kind) + ' at ' + (site && site.name));
  const m = game.merchants[game.merchants.length - 1];
  ok(w.actions.sendMerchant(m.id, 'judaea', 'collect'), 'and sends it to collect at Joppa');
  const revived = reviveGame(JSON.parse(JSON.stringify(game)));
  const r = revived.merchants.find((x) => x.id === m.id);
  ok(!!r && r.tag === 'JUD' && r.node === 'judaea' && r.order === 'collect' && r.state === m.state && revived.nextMerchantId === game.nextMerchantId,
    'the saved game has the merchant, its post and its order');
}

console.log('== 8. the AI plays ==');
{
  const w = boot('66ce', 'JUD', 2921);
  const { ctx, game } = w;
  for (const t of Object.values(game.tags)) t.ai = true;
  game.paused = false;
  const t0 = Date.now();
  for (let d = 0; d < 540; d++) tickDay(ctx);
  const ms = game.merchants;
  const tags = new Set(ms.map((m) => m.tag));
  ok(game.date.y === 67 && game.date.m >= 9, 'the clock ran to ' + game.date.m + '/' + game.date.y + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
  ok(ms.length >= 3 && tags.size >= 2, ms.length + ' merchants of ' + tags.size + ' courts after a year and a half');
  const posted = ms.filter((m) => m.state === 'posted');
  ok(posted.length > 0 && posted.every((m) => TRADE_NODE_BY_ID[m.node] && (m.order === 'collect' || (m.order === 'steer' && trade.graphOf(ctx).to[m.node].includes(m.steerTo)))),
    posted.length + ' posted, every one on a valid order');
  const over = [...tags].filter((t) => trade.merchantsOf(ctx, t).length > trade.merchantCap(ctx, t));
  ok(over.length === 0, 'no court keeps more than its cap' + (over.length ? ' — ' + over.join(', ') : ''));
  const missions = Object.values(game.fleets || {}).filter((f) => f && f.mission);
  ok(missions.every((f) => TRADE_NODE_BY_ID[f.mission.node] && (f.mission.kind === 'protect' || f.mission.kind === 'raid')),
    missions.length + ' squadrons on trade missions, every one valid');
  conservation('66 CE after 18 months', ctx);
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
