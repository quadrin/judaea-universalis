// js/ui/toasts.js — notification toasts (SPEC §8.2, bus 'notify').
import { esc, warnOnce } from './format.js';
import { icon } from './icons.js';
import { getSetting } from './settings.js';

// `murmur` is the dateline's own type (SPEC §272): the world saying something
// the player does not have to act on. It is styled down and it goes away
// sooner, because a murmur that reads like a notice is just a card with the
// buttons filed off — and six seconds of the player's eye is the wrong price
// for the grain figure at Ptolemais.
const TYPES = { info: 1, war: 1, good: 1, bad: 1, murmur: 1 };
const TYPE_ICONS = { info: 'scroll', war: 'swords', good: 'laurel', bad: 'shieldCrack', murmur: 'lamp' };
const MAX_TOASTS = 6;
const MURMUR_LIFE_MS = 4200;
const FADE_MS = 550;

export function createToasts(container, { onProvClick } = {}) {
  function push(payload) {
    if (!container) return;
    const { title, text, type, provName, persistent } = payload || {};
    const kind = TYPES[type] ? type : 'info';
    const div = document.createElement('div');
    div.className = 'toast toast-' + kind + (provName ? ' toast-link' : '') + (persistent ? ' toast-persistent' : '');
    div.innerHTML =
      `<div class="toast-title">${icon(TYPE_ICONS[kind] || 'scroll')}<span>${esc(title || 'Notice')}</span></div>` +
      (text ? `<div class="toast-text">${esc(text)}</div>` : '') + (persistent ? '<button class="toast-dismiss" aria-label="Dismiss alert">✕</button>' : '');
    if (provName) div.dataset.tt = 'Click to view ' + provName;

    let gone = false;
    const remove = () => {
      if (gone) return;
      gone = true;
      div.classList.add('toast-out');
      setTimeout(() => div.remove(), FADE_MS);
    };
    // A notice stays as long as the player asked (SPEC §289); a murmur keeps
    // its shorter life unless that is longer than the notice's.
    const life = (getSetting('toastSecs') || 6) * 1000;
    const timer = persistent ? null : setTimeout(remove, kind === 'murmur' ? Math.min(MURMUR_LIFE_MS, life) : life);
    div.querySelector('.toast-dismiss')?.addEventListener('click', e => { e.stopPropagation(); remove(); });

    div.addEventListener('click', () => {
      if (provName && onProvClick) {
        try { onProvClick(provName); } catch (e) { warnOnce('toast-click', e); }
      }
      clearTimeout(timer);
      remove();
    });

    container.appendChild(div);
    while (container.querySelectorAll('.toast:not(.toast-persistent)').length > MAX_TOASTS)
      container.querySelector('.toast:not(.toast-persistent)').remove();
  }

  return { push };
}
