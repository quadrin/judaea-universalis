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

  initTooltip(els.tooltip);
  buildMapmodeBar(els.mapmodeBar, bus);

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
    onArmyClick(id) {
      const g = state.ctx && state.ctx.game;
      if (!g || !g.armies || !g.armies[id]) return;
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
    bus.emit('selectArmy', g.ui.selectedArmy);
    outliner.refresh(true);
  }

  function onMapClick(payload) {
    const g = state.ctx.game;
    const { provId, armyId } = payload || {};
    if (armyId != null) {
      const a = g.armies && g.armies[armyId];
      if (a && a.tag === g.playerTag) {
        // Own army: select it (province panel closes).
        setSelectedArmy(armyId);
        setSelectedProv(0);
        return;
      }
      // Foreign army: fall through to the province underneath.
    }
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
    if (g.ui.selectedArmy != null && provId > 0 && state.actions) {
      state.actions.moveArmy(g.ui.selectedArmy, provId);
    }
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
      if (g.ui.selectedArmy != null) setSelectedArmy(null);
      if (g.ui.selectedProv) setSelectedProv(0);
    }
  });

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

    const safe = (key, fn) => (p) => { try { fn(p); } catch (e) { warnOnce(key, e); } };

    bus.on('day', safe('day-refresh', () => {
      const g = ctx.game;
      if (g.ui.selectedArmy != null && (!g.armies || !g.armies[g.ui.selectedArmy])) {
        setSelectedArmy(null); // selected army died / merged away
      }
      topbar.refresh();
      outliner.refresh();
      panel.refresh();
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
