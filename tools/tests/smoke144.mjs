// Headless regression — SPEC §217: the robbers' court. A rising that walks out
// to the ownerless frontier at the rim of the world takes it (nobody governs
// it, so nobody comes for it), stops marching, and two years later stops being
// a rising: the camp is a state with a name, a chief and a colour.
//
// Every assertion here has the shape the section needs: it fires on the empty
// quarter and NOWHERE else (an ownerless city is scenery, not a prize), it
// fires at most once a campaign, it survives a save, and it costs the seeded
// stream nothing — a campaign where the robbers never rise draws exactly the
// world it drew before, which is the only reason this can ship without moving
// the balance harness.
import { readFileSync } from 'fs';

const R = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const { DEFINES } = await import(R + '/js/data/defines.js');
const { MAP_DATA } = await import(R + '/js/data/map_data.js');
const { BOOKMARK_167 } = await import(R + '/js/data/bookmark_167bce.js');
const { EVENTS_167 } = await import(R + '/js/data/events_167bce.js');
const { initGame, makeCtx, reviveGame, reconcileGameProvinces } = await import(R + '/js/sim/init.js');
const { spawnArmy, armiesOf, changeControllerCore, govHas } = await import(R + '/js/sim/military.js');
const { monthlyOutlaws, emptyQuarter, outlawKindFor, outlawsRisen } = await import(R + '/js/sim/outlaws.js');
const { runRebelAI } = await import(R + '/js/sim/ai.js');
const { monthlyRisings } = await import(R + '/js/sim/revolt.js');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

const snap = JSON.parse(readFileSync(R + '/tools/geom-snapshot.json', 'utf8'));
const geom = {
  neighbors: snap.neighbors.map((a) => new Set(a)),
  centroids: snap.centroids.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  coastal: snap.coastal.map(Boolean),
  offshore: snap.offshore.map((c) => (c ? { x: c[0], y: c[1] } : null)),
  areas: Int32Array.from(snap.areas), bbox: [],
};

function boot(seed = 217) {
  const notes = [];
  const bus = { emit(ev, p) { if (ev === 'notify') notes.push(p); }, on() { return () => {}; } };
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_167, events: EVENTS_167,
    playerTag: 'HAS', rngSeed: seed,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: BOOKMARK_167, events: EVENTS_167,
  });
  return { game, ctx, notes };
}

// A band standing on ground it has already taken, exactly as the sieges leave
// it: rebel-controlled, ownerless, and nobody's problem.
function encamp(ctx, provName, men = 3000) {
  const p = ctx.prov(provName);
  const id = spawnArmy(ctx, 'REB', provName, { inf: Math.max(1, Math.ceil(men / 1000)), name: 'Band of ' + provName });
  const army = ctx.game.armies[id];
  army.men = men; // regiments round; the head-count is what the rule reads
  changeControllerCore(ctx, p, 'REB');
  return { p, army };
}

// Run the monthly pass n times without running anything else.
function months(ctx, n) { for (let i = 0; i < n; i++) monthlyOutlaws(ctx); }

const FOUND = DEFINES.OUTLAW.months;

console.log('== the ground: the empty quarter, and nothing else ==');
{
  const { ctx } = boot();
  const q = (name) => emptyQuarter(ctx, ctx.prov(name));
  ok(q('Gaetulia'), 'ownerless frontier drylands are the empty quarter');
  ok(q('Scythia') && q('Danakil') && q('Theon Ochema'), 'so is the rim, north and south');
  ok(!q('Carthago'), 'an ownerless CITY is not — Carthage is scenery, not a prize');
  ok(!q('Cirta') && !q('Volubilis'), 'nor is an ownerless town anybody actually lives in');
  ok(!q('Numidian Sahara'), 'nor impassable deep desert no column can reach');
  ok(!q('Jerusalem'), 'and nor is ground a crown already governs');

  // The identity is read off the water, not off a table.
  ok(outlawKindFor(ctx, ctx.prov('Gaetulia')) === 'bandit', 'inland frontier breeds brigands');
  ok(outlawKindFor(ctx, ctx.prov('Danakil')) === 'pirate', 'a coast breeds corsairs');
}

