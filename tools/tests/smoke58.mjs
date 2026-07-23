// Headless regression — sandbox chapters (SPEC §83).
//  1. No chapters before the verdict; a WON bookmark arms the system and a
//     chapter opens after the grace, with one territorial, one internal and
//     one diplomatic/economic objective, all sized to the live world.
//  2. Objectives complete by holding real conditions over real months
//     (the holy places held a year), and a finished chapter pays a permanent
//     but restrained reward, then schedules a harder successor.
//  3. A lapsed objective is REPLACED with a setback — never a game over.
//  4. The ledger is plain data: it survives save/revive mid-chapter.
//  5. The whole system is the human player's: an AI campaign never opens it.
import { readFileSync } from 'node:fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions, reviveGame } = await import(R + '/js/sim/init.js');
const { tickDay } = await import(R + '/js/sim/tick.js');
const mil = await import(R + '/js/sim/military.js');

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

function boot(seed, notices) {
  const provinceMap = buildProvinceMapping(MAP_DATA, BOOKMARK_66);
  const geom = foldGeom(rawGeom, provinceMap);
  const bus = {
    emit(kind, payload) { if (kind === 'notify' && notices) notices.push(payload); },
    on() { return () => {}; },
  };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: [], playerTag: 'JUD', rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_66, events: [], provinceMap });
  return { game, ctx, actions: gameActions(ctx) };
}
const tickMonths = (ctx, months) => { for (let i = 0; i < months * DEFINES.DAYS_PER_MONTH; i++) tickDay(ctx); };

console.log('== the verdict opens the second act ==');
const notices = [];
const { game, ctx, actions } = boot(5801, notices);
{
  // stop the scripted war from deciding anything while we drive the clock
  for (const w of game.wars.slice()) mil.endWarBySword(ctx, w, null, { silent: true });
  tickMonths(ctx, 2);
  ok(!game.chapters, 'no chapters exist before the bookmark\'s verdict');
  game.result = 'win'; // the chapter verdict lands (endGame sets exactly this)
  tickMonths(ctx, 1);
  ok(!!game.chapters && !game.chapters.active,
    'the win arms the system, which waits out its grace months');
  tickMonths(ctx, DEFINES.CHAPTERS.graceMonths + 1);
  const ch = actions.getChapter();
  ok(!!ch && !!ch.active && ch.active.n === 1, 'chapter 1 opens after the grace');
  const slots = (ch.active ? ch.active.objectives : []).map((o) => o.slot);
  ok(slots.length === 3 && slots.includes('territorial') && slots.includes('internal') && slots.includes('diplomatic'),
    'three objectives: one territorial, one internal, one diplomatic/economic');
  ok(notices.some((n) => n && /A new chapter/.test(n.title || '')),
    'the player is told the chapter and its seal');
  ok(!!ch.active.reward && !!ch.active.reward.name, 'the reward is named up front');
}

console.log('== objectives complete against the live world ==');
{
  const a = game.chapters.active;
  const terr = a.objectives.find((o) => o.slot === 'territorial');
  ok(terr.kind === 'holyPlaces',
    'the 66 CE world offers its sanctuaries as the territorial objective (' + terr.name + ')');
  // hold every holy place: flip the missing ones to Judaea
  for (const pid of terr.params.list) {
    const p = ctx.byId(pid);
    if (p.controller !== 'JUD') mil.changeControllerCore(ctx, p, 'JUD');
  }
  // the other two slots are proven by their own kinds elsewhere; here they
  // stand done so the chapter can close on the sanctuaries alone
  for (const o of a.objectives) if (o !== terr) { o.done = true; }
  tickMonths(ctx, 1);
  ok(terr.have === terr.params.list.length && !terr.done,
    'progress counts the sanctuaries held, and the year of keeping them has begun');
  tickMonths(ctx, terr.needMonths);
  const done = actions.getChapter();
  ok(done.seq === 1 && !done.active && done.history.length === 1,
    'holding the holy places a full year completes chapter 1');
  const t = game.tags.JUD;
  ok((t.modifiers || []).some((m) => m && m.id === 'chapter_reward_1' && m.months === -1),
    'the seal is a permanent modifier (' + ((t.modifiers.find((m) => m.id === 'chapter_reward_1') || {}).name) + ')');
  ok(notices.some((n) => n && /Chapter complete/.test(n.title || '')),
    'the completion is announced');
}

console.log('== the successor chapter is harder, and lapses only replace ==');
{
  tickMonths(ctx, DEFINES.CHAPTERS.betweenMonths + 1);
  const ch2 = actions.getChapter();
  ok(!!ch2.active && ch2.active.n === 2, 'a successor chapter opens after the breathing space');
  const terr2 = game.chapters.active.objectives.find((o) => o.slot === 'territorial');
  ok(terr2.kind !== 'holyPlaces', 'the successor asks something new of the realm (' + terr2.name + ')');
  // survive a save mid-chapter
  const revived = reviveGame(JSON.parse(JSON.stringify(game)));
  ok(revived.chapters && revived.chapters.active && revived.chapters.active.n === 2
      && revived.chapters.active.objectives.length === 3,
  'a mid-chapter save revives with the ledger whole');
  // let one objective lapse: setback and replacement, never a game over
  const target = game.chapters.active.objectives.find((o) => !o.done);
  target.monthsLeft = 1;
  const legitBefore = game.tags.JUD.legitimacy;
  tickMonths(ctx, 1);
  ok(!game.over && game.tags.JUD.legitimacy < legitBefore,
    'a lapsed objective costs a little legitimacy and nothing worse');
  ok(game.chapters.active.objectives.length === 3
      && notices.some((n) => n && /An objective slips away/.test(n.title || '')),
  'the lapsed objective is replaced in place, and the player told');
}

console.log('== the second act belongs to the human player ==');
{
  const { game: g2, ctx: c2 } = boot(5802, []);
  for (const w of g2.wars.slice()) mil.endWarBySword(c2, w, null, { silent: true });
  g2.result = 'win';
  g2.tags.JUD.ai = true; // an autorun / observer campaign
  tickMonths(c2, 6);
  ok(!g2.chapters, 'an AI-driven player tag never opens the sandbox chapters');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
