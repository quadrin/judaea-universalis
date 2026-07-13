// js/ui/startscreen.js — title screen (SPEC §8.2 / §8.3, §13).
// Two steps: pick a bookmark (era), then pick a nation within it.
import { esc, rgb, rgba, fmtYear } from './format.js';
import { icon, divider, flagChip } from './icons.js';

export function buildStartScreen(root, DEFINES, bookmarks, onPick, continueInfo, saveTools) {
  if (!root) return;
  const TAGS = (DEFINES && DEFINES.TAGS) || {};
  const list = Array.isArray(bookmarks) ? bookmarks : [bookmarks];

  function shell(inner) {
    return `
    <div class="ss-inner">
      <div class="ss-rule">${divider()}</div>
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
        <div class="nc-cta">${icon('star4', 'icon-xs')} &nbsp;Open this chapter&nbsp; ${icon('star4', 'icon-xs')}</div>
      </div>`).join('');
    const tools = saveTools ? `
      <div class="ss-savetools">
        ${continueInfo && saveTools.onExport ? '<button class="ss-back ss-tool" data-ref="export">Export save</button>' : ''}
        ${saveTools.onImport ? '<button class="ss-back ss-tool" data-ref="import">Import save</button>' : ''}
      </div>` : '';
    root.innerHTML = shell(`
      <div class="ss-sub">Choose a bookmark</div>
      <div class="ss-cards">${cards}</div>
      ${continueInfo ? `<button class="ss-continue">${icon('star4', 'icon-xs')} &nbsp;Continue — ${esc(continueInfo.label)}&nbsp; ${icon('star4', 'icon-xs')}</button>` : ''}
      ${tools}`);
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
    // Save tools: export downloads the newest save as a file; import reads one
    // back (localStorage is fragile, especially on phones).
    const expBtn = root.querySelector('[data-ref="export"]');
    if (expBtn && saveTools && saveTools.onExport) {
      expBtn.addEventListener('click', () => {
        const out = saveTools.onExport(); // {filename, json} | null
        if (!out) return;
        const blob = new Blob([out.json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = out.filename || 'judaea-save.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      });
    }
    const impBtn = root.querySelector('[data-ref="import"]');
    if (impBtn && saveTools && saveTools.onImport) {
      impBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', () => {
          const f = input.files && input.files[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => {
            const ok = saveTools.onImport(String(reader.result || ''));
            impBtn.textContent = ok ? 'Save imported ✓' : 'Not a valid save file';
            if (ok) setTimeout(() => window.location.reload(), 500);
          };
          reader.readAsText(f);
        });
        input.click();
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
            <span class="nc-shield">${flagChip(p.tag, DEFINES, 34)}<span class="nc-shield-tag">${esc(p.tag)}</span></span>
            <span class="nc-diff nc-diff-${esc(diff.toLowerCase())}">${esc(diff)}</span>
          </div>
          <div class="nc-body">
            <div class="nc-name">${esc(def.name || p.tag)}</div>
            ${def.description ? `<div class="nc-desc">${esc(def.description)}</div>` : ''}
            <div class="nc-blurb">${esc(p.blurb || '')}</div>
          </div>
          <div class="nc-cta">${icon('star4', 'icon-xs')} &nbsp;Take up the standard&nbsp; ${icon('star4', 'icon-xs')}</div>
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
