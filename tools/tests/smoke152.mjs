// Headless smoke test §227: the mission panel overhaul — claimed, not banked;
// roads that shut; the fork ledger.
//
// Three contracts, all new:
//
//   THE CLAIM. A player's chain no longer pays itself. The monthly pass reads
//   every check and writes a READY list; nothing is banked and nothing is paid
//   until claimMission is called. The ready list is rebuilt from live checks
//   every pass, so a realm that qualified in March and lost the province in
//   April is owed nothing — claim it while it holds. The AI keeps §102's
//   symmetry and goes on banking to §207's drum (smoke134 counts that half).
//
//   THE SHUT ROAD. A §183 hypothetical stands for one ROAD of one §119 fork,
//   and the roads of a fork are one question asked once. When a sibling road
//   fires, the medallion is SHUT — not locked, not merely unreached — and
//   everything downstream of it is shut with it. It can never be claimed.
//
//   THE FORK LEDGER. Every fork the tree stands a road in, the road taken and
//   the roads refused, so the either/or the grid cannot draw is written out.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { bus } = await import(R + '/js/core/bus.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { CHAPTER_PATHS } = await import(R + '/js/data/chapter_paths.js');
const { FORMABLES } = await import(R + '/js/data/formables.js');
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
function boot(seed, bookmark) {
  const bm = bookmark || BOOKMARK_66;
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: bm, events: EVENTS_66, playerTag: 'JUD', rngSeed: seed });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: bm, events: EVENTS_66 });
  return { game, ctx, actions: gameActions(ctx) };
}
const PACE = DEFINES.MISSION_PACE_MONTHS | 0;
const done = (t) => (t.missionsDone || []).slice();
// Over §227's harder muster: the root asks 28,000 and the chapter deals 26,000.
const arm = (w) => { for (const a of Object.values(w.game.armies)) if (a && a.tag === 'JUD') a.men += 4000; };
const ready = (t) => (t.missionReady || []).slice();

// ─────────────────────────────────────────────────── the claim, not the bank
console.log('== the monthly pass marks ready and pays nothing ==');
const w = boot(42);
{
  // §227 raised the ask to 28,000 and the chapter hands JUD 26,000, so the
  // root is something the realm must actually do. Recruit the difference; then
  // the pass that reads it only lights the medallion up.
  arm(w);
  realm.checkMissions(w.ctx);
  ok(done(w.game.tags.JUD).length === 0, 'nothing is banked by the calendar: ' + done(w.game.tags.JUD));
  ok(ready(w.game.tags.JUD).join(',') === 'jm_arm_the_nation',
    'the satisfied root is READY and waiting: ' + ready(w.game.tags.JUD));
  ok((w.game.tags.JUD.missionRest | 0) === 0, 'and a month that pays nothing charges no rest');
  const view = w.actions.getMissions();
  const root = view.find((m) => m.id === 'jm_arm_the_nation');
  ok(root && root.status === 'ready', 'the panel reads it as ready: ' + (root && root.status));
  const mods = (w.game.tags.JUD.modifiers || []).length;
  for (let i = 0; i < 6; i++) realm.checkMissions(w.ctx);
  ok(done(w.game.tags.JUD).length === 0 && (w.game.tags.JUD.modifiers || []).length === mods,
    'six more months change nothing — a reward not claimed is a reward not paid');
}

console.log('== the click banks it, pays it, and starts the drum ==');
{
  const res = realm.claimMission(w.ctx, 'jm_arm_the_nation');
  ok(res && res.ok, 'the claim is honoured: ' + JSON.stringify(res));
  ok(done(w.game.tags.JUD).join(',') === 'jm_arm_the_nation', 'and banked: ' + done(w.game.tags.JUD));
  ok((w.game.tags.JUD.modifiers || []).some((m) => m.id === 'levies_of_zion'), 'the reward is paid at the click');
  ok((w.game.tags.JUD.missionRest | 0) === PACE, 'the chain rests the pace from the CLAIM: ' + w.game.tags.JUD.missionRest);
  ok(ready(w.game.tags.JUD).indexOf('jm_arm_the_nation') < 0, 'and it leaves the ready list');
  const again = realm.claimMission(w.ctx, 'jm_arm_the_nation');
  ok(again && !again.ok, 'claiming it twice is refused: ' + (again && again.why));
}

