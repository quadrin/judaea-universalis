// Headless regression — SPEC §290: ships sail on water.
//
// js/map/searoutes.js finds the way a hull is drawn between two harbors. On a
// made-up sea with a peninsula between the harbors:
//   - the route starts and ends exactly on the two anchors;
//   - no point of it, and no point between its points, is on land;
//   - it goes round the peninsula, so it is longer than the straight line,
//     and not absurdly so;
//   - walking it, the point moves forward the whole way and the heading
//     follows the course;
//   - the way back is the way out, reversed, and both are cached;
//   - a strait too narrow for open water is still found through the
//     shallows layer; with no water at all, or no grid, the route is the
//     straight line the map always drew.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { createSeaRoutes, pointAt, slice } = await import(R + '/js/map/searoutes.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// A 60×40 grid of 20-pixel cells: sea everywhere, and a peninsula from the
// north shore down to row 30 at columns 28–31.
const CELL = 20;
const GW = 60;
const GH = 40;
function makeGrid(landAt) {
  const nav = new Uint8Array(GW * GH);
  const wet = new Uint8Array(GW * GH);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const land = landAt(x, y);
      nav[y * GW + x] = land === 0 ? 1 : 0;
      wet[y * GW + x] = land === 2 ? 0 : 1; // 1 = shallows (wet, not nav), 2 = dry land
    }
  }
  return { cell: CELL, gw: GW, gh: GH, nav, wet };
}
const peninsula = (x, y) => (x >= 28 && x <= 31 && y <= 30 ? 2 : 0);
const A = { x: 10 * CELL, y: 8 * CELL };  // west of the peninsula
const B = { x: 50 * CELL, y: 8 * CELL };  // east of it
const geom = { seaGrid: makeGrid(peninsula), offshore: [null, A, B], centroids: [null, A, B] };
const onLand = (g, p) => {
  const cx = Math.floor(p.x / g.cell);
  const cy = Math.floor(p.y / g.cell);
  return !g.nav[cy * g.gw + cx];
};

console.log('== round the peninsula ==');
const routes = createSeaRoutes(geom);
const r = routes.route(1, 2);
ok(!!r && r.pts.length > 2, 'a route with ' + (r ? r.pts.length : 0) + ' points');
ok(r.pts[0].x === A.x && r.pts[0].y === A.y && r.pts[r.pts.length - 1].x === B.x && r.pts[r.pts.length - 1].y === B.y,
  'it starts and ends on the anchors');
const dense = slice(r, 0, r.len, 2);
ok(dense.every((p) => !onLand(geom.seaGrid, p)), `no point of it is on land (${dense.length} checked, every 2 px)`);
const straight = Math.hypot(B.x - A.x, B.y - A.y);
ok(r.len > straight * 1.2 && r.len < straight * 2.2,
  `it goes round, not through: ${Math.round(r.len)} px against ${Math.round(straight)} straight`);
const south = Math.max(...r.pts.map((p) => p.y));
ok(south > 30 * CELL, 'it passes south of the peninsula\'s tip: ' + Math.round(south));

console.log('== walking it ==');
let prev = -1;
let forward = true;
for (let k = 0; k <= 100; k++) {
  const p = pointAt(r, k / 100);
  if (p.s < prev - 1e-6) forward = false;
  prev = p.s;
}
ok(forward, 'the distance run only grows');
const start = pointAt(r, 0.02);
const mid = pointAt(r, 0.5);
const end = pointAt(r, 0.98);
ok(Math.sin(start.heading) > 0.3, 'she sets out heading south (round the cape): ' + start.heading.toFixed(2));
ok(Math.abs(Math.cos(mid.heading)) > 0.7 && Math.cos(mid.heading) > 0, 'mid-way she runs east under the cape: ' + mid.heading.toFixed(2));
ok(Math.sin(end.heading) < -0.3, 'and comes up north into the harbor: ' + end.heading.toFixed(2));
ok(pointAt(r, -1).s === 0 && pointAt(r, 2).s === r.len, 'fractions outside 0–1 hold at the ends');

