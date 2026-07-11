// js/map/labels.js — absolutely-positioned DOM labels in #labels-layer. SPEC §5.6.
// Zoom >= 1.1: province names at pixel-mass centroids, sized by sqrt(area)·zoom.
// Zoom <  1.1: nation names at owner-weighted centroids in darkened tag colors.
// Divs are pooled and reused; style writes are skipped when unchanged.

const PROV_LABEL_ZOOM = 1.1;
const FONT_STACK = "'Iowan Old Style','Palatino Linotype',Georgia,serif";
const PROV_SIZE_K = 0.062;  // raw font px = sqrt(areaPx) * zoom * K
const TAG_SIZE_K = 0.085;

const warned = new Set();
function warnOnce(key, ...msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn('[labels]', ...msg);
}

export function createLabels(el, MAP_DATA, geom) {
  const pool = [];

  try {
    el.style.pointerEvents = 'none';
    el.style.overflow = 'hidden';
  } catch (e) { /* no DOM — nothing to label */ }

  function getDiv(i) {
    if (pool[i]) return pool[i];
    const d = document.createElement('div');
    d.style.position = 'absolute';
    d.style.left = '0';
    d.style.top = '0';
    d.style.pointerEvents = 'none';
    d.style.whiteSpace = 'nowrap';
    d.style.fontFamily = FONT_STACK;
    d.style.userSelect = 'none';
    d.style.lineHeight = '1';
    d.style.textShadow = '0 0 3px rgba(242,232,206,0.85), 0 0 1px rgba(242,232,206,0.9)';
    el.appendChild(d);
    pool[i] = d;
    return d;
  }

  function place(i, text, sx, sy, fontPx, color, spacing, caps) {
    const d = getDiv(i);
    if (d._text !== text) { d.textContent = text; d._text = text; }
    const f = Math.round(fontPx * 10) / 10;
    if (d._font !== f) { d.style.fontSize = f + 'px'; d._font = f; }
    if (d._color !== color) { d.style.color = color; d._color = color; }
    if (d._spacing !== spacing) { d.style.letterSpacing = spacing; d._spacing = spacing; }
    if (d._caps !== caps) {
      d.style.fontVariant = caps ? 'small-caps' : 'normal';
      d.style.textTransform = caps ? 'uppercase' : 'none';
      d.style.fontWeight = caps ? '600' : '400';
      d._caps = caps;
    }
    const tr = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -50%)`;
    if (d._tr !== tr) { d.style.transform = tr; d._tr = tr; } // avoid per-frame style invalidation when idle
    if (d._shown !== true) { d.style.display = 'block'; d._shown = true; }
  }

  function update(ctx, camera, mapmode) {
    let used = 0;
    try {
      if (ctx && ctx.game && camera) {
        const zoom = camera.zoom;
        const vw = camera.viewport.w;
        const vh = camera.viewport.h;
        const provs = ctx.game.provinces;
        const N = provs.length - 1;

        if (zoom >= PROV_LABEL_ZOOM) {
          // province names
          for (let id = 1; id <= N; id++) {
            const p = provs[id];
            if (!p || !p.name) continue;
            const c = geom.centroids[id];
            if (!c) continue;
            const raw = Math.sqrt(Math.max(1, geom.areas[id])) * zoom * PROV_SIZE_K;
            if (raw < 9) continue; // hidden below 9px
            const [sx, sy] = camera.mapToScreen(c.x, c.y);
            if (sx < -120 || sy < -60 || sx > vw + 120 || sy > vh + 60) continue;
            const color = p.impassable ? 'rgba(66,57,42,0.55)' : 'rgba(35,28,17,0.82)';
            place(used++, p.name, sx, sy, Math.min(22, raw), color, '0.04em', false);
          }
        } else {
          // nation names: owner-weighted centroid over owned provinces
          const agg = new Map();
          for (let id = 1; id <= N; id++) {
            const p = provs[id];
            if (!p || p.impassable) continue;
            const tag = p.owner;
            if (!tag || tag === 'WASTE') continue;
            const a = geom.areas[id];
            if (!a) continue;
            const c = geom.centroids[id];
            let g = agg.get(tag);
            if (!g) { g = { a: 0, x: 0, y: 0 }; agg.set(tag, g); }
            g.a += a;
            g.x += c.x * a;
            g.y += c.y * a;
          }
          const TAGS = (ctx.DEFINES && ctx.DEFINES.TAGS) || {};
          for (const [tag, g] of agg) {
            const info = ctx.game.tags[tag] || TAGS[tag];
            const name = (info && info.name) || tag;
            const raw = Math.sqrt(g.a) * zoom * TAG_SIZE_K;
            if (raw < 10) continue;
            const [sx, sy] = camera.mapToScreen(g.x / g.a, g.y / g.a);
            if (sx < -260 || sy < -80 || sx > vw + 260 || sy > vh + 80) continue;
            const col = info && info.color
              ? `rgba(${Math.round(info.color[0] * 0.42)},${Math.round(info.color[1] * 0.42)},${Math.round(info.color[2] * 0.42)},0.92)`
              : 'rgba(44,36,22,0.9)';
            place(used++, name, sx, sy, Math.min(42, Math.max(11, raw)), col, '0.18em', true);
          }
        }
      }
    } catch (e) {
      warnOnce('update-throw', 'update failed', e);
    }
    for (let i = used; i < pool.length; i++) {
      const d = pool[i];
      if (d && d._shown) { d.style.display = 'none'; d._shown = false; }
    }
  }

  return { update };
}
