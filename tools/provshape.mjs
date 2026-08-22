#!/usr/bin/env node
// tools/provshape.mjs — the province raster, in Node, without a browser.
//
//   node tools/provshape.mjs                 the theatre, folded for 1948
//   node tools/provshape.mjs 66ce            another chapter
//   node tools/provshape.mjs 1948ce --world  the whole frame (slower)
//   JU_OUT=/tmp node tools/provshape.mjs --png
//
// The renderer's ID pass is a weighted Voronoi over the land mask: every land
// pixel goes to the seed with the smallest distance/weight, inside whatever
// country ring is painted under it (SPEC §232). That is four lines of
// arithmetic, and it reproduces here in about a second — which is the whole
// point of this file. SPEC §229 tuned twenty-odd seeds against a preview
// picture rather than a ten-minute browser dump per attempt, and §234 and §257
// argued about province SHAPES with numbers instead of screenshots. This is
// that harness, committed.
//
// What it does NOT reproduce: the ±18px domain warp (which wobbles a border
// without moving which cells touch), the component repairs, and the country
// seam heal. So use it for shape, adjacency-in-the-large and area — not for
// byte-comparison against tools/geom-snapshot.json, which is the browser's.
//
// THE CHECK IT EXISTS FOR (SPEC §257). A cell carved INSIDE another cell's
// ground comes out a circle, because the weighted-Voronoi bisector between an
// interior seed and the seed that surrounds it is an arc of a circle — and no
// weight fixes that, since the shape is the interiority's fault and not the
// weight's. `enclosed()` names any province whose border is almost all one
// neighbour's: two neighbours or fewer, 70% or more of the perimeter facing a
// single cell, and no coast to give the shape a real edge. A province that
// answers to that description is a circle on somebody's map.
//
// One legitimate exception is built in, and it is a real distinction rather
// than an excuse: a province whose one neighbour is a CONSOLIDATION SURVIVOR
// (SPEC §232 — the cell fifteen other cells folded into) is bounded by fifteen
// arcs, not one, and comes out a polygon. Córdoba inside Spain is that case,
// and it looks like a province. Salamiyah inside Homs was the other one.
//
// And one CHRONIC case is listed by name rather than fixed: Oxyrhynchus, the
// middle-Egyptian valley cell sitting inside the Libyan Desert's enormous one.
// It is a circle, it has been one since the base atlas was drawn, and it is
// the same circle in all nine chapters — so it is not a chapter's carving to
// take back, and moving it moves eight boards this section promised not to
// touch. (§234 already met it from the other side: the §232 land format
// pinched the Oxyrhynchus–Thebes contact out of the raster and `extraLinks`
// carries the river road now.) The CLI names it and still exits clean; a
// SECOND name showing up there is the regression to look at.
//
// DOM-free, zero dependencies, no server, no WebGL.
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

const R = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { buildProvinceMapping } = await import(R + '/js/data/map_profile.js');

// The theatre: the ground every chapter of this game is actually fought over,
// and the only ground any district has ever been carved on. The default frame,
// because the whole map at the same resolution is thirteen times the work for
// cells nobody has ever subdivided.
export const THEATRE = [32.0, 27.5, 42.5, 38.0];

