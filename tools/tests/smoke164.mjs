// Headless regression — SPEC §243: the host panel has terms.
//
// Five contracts:
//
//   1. THE DEFAULTS ARE THE OLD GAME. Every house rule defaults to exactly
//      what the code did before this section, so a solo campaign, a save made
//      before it, and a host who touches nothing all behave identically. This
//      is the contract that lets three new branches into the sim safely, and
//      it is the one worth locking hardest.
//   2. THE CHALLENGE ACTUALLY REACHES THE SIM. This is the bug the section
//      started from: the start screen has had a Normal/Veteran dial since §21
//      and the host panel never did, so `startMultiplayerHost` called initGame
//      without `difficulty` and EVERY hosted campaign silently played on
//      Normal. Asserted both ways — the sim honours the flag, and main.js
//      passes it.
//   3. `cardWaits` GATES THE CLOCK, BOTH WAYS. The one rule the sim itself
//      owns. On (the default), nobody starts the world while a dispatch sits
//      at another human chair; off, the months turn anyway.
//   4. THE HOST-SIDE RULES ARE ENFORCED WHERE THEY CANNOT BE BYPASSED.
//      `guestClock` is refused in hostRunGuestCommand — the single choke point
//      every guest order passes through — and not merely hidden on the guest's
//      screen, which would leave a control that half-works.
//   5. THE PANEL OFFERS THEM AND THE WIRE CARRIES THEM. Four controls, sent
//      through onHostStart, echoed in the lobby payload, and shown to a guest
//      only where they differ from the default.
const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { readFileSync } = await import('fs');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const {
  initGame, makeCtx, gameActions, reviveGame, TABLE_DEFAULTS, normalizeTable,
} = await import(R + '/js/sim/init.js');
const { resolveTagMult } = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const MAIN = readFileSync(R + '/main.js', 'utf8');
const LOBBY = readFileSync(R + '/js/ui/lobby.js', 'utf8');
const CSS = readFileSync(R + '/styles.css', 'utf8');

function boot(bookmarkId, opts) {
  const era = ERAS.find((e) => e.bookmark.id === bookmarkId);
  const bm = era.bookmark;
  const tag = (bm.playableTags && bm.playableTags[0].tag) || 'JUD';
  const game = initGame({
    DEFINES, MAP_DATA, bookmark: bm, events: era.events,
    playerTag: tag, rngSeed: 42, ...(opts || {}),
  });
  const bus = { emit() {}, on() {} };
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, bus, bookmark: bm, events: era.events });
  game.tags[tag].ai = false;
  return { game, ctx, actions: gameActions(ctx), tag };
}

console.log('== §243 · 1 the defaults are the game as it was ==');
{
  ok(TABLE_DEFAULTS.guestClock === true,
    'a guest may work the clock, as it could before this section');
  ok(TABLE_DEFAULTS.cardWaits === true,
    'the world waits on a card at another chair — §216\'s rule, unchanged');
  ok(TABLE_DEFAULTS.pauseOnDrop === false,
    'and a dropped player does not stop the world, as it did not before');

  const { game } = boot('66ce');
  ok(game.table && game.table.guestClock === true && game.table.cardWaits === true
    && game.table.pauseOnDrop === false,
    'a campaign started with no terms gets exactly those');

  // A save from before §243 has no `table` at all, and must not acquire a rule
  // it never played by.
  const pre = JSON.parse(JSON.stringify(game));
  delete pre.table;
  const revived = reviveGame(pre);
  ok(revived && revived.table && revived.table.guestClock === true
    && revived.table.cardWaits === true && revived.table.pauseOnDrop === false,
    'and a pre-§243 save is revived onto the same three');

  // Partial and junk values resolve rather than leaking through: `table` comes
  // off the wire from another machine.
  const half = normalizeTable({ table: { cardWaits: false } });
  ok(half.cardWaits === false && half.guestClock === true && half.pauseOnDrop === false,
    'a partial set fills its gaps from the defaults');
  // `table` arrives off the wire from another machine, so the contract is that
  // anything which is not the explicit boolean that MOVES a rule lands back on
  // that rule's default — and every value out is a real boolean either way.
  // Each default is also the safe side of its rule: waiting rather than running
  // people over, and not freezing the world on a hiccup.
  const junk = normalizeTable({ table: { guestClock: 'yes', cardWaits: 0, pauseOnDrop: 'yes' } });
  ok(Object.keys(junk).every((k) => typeof junk[k] === 'boolean'),
    'every rule comes out a real boolean, whatever went in');
  ok(junk.guestClock === TABLE_DEFAULTS.guestClock && junk.cardWaits === TABLE_DEFAULTS.cardWaits
    && junk.pauseOnDrop === TABLE_DEFAULTS.pauseOnDrop,
    'and a value that is not the boolean which moves a rule falls back to that rule\'s default');
  const moved = normalizeTable({ table: { guestClock: false, cardWaits: false, pauseOnDrop: true } });
  ok(moved.guestClock === false && moved.cardWaits === false && moved.pauseOnDrop === true,
    'while the booleans that do move them, move them');
  ok(normalizeTable({}).cardWaits === true, 'a game with no table at all gets one');

  // A host may set them explicitly at initGame.
  const set = boot('66ce', { table: { guestClock: false, cardWaits: false, pauseOnDrop: true } });
  ok(set.game.table.guestClock === false && set.game.table.cardWaits === false
    && set.game.table.pauseOnDrop === true, 'and a host\'s picks are carried into the campaign');
}