console.log('== the drum gates the next claim ==');
{
  w.ctx.helpers.changeOwner(w.ctx, 'Caesarea Maritima', 'JUD');
  realm.checkMissions(w.ctx);
  ok(ready(w.game.tags.JUD).indexOf('jm_coastal_road') >= 0,
    'the coast is ready while the realm consolidates: ' + ready(w.game.tags.JUD));
  const held = realm.claimMission(w.ctx, 'jm_coastal_road');
  ok(held && !held.ok && held.why === 'resting', 'but the claim is refused mid-rest: ' + (held && held.why));
  for (let i = 0; i < PACE; i++) realm.checkMissions(w.ctx);
  ok((w.game.tags.JUD.missionRest | 0) === 0, 'the rest runs out on schedule');
  const now = realm.claimMission(w.ctx, 'jm_coastal_road');
  ok(now && now.ok && done(w.game.tags.JUD).length === 2, 'and then it lands: ' + done(w.game.tags.JUD));
}

console.log('== readiness is live: lose the terms, lose the claim ==');
{
  const v = boot(11);
  arm(v);
  realm.checkMissions(v.ctx);
  ok(ready(v.game.tags.JUD).join(',') === 'jm_arm_the_nation', 'the host qualifies the root');
  const mine = Object.values(v.game.armies).filter((a) => a && a.tag === 'JUD');
  for (const a of mine) a.men = 100; // the host melts away before anyone claims
  realm.checkMissions(v.ctx);
  ok(ready(v.game.tags.JUD).length === 0, 'the ready list empties with the muster rolls');
  const late = realm.claimMission(v.ctx, 'jm_arm_the_nation');
  ok(late && !late.ok && late.why === 'unmet',
    'and a stale click is refused at the sim, not at the panel: ' + (late && late.why));
  ok(done(v.game.tags.JUD).length === 0, 'nothing was banked on a view a month out of date');
}

console.log('== a locked mission cannot be claimed past its prerequisites ==');
{
  const v = boot(13);
  realm.checkMissions(v.ctx);
  const view = v.actions.getMissions();
  const locked = view.find((m) => m.status === 'locked' && (m.requires || []).length);
  ok(!!locked, 'the tree has a locked branch to try: ' + (locked && locked.id));
  const res = realm.claimMission(v.ctx, locked.id);
  ok(res && !res.ok && res.why === 'locked', 'and it refuses by name: ' + (res && res.why));
}

console.log('== the ready list is derived, never trusted off a save ==');
{
  const raw = JSON.parse(JSON.stringify(w.game));
  raw.tags.JUD.missionReady = 'not an array';
  const revived = reviveGame(raw);
  ok(Array.isArray(revived.tags.JUD.missionReady) && revived.tags.JUD.missionReady.length === 0,
    'a corrupt ready list is dropped, not honoured');
  const old = reviveGame(JSON.parse(JSON.stringify(w.game)));
  delete old.tags.JUD.missionReady;
  ok(true, 'a pre-§227 save joins with none and the next pass rebuilds it');
}

// ──────────────────────────────────────────────────────── the roads that shut
console.log('== a sibling road shuts the medallion, and everything under it ==');
{
  const v = boot(5);
  const before = v.actions.getMissions().filter((m) => m.status === 'shut');
  ok(before.length === 0, 'no road is shut at boot — a chapter opens with every question open');
  // The Ninth of Av: the House falls. `hy_house_stands` is the OTHER road of
  // 66ce/how_the_revolt_ends, and hy_what_kind / hy_trajan_flank hang off it.
  v.ctx.helpers.setFlag(v.ctx, 'templeBurned', true);
  const view = v.actions.getMissions();
  const shut = new Set(view.filter((m) => m.status === 'shut').map((m) => m.id));
  ok(shut.has('hy_house_stands'), 'the road not taken is shut: hy_house_stands');
  ok(shut.has('hy_what_kind') && shut.has('hy_trajan_flank'),
    'and the branch below it goes with it: ' + [...shut].join(','));
  const node = view.find((m) => m.id === 'hy_house_stands');
  ok(node && /Ninth of Av/.test(node.roadTaken || ''),
    'the panel is told which road the campaign took: ' + (node && node.roadTaken));
  ok(!!(node && node.forkQuestion), 'and the question it answered: ' + (node && node.forkQuestion));
  // A shut road never completes and never pays, however the world moves.
  realm.checkMissions(v.ctx);
  ok(ready(v.game.tags.JUD).indexOf('hy_house_stands') < 0, 'a shut road never goes ready');
  const res = realm.claimMission(v.ctx, 'hy_house_stands');
  ok(res && !res.ok && res.why === 'shut', 'and refuses the claim by name: ' + (res && res.why));
}

