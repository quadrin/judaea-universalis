// Headless regression — SPEC §246: the Defense tab lists what wants orders.
//
// §244 gave the tab a report and three bulk levers. A report is not a choice:
// every line was a count you could read and not act on, and the levers acted
// on all of it or none of it. Faith seats a High Priest from named candidates;
// Court hires named advisors and appeases named estates. This is the army's
// version of that list, and these are its contracts:
//
//   1. ONLY COMMANDS THAT WANT SOMETHING GET A CARD. A host that is fed, led
//      and up to date is not a decision. The block is a to-do list, and it
//      disappears when the realm is in order — the same rule §244's lines
//      follow, for the same reason.
//   2. EACH WANT BRINGS ITS OWN ORDERS. No general → commission; old pattern
//      → refit at a named price; out of supply → say so and offer the map.
//   3. A SINGLE ORDER IS NOT ARMED. One general on one named host at a known
//      price is the weight of seating a High Priest, and those go on one
//      click. Arming belongs to the button that spends on everything at once.
//   4. AN ORDER THE PURSE CANNOT COVER IS OFFERED DISABLED, WITH THE REASON.
//      Not hidden: a player deciding what to save for needs to see the price.
//   5. AND NOTHING IS TRUNCATED SILENTLY.
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
const fn = /function refreshOrders\([\s\S]*?\n  \}/.exec(NP);
const handler = /const ord = e\.target\.closest\(\[\s\S]*?\n        return;\n      \}/.exec(NP)
  || /const ord = e\.target\.closest\('\[data-ord-find\][\s\S]*?\n        return;\n      \}/.exec(NP);

function boot(id) {
  const era = ERAS.find((e) => e.bookmark.id === id);
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

console.log('== §246 · 0 the panel still parses ==');
{
  // Twice in this section a comment written INSIDE the panel's HTML template
  // literal quoted a code name in backticks, which closes the literal. The
  // module then fails to parse, the whole game fails to boot, and every
  // source-scanning assertion below still passes because the file is only
  // being read as text. So it is imported, first, before anything else.
  let loaded = null;
  try { loaded = await import(R + '/js/ui/nation_panel.js'); } catch (e) {
    ok(false, 'js/ui/nation_panel.js parses and loads — ' + e.message);
  }
  ok(!!(loaded && typeof loaded.createNationPanel === 'function'),
    'the realm panel module loads and exports createNationPanel');
  // And the template literal itself carries no backtick a comment sneaked in.
  const tpl = /el\.innerHTML = `([\s\S]*?)`;/.exec(NP);
  ok(!!tpl, 'the panel template is findable');
  ok(tpl && tpl[1].indexOf('`') < 0,
    'and holds no backtick — one inside it closes the literal and takes the game down');
  // And the guard is proved against the bug it exists for, rather than trusted:
  // a template with a backtick in a comment must fail the same check.
  const poisoned = 'el.innerHTML = `\n  <!-- see `pp-build-grid` -->\n`;';
  const pt = /el\.innerHTML = `([\s\S]*?)`;/.exec(poisoned);
  ok(pt && pt[1].indexOf('`') >= 0, '  and the check catches a planted one');
}

console.log('== §246 · 1 the block exists and is a to-do list ==');
{
  ok(!!fn, 'refreshOrders is in the panel');
  ok(/data-ref="ordersBlock" data-tab="war"/.test(NP), 'its block is on the Defense tab');
  ok(/refreshOrders\(self\);/.test(NP), 'and it is called from the refresh pass');
  ok(fn && /if \(!self \|\| !g\)/.test(fn[0]),
    'the player\'s own realm only — a foreign court\'s empty commands are not an ambassador\'s business');
  // The to-do rule, in all three arms.
  ok(fn && /if \(a\.general && !aa\.canModernize && !starving\) continue;/.test(fn[0]),
    'an army that is led, current and fed gets no card');
  ok(fn && /if \(f\.admiral && !f\.canModernize\) continue;/.test(fn[0]), 'nor a fleet');
  ok(fn && /if \(w\.leader\) continue;/.test(fn[0]), 'nor a led wing');
  ok(fn && /ordersBlock\.classList\.toggle\('hidden', !total\)/.test(fn[0]),
    'and the block hides itself when nothing wants anything');
}

console.log('== §246 · 2 each want brings its own orders ==');
{
  ok(fn && /data-ord-general/.test(fn[0]) && /data-ord-admiral/.test(fn[0])
    && /data-ord-wing/.test(fn[0]), 'a commission for each of the three arms');
  ok(fn && /data-ord-refit'/.test(fn[0]) && /data-ord-refitfleet/.test(fn[0]),
    'a refit for an army and a re-rig for a fleet');
  ok(fn && /data-ord-find/.test(fn[0]), 'and every card can put the map on it');
  ok(fn && /out of supply/.test(fn[0]), 'a starving host says so on its card');
  ok(fn && /modernizeCost/.test(fn[0]) && /CMD_COST/.test(fn[0]),
    'and every order names its price');

  // The five actions behind the buttons all exist and are callable.
  const { actions } = boot('1948ce');
  for (const a of ['hireGeneral', 'hireAdmiral', 'hireWingLeader', 'modernizeArmy', 'modernizeFleet']) {
    ok(typeof actions[a] === 'function', `  ${a} is a real action`);
  }
}

console.log('== §246 · 3 a single order is not armed ==');
{
  ok(!!handler, 'the single-order handler is in the panel');
  ok(handler && !/refitArmed/.test(handler[0]),
    'it does not arm — one named host at a known price goes on one click, like seating a High Priest');
  ok(handler && /classList\.contains\('disabled'\)/.test(handler[0]),
    'but it still refuses a disabled button');
  ok(handler && /onProvinceClick/.test(handler[0]),
    'and Find goes through the panel\'s own province-click, not a new path');
  // The bulk levers still DO arm — the two idioms must not have merged.
  const bulk = /const refit = e\.target\.closest\('\[data-refit\]'\);[\s\S]*?\n        refresh\(\);\n        return;\n      \}/.exec(NP);
  ok(bulk && /refitArmed !== which/.test(bulk[0]),
    'while §244\'s bulk levers still arm before they spend');
}

console.log('== §246 · 4 an order that cannot be paid is shown, disabled, with the reason ==');
{
  ok(fn && /points < CMD_COST/.test(fn[0]),
    'a commission greys out when the martial pool is short');
  ok(fn && /purse < \(aa\.modernizeCost \| 0\)/.test(fn[0]),
    'and a refit when the treasury is');
  ok(fn && /Not enough martial points: \$\{CMD_COST\} needed, we have \$\{points\}/.test(fn[0]),
    'the tooltip says what is needed and what we have');
  ok(fn && /Not enough in the treasury/.test(fn[0]), 'in talents too');
  // Every chapter opens with an empty martial pool (§244), so the disabled
  // path is the one a player meets first.
  for (const era of ERAS) {
    const b = boot(era.bookmark.id);
    const pts = (b.game.tags[b.tag].points && b.game.tags[b.tag].points.mar) | 0;
    ok(pts < 50, `${era.bookmark.id} opens below a commission's price (${pts} pts)`);
  }
}

console.log('== §246 · 5 nothing is truncated silently, and it is styled ==');
{
  ok(fn && /const ORDER_CAP|ORDER_CAP/.test(fn[0]) || /const ORDER_CAP = \d+;/.test(NP),
    'the list has a cap');
  ok(fn && /and \$\{total - ORDER_CAP\} more/.test(fn[0]),
    'and says how many it is not showing rather than quietly dropping them');
  for (const cls of ['np-faction', 'np-fac-top', 'np-fac-name', 'np-fac-state',
    'np-fac-effect', 'np-seat-btn', 'peace-dim']) {
    ok(CSS.indexOf('.' + cls) >= 0, `styles.css names .${cls}`);
  }
  ok(/class="np-factions" data-ref="orders"/.test(NP),
    'and the cards sit in the same container Faith and Court use');

  // §244's bulk buttons shipped in `pp-build-grid` — the province panel's 2x2
  // ICON grid, which is nowrap with an ellipsing span. "Commission commanders
  // — 4, 200 pts" rendered as "Commission comma…", losing both numbers that
  // are the reason to press it. This is §175's lesson again.
  ok(/class="np-bulk" data-ref="hostActs"/.test(NP),
    'the bulk orders are not in the icon grid that clipped them');
  ok(CSS.indexOf('.np-bulk') >= 0, 'and .np-bulk is in the stylesheet');
  ok(/\.np-bulk \.pp-build-btn span \{[^}]*white-space: normal/.test(CSS),
    'where their labels are allowed to wrap rather than ellipse away the price');
}

console.log(failures ? failures + ' FAILURES' : 'smoke166: ALL PASS');
process.exit(failures ? 1 : 0);
