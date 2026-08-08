// js/map/renderer.js — WebGL2 EU4-style "quasi-3D" map renderer. SPEC §5.1.
//
// Orientation contract (the classic pitfall, handled by convention):
//   * Map coords: x in [0, MAP_W), y in [0, MAP_H), y = 0 is NORTH (project() does this).
//   * Canvas-uploaded textures (land mask, decor) with UNPACK_FLIP_Y_WEBGL = false put the
//     canvas TOP row (north) at texel row v = 0.
//   * Generation passes (province-ID, height) therefore compute mapY = gl_FragCoord.y, so
//     framebuffer row 0 (the FIRST row gl.readPixels returns) also holds mapY = 0 = north.
//     idArray is then a straight copy — row 0 = north, matching what is on screen, and
//     provIdAt() agrees with picking.
//   * The main pass samples every map-space texture at uv = mapXY / mapSize. Consistent.
//
// Flags bitfield contract (shared with js/map/mapmodes.js — keep in sync):
//   bit0 (1)  = diagonal stripes of secondary color over primary (occupation)
//   bit1 (2)  = gray cross-hatch (uninhabited or impassable land)
//   bit2 (4)  = pulse the stripes (unrest/revolt)
//   bits 3..7 = owner class index (0 = none); differing classes draw the 2px country border.

// ---- Tunables (aesthetics — tweak freely) -------------------------------------------------
const CFG = {
  PAPER_ZOOM_LO: 0.55,   // below this zoom the map is full parchment
  PAPER_ZOOM_HI: 0.92,   // above this zoom the parchment is gone
  WARP_AMP: 4.0,         // px of domain-warp wobble on province borders (SPEC §233)
  WARP_FREQ: 0.013,      // noise frequency for the warp
  JITTER_AMP: 1.35,      // sub-texel sampling wobble (map px) — melts the ID-texture staircase
  JITTER_FREQ: 0.2,      // wobble wavelength ~5 texels: smooth waves, not per-texel fray
  PRIM_SCALE: 0.62,      // global multiplier on heightPrimitives' h
  DETAIL_AMP: 0.13,      // fbm micro-relief amplitude
  NORMAL_STRENGTH: 26.0, // slope exaggeration for relief lighting
  STRIPE_PERIOD: 9.0,    // occupation stripe period, CSS px
  HATCH_PERIOD: 7.0,     // wasteland hatch period, CSS px
  BORDER_PROV: 0.38,     // province border darkness 0..1
  BORDER_CTRY: 0.74,     // country border darkness 0..1
  SEA_DEEP: [0.075, 0.195, 0.325],
  SEA_SHALLOW: [0.215, 0.405, 0.53],
  RIVER: [0.23, 0.41, 0.55],
  PARCHMENT: [0.910, 0.863, 0.753], // #e8dcc0
  NEUTRAL_TAN: [212, 199, 170],     // pre-game province fill
  COAST_SAND: [0.78, 0.72, 0.58],   // id-0 fragments inside the drawn coastline
  SELECT_GOLD: [1.0, 0.90, 0.52],
};

// Province seeds live in a float texture rather than a fragment-uniform array.
// This keeps the map expandable beyond WebGL's small guaranteed uniform budget;
// IDs themselves are encoded across two 8-bit channels, so 0 remains sea while
// future layouts can safely grow well past the old 128/255 ceilings.
const MAX_PROVINCE_SEEDS = 512;
// Relief primitives the heightmap pass can carry (SPEC §157). This was a bare
// 32 written into the shader twice and the fill code three times, and v5.4
// spent the last slot — SPEC §53 records the frame growing to Rome and the
// Caspian and filling "the renderer's cap at exactly 32". Any further frame
// would render its new continents as flat plates, silently: line 810 warns
// once and drops the extras.
//
// 64 costs 128 vec4 of fragment uniform, against the 224 that GLES 3.0
// guarantees every WebGL2 device — so it fits the floor rather than a hope
// about hardware, which is the lesson of §156. `initRenderer` measures the
// real number anyway and says so if a device cannot hold it.
// 64 since SPEC §157; 80 since §205 (the eastern and southern frame's twelve
// new ranges). 80×2+16 = 176 vec4 stays inside the guaranteed GLES 3.0 floor
// of 224 that smoke104 checks, and the device's real budget is queried below.
const MAX_HEIGHT_PRIMS = 80;

const fN = (x) => x.toFixed(4);
const f3 = (c) => c.map(fN).join(', ');

const warned = new Set();
function warnOnce(key, ...msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[renderer]', ...msg);
}

// ---- GLSL ---------------------------------------------------------------------------------

const GLSL_NOISE = `
float hash21(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm2(vec2 p){
  return vnoise(p) * 0.667 + vnoise(p * 2.03 + vec2(11.7, 5.3)) * 0.333;
}
`;

