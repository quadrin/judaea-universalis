// Headless regression — SPEC §232: the countries are drawn, not grown.
//
// Two halves. The DRAWN BORDERS: nineteen painter-ordered country rings whose
// painted raster the ID pass obeys absolutely — a seed claims only its own
// country's pixels, so the ring is the border to the pixel, and everything
// outside every ring (the whole Levant theatre among it) rasterizes exactly
// as before. The CONSOLIDATION: 1948's established world folds into one
// province per country, wearing the country's name and carrying the family's
// exact development, while the theatre keeps the districts the war is fought
// in. Belgium and Luxembourg exist at last, carved conservation-exact out of
// the four cells whose raster spill used to cover them.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { MAP_DATA, validateMapData, rasterizeCountryRegions, landTesterPx } = await import(R + '/js/data/map_data.js');
const { POLITICAL_MAPS } = await import(R + '/js/data/political_maps.js');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');
const { initGame, makeCtx } = await import(R + '/js/sim/init.js');
const { ERAS } = await import(R + '/js/data/compendium.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};
const cellOf = (name) => MAP_DATA.provinces.find((p) => p && p.name === name) || null;
const idOf = (name) => MAP_DATA.provinces.findIndex((p) => p && p.name === name) + 1;

// ---------------------------------------------------------------------------
console.log('== the rings agree with the atlas ==');
{
  ok(validateMapData().length === 0, 'validateMapData holds at zero warnings, region checks included');
  const regions = MAP_DATA.countryRegions || [];
  ok(regions.length === 19, 'nineteen countries are drawn (' + regions.length + ')');
  const seen = new Set();
  for (const reg of regions) {
    for (const nm of reg.cells) {
      ok(!!cellOf(nm), reg.name + ': member cell ' + nm + ' exists');
      ok(!seen.has(nm), '  and appears in one country only');
      seen.add(nm);
    }
  }
}

// ---------------------------------------------------------------------------
console.log('== the painted raster puts the right city in the right country ==');
// Healed exactly as the renderer heals: gated to land. An ungated heal
// FLOODED the open sea between different countries' overshoots, and the ID
// pass's bilinear coast then bound one-pixel beads to members three
// countries away — Siscia on the Ligurian shore, Frisia off Cádiz — whose
// phantom adjacencies stalled Rome's second century (smoke78).
const painted = rasterizeCountryRegions(MAP_DATA, landTesterPx(MAP_DATA));
{
  const W = MAP_DATA.MAP_W;
  const names = ['(none)'].concat(MAP_DATA.countryRegions.map((r) => r.name));
  const at = (lon, lat) => {
    const [x, y] = MAP_DATA.project(lon, lat);
    return names[painted[Math.round(y) * W + Math.round(x)]];
  };
  // The sharp corners of the 1948 map, each within a few pixels of a border
  // the ring must respect: the Geneva pocket, the Dutch Limburg appendage,
  // the Athus tripoint, the 1947 Alpine and Isonzo lines, and the Evros.
  for (const [nm, lon, lat, want] of [
    ['Paris', 2.35, 48.85, 'France'], ['Brussels', 4.35, 50.85, 'Belgium'],
    ['Luxembourg City', 6.13, 49.61, 'Luxembourg'], ['Amsterdam', 4.90, 52.37, 'Netherlands'],
    ['Maastricht', 5.69, 50.85, 'Netherlands'], ['Aachen', 6.08, 50.78, 'Germany'],
    ['Arlon', 5.82, 49.68, 'Belgium'], ['Geneva', 6.15, 46.20, 'Switzerland'],
    ['Annemasse', 6.24, 46.19, 'France'], ['Évian', 6.59, 46.40, 'France'],
    ['Strasbourg', 7.75, 48.58, 'France'], ['Freiburg', 7.85, 47.99, 'Germany'],
    ['Bolzano', 11.35, 46.50, 'Italy'], ['Innsbruck', 11.40, 47.27, 'Austria'],
    ['Trieste', 13.77, 45.65, 'Italy'], ['Rijeka', 14.44, 45.33, 'Yugoslavia'],
    ['Madrid', -3.70, 40.42, 'Spain'], ['Lisbon', -9.14, 38.72, 'Portugal'],
    ['Gdańsk', 18.65, 54.35, 'Poland'], ['Wrocław', 17.03, 51.11, 'Poland'],
    ['Dresden', 13.74, 51.05, 'Germany'], ['Prague', 14.42, 50.09, 'Czechoslovakia'],
    ['Bratislava', 17.11, 48.15, 'Czechoslovakia'], ['Salonika', 22.95, 40.64, 'Greece'],
    ['Skopje', 21.43, 42.00, 'Yugoslavia'], ['Cluj', 23.60, 46.77, 'Romania'],
  ]) {
    ok(at(lon, lat) === want, nm + ' paints ' + want + ' (' + at(lon, lat) + ')');
  }
  // …and the ground the rings must NOT reach: Turkey, the SSRs, the islands
  // that are countries' by coastline alone.
  for (const [nm, lon, lat] of [
    ['Edirne', 26.55, 41.68], ['Istanbul', 28.98, 41.01], ['Lviv', 24.03, 49.84],
    ['Kaliningrad', 20.50, 54.71], ['Chișinău', 28.86, 47.01], ['Palermo', 13.36, 38.12],
    ['Ajaccio', 8.74, 41.92], ['Copenhagen', 12.57, 55.68],
  ]) {
    ok(at(lon, lat) === '(none)', nm + ' stays outside every ring (' + at(lon, lat) + ')');
  }
  // Coastal waters may carry only their OWN country's overshoot — never a
  // foreign flood. These four are the measured bead sites and two controls.
  for (const [nm, lon, lat, allowed] of [
    ['the Ligurian sea off Genoa', 8.73, 43.87, ['(none)', 'Italy']],
    ['the Gulf of Cádiz', -7.59, 36.86, ['(none)', 'Spain', 'Portugal']],
    ['the open sea south of Sardinia', 8.00, 38.50, ['(none)']],
    ['the mid-Adriatic', 15.20, 43.30, ['(none)', 'Italy', 'Yugoslavia']],
  ]) {
    ok(allowed.indexOf(at(lon, lat)) >= 0,
      nm + ' carries no foreign paint (' + at(lon, lat) + ')');
  }
  // Every member seed sits on its own painted ground — the shader eligibility
  // test would otherwise strand the cell at zero area.
  let seedsHome = 0, seedsTotal = 0;
  MAP_DATA.countryRegions.forEach((reg, idx) => {
    for (const nm of reg.cells) {
      const p = cellOf(nm);
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      seedsTotal++;
      if (painted[Math.round(y) * W + Math.round(x)] === idx + 1) seedsHome++;
    }
  });
  ok(seedsHome === seedsTotal, 'every member seed sits on its own painted ground ('
    + seedsHome + '/' + seedsTotal + ')');
}

// ---------------------------------------------------------------------------
console.log('== the theatre is not touched ==');
{
  // No ring reaches east of the Romanian delta: the Levant, Anatolia, Egypt
  // and everything the eight campaigns were tuned on rasterize exactly as
  // §231 left them. 30°E is west of every theatre cell and east of every
  // ring point.
  let maxLon = -Infinity;
  for (const reg of MAP_DATA.countryRegions) {
    for (const [lon] of reg.ring) if (lon > maxLon) maxLon = lon;
  }
  ok(maxLon < 30, 'the easternmost ring point is ' + maxLon.toFixed(2)
    + '°E — the drawn borders end before the theatre begins');
  const [xCut] = MAP_DATA.project(30, 30);
  const W = MAP_DATA.MAP_W, H = MAP_DATA.MAP_H;
  let paintedEast = 0;
  for (let y = 0; y < H; y += 7) {
    for (let x = Math.ceil(xCut); x < W; x += 7) {
      if (painted[y * W + x]) paintedEast++;
    }
  }
  ok(paintedEast === 0, 'and no pixel east of 30°E is painted at all (strided scan)');
}

// ---------------------------------------------------------------------------
console.log('== Belgium and Luxembourg exist, and their wealth came from somewhere ==');
{
  const atua = cellOf('Atuatuca');
  const lux = cellOf('Luxembourg');
  ok(!!atua && !atua.latentParent, 'Atuatuca is a permanent cell — Belgica in every chapter');
  ok(!!lux && lux.latentParent === 'Augusta Treverorum', 'Luxembourg is latent under Trier');
  // §47: carved development comes OUT of the donors. Atuatuca is a BASE
  // carve (it exists in every era, so its four donors gave at the base and
  // the identity holds in every chapter); Luxembourg's 1/1/1 is a 1948
  // carve, paid below out of Germany's consolidation sum — a base carve
  // from Trier would leak three points out of the seven chapters that fold
  // the Grand Duchy away, which is what smoke155 caught.
  const dev = (n) => { const d = cellOf(n).dev; return [d.tax, d.prod, d.mp]; };
  const sum = (...ns) => ns.map(dev).reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]);
  const now = sum('Samarobriva', 'Durocortorum', 'Colonia Agrippina', 'Batavia', 'Atuatuca');
  ok(now.join('/') === '9/13/12',
    'donors + Atuatuca still total the donors\' old 9/13/12 (' + now.join('/') + ')');
  for (const [era, want] of [['167bce', 'BLG'], ['67bce', 'BLG'], ['40bce', 'ROM'],
    ['66ce', 'ROM'], ['132ce', 'ROM'], ['529ce', 'FRK'], ['614ce', 'FRK'], ['1948ce', 'BEL']]) {
    ok(POLITICAL_MAPS[era].owners['Atuatuca'] === want,
      era + ': Atuatuca answers to ' + want);
  }
  ok(POLITICAL_MAPS['1948ce'].owners['Luxembourg'] === 'LUX', '1948: Luxembourg answers to LUX');
  ok(!!DEFINES.TAGS.BEL && !!DEFINES.TAGS.LUX, 'both courts exist in the catalog');
}

