#!/usr/bin/env node
// Judaea Universalis — the coastline checker (SPEC §160).
//
//   node tools/coastcheck.mjs            check, and write the preview PNG
//   node tools/coastcheck.mjs --quiet    check only, no PNG
//   JU_OUT=/tmp node tools/coastcheck.mjs
//
// validateMapData() checks province seeds against the polygons. Nothing
// checked the POLYGONS, and a coastline is the one part of this map that
// cannot be eyeballed from source: MAINLAND is a single closed loop of a
// thousand-odd points, and one mis-ordered pair anywhere in it makes the
// canvas fill flip inside-out over the crossed lobe — land where the sea
// should be, silently, with every downstream suite still green because the
// province seeds all still land on "land".
//
// So this holds the two things a polygon must be:
//
//   1. SIMPLE   — no segment crosses another in the same ring. This is the
//                 one that bites: an extension spliced into the wrong place
//                 in the loop self-intersects and renders as a bowtie.
//   2. DISJOINT — no two landmasses overlap. Islands must not sit inside the
//                 mainland ring, or the ID pass masks them as sea.
//
// plus the cheap ones: no duplicate consecutive points, at least 3 points,
// every vertex inside the frame, and lakes that actually sit on land.
//
// The PNG is the other half. Rasterizing the mask here — the same even-odd
// scanline fill the browser's `fill()` performs — means the coastline can be
// LOOKED at without a browser, a server and a WebGL context. It is written
// at 1/N scale to $JU_OUT/coast.png.
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

const R = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const OUT = (process.env.JU_OUT || '/tmp').replace(/\/$/, '');
const QUIET = process.argv.includes('--quiet');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

// --- geometry ---------------------------------------------------------------

// Proper segment intersection. Shared endpoints between ADJACENT segments of a
// ring are not crossings; anything else is. Collinear overlap counts, because
// a coastline that doubles back along itself is a zero-area spike that the
// rasterizer and the point-in-polygon test disagree about.
function orient(a, b, c) {
  const v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return v > 1e-12 ? 1 : (v < -1e-12 ? -1 : 0);
}
function onSeg(a, b, p) {
  return Math.min(a[0], b[0]) - 1e-12 <= p[0] && p[0] <= Math.max(a[0], b[0]) + 1e-12
    && Math.min(a[1], b[1]) - 1e-12 <= p[1] && p[1] <= Math.max(a[1], b[1]) + 1e-12;
}
function segCross(p1, p2, p3, p4) {
  const d1 = orient(p3, p4, p1), d2 = orient(p3, p4, p2);
  const d3 = orient(p1, p2, p3), d4 = orient(p1, p2, p4);
  if (d1 !== d2 && d3 !== d4) return true;
  if (d1 === 0 && onSeg(p3, p4, p1)) return true;
  if (d2 === 0 && onSeg(p3, p4, p2)) return true;
  if (d3 === 0 && onSeg(p1, p2, p3)) return true;
  if (d4 === 0 && onSeg(p1, p2, p4)) return true;
  return false;
}

// Segments of a closed ring, as [a, b] pairs.
const ringSegs = (poly) => poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);

// Sweep by longitude bucket so a 1200-point ring is not 720k pair tests.
function selfIntersections(poly, limit = 8) {
  const segs = ringSegs(poly);
  const n = segs.length;
  const hits = [];
  const order = segs.map((s, i) => i)
    .sort((a, b) => Math.min(segs[a][0][0], segs[a][1][0]) - Math.min(segs[b][0][0], segs[b][1][0]));
  const active = [];
  for (const i of order) {
    const lo = Math.min(segs[i][0][0], segs[i][1][0]);
    for (let k = active.length - 1; k >= 0; k--) {
      const j = active[k];
      if (Math.max(segs[j][0][0], segs[j][1][0]) < lo) { active.splice(k, 1); continue; }
      // adjacent segments legitimately share an endpoint
      const adj = (i + 1) % n === j || (j + 1) % n === i || i === j;
      if (adj) continue;
      if (segCross(segs[i][0], segs[i][1], segs[j][0], segs[j][1])) {
        hits.push([i, j]);
        if (hits.length >= limit) return hits;
      }
    }
    active.push(i);
  }
  return hits;
}

