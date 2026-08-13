// Headless regression — SPEC §203: the realm panel's last three sections are
// filed by what they ARE, and the tab that sells the ladders is named after
// them.
//
// §175 cut twenty sections into tabs and §198 finished the ideas; three
// things were still filed by where they were first written rather than by
// their subject. The doctrine needles sat under the Host because a war is
// what usually moves them — but they are a portrait of the realm, not a fact
// about the army. The world's way of doing things sat on The World among the
// treaties — but an institution this realm has refused is a surcharge on
// every rung of every ladder and nothing else; the red banner announcing it
// was on one tab and the list answering it on another. And the tab holding
// the ladders was called Coin (Economy in 1948), named for the purse that
// pays rather than for what a player opens it to do.
//
// Four contracts:
//
//   1. THE TAB IS NAMED FOR THE LADDERS. `id: 'tech'`, label Technology,
//      term `tabTech`; the stylesheet's filter names it; nothing anywhere
//      still says `coin`, in the panel, the stylesheet, or a bookmark's
//      `uiTerms` — a stale term key re-dresses a tab that no longer reads it.
//   2. THE CHARACTER OF THE REALM IS ON CROWN. The doctrine host resolves to
//      Crown, templated with the realm's own facts and above the Reforms it
//      reads next to; the title still comes from `uiTerms.character`, so
//      1948 still calls it the National Character.
//   3. THE WORLD'S WAY OF DOING THINGS IS FOLDED IN UNDER THE LADDERS. The
//      institutions host resolves to the technology tab, sits BELOW the
//      `np-techs` host (template order is render order) and INSIDE the same
//      block as the era ideas — one title, two subheads — and the World tab
//      no longer carries it. The surcharge banner stops sending the player
//      to another tab, and the embrace path keeps its probe.
//   4. NOTHING WENT BLANK. Every declared tab still owns a section; the two
//      tabs that lost one keep an anchor that renders in every chapter (the
//      Host its unhidden vitals grid, The World its Diplomacy block); and
//      the folded block hides only when BOTH halves have hidden themselves.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { ERAS } = await import(R + '/js/data/compendium.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const PANEL = readFileSync(R + '/js/ui/nation_panel.js', 'utf8');
const CSS = readFileSync(R + '/styles.css', 'utf8');
const TEMPLATE = PANEL.slice(PANEL.indexOf('el.innerHTML = `'), PANEL.indexOf('el.querySelectorAll(\'[data-ref]\')'));

