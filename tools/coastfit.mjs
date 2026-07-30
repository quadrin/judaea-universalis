#!/usr/bin/env node
// Judaea Universalis — how far the drawn coastline is from the real one.
//
//   node tools/coastfit.mjs path/to/ne_10m_coastline.geojson
//   node tools/coastfit.mjs path/to/coastline.geojson --worst 40
//
// The coastline in js/data/map_data.js is hand-traced, and hand-tracing has no
// error bar. This puts one on it: for every vertex of every ring, the distance
// to the nearest real coastline segment, in kilometres and in map pixels.
//
// It is a MEASUREMENT, not a gate, and it is deliberately not in run-smoke.sh:
// it needs a data file the repo does not carry, and the answer it gives is a
// judgement ("is 12 km at this scale wrong?"), not a pass/fail. Get the data
// with, e.g.:
//
//   curl -o /tmp/ne10m.geojson \
//     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_coastline.geojson
//
// Natural Earth is public domain. Any GeoJSON of LineString/MultiLineString
// coastlines in lon/lat works; 10m is the useful resolution here, since one
// map pixel is about 1.1 km of longitude.
//
// Two things it deliberately does NOT do. It does not check islands the map
// omits on purpose — Lesbos, Malta, Gotland, the Hebrides are simplifications,
// not errors, and a tool that flagged them would be noise. And it does not
// propose replacing the hand-traced rings with generated ones: the rings carry
// their landmarks in comments, which is what makes them editable, and the
// generated equivalent is forty thousand anonymous vertices.
//
// READ THE OUTLIERS BEFORE "FIXING" THEM. The largest miss on the map is
// [47.60, 30.55], ~59 km, and it is correct: that is the head of the Persian
// Gulf as it stood in 66 CE, near Charax, and the Shatt al-Arab has built
// roughly that much delta out over it since. The reference is a MODERN
// coastline. Where this map is deliberately ancient — the Gulf head, the
// Nile's Damietta and Rosetta mouths, the Flevo lake behind the Frisian dunes
// — a large number here means the map is right and the reference is late.
//
// Measured at v6.8: median 1.7 km, p90 9.2 km, max 58.8 km, over 921 vertices,
// against ne_10m. One map pixel is ~1.1 km of longitude, so the median vertex
// is within two pixels of the real coast.
import { readFileSync } from 'fs';

const R = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');

const file = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'));
if (!file) {
  console.error('usage: node tools/coastfit.mjs <coastline.geojson> [--worst N] [--quiet]');
  process.exit(2);
}
const WORST = Number((process.argv.find((a) => a.startsWith('--worst=')) || '').split('=')[1])
  || (process.argv.includes('--worst') ? Number(process.argv[process.argv.indexOf('--worst') + 1]) : 0)
  || 25;

const { LON0, LON1, LAT0, LAT1, MAP_W, MAP_H } = MAP_DATA;
const pxPerLon = MAP_W / (LON1 - LON0);
const KM_PER_DEG_LAT = 111.32;
const kmPerDegLon = (lat) => KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

// --- reference segments, clipped to the frame with a margin -----------------
const raw = JSON.parse(readFileSync(file, 'utf8'));
const M = 1.5; // degrees of slop, so a coast just outside the frame still matches
const lines = [];
const takeLine = (coords) => { if (Array.isArray(coords) && coords.length > 1) lines.push(coords); };
for (const f of raw.features || []) {
  const g = f && f.geometry;
  if (!g) continue;
  if (g.type === 'LineString') takeLine(g.coordinates);
  else if (g.type === 'MultiLineString') (g.coordinates || []).forEach(takeLine);
  else if (g.type === 'Polygon') (g.coordinates || []).forEach(takeLine);
  else if (g.type === 'MultiPolygon') (g.coordinates || []).forEach((p) => (p || []).forEach(takeLine));
}
// Bucket segments by whole degree of longitude so the nearest-segment search
// is a local scan and not 900 × 400,000.
const buckets = new Map();
let segCount = 0;
const put = (key, seg) => {
  if (!buckets.has(key)) buckets.set(key, []);
  buckets.get(key).push(seg);
};
for (const line of lines) {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
    const la = Math.min(a[1], b[1]), ha = Math.max(a[1], b[1]);
    if (hi < LON0 - M || lo > LON1 + M || ha < LAT0 - M || la > LAT1 + M) continue;
    segCount++;
    for (let k = Math.floor(lo); k <= Math.floor(hi); k++) put(k, [a, b]);
  }
}
if (!segCount) {
  console.error('no reference segments fall inside the frame — is this a coastline file in lon/lat?');
  process.exit(2);
}

