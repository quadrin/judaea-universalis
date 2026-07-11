// js/data/map_data.js — Judaea Universalis: Eastern Mediterranean & Near East, 66 CE.
// Owns MAP_DATA (SPEC §2, §4) and validateMapData(). DOM-free, zero imports.
// Frame: lon 29–50°E, lat 25.5–38.5°N. Equirectangular, y=0 at north.

const MAP_W = 2048;
const MAP_H = 1496;
const LON0 = 29.0;
const LON1 = 50.0;
const LAT0 = 25.5;
const LAT1 = 38.5;

function project(lon, lat) {
  return [
    ((lon - LON0) / (LON1 - LON0)) * MAP_W,
    ((LAT1 - lat) / (LAT1 - LAT0)) * MAP_H,
  ];
}

// ---------------------------------------------------------------------------
// Coastline. One mainland polygon (clockwise from the Lycian coast at the west
// edge), plus Cyprus. Water = Mediterranean, Gulf of Suez, Gulf of Aqaba,
// Red Sea, and the head of the Persian Gulf (66 CE shoreline, near Charax).
// ---------------------------------------------------------------------------

const MAINLAND = [
  // Anatolian south coast, west edge -> east (Lycia, Pamphylia, Cilicia)
  [29.00, 36.62], [29.12, 36.67], [29.35, 36.50], [29.48, 36.32], [29.62, 36.20],
  [29.80, 36.16], [29.95, 36.20], [30.12, 36.28], [30.30, 36.30], [30.48, 36.22],
  [30.58, 36.55], [30.68, 36.72], [30.73, 36.85],                 // Gulf of Antalya head
  [30.92, 36.86], [31.10, 36.83], [31.35, 36.75], [31.55, 36.68], [31.98, 36.55],
  [32.30, 36.42], [32.55, 36.28], [32.85, 36.03],                 // Cape Anamur
  [33.10, 36.08], [33.30, 36.10], [33.55, 36.14], [33.70, 36.18], [33.95, 36.26],
  [34.15, 36.32], [34.38, 36.45], [34.55, 36.58], [34.75, 36.72], [34.90, 36.77],
  [35.10, 36.70], [35.35, 36.58], [35.40, 36.57],                 // Cilician plain, Karataş
  [35.65, 36.62], [35.90, 36.75], [36.10, 36.80], [36.22, 36.83], // Gulf of Issus head
  [36.18, 36.58],                                                  // Issus / Alexandria ad Issum
  [36.05, 36.45], [35.95, 36.35], [35.82, 36.27],                 // Ras al-Khanzir
  [35.93, 36.05],                                                  // Orontes mouth, Seleucia Pieria
  [35.86, 35.85], [35.80, 35.68], [35.78, 35.52],                 // Laodicea
  [35.86, 35.35], [35.92, 35.18], [35.87, 34.88],                 // Baniyas, Tartus (Aradus)
  [35.86, 34.65], [35.83, 34.44],                                 // Tripolis
  [35.72, 34.26], [35.64, 34.12],                                 // Byblos
  [35.55, 34.00], [35.47, 33.90],                                 // Berytus headland
  [35.40, 33.72], [35.37, 33.56],                                 // Sidon
  [35.26, 33.40], [35.20, 33.27],                                 // Tyre
  [35.10, 33.09],                                                 // Ras Naqoura
  [35.07, 32.93],                                                 // Ptolemais (Acre)
  [35.04, 32.82], [34.96, 32.83],                                 // Bay of Haifa; Carmel headland
  [34.93, 32.72], [34.92, 32.62],                                 // Dora
  [34.88, 32.50],                                                 // Caesarea Maritima
  [34.80, 32.28], [34.74, 32.05],                                 // Joppa
  [34.66, 31.88], [34.55, 31.67],                                 // Ascalon
  [34.43, 31.52],                                                 // Gaza
  [34.20, 31.30], [33.80, 31.15], [33.45, 31.10], [33.20, 31.08], [32.90, 31.05],
  [32.60, 31.06],                                                 // Pelusium
  [32.25, 31.13], [32.00, 31.30], [31.85, 31.52],                 // Damietta promontory
  [31.60, 31.55], [31.45, 31.56], [31.20, 31.60], [31.00, 31.58], [30.70, 31.55],
  [30.38, 31.46],                                                 // Rosetta mouth
  [30.05, 31.28], [29.85, 31.20],                                 // Canopus, Alexandria
  [29.50, 31.02], [29.00, 30.92],                                 // to the west edge
  // Frame: west edge down, south edge east to the Red Sea shore
  [29.00, 25.50], [34.55, 25.50],
  // Egyptian Red Sea coast, northward
  [34.30, 26.10], [34.10, 26.40], [33.95, 26.70], [33.85, 27.25], [33.55, 27.80],
  [33.30, 28.10], [33.10, 28.35], [32.85, 28.85], [32.65, 29.35], [32.58, 29.70],
  [32.55, 29.95],                                                 // head of the Gulf of Suez
  // Sinai west coast, southward
  [32.78, 29.60], [32.98, 29.15], [33.22, 28.70], [33.60, 28.28], [33.95, 27.98],
  [34.25, 27.73],                                                 // Ras Muhammad (Sinai tip)
  // Gulf of Aqaba west shore, northward
  [34.42, 28.05], [34.52, 28.50], [34.66, 28.95], [34.82, 29.30],
  [34.95, 29.55],                                                 // head of the Gulf of Aqaba (Aila)
  // Aqaba east shore, southward, then the Arabian Red Sea coast
  [35.00, 29.32], [34.90, 28.90], [34.80, 28.45], [34.78, 28.05],
  [35.15, 27.55], [35.55, 27.30], [36.10, 26.55], [36.50, 26.10], [36.90, 25.55],
  [36.95, 25.50],
  // Frame: south edge east to the corner, up the east edge to the Gulf coast
  [50.00, 25.50], [50.00, 26.45],
  // Arabian shore of the Persian Gulf, northwestward
  [49.55, 27.00], [49.05, 27.55], [48.70, 28.10], [48.45, 28.70], [48.15, 29.15],
  [47.95, 29.35], [47.70, 29.45], [47.85, 29.65],                 // Kuwait Bay
  [47.70, 30.10], [47.60, 30.55],                                 // head of the Gulf (66 CE, near Charax)
  // Elamite / Persian shore, southeastward to the east edge
  [48.00, 30.45], [48.50, 30.25], [49.00, 30.10], [49.50, 30.00], [50.00, 29.90],
  // Frame: east edge up, top edge west (back to start via the west edge)
  [50.00, 38.50], [29.00, 38.50],
];

