// Headless regression — SPEC §76: liberation is broader than restoration,
// and client bonds can change hands at the peace table.
//
//  1. A living non-belligerent may receive its old homeland back; the land
//     need not have been conquered during this war or even be occupied.
//  2. Enemy territory with no surviving historical claimant can become a
//     deterministic new cultural state, save-safe and independent.
//  3. A direct enemy client may be transferred intact: land, armies and court
//     survive while tribute and war duty pass to the victor.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const bus = { emit() {}, on() { return () => {}; } };
function boot(seed) {
  const geom = {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
  };
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: [],
    playerTag: 'JUD', rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus,
    bookmark: BOOKMARK_66, events: [], provinceMap,
  });
  const war = game.wars.find((w) => {
    const all = w.attackers.concat(w.defenders);
    return all.includes('JUD') && all.includes('ROM');
  });
  war.warscore.JUD = 100;
  war.warscore.ROM = -100;
  return { game, ctx, war };
}

console.log('== a living court may receive old land that was never occupied ==');
{
  const { game, ctx, war } = boot(76);
  const home = game.provinces.find((p) => p && !p.impassable
    && mil.eraOwnerOf(ctx, p) === 'NAB');
  ok(!!home && game.tags.NAB.alive, 'Nabataea is alive, neutral, and has an era-start homeland');
  mil.changeOwnerCore(ctx, home, 'ROM');
  mil.changeControllerCore(ctx, home, 'ROM'); // no occupation: a political term, not a battlefield cession
  const ruler = game.tags.NAB.ruler && game.tags.NAB.ruler.name;
  const armies = mil.armiesOf(ctx, 'NAB').length;
  const rows = mil.releasableNations(ctx, war, 'JUD', 'ROM');
  const ret = rows.find((r) => r.tag === 'NAB');
  ok(!!ret && ret.kind === 'return' && ret.provIds.includes(home.id),
    'the table offers to return the living court\'s homeland');
  const ev = mil.evaluatePeaceDeal(ctx, war, 'JUD', { release: ['NAB'] });
  ok(ev.acceptable, 'the return is priced and accepted without occupation: ' + ev.reason);
  mil.executePeaceDeal(ctx, war, 'JUD', { release: ['NAB'] });
  ok(home.owner === 'NAB' && home.controller === 'NAB',
    'the unoccupied province returns to Nabataea');
  ok(game.tags.NAB.alive && game.tags.NAB.ruler.name === ruler
    && mil.armiesOf(ctx, 'NAB').length === armies,
  'a living recipient keeps its court and existing host — it is not rebooted as a restoration');
}

console.log('== a genuinely new cultural state can be made from enemy territory ==');
{
  const { game, ctx, war } = boot(77);
  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  const created = (info.releasable || []).filter((r) => r.kind === 'create');
  ok(created.length > 0,
    'the table finds cultural states even where no bookmark-opening court was conquered');
  let row = null;
  let ev = null;
  for (const candidate of created.slice().sort((a, b) => a.dev - b.dev)) {
    const tested = mil.evaluatePeaceDeal(ctx, war, 'JUD', { release: [candidate.tag] });
    if (tested.acceptable) { row = candidate; ev = tested; break; }
  }
  ok(!!row && !!ev, 'at least one new-state package fits the treaty budget');
  const beforeAggression = game.tags.JUD.aggression;
  const releasedIds = row ? row.provIds.slice() : [];
  mil.executePeaceDeal(ctx, war, 'JUD', { release: row ? [row.tag] : [] });
  const state = row && game.tags[row.tag];
  ok(!!state && state.alive && !state.overlord && !!state.releaseIdentity,
    'a deterministic live court is created for the new state');
  ok(releasedIds.length > 0 && releasedIds.every((id) => game.provinces[id].owner === row.tag),
    'the cultural homeland belongs to the new state');
  ok(state && state.ruler && state.tech && mil.armiesOf(ctx, row.tag).length === 1,
    'the new court has a government, era technology and a defensive host');
  ok(game.tags.JUD.aggression === beforeAggression,
    'creating a free state earns no conquest infamy');
  ok(mil.truceActive(ctx, row.tag, 'ROM'),
    'the new state is sheltered from its former ruler by a five-year truce');
}

console.log('== an enemy client can be transferred intact ==');
{
  const { game, ctx, war } = boot(78);
  ok(game.tags.AGR.overlord === 'ROM', 'Agrippa opens as Rome\'s client');
  const ownerBefore = game.provinces.filter(Boolean).filter((p) => p.owner === 'AGR').map((p) => p.id);
  const rulerBefore = game.tags.AGR.ruler && game.tags.AGR.ruler.name;
  const armiesBefore = mil.armiesOf(ctx, 'AGR').map((a) => a.id);
  const info = mil.peaceDealInfo(ctx, war, 'JUD');
  const row = (info.transferableVassals || []).find((r) => r.tag === 'AGR');
  ok(!!row && row.from === 'ROM' && row.cost >= 15,
    'Rome\'s direct client appears with a development-priced transfer cost');
  const ev = mil.evaluatePeaceDeal(ctx, war, 'JUD', { transferVassals: ['AGR'] });
  ok(ev.acceptable && ev.transferVassals.includes('AGR'),
    'the transfer clears at +100 war score');
  mil.executePeaceDeal(ctx, war, 'JUD', { transferVassals: ['AGR'] });
  ok(game.tags.AGR.overlord === 'JUD',
    'Agrippa now owes tribute and war duty to Judaea');
  ok(ownerBefore.every((id) => game.provinces[id].owner === 'AGR')
    && game.tags.AGR.ruler.name === rulerBefore
    && armiesBefore.every((id) => !!game.armies[id]),
  'the client keeps every province, its ruler and its armies');
  ok(!mil.truceActive(ctx, 'AGR', 'JUD') && mil.truceActive(ctx, 'AGR', 'ROM'),
    'there is no nonsensical lord-client truce; the old lord is truce-bound');
  ok((game.chronicle || []).some((c) => /passes from the protection of Rome to Judaea/.test(c.text)),
    'the chronicle records the transferred bond');
}

console.log('== hierarchy terms belong to the full congress ==');
{
  const { game, ctx, war } = boot(79);
  // Add a second enemy so a genuine separate table exists.
  if (!war.attackers.includes('PAR') && !war.defenders.includes('PAR')) {
    const side = war.attackers.includes('ROM') ? war.attackers : war.defenders;
    side.push('PAR');
    war.warscore.PAR = -100;
  }
  const sep = mil.peaceDealInfo(ctx, war, 'JUD', 'PAR');
  ok(sep.separate && sep.releasable.length === 0 && sep.transferableVassals.length === 0,
    'a separate peace may neither create states nor trade another sovereign\'s clients');
  const stripped = mil.evaluatePeaceDeal(ctx, war, 'JUD', {
    subjugate: true, transferVassals: ['AGR'],
  });
  ok(stripped.subjugate && stripped.transferVassals.length === 0,
    'subjugating the enemy leader supersedes client transfers');
}

console.log(failures ? 'FAILURES: ' + failures : 'ALL PASS');
process.exit(failures ? 1 : 0);