const VS_FULLSCREEN = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vClip;
void main(){
  vClip = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FS_ID = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uLand;
uniform vec2 uMapSize;
uniform sampler2D uSeedTex;
uniform int uSeedCount;
uniform float uWarpAmp;
uniform float uWarpFreq;
uniform sampler2D uRegion;   // painted country index per pixel (SPEC §232); 0 = free ground
uniform int uUseRegion;      // 0 when the atlas ships no countryRegions
out vec4 outColor;
${GLSL_NOISE}
void main(){
  vec2 px = gl_FragCoord.xy;              // (mapX, mapY); row v=0 == NORTH
  vec2 uv = px / uMapSize;
  int best = 0;
  if (texture(uLand, uv).r >= 0.5) {
    // The drawn border first (SPEC §232): a pixel inside a painted country is
    // contested only by that country's own seeds, and a country's seeds claim
    // nothing outside it — so the ring IS the border, to the pixel. Read at
    // the UNWARPED pixel: the warp is for the arcs Voronoi invents, not for
    // lines somebody drew.
    int reg = 0;
    if (uUseRegion == 1) reg = int(texelFetch(uRegion, ivec2(px), 0).r * 255.0 + 0.5);
    // One shared domain warp for the whole pixel (NOT per seed) — a few px of
    // organic wobble, no longer the 18px fray of the arc era (SPEC §233):
    // borders waver like hand-inked lines while the weighted diagram stays
    // globally consistent.
    vec2 wv = vec2(fbm2(px * uWarpFreq), fbm2(px * uWarpFreq + vec2(37.2, 91.7)));
    vec2 wp = px + (wv - 0.5) * 2.0 * uWarpAmp;
    float bd = 1e12;
    for (int i = 0; i < ${MAX_PROVINCE_SEEDS}; i++) {
      if (i >= uSeedCount) break;
      vec4 seed = texelFetch(uSeedTex, ivec2(i, 0), 0);
      if (int(seed.w + 0.5) != reg) continue;
      float d = distance(wp, seed.xy) / max(seed.z, 0.05);
      if (d < bd) { bd = d; best = i + 1; }
    }
  }
  int lo = best % 256;
  int hi = best / 256;
  outColor = vec4(float(lo) / 255.0, float(hi) / 255.0, 0.0, 1.0);
}
`;

const FS_HEIGHT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uLand;
uniform vec2 uMapSize;
uniform vec4 uPrimA[${MAX_HEIGHT_PRIMS}];   // ridge/basin: ax,ay,bx,by · dome: cx,cy,0,0
uniform vec4 uPrimB[${MAX_HEIGHT_PRIMS}];   // h(pre-scaled), width px, type(0 ridge,1 dome,2 basin), 0
uniform int uPrimCount;
out vec4 outColor;
${GLSL_NOISE}
float distSeg(vec2 p, vec2 a, vec2 b){
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  return distance(p, a + ab * t);
}
void main(){
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uMapSize;
  float land = texture(uLand, uv).r;
  float coarse = textureLod(uLand, uv, 5.0).r;   // smoothed mask -> coast falloff
  float h = 0.045 + 0.15 * coarse + 0.055 * land; // sea ~0.05, plains ~0.25
  for (int i = 0; i < ${MAX_HEIGHT_PRIMS}; i++) {
    if (i >= uPrimCount) break;
    vec4 A = uPrimA[i];
    vec4 B = uPrimB[i];
    float d = (B.z > 0.5 && B.z < 1.5) ? distance(px, A.xy) : distSeg(px, A.xy, A.zw);
    h += B.x * exp(-(d * d) / max(B.y * B.y, 1.0));
  }
  h += (fbm2(px * 0.02) - 0.5) * ${fN(CFG.DETAIL_AMP)} * smoothstep(0.12, 0.34, h) * land;
  outColor = vec4(vec3(clamp(h, 0.0, 1.0)), 1.0);
}
`;

const FS_MAIN = `#version 300 es
precision highp float;
precision highp int;
in vec2 vClip;
out vec4 outColor;
uniform vec4 uOffsetScale;   // map = xy + clip * zw   (camera transform)
uniform vec2 uMapSize;
uniform float uTime;         // seconds, wrapped at 2*pi*1000
uniform float uZoom;
uniform float uPaper;
uniform float uRelief;
uniform float uFlat;
uniform float uDpr;
uniform int uSelected;
uniform int uMaxId;
uniform sampler2D uId;
uniform sampler2D uHeight;
uniform sampler2D uLand;
uniform sampler2D uDecor;
uniform sampler2D uLookA;
uniform sampler2D uLookB;
uniform sampler2D uFlagsTex;
uniform sampler2D uTerr;
uniform sampler2D uProvinceMap;
${GLSL_NOISE}
int cellIdAt(ivec2 ip){
  ip = clamp(ip, ivec2(0), ivec2(uMapSize) - 1);
  vec2 enc = texelFetch(uId, ip, 0).rg;
  int id = int(enc.r * 255.0 + 0.5) + 256 * int(enc.g * 255.0 + 0.5);
  return min(id, uMaxId);
}
int provinceOf(int cellId){
  if (cellId == 0) return 0;
  vec2 enc = texelFetch(uProvinceMap, ivec2(cellId, 0), 0).rg;
  return int(enc.r * 255.0 + 0.5) + 256 * int(enc.g * 255.0 + 0.5);
}
int idAt(ivec2 ip){ return provinceOf(cellIdAt(ip)); }
int flagsOf(int id){
  return int(texelFetch(uFlagsTex, ivec2(id, 0), 0).r * 255.0 + 0.5);
}
int classOf(int id){
  return int(texelFetch(uLookA, ivec2(id, 0), 0).a * 255.0 + 0.5);
}
void main(){
  vec2 map = uOffsetScale.xy + vClip * uOffsetScale.zw;
  vec2 uv = map / uMapSize;
  bool inMap = uv.x >= 0.0 && uv.x < 1.0 && uv.y >= 0.0 && uv.y < 1.0;
  // Sub-texel wobble on the ID lookup only: melts the NEAREST staircase into an
  // organic edge. Static in map space (no shimmer); sub-screen-pixel when zoomed out.
  vec2 jw = vec2(fbm2(map * ${fN(CFG.JITTER_FREQ)}), fbm2(map * ${fN(CFG.JITTER_FREQ)} + vec2(53.1, 91.3)));
  vec2 jmap = map + (jw - 0.5) * 2.0 * ${fN(CFG.JITTER_AMP)};
  ivec2 ip = ivec2(clamp(jmap, vec2(0.0), uMapSize - vec2(1.0)));
  int id = inMap ? idAt(ip) : 0;
  float land = inMap ? texture(uLand, uv).r : 0.0;
  float coarse = inMap ? textureLod(uLand, uv, 4.5).r : 0.0;
  int flags = flagsOf(id);

  // ---- fill (mapmode lookup + stripes/hatch) ----
  vec3 fill = texelFetch(uLookA, ivec2(id, 0), 0).rgb;
  if (id == 0) fill = vec3(${f3(CFG.COAST_SAND)}); // jitter can land just past the coastline: beach, not black
  vec3 fillB = texelFetch(uLookB, ivec2(id, 0), 0).rgb;
  float pulse = 0.5 + 0.5 * sin(uTime * 3.0);
  float stripeMix = ((flags & 4) != 0) ? (0.5 + 0.5 * pulse) : 0.92;
  if ((flags & 1) != 0) {
    float period = ${fN(CFG.STRIPE_PERIOD)} * uDpr;
    float sp = mod(gl_FragCoord.x + gl_FragCoord.y, period);
    if (sp < period * 0.5) fill = mix(fill, fillB, stripeMix);
  }
  if ((flags & 2) != 0) {
    float lum2 = dot(fill, vec3(0.299, 0.587, 0.114));
    fill = mix(fill, vec3(lum2), 0.55);
    // hatch lines pick contrast against the fill (dark wasteland gets light lines)
    vec3 hatchCol = lum2 > 0.45 ? vec3(0.24, 0.23, 0.21) : vec3(0.58, 0.56, 0.52);
    float hp = ${fN(CFG.HATCH_PERIOD)} * uDpr;
    float p1 = mod(gl_FragCoord.x + gl_FragCoord.y, hp);
    float p2 = mod(gl_FragCoord.x - gl_FragCoord.y + 4096.0, hp);
    if (min(p1, p2) < 1.2 * uDpr) fill = mix(fill, hatchCol, 0.5);
  }

  // ---- relief lighting (normals from height gradient, NW light) ----
  float h = inMap ? texture(uHeight, uv).r : 0.05;
  vec2 e = 1.5 / uMapSize;
  float hx = texture(uHeight, uv + vec2(e.x, 0.0)).r - texture(uHeight, uv - vec2(e.x, 0.0)).r;
  float hy = texture(uHeight, uv + vec2(0.0, e.y)).r - texture(uHeight, uv - vec2(0.0, e.y)).r;
  float rs = uRelief * (1.0 - 0.85 * uFlat) * (1.0 - 0.72 * uPaper);
  vec3 nrm = normalize(vec3(-hx * ${fN(CFG.NORMAL_STRENGTH)}, -hy * ${fN(CFG.NORMAL_STRENGTH)}, 1.0));
  float lambert = clamp(dot(nrm, normalize(vec3(-0.5, -0.7, 0.6))), 0.0, 1.0);
  float shade = mix(1.0, 0.56 + lambert * 0.77, rs);
  vec3 tinted = mix(fill, fill * vec3(0.93, 0.87, 0.78) + vec3(0.05), smoothstep(0.45, 0.95, h) * rs * 0.65);
  vec3 landCol = tinted * shade;

  // ---- terrain grain (per-province class, fades in past parchment zoom) ----
  float dfade = (1.0 - uPaper) * smoothstep(0.85, 1.7, uZoom) * (1.0 - 0.8 * uFlat);
  if (id != 0 && dfade > 0.003) {
    int tc = int(texelFetch(uTerr, ivec2(id, 0), 0).r * 255.0 + 0.5);
    float d = 0.0;
    if (tc == 5) {              // desert: wind-banded dunes
      float band = sin(map.x * 0.55 + map.y * 0.22 + fbm2(map * 0.05) * 6.0);
      d = band * (0.3 + 0.7 * fbm2(map * 0.11)) * 0.6;
    } else if (tc == 4) {       // mountains: craggy ridged noise
      d = (1.0 - abs(fbm2(map * 0.10) * 2.0 - 1.0)) - 0.55;
    } else if (tc == 3) {       // hills: soft rolling lumps
      d = (fbm2(map * 0.07) - 0.5) * 0.8;
    } else if (tc == 2) {       // farmland: soft anisotropic field patches
      d = (vnoise(map * vec2(0.09, 0.16)) - 0.5) * 0.65;
    } else if (tc == 8) {       // marsh: wavering horizontal reed bands
      d = sin(map.y * 0.85 + fbm2(map * 0.18) * 5.0) * 0.4 * (fbm2(map * vec2(0.3, 0.08)) - 0.2);
    } else if (tc != 0) {       // coast/steppe/drylands: light speckle
      d = (vnoise(map * 0.9) - 0.5) * 0.45;
    }
    landCol *= 1.0 + d * 0.16 * dfade;
  }

  // ---- rivers (decor luminance; R8 since SPEC §232) ----
  float riv = inMap ? texture(uDecor, uv).r : 0.0;
  landCol = mix(landCol, vec3(${f3(CFG.RIVER)}) * (0.65 + 0.35 * shade), riv * 0.8);

  // ---- sea: deep -> shallow via smoothed land mask, faint animated noise ----
  float depth = clamp(coarse * 2.3, 0.0, 1.0);
  float sn = fbm2(map * 0.016 + vec2(uTime * 0.05, uTime * 0.023));
  vec3 seaCol = mix(vec3(${f3(CFG.SEA_DEEP)}), vec3(${f3(CFG.SEA_SHALLOW)}), depth) + (sn - 0.5) * 0.05;
  float lm = smoothstep(0.42, 0.58, land);
  float coastEdge = (1.0 - lm) * smoothstep(0.08, 0.42, land);
  seaCol = mix(seaCol, vec3(0.10, 0.16, 0.22), coastEdge * 0.55);
  // ---- breathing foam line just offshore ----
  float foam = smoothstep(0.30, 0.42, land) * (1.0 - lm);
  float fn = fbm2(map * 0.10 + vec2(uTime * 0.12, -uTime * 0.07));
  seaCol = mix(seaCol, vec3(0.75, 0.82, 0.84), foam * (0.18 + 0.32 * fn) * (1.0 - uPaper));
  vec3 col = mix(seaCol, landCol, lm);

  // ---- parchment crossfade ----
  vec3 parch = vec3(${f3(CFG.PARCHMENT)});
  float grain = (hash21(floor(map * 0.8)) - 0.5) * 0.05 + (fbm2(map * 0.006) - 0.5) * 0.07;
  float lum = dot(fill, vec3(0.299, 0.587, 0.114));
  vec3 paperLand = mix(mix(fill, vec3(lum), 0.32), parch, 0.44) * mix(1.0, shade, 0.35) + grain;
  vec3 paperSea = parch * vec3(0.80, 0.89, 0.92) + grain * 0.8;
  paperSea = mix(paperSea, parch * vec3(0.52, 0.55, 0.58), coastEdge * 0.7);
  vec3 pcol = mix(paperSea, paperLand, lm);
  col = mix(col, pcol, uPaper);

  // ---- borders from ID discontinuities (screen-width compensated) ----
  if (id != 0) {
    int b1 = int(max(1.0, 1.0 / uZoom) + 0.5);
    int idR = idAt(ip + ivec2(b1, 0));
    int idD = idAt(ip + ivec2(0, b1));
    bool provB = (idR != id && idR != 0) || (idD != id && idD != 0);
    // Owner class rides lookA's alpha byte (SPEC §173) — the flags byte's
    // 5-bit field topped out at 30 owners and one era now seats nearly fifty;
    // two clamped neighbors lost the border between them. Alpha was uploaded
    // as a constant 255 and never read, so the full 8-bit class costs nothing.
    int cSelf = classOf(id);
    int iL = idAt(ip - ivec2(b1, 0));
    int iU = idAt(ip - ivec2(0, b1));
    bool ctryB =
      (idR != 0 && classOf(idR) != cSelf) ||
      (idD != 0 && classOf(idD) != cSelf) ||
      (iL != 0 && classOf(iL) != cSelf) ||
      (iU != 0 && classOf(iU) != cSelf);
    float bs = mix(1.0, 1.55, uPaper);
    if (provB) col = mix(col, vec3(0.14, 0.11, 0.08), clamp(${fN(CFG.BORDER_PROV)} * bs, 0.0, 0.85));
    if (ctryB) col = mix(col, vec3(0.09, 0.065, 0.05), clamp(${fN(CFG.BORDER_CTRY)} * bs, 0.0, 0.92));

    // ---- selected province: brighten + pulsing gold rim ----
    if (id == uSelected) {
      col *= 1.10;
      int rr = int(max(2.0, 2.0 / uZoom) + 0.5);
      bool rim = idAt(ip + ivec2(rr, 0)) != id || idAt(ip - ivec2(rr, 0)) != id
              || idAt(ip + ivec2(0, rr)) != id || idAt(ip - ivec2(0, rr)) != id;
      if (rim) col = mix(col, vec3(${f3(CFG.SELECT_GOLD)}), 0.45 + 0.35 * sin(uTime * 4.0));
    }
  }

  outColor = vec4(col, 1.0);
}
`;

// ---- JS helpers ---------------------------------------------------------------------------

function showErrorDiv(canvas, msg) {
  try {
    const div = document.createElement('div');
    div.style.cssText =
      'position:absolute;left:12px;top:12px;right:12px;z-index:60;padding:12px 16px;' +
      'background:rgba(38,14,10,0.94);color:#f0d9c8;border:1px solid #a33;' +
      'font:13px/1.5 monospace;white-space:pre-wrap;pointer-events:none;border-radius:4px';
    div.textContent = '[renderer] ' + msg;
    (canvas.parentElement || document.body).appendChild(div);
  } catch (e) { /* headless — nothing to show */ }
}

function numberSource(src) {
  return src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n');
}

function buildLandCanvas(MAP_DATA) {
  const c = document.createElement('canvas');
  c.width = MAP_DATA.MAP_W;
  c.height = MAP_DATA.MAP_H;
  const x2 = c.getContext('2d');
  x2.fillStyle = '#000';
  x2.fillRect(0, 0, c.width, c.height);
  const coast = MAP_DATA.coast || {};
  const fillPolys = (polys, color) => {
    x2.fillStyle = color;
    for (const poly of polys || []) {
      if (!poly || poly.length < 3) continue;
      x2.beginPath();
      for (let i = 0; i < poly.length; i++) {
        const [px, py] = MAP_DATA.project(poly[i][0], poly[i][1]);
        if (i === 0) x2.moveTo(px, py); else x2.lineTo(px, py);
      }
      x2.closePath();
      x2.fill();
    }
  };
  if (!coast.land || !coast.land.length) {
    warnOnce('no-coast', 'MAP_DATA.coast.land missing — treating the whole map as land');
    x2.fillStyle = '#fff';
    x2.fillRect(0, 0, c.width, c.height);
  } else {
    fillPolys(coast.land, '#fff');
    fillPolys(coast.lakes, '#000');
  }
  return c;
}

function buildDecorCanvas(MAP_DATA) {
  const c = document.createElement('canvas');
  c.width = MAP_DATA.MAP_W;
  c.height = MAP_DATA.MAP_H;
  const x2 = c.getContext('2d');
  // Black ground, white strokes (SPEC §232): the channel is now luminance in
  // .r rather than coverage in .a, so the R8 upload below carries the same
  // soft-bank/channel distinction the alpha used to.
  x2.fillStyle = '#000';
  x2.fillRect(0, 0, c.width, c.height);
  x2.lineJoin = 'round';
  x2.lineCap = 'round';
  const strokeRiver = (river, widthMul, alpha) => {
    const pts = river.points || [];
    if (pts.length < 2) return;
    x2.strokeStyle = `rgba(255,255,255,${alpha})`;
    x2.lineWidth = Math.max(0.8, (river.width || 1) * widthMul);
    x2.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [px, py] = MAP_DATA.project(pts[i][0], pts[i][1]);
      if (i === 0) x2.moveTo(px, py); else x2.lineTo(px, py);
    }
    x2.stroke();
  };
  for (const river of MAP_DATA.rivers || []) {
    strokeRiver(river, 3.2, 0.22); // soft bank underlay
    strokeRiver(river, 1.4, 0.85); // channel
  }
  return c;
}

