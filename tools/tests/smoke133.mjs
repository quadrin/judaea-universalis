// Headless smoke test §206: the drumbeat of accomplishment.
//
// checkMissions used to run up to three completion WAVES a pass, so a
// prepared realm banked a whole branch in one morning and every chapter
// opened with a volley of medallions. §206 slows the drum: at most ONE
// mission completes per tag per monthly pass, and after each completion the
// chain rests MISSION_PACE_MONTHS (a bookmark may retune it with its own
// missionPaceMonths) before the next may land. This suite pins the contract:
// the first accomplishment is un-gated, ties go to table order, a month
// whose checks all fail charges no rest, the rest rides the save while a
// pre-§206 save owes none, pace 0 kills the rest but never the one-a-month
// rule, and a hand-moved missionIdx keeps its old meaning even mid-rest.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
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
function boot(bookmark, seed) {
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events: EVENTS_66, playerTag: 'JUD', rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events: EVENTS_66 });
  return { game, ctx, actions: gameActions(ctx) };
}
const doneList = (t) => (t.missionsDone || []).slice();
const PACE = DEFINES.MISSION_PACE_MONTHS | 0;

console.log('== the default pace is a real rest ==');
ok(PACE >= 1, 'MISSION_PACE_MONTHS is at least a month: ' + PACE);

// The root is satisfiable by the starting host (26k men over the 20k ask);
// forcing the coast and the diaspora arms both of its children too. Under
// the wave rule this exact world banked all three in ONE pass — the volley
// §206 exists to break up.
function forceBranches(w) {
  w.ctx.helpers.changeOwner(w.ctx, 'Caesarea Maritima', 'JUD');
  w.game.tags.PAR.opinion = { ...(w.game.tags.PAR.opinion || {}), JUD: 90 };
}

console.log('== one a month, first in table order, and the first is un-gated ==');
const { game, ctx, actions } = boot(BOOKMARK_66, 42);
{
  forceBranches({ game, ctx });
  realm.checkMissions(ctx);
  ok(doneList(game.tags.JUD).join(',') === 'jm_arm_the_nation',
    'one pass, one medallion — the boot volley is gone: ' + doneList(game.tags.JUD));
  ok((game.tags.JUD.missionRest | 0) === PACE,
    'and the chain rests the full pace: ' + game.tags.JUD.missionRest);
  const p = actions.getMissionPace();
  ok(p && p.rest === PACE && p.pace === PACE,
    'getMissionPace tells the panel: rest ' + (p && p.rest) + ' of ' + (p && p.pace));
}

console.log('== the rest holds, then the drum strikes — cadence pace+1 ==');
{
  for (let i = 0; i < PACE; i++) {
    realm.checkMissions(ctx);
    ok(doneList(game.tags.JUD).length === 1, 'resting month ' + (i + 1) + ': nothing lands');
  }
  realm.checkMissions(ctx);
  ok(doneList(game.tags.JUD).join(',') === 'jm_arm_the_nation,jm_coastal_road',
    'the next beat is the FIRST satisfied in table order (the coast, not the diaspora): '
    + doneList(game.tags.JUD));
  for (let i = 0; i < PACE; i++) realm.checkMissions(ctx);
  realm.checkMissions(ctx);
  ok(doneList(game.tags.JUD).length === 3 && doneList(game.tags.JUD)[2] === 'jm_diaspora',
    'and the diaspora lands one full beat later: ' + doneList(game.tags.JUD));
}

console.log('== the rest rides the save; a pre-§206 save owes none ==');
{
  // The third completion just set the rest; both facts must survive revival.
  const restNow = game.tags.JUD.missionRest | 0;
  ok(restNow === PACE, 'the chain is mid-rest before saving: ' + restNow);
  const revived = reviveGame(JSON.parse(JSON.stringify(game)));
  ok((revived.tags.JUD.missionRest | 0) === restNow, 'missionRest rides the save: ' + revived.tags.JUD.missionRest);
  const raw = JSON.parse(JSON.stringify(game));
  delete raw.tags.JUD.missionRest;
  const old = reviveGame(raw);
  ok(old.tags.JUD.missionRest === 0, 'a pre-§206 save revives owing no rest');
}

console.log('== a month whose checks fail charges no rest ==');
{
  const w = boot(BOOKMARK_66, 7);
  const mine = Object.values(w.game.armies).filter((a) => a && a.tag === 'JUD');
  const kept = mine.map((a) => a.men);
  for (const a of mine) a.men = 100; // under 20k: the root cannot complete
  for (let i = 0; i < 5; i++) realm.checkMissions(w.ctx);
  ok(doneList(w.game.tags.JUD).length === 0, 'five hungry months bank nothing');
  ok((w.game.tags.JUD.missionRest | 0) === 0, 'and charge no rest — waiting on the world is not resting from it');
  mine.forEach((a, i) => { a.men = kept[i]; });
  realm.checkMissions(w.ctx);
  ok(doneList(w.game.tags.JUD).join(',') === 'jm_arm_the_nation',
    'the month the world answers, the mission lands at once');
}

console.log('== a chapter can retune the drum; one-a-month holds even at pace 0 ==');
{
  const w = boot({ ...BOOKMARK_66, missionPaceMonths: 0 }, 42);
  forceBranches(w);
  realm.checkMissions(w.ctx);
  ok(doneList(w.game.tags.JUD).join(',') === 'jm_arm_the_nation',
    'pace 0 still banks ONE a pass — never a volley: ' + doneList(w.game.tags.JUD));
  realm.checkMissions(w.ctx);
  realm.checkMissions(w.ctx);
  ok(doneList(w.game.tags.JUD).join(',') === 'jm_arm_the_nation,jm_coastal_road,jm_diaspora',
    'but with no rest between beats: ' + doneList(w.game.tags.JUD));
}

console.log('== a hand-moved missionIdx keeps its meaning even mid-rest ==');
{
  const w = boot(BOOKMARK_66, 9);
  realm.checkMissions(w.ctx); // the root completes; the chain rests
  ok((w.game.tags.JUD.missionRest | 0) === PACE, 'mid-rest fixture stands');
  w.game.tags.JUD.missionIdx = 5; // an old save or a forcing test moves the cursor
  realm.checkMissions(w.ctx); // a RESTING pass still normalizes the record
  const d = doneList(w.game.tags.JUD);
  ok(d.length >= 5 && w.game.tags.JUD.missionIdx >= 5,
    'the resting month still seeds the first N as done: idx=' + w.game.tags.JUD.missionIdx
    + ', done=' + d.length);
}

console.log(failures ? `smoke133: ${failures} FAIL` : 'smoke133: ALL PASS');
process.exit(failures ? 1 : 0);
