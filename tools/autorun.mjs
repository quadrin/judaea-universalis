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
const { tickDay } = await import(join(R, 'js/sim/tick.js'));
const eco = await import(join(R, 'js/sim/economy.js'));

const BOOKS = [
  ['167bce', 'bookmark_167bce.js', 'BOOKMARK_167', 'events_167bce.js', 'EVENTS_167'],
  ['67bce', 'bookmark_67bce.js', 'BOOKMARK_67', 'events_67bce.js', 'EVENTS_67'],
  ['40bce', 'bookmark_40bce.js', 'BOOKMARK_40', 'events_40bce.js', 'EVENTS_40'],
  ['66ce', 'bookmark_66ce.js', 'BOOKMARK_66', 'events_66ce.js', 'EVENTS_66'],
  ['115ce', 'bookmark_115ce.js', 'BOOKMARK_115', 'events_115ce.js', 'EVENTS_115'],
  ['132ce', 'bookmark_132ce.js', 'BOOKMARK_132', 'events_132ce.js', 'EVENTS_132'],
  ['614ce', 'bookmark_614ce.js', 'BOOKMARK_614', 'events_614ce.js', 'EVENTS_614'],
  ['1948ce', 'bookmark_1948.js', 'BOOKMARK_1948', 'events_1948.js', 'EVENTS_1948'],
];

const YEARS = Math.max(1, Number(process.argv[2]) || 8);
const ONLY = process.argv[3] || null;

// Real adjacency, headless: the snapshot is regenerated from the browser
// whenever the map changes (see tools/README.md).
function loadGeom() {
  const snap = JSON.parse(readFileSync(join(HERE, 'geom-snapshot.json'), 'utf8'));
  return {
    neighbors: snap.neighbors.map((arr) => new Set(arr)),
    centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    coastal: snap.coastal.map(Boolean),
    offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
    areas: Int32Array.from(snap.areas),
    bbox: [],
  };
}

function fmt(n, w) {
  return String(n).padStart(w);
}

async function runBookmark(entry, geom) {
  const [id, bmFile, bmName, evFile, evName] = entry;
  const bookmark = (await import(join(R, 'js/data', bmFile)))[bmName];
  const events = (await import(join(R, 'js/data', evFile)))[evName];
  const playable = bookmark.playableTags[0].tag;
  const game = initGame({ DEFINES, MAP_DATA, geom, bookmark, events, playerTag: playable, rngSeed: 1234567 });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark, events });
  const actions = gameActions(ctx);
  game.tags[playable].ai = true; // nobody home: the whole world runs itself
  game.paused = false;

  const counters = { warsStarted: 0, warsEnded: 0, battles: 0 };
  const onWar = (p) => { if (p && p.ended) counters.warsEnded++; else counters.warsStarted++; };
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
  console.log(`wars: ${counters.warsStarted} started, ${counters.warsEnded} ended · battles: ${counters.battles}`
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
