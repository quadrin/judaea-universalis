// Headless regression — SPEC §88: the second act knows which realm won.
//
// §83's sandbox chapters asked every winner the same four questions, which
// made the second act a checklist. The doctrine axes already know what KIND
// of realm took the bookmark, so a chapter can be addressed to it: a zealous
// crown is set to purifying the land, an accommodating one to keeping the
// communities quiet, a court that faces east to keeping the covenant it
// chose, and any realm sitting on land it took in war to the hardest
// diplomatic objective in the game — closing that wound without giving the
// land back. This suite holds the gates, the evaluators, and the promise
// that an undecided realm still gets the generic ladder it always had.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_614 } = await import(R + '/js/data/bookmark_614ce.js');
const { initGame, makeCtx, simHelpers: helpers } = await import(R + '/js/sim/init.js');
const { changeOwnerCore, changeControllerCore, recordGrudge } = await import(R + '/js/sim/military.js');
const { monthlyOpinionDrift } = await import(R + '/js/sim/unrest.js');
const { monthlyChapters, chapterView } = await import(R + '/js/sim/chapters.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const N = MAP_DATA.provinces.length;
const fakeGeom = {
  neighbors: Array.from({ length: N + 1 }, () => new Set()),
  centroids: [null, ...MAP_DATA.provinces.map((p) => {
    const [x, y] = MAP_DATA.project(p.lon, p.lat);
    return { x, y };
  })],
  areas: new Int32Array(N + 1), bbox: [], coastal: [], offshore: [],
};
const bus = { emit() {}, on() { return () => {}; } };

// A won bookmark with the grace already spent — the state the second act
// actually opens in.
function won(playerTag = 'JUD') {
  const g = initGame({
    DEFINES, MAP_DATA, geom: fakeGeom, bookmark: BOOKMARK_614, events: [],
    playerTag, rngSeed: 5,
  });
  const ctx = makeCtx({
    game: g, DEFINES, MAP_DATA, geom: fakeGeom, bus, bookmark: BOOKMARK_614, events: [],
  });
  g.result = 'win';
  g.tags[playerTag].ai = false;
  return { g, ctx };
}
// Arm the system and run it forward until a chapter exists.
function openChapter(ctx, g) {
  monthlyChapters(ctx);            // arms
  g.chapters.graceLeft = 0;
  monthlyChapters(ctx);            // generates
  return g.chapters.active;
}
const kindsOf = (a) => a.objectives.map((o) => o.kind);

console.log('== an undecided realm gets the ladder it always had ==');
{
  const { g, ctx } = won();
  const a = openChapter(ctx, g);
  ok(!!a, 'a chapter opens');
  ok(a.objectives.length === 3, 'three objectives: territorial, internal, diplomatic');
  const doctrineOnly = ['purified', 'swordMeasure', 'communities', 'undoubted', 'chamber', 'covenant', 'ledgers'];
  ok(!kindsOf(a).some((k) => doctrineOnly.indexOf(k) >= 0),
    'and none of them is a doctrine objective: ' + kindsOf(a).join(', '));
  ok(!/:/.test(a.epigraph) || !/undecided/i.test(a.epigraph),
    'the epigraph does not claim a character the realm has not got');
}

console.log('== a zealous realm is set to purifying the land ==');
{
  const { g, ctx } = won();
  helpers.doctrine(ctx, 'zeal', 6);
  const a = openChapter(ctx, g);
  ok(kindsOf(a)[0] === 'purified', 'the territorial objective is The Purified Land');
  ok(/one altar/i.test(a.objectives[0].desc), 'and it says so');
  ok(/zealous/i.test(a.epigraph), 'the epigraph names the realm: ' + a.epigraph.slice(-40));
}

console.log('== an accommodating realm is set to keeping the peace ==');
{
  const { g, ctx } = won();
  helpers.doctrine(ctx, 'zeal', -6);
  // The objective only exists for a realm that actually rules somebody else's
  // congregations — which is the whole point of it.
  let heterodox = 0;
  for (let i = 1; i < g.provinces.length && heterodox < 2; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== 'JUD') continue;
    if (p.religion === g.tags.JUD.religion) { p.religion = 'zoroastrianism'; heterodox++; }
  }
  ok(heterodox === 2, 'the realm rules two heterodox provinces');
  const a = openChapter(ctx, g);
  ok(kindsOf(a)[1] === 'communities', 'the internal objective is The Peace of the Communities');
  // ...and being rid of the provinces is not how it is passed.
  const o = a.objectives[1];
  const t = g.tags.JUD;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === 'JUD' && p.religion !== t.religion) changeOwnerCore(ctx, p, 'SAS');
  }
  monthlyChapters(ctx);
  ok(!o.done, 'emptying the realm of other faiths does not complete it');
}

console.log('== a martial realm is measured in fresh ground ==');
{
  const { g, ctx } = won();
  helpers.doctrine(ctx, 'conquest', 6);
  const a = openChapter(ctx, g);
  ok(kindsOf(a)[0] === 'swordMeasure', 'the territorial objective is The Sword\'s Own Measure');
  const o = a.objectives[0];
  ok(Array.isArray(o.params.baseline) && o.params.baseline.length > 0,
    'it snapshots what we held when the chapter opened');
  // Ground held at the start does not count; ground taken since does.
  monthlyChapters(ctx);
  ok(o.have === 0, 'holding what we already held is worth nothing');
  let added = 0;
  for (let i = 1; i < g.provinces.length && added < o.need; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.controller === 'JUD') continue;
    changeOwnerCore(ctx, p, 'JUD');
    changeControllerCore(ctx, p, 'JUD');
    added++;
  }
  monthlyChapters(ctx);
  ok(o.have >= o.need, 'ground taken since the chapter opened counts');
}