function makeStub(MAP_DATA) {
  const W = MAP_DATA.MAP_W | 0, H = MAP_DATA.MAP_H | 0;
  const N = (MAP_DATA.provinces || []).length;
  const idArray = new Uint16Array(W * H);
  const provinceMap = new Uint16Array(N + 1);
  for (let id = 0; id <= N; id++) provinceMap[id] = id;
  const noop = () => {};
  return {
    idArray,
    provIdAt(mapX, mapY) {
      const x = Math.min(W - 1, Math.max(0, Math.floor(mapX)));
      const y = Math.min(H - 1, Math.max(0, Math.floor(mapY)));
      return provinceMap[idArray[y * W + x]] || 0;
    },
    setProvinceMapping(mapping) {
      if (!mapping || mapping.length < N + 1) return;
      provinceMap.set(mapping.subarray(0, N + 1));
    },
    setProvinceTerrains: noop,
    setProvinceColors: noop,
    setMapmodeParams: noop,
    setSelected: noop,
    render: noop,
    resize: noop,
  };
}

function smoothstepJs(lo, hi, x) {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

// Point-in-polygon by ray casting; the ring is closed implicitly. The ring is
// projected into pixel space first, so the test never has to invert (or assume
// anything about) the atlas projection.
function insideRing(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y)
      && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi) inside = !inside;
  }
  return inside;
}

