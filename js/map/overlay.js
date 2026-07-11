// js/map/overlay.js — 2D canvas overlay: army chips, arrows, battle/siege icons. SPEC §5.5.
// Cleared and redrawn every frame; positions come from geom.centroids via camera.mapToScreen,
// so everything lands on the same screen points as the GL map underneath.

const CHIP_W = 46;
const CHIP_H = 20;
const MORALE_H = 3;
const CULL_MARGIN = 90;

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

function roundRect(x2, x, y, w, h, r) {
  x2.beginPath();
  x2.moveTo(x + r, y);
  x2.arcTo(x + w, y, x + w, y + h, r);
  x2.arcTo(x + w, y + h, x, y + h, r);
  x2.arcTo(x, y + h, x, y, r);
  x2.arcTo(x, y, x + w, y, r);
  x2.closePath();
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

  // Shared by draw() and hitTestArmy() so picking always matches the pixels.
  // Returns chips in draw order (bottom -> top), positions in CSS px.
  function chipList(game, camera) {
    const out = [];
    const perProv = new Map();
    const armies = Object.values(game.armies || {})
      .filter(Boolean)
      .sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0));
    const vw = camera.viewport.w;
    const vh = camera.viewport.h;
    for (const a of armies) {
      const c = geom.centroids[a.prov];
      if (!c) continue;
      const stack = perProv.get(a.prov) || 0;
      perProv.set(a.prov, stack + 1);
      const [sx, sy] = camera.mapToScreen(c.x, c.y);
      if (sx < -CULL_MARGIN || sy < -CULL_MARGIN || sx > vw + CULL_MARGIN || sy > vh + CULL_MARGIN) continue;
      out.push({
        army: a,
        x: sx - CHIP_W * 0.5 + stack * 7,
        y: sy - CHIP_H - 10 - stack * 8,
        w: CHIP_W,
        h: CHIP_H + MORALE_H,
      });
    }
    return out;
  }

  function drawArrow(game, camera, a) {
    const path = a.path;
    if (!Array.isArray(path) || path.length === 0) return;
    const pts = [];
    const start = geom.centroids[a.prov];
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

  function drawSiege(sx, sy, siege) {
    x2.fillStyle = '#e8dcc0';
    x2.strokeStyle = '#6b5a33';
    x2.lineWidth = 1.5;
    x2.beginPath();
    x2.arc(sx, sy, 11, 0, Math.PI * 2);
    x2.fill();
    x2.stroke();
    x2.fillStyle = '#4a3a1c';
    x2.font = '12px Georgia, serif';
    x2.textAlign = 'center';
    x2.textBaseline = 'middle';
    x2.fillText('♜', sx, sy + 1); // tower/rook glyph
    const prog = Math.min(100, Math.max(0, (siege && siege.progress) || 0)) / 100;
    if (prog > 0) {
      x2.strokeStyle = '#c9a227';
      x2.lineWidth = 3;
      x2.beginPath();
      x2.arc(sx, sy, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      x2.stroke();
    }
  }

  function drawBattle(sx, sy) {
    x2.fillStyle = '#f4efe2';
    x2.strokeStyle = '#7a1a12';
    x2.lineWidth = 1.5;
    x2.beginPath();
    x2.arc(sx, sy, 12, 0, Math.PI * 2);
    x2.fill();
    x2.stroke();
    x2.fillStyle = '#7a1a12';
    x2.font = '13px Georgia, serif';
    x2.textAlign = 'center';
    x2.textBaseline = 'middle';
    x2.fillText('⚔', sx, sy + 1);
  }

  function drawChip(game, ch) {
    const a = ch.army;
    const col = tagColor(game, a.tag);
    const selected = game.ui && game.ui.selectedArmy === a.id;
    x2.globalAlpha = a.retreating ? 0.65 : 1;
    if (selected) {
      x2.strokeStyle = '#e7c34c';
      x2.lineWidth = 2.5;
      roundRect(x2, ch.x - 2, ch.y - 2, ch.w + 4, ch.h + 4, 6);
      x2.stroke();
    }
    roundRect(x2, ch.x, ch.y, ch.w, CHIP_H, 4);
    x2.fillStyle = css(col);
    x2.fill();
    x2.strokeStyle = 'rgba(15,10,5,0.8)';
    x2.lineWidth = 1;
    x2.stroke();
    x2.fillStyle = '#fff';
    x2.font = 'bold 11px Georgia, serif';
    x2.textAlign = 'center';
    x2.textBaseline = 'middle';
    x2.shadowColor = 'rgba(0,0,0,0.6)';
    x2.shadowBlur = 2;
    x2.fillText(fmtMen(a.men), ch.x + ch.w * 0.5, ch.y + CHIP_H * 0.5 + 0.5);
    x2.shadowBlur = 0;
    // morale bar
    const frac = Math.min(1, Math.max(0, (a.morale || 0) / Math.max(0.01, a.maxMorale || 1)));
    x2.fillStyle = 'rgba(10,8,4,0.85)';
    x2.fillRect(ch.x + 2, ch.y + CHIP_H, ch.w - 4, MORALE_H);
    x2.fillStyle = frac > 0.5 ? '#5da43a' : frac > 0.25 ? '#c9a227' : '#b33a26';
    x2.fillRect(ch.x + 2, ch.y + CHIP_H, (ch.w - 4) * frac, MORALE_H);
    x2.globalAlpha = 1;
  }

  function draw(game, camera, timeMs) {
    try {
      const { cw, ch, dpr } = syncSize();
      x2.setTransform(dpr, 0, 0, dpr, 0, 0);
      x2.clearRect(0, 0, cw, ch);
      if (!game) return;

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
          if (onScreen(sx, sy)) drawSiege(sx, sy, p.siege);
        }
        if (showWonders && p.wonder) {
          const [sx, sy] = camera.mapToScreen(c.x, c.y);
          if (onScreen(sx, sy)) {
            x2.font = '14px Georgia, serif';
            x2.textAlign = 'center';
            x2.textBaseline = 'middle';
            x2.strokeStyle = 'rgba(30,22,8,0.85)';
            x2.lineWidth = 2.5;
            x2.strokeText('✦', sx, sy + 16);
            x2.fillStyle = '#e7c34c';
            x2.fillText('✦', sx, sy + 16);
          }
        }
      }

      // battles
      for (const b of game.battles || []) {
        const c = b && geom.centroids[b.prov];
        if (!c) continue;
        const [sx, sy] = camera.mapToScreen(c.x, c.y);
        if (onScreen(sx, sy)) drawBattle(sx, sy);
      }

      // army chips on top
      const chips = chipList(game, camera);
      for (const chp of chips) drawChip(game, chp);
    } catch (e) {
      warnOnce('draw-throw', 'draw failed', e);
    }
  }

  function hitTestArmy(sx, sy, game, camera) {
    try {
      if (!game) return null;
      const chips = chipList(game, camera);
      for (let i = chips.length - 1; i >= 0; i--) { // topmost first
        const c = chips[i];
        if (sx >= c.x && sx <= c.x + c.w && sy >= c.y && sy <= c.y + c.h) return c.army.id;
      }
    } catch (e) {
      warnOnce('hit-throw', 'hitTestArmy failed', e);
    }
    return null;
  }

  return { draw, hitTestArmy };
}
