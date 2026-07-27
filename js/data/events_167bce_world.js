// Judaea Universalis — the world outside the revolt, 160–64 BCE (SPEC §111).
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_167 by the era registry. BCE years are
// negative.
//
// Two holes, both found the same way — by playing a Judaea that wins.
//
// FIRST: the dynasty could skip a generation. `ev_elasa` is deliberately
// merciful — it will not march a dominant Judah to his death by the calendar,
// which is the right instinct — but nothing else ever removed him either, and
// the later dynastic cards are DATED and install their man over whoever is
// sitting there. So a successful campaign produced Judah Maccabee ruling from
// 166 to 136, aged twenty-six to fifty-six, and then John Hyrcanus succeeding
// him directly: two brothers and a nephew skipped, and the Maccabee dying
// somewhere off-screen without a line of chronicle. `ev_w_generation_passes`
// closes it: the men of the revolt are mortal on their own account, and the
// house passes down the sequence 1 Maccabees actually gives it, whether or not
// the wars went the way the book says.
//
// SECOND: this chapter had ZERO world events. Not few — none. Rome appears in
// it three times, all of them as a diplomatic courtesy to Judaea in the 160s
// and 140s, and then the Republic that is in the middle of conquering the
// entire Mediterranean sits on eleven provinces in Italy for a hundred years
// while the player is busy. The Seleucid empire the chapter is about dies in
// 83 BCE and nothing says so. This file is that century: Carthage and Corinth
// in one year, Parthia taking Babylonia, Attalus's will, the Asiatic Vespers,
// Tigranes taking Antioch, and Pompey arriving to organize the East — which is
// the exact hinge the 67 BCE chapter opens on.
//
// A note on the second half, learned the expensive way. The first draft of the
// Tigranes card gave Armenia every province the Seleucids still held, which
// produced a fifty-six-province Armenian empire — a balance anomaly invented by
// the file written to remove one. The empire was eaten in two bites that do not
// overlap, and BOTH have to be on the calendar or whichever one is present
// swallows the other's share.
//
// Source spine: Polybius; 1 Maccabees 8–16 for the Roman correspondence;
// Valerius Maximus I.3.3 for the expulsion of 139; Justin XLI and the Babylonian
// astronomical diaries for Mithridates I in Seleucia; Appian, Mithridatica;
// Justin XL for Tigranes in Syria; Josephus, Antiquitates XIII–XIV.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_167bce_world] ' + key, e || '');
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

