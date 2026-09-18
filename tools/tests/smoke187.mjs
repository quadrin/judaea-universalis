// Headless regression — SPEC §271: the Iron Age chapters draw the Levant's
// provinces along its landscape, and nobody else's borders move.
//
// The three Iron Age chapters carry `bookmark.mapRegions`: a ring list in the
// §232 form, painted into the ID raster after the atlas's own country rings,
// so that a pixel inside a ring is contested only by that ring's cells. The
// rings are landscape units — the Jezreel, the Shephelah, Gilead, the plateau
// of Moab — and their edges are the Jordan, the Yarmuk, the Jabbok, the
// Carmel, the Lebanon crest. What this suite holds:
//
//   1. exactly the three Iron Age chapters carry rings; every other chapter
//      carries none, so the renderer never rebuilds a raster for them and the
//      atlas raster stands byte for byte — and the atlas's own countryRegions
//      name none of the Iron Age rings;
//   2. every ring is well formed: three or more points, a simple polygon,
//      cells that exist, no cell in two rings, every cell's seed inside its
//      own ring, and every latent cell listed beside its parent;
//   3. every cell the era plays whose seed lies inside a ring is listed by
//      that ring — an unlisted active seed would claim nothing and a province
//      would render with no ground;
//   4. the rings tile: no two rings overlap on land (their land borders are
//      shared vertices, not overshoots), and the flat shared edges leave no
//      unpainted row (the provshape fill used to skip the top row of every
//      ring — the bug §271 fixed in the tool);
//   5. the era raster says what the section claims: every listed active cell
//      has ground, the Balqa does not cross the Jordan to Shechem or Bethel,
//      Moab does not run to Bashan, and the Jezreel is one valley between
//      the Galilee, Ibleam and Beth-Shean;
//   6. an undrawn chapter's raster is the base diagram folded — the Node tool
//      still folds one identity pass for the nine later chapters.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { buildProvinceMapping, mapProfileKey } = await import(R + '/js/data/map_profile.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { IRON_AGE_REGIONS, MAP_REGIONS } = await import(R + '/js/data/iron_age_map.js');
const { buildFrame, rasterise, chapter, chapterRegions, fold, shapes, THEATRE } = await import(R + '/tools/provshape.mjs');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const P = MAP_DATA.provinces;
const byName = new Map(P.map((p, i) => [p.name, { p, id: i + 1 }]));
const IRON = ['931bce', '732bce', '597bce'];
const era = (id) => ERAS.find((e) => e.bookmark.id === id).bookmark;

const inRing = (ring, lon, lat) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < xi + ((lat - yi) / (yj - yi)) * (xj - xi)) inside = !inside;
  }
  return inside;
};
// Proper crossing of two closed segments (shared endpoints do not count).
const cross = (a, b, c, d) => {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0) && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0;
};
const simple = (ring) => {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (cross(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) return false;
    }
  }
  return true;
};

console.log('== 1. who draws ==');
{
  for (const e of ERAS) {
    const has = Array.isArray(e.bookmark.mapRegions) && e.bookmark.mapRegions.length > 0;
    ok(has === IRON.includes(e.bookmark.id),
      `${e.bookmark.id} ${has ? 'draws its borders' : 'renders the atlas raster'}`);
  }
  ok(Object.keys(MAP_REGIONS).sort().join(',') === IRON.slice().sort().join(','),
    'MAP_REGIONS names exactly the three Iron Age chapters');
  ok(IRON.every((id) => era(id).mapRegions === IRON_AGE_REGIONS),
    'all three chapters share one ring list — the ground is the same in all three centuries');
  const atlasNames = new Set((MAP_DATA.countryRegions || []).map((r) => r.name));
  ok(IRON_AGE_REGIONS.every((r) => !atlasNames.has(r.name)),
    'the atlas countryRegions name none of the Iron Age rings');
  ok((MAP_DATA.countryRegions || []).length + IRON_AGE_REGIONS.length <= 255,
    'the atlas rings and the era rings fit the R8 paint index together');
  const k931 = mapProfileKey(era('931bce'));
  const k66 = mapProfileKey(era('66ce'));
  const k167 = mapProfileKey(era('167bce'));
  ok(k931 !== k66 && k931.length > k66.length, 'the profile key tells a drawn chapter from an undrawn one');
  const ringPart = (k) => k.split('||')[2];
  ok(ringPart(k931).length > 0 && ringPart(k931) === ringPart(mapProfileKey(era('732bce')))
    && ringPart(k931) === ringPart(mapProfileKey(era('597bce'))),
    'the three Iron Age chapters key the same rings (their merges may differ: 931 folds Seleucia Pieria)');
  ok(k66.endsWith('||') && k167.endsWith('||'), 'an undrawn chapter keys with an empty ring segment');
}

