// Headless regression — SPEC §197 (refining §188): the ideas are split by
// what unlocks them, in every bookmark.
//
// §188 moved the whole ideas block onto Coin under the Technology ladders,
// and for the chapter's Ideas of the Age the argument was airtight: every
// group is locked behind a NAMED RUNG, the lock card names it, and the rung
// it names is printed directly above. For the three universal reform trees
// the argument was only symmetry — no rung opens them, no lock card names a
// ladder; they are the realm's own constitution and belong with the realm's
// own facts. §197 splits the block: the reform trees come home to Crown, the
// Ideas of the Age keep the ladders. This suite holds the split.
//
// Three contracts:
//
//   1. THE SPLIT, EXACTLY. The reform-tree host is on Crown; the era-idea
//      host is on Coin, templated BELOW the `np-techs` host (template order
//      is render order — the tab filter only hides, it never reorders), so
//      a lock card reading "Unlocked at The Third Wall (8)" still sits
//      below the ladder that shows the 8. Each block wears its own title.
//   2. NOTHING ELSE MOVED. Every declared tab still owns a section; Crown
//      still opens with its unhidden vitals grid; and all three buy paths
//      (`data-idea`, `data-eraidea`, `data-tech`) keep their probes in the
//      delegated click chain, behind the tab probe that runs first.
//   3. EVERY ERA IDEA IS PAID BY A LADDER PRINTED ABOVE IT — IN EVERY
//      BOOKMARK. The §188 audit holds verbatim: the universal trees and
//      every chapter's era groups all price and unlock off gov/infl/mar,
//      for every playable side of every chapter. That is what keeps Coin
//      the right screen for the half of the block that stayed.
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

// The template is one string literal in build(). Each section is a wrapper
// carrying `data-tab`; a host belongs to the last wrapper opened before it.
const TEMPLATE = PANEL.slice(PANEL.indexOf('el.innerHTML = `'), PANEL.indexOf('el.querySelectorAll(\'[data-ref]\')'));
function tabOf(marker) {
  const at = TEMPLATE.indexOf(marker);
  if (at < 0) return null;
  const before = TEMPLATE.slice(0, at);
  const marks = [...before.matchAll(/data-tab="([a-z]+)"/g)];
  return marks.length ? marks[marks.length - 1][1] : null;
}
function blockTitleAbove(marker) {
  const at = TEMPLATE.indexOf(marker);
  if (at < 0) return null;
  const block = TEMPLATE.slice(TEMPLATE.lastIndexOf('<div class="pp-build', at), at);
  return (block.match(/pp-build-title[^>]*>(?:<[^>]+>)*([^<]*)</) || [])[1] || null;
}

// ---------------------------------------------------------------------------
console.log('== §197: the reform trees are on Crown, the era ideas keep the ladders ==');
{
  const reformsTab = tabOf('data-ref="reforms"');
  const erasTab = tabOf('data-ref="eraIdeas"');
  const techTab = tabOf('class="np-techs"');
  ok(reformsTab === 'crown', 'the reform-tree host is on Crown: ' + reformsTab);
  ok(techTab === 'coin', 'the Technology block is on Coin: ' + techTab);
  ok(erasTab === 'coin', 'and the Ideas of the Age stay beside it: ' + erasTab);

  // Render order is template order — the tab filter is display:none on the
  // sections of other tabs and reorders nothing — so the lock card reading
  // "Unlocked at The Third Wall (8)" sits below the ladder that shows the 8.
  const techAt = TEMPLATE.indexOf('class="np-techs"');
  const erasAt = TEMPLATE.indexOf('data-ref="eraIdeas"');
  ok(techAt > 0 && erasAt > techAt, 'the era ideas are templated BELOW the ladders');

  // Each half wears its own name now that they are two blocks.
  ok(blockTitleAbove('data-ref="reforms"') === 'Reforms',
    'the Crown block is titled Reforms: ' + blockTitleAbove('data-ref="reforms"'));
  ok(blockTitleAbove('data-ref="eraIdeas"') === 'Ideas of the Age',
    'the Coin block is titled Ideas of the Age: ' + blockTitleAbove('data-ref="eraIdeas"'));

  // The tab tooltips have to own what each tab now holds, or the strip lies
  // about where a player should look.
  const crownTT = (PANEL.match(/id: 'crown',[^\n]*tt: '([^']*)'/) || [])[1] || '';
  const coinTT = (PANEL.match(/id: 'coin',[^\n]*tt: '([^']*)'/) || [])[1] || '';
  ok(/reform/i.test(crownTT), 'the Crown tooltip claims the reforms: ' + crownTT);
  ok(/idea/i.test(coinTT), 'and the Coin tooltip claims the ideas of the age: ' + coinTT);
}

