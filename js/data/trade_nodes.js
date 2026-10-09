// js/data/trade_nodes.js — the markets of the world (SPEC §292). DOM-free.
//
// EU4's trade, in the ancient world's geography. Every province belongs to one
// market (a node). A node's value is what its provinces produce, plus what
// flows into it from the nodes upstream. The goods of the east and the south
// (incense out of Arabia, India's cargoes landed at Charax and on the Red
// Sea, Egypt's grain) run downstream toward the Mediterranean, and Rome, at
// the end of every road, keeps what reaches it.
//
//   center   the market town, where merchants post themselves; a coastal
//            center takes merchant ships, every center takes caravans
//   to       the nodes downstream (the graph has no cycles)
//   members  the provinces placed by hand, by name; every other province
//            joins the node whose center is nearest (js/sim/trade.js)
//   offmap   talents a month of goods that enter here from beyond the map:
//            India's cargoes at Charax and on the monsoon to Arabia, silk down
//            the steppe roads, ivory and gold out of Africa. This is what made
//            the caravan cities rich, and what a lane carries past them.
//
// The Levant, where the chapters are fought, is placed province by province;
// the far west and north are left to the nearest center.

export const TRADE_NODES = [
  // ---- the sources: east and south ---------------------------------------
  {
    id: 'transoxiana', name: 'Transoxiana', center: 'Antiochia Margiana', to: ['persia'], offmap: 5,
    blurb: 'The steppe roads out of the far east, horses and silk at Merv.',
    members: ['Chorasmia', 'Massagetae', 'Dahae', 'Karakum', 'Kyzylkum', 'Nisa', 'Artacoana', 'Issedones'],
  },
  {
    id: 'persia', name: 'Persis', center: 'Ecbatana', to: ['mesopotamia'],
    blurb: 'The plateau: the royal road down from the Zagros to the rivers.',
    members: ['Persepolis', 'Gabae', 'Carmana', 'Hecatompylos', 'Hyrcania', 'Dasht-e Kavir', 'Dasht-e Lut', 'Zranka', 'Phrada', 'Gazaca'],
  },
  {
    id: 'gulf', name: 'Charax', center: 'Charax', to: ['mesopotamia'], offmap: 8,
    blurb: 'India\'s cargoes, landed at the head of the Gulf.',
    members: ['Amara', 'Susa', 'Gerrha', 'Yamama', 'Mazun', 'Omana', 'Harmozeia', 'Tis', 'Pura', 'Makuran'],
  },
  {
    id: 'arabia', name: 'Arabia Felix', center: 'Eudaemon Arabia', to: ['red_sea', 'hejaz'], offmap: 10,
    blurb: 'Frankincense and myrrh, and the monsoon ships from India.',
    members: ['Marib', 'Zafar', 'Muza', 'Shabwa', 'Najran', 'Asir', 'Moscha', 'Dioscurida', 'Rub al-Khali'],
  },
  {
    id: 'horn', name: 'Adulis', center: 'Adulis', to: ['red_sea'], offmap: 4,
    blurb: 'Ivory and gold from Aksum, the cinnamon coast beyond.',
    members: ['Aksum', 'Avalites', 'Malao', 'Opone', 'Danakil', 'Ogaden', 'Azania', 'Tana', 'Shewa', 'Kaffa'],
  },
  {
    id: 'nubia', name: 'Meroe', center: 'Meroe', to: ['egypt'], offmap: 2,
    blurb: 'Kush: gold, ebony and the river road north.',
    members: ['Napata', 'Soba', 'Dodekaschoinos', 'Nubian Desert', 'Noba', 'Syene', 'Blemmyae'],
  },
  {
    id: 'hejaz', name: 'Hegra', center: 'Hegra', to: ['petra'],
    blurb: 'The incense road\'s wells, from Yathrib to Dedan.',
    members: ['Dedan', 'Tayma', 'Yathrib', 'Khaybar', 'Macoraba', 'Dumatha', 'Arabian Desert'],
  },
  {
    id: 'armenia', name: 'Armenia', center: 'Tigranocerta', to: ['antioch', 'pontus'],
    blurb: 'The highland passes between the rivers and the Black Sea.',
    members: ['Sophene', 'Amida', 'Melitene', 'Caucasian Albania', 'Phasis'],
  },
  // ---- the middle ----------------------------------------------------------
  {
    id: 'mesopotamia', name: 'Seleucia', center: 'Seleucia-Ctesiphon', to: ['palmyra', 'antioch'],
    blurb: 'The twin cities on the Tigris, where the east is weighed.',
    members: ['Babylon', 'Nehardea', 'Uruk', 'Assur', 'Hatra', 'Nineveh', 'Arbela', 'Kirkuk', 'Sulaymaniyah',
      'Baquba', 'Ramadi', 'Najaf', 'Kut', 'Samawa', 'Singara', 'Nisibis', 'Nukhayb'],
  },
  {
    id: 'palmyra', name: 'Palmyra', center: 'Palmyra', to: ['damascus', 'antioch'],
    blurb: 'The caravan city that stitched Rome to Parthia.',
    members: ['Dura-Europos', 'Syrian Desert', 'Rusafa', 'Ruwayshid', 'Rutba', 'Hasakah'],
  },
  {
    id: 'red_sea', name: 'The Red Sea', center: 'Myos Hormos', to: ['egypt', 'petra'],
    blurb: 'The Erythraean ports, the long haul to the Nile.',
    members: ['Berenice', 'Aila', 'Eilat', 'Dizahab', 'Eastern Desert', 'Thebes'],
  },
  {
    id: 'petra', name: 'Petra', center: 'Petra', to: ['judaea', 'damascus'],
    blurb: 'The Nabataean toll-gate on the incense road.',
    members: ['Oboda', 'Elusa', 'Paran', 'Mitzpe Ramon', 'Kadesh Barnea', 'Shobak', 'Wadi Rum', 'Auara', 'Zoara',
      'Characmoba', 'Medaba', 'Sinai Interior', 'Sirhan'],
  },
  {
    id: 'damascus', name: 'Damascus', center: 'Damascus', to: ['tyre', 'judaea'],
    blurb: 'The oasis market of the Decapolis and the Hauran.',
    members: ['Chalcis', 'Heliopolis', 'Emesa', 'Batanea', 'Bostra', 'Suwayda', 'Gerasa', 'Pella', 'Gadara', 'Gamala',
      'Philadelphia', 'Caesarea Philippi', 'Quneitra', 'Mount Hermon', 'Douma', 'Zarqa', 'Mafraq', 'Azraq',
      'Qusayr', 'Kiryat Shmona'],
  },
  {
    id: 'judaea', name: 'Joppa', center: 'Joppa', to: ['egypt', 'tyre'],
    blurb: 'Judaea\'s harbor, and the coast road from Gaza to Caesarea.',
    members: ['Jerusalem', 'Jericho', 'Emmaus', 'Lydda', 'Masada', 'Engaddi', 'Gadora', 'Machaerus', 'Esbus',
      'Sepphoris', 'Jotapata', 'Tiberias', 'Tarichaea', 'Gischala', 'Safed', 'Afula', 'Scythopolis',
      'Gaza', 'Ascalon', 'Azotus', 'Jamnia', 'Hebron', 'Adora', 'Sebaste', 'Neapolis', 'Antipatris',
      'Caesarea Maritima', 'Rhinocolura', 'Hadera', 'Netanya', 'Herzliya', 'Kfar Saba', 'Rishon LeZion', 'Rehovot',
      'Modi\'in Hills', 'Jenin', 'Tulkarm', 'Qalqilya', 'Ramallah', 'Bethlehem', 'Beit Shemesh', 'Kiryat Gat',
      'Beersheba', 'Arad', 'Khan Yunis', 'Rafah', 'Dimona'],
  },
  {
    id: 'tyre', name: 'Tyre', center: 'Tyre', to: ['egypt', 'aegean'],
    blurb: 'Purple, glass and cedar: the Phoenician coast and Cyprus.',
    members: ['Sidon', 'Berytus', 'Byblos', 'Tripolis', 'Aradus', 'Ptolemais', 'Dora', 'Nahariya', 'Ma\'alot',
      'Nabatieh', 'Chouf', 'Jounieh', 'Batroun', 'Bsharri', 'Akkar', 'Salamis', 'Paphos'],
  },
  {
    id: 'antioch', name: 'Antioch', center: 'Antioch', to: ['aegean'],
    blurb: 'The Orontes and the Cilician gates.',
    members: ['Seleucia Pieria', 'Laodicea', 'Apamea', 'Beroea', 'Cyrrhus', 'Zeugma', 'Samosata', 'Edessa', 'Carrhae',
      'Idlib', 'Manbij', 'Salamiyah', 'Tarsus', 'Seleucia Trachea'],
  },
  {
    id: 'anatolia', name: 'Ancyra', center: 'Ancyra', to: ['byzantion', 'aegean'],
    blurb: 'The plateau: wool, horses and the road to the Straits.',
    members: ['Iconium', 'Tyana', 'Caesarea Mazaca', 'Pisidia', 'Attalia'],
  },
  {
    id: 'pontus', name: 'The Pontus', center: 'Panticapaeum', to: ['byzantion'],
    blurb: 'Black Sea grain, fish and slaves for the cities of the south.',
    members: ['Sinope', 'Trapezus', 'Chersonesus', 'Tomis', 'Olbia', 'Tyras', 'Tanais', 'Phanagoria', 'Tauria',
      'Scythia', 'Sarmatia', 'Borysthenia', 'Roxolania'],
  },
  {
    id: 'balkans', name: 'The Danube', center: 'Serdica', to: ['byzantion'],
    blurb: 'The river frontier, its mines and its legions.',
    members: ['Sirmium', 'Singidunum', 'Naissus', 'Philippopolis', 'Novae', 'Sarmizegetusa', 'Napoca', 'Aquincum', 'Carnuntum', 'Siscia'],
  },
  {
    id: 'byzantion', name: 'Byzantion', center: 'Byzantion', to: ['aegean'],
    blurb: 'The city on the Straits, where the Black Sea pays its toll.',
    members: ['Nicaea', 'Hadrianopolis'],
  },
  {
    id: 'egypt', name: 'Alexandria', center: 'Alexandria', to: ['rome', 'aegean'],
    blurb: 'Grain, glass and papyrus, and the Pharos over all of it.',
    members: ['Athribis', 'Leontopolis', 'Memphis', 'Arsinoe', 'Oxyrhynchus', 'Pelusium', 'Paraetonium', 'Libyan Desert'],
  },
  {
    id: 'aegean', name: 'Rhodes', center: 'Rhodes', to: ['rome'],
    blurb: 'The islands, the Greek cities, and the banks of Delos.',
    members: ['Athens', 'Corinth', 'Sparta', 'Gortyn', 'Halicarnassus', 'Smyrna', 'Thessalonica', 'Dyrrhachium'],
  },
  {
    id: 'cyrene', name: 'Cyrene', center: 'Cyrene', to: ['rome'],
    blurb: 'Silphium and grain on the Libyan shore.',
    members: ['Marmarica', 'Macomades', 'Leptis Magna', 'Oea', 'Garama'],
  },
  {
    id: 'africa', name: 'Carthage', center: 'Carthago', to: ['rome'],
    blurb: 'The Punic harbor and the wheat of the Bagradas.',
    members: ['Hadrumetum', 'Thysdrus', 'Tacape', 'Capsa', 'Theveste', 'Hippo Regius', 'Cirta'],
  },
  {
    id: 'hispania', name: 'Gades', center: 'Gades', to: ['rome'],
    blurb: 'Tarshish: silver and tin at the end of the sea.',
    members: ['Hispalis', 'Corduba', 'Malaca', 'Carthago Nova', 'Tingis', 'Volubilis'],
  },
  {
    id: 'gaul', name: 'Massilia', center: 'Massilia', to: ['rome'],
    blurb: 'The Rhône road: wine up the river, tin and amber down it.',
    members: ['Narbo', 'Nemausus', 'Lugdunum'],
  },
  // ---- the end of every road ----------------------------------------------
  {
    id: 'rome', name: 'Rome', center: 'Roma', to: [],
    blurb: 'The City, which keeps whatever reaches it.',
    members: ['Capua', 'Tarentum', 'Brundisium', 'Rhegium', 'Panormus', 'Syracusae', 'Ravenna', 'Ancona', 'Aquileia',
      'Pisae', 'Genua', 'Bononia', 'Mediolanum', 'Aleria', 'Caralis', 'Turris Libisonis', 'Salona'],
  },
];

