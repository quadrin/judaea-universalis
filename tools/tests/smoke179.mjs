// Headless smoke test §262: the map's borders come from a distance field, the
// ground shows through the paint, and the relief plane is sixteen bits.
//
// The border used to be a one-texel ID discontinuity test — a hard staircase
// eight pixels wide at the closest zoom, dotted fragments at the farthest —
// and the shoreline had no line at all. Now a chamfer distance field, built
// once per map profile from the same raster computeGeometry reads, gives the
// shader a continuous distance to the nearest other province; the border is a
// smoothstep over it in screen space. This suite holds the field's contract
// and the shader's reading of it.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { distanceToBorderRaster } = await import(R + '/js/map/renderer.js');
const { DEFINES } = await import(R + '/js/data/defines.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};
const SRC = readFileSync(R + '/js/map/renderer.js', 'utf8');
const MODES = readFileSync(R + '/js/map/mapmodes.js', 'utf8');

// ---------------------------------------------------------------------------
console.log('== the field: zero on both banks, a texel a step, and the sea is a wall ==');
{
  // A 24x12 raster: province 1 on the left, 2 on the right, a two-row sea
  // channel across the middle, and province 3 alone below the channel.
  const W = 24, H = 12;
  const id = new Uint16Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v;
      if (y === 5 || y === 6) v = 0;
      else if (y < 5) v = x < 12 ? 1 : 2;
      else v = 3;
      id[y * W + x] = v;
    }
  }
  const pm = new Uint16Array([0, 1, 2, 3]);
  const d = distanceToBorderRaster(id, pm, W, H);
  ok(d.length === W * H, 'one byte a texel');
  ok(d[2 * W + 11] === 0 && d[2 * W + 12] === 0, 'both banks of the 1|2 border are zero');
  ok(d[2 * W + 10] === 3 && d[2 * W + 13] === 3, '  one texel in is three (chamfer 3-4 units)');
  ok(d[2 * W + 9] === 6 && d[2 * W + 8] === 9, '  and it climbs three a texel');
  ok(d[5 * W + 3] === 255 && d[6 * W + 20] === 255, 'sea texels are never reached');
  // Province 3's coast faces provinces 1 and 2 across the channel, with no
  // land path between them: the field must not draw a border along that coast.
  ok(d[7 * W + 3] === 255 && d[7 * W + 11] === 255 && d[7 * W + 12] === 255,
    'the field does not cross a strait: a coast facing other provinces stays clear');
  ok(d[4 * W + 3] === 24 && d[4 * W + 20] === 24, '  while the banks above it measure to their own land border, eight texels off');
  // Diagonal step is 4.
  const dg = d[3 * W + 10];
  ok(dg === 3, 'a texel diagonal to a corner takes the straight route where one exists (' + dg + ')');
  // Merged cells: map province 2 onto 1 and the vertical border must vanish.
  const merged = new Uint16Array([0, 1, 1, 3]);
  const d2 = distanceToBorderRaster(id, merged, W, H);
  ok(d2[2 * W + 11] === 255 && d2[2 * W + 12] === 255,
    'a merged pair (SPEC §47) draws no border between its cells');
  ok(d2[2 * W + 0] === 255 && d2[7 * W + 11] === 255, '  and nothing else changes');
  // No mapping at all reads the raster as provinces.
  const d3 = distanceToBorderRaster(id, null, W, H);
  ok(d3[2 * W + 11] === 0, 'without a mapping the raster ids are the provinces');
  // A short raster is refused with a full-far field rather than a throw.
  const d4 = distanceToBorderRaster(new Uint16Array(4), pm, W, H);
  ok(d4.length === W * H && d4[0] === 255, 'a raster too short for the frame yields a far-everywhere field');
}