console.log('== §243 · 2 the challenge reaches the sim, and main.js sends it ==');
{
  const normal = boot('66ce');
  const veteran = boot('66ce', { difficulty: 'hard' });
  ok(normal.game.difficulty === 'normal' && veteran.game.difficulty === 'hard',
    'initGame honours the dial');
  // And it is not a label: find an AI court and compare what it earns.
  const aiTag = Object.keys(normal.game.tags).find((k) => normal.game.tags[k]
    && normal.game.tags[k].ai && k !== 'REB');
  ok(!!aiTag, 'the chapter seats an AI court: ' + aiTag);
  const a = resolveTagMult(normal.ctx, aiTag, 'incomeMult');
  const b = resolveTagMult(veteran.ctx, aiTag, 'incomeMult');
  ok(b > a, `and a veteran court earns more than a normal one (${a.toFixed(3)} → ${b.toFixed(3)})`);
  const pa = resolveTagMult(normal.ctx, normal.tag, 'incomeMult');
  const pb = resolveTagMult(veteran.ctx, veteran.tag, 'incomeMult');
  ok(pa === pb, 'while the player\'s own numbers are untouched — it is an AI bonus, not a tax');

  // The bug this section started from. main.js cannot be imported headlessly
  // (it reaches for Path2D), so the wiring is read.
  const host = /function startMultiplayerHost\([\s\S]*?\n  \}/.exec(MAIN);
  ok(!!host, 'startMultiplayerHost is in main.js');
  ok(host && /difficulty:/.test(host[0]),
    'and it passes a difficulty to initGame — before §243 it passed none, so every hosted campaign was Normal');
  ok(host && /table/.test(host[0]), 'and the table\'s rules with it');
  ok(/startMultiplayerHost\(entry, hostTag, guests, resumed, terms\)/.test(MAIN),
    'taking the terms as its own argument rather than reading a global');
}

console.log('== §243 · 3 cardWaits gates the clock, both ways ==');
{
  // Two human chairs, a card at the other one, and the clock in our hand.
  function tableWith(cardWaits) {
    const { game, actions } = boot('66ce', { table: { cardWaits } });
    const other = Object.keys(game.tags).find((k) => k !== game.playerTag && game.tags[k]);
    game.tags[other].ai = false;
    game.humanTags = [game.playerTag, other];
    game.pendingEvents = [{ instanceId: 1, forTag: other, optIdx: 0 }];
    game.paused = true;
    actions.togglePause();
    return { started: !game.paused, other };
  }
  const waits = tableWith(true);
  ok(!waits.started,
    'with the rule on, the clock will not start while a card sits at ' + waits.other);
  const runsOn = tableWith(false);
  ok(runsOn.started,
    'with it off, the months turn while somebody is still reading');

  // The rule is about ANOTHER chair. Our own open card is blocked elsewhere,
  // and a solo campaign must be untouched by any of this.
  const { game, actions } = boot('66ce');
  game.pendingEvents = [{ instanceId: 1, forTag: game.playerTag, optIdx: 0 }];
  game.paused = true;
  actions.togglePause();
  ok(!game.paused, 'a solo campaign with a card of its own is not gated by this rule');

  // And a game whose `table` is missing entirely (an in-flight snapshot from an
  // older host) falls back to waiting rather than to running over people.
  const legacy = boot('66ce');
  const otherTag = Object.keys(legacy.game.tags).find((k) => k !== legacy.game.playerTag);
  legacy.game.tags[otherTag].ai = false;
  legacy.game.humanTags = [legacy.game.playerTag, otherTag];
  legacy.game.pendingEvents = [{ instanceId: 1, forTag: otherTag, optIdx: 0 }];
  delete legacy.game.table;
  legacy.game.paused = true;
  legacy.actions.togglePause();
  ok(legacy.game.paused, 'and a game with no table at all defaults to waiting, not to running on');
}

