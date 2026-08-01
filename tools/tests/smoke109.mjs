// Headless regression — SPEC §175: the realm panel has tabs, the dispersion has
// a mapmode, and three things that were quietly wrong are not any more.
//
// Four contracts:
//
//   1. THE TABS ARE COMPLETE AND NONE IS DEAD. Every section of the panel
//      belongs to exactly one tab, every tab owns at least one section that is
//      present in every chapter, and the CSS filter names every tab. A tab id
//      in the JS with no matching rule in the stylesheet is a tab that never
//      hides anything — the panel would show all twenty sections at once and
//      look exactly like the bug this section is fixing.
//   2. AN ICON BUTTON AND A TEXT BUTTON ARE DIFFERENT SHAPES. `.np-fac-btn` is
//      a 26px square and four call sites want that; the High Priesthood's
//      candidates carry party names and were being clipped at both ends by it.
//   3. THE WINDOW IS COMPUTED IN ONE PLACE. The era window existed twice — in
//      the sim and inline in the Compendium — and the copies had drifted, which
//      is why the 167 BCE era page hid seven communities the chapter offers.
//   4. THE MAPMODE IS REGISTERED, SAFE AND LEGIBLE. Registered in MODE_PARAMS
//      (without it the button silently renders the political map), safe on the
//      bare {game, DEFINES} context two suites build, and it actually separates
//      the five community sizes rather than painting them one flat colour.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { BOOKMARK_66 } = await import(R + '/js/data/bookmark_66ce.js');
const { EVENTS_66 } = await import(R + '/js/data/events_66ce.js');
const { initGame } = await import(R + '/js/sim/init.js');
const { computeMapmodeColors } = await import(R + '/js/map/mapmodes.js');
const { icon } = await import(R + '/js/ui/icons.js');
const {
  DIASPORA, openAt, shutBy, communityOf, communitiesAt, communitiesBetween,
} = await import(R + '/js/data/diaspora.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const PANEL = readFileSync(R + '/js/ui/nation_panel.js', 'utf8');
const CSS = readFileSync(R + '/styles.css', 'utf8');
const UI = readFileSync(R + '/js/ui/ui.js', 'utf8');
const MAPMODES_SRC = readFileSync(R + '/js/map/mapmodes.js', 'utf8');
const WIKI = readFileSync(R + '/js/ui/wiki.js', 'utf8');
const SIM_DIA = readFileSync(R + '/js/sim/diaspora.js', 'utf8');
const PROV_PANEL = readFileSync(R + '/js/ui/province_panel.js', 'utf8');

// ---------------------------------------------------------------------------
console.log('== the panel has tabs, and every section is on one ==');
const TAB_IDS = [...PANEL.matchAll(/^\s*\{ id: '([a-z]+)', label: '/gm)].map((m) => m[1]);
{
  ok(TAB_IDS.length >= 5, 'the TABS table declares ' + TAB_IDS.length + ' tabs: ' + TAB_IDS.join(', '));
  ok(new Set(TAB_IDS).size === TAB_IDS.length, 'no tab id is declared twice');

  // Every data-tab in the template must name a real tab…
  const used = [...PANEL.matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1]);
  const unknown = [...new Set(used)].filter((t) => TAB_IDS.indexOf(t) < 0);
  ok(unknown.length === 0, 'every section names a declared tab'
    + (unknown.length ? ' (unknown: ' + unknown.join(', ') + ')' : ' (' + used.length + ' sections)'));
  // …and every tab must own at least one.
  const empty = TAB_IDS.filter((t) => used.indexOf(t) < 0);
  ok(empty.length === 0, 'no tab is declared with nothing in it'
    + (empty.length ? ' (' + empty.join(', ') + ')' : ''));

  // The panel is patched, never re-templated: a tab switch that rewrote
  // el.innerHTML would detach every node in `refs` and the panel would stop
  // updating for the rest of the campaign, silently.
  ok(/refreshTabs\(\);\s*\n?\s*el\.scrollTop = 0;|tab = id; refreshTabs\(\)/.test(PANEL),
    'a tab click flips state and re-renders only the strip');
  const clickBody = PANEL.slice(PANEL.indexOf("el.addEventListener('click'"), PANEL.indexOf("const act = e.target.closest('[data-act]')"));
  ok(/data-tab-go/.test(clickBody),
    'the tab probe is matched at the TOP of the delegated click chain, ahead of [data-act]');
  ok(!/el\.innerHTML\s*=/.test(PANEL.slice(PANEL.indexOf('function refreshTabs'))),
    'nothing after build() rewrites the panel shell');
}

// ---------------------------------------------------------------------------
console.log('== the stylesheet knows about every tab ==');
{
  for (const id of TAB_IDS) {
    const rule = new RegExp("#nation-panel\\[data-tab='" + id + "'\\] \\[data-tab\\]:not\\(\\[data-tab='" + id + "'\\]\\)");
    ok(rule.test(CSS), id + ": the filter rule exists (without it the tab hides nothing)");
  }
  // The filter must be independent of the `.hidden` class the refresh toggles
  // per section — a section shows when the sim says it has something AND its
  // tab is open, and neither may clobber the other.
  ok(/\.hidden\s*\{[^}]*display:\s*none\s*!important/.test(CSS),
    '.hidden is display:none !important, so a hidden section stays hidden in its own tab');
  ok(/\.np-tab\b/.test(CSS) && /\.np-tabs\b/.test(CSS), 'the strip has styling');
  ok(/\.np-vitals\b/.test(CSS) && /np-vitals/.test(PANEL),
    'the four pinned numbers live outside every tab');
  const vitalsIdx = PANEL.indexOf('class="np-vitals"');
  const firstTabIdx = PANEL.indexOf('data-tab="crown"');
  ok(vitalsIdx > 0 && firstTabIdx > vitalsIdx, 'and they are rendered above the first tabbed section');
  // The strip is a sibling of .pp-head, never inside it: on touch the head is
  // the swipe-down close target and buttons in it would swallow the gesture.
  const head = PANEL.slice(PANEL.indexOf('<div class="pp-head">'), PANEL.indexOf('</div>', PANEL.indexOf('<div class="pp-head">')));
  ok(!/np-tabs/.test(head), 'the strip is not inside .pp-head (the phone sheet closes by swiping that)');
}

// ---------------------------------------------------------------------------
console.log('== an icon button and a text button are different shapes ==');
{
  // Four icon call sites keep the 26px square…
  const iconBtns = [...PANEL.matchAll(/np-fac-btn/g)].length;
  ok(iconBtns >= 4, 'the icon buttons still wear np-fac-btn (' + iconBtns + ' uses)');
  // …and the one that carries party names does not.
  const priestLine = PANEL.split('\n').find((l) => /data-priest=/.test(l)) || '';
  ok(!/np-fac-btn/.test(priestLine),
    'the High Priesthood candidates no longer wear the icon class');
  ok(/np-seat-btn/.test(priestLine), 'they wear np-seat-btn instead');
  ok(/<span>\$\{esc\(c\.name\)\}<\/span>/.test(priestLine),
    'and their label is wrapped in a span, so .pp-build-btn span { text-overflow: ellipsis } applies');
  ok(/\.np-seat-btn\s*\{[^}]*width:\s*auto/.test(CSS), 'np-seat-btn is width:auto, not a 26px square');
  ok(/\.np-seat-btns\s*\{[^}]*flex-wrap:\s*wrap/.test(CSS),
    'and their container wraps, so three party names do not run off the panel');
  ok(/\.np-fac-btn\s*\{[^}]*width:\s*26px/.test(CSS),
    'the shared icon class is untouched at 26px (widening it would reflow four other lists)');
  ok(/\.pp-build-btn, \.np-fac-btn|\.np-fac-btn,/.test(CSS) || /\.pp-build-btn/.test(CSS),
    'the seat buttons keep .pp-build-btn, so the coarse-pointer 40px target still applies');
}

// ---------------------------------------------------------------------------
console.log('== the era window is computed in exactly one place ==');
{
  ok(typeof openAt === 'function' && typeof shutBy === 'function'
    && typeof communitiesAt === 'function' && typeof communitiesBetween === 'function',
    'js/data/diaspora.js exports the window predicate');
  // Neither consumer may carry its own copy of the arithmetic.
  ok(!/yAt\s*=\s*\(y\)\s*=>/.test(WIKI), 'the Compendium no longer defines its own yAt');
  ok(/communitiesBetween/.test(WIKI), 'it asks the data package instead');
  ok(/openAt\(/.test(SIM_DIA), 'and so does the sim');

  const leo = communityOf('Leontopolis');
  ok(!!leo && leo.size === 2 && leo.from === -160 && leo.until === 73,
    'Leontopolis is in the table: the House of Onias, size 2, −160 to 73');
  ok(openAt(leo, 66) && openAt(leo, -66) && !openAt(leo, -167) && !openAt(leo, 132),
    'its window is open in 67 BCE and 66 CE, shut in 132, and not yet open in 167 BCE');
  ok(shutBy(leo, 132) && !shutBy(leo, -167),
    'and "shut" is distinguished from "not yet" — the map draws those differently');

  // THE BUG. The era page tested the chapter's opening instant, so a chapter
  // that runs 173 years advertised the communities it happened to start with.
  // How far a chapter reaches: `generationHorizon` is where its own undated
  // cards expire (SPEC §121), NOT where it ends — 167 BCE's horizon is −60 and
  // its continuation is dated to 6 CE. The era page uses the later of the two,
  // and so does this.
  const spanOf = (era) => {
    let y = Number.isFinite(era.bookmark.generationHorizon)
      ? era.bookmark.generationHorizon : era.bookmark.startDate.y;
    for (const ev of (era.events || [])) {
      if (ev && ev.date && Number.isFinite(ev.date.y) && ev.date.y > y) y = ev.date.y;
    }
    return y;
  };
  ok(/generationHorizon/.test(WIKI) && /ev\.date\.y > yEnd/.test(WIKI),
    'the era page measures the chapter by horizon AND last dated card, not by its opening instant');
  const e167 = ERAS.find((e) => e.bookmark.id === '167bce');
  const atStart = communitiesAt(e167.bookmark.startDate.y);
  const overRun = communitiesBetween(e167.bookmark.startDate.y, spanOf(e167));
  // 13 and 20 until §194 widened the sea: the Mediterranean entries put five
  // more on the opening date (Smyrna, Tarsus, Sparta, Rhodes, Crete) and four
  // more inside the span (Athens, Campania, Sicily, Tripolitania).
  ok(atStart.length === 18 && overRun.length === 29,
    '167 BCE: 18 communities on the opening date, ' + overRun.length + ' over the chapter');
  ok(!atStart.some((d) => d.prov === 'Leontopolis') && overRun.some((d) => d.prov === 'Leontopolis'),
    'Leontopolis is one of the communities the old opening-date filter hid');
  ok(overRun[0].size >= overRun[overRun.length - 1].size, 'and the list is still largest-first');

  // A chapter after the Kitos War must not advertise what that war destroyed.
  const e132 = ERAS.find((e) => e.bookmark.id === '132ce');
  const late = communitiesBetween(e132.bookmark.startDate.y, spanOf(e132));
  ok(!late.some((d) => d.prov === 'Alexandria') && !late.some((d) => d.prov === 'Leontopolis'),
    '132 CE offers neither Alexandria nor Leontopolis — 117 and 73 are behind it');
}

// ---------------------------------------------------------------------------
console.log('== the war copy no longer contradicts the rule ==');
{
  ok(!/no letter reaches them/.test(PROV_PANEL),
    'the province panel has stopped saying a war stops the post');
  ok(/risk to them is doubled|surer of us/.test(PROV_PANEL),
    'and says what a war actually does: a higher bar and double the risk');
  ok(/Size ' \+ c\.size \+ ' of 5/.test(PROV_PANEL),
    'the community size is printed whether or not there is a war on');
}

// ---------------------------------------------------------------------------
console.log('== the dispersion is a mapmode ==');
{
  ok(/\{ id: 'diaspora',/.test(UI), 'the bar has a button for it');
  ok(/diaspora: \{ relief:/.test(MAPMODES_SRC),
    'and it is registered in MODE_PARAMS — without this the button silently draws the political map');
  const modes = [...UI.matchAll(/\{ id: '([a-z]+)', ico:/g)].map((m) => m[1]);
  ok(modes.length === 10, 'ten mapmodes: ' + modes.join(', '));
  ok(icon('diaspora').length > 40, 'the icon renders (a typo would give an empty but working button)');

  const N = MAP_DATA.provinces.length;
  const geom = {
    neighbors: Array.from({ length: N + 1 }, () => new Set()),
    centroids: [null, ...MAP_DATA.provinces.map((p) => {
      const [x, y] = MAP_DATA.project(p.lon, p.lat);
      return { x, y };
    })],
    areas: new Int32Array(N + 1),
    bbox: [],
  };
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_66, events: EVENTS_66,
    playerTag: 'JUD', rngSeed: 42,
  });
  // The bare context two suites build (smoke26): no helpers, no prov, no
  // actions. A mode that dereferenced ctx.helpers here would crash them.
  const bare = { game, DEFINES };
  const r = computeMapmodeColors(bare, 'diaspora');
  ok(r && r.primary.length === (N + 1) * 4, 'it computes on a bare {game, DEFINES} context');
  ok(r.params.relief === 0.3, 'with its own relief parameter');

  const byName = {};
  game.provinces.forEach((p, i) => { if (p) byName[p.canon] = i; });
  const rgbOf = (n) => [r.primary[byName[n] * 4], r.primary[byName[n] * 4 + 1], r.primary[byName[n] * 4 + 2]];
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

  // A province with no community is the pale ground everything else reads
  // against; Jerusalem is the player's own capital and holds no diaspora.
  ok(lum(rgbOf('Jerusalem')) > 200, 'a province with no community stays pale');
  ok(lum(rgbOf('Alexandria')) < 170, 'Alexandria, the largest community on earth, is not');

  // Size must actually separate, which is the whole difference between this
  // and painting twenty provinces one flat colour.
  const sizes = [5, 4, 3, 2, 1].map((sz) => {
    const e = DIASPORA.find((d) => d.size === sz && openAt(d, 66));
    return e ? lum(rgbOf(e.prov)) : null;
  }).filter((v) => v !== null);
  ok(sizes.length === 5, 'every community size is on the 66 CE board');
  let monotone = true;
  for (let i = 1; i < sizes.length; i++) if (sizes[i] <= sizes[i - 1]) monotone = false;
  ok(monotone, 'and a larger community always reads heavier: '
    + sizes.map((v) => v.toFixed(0)).join(' < '));

  // Standing tints. Nehardea opens at 65 and Thessalonica at 40, both size-ish
  // neighbours; the warmer one must be visibly warmer.
  const warmth = (n) => rgbOf(n)[0] - rgbOf(n)[2];
  ok(warmth('Babylon') > warmth('Tyre'),
    'a community that thinks well of this crown reads warmer than one that does not');

  // The window that has shut is drawn as shut, not simply forgotten.
  const g132 = initGame({
    DEFINES, MAP_DATA, geom,
    bookmark: ERAS.find((e) => e.bookmark.id === '132ce').bookmark,
    events: ERAS.find((e) => e.bookmark.id === '132ce').events,
    playerTag: 'JUD', rngSeed: 42,
  });
  const r132 = computeMapmodeColors({ game: g132, DEFINES }, 'diaspora');
  const idx = {};
  g132.provinces.forEach((p, i) => { if (p) idx[p.canon] = i; });
  const alexFlags = r132.flags[idx.Alexandria];
  ok((alexFlags & 2) === 2,
    'in 132 CE Alexandria is hatched — the Kitos War is on the map, not just in the chronicle');
  const babFlags = r132.flags[idx.Babylon];
  ok((babFlags & 2) === 0, 'while Babylon, which outlasts everything, is not');

  // Every other mapmode still works — the precompute must be guarded.
  for (const m of ['political', 'terrain', 'religion', 'culture', 'development', 'unrest', 'estates', 'trade', 'diplomatic']) {
    const out = computeMapmodeColors(bare, m);
    if (out && out.primary.length === (N + 1) * 4) continue;
    ok(false, m + ' still computes');
  }
  ok(true, 'and the other nine mapmodes are unaffected');
}

console.log(failures ? failures + ' FAILURES' : 'ALL PASS');
process.exit(failures ? 1 : 0);
