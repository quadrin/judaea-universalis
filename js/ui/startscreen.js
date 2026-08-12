// js/ui/startscreen.js — title screen (SPEC §8.2 / §8.3, §13).
// Two steps: pick a bookmark (era), then pick a nation within it.
import { esc, rgb, rgba, fmtYear } from './format.js';
import { icon, divider, flagChip } from './icons.js';
import { campaignGuidance } from '../data/campaign_guidance.js';
import { tagDef } from '../sim/military.js';

export function buildStartScreen(root, DEFINES, bookmarks, onPick, continueInfo, saveTools, onMultiplayer, onWiki) {
  if (!root) return;
  const list = Array.isArray(bookmarks) ? bookmarks : [bookmarks];

  function shell(inner) {
    return `
    <div class="ss-inner">
      <div class="ss-rule">${divider()}</div>
      <h1 class="ss-title">JVDAEA VNIVERSALIS</h1>
      ${inner}
      <div class="ss-hint">Right-click moves armies &nbsp;·&nbsp; Space pauses &nbsp;·&nbsp; 1–5 sets speed &nbsp;·&nbsp; H for help in-game</div>
    </div>`;
  }

  // Which bookmark the carousel shows; survives bookmark->nations->back trips.
  let bmIndex = 0;
  // The challenge dial: 'normal' or 'hard' (veteran AI). Survives back-trips.
  let challenge = 'normal';

  function renderBookmarks() {
    const cards = list.map((b, i) => `
      <div class="ss-slide"><div class="bm-card" data-bm="${i}" tabindex="0">
        <div class="bm-year">${esc(fmtYear(b.startDate.y))}</div>
        <div class="bm-name">${esc(b.name)}</div>
        <div class="bm-blurb">${esc(b.blurb || '')}</div>
        <div class="nc-cta">${icon('star4', 'icon-xs')} &nbsp;Open this chapter&nbsp; ${icon('star4', 'icon-xs')}</div>
      </div></div>`).join('');
    const dots = list.map((b, i) =>
      `<button class="ss-dot" data-dot="${i}" aria-label="${esc(b.name)}" data-tt="${esc(b.name)}"></button>`).join('');
    const tools = (saveTools || onMultiplayer || onWiki) ? `
      <div class="ss-savetools">
        ${onMultiplayer ? '<button class="ss-back ss-tool ss-mp" data-ref="mp">⚔ Multiplayer</button>' : ''}
        ${onWiki ? '<button class="ss-back ss-tool" data-ref="wiki">📖 Compendium</button>' : ''}
        ${saveTools && saveTools.open ? '<button class="ss-back ss-tool" data-ref="saves">▤ Saved campaigns</button>' : ''}
      </div>` : '';
    root.innerHTML = shell(`
      <div class="ss-sub">Choose a bookmark</div>
      <div class="ss-carousel">
        <button class="ss-arrow ss-prev" aria-label="Previous chapter">‹</button>
        <div class="ss-viewport"><div class="ss-track">${cards}</div></div>
        <button class="ss-arrow ss-next" aria-label="Next chapter">›</button>
      </div>
      <div class="ss-dots">${dots}</div>
      ${continueInfo ? `<button class="ss-continue">${icon('star4', 'icon-xs')} &nbsp;Continue — ${esc(continueInfo.label)}&nbsp; ${icon('star4', 'icon-xs')}</button>` : ''}
      ${tools}`);

    const track = root.querySelector('.ss-track');
    const cardEls = [...root.querySelectorAll('.bm-card')];
    const dotEls = [...root.querySelectorAll('.ss-dot')];
    const go = (i) => {
      bmIndex = ((i % list.length) + list.length) % list.length; // wrap both ways
      track.style.transform = `translateX(${-bmIndex * 100}%)`;
      cardEls.forEach((c, k) => c.classList.toggle('current', k === bmIndex));
      dotEls.forEach((d, k) => d.classList.toggle('on', k === bmIndex));
    };
    root.querySelector('.ss-prev').addEventListener('click', () => go(bmIndex - 1));
    root.querySelector('.ss-next').addEventListener('click', () => go(bmIndex + 1));
    dotEls.forEach((d) => d.addEventListener('click', () => go(Number(d.dataset.dot))));
    root.addEventListener('keydown', (e) => {
      if (!root.querySelector('.ss-track')) return; // left the bookmark step
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(bmIndex - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(bmIndex + 1); }
    });
    // touch swipe on the viewport
    const vp = root.querySelector('.ss-viewport');
    let swipeX = null;
    vp.addEventListener('touchstart', (e) => { if (e.touches.length === 1) swipeX = e.touches[0].clientX; }, { passive: true });
    vp.addEventListener('touchend', (e) => {
      if (swipeX == null) return;
      const dx = (e.changedTouches[0] ? e.changedTouches[0].clientX : swipeX) - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 40) go(bmIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
    go(bmIndex);

    cardEls.forEach((card) => {
      const open = () => {
        const i = Number(card.dataset.bm);
        if (i !== bmIndex) { go(i); return; } // a peeked/offset card slides into place first
        renderNations(list[i]);
      };
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
    // Saves are a shelf, not a file: the panel lists every campaign this
    // player has (cloud first, this device second) and loads any of them.
    // Nothing is downloaded and nothing is uploaded by hand.
    const savesBtn = root.querySelector('[data-ref="saves"]');
    if (savesBtn && saveTools && saveTools.open) {
      savesBtn.addEventListener('click', () => saveTools.open());
    }
    const mpBtn = root.querySelector('[data-ref="mp"]');
    if (mpBtn && onMultiplayer) mpBtn.addEventListener('click', onMultiplayer);
    const wikiBtn = root.querySelector('[data-ref="wiki"]');
    if (wikiBtn && onWiki) wikiBtn.addEventListener('click', onWiki);
  }

  function renderNations(bookmark) {
    const playable = (bookmark && bookmark.playableTags) || [];
    const cards = playable.map((p) => {
      // The chapter's own name for the court, where it has one (SPEC §139):
      // the roster must offer the standard the campaign will actually fly.
      const def = tagDef({ DEFINES, bookmark }, p.tag);
      const diff = String(p.difficulty || '');
      const guide = campaignGuidance(bookmark.id, p.tag, bookmark.startDate);
      const objectives = bookmark.objectives && Array.isArray(bookmark.objectives[p.tag])
        ? bookmark.objectives[p.tag] : [];
      const opening = guide && guide.opening.length
        ? `<div class="nc-plan"><div class="nc-plan-title">First moves · ${esc(guide.system)}</div><ol>${guide.opening.map((line) => `<li>${esc(line)}</li>`).join('')}</ol></div>`
        : '';
      const objective = objectives.length
        ? `<div class="nc-contract"><b>Campaign contract</b><span>${esc(objectives[0])}</span>${objectives.find((line) => /^Lose:/.test(line)) ? `<span class="neg">${esc(objectives.find((line) => /^Lose:/.test(line)))}</span>` : ''}</div>`
        : '';
      const pressure = guide && guide.next
        ? `<div class="nc-pressure">${icon('alert', 'icon-xs')} First pressure: ${esc(guide.next.label)} · ${guide.next.months} month${guide.next.months === 1 ? '' : 's'}</div>`
        : '';
      return `
        <div class="nation-card" data-tag="${esc(p.tag)}" tabindex="0"
             style="--tagc:${rgb(def.color)};--tagglow:${rgba(def.color, 0.45)}">
          <div class="nc-banner">
            <span class="nc-shield">${flagChip(p.tag, DEFINES, 34, false, null, def)}<span class="nc-shield-tag">${esc(p.tag)}</span></span>
            <span class="nc-diff nc-diff-${esc(diff.toLowerCase().replace(/\s+/g, '-'))}">${esc(diff)}</span>
          </div>
          <div class="nc-body">
            <div class="nc-name">${esc(def.name || p.tag)}</div>
            ${def.description ? `<div class="nc-desc">${esc(def.description)}</div>` : ''}
            <div class="nc-blurb">${esc(p.blurb || '')}</div>
            ${opening}
            ${objective}
            ${pressure}
          </div>
          <div class="nc-cta">${icon('star4', 'icon-xs')} &nbsp;Take up the standard&nbsp; ${icon('star4', 'icon-xs')}</div>
        </div>`;
    }).join('');
    root.innerHTML = shell(`
      <div class="ss-sub">${esc(bookmark.name)} &nbsp;·&nbsp; ${esc(fmtYear(bookmark.startDate.y))}</div>
      ${bookmark.blurb ? `<p class="ss-blurb">${esc(bookmark.blurb)}</p>` : ''}
      <div class="ss-challenge">
        <span class="ss-challenge-label">The challenge</span>
        <button class="ss-chal-opt${challenge === 'normal' ? ' on' : ''}" data-chal="normal"
          data-tt="The world as written: every court plays by the same rules.">Normal</button>
        <button class="ss-chal-opt${challenge === 'hard' ? ' on' : ''}" data-chal="hard"
          data-tt="Veteran: every rival court fights and earns like a hardened power — AI discipline +5%, AI income & manpower +25%.">Veteran</button>
      </div>
      <div class="ss-cards">${cards}</div>
      <button class="ss-back">← All bookmarks</button>`);
    const pick = (card) => {
      if (root.dataset.picked) return;
      root.dataset.picked = '1';
      card.classList.add('picked');
      onPick(bookmark, card.dataset.tag, { difficulty: challenge });
    };
    root.querySelectorAll('.ss-chal-opt').forEach((b) => b.addEventListener('click', () => {
      challenge = b.dataset.chal === 'hard' ? 'hard' : 'normal';
      root.querySelectorAll('.ss-chal-opt').forEach((o) =>
        o.classList.toggle('on', o.dataset.chal === challenge));
    }));
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
