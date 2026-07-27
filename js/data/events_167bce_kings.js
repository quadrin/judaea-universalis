// Judaea Universalis — event chain: the royal century, 103–67 BCE (SPEC §106).
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_167 by the era registry. BCE years are
// negative; every effects() body is guarded so nothing can throw in the tick.
//
// The 167 chain carries the revolt magnificently and then thins out exactly
// where the state it made becomes a kingdom. It has Hyrcanus dying full of
// years, Aristobulus taking the diadem, Salome opening the prisons and
// crowning Jannaeus — and then, for a twenty-seven-year reign, three cards:
// the citrons at the altar, the Seleucid king the rebels invited, and the
// eight hundred crosses. The wars are missing. And Salome Alexandra, the only
// woman ever to rule this kingdom and the only Hasmonean to die in bed with
// the country at peace, is CROWNED by the deathbed card and then has nothing
// happen in her nine years at all — the chain simply stops, four hundred
// years of dynasty ending in a flag.
//
// This is that century: the wars that nearly ended the kingdom in its second
// year, the sieges that made it the largest Jewish state between Solomon and
// the twentieth century, the queen's peace and what it was actually made of,
// and the quarrel between her sons that hands the whole thing to the 67 BCE
// chapter — where Pompey is already marching, and where this bookmark's story
// has always secretly ended.
//
// Source spine: Josephus, Antiquitates XIII.324–XIV.79 and Bellum I.85–130;
// the rabbinic material on Simeon ben Shetach and on the queen (b. Ta'anit
// 23a, b. Berakhot 48a) with the caution it deserves; Strabo XVI on the
// Nabataeans; the Qumran pesharim for the Lion of Wrath, which the chain
// already names.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_167bce_kings] ' + key, e || '');
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

// Works for negative (BCE) years: -165 > -166.
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

function findWar(game, a, b) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(a) !== -1 && all.indexOf(b) !== -1) return w;
  }
  return null;
}

function clearTruce(ctx, a, b) {
  const g = ctx.game;
  if (!g.truces) return;
  delete g.truces[a < b ? a + '|' + b : b + '|' + a];
}

// Spawn at the first listed province the tag actually holds — by the nineties
// the map has been rearranged by thirty years of campaigning.
function spawnAt(ctx, tag, provNames, opts) {
  for (const n of provNames) {
    if (ctx.helpers.controls(ctx, tag, n)) return ctx.helpers.spawnArmy(ctx, tag, n, opts);
  }
  return null;
}

// A rebel host stands wherever there is ground, not where "its" tag holds
// something: REB controls nothing, so the ordinary spawnAt (which tests
// control) silently spawns nothing at all.
function spawnRebels(ctx, provNames, opts) {
  if (!alive(ctx, 'REB')) return null;
  for (const n of provNames) {
    const p = ctx.prov(n);
    if (!p || p.impassable) continue;
    const id = ctx.helpers.spawnArmy(ctx, 'REB', n, opts);
    if (id) return n;
  }
  return null;
}

// Occupation is not possession (SPEC §108): a province we are standing in
// during a war may go straight back at the peace table.
function holds(ctx, tag, name) {
  try {
    const p = ctx.prov(name);
    return !!p && !p.impassable && p.owner === tag && p.controller === tag;
  } catch (e) { warnOnce('holds', e); return false; }
}

function stir(ctx, names, mod) {
  for (const n of names) ctx.helpers.addProvinceModifier(ctx, n, mod);
}

// The kingdom, whatever it is calling itself: a long campaign may have formed
// a greater crown, and these cards belong to whoever is sitting in Jerusalem.
function crown(ctx) {
  if (alive(ctx, 'HAS')) return 'HAS';
  if (alive(ctx, 'MLI')) return 'MLI';
  return null;
}

// The queen's own reign: crowned by the existing deathbed card, either
// reconciled with the Pharisees or not.
function queenRules(ctx) {
  return !!crown(ctx) && (flag(ctx, 'queensPeace') || flag(ctx, 'queenRulesAsJannaeus'));
}

