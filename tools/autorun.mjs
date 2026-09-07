// tools/autorun.mjs — the balance harness (SPEC §21). Zero dependencies.
//
//   node tools/autorun.mjs [years] [bookmarkId]
//
// Runs every bookmark (or one) with EVERY nation on AI for N game years
// (default 8), using the real map adjacency from tools/geom-snapshot.json,
// and prints per-nation trajectories plus anomaly flags: snowballs, debt
// spirals, dead economies, manpower famines. Player-facing events are
// resolved with their aiOption, exactly as the AI would.
import { readFileSync, writeFileSync } from 'fs';
import { PROFILES, parseOptions, experiments, summarize } from './balance/options.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, '..');

const { DEFINES } = await import(join(R, 'js/data/defines.js'));
const { MAP_DATA } = await import(join(R, 'js/data/map_data.js'));
const { bus: sharedBus } = await import(join(R, 'js/core/bus.js'));
const { initGame, makeCtx, gameActions } = await import(join(R, 'js/sim/init.js'));
const { buildProvinceMapping } = await import(join(R, 'js/data/map_profile.js'));
const { tickDay } = await import(join(R, 'js/sim/tick.js'));
const eco = await import(join(R, 'js/sim/economy.js'));
const { findEventById } = await import(join(R, 'js/sim/events.js'));

// The harness reads the era registry, not the era FILES (SPEC §105). It used
// to import each bookmark's own events module by name, which quietly meant it
// ran a chapter WITHOUT any package concatenated onto it in compendium.js —
// the 132 CE world spine, the Christian thread, the region's own quarrels.
// The balance numbers were therefore produced by a game the player never
// plays. compendium.ERAS is the one place the pairing is written down; read
// it, and a new package is in the harness the day it is registered.
const { ERAS } = await import(join(R, 'js/data/compendium.js'));
const BOOKS = ERAS.map((e) => [e.bookmark.id, e.bookmark, e.events]);

let options;
try { options = parseOptions(process.argv.slice(2)); }
catch (e) { console.error(e.message); process.exit(1); }
if (options.help) {
  console.log(`node tools/autorun.mjs [years] [bookmarkId]
  --seeds=30 --seed=1234567   Consecutive reproducible seeds
  --factions=first|all|TAG    Player-facing campaign to observe
  --profiles=historical,cautious,bold  AI personality sensitivity, not human play
  --difficulty=normal|hard   Campaign difficulty
  --quiet --json=report.json Compact output and full machine-readable trajectories`);
  process.exit(0);
}
const log = (...args) => { if (!options.quiet) console.log(...args); };

// Real adjacency, headless: the snapshot is regenerated from the browser
// whenever the map changes (see tools/README.md). It is full-resolution
// (every latent cell active), so each bookmark folds it through its own
// province mapping — exactly what computeGeometry does from the live raster.
function loadGeom() {
  const snap = JSON.parse(readFileSync(join(HERE, 'geom-snapshot.json'), 'utf8'));
  // The snapshot must be regenerated whenever map_data.js changes (README).
  // A stale snapshot silently leaves the new cells with no adjacency —
  // armies freeze there and the balance harness lies. Fail loudly instead.
  if (snap.neighbors.length !== MAP_DATA.provinces.length + 1) {
    throw new Error(`geom-snapshot.json is stale: ${snap.neighbors.length - 1} cells vs `
      + `${MAP_DATA.provinces.length} in map_data.js — regenerate it (tools/README.md).`);
  }
  return {
    neighbors: snap.neighbors.map((arr) => new Set(arr)),
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas),
    bbox: [],
  };
}

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

function fmt(n, w) {
  return String(n).padStart(w);
}

