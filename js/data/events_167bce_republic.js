// Judaea Universalis — the Republic's own century, 149–73 BCE (SPEC §111 continued).
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_167 by the era registry. BCE years are
// negative.
//
// §111 gave this chapter a world spine and taught it the rule: what happens
// whichever way the revolt went belongs on the calendar. But the spine it
// shipped was the EASTERN spine — Carthage and Corinth in one line, and then
// everything west of the Adriatic goes quiet for eighty years while Parthia
// and Tigranes eat the Seleucids. The century in which Rome became the thing
// the 67 BCE chapter opens on was happening in Spain, on the Po, in the
// Forum: Numantia and the Gracchi in the same year, the Cimbri coming down
// the passes, Italy itself rising, a consul marching his legions on his own
// city, the lists posted in the Forum. Every court in the East read those
// dispatches — the Hasmoneans renewed a Roman treaty three times while Rome
// was doing all of this — and the player sitting in Jerusalem should get the
// same dispatches the high priests got.
//
// The rule for admission is §104's: it must happen whichever way the revolt
// went. Nothing here touches Judaea's own ledger except through opinion and
// the world's shape; nothing here takes a province off a living court that
// history did not take it from (the transfer() rule of the world file,
// SPEC §111).
//
// Source spine: Polybius XXXVI–XXXIX; Appian, Iberica, Libyca and Civil Wars
// I; Plutarch's Tiberius and Gaius Gracchus, Marius, Sulla and Crassus;
// Sallust, Bellum Iugurthinum; Livy's Periochae; Florus; Valerius Maximus;
// Orosius for the numbers at Arausio, with the usual caution about Orosius
// and numbers.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_167bce_republic] ' + key, e || '');
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

// ── the Republic's civil wars, on the map (SPEC §251) ───────────────────────
//
// This package's own header says what it is for: the century in which Rome
// became the thing the next chapter opens on, and the dispatches the high
// priests actually read. Two of those dispatches are wars fought inside Italy
// — the allies' war of 91 and Sulla's of 83 — and both were rendered as
// unrest in three cities and a modifier on one undivided Rome.
//
// `USR`, the rival purple (§239): one generic banner, raised by the card that
// raises the claim and dissolved by the card that settles it, dressed each
// time for whoever is flying it. The two arcs here are three years apart and
// this chapter flies the banner nowhere else before -91, so the singular rule
// holds by the calendar rather than by luck.
//
// Neither claim is a "usurpation" in the later imperial sense, and the tag
// does not care: Italia is a confederacy with its own senate, its own coinage
// and a capital it renamed Italica, and Sulla is a proconsul with an army and
// no legal standing whatever. What they have in common is the only thing the
// map needs — provinces that have stopped obeying the government at Rome.

// The confederacy of 91: Picenum, Campania south of the Volturnus, Samnium,
// Lucania and Bruttium, at the resolution this map has for Italy. Roma is not
// in it, and neither is anything north of the Apennines: the Po valley did not
// rise, and the whole political point of the war is that it did not have to.
const ITALIA = ['Ancona', 'Capua', 'Tarentum', 'Rhegium'];
// Sulla's landing and his march: five legions at Brundisium in the spring of
// 83, Campania by the autumn, and the Colline Gate a year later. What he holds
// on the way is what he has taken from the government he is marching on.
const SULLAS_ITALY = ['Brundisium', 'Tarentum', 'Capua'];

// One claimant at a time; only what Rome still holds; a claim with no ground
// is a proclamation, and this map does not model proclamations.
function raiseAgainstRome(ctx, spec) {
  const g = ctx.game;
  const h = ctx.helpers;
  if (g.tags.USR) return null;
  const rome = who(ctx, 'ROM');
  const ground = spec.provinces.filter((n) => {
    const p = ctx.prov(n);
    return p && !p.impassable && p.owner === rome;
  });
  if (!ground.length) return null;
  const claimant = h.secedeTag(ctx, rome, 'USR', {
    provinces: ground,
    share: spec.share,
    name: spec.name,
    color: spec.color,
    opinion: -200,
    stability: spec.stability,
    legitimacy: spec.legitimacy,
    ruler: spec.ruler,
  });
  if (!claimant) return null;
  h.declareWar(ctx, rome, 'USR', spec.war);
  for (const w of g.wars || []) {
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf('USR') >= 0 && all.indexOf(rome) >= 0) w.noNegotiation = true;
  }
  setOpinion(ctx, rome, 'USR', -200);
  setOpinion(ctx, 'USR', rome, -200);
  if (spec.modifier) h.addTagModifier(ctx, 'USR', spec.modifier);
  if (spec.army) {
    const at = ground.indexOf(spec.army.at) >= 0 ? spec.army.at : ground[0];
    h.spawnArmy(ctx, 'USR', at, spec.army.opts);
  }
  return claimant;
}
// …and the settlement. `winner: true` says the court being dissolved is the
// one that WON, which is Sulla exactly: the army that marched on Rome did not
// lose, it became the government and then wrote down what it had done.
function settleAgainstRome(ctx, line, winner) {
  if (!ctx.game.tags.USR) return false;
  ctx.helpers.dissolveTag(ctx, 'USR', who(ctx, 'ROM'), { chronicle: line, winner: !!winner });
  return true;
}