// ---------------------------------------------------------------------------
console.log('== §197: nothing else moved ==');
{
  const used = [...TEMPLATE.matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1]);
  const TAB_IDS = [...PANEL.matchAll(/^\s*\{ id: '([a-z]+)', label: '/gm)].map((m) => m[1]);
  const empty = TAB_IDS.filter((t) => used.indexOf(t) < 0);
  ok(empty.length === 0, 'every declared tab still owns a section'
    + (empty.length ? ' (' + empty.join(', ') + ')' : ' (' + TAB_IDS.length + ' tabs)'));

  // Crown must keep an anchor that renders in EVERY chapter (`tabHasContent`
  // counts a pp-grid only when a row of it is unhidden — the realm's facts
  // are unconditional, the chapter block is not).
  const crownGrid = TEMPLATE.indexOf('<div class="pp-grid" data-tab="crown">');
  ok(crownGrid > 0, 'Crown still opens with its unhidden vitals grid');
  const grid = TEMPLATE.slice(crownGrid, TEMPLATE.indexOf('</div>\n      <div', crownGrid));
  ok(/data-ref="religion"/.test(grid) && !/class="pp-row hidden"[^>]*data-ref="religion"/.test(grid),
    '  whose religion row is never hidden, so the tab cannot vanish');

  // The split is a split: the same delegated probes, the same actions.
  const clickBody = PANEL.slice(PANEL.indexOf("el.addEventListener('click'"), PANEL.indexOf('function refreshTabs'));
  ok(/closest\('\[data-idea\]'\)/.test(clickBody) && /actions\.buyIdea/.test(clickBody),
    'the reform buy path is untouched');
  ok(/closest\('\[data-eraidea\]'\)/.test(clickBody) && /actions\.buyEraIdea/.test(clickBody),
    'and so is the era-idea buy path');
  ok(/closest\('\[data-tech\]'\)/.test(clickBody) && /actions\.buyTech/.test(clickBody),
    'and the ladders the era ideas sit under still buy');
  ok(/data-tab-go/.test(clickBody.slice(0, clickBody.indexOf("closest('[data-act]"))),
    'the tab probe is still first in the chain (SPEC §175)');
}

// ---------------------------------------------------------------------------
console.log('== §188 audit: for all bookmarks, every era idea is paid by a ladder above it ==');
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
  // Both halves of the old block travel with whatever their chapters call
  // their tabs; what must not happen is a bookmark renaming one of the two
  // as though the split had not occurred.
  const coinTerm = (PANEL.match(/id: 'coin', label: '([A-Za-z]+)', term: '([A-Za-z]+)'/) || []);
  ok(coinTerm[2] === 'tabCoin', 'the era ideas\' tab reads its label from uiTerms.' + coinTerm[2]);
  const crownTerm = (PANEL.match(/id: 'crown', label: '([A-Za-z]+)', term: '([A-Za-z]+)'/) || []);
  ok(crownTerm[2] === 'tabCrown', 'and the reforms\' tab from uiTerms.' + crownTerm[2]);
  const renamed = ERAS.filter((e) => e.bookmark.uiTerms && e.bookmark.uiTerms.tabCrown);
  const missing = renamed.filter((e) => !e.bookmark.uiTerms.tabCoin).map((e) => e.bookmark.id);
  ok(!missing.length, 'every chapter that renames the tabs names both halves\' tabs'
    + (missing.length ? ' (' + missing.join(', ') + ')' : ' (' + renamed.length + ' renaming chapter(s))'));
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
