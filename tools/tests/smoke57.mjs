// Headless regression — supply lines & AI naval invasions (SPEC §82).
//  Supply (66 CE, real geometry):
//   1. An army in controlled home territory traces 'home'; a host deep in
//      enemy country is out of supply with the corridor break named.
//   2. Penalties bind: no reinforcements, quartered morale recovery,
//      mounting attrition (worse than a supplied twin on the same ground).
//   3. The sea leg: a friendly coastal pocket is 'noFleet' without a warship,
//      'port' with one, and 'blockade' the day a hostile squadron anchors
//      off the harbor — even though the army still controls its province.
//   4. Rebels are exempt; oosMonths survives save/revive.
//  Invasion (167 BCE, real geometry): Rome at war with the Seleucids across
//  neutral Greek land it cannot march through —
//   5. The AI recognizes the enemy is unreachable overland and opens an
//      operation: a staging port, a coastal beachhead, an army reserved.
//   6. No free transports: no Roman fleet exists until hulls finish the
//      6-month yard queue; the armada then sails (troops genuinely aboard)
//      and lands on the Seleucid coast.
import { readFileSync } from 'node:fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, reviveGame } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const mil = await import(R + '/js/sim/military.js');
const sup = await import(R + '/js/sim/supply.js');
const inv = await import(R + '/js/sim/invasion.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const rawGeom = {
  neighbors: snap.neighbors.map((a) => new Set(a)),
  centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  coastal: snap.coastal.map(Boolean),
  offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  areas: Int32Array.from(snap.areas),
  bbox: [],
};
// The same per-bookmark collapse computeGeometry performs from the raster.
function foldGeom(raw, mapping) {
  const N = raw.neighbors.length - 1;
  const to = (id) => (mapping && mapping[id]) || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  const areas = new Int32Array(N + 1);
  const coastal = new Array(N + 1).fill(false);
  const centroids = raw.centroids.slice();
  const offshore = raw.offshore.slice();
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    areas[t] += raw.areas[id];
    if (raw.coastal[id]) coastal[t] = true;
    if (!offshore[t] && raw.offshore[id]) offshore[t] = raw.offshore[id];
    for (const nb of raw.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  for (let id = 1; id <= N; id++) {
    if (to(id) !== id) { centroids[id] = centroids[to(id)]; offshore[id] = offshore[to(id)]; }
  }
  return { neighbors, centroids, areas, coastal, offshore, bbox: [] };
}

function boot(bookmark, playerTag, seed, notices) {
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const geom = foldGeom(rawGeom, provinceMap);
  const bus = {
    emit(kind, payload) { if (kind === 'notify' && notices) notices.push(payload); },
    on() { return () => {}; },
  };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: [], playerTag, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: [], provinceMap });
  return { game, ctx, geom, bus, provinceMap };
}
const tickMonths = (ctx, months) => { for (let i = 0; i < months * DEFINES.DAYS_PER_MONTH; i++) tickDay(ctx); };

