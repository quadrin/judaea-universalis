// Judaea Universalis — the provinces the Republic made, 149–27 BCE
// (SPEC §256). Content package. Zero imports; all effects run through
// ctx.helpers at runtime. Concatenated onto EVENTS_167 by the era registry.
// BCE years are negative.
//
// §111 gave this chapter a world spine and `events_167bce_republic.js` gave it
// the Republic's own century — Numantia and the Gracchi, Arausio and Vercellae,
// the Social War, Sulla's march, the lists in the Forum. All of it happens
// INSIDE Italy and Spain, and that is the hole this package fills: the century
// in which Rome acquired the Mediterranean is in this chapter as biography and
// not as ground.
//
// The chapter's own siblings say so. The 167 board is dealt by
// js/data/political_maps.js and so is the 67 board and the 40 board, and the
// three of them are a before-and-after with nothing in between:
//
//   MAP_167  Carthage holds Zeugitana and Byzacena. The Achaean League holds
//            Corinth, Athens and Sparta. Numidia runs from the Mulucha to the
//            Syrtis. The Arverni hold Narbo and the road to Spain. Massalia is
//            free, the Lusitani hold the Tagus, Egypt holds Cyrene and Cyprus
//            and the Nile.
//   MAP_67   Rome holds all of it but Egypt, Greece and Gaul beyond the
//            provincia.
//   MAP_40   Rome holds Gaul as well, and Africa Nova, and Massalia.
//
// This chapter runs from 167 BCE to 6 CE. It crosses both of those boundaries
// and moved neither: before this package, a campaign played to its last card
// ended with Carthage standing, the leagues of Hellas a court, Numidia a
// kingdom, and the last of Alexander's generals' houses still reigning in
// Alexandria thirty-six years after Octavian took it. The player is told the
// Republic conquered the world in eighteen cards of Roman politics and can
// look at the map and see that it did not.
//
// So: nineteen cards, and the map moves in sixteen of them. What they cover is
// what the user of a map asks for — Greece, North Africa, Egypt — and what the
// atlases in this repository already assume happened in between.
//
// THE RULES THIS PACKAGE INHERITS, and does not bend:
//
//   §104's admission rule. Every card here happens whichever way the revolt
//   went. Rome burns Carthage in 146 in a world where Judas Maccabaeus won and
//   in a world where he was killed at Elasa, and the high priests read the same
//   dispatch either way.
//
//   §111's transfer discipline. Ownership moves by explicit named list, off the
//   named losers only, and never off a living court that history did not take
//   it from. A Judaea that has taken Cyprus for itself keeps Cyprus when Cato
//   arrives; what Cato annexes is what Egypt still holds.
//
//   §252's verdict rule, and this is the one worth stating plainly, because
//   this package is exactly where a reader will ask why nothing here is drawn.
//   §252 draws for outcomes nothing downstream is written for. Every outcome in
//   this file has four chapters of downstream content written for it: the 67
//   chapter opens on a Rome that owns Africa and Spain, the 40 chapter on a
//   Rome that owns Gaul, the 66 chapter on a Rome that owns Egypt, and every
//   one of those boards is dealt in political_maps.js against the assumption
//   that these wars went the way they went. A drawn Carthage is not a
//   serendipitous alternative; it is a chapter contradicting its own siblings'
//   opening map. The wars whose outcomes this game DOES draw are the ones
//   fought inside the Republic, and §251–§253 already drew them.
//
// Source spine: Polybius XXXVI–XXXIX and the fragments of XXXIX on Corinth;
// Appian, Libyca (the ultimatum and the six days), Iberica, Gallica, Mithridatica
// and Civil Wars II and IV; Livy's Periochae 49–52 and 134–136; Plutarch's
// Cato Minor for Cyprus and Utica, Caesar for Alexandria, Sulla for the
// Piraeus, Brutus for Rhodes and Antony for the end;
// Caesar, Bellum Gallicum and Bellum Civile II for Massilia; Strabo IV.2.3 and
// VIII.6.23 for the Arverni and for what Corinth was worth; Florus and Orosius
// where they are the only ones left, with the usual caution; Josephus,
// Antiquitates XIV.127–139 for the Jewish contingent that opened the road at
// Pelusium; Dio LI for the settlement of Egypt and LIII for the division of 27.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_167bce_provinces] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135). A realm that has taken a
// greater crown files its provinces, armies and wars under the new tag, while
// this chapter was written against the old one; the sim keeps the forwarding
// address and hands it back through ctx.helpers. Defensive about `helpers`
// because the content packages are also read cold, with no game to resolve
// against.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function safeTrigger(key, fn) {
  return function (ctx) {
    try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + key, e); return false; }
  };
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

// A foreign card's local weather — a shrine emptied, legions wintering in a
// country that has not been conquered — laid on the ground it happens to,
// EXCEPT the crown's own. The same border §111 draws around ownership is drawn
// here around consequence: what Rome does in this package it does abroad, and a
// province the player is holding is not abroad.
function stir(ctx, names, mod) {
  const me = crown(ctx);
  for (const n of names) {
    const p = ctx.prov && ctx.prov(n);
    if (!p || p.impassable || (me && p.owner === me)) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
  }
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, a)];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[who(ctx, b)] = Math.max(-200, Math.min(200, val));
}

function nudgeOpinion(ctx, a, b, d) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, a)];
  if (!t || t.alive === false) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  const k = who(ctx, b);
  t.opinion[k] = Math.max(-200, Math.min(200, (t.opinion[k] || 0) + d));
}

// The Jewish crown, whatever it is calling itself this decade (SPEC §135).
function crown(ctx) {
  for (const t of ['HAS', 'MLI']) {
    const held = who(ctx, t);
    if (alive(ctx, held)) return held;
  }
  return null;
}

// Hand a named list over, but never take a province off a living court that is
// not one of the named losers — a world card rearranges what history
// rearranged and does not confiscate the player's conquests (SPEC §111).
function transfer(ctx, names, to, from) {
  const g = ctx.game;
  const losers = new Set([].concat(from));
  let n = 0;
  for (const name of names) {
    const p = ctx.prov && ctx.prov(name);
    if (!p || p.impassable) continue;
    if (!losers.has(p.owner)) {
      const owner = g.tags[p.owner];
      if (owner && owner.alive !== false) continue;
    }
    if (p.owner === who(ctx, to)) continue;
    ctx.helpers.changeOwner(ctx, p.canon || p.name, to);
    n++;
  }
  return n;
}

// A card ruins only what it takes, and improves only what it holds. §111 says a
// world card may not confiscate the player's conquests; this is the same rule
// one step further in, because a card that cannot take Corinth off a Jewish
// king cannot burn it either — if Judaea got to the Isthmus before Mummius did,
// what Mummius has is a war, not a sack. Both the razings and the colonies in
// this file therefore ask who is standing there AFTER the transfer, and do
// nothing at all where the answer is somebody else.
//
// Development is physical (SPEC §173's own line: local facts stay physical), so
// a razing takes it off the province and the modifier carries the generation of
// ruin that follows.
function ifHeldBy(ctx, name, tag) {
  const p = ctx.prov && ctx.prov(name);
  return p && !p.impassable && p.owner === who(ctx, tag) ? p : null;
}

function raze(ctx, name, tax, prod, by) {
  const p = ifHeldBy(ctx, name, by || 'ROM');
  if (!p || !p.dev) return false;
  p.dev.tax = Math.max(1, (p.dev.tax || 1) - (tax || 0));
  p.dev.prod = Math.max(1, (p.dev.prod || 1) - (prod || 0));
  return true;
}

// A province modifier the taker's own hand puts there — a ruin, a colony, a
// road — applied only where the taker actually took the ground.
function mark(ctx, names, mod, by) {
  for (const n of [].concat(names)) {
    if (!ifHeldBy(ctx, n, by || 'ROM')) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
  }
}

// What the East does when Rome does something the East can read. Every court
// with a chancery between the Adriatic and the Tigris cools by the same
// number, because they were all reading the same dispatch.
const EASTERN_COURTS = ['SEL', 'PTO', 'PAR', 'ARM', 'NAB', 'PNT', 'CMG', 'OSR', 'ITU'];
function theEastReads(ctx, d) {
  for (const t of EASTERN_COURTS) nudgeOpinion(ctx, t, 'ROM', d);
}

// ── the ground, by name ────────────────────────────────────────────────────

