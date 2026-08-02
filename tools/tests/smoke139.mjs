// Headless regression — SPEC §212: the works of one's own. §181 made the air
// wing and the armored regiment an IMPORT; this is what a state does about
// it. An arms program is a named weapon system developed at home, opened by a
// rung of the military ladder and by whatever the shops delivered before it:
//
//   THE TABLE — keys are globally unique, every unlock sits inside 1948's
//   own base..ceiling window, every prerequisite is on the same court's
//   roster and opens no later than what needs it, every effects key is one
//   the sim consumes, every `works` is an arm §181 actually gates — and no
//   other chapter has works at all.
//
//   THE GATES — the ladder, the prerequisites, the shop capacity, the purse
//   and the martial points, each refusing in its own words; and the roster
//   following a formed crown through its lineage.
//
//   THE ARC — beginning charges talents and points; the development line is
//   a LEDGER row, billed once, and it stops the month the work delivers;
//   delivery mounts the effects permanently and opens the arm.
//
//   THE POINT OF IT — a court with the aircraft works raises wings with no
//   supplier and still cannot raise armor; a court with both needs nobody,
//   is refused a signature for that reason, and becomes signable BY others
//   with the fee landing in its own treasury.
//
//   THE LAVI — the one that can be abandoned: part of the money and a
//   little of the thinking come back, and the capital that was paying for it
//   is pleased. Finishing it costs that regard instead.
//
//   THE SAVE — a pre-§212 save loads with an empty book and every antique
//   chapter's cavalry and hangars untouched.
import { DEFINES } from '../../js/data/defines.js';
import { MAP_DATA } from '../../js/data/map_data.js';
import { ERAS } from '../../js/data/compendium.js';
import {
  ARMS_PROGRAMS, ARMS_PROGRAMS_BY_BOOKMARK, GATED_ARMS, armsProgramsOn, armsProgramsFor,
  programStatus, ownWorksOf, selfSufficientWorks, programStrain, programsDelivered,
  computeProgramEffects,
} from '../../js/data/programs.js';
import { techCeiling } from '../../js/data/tech.js';
import { bus } from '../../js/core/bus.js';
import { initGame, makeCtx, gameActions, reviveGame } from '../../js/sim/init.js';
import { tickDay } from '../../js/sim/tick.js';
import {
  programStartGate, startProgramCore, cancelProgramCore, programsInfo, monthlyPrograms,
  armsSignGate, armsInfo,
} from '../../js/sim/arms.js';
import { armsGate, isSelfArsenal, armsExporters, ownsWorks, recruitRegiment, raiseAirWing } from '../../js/sim/military.js';
import { incomeBreakdown, explainIncome } from '../../js/sim/economy.js';

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  PASS', msg);
  else { failures++; console.error('  FAIL', msg); }
};

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

const era = ERAS.find((e) => e.bookmark.id === '1948ce');

function world(playerTag = 'ISR') {
  const game = initGame({
    DEFINES, MAP_DATA, geom, bookmark: era.bookmark, events: era.events,
    playerTag, rngSeed: 7,
  });
  const ctx = makeCtx({
    game, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events,
  });
  return { game, ctx, actions: gameActions(ctx) };
}

// A court set up to actually build something: at peace, solvent, at the rung.
function ready(w, tag, mar, treasury = 2000, points = 2000) {
  const t = w.game.tags[tag];
  t.atWarWith = [];
  t.tech.mar = mar;
  t.treasury = treasury;
  t.points.mar = points;
  return t;
}

// Deliver a program outright, the way a long campaign would.
function deliver(w, tag, key) {
  const t = w.game.tags[tag];
  if (!t.programs) t.programs = {};
  t.programs[key] = 0;
  return t;
}

// The keys the sim's effect resolvers actually consume, and the two arms
// §181 gates. A program that grants anything else is a typo with a tooltip.
const EFFECT_KEYS = new Set([
  'incomeMult', 'tradeMult', 'navalMult', 'milPowerMult', 'manpowerMult', 'moraleMult',
  'disciplineMult', 'reinforceMult', 'maintMult', 'forceLimitMult', 'siegeMult',
  'growthMult', 'adminMult', 'convertMult', 'integrateMult', 'pilgrimMult',
  'unrestAll', 'legitimacyAdd', 'hillDefBonus', 'siegeBonus', 'deterrent', 'diploSeats',
]);