console.log('== supply: home territory feeds, a cut corridor starves ==');
{
  const notices = [];
  const { game, ctx } = boot(BOOKMARK_66, 'JUD', 5701, notices);
  for (const t of Object.values(game.tags)) t.ai = false; // hand-driven world
  const jerId = ctx.provId('Jerusalem');
  const homeArmy = game.armies[ctx.helpers.spawnArmy(ctx, 'JUD', 'Jerusalem', { inf: 3, name: 'Home Host' })];
  const farArmy = game.armies[ctx.helpers.spawnArmy(ctx, 'JUD', 'Damascus', { inf: 3, name: 'Far Host' })];
  const homeTrace = sup.traceSupply(ctx, homeArmy);
  ok(homeTrace.ok && homeTrace.via === 'home' && homeTrace.route[0] === jerId,
    'an army on its own controlled soil is in supply via home territory');
  const farTrace = sup.traceSupply(ctx, farArmy);
  ok(!farTrace.ok && farTrace.reason === 'corridor' && farTrace.breakAt > 0,
    'a host deep in enemy country is out of supply, with the break point named');
  ok(farTrace.route.length > 1 && farTrace.route.indexOf(farTrace.breakAt) > 0,
    'the broken trace still returns the corridor it WOULD use (for the map)');

  sup.monthlySupply(ctx);
  ok(farArmy.oosMonths === 1 && homeArmy.oosMonths === 0,
    'monthlySupply marks the cut-off host and leaves the home host alone');
  ok(notices.some((n) => n && n.title === 'Out of supply'),
    'the player is told the month the line is cut');

  // penalties: reinforcement, morale, attrition — measured against the twin
  game.tags.JUD.manpower = 10000;
  homeArmy.men = 1500; farArmy.men = 1500;
  mil.monthlyReinforce(ctx);
  ok(homeArmy.men > 1500 && farArmy.men === 1500,
    'no reinforcements reach an out-of-supply army; the supplied twin refills');
  homeArmy.morale = 1.0; farArmy.morale = 1.0;
  mil.monthlyMoraleRecovery(ctx);
  ok(homeArmy.morale - 1.0 > (farArmy.morale - 1.0) * 3 && farArmy.morale > 1.0,
    'out of supply, morale mends at roughly a quarter pace');
  const beforeHome = homeArmy.men, beforeFar = farArmy.men;
  mil.monthlyAttrition(ctx);
  const homeLossPct = (beforeHome - homeArmy.men) / beforeHome;
  const farLossPct = (beforeFar - farArmy.men) / beforeFar;
  ok(farLossPct > homeLossPct && farLossPct >= 0.03,
    'a cut-off host takes real extra attrition (' + Math.round(farLossPct * 100) + '%/mo)');

  // isolation bites harder with time: the breaking point caps morale
  farArmy.oosMonths = DEFINES.SUPPLY.weakenAtMonths;
  farArmy.morale = 3.0;
  mil.monthlyMoraleRecovery(ctx);
  ok(farArmy.morale <= farArmy.maxMorale * DEFINES.SUPPLY.weakMoraleCap + 1e-9,
    'months of isolation cap morale at half — the host is breaking');

  // rebels live off the land by design
  const reb = game.armies[ctx.helpers.spawnArmy(ctx, 'REB', 'Damascus', { inf: 1 })];
  sup.monthlySupply(ctx);
  ok(reb.oosMonths === 0 && reb.supplyVia === 'exempt', 'rebel bands are exempt from the supply contract');

  // the state survives the chronicle
  const revived = reviveGame(JSON.parse(JSON.stringify(game)));
  ok(revived.armies[farArmy.id].oosMonths === farArmy.oosMonths,
    'oosMonths survives save/revive');
}

console.log('== supply: the sea lane — port, fleet, and the blockade that cuts it ==');
{
  const { game, ctx, geom } = boot(BOOKMARK_66, 'JUD', 5702, []);
  for (const t of Object.values(game.tags)) t.ai = false;
  // a coastal pocket genuinely behind the lines: ROM coast with no
  // JUD-controlled neighbor (Ptolemais touches Galilee and traces home by land)
  let ptoId = 0;
  for (let i = 1; i < game.provinces.length && !ptoId; i++) {
    const p = game.provinces[i];
    if (!p || p.impassable || p.owner !== 'ROM' || !geom.coastal[i]) continue;
    const nbs = [...(geom.neighbors[i] || [])];
    if (nbs.every((nb) => {
      const q = ctx.byId(nb);
      return !q || q.controller !== 'JUD';
    })) ptoId = i;
  }
  ok(ptoId > 0, 'found an isolated enemy coastal province for the pocket (' + (ctx.byId(ptoId) || {}).name + ')');
  const pto = ctx.byId(ptoId);
  mil.changeControllerCore(ctx, pto, 'JUD'); // ours now — but surrounded
  const pocket = game.armies[ctx.helpers.spawnArmy(ctx, 'JUD', pto.name, { inf: 2, name: 'Pocket Host' })];
  let trace = sup.traceSupply(ctx, pocket);
  ok(!trace.ok && trace.reason === 'noFleet',
    'a friendly port with no warship afloat cannot feed the pocket (the lane needs a fleet)');
  const fleet = ctx.helpers.spawnFleet(ctx, 'JUD', 'Joppa', 2, { name: 'Revolt Squadron' });
  trace = sup.traceSupply(ctx, pocket);
  ok(trace.ok && trace.via === 'port' && trace.homePort === ctx.provId('Joppa'),
    'with a fleet afloat and an open home harbor, the pocket is supplied by sea');
  // a hostile squadron anchors off the pocket's harbor: the army still
  // CONTROLS its landing province — and starves anyway (the request's case)
  ctx.helpers.spawnFleet(ctx, 'ROM', pto.name, 3, { name: 'Classis Syriaca' });
  trace = sup.traceSupply(ctx, pocket);
  ok(!trace.ok && trace.reason === 'blockade' && trace.breakAt === ptoId,
    'a hostile blockade cuts overseas supply even while the army controls its province');
  ok(fleet.ships === 2, 'the friendly fleet itself is untouched by the trace (no side effects)');
}

