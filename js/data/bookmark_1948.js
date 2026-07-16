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

function findWar(game, a, b) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf(a) !== -1 && all.indexOf(b) !== -1) return w;
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
  'Tiberias', 'Tarichaea', 'Jotapata', 'Sepphoris',
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
const LEB_LANDS = ['Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis', 'Gischala', 'Chalcis'];
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
// v5.4: the sealed borders of 1948 — Hoxha's Albania and the Soviet Caucasus
// are closed frontiers, not playfields: no one crosses, no one owns.
OWNERS['Dyrrhachium'] = 'WASTE';
OWNERS['Phasis'] = 'WASTE';
OWNERS['Caucasian Albania'] = 'WASTE';

// ---- faiths and tongues, nineteen centuries on -------------------------------
const RELIGIONS = {};
const CULTURES = {};
for (const n of JOR_LANDS.concat(EGY_LANDS, SYR_LANDS, IRQ_LANDS, TUR_LANDS, SAU_LANDS, IRN_LANDS)) {
  RELIGIONS[n] = 'islam';
}
for (const n of ISR_LANDS) RELIGIONS[n] = 'judaism';
for (const n of ['Tyre', 'Sidon', 'Gischala', 'Chalcis']) RELIGIONS[n] = 'islam';
for (const n of ['Berytus', 'Byblos', 'Tripolis']) RELIGIONS[n] = 'christianity';
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
  startDate: { y: 1948, m: 5, d: 15 },
  // Technology of the age (SPEC §22): rifle brigades and armored corps.
  techBase: 19,
  techTweaks: { JOR: { mar: 1 }, UK: { mar: 1 }, ISR: { infl: 1 } },

  blurb: 'At midnight the Mandate ended; at four in the afternoon, in the Tel Aviv '
    + 'museum, the State of Israel was declared; by morning the armies of Egypt, '
    + 'Transjordan, Syria, Lebanon and Iraq were across the borders. Eighteen and a '
    + 'half centuries after Betar fell, there is again a Jewish state — for exactly as '
    + 'long as it can defend itself.',

  activeTags: ['ISR', 'EGY', 'JOR', 'SYR', 'LEB', 'IRQ', 'SAU', 'TUR', 'IRN', 'UK', 'GRC', 'ITA'],
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
  mechanics: { conversion: false },

  // Black gold (SPEC §52): the age's prize goods. Kirkuk behind Arbela,
  // Abadan and Khuzestan behind Susa, the al-Hasa fields behind Gerrha —
  // the wells that paid for the region's armies.
  goods: { Arbela: 'oil', Susa: 'oil', Gerrha: 'oil' },

  // The map speaks 1948 (SPEC §24): canonical names stay the content keys;
  // these are what the labels, panels and toasts show.
  provinceNames: {
    'Joppa': 'Tel Aviv-Jaffa', 'Antipatris': 'Petah Tikva', 'Dora': 'Haifa',
    'Ptolemais': 'Acre', 'Caesarea Maritima': 'Caesarea', 'Jamnia': 'Yavne',
    'Lydda': 'Lod', 'Emmaus': 'Latrun',
    'Sepphoris': 'Nazareth', 'Jotapata': 'Yodfat', 'Tarichaea': 'Migdal',
    'Gischala': 'Jish', 'Scythopolis': 'Beit She\'an', 'Engaddi': 'Ein Gedi',
    'Ascalon': 'Ashkelon', 'Azotus': 'Ashdod', 'Neapolis': 'Nablus',
    'Sebaste': 'Samaria', 'Adora': 'Dura', 'Gadora': 'Salt', 'Machaerus': 'Karak',
    'Medaba': 'Madaba', 'Philadelphia': 'Amman', 'Gerasa': 'Jerash',
    'Gadara': 'Irbid', 'Aila': 'Aqaba', 'Oboda': 'Nitzana',
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
    'Tayma': 'Tayma', 'Petra': 'Ma\'an', 'Beersheba': 'Be\'er Sheva',
    'Syene': 'Aswan', 'Paraetonium': 'Marsa Matruh', 'Marmarica': 'Tobruk',
    'Cyrene': 'Derna', 'Yathrib': 'Medina', 'Gerrha': 'Dammam',
    'Persepolis': 'Shiraz', 'Gabae': 'Isfahan', 'Halicarnassus': 'Bodrum',
    'Gortyn': 'Heraklion',
    // v5.4: the wider frame in its 1948 names
    'Roma': 'Rome', 'Capua': 'Naples', 'Tarentum': 'Taranto',
    'Brundisium': 'Brindisi', 'Rhegium': 'Reggio Calabria',
    'Panormus': 'Palermo', 'Syracusae': 'Syracuse',
    'Oea': 'Tripoli (Libya)', 'Leptis Magna': 'Al-Khums', 'Macomades': 'Sirte',
    'Thessalonica': 'Salonika', 'Hadrianopolis': 'Edirne',
    'Byzantion': 'Istanbul', 'Nicaea': 'Bursa', 'Smyrna': 'İzmir',
    'Ancyra': 'Ankara', 'Sinope': 'Sinop', 'Trapezus': 'Trabzon',
    'Hyrcania': 'Mazandaran',
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
  impassable: {
    'Sinai Interior': false,
    'Eastern Desert': false,
    'Libyan Desert': false,
    'Arabian Desert': false,
    'Syrian Desert': false,
    // v5.4: the sealed borders — no army enters Hoxha's Albania or the
    // Soviet Caucasus in this chapter.
    'Dyrrhachium': true,
    'Phasis': true,
    'Caucasian Albania': true,
  },

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

  setup(ctx) {
    const g = ctx.game;
    const h = ctx.helpers;
    if (g.flags && g.flags._bookmarkSetupRan) return;
    if (g.flags) g.flags._bookmarkSetupRan = true;

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
    h.spawnArmy(ctx, 'ISR', 'Jotapata', {
      inf: 2, cav: 1, name: 'Palmach Yiftach',
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
        check: (ctx) => dateGE(ctx.game.date, 1949, 1) && (ctx.game.tags.JOR.treasury || 0) > 0,
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

      const isrTag = g.tags && g.tags.ISR;
      const isrAlive = !!(isrTag && isrTag.alive !== false);
      const isrProvs = isrAlive ? h.countControlled(ctx, 'ISR', {}) : 0;
      const warOver = !findWar(g, 'EGY', 'ISR');

      if (g.playerTag === 'ISR') {
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
      } else if (g.playerTag === 'JOR') {
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
        if (!g.tags.JOR.alive || !h.controls(ctx, 'JOR', 'Philadelphia')) {
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
