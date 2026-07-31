// Judaea Universalis — bookmark: The War of Independence, 1948 CE (SPEC §9.1).
// Content package. Zero imports; all effects run through ctx.helpers at runtime.
// Historical spine: 14 May 1948 — the Mandate ends at midnight, the State of
// Israel is declared in Tel Aviv, and five Arab armies cross the borders by
// morning. The map wears its ancient names (Joppa is Tel Aviv–Jaffa, Emmaus is
// Latrun, Philadelphia is Amman, Memphis stands for Cairo); the war is 1948's.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[bookmark_1948] ' + key, e || '');
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

// A war is filed under the names its belligerents wear NOW (SPEC §135), and a
// content package asks after them by the names its chapter shipped with. The
// forwarding address lives on the game state, so this reads it without needing
// a ctx it was never given.
function warTag(game, t) {
  if (!game || !t) return t;
  if (game.tags && game.tags[t]) return t;
  const to = game.tagAliases && game.tagAliases[t];
  return (to && game.tags && game.tags[to]) ? to : t;
}

function findWar(game, a, b) {
  const x = warTag(game, a);
  const y = warTag(game, b);
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(x) !== -1 && all.indexOf(y) !== -1) return w;
  }
  return null;
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

// ---- the map of May 1948, in the map's ancient names ------------------------
const ISR_LANDS = [
  // the coastal plain and the Valley, held at midnight
  'Joppa', 'Antipatris', 'Caesarea Maritima', 'Dora', 'Ptolemais', 'Jamnia',
  'Scythopolis',
  // eastern Galilee (Tiberias and Safed fell before the Mandate ended)
  'Tiberias', 'Tarichaea',
  // the Galilee panhandle: Metula, the Hula settlements, the Dan springs
  'Kiryat Shmona',
  // west Jerusalem and the Dead Sea outposts
  'Jerusalem', 'Masada', 'Engaddi',
  // independently rendered modern districts and cities
  'Safed', 'Nahariya', 'Afula', 'Hadera', 'Netanya', 'Herzliya', 'Kfar Saba',
  'Rishon LeZion', 'Rehovot',
];
const JOR_LANDS = [
  // the Arab Legion's positions and the kingdom proper
  'Emmaus', 'Lydda', 'Jericho', 'Hebron', 'Adora', 'Neapolis', 'Sebaste',
  'Gadora', 'Machaerus', 'Medaba', 'Philadelphia', 'Gerasa', 'Pella',
  'Gadara', 'Petra', 'Aila',
  'Modi\'in Hills', 'Jenin', 'Tulkarm', 'Qalqilya', 'Ramallah', 'Bethlehem',
  'Beit Shemesh', 'Arad',
  // the Arabah, patrolled from Aqaba — Operation Uvda's long march
  'Paran', 'Eilat',
  // v6.7: the kingdom's side of the Arabah — the Ghor es-Safi
  'Zoara',
  // the eastern Badia: the Azraq oasis, Wadi Sirhan, the desert patrol's beat
  'Azraq',
];
const EGY_LANDS = [
  // the expeditionary axis and Egypt itself
  'Gaza', 'Ascalon', 'Azotus', 'Rhinocolura', 'Oboda', 'Pelusium',
  'Alexandria', 'Athribis', 'Leontopolis', 'Memphis', 'Arsinoe',
  'Oxyrhynchus', 'Thebes', 'Myos Hormos', 'Paraetonium', 'Syene', 'Berenice',
  'Kiryat Gat', 'Beersheba', 'Khan Yunis', 'Rafah',
  // the Egyptian claim in the deep Negev: the Auja axis and the Kurnub tracks
  'Mitzpe Ramon', 'Dimona',
  // v6.7: the Sinai side of the 1906 line — Quseima on the Auja axis, and
  // the gulf coast from Taba south
  'Kadesh Barnea', 'Dizahab',
  // the desert interiors: sovereign, administered, and (in 1948) crossable
  'Sinai Interior', 'Eastern Desert', 'Libyan Desert',
];
const SYR_LANDS = [
  'Damascus', 'Emesa', 'Palmyra', 'Apamea', 'Beroea', 'Cyrrhus',
  'Laodicea', 'Aradus', 'Dura-Europos', 'Bostra', 'Syrian Desert',
  'Nisibis', // Qamishli — the Jazira corner is Syrian, not Iraqi
  // the Golan approaches
  'Caesarea Philippi', 'Batanea', 'Gamala',
];
// Chalcis is the Beqaa (era name Zahle): Lebanese, not Syrian, since Greater
// Lebanon's 1920 borders — the republic is the coast AND the valley.
// Gischala, Sepphoris and Jotapata (Jish, Nazareth, Sakhnin) are the central
// Galilee pocket: Arab-held on 15 May and garrisoned by Kaukji's Liberation
// Army, carried here under the Lebanese proxy until Dekel and Hiram take it.
const LEB_LANDS = ['Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis', 'Chalcis',
  'Gischala', 'Sepphoris', 'Jotapata'];
const IRQ_LANDS = [
  'Singara', 'Hatra', 'Arbela', 'Assur', 'Seleucia-Ctesiphon', 'Babylon',
  'Nehardea', 'Uruk', 'Charax',
  'Rutba', // the western desert: the Rutbah wells and pumping stations
];
const TUR_LANDS = [
  'Halicarnassus', // Bodrum
  'Tarsus', 'Iconium', 'Tyana', 'Pisidia', 'Attalia', 'Seleucia Trachea',
  'Caesarea Mazaca', 'Melitene', 'Samosata', 'Zeugma', 'Edessa', 'Carrhae',
  'Amida', 'Tigranocerta', 'Sophene', 'Antioch', 'Seleucia Pieria',
];
const SAU_LANDS = ['Hegra', 'Dumatha', 'Tayma', 'Arabian Desert',
  // v5.0: the Hejaz holy cities' province and the eastern oil coast
  'Yathrib', 'Khaybar', 'Gerrha'];
const IRN_LANDS = ['Ecbatana', 'Susa', 'Gazaca', 'Persepolis', 'Gabae',
  'Hyrcania']; // v5.4: Mazandaran on the Caspian
// Cyrenaica AND Tripolitania in May 1948 are the British Military
// Administrations, not yet Libya (v5.4 adds the Tripolitanian shore).
const UK_LANDS = ['Salamis', 'Paphos', 'Cyrene', 'Marmarica',
  'Oea', 'Leptis Magna', 'Macomades'];
// Greece is a neutral neighbor, three years past its own liberation
// (v5.4: with Salonika on the map at last)
const GRC_LANDS = ['Corinth', 'Athens', 'Sparta', 'Gortyn', 'Rhodes', 'Thessalonica'];
// v5.4: the Republic of Italy, watching the sea it once ruled
const ITA_LANDS = ['Roma', 'Capua', 'Tarentum', 'Brundisium', 'Rhegium', 'Panormus', 'Syracusae'];
// v5.4: Turkey's true 1948 shape — Thrace, the straits, Anatolia to Kars' edge
const TUR_1948_NORTH = ['Hadrianopolis', 'Byzantion', 'Nicaea', 'Smyrna',
  'Ancyra', 'Sinope', 'Trapezus'];

// These permanent cells collapse into their ancient parents in every earlier
// bookmark. In 1948 they become real provinces: distinct borders, clicks,
// movement nodes, labels, ownership, development and victory-count land.
const MODERN_PROVINCES = [
  'Safed', 'Nahariya', 'Afula', 'Hadera', 'Netanya', 'Herzliya', 'Kfar Saba',
  'Rishon LeZion', 'Rehovot', 'Modi\'in Hills', 'Jenin', 'Tulkarm', 'Qalqilya',
  'Ramallah', 'Bethlehem', 'Beit Shemesh', 'Kiryat Gat', 'Beersheba', 'Arad',
  'Khan Yunis', 'Rafah',
  // v4.4: the Negev triangle — the armistice shape is formable down to Eilat
  'Dimona', 'Mitzpe Ramon', 'Paran', 'Eilat',
  // v4.5: the neighbors' modern shapes — the panhandle, the Badia, the wells
  'Kiryat Shmona', 'Azraq', 'Rutba',
  // v6.7: the southern borders drawn true — the Sinai side of the 1906 line
  // and Jordan's Ghor es-Safi, so the Negev triangle wears its real edges
  'Kadesh Barnea', 'Dizahab', 'Zoara',
  // v6.8 (SPEC §160): the western frame's latent cells. Nothing in the 1948
  // campaign happens in Britain — these are here because THIS bookmark is the
  // full-resolution one. tools/geom-snapshot.json is dumped from 1948 exactly
  // because every latent cell is active in it, so the snapshot carries each
  // permanent cell's OWN geometry and headless consumers fold it per bookmark
  // (tools/README.md). A latent cell missing from this list has no geometry of
  // its own anywhere, in any era: it comes back with zero area and no
  // neighbours, which is precisely how smoke31 caught these.
  'Londinium', 'Camulodunum', 'Durovernum', 'Venta Belgarum', 'Corinium',
  'Isca Dumnoniorum', 'Dumnonia', 'Isca Silurum', 'Cambria', 'Deva', 'Lindum',
  'Eboracum', 'Brigantia', 'Caledonia Ultima',
  'Hibernia Occidentalis', 'Mumu',
];

const OWNERS = {};
for (const n of ISR_LANDS) OWNERS[n] = 'ISR';
for (const n of JOR_LANDS) OWNERS[n] = 'JOR';
for (const n of EGY_LANDS) OWNERS[n] = 'EGY';
for (const n of SYR_LANDS) OWNERS[n] = 'SYR';
for (const n of LEB_LANDS) OWNERS[n] = 'LEB';
for (const n of IRQ_LANDS) OWNERS[n] = 'IRQ';
for (const n of TUR_LANDS) OWNERS[n] = 'TUR';
for (const n of TUR_1948_NORTH) OWNERS[n] = 'TUR';
for (const n of SAU_LANDS) OWNERS[n] = 'SAU';
for (const n of IRN_LANDS) OWNERS[n] = 'IRN';
for (const n of UK_LANDS) OWNERS[n] = 'UK';
for (const n of GRC_LANDS) OWNERS[n] = 'GRC';
for (const n of ITA_LANDS) OWNERS[n] = 'ITA';
// CORRECTED (SPEC §173): these three used to be marked WASTE — "closed
// frontiers, not playfields" — which conflated sealed with ownerless. Hoxha's
// Albania and the Georgian and Azerbaijani SSRs were emphatically somebody's;
// the political map (js/data/political_maps.js) seats ALB and SOV on them,
// and the border stays closed the honest way: a Stalinist state at 0.05
// aggression crosses into nothing.