// ---------------------------------------------------------------------------
console.log('== the table: what the chapter may build, and what it may not ==');
{
  const keys = Object.keys(ARMS_PROGRAMS);
  ok(new Set(keys).size === keys.length, 'program keys are globally unique (' + keys.length + ')');

  const books = Object.keys(ARMS_PROGRAMS_BY_BOOKMARK);
  ok(books.length === 1 && books[0] === '1948ce',
    'only 1948 builds works of its own — a Hasmonean foundry is not this mechanic');
  for (const e of ERAS) {
    if (e.bookmark.id === '1948ce') continue;
    ok(!armsProgramsOn(e.bookmark), e.bookmark.id + ' has no arms programs');
  }

  const base = era.bookmark.techBase | 0;
  const ceil = techCeiling(era.bookmark);
  const table = ARMS_PROGRAMS_BY_BOOKMARK['1948ce'];
  let windowed = true, needsOnRoster = true, needsEarlier = true, effectsKnown = true, armsKnown = true;
  for (const tag of Object.keys(table)) {
    const roster = table[tag];
    for (const key of roster) {
      const def = ARMS_PROGRAMS[key];
      if (!def) { needsOnRoster = false; continue; }
      if (def.unlock.ladder !== 'mar' || def.unlock.level < base || def.unlock.level > ceil) windowed = false;
      for (const need of def.needs || []) {
        if (roster.indexOf(need) < 0) needsOnRoster = false;
        else if (ARMS_PROGRAMS[need].unlock.level > def.unlock.level) needsEarlier = false;
      }
      for (const k of Object.keys(def.effects || {})) if (!EFFECT_KEYS.has(k)) effectsKnown = false;
      if (def.works && GATED_ARMS.indexOf(def.works) < 0) armsKnown = false;
      if (!(def.cost > 0) || !(def.points > 0) || !(def.months > 0) || !(def.strain >= 0)) windowed = false;
    }
  }
  ok(windowed, 'every unlock is a military rung inside ' + base + '..' + ceil + ', and every price is real');
  ok(needsOnRoster, 'every prerequisite is a program on the same court\'s roster');
  ok(needsEarlier, 'and opens no later than the program that needs it');
  ok(effectsKnown, 'every effects key is one resolveTagMult/resolveTagAdd already consumes');
  ok(armsKnown, 'every `works` names an arm §181 actually gates (' + GATED_ARMS.join(', ') + ')');

  ok(table.ISR.indexOf('lavi') === table.ISR.length - 1,
    'the Lavi is the last thing on the roster — the top of the ladder and the top of the budget');
  ok(ARMS_PROGRAMS.lavi.unlock.level === ceil,
    'and it opens at the age\'s own ceiling (' + ceil + ')');
  ok(!table.JOR, 'Jordan builds nothing: the Legion was somebody else\'s equipment, and stayed that way');
  ok(GATED_ARMS.every((arm) => table.ISR.some((k) => ARMS_PROGRAMS[k].works === arm)),
    'Israel\'s roster can reach every gated arm — the chapter\'s whole arc is reachable');
  ok(!table.EGY.some((k) => ARMS_PROGRAMS[k].works === 'armor'),
    'Egypt\'s cannot: Helwan drew an aircraft, never a tank');
}

// ---------------------------------------------------------------------------
console.log('== the roster: whose shops, and what the panel is told ==');
{
  const w = world('ISR');
  ok(armsProgramsFor(era.bookmark, 'ISR', w.game.tags.ISR).length === 8, 'Israel is offered eight works');
  ok(armsProgramsFor(era.bookmark, 'JOR', w.game.tags.JOR).length === 0, 'Jordan is offered none');
  ok(programsInfo(w.ctx, 'JOR') === null, 'and its panel block gets null, so it hides on one test');
  // A formed crown keeps its founder's shops (SPEC §102/§212).
  const lineage = { ...w.game.tags.ISR, lineage: ['ISR'] };
  ok(armsProgramsFor(era.bookmark, 'MLI', lineage).length === 8,
    'the Kingdom of Israel inherits Israel\'s roster through its lineage');

  const info = programsInfo(w.ctx, 'ISR');
  ok(info && info.roster.length === 8 && info.works.length === 0 && info.selfSufficient === false,
    'the opening picture: eight cards, no works, nothing self-sufficient');
  ok(info.roster.every((r) => r.status === 'none'), 'and nothing begun');
  const uzi = info.roster[0];
  ok(uzi.unlockText.indexOf('The General Staff') >= 0 && uzi.unlockText.indexOf('20') >= 0,
    'the locked card names the rung in the chapter\'s own vocabulary: ' + uzi.unlockText);
}

