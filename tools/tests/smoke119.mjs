// Headless regression — SPEC §188: the ideas ride with the ladders that sell
// them, in every bookmark.
//
// §175 sorted the panel's twenty sections into six tabs by what each one IS,
// and the reform trees read as constitutional, so they went to Crown. Then
// §179 grew the same block a second half — the chapter's Ideas of the Age,
// each one locked behind a NAMED RUNG of a technology ladder — and the lock
// card ("Unlocked at The Third Wall (8)") was on one tab while the ladder that
// answers it was on another. This suite holds the move: the whole ideas block
// renders under the Technology block, on the same tab, in all eight chapters.
//
// Three contracts:
//
//   1. THE BLOCK MOVED, AND IT MOVED UNDER THE LADDERS. The `np-reforms` host
//      is on the technology tab, below the `np-techs` host in the template
//      (which is render order — the tab filter only hides, it never reorders),
//      and no section on Crown carries it any more.
//   2. NOTHING ELSE MOVED. Crown still owns a section that renders in every
//      chapter, so the tab cannot vanish under a player; every tab still owns
//      at least one section; and both buy paths (`data-idea`, `data-eraidea`)
//      are still probed in the delegated click chain, so the move is a move
//      and not a rewrite.
//   3. EVERY IDEA IS PAID BY A LADDER PRINTED ABOVE IT — IN EVERY BOOKMARK.
//      The three universal trees and every chapter's era groups all price and
//      unlock off gov/infl/mar, the three ladders the Technology block prints
//      directly above them, for every playable side of every chapter. That is
//      what makes one screen the right screen rather than a tidier one.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { IDEA_TREES } = await import(R + '/js/data/ideas.js');
const { eraIdeaGroupsFor } = await import(R + '/js/data/era_ideas.js');
const { ERAS } = await import(R + '/js/data/compendium.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const PANEL = readFileSync(R + '/js/ui/nation_panel.js', 'utf8');
const CSS = readFileSync(R + '/styles.css', 'utf8');

// The template is one string literal in build(). Each section is a wrapper
// carrying `data-tab`; a host belongs to the last wrapper opened before it.
const TEMPLATE = PANEL.slice(PANEL.indexOf('el.innerHTML = `'), PANEL.indexOf('el.querySelectorAll(\'[data-ref]\')'));
function tabOf(hostClass) {
  const at = TEMPLATE.indexOf(hostClass);
  if (at < 0) return null;
  const before = TEMPLATE.slice(0, at);
  const marks = [...before.matchAll(/data-tab="([a-z]+)"/g)];
  return marks.length ? marks[marks.length - 1][1] : null;
}

// ---------------------------------------------------------------------------
console.log('== §188: the ideas render under the ladders ==');
{
  const techTab = tabOf('class="np-techs"');
  const ideasTab = tabOf('class="np-reforms"');
  ok(techTab === 'coin', 'the Technology block is on the Coin tab: ' + techTab);
  ok(ideasTab === techTab, 'and the ideas block is on the same tab: ' + ideasTab);
  ok(ideasTab !== 'crown', 'Crown no longer carries the ideas');

  // Render order is template order — the tab filter is display:none on the
  // sections of other tabs and reorders nothing — so a lock card reading
  // "Unlocked at The Third Wall (8)" sits below the ladder that shows the 8.
  const techAt = TEMPLATE.indexOf('class="np-techs"');
  const ideasAt = TEMPLATE.indexOf('class="np-reforms"');
  ok(techAt > 0 && ideasAt > techAt, 'the ideas are templated BELOW the ladders');
  ok(!/display:\s*flex[^}]*order:/.test(CSS.slice(CSS.indexOf('.np-techs'), CSS.indexOf('.np-techs') + 200)),
    'and nothing in the stylesheet reorders them back');

  // The block title the player reads. It always sold both halves — the three
  // universal trees and the age's own groups — and under the ladders it says
  // so in the panel's own vocabulary (`data-idea`, `getIdeas`, IDEA_TREES).
  const block = TEMPLATE.slice(TEMPLATE.lastIndexOf('<div class="pp-build"', ideasAt), ideasAt);
  ok(/pp-build-title">Ideas</.test(block), 'the block is titled Ideas: '
    + (block.match(/pp-build-title">([^<]*)</) || [])[1]);

  // The Coin tab's tooltip has to own what the tab now holds, or the strip
  // lies about where a player should look.
  const coinTT = (PANEL.match(/id: 'coin',[^\n]*tt: '([^']*)'/) || [])[1] || '';
  ok(/idea/i.test(coinTT), 'and the tab tooltip says the ideas are there: ' + coinTT);
}

// ---------------------------------------------------------------------------
console.log('== §188: nothing else moved ==');
{
  const used = [...TEMPLATE.matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1]);
  const TAB_IDS = [...PANEL.matchAll(/^\s*\{ id: '([a-z]+)', label: '/gm)].map((m) => m[1]);
  const empty = TAB_IDS.filter((t) => used.indexOf(t) < 0);
  ok(empty.length === 0, 'every declared tab still owns a section'
    + (empty.length ? ' (' + empty.join(', ') + ')' : ' (' + TAB_IDS.length + ' tabs)'));

  // Crown must keep an anchor that renders in EVERY chapter, or losing the
  // ideas would let the tab itself disappear under a player (`tabHasContent`
  // counts a pp-grid only when a row of it is unhidden — the realm's facts
  // are unconditional, the chapter block is not).
  const crownGrid = TEMPLATE.indexOf('<div class="pp-grid" data-tab="crown">');
  ok(crownGrid > 0, 'Crown still opens with its unhidden vitals grid');
  const grid = TEMPLATE.slice(crownGrid, TEMPLATE.indexOf('</div>\n      <div', crownGrid));
  ok(/data-ref="religion"/.test(grid) && !/class="pp-row hidden"[^>]*data-ref="religion"/.test(grid),
    '  whose religion row is never hidden, so the tab cannot vanish');

  // The move is a move: the same delegated probes, the same actions.
  const clickBody = PANEL.slice(PANEL.indexOf("el.addEventListener('click'"), PANEL.indexOf('function refreshTabs'));
  ok(/closest\('\[data-idea\]'\)/.test(clickBody) && /actions\.buyIdea/.test(clickBody),
    'the reform buy path is untouched');
  ok(/closest\('\[data-eraidea\]'\)/.test(clickBody) && /actions\.buyEraIdea/.test(clickBody),
    'and so is the era-idea buy path');
  ok(/closest\('\[data-tech\]'\)/.test(clickBody) && /actions\.buyTech/.test(clickBody),
    'and the ladders they now sit under still buy');
  ok(/data-tab-go/.test(clickBody.slice(0, clickBody.indexOf("closest('[data-act]"))),
    'the tab probe is still first in the chain (SPEC §175)');
}

// ---------------------------------------------------------------------------
console.log('== §188: for all bookmarks, every idea is paid by a ladder above it ==');
{
  const LADDERS = ['gov', 'infl', 'mar']; // exactly what the Technology block prints
  const treePoints = Object.keys(IDEA_TREES).map((k) => IDEA_TREES[k].point);
  ok(treePoints.every((p) => LADDERS.indexOf(p) >= 0),
    'the three universal trees price off the three ladders: ' + treePoints.join('/'));

  let chapters = 0;
  let groups = 0;
  const bad = [];
  const empty = [];
  for (const era of ERAS) {
    const bm = era.bookmark;
    chapters++;
    for (const row of bm.playableTags || []) {
      const list = eraIdeaGroupsFor(bm, row.tag, null);
      if (!list.length) { empty.push(bm.id + '/' + row.tag); continue; }
      for (const gd of list) {
        groups++;
        if (LADDERS.indexOf(gd.point) < 0) bad.push(bm.id + '/' + gd.key + ' pays in ' + gd.point);
        if (!gd.unlock || LADDERS.indexOf(gd.unlock.ladder) < 0) {
          bad.push(bm.id + '/' + gd.key + ' unlocks off ' + (gd.unlock && gd.unlock.ladder));
        }
      }
    }
  }
  ok(chapters === 8, 'eight chapters checked: ' + chapters);
  ok(!empty.length, 'every playable side of every chapter has a curriculum to show'
    + (empty.length ? ' (none: ' + empty.join(', ') + ')' : ''));
  ok(!bad.length, groups + ' era-idea slots, all of them unlocked and paid by a printed ladder'
    + (bad.length ? ' (' + bad.slice(0, 4).join('; ') + ')' : ''));

  // A chapter may rename the tabs (SPEC §52) — 1948 calls Coin the Economy.
  // The ideas travel with whatever that chapter calls the tab they are on;
  // what must not happen is a bookmark renaming Crown as though they were
  // still there while the block sits somewhere else.
  const ideasTerm = (PANEL.match(/id: 'coin', label: '([A-Za-z]+)', term: '([A-Za-z]+)'/) || []);
  ok(ideasTerm[2] === 'tabCoin', 'the ideas\' tab reads its label from uiTerms.' + ideasTerm[2]);
  const renamed = ERAS.filter((e) => e.bookmark.uiTerms && e.bookmark.uiTerms.tabCrown);
  const missing = renamed.filter((e) => !e.bookmark.uiTerms.tabCoin).map((e) => e.bookmark.id);
  ok(!missing.length, 'every chapter that renames the tabs names the ideas\' tab too'
    + (missing.length ? ' (' + missing.join(', ') + ')' : ' (' + renamed.length + ' renaming chapter(s))'));
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
