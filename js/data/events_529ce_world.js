// Judaea Universalis — the world of the Keepers, 530–610 CE (SPEC §104's
// rule applied to the 529 chapter). Content package. Zero imports; all
// effects run through ctx.helpers at runtime. Concatenated onto EVENTS_529
// by the era registry.
//
// The 529 chapter had six dated world cards in eighty-five years, and not
// one scripted succession anywhere on the map: Justinian never died,
// Khosrow was never crowned, the Vandal and Ostrogothic courts sat
// unmurdered while the §163 simulation aged them at random. This file is
// the age's own calendar — the successions, murders, plagues and edicts
// that arrived on their own schedule whatever the Keepers did on Gerizim.
//
// A deliberate restraint, per §173: the reconquest is NOT scripted. The
// political map seats Gelimer's predecessor and Amalasuintha's son
// precisely so that Justinian's wars can happen in the simulation, and
// this file only supplies the palace history that armed them — the
// usurpation at Carthage and the strangling at Bolsena are the two
// campaigns' causes of action, not their outcomes. The one battle card
// (Taginae) presupposes a Gothic war and carries a `when` gate; in a world
// where that war never came, it retires into the divergence ledger
// (SPEC §75, §89).
//
// Source spine: Procopius, Wars and Buildings, with the Secret History
// read as the sound of a man grinding his teeth; Gregory of Tours for the
// Franks; John of Ephesus and Procopius II.22 for the plague; Agathias for
// the Kutrigurs; Menander Protector for the diplomacy; Theophylact
// Simocatta and Theophanes for Maurice, Phocas and the restoration of
// Khosrow II; Gregory the Great's Registrum, XIII.13, for Sicut Judaeis.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_529ce_world] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135); see events_167bce_world.js.
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

function stir(ctx, names, mod) {
  for (const n of names) ctx.helpers.addProvinceModifier(ctx, n, mod);
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, a)];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[who(ctx, b)] = Math.max(-200, Math.min(200, val));
}

function warBetween(ctx, a, b) {
  const x = who(ctx, a);
  const y = who(ctx, b);
  for (const w of (ctx.game && ctx.game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(x) !== -1 && all.indexOf(y) !== -1) return true;
  }
  return false;
}