// ---------------------------------------------------------------------------
console.log('== the gates: five refusals, each in its own words ==');
{
  const w = world('ISR');
  ok(/The General Staff \(20\) first/.test(programStartGate(w.ctx, 'ISR', 'uzi')),
    'the ladder: mar 19 cannot begin a mar-20 work');

  ready(w, 'ISR', 24);
  ok(programStartGate(w.ctx, 'ISR', 'uzi') === '', 'at the rung, with money and points, the Uzi opens');
  ok(/must first deliver The Uzi/.test(programStartGate(w.ctx, 'ISR', 'shafrir')),
    'the prerequisites: the Shafrir waits on the Uzi');
  ok(/must first deliver/.test(programStartGate(w.ctx, 'ISR', 'lavi')),
    'and the Lavi waits on two things');

  ready(w, 'ISR', 24, 20, 2000);
  ok(/not enough treasury/.test(programStartGate(w.ctx, 'ISR', 'uzi')), 'the purse refuses by name');
  ready(w, 'ISR', 24, 2000, 5);
  ok(/not enough martial points/.test(programStartGate(w.ctx, 'ISR', 'uzi')), 'and so do the points');

  // Shop capacity: maxAtOnce, whatever the purse says. The Uzi is the only
  // work Israel can begin cold, so the second line waits on its delivery —
  // which is the prerequisite rule doing its job, not a capacity failure.
  ready(w, 'ISR', 24);
  const cap = DEFINES.PROGRAMS.maxAtOnce | 0;
  deliver(w, 'ISR', 'uzi');
  ok(startProgramCore(w.ctx, 'ISR', 'nesher').ok && startProgramCore(w.ctx, 'ISR', 'merkava').ok,
    'with the Uzi delivered, two lines open at once');
  ok(Object.keys(w.game.tags.ISR.programs).filter((k) => w.game.tags.ISR.programs[k] > 0).length === cap,
    'the shops hold ' + cap + ' lines at once');
  ok(/already building all they can hold/.test(programStartGate(w.ctx, 'ISR', 'shafrir')),
    'and refuse the next one until something clears');
  ok(programStartGate(w.ctx, 'ISR', 'nesher') === 'it is already in the shops',
    'a line already running is not begun twice');
  ok(programStartGate(w.ctx, 'ISR', 'uzi') === 'the works already deliver it',
    'and one already delivered is not begun again');
  ok(programStartGate(w.ctx, 'ISR', 'helwan') === 'our shops were never asked to build this',
    'and Israel cannot build Egypt\'s aircraft');
  ok(programStartGate(w.ctx, 'JOR', 'uzi') === 'our shops were never asked to build this',
    'nor can a court with no roster build anybody\'s');
}

// ---------------------------------------------------------------------------
console.log('== the arc: paid once, billed monthly, delivered permanently ==');
{
  const w = world('ISR');
  const t = ready(w, 'ISR', 24, 1000, 1000);
  const def = ARMS_PROGRAMS.uzi;
  const res = startProgramCore(w.ctx, 'ISR', 'uzi');
  ok(res.ok && t.treasury === 1000 - def.cost && t.points.mar === 1000 - def.points,
    'beginning charges ' + def.cost + ' talents and ' + def.points + ' martial points, once');
  ok(programStatus(t, 'uzi') === 'work' && t.programs.uzi === def.months,
    'and puts ' + def.months + ' months on the clock');

  // The bill is a LEDGER line, not a hidden withdrawal.
  ok(Math.abs(programStrain(t) - def.strain) < 1e-9, 'the strain reads ' + def.strain + ' a month');
  const bd = incomeBreakdown(w.ctx, 'ISR');
  ok(Math.abs(bd.develop - def.strain) < 1e-9, 'incomeBreakdown carries it as its own `develop` line');
  const rows = explainIncome(w.ctx, 'ISR');
  ok(rows.some((r) => r.label === 'The works, still building' && Math.abs(r.value + def.strain) < 1e-9),
    'and the ledger names it: "The works, still building"');
  const noBook = incomeBreakdown(w.ctx, 'JOR');
  ok(noBook.develop === 0, 'a court with no works pays no development line');

  // The clock, and nothing else: monthlyPrograms must not bill (economy does).
  const before = t.treasury;
  monthlyPrograms(w.ctx);
  ok(t.programs.uzi === def.months - 1 && t.treasury === before,
    'the monthly pass moves the clock and charges nothing — the treasury is the economy\'s to touch');

  const reinforceBefore = t.ideas.reinforceMult === undefined ? 1 : t.ideas.reinforceMult;
  for (let i = 0; i < def.months; i++) monthlyPrograms(w.ctx);
  ok(programStatus(t, 'uzi') === 'done', 'and after ' + def.months + ' months the Uzi is delivered');
  ok(incomeBreakdown(w.ctx, 'ISR').develop === 0,
    'the development line stops the month it delivers — a delivered work is an asset, not a bill');
  ok(Math.abs(t.ideas.reinforceMult - reinforceBefore * def.effects.reinforceMult) < 1e-9,
    'the effects are mounted on t.ideas, permanently (×' + def.effects.reinforceMult + ')');
  ok(programsDelivered(t) === 1, 'and the court counts one work delivered');
}