// ---- faiths and tongues, nineteen centuries on -------------------------------
const RELIGIONS = {};
const CULTURES = {};
for (const n of JOR_LANDS.concat(EGY_LANDS, SYR_LANDS, IRQ_LANDS, TUR_LANDS, SAU_LANDS, IRN_LANDS)) {
  RELIGIONS[n] = 'islam';
}
for (const n of ISR_LANDS) RELIGIONS[n] = 'judaism';
for (const n of ['Tyre', 'Sidon', 'Gischala', 'Jotapata', 'Chalcis']) RELIGIONS[n] = 'islam';
for (const n of ['Berytus', 'Byblos', 'Tripolis']) RELIGIONS[n] = 'christianity';
RELIGIONS['Sepphoris'] = 'christianity'; // Nazareth's Christian plurality
RELIGIONS['Salamis'] = 'christianity';
RELIGIONS['Paphos'] = 'christianity';
for (const n of GRC_LANDS) RELIGIONS[n] = 'christianity';
RELIGIONS['Cyrene'] = 'islam'; RELIGIONS['Marmarica'] = 'islam';
RELIGIONS['Halicarnassus'] = 'islam';
for (const n of JOR_LANDS.concat(EGY_LANDS, SYR_LANDS, LEB_LANDS, IRQ_LANDS, SAU_LANDS)) {
  CULTURES[n] = 'arab_modern';
}
for (const n of ISR_LANDS) CULTURES[n] = 'israeli';
for (const n of TUR_LANDS) CULTURES[n] = 'turkish';
for (const n of GRC_LANDS) CULTURES[n] = 'greek';
// v5.4: the wider frame's modern faiths and tongues
for (const n of ITA_LANDS) { RELIGIONS[n] = 'christianity'; CULTURES[n] = 'roman'; }
for (const n of TUR_1948_NORTH) { RELIGIONS[n] = 'islam'; CULTURES[n] = 'turkish'; }
RELIGIONS['Thessalonica'] = 'christianity'; CULTURES['Thessalonica'] = 'greek';
for (const n of ['Oea', 'Leptis Magna', 'Macomades']) { RELIGIONS[n] = 'islam'; CULTURES[n] = 'arab_modern'; }
RELIGIONS['Hyrcania'] = 'islam'; CULTURES['Hyrcania'] = 'persian';

