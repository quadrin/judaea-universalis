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
import { createWiki } from './wiki.js';
import { createSavesPanel } from './saves.js';
import { icon, flagChip, unitIcon } from './icons.js';
import { armGenName } from '../data/units.js';

const MAPMODES = [
  { id: 'political', ico: icon('temple'), name: 'Political' },
  { id: 'diplomatic', ico: icon('dove'), name: 'Diplomatic — friends, foes, truces and claims, seen from your throne' },
  { id: 'trade', ico: icon('coins'), name: 'Trade — the routes, their stops, and the chokepoints that pay double' },
  { id: 'terrain', ico: icon('mountain'), name: 'Terrain' },
  { id: 'religion', ico: icon('altar'), name: 'Religion' },
  { id: 'culture', ico: icon('amphora'), name: 'Culture' },
  { id: 'development', ico: icon('bricks'), name: 'Development' },
  { id: 'unrest', ico: icon('flame'), name: 'Unrest' },
  { id: 'estates', ico: icon('scales'), name: 'Estates — which party of the court holds this ground' },
  { id: 'diaspora', ico: icon('diaspora'), name: 'The Dispersion — where the communities are, how large, and how they regard this crown' },
  { id: 'structures', ico: icon('structures'), name: 'Structures — what stands on this ground, and what is going up' },
];

