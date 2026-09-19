// js/ui/toasts.js — notification toasts (SPEC §8.2, bus 'notify').
import { esc, warnOnce } from './format.js';
import { icon } from './icons.js';

// `murmur` is the dateline's own type (SPEC §272): the world saying something
// the player does not have to act on. It is styled down and it goes away
// sooner, because a murmur that reads like a notice is just a card with the
// buttons filed off — and six seconds of the player's eye is the wrong price
// for the grain figure at Ptolemais.
const TYPES = { info: 1, war: 1, good: 1, bad: 1, murmur: 1 };
const TYPE_ICONS = { info: 'scroll', war: 'swords', good: 'laurel', bad: 'shieldCrack', murmur: 'lamp' };
const MAX_TOASTS = 6;
const LIFE_MS = 6000;
const MURMUR_LIFE_MS = 4200;
const FADE_MS = 550;

export function createToasts(container, { onProvClick } = {}) {
  function push(payload) {
    if (!container) return;
    const { title, text, type, provName } = payload || {};
    const kind = TYPES[type] ? type : 'info';
    const div = document.createElement('div');
    div.className = 'toast toast-' + kind + (provName ? ' toast-link' : '');
    div.innerHTML =
      `<div class="toast-title">${icon(TYPE_ICONS[kind] || 'scroll')}<span>${esc(title || 'Notice')}</span></div>` +
      (text ? `<div class="toast-text">${esc(text)}</div>` : '');
    if (provName) div.dataset.tt = 'Click to view ' + provName;

    let gone = false;
    const remove = () => {
      if (gone) return;
      gone = true;
      div.classList.add('toast-out');
      setTimeout(() => div.remove(), FADE_MS);
    };
    const timer = setTimeout(remove, kind === 'murmur' ? MURMUR_LIFE_MS : LIFE_MS);

    div.addEventListener('click', () => {
      if (provName && onProvClick) {
        try { onProvClick(provName); } catch (e) { warnOnce('toast-click', e); }
      }
      clearTimeout(timer);
      remove();
    });

    container.appendChild(div);
    while (container.children.length > MAX_TOASTS) container.firstChild.remove();
  }

  return { push };
}
