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
//   bit1 (2)  = gray cross-hatch (impassable wasteland)
//   bit2 (4)  = pulse the stripes (unrest/revolt)
//   bits 3..7 = owner class index (0 = none); differing classes draw the 2px country border.

// ---- Tunables (aesthetics — tweak freely) -------------------------------------------------
const CFG = {
  PAPER_ZOOM_LO: 0.55,   // below this zoom the map is full parchment
  PAPER_ZOOM_HI: 0.92,   // above this zoom the parchment is gone
  WARP_AMP: 18.0,        // px of domain-warp wobble on province borders
  WARP_FREQ: 0.013,      // noise frequency for the warp
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
  SELECT_GOLD: [1.0, 0.90, 0.52],
};

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
uniform vec4 uSeeds[128];
uniform int uSeedCount;
uniform float uWarpAmp;
uniform float uWarpFreq;
out vec4 outColor;
${GLSL_NOISE}
void main(){
  vec2 px = gl_FragCoord.xy;              // (mapX, mapY); row v=0 == NORTH
  vec2 uv = px / uMapSize;
  int best = 0;
  if (texture(uLand, uv).r >= 0.5) {
    // One shared domain warp for the whole pixel (NOT per seed) — borders wobble
    // organically while the weighted-Voronoi diagram stays globally consistent.
    vec2 wv = vec2(fbm2(px * uWarpFreq), fbm2(px * uWarpFreq + vec2(37.2, 91.7)));
    vec2 wp = px + (wv - 0.5) * 2.0 * uWarpAmp;
    float bd = 1e12;
    for (int i = 0; i < 128; i++) {
      if (i >= uSeedCount) break;
      float d = distance(wp, uSeeds[i].xy) / max(uSeeds[i].z, 0.05);
      if (d < bd) { bd = d; best = i + 1; }
    }
  }
  outColor = vec4(float(best) / 255.0, 0.0, 0.0, 1.0);
}
`;

const FS_HEIGHT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uLand;
uniform vec2 uMapSize;
uniform vec4 uPrimA[24];   // ridge/basin: ax,ay,bx,by · dome: cx,cy,0,0
uniform vec4 uPrimB[24];   // h(pre-scaled), width px, type(0 ridge,1 dome,2 basin), 0
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
  for (int i = 0; i < 24; i++) {
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
${GLSL_NOISE}
int idAt(ivec2 ip){
  ip = clamp(ip, ivec2(0), ivec2(uMapSize) - 1);
  return min(int(texelFetch(uId, ip, 0).r * 255.0 + 0.5), uMaxId);
}
int flagsOf(int id){
  return int(texelFetch(uFlagsTex, ivec2(id, 0), 0).r * 255.0 + 0.5);
}
void main(){
  vec2 map = uOffsetScale.xy + vClip * uOffsetScale.zw;
  vec2 uv = map / uMapSize;
  bool inMap = uv.x >= 0.0 && uv.x < 1.0 && uv.y >= 0.0 && uv.y < 1.0;
  ivec2 ip = ivec2(clamp(map, vec2(0.0), uMapSize - vec2(1.0)));
  int id = inMap ? idAt(ip) : 0;
  float land = inMap ? texture(uLand, uv).r : 0.0;
  float coarse = inMap ? textureLod(uLand, uv, 4.5).r : 0.0;
  int flags = flagsOf(id);

  // ---- fill (mapmode lookup + stripes/hatch) ----
  vec3 fill = texelFetch(uLookA, ivec2(id, 0), 0).rgb;
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

  // ---- rivers (decor alpha) ----
  float riv = inMap ? texture(uDecor, uv).a : 0.0;
  landCol = mix(landCol, vec3(${f3(CFG.RIVER)}) * (0.65 + 0.35 * shade), riv * 0.8);

  // ---- sea: deep -> shallow via smoothed land mask, faint animated noise ----
  float depth = clamp(coarse * 2.3, 0.0, 1.0);
  float sn = fbm2(map * 0.016 + vec2(uTime * 0.05, uTime * 0.023));
  vec3 seaCol = mix(vec3(${f3(CFG.SEA_DEEP)}), vec3(${f3(CFG.SEA_SHALLOW)}), depth) + (sn - 0.5) * 0.05;
  float lm = smoothstep(0.42, 0.58, land);
  float coastEdge = (1.0 - lm) * smoothstep(0.08, 0.42, land);
  seaCol = mix(seaCol, vec3(0.10, 0.16, 0.22), coastEdge * 0.55);
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
    int cSelf = flags >> 3;
    int iL = idAt(ip - ivec2(b1, 0));
    int iU = idAt(ip - ivec2(0, b1));
    bool ctryB =
      (idR != 0 && (flagsOf(idR) >> 3) != cSelf) ||
      (idD != 0 && (flagsOf(idD) >> 3) != cSelf) ||
      (iL != 0 && (flagsOf(iL) >> 3) != cSelf) ||
      (iU != 0 && (flagsOf(iU) >> 3) != cSelf);
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
  x2.clearRect(0, 0, c.width, c.height);
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
  const idArray = new Uint8Array(W * H);
  const noop = () => {};
  return {
    idArray,
    provIdAt(mapX, mapY) {
      const x = Math.min(W - 1, Math.max(0, Math.floor(mapX)));
      const y = Math.min(H - 1, Math.max(0, Math.floor(mapY)));
      return idArray[y * W + x];
    },
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
  function canvasTexture(srcCanvas, mips) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
    if (mips) gl.generateMipmap(gl.TEXTURE_2D);
    setTexParams(gl.LINEAR, mips);
    return t;
  }
  function targetTexture(filter) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    setTexParams(filter, false);
    return t;
  }

  const landTex = canvasTexture(buildLandCanvas(MAP_DATA), true);
  const decorTex = canvasTexture(buildDecorCanvas(MAP_DATA), true);
  const idTex = targetTexture(gl.NEAREST); // NEAREST, no mips — texelFetch in the main pass
  const heightTex = targetTexture(gl.LINEAR);

  // -- generation passes -----------------------------------------------------
  const idArray = new Uint8Array(W * H);
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
  const seedCount = Math.min(N, 128);
  if (N > 128) warnOnce('seed-cap', `province count ${N} exceeds the 128-seed uniform array; extras get no territory`);
  const seedArr = new Float32Array(128 * 4);
  for (let i = 0; i < seedCount; i++) {
    const p = provinces[i];
    const xy = (p && typeof p.lon === 'number') ? MAP_DATA.project(p.lon, p.lat) : [0, 0];
    seedArr[i * 4] = xy[0];
    seedArr[i * 4 + 1] = xy[1];
    seedArr[i * 4 + 2] = (p && p.weight) || 1.0;
    seedArr[i * 4 + 3] = 0;
  }
  const idOk = runPass(idProg, idTex, 'id-pass', (prog) => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, landTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'uLand'), 0);
    gl.uniform2f(gl.getUniformLocation(prog, 'uMapSize'), W, H);
    gl.uniform4fv(gl.getUniformLocation(prog, 'uSeeds[0]'), seedArr);
    gl.uniform1i(gl.getUniformLocation(prog, 'uSeedCount'), seedCount);
    gl.uniform1f(gl.getUniformLocation(prog, 'uWarpAmp'), CFG.WARP_AMP);
    gl.uniform1f(gl.getUniformLocation(prog, 'uWarpFreq'), CFG.WARP_FREQ);
  });
  if (idOk) {
    // Buffer row 0 comes back as framebuffer row 0 == texel row v=0 == mapY 0 == NORTH
    // (see the orientation contract at the top) — so this is a straight copy, no flip.
    const buf = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    for (let i = 0, n = W * H; i < n; i++) {
      const v = buf[i * 4];
      idArray[i] = v > N ? 0 : v;
    }
  }

  // Heightmap pass: coast falloff + primitives + fbm detail.
  const prims = (MAP_DATA.heightPrimitives || []).slice(0, 24);
  if ((MAP_DATA.heightPrimitives || []).length > 24) warnOnce('prim-cap', 'heightPrimitives exceeds 24; extras ignored');
  const pxPerDeg = ((W / (MAP_DATA.LON1 - MAP_DATA.LON0)) + (H / (MAP_DATA.LAT1 - MAP_DATA.LAT0))) * 0.5;
  const primA = new Float32Array(24 * 4);
  const primB = new Float32Array(24 * 4);
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
      p0[id * 4 + 3] = 255;
      s0[id * 4 + 3] = 255;
      const cls = Math.min(31, tagKeys.indexOf(pr.owner) + 1); // -1+1 = 0 for unknown
      let fl = cls << 3;
      if (pr.impassable || pr.owner === 'WASTE') fl |= 2;
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
      'uLookA', 'uLookB', 'uFlagsTex']) {
      U[name] = gl.getUniformLocation(mainProg, name);
    }
    gl.uniform1i(U.uId, 0);
    gl.uniform1i(U.uHeight, 1);
    gl.uniform1i(U.uLand, 2);
    gl.uniform1i(U.uDecor, 3);
    gl.uniform1i(U.uLookA, 4);
    gl.uniform1i(U.uLookB, 5);
    gl.uniform1i(U.uFlagsTex, 6);
    gl.uniform2f(U.uMapSize, W, H);
    gl.uniform1i(U.uMaxId, N);
  }
  const texUnits = [idTex, heightTex, landTex, decorTex, lookATex, lookBTex, flagsTex];

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

    provIdAt(mapX, mapY) {
      const x = Math.min(W - 1, Math.max(0, Math.floor(mapX)));
      const y = Math.min(H - 1, Math.max(0, Math.floor(mapY)));
      return idArray[y * W + x];
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
