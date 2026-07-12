// js/ui/startscreen.js — title screen (SPEC §8.2 / §8.3, §13).
// Two steps: pick a bookmark (era), then pick a nation within it.
import { esc, rgb, rgba, fmtYear } from './format.js';

export function buildStartScreen(root, DEFINES, bookmarks, onPick, continueInfo) {
  if (!root) return;
  const TAGS = (DEFINES && DEFINES.TAGS) || {};
  const list = Array.isArray(bookmarks) ? bookmarks : [bookmarks];

  function shell(inner) {
    return `
    <div class="ss-inner">
      <div class="ss-rule">— &nbsp;✦&nbsp; —</div>
      <h1 class="ss-title">JVDAEA VNIVERSALIS</h1>
      ${inner}
      <div class="ss-hint">Right-click moves armies &nbsp;·&nbsp; Space pauses &nbsp;·&nbsp; 1–5 sets speed</div>
    </div>`;
  }

  function renderBookmarks() {
    const cards = list.map((b, i) => `
      <div class="bm-card" data-bm="${i}" tabindex="0">
        <div class="bm-year">${esc(fmtYear(b.startDate.y))}</div>
        <div class="bm-name">${esc(b.name)}</div>
        <div class="bm-blurb">${esc(b.blurb || '')}</div>
        <div class="nc-cta">✦ &nbsp;Open this chapter&nbsp; ✦</div>
      </div>`).join('');
    root.innerHTML = shell(`
      <div class="ss-sub">Choose a bookmark</div>
      <div class="ss-cards">${cards}</div>
      ${continueInfo ? `<button class="ss-continue">✦ &nbsp;Continue — ${esc(continueInfo.label)}&nbsp; ✦</button>` : ''}`);
    root.querySelectorAll('.bm-card').forEach((card) => {
      const open = () => renderNations(list[Number(card.dataset.bm)]);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
    const cont = root.querySelector('.ss-continue');
    if (cont && continueInfo && continueInfo.onContinue) {
      cont.addEventListener('click', () => {
        if (root.dataset.picked) return;
        root.dataset.picked = '1';
        continueInfo.onContinue();
      });
    }
  }

  function renderNations(bookmark) {
    const playable = (bookmark && bookmark.playableTags) || [];
    const cards = playable.map((p) => {
      const def = TAGS[p.tag] || {};
      const diff = String(p.difficulty || '');
      return `
        <div class="nation-card" data-tag="${esc(p.tag)}" tabindex="0"
             style="--tagc:${rgb(def.color)};--tagglow:${rgba(def.color, 0.45)}">
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
    root.innerHTML = shell(`
      <div class="ss-sub">${esc(bookmark.name)} &nbsp;·&nbsp; ${esc(fmtYear(bookmark.startDate.y))}</div>
      ${bookmark.blurb ? `<p class="ss-blurb">${esc(bookmark.blurb)}</p>` : ''}
      <div class="ss-cards">${cards}</div>
      <button class="ss-back">← All bookmarks</button>`);
    const pick = (card) => {
      if (root.dataset.picked) return;
      root.dataset.picked = '1';
      card.classList.add('picked');
      onPick(bookmark, card.dataset.tag);
    };
    root.querySelectorAll('.nation-card').forEach((card) => {
      card.addEventListener('click', () => pick(card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(card); }
      });
    });
    root.querySelector('.ss-back').addEventListener('click', renderBookmarks);
  }

  delete root.dataset.picked;
  renderBookmarks();
}
