// Headless regression — SPEC §244: the Host tab says what is under arms.
//
// Four contracts:
//
//   1. THE QUERIES THE BLOCK IS BUILT ON ANSWER. getSupplyStatus in
//      particular: before this section it was a sim query with NO reader
//      anywhere in the UI — the one fact about an army that costs men every
//      month it goes unnoticed, and nothing on screen said it. If it stops
//      answering, the block silently shows nothing rather than breaking.
//   2. EVERY LINE HIDES ITSELF. A Maccabean host has no fleet, no wings and
//      no obsolete patterns; a 1948 cabinet has all three. The block is built
//      to disappear entirely rather than print four zeroes, and the chapters
//      it must disappear in are checked here rather than assumed.
//   3. THE BULK REFIT ORDERS ONLY WHAT CAN BE REFITTED. modernizeArmy
//      answers a refusal with a toast, so ordering the whole host would bury
//      every success under a failure notice for every army already up to
//      date — and the eligible set is snapshotted BEFORE any order goes out,
//      because each refit spends from the treasury the next one is tested
//      against.
//   4. IT IS ARMED BEFORE IT IS PAID, AND IT IS THE PLAYER'S OWN REALM ONLY.
//      Two taps for a large sum leaving the treasury at once (§218's idiom),
//      and a foreign court's supply lines are not something an ambassador
//      reads off a card.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const NP = readFileSync(R + '/js/ui/nation_panel.js', 'utf8');
const CSS = readFileSync(R + '/styles.css', 'utf8');

function boot(bookmarkId) {
  const era = ERAS.find((e) => e.bookmark.id === bookmarkId);
  const bm = era.bookmark;
  const tag = (bm.playableTags && bm.playableTags[0].tag) || 'JUD';
  const game = initGame({
    DEFINES, MAP_DATA, bookmark: bm, events: era.events, playerTag: tag, rngSeed: 42,
  });
  const bus = { emit() {}, on() {} };
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, bus, bookmark: bm, events: era.events });
  game.tags[tag].ai = false;
  return { game, ctx, actions: gameActions(ctx), tag };
}
const myArmies = (game) => Object.values(game.armies || {}).filter((a) => a && a.tag === game.playerTag);

console.log('== §244 · 1 the queries the block is built on answer ==');
{
  const { game, actions } = boot('1948ce');
  const mine = myArmies(game);
  ok(mine.length > 0, `the chapter seats the player ${mine.length} armies`);

  // The dead query, revived. Shape first — the block reads five fields off it.
  const sup = actions.getSupplyStatus(mine[0].id);
  ok(sup && typeof sup === 'object', 'getSupplyStatus answers for a real army');
  for (const k of ['ok', 'exempt', 'months', 'reasonText', 'penaltyText']) {
    ok(sup && k in sup, `  …with ${k}`);
  }
  ok(typeof sup.ok === 'boolean' && typeof sup.exempt === 'boolean',
    'and its two gates are booleans, which is what the block branches on');
  ok(actions.getSupplyStatus(999999) === null,
    'while a army that does not exist answers null rather than throwing');

  // getArmyActions carries the refit facts the block totals.
  const aa = actions.getArmyActions(mine[0].id);
  ok(aa && typeof aa.canModernize === 'boolean' && Number.isFinite(aa.modernizeCost),
    'getArmyActions carries canModernize and a finite cost');
  ok(aa && typeof aa.canHire === 'boolean', 'and whether a general can be commissioned');

  const navy = actions.getNavy();
  ok(navy && Array.isArray(navy.fleets), 'getNavy answers with a fleet list');
  ok(Number.isFinite(navy.merchantCount), 'and a merchantman count');
  ok(Array.isArray(actions.getAirWings()), 'getAirWings answers with a list');
}