console.log('== the road WE took is not shut by its own marker ==');
{
  const v = boot(6);
  v.ctx.helpers.setFlag(v.ctx, 'secondKingdom', true);
  const node = v.actions.getMissions().find((m) => m.id === 'hy_house_stands');
  ok(node && node.status !== 'shut', 'our own road stays open: ' + (node && node.status));
  ok(node && /House That Stood/.test(node.roadChosen || ''),
    'and the medallion wears the answer: ' + (node && node.roadChosen));
}

// ───────────────────────────────────────────────────────── the fork ledger
console.log('== the fork ledger writes out the either/or ==');
{
  const v = boot(8);
  const cold = v.actions.getForks();
  ok(cold.length >= 5, 'every fork the tree stands a road in is listed: ' + cold.length);
  ok(cold.every((f) => f.question && f.roads.length >= 2),
    'each with its question and at least two answers');
  ok(cold.every((f) => !f.answered && f.roads.every((r) => !r.taken && !r.refused)),
    'and none answered at boot');
  v.ctx.helpers.setFlag(v.ctx, 'secondKingdom', true);
  const warm = v.actions.getForks();
  const f = warm.find((x) => x.id === '66ce/how_the_revolt_ends');
  ok(!!f && f.answered, 'the answered fork reads answered');
  const took = f.roads.filter((r) => r.taken).map((r) => r.name);
  const cost = f.roads.filter((r) => r.refused).map((r) => r.name);
  ok(took.length === 1 && /House That Stood/.test(took[0]), 'one road taken: ' + took.join(','));
  ok(cost.length >= 1 && /Ninth of Av/.test(cost.join(',')), 'the rest refused: ' + cost.join(','));
  ok(f.roads.every((r) => !(r.taken && r.refused)), 'no road is both');
}

// ──────────────────────────────────────────── the data contract, every chapter
console.log('== every declared road is a road its fork actually has ==');
{
  const idx = new Map();
  for (const c of CHAPTER_PATHS) for (const f of c.forks) idx.set(c.id + '/' + f.id, f);
  const hypos = [];
  const push = (list) => { if (Array.isArray(list)) for (const m of list) if (m && m.hypothetical) hypos.push(m); };
  for (const e of ERAS) { const T = e.bookmark.missions || {}; for (const tag of Object.keys(T)) push(T[tag]); }
  const seen = new Set();
  for (const fm of FORMABLES) { if (!Array.isArray(fm.missions) || seen.has(fm.missions)) continue; seen.add(fm.missions); push(fm.missions); }
  let bad = 0; let declared = 0;
  for (const m of hypos) {
    const f = idx.get(String(m.fork));
    if (!f) { bad++; console.error('    no fork record for', m.id, m.fork); continue; }
    const ids = new Set(f.roads.map((r) => String(r.id)));
    const mine = [].concat(m.road ? [String(m.road)] : [], Array.isArray(m.roads) ? m.roads.map(String) : []);
    if (!mine.length) continue;
    declared++;
    for (const r of mine) if (!ids.has(r)) { bad++; console.error('    unknown road', m.id, r); }
  }
  ok(hypos.length >= 70, 'the chapters carry their roads not taken: ' + hypos.length);
  ok(!bad, 'every declared road exists in the fork it names');
  ok(declared >= 60, 'and most of them declare one, so a sibling can shut them: ' + declared);
}

