// Headless regression — SPEC §193: a scripted peace binds the courts that
// signed it. `helpers.endWar(a, b, …)` names two courts, and it used to
// dissolve the whole war standing around them — so Kavad II's white peace in
// 628 marched Judaea home from a war it had not lost and had not signed away.
// What this suite holds:
//   - the case that named the rule: Persia goes, Judaea keeps the war, the
//     truce is Persia's alone, and Judaea's own occupations are untouched;
//   - the remnant is a new war's worth: the great powers' battle ledger and
//     scripted swings go home with them, the fight-to-the-death oath lapses,
//     and the court that stayed holds the pen at the full table (not a
//     junior's withdrawal);
//   - the arithmetic: a court leaves when the settlement has emptied the far
//     side of its enemies — one court per call in the Rhodes-style loop, the
//     last call dissolving the war;
//   - a bilateral war still ends whole, truce and all;
//   - the sword still cuts, and cuts only between the two parties: a third
//     court's land is not annexed by somebody else's treaty;
//   - clients go home under their crown's banner (SPEC §74);
//   - the fallback: when neither signatory can leave, the whole war ends,
//     which is where the rule came in.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { EVENTS_614 } = await import(R + '/js/data/events_614ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const {
  warBetween, truceActive, sideLeaderOf, peaceDealInfo, evaluatePeaceDeal,
  changeControllerCore, declareWar,
} = await import(R + '/js/sim/military.js');
const EMPTY_DEAL = {
  provinces: [], gold: 0, humiliate: false, subjugate: false, reparations: false,
  release: [], transferVassals: [],
};

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geomFor = () => ({
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [],
  coastal: [false, ...MAP_DATA.provinces.map(() => true)], offshore: [],
});
function boot(bookmark, events, playerTag, seed) {
  const geom = geomFor();
  const notes = [];
  const bus = { emit(k, v) { if (k === 'notify') notes.push(v); }, on() { return () => {}; } };
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed, provinceMap,
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap });
  return { game, ctx, notes };
}
const idOf = (n) => MAP_DATA.provinces.findIndex((p) => p.name === n) + 1;
// The first province a court owns, skipping any the caller has already cast in
// another role — Jerusalem is province 1 and Byzantium's first holding, and a
// town cannot be both Persia's conquest and the Return's.
const firstOwned = (g, tag, skip) => {
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== tag) continue;
    if (skip && (skip === p.name || (Array.isArray(skip) && skip.includes(p.name)))) continue;
    return p;
  }
  return null;
};

