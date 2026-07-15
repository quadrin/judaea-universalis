// Judaea Universalis — bookmark: The Kitos War, 115 CE (SPEC §9.1).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Historical spine: Cassius Dio LXVIII.32; Eusebius, HE IV.2; Appian; papyri of
// the "Jewish tumult" (CPJ II). While Trajan marches on Ctesiphon, the Jewish
// diaspora rises behind him — Cyrene, Egypt, Cyprus, then Mesopotamia — and the
// Moorish general Lusius Quietus gives the war its rabbinic name (polemos shel
// Qitos).

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_115ce] ' + key, e || '');
}

function findWar(game, a, b) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(a) !== -1 && all.indexOf(b) !== -1) return w;
  }
  return null;
}

function judWarscore(ctx) {
  try {
    const w = findWar(ctx.game, 'JUD', 'ROM');
    if (!w || !w.warscore) return 0;
    return typeof w.warscore.JUD === 'number' ? w.warscore.JUD : 0;
  } catch (e) { warnOnce('judWarscore', e); return 0; }
}

function totalMen(ctx, tag) {
  try {
    return ctx.helpers.armiesOf(ctx, tag).reduce((s, a) => s + ((a && a.men) || 0), 0);
  } catch (e) { warnOnce('totalMen', e); return 0; }
}

function setOpinion(game, a, b, val) {
  try {
    const ta = game.tags && game.tags[a];
    if (!ta) return;
    if (!ta.opinion || typeof ta.opinion !== 'object') ta.opinion = {};
    ta.opinion[b] = Math.max(-200, Math.min(200, val));
  } catch (e) { warnOnce('setOpinion', e); }
}

function dateGE(date, y, m) {
  return date.y > y || (date.y === y && date.m >= m);
}