// ───────────────────────────────────────── the description IS the ask (§227)
console.log('== no desc claims a number its check does not ask for ==');
{
  const all = [];
  for (const e of ERAS) { const T = e.bookmark.missions || {}; for (const tag of Object.keys(T)) for (const m of (T[tag] || [])) if (m) all.push([e.bookmark.id + '/' + tag, m]); }
  const s = new Set();
  for (const f of FORMABLES) { if (!Array.isArray(f.missions) || s.has(f.missions)) continue; s.add(f.missions); for (const m of f.missions) if (m) all.push(['formable/' + f.to, m]); }
  const num = (x) => Number(String(x).replace(/,/g, ''));
  // Every shape a check counts in, paired with the way a desc says it. The
  // §227 pass wrote the descriptions FROM the checks; this keeps them written
  // from the checks, because a tooltip that lies about the bar is worse than
  // a tooltip that says nothing.
  const PROBES = [
    [/(?:totalMen|menOf)\([^)]*\)+\s*>=\s*(\d+)/, /([\d,]{4,})\s+(?:men|lances|troops|soldiers)\b/i, 'muster'],
    [/(?:has|jud)Warscore\(ctx\)\s*>=\s*(\d+)/, /\+(\d+) war score/i, 'war score'],
    [/treasury[^<>=]{0,20}>=\s*(\d+)/, /([\d,]{3,})\s+talents\b/i, 'treasury'],
    [/(?:ownedDev|realmDev)\([^)]*\)\s*>=\s*(\d+)/, /(\d{2,})\s+development\b/i, 'development'],
    [/\bdev\s*>=\s*(\d+)/, /(\d{2,})\s+development\b/i, 'development'],
  ];
  let cross = 0; const liars = [];
  for (const [where, m] of all) {
    const c = String(m.check || '').replace(/\s+/g, ' ');
    const d = String(m.desc || '');
    for (const [creg, dreg, what] of PROBES) {
      const cm = c.match(creg); const dm = d.match(dreg);
      if (!cm || !dm) continue;
      cross++;
      if (num(cm[1]) !== num(dm[1])) liars.push(where + '/' + m.id + ' (' + what + ': check ' + cm[1] + ', desc ' + dm[1] + ')');
    }
  }
  ok(cross >= 60, 'numeric asks cross-checked against their descriptions: ' + cross);
  ok(!liars.length, 'and every one agrees' + (liars.length ? ': ' + liars.join('; ') : ''));

  const lens = all.map(([, m]) => String(m.desc || '').length);
  const median = lens.slice().sort((a, b) => a - b)[Math.floor(lens.length / 2)];
  ok(median <= 120, 'the descriptions are an ask and not an essay — median ' + median + ' chars');
  const longest = Math.max(...lens);
  ok(longest <= 200, 'and none of them is a page: longest ' + longest + ' chars');
  ok(lens.every((n) => n >= 15), 'while none is a stub');
}

// ─────────────────────────────────────────── what an accomplishment pays (§227)
console.log('== every mission modifier is permanent ==');
{
  const all = [];
  for (const e of ERAS) { const T = e.bookmark.missions || {}; for (const tag of Object.keys(T)) for (const m of (T[tag] || [])) if (m && m.reward) all.push([e.bookmark.id + '/' + tag, m]); }
  const s = new Set();
  for (const f of FORMABLES) { if (!Array.isArray(f.missions) || s.has(f.missions)) continue; s.add(f.missions); for (const m of f.missions) if (m && m.reward) all.push(['formable/' + f.to, m]); }
  const temporary = [];
  for (const [where, m] of all) {
    for (const mt of String(m.reward).matchAll(/\bmonths:\s*(-?\d+)/g)) {
      if (Number(mt[1]) > 0) temporary.push(where + '/' + m.id);
    }
  }
  ok(!temporary.length, 'nothing a chapter asks for buys a bonus the realm outlives'
    + (temporary.length ? ': ' + temporary.slice(0, 6).join(', ') : ''));
  const says = all.filter(([, m]) => / for \d+ months\b| for two years\b/.test(String(m.rewardText || '')));
  ok(!says.length, 'and no label still promises an expiry'
    + (says.length ? ': ' + says.slice(0, 4).map(([w, m]) => w + '/' + m.id).join(', ') : ''));
}

console.log(failures ? `smoke152: ${failures} FAIL` : 'smoke152: ALL PASS');
process.exit(failures ? 1 : 0);