export const TRADE_NODE_BY_ID = Object.fromEntries(TRADE_NODES.map((n) => [n.id, n]));

// Where the roads end, by age. The graph above is the Roman one: everything
// runs to the City. The Iron Age's emporium was Tyre, which sent to Tarshish
// for silver and took the incense of Gaza and the grain of Egypt; from the
// fourth century the capital of the world was on the Bosphorus; in 1948 the
// roads meet at the Canal. An age only
// re-points the lanes it needs to; every other lane is as above.
const AGE_LANES = {
  tyre: {
    tyre: [], egypt: ['tyre'], aegean: ['tyre'], antioch: ['tyre'], rome: ['aegean'],
    africa: ['tyre'], hispania: ['africa'], cyrene: ['egypt'], gaul: ['rome'],
  },
  byzantion: {
    byzantion: [], aegean: ['byzantion'], egypt: ['aegean'], rome: ['aegean'], cyrene: ['egypt'],
  },
  // 1948: the Canal. What passes between east and west pays its dues at the
  // Suez end of the Delta.
  suez: {
    egypt: [], rome: ['aegean'], aegean: ['egypt'], cyrene: ['egypt'], africa: ['rome'],
    hispania: ['rome'], gaul: ['rome'],
  },
};
const AGE_BY_BOOKMARK = {
  '931bce': 'tyre', '732bce': 'tyre', '597bce': 'tyre',
  '351ce': 'byzantion', '529ce': 'byzantion', '614ce': 'byzantion',
  '1948ce': 'suez',
};
export function tradeAgeOf(bookmarkId) { return AGE_BY_BOOKMARK[bookmarkId] || 'rome'; }

