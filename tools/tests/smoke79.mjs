// Headless regression — SPEC §112: a rising has to end.
//
// The bug this suite exists for is not a crash and not a wrong number; it is a
// chapter going quiet. A peasant or religious band that took a province and was
// left alone had no ending in the rules — only a pretender's host did. And
// because income, manpower and every recruitment order require a province to be
// owned AND controlled, a realm whose provinces were all rebel-held earned
// nothing, grew nothing and could raise nothing: it could never build the army
// it needed to take its own country back. A 66 CE Judaea that had beaten Rome
// off sat for thirty-three years owning sixteen provinces, controlling none,
// with zero men under arms, unable to satisfy any card that asked whether it
// held Jerusalem — so neither the Temple burned nor the Second Kingdom opened.
//
// Two halves are asserted here: the burn-out actually happens (the state gets
// its country back), and it does not make risings harmless (a band in a province
// that is still angry, still inside its grace period, or still in a battle,
// keeps what it took).
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const { monthlyRisings } = await import(R + '/js/sim/revolt.js');
const { spawnArmy, changeControllerCore } = await import(R + '/js/sim/military.js');
const { tickDay } = await import(R + '/js/sim/tick.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const EV66 = (ERAS.find((e) => e.bookmark.id === '66ce') || {}).events || [];
const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));

function boot(bookmark, playerTag, events, seed = 7) {
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const N = snap.neighbors.length - 1;
  const to = (id) => provinceMap[id] || id;
  const neighbors = Array.from({ length: N + 1 }, () => new Set());
  for (let id = 1; id <= N; id++) {
    const t = to(id);
    for (const nb of snap.neighbors[id]) {
      const tn = to(nb);
      if (tn !== t) { neighbors[t].add(tn); neighbors[tn].add(t); }
    }
  }
  const geom = {
    neighbors,
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas), bbox: [],
  };
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed: seed, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap });
  return { game, ctx, actions: gameActions(ctx) };
}
const provByCanon = (g, canon) => {
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && p.canon === canon) return p;
  }
  return null;
};
// Put a band in a province the way a rising leaves one: it holds the ground.
function occupy(ctx, g, p, kind = 'peasant', men = 4000) {
  const id = spawnArmy(ctx, 'REB', p.name, { inf: 4, name: 'The Band of ' + p.name });
  const a = g.armies[id];
  if (a) { a.rising = kind; a.men = men; }
  changeControllerCore(ctx, p, 'REB');
  p.revoltType = kind;
  p.rebelHeldMonths = 0;
  return a;
}
const months = (ctx, g, n) => { for (let i = 0; i < n; i++) monthlyRisings(ctx); };
const rebelsIn = (g, id) => Object.values(g.armies).filter((a) => a && a.tag === 'REB' && a.prov === id).length;

console.log('== §112: the knobs are declared, not hard-coded ==');
{
  const r = DEFINES.REVOLT || {};
  for (const k of ['rebelBurnoutMonths', 'rebelBurnoutUnrest', 'rebelBurnoutRate', 'rebelHoldMaxMonths']) {
    ok(Number.isFinite(r[k]), k + ' is a balance number (' + r[k] + ')');
  }
  ok(r.rebelHoldMaxMonths > r.rebelBurnoutMonths,
    'the hard ceiling is later than the grace period');
}

console.log('== §112: a band nobody answers melts away ==');
{
  const { game, ctx } = boot(BOOKMARK_66, 'JUD', []);
  const p = provByCanon(game, 'Jericho');
  occupy(ctx, game, p);
  p.unrest = 0; // the grievance is spent
  ok(p.controller === 'REB', 'the rising takes Jericho');
  months(ctx, game, DEFINES.REVOLT.rebelBurnoutMonths - 1);
  ok(p.controller === 'REB',
    'and holds it through the grace period (' + DEFINES.REVOLT.rebelBurnoutMonths + ' months)');
  months(ctx, game, 60);
  ok(p.controller === 'JUD', 'then melts away and the province answers to its own again');
  ok(rebelsIn(game, p.id || game.provinces.indexOf(p)) === 0, 'with no band left in it');
  ok(p.revoltCooldownMonths >= 12,
    'and a year before anything can be raised there again (' + p.revoltCooldownMonths + ')');
}

console.log('== §112: but an angry province keeps what it took ==');
{
  const { game, ctx } = boot(BOOKMARK_66, 'JUD', []);
  const p = provByCanon(game, 'Jericho');
  occupy(ctx, game, p);
  p.unrest = 9; // still furious
  months(ctx, game, DEFINES.REVOLT.rebelHoldMaxMonths - 2);
  ok(p.controller === 'REB',
    'unrest above the calm line holds the province for years (' + p.rebelHeldMonths + ' months)');
  // ...but not forever. The ceiling is the whole point of having one.
  months(ctx, game, 6);
  ok(p.controller === 'JUD',
    'and even a furious province gives it up at the ceiling ('
    + DEFINES.REVOLT.rebelHoldMaxMonths + ' months)');
}