// ---------------------------------------------------------------------------
console.log('== 1948: the established world is one province per country ==');
const entry1948 = ERAS.find((e) => e.bookmark.id === '1948ce');
const bm = entry1948.bookmark;
const pm = buildProvinceMapping(MAP_DATA, bm);
{
  // The documented folds, survivor by survivor.
  const FOLDS = {
    Lutetia: ['Nemausus', 'Burdigala', 'Darioritum', 'Argentorate', 'Aleria'],
    Toletum: ['Gades', 'Barcino', 'Asturica', 'Baleares'],
    Olisipo: ['Bracara'],
    Britannia: ['Caledonia', 'Eboracum', 'Caledonia Ultima'],
    Hibernia: ['Mumu'],
    Batavia: ['Frisia'],
    Mogontiacum: ['Semnones', 'Colonia Agrippina', 'Augusta Vindelicorum'],
    Carnuntum: ['Virunum'],
    Selandia: ['Cimbria'],
    Roma: ['Mediolanum', 'Panormus', 'Caralis'],
    Singidunum: ['Salona', 'Naissus'],
    Serdica: ['Novae'],
    Tomis: ['Napoca'],
    Hyperborea: ['Aestii', 'Chersonesus', 'Chorasmia', 'Issedones'],
  };
  for (const [surv, cells] of Object.entries(FOLDS)) {
    const sid = idOf(surv);
    ok(pm[sid] === sid, surv + ' survives as itself');
    ok(cells.every((n) => pm[idOf(n)] === sid),
      '  and ' + cells.join(', ') + ' fold into it');
  }
  // The theatre does NOT consolidate: Israel's districts and every warring
  // neighbor's stay their own provinces; the two sealed Soviet Caucasus
  // cells stay apart from the union, because folding them into a passable
  // province would open the closed border they ARE (smoke29/41); every cell
  // that carries a community of the dispersion — living or remembered —
  // keeps the city the community is a fact about (smoke110/124/125); and
  // Greece, five-sixths community cities and an active court besides, does
  // not consolidate at all.
  for (const n of ['Jerusalem', 'Safed', 'Beersheba', 'Quneitra', 'Nineveh',
    'Damascus', 'Philadelphia', 'Memphis', 'Iconium', 'Ecbatana', 'Yathrib',
    'Phasis', 'Caucasian Albania',
    'Massilia', 'Narbo', 'Corduba', 'Londinium', 'Capua', 'Syracusae',
    'Athens', 'Thessalonica', 'Rhodes', 'Gortyn', 'Corinth', 'Sparta']) {
    ok(pm[idOf(n)] === idOf(n), n + ' keeps its own chair in 1948');
  }
  // …and the Luxembourg identity: the Grand Duchy's 1/1/1 came out of the
  // Germany consolidation sum, not out of Trier's base.
  {
    const fam = ['Mogontiacum', 'Colonia Agrippina', 'Augusta Treverorum',
      'Augusta Vindelicorum', 'Chatti', 'Teutoburgium', 'Semnones'];
    const base = fam.map((n) => cellOf(n).dev)
      .reduce((a, b) => [a[0] + b.tax, a[1] + b.prod, a[2] + b.mp], [0, 0, 0]);
    const dtG = (bm.devTweaks || {}).Mogontiacum;
    const lux = cellOf('Luxembourg').dev;
    ok(dtG && base[0] - dtG.tax === lux.tax && base[1] - dtG.prod === lux.prod
      && base[2] - dtG.mp === lux.mp,
      'Germany\'s family sum less its shipped figure IS Luxembourg\'s '
      + lux.tax + '/' + lux.prod + '/' + lux.mp);
  }
}