// ---------------------------------------------------------------------------
// The frame: land mask and country paint, rasterised once per bbox/scale.
// ---------------------------------------------------------------------------
export function buildFrame(bbox = THEATRE, scale = 1) {
  const [lon0, lat0, lon1, lat1] = bbox;
  const [px0, py1] = MAP_DATA.project(lon0, lat0);
  const [px1, py0] = MAP_DATA.project(lon1, lat1);
  const W = Math.max(1, Math.round((px1 - px0) / scale));
  const H = Math.max(1, Math.round((py1 - py0) / scale));
  const project = (lon, lat) => {
    const [x, y] = MAP_DATA.project(lon, lat);
    return [(x - px0) / scale, (y - py0) / scale];
  };
  // The same even-odd scanline fill the browser's `fill()` performs, and the
  // one tools/coastcheck.mjs previews the coastline with.
  const fillRing = (mask, poly, value) => {
    const pts = poly.map((p) => project(p[0], p[1]));
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const p of pts) { if (p[1] < yMin) yMin = p[1]; if (p[1] > yMax) yMax = p[1]; }
    const y0 = Math.max(0, Math.ceil(yMin));
    const y1 = Math.min(H - 1, Math.floor(yMax));
    const xs = [];
    for (let y = y0; y <= y1; y++) {
      xs.length = 0;
      const yc = y + 0.5;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if ((yi > yc) !== (yj > yc)) xs.push(xi + ((yc - yi) / (yj - yi)) * (xj - xi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.max(0, Math.ceil(xs[k] - 0.5));
        const b = Math.min(W - 1, Math.floor(xs[k + 1] - 0.5));
        for (let x = a; x <= b; x++) mask[y * W + x] = value;
      }
    }
  };
  const land = new Uint8Array(W * H);
  for (const poly of MAP_DATA.coast.land) fillRing(land, poly, 1);
  for (const lake of MAP_DATA.coast.lakes || []) fillRing(land, lake, 0);
  const regionOfCell = new Map();
  const regions = MAP_DATA.countryRegions || [];
  regions.forEach((reg, i) => { for (const nm of reg.cells || []) regionOfCell.set(nm, i + 1); });
  const region = new Uint8Array(W * H);
  regions.forEach((reg, i) => { if ((reg.ring || []).length >= 3) fillRing(region, reg.ring, i + 1); });
  // A seed far outside the frame cannot win a pixel inside it; twelve degrees
  // is past the reach of the heaviest cell on the map (the Rub al-Khali at
  // 2.5) and keeps the inner loop to the neighbourhood.
  const near = [];
  MAP_DATA.provinces.forEach((p, i) => {
    if (p.lon > lon0 - 12 && p.lon < lon1 + 12 && p.lat > lat0 - 12 && p.lat < lat1 + 12) near.push(i);
  });
  return { W, H, land, region, regionOfCell, near, project, bbox, scale };
}

// ---------------------------------------------------------------------------
// The ID pass, unwarped: distance/weight, region-locked, land-masked.
// ---------------------------------------------------------------------------
export function rasterise(frame, mapping = null) {
  const { W, H, land, region, regionOfCell, near, project } = frame;
  const cells = MAP_DATA.provinces;
  const n = cells.length;
  const sx = new Float64Array(n);
  const sy = new Float64Array(n);
  const sw = new Float64Array(n);
  const sr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const [x, y] = project(cells[i].lon, cells[i].lat);
    sx[i] = x; sy[i] = y;
    sw[i] = Math.max(cells[i].weight || 1, 0.05);
    sr[i] = regionOfCell.get(cells[i].name) || 0;
  }
  const ids = new Uint16Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const at = y * W + x;
      if (!land[at]) continue;
      const reg = region[at];
      const px = x + 0.5;
      const py = y + 0.5;
      let bd = Infinity;
      let best = 0;
      for (let k = 0; k < near.length; k++) {
        const i = near[k];
        if (sr[i] !== reg) continue;
        const dx = px - sx[i];
        const dy = py - sy[i];
        const d = Math.sqrt(dx * dx + dy * dy) / sw[i];
        if (d < bd) { bd = d; best = i + 1; }
      }
      ids[at] = best;
    }
  }
  if (mapping) for (let i = 0; i < ids.length; i++) if (ids[i]) ids[i] = mapping[ids[i]];
  return ids;
}