console.log('== §112: a band being fought is left to the field ==');
{
  const { game, ctx } = boot(BOOKMARK_66, 'JUD', []);
  const p = provByCanon(game, 'Jericho');
  const band = occupy(ctx, game, p);
  p.unrest = 0;
  band.inBattle = true;
  months(ctx, game, DEFINES.REVOLT.rebelHoldMaxMonths - 2);
  ok(p.controller === 'REB',
    'a rising answered the old way is not also melted by the calendar');
  // ...but the exemption is bounded, because an unbounded one is the same
  // immortality bug in miniature: a single stale `inBattle` would hold the
  // province for good.
  months(ctx, game, 6);
  ok(p.controller === 'JUD',
    'and a band still flagged in-battle at the ceiling loses the province anyway');
}
{
  const { game, ctx } = boot(BOOKMARK_66, 'JUD', []);
  const p = provByCanon(game, 'Jericho');
  const band = occupy(ctx, game, p);
  p.unrest = 0;
  band.inBattle = true;
  months(ctx, game, 6);
  band.inBattle = false;
  months(ctx, game, 60);
  ok(p.controller === 'JUD', 'once the battle is over the ordinary clock applies again');
}

console.log('== §112: a dead owner gets nothing back ==');
{
  // Burn-out restores a province to its OWNER. A court that no longer exists
  // must not be handed a country by the tick.
  const { game, ctx } = boot(BOOKMARK_66, 'JUD', []);
  const p = provByCanon(game, 'Jericho');
  occupy(ctx, game, p);
  p.unrest = 0;
  game.tags[p.owner].alive = false;
  months(ctx, game, DEFINES.REVOLT.rebelHoldMaxMonths + 24);
  ok(p.controller === 'REB', 'the band keeps the province of a court that is gone');
  ok(!p.rebelHeldMonths, 'and the clock is not even running on it');
}

console.log('== §112: a realm can no longer be locked out of its own country ==');
{
  // The reported shape, end to end: every province rebel-held, no army, no
  // income, no manpower. Before the fix this was terminal.
  const { game, ctx } = boot(BOOKMARK_66, 'JUD', []);
  const mine = [];
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'JUD') mine.push(p);
  }
  ok(mine.length >= 8, 'Judaea opens with ' + mine.length + ' provinces');
  for (const p of mine) { occupy(ctx, game, p, 'peasant', 3000); p.unrest = 0; }
  for (const id of Object.keys(game.armies)) {
    if (game.armies[id] && game.armies[id].tag === 'JUD') delete game.armies[id];
  }
  const held0 = mine.filter((p) => p.controller === 'JUD').length;
  ok(held0 === 0, 'and is then locked out of every one of them');
  months(ctx, game, DEFINES.REVOLT.rebelHoldMaxMonths + 12);
  const held1 = mine.filter((p) => p.controller === 'JUD').length;
  ok(held1 === mine.length,
    'the risings burn out and it has its country back (' + held1 + '/' + mine.length + ')');
}

console.log('== §112: and the 66 CE chapter reaches an ending ==');
{
  // The payoff. A plain AI Judaea, no help of any kind, played forward through
  // the revolt: the chapter must resolve one way or the other rather than going
  // silent for thirty years.
  const { game, ctx, actions } = boot(BOOKMARK_66, 'JUD', EV66);
  game.tags.JUD.ai = true;
  game.paused = false;
  const fired = new Set();
  for (let y = 0; y < 30; y++) for (let d = 0; d < 360; d++) {
    tickDay(ctx);
    let guard = 0;
    while (game.pendingEvents.length && guard++ < 50) {
      const pe = game.pendingEvents[0];
      const e = EV66.find((x) => x && x.id === pe.eventId);
      fired.add(pe.eventId);
      try { actions.chooseEventOption(pe.instanceId, (e && e.aiOption) || 0); }
      catch (err) { game.pendingEvents.shift(); }
      game.paused = false;
    }
    if (game.paused) game.paused = false;
    if (game.over) game.over = false;
  }
  const jer = ctx.prov('Jerusalem');
  const ended = fired.has('ev_temple_burns') || !!game.flags.secondKingdom;
  ok(ended, 'the revolt ends in one branch or the other (Temple burned: '
    + fired.has('ev_temple_burns') + ', Second Kingdom: ' + !!game.flags.secondKingdom + ')');
  const stranded = [];
  for (let i = 1; i < game.provinces.length; i++) {
    const p = game.provinces[i];
    if (p && !p.impassable && p.owner === 'JUD' && p.controller === 'REB'
      && num(p.rebelHeldMonths) > DEFINES.REVOLT.rebelHoldMaxMonths) stranded.push(p.name);
  }
  ok(!stranded.length, 'and no province is held past the ceiling ('
    + (stranded.join(', ') || 'none') + ')');
  ok(jer.controller !== 'REB' || jer.owner !== 'JUD',
    'Jerusalem is not still in the hands of a band nobody ever answered');
}
function num(v) { return Number.isFinite(+v) ? +v : 0; }

console.log(failures ? `smoke79: ${failures} FAIL` : 'smoke79: ALL PASS');
process.exit(failures ? 1 : 0);