export const EVENTS_529_WORLD = [

  // ── K1 · 530 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_gelimer',
    title: 'The Usurper Gives the Emperor His War',
    worldLabel: 'Gelimer deposes Hilderic in Carthage',
    desc: 'Hilderic of the Vandals is old, Catholic-leaning, a grandson of the '
      + 'emperor Valentinian on his mother\'s side, and a personal correspondent '
      + 'of Justinian — which is to say, everything his own nobility despises. '
      + 'His cousin Gelimer deposes him and puts him in a cistern. Justinian '
      + 'writes demanding the old king\'s restoration; Gelimer replies that '
      + 'nothing is more desirable than for a monarch to mind his own kingdom. '
      + 'It is the correct answer of a sovereign and the fatal answer of this '
      + 'decade: the letter converts the usurpation from Vandal family business '
      + 'into a Roman cause of action, filed where causes of action are '
      + 'currently being collected. The next reply from Constantinople, whenever '
      + 'it comes, will have a fleet under it.',
    forTag: 'both',
    decider: 'VAN',
    date: { y: 530, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Gelimer deposed and imprisoned Hilderic in 530 and told Justinian to mind his own kingdom; the letter became the casus belli of 533.',
    options: [
      {
        label: 'Kings mind their own kingdoms',
        tooltip: 'Gelimer takes the Vandal throne: −15 legitimacy, and Byzantium\'s opinion of Carthage falls to −120. The cause of action is filed; whether the fleet follows is the age\'s own business.',
        effects: guard('ev529_w_gelimer:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'VAN')) {
            h.setRuler(ctx, 'VAN', { name: 'Gelimer', title: 'King of the Vandals and Alans', gov: 2, infl: 2, mar: 4, age: 50 });
            h.adjust(ctx, 'VAN', { legitimacy: -15 });
          }
          if (alive(ctx, 'BYZ')) setOpinion(ctx, 'BYZ', 'VAN', -120);
          h.setFlag(ctx, 'gelimerUsurps', true);
          h.chronicle(ctx, 'era', 'Gelimer deposes Hilderic and tells the emperor to mind his own kingdom; the reply, whenever it comes, will have a fleet under it.');
        }),
      },
    ],
  },

  // ── K2 · 531 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_amalaric',
    title: 'The Bloodied Kerchief',
    worldLabel: 'Amalaric of the Visigoths falls; Theudis takes the crown',
    desc: 'Amalaric, last male of the Balt dynasty, married a Frankish princess '
      + 'and has been beating her for refusing Arian baptism; Clotilde sends her '
      + 'brothers a kerchief stained with her own blood, which among the sons of '
      + 'Clovis is a complete set of legal papers. Childebert\'s army takes '
      + 'Narbonne, Amalaric is cut down at Barcelona by his own men in the '
      + 'rout, and the crown passes — by the sword\'s own logic — to Theudis, '
      + 'the Ostrogothic general Theoderic once sent to mind the kingdom, who '
      + 'has spent the interval marrying a Spanish fortune and raising a '
      + 'private army from her estates. A foreign soldier holding a crown '
      + 'between dynasties: Spain will run on this pattern for a while. The '
      + 'lesson the peninsula\'s subjects file is narrower — the kings now '
      + 'answer to whoever can raise two thousand men from their own land, '
      + 'and the law runs behind the levy.',
    forTag: 'both',
    decider: 'FRK',
    date: { y: 531, m: 6 },
    world: true,
    aiOption: 0,
    historical: 'Childebert answered his sister\'s bloodied kerchief in 531; Amalaric was killed at Barcelona and the Ostrogoth Theudis took the Visigothic crown.',
    options: [
      {
        label: 'A complete set of legal papers',
        tooltip: 'The Visigoths seat Theudis (−10 legitimacy — a soldier between dynasties); the Franks +100 talents of Narbonne\'s plunder. Barcino and Narbo carry "The Brothers\' Reprisal" (+2 unrest for 24 months).',
        effects: guard('ev529_w_amalaric:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'VIS')) {
            h.setRuler(ctx, 'VIS', { name: 'Theudis', title: 'King of the Visigoths', gov: 3, infl: 2, mar: 4, age: 45 });
            h.adjust(ctx, 'VIS', { legitimacy: -10 });
          }
          if (alive(ctx, 'FRK')) h.adjust(ctx, 'FRK', { treasury: 100 });
          stir(ctx, ['Barcino', 'Narbo'], {
            id: 'brothers_reprisal', name: 'The Brothers\' Reprisal', months: 24,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'amalaricFalls', true);
          h.chronicle(ctx, 'era', 'Clotilde\'s bloodied kerchief brings the Franks over the mountains; Amalaric falls at Barcelona and a foreign soldier holds the Visigothic crown.');
        }),
      },
    ],
  },

  // ── K3 · 531 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_khosrow',
    title: 'The Immortal Soul Takes the Throne',
    worldLabel: 'Kavad dies; Khosrow Anushirvan is King of Kings',
    desc: 'Kavad dies at eighty-two having reigned, with one interruption by '
      + 'deposition, for forty-three years, and the crown passes — past two '
      + 'older brothers, by the old king\'s written testament — to Khosrow, '
      + 'who will be called Anushirvan, the Immortal Soul, and will earn it. '
      + 'The new king\'s first years are a purge and a ledger: the Mazdakite '
      + 'levellers his father flirted with are exterminated along with the '
      + 'brothers who led them, and then the empire is rebuilt from the tax '
      + 'roll up — a fixed land assessment surveyed field by field, four army '
      + 'commands with salaried generals, the great families converted from '
      + 'rivals into employees. With Rome he signs the Eternal Peace: gold '
      + 'now, in exchange for quiet on the frontier. Every court between the '
      + 'two empires does the same arithmetic on the news — a Persia that has '
      + 'stopped being feudal is worth more as a patron and costs more as an '
      + 'enemy, and the Eternal Peace, like all peaces so named, is a lease.',
    forTag: 'both',
    decider: 'SAS',
    date: { y: 531, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Khosrow I succeeded Kavad in September 531 by testament over his older brothers; the Eternal Peace of 532 followed, and the tax and army reforms remade the Sasanian state.',
    options: [
      {
        label: 'The empire is rebuilt from the tax roll up',
        tooltip: 'Persia seats Khosrow I: +10 legitimacy, +1 stability, and "The King\'s Survey" (+10% income permanently). Byzantium pays 110 talents for the Eternal Peace, and Persia banks it. Every peace so named is a lease.',
        effects: guard('ev529_w_khosrow:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SAS')) {
            h.setRuler(ctx, 'SAS', { name: 'Khosrow I Anushirvan', title: 'King of Kings', gov: 5, infl: 4, mar: 4, age: 30 });
            h.adjust(ctx, 'SAS', { legitimacy: 10, stability: 1, treasury: 110 });
            h.addTagModifier(ctx, 'SAS', {
              id: 'the_kings_survey', name: 'The King\'s Survey', months: -1,
              effects: { incomeMult: 1.1 },
            });
          }
          if (alive(ctx, 'BYZ')) h.adjust(ctx, 'BYZ', { treasury: -110 });
          h.setFlag(ctx, 'khosrowCrowned', true);
          h.chronicle(ctx, 'era', 'Khosrow Anushirvan takes the Persian throne past two older brothers and rebuilds the empire from the tax roll up; the Eternal Peace is signed, which is a lease.');
        }),
      },
    ],
  },

  // ── K4 · 532 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_nika',
    title: 'The City Tries to Fire the Emperor',
    worldLabel: 'The Nika riots burn half of Constantinople',
    desc: 'It begins as hippodrome business — two faction ringleaders cut down '
      + 'from a botched hanging, the Blues and Greens demanding pardons — and '
      + 'in five days it is a revolution: the factions merge under the chant '
      + 'Nika, conquer, burn the praetorium, the baths, the church of Holy '
      + 'Wisdom itself, and crown a reluctant senator in the forum. Justinian, '
      + 'with the ships loaded for flight, puts the question to his council, '
      + 'and it is Theodora who answers it, in the sentence Procopius could '
      + 'not resist recording: those who have worn the crown should never '
      + 'survive its loss — the purple makes a fine burial shroud. The emperor '
      + 'stays. Belisarius and Mundus enter the hippodrome by opposite gates '
      + 'while the crowd is acclaiming its new emperor, and perhaps thirty '
      + 'thousand people do not leave it. The rival is executed apologizing. '
      + 'Then the rebuilding starts, immediately, at scale — the dome that '
      + 'rises on the burned church will be the largest interior space in the '
      + 'world for nine hundred years, which is what an apology looks like '
      + 'when an emperor makes one.',
    forTag: 'both',
    decider: 'BYZ',
    date: { y: 532, m: 1 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The Nika riots burned central Constantinople in January 532; Theodora refused flight, the hippodrome was cleared with perhaps thirty thousand dead, and Hagia Sophia rose on the ashes.',
    options: [
      {
        label: 'The purple is a fine burial shroud',
        tooltip: 'Byzantium −200 talents for the rebuilding and +1 stability — the throne holds because the empress would not run. Constantinople carries "The Hippodrome Remembers" (−1 unrest for 120 months): the factions have seen what the answer costs.',
        effects: guard('ev529_w_nika:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'BYZ')) h.adjust(ctx, 'BYZ', { treasury: -200, stability: 1 });
          stir(ctx, ['Byzantion'], {
            id: 'hippodrome_remembers', name: 'The Hippodrome Remembers', months: 120,
            effects: { unrest: -1 },
          });
          h.setFlag(ctx, 'nikaRiots', true);
          h.chronicle(ctx, 'era', 'The factions burn half of Constantinople and crown a senator; Theodora declines the ships, the hippodrome is cleared, and the dome is the apology.');
        }),
      },
    ],
  },

  // ── K5 · 534 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_athalaric',
    title: 'The Boy King Drinks Himself Out of the Story',
    worldLabel: 'Athalaric dies at eighteen; Amalasuintha rules alone',
    desc: 'Theoderic\'s grandson dies at eighteen of drink and dissipation — the '
      + 'Gothic nobles who took him from his mother\'s Roman schooling to make '
      + 'a warrior of him having made this instead. Amalasuintha, who has '
      + 'governed as regent with her father\'s ministers and her father\'s '
      + 'policy, now needs a male name beside hers on the coins, and chooses '
      + 'her cousin Theodahad: a Platonist landowner whose life\'s work has '
      + 'been buying out — or simply taking — every estate in Tuscany, twice '
      + 'restrained by Theoderic himself. She makes him co-regent on his oath '
      + 'to reign but not rule. A scholar who cannot be trusted with a '
      + 'neighbour\'s field, sworn to be trusted with a kingdom: the '
      + 'arrangement has the lifespan everyone but the queen can see, and '
      + 'the courts of Constantinople — where Amalasuintha has already, '
      + 'quietly, asked about asylum — are watching the Gothic succession '
      + 'the way brokers watch a failing house.',
    forTag: 'both',
    decider: 'OST',
    date: { y: 534, m: 10 },
    world: true,
    aiOption: 0,
    historical: 'Athalaric died on 2 October 534; Amalasuintha raised Theodahad to co-rule on his oath to reign but not rule.',
    options: [
      {
        label: 'A male name beside hers on the coins',
        tooltip: 'The Ostrogoths seat Amalasuintha with Theodahad named beside her: −10 legitimacy — the succession is now an arrangement, and everyone but the queen can see its lifespan.',
        effects: guard('ev529_w_athalaric:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'OST')) {
            h.setRuler(ctx, 'OST', { name: 'Amalasuintha', title: 'Queen of the Goths and Romans', gov: 4, infl: 4, mar: 1, age: 39 });
            h.setHeir(ctx, 'OST', { name: 'Theodahad', gov: 3, infl: 2, mar: 1, age: 54 });
            h.adjust(ctx, 'OST', { legitimacy: -10 });
          }
          h.setFlag(ctx, 'athalaricDies', true);
          h.chronicle(ctx, 'era', 'Athalaric dies at eighteen of the education his nobles chose; Amalasuintha rules with a Platonist land-thief sworn to reign but not rule.');
        }),
      },
    ],
  },

  // ── K6 · 535 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_amalasuintha',
    title: 'The Queen in the Lake',
    worldLabel: 'Amalasuintha is murdered at Bolsena; the emperor has his case',
    desc: 'Theodahad\'s oath lasts the winter. The queen is seized, shipped to an '
      + 'island in Lake Bolsena, and strangled in her bath — by the relatives, '
      + 'it is said, of the three Gothic nobles she had executed in her '
      + 'regency, whom Theodahad obligingly unbanished for the purpose. The '
      + 'chronology is the damning part: Justinian\'s ambassador Peter is on '
      + 'the road with assurances of imperial protection for her when the news '
      + 'meets him, and Procopius — in the history everyone reads — has Peter '
      + 'declare to Theodahad\'s face that the murder means war without truce; '
      + 'in the history found in the drawer afterwards, the empress Theodora '
      + 'had her own correspondence with the affair, the queen being young, '
      + 'royal and en route to her husband\'s court. Either way the '
      + 'instrument is signed: a royal guest of the emperor, murdered under '
      + 'his promised protection, by a usurper holding Italy. Carthage fell '
      + 'to a cause of action exactly like this one, eighteen months ago, '
      + 'and every chancery from Ravenna to Ctesiphon can read a docket.',
    forTag: 'both',
    decider: 'OST',
    date: { y: 535, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Amalasuintha was strangled in her bath on an island in Lake Bolsena in spring 535; Peter the ambassador declared it meant war, and the Gothic War followed within the year.',
    options: [
      {
        label: 'War without truce',
        tooltip: 'Theodahad takes the throne alone: −15 legitimacy, −1 stability, and Byzantium\'s opinion of Ravenna falls to −120. The second cause of action of the decade is filed, and the chanceries can read a docket.',
        effects: guard('ev529_w_amalasuintha:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'OST')) {
            h.setRuler(ctx, 'OST', { name: 'Theodahad', title: 'King of the Goths and Romans', gov: 3, infl: 2, mar: 1, age: 55 });
            h.adjust(ctx, 'OST', { legitimacy: -15, stability: -1 });
          }
          if (alive(ctx, 'BYZ')) setOpinion(ctx, 'BYZ', 'OST', -120);
          h.setFlag(ctx, 'amalasuinthaMurdered', true);
          h.chronicle(ctx, 'era', 'The queen of the Goths is strangled in her bath under the emperor\'s promised protection; the second cause of action of the decade is filed.');
        }),
      },
    ],
  },

  // ── K7 · 541 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_plague',
    title: 'The Sickness Comes Up From the Harbors',
    worldLabel: 'The great plague reaches the Mediterranean',
    desc: 'It is first noticed at Pelusium, at the mouth of Egypt, and then it is '
      + 'everywhere the grain sails: Alexandria, the Syrian ports, and by '
      + 'spring Constantinople, where Procopius — doing for it what Thucydides '
      + 'did for Athens, and saying so — records the tokens in the groin and '
      + 'armpit, the healthy dead by evening, the tally kept at the harbor '
      + 'passing five thousand a day and then passing counting. The emperor '
      + 'himself takes it and lives, which is more than the tax rolls do: '
      + 'whole districts stop existing as fiscal facts, the army\'s recruiting '
      + 'grounds empty, and Justinian\'s response — decreeing that the '
      + 'assessments of the dead be paid by their surviving neighbours — is '
      + 'remembered by the provinces longer than the mercy of God. It will '
      + 'come back in waves for two centuries. The villages of the hill '
      + 'country, off the grain routes, bury fewer than the ports do — the '
      + 'sickness travels with the ships, and the inland peoples\' oldest '
      + 'disadvantage is, for one generation, a wall.',
    forTag: 'both',
    date: { y: 541, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The plague entered at Pelusium in 541 and reached Constantinople in 542, killing at rates the capital stopped counting; it returned in waves for two centuries.',
    options: [
      {
        label: 'The tally passes counting',
        tooltip: 'Byzantium, Persia, the Ghassanids, the Ostrogoths, the Vandals and the Franks each carry "The Great Pestilence" (−20% manpower, −15% income for 60 months). Constantinople, Antioch, Alexandria, Thessalonica and Caesarea carry "The Plague Pits" (+2 unrest, −30% tax for 48 months). The inland hills bury fewer.',
        effects: guard('ev529_w_plague:0', (ctx) => {
          const h = ctx.helpers;
          for (const t of ['BYZ', 'SAS', 'GHA', 'OST', 'VAN', 'FRK']) {
            if (!alive(ctx, t)) continue;
            h.addTagModifier(ctx, t, {
              id: 'great_pestilence', name: 'The Great Pestilence', months: 60,
              effects: { manpowerMult: 0.8, incomeMult: 0.85 },
            });
          }
          stir(ctx, ['Byzantion', 'Antioch', 'Alexandria', 'Thessalonica', 'Caesarea Maritima'], {
            id: 'plague_pits', name: 'The Plague Pits', months: 48,
            effects: { unrest: 2, taxMult: 0.7 },
          });
          h.setFlag(ctx, 'justinianicPlague', true);
          h.chronicle(ctx, 'era', 'The plague comes up from the harbors and the capital\'s tally passes counting; the assessments of the dead are decreed payable by their neighbours.');
        }),
      },
    ],
  },

  // ── K8 · 552 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_taginae',
    title: 'The Last King of the Goths',
    worldLabel: 'Totila falls at Taginae; the Gothic kingdom dies fighting',
    desc: 'The war for Italy has run so long that the men who started it are '
      + 'dead or disgraced, and it ends under a eunuch: Narses, past seventy, '
      + 'an armchair general his whole career, who turns out at Taginae to be '
      + 'the best battlefield mind of the age. Totila — the king who rebuilt '
      + 'the Gothic war out of ruin, took Rome twice and freed the slaves who '
      + 'would fight for him — delays for reinforcements with a display of '
      + 'lance-work between the lines, a king dancing his horse in gilded '
      + 'armour before both armies; then attacks a prepared position and is '
      + 'dead by nightfall with six thousand of his people. Teia, elected '
      + 'king in the retreat, falls months later at the foot of Vesuvius '
      + 'fighting with such violence that even the Roman account gives him a '
      + 'hero\'s page. The survivors are granted leave to depart the '
      + 'peninsula — the one merciful term of the century — and the nation '
      + 'that took Italy under Theoderic simply stops existing as a nation. '
      + 'What the victory buys, twenty years of taxes will show: an Italy '
      + 'burned past decades of revenue, garrisoned by the exhausted, '
      + 'waiting for the next people over the Alps.',
    forTag: 'both',
    decider: 'BYZ',
    date: { y: 552, m: 7 },
    world: true,
    when: safeTrigger('ev529_w_taginae:when', (ctx) => alive(ctx, 'OST') && alive(ctx, 'BYZ') && warBetween(ctx, 'BYZ', 'OST')),
    aiOption: 0,
    historical: 'Narses broke Totila at Taginae in July 552 and Teia at Mons Lactarius months later; the Gothic survivors were allowed to leave Italy, and the kingdom ended.',
    options: [
      {
        label: 'Leave to depart the peninsula',
        tooltip: 'The Ostrogoths seat Teia over the retreat: −8,000 manpower, −20 legitimacy, and "The Last Muster" (−40% manpower permanently). Byzantium +10 martial points. The war\'s prize is an Italy burned past decades of revenue.',
        effects: guard('ev529_w_taginae:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'OST')) {
            h.setRuler(ctx, 'OST', { name: 'Teia', title: 'King of the Goths', gov: 1, infl: 1, mar: 4, age: 40 });
            h.adjust(ctx, 'OST', { manpower: -8000, legitimacy: -20 });
            h.addTagModifier(ctx, 'OST', {
              id: 'the_last_muster', name: 'The Last Muster', months: -1,
              effects: { manpowerMult: 0.6 },
            });
          }
          if (alive(ctx, 'BYZ')) h.adjust(ctx, 'BYZ', { mar: 10 });
          h.setFlag(ctx, 'taginae', true);
          h.chronicle(ctx, 'era', 'Totila falls at Taginae and Teia under Vesuvius; the nation that took Italy is granted leave to depart the peninsula, and stops being a nation.');
        }),
      },
    ],
  },

  // ── K9 · 559 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_kutrigurs',
    title: 'Three Hundred Veterans and a Wagon Wall',
    worldLabel: 'The Kutrigurs reach the walls; Belisarius is called out once more',
    desc: 'The Danube freezes, and Zabergan\'s Kutrigur horse cross it and ride '
      + 'for Constantinople itself — through a Thrace whose field army exists '
      + 'mainly as a payroll entry, past the Long Wall that the earthquakes '
      + 'have opened and the treasury has not closed. In the capital, the '
      + 'emperor calls for Belisarius. The conqueror of Carthage and Ravenna '
      + 'is old, unemployed and under the permanent suspicion that is '
      + 'Justinian\'s form of gratitude; he takes three hundred of his old '
      + 'guardsmen, whatever peasants can carry a spear, drums enough for ten '
      + 'times the number, and beats the raiders with an ambush and a noise. '
      + 'The emperor then relieves him of the command in favor of diplomacy — '
      + 'the Kutrigurs are paid to go home, and their rivals the Utigurs are '
      + 'paid to attack them on the way, Roman statecraft at its most '
      + 'economical — and the investigation into the general\'s popularity '
      + 'resumes. The city has learned what the walls are worth without an '
      + 'army behind them, and files the lesson beside the earthquake '
      + 'repairs, unfunded.',
    forTag: 'both',
    decider: 'BYZ',
    date: { y: 559, m: 3 },
    world: true,
    aiOption: 0,
    historical: 'Zabergan\'s Kutrigurs crossed the frozen Danube in 559 and reached the walls; Belisarius beat them with three hundred veterans and a levy, and the horde was paid to leave.',
    options: [
      {
        label: 'Drums enough for ten times the number',
        tooltip: 'The Bulgar horde +100 talents — paid to go home, with their rivals paid to meet them. Byzantium −100 talents and −5 legitimacy; Constantinople and Hadrianopolis carry "The Long Wall Is Open" (+2 unrest for 24 months).',
        effects: guard('ev529_w_kutrigurs:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'BGR')) h.adjust(ctx, 'BGR', { treasury: 100 });
          if (alive(ctx, 'BYZ')) h.adjust(ctx, 'BYZ', { treasury: -100, legitimacy: -5 });
          stir(ctx, ['Byzantion', 'Hadrianopolis'], {
            id: 'long_wall_open', name: 'The Long Wall Is Open', months: 24,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'kutrigurRaid', true);
          h.chronicle(ctx, 'era', 'The Kutrigurs ride to the walls of Constantinople and are beaten by an old man with three hundred veterans; then they are paid, and their rivals are paid to meet them.');
        }),
      },
    ],
  },

  // ── K10 · 561 ─────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_franks_divided',
    title: 'The Kingdom Multiplies by Dividing',
    worldLabel: 'Chlothar dies; the Frankish realm is quartered again',
    desc: 'Chlothar, last surviving son of Clovis, has spent fifty years '
      + 'collecting the Frankish realm the way his family collects everything '
      + '— by outliving it. Brothers, nephews, rebel sons: buried, the last '
      + 'of them burned alive in a cottage with his own family, a matter the '
      + 'king was observed to take hard afterwards, in his fashion. For three '
      + 'years he has held all Gaul alone, the first since his father. Then, '
      + 'at Compiègne, a fever — and the chronicle gives him an exit line of '
      + 'perfect Merovingian theology: what manner of King is in heaven, who '
      + 'kills off great kings like this? The realm is quartered among four '
      + 'sons by the family custom that treats a kingdom as a farm, and the '
      + 'four courts — Paris, Orléans, Soissons, Rheims — begin the slow '
      + 'sorting into rivalries that will run for two generations, with two '
      + 'queens, Brunhild and Fredegund, waiting in the next act to give the '
      + 'rivalries their names. The neighbors\' arithmetic is simple: the '
      + 'strongest power in the West spends every succession converting '
      + 'itself into four smaller ones.',
    forTag: 'both',
    decider: 'FRK',
    date: { y: 561, m: 11 },
    world: true,
    aiOption: 0,
    historical: 'Chlothar I died at Compiègne in late 561, three years after reuniting Gaul; the realm was divided among his four sons and the long feud of the queens followed.',
    options: [
      {
        label: 'A kingdom treated as a farm',
        tooltip: 'The Franks seat the four brothers: −1 stability and "The Partition" (−10% income for 60 months) while the courts sort into rivalries. The strongest power in the West converts itself into four smaller ones, on schedule.',
        effects: guard('ev529_w_franks_divided:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'FRK')) {
            h.setRuler(ctx, 'FRK', { name: 'Sigebert and His Brothers', title: 'Kings of the Franks', gov: 2, infl: 2, mar: 3, age: 26 });
            h.adjust(ctx, 'FRK', { stability: -1 });
            h.addTagModifier(ctx, 'FRK', {
              id: 'the_partition', name: 'The Partition', months: 60,
              effects: { incomeMult: 0.9 },
            });
          }
          h.setFlag(ctx, 'frankishPartition', true);
          h.chronicle(ctx, 'era', 'Chlothar dies asking what manner of King heaven keeps; the Frankish realm is quartered among four sons, as the custom treats a kingdom like a farm.');
        }),
      },
    ],
  },

  // ── K11 · 565 ─────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_justinian_dies',
    title: 'The Emperor Who Never Slept',
    worldLabel: 'Justinian is dead; Justin II refuses the subsidies',
    desc: 'Justinian dies in November, aged eighty-three, in the thirty-ninth '
      + 'year of a reign that recovered Africa and Italy, codified the whole '
      + 'of Roman law, built the dome, buried the empress — seventeen years '
      + 'gone, and he never remarried — and paid for all of it twice over, '
      + 'once in gold and once in the plague-thinned, tax-wrung exhaustion '
      + 'of every province he kept. The palace staff called him the emperor '
      + 'who never sleeps, and it was not entirely a compliment. His nephew '
      + 'Justin takes the diadem the same night, and announces the new '
      + 'policy within weeks: the subsidies — to the Avars, to the Persians, '
      + 'to every managed barbarian on every frontier — are beneath Roman '
      + 'dignity and will stop. It is the cheapest kind of principle, the '
      + 'kind purchased with other people\'s future wars. The old man '
      + 'understood something the nephew does not: the empire he rebuilt '
      + 'was a performance that had to be paid for nightly, and the '
      + 'audience it was performed for — Avar, Lombard, Persian — has been '
      + 'taking notes on the props.',
    forTag: 'both',
    decider: 'BYZ',
    date: { y: 565, m: 11 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Justinian died on 14 November 565 after thirty-eight years; Justin II took the throne and renounced the frontier subsidies within the year.',
    options: [
      {
        label: 'The subsidies are beneath Roman dignity',
        tooltip: 'Byzantium seats Justin II: −5 legitimacy, −1 stability — the performance stops being paid for nightly. The Avar and Lombard courts\' opinion of Byzantium falls by 60: the audience has been taking notes on the props.',
        effects: guard('ev529_w_justinian_dies:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'BYZ')) {
            h.setRuler(ctx, 'BYZ', { name: 'Justin II', title: 'Emperor of the Romans', gov: 2, infl: 3, mar: 1, age: 45 });
            h.adjust(ctx, 'BYZ', { legitimacy: -5, stability: -1 });
          }
          for (const t of ['LMB', 'BGR', 'SLV']) {
            if (!alive(ctx, t)) continue;
            const tt = ctx.game.tags[who(ctx, t)];
            if (tt) {
              if (!tt.opinion || typeof tt.opinion !== 'object') tt.opinion = {};
              tt.opinion[who(ctx, 'BYZ')] = Math.max(-200, (tt.opinion[who(ctx, 'BYZ')] || 0) - 60);
            }
          }
          h.setFlag(ctx, 'justinianDies', true);
          h.chronicle(ctx, 'era', 'The emperor who never sleeps is dead at eighty-three; his nephew renounces the subsidies, a principle purchased with other people\'s future wars.');
        }),
      },
    ],
  },

  // ── K12 · 568 ─────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_lombards',
    title: 'The Long Beards Cross the Alps',
    worldLabel: 'Alboin leads the Lombards into Italy',
    desc: 'Alboin has already done the century\'s most complete piece of work: '
      + 'allied with the Avars, he destroyed the Gepid kingdom, killed its '
      + 'king Cunimund with his own hand, married the daughter Rosamund off '
      + 'the battlefield, and — the detail every chronicle keeps — had the '
      + 'king\'s skull mounted as a drinking cup, which will figure later in '
      + 'his own death. Now he concludes that living beside his Avar allies '
      + 'is unwise, signs Pannonia over to them by treaty — a lease with no '
      + 'return clause — and takes the whole people over the Julian Alps '
      + 'into an Italy that Justinian\'s wars and the plague have swept '
      + 'nearly empty of defenders: the garrisons unpaid, the cities '
      + 'unwalled where the sieges of the Gothic war broke them. Milan '
      + 'falls the first summer; Pavia holds three years and becomes the '
      + 'capital as a compliment to its stubbornness. What the empire '
      + 'retains — Ravenna in its marshes, Rome, the toe and heel, the '
      + 'islands — it retains because it can be reached by sea, and the '
      + 'map of Italy for the next two centuries is the map of what a '
      + 'fleet can hold against a people who came on foot.',
    forTag: 'both',
    decider: 'LMB',
    date: { y: 568, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Alboin signed Pannonia to the Avars and led the Lombards into Italy in spring 568; Milan fell in 569 and Pavia after a three-year siege became the capital.',
    options: [
      {
        label: 'A lease with no return clause',
        tooltip: 'The Lombards seat Alboin: +15% manpower for 60 months ("The Migration") — the whole people is on the road. Mediolanum, Aquileia and Genua carry "The Lombard Descent" (+3 unrest for 60 months), and Byzantium\'s opinion of the newcomers is set at −100.',
        effects: guard('ev529_w_lombards:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'LMB')) {
            h.setRuler(ctx, 'LMB', { name: 'Alboin', title: 'King of the Lombards', gov: 2, infl: 3, mar: 5, age: 38 });
            h.addTagModifier(ctx, 'LMB', {
              id: 'the_migration', name: 'The Migration', months: 60,
              effects: { manpowerMult: 1.15 },
            });
          }
          if (alive(ctx, 'BYZ')) setOpinion(ctx, 'BYZ', 'LMB', -100);
          stir(ctx, ['Mediolanum', 'Aquileia', 'Genua'], {
            id: 'lombard_descent', name: 'The Lombard Descent', months: 60,
            effects: { unrest: 3 },
          });
          h.setFlag(ctx, 'lombardsInItaly', true);
          h.chronicle(ctx, 'era', 'Alboin signs Pannonia to the Avars and takes the whole Lombard people over the Alps; Italy becomes the map of what a fleet can hold.');
        }),
      },
    ],
  },

  // ── K13 · 582 ─────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_maurice',
    title: 'The Soldier\'s Emperor Writes the Book',
    worldLabel: 'Maurice takes the diadem over an empty treasury',
    desc: 'The reign between was an honest ruin: Justin II refused the '
      + 'subsidies, lost Dara to Persia for it, and lost his reason with it '
      + '— the fits are public, the court fits bars to the palace windows, '
      + 'and in a lucid hour he does the one great thing of his life, '
      + 'confessing his failure to the assembled court in plain words and '
      + 'raising the guardsman Tiberius as Caesar to rule for him. Tiberius '
      + 'reigns well and briefly and spends like a man who knows it, and '
      + 'dying, hands the diadem and his daughter to Maurice: a Cappadocian '
      + 'soldier back from beating Persia on the eastern front. The new '
      + 'emperor inherits a war on each end of the empire and a treasury '
      + 'Tiberius emptied buying affection, and governs accordingly — '
      + 'campaign in person on the Danube, count everything, cut the '
      + 'army\'s ration allowance and nearly lose the army over it. He also '
      + 'writes, or causes to be written, the Strategikon: the empire\'s '
      + 'collected craft of war, drill by drill, enemy by enemy — how the '
      + 'Persian fights, how the Avar fights, how the Frank can be bought '
      + '— the manual of a state that has decided survival is a discipline '
      + 'like any other, and can be taught.',
    forTag: 'both',
    decider: 'BYZ',
    date: { y: 582, m: 8 },
    world: true,
    aiOption: 0,
    historical: 'Justin II raised Tiberius in his madness\'s lucid hour; Tiberius died in August 582 leaving Maurice the diadem, his daughter, an empty treasury and two wars.',
    options: [
      {
        label: 'Survival is a discipline, and can be taught',
        tooltip: 'Byzantium seats Maurice: +5% discipline permanently ("The Strategikon") and −100 talents — the inheritance is two wars and an emptied treasury, and the manual is written anyway.',
        effects: guard('ev529_w_maurice:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'BYZ')) {
            h.setRuler(ctx, 'BYZ', { name: 'Maurice', title: 'Emperor of the Romans', gov: 3, infl: 2, mar: 4, age: 43 });
            h.adjust(ctx, 'BYZ', { treasury: -100 });
            h.addTagModifier(ctx, 'BYZ', {
              id: 'the_strategikon', name: 'The Strategikon', months: -1,
              effects: { disciplineMult: 1.05 },
            });
          }
          h.setFlag(ctx, 'mauriceCrowned', true);
          h.chronicle(ctx, 'era', 'Maurice takes the diadem over an empty treasury and two wars, and writes the empire\'s craft of war into a book that can be taught.');
        }),
      },
    ],
  },

  // ── K14 · 591 ─────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_khosrow_ii',
    title: 'The Shah Restored by Roman Spears',
    worldLabel: 'Maurice restores Khosrow II to the Persian throne',
    desc: 'Persia produces the century\'s strangest reversal. The king Hormizd, '
      + 'who taxed the great families into conspiracy, is deposed and blinded '
      + 'by his own court; the general Bahram Chobin — a Mihranid, victor '
      + 'over the Turks, and the first man in four centuries to take the '
      + 'crown without Sasanian blood — seizes the throne; and the young heir '
      + 'Khosrow, son of the blinded king, does the unthinkable: he rides '
      + 'west and asks asylum of Rome, the enemy his grandfather invoiced and '
      + 'his father fought. Maurice, over his senate\'s objection, decides a '
      + 'shah in debt is worth more than a war in progress: Roman armies '
      + 'escort Khosrow home, Bahram\'s usurpation collapses at the battle of '
      + 'Blarathon, and the price is signed over without haggling — Dara and '
      + 'Martyropolis returned, Armenia partitioned to the Roman advantage, '
      + 'and peace, actual peace, on the frontier that has eaten both '
      + 'empires\' revenues for a century. Khosrow calls Maurice father in '
      + 'the correspondence. The debt between kings is the most expensive '
      + 'currency there is, and this one has a term nobody can see from '
      + 'here: it falls due in 602, and the collection notice is the war '
      + 'the next chapter opens on.',
    forTag: 'both',
    decider: 'BYZ',
    date: { y: 591, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Khosrow II fled to Roman territory in 590 and was restored by Maurice\'s armies at Blarathon in 591; Dara and Martyropolis came back, and Khosrow called Maurice father.',
    options: [
      {
        label: 'A shah in debt is worth more than a war in progress',
        tooltip: 'Persia seats Khosrow II (+10 legitimacy) and the two empires\' opinion of each other rises to +100 — an actual peace on the frontier that has eaten both revenues for a century. The debt\'s term is invisible from here.',
        effects: guard('ev529_w_khosrow_ii:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SAS')) {
            h.setRuler(ctx, 'SAS', { name: 'Khosrow II Parviz', title: 'King of Kings', gov: 3, infl: 4, mar: 3, age: 21 });
            h.adjust(ctx, 'SAS', { legitimacy: 10 });
          }
          if (alive(ctx, 'BYZ') && alive(ctx, 'SAS')) {
            setOpinion(ctx, 'BYZ', 'SAS', 100);
            setOpinion(ctx, 'SAS', 'BYZ', 100);
          }
          h.setFlag(ctx, 'khosrowRestored', true);
          h.chronicle(ctx, 'era', 'Maurice restores the fugitive Khosrow to the Persian throne with Roman spears; the shah calls the emperor father, and the debt\'s term is invisible from here.');
        }),
      },
    ],
  },

  // ── K15 · 598 ─────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_sicut_judaeis',
    title: 'The Bishop of Rome Writes a Rule',
    worldLabel: 'Gregory rules: as the Jews are — Sicut Judaeis',
    desc: 'The bishop of Rome is, by default of everyone else, the government '
      + 'of the West: Gregory, a Roman prefect turned monk, who negotiates '
      + 'with Lombard kings, feeds the city from the church\'s estates, and '
      + 'answers mail from the whole Mediterranean. This year a letter goes '
      + 'to the bishop of Palermo, who has seized the city\'s synagogues in '
      + 'a fit of zeal, and it opens with a sentence that will be quoted for '
      + 'a thousand years: Sicut Judaeis — just as the Jews ought to have no '
      + 'license to do more in their synagogues than the law permits, so in '
      + 'what the law grants them they ought to suffer no infringement. The '
      + 'seized buildings, being consecrated by now, cannot be returned; '
      + 'Gregory orders the congregation paid their full value, which as '
      + 'jurisprudence is the whole doctrine in one transaction. The same '
      + 'pen elsewhere approves bribing Sicilian Jews toward baptism with '
      + 'tax relief, on the frank reasoning that if the parents come '
      + 'insincerely the children will come honestly — both letters are '
      + 'true at once, and the archive keeps both. But the rule is the '
      + 'thing that survives: in the West that is assembling itself out of '
      + 'the empire\'s pieces, there is now a floor, written by the one '
      + 'authority everyone answers, under which the Jews cannot lawfully '
      + 'be pushed. The kings of Spain, this same decade, are building in '
      + 'the other direction.',
    forTag: 'both',
    decider: 'BYZ',
    date: { y: 598, m: 6 },
    world: true,
    aiOption: 0,
    historical: 'Gregory\'s letter to Victor of Palermo in 598 opened Sicut Judaeis and ordered the seized synagogues paid for at full value; the formula became the papal constitution on the Jews for a millennium.',
    options: [
      {
        label: 'What the law grants, no infringement',
        tooltip: 'Roma and Panormus carry "Sicut Judaeis" (−1 unrest for 120 months) — a floor is written under the communities of the West by the one authority everyone answers. The kings of Spain are building in the other direction.',
        effects: guard('ev529_w_sicut_judaeis:0', (ctx) => {
          const h = ctx.helpers;
          stir(ctx, ['Roma', 'Panormus'], {
            id: 'sicut_judaeis', name: 'Sicut Judaeis', months: 120,
            effects: { unrest: -1 },
          });
          h.setFlag(ctx, 'sicutJudaeis', true);
          h.chronicle(ctx, 'era', 'Gregory writes Sicut Judaeis to Palermo and makes the bishop pay full value for the seized synagogues; a floor is written under the West\'s communities.');
        }),
      },
    ],
  },

  // ── K16 · 602 ─────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_phocas',
    title: 'The Army Elects a Centurion',
    worldLabel: 'Maurice is murdered; Phocas takes the purple',
    desc: 'Maurice\'s economies finally find the one item that cannot be cut: '
      + 'the Danube army, ordered to winter beyond the river on forage to '
      + 'save its supply bill, decides it has a cheaper solution and raises '
      + 'a centurion named Phocas on a shield. The dynasty\'s end is a '
      + 'procession of the century\'s worst scenes: the emperor who wrote '
      + 'the book on discipline watching his five sons killed at Chalcedon '
      + 'before his own turn — bearing it, the sources insist, reciting '
      + 'that the judge is just — while the city that might have saved him '
      + 'settles scores between its own circus factions. Phocas reigns as '
      + 'exactly what he is, a junior officer with a torture chamber. And '
      + 'in Ctesiphon, Khosrow II — who owes his throne to Maurice and has '
      + 'called him father for a decade — receives the news as the best '
      + 'gift of his reign: a filial duty of vengeance that happens to '
      + 'coincide, exactly, with the conquest of the Roman East. The '
      + 'collection notice on 591\'s debt is served. The war it opens is '
      + 'the one this game\'s next chapter is named for, and it begins '
      + 'here, with an army that did not want to winter in the cold.',
    forTag: 'both',
    decider: 'BYZ',
    date: { y: 602, m: 11 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The Danube army raised Phocas in November 602; Maurice and his sons were killed at Chalcedon, and Khosrow II declared war as his patron\'s avenger.',
    options: [
      {
        label: 'The judge is just',
        tooltip: 'Byzantium seats Phocas: −20 legitimacy, −2 stability. Persia\'s opinion of Byzantium collapses to −150 — the shah\'s filial vengeance coincides exactly with the conquest of the Roman East, and the next chapter\'s war begins here.',
        effects: guard('ev529_w_phocas:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'BYZ')) {
            h.setRuler(ctx, 'BYZ', { name: 'Phocas', title: 'Emperor of the Romans', gov: 1, infl: 1, mar: 2, age: 55 });
            h.adjust(ctx, 'BYZ', { legitimacy: -20, stability: -2 });
          }
          if (alive(ctx, 'SAS')) setOpinion(ctx, 'SAS', 'BYZ', -150);
          h.setFlag(ctx, 'phocasUsurps', true);
          h.chronicle(ctx, 'era', 'The Danube army raises a centurion and Maurice dies at Chalcedon reciting that the judge is just; in Ctesiphon the debt of 591 is called in.');
        }),
      },
    ],
  },

  // ── K17 · 610 ─────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_heraclius',
    title: 'The Fleet From Carthage',
    worldLabel: 'Heraclius sails from Africa and takes the purple',
    desc: 'Africa is the one province the disasters have not reached, and its '
      + 'exarch — Heraclius the elder, one of Maurice\'s generals — has been '
      + 'withholding the grain fleet and the taxes from Phocas for two years, '
      + 'which is secession conducted with an accountant\'s patience. In 610 '
      + 'he commits: his son, also Heraclius, sails for Constantinople with '
      + 'the African fleet, gathering the islands as he comes, while a '
      + 'cousin brings the cavalry through Egypt. The capital does not fight '
      + 'for Phocas; it hands him over. The exchange between the usurper '
      + 'and the rebel is preserved: Is it thus that you have governed the '
      + 'empire? — And will you govern it better? Phocas, to his credit as '
      + 'a wit if nothing else, is executed mid-retort. Heraclius is '
      + 'crowned the same afternoon. What he inherits is not an empire but '
      + 'the shell of one — the Persians hold the East to the Euphrates '
      + 'and are not stopping, the Avars own the Balkans to the Long Wall, '
      + 'the treasury is a rumor. Four years from this coronation, '
      + 'Jerusalem falls, and this game\'s next chapter begins. The man '
      + 'from Carthage will spend his whole reign on the consequences of '
      + 'this decade, and so, in the hills above the coast road, will '
      + 'everyone else.',
    forTag: 'both',
    decider: 'BYZ',
    date: { y: 610, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Heraclius sailed from Carthage and was crowned on 5 October 610 after Phocas was handed over; the Persian war he inherited reached Jerusalem in 614.',
    options: [
      {
        label: 'And will you govern it better?',
        tooltip: 'Byzantium seats Heraclius: +10 legitimacy — the African fleet has delivered a reign that will be spent entirely on this decade\'s consequences. Four years from this coronation, Jerusalem falls.',
        effects: guard('ev529_w_heraclius:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'BYZ')) {
            h.setRuler(ctx, 'BYZ', { name: 'Heraclius', title: 'Emperor of the Romans', gov: 3, infl: 3, mar: 4, age: 35 });
            h.adjust(ctx, 'BYZ', { legitimacy: 10 });
          }
          h.setFlag(ctx, 'heracliusCrowned', true);
          h.chronicle(ctx, 'era', 'Heraclius sails from Carthage, Phocas is executed mid-retort, and the man from Africa inherits the shell of an empire; Jerusalem is four years away.');
        }),
      },
    ],
  },

  // ── SPEC §206: the south while the Keepers keep. The chapter opens four
  // years after Kaleb's crossing, and the far end of the map keeps moving
  // through its whole span: the viceroy who stops answering, the missionary
  // in the cave, the dam, and the eight ships that end four centuries of
  // Aksumite reach. Sources: Procopius Wars I.19-20, John of Ephesus HE
  // IV.6-7, CIH 541 and the dam inscriptions, al-Tabari on the deacon's
  // fleet. Same admission rule: none of this asks how Samaria's war went. ──

  // ── S1 · 533 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_abraha',
    title: 'The Viceroy Stops Answering',
    worldLabel: 'Abraha takes Himyar from Kaleb\'s viceroy; the tribute becomes a word',
    desc: 'Four years ago the negus crossed the strait, broke the Jewish king of '
      + 'Himyar, and left a viceroy at Zafar with an Aksumite garrison. Now the '
      + 'garrison has decided it prefers its own judgment: a soldier named '
      + 'Abraha — Procopius, who is following all of this from Justinian\'s '
      + 'council, calls him a slave-born man of business — deposes the viceroy '
      + 'and takes the country. Kaleb sends an army; it goes over to Abraha. '
      + 'He sends another; it is destroyed. And then the accounting settles '
      + 'into the oldest shape in the world: Abraha, secure, sends the negus '
      + 'tribute — Procopius\' phrase is that he agreed to pay it, having '
      + 'become strong enough not to — and the tribute is a word, and both '
      + 'courts agree to pretend the word is a fact. The conquest across the '
      + 'sea has lasted eight years as a conquest. As a pretense it will last '
      + 'a generation, which is longer than most facts.',
    forTag: 'both',
    decider: 'AXM',
    date: { y: 533, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    // SPEC §208: the client court is seated now, so the mutiny lands on the
    // live map. The card fires while the conquest is still a conquest —
    // Zafar either held by Aksum outright or by a Himyar still wearing the
    // yoke. A client that already won free has no viceroyalty to mutiny
    // against, and the card retires into the divergence ledger.
    when: safeTrigger('ev529_w_abraha:when', (ctx) => {
      if (!alive(ctx, 'AXM')) return false;
      const z = ctx.prov('Zafar');
      if (!z) return false;
      if (z.owner === who(ctx, 'AXM')) return true;
      if (z.owner !== who(ctx, 'HMY')) return false;
      const t = ctx.game.tags[who(ctx, 'HMY')];
      return !!(t && t.alive !== false && t.overlord === who(ctx, 'AXM'));
    }),
    historical: 'Abraha deposed Sumyafa Ashwa about 531-535 and defeated two Aksumite armies sent against him; he thereafter paid Kaleb nominal tribute (Procopius, Wars I.20).',
    options: [
      {
        label: 'Agree to call the word a fact',
        tooltip: 'Aksum −1 stability and "The Viceroy\'s Word" (−7% income permanently — the Yemen remits a phrase). The yoke on Himyar is cut either way; an AI court gets Abraha for a king, a player\'s court keeps its throne and inherits the garrison\'s fury.',
        effects: guard('ev529_w_abraha:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'AXM', { stability: -1 });
          h.addTagModifier(ctx, 'AXM', {
            id: 'viceroys_word', name: 'The Viceroy\'s Word', months: -1,
            effects: { incomeMult: 0.93 },
          });
          // The mutiny reaches the client court (SPEC §208). The bond to
          // Aksum dies here whoever ends up on top: Abraha's whole
          // arrangement is that the tribute becomes a word. On an AI
          // Himyar the garrison's man takes the crown, which is what
          // happened; on a player's the crown holds but the negus' men
          // stop being anybody's instrument but their own — the same
          // history, heard from the throne it happened to.
          const hmy = who(ctx, 'HMY');
          const t = ctx.game.tags[hmy];
          if (t && t.alive !== false && t.overlord === who(ctx, 'AXM')) {
            t.overlord = null;
            if (t.ai) {
              h.setRuler(ctx, hmy, { name: 'Abraha', title: 'King of Himyar', gov: 3, infl: 3, mar: 4, age: 40 });
              setOpinion(ctx, 'HMY', 'AXM', -40);
              setOpinion(ctx, 'AXM', 'HMY', -40);
            } else {
              try { h.factionShift(ctx, hmy, 'negus_men', -35); } catch (e) { warnOnce('ev529_w_abraha:shift', e); }
            }
          }
          h.setFlag(ctx, 'abrahaViceroy', true);
          h.chronicle(ctx, 'era', 'Abraha and the garrison stop answering across the strait: the army sent to correct them goes over, the next is destroyed, and the Yemen thereafter remits to Aksum a tribute consisting of the word "tribute".');
        }),
      },
    ],
  },

  // ── S2 · 543 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_julian_nubia',
    title: 'The Missionary in the Cave',
    worldLabel: 'Julian baptizes Nobatia; the Nile above the cataract takes the Cross',
    desc: 'The mission that converts a thousand years of Nile kingdoms begins as a '
      + 'court intrigue between an emperor and his wife. Justinian prepares a '
      + 'mission to the Nubian kings — of his own Chalcedonian persuasion. '
      + 'Theodora, whose sympathies run the other way, gets her man there '
      + 'first: John of Ephesus tells, with open admiration, how the empress '
      + 'wrote ahead to the duke of the Thebaid and arranged for the '
      + 'emperor\'s embassy to be politely, thoroughly delayed while the '
      + 'presbyter Julian went up the river. What Julian endures for the '
      + 'faith is the detail the historian keeps: a heat so terrible that '
      + 'from the third hour to the tenth he sat teaching in a cave, up to '
      + 'his neck in water, clothed in nothing but a linen cloth. It works. '
      + 'The king of the Nobades and his nobles are baptized; the temples of '
      + 'Isis at Philae, the last pagan sanctuary of the classical world, '
      + 'have already been closed at the emperor\'s order; and the river '
      + 'kingdoms above the cataract begin four centuries as the southern '
      + 'bastion of a church their converter\'s own empire calls heretical.',
    forTag: 'both',
    decider: 'NOB',
    date: { y: 543, m: 8 },
    world: true,
    aiOption: 0,
    when: safeTrigger('ev529_w_julian_nubia:when', (ctx) => alive(ctx, 'NOB')),
    historical: 'Julian\'s mission baptized the Nobadae about 543, Theodora having outmaneuvered Justinian\'s rival embassy (John of Ephesus, HE IV.6-7); Longinus completed the work to Alodia by 580.',
    options: [
      {
        label: 'Teach from the water',
        tooltip: 'Nubia and its provinces become Christian; the kingdom gains +1 stability and the two courts of the Nile and the Bosporus warm (+40 opinion both ways).',
        effects: guard('ev529_w_julian_nubia:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const nob = who(ctx, 'NOB');
          const t = g.tags[nob];
          if (t) t.religion = 'christianity';
          for (let i = 1; i < g.provinces.length; i++) {
            const p = g.provinces[i];
            if (p && !p.impassable && p.owner === nob) p.religion = 'christianity';
          }
          h.adjust(ctx, nob, { stability: 1 });
          if (alive(ctx, 'BYZ')) {
            setOpinion(ctx, 'NOB', 'BYZ', 40);
            setOpinion(ctx, 'BYZ', 'NOB', 40);
          }
          h.setFlag(ctx, 'nubiaBaptized', true);
          h.chronicle(ctx, 'era', 'The presbyter Julian teaches from a cave up to his neck in water, and the king of the Nobades is baptized: the Nile above the cataract takes the Cross it will hold for a thousand years.');
        }),
      },
    ],
  },

  // ── S3 · 570 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_wahriz',
    title: 'Eight Ships for a Kingdom',
    worldLabel: 'Wahriz takes Yemen for the King of Kings; Aksum loses its sea',
    desc: 'It ends the way it began — with a foreign fleet and a local claimant. A '
      + 'Himyarite prince of the old line, Sayf son of Dhi Yazan, tours the '
      + 'courts of the north asking someone, anyone, to put the Ethiopians '
      + 'out of his country. Constantinople declines: the Aksumites are '
      + 'fellow Christians and nominal allies. Ctesiphon\'s war council is '
      + 'against it too — too far, too little worth taking — until, the '
      + 'story goes, the argument that carries the day is that the '
      + 'expedition can be made entirely out of things the King of Kings can '
      + 'afford to lose: eight ships, and eight hundred men from the '
      + 'prisons. Two ships sink on the way. The commander is Wahriz, an '
      + 'old man of the old families; at the decisive battle he asks which '
      + 'rider is the Ethiopian king, takes one shot with the bow he has to '
      + 'have strung for him, and puts it through Masruq\'s forehead. Six '
      + 'hundred convicts take a country four Roman emperors courted. The '
      + 'abna — the sons, half-Persian garrison children — will hold '
      + 'Sana\'a for two generations, and the far end of Arabia is a '
      + 'Sasanian province the year a boy named Muhammad is born in Mecca.',
    forTag: 'both',
    decider: 'SAS',
    date: { y: 570, m: 11 },
    world: true,
    major: true,
    aiOption: 0,
    // SPEC §208: the fleet's own arithmetic — eight ships of convicts is
    // the price of a country already broken, and the card fires exactly
    // where its own transfer clause would take something: Zafar held by
    // Aksum, by a client still under the Aksumite yoke, or by nobody
    // living. A free Himyar is not worth a fleet (Ctesiphon's council was
    // barely persuaded to spend prisoners); a Himyar already in the King
    // of Kings' own clientele needs no conquering — the §168 ages engine
    // absorbs it on its own clock, which is the abna's story told by the
    // simulation instead of the script (the 91-year harness did exactly
    // that: vassalized in the 540s, incorporated in 575, the 614 map).
    when: safeTrigger('ev529_w_wahriz:when', (ctx) => {
      if (!alive(ctx, 'SAS')) return false;
      const z = ctx.prov('Zafar');
      if (!z) return false;
      if (z.owner === who(ctx, 'AXM')) return true;
      const holder = ctx.game.tags[z.owner];
      if (!holder || holder.alive === false) return true;
      return z.owner === who(ctx, 'HMY') && holder.overlord === who(ctx, 'AXM');
    }),
    historical: 'Khosrow I sent Wahriz with a convict fleet about 570-575; Masruq son of Abraha fell to Wahriz\'s arrow and Yemen became a Sasanian province held by the abna (al-Tabari; the tradition\'s date for the Prophet\'s birth is the same year).',
    options: [
      {
        label: 'One arrow, strung by another man\'s hands',
        tooltip: 'The incense country — Zafar, Muza, Aden, Marib, Najran, the Hadramawt shore and Dioscurida — passes to the King of Kings, from Aksum\'s hands or a yoked client\'s. Persia −100 talents for the fleet; Aksum −1 stability and a cold rage (−80 opinion of Persia).',
        effects: guard('ev529_w_wahriz:0', (ctx) => {
          const h = ctx.helpers;
          const sas = who(ctx, 'SAS');
          const axm = who(ctx, 'AXM');
          const hmy = who(ctx, 'HMY');
          const hmyT = ctx.game.tags[hmy];
          // A client still under the Aksumite yoke falls with the patron
          // (SPEC §208) — the abna replace the viceroyalty, not the free
          // kingdom the `when` gate already spared.
          const yokedClient = !!(hmyT && hmyT.alive !== false && hmyT.overlord === axm);
          for (const n of ['Zafar', 'Muza', 'Eudaemon Arabia', 'Marib', 'Najran',
            'Shabwa', 'Moscha', 'Dioscurida']) {
            const p = ctx.prov(n);
            if (!p || p.impassable) continue;
            const holder = ctx.game.tags[p.owner];
            if (p.owner === axm || (yokedClient && p.owner === hmy)
              || !holder || holder.alive === false) h.changeOwner(ctx, n, sas);
          }
          h.adjust(ctx, sas, { treasury: -100 });
          if (alive(ctx, 'AXM')) {
            h.adjust(ctx, 'AXM', { stability: -1 });
            setOpinion(ctx, 'AXM', 'SAS', -80);
          }
          h.setFlag(ctx, 'wahrizYemen', true);
          h.chronicle(ctx, 'era', 'Wahriz\'s convict fleet takes Yemen for the King of Kings with one aimed arrow; Aksum loses its sea, and the far end of Arabia is Persian the year Muhammad is born.');
        }),
      },
    ],
  },

  // ── S4 · 575 ──────────────────────────────────────────────────────────────
  {
    id: 'ev529_w_marib_breaks',
    title: 'The Dam Gives Way for the Last Time',
    worldLabel: 'The great dam at Marib is abandoned; the gardens of Saba go under the sand',
    desc: 'The oldest working thing in the world stops working. The dam at Marib '
      + 'is not a wall but a system — a sluice-and-spillway engine of packed '
      + 'earth and dressed stone that has caught the mountain floods and '
      + 'watered the twin gardens of Saba for thirteen hundred years, and '
      + 'which every kingdom in the south, whatever its gods, has repaired as '
      + 'the price of calling itself a kingdom. Abraha\'s own inscription on '
      + 'the last great repair reads like a state budget: so many thousands '
      + 'of workmen fed, so many camels slaughtered, the embassies of Rome '
      + 'and Persia and Aksum received at the works. Now the works are '
      + 'nobody\'s budget. The garrison state of the abna repairs frontiers, '
      + 'not sluices; the floods come; the breach stands. The gardens that '
      + 'fed sixty generations silt to desert within one, and the tribes '
      + 'that farmed them scatter north along the caravan roads — a '
      + 'dispersal Arabia will remember as the moment its old world ended, '
      + 'and a later scripture will cite as the judgment on Saba: We made '
      + 'them into tales.',
    forTag: 'both',
    decider: 'SAS',
    date: { y: 575, m: 7 },
    world: true,
    aiOption: 0,
    // SPEC §208: the breach is a budget line, not a fate. The card's own
    // text says every kingdom of the south repaired the dam as the price
    // of calling itself one — so a living court that has paid that price
    // (the §208 mission sets `himyarDamKept`) and still holds Marib is a
    // world where the works are somebody's budget, and the breach stands
    // repaired instead of standing open.
    when: safeTrigger('ev529_w_marib_breaks:when', (ctx) => {
      if (!ctx.helpers.getFlag(ctx, 'himyarDamKept')) return true;
      const p = ctx.prov('Marib');
      const t = ctx.game.tags[who(ctx, 'HMY')];
      return !(p && t && t.alive !== false && p.owner === who(ctx, 'HMY'));
    }),
    historical: 'The Marib dam\'s final breach and abandonment fell in the 570s-580s, after Abraha\'s great repair of 548 (CIH 541); Quran 34:15-19 preserves the memory of the dispersal.',
    options: [
      {
        label: 'The breach stands',
        tooltip: 'Marib carries "The Broken Dam" permanently (−40% tax, −30% production, +2 unrest), and Zafar and Najran carry "The Tribes Scatter" (+1 unrest for 5 years). The old south ends.',
        effects: guard('ev529_w_marib_breaks:0', (ctx) => {
          const h = ctx.helpers;
          stir(ctx, ['Marib'], {
            id: 'broken_dam', name: 'The Broken Dam', months: -1,
            effects: { taxMult: 0.6, prodMult: 0.7, unrest: 2 },
          });
          stir(ctx, ['Zafar', 'Najran'], {
            id: 'tribes_scatter', name: 'The Tribes Scatter', months: 60,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'maribBroken', true);
          h.chronicle(ctx, 'era', 'The dam at Marib gives way for the last time and no kingdom repairs it; the gardens of Saba silt to desert and the tribes scatter north. We made them into tales.');
        }),
      },
    ],
  },
];
