// Headless regression — SPEC §68: the banner follows the state. Flag
// artwork covers every tag on every bookmark's map; a revolution can rebrand
// a state in place (name + FLAGS variant) and the chip honors it; a real tag
// switch drops the variant; and the integrated-names pen is inherited through
// formable switches via alias tables — including 1948's Neapolis → Shechem.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_1948 } = await import(R + '/js/data/bookmark_1948.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { EVENTS_1948 } = await import(R + '/js/data/events_1948.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx, reviveGame } = await import(R + '/js/sim/init.js');
const { monthlyIntegration } = await import(R + '/js/sim/realm.js');
const { changeOwnerCore, switchTagCore } = await import(R + '/js/sim/military.js');
const { FLAGS, flagChip } = await import(R + '/js/ui/icons.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

function boot(bookmark, playerTag) {
  const N = MAP_DATA.provinces.length;
  const fakeGeom = {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
  };
  const bus = { emit() {}, on() { return () => {}; } };
  const provinceMap = buildProvinceMapping(MAP_DATA, bookmark);
  const g = initGame({ DEFINES, MAP_DATA, geom: fakeGeom, bookmark, events: [], playerTag, rngSeed: 42, provinceMap });
  const ctx = makeCtx({ game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark, events: [], provinceMap });
  return { g, ctx };
}

const provByCanon = (g, canon) => {
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && p.canon === canon) return p;
  }
  return null;
};

// Three completed Integrate programs: the province is fully the owner's.
function integrateFully(ctx, g, p, tag) {
  if (p.owner !== tag) { changeOwnerCore(ctx, p, tag); p.controller = tag; }
  for (let round = 0; round < 3; round++) {
    p.integrating = { by: tag, monthsLeft: 1 };
    monthlyIntegration(ctx);
  }
}

console.log('== every bookmark tag flies real artwork ==');
{
  const bms = await Promise.all([
    ['bookmark_167bce', 'BOOKMARK_167'], ['bookmark_67bce', 'BOOKMARK_67'],
    ['bookmark_40bce', 'BOOKMARK_40'], ['bookmark_66ce', 'BOOKMARK_66'],
    ['bookmark_132ce', 'BOOKMARK_132'], ['bookmark_614ce', 'BOOKMARK_614'],
    ['bookmark_1948', 'BOOKMARK_1948'],
  ].map(async ([f, k]) => [f, (await import(`${R}/js/data/${f}.js`))[k]]));
  for (const [name, bm] of bms) {
    const tags = new Set(bm.activeTags || []);
    if (bm.owners) for (const v of Object.values(bm.owners)) tags.add(v);
    const missing = [...tags].filter((t) => t !== 'WASTE' && t !== 'REB' && !FLAGS[t]);
    ok(missing.length === 0, name + ' has emblem art for every tag' + (missing.length ? ' (missing: ' + missing.join(' ') + ')' : ''));
  }
  ok(!!FLAGS.EGY_REP && !!FLAGS.IRQ_REP, 'the republican variants EGY_REP and IRQ_REP exist');
}

console.log('== 1948: integrated Nablus signs itself Shechem ==');
{
  const { g, ctx } = boot(BOOKMARK_1948, 'ISR');
  const p = provByCanon(g, 'Neapolis');
  ok(!!p && p.name === 'Nablus', 'Neapolis opens under its 15-May name, Nablus');
  integrateFully(ctx, g, p, 'ISR');
  ok(p.name === 'Shechem', 'fully integrated by Israel, the signposts read Shechem (got "' + p.name + '")');
  changeOwnerCore(ctx, p, 'JOR');
  ok(p.name === 'Nablus', 'the moment it changes hands the era name returns');
}

console.log('== the pen survives the proclamation (alias tables) ==');
{
  const { g, ctx } = boot(BOOKMARK_614, 'JUD');
  const shechem = provByCanon(g, 'Neapolis');
  integrateFully(ctx, g, shechem, 'JUD');
  ok(shechem.name === 'Shechem', '614: Judaea integrates Neapolis and writes Shechem');
  ok(switchTagCore(ctx, 'JUD', 'MLI'), 'Judaea proclaims the Kingdom of Israel');
  const joppa = provByCanon(g, 'Joppa');
  integrateFully(ctx, g, joppa, 'MLI');
  ok(joppa.name === 'Yafo', 'the formed kingdom still writes with the Hebrew pen: Joppa becomes Yafo (got "' + joppa.name + '")');
}

console.log('== the Free Officers rebrand Egypt in place ==');
{
  const { g, ctx } = boot(BOOKMARK_1948, 'ISR');
  const ev = EVENTS_1948.find((e) => e && e.id === 'ev_i_free_officers');
  ok(!!ev, 'the Free Officers event exists');
  ev.options[0].effects(ctx);
  const egy = g.tags.EGY;
  ok(egy.govType === 'republic', 'Egypt becomes a republic');
  ok(egy.name === 'Republic of Egypt', 'Egypt renames itself the Republic of Egypt (got "' + (egy && egy.name) + '")');
  ok(egy.flag === 'EGY_REP', 'Egypt raises the Arab Liberation flag variant');
  const chip = flagChip('EGY', DEFINES, 20, false, g);
  ok(chip.includes(FLAGS.EGY_REP.slice(0, 40)), 'the flag chip renders the republican banner while the variant is set');
  ok(chip.includes('Republic of Egypt'), 'the chip labels the realm by its living name');
  const plain = flagChip('EGY', DEFINES, 20, false, null);
  ok(plain.includes(FLAGS.EGY.slice(0, 40)), 'without live state the tag still shows its base flag');
  // A hand-edited save cannot smuggle a prototype-chain member in as art.
  egy.flag = 'constructor';
  const hostile = flagChip('EGY', DEFINES, 20, false, g);
  ok(hostile.includes(FLAGS.EGY.slice(0, 40)) && !hostile.includes('native code'),
    'a corrupted flag key falls back to the base emblem, not Object.prototype');
  egy.flag = 'EGY_REP';
  // The saved campaign keeps the rebrand.
  const revived = reviveGame(JSON.parse(JSON.stringify(g)));
  ok(revived && revived.tags.EGY.flag === 'EGY_REP' && revived.tags.EGY.name === 'Republic of Egypt',
    'the rebrand survives a save round-trip');
  // A real tag switch flies its own banner: no inherited variant.
  ok(switchTagCore(ctx, 'EGY', 'UAR'), 'the republic proclaims the UAR');
  ok(g.tags.UAR.flag === undefined, 'the UAR flies its own flag — the variant died with the old identity');
  ok(g.tags.UAR.name === 'United Arab Republic', 'the UAR takes its own name');
}

console.log('== the July revolution rebrands Iraq ==');
{
  const { g, ctx } = boot(BOOKMARK_1948, 'ISR');
  const ev = EVENTS_1948.find((e) => e && e.id === 'ev_i_iraqi_revolution');
  ok(!!ev, 'the Iraqi revolution event exists');
  ev.options[0].effects(ctx);
  const irq = g.tags.IRQ;
  ok(irq.govType === 'republic' && irq.name === 'Republic of Iraq' && irq.flag === 'IRQ_REP',
    'Iraq becomes the Republic of Iraq under Qasim\'s tricolor');
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
