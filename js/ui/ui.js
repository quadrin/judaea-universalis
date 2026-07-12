// js/ui/ui.js — UI package entry (SPEC §8). Single pinned export: initUI.
// initUI(staticCtx) -> { showStartScreen(bookmark, onPick), bindGame(ctx, actions) }
import { warnOnce } from './format.js';
import { initTooltip } from './tooltip.js';
import { createToasts } from './toasts.js';
import { buildStartScreen } from './startscreen.js';
import { createTopbar } from './topbar.js';
import { createProvincePanel } from './province_panel.js';
import { createOutliner } from './outliner.js';
import { createEventModal, createGameoverModal } from './modals.js';
import { icon } from './icons.js';

const MAPMODES = [
  { id: 'political', ico: icon('temple'), name: 'Political' },
  { id: 'terrain', ico: icon('mountain'), name: 'Terrain' },
  { id: 'religion', ico: icon('altar'), name: 'Religion' },
  { id: 'culture', ico: icon('amphora'), name: 'Culture' },
  { id: 'development', ico: icon('bricks'), name: 'Development' },
  { id: 'unrest', ico: icon('flame'), name: 'Unrest' },
];

function buildMapmodeBar(bar, bus) {
  bar.innerHTML = MAPMODES.map((m) =>
    `<button class="mm-btn${m.id === 'political' ? ' active' : ''}" data-mode="${m.id}" data-tt="${m.name} mapmode">${m.ico}</button>`
  ).join('');
  bar.addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest('[data-mode]') : null;
    if (!b) return;
    bar.querySelectorAll('.mm-btn').forEach((x) => x.classList.toggle('active', x === b));
    bus.emit('mapmode', b.dataset.mode);
  });
}