console.log('== the clock: two years standing, with men still standing ==');
{
  const { game, ctx } = boot();
  const { p } = encamp(ctx, 'Gaetulia');
  months(ctx, FOUND - 1);
  ok(p.outlawMonths === FOUND - 1, 'the camp counts its months: ' + p.outlawMonths);
  ok(!game.tags.LST, 'and is still a camp the month before it is a country');
  monthlyOutlaws(ctx);
  ok(!!game.tags.LST && game.tags.LST.alive, 'the ' + FOUND + 'th month founds the court');
}

console.log('== what gets founded ==');
{
  const { game, ctx, notes } = boot();
  const { p, army } = encamp(ctx, 'Gaetulia', 4000);
  const rngBefore = game.rngState;
  months(ctx, FOUND);
  const t = game.tags.LST;
  ok(!!t && t.alive, 'The Lestai are seated');
  ok(p.owner === 'LST' && p.controller === 'LST', 'they own and control the ground they camped on');
  ok(p.impassable === false && p.habitation === 'frontier', 'which is still harsh frontier, not a capital');
  ok(t.ruler && t.ruler.title === 'Archilestes', 'led by an archilestes: ' + (t.ruler && t.ruler.title));
  ok(/Hezekiah|Eleazar|Tholomaeus|Athronges|Simon|Judas/.test(t.ruler.name),
    'and the chief is a man the sources name: ' + t.ruler.name);
  ok(t.govType === 'company' && govHas(ctx, 'LST', 'heirless'),
    'the constitution is the Company, and nothing is inherited');
  ok(t.religion === p.religion && t.culture === p.culture,
    'whoever these men were before, they were from here');
  ok(army.tag === 'LST' && !army.rising, 'the band is somebody\'s army now, not a rising');
  ok(armiesOf(ctx, 'REB').length === 0, 'and there is no rebel host left standing here');
  ok(t.maxManpower >= 4000 && t.manpower > 0, 'it can replace men: ' + Math.round(t.maxManpower));
  ok(game.flags._outlawCourt && game.flags._outlawCourt.tag === 'LST',
    'the campaign remembers it happened');
  ok(game.chronicle.some((e) => /Lestai/.test(e.text)), 'the chronicle records the proclamation');
  ok(notes.some((n) => /crown out of the sand/i.test(n.title)), 'and the player is told');

  // The whole reason this can ship: it spends no dice. A section that rolled
  // for the chief would shift every seeded draw after it in every campaign.
  ok(game.rngState === rngBefore, 'and it cost the seeded stream not one draw');
}

console.log('== the corsairs ==');
{
  const { game, ctx } = boot();
  const { p, army } = encamp(ctx, 'Danakil', 2000);
  months(ctx, FOUND);
  const t = game.tags.PIR;
  ok(!!t && t.alive && p.owner === 'PIR', 'a coastal camp founds The Peiratai instead');
  ok(t.ruler.title === 'Archipirata', 'under an archipirata: ' + t.ruler.name);
  ok(army.tag === 'PIR', 'the band goes over with it');
  const fleets = Object.values(game.fleets || {}).filter((f) => f && f.tag === 'PIR');
  ok(fleets.length === 1 && fleets[0].ships === DEFINES.OUTLAW.ships,
    'and it is proclaimed with hulls — a corsair court without ships is a joke with no punchline');
  ok(!game.tags.LST, 'the brigand identity is not also seated');
}

console.log('== what stops the clock ==');
{
  const { game, ctx } = boot();
  const { p, army } = encamp(ctx, 'Gaetulia');
  months(ctx, 6);
  ok(p.outlawMonths === 6, 'six months in');

  army.prov = ctx.provId('Garama'); // the band moves on
  monthlyOutlaws(ctx);
  ok(p.outlawMonths === 0, 'a camp with nobody in it is not a camp');

  army.prov = p.id;
  months(ctx, 4);
  ok(p.outlawMonths === 4, 'it starts over when they come back');
  changeControllerCore(ctx, p, 'WASTE');
  monthlyOutlaws(ctx);
  ok(p.outlawMonths === 0, 'and losing the ground stops it too');

  // Stragglers are not a garrison.
  changeControllerCore(ctx, p, 'REB');
  army.men = DEFINES.OUTLAW.men - 1;
  months(ctx, FOUND + 2);
  ok(p.outlawMonths === 0 && !game.tags.LST, 'a band too small to hold it never founds anything');
}