// ---------------------------------------------------------------------------
console.log('== the point of it: the arm stops being an import ==');
{
  const w = world('ISR');
  const t = w.game.tags.ISR;
  t.tech.mar = 24;
  t.treasury = 5000;
  // Israel opens under nobody (§181): both gated arms are shut.
  ok(armsGate(w.ctx, 'ISR', 'wing') !== '' && armsGate(w.ctx, 'ISR', 'armor') !== '',
    'with no supplier, aircraft and armor are both refused');

  deliver(w, 'ISR', 'nesher');
  ok(ownsWorks(w.ctx, 'ISR', 'wing') && !ownsWorks(w.ctx, 'ISR', 'armor'),
    'the Nesher gives this realm its own aircraft, and only its aircraft');
  ok(armsGate(w.ctx, 'ISR', 'wing') === '', 'so wings pass the gate with no supplier at all');
  ok(armsGate(w.ctx, 'ISR', 'armor') !== '', 'and armor still does not');
  ok(armsGate(w.ctx, 'ISR') !== '',
    'the un-armed question — is the pipeline open? — still answers no');

  // …and the sim's own verbs agree, not just the gate helper.
  const field = w.game.provinces.find((x) => x && x.owner === 'ISR' && x.controller === 'ISR' && !x.impassable);
  field.buildings = Array.isArray(field.buildings) ? field.buildings : [];
  if (field.buildings.indexOf('airfield') < 0) field.buildings.push('airfield');
  t.manpower = 50000;
  const wing = raiseAirWing(w.ctx, 'ISR', field.id, 'fighter');
  ok(wing.ok, 'raiseAirWing lets the squadron through: ' + (wing.why || 'queued'));
  const armor = recruitRegiment(w.ctx, 'ISR', field.id, 'cav');
  ok(!armor.ok && /supplier/.test(armor.why), 'recruitRegiment still refuses the tanks: ' + armor.why);

  deliver(w, 'ISR', 'merkava');
  ok(selfSufficientWorks(t) && isSelfArsenal(w.ctx, 'ISR'),
    'with the Merkava too, every gated arm is ours — the realm is its own arsenal');
  ok(armsGate(w.ctx, 'ISR', 'armor') === '' && armsGate(w.ctx, 'ISR') === '',
    'and every gate opens, including the un-armed one');
  ok(recruitRegiment(w.ctx, 'ISR', field.id, 'cav').ok, 'the tanks are raised');
}

