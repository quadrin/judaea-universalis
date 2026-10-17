// Ideas panel: reforms and era groups share one tab; technology keeps its ladders.
// The existing purchase probes and every bookmark's point/unlock contracts hold.
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
console.log('== reforms and era ideas share the Ideas tab ==');
{
  ok(tabOf('data-ref="reforms"') === 'ideas', 'reforms are on Ideas');
  ok(tabOf('data-ref="eraIdeas"') === 'ideas', 'era groups are on Ideas');
  ok(tabOf('class="np-techs"') === 'tech', 'ladders stay on Technology');
  ok(blockTitleAbove('data-ref="reforms"') === 'Reforms', 'reforms keep their heading');
  ok(blockTitleAbove('data-ref="eraIdeas"') === 'Ideas of the Age', 'era groups keep their heading');
  const ideasTT = (PANEL.match(/id: 'ideas',[^\n]*tt: '([^']*)'/) || [])[1] || '';
  ok(/reform/i.test(ideasTT) && /idea/i.test(ideasTT), 'Ideas describes both kinds of group');
}

// ---------------------------------------------------------------------------
console.log('== §198: nothing else moved ==');
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
  // Nine until SPEC §268 added the Iron Age three.
  ok(chapters === 12, 'twelve chapters checked: ' + chapters);
  ok(!empty.length, 'every playable side of every chapter has a curriculum to show'
    + (empty.length ? ' (none: ' + empty.join(', ') + ')' : ''));
  ok(!bad.length, groups + ' era-idea slots, all of them unlocked and paid by a printed ladder'
    + (bad.length ? ' (' + bad.slice(0, 4).join('; ') + ')' : ''));

  // A chapter may rename the tabs (SPEC §52). Both halves of the old block
  // travel with whatever their chapters call their tabs, and each half must
  // read its label from a term key that exists — a tab pointed at a key no
  // bookmark can set is a tab no chapter can dress.
  const techTerm = (PANEL.match(/id: 'tech', label: '([A-Za-z]+)', term: '([A-Za-z]+)'/) || []);
  ok(techTerm[1] === 'Technology' && techTerm[2] === 'tabTech',
    'the technology tab is ' + techTerm[1] + ', read from uiTerms.' + techTerm[2]);
  const crownTerm = (PANEL.match(/id: 'crown', label: '([A-Za-z]+)', term: '([A-Za-z]+)'/) || []);
  ok(crownTerm[2] === 'tabCrown', 'and the Crown tab from uiTerms.' + crownTerm[2]);
  // §203 retired `tabCoin`: the tab is named for the ladders and every
  // chapter calls those the same thing. A bookmark still carrying the old
  // key would be re-dressing a tab that no longer reads it — silently.
  const TERMS = [...PANEL.matchAll(/term: '([A-Za-z]+)'/g)].map((m) => m[1]);
  const stale = ERAS.filter((e) => e.bookmark.uiTerms)
    .flatMap((e) => Object.keys(e.bookmark.uiTerms)
      .filter((k) => /^tab[A-Z]/.test(k) && TERMS.indexOf(k) < 0)
      .map((k) => e.bookmark.id + '.' + k));
  ok(!stale.length, 'no chapter re-dresses a tab the strip no longer reads'
    + (stale.length ? ' (' + stale.join(', ') + ')' : ' (' + TERMS.length + ' live term keys)'));
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