// Beads and ribbons (SPEC §232): the land canvas is filled with antialiasing
// (Canvas2D offers no way off), so a coast carries a one-pixel strip of
// blended texels the ID pass reads as land — and under the drawn-borders
// regime the id that strip gets can be ABSURD, because every local seed is
// ring-locked and the nearest ELIGIBLE seed is an unregioned island or
// desert three countries away. Measured: Atlas ribbons on the Asturian
// shore, Aleria along Dalmatia, and 3,400 pixels of Panormus strung along
// ring-locked Italy's coast — dragging Panormus' own centroid into the
// Tyrrhenian and every 'Roman Sicily' label with it, while handing the sim
// phantom land roads (Spain walked to Morocco; Rome's second century
// stalled on the distorted border calculus). Rather than chase each strait:
// any 4-connected fragment of a cell that does not contain its seed dies if
// it is either smaller than DESPECKLE_MIN or made ENTIRELY of antialiased
// edge texels — a real island has interior pixels at full 255 and keeps
// itself at any size; a ribbon is all edge and cannot.
const DESPECKLE_MIN = 12;
export function despeckleProvinceRaster(idArray, MAP_DATA, landBytes) {
  const W = MAP_DATA.MAP_W | 0;
  const H = MAP_DATA.MAP_H | 0;
  const provinces = MAP_DATA.provinces || [];
  if (!idArray || idArray.length < W * H) return 0;
  const seedPx = new Int32Array(provinces.length + 1).fill(-1);
  for (let i = 0; i < provinces.length; i++) {
    const p = provinces[i];
    if (!p || typeof p.lon !== 'number') continue;
    const [sx, sy] = MAP_DATA.project(p.lon, p.lat);
    seedPx[i + 1] = Math.max(0, Math.min(H - 1, Math.floor(sy))) * W
      + Math.max(0, Math.min(W - 1, Math.floor(sx)));
  }
  const seen = new Uint8Array(W * H);
  let comp = new Int32Array(4096);
  let cleaned = 0;
  for (let start = 0; start < idArray.length; start++) {
    if (seen[start] || !idArray[start]) continue;
    const id = idArray[start];
    let n = 0;
    let hasSeed = false;
    let allEdge = !landBytes || landBytes[start] !== 255;
    comp[0] = start;
    n = 1;
    seen[start] = 1;
    for (let head = 0; head < n; head++) {
      const at = comp[head];
      if (at === seedPx[id]) hasSeed = true;
      const x = at % W;
      const y = (at / W) | 0;
      for (const next of [x > 0 ? at - 1 : -1, x + 1 < W ? at + 1 : -1,
        y > 0 ? at - W : -1, y + 1 < H ? at + W : -1]) {
        if (next < 0 || seen[next] || idArray[next] !== id) continue;
        seen[next] = 1;
        if (n === comp.length) {
          const grown = new Int32Array(comp.length * 2);
          grown.set(comp);
          comp = grown;
        }
        comp[n++] = next;
        if (allEdge && landBytes && landBytes[next] === 255) allEdge = false;
      }
    }
    if (hasSeed || (n >= DESPECKLE_MIN && !(landBytes && allEdge))) continue;
    // A fragment too small to be anybody's island: give it to whichever
    // neighboring id surrounds it most; failing any land neighbor, the sea.
    const votes = new Map();
    for (let k = 0; k < n; k++) {
      const at = comp[k];
      const x = at % W;
      const y = (at / W) | 0;
      for (const next of [x > 0 ? at - 1 : -1, x + 1 < W ? at + 1 : -1,
        y > 0 ? at - W : -1, y + 1 < H ? at + W : -1]) {
        if (next < 0) continue;
        const v = idArray[next];
        if (v && v !== id) votes.set(v, (votes.get(v) || 0) + 1);
      }
    }
    let best = 0;
    let bestVotes = 0;
    for (const [v, c] of votes) if (c > bestVotes) { best = v; bestVotes = c; }
    for (let k = 0; k < n; k++) idArray[comp[k]] = best;
    cleaned += n;
  }
  return cleaned;
}