// ---------------------------------------------------------------------------
console.log('== the fold conserves every court\'s economy to the point ==');
{
  // Recompute each survivor's family sum from the atlas + the chapter's own
  // per-cell tweaks, and ask that the shipped devTweaks entry equals it.
  // "Every number the desc states is the number the check asks" (§227).
  const dt = bm.devTweaks || {};
  const merges = bm.mergeProvinces || {};
  const eff = (nm) => {
    // A merged cell's own tweak would be unreachable — assert none exists.
    const d = cellOf(nm).dev;
    return [d.tax, d.prod, d.mp];
  };
  const families = {};
  for (const [child, parent] of Object.entries(merges)) {
    (families[parent] = families[parent] || []).push(child);
    ok(!dt[child], child + ' carries no devTweak of its own under the fold');
  }
  for (const [surv, kids] of Object.entries(families)) {
    const all = [surv].concat(kids);
    const want = all.map(eff).reduce((a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], [0, 0, 0]);
    if (surv === 'Mogontiacum') {
      // Germany's family pays the Grand Duchy: Luxembourg's 1/1/1 is a 1948
      // carve out of this sum (the identity assertion below), not a base one.
      const lux = eff('Luxembourg');
      want[0] -= lux[0]; want[1] -= lux[1]; want[2] -= lux[2];
    }
    const got = dt[surv];
    ok(got && got.tax === want[0] && got.prod === want[1] && got.mp === want[2],
      surv + ': shipped ' + (got ? [got.tax, got.prod, got.mp].join('/') : 'nothing')
      + ' == recomputed ' + want.join('/'));
  }
  // Italy's blended levy, restated from the atlas: the seven full-levy cells
  // against the §173 north at 0.2.
  // Naples and Syracuse sit OUT of the fold with their communities, at their
  // own full share; the blend is over the five old cells the fold does hold.
  const OLD_ITA = ['Roma', 'Tarentum', 'Brundisium', 'Rhegium', 'Panormus'];
  const NORTH_ITA = ['Mediolanum', 'Genua', 'Bononia', 'Ravenna', 'Pisae', 'Ancona',
    'Aquileia', 'Caralis', 'Turris Libisonis'];
  const t = (n) => eff(n).reduce((a, b) => a + b, 0);
  const so = OLD_ITA.reduce((a, n) => a + t(n), 0);
  const sn = NORTH_ITA.reduce((a, n) => a + t(n), 0);
  const blend = (so * 1.0 + sn * 0.2) / (so + sn);
  ok(Math.abs((bm.levies || {}).Roma - blend) < 0.005,
    'Italy\'s levy ' + (bm.levies || {}).Roma + ' is the recomputed blend ' + blend.toFixed(4));
}