function crossRingIntersections(a, b, limit = 4) {
  const sa = ringSegs(a), sb = ringSegs(b);
  const hits = [];
  for (const s of sa) {
    for (const t of sb) {
      if (segCross(s[0], s[1], t[0], t[1])) {
        hits.push([s[0], t[0]]);
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

function pointInPolygon(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const signedArea = (poly) => {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return a / 2;
};

// --- the checks -------------------------------------------------------------

const LAND = MAP_DATA.coast.land;
const LAKES = MAP_DATA.coast.lakes || [];
const RIVERS = MAP_DATA.rivers || [];
const { LON0, LON1, LAT0, LAT1 } = MAP_DATA;

// Named for the report. The order is the order in MAP_DATA.coast.land.
const NAMES = (process.env.JU_LAND_NAMES || '').split(',').filter(Boolean);
const nameOf = (i) => NAMES[i] || `land[${i}]`;

console.log('== every ring is well formed ==');
for (let i = 0; i < LAND.length; i++) {
  const poly = LAND[i];
  ok(poly.length >= 3, `${nameOf(i)}: ${poly.length} points`);
  let dupes = 0;
  for (let j = 0; j < poly.length; j++) {
    const a = poly[j], b = poly[(j + 1) % poly.length];
    if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) dupes++;
  }
  ok(dupes === 0, `  no repeated consecutive vertices (${dupes})`);
  const outside = poly.filter(([lon, lat]) =>
    lon < LON0 - 1e-9 || lon > LON1 + 1e-9 || lat < LAT0 - 1e-9 || lat > LAT1 + 1e-9);
  ok(outside.length === 0, `  every vertex inside the frame (${outside.length} outside`
    + (outside.length ? `, first ${JSON.stringify(outside[0])}` : '') + ')');
}

console.log('== no ring crosses itself ==');
for (let i = 0; i < LAND.length; i++) {
  const hits = selfIntersections(LAND[i]);
  if (hits.length) {
    const [a, b] = hits[0];
    ok(false, `${nameOf(i)}: ${hits.length}+ self-intersection(s); first between segment ${a} `
      + `(${JSON.stringify(LAND[i][a])}) and segment ${b} (${JSON.stringify(LAND[i][b])})`);
  } else {
    ok(true, `${nameOf(i)}: simple (${LAND[i].length} segments)`);
  }
}

console.log('== no two landmasses overlap ==');
for (let i = 0; i < LAND.length; i++) {
  for (let j = i + 1; j < LAND.length; j++) {
    const hits = crossRingIntersections(LAND[i], LAND[j], 1);
    let msg = `${nameOf(i)} / ${nameOf(j)}`;
    let good = hits.length === 0;
    if (good) {
      // Disjoint boundaries still allow one ring nested inside another.
      const inside = pointInPolygon(LAND[i][0][0], LAND[i][0][1], LAND[j])
        || pointInPolygon(LAND[j][0][0], LAND[j][0][1], LAND[i]);
      if (inside) { good = false; msg += ': one ring sits INSIDE the other'; }
    } else {
      msg += `: boundaries cross near ${JSON.stringify(hits[0][0])}`;
    }
    if (!good) ok(false, msg);
  }
}
ok(true, `${(LAND.length * (LAND.length - 1)) / 2} landmass pairs checked`);

console.log('== lakes sit on land, rivers stay in the frame ==');
for (let i = 0; i < LAKES.length; i++) {
  const lake = LAKES[i];
  const c = lake.reduce((a, p) => [a[0] + p[0] / lake.length, a[1] + p[1] / lake.length], [0, 0]);
  const on = LAND.some((poly) => pointInPolygon(c[0], c[1], poly));
  ok(on, `lake[${i}] centre ${c.map((v) => v.toFixed(2)).join(', ')} is inside a landmass`);
  ok(selfIntersections(lake).length === 0, `  lake[${i}] is simple`);
}
for (const r of RIVERS) {
  const bad = (r.points || []).filter(([lon, lat]) =>
    lon < LON0 - 1e-9 || lon > LON1 + 1e-9 || lat < LAT0 - 1e-9 || lat > LAT1 + 1e-9);
  ok(bad.length === 0, `river ${r.name}: ${(r.points || []).length} points inside the frame`);
}

console.log('== the frame ==');
{
  const px = MAP_DATA.MAP_W / (LON1 - LON0), py = MAP_DATA.MAP_H / (LAT1 - LAT0);
  console.log(`  lon ${LON0}..${LON1}, lat ${LAT0}..${LAT1} at ${MAP_DATA.MAP_W}×${MAP_DATA.MAP_H}`
    + ` (${px.toFixed(1)} px/° lon, ${py.toFixed(1)} px/° lat)`);
  const total = LAND.reduce((a, p) => a + Math.abs(signedArea(p)), 0);
  const frame = (LON1 - LON0) * (LAT1 - LAT0);
  console.log(`  land covers ${(100 * total / frame).toFixed(1)}% of the frame`
    + ` across ${LAND.length} masses, ${LAND.reduce((a, p) => a + p.length, 0)} coastline points`);
}

// --- the preview ------------------------------------------------------------

function png(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}
let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

// Even-odd scanline fill, which is what `ctx.fill()` does for a simple ring.
function fillRing(mask, W, H, poly, project, value) {
  const pts = poly.map((p) => project(p[0], p[1]));
  let yMin = Infinity, yMax = -Infinity;
  for (const p of pts) { if (p[1] < yMin) yMin = p[1]; if (p[1] > yMax) yMax = p[1]; }
  const y0 = Math.max(0, Math.ceil(yMin)), y1 = Math.min(H - 1, Math.floor(yMax));
  const xs = [];
  for (let y = y0; y <= y1; y++) {
    xs.length = 0;
    const yc = y + 0.5;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > yc) !== (yj > yc)) xs.push(xi + ((yc - yi) / (yj - yi)) * (xj - xi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.ceil(xs[k] - 0.5)), b = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = a; x <= b; x++) mask[y * W + x] = value;
    }
  }
}

if (!QUIET) {
  const SCALE = Number(process.env.JU_SCALE || 6);
  const W = Math.round(MAP_DATA.MAP_W / SCALE), H = Math.round(MAP_DATA.MAP_H / SCALE);
  const project = (lon, lat) => [
    ((lon - LON0) / (LON1 - LON0)) * W,
    ((LAT1 - lat) / (LAT1 - LAT0)) * H,
  ];
  const mask = new Uint8Array(W * H);
  for (const poly of LAND) fillRing(mask, W, H, poly, project, 1);
  for (const lake of LAKES) fillRing(mask, W, H, lake, project, 2);
  const rgb = Buffer.alloc(W * H * 3);
  const PALETTE = { 0: [26, 42, 68], 1: [214, 205, 178], 2: [58, 108, 156] };
  for (let i = 0; i < W * H; i++) {
    const c = PALETTE[mask[i]];
    rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2];
  }
  // Rivers and province seeds on top, so the preview shows what moved.
  const dot = (x, y, c) => {
    const px = Math.round(x), py = Math.round(y);
    if (px < 0 || py < 0 || px >= W || py >= H) return;
    const i = (py * W + px) * 3;
    rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2];
  };
  for (const r of RIVERS) {
    const pts = (r.points || []).map((p) => project(p[0], p[1]));
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay)));
      for (let t = 0; t <= n; t++) dot(ax + ((bx - ax) * t) / n, ay + ((by - ay) * t) / n, [58, 108, 156]);
    }
  }
  for (const p of MAP_DATA.provinces || []) {
    const [x, y] = project(p.lon, p.lat);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) dot(x + dx, y + dy, [176, 48, 48]);
  }
  const path = OUT + '/coast.png';
  writeFileSync(path, png(W, H, rgb));
  console.log(`  preview: ${path} (${W}×${H}, 1/${SCALE})`);
}

console.log(failures ? `coastcheck: ${failures} FAIL` : 'coastcheck: ALL PASS');
process.exit(failures ? 1 : 0);
