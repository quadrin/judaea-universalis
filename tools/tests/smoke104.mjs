// Headless regression — SPEC §156: the texture ceiling is a measurement now,
// and the memory audit that decides whether raising it is affordable.
//
// The 4096 ceiling every framing decision in this project has been made
// against was never measured. It lived as prose in map_data.js — "4046px stays
// under the common 4096 MAX_TEXTURE_SIZE floor" — and `gl.getParameter` was
// never called anywhere in js/ or main.js. The map has been sized against an
// assumption on every device since the beginning.
//
// This suite cannot run WebGL headlessly, so it holds two things it CAN check:
// that the query exists and gates on the real number, and the arithmetic that
// says what a frame costs. The second is the point. A proposal to extend the
// frame to lon -25..54 / lat 0..60 at current density was costed at ~302 MB on
// the assumption of ONE texture; the renderer allocates FOUR at full size, two
// of them mipmapped, so the real bill is three times that. Numbers that decide
// whether something ships should be executable.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const SRC = readFileSync(R + '/js/map/renderer.js', 'utf8');
const MB = (bytes) => bytes / (1024 * 1024);

// ---------------------------------------------------------------------------
console.log('== the ceiling is measured, not assumed ==');
{
  ok(/gl\.getParameter\(gl\.MAX_TEXTURE_SIZE\)/.test(SRC),
    'the renderer asks the device what it can hold');
  ok(/needTex > maxTex/.test(SRC),
    'and compares it against what this map actually needs');
  ok(/showErrorDiv\(canvas, 'This device supports textures up to/.test(SRC),
    'a device that cannot hold the map is told so, rather than going black');
}

// ---------------------------------------------------------------------------
console.log('== the frame, read out of the data ==');
const lonSpan = MAP_DATA.LON1 - MAP_DATA.LON0;
const latSpan = MAP_DATA.LAT1 - MAP_DATA.LAT0;
const pxPerLon = MAP_DATA.MAP_W / lonSpan;
const pxPerLat = MAP_DATA.MAP_H / latSpan;
{
  ok(lonSpan > 0 && latSpan > 0, 'the frame spans ' + lonSpan.toFixed(1) + '° lon × '
    + latSpan.toFixed(1) + '° lat');
  ok(MAP_DATA.MAP_W === 4046 && MAP_DATA.MAP_H === 2189,
    'at ' + MAP_DATA.MAP_W + '×' + MAP_DATA.MAP_H + ' ('
    + pxPerLon.toFixed(1) + ' px/° lon, ' + pxPerLat.toFixed(1) + ' px/° lat)');
  // The long axis is what a MAX_TEXTURE_SIZE ceiling actually binds.
  ok(Math.max(MAP_DATA.MAP_W, MAP_DATA.MAP_H) < 4096,
    'and its long axis fits under the 4096 floor the comment assumed');
}

// ---------------------------------------------------------------------------
console.log('== what the renderer actually allocates ==');
{
  // Four full-size textures, and the two built from canvases carry mipmaps.
  const full = [...SRC.matchAll(/=\s*(canvasTexture|targetTexture)\(/g)].map((m) => m[1]);
  ok(full.length === 4, 'four textures are allocated at full map size (' + full.length + ')');
  const mipped = [...SRC.matchAll(/canvasTexture\([\s\S]*?,\s*true\)/g)].length;
  ok(mipped === 2, '  two of them mipmapped, which costs a third again each (' + mipped + ')');

  const plane = MAP_DATA.MAP_W * MAP_DATA.MAP_H * 4; // RGBA8
  const current = plane * 2 * (4 / 3) + plane * 2;   // 2 mipmapped + 2 flat
  ok(MB(current) > 150 && MB(current) < 170,
    'the map costs ' + MB(current).toFixed(0) + ' MB of texture today, not the ~76 MB '
    + 'a single-texture estimate suggests');
}

// ---------------------------------------------------------------------------
console.log('== and what the proposed frame would cost ==');
{
  // lon -25..54, lat 0..60 at today's density — the frame that reaches Britain,
  // Iberia, north Africa and the Urals.
  const W = Math.round(79 * pxPerLon);
  const H = Math.round(60 * pxPerLat);
  ok(W <= 8192 && H <= 8192,
    'it fits an 8192 ceiling without coarsening (' + W + '×' + H + ')');
  const plane = W * H * 4;
  const bill = plane * 2 * (4 / 3) + plane * 2;
  ok(MB(bill) > 900,
    '  but costs ' + MB(bill).toFixed(0) + ' MB in RGBA8 — near the 1.2 GB already rejected for 16384');
  // The formats are where the headroom is, not the ceiling.
  const idAsRG8 = plane / 2;      // a province id fits in 16 bits
  const heightAsR8 = plane / 4;   // relief is one channel
  const leaner = plane * 2 * (4 / 3) + idAsRG8 + heightAsR8;
  ok(MB(leaner) < MB(bill) - 200,
    '  narrowing the ID and relief planes saves ' + (MB(bill) - MB(leaner)).toFixed(0)
    + ' MB, to ' + MB(leaner).toFixed(0) + ' MB — still the real obstacle');
}

console.log(failures ? `smoke104: ${failures} FAIL` : 'smoke104: ALL PASS');
process.exit(failures ? 1 : 0);
