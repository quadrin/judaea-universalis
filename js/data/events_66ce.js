// Judaea Universalis — event chain: The Great Revolt, 66–73 CE (SPEC §9.2).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Source spine: Josephus, Bellum Judaicum II–VII. Dates map to the real chronology
// (30-day game months). Every effects() body is guarded so nothing can throw inside
// the tick loop.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_66ce] ' + key, e || '');
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

function armyByGeneral(ctx, tag, generalName) {
  try {
    const armies = ctx.helpers.armiesOf(ctx, tag);
    for (const a of armies) {
      if (a && a.general && a.general.name === generalName) return a;
    }
    return null;
  } catch (e) { warnOnce('armyByGeneral', e); return null; }
}

function totalMen(ctx, tag) {
  try {
    return ctx.helpers.armiesOf(ctx, tag).reduce((s, a) => s + ((a && a.men) || 0), 0);
  } catch (e) { warnOnce('totalMen', e); return 0; }
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
  const w = findJudRomWar(ctx.game);
  if (!w || !w.warscore || typeof w.warscore !== 'object') return 0;
  const v = w.warscore.JUD;
  return typeof v === 'number' ? v : 0;
}

// Direct warscore nudge for scripted catastrophes (no helper exists for this).
function addWarscore(ctx, tag, amount) {
  try {
    const w = findJudRomWar(ctx.game);
    if (w && w.warscore && typeof w.warscore === 'object') {
      const cur = typeof w.warscore[tag] === 'number' ? w.warscore[tag] : 0;
      w.warscore[tag] = Math.max(-100, Math.min(100, cur + amount));
    }
  } catch (e) { warnOnce('addWarscore', e); }
}

function setOpinion(ctx, a, b, val) {
  try {
    const ta = ctx.game.tags && ctx.game.tags[a];
    if (!ta) return;
    if (!ta.opinion || typeof ta.opinion !== 'object') ta.opinion = {};
    ta.opinion[b] = Math.max(-200, Math.min(200, val));
  } catch (e) { warnOnce('setOpinion', e); }
}

const JUDEA_HILL_PROVINCES = ['Jerusalem', 'Emmaus', 'Lydda', 'Gadora', 'Hebron', 'Jericho'];