// ---------------------------------------------------------------------------
// Per-province shape: area, who it touches, and how much of its border is one
// neighbour's. `open` is border facing sea, lake or the frame — a real edge
// that no arc has to explain.
// ---------------------------------------------------------------------------
export function shapes(frame, ids) {
  const { W, H } = frame;
  const cells = MAP_DATA.provinces;
  const area = new Map();
  const touch = new Map();
  const open = new Map();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const at = y * W + x;
      const id = ids[at];
      if (!id) continue;
      area.set(id, (area.get(id) || 0) + 1);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        const other = (nx < 0 || ny < 0 || nx >= W || ny >= H) ? 0 : ids[ny * W + nx];
        if (other === id) continue;
        if (other) {
          if (!touch.has(id)) touch.set(id, new Map());
          const m = touch.get(id);
          m.set(other, (m.get(other) || 0) + 1);
        } else open.set(id, (open.get(id) || 0) + 1);
      }
    }
  }
  const out = [];
  for (const [id, a] of area) {
    const m = touch.get(id) || new Map();
    const o = open.get(id) || 0;
    const perim = [...m.values()].reduce((s, v) => s + v, 0) + o;
    const ranked = [...m.entries()].sort((p, q) => q[1] - p[1]);
    out.push({
      id,
      name: (cells[id - 1] || {}).name || ('#' + id),
      area: a,
      open: o,
      neighbours: ranked.map(([other, len]) => ({
        name: (cells[other - 1] || {}).name || ('#' + other),
        share: len / Math.max(1, perim),
      })),
      dominant: ranked.length ? ranked[0][1] / Math.max(1, perim) : 1,
      dominantName: ranked.length ? ((cells[ranked[0][0] - 1] || {}).name || '?') : null,
    });
  }
  out.sort((a, b) => b.area - a.area);
  return out;
}

// Enclosed since the atlas was drawn, identically in every chapter, and not
// any chapter's to give back — see the header.
export const CHRONIC = new Set(['Oxyrhynchus']);

// A province that is a circle on somebody's map (see the header). `mapping`
// tells a consolidation survivor — one cell many folded into, whose border is
// many arcs — from a cell standing on its own.
// `minArea` keeps the coarse passes honest: a cell of five pixels can land on
// two neighbours and an 80% share by rounding alone, which says nothing about
// its shape. Run the theatre at 1/1, where the smallest district is hundreds of
// pixels, and the whole frame at 1/4 for the big cells.
export function enclosed(report, mapping, minArea = 24) {
  const family = new Map();
  if (mapping) {
    for (let i = 1; i < mapping.length; i++) family.set(mapping[i], (family.get(mapping[i]) || 0) + 1);
  }
  return report.filter((r) => {
    if (r.area < minArea) return false;                  // too coarse to judge
    if (r.open > 0) return false;                        // it has a coast to be shaped by
    if (r.neighbours.length > 2) return false;           // three arcs is a province
    if (r.dominant < 0.70) return false;                 // and it is not one neighbour's ring
    const top = r.neighbours[0];
    if (!top) return true;
    const id = MAP_DATA.provinces.findIndex((p) => p.name === top.name) + 1;
    return (family.get(id) || 1) <= 1;                   // a union bounds it with many arcs
  });
}

