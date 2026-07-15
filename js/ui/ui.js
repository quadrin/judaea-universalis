// js/ui/ui.js — UI package entry (SPEC §8). Single pinned export: initUI.
// initUI(staticCtx) -> { showStartScreen(bookmark, onPick), bindGame(ctx, actions) }
import { esc, signed, fmtMen, warnOnce } from './format.js';
import { initTooltip } from './tooltip.js';
import { createToasts } from './toasts.js';
import { buildStartScreen } from './startscreen.js';
import { createTopbar } from './topbar.js';
import { createProvincePanel } from './province_panel.js';
import { createNationPanel } from './nation_panel.js';
import { createOutliner } from './outliner.js';
import { createEventModal, createGameoverModal } from './modals.js';
import { icon, flagChip } from './icons.js';
import { genName } from '../data/tech.js';

const MAPMODES = [
  { id: 'political', ico: icon('temple'), name: 'Political' },
  { id: 'diplomatic', ico: icon('dove'), name: 'Diplomatic — friends, foes, truces and claims, seen from your throne' },
  { id: 'trade', ico: icon('coins'), name: 'Trade — the routes, their stops, and the chokepoints that pay double' },
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
    nation: $('nation-panel'),
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
  function toggleNationPanel() {
    // Open on a foreign court? The flag brings you home instead of closing.
    if (nationPanel.isOpen() && !nationPanel.viewing()) { nationPanel.close(); return; }
    setSelectedProv(0); // the two left panels share the same berth
    nationPanel.open();
  }
  const topbar = createTopbar(els.topbar, {
    DEFINES,
    onFlagClick: () => toggleNationPanel(),
    onLedgerClick: () => toggleLedger(),
    onChronicleClick: () => toggleChronicle(),
  });
  const panel = createProvincePanel(els.panel, { DEFINES, onClose: () => setSelectedProv(0) });
  const nationPanel = createNationPanel(els.nation, {
    DEFINES,
    onClose: () => nationPanel.close(),
    onPeaceClick(warId) { openPeaceDialog(warId); },
    onWarClick(warId) { openWarOverview(warId); },
  });
  const outliner = createOutliner(els.outliner, {
    onPeaceClick(warId) { openPeaceDialog(warId); },
    onWarClick(warId) { openWarOverview(warId); },
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
    onBattleClick(provId) {
      const g = state.ctx && state.ctx.game;
      if (!g) return;
      const p = g.provinces[provId];
      if (p && camera) camera.centerOn(p.x, p.y);
      closeOutlinerDrawer();
      openBattleWindow(provId);
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
  // EU4-style deal builder: tick occupied provinces, step an indemnity up and
  // down, toggle humiliation; the running total is priced against our war
  // score live, and the envoys go out only with an offer the enemy will take.
  let peaceEl = null;
  // While the table is open, map clicks negotiate: this bridge (set by
  // openPeaceDialog, cleared on close) toggles a demandable province in and
  // out of the deal. Everything else on the map stays inert — the envoys
  // have the floor.
  let peaceProvToggle = null;
  function setPeaceHighlight(ids, selected) {
    const g = state.ctx && state.ctx.game;
    if (!g || !g.ui) return;
    g.ui.peaceHighlight = ids || [];
    g.ui.peaceSelected = selected || []; // the chosen demands burn solid gold
    bus.emit('peaceHighlight', {}); // main.js: recompute mapmode colors
  }
  function closePeaceDialog() {
    if (peaceEl) peaceEl.classList.add('hidden');
    peaceProvToggle = null;
    setPeaceHighlight([], []);
  }
  function peaceDialogOpen() { return !!peaceEl && !peaceEl.classList.contains('hidden'); }
  function openPeaceDialog(warId) {
    const g = state.ctx && state.ctx.game;
    const actions = state.actions;
    if (!g || !actions || typeof actions.getPeaceInfo !== 'function') return;
    const info = actions.getPeaceInfo(warId);
    if (!info) return; // even scripted wars hear envoys now (SPEC §31)
    if (!peaceEl) {
      peaceEl = document.createElement('div');
      peaceEl.id = 'peace-modal';
      document.getElementById('ui-root').appendChild(peaceEl);
    }
    const deal = { provinces: [], gold: 0, humiliate: false, subjugate: false, reparations: false };
    const wsCls = info.myWs > 0 ? 'pos' : info.myWs < 0 ? 'neg' : '';
    const discountTxt = { claim: ' · our claim (30% off)', faith: ' · our faith (20% off)' };
    const provRows = info.provinces.map((p) =>
      `<label class="peace-prov" data-center="${p.id}" data-tt="${esc(p.name)} — ${p.dev} development${discountTxt[p.discount] || ''}\nDemanding it costs ${p.cost} war score">
        <input type="checkbox" data-prov="${p.id}">
        <span class="peace-prov-name">${esc(p.name)} <span class="peace-dim">${p.dev} dev${p.discount ? ' · ' + (p.discount === 'claim' ? 'claimed' : 'our faith') : ''}</span></span>
        <span class="peace-prov-cost">${p.cost}</span>
      </label>`).join('');
    peaceEl.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card">
        <h2 class="peace-title">Terms for ${esc(info.warName || 'the war')}</h2>
        <div class="peace-hint">The map is yours while you negotiate: click a gold province to demand it, click again to strike it from the terms.</div>
        <div class="peace-ws">War score against ${esc(info.enemyName || 'the enemy')}: <b class="${wsCls}">${signed(info.myWs)}%</b></div>
        ${info.envoyMonthsLeft > 0 ? `<div class="peace-envoy">${icon('alert', 'icon-sm')} The enemy will not receive our envoys for ${info.envoyMonthsLeft} more month${info.envoyMonthsLeft === 1 ? '' : 's'}.</div>` : ''}
        <div class="peace-sec">Demand provinces</div>
        ${info.provinces.length ? `<div class="peace-provs">${provRows}</div>`
    : '<div class="peace-dim peace-none">Occupy enemy land to put it on the table.</div>'}
        <div class="peace-sec">Demand payment <span class="peace-dim">(${info.goldCostPer100} war score per 100 talents)</span></div>
        <div class="peace-gold">
          <button class="btn peace-step" data-gold="-1" aria-label="Less gold">−</button>
          <span class="peace-gold-v" data-ref="goldV">0</span>
          <button class="btn peace-step" data-gold="1" aria-label="More gold">+</button>
          <span class="peace-dim">of ${info.maxGold} talents</span>
        </div>
        <label class="peace-prov" data-tt="Force a public submission: +10 legitimacy and +25 of every monarch point for us; they lose legitimacy and stability.\nCosts ${info.humiliateCost} war score">
          <input type="checkbox" data-ref="humiliate">
          <span class="peace-prov-name">Humiliate them before the nations</span>
          <span class="peace-prov-cost">${info.humiliateCost}</span>
        </label>
        <label class="peace-prov" data-tt="War reparations: they pay ${info.reparationsAmount || 8} talents a month for ${Math.round((info.reparationsMonths || 24) / 12)} years — a defaulting debtor must be deep in debt to escape it.\nCosts ${info.reparationsCost || 15} war score">
          <input type="checkbox" data-ref="reparations">
          <span class="peace-prov-name">Demand war reparations</span>
          <span class="peace-prov-cost">${info.reparationsCost || 15}</span>
        </label>
        <label class="peace-prov${info.canSubjugate ? '' : ' peace-off'}" data-tt="${info.canSubjugate
    ? esc('Make ' + (info.enemyName || 'them') + ' a client kingdom: they keep their lands but pay us 15% of their income and follow us to war.\nReplaces province demands. Costs ' + info.subjugateCost + ' war score')
    : esc(info.whyNotSubjugate || 'They cannot be subjugated.')}">
          <input type="checkbox" data-ref="subjugate" ${info.canSubjugate ? '' : 'disabled'}>
          <span class="peace-prov-name">Make them a client kingdom</span>
          <span class="peace-prov-cost">${info.subjugateCost}</span>
        </label>
        <div class="peace-total" data-ref="total"></div>
        <div class="peace-verdict" data-ref="verdict"></div>
        <button class="btn peace-send" data-ref="send"></button>
        <button class="btn peace-cancel">Recall the envoys</button>
      </div>`;
    peaceEl.classList.remove('hidden');

    const goldV = peaceEl.querySelector('[data-ref="goldV"]');
    const totalEl = peaceEl.querySelector('[data-ref="total"]');
    const verdictEl = peaceEl.querySelector('[data-ref="verdict"]');
    const sendBtn = peaceEl.querySelector('[data-ref="send"]');
    const humiliateBox = peaceEl.querySelector('[data-ref="humiliate"]');
    const subjugateBox = peaceEl.querySelector('[data-ref="subjugate"]');
    const reparationsBox = peaceEl.querySelector('[data-ref="reparations"]');

    function update() {
      let ev = null;
      try { ev = actions.evaluatePeace(warId, deal); } catch (e) { warnOnce('evaluatePeace', e); }
      if (!ev) { closePeaceDialog(); return; }
      goldV.textContent = String(deal.gold);
      // Subjugation replaces province demands: a client keeps its lands.
      peaceEl.querySelectorAll('[data-prov]').forEach((box) => {
        box.disabled = deal.subjugate;
        if (deal.subjugate) box.checked = false;
        box.closest('.peace-prov').classList.toggle('peace-off', deal.subjugate);
      });
      if (deal.subjugate) deal.provinces = [];
      const white = !deal.provinces.length && deal.gold <= 0 && !deal.humiliate && !deal.subjugate && !deal.reparations;
      totalEl.textContent = white
        ? 'A white peace: every occupation reverts, nothing changes hands.'
        : `Demands cost ${ev.cost} war score — we hold ${Math.max(0, info.myWs)}.`;
      verdictEl.textContent = ev.acceptable ? 'They will accept these terms.' : ev.reason;
      verdictEl.classList.toggle('pos', !!ev.acceptable);
      verdictEl.classList.toggle('neg', !ev.acceptable);
      sendBtn.textContent = white ? 'Offer white peace' : 'Send the terms';
      sendBtn.classList.toggle('disabled', !ev.acceptable || info.envoyMonthsLeft > 0);
      // The chosen demands burn solid gold on the map; the rest of the table
      // keeps its pulse.
      setPeaceHighlight(info.provinces.map((p) => p.id), deal.provinces.slice());
    }

    peaceEl.querySelectorAll('[data-prov]').forEach((box) => {
      box.addEventListener('change', () => {
        const id = Number(box.dataset.prov);
        const at = deal.provinces.indexOf(id);
        if (box.checked && at < 0) deal.provinces.push(id);
        else if (!box.checked && at >= 0) deal.provinces.splice(at, 1);
        update();
      });
    });
    peaceEl.querySelectorAll('[data-gold]').forEach((b) => {
      b.addEventListener('click', () => {
        deal.gold = Math.max(0, Math.min(info.maxGold, deal.gold + Number(b.dataset.gold) * info.goldStep));
        update();
      });
    });
    humiliateBox.addEventListener('change', () => { deal.humiliate = humiliateBox.checked; update(); });
    reparationsBox.addEventListener('change', () => { deal.reparations = reparationsBox.checked; update(); });
    if (subjugateBox) {
      subjugateBox.addEventListener('change', () => { deal.subjugate = subjugateBox.checked; update(); });
    }
    sendBtn.addEventListener('click', () => {
      if (sendBtn.classList.contains('disabled')) return;
      closePeaceDialog();
      try { actions.offerPeaceDeal(warId, deal); } catch (e) { warnOnce('offerPeaceDeal', e); }
      outliner.refresh(true);
      nationPanel.refresh();
      topbar.refresh();
    });
    // Clicking a row also flies the camera to the province (it pulses gold on
    // the map for the whole negotiation).
    peaceEl.querySelectorAll('[data-center]').forEach((row) => {
      row.addEventListener('click', () => {
        const g2 = state.ctx && state.ctx.game;
        const p = g2 && g2.provinces[Number(row.dataset.center)];
        if (p && camera) camera.centerOn(p.x, p.y);
      });
    });
    peaceEl.querySelector('.peace-cancel').addEventListener('click', closePeaceDialog);
    peaceEl.querySelector('.modal-scrim').addEventListener('click', closePeaceDialog);
    // The map negotiates too: clicking a demandable province toggles it in
    // and out of the deal (the checkbox follows); a client keeps its lands,
    // so subjugation deals ignore the map.
    const demandable = new Set(info.provinces.map((p) => p.id));
    peaceProvToggle = (pid) => {
      if (deal.subjugate || !demandable.has(pid)) return;
      const at = deal.provinces.indexOf(pid);
      if (at >= 0) deal.provinces.splice(at, 1);
      else deal.provinces.push(pid);
      const box = peaceEl.querySelector('[data-prov="' + pid + '"]');
      if (box) box.checked = at < 0;
      update();
    };
    setPeaceHighlight(info.provinces.map((p) => p.id), deal.provinces.slice());
    update();
  }

  // ---------------------------------------------------------- war overview --
  // The anatomy of a war: sides, the score taken apart (battles / occupation /
  // events), who holds what, and the road to the peace table.
  let warEl = null;
  function closeWarOverview() { if (warEl) warEl.classList.add('hidden'); }
  function warOverviewOpen() { return !!warEl && !warEl.classList.contains('hidden'); }
  function openWarOverview(warId) {
    const actions = state.actions;
    if (!actions || typeof actions.getWarInfo !== 'function') return;
    const info = actions.getWarInfo(warId);
    if (!info) return;
    if (!warEl) {
      warEl = document.createElement('div');
      warEl.id = 'war-modal';
      document.getElementById('ui-root').appendChild(warEl);
    }
    const sideHtml = (rows) => rows.map((r) =>
      `<span class="wo-tag${r.alive ? '' : ' wo-dead'}" data-tt="${esc(r.name)}${r.alive ? '' : ' (defeated)'}">${flagChipHtml(r.tag, true)} ${esc(r.name)}</span>`).join('');
    const holdHtml = (list, none) => list.length
      ? list.slice(0, 8).map((p) => esc(p.name)).join(', ') + (list.length > 8 ? ` +${list.length - 8} more` : '')
      : `<span class="peace-dim">${none}</span>`;
    const bd = info.breakdown;
    const bdRow = (label, v, tt) =>
      `<div class="pp-row" data-tt="${esc(tt)}"><span class="pp-k">${esc(label)}</span><span class="pp-v ${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}">${signed(v)}</span></div>`;
    const wsCls = info.myWs > 0 ? 'pos' : info.myWs < 0 ? 'neg' : '';
    const barPct = Math.round(((info.myWs + 100) / 200) * 100);
    warEl.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card wo-card">
        <h2 class="peace-title">${esc(info.warName || 'War')}</h2>
        <div class="peace-dim wo-meta">${info.months} month${info.months === 1 ? '' : 's'} of war${info.cb ? ' · casus belli: ' + esc(info.cb === 'claim' ? 'a pressed claim' : info.cb === 'holy' ? 'a holy war' : info.cb) : ''}${info.noNegotiation ? ' · a fight to the death — but envoys may still be sent' : ''}</div>
        <div class="wo-sides">
          <div class="wo-side">${sideHtml(info.mySide)}</div>
          <div class="wo-vs">against</div>
          <div class="wo-side">${sideHtml(info.theirSide)}</div>
        </div>
        <div class="peace-sec">War score: <b class="${wsCls}">${signed(info.myWs)}%</b></div>
        <div class="bar wo-bar"><div class="bar-fill" style="width:${barPct}%"></div></div>
        ${bdRow('From battles', bd.battles, 'Field victories, net of theirs (each side caps at 40)')}
        ${bdRow('From occupation', bd.occupation, 'Enemy development under our control, net of theirs (each side caps at 60)')}
        ${bd.events ? bdRow('From events', bd.events, 'Scripted swings of history') : ''}
        <div class="peace-sec">We hold</div>
        <div class="wo-hold">${holdHtml(info.weHold, 'None of their land')}</div>
        <div class="peace-sec">They hold</div>
        <div class="wo-hold">${holdHtml(info.theyHold, 'None of ours')}</div>
        ${info.envoyMonthsLeft > 0 ? `<div class="peace-envoy">${icon('alert', 'icon-sm')} The enemy will not receive our envoys for ${info.envoyMonthsLeft} more month${info.envoyMonthsLeft === 1 ? '' : 's'}.</div>` : ''}
        <button class="btn peace-send" data-ref="negotiate">${icon('dove', 'icon-sm')} Negotiate peace</button>
        <button class="btn peace-cancel">Close</button>
      </div>`;
    warEl.classList.remove('hidden');
    const neg = warEl.querySelector('[data-ref="negotiate"]');
    if (neg) neg.addEventListener('click', () => { closeWarOverview(); openPeaceDialog(warId); });
    warEl.querySelector('.peace-cancel').addEventListener('click', closeWarOverview);
    warEl.querySelector('.modal-scrim').addEventListener('click', closeWarOverview);
  }
  function flagChipHtml(tag, link) {
    try { return flagChip(tag, DEFINES, 15, !!link); } catch (e) { return ''; }
  }

  // Any linked flag chip, anywhere (ledger, war overview, battle window,
  // province panel, outliner, the realm panel's own diplomacy rows), opens
  // that nation's court. Capture phase so the chip wins over whatever row
  // it sits in (a war row, a sortable header); modals close so the panel
  // isn't buried under a scrim.
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const chip = e.target.closest('[data-open-tag]');
    if (!chip) return;
    const g = state.ctx && state.ctx.game;
    const tag = chip.dataset.openTag;
    if (!g || !g.tags || !g.tags[tag]) return;
    e.preventDefault();
    e.stopPropagation();
    closeLedger();
    closeWarOverview();
    closeBattleWindow();
    setSelectedProv(0); // the two left panels share the same berth
    nationPanel.open(tag);
  }, true);

  // ---------------------------------------------------------- battle window --
  // A live view of one field battle: the day's dice, both hosts army by army,
  // morale draining, and the running butcher's bill. Re-rendered each game day.
  let battleEl = null;
  let battleProvOpen = 0;
  function closeBattleWindow() {
    battleProvOpen = 0;
    if (battleEl) battleEl.classList.add('hidden');
  }
  function battleWindowOpen() { return !!battleEl && !battleEl.classList.contains('hidden'); }
  function openBattleWindow(provId) {
    const actions = state.actions;
    if (!actions || typeof actions.getBattleInfo !== 'function') return;
    let info = null;
    try { info = actions.getBattleInfo(provId); } catch (e) { warnOnce('getBattleInfo', e); }
    if (!info) return;
    battleProvOpen = provId;
    if (!battleEl) {
      battleEl = document.createElement('div');
      battleEl.id = 'battle-modal';
      document.getElementById('ui-root').appendChild(battleEl);
    }
    const moraleBar = (m, mx) => {
      const pct = Math.round(Math.max(0, Math.min(100, (m / Math.max(0.01, mx)) * 100)));
      return `<span class="morale bw-morale"><span class="morale-fill" style="width:${pct}%"></span></span>`;
    };
    const armyRow = (a) => {
      // Regiments speak their pattern (SPEC §29): "8 Rifle Brigades", not
      // "8 infantry" — each army remembers what it was raised as.
      const gen = a.general ? `\nGeneral: ${a.general.name} (${a.general.fire}/${a.general.shock}/${a.general.maneuver})` : '';
      const comp = `${a.inf} × ${genName(a.gen || 0, 'inf')}, ${a.cav} × ${genName(a.gen || 0, 'cav')}`;
      return `
      <div class="bw-army" data-tt="${esc(`${a.name} — ${comp}\nMorale: ${a.morale.toFixed(1)} / ${a.maxMorale.toFixed(1)}${gen}`)}">
        <span class="bw-aname">${a.general ? icon('helmet', 'icon-row') + ' ' : ''}${flagChipHtml(a.tag, true)} ${esc(a.name)}</span>
        <span class="bw-men">${fmtMen(a.men)}</span>
        ${moraleBar(a.morale, a.maxMorale)}
      </div>`;
    };
    const sideBlock = (s, key) => {
      const roll = info.last ? (key === 'atk' ? info.last.rollA : info.last.rollD) : null;
      const doct = (s.doctrines || []).map((d) => `${d.name} — ${d.desc}`).join('\n');
      const dieTT = (key === 'def'
        ? 'The day’s battle die: d10 + the best general’s pips + terrain + doctrine'
        : 'The day’s battle die: d10 + the best general’s pips + doctrine')
        + (doct ? '\n' + doct : '')
        + (s.air ? '\nAir cover — a wing in range adds +1 in the fire phase.' : '');
      return `
      <div class="bw-side${s.isMine ? ' bw-mine' : ''}">
        <div class="bw-side-head">${key === 'atk' ? 'Attackers' : 'Defenders'}${s.air ? ' ' + icon('plane', 'icon-sm') : ''}${s.isMine ? ' <span class="bw-us">— our side</span>' : ''}</div>
        <div class="bw-die-row">
          <span class="bw-die${roll == null ? ' bw-die-none' : ''}" data-tt="${esc(roll == null ? 'No round fought yet' : dieTT)}">${roll == null ? '—' : roll}</span>
          <span class="bw-total">${fmtMen(s.men)} men · morale ${s.morale.toFixed(1)}</span>
        </div>
        <div class="bw-armies">${s.armies.map(armyRow).join('')}</div>
        <div class="bw-cas" data-tt="Casualties suffered in this battle so far">Fallen: ${fmtMen(s.casualties)}</div>
      </div>`;
    };
    const phaseHtml = info.phase === 'fire'
      ? icon('flame', 'icon-sm') + ' fire phase'
      : icon('swords', 'icon-sm') + ' shock phase';
    battleEl.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card bw-card">
        <h2 class="peace-title">Battle of ${esc(info.provName)}</h2>
        <div class="peace-dim bw-meta">Day ${info.day} · ${phaseHtml} · ${esc(info.terrain)}${info.defBonus ? ` <span data-tt="Terrain adds +${info.defBonus} to the defender’s die">(+${info.defBonus} def)</span>` : ''}</div>
        <div class="bw-sides">
          ${sideBlock(info.atk, 'atk')}
          ${sideBlock(info.def, 'def')}
        </div>
        ${info.playerSide ? `<button class="btn bw-withdraw" data-ref="withdraw" data-tt="Sound the withdrawal: our whole side quits the field shattered — broken morale, a forced march to friendly ground — and the enemy keeps the field.">${icon('retreat', 'icon-sm')} Withdraw</button>` : ''}
        <button class="btn peace-cancel">Close</button>
      </div>`;
    battleEl.classList.remove('hidden');
    const wd = battleEl.querySelector('[data-ref="withdraw"]');
    if (wd) {
      wd.addEventListener('click', () => {
        if (state.actions && typeof state.actions.withdrawBattle === 'function') {
          try { state.actions.withdrawBattle(provId); } catch (e) { warnOnce('withdrawBattle', e); }
        }
        closeBattleWindow();
      });
    }
    battleEl.querySelector('.peace-cancel').addEventListener('click', closeBattleWindow);
    battleEl.querySelector('.modal-scrim').addEventListener('click', closeBattleWindow);
  }
  function refreshBattleWindow() {
    if (!battleWindowOpen()) return;
    const g = state.ctx && state.ctx.game;
    const still = g && (g.battles || []).some((b) => b && b.prov === battleProvOpen);
    if (still) openBattleWindow(battleProvOpen);
    else closeBattleWindow(); // the toast announces the outcome
  }

  // ------------------------------------------------------------------ ledger --
  let ledgerEl = null;
  let ledgerSort = 'dev';
  function closeLedger() { if (ledgerEl) ledgerEl.classList.add('hidden'); }
  function ledgerOpen() { return !!ledgerEl && !ledgerEl.classList.contains('hidden'); }
  function toggleLedger() { if (ledgerOpen()) closeLedger(); else openLedger(); }
  function openLedger() {
    const actions = state.actions;
    if (!actions || typeof actions.getLedger !== 'function') return;
    let rows = [];
    try { rows = actions.getLedger() || []; } catch (e) { warnOnce('getLedger', e); }
    if (!ledgerEl) {
      ledgerEl = document.createElement('div');
      ledgerEl.id = 'ledger-modal';
      document.getElementById('ui-root').appendChild(ledgerEl);
    }
    const cols = [
      { key: 'name', label: 'Nation' },
      { key: 'provs', label: 'Provs' },
      { key: 'dev', label: 'Dev' },
      { key: 'income', label: 'Income' },
      { key: 'treasury', label: 'Treasury' },
      { key: 'troops', label: 'Troops' },
      { key: 'manpower', label: 'Manpower' },
      { key: 'tech', label: 'Tech' },
      { key: 'warExhaustion', label: 'War Exh.' },
    ];
    rows.sort((a, b) => (ledgerSort === 'name' || typeof a[ledgerSort] === 'string')
      ? String(a[ledgerSort]).localeCompare(String(b[ledgerSort]))
      : (b[ledgerSort] || 0) - (a[ledgerSort] || 0));
    const fmtCell = (r, key) => key === 'name'
      ? `${flagChipHtml(r.tag, true)} ${esc(r.name)}${r.overlord ? ' <span class="peace-dim">(client)</span>' : ''}`
      : key === 'troops' || key === 'manpower' ? fmtMen(r[key])
        : String(r[key]);
    ledgerEl.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card ledger-card">
        <h2 class="peace-title">The Ledger of Nations</h2>
        <div class="ledger-wrap"><table class="ledger">
          <thead><tr>${cols.map((c) =>
    `<th class="${c.key === ledgerSort ? 'on' : ''}" data-sort="${c.key}" data-tt="Sort by ${esc(c.label)}">${esc(c.label)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((r) =>
    `<tr class="${r.isPlayer ? 'me' : ''}">${cols.map((c) => `<td>${fmtCell(r, c.key)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
        <button class="btn peace-cancel">Close</button>
      </div>`;
    ledgerEl.classList.remove('hidden');
    ledgerEl.querySelector('thead').addEventListener('click', (e) => {
      const th = e.target instanceof Element ? e.target.closest('[data-sort]') : null;
      if (!th) return;
      ledgerSort = th.dataset.sort;
      openLedger(); // re-render with the new sort
    });
    ledgerEl.querySelector('.peace-cancel').addEventListener('click', closeLedger);
    ledgerEl.querySelector('.modal-scrim').addEventListener('click', closeLedger);
  }

  // --------------------------------------------------------------- chronicle --
  // The world's recorded history (SPEC §21): wars, peaces, crowns, coalitions
  // and the fall of nations, newest first under year headings.
  let chronEl = null;
  function closeChronicle() { if (chronEl) chronEl.classList.add('hidden'); }
  function chronicleOpen() { return !!chronEl && !chronEl.classList.contains('hidden'); }
  function toggleChronicle() { if (chronicleOpen()) closeChronicle(); else openChronicle(); }
  const CHRON_ICONS = {
    era: 'lamp', war: 'swords', peace: 'dove', ruler: 'laurel',
    coalition: 'alert', fall: 'shieldCrack', verdict: 'scales',
  };
  function openChronicle() {
    const actions = state.actions;
    if (!actions || typeof actions.getChronicle !== 'function') return;
    let entries = [];
    try { entries = actions.getChronicle() || []; } catch (e) { warnOnce('getChronicle', e); }
    if (!chronEl) {
      chronEl = document.createElement('div');
      chronEl.id = 'chronicle-modal';
      document.getElementById('ui-root').appendChild(chronEl);
    }
    const months = (state.ctx && state.ctx.DEFINES && state.ctx.DEFINES.MONTH_NAMES) || [];
    const yr = (y) => (y < 0 ? (-y) + ' BCE' : y + ' CE');
    let rows = '';
    let lastY = null;
    for (let i = entries.length - 1; i >= 0; i--) {
      const en = entries[i];
      if (!en) continue;
      if (en.y !== lastY) { lastY = en.y; rows += `<div class="chron-year">${esc(yr(en.y))}</div>`; }
      rows += `<div class="chron-row">`
        + `<span class="chron-ico">${icon(CHRON_ICONS[en.kind] || 'scroll')}</span>`
        + `<span class="chron-m">${esc(String(months[((en.m | 0) - 1 + 12) % 12] || ''))}</span>`
        + `<span class="chron-text">${esc(en.text)}</span></div>`;
    }
    if (!rows) rows = '<div class="chron-empty">The page is still blank — history is waiting to be made.</div>';
    chronEl.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card ledger-card chron-card">
        <h2 class="peace-title">The Chronicle</h2>
        <div class="chron-wrap">${rows}</div>
        <button class="btn peace-cancel">Close</button>
      </div>`;
    chronEl.classList.remove('hidden');
    chronEl.querySelector('.peace-cancel').addEventListener('click', closeChronicle);
    chronEl.querySelector('.modal-scrim').addEventListener('click', closeChronicle);
  }

  // ------------------------------------------------------------ selection --
  function setSelectedProv(id) {
    const g = state.ctx && state.ctx.game;
    if (!g) return;
    id = id | 0;
    g.ui.selectedProv = id;
    bus.emit('select', id);
    if (id > 0) { nationPanel.close(); panel.open(id); }
    else panel.close();
  }

  function setSelectedArmy(id) {
    const g = state.ctx && state.ctx.game;
    if (!g) return;
    if (id != null) g.ui.selectedFleet = null; // one helm at a time
    g.ui.selectedArmy = id == null ? null : id;
    g.ui.selectedArmies = id == null ? [] : [id];
    bus.emit('selectArmy', g.ui.selectedArmy);
    outliner.refresh(true);
  }

  // Banner click on a stack: every army under the standard is selected at once,
  // so one click grabs the whole host and one right-click marches it together.
  function selectArmyStack(ids) {
    const g = state.ctx && state.ctx.game;
    if (!g || !ids.length) return;
    g.ui.selectedArmies = ids.slice();
    g.ui.selectedArmy = ids[0];
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
    // The peace table is open: the map negotiates. Demandable provinces
    // toggle in and out of the deal; every other click stays inert — the
    // envoys have the floor until they are recalled.
    if (peaceDialogOpen() && typeof peaceProvToggle === 'function') {
      if (provId > 0) peaceProvToggle(provId);
      return;
    }
    // Group mode behaves exactly like a held shift key (mobile contract).
    const grouping = shift || groupMode;
    if (armyId != null) {
      const a = g.armies && g.armies[armyId];
      if (a && a.tag === g.playerTag) {
        const ids = (Array.isArray(payload.armyIds) ? payload.armyIds : [armyId])
          .filter((id) => g.armies[id] && g.armies[id].tag === g.playerTag);
        if (grouping) for (const id of ids) toggleArmyInGroup(id);
        else if (ids.length > 1) selectArmyStack(ids);
        else setSelectedArmy(armyId);
        setSelectedProv(0);
        return;
      }
      // Foreign army: fall through to the province underneath.
    }
    if (grouping) return; // shift/group taps on terrain don't drop a built-up group
    if (payload && payload.battleProv) {
      setSelectedArmy(null);
      openBattleWindow(payload.battleProv);
      return;
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
    if (provId <= 0 || !state.actions) return;
    if (g.ui.selectedFleet != null && typeof state.actions.moveFleet === 'function') {
      state.actions.moveFleet(g.ui.selectedFleet, provId);
      outliner.refresh(true);
      return;
    }
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
      if (helpOpen()) { closeHelp(); return; }
      if (battleWindowOpen()) { closeBattleWindow(); return; }
      if (peaceDialogOpen()) { closePeaceDialog(); return; }
      if (warOverviewOpen()) { closeWarOverview(); return; }
      if (ledgerOpen()) { closeLedger(); return; }
      if (chronicleOpen()) { closeChronicle(); return; }
      if (nationPanel.isOpen()) { nationPanel.close(); return; }
      const g = state.ctx.game;
      if (g.ui.selectedArmy != null || (g.ui.selectedArmies && g.ui.selectedArmies.length)) setSelectedArmy(null);
      if (g.ui.selectedProv) setSelectedProv(0);
    } else if (e.key === 'n' || e.key === 'N') {
      toggleNationPanel();
    } else if (e.key === 'l' || e.key === 'L') {
      toggleLedger();
    } else if (e.key === 'c' || e.key === 'C') {
      toggleChronicle();
    } else if (e.key === 'h' || e.key === 'H' || e.key === '?') {
      toggleHelp();
    }
  });

  // ------------------------------------------------------------- help (H) --
  // The one-page primer (SPEC §33): hotkeys and how the pieces fit together.
  let helpEl = null;
  function helpOpen() { return !!helpEl && !helpEl.classList.contains('hidden'); }
  function closeHelp() { if (helpEl) helpEl.classList.add('hidden'); }
  function toggleHelp() {
    if (helpOpen()) { closeHelp(); return; }
    if (!helpEl) {
      helpEl = document.createElement('div');
      helpEl.id = 'help-modal';
      helpEl.innerHTML = `
        <div class="modal-scrim"></div>
        <div class="ev-card peace-card ledger-card">
          <h2 class="peace-title">How to Play</h2>
          <div class="help-cols">
            <div>
              <div class="peace-sec">Keys</div>
              <div class="help-row"><b>Space</b> pause · <b>1–5</b> speed</div>
              <div class="help-row"><b>N</b> realm panel · <b>L</b> ledger · <b>C</b> chronicle</div>
              <div class="help-row"><b>H</b> this help · <b>Esc</b> close / deselect</div>
              <div class="help-row"><b>Click</b> select province or army · <b>Shift-click</b> group armies</div>
              <div class="help-row"><b>Right-click</b> move the selected army (or sail the selected fleet)</div>
            </div>
            <div>
              <div class="peace-sec">The pieces</div>
              <div class="help-row">Your <b>Objectives</b> sit at the top of the realm panel (N) — the era's win and loss conditions.</div>
              <div class="help-row"><b>Monarch points</b> (G/I/M in the topbar) buy tech, reforms, development, stability, generals.</div>
              <div class="help-row"><b>Missions</b> (realm panel) pay as you play the era's story; <b>Decisions</b> hold the formable nations.</div>
              <div class="help-row"><b>Wars</b>: every war can be negotiated (dove buttons). Winning enemies send ultimatums; losing ones sue.</div>
              <div class="help-row"><b>Battles</b>: click the clash on the map for the battle window — and Withdraw when a field is lost.</div>
              <div class="help-row"><b>Flags are doors</b>: click any nation's chip to inspect its court.</div>
            </div>
          </div>
          <button class="btn peace-cancel">Close</button>
        </div>`;
      document.getElementById('ui-root').appendChild(helpEl);
      helpEl.querySelector('.peace-cancel').addEventListener('click', closeHelp);
      helpEl.querySelector('.modal-scrim').addEventListener('click', closeHelp);
    }
    helpEl.classList.remove('hidden');
  }

  // ------------------------------------------------------ touch niceties --
  if (coarse) {
    // Bottom sheets: swiping down on a panel header closes it (the ✕ works
    // too). The header is a stable child of each panel across rebuilds.
    const bindSheetSwipe = (sheet, closeFn) => {
      let sheetY = null;
      sheet.addEventListener('touchstart', (e) => {
        const onHead = e.target instanceof Element && e.target.closest('.pp-head');
        sheetY = (onHead && e.touches.length === 1) ? e.touches[0].clientY : null;
      }, { passive: true });
      sheet.addEventListener('touchmove', (e) => {
        if (sheetY == null || !e.touches.length) return;
        if (e.touches[0].clientY - sheetY > 52) { sheetY = null; closeFn(); }
      }, { passive: true });
      sheet.addEventListener('touchend', () => { sheetY = null; });
      sheet.addEventListener('touchcancel', () => { sheetY = null; });
    };
    bindSheetSwipe(els.panel, () => setSelectedProv(0));
    bindSheetSwipe(els.nation, () => nationPanel.close());

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
  function showStartScreen(bookmarks, onPick, continueInfo, saveTools, onMultiplayer) {
    els.start.classList.remove('hidden');
    buildStartScreen(els.start, DEFINES, bookmarks, (bookmark, tag) => {
      els.start.classList.add('hidden');
      onPick(bookmark, tag);
    }, continueInfo ? {
      label: continueInfo.label,
      onContinue: () => { els.start.classList.add('hidden'); continueInfo.onContinue(); },
    } : null, saveTools || null, onMultiplayer || null);
  }

  function bindGame(ctx, actions) {
    if (state.bound) { warnOnce('bindGame', 'bindGame called twice; ignoring'); return; }
    state.bound = true;
    state.ctx = ctx;
    state.actions = actions;

    topbar.bind(ctx, actions);
    panel.bind(ctx, actions);
    nationPanel.bind(ctx, actions);
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
      nationPanel.refresh();
      updatePill();
      refreshBattleWindow();
    }));
    bus.on('pause', safe('pause', () => topbar.refresh()));
    bus.on('speed', safe('speed', () => topbar.refresh()));
    bus.on('provinceOwner', safe('provOwner', () => { panel.refresh(); outliner.refresh(); }));
    bus.on('provinceController', safe('provCtrl', () => { panel.refresh(); outliner.refresh(); }));
    bus.on('siegeStart', safe('siegeStart', () => { panel.refresh(); outliner.refresh(); }));
    bus.on('siegeEnd', safe('siegeEnd', () => { panel.refresh(); outliner.refresh(); }));
    bus.on('war', safe('war', () => { outliner.refresh(true); topbar.refresh(); nationPanel.refresh(); }));
    bus.on('provinceDev', safe('provDev', () => { panel.refresh(); topbar.refresh(); }));

    bus.on('mapclick', safe('mapclick', onMapClick));
    bus.on('maprightclick', safe('maprightclick', onMapRightClick));
    bus.on('event', safe('event', (p) => eventModal.onBusEvent(p)));
    bus.on('notify', safe('notify', (p) => toasts.push(p || {})));
    bus.on('gameover', safe('gameover', (p) => { gameover.show(p || {}); topbar.refresh(); }));
    // Forming a nation (SPEC §22): the chrome is rebuilt so the new banner,
    // name and color appear everywhere at once.
    bus.on('tagSwitched', safe('tagSwitched', () => {
      topbar.bind(ctx, state.actions);
      nationPanel.refresh();
      outliner.refresh(true);
    }));
  }

  // Multiplayer guests mirror the host's event cards read-only (main.js wires
  // these to the {t:'event'} / {t:'eventDone'} messages).
  function showRemoteEvent(p) { try { eventModal.showRemote(p); } catch (e) { warnOnce('remoteEvent', e); } }
  function closeRemoteEvent(instanceId) { try { eventModal.closeRemote(instanceId); } catch (e) { warnOnce('remoteEventDone', e); } }

  return { showStartScreen, bindGame, showRemoteEvent, closeRemoteEvent };
}