console.log('== 628: Persia goes home and the Return keeps its war ==');
{
  const { game: g, ctx, notes } = boot(BOOKMARK_614, EVENTS_614, 'JUD', 6141);
  const war = warBetween(ctx, 'SAS', 'BYZ');
  ok(!!war && war.attackers.includes('JUD') && war.defenders.includes('BYZ'),
    'the bookmark seats the Return on Persia\'s side of the great war');

  // Three fronts stand when the King of Kings is murdered: Persia holds a
  // Roman town, Rome holds a Persian one, and the Return holds a third.
  const romanProv = firstOwned(g, 'BYZ', ['Jerusalem', 'Caesarea Maritima']);
  const persianProv = firstOwned(g, 'SAS');
  const judHeld = g.provinces[idOf('Caesarea Maritima')];
  changeControllerCore(ctx, romanProv, 'SAS');
  changeControllerCore(ctx, persianProv, 'BYZ');
  changeControllerCore(ctx, judHeld, 'JUD');
  const judHeldOwner = judHeld.owner;
  war._bs = { att: 9, def: 44 };
  war.eventScore = { att: 0, def: 30 };
  g.date = { y: 628, m: 2 };

  EVENTS_614.find((e) => e && e.id === 'ev_p_khosrow_falls').options[0].effects(ctx);

  const after = g.wars[0];
  ok(g.wars.length === 1 && after === war,
    'the war is not struck off the books: it goes on without Persia');
  ok(!after.attackers.includes('SAS') && after.attackers.includes('JUD'),
    'Persia leaves the attackers; the Return stands where it stood');
  ok(after.defenders.includes('BYZ'), 'Byzantium stays — it still faces the Return');
  ok(g.tags.JUD.atWarWith.includes('BYZ') && g.tags.BYZ.atWarWith.includes('JUD'),
    'the two courts still at war know it');
  ok(!g.tags.SAS.atWarWith.length, 'Persia is at war with nobody');
  ok(truceActive(ctx, 'SAS', 'BYZ') && !truceActive(ctx, 'JUD', 'BYZ'),
    'the five-year truce binds the signatories and nobody else');
  ok(romanProv.controller === romanProv.owner && persianProv.controller === persianProv.owner,
    'every occupation between Persia and Rome reverts at their table');
  ok(judHeld.controller === 'JUD' && judHeld.owner === judHeldOwner,
    'the Return keeps what its own men hold — that front was never theirs to settle');
  ok(notes.some((n) => n && n.title === 'The war goes on'
    && /free to fight on/.test(n.text || '')),
    'the player is told the war is still theirs, and still theirs to end');

  console.log('== what is left is not the great powers\' war ==');
  ok(after._bs.att === 0 && after._bs.def === 0,
    'the battle ledger of two empires goes home with them');
  ok(after.eventScore.att === 0 && after.eventScore.def === 0,
    'and so do the scripted swings');
  ok(after.noNegotiation === false && after._negOpened === true,
    'the fight-to-the-death oath was theirs to swear and theirs to break');
  ok(sideLeaderOf(ctx, after, after.attackers) === 'JUD',
    'the court that stayed inherits the pen');
  const info = peaceDealInfo(ctx, after, 'JUD');
  ok(info.exit === false && info.enemyLeader === 'BYZ',
    'and gets the full table against Byzantium, not a junior\'s withdrawal');
  // The inherited ledger was 44-9 against this side; what is left is the map.
  ok(Math.abs(info.myWs) <= 5,
    'scored on what the armies hold, not on Nineveh (' + info.myWs + ')');
  ok(evaluatePeaceDeal(ctx, after, 'JUD', EMPTY_DEAL).acceptable === true,
    'and a white peace of its own is on the table the same month: stay or go is ours to choose');
}

console.log('== a bilateral war still ends whole ==');
{
  const { game: g, ctx } = boot(BOOKMARK_614, EVENTS_614, 'JUD', 6142);
  // Clearing the stage now takes a settlement per pair — which is the rule
  // this suite exists for, so it is worth saying out loud.
  ctx.helpers.endWar(ctx, 'SAS', 'BYZ', null);
  ok(!!warBetween(ctx, 'JUD', 'BYZ'),
    'one call no longer empties the stage: the Return\'s war stands');
  ctx.helpers.endWar(ctx, 'JUD', 'BYZ', null);
  ok(!g.wars.length, 'the second settles what is left');
  g.tags.SAS.allies = [];
  g.tags.JUD.allies = [];
  g.truces = {};
  const war = declareWar(ctx, 'SAS', 'RSH', 'A Quarrel of Two');
  ok(!!war && war.attackers.length === 1 && war.defenders.length === 1,
    'a war of exactly two courts');
  ok(ctx.helpers.endWar(ctx, 'SAS', 'RSH', null) === true, 'the scripted peace settles it');
  ok(!g.wars.length, 'the war is dissolved — the pair was all of it');
  ok(truceActive(ctx, 'SAS', 'RSH'), 'and the truce is signed');
}