console.log('== invasion: Rome cannot march east — so it builds, sails, and lands ==');
{
  const notices = [];
  const { game, ctx } = boot(BOOKMARK_167, 'HAS', 5703, notices);
  for (const t of Object.values(game.tags)) t.ai = false;
  game.tags.ROM.ai = true; // only Rome thinks this test
  // the Senate means it: a war chest, drilled manpower, and two working yards
  mil.declareWar(ctx, 'ROM', 'SEL', 'The Syrian War');
  game.tags.ROM.treasury = 2000;
  game.tags.ROM.manpower = 20000;
  const roma = ctx.prov('Roma');
  const syracusae = game.provinces.find((p) => p && p.owner === 'ROM' && p.id !== roma.id
    && ctx.geom.coastal[p.id]);
  roma.buildings.push('shipyard');
  if (syracusae) syracusae.buildings.push('shipyard');
  ctx.helpers.spawnArmy(ctx, 'ROM', 'Roma', { inf: 4, name: 'Legio Expeditionaria' });

  ok(!inv.enemyReachableOverland(ctx, 'ROM', 'SEL'),
    'the Seleucids are genuinely unreachable overland (neutral Hellas bars the road)');
  ok(Object.values(game.fleets).every((f) => !f || f.tag !== 'ROM'),
    'Rome starts with no fleet — nothing to teleport with');

  tickMonths(ctx, 1);
  const op = game.tags.ROM.aiState.navalOp;
  ok(!!op && op.kind === 'invasion' && op.stage === 'muster' && op.enemy === 'SEL',
    'the AI opens a deliberate operation against the unreachable enemy');
  const portP = op && ctx.byId(op.port);
  const targetP = op && ctx.byId(op.target);
  ok(!!portP && portP.owner === 'ROM' && ctx.geom.coastal[op.port],
    'the staging port is a friendly harbor (' + (portP && portP.name) + ')');
  ok(!!targetP && targetP.controller === 'SEL' && ctx.geom.coastal[op.target],
    'the chosen beachhead is a Seleucid coastal province (' + (targetP && targetP.name) + ')');
  ok((targetP.fort | 0) === 0, 'the beachhead favors low fortifications');
  ok(Object.values(game.fleets).every((f) => !f || f.tag !== 'ROM'),
    'month one: still no Roman fleet — hulls must be laid down and built');
  tickMonths(ctx, 1); // the muster's first working month lays the keels
  const queuedShips = game.provinces.reduce((n, p) => n
    + ((p && p.unitQueue) || []).filter((o) => o && o.tag === 'ROM' && o.type === 'ship').length, 0);
  ok(queuedShips >= 1, 'the yards are laying down real hulls (' + queuedShips + ' building)');

  // sail with time: track that the troops genuinely ride the hulls
  let sawFleet = false, sawAboard = false, landedMonth = 0;
  for (let m = 3; m <= 48 && !landedMonth; m++) {
    tickMonths(ctx, 1);
    if (Object.values(game.fleets).some((f) => f && f.tag === 'ROM' && f.ships > 0)) sawFleet = true;
    if (Object.values(game.armies).some((a) => a && a.tag === 'ROM' && a.aboard)) sawAboard = true;
    const ashore = Object.values(game.armies).find((a) => a && a.tag === 'ROM' && !a.aboard
      && ctx.byId(a.prov) && ctx.geom.coastal[a.prov]
      && (ctx.byId(a.prov).owner === 'SEL'));
    if (ashore) landedMonth = m;
  }
  ok(sawFleet, 'a Roman fleet was built the honest way (6-month hulls, paid in talents)');
  ok(sawAboard, 'the legion genuinely embarked — no teleport across the water');
  ok(landedMonth > 6, 'the landing waited for the shipbuilding (' + landedMonth + ' months in)');
  ok(landedMonth > 0, 'the invasion force is ashore on the Seleucid coast');

  // the beachhead becomes a supplied lodgement once its port falls
  if (landedMonth) {
    let supplied = false, capturedName = '';
    for (let m = 0; m < 12 && !supplied; m++) {
      tickMonths(ctx, 1);
      const ashore = Object.values(game.armies).filter((a) => a && a.tag === 'ROM' && !a.aboard
        && ctx.byId(a.prov) && ctx.byId(a.prov).owner === 'SEL');
      for (const a of ashore) {
        const p = ctx.byId(a.prov);
        if (p.controller === 'ROM') {
          const tr = sup.traceSupply(ctx, a);
          if (tr.ok && tr.via === 'port') { supplied = true; capturedName = p.name; }
        }
      }
    }
    ok(supplied, 'the captured beachhead (' + capturedName + ') traces supply home across the sea');
  }
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