// ---------------------------------------------------------------------------
// The picture. Distinct hue per cell, black borders, white seeds — so a shape
// argument can be LOOKED at without a browser, a server and a WebGL context.
// ---------------------------------------------------------------------------
export function png(frame, ids) {
  const { W, H, land, project } = frame;
  const rgb = Buffer.alloc(W * H * 3);
  const hue = (h, s, v) => {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const r = [v, q, p, p, t, v][i % 6];
    const g = [t, v, v, q, p, p][i % 6];
    const b = [p, p, t, v, v, q][i % 6];
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };
  const cache = new Map();
  for (let i = 0; i < W * H; i++) {
    const id = ids[i];
    let c;
    if (!id) c = land[i] ? [40, 40, 40] : [26, 42, 68];
    else {
      if (!cache.has(id)) cache.set(id, hue((id * 0.61803398875) % 1, 0.45 + ((id * 7) % 5) * 0.08, 0.55 + ((id * 13) % 4) * 0.11));
      c = cache.get(id);
    }
    rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2];
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const at = y * W + x;
      const id = ids[at];
      if (!id) continue;
      const r = x + 1 < W ? ids[at + 1] : id;
      const d = y + 1 < H ? ids[at + W] : id;
      if (r !== id || d !== id) { rgb[at * 3] = 20; rgb[at * 3 + 1] = 20; rgb[at * 3 + 2] = 20; }
    }
  }
  for (const p of MAP_DATA.provinces) {
    const [fx, fy] = project(p.lon, p.lat);
    const x = Math.round(fx);
    const y = Math.round(fy);
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const i = ((y + dy) * W + (x + dx)) * 3;
        rgb[i] = 255; rgb[i + 1] = 255; rgb[i + 2] = 255;
      }
    }
  }
  let table = null;
  const crc32 = (buf) => {
    if (!table) {
      table = new Int32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
      }
    }
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return c ^ -1;
  };
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// The diagram is the same in every chapter — only the fold differs. Rasterise
// ONCE under identity and fold per bookmark: nine chapters for the price of
// one pass, which is what makes the whole-atlas check cheap enough for the
// smoke battery.
export function fold(ids, mapping) {
  const out = new Uint16Array(ids.length);
  for (let i = 0; i < ids.length; i++) out[i] = ids[i] ? mapping[ids[i]] : 0;
  return out;
}

// The chapter's raster, folded: one call for every consumer of this file.
// Pass `base` (an identity raster over the same frame) to skip the pass.
export async function chapter(id = '1948ce', opts = {}) {
  const { ERAS } = await import(R + '/js/data/compendium.js');
  const era = ERAS.find((e) => e.bookmark && e.bookmark.id === id);
  if (!era) throw new Error('no such bookmark: ' + id);
  const frame = opts.frame || buildFrame(opts.bbox || THEATRE, opts.scale || 1);
  const mapping = buildProvinceMapping(MAP_DATA, era.bookmark);
  const ids = opts.base ? fold(opts.base, mapping) : rasterise(frame, mapping);
  return { frame, mapping, ids, bookmark: era.bookmark, report: shapes(frame, ids) };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const id = args.find((a) => !a.startsWith('--')) || '1948ce';
  const world = args.includes('--world');
  const scale = Number((args.find((a) => a.startsWith('--scale=')) || '').split('=')[1] || (world ? 4 : 1));
  const bbox = world ? [MAP_DATA.LON0, MAP_DATA.LAT0, MAP_DATA.LON1, MAP_DATA.LAT1] : THEATRE;
  const { frame, mapping, ids, report } = await chapter(id, { bbox, scale });
  console.log(`${id}: ${frame.W}×${frame.H} at 1/${scale}, ${report.length} provinces`);
  const all = enclosed(report, mapping);
  const chronic = all.filter((r) => CHRONIC.has(r.name));
  const bad = all.filter((r) => !CHRONIC.has(r.name));
  if (args.includes('--all')) {
    for (const r of report) {
      console.log(`  ${r.name.padEnd(22)} area=${String(r.area).padStart(6)} open=${String(r.open).padStart(4)}`
        + ` ${r.neighbours.slice(0, 4).map((n) => `${n.name}:${(100 * n.share).toFixed(0)}%`).join(' ')}`);
    }
  }
  const line = (r) => `  ${r.name.padEnd(22)} area=${String(r.area).padStart(6)}`
    + ` ${(100 * r.dominant).toFixed(0)}% of its border is ${r.dominantName}`;
  console.log(bad.length ? 'enclosed provinces (SPEC §257 — circles):' : 'no enclosed provinces');
  for (const r of bad) console.log(line(r));
  if (chronic.length) {
    console.log('chronic, base atlas, the same in all nine chapters:');
    for (const r of chronic) console.log(line(r));
  }
  if (args.includes('--png')) {
    const out = (process.env.JU_OUT || '/tmp').replace(/\/$/, '') + `/provshape-${id}.png`;
    writeFileSync(out, png(frame, ids));
    console.log('  preview:', out);
  }
  process.exit(bad.length ? 1 : 0);
}