function dateGE(ctx, y, m) {
  const d = ctx.game.date;
  return d.y > y || (d.y === y && d.m >= m);
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

function stir(ctx, names, mod) {
  for (const n of names) ctx.helpers.addProvinceModifier(ctx, n, mod);
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[b] = Math.max(-200, Math.min(200, val));
}

// The Jewish crown, whatever it is calling itself this decade.
function crown(ctx) {
  if (alive(ctx, 'HAS')) return 'HAS';
  if (alive(ctx, 'MLI')) return 'MLI';
  return null;
}
function rulerName(ctx) {
  const me = crown(ctx);
  const t = me && ctx.game.tags[me];
  return (t && t.ruler && t.ruler.name) || '';
}
function provsOf(ctx, tag) {
  const g = ctx.game;
  let n = 0;
  for (let i = 1; i < g.provinces.length; i++) {
    const p = g.provinces[i];
    if (p && !p.impassable && p.owner === tag) n++;
  }
  return n;
}
// A Judaea that has plainly outgrown the revolt it started as.
function greatJudaea(ctx) {
  const me = crown(ctx);
  return !!me && provsOf(ctx, me) >= 14;
}

// The house of Mattathias, in the order 1 Maccabees gives it, with the year by
// which each man is overdue if the wars have spared him. A ruler who is still
// in the seat past his year is not immortal; he is simply a man the script
// forgot to bury.
const HOUSE = [
  {
    name: 'Judah Maccabee', by: -152,
    next: { name: 'Jonathan Apphus', title: 'Captain of Israel', gov: 2, infl: 4, mar: 4, age: 34 },
    heir: { name: 'Simon Thassi', gov: 4, infl: 3, mar: 3, age: 36 },
    flags: ['judahFallen'],
    text: 'Judah Maccabee dies full of years, in his own bed, which is not how any '
      + 'chronicle expected to end his story. Jonathan his brother takes up the sword '
      + 'and the command of Israel.',
  },
  {
    name: 'Jonathan Apphus', by: -140,
    next: { name: 'Simon Thassi', title: 'High Priest and Leader', gov: 4, infl: 3, mar: 3, age: 52 },
    heir: { name: 'John Hyrcanus', gov: 4, infl: 3, mar: 4, age: 26 },
    flags: ['jonathanGone'],
    text: 'Jonathan Apphus dies after a long command, and his brother Simon — the last '
      + 'of the five sons of Mattathias — takes the high priesthood and the government.',
  },
  {
    name: 'Simon Thassi', by: -128,
    next: { name: 'John Hyrcanus', title: 'High Priest', gov: 4, infl: 3, mar: 4, age: 32 },
    heir: { name: 'Aristobulus', gov: 2, infl: 2, mar: 3, age: 14 },
    flags: ['simonGone'],
    text: 'Simon Thassi, the last of the brothers, dies, and John Hyrcanus his son '
      + 'takes the high priesthood — the first of the house to inherit rather than earn it.',
  },
];

// The Seleucid empire does not fall over; it is dismembered in two bites, and
// the century has to show both or one of the eaters ends up with everything.
// EAST of the Euphrates went to Parthia under Mithridates I in the 140s and
// never came back. WEST of it went to Tigranes in 83 and came back off him,
// to Rome, nineteen years later. These are the two lists, by name, because a
// latitude cut would be an approximation pretending to be a border.
const PARTHIAN_EAST = [
  'Dura-Europos', 'Nisibis', 'Singara', 'Hatra', 'Assur', 'Arbela', 'Nehardea',
  'Babylon', 'Seleucia-Ctesiphon', 'Charax', 'Susa', 'Ecbatana', 'Gerrha',
  'Gabae', 'Hyrcania', 'Persepolis',
];
// Tigranes' Syria: the kingdom the cities of Antioch actually offered him,
// Cilicia and Commagene included, and nothing south of the Lebanon.
const TIGRANES_SYRIA = [
  'Antioch', 'Seleucia Pieria', 'Laodicea', 'Apamea', 'Emesa', 'Beroea',
  'Cyrrhus', 'Zeugma', 'Samosata', 'Melitene', 'Edessa', 'Carrhae', 'Palmyra',
  'Damascus', 'Chalcis', 'Aradus', 'Tripolis', 'Byblos', 'Berytus', 'Sidon',
  'Tyre', 'Tarsus', 'Seleucia Trachea', 'Caesarea Mazaca',
];
// Pompey's province of Syria, plus Cilicia: what Rome kept in 64. Commagene
// and the Cappadocian marches stayed client kingdoms and are deliberately
// absent, and so is everything across the Euphrates.
const POMPEY_SYRIA = [
  'Antioch', 'Seleucia Pieria', 'Laodicea', 'Apamea', 'Emesa', 'Beroea',
  'Cyrrhus', 'Zeugma', 'Damascus', 'Chalcis', 'Aradus', 'Tripolis', 'Byblos',
  'Berytus', 'Sidon', 'Tyre', 'Tarsus', 'Seleucia Trachea',
];

// Hand a named list over, but never take a province off a living court that is
// not one of the two dying ones — a world card should rearrange the empires
// history rearranged, not confiscate the player's conquests.
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
    if (p.owner === to) continue;
    ctx.helpers.changeOwner(ctx, p.canon || p.name, to);
    n++;
  }
  return n;
}