// A host belongs to its own wrapper's `data-tab` when the tag carries one —
// attribute order inside a tag is nobody's contract — and otherwise to the
// last wrapper opened before it (smoke119's reading of the same template).
function tabOf(marker) {
  const at = TEMPLATE.indexOf(marker);
  if (at < 0) return null;
  const tag = TEMPLATE.slice(TEMPLATE.lastIndexOf('<', at), TEMPLATE.indexOf('>', at) + 1);
  const own = /data-tab="([a-z]+)"/.exec(tag);
  if (own) return own[1];
  const marks = [...TEMPLATE.slice(0, at).matchAll(/data-tab="([a-z]+)"/g)];
  return marks.length ? marks[marks.length - 1][1] : null;
}
function blockTitleAbove(marker) {
  const at = TEMPLATE.indexOf(marker);
  if (at < 0) return null;
  const block = TEMPLATE.slice(TEMPLATE.lastIndexOf('<div class="pp-build', at), at);
  return (block.match(/pp-build-title[^>]*>(?:<[^>]+>)*([^<]*)</) || [])[1] || null;
}
const TAB_IDS = [...PANEL.matchAll(/^\s*\{ id: '([a-z]+)', label: '/gm)].map((m) => m[1]);

// ---------------------------------------------------------------------------
console.log('== the tab is named for the ladders, not for the purse ==');
{
  ok(TAB_IDS.indexOf('tech') >= 0 && TAB_IDS.indexOf('coin') < 0,
    'the strip declares `tech` and no longer declares `coin`: ' + TAB_IDS.join(', '));
  const row = (PANEL.match(/\{ id: 'tech', label: '([A-Za-z]+)', term: '([A-Za-z]+)'/) || []);
  ok(row[1] === 'Technology', 'and calls it ' + row[1]);
  ok(row[2] === 'tabTech', 'reading a chapter\'s own name for it from uiTerms.' + row[2]);
  ok(new RegExp("#nation-panel\\[data-tab='tech'\\] \\[data-tab\\]:not\\(\\[data-tab='tech'\\]\\)").test(CSS),
    'the stylesheet filters on the new id (without the rule the tab hides nothing)');
  ok(!/data-tab='coin'/.test(CSS), 'and no longer filters on the old one');
  ok(!/data-tab="coin"/.test(PANEL) && !/tabCoin/.test(PANEL),
    'nothing in the panel still says coin');

  // The purse did not move — it is still the first thing on the tab, because
  // what a level costs and what the realm can pay are one question.
  ok(tabOf('data-ref="treasuryRow"') === 'tech' && tabOf('data-ref="ledgerBlock"') === 'tech',
    'the treasury row and the ledger stayed where they were, under the new name');

  // A chapter may still re-dress the tab; none currently does, and none may
  // be left pointing at the retired key.
  const stale = ERAS.filter((e) => e.bookmark.uiTerms && e.bookmark.uiTerms.tabCoin).map((e) => e.bookmark.id);
  ok(!stale.length, 'no bookmark carries the retired tabCoin term'
    + (stale.length ? ' (' + stale.join(', ') + ')' : ''));
  const b1948 = ERAS.find((e) => e.bookmark.id === '1948ce');
  // tabWar went the same way as tabCoin, for the same reason (SPEC §245): the
  // two words meant the same thing. The dresses that remain each mark a real
  // difference between a throne and a republic.
  ok(b1948 && b1948.bookmark.uiTerms && !b1948.bookmark.uiTerms.tabWar
    && b1948.bookmark.uiTerms.tabWorld === 'Abroad',
    '1948 keeps the dresses it still needs, and no longer re-dresses the war tab');
}

// ---------------------------------------------------------------------------
console.log('== the character of the realm is on Crown ==');
{
  ok(tabOf('data-ref="doctrineBlock"') === 'crown',
    'the doctrine host resolves to Crown: ' + tabOf('data-ref="doctrineBlock"'));
  ok(blockTitleAbove('data-ref="doctrine"') === 'The Character of the Realm',
    'under its own title: ' + blockTitleAbove('data-ref="doctrine"'));
  ok(/setText\(refs\.characterTitle, terms\.character \|\| 'The Character of the Realm'\)/.test(PANEL),
    'and the title is still read from uiTerms.character (1948: National Character)');
  const c1948 = (ERAS.find((e) => e.bookmark.id === '1948ce') || {}).bookmark;
  ok(c1948 && c1948.uiTerms && c1948.uiTerms.character === 'National Character',
    '  which 1948 still sets: ' + (c1948 && c1948.uiTerms && c1948.uiTerms.character));

  // Template order is render order: the needles read against the realm's own
  // facts above them and the constitution below them.
  const facts = TEMPLATE.indexOf('data-ref="religion"');
  const needles = TEMPLATE.indexOf('data-ref="doctrineBlock"');
  const reforms = TEMPLATE.indexOf('data-ref="reforms"');
  ok(facts > 0 && needles > facts && reforms > needles,
    'drawn after the realm\'s facts and before the reforms');

  // A foreign court's convictions are its business — the block is templated
  // hidden and the refresh hides it again for anyone but us.
  ok(/<div class="pp-build hidden" data-ref="doctrineBlock"/.test(TEMPLATE),
    'the block starts hidden, so a chapter without doctrine axes never flashes it');
  ok(/if \(!self\) refs\.doctrineBlock\.classList\.add\('hidden'\)/.test(PANEL),
    'and a foreign court still hides it');
}

// ---------------------------------------------------------------------------
console.log('== the world\'s way of doing things folds in under the ladders ==');
{
  ok(tabOf('data-ref="instBlock"') === 'tech',
    'the institutions host resolves to the technology tab: ' + tabOf('data-ref="instBlock"'));
  const ladders = TEMPLATE.indexOf('class="np-techs"');
  const inst = TEMPLATE.indexOf('data-ref="instBlock"');
  const eras = TEMPLATE.indexOf('data-ref="eraIdeasBlock"');
  ok(ladders > 0 && inst > ladders, 'templated BELOW the ladders it surcharges');
  ok(eras > inst, 'and above the chapter\'s own ideas');
  ok(blockTitleAbove('data-ref="institutions"') === 'Ideas of the Age'
    && blockTitleAbove('data-ref="eraIdeas"') === 'Ideas of the Age',
    'both halves sit inside ONE block, titled Ideas of the Age');
  ok(/data-ref="instTitle">The World’s Way of Doing Things</.test(TEMPLATE)
    && /class="np-age-sub"[^>]*data-ref="eraIdeasTitle"/.test(TEMPLATE),
    'each half keeps its own subhead — a spread to embrace is not a tier to buy');
  ok(/\.np-age-sub\s*\{/.test(CSS) && /\.np-age-part \+ \.np-age-part\s*\{/.test(CSS),
    'the stylesheet knows the subhead and the gap between the halves');

  // The World keeps the treaties and loses the ladder tax.
  const world = TEMPLATE.slice(TEMPLATE.indexOf('data-tab="world"'));
  ok(!/data-ref="institutions"/.test(world), 'The World no longer carries the institutions');

  // The banner and the list are one screen now, so the banner stops giving
  // directions to another one.
  ok(!/see The World tab/.test(PANEL), 'the surcharge banner stops pointing at another tab');
  ok(/under Ideas of the Age/.test(PANEL), 'and points at the block below it instead');

  // Folding a section in must not fold its lever out.
  const clickBody = PANEL.slice(PANEL.indexOf("el.addEventListener('click'"), PANEL.indexOf('function refreshTabs'));
  ok(/closest\('\[data-embrace\]'\)/.test(clickBody) && /actions\.embraceInstitution/.test(clickBody),
    'the embrace path keeps its probe in the delegated chain');
}

// ---------------------------------------------------------------------------
console.log('== nothing went blank ==');
{
  const used = [...TEMPLATE.matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1]);
  const unknown = [...new Set(used)].filter((t) => TAB_IDS.indexOf(t) < 0);
  const empty = TAB_IDS.filter((t) => used.indexOf(t) < 0);
  ok(!unknown.length, 'every section names a declared tab'
    + (unknown.length ? ' (' + unknown.join(', ') + ')' : ''));
  ok(!empty.length, 'and every declared tab still owns one'
    + (empty.length ? ' (' + empty.join(', ') + ')' : ' (' + TAB_IDS.length + ' tabs)'));

  // `tabHasContent` counts a pp-grid only when one of its rows is unhidden,
  // so the two tabs that lost a block need an anchor that is never hidden.
  const hostGrid = TEMPLATE.indexOf('<div class="pp-grid" data-tab="war">');
  const hostEnd = TEMPLATE.indexOf('data-tab=', hostGrid + 40);
  const hostRows = TEMPLATE.slice(hostGrid, hostEnd).match(/<div class="pp-row"/g) || [];
  ok(hostRows.length >= 3, 'the Host keeps ' + hostRows.length + ' unhidden rows — the tab cannot vanish');
  ok(/<div class="pp-diplo" data-tab="world">/.test(TEMPLATE),
    'and The World keeps its Diplomacy block, which is never hidden');

  // The block is present exactly when a half is. An OR here (or a toggle
  // inside either half) would leave an empty title behind on a chapter with
  // no institutions and a foreign court with no era ideas.
  const toggleAt = PANEL.indexOf("refs.ageBlock.classList.toggle('hidden'");
  const toggle = toggleAt < 0 ? '' : PANEL.slice(toggleAt, PANEL.indexOf(';', toggleAt));
  ok(/refs\.instBlock\.classList\.contains\('hidden'\)/.test(toggle)
    && /refs\.eraIdeasBlock\.classList\.contains\('hidden'\)/.test(toggle)
    && toggle.includes('&&') && !toggle.includes('||'),
    'the folded block hides only when BOTH halves have hidden themselves');
  const order = ['refreshInstitutions(self)', 'refreshEraIdeas(t, self)', 'refs.ageBlock.classList.toggle'];
  const at = order.map((s) => PANEL.indexOf(s));
  ok(at.every((i) => i > 0) && at[2] > at[1] && at[1] > at[0],
    'and it is decided after both halves have had their say');
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