export const EVENTS_167_KINGS = [

  // ═══ THE WARS OF ALEXANDER JANNAEUS, 103–93 ══════════════════════════════

  // ── K1 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_asophon',
    title: 'The Cypriot King Lands at Sycamina',
    desc: 'The new king is twenty-three and opens his reign by besieging Ptolemais, '
      + 'which is the sort of thing a Hasmonean does in his first season. Ptolemais '
      + 'sends to Cyprus. What answers is Ptolemy Lathyrus — a king his own mother '
      + 'threw out of Egypt and who has been waiting six years for a war worth '
      + 'having — with thirty thousand men and the professional habits of a '
      + 'Macedonian army. Jannaeus, caught between wanting the city and not wanting '
      + 'Lathyrus, does the thing that ruins him: he makes a treaty with Lathyrus in '
      + 'public and writes to Cleopatra in private, and Lathyrus finds the letter. '
      + 'They meet at Asophon on the Jordan. Josephus says thirty thousand Judaeans '
      + 'die there, and then Lathyrus goes through the villages of the country doing '
      + 'the thing that gets written down in every chronicle and believed in none of '
      + 'them. The kingdom of Judaea, eight years after it started calling itself a '
      + 'kingdom, has no army in the field.',
    forTag: 'HAS',
    minYear: -103,
    maxYear: -99,
    trigger: safeTrigger('ev_k_asophon', (ctx) =>
      !!crown(ctx) && flag(ctx, 'jannaeusKing') && dateGE(ctx, -103, 6)),
    major: true,
    aiOption: 0,
    historical: 'Jannaeus fought Lathyrus at Asophon and lost his army; the country was open until Cleopatra came north.',
    options: [
      {
        label: 'Fight him on the Jordan',
        tooltip: 'Battle at Asophon: −9,000 manpower, −2 stability, −15 legitimacy, and "The Year Without an Army" (−35% manpower, −20% morale for 24 months). A Ptolemaic host takes the field in Galilee. The kingdom survives this only because somebody else decides it should.',
        effects: guard('ev_k_asophon:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { manpower: -9000, stability: -2, legitimacy: -15 });
          h.addTagModifier(ctx, me, {
            id: 'year_without_an_army', name: 'The Year Without an Army', months: 24,
            effects: { manpowerMult: 0.65, moraleMult: 0.8 },
          });
          if (alive(ctx, 'PTO')) {
            clearTruce(ctx, me, 'PTO');
            if (!findWar(g, me, 'PTO')) h.declareWar(ctx, 'PTO', me, 'The War of Lathyrus');
            spawnAt(ctx, 'PTO', ['Ptolemais', 'Dora', 'Scythopolis', 'Gaza'], {
              inf: 9, cav: 3, name: 'The Army of Cyprus',
              general: { name: 'Ptolemy Lathyrus', fire: 3, shock: 3, maneuver: 3 },
            });
          }
          stir(ctx, ['Scythopolis', 'Pella', 'Gadara'], {
            id: 'the_villages_burned', name: 'The Villages of the Jordan', months: 36,
            effects: { unrest: 2, taxMult: 0.8 },
          });
          h.factionShift(ctx, me, 'warparty', -20);
          h.setFlag(ctx, 'asophon', true);
          h.chronicle(ctx, 'war', 'Ptolemy Lathyrus breaks the Judaean army at Asophon on the Jordan; eight years after taking the name of kingdom, Judaea has no army in the field.');
        }),
      },
      {
        label: 'Lift the siege and keep the treaty',
        tooltip: 'Ptolemais is left alone and the treaty with Lathyrus is kept honestly: −10 legitimacy and the Brothers\' Captains −15 (a Hasmonean who raises a siege is a novelty), +80 talents and no war — and no Egyptian army in the country either, which means the next card does not happen.',
        effects: guard('ev_k_asophon:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: -10, treasury: 80 });
          h.factionShift(ctx, me, 'warparty', -15);
          h.factionShift(ctx, me, 'court', 10);
          h.doctrine(ctx, 'conquest', -2);
          h.setFlag(ctx, 'asophonAvoided', true);
          h.chronicle(ctx, 'diplomacy', 'The siege of Ptolemais is lifted and the treaty with Lathyrus kept; the captains are told, at length, what they think of it.');
        }),
      },
    ],
  },

  // ── K2 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_ananias',
    title: 'The Queen Is Advised by a Jew',
    desc: 'Cleopatra III comes north with a fleet and an army to deal with the son she '
      + 'exiled, and she finds Judaea prostrate and the obvious thing to do with it '
      + 'obvious to everybody in her court. Her two generals are Chelkias and Ananias, '
      + 'sons of the Onias who built the temple at Leontopolis — Jews commanding an '
      + 'Egyptian army, which is a sentence worth sitting with. Ananias tells her '
      + 'plainly that annexing Judaea would make every Jew in Egypt her enemy, and '
      + 'that she is proposing to purchase a province at the price of her own capital. '
      + 'She listens. There is no other episode quite like it: the Hasmonean kingdom '
      + 'survives its worst year because a Jewish general in a foreign service '
      + 'explained the arithmetic to a Ptolemaic queen, and she was the kind of ruler '
      + 'who could be told.',
    forTag: 'both',
    decider: 'PTO',
    minYear: -102,
    maxYear: -98,
    trigger: safeTrigger('ev_k_ananias', (ctx) =>
      !!crown(ctx) && flag(ctx, 'asophon') && dateGE(ctx, -102, 4)),
    major: true,
    aiOption: 0,
    historical: 'Cleopatra took Ananias\'s advice, made a treaty with Jannaeus and went home.',
    options: [
      {
        label: 'Make a treaty at Scythopolis and go home',
        tooltip: 'Egypt withdraws: any war with Egypt ends, the Ptolemaic host leaves, "The Year Without an Army" is halved, and Judaea gains "The Alexandrian Understanding" (+8% income, 120 months) — the diaspora that saved it is also a market. Egypt +10 legitimacy for a decision its own court thought was mad.',
        effects: guard('ev_k_ananias:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = crown(ctx);
          if (!me) return;
          if (alive(ctx, 'PTO') && findWar(g, me, 'PTO')) h.endWar(ctx, me, 'PTO', null);
          for (const a of h.armiesOf(ctx, 'PTO')) {
            if (a && a.general && a.general.name === 'Ptolemy Lathyrus') h.removeArmy(ctx, a.id);
          }
          h.removeModifier(ctx, me, 'year_without_an_army');
          h.addTagModifier(ctx, me, {
            id: 'year_without_an_army', name: 'The Year Without an Army', months: 12,
            effects: { manpowerMult: 0.85, moraleMult: 0.92 },
          });
          h.addTagModifier(ctx, me, {
            id: 'alexandrian_understanding', name: 'The Alexandrian Understanding', months: 120,
            effects: { incomeMult: 1.08 },
          });
          if (alive(ctx, 'PTO')) h.adjust(ctx, 'PTO', { legitimacy: 10 });
          h.setFlag(ctx, 'ananiasSpoke', true);
          h.chronicle(ctx, 'diplomacy', 'Ananias tells Cleopatra that taking Judaea would cost her Alexandria; she makes a treaty at Scythopolis and goes home.');
        }),
      },
      {
        label: 'Take the country while it is lying open',
        tooltip: 'Egypt annexes what it can hold: war with Judaea opens or continues, a second Ptolemaic army lands at Joppa, and Judaea takes −25 legitimacy and "The Land Lies Open" (−20% income, +2 unrest, 60 months). Egypt gains the province and the enmity of every Jew in Alexandria (−15 stability worth of trouble: +1 unrest in Alexandria and Leontopolis, permanently).',
        effects: guard('ev_k_ananias:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = crown(ctx);
          if (!me || !alive(ctx, 'PTO')) return;
          clearTruce(ctx, me, 'PTO');
          if (!findWar(g, me, 'PTO')) h.declareWar(ctx, 'PTO', me, 'The Egyptian Annexation');
          spawnAt(ctx, 'PTO', ['Joppa', 'Dora', 'Gaza', 'Ptolemais'], {
            inf: 8, cav: 3, name: 'The Army of the Queen',
            general: { name: 'Chelkias', fire: 2, shock: 3, maneuver: 3 },
          });
          h.adjust(ctx, me, { legitimacy: -25 });
          h.addTagModifier(ctx, me, {
            id: 'land_lies_open', name: 'The Land Lies Open', months: 60,
            effects: { incomeMult: 0.8, unrestAll: 2 },
          });
          stir(ctx, ['Alexandria', 'Leontopolis'], {
            id: 'the_jews_of_egypt', name: 'The Jews of Egypt Remember', months: -1,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'egyptTookJudaea', true);
          h.chronicle(ctx, 'war', 'Cleopatra overrules Ananias and takes the country lying open in front of her; her own capital learns of it within the month.');
        }),
      },
    ],
  },

  // ── K3 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_gaza',
    title: 'The Senate of Five Hundred',
    desc: 'Gaza has held out for a year — the last of the free Greek cities of the '
      + 'coast, garrisoned, walled, and expecting the Nabataeans to come, which they '
      + 'do not. It falls through treachery: the brother of the commander opens a '
      + 'gate. What follows is the part Josephus does not soften. The council of five '
      + 'hundred takes refuge in the temple of Apollo and is killed there; the city is '
      + 'burned and levelled and it does not come back for sixty years. The coast from '
      + 'Carmel to the desert is now Judaean, the caravan road from Arabia terminates '
      + 'in a Judaean port, and the kingdom is as large as it will ever be. It is also '
      + 'four years from the citrons at the altar, which is not a coincidence: an army '
      + 'that has learned to do this at Gaza is an army a king can be tempted to use '
      + 'at home.',
    forTag: 'HAS',
    minYear: -97,
    maxYear: -92,
    trigger: safeTrigger('ev_k_gaza', (ctx) => {
      const me = crown(ctx);
      return !!me && flag(ctx, 'jannaeusKing') && dateGE(ctx, -96, 1)
        // The siege card asks whether Gaza is OURS, not whether a column is
        // sitting outside it — and its own effect is the annexation.
        && !holds(ctx, me, 'Gaza');
    }),
    major: true,
    aiOption: 0,
    historical: 'The city fell after a year, the council of five hundred was killed in the temple of Apollo, and Gaza was destroyed.',
    options: [
      {
        label: 'Level it, and kill the council in the temple',
        tooltip: 'Gaza is taken and destroyed: the province changes hands with −4 development and "The Levelling of Gaza" (+3 unrest, 120 months). The realm: +20 martial points, +150 talents of plunder, the Captains +25, the Hasideans −20, and the sword axis moves hard. The coast is Judaean from Carmel to the desert.',
        effects: guard('ev_k_gaza:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.changeOwner(ctx, 'Gaza', me);
          const p = ctx.prov && ctx.prov('Gaza');
          if (p && p.dev) {
            p.dev.tax = Math.max(1, (p.dev.tax || 1) - 2);
            p.dev.prod = Math.max(1, (p.dev.prod || 1) - 2);
          }
          h.addProvinceModifier(ctx, 'Gaza', {
            id: 'levelling_of_gaza', name: 'The Levelling of Gaza', months: 120,
            effects: { unrest: 3, taxMult: 0.6 },
          });
          h.adjust(ctx, me, { mar: 20, treasury: 150, legitimacy: 5 });
          h.factionShift(ctx, me, 'warparty', 25);
          h.factionShift(ctx, me, 'hasideans', -20);
          h.factionShift(ctx, me, 'cities', -30);
          h.doctrine(ctx, 'conquest', 3);
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'gazaLevelled', true);
          h.chronicle(ctx, 'war', 'Gaza falls by treachery after a year; the council of five hundred dies in the temple of Apollo and the city is levelled.');
        }),
      },
      {
        label: 'Take the city and keep the city',
        tooltip: 'Gaza is taken intact and garrisoned: the province changes hands undamaged, +200 talents a year of caravan customs ("The Terminus of the Incense Road", +10% income permanently), the Greek Cities faction +20 and the Captains −10. A tributary pays every year; a levelled one pays once.',
        effects: guard('ev_k_gaza:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.changeOwner(ctx, 'Gaza', me);
          h.addProvinceModifier(ctx, 'Gaza', {
            id: 'the_terminus', name: 'The Terminus of the Road', months: -1,
            effects: { unrest: 1 },
          });
          h.addTagModifier(ctx, me, {
            id: 'incense_terminus', name: 'The Terminus of the Incense Road', months: -1,
            effects: { incomeMult: 1.1 },
          });
          h.adjust(ctx, me, { treasury: 60, mar: 10 });
          h.factionShift(ctx, me, 'cities', 20);
          h.factionShift(ctx, me, 'warparty', -10);
          h.doctrine(ctx, 'conquest', -2);
          h.setFlag(ctx, 'gazaKept', true);
          h.chronicle(ctx, 'war', 'Gaza is taken and garrisoned rather than levelled; the caravans out of Arabia go on arriving, and pay a Judaean customs house.');
        }),
      },
    ],
  },

  // ── K4 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_obodas',
    title: 'The Ravines Above Gadara',
    desc: 'Obodas the Nabataean has been watching a Judaean king take the caravan road '
      + 'apart city by city, and he picks his ground: a valley in the hills beyond the '
      + 'Jordan, narrow enough that the camels driven down into it leave the phalanx '
      + 'nowhere to stand. The army is destroyed in an afternoon. Jannaeus gets out on '
      + 'foot and reaches Jerusalem alone, and the city that has been furious with him '
      + 'since the citrons discovers that he is not only impious but beatable, which is '
      + 'a much more dangerous thing for a king to be. The rising that follows is not a '
      + 'riot. It lasts six years, it kills fifty thousand people by Josephus\'s count, '
      + 'and it is fought entirely between Jews.',
    forTag: 'HAS',
    minYear: -94,
    maxYear: -88,
    trigger: safeTrigger('ev_k_obodas', (ctx) =>
      !!crown(ctx) && flag(ctx, 'etrogimSpilled') && alive(ctx, 'NAB') && dateGE(ctx, -93, 3)),
    major: true,
    aiOption: 0,
    historical: 'Obodas destroyed the army in the ravines; the king reached Jerusalem alone and the country rose.',
    options: [
      {
        label: 'Take the valley road',
        tooltip: 'Disaster: −7,000 manpower, −20 legitimacy, −1 stability, and war with Nabataea. The realm loses its Transjordan holdings\' quiet ("The Ravines", +2 unrest in Gadara, Gerasa, Philadelphia and Medaba for 60 months) — and the six-year rising opens in earnest: a rebel host takes the field in the hill country.',
        effects: guard('ev_k_obodas:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { manpower: -7000, legitimacy: -20, stability: -1 });
          if (alive(ctx, 'NAB')) {
            clearTruce(ctx, me, 'NAB');
            if (!findWar(g, me, 'NAB')) h.declareWar(ctx, 'NAB', me, 'The War of Obodas');
            h.adjust(ctx, 'NAB', { legitimacy: 15, mar: 20 });
          }
          stir(ctx, ['Gadara', 'Gerasa', 'Philadelphia', 'Medaba'], {
            id: 'the_ravines', name: 'The Ravines', months: 60,
            effects: { unrest: 2 },
          });
          spawnRebels(ctx, ['Adora', 'Hebron', 'Emmaus', 'Jericho'], {
            inf: 6, name: 'The Congregation of the Faithless',
            general: { name: 'The Seekers of Smooth Things', fire: 1, shock: 3, maneuver: 2 },
          });
          h.factionShift(ctx, me, 'hasideans', -20);
          h.setFlag(ctx, 'obodasAmbush', true);
          h.chronicle(ctx, 'war', 'Obodas destroys the royal army in the ravines beyond the Jordan; the king reaches Jerusalem on foot, and the country discovers he can be beaten.');
        }),
      },
      {
        label: 'Refuse the ground and go the long way',
        tooltip: 'The army comes home intact and a season late: −40 talents, the Captains −10, and no Nabataean war — but the Transjordan campaign is abandoned and Nabataea keeps the caravan road (Nabataea +10% income permanently). The rising stays a city quarrel instead of becoming a civil war.',
        effects: guard('ev_k_obodas:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -40 });
          h.factionShift(ctx, me, 'warparty', -10);
          if (alive(ctx, 'NAB')) {
            h.addTagModifier(ctx, 'NAB', {
              id: 'the_road_held', name: 'The Road Held', months: -1,
              effects: { incomeMult: 1.1 },
            });
          }
          h.doctrine(ctx, 'conquest', -1);
          h.setFlag(ctx, 'obodasAvoided', true);
          h.chronicle(ctx, 'war', 'The king refuses the valley and brings the army home the long way; Nabataea keeps the road, and Jerusalem keeps its quarrel to itself.');
        }),
      },
    ],
  },

  // ═══ THE QUEEN, 76–67 ════════════════════════════════════════════════════

  // ── K5 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_queen_and_priest',
    title: 'A Queen Cannot Offer the Sacrifice',
    desc: 'She is sixty-four and she has been the wife of two kings, and the kingdom is '
      + 'hers by her husband\'s will and the army\'s assent. There is one thing in it '
      + 'she cannot do. For seventy years the Hasmonean state has rested on one man '
      + 'holding the high priesthood and the government together — that fusion IS the '
      + 'dynasty\'s constitutional idea — and a woman cannot stand at the altar. So the '
      + 'offices come apart, and the mitre goes to her elder son Hyrcanus, who is mild '
      + 'and slow and suits everyone, while the government stays with her. It is meant '
      + 'as an administrative convenience. It is in fact the end of the thing Jonathan '
      + 'built and Simon made hereditary, and everyone will spend the next decade '
      + 'discovering that the two halves, once separated, have separate friends. The '
      + 'younger son Aristobulus, who is neither mild nor slow, notices first.',
    forTag: 'HAS',
    minYear: -76,
    maxYear: -70,
    trigger: safeTrigger('ev_k_queen_and_priest', (ctx) =>
      queenRules(ctx) && dateGE(ctx, -76, 4)),
    major: true,
    aiOption: 0,
    historical: 'Salome ruled and Hyrcanus II held the high priesthood; the offices never rejoined.',
    options: [
      {
        label: 'The mitre to Hyrcanus, the government to the queen',
        tooltip: 'The offices divide: +15 legitimacy and +2 stability now (everyone is satisfied, which is the trap), the Hasideans +25 — and permanently "The Offices Divided": −0.1 legitimacy a month and the conciliar axis moves, because a priesthood that is not the crown becomes a party the crown must court.',
        effects: guard('ev_k_queen_and_priest:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 15, stability: 2 });
          h.setHeir(ctx, me, { name: 'Hyrcanus II', gov: 2, infl: 1, mar: 1, age: 30 });
          h.addTagModifier(ctx, me, {
            id: 'offices_divided', name: 'The Offices Divided', months: -1,
            effects: { legitimacyAdd: -0.1 },
          });
          h.factionShift(ctx, me, 'hasideans', 25);
          h.doctrine(ctx, 'authority', -2);
          h.setFlag(ctx, 'officesDivided', true);
          h.chronicle(ctx, 'ruler', 'The queen takes the government and her elder son the mitre; the fusion the dynasty was built on comes apart as an administrative convenience.');
        }),
      },
      {
        label: 'Keep both in the queen\'s hand and appoint a deputy',
        tooltip: 'The queen holds the priesthood through a deputy who serves at her pleasure: +25 governance points, the crown axis moves — and the Hasideans −30, because the arrangement is a legal fiction and every school in the country says so (+1 unrest everywhere for 60 months).',
        effects: guard('ev_k_queen_and_priest:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { gov: 25 });
          h.addTagModifier(ctx, me, {
            id: 'the_legal_fiction', name: 'A Deputy at the Altar', months: 60,
            effects: { unrestAll: 1 },
          });
          h.factionShift(ctx, me, 'hasideans', -30);
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'officesHeld', true);
          h.chronicle(ctx, 'ruler', 'The queen keeps the priesthood in her own hand through a deputy; the schools call it what it is, at length, in writing.');
        }),
      },
    ],
  },

  // ── K6 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_simeon_ben_shetach',
    title: 'The Elders Come Back to the Chamber',
    desc: 'Her brother — the tradition says brother, and the tradition is fond of her — '
      + 'is Simeon ben Shetach, who spent the last reign hidden or abroad and now walks '
      + 'back into the Chamber of Hewn Stone with a list. The Pharisees are restored to '
      + 'the council, the ordinances they were expelled over are put back into force, '
      + 'and the schools are reorganized on a principle nobody has legislated before: '
      + 'that every town shall have a house of study and every boy shall be sent to it. '
      + 'The later rabbis remember her reign as a time when the rain fell on the eves '
      + 'of sabbaths and the grains of wheat grew as large as kidneys, which is not '
      + 'history but tells you what they thought of the alternative. There is also a '
      + 'list of another kind: the men who advised the crosses are being tried, and '
      + 'some of them are being killed, and the ones who are not are riding to '
      + 'Aristobulus.',
    forTag: 'HAS',
    minYear: -75,
    maxYear: -69,
    trigger: safeTrigger('ev_k_simeon_ben_shetach', (ctx) =>
      queenRules(ctx) && dateGE(ctx, -75, 1)),
    major: true,
    aiOption: 0,
    historical: 'The Pharisees were restored, the schools founded, and the king\'s counsellors hunted down.',
    options: [
      {
        label: 'Restore the ordinances, and let the reckoning run',
        tooltip: 'The restoration in full: "The Schools of the Queen" permanently (+0.2 legitimacy a month, +6% income — a literate country pays better), Hasideans +35, conciliar authority +3 — and the Court faction −35 with "The Reckoning" (+1 unrest for 48 months), because the men being hunted have somewhere to go, and his name is Aristobulus.',
        effects: guard('ev_k_simeon_ben_shetach:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.addTagModifier(ctx, me, {
            id: 'schools_of_the_queen', name: 'The Schools of the Queen', months: -1,
            effects: { legitimacyAdd: 0.2, incomeMult: 1.06 },
          });
          h.addTagModifier(ctx, me, {
            id: 'the_reckoning', name: 'The Reckoning', months: 48,
            effects: { unrestAll: 1 },
          });
          h.factionShift(ctx, me, 'hasideans', 35);
          h.factionShift(ctx, me, 'court', -35);
          h.factionShift(ctx, me, 'warparty', -20);
          h.doctrine(ctx, 'authority', -3);
          h.setFlag(ctx, 'schoolsFounded', true);
          h.setFlag(ctx, 'theReckoning', true);
          h.chronicle(ctx, 'ruler', 'Simeon ben Shetach walks back into the Chamber with a list: the ordinances restored, a house of study in every town, and the king\'s counsellors on trial.');
        }),
      },
      {
        label: 'Restore the council, and pardon the counsellors',
        tooltip: 'The schools without the reckoning: "The Schools of the Queen" at half (+0.1 legitimacy a month, +3% income), Hasideans +15, Court +10, and no purge — which keeps the old guard inside the state instead of inside her son\'s faction. The one card in this chain that materially changes what happens in 67.',
        effects: guard('ev_k_simeon_ben_shetach:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.addTagModifier(ctx, me, {
            id: 'schools_of_the_queen', name: 'The Schools of the Queen', months: -1,
            effects: { legitimacyAdd: 0.1, incomeMult: 1.03 },
          });
          h.factionShift(ctx, me, 'hasideans', 15);
          h.factionShift(ctx, me, 'court', 10);
          h.doctrine(ctx, 'authority', -1);
          h.setFlag(ctx, 'schoolsFounded', true);
          h.setFlag(ctx, 'counsellorsPardoned', true);
          h.chronicle(ctx, 'ruler', 'The council is restored and the old counsellors pardoned; the queen keeps her husband\'s men inside the state rather than outside it.');
        }),
      },
    ],
  },

  // ── K7 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_queens_army',
    title: 'Nine Years and No Battle',
    desc: 'She doubles the army. That is the part of the queen\'s peace that gets left '
      + 'out of the descriptions of it: she raises the native levy, hires foreign '
      + 'troops in numbers no Hasmonean has paid for, garrisons the fortresses, and '
      + 'sends money to the neighbouring princes — and then does not fight anybody for '
      + 'nine years. Josephus, who does not admire her, says the nation was at peace '
      + 'and she was formidable to the surrounding princes, and cannot see that the '
      + 'second clause is the reason for the first. It costs a fortune. It is also the '
      + 'only decade in the dynasty\'s history in which no Judaean army is destroyed, '
      + 'and the kingdom she hands on is the largest one anybody in it will ever see.',
    forTag: 'HAS',
    minYear: -74,
    maxYear: -68,
    trigger: safeTrigger('ev_k_queens_army', (ctx) =>
      queenRules(ctx) && dateGE(ctx, -74, 1)),
    aiOption: 0,
    options: [
      {
        label: 'Pay for the peace',
        tooltip: '−200 talents and −8% income permanently ("The Queen\'s Establishment") — and +25% manpower, +1 stability, and "Formidable to the Princes" (+15% morale, −1 unrest everywhere) for 120 months. Peace bought with a standing army is still bought.',
        effects: guard('ev_k_queens_army:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -200, stability: 1, manpower: 5000 });
          h.addTagModifier(ctx, me, {
            id: 'queens_establishment', name: 'The Queen\'s Establishment', months: -1,
            effects: { incomeMult: 0.92, manpowerMult: 1.25 },
          });
          h.addTagModifier(ctx, me, {
            id: 'formidable_to_princes', name: 'Formidable to the Princes', months: 120,
            effects: { moraleMult: 1.15, unrestAll: -1 },
          });
          h.factionShift(ctx, me, 'warparty', 15);
          h.setFlag(ctx, 'queensArmy', true);
          h.chronicle(ctx, 'ruler', 'The queen doubles the army, garrisons the fortresses and pays the neighbouring princes — and then fights nobody for nine years.');
        }),
      },
      {
        label: 'Let the treasury recover instead',
        tooltip: '+15% income for 120 months and +150 talents — a country that has been at war since 103 gets to bank a decade. But no establishment: the fortresses are thinly held, and the man who eventually walks into twenty-two of them will find them that way.',
        effects: guard('ev_k_queens_army:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: 150 });
          h.addTagModifier(ctx, me, {
            id: 'the_banked_decade', name: 'The Banked Decade', months: 120,
            effects: { incomeMult: 1.15, manpowerMult: 0.9 },
          });
          h.setFlag(ctx, 'treasuryBanked', true);
          h.chronicle(ctx, 'ruler', 'The queen lets the treasury recover instead of the army; the fortresses are held thinly, and are noticed being held thinly.');
        }),
      },
    ],
  },

  // ── K8 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_tigranes',
    title: 'The King of Kings at Ptolemais',
    desc: 'Tigranes of Armenia has spent twenty years eating what is left of the '
      + 'Seleucid empire, and he is now besieging Ptolemais with an army Josephus '
      + 'numbers at five hundred thousand, which is a way of saying nobody counted. '
      + 'There is no Judaean answer to it. What the queen sends instead is an embassy '
      + 'with gifts and a letter, and what saves her is happening a thousand miles '
      + 'away: Lucullus has crossed into Armenia and taken Tigranocerta, and the King '
      + 'of Kings turns his army round and goes home to a capital that is already '
      + 'gone. The kingdom survives the largest army it has ever had pointed at it by '
      + 'sending presents and being lucky. It is worth noticing, because it is the '
      + 'first time the thing that decides Judaea\'s fate is a Roman general who has '
      + 'never heard of it.',
    forTag: 'both',
    decider: 'ARM',
    date: { y: -69, m: 6 },
    world: true,
    worldLabel: 'Tigranes besieges Ptolemais; Lucullus invades Armenia',
    minYear: -70,
    maxYear: -66,
    when: safeTrigger('ev_k_tigranes:when', (ctx) => !!crown(ctx) && alive(ctx, 'ARM')),
    major: true,
    aiOption: 0,
    historical: 'Tigranes turned back when Lucullus took Tigranocerta; Salome\'s embassy went out with gifts.',
    options: [
      {
        label: 'Send the embassy and the gifts',
        tooltip: 'Judaea −120 talents and Armenia +120; the siege lifts when the news from Tigranocerta arrives. Judaea +10 legitimacy for a war it did not have to fight, and "The Roman Weather" — the realm learns that its survival is now decided in other people\'s campaigns (the western horizon moves).',
        effects: guard('ev_k_tigranes:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -120, legitimacy: 10 });
          if (alive(ctx, 'ARM')) {
            h.adjust(ctx, 'ARM', { treasury: 120, legitimacy: -10, stability: -1 });
            h.addTagModifier(ctx, 'ARM', {
              id: 'lucullus_comes', name: 'Lucullus in Armenia', months: 60,
              effects: { manpowerMult: 0.8, incomeMult: 0.85 },
            });
          }
          h.doctrine(ctx, 'alignment', 1);
          h.setFlag(ctx, 'tigranesTurnedBack', true);
          h.chronicle(ctx, 'diplomacy', 'The queen sends presents to Tigranes at Ptolemais; Lucullus takes Tigranocerta, and the King of Kings goes home to a capital that is already gone.');
        }),
      },
      {
        label: 'Stand at the passes and fight him',
        tooltip: 'War with Armenia: an Armenian host takes the field, Judaea −4,000 manpower and +2 war exhaustion — and +20 legitimacy and the Captains +25 for facing the largest army in the world. Tigranes still leaves when Lucullus takes his capital; the difference is what it costs to be standing there when he does.',
        effects: guard('ev_k_tigranes:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const me = crown(ctx);
          if (!me) return;
          if (alive(ctx, 'ARM')) {
            clearTruce(ctx, me, 'ARM');
            if (!findWar(g, me, 'ARM')) h.declareWar(ctx, 'ARM', me, 'The Armenian March');
            spawnAt(ctx, 'ARM', ['Ptolemais', 'Dora', 'Damascus', 'Tyre'], {
              inf: 10, cav: 6, name: 'The Host of the King of Kings',
              general: { name: 'Tigranes the Great', fire: 3, shock: 4, maneuver: 2 },
            });
            h.addTagModifier(ctx, 'ARM', {
              id: 'lucullus_comes', name: 'Lucullus in Armenia', months: 60,
              effects: { manpowerMult: 0.8, incomeMult: 0.85 },
            });
          }
          h.adjust(ctx, me, { manpower: -4000, warExhaustion: 2, legitimacy: 20 });
          h.factionShift(ctx, me, 'warparty', 25);
          h.doctrine(ctx, 'conquest', 1);
          h.setFlag(ctx, 'stoodAtThePasses', true);
          h.chronicle(ctx, 'war', 'Judaea stands at the passes against the King of Kings; the news from Tigranocerta arrives before the arithmetic does.');
        }),
      },
    ],
  },

  // ── K9 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_twenty_two_fortresses',
    title: 'The Younger Son Leaves Jerusalem',
    desc: 'The queen is seventy-three and ill, and her younger son has spent nine years '
      + 'watching a government run by the party that crucified nobody and his brother '
      + 'holding the office that should have been a throne. Aristobulus leaves the city '
      + 'at night with one servant and goes to the friends his mother pardoned or '
      + 'failed to kill — the officers of his father\'s army, the men of the '
      + 'fortresses — and inside a fortnight he holds twenty-two of them. The queen, '
      + 'dying, is asked what to do and says: do what you can, you have youth and '
      + 'strength on your side. She puts his wife and children in the Antonia and '
      + 'stops there. It is the last decision she makes, and it is a decision not to '
      + 'make one.',
    forTag: 'HAS',
    minYear: -68,
    maxYear: -66,
    trigger: safeTrigger('ev_k_twenty_two_fortresses', (ctx) =>
      queenRules(ctx) && dateGE(ctx, -68, 6)),
    major: true,
    aiOption: 0,
    historical: 'Aristobulus took the fortresses; the dying queen imprisoned his family and did nothing else.',
    options: [
      {
        label: 'Hold his family and let the fortresses go',
        tooltip: 'The historical course: −1 stability and "The Fortresses Are His" (+2 unrest everywhere, −10% manpower, permanent until settled), the Captains +30 to the younger son\'s account. The queen\'s peace holds exactly as long as the queen does.',
        effects: guard('ev_k_twenty_two_fortresses:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { stability: -1 });
          h.addTagModifier(ctx, me, {
            id: 'fortresses_are_his', name: 'The Fortresses Are His', months: -1,
            effects: { unrestAll: 2, manpowerMult: 0.9 },
          });
          h.factionShift(ctx, me, 'warparty', 30);
          h.factionShift(ctx, me, 'hasideans', -10);
          h.setFlag(ctx, 'fortressesTaken', true);
          h.chronicle(ctx, 'ruler', 'Aristobulus leaves Jerusalem by night and holds twenty-two fortresses within a fortnight; his mother imprisons his wife and children and does nothing else.');
        }),
      },
      {
        label: 'Send the army after him while she still can',
        tooltip: 'The queen spends her last strength on it: −120 talents, −3,000 manpower and −1 stability now, the Hasideans −15 (a mother making war on a son is its own scandal) — but no standing rebel bloc: the realm gains "The Succession Settled" (+1 stability, +10 legitimacy) and the brothers\' war opens with the crown holding the fortresses.',
        effects: guard('ev_k_twenty_two_fortresses:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -120, manpower: -3000, stability: -1, legitimacy: 10 });
          h.addTagModifier(ctx, me, {
            id: 'succession_settled', name: 'The Succession Settled', months: 120,
            effects: { unrestAll: -0.5, legitimacyAdd: 0.1 },
          });
          h.factionShift(ctx, me, 'hasideans', -15);
          h.factionShift(ctx, me, 'court', 15);
          h.setFlag(ctx, 'fortressesHeld', true);
          h.chronicle(ctx, 'ruler', 'The dying queen sends the army after her younger son and takes the fortresses back; it is the last order she gives.');
        }),
      },
    ],
  },

  // ── K10 ───────────────────────────────────────────────────────────────────
  {
    id: 'ev_k_salome_dies',
    title: 'The Last Reign That Ended in Bed',
    desc: 'She dies at seventy-three, in the ninth year, of an illness the sources do '
      + 'not name, having ruled a kingdom at its largest extent without losing a battle '
      + 'or a province, and she is the last Hasmonean of whom any of that is true. What '
      + 'she leaves is a country at peace, a treasury, an army, a Sanhedrin that works, '
      + 'schools in the towns — and two sons who have already begun. Within three '
      + 'months Hyrcanus and Aristobulus meet at Jericho and the elder loses, and '
      + 'within four years both of them are in a Roman general\'s tent explaining why '
      + 'he should prefer one to the other, and the answer is that he prefers neither '
      + 'and will take the country. The judgement of the tradition is unsentimental and '
      + 'probably right: while she lived she preserved the nation in peace, and when '
      + 'she died she left the kingdom to whichever of her sons could hold it, which '
      + 'was neither.',
    forTag: 'HAS',
    minYear: -67,
    maxYear: -64,
    trigger: safeTrigger('ev_k_salome_dies', (ctx) =>
      queenRules(ctx) && dateGE(ctx, -67, 3)),
    major: true,
    aiOption: 0,
    historical: 'She died in the ninth year of her reign and the war of the brothers began at once.',
    options: [
      {
        label: 'The brothers meet at Jericho',
        tooltip: 'The queen dies and the war of the brothers opens: −25 legitimacy, −2 stability, "The War of the Brothers" (+2 unrest everywhere, −15% income) until it is settled, and a pretender host in the field. This is the door into the 67 BCE chapter, and it is the state Pompey finds.',
        effects: guard('ev_k_salome_dies:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: -25, stability: -2 });
          h.addTagModifier(ctx, me, {
            id: 'war_of_the_brothers', name: 'The War of the Brothers', months: -1,
            effects: { unrestAll: 2, incomeMult: 0.85 },
          });
          if (!flag(ctx, 'fortressesHeld')) {
            spawnRebels(ctx, ['Jericho', 'Hebron', 'Adora', 'Emmaus'], {
              inf: 7, cav: 2, name: 'The Party of Aristobulus',
              general: { name: 'Aristobulus II', fire: 2, shock: 3, maneuver: 3 },
            });
          }
          h.setRuler(ctx, me, {
            name: 'Hyrcanus II', title: 'High Priest', gov: 2, infl: 1, mar: 1, age: 37,
          });
          h.setFlag(ctx, 'salomeDead', true);
          h.setFlag(ctx, 'brothersWar', true);
          h.chronicle(ctx, 'ruler', 'Salome Alexandra dies in the ninth year of her reign — the last Hasmonean to die in bed with the country at peace — and her sons meet at Jericho within the season.');
        }),
      },
      {
        label: 'The council names one of them before the armies do',
        tooltip: 'The Sanhedrin she restored does the one thing a council is for: −10 legitimacy and 90 talents to buy the settlement, no pretender host, and "The Chamber Decided" (+1 stability, conciliar authority +3). The brothers\' war is averted and the kingdom faces Rome as one state — which is not the same as facing it successfully.',
        effects: guard('ev_k_salome_dies:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: -10, treasury: -90, stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'the_chamber_decided', name: 'The Chamber Decided', months: -1,
            effects: { legitimacyAdd: 0.1 },
          });
          h.setRuler(ctx, me, {
            name: 'Hyrcanus II', title: 'High Priest and Ethnarch', gov: 2, infl: 2, mar: 1, age: 37,
          });
          h.doctrine(ctx, 'authority', -3);
          h.setFlag(ctx, 'salomeDead', true);
          h.setFlag(ctx, 'chamberSettled', true);
          h.chronicle(ctx, 'ruler', 'The Chamber of Hewn Stone names the queen\'s successor before the armies can; the brothers\' war is averted, and the kingdom faces what is coming as one state.');
        }),
      },
    ],
  },
];