// --- distance from a point to a segment, in km ------------------------------
function distKm(p, a, b) {
  const kx = kmPerDegLon(p[1]), ky = KM_PER_DEG_LAT;
  const px = p[0] * kx, py = p[1] * ky;
  const ax = a[0] * kx, ay = a[1] * ky;
  const bx = b[0] * kx, by = b[1] * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  const qx = ax + t * dx, qy = ay + t * dy;
  return Math.hypot(px - qx, py - qy);
}
function nearestKm(p) {
  let best = Infinity;
  // Widen the bucket window until something is found, so a vertex in the
  // middle of a frame-edge cut still gets an answer instead of Infinity.
  for (let span = 1; span <= 6 && !Number.isFinite(best === Infinity ? NaN : best); span++) {
    for (let k = Math.floor(p[0]) - span; k <= Math.floor(p[0]) + span; k++) {
      for (const s of buckets.get(k) || []) {
        const d = distKm(p, s[0], s[1]);
        if (d < best) best = d;
      }
    }
    if (best < Infinity) break;
  }
  return best;
}

// --- the rings, and which vertices are frame-edge cuts rather than coast -----
const NAMES = (process.env.JU_LAND_NAMES || '').split(',').filter(Boolean);
const EPS = 1e-6;
const onFrameEdge = ([lon, lat]) =>
  Math.abs(lon - LON0) < EPS || Math.abs(lon - LON1) < EPS
  || Math.abs(lat - LAT0) < EPS || Math.abs(lat - LAT1) < EPS;

const rows = [];
MAP_DATA.coast.land.forEach((poly, i) => {
  const name = NAMES[i] || `land[${i}]`;
  for (const v of poly) {
    // A vertex ON the frame edge is a cut, not a claim about where the coast
    // is; the segment it closes runs through open water or open land.
    if (onFrameEdge(v)) continue;
    rows.push({ ring: name, v, km: nearestKm(v) });
  }
});
rows.sort((a, b) => a.km - b.km);

const q = (f) => rows[Math.min(rows.length - 1, Math.floor(rows.length * f))].km;
const kmToPx = (km, lat) => km / (kmPerDegLon(lat) / pxPerLon);
console.log(`reference: ${segCount.toLocaleString()} segments inside the frame, from ${file}`);
console.log(`measured:  ${rows.length} coastline vertices (frame-edge cuts excluded)\n`);
console.log('  distance to the real coastline');
for (const [label, f] of [['median', 0.5], ['p75', 0.75], ['p90', 0.90], ['p99', 0.99]]) {
  console.log(`    ${label.padEnd(7)} ${q(f).toFixed(1).padStart(6)} km  (~${kmToPx(q(f), 40).toFixed(0)} px)`);
}
console.log(`    max     ${rows[rows.length - 1].km.toFixed(1).padStart(6)} km`);

// Per-ring medians say which landmass was traced worst, which is the number
// that actually tells you where to spend an hour.
console.log('\n  by landmass (median / p90 / worst)');
const byRing = new Map();
for (const r of rows) {
  if (!byRing.has(r.ring)) byRing.set(r.ring, []);
  byRing.get(r.ring).push(r.km);
}
const ringRows = [...byRing].map(([n, a]) => {
  a.sort((x, y) => x - y);
  return { n, med: a[a.length >> 1], p90: a[Math.floor(a.length * 0.9)], max: a[a.length - 1], count: a.length };
}).sort((a, b) => b.med - a.med);
for (const r of ringRows) {
  console.log(`    ${r.n.padEnd(13)} ${r.med.toFixed(1).padStart(6)} / ${r.p90.toFixed(1).padStart(6)}`
    + ` / ${r.max.toFixed(1).padStart(6)} km   (${r.count} pts)`);
}

console.log(`\n  the ${WORST} vertices furthest from the real coast`);
for (const r of rows.slice(-WORST).reverse()) {
  console.log(`    ${r.km.toFixed(1).padStart(7)} km  ${r.ring.padEnd(13)} [${r.v[0].toFixed(2)}, ${r.v[1].toFixed(2)}]`);
}
