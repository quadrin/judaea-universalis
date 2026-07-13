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
    const notch = 7;
    const cloth = () => {
      x2.beginPath();
      x2.moveTo(clothX, y);
      x2.lineTo(x + ch.w, y + sway * 0.6);
      x2.lineTo(x + ch.w - notch, y + CHIP_H * 0.5 + sway);
      x2.lineTo(x + ch.w, y + CHIP_H + sway * 0.6);
      x2.lineTo(clothX, y + CHIP_H);
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
    x2.fillText(fmtMen(ch.men), (clothX + x + ch.w - notch) * 0.5, y + CHIP_H * 0.5 + 0.5 + sway * 0.4);
    x2.shadowBlur = 0;
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

      // sieges + wonders per province
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

  return { draw, hitTestArmy, hitTestStack, hitTestBattle };
}