// A weighted Voronoi cell can occasionally jump a narrow sea and claim a
// second coastline.  That is especially visible around the two gulfs: Taba,
// Eilat and the Sinai interior used to grow detached pieces in Arabia.  For
// provinces explicitly marked contiguous by the atlas, keep the component
// containing the seed and flood the detached pixels from the surrounding
// legitimate provinces.  The repair is data-driven because island provinces
// are intentionally allowed to have more than one land component.
//
// Component repair alone cannot hold a big, heavily weighted cell inside the
// land it names: Sinai touches both Africa and Arabia around the heads of its
// gulfs, so a leak into mainland Egypt is CONNECTED and therefore invisible to
// the component pass.  `MAP_DATA.provinceRasterRegions` answers that with an
// atlas envelope in lon/lat — every pixel a named province claims outside its
// envelope joins the same detached mask and is handed back to its neighbors.
export function repairDisconnectedProvinceRaster(idArray, MAP_DATA) {
  const W = MAP_DATA.MAP_W | 0;
  const H = MAP_DATA.MAP_H | 0;
  const provinces = MAP_DATA.provinces || [];
  const names = Array.isArray(MAP_DATA.contiguousProvinces)
    ? MAP_DATA.contiguousProvinces : [];
  const regions = (MAP_DATA.provinceRasterRegions && typeof MAP_DATA.provinceRasterRegions === 'object')
    ? MAP_DATA.provinceRasterRegions : {};
  const regionNames = Object.keys(regions);
  if (!idArray || idArray.length < W * H || (!names.length && !regionNames.length)) return 0;

  const idByName = new Map(provinces.map((p, i) => [p.name, i + 1]));
  const detached = new Uint8Array(W * H);
  // The province a stray pixel may NOT be handed back to: the one that just
  // lost it. Without this a leak whose only legitimate neighbor is the leaking
  // province simply re-floods itself.
  const banned = new Uint16Array(W * H);
  let detachedCount = 0;

  // The envelopes first: project the ring once, then test every pixel the
  // named province claims against it. The seed's own pixel is never taken, so
  // an envelope drawn too tight can shrink a province but never delete it.
  for (const name of regionNames) {
    const target = idByName.get(name);
    const ring = regions[name];
    const seed = provinces[target - 1];
    if (!target || !seed || !Array.isArray(ring) || ring.length < 3) continue;
    const pxRing = ring.map(([lon, lat]) => MAP_DATA.project(lon, lat));
    const [sx0, sy0] = MAP_DATA.project(seed.lon, seed.lat);
    const seedPx = Math.max(0, Math.min(H - 1, Math.floor(sy0))) * W
      + Math.max(0, Math.min(W - 1, Math.floor(sx0)));
    for (let at = 0; at < idArray.length; at++) {
      if (idArray[at] !== target || at === seedPx || detached[at]) continue;
      if (insideRing(pxRing, (at % W) + 0.5, ((at / W) | 0) + 0.5)) continue;
      detached[at] = 1;
      banned[at] = target;
      detachedCount++;
    }
  }

  for (const name of names) {
    const target = idByName.get(name);
    const seed = provinces[target - 1];
    if (!target || !seed) continue;
    const [sx0, sy0] = MAP_DATA.project(seed.lon, seed.lat);
    const sx = Math.max(0, Math.min(W - 1, Math.floor(sx0)));
    const sy = Math.max(0, Math.min(H - 1, Math.floor(sy0)));
    const seedPx = sy * W + sx;
    const seen = new Uint8Array(W * H);
    const comps = [];

    for (let start = 0; start < idArray.length; start++) {
      if (seen[start] || idArray[start] !== target) continue;
      const pixels = [];
      const queue = [start];
      seen[start] = 1;
      let containsSeed = false;
      for (let q = 0; q < queue.length; q++) {
        const at = queue[q];
        pixels.push(at);
        if (at === seedPx) containsSeed = true;
        const x = at % W;
        const y = (at / W) | 0;
        const visit = (next) => {
          if (!seen[next] && idArray[next] === target) {
            seen[next] = 1;
            queue.push(next);
          }
        };
        if (x > 0) visit(at - 1);
        if (x + 1 < W) visit(at + 1);
        if (y > 0) visit(at - W);
        if (y + 1 < H) visit(at + W);
      }
      comps.push({ pixels, containsSeed });
    }
    if (comps.length < 2) continue;
    let keep = comps.find((c) => c.containsSeed);
    if (!keep) keep = comps.reduce((a, b) => (a.pixels.length >= b.pixels.length ? a : b));
    for (const comp of comps) {
      if (comp === keep) continue;
      for (const px of comp.pixels) {
        if (!detached[px]) {
          detached[px] = 1;
          detachedCount++;
        }
      }
    }
  }
  if (!detachedCount) return 0;

  // Multi-source flood fill: every legitimate land neighbor advances into
  // the detached union.  Treating all marked cells as one mask prevents a bad
  // Sinai fragment merely being relabeled as a bad Taba fragment, and the
  // banned id keeps a leak from being handed straight back to the province it
  // leaked out of.  A round that places nothing lifts the ban and finishes the
  // job, so no pixel is ever left holding a stale id.
  const queue = new Int32Array(detachedCount);
  const around = (at) => {
    const x = at % W;
    const y = (at / W) | 0;
    const out = [];
    if (x > 0) out.push(at - 1);
    if (x + 1 < W) out.push(at + 1);
    if (y > 0) out.push(at - W);
    if (y + 1 < H) out.push(at + W);
    return out;
  };
  for (let relaxed = 0; relaxed < 2; relaxed++) {
    let head = 0, tail = 0;
    for (let at = 0; at < detached.length; at++) {
      if (!detached[at]) continue;
      let replacement = 0;
      for (const next of around(at)) {
        if (detached[next] || !idArray[next]) continue;
        if (!relaxed && idArray[next] === banned[at]) continue;
        replacement = idArray[next];
        break;
      }
      if (replacement) {
        idArray[at] = replacement;
        detached[at] = 0;
        queue[tail++] = at;
      }
    }
    while (head < tail) {
      const at = queue[head++];
      for (const next of around(at)) {
        if (!detached[next]) continue;
        if (!relaxed && idArray[at] === banned[next]) continue;
        idArray[next] = idArray[at];
        detached[next] = 0;
        queue[tail++] = next;
      }
    }
    let left = 0;
    for (let at = 0; at < detached.length; at++) if (detached[at]) { left = 1; break; }
    if (!left) break; // every stray pixel found a home under the ban
  }
  return detachedCount;
}

// ---- entry --------------------------------------------------------------------------------

