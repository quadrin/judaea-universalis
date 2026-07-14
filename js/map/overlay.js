// js/map/overlay.js — 2D canvas overlay: army chips, arrows, battle/siege icons. SPEC §5.5.
// Cleared and redrawn every frame; positions come from geom.centroids via camera.mapToScreen,
// so everything lands on the same screen points as the GL map underneath.

const CHIP_W = 46;
const CHIP_H = 20;
const MORALE_H = 3;
const CULL_MARGIN = 90;
// Touch screens get fatter hit targets (drawing unchanged). Live MediaQueryList:
// .matches is read per hit test, so plugging in a mouse/touchscreen updates behavior.
const TOUCH_HIT_PAD = 8;
const coarsePointer = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
  ? window.matchMedia('(pointer: coarse)')
  : null;

// Hand-drawn vector glyphs (Path2D, CSS-px coordinates around a 0,0 origin).
// Drawn after ctx.setTransform(dpr,...), so devicePixelRatio scaling is free.
// Crossed swords: two blades with guards and grips, matching the UI icon set.
const SWORDS_PATH = new Path2D(
  'M-5.6 -5.6L3.4 3.4M2 4.8L4.8 2M4.1 4.1L6 6' +
  'M5.6 -5.6L-3.4 3.4M-2 4.8L-4.8 2M-4.1 4.1L-6 6'
);
// Siege tower: crenellated body, door, ground line.
const TOWER_PATH = new Path2D(
  'M-3.5 4.5V-3.5h7V4.5' +
  'M-3.5 -3.5V-6h2.2v1.6h2.6V-6h2.2v2.5' +
  'M-1.2 4.5V1h2.4v3.5' +
  'M-5 4.5h10'
);
// Eight-point star (wonders), radius 6 / 2.5.
const STAR8_PATH = new Path2D(
  'M6 0L2.31 0.96L4.24 4.24L0.96 2.31L0 6L-0.96 2.31L-4.24 4.24L-2.31 0.96' +
  'L-6 0L-2.31 -0.96L-4.24 -4.24L-0.96 -2.31L0 -6L0.96 -2.31L4.24 -4.24L2.31 -0.96Z'
);

const warned = new Set();
function warnOnce(key, ...msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[overlay]', ...msg);
}