// ---------------------------------------------------------------------------
console.log('== and the works can be sold: §181 signature, both directions ==');
{
  const w = world('ISR');
  const t = w.game.tags.ISR;
  ok(armsExporters(w.ctx).join(',') === era.bookmark.armsMarket.arsenals.join(','),
    'the exporters open as the bookmark declared them: ' + armsExporters(w.ctx).join(','));

  deliver(w, 'ISR', 'nesher');
  deliver(w, 'ISR', 'merkava');
  ok(armsExporters(w.ctx).indexOf('ISR') >= 0, 'a self-sufficient court joins the exporters');
  ok(armsSignGate(w.ctx, 'ISR', 'USA') === 'our own works build every pattern we need',
    'and is refused a signature for the one reason that is a boast');

  // Somebody else may now sign with it — and the fee lands in its treasury.
  const jor = w.game.tags.JOR;
  jor.atWarWith = []; jor.treasury = 500;
  delete w.game.armsDeals.JOR;
  t.opinion = t.opinion || {};
  t.opinion.JOR = 90;
  ok(armsSignGate(w.ctx, 'JOR', 'ISR') === '', 'Amman may sign with the works across the river');
  const info = armsInfo(w.ctx, 'JOR', 'ISR');
  ok(info && info.offered === true, 'and its panel carries the signature chip');
  const purse = t.treasury;
  const { signArmsDealCore } = await import('../../js/sim/arms.js');
  const signed = signArmsDealCore(w.ctx, 'JOR', 'ISR');
  ok(signed.ok && w.game.armsDeals.JOR === 'ISR', 'the agreement is signed');
  ok(t.treasury === purse + DEFINES.ARMS.cost,
    'and the fee lands in the treasury that paid for the shops (+' + DEFINES.ARMS.cost + ')');
}

// ---------------------------------------------------------------------------
console.log('== the Lavi: the one that can be abandoned ==');
{
  const w = world('ISR');
  const t = ready(w, 'ISR', 24, 5000, 5000);
  deliver(w, 'ISR', 'uzi'); deliver(w, 'ISR', 'nesher');
  deliver(w, 'ISR', 'kfir'); deliver(w, 'ISR', 'merkava');
  ok(programStartGate(w.ctx, 'ISR', 'lavi') === '', 'with the Kfir and the Merkava delivered, the Lavi opens');
  const def = ARMS_PROGRAMS.lavi;
  const treasury = t.treasury, points = t.points.mar;
  startProgramCore(w.ctx, 'ISR', 'lavi');
  monthlyPrograms(w.ctx);
  monthlyPrograms(w.ctx);
  ok(t.programs.lavi === def.months - 2, 'the line runs');

  const usaBefore = w.game.tags.USA.opinion.ISR || 0;
  const res = cancelProgramCore(w.ctx, 'ISR', 'lavi');
  ok(res.ok && programStatus(t, 'lavi') === 'none', 'and can be closed while it is still in the shops');
  ok(t.treasury === treasury - def.cost + Math.round(def.cost * DEFINES.PROGRAMS.cancelRefund),
    'part of the money comes back (' + Math.round(def.cost * DEFINES.PROGRAMS.cancelRefund) + ' of ' + def.cost + ')');
  ok(t.points.mar === points - def.points + Math.round(def.points * DEFINES.PROGRAMS.cancelPoints),
    'and a little of the thinking');
  ok((w.game.tags.USA.opinion.ISR || 0) > usaBefore,
    'the capital that was paying for it is pleased (' + usaBefore + ' → ' + w.game.tags.USA.opinion.ISR + ')');
  ok(!cancelProgramCore(w.ctx, 'ISR', 'uzi').ok, 'a work already delivered cannot be un-built');

  // Finishing it costs that regard instead.
  const w2 = world('ISR');
  const t2 = ready(w2, 'ISR', 24, 5000, 5000);
  deliver(w2, 'ISR', 'uzi'); deliver(w2, 'ISR', 'nesher');
  deliver(w2, 'ISR', 'kfir'); deliver(w2, 'ISR', 'merkava');
  const before2 = w2.game.tags.USA.opinion.ISR || 0;
  startProgramCore(w2.ctx, 'ISR', 'lavi');
  for (let i = 0; i <= def.months; i++) monthlyPrograms(w2.ctx);
  ok(programStatus(t2, 'lavi') === 'done', 'flown to delivery, it delivers');
  ok((w2.game.tags.USA.opinion.ISR || 0) === before2 + def.opinion.USA,
    'and Washington\'s regard pays for it (' + def.opinion.USA + ')');
}

