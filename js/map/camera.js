// js/map/camera.js — pan/zoom camera in map coordinates. SPEC §5.2.
// { x, y } = map coords at screen center; zoom = screen (CSS) px per map unit.
// mapToScreen/screenToMap MUST land on the same screen points as the GL main pass
// (renderer.js builds uOffsetScale from exactly these fields).

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 8;
const CLICK_SLOP_PX = 5;

export function createCamera(container, MAP_DATA) {
  const W = MAP_DATA.MAP_W;
  const H = MAP_DATA.MAP_H;

  const cam = {
    x: W * 0.5,
    y: H * 0.5,
    zoom: 1,
    viewport: { w: 1, h: 1 },
    screenToMap,
    mapToScreen,
    onClick,
    onRightClick,
    centerOn,
    update,
    handleResize,
  };

  let target = null; // {x, y, zoom} for smooth centerOn
  const clickCbs = [];
  const rightCbs = [];

  function clampZoom(z) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  }

  function screenToMap(sx, sy) {
    return [
      cam.x + (sx - cam.viewport.w * 0.5) / cam.zoom,
      cam.y + (sy - cam.viewport.h * 0.5) / cam.zoom,
    ];
  }

  function mapToScreen(x, y) {
    return [
      (x - cam.x) * cam.zoom + cam.viewport.w * 0.5,
      (y - cam.y) * cam.zoom + cam.viewport.h * 0.5,
    ];
  }

  // Keep the map roughly on screen: the center may wander at most 40% of a half-screen
  // past the map edge; when the whole axis fits, lock to the middle.
  function clampAxis(v, halfScreen, size) {
    const lo = Math.min(halfScreen * 0.4, size * 0.5);
    const hi = Math.max(size - halfScreen * 0.4, size * 0.5);
    return Math.min(hi, Math.max(lo, v));
  }

  function clampPan() {
    cam.x = clampAxis(cam.x, cam.viewport.w * 0.5 / cam.zoom, W);
    cam.y = clampAxis(cam.y, cam.viewport.h * 0.5 / cam.zoom, H);
  }

  function handleResize() {
    cam.viewport.w = container.clientWidth || window.innerWidth || 1;
    cam.viewport.h = container.clientHeight || window.innerHeight || 1;
    clampPan();
  }

  function setZoomAt(sx, sy, z) {
    z = clampZoom(z);
    const [mx, my] = screenToMap(sx, sy);
    cam.zoom = z;
    // keep the map point under the cursor fixed
    cam.x = mx - (sx - cam.viewport.w * 0.5) / z;
    cam.y = my - (sy - cam.viewport.h * 0.5) / z;
    target = null;
    clampPan();
  }

  function centerOn(x, y, zoom) {
    target = {
      x,
      y,
      zoom: zoom === undefined ? cam.zoom : clampZoom(zoom),
    };
  }

  // Arrow-key panning: held arrows scroll the map at a screen-constant speed.
  const heldArrows = new Set();
  window.addEventListener('keydown', (e) => {
    if (!e.key || !e.key.startsWith('Arrow')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    heldArrows.add(e.key);
    e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    if (e.key && e.key.startsWith('Arrow')) heldArrows.delete(e.key);
  });
  window.addEventListener('blur', () => heldArrows.clear());

  function update(dt) {
    if (heldArrows.size) {
      const step = 0.7 * (dt || 16) / cam.zoom; // ~700 screen px/s regardless of zoom
      if (heldArrows.has('ArrowLeft')) cam.x -= step;
      if (heldArrows.has('ArrowRight')) cam.x += step;
      if (heldArrows.has('ArrowUp')) cam.y -= step;
      if (heldArrows.has('ArrowDown')) cam.y += step;
      target = null; // manual steering cancels any glide
      clampPan();
    }
    if (!target) return;
    const k = 1 - Math.exp(-(dt || 16) / 110); // ~300ms glide
    cam.x += (target.x - cam.x) * k;
    cam.y += (target.y - cam.y) * k;
    cam.zoom += (target.zoom - cam.zoom) * k;
    if (Math.abs(target.x - cam.x) < 0.5 &&
        Math.abs(target.y - cam.y) < 0.5 &&
        Math.abs(target.zoom - cam.zoom) < 0.004) {
      cam.x = target.x;
      cam.y = target.y;
      cam.zoom = target.zoom;
      target = null;
    }
    clampPan();
  }

  function onClick(cb) { clickCbs.push(cb); }
  function onRightClick(cb) { rightCbs.push(cb); }

  function localPos(e) {
    const r = container.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  function fire(cbs, sx, sy, mods) {
    const [mx, my] = screenToMap(sx, sy);
    for (const cb of cbs) {
      try { cb(mx, my, sx, sy, mods || {}); } catch (e) { console.warn('[camera] click handler failed', e); }
    }
  }

  // ---- input: left-drag pans, sub-5px release is a click ----
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let travel = 0;

  container.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    travel = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    try { container.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
  });

  container.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    travel += Math.abs(dx) + Math.abs(dy);
    if (travel >= CLICK_SLOP_PX) target = null; // user grabbed the map: cancel glide
    cam.x -= dx / cam.zoom;
    cam.y -= dy / cam.zoom;
    clampPan();
  });

  container.addEventListener('pointerup', (e) => {
    if (e.button !== 0 || !dragging) return;
    dragging = false;
    try { container.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (travel < CLICK_SLOP_PX) {
      const [sx, sy] = localPos(e);
      fire(clickCbs, sx, sy, { shift: !!e.shiftKey });
    }
  });

  container.addEventListener('pointercancel', () => { dragging = false; });

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [sx, sy] = localPos(e);
    setZoomAt(sx, sy, cam.zoom * Math.exp(-e.deltaY * 0.0019)); // ~21%/notch — snappy, EU4-like
  }, { passive: false });

  container.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const [sx, sy] = localPos(e);
    fire(rightCbs, sx, sy);
  });

  handleResize();
  // Initial framing: cover most of the screen with map, gently zoomed out.
  cam.zoom = clampZoom(Math.max(cam.viewport.w / W, cam.viewport.h / H) * 0.9);
  clampPan();

  return cam;
}
