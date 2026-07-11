// js/ui/startscreen.js — title screen (SPEC §8.2 / §8.3).
import { esc, rgb, rgba } from './format.js';

export function buildStartScreen(root, DEFINES, bookmark, onPick) {
  if (!root) return;
  const TAGS = (DEFINES && DEFINES.TAGS) || {};
  const playable = (bookmark && bookmark.playableTags) || [];

  const cards = playable.map((p) => {
    const def = TAGS[p.tag] || {};
    const color = rgb(def.color);
    const glow = rgba(def.color, 0.45);
    const diff = String(p.difficulty || '');
    return `
      <div class="nation-card" data-tag="${esc(p.tag)}" tabindex="0"
           style="--tagc:${color};--tagglow:${glow}">
        <div class="nc-banner">
          <span class="nc-shield">${esc(p.tag)}</span>
          <span class="nc-diff nc-diff-${esc(diff.toLowerCase())}">${esc(diff)}</span>
        </div>
        <div class="nc-body">
          <div class="nc-name">${esc(def.name || p.tag)}</div>
          ${def.description ? `<div class="nc-desc">${esc(def.description)}</div>` : ''}
          <div class="nc-blurb">${esc(p.blurb || '')}</div>
        </div>
        <div class="nc-cta">✦ &nbsp;Take up the standard&nbsp; ✦</div>
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="ss-inner">
      <div class="ss-rule">— &nbsp;✦&nbsp; —</div>
      <h1 class="ss-title">JVDAEA VNIVERSALIS</h1>
      <div class="ss-sub">The Great Revolt &nbsp;·&nbsp; 66 CE</div>
      ${bookmark && bookmark.blurb ? `<p class="ss-blurb">${esc(bookmark.blurb)}</p>` : ''}
      <div class="ss-cards">${cards}</div>
      <div class="ss-hint">Right-click moves armies &nbsp;·&nbsp; Space pauses &nbsp;·&nbsp; 1–5 sets speed</div>
    </div>`;

  delete root.dataset.picked;
  const pick = (card) => {
    if (root.dataset.picked) return;
    root.dataset.picked = '1';
    card.classList.add('picked');
    onPick(card.dataset.tag);
  };
  root.querySelectorAll('.nation-card').forEach((card) => {
    card.addEventListener('click', () => pick(card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(card); }
    });
  });
}