console.log('== a mercantile realm is asked for its ledgers ==');
{
  const { g, ctx } = won();
  helpers.doctrine(ctx, 'conquest', -6);
  const a = openChapter(ctx, g);
  ok(kindsOf(a)[2] === 'ledgers', 'the diplomatic objective is The Ledgers of the Age');
  const o = a.objectives[2];
  g.tags.JUD.income = o.params.income + 5;
  g.tags.JUD.atWarWith = ['SAS'];
  g.tags.SAS.atWarWith = ['JUD'];
  monthlyChapters(ctx);
  ok(o.holdMonths === 0, 'the income alone is not enough — a war voids it');
  g.tags.JUD.atWarWith = []; g.tags.SAS.atWarWith = [];
  monthlyChapters(ctx);
  ok(o.holdMonths === 1, 'income and peace together start the clock');
}

console.log('== a crowned realm must leave no question about the throne ==');
{
  const { g, ctx } = won();
  helpers.doctrine(ctx, 'authority', 6);
  const a = openChapter(ctx, g);
  ok(kindsOf(a)[1] === 'undoubted', 'the internal objective is The Undoubted Crown');
  const o = a.objectives[1];
  const t = g.tags.JUD;
  t.legitimacy = 95;
  t.heir = { name: 'An Heir', gov: 2, infl: 2, mar: 2, age: 20 };
  t.regency = false;
  monthlyChapters(ctx);
  ok(o.holdMonths === 1, 'a full crown with an heir counts');
  g.pretenders = { JUD: { claimant: 'Someone', heldMonths: 0 } };
  monthlyChapters(ctx);
  ok(o.holdMonths === 0, 'a claimant in the field (SPEC §87) resets it');
}

console.log('== a conciliar realm must govern rather than fight ==');
{
  const { g, ctx } = won();
  helpers.doctrine(ctx, 'authority', -6);
  const a = openChapter(ctx, g);
  ok(kindsOf(a)[1] === 'chamber', 'the internal objective is The Chamber Sits');
  const o = a.objectives[1];
  g.tags.JUD.stability = 2;
  // 614 opens mid-war; the objective is about what comes after.
  for (const k of Object.keys(g.tags)) g.tags[k].atWarWith = [];
  monthlyChapters(ctx);
  ok(o.holdMonths === 1, 'peace and stability tick it along');
  g.tags.JUD.atWarWith = ['SAS'];
  g.tags.SAS.atWarWith = ['JUD'];
  monthlyChapters(ctx);
  ok(o.holdMonths === 0, 'a war anywhere breaks it');
}

console.log('== the mended quarrel: §86 as an objective ==');
{
  const { g, ctx } = won();
  helpers.doctrine(ctx, 'alignment', -4); // the Return keeps Persia's friendship
  g.tags.JUD.allies = (g.tags.JUD.allies || []).filter((k) => k !== 'SAS');
  g.tags.SAS.allies = (g.tags.SAS.allies || []).filter((k) => k !== 'JUD');
  let taken = 0;
  for (let i = 1; i < g.provinces.length && taken < 1; i++) {
    const p = g.provinces[i];
    if (!p || p.impassable || p.owner !== 'SAS') continue;
    changeOwnerCore(ctx, p, 'JUD');
    recordGrudge(ctx, 'SAS', 'JUD', i);
    taken++;
  }
  const a = openChapter(ctx, g);
  ok(kindsOf(a)[2] === 'mended', 'the diplomatic objective is The Mended Quarrel');
  const o = a.objectives[2];
  ok(o.params.list.indexOf('SAS') >= 0, 'and it names the court we wounded');
  monthlyChapters(ctx);
  ok(!o.done, 'a fresh wound is not a mended one');
  for (let i = 0; i < 130; i++) monthlyOpinionDrift(ctx);
  monthlyChapters(ctx);
  ok(o.done, 'quiet years without naming them an enemy close it');
}

console.log('== the seals no longer repeat every five chapters ==');
{
  const { g, ctx } = won();
  openChapter(ctx, g);
  const seen = new Set();
  for (let n = 0; n < 10; n++) {
    g.chapters.seq = n;
    g.chapters.active = null;
    g.chapters.graceLeft = 0;
    monthlyChapters(ctx);
    seen.add(g.chapters.active.reward.name);
  }
  ok(seen.size === 10, 'ten chapters, ten different seals (' + seen.size + ')');
}

console.log('== the view still renders ==');
{
  const { g, ctx } = won();
  helpers.doctrine(ctx, 'zeal', 6);
  openChapter(ctx, g);
  const v = chapterView(ctx);
  ok(!!v && !!v.active && v.active.objectives.length === 3, 'chapterView carries the chapter');
  ok(v.active.objectives.every((o) => typeof o.name === 'string' && typeof o.desc === 'string'),
    'every objective has a name and a description to print');
  ok(typeof v.active.epigraph === 'string' && v.active.epigraph.length > 0, 'and an epigraph');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