const CYPRUS = [
  [32.28, 35.06], [32.35, 34.88], [32.42, 34.74],                 // Akamas, Paphos
  [32.75, 34.62], [33.02, 34.56],                                 // Kourion, Akrotiri
  [33.18, 34.70], [33.62, 34.80], [33.65, 34.95],                 // Kiti, Larnaca
  [34.05, 34.97],                                                 // Cape Greco
  [33.98, 35.15],                                                 // Famagusta bay (Salamis)
  [34.30, 35.40], [34.60, 35.68],                                 // Karpass, Cape Andreas
  [34.35, 35.55], [33.90, 35.40], [33.50, 35.35], [33.00, 35.37],
  [32.93, 35.40],                                                 // Cape Kormakitis
  [32.70, 35.18], [32.45, 35.15],                                 // Morphou bay
];

const LAKES = [
  // Dead Sea
  [
    [35.45, 31.76], [35.55, 31.70], [35.58, 31.45], [35.62, 31.25],
    [35.50, 31.10], [35.42, 31.20], [35.40, 31.46], [35.42, 31.62],
  ],
  // Sea of Galilee
  [
    [35.54, 32.88], [35.62, 32.86], [35.65, 32.75], [35.60, 32.70],
    [35.55, 32.72], [35.52, 32.78], [35.52, 32.84],
  ],
  // Lake Van (clipped by the top edge)
  [
    [42.30, 38.50], [43.35, 38.50], [43.30, 38.25], [42.90, 38.15], [42.45, 38.28],
  ],
  // Lake Urmia (clipped by the top edge)
  [
    [45.05, 37.70], [45.35, 38.20], [45.90, 38.25], [45.85, 37.50], [45.40, 37.15], [45.10, 37.30],
  ],
];

// ---------------------------------------------------------------------------
// Rivers (downstream point order; widths 1-3).
// ---------------------------------------------------------------------------

