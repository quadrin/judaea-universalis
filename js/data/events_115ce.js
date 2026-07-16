// Judaea Universalis — event chain: The Kitos War, 115–117 CE.
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Source spine: Cassius Dio LXVIII.32-33; Eusebius, HE IV.2; Appian, BC II
// (the flight from the Delta); CPJ II (the "Jewish tumult" papyri); rabbinic
// memory of the polemos shel Qitos. Dates map to the real chronology.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_115ce] ' + key, e || '');
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

function findWar(game, a, b) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(a) !== -1 && all.indexOf(b) !== -1) return w;
  }
  return null;
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

// Scripted warscore swings persist in the war's eventScore side-bucket.
function addWarscore(ctx, tag, amount) {
  try {
    const w = findWar(ctx.game, 'JUD', 'ROM');
    if (!w) return;
    if (!w.eventScore) w.eventScore = { att: 0, def: 0 };
    const side = (w.attackers || []).indexOf(tag) >= 0 ? 'att'
      : (w.defenders || []).indexOf(tag) >= 0 ? 'def' : null;
    if (side) w.eventScore[side] += amount;
  } catch (e) { warnOnce('addWarscore', e); }
}

export const EVENTS_115 = [
  // ── 1 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_cyrene',
    title: 'The Fire in the Pentapolis',
    requiresWar: ['JUD', 'ROM'],
    desc: 'It begins in Cyrene: the Jews of the Pentapolis rise as one, and at their '
      + 'head stands Lukuas, whom the Greeks call Andreas and his own people will '
      + 'crown king. The temples burn, the Roman ala is cut down on the coast road, '
      + 'and the richest wheat country west of Egypt is suddenly his.',
    forTag: 'both',
    date: { y: 115, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Cyrenaica rises',
        tooltip: 'Cyrene joins Judaea; a host of the Pentapolis musters there. Marmarica and Paraetonium: +2 unrest for 12 months.',
        effects: guard('ev_k_cyrene:0', (ctx) => {
          ctx.helpers.changeOwner(ctx, 'Cyrene', 'JUD');
          const cy = ctx.prov('Cyrene');
          if (cy) cy.religion = 'judaism';
          ctx.helpers.spawnArmy(ctx, 'JUD', 'Cyrene', {
            inf: 4, name: 'Host of the Pentapolis',
          });
          for (const n of ['Marmarica', 'Paraetonium']) {
            ctx.helpers.addProvinceModifier(ctx, n, {
              id: 'diaspora_rising', name: 'The Diaspora Rising', months: 12, effects: { unrest: 2 },
            });
          }
        }),
      },
    ],
  },
  {
    id: 'ev_k_lukuas',
    title: 'The King Out of Cyrene',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Cyrenaica is behind him — the temples of Apollo and Hecate pulled down, the '
      + 'roads to the city broken, and the Greeks of the Pentapolis fled or dead. Now '
      + 'Lukuas, whom his people crown king, turns east along the coast into Egypt, and '
      + 'every Jewish town on the Delta rises to meet him as an army in waiting.',
    forTag: 'both',
    date: { y: 115, m: 9 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The fire crosses the border',
        tooltip: 'Lukuas\' host (8 regiments) arrives at Leontopolis. Egyptian provinces: +2 unrest for 18 months.',
        effects: guard('ev_k_lukuas:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'JUD', 'Leontopolis', {
            inf: 7, cav: 1, name: 'Host of Lukuas',
            general: { name: 'Lukuas', fire: 2, shock: 4, maneuver: 2 },
          });
          for (const n of ['Alexandria', 'Athribis', 'Memphis', 'Pelusium', 'Oxyrhynchus']) {
            ctx.helpers.addProvinceModifier(ctx, n, {
              id: 'diaspora_rising', name: 'The Diaspora Rising', months: 18, effects: { unrest: 2 },
            });
          }
        }),
      },
    ],
  },

  // ── 2 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_alexandria_street_war',
    title: 'Street War in Alexandria',
    requiresWar: ['JUD', 'ROM'],
    desc: 'The oldest hatred in the city — Greek against Jew, quarter against quarter — '
      + 'has become open war inside the second city of the world. The prefect has too few '
      + 'men to hold the streets and the mob knows it. Somebody will rule the ruins.',
    forTag: 'ROM',
    date: { y: 115, m: 10 },
    aiOption: 0,
    options: [
      {
        label: 'Restore order — with the lash',
        tooltip: 'Alexandria: −2 unrest for 12 months. Judaea (the rising): +5 legitimacy — martyrs preach louder than edicts.',
        effects: guard('ev_k_alex:0', (ctx) => {
          ctx.helpers.addProvinceModifier(ctx, 'Alexandria', {
            id: 'prefects_lash', name: "The Prefect's Lash", months: 12, effects: { unrest: -2 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
      {
        label: 'Let the factions bleed each other',
        tooltip: 'Alexandria: +2 unrest for 12 months. Rome: +25 government points saved from the garrison budget.',
        effects: guard('ev_k_alex:1', (ctx) => {
          ctx.helpers.addProvinceModifier(ctx, 'Alexandria', {
            id: 'city_of_knives', name: 'City of Knives', months: 12, effects: { unrest: 2 },
          });
          ctx.helpers.adjust(ctx, 'ROM', { gov: 25 });
        }),
      },
    ],
  },

  // ── 3 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_artemion',
    title: 'The Island in Arms',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Salamis has fallen to Artemion and the Greeks of Cyprus are fleeing to the '
      + 'hills or the sea. Dio will set the dead at two hundred and forty thousand — a '
      + 'number to be doubted, a terror not to be. There is no Roman force on the island '
      + 'at all.',
    forTag: 'both',
    date: { y: 115, m: 11 },
    aiOption: 0,
    options: [
      {
        label: 'The sea is a wall — for now',
        tooltip: 'Host of Artemion: +2 regiments of islanders. Judaea: +25 martial points.',
        effects: guard('ev_k_artemion:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'JUD', 'Salamis', { inf: 2, name: 'Islanders of Artemion' });
          ctx.helpers.adjust(ctx, 'JUD', { mar: 25 });
        }),
      },
    ],
  },

  // ── 3b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_temples',
    title: 'The Temples Burn',
    desc: 'Word comes north from Cyrene with the refugees: the temple of Apollo pulled '
      + 'down, Hecate\'s and Zeus\'s after it, the baths and the basilica cracked with '
      + 'fire. The rising is answering three generations of Greek pogroms in the only '
      + 'currency the cities respect — and every burned altar preaches Rome\'s sermon '
      + 'for it.',
    forTag: 'JUD',
    date: { y: 115, m: 12 },
    aiOption: 0,
    options: [
      {
        label: 'Restrain the iconoclasm',
        tooltip: '+10 influence points; the Elders of the Communities +8 approval — the reprisals will find fewer excuses.',
        effects: guard('ev_k_temples:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { infl: 10 });
          ctx.helpers.factionShift(ctx, 'JUD', 'elders', 8);
        }),
      },
      {
        label: 'Let it burn',
        tooltip: '+20 martial points; the Elders −10 approval. Rome: +5 legitimacy — the atrocity propaganda writes itself.',
        effects: guard('ev_k_temples:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { mar: 20 });
          ctx.helpers.factionShift(ctx, 'JUD', 'elders', -10);
          ctx.helpers.adjust(ctx, 'ROM', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 4 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_turbo',
    title: 'Marcius Turbo Sails South',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Trajan has chosen: the granary before the conquest. Quintus Marcius Turbo — '
      + 'the emperor\'s best trouble-shooter — sails for Egypt with legionary detachments '
      + 'and a fleet, under orders that use words like "extirpate."',
    forTag: 'both',
    date: { y: 116, m: 1 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The empire answers',
        tooltip: 'Rome: Turbo lands at Pelusium with 13 regiments and a hard commission.',
        effects: guard('ev_k_turbo:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ROM', 'Pelusium', {
            inf: 11, cav: 2, name: "Turbo's Expedition",
            general: { name: 'Marcius Turbo', fire: 2, shock: 3, maneuver: 3 },
          });
        }),
      },
    ],
  },

  // ── 4b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_villagers',
    title: 'The Villages Take Sides',
    desc: 'The papyri will preserve it for eighteen centuries: village councils of the '
      + 'Delta voting to arm themselves against "the impious Jews," Greek strategoi '
      + 'drilling Egyptian peasants who despise them almost as much as the enemy. The '
      + 'prefect can have a militia tomorrow — and a countryside full of settled '
      + 'scores the day after.',
    forTag: 'ROM',
    date: { y: 116, m: 2 },
    aiOption: 0,
    options: [
      {
        label: 'Arm the villages',
        tooltip: '+10% manpower for 12 months ("The Peasant Levies") — and the Delta provinces +1 unrest for 12 months as the scores settle.',
        effects: guard('ev_k_villagers:0', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ROM', {
            id: 'peasant_levies', name: 'The Peasant Levies', months: 12, effects: { manpowerMult: 1.1 },
          });
          for (const n of ['Athribis', 'Memphis', 'Arsinoe']) {
            ctx.helpers.addProvinceModifier(ctx, n, {
              id: 'settled_scores', name: 'Settled Scores', months: 12, effects: { unrest: 1 },
            });
          }
        }),
      },
      {
        label: 'Regulars only — militias are mobs with permits',
        tooltip: '+15 martial points; the villages keep their knives at home.',
        effects: guard('ev_k_villagers:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ROM', { mar: 15 });
        }),
      },
    ],
  },

  // ── 4c ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_appian',
    title: 'The Historian Runs for the Delta',
    desc: 'Among the Greeks fleeing the Delta is a young Alexandrian lawyer named '
      + 'Appian, guided through the marshes by night — he will tell the story himself, '
      + 'decades later, in a history of Rome\'s wars: the wrong turn, the Jewish '
      + 'patrols, the ship at Pelusium that saved him. Empires keep their records; '
      + 'this war\'s best witness nearly drowned in it.',
    forTag: 'ROM',
    date: { y: 116, m: 5 },
    aiOption: 0,
    options: [
      {
        label: 'The reports reach Rome vivid',
        tooltip: '+10 influence points — nothing moves a Senate like an eyewitness with literary gifts.',
        effects: guard('ev_k_appian:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ROM', { infl: 10 });
        }),
      },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_ctesiphon',
    title: 'Ctesiphon Falls',
    requiresWar: ['ROM', 'PAR'],
    desc: 'The winter capital of the King of Kings is Roman. Osroes\' golden throne and '
      + 'his daughter go west as trophies; Trajan sails down to the Persian Gulf and, '
      + 'watching a merchantman leave for India, says he would follow it — were he younger. '
      + 'He is not younger. And behind him every bridge is burning.',
    forTag: 'both',
    trigger: safeTrigger('ev_k_ctesiphon', (ctx) =>
      dateGE(ctx, 116, 4) && !!findWar(ctx.game, 'ROM', 'PAR')),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Parthicus',
        tooltip: 'Rome seizes Seleucia-Ctesiphon and Babylon (control): +15 legitimacy. Parthia: −1 stability.',
        effects: guard('ev_k_ctesiphon:0', (ctx) => {
          ctx.helpers.changeController(ctx, 'Seleucia-Ctesiphon', 'ROM');
          ctx.helpers.changeController(ctx, 'Babylon', 'ROM');
          ctx.helpers.adjust(ctx, 'ROM', { legitimacy: 15 });
          ctx.helpers.adjust(ctx, 'PAR', { stability: -1 });
        }),
      },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_rivers_rise',
    title: 'The Rivers Rise',
    requiresWar: ['ROM', 'PAR'],
    desc: 'Rome holds Mesopotamia the way a hand holds water. In Nehardea and along the '
      + 'canals the Jewish towns — the oldest diaspora of all, Babylon\'s own — rise '
      + 'behind the legions, and the whole occupied east goes up with them: Seleucia, '
      + 'Edessa, Hatra. Trajan\'s conquest evaporates in a single season.',
    forTag: 'both',
    date: { y: 116, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'From Babylon, fire',
        tooltip: 'Nehardea joins the rising (owner) with 4 regiments. Rising war score +5.',
        effects: guard('ev_k_rivers:0', (ctx) => {
          ctx.helpers.changeOwner(ctx, 'Nehardea', 'JUD');
          ctx.helpers.spawnArmy(ctx, 'JUD', 'Nehardea', {
            inf: 4, name: 'Host of the Exile',
            general: { name: 'Silas the Babylonian', fire: 1, shock: 2, maneuver: 3 },
          });
          addWarscore(ctx, 'JUD', 5);
        }),
      },
    ],
  },

  // ── 7 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_quietus',
    title: 'Quietus Unleashed',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Trajan gives Mesopotamia to Lusius Quietus, the Moorish cavalry prince who '
      + 'learned war raiding for and against Rome — with orders to clear the province of '
      + 'its rebels by whatever arithmetic he prefers. His methods will give this whole '
      + 'war its name in the books of his victims: the War of Qitos.',
    forTag: 'both',
    date: { y: 116, m: 8 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The Moor rides',
        tooltip: 'Rome: Quietus at Nisibis with 11 regiments and +20% siege for 24 months. Judaea: +5 legitimacy — the massacres preach.',
        effects: guard('ev_k_quietus:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ROM', 'Nisibis', {
            inf: 7, cav: 4, name: "Quietus' Column",
            general: { name: 'Lusius Quietus', fire: 2, shock: 4, maneuver: 4 },
          });
          ctx.helpers.addTagModifier(ctx, 'ROM', {
            id: 'quietus_methods', name: "Quietus' Methods", months: 24, effects: { siegeMult: 1.2 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 7b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_mesopotamia_broken',
    title: 'Seleucia Burns, Nisibis Falls',
    desc: 'Quietus does what he was hired to do: Nisibis stormed, Edessa sacked with '
      + 'its king dead in the ruins, and Seleucia — half a million people, Greek and '
      + 'Babylonian and Jew — burned by two columns working in concert. Mesopotamia '
      + 'is quiet now, in the way the historians mean when they stop describing it.',
    forTag: 'both',
    date: { y: 117, m: 1 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The arithmetic he prefers',
        tooltip: 'Rome: +8 war score against the rising. The rising: −5 legitimacy between the rivers. Parthia: −1 stability — it was their city too.',
        effects: guard('ev_k_meso:0', (ctx) => {
          addWarscore(ctx, 'ROM', 8);
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: -5 });
          ctx.helpers.adjust(ctx, 'PAR', { stability: -1 });
          ctx.helpers.chronicle(ctx, 'war', 'Quietus breaks Mesopotamia: Nisibis stormed, Edessa sacked, Seleucia burned.');
        }),
      },
    ],
  },

  // ── 7c ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_hatra',
    title: 'The Walls of Hatra',
    desc: 'One desert city refuses the script: Hatra, ringed by sand and served by a '
      + 'single spring, shuts its gates on the emperor himself. The siege fails in '
      + 'heat, flies and cavalry sorties; Trajan takes a fever under its walls he '
      + 'will never fully shake. The desert, it turns out, is also a fortification.',
    forTag: 'both',
    date: { y: 117, m: 4 },
    aiOption: 0,
    options: [
      {
        label: 'The desert holds',
        tooltip: 'Rome: −5% morale for 6 months ("The Desert Repulse"). Parthia: +10 legitimacy.',
        effects: guard('ev_k_hatra:0', (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'ROM', {
            id: 'desert_repulse', name: 'The Desert Repulse', months: 6, effects: { moraleMult: 0.95 },
          });
          ctx.helpers.adjust(ctx, 'PAR', { legitimacy: 10 });
        }),
      },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_hunger',
    title: 'Hunger in Rome',
    desc: 'The grain fleet did not sail on time. In the capital the price of bread has '
      + 'tripled, the prefect of the annona has been mobbed on the steps of his own '
      + 'office, and the Senate — which can ignore a burning province — cannot ignore '
      + 'an empty one.',
    forTag: 'both',
    trigger: safeTrigger('ev_k_hunger', (ctx) => {
      let held = 0;
      for (const n of ['Alexandria', 'Athribis', 'Memphis', 'Arsinoe']) {
        if (ctx.helpers.controls(ctx, 'JUD', n)) held++;
      }
      return held >= 2;
    }),
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The city feels the war',
        tooltip: 'Rome: −1 stability. The rising: +8 war score.',
        effects: guard('ev_k_hunger:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ROM', { stability: -1 });
          addWarscore(ctx, 'JUD', 8);
        }),
      },
    ],
  },

  // ── 8b ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_reduction',
    title: 'The Reduction',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Village by village, canal by canal, Turbo grinds the Delta back into the '
      + 'empire — "many battles, in many manners," Eusebius writes, and after each one '
      + 'fewer rebels and fewer prisoners. A second fleet retakes the Cypriot ports '
      + 'behind him.',
    forTag: 'both',
    date: { y: 117, m: 2 },
    aiOption: 0,
    options: [
      {
        label: 'The grind',
        tooltip: 'Rome: 8 fresh regiments land at Paphos; +10 war score against the rising.',
        effects: guard('ev_k_reduction:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ROM', 'Paphos', { inf: 6, cav: 2, name: 'Fleet Detachment' });
          addWarscore(ctx, 'ROM', 10);
        }),
      },
    ],
  },

  // ── 9 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_trajan_dies',
    title: 'Death at Selinus',
    desc: 'The conqueror of Dacia and Parthia dies in a Cilician port town, halfway home, '
      + 'his eastern provinces already in flames behind him. The succession is a bedside '
      + 'whisper and an adoption the empress may or may not have invented. Hadrian, '
      + 'governor of Syria, is emperor — and Hadrian has never believed in this war.',
    forTag: 'both',
    date: { y: 117, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The age turns',
        tooltip: 'Hadrian is emperor. Rome and Parthia make a white peace; Rome: −1 stability, and the legions stand down for a season.',
        effects: guard('ev_k_trajan:0', (ctx) => {
          ctx.helpers.setRuler(ctx, 'ROM', {
            name: 'Hadrian', title: 'Emperor', gov: 4, infl: 3, mar: 3, age: 41,
          });
          ctx.helpers.endWar(ctx, 'ROM', 'PAR', null);
          // Hadrian will talk where Trajan would not: the rising's war can now
          // be settled at the table (the AI sues when it is losing).
          const w = findWar(ctx.game, 'JUD', 'ROM');
          if (w) w.noNegotiation = false;
          ctx.helpers.adjust(ctx, 'ROM', { stability: -1 });
          ctx.helpers.addTagModifier(ctx, 'ROM', {
            id: 'succession_pause', name: 'The Succession', months: 6, effects: { aiPassive: true },
          });
          ctx.helpers.chronicle(ctx, 'ruler', 'Trajan dies at Selinus; Hadrian is emperor, and the eastern conquest is finished.');
        }),
      },
    ],
  },

  // ── 10 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_withdrawal',
    title: 'The Frontier Comes Home',
    requiresWar: ['ROM', 'PAR'],
    desc: 'Hadrian\'s first act is the one Trajan could never speak: Mesopotamia and '
      + 'Armenia are abandoned, the client kings restored, the legions pulled back to '
      + 'the Euphrates. "The first duty of a new prince," he writes, "is to know the '
      + 'size of his own hand."',
    forTag: 'ROM',
    world: true,
    trigger: safeTrigger('ev_k_withdrawal', (ctx) =>
      dateGE(ctx, 117, 10) && !!(ctx.game.firedEvents && ctx.game.firedEvents.ev_k_trajan_dies)),
    aiOption: 0,
    options: [
      {
        label: 'Consolidate',
        tooltip: 'Rome: +1 stability, +5% income for 24 months ("The Peace Dividend").',
        effects: guard('ev_k_withdrawal:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ROM', { stability: 1 });
          ctx.helpers.addTagModifier(ctx, 'ROM', {
            id: 'peace_dividend', name: 'The Peace Dividend', months: 24, effects: { incomeMult: 1.05 },
          });
        }),
      },
    ],
  },

  // ── 10b ───────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_quietus_end',
    title: 'Hadrian\'s List',
    desc: 'Lusius Quietus — consul, governor of Judaea, the most decorated Moor in '
      + 'Roman history — is quietly removed from his province, then from the army '
      + 'list, then from the world, executed with three other consulars for a '
      + 'conspiracy nobody bothers to prove. The men who fought Trajan\'s wars are '
      + 'learning what the new peace costs, and the province he governed briefly '
      + 'files the name away: the war of Qitos.',
    forTag: 'ROM',
    trigger: safeTrigger('ev_k_quietus_end', (ctx) =>
      dateGE(ctx, 118, 2)
      && !!(ctx.game.firedEvents && ctx.game.firedEvents.ev_k_trajan_dies)),
    aiOption: 0,
    options: [
      {
        label: 'The list is short and final',
        tooltip: '+1 stability (the old guard is settled); −5 legitimacy, and the Legions −10 approval — they remember who won their battles.',
        effects: guard('ev_k_quietus_end:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'ROM', { stability: 1, legitimacy: -5 });
          ctx.helpers.factionShift(ctx, 'ROM', 'legions', -10);
          ctx.helpers.chronicle(ctx, 'ruler', 'The four consulars die; Quietus\' name outlives him only in the war his victims named.');
        }),
      },
      {
        label: 'Exile, not execution',
        tooltip: '−1 stability (the conspiracies stay plausible); the Legions +5 approval.',
        effects: guard('ev_k_quietus_end:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'ROM', { stability: -1 });
          ctx.helpers.factionShift(ctx, 'ROM', 'legions', 5);
        }),
      },
    ],
  },

  // ── 10c ───────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_mourning',
    title: 'The Decrees of Mourning',
    desc: 'In the academies of Judaea — spectators, this time, to a war that consumed '
      + 'their diaspora — the sages rule: in memory of the war of Qitos, brides shall '
      + 'not go out in wreathed crowns. A small decree. The Mishnah will carry it '
      + 'across eighteen centuries, one line of mourning for half a million dead the '
      + 'chronicles barely count.',
    forTag: 'JUD',
    trigger: safeTrigger('ev_k_mourning', (ctx) => dateGE(ctx, 117, 11)),
    aiOption: 0,
    options: [
      {
        label: 'What is remembered, lives',
        tooltip: '+5 legitimacy; the Sages +8 approval.',
        effects: guard('ev_k_mourning:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 5 });
          ctx.helpers.factionShift(ctx, 'JUD', 'sages', 8);
        }),
      },
    ],
  },

  // ── A SECOND CHAPTER, IF THE CAMPAIGN RUNS LONG ───────────────────────────
  {
    id: 'ev_k_aelia_horizon',
    title: 'The Colony on the Sacred Hill',
    worldLabel: 'Hadrian orders Aelia Capitolina at Jerusalem',
    desc: 'Hadrian\'s surveyors mark a Roman colony at Jerusalem and a new civic center '
      + 'on the sacred hill. The order is issued by the wider empire regardless of how the '
      + 'diaspora war ended. Whether it can be built depends on who actually holds the city.',
    forTag: 'both',
    date: { y: 130, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'The decree meets the live map',
      tooltip: 'If Rome holds Jerusalem, the colony raises unrest across Roman-held Jewish provinces. Otherwise Hadrian’s plan is frustrated and the holder gains legitimacy.',
      effects: guard('ev_k_aelia_horizon:0', (ctx) => {
        const holder = ctx.prov('Jerusalem');
        if (holder && holder.owner === 'ROM' && alive(ctx, 'ROM')) {
          ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'aelia_colony', name: 'Aelia Capitolina Survey', months: -1,
            effects: { unrest: 2 },
          });
          for (const p of ctx.game.provinces || []) {
            if (!p || p.owner !== 'ROM' || p.religion !== 'judaism') continue;
            ctx.helpers.addProvinceModifier(ctx, p.name, {
              id: 'aelia_anger', name: 'The Aelia Decree', months: 30, effects: { unrest: 1.5 },
            });
          }
          ctx.helpers.chronicle(ctx, 'era', 'Hadrian orders Aelia Capitolina laid out at Jerusalem; the hill country begins to organize again.');
        } else if (holder && ctx.game.tags[holder.owner]) {
          ctx.helpers.adjust(ctx, holder.owner, { legitimacy: 10 });
          ctx.helpers.chronicle(ctx, 'diplomacy', 'Hadrian names a colony he cannot build: Jerusalem lies beyond Roman surveyors.');
        }
      }),
    }],
  },
  {
    id: 'ev_k_bar_kokhba_horizon',
    title: 'The Hills Rise Again',
    worldLabel: 'The prepared revolt in Judaea reaches its horizon',
    desc: 'Weapons come out of caves and workshops; Simon bar Kosiba is acclaimed Nasi. '
      + 'If Judaea already won lasting independence, the mobilization strengthens that '
      + 'state instead of reenacting a revolt. If Rome still holds the hills, a new war '
      + 'begins under conditions created by fifteen years of alternate history.',
    forTag: 'both',
    date: { y: 132, m: 4 },
    world: true,
    major: true,
    aiOption: 0,
    options: [{
      label: 'Year One—again, or for the first time',
      tooltip: 'An independent Jewish realm receives mobilization. If Rome holds Judaea and JUD still exists, the revolt revives with an army and declares war; no province is handed over.',
      effects: guard('ev_k_bar_kokhba_horizon:0', (ctx) => {
        const independent = alive(ctx, 'MLI') ? 'MLI'
          : alive(ctx, 'JUD') && !ctx.game.tags.JUD.overlord && ctx.helpers.countControlled(ctx, 'JUD', {}) >= 5 ? 'JUD' : null;
        if (independent) {
          ctx.helpers.adjust(ctx, independent, { manpower: 5000, legitimacy: 15, mar: 30 });
          ctx.helpers.addTagModifier(ctx, independent, {
            id: 'prepared_generation', name: 'A Prepared Generation', months: 30,
            effects: { moraleMult: 1.1, manpowerMult: 1.1 },
          });
          ctx.helpers.chronicle(ctx, 'era', 'The prepared generation joins an independent Jewish state; the revolt becomes mobilization rather than reenactment.');
          return;
        }
        const jud = ctx.game.tags.JUD;
        if (!jud || !alive(ctx, 'ROM')) return;
        jud.alive = true;
        jud.overlord = null;
        ctx.helpers.setRuler(ctx, 'JUD', { name: 'Simon bar Kosiba', title: 'Nasi Israel', gov: 2, infl: 3, mar: 5, age: 45 });
        ctx.helpers.adjust(ctx, 'JUD', { treasury: 120, manpower: 7000, stability: 1, legitimacy: 45, mar: 30 });
        ctx.helpers.spawnArmy(ctx, 'JUD', 'Hebron', {
          inf: 7, cav: 1, name: 'The Hidden Host',
          general: { name: 'Simon bar Kosiba', fire: 2, shock: 4, maneuver: 4 },
        });
        if (!findWar(ctx.game, 'JUD', 'ROM')) ctx.helpers.declareWar(ctx, 'JUD', 'ROM', 'The Bar Kokhba Revolt');
        ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'hidden_armories', name: 'The Hidden Armories', months: 30,
          effects: { moraleMult: 1.1, reinforceMult: 1.1 },
        });
        ctx.helpers.chronicle(ctx, 'war', 'The prepared revolt breaks from the Judaean hills under Simon bar Kosiba.');
      }),
    }],
  },

  // Fired by BOOKMARK_115.checkVictory when the rising reaches +40 war score
  // (SPEC §32); never fires on its own. The new emperor's terms are an OFFER.
  {
    id: 'ev115_terms',
    title: 'The Fire Unquenched',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Egypt starves the wolf, Cyprus is a Jewish island, and the legions recalled '
      + 'from Parthia arrive to a war already lost. The new emperor offers what no '
      + 'Roman will read aloud: the eastern diaspora keeps the lands of the faith it '
      + 'holds, and the rest returns to the peace of Rome. Or the fire can burn on, '
      + 'and be answered with fire.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev115_terms', () => false),
    aiOption: 0,
    options: [
      {
        label: 'Sign what no Roman will read aloud',
        tooltip: 'Victory (score 200). The war ends; the diaspora keeps the provinces of the faith it holds, and every other occupied town returns.',
        effects: guard('ev115_terms:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const w = (g.wars || []).find((x) => x
            && (x.attackers.concat(x.defenders)).indexOf('JUD') >= 0
            && (x.attackers.concat(x.defenders)).indexOf('ROM') >= 0);
          const key = w && (w.attackers || []).indexOf('JUD') >= 0 ? 'att' : 'def';
          h.endWar(ctx, 'JUD', 'ROM', key, { keep: (p) => p.religion === 'judaism' });
          h.endGame(ctx, {
            result: 'win',
            title: 'The Fire Unquenched',
            text: 'The new emperor signs what no Roman will read aloud: the eastern '
              + 'diaspora keeps what it holds of the faith.',
            score: 200,
          });
        }),
      },
      {
        label: 'Let it burn',
        tooltip: 'The war goes on. +5 legitimacy; the terms will not be offered twice.',
        effects: guard('ev115_terms:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
    ],
  },
];