console.log('== the way back, and the cache ==');
const back = routes.route(2, 1);
ok(Math.abs(back.len - r.len) < 1e-6 && back.pts[0].x === B.x && back.pts[back.pts.length - 1].x === A.x, 'the way back is the way out, reversed');
ok(routes.route(1, 2) === r && routes.route(2, 1) === back, 'both are cached');

console.log('== a narrow strait, and no water at all ==');
{
  // the peninsula reaches the south shore, but its last row is shallows
  const strait = (x, y) => (x >= 28 && x <= 31 ? (y === GH - 1 ? 1 : 2) : 0);
  const g2 = { seaGrid: makeGrid(strait), offshore: [null, A, B], centroids: [null, A, B] };
  const r2 = createSeaRoutes(g2).route(1, 2);
  const deep = Math.max(...r2.pts.map((p) => p.y));
  ok(deep > (GH - 2) * CELL, 'a strait too narrow for open water is sailed through the shallows: ' + Math.round(deep));
  const wall = (x) => (x >= 28 && x <= 31 ? 2 : 0);
  const g3 = { seaGrid: makeGrid(wall), offshore: [null, A, B], centroids: [null, A, B] };
  const r3 = createSeaRoutes(g3).route(1, 2);
  ok(r3.pts.length === 2 && r3.len === straight, 'no water joins them: the straight line');
  const r4 = createSeaRoutes({ offshore: [null, A, B], centroids: [null, A, B] }).route(1, 2);
  ok(r4.pts.length === 2 && r4.len === straight, 'no grid (the headless harness): the straight line');
  ok(createSeaRoutes(geom).route(1, 9) === null, 'a harbor with no anchor has no route');
}

console.log('== the fine grid keeps the line off a cape the coarse grid misses ==');
{
  // The peninsula's tip runs half a cell further south than the coarse grid
  // shows: the cells of row 31 are mostly sea, but their top half is land.
  const g = makeGrid(peninsula);
  const FW = GW * 2;
  const FH = GH * 2;
  const sea = new Uint8Array(FW * FH);
  for (let y = 0; y < FH; y++) {
    for (let x = 0; x < FW; x++) {
      const coarseLand = !g.nav[(y >> 1) * GW + (x >> 1)];
      const tip = y === 62 && x >= 56 && x <= 63;
      sea[y * FW + x] = coarseLand || tip ? 0 : 1;
    }
  }
  g.fine = { cell: CELL / 2, gw: FW, gh: FH, sea };
  const rf = createSeaRoutes({ seaGrid: g, offshore: [null, A, B], centroids: [null, A, B] }).route(1, 2);
  const pts = slice(rf, 0, rf.len, 2);
  const fineOk = (p) => sea[Math.floor(p.y / 10) * FW + Math.floor(p.x / 10)] === 1;
  ok(pts.every(fineOk), 'no point of the route is on the fine grid\'s land (' + pts.length + ' checked)');
  const under = pts.filter((p) => p.x >= 28 * CELL && p.x < 32 * CELL);
  ok(under.length > 0 && under.every((p) => p.y >= 630), 'under the cape it keeps below the hidden tip: ' + Math.round(Math.min(...under.map((p) => p.y))));
}

console.log('== a new map profile clears the cache ==');
{
  const g = { seaGrid: makeGrid(peninsula), offshore: [null, A, B], centroids: [null, A, B] };
  const rs = createSeaRoutes(g);
  const r1 = rs.route(1, 2);
  g.seaGrid = makeGrid(() => 0); // open water everywhere
  const r2 = rs.route(1, 2);
  ok(r2 !== r1 && r2.len < r1.len, `new water, new route: ${Math.round(r2.len)} px, was ${Math.round(r1.len)}`);
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
