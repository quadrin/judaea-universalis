// js/ui/modals.js — event modal queue + game-over modal (SPEC §8.2, §6.5).
import { esc, warnOnce } from './format.js';
import { icon, divider } from './icons.js';

// ---------------------------------------------------------------- events ---
export function createEventModal(el) {
  let ctx = null;
  let actions = null;
  let queue = [];
  let current = null;

  function bind(c, a) {
    ctx = c;
    actions = a;
    queue = [];
    current = null;
    scanPending(); // events fired during bookmark.setup, before UI subscribed
    maybeShow();
  }

  function isPlayerFor(forTag) {
    if (!ctx) return false;
    return forTag === 'player' || forTag === 'both' || forTag === ctx.game.playerTag;
  }

  function has(instanceId) {
    return (current && current.instanceId === instanceId)
      || queue.some((q) => q.instanceId === instanceId);
  }

  function scanPending() {
    if (!ctx) return;
    const pend = ctx.game.pendingEvents || [];
    for (const pe of pend) {
      if (!pe || !isPlayerFor(pe.forTag) || has(pe.instanceId)) continue;
      const ev = (ctx.events || []).find((e) => e && e.id === pe.eventId);
      if (ev) {
        queue.push({
          instanceId: pe.instanceId, event: ev,
          notice: !!pe.notice, optIdx: pe.optIdx, decider: pe.decider,
        });
      }
    }
  }

  function onBusEvent(payload) {
    if (!ctx || !payload) return;
    const { instanceId, event, forTag, notice, optIdx, decider } = payload;
    if (!isPlayerFor(forTag) || has(instanceId)) return;
    queue.push({ instanceId, event: event || {}, notice: !!notice, optIdx, decider });
    maybeShow();
  }

  function maybeShow() {
    if (current || !queue.length) return;
    current = queue.shift();
    render();
    el.classList.remove('hidden');
  }

  function render() {
    const ev = current.event || {};
    let options = Array.isArray(ev.options) && ev.options.length ? ev.options : [{ label: 'So be it.' }];
    let baseIdx = 0;
    // A foreign court's decision (SPEC §70): the card is a notice — the
    // decider's own course is already fixed, and the single button
    // acknowledges it rather than choosing for a realm that is not ours.
    let deciderLine = '';
    if (current.notice) {
      baseIdx = Number.isFinite(current.optIdx)
        ? Math.max(0, Math.min(options.length - 1, current.optIdx)) : 0;
      options = [options[baseIdx]];
      const t = ctx && ctx.game.tags && ctx.game.tags[current.decider];
      const name = (t && t.name) || current.decider || 'another court';
      deciderLine = `<div class="ev-decider">The decision belongs to ${esc(name)} — we may only take note.</div>`;
    }
    const opts = options.map((o, i) => {
      const tip = o && o.tooltip ? String(o.tooltip) : '';
      return `<button class="btn ev-opt" data-idx="${baseIdx + i}"${tip ? ` data-tt="${esc(tip)}"` : ''}>`
        + `<span class="ev-opt-label">${esc((o && o.label) || 'Continue')}</span>`
        + `</button>`;
    }).join('');
    el.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card">
        <div class="ev-orn">${divider('ev-divider')}</div>
        ${ev.world ? '<div class="ev-world">World history</div>' : ''}
        <h2 class="ev-title">${esc(ev.title || 'A Dispatch Arrives')}</h2>
        <div class="ev-desc">${esc(ev.desc || '')}</div>
        ${deciderLine}
        <div class="ev-opts">${opts}</div>
      </div>`;
    el.querySelector('.ev-opts').addEventListener('click', (e) => {
      const b = e.target instanceof Element ? e.target.closest('[data-idx]') : null;
      if (b) choose(Number(b.dataset.idx));
    });
  }

  function choose(idx) {
    if (!current) return;
    const inst = current;
    current = null;
    el.classList.add('hidden');
    el.innerHTML = '';
    try {
      if (actions && actions.chooseEventOption) actions.chooseEventOption(inst.instanceId, idx);
    } catch (e) { warnOnce('chooseEventOption', e); }
    scanPending(); // resolution may have queued follow-ups
    maybeShow();
  }

  // Read-only mirror for multiplayer guests: the same card the host sees, but
  // the choice belongs to the host — options are shown disabled, and the card
  // closes when the host's resolution arrives ({t:'eventDone'} -> closeRemote).
  let remoteQueue = [];
  function renderRemote() {
    const p = remoteQueue[0];
    if (!p) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }
    const options = Array.isArray(p.options) && p.options.length ? p.options : [{ label: 'So be it.' }];
    const opts = options.map((o) => {
      const tip = o && o.tooltip ? String(o.tooltip) : '';
      return `<button class="btn ev-opt" disabled${tip ? ` data-tt="${esc(tip)}"` : ''}>`
        + `<span class="ev-opt-label">${esc((o && o.label) || 'Continue')}</span>`
        + `</button>`;
    }).join('');
    el.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card ev-remote">
        <div class="ev-orn">${divider('ev-divider')}</div>
        ${p.world ? '<div class="ev-world">World history</div>' : ''}
        <h2 class="ev-title">${esc(p.title || 'A Dispatch Arrives')}</h2>
        <div class="ev-desc">${esc(p.desc || '')}</div>
        ${p.deciderName ? `<div class="ev-decider">The decision belongs to ${esc(p.deciderName)} — we may only take note.</div>` : ''}
        <div class="ev-opts">${opts}</div>
        <div class="ev-host-note">The host speaks for the realm…</div>
      </div>`;
    el.classList.remove('hidden');
  }
  function showRemote(p) {
    if (!p || remoteQueue.some((q) => q.instanceId === p.instanceId)) return;
    remoteQueue.push(p);
    renderRemote();
  }
  function closeRemote(instanceId) {
    if (!remoteQueue.length) return;
    remoteQueue = instanceId != null
      ? remoteQueue.filter((q) => q.instanceId !== instanceId)
      : remoteQueue.slice(1);
    renderRemote();
  }

  return { bind, onBusEvent, showRemote, closeRemote, isOpen: () => !!current || remoteQueue.length > 0 };
}

// -------------------------------------------------------------- game over ---
export function createGameoverModal(el, onContinue) {
  function show(payload) {
    const { result, title, text, score } = payload || {};
    const win = result === 'win';
    el.innerHTML = `
      <div class="modal-scrim dark"></div>
      <div class="go-card ${win ? 'go-win' : 'go-loss'}">
        <div class="go-orn">${icon(win ? 'laurel' : 'lamp', 'icon-go')}</div>
        <div class="go-verdict">${win ? 'VICTORIA' : 'DEFEAT'}</div>
        <h2 class="go-title">${esc(title || (win ? 'Victory' : 'Defeat'))}</h2>
        <div class="go-text">${esc(text || '')}</div>
        ${score != null ? `<div class="go-score">Score &nbsp;<b>${esc(String(score))}</b></div>` : ''}
        <button class="btn go-continue">Continue observing</button>
      </div>`;
    el.classList.remove('hidden');
    const btn = el.querySelector('.go-continue');
    if (btn) btn.addEventListener('click', () => {
      el.classList.add('hidden');
      if (onContinue) { try { onContinue(); } catch (e) { console.warn('[gameover] onContinue', e); } }
    });
  }

  return { show, isOpen: () => !el.classList.contains('hidden') };
}