function buildMapmodeBar(bar, bus) {
  bar.innerHTML = MAPMODES.map((m) =>
    `<button class="mm-btn${m.id === 'political' ? ' active' : ''}" data-mode="${m.id}" data-tt="${m.name} mapmode">${m.ico}</button>`
  ).join('');
  // The lit button follows the EVENT, not the click: the realm panel's
  // "Their ground" lever (SPEC §197) switches to the estates mode from
  // outside this bar, and a bar that only watched its own clicks would keep
  // the old button lit and lie about what the map is showing.
  bus.on('mapmode', (m) => {
    bar.querySelectorAll('.mm-btn').forEach((x) => x.classList.toggle('active', x.dataset.mode === m));
  });
  bar.addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest('[data-mode]') : null;
    if (!b) return;
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
  // The Compendium (SPEC §71): the title screen's library — it reads the
  // data modules directly, and only the start screen opens it. In play the
  // chrome stays the campaign's own (ledger, chronicle, help).
  const wiki = createWiki({ DEFINES, getCtx: () => state.ctx });
  // The shelf (SPEC §93): built once, opened from the title screen and from
  // the scroll beside the topbar quill. main.js hands us the tools it needs.
  let savesPanel = null;
  const topbar = createTopbar(els.topbar, {
    DEFINES,
    onFlagClick: () => toggleNationPanel(),
    onLedgerClick: () => toggleLedger(),
    onChronicleClick: () => toggleChronicle(),
    onSavesClick: () => { if (savesPanel) savesPanel.open(); },
    onToolsClick: () => toggleTools(),
  });
  const panel = createProvincePanel(els.panel, { DEFINES, onClose: () => setSelectedProv(0) });
  const nationPanel = createNationPanel(els.nation, {
    DEFINES,
    onClose: () => nationPanel.close(),
    onPeaceClick(warId) { openPeaceDialog(warId); },
    onWarClick(warId) { openWarOverview(warId); },
    // A dispersion row on a host court's panel (SPEC §195) opens the province
    // the community lives on — the same selection the map click makes, so the
    // nation panel closes and §172's community block does the work.
    onProvinceClick(id) { setSelectedProv(id | 0); },
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
    onFleetClick(id) {
      const g = state.ctx && state.ctx.game;
      const f = g && g.fleets && g.fleets[id];
      if (!f || f.tag !== g.playerTag) return;
      const next = g.ui.selectedFleet === id ? null : id;
      setSelectedFleet(next);
      if (next != null) setSelectedProv(0);
      const p = next != null && g.provinces[f.prov];
      if (p && camera) camera.centerOn(p.x, p.y);
      closeOutlinerDrawer();
    },
    onWingClick(id) {
      const g = state.ctx && state.ctx.game;
      const w = g && g.airwings && g.airwings[id];
      if (!w || w.tag !== g.playerTag) return;
      const next = g.ui.selectedWing === id ? null : id;
      setSelectedWing(next);
      if (next != null) setSelectedProv(0);
      const p = next != null && g.provinces[w.prov];
      if (p && camera) camera.centerOn(p.x, p.y);
      closeOutlinerDrawer();
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
  function openPeaceDialog(warId, enemyTag) {
    const g = state.ctx && state.ctx.game;
    const actions = state.actions;
    if (!g || !actions || typeof actions.getPeaceInfo !== 'function') return;
    const info = actions.getPeaceInfo(warId, enemyTag);
    if (!info) return; // even scripted wars hear envoys now (SPEC §31)
    // The peace table owns the panel berth while the envoys are present.
    // Closing the ordinary panels is especially important on narrow screens,
    // where they are bottom sheets and would otherwise sit under the terms.
    setSelectedProv(0);
    nationPanel.close();
    closeOutlinerDrawer();
    if (!peaceEl) {
      peaceEl = document.createElement('div');
      peaceEl.id = 'peace-modal';
      document.getElementById('ui-root').appendChild(peaceEl);
    }
    const deal = {
      provinces: [], gold: 0, humiliate: false, subjugate: false, reparations: false,
      unifyCrown: false, // the crown war's answer (SPEC §226): one kingdom, one claimant
      concessions: [], // provinces of our own laid on the table (SPEC §222)
      provinceTo: {}, // directed spoils: demanded province -> our client in this war
      release: [], // restored, returned, or newly created states (SPEC §69/§76)
      transferVassals: [], // enemy clients whose fealty passes to us (SPEC §76)
      enemy: info.separate ? info.enemyLeader : undefined, // separate peace (SPEC §67)
    };
    // The map reads the whole shape of the peace: demandable provinces pulse,
    // demanded ones burn solid — and the lands of a nation being set free burn
    // solid too while its box is ticked.
    const releaseProvIds = (tags) => (info.releasable || [])
      .filter((r) => tags.indexOf(r.tag) >= 0)
      .reduce((acc, r) => acc.concat(r.provIds), []);
    const transferProvIds = (tags) => (info.transferableVassals || [])
      .filter((r) => tags.indexOf(r.tag) >= 0)
      .reduce((acc, r) => acc.concat(r.provIds || []), []);
    const paintDeal = () => {
      const freed = releaseProvIds(deal.release);
      const transferred = transferProvIds(deal.transferVassals);
      setPeaceHighlight(
        info.provinces.map((p) => p.id).concat(freed, transferred),
        deal.provinces.concat(freed, transferred));
    };
    const wsCls = info.myWs > 0 ? 'pos' : info.myWs < 0 ? 'neg' : '';
    // A coalition can be talked out of the war one court at a time: chips
    // switch the table between the whole congress and each separate corridor.
    const targetChips = (info.separateTargets || []).length
      ? `<div class="peace-targets">
          <button class="btn peace-target${!info.separate ? ' peace-target-on' : ''}" data-target=""
            data-tt="One treaty with the whole coalition, priced against the war's side score.">The whole coalition</button>
          ${info.separateTargets.map((t) =>
    `<button class="btn peace-target${info.separate && info.enemyLeader === t.tag ? ' peace-target-on' : ''}"
              data-target="${esc(t.tag)}"
              data-tt="${esc('A separate peace with ' + t.name + ' alone — they leave the war, the rest fight on.\nWar score against them alone: ' + signed(t.ws) + '%')}">${esc(t.name)} <span class="peace-dim">${signed(t.ws)}%</span></button>`).join('')}
        </div>`
      : '';
    const discountTxt = { claim: ' · our claim (30% off)', faith: ' · our faith (20% off)' };
    // Directed spoils (SPEC §61 extension): with our own clients in this war,
    // each demanded province can be ceded straight to one of them.
    const recips = info.cessionRecipients || [];
    const toPicker = (p) => (recips.length
      ? `<select class="peace-to" data-prov-to="${p.id}"
          data-tt="Who receives ${esc(p.name)} in the treaty: our crown, or one of our clients marching in this war. Same war-score price either way.">
          <option value="">to us</option>
          ${recips.map((r) => `<option value="${esc(r.tag)}">to ${esc(r.name)}</option>`).join('')}
        </select>`
      : '');
    const provRows = info.provinces.map((p) =>
      `<label class="peace-prov" data-center="${p.id}" data-tt="${esc(p.name)} — ${p.dev} development${discountTxt[p.discount] || ''}${p.goalReason ? '\nWar goal: ' + esc(p.goalReason) + (p.goalAligned ? ' (favored terms)' : ' (costlier terms)') : ''}\nDemanding it costs ${p.cost} war score">
        <input type="checkbox" data-prov="${p.id}">
        <span class="peace-prov-name">${esc(p.name)} <span class="peace-dim">${p.dev} dev${p.discount ? ' · ' + (p.discount === 'claim' ? 'claimed' : 'our faith') : ''}${p.goalReason ? ' · ' + (p.goalAligned ? 'war goal' : 'outside goal') : ''}</span></span>
        ${toPicker(p)}
        <span class="peace-prov-cost">${p.cost}</span>
      </label>`).join('');
    // What we lay on the table ourselves (SPEC §222). Any province of ours —
    // occupied or not, reachable or not, worth having or not — priced at what
    // they would have paid to take it, and credited against the terms.
    const concessionRows = (info.concessions || []).map((p) =>
      `<label class="peace-prov" data-center="${p.id}" data-tt="${esc(p.name)} — ${p.dev} development${
        p.occupied ? '\nTheir armies already stand in it.' : ''}${
        p.capital ? '\nOur own capital. A crown may sign this away; it does not have to.' : ''}${
        p.discount === 'claim' ? '\nThey hold a claim on it (it is cheap for them to take).'
          : p.discount === 'faith' ? '\nIt keeps their faith.' : ''}\nCeding it credits ${p.cost} war score against our terms">
        <input type="checkbox" data-concede="${p.id}">
        <span class="peace-prov-name">${esc(p.name)} <span class="peace-dim">${p.dev} dev${
  p.occupied ? ' · occupied' : ''}${p.capital ? ' · our capital' : ''}</span></span>
        <span class="peace-prov-cost">−${p.cost}</span>
      </label>`).join('');
    peaceEl.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card">
        <h2 class="peace-title">${info.exit
    ? 'Withdraw from ' + esc(info.warName || 'the war')
    : info.separate
      ? 'A separate peace with ' + esc(info.enemyName || 'the enemy')
      : 'Terms for ' + esc(info.warName || 'the war')}</h2>
        ${targetChips}
        <div class="peace-hint">${info.exit
    ? esc('We were called into this war — it is ' + (info.leaderName || 'our ally') + '\'s to finish. We settle only our own front: what our own men hold may be demanded, everything else between us and the enemy reverts, and the coalition fights on without us. '
      + (info.leaderName || 'Our ally') + '\'s occupations, fronts and standing are untouched.')
    : info.separate
      ? esc((info.enemyName || 'They') + ' would leave the war alone — the rest of the coalition fights on, and every other front keeps its lines.')
      : 'The map is yours while you negotiate: click a gold province to demand it, click again to strike it from the terms.'}</div>
        <div class="peace-ws">${info.separate ? 'Separate war score' : 'War score'} against ${esc(info.enemyName || 'the enemy')}: <b class="${wsCls}">${signed(info.myWs)}%</b></div>
        ${info.envoyMonthsLeft > 0 ? `<div class="peace-envoy">${icon('alert', 'icon-sm')} The enemy will not receive our envoys for ${info.envoyMonthsLeft} more month${info.envoyMonthsLeft === 1 ? '' : 's'}.</div>` : ''}
        <div class="peace-sec">${info.exit ? 'Keep what our men hold' : 'Demand provinces'}</div>
        ${info.provinces.length ? `<div class="peace-provs">${provRows}</div>`
    : `<div class="peace-dim peace-none">${info.exit
      ? 'Our own men hold no enemy land — a withdrawal now reverts every occupation on our front.'
      : 'Occupy enemy land to put it on the table.'}</div>`}
        <div class="peace-sec">Offer provinces of our own <span class="peace-dim">(credited against the terms)</span></div>
        ${(info.concessions || []).length ? `<div class="peace-provs peace-give">${concessionRows}</div>`
    : '<div class="peace-dim peace-none">We hold no province to offer.</div>'}
        <div class="peace-sec">Demand payment <span class="peace-dim">(${info.goldCostPer100} war score per 100 talents)</span></div>
        <div class="peace-gold">
          <button class="btn peace-step" data-gold="-1" aria-label="Less gold">−</button>
          <span class="peace-gold-v" data-ref="goldV">0</span>
          <button class="btn peace-step" data-gold="1" aria-label="More gold">+</button>
          <span class="peace-dim">of ${info.maxGold} talents</span>
        </div>
        ${info.exit ? '' : `<label class="peace-prov" data-tt="Force a public submission: +10 legitimacy and +25 of every monarch point for us; they lose legitimacy and stability.\nCosts ${info.humiliateCost} war score">
          <input type="checkbox" data-ref="humiliate">
          <span class="peace-prov-name">Humiliate them before the nations</span>
          <span class="peace-prov-cost">${info.humiliateCost}</span>
        </label>
        <label class="peace-prov" data-tt="War reparations: they pay ${info.reparationsAmount || 8} talents a month for ${Math.round((info.reparationsMonths || 24) / 12)} years — a defaulting debtor must be deep in debt to escape it.\nCosts ${info.reparationsCost || 15} war score">
          <input type="checkbox" data-ref="reparations">
          <span class="peace-prov-name">Demand war reparations</span>
          <span class="peace-prov-cost">${info.reparationsCost || 15}</span>
        </label>
        ${info.crownRival ? `<label class="peace-prov${info.canUnifyCrown ? '' : ' peace-off'}" data-tt="${info.canUnifyCrown
    ? esc('The crown is one: ' + (info.crownRivalName || 'the rival claimant') + ' renounces, every province of theirs '
      + 'passes to us at once — occupied or not — and their court passes into memory.'
      + '\nReplaces every other term. Costs ' + info.unifyCrownCost + ' war score.')
    : esc(info.whyNotUnifyCrown || 'No crown is in dispute here.')}">
          <input type="checkbox" data-ref="unifyCrown" ${info.canUnifyCrown ? '' : 'disabled'}>
          <span class="peace-prov-name">Take the whole kingdom
            <span class="peace-dim">the crown of ${esc(info.crownOf || 'the realm')}, one claimant</span></span>
          <span class="peace-prov-cost">${info.unifyCrownCost}</span>
        </label>` : ''}
        <label class="peace-prov${info.canSubjugate ? '' : ' peace-off'}" data-tt="${info.canSubjugate
    ? esc('Make ' + (info.enemyName || 'them') + ' a client kingdom: they keep their lands but pay us 15% of their income and follow us to war.\nReplaces province demands.'
      + (info.subjugateGoalAligned ? '\nThis fulfills the ' + (info.subjugateGoalReason || 'war goal') + ' and receives favored terms.' : '')
      + '\nCosts ' + info.subjugateCost + ' war score')
    : esc(info.whyNotSubjugate || 'They cannot be subjugated.')}">
          <input type="checkbox" data-ref="subjugate" ${info.canSubjugate ? '' : 'disabled'}>
          <span class="peace-prov-name">Make them a client kingdom</span>
          <span class="peace-prov-cost">${info.subjugateCost}</span>
        </label>
        <div class="peace-sec">Force them to release nations</div>
        ${/* Its own scroll box, like the province lists above it. Since the old
              names (SPEC §247) a beaten empire can be divided twenty ways, and
              twenty rows between the war score and the Send button is a card
              nobody reaches the bottom of. */
    (info.releasable || []).length ? `<div class="peace-provs peace-releases">` : ''}
        ${(info.releasable || []).length ? info.releasable.map((r) =>
    `<label class="peace-prov${r.origin === 'revival' ? ' peace-revival' : ''}" data-center="${(r.provIds || [])[0] || 0}" data-tt="${esc(
      (r.kind === 'return'
        ? 'Return the old homeland to the living court of ' + r.name
        : r.kind === 'create'
          ? 'Create ' + r.name + ' as a free nation'
          : r.origin === 'revival'
            ? 'Raise ' + r.name + ' again over the ground that is still its own'
            : 'Restore ' + r.name + ' as a free nation')
      + ': ' + (r.provNames || []).join(', ') + ' (' + r.dev + ' development) leave '
      + (info.enemyName || 'the enemy') + '\'s realm.'
      + (r.kind === 'return'
        ? ' The recipient keeps its existing government and treaties.'
        : ' The state rises independent and sheltered by a five-year truce.')
      // Why this is a country and not a census bucket (SPEC §247).
      + (r.basis ? '\n\n' + r.basis : '')
      + (r.goalAligned ? '\n\nThis fulfills the ' + (r.goalReason || 'war goal') + ' and receives favored terms.' : '')
      + '\nCosts ' + r.cost + ' war score. Liberation earns no infamy.')}">
          <input type="checkbox" data-release="${esc(r.tag)}">
          <span class="peace-prov-name">${r.kind === 'return'
    ? 'Return lands to ' + esc(r.name)
    : r.kind === 'create'
      ? 'Create ' + esc(r.name)
      : 'Restore ' + esc(r.name)}
            <span class="peace-dim">${(r.provIds || []).length} province${(r.provIds || []).length === 1 ? '' : 's'} · ${r.dev} dev${
  r.origin === 'revival' ? ' · an old name' : ''}</span></span>
          <span class="peace-prov-cost">${r.cost}</span>
        </label>`).join('') + '</div>'
    : `<div class="peace-dim peace-none">${info.separate
      ? 'A separate peace cannot redraw another crown\'s map — releases wait for the full congress table.'
      : (info.releasableLocked || []).length
        // Something IS on this ground; this table just cannot reach it, and
        // the block below says which and why. Claiming impossibility above a
        // list of named countries would be the panel arguing with itself.
        ? 'Nothing can be freed on these terms yet — but the ground has names on it:'
        : 'No country can be separated from them here. Fallen courts whose homeland they are sitting on, living claimants owed their old lands, and the old names of this ground are all considered — and a congress that cannot name a country does not invent one.'}</div>`}
        ${/* The old names within reach of this war but not of this table
              (SPEC §247): shown, priced and explained, so the ladder is a
              thing to climb rather than a thing to guess at. */
    (info.releasableLocked || []).length ? `<div class="peace-locked">
          <div class="peace-dim">Old names this congress cannot quite reach:</div>
          ${info.releasableLocked.map((r) =>
    `<label class="peace-prov peace-off" data-tt="${esc(r.name + ' — ' + r.reason
      + '\n\nIts country is ' + r.cores.join(' and ') + '.'
      + '\nRaising it asks for ' + r.minWs + '% war score, and would take '
      + r.dev + ' development out of ' + (info.enemyName || 'their realm') + '.'
      + (r.basis ? '\n\n' + r.basis : ''))}">
            <input type="checkbox" disabled>
            <span class="peace-prov-name">Restore ${esc(r.name)}
              <span class="peace-dim">${esc(r.reason)}</span></span>
            <span class="peace-prov-cost">${r.minWs}%</span>
          </label>`).join('')}
        </div>` : ''}
        <div class="peace-sec">Take over their client kingdoms</div>
        ${(info.transferableVassals || []).length ? info.transferableVassals.map((r) =>
    `<label class="peace-prov" data-center="${(r.provIds || [])[0] || 0}" data-tt="${esc(
      'Transfer ' + r.name + ' from ' + r.fromName + ' to our protection. The client keeps its ruler, army and every province; its tribute and war duty pass to us.\nCosts '
      + r.cost + ' war score.' + (r.goalAligned ? ' This fulfills the ' + (r.goalReason || 'war goal') + ' and receives favored terms.' : ''))}">
          <input type="checkbox" data-transfer-vassal="${esc(r.tag)}">
          <span class="peace-prov-name">Transfer ${esc(r.name)} to us
            <span class="peace-dim">${r.dev} dev · from ${esc(r.fromName)}</span></span>
          <span class="peace-prov-cost">${r.cost}</span>
        </label>`).join('')
    : `<div class="peace-dim peace-none">${info.separate
      ? 'A separate peace cannot transfer another sovereign’s clients.'
      : 'They have no direct client kingdom that can be transferred.'}</div>`}
        `}
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
    const crownBox = peaceEl.querySelector('[data-ref="unifyCrown"]');
    const reparationsBox = peaceEl.querySelector('[data-ref="reparations"]');

    function update() {
      let ev = null;
      try { ev = actions.evaluatePeace(warId, deal); } catch (e) { warnOnce('evaluatePeace', e); }
      if (!ev) { closePeaceDialog(); return; }
      goldV.textContent = String(deal.gold);
      // Subjugation replaces province demands and releases: a client keeps
      // its lands whole. Taking the crown (SPEC §226) replaces the whole
      // table, indemnity and humiliation included — there is no court left
      // to pay or be shamed next month.
      const whole = deal.subjugate || deal.unifyCrown;
      peaceEl.querySelectorAll('[data-prov]').forEach((box) => {
        box.disabled = whole;
        if (whole) box.checked = false;
        box.closest('.peace-prov').classList.toggle('peace-off', whole);
      });
      peaceEl.querySelectorAll('[data-prov-to]').forEach((sel) => {
        sel.disabled = whole;
        if (whole) sel.value = '';
      });
      peaceEl.querySelectorAll('[data-concede]').forEach((box) => {
        box.disabled = whole;
        if (whole) box.checked = false;
        box.closest('.peace-prov').classList.toggle('peace-off', whole);
      });
      peaceEl.querySelectorAll('[data-release]').forEach((box) => {
        box.disabled = whole;
        if (whole) box.checked = false;
        box.closest('.peace-prov').classList.toggle('peace-off', whole);
      });
      peaceEl.querySelectorAll('[data-transfer-vassal]').forEach((box) => {
        box.disabled = whole;
        if (whole) box.checked = false;
        box.closest('.peace-prov').classList.toggle('peace-off', whole);
      });
      if (whole) { deal.provinces = []; deal.release = []; deal.transferVassals = []; deal.provinceTo = {}; deal.concessions = []; }
      // The two whole-house clauses exclude each other: a crown cannot both
      // survive as a client and be taken.
      if (subjugateBox) {
        subjugateBox.disabled = !info.canSubjugate || deal.unifyCrown;
        if (deal.unifyCrown) { subjugateBox.checked = false; deal.subjugate = false; }
        subjugateBox.closest('.peace-prov').classList.toggle('peace-off', subjugateBox.disabled);
      }
      if (crownBox) {
        crownBox.disabled = !info.canUnifyCrown || deal.subjugate;
        if (deal.subjugate) { crownBox.checked = false; deal.unifyCrown = false; }
        crownBox.closest('.peace-prov').classList.toggle('peace-off', crownBox.disabled);
      }
      if (deal.unifyCrown) {
        deal.gold = 0;
        deal.humiliate = false;
        deal.reparations = false;
        if (humiliateBox) humiliateBox.checked = false;
        if (reparationsBox) reparationsBox.checked = false;
        goldV.textContent = '0';
      }
      [humiliateBox, reparationsBox].forEach((box) => {
        if (!box) return;
        box.disabled = deal.unifyCrown;
        box.closest('.peace-prov').classList.toggle('peace-off', deal.unifyCrown);
      });
      const white = !deal.provinces.length && !deal.release.length && !deal.transferVassals.length
        && !deal.concessions.length && deal.gold <= 0
        && !deal.humiliate && !deal.subjugate && !deal.unifyCrown && !deal.reparations;
      totalEl.textContent = white
        ? (info.exit
          ? 'A clean withdrawal: occupations between us and the enemy revert; the war goes on without us.'
          : 'A white peace: every occupation reverts, nothing changes hands.')
        : ev.net > 0
          ? `Demands cost ${ev.net} war score — we hold ${Math.max(0, info.myWs)}.`
          : ev.offered > 0
            ? `We offer ${ev.offered} war score of our own land${ev.cost > 0 ? ` against ${ev.cost} demanded` : ''} — their war has earned ${Math.max(0, -info.myWs)}.`
            : `Demands cost ${ev.cost} war score — we hold ${Math.max(0, info.myWs)}.`;
      verdictEl.textContent = ev.acceptable ? 'They will accept these terms.' : ev.reason;
      verdictEl.classList.toggle('pos', !!ev.acceptable);
      verdictEl.classList.toggle('neg', !ev.acceptable);
      sendBtn.textContent = info.exit
        ? (white ? 'Withdraw from the war' : 'Withdraw on these terms')
        : white ? 'Offer white peace' : 'Send the terms';
      sendBtn.classList.toggle('disabled', !ev.acceptable || info.envoyMonthsLeft > 0);
      // The chosen demands burn solid gold on the map; the rest of the table
      // keeps its pulse — and freed nations' lands burn gold while ticked.
      paintDeal();
    }

    peaceEl.querySelectorAll('[data-concede]').forEach((box) => {
      box.addEventListener('change', () => {
        const id = Number(box.dataset.concede);
        const at = deal.concessions.indexOf(id);
        if (box.checked && at < 0) deal.concessions.push(id);
        else if (!box.checked && at >= 0) deal.concessions.splice(at, 1);
        update();
      });
    });
    peaceEl.querySelectorAll('[data-prov]').forEach((box) => {
      box.addEventListener('change', () => {
        const id = Number(box.dataset.prov);
        const at = deal.provinces.indexOf(id);
        if (box.checked && at < 0) deal.provinces.push(id);
        else if (!box.checked && at >= 0) {
          deal.provinces.splice(at, 1);
          // A struck demand takes its directed recipient off the table too.
          delete deal.provinceTo[id];
          const sel = peaceEl.querySelector('[data-prov-to="' + id + '"]');
          if (sel) sel.value = '';
        }
        update();
      });
    });
    peaceEl.querySelectorAll('[data-prov-to]').forEach((sel) => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', () => {
        const id = Number(sel.dataset.provTo);
        if (sel.value) deal.provinceTo[id] = sel.value;
        else delete deal.provinceTo[id];
        // Naming a recipient implies demanding the province.
        if (sel.value && deal.provinces.indexOf(id) < 0) {
          deal.provinces.push(id);
          const box = peaceEl.querySelector('[data-prov="' + id + '"]');
          if (box) box.checked = true;
        }
        update();
      });
    });
    peaceEl.querySelectorAll('[data-gold]').forEach((b) => {
      b.addEventListener('click', () => {
        deal.gold = Math.max(0, Math.min(info.maxGold, deal.gold + Number(b.dataset.gold) * info.goldStep));
        update();
      });
    });
    // The withdrawal table (SPEC §74) carries no humiliation or reparations
    // rows at all — guard the wiring.
    if (humiliateBox) humiliateBox.addEventListener('change', () => { deal.humiliate = humiliateBox.checked; update(); });
    if (reparationsBox) reparationsBox.addEventListener('change', () => { deal.reparations = reparationsBox.checked; update(); });
    peaceEl.querySelectorAll('[data-release]').forEach((box) => {
      box.addEventListener('change', () => {
        const tag = box.dataset.release;
        const at = deal.release.indexOf(tag);
        if (box.checked && at < 0) deal.release.push(tag);
        else if (!box.checked && at >= 0) deal.release.splice(at, 1);
        update();
      });
    });
    peaceEl.querySelectorAll('[data-transfer-vassal]').forEach((box) => {
      box.addEventListener('change', () => {
        const tag = box.dataset.transferVassal;
        const at = deal.transferVassals.indexOf(tag);
        if (box.checked && at < 0) deal.transferVassals.push(tag);
        else if (!box.checked && at >= 0) deal.transferVassals.splice(at, 1);
        update();
      });
    });
    if (subjugateBox) {
      subjugateBox.addEventListener('change', () => { deal.subjugate = subjugateBox.checked; update(); });
    }
    if (crownBox) {
      crownBox.addEventListener('change', () => { deal.unifyCrown = crownBox.checked; update(); });
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
    // Switching courts rebuilds the table for that enemy (or the congress).
    peaceEl.querySelectorAll('.peace-target').forEach((chip) => {
      chip.addEventListener('click', () => {
        const t = chip.dataset.target || undefined;
        setPeaceHighlight([], []);
        openPeaceDialog(warId, t);
      });
    });
    // The map negotiates too: clicking a demandable province toggles it in
    // and out of the deal (the checkbox follows); a client keeps its lands,
    // so subjugation deals ignore the map.
    const demandable = new Set(info.provinces.map((p) => p.id));
    peaceProvToggle = (pid) => {
      if (deal.subjugate || deal.unifyCrown || !demandable.has(pid)) return;
      const at = deal.provinces.indexOf(pid);
      if (at >= 0) {
        deal.provinces.splice(at, 1);
        delete deal.provinceTo[pid];
        const sel = peaceEl.querySelector('[data-prov-to="' + pid + '"]');
        if (sel) sel.value = '';
      } else deal.provinces.push(pid);
      const box = peaceEl.querySelector('[data-prov="' + pid + '"]');
      if (box) box.checked = at < 0;
      update();
    };
    paintDeal();
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
    // The chapter's contract rides the war it is fought in (v5.8) — not the
    // court panel. Only wars we stand in carry it, and a settled verdict
    // shows as the verdict, not as stale win/loss lines.
    const contractHtml = () => {
      try {
        const g = state.ctx && state.ctx.game;
        const me = g && g.playerTag;
        if (!me || !(info.mySide || []).some((r) => r.tag === me)) return '';
        const lines = typeof actions.getObjectives === 'function' ? actions.getObjectives() : null;
        if (!lines || !lines.length) return '';
        return `<div class="peace-sec">The chapter's contract</div>`
          + lines.map((line) => {
            const cls = /^Win:/.test(line) ? 'pos' : /^Lose:/.test(line) ? 'neg' : '';
            return `<div class="np-objective wo-objective"><span class="${cls}">${esc(line)}</span></div>`;
          }).join('');
      } catch (e) { warnOnce('woContract', e); return ''; }
    };
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
    const goalHtml = info.goal ? `
        <div class="peace-sec">War goal: ${esc(info.goal.label)}</div>
        <div class="wo-hold">${esc(info.goal.description)}</div>
        <div class="peace-dim wo-meta">Objective: ${esc((info.goal.targetNames || []).join(', '))}
          · ${info.goal.holder === 'ours' ? 'our side holds it' : info.goal.holder === 'theirs' ? 'the enemy holds it' : 'control is contested'}
          · ticking score ${signed(info.goal.score)} / ${info.goal.scoreCap}</div>` : '';
    warEl.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card wo-card">
        <h2 class="peace-title">${esc(info.warName || 'War')}</h2>
        <div class="peace-dim wo-meta">${info.months} month${info.months === 1 ? '' : 's'} of war${info.cb ? ' · casus belli: ' + esc(info.cb === 'claim' ? 'a pressed claim' : info.cb === 'conquest' ? 'a war of conquest' : info.cb === 'holy' || info.cb === 'liberation' ? 'a war of liberation' : info.cb === 'coalition' ? 'a punitive league' : info.cb === 'containment' ? 'a war of containment' : info.cb === 'independence' ? 'a war of independence' : info.cb === 'succession' ? 'a succession war' : info.cb) : ''}${info.noNegotiation ? ' · a fight to the death — but envoys may still be sent' : ''}</div>
        <div class="wo-sides">
          <div class="wo-side">${sideHtml(info.mySide)}</div>
          <div class="wo-vs">against</div>
          <div class="wo-side">${sideHtml(info.theirSide)}</div>
        </div>
        <div class="peace-sec">War score: <b class="${wsCls}">${signed(info.myWs)}%</b></div>
        <div class="bar wo-bar"><div class="bar-fill" style="width:${barPct}%"></div></div>
        ${bdRow('From battles', bd.battles, 'Field victories, net of theirs (each side caps at 40)')}
        ${bdRow('From occupation', bd.occupation, 'Enemy development under our control, net of theirs (each side caps at 60)')}
        ${info.goal ? bdRow('From war goal', bd.goal, 'Holding the declared objective after its six-month grace period (caps at 25)') : ''}
        ${bd.events ? bdRow('From events', bd.events, 'Scripted swings of history') : ''}
        ${goalHtml}
        <div class="peace-sec">We hold</div>
        <div class="wo-hold">${holdHtml(info.weHold, 'None of their land')}</div>
        <div class="peace-sec">They hold</div>
        <div class="wo-hold">${holdHtml(info.theyHold, 'None of ours')}</div>
        ${contractHtml()}
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
    try { return flagChip(tag, DEFINES, 15, !!link, state.ctx && state.ctx.game); } catch (e) { return ''; }
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

  // ---------------------------------------------------------- unit inspector --
  // Click any banner, sail, or parked wing — friend or foe — and read it like
  // a field commander through glasses (v5.5): strength, patterns, the
  // general's reputation, morale. Foe details come from getUnitDetails.
  let inspectEl = null;
  function closeUnitInspector() {
    if (inspectEl) inspectEl.classList.add('hidden');
  }
  function openUnitInspector(sel) {
    const actions = state.actions;
    if (!actions || typeof actions.getUnitDetails !== 'function') return;
    let info = null;
    try { info = actions.getUnitDetails(sel); } catch (e) { warnOnce('getUnitDetails', e); }
    if (!info) return;
    if (!inspectEl) {
      inspectEl = document.createElement('div');
      inspectEl.id = 'inspect-modal';
      document.getElementById('ui-root').appendChild(inspectEl);
    }
    const moraleBar = (m, mx) => {
      const pct = Math.round(Math.max(0, Math.min(100, (m / Math.max(0.01, mx)) * 100)));
      return `<span class="morale bw-morale"><span class="morale-fill" style="width:${pct}%"></span></span>`;
    };
    const rows = [];
    for (const a of info.armies) {
      const comp = [
        a.inf ? `${a.inf} × ${a.infName}` : '',
        a.cav ? `${a.cav} × ${a.cavName}` : '',
        a.art ? `${a.art} × ${a.artName}` : '',
      ].filter(Boolean).join(' · ') || 'skeleton formation';
      // The faces of the arms actually present (SPEC §191), and the gait the
      // slowest of them gives the column.
      const faces = ['inf', 'cav', 'art'].filter((k) => a[k] > 0)
        .map((k) => unitIcon(a.gen || 0, k, 'icon-sm')).join('');
      const pace = a.paceMult && Math.abs(a.paceMult - 1) > 0.01
        ? ` · marches at ${Math.round(a.paceMult * 100)}% of foot`
        : '';
      const st = a.inBattle ? ' — in battle' : a.retreating ? ' — retreating' : '';
      const gen = a.general
        ? `${icon('helmet', 'icon-sm')} ${esc(a.general.name)} (${a.general.fire}/${a.general.shock}/${a.general.maneuver})`
        : '<span class="peace-dim">no general</span>';
      // supply (SPEC §82): the line's state, printed where the army is read
      const sup = a.supplyText
        ? `<br>${a.oosMonths > 0 ? `<span class="neg">✂ ${esc(a.supplyText)}</span>` : `<span class="peace-dim">${esc(a.supplyText)}</span>`}`
        : '';
      rows.push(`
        <div class="bw-army insp-army">
          <span class="bw-aname">${flagChipHtml(a.tag, true)} ${faces} ${esc(a.name)}</span>
          <span class="bw-men">${fmtMen(a.men)}</span>
          ${moraleBar(a.morale, a.maxMorale)}
        </div>
        <div class="insp-sub">${esc(comp)}${esc(st)}${esc(pace)}<br>${gen} · morale ${a.morale.toFixed(1)} / ${a.maxMorale.toFixed(1)}${sup}</div>`);
    }
    if (info.fleet) {
      rows.push(`
        <div class="bw-army insp-army">
          <span class="bw-aname">${flagChipHtml(info.fleet.tag, true)} Fleet of ${esc(info.fleet.tagName)}</span>
          <span class="bw-men">${info.fleet.ships} ships</span>
        </div>
        <div class="insp-sub">${esc(info.fleet.patternName)}</div>`);
    }
    if (info.wing) {
      rows.push(`
        <div class="bw-army insp-army">
          <span class="bw-aname">${flagChipHtml(info.wing.tag, true)} Air wing of ${esc(info.wing.tagName)}</span>
          <span class="bw-men">${info.wing.rearming ? 'rearming ' + info.wing.rearming + 'd' : 'ready'}</span>
        </div>
        <div class="insp-sub">${info.wing.leader ? esc('Wing leader: ' + info.wing.leader) : 'no wing leader'}</div>`);
    }
    const who = info.armies[0] || info.fleet || info.wing || {};
    inspectEl.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card insp-card">
        <h2 class="peace-title">${who.isOwn ? 'Our forces' : 'Foreign forces'}${info.provName ? ' at ' + esc(info.provName) : ''}</h2>
        <div class="bw-armies">${rows.join('')}</div>
        <button class="btn peace-cancel">Close</button>
      </div>`;
    inspectEl.classList.remove('hidden');
    inspectEl.querySelector('.peace-cancel').addEventListener('click', closeUnitInspector);
    inspectEl.querySelector('.modal-scrim').addEventListener('click', closeUnitInspector);
  }

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
      // "8 infantry" — each army remembers what it was raised as. Since
      // SPEC §191 there are three arms to speak for, and an arm nobody
      // brought is left out rather than printed as a zero.
      const gen = a.general ? `\nGeneral: ${a.general.name} (${a.general.fire}/${a.general.shock}/${a.general.maneuver})` : '';
      const comp = [
        a.inf ? `${a.inf} × ${armGenName(a.gen || 0, 'inf')}` : '',
        a.cav ? `${a.cav} × ${armGenName(a.gen || 0, 'cav')}` : '',
        a.art ? `${a.art} × ${armGenName(a.gen || 0, 'art')}` : '',
      ].filter(Boolean).join(', ') || 'a skeleton formation';
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
        ? 'The day’s battle die: d10 + the best general’s pips + terrain + doctrine + the arms'
        : 'The day’s battle die: d10 + the best general’s pips + doctrine + the arms')
        + (doct ? '\n' + doct : '')
        + (s.air ? '\nAir cover — a wing in range adds +1 in the fire phase.' : '')
        + (s.mix ? `\nThe arms: +${s.mix} this phase${s.mixText ? ' — ' + s.mixText : ''}.` : '');
      // The order of battle by arm (SPEC §191), with each arm's own face: the
      // matchup is the thing to read here, so it gets a line of its own.
      const gen = s.gen || 0;
      const arms = ['inf', 'cav', 'art']
        .filter((a) => (s.regs && s.regs[a]) > 0)
        .map((a) => `<span class="bw-arm" data-tt="${esc(s.regs[a] + ' × ' + armGenName(gen, a))}">`
          + `${unitIcon(gen, a, 'icon-sm')} ${s.regs[a]}</span>`)
        .join('');
      const mixChip = s.mix
        ? `<span class="bw-mix" data-tt="${esc('Their mix cannot answer ours this phase'
          + (s.mixText ? ': ' + s.mixText : '') + '.')}">+${s.mix} arms</span>`
        : '';
      return `
      <div class="bw-side${s.isMine ? ' bw-mine' : ''}">
        <div class="bw-side-head">${key === 'atk' ? 'Attackers' : 'Defenders'}${s.air ? ' ' + icon('plane', 'icon-sm') : ''}${s.isMine ? ' <span class="bw-us">— our side</span>' : ''}</div>
        <div class="bw-die-row">
          <span class="bw-die${roll == null ? ' bw-die-none' : ''}" data-tt="${esc(roll == null ? 'No round fought yet' : dieTT)}">${roll == null ? '—' : roll}</span>
          <span class="bw-total">${fmtMen(s.men)} men · morale ${s.morale.toFixed(1)}</span>
        </div>
        <div class="bw-arms">${arms}${mixChip}</div>
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
    divergence: 'quill', chapter: 'scroll',
  };
  let chronTab = 'record'; // 'record' | 'road'
  // The record as it stands, newest first under year headings.
  function chronicleRows(actions, months) {
    let entries = [];
    try { entries = actions.getChronicle() || []; } catch (e) { warnOnce('getChronicle', e); }
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
    return rows || '<div class="chron-empty">The page is still blank — history is waiting to be made.</div>';
  }

  // The road not taken (SPEC §89): the campaign set against the record it was
  // given. Every turning where this age chose otherwise, every chapter of the
  // script that never got written, the worlds those choices opened, and the
  // character of the realm that walked it.
  function roadRows(actions, months) {
    let d = null;
    try { d = actions.getDivergence ? actions.getDivergence() : null; } catch (e) { warnOnce('getDivergence', e); }
    if (!d) return '<div class="chron-empty">The chronicler has nothing to compare yet.</div>';
    const yr = (y) => (y < 0 ? (-y) + ' BCE' : y + ' CE');
    const when = (en) => esc(String(months[((en.m | 0) - 1 + 12) % 12] || '')) + ' ' + esc(yr(en.y));
    let html = '';

    if (d.epithet) {
      html += `<div class="road-head"><b>The realm that walked it:</b> ${esc(d.epithet)}</div>`;
    }
    if (d.axes && d.axes.length) {
      html += '<div class="road-axes">' + d.axes.map((a) => {
        const cls = a.band === 'mid' ? '' : (a.score > 0 ? 'pos' : 'neg');
        return `<span class="road-axis ${cls}" data-tt="${esc(a.blurb)}">`
          + `${esc(a.name)} — <b>${esc(a.label)}</b></span>`;
      }).join('') + '</div>';
    }

    if (d.strands.length) {
      html += '<div class="chron-year">The worlds history never wrote</div>';
      html += d.strands.map((st) => `<div class="road-strand">`
        + `<div class="road-strand-name">${icon('lamp', 'icon-row')} ${esc(st.name)} `
        + `<span class="road-era">${esc(st.era)}</span></div>`
        + `<div class="road-strand-blurb">${esc(st.blurb)}</div></div>`).join('');
    }

    if (d.entries.length) {
      html += '<div class="chron-year">Where this age chose otherwise</div>';
      html += d.entries.map((en) => `<div class="road-turn">`
        + `<div class="road-when">${when(en)} · ${esc(en.title)}</div>`
        + `<div class="road-pair">`
        + `<span class="road-was"><i>The record:</i> ${esc(en.historical || en.histLabel || '—')}</span>`
        + `<span class="road-is"><i>This age:</i> ${esc(en.chose || '—')}</span>`
        + `</div></div>`).join('');
    }

    if (d.retired.length) {
      // A long campaign retires a lot of pages (SPEC §104): the world spine
      // runs to 425 and much of it is written for the world in which Rome
      // won. A list of them is not a list of failures — in a surviving
      // Judaea it is the opposite — so the page says so before the reader
      // decides for themselves.
      html += '<div class="chron-year">Chapters that never came</div>';
      html += '<div class="chron-note">Pages the record kept that this age did not need. '
        + 'A long list here is not a list of losses — it is the measure of how far '
        + 'the world has moved off the rails it was given.</div>';
      html += d.retired.map((r) => `<div class="road-retired">`
        + `<span class="road-when">${when(r)}</span> `
        + `<span class="road-retired-name">${esc(r.title)}</span> — ${esc(r.why)}`
        + `</div>`).join('');
    }

    if (!d.strands.length && !d.entries.length && !d.retired.length) {
      html += '<div class="chron-empty">So far this age has followed the record it was given. '
        + 'Every choice the chronicles also made leaves this page blank.</div>';
    }
    return html;
  }

  function openChronicle() {
    const actions = state.actions;
    if (!actions || typeof actions.getChronicle !== 'function') return;
    if (!chronEl) {
      chronEl = document.createElement('div');
      chronEl.id = 'chronicle-modal';
      document.getElementById('ui-root').appendChild(chronEl);
    }
    const months = (state.ctx && state.ctx.DEFINES && state.ctx.DEFINES.MONTH_NAMES) || [];
    const body = chronTab === 'road' ? roadRows(actions, months) : chronicleRows(actions, months);
    chronEl.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card peace-card ledger-card chron-card">
        <h2 class="peace-title">The Chronicle</h2>
        <div class="chron-tabs">
          <button class="chron-tab${chronTab === 'record' ? ' on' : ''}" data-tab="record">The Record</button>
          <button class="chron-tab${chronTab === 'road' ? ' on' : ''}" data-tab="road">The Road Not Taken</button>
        </div>
        <div class="chron-wrap">${body}</div>
        <button class="btn peace-cancel">Close</button>
      </div>`;
    chronEl.classList.remove('hidden');
    chronEl.querySelector('.peace-cancel').addEventListener('click', closeChronicle);
    chronEl.querySelector('.modal-scrim').addEventListener('click', closeChronicle);
    chronEl.querySelectorAll('[data-tab]').forEach((b) => {
      b.addEventListener('click', () => { chronTab = b.dataset.tab; openChronicle(); });
    });
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
    if (id != null) {
      g.ui.selectedFleet = null;
      g.ui.selectedWing = null;
    }
    g.ui.selectedArmy = id == null ? null : id;
    g.ui.selectedArmies = id == null ? [] : [id];
    bus.emit('selectArmy', g.ui.selectedArmy);
    outliner.refresh(true);
  }

  function setSelectedFleet(id) {
    const g = state.ctx && state.ctx.game;
    if (!g) return;
    g.ui.selectedFleet = id == null ? null : id;
    if (id != null) {
      g.ui.selectedWing = null;
      g.ui.selectedArmy = null;
      g.ui.selectedArmies = [];
      bus.emit('selectArmy', null);
    }
    outliner.refresh(true);
  }

  function setSelectedWing(id) {
    const g = state.ctx && state.ctx.game;
    if (!g) return;
    g.ui.selectedWing = id == null ? null : id;
    if (id != null) {
      g.ui.selectedFleet = null;
      g.ui.selectedArmy = null;
      g.ui.selectedArmies = [];
      bus.emit('selectArmy', null);
    }
    outliner.refresh(true);
  }

  function clearSelectedUnits() {
    const g = state.ctx && state.ctx.game;
    if (!g) return;
    g.ui.selectedArmy = null;
    g.ui.selectedArmies = [];
    g.ui.selectedFleet = null;
    g.ui.selectedWing = null;
    bus.emit('selectArmy', null);
    outliner.refresh(true);
  }

  // Banner click on a stack: every army under the standard is selected at once,
  // so one click grabs the whole host and one right-click marches it together.
  function selectArmyStack(ids) {
    const g = state.ctx && state.ctx.game;
    if (!g || !ids.length) return;
    g.ui.selectedFleet = null;
    g.ui.selectedWing = null;
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
    g.ui.selectedFleet = null;
    g.ui.selectedWing = null;
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
    const { provId, armyId, fleetId, wingId, shift } = payload || {};
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
    // A selected wing turns the map into a bombsight (v5.5): clicking a
    // legal target in range — a province or an enemy banner — sends the
    // planes. Anything else falls through to ordinary selection.
    const selWingId = g.ui.selectedWing;
    const selWing = selWingId != null && g.airwings ? g.airwings[selWingId] : null;
    if (selWing && selWing.tag === g.playerTag && !grouping
        && state.actions && typeof state.actions.raidProvince === 'function') {
      let target = provId > 0 ? provId : 0;
      if (armyId != null) {
        const a = g.armies && g.armies[armyId];
        if (a && a.tag !== g.playerTag) target = a.prov;
      }
      let legal = [];
      try { legal = state.actions.getWingRaidTargets(selWingId) || []; } catch (e) { legal = []; }
      if (target > 0 && legal.indexOf(target) >= 0) {
        state.actions.raidProvince(selWingId, target);
        outliner.refresh(true);
        panel.refresh();
        return; // the wing stays selected for the next sortie
      }
    }
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
      if (a) {
        // Foreign army (v5.5): read it through the glasses.
        clearSelectedUnits();
        openUnitInspector({ armyIds: Array.isArray(payload.armyIds) ? payload.armyIds : [armyId] });
        return;
      }
    }
    if (fleetId != null) {
      const f = g.fleets && g.fleets[fleetId];
      if (f && f.tag === g.playerTag) {
        setSelectedFleet(fleetId);
        setSelectedProv(0);
        return;
      }
      if (f) {
        clearSelectedUnits();
        openUnitInspector({ fleetId });
        return;
      }
    }
    if (wingId != null) {
      const w = g.airwings && g.airwings[wingId];
      if (w && w.tag === g.playerTag) {
        setSelectedWing(wingId);
        setSelectedProv(0);
        return;
      }
      if (w) {
        clearSelectedUnits();
        openUnitInspector({ wingId });
        return;
      }
    }
    if (grouping) return; // shift/group taps on terrain don't drop a built-up group
    if (payload && payload.battleProv) {
      clearSelectedUnits();
      openBattleWindow(payload.battleProv);
      return;
    }
    if (provId > 0) {
      clearSelectedUnits();
      setSelectedProv(provId);
    } else {
      // Sea click deselects everything.
      clearSelectedUnits();
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
    if (g.ui.selectedWing != null && typeof state.actions.moveAirWing === 'function') {
      state.actions.moveAirWing(g.ui.selectedWing, provId);
      outliner.refresh(true);
      panel.refresh();
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
      if (toolsOpen()) { closeTools(); return; }
      if (helpOpen()) { closeHelp(); return; }
      if (inspectEl && !inspectEl.classList.contains('hidden')) { closeUnitInspector(); return; }
      if (battleWindowOpen()) { closeBattleWindow(); return; }
      if (peaceDialogOpen()) { closePeaceDialog(); return; }
      if (warOverviewOpen()) { closeWarOverview(); return; }
      if (ledgerOpen()) { closeLedger(); return; }
      if (chronicleOpen()) { closeChronicle(); return; }
      if (nationPanel.isOpen()) { nationPanel.close(); return; }
      const g = state.ctx.game;
      if (g.ui.selectedArmy != null || (g.ui.selectedArmies && g.ui.selectedArmies.length)
          || g.ui.selectedFleet != null || g.ui.selectedWing != null) clearSelectedUnits();
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

  // ------------------------------------------------------ the tools sheet --
  // A phone's topbar has room for the flag, the money, the clock and the play
  // button — and that is the whole bar. Everything else the campaign needs
  // (the chronicle, the ledger, the quill, the shelf of saved campaigns, the
  // primer, the sound) used to live in buttons this screen hides and hotkeys
  // this screen does not have, which meant a phone could not save its own
  // game. One button opens them all as a sheet of forty-eight-pixel targets.
  let toolsEl = null;
  function toolsOpen() { return !!toolsEl && !toolsEl.classList.contains('hidden'); }
  function closeTools() { if (toolsEl) toolsEl.classList.add('hidden'); }
  function toolTile(act, label, ico, hint) {
    return `<button class="tools-tile" data-tool="${act}">`
      + `<span class="tools-ico">${icon(ico)}</span>`
      + `<span class="tools-label">${esc(label)}</span>`
      + (hint ? `<span class="tools-hint">${esc(hint)}</span>` : '')
      + '</button>';
  }
  function soundState() {
    const s = window._sound;
    let music = true, sound = true;
    try {
      if (s && s.music && typeof s.music.state === 'function') music = !!s.music.state().on;
      sound = localStorage.getItem('ju_muted') !== '1';
    } catch (e) { /* defaults are fine */ }
    return { music, sound };
  }
  function renderTools() {
    if (!toolsEl) return;
    const st = soundState();
    const body = toolsEl.querySelector('[data-ref="toolsBody"]');
    if (!body) return;
    body.innerHTML = toolTile('chron', 'Chronicle', 'lamp', 'The world\'s record')
      + toolTile('ledger', 'Ledger', 'scroll', 'Every nation, ranked')
      + toolTile('help', 'How to play', 'laurel', 'The primer')
      + toolTile('save', 'Save', 'quill', 'Write this moment down')
      + toolTile('loadsave', 'Campaigns', 'amphora', 'Load a saved game')
      + toolTile('music', st.music ? 'Music on' : 'Music off', 'note', 'The score')
      + toolTile('sound', st.sound ? 'Sound on' : 'Sound off', 'speaker', 'Effects');
    body.querySelectorAll('.tools-tile').forEach((b) => {
      b.classList.toggle('off',
        (b.dataset.tool === 'music' && !st.music) || (b.dataset.tool === 'sound' && !st.sound));
    });
  }
  function toggleTools() {
    if (toolsOpen()) { closeTools(); return; }
    if (!toolsEl) {
      toolsEl = document.createElement('div');
      toolsEl.id = 'tools-sheet';
      toolsEl.innerHTML = `
        <div class="modal-scrim"></div>
        <div class="tools-card">
          <div class="tools-head"><span>The Campaign</span>
            <button class="pp-close" data-ref="toolsClose" aria-label="Close">✕</button></div>
          <div class="tools-grid" data-ref="toolsBody"></div>
        </div>`;
      document.getElementById('ui-root').appendChild(toolsEl);
      toolsEl.querySelector('.modal-scrim').addEventListener('click', closeTools);
      toolsEl.querySelector('[data-ref="toolsClose"]').addEventListener('click', closeTools);
      toolsEl.addEventListener('click', (e) => {
        const b = e.target instanceof Element ? e.target.closest('[data-tool]') : null;
        if (!b) return;
        const act = b.dataset.tool;
        try {
          if (act === 'chron') { closeTools(); toggleChronicle(); }
          else if (act === 'ledger') { closeTools(); toggleLedger(); }
          else if (act === 'help') { closeTools(); toggleHelp(); }
          else if (act === 'save') { closeTools(); state.ctx.bus.emit('saveRequest', {}); }
          else if (act === 'loadsave') { closeTools(); if (savesPanel) savesPanel.open(); }
          else if (act === 'music') {
            if (window._sound && window._sound.music) window._sound.music.toggle();
            renderTools();
          } else if (act === 'sound') {
            const on = soundState().sound;
            if (window._sound) { if (on) window._sound.mute(); else window._sound.unmute(); }
            renderTools();
          }
        } catch (err) { warnOnce('tools:' + act, err); }
      });
    }
    renderTools();
    toolsEl.classList.remove('hidden');
  }

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
              <div class="help-row"><b>Click</b> select a province, army, fleet, or air wing · <b>Shift-click</b> group armies</div>
              <div class="help-row"><b>Right-click</b> move the selected unit (air wings rebase between airfields)</div>
            </div>
            <div>
              <div class="peace-sec">The pieces</div>
              <div class="help-row">Your <b>Objectives</b> ride the outliner's campaign block and each war's overview — the era's win and loss conditions, where they are fought.</div>
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
    if (saveTools && !savesPanel) savesPanel = createSavesPanel({ DEFINES, saveTools });
    const tools = saveTools ? {
      cloudOn: saveTools.cloudOn,
      open: () => { if (savesPanel) savesPanel.open(); },
    } : null;
    // Pass the pick options through whole — dropping the third argument here
    // once silently disarmed the Veteran dial (opts carries {difficulty}).
    buildStartScreen(els.start, DEFINES, bookmarks, (bookmark, tag, opts) => {
      els.start.classList.add('hidden');
      onPick(bookmark, tag, opts);
    }, continueInfo ? {
      label: continueInfo.label,
      onContinue: () => { els.start.classList.add('hidden'); continueInfo.onContinue(); },
    } : null, tools, onMultiplayer || null, () => wiki.open());
  }

  function bindGame(ctx, actions) {
    if (state.bound) { warnOnce('bindGame', 'bindGame called twice; ignoring'); return; }
    state.bound = true;
    state.ctx = ctx;
    state.actions = actions;
    wiki.close(); // the library stays on the title screen — the campaign begins without it
    if (savesPanel) savesPanel.close();

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
      if (g.ui.selectedFleet != null && (!g.fleets || !g.fleets[g.ui.selectedFleet])) setSelectedFleet(null);
      if (g.ui.selectedWing != null && (!g.airwings || !g.airwings[g.ui.selectedWing])) setSelectedWing(null);
      topbar.refresh();
      outliner.refresh();
      panel.refresh();
      nationPanel.refresh();
      updatePill();
      refreshBattleWindow();
    }));
    bus.on('pause', safe('pause', () => { topbar.refresh(); panel.refresh(); }));
    bus.on('speed', safe('speed', () => topbar.refresh()));
    bus.on('actionTaken', safe('actionTaken', () => {
      topbar.refresh(); panel.refresh(); outliner.refresh(true); nationPanel.refresh(); updatePill();
    }));
    // A card answered anywhere comes off this table too (SPEC §216): world
    // history and a foreign court's notice are dealt to every chair, and the
    // first player to answer answers for all of them.
    bus.on('eventResolved', safe('eventResolved', (p) => eventModal.closeResolved(p && p.instanceId)));
    bus.on('recruitmentComplete', safe('recruitmentComplete', () => { panel.refresh(); outliner.refresh(true); }));
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
  function closeRemoteEvent(instanceId) { try { eventModal.closeResolved(instanceId); } catch (e) { warnOnce('remoteEventDone', e); } }
  // A multiplayer host sweeps its own chair after running a guest's order
  // (SPEC §216) — a card fired under the borrowed crown was never offered to
  // this screen.
  function rescanEvents() { try { eventModal.rescan(); } catch (e) { warnOnce('rescanEvents', e); } }

  return { showStartScreen, bindGame, showRemoteEvent, closeRemoteEvent, rescanEvents };
}