// ---------------------------------------------------------------------------
console.log('== the AI: one line at a time, and closed when the money goes ==');
{
  const w = world('JOR'); // Israel and Egypt both on AI
  for (const tag of ['ISR', 'EGY']) ready(w, tag, 24, 4000, 4000);
  monthlyPrograms(w.ctx);
  const isr = w.game.tags.ISR, egy = w.game.tags.EGY;
  ok(Object.keys(isr.programs).length === 1 && Object.keys(egy.programs).length === 1,
    'both AI courts begin exactly one work');
  ok(isr.programs.uzi > 0, 'Israel starts with the cheapest thing it can build (the Uzi)');
  ok(egy.programs.qaher > 0, 'Egypt with the cheapest thing IT can (the rockets)');
  monthlyPrograms(w.ctx);
  ok(Object.keys(isr.programs).length === 1, 'and does not open a second while the first runs');

  isr.atWarWith = ['EGY'];
  const runningKeys = Object.keys(isr.programs).length;
  monthlyPrograms(w.ctx);
  ok(Object.keys(isr.programs).length === runningKeys, 'a court at war begins nothing new');

  // Helwan's whole history in one branch: the money runs out, the file closes.
  egy.treasury = -40;
  monthlyPrograms(w.ctx);
  ok(Object.keys(egy.programs).length === 0,
    'a court whose purse turns over while the line runs closes it');
  ok(egy.treasury > -40, 'recovering what the refund gives back (' + Math.round(egy.treasury) + ')');
}

// ---------------------------------------------------------------------------
console.log('== the effects fold, and the saves ==');
{
  // Only DELIVERED programs pay: a line still in the shops grants nothing.
  const working = computeProgramEffects({ uzi: 3 });
  ok(Object.keys(working).length === 0, 'a program under development grants nothing');
  const done = computeProgramEffects({ uzi: 0, merkava: 0 });
  ok(Math.abs(done.milPowerMult - ARMS_PROGRAMS.merkava.effects.milPowerMult) < 1e-9
    && Math.abs(done.incomeMult - ARMS_PROGRAMS.uzi.effects.incomeMult) < 1e-9,
  'two delivered works fold into one effects map, Mult keys multiplying');
  ok(Object.keys(computeProgramEffects({ ghost_program: 0 })).length === 0,
    'and a key this build no longer knows is ignored, not crashed on');

  // A pre-§212 save has no book at all.
  const w = world('ISR');
  const saved = JSON.parse(JSON.stringify(w.game));
  for (const k of Object.keys(saved.tags)) delete saved.tags[k].programs;
  reviveGame(saved);
  const revived = makeCtx({
    game: saved, DEFINES, MAP_DATA, geom, bus, bookmark: era.bookmark, events: era.events,
  });
  ok(Object.keys(saved.tags).every((k) => saved.tags[k].programs
    && Object.keys(saved.tags[k].programs).length === 0),
  'a pre-§212 save revives with an empty book on every court');
  ok(!isSelfArsenal(revived, 'ISR') && armsGate(revived, 'ISR', 'wing') !== '',
    'owning no works, and gated exactly as §181 left it');
  ok(ownWorksOf(saved.tags.ISR).size === 0 && programStrain(saved.tags.ISR) === 0,
    'with no works and no development line');
}

// ---------------------------------------------------------------------------
console.log('== the antique chapters are untouched ==');
{
  for (const id of ['167bce', '66ce', '614ce']) {
    const e = ERAS.find((x) => x.bookmark.id === id);
    const game = initGame({
      DEFINES, MAP_DATA, geom, bookmark: e.bookmark, events: e.events,
      playerTag: e.bookmark.playableTags[0].tag, rngSeed: 3,
    });
    const ctx = makeCtx({ game, DEFINES, MAP_DATA, geom, bus, bookmark: e.bookmark, events: e.events });
    const me = game.playerTag;
    ok(programsInfo(ctx, me) === null && armsGate(ctx, me, 'armor') === '' && armsGate(ctx, me, 'wing') === '',
      id + ': no works to build, and no gate to pass — the chapter declares no market');
    ok(!isSelfArsenal(ctx, me) && armsExporters(ctx).length === 0,
      id + ': nobody is an arsenal, earned or declared');
  }
}

// ---------------------------------------------------------------------------
console.log('== the world still turns: a year of real months with a line running ==');
{
  const w = world('ISR');
  const t = ready(w, 'ISR', 24, 3000, 3000);
  startProgramCore(w.ctx, 'ISR', 'uzi');
  const months = ARMS_PROGRAMS.uzi.months;
  for (let i = 0; i < 400; i++) tickDay(w.ctx);
  ok(t.programs.uzi < months && t.programs.uzi >= 0,
    'tickDay advances the clock through the ordinary monthly block (' + t.programs.uzi + ' left)');
  ok(Number.isFinite(t.treasury), 'and the treasury stays a number');
}

console.log(failures === 0 ? '\nsmoke139 OK' : '\nsmoke139 FAILED (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