const RIVERS = [
  {
    name: 'Nile', width: 3,
    points: [
      [32.60, 25.50], [32.64, 25.72], [32.72, 26.19], [32.24, 26.05], [31.70, 26.56],
      [31.18, 27.18], [30.75, 28.10], [31.10, 29.07], [31.25, 29.85], [31.20, 30.20],
    ],
  },
  {
    name: 'Nile (Rosetta arm)', width: 2,
    points: [[31.20, 30.20], [30.95, 30.55], [30.60, 30.95], [30.42, 31.30], [30.38, 31.46]],
  },
  {
    name: 'Nile (Damietta arm)', width: 2,
    points: [[31.20, 30.20], [31.45, 30.62], [31.68, 31.05], [31.82, 31.40], [31.85, 31.52]],
  },
  {
    name: 'Jordan', width: 1,
    points: [
      [35.62, 33.25], [35.61, 33.05], [35.59, 32.90], [35.57, 32.71], [35.50, 32.50],
      [35.55, 32.30], [35.49, 32.10], [35.53, 31.95], [35.47, 31.80],
    ],
  },
  {
    name: 'Litani', width: 1,
    points: [[36.20, 33.85], [36.00, 33.60], [35.80, 33.40], [35.60, 33.32], [35.40, 33.30], [35.25, 33.34]],
  },
  {
    name: 'Orontes', width: 2,
    points: [
      [36.30, 33.95], [36.55, 34.35], [36.70, 34.73], [36.75, 35.13], [36.40, 35.42],
      [36.35, 35.90], [36.16, 36.20], [36.05, 36.15], [35.93, 36.06],
    ],
  },
  {
    name: 'Euphrates', width: 3,
    points: [
      [38.55, 38.50], [38.52, 37.95], [38.60, 37.55], [38.20, 37.25], [37.87, 37.06],
      [38.00, 36.83], [38.40, 36.50], [39.00, 35.95], [39.60, 35.65], [40.15, 35.33],
      [40.73, 34.75], [41.30, 34.55], [41.95, 34.37], [42.83, 33.64], [43.55, 33.40],
      [44.10, 33.10], [44.42, 32.54], [44.70, 31.90], [45.60, 31.30], [46.40, 31.00],
      [47.10, 30.95], [47.45, 30.95], [47.60, 30.60],
    ],
  },
  {
    name: 'Tigris', width: 3,
    points: [
      [40.20, 38.50], [40.23, 37.91], [40.90, 37.65], [41.80, 37.50], [42.35, 37.30],
      [42.70, 36.85], [43.15, 36.35], [43.30, 35.90], [43.26, 35.45], [43.70, 34.60],
      [43.87, 34.20], [44.35, 33.60], [44.58, 33.09], [45.30, 32.70], [45.85, 32.40],
      [46.60, 32.05], [47.15, 31.85], [47.43, 31.05], [47.60, 30.60],
    ],
  },
  {
    name: 'Khabur', width: 1,
    points: [[40.05, 36.85], [40.40, 36.50], [40.70, 36.00], [40.60, 35.55], [40.45, 35.17]],
  },
];

// ---------------------------------------------------------------------------
// Provinces. id = index + 1. 100 entries (95 canonical + wastelands, 4 fillers
// within the allowed budget: Seleucia Trachea, Caesarea Mazaca, Susa, Gazaca).
// ---------------------------------------------------------------------------

function P(name, lon, lat, weight, owner, terrain, good, religion, culture,
  tax, prod, mp, fort, extra) {
  const p = {
    name, lon, lat, weight, terrain, good, religion, culture,
    dev: { tax, prod, mp },
    owner, fort: fort || 0,
    holy: null, wonder: null, impassable: false,
  };
  if (extra) {
    if (extra.holy) p.holy = extra.holy;
    if (extra.wonder) p.wonder = extra.wonder;
    if (extra.impassable) p.impassable = true;
  }
  return p;
}

