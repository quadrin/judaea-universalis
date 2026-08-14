// Headless regression — SPEC §248: a client kingdom keeps no foreign policy.
//
// The collar used to be tribute and war duty and nothing else. §75 stopped a
// lord and its client fighting each other and §92 broke a court's alliances at
// the moment it took the collar; after that moment a client signed new
// alliances, guaranteed whoever asked, and declared its own wars on third
// parties while its levies answered to somebody else.
//
// Six contracts:
//
//   1. THE BAR ANSWERS A NAME, NOT A BOOLEAN, because every refusal in this
//      section names who is holding the levies — and it answers nothing at all
//      for a collar whose holder is dead, which §75 says is no collar.
//   2. THE THREE DOORS ARE SHUT: no alliance (on either side of the table), no
//      guarantee, no declaration.
//   3. THE RISING IS NOT AN EXCEPTION. It reads like a hole in the rule and is
//      the proof of it: the bond is struck before the herald is sent, so the
//      court that reaches declareWar is nobody's client.
//   4. GUARANTEES LAPSE WITH THE COLLAR at all three doors a collar goes on
//      through, the way alliances already did — and only the ones the client
//      GAVE. One it receives is a third crown's word, not the client's policy.
//   5. WHAT A CLIENT KEEPS is untouched: it is still called to its lord's war
//      and still fights it. The list of bars reads harsher than it plays and
//      this is the assertion that says so.
//   6. THE PLAYER WEARS IT TOO, with words on live controls rather than dead
//      buttons.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { ERAS } = await import(R + '/js/data/compendium.js');
const { initGame, makeCtx, gameActions } = await import(R + '/js/sim/init.js');
const mil = await import(R + '/js/sim/military.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};
const PP = readFileSync(R + '/js/ui/province_panel.js', 'utf8');
const era = ERAS.find((e) => e.bookmark.id === '66ce');

let seed = 2480;
function boot(playerTag = 'JUD') {
  const bus = { emit() {}, on() { return () => {}; } };
  const game = initGame({
    DEFINES, MAP_DATA, bookmark: era.bookmark, events: era.events, playerTag, rngSeed: seed++,
  });
  const ctx = makeCtx({ game, DEFINES, MAP_DATA, bus, bookmark: era.bookmark, events: era.events });
  game.tags[playerTag].ai = false;
  return { game, ctx, actions: gameActions(ctx) };
}
// A court with nothing on it: no collar, no alliances, no pledges, no wars.
function freeCourt(game, tag) {
  const t = game.tags[tag];
  t.overlord = null;
  t.allies = [];
  t.guarantees = [];
  return t;
}

console.log('== §248 · 1 the bar answers a name ==');
{
  const { game, ctx } = boot();
  freeCourt(game, 'ADI');
  ok(mil.clientForeignPolicyBar(ctx, 'ADI') === '', 'a free court is barred by nothing');
  game.tags.ADI.overlord = 'PAR';
  ok(mil.clientForeignPolicyBar(ctx, 'ADI') === game.tags.PAR.name,
    'a client answers with its lord by name: ' + mil.clientForeignPolicyBar(ctx, 'ADI'));
  // §75: a collar nobody is holding is no collar.
  game.tags.PAR.alive = false;
  ok(mil.clientForeignPolicyBar(ctx, 'ADI') === '',
    'and a collar whose holder is dead binds nothing');
  game.tags.PAR.alive = true;
  ok(mil.clientForeignPolicyBar(ctx, 'NOPE') === '', 'an unknown tag answers rather than throwing');
}

console.log('== §248 · 2 the three doors are shut ==');
{
  const { game, ctx, actions } = boot('ADI');
  freeCourt(game, 'ADI');
  // Free first, so the bars below are shown to be the collar's doing and not
  // some other refusal that was there all along.
  const free = actions.getDiplomacy('NAB');
  ok(!!free, 'the diplomacy card answers for Nabataea');
  const freeWar = mil.declareWar(ctx, 'ADI', 'NAB', 'the free probe');
  ok(!!freeWar, 'a free Adiabene can declare on Nabataea');
  if (freeWar) mil.dissolveWar(ctx, freeWar);
  game.tags.ADI.atWarWith = [];
  game.tags.NAB.atWarWith = [];

  game.tags.ADI.overlord = 'PAR';
  const lord = game.tags.PAR.name;
  ok(!mil.declareWar(ctx, 'ADI', 'NAB', 'the collared probe'),
    'under the collar the same declaration is refused');
  ok(!game.wars.some((w) => w.name === 'the collared probe'), 'and no war is on the books');

  const d = actions.getDiplomacy('NAB');
  ok(d && !d.canAlly && d.whyNotAlly.includes(lord),
    'no alliance, and the refusal names the lord: ' + (d && d.whyNotAlly));
  ok(d && !d.canGuarantee && d.whyNotGuarantee.includes(lord),
    'no guarantee: ' + (d && d.whyNotGuarantee));
  ok(d && !d.canWar && d.whyNotWar.includes(lord),
    'no war: ' + (d && d.whyNotWar));
  ok(d && /independence/i.test(d.whyNotWar),
    'and the war refusal names the one declaration that is left');

  // The other side of the table: a free court may not ally somebody else's
  // client either, because that client cannot sign.
  const { game: g2, actions: a2 } = boot('JUD');
  freeCourt(g2, 'JUD');
  freeCourt(g2, 'ADI');
  const openDoor = a2.getDiplomacy('ADI');
  g2.tags.ADI.overlord = 'PAR';
  const shutDoor = a2.getDiplomacy('ADI');
  ok(shutDoor && !shutDoor.canAlly && shutDoor.whyNotAlly.includes(g2.tags.PAR.name),
    'a free crown cannot ally somebody else\'s client: ' + (shutDoor && shutDoor.whyNotAlly));
  ok(!!openDoor, 'and the same card answered before the collar went on');
}

console.log('== §248 · 3 the rising is not an exception ==');
{
  const { game, ctx } = boot();
  freeCourt(game, 'ADI');
  game.tags.ADI.overlord = 'PAR';
  ok(!mil.declareWar(ctx, 'ADI', 'PAR', 'a client\'s war on its lord'),
    'a client cannot simply declare on its lord');
  const out = mil.declareIndependenceCore(ctx, 'ADI');
  ok(out && out.ok, 'but the rising fires: ' + (out && (out.name || out.why)));
  ok(game.tags.ADI.overlord === null, 'because the bond is struck before the herald is sent');
  ok(game.wars.some((w) => /Independence/.test(w.name || '')
    && w.attackers.includes('ADI') && w.defenders.includes('PAR')),
  'and the war on the books is the war of independence');
}

console.log('== §248 · 4 the pledge lapses with the collar ==');
{
  // All three doors a collar goes on through. §92's offered collar and §76's
  // transfer are exercised through their own entry points; §69's subjugation
  // clause through the peace table.
  const { game, ctx } = boot();
  const A = freeCourt(game, 'ADI');
  A.guarantees = ['NAB'];
  A.allies = ['ARM'];
  if (!game.tags.ARM.allies.includes('ADI')) game.tags.ARM.allies.push('ADI');
  // Somebody else's word over the client, which is not the client's to lose.
  game.tags.ARM.guarantees = ['ADI'];
  const war = mil.declareWar(ctx, 'PAR', 'ADI', 'the collar war');
  ok(!!war, 'Parthia declares on a free Adiabene');
  war.warscore.PAR = 100;
  mil.executePeaceDeal(ctx, war, 'PAR', { subjugate: true });
  ok(game.tags.ADI.overlord === 'PAR', 'and takes its fealty at the table');
  ok(!A.allies.length, 'the alliances lapse, as they always did');
  ok(!A.guarantees.length, 'and now so does the word it had given');
  ok((game.tags.ARM.guarantees || []).includes('ADI'),
    'while the word given TO it survives — that is a third crown\'s pledge, not its policy');
}

console.log('== §248 · 5 what a client keeps ==');
{
  const { game, ctx } = boot();
  freeCourt(game, 'ADI');
  freeCourt(game, 'PAR');
  game.tags.ADI.overlord = 'PAR';
  const war = mil.declareWar(ctx, 'PAR', 'NAB', 'the lord\'s war');
  ok(!!war, 'the lord declares its own war');
  ok(war && war.attackers.includes('ADI'),
    'and the client is called into it — war duty is what the collar is FOR');
  ok(game.tags.ADI.atWarWith.includes('NAB'), 'and is at war with the enemy in its own ledger');
  // Being attacked is not declaring.
  const { game: g2, ctx: c2 } = boot();
  freeCourt(g2, 'ADI');
  g2.tags.ADI.overlord = 'PAR';
  const on = mil.declareWar(c2, 'NAB', 'ADI', 'somebody else\'s idea');
  ok(!!on, 'and a client can still be declared ON — the bar is on speaking, not on being spoken to');
}

console.log('== §248 · 6 the player wears it too ==');
{
  const { game, actions } = boot('JUD');
  freeCourt(game, 'JUD');
  const before = actions.getDiplomacy('NAB');
  ok(before && (before.canAlly || before.whyNotAlly) !== undefined, 'a free player has a card');
  game.tags.JUD.overlord = 'ROM';
  const d = actions.getDiplomacy('NAB');
  const lord = game.tags.ROM.name;
  ok(d && !d.canAlly && !d.canGuarantee && !d.canWar,
    'a player under a collar has all three doors shut');
  for (const [what, why] of [['alliance', d.whyNotAlly], ['guarantee', d.whyNotGuarantee], ['war', d.whyNotWar]]) {
    ok(why && why.includes(lord), `and the ${what} refusal names Rome: ${why}`);
  }
  // Words on a live control, not a hidden one: the panel already renders each
  // reason onto its button, which is the whole reason these strings exist.
  for (const ref of ['dipAlly', 'dipGuarantee', 'dipWar']) {
    ok(PP.indexOf(ref) >= 0, `the province panel wires ${ref}`);
  }
  ok(/setDipBtn\(refs\.dipAlly, d\.canAlly, d\.whyNotAlly/.test(PP)
    && /setDipBtn\(refs\.dipWar, d\.canWar, d\.whyNotWar/.test(PP),
  'and puts the reason on the control rather than hiding it');
}

console.log(failures ? failures + ' FAILURES' : 'smoke168: ALL PASS');
process.exit(failures ? 1 : 0);
