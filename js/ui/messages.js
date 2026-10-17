import { getSetting } from './settings.js';
import { normalizeMessageModes, messageCategory } from './message_policy.js';
import { esc } from './format.js';
import { isHostile, truceActive } from '../sim/military.js';

export function createMessages({ getCtx, getActions, toasts }) {
  let popup = null, pending = [], threats = new Set(), truces = new Set();
  function closePopup() { if (popup) popup.remove(); popup = null; showPopup(); }
  function showPopup() {
    if (popup || !pending.length) return;
    const p = pending.shift();
    popup = document.createElement('div');
    popup.id = 'message-modal'; popup.className = 'campaign-modal';
    popup.innerHTML = `<div class="modal-scrim"></div><div class="ev-card peace-card" role="dialog" aria-modal="true" aria-label="${esc(p.title || 'Notice')}">
      <h2>${esc(p.title || 'Notice')}</h2><p>${esc(p.text || '')}</p><button class="btn" data-dismiss>Dismiss</button></div>`;
    document.getElementById('ui-root').appendChild(popup);
    popup.querySelector('[data-dismiss]').addEventListener('click', closePopup);
    popup.querySelector('[data-dismiss]').focus();
  }
  function push(p) {
    const mode = normalizeMessageModes(getSetting('messages'))[messageCategory(p)];
    if (mode === 'off') return;
    if (mode === 'pause') {
      const ctx = getCtx();
      if (ctx && !ctx.game.paused) getActions()?.togglePause();
    }
    if (mode === 'popup') {
      pending.push(p); showPopup();
    } else toasts.push({ ...p, persistent: mode === 'persistent' || mode === 'pause' });
  }
  function reset() {
    pending = []; if (popup) popup.remove(); popup = null; threats = new Set();
    const ctx = getCtx();
    truces = new Set(Object.keys(ctx?.game.truces || {}).filter(k => k.split('|').includes(ctx.game.playerTag)
      && truceActive(ctx, ...k.split('|'))));
  }
  function scan() {
    const ctx = getCtx(); if (!ctx) return;
    const g = ctx.game, me = g.playerTag, current = new Set();
    for (const a of Object.values(g.armies || {})) {
      if (!a.path?.length || a.retreating || !isHostile(ctx, me, a.tag)) continue;
      const p = ctx.byId(a.path[0]);
      if (!p || p.owner !== me || a.moveDaysLeft > 5) continue;
      const key = `${a.id}:${p.id}`; current.add(key);
      if (!threats.has(key)) push({ category: 'movement', title: 'An enemy approaches', type: 'bad',
        text: `${a.name || g.tags[a.tag]?.name || a.tag} is approaching ${p.name}.`, provName: p.name });
    }
    threats = current;
    const active = new Set();
    for (const key of Object.keys(g.truces || {})) {
      const tags = key.split('|'); if (!tags.includes(me)) continue;
      if (truceActive(ctx, ...tags)) active.add(key);
      else if (truces.has(key)) {
        const other = tags.find(t => t !== me);
        push({ category: 'truce', title: 'A truce expires', type: 'info', text: `Our truce with ${g.tags[other]?.name || other} has expired.` });
      }
    }
    truces = active;
  }
  return { push, scan, reset, isOpen: () => !!popup, close: closePopup };
}
