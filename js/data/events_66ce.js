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

// The victory-timeline gate (mirror of the templeBurned gate below): a living
// Judaea, sovereign in Jerusalem, with the Roman war over. In the history
// where the legions won, this is never true and the strand never fires.
function judaeaFree(ctx) {
  return alive(ctx, 'JUD')
    && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')
    && !findJudRomWar(ctx.game);
}

// Scripted warscore swings persist in the war's eventScore side-bucket, which
// sideGross folds into every monthly rebuild (writing w.warscore directly gets
// clobbered by updateWarscores within the month).
function addWarscore(ctx, tag, amount) {
  try {
    const w = findJudRomWar(ctx.game);
    if (!w) return;
    if (!w.eventScore) w.eventScore = { att: 0, def: 0 };
    const side = (w.attackers || []).indexOf(tag) >= 0 ? 'att'
      : (w.defenders || []).indexOf(tag) >= 0 ? 'def' : null;
    if (side) w.eventScore[side] += amount;
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
    requiresWar: ['JUD', 'ROM'],
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
    decider: 'JUD',
    date: { y: 66, m: 8 },
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'There is no way back now',
        tooltip: 'Communal Massacres (+3 unrest, -20% tax, 18 months) in six mixed cities; +1 war exhaustion for both Judaea and Rome.',
        effects: guard('ev_greek_city_massacres:0', (ctx) => {
          const h = ctx.helpers;
          // Damascus' massacre followed Beth Horon (BJ 2.559-561) — applied there instead.
          const cities = ['Caesarea Maritima', 'Scythopolis', 'Ptolemais', 'Ascalon', 'Alexandria'];
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
      {
        label: 'Gather the survivors behind the walls',
        tooltip: 'The massacres run their course regardless (+3 unrest, −20% tax, 18 months in the mixed cities; +1 war exhaustion for both) — but the survivors who reach Judaea are taken in: +2,000 manpower, −20 treasury, and Jerusalem +1 unrest for 12 months as the refugees crowd in.',
        effects: guard('ev_greek_city_massacres:1', (ctx) => {
          const h = ctx.helpers;
          const cities = ['Caesarea Maritima', 'Scythopolis', 'Ptolemais', 'Ascalon', 'Alexandria'];
          for (const name of cities) {
            h.addProvinceModifier(ctx, name, {
              id: 'communal_massacres', name: 'Communal Massacres', months: 18,
              effects: { unrest: 3, taxMult: 0.8 },
            });
          }
          h.adjust(ctx, 'JUD', { warExhaustion: 1 });
          h.adjust(ctx, 'ROM', { warExhaustion: 1 });
          h.adjust(ctx, 'JUD', { manpower: 2000, treasury: -20 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'refugee_influx', name: 'The Refugees of the Coast', months: 12,
            effects: { unrest: 1 },
          });
        }),
      },
    ],
  },

  // ── 4 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_cestius_marches',
    title: 'Cestius Gallus Marches',
    requiresWar: ['JUD', 'ROM'],
    desc: 'The governor of Syria can no longer wait upon events. Cestius Gallus leaves Antioch '
      + 'with the Twelfth Legion Fulminata, two thousand picked men from each of the other legions, '
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
    requiresWar: ['JUD', 'ROM'],
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
        tooltip: 'Cestius loses nearly six thousand men — and his baggage and engines — and flees to Ptolemais. Judaea: +25 military points, +15 legitimacy, +2,000 manpower, +15 warscore, and Captured Siege Engines (+1 siege, 24 months).',
        effects: guard('ev_beth_horon:0', (ctx) => {
          const h = ctx.helpers;
          const cest = armyByGeneral(ctx, 'ROM', 'Cestius Gallus');
          if (cest && !cest.inBattle) {
            const regs = cest.regiments
              ? ((cest.regiments.inf || 0) + (cest.regiments.cav || 0))
              : Math.round((cest.men || 12000) / 1000);
            const keep = Math.max(2, regs - 6); // ~5,700 dead per Josephus (BJ 2.555)
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
          // The Damascenes turned on their Jews in the panic after Cestius' rout (BJ 2.559-561).
          h.addProvinceModifier(ctx, 'Damascus', {
            id: 'communal_massacres', name: 'Communal Massacres', months: 18,
            effects: { unrest: 3, taxMult: 0.8 },
          });
          h.notify(ctx, {
            title: 'Disaster at Beth Horon', type: 'good', provName: 'Emmaus',
            text: 'The Twelfth Legion is mauled in the passes. Its engines are ours.',
          });
        }),
      },
      {
        label: 'Hound them down to Antipatris',
        tooltip: 'The pursuit is pressed past the hills: Cestius loses another thousand men on the coast road. Judaea: +25 military points, +15 legitimacy, +15 warscore, and Captured Siege Engines (+1 siege, 24 months) — but only +1,000 manpower; the pursuit has its own price.',
        effects: guard('ev_beth_horon:1', (ctx) => {
          const h = ctx.helpers;
          const cest = armyByGeneral(ctx, 'ROM', 'Cestius Gallus');
          if (cest && !cest.inBattle) {
            const regs = cest.regiments
              ? ((cest.regiments.inf || 0) + (cest.regiments.cav || 0))
              : Math.round((cest.men || 12000) / 1000);
            const keep = Math.max(2, regs - 7); // one more cohort dies on the road south
            h.removeArmy(ctx, cest.id);
            h.spawnArmy(ctx, 'ROM', 'Ptolemais', {
              inf: keep, name: 'Remnants of the Twelfth',
              general: { name: 'Cestius Gallus', fire: 1, shock: 1, maneuver: 1 },
            });
          }
          h.adjust(ctx, 'JUD', { mar: 25, legitimacy: 15, manpower: 1000 });
          h.adjust(ctx, 'ROM', { warExhaustion: 2, legitimacy: -5 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'captured_engines', name: 'Captured Siege Engines', months: 24,
            effects: { siegeBonus: 1 },
          });
          addWarscore(ctx, 'JUD', 15);
          h.setFlag(ctx, 'bethHoron', true);
          // The Damascenes turned on their Jews in the panic after Cestius' rout (BJ 2.559-561).
          h.addProvinceModifier(ctx, 'Damascus', {
            id: 'communal_massacres', name: 'Communal Massacres', months: 18,
            effects: { unrest: 3, taxMult: 0.8 },
          });
          h.notify(ctx, {
            title: 'Disaster at Beth Horon', type: 'good', provName: 'Emmaus',
            text: 'The Twelfth is hounded to Antipatris and beyond. Its engines are ours.',
          });
        }),
      },
    ],
  },

  // ── 6 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_organizing_the_revolt',
    title: 'Organizing the Revolt',
    requiresWar: ['JUD', 'ROM'],
    desc: 'In the Temple, the coalition of priests and notables parcels out the country: '
      + 'Ananus ben Ananus holds the city, Eleazar ben Ananias takes Idumea, and the young '
      + 'priest Joseph ben Matthias — who will one day write this war\'s history under '
      + 'another name — is confirmed in the Galilee command he already holds, where the first '
      + 'blow must fall. He finds the province quarrelsome, half-Greek, and unwalled.',
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
    requiresWar: ['JUD', 'ROM'],
    desc: 'Nero, hearing in Achaea of Cestius\' disgrace, has given the war to a man with too '
      + 'little ambition to be dangerous and too much experience to fail: Titus Flavius '
      + 'Vespasianus, who broke the Britons in their wet forests. He travels overland to '
      + 'Syria while his son Titus brings the Fifteenth Legion up from Alexandria. At '
      + 'Ptolemais the army assembles — the Fifth, the Tenth, the Fifteenth, twenty-three '
      + 'cohorts of auxiliaries, and the kings\' contingents: sixty thousand men under arms. '
      + 'The reduction of Judaea begins.',
    forTag: 'both',
    decider: 'ROM',
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
      {
        label: 'The client kings must empty their levies',
        tooltip: 'Vespasian (5/5/4) lands 36,000 at Ptolemais with the kings\' full contingents; Titus (4/5/5) brings 15,000 to Caesarea. Rome +10,000 manpower — but −50 treasury in subsidies and gifts to Agrippa, Sohaemus, and Antiochus.',
        effects: guard('ev_vespasian_arrives:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM')) return;
          h.spawnArmy(ctx, 'ROM', 'Ptolemais', {
            inf: 31, cav: 5, name: 'Army of Vespasian',
            general: { name: 'Vespasian', fire: 5, shock: 5, maneuver: 4 },
          });
          h.spawnArmy(ctx, 'ROM', 'Caesarea Maritima', {
            inf: 13, cav: 2, name: 'Legio XV Apollinaris',
            general: { name: 'Titus', fire: 4, shock: 5, maneuver: 5 },
          });
          h.removeModifier(ctx, 'ROM', 'governor_hesitates');
          h.adjust(ctx, 'ROM', { manpower: 10000, treasury: -50 });
          h.setFlag(ctx, 'vespasianArrived', true);
        }),
      },
    ],
  },

  // ── 8 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev_jotapata_falls',
    title: 'The Prophet of Jotapata',
    requiresWar: ['JUD', 'ROM'],
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
    requiresWar: ['JUD', 'ROM'],
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
      {
        label: 'Let his tale ring from the porticoes',
        tooltip: 'If Jerusalem holds: John\'s boasting raises 3,000 Zealots under his command (2/3/2), but the city gains "Zealot Coup" (+3 unrest, 24 months) and Judaea loses 1 stability and 5 legitimacy — the lie becomes the government\'s policy.',
        effects: guard('ev_gischala_falls:1', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'JUD')) return;
          if (h.controls(ctx, 'JUD', 'Jerusalem')) {
            h.spawnArmy(ctx, 'JUD', 'Jerusalem', {
              inf: 3, name: "John's Zealots",
              general: { name: 'John of Gischala', fire: 2, shock: 3, maneuver: 2 },
            });
            h.addProvinceModifier(ctx, 'Jerusalem', {
              id: 'zealot_coup', name: 'Zealot Coup', months: 24,
              effects: { unrest: 3 },
            });
          }
          h.adjust(ctx, 'JUD', { stability: -1, legitimacy: -5 });
        }),
      },
    ],
  },

  // ── 10 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_zealot_coup',
    title: 'The Zealots Seize the Temple',
    requiresWar: ['JUD', 'ROM'],
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
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The world holds its breath',
        tooltip: 'Galba (2/1/2) is hailed emperor. Rome: -1 stability, -15 legitimacy, armies stand down ("Awaiting Orders", 7 months). Judaea: +5 legitimacy — surely this is the hand of Heaven.',
        effects: guard('ev_nero_dies:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { stability: -1, legitimacy: -15 });
          h.setRuler(ctx, 'ROM', { name: 'Galba', title: 'Emperor', gov: 2, infl: 1, mar: 2, age: 70 });
          h.setHeir(ctx, 'ROM', null);
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
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The legions look west',
        tooltip: 'Vitellius (1/1/1) holds the throne — for now. Rome: armies passive and reinforcements halved for 12 months. Judaea: -2 war exhaustion. The alt-history window is open — use it.',
        effects: guard('ev_year_of_four_emperors:0', (ctx) => {
          const h = ctx.helpers;
          h.setRuler(ctx, 'ROM', { name: 'Vitellius', title: 'Emperor', gov: 1, infl: 1, mar: 1, age: 54 });
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
    requiresWar: ['JUD', 'ROM'],
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
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Titus takes command',
        tooltip: 'Vespasian (4/3/5) rules with Titus as heir. Rome: +1 stability, +20 legitimacy, all passivity ends, and Titus (4/5/5) leads the army of Judaea.',
        effects: guard('ev_vespasian_emperor:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { stability: 1, legitimacy: 20 });
          h.setRuler(ctx, 'ROM', { name: 'Vespasian', title: 'Emperor', gov: 4, infl: 3, mar: 5, age: 59 });
          h.setHeir(ctx, 'ROM', { name: 'Titus', gov: 3, infl: 3, mar: 5, age: 29 });
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
    requiresWar: ['JUD', 'ROM'],
    desc: 'The markets are a memory. Inside the walls, men who were rich sift the sewers for '
      + 'grains of wheat, and the fighters search the houses of the dead — those they suspect '
      + 'of dying with bread still hidden. Whole families climb to the rooftops to die in the '
      + 'sun rather than be searched again. Josephus, calling up from below the ramparts in '
      + 'Aramaic to offer terms, is answered with arrows, and with laughter, which is worse.',
    forTag: 'both',
    decider: 'JUD',
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
      {
        label: 'The fighters eat first',
        tooltip: 'Jerusalem: Famine (permanent while the siege endures — +4 unrest, half taxes) — but the last granaries are seized for the men on the walls: +5% morale for 12 months. Judaea +2 war exhaustion and −10 legitimacy; the searchers of houses are not forgiven.',
        effects: guard('ev_famine_in_jerusalem:1', (ctx) => {
          const h = ctx.helpers;
          h.setFlag(ctx, 'faminePenalty', true);
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'famine', name: 'Famine', months: -1,
            effects: { unrest: 4, taxMult: 0.5 },
          });
          h.adjust(ctx, 'JUD', { warExhaustion: 2 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'fighters_fed', name: 'The Fighters Eat First', months: 12,
            effects: { moraleMult: 1.05 },
          });
          h.adjust(ctx, 'JUD', { legitimacy: -10 });
        }),
      },
    ],
  },

  // ── 16 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_temple_burns',
    title: 'The Ninth of Av',
    requiresWar: ['JUD', 'ROM'],
    desc: 'A soldier — unbidden, Josephus insists, though who can say what Titus wanted — '
      + 'hurled a burning brand through the golden window, and by evening the House stood in '
      + 'fire from the inner court to the roofline. The daily offering had already ceased for '
      + 'want of men; now the place itself ascends. Those who lived would remember the sound: '
      + 'not the flames but the cry, from the city and from the ridge across the valley, of a '
      + 'people watching the center of the world go out. Far away, in a town of the coastal '
      + 'plain called Yavneh, a scholar carried out of the siege in a coffin has begun to '
      + 'teach. The sages begin again.',
    forTag: 'both',
    decider: 'JUD',
    major: true,
    trigger: safeTrigger('ev_temple_burns', (ctx) => {
      // Any occupier on Rome's side of the war burns as surely as Rome itself —
      // but the text presupposes the great siege: not before Titus is in theater
      // (ev_vespasian_arrives, 67-02). A Cestius coup-de-main in 66 spares the House.
      if (!ctx.game.firedEvents.ev_vespasian_arrives) return false;
      const jer = ctx.prov('Jerusalem');
      return !!jer && ['ROM', 'AGR', 'NAB'].indexOf(jer.controller) >= 0;
    }),
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
      {
        label: 'Carry the scrolls to Yavneh',
        tooltip: 'Judaea: −40 legitimacy, "Broken Covenant" (−15% morale, permanent), mourning (+2 unrest, 24 months) in every Jewish province — but the sages begin again: +15 government points, +1 war exhaustion as the fight goes out of the men. Rome: +10 legitimacy, +10 gov, +25 warscore.',
        effects: guard('ev_temple_burns:1', (ctx) => {
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
          h.adjust(ctx, 'JUD', { gov: 15, warExhaustion: 1 });
        }),
      },
    ],
  },

  // ── 17 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_masada_epilogue',
    title: 'The Rock of Masada',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Of all Judaea there remains one place where no Roman order runs: Herod\'s casemate '
      + 'fortress above the Dead Sea, provisioned for years, held by Eleazar ben Yair and the '
      + 'last of the Sicarii with their wives and children. Below on the salt plain the Tenth '
      + 'Legion has begun its wall and its ramp, patient as geometry. Eleazar tells his '
      + 'people that God has granted them one favor still in their power: to die well, and free.',
    forTag: 'both',
    decider: 'JUD',
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
      {
        label: 'Meet the ramp with swords drawn',
        tooltip: 'Judaea: "Swords in Hand" (+10% morale, permanent) and +15 military points; Rome +1 war exhaustion — the Tenth pays in blood for its geometry.',
        effects: guard('ev_masada_epilogue:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', {
            id: 'last_fortress', name: 'Swords in Hand', months: -1,
            effects: { moraleMult: 1.1 },
          });
          h.adjust(ctx, 'JUD', { mar: 15 });
          h.adjust(ctx, 'ROM', { warExhaustion: 1 });
          h.notify(ctx, {
            title: 'Masada Stands Alone', type: 'bad', provName: 'Masada',
            text: 'The war is over. The last of it will be paid for at the breach.',
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
      + 'Zeugma\'s ferry, and the agents of Nehardea\'s elders are buying grain in the '
      + 'quantities that feed armies. Rome remembers Carrhae the way a body remembers a '
      + 'wound. Every eastern legate now writes his dispatches with one eye over his shoulder.',
    forTag: 'both',
    decider: 'JUD',
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
      {
        label: 'Send gold over the river to tip the scales',
        tooltip: 'Judaea: −40 treasury to Nehardea\'s elders and the court at Ctesiphon. Either Parthia declares war on Rome (50% chance), or Rome must garrison the east: "Eastern Anxiety" (armies passive, 6 months).',
        effects: guard('ev_parthian_posture:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -40 });
          const par = ctx.game.tags.PAR;
          const alreadyAtWar = !!(par && Array.isArray(par.atWarWith) && par.atWarWith.indexOf('ROM') !== -1);
          const roll = ctx.rng && typeof ctx.rng.chance === 'function' ? ctx.rng.chance(0.5) : false;
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
      {
        label: 'Grain for the widows, as in Helena\'s day',
        tooltip: 'Judaea: +20 treasury, +1,000 manpower, +5 legitimacy — and the queen\'s grain feeds Jerusalem (−2 unrest, 24 months).',
        effects: guard('ev_adiabene_convoy:1', (ctx) => {
          if (!alive(ctx, 'JUD')) return;
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 20, manpower: 1000, legitimacy: 5 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'helenas_grain', name: 'Queen Helena\'s Grain', months: 24,
            effects: { unrest: -2 },
          });
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
    decider: 'JUD',
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
      {
        label: 'Pour the tribute\'s first fruits into the land',
        tooltip: 'Judaea: +10 legitimacy, +1 stability, −60 treasury spent on the ruined countryside — and Jerusalem quiets ("The Land Restored", −2 unrest, 36 months). The Temple stands.',
        effects: guard('ev_negotiated_peace:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 10, stability: 1, treasury: -60 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'land_restored', name: 'The Land Restored', months: 36,
            effects: { unrest: -2 },
          });
        }),
      },
    ],
  },

  // ── Flavor ────────────────────────────────────────────────────────────────
  {
    id: 'ev_zion_coinage',
    title: 'Year One of the Freedom of Zion',
    desc: 'For the first time in Israel\'s history, Jewish silver — the Hasmoneans struck '
      + 'only bronze, and the shekels of the Temple tax were always Tyre\'s. Now the Temple '
      + 'mint is striking shekels of full weight — a chalice on one face, a stem of three '
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
    requiresWar: ['JUD', 'ROM'],
    desc: 'The largest city of Galilee has weighed the walls Josephus built for it against '
      + 'the legions on the coast road, and chosen. Its magistrates ride out to the Roman '
      + 'camp with garlands and ask for a garrison; the mint of Sepphoris will soon strike '
      + 'coins styling it Eirenopolis — City of Peace. Galilee\'s shield now has a hole in '
      + 'its center the size of its richest city.',
    forTag: 'both',
    decider: 'JUD',
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
      {
        label: 'Strip the fields of the City of Peace',
        tooltip: 'Sepphoris still passes under Roman control and quiets (−3 unrest, 36 months) — but Judaean raiders strip its countryside first: Judaea +20 treasury, −5 legitimacy; Sepphoris "Ravaged Hinterland" (−30% tax, 12 months).',
        effects: guard('ev_sepphoris_opens_gates:1', (ctx) => {
          const h = ctx.helpers;
          h.changeController(ctx, 'Sepphoris', 'ROM');
          h.addProvinceModifier(ctx, 'Sepphoris', {
            id: 'city_of_peace', name: 'City of Peace', months: 36,
            effects: { unrest: -3 },
          });
          h.addProvinceModifier(ctx, 'Sepphoris', {
            id: 'ravaged_hinterland', name: 'Ravaged Hinterland', months: 12,
            effects: { taxMult: 0.7 },
          });
          h.adjust(ctx, 'JUD', { treasury: 20, legitimacy: -5 });
        }),
      },
    ],
  },

  {
    id: 'ev_nabataean_archers',
    title: 'The Arabian Contingent',
    requiresWar: ['JUD', 'ROM'],
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
      {
        label: 'Buy the king\'s horsemen too',
        tooltip: 'Rome: −40 treasury; 5,000 foot archers and 2,000 horse join at Ptolemais — Petra sells its cavalry at Petra\'s prices.',
        effects: guard('ev_nabataean_archers:1', (ctx) => {
          if (!alive(ctx, 'ROM')) return;
          const h = ctx.helpers;
          h.spawnArmy(ctx, 'ROM', 'Ptolemais', {
            inf: 5, cav: 2, name: 'Nabataean Auxiliaries',
          });
          setOpinion(ctx, 'ROM', 'NAB', 100);
          h.adjust(ctx, 'ROM', { treasury: -40 });
        }),
      },
    ],
  },

  {
    id: 'ev_tarichaea_lake',
    title: 'The Lake Ran Red',
    requiresWar: ['JUD', 'ROM'],
    desc: 'Tarichaea\'s fighters fled onto the water in anything that would float, and '
      + 'Vespasian sent rafts after them. It was not a battle: the lake\'s own fishermen '
      + 'were hunted across their own water until, Josephus writes, the whole of Gennesaret '
      + 'was stained and the shores stank for days. Six thousand of the survivors were sent '
      + 'to dig Nero\'s canal at Corinth; thirty thousand more went under the auctioneer\'s spear.',
    forTag: 'both',
    decider: 'ROM',
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
      {
        label: 'The auctioneer\'s spear does its work',
        tooltip: 'Tarichaea: "The Lake Ran Red" (−40% tax, +2 unrest, 36 months); Judaea +1 war exhaustion. Rome: +30 treasury from the slave auctions — and −5 legitimacy for the pledge broken in the stadium of Tiberias.',
        effects: guard('ev_tarichaea_lake:1', (ctx) => {
          const h = ctx.helpers;
          h.addProvinceModifier(ctx, 'Tarichaea', {
            id: 'lake_massacre', name: 'The Lake Ran Red', months: 36,
            effects: { taxMult: 0.6, unrest: 2 },
          });
          h.adjust(ctx, 'JUD', { warExhaustion: 1 });
          h.adjust(ctx, 'ROM', { treasury: 30, legitimacy: -5 });
        }),
      },
    ],
  },

  // Fired by BOOKMARK_66.checkVictory when Judaea reaches +50 war score
  // (SPEC §32); never fires on its own. Rome's peace is an OFFER.
  {
    id: 'ev_rome_sues',
    title: 'Rome Sues for Peace',
    requiresWar: ['JUD', 'ROM'],
    desc: 'The legions are broken and the east is in flames. Rather than feed another '
      + 'army into the Judean hills, the emperor offers terms: Judaea keeps its own '
      + 'king, its own Law, and its Temple — the hills of the faith it holds. The '
      + 'Greek cities and the coast it merely occupies go home. Or the elders can '
      + 'wager the House itself on the next campaign season.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_rome_sues', () => false),
    aiOption: 0,
    options: [
      {
        label: 'Take the peace — king, Law and Temple',
        tooltip: 'Victory (score 200). The Roman war ends; Judaea keeps the provinces of the faith it holds, and every other occupied town returns.',
        effects: guard('ev_rome_sues:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.fireEvent(ctx, 'ev_negotiated_peace');
          const w = (g.wars || []).find((x) => x
            && (x.attackers.concat(x.defenders)).indexOf('JUD') >= 0
            && (x.attackers.concat(x.defenders)).indexOf('ROM') >= 0);
          const key = w && (w.attackers || []).indexOf('JUD') >= 0 ? 'att' : 'def';
          h.endWar(ctx, 'JUD', 'ROM', key, { keep: (p) => p.religion === 'judaism' });
          h.endGame(ctx, {
            result: 'win',
            title: 'Rome Sues for Peace',
            text: 'The emperor grants Judaea its own king, its own Law, and its Temple. '
              + 'No shekel of tribute was ever better spent than the blood at Beth Horon.',
            score: 200,
          });
        }),
      },
      {
        label: 'The next season decides it',
        tooltip: 'The war goes on. +5 legitimacy; Rome will not offer twice.',
        effects: guard('ev_rome_sues:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ═══ Aftermath: the generation after the House, 70–96 CE ══════════════════
  // These events continue the scripted history into the Flavian era. Everything
  // that presupposes Rome's victory is gated on the templeBurned flag (set by
  // ev_temple_burns) and, where it matters, on ROM actually holding the ground —
  // in an alternate history where Judaea won (ev_rome_sues / the timed win),
  // those triggers simply never come true and the world walks a different road.
  // Pure world history (imperial successions, Vesuvius) fires regardless.

  // ── 21 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_city_razed',
    title: 'So That None Would Believe It Inhabited',
    desc: 'The order comes down from the young commander\'s tribunal: dig the city up. The '
      + 'soldiers work for weeks with the same patience they gave the ramp and the '
      + 'circumvallation, until wall and house and colonnade lie level with the rock — all '
      + 'but three towers of Herod\'s palace and a stretch of the western wall, left standing '
      + 'to show posterity what manner of city Rome had taken. Josephus writes it plainly: '
      + 'nothing remained to make a visitor believe the place had ever been inhabited. On '
      + 'the emptied plateau the Tenth Legion Fretensis pitches its camp among the stones '
      + 'it broke.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    trigger: safeTrigger('ev_city_razed', (ctx) => {
      const h = ctx.helpers;
      return !!h.getFlag(ctx, 'templeBurned') && h.controls(ctx, 'ROM', 'Jerusalem');
    }),
    aiOption: 0,
    options: [
      {
        label: 'Leave the three towers as a boast',
        tooltip: 'Jerusalem: "A City Ploughed Under" (−70% tax, −3 unrest, permanent — there is no one left to be restless). Rome +40 treasury in plunder; Judaea −10 legitimacy.',
        effects: guard('ev_city_razed:0', (ctx) => {
          const h = ctx.helpers;
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'city_razed', name: 'A City Ploughed Under', months: -1,
            effects: { taxMult: 0.3, unrest: -3 },
          });
          h.adjust(ctx, 'ROM', { treasury: 40 });
          h.adjust(ctx, 'JUD', { legitimacy: -10 });
          h.setFlag(ctx, 'jerusalemRazed', true);
          h.notify(ctx, {
            title: 'Jerusalem Razed', type: 'bad', provName: 'Jerusalem',
            text: 'The Tenth Legion camps on the levelled rock. Three towers remain, as a boast.',
          });
        }),
      },
      {
        label: 'Let the Tenth quarry the ruins for its camp',
        tooltip: 'Jerusalem: "A City Ploughed Under" (−70% tax, −3 unrest, permanent). Rome: only +20 treasury, but "The Tenth on the Ruins" (−5% army maintenance, 36 months) — the garrison houses itself in the wreckage. Judaea −10 legitimacy.',
        effects: guard('ev_city_razed:1', (ctx) => {
          const h = ctx.helpers;
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'city_razed', name: 'A City Ploughed Under', months: -1,
            effects: { taxMult: 0.3, unrest: -3 },
          });
          h.adjust(ctx, 'ROM', { treasury: 20 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'tenth_on_the_ruins', name: 'The Tenth on the Ruins', months: 36,
            effects: { maintMult: 0.95 },
          });
          h.adjust(ctx, 'JUD', { legitimacy: -10 });
          h.setFlag(ctx, 'jerusalemRazed', true);
          h.notify(ctx, {
            title: 'Jerusalem Razed', type: 'bad', provName: 'Jerusalem',
            text: 'The Tenth Legion builds its huts from the stones of the upper city.',
          });
        }),
      },
    ],
  },

  // ── 22 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_yavneh_academy',
    title: 'Yavneh and Its Sages',
    desc: 'The story will be told for two thousand years: how Yohanan ben Zakkai, oldest of '
      + 'the disciples of Hillel, had himself carried out of the dying city in a coffin — '
      + 'the only Jew the guards at the gate would not search — and, brought before the '
      + 'Roman commander, asked for nothing but a town of the coastal plain and its scholars. '
      + '"Give me Yavneh and its sages." No throne, no walls, no ransom for the House. In a '
      + 'vineyard at Yavneh the survivors of the schools now sit in rows as they once sat in '
      + 'the Temple courts, and rule on festivals and damages and marriages as though the '
      + 'altar still smoked. The Law, it appears, can live without the House. Whether the '
      + 'nation can is the question the next generation must answer.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_yavneh_academy', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'templeBurned') && alive(ctx, 'JUD')),
    aiOption: 0,
    options: [
      {
        label: 'Give me Yavneh and its sages',
        tooltip: 'The quietism of the schools: Judaea +25 governance points, +1 stability, +5 legitimacy — but "The Sages Counsel Patience" (−10% morale, 60 months). The academy is founded.',
        effects: guard('ev_yavneh_academy:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 25, stability: 1, legitimacy: 5 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'sages_quietism', name: 'The Sages Counsel Patience', months: 60,
            effects: { moraleMult: 0.9 },
          });
          h.setFlag(ctx, 'yavnehFounded', true);
        }),
      },
      {
        label: 'Keep faith with the ruins',
        tooltip: 'The academy gathers regardless — but the mourners set the tone: Judaea +10 governance points, +5 legitimacy, "Faith with the Ruins" (+5% morale, 60 months) — and −1 stability; grief is not a constitution.',
        effects: guard('ev_yavneh_academy:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 10, legitimacy: 5, stability: -1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'faith_with_ruins', name: 'Faith with the Ruins', months: 60,
            effects: { moraleMult: 1.05 },
          });
          h.setFlag(ctx, 'yavnehFounded', true);
        }),
      },
    ],
  },

  // ── 23 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_flavian_triumph',
    title: 'The Triumph of the Flavians',
    desc: 'Rome has not seen its like in a generation: father and son in one chariot\'s '
      + 'train, the streets in white, and the spoils of the House of God carried shoulder-high '
      + 'up the Sacred Way — the seven-branched lampstand of gold, the table of the '
      + 'showbread, the scroll of the Law borne last of all. At the climax, by the old '
      + 'custom, the enemy general is taken from the procession to the Mamertine and the '
      + 'crowd waits in silence until the cry comes up that Simon bar Giora is dead. Then '
      + 'the sacrifices, and the feasting. A relief of the lampstand will stand in carved '
      + 'stone over the Sacred Way when everyone in this crowd is dust.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    trigger: safeTrigger('ev_flavian_triumph', (ctx) => {
      const h = ctx.helpers;
      return dateGE(ctx, 71, 6) && alive(ctx, 'ROM')
        && !!h.getFlag(ctx, 'templeBurned')
        && !!h.getFlag(ctx, 'vespasianEmperor')
        && h.controls(ctx, 'ROM', 'Jerusalem');
    }),
    aiOption: 0,
    options: [
      {
        label: 'Up the Sacred Way',
        tooltip: 'Simon bar Giora dies at the Mamertine; John of Gischala goes to a prison he will never leave. Rome: +15 legitimacy, +20 treasury. Judaea: −10 legitimacy.',
        effects: guard('ev_flavian_triumph:0', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'JUD', 'Simon bar Giora');
          h.killGeneral(ctx, 'JUD', 'John of Gischala');
          h.adjust(ctx, 'ROM', { legitimacy: 15, treasury: 20 });
          h.adjust(ctx, 'JUD', { legitimacy: -10 });
          h.setFlag(ctx, 'flavianTriumph', true);
        }),
      },
      {
        label: 'Spare the spectacle nothing',
        tooltip: 'Simon dies; John disappears into the dark. Rome: −40 treasury on largesse and games, but +25 legitimacy and +1 stability — the new dynasty buys its legend outright. Judaea: −10 legitimacy.',
        effects: guard('ev_flavian_triumph:1', (ctx) => {
          const h = ctx.helpers;
          h.killGeneral(ctx, 'JUD', 'Simon bar Giora');
          h.killGeneral(ctx, 'JUD', 'John of Gischala');
          h.adjust(ctx, 'ROM', { treasury: -40, legitimacy: 25, stability: 1 });
          h.adjust(ctx, 'JUD', { legitimacy: -10 });
          h.setFlag(ctx, 'flavianTriumph', true);
        }),
      },
    ],
  },

  // ── 24 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_judaea_capta',
    title: 'IVDAEA CAPTA',
    desc: 'The mint speaks the empire\'s plainest language. In bronze, in silver, in gold, '
      + 'the same image passes now through every market from Gades to the Euphrates: a '
      + 'woman seated weeping beneath a palm tree, a soldier standing over her with his '
      + 'spear grounded, and the legend around the rim — Judaea Captured. A farmer in '
      + 'Galilee selling his oil will take the coin, because there is no other coin, and '
      + 'carry the picture of his own defeat home in his purse. That is the point of it.',
    forTag: 'both',
    decider: 'JUD',
    trigger: safeTrigger('ev_judaea_capta', (ctx) =>
      dateGE(ctx, 71, 8) && !!ctx.helpers.getFlag(ctx, 'flavianTriumph')),
    aiOption: 0,
    options: [
      {
        label: 'The coin passes from hand to hand',
        tooltip: 'Every Jewish province: "The Weeping Woman" (+1 unrest, 36 months). Rome +5 legitimacy; Judaea −5 legitimacy.',
        effects: guard('ev_judaea_capta:0', (ctx) => {
          const h = ctx.helpers;
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (p && p.religion === 'judaism') {
              h.addProvinceModifier(ctx, p.name, {
                id: 'judaea_capta_coin', name: 'The Weeping Woman', months: 36,
                effects: { unrest: 1 },
              });
            }
          }
          h.adjust(ctx, 'ROM', { legitimacy: 5 });
          h.adjust(ctx, 'JUD', { legitimacy: -5 });
        }),
      },
      {
        label: 'Let the coin teach what Rome forgets',
        tooltip: 'The same coin, read the other way: every Jewish province +1 unrest for 36 months and Judaea −10 legitimacy — but "A Long Memory" (+5% manpower, permanent). The woman under the palm has sons.',
        effects: guard('ev_judaea_capta:1', (ctx) => {
          const h = ctx.helpers;
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (p && p.religion === 'judaism') {
              h.addProvinceModifier(ctx, p.name, {
                id: 'judaea_capta_coin', name: 'The Weeping Woman', months: 36,
                effects: { unrest: 1 },
              });
            }
          }
          h.adjust(ctx, 'ROM', { legitimacy: 5 });
          h.adjust(ctx, 'JUD', { legitimacy: -10 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'long_memory', name: 'A Long Memory', months: -1,
            effects: { manpowerMult: 1.05 },
          });
        }),
      },
    ],
  },

  // ── 25 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_fiscus_judaicus',
    title: 'The Half-Shekel for Jupiter',
    desc: 'For as long as anyone living can remember, every Jew in the world sent a '
      + 'half-shekel a year to the House in Jerusalem. Vespasian, who wastes nothing, has '
      + 'not abolished the tax — he has redirected it. Two denarii from every Jew, man, '
      + 'woman and child, everywhere in the empire, paid now into a new bureau, the fiscus '
      + 'Judaicus, for the rebuilding of Jupiter Best and Greatest on the Capitol, which '
      + 'burned in Rome\'s own civil war. The money that built the sanctuary will build the '
      + 'idol. Of all the instruments of the defeat, the accountants\' is the one that '
      + 'reaches every single household.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    trigger: safeTrigger('ev_fiscus_judaicus', (ctx) => {
      const h = ctx.helpers;
      return dateGE(ctx, 71, 9) && alive(ctx, 'ROM')
        && !!h.getFlag(ctx, 'templeBurned')
        && h.controls(ctx, 'ROM', 'Jerusalem');
    }),
    aiOption: 0,
    options: [
      {
        label: 'Two denarii, from every Jew, everywhere',
        tooltip: 'Every Jewish province: "Fiscus Judaicus" (−10% tax, +1 unrest, permanent — until some emperor relents). Rome: "Receipts of the Fiscus" (+3% income, permanent).',
        effects: guard('ev_fiscus_judaicus:0', (ctx) => {
          const h = ctx.helpers;
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (p && p.religion === 'judaism') {
              h.addProvinceModifier(ctx, p.name, {
                id: 'fiscus_judaicus', name: 'Fiscus Judaicus', months: -1,
                effects: { taxMult: 0.9, unrest: 1 },
              });
            }
          }
          h.addTagModifier(ctx, 'ROM', {
            id: 'fiscus_receipts', name: 'Receipts of the Fiscus', months: -1,
            effects: { incomeMult: 1.03 },
          });
          h.setFlag(ctx, 'fiscusJudaicus', true);
        }),
      },
      {
        label: 'Farm the collection to the publicani',
        tooltip: 'Every Jewish province: "Fiscus Judaicus" (−10% tax, +2 unrest, permanent — the tax farmers collect twice). Rome: +50 treasury up front and "Receipts of the Fiscus" (+3% income, permanent), −5 legitimacy for the methods.',
        effects: guard('ev_fiscus_judaicus:1', (ctx) => {
          const h = ctx.helpers;
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (p && p.religion === 'judaism') {
              h.addProvinceModifier(ctx, p.name, {
                id: 'fiscus_judaicus', name: 'Fiscus Judaicus', months: -1,
                effects: { taxMult: 0.9, unrest: 2 },
              });
            }
          }
          h.addTagModifier(ctx, 'ROM', {
            id: 'fiscus_receipts', name: 'Receipts of the Fiscus', months: -1,
            effects: { incomeMult: 1.03 },
          });
          h.adjust(ctx, 'ROM', { treasury: 50, legitimacy: -5 });
          h.setFlag(ctx, 'fiscusJudaicus', true);
        }),
      },
    ],
  },

  // ── 26 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_imperial_estate',
    title: 'The Emperor\'s Land',
    desc: 'A survey commission moves through the hill country with chains and registers. By '
      + 'imperial rescript the soil of Judaea is declared the emperor\'s private property — '
      + 'not the Senate\'s, not the army\'s, Vespasian\'s — and the men who have farmed these '
      + 'terraces since the Return now lease their fathers\' fields back from Caesar\'s '
      + 'procurator, season by season. Only at Emmaus does anything new take root: eight '
      + 'hundred discharged veterans, settled on confiscated ground, their pensions paid '
      + 'in other men\'s vineyards.',
    forTag: 'both',
    decider: 'ROM',
    trigger: safeTrigger('ev_imperial_estate', (ctx) => {
      const h = ctx.helpers;
      return dateGE(ctx, 72, 3) && alive(ctx, 'ROM')
        && !!h.getFlag(ctx, 'templeBurned')
        && h.controls(ctx, 'ROM', 'Jerusalem');
    }),
    aiOption: 0,
    options: [
      {
        label: 'Lease the fields to their farmers',
        tooltip: 'The Judaean hill provinces: "Imperial Leases" (−15% tax to the province, +1 unrest, 60 months). Rome +40 treasury from the first rents.',
        effects: guard('ev_imperial_estate:0', (ctx) => {
          const h = ctx.helpers;
          for (const name of JUDEA_HILL_PROVINCES) {
            h.addProvinceModifier(ctx, name, {
              id: 'imperial_leases', name: 'Imperial Leases', months: 60,
              effects: { taxMult: 0.85, unrest: 1 },
            });
          }
          h.adjust(ctx, 'ROM', { treasury: 40 });
        }),
      },
      {
        label: 'Plant the veterans at Emmaus',
        tooltip: 'The hill provinces: "Imperial Leases" (−10% tax, +1 unrest, 60 months); Rome −20 treasury settling the colony — but Emmaus gains "Veteran Colony" (−2 unrest, permanent): eight hundred discharged spears keep their own peace.',
        effects: guard('ev_imperial_estate:1', (ctx) => {
          const h = ctx.helpers;
          for (const name of JUDEA_HILL_PROVINCES) {
            h.addProvinceModifier(ctx, name, {
              id: 'imperial_leases', name: 'Imperial Leases', months: 60,
              effects: { taxMult: 0.9, unrest: 1 },
            });
          }
          h.adjust(ctx, 'ROM', { treasury: -20 });
          h.addProvinceModifier(ctx, 'Emmaus', {
            id: 'veteran_colony', name: 'Veteran Colony', months: -1,
            effects: { unrest: -2 },
          });
        }),
      },
    ],
  },

  // ── 27 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_machaerus_taken',
    title: 'Machaerus Comes Down',
    desc: 'The fortress east of the Dead Sea — where the Baptist died in Herod\'s day — '
      + 'has surrendered its lower town and its garrison after the Romans took a young '
      + 'defender alive and raised a cross in sight of the walls. Lucilius Bassus grants '
      + 'the fighters their lives for the fortress, then hunts the refugees who fled to '
      + 'the Jordan thickets until the river, Josephus says, could be crossed on the dead. '
      + 'One rock now remains.',
    forTag: 'both',
    decider: 'ROM',
    trigger: safeTrigger('ev_machaerus_taken', (ctx) => {
      const h = ctx.helpers;
      return dateGE(ctx, 72, 1) && !!h.getFlag(ctx, 'templeBurned')
        && h.controls(ctx, 'ROM', 'Machaerus');
    }),
    aiOption: 0,
    options: [
      {
        label: 'Honor the terms given',
        tooltip: 'The garrison walks free. Rome: +15 military points, +5 legitimacy — a governor whose word is worth a fortress.',
        effects: guard('ev_machaerus_taken:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { mar: 15, legitimacy: 5 });
        }),
      },
      {
        label: 'Slight the walls and sell the town',
        tooltip: 'Rome: +15 military points, +25 treasury from the auctions — but −5 legitimacy, and Machaerus is "A Broken District" (−30% tax, 24 months).',
        effects: guard('ev_machaerus_taken:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { mar: 15, treasury: 25, legitimacy: -5 });
          h.addProvinceModifier(ctx, 'Machaerus', {
            id: 'broken_district', name: 'A Broken District', months: 24,
            effects: { taxMult: 0.7 },
          });
        }),
      },
    ],
  },

  // ── 28 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_masada_falls',
    title: 'The Nine Hundred and Sixty',
    desc: 'Flavius Silva built his wall around the rock, and then his ramp up the western '
      + 'spur, earth and timber rising for months by the labor of thousands until the ram '
      + 'could touch the casemate wall. The defenders sheathed their inner wall in earth '
      + 'and beams; the Romans fired it; the wind, which turned once against the besiegers, '
      + 'turned back. That night Eleazar ben Yair spoke twice to his people — the second '
      + 'time none argued. When the legionaries came over the burned wall at dawn they '
      + 'found nine hundred and sixty dead by their own hands, the storehouses left full '
      + 'to show it was not hunger, and silence. Two women and five children, hidden in '
      + 'the cisterns, lived to say how it was done.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    trigger: safeTrigger('ev_masada_falls', (ctx) => {
      const h = ctx.helpers;
      return dateGE(ctx, 72, 9) && !!h.getFlag(ctx, 'templeBurned')
        && h.controls(ctx, 'ROM', 'Masada');
    }),
    aiOption: 0,
    options: [
      {
        label: 'The war is over',
        tooltip: 'The last fortress is silent. Rome: +10 legitimacy, +1 stability — the East is quiet at last. Judaea: "The Memory of Masada" (+5% morale, permanent).',
        effects: guard('ev_masada_falls:0', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'JUD', 'last_fortress');
          h.adjust(ctx, 'ROM', { legitimacy: 10, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'memory_of_masada', name: 'The Memory of Masada', months: -1,
            effects: { moraleMult: 1.05 },
          });
          h.setFlag(ctx, 'masadaFallen', true);
          h.notify(ctx, {
            title: 'Masada Has Fallen', type: 'bad', provName: 'Masada',
            text: 'Nine hundred and sixty dead by their own hands. The storehouses were full.',
          });
        }),
      },
      {
        label: 'Let the two women tell it everywhere',
        tooltip: 'The story travels faster than any legion. Rome: +5 legitimacy — a victory it is awkward to celebrate. Judaea: +10 legitimacy and "The Memory of Masada" (+5% morale, permanent).',
        effects: guard('ev_masada_falls:1', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'JUD', 'last_fortress');
          h.adjust(ctx, 'ROM', { legitimacy: 5 });
          h.adjust(ctx, 'JUD', { legitimacy: 10 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'memory_of_masada', name: 'The Memory of Masada', months: -1,
            effects: { moraleMult: 1.05 },
          });
          h.setFlag(ctx, 'masadaFallen', true);
          h.notify(ctx, {
            title: 'Masada Has Fallen', type: 'bad', provName: 'Masada',
            text: 'Two women and five children climbed out of the cisterns to tell it.',
          });
        }),
      },
    ],
  },

  // ── 29 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_leontopolis_closed',
    title: 'The Last Altar',
    desc: 'Sicarii who slipped the fall of Judaea have surfaced in Alexandria and Cyrene, '
      + 'preaching no lord but God to communities that buried their dead in the riots of '
      + '66 and want no second lesson; in Cyrenaica one Jonathan, a weaver, leads the poor '
      + 'into the desert promising signs, and the governor\'s cavalry brings them back in '
      + 'chains or not at all. Vespasian, taking no chances with sanctuaries, orders closed '
      + 'the temple of Onias at Leontopolis — the little rival House that priests fleeing '
      + 'Antiochus built in Egypt two centuries ago. Its lamps are put out by an inventory '
      + 'clerk. Nowhere in the world does a Jewish altar now burn.',
    forTag: 'both',
    decider: 'ROM',
    trigger: safeTrigger('ev_leontopolis_closed', (ctx) => {
      const h = ctx.helpers;
      return dateGE(ctx, 73, 6) && alive(ctx, 'ROM')
        && !!h.getFlag(ctx, 'templeBurned')
        && h.controls(ctx, 'ROM', 'Alexandria');
    }),
    aiOption: 0,
    options: [
      {
        label: 'Close it, seal it, inventory the gold',
        tooltip: 'Rome +20 treasury. Alexandria: "The Hunt for the Sicarii" (+2 unrest, 24 months). Judaea −5 legitimacy: the last altar anywhere is extinguished.',
        effects: guard('ev_leontopolis_closed:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { treasury: 20 });
          h.addProvinceModifier(ctx, 'Alexandria', {
            id: 'sicarii_hunted', name: 'The Hunt for the Sicarii', months: 24,
            effects: { unrest: 2 },
          });
          h.adjust(ctx, 'JUD', { legitimacy: -5 });
        }),
      },
      {
        label: 'The elders of Alexandria give up the fugitives',
        tooltip: 'The community polices itself to save itself: Alexandria +1 unrest for only 12 months, Rome +5 legitimacy — but Judaea −10 legitimacy; handing over the last fighters is not forgotten either.',
        effects: guard('ev_leontopolis_closed:1', (ctx) => {
          const h = ctx.helpers;
          h.addProvinceModifier(ctx, 'Alexandria', {
            id: 'sicarii_hunted', name: 'The Hunt for the Sicarii', months: 12,
            effects: { unrest: 1 },
          });
          h.adjust(ctx, 'ROM', { legitimacy: 5 });
          h.adjust(ctx, 'JUD', { legitimacy: -10 });
        }),
      },
    ],
  },

  // ── 30 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_temple_of_peace',
    title: 'The Temple of Peace',
    desc: 'Vespasian dedicates his Templum Pacis beside the Forum: gardens, a library, the '
      + 'masterworks of Greece that Nero had hoarded in his Golden House given back to '
      + 'public view — and, arranged among them like any other trophy, the golden lampstand '
      + 'and the table of the showbread from Jerusalem. The vessels of the Holy of Holies '
      + 'stand on display between statues, furniture now of Rome\'s victory. Jews of the '
      + 'city walk past the precinct without turning their heads, which is its own kind '
      + 'of looking.',
    forTag: 'both',
    decider: 'ROM',
    trigger: safeTrigger('ev_temple_of_peace', (ctx) =>
      dateGE(ctx, 75, 1) && alive(ctx, 'ROM') && !!ctx.helpers.getFlag(ctx, 'flavianTriumph')),
    aiOption: 0,
    options: [
      {
        label: 'Peace, and the proceeds of peace',
        tooltip: 'Rome: −30 treasury on the dedication, +10 legitimacy, and "Pax Flavia" (+3% income, 36 months) — peace is good for trade.',
        effects: guard('ev_temple_of_peace:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { treasury: -30, legitimacy: 10 });
          h.addTagModifier(ctx, 'ROM', {
            id: 'pax_flavia', name: 'Pax Flavia', months: 36,
            effects: { incomeMult: 1.03 },
          });
        }),
      },
      {
        label: 'Set the lampstand where all Rome must pass it',
        tooltip: 'Rome +15 legitimacy: the dynasty\'s founding story in gold. Judaea −5 legitimacy — and every pilgrim to Rome carries home the same wound.',
        effects: guard('ev_temple_of_peace:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { legitimacy: 15 });
          h.adjust(ctx, 'JUD', { legitimacy: -5 });
        }),
      },
    ],
  },

  // ── 31 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_josephus_history',
    title: 'The Historian in the Flavians\' House',
    desc: 'In Rome, in the emperor\'s own former house, with a pension, citizenship, and the '
      + 'family name Flavius, the man who commanded Galilee for the revolt writes the history '
      + 'of the war he fought on both sides of. He works from the legions\' field notebooks '
      + 'and his own unforgiving memory; Titus himself signs the finished volumes for '
      + 'publication. In Judaea they do not speak his name. In his preface he swears he will '
      + 'neither flatter Rome nor spare his own people, and the strange thing — the thing '
      + 'that will keep the book alive for twenty centuries — is how close he comes.',
    forTag: 'both',
    decider: 'JUD',
    trigger: safeTrigger('ev_josephus_history', (ctx) => {
      const h = ctx.helpers;
      return dateGE(ctx, 77, 1) && alive(ctx, 'ROM')
        && !!h.getFlag(ctx, 'josephusSpared') && !!h.getFlag(ctx, 'vespasianEmperor');
    }),
    aiOption: 0,
    options: [
      {
        label: 'Titus signs the volumes for publication',
        tooltip: 'The war becomes the record Rome keeps. Rome: +15 influence points, +5 legitimacy. Judaea: −5 legitimacy — the traitor\'s book is the only book.',
        effects: guard('ev_josephus_history:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { infl: 15, legitimacy: 5 });
          h.adjust(ctx, 'JUD', { legitimacy: -5 });
        }),
      },
      {
        label: 'Yavneh keeps its own memory',
        tooltip: 'The sages answer a book with a curriculum. Rome +5 influence points; Judaea +15 governance points — what the academy remembers, no library in Rome can edit.',
        effects: guard('ev_josephus_history:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { infl: 5 });
          h.adjust(ctx, 'JUD', { gov: 15 });
        }),
      },
    ],
  },

  // ── 32 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_berenice_in_rome',
    title: 'The Queen on the Palatine',
    desc: 'Berenice has come to Rome — sister of Agrippa, great-granddaughter of Herod, the '
      + 'queen who once stood barefoot before Florus\' tribunal begging him to stop the '
      + 'killing — and she lives on the Palatine, openly, as Titus\' consort in all but law. '
      + 'The heir of the empire and a Judaean queen: Rome has swallowed strange things, but '
      + 'the pamphleteers have found their theme, and the old men remember Cleopatra. '
      + 'Everyone in the city knows how this must end except, perhaps, the two people '
      + 'concerned.',
    forTag: 'both',
    decider: 'ROM',
    trigger: safeTrigger('ev_berenice_in_rome', (ctx) =>
      dateGE(ctx, 75, 3) && alive(ctx, 'AGR') && alive(ctx, 'ROM')
        && !!ctx.helpers.getFlag(ctx, 'vespasianEmperor')),
    aiOption: 0,
    options: [
      {
        label: 'Invitus invitam — he sends her away',
        tooltip: 'Against his will, against hers. Rome +10 legitimacy — the city forgives what it is not asked to accept. Agrippa\'s house −5 legitimacy.',
        effects: guard('ev_berenice_in_rome:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { legitimacy: 10 });
          h.adjust(ctx, 'AGR', { legitimacy: -5 });
        }),
      },
      {
        label: 'Let her keep her court a season longer',
        tooltip: 'Rome −10 legitimacy — the pamphlets write themselves. Agrippa\'s house +10 legitimacy, and his kingdom leans closer to Rome (+opinion).',
        effects: guard('ev_berenice_in_rome:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { legitimacy: -10 });
          h.adjust(ctx, 'AGR', { legitimacy: 10 });
          setOpinion(ctx, 'AGR', 'ROM', 180);
        }),
      },
    ],
  },

  // ── 33 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_vespasian_dies',
    title: 'An Emperor Should Die Standing',
    desc: 'Ten years the mule-breeder\'s son has held the world together — solvent, '
      + 'unassassinated, faintly amused by the whole business. Now, at his summer villa in '
      + 'the Sabine country, the flux has him, and he knows the arithmetic of his own body '
      + 'as well as he ever knew a tax roll. He jokes on his deathbed — "Dear me, I think '
      + 'I am becoming a god" — and at the end demands to be helped to his feet, because '
      + 'an emperor should die standing. Titus succeeds without a sword drawn: the first '
      + 'son to follow his father in the principate\'s history.',
    forTag: 'both',
    date: { y: 79, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Titus, without a sword drawn',
        tooltip: 'Titus (3/3/5) is emperor; Domitian (3/1/2) is heir. Rome: +10 legitimacy — the smoothest succession in a century.',
        effects: guard('ev_vespasian_dies:0', (ctx) => {
          const h = ctx.helpers;
          h.setRuler(ctx, 'ROM', { name: 'Titus', title: 'Emperor', gov: 3, infl: 3, mar: 5, age: 39 });
          h.setHeir(ctx, 'ROM', { name: 'Domitian', gov: 3, infl: 1, mar: 2, age: 27 });
          h.adjust(ctx, 'ROM', { legitimacy: 10 });
          h.setFlag(ctx, 'titusEmperor', true);
        }),
      },
      {
        label: 'Deify the old man properly',
        tooltip: 'Titus (3/3/5) is emperor; Domitian (3/1/2) is heir. Rome: −25 treasury on the temple of Divus Vespasianus, +15 legitimacy — the dynasty acquires a god of its own.',
        effects: guard('ev_vespasian_dies:1', (ctx) => {
          const h = ctx.helpers;
          h.setRuler(ctx, 'ROM', { name: 'Titus', title: 'Emperor', gov: 3, infl: 3, mar: 5, age: 39 });
          h.setHeir(ctx, 'ROM', { name: 'Domitian', gov: 3, infl: 1, mar: 2, age: 27 });
          h.adjust(ctx, 'ROM', { treasury: -25, legitimacy: 15 });
          h.setFlag(ctx, 'titusEmperor', true);
        }),
      },
    ],
  },

  // ── 34 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_vesuvius',
    title: 'The Mountain Over the Bay',
    desc: 'Two months into the new reign, the mountain over the Bay of Naples splits open. '
      + 'A column of ash stands miles into the sky like a pine tree, day becomes night as '
      + 'far as Misenum, and when it is over Pompeii and Herculaneum are simply gone — '
      + 'sealed under the fall with their bread in the ovens. The admiral of the fleet dies '
      + 'taking ships in to the rescue. And in the towns of Judaea and among the Jews of '
      + 'Puteoli, men note the arithmetic aloud in the market: nine years, almost to the '
      + 'season, since the House burned — and the general who burned it wears the purple '
      + 'two months before the fire finds his own cities. It is what people said. The '
      + 'mountain, for its part, said nothing.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_vesuvius', (ctx) =>
      dateGE(ctx, 79, 8) && alive(ctx, 'ROM') && !!ctx.helpers.getFlag(ctx, 'templeBurned')),
    aiOption: 0,
    options: [
      {
        label: 'The emperor empties his purse for the survivors',
        tooltip: 'Rome: −40 treasury on relief, −1 stability — but +10 legitimacy; Titus gives like a man paying a debt.',
        effects: guard('ev_vesuvius:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { treasury: -40, stability: -1, legitimacy: 10 });
        }),
      },
      {
        label: 'What was said in the markets',
        tooltip: 'Rome: −20 treasury, −1 stability, −5 legitimacy — the whisper of judgment sticks. Every Jewish province: "A Bitter Comfort" (−1 unrest, 12 months). Judaea +5 legitimacy.',
        effects: guard('ev_vesuvius:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { treasury: -20, stability: -1, legitimacy: -5 });
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (p && p.religion === 'judaism') {
              h.addProvinceModifier(ctx, p.name, {
                id: 'bitter_comfort', name: 'A Bitter Comfort', months: 12,
                effects: { unrest: -1 },
              });
            }
          }
          h.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 35 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_colosseum_opens',
    title: 'Ex Manubiis',
    desc: 'Where Nero\'s private lake glittered, the Flavians have raised the largest '
      + 'building in the world: an amphitheater for fifty thousand, and over its entrance '
      + 'a dedication whose shorthand every mason can expand — built ex manubiis, from the '
      + 'spoils of war. There was only one war with spoils on that scale. Judaean gold '
      + 'paid for the stone, and Judaean captives, by the thousand, carried it. Titus opens '
      + 'it with a hundred days of games; the crowd that watches has already half-forgotten '
      + 'where the money came from, which is what monuments are for.',
    forTag: 'both',
    decider: 'ROM',
    trigger: safeTrigger('ev_colosseum_opens', (ctx) =>
      dateGE(ctx, 80, 6) && alive(ctx, 'ROM') && !!ctx.helpers.getFlag(ctx, 'flavianTriumph')),
    aiOption: 0,
    options: [
      {
        label: 'A hundred days of games',
        tooltip: 'Rome: −50 treasury, +15 legitimacy, +1 stability — the city is fed, amused, and loyal.',
        effects: guard('ev_colosseum_opens:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { treasury: -50, legitimacy: 15, stability: 1 });
        }),
      },
      {
        label: 'Let the inscription say whose spoils',
        tooltip: 'Rome: +10 legitimacy at no cost — the stone does the boasting. Judaea: −5 legitimacy, and every Jewish province +1 unrest for 12 months; the captives\' kin can read.',
        effects: guard('ev_colosseum_opens:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { legitimacy: 10 });
          h.adjust(ctx, 'JUD', { legitimacy: -5 });
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (p && p.religion === 'judaism') {
              h.addProvinceModifier(ctx, p.name, {
                id: 'ex_manubiis', name: 'Ex Manubiis', months: 12,
                effects: { unrest: 1 },
              });
            }
          }
        }),
      },
    ],
  },

  // ── 36 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_titus_dies',
    title: 'One Mistake',
    desc: 'Two years and two months, and the reign everyone called a golden morning is over: '
      + 'fever takes Titus at the same Sabine villa where his father died. His last words '
      + 'run through the empire faster than the courier who carries them — "I have made but '
      + 'one mistake" — and no one who repeats them agrees on what it was. Rome guesses '
      + 'Berenice, or guesses Domitian left alive and unnamed. In the schools of Judaea '
      + 'they will tell it otherwise, and not kindly. His brother does not wait for the '
      + 'body to cool before riding to the praetorian camp.',
    forTag: 'both',
    date: { y: 81, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'Domitian rides to the camp',
        tooltip: 'Domitian (3/1/2) is emperor, and names no heir. Rome: −5 legitimacy — the succession is legal, and chilly.',
        effects: guard('ev_titus_dies:0', (ctx) => {
          const h = ctx.helpers;
          h.setRuler(ctx, 'ROM', { name: 'Domitian', title: 'Emperor', gov: 3, infl: 1, mar: 2, age: 29 });
          h.setHeir(ctx, 'ROM', null);
          h.adjust(ctx, 'ROM', { legitimacy: -5 });
          h.setFlag(ctx, 'domitianEmperor', true);
        }),
      },
      {
        label: 'Deify the brother, bury the question',
        tooltip: 'Domitian (3/1/2) is emperor; −20 treasury on Divus Titus and the arch with the lampstand carved on it. Rome +5 legitimacy — piety is cheaper than answers.',
        effects: guard('ev_titus_dies:1', (ctx) => {
          const h = ctx.helpers;
          h.setRuler(ctx, 'ROM', { name: 'Domitian', title: 'Emperor', gov: 3, infl: 1, mar: 2, age: 29 });
          h.setHeir(ctx, 'ROM', null);
          h.adjust(ctx, 'ROM', { treasury: -20, legitimacy: 5 });
          h.setFlag(ctx, 'domitianEmperor', true);
        }),
      },
    ],
  },

  // ── 37 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_fiscus_tightens',
    title: 'The Informers of the Fiscus',
    desc: 'Under Domitian the Jewish tax has grown teeth. The fiscus now pursues not only '
      + 'those who profess the faith but those who "live a Jewish life without professing '
      + 'it," and those who merely "conceal their origin" — categories elastic enough to '
      + 'fit any purse an informer covets. Suetonius will remember, from his own boyhood, '
      + 'a crowded courtroom where a procurator had a man of ninety examined before the '
      + 'assembly to see whether he was circumcised. Jewishness itself has become a '
      + 'taxable, deniable, dangerous condition — a thing the delatores can smell on '
      + 'a man\'s dinner or his idle Sabbaths.',
    forTag: 'both',
    decider: 'ROM',
    major: true,
    trigger: safeTrigger('ev_fiscus_tightens', (ctx) =>
      dateGE(ctx, 85, 1) && alive(ctx, 'ROM')
        && !!ctx.helpers.getFlag(ctx, 'fiscusJudaicus')
        && !!ctx.helpers.getFlag(ctx, 'domitianEmperor')),
    aiOption: 0,
    options: [
      {
        label: 'The informers eat well',
        tooltip: 'Rome: +40 treasury, −10 legitimacy. Every Jewish province: "The Delatores" (+2 unrest, −10% tax, 60 months) — fear is bad for markets.',
        effects: guard('ev_fiscus_tightens:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { treasury: 40, legitimacy: -10 });
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (p && p.religion === 'judaism') {
              h.addProvinceModifier(ctx, p.name, {
                id: 'delatores', name: 'The Delatores', months: 60,
                effects: { unrest: 2, taxMult: 0.9 },
              });
            }
          }
        }),
      },
      {
        label: 'The communities pay before they are asked',
        tooltip: 'The elders assess themselves and hand over the ledgers sealed. Judaea −40 treasury; Rome +20 treasury. Every Jewish province: "Quiet Ledgers" (+1 unrest, −10% tax, 60 months) — humiliation, at a discount.',
        effects: guard('ev_fiscus_tightens:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -40 });
          h.adjust(ctx, 'ROM', { treasury: 20 });
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (p && p.religion === 'judaism') {
              h.addProvinceModifier(ctx, p.name, {
                id: 'quiet_ledgers', name: 'Quiet Ledgers', months: 60,
                effects: { unrest: 1, taxMult: 0.9 },
              });
            }
          }
        }),
      },
    ],
  },

  // ── 38 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_gamaliel_yavneh',
    title: 'The Vineyard at Yavneh',
    desc: 'A generation on, the academy has become what the Temple\'s courts were: the place '
      + 'where the nation argues with itself and is governed by the argument. Under Gamaliel '
      + 'the Second — grandson of the Gamaliel at whose feet Paul once sat — the daily '
      + 'prayers are fixed at eighteen benedictions in an ordered rite any village can keep; '
      + 'a nineteenth, against the sectarians, fences the community that has no walls left; '
      + 'and the calendar goes out from Yavneh, so that Adar falls together from Rome to '
      + 'Babylon. Gamaliel rules it all with a high hand — the sages will depose him once '
      + 'for humiliating a colleague, and restore him when his rival refuses to profit by '
      + 'it. An institution that can discipline its own patriarch and survive is an '
      + 'institution. The House burned; the argument did not.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_gamaliel_yavneh', (ctx) =>
      dateGE(ctx, 90, 1) && alive(ctx, 'JUD') && !!ctx.helpers.getFlag(ctx, 'yavnehFounded')),
    aiOption: 0,
    options: [
      {
        label: 'Fix the order of the prayers',
        tooltip: 'One rite, one calendar, one people without a country. Judaea: +25 governance points, +1 stability, +5 legitimacy.',
        effects: guard('ev_gamaliel_yavneh:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 25, stability: 1, legitimacy: 5 });
        }),
      },
      {
        label: 'An authority that bends without breaking',
        tooltip: 'The deposition and the restoration both become precedent. Judaea: +15 governance points, +15 influence points, +10 legitimacy — the argument itself is the constitution.',
        effects: guard('ev_gamaliel_yavneh:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 15, infl: 15, legitimacy: 10 });
        }),
      },
    ],
  },

  // ── 39 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_flavius_clemens',
    title: 'The Emperor\'s Cousin',
    desc: 'The terror has reached the dynasty\'s own table. Flavius Clemens — Domitian\'s '
      + 'first cousin, consul this very year, whose two small sons the emperor had named '
      + 'his heirs — is executed on a charge the courts render as "atheism": the crime of '
      + 'those who drift into Jewish ways. His wife Domitilla, the emperor\'s own niece, is '
      + 'banished to the island of Pandateria. If a consul of the Flavian house can die for '
      + 'inclining toward the God of a razed province, no one in Rome is safe, and everyone '
      + 'in Rome now knows it. The senators check their dinner guests. The informers check '
      + 'the senators.',
    forTag: 'both',
    decider: 'JUD',
    major: true,
    trigger: safeTrigger('ev_flavius_clemens', (ctx) =>
      dateGE(ctx, 95, 1) && alive(ctx, 'ROM')
        && !!ctx.helpers.getFlag(ctx, 'fiscusJudaicus')
        && !!ctx.helpers.getFlag(ctx, 'domitianEmperor')),
    aiOption: 0,
    options: [
      {
        label: 'The charge is atheism',
        tooltip: 'Rome: −1 stability, −10 legitimacy — a reign that eats its own heirs is ending, though the emperor is the last to know. Every Jewish province +1 unrest for 12 months; no one is safe.',
        effects: guard('ev_flavius_clemens:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { stability: -1, legitimacy: -10 });
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (p && p.religion === 'judaism') {
              h.addProvinceModifier(ctx, p.name, {
                id: 'terror_reaches_all', name: 'No One Is Safe', months: 12,
                effects: { unrest: 1 },
              });
            }
          }
        }),
      },
      {
        label: 'The story travels to Yavneh',
        tooltip: 'Rome: −1 stability, −5 legitimacy. Judaea: +5 legitimacy — even Caesar\'s house, the sages note, inclines toward the Law; the tradition will remember Domitilla kindly.',
        effects: guard('ev_flavius_clemens:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'ROM', { stability: -1, legitimacy: -5 });
          h.adjust(ctx, 'JUD', { legitimacy: 5 });
        }),
      },
    ],
  },

  // ── 40 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_domitian_dies',
    title: 'The Last of the Flavians',
    desc: 'The conspiracy is domestic: a steward with a dagger in a bandaged arm, the '
      + 'empress\'s knowledge, the palace servants holding the doors. Domitian dies fighting '
      + 'on the floor of his bedroom, and the dynasty of the Judaean war dies with him — '
      + 'father, son, and brother, twenty-seven years from Galilee to this. The Senate, '
      + 'which feared him living, damns his memory before nightfall and hails Nerva: old, '
      + 'childless, moderate — a caretaker chosen precisely because he threatens no one. '
      + 'The informers of the fiscus go very quiet, very fast.',
    forTag: 'both',
    date: { y: 96, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    options: [
      {
        label: 'The Senate hails Nerva',
        tooltip: 'Nerva (3/4/1) is emperor, heirless — for now. Rome: −1 stability (the praetorians grumble), +5 legitimacy.',
        effects: guard('ev_domitian_dies:0', (ctx) => {
          const h = ctx.helpers;
          h.setRuler(ctx, 'ROM', { name: 'Nerva', title: 'Emperor', gov: 3, infl: 4, mar: 1, age: 65 });
          h.setHeir(ctx, 'ROM', null);
          h.adjust(ctx, 'ROM', { stability: -1, legitimacy: 5 });
          h.setFlag(ctx, 'nervaEmperor', true);
        }),
      },
      {
        label: 'Damnatio memoriae',
        tooltip: 'Nerva (3/4/1) is emperor. Rome: −20 treasury recarving every inscription in the empire, −1 stability — but +10 legitimacy; the new reign is founded on the erasure of the old.',
        effects: guard('ev_domitian_dies:1', (ctx) => {
          const h = ctx.helpers;
          h.setRuler(ctx, 'ROM', { name: 'Nerva', title: 'Emperor', gov: 3, infl: 4, mar: 1, age: 65 });
          h.setHeir(ctx, 'ROM', null);
          h.adjust(ctx, 'ROM', { treasury: -20, stability: -1, legitimacy: 10 });
          h.setFlag(ctx, 'nervaEmperor', true);
        }),
      },
    ],
  },

  // ── 41 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_calumnia_sublata',
    title: 'The Slander of the Jewish Tax Removed',
    desc: 'Among Nerva\'s first acts is a coin — and this time the mint speaks mercy. FISCI '
      + 'IUDAICI CALUMNIA SUBLATA, the bronze says: the slander of the Jewish tax is '
      + 'abolished. The tax itself remains — Rome forgives, it does not refund — but the '
      + 'informers\' trade is ended, the examinations cease, and no man need again prove '
      + 'before a courtroom what he is or is not. Thirty years since the sacrifices ceased. '
      + 'The generation that saw the House burn is going to its graves now, in Galilee and '
      + 'Babylon and Rome — and what they built in place of the House, the ordered prayers '
      + 'and the argued Law and the academy that survives everything, has held. It holds yet.',
    forTag: 'both',
    major: true,
    trigger: safeTrigger('ev_calumnia_sublata', (ctx) =>
      alive(ctx, 'ROM')
        && !!ctx.helpers.getFlag(ctx, 'nervaEmperor')
        && !!ctx.helpers.getFlag(ctx, 'fiscusJudaicus')),
    aiOption: 0,
    options: [
      {
        label: 'Strike the coin of mercy',
        tooltip: 'The informers\' reign ends: "The Delatores" and "Quiet Ledgers" lifted everywhere; every Jewish province −1 unrest for 24 months. Rome +10 legitimacy; Judaea +10 legitimacy, +1 stability.',
        effects: guard('ev_calumnia_sublata:0', (ctx) => {
          const h = ctx.helpers;
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (!p || p.religion !== 'judaism') continue;
            h.removeModifier(ctx, p.name, 'delatores');
            h.removeModifier(ctx, p.name, 'quiet_ledgers');
            h.addProvinceModifier(ctx, p.name, {
              id: 'calumnia_sublata', name: 'The Slander Removed', months: 24,
              effects: { unrest: -1 },
            });
          }
          h.adjust(ctx, 'ROM', { legitimacy: 10 });
          h.adjust(ctx, 'JUD', { legitimacy: 10, stability: 1 });
        }),
      },
      {
        label: 'What they built instead has held',
        tooltip: 'The examinations end ("Delatores" and "Quiet Ledgers" lifted; −1 unrest, 24 months, in every Jewish province) — and the generation\'s work is sealed: Judaea +20 governance points, +5 legitimacy; Rome +5 legitimacy.',
        effects: guard('ev_calumnia_sublata:1', (ctx) => {
          const h = ctx.helpers;
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (!p || p.religion !== 'judaism') continue;
            h.removeModifier(ctx, p.name, 'delatores');
            h.removeModifier(ctx, p.name, 'quiet_ledgers');
            h.addProvinceModifier(ctx, p.name, {
              id: 'calumnia_sublata', name: 'The Slander Removed', months: 24,
              effects: { unrest: -1 },
            });
          }
          h.adjust(ctx, 'ROM', { legitimacy: 5 });
          h.adjust(ctx, 'JUD', { gov: 20, legitimacy: 5 });
        }),
      },
    ],
  },

  // ═══ The Second Kingdom: the victory timeline, 70–96 CE ═══════════════════
  // The mirror of the aftermath strand above. Where those events presuppose
  // Rome's victory (templeBurned, ROM on the ground), these presuppose
  // Judaea's — the war ended (ev_rome_sues accepted, or however the peace
  // came) with Jerusalem in Judaean hands. The whole strand is gated through
  // judaeaFree(): JUD alive + JUD holding Jerusalem + no live JUD–ROM war;
  // in the defeat world those triggers never come true and this future never
  // happens. The imperial spine (Nero, the Four Emperors, Vespasian, Titus,
  // Domitian, Nerva) is world history and runs in both timelines.

  // ── 42 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_house_that_stood',
    title: 'The House That Stood',
    desc: 'The month of Av arrives, and the House stands. The pilgrim roads are full for '
      + 'the first time since Cestius — Galilee and Idumea afoot, the Delta quarter of '
      + 'Alexandria by sea, Nehardea from beyond the rivers — and the half-shekel flows '
      + 'to Jerusalem and nowhere else, as it has since Moses counted the camp. In the '
      + 'outer courts the priests walk the line of the scorched porticoes, the war\'s one '
      + 'scar on the sanctuary, and the elders remember a precedent: when the sons of '
      + 'Hasmon cleansed this House, they ordained eight days for it, forever. What the '
      + 'sword did not take, let the calendar keep.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_house_that_stood', (ctx) =>
      dateGE(ctx, 70, 6) && judaeaFree(ctx) && !ctx.helpers.getFlag(ctx, 'templeBurned')),
    aiOption: 0,
    options: [
      {
        label: 'Ordain a feast of the House That Stood',
        tooltip: 'A new festival in the calendar, as the Hasmoneans ordained the Dedication: +15 legitimacy, +1 stability, and Jerusalem gains "The Pilgrim Roads" (+25% tax, −1 unrest, permanent). The Second Kingdom begins.',
        effects: guard('ev_house_that_stood:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15, stability: 1 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'pilgrim_roads', name: 'The Pilgrim Roads', months: -1,
            effects: { taxMult: 1.25, unrest: -1 },
          });
          h.setFlag(ctx, 'secondKingdom', true);
        }),
      },
      {
        label: 'The arrears first, the feasting after',
        tooltip: 'The war years\' half-shekels come home in one caravan: +80 treasury, +5 legitimacy, and Jerusalem gains "The Pilgrim Roads" for 36 months (+25% tax, −1 unrest). The Second Kingdom begins.',
        effects: guard('ev_house_that_stood:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 80, legitimacy: 5 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'pilgrim_roads', name: 'The Pilgrim Roads', months: 36,
            effects: { taxMult: 1.25, unrest: -1 },
          });
          h.setFlag(ctx, 'secondKingdom', true);
        }),
      },
    ],
  },

  // ── 43 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_victors_quarrel',
    title: 'The Victors Quarrel',
    desc: 'Peace has done what Vespasian could not: set the victors at one another\'s '
      + 'throats. John\'s northerners hold the Temple mount like a camp; Simon\'s freed '
      + 'men swagger in the upper city; Eleazar\'s priests claim the war was theirs '
      + 'because the first refusal was; and the surviving elders of the Sanhedrin '
      + 'observe — correctly — that not one of these heroes can read a boundary deed. '
      + 'Every one of them beat Rome. None of them has yet been asked to collect a tax, '
      + 'judge an orchard dispute, or disband.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_victors_quarrel', (ctx) =>
      dateGE(ctx, 70, 10) && judaeaFree(ctx) && !!ctx.helpers.getFlag(ctx, 'secondKingdom')),
    aiOption: 0,
    options: [
      {
        label: 'Pension the bands off the streets',
        tooltip: '−80 treasury in land grants and back pay; +1 stability, and Jerusalem quiets ("Swords into Pruning Hooks", −2 unrest, 24 months). The captains grumble: −10 military points.',
        effects: guard('ev_victors_quarrel:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -80, stability: 1, mar: -10 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'swords_to_hooks', name: 'Swords into Pruning Hooks', months: 24,
            effects: { unrest: -2 },
          });
          h.setFlag(ctx, 'victorsQuarrel', true);
        }),
      },
      {
        label: 'Keep the war-bands in commission',
        tooltip: 'The kingdom keeps its edge: +25 military points and "The Bands Stand Ready" (+5% manpower, 36 months) — but the captains keep their quarrels too: −1 stability, and Jerusalem +2 unrest for 24 months.',
        effects: guard('ev_victors_quarrel:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { mar: 25, stability: -1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'bands_ready', name: 'The Bands Stand Ready', months: 36,
            effects: { manpowerMult: 1.05 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'captains_quarrel', name: 'The Captains\' Quarrels', months: 24,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'victorsQuarrel', true);
        }),
      },
    ],
  },

  // ── 44 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_crown_or_council',
    title: 'A Crown or a Council',
    desc: 'The war cry was "No King but God" — and now the state must have a shape, '
      + 'because the tribute, the courts and the frontier all wait on a signature. '
      + 'Simon bar Giora\'s name is shouted from the walls his freed men held; the sword '
      + 'argues that the sword saved the House. Against it stands the Chamber of Hewn '
      + 'Stone: seventy-one seats, the high priest presiding, a Sanhedrin that judged '
      + 'Israel before Rome came and means to judge it after. Whichever instrument is '
      + 'chosen, the other will remember being refused.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_crown_or_council', (ctx) =>
      dateGE(ctx, 71, 3) && judaeaFree(ctx) && !!ctx.helpers.getFlag(ctx, 'victorsQuarrel')),
    aiOption: 1,
    options: [
      {
        label: 'The sword made this state — crown it',
        tooltip: 'Simon bar Giora (2/2/4) is proclaimed king. +15 military points and "A King from the War" (+10% morale, 36 months) — but the pious remember the war cry: −10 legitimacy, and Jerusalem +2 unrest for 24 months.',
        effects: guard('ev_crown_or_council:0', (ctx) => {
          const h = ctx.helpers;
          h.setRuler(ctx, 'JUD', { name: 'Simon bar Giora', title: 'King', gov: 2, infl: 2, mar: 4, age: 36 });
          h.setHeir(ctx, 'JUD', null);
          h.adjust(ctx, 'JUD', { mar: 15, legitimacy: -10 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'king_from_war', name: 'A King from the War', months: 36,
            effects: { moraleMult: 1.1 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'crowned_sword', name: 'No King but God', months: 24,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'kingSimon', true);
        }),
      },
      {
        label: 'The Chamber of Hewn Stone',
        tooltip: 'No king but God: the restored Sanhedrin governs, the high priest presiding. +20 governance points, +10 legitimacy, +1 stability, and "The Sanhedrin Restored" (−0.5 unrest everywhere, permanent) — but the captains are passed over: −15 military points.',
        effects: guard('ev_crown_or_council:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { gov: 20, legitimacy: 10, stability: 1, mar: -15 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'sanhedrin_restored', name: 'The Sanhedrin Restored', months: -1,
            effects: { unrestAll: -0.5 },
          });
          h.setFlag(ctx, 'sanhedrinRule', true);
        }),
      },
    ],
  },

  // ── 45 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_redemption_coinage',
    title: 'To the Redemption of Zion',
    desc: 'The mint struck the war\'s years in silver — One, Two, Three of the Freedom of '
      + 'Zion — and in the fourth year, when everything hung in the balance, the legend '
      + 'changed of itself: no longer herut, freedom, but geulah — "To the Redemption of '
      + 'Zion." Now the engravers stand before the council with a new die and an old '
      + 'question: what does a free state write on its money once the redemption has '
      + 'arrived? The chalice and the pomegranates, they propose, as before; the palm '
      + 'tree upright; and the year counted, from now on, of the Redemption — for the '
      + 'schoolchildren who will one day ask when their world began.',
    forTag: 'JUD',
    trigger: safeTrigger('ev_redemption_coinage', (ctx) =>
      dateGE(ctx, 71, 7) && judaeaFree(ctx) && !!ctx.helpers.getFlag(ctx, 'secondKingdom')),
    aiOption: 0,
    options: [
      {
        label: 'Silver of full weight, and the new era',
        tooltip: '+10 legitimacy and "Redemption Coinage" (+5% income, permanent) — money men trust is a tax men pay.',
        effects: guard('ev_redemption_coinage:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 10 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'redemption_coinage', name: 'Redemption Coinage', months: -1,
            effects: { incomeMult: 1.05 },
          });
        }),
      },
      {
        label: 'Bronze for the villages first',
        tooltip: 'Small coin for small markets: +40 treasury, and every Jewish province −1 unrest for 12 months — the peace reaches the bread stalls.',
        effects: guard('ev_redemption_coinage:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 40 });
          const provinces = ctx.game.provinces || [];
          for (const p of provinces) {
            if (p && p.religion === 'judaism') {
              h.addProvinceModifier(ctx, p.name, {
                id: 'small_coin', name: 'Bronze in the Markets', months: 12,
                effects: { unrest: -1 },
              });
            }
          }
        }),
      },
    ],
  },

  // ── 46 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_diaspora_homecoming',
    title: 'The Diaspora Looks Home',
    desc: 'The ships come with the spring sailing: gold from the elders of Alexandria and '
      + 'Cyrene, subscribed in the synagogues for the rebuilding — and, on the same '
      + 'decks, the young men. Every hothead of the Delta quarter who dreamed the war '
      + 'from a distance now wants to finish it, and Cyrene sends a weaver named '
      + 'Jonathan who preaches signs in the desert to anyone who will march behind him. '
      + 'The elders\' letters are careful: take the gift, they ask, and take also our '
      + 'sons — before the governors take them first.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_diaspora_homecoming', (ctx) =>
      dateGE(ctx, 72, 2) && judaeaFree(ctx) && !!ctx.helpers.getFlag(ctx, 'secondKingdom')),
    aiOption: 1,
    options: [
      {
        label: 'Every son who wishes to return',
        tooltip: '+4,000 manpower and +40 treasury — but the zealots of the diaspora did not come home to farm: Jerusalem +2 unrest for 24 months, and Rome\'s opinion darkens.',
        effects: guard('ev_diaspora_homecoming:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { manpower: 4000, treasury: 40 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'returned_zealots', name: 'The Returned Zealots', months: 24,
            effects: { unrest: 2 },
          });
          setOpinion(ctx, 'ROM', 'JUD', -160);
        }),
      },
      {
        label: 'The gold, quietly; the hotheads held at Joppa',
        tooltip: '+100 treasury and +10 legitimacy — the kingdom takes the gift and vets the shiploads. The refused young men remember: −1,000 manpower of volunteers turned away.',
        effects: guard('ev_diaspora_homecoming:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { treasury: 100, legitimacy: 10, manpower: -1000 });
        }),
      },
    ],
  },

  // ── 47 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_flavian_grudge',
    title: 'The Cold War of the Flavians',
    desc: 'Vespasian wears a purple bought with a war that failed, and he is too good an '
      + 'accountant to pretend otherwise. There will be no legions this year — Rome\'s '
      + 'books will not carry them — so the empire fights the way empires fight when '
      + 'they cannot march: the ports of Syria close to Judaean hulls, Tyre\'s bankers '
      + 'discover scruples, the customs houses invent a tariff for every jar of Judaean '
      + 'oil, and in Caesarea\'s harbor agents of the fiscus count masts and write '
      + 'letters. The instruments signed at the peace are not torn up. They are merely '
      + 'starved.',
    forTag: 'both',
    decider: 'JUD',
    major: true,
    trigger: safeTrigger('ev_flavian_grudge', (ctx) =>
      dateGE(ctx, 72, 6) && judaeaFree(ctx) && alive(ctx, 'ROM')
        && !!ctx.helpers.getFlag(ctx, 'secondKingdom')),
    aiOption: 0,
    options: [
      {
        label: 'The caravans learn the Petra road',
        tooltip: 'Rome\'s embargo bites: "The Ports Close" (−10% income, 48 months). Judaea spends −40 treasury opening the incense road instead, and Nabataea warms to a paying neighbor.',
        effects: guard('ev_flavian_grudge:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', {
            id: 'ports_close', name: 'The Ports Close', months: 48,
            effects: { incomeMult: 0.9 },
          });
          h.adjust(ctx, 'JUD', { treasury: -40 });
          setOpinion(ctx, 'NAB', 'JUD', 40);
          setOpinion(ctx, 'JUD', 'NAB', 40);
          setOpinion(ctx, 'ROM', 'JUD', -150);
          h.setFlag(ctx, 'flavianGrudge', true);
        }),
      },
      {
        label: 'Answer the ledger with a ledger',
        tooltip: 'Judaea undercuts the tariff wall with silver: −60 treasury in discounts and harbor bounties, and the embargo only grazes ("The Ports Close", −5% income, 48 months). Rome\'s opinion darkens all the same.',
        effects: guard('ev_flavian_grudge:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -60 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'ports_close', name: 'The Ports Close', months: 48,
            effects: { incomeMult: 0.95 },
          });
          setOpinion(ctx, 'ROM', 'JUD', -150);
          h.setFlag(ctx, 'flavianGrudge', true);
        }),
      },
    ],
  },

  // ── 48 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_rebuilding_the_land',
    title: 'The War\'s Bill Is Presented',
    desc: 'The war\'s bill is presented slowly. The porticoes of the outer court still '
      + 'show their burned beams; Jotapata is a wall around rubble; Tarichaea\'s fishing '
      + 'fleet is what the Roman rafts left of it; and in the terraces of Galilee whole '
      + 'villages are one old man and a mule track. The treasury can heal the city that '
      + 'carried the war, or the province that bled for it — first. Both, says the '
      + 'council. First, says the mason, holding out his hand.',
    forTag: 'JUD',
    trigger: safeTrigger('ev_rebuilding_the_land', (ctx) =>
      dateGE(ctx, 73, 1) && judaeaFree(ctx) && !!ctx.helpers.getFlag(ctx, 'secondKingdom')),
    aiOption: 0,
    options: [
      {
        label: 'Galilee first',
        tooltip: '−80 treasury. Jotapata, Tarichaea, Gischala and Tiberias gain "The Land Rebuilt" (+15% tax, −1 unrest, 60 months) — the north bled first and is paid first.',
        effects: guard('ev_rebuilding_the_land:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -80 });
          for (const name of ['Jotapata', 'Tarichaea', 'Gischala', 'Tiberias']) {
            h.addProvinceModifier(ctx, name, {
              id: 'land_rebuilt', name: 'The Land Rebuilt', months: 60,
              effects: { taxMult: 1.15, unrest: -1 },
            });
          }
        }),
      },
      {
        label: 'The House first',
        tooltip: '−60 treasury. Jerusalem gains "The Porticoes Restored" (+10% tax, −1 unrest, permanent) and Judaea +10 legitimacy — but the north waits: Galilee\'s towns +1 unrest for 24 months.',
        effects: guard('ev_rebuilding_the_land:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -60, legitimacy: 10 });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'porticoes_restored', name: 'The Porticoes Restored', months: -1,
            effects: { taxMult: 1.1, unrest: -1 },
          });
          for (const name of ['Jotapata', 'Tarichaea', 'Gischala', 'Tiberias']) {
            h.addProvinceModifier(ctx, name, {
              id: 'north_waits', name: 'The North Waits', months: 24,
              effects: { unrest: 1 },
            });
          }
        }),
      },
    ],
  },

  // ── 49 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_parthia_offers',
    title: 'The Hand from Beyond the River',
    desc: 'An embassy out of the east, with the gifts a king sends kings: Vologases '
      + 'offers the Second Kingdom a compact — Parthia\'s guarantee against the legions, '
      + 'the Euphrates crossings open to Judaean trade, the communities of Nehardea and '
      + 'Adiabene free to give with both hands. The price is written nowhere in the '
      + 'letters and everywhere between their lines: Jerusalem in the King of Kings\' '
      + 'train means Rome\'s undying certainty that Judaea is Parthia\'s knife laid '
      + 'against Syria. Some doors, once walked through, close behind you.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_parthia_offers', (ctx) =>
      dateGE(ctx, 73, 8) && judaeaFree(ctx) && alive(ctx, 'PAR')
        && !!ctx.helpers.getFlag(ctx, 'secondKingdom')),
    aiOption: 1,
    options: [
      {
        label: 'Take the outstretched hand',
        tooltip: 'Alliance with Parthia: the King of Kings guarantees the kingdom (+40 treasury in gifts). Rome\'s opinion falls to open enmity — a second expedition becomes likelier, and Judaea will not face it alone.',
        effects: guard('ev_parthia_offers:0', (ctx) => {
          const h = ctx.helpers;
          const par = ctx.game.tags.PAR, jud = ctx.game.tags.JUD;
          if (par && Array.isArray(par.allies) && par.allies.indexOf('JUD') === -1) par.allies.push('JUD');
          if (jud && Array.isArray(jud.allies) && jud.allies.indexOf('PAR') === -1) jud.allies.push('PAR');
          h.adjust(ctx, 'JUD', { treasury: 40 });
          setOpinion(ctx, 'PAR', 'JUD', 150);
          setOpinion(ctx, 'JUD', 'PAR', 150);
          setOpinion(ctx, 'ROM', 'JUD', -200);
          h.setFlag(ctx, 'parthianPact', true);
        }),
      },
      {
        label: 'A courteous refusal, with gifts',
        tooltip: 'The kingdom stands on its own feet: +10 legitimacy, −20 treasury in return gifts. Rome notes the refusal and thaws a little; Parthia\'s warmth cools.',
        effects: guard('ev_parthia_offers:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 10, treasury: -20 });
          setOpinion(ctx, 'ROM', 'JUD', -100);
          setOpinion(ctx, 'PAR', 'JUD', 30);
        }),
      },
    ],
  },

  // ── 50 ────────────────────────────────────────────────────────────────────
  // Rome's decision, not Judaea's: fires on the AI's judgment. If the Syrian
  // command has been rebuilt (or Judaea sits in Parthia's train), the eagles
  // come again; otherwise the empire grudgingly renews the peace it can afford.
  {
    id: 'ev_second_expedition',
    title: 'The Question at the Emperor\'s Table',
    desc: 'The Syrian command has been rebuilt man by man and ledger by ledger — Marcus '
      + 'Ulpius Traianus, the governor, drills his legions at Antioch and reports them '
      + 'ready. In Rome the question is put plainly at the emperor\'s table: the East '
      + 'cannot be governed forever around a hole where Judaea was, so it must be '
      + 'either reconquered or re-recognized. Titus, who was cheated of his siege, has '
      + 'an opinion. The treasury, which was cheated of nothing and remembers '
      + 'everything, has another.',
    forTag: 'ROM',
    major: true,
    chance: 0.25,
    trigger: safeTrigger('ev_second_expedition', (ctx) =>
      dateGE(ctx, 75, 1) && judaeaFree(ctx) && alive(ctx, 'ROM')
        && !!ctx.helpers.getFlag(ctx, 'flavianGrudge')
        && !ctx.helpers.getFlag(ctx, 'secondPeace')),
    aiOption: (ctx) => {
      try {
        if (ctx.helpers.getFlag(ctx, 'parthianPact')) return 0;
        return totalMen(ctx, 'ROM') >= 30000 ? 0 : 1;
      } catch (e) { warnOnce('aiOption:ev_second_expedition', e); return 1; }
    },
    options: [
      {
        label: 'The lesson must be taught again',
        tooltip: 'Rome declares the Second Judaean War: Traianus (3/4/3) marches from Antioch with 21,000 men, and Rome gains +10,000 manpower for the effort.',
        effects: guard('ev_second_expedition:0', (ctx) => {
          const h = ctx.helpers;
          if (!alive(ctx, 'ROM') || !alive(ctx, 'JUD')) return;
          if (findJudRomWar(ctx.game)) return;
          h.declareWar(ctx, 'ROM', 'JUD', 'The Second Judaean War');
          h.spawnArmy(ctx, 'ROM', 'Antioch', {
            inf: 18, cav: 3, name: 'Army of Syria',
            general: { name: 'Marcus Ulpius Traianus', fire: 3, shock: 4, maneuver: 3 },
          });
          h.adjust(ctx, 'ROM', { manpower: 10000 });
          h.setFlag(ctx, 'secondExpedition', true);
          h.notify(ctx, {
            title: 'The Eagles Come East Again', type: 'war', provName: 'Antioch',
            text: 'Rome has not forgiven the peace. The Syrian legions march on Judaea a second time.',
          });
        }),
      },
      {
        label: 'Recognize what exists — at a price',
        tooltip: 'The instruments of the peace are renewed, grudgingly: the embargo lifts, and Judaea pays −100 treasury in tribute arrears (Rome +100). The cold war ends in a cold peace.',
        effects: guard('ev_second_expedition:1', (ctx) => {
          const h = ctx.helpers;
          h.removeModifier(ctx, 'JUD', 'ports_close');
          h.adjust(ctx, 'JUD', { treasury: -100 });
          h.adjust(ctx, 'ROM', { treasury: 100 });
          setOpinion(ctx, 'ROM', 'JUD', -80);
          h.setFlag(ctx, 'secondPeace', true);
          h.notify(ctx, {
            title: 'The Treaty Renewed', type: 'good', provName: 'Jerusalem',
            text: 'Rome re-recognizes the Second Kingdom — for tribute, and without warmth.',
          });
        }),
      },
    ],
  },

  // ── 51 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_eagles_go_home',
    title: 'Twice Is an Answer',
    // No requiresWar tag: the engine permanently cancels requiresWar events
    // once a JUD–ROM war is recorded settled (the FIRST peace would cancel
    // this one before the second war ever began). The trigger checks the
    // live war itself.
    desc: 'The second war has broken like the first, on the same hills and for the same '
      + 'reasons: walls the engineers must buy with months, a countryside that empties '
      + 'before the column and closes behind it, and a treasury in Rome that bleeds by '
      + 'the week. The emperor\'s men count what the Flavians have now spent on Judaea '
      + 'in two wars, and set it beside what Judaea has ever cost as a neighbor. The '
      + 'couriers go out. Twice, it turns out, is an answer.',
    forTag: 'both',
    decider: 'JUD',
    major: true,
    trigger: safeTrigger('ev_eagles_go_home', (ctx) =>
      !!ctx.helpers.getFlag(ctx, 'secondExpedition')
        && alive(ctx, 'JUD') && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')
        && !!findJudRomWar(ctx.game) && judWarscore(ctx) >= 20),
    aiOption: 0,
    options: [
      {
        label: 'Peace, the second time',
        tooltip: 'The Second Judaean War ends: occupied towns go home; Judaea keeps the provinces of the faith it holds. Judaea +20 legitimacy, +1 stability; Rome −10 legitimacy, +2 war exhaustion. The embargo dies with the war.',
        effects: guard('ev_eagles_go_home:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const w = findJudRomWar(g);
          const key = w && (w.attackers || []).indexOf('JUD') >= 0 ? 'att' : 'def';
          h.endWar(ctx, 'JUD', 'ROM', key, { keep: (p) => p.religion === 'judaism' });
          h.adjust(ctx, 'JUD', { legitimacy: 20, stability: 1 });
          h.adjust(ctx, 'ROM', { legitimacy: -10, warExhaustion: 2 });
          h.removeModifier(ctx, 'JUD', 'ports_close');
          h.setFlag(ctx, 'secondPeace', true);
        }),
      },
      {
        label: 'Peace, and an indemnity',
        tooltip: 'As above — and Rome pays 60 talents toward the peace (Judaea +60 treasury, Rome −60). But an indemnity is a humiliation with a receipt: Rome\'s opinion falls to the floor, and the grudge outlives the treaty.',
        effects: guard('ev_eagles_go_home:1', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const w = findJudRomWar(g);
          const key = w && (w.attackers || []).indexOf('JUD') >= 0 ? 'att' : 'def';
          h.endWar(ctx, 'JUD', 'ROM', key, { keep: (p) => p.religion === 'judaism' });
          h.adjust(ctx, 'JUD', { legitimacy: 20, stability: 1, treasury: 60 });
          h.adjust(ctx, 'ROM', { legitimacy: -10, warExhaustion: 2, treasury: -60 });
          h.removeModifier(ctx, 'JUD', 'ports_close');
          h.setFlag(ctx, 'secondPeace', true);
          setOpinion(ctx, 'ROM', 'JUD', -200);
        }),
      },
    ],
  },

  // ── 52 ────────────────────────────────────────────────────────────────────
  // Yavneh inverted: with the House standing, the academy must argue its way
  // past the altar instead of inheriting its ruins (compare ev_yavneh_academy).
  {
    id: 'ev_academy_and_altar',
    title: 'The Academy and the Altar',
    desc: 'Yohanan ben Zakkai never needed the coffin. The old man teaches in the shadow '
      + 'of the standing House, and still he comes before the council to ask for what — '
      + 'in some other, worse history — he would have begged from a Roman general: '
      + 'Yavneh and its sages. Academies with their own courts and their own purse; a '
      + 'Law that lives in argument, and not only in altar smoke. The priests hear him '
      + 'out coldly. The House stands, they say — why build the Law a second house? '
      + 'Because, says the old man, no house stands forever, and the Law must be able '
      + 'to live anywhere. Even here.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_academy_and_altar', (ctx) =>
      dateGE(ctx, 74, 6) && judaeaFree(ctx) && !!ctx.helpers.getFlag(ctx, 'secondKingdom')),
    aiOption: 0,
    options: [
      {
        label: 'Give him Yavneh and its sages',
        tooltip: '−30 treasury endows the academies. Judaea +20 governance points, +5 legitimacy, and "The Schools Beside the Altar" (−0.25 unrest everywhere, permanent). The priesthood mutters.',
        effects: guard('ev_academy_and_altar:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -30, gov: 20, legitimacy: 5 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'schools_beside_altar', name: 'The Schools Beside the Altar', months: -1,
            effects: { unrestAll: -0.25 },
          });
          h.setFlag(ctx, 'academiesChartered', true);
        }),
      },
      {
        label: 'The altar is the crown of the Law',
        tooltip: 'Priestly primacy confirmed: +10 legitimacy, +1 stability — but the schools scatter quietly toward Babylon: −15 governance points.',
        effects: guard('ev_academy_and_altar:1', (ctx) => {
          ctx.helpers.adjust(ctx, 'JUD', { legitimacy: 10, stability: 1, gov: -15 });
        }),
      },
    ],
  },

  // ── 53 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_domitian_demands',
    title: 'The Rescript of Domitian',
    desc: 'Domitian inherited his father\'s peace the way a man inherits a debt. He has '
      + 'no Judaean triumph — his father and brother at least had their war — and an '
      + 'emperor who fears the Senate\'s wit needs money, and postures. His envoys '
      + 'arrive in Jerusalem with a rescript: the tribute reassessed — doubled — and '
      + 'sons of the great houses invited to be "educated at Rome," which is the Latin '
      + 'for hostages. The council reads it twice. Somewhere behind the words stands an '
      + 'army; somewhere behind the army, a treasury that cannot pay for it. The '
      + 'question is which lies nearer the surface.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_domitian_demands', (ctx) =>
      dateGE(ctx, 86, 1) && judaeaFree(ctx) && alive(ctx, 'ROM')
        && !!ctx.helpers.getFlag(ctx, 'secondKingdom')
        && !!ctx.helpers.getFlag(ctx, 'domitianEmperor')),
    aiOption: 0,
    options: [
      {
        label: 'Pay, and outlive him',
        tooltip: '−80 treasury. The kingdom bends and endures: +1 stability, and Rome\'s opinion settles. The elders note that emperors of this kind rarely die old.',
        effects: guard('ev_domitian_demands:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -80, stability: 1 });
          setOpinion(ctx, 'ROM', 'JUD', -80);
        }),
      },
      {
        label: 'The kingdom kneels to no accountant',
        tooltip: 'Refusal: +10 legitimacy and "The Refusal of Domitian" (+5% morale, 24 months) — but the walls must be manned for the answer: −20 treasury, and Rome\'s opinion falls to the floor.',
        effects: guard('ev_domitian_demands:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 10, treasury: -20 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'refusal_domitian', name: 'The Refusal of Domitian', months: 24,
            effects: { moraleMult: 1.05 },
          });
          setOpinion(ctx, 'ROM', 'JUD', -200);
        }),
      },
    ],
  },

  // ── 54 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev_children_of_the_war',
    title: 'The Children of the War',
    desc: 'The men who held the wall are grandfathers now, and they have discovered that '
      + 'a victory is also an inheritance dispute. A generation is grown that never saw '
      + 'a legion: they marry Greek-speaking wives from the coast their fathers '
      + 'conquered, quote the sages at the priests and the priests at the sages, and '
      + 'ask why the watchtowers on the Joppa road are still manned. Because we '
      + 'remember, the old men answer. It is the correct answer, and it will not serve '
      + 'forever. A state built by a miracle must decide what it is for, once the '
      + 'miracle is a generation of ordinary mornings old.',
    forTag: 'JUD',
    major: true,
    trigger: safeTrigger('ev_children_of_the_war', (ctx) =>
      dateGE(ctx, 90, 6) && judaeaFree(ctx) && !!ctx.helpers.getFlag(ctx, 'secondKingdom')),
    aiOption: 0,
    options: [
      {
        label: 'Open the gates the war shut',
        tooltip: 'The coast\'s Greeks admitted to the markets, the diaspora\'s scholars to the schools: "The Open Kingdom" (+5% income, permanent) and +15 influence points — but the veterans mutter: Jerusalem +1 unrest for 12 months.',
        effects: guard('ev_children_of_the_war:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { infl: 15 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'open_kingdom', name: 'The Open Kingdom', months: -1,
            effects: { incomeMult: 1.05 },
          });
          h.addProvinceModifier(ctx, 'Jerusalem', {
            id: 'veterans_mutter', name: 'The Veterans Mutter', months: 12,
            effects: { unrest: 1 },
          });
        }),
      },
      {
        label: 'Keep the covenant of the walls',
        tooltip: 'The kingdom stays girded: +10 legitimacy, +1 stability, and "The Guarded Kingdom" (+5% manpower, −3% income, permanent). The watchtowers stay manned; so do the habits.',
        effects: guard('ev_children_of_the_war:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 10, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'guarded_kingdom', name: 'The Guarded Kingdom', months: -1,
            effects: { manpowerMult: 1.05, incomeMult: 0.97 },
          });
        }),
      },
    ],
  },
];
