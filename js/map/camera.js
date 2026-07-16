// js/map/camera.js — pan/zoom camera in map coordinates. SPEC §5.2.
// { x, y } = map coords at screen center; zoom = screen (CSS) px per map unit.
// mapToScreen/screenToMap MUST land on the same screen points as the GL main pass
// (renderer.js builds uOffsetScale from exactly these fields).

// v5.4: the frame grew to 4046×2189 — the floor drops so a laptop viewport
// can still frame the whole world from Rome to the Caspian.
const MIN_ZOOM = 0.22;
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

  function toLocal(cx, cy) {
    const r = container.getBoundingClientRect();
    return [cx - r.left, cy - r.top];
  }

  function localPos(e) {
    return toLocal(e.clientX, e.clientY);
  }

  function fire(cbs, sx, sy, mods) {
    const [mx, my] = screenToMap(sx, sy);
    for (const cb of cbs) {
      try { cb(mx, my, sx, sy, mods || {}); } catch (e) { console.warn('[camera] click handler failed', e); }
    }
  }

  // ---- input: one pointer drags/pans (sub-5px release is a click), two pinch-zoom ----
  // iOS/mobile contract: touch-action none is set here (not just CSS) so native pinch,
  // scroll and double-tap zoom never steal the gesture regardless of stylesheet timing.
  container.style.touchAction = 'none';
  container.addEventListener('gesturestart', (e) => e.preventDefault());

  const pointers = new Map(); // pointerId -> { x, y, type } (client coords)
  let dragging = false;
  let panId = -1; // pointerId doing the one-finger pan
  let lastX = 0;
  let lastY = 0;
  let travel = 0;

  // pinch (two touch pointers): zoom about the midpoint, pan by the midpoint delta
  let pinching = false;
  let pinchDist = 1;
  let pinchMidX = 0;
  let pinchMidY = 0;

  // long-press (touch only): stationary >=450ms fires right-click (= move order)
  const LONG_PRESS_MS = 450;
  const LONG_PRESS_SLOP_PX = 10;
  let lpTimer = 0;
  let lpId = -1;
  let lpX = 0;
  let lpY = 0;
  let lpFiredAt = -1e9; // guards against Android's synthesized contextmenu double-firing

  function cancelLongPress() {
    if (lpTimer) { clearTimeout(lpTimer); lpTimer = 0; }
    lpId = -1;
  }

  function fireLongPress() {
    lpTimer = 0;
    const p = pointers.get(lpId);
    lpId = -1;
    if (!p || pinching) return;
    lpFiredAt = performance.now();
    travel = CLICK_SLOP_PX; // suppress the click on release
    const [sx, sy] = toLocal(p.x, p.y);
    fire(rightCbs, sx, sy);
  }

  function firstTwoPointers() {
    const it = pointers.values();
    return [it.next().value, it.next().value];
  }

  function beginPinch() {
    const [a, b] = firstTwoPointers();
    pinching = true;
    pinchDist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    pinchMidX = (a.x + b.x) * 0.5;
    pinchMidY = (a.y + b.y) * 0.5;
  }

  container.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    try { container.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
    if (pointers.size === 1) {
      dragging = true;
      panId = e.pointerId;
      travel = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      if (e.pointerType === 'touch') {
        lpId = e.pointerId;
        lpX = e.clientX;
        lpY = e.clientY;
        lpTimer = setTimeout(fireLongPress, LONG_PRESS_MS);
      }
    } else {
      // second finger down: pinch — no pending click or long-press survives
      cancelLongPress();
      dragging = false;
      travel = CLICK_SLOP_PX;
      target = null;
      beginPinch();
    }
  });

  container.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (p) {
      p.x = e.clientX;
      p.y = e.clientY;
      if (lpTimer && e.pointerId === lpId &&
          Math.hypot(e.clientX - lpX, e.clientY - lpY) >= LONG_PRESS_SLOP_PX) {
        cancelLongPress();
      }
    }
    if (pinching) {
      const [a, b] = firstTwoPointers();
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const midX = (a.x + b.x) * 0.5;
      const midY = (a.y + b.y) * 0.5;
      // zoom about the previous midpoint (keeps its map point fixed there)...
      const [sx, sy] = toLocal(pinchMidX, pinchMidY);
      setZoomAt(sx, sy, cam.zoom * (dist / pinchDist));
      // ...then carry that map point to the new midpoint = two-finger pan
      cam.x -= (midX - pinchMidX) / cam.zoom;
      cam.y -= (midY - pinchMidY) / cam.zoom;
      clampPan();
      pinchDist = dist;
      pinchMidX = midX;
      pinchMidY = midY;
      return;
    }
    if (!dragging || e.pointerId !== panId) return;
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

  function endPointer(e, canClick) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    try { container.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (lpId === e.pointerId) cancelLongPress();
    if (pinching) {
      if (pointers.size >= 2) {
        beginPinch(); // three -> two fingers: rebase on the remaining pair
      } else if (pointers.size === 1) {
        // one finger lifted: hand off to one-finger panning without a jump
        pinching = false;
        const [id, p] = pointers.entries().next().value;
        dragging = true;
        panId = id;
        lastX = p.x;
        lastY = p.y;
        // travel stays >= CLICK_SLOP_PX: the final release is click-free
      } else {
        pinching = false;
        dragging = false;
      }
      return;
    }
    if (e.pointerId !== panId || !dragging) return;
    dragging = false;
    if (canClick && travel < CLICK_SLOP_PX) {
      const [sx, sy] = localPos(e);
      fire(clickCbs, sx, sy, { shift: !!e.shiftKey });
    }
  }

  container.addEventListener('pointerup', (e) => {
    if (e.button !== 0) return;
    endPointer(e, true);
  });

  container.addEventListener('pointercancel', (e) => { endPointer(e, false); });

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [sx, sy] = localPos(e);
    setZoomAt(sx, sy, cam.zoom * Math.exp(-e.deltaY * 0.0019)); // ~21%/notch — snappy, EU4-like
  }, { passive: false });

  container.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    // Android synthesizes contextmenu from a touch long-press; ours already handles it.
    if (performance.now() - lpFiredAt < 800) return;
    for (const p of pointers.values()) if (p.type === 'touch') return;
    const [sx, sy] = localPos(e);
    fire(rightCbs, sx, sy);
  });

  handleResize();
  // Initial framing: cover most of the screen with map, gently zoomed out.
  cam.zoom = clampZoom(Math.max(cam.viewport.w / W, cam.viewport.h / H) * 0.9);
  clampPan();

  return cam;
}