// Both branches of the succession card bury the same man and seat the same
// successor — the house's order is not up for negotiation in the sources. What
// the player chooses is how it is done, and what that costs.
function succeed(ctx, legit) {
  const h = ctx.helpers;
  const me = crown(ctx);
  if (!me) return null;
  const step = HOUSE.find((x) => x.name === rulerName(ctx));
  if (!step) return null;
  h.killGeneral(ctx, me, step.name);
  h.setRuler(ctx, me, { ...step.next });
  if (step.heir) h.setHeir(ctx, me, { ...step.heir });
  h.adjust(ctx, me, { legitimacy: legit });
  for (const f of step.flags) h.setFlag(ctx, f, true);
  h.chronicle(ctx, 'ruler', step.text);
  h.notify(ctx, {
    title: step.name + ' is gathered to his fathers',
    text: step.text, type: 'info',
  });
  return step;
}

export const EVENTS_167_WORLD = [

  // ═══ THE HOUSE IS MORTAL ═════════════════════════════════════════════════

  {
    id: 'ev_w_generation_passes',
    title: 'The Generation Passes',
    desc: 'The men who came down out of the Gophna caves are not young any more. '
      + 'Whatever the wars did or failed to do to them, the years are their own '
      + 'argument, and the house of Mattathias has a settled order of succession that '
      + 'does not depend on which battles were lost. The command passes to the next '
      + 'brother, and the chronicle records it the way it records everything else about '
      + 'this family: briefly, and with a note of who is now expected to die for it.',
    forTag: 'HAS',
    once: false,
    cooldownMonths: 24,
    minYear: -152,
    maxYear: -110,
    trigger: safeTrigger('ev_w_generation_passes', (ctx) => {
      const me = crown(ctx);
      if (!me) return false;
      const who = rulerName(ctx);
      const step = HOUSE.find((h) => h.name === who);
      return !!step && dateGE(ctx, step.by, 1);
    }),
    major: true,
    aiOption: 0,
    historical: 'Jonathan and Simon each took up the command in the field on their brother\'s death; only Simon was afterwards confirmed by a great assembly, in 140.',
    options: [
      {
        label: 'The next brother takes up the command',
        tooltip: 'The house buries its own and the next man in the order of Mattathias succeeds by right of blood, in the field, without waiting on anyone. No interruption to the war; −5 legitimacy for a succession nobody was asked about, and the priesthood is not consulted (−15 Hasidean favour).',
        effects: guard('ev_w_generation_passes:0', (ctx) => {
          const h = ctx.helpers;
          const step = succeed(ctx, -5);
          if (!step) return;
          h.factionShift(ctx, crown(ctx), 'hasideans', -15);
        }),
      },
      {
        label: 'Let the great assembly at Jerusalem confirm him',
        tooltip: 'As the assembly of 140 confirmed Simon: priests, people and elders in one court, and a bronze tablet on Mount Zion to say so. Costs 40 talents and a year of slack in the field (−15% manpower, −8% morale for 12 months), but the successor rules by the nation’s own act: +12 legitimacy, +1 stability, +20 Hasidean favour, +1 authority.',
        effects: guard('ev_w_generation_passes:1', (ctx) => {
          const h = ctx.helpers;
          const step = succeed(ctx, 12);
          if (!step) return;
          const me = crown(ctx);
          h.adjust(ctx, me, { treasury: -40, stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'assembly_of_the_people', name: 'The Great Assembly', months: 12,
            effects: { manpowerMult: 0.85, moraleMult: 0.92 },
          });
          h.factionShift(ctx, me, 'hasideans', 20);
          h.doctrine(ctx, 'authority', 1);
          h.chronicle(ctx, 'ruler',
            'The priests and the people and the elders of the land confirmed the '
            + 'succession in a great assembly, and wrote it on tablets of brass, and set '
            + 'them upon pillars in Mount Zion.');
        }),
      },
    ],
  },

  // ═══ ROME AND THE WORLD, 146–64 ══════════════════════════════════════════

  {
    id: 'ev_w_carthage_corinth',
    title: 'Two Cities in One Year',
    worldLabel: 'Rome destroys Carthage and Corinth',
    desc: 'In one season the Republic burns the two cities that were the other '
      + 'possible answers to the question of who runs the Mediterranean. Carthage is '
      + 'razed after a three-year siege and a week of street fighting; Corinth is '
      + 'sacked, its men killed, its women and children sold, and its art shipped to '
      + 'Italy by a general who — Polybius says he watched this — had his soldiers '
      + 'play dice on the paintings. Neither city was a threat. That is rather the '
      + 'point: Rome has stopped destroying rivals and started destroying examples, '
      + 'and every court from Antioch to Alexandria reads the lesson correctly and '
      + 'begins behaving accordingly.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -146, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Delenda est',
        tooltip: 'Rome: +400 talents of plunder, +15 legitimacy, +1 stability, and "The Lesson of the Two Cities" (+8% income permanently). Corinth is ruined (−4 development, +3 unrest for 120 months). Every eastern court cools 20 toward Rome and learns to answer its letters the same week they arrive.',
        effects: guard('ev_w_carthage_corinth:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { treasury: 400, legitimacy: 15, stability: 1 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'lesson_of_two_cities', name: 'The Lesson of the Two Cities', months: -1,
              effects: { incomeMult: 1.08 },
            });
          }
          const c = ctx.prov && ctx.prov('Corinth');
          if (c && c.dev) {
            c.dev.tax = Math.max(1, (c.dev.tax || 1) - 2);
            c.dev.prod = Math.max(1, (c.dev.prod || 1) - 2);
          }
          stir(ctx, ['Corinth'], {
            id: 'the_sack_of_corinth', name: 'The Sack of Corinth', months: 120,
            effects: { unrest: 3, taxMult: 0.5 },
          });
          for (const t of ['SEL', 'PTO', 'PAR', 'ARM', 'NAB']) {
            if (alive(ctx, t)) {
              const tt = g.tags[t];
              if (tt && tt.opinion) tt.opinion.ROM = Math.max(-200, (tt.opinion.ROM || 0) - 20);
            }
          }
          h.setFlag(ctx, 'twoCities', true);
          h.chronicle(ctx, 'era', 'Carthage and Corinth are destroyed in the same year; Rome has stopped killing rivals and started killing examples.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_expelled_from_rome',
    title: 'Sent Home for Corrupting the Romans',
    worldLabel: 'The Jews are expelled from the city of Rome',
    desc: 'The praetor Cornelius Hispalus expels the Jews of the city — the charge, as '
      + 'Valerius Maximus records it, is that they had attempted to infect Roman morals '
      + 'with the worship of Jupiter Sabazius, which is a misunderstanding so complete '
      + 'that it is almost affectionate. It is the first expulsion in the long series, '
      + 'and it happens in the same decade the Senate is exchanging warm letters with '
      + 'Jerusalem about a treaty of friendship. Both things are true at once and '
      + 'neither is a secret: Rome will ally with a Jewish state abroad and move a '
      + 'Jewish community out of its own city in the same year, and see no tension in '
      + 'it whatsoever.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -139, m: 9 },
    world: true,
    aiOption: 0,
    options: [
      {
        label: 'The praetor issues the edict',
        tooltip: 'Rome +20 talents of confiscation; Roma +1 unrest for 60 months. A Jewish crown that has a treaty with Rome loses 5 legitimacy explaining it, and the Hasideans −10 — the alliance abroad is not what the letter home said it was.',
        effects: guard('ev_w_expelled_from_rome:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { treasury: 20 });
          stir(ctx, ['Roma'], {
            id: 'the_expulsion_139', name: 'The Expulsion', months: 60,
            effects: { unrest: 1 },
          });
          if (me && flag(ctx, 'romanTreaty')) {
            h.adjust(ctx, me, { legitimacy: -5 });
            h.factionShift(ctx, me, 'hasideans', -10);
          }
          h.setFlag(ctx, 'expelledFromRome', true);
          h.chronicle(ctx, 'era', 'The praetor expels the Jews from the city of Rome for corrupting Roman morals; the Senate goes on writing warm letters to Jerusalem.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_parthia_takes_babylon',
    title: 'The Empire Loses Its Other Half',
    worldLabel: 'Mithridates I of Parthia enters Seleucia',
    desc: 'While the kings in Antioch are murdering each other over Syria, Mithridates '
      + 'of Parthia walks into Media, and then into Seleucia on the Tigris, and the '
      + 'Seleucid empire quietly stops being an empire of the East at all. Demetrius '
      + 'marches out to take it back with the Greek cities of Babylonia cheering him on, '
      + 'is beaten, and spends ten years as a prisoner married to a Parthian princess. '
      + 'Everything the house of Seleucus had beyond the Euphrates — the mint at '
      + 'Seleucia, the revenue of Babylonia, the road to India — is gone in a decade, '
      + 'and what is left is a Syrian kingdom that still writes to the world as though '
      + 'it were an empire. The wars in Judaea look different from Ctesiphon: they are '
      + 'not a rebellion in a province, they are one more thing the dying court cannot '
      + 'attend to.',
    forTag: 'both',
    decider: 'PAR',
    date: { y: -141, m: 7 },
    world: true,
    major: true,
    when: safeTrigger('ev_w_parthia_takes_babylon:when', (ctx) => alive(ctx, 'PAR')),
    aiOption: 0,
    historical: 'Mithridates I took Seleucia in 141; Demetrius II was captured in 139 and never recovered the East.',
    options: [
      {
        label: 'The Arsacid takes the Tigris',
        tooltip: 'Every Seleucid province east of the Euphrates passes to Parthia: Parthia +15 legitimacy, +2 stability, +300 talents and "The Revenue of Babylonia" (+20% income permanently). The Seleucid court loses 25 legitimacy, 2 stability and a third of what it was; what remains of it is a Syrian kingdom, and everyone in Syria now knows it.',
        effects: guard('ev_w_parthia_takes_babylon:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'PAR')) return;
          const took = transfer(ctx, PARTHIAN_EAST, 'PAR', 'SEL');
          h.adjust(ctx, 'PAR', { legitimacy: 15, stability: 2, treasury: 300, mar: 15 });
          h.addTagModifier(ctx, 'PAR', {
            id: 'revenue_of_babylonia', name: 'The Revenue of Babylonia', months: -1,
            effects: { incomeMult: 1.2 },
          });
          if (alive(ctx, 'SEL')) {
            h.adjust(ctx, 'SEL', { legitimacy: -25, stability: -2 });
            h.addTagModifier(ctx, 'SEL', {
              id: 'a_syrian_kingdom', name: 'A Syrian Kingdom', months: -1,
              effects: { incomeMult: 0.75, manpowerMult: 0.7 },
            });
          }
          h.setFlag(ctx, 'parthiaTakesBabylon', true);
          h.chronicle(ctx, 'era', 'Mithridates I enters Seleucia on the Tigris; the Seleucid empire loses everything beyond the Euphrates (' + took + ' provinces) and becomes a Syrian kingdom.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_attalid_will',
    title: 'A Kingdom Left by Will',
    worldLabel: 'Attalus III bequeaths Pergamon to Rome',
    desc: 'The last king of Pergamon dies without an heir and leaves his kingdom — the '
      + 'richest state in Asia, with its library and its parchment and its silver — to '
      + 'the Roman people in his testament. Nobody has ever done this before. Rome '
      + 'spends four years putting down a pretender who thinks a kingdom should go to a '
      + 'king, and then organizes the whole of western Asia Minor as a province, which '
      + 'is the first Roman territory in the East that was not taken in a war. The '
      + 'precedent is the thing: from now on any eastern king who dies awkwardly may '
      + 'discover he has left his country to the Senate.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -133, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The Senate accepts the legacy',
        tooltip: 'Rome takes western Asia Minor: Smyrna, Attalia and Pisidia change hands where no living court holds them, Rome +300 talents and "The Revenues of Asia" (+12% income permanently). Every eastern monarchy takes −1 stability worth of dynastic anxiety (+1 unrest in their capitals for 60 months).',
        effects: guard('ev_w_attalid_will:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          if (!alive(ctx, 'ROM')) return;
          for (const n of ['Smyrna', 'Attalia', 'Pisidia']) {
            const p = ctx.prov && ctx.prov(n);
            if (!p || p.impassable) continue;
            const owner = g.tags[p.owner];
            if (owner && owner.alive && p.owner !== 'SEL') continue; // a living court keeps its own
            h.changeOwner(ctx, n, 'ROM');
          }
          h.adjust(ctx, 'ROM', { treasury: 300, legitimacy: 8 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'revenues_of_asia', name: 'The Revenues of Asia', months: -1,
            effects: { incomeMult: 1.12 },
          });
          for (const t of ['SEL', 'PTO', 'ARM', 'NAB']) {
            if (!alive(ctx, t)) continue;
            const def = (ctx.DEFINES.TAGS || {})[t] || {};
            if (def.capital) {
              h.addProvinceModifier(ctx, def.capital, {
                id: 'the_testament', name: 'The Testament of Attalus', months: 60,
                effects: { unrest: 1 },
              });
            }
          }
          h.setFlag(ctx, 'attalidWill', true);
          h.chronicle(ctx, 'era', 'Attalus III leaves his kingdom to the Roman people by will; western Asia becomes a province, and every eastern king reads his own testament again.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_senate_asks',
    title: 'The Senate Would Like to Know What You Are',
    desc: 'A Roman embassy comes east with instructions that are not quite a question. '
      + 'The Senate is content to have friends in Syria; it is less content to discover '
      + 'that its friend has become the largest power between the Euphrates and the '
      + 'desert while nobody in Italy was paying attention. The legates are courteous, '
      + 'well informed, and interested in exactly two things: the size of your army, '
      + 'and whether the treaty of friendship your grandfather signed is understood in '
      + 'Jerusalem to mean what it is understood in Rome to mean. Every eastern king '
      + 'who has answered this question has answered it wrong in one of two directions.',
    forTag: 'HAS',
    minYear: -140,
    maxYear: -70,
    trigger: safeTrigger('ev_w_senate_asks', (ctx) =>
      !!crown(ctx) && alive(ctx, 'ROM') && greatJudaea(ctx) && dateGE(ctx, -135, 1)),
    major: true,
    aiOption: 0,
    historical: 'Every Hasmonean renewed the friendship and kept the Senate at arm\'s length; it worked until Pompey.',
    options: [
      {
        label: 'Renew the friendship and say nothing about the army',
        tooltip: 'The old answer, and the one that worked for seventy years: +10 legitimacy, Rome\'s opinion to +60, and "The Friendship Renewed" (−1 unrest everywhere for 120 months). The Senate files the report and does nothing — for now.',
        effects: guard('ev_w_senate_asks:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 10 });
          setOpinion(ctx, 'ROM', me, 60);
          setOpinion(ctx, me, 'ROM', 40);
          h.addTagModifier(ctx, me, {
            id: 'friendship_renewed', name: 'The Friendship Renewed', months: 120,
            effects: { unrestAll: -1 },
          });
          h.doctrine(ctx, 'alignment', 2);
          h.setFlag(ctx, 'senateAnswered', true);
          h.chronicle(ctx, 'diplomacy', 'The legates are received, the friendship renewed, and the muster rolls are not discussed.');
        }),
      },
      {
        label: 'Tell them plainly what we are',
        tooltip: 'A king who states his own strength to the Senate: +20 martial points and +15 legitimacy at home, the Captains +20 — and Rome\'s opinion falls to −40 with "Noted in the Commentaries" (Roman aggression toward us is a matter of record). The Republic has never once been reassured by an accurate statement of somebody else\'s army.',
        effects: guard('ev_w_senate_asks:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { mar: 20, legitimacy: 15 });
          h.factionShift(ctx, me, 'warparty', 20);
          setOpinion(ctx, 'ROM', me, -40);
          h.doctrine(ctx, 'alignment', -2);
          h.setFlag(ctx, 'senateWarned', true);
          h.chronicle(ctx, 'diplomacy', 'The Senate is told the size of the army in plain numbers; the legates thank the court and write it all down.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_asiatic_vespers',
    title: 'One Day, Eighty Thousand',
    worldLabel: 'Mithridates orders the massacre of the Italians in Asia',
    desc: 'Mithridates of Pontus sends sealed letters to every city of Asia to be opened '
      + 'on the same day, and on that day the Greek cities kill every Italian in them — '
      + 'merchants, tax farmers, their families, their freedmen — at a count the sources '
      + 'give as eighty thousand and might be half that, which does not improve it. The '
      + 'cities do it enthusiastically, because thirty years of Roman tax farming have '
      + 'made the alternative look attractive. What follows is twenty-five years of war '
      + 'that will end with a Roman army permanently stationed east of the Aegean, which '
      + 'is the direct road to everything that happens to Judaea afterward.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -88, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The letters are opened on the appointed day',
        tooltip: 'Rome: −200 talents, −10 legitimacy and "The Asian Debt" (−10% income for 180 months) — the province that paid for everything stops paying. The Anatolian cities +3 unrest for 120 months. Rome will be back, with an army that does not leave.',
        effects: guard('ev_w_asiatic_vespers:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { treasury: -200, legitimacy: -10 });
            h.addTagModifier(ctx, 'ROM', {
              id: 'the_asian_debt', name: 'The Asian Debt', months: 180,
              effects: { incomeMult: 0.9 },
            });
          }
          stir(ctx, ['Smyrna', 'Attalia', 'Pisidia', 'Iconium', 'Nicaea', 'Ancyra'], {
            id: 'the_vespers', name: 'The Asiatic Vespers', months: 120,
            effects: { unrest: 3 },
          });
          h.setFlag(ctx, 'asiaticVespers', true);
          h.chronicle(ctx, 'era', 'The sealed letters are opened on the same day across Asia and every Italian in the province is killed; Rome will come back and stay.');
        }),
      },
    ],
  },

  {
    id: 'ev_w_tigranes_antioch',
    title: 'The Seleucid Kingdom Ends',
    worldLabel: 'Tigranes of Armenia takes Antioch',
    desc: 'There has not been a Seleucid king worth the name in twenty years — there '
      + 'have been six of them at once, which is the same thing said politely — and '
      + 'the cities of Syria finally do the arithmetic and invite Tigranes of Armenia '
      + 'to come and rule them, on the reasonable grounds that one king who exists is '
      + 'better than four who are fighting. He takes Antioch and strikes coin there '
      + 'with his own tiara on it. The empire Alexander\'s general founded, the empire '
      + 'this whole chapter began as a revolt against, ends not in a battle but in a '
      + 'municipal decision that it was no longer worth having.',
    forTag: 'both',
    decider: 'ARM',
    date: { y: -83, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev_w_tigranes_antioch:when', (ctx) => alive(ctx, 'SEL') && alive(ctx, 'ARM')),
    aiOption: 0,
    historical: 'Tigranes ruled Syria for fourteen years, until Lucullus took it from him.',
    options: [
      {
        label: 'The cities send for the Armenian',
        tooltip: 'Syria, Phoenicia, Cilicia and Commagene pass to Armenia where no other living court holds them — Tigranes\' kingdom, not the whole Seleucid map; the south is somebody else\'s problem by now. Armenia +12 legitimacy, +1 stability and +200 talents. The Seleucid court, if anything is left of it, loses 30 legitimacy and 2 stability. The empire the revolt was against is finished.',
        effects: guard('ev_w_tigranes_antioch:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ARM')) return;
          const taken = transfer(ctx, TIGRANES_SYRIA, 'ARM', 'SEL');
          h.adjust(ctx, 'ARM', { legitimacy: 12, stability: 1, treasury: 200, mar: 20 });
          if (alive(ctx, 'SEL')) h.adjust(ctx, 'SEL', { legitimacy: -30, stability: -2 });
          h.setFlag(ctx, 'tigranesInAntioch', true);
          h.chronicle(ctx, 'era', 'The cities of Syria send for Tigranes of Armenia and he takes Antioch; the Seleucid empire ends in a municipal decision (' + taken + ' provinces).');
        }),
      },
    ],
  },

  {
    id: 'ev_w_pompey_organizes',
    title: 'Rome Comes East to Stay',
    worldLabel: 'Pompey annexes Syria and organizes the East',
    desc: 'Pompey finishes Mithridates, takes Syria off Tigranes, and then does the '
      + 'thing that actually matters: he sits down and reorganizes the entire eastern '
      + 'Mediterranean — which kingdoms continue, which become provinces, which kings '
      + 'are confirmed and which are pensioned — in a settlement that will hold, in its '
      + 'essentials, for six hundred years. He is not conquering the East. He is filing '
      + 'it. Every court between the Taurus and the desert now exists at Roman '
      + 'discretion, and the ones that have not worked out what that means about '
      + 'themselves are about to be told.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -64, m: 4 },
    world: true,
    major: true,
    when: safeTrigger('ev_w_pompey_organizes:when', (ctx) => alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'Pompey made Syria a province in 64 and took Jerusalem the following year.',
    options: [
      {
        label: 'Syria becomes a province',
        tooltip: 'The province of Syria and the province of Cilicia — Antioch to Tyre, and the Cilician coast — taken off Armenia and off the Seleucid rump, but never off a living court that holds its own. Commagene and the Cappadocian marches stay client kingdoms; the Euphrates stays Parthia\'s frontier. Rome +20 legitimacy, +250 talents and "The Settlement of the East" (+10% income permanently). Armenia is reduced to Armenia. A great Judaea now has a Roman border.',
        effects: guard('ev_w_pompey_organizes:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          const took = transfer(ctx, POMPEY_SYRIA, 'ROM', ['SEL', 'ARM']);
          if (alive(ctx, 'ARM') && took) {
            h.adjust(ctx, 'ARM', { legitimacy: -20, stability: -1 });
            h.addTagModifier(ctx, 'ARM', {
              id: 'friend_and_ally', name: 'Friend and Ally of the Roman People', months: -1,
              effects: { incomeMult: 0.85 },
            });
          }
          h.adjust(ctx, 'ROM', { legitimacy: 20, treasury: 250 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'settlement_of_the_east', name: 'The Settlement of the East', months: -1,
            effects: { incomeMult: 1.1 },
          });
          const me = crown(ctx);
          if (me) {
            setOpinion(ctx, 'ROM', me, greatJudaea(ctx) ? -20 : 20);
            h.addTagModifier(ctx, me, {
              id: 'a_roman_border', name: 'A Roman Border', months: -1,
              effects: { unrestAll: 0.5 },
            });
          }
          h.setFlag(ctx, 'pompeyEast', true);
          h.chronicle(ctx, 'era', 'Pompey makes Syria a province and files the whole eastern Mediterranean into a settlement that will outlast the Republic that made it.');
        }),
      },
    ],
  },
];
