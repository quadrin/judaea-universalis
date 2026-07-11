// js/ui/modals.js — event modal queue + game-over modal (SPEC §8.2, §6.5).
import { esc, warnOnce } from './format.js';

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
      if (ev) queue.push({ instanceId: pe.instanceId, event: ev });
    }
  }

  function onBusEvent(payload) {
    if (!ctx || !payload) return;
    const { instanceId, event, forTag } = payload;
    if (!isPlayerFor(forTag) || has(instanceId)) return;
    queue.push({ instanceId, event: event || {} });
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
    const options = Array.isArray(ev.options) && ev.options.length ? ev.options : [{ label: 'So be it.' }];
    const opts = options.map((o, i) =>
      `<button class="btn ev-opt" data-idx="${i}"${o && o.tooltip ? ` data-tt="${esc(o.tooltip)}"` : ''}>${esc((o && o.label) || 'Continue')}</button>`
    ).join('');
    el.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card">
        <div class="ev-orn">✦</div>
        <h2 class="ev-title">${esc(ev.title || 'A Dispatch Arrives')}</h2>
        <div class="ev-desc">${esc(ev.desc || '')}</div>
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

  return { bind, onBusEvent, isOpen: () => !!current };
}

// -------------------------------------------------------------- game over ---
export function createGameoverModal(el, onContinue) {
  function show(payload) {
    const { result, title, text, score } = payload || {};
    const win = result === 'win';
    el.innerHTML = `
      <div class="modal-scrim dark"></div>
      <div class="go-card ${win ? 'go-win' : 'go-loss'}">
        <div class="go-orn">${win ? '🏆' : '🕯'}</div>
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