export const BOOKMARK_115 = {
  id: '115ce',
  name: 'The Kitos War',
  startDate: { y: 115, m: 8, d: 1 },
  // Technology of the age (SPEC §22): Trajan's army at the empire's high-water mark.
  techBase: 5,
  techTweaks: { ROM: { mar: 2, gov: 1 }, PAR: { mar: 1 } },

  blurb: 'Trajan has crossed the Euphrates and the King of Kings is in retreat — the '
    + 'legions are further east than any Roman has ever stood. And behind them, from '
    + 'Cyrene to Cyprus to the Nile, the Jewish diaspora has risen in one motion, under '
    + 'a king the Greeks call Lukuas. The granaries of Egypt burn. The emperor must '
    + 'choose which war he is actually fighting.',

  activeTags: ['ROM', 'JUD', 'PAR', 'OSR', 'ADI', 'CHX'],

  // Political layer for 115 CE over map_data's 66 CE defaults: Judaea is a
  // Roman province (quiet — this is the diaspora's war), Nabataea is
  // Provincia Arabia (106), Armenia is annexed (114), Agrippa's realm is long
  // absorbed. The rising begins on Cyprus and in the Jewish towns of Egypt;
  // Osrhoene has bent the knee to Trajan; Adiabene and Characene stand with
  // the Arsacid king.
  // The Second Temple burned in 70 CE — the Mount stands bare (SPEC §32).
  wonderTweaks: { Jerusalem: null },
  owners: {
    // -- Judaea & Galilee: Roman, garrisoned, watching -------------------------
    'Jerusalem': 'ROM', 'Jericho': 'ROM', 'Emmaus': 'ROM', 'Lydda': 'ROM',
    'Joppa': 'ROM', 'Masada': 'ROM', 'Engaddi': 'ROM', 'Gadora': 'ROM',
    'Machaerus': 'ROM', 'Sepphoris': 'ROM', 'Jotapata': 'ROM', 'Tiberias': 'ROM',
    'Tarichaea': 'ROM', 'Gischala': 'ROM',
    // -- The absorbed client kingdoms ------------------------------------------
    'Caesarea Philippi': 'ROM', 'Batanea': 'ROM', 'Gamala': 'ROM',
    // -- Provincia Arabia (106 CE) ----------------------------------------------
    'Petra': 'ROM', 'Bostra': 'ROM', 'Oboda': 'ROM', 'Aila': 'ROM',
    'Hegra': 'ROM', 'Dumatha': 'ROM', 'Medaba': 'ROM', 'Tayma': 'ROM',
    // -- Armenia, annexed by Trajan (114) ---------------------------------------
    'Tigranocerta': 'ROM', 'Sophene': 'ROM', 'Amida': 'ROM',
    // -- The rising: Artemion's Cyprus, the Jewish towns of Egypt ---------------
    'Salamis': 'JUD',
    'Leontopolis': 'JUD',
    // Everything else keeps map_data's default (ROM coast & Egypt, PAR east,
    // OSR/ADI/CHX on the Tigris).
  },

  // What the era asks of you (SPEC §33) — shown in the realm panel.
  objectives: {
    JUD: [
      'Win: ride the diaspora\'s fire to +40 war score — the new emperor will offer terms (accept, or let it burn).',
      'Win: outlive Trajan — alive with 3+ provinces into 118 CE, when Hadrian buys peace in the East.',
      'Lose: the rising extinguished.',
    ],
    ROM: [
      'Win: put the rising down — before August 117 to spare Trajan the news on his deathbed.',
      'Lose: the East still burning as the new reign opens.',
    ],
  },
  playableTags: [
    {
      tag: 'JUD',
      difficulty: 'Very Hard',
      blurb: 'You are not a country; you are a fire in five countries. Lukuas marches out '
        + 'of Cyrene, Artemion holds Cyprus, and between the rivers your brothers wait for '
        + 'a sign. Rome\'s field army is a thousand miles east chasing the King of Kings — '
        + 'burn what holds you, link the risings, and outlive Trajan. His heir would rather '
        + 'give up provinces than feed this war.',
    },
    {
      tag: 'ROM',
      difficulty: 'Moderate',
      blurb: 'The greatest conquest in Roman history is one march from completion — and the '
        + 'rear of your empire is on fire from Cyrene to the Tigris. Every cohort sent to '
        + 'Egypt is a cohort not at Ctesiphon. Take the Parthian capital if you can, crush '
        + 'the risings you must, and decide — as Trajan never could — which victory Rome '
        + 'actually needs.',
    },
  ],

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // The Tigris kingdoms: Osrhoene has submitted to Trajan; Adiabene and
    // Characene ride with Parthia.
    if (g.tags.OSR) g.tags.OSR.overlord = 'ROM';
    for (const cl of ['ADI', 'CHX']) {
      if (g.tags[cl] && g.tags.PAR) g.tags[cl].overlord = 'PAR';
    }

    // --- Two wars at once: Trajan against Parthia, the diaspora against Rome. ---
    h.declareWar(ctx, 'ROM', 'PAR', "Trajan's Parthian War");
    h.declareWar(ctx, 'JUD', 'ROM', 'The Rising of the Diaspora');
    try {
      const w = findWar(g, 'JUD', 'ROM');
      if (w) w.noNegotiation = true; // settled by fire or by Hadrian, not by table
    } catch (e) { warnOnce('setup:war', e); }

    // --- Treasuries, manpower, stability. ---
    h.adjust(ctx, 'JUD', { treasury: 120, manpower: 6000, stability: 1, legitimacy: 15 });
    h.adjust(ctx, 'ROM', { treasury: 600, manpower: 30000, stability: 1, legitimacy: 40 });
    h.adjust(ctx, 'PAR', { treasury: 250, manpower: 8000, stability: -1 }); // Osroes' house divided
    h.adjust(ctx, 'ADI', { treasury: 40 });
    h.adjust(ctx, 'CHX', { treasury: 60 });
    h.adjust(ctx, 'OSR', { treasury: 30 });

    // --- Opinions. ---
    setOpinion(g, 'JUD', 'ROM', -190); setOpinion(g, 'ROM', 'JUD', -170);
    setOpinion(g, 'PAR', 'ROM', -160); setOpinion(g, 'ROM', 'PAR', -140);
    setOpinion(g, 'PAR', 'JUD', 70);   setOpinion(g, 'JUD', 'PAR', 70);
    setOpinion(g, 'ADI', 'JUD', 80);   setOpinion(g, 'JUD', 'ADI', 80); // the converted house remembers
    setOpinion(g, 'OSR', 'ROM', 40);
    setOpinion(g, 'CHX', 'ROM', -60);

    // --- Starting modifiers. ---
    h.addTagModifier(ctx, 'JUD', {
      id: 'messianic_fire', name: 'Messianic Fire', months: 30,
      effects: { moraleMult: 1.15, manpowerMult: 1.1 },
    });
    // Five theaters share a name, not a staff. Until the risings establish
    // reliable routes, local victories do not instantly become one field army.
    h.addTagModifier(ctx, 'JUD', {
      id: 'scattered_risings', name: 'Scattered Risings', months: 30,
      effects: { disciplineMult: 0.9, reinforceMult: 0.8, maintMult: 1.1 },
    });
    // Rome's field army is committed east; the rear must improvise for a season.
    h.addTagModifier(ctx, 'ROM', {
      id: 'committed_east', name: 'The Army Is East', months: 8,
      effects: { reinforceMult: 0.8 },
    });

    // --- Starting armies. ---
    // The risings: Artemion on Cyprus, the Oniad country in Egypt. Lukuas
    // arrives out of Cyrene by event (ev_k_lukuas).
    h.spawnArmy(ctx, 'JUD', 'Salamis', {
      inf: 7, name: 'Host of Artemion',
      general: { name: 'Artemion', fire: 1, shock: 3, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'JUD', 'Leontopolis', { inf: 4, name: 'Men of Onias' });

    // Rome: the eastern field army on the upper Tigris; thin garrisons behind.
    h.spawnArmy(ctx, 'ROM', 'Amida', {
      inf: 22, cav: 4, name: "Trajan's Field Army",
      general: { name: 'Trajan', fire: 3, shock: 4, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'ROM', 'Antioch', { inf: 5, name: 'Syrian Garrison' });
    h.spawnArmy(ctx, 'ROM', 'Alexandria', { inf: 4, name: 'Legio III Cyrenaica (rear)' });
    h.spawnArmy(ctx, 'ROM', 'Memphis', { inf: 3, name: 'Legio XXII Deiotariana' });
    h.spawnArmy(ctx, 'ROM', 'Jerusalem', { inf: 3, name: 'Garrison of Judaea' });
    h.spawnArmy(ctx, 'ROM', 'Bostra', { inf: 2, name: 'Arabia Garrison' });

    // Parthia: the royal army fallen back on the capital; the eastern reserve.
    h.spawnArmy(ctx, 'PAR', 'Seleucia-Ctesiphon', {
      inf: 14, cav: 10, name: 'Royal Army of Osroes',
      general: { name: 'Osroes I', fire: 2, shock: 3, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'PAR', 'Ecbatana', { inf: 5, cav: 4, name: 'Army of Media' });
    h.spawnArmy(ctx, 'ADI', 'Arbela', { inf: 5, name: 'Army of Adiabene' });
    h.spawnArmy(ctx, 'CHX', 'Charax', { inf: 3, name: 'Levy of Charax' });
    h.spawnArmy(ctx, 'OSR', 'Edessa', { inf: 4, name: "Abgar's Guard" });

    h.notify(ctx, {
      title: 'The Kitos War',
      text: 'Trajan drives on Ctesiphon — and behind the legions, from Cyprus to the '
        + 'Nile, the diaspora has risen under arms.',
      type: 'war', provName: 'Salamis',
    });
  },

  // Courts of August 115.
  rulers: {
    ROM: {
      name: 'Trajan', title: 'Emperor', gov: 3, infl: 2, mar: 5, age: 61,
      heir: { name: 'Hadrian', gov: 4, infl: 3, mar: 3, age: 39 },
    },
    JUD: { name: 'Lukuas', title: 'King of the Diaspora', gov: 1, infl: 3, mar: 4, age: 35 },
    PAR: { name: 'Osroes I', title: 'King of Kings', gov: 2, infl: 3, mar: 3, age: 52 },
    OSR: { name: 'Abgar VII', title: 'King of Osrhoene', gov: 2, infl: 3, mar: 1, age: 45 },
    ADI: { name: 'Meharaspes', title: 'King of Adiabene', gov: 2, infl: 2, mar: 2, age: 48 },
    CHX: { name: 'Attambelos VII', title: 'King of Characene', gov: 2, infl: 3, mar: 1, age: 50 },
  },

  missions: {
    JUD: [
      {
        id: 'k_cyprus', name: 'The Island Is Ours',
        desc: 'Hold all of Cyprus: Salamis and Paphos both.',
        rewardText: 'The copper mines: +75 talents.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Salamis') && ctx.helpers.controls(ctx, 'JUD', 'Paphos'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 75 }),
      },
      {
        id: 'k_alexandria', name: 'The Great City',
        desc: 'Take Alexandria, the second city of the world and the heart of the diaspora.',
        rewardText: '+15 legitimacy, +25 influence points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Alexandria'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 15, infl: 25 }),
      },
      {
        id: 'k_granary', name: 'Starve the Wolf',
        desc: 'Hold the Nile granaries: Athribis, Memphis and Arsinoe — Rome eats Egyptian bread.',
        rewardText: '"The Grain Withheld": Rome bleeds — +10 war score by event-score.',
        check: (ctx) => ['Athribis', 'Memphis', 'Arsinoe'].every((n) => ctx.helpers.controls(ctx, 'JUD', n)),
        reward: (ctx) => {
          try {
            const w = findWar(ctx.game, 'JUD', 'ROM');
            if (w) {
              if (!w.eventScore) w.eventScore = { att: 0, def: 0 };
              const side = (w.attackers || []).indexOf('JUD') >= 0 ? 'att' : 'def';
              w.eventScore[side] += 10;
            }
          } catch (e) { warnOnce('k_granary', e); }
        },
      },
      {
        id: 'k_rivers', name: 'Brothers Between the Rivers',
        desc: 'Raise the East: control Nehardea, the great Jewish town of Babylonia.',
        rewardText: 'Silver of the exilarchs: +100 talents, +2,000 manpower.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Nehardea'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { treasury: 100, manpower: 2000 }),
      },
      {
        id: 'k_outlive', name: 'Outlive the Conqueror',
        desc: 'Survive to the summer of 117 with the fire still burning (+10 war score or 5 provinces).',
        rewardText: '+20 legitimacy — the new emperor counts the cost.',
        check: (ctx) => dateGE(ctx.game.date, 117, 6)
          && (judWarscore(ctx) >= 10 || ctx.helpers.countControlled(ctx, 'JUD', {}) >= 5),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 20 }),
      },
    ],
    ROM: [
      {
        id: 'rk_alexandria', name: 'Hold the Granary',
        desc: 'Keep Alexandria Roman — lose the grain fleet and Rome itself goes hungry.',
        rewardText: '+25 government points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Alexandria') && dateGE(ctx.game.date, 116, 2),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { gov: 25 }),
      },
      {
        id: 'rk_cyprus', name: 'Retake the Island',
        desc: 'Take back Salamis — no Jew may set foot on Cyprus again, the decree will say.',
        rewardText: '+25 martial points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Salamis'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { mar: 25 }),
      },
      {
        id: 'rk_ctesiphon', name: 'Where Alexander Stood',
        desc: 'Take Seleucia-Ctesiphon, the winter seat of the King of Kings.',
        rewardText: '+20 legitimacy, +25 of every point: Parthicus.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Seleucia-Ctesiphon'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { legitimacy: 20, gov: 25, infl: 25, mar: 25 }),
      },
      {
        id: 'rk_quietus', name: "Quietus' Work",
        desc: 'Pacify Mesopotamia: control Nisibis, Singara and Edessa.',
        rewardText: '"The Moor\'s Methods": +1 siege bonus for 24 months.',
        check: (ctx) => ['Nisibis', 'Singara', 'Edessa'].every((n) => ctx.helpers.controls(ctx, 'ROM', n)),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'moors_methods', name: "The Moor's Methods", months: 24, effects: { siegeBonus: 1 },
        }),
      },
      {
        id: 'rk_quench', name: 'Quench the Fire',
        desc: 'Break the rising: reach +25 war score against the diaspora.',
        rewardText: '+1 stability.',
        check: (ctx) => {
          const w = findWar(ctx.game, 'JUD', 'ROM');
          return !!w && typeof w.warscore.ROM === 'number' && w.warscore.ROM >= 25;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { stability: 1 }),
      },
    ],
  },

  aiHints: {
    ROM: { rally: ['Antioch', 'Alexandria'], targetRegiments: 55 },
    JUD: { rally: ['Salamis', 'Leontopolis'], targetRegiments: 14 },
    PAR: { rally: ['Seleucia-Ctesiphon'], targetRegiments: 26 },
    OSR: { rally: ['Edessa'], targetRegiments: 4 },
    ADI: { rally: ['Arbela'], targetRegiments: 6 },
    CHX: { rally: ['Charax'], targetRegiments: 3 },
    REB: { rally: [], targetRegiments: 0 },
  },

  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;

      const judTag = g.tags && g.tags.JUD;
      const judAlive = !!(judTag && judTag.alive !== false);
      const judProvs = judAlive ? h.countControlled(ctx, 'JUD', {}) : 0;
      const ws = judWarscore(ctx);

      if (g.playerTag === 'JUD') {
        // Early concession (SPEC §32): the emperor's terms arrive at +40 as
        // an event card the player may accept or refuse. Offered once.
        if (ws >= 40 && !h.getFlag(ctx, 'romeTermsOffered')) {
          h.setFlag(ctx, 'romeTermsOffered', true);
          h.fireEvent(ctx, 'ev115_terms');
          return;
        }
        // Outlive Trajan: Hadrian buys peace in the East (August 117 on).
        if (dateGE(g.date, 118, 1) && judAlive && judProvs >= 3) {
          h.endGame(ctx, {
            result: 'win',
            title: "Hadrian's Price",
            text: 'The conqueror is dead at Selinus and his heir wants no eastern wars. '
              + 'Rome withdraws behind the Euphrates, and in the space it leaves, the '
              + 'communities of the rising still stand — armed, taxed by no procurator, '
              + 'remembering.',
            score: 150,
          });
          return;
        }
        if (!judAlive || (judProvs === 0 && totalMen(ctx, 'JUD') < 2000)) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Diaspora Broken',
            text: 'Cyrene is a wasteland, the synagogue of Alexandria is ash, and on '
              + 'Cyprus the decree stands: no Jew may land, even shipwrecked. The rising '
              + 'is remembered in three countries as the war of Quietus.',
            score: 0,
          });
          return;
        }
      } else if (g.playerTag === 'ROM') {
        if (!judAlive) {
          const early = !dateGE(g.date, 117, 8);
          h.endGame(ctx, {
            result: 'win',
            title: early ? 'The Rear Secured' : 'The War of Quietus',
            text: early
              ? 'The risings are broken while Trajan still holds the Tigris — the only '
                + 'general in Roman history to put down three provinces with one hand and '
                + 'take a capital with the other.'
              : 'It cost the eastern conquests and the last years of an emperor, but the '
                + 'fire is out. Quietus gets a province; the Senate gets the bill.',
            score: early ? 200 : 120,
          });
          return;
        }
        if (dateGE(g.date, 119, 1) && judProvs >= 4) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The East Lets Go',
            text: 'Two emperors, five provinces in revolt, and the granary of the empire '
              + 'still in rebel hands. Hadrian gives the order historians will argue about '
              + 'forever: withdraw, consolidate, forget.',
            score: 0,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