console.log('== Rhodes: one court per call, and the last call ends the war ==');
{
  const { game: g, ctx } = boot(BOOKMARK_1948, [], 'ISR', 1948);
  const war = g.wars.find((w) => w && w.defenders.includes('ISR'));
  war.noNegotiation = false;
  const coalition = war.attackers.filter((t) => g.tags[t] && g.tags[t].alive);
  ok(coalition.length >= 3, 'the coalition invades with ' + coalition.length + ' courts');

  // Egypt holds an Israeli town and Israel holds a Syrian one when the first
  // armistice is signed at Rhodes.
  const israeli = firstOwned(g, 'ISR');
  const syrianOwner = coalition.find((t) => t !== coalition[0] && firstOwned(g, t));
  const syrian = firstOwned(g, syrianOwner);
  changeControllerCore(ctx, israeli, coalition[0]);
  changeControllerCore(ctx, syrian, 'ISR');

  ctx.helpers.endWar(ctx, 'ISR', coalition[0], null);
  ok(g.wars.length === 1 && !war.attackers.includes(coalition[0]),
    'the first signatory leaves and the war goes on: '
      + war.attackers.length + ' courts still in the field');
  ok(israeli.controller === israeli.owner, 'its occupation reverts');
  ok(syrian.controller === 'ISR',
    'and the front with the courts that signed nothing keeps its lines');
  ok(truceActive(ctx, 'ISR', coalition[0]) && !truceActive(ctx, 'ISR', syrianOwner),
    'the truce binds the court that signed');

  for (const t of coalition.slice(1)) ctx.helpers.endWar(ctx, 'ISR', t, null);
  ok(!g.wars.length, 'the last armistice dissolves the war');
  ok(coalition.every((t) => truceActive(ctx, 'ISR', t)), 'every court is truced');
  ok(syrian.controller === syrian.owner, 'and the last table settles the last front');
}

console.log('== the sword cuts only between the two parties ==');
{
  const { game: g, ctx } = boot(BOOKMARK_614, EVENTS_614, 'JUD', 6143);
  const war = warBetween(ctx, 'SAS', 'BYZ');
  const key = war.attackers.includes('SAS') ? 'att' : 'def';
  const romanProv = firstOwned(g, 'BYZ', 'Jerusalem');
  const judPrize = g.provinces[idOf('Jerusalem')];
  changeControllerCore(ctx, romanProv, 'SAS');   // Persia's conquest
  changeControllerCore(ctx, judPrize, 'JUD');    // the Return's own
  const prizeOwner = judPrize.owner;
  ok(prizeOwner === 'BYZ', 'Jerusalem is still Roman on paper when the treaty is signed');

  ctx.helpers.endWar(ctx, 'SAS', 'BYZ', key);
  ok(romanProv.owner === 'SAS', 'Persia keeps what its own men hold — uti possidetis');
  ok(judPrize.owner === prizeOwner && judPrize.controller === 'JUD',
    'the Return\'s conquest is not annexed by somebody else\'s treaty');
  ok(!!warBetween(ctx, 'JUD', 'BYZ'), 'and the Return is still at war for it');
}

console.log('== a client goes home under its crown\'s banner ==');
{
  const { game: g, ctx } = boot(BOOKMARK_614, EVENTS_614, 'JUD', 6144);
  const war = warBetween(ctx, 'SAS', 'BYZ');
  ok(war.defenders.includes('GHA') && g.tags.GHA.overlord === 'BYZ',
    'the phylarchate answers the Empire, and is in its war');
  ctx.helpers.endWar(ctx, 'SAS', 'BYZ', null);
  ok(war.defenders.includes('BYZ') && war.defenders.includes('GHA'),
    'the Empire and its client both stay: the Return still faces them');
  ok(!war.attackers.includes('SAS'), 'and Persia alone goes home');
  ok(g.tags.JUD.atWarWith.includes('GHA'),
    'the client is still the Return\'s enemy');
}

console.log('== neither can leave: the whole war ends, as it always did ==');
{
  const { game: g, ctx } = boot(BOOKMARK_614, EVENTS_614, 'JUD', 6145);
  const war = warBetween(ctx, 'SAS', 'BYZ');
  // The Göktürks ride in on the Emperor's side: now Persia faces a court it
  // has not settled with, and so does Byzantium.
  war.defenders.push('TRK');
  war.warscore.TRK = 0;
  ok(g.tags.TRK && g.tags.TRK.alive && g.tags.TRK.overlord !== 'BYZ',
    'and they ride as nobody\'s client');
  ctx.helpers.endWar(ctx, 'SAS', 'BYZ', null);
  ok(!g.wars.length, 'the settlement it cannot separate is the whole war\'s');
  ok(truceActive(ctx, 'JUD', 'BYZ') && truceActive(ctx, 'SAS', 'TRK'),
    'and everyone in it is truced');
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