export function initUI(staticCtx) {
  const { DEFINES, bus, camera } = staticCtx;
  const $ = (id) => document.getElementById(id);
  const els = {
    topbar: $('topbar'),
    panel: $('province-panel'),
    outliner: $('outliner'),
    mapmodeBar: $('mapmode-bar'),
    toasts: $('toast-container'),
    eventModal: $('event-modal'),
    gameoverModal: $('gameover-modal'),
    tooltip: $('tooltip'),
    start: $('start-screen'),
  };
  const state = { ctx: null, actions: null, bound: false };

  // Mobile contract: coarse-pointer detection via matchMedia, never UA sniffs.
  const coarse = typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches;
  // Group mode (mobile contract): while true, every own-army tap toggles that
  // army in/out of the selection group — exactly like shift+click — and
  // province taps do NOT clear the group. Desktop shift+click is unchanged.
  let groupMode = false;

  initTooltip(els.tooltip);
  buildMapmodeBar(els.mapmodeBar, bus);

  // ------------------------------------------------------- mobile chrome --
  // Both buttons live in CSS-land until a media query shows them: the group
  // toggle on coarse pointers, the outliner pill on narrow screens.
  const uiRoot = document.getElementById('ui-root');

  // Two-soldiers glyph in the icons.js hand: 24x24, stroke 1.6, currentColor.
  const groupBtn = document.createElement('button');
  groupBtn.id = 'group-toggle';
  groupBtn.innerHTML =
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<circle cx="9" cy="7.8" r="3.1"/>'
    + '<path d="M3.4 19.6c.6-3.6 2.6-5.4 5.6-5.4s5 1.8 5.6 5.4Z"/>'
    + '<path d="M14.8 5.2c1.9.4 3 1.7 3 3.5 0 1.1-.4 2-1.2 2.6"/>'
    + '<path d="M16.9 14.6c2.1.7 3.3 2.4 3.7 5h-3.2"/>'
    + '</svg>';
  groupBtn.dataset.tt = 'Group mode: tapping your armies adds them to (or drops them from) the group';
  groupBtn.setAttribute('aria-label', 'Toggle group mode');
  groupBtn.setAttribute('aria-pressed', 'false');
  groupBtn.addEventListener('click', () => {
    groupMode = !groupMode;
    groupBtn.classList.toggle('active', groupMode);
    groupBtn.setAttribute('aria-pressed', String(groupMode));
  });
  uiRoot.appendChild(groupBtn);

  // Outliner pill: army-count badge that expands the outliner as a drawer.
  const pillBtn = document.createElement('button');
  pillBtn.id = 'outliner-pill';
  pillBtn.className = 'hidden'; // unhidden once a game is bound
  pillBtn.innerHTML = `${icon('shield')}<span data-ref="count">0</span>`;
  pillBtn.dataset.tt = 'Armies in the field — tap for the outliner';
  pillBtn.setAttribute('aria-label', 'Toggle outliner');
  const pillCount = pillBtn.querySelector('[data-ref="count"]');
  pillBtn.addEventListener('click', () => {
    const open = els.outliner.classList.toggle('open');
    pillBtn.classList.toggle('active', open);
    if (open) updatePill();
  });
  uiRoot.appendChild(pillBtn);
  // Splitting an army from the drawer changes the count while paused.
  els.outliner.addEventListener('click', () => { setTimeout(updatePill, 0); });

  function closeOutlinerDrawer() {
    els.outliner.classList.remove('open');
    pillBtn.classList.remove('active');
  }

  function updatePill() {
    const g = state.ctx && state.ctx.game;
    if (!g) return;
    let n = 0;
    for (const a of Object.values(g.armies || {})) if (a && a.tag === g.playerTag) n++;
    const s = String(n);
    if (pillCount.textContent !== s) pillCount.textContent = s;
  }

  const toasts = createToasts(els.toasts, {
    onProvClick(provName) {
      if (!state.ctx) return;
      const p = state.ctx.prov ? state.ctx.prov(provName) : null;
      if (p && camera) camera.centerOn(p.x, p.y);
    },
  });
  const topbar = createTopbar(els.topbar, { DEFINES });
  const panel = createProvincePanel(els.panel, { DEFINES, onClose: () => setSelectedProv(0) });
  const outliner = createOutliner(els.outliner, {
    onPeaceClick(warId) { openPeaceDialog(warId); },
    onArmyClick(id, shift) {
      const g = state.ctx && state.ctx.game;
      if (!g || !g.armies || !g.armies[id]) return;
      // build the group without camera jumps (shift, or group mode on touch)
      if (shift || groupMode) { toggleArmyInGroup(id); return; }
      setSelectedArmy(id);
      const p = g.provinces[g.armies[id].prov];
      if (p && camera) camera.centerOn(p.x, p.y);
    },
    onFocusProv(provId) {
      const g = state.ctx && state.ctx.game;
      if (!g) return;
      const p = g.provinces[provId];
      if (p && camera) camera.centerOn(p.x, p.y);
      if (p) setSelectedProv(provId);
      closeOutlinerDrawer(); // jumped to the map: get the drawer out of the way
    },
  });
  const eventModal = createEventModal(els.eventModal);
  const gameover = createGameoverModal(els.gameoverModal, () => {
    // "Continue observing": unfreeze the clock; game.result stays set so
    // bookmark.checkVictory never re-fires the verdict.
    const g = state.ctx && state.ctx.game;
    if (g) g.over = false;
  });

  // ---------------------------------------------------------- peace dialog --
  let peaceEl = null;
  function openPeaceDialog(warId) {
    const g = state.ctx && state.ctx.game;
    const actions = state.actions;
    if (!g || !actions) return;
    const war = (g.wars || []).find((w) => w && w.id === warId);
    if (!war) return;
    if (!peaceEl) {
      peaceEl = document.createElement('div');
      peaceEl.id = 'peace-modal';
      document.getElementById('ui-root').appendChild(peaceEl);
    }
    const terms = actions.peaceTerms ? actions.peaceTerms() : {};
    const rows = Object.keys(terms).map((k) => {
      const hint = k === 'white' ? 'Occupations revert; five-year truce.'
        : k === 'tribute' ? 'As white peace, plus the enemy pays an indemnity. Needs a winning war.'
          : 'Every province you occupy becomes yours. Needs a crushing war.';
      return `<button class="btn peace-opt" data-level="${k}">${terms[k].label}<span class="peace-hint">${hint}</span></button>`;
    }).join('');
    peaceEl.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card">
        <h2 class="peace-title">Terms for ${war.name || 'the war'}</h2>
        <div class="peace-body">Envoys can carry one offer; a refusal closes the enemy's door for six months.</div>
        ${rows}
        <button class="btn peace-cancel">Recall the envoys</button>
      </div>`;
    peaceEl.classList.remove('hidden');
    peaceEl.querySelector('.peace-cancel').addEventListener('click', () => peaceEl.classList.add('hidden'));
    peaceEl.querySelector('.modal-scrim').addEventListener('click', () => peaceEl.classList.add('hidden'));
    peaceEl.querySelectorAll('.peace-opt').forEach((b) => {
      b.addEventListener('click', () => {
        peaceEl.classList.add('hidden');
        try { actions.offerPeace(warId, b.dataset.level); } catch (e) { warnOnce('offerPeace', e); }
        outliner.refresh(true);
      });
    });
  }

  // ------------------------------------------------------------ selection --
  function setSelectedProv(id) {
    const g = state.ctx && state.ctx.game;
    if (!g) return;
    id = id | 0;
    g.ui.selectedProv = id;
    bus.emit('select', id);
    if (id > 0) panel.open(id);
    else panel.close();
  }

  function setSelectedArmy(id) {
    const g = state.ctx && state.ctx.game;
    if (!g) return;
    g.ui.selectedArmy = id == null ? null : id;
    g.ui.selectedArmies = id == null ? [] : [id];
    bus.emit('selectArmy', g.ui.selectedArmy);
    outliner.refresh(true);
  }

  // Shift+click: grow/shrink the group. The last-added army is the primary
  // (split/hire act on it); orders move the whole group.
  function toggleArmyInGroup(id) {
    const g = state.ctx && state.ctx.game;
    if (!g) return;
    if (!Array.isArray(g.ui.selectedArmies)) g.ui.selectedArmies = [];
    const grp = g.ui.selectedArmies;
    const at = grp.indexOf(id);
    if (at >= 0) {
      grp.splice(at, 1);
      if (g.ui.selectedArmy === id) g.ui.selectedArmy = grp.length ? grp[grp.length - 1] : null;
    } else {
      grp.push(id);
      g.ui.selectedArmy = id;
    }
    bus.emit('selectArmy', g.ui.selectedArmy);
    outliner.refresh(true);
  }

  function onMapClick(payload) {
    const g = state.ctx.game;
    const { provId, armyId, shift } = payload || {};
    closeOutlinerDrawer(); // map taps dismiss the mobile drawer
    // Group mode behaves exactly like a held shift key (mobile contract).
    const grouping = shift || groupMode;
    if (armyId != null) {
      const a = g.armies && g.armies[armyId];
      if (a && a.tag === g.playerTag) {
        if (grouping) toggleArmyInGroup(armyId);
        else setSelectedArmy(armyId);
        setSelectedProv(0);
        return;
      }
      // Foreign army: fall through to the province underneath.
    }
    if (grouping) return; // shift/group taps on terrain don't drop a built-up group
    if (provId > 0) {
      setSelectedArmy(null);
      setSelectedProv(provId);
    } else {
      // Sea click deselects everything.
      setSelectedArmy(null);
      setSelectedProv(0);
    }
  }

  function onMapRightClick(payload) {
    const g = state.ctx.game;
    const provId = payload ? payload.provId : 0;
    if (provId <= 0 || !state.actions) return;
    const grp = Array.isArray(g.ui.selectedArmies) && g.ui.selectedArmies.length
      ? g.ui.selectedArmies
      : (g.ui.selectedArmy != null ? [g.ui.selectedArmy] : []);
    for (const id of grp) state.actions.moveArmy(id, provId);
  }

  // ------------------------------------------------------------- keyboard --
  window.addEventListener('keydown', (e) => {
    if (!state.ctx || !state.actions) return;
    if (!els.start.classList.contains('hidden')) return;
    if (eventModal.isOpen()) return; // buttons only while an event is up
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      try { state.actions.togglePause(); } catch (err) { warnOnce('togglePause', err); }
      topbar.refresh();
    } else if (e.key >= '1' && e.key <= '5') {
      try { state.actions.setSpeed(Number(e.key)); } catch (err) { warnOnce('setSpeed', err); }
      topbar.refresh();
    } else if (e.key === 'Escape') {
      const g = state.ctx.game;
      if (g.ui.selectedArmy != null || (g.ui.selectedArmies && g.ui.selectedArmies.length)) setSelectedArmy(null);
      if (g.ui.selectedProv) setSelectedProv(0);
    }
  });

  // ------------------------------------------------------ touch niceties --
  if (coarse) {
    // Bottom sheet: swiping down on the panel header closes it (the ✕ works
    // too). The header is a stable child of the panel across rebuilds.
    let sheetY = null;
    els.panel.addEventListener('touchstart', (e) => {
      const onHead = e.target instanceof Element && e.target.closest('.pp-head');
      sheetY = (onHead && e.touches.length === 1) ? e.touches[0].clientY : null;
    }, { passive: true });
    els.panel.addEventListener('touchmove', (e) => {
      if (sheetY == null || !e.touches.length) return;
      if (e.touches[0].clientY - sheetY > 52) { sheetY = null; setSelectedProv(0); }
    }, { passive: true });
    els.panel.addEventListener('touchend', () => { sheetY = null; });
    els.panel.addEventListener('touchcancel', () => { sheetY = null; });

    // Tooltips: hover doesn't exist here, so any [data-tt] element shows its
    // tooltip on a 350ms press-and-hold instead (tooltip.js keeps handling
    // desktop hover untouched; CSS gates which path is visible). A hold that
    // reached the tooltip swallows the release's click so reading a button's
    // tooltip never triggers the button.
    let ttTimer = 0;
    let ttFrom = null;
    let ttShownAt = 0;
    const ttHide = () => {
      if (ttTimer) { clearTimeout(ttTimer); ttTimer = 0; }
      if (els.tooltip.classList.contains('tt-touch')) {
        els.tooltip.classList.remove('tt-touch');
        els.tooltip.classList.add('hidden');
      }
    };
    document.addEventListener('touchstart', (e) => {
      ttHide();
      ttShownAt = 0;
      const t = e.target instanceof Element ? e.target.closest('[data-tt]') : null;
      if (!t || !t.dataset.tt || e.touches.length !== 1) { ttFrom = null; return; }
      ttFrom = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      ttTimer = setTimeout(() => {
        ttTimer = 0;
        if (!document.contains(t) || !t.dataset.tt) return;
        els.tooltip.textContent = t.dataset.tt;
        els.tooltip.classList.add('tt-touch');
        els.tooltip.classList.remove('hidden');
        ttShownAt = Date.now();
        const r = els.tooltip.getBoundingClientRect();
        const x = Math.max(6, Math.min(ttFrom.x - r.width / 2, window.innerWidth - r.width - 6));
        let y = ttFrom.y - r.height - 18; // above the finger…
        if (y < 6) y = Math.min(ttFrom.y + 24, window.innerHeight - r.height - 6); // …or below it
        els.tooltip.style.left = x + 'px';
        els.tooltip.style.top = y + 'px';
      }, 350);
    }, { passive: true, capture: true });
    document.addEventListener('touchmove', (e) => {
      if (!ttFrom || !e.touches.length) return;
      const c = e.touches[0];
      if (Math.hypot(c.clientX - ttFrom.x, c.clientY - ttFrom.y) > 10) ttHide();
    }, { passive: true, capture: true });
    document.addEventListener('touchend', ttHide, { passive: true, capture: true });
    document.addEventListener('touchcancel', ttHide, { passive: true, capture: true });
    document.addEventListener('click', (e) => {
      if (ttShownAt && Date.now() - ttShownAt < 700) {
        e.stopPropagation();
        e.preventDefault();
      }
      ttShownAt = 0;
    }, true);
  }

  // ------------------------------------------------------------------ API --
  function showStartScreen(bookmarks, onPick, continueInfo) {
    els.start.classList.remove('hidden');
    buildStartScreen(els.start, DEFINES, bookmarks, (bookmark, tag) => {
      els.start.classList.add('hidden');
      onPick(bookmark, tag);
    }, continueInfo ? {
      label: continueInfo.label,
      onContinue: () => { els.start.classList.add('hidden'); continueInfo.onContinue(); },
    } : null);
  }

  function bindGame(ctx, actions) {
    if (state.bound) { warnOnce('bindGame', 'bindGame called twice; ignoring'); return; }
    state.bound = true;
    state.ctx = ctx;
    state.actions = actions;

    topbar.bind(ctx, actions);
    panel.bind(ctx, actions);
    outliner.bind(ctx, actions);
    eventModal.bind(ctx, actions);
    pillBtn.classList.remove('hidden');
    updatePill();

    const safe = (key, fn) => (p) => { try { fn(p); } catch (e) { warnOnce(key, e); } };

    bus.on('day', safe('day-refresh', () => {
      const g = ctx.game;
      if (Array.isArray(g.ui.selectedArmies) && g.ui.selectedArmies.length) {
        const alive = g.ui.selectedArmies.filter((id) => g.armies && g.armies[id]);
        if (alive.length !== g.ui.selectedArmies.length) {
          g.ui.selectedArmies = alive;
          if (g.ui.selectedArmy != null && alive.indexOf(g.ui.selectedArmy) < 0) {
            g.ui.selectedArmy = alive.length ? alive[alive.length - 1] : null;
            bus.emit('selectArmy', g.ui.selectedArmy);
          }
        }
      } else if (g.ui.selectedArmy != null && (!g.armies || !g.armies[g.ui.selectedArmy])) {
        setSelectedArmy(null); // selected army died / merged away
      }
      topbar.refresh();
      outliner.refresh();
      panel.refresh();
      updatePill();
    }));
    bus.on('pause', safe('pause', () => topbar.refresh()));
    bus.on('speed', safe('speed', () => topbar.refresh()));
    bus.on('provinceOwner', safe('provOwner', () => { panel.refresh(); outliner.refresh(); }));
    bus.on('provinceController', safe('provCtrl', () => { panel.refresh(); outliner.refresh(); }));
    bus.on('siegeStart', safe('siegeStart', () => { panel.refresh(); outliner.refresh(); }));
    bus.on('siegeEnd', safe('siegeEnd', () => { panel.refresh(); outliner.refresh(); }));
    bus.on('war', safe('war', () => { outliner.refresh(true); topbar.refresh(); }));
    bus.on('provinceDev', safe('provDev', () => { panel.refresh(); topbar.refresh(); }));

    bus.on('mapclick', safe('mapclick', onMapClick));
    bus.on('maprightclick', safe('maprightclick', onMapRightClick));
    bus.on('event', safe('event', (p) => eventModal.onBusEvent(p)));
    bus.on('notify', safe('notify', (p) => toasts.push(p || {})));
    bus.on('gameover', safe('gameover', (p) => { gameover.show(p || {}); topbar.refresh(); }));
  }

  return { showStartScreen, bindGame };
}