// Carthage's own country in 149 is Zeugitana, Byzacena and the Syrtis emporia
// the treaty of 201 left it — Carthago, Hadrumetum, Thysdrus and Tacape — and
// that is the WHOLE of what the tag holds on the 167 board. So the fall of the
// city is `dissolveTag` and not a named list: a list would have to be kept in
// step with a political map it can only ever lag behind, and the honest
// statement is the one the card actually means, which is that the court stops
// existing and everything it still has goes to the one that killed it.
// Masinissa's western marches — the Masaesyli lands to the Mulucha — which
// Bocchus and Bogud are paid with in 46 for having chosen the winner twice.
const MASAESYLI = ['Saldae', 'Icosium', 'Caesarea Mauretaniae', 'Portus Magnus'];
// Lusitania south of the Tagus: what Brutus took and held. The northwest —
// Bracara and Asturica — is not on this list and does not fall until Augustus,
// which is the point of the card.
const LUSITANIA_SOUTH = ['Emerita', 'Salmantica', 'Olisipo'];
// The provincia of 121–118: the Arvernian hegemony's southern half, the road
// to Spain, and the colony at Narbo Martius that holds it.
const TRANSALPINA = ['Narbo', 'Nemausus', 'Tolosa', 'Genava'];
// Caesar's Gaul, by name — the SAME list the 67 chapter's own Alesia card
// uses (events_67bce_world.js), because it is the same conquest seen from a
// different chapter and the two must not disagree about what it took. Genava
// and Tolosa are on the list above and already Roman by then; transfer() skips
// what the taker already holds. The Rhine bank stays with the peoples who held
// it: Caesar bridged the river to demonstrate that he could, not to stay.
const CAESARS_GAUL = [
  'Lugdunum', 'Augustodunum', 'Avaricum', 'Limonum', 'Condate', 'Darioritum',
  'Lutetia', 'Rotomagus', 'Samarobriva', 'Gesoriacum', 'Durocortorum',
  'Augusta Treverorum', 'Vesontio', 'Genava', 'Burdigala',
];
// The Pentapolis and its desert march, left to Rome by will in 96 and governed
// by nobody at all for twenty-two years.
const CYRENAICA = ['Cyrene', 'Marmarica'];
// Ptolemaic Cyprus: the island Rome annexed to pay for a grain law.
const CYPRUS = ['Salamis', 'Paphos'];

