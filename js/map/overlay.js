// js/map/overlay.js — 2D canvas overlay: army chips, arrows, battle/siege icons. SPEC §5.5.
// Cleared and redrawn every frame; positions come from geom.centroids via camera.mapToScreen,
// so everything lands on the same screen points as the GL map underneath.

import { traceSupply } from '../sim/supply.js';
import { createSeaRoutes, pointAt, slice } from './searoutes.js';
// The land roster (SPEC §191): every banner wears the face of the arm that
// leads it, at the pattern it was raised to.
import { dominantArm, unitGlyphKey, unitGlyphPath } from '../data/units.js';

// Wider since SPEC §191: the standard now carries a soldier's face as well as
// a strength, and both have to be legible at strategic zoom.
const CHIP_W = 56;
const CHIP_H = 20;
const MORALE_H = 3;
const FLEET_W = 32;
const FLEET_H = 28;
const WING_W = 32;
const WING_H = 24;
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
// The eighteen soldiers (SPEC §191), compiled once and kept: the roster's own
// 24×24 path data, handed straight to Path2D. Built lazily so a glyph a
// campaign never fields is never constructed.
const unitPathCache = new Map();
function unitPath2D(gen, arm) {
  const key = unitGlyphKey(gen, arm);
  let p = unitPathCache.get(key);
  if (p === undefined) {
    try { p = new Path2D(unitGlyphPath(gen, arm)); }
    catch (e) { warnOnce('glyph:' + key, 'unit glyph failed to compile', key, e); p = null; }
    unitPathCache.set(key, p);
  }
  return p;
}

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

  // Fleets and wings use the same marker geometry for drawing and picking.
  // Air wings are individual counters (rather than an aggregate structure
  // ornament), so two squadrons at one field can be selected independently.
  // A fleet under way (SPEC §290) is placed on its water route by the day's
  // progress, and faces its course; one at anchor rides at the offshore
  // point, staggered when it shares it.
  function fleetMarkerList(game, camera) {
    const perProv = new Map();
    const out = [];
    const sc = shipScale(camera);
    const fleets = Object.values(game.fleets || {}).filter((f) => f && f.ships > 0)
      .sort((a, b) => a.id - b.id);
    for (const fleet of fleets) {
      let route = null;
      let pos = null;
      if (Array.isArray(fleet.path) && fleet.path.length) {
        route = routes.route(fleet.prov, fleet.path[0]);
        if (route) {
          const f = fleet.moveDaysLeft > 0 && fleet.hopTotal > 0 ? sailFrac(fleet.hopTotal, fleet.moveDaysLeft) : 0;
          pos = pointAt(route, f, 18);
        }
      }
      if (pos && pos.s > 0) {
        const [sx, sy] = camera.mapToScreen(pos.x, pos.y);
        out.push({ fleet, x: sx, y: sy, sc, heading: pos.heading, route, s: pos.s, moving: pos.s < route.len });
        continue;
      }
      const off = (geom.offshore && geom.offshore[fleet.prov]) || geom.centroids[fleet.prov];
      if (!off) continue;
      const n = perProv.get(fleet.prov) || 0;
      perProv.set(fleet.prov, n + 1);
      const [sx, sy] = camera.mapToScreen(off.x, off.y);
      out.push({ fleet, x: sx + n * 10 * sc, y: sy + n * 7 * sc, sc, heading: pos ? pos.heading : 0, route, s: 0, moving: false });
    }
    return out;
  }

  // A fleet's course (SPEC §290): the rest of its water route, a dark trace
  // under a parchment dash that runs toward the harbor, and a ring in the
  // fleet's colour where it will drop anchor. Legible on any sea and any
  // coast; another court's courses are drawn faint.
  function drawFleetCourse(game, camera, m, timeMs) {
    const r = m.route;
    const z = camera.zoom || 1;
    const pts = slice(r, m.s, r.len, 6 / z);
    if (pts.length < 2) return;
    const scr = pts.map((p) => camera.mapToScreen(p.x, p.y));
    const trace = () => {
      x2.beginPath();
      x2.moveTo(scr[0][0], scr[0][1]);
      for (let k = 1; k < scr.length; k++) x2.lineTo(scr[k][0], scr[k][1]);
    };
    x2.save();
    x2.globalAlpha = m.fleet.tag === game.playerTag ? 1 : 0.4;
    x2.lineCap = 'round';
    x2.lineJoin = 'round';
    trace();
    x2.strokeStyle = 'rgba(10,8,4,0.5)';
    x2.lineWidth = 4;
    x2.stroke();
    trace();
    x2.strokeStyle = 'rgba(236,226,200,0.92)';
    x2.lineWidth = 1.8;
    x2.setLineDash([7, 6]);
    x2.lineDashOffset = stillMotion() ? 0 : -(((timeMs || 0) * 0.02) % 13);
    x2.stroke();
    x2.setLineDash([]);
    const end = scr[scr.length - 1];
    x2.beginPath();
    x2.arc(end[0], end[1], 4.5, 0, Math.PI * 2);
    x2.fillStyle = css(tagColor(game, m.fleet.tag), 0.95);
    x2.fill();
    x2.strokeStyle = 'rgba(236,226,200,0.95)';
    x2.lineWidth = 1.4;
    x2.stroke();
    x2.restore();
  }

  function wingMarkerList(game, camera) {
    const byProv = new Map();
    for (const wing of Object.values(game.airwings || {}).filter(Boolean).sort((a, b) => a.id - b.id)) {
      const rows = byProv.get(wing.prov) || [];
      rows.push(wing);
      byProv.set(wing.prov, rows);
    }
    const out = [];
    for (const [provId, wings] of byProv) {
      const c = geom.centroids[provId];
      if (!c) continue;
      const [sx, sy] = camera.mapToScreen(c.x, c.y);
      for (let i = 0; i < wings.length; i++) {
        out.push({ wing: wings[i], x: sx + (i - (wings.length - 1) / 2) * (WING_W + 4), y: sy + 48 });
      }
    }
    return out;
  }

  function drawWingMarker(game, marker) {
    const w = marker.wing;
    const selected = game.ui && game.ui.selectedWing === w.id;
    const col = tagColor(game, w.tag);
    x2.save();
    x2.translate(marker.x, marker.y);
    x2.fillStyle = 'rgba(28,24,18,0.92)';
    x2.strokeStyle = selected ? '#e7c34c' : css(col, 0.95);
    x2.lineWidth = selected ? 2.5 : 1.5;
    x2.beginPath();
    x2.rect(-WING_W / 2, -WING_H / 2, WING_W, WING_H);
    x2.fill();
    x2.stroke();
    x2.restore();
    drawPlane(marker.x, marker.y, col, 1.25);
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
  // ------------------------------------------------------------- warships --
  // One glyph per naval pattern era (v5.5) — a fleet of war must never be
  // mistaken for the merchant marine. Drawn in the fleet chip's local space.
  function drawWarshipGlyph(f, col) {
    const gen = f.gen | 0;
    const ink = 'rgba(15,10,5,0.85)';
    if (gen >= 5) {
      // Destroyer flotilla: long grey hull, superstructure, gun and funnel;
      // the tag color flies as a stern pennant.
      x2.fillStyle = 'rgba(74,78,84,0.96)';
      x2.beginPath();
      x2.moveTo(-15, 2); x2.lineTo(14, 2); x2.lineTo(16, -1); x2.lineTo(-15, -1);
      x2.lineTo(-13, 2);
      x2.closePath();
      x2.fill();
      x2.fillRect(-14, 2, 27, 5); // lower hull
      x2.fillStyle = 'rgba(96,100,106,0.96)';
      x2.fillRect(-6, -6, 9, 5);  // superstructure
      x2.fillRect(-1, -10, 3, 4); // funnel
      x2.strokeStyle = ink;
      x2.lineWidth = 1.2;
      x2.beginPath(); // forward gun
      x2.moveTo(6, -2); x2.lineTo(12, -5);
      x2.stroke();
      x2.fillStyle = css(col); // stern pennant
      x2.beginPath();
      x2.moveTo(-15, -1); x2.lineTo(-15, -9); x2.lineTo(-9, -5);
      x2.closePath();
      x2.fill();
      x2.strokeStyle = ink;
      x2.lineWidth = 0.8;
      x2.stroke();
    } else if (gen >= 3) {
      // Sailing squadrons: high dark hull, two masts of tag-colored canvas.
      x2.fillStyle = 'rgba(38,28,16,0.95)';
      x2.beginPath();
      x2.moveTo(-13, 1); x2.lineTo(13, 1); x2.lineTo(9, 8); x2.lineTo(-9, 8);
      x2.closePath();
      x2.fill();
      x2.fillStyle = css(col);
      x2.strokeStyle = ink;
      x2.lineWidth = 1;
      x2.beginPath(); // main
      x2.moveTo(-4, -12); x2.lineTo(4, -12); x2.lineTo(6, -1); x2.lineTo(-6, -1);
      x2.closePath();
      x2.fill();
      x2.stroke();
      x2.beginPath(); // fore
      x2.moveTo(8, -8); x2.lineTo(12, -1); x2.lineTo(5, -1);
      x2.closePath();
      x2.fill();
      x2.stroke();
    } else {
      // War galley: low hull with a bronze ram, oar strokes, one square sail.
      x2.fillStyle = 'rgba(38,28,16,0.95)';
      x2.beginPath();
      x2.moveTo(-12, 2); x2.lineTo(12, 2); x2.lineTo(16, 0); x2.lineTo(12, 5);
      x2.lineTo(-9, 5);
      x2.closePath();
      x2.fill();
      x2.strokeStyle = 'rgba(200,170,90,0.9)'; // the ram catches the light
      x2.lineWidth = 1.4;
      x2.beginPath();
      x2.moveTo(12, 1); x2.lineTo(16, 0);
      x2.stroke();
      x2.strokeStyle = ink; // oars
      x2.lineWidth = 1;
      x2.beginPath();
      for (let i = -8; i <= 8; i += 4) { x2.moveTo(i, 5); x2.lineTo(i - 2, 9); }
      x2.stroke();
      x2.fillStyle = css(col);
      x2.beginPath(); // square sail
      x2.moveTo(-5, -11); x2.lineTo(5, -11); x2.lineTo(6, -2); x2.lineTo(-6, -2);
      x2.closePath();
      x2.fill();
      x2.stroke();
    }
  }

  // ---------------------------------------------------------- ships at sea --
  // SPEC §290. A hull on a voyage is drawn where it is: on the water route
  // between its two harbors (searoutes.js), a fraction of the way that grows
  // through the day, turned to its course, trailing a wake. It leaves on the
  // first tick after the order and makes its anchor on the tick that lands
  // it, so the picture and the sim's daily arrival agree.
  const routes = createSeaRoutes(geom);
  function sailFrac(total, left) {
    if (!(total > 1)) return 0;
    return Math.min(1, Math.max(0, (total - left - 1 + curDayFrac) / (total - 1)));
  }
  // The ornament (the swell, the canvas, the smoke, the dashes) stands still
  // under reduce motion, the system's switch or the settings' one (SPEC
  // §289). The voyage itself still moves: where a ship is, is information.
  const reduceMql = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function stillMotion() {
    return !!((reduceMql && reduceMql.matches)
      || (typeof document !== 'undefined' && document.documentElement
        && document.documentElement.classList.contains('ju-reduce-motion')));
  }
  // Ships grow with the zoom, as the province works do.
  function shipScale(camera) { return Math.min(2.4, Math.max(1, 0.9 + 0.22 * camera.zoom)); }
  // Where each ship was drawn this frame, for the tests (window._overlay.ships()).
  let shipLog = [];

  // Set x2 up to draw one ship at (sx, sy): facing its course (mirrored when
  // it sails west), tilted a little with it, rolling on the swell. Every ship
  // glyph faces east (+x) with its waterline near y = 2. Caller restores.
  function shipFrame(sx, sy, heading, sc, phase, t) {
    const dir = Math.cos(heading) < 0 ? -1 : 1;
    let tilt = dir > 0 ? heading : heading - Math.PI;
    while (tilt > Math.PI) tilt -= 2 * Math.PI;
    while (tilt < -Math.PI) tilt += 2 * Math.PI;
    tilt = Math.max(-0.3, Math.min(0.3, tilt));
    const bob = Math.sin(t * 0.0016 + phase) * 1.1;
    const roll = Math.sin(t * 0.0011 + phase * 1.7) * 0.045;
    x2.translate(sx, sy + bob);
    x2.rotate(tilt + roll);
    x2.scale(dir * sc, sc);
    return bob;
  }

  // The wake: the last stretch of the route behind the stern, narrow and
  // bright at the hull, wide and fading where the water closes over it.
  function drawWake(r, s, camera, sc) {
    const z = camera.zoom || 1;
    const stern = 10 * sc / z;
    const len = 38 * sc / z;
    const pts = slice(r, s - stern - len, s - stern, 3 / z);
    if (pts.length < 2) return;
    const scr = pts.map((p) => camera.mapToScreen(p.x, p.y));
    x2.save();
    x2.lineCap = 'round';
    for (let k = 1; k < scr.length; k++) {
      const f = k / (scr.length - 1); // 0 at the tail, 1 at the stern
      x2.strokeStyle = 'rgba(226,236,238,' + (0.04 + 0.42 * f).toFixed(3) + ')';
      x2.lineWidth = (1 + 3.4 * (1 - f)) * sc * 0.75;
      x2.beginPath();
      x2.moveTo(scr[k - 1][0], scr[k - 1][1]);
      x2.lineTo(scr[k][0], scr[k][1]);
      x2.stroke();
    }
    x2.restore();
  }

  // The bow wave, in the ship's own frame: a curl of white at the stem.
  function bowWave(t, still, x) {
    const p = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.009);
    x2.strokeStyle = 'rgba(236,244,246,' + (0.5 + 0.35 * p).toFixed(2) + ')';
    x2.lineWidth = 1;
    x2.beginPath();
    x2.moveTo(x - 2.6, 3.2);
    x2.quadraticCurveTo(x + 1 + p, 3, x + 1.6 + p, 0.4);
    x2.stroke();
  }

  // A count beside a ship: a small dark pill with a gold rim, never on the hull.
  function shipBadge(x, y, txt, sc) {
    const fs = Math.round(9 * Math.min(1.35, sc));
    x2.save();
    x2.font = 'bold ' + fs + 'px Georgia, serif';
    const h = fs + 4;
    const w = Math.max(h, x2.measureText(txt).width + 7);
    const r = h / 2;
    x2.beginPath();
    x2.moveTo(x - w / 2 + r, y - r);
    x2.lineTo(x + w / 2 - r, y - r);
    x2.arc(x + w / 2 - r, y, r, -Math.PI / 2, Math.PI / 2);
    x2.lineTo(x - w / 2 + r, y + r);
    x2.arc(x - w / 2 + r, y, r, Math.PI / 2, Math.PI * 1.5);
    x2.closePath();
    x2.fillStyle = 'rgba(20,15,9,0.86)';
    x2.fill();
    x2.strokeStyle = 'rgba(201,162,39,0.8)';
    x2.lineWidth = 1;
    x2.stroke();
    x2.fillStyle = '#efe4c8';
    x2.textAlign = 'center';
    x2.textBaseline = 'middle';
    x2.fillText(txt, x, y + 0.5);
    x2.restore();
  }

  // ------------------------------------------------- the merchant marine --
  // Three hulls for three ages, all clearly not ships of war: no ram, no
  // banner, cream canvas. Before 300 a corbita (the swan-neck stern, the
  // square main and the little artemon over the bow); to the age of steam a
  // lateen trader; after 1800 a tramp steamer with its smoke astern.
  const SHIP_INK = 'rgba(20,12,6,0.85)';
  const CANVAS = 'rgba(238,228,204,0.98)';
  const CANVAS_EDGE = 'rgba(40,26,12,0.6)';
  function merchantEra(game) {
    const y = game && game.date ? game.date.y : 0;
    return y >= 1800 ? 'steam' : y >= 300 ? 'lateen' : 'corbita';
  }
  function hullWale(stern, bow) {
    x2.strokeStyle = 'rgba(206,170,112,0.9)'; // a wale of lighter timber
    x2.lineWidth = 0.9;
    x2.beginPath();
    x2.moveTo(stern, -1.1); x2.quadraticCurveTo(0, -0.1, bow, -1.4);
    x2.stroke();
    x2.strokeStyle = 'rgba(28,18,10,0.6)'; // the water line
    x2.lineWidth = 0.6;
    x2.beginPath();
    x2.moveTo(stern + 1.2, 1.4); x2.quadraticCurveTo(0, 2.2, bow - 1, 0.9);
    x2.stroke();
  }
  function drawCorbita(b) {
    x2.lineJoin = 'round';
    x2.strokeStyle = 'rgba(30,20,10,0.5)'; // the stays, under the canvas
    x2.lineWidth = 0.45;
    x2.beginPath();
    x2.moveTo(1, -17); x2.lineTo(12.4, -1.6);
    x2.moveTo(1, -17); x2.lineTo(-9.5, -3.2);
    x2.stroke();
    x2.fillStyle = 'rgba(92,60,32,0.98)';
    x2.strokeStyle = SHIP_INK;
    x2.lineWidth = 0.7;
    x2.beginPath();
    x2.moveTo(-10.5, -1.6);
    x2.quadraticCurveTo(-13.2, -3.4, -12.2, -6.6); // the swan's neck, rising aft
    x2.quadraticCurveTo(-11.6, -8.4, -9.9, -7.6);  // its head, turned in
    x2.quadraticCurveTo(-11.2, -6.4, -10.3, -3.4);
    x2.lineTo(-9, -2.2);
    x2.quadraticCurveTo(0, -1.2, 9.5, -2.4);       // the sheer
    x2.quadraticCurveTo(12, -2.8, 12.6, -1.2);     // the cutwater
    x2.quadraticCurveTo(11, 2.6, 6, 3.2);
    x2.lineTo(-6, 3.2);
    x2.quadraticCurveTo(-10, 2.8, -10.5, -1.6);
    x2.closePath();
    x2.fill();
    x2.stroke();
    hullWale(-9.2, 10.6);
    x2.strokeStyle = SHIP_INK;
    x2.lineWidth = 0.9;
    x2.beginPath();
    x2.moveTo(-8.6, -2); x2.lineTo(-11.4, 3.6);    // steering oar
    x2.moveTo(1, -1.6); x2.lineTo(1, -17.2);       // mast
    x2.moveTo(-5.8, -15.4); x2.lineTo(7.8, -15.4); // yard
    x2.moveTo(9, -2.2); x2.lineTo(13.6, -9.6);     // the artemon's spar
    x2.stroke();
    // the mainsail, its foot bellying with the wind
    x2.fillStyle = CANVAS;
    x2.strokeStyle = CANVAS_EDGE;
    x2.lineWidth = 0.6;
    x2.beginPath();
    x2.moveTo(-5.4, -15);
    x2.lineTo(7.4, -15);
    x2.quadraticCurveTo(8.6 + b * 0.4, -9.5, 7.2, -4.6);
    x2.quadraticCurveTo(1, -2.8 + b * 0.7, -5.2, -4.6);
    x2.quadraticCurveTo(-6.4 - b * 0.4, -9.5, -5.4, -15);
    x2.closePath();
    x2.fill();
    x2.stroke();
    x2.fillStyle = 'rgba(176,92,56,0.88)';         // the stripe every harbor knows
    x2.fillRect(-5.7, -12.2, 13.6, 1.6);
    x2.fillStyle = CANVAS;                          // the artemon
    x2.strokeStyle = CANVAS_EDGE;
    x2.beginPath();
    x2.moveTo(11.2, -8.6); x2.lineTo(14, -9.4);
    x2.quadraticCurveTo(14.9 + b * 0.3, -6.6, 14, -4.6);
    x2.lineTo(11.6, -4.2);
    x2.closePath();
    x2.fill();
    x2.stroke();
  }
  function drawLateener(b) {
    x2.lineJoin = 'round';
    x2.fillStyle = 'rgba(86,58,32,0.98)';
    x2.strokeStyle = SHIP_INK;
    x2.lineWidth = 0.7;
    x2.beginPath();
    x2.moveTo(-11, -3.8);                           // the stern post
    x2.lineTo(-10, -1.8);
    x2.quadraticCurveTo(0, -0.8, 10, -2.2);
    x2.lineTo(12.8, -4.4);                          // the stem, rising
    x2.quadraticCurveTo(12.4, 1.6, 6, 3.2);
    x2.lineTo(-6, 3.2);
    x2.quadraticCurveTo(-10.4, 2.6, -11, -3.8);
    x2.closePath();
    x2.fill();
    x2.stroke();
    hullWale(-9.6, 10.4);
    x2.strokeStyle = SHIP_INK;
    x2.lineWidth = 0.9;
    x2.beginPath();
    x2.moveTo(-9.4, -2); x2.lineTo(-11.8, 3.4);    // steering oar
    x2.moveTo(2.4, -1.4); x2.lineTo(3.6, -14.5);   // the mast, raked forward
    x2.moveTo(12.2, -3.4); x2.lineTo(-9.8, -19.4); // the long yard, high end aft
    x2.stroke();
    x2.fillStyle = CANVAS;
    x2.strokeStyle = CANVAS_EDGE;
    x2.lineWidth = 0.6;
    x2.beginPath();
    x2.moveTo(11.6, -3.9);
    x2.lineTo(-9.2, -18.8);
    x2.quadraticCurveTo(-8.4 - b * 0.6, -9.5, -6.8, -2.8); // the leech, bellied
    x2.quadraticCurveTo(2.4, -1.6 - b * 0.4, 11.6, -3.9);  // the foot
    x2.closePath();
    x2.fill();
    x2.stroke();
    x2.strokeStyle = 'rgba(176,92,56,0.85)';       // a stripe along the yard
    x2.lineWidth = 1.2;
    x2.beginPath();
    x2.moveTo(4.6, -6); x2.lineTo(-6.4, -14);
    x2.stroke();
  }
  function drawSteamer(t, still) {
    for (let k = 0; k < 4; k++) {                  // smoke, streaming astern
      const ph = still ? k / 4 : (t * 0.00035 + k / 4) % 1;
      x2.fillStyle = 'rgba(70,70,74,' + (0.42 * (1 - ph)).toFixed(3) + ')';
      x2.beginPath();
      x2.arc(-2.2 - ph * 13, -12.5 - ph * 4.5, 1.4 + ph * 2.6, 0, Math.PI * 2);
      x2.fill();
    }
    x2.lineJoin = 'round';
    x2.fillStyle = 'rgba(34,32,32,0.98)';          // the black hull, a raked stem
    x2.strokeStyle = 'rgba(8,8,8,0.9)';
    x2.lineWidth = 0.6;
    x2.beginPath();
    x2.moveTo(-12, -2.6);
    x2.lineTo(11.6, -2.6);
    x2.lineTo(13.4, -3.6);
    x2.lineTo(11.4, 2.2);
    x2.lineTo(-10.6, 2.2);
    x2.quadraticCurveTo(-12.6, 1.4, -12, -2.6);   // the counter stern
    x2.closePath();
    x2.fill();
    x2.stroke();
    x2.fillStyle = 'rgba(150,48,40,0.95)';         // the red boot-top at the water
    x2.fillRect(-10.8, 1, 22.2, 1.1);
    x2.fillStyle = 'rgba(232,228,216,0.98)';       // the white house and bridge
    x2.fillRect(-6.5, -6.2, 8.5, 3.6);
    x2.fillRect(-1, -8.2, 3, 2);
    x2.strokeStyle = 'rgba(40,40,40,0.6)';
    x2.lineWidth = 0.5;
    x2.strokeRect(-6.5, -6.2, 8.5, 3.6);
    x2.fillStyle = 'rgba(196,160,96,0.98)';        // a buff funnel, black-topped
    x2.fillRect(-3.4, -11, 2.4, 4.8);
    x2.fillStyle = 'rgba(20,20,20,0.95)';
    x2.fillRect(-3.4, -12, 2.4, 1.2);
    x2.strokeStyle = 'rgba(30,30,30,0.85)';        // masts and a cargo derrick
    x2.lineWidth = 0.7;
    x2.beginPath();
    x2.moveTo(7.5, -2.6); x2.lineTo(7.5, -12);
    x2.moveTo(-9.4, -2.6); x2.lineTo(-9.4, -10);
    x2.moveTo(7.5, -10.5); x2.lineTo(11, -4);
    x2.stroke();
  }
  function drawMerchantShip(era, t, still, underWay, phase) {
    const b = still ? 0 : Math.sin(t * 0.0031 + phase);
    if (era === 'steam') drawSteamer(t, still);
    else if (era === 'lateen') drawLateener(b);
    else drawCorbita(b);
    if (underWay) bowWave(t, still, 13);
  }

  // Where merchantmen ride: beside the fleets' anchor, along the coast (side
  // 1 for our own berths, -1 for a trader in someone else's roads).
  function harborSlot(id, camera, sc, side) {
    const a = geom.offshore && geom.offshore[id];
    const c = geom.centroids && geom.centroids[id];
    const anchor = a || c;
    if (!anchor) return null;
    let nx = 0;
    let ny = 1;
    if (a && c) {
      const dx = a.x - c.x;
      const dy = a.y - c.y;
      const L = Math.hypot(dx, dy);
      if (L > 0.5) { nx = dx / L; ny = dy / L; }
    }
    const [sx, sy] = camera.mapToScreen(anchor.x, anchor.y);
    const d = 21 * sc;
    return { x: sx - ny * d * side + nx * 3 * sc, y: sy + nx * d * side + ny * 3 * sc };
  }

  // ---- the caravans (SPEC §292) -------------------------------------------
  // Two camels nose to tail under bales, a driver walking at the head: a
  // caravan on the road to a market, or resting at one. Faces east (+x), feet
  // near y = 3, like the ships.
  function drawCamel(x, t, still, phase) {
    const step = still ? 0 : Math.sin(t * 0.008 + phase) * 0.9;
    x2.strokeStyle = 'rgba(70,46,24,0.95)';
    x2.lineWidth = 0.9;
    x2.lineCap = 'round';
    x2.beginPath(); // legs, walking
    x2.moveTo(x - 3, 0); x2.lineTo(x - 3.4 + step, 3.2);
    x2.moveTo(x - 1.6, 0); x2.lineTo(x - 1.2 - step, 3.2);
    x2.moveTo(x + 2, 0); x2.lineTo(x + 1.6 + step, 3.2);
    x2.moveTo(x + 3.2, 0); x2.lineTo(x + 3.6 - step, 3.2);
    x2.stroke();
    x2.fillStyle = 'rgba(176,132,82,0.98)'; // the body and its hump
    x2.strokeStyle = 'rgba(70,46,24,0.85)';
    x2.lineWidth = 0.6;
    x2.beginPath();
    x2.moveTo(x - 4.2, 0.2);
    x2.quadraticCurveTo(x - 4.4, -2.6, x - 1.8, -2.8);
    x2.quadraticCurveTo(x - 0.4, -5.4, x + 1.4, -2.8);
    x2.quadraticCurveTo(x + 3.6, -2.6, x + 4, -1.2);
    x2.lineTo(x + 5.4, -4.6); // the neck
    x2.lineTo(x + 7, -4.8);   // the head
    x2.lineTo(x + 7.2, -3.8);
    x2.lineTo(x + 5.8, -3.6);
    x2.lineTo(x + 4.4, 0.2);
    x2.closePath();
    x2.fill();
    x2.stroke();
    x2.fillStyle = 'rgba(178,96,58,0.95)'; // the bales, in the merchant's stripe
    x2.fillRect(x - 2.6, -4.6, 2.4, 2);
    x2.fillStyle = 'rgba(232,220,192,0.98)';
    x2.fillRect(x - 0.4, -4.4, 2.2, 1.8);
  }
  function drawCaravan(t, still, underWay, phase) {
    drawCamel(-5, t, still || !underWay, phase);
    drawCamel(5, t, still || !underWay, phase + 1.6);
    x2.strokeStyle = 'rgba(70,46,24,0.6)'; // the lead rope
    x2.lineWidth = 0.5;
    x2.beginPath(); x2.moveTo(2.2, -4.2); x2.lineTo(3, -1.2); x2.stroke();
    // the driver walking at the head, a staff in hand
    x2.fillStyle = 'rgba(232,220,192,0.98)';
    x2.beginPath(); x2.arc(14.2, -4.6, 1.1, 0, Math.PI * 2); x2.fill();
    x2.strokeStyle = 'rgba(70,46,24,0.9)';
    x2.lineWidth = 0.9;
    x2.beginPath();
    x2.moveTo(14.2, -3.4); x2.lineTo(14.2, 0.4);
    x2.moveTo(14.2, 0.4); x2.lineTo(13.4, 3.2);
    x2.moveTo(14.2, 0.4); x2.lineTo(15, 3.2);
    x2.moveTo(15.6, -4.4); x2.lineTo(15.8, 3.2);
    x2.stroke();
  }

  // Where along a road (a list of province ids) a caravan is: the point a
  // fraction f along the polyline through their centers, and the heading.
  function roadAt(path, f) {
    const pts = [];
    for (const id of path || []) { const c = geom.centroids && geom.centroids[id]; if (c) pts.push(c); }
    if (!pts.length) return null;
    if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, heading: 0 };
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const s = Math.max(0, Math.min(1, f)) * cum[cum.length - 1];
    let i = 1;
    while (i < pts.length - 1 && cum[i] < s) i++;
    const seg = cum[i] - cum[i - 1] || 1;
    const k = (s - cum[i - 1]) / seg;
    const a = pts[i - 1];
    const b = pts[i];
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, heading: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  // The merchants of every court (SPEC §292): on the road, drawn where they
  // are; at a harbor or a market town, one hull or one caravan for however
  // many are there, with the count. Merchant ships ride beside the fleets'
  // anchor, caravans rest beside the town.
  function drawMerchants(game, camera, timeMs) {
    if (camera.zoom < 0.7) return;
    const still = stillMotion();
    const t = still ? 0 : (timeMs || 0);
    const sc = shipScale(camera) * 0.82;
    const era = merchantEra(game);
    const vw = camera.viewport.w;
    const vh = camera.viewport.h;
    const out = (x, y) => x < -60 || y < -60 || x > vw + 60 || y > vh + 60;
    const resting = new Map(); // 'prov|kind' -> count
    const list = game.merchants || [];
    for (let k = 0; k < list.length; k++) {
      const m = list[k];
      if (!m) continue;
      if (m.state === 'out' || m.state === 'back') {
        const f = sailFrac(m.daysTotal, m.daysLeft);
        if (m.kind === 'ship') {
          const r = routes.route(m.from, m.to);
          if (!r) continue;
          const pos = pointAt(r, f, 18);
          const [sx, sy] = camera.mapToScreen(pos.x, pos.y);
          if (out(sx, sy)) continue;
          const underWay = pos.s > 0 && pos.s < r.len;
          if (underWay) drawWake(r, pos.s, camera, sc);
          x2.save();
          shipFrame(sx, sy, pos.heading, sc, k + 3, t);
          drawMerchantShip(era, t, still, underWay, k);
          x2.restore();
          shipLog.push({ kind: 'voyage', id: m.id, tag: m.tag, x: sx, y: sy, mx: pos.x, my: pos.y, s: pos.s, len: r.len, heading: pos.heading });
        } else {
          const pos = roadAt(m.path && m.path.length ? m.path : [m.from, m.to], f);
          if (!pos) continue;
          const [sx, sy] = camera.mapToScreen(pos.x, pos.y);
          if (out(sx, sy)) continue;
          x2.save();
          shipFrame(sx, sy, pos.heading, sc * 0.9, k, still ? 0 : 0);
          drawCaravan(t, still, f > 0 && f < 1, k);
          x2.restore();
          shipLog.push({ kind: 'caravan', id: m.id, tag: m.tag, x: sx, y: sy, mx: pos.x, my: pos.y, f });
        }
        continue;
      }
      const spot = m.state === 'posted' ? (m.to || m.at) : (m.at || m.home);
      if (!spot) continue;
      const key = spot + '|' + m.kind;
      resting.set(key, (resting.get(key) || 0) + 1);
    }
    for (const [key, n] of resting) {
      const [spot, kind] = key.split('|');
      const id = spot | 0;
      if (kind === 'ship') {
        const slot = harborSlot(id, camera, sc, 1);
        if (!slot || out(slot.x, slot.y)) continue;
        x2.save();
        const bob = shipFrame(slot.x, slot.y, 0, sc, id, t);
        drawMerchantShip(era, t, still, false, id);
        x2.restore();
        if (n > 1) shipBadge(slot.x + 13 * sc, slot.y - 12 * sc, String(n), sc);
        shipLog.push({ kind: 'harbor', prov: id, n, x: slot.x, y: slot.y + bob });
      } else {
        const c = geom.centroids && geom.centroids[id];
        if (!c) continue;
        const [cx, cy] = camera.mapToScreen(c.x, c.y);
        const x = cx - 22 * sc;
        const y = cy + 12 * sc;
        if (out(x, y)) continue;
        x2.save();
        shipFrame(x, y, 0, sc * 0.9, id, 0);
        drawCaravan(t, true, false, id);
        x2.restore();
        if (n > 1) shipBadge(x + 14 * sc, y - 10 * sc, String(n), sc);
        shipLog.push({ kind: 'caravan-rest', prov: id, n, x, y });
      }
    }
  }

  // ---- the trade map (SPEC §292) ------------------------------------------
  // In the trade map mode the markets are drawn over the map: a label at each
  // market town with what the market is worth, and an arrow along each lane
  // as thick as the trade it carries (by sea where both towns are on it).
  let tradeView = null;
  // What the trade map drew this frame, for the tests (window._overlay.trade()).
  let tradeLog = [];
  function setTradeView(v) { tradeView = v || null; }
  function drawTradeFlows(camera, timeMs) {
    tradeLog = [];
    if (!tradeView || !Array.isArray(tradeView.nodes)) return;
    const nodes = tradeView.nodes;
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    let maxFlow = 0.001;
    for (const n of nodes) for (const t in n.out) maxFlow = Math.max(maxFlow, n.out[t]);
    const z = camera.zoom || 1;
    const still = stillMotion();
    x2.save();
    x2.lineCap = 'round';
    x2.lineJoin = 'round';
    for (const n of nodes) {
      for (const to in n.out) {
        const amt = n.out[to];
        const m = byId[to];
        if (!m || !(amt > 0.01) || !n.centerId || !m.centerId) continue;
        const w = 1.2 + 7 * Math.sqrt(amt / maxFlow);
        let pts;
        if (n.sea && m.sea) {
          const r = routes.route(n.centerId, m.centerId);
          pts = r ? slice(r, 0, r.len, 8 / z) : null;
        }
        if (!pts) {
          const a = geom.centroids[n.centerId];
          const b = geom.centroids[m.centerId];
          if (!a || !b) continue;
          pts = [a, b];
        }
        const scr = pts.map((p) => camera.mapToScreen(p.x, p.y));
        x2.beginPath();
        x2.moveTo(scr[0][0], scr[0][1]);
        for (let k = 1; k < scr.length; k++) x2.lineTo(scr[k][0], scr[k][1]);
        x2.strokeStyle = 'rgba(20,14,6,0.45)';
        x2.lineWidth = w + 2.5;
        x2.stroke();
        x2.strokeStyle = 'rgba(231,195,76,0.85)';
        x2.lineWidth = w;
        x2.setLineDash([w * 2.2, w * 1.4]);
        x2.lineDashOffset = still ? 0 : -(((timeMs || 0) * 0.015) % (w * 3.6));
        x2.stroke();
        x2.setLineDash([]);
        // an arrowhead two thirds of the way
        const k2 = Math.max(1, Math.floor(scr.length * 0.66));
        const p1 = scr[k2 - 1];
        const p2 = scr[Math.min(scr.length - 1, k2)];
        const ang = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
        const hs = 5 + w;
        x2.fillStyle = 'rgba(231,195,76,0.95)';
        x2.strokeStyle = 'rgba(20,14,6,0.6)';
        x2.lineWidth = 1;
        x2.beginPath();
        x2.moveTo(p2[0] + Math.cos(ang) * hs * 0.6, p2[1] + Math.sin(ang) * hs * 0.6);
        x2.lineTo(p2[0] + Math.cos(ang + 2.5) * hs, p2[1] + Math.sin(ang + 2.5) * hs);
        x2.lineTo(p2[0] + Math.cos(ang - 2.5) * hs, p2[1] + Math.sin(ang - 2.5) * hs);
        x2.closePath();
        x2.fill();
        x2.stroke();
        tradeLog.push({ kind: 'lane', from: n.id, to, amt, w, pts: scr.length });
      }
    }
    x2.restore();
  }
  // The market labels go over the army banners: in the trade map they are what
  // the map is for, and a host camped in Joppa must not hide Joppa's worth.
  function drawTradeLabels(camera) {
    if (!tradeView || !Array.isArray(tradeView.nodes)) return;
    const nodes = tradeView.nodes;
    x2.save();
    for (const n of nodes) {
      const c = n.centerId && geom.centroids[n.centerId];
      if (!c) continue;
      const [sx, sy] = camera.mapToScreen(c.x, c.y);
      const txt = n.name + ' ' + n.value.toFixed(1);
      x2.font = 'bold 11px Georgia, serif';
      const w = x2.measureText(txt).width + 12;
      const share = Math.max(0, Math.min(1, n.share || 0));
      x2.fillStyle = 'rgba(232,220,192,0.94)';
      x2.strokeStyle = n.home ? 'rgba(160,30,20,0.9)' : 'rgba(85,69,46,0.8)';
      x2.lineWidth = n.home ? 2 : 1;
      x2.beginPath();
      x2.rect(sx - w / 2, sy - 22, w, 16);
      x2.fill();
      x2.stroke();
      if (share > 0) { // our share, a gold bar along the foot
        x2.fillStyle = 'rgba(201,162,39,0.95)';
        x2.fillRect(sx - w / 2, sy - 8, w * share, 2);
      }
      x2.fillStyle = '#2b2015';
      x2.textAlign = 'center';
      x2.textBaseline = 'middle';
      x2.fillText(txt, sx, sy - 14);
      labelObstacles.push({ x: sx - w / 2, y: sy - 22, w, h: 16 });
      tradeLog.push({ kind: 'label', id: n.id, text: txt, x: sx, y: sy - 14, share, home: !!n.home });
    }
    x2.restore();
  }

  // ------------------------------------------------------ raid targeting --
  // The reach of a selected wing (v5.5): BFS ring over the land graph, cached
  // per wing+base. The sim's airRaidCore revalidates on click — these are eyes,
  // not authority.
  let raidReach = { key: '', set: null };
  function wingReach(wing) {
    const key = wing.id + ':' + wing.prov;
    if (raidReach.key === key) return raidReach.set;
    const hops = (DEFINES.AIR && DEFINES.AIR.rangeHops) || 2;
    const set = new Set([wing.prov]);
    let frontier = [wing.prov];
    for (let h = 0; h < hops; h++) {
      const next = [];
      for (const id of frontier) {
        for (const nb of (geom.neighbors[id] || [])) {
          if (!set.has(nb)) { set.add(nb); next.push(nb); }
        }
      }
      frontier = next;
    }
    raidReach = { key, set };
    return set;
  }

  function drawRaidTargeting(game, camera) {
    const wid = game.ui && game.ui.selectedWing;
    const wing = wid != null && game.airwings ? game.airwings[wid] : null;
    if (!wing || wing.tag !== game.playerTag) return;
    const base = geom.centroids[wing.prov];
    if (!base) return;
    const reach = wingReach(wing);
    const [bx, by] = camera.mapToScreen(base.x, base.y);
    let maxR = 48;
    for (const id of reach) {
      const c = geom.centroids[id];
      if (!c) continue;
      const [sx, sy] = camera.mapToScreen(c.x, c.y);
      maxR = Math.max(maxR, Math.hypot(sx - bx, sy - by));
    }
    x2.save();
    x2.strokeStyle = wing.raidCd > 0 ? 'rgba(160,150,120,0.45)' : 'rgba(231,195,76,0.55)';
    x2.lineWidth = 1.5;
    x2.setLineDash([9, 7]);
    x2.beginPath();
    x2.arc(bx, by, maxR + 20, 0, Math.PI * 2);
    x2.stroke();
    x2.setLineDash([]);
    // Bomb reticles where there is something worth hitting: hostile hosts or
    // a hostile garrison inside the ring.
    const me = game.tags[wing.tag] || {};
    const hostile = new Set((me.atWarWith || []).filter((e) => game.tags[e] && game.tags[e].alive));
    hostile.add('REB');
    const hot = new Set();
    for (const aid in game.armies) {
      const a = game.armies[aid];
      if (a && hostile.has(a.tag) && reach.has(a.prov)) hot.add(a.prov);
    }
    for (const id of reach) {
      const p = game.provinces[id];
      if (p && hostile.has(p.controller) && (p.garrison | 0) > 0) hot.add(id);
    }
    const inView = (sx, sy) => sx > -60 && sy > -60
      && sx < camera.viewport.w + 60 && sy < camera.viewport.h + 60;
    for (const id of hot) {
      const c = geom.centroids[id];
      if (!c) continue;
      const [sx, sy] = camera.mapToScreen(c.x, c.y);
      if (!inView(sx, sy)) continue;
      x2.strokeStyle = wing.raidCd > 0 ? 'rgba(160,150,120,0.7)' : 'rgba(214,74,52,0.9)';
      x2.lineWidth = 1.6;
      x2.beginPath();
      x2.arc(sx, sy, 11, 0, Math.PI * 2);
      x2.stroke();
      x2.beginPath();
      x2.moveTo(sx - 15, sy); x2.lineTo(sx - 7, sy);
      x2.moveTo(sx + 7, sy); x2.lineTo(sx + 15, sy);
      x2.moveTo(sx, sy - 15); x2.lineTo(sx, sy - 7);
      x2.moveTo(sx, sy + 7); x2.lineTo(sx, sy + 15);
      x2.stroke();
    }
    x2.restore();
  }

  // Ordered strikes waiting on the clock (v6.2): a dashed amber thread from
  // the wing's field to its target — the promise of bombs, until time moves
  // or the order is clicked off.
  function drawPendingStrikes(game, camera) {
    for (const wid in game.airwings || {}) {
      const w = game.airwings[wid];
      if (!w || w.tag !== game.playerTag || w.pendingRaid == null) continue;
      const a = geom.centroids[w.prov];
      const b = geom.centroids[w.pendingRaid];
      if (!a || !b) continue;
      const [ax, ay] = camera.mapToScreen(a.x, a.y);
      const [bx, by] = camera.mapToScreen(b.x, b.y);
      x2.save();
      x2.strokeStyle = 'rgba(231,195,76,0.75)';
      x2.lineWidth = 1.6;
      x2.setLineDash([7, 6]);
      x2.beginPath();
      x2.moveTo(ax, ay);
      x2.lineTo(bx, by);
      x2.stroke();
      x2.setLineDash([]);
      x2.beginPath(); // a waiting reticle over the target
      x2.arc(bx, by, 9, 0, Math.PI * 2);
      x2.stroke();
      x2.restore();
    }
  }

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

  // How large the roster's 24-unit grid is drawn on a counter.
  const GLYPH_PX = 13;

  // One soldier, stroked in the standard's own white, on whatever cloth the
  // age flies. The glyph is authored on a 24×24 grid, so the transform is a
  // scale — and the line width is divided back out so a spear at thirteen
  // pixels is as heavy a line as a tank at thirteen pixels.
  function drawUnitGlyph(ch, gx, gy) {
    let regs = null;
    if (ch.armies.length === 1) regs = ch.army.regiments;
    else {
      regs = { inf: 0, cav: 0, art: 0 };
      for (const ar of ch.armies) {
        const r = ar.regiments || {};
        regs.inf += r.inf || 0; regs.cav += r.cav || 0; regs.art += r.art || 0;
      }
    }
    const gen = Math.max(0, ch.army.gen | 0);
    const path = unitPath2D(gen, dominantArm(regs));
    if (!path) return;
    const s = GLYPH_PX / 24;
    x2.save();
    x2.translate(gx, gy);
    x2.scale(s, s);
    x2.lineWidth = 1.7 / s;
    x2.lineJoin = 'round';
    x2.lineCap = 'round';
    // A dark pass under the pale one, so the face reads on a light banner as
    // well as a dark one without knowing which it is standing on.
    x2.strokeStyle = 'rgba(12,8,4,0.55)';
    x2.stroke(path);
    x2.lineWidth = 1.3 / s;
    x2.strokeStyle = 'rgba(255,252,244,0.95)';
    x2.stroke(path);
    x2.restore();
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
    // The men ride to the right of the soldier's face, which now always has
    // one — so the number starts past the glyph rather than centered in the
    // whole cloth.
    const glyphW = GLYPH_PX + 2;
    const textFrom = clothX + glyphW;
    const textX = gen === 3
      ? textFrom + (ch.w - (textFrom - x)) * 0.30 // the pennon narrows to its point
      : (textFrom + x + ch.w - notch) * 0.5;
    x2.fillText(fmtMen(ch.men), textX, y + CHIP_H * 0.5 + 0.5 + sway * 0.4);
    x2.shadowBlur = 0;
    // The soldier's face (SPEC §191): the arm that leads this stack, at the
    // pattern it was raised to. A spear at 167 BCE, a cataphract under the
    // Hasmoneans, a tank in 1948 — the counter says what the host IS, not
    // merely how many men are in it.
    drawUnitGlyph(ch, clothX + 1.5, y + (CHIP_H - GLYPH_PX) * 0.5 + sway * 0.3);
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

  // ---- supply route (SPEC §82) ---------------------------------------------
  // Selecting one of your armies draws its traced supply line: a grain-gold
  // dashed road back to controlled home territory (or to the embarkation
  // port, then a dotted sea lane to the home harbor). A broken line is drawn
  // to the break and marked with a red cut — the map answers "why is this
  // army starving" at a glance. The trace is a sim read (supply.js) fed with
  // a mini-ctx; cached per army/day so the per-frame cost is a polyline.
  let supplyCache = { key: '', res: null };
  function supplyTraceFor(game, armyId) {
    const a = game.armies && game.armies[armyId];
    if (!a) return null;
    const d = game.date || {};
    const key = armyId + ':' + a.prov + ':' + d.y + '-' + d.m + '-' + d.d + ':' + (a.oosMonths | 0);
    if (supplyCache.key === key) return supplyCache.res;
    let res = null;
    try {
      res = traceSupply({
        game, geom, DEFINES,
        byId: (id) => (game.provinces && game.provinces[id]) || null,
      }, a);
    } catch (e) { warnOnce('supplyTrace', 'supply trace failed', e); }
    supplyCache = { key, res };
    return res;
  }
  function drawSupplyRoute(game, camera) {
    const ui = game.ui || {};
    const armyId = ui.selectedArmy != null ? ui.selectedArmy
      : (Array.isArray(ui.selectedArmies) && ui.selectedArmies.length ? ui.selectedArmies[0] : null);
    if (armyId == null) return;
    const a = game.armies && game.armies[armyId];
    if (!a || a.tag !== game.playerTag || a.aboard) return;
    const res = supplyTraceFor(game, armyId);
    if (!res || res.via === 'exempt' || !Array.isArray(res.route) || res.route.length < 1) return;
    const pts = res.route.map((id) => {
      const c = geom.centroids[id];
      return c ? camera.mapToScreen(c.x, c.y) : null;
    }).filter(Boolean);
    if (pts.length < 1) return;
    const breakIdx = res.breakAt ? res.route.indexOf(res.breakAt) : -1;
    const drawLeg = (from, to, color, width, dash) => {
      if (to <= from) return;
      x2.strokeStyle = color;
      x2.lineWidth = width;
      x2.lineJoin = 'round';
      x2.lineCap = 'round';
      x2.setLineDash(dash);
      x2.beginPath();
      x2.moveTo(pts[from][0], pts[from][1]);
      for (let i = from + 1; i <= to; i++) x2.lineTo(pts[i][0], pts[i][1]);
      x2.stroke();
      x2.setLineDash([]);
    };
    if (res.ok) {
      drawLeg(0, pts.length - 1, 'rgba(202,178,90,0.85)', 3.5, [8, 5]);
      // the sea lane: embark port → home harbor, a fainter dotted reach
      if (res.via === 'port' && res.homePort) {
        const p0 = geom.offshore && geom.offshore[res.route[res.route.length - 1]];
        const p1 = geom.offshore && geom.offshore[res.homePort];
        if (p0 && p1) {
          const [ax, ay] = camera.mapToScreen(p0.x, p0.y);
          const [bx, by] = camera.mapToScreen(p1.x, p1.y);
          x2.strokeStyle = 'rgba(150,190,205,0.8)';
          x2.lineWidth = 2.5;
          x2.setLineDash([2, 6]);
          x2.beginPath();
          x2.moveTo(ax, ay);
          x2.lineTo(bx, by);
          x2.stroke();
          x2.setLineDash([]);
        }
      }
      // the wagon at the source: a small grain-gold disc
      const last = pts[pts.length - 1];
      x2.fillStyle = 'rgba(202,178,90,0.9)';
      x2.beginPath();
      x2.arc(last[0], last[1], 4, 0, Math.PI * 2);
      x2.fill();
      return;
    }
    // broken: the good stretch to the break, the dead stretch beyond it,
    // and the cut itself in red
    const upTo = breakIdx > 0 ? breakIdx : pts.length - 1;
    drawLeg(0, upTo, 'rgba(190,70,55,0.85)', 3.5, [8, 5]);
    if (breakIdx >= 0 && breakIdx < pts.length - 1) {
      drawLeg(breakIdx, pts.length - 1, 'rgba(120,110,95,0.45)', 2.5, [3, 7]);
    }
    const bp = breakIdx >= 0 ? pts[breakIdx] : pts[pts.length - 1];
    if (bp) {
      x2.strokeStyle = 'rgba(215,60,45,0.95)';
      x2.lineWidth = 3.5;
      x2.lineCap = 'round';
      x2.beginPath();
      x2.moveTo(bp[0] - 7, bp[1] - 7);
      x2.lineTo(bp[0] + 7, bp[1] + 7);
      x2.moveTo(bp[0] + 7, bp[1] - 7);
      x2.lineTo(bp[0] - 7, bp[1] + 7);
      x2.stroke();
    }
  }

  let labelObstacles = [];
  function draw(game, camera, timeMs, dayFrac) {
    labelObstacles = [];
    shipLog = [];
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

      // the selected army's supply line (SPEC §82), under the unit markers
      drawSupplyRoute(game, camera);

      // sieges + wonders + structures per province
      const provs = game.provinces || [];
      const showWonders = camera.zoom > 1.5;
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
            labelObstacles.push({ x: sx - 9, y: sy + 7, w: 18, h: 18 });
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
          if (built.length) {
            const [sx, sy] = camera.mapToScreen(c.x, c.y);
            if (onScreen(sx, sy)) {
              const s = Math.min(2.2, 0.8 + camera.zoom * 0.25);
              const step = 13 * s;
              const keys = STRUCT_ORDER.filter((k) => built.indexOf(k) >= 0);
              const gy = sy + (p.wonder ? 30 : 26);
              labelObstacles.push({ x: sx - keys.length * step / 2, y: gy - 8 * s, w: keys.length * step, h: 16 * s });
              let gx = sx - ((keys.length - 1) * step) / 2;
              for (const k of keys) {
                // a mothballed fort's tower is drawn faded (SPEC §293)
                const faded = k === 'walls' && p.mothballed;
                if (faded) { x2.save(); x2.globalAlpha = 0.4; }
                drawStructGlyph(k, gx, gy, s);
                if (faded) x2.restore();
                gx += step;
              }
            }
          }
        }
      }

      // Air wings are persistent unit counters at every zoom level.
      // Raid targeting rides under the unit markers (v5.5).
      drawRaidTargeting(game, camera);
      drawPendingStrikes(game, camera);

      for (const marker of wingMarkerList(game, camera)) {
        if (onScreen(marker.x, marker.y)) drawWingMarker(game, marker);
      }

      // battles
      for (const b of game.battles || []) {
        const c = b && geom.centroids[b.prov];
        if (!c) continue;
        const [sx, sy] = camera.mapToScreen(c.x, c.y);
        if (onScreen(sx, sy)) drawBattle(sx, sy, timeMs);
      }

      // the sea (SPEC §290): fleets' courses, then the merchant marine, then
      // the warships over them — each on its route, turned to its course
      drawTradeFlows(camera, timeMs); // the trade map mode only (SPEC §292)
      const fleetMarks = fleetMarkerList(game, camera);
      for (const m of fleetMarks) if (m.route) drawFleetCourse(game, camera, m, timeMs);
      drawMerchants(game, camera, timeMs);
      const still = stillMotion();
      const tSea = still ? 0 : (timeMs || 0);
      for (const m of fleetMarks) {
        const f = m.fleet;
        if (!onScreen(m.x, m.y)) continue;
        const col = tagColor(game, f.tag);
        if (m.moving) drawWake(m.route, m.s, camera, m.sc);
        if (game.ui && game.ui.selectedFleet === f.id) {
          // selected: a gold ring on the water around the hull
          x2.save();
          x2.strokeStyle = '#e7c34c';
          x2.lineWidth = 2;
          x2.shadowColor = 'rgba(231,195,76,0.8)';
          x2.shadowBlur = 6;
          x2.beginPath();
          x2.ellipse(m.x, m.y + 3 * m.sc, 19 * m.sc, 7.5 * m.sc, 0, 0, Math.PI * 2);
          x2.stroke();
          x2.restore();
        }
        x2.save();
        if (f.laidUp) x2.globalAlpha = 0.5; // laid up in ordinary (SPEC §293)
        shipFrame(m.x, m.y, m.heading, m.sc, f.id, tSea);
        // The warship wears its age (v5.5): a ram-bowed galley for the oared
        // patterns, a tall-rigged hull for sail, a grey destroyer for oil.
        drawWarshipGlyph(f, col);
        if (m.moving) bowWave(tSea, still, 15);
        x2.restore();
        shipLog.push({ kind: 'fleet', id: f.id, x: m.x, y: m.y, s: m.s, moving: m.moving, heading: m.heading, laidUp: !!f.laidUp });
        shipBadge(m.x + 15 * m.sc, m.y - 11 * m.sc, String(f.ships), m.sc);
      }

      // army chips on top
      const chips = chipList(game, camera);
      labelObstacles.push(...chips.map(c => ({ x: c.x - 3, y: c.y - 2, w: c.w + 6, h: c.h + 4 })));
      for (const chp of chips) drawChip(game, chp, timeMs);
      drawTradeLabels(camera); // the trade map mode only (SPEC §292)

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

  function hitTestFleet(sx, sy, game, camera) {
    try {
      if (!game) return null;
      const pad = coarsePointer && coarsePointer.matches ? TOUCH_HIT_PAD : 0;
      const markers = fleetMarkerList(game, camera);
      for (let i = markers.length - 1; i >= 0; i--) {
        const m = markers[i];
        // v5.5: foreign fleets are pickable too — ui.js decides select vs inspect.
        // The box grows with the ship (SPEC §290) and follows it at sea.
        const hw = (FLEET_W / 2) * m.sc;
        const hh = (FLEET_H / 2) * m.sc;
        if (sx >= m.x - hw - pad && sx <= m.x + hw + pad
            && sy >= m.y - hh - pad && sy <= m.y + hh + pad) return m.fleet.id;
      }
    } catch (e) {
      warnOnce('hitf-throw', 'hitTestFleet failed', e);
    }
    return null;
  }

  function hitTestWing(sx, sy, game, camera) {
    try {
      if (!game) return null;
      const pad = coarsePointer && coarsePointer.matches ? TOUCH_HIT_PAD : 0;
      const markers = wingMarkerList(game, camera);
      for (let i = markers.length - 1; i >= 0; i--) {
        const m = markers[i];
        // v5.5: foreign wings are pickable too — ui.js decides select vs inspect.
        if (sx >= m.x - WING_W / 2 - pad && sx <= m.x + WING_W / 2 + pad
            && sy >= m.y - WING_H / 2 - pad && sy <= m.y + WING_H / 2 + pad) return m.wing.id;
      }
    } catch (e) {
      warnOnce('hitw-throw', 'hitTestWing failed', e);
    }
    return null;
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

  return { draw, labelObstacles: () => labelObstacles, ships: () => shipLog.slice(), trade: () => tradeLog.slice(), setTradeView, hitTestArmy, hitTestStack, hitTestFleet, hitTestWing, hitTestBattle, addRaidFx };
}