// ---------------------------------------------------------------------------
console.log('== the shader reads the field, and draws the shore ==');
{
  ok(/uniform sampler2D uDist/.test(SRC), 'the main pass carries the border field');
  ok(/texture\(uDist, uvj/.test(SRC) && /jmap \/ uMapSize/.test(SRC),
    '  sampled at the same jittered coordinate as the fill, so line and paint agree');
  ok(/smoothstep\(hp - aaT, hp \+ aaT, dT\)/.test(SRC) && /smoothstep\(hc - aaT, hc \+ aaT, dT\)/.test(SRC),
    '  province and country borders are smoothsteps over it — anti-aliased, not a binary test');
  ok(!/int b1 = int\(max\(1\.0, 1\.0 \/ uZoom\) \+ 0\.5\)/.test(SRC),
    '  the one-texel discontinuity test is gone');
  ok(/RING\[k\] \* r/.test(SRC) && /classOf\(q\) != cSelf/.test(SRC),
    '  which border it is comes from the owner class across it (§173)');
  ok(/fwidth\(land\)/.test(SRC) && /coastInk/.test(SRC),
    'the shoreline is inked, a screen-width line on the land mask');
  ok(/uploadDistanceField\(\)/.test(SRC) && /distanceToBorderRaster\(idArray, provinceMap, W, H\)/.test(SRC),
    'the field is built from the mapped raster and rebuilt when the mapping changes');
  ok(/if \(idOk\) uploadDistanceField\(\);/.test(SRC), '  and only when there is a raster to build it from');
}

// ---------------------------------------------------------------------------
console.log('== the ground shows through the paint ==');
{
  ok(/uniform sampler2D uLookT/.test(SRC) && /uniform float uTerrMix/.test(SRC),
    'the main pass carries the terrain palette and a mix');
  ok(/fill \*= mix\(vec3\(1\.0\), tc \/ lt, uTerrMix\)/.test(SRC),
    '  the terrain tints the fill by its chroma');
  ok(/hash21\(vec2\(float\(id\) \* 0\.731, 3\.17\)\)/.test(SRC) && /uJitter/.test(SRC),
    '  and every province carries a shade of its own');
  const params = (mode) => {
    const m = new RegExp(mode + ': \\{([^}]*)\\}').exec(MODES);
    const o = {};
    if (m) for (const kv of m[1].split(',')) { const [k, v] = kv.split(':').map((t) => t.trim()); if (k) o[k] = Number(v); }
    return o;
  };
  const pol = params('political');
  ok(pol.terrMix >= 0.3 && pol.jitter === 1, 'political mode lets the ground through (' + pol.terrMix + ') and jitters');
  for (const ramp of ['development', 'unrest', 'estates', 'diaspora', 'structures']) {
    const p = params(ramp);
    ok(p.jitter === 0 && p.terrMix <= 0.15,
      '  ' + ramp + ' keeps its ramp: no jitter, a whisper of terrain (' + p.terrMix + ')');
  }
  ok(params('terrain').terrMix === 0, '  terrain mode is the terrain already');
  ok(/terrMix: p\.terrMix, jitter: p\.jitter, desat: p\.desat/.test(MODES),
    '  and the params reach the renderer');
  ok(/TERRAINS\[pr\.terrain\] && TERRAINS\[pr\.terrain\]\.color/.test(SRC),
    'the palette is DEFINES.TERRAINS, the same the terrain mapmode paints');
  ok(Object.keys(DEFINES.TERRAINS).every((k) => Array.isArray(DEFINES.TERRAINS[k].color)),
    '  and every terrain has one');
}

// ---------------------------------------------------------------------------
console.log('== the relief is sixteen bits, lit twice, and shaded in its valleys ==');
{
  ok(/gl\.R16F, gl\.RED, gl\.HALF_FLOAT, HW, HH/.test(SRC), 'the relief target is R16F at half the frame');
  ok(/uniform vec2 uTargetSize/.test(SRC) && /gl_FragCoord\.xy \* uScale/.test(SRC),
    '  and the height pass places its primitives in frame px on the smaller target');
  ok(/float et = clamp\(1\.5 \/ uZoom, 2\.0, 12\.0\)/.test(SRC) && /\* 1\.5 \/ et/.test(SRC),
    'the gradient step follows the zoom and the slope is normalised back');
  ok(/float fillL = clamp\(dot\(nrm, normalize\(vec3\(0\.6, 0\.55, 0\.5\)\)\)/.test(SRC),
    'a second, low lamp from the south-east');
  ok(/textureLod\(uHeight, uv, 4\.0\)/.test(SRC) && /AO_STRENGTH/.test(SRC),
    'valleys sit in shadow against the height\'s own blur');
  ok(/gl\.generateMipmap\(gl\.TEXTURE_2D\);\n\s+setTexParams\(gl\.LINEAR, true\);/.test(SRC),
    '  which the relief plane\'s mip chain feeds');
}

console.log(failures ? `smoke179: ${failures} FAIL` : 'smoke179: ALL PASS');
process.exit(failures ? 1 : 0);
