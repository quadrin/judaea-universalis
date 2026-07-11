// js/ui/toasts.js — notification toasts (SPEC §8.2, bus 'notify').
import { esc, warnOnce } from './format.js';

const TYPES = { info: 1, war: 1, good: 1, bad: 1 };
const MAX_TOASTS = 6;
const LIFE_MS = 6000;
const FADE_MS = 550;

export function createToasts(container, { onProvClick } = {}) {
  function push(payload) {
    if (!container) return;
    const { title, text, type, provName } = payload || {};
    const kind = TYPES[type] ? type : 'info';
    const div = document.createElement('div');
    div.className = 'toast toast-' + kind + (provName ? ' toast-link' : '');
    div.innerHTML =
      `<div class="toast-title">${esc(title || 'Notice')}</div>` +
      (text ? `<div class="toast-text">${esc(text)}</div>` : '');
    if (provName) div.dataset.tt = 'Click to view ' + provName;

    let gone = false;
    const remove = () => {
      if (gone) return;
      gone = true;
      div.classList.add('toast-out');
      setTimeout(() => div.remove(), FADE_MS);
    };
    const timer = setTimeout(remove, LIFE_MS);

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
