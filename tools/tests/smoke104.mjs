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
// The ceiling §157 measured on SwiftShader, the weakest thing that will run
// this. Every frame decision below is against the measurement, not a guess.
const MEASURED_MAX_TEXTURE = 8192;
{
  ok(lonSpan > 0 && latSpan > 0, 'the frame spans ' + lonSpan.toFixed(1) + '° lon × '
    + latSpan.toFixed(1) + '° lat');
  // v6.8 (SPEC §160): the frame reaches Britain. What is pinned is the DENSITY
  // — v5.0 and v5.4 both grew the frame without changing it, and everything
  // sized in map units (seed spacing, sprite scale, label metrics, the camera
  // floor) is calibrated against it. Pinning W and H instead would fail on any
  // frame change including a correct one, which is what it did before this.
  ok(Math.abs(pxPerLon - 97.49) < 0.5 && Math.abs(pxPerLat - 115.21) < 0.5,
    'at the density every version has shipped: ' + pxPerLon.toFixed(1) + ' px/° lon, '
    + pxPerLat.toFixed(1) + ' px/° lat (' + MAP_DATA.MAP_W + '×' + MAP_DATA.MAP_H + ')');
  ok(MAP_DATA.LON0 <= -11 && MAP_DATA.LAT1 >= 58,
    '  and it reaches Britain and Ireland: lon ' + MAP_DATA.LON0 + '..' + MAP_DATA.LON1
    + ', lat ' + MAP_DATA.LAT0 + '..' + MAP_DATA.LAT1);
  // The long axis is what a MAX_TEXTURE_SIZE ceiling actually binds.
  ok(Math.max(MAP_DATA.MAP_W, MAP_DATA.MAP_H) <= MEASURED_MAX_TEXTURE,
    'and its long axis fits the MEASURED 8192 ceiling, not the 4096 the comment assumed');
}

// ---------------------------------------------------------------------------
console.log('== what the renderer actually allocates ==');
{
  // Four full-size textures, and the two built from canvases carry mipmaps.
  const full = [...SRC.matchAll(/=\s*(canvasTexture|targetTexture)\(/g)].map((m) => m[1]);
  ok(full.length === 4, 'four textures are allocated at full map size (' + full.length + ')');
  const mipped = [...SRC.matchAll(/canvasTexture\([\s\S]*?,\s*true\)/g)].length;
  ok(mipped === 2, '  two of them mipmapped, which costs a third again each (' + mipped + ')');

  const texels = MAP_DATA.MAP_W * MAP_DATA.MAP_H;
  // What the renderer allocates, in the formats it actually uses since §159:
  // two mipmapped RGBA8 canvases, the ID plane at RG8, relief at R8.
  const shipped = texels * 4 * (4 / 3) * 2 + texels * 2 + texels;
  // What the same frame would have cost before the format rework.
  const asRGBA8 = texels * 4 * (4 / 3) * 2 + texels * 4 * 2;
  ok(shipped > 0, 'this frame costs ' + MB(shipped).toFixed(0) + ' MB of texture');
  // The saving is not a threshold to guess at: it is exactly the two channels
  // per texel the ID plane gave up (RGBA8 -> RG8) plus the three the relief
  // plane gave up (RGBA8 -> R8). If a format ever silently widens again, this
  // is the line that notices.
  const narrowing = texels * 2 + texels * 3;
  ok(asRGBA8 - shipped === narrowing,
    '  which is ' + MB(narrowing).toFixed(0) + ' MB less than the ' + MB(asRGBA8).toFixed(0)
    + ' MB it would cost in RGBA8 — 2 bytes a texel off the ID plane and 3 off relief, '
    + 'exactly what §158–159 bought, and it is what makes this frame affordable');
}

// ---------------------------------------------------------------------------
console.log('== the frame that was costed, against the frame that shipped ==');
{
  // §156 costed lon -25..54 / lat 0..60 at 948 MB in RGBA8 and 694 narrowed,
  // and called the memory the blocker. The frame that shipped is the cheaper
  // one that still reaches the home islands. Both numbers stay executable, so
  // the next person to propose a frame gets arithmetic rather than a memory.
  const bigW = Math.round(79 * pxPerLon), bigH = Math.round(60 * pxPerLat);
  const bigTexels = bigW * bigH;
  const bigBill = bigTexels * 4 * (4 / 3) * 2 + bigTexels * 2 + bigTexels;
  ok(bigW <= MEASURED_MAX_TEXTURE && bigH <= MEASURED_MAX_TEXTURE,
    'the §156 proposal fits the ceiling too (' + bigW + '×' + bigH + ')');
  const texels = MAP_DATA.MAP_W * MAP_DATA.MAP_H;
  const shipped = texels * 4 * (4 / 3) * 2 + texels * 2 + texels;
  ok(MB(bigBill) - MB(shipped) > 250,
    '  and costs ' + MB(bigBill).toFixed(0) + ' MB against this frame\'s '
    + MB(shipped).toFixed(0) + ' — the extra ' + (MB(bigBill) - MB(shipped)).toFixed(0)
    + ' MB buys the Urals and the Sahara\'s far side, and was not worth it');
}

// ---------------------------------------------------------------------------
console.log('== the relief cap the atlas is validated against ==');
{
  // map_data.js imports nothing, so it carries a COPY of MAX_HEIGHT_PRIMS.
  // §157 raised the renderer to 64 and left the copy at 32, which would have
  // flagged the first primitive this frame added as over a cap that no longer
  // existed. Hold the two together rather than trusting the comment.
  const MAP_SRC = readFileSync(R + '/js/data/map_data.js', 'utf8');
  const cap = Number(/const MAX_HEIGHT_PRIMS = (\d+);/.exec(SRC)[1]);
  const validated = /heightPrimitives count \$\{[^}]+\} exceeds max (\d+)/.exec(MAP_SRC);
  ok(!!validated, 'validateMapData names the cap it checks against');
  ok(validated && Number(validated[1]) === cap,
    '  and it is the renderer\'s ' + cap + ', not a stale copy ('
    + (validated ? validated[1] : '?') + ')');
  ok(MAP_DATA.heightPrimitives.length <= cap,
    '  the atlas ships ' + MAP_DATA.heightPrimitives.length + ' of ' + cap
    + ' primitives, so the new ranges are drawn rather than dropped');
  ok(MAP_DATA.heightPrimitives.length > 32,
    '  and it is past the 32 v5.4 filled exactly, which is the point of §157');
}