function raiseItalia(ctx) {
  return raiseAgainstRome(ctx, {
    provinces: ITALIA,
    share: 0.25,
    name: 'Italia',
    // The bull on the confederacy's own coinage, goring the wolf.
    color: [138, 116, 72],
    stability: 0,
    legitimacy: 45,
    war: 'The War of the Allies',
    ruler: { name: 'Quintus Poppaedius Silo', title: 'Consul of Italia', gov: 3, infl: 3, mar: 4, age: 45 },
    modifier: {
      id: 'trained_in_roman_camps', name: 'Trained in Roman Camps', months: -1,
      effects: { disciplineMult: 1.08, moraleMult: 1.05, incomeMult: 0.85 },
    },
    army: {
      at: 'Ancona',
      opts: {
        inf: 12, cav: 2, name: 'The Army of Italica',
        general: { name: 'Poppaedius Silo', fire: 3, shock: 3, maneuver: 3 },
      },
    },
  });
}

function raiseSulla(ctx) {
  return raiseAgainstRome(ctx, {
    provinces: SULLAS_ITALY,
    share: 0.2,
    name: 'The Proconsul\'s Army',
    color: [156, 118, 92],
    stability: 0,
    legitimacy: 20,
    war: 'The War of Sulla and the Consuls',
    ruler: { name: 'Lucius Cornelius Sulla', title: 'Proconsul', gov: 4, infl: 3, mar: 5, age: 55 },
    modifier: {
      id: 'the_army_from_the_east', name: 'The Army Back From the East', months: -1,
      effects: { moraleMult: 1.15, disciplineMult: 1.1, manpowerMult: 0.6 },
    },
    army: {
      at: 'Brundisium',
      opts: {
        inf: 10, cav: 3, name: 'The Legions of the Mithridatic War',
        general: { name: 'Cornelius Sulla', fire: 3, shock: 4, maneuver: 3 },
      },
    },
  });
}