console.log('== §244 · 2 every line hides itself where it has nothing to say ==');
{
  // 167 BCE: no air force exists in the second century BCE, and the block's
  // air line must not print a zero at a Hasmonean.
  const anc = boot('167bce');
  ok(anc.actions.getAirWings().length === 0,
    'a Maccabean realm has no air wings, so that line never renders');
  // The tab is Defense in every chapter (SPEC §245) — no chapter re-dresses
  // it, and nothing anywhere still falls back to the old word.
  ok(/\{ id: 'war', label: 'Defense', term: 'tabWar'/.test(NP),
    'the tab is labelled Defense');
  for (const era of ERAS) {
    const t = era.bookmark.uiTerms || {};
    ok(!t.tabWar, `${era.bookmark.id} does not re-dress it`);
  }
  ok(!/\|\| 'Host'\)/.test(NP),
    'and no fallback anywhere in the panel still says Host');

  // The block itself is wired to vanish rather than render empty.
  const fn = /function refreshHostState\([\s\S]*?\n  \}/.exec(NP);
  ok(!!fn, 'refreshHostState is in the panel');
  ok(fn && /hostBlock\.classList\.toggle\('hidden', !rows\.length && !acts\.length\)/.test(fn[0]),
    'and hides the whole block when it has neither a line nor a lever');
  ok(fn && /if \(fleets\.length\)/.test(fn[0]) && /if \(wings\.length\)/.test(fn[0])
    && /if \(hungry\.length\)/.test(fn[0]) && /if \(headless\)/.test(fn[0]),
    'every line is behind its own emptiness test');
  ok(/refreshHostState\(self\);/.test(NP), 'and it is called from the refresh pass');
}

console.log('== §244 · 3 the bulk refit orders only what can be refitted ==');
{
  const handler = /const refit = e\.target\.closest\('\[data-refit\]'\);[\s\S]*?\n        refresh\(\);\n        return;\n      \}/.exec(NP);
  ok(!!handler, 'the refit handler is in the panel');
  ok(handler && /canModernize/.test(handler[0]),
    'it filters on canModernize — ordering the whole host would toast a refusal for every up-to-date army');
  ok(handler && handler[0].indexOf('const eligible') < handler[0].indexOf('modernizeArmy(id)'),
    'and the eligible set is snapshotted before any order goes out, not asked mid-spend');
  ok(handler && /getNavy/.test(handler[0]) && /canModernize/.test(handler[0]),
    'the fleet side filters the same way');

  // The sim half: an army that cannot refit is refused, and says so rather
  // than silently doing nothing — which is exactly why the filter matters.
  const { game, actions } = boot('167bce');
  const mine = myArmies(game);
  ok(mine.length > 0, 'the Maccabean chapter seats armies');
  const stuck = mine.filter((a) => {
    const aa = actions.getArmyActions(a.id);
    return aa && !aa.canModernize;
  });
  ok(stuck.length > 0,
    `${stuck.length} of ${mine.length} armies cannot refit at the chapter's start — each would have toasted a refusal`);
}