// ---------------------------------------------------------------------------
console.log('== the relief pass has room to grow (SPEC §157) ==');
{
  ok(/const MAX_HEIGHT_PRIMS = (\d+);/.test(SRC), 'the primitive cap is a named constant');
  const cap = Number(/const MAX_HEIGHT_PRIMS = (\d+);/.exec(SRC)[1]);
  ok(cap >= 64, 'and it is ' + cap + ', not the bare 32 v5.4 filled exactly');
  ok(!/uPrimA\[32\]/.test(SRC) && !/for \(int i = 0; i < 32; i\+\+\)/.test(SRC),
    'no 32 is left hard-coded in the shader');
  ok((SRC.match(/MAX_HEIGHT_PRIMS/g) || []).length >= 6,
    '  the shader declarations, the loop and the fill all read the one constant');
  // 224 vec4 is the GLES 3.0 floor every WebGL2 device guarantees.
  ok(cap * 2 + 16 <= 224,
    'the pass fits the guaranteed uniform floor (' + (cap * 2 + 16) + ' of 224 vec4)');
  ok(/MAX_FRAGMENT_UNIFORM_VECTORS/.test(SRC),
    'and the device is asked for its real budget anyway, per §156');
}

// ---------------------------------------------------------------------------
console.log('== unclaimed land is walkable, and Greece is not an island ==');
{
  // §160 put 130 unowned-but-PASSABLE cells on the map. Before it, every WASTE
  // cell in the game was also impassable — all nine were deep desert — so
  // `canEnter`'s fall-through-to-false for unowned ground was unreachable dead
  // code. The new cells woke it up as a wall: Philippopolis, Serdica, Naissus
  // and Novae sit on the ground between Thrace and Macedonia, and Thessalonica,
  // Dyrrhachium, Corinth, Athens and Sparta became a land island in every
  // chapter. Byzantion could reach 152 of 307 provinces. Nothing caught it:
  // seeds were valid, polygons were simple, latent groups were contiguous, and
  // a realm cut in half is not a shape any of those look at.
  const MIL = readFileSync(R + '/js/sim/military.js', 'utf8');
  ok(/if \(p\.owner === 'WASTE'\) return true;/.test(MIL),
    'canEnter admits unowned, passable ground — passage is not possession');

  const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
  const provs = MAP_DATA.provinces;
  const idOf = (n) => provs.findIndex((p) => p.name === n) + 1;
  const impassable = new Set(provs.map((p, i) => (p.impassable ? i + 1 : 0)).filter(Boolean));
  const reach = (from) => {
    const seen = new Set([from]); const q = [from];
    while (q.length) {
      for (const nb of snap.neighbors[q.shift()] || []) {
        if (seen.has(nb) || impassable.has(nb)) continue;
        seen.add(nb); q.push(nb);
      }
    }
    return seen;
  };
  const fromByzantion = reach(idOf('Byzantion'));
  // The via Egnatia and the road down into Greece. These are the provinces the
  // outage actually stranded, named so a future frame change cannot re-strand
  // them quietly.
  for (const name of ['Thessalonica', 'Dyrrhachium', 'Corinth', 'Athens', 'Sparta']) {
    ok(fromByzantion.has(idOf(name)), `  ${name} is land-reachable from Byzantion`);
  }
  // And the general shape: the mainland is one walkable body. Islands are
  // allowed to be islands — they are exactly the landmasses the atlas draws
  // as separate rings — so measure against the mainland's own size.
  ok(fromByzantion.size > provs.length * 0.8,
    `  the mainland is one walkable body (${fromByzantion.size}/${provs.length} reachable, `
    + 'the remainder being islands and impassable desert)');
  ok(!fromByzantion.has(idOf('Londinium')),
    '  and Britain is still an island, reachable only by sea');
}

console.log(failures ? `smoke104: ${failures} FAIL` : 'smoke104: ALL PASS');
process.exit(failures ? 1 : 0);
