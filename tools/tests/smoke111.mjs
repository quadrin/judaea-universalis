// Headless smoke test §177: the mission tree and the dressed technology rows.
// The chains grew branches (requires/col per mission), the record moved to
// t.missionsDone with t.missionIdx pinned to the longest completed prefix,
// and techInfo carries what the panel's EU4 dress needs — points on hand,
// monthly gain, months to affordability, the institutions surcharge, the
// pattern milestones. This suite pins the arithmetic and the compatibility
// contract: ladders behave exactly as before, and a hand-moved missionIdx
// (an old save, a forcing test) still means "the first N are done".
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { GENERIC_EVENTS } = await import(R + '/js/data/events_generic.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const realm = await import(R + '/js/sim/realm.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const geom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1),
  bbox: [],
};
function boot(playerTag, seed) {
  const events = EVENTS_66.concat(GENERIC_EVENTS);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events, playerTag, rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events });
  return { game, ctx, actions: gameActions(ctx) };
}
// The §207 drumbeat: one completion a pass, then the chain rests. Where this
// suite means "let the months go by until the pass has paid", it pumps —
// each call is one synthetic month.
const pump = (c, n) => { for (let i = 0; i < n; i++) realm.checkMissions(c); };
const PACE = DEFINES.MISSION_PACE_MONTHS | 0;

console.log('== the tree view: layout, statuses, prerequisites ==');
const { game, ctx, actions } = boot('JUD', 42);
{
  const v = actions.getMissions();
  ok(v.length === 21, 'twenty-one nodes (six objectives + the §179 curriculum + the §192/§197 expansion + the §183/§192 roads not taken): ' + v.length);
  // Only the chain's own root is workable among the era's objectives; the
  // §183 hypotheticals are standing invitations, so their roots open too.
  ok(v[0].status === 'current' && v.slice(1, 16).every((m) => m.status === 'locked'),
    'only the root is workable among the objectives at start: ' + v.map((m) => m.status).join(','));
  ok(v[16].hypothetical && v[16].status === 'current'
    && v[17].status === 'locked' && v[18].status === 'locked'
    && v[19].status === 'current' && v[20].status === 'current',
    'the hypothetical roots stand open (the §192 forks are roots too), the children wait: '
    + v.slice(16).map((m) => m.id + '=' + m.status).join(','));
  ok(v.slice(0, 16).every((m) => !m.hypothetical) && v.slice(16).every((m) => m.hypothetical),
    'the roads not taken are flagged hypothetical, the objectives are not');
  ok(v[0].requires.length === 0 && v[1].requires.join(',') === 'jm_arm_the_nation',
    'requires resolved to ids');
  ok(v[1].requiresNames.join(',') === 'Arm the Nation', 'and to names for the tooltip');
  ok(v.map((m) => m.col).join(',') === '1,0,1,2,1,0,3,2,0,2,1,0,2,1,2,0,4,4,4,4,4', 'cols: ' + v.map((m) => m.col).join(','));
  ok(v.map((m) => m.row).join(',') === '0,1,1,1,2,2,2,2,3,3,4,4,4,5,5,5,0,1,2,3,4',
    'rows derived one below the deepest parent (declared rows stick): ' + v.map((m) => m.row).join(','));
  ok(v.every((m) => m.icon), 'every node wears an icon');
}

console.log('== branches advance independently; the prefix does not lie ==');
{
  for (let i = 0; i < 31; i++) tickDay(ctx);
  ok(actions.getMissions()[0].status === 'done', 'the root completes on the monthly pass');
  const open = actions.getMissions().filter((m) => m.status === 'current').map((m) => m.id);
  ok(open.join(',') === 'jm_throw_back,jm_coastal_road,jm_diaspora,hy_house_stands,hy_royal_robes,hy_granaries',
    'three branches open at once (plus the standing hypotheticals): ' + open.join(','));
  // Complete a LATER branch first: the Parthian mission, by opinion. The
  // root's completion above left the chain resting (§207), so wait it out.
  game.tags.PAR.opinion = game.tags.PAR.opinion || {};
  game.tags.PAR.opinion.JUD = 90;
  pump(ctx, PACE + 1);
  const st = Object.fromEntries(actions.getMissions().map((m) => [m.id, m.status]));
  ok(st.jm_diaspora === 'done', 'a later branch completed early');
  ok(st.jm_samaria === 'locked', 'while its neighbour still waits on the coast');
  ok(game.tags.JUD.missionIdx === 1,
    'missionIdx stays the DONE PREFIX, not the count: ' + game.tags.JUD.missionIdx);
  ok((game.tags.JUD.missionsDone || []).join(',') === 'jm_arm_the_nation,jm_diaspora',
    'missionsDone in table order: ' + game.tags.JUD.missionsDone);
}