export const EVENTS_66 = [

  // ── 1 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_sacrifices_cease',
    title: 'The Sacrifices Cease',
    desc: 'Eleazar ben Ananias, captain of the Temple, has persuaded the officiating priests '
      + 'to accept no gift or offering from any foreigner — and so the daily sacrifice for '
      + 'Caesar and for Rome has ceased. In the outer courts the chief priests and the '
      + 'notable Pharisees plead against it, producing experts in the traditions to argue '
      + 'that Israel has always received the gifts of the nations. The young priests will '
      + 'not hear them. In the eyes of Rome, this is the plainest possible declaration of war.',
    forTag: 'JUD',
    date: { y: 66, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Let the offering cease',
        tooltip: '+10 legitimacy; "No King but God" (+5% morale, 24 months). Rome will not forgive this.',
        effects: guard('ev_sacrifices_cease:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 10 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'no_king_but_god', name: 'No King but God', months: 24,
            effects: { moraleMult: 1.05 },
          });
          setOpinion(ctx, 'ROM', 'JUD', -200);
        }),
      },
      {
        label: 'Seek a way back from the brink',
        tooltip: '-1 stability, -5 legitimacy; Jerusalem +2 unrest for 12 months. Rome\'s opinion improves — for whatever that is worth now.',
        effects: guard('ev_sacrifices_cease:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: -1, legitimacy: -5 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'priests_divided', name: 'The Priesthood Divided', months: 12,
            effects: { unrest: 2 },
          });
          setOpinion(ctx, 'ROM', 'JUD', -120);
        }),
      },
    ],
  },

  // ── 2 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_menahem',
    title: 'Menahem at the Gates',
    desc: 'Menahem ben Judah — son of the Galilean who raised the census revolt sixty years '
      + 'ago — has broken open Herod\'s armory on Masada and returned to Jerusalem at the '
      + 'head of armed Sicarii, entering the Temple courts in royal robes to pray. He directs '
      + 'the siege of the last Roman cohort like a king holding audience. The priests of '
      + 'Eleazar\'s party watch the daggers of his followers and remember that those daggers '
      + 'have found Jewish throats more often than Roman ones.',
    forTag: 'JUD',
    date: { y: 66, m: 7 },
    aiOption: 1,
    options: [
      {
        label: 'Arm the Sicarii',
        tooltip: '4,000 Sicarii rise at Masada under Menahem (a fine raider); Jerusalem +3 unrest for 12 months while he plays king.',
        effects: guard('ev_menahem:0', (ctx) => {
          const h = ctx.helpers;
          h.spawnArmy(ctx, 'JUD', 'Masada', {
            inf: 4, name: 'Sicarii of Masada',
            general: { name: 'Menahem ben Judah', fire: 2, shock: 2, maneuver: 3 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'menahem_pretension', name: 'A King in Royal Robes', months: 12,
            effects: { unrest: 3 },
          });
          h.setFlag(ctx, 'menahemLives', true);
        }),
      },
      {
        label: 'Strike down the pretender',
        tooltip: 'Menahem dies on the Ophel. 2,000 Sicarii withdraw to Masada under Eleazar ben Yair; +5 legitimacy for the priests\' government.',
        effects: guard('ev_menahem:1', (ctx) => {
          const h = ctx.helpers;
          h.spawnArmy(ctx, 'JUD', 'Masada', {
            inf: 2, name: 'Sicarii of Masada',
            general: { name: 'Eleazar ben Yair', fire: 1, shock: 2, maneuver: 3 },
          });
          h.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 3 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_greek_city_massacres',
    title: 'The Cities Turn on Their Neighbors',
    desc: 'In a single hour the Greeks of Caesarea have slaughtered the Jews of their city — '
      + 'twenty thousand, Josephus will write, and Caesarea emptied of Jews. Word travels, '
      + 'and the countryside answers in kind: Jewish bands burn the territories of the '
      + 'Decapolis, the Greek cities kill the minorities inside their own walls, and in '
      + 'Alexandria the legions are loosed upon the Delta quarter. Syria has become a country '
      + 'of neighbors killing neighbors, and every column of smoke recruits for one side or the other.',
    forTag: 'both',
    date: { y: 66, m: 8 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'There is no way back now',
        tooltip: 'Communal Massacres (+3 unrest, -20% tax, 18 months) in six mixed cities; +1 war exhaustion for both Judaea and Rome.',
        effects: guard('ev_greek_city_massacres:0', (ctx) => {
          const h = ctx.helpers;
          const cities = ['Caesarea Maritima', 'Scythopolis', 'Ptolemais', 'Ascalon', 'Damascus', 'Alexandria'];
          for (const name of cities) {
            h.addProvinceModifier(ctx, name, {
              id: 'communal_massacres', name: 'Communal Massacres', months: 18,
              effects: { unrest: 3, taxMult: 0.8 },
            });
          }
          h.adjust(ctx, 'JUD', { warExhaustion: 1 });
          h.adjust(ctx, 'ROM', { warExhaustion: 1 });
        }),
      },
    ],
  },

  // ── 4 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_cestius_marches',
    title: 'Cestius Gallus Marches',
    desc: 'The governor of Syria can no longer wait upon events. Cestius Gallus leaves Antioch '
      + 'with the Twelfth Legion Fulminata, two thousand picked men from the other legions, '
      + 'six cohorts of foot and four wings of horse, besides the royal contingents of Agrippa '
      + 'and Sohaemus. Ptolemais fills with soldiers; Chabulon burns; the column turns south '
      + 'along the coast, and then up into the hills, toward the city.',
    forTag: 'ROM',
    date: { y: 66, m: 10 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'March on Jerusalem',
        tooltip: 'Rome\'s armies are unleashed; 6,000 Syrian auxiliaries muster at Ptolemais. The road to Jerusalem runs through the pass at Beth Horon.',
        effects: guard('ev_cestius_marches:0', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'ROM', 'governor_hesitates');
          h.spawnArmy(ctx, 'ROM', 'Ptolemais', { inf: 6, name: 'Syrian Auxiliaries' });
          h.setFlag(ctx, 'cestiusMarched', true);
          try { if (ctx.game.tags.ROM && ctx.game.tags.ROM.aiState) ctx.game.tags.ROM.aiState.target = 'Jerusalem'; } catch (e) { warnOnce('cestius:aiState', e); }
          h.notify(ctx, {
            title: 'Cestius Marches', type: 'war', provName: 'Ptolemais',
            text: 'The Twelfth Legion moves south from Antioch. Jerusalem is the objective.',
          });
        }),
      },
      {
        label: 'Wait for spring and reinforcements',
        tooltip: 'Caution over glory: -10 legitimacy (Nero is not pleased), 8,000 reinforcements at Antioch — but the revolt spreads unopposed (Judaea +10 legitimacy, +3,000 manpower).',
        effects: guard('ev_cestius_marches:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { legitimacy: -10 });
          h.spawnArmy(ctx, 'ROM', 'Antioch', { inf: 8, name: 'Syrian Levies' });
          h.addTagModifier(ctx, 'ROM', {
            id: 'governor_hesitates', name: 'The Governor Hesitates', months: 4,
            effects: { aiPassive: true },
          });
          h.adjust(ctx, 'JUD', { legitimacy: 10, manpower: 3000 });
        }),
      },
    ],
  },

  // ── 5 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_beth_horon',
    title: 'The Road from Beth Horon',
    desc: 'Cestius had the city within his grasp — Josephus swears the war would have ended '
      + 'there — and then, for no reason the defenders could see, he broke off the assault '
      + 'and fell back. In the narrow descent at Beth Horon the withdrawal became a rout: the '
      + 'column jammed in the defile under javelins from both slopes, and the governor '
      + 'abandoned his baggage, his siege engines, and the animals that carried them, buying '
      + 'his escape by night with a rearguard of four hundred who did not survive the morning. '
      + 'The engines that were to batter Jerusalem\'s walls now stand inside them.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_beth_horon', (ctx) => {
      const g = ctx.game;
      const h = ctx.helpers;
      if (g.date.y !== 66 || g.date.m < 10) return false;
      if (!h.getFlag(ctx, 'cestiusMarched')) return false;
      const cest = armyByGeneral(ctx, 'ROM', 'Cestius Gallus');
      if (!cest) return false;
      if (cest.retreating) return true;
      const start = h.getFlag(ctx, 'cestiusMen0') || 18000;
      if ((cest.men || start) <= start * 0.62) return true;
      // The historical ambush: Cestius deep in the Judean hills in November with a
      // strong defense still in being — the pass closes behind him.
      if (g.date.m >= 11) {
        const pv = ctx.byId ? ctx.byId(cest.prov) : null;
        if (pv && JUDEA_HILL_PROVINCES.indexOf(pv.name) !== -1 && !cest.inBattle) {
          if (totalMen(ctx, 'JUD') >= 8000) return true;
        }
      }
      return false;
    }),
    aiOption: 0,
    options: [
      {
        label: 'The Twelfth has lost its eagle',
        tooltip: 'Cestius loses ~8,000 men and flees to Ptolemais. Judaea: +25 military points, +15 legitimacy, +2,000 manpower, +15 warscore, and Captured Siege Engines (+1 siege, 24 months).',
        effects: guard('ev_beth_horon:0', (ctx) => {
          const h = ctx.helpers;
          const cest = armyByGeneral(ctx, 'ROM', 'Cestius Gallus');
          if (cest && !cest.inBattle) {
            const regs = cest.regiments
              ? ((cest.regiments.inf || 0) + (cest.regiments.cav || 0))
              : Math.round((cest.men || 12000) / 1000);
            const keep = Math.max(2, regs - 8);
            h.removeArmy(ctx, cest.id);
            h.spawnArmy(ctx, 'ROM', 'Ptolemais', {
              inf: keep, name: 'Remnants of the Twelfth',
              general: { name: 'Cestius Gallus', fire: 1, shock: 1, maneuver: 1 },
            });
          }
          h.adjust(ctx, 'JUD', { mar: 25, legitimacy: 15, manpower: 2000 });
          h.adjust(ctx, 'ROM', { warExhaustion: 2, legitimacy: -5 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'captured_engines', name: 'Captured Siege Engines', months: 24,
            effects: { siegeBonus: 1 },
          });
          addWarscore(ctx, 'JUD', 15);
          h.setFlag(ctx, 'bethHoron', true);
          h.notify(ctx, {
            title: 'Disaster at Beth Horon', type: 'good', provName: 'Emmaus',
            text: 'The Twelfth Legion is mauled in the passes. Its engines are ours.',
          });
        }),
      },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_organizing_the_revolt',
    title: 'Organizing the Revolt',
    desc: 'In the Temple, the coalition of priests and notables parcels out the country: '
      + 'Ananus ben Ananus holds the city, Eleazar ben Ananias takes Idumea, and the young '
      + 'priest Joseph ben Matthias — who will one day write this war\'s history under '
      + 'another name — is sent north to Galilee, where the first blow must fall. He finds '
      + 'the province quarrelsome, half-Greek, and unwalled.',
    forTag: 'JUD',
    date: { y: 66, m: 12 },
    aiOption: 0,
    options: [
      {
        label: 'Josephus fortifies Galilee',
        tooltip: '+1 fort level in Jotapata, Gischala, and Tarichaea. The north becomes a wall of walls; Vespasian must reduce it stone by stone.',
        effects: guard('ev_organizing_the_revolt:0', (ctx) => {
          const per = (ctx.DEFINES && ctx.DEFINES.BASE && ctx.DEFINES.BASE.fortGarrisonPerLevel) || 1000;
          for (const name of ['Jotapata', 'Gischala', 'Tarichaea']) {
            const p = ctx.prov(name);
            if (p && p.owner === 'JUD') {
              p.fort = (p.fort || 0) + 1;
              if (typeof p.maxGarrison === 'number') {
                p.maxGarrison += per;
                p.garrison = Math.min((p.garrison || 0) + per, p.maxGarrison);
              }
            }
          }
        }),
      },
      {
        label: 'Everything for Jerusalem',
        tooltip: 'Jerusalem gains +2,000 garrison; Sepphoris and Tiberias feel abandoned (+2 unrest, 24 months).',
        effects: guard('ev_organizing_the_revolt:1', (ctx) => {
          const h = ctx.helpers;
          const jer = ctx.prov('Jerusalem');
          if (jer && typeof jer.garrison === 'number') {
            const cap = typeof jer.maxGarrison === 'number' ? jer.maxGarrison : (jer.garrison + 2000);
            jer.garrison = Math.min(jer.garrison + 2000, cap);
          }
          for (const name of ['Sepphoris', 'Tiberias']) {
            h.addProvinceModifier(ctx, name, {
              id: 'abandoned_north', name: 'The North Abandoned', months: 24,
              effects: { unrest: 2 },
            });
          }
        }),
      },
    ],
  },

  // ── 7 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_vespasian_arrives',
    title: 'Vespasian Takes Command',
    desc: 'Nero, hearing in Achaea of Cestius\' disgrace, has given the war to a man with too '
      + 'little ambition to be dangerous and too much experience to fail: Titus Flavius '
      + 'Vespasianus, who broke the Britons in their wet forests. He travels overland to '
      + 'Syria while his son Titus brings the Fifteenth Legion up from Alexandria. At '
      + 'Ptolemais the army assembles — the Fifth, the Tenth, the Fifteenth, twenty-three '
      + 'cohorts of auxiliaries, and the kings\' contingents: sixty thousand men under arms. '
      + 'The reduction of Judaea begins.',
    forTag: 'both',
    date: { y: 67, m: 2 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Sixty thousand under arms',
        tooltip: 'Vespasian (5/5/4) lands 35,000 men at Ptolemais; Titus (4/5/5) brings 15,000 to Caesarea. Rome shakes off all hesitation and gains +10,000 manpower.',
        effects: guard('ev_vespasian_arrives:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.spawnArmy(ctx, 'ROM', 'Ptolemais', {
            inf: 30, cav: 5, name: 'Army of Vespasian',
            general: { name: 'Vespasian', fire: 5, shock: 5, maneuver: 4 },
          });
          h.spawnArmy(ctx, 'ROM', 'Caesarea Maritima', {
            inf: 13, cav: 2, name: 'Legio XV Apollinaris',
            general: { name: 'Titus', fire: 4, shock: 5, maneuver: 5 },
          });
          h.removeModifier(ctx, 'ROM', 'governor_hesitates');
          h.adjust(ctx, 'ROM', { manpower: 10000 });
          h.setFlag(ctx, 'vespasianArrived', true);
        }),
      },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_jotapata_falls',
    title: 'The Prophet of Jotapata',
    desc: 'Forty-seven days the town held on its cliff, until a deserter told the Romans the '
      + 'hour when the last watch slept. Now the commander of Galilee is dragged from a '
      + 'cistern where forty of his men lie dead by one another\'s hands — he contrived, by '
      + 'lot or by providence, to be among the last two living. Brought before Vespasian, '
      + 'Joseph ben Matthias does not beg. He prophesies: you will be Caesar, Vespasian — '
      + 'you, and your son after you.',
    forTag: 'ROM',
    trigger: safeTrigger('ev_jotapata_falls', (ctx) =>
      dateGE(ctx, 67, 1) && ctx.helpers.controls(ctx, 'ROM', 'Jotapata')),
    aiOption: 0,
    options: [
      {
        label: 'Keep him — chained, but alive',
        tooltip: 'Josephus is removed from Judaea\'s service. Rome +20 influence points; a useful interpreter of this strange country, and a stranger prophecy.',
        effects: guard('ev_jotapata_falls:0', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'JUD', 'Josephus ben Matthias');
          h.adjust(ctx, 'ROM', { infl: 20 });
          h.setFlag(ctx, 'josephusSpared', true);
        }),
      },
      {
        label: 'Send him to Nero in chains',
        tooltip: 'Josephus is removed from Judaea\'s service. Rome -5 legitimacy: prophets are cheap, but killing one his own soldiers now believe is not.',
        effects: guard('ev_jotapata_falls:1', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'JUD', 'Josephus ben Matthias');
          h.adjust(ctx, 'ROM', { legitimacy: -5 });
        }),
      },
    ],
  },

  // ── 9 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_gischala_falls',
    title: 'John Flees to Jerusalem',
    desc: 'Gischala, last of Galilee, asked Titus to respect the Sabbath while its people '
      + 'considered his terms — and in the night John ben Levi slipped away south with his '
      + 'fighting men, abandoning the women and children on the road when the cavalry caught '
      + 'up at dawn. Now he stands in the Temple courts telling the crowds that the Romans '
      + 'are worn out, their engines broken on Galilee\'s little walls. The young men believe '
      + 'him. The old men bury their faces.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_gischala_falls', (ctx) =>
      dateGE(ctx, 67, 1) && ctx.helpers.controls(ctx, 'ROM', 'Gischala')),
    aiOption: 0,
    options: [
      {
        label: 'The city receives him',
        tooltip: 'If Jerusalem holds: John of Gischala (2/3/2) arrives with 2,000 Zealots, but the city gains "Zealot Coup" (+3 unrest, 24 months) and Judaea loses 1 stability.',
        effects: guard('ev_gischala_falls:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'JUD')) return;
          if (h.controls(ctx, 'JUD', 'Jerusalem')) {
            h.spawnArmy(ctx, 'JUD', 'Jerusalem', {
              inf: 2, name: "John's Zealots",
              general: { name: 'John of Gischala', fire: 2, shock: 3, maneuver: 2 },
            });
            h.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'zealot_coup', name: 'Zealot Coup', months: 24,
              effects: { unrest: 3 },
            });
          }
          h.adjust(ctx, 'JUD', { stability: -1 });
        }),
      },
    ],
  },

  // ── 10 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_zealot_coup',
    title: 'The Zealots Seize the Temple',
    desc: 'The Zealots have made the sanctuary their fortress and chosen a village nobody as '
      + 'high priest by casting lots, while old Ananus ben Ananus — whose voice can still '
      + 'fill the outer court — raises the citizens against them. Besieged in the inner '
      + 'Temple, the Zealots have smuggled runners to Idumea with a lie worth an army: that '
      + 'Ananus means to sell the city to Rome. Twenty thousand Idumeans now stand before '
      + 'the gates in a night of storm, demanding to be let in.',
    forTag: 'JUD',
    trigger: safeTrigger('ev_zealot_coup', (ctx) =>
      dateGE(ctx, 68, 2) && alive(ctx, 'JUD') && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'Open the gates to the Idumeans',
        tooltip: '5,000 Idumeans under James ben Sosas join the defense — and murder Ananus before morning. Jerusalem +2 unrest (12 months), -1 stability.',
        effects: guard('ev_zealot_coup:0', (ctx) => {
          const h = ctx.helpers;
          h.spawnArmy(ctx, 'JUD', 'Jerusalem', {
            inf: 5, name: 'Idumean Host',
            general: { name: 'James ben Sosas', fire: 2, shock: 3, maneuver: 1 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'terror_in_the_city', name: 'Terror in the City', months: 12,
            effects: { unrest: 2 },
          });
          h.adjust(ctx, 'JUD', { stability: -1 });
        }),
      },
      {
        label: 'Hold the walls against them',
        tooltip: 'Civil strife in the streets: Jerusalem\'s garrison falls by 30%, but the government keeps its head — +5 legitimacy.',
        effects: guard('ev_zealot_coup:1', (ctx) => {
          const h = ctx.helpers;
          const jer = ctx.prov('Jerusalem');
          if (jer && typeof jer.garrison === 'number') {
            jer.garrison = Math.max(0, Math.round(jer.garrison * 0.7));
          }
          h.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 11 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_nero_dies',
    title: 'Nero Is Dead',
    desc: 'A courier from the coast, riding as though the news itself pursued him: Nero is '
      + 'dead by his own hand in a freedman\'s villa outside Rome, the Senate has hailed '
      + 'Galba, and no man knows whose face the next coin will bear. At Caesarea, Vespasian '
      + 'reads the letter twice and quietly puts away the timetable he had drawn for the '
      + 'spring. A general who campaigns without a lawful emperor\'s commission is not a '
      + 'general but a pretender — and he intends, for now, to be neither.',
    forTag: 'both',
    date: { y: 68, m: 6 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The world holds its breath',
        tooltip: 'Rome: -1 stability, -15 legitimacy, armies stand down ("Awaiting Orders", 7 months). Judaea: +5 legitimacy — surely this is the hand of Heaven.',
        effects: guard('ev_nero_dies:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { stability: -1, legitimacy: -15 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'awaiting_orders', name: 'Awaiting Orders', months: 7,
            effects: { aiPassive: true },
          });
          h.adjust(ctx, 'JUD', { legitimacy: 5 });
          h.setFlag(ctx, 'neroDead', true);
        }),
      },
    ],
  },

  // ── 12 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_year_of_four_emperors',
    title: 'The Year of the Four Emperors',
    desc: 'Galba is butchered in the Forum before the month is out; Otho reigns by the '
      + 'Praetorians\' leave; Vitellius\' German legions are already across the Alps. Every '
      + 'road west swallows another cohort\'s attention. In Judaea the war stands still: the '
      + 'legions drill, the convoys thin, and officers speak of Rome in the tone men use for '
      + 'a sick father. For the defenders on Jerusalem\'s walls, heaven has granted what no '
      + 'sally could — time.',
    forTag: 'both',
    date: { y: 69, m: 1 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The legions look west',
        tooltip: 'Rome: armies passive and reinforcements halved for 12 months. Judaea: -2 war exhaustion. The alt-history window is open — use it.',
        effects: guard('ev_year_of_four_emperors:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'ROM', {
            id: 'legions_look_west', name: 'The Legions Look West', months: 12,
            effects: { aiPassive: true, reinforceMult: 0.5 },
          });
          h.adjust(ctx, 'JUD', { warExhaustion: -2 });
        }),
      },
    ],
  },

  // ── 13 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_simon_bar_giora',
    title: 'Simon bar Giora',
    desc: 'The strongman of Acrabatene stands before the walls with an army of freed slaves '
      + 'and desperate men — the same Simon whose raiding has made Idumea a wilderness, '
      + 'invited now by the remnant of the chief priests for one reason only: the city fears '
      + 'John of Gischala more. He is the kind of man who is followed because he is feared, '
      + 'and feared because he is followed.',
    forTag: 'JUD',
    trigger: safeTrigger('ev_simon_bar_giora', (ctx) =>
      dateGE(ctx, 69, 4) && alive(ctx, 'JUD') && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'Admit Simon',
        tooltip: 'Simon bar Giora (3/4/2) brings 6,000 fighters into Jerusalem — and a second government. "Faction Strife": +2 unrest for 24 months.',
        effects: guard('ev_simon_bar_giora:0', (ctx) => {
          const h = ctx.helpers;
          h.spawnArmy(ctx, 'JUD', 'Jerusalem', {
            inf: 6, name: 'Army of Simon',
            general: { name: 'Simon bar Giora', fire: 3, shock: 4, maneuver: 2 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'faction_strife', name: 'Faction Strife', months: 24,
            effects: { unrest: 2 },
          });
        }),
      },
      {
        label: 'Bar the gates',
        tooltip: 'No third tyrant inside the walls — but the crowds wanted a strongman, and the government looks weak. -1 stability.',
        effects: guard('ev_simon_bar_giora:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { stability: -1 });
        }),
      },
    ],
  },

  // ── 14 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_vespasian_emperor',
    title: 'Vespasian Is Proclaimed',
    desc: 'On the first of July the legions of Egypt swear their oath to Vespasian; Judaea\'s '
      + 'legions follow two days later, planting the standards before his tent. The east has '
      + 'made an emperor. Mucianus marches on Rome with the striking force while Vespasian '
      + 'holds Egypt — the empire\'s bread — and the war he began passes to his son. Titus, '
      + 'not yet thirty, takes command of four legions and a grudge the whole army shares: '
      + 'this siege has been postponed too long.',
    forTag: 'both',
    date: { y: 69, m: 7 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Titus takes command',
        tooltip: 'Rome: +1 stability, +20 legitimacy, all passivity ends, and Titus (4/5/5) leads the army of Judaea.',
        effects: guard('ev_vespasian_emperor:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { stability: 1, legitimacy: 20 });
          h.removeModifier(ctx, 'ROM', 'awaiting_orders');
          h.removeModifier(ctx, 'ROM', 'legions_look_west');
          h.removeModifier(ctx, 'ROM', 'governor_hesitates');
          // Titus becomes lead general if not already in the field.
          const hasTitus = !!armyByGeneral(ctx, 'ROM', 'Titus');
          if (!hasTitus) {
            const va = armyByGeneral(ctx, 'ROM', 'Vespasian');
            if (va) va.general = { name: 'Titus', fire: 4, shock: 5, maneuver: 5 };
          }
          h.setFlag(ctx, 'vespasianEmperor', true);
        }),
      },
    ],
  },

  // ── 15 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_famine_in_jerusalem',
    title: 'Famine in the City',
    desc: 'The markets are a memory. Inside the walls, men who were rich sift the sewers for '
      + 'grains of wheat, and the fighters search the houses of the dead — those they suspect '
      + 'of dying with bread still hidden. Whole families climb to the rooftops to die in the '
      + 'sun rather than be searched again. Josephus, calling up from below the ramparts in '
      + 'Aramaic to offer terms, is answered with arrows, and with laughter, which is worse.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_famine_in_jerusalem', (ctx) => {
      const p = ctx.prov('Jerusalem');
      return !!(p && p.siege && p.siege.by && p.siege.by !== 'JUD' && (p.siege.days || 0) >= 60);
    }),
    aiOption: 0,
    options: [
      {
        label: 'The city devours itself',
        tooltip: 'Jerusalem: Famine (permanent while the siege endures — +4 unrest, half taxes, garrison wastes away faster). Judaea +2 war exhaustion.',
        effects: guard('ev_famine_in_jerusalem:0', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'faminePenalty', true);
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'famine', name: 'Famine', months: -1,
            effects: { unrest: 4, taxMult: 0.5 },
          });
          h.adjust(ctx, 'JUD', { warExhaustion: 2 });
        }),
      },
    ],
  },

  // ── 16 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_temple_burns',
    title: 'The Ninth of Av',
    desc: 'A soldier — unbidden, Josephus insists, though who can say what Titus wanted — '
      + 'hurled a burning brand through the golden window, and by evening the House stood in '
      + 'fire from the inner court to the roofline. The daily offering had already ceased for '
      + 'want of men; now the place itself ascends. Those who lived would remember the sound: '
      + 'not the flames but the cry, from the city and from the ridge across the valley, of a '
      + 'people watching the center of the world go out. Far away, in a coastal town called '
      + 'Yavneh, a scholar carried out of the siege in a coffin has begun to teach. The sages '
      + 'begin again.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_temple_burns', (ctx) =>
      ctx.helpers.controls(ctx, 'ROM', 'Jerusalem')),
    aiOption: 0,
    options: [
      {
        label: 'How lonely sits the city',
        tooltip: 'Judaea: -40 legitimacy, "Broken Covenant" (-15% morale, permanent), mourning (+2 unrest, 24 months) in every Jewish province. Rome: +10 legitimacy, +10 gov, +25 warscore.',
        effects: guard('ev_temple_burns:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: -40 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'broken_covenant', name: 'Broken Covenant', months: -1,
            effects: { moraleMult: 0.85 },
          });
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (p && p.religion === 'judaism') {
              h.addProvinceModifier(ctx, p.name, {
                id: 'temple_mourning', name: 'Mourning for the Temple', months: 24,
                effects: { unrest: 2 },
              });
            }
          }
          h.adjust(ctx, 'ROM', { legitimacy: 10, gov: 10 });
          addWarscore(ctx, 'ROM', 25);
          h.setFlag(ctx, 'templeBurned', true);
        }),
      },
    ],
  },

  // ── 17 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_masada_epilogue',
    title: 'The Rock of Masada',
    desc: 'Of all Judaea there remains one place where no Roman order runs: Herod\'s casemate '
      + 'fortress above the Dead Sea, provisioned for years, held by Eleazar ben Yair and the '
      + 'last of the Sicarii with their wives and children. Below on the salt plain the Tenth '
      + 'Legion has begun its wall and its ramp, patient as geometry. Eleazar tells his '
      + 'people that God has granted them one favor still in their power: to die well, and free.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_masada_epilogue', (ctx) => {
      const h = ctx.helpers;
      if (!alive(ctx, 'JUD')) return false;
      if (!h.controls(ctx, 'JUD', 'Masada')) return false;
      return h.countControlled(ctx, 'JUD', {}) === 1;
    }),
    aiOption: 0,
    options: [
      {
        label: 'Free men to the last',
        tooltip: 'Judaea: "The Last Fortress" (+20% morale, permanent). It changes nothing, and it changes everything.',
        effects: guard('ev_masada_epilogue:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', {
            id: 'last_fortress', name: 'The Last Fortress', months: -1,
            effects: { moraleMult: 1.2 },
          });
          h.notify(ctx, {
            title: 'Masada Stands Alone', type: 'bad', provName: 'Masada',
            text: 'The war is over. The ending is not.',
          });
        }),
      },
    ],
  },

  // ── 18 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_parthian_posture',
    title: 'Shadows on the Euphrates',
    desc: 'The envoys sent beyond the river have not returned empty-handed. Vologases has '
      + 'moved his court toward the frontier; Parthian horse exercise within sight of '
      + 'Zeugma\'s ferry, and the exilarch\'s agents in Nehardea are buying grain in the '
      + 'quantities that feed armies. Rome remembers Carrhae the way a body remembers a '
      + 'wound. Every eastern legate now writes his dispatches with one eye over his shoulder.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_parthian_posture', (ctx) => {
      const h = ctx.helpers;
      if (!h.getFlag(ctx, 'parthianSympathy')) return false;
      if (!alive(ctx, 'PAR') || !alive(ctx, 'JUD')) return false;
      return judWarscore(ctx) >= 25;
    }),
    aiOption: 0,
    options: [
      {
        label: 'The King of Kings weighs the omens',
        tooltip: 'Either Parthia declares war on Rome (35% chance), or Rome must garrison the east: "Eastern Anxiety" (armies passive, 6 months).',
        effects: guard('ev_parthian_posture:0', (ctx) => {
          const h = ctx.helpers;
          const par = ctx.game.tags.PAR;
          const alreadyAtWar = !!(par && Array.isArray(par.atWarWith) && par.atWarWith.indexOf('ROM') !== -1);
          const roll = ctx.rng && typeof ctx.rng.chance === 'function' ? ctx.rng.chance(0.35) : false;
          if (roll && !alreadyAtWar && alive(ctx, 'PAR')) {
            h.declareWar(ctx, 'PAR', 'ROM', 'War of the Euphrates');
            h.notify(ctx, {
              title: 'Parthia Declares War', type: 'war', provName: 'Zeugma',
              text: 'The King of Kings crosses the Euphrates. Rome\'s eastern frontier is aflame.',
            });
          } else {
            h.addTagModifier(ctx, 'ROM', {
              id: 'eastern_anxiety', name: 'Eastern Anxiety', months: 6,
              effects: { aiPassive: true },
            });
          }
        }),
      },
    ],
  },

  // ── 19 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_adiabene_convoy',
    title: 'The Convoy from Adiabene',
    desc: 'Camels out of the east under the badges of a royal house: Queen Helena\'s family '
      + 'of Adiabene, converts to the God of Israel for a generation now, have sent silver '
      + 'and grain as they once sent famine relief in Claudius\' day. Two of the king\'s '
      + 'kinsmen, Monobazus and Kenedaeus, fought in the passes against Cestius; the house '
      + 'keeps faith. The storehouses take the grain. The mint takes the silver.',
    forTag: 'JUD',
    date: { y: 67, m: 3 },
    aiOption: 0,
    options: [
      {
        label: 'Blessed are the faithful of Adiabene',
        tooltip: 'Judaea: +40 treasury, +2,000 manpower.',
        effects: guard('ev_adiabene_convoy:0', (ctx) => {
          if (!alive(ctx, 'JUD')) return;
          ctx.helpers.adjust(ctx, 'JUD', { treasury: 40, manpower: 2000 });
        }),
      },
    ],
  },

  // ── 20 ────────────────────────────────────────────────────────────────────
  // Fired by BOOKMARK_66.checkVictory on the JUD win; never fires on its own.
  {
    id: 'ev_negotiated_peace',
    title: 'A Negotiated Peace',
    desc: 'The emperor\'s arithmetic is imperial, not personal: the eastern legions are '
      + 'wanted on the Danube, the treasury needs Egypt\'s grain fleet sailing and Syria '
      + 'quiet, and a client king on David\'s throne costs less than three legions in '
      + 'perpetuity. So the instruments are signed at Berytus. Judaea keeps its Temple, its '
      + 'Law, and its walls — and renders tribute, as in Herod\'s day. The men on the '
      + 'ramparts of Jerusalem, who have held since the day the sacrifices ceased, learn '
      + 'that the price of Rome\'s peace was never lower than the cost of Rome\'s war.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_negotiated_peace', () => false),
    aiOption: 0,
    options: [
      {
        label: 'Peace, of a kind',
        tooltip: 'Judaea: +20 legitimacy, +1 stability. The Temple stands.',
        effects: guard('ev_negotiated_peace:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 20, stability: 1 });
        }),
      },
    ],
  },

  // ── Flavor ────────────────────────────────────────────────────────────────
  {
    id: 'ev_zion_coinage',
    title: 'Year One of the Freedom of Zion',
    desc: 'For the first time since the Hasmoneans, Jewish silver: the Temple mint is '
      + 'striking shekels of full weight — a chalice on one face, a stem of three '
      + 'pomegranates on the other, lettered in the old script: "Shekel of Israel. Year One '
      + 'of the Freedom of Zion." No emperor\'s face. Men who cannot read the ancient '
      + 'letters still understand exactly what the coin is saying.',
    forTag: 'JUD',
    date: { y: 66, m: 9 },
    aiOption: 0,
    options: [
      {
        label: 'Strike the shekels of Israel',
        tooltip: 'Judaea: +10 legitimacy. A government that mints is a government.',
        effects: guard('ev_zion_coinage:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 10 });
        }),
      },
      {
        label: 'Coin the bullion for the war chest',
        tooltip: 'Judaea: +30 treasury, +3 legitimacy. Less poetry, more pay.',
        effects: guard('ev_zion_coinage:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { treasury: 30, legitimacy: 3 });
        }),
      },
    ],
  },

  {
    id: 'ev_diaspora_prayers',
    title: 'The Diaspora Watches',
    desc: 'Letters and silver arrive by ways the Romans do not patrol: from Alexandria\'s '
      + 'quarter, grieving its own dead; from the Babylonian communities of Nehardea, '
      + 'ancient, wealthy, and beyond Caesar\'s reach entirely. In every synagogue from '
      + 'Cyrene to Ctesiphon they are praying for Jerusalem. Prayer travels. So, the elders '
      + 'hint, could other things — if Jerusalem asked, and asked well.',
    forTag: 'JUD',
    date: { y: 66, m: 11 },
    aiOption: 1,
    options: [
      {
        label: 'Take the silver with thanks',
        tooltip: 'Judaea: +25 treasury, +5 legitimacy.',
        effects: guard('ev_diaspora_prayers:0', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { treasury: 25, legitimacy: 5 });
        }),
      },
      {
        label: 'Send envoys beyond the Euphrates',
        tooltip: 'Costs 50 influence points and 10 talents. Parthia begins to watch the war — and may move, if the war goes well enough to be worth joining.',
        effects: guard('ev_diaspora_prayers:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { infl: -50, treasury: -10 });
          h.setFlag(ctx, 'parthianSympathy', true);
          setOpinion(ctx, 'PAR', 'JUD', 80);
        }),
      },
    ],
  },

  {
    id: 'ev_sepphoris_opens_gates',
    title: 'Sepphoris Opens Its Gates',
    desc: 'The largest city of Galilee has weighed the walls Josephus built for it against '
      + 'the legions on the coast road, and chosen. Its magistrates ride out to the Roman '
      + 'camp with garlands and ask for a garrison; the mint of Sepphoris will soon strike '
      + 'coins styling it Eirenopolis — City of Peace. Galilee\'s shield now has a hole in '
      + 'its center the size of its richest city.',
    forTag: 'both',
    major: true,
    chance: 0.6,
    trigger: safeTrigger('ev_sepphoris_opens_gates', (ctx) => {
      const h = ctx.helpers;
      if (!dateGE(ctx, 67, 1)) return false;
      if (!h.controls(ctx, 'JUD', 'Sepphoris')) return false;
      const sid = ctx.provId ? ctx.provId('Sepphoris') : 0;
      if (!sid || !ctx.geom || !ctx.geom.neighbors) return false;
      const near = new Set([sid]);
      const n1 = ctx.geom.neighbors[sid];
      if (!n1) return false;
      for (const a of n1) {
        near.add(a);
        const n2 = ctx.geom.neighbors[a];
        if (n2) for (const b of n2) near.add(b);
      }
      return h.armiesOf(ctx, 'ROM').some((ar) => ar && near.has(ar.prov));
    }),
    aiOption: 0,
    options: [
      {
        label: 'The City of Peace',
        tooltip: 'Sepphoris passes under Roman control and quiets (-3 unrest, 36 months). Galilee\'s defense is compromised.',
        effects: guard('ev_sepphoris_opens_gates:0', (ctx) => {
          const h = ctx.helpers;
          h.changeController(ctx, 'Sepphoris', 'ROM');
          h.addProvinceModifier(ctx, 'Sepphoris', {
            id: 'city_of_peace', name: 'City of Peace', months: 36,
            effects: { unrest: -3 },
          });
        }),
      },
    ],
  },

  {
    id: 'ev_nabataean_archers',
    title: 'The Arabian Contingent',
    desc: 'Malichus of Nabataea has read the omens of trade, which are surer than birds: a '
      + 'thousand horse and five thousand foot, most of them archers, arrive at Ptolemais '
      + 'under their own sheikhs to join the Roman muster. Petra\'s caravans need Roman '
      + 'roads open and Roman customs houses friendly, and the king pays his premiums in men.',
    forTag: 'ROM',
    date: { y: 67, m: 4 },
    aiOption: 0,
    options: [
      {
        label: 'Welcome the king\'s men',
        tooltip: 'Rome: 5,000 foot archers and 1,000 horse join at Ptolemais.',
        effects: guard('ev_nabataean_archers:0', (ctx) => {
          if (!alive(ctx, 'ROM')) return;
          ctx.helpers.spawnArmy(ctx, 'ROM', 'Ptolemais', {
            inf: 5, cav: 1, name: 'Nabataean Auxiliaries',
          });
          setOpinion(ctx, 'ROM', 'NAB', 100);
        }),
      },
    ],
  },

  {
    id: 'ev_tarichaea_lake',
    title: 'The Lake Ran Red',
    desc: 'Tarichaea\'s fighters fled onto the water in anything that would float, and '
      + 'Vespasian sent rafts after them. It was not a battle: the lake\'s own fishermen '
      + 'were hunted across their own water until, Josephus writes, the whole of Gennesaret '
      + 'was stained and the shores stank for days. Six thousand of the survivors were sent '
      + 'to dig Nero\'s canal at Corinth; thirty thousand more went under the auctioneer\'s spear.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_tarichaea_lake', (ctx) =>
      dateGE(ctx, 67, 1) && ctx.helpers.controls(ctx, 'ROM', 'Tarichaea')),
    aiOption: 0,
    options: [
      {
        label: 'Gennesaret mourns',
        tooltip: 'Tarichaea: "The Lake Ran Red" (-40% tax, +2 unrest, 36 months). Judaea +1 war exhaustion.',
        effects: guard('ev_tarichaea_lake:0', (ctx) => {
          const h = ctx.helpers;
          h.addProvinceModifier(ctx, 'Tarichaea', {
            id: 'lake_massacre', name: 'The Lake Ran Red', months: 36,
            effects: { taxMult: 0.6, unrest: 2 },
          });
          h.adjust(ctx, 'JUD', { warExhaustion: 1 });
        }),
      },
    ],
  },
];
