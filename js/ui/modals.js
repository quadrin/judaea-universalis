// js/ui/modals.js — event modal queue + game-over modal (SPEC §8.2, §6.5).
import { esc, warnOnce } from './format.js';
import { icon, divider } from './icons.js';
import { entryFork } from '../data/chapter_paths.js';

// A fork card wears its badge as it is dealt (SPEC §184): if this event is an
// entry of the §119 path tree, the chip above the title says the road forks
// here, and the tooltip asks the fork's own question. Read off the tree
// itself, so the badge can never disagree with the chains.
function forkBadgeHtml(chapterId, eventId) {
  try {
    const fk = entryFork(chapterId, eventId);
    if (!fk) return '';
    const tt = fk.question + '\n――――――\nA turning of the age: '
      + fk.roads + (fk.roads === 1 ? ' road opens' : ' roads part') + ' here. '
      + 'Where each one leads is charted in the Chronicle — The Road Not Taken.';
    return `<div class="ev-fork" data-tt="${esc(tt)}">${icon('split', 'icon-xs')} The road forks here</div>`;
  } catch (e) { warnOnce('forkBadge', e); return ''; }
}

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
      // Runtime-synthesized cards (ultimatums, estate demands) live in
      // dynEvents rather than the chapter's list, and a rescan has to find
      // them there or they are pending forever.
      const ev = (ctx.dynEvents && ctx.dynEvents.get(pe.eventId))
        || (ctx.events || []).find((e) => e && e.id === pe.eventId);
      if (ev) {
        queue.push({
          instanceId: pe.instanceId, event: ev,
          notice: !!pe.notice, optIdx: pe.optIdx, decider: pe.decider,
          allowed: pe.allowed,
        });
      }
    }
  }

  function onBusEvent(payload) {
    if (!ctx || !payload) return;
    const { instanceId, event, forTag, notice, optIdx, decider, allowed } = payload;
    if (!isPlayerFor(forTag) || has(instanceId)) return;
    queue.push({ instanceId, event: event || {}, notice: !!notice, optIdx, decider, allowed });
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
    // The answers this world offers (SPEC §128). The mask was fixed when the
    // card fired, so an option cannot close while the player reads. Indices
    // stay the originals — the button carries the real index, not its
    // position in a filtered list, because that index is what resolves.
    let idxOf = (i) => baseIdx + i;
    if (!current.notice && Array.isArray(current.allowed) && current.allowed.length) {
      const mask = current.allowed.filter((i) => options[i]);
      if (mask.length) {
        idxOf = (i) => mask[i];
        options = mask.map((i) => options[i]);
      }
    }
    const opts = options.map((o, i) => {
      const tip = o && o.tooltip ? String(o.tooltip) : '';
      return `<button class="btn ev-opt" data-idx="${idxOf(i)}"${tip ? ` data-tt="${esc(tip)}"` : ''}>`
        + `<span class="ev-opt-label">${esc((o && o.label) || 'Continue')}</span>`
        + `</button>`;
    }).join('');
    const chapterId = (ctx && ctx.bookmark && ctx.bookmark.id) || (ctx && ctx.game && ctx.game.bookmarkId) || '';
    el.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card">
        <div class="ev-orn">${divider('ev-divider')}</div>
        ${ev.world ? '<div class="ev-world">World history</div>' : ''}
        ${forkBadgeHtml(chapterId, ev.id)}
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

  // The card as it reaches a multiplayer guest. Two shapes, and the host
  // decides which by deciding who sits where (SPEC §216):
  //
  //   shared throne — a read-only mirror of the host's own card. The host
  //     holds that realm's pen, so the options are disabled and the card
  //     closes when the host's resolution arrives ({t:'eventDone'}).
  //   their own throne (`mine`) — the buttons are live. Nobody else is in
  //     that chair to answer for them, and the answer travels back as an
  //     ordinary command that the host runs under their crown.
  //
  // Either way the effects never crossed the wire: the button reports the
  // event's OWN option index, which is what resolves on the host's side.
  let remoteQueue = [];
  function renderRemote() {
    const p = remoteQueue[0];
    if (!p) {
      // A card of our own may be waiting underneath — one that was already
      // pending in the world we joined. Emptying the relayed queue must give
      // that card the table back, not blank it.
      if (current) { render(); el.classList.remove('hidden'); return; }
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }
    const mine = p.mine === true;
    const options = Array.isArray(p.options) && p.options.length ? p.options : [{ label: 'So be it.' }];
    const opts = options.map((o, i) => {
      const tip = o && o.tooltip ? String(o.tooltip) : '';
      const idx = o && Number.isFinite(o.idx) ? o.idx : i;
      return `<button class="btn ev-opt"${mine ? ` data-idx="${idx}"` : ' disabled'}`
        + `${tip ? ` data-tt="${esc(tip)}"` : ''}>`
        + `<span class="ev-opt-label">${esc((o && o.label) || 'Continue')}</span>`
        + `</button>`;
    }).join('');
    // The host resolved the fork badge before sending (SPEC §184) — a guest
    // has no chapter context of its own, only the question the host passed.
    const remoteFork = p.fork && p.fork.question
      ? `<div class="ev-fork" data-tt="${esc(p.fork.question)}">${icon('split', 'icon-xs')} The road forks here</div>` : '';
    el.innerHTML = `
      <div class="modal-scrim"></div>
      <div class="ev-card${mine ? '' : ' ev-remote'}">
        <div class="ev-orn">${divider('ev-divider')}</div>
        ${p.world ? '<div class="ev-world">World history</div>' : ''}
        ${remoteFork}
        <h2 class="ev-title">${esc(p.title || 'A Dispatch Arrives')}</h2>
        <div class="ev-desc">${esc(p.desc || '')}</div>
        ${p.deciderName ? `<div class="ev-decider">The decision belongs to ${esc(p.deciderName)} — we may only take note.</div>` : ''}
        <div class="ev-opts">${opts}</div>
        ${mine ? '' : '<div class="ev-host-note">The host speaks for the realm…</div>'}
      </div>`;
    if (mine) {
      el.querySelector('.ev-opts').addEventListener('click', (e) => {
        const b = e.target instanceof Element ? e.target.closest('[data-idx]') : null;
        if (b) chooseRemote(p.instanceId, Number(b.dataset.idx));
      });
    }
    el.classList.remove('hidden');
  }
  // Our own card, answered from our own chair: the choice leaves for the host
  // (`actions` is the proxy in multiplayer) and the card comes off the table
  // here rather than waiting for the round trip to close it.
  function chooseRemote(instanceId, idx) {
    remoteQueue = remoteQueue.filter((q) => q.instanceId !== instanceId);
    renderRemote();
    try {
      if (actions && actions.chooseEventOption) actions.chooseEventOption(instanceId, idx);
    } catch (e) { warnOnce('chooseRemoteOption', e); }
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

  // Deal whatever is standing in our chair that we have not been dealt. The
  // host runs a guest's order under that guest's crown (SPEC §216), and a card
  // fired inside that window was emitted while the bus said somebody else was
  // the player — so the queue never heard about it. One sweep afterwards is
  // the whole of the repair.
  function rescan() {
    scanPending();
    maybeShow();
  }

  // Somebody else answered it. World history and a foreign court's notice go
  // to every chair at a multiplayer table and the first click resolves them
  // for everybody (SPEC §216) — so a card that is no longer pending must come
  // off THIS table too, whether we were holding it as our own or mirroring it.
  function closeResolved(instanceId) {
    if (instanceId == null) return;
    closeRemote(instanceId);
    queue = queue.filter((q) => q.instanceId !== instanceId);
    if (current && current.instanceId === instanceId) {
      current = null;
      el.classList.add('hidden');
      el.innerHTML = '';
      maybeShow();
      if (!current) renderRemote(); // a relayed card may be waiting behind it
    }
  }

  return {
    bind, onBusEvent, showRemote, closeRemote, closeResolved, rescan,
    isOpen: () => !!current || remoteQueue.length > 0,
  };
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