const PROVINCES = [
  // --- Judaea (JUD) -------------------------------------------------------
  P('Jerusalem', 35.23, 31.78, 0.70, 'JUD', 'hills', 'wine', 'judaism', 'judean', 8, 6, 8, 3,
    { holy: 'temple_mount', wonder: 'temple' }),
  P('Jericho', 35.45, 31.86, 0.70, 'JUD', 'drylands', 'balsam', 'judaism', 'judean', 4, 5, 3, 0),
  P('Emmaus', 34.99, 31.84, 0.75, 'JUD', 'hills', 'olive_oil', 'judaism', 'judean', 3, 3, 3, 0),
  P('Lydda', 34.89, 31.95, 0.75, 'JUD', 'farmland', 'grain', 'judaism', 'judean', 4, 4, 3, 0),
  P('Joppa', 34.80, 32.03, 0.75, 'JUD', 'coast', 'fish', 'judaism', 'judean', 4, 4, 3, 0),
  P('Masada', 35.35, 31.31, 1.00, 'JUD', 'desert', 'salt', 'judaism', 'judean', 1, 1, 2, 3),
  P('Engaddi', 35.36, 31.45, 0.80, 'JUD', 'desert', 'balsam', 'judaism', 'judean', 2, 3, 1, 0),
  P('Gadora', 35.70, 32.03, 0.90, 'JUD', 'hills', 'livestock', 'judaism', 'judean', 3, 3, 3, 0),
  P('Machaerus', 35.63, 31.56, 0.90, 'JUD', 'desert', 'salt', 'judaism', 'judean', 1, 1, 2, 2),
  P('Sepphoris', 35.28, 32.75, 0.75, 'JUD', 'hills', 'grain', 'judaism', 'galilean', 5, 4, 4, 0),
  P('Jotapata', 35.28, 32.85, 0.70, 'JUD', 'hills', 'olive_oil', 'judaism', 'galilean', 3, 3, 3, 2),
  P('Tiberias', 35.49, 32.77, 0.70, 'JUD', 'coast', 'fish', 'judaism', 'galilean', 4, 4, 3, 0),
  P('Tarichaea', 35.50, 32.87, 0.70, 'JUD', 'coast', 'fish', 'judaism', 'galilean', 3, 4, 3, 0),
  P('Gischala', 35.45, 33.02, 0.75, 'JUD', 'hills', 'olive_oil', 'judaism', 'galilean', 3, 3, 3, 0),
  // --- Judea region under Rome (ROM) --------------------------------------
  P('Gaza', 34.50, 31.48, 0.85, 'ROM', 'coast', 'incense', 'hellenism', 'greek', 4, 5, 3, 0),
  P('Ascalon', 34.62, 31.65, 0.75, 'ROM', 'coast', 'wine', 'hellenism', 'greek', 4, 4, 3, 0),
  P('Azotus', 34.70, 31.78, 0.75, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 3, 3, 2, 0),
  P('Jamnia', 34.75, 31.87, 0.75, 'ROM', 'farmland', 'grain', 'judaism', 'judean', 3, 3, 3, 0),
  P('Hebron', 35.10, 31.53, 0.85, 'ROM', 'hills', 'livestock', 'judaism', 'judean', 3, 3, 3, 0),
  P('Adora', 34.95, 31.40, 0.95, 'ROM', 'hills', 'livestock', 'judaism', 'idumean', 3, 3, 3, 0),
  P('Sebaste', 35.19, 32.28, 0.80, 'ROM', 'hills', 'wine', 'hellenism', 'greek', 4, 4, 3, 0),
  P('Neapolis', 35.27, 32.22, 0.75, 'ROM', 'hills', 'olive_oil', 'samaritanism', 'samaritan', 4, 4, 4, 0,
    { holy: 'gerizim' }),
  P('Antipatris', 34.93, 32.10, 0.75, 'ROM', 'farmland', 'grain', 'judaism', 'judean', 3, 4, 3, 0),
  P('Caesarea Maritima', 34.94, 32.49, 0.75, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 6, 7, 4, 0),
  P('Dora', 34.98, 32.62, 0.75, 'ROM', 'coast', 'purple_dye', 'hellenism', 'phoenician', 3, 4, 2, 0),
  P('Ptolemais', 35.11, 32.91, 0.75, 'ROM', 'coast', 'glass', 'hellenism', 'phoenician', 4, 5, 3, 0),
  P('Scythopolis', 35.50, 32.50, 0.80, 'ROM', 'farmland', 'grain', 'hellenism', 'greek', 4, 5, 3, 0),
  P('Pella', 35.61, 32.45, 0.80, 'ROM', 'hills', 'wine', 'hellenism', 'greek', 3, 3, 3, 0),
  P('Gadara', 35.68, 32.65, 0.85, 'ROM', 'hills', 'olive_oil', 'hellenism', 'greek', 4, 4, 3, 0),
  P('Gerasa', 35.89, 32.28, 0.90, 'ROM', 'hills', 'wine', 'hellenism', 'greek', 4, 4, 3, 0),
  P('Philadelphia', 35.93, 31.95, 1.00, 'ROM', 'drylands', 'livestock', 'hellenism', 'greek', 3, 4, 3, 0),
  // --- Kingdom of Agrippa II (AGR) -----------------------------------------
  P('Caesarea Philippi', 35.69, 33.25, 0.80, 'AGR', 'hills', 'livestock', 'hellenism', 'aramean', 4, 4, 3, 0),
  P('Batanea', 36.25, 32.90, 1.10, 'AGR', 'farmland', 'grain', 'judaism', 'galilean', 3, 4, 4, 0),
  P('Gamala', 35.74, 32.90, 0.75, 'AGR', 'hills', 'olive_oil', 'judaism', 'galilean', 3, 3, 3, 2),
  // --- Phoenicia (ROM) ------------------------------------------------------
  P('Tyre', 35.25, 33.26, 0.75, 'ROM', 'coast', 'purple_dye', 'hellenism', 'phoenician', 5, 8, 3, 0),
  P('Sidon', 35.42, 33.56, 0.75, 'ROM', 'coast', 'glass', 'hellenism', 'phoenician', 4, 6, 3, 0),
  P('Berytus', 35.53, 33.88, 0.75, 'ROM', 'coast', 'timber', 'hellenism', 'phoenician', 4, 5, 3, 0),
  P('Byblos', 35.70, 34.11, 0.75, 'ROM', 'coast', 'timber', 'hellenism', 'phoenician', 3, 4, 2, 0),
  P('Tripolis', 35.90, 34.42, 0.80, 'ROM', 'coast', 'fish', 'hellenism', 'phoenician', 3, 4, 2, 0),
  P('Aradus', 35.97, 34.85, 0.85, 'ROM', 'coast', 'fish', 'hellenism', 'phoenician', 3, 4, 2, 0),
  // --- Syria & Anatolia (ROM) ----------------------------------------------
  P('Damascus', 36.30, 33.51, 0.90, 'ROM', 'drylands', 'grain', 'hellenism', 'aramean', 6, 7, 5, 0),
  P('Chalcis', 35.93, 33.73, 0.85, 'ROM', 'hills', 'wine', 'hellenism', 'aramean', 3, 3, 3, 0),
  P('Emesa', 36.72, 34.73, 1.00, 'ROM', 'drylands', 'grain', 'hellenism', 'aramean', 4, 4, 4, 0),
  P('Apamea', 36.40, 35.42, 0.90, 'ROM', 'farmland', 'grain', 'hellenism', 'greek', 4, 5, 4, 0),
  P('Antioch', 36.16, 36.20, 0.75, 'ROM', 'farmland', 'grain', 'hellenism', 'greek', 9, 10, 6, 2),
  P('Seleucia Pieria', 35.98, 36.10, 0.70, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 3, 5, 2, 0),
  P('Laodicea', 35.86, 35.51, 0.85, 'ROM', 'coast', 'wine', 'hellenism', 'greek', 4, 5, 3, 0),
  P('Beroea', 37.16, 36.20, 1.00, 'ROM', 'drylands', 'olive_oil', 'hellenism', 'aramean', 4, 4, 4, 0),
  P('Cyrrhus', 36.95, 36.75, 0.90, 'ROM', 'hills', 'livestock', 'hellenism', 'greek', 3, 3, 3, 0),
  P('Palmyra', 38.27, 34.55, 1.60, 'ROM', 'desert', 'spices', 'hellenism', 'aramean', 4, 7, 2, 0),
  P('Zeugma', 37.87, 37.06, 0.90, 'ROM', 'hills', 'grain', 'hellenism', 'greek', 3, 3, 3, 0),
  P('Samosata', 38.60, 37.55, 0.95, 'ROM', 'hills', 'wine', 'hellenism', 'aramean', 3, 3, 3, 0),
  P('Tarsus', 34.90, 36.95, 0.85, 'ROM', 'farmland', 'silver', 'hellenism', 'greek', 5, 6, 4, 0),
  P('Melitene', 38.30, 38.35, 1.10, 'ROM', 'mountains', 'livestock', 'hellenism', 'armenian', 3, 3, 3, 0),
  P('Iconium', 32.49, 37.87, 1.50, 'ROM', 'steppe', 'livestock', 'hellenism', 'greek', 3, 3, 3, 0),
  P('Tyana', 34.61, 37.84, 1.30, 'ROM', 'steppe', 'livestock', 'hellenism', 'greek', 2, 3, 3, 0),
  P('Pisidia', 30.55, 37.70, 1.40, 'ROM', 'mountains', 'timber', 'hellenism', 'greek', 2, 3, 3, 0),
  P('Attalia', 30.75, 36.95, 0.90, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 3, 4, 2, 0),
  P('Seleucia Trachea', 33.95, 36.42, 1.20, 'ROM', 'hills', 'timber', 'hellenism', 'greek', 2, 3, 2, 0),
  P('Caesarea Mazaca', 35.45, 38.20, 1.40, 'ROM', 'steppe', 'livestock', 'hellenism', 'greek', 3, 3, 3, 0),
  // --- Egypt (ROM) ----------------------------------------------------------
  P('Pelusium', 32.62, 30.95, 1.00, 'ROM', 'coast', 'salt', 'egyptian', 'egyptian', 3, 4, 2, 0),
  P('Rhinocolura', 33.85, 31.05, 1.20, 'ROM', 'desert', 'fish', 'egyptian', 'egyptian', 1, 2, 1, 0),
  P('Alexandria', 29.95, 31.10, 0.75, 'ROM', 'coast', 'glass', 'hellenism', 'greek', 10, 12, 6, 2,
    { wonder: 'library' }),
  P('Athribis', 31.19, 30.47, 0.90, 'ROM', 'farmland', 'grain', 'egyptian', 'egyptian', 4, 5, 3, 0),
  P('Leontopolis', 31.32, 30.29, 0.85, 'ROM', 'farmland', 'grain', 'judaism', 'judean', 4, 4, 3, 0),
  P('Memphis', 31.25, 29.85, 0.90, 'ROM', 'farmland', 'papyrus', 'egyptian', 'egyptian', 5, 6, 4, 0),
  P('Arsinoe', 30.85, 29.30, 1.00, 'ROM', 'farmland', 'grain', 'egyptian', 'egyptian', 4, 5, 3, 0),
  P('Oxyrhynchus', 30.65, 28.55, 1.10, 'ROM', 'farmland', 'papyrus', 'egyptian', 'egyptian', 3, 4, 3, 0),
  P('Thebes', 32.64, 25.72, 1.30, 'ROM', 'drylands', 'grain', 'egyptian', 'egyptian', 3, 4, 3, 0),
  P('Myos Hormos', 34.15, 26.20, 1.20, 'ROM', 'desert', 'spices', 'egyptian', 'egyptian', 1, 3, 1, 0),
  // --- Cyprus (ROM) ---------------------------------------------------------
  P('Salamis', 33.75, 35.12, 0.90, 'ROM', 'coast', 'timber', 'hellenism', 'greek', 4, 5, 3, 0),
  P('Paphos', 32.60, 34.85, 0.90, 'ROM', 'coast', 'wine', 'hellenism', 'greek', 3, 4, 2, 0),
  // --- Nabataea (NAB) -------------------------------------------------------
  P('Petra', 35.44, 30.32, 1.20, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 4, 8, 3, 2,
    { wonder: 'petra' }),
  P('Bostra', 36.48, 32.52, 1.10, 'NAB', 'drylands', 'grain', 'nabataean', 'nabataean', 3, 4, 3, 0),
  P('Oboda', 34.78, 30.79, 1.30, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 1, 3, 1, 0),
  P('Aila', 35.08, 29.62, 1.30, 'NAB', 'desert', 'spices', 'nabataean', 'nabataean', 2, 4, 1, 0),
  P('Hegra', 37.95, 26.80, 1.80, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 2, 3, 1, 0),
  P('Dumatha', 39.87, 29.80, 2.00, 'NAB', 'desert', 'livestock', 'nabataean', 'arab', 1, 2, 1, 0),
  P('Medaba', 35.80, 31.72, 0.95, 'NAB', 'drylands', 'livestock', 'nabataean', 'nabataean', 2, 3, 2, 0),
  // --- Parthia & the east (PAR) --------------------------------------------
  P('Edessa', 38.79, 37.16, 0.95, 'PAR', 'hills', 'grain', 'hellenism', 'aramean', 4, 5, 4, 0),
  P('Carrhae', 39.03, 36.87, 1.00, 'PAR', 'drylands', 'grain', 'hellenism', 'aramean', 3, 3, 3, 0),
  P('Nisibis', 41.22, 37.07, 1.10, 'PAR', 'drylands', 'grain', 'zoroastrianism', 'aramean', 4, 5, 4, 0),
  P('Singara', 41.85, 36.33, 1.20, 'PAR', 'drylands', 'livestock', 'zoroastrianism', 'aramean', 2, 3, 2, 0),
  P('Hatra', 42.72, 35.59, 1.50, 'PAR', 'desert', 'livestock', 'hellenism', 'aramean', 2, 3, 2, 0),
  P('Arbela', 44.01, 36.19, 1.10, 'PAR', 'hills', 'grain', 'judaism', 'aramean', 4, 4, 4, 0),
  P('Seleucia-Ctesiphon', 44.58, 33.10, 0.85, 'PAR', 'farmland', 'grain', 'zoroastrianism', 'aramean', 8, 9, 6, 2),
  P('Babylon', 44.42, 32.54, 0.90, 'PAR', 'farmland', 'dates', 'hellenism', 'aramean', 5, 6, 4, 0),
  P('Nehardea', 44.20, 33.37, 0.90, 'PAR', 'farmland', 'dates', 'judaism', 'judean', 4, 5, 4, 0),
  P('Charax', 47.55, 30.75, 1.00, 'PAR', 'marsh', 'spices', 'hellenism', 'arab', 3, 6, 2, 0),
  P('Ecbatana', 48.52, 34.80, 1.50, 'PAR', 'mountains', 'silver', 'zoroastrianism', 'persian', 5, 5, 4, 0),
  P('Dura-Europos', 40.73, 34.75, 1.20, 'PAR', 'drylands', 'grain', 'hellenism', 'aramean', 3, 3, 3, 1),
  P('Susa', 48.25, 32.19, 1.30, 'PAR', 'farmland', 'grain', 'zoroastrianism', 'persian', 5, 5, 4, 0),
  P('Gazaca', 47.00, 36.70, 1.60, 'PAR', 'mountains', 'livestock', 'zoroastrianism', 'persian', 3, 3, 3, 0),
  // --- Armenia (ARM) --------------------------------------------------------
  P('Tigranocerta', 41.01, 38.14, 1.20, 'ARM', 'mountains', 'livestock', 'zoroastrianism', 'armenian', 4, 4, 4, 2),
  P('Sophene', 39.30, 38.25, 1.30, 'ARM', 'mountains', 'livestock', 'zoroastrianism', 'armenian', 2, 3, 3, 0),
  // --- Wastelands (WASTE, impassable) --------------------------------------
  P('Syrian Desert', 39.50, 33.30, 2.20, 'WASTE', 'wasteland', 'salt', 'nabataean', 'arab', 1, 1, 1, 0,
    { impassable: true }),
  P('Arabian Desert', 40.50, 27.50, 2.20, 'WASTE', 'wasteland', 'livestock', 'nabataean', 'arab', 1, 1, 1, 0,
    { impassable: true }),
  P('Sinai Interior', 33.80, 29.50, 1.80, 'WASTE', 'wasteland', 'salt', 'nabataean', 'arab', 1, 1, 1, 0,
    { impassable: true }),
  P('Eastern Desert', 32.80, 27.50, 1.80, 'WASTE', 'wasteland', 'salt', 'egyptian', 'egyptian', 1, 1, 1, 0,
    { impassable: true }),
  P('Libyan Desert', 29.80, 28.50, 2.00, 'WASTE', 'wasteland', 'salt', 'egyptian', 'egyptian', 1, 1, 1, 0,
    { impassable: true }),
];