// ---------------------------------------------------------------------------
console.log('== the survivors wear their countries\' names, and old addresses still deliver ==');
{
  const N = MAP_DATA.provinces.length;
  const fakeGeom = {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
  };
  const game = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: bm, events: entry1948.events,
    playerTag: 'ISR', rngSeed: 7, provinceMap: pm,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom: fakeGeom, bus: { emit() {}, on() {} },
    bookmark: bm, events: entry1948.events, provinceMap: pm,
  });
  for (const [surv, label, owner] of [
    ['Lutetia', 'France', 'FRA'], ['Toletum', 'Spain', 'SPA'], ['Olisipo', 'Portugal', 'POR'],
    ['Britannia', 'United Kingdom', 'UK'], ['Hibernia', 'Ireland', 'IRL'],
    ['Batavia', 'Netherlands', 'NLD'], ['Mogontiacum', 'Germany', 'GER'],
    ['Carnuntum', 'Austria', 'AUT'], ['Selandia', 'Denmark', 'DEN'],
    ['Roma', 'Italy', 'ITA'], ['Singidunum', 'Yugoslavia', 'YUG'],
    ['Serdica', 'Bulgaria', 'BUL'], ['Tomis', 'Romania', 'ROU'],
    ['Hyperborea', 'Soviet Union', 'SOV'],
    ['Boiohaemum', 'Czechoslovakia', 'CZE'], ['Aquincum', 'Hungary', 'HUN'],
    ['Genava', 'Switzerland', 'SUI'], ['Scandia', 'Sweden', 'SWE'],
    ['Gothiscandza', 'Poland', 'POL'], ['Dyrrhachium', 'Albania', 'ALB'],
    ['Atuatuca', 'Belgium', 'BEL'],
  ]) {
    const p = ctx.prov(surv);
    ok(p && p.name === label && p.owner === owner,
      surv + ' is ' + label + ' under ' + owner + ' (' + (p ? p.name + '/' + p.owner : 'null') + ')');
  }
  // §232's name resolution: content addressed to a folded cell reaches the
  // province that holds its ground — the cold-war cards stir 'Semnones' and
  // reach Germany — while a community city kept OUT of the fold still
  // answers for itself.
  const sem = ctx.prov('Semnones');
  ok(sem && sem.canon === 'Mogontiacum', "'Semnones' delivers to Germany");
  const bdx = ctx.prov('Burdigala');
  ok(bdx && bdx.name === 'France', "'Burdigala' delivers to France");
  const kau = ctx.prov('Aestii');
  ok(kau && kau.name === 'Soviet Union', "'Aestii' delivers to the Soviet Union");
  const mas = ctx.prov('Massilia');
  ok(mas && mas.canon === 'Massilia' && mas.name === 'Marseille' && mas.owner === 'FRA',
    "'Massilia' is still Marseille's own cell — the community's city");
  const lon = ctx.prov('Londinium');
  ok(lon && lon.canon === 'Londinium' && lon.name === 'London' && lon.owner === 'UK',
    "'Londinium' is still London's own cell");
  // …and a name that exists in no atlas still misses.
  ok(ctx.prov('Atlantis') === null, 'an unknown name still resolves to nothing');
  // Every consolidated court still convenes: one province, full court.
  for (const tag of ['FRA', 'GER', 'SOV', 'ITA', 'BEL', 'LUX']) {
    ok(!!game.tags[tag], tag + ' convenes');
    const held = game.provinces.filter((p) => p && p.owner === tag).length;
    if (tag === 'FRA') ok(held > 10, '  France still governs its empire (' + held + ' provinces)');
    if (tag === 'BEL' || tag === 'LUX') ok(held === 1, '  ' + tag + ' holds exactly its one province');
  }
}