console.log('== the control: rebels on ordinary ground, forever ==');
{
  const { game, ctx } = boot();
  // Ownerless Carthage — 130 cells of the §160 west are exactly this, and a
  // rising that takes one has taken a city, which is somebody else's section.
  const { p } = encamp(ctx, 'Carthago', 8000);
  months(ctx, FOUND * 4);
  ok(!p.outlawMonths && !game.tags.LST && !game.tags.PIR,
    'eight years of rebels in Carthage found no robber kingdom');

  // And a rising against a living crown is still §112's business, not ours.
  const jer = ctx.prov('Jerusalem');
  encamp(ctx, 'Jerusalem', 5000);
  months(ctx, FOUND * 2);
  ok(!jer.outlawMonths && !outlawsRisen(ctx), 'nor does one sitting on a crown\'s own province');
  monthlyRisings(ctx); // …which still owns that case
  ok(jer.rebelHeldMonths === 1, 'the burn-out clock is untouched by any of this');
}

console.log('== one per campaign ==');
{
  const { game, ctx } = boot();
  encamp(ctx, 'Gaetulia');
  months(ctx, FOUND);
  ok(!!game.tags.LST, 'the first court rises');
  const second = encamp(ctx, 'Scythia');
  months(ctx, FOUND * 2);
  ok(!game.tags.PIR, 'a second band at the far end of the world founds nothing');
  ok(second.p.controller === 'REB' && second.p.owner === 'WASTE',
    'it just goes on holding its patch of nothing, exactly as before');
  ok(outlawsRisen(ctx), 'the campaign knows it has already had its easter egg');
}

console.log('== the band that arrived stops marching ==');
{
  const { ctx } = boot();
  const { p, army } = encamp(ctx, 'Gaetulia');
  runRebelAI(ctx);
  ok(army.prov === p.id && !(army.path && army.path.length),
    'a band on ownerless frontier it already holds stays where it is');

  // The control: the same band on ordinary rebel-held ground still marches.
  const { army: b } = encamp(ctx, 'Volubilis', 3000);
  runRebelAI(ctx);
  ok(b.path && b.path.length > 0, 'a band holding a town is still looking for the next one');
}

console.log('== …and everybody else marches exactly as before ==');
{
  // The two gates that keep this off the balance harness. Ownerless ground is
  // where §112's burn-out does not reach, so a band parked there is parked for
  // good and holds one of the eight ownerless-host slots the whole world gets.
  const { ctx } = boot();
  const { army: straggler } = encamp(ctx, 'Blemmyae', DEFINES.OUTLAW.men - 1);
  runRebelAI(ctx);
  ok(straggler.path && straggler.path.length > 0,
    'a straggler too small to found anything drifts on, exactly as it always did');
}
{
  const { game, ctx } = boot();
  encamp(ctx, 'Gaetulia');
  months(ctx, FOUND);
  ok(!!game.tags.LST, 'the campaign has had its court');
  const { army: late } = encamp(ctx, 'Scythia', 5000);
  runRebelAI(ctx);
  ok(late.path && late.path.length > 0,
    'and after it every band goes back to the old rule, however big');
}

console.log('== a robbers\' court survives being put on the shelf ==');
{
  const { game, ctx } = boot();
  encamp(ctx, 'Gaetulia');
  months(ctx, FOUND);
  const provId = ctx.provId('Gaetulia');
  ok(game.tags.LST.alive && game.provinces[provId].owner === 'LST', 'seated before the save');

  const revived = reviveGame(JSON.parse(JSON.stringify(game)));
  reconcileGameProvinces({ game: revived, DEFINES, MAP_DATA, geom, bookmark: BOOKMARK_167 });
  const p = revived.provinces[provId];
  ok(!!revived.tags.LST && revived.tags.LST.alive, 'and seated after it');
  ok(p.owner === 'LST' && p.controller === 'LST', 'still holding the ground they took');
  ok(p.impassable === false, 'which loading does not re-wall');
  ok(revived.tags.LST.ruler.title === 'Archilestes', 'with the same chief in the same chair');
  ok(revived.flags._outlawCourt && revived.flags._outlawCourt.tag === 'LST',
    'and the campaign still remembers it can only happen once');
}

console.log(failures ? '\n' + failures + ' FAIL' : '\nALL PASS');
process.exit(failures ? 1 : 0);
