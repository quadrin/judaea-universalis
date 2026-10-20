// js/ui/tooltip.js — global tooltip system (SPEC §8.2).
// Any element with a data-tt attribute shows a cursor-following tooltip.
// Text supports '\n' line breaks (rendered via CSS white-space:pre-line).

export function initTooltip(el) {
  if (!el) return;
  let cur = null; // element currently hovered
  const nativeTitles = new Map();

  function restoreNativeTitles(keep = new Set()) {
    for (const [node, title] of nativeTitles) {
      if (keep.has(node)) continue;
      // A refreshed control may already have a new title; keep that update.
      if (node.getAttribute('title') === '') node.setAttribute('title', title);
      nativeTitles.delete(node);
    }
  }

  function suppressNativeTitles(target) {
    const path = new Set();
    for (let node = target; node; node = node.parentElement) path.add(node);
    restoreNativeTitles(path);
    // Browsers also inherit titles from ancestors. Suppress the entire hover
    // path so a titled child or parent cannot cover the game's description.
    for (const node of path) {
      const title = node.getAttribute('title');
      if (title && !nativeTitles.has(node)) {
        nativeTitles.set(node, title);
        node.setAttribute('title', '');
      }
    }
  }

  function hide() {
    cur = null;
    el.classList.add('hidden');
    restoreNativeTitles();
  }

  function position(cx, cy) {
    const pad = 16;
    const r = el.getBoundingClientRect();
    let x = cx + pad;
    let y = cy + pad;
    if (x + r.width > window.innerWidth - 6) x = cx - r.width - pad;
    if (y + r.height > window.innerHeight - 6) y = cy - r.height - pad;
    el.style.left = Math.max(4, x) + 'px';
    el.style.top = Math.max(4, y) + 'px';
  }

  document.addEventListener('mouseover', (e) => {
    const t = e.target instanceof Element ? e.target.closest('[data-tt]') : null;
    if (t && t.dataset.tt) {
      suppressNativeTitles(e.target);
      cur = t;
      el.textContent = t.dataset.tt;
      el.classList.remove('hidden');
      position(e.clientX, e.clientY);
    } else if (cur) {
      hide();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!cur) return;
    // Element may have been removed (panels rebuild) or its text updated.
    if (!document.contains(cur) || !cur.dataset.tt) { hide(); return; }
    if (el.textContent !== cur.dataset.tt) el.textContent = cur.dataset.tt;
    position(e.clientX, e.clientY);
  });

  document.addEventListener('mousedown', () => {
    // Clicks often mutate the hovered element; re-validate next move.
    if (cur && !document.contains(cur)) hide();
  });

  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) hide();
  });

  window.addEventListener('blur', hide);
}