// ---------------------------------------------------------------------------
console.log('== the seven older chapters: Atuatuca yes, Luxembourg no ==');
{
  for (const era of ERAS) {
    const id = era.bookmark.id;
    if (id === '1948ce') continue;
    const map = buildProvinceMapping(MAP_DATA, era.bookmark);
    ok(map[idOf('Atuatuca')] === idOf('Atuatuca'), id + ': Atuatuca is a province');
    ok(map[idOf('Luxembourg')] === idOf('Augusta Treverorum'), id + ': Luxembourg folds to Trier');
    // No 1948 consolidation leaks backward: France's cells stay cells.
    ok(map[idOf('Massilia')] === idOf('Massilia'), id + ': Massilia is its own province');
    ok(map[idOf('Semnones')] === idOf('Semnones'), id + ': Semnones is its own province');
  }
}

// ---------------------------------------------------------------------------
console.log('== the renderer obeys the rings and pays for nothing twice ==');
{
  const SRC = readFileSync(R + '/js/map/renderer.js', 'utf8');
  ok(/uniform sampler2D uRegion/.test(SRC), 'the ID pass reads the painted countries');
  ok(/int\(seed\.w \+ 0\.5\) != reg/.test(SRC), 'a seed claims only its own country\'s pixels');
  ok(/gl\.deleteTexture\(regionTex\)/.test(SRC), 'and the paint is freed the moment the raster is read back');
  ok(/getImageData/.test(SRC) && /gl\.R8, w, h, 0, gl\.RED/.test(SRC),
    'the canvas planes upload as one byte a texel (§232 diet)');
  ok(!/texture\(uDecor, uv\)\.a/.test(SRC) && /texture\(uDecor, uv\)\.r/.test(SRC),
    'the river decor is read from the channel it is stored in');
}

console.log(failures ? `smoke157: ${failures} FAIL` : 'smoke157: ALL PASS');
process.exit(failures ? 1 : 0);
