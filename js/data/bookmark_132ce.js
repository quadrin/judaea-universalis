// Judaea Universalis — bookmark: The Bar Kokhba Revolt, 132 CE (SPEC §13, §14).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Historical spine: Cassius Dio LXIX; the Murabbaʿat and Naḥal Ḥever letters;
// rabbinic tradition on Akiva and Betar. Sixty years after the Temple burned,
// Hadrian ploughs the Temple Mount for Aelia Capitolina — and Judea rises as a
// planned, disciplined state under Simon bar Kosiba, "Prince of Israel".

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_132ce] ' + key, e || '');
}

function findJudRomWar(game) {
  const wars = (game && game.wars) || [];
  for (const w of wars) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf('JUD') !== -1 && all.indexOf('ROM') !== -1) return w;
  }
  return null;
}

function judWarscore(ctx) {
  try {
    const w = findJudRomWar(ctx.game);
    if (!w || !w.warscore || typeof w.warscore !== 'object') return 0;
    const v = w.warscore.JUD;
    return typeof v === 'number' ? v : 0;
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

// Manually fire an event by id (win flavor). Mirrors SPEC §6.5 firing semantics.
function fireEventById(ctx, eventId) {
  try {
    const g = ctx.game;
    const list = ctx.events || [];
    let ev = null;
    for (const e of list) { if (e && e.id === eventId) { ev = e; break; } }
    if (!ev) { warnOnce('fireEventById: unknown ' + eventId); return; }
    if (g.firedEvents && g.firedEvents[eventId]) return;
    if (g.firedEvents) g.firedEvents[eventId] = true;
    const instanceId = g.nextEventInstance++;
    g.pendingEvents.push({ instanceId, eventId, forTag: ev.forTag });
    const playerFacing = ev.forTag === 'player' || ev.forTag === 'both' || ev.forTag === g.playerTag;
    if (playerFacing) {
      g.paused = true;
      if (ctx.bus) {
        ctx.bus.emit('event', { instanceId, event: ev, forTag: ev.forTag });
        ctx.bus.emit('pause', true);
      }
    }
  } catch (e) { warnOnce('fireEventById', e); }
}

export const BOOKMARK_132 = {
  id: '132ce',
  name: 'The Bar Kokhba Revolt',
  startDate: { y: 132, m: 4, d: 1 },
  // Technology of the age (SPEC §22): Hadrian's legions at their zenith.
  techBase: 5,
  techTweaks: { ROM: { mar: 2, gov: 1 }, PAR: { mar: 1 } },

  blurb: 'Sixty years after the Temple burned, Hadrian has ploughed the sacred hill for a '
    + 'colony named Aelia Capitolina, with a temple of Jupiter where the House once stood. '
    + 'This time there is no improvised uprising: Simon bar Kosiba has spent years hollowing '
    + 'the hills with hideouts and armories, and when the legions\' backs are turned, Judea '
    + 'rises as one — with a prince, an administration, and coins that read "Year One of '
    + 'the Redemption of Israel."',

  activeTags: ['ROM', 'JUD', 'PAR', 'ARM', 'OSR', 'ADI', 'CHX'],

  // Political layer for 132 CE over map_data's 66 CE defaults. Nabataea has
  // been Provincia Arabia since 106; Agrippa's kingdom is long absorbed; the
  // rising holds the Judean hill country while Rome keeps the cities, the
  // coast, Galilee (which does not rise), and the fortresses.
  // The Second Temple burned in 70 CE — the Mount stands bare (SPEC §32).
  wonderTweaks: { Jerusalem: null },
  owners: {
    // -- The rising (JUD): the Judean hills and the rift edge ------------------
    'Hebron': 'JUD',
    'Adora': 'JUD',
    'Emmaus': 'JUD',
    'Lydda': 'JUD',
    'Jericho': 'JUD',
    'Engaddi': 'JUD',
    'Gadora': 'JUD',
    // -- Judea & Galilee under Rome (Aelia, the coast, the lake towns) ---------
    'Jerusalem': 'ROM',
    'Joppa': 'ROM',
    'Masada': 'ROM',
    'Machaerus': 'ROM',
    'Sepphoris': 'ROM',
    'Jotapata': 'ROM',
    'Tiberias': 'ROM',
    'Tarichaea': 'ROM',
    'Gischala': 'ROM',
    // -- The former kingdom of Agrippa II (absorbed ~93 CE) --------------------
    'Caesarea Philippi': 'ROM',
    'Batanea': 'ROM',
    'Gamala': 'ROM',
    // -- Provincia Arabia (Nabataea annexed 106 CE) ----------------------------
    'Petra': 'ROM',
    'Bostra': 'ROM',
    'Oboda': 'ROM',
    'Aila': 'ROM',
    'Hegra': 'ROM',
    'Dumatha': 'ROM',
    'Medaba': 'ROM',
    // PAR and ARM keep their map_data holdings.
  },

  playableTags: [
    {
      tag: 'JUD',
      difficulty: 'Very Hard',
      blurb: 'You are not a mob; you are a state in hiding. Two legions are in the province '
        + 'and one of them can be destroyed before Rome understands what has begun. Take '
        + 'Aelia — Jerusalem — relight the altar, and dig in: Hadrian will send his best '
        + 'general from Britain and try to starve the hills stone by stone. Hold Jerusalem '
        + 'and the heartland to 136, and even Rome may prefer a tributary prince to a '
        + 'second desert.',
    },
    {
      tag: 'ROM',
      difficulty: 'Moderate',
      blurb: 'Dio will write that this was no small war: fifty fortresses, near a thousand '
        + 'villages, and legions mauled badly enough that Hadrian dropped the customary '
        + '"I and the army are well" from his letters to the Senate. Contain the rising, '
        + 'wait for Julius Severus, then reduce the hills the slow way — every cistern, '
        + 'every cave. Rome does not lose provinces. See that it stays true.',
    },
  ],

  // Courts of 132 CE.
  rulers: {
    ROM: { name: 'Hadrian', title: 'Emperor', gov: 4, infl: 3, mar: 3, age: 56 },
    JUD: { name: 'Simon bar Kosiba', title: 'Nasi Israel', gov: 2, infl: 3, mar: 5, age: 45 },
    PAR: { name: 'Vologases III', title: 'King of Kings', gov: 2, infl: 3, mar: 2, age: 50 },
    ARM: { name: 'Vologases of Armenia', title: 'King', gov: 2, infl: 2, mar: 2, age: 40 },
  },

  // Linear mission chains (realm panel).
  missions: {
    JUD: [
      {
        id: 'j2_host', name: 'The Prince\'s Host',
        desc: 'Field fifteen thousand men — the hideouts and armories were dug for this.',
        rewardText: '"The Nasi\'s Levies": +10% manpower for 24 months.',
        check: (ctx) => totalMen(ctx, 'JUD') >= 15000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'JUD', {
          id: 'nasi_levies', name: 'The Nasi\'s Levies', months: 24, effects: { manpowerMult: 1.1 },
        }),
      },
      {
        id: 'j2_maul', name: 'Maul the Legions',
        desc: 'Reach +10 war score against Rome.',
        rewardText: '+25 martial points.',
        check: (ctx) => judWarscore(ctx) >= 10,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { mar: 25 }),
      },
      {
        id: 'j2_aelia', name: 'Aelia Undone',
        desc: 'Take Jerusalem from the colony builders.',
        rewardText: '+20 legitimacy, +25 governance points — the coins are struck in the city itself.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 20, gov: 25 }),
      },
      {
        id: 'j2_galilee', name: 'Galilee Rises',
        desc: 'Carry the revolt north: take Sepphoris and Tiberias.',
        rewardText: 'The north sends its sons: +2,000 manpower.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Sepphoris') && ctx.helpers.controls(ctx, 'JUD', 'Tiberias'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JUD', { manpower: 2000 }),
      },
      {
        id: 'j2_redemption', name: 'The Redemption of Israel',
        desc: 'Reach +25 war score — make Rome count the cost aloud.',
        rewardText: '"Redemption Coinage": +15% income permanently, +15 legitimacy.',
        check: (ctx) => judWarscore(ctx) >= 25,
        reward: (ctx) => {
          ctx.helpers.addTagModifier(ctx, 'JUD', {
            id: 'redemption_coinage', name: 'Redemption Coinage', months: -1, effects: { incomeMult: 1.15 },
          });
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 15 });
        },
      },
      {
        // SPEC §32: the bare Mount can bear a House again. Bar Kokhba's
        // coins showed the Temple facade — this is what they promised.
        id: 'j2_third_temple', name: 'Raise the Third House',
        desc: 'Hold Jerusalem with 500 talents in the treasury and the realm steady (stability +1) — the House the coins promised.',
        rewardText: 'The Third Temple rises: −300 talents; +20 legitimacy, and the Temple\'s yield (+1 governance point, +0.2 legitimacy a month) returns to Jerusalem\'s keeper. A wonder stands on the map again.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')
          && (ctx.game.tags.JUD.treasury || 0) >= 500
          && (ctx.game.tags.JUD.stability || 0) >= 1,
        reward: (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { treasury: -300, legitimacy: 20 });
          const p = ctx.prov && ctx.prov('Jerusalem');
          if (p) p.wonder = 'temple';
        },
      },
    ],
    ROM: [
      {
        id: 'r2_contain', name: 'Contain the Rising',
        desc: 'Stop the bleeding: reach +10 war score against the rebels.',
        rewardText: '+25 martial points.',
        check: (ctx) => {
          const w = findJudRomWar(ctx.game);
          return !!w && typeof w.warscore.ROM === 'number' && w.warscore.ROM >= 10;
        },
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { mar: 25 }),
      },
      {
        id: 'r2_shephelah', name: 'Clear the Shephelah',
        desc: 'Take Emmaus and Lydda; the coast road must run without escort.',
        rewardText: 'Confiscations: +100 talents.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Emmaus') && ctx.helpers.controls(ctx, 'ROM', 'Lydda'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { treasury: 100 }),
      },
      {
        id: 'r2_hills', name: 'Into the Hills',
        desc: 'Take Hebron and Adora, the rising\'s southern anchor.',
        rewardText: '"The Severan Method": +1 siege bonus for 24 months.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ROM', 'Hebron') && ctx.helpers.controls(ctx, 'ROM', 'Adora'),
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'severan_method', name: 'The Severan Method', months: 24, effects: { siegeBonus: 1 },
        }),
      },
      {
        id: 'r2_muster', name: 'The Empire Answers',
        desc: 'Field forty thousand men in the East.',
        rewardText: '"Detachments of Every Army": +5% discipline for 12 months.',
        check: (ctx) => totalMen(ctx, 'ROM') >= 40000,
        reward: (ctx) => ctx.helpers.addTagModifier(ctx, 'ROM', {
          id: 'every_army', name: 'Detachments of Every Army', months: 12, effects: { disciplineMult: 1.05 },
        }),
      },
      {
        id: 'r2_rift', name: 'Seal the Rift',
        desc: 'Take Jericho, Engaddi and Gadora; nothing must cross the Jordan or reach the caves.',
        rewardText: '+1 stability.',
        check: (ctx) => ['Jericho', 'Engaddi', 'Gadora'].every((n) => ctx.helpers.controls(ctx, 'ROM', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ROM', { stability: 1 }),
      },
    ],
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // The Tigris kingdoms ride in Parthia's train (v2.1): clients of the
    // King of Kings, paying tribute, joining his wars through sameSide.
    for (const cl of ['OSR', 'ADI', 'CHX']) {
      if (g.tags[cl] && g.tags.PAR) g.tags[cl].overlord = 'PAR';
    }

    // --- The war. It ends by the sword or by events, never at the peace table. ---
    h.declareWar(ctx, 'JUD', 'ROM', 'The Bar Kokhba Revolt');
    try {
      const war = findJudRomWar(g);
      if (war) war.noNegotiation = true;
    } catch (e) { warnOnce('setup:war', e); }

    // --- Treasuries, manpower, stability, legitimacy. -------------------------
    // JUD: an organized state-in-waiting — coined money, stores, discipline.
    h.adjust(ctx, 'JUD', { treasury: 120, manpower: 6000, stability: 1, legitimacy: 15 });
    h.adjust(ctx, 'ROM', { treasury: 500, manpower: 25000, stability: 2, legitimacy: 40 });
    h.adjust(ctx, 'PAR', { treasury: 180, stability: 1, legitimacy: 20 });
    h.adjust(ctx, 'ARM', { treasury: 30 });

    // --- Opinions. Parthia watches with interest; Armenia balances. -----------
    setOpinion(g, 'JUD', 'ROM', -190); setOpinion(g, 'ROM', 'JUD', -170);
    setOpinion(g, 'PAR', 'ROM', -80);  setOpinion(g, 'ROM', 'PAR', -70);
    setOpinion(g, 'PAR', 'JUD', 30);   setOpinion(g, 'JUD', 'PAR', 50);
    setOpinion(g, 'ARM', 'ROM', 20);   setOpinion(g, 'ARM', 'PAR', 30);

    // --- Starting modifiers. ---------------------------------------------------
    // Years of preparation: hidden armories, tunnels, a real chain of command.
    h.addTagModifier(ctx, 'JUD', {
      id: 'messianic_fervor', name: 'Messianic Fervor', months: 36,
      effects: { moraleMult: 1.2 },
    });
    h.addTagModifier(ctx, 'JUD', {
      id: 'hidden_armories', name: 'Hidden Armories', months: 24,
      effects: { reinforceMult: 1.25 },
    });
    // The emperor is far away and the first response is provincial.
    h.addTagModifier(ctx, 'ROM', {
      id: 'provincial_response', name: 'A Provincial Response', months: 14,
      effects: { reinforceMult: 0.75 },
    });

    // --- Starting armies & generals. -------------------------------------------
    h.spawnArmy(ctx, 'JUD', 'Hebron', {
      inf: 10, cav: 1, name: 'Host of Israel',
      general: { name: 'Simon bar Kosiba', fire: 3, shock: 4, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'JUD', 'Emmaus', {
      inf: 5, name: 'Men of the Shephelah',
      general: { name: 'Yehonatan bar Baayan', fire: 2, shock: 2, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'JUD', 'Jericho', { inf: 3, name: 'Zealots of the Rift' });
    h.spawnArmy(ctx, 'JUD', 'Gadora', { inf: 2, name: 'Men of Perea' });

    h.spawnArmy(ctx, 'ROM', 'Jerusalem', {
      inf: 8, cav: 1, name: 'Legio X Fretensis',
      general: { name: 'Tineius Rufus', fire: 1, shock: 2, maneuver: 1 },
    });
    h.spawnArmy(ctx, 'ROM', 'Sepphoris', {
      inf: 7, name: 'Legio VI Ferrata',
      general: { name: 'Lollius Urbicus', fire: 2, shock: 2, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'ROM', 'Caesarea Maritima', { inf: 3, name: 'Caesarea Garrison' });
    h.spawnArmy(ctx, 'ROM', 'Bostra', { inf: 4, name: 'Legio III Cyrenaica' });
    h.spawnArmy(ctx, 'ROM', 'Antioch', { inf: 4, name: 'Syrian Vexillations' });

    h.spawnArmy(ctx, 'PAR', 'Seleucia-Ctesiphon', {
      inf: 10, cav: 8, name: 'Royal Army of Parthia',
    });
    h.spawnArmy(ctx, 'ARM', 'Tigranocerta', { inf: 3, name: 'Army of Armenia' });

    h.notify(ctx, {
      title: 'The Bar Kokhba Revolt',
      text: 'Judea rises as one man. The hill country is already lost to Rome, the roads are '
        + 'cut, and the rebels strike coins for the Redemption of Israel.',
      type: 'war', provName: 'Hebron',
    });
  },

  aiHints: {
    ROM: { rally: ['Caesarea Maritima', 'Antioch'], targetRegiments: 50 },
    JUD: { rally: ['Hebron', 'Emmaus'], targetRegiments: 24 },
    PAR: { rally: ['Seleucia-Ctesiphon'], targetRegiments: 22 },
    ARM: { rally: ['Tigranocerta'], targetRegiments: 4 },
    OSR: { rally: ['Edessa'], targetRegiments: 5 },
    ADI: { rally: ['Arbela'], targetRegiments: 7 },
    CHX: { rally: ['Charax'], targetRegiments: 4 },
    REB: { rally: [], targetRegiments: 0 },
  },

  // Victory rules, checked monthly; game.over stops further checks.
  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;

      const judTag = g.tags && g.tags.JUD;
      const judAlive = !!(judTag && judTag.alive !== false);
      const judProvs = judAlive ? h.countControlled(ctx, 'JUD', {}) : 0;
      const jerusalemHeld = judAlive && h.controls(ctx, 'JUD', 'Jerusalem');
      const ws = judWarscore(ctx);

      if (g.playerTag === 'JUD') {
        // Early concession (SPEC §32): Hadrian's offer arrives at +50 as an
        // event card the player may accept or refuse. Offered once.
        if (ws >= 50 && !h.getFlag(ctx, 'romeTermsOffered')) {
          h.setFlag(ctx, 'romeTermsOffered', true);
          h.fireEvent(ctx, 'ev132_terms');
          return;
        }
        if (dateGE(g.date, 136, 1) && jerusalemHeld
            && h.countControlled(ctx, 'JUD', { religion: 'judaism' }) >= 6) {
          fireEventById(ctx, 'ev2_redemption_peace');
          h.endGame(ctx, {
            result: 'win',
            title: 'The Redemption of Israel',
            text: 'Four campaigning seasons, and the standards still cannot stay in the hills '
              + 'through a winter. Rome keeps the coast and calls it victory; in Jerusalem the '
              + 'Nasi keeps the city, the Law, and the mint. The coins of Year Four read: '
              + '"For the Freedom of Jerusalem."',
            score: 150,
          });
          return;
        }
        if (judProvs === 0) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'Syria Palaestina',
            text: 'Betar has fallen, and the last letters lie unread in the caves above the '
              + 'Dead Sea. Hadrian ploughs the name of Judea from the map as he once ploughed '
              + 'the Temple Mount: the province will be called Syria Palaestina, and Jews may '
              + 'enter Aelia one day in the year, to weep.',
            score: 0,
          });
          return;
        }
        if (!jerusalemHeld && judProvs <= 2 && totalMen(ctx, 'JUD') < 2500) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Last Letters',
            text: '"From Simon bar Kosiba to the men of En-gedi: you sit, eat and drink from '
              + 'the property of the house of Israel, and care nothing for your brothers." '
              + 'The letters stop. The caves keep them for eighteen centuries.',
            score: Math.max(0, judProvs * 5),
          });
          return;
        }
      } else if (g.playerTag === 'ROM') {
        if (judProvs === 0) {
          const early = g.date.y < 135;
          h.endGame(ctx, {
            result: 'win',
            title: early ? 'Swift and Merciless' : 'Syria Palaestina',
            text: early
              ? 'The rising is broken before it can dig in, and the province learns the price '
                + 'of testing Hadrian. The Senate is told, correctly, that the emperor and the '
                + 'army are well.'
              : 'Fifty fortresses razed, near a thousand villages, and at the end Betar. The '
                + 'province is renamed Syria Palaestina and salted with garrisons. It is a '
                + 'victory; no one in the East mistakes it for a cheap one.',
            score: early ? 200 : 120,
          });
          return;
        }
        if (dateGE(g.date, 137, 1) && (jerusalemHeld || judProvs >= 10)) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The East Slips',
            text: 'Five years, the best general of the age, and the hills still answer to the '
              + 'Nasi — while Parthia arms on the Euphrates and every governor east of Byzantium '
              + 'writes the same nervous letter. Hadrian, dying at Baiae, orders the standards '
              + 'home and forbids the Senate to speak of it.',
            score: 0,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
