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
    id: 'ev_k_lukuas',
    title: 'The King Out of Cyrene',
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

  // ── 4 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_turbo',
    title: 'Marcius Turbo Sails South',
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
        tooltip: 'Rome: Turbo lands at Pelusium with 11 regiments and a hard commission.',
        effects: guard('ev_k_turbo:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ROM', 'Pelusium', {
            inf: 9, cav: 2, name: "Turbo's Expedition",
            general: { name: 'Marcius Turbo', fire: 2, shock: 3, maneuver: 3 },
          });
        }),
      },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_ctesiphon',
    title: 'Ctesiphon Falls',
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
        tooltip: 'Rome: Quietus at Nisibis with 9 regiments and +20% siege for 24 months. Judaea: +5 legitimacy — the massacres preach.',
        effects: guard('ev_k_quietus:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ROM', 'Nisibis', {
            inf: 6, cav: 3, name: "Quietus' Column",
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
        tooltip: 'Rome: 6 fresh regiments land at Paphos; +10 war score against the rising.',
        effects: guard('ev_k_reduction:0', (ctx) => {
          ctx.helpers.spawnArmy(ctx, 'ROM', 'Paphos', { inf: 5, cav: 1, name: 'Fleet Detachment' });
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
    desc: 'Hadrian\'s first act is the one Trajan could never speak: Mesopotamia and '
      + 'Armenia are abandoned, the client kings restored, the legions pulled back to '
      + 'the Euphrates. "The first duty of a new prince," he writes, "is to know the '
      + 'size of his own hand."',
    forTag: 'ROM',
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

  // Fired by BOOKMARK_115.checkVictory when the rising reaches +40 war score
  // (SPEC §32); never fires on its own. The new emperor's terms are an OFFER.
  {
    id: 'ev115_terms',
    title: 'The Fire Unquenched',
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