console.log('== §243 · 4 the host-side rules are enforced at the choke point ==');
{
  const cmd = /function hostRunGuestCommand\([\s\S]*?\n  \}/.exec(MAIN);
  ok(!!cmd, 'hostRunGuestCommand is in main.js');
  ok(cmd && /guestClock === false/.test(cmd[0]),
    'the clock rule is checked there — the one place every guest order passes through');
  ok(cmd && /togglePause|setSpeed/.test(cmd[0]), 'against the two clock commands by name');
  ok(cmd && /peer\.send/.test(cmd[0]),
    'and the guest is told, rather than watching its own optimistic press bounce back unexplained');
  ok(cmd && cmd[0].indexOf('guestClock') < cmd[0].indexOf('runUnderChair'),
    'refused BEFORE the order runs, not after');

  const drop = /onClose: \(\) => \{[\s\S]*?A player has left/.exec(MAIN);
  ok(!!drop, 'the guest-disconnect handler is in main.js');
  ok(drop && /pauseOnDrop/.test(drop[0]), 'and it honours the drop rule');
}

console.log('== §243 · 5 the panel offers them and the wire carries them ==');
{
  ok(/data-chal="normal"/.test(LOBBY) && /data-chal="hard"/.test(LOBBY),
    'the host panel has the challenge dial the start screen has always had');
  for (const key of ['guestClock', 'cardWaits', 'pauseOnDrop']) {
    ok(new RegExp("key: '" + key + "'").test(LOBBY), `and a control for ${key}`);
  }
  ok(/onHostStart\(hostEntry\(\), hostTag, ready, usingSave\(\) \? hostSave : null, \{/.test(LOBBY),
    'Begin sends the terms along with the seating');
  ok(/difficulty: usingSave\(\) \? null : hostChallenge/.test(LOBBY),
    'and a save is played on the dial it was begun on rather than the panel\'s');
  ok(/challenge: usingSave\(\) \? '' : hostChallenge/.test(LOBBY)
    && /table: \{ \.\.\.hostTable \}/.test(LOBBY),
    'the lobby payload carries the terms, so a guest can read them before sitting down');
  ok(/function guestTermsHtml/.test(LOBBY), 'and the guest has somewhere to read them');
  // Only the non-defaults are printed, so an ordinary table shows nothing.
  const terms = /function guestTermsHtml\(\)[\s\S]*?\n  \}/.exec(LOBBY);
  ok(terms && /if \(!terms\.length\) return ''/.test(terms[0]),
    'an ordinary table prints no terms block at all');
  ok(terms && /guestClock === false/.test(terms[0]) && /cardWaits === false/.test(terms[0])
    && /pauseOnDrop === true/.test(terms[0]),
    'and each line appears only where the host moved off the default');
  ok(/const MP_PROTO = 4;/.test(LOBBY),
    'the protocol version is bumped — a guest on the old build is told to reload');

  // Every class the new markup emits has a rule, or it ships unstyled.
  for (const cls of ['mp-inline', 'mp-terms', 'mp-term']) {
    ok(CSS.indexOf('.' + cls) >= 0, `styles.css names .${cls}`);
  }
}

console.log(failures ? failures + ' FAILURES' : 'smoke164: ALL PASS');
process.exit(failures ? 1 : 0);