export const EVENTS_167_PROVINCES = [

  // ── P1 · -149 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_carthage_ultimatum',
    title: 'And Now Move Your City',
    worldLabel: 'Rome demands Carthage be moved inland; the third war begins',
    desc: 'Carthage has finished paying the indemnity of 201 — fifty years of it, to '
      + 'the day; it offered years ago to clear the whole balance at once and the '
      + 'Senate declined, because a debtor is easier to manage than a friend. It has '
      + 'also, at last, defended itself against '
      + 'Masinissa, who has spent forty years taking its fields at law and keeping them '
      + 'by force, and defending itself is the one thing the treaty forbids. So Rome '
      + 'comes. The demands arrive one at a time and each is met: three hundred '
      + 'children of the first families as hostages, handed over; every weapon and '
      + 'every catapult in the city, two hundred thousand suits of armour by Appian\'s '
      + 'count, handed over. Then the consuls read out the last instruction, which is '
      + 'that the Carthaginians are to abandon their city and settle again somewhere at '
      + 'least ten miles from the sea. A people who live by the sea are being told '
      + 'politely to stop being themselves. They spend the night making weapons out of '
      + 'the temple roofs and the women\'s hair, and hold out for three years.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -149, m: 3 },
    world: true,
    major: true,
    when: safeTrigger('ev_pv_carthage_ultimatum:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'CAR')),
    aiOption: 0,
    historical: 'Carthage met every demand until the last; the order to move the city ten miles inland began the Third Punic War in 149.',
    options: [
      {
        label: 'The last demand is refused',
        tooltip: 'Rome declares the Third Punic War on Carthage and lands its consular armies. Carthage arms itself out of its own roofs — "The Hair of the Women of Carthage" (+25% morale, +20% manpower, −30% income while it lasts) and a defence of the walls at Carthago. Numidia warms 40 toward Rome; every eastern court cools 10, having noticed how a treaty of friendship ends.',
        effects: guard('ev_pv_carthage_ultimatum:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM') || !alive(ctx, 'CAR')) return;
          h.declareWar(ctx, 'ROM', 'CAR', 'The Third Punic War');
          h.addTagModifier(ctx, 'CAR', {
            id: 'hair_of_the_women', name: 'The Hair of the Women of Carthage', months: -1,
            effects: { moraleMult: 1.25, manpowerMult: 1.2, incomeMult: 0.7 },
          });
          h.adjust(ctx, 'CAR', { legitimacy: 20, manpower: 9000 });
          h.spawnArmy(ctx, 'CAR', 'Carthago', {
            inf: 11, cav: 1, name: 'The Defence of the Walls',
            general: { name: 'Hasdrubal the Boetharch', fire: 2, shock: 3, maneuver: 1 },
          });
          h.spawnArmy(ctx, 'ROM', 'Panormus', {
            inf: 12, cav: 2, name: 'The Army of Africa',
            general: { name: 'Manius Manilius', fire: 2, shock: 2, maneuver: 2 },
          });
          nudgeOpinion(ctx, 'NUM', 'ROM', 40);
          theEastReads(ctx, -10);
          h.setFlag(ctx, 'thirdPunicWar', true);
          h.chronicle(ctx, 'era', 'Carthage gives up its hostages and its weapons and refuses to give up its city; the third war begins.');
        }),
      },
    ],
  },

  // ── P2 · -146 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_carthage_falls',
    title: 'Six Days from the Harbour to the Citadel',
    worldLabel: 'Scipio takes Carthage; the city is destroyed and Africa is a province',
    desc: 'Two consuls fail at it, and then the command goes to a man too young for it '
      + 'by law — Scipio Aemilianus, who is the grandson by adoption of the Scipio who '
      + 'beat Hannibal, and who has to be given a special dispensation to hold the '
      + 'office. He seals the harbour with a mole, storms the wall, and then fights '
      + 'six days up the three streets that climb from the docks to the Byrsa, house '
      + 'by house and roof by roof, with the engineers pulling the buildings down '
      + 'behind the line so the men have something to walk on. Fifty thousand come out '
      + 'under terms. The Roman deserters in the temple of Eshmun do not, and neither '
      + 'does Hasdrubal\'s wife, who tells her husband exactly what she thinks of him '
      + 'for surrendering and then walks into the fire with their children. Polybius is '
      + 'standing beside Scipio when the general looks at it and quotes Homer on the '
      + 'day Troy will fall, and says he is thinking of Rome. The site is cursed, the '
      + 'territory is surveyed, and what was Carthage becomes the province of Africa, '
      + 'which will feed Rome for six hundred years.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -146, m: 2 },
    world: true,
    major: true,
    when: safeTrigger('ev_pv_carthage_falls:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'CAR')),
    aiOption: 0,
    historical: 'Scipio Aemilianus took Carthage in the spring of 146 after six days of street fighting; the city was destroyed and its territory became the province of Africa.',
    options: [
      {
        label: 'Pull the houses down behind the line',
        tooltip: 'Carthage ceases to exist as a court: everything it still holds passes to Rome, and Carthago itself is razed (−4 development, "The Ground Where Carthage Stood" — +3 unrest, −60% tax for 300 months). Rome +450 talents and "The Province of Africa" (+8% income permanently). Numidia gets a Roman province where it wanted a Punic inheritance: −40 opinion of Rome and −10 legitimacy.',
        effects: guard('ev_pv_carthage_falls:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM') || !alive(ctx, 'CAR')) return;
          h.dissolveTag(ctx, 'CAR', 'ROM');
          raze(ctx, 'Carthago', 2, 2);
          mark(ctx, ['Carthago'], {
            id: 'ground_where_carthage_stood', name: 'The Ground Where Carthage Stood', months: 300,
            effects: { unrest: 3, taxMult: 0.4 },
          });
          h.adjust(ctx, 'ROM', { treasury: 450, legitimacy: 12, mar: 10 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'province_of_africa', name: 'The Province of Africa', months: -1,
            effects: { incomeMult: 1.08 },
          });
          if (alive(ctx, 'NUM')) {
            nudgeOpinion(ctx, 'NUM', 'ROM', -40);
            h.adjust(ctx, 'NUM', { legitimacy: -10 });
          }
          h.setFlag(ctx, 'carthageDestroyed', true);
          h.chronicle(ctx, 'era', 'Carthage falls after six days in its own streets and is destroyed; its country becomes the province of Africa.');
        }),
      },
    ],
  },

  // ── P3 · -146 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_achaean_war',
    title: 'Dice on the Paintings',
    worldLabel: 'Mummius sacks Corinth; the leagues of Hellas are dissolved',
    desc: 'The Achaean League has spent a decade being told by Roman commissioners '
      + 'which of its members it may keep, and in the summer of 146 it stops listening, '
      + 'abuses the last embassy in the street, and declares war on Sparta in the teeth '
      + 'of a Senate that has forbidden it. Metellus breaks the league army at '
      + 'Scarpheia before the consul arrives; Mummius arrives anyway, wins at the '
      + 'Isthmus, and finds Corinth open. He kills the men, sells the women and the '
      + 'children, and ships the art to Italy — and Polybius, who is Greek, who is '
      + 'there, and who spends his book explaining to Greeks why Rome deserves to rule '
      + 'them, records that he saw soldiers playing dice on a painting of Dionysus that '
      + 'had been thrown down on the ground. The leagues are dissolved, the democracies '
      + 'are replaced by property qualifications, and Greece is handed to the governor '
      + 'of Macedonia to supervise. In the same season the same Republic destroyed '
      + 'Carthage. Neither city was a threat, and that is the whole lesson: Rome has '
      + 'stopped destroying rivals and started destroying examples, and every court '
      + 'from Antioch to Alexandria reads the dispatch correctly and begins answering '
      + 'its Roman letters the week they arrive.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -146, m: 7 },
    world: true,
    major: true,
    when: safeTrigger('ev_pv_achaean_war:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Mummius sacked Corinth in 146 in the same year Scipio destroyed Carthage; the Achaean League was dissolved and Greece supervised from Macedonia.',
    options: [
      {
        label: 'Delenda est, twice in one year',
        tooltip: 'Corinth passes to Rome off the Greek leagues only, and is ruined (−4 development, "The Sack of Corinth" — +3 unrest, −50% tax for 120 months). Hellas loses its confederacies: −25 legitimacy, −1 stability and "The Leagues Are Dissolved" (−25% income, −30% manpower permanently). Rome +350 talents and "The Lesson of the Two Cities" (+8% income permanently). Every eastern court cools 20 toward Rome and learns to answer its letters the same week they arrive.',
        effects: guard('ev_pv_achaean_war:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          // §257 declares this war two months before this card settles it.
          h.endWar(ctx, 'ROM', 'GRC', 'att');
          transfer(ctx, ['Corinth'], 'ROM', 'GRC');
          raze(ctx, 'Corinth', 2, 2);
          mark(ctx, ['Corinth'], {
            id: 'the_sack_of_corinth', name: 'The Sack of Corinth', months: 120,
            effects: { unrest: 3, taxMult: 0.5 },
          });
          if (alive(ctx, 'GRC')) {
            h.adjust(ctx, 'GRC', { legitimacy: -25, stability: -1 });
            h.addTagModifier(ctx, 'GRC', {
              id: 'leagues_dissolved', name: 'The Leagues Are Dissolved', months: -1,
              effects: { incomeMult: 0.75, manpowerMult: 0.7 },
            });
          }
          h.adjust(ctx, 'ROM', { treasury: 350, legitimacy: 15, stability: 1 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'lesson_of_two_cities', name: 'The Lesson of the Two Cities', months: -1,
            effects: { incomeMult: 1.08 },
          });
          theEastReads(ctx, -20);
          h.setFlag(ctx, 'twoCities', true);
          h.setFlag(ctx, 'corinthSacked', true);
          h.chronicle(ctx, 'era', 'Corinth is sacked in the year Carthage burns; the leagues of Hellas are dissolved, and the East reads the lesson correctly.');
        }),
      },
    ],
  },

  // ── P4 · -138 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_brutus_callaicus',
    title: 'The River of Forgetfulness',
    worldLabel: 'Brutus crosses the Tagus; Lusitania south of the river is Roman',
    desc: 'Viriathus is a year dead, killed in his sleep by his own envoys with Roman '
      + 'gold, and the consul Decimus Junius Brutus is sent to finish what the murder '
      + 'started. He does it the expensive way — a colony of Viriathus\'s own veterans '
      + 'settled at Valentia on land they will now defend, a base at Olisipo on the '
      + 'ocean, and then a march north through country nobody in Italy has a map of. At '
      + 'the Limia the army stops, because the Celts call it the Lethe, the river of '
      + 'forgetfulness, and say a man who crosses it loses his name and his home and '
      + 'everyone he ever knew. The consul takes the standard out of the bearer\'s '
      + 'hands, wades across alone, turns round, and calls each of them by name from '
      + 'the far bank until they come. They give him the surname Callaicus for it. The '
      + 'Lusitani keep the northwest — Bracara and Asturica do not fall for another '
      + 'hundred and nineteen years, and Augustus will have to come himself — but the '
      + 'Tagus is a Roman river now, and the whole Atlantic face of the peninsula south '
      + 'of it is provincial ground.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -138, m: 5 },
    world: true,
    when: safeTrigger('ev_pv_brutus_callaicus:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'D. Junius Brutus Callaicus campaigned to the Minho in 138–136 and settled Viriathus\' veterans at Valentia; the northwest was not taken until 19 BCE.',
    options: [
      {
        label: 'Carry the standard across yourself',
        tooltip: 'Emerita, Salmantica and Olisipo pass to Rome off the Lusitani only; the northwest stays theirs. Lusitania −15 legitimacy and "South of the Tagus" (−20% income permanently). Rome +90 talents, +8 legitimacy and +10 martial points.',
        effects: guard('ev_pv_brutus_callaicus:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          const took = transfer(ctx, LUSITANIA_SOUTH, 'ROM', 'LUS');
          h.adjust(ctx, 'ROM', { treasury: 90, legitimacy: 8, mar: 10 });
          if (alive(ctx, 'LUS')) {
            h.adjust(ctx, 'LUS', { legitimacy: -15 });
            h.addTagModifier(ctx, 'LUS', {
              id: 'south_of_the_tagus', name: 'South of the Tagus', months: -1,
              effects: { incomeMult: 0.8 },
            });
          }
          h.setFlag(ctx, 'tagusCrossed', true);
          h.chronicle(ctx, 'era', 'Brutus carries the standard across the river of forgetfulness alone and calls his army over by name; Lusitania south of the Tagus (' + took + ' provinces) is Roman.');
        }),
      },
    ],
  },

  // ── P5 · -123 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_baleares',
    title: 'The Islands That Sold Slingers',
    worldLabel: 'Metellus takes the Balearics; the sea road to Spain is closed',
    desc: 'The Balearic islanders are the best slingers in the world and hire out to '
      + 'anyone — they fought for Carthage at Cannae and for Rome afterwards, and the '
      + 'stones they throw punch through shields. They are also, when nobody is hiring, '
      + 'pirates, and the islands sit exactly across the sea road between Italy and the '
      + 'Spanish provinces. Quintus Caecilius Metellus takes them in two seasons, with '
      + 'hides stretched over the decks of his ships because the stones came through '
      + 'the planking, and then does the thing that actually settles a country: three '
      + 'thousand Roman citizens out of Spain are planted at Palma and Pollentia, and '
      + 'the islands stop being anybody\'s market and start being somebody\'s farms. He '
      + 'takes the surname Balearicus. The road to Spain is now a Roman road all the '
      + 'way, and one more piece of open water on this map has an owner.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -123, m: 6 },
    world: true,
    when: safeTrigger('ev_pv_baleares:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Metellus Balearicus took the islands in 123–122 and settled 3,000 Roman colonists from Spain at Palma and Pollentia.',
    options: [
      {
        label: 'Stretch hides over the decks and land',
        tooltip: 'The Balearics pass to Rome, and carry "The Colonists Out of Spain" (+15% tax for 120 months). Rome +50 talents and +5 legitimacy.',
        effects: guard('ev_pv_baleares:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, ['Baleares'], 'ROM', 'WASTE');
          mark(ctx, ['Baleares'], {
            id: 'colonists_out_of_spain', name: 'The Colonists Out of Spain', months: 120,
            effects: { taxMult: 1.15 },
          });
          h.adjust(ctx, 'ROM', { treasury: 50, legitimacy: 5 });
          h.setFlag(ctx, 'balearesTaken', true);
          h.chronicle(ctx, 'era', 'Metellus takes the Balearics under hides and plants three thousand citizens on them; the sea road to Spain is closed.');
        }),
      },
    ],
  },

  // ── P6 · -121 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_transalpina',
    title: 'The Silver Armour and the Road',
    worldLabel: 'Rome breaks the Arverni; Gallia Transalpina becomes a province',
    desc: 'The Arverni under Luernius and his son Bituitus hold the widest hegemony '
      + 'Gaul has ever produced — Strabo says their rule reached to Narbo and the '
      + 'borders of Massalia — and Luernius is the king who is said to have driven a '
      + 'chariot across his own country scattering gold to whoever came. His son fights '
      + 'Rome, which has been asked in by Massalia and by the Aedui and did not need '
      + 'much asking. Domitius Ahenobarbus beats the Allobroges at Vindalium, riding an '
      + 'elephant along his own line because the Gauls have never seen one; Fabius '
      + 'Maximus beats Bituitus at the confluence of the Isère and the Rhône, where a '
      + 'bridge of boats gives way under the retreat. Bituitus is invited to Rome under '
      + 'safe conduct to negotiate, and is arrested there and never leaves. His silver '
      + 'armour and his chariot go through the city in the triumph. What Rome builds on '
      + 'the ground it has taken is a road — the Via Domitia, from the Alps to the '
      + 'Pyrenees, with a colony of citizens at Narbo Martius planted on it in 118 — '
      + 'because the point of southern Gaul is that Spain is on the other side of it. '
      + 'The Aedui are named friends and brothers of the Roman people. It will take '
      + 'them sixty years to work out what that means.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -121, m: 8 },
    world: true,
    major: true,
    when: safeTrigger('ev_pv_transalpina:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Domitius and Fabius Maximus broke the Allobroges and the Arverni in 122–121; Narbo Martius was founded in 118 and the Via Domitia built through the new provincia.',
    options: [
      {
        label: 'A road from the Alps to the Pyrenees',
        tooltip: 'Narbo, Nemausus, Tolosa and Genava pass to Rome off the Arverni only. The Arvernian hegemony ends: −25 legitimacy and "The Road Through Their Country" (−20% income, −15% manpower permanently). Narbo and Nemausus carry "The Via Domitia" (+12% tax for 120 months). Rome +140 talents and +10 legitimacy; the Aedui warm 45 toward Rome, which is how a friendship of this kind starts.',
        effects: guard('ev_pv_transalpina:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          const took = transfer(ctx, TRANSALPINA, 'ROM', 'AVN');
          h.adjust(ctx, 'ROM', { treasury: 140, legitimacy: 10 });
          mark(ctx, ['Narbo', 'Nemausus'], {
            id: 'via_domitia', name: 'The Via Domitia', months: 120,
            effects: { taxMult: 1.12 },
          });
          if (alive(ctx, 'AVN')) {
            h.adjust(ctx, 'AVN', { legitimacy: -25, stability: -1 });
            h.addTagModifier(ctx, 'AVN', {
              id: 'road_through_their_country', name: 'The Road Through Their Country', months: -1,
              effects: { incomeMult: 0.8, manpowerMult: 0.85 },
            });
          }
          nudgeOpinion(ctx, 'AED', 'ROM', 45);
          h.setFlag(ctx, 'transalpina', true);
          h.chronicle(ctx, 'era', 'Bituitus goes to Rome under safe conduct and does not come back; Gallia Transalpina (' + took + ' provinces) is a province with a road through it.');
        }),
      },
    ],
  },

  // ── P7 · -96 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_apions_will',
    title: 'A Kingdom Nobody Was Sent To',
    worldLabel: 'Ptolemy Apion leaves Cyrene to Rome; nobody is sent to govern it',
    desc: 'Ptolemy Apion, the bastard son of Ptolemy Physcon and king of Cyrene, dies '
      + 'without an heir and leaves his kingdom to the Roman people — the third '
      + 'testament of this kind in forty years, after Pergamon and Bithynia\'s dry run, '
      + 'and by now the eastern chanceries draft royal wills knowing the Senate will '
      + 'read them. What happens next is the part nobody expects. Rome takes the royal '
      + 'estates, which are worth having — the silphium monopoly alone, a plant that '
      + 'grows nowhere else on earth and is on the city\'s coinage — declares the five '
      + 'cities of the Pentapolis free, and then sends nobody. No governor, no garrison, '
      + 'no assize. For twenty-two years Cyrenaica is a Roman possession administered by '
      + 'the absence of Rome: the cities feud, the countryside is raided, the Jewish '
      + 'community of Cyrene — which is large, and old, and will one day produce a king '
      + 'of its own — takes both the opportunity and the blame, and it takes a civil war '
      + 'in Italy and a pirate emergency before the Senate finally sends a quaestor to '
      + 'find out what it owns.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -96, m: 3 },
    world: true,
    when: safeTrigger('ev_pv_apions_will:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Ptolemy Apion bequeathed Cyrene to Rome in 96; the Senate took the royal estates, freed the cities, and did not organize the province until 74.',
    options: [
      {
        label: 'Accept the estates and send nobody',
        tooltip: 'Cyrene and Marmarica pass to Rome off Egypt only, and carry "A Province Nobody Was Sent To" (+2 unrest, −60% tax) until somebody is. Rome +70 talents of royal estate; Egypt −10 legitimacy and −1 stability, having lost a kingdom to a document.',
        effects: guard('ev_pv_apions_will:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          const took = transfer(ctx, CYRENAICA, 'ROM', 'PTO');
          mark(ctx, CYRENAICA, {
            id: 'province_nobody_was_sent_to', name: 'A Province Nobody Was Sent To', months: 300,
            effects: { unrest: 2, taxMult: 0.4 },
          });
          h.adjust(ctx, 'ROM', { treasury: 70 });
          if (alive(ctx, 'PTO') && took) h.adjust(ctx, 'PTO', { legitimacy: -10, stability: -1 });
          h.setFlag(ctx, 'apionsWill', true);
          h.chronicle(ctx, 'era', 'Cyrene is left to the Roman people by will; Rome takes the estates, frees the cities, and sends no one at all.');
        }),
      },
    ],
  },

  // ── P8 · -86 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_sulla_athens',
    title: 'The Groves of the Academy',
    worldLabel: 'Sulla storms Athens and burns the Piraeus',
    desc: 'Athens has bet on Mithridates. A philosopher named Aristion, sent from '
      + 'Pontus, holds the city for him, and Sulla — proscribed at home, with no '
      + 'treasury and no fleet and an army that is loyal to him personally because '
      + 'nobody else will pay it — sits down outside and starts cutting. He fells the '
      + 'groves of the Academy and the Lyceum for siege timber, which is the detail '
      + 'every ancient writer records and none of them forgives, and sends to Delphi, '
      + 'Olympia and Epidaurus for the temple treasures, with a note observing that the '
      + 'gods\' silver is more use lent than stored. He takes the city on the first of '
      + 'March through the weakest stretch of wall, having been told where it was by '
      + 'two old men gossiping in a barber\'s shop. The killing goes on until the '
      + 'Athenian exiles in his own camp beg him to stop and he says he pardons the '
      + 'many for the sake of the few and the living for the sake of the dead, which is '
      + 'the most graceful sentence anyone says all year and does not bring anyone '
      + 'back. Then he storms the Piraeus and burns it — the arsenal of Philon, the '
      + 'long walls, the greatest harbour in Greece — and the Piraeus never recovers. '
      + 'Athens keeps its name, its schools and its ruins, and stops being a power that '
      + 'anyone has to consult about anything.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -86, m: 3 },
    world: true,
    major: true,
    when: safeTrigger('ev_pv_sulla_athens:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Sulla stormed Athens on 1 March 86 and burned the Piraeus; he had already sent for the treasures of Delphi, Olympia and Epidaurus to pay his army.',
    options: [
      {
        label: 'Cut the Academy down for timber',
        tooltip: 'Athens passes to Rome off the Greek cities only and is ruined (−3 development, "The Piraeus Burned" — +2 unrest, −40% tax for 180 months). Hellas −20 legitimacy and −1 stability. Rome +300 talents of temple silver, and the shrines remember: Sparta, Gortyn and Rhodes each take +1 unrest for 60 months while the priests count what is missing.',
        effects: guard('ev_pv_sulla_athens:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, ['Athens'], 'ROM', 'GRC');
          raze(ctx, 'Athens', 2, 1);
          mark(ctx, ['Athens'], {
            id: 'the_piraeus_burned', name: 'The Piraeus Burned', months: 180,
            effects: { unrest: 2, taxMult: 0.6 },
          });
          stir(ctx, ['Sparta', 'Gortyn', 'Rhodes'], {
            id: 'the_gods_silver_lent', name: 'The Gods\' Silver, Lent', months: 60,
            effects: { unrest: 1 },
          });
          if (alive(ctx, 'GRC')) h.adjust(ctx, 'GRC', { legitimacy: -20, stability: -1 });
          h.adjust(ctx, 'ROM', { treasury: 300 });
          theEastReads(ctx, -8);
          h.setFlag(ctx, 'athensStormed', true);
          h.chronicle(ctx, 'era', 'Sulla cuts down the Academy for siege timber, storms Athens and burns the Piraeus; the harbour never comes back.');
        }),
      },
    ],
  },

  // ── P9 · -71 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_the_two_shores',
    title: 'The Two Shores',
    worldLabel: 'Rome closes the Dalmatian coast and the west-Pontic cities',
    desc: 'Two commands, four years apart, neither of them famous, and between them '
      + 'they finish something. Gaius Cosconius spends two years in Illyria and takes '
      + 'Salona, which has been the Delmatae\'s port and the reason the Adriatic has a '
      + 'wild side; the Delmatae go back to their hills and will need putting down '
      + 'twice more before Augustus is finished with them, but the coast is Roman. Then '
      + 'Marcus Lucullus — the less interesting Lucullus, the one whose brother is '
      + 'fighting Mithridates and getting the histories — marches the army of Macedonia '
      + 'north-east through Thrace to the Danube, beats the Bessi, and takes the Greek '
      + 'cities of the west Pontic coast one after another: Apollonia, Mesembria, '
      + 'Callatis, Tomis. From Apollonia he removes a colossal Apollo, thirteen metres '
      + 'of bronze, and puts it on the Capitol. What the two commands do together is '
      + 'close both shores of the two seas Italy has to cross to reach anywhere, so '
      + 'that from now on a Roman army going east goes by land, on a road, through '
      + 'provinces. That is the unglamorous machinery under everything else in this '
      + 'century, and the East feels it before it can name it.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -71, m: 5 },
    world: true,
    when: safeTrigger('ev_pv_the_two_shores:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Cosconius took Salona from the Delmatae in 78–76; M. Lucullus took the west-Pontic Greek cities in 72–71 and carried the Apollo of Apollonia to the Capitol.',
    options: [
      {
        label: 'Close both shores',
        tooltip: 'Salona passes to Rome off the Delmatae and Tomis off the Thracians, neither off anyone else. The Delmatae −15 legitimacy; the Odrysian crown −15 legitimacy and −1 stability. Rome +120 talents and +6 legitimacy, and the roads east are Roman roads the whole way.',
        effects: guard('ev_pv_the_two_shores:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, ['Salona'], 'ROM', 'DLM');
          transfer(ctx, ['Tomis'], 'ROM', 'THR');
          if (alive(ctx, 'DLM')) h.adjust(ctx, 'DLM', { legitimacy: -15 });
          if (alive(ctx, 'THR')) h.adjust(ctx, 'THR', { legitimacy: -15, stability: -1 });
          h.adjust(ctx, 'ROM', { treasury: 120, legitimacy: 6 });
          h.setFlag(ctx, 'twoShores', true);
          h.chronicle(ctx, 'era', 'Cosconius takes Salona and Lucullus takes the west-Pontic cities; both shores of the Roman seas are closed, and the road east is a road.');
        }),
      },
    ],
  },

  // ── P10 · -67 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_crete_and_cyrene',
    title: 'The Island That Would Not Give Up Its Pirates',
    worldLabel: 'Metellus takes Crete; Crete and Cyrene become one province',
    desc: 'Crete has been the pirates\' harbour for a generation and the Senate has '
      + 'asked politely twice. Quintus Caecilius Metellus is sent to stop asking, and '
      + 'the Cretans — who are very good at this — try to end the war by surrendering '
      + 'to somebody else: they send to Pompey, who has just been given the whole '
      + 'Mediterranean by law and is happy to accept an island he has not fought for, '
      + 'and who writes to Metellus telling him to leave. Metellus declines, on the '
      + 'grounds that he was there first, and Roman commanders come within an hour of '
      + 'fighting each other over which of them a defeated enemy belongs to — an early, '
      + 'small, exactly diagnostic scene from the machine that will produce Pharsalus. '
      + 'Metellus takes the towns one by one, earns the surname Creticus, and Crete is '
      + 'joined for administrative convenience to the Cyrenaica that Rome has owned on '
      + 'paper and ignored for twenty-two years, three hundred miles of open water '
      + 'away, into a single province with a governor who has to sail between his own '
      + 'halves. It lasts five hundred years like that.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -67, m: 5 },
    world: true,
    when: safeTrigger('ev_pv_crete_and_cyrene:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Metellus Creticus conquered Crete in 69–67 over Pompey\'s objection; Crete was joined to Cyrenaica as one province.',
    options: [
      {
        label: 'Take it before Pompey is given it',
        tooltip: 'Gortyn passes to Rome off the Greek cities only. Cyrenaica finally gets a governor: "A Province Nobody Was Sent To" is lifted from Cyrene and Marmarica. Rome +110 talents and +8 legitimacy; Hellas −10 legitimacy.',
        effects: guard('ev_pv_crete_and_cyrene:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, ['Gortyn'], 'ROM', 'GRC');
          for (const n of CYRENAICA) h.removeModifier(ctx, n, 'province_nobody_was_sent_to');
          if (alive(ctx, 'GRC')) h.adjust(ctx, 'GRC', { legitimacy: -10 });
          h.adjust(ctx, 'ROM', { treasury: 110, legitimacy: 8 });
          h.setFlag(ctx, 'creteTaken', true);
          h.chronicle(ctx, 'era', 'Metellus takes Crete while Pompey writes letters claiming it; the island is joined to Cyrene, and the province at last has a governor.');
        }),
      },
    ],
  },

  // ── P11 · -58 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_cyprus',
    title: 'The Most Honest Man in Rome Is Sent to Steal an Island',
    worldLabel: 'Cato annexes Cyprus; the Ptolemaic king takes poison',
    desc: 'Publius Clodius has passed a grain law giving free wheat to the citizens of '
      + 'Rome and now has to pay for it, and he remembers that the king of Cyprus — a '
      + 'Ptolemy, brother of the king of Egypt, guilty of nothing — once failed to '
      + 'ransom him from pirates. So he passes a second law annexing Cyprus, and then, '
      + 'with a refinement that his enemies conceded was genius, has the commission '
      + 'given to Marcus Porcius Cato: the one man in the Republic whose integrity '
      + 'nobody questions, sent five hundred miles away for two years on an errand that '
      + 'is theft, unable to refuse without admitting that a law of the Roman people '
      + 'may be refused. Cato offers the king the high priesthood at Paphos to retire '
      + 'into. The king takes poison instead. Cato inventories the palace, auctions it '
      + 'in public with a scrupulousness that antagonizes every buyer, and brings home '
      + 'seven thousand talents — the largest sum ever carried into the treasury by a '
      + 'private citizen — in a fleet fitted with cork floats and cables on the money '
      + 'chests so that if a ship went down the silver could be found again. His own '
      + 'account books are lost in a shipwreck, and he spends the rest of his life '
      + 'being unable to prove what he did with anything.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -58, m: 5 },
    world: true,
    major: true,
    when: safeTrigger('ev_pv_cyprus:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Clodius\' law annexed Cyprus in 58 and sent Cato to execute it; the king of Cyprus poisoned himself and Cato brought 7,000 talents to Rome.',
    options: [
      {
        label: 'A law of the Roman people may not be refused',
        tooltip: 'Salamis and Paphos pass to Rome off Egypt only. Rome +400 talents, +6 legitimacy and +1 stability. Egypt −15 legitimacy, −1 stability and "Cyprus Lost" (−10% income permanently). Every eastern court cools 15 toward Rome: this was done to a king who had done nothing, by statute, in peacetime.',
        effects: guard('ev_pv_cyprus:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          const took = transfer(ctx, CYPRUS, 'ROM', 'PTO');
          h.adjust(ctx, 'ROM', { treasury: 400, legitimacy: 6, stability: 1 });
          if (alive(ctx, 'PTO') && took) {
            h.adjust(ctx, 'PTO', { legitimacy: -15, stability: -1 });
            h.addTagModifier(ctx, 'PTO', {
              id: 'cyprus_lost', name: 'Cyprus Lost', months: -1,
              effects: { incomeMult: 0.9 },
            });
          }
          theEastReads(ctx, -15);
          h.setFlag(ctx, 'cyprusAnnexed', true);
          h.chronicle(ctx, 'era', 'Cyprus is annexed by statute to pay for a grain law; the king takes poison, and Cato brings seven thousand talents home in ships rigged with cork.');
        }),
      },
    ],
  },

  // ── P12 · -58 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_gallic_war',
    title: 'A Migration, and a Proconsul Who Needs One',
    worldLabel: 'Caesar stops the Helvetii and drives Ariovistus over the Rhine',
    desc: 'The Helvetii burn their own twelve towns and four hundred villages so that '
      + 'nobody can go back, and set out west with their families to find better land. '
      + 'It is a migration, not an invasion, and it is exactly what a proconsul with '
      + 'enormous debts, a five-year command and no war in it requires. Caesar refuses '
      + 'them the road, cuts them up at the Arar while half of them are still crossing, '
      + 'beats the rest at Bibracte, and sends the survivors home under orders to '
      + 'rebuild the towns they burned, because a hole in Gaul would be filled by '
      + 'Germans. Then he turns on the Germans who are already there: Ariovistus of the '
      + 'Suebi, whom the Sequani invited across the Rhine to help them against the '
      + 'Aedui and who has been settling his people on Sequanian land ever since, and '
      + 'who is — this is the joke of the year — a friend and ally of the Roman people '
      + 'by a decree Caesar himself carried as consul the winter before. He is broken '
      + 'in Alsace and driven back over the river. In one campaigning season the '
      + 'protector of Gaul has arrived, has proved that Gaul needs protecting, and has '
      + 'wintered his legions in it without asking anyone. The Gauls take some time to '
      + 'understand that this is the conquest.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -58, m: 9 },
    world: true,
    when: safeTrigger('ev_pv_gallic_war:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Caesar destroyed the Helvetian migration at Bibracte and defeated Ariovistus in Alsace in 58, then wintered his legions in Gaul.',
    options: [
      {
        label: 'Refuse them the road',
        tooltip: 'No ground changes hands yet. Lugdunum, Augustodunum, Vesontio and Argentorate carry "The Roman Column" (+2 unrest for 60 months) — the legions are wintering in a country that has not been conquered. The Aedui warm 30 toward Rome; the Sequani cool 40 and take −15 legitimacy; the Arverni cool 25. Rome +12 martial points.',
        effects: guard('ev_pv_gallic_war:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          stir(ctx, ['Lugdunum', 'Augustodunum', 'Vesontio', 'Argentorate'], {
            id: 'the_roman_column', name: 'The Roman Column', months: 60,
            effects: { unrest: 2 },
          });
          nudgeOpinion(ctx, 'AED', 'ROM', 30);
          nudgeOpinion(ctx, 'SEQ', 'ROM', -40);
          nudgeOpinion(ctx, 'AVN', 'ROM', -25);
          if (alive(ctx, 'SEQ')) h.adjust(ctx, 'SEQ', { legitimacy: -15 });
          h.adjust(ctx, 'ROM', { mar: 12 });
          h.setFlag(ctx, 'gallicWarOpens', true);
          h.chronicle(ctx, 'era', 'Caesar stops the Helvetii at Bibracte and drives Ariovistus over the Rhine, then winters his legions in Gaul without asking.');
        }),
      },
    ],
  },

  // ── P13 · -52 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_alesia',
    title: 'Two Walls, One Facing Each Direction',
    worldLabel: 'Vercingetorix surrenders at Alesia; Gaul is Roman',
    desc: 'In the eighth year Gaul finally produces the thing Caesar\'s books had been '
      + 'quietly insisting it could not: a general. Vercingetorix of the Arverni unites '
      + 'the peoples, burns the towns and the granaries ahead of the legions — his own '
      + 'included, a decision it takes a real state to make — and wins at Gergovia '
      + 'outright. Then he lets himself be penned in Alesia, counting on the relief '
      + 'army of all Gaul, and Caesar builds two walls: one facing in at the town, one '
      + 'facing out at the quarter of a million who came to break him, and holds both. '
      + 'When it is over Vercingetorix rides out alone, circles Caesar\'s tribunal '
      + 'once, and lays his arms at the man\'s feet without a word; he is kept six '
      + 'years for the triumph and then strangled in the Tullianum. The accounting the '
      + 'ancients themselves offered — a million dead, a million enslaved — is not an '
      + 'audit, but it is not a lie either. Gaul will be Latin for five hundred years. '
      + 'And the army that did it now belongs to one man, is owed farms by one man, and '
      + 'is six days\' march from Italy, which is the sentence the next chapter of this '
      + 'century is written out of.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -52, m: 9 },
    world: true,
    major: true,
    when: safeTrigger('ev_pv_alesia:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Vercingetorix surrendered at Alesia in 52 after the double wall held against the relief of all Gaul; he was kept for the triumph of 46 and then strangled.',
    options: [
      {
        label: 'Build both walls and hold both',
        tooltip: 'The Gallic interior passes to Rome by name — off the Arverni, Aedui, Sequani, Belgae, Armoricans and Aquitani only; living courts elsewhere keep their own. The Arverni take "The Pacification" (−20% income and manpower permanently) and −25 legitimacy. Rome +250 talents, +15 legitimacy, +20 martial points and "The Long-Haired Province" (+10% income permanently) — and one man now owns the army that did it.',
        effects: guard('ev_pv_alesia:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          const took = transfer(ctx, CAESARS_GAUL, 'ROM', ['AVN', 'AED', 'SEQ', 'BLG', 'ARO', 'AQT']);
          h.adjust(ctx, 'ROM', { treasury: 250, legitimacy: 15, mar: 20 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'the_long_haired_province', name: 'The Long-Haired Province', months: -1,
            effects: { incomeMult: 1.1 },
          });
          if (alive(ctx, 'AVN')) {
            h.adjust(ctx, 'AVN', { legitimacy: -25 });
            h.addTagModifier(ctx, 'AVN', {
              id: 'the_pacification', name: 'The Pacification', months: -1,
              effects: { incomeMult: 0.8, manpowerMult: 0.8 },
            });
          }
          h.setFlag(ctx, 'alesia', true);
          h.chronicle(ctx, 'era', 'Vercingetorix lays his arms at Caesar\'s feet at Alesia; Gaul (' + took + ' provinces) is Roman, and the army that did it belongs to one man.');
        }),
      },
    ],
  },

  // ── P14 · -49 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_massilia',
    title: 'The Oldest Ally Picks a Side',
    worldLabel: 'Caesar takes Massilia; the free Greek city of the west ends',
    desc: 'Massalia is six hundred years old, Greek, a republic of fifteen elected '
      + 'timouchoi, and has been Rome\'s ally since before Rome had a fleet — it warned '
      + 'the Senate about Hannibal, it lent ships against Carthage, it asked Rome into '
      + 'southern Gaul in the first place, and its charter of friendship is the oldest '
      + 'document of its kind in the archive. When the civil war comes it does the '
      + 'thing an ancient neutral does: it announces that it owes both men equally, '
      + 'that it will admit neither, and that it will decide nothing. Then it admits '
      + 'Domitius Ahenobarbus with seven ships, which is deciding something. Caesar '
      + 'leaves three legions and Decimus Brutus\'s scratch-built fleet to reduce it '
      + 'and goes to Spain. The Massaliots fight two naval battles they should have '
      + 'won, being the better sailors, and lose both; the siege works go up; the city '
      + 'surrenders on the day Caesar comes back from Spain, which he permits himself '
      + 'to find fitting. He spares it — for the sake of its name and its antiquity, he '
      + 'says — and takes its fleet, its treasury, its territory and its arsenals, and '
      + 'leaves it its walls, its laws and its Greek. It keeps them for four hundred '
      + 'years and never matters again.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -49, m: 10 },
    world: true,
    when: safeTrigger('ev_pv_massilia:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Massilia declared for neither side, admitted Domitius, and surrendered to Caesar\'s legates in the autumn of 49; it kept its walls and lost everything else.',
    options: [
      {
        label: 'Spare the name and take everything else',
        tooltip: 'Massilia and its colony at Emporiae pass to Rome off Massalia only. Rome +180 talents and +6 legitimacy; Massilia carries "The City That Kept Its Name" (−25% tax for 120 months) while the fleet and the territory are gone. Every court that holds an old Roman treaty of friendship cools 12: this was the oldest one there was.',
        effects: guard('ev_pv_massilia:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, ['Massilia', 'Emporiae'], 'ROM', 'MAS');
          mark(ctx, ['Massilia'], {
            id: 'city_that_kept_its_name', name: 'The City That Kept Its Name', months: 120,
            effects: { taxMult: 0.75 },
          });
          h.adjust(ctx, 'ROM', { treasury: 180, legitimacy: 6 });
          theEastReads(ctx, -12);
          const me = crown(ctx);
          if (me && flag(ctx, 'romanTreaty')) h.adjust(ctx, me, { legitimacy: -3 });
          h.setFlag(ctx, 'massiliaTaken', true);
          h.chronicle(ctx, 'era', 'Massilia is spared for its antiquity and stripped of everything else; the oldest treaty of friendship Rome had is worth its walls.');
        }),
      },
    ],
  },

  // ── P15 · -47 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_alexandrian_war',
    title: 'The Road at Pelusium',
    desc: 'Caesar has chased Pompey to Egypt, been handed his head by a court that '
      + 'thought that was what he wanted, and is now shut up in the palace quarter of '
      + 'Alexandria with two understrength legions, a queen he has decided to back, and '
      + 'an entire city fighting him. He burns the ships in the harbour to keep them '
      + 'from being used against him and the fire takes the warehouses on the docks '
      + 'with them. He cannot get out and nobody can get in — except by land, from '
      + 'Syria, through Pelusium, which is a fortress, and past the Jewish military '
      + 'district of Onias in the Delta, whose men have held the eastern approaches for '
      + 'the Ptolemies for a hundred and twenty years and are answerable to no Greek. '
      + 'Mithridates of Pergamon is coming that way with a relief column. Antipater the '
      + 'Idumaean is riding with him with three thousand Jewish troops, and a letter '
      + 'from the High Priest at Jerusalem addressed to the commanders of the district '
      + 'and to the Jews about Memphis, telling them whose side to be on. The envoy who '
      + 'arrives at your court has the same letter half-written and a straightforward '
      + 'question: does Jerusalem want the credit for opening this road, and the debt '
      + 'that a Roman dictator will owe for it?',
    forTag: 'both',
    decider: (ctx) => crown(ctx) || 'ROM',
    date: { y: -47, m: 2 },
    world: true,
    major: true,
    when: safeTrigger('ev_pv_alexandrian_war:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'PTO')),
    aiOption: 0,
    historical: 'Antipater brought 3,000 Jewish troops to Mithridates of Pergamon and Hyrcanus\' letter opened the Onias district and Pelusium; Caesar rewarded Judaea with privileges that outlasted the Republic.',
    options: [
      {
        label: 'Write the letter and send the men',
        tooltip: 'Judaea spends 4,000 manpower and 60 talents on a war in the Delta, and buys the one thing Rome does not sell: Rome\'s opinion to +70, +12 legitimacy, and "What Was Done at Pelusium" (+8% income and +0.1 legitimacy a month, permanently) — the privileges a grateful dictator grants outlive the dictator. Egypt notices who opened its own eastern door: −25 opinion.',
        effects: guard('ev_pv_alexandrian_war:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { manpower: -4000, treasury: -60, legitimacy: 12 });
          h.addTagModifier(ctx, me, {
            id: 'what_was_done_at_pelusium', name: 'What Was Done at Pelusium', months: -1,
            effects: { incomeMult: 1.08, legitimacyAdd: 0.1 },
          });
          setOpinion(ctx, 'ROM', me, 70);
          nudgeOpinion(ctx, 'PTO', me, -25);
          h.setFlag(ctx, 'pelusiumOpened', true);
          h.chronicle(ctx, 'diplomacy', 'The letter goes out to the district of Onias and the road at Pelusium opens; a Roman dictator gets out of Alexandria owing Jerusalem a favour.');
        }),
      },
      {
        label: 'Two Roman armies are fighting; let them',
        tooltip: 'Judaea spends nothing and promises nothing. No manpower, no talents, no debt owed to a man who may be dead by winter — and none owed TO him: Rome\'s opinion falls 20, and the privileges granted in the other history are granted to somebody else. +5 stability at home, where the council has been arguing about this for a month.',
        effects: guard('ev_pv_alexandrian_war:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { stability: 1 });
          nudgeOpinion(ctx, 'ROM', me, -20);
          h.setFlag(ctx, 'pelusiumRefused', true);
          h.chronicle(ctx, 'diplomacy', 'Jerusalem sends nobody to the Delta; the road at Pelusium is opened by other men, and the favour is owed to them.');
        }),
      },
    ],
  },

  // ── P16 · -46 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_africa_nova',
    title: 'Cato Reads the Phaedo Twice',
    worldLabel: 'Thapsus: Numidia is annexed as the province of Africa Nova',
    desc: 'The last army of the Republic is in Africa, and it has a king with it: Juba '
      + 'of Numidia, who has personally bankrolled the senatorial cause and been '
      + 'promised, in writing, whatever he asks for afterwards. At Thapsus the elephants '
      + 'break backwards through their own line before the infantry is properly engaged '
      + 'and it is over in an afternoon; Caesar\'s veterans kill the surrendering, which '
      + 'they have not done before and which their commander does not stop. Juba and '
      + 'Petreius, with nowhere to go, dine well and then fight a duel so that neither '
      + 'has to be the one who was captured. And at Utica, Marcus Cato — who has spent '
      + 'the campaign being the conscience of an army that had already lost — arranges '
      + 'the evacuation of every civilian who wants to leave, has dinner, discusses '
      + 'whether the good man is free, reads Plato\'s Phaedo through twice, and stabs '
      + 'himself; when the surgeons sew him up he waits until they are gone and pulls '
      + 'the stitches out with his own hands. Caesar says he grudges him his death. '
      + 'Numidia becomes the province of Africa Nova, with the historian Sallust as its '
      + 'first governor, who plunders it so thoroughly that he retires to build the most '
      + 'beautiful gardens in Rome and write about moral decline. Cirta goes to a '
      + 'condottiere from Campania who brought his own army. The western marches go to '
      + 'Bocchus and Bogud of Mauretania, who backed the winner, and who will do it '
      + 'again.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -46, m: 4 },
    world: true,
    major: true,
    when: safeTrigger('ev_pv_africa_nova:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'NUM')),
    aiOption: 0,
    historical: 'Juba I died after Thapsus in 46 and Cato killed himself at Utica; Numidia became Africa Nova, and Bocchus and Bogud were rewarded with the Masaesyli lands.',
    options: [
      {
        label: 'Africa Nova, and the historian who governs it',
        tooltip: 'The Masaesyli marches — Saldae, Icosium, Caesarea and Portus Magnus — pass to Mauretania, which backed the winner; everything else Numidia holds passes to Rome, and Numidia ceases to be a court. Rome +300 talents, +10 legitimacy. Mauretania +80 talents and Rome\'s friendship at +70.',
        effects: guard('ev_pv_africa_nova:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM') || !alive(ctx, 'NUM')) return;
          if (alive(ctx, 'MAU')) {
            transfer(ctx, MASAESYLI, 'MAU', 'NUM');
            h.adjust(ctx, 'MAU', { treasury: 80, legitimacy: 5 });
            setOpinion(ctx, 'MAU', 'ROM', 70);
          }
          h.dissolveTag(ctx, 'NUM', 'ROM');
          h.adjust(ctx, 'ROM', { treasury: 300, legitimacy: 10 });
          h.setFlag(ctx, 'africaNova', true);
          h.chronicle(ctx, 'era', 'Juba dies after Thapsus and Cato at Utica; Numidia becomes the province of Africa Nova, and Mauretania is paid for choosing correctly.');
        }),
      },
    ],
  },

  // ── P17 · -42 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_rhodes',
    title: 'No Room for Two Swords in One Scabbard',
    worldLabel: 'Cassius storms Rhodes and strips it for the war chest',
    desc: 'The liberators need money, and the East is where money is. Cassius has '
      + 'already levied ten years of tribute in advance from the province of Asia and '
      + 'destroyed Tarsus so completely that the city sold its own citizens to pay him, '
      + 'and now he comes to Rhodes — the one Greek state that is still genuinely free, '
      + 'still has a fleet, and taught him rhetoric when he was a student there. The '
      + 'Rhodians send their oldest men out to remind him of that, and of their treaty. '
      + 'He tells them he learned to obey at Rhodes and did not learn to be a slave '
      + 'there, and that there is no room for two swords in one scabbard. Their fleet '
      + 'is the better fleet and it loses anyway to weight of numbers; the city opens '
      + 'its gates; about fifty of the leading men are executed and the rest are fined '
      + 'to the last coin, and everything gold or silver in every temple is taken '
      + 'except the chariot of the Sun, which he leaves — nobody has ever satisfactorily '
      + 'explained why. Six months later he is dead at Philippi. The money bought two '
      + 'battles and one afternoon.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -42, m: 3 },
    world: true,
    when: safeTrigger('ev_pv_rhodes:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Cassius stormed Rhodes in 43–42 and stripped it of everything but the chariot of the Sun; he died at Philippi within the year.',
    options: [
      {
        label: 'There is no room for two swords',
        tooltip: 'Rhodes passes to Rome off the Greek cities only, and carries "Everything But the Chariot of the Sun" (−40% tax for 120 months). Rome +260 talents. Hellas −15 legitimacy; every eastern court cools 12, having watched a treaty and a free city count for nothing against a war chest.',
        effects: guard('ev_pv_rhodes:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          transfer(ctx, ['Rhodes'], 'ROM', 'GRC');
          mark(ctx, ['Rhodes'], {
            id: 'all_but_the_chariot', name: 'Everything But the Chariot of the Sun', months: 120,
            effects: { taxMult: 0.6 },
          });
          if (alive(ctx, 'GRC')) h.adjust(ctx, 'GRC', { legitimacy: -15 });
          h.adjust(ctx, 'ROM', { treasury: 260 });
          theEastReads(ctx, -12);
          h.setFlag(ctx, 'rhodesStripped', true);
          h.chronicle(ctx, 'era', 'Cassius strips Rhodes of everything but the chariot of the Sun and is dead within six months; the money buys two battles.');
        }),
      },
    ],
  },

  // ── P18 · -30 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_egypt_annexed',
    title: 'The Last of Alexander\'s Generals',
    worldLabel: 'Alexandria falls; Egypt becomes one man\'s private estate',
    desc: 'It ends in Alexandria, where it was always going to end. The fleet rows out '
      + 'to meet Octavian\'s and salutes it and joins it; the cavalry goes over; Antony '
      + 'falls on his sword badly and is hauled up on ropes to the roof of a monument '
      + 'to die; the queen negotiates for three days for her children and, having '
      + 'established that she is to be walked through Rome behind a chariot, does not. '
      + 'The asp is Plutarch\'s guess and he says so; the two marks on the arm are the '
      + 'only evidence, and there are physicians in Alexandria who could have done it '
      + 'better. Caesarion, seventeen, is caught running for the Red Sea and killed on '
      + 'advice that is quoted for the rest of antiquity: too many Caesars is not a '
      + 'good thing. And then Octavian does the thing that matters more than any of it. '
      + 'Egypt is not made a province of the Roman people. It is made HIS: governed by a '
      + 'prefect of equestrian rank who answers to him personally, garrisoned by his '
      + 'legions, and closed to every Roman senator, who may not so much as set foot in '
      + 'it without written permission — because the man who holds Egypt holds the '
      + 'grain, and the man who holds the grain holds Rome, and the new master of the '
      + 'world has just worked out precisely how he was able to do this and intends '
      + 'that nobody else shall. The house of Ptolemy is finished. It was the last of '
      + 'them — the last kingdom of Alexander\'s generals, the last Macedonian throne, '
      + 'the last court that remembered the world this chapter opened in, when a Roman '
      + 'with a walking stick drew a circle in the sand around a Seleucid king and told '
      + 'him to answer before he stepped out of it. That was a hundred and thirty-eight '
      + 'years ago. There is nobody left to draw a circle around.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -30, m: 8 },
    world: true,
    major: true,
    when: safeTrigger('ev_pv_egypt_annexed:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'PTO')),
    aiOption: 0,
    historical: 'Alexandria fell on 1 August 30; Cleopatra VII and Caesarion died, and Egypt was annexed as the personal possession of Octavian, closed to senators.',
    options: [
      {
        label: 'Not a province of the Roman people',
        tooltip: 'Egypt ceases to be a court: everything the Ptolemies still hold passes to Rome. Rome +900 talents of Ptolemaic treasure — enough, the sources say, to drop the rate of interest in Italy from twelve per cent to four — +20 legitimacy, +1 stability and "The Grain of Egypt" (+15% income permanently). Every surviving eastern court reads the end of the last Successor kingdom and cools 15.',
        effects: guard('ev_pv_egypt_annexed:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM') || !alive(ctx, 'PTO')) return;
          // §257 declares this war in 32 and decides it at Actium in 31; the
          // annexation is its peace, and dissolveTag would drop the war anyway.
          h.endWar(ctx, 'ROM', 'PTO', 'att');
          h.dissolveTag(ctx, 'PTO', 'ROM');
          h.adjust(ctx, 'ROM', { treasury: 900, legitimacy: 20, stability: 1 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'the_grain_of_egypt', name: 'The Grain of Egypt', months: -1,
            effects: { incomeMult: 1.15 },
          });
          theEastReads(ctx, -15);
          const me = crown(ctx);
          if (me) {
            h.chronicle(ctx, 'diplomacy',
              'The last of the Successor kingdoms is a Roman estate, and the oldest court this kingdom ever wrote to is gone; '
              + 'of the world of 167 there is Parthia, there is Rome, and there is us.');
          }
          h.setFlag(ctx, 'egyptAnnexed', true);
          h.chronicle(ctx, 'era', 'Alexandria falls and the house of Ptolemy ends; Egypt is annexed as one man\'s private estate, closed to the Senate that thinks it won.');
        }),
      },
    ],
  },

  // ── P19 · -27 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_pv_achaea_provincia',
    title: 'The Division of the Provinces',
    worldLabel: 'Augustus divides the provinces; Hellas ceases to be a court',
    desc: 'In January the master of the Roman world stands up in the Senate and gives '
      + 'everything back — the provinces, the armies, the whole res publica — and the '
      + 'Senate, which has been prepared for this, begs him to keep enough of it to '
      + 'ensure the peace. What he keeps is every province with a legion in it. What he '
      + 'returns is every province without one, and Greece is one of those: Achaea and '
      + 'Macedonia go to the Senate, with proconsuls and no soldiers, because there has '
      + 'been nothing there worth garrisoning since Mummius. Corinth has already been '
      + 'refounded as a Roman colony of freedmen on the ground Mummius cleared, and is '
      + 'rich again inside a generation. Athens keeps its name, its schools and a '
      + 'tourist trade in its own past. Sparta keeps its peculiar constitution because '
      + 'the princeps finds it charming. Galatia is annexed on the death of its last '
      + 'king two years later, and the Anatolian interior goes the same way. And that '
      + 'is the end of the leagues and cities of Hellas as anything a chancery has to '
      + 'write to: everything from the Isthmus to the Bosporus is now somebody\'s '
      + 'province, administered, assessed and quiet.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -27, m: 1 },
    world: true,
    major: true,
    when: safeTrigger('ev_pv_achaea_provincia:when', (ctx) => alive(ctx, 'ROM') && alive(ctx, 'GRC')),
    aiOption: 0,
    historical: 'The settlement of January 27 divided the provinces between princeps and Senate; Achaea and Macedonia became senatorial provinces, and Galatia was annexed in 25.',
    options: [
      {
        label: 'Senatorial provinces, and no legions in them',
        tooltip: 'The leagues and cities of Hellas cease to be a court: everything they still hold — Sparta, Byzantion, Nicaea, Ancyra and whatever else survived the century — passes to Rome. Rome +150 talents and +10 legitimacy. Corinth is refounded: "The Colony on the Isthmus" (+20% tax permanently) replaces the ruin.',
        effects: guard('ev_pv_achaea_provincia:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM') || !alive(ctx, 'GRC')) return;
          h.dissolveTag(ctx, 'GRC', 'ROM');
          h.removeModifier(ctx, 'Corinth', 'the_sack_of_corinth');
          mark(ctx, ['Corinth'], {
            id: 'colony_on_the_isthmus', name: 'The Colony on the Isthmus', months: -1,
            effects: { taxMult: 1.2 },
          });
          h.adjust(ctx, 'ROM', { treasury: 150, legitimacy: 10 });
          h.setFlag(ctx, 'provincesDivided', true);
          h.chronicle(ctx, 'era', 'Augustus gives the Republic back and keeps every province with a legion in it; Hellas becomes two senatorial provinces and stops being a court.');
        }),
      },
    ],
  },

];