console.log('== 2. every ring is well formed ==');
{
  const seen = new Map();
  const activated = new Set(era('931bce').activeProvinces || []);
  for (const reg of IRON_AGE_REGIONS) {
    ok(Array.isArray(reg.ring) && reg.ring.length >= 3, `${reg.name}: ${(reg.ring || []).length} points`);
    ok(simple(reg.ring), `${reg.name}: a simple polygon`);
    ok(Array.isArray(reg.cells) && reg.cells.length >= 1, `${reg.name}: names at least one cell`);
    for (const c of reg.cells) {
      const cell = byName.get(c);
      ok(!!cell, `${reg.name}: ${c} exists`);
      if (!cell) continue;
      ok(!seen.has(c), `${c} is listed once (${seen.get(c) || reg.name})`);
      seen.set(c, reg.name);
      ok(inRing(reg.ring, cell.p.lon, cell.p.lat), `${c}'s seed lies inside ${reg.name}`);
      if (cell.p.latentParent && !activated.has(c)) {
        // A latent the era does not activate is listed beside its parent, or
        // beside the cell its chain resolves to (Shobak → Zoara → Petra); one
        // the era activates (Hazor, Megiddo, Bethel…) stands in its own ring.
        let parent = cell.p.latentParent;
        let guard = 0;
        while (byName.get(parent) && byName.get(parent).p.latentParent && guard++ < 8) parent = byName.get(parent).p.latentParent;
        ok(reg.cells.includes(cell.p.latentParent) || reg.cells.includes(parent),
          `${c} (latent) is listed beside its parent ${cell.p.latentParent} in ${reg.name}`);
      }
    }
  }
}

console.log('== 3. every active seed inside a ring is listed ==');
{
  const mapping = buildProvinceMapping(MAP_DATA, era('931bce'));
  const listed = new Map();
  for (const reg of IRON_AGE_REGIONS) for (const c of reg.cells) listed.set(c, reg.name);
  let activeInRings = 0;
  for (const [i, p] of P.entries()) {
    if (mapping[i + 1] !== i + 1) continue; // folded away in the era
    const home = IRON_AGE_REGIONS.filter((r) => inRing(r.ring, p.lon, p.lat)).map((r) => r.name);
    if (!home.length) continue;
    activeInRings++;
    ok(home.length === 1, `${p.name}'s seed is inside one ring only (${home.join(', ')})`);
    ok(listed.get(p.name) === home[0], `${p.name} is listed by the ring its seed sits in (${home[0]})`);
  }
  ok(activeInRings >= 40, `the rings seat ${activeInRings} of the era's provinces (>= 40)`);
  // The named landscape, cell by cell — the section's claims, checked by name.
  const where = (c) => listed.get(c);
  ok(where('Afula') === 'The Jezreel' && where('Scythopolis') === 'The Beth-Shean valley'
    && where('Jenin') === 'Ibleam', 'Megiddo, Beth-Shean and Ibleam each hold their own valley or hills');
  ok(where('Gadora') === 'The Balqa' && where('Philadelphia') === 'Ammon' && where('Medaba') === 'Moab'
    && where('Petra') === 'Edom' && where('Aila') === 'The Arabah', 'east of the Jordan: the Balqa, Ammon, Moab, Edom, the Arabah');
  ok(where('Gaza') === 'The coastal plain' && where('Joppa') === 'The coastal plain'
    && where('Kiryat Gat') === 'The Shephelah' && where('Jerusalem') === 'The Judean hills'
    && where('Engaddi') === 'The wilderness of Judah', 'the plain, the Shephelah, the ridge and the wilderness are four bands');
  ok(where('Damascus') === undefined, 'Damascus is not ringed: the Ghutah keeps the atlas diagram');
}