export const EVENTS_167_REPUBLIC = [

  // ── R1 · -148 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_andriscus',
    title: 'A Man Claiming to Be Philip',
    worldLabel: 'The false Philip falls; Macedonia becomes a Roman province',
    desc: 'An adventurer from Adramyttium announces that he is Philip, son of King '
      + 'Perseus, come back for the Macedonian throne. It should be a farce — the real '
      + 'Philip died in Italian custody, and everyone who mattered knows it — and then '
      + 'the farce destroys a Roman legion and kills the praetor commanding it, because '
      + 'Macedonia does not particularly care whose son he is; it cares that the '
      + 'republic Rome installed is four squabbling cantons where a kingdom used to be. '
      + 'Metellus needs a year to put him down. The Senate has now settled Macedonia '
      + 'twice on generous terms and been repaid with a war each time, so it stops '
      + 'settling: Macedonia becomes a province, with a governor, a garrison and a '
      + 'road — the Via Egnatia, mile-stoned from the Adriatic toward the Bosporus, '
      + 'built so that the next army can arrive before the next pretender does.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -148, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Andriscus beat and killed the praetor Juventius before Metellus crushed him in 148; Macedonia became the first Roman province east of the Adriatic.',
    options: [
      {
        label: 'A governor, a garrison and a road',
        tooltip: 'Thessalonica passes to Rome where no living court but Greece holds it; Rome +10 legitimacy and +100 talents of Macedonian mine revenue. Thessalonica and Dyrrhachium carry "The Via Egnatia" (+10% tax for 120 months) — the road is good for business, whoever the business answers to.',
        effects: guard('ev_rw_andriscus:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            transfer(ctx, ['Thessalonica'], 'ROM', 'GRC');
            h.adjust(ctx, 'ROM', { legitimacy: 10, treasury: 100 });
          }
          stir(ctx, ['Thessalonica', 'Dyrrhachium'], {
            id: 'via_egnatia', name: 'The Via Egnatia', months: 120,
            effects: { taxMult: 1.1 },
          });
          h.setFlag(ctx, 'macedoniaProvincia', true);
          h.chronicle(ctx, 'era', 'The false Philip is led in chains behind Metellus; Macedonia becomes a province, and the Via Egnatia starts marching east.');
        }),
      },
    ],
  },

  // ── R2 · -139 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_viriathus',
    title: 'The Shepherd Is Killed in His Sleep',
    worldLabel: 'Viriathus of Lusitania is murdered by his own envoys',
    desc: 'For eight years a Lusitanian shepherd has beaten every army Rome sent into '
      + 'the far west — beaten one praetor with his baggage, trapped a consul\'s army '
      + 'whole and let it go in exchange for a treaty naming him a friend of the Roman '
      + 'people, which the Senate ratified and then instructed the next governor to '
      + 'ignore. Servilius Caepio finds the cheaper instrument: three of Viriathus\'s '
      + 'own envoys, sent to negotiate, are sent back with Roman gold to cut his throat '
      + 'while he sleeps in his armour. When the three come to collect, the consul '
      + 'declines to pay — Rome does not pay traitors, a sentence every court from '
      + 'Gades to Seleucia will repeat for the next century, some of them admiringly. '
      + 'Lusitania fights one more season under lesser men and then takes the land '
      + 'allotments it is offered. The lesson travels east faster than the official '
      + 'dispatches: a treaty with Rome binds exactly as long as Rome finds it '
      + 'convenient, and the men who beat Rome in the field do not die in the field.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -139, m: 3 },
    world: true,
    aiOption: 0,
    historical: 'Audax, Ditalcus and Minurus killed Viriathus in his sleep for Caepio\'s gold; Caepio refused to pay them, and Lusitania settled within the year.',
    options: [
      {
        label: 'Rome does not pay traitors',
        tooltip: 'Lusitania −20 legitimacy, −2,000 manpower and "The Shepherd\'s Peace" (−15% manpower permanently); Olisipo, Salmantica and Emerita +2 unrest for 36 months while the war party argues with the allotments. Rome +5 legitimacy at home and −15 opinion in every eastern court that has a Roman treaty in its archive.',
        effects: guard('ev_rw_viriathus:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'LUS')) {
            h.adjust(ctx, 'LUS', { legitimacy: -20, manpower: -2000 });
            h.addTagModifier(ctx, 'LUS', {
              id: 'shepherds_peace', name: 'The Shepherd\'s Peace', months: -1,
              effects: { manpowerMult: 0.85 },
            });
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 5 });
          stir(ctx, ['Olisipo', 'Salmantica', 'Emerita'], {
            id: 'the_allotments', name: 'The Allotments', months: 36,
            effects: { unrest: 2 },
          });
          for (const t of ['SEL', 'PTO', 'PAR', 'ARM', 'NAB']) {
            const tt = ctx.game.tags[who(ctx, t)];
            if (tt && tt.alive !== false && tt.opinion) {
              tt.opinion.ROM = Math.max(-200, (tt.opinion.ROM || 0) - 15);
            }
          }
          h.setFlag(ctx, 'viriathusSlain', true);
          h.chronicle(ctx, 'era', 'Viriathus is murdered in his sleep by envoys carrying Roman gold; the consul declines to pay them, and the sentence travels east.');
        }),
      },
    ],
  },

  // ── R3 · -133 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_numantia',
    title: 'The City That Preferred Ashes',
    worldLabel: 'Scipio starves Numantia; Celtiberia is finished',
    desc: 'Numantia is a hill town of perhaps eight thousand that has humiliated Rome '
      + 'for twenty years — one consular army surrendered entire under the yoke, a '
      + 'treaty the Senate repudiated while returning the consul who signed it to the '
      + 'Numantines, naked and bound, in a gesture they found as baffling as everyone '
      + 'else did. So Rome sends the man who burned Carthage. Scipio Aemilianus does '
      + 'not fight the Numantines; he walls them in with seven camps and a circuit '
      + 'longer than the one he built at Carthage, and waits fifteen months while the '
      + 'town eats its horses, then its leather, then worse. The survivors fire the '
      + 'town over their own heads rather than walk in a triumph. Celtiberia is '
      + 'finished as a fighting nation, and the Roman practice is now legible from '
      + 'any distance: a war Rome cannot win in the field is a war Rome has not yet '
      + 'decided to end by other means.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -133, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Scipio Aemilianus took Numantia by blockade in 133 after fifteen months; the survivors burned the town, and Celtiberia was organized into the Spanish provinces.',
    options: [
      {
        label: 'Seven camps and a wall, and then patience',
        tooltip: 'Numantia passes to Rome where no living court but the Celtiberians holds it, and the town is ruined (−3 development, "The Ashes of Numantia": +2 unrest, −50% tax for 120 months). The Celtiberians −25 legitimacy and "A Finished Nation" (−30% manpower permanently); Rome +10 legitimacy and +15 martial points — the siege becomes the textbook.',
        effects: guard('ev_rw_numantia:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            transfer(ctx, ['Numantia'], 'ROM', 'CTB');
            h.adjust(ctx, 'ROM', { legitimacy: 10, mar: 15 });
          }
          const p = ctx.prov && ctx.prov('Numantia');
          if (p && p.dev) {
            p.dev.tax = Math.max(1, (p.dev.tax || 1) - 2);
            p.dev.prod = Math.max(1, (p.dev.prod || 1) - 1);
          }
          stir(ctx, ['Numantia'], {
            id: 'ashes_of_numantia', name: 'The Ashes of Numantia', months: 120,
            effects: { unrest: 2, taxMult: 0.5 },
          });
          if (alive(ctx, 'CTB')) {
            h.adjust(ctx, 'CTB', { legitimacy: -25 });
            h.addTagModifier(ctx, 'CTB', {
              id: 'a_finished_nation', name: 'A Finished Nation', months: -1,
              effects: { manpowerMult: 0.7 },
            });
          }
          h.setFlag(ctx, 'numantiaFell', true);
          h.chronicle(ctx, 'era', 'Numantia starves for fifteen months and burns itself rather than walk in a triumph; Celtiberia is finished.');
        }),
      },
    ],
  },

  // ── R4 · -133 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_tiberius_gracchus',
    title: 'The Tribune\'s Body in the River',
    worldLabel: 'Tiberius Gracchus is clubbed to death on the Capitol',
    desc: 'The same year Numantia starves, a tribune of the plebs named Tiberius '
      + 'Gracchus proposes to enforce a land law that has been on the books for two '
      + 'centuries — public land, occupied by the great families in defiance of a '
      + 'limit nobody has ever applied, to be distributed to the men who fight Rome\'s '
      + 'wars and come home to nothing. The law is popular, which is the problem. When '
      + 'he stands for a second tribunate to protect it, a crowd of senators and their '
      + 'clients, led by the chief priest of the state, beats him to death on the '
      + 'Capitol with bench legs and throws his body in the Tiber with three hundred '
      + 'of his supporters. No trial, no charge, no precedent — that is the point '
      + 'everyone grasps at once. The Republic has been settling its arguments with '
      + 'procedure for three hundred and sixty years, and it has just discovered a '
      + 'faster way. Every court in the East files the dispatch under the same '
      + 'heading: the Romans have begun killing their own magistrates.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -133, m: 11 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Scipio Nasica led the senators who clubbed Tiberius Gracchus to death on the Capitol in 133; the bodies went into the Tiber by night.',
    options: [
      {
        label: 'The benches are broken up for clubs',
        tooltip: 'Rome −1 stability, −5 legitimacy, and Roma carries "The Broken Taboo" (+2 unrest for 120 months) — the land commission continues its work, but the argument about the Republic is no longer being conducted in words.',
        effects: guard('ev_rw_tiberius_gracchus:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { stability: -1, legitimacy: -5 });
          stir(ctx, ['Roma'], {
            id: 'the_broken_taboo', name: 'The Broken Taboo', months: 120,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'gracchusSlain', true);
          h.chronicle(ctx, 'era', 'Tiberius Gracchus is beaten to death on the Capitol with bench legs; the Republic has found a faster way to settle its arguments.');
        }),
      },
    ],
  },

  // ── R5 · -121 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_gaius_gracchus',
    title: 'The Senate\'s Final Decree',
    worldLabel: 'Gaius Gracchus dies on the Aventine; the ultimate decree is invented',
    desc: 'Twelve years after his brother, Gaius Gracchus — quicker, angrier, and '
      + 'better organized — has rebuilt the popular program into something like a '
      + 'rival government: grain at a fixed price, juries taken from the equestrians, '
      + 'colonies for the landless, citizenship floated for the Italians. When his '
      + 'enemies finally corner him, the Senate does not repeat the improvisation of '
      + '133. It passes a decree instructing the consuls to see that the Republic '
      + 'comes to no harm — a sentence, nothing more, and on the strength of that '
      + 'sentence the consul Opimius brings Cretan archers into the city, kills Gaius '
      + 'and some three thousand of his followers on the Aventine, and then builds a '
      + 'temple to Concord out of the confiscations, which is the joke the city tells '
      + 'for a generation. The instrument matters more than the body count: Rome now '
      + 'has a legal form for suspending its own law, and forms, once invented, get '
      + 'used.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -121, m: 2 },
    world: true,
    aiOption: 0,
    historical: 'The first senatus consultum ultimum was passed against Gaius Gracchus in 121; Opimius killed him and some three thousand followers and built the temple of Concord.',
    options: [
      {
        label: 'See that the Republic comes to no harm',
        tooltip: 'Rome −8 legitimacy and Roma +1 unrest for 60 months ("The Temple of Concord") — order is restored, and the instrument that restored it goes into the drawer where instruments wait.',
        effects: guard('ev_rw_gaius_gracchus:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: -8 });
          stir(ctx, ['Roma'], {
            id: 'temple_of_concord', name: 'The Temple of Concord', months: 60,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'ultimateDecree', true);
          h.chronicle(ctx, 'era', 'The Senate invents the ultimate decree and Opimius uses it: Gaius Gracchus dies on the Aventine, and Concord gets a temple.');
        }),
      },
    ],
  },

  // ── R6 · -105 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_jugurtha',
    title: 'A City for Sale',
    worldLabel: 'Jugurtha is betrayed to Rome; Numidia is divided',
    desc: 'Jugurtha of Numidia has spent a decade proving his own epigram — a city '
      + 'for sale, and doomed the moment it finds a buyer. He bought a partition, '
      + 'bought an acquittal, bought a commission of inquiry sent to investigate the '
      + 'previous purchases, and when summoned to Rome under safe conduct had his '
      + 'rival murdered in the city itself and left remarking on the smell. It took '
      + 'Rome three commanders to stop losing to him: the third, Marius, a new man '
      + 'with no ancestors, raised his army from the head count — men with no land '
      + 'qualification at all, enrolled for the pay and the loot, a detail that will '
      + 'matter more than this whole war — and it ends not in battle but at a parley, '
      + 'where King Bocchus of Mauretania weighs his son-in-law against a Roman '
      + 'alliance and hands Jugurtha to Marius\'s quaestor, a young patrician named '
      + 'Sulla, who has a signet ring cut showing the scene. Jugurtha starves in the '
      + 'Tullianum. Numidia is divided between more reliable kings.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -105, m: 1 },
    world: true,
    aiOption: 0,
    historical: 'Bocchus of Mauretania betrayed Jugurtha to Sulla at a parley in 105; Jugurtha died in the Tullianum and Numidia was divided between client kings.',
    options: [
      {
        label: 'The king is handed over at a parley',
        tooltip: 'Numidia: Gauda is installed — −15 legitimacy, −1 stability, and the kingdom carries "A Divided Inheritance" (−20% manpower for 120 months). Mauretania +50 talents and Roman friendship (+60 opinion of Rome). Rome +8 legitimacy — and Marius\'s head-count army is now a fact with a long future.',
        effects: guard('ev_rw_jugurtha:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'NUM')) {
            h.setRuler(ctx, 'NUM', { name: 'Gauda', title: 'King of Numidia', gov: 1, infl: 2, mar: 1, age: 60 });
            h.adjust(ctx, 'NUM', { legitimacy: -15, stability: -1 });
            h.addTagModifier(ctx, 'NUM', {
              id: 'divided_inheritance', name: 'A Divided Inheritance', months: 120,
              effects: { manpowerMult: 0.8 },
            });
          }
          if (alive(ctx, 'MAU')) {
            h.adjust(ctx, 'MAU', { treasury: 50 });
            setOpinion(ctx, 'MAU', 'ROM', 60);
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: 8 });
          h.setFlag(ctx, 'jugurthaTaken', true);
          h.chronicle(ctx, 'era', 'Bocchus hands Jugurtha to Sulla at a parley; the king starves in the Tullianum, and Numidia is divided between more reliable men.');
        }),
      },
    ],
  },

  // ── R7 · -105 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_arausio',
    title: 'The Worst Day Since Cannae',
    worldLabel: 'The Cimbri destroy two Roman armies at Arausio',
    desc: 'Two wandering nations out of the north — the Cimbri and the Teutones, '
      + 'whole peoples on the move with their wagons and their families, looking for '
      + 'land and beating whatever argues — have been drifting along Rome\'s northern '
      + 'margin for eight years, thrashing an army here and declining to invade Italy '
      + 'there, to general bafflement. At Arausio on the Rhone, Rome finally has them: '
      + 'two full armies, the largest force it has fielded since Hannibal. But the '
      + 'proconsul Caepio — the same family that bought Viriathus\'s murder — will not '
      + 'share a camp with the consul Mallius, a new man beneath his ancestry, and '
      + 'attacks alone rather than let him share a victory. Both armies are destroyed '
      + 'in detail against the river. The figure the tradition keeps is eighty '
      + 'thousand, and even allowing for tradition it is the worst day since Cannae. '
      + 'Italy is open. The road to it is not taken — the Cimbri turn for Spain '
      + 'instead, unhurried, as if Rome were a matter that could keep.',
    forTag: 'both',
    decider: 'CIM',
    date: { y: -105, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Caepio refused to combine camps with Mallius at Arausio on 6 October 105; both armies were destroyed against the Rhone, and the Cimbri turned for Spain.',
    options: [
      {
        label: 'The wagons do not even turn toward Italy',
        tooltip: 'Rome −10,000 manpower, −1 stability and "The Road to Italy Is Open" (−8% morale for 48 months). The Cimbri +15 martial points, +10 legitimacy and "The Wandering Victory" (+10% manpower for 48 months). Massalia +2 unrest for 24 months — the coast can see the wagon fires.',
        effects: guard('ev_rw_arausio:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { manpower: -10000, stability: -1 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'road_to_italy_open', name: 'The Road to Italy Is Open', months: 48,
              effects: { moraleMult: 0.92 },
            });
          }
          if (alive(ctx, 'CIM')) {
            h.adjust(ctx, 'CIM', { mar: 15, legitimacy: 10 });
            h.addTagModifier(ctx, 'CIM', {
              id: 'wandering_victory', name: 'The Wandering Victory', months: 48,
              effects: { manpowerMult: 1.1 },
            });
          }
          stir(ctx, ['Massilia'], {
            id: 'wagon_fires', name: 'The Wagon Fires', months: 24,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'arausio', true);
          h.chronicle(ctx, 'era', 'Two Roman armies are destroyed against the Rhone at Arausio because their commanders would not share a camp; the Cimbri turn, unhurried, for Spain.');
        }),
      },
    ],
  },

  // ── R8 · -101 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_vercellae',
    title: 'The Wandering Peoples End',
    worldLabel: 'Marius destroys the Teutones and Cimbri; the head-count army is vindicated',
    desc: 'Rome\'s answer to Arausio is to break its own constitution quietly: Marius, '
      + 'the new man who ended Jugurtha, is elected consul five years running — '
      + 'illegal, and nobody presses the point — while he rebuilds the army out of '
      + 'the head count and drills it into shape on an aqueduct project. Then the '
      + 'wandering nations finally split their forces and come. Marius takes the '
      + 'Teutones apart at Aquae Sextiae — the tradition says the local vineyards '
      + 'were manured with the dead for a generation — and the next summer, at '
      + 'Vercellae on the Po, the Cimbri are annihilated in the dust of a July '
      + 'noon they chose themselves, having asked for the battle by embassy like a '
      + 'court fixing a wedding. What the dispatches do not dwell on: when it broke, '
      + 'the Cimbri women killed their children and themselves in the wagon-fort '
      + 'rather than be sold. The threat is over. The other thing is permanent — '
      + 'Rome\'s armies are now professional, landless, and loyal to the man who '
      + 'promises them a farm on discharge. Every ambitious Roman for the next '
      + 'seventy years has understood the arithmetic before the funeral games are '
      + 'over.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -101, m: 7 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Marius destroyed the Teutones at Aquae Sextiae in 102 and the Cimbri at Vercellae in July 101, as consul five times in succession; the professional army was his instrument and his legacy.',
    options: [
      {
        label: 'The farms are promised on discharge',
        tooltip: 'The Cimbri −25 legitimacy and "The End of the Wandering" (−50% manpower permanently) — the nation that survives in Jutland is a remnant. Rome +15 legitimacy, +1 stability, and "The Head-Count Army" permanently (+10% manpower, +3% discipline): the legions are professionals now, and they belong to whoever pays the discharge bonus.',
        effects: guard('ev_rw_vercellae:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'CIM')) {
            h.adjust(ctx, 'CIM', { legitimacy: -25 });
            h.addTagModifier(ctx, 'CIM', {
              id: 'end_of_wandering', name: 'The End of the Wandering', months: -1,
              effects: { manpowerMult: 0.5 },
            });
          }
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: 15, stability: 1 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'head_count_army', name: 'The Head-Count Army', months: -1,
              effects: { manpowerMult: 1.1, disciplineMult: 1.03 },
            });
          }
          h.setFlag(ctx, 'mariusReforms', true);
          h.chronicle(ctx, 'era', 'Aquae Sextiae and Vercellae end the wandering nations; Rome\'s army is professional now, and it belongs to whoever promises the farm.');
        }),
      },
    ],
  },

  // ── R9 · -91 ──────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_social_war',
    title: 'Italy Declares War on Rome',
    worldLabel: 'The Italian allies rise; the Social War begins',
    desc: 'The Italian allies have supplied half of every Roman army for two '
      + 'centuries — at Arausio they died in the same proportion — and are citizens '
      + 'of nothing. When the one tribune willing to enfranchise them is murdered at '
      + 'his own door, the allies stop petitioning. Eight peoples raise a '
      + 'confederacy with its own senate and its own coinage — an Italian bull '
      + 'goring a Roman wolf — and set their capital at a town renamed Italica. It '
      + 'is the most dangerous war Rome has fought since Hannibal, against armies '
      + 'trained in its own camps by its own methods, and Rome wins it in the only '
      + 'way it can be won: by conceding the demand in the second year and fighting '
      + 'on against men who now have nothing left to secede for. Within a decade '
      + 'everyone from the Po to the strait is Roman, the word means something it '
      + 'has never meant before, and the census rolls have roughly trebled — a '
      + 'thing every foreign court should sit with for a moment: Rome has just '
      + 'converted a mutiny into manpower.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -91, m: 11 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The allies rose in 91 after Drusus\'s murder; Rome conceded citizenship by stages from 90 and won the war against the holdouts. The peninsula was enfranchised within a decade.',
    options: [
      {
        label: 'Win the war by conceding the demand',
        tooltip: 'Italy goes onto the map as a confederacy with its own senate, its own coinage and its own capital, at war with Rome until the enrollment of 88. Rome −1 stability, −6,000 manpower, and "The War of the Allies" (−15% income and manpower for 48 months); Roma, Capua and Brundisium +2 unrest for 36 months. The settlement — and what it pays forever — comes when the war ends.',
        effects: guard('ev_rw_social_war:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { stability: -1, manpower: -6000 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'war_of_the_allies', name: 'The War of the Allies', months: 48,
              effects: { incomeMult: 0.85, manpowerMult: 0.85 },
            });
          }
          stir(ctx, ['Roma', 'Capua', 'Brundisium'], {
            id: 'italia_rises', name: 'The Bull and the Wolf', months: 36,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'socialWar', true);
          // Eight peoples, one senate, one coinage and a capital renamed
          // Italica (SPEC §251). "The most dangerous war Rome has fought
          // since Hannibal" is a country on the map for three years, not a
          // modifier on the country it is fighting.
          const italia = raiseItalia(ctx);
          h.chronicle(ctx, 'era', 'Italy rises under its own senate and its own coin'
            + (italia ? ': the bull gores the wolf from Picenum to Bruttium, and Rome must beat armies it trained itself.' : '; Rome wins by conceding the demand, and the census rolls treble.'));
        }),
      },
    ],
  },

  // ── R9b · -88 ─────────────────────────────────────────────────────────────
  // The other half of the pair (§251): a card that raises a country has to
  // have a card that puts it out. Rome wins this war the only way it can be
  // won, which is by conceding what it is about — and the concession is what
  // pays, for ever, which is why the permanent modifier lives here and not on
  // the rising.
  {
    id: 'ev_rw_italia_enrolled',
    title: 'The Enrollment',
    worldLabel: 'Italy is enfranchised; the confederacy dissolves into the census',
    desc: 'Rome fights the second year of the war with a law in one hand: citizenship '
      + 'for every ally that has not revolted, then for every ally that lays down its '
      + 'arms, then — by a tribune\'s bill nobody troubles to oppose — for the '
      + 'peninsula. The confederacy at Italica has nothing left to secede for, and its '
      + 'armies, which are Roman armies in everything but the oath, go home to be '
      + 'enrolled in tribes deliberately too few to matter. The holdouts in Samnium '
      + 'fight on for their own reasons and are destroyed for them. Within a decade '
      + 'everyone from the Po to the strait is Roman, the word means something it has '
      + 'never meant before, and the census rolls have roughly trebled: a thing every '
      + 'foreign court should sit with for a moment, because Rome has just converted a '
      + 'mutiny into manpower.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -88, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    when: (ctx) => !!ctx.helpers.getFlag(ctx, 'socialWar'),
    historical: 'The lex Julia of 90 and the lex Plautia Papiria of 89 enfranchised the allies by stages; the last Samnite holdouts were reduced by 88.',
    options: [
      {
        label: 'Enroll them in tribes too few to matter',
        tooltip: 'The confederacy folds back into Rome — ground, armies and treasury — and the war ends. Rome takes "The Enfranchised Peninsula" (+5% income, +8% manpower, permanently) and +5 legitimacy.',
        effects: guard('ev_rw_italia_enrolled:0', (ctx) => {
          const h = ctx.helpers;
          settleAgainstRome(ctx, 'Italy is enrolled: the confederacy at Italica dissolves into the '
            + 'census that beat it, and the word Roman means something it never meant before.', false);
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: 5 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'enfranchised_peninsula', name: 'The Enfranchised Peninsula', months: -1,
              effects: { incomeMult: 1.05, manpowerMult: 1.08 },
            });
          }
          h.setFlag(ctx, 'socialWar', false);
        }),
      },
      {
        label: 'Enroll them, and make the Samnites an example',
        tooltip: 'The same reunion and the same permanent settlement, taken by storm rather than by law: Rome −4,000 manpower and +1 stability, and Capua and Tarentum carry "The Samnite Reckoning" (+3 unrest for 36 months).',
        effects: guard('ev_rw_italia_enrolled:1', (ctx) => {
          const h = ctx.helpers;
          settleAgainstRome(ctx, 'The enrollment is voted and Samnium is reduced anyway; the '
            + 'confederacy ends in a census and a punitive march.', false);
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { manpower: -4000, stability: 1 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'enfranchised_peninsula', name: 'The Enfranchised Peninsula', months: -1,
              effects: { incomeMult: 1.05, manpowerMult: 1.08 },
            });
          }
          stir(ctx, ['Capua', 'Tarentum'], {
            id: 'samnite_reckoning', name: 'The Samnite Reckoning', months: 36,
            effects: { unrest: 3 },
          });
          h.setFlag(ctx, 'socialWar', false);
        }),
      },
    ],
  },

  // ── R10 · -88 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_sulla_marches',
    title: 'The Consul Marches on the City',
    worldLabel: 'Sulla turns his legions on Rome itself',
    desc: 'The command against Mithridates — the richest command in the world, with '
      + 'the massacre of the eighty thousand Italians still unavenged — is voted to '
      + 'Sulla, then transferred to old Marius by a tribune\'s law and a street vote. '
      + 'Sulla goes to his army at Nola, puts the question to the soldiers rather '
      + 'than the officers — the officers refuse almost to a man, the soldiers, '
      + 'head-count men who go east with Sulla or go home poor, do not — and marches '
      + 'six legions up the Via Appia into the city no army has entered in living '
      + 'memory. He takes it in an afternoon of street fighting, kills or exiles the '
      + 'tribune and his circle, posts the first hostile soldiers the Forum has ever '
      + 'seen, and then departs for the East as though the constitution were a door '
      + 'he had closed behind him. It does not close. Every army on every frontier '
      + 'now knows the road exists, and that it is an afternoon long.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -88, m: 11 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Sulla marched on Rome in 88 when the Mithridatic command was transferred to Marius; his officers refused, his soldiers did not, and the precedent outlived everyone involved.',
    options: [
      {
        label: 'Put the question to the soldiers, not the officers',
        tooltip: 'Rome −15 legitimacy, −1 stability, and Roma +3 unrest for 60 months ("The Road Exists") — the Mithridatic command is settled, and something that cannot be unsettled has been demonstrated to every army Rome owns.',
        effects: guard('ev_rw_sulla_marches:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: -15, stability: -1 });
          stir(ctx, ['Roma'], {
            id: 'the_road_exists', name: 'The Road Exists', months: 60,
            effects: { unrest: 3 },
          });
          h.setFlag(ctx, 'sullaMarched', true);
          h.chronicle(ctx, 'era', 'A consul of Rome marches six legions into Rome and takes it in an afternoon; every army on every frontier files the distance.');
        }),
      },
    ],
  },

  // ── R10b · -83 ────────────────────────────────────────────────────────────
  // The road demonstrated in 88 is used in 83, and this time nobody leaves for
  // the East afterwards. §251: the card that raises the claim, so that the
  // proscriptions have a war to be the end of.
  {
    id: 'ev_rw_sulla_returns',
    title: 'Five Legions at Brundisium',
    worldLabel: 'Sulla lands in Italy; the civil war for Rome begins',
    desc: 'Sulla finishes with Mithridates on terms the Senate never authorized, sells '
      + 'Asia a fine it will take a generation to pay, and lands at Brundisium with '
      + 'five legions, two thousand talents and no legal standing of any kind. The '
      + 'government at Rome — Marian, consular, and perfectly lawful — raises armies '
      + 'that outnumber him two to one and watches them change sides on the march, '
      + 'because his are the men who have been paid and theirs are the men who have '
      + 'been promised. Young Pompey brings three legions of his own raising, which is '
      + 'not a thing a private citizen is allowed to have, and is thanked for it. For '
      + 'eighteen months Italy has two governments, and the one with no office wins.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -83, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Sulla landed at Brundisium in the spring of 83 with five legions; the war ran through Italy for eighteen months and ended at the Colline Gate in November 82.',
    options: [
      {
        label: 'The men who have been paid against the men who have been promised',
        tooltip: 'Southern Italy goes over to the proconsul: a second Roman government on the map, at war with Rome until the Colline Gate. Rome −1 stability and −20 legitimacy; Roma +2 unrest for 24 months.',
        effects: guard('ev_rw_sulla_returns:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { stability: -1, legitimacy: -20 });
          stir(ctx, ['Roma'], {
            id: 'two_governments', name: 'Two Governments in Italy', months: 24,
            effects: { unrest: 2 },
          });
          const sulla = raiseSulla(ctx);
          h.setFlag(ctx, 'sullaLanded', !!sulla);
          h.chronicle(ctx, 'era', 'Sulla lands at Brundisium with five legions and no office'
            + (sulla ? '; for eighteen months Italy has two governments.' : ', and the consuls raise armies that keep changing sides.'));
        }),
      },
    ],
  },

  // ── R11 · -82 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_proscriptions',
    title: 'The Lists Are Posted',
    worldLabel: 'Sulla is dictator; the proscription lists go up in the Forum',
    desc: 'Sulla comes back from the East with a veteran army, wins the civil war at '
      + 'the Colline Gate under the walls of Rome, and has himself appointed '
      + 'dictator for the reconstitution of the Republic — an office extinct for a '
      + 'century, revived with no term limit. Then the lists go up in the Forum: '
      + 'names, published on white boards, of men who may be killed by anyone, their '
      + 'property forfeit to the state and a bounty to the killer, their sons and '
      + 'grandsons barred from office. The lists grow by revision, and men check '
      + 'them daily the way they check the weather; more than one name is added '
      + 'after the death, to regularize the paperwork, and more than one is added '
      + 'for the property alone. Perhaps a couple of thousand die, including a '
      + 'quarter of the Senate. Sulla restores the constitution he believes in, '
      + 'resigns, and dies in bed — proving, one senator observes, only that he was '
      + 'lucky, which was always the man\'s own favourite epithet. The furniture of '
      + 'the Republic is put back. The knowledge of what it costs to move it is not.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -82, m: 11 },
    world: true,
    aiOption: 0,
    historical: 'Sulla won at the Colline Gate in November 82, took the revived dictatorship, and proscribed perhaps two thousand men including a quarter of the Senate; he resigned in 79 and died in his bed.',
    options: [
      {
        label: 'White boards, names, and a bounty',
        tooltip: 'The Colline Gate ends the war and the proconsul\'s Italy comes back under one banner — as the winner, with the dictatorship written afterwards. Rome +300 talents of confiscations, +1 stability and −12 legitimacy; Roma +2 unrest for 60 months ("Checking the Lists"). Order of a kind is restored — the kind you check every morning.',
        effects: guard('ev_rw_proscriptions:0', (ctx) => {
          const h = ctx.helpers;
          // The army that marched on Rome did not lose; it became the
          // government and then legislated about what it had done (§251).
          settleAgainstRome(ctx, 'The Colline Gate is fought under the walls and the proconsul\'s '
            + 'party is the government: Italy is one country again, with lists in the Forum.', true);
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: 300, stability: 1, legitimacy: -12 });
          stir(ctx, ['Roma'], {
            id: 'checking_the_lists', name: 'Checking the Lists', months: 60,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'proscriptions', true);
          h.chronicle(ctx, 'era', 'Sulla\'s proscription lists go up in the Forum, revised daily; the Republic\'s furniture is put back by a man who has priced what it costs to move.');
        }),
      },
    ],
  },

  // ── R12 · -74 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_bithynia_will',
    title: 'A Second Kingdom by Testament',
    worldLabel: 'Nicomedes wills Bithynia to Rome; Mithridates moves',
    desc: 'Nicomedes of Bithynia dies without an heir and leaves his kingdom to the '
      + 'Roman people, exactly as Attalus left Pergamon sixty years ago — the '
      + 'precedent has become an institution, and eastern kings now draft their '
      + 'testaments knowing Rome reads them first. For Mithridates of Pontus, who has '
      + 'already fought Rome once and killed its civilians by the tens of thousands, '
      + 'a Roman province on the Bosporus is the closing of a door: he invades '
      + 'Bithynia within the year, and the third war begins — the one that will not '
      + 'stop, that will consume Lucullus and elevate Pompey, and that will end with '
      + 'Roman soldiers standing in Jerusalem. None of the men signing documents '
      + 'this winter knows that last part. The kings of the East know the general '
      + 'shape, though: the Republic that arrived as an arbiter has begun inheriting '
      + 'the estates it arbitrates.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -74, m: 1 },
    world: true,
    aiOption: 0,
    historical: 'Nicomedes IV bequeathed Bithynia to Rome in 74; Mithridates VI invaded within the year, opening the Third Mithridatic War that ended with Pompey in the East.',
    options: [
      {
        label: 'The Senate accepts another estate',
        tooltip: 'Rome +100 talents of Bithynian revenue. Pontus: Mithridates VI Eupator is confirmed on his throne with +15 martial points and −100 opinion of Rome — the king who has been preparing for this war since he was a boy finally gets it.',
        effects: guard('ev_rw_bithynia_will:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: 100 });
          if (alive(ctx, 'PNT')) {
            h.setRuler(ctx, 'PNT', { name: 'Mithridates VI Eupator', title: 'King of Kings of Pontus', gov: 3, infl: 4, mar: 4, age: 60 });
            h.adjust(ctx, 'PNT', { mar: 15 });
            setOpinion(ctx, 'PNT', 'ROM', -100);
          }
          h.setFlag(ctx, 'bithyniaBequest', true);
          h.chronicle(ctx, 'era', 'Bithynia is left to Rome by testament, as Pergamon was; Mithridates reads the will as a declaration of war, which by now it is.');
        }),
      },
    ],
  },

  // ── R13 · -73 ─────────────────────────────────────────────────────────────
  {
    id: 'ev_rw_spartacus',
    title: 'The School at Capua Opens Its Doors',
    worldLabel: 'Spartacus rises; the slave war burns through Italy',
    desc: 'Seventy-eight gladiators break out of a training school at Capua with '
      + 'kitchen knives and spits, take the road to Vesuvius, and abseil down the '
      + 'far crater on vine ropes to destroy the militia sent to starve them out. '
      + 'By the second year the man leading them — Spartacus, a Thracian who once '
      + 'served in a Roman auxiliary — commands something the sources refuse to '
      + 'count honestly: seventy thousand, ninety, more, the unfree of the richest '
      + 'slave economy on earth walking off its estates. He beats both consuls in '
      + 'one season and marches the length of Italy twice. Rome, its best armies in '
      + 'Spain and the East, hands the war to Crassus, the richest man in the city, '
      + 'who revives decimation for his own legions and pens the rising against the '
      + 'toe of Italy. It ends the way it was always going to: six thousand '
      + 'crucified along the Appian Way from Capua to Rome, one every forty paces, '
      + 'left standing for years. The dispatches east are studied in every court '
      + 'that runs on estate labour, which is all of them.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -73, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The rising broke out of Capua in 73 and beat both consuls in 72; Crassus penned and destroyed it in 71, and six thousand prisoners were crucified along the Appian Way.',
    options: [
      {
        label: 'One cross every forty paces',
        tooltip: 'Rome −4,000 manpower, −100 talents, and Capua, Roma, Brundisium and Rhegium carry "The Slave War" (+3 unrest, −20% tax for 36 months). The war ends as it was always going to end, and the Appian Way is lined with the proof.',
        effects: guard('ev_rw_spartacus:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { manpower: -4000, treasury: -100 });
          stir(ctx, ['Capua', 'Roma', 'Brundisium', 'Rhegium'], {
            id: 'the_slave_war', name: 'The Slave War', months: 36,
            effects: { unrest: 3, taxMult: 0.8 },
          });
          h.setFlag(ctx, 'spartacusRose', true);
          h.chronicle(ctx, 'era', 'The gladiators break out of Capua with kitchen knives; three years later the Appian Way is lined with crosses from Capua to Rome.');
        }),
      },
    ],
  },
];