// ---------------------------------------------------------------------------
// Height primitives (renderer; all coords lon/lat). 21 entries (max 24).
// ---------------------------------------------------------------------------

const HEIGHT_PRIMITIVES = [
  { type: 'ridge', a: [35.55, 33.25], b: [36.25, 34.55], h: 0.95, w: 0.45 }, // Mount Lebanon
  { type: 'ridge', a: [36.00, 33.25], b: [36.65, 34.40], h: 0.70, w: 0.40 }, // Anti-Lebanon
  { type: 'dome', c: [35.85, 33.42], r: 0.35, h: 1.00 },                     // Mount Hermon
  { type: 'ridge', a: [34.98, 31.25], b: [35.30, 32.45], h: 0.55, w: 0.45 }, // Judean-Samarian highlands
  { type: 'dome', c: [35.40, 32.95], r: 0.45, h: 0.50 },                     // Galilee
  { type: 'ridge', a: [35.05, 32.50], b: [34.97, 32.82], h: 0.40, w: 0.20 }, // Mount Carmel
  { type: 'basin', a: [35.60, 33.10], b: [35.45, 30.55], h: -0.50, w: 0.35 },// Jordan rift / Dead Sea / Arabah
  { type: 'ridge', a: [35.60, 30.00], b: [35.85, 31.40], h: 0.55, w: 0.55 }, // Edomite-Moabite plateau
  { type: 'ridge', a: [29.40, 37.25], b: [31.90, 37.00], h: 0.80, w: 0.90 }, // Western Taurus
  { type: 'ridge', a: [32.00, 36.55], b: [34.80, 37.35], h: 0.85, w: 0.80 }, // Central Taurus
  { type: 'ridge', a: [35.60, 37.70], b: [38.60, 38.30], h: 0.90, w: 0.90 }, // Anti-Taurus
  { type: 'ridge', a: [36.20, 36.30], b: [36.55, 37.20], h: 0.60, w: 0.30 }, // Amanus
  { type: 'ridge', a: [43.60, 37.60], b: [46.10, 35.10], h: 0.90, w: 1.10 }, // Northwestern Zagros
  { type: 'ridge', a: [45.60, 35.40], b: [49.60, 31.60], h: 1.00, w: 1.40 }, // Zagros
  { type: 'dome', c: [42.60, 38.70], r: 1.80, h: 1.00 },                     // Armenian highlands
  { type: 'dome', c: [33.90, 28.60], r: 0.70, h: 0.85 },                     // South Sinai massif
  { type: 'dome', c: [33.80, 29.90], r: 0.90, h: 0.35 },                     // et-Tih plateau (Sinai)
  { type: 'ridge', a: [35.30, 28.10], b: [37.80, 25.70], h: 0.80, w: 0.90 }, // Hejaz escarpment
  { type: 'ridge', a: [34.00, 25.80], b: [33.00, 28.60], h: 0.60, w: 0.55 }, // Red Sea Hills (Egypt)
  { type: 'dome', c: [36.70, 32.62], r: 0.50, h: 0.45 },                     // Hauran / Jebel Druze
  { type: 'dome', c: [32.90, 34.95], r: 0.40, h: 0.75 },                     // Troodos (Cyprus)
];