console.log('== 4. the rings tile ==');
{
  const frame = buildFrame(THEATRE, 1, chapterRegions(era('931bce')));
  const { W, H, land, project } = frame;
  const paint = IRON_AGE_REGIONS.map((reg) => {
    const m = new Uint8Array(W * H);
    const pts = reg.ring.map((p) => project(p[0], p[1]));
    let yMin = Infinity, yMax = -Infinity;
    for (const p of pts) { if (p[1] < yMin) yMin = p[1]; if (p[1] > yMax) yMax = p[1]; }
    for (let y = Math.max(0, Math.ceil(yMin - 0.5)); y <= Math.min(H - 1, Math.floor(yMax - 0.5)); y++) {
      const xs = [];
      const yc = y + 0.5;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if ((yi > yc) !== (yj > yc)) xs.push(xi + ((yc - yi) / (yj - yi)) * (xj - xi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(W - 1, Math.floor(xs[k + 1] - 0.5)); x++) m[y * W + x] = 1;
      }
    }
    return m;
  });
  let overlaps = 0;
  for (let a = 0; a < paint.length; a++) {
    for (let b = a + 1; b < paint.length; b++) {
      let n = 0;
      for (let i = 0; i < W * H; i++) if (land[i] && paint[a][i] && paint[b][i]) n++;
      if (n) { overlaps++; console.error(`    ${IRON_AGE_REGIONS[a].name} × ${IRON_AGE_REGIONS[b].name}: ${n} px`); }
    }
  }
  ok(overlaps === 0, 'no two rings overlap on land');
  // The flat shared edge above Hazor: every land pixel along it is painted.
  const base = (MAP_DATA.countryRegions || []).length;
  const [x0, y0] = project(35.52, 33.06);
  const [x1] = project(35.68, 33.06);
  let unpainted = 0;
  for (let y = Math.floor(y0) - 1; y <= Math.floor(y0) + 1; y++) {
    for (let x = Math.ceil(x0); x < Math.floor(x1); x++) if (land[y * W + x] && !frame.region[y * W + x]) unpainted++;
  }
  ok(unpainted === 0, `no unpainted row along the Hula–Hazor edge (${unpainted} px)`);
  const hula = base + IRON_AGE_REGIONS.findIndex((r) => r.name === 'The Hula') + 1;
  const hazor = base + IRON_AGE_REGIONS.findIndex((r) => r.name === 'Hazor') + 1;
  ok(frame.region[(Math.floor(y0) - 1) * W + Math.floor((x0 + x1) / 2)] === hula
    && frame.region[(Math.floor(y0) + 1) * W + Math.floor((x0 + x1) / 2)] === hazor,
    'the Hula is north of the line and Hazor south of it');
  // The rings leave no pocket: every unpainted land pixel that touches era
  // paint must be connected, over unpainted land, to the world outside the
  // rings (the frame's edge). A hole between three rings — a triangle none
  // of them claims — is enclosed, and its pixels would go to whichever
  // unringed seed is nearest, which can be a province three landscapes away.
  // (Single pixels at a vertex two rings share against unringed ground are
  // outside the rings and connected to the world; they are not pockets.)
  {
    const reach = new Uint8Array(W * H);
    const stack = [];
    for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
    for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
    for (const s of stack) if (!frame.region[s] && land[s]) reach[s] = 1;
    const queue = stack.filter((s) => reach[s]);
    for (let head = 0; head < queue.length; head++) {
      const at = queue[head];
      const x = at % W, y = (at / W) | 0;
      for (const next of [x > 0 ? at - 1 : -1, x + 1 < W ? at + 1 : -1, y > 0 ? at - W : -1, y + 1 < H ? at + W : -1]) {
        if (next < 0 || reach[next] || frame.region[next] || !land[next]) continue;
        reach[next] = 1;
        queue.push(next);
      }
    }
    let pocket = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const at = y * W + x;
        if (frame.region[at] || !land[at] || reach[at]) continue;
        const touchesEra = [at - 1, at + 1, at - W, at + W].some((n) => frame.region[n] > base);
        if (touchesEra) pocket++;
      }
    }
    ok(pocket === 0, `no land pocket is enclosed between the rings (${pocket} px)`);
  }
}

