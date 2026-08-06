// tools/autorun.mjs — the balance harness (SPEC §21). Zero dependencies.
//
//   node tools/autorun.mjs [years] [bookmarkId]
//
// Runs every bookmark (or one) with EVERY nation on AI for N game years
// (default 8), using the real map adjacency from tools/geom-snapshot.json,
// and prints per-nation trajectories plus anomaly flags: snowballs, debt
// spirals, dead economies, manpower famines. Player-facing events are
// resolved with their aiOption, exactly as the AI would.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const R = join(HERE, '..');

const { DEFINES } = await import(join(R, 'js/data/defines.js'));
const { MAP_DATA } = await import(join(R, 'js/data/map_data.js'));
const { bus } = await import(join(R, 'js/core/bus.js'));
const { initGame, makeCtx, gameActions } = await import(join(R, 'js/sim/init.js'));
const { buildProvinceMapping } = await import(join(R, 'js/data/map_profile.js'));
const { tickDay } = await import(join(R, 'js/sim/tick.js'));
const eco = await import(join(R, 'js/sim/economy.js'));

// The harness reads the era registry, not the era FILES (SPEC §105). It used
// to import each bookmark's own events module by name, which quietly meant it
// ran a chapter WITHOUT any package concatenated onto it in compendium.js —
// the 132 CE world spine, the Christian thread, the region's own quarrels.
// The balance numbers were therefore produced by a game the player never
// plays. compendium.ERAS is the one place the pairing is written down; read
// it, and a new package is in the harness the day it is registered.
const { ERAS } = await import(join(R, 'js/data/compendium.js'));
const BOOKS = ERAS.map((e) => [e.bookmark.id, e.bookmark, e.events]);

const YEARS = Math.max(1, Number(process.argv[2]) || 8);
const ONLY = process.argv[3] || null;

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

async function runBookmark(entry, rawGeom) {
  const [id, bookmark, events] = entry;
  const playable = bookmark.playableTags[0].tag;
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const geom = foldGeom(rawGeom, provinceMap);
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag: playable, rngSeed: 1234567, provinceMap });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events, provinceMap });
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
  const dpm = DEFINES.DAYS_PER_MONTH || 30;
  for (let y = 0; y < YEARS; y++) {
    for (let d = 0; d < dpm * 12; d++) {
      tickDay(ctx);
      // resolve player-facing cards the way the AI would
      while (game.pendingEvents.length) {
        const pe = game.pendingEvents[0];
        const ev = events.find((e) => e && e.id === pe.eventId);
        try { actions.chooseEventOption(pe.instanceId, (ev && ev.aiOption) || 0); } catch (e) { game.pendingEvents.shift(); }
        game.paused = false;
      }
      if (game.paused) game.paused = false;
      if (game.over) game.over = false; // observe on: the world keeps turning
    }
    yearly.push(snapshotYear());
  }
  bus.off ? bus.off('war', onWar) : null;

  // ---- report -------------------------------------------------------------
  const start = yearly[0];
  const end = yearly[yearly.length - 1];
  console.log(`\n=== ${bookmark.name} (${id}) — ${YEARS} years all-AI ===`);
  console.log('tag    provs      dev        income        treasury          troops        manpower   ref  flags');
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
    console.log(
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
  console.log(`wars: ${counters.warsStarted} started, ${counters.warsEnded} ended`
    + (counters.warsJoined ? `, ${counters.warsJoined} joined` : '')
    + (counters.warsLeft ? `, ${counters.warsLeft} settled out` : '')
    + ` · battles: ${counters.battles}`
    + ` · date reached: ${game.date.y}/${game.date.m}`);
  return { id, flags: flagsOut, counters };
}

const geom = loadGeom();
const results = [];
for (const entry of BOOKS) {
  if (ONLY && entry[0] !== ONLY) continue;
  try {
    results.push(await runBookmark(entry, geom));
  } catch (e) {
    console.error(`!! ${entry[0]} crashed:`, e);
    results.push({ id: entry[0], flags: ['CRASHED'], counters: {} });
  }
}
console.log('\n=== anomalies ===');
for (const r of results) {
  console.log(r.id.padEnd(7) + (r.flags.length ? r.flags.join(' | ') : 'none'));
}
