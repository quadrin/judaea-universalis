// Judaea Universalis — bookmark: The Great Revolt, 66 CE (SPEC §9.1).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Historical spine: Josephus, Bellum Judaicum II–VII.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_66ce] ' + key, e || '');
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

// Manually fire an event by id (used for the ev_negotiated_peace flavor on the timed
// JUD win). Mirrors SPEC §6.5 firing semantics: push to pendingEvents, mark fired,
// pause + emit 'event' for the player.
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

export const BOOKMARK_66 = {
  id: '66ce',
  name: 'The Great Revolt',
  startDate: { y: 66, m: 6, d: 1 },

  blurb: 'The procurator Gessius Florus has taken seventeen talents from the Temple treasury, '
    + 'and Jerusalem has answered with stones, then with steel. In the Temple, the captain '
    + 'Eleazar moves to refuse every offering from a foreign hand; in Antioch the governor of '
    + 'Syria watches, and waits, and counts his legions. Four years of fire begin now.',

  playableTags: [
    {
      tag: 'JUD',
      difficulty: 'Hard',
      blurb: 'Hold the hills. Rome will come with sixty thousand men and all the patience of '
        + 'empire — but Cestius must cross Beth Horon, Galilee can be walled, and in three '
        + 'years Rome will be busy murdering its own emperors. Survive to 71 with Jerusalem '
        + 'and the Temple standing, and Vespasian may find a client king cheaper than a war.',
    },
    {
      tag: 'ROM',
      difficulty: 'Moderate',
      blurb: 'A tax riot has become a rebellion, and a rebellion unpunished is an empire '
        + 'unravelling. Reduce Galilee, close the ring on Jerusalem, and finish this before '
        + 'the succession crisis at home pulls your legions west. The Senate expects a triumph, '
        + 'not a stalemate.',
    },
  ],

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // --- The war: Judaea has risen; Agrippa's kingdom fights beside Rome. ---
    h.declareWar(ctx, 'JUD', 'ROM', 'The Great Revolt');
    try {
      const war = findJudRomWar(g);
      if (war) {
        const romSide = (war.attackers || []).indexOf('ROM') !== -1 ? war.attackers : war.defenders;
        if (Array.isArray(romSide) && romSide.indexOf('AGR') === -1) romSide.push('AGR');
        if (war.warscore && typeof war.warscore === 'object' && war.warscore.AGR === undefined) {
          war.warscore.AGR = 0;
        }
      }
      const agr = g.tags.AGR, jud = g.tags.JUD, rom = g.tags.ROM;
      if (agr && jud) {
        if (Array.isArray(agr.atWarWith) && agr.atWarWith.indexOf('JUD') === -1) agr.atWarWith.push('JUD');
        if (Array.isArray(jud.atWarWith) && jud.atWarWith.indexOf('AGR') === -1) jud.atWarWith.push('AGR');
      }
      if (agr && rom) {
        if (Array.isArray(agr.allies) && agr.allies.indexOf('ROM') === -1) agr.allies.push('ROM');
        if (Array.isArray(rom.allies) && rom.allies.indexOf('AGR') === -1) rom.allies.push('AGR');
      }
    } catch (e) { warnOnce('setup:agrJoin', e); }

    // --- Treasuries, manpower, stability, legitimacy (deltas via helpers.adjust). ---
    // JUD: the Temple treasury as a war chest; euphoric but institutionally shaky.
    h.adjust(ctx, 'JUD', { treasury: 150, manpower: 5000, stability: 1, legitimacy: 10 });
    // ROM: far richer, but the east is a sideshow — for now.
    h.adjust(ctx, 'ROM', { treasury: 400, manpower: 20000, stability: 1, legitimacy: 30 });
    h.adjust(ctx, 'AGR', { treasury: 40, legitimacy: 20 });
    h.adjust(ctx, 'NAB', { treasury: 80, stability: 1 });
    h.adjust(ctx, 'PAR', { treasury: 200, stability: 1, legitimacy: 20 });
    h.adjust(ctx, 'ARM', { treasury: 30 });

    // --- Opinions. PAR–ROM hostile; NAB and AGR pro-Roman; PAR quietly sympathetic. ---
    setOpinion(g, 'JUD', 'ROM', -180); setOpinion(g, 'ROM', 'JUD', -150);
    setOpinion(g, 'PAR', 'ROM', -120); setOpinion(g, 'ROM', 'PAR', -100);
    setOpinion(g, 'NAB', 'ROM', 100);  setOpinion(g, 'ROM', 'NAB', 75);
    setOpinion(g, 'NAB', 'JUD', -60);
    setOpinion(g, 'AGR', 'ROM', 150);  setOpinion(g, 'ROM', 'AGR', 150);
    setOpinion(g, 'AGR', 'JUD', -50);  setOpinion(g, 'JUD', 'AGR', -75);
    setOpinion(g, 'PAR', 'JUD', 40);   setOpinion(g, 'JUD', 'PAR', 60);
    // Post-Rhandeia: Tiridates was crowned by Nero weeks before the start date —
    // Armenia is formally amicable with Rome while remaining an Arsacid house.
    setOpinion(g, 'ARM', 'ROM', 15);  setOpinion(g, 'ARM', 'PAR', 40);

    // --- Starting modifiers. ---
    h.addTagModifier(ctx, 'JUD', {
      id: 'religious_fervor', name: 'Religious Fervor', months: 36,
      effects: { moraleMult: 1.15 },
    });
    // Cestius waits on events at Antioch; ev_cestius_marches (66-10) removes this.
    // Months 6 is a safety net in case the event chain is disturbed.
    h.addTagModifier(ctx, 'ROM', {
      id: 'governor_hesitates', name: 'The Governor Hesitates', months: 6,
      effects: { aiPassive: true },
    });

    // --- Starting armies & generals (Josephus, BJ II). ---
    // Judaea: the city host, Josephus' Galilee command, militia bits. Masada's Sicarii
    // arrive via ev_menahem.
    h.spawnArmy(ctx, 'JUD', 'Jerusalem', {
      inf: 13, cav: 2, name: 'Host of Jerusalem',
      general: { name: 'Eleazar ben Simon', fire: 2, shock: 3, maneuver: 1 },
    });
    h.spawnArmy(ctx, 'JUD', 'Jotapata', {
      inf: 8, name: 'Army of Galilee',
      general: { name: 'Josephus ben Matthias', fire: 1, shock: 2, maneuver: 4 },
    });
    h.spawnArmy(ctx, 'JUD', 'Tarichaea', { inf: 2, name: 'Galilean Militia' });
    h.spawnArmy(ctx, 'JUD', 'Gadora', { inf: 1, name: 'Men of Perea' });

    // Rome: Cestius Gallus with the Twelfth at Antioch; coastal garrisons; Egypt quiet.
    h.spawnArmy(ctx, 'ROM', 'Antioch', {
      inf: 15, cav: 3, name: 'Legio XII Fulminata',
      general: { name: 'Cestius Gallus', fire: 1, shock: 1, maneuver: 1 },
    });
    h.spawnArmy(ctx, 'ROM', 'Caesarea Maritima', { inf: 3, name: 'Caesarea Garrison' });
    h.spawnArmy(ctx, 'ROM', 'Scythopolis', { inf: 2, name: 'Scythopolis Garrison' });
    h.spawnArmy(ctx, 'ROM', 'Alexandria', {
      inf: 4, name: 'Legio III Cyrenaica',
      general: { name: 'Tiberius Julius Alexander', fire: 2, shock: 2, maneuver: 2 },
    });

    // Agrippa II: a small royal army, at war on Rome's side.
    h.spawnArmy(ctx, 'AGR', 'Caesarea Philippi', {
      inf: 3, cav: 1, name: "Agrippa's Royal Army",
      general: { name: 'Philip ben Jacimus', fire: 1, shock: 2, maneuver: 2 },
    });

    // Neutral powers keep token forces at home.
    h.spawnArmy(ctx, 'NAB', 'Petra', { inf: 4, cav: 2, name: 'Army of Malichus II' });
    h.spawnArmy(ctx, 'PAR', 'Seleucia-Ctesiphon', {
      inf: 12, cav: 8, name: 'Royal Army of Parthia',
      general: { name: 'Monaeses', fire: 2, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'ARM', 'Tigranocerta', { inf: 3, name: 'Army of Armenia' });

    h.setFlag(ctx, 'cestiusMen0', 18000);

    h.notify(ctx, {
      title: 'The Great Revolt',
      text: 'Jerusalem has risen against Rome. The sacrifices for Caesar have ceased, and the '
        + 'governor of Syria gathers his legion at Antioch.',
      type: 'war', provName: 'Jerusalem',
    });
  },

  aiHints: {
    ROM: { rally: ['Antioch', 'Caesarea Maritima'], targetRegiments: 45 },
    JUD: { rally: ['Jerusalem', 'Jotapata'], targetRegiments: 28 },
    AGR: { rally: ['Caesarea Philippi'], targetRegiments: 5 },
    NAB: { rally: ['Petra'], targetRegiments: 8 },
    PAR: { rally: ['Seleucia-Ctesiphon'], targetRegiments: 22 },
    ARM: { rally: ['Tigranocerta'], targetRegiments: 4 },
    REB: { rally: [], targetRegiments: 0 },
  },

  // Victory rules (SPEC §9.1), checked monthly; game.over stops further checks.
  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return; // result stays set after "continue observing"

      const judTag = g.tags && g.tags.JUD;
      const judAlive = !!(judTag && judTag.alive !== false);
      const judProvs = judAlive ? h.countControlled(ctx, 'JUD', {}) : 0;
      const jerusalemHeld = judAlive && h.controls(ctx, 'JUD', 'Jerusalem');
      const ws = judWarscore(ctx);

      if (g.playerTag === 'JUD') {
        // Early win: Rome bleeds white.
        if (ws >= 50) {
          fireEventById(ctx, 'ev_negotiated_peace');
          h.endGame(ctx, {
            result: 'win',
            title: 'Rome Sues for Peace',
            text: 'The legions are broken and the east is in flames. Rather than feed another '
              + 'army into the Judean hills, the emperor grants Judaea its own king, its own '
              + 'Law, and its Temple. No shekel of tribute was ever better spent than the '
              + 'blood at Beth Horon.',
            score: 200,
          });
          return;
        }
        // Timed win: on (or after) 1 January 71, Jerusalem plus a living Jewish heartland.
        // If the House burned during a Roman interlude, the win stands but the text
        // and score must not pretend otherwise.
        if (dateGE(g.date, 71, 1) && jerusalemHeld
            && h.countControlled(ctx, 'JUD', { religion: 'judaism' }) >= 6) {
          const burned = !!h.getFlag(ctx, 'templeBurned');
          fireEventById(ctx, 'ev_negotiated_peace');
          h.endGame(ctx, {
            result: 'win',
            title: burned ? 'A Peace Among Ashes' : 'A Negotiated Peace',
            text: burned
              ? 'Vespasian is secure on his throne and counting the cost of a fifth year of '
                + 'war. A client Judaea — tributary, disarmed at the frontiers, but standing — '
                + 'is cheaper than three legions in perpetuity. The city is held; the sanctuary '
                + 'is in ashes. On the Temple Mount, men clear the stones and remember.'
              : 'Vespasian is secure on his throne and counting the cost of a fifth year of '
                + 'war. A client Judaea — tributary, disarmed at the frontiers, but standing — '
                + 'is cheaper than three legions in perpetuity. The Temple stands. The war ends.',
            score: burned ? 100 : 150,
          });
          return;
        }
        // Losses.
        if (judProvs === 0) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'Judaea Capta',
            text: 'The last stronghold has fallen. In Rome they will strike a coin: a woman '
              + 'weeping beneath a palm tree, a soldier standing over her. IVDAEA CAPTA.',
            score: 0,
          });
          return;
        }
        if (!jerusalemHeld && totalMen(ctx, 'JUD') < 3000) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Lamps Go Out',
            text: 'Jerusalem is lost and the field armies are gone; what remains is a handful '
              + 'of men on desert rocks, and the long memory of a people. At Yavneh, the sages '
              + 'begin again.',
            score: Math.max(0, judProvs * 5),
          });
          return;
        }
      } else if (g.playerTag === 'ROM') {
        if (judProvs === 0) {
          const early = g.date.y < 70;
          h.endGame(ctx, {
            result: 'win',
            title: early ? 'A Triumph in Rome' : 'Judaea Capta',
            text: early
              ? 'The revolt is crushed before the empire even trembled. The Senate votes a '
                + 'triumph: the spoils of the Temple carried up the Sacred Way, and the arch '
                + 'to prove it forever.'
              : 'It took years and legions, but the rebellion is ended and the east is quiet. '
                + 'The mint strikes IVDAEA CAPTA in bronze, silver, and gold.',
            score: early ? 200 : 120,
          });
          return;
        }
        if (dateGE(g.date, 74, 1) && jerusalemHeld) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The East in Flames',
            text: 'Eight years, and Jerusalem still stands defiant behind its walls while '
              + 'Parthia arms and the provinces whisper. The emperor recalls his commanders '
              + 'in disgrace and accepts what no Roman will call a defeat — aloud.',
            score: 0,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