// ---------------------------------------------------------------------------
// MAP_DATA export
// ---------------------------------------------------------------------------

export const MAP_DATA = {
  MAP_W, MAP_H, LON0, LON1, LAT0, LAT1, project,
  provinces: PROVINCES,
  coast: { land: [MAINLAND, CYPRUS], lakes: LAKES },
  rivers: RIVERS,
  heightPrimitives: HEIGHT_PRIMITIVES,
  extraLinks: [['Salamis', 'Seleucia Pieria'], ['Paphos', 'Ptolemais']],
};

// ---------------------------------------------------------------------------
// Validation (SPEC §4). Key lists hardcoded from SPEC §3 — do not import defines.
// ---------------------------------------------------------------------------

const TAG_KEYS = ['ROM', 'JUD', 'PAR', 'NAB', 'ARM', 'AGR', 'REB', 'WASTE'];
const TERRAIN_KEYS = ['coast', 'farmland', 'hills', 'mountains', 'desert', 'drylands', 'steppe', 'marsh', 'wasteland'];
const GOOD_KEYS = ['grain', 'wine', 'olive_oil', 'dates', 'balsam', 'incense', 'purple_dye', 'glass',
  'papyrus', 'silver', 'salt', 'spices', 'timber', 'fish', 'livestock'];