console.log('== 5. the era raster ==');
{
  const { frame, mapping, ids, report } = await chapter('931bce', { bbox: THEATRE, scale: 1 });
  ok(frame.regionOfCell.get('Afula') > (MAP_DATA.countryRegions || []).length,
    'the chapter frame paints the era rings');
  const area = new Map(report.map((r) => [r.name, r.area]));
  const nb = new Map(report.map((r) => [r.name, new Set(r.neighbours.map((n) => n.name))]));
  for (const reg of IRON_AGE_REGIONS) {
    for (const c of reg.cells) {
      const id = byName.get(c).id;
      if (mapping[id] !== id) continue;
      ok((area.get(c) || 0) > 0, `${c} has ground in ${reg.name}`);
    }
  }
  const touches = (a, b) => (nb.get(a) || new Set()).has(b);
  ok(!touches('Gadora', 'Neapolis') && !touches('Gadora', 'Sebaste') && !touches('Gadora', 'Ramallah'),
    'the Balqa (Ramoth-Gilead) no longer crosses the Jordan to Shechem, Tirzah or Bethel');
  ok(touches('Gadora', 'Jericho') && touches('Gadora', 'Philadelphia'),
    'the Balqa faces Jericho across the river and Rabbah on the plateau');
  ok(!touches('Medaba', 'Batanea') && !touches('Medaba', 'Gadara'),
    'Moab no longer runs north to Bashan or Gilead');
  ok(touches('Medaba', 'Philadelphia') && touches('Medaba', 'Petra'),
    'Moab lies between Ammon and Edom');
  ok(touches('Afula', 'Sepphoris') && touches('Afula', 'Jenin') && touches('Afula', 'Scythopolis'),
    'the Jezreel meets the Lower Galilee, Ibleam and Beth-Shean');
  ok(touches('Scythopolis', 'Pella') && touches('Scythopolis', 'Jericho'),
    'the Jordan valley faces Jabesh-Gilead across the river and runs to Jericho');
  ok(!touches('Sepphoris', 'Scythopolis'), 'the Lower Galilee and Beth-Shean are parted by the valley');
  ok(touches('Neapolis', 'Sebaste') && touches('Neapolis', 'Ramallah') && !touches('Neapolis', 'Jenin'),
    'Ephraim lies between Manasseh and Benjamin, with Ibleam beyond Manasseh');
  ok(touches('Gaza', 'Ascalon') && touches('Kiryat Gat', 'Hebron') && !touches('Gaza', 'Hebron'),
    'the plain, the Shephelah and the ridge are three bands in order');
  // The river is the border: the only west-bank provinces that touch an
  // east-bank one are the two whose ring runs along the Jordan (the valley
  // of Beth-Shean and Jericho), and they touch only the rings whose west
  // edge is the river (Gilead, the Balqa, Moab).
  const ringOf = new Map();
  for (const reg of IRON_AGE_REGIONS) for (const c of reg.cells) ringOf.set(c, reg.name);
  const westBank = ['Jericho', 'Scythopolis', 'Neapolis', 'Sebaste', 'Ramallah', 'Jerusalem', 'Engaddi', 'Hebron', 'Jenin', 'Afula', 'Tiberias'];
  const eastBank = ['Gadara', 'Pella', 'Gerasa', 'Gadora', 'Philadelphia', 'Medaba', 'Batanea'];
  const riverWest = new Set(['The Beth-Shean valley', 'Jericho', 'Chinnereth']); // Chinnereth's east edge is the outflow
  const riverEast = new Set(['Gilead', 'The Balqa', 'Moab']);
  let crossings = 0;
  for (const w of westBank) {
    for (const e of eastBank) {
      if (!touches(w, e)) continue;
      if (riverWest.has(ringOf.get(w)) && riverEast.has(ringOf.get(e))) continue;
      crossings++;
      console.error(`    ${w} touches ${e}`);
    }
  }
  ok(crossings === 0, `only the river-bank provinces face each other across the Jordan (${crossings} other contacts)`);
  // Both other Iron Age chapters render the same diagram over the Levant;
  // only the fold differs (931 alone folds Seleucia Pieria, up the coast).
  const r732 = await chapter('732bce', { bbox: THEATRE, scale: 1 });
  const r597 = await chapter('597bce', { bbox: THEATRE, scale: 1 });
  const [lx0, ly1] = frame.project(34.0, 29.3);
  const [lx1, ly0] = frame.project(37.0, 34.9);
  let same = true;
  for (let y = Math.max(0, Math.floor(ly0)); y < Math.min(frame.H, ly1) && same; y++) {
    for (let x = Math.max(0, Math.floor(lx0)); x < Math.min(frame.W, lx1); x++) {
      const i = y * frame.W + x;
      if (ids[i] !== r732.ids[i] || ids[i] !== r597.ids[i]) { same = false; break; }
    }
  }
  ok(same, '732 and 597 render the same Levant as 931 (same rings, same fold)');
}

console.log('== 6. an undrawn chapter is the base diagram folded ==');
{
  const frame = buildFrame(THEATRE, 1);
  ok(!frame.regionOfCell.has('Afula'), 'the default frame paints the atlas rings only');
  const base = rasterise(frame);
  const r66 = await chapter('66ce', { frame, base });
  const folded = fold(base, buildProvinceMapping(MAP_DATA, era('66ce')));
  let same = true;
  for (let i = 0; i < folded.length; i++) if (folded[i] !== r66.ids[i]) { same = false; break; }
  ok(same, '66 CE is the identity raster folded, as before');
  const s66 = shapes(frame, folded);
  const nb66 = new Map(s66.map((r) => [r.name, new Set(r.neighbours.map((n) => n.name))]));
  ok(nb66.get('Gadora').has('Jericho'), 'the atlas diagram keeps its old contacts for the later chapters');
  ok(era('66ce').mapRegions === null && era('1948ce').mapRegions === null,
    'the registry attaches no rings to 66 CE or 1948');
}

console.log(failures ? `smoke187: ${failures} FAIL` : 'smoke187: ALL PASS');
process.exit(failures ? 1 : 0);