console.log('== the ladder contract: ROM reads exactly as it always did ==');
{
  const t = game.tags.ROM;
  const list = realm.missionsFor(ctx, 'ROM');
  ok(!realm.isMissionTree(list), 'Vespasian\'s chain is still a ladder');
  // A hand-moved missionIdx means "the first N are done" — the old meaning.
  t.missionIdx = 3;
  const done = realm.missionDoneSet(t, list);
  ok(done.size === 3 && done.has('rm_secure_coast') && done.has('rm_ring_closes'),
    'a forced missionIdx seeds the first N as done');
  ok(realm.missionUnlocked(list, 3, done, false) && !realm.missionUnlocked(list, 4, done, false),
    'and exactly the next rung is workable');
  t.missionIdx = 0;
}

console.log('== the tree survives a save ==');
{
  const raw = JSON.parse(JSON.stringify(game));
  const revived = reviveGame(raw);
  ok((revived.tags.JUD.missionsDone || []).join(',') === 'jm_arm_the_nation,jm_diaspora',
    'missionsDone rides the save');
  const ctx2 = makeCtx({ game: revived, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: EVENTS_66.concat(GENERIC_EVENTS) });
  const v2 = gameActions(ctx2).getMissions();
  const st2 = Object.fromEntries(v2.map((m) => [m.id, m.status]));
  ok(st2.jm_diaspora === 'done' && st2.jm_throw_back === 'current' && st2.jm_samaria === 'locked',
    'and the revived tree reads the same');
  // A ladder-era save: no done list, only the cursor.
  delete revived.tags.JUD.missionsDone;
  revived.tags.JUD.missionIdx = 2;
  const v3 = gameActions(ctx2).getMissions();
  ok(v3[0].status === 'done' && v3[1].status === 'done' && v3[2].status === 'current',
    'a ladder-era save seeds the first missionIdx as done: ' + v3.map((m) => m.status).join(','));
}

console.log('== techInfo wears the panel\'s numbers ==');
{
  const info = actions.getTech();
  ok(info.rows.length === 3, 'three ladders');
  ok(info.rows.every((r) => Number.isFinite(r.have) && r.gain >= 2 && Number.isFinite(r.etaMonths)),
    'have / gain / etaMonths on every row');
  ok(info.rows.every((r) => typeof r.nowText === 'string' && r.nowText.length > 0),
    'each ladder owns up to what it already pays');
  ok(/income/.test(info.rows[0].nowText) && /trade/.test(info.rows[1].nowText)
    && /army/.test(info.rows[2].nowText), 'in the right vocabulary');
  ok(Number.isFinite(info.instPct), 'the institutions surcharge is a top-level number: ' + info.instPct + '%');
  ok(Array.isArray(info.milestones) && info.milestones.length === 5, 'five pattern milestones');
  ok(info.milestones.filter((ms) => ms.reached).map((ms) => ms.at).join(',') === '4',
    'JUD (mar 5) has reached the level-4 pattern and no further');
  ok(info.milestones.every((ms) => !ms.beyond || ms.at > info.ceiling),
    'beyond-flags respect the age\'s ceiling (' + info.ceiling + ')');
  ok(info.milestones.some((ms) => ms.doctrine), 'the doctrines ride their milestones');
  // The gain arithmetic is the tick's own: base 2 + ruler skill + advisor.
  const r = game.tags.JUD.ruler;
  const govGain = 2 + Math.max(0, Math.min(6, r.gov))
    + (game.tags.JUD.advisors && game.tags.JUD.advisors.gov ? Math.max(0, Math.min(3, game.tags.JUD.advisors.gov.skill || 1)) : 0);
  ok(info.rows[0].gain === govGain, 'the monthly gain matches the tick: +' + info.rows[0].gain);
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
