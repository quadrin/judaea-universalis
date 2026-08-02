// Headless regression — SPEC §204: the last two sections join §203's sort.
//
// §203 filed the doctrine needles, the institutions and the tab name itself
// by subject rather than by where they were first written. Two sections were
// left over.
//
// The Chapters block sat on Crown, which is the realm's own facts — faith,
// tongue, capital, government. A chapter is not a fact about the realm; it is
// what history is asking of it this century, which is the question the
// mission tree answers in the other tense. They are one tab now.
//
// The patterns line, the milestone strip and the arms pipeline sat under the
// ladders because the ladders buy them. What they describe is the ARMY — what
// the three arms muster as, which rung musters the next pattern, and who
// sells the aircraft and armor a realm cannot forge — so they render on the
// Host, and the military card keeps a one-line answer to the only question a
// buyer has at the moment of buying: what does the next rung muster?
//
// Four contracts:
//
//   1. THE CHAPTERS ARE WITH THE MISSIONS. The chapter host resolves to the
//      missions tab and is templated ABOVE the tree; Crown's tooltip stops
//      claiming it and the Missions tooltip claims it; the block is still
//      player-only and still starts hidden.
//   2. THE PATTERNS ARE ON THE HOST. The patterns host resolves to the war
//      tab under its own title, below the vitals grid; the milestone strip is
//      built there and NOT inside the ladder card; the unit line and the arms
//      line go with it; and a foreign court's one line goes there too.
//   3. THE LADDER STILL SAYS WHAT IT BUYS. The military card's tooltip names
//      the pattern the next rung musters and points at the Host in the
//      chapter's own word for that tab (`uiTerms.tabWar` — Defence in 1948).
//   4. ONE FETCH, AND NOTHING WENT BLANK. `getTech()` is still called once a
//      pass for both hosts; the patterns block hides when there is nothing to
//      draw; Crown and the Host both keep an anchor that renders in every
//      chapter; and every declared tab still owns a section.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { ERAS } = await import(R + '/js/data/compendium.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const PANEL = readFileSync(R + '/js/ui/nation_panel.js', 'utf8');
const TEMPLATE = PANEL.slice(PANEL.indexOf('el.innerHTML = `'), PANEL.indexOf('el.querySelectorAll(\'[data-ref]\')'));
const TAB_IDS = [...PANEL.matchAll(/^\s*\{ id: '([a-z]+)', label: '/gm)].map((m) => m[1]);
// A host belongs to its own wrapper's `data-tab` when it has one — attribute
// order inside the tag is nobody's contract, so read the whole opening tag
// first — and otherwise to the last wrapper opened before it.
function tabOf(marker) {
  const at = TEMPLATE.indexOf(marker);
  if (at < 0) return null;
  const tag = TEMPLATE.slice(TEMPLATE.lastIndexOf('<', at), TEMPLATE.indexOf('>', at) + 1);
  const own = /data-tab="([a-z]+)"/.exec(tag);
  if (own) return own[1];
  const marks = [...TEMPLATE.slice(0, at).matchAll(/data-tab="([a-z]+)"/g)];
  return marks.length ? marks[marks.length - 1][1] : null;
}
// The rows of one `pp-grid`, counted to the start of the next section.
function gridRows(tab) {
  const at = TEMPLATE.indexOf('<div class="pp-grid" data-tab="' + tab + '">');
  if (at < 0) return 0;
  const next = TEMPLATE.indexOf('data-tab=', at + 40);
  return (TEMPLATE.slice(at, next < 0 ? undefined : next).match(/<div class="pp-row"/g) || []).length;
}
function blockTitleAbove(marker) {
  const at = TEMPLATE.indexOf(marker);
  if (at < 0) return null;
  const block = TEMPLATE.slice(TEMPLATE.lastIndexOf('<div class="pp-build', at), at);
  return (block.match(/pp-build-title[^>]*>(?:<[^>]+>)*([^<]*)</) || [])[1] || null;
}
// The body of refreshTech, which is where both halves of the report are now
// written — one to `refs.tech`, one through `setPatterns`.
const TECH_FN = PANEL.slice(PANEL.indexOf('function refreshTech('), PANEL.indexOf('function setPatterns('));

// ---------------------------------------------------------------------------
console.log('== the chapter is with the missions, not with the realm\'s facts ==');
{
  ok(tabOf('data-ref="chapterBlock"') === 'missions',
    'the chapter host resolves to the missions tab: ' + tabOf('data-ref="chapterBlock"'));
  const chapter = TEMPLATE.indexOf('data-ref="chapterBlock"');
  const tree = TEMPLATE.indexOf('data-ref="missionsBlock"');
  ok(chapter > 0 && tree > chapter,
    'templated above the tree — the century first, then the era\'s whole offer');
  ok(blockTitleAbove('data-ref="chapter"') === 'The Chapters',
    'under its own title: ' + blockTitleAbove('data-ref="chapter"'));
  ok(/<div class="pp-build hidden" data-ref="chapterBlock"/.test(TEMPLATE)
    && /if \(!self\) refs\.chapterBlock\.classList\.add\('hidden'\)/.test(PANEL),
    'still starts hidden and is still the player\'s alone');
  ok(/setText\(refs\.chaptersTitle, terms\.chapters \|\| 'The Chapters'\)/.test(PANEL),
    'and still reads its title from uiTerms.chapters (1948: National Programmes)');

  const crownTT = (PANEL.match(/id: 'crown',[^\n]*tt: '([^']*)'/) || [])[1] || '';
  const missionsTT = (PANEL.match(/id: 'missions',[^\n]*tt: '([^']*)'/) || [])[1] || '';
  ok(!/chapter/i.test(crownTT), 'the Crown tooltip stops claiming the chapter: ' + crownTT);
  ok(/chapter/i.test(missionsTT) && /mission/i.test(missionsTT),
    'and the Missions tooltip claims both: ' + missionsTT);

  // Crown may not go blank: its vitals grid is unconditional, and the two
  // blocks it keeps render for anyone.
  ok(TEMPLATE.indexOf('<div class="pp-grid" data-tab="crown">') > 0,
    'Crown still opens with its unhidden vitals grid');
  ok(tabOf('data-ref="reforms"') === 'crown' && tabOf('data-ref="doctrineBlock"') === 'crown',
    '  and still holds the reforms and the character (SPEC §198/§203)');
}

// ---------------------------------------------------------------------------
console.log('== the patterns, the milestones and the pipeline are on the Host ==');
{
  ok(tabOf('data-ref="patternsBlock"') === 'war',
    'the patterns host resolves to the war tab: ' + tabOf('data-ref="patternsBlock"'));
  ok(blockTitleAbove('data-ref="patterns"') === 'How We Muster',
    'under a title that reads in every century: ' + blockTitleAbove('data-ref="patterns"'));
  const grid = TEMPLATE.indexOf('<div class="pp-grid" data-tab="war">');
  ok(grid > 0 && TEMPLATE.indexOf('data-ref="patternsBlock"') > grid,
    'below the host\'s own numbers');

  // The strip is built for the Host block and nowhere else. Left inside the
  // ladder card it would render on Technology whatever the template said.
  const strips = [...PANEL.matchAll(/milestoneStrip\(/g)].length;
  ok(strips === 2, 'milestoneStrip is defined once and called once: ' + strips + ' mentions');
  ok(/setPatterns\(unitLine \+ milestoneStrip\(info\) \+ armsLine\)/.test(PANEL),
    'and the call is the Host block\'s: patterns, milestones, pipeline, in that order');
  ok(!/np-techrow[\s\S]{0,900}milestoneStrip/.test(TECH_FN),
    'the ladder card no longer carries the strip');
  ok(!/np-techrow[\s\S]{0,900}Arms supplier/.test(TECH_FN),
    'nor the arms pipeline');

  // A foreign court showed exactly one of these lines and still does.
  const foreign = TECH_FN.slice(TECH_FN.indexOf('if (!self)'), TECH_FN.indexOf('let info = null'));
  ok(/setHtml\(refs\.tech, rows\)/.test(foreign) && /setPatterns\(/.test(foreign),
    'a foreign court\'s levels go to the ladders and its patterns to the Host');
  ok(/getArmsStatus/.test(PANEL) && !/getArmsStatus/.test(foreign),
    '  and no foreign arms pipeline is invented (§181 is ours to see)');
}

// ---------------------------------------------------------------------------
console.log('== the ladder still says what the next rung buys ==');
{
  ok(/Military \$\{info\.unit\.nextAt\} musters \$\{info\.unit\.nextInf\}/.test(PANEL),
    'the military card names the pattern the next rung musters');
  ok(/uiTerms\) \|\| \{\}\)\.tabWar \|\| 'Host'/.test(PANEL),
    'and points at the Host in the chapter\'s own word for that tab');
  const w1948 = (ERAS.find((e) => e.bookmark.id === '1948ce') || {}).bookmark;
  ok(w1948 && w1948.uiTerms && w1948.uiTerms.tabWar === 'Defence',
    '  which in 1948 is Defence: ' + (w1948 && w1948.uiTerms && w1948.uiTerms.tabWar));
  // The line is only on the ladder that musters anything.
  ok(/r\.key === 'mar' && info\.unit && info\.unit\.nextAt != null/.test(PANEL),
    'only the military ladder says it, and only while a newer pattern exists');
}

// ---------------------------------------------------------------------------
console.log('== one fetch a pass, and nothing went blank ==');
{
  const fetches = [...PANEL.matchAll(/actions\.getTech\(\)/g)].length;
  ok(fetches === 1, 'getTech() is called once a refresh for both hosts: ' + fetches);
  const setP = PANEL.slice(PANEL.indexOf('function setPatterns('), PANEL.indexOf('function milestoneStrip('));
  ok(/refs\.patternsBlock\.classList\.toggle\('hidden', !html\)/.test(setP),
    'the patterns block hides itself when there is nothing to draw');
  ok(/if \(!refs\.patterns\) return/.test(setP),
    'and fails soft on a panel built without it');
  ok(/setPatterns\(''\)/.test(PANEL),
    'a sim with no tech report clears it rather than leaving yesterday\'s patterns up');

  const used = [...TEMPLATE.matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1]);
  const empty = TAB_IDS.filter((t) => used.indexOf(t) < 0);
  ok(!empty.length, 'every declared tab still owns a section'
    + (empty.length ? ' (' + empty.join(', ') + ')' : ' (' + TAB_IDS.length + ' tabs)'));
  ok(gridRows('war') >= 3, 'the Host keeps its ' + gridRows('war') + ' unhidden rows above the new block');
  ok(gridRows('crown') >= 6, 'and Crown its ' + gridRows('crown') + ' — neither tab leans on a block to exist');
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