export async function initRenderer(canvas, MAP_DATA, DEFINES) {
  const W = MAP_DATA.MAP_W | 0;
  const H = MAP_DATA.MAP_H | 0;
  const provinces = MAP_DATA.provinces || [];
  const N = provinces.length;
  const lookW = N + 1;

  let gl = null;
  let contextLost = false;
  // Chrome evicts WebGL contexts of long-backgrounded tabs; without this the
  // map goes silently black while the sim keeps ticking. preventDefault is
  // required for 'webglcontextrestored' to ever fire.
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    contextLost = true;
    showErrorDiv(canvas, 'Graphics context lost — the map is paused. Reload the page to restore it.');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    // Full GPU-resource rebuild is out of scope for the slice; a reload restores everything.
    window.location.reload();
  });
  try {
    gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
  } catch (e) { gl = null; }
  if (!gl) {
    showErrorDiv(canvas, 'WebGL2 is unavailable in this browser — the map cannot render.');
    return makeStub(MAP_DATA);
  }

  // What this device will actually hold (SPEC §156). The 4096 ceiling every
  // frame decision in this project has been made against was never measured —
  // it lived as prose in map_data.js ("stays under the common 4096
  // MAX_TEXTURE_SIZE floor") and `getParameter` was never called anywhere in
  // the codebase. So the map has been sized against an assumption, on every
  // device, since the beginning.
  //
  // Report it rather than act on it. Choosing a frame is a cartography
  // decision, and the memory audit in §156 says the interesting frame does not
  // fit in RGBA8 anyway; what this fixes is that nobody could see the number.
  // A device that cannot hold the map we ship gets told so, once, instead of
  // failing with an unexplained black screen.
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) | 0;
  // The relief pass's own ceiling (SPEC §157), measured for the same reason.
  const maxFragVec = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) | 0;
  if (maxFragVec && maxFragVec < MAX_HEIGHT_PRIMS * 2 + 16) {
    console.warn('[map/renderer] this device reports MAX_FRAGMENT_UNIFORM_VECTORS '
      + maxFragVec + '; the heightmap pass wants ' + (MAX_HEIGHT_PRIMS * 2 + 16)
      + ' — relief may fail to compile.');
  }
  const needTex = Math.max(W, H);
  if (needTex > maxTex) {
    console.warn('[map/renderer] this device reports MAX_TEXTURE_SIZE ' + maxTex
      + ' but the map needs ' + needTex + ' (' + W + '\u00d7' + H + '); '
      + 'the province-ID and relief passes will fail.');
    showErrorDiv(canvas, 'This device supports textures up to ' + maxTex + 'px, but the map needs '
      + needTex + 'px. The map cannot render here.');
    return makeStub(MAP_DATA);
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  gl.disable(gl.DITHER); // exact 8-bit ID values must survive the ID pass readback

  // -- shader compilation --------------------------------------------------
  function compileShader(type, src, label) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(`[renderer] ${label} compile failed:\n${gl.getShaderInfoLog(sh)}\n${numberSource(src)}`);
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }
  function makeProgram(vsSrc, fsSrc, label) {
    const vs = compileShader(gl.VERTEX_SHADER, vsSrc, label + '.vs');
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSrc, label + '.fs');
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(`[renderer] ${label} link failed: ${gl.getProgramInfoLog(prog)}`);
      return null;
    }
    return prog;
  }

  const idProg = makeProgram(VS_FULLSCREEN, FS_ID, 'id-pass');
  const heightProg = makeProgram(VS_FULLSCREEN, FS_HEIGHT, 'height-pass');
  const mainProg = makeProgram(VS_FULLSCREEN, FS_MAIN, 'main-pass');
  if (!mainProg) showErrorDiv(canvas, 'Map shader failed to compile — see the console for the info log.');

  // -- fullscreen triangle -------------------------------------------------
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // -- textures --------------------------------------------------------------
  function setTexParams(filter, mips) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter === gl.NEAREST ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  // One byte a texel for the canvas-built planes (SPEC §232). The land mask
  // has only ever been read as .r and the river decor now draws luminance, so
  // RGBA8 spent three dead bytes a texel on each — mipmapped, which made it
  // four-thirds of three. R8 keeps the bilinear filtering and the mip chain
  // and cuts the two planes from 468 MB to 117 at this frame; getImageData
  // pays one transient readback per plane at boot for it.
  function redChannel(srcCanvas) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const rgba = srcCanvas.getContext('2d').getImageData(0, 0, w, h).data;
    const red = new Uint8Array(w * h);
    for (let i = 0, n = w * h; i < n; i++) red[i] = rgba[i * 4];
    return red;
  }
  function byteTexture(bytes, w, h, mips) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, bytes);
    if (mips) gl.generateMipmap(gl.TEXTURE_2D);
    setTexParams(gl.LINEAR, mips);
    return t;
  }
  function canvasTexture(srcCanvas, mips) {
    return byteTexture(redChannel(srcCanvas), srcCanvas.width, srcCanvas.height, mips);
  }
  // Full-size render targets, in the narrowest format that carries the data
  // (SPEC §158). Both of these were RGBA8 and neither ever used four channels:
  // the ID pass writes `vec4(lo/255, hi/255, 0, 1)` and the main pass reads
  // `texelFetch(uId, ip, 0).rg`, and the relief pass writes a grey and is read
  // as `.r` in three places. So half the ID plane and three quarters of the
  // relief plane have always been zeroes taking up video memory — 25 MB of it
  // at today's frame, and 152 MB at the frame that reaches Britain.
  //
  // R8 and RG8 are both colour-renderable in GLES 3.0, so this is a format
  // change and not a rewrite: the shaders are untouched, because a fragment
  // may write a vec4 to a narrower target and the extra channels are simply
  // discarded — which is exactly what was happening to the alpha already.
  function targetTexture(filter, internal, format) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal || gl.RGBA8, W, H, 0,
      format || gl.RGBA, gl.UNSIGNED_BYTE, null);
    setTexParams(filter, false);
    return t;
  }

  // The land bytes serve twice: the R8 texture, and the land gate on the
  // country-region seam heal (SPEC §232 — a heal that cannot tell sea from
  // land floods the open Mediterranean with paint and beads far countries
  // onto foreign coasts).
  const landBytes = redChannel(buildLandCanvas(MAP_DATA));
  const landTex = byteTexture(landBytes, W, H, true);
  const decorTex = canvasTexture(buildDecorCanvas(MAP_DATA), true);
  const idTex = targetTexture(gl.NEAREST, gl.RG8, gl.RG); // NEAREST, no mips — texelFetch in the main pass
  const heightTex = targetTexture(gl.LINEAR, gl.R8, gl.RED);

  // -- generation passes -----------------------------------------------------
  const idArray = new Uint16Array(W * H);
  const fbo = gl.createFramebuffer();
  function runPass(prog, target, label, setup) {
    if (!prog) return false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      console.error(`[renderer] ${label} framebuffer incomplete`);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return false;
    }
    gl.viewport(0, 0, W, H);
    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    setup(prog);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  }

  // Province-ID pass: warped weighted-nearest-seed diagram, land-masked.
  // A texture carries seed data so the shader's uniform budget does not cap
  // expansion. The fixed loop bound remains deliberately finite for mobile GPUs.
  const seedCount = Math.min(N, MAX_PROVINCE_SEEDS);
  if (N > MAX_PROVINCE_SEEDS) {
    warnOnce('seed-cap', `province count ${N} exceeds the ${MAX_PROVINCE_SEEDS}-seed renderer cap; extras get no territory`);
  }
  // The drawn borders (SPEC §232): each seed carries its country's paint
  // index in the w channel, and a full-frame R8 texture carries the painted
  // ground. Both live only as long as this pass — the texture is deleted the
  // moment the raster is read back, so the 46 MB never sits in video memory
  // while the game runs.
  const regionOfCell = new Map();
  (MAP_DATA.countryRegions || []).forEach((reg, idx) => {
    for (const nm of (reg && reg.cells) || []) regionOfCell.set(nm, idx + 1);
  });
  const seedArr = new Float32Array(Math.max(1, seedCount) * 4);
  for (let i = 0; i < seedCount; i++) {
    const p = provinces[i];
    const xy = (p && typeof p.lon === 'number') ? MAP_DATA.project(p.lon, p.lat) : [0, 0];
    seedArr[i * 4] = xy[0];
    seedArr[i * 4 + 1] = xy[1];
    seedArr[i * 4 + 2] = (p && p.weight) || 1.0;
    seedArr[i * 4 + 3] = (p && regionOfCell.get(p.name)) || 0;
  }
  // SPEC §233 tried an additive metric here (d − B·ln w, hyperbola borders,
  // provably no closed discs) and measured the price: the metric IS the road
  // network. Two hundred adjacencies churned — Masada lost Hebron, Damascus
  // lost Palmyra, Rome marched to Seleucid Hyrcania around the Caspian when
  // the Karakum wall thinned — and every one of them is somebody's marching
  // route, event site, or story assertion. The ratio metric stays; the
  // circles die where the eye actually meets them, under drawn borders
  // (countryRegions), and the warp cut above kills the fray.
  const seedTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, seedTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, Math.max(1, seedCount), 1,
    0, gl.RGBA, gl.FLOAT, seedArr);
  setTexParams(gl.NEAREST, false);
  const regionArray = (regionOfCell.size && typeof MAP_DATA.rasterizeCountryRegions === 'function')
    ? MAP_DATA.rasterizeCountryRegions(MAP_DATA, (x, y) => landBytes[y * W + x] >= 128) : null;
  let regionTex = null;
  {
    regionTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, regionTex);
    if (regionArray) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, W, H, 0, gl.RED, gl.UNSIGNED_BYTE, regionArray);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array(1));
    }
    setTexParams(gl.NEAREST, false);
  }
  const idOk = runPass(idProg, idTex, 'id-pass', (prog) => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, landTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'uLand'), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, seedTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'uSeedTex'), 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, regionTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'uRegion'), 2);
    gl.uniform1i(gl.getUniformLocation(prog, 'uUseRegion'), regionArray ? 1 : 0);
    gl.uniform2f(gl.getUniformLocation(prog, 'uMapSize'), W, H);
    gl.uniform1i(gl.getUniformLocation(prog, 'uSeedCount'), seedCount);
    gl.uniform1f(gl.getUniformLocation(prog, 'uWarpAmp'), CFG.WARP_AMP);
    gl.uniform1f(gl.getUniformLocation(prog, 'uWarpFreq'), CFG.WARP_FREQ);
  });
  if (idOk) {
    // Buffer row 0 comes back as framebuffer row 0 == texel row v=0 == mapY 0 == NORTH
    // (see the orientation contract at the top) — so this is a straight copy, no flip.
    // Two bytes a texel, matching the RG8 target (SPEC §158). Reading an RG8
    // framebuffer as RGBA is GL_INVALID_OPERATION — measured, 1282 on
    // SwiftShader — and it also halves this staging buffer from 35 MB to 18.
    // Two bytes a texel, matching the RG8 target (SPEC §158). This also halves
    // the staging buffer, from 35 MB to 18 at today's frame.
    const buf = new Uint8Array(W * H * 2);
    gl.readPixels(0, 0, W, H, gl.RG, gl.UNSIGNED_BYTE, buf);
    for (let i = 0, n = W * H; i < n; i++) {
      const v = buf[i * 2] + buf[i * 2 + 1] * 256;
      idArray[i] = v > N ? 0 : v;
    }
    const despeckled = despeckleProvinceRaster(idArray, MAP_DATA, landBytes);
    const repaired = repairDisconnectedProvinceRaster(idArray, MAP_DATA) + despeckled;
    if (repaired) {
      for (let i = 0, n = W * H; i < n; i++) {
        const v = idArray[i];
        buf[i * 2] = v & 255;
        buf[i * 2 + 1] = (v >> 8) & 255;
      }
      gl.bindTexture(gl.TEXTURE_2D, idTex);
      // …and the write-back must match the target too. Uploading RGBA into an
      // RG8 texture is GL_INVALID_OPERATION, and it is the whole of the 1282
      // §158 recorded as unresolved: the readback was narrowed and this was
      // not, so the error came from the repair path rather than from RG8
      // itself. A standalone RG8 framebuffer is complete and reads back
      // cleanly in all three formats — measured.
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RG, gl.UNSIGNED_BYTE, buf);
    }
  }
  // The painted countries have done their work — they exist in the ID raster
  // now, and nothing samples them again (SPEC §232).
  if (regionTex) { gl.deleteTexture(regionTex); regionTex = null; }

  // Heightmap pass: coast falloff + primitives + fbm detail.
  const prims = (MAP_DATA.heightPrimitives || []).slice(0, MAX_HEIGHT_PRIMS);
  if ((MAP_DATA.heightPrimitives || []).length > MAX_HEIGHT_PRIMS) {
    warnOnce('prim-cap', 'heightPrimitives exceeds ' + MAX_HEIGHT_PRIMS + '; extras ignored');
  }
  const pxPerDeg = ((W / (MAP_DATA.LON1 - MAP_DATA.LON0)) + (H / (MAP_DATA.LAT1 - MAP_DATA.LAT0))) * 0.5;
  const primA = new Float32Array(MAX_HEIGHT_PRIMS * 4);
  const primB = new Float32Array(MAX_HEIGHT_PRIMS * 4);
  let primCount = 0;
  for (const pr of prims) {
    try {
      const j = primCount * 4;
      if (pr.type === 'dome') {
        const c = MAP_DATA.project(pr.c[0], pr.c[1]);
        primA[j] = c[0]; primA[j + 1] = c[1]; primA[j + 2] = 0; primA[j + 3] = 0;
        primB[j] = (pr.h || 0.5) * CFG.PRIM_SCALE;
        primB[j + 1] = Math.max(1, (pr.r || 0.5) * pxPerDeg);
        primB[j + 2] = 1;
      } else { // 'ridge' | 'basin' (basin carries negative h in the data)
        const a = MAP_DATA.project(pr.a[0], pr.a[1]);
        const b = MAP_DATA.project(pr.b[0], pr.b[1]);
        primA[j] = a[0]; primA[j + 1] = a[1]; primA[j + 2] = b[0]; primA[j + 3] = b[1];
        primB[j] = (pr.h || 0.5) * CFG.PRIM_SCALE;
        primB[j + 1] = Math.max(1, (pr.w || 0.5) * pxPerDeg);
        primB[j + 2] = pr.type === 'basin' ? 2 : 0;
      }
      primCount++;
    } catch (e) {
      warnOnce('prim-bad', 'skipping malformed height primitive', pr, e);
    }
  }
  runPass(heightProg, heightTex, 'height-pass', (prog) => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, landTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'uLand'), 0);
    gl.uniform2f(gl.getUniformLocation(prog, 'uMapSize'), W, H);
    gl.uniform4fv(gl.getUniformLocation(prog, 'uPrimA[0]'), primA);
    gl.uniform4fv(gl.getUniformLocation(prog, 'uPrimB[0]'), primB);
    gl.uniform1i(gl.getUniformLocation(prog, 'uPrimCount'), primCount);
  });
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // -- lookup textures ((N+1)x1, NEAREST; rebuilt on every setProvinceColors) --
  function lookupTexture(internal) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, lookW, 1, 0,
      internal === gl.R8 ? gl.RED : gl.RGBA, gl.UNSIGNED_BYTE, null);
    setTexParams(gl.NEAREST, false);
    return t;
  }
  const lookATex = lookupTexture(gl.RGBA8);
  const lookBTex = lookupTexture(gl.RGBA8);
  const flagsTex = lookupTexture(gl.R8);
  const provinceMapTex = lookupTexture(gl.RGBA8);
  const provinceMap = new Uint16Array(lookW);
  function uploadProvinceMap(mapping) {
    const enc = new Uint8Array(lookW * 4);
    for (let id = 0; id <= N; id++) {
      const target = mapping[id] <= N ? mapping[id] : id;
      provinceMap[id] = target;
      enc[id * 4] = target & 255;
      enc[id * 4 + 1] = (target >> 8) & 255;
      enc[id * 4 + 3] = 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, provinceMapTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, lookW, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, enc);
  }
  {
    const identity = new Uint16Array(lookW);
    for (let id = 0; id <= N; id++) identity[id] = id;
    uploadProvinceMap(identity);
  }

  // Static terrain-class lookup (id -> grain style in FS_MAIN; keep indices in sync).
  const TERRAIN_CLASS = {
    coast: 1, farmland: 2, hills: 3, mountains: 4, desert: 5,
    drylands: 6, steppe: 7, marsh: 8, wasteland: 0,
  };
  const terrTex = lookupTexture(gl.R8);
  function uploadProvinceTerrains(states) {
    const t0 = new Uint8Array(lookW);
    for (let id = 1; id <= N; id++) {
      const pr = (states && states[id]) || provinces[id - 1] || {};
      t0[id] = TERRAIN_CLASS[pr.terrain] || 0;
    }
    gl.bindTexture(gl.TEXTURE_2D, terrTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, lookW, 1, 0, gl.RED, gl.UNSIGNED_BYTE, t0);
  }
  uploadProvinceTerrains(null);

  function uploadLookups(primary, secondary, flags) {
    gl.bindTexture(gl.TEXTURE_2D, lookATex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, lookW, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, primary.subarray(0, lookW * 4));
    gl.bindTexture(gl.TEXTURE_2D, lookBTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, lookW, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, secondary.subarray(0, lookW * 4));
    gl.bindTexture(gl.TEXTURE_2D, flagsTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, lookW, 1, 0, gl.RED, gl.UNSIGNED_BYTE, flags.subarray(0, lookW));
  }

  // Neutral tan pre-game colors so the start-screen backdrop already shows the map.
  {
    const tagKeys = Object.keys((DEFINES && DEFINES.TAGS) || {});
    const p0 = new Uint8Array(lookW * 4);
    const s0 = new Uint8Array(lookW * 4);
    const f0 = new Uint8Array(lookW);
    for (let id = 1; id <= N; id++) {
      const pr = provinces[id - 1] || {};
      const jit = (((id * 2654435761) >>> 16) % 17) - 8;
      for (let k = 0; k < 3; k++) {
        const v = Math.max(0, Math.min(255, CFG.NEUTRAL_TAN[k] + jit));
        p0[id * 4 + k] = v;
        s0[id * 4 + k] = v;
      }
      // Owner class in lookA's alpha (SPEC §173): 8 bits, 254 owners, 255
      // reserved for WASTE. It lived in bits 3..7 of the flags byte until the
      // catalog outgrew 31 tags (v5.4) and then one ERA outgrew 31 live
      // courts (§173) — at which point Math.min clamped two real owners into
      // one class and the border between them silently vanished. The alpha
      // byte was uploaded as a constant 255 and read by nobody.
      const cls = pr.owner === 'WASTE' ? 255 : Math.min(254, tagKeys.indexOf(pr.owner) + 1);
      p0[id * 4 + 3] = cls;
      s0[id * 4 + 3] = 255;
      let fl = 0;
      // The cross-hatch means "uninhabited or impassable", which is what the
      // flag contract at the top of this file says and what a player reads it
      // as: empty ground. It used to also fire on `owner === 'WASTE'`, and
      // that clause was pure redundancy — every WASTE cell in the game was
      // ALSO impassable and uninhabited, all nine of them deep desert, so it
      // could never change the answer.
      //
      // SPEC §160 added 130 unowned cells that are neither, and the redundant
      // clause started painting Carthage, Lugdunum, Londinium and the whole
      // Roman west with the Sahara's hatch — reading as "nothing lives here"
      // across ground carrying 1,060 development. Unowned is a fact about
      // sovereignty; uninhabited is a fact about people. The class channel
      // already says the first (WASTE takes 255, so the political mapmode
      // still greys it as unclaimed); this bit says the second.
      if (pr.impassable || pr.habitation === 'uninhabited') fl |= 2;
      f0[id] = fl;
    }
    uploadLookups(p0, s0, f0);
  }

  // -- main-pass uniforms ------------------------------------------------------
  const U = {};
  if (mainProg) {
    gl.useProgram(mainProg);
    for (const name of ['uOffsetScale', 'uMapSize', 'uTime', 'uZoom', 'uPaper', 'uRelief',
      'uFlat', 'uDpr', 'uSelected', 'uMaxId', 'uId', 'uHeight', 'uLand', 'uDecor',
      'uLookA', 'uLookB', 'uFlagsTex', 'uTerr', 'uProvinceMap']) {
      U[name] = gl.getUniformLocation(mainProg, name);
    }
    gl.uniform1i(U.uId, 0);
    gl.uniform1i(U.uHeight, 1);
    gl.uniform1i(U.uLand, 2);
    gl.uniform1i(U.uDecor, 3);
    gl.uniform1i(U.uLookA, 4);
    gl.uniform1i(U.uLookB, 5);
    gl.uniform1i(U.uFlagsTex, 6);
    gl.uniform1i(U.uTerr, 7);
    gl.uniform1i(U.uProvinceMap, 8);
    gl.uniform2f(U.uMapSize, W, H);
    gl.uniform1i(U.uMaxId, N);
  }
  const texUnits = [idTex, heightTex, landTex, decorTex, lookATex, lookBTex, flagsTex, terrTex,
    provinceMapTex];

  const state = { relief: 1, flat: 0, selected: 0 };

  function syncSize() {
    const cont = canvas.parentElement || document.body;
    const cw = cont.clientWidth || window.innerWidth || 1;
    const ch = cont.clientHeight || window.innerHeight || 1;
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.max(1, Math.round(cw * dpr));
    const bh = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
    }
  }
  syncSize();

  return {
    idArray,
    // The land-mask bytes ride along for computeGeometry's anchor snap
    // (SPEC §233): a full-land texel is 255, an antialiased coastal bead is
    // anything less, and the snap must never anchor a label on a bead.
    landBytes,

    provIdAt(mapX, mapY) {
      const x = Math.min(W - 1, Math.max(0, Math.floor(mapX)));
      const y = Math.min(H - 1, Math.max(0, Math.floor(mapY)));
      return provinceMap[idArray[y * W + x]] || 0;
    },

    setProvinceMapping(mapping) {
      try {
        if (!mapping || mapping.length < lookW) {
          warnOnce('bad-province-map', 'setProvinceMapping: mapping is missing or too short');
          return;
        }
        uploadProvinceMap(mapping);
      } catch (e) {
        warnOnce('province-map-throw', 'setProvinceMapping failed', e);
      }
    },

    setProvinceTerrains(states) {
      try {
        uploadProvinceTerrains(states);
      } catch (e) {
        warnOnce('province-terrain-throw', 'setProvinceTerrains failed', e);
      }
    },

    setProvinceColors(primary, secondary, flags) {
      try {
        if (!primary || primary.length < lookW * 4 || !secondary || secondary.length < lookW * 4 ||
            !flags || flags.length < lookW) {
          warnOnce('bad-colors', 'setProvinceColors: arrays are missing or too short — call ignored');
          return;
        }
        uploadLookups(primary, secondary, flags);
      } catch (e) {
        warnOnce('colors-throw', 'setProvinceColors failed', e);
      }
    },

    setMapmodeParams(params) {
      const p = params || {};
      state.relief = Math.min(1, Math.max(0, p.relief === undefined ? 1 : p.relief));
      state.flat = Math.min(1, Math.max(0, p.flat === undefined ? 0 : p.flat));
    },

    setSelected(provId) {
      state.selected = provId | 0;
    },

    render(camera, timeMs) {
      if (!mainProg || contextLost) return;
      try {
        syncSize();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(mainProg);
        gl.bindVertexArray(vao);
        for (let i = 0; i < texUnits.length; i++) {
          gl.activeTexture(gl.TEXTURE0 + i);
          gl.bindTexture(gl.TEXTURE_2D, texUnits[i]);
        }
        const vw = (camera.viewport && camera.viewport.w) || canvas.clientWidth || 1;
        const vh = (camera.viewport && camera.viewport.h) || canvas.clientHeight || 1;
        const zoom = Math.max(1e-6, camera.zoom || 1);
        // clip space -> map coords; clip y=+1 is the TOP of the screen = smaller mapY (north)
        gl.uniform4f(U.uOffsetScale, camera.x, camera.y, (vw * 0.5) / zoom, -(vh * 0.5) / zoom);
        gl.uniform1f(U.uTime, ((timeMs || 0) * 0.001) % (Math.PI * 2000));
        gl.uniform1f(U.uZoom, zoom);
        gl.uniform1f(U.uPaper, 1 - smoothstepJs(CFG.PAPER_ZOOM_LO, CFG.PAPER_ZOOM_HI, zoom));
        gl.uniform1f(U.uRelief, state.relief);
        gl.uniform1f(U.uFlat, state.flat);
        gl.uniform1f(U.uDpr, window.devicePixelRatio || 1);
        gl.uniform1i(U.uSelected, state.selected);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      } catch (e) {
        warnOnce('render-throw', 'render failed', e);
      }
    },

    resize() {
      syncSize();
    },
  };
}