export const BOOKMARK_1948 = {
  id: '1948ce',
  name: 'The War of Independence',
  // The shared simulation speaks in deliberately ancient terms by default.
  // This bookmark keeps the mechanics and replaces only their public dress.
  uiTerms: {
    realm: 'State',
    legitimacy: 'Public mandate',
    manpower: 'Reserves',
    chapters: 'National Programmes',
    chapter: 'Programme',
    character: 'National Character',
    missions: 'War Objectives',
    factions: 'Political Blocs',
    powers: 'Great Powers',
    court: 'Cabinet & General Staff',
  },
  doctrineAxes: {
    zeal: {
      name: 'Identity and Pluralism',
      question: 'Is national identity guarded by uniformity, or strengthened by pluralism?',
      hi: 'National', lo: 'Pluralist',
      hiBlurb: 'The state puts national cohesion first in education, settlement and public life.',
      loBlurb: 'The state treats civic accommodation and minority rights as sources of resilience.',
    },
    alignment: {
      name: 'Strategic Alignment',
      question: 'Does the state anchor its security in the Western alliance or preserve room to maneuver?',
      hi: 'Western', lo: 'Non-Aligned',
      hiBlurb: 'Defense and diplomacy are anchored in the Western alliance.',
      loBlurb: 'The state keeps strategic distance and bargains across rival blocs.',
    },
    authority: {
      name: 'Executive and Parliament',
      question: 'Does national power collect in the executive or remain with parliament and coalition?',
      hi: 'Executive', lo: 'Parliamentary',
      hiBlurb: 'The executive is trusted to act decisively in crisis.',
      loBlurb: 'Coalition, parliament and cabinet keep authority dispersed and accountable.',
    },
    conquest: {
      name: 'Security and Prosperity',
      question: 'Does policy put territorial security or commercial prosperity first?',
      hi: 'Security-first', lo: 'Commercial',
      hiBlurb: 'Strategic depth and military readiness take precedence.',
      loBlurb: 'Trade, investment and negotiated access are treated as the durable source of strength.',
    },
  },
  chapterText: {
    titles: {
      'The Second Kingdom': 'The Secure Republic',
      'The Guarded Sanctuary': 'The Defended State',
      'The Crown and the Altar': 'The National Compact',
    },
    objectives: {
      holyPlaces: 'National Heritage',
      communities: 'Civic Peace',
      trade: 'Maritime Power',
      undoubted: 'Constitutional Continuity',
      chamber: 'Government That Governs',
      estates: 'A Durable Coalition',
      stability: 'The Long Peace',
      devGain: 'National Development',
      allies: 'The Diplomatic Network',
      clients: 'Regional Partnerships',
      covenant: 'Strategic Partnership',
      ledgers: 'The Modern Economy',
      mended: 'Reconciliation',
    },
    rewards: {
      'The Weights and Measures': 'National Standards',
      'The Rolls of the Willing': 'The Reserve Register',
      'The Old Standards': 'Service Tradition',
      'The King\'s Roads': 'National Infrastructure',
      'The Great Seal': 'Institutional Trust',
    },
  },
  decisionText: {
    grand_festival: {
      name: 'Fund National Celebrations', costText: '100 funds',
      desc: 'Concerts, ceremonies and local celebrations lift public morale: −2 unrest across the state for a year, +5 public mandate.',
      result: 'National celebrations lift public morale: −2 unrest everywhere for a year, +5 public mandate.',
    },
    great_rites: {
      name: 'Launch a Public Campaign', costText: '50 governance points',
      desc: 'A coordinated public-information campaign builds confidence: +10 public mandate, −1 unrest for a year.',
      result: 'The public campaign builds confidence: +10 public mandate, −1 unrest for a year.',
    },
    trade_expedition: {
      name: 'Fund Export Promotion', costText: '150 funds',
      desc: 'Trade missions and export credit open new markets: +20% income for two years.',
      result: 'The export programme opens new markets: +20% income for two years.',
    },
    drill_army: {
      name: 'Run National Exercises', costText: '50 martial points',
      desc: 'Large-scale command-post and field exercises: +5% discipline for 18 months.',
      result: 'The national exercises harden command and logistics: +5% discipline for 18 months.',
    },
    resettle_land: {
      name: 'Fund Regional Development', costText: '100 funds · peacetime only',
      desc: 'Housing, roads and employment bring people to underdeveloped regions: +3,000 reserves now, +10% reserves for a year. Peacetime only.',
      result: 'Regional development expands the reserve base: +3,000 reserves, +10% reserves for a year.',
    },
  },
  advisorEras: [
    {
      from: 1948,
      names: ['Moshe Carmel', 'Mickey Marcus', 'Yigal Allon', 'Moshe Dayan',
        'Golda Meir', 'Abba Eban', 'Pinhas Rosen', 'Levi Eshkol'],
    },
    {
      from: 1965,
      names: ['Golda Meir', 'Abba Eban', 'Moshe Dayan', 'Yigal Allon',
        'Pinhas Sapir', 'Yitzhak Rabin', 'Shimon Peres', 'Chaim Bar-Lev'],
    },
    {
      from: 1980,
      names: ['Shimon Peres', 'Yitzhak Rabin', 'Moshe Nissim', 'Ezer Weizman',
        'David Levy', 'Moshe Arens', 'Dan Shomron', 'Ehud Barak'],
    },
  ],
  startDate: { y: 1948, m: 5, d: 15 },
  // SPEC §121: the year after which this chapter's own undated trigger
  // cards stop belonging to anybody — the War of Independence and the century after it.
  // A card that legitimately runs later says so with its own maxYear.
  generationHorizon: 2005,
  // Technology of the age (SPEC §22): rifle brigades and armored corps.
  techBase: 19,
  // How far up the ladder this age can climb (SPEC §99). The one bookmark whose century really does field rifle brigades and
  // armored corps: the ladder runs to its end here (SPEC §99).
  techCeiling: 24,
  techTweaks: { JOR: { mar: 1 }, UK: { mar: 1 }, ISR: { infl: 1 } },

  blurb: 'At midnight the Mandate ended; at four in the afternoon, in the Tel Aviv '
    + 'museum, the State of Israel was declared; by morning the armies of Egypt, '
    + 'Transjordan, Syria, Lebanon and Iraq were across the borders. Eighteen and a '
    + 'half centuries after Betar fell, there is again a Jewish state — for exactly as '
    + 'long as it can defend itself.',

  activeTags: ['ISR', 'EGY', 'JOR', 'SYR', 'LEB', 'IRQ', 'SAU', 'TUR', 'IRN', 'UK', 'GRC', 'ITA',
    // The political west (SPEC §173): the Europe of May 1948, seated by
    // js/data/political_maps.js — Marshall-plan west, people's-republic east,
    // occupied middle. Nobody here marches on the Levant; every court here
    // convenes, elects, dies and is chronicled like any other.
    //
    // ALB is deliberately NOT seated: Albania's one cell is sealed
    // (impassable), so a seated ALB would be a court with a flag and nothing
    // the simulation can count — the harness flags it DEAD from the first
    // month. Dyrrhachium wears Albania's color and name from the TAGS catalog
    // (the same painted-not-seated pattern as Arabia's rump in 132), and a
    // sealed country keeps sealed politics.
    'FRA', 'SPA', 'POR', 'NLD', 'DEN', 'SWE', 'SUI', 'IRL',
    'GER', 'AUT', 'POL', 'CZE', 'HUN', 'YUG', 'BUL', 'ROU', 'SOV'],
  // Standing rivalries (SPEC §73): no peace, only armistice lines — and the
  // Arab cold war between Cairo and the Hashemite bloc (non-adjacent, so it
  // chills opinions without opening a land war).
  rivalries: [['ISR', 'EGY'], ['ISR', 'SYR'], ['EGY', 'IRQ']],
  // Historical friends (SPEC §86): the secret wire to Amman was real, it ran
  // through the whole war, and it is the one Arab capital that signed
  // anything like a private understanding. Lebanon fought least and quit
  // first. Neither friendship survives being named an enemy.
  affinities: [
    ['ISR', 'JOR'],
    ['ISR', 'LEB'],
  ],
  // What this age's diplomacy can and cannot do (SPEC §96). No Arab capital
  // will sign a military alliance with Israel — not in 1948, not after
  // Washington in 1979, not in any branch this campaign can reach; the
  // treaties that were signed were recognitions, not pacts, and an Egyptian
  // division was never going to fight for Israel. So the alliance is barred
  // outright and recognition is the road that stays open: it converts the
  // armistice into a peace, retires the rivalry, and binds neither state to
  // the other's wars. The bar runs across the line in both directions and
  // covers the formables on both sides (the Kingdom of Israel; the UAR).
  diplomacy: {
    recognition: true,
    // The pressure this age actually applied (SPEC §100). Western capitals did
    // not raise leagues against Middle Eastern states over border wars; they
    // closed markets, suspended credit and, when they meant it, put destroyers
    // across the approaches. Every court here can close its markets; only a
    // court with hulls at sea can close a coast.
    embargo: true,
    noAlliance: [
      {
        between: ['ISR', 'MLI'],
        and: ['EGY', 'JOR', 'SYR', 'LEB', 'IRQ', 'SAU', 'UAR'],
        why: 'No Arab state will put its name under a military alliance with Israel. '
          + 'Recognition is as far as this age goes — and it is further than most of it got.',
      },
    ],
  },
  activeProvinces: MODERN_PROVINCES,
  // One-time save migration: preserve any development the player added above
  // the old coarse province baseline while redistributing that baseline among
  // the new cells. Fresh campaigns already start at mapProfileVersion 1.
  mapProfileMigration: {
    version: 1,
    previousDev: {
      'Gischala': { tax: 3, prod: 3, mp: 3 },
      'Ptolemais': { tax: 5, prod: 5, mp: 4 },
      'Scythopolis': { tax: 4, prod: 5, mp: 3 },
      'Caesarea Maritima': { tax: 6, prod: 7, mp: 4 },
      'Joppa': { tax: 12, prod: 10, mp: 8 },
      'Antipatris': { tax: 6, prod: 6, mp: 5 },
      'Jamnia': { tax: 3, prod: 3, mp: 3 },
      'Emmaus': { tax: 3, prod: 3, mp: 3 },
      'Neapolis': { tax: 4, prod: 4, mp: 4 },
      'Sebaste': { tax: 4, prod: 4, mp: 3 },
      'Hebron': { tax: 3, prod: 3, mp: 3 },
      'Ascalon': { tax: 4, prod: 4, mp: 3 },
      'Oboda': { tax: 1, prod: 3, mp: 1 },
      'Adora': { tax: 3, prod: 3, mp: 3 },
      'Gaza': { tax: 4, prod: 5, mp: 3 },
    },
  },

  owners: OWNERS,
  religions: RELIGIONS,
  cultures: CULTURES,

  // The tools of the age (SPEC §52): no modern state runs missionary
  // conversion of districts — integration in 1948 is schools, land and
  // votes, not priests. Everything unnamed stays on.
  // Modern states neither convert provinces nor wed each other; they also do
  // not raise punitive leagues (SPEC §100 — the embargo is this age's answer),
  // and their constitutions have successors rather than heirs, so the dynastic
  // succession crisis (SPEC §98) never opens here.
  // …and no client kingdoms (SPEC §142). This age does not make them. The
  // institution the peace table calls subjugation — a beaten crown kept alive
  // and sworn to the victor — belongs to the world of Herod and Agrippa, and
  // the twentieth century settled its wars a different way. 1948 ends in
  // armistice lines at Rhodes, not in vassalage: no belligerent came out of it
  // owing fealty to another, and the mandates that did look like clientage
  // were expiring, not being founded. Egypt held Gaza and Jordan annexed the
  // West Bank as OCCUPATION and ANNEXATION, which this table still does — a
  // state here can be beaten, occupied, partitioned and stripped of land. What
  // it cannot be is somebody's client, because that is not a clause the age's
  // treaties know how to write. The bar covers all three roads: the yoke at
  // the peace table, the collar offered to a small friendly neighbour in
  // peacetime (SPEC §92), and taking a client off a defeated enemy.
  mechanics: {
    conversion: false, royalMarriage: false, coalitions: false, succession: false,
    clientKingdoms: false,
  },

  // Black gold (SPEC §52): the age's prize goods. Kirkuk behind Arbela,
  // Abadan and Khuzestan behind Susa, the al-Hasa fields behind Gerrha —
  // the wells that paid for the region's armies.
  goods: { Arbela: 'oil', Susa: 'oil', Gerrha: 'oil' },

  // Who actually lives here (SPEC §56): the crowded 20th century, and the
  // mixed cities of 1948 in their real proportions. Unlisted provinces are
  // homogeneous behind their religion/culture overlay.
  popMult: 2.5,
  pops: {
    'Jerusalem': [
      { r: 'judaism', c: 'israeli', share: 0.60 },
      { r: 'islam', c: 'arab_modern', share: 0.32 },
      { r: 'christianity', c: 'arab_modern', share: 0.08 },
    ],
    'Dora': [ // Haifa
      { r: 'judaism', c: 'israeli', share: 0.55 },
      { r: 'islam', c: 'arab_modern', share: 0.33 },
      { r: 'christianity', c: 'arab_modern', share: 0.12 },
    ],
    'Joppa': [ // Tel Aviv-Jaffa
      { r: 'judaism', c: 'israeli', share: 0.75 },
      { r: 'islam', c: 'arab_modern', share: 0.22 },
      { r: 'christianity', c: 'arab_modern', share: 0.03 },
    ],
    'Ptolemais': [ // Acre
      { r: 'islam', c: 'arab_modern', share: 0.63 },
      { r: 'judaism', c: 'israeli', share: 0.25 },
      { r: 'christianity', c: 'arab_modern', share: 0.12 },
    ],
    'Sepphoris': [ // Nazareth — no Jewish community in the 1948 town
      { r: 'christianity', c: 'arab_modern', share: 0.60 },
      { r: 'islam', c: 'arab_modern', share: 0.40 },
    ],
    'Tiberias': [
      { r: 'judaism', c: 'israeli', share: 0.70 },
      { r: 'islam', c: 'arab_modern', share: 0.30 },
    ],
    'Safed': [
      { r: 'judaism', c: 'israeli', share: 0.78 },
      { r: 'islam', c: 'arab_modern', share: 0.22 },
    ],
    'Berytus': [ // Beirut
      { r: 'christianity', c: 'arab_modern', share: 0.55 },
      { r: 'islam', c: 'arab_modern', share: 0.45 },
    ],
  },

  // The map speaks 1948 (SPEC §24): canonical names stay the content keys;
  // these are what the labels, panels and toasts show. Places another state
  // renamed AFTER conquering them open under their 15-May originals — the
  // victors' names wait in `integratedNames` below (SPEC §66).
  provinceNames: {
    'Joppa': 'Tel Aviv-Jaffa', 'Antipatris': 'Petah Tikva', 'Dora': 'Haifa',
    'Safed': 'Tzfat',
    'Ptolemais': 'Acre', 'Caesarea Maritima': 'Caesarea', 'Jamnia': 'Yavne',
    'Emmaus': 'Latrun',
    // Jotapata wears Sakhnin: kibbutz Yodfat is a 1960 foundation, and in
    // 1948 the cell's town is Arab Sakhnin at the pocket's heart.
    'Sepphoris': 'Nazareth', 'Jotapata': 'Sakhnin', 'Tarichaea': 'Migdal',
    'Gischala': 'Jish', 'Scythopolis': 'Beit She\'an', 'Engaddi': 'Ein Gedi',
    'Ascalon': 'al-Majdal', 'Azotus': 'Isdud', 'Neapolis': 'Nablus',
    'Sebaste': 'Samaria', 'Adora': 'Dura', 'Gadora': 'Salt', 'Machaerus': 'Karak',
    'Medaba': 'Madaba', 'Philadelphia': 'Amman', 'Gerasa': 'Jerash',
    'Gadara': 'Irbid', 'Aila': 'Aqaba', 'Oboda': 'al-Auja',
    'Caesarea Philippi': 'Banias', 'Batanea': 'Quneitra', 'Gamala': 'Golan',
    'Berytus': 'Beirut', 'Tripolis': 'Tripoli', 'Aradus': 'Tartus',
    'Laodicea': 'Latakia', 'Emesa': 'Homs', 'Beroea': 'Aleppo',
    'Apamea': 'Hama', 'Bostra': 'Daraa', 'Dura-Europos': 'Deir ez-Zor',
    'Chalcis': 'Zahle', 'Cyrrhus': 'Azaz',
    'Antioch': 'Antakya', 'Seleucia Pieria': 'Iskenderun', 'Zeugma': 'Gaziantep',
    'Samosata': 'Samsat', 'Edessa': 'Urfa', 'Carrhae': 'Harran',
    'Amida': 'Diyarbakır', 'Tigranocerta': 'Siirt', 'Sophene': 'Elazığ',
    'Melitene': 'Malatya', 'Caesarea Mazaca': 'Kayseri', 'Iconium': 'Konya',
    'Tyana': 'Niğde', 'Attalia': 'Antalya', 'Seleucia Trachea': 'Silifke',
    'Nisibis': 'Qamishli', 'Singara': 'Sinjar', 'Arbela': 'Erbil',
    'Assur': 'Shirqat', 'Hatra': 'al-Hadr', 'Seleucia-Ctesiphon': 'Baghdad',
    'Babylon': 'Hilla', 'Nehardea': 'Fallujah', 'Uruk': 'Nasiriyah',
    'Charax': 'Basra', 'Ecbatana': 'Hamadan', 'Susa': 'Ahvaz', 'Gazaca': 'Tabriz',
    'Pelusium': 'Port Said', 'Rhinocolura': 'El Arish', 'Leontopolis': 'Ismailia',
    'Athribis': 'Benha', 'Memphis': 'Cairo', 'Arsinoe': 'Faiyum',
    'Oxyrhynchus': 'Minya', 'Thebes': 'Luxor', 'Myos Hormos': 'Hurghada',
    'Salamis': 'Famagusta', 'Hegra': 'Hejaz', 'Dumatha': 'Al-Jawf',
    'Tayma': 'Tayma', 'Petra': 'Ma\'an', 'Beersheba': 'Bir Saba',
    'Syene': 'Aswan', 'Paraetonium': 'Marsa Matruh', 'Marmarica': 'Tobruk',
    'Cyrene': 'Derna', 'Yathrib': 'Medina', 'Gerrha': 'Dammam',
    'Persepolis': 'Shiraz', 'Gabae': 'Isfahan', 'Halicarnassus': 'Bodrum',
    'Gortyn': 'Heraklion',
    // v6.7: the southern border cells in their 1948 names
    'Kadesh Barnea': 'El Quseima', 'Dizahab': 'Taba', 'Zoara': 'Safi',
    // v6.8: the 15-May originals of places their conquerors later renamed
    'Kiryat Gat': 'al-Faluja', 'Beit Shemesh': 'Ayn Shams',
    'Eilat': 'Umm Rashrash',
    // v5.4: the wider frame in its 1948 names
    'Roma': 'Rome', 'Capua': 'Naples', 'Tarentum': 'Taranto',
    'Brundisium': 'Brindisi', 'Rhegium': 'Reggio Calabria',
    'Panormus': 'Palermo', 'Syracusae': 'Syracuse',
    'Oea': 'Tripoli (Libya)', 'Leptis Magna': 'Al-Khums', 'Macomades': 'Sirte',
    'Thessalonica': 'Salonika', 'Hadrianopolis': 'Edirne',
    'Byzantion': 'Istanbul', 'Nicaea': 'Bursa', 'Smyrna': 'İzmir',
    'Ancyra': 'Ankara', 'Sinope': 'Sinop', 'Trapezus': 'Trabzon',
    'Hyrcania': 'Mazandaran',
    // The last three foreign cells still wearing a classical name (SPEC §141).
    // Every other province of every foreign country in this chapter already
    // carried its 1948 one; these three were missed, and they were the only
    // three on the map where a modern state's own land answered to a name that
    // state does not use.
    'Pisidia': 'Isparta',           // an ancient REGION, not a town: the only
                                    // cell in Anatolia with no modern name at
                                    // all. It sits in the lakes at 30.55E —
                                    // which is Isparta, to the degree.
    'Palmyra': 'Tadmur',            // Syria's own name for it, and the one
                                    // classical survival among fifteen Syrian
                                    // cells that were all renamed around it.
    'Pella': 'Tabaqat Fahl',        // the Decapolis city; Jordan's name for the
                                    // site, and its neighbours Jerash, Irbid
                                    // and Salt were all already modern.
    // Deliberately left alone, because these ARE the modern names and not only
    // the ancient ones: Alexandria, Damascus, Gaza, Tarsus, Paphos, Khaybar,
    // Tayma, Athens, Corinth, Sparta, Rhodes, and the Phoenician three —
    // Byblos, Sidon and Tyre — which this chapter renders as English exonyms
    // exactly as it renders Aleppo, Beirut and Nablus. Lydda keeps the form
    // the events of 1948 are written under.
    //
    // -- SPEC §173: the western frame in its 1948 names. Same rule as Memphis
    // -> Cairo throughout: a cell answers to the metropolis that actually
    // governs its ground in 1948, not to the dig site the seed sits on —
    // Lutetia is Paris, Aquincum is Budapest, and the cell around dead
    // Sarmizegetusa answers to Hunedoara. French North Africa wears the
    // administrative names of 1948 (Bône, Bougie), because those are the
    // 15-May originals here. Where the classical name IS the 1948 name
    // (Ravenna, Ancona) nothing is written.
    'Carthago': 'Tunis', 'Hadrumetum': 'Sousse', 'Thysdrus': 'El Djem',
    'Tacape': 'Gabès', 'Capsa': 'Gafsa', 'Theveste': 'Tébessa',
    'Hippo Regius': 'Bône', 'Cirta': 'Constantine', 'Saldae': 'Bougie',
    'Icosium': 'Algiers', 'Caesarea Mauretaniae': 'Cherchell',
    'Portus Magnus': 'Oran', 'Volubilis': 'Meknès', 'Tingis': 'Tangier',
    'Sala': 'Rabat', 'Atlas': 'Marrakesh', 'Gaetulia': 'Ouarzazate',
    'Garama': 'Sebha',
    'Gades': 'Cádiz', 'Corduba': 'Córdoba', 'Hispalis': 'Seville',
    'Malaca': 'Málaga', 'Carthago Nova': 'Cartagena', 'Toletum': 'Madrid',
    'Emerita': 'Mérida', 'Olisipo': 'Lisbon', 'Bracara': 'Braga',
    'Asturica': 'Oviedo', 'Tarraco': 'Tarragona', 'Caesaraugusta': 'Zaragoza',
    'Valentia': 'Valencia', 'Numantia': 'Soria', 'Salmantica': 'Salamanca',
    'Barcino': 'Barcelona', 'Emporiae': 'Girona', 'Baleares': 'Palma',
    'Narbo': 'Narbonne', 'Massilia': 'Marseille', 'Nemausus': 'Nîmes',
    'Tolosa': 'Toulouse', 'Burdigala': 'Bordeaux', 'Lugdunum': 'Lyon',
    'Augustodunum': 'Dijon', 'Avaricum': 'Bourges', 'Limonum': 'Poitiers',
    'Condate': 'Rennes', 'Darioritum': 'Vannes', 'Lutetia': 'Paris',
    'Rotomagus': 'Rouen', 'Samarobriva': 'Amiens', 'Gesoriacum': 'Boulogne',
    'Durocortorum': 'Reims', 'Augusta Treverorum': 'Trier',
    'Colonia Agrippina': 'Cologne', 'Mogontiacum': 'Frankfurt',
    'Argentorate': 'Strasbourg', 'Batavia': 'Amsterdam',
    'Vesontio': 'Besançon', 'Genava': 'Geneva',
    'Augusta Vindelicorum': 'Munich', 'Virunum': 'Klagenfurt',
    'Mediolanum': 'Milan', 'Genua': 'Genoa', 'Bononia': 'Bologna',
    'Pisae': 'Pisa', 'Aquileia': 'Trieste', 'Aleria': 'Bastia',
    'Caralis': 'Cagliari', 'Turris Libisonis': 'Sassari',
    'Britannia': 'Birmingham', 'Londinium': 'London',
    'Camulodunum': 'Colchester', 'Durovernum': 'Canterbury',
    'Venta Belgarum': 'Southampton', 'Corinium': 'Bristol',
    'Isca Dumnoniorum': 'Exeter', 'Dumnonia': 'Plymouth',
    'Isca Silurum': 'Cardiff', 'Cambria': 'Caernarfon', 'Deva': 'Liverpool',
    'Lindum': 'Lincoln', 'Eboracum': 'York', 'Brigantia': 'Newcastle',
    'Caledonia': 'Glasgow', 'Caledonia Ultima': 'Inverness',
    'Hibernia': 'Dublin', 'Hibernia Occidentalis': 'Galway', 'Mumu': 'Cork',
    'Chatti': 'Kassel', 'Teutoburgium': 'Hanover', 'Frisia': 'Groningen',
    'Semnones': 'Berlin', 'Boiohaemum': 'Prague',
    'Cimbria': 'Aarhus', 'Selandia': 'Copenhagen', 'Scandia': 'Malmö',
    'Gothiscandza': 'Gdańsk', 'Aestii': 'Kaunas',
    'Salona': 'Split', 'Delminium': 'Sarajevo', 'Siscia': 'Zagreb',
    'Carnuntum': 'Vienna', 'Aquincum': 'Budapest', 'Sirmium': 'Novi Sad',
    'Singidunum': 'Belgrade', 'Naissus': 'Niš', 'Serdica': 'Sofia',
    'Philippopolis': 'Plovdiv', 'Novae': 'Ruse', 'Tomis': 'Constanța',
    'Sarmizegetusa': 'Hunedoara', 'Napoca': 'Cluj',
    'Tyras': 'Odessa', 'Olbia': 'Mykolaiv', 'Chersonesus': 'Sevastopol',
    'Panticapaeum': 'Kerch', 'Phanagoria': 'Krasnodar',
    'Tauria': 'Simferopol', 'Tanais': 'Rostov', 'Scythia': 'Kryvyi Rih',
    'Sarmatia': 'Kharkov', 'Roxolania': 'Stalingrad', 'Aorsia': 'Astrakhan',
    'Borysthenia': 'Gomel', 'Venedia': 'Minsk', 'Rha': 'Penza',
    'Hyperborea': 'Moscow', 'Ripaea': 'Kuybyshev',
    'Dyrrhachium': 'Durrës', 'Phasis': 'Batumi', 'Caucasian Albania': 'Baku',
  },

  // Where these courts actually sit in 1948 (SPEC §141). A tag's static seat
  // is its ANCIENT one, which for most of this chapter's countries lands on
  // the right city anyway — Memphis is Cairo, Berytus is Beirut, Philadelphia
  // is Amman, Seleucia-Ctesiphon is Baghdad, and Joppa is Tel Aviv, which is
  // where Israel's government actually was in May 1948. Two do not.
  //
  // Turkey's static seat is Iconium, and Turkey has not been governed from
  // Konya in this chapter's lifetime: the capital moved to Ankara in 1923,
  // and Ankara is on this map. Greece's is Corinth, which has never been the
  // capital of anything modern; Athens is on this map too. The seat is not
  // decoration — it takes the growth bonus, anchors AI development and the
  // muster search, and is the province the peace table refuses to hand over
  // — so both were quietly running the wrong city.
  //
  // Keyed by CANONICAL map name, because that is what the growth index looks
  // up (`capitals[p.canon || p.name]`), not by the era label.
  //
  // Left as they are, because the real answer is not on this map: Saudi
  // Arabia is governed from Riyadh and Iran from Tehran, neither of which
  // the frame reaches, and Britain from London. Their static seats stay.
  // …and who its courts are made of (SPEC §143). A court draws its rulers,
  // heirs, election candidates and generals from a pool keyed on its culture
  // group, and a culture group has no century in it — so four of the twelve
  // courts here were still staffed from antiquity. A death in Rome seated
  // Marcus Ulpius, a death in Athens seated Antigonos, Britain drew Hellenistic
  // names because its culture is `greek` for want of a better fit, and Iran was
  // governed by Parthian kings. Israel, the Arab states and Turkey already had
  // 1948 pools; these four never got one.
  //
  // It is declared here rather than by changing the cultures because GRC plays
  // in two chapters twenty-one centuries apart, and Nikanor is right in one of
  // them.
  tagTweaks: {
    TUR: { capital: 'Ancyra' },   // Ankara, capital since 1923
    GRC: { capital: 'Athens', names: 'greek_modern' },
    ITA: { names: 'italian' },
    UK: { names: 'british' },
    IRN: { names: 'iranian_modern' },
  },

  // The victors' pens wait on both the schoolhouse and the settlers (SPEC
  // §66): Jewish names require full integration AND a Jewish community of the
  // owner's culture. Until then — and again the moment the land changes hands
  // — the labels keep the 15-May originals above.
  integratedNames: {
    ISR: {
      // These modern cells reuse ancient canonical keys, but the 1948
      // province represents the modern city/metro. Keep the era label instead
      // of falling through to shared Yafo, Afek, or Dor.
      'Joppa': 'Tel Aviv-Jaffa', 'Antipatris': 'Petah Tikva', 'Dora': 'Haifa',
      'Lydda': 'Lod', 'Ascalon': 'Ashkelon', 'Azotus': 'Ashdod',
      'Beersheba': 'Be\'er Sheva', 'Oboda': 'Nitzana',
      'Kiryat Gat': 'Kiryat Gat', 'Beit Shemesh': 'Beit Shemesh',
      'Eilat': 'Eilat',
      // Beyond the armistice lines the pen reaches for the Bible's own map:
      // an Israel that absorbs the hill country writes the names the books
      // of Kings remember, not the ones the Ottoman surveys left behind.
      'Neapolis': 'Shechem', 'Sebaste': 'Shomron', 'Hebron': 'Hevron',
      'Jericho': 'Yeriho', 'Ptolemais': 'Akko',
    },
    // The Hashemite pen has one name it longs to write.
    JOR: { 'Jerusalem': 'Al-Quds' },
    // A UAR proclaimed over the Jordan writes the same Arabic (alias table).
    UAR: 'JOR',
  },

  // Population of 1948 (SPEC §24): the modern cities dwarf their ancient
  // selves; unlisted provinces keep the map's antique development.
  // No Temple stands in 1948 — only the Western Wall remains (SPEC §32).
  wonderTweaks: { Jerusalem: null },
  devTweaks: {
    'Joppa': { tax: 12, prod: 7, mp: 6 },         // Tel Aviv
    'Dora': { tax: 8, prod: 9, mp: 6 },           // Haifa & the port
    'Jerusalem': { tax: 9, prod: 6, mp: 6 },
    'Memphis': { tax: 14, prod: 11, mp: 10 },     // Cairo
    'Alexandria': { tax: 12, prod: 10, mp: 8 },
    'Seleucia-Ctesiphon': { tax: 11, prod: 9, mp: 8 }, // Baghdad
    'Damascus': { tax: 10, prod: 8, mp: 7 },
    'Beroea': { tax: 9, prod: 8, mp: 6 },         // Aleppo
    'Berytus': { tax: 9, prod: 9, mp: 5 },        // Beirut
    'Philadelphia': { tax: 6, prod: 5, mp: 5 },   // Amman
    'Charax': { tax: 7, prod: 7, mp: 5 },         // Basra
    'Gischala': { tax: 1, prod: 1, mp: 1 },       // Jish, no longer a Safed alias
    'Ptolemais': { tax: 4, prod: 4, mp: 3 },      // Acre
    'Scythopolis': { tax: 3, prod: 4, mp: 2 },    // Beit She'an & the valley
    'Caesarea Maritima': { tax: 3, prod: 3, mp: 2 },
    'Antipatris': { tax: 5, prod: 5, mp: 4 },     // Petah Tikva & the plain
    'Jamnia': { tax: 1, prod: 1, mp: 1 },
    'Emmaus': { tax: 1, prod: 1, mp: 1 },
    'Neapolis': { tax: 3, prod: 3, mp: 3 },       // Nablus
    'Sebaste': { tax: 1, prod: 1, mp: 1 },
    'Hebron': { tax: 2, prod: 2, mp: 2 },
    'Ascalon': { tax: 3, prod: 3, mp: 2 },        // Ashkelon
    'Oboda': { tax: 1, prod: 1, mp: 0 },          // Nitzana
    'Adora': { tax: 2, prod: 2, mp: 2 },          // Dura
    'Gaza': { tax: 2, prod: 2, mp: 2 },
    'Iconium': { tax: 8, prod: 7, mp: 7 },        // Konya
    'Tarsus': { tax: 7, prod: 7, mp: 6 },         // Adana plain
    'Ecbatana': { tax: 8, prod: 7, mp: 7 },       // Hamadan
    'Susa': { tax: 8, prod: 9, mp: 6 },           // Ahvaz & the oil
    // The following are subdivisions, not newly created wealth: their parent
    // province's old total is redistributed across the active modern cells.
    'Safed': { tax: 2, prod: 2, mp: 2 },
    'Nahariya': { tax: 1, prod: 1, mp: 1 },
    'Afula': { tax: 1, prod: 1, mp: 1 },
    'Hadera': { tax: 1, prod: 1, mp: 1 },
    'Netanya': { tax: 2, prod: 2, mp: 2 },
    'Herzliya': { tax: 2, prod: 2, mp: 1 },
    'Kfar Saba': { tax: 1, prod: 1, mp: 1 },
    'Rishon LeZion': { tax: 1, prod: 1, mp: 1 },
    'Rehovot': { tax: 1, prod: 1, mp: 1 },
    'Modi\'in Hills': { tax: 1, prod: 1, mp: 1 },
    'Jenin': { tax: 1, prod: 1, mp: 1 },
    'Tulkarm': { tax: 1, prod: 1, mp: 1 },
    'Qalqilya': { tax: 1, prod: 1, mp: 0 },
    'Ramallah': { tax: 1, prod: 1, mp: 1 },
    'Bethlehem': { tax: 1, prod: 1, mp: 1 },
    'Beit Shemesh': { tax: 1, prod: 1, mp: 1 },
    'Kiryat Gat': { tax: 1, prod: 1, mp: 1 },
    'Beersheba': { tax: 1, prod: 1, mp: 1 },
    'Arad': { tax: 1, prod: 1, mp: 1 },
    'Khan Yunis': { tax: 1, prod: 1, mp: 1 },
    'Rafah': { tax: 1, prod: 1, mp: 1 },
    'Dimona': { tax: 1, prod: 1, mp: 1 },
    'Mitzpe Ramon': { tax: 1, prod: 1, mp: 1 },
    'Paran': { tax: 1, prod: 1, mp: 0 },
    'Eilat': { tax: 1, prod: 1, mp: 1 },
    'Kiryat Shmona': { tax: 1, prod: 1, mp: 1 },
    'Azraq': { tax: 1, prod: 1, mp: 1 },
    'Rutba': { tax: 1, prod: 1, mp: 1 },
    'Kadesh Barnea': { tax: 1, prod: 1, mp: 1 },
    'Dizahab': { tax: 1, prod: 1, mp: 1 },
    'Zoara': { tax: 1, prod: 1, mp: 1 },
  },

  // Several familiar modern Israeli cities did not yet exist in May 1948.
  // Their land is sovereign and playable, but starts as frontier rather than
  // being back-filled with the population it gains later.
  //
  // The great desert interiors are wasteland no longer (SPEC §44): by 1948
  // they are administered territory with motor roads, pipelines and garrisons —
  // Egypt attacked through the Sinai and Operation Horev crossed back into it.
  // They open as sovereign frontier, passable but harsh (wasteland terrain
  // keeps its 2.5× movement cost and 5%/month attrition).
  habitation: {
    'Kadesh Barnea': 'frontier',
    'Dizahab': 'frontier',
    'Zoara': 'frontier',
    'Modi\'in Hills': 'frontier',
    'Beit Shemesh': 'frontier',
    'Kiryat Gat': 'frontier',
    'Arad': 'frontier',
    'Dimona': 'frontier',
    'Mitzpe Ramon': 'frontier',
    'Paran': 'frontier',
    'Eilat': 'frontier',
    'Azraq': 'frontier',
    'Rutba': 'frontier',
    'Sinai Interior': 'frontier',
    'Eastern Desert': 'frontier',
    'Libyan Desert': 'frontier',
    'Arabian Desert': 'frontier',
    'Syrian Desert': 'frontier',
  },
  // "Wasteland" is an ancient administrative absence, not a twentieth-century
  // terrain class. These remain harsh desert, but the province panel and
  // terrain map must no longer describe inhabited sovereign land as waste.
  terrains: {
    'Sinai Interior': 'desert',
    'Eastern Desert': 'desert',
    'Libyan Desert': 'desert',
    'Arabian Desert': 'desert',
    'Syrian Desert': 'desert',
  },
  impassable: {
    'Sinai Interior': false,
    'Eastern Desert': false,
    'Libyan Desert': false,
    'Arabian Desert': false,
    'Syrian Desert': false,
    // The sealed borders — no army enters Hoxha's Albania or the Soviet
    // Caucasus in this chapter. SPEC §173 gave these three their real owners
    // (ALB, SOV), so the map stops calling them nobody's; the impassable flag
    // is what "sealed" actually means, and it stays. The hatch over a
    // sovereign color now reads exactly right: somebody's, and shut.
    'Dyrrhachium': true,
    'Phasis': true,
    'Caucasian Albania': true,
  },
  // The sealed borders are closed frontiers, not colonizable waste (SPEC §64):
  // no expedition crosses into Albania or the Soviet Caucasus either.
  settleable: {
    'Dyrrhachium': false,
    'Phasis': false,
    'Caucasian Albania': false,
  },

  // The era's own way of coming apart (SPEC §98). A modern state does not run
  // on its own soil: it runs on fuel it imports, spare parts it buys, and
  // customs revenue from harbors somebody else's navy can close. Israel in
  // 1948 bought its rifles abroad and had two months of foreign currency; the
  // Arab states' war machines were fed through the same ports and the same
  // suppliers. The Closed Sea is what a blockade does to any of them.
  crises: [
    {
      id: 'closed_sea',
      name: 'The Closed Sea',
      applies(ctx, tag) {
        const t = ctx.game.tags[tag];
        return !!(t && t.alive && tag !== 'REB');
      },
      pressure(ctx, tag) {
        try {
          const list = (ctx.game.embargoes && Object.keys(ctx.game.embargoes)) || [];
          let letters = 0, blockade = false;
          for (const key of list) {
            const at = key.indexOf('>');
            if (at < 0 || key.slice(at + 1) !== tag) continue;
            const from = ctx.game.tags[key.slice(0, at)];
            if (!from || !from.alive) continue;
            letters++;
            if (ctx.game.embargoes[key] && ctx.game.embargoes[key].blockade) blockade = true;
          }
          if (!letters) return { delta: -10, cap: 100 };
          // Closed markets alone are an expensive nuisance: they brew to the
          // suppliers' regrets and stop there. What empties a modern state is
          // a coast somebody else's navy has closed.
          const delta = Math.min(6, letters * 2) + (blockade ? 8 : 0);
          return { delta, cap: blockade ? 100 : 45 };
        } catch (e) { return -10; }
      },
      stages: [
        {
          at: 34,
          name: 'The Suppliers Regret',
          label: 'Find other suppliers',
          desc: 'The letters are polite and the effect is not: licenses take months '
            + 'instead of days, the credit lines are "under review", and the parts '
            + 'that keep an air force flying are suddenly export-controlled. '
            + 'Everything the state buys now costs more and arrives later.',
          effects: { incomeMult: 0.94, reinforceMult: 0.92 },
        },
        {
          at: 67,
          name: 'The Harbors Go Quiet',
          label: 'Ration what lands',
          desc: 'The quays are full of cargo nobody will insure. Customs receipts '
            + 'collapse, the fuel is rationed by the week, and the transport pool is '
            + 'cannibalized for parts. A state that imports its war is discovering '
            + 'what that sentence means.',
          effects: { incomeMult: 0.85, reinforceMult: 0.85, moraleMult: 0.95, unrestAll: 0.75 },
        },
        {
          at: 100,
          name: 'A State on Two Months of Reserves',
          label: 'Then we buy time with anything we have',
          desc: 'The foreign currency is measured in weeks, the fuel in days of '
            + 'operations, and the armorers are rebuilding captured rifles because '
            + 'nothing new is coming. The war can continue exactly as long as the '
            + 'reserves do, and everyone in the cabinet now knows the number.',
          effects: {
            incomeMult: 0.7, reinforceMult: 0.75, moraleMult: 0.9,
            manpowerMult: 0.9, unrestAll: 1.5,
          },
        },
      ],
      resolvedText: 'the markets reopen and the harbors go back to work',
    },
  ],

  // What the era asks of you (SPEC §33) — shown in the realm panel.
  objectives: {
    ISR: [
      'Win: end the war holding 26+ provinces including Jerusalem and Eilat — the modern borders, from Dan to Eilat (the greater verdict) — or 21+ (the armistice lines).',
      'Air power decides late wars: airfields, wings, and bombing raids are yours from military tech 19.',
      'Lose: the state overrun in its first year.',
    ],
    JOR: [
      'Win: hold Jerusalem when the armistice comes (February 1949 on).',
      'Win: the West Bank secured by mid-1949.',
      'Lose: the Legion broken west of the river.',
    ],
  },
  // The court factions (SPEC §34): the realm's internal parties. The engine
  // ticks them for the human player alone; the AI keeps its politics offstage.
  factions: {
    ISR: [
      {
        id: 'coalition', name: 'The Coalition',
        desc: 'Mapai and the cabinet: the men and women who ran the Yishuv and now must run a state under fire.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.4 : -0.4; },
        boon: { name: 'A Government That Governs', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'Coalition Crisis', text: '−7% income', effects: { incomeMult: 0.93 } },
        appease: { label: 'Settle the portfolios (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Coalition Wants Order',
          text: 'The cabinet table is a front of its own: budgets unwritten, ministries improvised, '
            + 'and every party of the provisional council demanding its share of a state that is '
            + 'three weeks old. Give the machine its grease, or govern by decree and be resented for it.',
          grant: { label: 'Portfolios and budgets', cost: { gov: 50 } },
          refuse: { label: 'There is a war on', tooltip: 'The parties will remember when the votes are counted.' },
        },
      },
      {
        id: 'revisionists', name: 'The Revisionists',
        desc: 'The Irgun\'s fighters and their political heirs: one state, they agree — but whose?',
        drift(ctx, t) {
          const g = ctx.game;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.4 : -0.3;
        },
        boon: { name: 'The Fighting Family Enlists', text: '+10% manpower', effects: { manpowerMult: 1.1 } },
        bane: { name: 'One State, Two Armies', text: '+1.25 unrest everywhere', effects: { unrestAll: 1.25 } },
        appease: { label: 'Honor their dead (40 influence points)', cost: { infl: 40 } },
        demand: {
          title: 'The Revisionists Demand Their Place',
          text: 'Their battalions bled at Jaffa and their ship burned off Tel Aviv, and now they are '
            + 'asked to dissolve into an army commanded by the men who shelled it. They will wear the '
            + 'uniform — if the state will say aloud that they were soldiers all along.',
          grant: { label: 'Their units keep their names', cost: { infl: 50 } },
          refuse: { label: 'One army, one command', tooltip: 'The wound stays open.' },
        },
      },
      {
        id: 'kibbutzim', name: 'The Kibbutzim',
        desc: 'The border settlements and the Palmach they raised: the line the invasion broke against.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 5 ? 0.3 : -0.4; },
        boon: { name: 'The Settlements Hold the Line', text: '+15% reinforcement', effects: { reinforceMult: 1.15 } },
        bane: { name: 'The Settlements Look Inward', text: '−15% reinforcement', effects: { reinforceMult: 0.85 } },
        appease: { label: 'Arms for the border settlements (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Settlements Ask for Rifles',
          text: 'Negba and Yad Mordechai stopped tank columns with fence wire and grenades, and the '
            + 'survivors are asking where the Czech rifles went. The border holds where a kibbutz '
            + 'stands; it costs money to keep them standing.',
          grant: { label: 'Strip the depots for them', cost: { treasury: 120 } },
          refuse: { label: 'The brigades come first', tooltip: 'The fences stay wire.' },
        },
      },
    ],
    JOR: [
      {
        id: 'palace', name: 'The Palace',
        desc: 'The King\'s court at Amman: cautious, British-advised, and dreaming of Jerusalem.',
        drift(ctx, t) { return (t.stability || 0) >= 1 ? 0.4 : -0.4; },
        boon: { name: 'The Throne Secure', text: '+0.3 legitimacy a month', effects: { legitimacyAdd: 0.3 } },
        bane: { name: 'Whispers at Court', text: '−7% income', effects: { incomeMult: 0.93 } },
        appease: { label: 'The King\'s prerogative (40 governance points)', cost: { gov: 40 } },
        demand: {
          title: 'The Palace Wants Its Way',
          text: 'The King treats with whom he pleases — Cairo\'s newspapers and the League\'s '
            + 'resolutions notwithstanding. His ministers ask that the government act like it '
            + 'believes him.',
          grant: { label: 'The King decides alone', cost: { gov: 50 } },
          refuse: { label: 'The League must be managed', tooltip: 'The court sulks.' },
        },
      },
      {
        id: 'legion', name: 'The Arab Legion',
        desc: 'The one professional army in this war — small, drilled, and paid in sterling.',
        drift(ctx, t) {
          const g = ctx.game;
          if ((t.treasury || 0) < 0) return -0.7;
          return (t.atWarWith || []).some((e) => g.tags[e] && g.tags[e].alive) ? 0.4 : -0.2;
        },
        boon: { name: 'Glubb\'s Standards', text: '+5% discipline', effects: { disciplineMult: 1.05 } },
        bane: { name: 'Ammunition Counted in Rounds', text: '−6% morale', effects: { moraleMult: 0.94 } },
        appease: { label: 'Shells and sterling (100 talents)', cost: { treasury: 100 } },
        demand: {
          title: 'The Legion Counts Its Shells',
          text: 'The embargo starves the Legion of the 25-pounder shells that hold Latrun, and the '
            + 'quartermasters are issuing ammunition by the round. An army this small wins by being '
            + 'perfectly supplied — or it does not win.',
          grant: { label: 'Buy at any price', cost: { treasury: 150 } },
          refuse: { label: 'Husband what we hold', tooltip: 'The gunners ration their answers.' },
        },
      },
      {
        id: 'tribes', name: 'The Tribes',
        desc: 'The desert sheikhs whose sons fill the Legion\'s ranks and whose loyalty built the throne.',
        drift(ctx, t) { return (t.warExhaustion || 0) <= 5 ? 0.3 : -0.4; },
        boon: { name: 'The Tents Send Their Sons', text: '+10% manpower', effects: { manpowerMult: 1.1 } },
        bane: { name: 'The Tents Grow Cold', text: '+1 unrest everywhere', effects: { unrestAll: 1 } },
        appease: { label: 'Coffee and subsidies (80 talents)', cost: { treasury: 80 } },
        demand: {
          title: 'The Sheikhs Come to Amman',
          text: 'The subsidies that bound the desert to the throne have been eaten by the war, and '
            + 'the sheikhs sit in the majlis with long faces and longer memories. The Emir bought '
            + 'this kingdom with patience and gold; it is rented, never owned.',
          grant: { label: 'Open the King\'s hand', cost: { treasury: 120 } },
          refuse: { label: 'The war eats the gold', tooltip: 'The majlis empties early.' },
        },
      },
    ],
  },

  playableTags: [
    {
      tag: 'ISR',
      difficulty: 'Hard',
      blurb: 'Five armies, every border, no strategic depth and no second chances — but '
        + 'interior lines, total mobilization, and truces you can use better than your '
        + 'enemies. Hold everywhere at once until the Czech rifles land, then take the '
        + 'offensive one front at a time. The armistice lines you hold become the state.',
    },
  ],

  // Pre-existing works (SPEC §58): the ports and runways of May 1948 are
  // already built — nobody digs Haifa harbor after the Mandate ends.
  buildings: {
    'Dora': ['shipyard'],               // Haifa — the deep-water port
    'Alexandria': ['shipyard'],
    'Berytus': ['shipyard'],            // Beirut
    'Salamis': ['shipyard', 'airfield'], // Famagusta docks, RAF Nicosia
    'Joppa': ['airfield'],              // Sde Dov and the coastal strips
    'Memphis': ['airfield'],            // Cairo West
    'Damascus': ['airfield'],           // Mezzeh
    'Seleucia-Ctesiphon': ['airfield'], // Baghdad
    'Philadelphia': ['airfield'],       // RAF Marka, Amman
  },

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

    // --- The banner of the age (SPEC §68): the shared GRC emblem is the
    // laurel wreath of the ancient leagues, which is not what flew over
    // Athens in 1948. This era's Greece is the kingdom, under the nine
    // stripes and the cross.
    h.rebrandTag(ctx, 'GRC', { name: 'Kingdom of Greece', flag: 'GRC_MOD' });

    // --- Starting establishments (SPEC §58): the fleets and squadrons that
    // already exist at midnight — Israel's corvettes and first fighters included.
    h.spawnFleet(ctx, 'ISR', 'Dora', 3, { name: 'The Sea Corps' });
    h.spawnFleet(ctx, 'EGY', 'Alexandria', 5, { name: 'Egyptian Royal Fleet' });
    h.spawnFleet(ctx, 'UK', 'Salamis', 6, { name: 'Mediterranean Fleet' });
    h.spawnAirWing(ctx, 'ISR', 'Joppa', { name: '101 Squadron' });
    h.spawnAirWing(ctx, 'EGY', 'Memphis', { name: 'No. 2 Squadron REAF' });
    h.spawnAirWing(ctx, 'EGY', 'Memphis', { name: 'No. 5 Squadron REAF' });
    h.spawnAirWing(ctx, 'IRQ', 'Seleucia-Ctesiphon', { name: 'No. 7 Squadron RIrAF' });
    h.spawnAirWing(ctx, 'UK', 'Salamis', { name: 'No. 32 Squadron RAF' });

    // --- The invasion: one coalition war against the new state. ---
    h.declareWar(ctx, 'EGY', 'ISR', 'The War of Independence');
    try {
      const w = findWar(g, 'EGY', 'ISR');
      if (w) {
        w.noNegotiation = true; // the guns talk until Rhodes (ev_i_armistice unlocks)
        const arabSide = (w.attackers || []).indexOf('EGY') !== -1 ? w.attackers : w.defenders;
        for (const t of ['JOR', 'SYR', 'LEB', 'IRQ', 'SAU']) {
          if (g.tags[t] && arabSide.indexOf(t) === -1) arabSide.push(t);
          if (w.warscore && w.warscore[t] === undefined) w.warscore[t] = 0;
        }
        for (const t of ['JOR', 'SYR', 'LEB', 'IRQ', 'SAU']) {
          const tt = g.tags[t], isr = g.tags.ISR;
          if (tt && isr) {
            if (tt.atWarWith.indexOf('ISR') === -1) tt.atWarWith.push('ISR');
            if (isr.atWarWith.indexOf(t) === -1) isr.atWarWith.push(t);
          }
        }
      }
    } catch (e) { warnOnce('setup:war', e); }

    // --- Treasuries, manpower, stability. ---
    h.adjust(ctx, 'ISR', { treasury: 150, manpower: 8000, stability: 1, legitimacy: 40 });
    h.adjust(ctx, 'EGY', { treasury: 300, manpower: 15000, stability: 0, legitimacy: 50 });
    h.adjust(ctx, 'JOR', { treasury: 120, manpower: 4000, stability: 2, legitimacy: 60 });
    h.adjust(ctx, 'SYR', { treasury: 100, manpower: 6000, stability: -1 });
    h.adjust(ctx, 'LEB', { treasury: 100, manpower: 2000 });
    h.adjust(ctx, 'IRQ', { treasury: 150, manpower: 8000 });
    h.adjust(ctx, 'SAU', { treasury: 100, manpower: 2000 });

    // --- Opinions. ---
    for (const t of ['EGY', 'JOR', 'SYR', 'LEB', 'IRQ', 'SAU']) {
      setOpinion(g, t, 'ISR', -160);
      setOpinion(g, 'ISR', t, -140);
    }
    setOpinion(g, 'EGY', 'JOR', -40); setOpinion(g, 'JOR', 'EGY', -40); // rival ambitions
    setOpinion(g, 'UK', 'JOR', 100);  setOpinion(g, 'JOR', 'UK', 100);

    // --- Starting modifiers. ---
    h.addTagModifier(ctx, 'ISR', {
      id: 'ein_breira', name: 'Ein Breira — No Alternative', months: 24,
      effects: { moraleMult: 1.15, manpowerMult: 1.15 },
    });
    h.addTagModifier(ctx, 'EGY', {
      id: 'long_columns', name: 'Long Columns, Short Maps', months: 12,
      effects: { reinforceMult: 0.85 },
    });
    // The blockade: no heavy arms until the truce runs it through Prague.
    h.addTagModifier(ctx, 'ISR', {
      id: 'arms_embargo', name: 'The Embargo', months: 2,
      effects: { disciplineMult: 0.9 },
    });

    // --- Starting armies (brigades wear their real names). ---
    h.spawnArmy(ctx, 'ISR', 'Ptolemais', {
      inf: 3, name: 'Carmeli Brigade',
      general: { name: 'Moshe Carmel', fire: 2, shock: 2, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'ISR', 'Tiberias', { inf: 3, name: 'Golani Brigade' });
    h.spawnArmy(ctx, 'ISR', 'Antipatris', { inf: 3, name: 'Alexandroni Brigade' });
    h.spawnArmy(ctx, 'ISR', 'Jamnia', {
      inf: 3, name: 'Givati Brigade',
      general: { name: 'Shimon Avidan', fire: 2, shock: 3, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'ISR', 'Jerusalem', {
      inf: 2, name: 'Etzioni Brigade',
      general: { name: 'David Shaltiel', fire: 2, shock: 1, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'ISR', 'Safed', {
      inf: 2, cav: 1, name: 'Palmach Yiftach', // Operation Yiftach's ground: Safed and the eastern Galilee
      general: { name: 'Yigal Allon', fire: 2, shock: 3, maneuver: 4 },
    });

    h.spawnArmy(ctx, 'EGY', 'Gaza', {
      inf: 5, cav: 1, name: 'Egyptian Expeditionary Force',
      general: { name: 'Ahmed Ali al-Mwawi', fire: 1, shock: 2, maneuver: 1 },
    });
    h.spawnArmy(ctx, 'EGY', 'Rhinocolura', { inf: 3, name: 'Sinai Reserve' });
    h.spawnArmy(ctx, 'EGY', 'Memphis', { inf: 4, name: 'Home Army' });

    h.spawnArmy(ctx, 'JOR', 'Jericho', {
      inf: 3, cav: 1, name: 'Arab Legion, 1st Brigade',
      general: { name: 'Habis Majali', fire: 3, shock: 3, maneuver: 3 },
    });
    h.spawnArmy(ctx, 'JOR', 'Emmaus', {
      inf: 2, name: 'Arab Legion, 4th Regiment',
      general: { name: 'Abdullah el-Tell', fire: 2, shock: 3, maneuver: 2 },
    });

    h.spawnArmy(ctx, 'SYR', 'Caesarea Philippi', { inf: 3, cav: 1, name: 'Syrian 1st Brigade' });
    h.spawnArmy(ctx, 'SYR', 'Damascus', { inf: 3, name: 'Damascus Garrison' });
    h.spawnArmy(ctx, 'LEB', 'Tyre', { inf: 2, name: 'Lebanese Column' });
    // The pocket has defenders: the ALA's Yarmouk battalions hold Nazareth
    // until Dekel — Kaukji himself returns by event (ev_i_kaukji).
    h.spawnArmy(ctx, 'LEB', 'Sepphoris', { inf: 2, name: 'First Yarmouk Regiment' });
    h.spawnArmy(ctx, 'IRQ', 'Neapolis', {
      inf: 4, name: 'Iraqi Expeditionary Force',
      general: { name: 'Taha al-Hashimi', fire: 1, shock: 2, maneuver: 2 },
    });
    h.spawnArmy(ctx, 'IRQ', 'Seleucia-Ctesiphon', { inf: 3, name: 'Baghdad Garrison' });
    h.spawnArmy(ctx, 'SAU', 'Hegra', { inf: 1, name: 'Hejaz Volunteers' });
    h.spawnArmy(ctx, 'TUR', 'Iconium', { inf: 5, name: 'Second Army' });
    h.spawnArmy(ctx, 'IRN', 'Ecbatana', { inf: 3, name: 'Imperial Guard' });
    h.spawnArmy(ctx, 'UK', 'Salamis', { inf: 2, name: 'Cyprus Garrison' });

    h.notify(ctx, {
      title: 'The War of Independence',
      text: 'The Mandate has ended, the State is declared, and five armies are across '
        + 'the borders by morning.',
      type: 'war', provName: 'Joppa',
    });
  },

  // Cabinets and courts of May 1948.
  rulers: {
    ISR: { name: 'David Ben-Gurion', title: 'Prime Minister', gov: 5, infl: 4, mar: 3, age: 61 },
    EGY: { name: 'Farouk I', title: 'King', gov: 1, infl: 3, mar: 1, age: 28 },
    JOR: { name: 'Abdullah I', title: 'King', gov: 3, infl: 4, mar: 3, age: 66 },
    SYR: { name: 'Shukri al-Quwatli', title: 'President', gov: 2, infl: 3, mar: 1, age: 56 },
    LEB: { name: 'Bechara El Khoury', title: 'President', gov: 3, infl: 3, mar: 0, age: 57 },
    IRQ: { name: 'Abd al-Ilah', title: 'Regent', gov: 2, infl: 2, mar: 2, age: 35 },
    SAU: { name: 'Ibn Saud', title: 'King', gov: 3, infl: 4, mar: 3, age: 73 },
    TUR: { name: 'İsmet İnönü', title: 'President', gov: 4, infl: 3, mar: 3, age: 63 },
    IRN: { name: 'Mohammad Reza Pahlavi', title: 'Shah', gov: 2, infl: 3, mar: 2, age: 28 },
    UK: { name: 'Clement Attlee', title: 'Prime Minister', gov: 4, infl: 3, mar: 2, age: 65 },
    ITA: { name: 'Alcide De Gasperi', title: 'Prime Minister', gov: 4, infl: 3, mar: 1, age: 67 },
    // The political west (SPEC §173): the governments of 15 May 1948, to the
    // week. Wilhelmina abdicates in September with Juliana named; Gottwald
    // has held Prague since February; Tildy has until July; Dimitrov has a
    // year to live and Stalin has five.
    FRA: { name: 'Vincent Auriol', title: 'President', gov: 3, infl: 3, mar: 2, age: 63 },
    SPA: { name: 'Francisco Franco', title: 'Caudillo', gov: 3, infl: 2, mar: 3, age: 55 },
    POR: { name: 'António de Oliveira Salazar', title: 'President of the Council', gov: 4, infl: 2, mar: 1, age: 59 },
    NLD: { name: 'Wilhelmina', title: 'Queen', gov: 3, infl: 3, mar: 1, age: 67,
      heir: { name: 'Juliana', gov: 3, infl: 3, mar: 1, age: 39 } },
    DEN: { name: 'Frederik IX', title: 'King', gov: 2, infl: 2, mar: 2, age: 48 },
    SWE: { name: 'Gustaf V', title: 'King', gov: 2, infl: 2, mar: 1, age: 89,
      heir: { name: 'Gustaf VI Adolf', gov: 3, infl: 3, mar: 1, age: 65 } },
    SUI: { name: 'Enrico Celio', title: 'President of the Confederation', gov: 3, infl: 2, mar: 1, age: 59 },
    IRL: { name: 'John A. Costello', title: 'Taoiseach', gov: 3, infl: 3, mar: 1, age: 56 },
    GER: { name: 'The Control Council', title: 'Occupation Authority', gov: 2, infl: 1, mar: 0, age: 50 },
    AUT: { name: 'Karl Renner', title: 'President', gov: 4, infl: 3, mar: 0, age: 77 },
    POL: { name: 'Bolesław Bierut', title: 'President', gov: 2, infl: 2, mar: 1, age: 56 },
    CZE: { name: 'Klement Gottwald', title: 'President', gov: 2, infl: 3, mar: 1, age: 51 },
    HUN: { name: 'Zoltán Tildy', title: 'President', gov: 2, infl: 2, mar: 1, age: 58 },
    YUG: { name: 'Josip Broz Tito', title: 'Marshal', gov: 4, infl: 4, mar: 4, age: 56 },
    ALB: { name: 'Enver Hoxha', title: 'General Secretary', gov: 2, infl: 2, mar: 2, age: 39 },
    BUL: { name: 'Georgi Dimitrov', title: 'Chairman', gov: 3, infl: 3, mar: 1, age: 66 },
    ROU: { name: 'Petru Groza', title: 'President of the Council', gov: 2, infl: 3, mar: 1, age: 64 },
    SOV: { name: 'Joseph Stalin', title: 'General Secretary', gov: 4, infl: 5, mar: 3, age: 69 },
  },

  missions: {
    ISR: [
      {
        id: 'i_plain', name: 'Hold the Plain',
        desc: 'Keep the coastal spine: Joppa, Caesarea Maritima and Ptolemais.',
        rewardText: '+25 martial points.',
        check: (ctx) => ['Joppa', 'Caesarea Maritima', 'Ptolemais'].every((n) => ctx.helpers.controls(ctx, 'ISR', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISR', { mar: 25 }),
      },
      {
        id: 'i_jerusalem_road', name: 'The Road to Jerusalem',
        desc: 'Open the corridor: take Emmaus — Latrun — or build past it.',
        rewardText: '"The Burma Road": Jerusalem −2 unrest for 24 months.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ISR', 'Emmaus'),
        reward: (ctx) => ctx.helpers.addProvinceModifier(ctx, 'Jerusalem', {
          id: 'burma_road', name: 'The Road Open', months: 24, effects: { unrest: -2 },
        }),
      },
      {
        id: 'i_galilee', name: 'Galilee Whole',
        desc: 'Take Sepphoris and Gischala — Operations Dekel and Hiram.',
        rewardText: '+2,000 manpower (the northern villages mobilize).',
        check: (ctx) => ctx.helpers.controls(ctx, 'ISR', 'Sepphoris') && ctx.helpers.controls(ctx, 'ISR', 'Gischala'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISR', { manpower: 2000 }),
      },
      {
        id: 'i_yoav', name: 'Open the South',
        desc: 'Break the Egyptian line: take Ascalon.',
        rewardText: '+25 martial points, +10 legitimacy.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ISR', 'Ascalon'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISR', { mar: 25, legitimacy: 10 }),
      },
      {
        id: 'i_eilat', name: 'The Ink Flag',
        desc: 'Reach the Red Sea: take Aila — Eilat — and the state has two seas.',
        rewardText: '+15 legitimacy, +50 talents.',
        check: (ctx) => ctx.helpers.controls(ctx, 'ISR', 'Aila'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'ISR', { legitimacy: 15, treasury: 50 }),
      },
    ],
    JOR: [
      {
        id: 'jr_latrun', name: 'Latrun Holds',
        desc: 'Keep Emmaus — the police fort commands the road, and the Legion holds forts.',
        rewardText: '+25 martial points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JOR', 'Emmaus') && dateGE(ctx.game.date, 1948, 8),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JOR', { mar: 25 }),
      },
      {
        id: 'jr_oldcity', name: 'The Old City',
        desc: 'Take Jerusalem — the King must pray where his father could not.',
        rewardText: '+20 legitimacy, +25 influence points.',
        check: (ctx) => ctx.helpers.controls(ctx, 'JOR', 'Jerusalem'),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JOR', { legitimacy: 20, infl: 25 }),
      },
      {
        id: 'jr_westbank', name: 'The Hill Country',
        desc: 'Hold the West Bank whole: Neapolis, Hebron and Jericho.',
        rewardText: '+1 stability.',
        check: (ctx) => ['Neapolis', 'Hebron', 'Jericho'].every((n) => ctx.helpers.controls(ctx, 'JOR', n)),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JOR', { stability: 1 }),
      },
      {
        id: 'jr_solvent', name: 'A Kingdom Solvent',
        desc: 'End 1948 with a positive treasury — the Legion is paid in sterling.',
        rewardText: '+50 talents (London approves).',
        check: (ctx) => dateGE(ctx.game.date, 1949, 1)
          && ((ctx.game.tags[who(ctx, 'JOR')] || {}).treasury || 0) > 0,
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JOR', { treasury: 50 }),
      },
      {
        id: 'jr_armistice', name: 'Something to Show',
        desc: 'Reach 1949 holding Jerusalem or the whole hill country.',
        rewardText: '+25 legitimacy — the only Arab crown the war made heavier.',
        check: (ctx) => dateGE(ctx.game.date, 1949, 2)
          && (ctx.helpers.controls(ctx, 'JOR', 'Jerusalem')
            || ['Neapolis', 'Hebron', 'Jericho'].every((n) => ctx.helpers.controls(ctx, 'JOR', n))),
        reward: (ctx) => ctx.helpers.adjust(ctx, 'JOR', { legitimacy: 25 }),
      },
    ],
  },

  aiHints: {
    ISR: { rally: ['Joppa', 'Tiberias'], targetRegiments: 22, threatRearm: true, threatShare: 0.55, maxThreatRegiments: 34 },
    EGY: { rally: ['Gaza', 'Memphis'], targetRegiments: 20, threatRearm: true, threatShare: 0.85, maxThreatRegiments: 28 },
    JOR: { rally: ['Jericho'], targetRegiments: 10, threatRearm: true, threatShare: 0.75, maxThreatRegiments: 16 },
    SYR: { rally: ['Damascus'], targetRegiments: 10, threatRearm: true, threatShare: 0.75, maxThreatRegiments: 16 },
    LEB: { rally: ['Berytus'], targetRegiments: 4, threatRearm: true, threatShare: 0.25, maxThreatRegiments: 6 },
    IRQ: { rally: ['Neapolis'], targetRegiments: 10, threatRearm: true, threatShare: 0.75, maxThreatRegiments: 16 },
    SAU: { rally: ['Hegra'], targetRegiments: 2, threatRearm: true, threatShare: 0.2, maxThreatRegiments: 4 },
    TUR: { rally: ['Iconium'], targetRegiments: 10 },
    IRN: { rally: ['Ecbatana'], targetRegiments: 4 },
    UK: { rally: ['Salamis'], targetRegiments: 2 },
    REB: { rally: [], targetRegiments: 0 },
  },

  checkVictory(ctx) {
    try {
      const g = ctx.game;
      const h = ctx.helpers;
      if (!g || g.over || g.result) return;

      const isrTag = g.tags && g.tags[who(ctx, 'ISR')];
      const isrAlive = !!(isrTag && isrTag.alive !== false);
      const isrProvs = isrAlive ? h.countControlled(ctx, 'ISR', {}) : 0;
      const warOver = !findWar(g, 'EGY', 'ISR');

      if (g.playerTag === who(ctx, 'ISR')) {
        if (warOver && dateGE(g.date, 1949, 1) && isrProvs >= 26
            && h.controls(ctx, 'ISR', 'Jerusalem') && h.controls(ctx, 'ISR', 'Eilat')) {
          h.endGame(ctx, {
            result: 'win',
            title: 'From Dan to Eilat',
            text: 'The armistice lines are drawn where your soldiers stand — and they '
              + 'stand everywhere the state needs them: the plain, the Galilee, '
              + 'Jerusalem, and the Negev down to the Red Sea. The war of survival is '
              + 'won; the age of building begins.',
            score: 200,
          });
          return;
        }
        if (warOver && dateGE(g.date, 1949, 1) && isrProvs >= 21) {
          h.endGame(ctx, {
            result: 'win',
            title: 'Independence',
            text: 'It cost one percent of everyone, and the map is smaller than the '
              + 'dream — but the state declared in a museum hall has survived five '
              + 'armies, and the armistice signatures make it a fact of the world.',
            score: 150,
          });
          return;
        }
        if (!isrAlive || (isrProvs < 7 && dateGE(g.date, 1948, 9))) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The State Strangled',
            text: 'The plain is cut, the roads are closed, and the declaration read in '
              + 'Tel Aviv becomes one more document in the archive of things that '
              + 'almost were.',
            score: 0,
          });
          return;
        }
      } else if (g.playerTag === who(ctx, 'JOR')) {
        if (dateGE(g.date, 1949, 2) && h.controls(ctx, 'JOR', 'Jerusalem')
            && ['Neapolis', 'Hebron', 'Jericho'].every((n) => h.controls(ctx, 'JOR', n))) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The King of Jerusalem',
            text: 'The Legion holds the Old City and the whole hill country; every other '
              + 'Arab army holds excuses. The Hashemite crown is the only one this war '
              + 'made heavier.',
            score: 200,
          });
          return;
        }
        if (dateGE(g.date, 1949, 6)
            && ['Neapolis', 'Hebron', 'Jericho'].every((n) => h.controls(ctx, 'JOR', n))) {
          h.endGame(ctx, {
            result: 'win',
            title: 'The West Bank',
            text: 'The Legion kept what the Legion could hold — the hill country is '
              + 'Hashemite, annexed with British blessing and Arab fury.',
            score: 130,
          });
          return;
        }
        if (!g.tags[who(ctx, 'JOR')].alive || !h.controls(ctx, 'JOR', 'Philadelphia')) {
          h.endGame(ctx, {
            result: 'loss',
            title: 'The Throne Undone',
            text: 'Amman itself is lost, and with it the kingdom the Emir built out of '
              + 'desert and subsidy.',
            score: 0,
          });
          return;
        }
      }
    } catch (e) { warnOnce('checkVictory', e); }
  },
};