// The trade graph of an age: lanes out of each node, the order to run them
// (upstream first) and what each node can still flow into. Cached.
const _graphs = {};
export function tradeGraph(age) {
  const key = AGE_LANES[age] ? age : 'rome';
  if (_graphs[key]) return _graphs[key];
  const over = AGE_LANES[key] || {};
  const to = {};
  for (const n of TRADE_NODES) to[n.id] = (over[n.id] || n.to).slice();
  const into = new Map(TRADE_NODES.map((n) => [n.id, 0]));
  for (const id in to) for (const t of to[id]) into.set(t, into.get(t) + 1);
  const ready = TRADE_NODES.filter((n) => !into.get(n.id)).map((n) => n.id);
  const order = [];
  while (ready.length) {
    const id = ready.shift();
    order.push(id);
    for (const t of to[id]) {
      into.set(t, into.get(t) - 1);
      if (!into.get(t)) ready.push(t);
    }
  }
  const reach = {};
  for (const id of [...order].reverse()) {
    const r = new Set();
    for (const t of to[id]) { r.add(t); for (const x of reach[t] || []) r.add(x); }
    reach[id] = r;
  }
  const sinks = TRADE_NODES.filter((n) => !to[n.id].length).map((n) => n.id);
  // order is shorter than the node list if an age's lanes made a cycle (smoke202 checks)
  _graphs[key] = { age: key, to, order, reach, sinks };
  return _graphs[key];
}