async function runBookmark(experiment, rawGeom) {
  const { entry, tag: playable, seed, profile, years: YEARS, difficulty } = experiment;
  const [id, bookmark, events] = entry;
  // Each simulation owns its subscriptions. A failed run cannot leave battle
  // counters attached to later runs (bus.on returns a disposer, not bus.off).
  const bus = { ...sharedBus, _h: new Map() };
  const defines = PROFILES[profile] ? { ...DEFINES, PERSONALITIES: {
    ...DEFINES.PERSONALITIES, [playable]: {
      ...DEFINES.PERSONALITIES[playable], ...PROFILES[profile],
    },
  } } : DEFINES;
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const geom = foldGeom(rawGeom, provinceMap);
  const game = initGame({ DEFINES: defines, MAP_DATA, geom, bookmark, events, playerTag: playable, rngSeed: seed, provinceMap, difficulty });
  const ctx = makeCtx({ game, DEFINES: defines, MAP_DATA, geom, bus, bookmark, events, provinceMap });
  const actions = gameActions(ctx);
  game.tags[playable].ai = true; // nobody home: the whole world runs itself
  game.paused = false;

  const counters = { warsStarted: 0, warsEnded: 0, warsLeft: 0, warsJoined: 0, battles: 0 };
  // A 'war' event is one of four things: a declaration, a war ending, a court
  // settling out of one that goes on without it (SPEC §67/§74/§193), and a
  // court brought into one already running (SPEC §224). The third used to be
  // counted as a declaration, which read as phantom wars in the 1948 line the
  // moment Rhodes started signing one map per delegation; the fourth would
  // read the same way, and a coalition entering one war is not three wars.
  const onWar = (p) => {
    if (p && p.ended) counters.warsEnded++;
    else if (p && p.left) counters.warsLeft++;
    else if (p && p.joined) counters.warsJoined++;
    else counters.warsStarted++;
  };
  const onBattle = () => { counters.battles++; };
  bus.on('war', onWar);
  bus.on('battleStart', onBattle);

  const metrics = { firstDebtSpiralDay: null, firstBankruptcyDay: null,
    firstEliminationDay: null, result: null, resultDay: null, aliveAtEnd: true,
    minTreasury: game.tags[playable].treasury, monthsInDeficit: 0,
    observedMonths: 0 };
  const sample = (day, monthly = false) => {
    const currentTag = game.playerTag; // Forming or renaming a realm keeps the player's chair.
    const t = game.tags[currentTag];
    metrics.finalTag = currentTag;
    const alive = !!t && t.alive !== false;
    metrics.aliveAtEnd = alive;
    if (!alive && metrics.firstEliminationDay === null) metrics.firstEliminationDay = day;
    if (game.result && metrics.result === null) { metrics.result = game.result; metrics.resultDay = day; }
    if (!t) return;
    metrics.minTreasury = Math.min(metrics.minTreasury, t.treasury);
    if (t.treasury < -200 && metrics.firstDebtSpiralDay === null) metrics.firstDebtSpiralDay = day;
    if (t.crises?.bankruptcy?.stage >= 3 && metrics.firstBankruptcyDay === null) metrics.firstBankruptcyDay = day;
    if (monthly && alive) {
      metrics.observedMonths++;
      if (eco.incomeBreakdown(ctx, currentTag).net < 0) metrics.monthsInDeficit++;
    }
  };
  const tags = Object.keys(game.tags).filter((t) => t !== 'REB' && game.tags[t].alive);
  const yearly = []; // [{tag -> {provs, dev, income, treasury, troops, manpower}}]
  const snapshotYear = () => {
    const row = {};
    for (const t of tags) {
      const tt = game.tags[t];
      if (!tt) continue;
      let provs = 0, dev = 0;
      for (let i = 1; i < game.provinces.length; i++) {
        const p = game.provinces[i];
        if (!p || p.impassable || p.owner !== t) continue;
        provs++;
        dev += (p.dev ? (p.dev.tax || 0) + (p.dev.prod || 0) + (p.dev.mp || 0) : 0);
      }
      let troops = 0;
      for (const a of Object.values(game.armies)) if (a && a.tag === t) troops += a.men || 0;
      const bd = eco.incomeBreakdown(ctx, t);
      row[t] = {
        alive: tt.alive, provs, dev,
        income: Math.round(bd.net * 10) / 10,
        treasury: Math.round(tt.treasury),
        troops, manpower: Math.round(tt.manpower),
        reforms: (tt.reforms.mil | 0) + (tt.reforms.civ | 0) + (tt.reforms.rel | 0),
      };
    }
    return row;
  };

  yearly.push(snapshotYear());
  sample(0);
  const dpm = DEFINES.DAYS_PER_MONTH || 30;
  for (let y = 0; y < YEARS; y++) {
    for (let d = 0; d < dpm * 12; d++) {
      tickDay(ctx);
      // resolve player-facing cards the way the AI would
      while (game.pendingEvents.length) {
        const pe = game.pendingEvents[0];
        const ev = findEventById(ctx, pe.eventId);
        if (!ev) throw new Error('Unknown pending event: ' + pe.eventId);
        actions.chooseEventOption(pe.instanceId, ev.aiOption || 0);
        if (game.pendingEvents[0]?.instanceId === pe.instanceId)
          throw new Error('Event did not resolve: ' + pe.eventId);
        game.paused = false;
      }
      sample(y * dpm * 12 + d + 1, game.date.d === 1);
      if (game.paused) game.paused = false;
      if (game.over) game.over = false; // observe on: the world keeps turning
    }
    yearly.push(snapshotYear());
  }
  bus._h.clear();

  // ---- report -------------------------------------------------------------
  const start = yearly[0];
  const end = yearly[yearly.length - 1];
  log(`\n=== ${bookmark.name} (${id}) — ${YEARS} years all-AI · ${playable} · seed ${seed} · ${profile} · ${difficulty} ===`);
  log('tag    provs      dev        income        treasury          troops        manpower   ref  flags');
  const flagsOut = [];
  for (const t of tags) {
    const s = start[t], e = end[t];
    if (!s || !e) continue;
    const flags = [];
    // An off-map seat (SPEC §180) owns no cell, fields no men and cannot
    // die: zero manpower is its design, not a famine, and every flag here
    // measures a thing a seat deliberately does not have.
    if (DEFINES.TAGS[t] && DEFINES.TAGS[t].offmap) continue;
    if (!game.tags[t].alive) flags.push('DEAD');
    // Real snowballs grow by whole regions; a 2-province minor scripted up to 4
    // is history, not imbalance — hence the absolute-growth floor.
    if (e.provs >= Math.max(4, s.provs * 1.6) && e.provs - s.provs >= 4) flags.push('SNOWBALL');
    if (e.treasury < -200) flags.push('DEBT-SPIRAL');
    const mid = yearly[Math.floor(yearly.length / 2)][t];
    if (mid && mid.income < 0 && e.income < 0) flags.push('BLEEDING');
    if (e.manpower === 0 && e.troops < 1000) flags.push('EXHAUSTED');
    if (flags.length) flagsOut.push(t + ': ' + flags.join(','));
    log(
      t.padEnd(5)
      + fmt(s.provs, 3) + '→' + fmt(e.provs, 3)
      + fmt(s.dev, 5) + '→' + fmt(e.dev, 4)
      + fmt(s.income, 7) + '→' + fmt(e.income, 6)
      + fmt(s.treasury, 8) + '→' + fmt(e.treasury, 7)
      + fmt(s.troops, 8) + '→' + fmt(e.troops, 6)
      + fmt(s.manpower, 8) + '→' + fmt(e.manpower, 6)
      + fmt(e.reforms, 5)
      + '  ' + (flags.join(',') || '-'),
    );
  }
  log(`wars: ${counters.warsStarted} started, ${counters.warsEnded} ended`
    + (counters.warsJoined ? `, ${counters.warsJoined} joined` : '')
    + (counters.warsLeft ? `, ${counters.warsLeft} settled out` : '')
    + ` · battles: ${counters.battles}`
    + ` · date reached: ${game.date.y}/${game.date.m}`);
  return { id, tag: playable, seed, profile, difficulty, years: YEARS, flags: flagsOut, counters, metrics, yearly };
}

let cases;
try { cases = experiments(BOOKS, options); }
catch (e) { console.error(e.message); process.exit(1); }
const geom = loadGeom();
const results = [];
console.log(`Balance matrix: ${cases.length} runs, ${options.years} years each. AI outcomes are not human win rates.`);
for (const experiment of cases) {
  const { entry, tag, seed, profile, difficulty } = experiment;
  try { results.push(await runBookmark(experiment, geom)); }
  catch (e) {
    console.error(`!! ${entry[0]} / ${tag} / ${seed} / ${profile} crashed:`, e);
    results.push({ id: entry[0], tag, seed, profile, difficulty, error: String(e), flags: ['CRASHED'] });
    process.exitCode = 1;
  }
  if (options.quiet) console.log(`${results.length}/${cases.length} ${entry[0]} ${tag} ${seed} ${profile}`);
}
console.log('\n=== anomalies ===');
for (const r of results) {
  log([r.id, r.tag, r.seed, r.profile].join(' ') + ' ' + (r.flags.length ? r.flags.join(' | ') : 'none'));
}
const summary = summarize(results);
console.table(summary);
if (options.json) writeFileSync(options.json, JSON.stringify({ schemaVersion: 1, options, summary, runs: results }, null, 2) + '\n');