function css(c, a) {
  if (!c) c = [128, 128, 128];
  return a === undefined
    ? `rgb(${c[0]},${c[1]},${c[2]})`
    : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function fmtMen(men) {
  const k = (men || 0) / 1000;
  return (k >= 9.95 ? Math.round(k) : Math.round(k * 10) / 10) + 'k';
}

export function createOverlay(canvas, geom, MAP_DATA, DEFINES) {
  const x2 = canvas.getContext('2d');

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
    return { cw, ch, dpr };
  }

  function tagColor(game, tag) {
    return (game.tags[tag] && game.tags[tag].color) ||
      (DEFINES && DEFINES.TAGS && DEFINES.TAGS[tag] && DEFINES.TAGS[tag].color) ||
      [110, 110, 110];
  }

  // Marching interpolation: sim positions are per-province; mid-hop armies slide
  // toward path[0] by whole days marched plus the frame loop's sub-day fraction.
  // curDayFrac is set once per draw() so hitTestArmy always agrees with the pixels.
  let curDayFrac = 0;
  function armyMapPos(a) {
    const c = geom.centroids[a.prov];
    if (!c) return null;
    if (a.inBattle || !Array.isArray(a.path) || !a.path.length) return c;
    const total = a.hopTotal || 0;
    const left = a.moveDaysLeft || 0;
    if (total <= 0 || left <= 0) return c;
    const n = geom.centroids[a.path[0]];
    if (!n) return c;
    const f = Math.min(1, Math.max(0, (total - left + curDayFrac) / total));
    return { x: c.x + (n.x - c.x) * f, y: c.y + (n.y - c.y) * f };
  }

  // Shared by draw() and the hit tests so picking always matches the pixels.
  // Same-tag armies moving as one (same province, same hop, same days left)
  // share ONE banner — a stack — so a big host isn't a fan of tiny chips.
  // Returns chips in draw order (bottom -> top), positions in CSS px.
  function chipList(game, camera) {
    const out = [];
    const groups = new Map(); // tag|prov|hop -> chip
    const perProv = new Map();
    const armies = Object.values(game.armies || {})
      .filter(Boolean)
      .sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0));
    const vw = camera.viewport.w;
    const vh = camera.viewport.h;
    for (const a of armies) {
      const c = armyMapPos(a);
      if (!c) continue;
      const hopKey = (!a.inBattle && Array.isArray(a.path) && a.path.length)
        ? a.path[0] + ':' + (a.moveDaysLeft | 0)
        : 'idle';
      const key = a.tag + '|' + a.prov + '|' + hopKey;
      const grp = groups.get(key);
      if (grp) {
        grp.armies.push(a);
        grp.men += a.men || 0;
        grp.moraleW += (a.morale || 0) * (a.men || 0);
        grp.maxMoraleW += (a.maxMorale || 1) * (a.men || 0);
        if ((a.men || 0) > (grp.army.men || 0)) grp.army = a; // largest carries the standard
        continue;
      }
      const stack = perProv.get(a.prov) || 0;
      perProv.set(a.prov, stack + 1);
      const [sx, sy] = camera.mapToScreen(c.x, c.y);
      const chip = {
        army: a,
        armies: [a],
        men: a.men || 0,
        moraleW: (a.morale || 0) * (a.men || 0),
        maxMoraleW: (a.maxMorale || 1) * (a.men || 0),
        x: sx - CHIP_W * 0.5 + stack * 7,
        y: sy - CHIP_H - 10 - stack * 8,
        w: CHIP_W,
        h: CHIP_H + MORALE_H,
        onScreen: !(sx < -CULL_MARGIN || sy < -CULL_MARGIN || sx > vw + CULL_MARGIN || sy > vh + CULL_MARGIN),
      };
      groups.set(key, chip);
    }
    for (const chip of groups.values()) if (chip.onScreen) out.push(chip);
    return out;
  }

  function drawArrow(game, camera, a) {
    const path = a.path;
    if (!Array.isArray(path) || path.length === 0) return;
    const pts = [];
    const start = armyMapPos(a); // line begins at the marching position, not the province seat
    if (start) pts.push(camera.mapToScreen(start.x, start.y));
    for (const pid of path) {
      const c = geom.centroids[pid];
      if (c) pts.push(camera.mapToScreen(c.x, c.y));
    }
    if (pts.length < 2) return;
    const col = tagColor(game, a.tag);
    x2.strokeStyle = css(col, 0.6);
    x2.lineWidth = 3;
    x2.lineJoin = 'round';
    x2.lineCap = 'round';
    x2.beginPath();
    x2.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x2.lineTo(pts[i][0], pts[i][1]);
    x2.stroke();
    // arrowhead at the destination
    const [ax, ay] = pts[pts.length - 2];
    const [bx, by] = pts[pts.length - 1];
    const ang = Math.atan2(by - ay, bx - ax);
    x2.fillStyle = css(col, 0.85);
    x2.beginPath();
    x2.moveTo(bx, by);
    x2.lineTo(bx - 10 * Math.cos(ang - 0.45), by - 10 * Math.sin(ang - 0.45));
    x2.lineTo(bx - 10 * Math.cos(ang + 0.45), by - 10 * Math.sin(ang + 0.45));
    x2.closePath();
    x2.fill();
  }

  function drawSiege(sx, sy, siege, timeMs) {
    const t = (timeMs || 0) * 0.001;
    // rising smoke wisps behind the disc
    for (let i = 0; i < 2; i++) {
      const p = (t * 0.35 + i * 0.5) % 1;
      x2.fillStyle = `rgba(90,80,70,${((1 - p) * 0.35).toFixed(3)})`;
      x2.beginPath();
      x2.arc(sx + 6 + Math.sin((p + i) * 5) * 2.5, sy - 9 - p * 15, 2 + p * 3.5, 0, Math.PI * 2);
      x2.fill();
    }
    x2.fillStyle = '#e8dcc0';
    x2.strokeStyle = '#6b5a33';
    x2.lineWidth = 1.5;
    x2.beginPath();
    x2.arc(sx, sy, 11, 0, Math.PI * 2);
    x2.fill();
    x2.stroke();
    // drawn siege tower glyph
    x2.save();
    x2.translate(sx, sy);
    x2.strokeStyle = '#4a3a1c';
    x2.lineWidth = 1.4;
    x2.lineCap = 'round';
    x2.lineJoin = 'round';
    x2.stroke(TOWER_PATH);
    x2.restore();
    const prog = Math.min(100, Math.max(0, (siege && siege.progress) || 0)) / 100;
    if (prog > 0) {
      x2.strokeStyle = '#c9a227';
      x2.lineWidth = 3;
      x2.beginPath();
      x2.arc(sx, sy, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      x2.stroke();
    }
  }

  function drawBattle(sx, sy, timeMs) {
    const t = (timeMs || 0) * 0.001;
    // expanding ripple ring — reads as "fighting here" even zoomed far out
    const rp = (t % 1.4) / 1.4;
    x2.strokeStyle = `rgba(190,60,40,${((1 - rp) * 0.55).toFixed(3)})`;
    x2.lineWidth = 2;
    x2.beginPath();
    x2.arc(sx, sy, 12 + rp * 14, 0, Math.PI * 2);
    x2.stroke();
    x2.fillStyle = '#f4efe2';
    x2.strokeStyle = '#7a1a12';
    x2.lineWidth = 1.5;
    x2.beginPath();
    x2.arc(sx, sy, 12, 0, Math.PI * 2);
    x2.fill();
    x2.stroke();
    // crossed swords glyph, rocking with the clash
    x2.save();
    x2.translate(sx, sy);
    x2.rotate(Math.sin(t * 7.3) * 0.12);
    x2.strokeStyle = '#7a1a12';
    x2.lineWidth = 1.6;
    x2.lineCap = 'round';
    x2.lineJoin = 'round';
    x2.stroke(SWORDS_PATH);
    x2.restore();
    // sparks flung from the melee
    for (let i = 0; i < 3; i++) {
      const p = (t * 1.1 + i * 0.37) % 1;
      const ang = i * 2.094 + Math.floor(t * 1.1 + i * 0.37) * 2.39;
      const r = 9 + p * 12;
      x2.fillStyle = `rgba(230,170,60,${((1 - p) * 0.8).toFixed(3)})`;
      x2.beginPath();
      x2.arc(sx + Math.cos(ang) * r, sy + Math.sin(ang) * r, 1.5 * (1 - p * 0.5), 0, Math.PI * 2);
      x2.fill();
    }
  }

  // The land wears its works (SPEC §29): tiny structure glyphs under the
  // province center — a market awning, a silo, a crenellated tower, a
  // shrine's pediment, an airfield's runway — drawn only when zoomed in.
  const STRUCT_ORDER = ['market', 'granary', 'walls', 'shrine', 'airfield'];
  const INK = 'rgba(28,20,8,0.9)';       // dark outline ink
  const PARCH = '#e9d7a3';               // lit parchment stone
  const PARCH_SHADE = '#c4ad74';         // its shaded face
  const GOLD = '#d9a929';                // gilded cloth & roofs
  const GOLD_DEEP = '#a87c1c';
  function groundShadow(w) {
    x2.fillStyle = 'rgba(15,10,5,0.25)';
    x2.beginPath();
    x2.ellipse(0.6, 4.6, w, 1.5, 0, 0, Math.PI * 2);
    x2.fill();
  }
  function drawStructGlyph(key, x, y, s) {
    x2.save();
    x2.translate(x, y);
    x2.scale(s || 1, s || 1);
    x2.lineWidth = 0.9;
    x2.lineJoin = 'round';
    x2.strokeStyle = INK;
    if (key === 'market') {
      // a striped awning over a stall, one crate set out front
      groundShadow(5);
      x2.fillStyle = PARCH;
      x2.beginPath(); x2.rect(-3.4, -0.4, 6.8, 4.6); x2.fill(); x2.stroke();
      x2.fillStyle = PARCH_SHADE;                       // counter shadow
      x2.fillRect(-3.4, 1.4, 6.8, 1.1);
      x2.fillStyle = GOLD;                              // the awning
      x2.beginPath(); x2.moveTo(-5.2, 0); x2.lineTo(-3.8, -4.2); x2.lineTo(3.8, -4.2); x2.lineTo(5.2, 0); x2.closePath();
      x2.fill(); x2.stroke();
      x2.strokeStyle = GOLD_DEEP;                       // awning stripes
      x2.lineWidth = 0.8;
      x2.beginPath();
      x2.moveTo(-2.4, -4.2); x2.lineTo(-3.1, 0);
      x2.moveTo(0, -4.2); x2.lineTo(0, 0);
      x2.moveTo(2.4, -4.2); x2.lineTo(3.1, 0);
      x2.stroke();
      x2.strokeStyle = INK;
      x2.fillStyle = PARCH_SHADE;                       // a crate
      x2.beginPath(); x2.rect(2.1, 2.4, 2.2, 1.9); x2.fill(); x2.stroke();
    } else if (key === 'granary') {
      // a fat silo under a straw cone, shaded on the east face
      groundShadow(4.4);
      x2.fillStyle = PARCH;
      x2.beginPath(); x2.moveTo(-3.4, 4.2); x2.lineTo(-3.4, -1.2); x2.arc(0, -1.2, 3.4, Math.PI, 0); x2.lineTo(3.4, 4.2); x2.closePath();
      x2.fill(); x2.stroke();
      x2.fillStyle = 'rgba(120,95,50,0.35)';            // shaded flank
      x2.beginPath(); x2.moveTo(1.4, 4.2); x2.lineTo(1.4, -3.9); x2.quadraticCurveTo(3.4, -3.2, 3.4, -1.2); x2.lineTo(3.4, 4.2); x2.closePath();
      x2.fill();
      x2.strokeStyle = 'rgba(28,20,8,0.55)';            // hoop bands
      x2.beginPath(); x2.moveTo(-3.4, 0.6); x2.lineTo(3.4, 0.6); x2.moveTo(-3.4, 2.4); x2.lineTo(3.4, 2.4); x2.stroke();
      x2.strokeStyle = INK;
      x2.fillStyle = GOLD;                              // straw cap
      x2.beginPath(); x2.moveTo(-4.1, -3.2); x2.lineTo(0, -6); x2.lineTo(4.1, -3.2); x2.closePath();
      x2.fill(); x2.stroke();
    } else if (key === 'walls') {
      // a gate tower: merlons, an arched gate, a shaded flank
      groundShadow(4.8);
      x2.fillStyle = PARCH;
      x2.beginPath();
      x2.moveTo(-4, 4.4); x2.lineTo(-4, -2); x2.lineTo(-2.6, -2); x2.lineTo(-2.6, -4); x2.lineTo(-0.9, -4); x2.lineTo(-0.9, -2);
      x2.lineTo(0.9, -2); x2.lineTo(0.9, -4); x2.lineTo(2.6, -4); x2.lineTo(2.6, -2); x2.lineTo(4, -2); x2.lineTo(4, 4.4);
      x2.closePath(); x2.fill(); x2.stroke();
      x2.fillStyle = 'rgba(120,95,50,0.35)';            // shaded flank
      x2.fillRect(1.8, -2, 2.2, 6.4);
      x2.fillStyle = 'rgba(30,22,10,0.85)';             // the gate
      x2.beginPath(); x2.moveTo(-1.3, 4.4); x2.lineTo(-1.3, 1.2); x2.arc(0, 1.2, 1.3, Math.PI, 0); x2.lineTo(1.3, 4.4); x2.closePath();
      x2.fill();
      x2.strokeStyle = 'rgba(28,20,8,0.45)';            // masonry courses
      x2.beginPath(); x2.moveTo(-4, 0.2); x2.lineTo(-1.6, 0.2); x2.moveTo(1.6, 0.2); x2.lineTo(4, 0.2); x2.moveTo(-4, 2.3); x2.lineTo(-1.5, 2.3); x2.moveTo(1.5, 2.3); x2.lineTo(4, 2.3);
      x2.stroke();
      x2.strokeStyle = INK;
    } else if (key === 'shrine') {
      // a small temple: stepped base, three columns, gilded pediment
      groundShadow(5);
      x2.fillStyle = PARCH;
      x2.beginPath(); x2.rect(-4.6, 3.2, 9.2, 1.2); x2.fill(); x2.stroke();   // stylobate
      x2.beginPath(); x2.rect(-3.9, 2.2, 7.8, 1.0); x2.fill(); x2.stroke();   // upper step
      for (const cx of [-2.7, 0, 2.7]) {                                       // columns
        x2.beginPath(); x2.rect(cx - 0.65, -1.6, 1.3, 3.8); x2.fill(); x2.stroke();
      }
      x2.beginPath(); x2.rect(-3.9, -2.4, 7.8, 0.9); x2.fill(); x2.stroke();  // architrave
      x2.fillStyle = GOLD;                                                     // pediment
      x2.beginPath(); x2.moveTo(-4.4, -2.4); x2.lineTo(0, -5.4); x2.lineTo(4.4, -2.4); x2.closePath();
      x2.fill(); x2.stroke();
      x2.strokeStyle = GOLD_DEEP;                                              // raking cornice
      x2.beginPath(); x2.moveTo(-3.1, -2.8); x2.lineTo(0, -4.8); x2.lineTo(3.1, -2.8); x2.stroke();
      x2.strokeStyle = INK;
    } else if (key === 'airfield') {
      // an asphalt runway: threshold bars, centerline, edge lights
      groundShadow(6);
      x2.fillStyle = 'rgba(58,50,38,0.96)';
      x2.beginPath(); x2.moveTo(-6.4, 3.4); x2.lineTo(-2.2, -3.4); x2.lineTo(6.4, -3.4); x2.lineTo(2.2, 3.4); x2.closePath();
      x2.fill(); x2.stroke();
      x2.strokeStyle = '#ded0a2';
      x2.lineWidth = 0.8;
      x2.setLineDash([1.4, 1.4]);                       // centerline
      x2.beginPath(); x2.moveTo(-3.6, 1.9); x2.lineTo(3.6, -1.9); x2.stroke();
      x2.setLineDash([]);
      x2.beginPath();                                    // threshold bars
      x2.moveTo(-5.6, 2.7); x2.lineTo(-4.2, 0.4);
      x2.moveTo(4.2, -0.4); x2.lineTo(5.6, -2.7);
      x2.stroke();
      x2.fillStyle = '#f0c95c';                          // edge lights
      for (const [lx, ly] of [[-2.6, -3.9], [2.2, -3.9], [-2.2, 3.9], [2.6, 3.9]]) {
        x2.beginPath(); x2.arc(lx, ly, 0.55, 0, Math.PI * 2); x2.fill();
      }
      x2.lineWidth = 0.9;
      x2.strokeStyle = INK;
    }
    x2.restore();
  }
  // The warplane silhouette, drawn at the current origin pointing up (-y).
  // Elliptical fuselage, swept wings, tailplane, a glinting canopy.
  function drawPlaneShape(col) {
    x2.fillStyle = css(col);
    x2.strokeStyle = 'rgba(15,10,5,0.9)';
    x2.lineWidth = 0.9;
    x2.lineJoin = 'round';
    x2.beginPath();
    x2.moveTo(0, -5.6);                                  // spinner
    x2.quadraticCurveTo(1.2, -4.6, 1.1, -1.6);           // starboard nose
    x2.lineTo(5.8, 1.0);                                 // leading edge
    x2.lineTo(5.8, 2.3);                                 // wingtip
    x2.lineTo(1.0, 1.4);                                 // trailing edge
    x2.quadraticCurveTo(0.9, 3.2, 0.8, 4.0);             // tail boom
    x2.lineTo(2.7, 5.1); x2.lineTo(2.7, 5.9); x2.lineTo(0, 5.4);   // starboard tailplane
    x2.lineTo(-2.7, 5.9); x2.lineTo(-2.7, 5.1); x2.lineTo(-0.8, 4.0); // port tailplane
    x2.quadraticCurveTo(-0.9, 3.2, -1.0, 1.4);
    x2.lineTo(-5.8, 2.3); x2.lineTo(-5.8, 1.0);          // port wing
    x2.lineTo(-1.1, -1.6);
    x2.quadraticCurveTo(-1.2, -4.6, 0, -5.6);            // port nose
    x2.closePath();
    x2.fill();
    x2.stroke();
    x2.fillStyle = 'rgba(240,235,215,0.85)';             // canopy glint
    x2.beginPath(); x2.ellipse(0, -1.8, 0.6, 1.2, 0, 0, Math.PI * 2); x2.fill();
    x2.strokeStyle = 'rgba(15,10,5,0.5)';                // wing roundel hints
    x2.lineWidth = 0.6;
    x2.beginPath(); x2.arc(-3.6, 1.5, 0.7, 0, Math.PI * 2); x2.arc(3.6, 1.5, 0.7, 0, Math.PI * 2); x2.stroke();
  }
  // A parked warplane: soft shadow beneath, then the silhouette.
  function drawPlane(x, y, col, s) {
    x2.save();
    x2.translate(x, y);
    x2.scale(s || 1, s || 1);
    x2.fillStyle = 'rgba(15,10,5,0.22)';
    x2.beginPath(); x2.ellipse(0.7, 5.6, 4.6, 1.4, 0, 0, Math.PI * 2); x2.fill();
    drawPlaneShape(col);
    x2.restore();
  }

  // ---------------------------------------------------------- bombing raids
  // Transient raid theater (SPEC §30): a plane sweeps from its field to the
  // target, bombs blossom, smoke drifts, the plane flies through and fades.
  const raidFx = [];
  function addRaidFx(fromProv, toProv, col) {
    const a = geom.centroids[fromProv];
    const b = geom.centroids[toProv];
    if (!a || !b) return;
    raidFx.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, col: col || [200, 60, 40], start: null });
    if (raidFx.length > 6) raidFx.shift();
  }
  const RAID_MS = 2400;
  function drawRaids(camera, timeMs) {
    for (let i = raidFx.length - 1; i >= 0; i--) {
      const fx = raidFx[i];
      if (fx.start === null) fx.start = timeMs;
      const t = (timeMs - fx.start) / RAID_MS;
      if (t >= 1) { raidFx.splice(i, 1); continue; }
      const [ax, ay] = camera.mapToScreen(fx.ax, fx.ay);
      const [bx, by] = camera.mapToScreen(fx.bx, fx.by);
      const ang = Math.atan2(by - ay, bx - ax) + Math.PI / 2;
      // the run: overshoot the target and fade out on the far side
      const flight = Math.min(1, t / 0.75);
      const px = ax + (bx - ax) * flight * 1.25;
      const py = ay + (by - ay) * flight * 1.25;
      const fade = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.35);
      if (fade > 0) {
        x2.save();
        x2.globalAlpha = fade;
        x2.translate(px, py);
        x2.rotate(ang);
        x2.scale(1.3, 1.3);
        drawPlaneShape(fx.col);
        x2.restore();
      }
      // bombs blossom as the plane passes: three staggered bursts
      for (let k = 0; k < 3; k++) {
        const p = (t - (0.38 + k * 0.12)) / 0.5;
        if (p <= 0 || p >= 1) continue;
        const ox = (k - 1) * 7;
        const oy = (k % 2) * 5 - 2;
        // flash core, fire bloom, climbing smoke
        x2.fillStyle = `rgba(255,232,160,${(1 - p) * 0.9})`;
        x2.beginPath(); x2.arc(bx + ox, by + oy, 2 + p * 4, 0, Math.PI * 2); x2.fill();
        x2.strokeStyle = `rgba(214,92,40,${(1 - p) * 0.8})`;
        x2.lineWidth = 2;
        x2.beginPath(); x2.arc(bx + ox, by + oy, 3 + p * 12, 0, Math.PI * 2); x2.stroke();
        x2.fillStyle = `rgba(80,68,55,${(1 - p) * 0.5})`;
        x2.beginPath(); x2.arc(bx + ox + p * 3, by + oy - p * 9, 3.5 + p * 6, 0, Math.PI * 2); x2.fill();
      }
    }
  }

  // Army standard: pole + swallow-tailed pennant in the tag color. The cloth
  // ripples while marching (and breathes gently at rest); the hit box is
  // unchanged from the old rounded-rect chips, so picking is unaffected.
  function drawChip(game, ch, timeMs) {
    const a = ch.army;
    const col = tagColor(game, a.tag);
    const selIds = game.ui
      ? [game.ui.selectedArmy].concat(Array.isArray(game.ui.selectedArmies) ? game.ui.selectedArmies : [])
      : [];
    const selected = ch.armies.some((x) => selIds.indexOf(x.id) >= 0);
    const t = (timeMs || 0) * 0.001;
    const marching = !a.inBattle && Array.isArray(a.path) && a.path.length > 0;
    const sway = Math.sin(t * (marching ? 5.2 : 1.3) + (a.id || 0) * 1.7) * (marching ? 1.7 : 0.5);
    const x = ch.x, y = ch.y;
    const poleX = x + 2.5;
    const clothX = x + 5;
    // The banner wears its age (SPEC §25): antiquity flies the swallow-tailed
    // standard, the lance ages a pointed pennon, the modern ages a squared
    // brigade flag with a unit glyph.
    const gen = Math.max(0, (a.gen | 0));
    const notch = gen >= 4 ? 0 : 7;
    const cloth = () => {
      x2.beginPath();
      if (gen >= 4) { // squared colors
        x2.moveTo(clothX, y);
        x2.lineTo(x + ch.w, y + sway * 0.6);
        x2.lineTo(x + ch.w, y + CHIP_H + sway * 0.6);
        x2.lineTo(clothX, y + CHIP_H);
      } else if (gen === 3) { // lance pennon
        x2.moveTo(clothX, y);
        x2.lineTo(x + ch.w + 3, y + CHIP_H * 0.5 + sway);
        x2.lineTo(clothX, y + CHIP_H);
      } else { // the swallow-tailed standard of antiquity
        x2.moveTo(clothX, y);
        x2.lineTo(x + ch.w, y + sway * 0.6);
        x2.lineTo(x + ch.w - notch, y + CHIP_H * 0.5 + sway);
        x2.lineTo(x + ch.w, y + CHIP_H + sway * 0.6);
        x2.lineTo(clothX, y + CHIP_H);
      }
      x2.closePath();
    };

    x2.globalAlpha = a.retreating ? 0.65 : 1;

    // pole reaching down toward the province anchor
    x2.strokeStyle = 'rgba(30,22,10,0.9)';
    x2.lineWidth = 1.6;
    x2.beginPath();
    x2.moveTo(poleX, y - 3);
    x2.lineTo(poleX, y + CHIP_H + 9);
    x2.stroke();

    if (selected) {
      cloth();
      x2.strokeStyle = '#e7c34c';
      x2.lineWidth = 4;
      x2.lineJoin = 'round';
      x2.stroke();
    }
    cloth();
    const grad = x2.createLinearGradient(0, y, 0, y + CHIP_H);
    grad.addColorStop(0, css(col.map((v) => Math.min(255, v + 26))));
    grad.addColorStop(1, css(col.map((v) => Math.max(0, v - 22))));
    x2.fillStyle = grad;
    x2.fill();
    x2.strokeStyle = 'rgba(15,10,5,0.85)';
    x2.lineWidth = 1;
    x2.lineJoin = 'round';
    x2.stroke();

    // finial: gold when a general carries the standard
    x2.fillStyle = a.general ? '#e7c34c' : '#8a7a55';
    x2.beginPath();
    x2.arc(poleX, y - 4, 2.2, 0, Math.PI * 2);
    x2.fill();

    x2.fillStyle = '#fff';
    x2.font = 'bold 11px Georgia, serif';
    x2.textAlign = 'center';
    x2.textBaseline = 'middle';
    x2.shadowColor = 'rgba(0,0,0,0.6)';
    x2.shadowBlur = 2;
    const textX = gen === 3
      ? clothX + (ch.w - (clothX - x)) * 0.36 // the pennon narrows to its point
      : (clothX + x + ch.w - notch) * 0.5;
    x2.fillText(fmtMen(ch.men), textX, y + CHIP_H * 0.5 + 0.5 + sway * 0.4);
    x2.shadowBlur = 0;
    // Modern unit glyph (SPEC §25): armor if the stack rides, rifles if it walks.
    if (gen >= 4) {
      let cav = 0, inf = 0;
      for (const ar of ch.armies) {
        cav += (ar.regiments && ar.regiments.cav) || 0;
        inf += (ar.regiments && ar.regiments.inf) || 0;
      }
      const gx = clothX + 2, gy = y + 2;
      x2.strokeStyle = 'rgba(255,255,255,0.9)';
      x2.fillStyle = 'rgba(255,255,255,0.9)';
      x2.lineWidth = 1;
      if (cav >= Math.max(1, inf)) {
        // a tank in eight pixels: hull, turret, barrel
        x2.fillRect(gx, gy + 2.5, 7, 2.6);
        x2.fillRect(gx + 2, gy + 0.8, 3, 2);
        x2.beginPath();
        x2.moveTo(gx + 5, gy + 1.7);
        x2.lineTo(gx + 8.5, gy + 1.7);
        x2.stroke();
      } else {
        // crossed rifles
        x2.beginPath();
        x2.moveTo(gx, gy + 0.5);
        x2.lineTo(gx + 6.5, gy + 5);
        x2.moveTo(gx + 6.5, gy + 0.5);
        x2.lineTo(gx, gy + 5);
        x2.stroke();
      }
    }
    // morale bar (men-weighted across the whole stack)
    const frac = Math.min(1, Math.max(0, ch.moraleW / Math.max(0.01, ch.maxMoraleW)));
    x2.fillStyle = 'rgba(10,8,4,0.85)';
    x2.fillRect(clothX, y + CHIP_H, ch.w - (clothX - x) - 4, MORALE_H);
    x2.fillStyle = frac > 0.5 ? '#5da43a' : frac > 0.25 ? '#c9a227' : '#b33a26';
    x2.fillRect(clothX, y + CHIP_H, (ch.w - (clothX - x) - 4) * frac, MORALE_H);
    // stack badge: how many armies march under this one standard
    if (ch.armies.length > 1) {
      const bx = x + ch.w - 1;
      const by = y - 1;
      x2.fillStyle = 'rgba(24,18,8,0.95)';
      x2.strokeStyle = '#c9a227';
      x2.lineWidth = 1;
      x2.beginPath();
      x2.arc(bx, by, 7.5, 0, Math.PI * 2);
      x2.fill();
      x2.stroke();
      x2.fillStyle = '#f4e8c8';
      x2.font = 'bold 9px Georgia, serif';
      x2.textAlign = 'center';
      x2.textBaseline = 'middle';
      x2.fillText(String(ch.armies.length), bx, by + 0.5);
    }
    x2.globalAlpha = 1;
  }

  function draw(game, camera, timeMs, dayFrac) {
    try {
      const { cw, ch, dpr } = syncSize();
      x2.setTransform(dpr, 0, 0, dpr, 0, 0);
      x2.clearRect(0, 0, cw, ch);
      if (!game) return;
      curDayFrac = Math.min(1, Math.max(0, dayFrac || 0));

      const vw = camera.viewport.w;
      const vh = camera.viewport.h;
      const onScreen = (sx, sy) =>
        sx > -CULL_MARGIN && sy > -CULL_MARGIN && sx < vw + CULL_MARGIN && sy < vh + CULL_MARGIN;

      // movement arrows (under everything else)
      for (const a of Object.values(game.armies || {})) {
        if (a && a.path && a.path.length) drawArrow(game, camera, a);
      }

      // sieges + wonders + structures per province
      const provs = game.provinces || [];
      const showWonders = camera.zoom > 1.5;
      // wings parked at their airfields (SPEC §29)
      const wingsByProv = {};
      for (const w of Object.values(game.airwings || {})) {
        if (!w) continue;
        (wingsByProv[w.prov] || (wingsByProv[w.prov] = [])).push(w);
      }
      for (let id = 1; id < provs.length; id++) {
        const p = provs[id];
        if (!p) continue;
        const c = geom.centroids[id];
        if (!c) continue;
        if (p.siege) {
          const [sx, sy] = camera.mapToScreen(c.x, c.y);
          if (onScreen(sx, sy)) drawSiege(sx, sy, p.siege, timeMs);
        }
        if (showWonders && p.wonder) {
          const [sx, sy] = camera.mapToScreen(c.x, c.y);
          if (onScreen(sx, sy)) {
            // eight-point star: dark halo stroke under a gold fill
            x2.save();
            x2.translate(sx, sy + 16);
            x2.strokeStyle = 'rgba(30,22,8,0.85)';
            x2.lineWidth = 2.5;
            x2.lineJoin = 'round';
            x2.stroke(STAR8_PATH);
            x2.fillStyle = '#e7c34c';
            x2.fill(STAR8_PATH);
            x2.restore();
          }
        }
        // the province's works, in a small row below the center (SPEC §29);
        // glyphs grow gently with the zoom so a close look rewards the eye
        if (showWonders) {
          const built = Array.isArray(p.buildings) ? p.buildings : [];
          const wings = wingsByProv[id];
          if (built.length || (wings && wings.length)) {
            const [sx, sy] = camera.mapToScreen(c.x, c.y);
            if (onScreen(sx, sy)) {
              const s = Math.min(2.2, 0.8 + camera.zoom * 0.25);
              const step = 13 * s;
              const keys = STRUCT_ORDER.filter((k) => built.indexOf(k) >= 0);
              const gy = sy + (p.wonder ? 30 : 26);
              let gx = sx - ((keys.length - 1) * step) / 2;
              for (const k of keys) { drawStructGlyph(k, gx, gy, s); gx += step; }
              if (wings && wings.length) {
                const n = Math.min(3, wings.length);
                for (let i = 0; i < n; i++) {
                  drawPlane(sx - ((n - 1) * 7 * s) + i * 14 * s, gy + 13 * s, tagColor(game, wings[i].tag), s);
                }
              }
            }
          }
        }
      }

      // battles
      for (const b of game.battles || []) {
        const c = b && geom.centroids[b.prov];
        if (!c) continue;
        const [sx, sy] = camera.mapToScreen(c.x, c.y);
        if (onScreen(sx, sy)) drawBattle(sx, sy, timeMs);
      }

      // fleets: hull-and-sail chips riding at the offshore anchors
      for (const f of Object.values(game.fleets || {})) {
        if (!f || f.ships <= 0) continue;
        const off = (geom.offshore && geom.offshore[f.prov]) || geom.centroids[f.prov];
        if (!off) continue;
        const [sx, sy] = camera.mapToScreen(off.x, off.y);
        if (!onScreen(sx, sy)) continue;
        const col = tagColor(game, f.tag);
        const sel = game.ui && game.ui.selectedFleet === f.id;
        const bob = Math.sin((timeMs || 0) * 0.0016 + f.id) * 1.5;
        x2.save();
        x2.translate(sx, sy + bob);
        if (sel) {
          x2.strokeStyle = '#e7c34c';
          x2.lineWidth = 2.5;
          x2.strokeRect(-16, -14, 32, 24);
        }
        // hull
        x2.fillStyle = 'rgba(38,28,16,0.95)';
        x2.beginPath();
        x2.moveTo(-12, 2); x2.lineTo(12, 2); x2.lineTo(7, 8); x2.lineTo(-7, 8);
        x2.closePath();
        x2.fill();
        // sail in the tag color
        x2.fillStyle = css(col);
        x2.strokeStyle = 'rgba(15,10,5,0.85)';
        x2.lineWidth = 1;
        x2.beginPath();
        x2.moveTo(0, -12); x2.lineTo(9, 0); x2.lineTo(-9, 0);
        x2.closePath();
        x2.fill();
        x2.stroke();
        // ship count
        x2.fillStyle = '#fff';
        x2.font = 'bold 10px Georgia, serif';
        x2.textAlign = 'center';
        x2.textBaseline = 'middle';
        x2.shadowColor = 'rgba(0,0,0,0.7)';
        x2.shadowBlur = 2;
        x2.fillText(String(f.ships), 0, 5);
        x2.shadowBlur = 0;
        x2.restore();
        // sailing line
        if (f.path && f.path.length) {
          const dst = (geom.offshore && geom.offshore[f.path[0]]) || geom.centroids[f.path[0]];
          if (dst) {
            const [dx, dy] = camera.mapToScreen(dst.x, dst.y);
            x2.strokeStyle = css(col, 0.5);
            x2.lineWidth = 2;
            x2.setLineDash([6, 6]);
            x2.beginPath();
            x2.moveTo(sx, sy);
            x2.lineTo(dx, dy);
            x2.stroke();
            x2.setLineDash([]);
          }
        }
      }

      // army chips on top
      const chips = chipList(game, camera);
      for (const chp of chips) drawChip(game, chp, timeMs);

      // bombing raids fly above everything (SPEC §30)
      drawRaids(camera, timeMs);
    } catch (e) {
      warnOnce('draw-throw', 'draw failed', e);
    }
  }

  // Battle discs are clickable too (opens the battle window). Radius matches
  // the drawn disc, padded on touch screens like the chips.
  function hitTestBattle(sx, sy, game, camera) {
    try {
      if (!game) return 0;
      const pad = coarsePointer && coarsePointer.matches ? TOUCH_HIT_PAD : 0;
      for (const b of game.battles || []) {
        const c = b && geom.centroids[b.prov];
        if (!c) continue;
        const [bx, by] = camera.mapToScreen(c.x, c.y);
        if (Math.hypot(sx - bx, sy - by) <= 13 + pad) return b.prov;
      }
    } catch (e) {
      warnOnce('hitb-throw', 'hitTestBattle failed', e);
    }
    return 0;
  }

  function findChip(sx, sy, game, camera) {
    if (!game) return null;
    const pad = coarsePointer && coarsePointer.matches ? TOUCH_HIT_PAD : 0;
    const chips = chipList(game, camera);
    for (let i = chips.length - 1; i >= 0; i--) { // topmost first
      const c = chips[i];
      if (sx >= c.x - pad && sx <= c.x + c.w + pad &&
          sy >= c.y - pad && sy <= c.y + c.h + pad) return c;
    }
    return null;
  }

  function hitTestArmy(sx, sy, game, camera) {
    try {
      const c = findChip(sx, sy, game, camera);
      return c ? c.army.id : null;
    } catch (e) {
      warnOnce('hit-throw', 'hitTestArmy failed', e);
      return null;
    }
  }

  // Banner click = the whole stack: primary id plus every army under the standard.
  function hitTestStack(sx, sy, game, camera) {
    try {
      const c = findChip(sx, sy, game, camera);
      return c ? { id: c.army.id, ids: c.armies.map((a) => a.id) } : null;
    } catch (e) {
      warnOnce('hits-throw', 'hitTestStack failed', e);
      return null;
    }
  }

  return { draw, hitTestArmy, hitTestStack, hitTestBattle, addRaidFx };
}