const RELIGION_KEYS = ['judaism', 'samaritanism', 'hellenism', 'roman_cult', 'nabataean', 'zoroastrianism', 'egyptian'];
const CULTURE_KEYS = ['judean', 'galilean', 'samaritan', 'idumean', 'nabataean', 'arab', 'aramean',
  'phoenician', 'greek', 'egyptian', 'roman', 'armenian', 'persian'];

function pointInPolygon(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const crosses = (yi > lat) !== (yj > lat);
    if (crosses && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function onLand(lon, lat) {
  let land = false;
  for (const poly of MAP_DATA.coast.land) {
    if (pointInPolygon(lon, lat, poly)) { land = true; break; }
  }
  if (!land) return false;
  for (const lake of MAP_DATA.coast.lakes) {
    if (pointInPolygon(lon, lat, lake)) return false;
  }
  return true;
}

export function validateMapData() {
  const warnings = [];
  try {
    const provs = MAP_DATA.provinces;

    if (provs.length > 110) {
      warnings.push(`province count ${provs.length} exceeds hard cap 110`);
    }
    if (MAP_DATA.heightPrimitives.length > 24) {
      warnings.push(`heightPrimitives count ${MAP_DATA.heightPrimitives.length} exceeds max 24`);
    }

    const names = new Set();
    for (const p of provs) {
      if (names.has(p.name)) warnings.push(`duplicate province name: ${p.name}`);
      names.add(p.name);
    }

    const MARGIN = 0.05; // degrees inside the frame
    for (const p of provs) {
      if (!Number.isFinite(p.lon) || !Number.isFinite(p.lat)) {
        warnings.push(`${p.name}: non-numeric coordinates`);
        continue;
      }
      if (p.lon < LON0 + MARGIN || p.lon > LON1 - MARGIN ||
          p.lat < LAT0 + MARGIN || p.lat > LAT1 - MARGIN) {
        warnings.push(`${p.name}: seed (${p.lon}, ${p.lat}) outside frame margin`);
      }
      if (!onLand(p.lon, p.lat)) {
        warnings.push(`${p.name}: seed (${p.lon}, ${p.lat}) is not on land (sea or lake)`);
      }
      if (!TAG_KEYS.includes(p.owner)) warnings.push(`${p.name}: unknown owner tag '${p.owner}'`);
      if (!TERRAIN_KEYS.includes(p.terrain)) warnings.push(`${p.name}: unknown terrain '${p.terrain}'`);
      if (!GOOD_KEYS.includes(p.good)) warnings.push(`${p.name}: unknown good '${p.good}'`);
      if (!RELIGION_KEYS.includes(p.religion)) warnings.push(`${p.name}: unknown religion '${p.religion}'`);
      if (!CULTURE_KEYS.includes(p.culture)) warnings.push(`${p.name}: unknown culture '${p.culture}'`);
      if (!(p.weight >= 0.5 && p.weight <= 2.5)) {
        warnings.push(`${p.name}: weight ${p.weight} outside sane range 0.5-2.5`);
      }
      if (!p.dev || !Number.isFinite(p.dev.tax) || !Number.isFinite(p.dev.prod) || !Number.isFinite(p.dev.mp)) {
        warnings.push(`${p.name}: malformed dev`);
      }
    }

    // Minimum seed spacing: 6 map units.
    const pts = provs.map((p) => project(p.lon, p.lat));
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0];
        const dy = pts[i][1] - pts[j][1];
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 6) {
          warnings.push(`seeds too close (${d.toFixed(2)} map units): ${provs[i].name} / ${provs[j].name}`);
        }
      }
    }

    for (const link of MAP_DATA.extraLinks) {
      if (!Array.isArray(link) || link.length !== 2) {
        warnings.push(`malformed extraLink: ${JSON.stringify(link)}`);
        continue;
      }
      for (const nm of link) {
        if (!names.has(nm)) warnings.push(`extraLink references unknown province '${nm}'`);
      }
    }
  } catch (e) {
    warnings.push('validateMapData internal error: ' + (e && e.message ? e.message : String(e)));
  }
  return warnings;
}