console.log('== §244 · 3b commissioning is the lever that exists on day one ==');
{
  // The reason this lever is here at all: at a chapter's start date nothing is
  // obsolete, so BOTH refits are hidden, and a tab whose only options appear
  // decades in is a tab with no options.
  const { game, actions } = boot('1948ce');
  const mine = myArmies(game);
  const refittable = mine.filter((a) => {
    const aa = actions.getArmyActions(a.id);
    return aa && aa.canModernize;
  });
  ok(refittable.length === 0,
    'nothing is refittable at a start date — the refit levers are hidden there');
  const empty = mine.filter((a) => !a.general);
  ok(empty.length > 0,
    `${empty.length} of ${mine.length} commands stand empty at the start, so this lever does appear`);

  // The hazard the panel filters around: hireGeneral does NOT check whether a
  // general is already in post. It overwrites and charges anyway, so a bulk
  // lever that ordered every army would replace good generals for 50 points.
  const led = mine.find((a) => a.general) || mine[0];
  const t = game.tags[game.playerTag];
  t.points.mar = 500;
  actions.hireGeneral(led.id);
  const first = led.general && led.general.name;
  const before = t.points.mar;
  actions.hireGeneral(led.id);
  ok(t.points.mar === before - 50,
    'hireGeneral charges again for an army that already has a general — it does not refuse');
  ok(!!first, 'and replaces the one in post, which is why the panel filters on the empty seat itself');

  // The price the panel quotes matches the price the sim charges, in all three.
  const NPSRC = NP;
  ok(/const CMD_COST = 50;/.test(NPSRC), 'the panel prices a commission at 50 martial points');
  const gate = /< 50\) out\.whyHire/.test(readFileSync(R + '/js/sim/init.js', 'utf8'));
  ok(gate, 'and the sim gates hireGeneral on the same 50');
  const initSrc = readFileSync(R + '/js/sim/init.js', 'utf8');
  ok(/canHireAdmiral: !f\.admiral && num\(g\.tags\[me\]\.points && g\.tags\[me\]\.points\.mar\) >= 50/.test(initSrc),
    'as it gates an admiral');
  ok(/canHireLeader: !w\.leader && num\(g\.tags\[g\.playerTag\]\.points && g\.tags\[g\.playerTag\]\.points\.mar\) >= 50/.test(initSrc),
    'and a wing commander');

  // Every chapter opens with an EMPTY martial pool, so the commission button
  // is present and disabled at every start date. Three things the first draft
  // got wrong there, all found by a browser and none by this file:
  //   the label read "Commission commanders — 4, 0 pts", which promises four
  //   commissions for nothing; the disabled button armed anyway; and the armed
  //   label then offered to "Spend 0 martial points".
  for (const era of ERAS) {
    const b = boot(era.bookmark.id);
    const pts = (b.game.tags[b.tag].points && b.game.tags[b.tag].points.mar) | 0;
    ok(pts < 50, `${era.bookmark.id} opens below the price of one commission (${pts} pts)`);
  }
  const render = /if \(commands\.length\) \{[\s\S]*?\n    \}/.exec(NP);
  ok(!!render, 'the commission button is rendered');
  ok(render && /const armed = refitArmed === 'cmd' && afford > 0;/.test(render[0]),
    'it cannot be armed while nothing is affordable');
  ok(render && /const label = afford\s*\n?\s*\? \(armed \?/.test(render[0]),
    'and the label branches on affordability rather than falling back to the empty count');
  ok(render && !/afford \|\| commands\.length/.test(render[0]),
    'so it never names a count beside a zero price — "4, 0 pts" reads as four for free');
  ok(render && /class="pp-build-btn\$\{afford \? '' : ' disabled'\}/.test(render[0]),
    'and it is disabled when the crown cannot pay');
  const handlerSrc = /const refit = e\.target\.closest\('\[data-refit\]'\);[\s\S]*?\n        refresh\(\);\n        return;\n      \}/.exec(NP);
  ok(handlerSrc && /classList\.contains\('disabled'\)/.test(handlerSrc[0]),
    'the handler refuses a disabled lever — every other button in the panel checks this');
  ok(handlerSrc && handlerSrc[0].indexOf("classList.contains('disabled')") < handlerSrc[0].indexOf('refitArmed = which'),
    'and refuses it BEFORE it arms, so a disabled button never reaches the second tap');

  // The handler picks empty seats and caps by what the points buy.
  const handler = /const refit = e\.target\.closest\('\[data-refit\]'\);[\s\S]*?\n        refresh\(\);\n        return;\n      \}/.exec(NP);
  ok(handler && /!a\.general/.test(handler[0]) && /!f\.admiral/.test(handler[0]) && /!w\.leader/.test(handler[0]),
    'the lever orders only genuinely empty commands, across all three arms');
  ok(handler && /slice\(0, Math\.floor\(pts \/ CMD_COST\)\)/.test(handler[0]),
    'and takes only as many as the martial points actually buy');
  ok(handler && handler[0].indexOf('const pts') < handler[0].indexOf('for (const s of seats'),
    'the pool is read once, before the first commission spends from it');
}

console.log('== §244 · 4 armed before paid, and our own realm only ==');
{
  ok(/let refitArmed = '';/.test(NP), 'the panel tracks which refit is armed');
  const handler = /const refit = e\.target\.closest\('\[data-refit\]'\);[\s\S]*?\n        refresh\(\);\n        return;\n      \}/.exec(NP);
  ok(handler && /if \(refitArmed !== which\)/.test(handler[0]),
    'the first tap arms rather than pays');
  ok(handler && /setTimeout\([\s\S]*?5000\)/.test(handler[0]),
    'and it disarms itself after five seconds');
  ok(handler && handler[0].indexOf("refitArmed = ''") < handler[0].indexOf('modernizeArmy'),
    'the second tap disarms before it spends, so a double-fire cannot pay twice');
  const fn = /function refreshHostState\([\s\S]*?\n  \}/.exec(NP);
  ok(fn && /if \(!self \|\| !g\)/.test(fn[0]),
    'the block is the player\'s own realm only — a foreign court shows none of it');
  ok(fn && /pp-build-sure/.test(fn[0]),
    'and the armed button wears the same class the province panel\'s two-tap levers do');

  // Markup and styling.
  ok(/data-ref="hostBlock" data-tab="war"/.test(NP), 'the block is on the Host tab');
  for (const cls of ['np-tech-unit', 'pp-build-sure', 'peace-dim', 'pp-build-grid']) {
    ok(CSS.indexOf('.' + cls) >= 0, `styles.css names .${cls}`);
  }
  ok(!/class="pp-dim"/.test(NP), 'and no line reaches for a class the stylesheet does not have');
}

console.log(failures ? failures + ' FAILURES' : 'smoke165: ALL PASS');
process.exit(failures ? 1 : 0);
