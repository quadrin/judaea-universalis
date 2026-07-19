// js/data/map_data.js — Judaea Universalis: the central Mediterranean & Near East, 66 CE.
// Owns MAP_DATA (SPEC §2, §4) and validateMapData(). DOM-free, zero imports.
// Frame: lon 12–53.5°E, lat 23.5–42.5°N. Equirectangular, y=0 at north.

// v5.0: the frame grows all around — west to Cyrenaica and Greece, south to
// the Hejaz and Upper Egypt, east to Persis and the lower Gulf.
// v5.4: the frame grows again — west to Rome, Sicily and Tripolitania, north
// to the Black Sea, the Bosporus, the Caucasus rim and the south Caspian.
// Density is unchanged (~97.5 px/°lon, ~115 px/°lat); only the world got
// bigger. 4046px stays under the common 4096 MAX_TEXTURE_SIZE floor — the
// whole-Earth map waits on a tiled renderer (SPEC §53).
const MAP_W = 4046;
const MAP_H = 2189;
const LON0 = 12.0;
const LON1 = 53.5;
const LAT0 = 23.5;
const LAT1 = 42.5;

function project(lon, lat) {
  return [
    ((lon - LON0) / (LON1 - LON0)) * MAP_W,
    ((LAT1 - lat) / (LAT1 - LAT0)) * MAP_H,
  ];
}

// ---------------------------------------------------------------------------
// Coastline. One mainland polygon (clockwise from the Ionian coast), plus the
// island and peninsular landmasses. Water = Mediterranean, Adriatic, Aegean,
// Marmara, Black Sea, the Caspian corner, Gulf of Suez, Gulf of Aqaba,
// Red Sea, and the head of the Persian Gulf (66 CE shoreline, near Charax).
// The Bosporus, Dardanelles and Messina straits are drawn a few pixels wide
// so the seas stay connected water; armies cross only by seaLink ferries.
// ---------------------------------------------------------------------------

const MAINLAND = [
  // Ionia & Caria (v5.4: the Smyrna clip is real coast now), south to Lycia
  [26.90, 38.44], [26.98, 38.12], [27.30, 37.72], [27.28, 37.30],
  [27.58, 37.05], [27.98, 36.78], [28.35, 36.62], [28.68, 36.55],
  // Anatolian south coast, west -> east (Lycia, Pamphylia, Cilicia)
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
  [29.50, 31.02], [28.90, 30.95],                                 // the Marmarican shore begins
  [27.90, 31.15], [27.24, 31.35],                                 // Paraetonium (Marsa Matruh)
  [26.40, 31.50], [25.60, 31.58], [25.15, 31.57],                 // Sollum
  [24.60, 31.95], [23.97, 32.08],                                 // Tobruk
  [23.45, 32.40], [22.90, 32.65], [22.64, 32.77],                 // the Gulf of Bomba, Derna
  [21.97, 32.90], [21.45, 32.80],                                 // Apollonia, the Cyrenaican shoulder
  // v5.4: the African shore continues — Benghazi, the Gulf of Sirte, Tripolitania
  [20.40, 32.35], [20.05, 32.10],                                 // Berenice (Benghazi)
  [19.90, 31.60], [19.75, 30.85],                                 // down the Syrtic shore
  [19.20, 30.42], [18.40, 30.30], [17.60, 30.95], [16.60, 31.20], // Syrtis Major, Macomades, Sirte
  [15.75, 31.40], [15.30, 32.00], [15.10, 32.40],                 // Misrata
  [14.30, 32.63], [13.60, 32.80], [13.19, 32.90],                 // Leptis Magna, Oea (Tripoli)
  [12.60, 32.80], [12.00, 32.72],                                 // Sabratha, cut at the west edge
  // Frame: west edge down, south edge east to the Red Sea shore
  [12.00, 23.50], [35.55, 23.50],
  // Egyptian Red Sea coast, northward past Berenice
  [35.48, 23.90], [35.05, 24.55], [34.62, 25.30],
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
  [37.20, 25.10], [37.60, 24.65], [38.05, 24.05],                 // toward Yanbu
  [38.55, 23.70], [38.80, 23.50],                                 // cut at the south edge
  // Frame: south edge east to the corner, up the east edge to the lower Gulf
  [53.50, 23.50], [53.50, 24.10],
  // The lower Gulf shore, westward: the Trucial coast and the Qatar thumb
  [52.60, 24.20], [51.90, 24.45], [51.60, 24.60],
  [51.55, 25.90], [51.20, 26.10], [51.10, 25.55], [50.85, 24.90], // Qatar
  [50.55, 25.05], [50.20, 25.60], [50.05, 26.35],                 // the Bahrain bay shore
  // Arabian shore of the Persian Gulf, northwestward
  [49.55, 27.00], [49.05, 27.55], [48.70, 28.10], [48.45, 28.70], [48.15, 29.15],
  [47.95, 29.35], [47.70, 29.45], [47.85, 29.65],                 // Kuwait Bay
  [47.70, 30.10], [47.60, 30.55],                                 // head of the Gulf (66 CE, near Charax)
  // Elamite / Persian shore, southeastward to the east edge
  [48.00, 30.45], [48.50, 30.25], [49.00, 30.10], [49.50, 30.00], [50.00, 29.90],
  [50.60, 29.45], [50.85, 28.95],                                 // Bushehr
  [51.60, 28.30], [52.40, 27.65], [53.10, 27.05], [53.50, 26.85], // the Persis shore
  // v5.4: frame east edge up to the Caspian's southeast shore
  [53.50, 36.55],
  // The south Caspian shore, westward: Hyrcania, Tabaristan, Gilan
  [53.00, 36.72], [52.20, 36.62], [51.40, 36.72], [50.60, 36.90],
  [50.00, 37.15], [49.55, 37.45],
  // The Caspian west shore, northward: Talysh, the Kura mouth, Absheron, Derbent
  [49.30, 37.90], [48.90, 38.40], [48.85, 38.90], [49.15, 39.40],
  [49.35, 39.85], [50.30, 40.25],                                 // the Absheron peninsula (Baku)
  [49.80, 40.60], [49.55, 41.10], [48.95, 41.55], [48.55, 42.00],
  [48.30, 42.50],                                                 // cut at the top edge below Derbent
  // Frame: top edge west across the Great Caucasus
  [41.85, 42.50],
  // The Black Sea east coast, southward: Colchis, Batumi
  [41.60, 42.10], [41.55, 41.85],
  // The Black Sea south coast, westward: the Pontic shore
  [40.95, 41.15], [39.72, 41.08],                                 // Trapezus
  [38.40, 40.92], [37.05, 41.15], [36.55, 41.28], [36.35, 41.30], // Cerasus, Samsun delta
  [35.90, 41.70], [35.15, 42.03], [34.85, 42.00],                 // the Bafra cape, Sinope
  [33.40, 42.02], [32.30, 41.75], [31.40, 41.30], [31.25, 41.12], // Paphlagonia, Heraclea
  [30.25, 41.15], [29.55, 41.18], [29.18, 41.25],                 // toward the Bosporus mouth
  // The Bosporus east shore, southward (the strait stays water)
  [29.22, 41.05], [29.12, 40.90],
  // The Marmara south shore, westward
  [29.45, 40.75], [28.85, 40.52], [28.00, 40.40], [27.35, 40.50], [26.95, 40.55],
  // The Dardanelles east shore, southward
  [26.80, 40.32], [26.45, 40.10], [26.18, 39.98],
  // The Aegean coast of Anatolia, southward: the Troad, Aeolis, toward Smyrna
  [26.15, 39.55], [26.60, 39.30], [26.85, 39.10],                 // Troy, the Edremit gulf
  [26.70, 38.85], [26.85, 38.60],                                 // toward the Smyrna gulf (closes to the entry)
];

// v5.4: Greece grows into the whole southern Balkan peninsula — one landmass
// from the Adriatic to the Black Sea, clipped by the top edge across the
// interior. The Peloponnese keeps its v5.0 shape; Chalkidiki and Euboea are
// single simplified lobes. The Dardanelles and Bosporus west shores keep a
// few pixels of water against the Anatolian side.
const BALKANS = [
  // enters at the top edge on the Thracian Black Sea coast
  [27.95, 42.50], [28.05, 42.10], [28.15, 41.60],                 // toward the gulf of Burgas
  [28.60, 41.35], [29.02, 41.25],                                 // the Bosporus mouth (Europe)
  [29.05, 41.05], [28.95, 41.00],                                 // Byzantion on the strait
  [28.60, 40.97], [28.00, 40.97], [27.50, 40.95], [27.30, 40.85], // the Marmara north shore
  [26.80, 40.55], [26.55, 40.30], [26.20, 40.05], [26.05, 40.10], // the Gallipoli peninsula
  [26.35, 40.55], [26.00, 40.72], [25.30, 40.85], [24.60, 40.78], // the Thracian Aegean coast
  [24.00, 40.72], [23.70, 40.55], [23.35, 40.25], [23.70, 40.05], // Chalkidiki, one lobe
  [23.05, 40.30], [22.85, 40.50], [22.60, 40.48],                 // the Thermaic gulf (Thessalonica)
  [22.60, 40.10], [22.85, 39.65], [23.05, 39.30], [22.95, 38.95], // the Thessalian coast
  [23.30, 38.85], [23.70, 38.65], [24.15, 38.48],                 // Euboea fused as a lobe
  [24.06, 38.10], [24.04, 37.68],                                 // Marathon shore, Sounion
  [23.45, 37.95], [23.15, 37.60], [23.18, 37.30],                 // the Saronic gulf, Argolid
  [22.78, 37.32], [23.05, 36.90], [23.10, 36.43],                 // Argolic gulf, Malea
  [22.55, 36.72], [22.38, 36.42],                                 // the Laconian gulf, Tainaron
  [22.15, 36.85], [21.85, 36.72],                                 // the Messenian gulf
  [21.55, 36.95], [21.30, 37.40], [21.12, 37.95],                 // the western coast, Elis
  [21.25, 38.30], [21.05, 38.35],                                 // the gulf of Patras
  [20.75, 38.95], [20.75, 39.35], [20.20, 39.70],                 // the Ionian coast, Epirus
  [19.65, 40.15], [19.40, 40.45],                                 // the bay of Vlora
  [19.48, 40.95], [19.45, 41.32], [19.58, 41.80], [19.35, 42.10], // the Illyrian coast, Dyrrhachium
  [19.25, 42.50],                                                 // cut at the top edge (closes across the interior)
];

// v5.4: the Italian peninsula from the Tyrrhenian shore north of Rome to the
// Abruzzo coast, clipped by the frame's top and west edges. Sicily rides
// across the Messina strait (kept ~0.16° of water; the ferry is a seaLink).
const ITALY = [
  [12.00, 42.42],                                                 // enters at the west edge (Tarquinia shore)
  [12.25, 41.90], [12.28, 41.74],                                 // Ostia, the Tiber mouth
  [12.80, 41.42], [13.20, 41.28], [13.60, 41.25], [14.05, 40.83], // Terracina, the gulf of Gaeta, Naples bay
  [14.45, 40.62], [14.90, 40.40], [15.30, 40.05], [15.65, 39.55], // Sorrento, the Salerno gulf, Cilento
  [15.95, 38.90], [15.65, 38.35],                                 // the Tyrrhenian toe
  [15.68, 38.23], [15.75, 38.15], [16.10, 37.95],                 // Rhegium; Capo Spartivento
  [16.60, 38.80], [17.15, 38.95], [17.20, 39.40],                 // the gulf of Squillace, Crotone
  [16.95, 39.90], [16.60, 40.25], [17.25, 40.45], [17.95, 40.25], // the gulf of Taranto
  [18.40, 39.80],                                                 // Cape Leuca (the heel)
  [18.50, 40.15], [18.00, 40.65], [17.35, 40.90], [16.85, 41.13], // Otranto, Brundisium, Barium
  [16.20, 41.35], [15.95, 41.60], [16.20, 41.75], [15.90, 41.92], // the Gargano spur
  [15.15, 41.95], [14.70, 42.15], [14.15, 42.50],                 // the Abruzzo shore, cut at the top edge
  [12.00, 42.50],                                                 // frame: top edge west (west edge closes to the entry)
];

const SICILY = [
  [15.52, 38.20], [15.20, 38.22], [14.75, 38.15], [14.20, 38.02], // the strait side and the north coast
  [13.70, 38.11], [13.35, 38.20], [12.90, 38.03], [12.45, 37.80], // Panormus, Lilybaeum
  [12.60, 37.55], [13.20, 37.18], [13.90, 37.10], [14.60, 36.78], // the African-facing south coast
  [15.10, 36.68],                                                 // Pachynus (the southeast cape)
  [15.30, 37.05], [15.22, 37.50], [15.35, 37.75], [15.52, 38.05], // Syracusae, Catana, under Etna
];

const CRETE = [
  [23.55, 35.24], [24.30, 35.38], [25.00, 35.43], [25.75, 35.34],
  [26.30, 35.30], [26.10, 35.03], [25.50, 34.95], [24.75, 34.93],
  [24.05, 35.05], [23.60, 35.09],
];

const RHODES = [
  [27.72, 36.45], [28.10, 36.42], [28.24, 36.30], [28.05, 36.02],
  [27.75, 36.12],
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
  // Lake Van (v5.4: whole, now that the frame reaches past it)
  [
    [42.30, 38.62], [42.75, 38.95], [43.35, 38.90], [43.30, 38.25], [42.90, 38.15], [42.45, 38.28],
  ],
  // Lake Urmia (v5.4: whole)
  [
    [45.05, 37.70], [44.95, 38.10], [45.35, 38.42], [45.90, 38.25], [45.85, 37.50], [45.40, 37.15], [45.10, 37.30],
  ],
  // Lake Tatta (Tuz Gölü), the salt lake of the Anatolian plateau
  [
    [33.15, 39.05], [33.50, 38.95], [33.42, 38.55], [33.10, 38.68],
  ],
];

// ---------------------------------------------------------------------------
// Rivers (downstream point order; widths 1-3).
// ---------------------------------------------------------------------------

const RIVERS = [
  {
    name: 'Nile', width: 3,
    points: [
      [32.87, 23.50], [32.90, 24.09], [32.75, 24.70], [32.55, 25.15],
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
      [41.10, 39.95], [39.85, 39.70], [38.90, 39.30],               // v5.4: the Armenian headwaters
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
      [39.60, 38.85],                                               // v5.4: the springs above Amida
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
  // v5.4 rivers of the new frame
  {
    name: 'Halys', width: 2,
    points: [
      [37.00, 39.75], [35.80, 39.20], [34.75, 38.70], [33.95, 39.05],
      [33.60, 39.95], [34.10, 40.70], [34.95, 41.10], [36.00, 41.55], [36.35, 41.30],
    ],
  },
  {
    name: 'Tiber', width: 1,
    points: [[12.60, 42.40], [12.50, 42.10], [12.45, 41.95], [12.28, 41.74]],
  },
  {
    name: 'Axios', width: 1,
    points: [[21.75, 41.95], [22.15, 41.45], [22.55, 40.95], [22.62, 40.52]],
  },
];

// ---------------------------------------------------------------------------
// Permanent land cells. id = index + 1. The first 104 IDs are the original
// theater; modern southern-Levant cells are appended so old save IDs stay put.
// A latentParent collapses a fine cell into an older administrative province
// until a bookmark explicitly activates it (js/data/map_profile.js).
// ---------------------------------------------------------------------------

function P(name, lon, lat, weight, owner, terrain, good, religion, culture,
  tax, prod, mp, fort, extra) {
  const p = {
    name, lon, lat, weight, terrain, good, religion, culture,
    dev: { tax, prod, mp },
    owner, fort: fort || 0,
    holy: null, wonder: null, impassable: false,
    // Null lets initGame infer rural/town/urban from the bookmark's actual
    // development. WASTE cells begin empty but may still be settleable later.
    habitation: owner === 'WASTE' ? 'uninhabited' : null,
    settleable: true,
  };
  if (extra) {
    if (extra.holy) p.holy = extra.holy;
    if (extra.wonder) p.wonder = extra.wonder;
    if (extra.impassable) p.impassable = true;
    if (extra.habitation) p.habitation = extra.habitation;
    if (extra.settleable === false) p.settleable = false;
    if (extra.latentParent) p.latentParent = extra.latentParent;
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
  // Gameplay abstraction: Nero had granted Tiberias and Tarichaea to Agrippa II
  // (BJ 2.252) — both cities promptly joined the revolt, which JUD ownership models.
  P('Tiberias', 35.49, 32.77, 0.70, 'JUD', 'coast', 'fish', 'judaism', 'galilean', 4, 4, 3, 0),
  P('Tarichaea', 35.50, 32.87, 0.70, 'JUD', 'coast', 'fish', 'judaism', 'galilean', 3, 4, 3, 0),
  P('Gischala', 35.45, 33.02, 0.75, 'JUD', 'hills', 'olive_oil', 'judaism', 'galilean', 3, 3, 3, 0),
  // --- Judea region under Rome (ROM) --------------------------------------
  P('Gaza', 34.45, 31.50, 0.75, 'ROM', 'coast', 'incense', 'hellenism', 'greek', 4, 5, 3, 0),
  P('Ascalon', 34.62, 31.65, 0.75, 'ROM', 'coast', 'wine', 'hellenism', 'greek', 4, 4, 3, 0),
  P('Azotus', 34.70, 31.78, 0.75, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 3, 3, 2, 0),
  P('Jamnia', 34.75, 31.87, 0.75, 'ROM', 'farmland', 'grain', 'judaism', 'judean', 3, 3, 3, 0),
  P('Hebron', 35.10, 31.53, 0.85, 'ROM', 'hills', 'livestock', 'judaism', 'judean', 3, 3, 3, 0),
  P('Adora', 34.95, 31.40, 0.95, 'ROM', 'hills', 'livestock', 'judaism', 'idumean', 3, 3, 3, 0),
  P('Sebaste', 35.19, 32.28, 0.80, 'ROM', 'hills', 'wine', 'hellenism', 'greek', 4, 4, 3, 0),
  // Name anachronism (SPEC-pinned): Flavia Neapolis was founded 72/73 CE; in 66 the
  // town below Gerizim was Shechem (Josephus' Mabartha). Rename needs a SPEC pass.
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
  P('Aila', 35.08, 29.62, 1.10, 'NAB', 'desert', 'spices', 'nabataean', 'nabataean', 2, 4, 1, 0),
  P('Hegra', 37.95, 26.80, 1.80, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 2, 3, 1, 0),
  P('Dumatha', 39.87, 29.80, 2.00, 'NAB', 'desert', 'livestock', 'nabataean', 'arab', 1, 2, 1, 0),
  P('Medaba', 35.80, 31.72, 0.95, 'NAB', 'drylands', 'livestock', 'nabataean', 'nabataean', 2, 3, 2, 0),
  // --- Parthia & the east (PAR) --------------------------------------------
  P('Edessa', 38.79, 37.16, 0.95, 'OSR', 'hills', 'grain', 'hellenism', 'aramean', 4, 5, 4, 0),
  P('Carrhae', 39.03, 36.87, 1.00, 'OSR', 'drylands', 'grain', 'hellenism', 'aramean', 3, 3, 3, 0),
  P('Nisibis', 41.22, 37.07, 1.10, 'ADI', 'drylands', 'grain', 'zoroastrianism', 'aramean', 4, 5, 4, 0),
  P('Singara', 41.85, 36.33, 1.20, 'PAR', 'drylands', 'livestock', 'zoroastrianism', 'aramean', 2, 3, 2, 0),
  P('Hatra', 42.72, 35.59, 1.50, 'PAR', 'desert', 'livestock', 'hellenism', 'aramean', 2, 3, 2, 0),
  P('Arbela', 44.01, 36.19, 1.10, 'ADI', 'hills', 'grain', 'judaism', 'aramean', 4, 4, 4, 0),
  P('Seleucia-Ctesiphon', 44.58, 33.10, 0.85, 'PAR', 'farmland', 'grain', 'zoroastrianism', 'aramean', 8, 9, 6, 2),
  P('Babylon', 44.42, 32.54, 0.90, 'PAR', 'farmland', 'dates', 'hellenism', 'aramean', 5, 6, 4, 0),
  P('Nehardea', 44.20, 33.37, 0.90, 'PAR', 'farmland', 'dates', 'judaism', 'judean', 4, 5, 4, 0),
  P('Charax', 47.55, 30.75, 1.00, 'CHX', 'marsh', 'spices', 'hellenism', 'arab', 3, 6, 4, 0),
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
  P('Sinai Interior', 34.05, 29.85, 1.80, 'WASTE', 'wasteland', 'salt', 'nabataean', 'arab', 1, 1, 1, 0,
    { impassable: true }),
  P('Eastern Desert', 32.80, 27.50, 1.80, 'WASTE', 'wasteland', 'salt', 'egyptian', 'egyptian', 1, 1, 1, 0,
    { impassable: true }),
  P('Libyan Desert', 29.80, 28.50, 2.00, 'WASTE', 'wasteland', 'salt', 'egyptian', 'egyptian', 1, 1, 1, 0,
    { impassable: true }),

  // --- v2.1 additions: 4 provinces where the east ran thin ------------------
  P('Amida', 40.21, 37.91, 0.95, 'ARM', 'hills', 'livestock', 'zoroastrianism', 'armenian', 3, 3, 3, 1),
  P('Assur', 43.26, 35.46, 0.90, 'ADI', 'drylands', 'livestock', 'zoroastrianism', 'aramean', 2, 2, 2, 0),
  P('Uruk', 45.63, 31.32, 1.05, 'PAR', 'farmland', 'dates', 'hellenism', 'aramean', 3, 4, 2, 0),
  P('Tayma', 38.55, 27.63, 1.40, 'NAB', 'desert', 'incense', 'nabataean', 'arab', 2, 2, 1, 0),

  // --- v4.1 permanent southern-Levant cells -------------------------------
  // These cells are invisible administrative subdivisions in the ancient
  // bookmarks (their pixels, adjacency and clicks resolve to latentParent).
  // The 1948 bookmark activates them as independent modern gameplay regions.
  P('Safed', 35.50, 32.97, 0.62, 'JUD', 'hills', 'olive_oil', 'judaism', 'galilean', 1, 1, 1, 0,
    { latentParent: 'Gischala' }),
  P('Nahariya', 35.09, 33.01, 0.65, 'ROM', 'coast', 'fish', 'hellenism', 'phoenician', 1, 1, 1, 0,
    { latentParent: 'Ptolemais' }),
  P('Afula', 35.29, 32.61, 0.68, 'ROM', 'farmland', 'grain', 'judaism', 'galilean', 1, 1, 1, 0,
    { latentParent: 'Scythopolis' }),
  P('Hadera', 34.92, 32.44, 0.62, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 1, 1, 1, 0,
    { latentParent: 'Caesarea Maritima' }),
  P('Netanya', 34.86, 32.32, 0.62, 'ROM', 'coast', 'fish', 'judaism', 'judean', 1, 1, 1, 0,
    { latentParent: 'Caesarea Maritima' }),
  P('Herzliya', 34.84, 32.17, 0.58, 'JUD', 'coast', 'fish', 'judaism', 'judean', 1, 1, 1, 0,
    { latentParent: 'Joppa' }),
  P('Kfar Saba', 34.91, 32.18, 0.58, 'ROM', 'farmland', 'olive_oil', 'judaism', 'judean', 1, 1, 1, 0,
    { latentParent: 'Antipatris' }),
  P('Rishon LeZion', 34.79, 31.97, 0.58, 'ROM', 'farmland', 'wine', 'judaism', 'judean', 1, 1, 1, 0,
    { latentParent: 'Jamnia' }),
  P('Rehovot', 34.81, 31.89, 0.58, 'ROM', 'farmland', 'wine', 'judaism', 'judean', 1, 1, 1, 0,
    { latentParent: 'Jamnia' }),
  P("Modi'in Hills", 35.01, 31.93, 0.62, 'JUD', 'hills', 'olive_oil', 'judaism', 'judean', 1, 1, 1, 0,
    { latentParent: 'Lydda' }), // the toparchy of Lydda held Modi'in (1 Macc 11:34)
  P('Jenin', 35.30, 32.46, 0.66, 'ROM', 'hills', 'olive_oil', 'samaritanism', 'samaritan', 1, 1, 1, 0,
    { latentParent: 'Neapolis' }),
  P('Tulkarm', 35.03, 32.31, 0.62, 'ROM', 'farmland', 'olive_oil', 'samaritanism', 'samaritan', 1, 1, 1, 0,
    { latentParent: 'Sebaste' }),
  P('Qalqilya', 34.98, 32.19, 0.58, 'ROM', 'farmland', 'grain', 'samaritanism', 'samaritan', 1, 1, 1, 0,
    { latentParent: 'Sebaste' }),
  P('Ramallah', 35.20, 31.90, 0.62, 'JUD', 'hills', 'olive_oil', 'judaism', 'judean', 1, 1, 1, 0,
    { latentParent: 'Jerusalem' }), // the Gophna toparchy: Judea proper, not Samaria
  P('Bethlehem', 35.20, 31.70, 0.60, 'JUD', 'hills', 'wine', 'judaism', 'judean', 1, 1, 1, 0,
    { latentParent: 'Hebron' }),
  P('Beit Shemesh', 34.99, 31.75, 0.60, 'JUD', 'hills', 'wine', 'judaism', 'judean', 1, 1, 1, 0,
    { latentParent: 'Emmaus' }),
  P('Kiryat Gat', 34.76, 31.61, 0.66, 'ROM', 'drylands', 'grain', 'hellenism', 'idumean', 1, 1, 1, 0,
    { latentParent: 'Ascalon' }),
  P('Beersheba', 34.79, 31.25, 0.72, 'NAB', 'drylands', 'livestock', 'nabataean', 'idumean', 1, 1, 1, 0,
    { latentParent: 'Oboda' }),
  P('Arad', 35.21, 31.26, 0.68, 'ROM', 'desert', 'salt', 'judaism', 'idumean', 1, 1, 1, 0,
    { latentParent: 'Adora' }),
  P('Khan Yunis', 34.30, 31.35, 0.70, 'ROM', 'coast', 'grain', 'hellenism', 'greek', 1, 1, 1, 0,
    { latentParent: 'Gaza' }),
  P('Rafah', 34.25, 31.28, 0.70, 'ROM', 'coast', 'grain', 'egyptian', 'egyptian', 1, 1, 1, 0,
    { latentParent: 'Gaza' }),

  // --- v4.4: the Negev triangle -------------------------------------------
  // The rest of the modern Israeli south, so the armistice shape — from Dan
  // to Eilat — is actually formable in 1948. In ancient eras these fold into
  // the Nabataean Negev (Oboda's highlands, Aila's Arabah hinterland).
  P('Dimona', 35.03, 31.06, 0.70, 'NAB', 'desert', 'salt', 'nabataean', 'idumean', 1, 1, 1, 0,
    { latentParent: 'Oboda' }),
  P('Mitzpe Ramon', 34.80, 30.61, 1.00, 'NAB', 'desert', 'livestock', 'nabataean', 'nabataean', 1, 1, 1, 0,
    { latentParent: 'Oboda' }),
  P('Paran', 34.88, 29.92, 0.95, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 1, 1, 0, 0,
    { latentParent: 'Aila' }),
  // Seeded at the head of the gulf so the cell owns the northwest shore:
  // Eilat is the port the greater 1948 verdict marches for, not an inland box.
  P('Eilat', 34.92, 29.57, 0.95, 'NAB', 'coast', 'spices', 'nabataean', 'nabataean', 1, 1, 1, 0,
    { latentParent: 'Aila' }),

  // --- v4.5: the modern borders of the Levant ------------------------------
  // Three more latent cells so 1948's neighbors wear their real shapes:
  // Israel's Galilee panhandle (the Hula, under Banias' ancient shadow),
  // Jordan's eastern Badia (the Azraq oasis and Wadi Sirhan caravan land),
  // and Iraq's western desert (the Rutbah wells on the Baghdad road).
  P('Kiryat Shmona', 35.58, 33.18, 0.62, 'AGR', 'marsh', 'fish', 'judaism', 'galilean', 1, 1, 1, 0,
    { latentParent: 'Caesarea Philippi' }),
  P('Azraq', 37.20, 32.00, 1.15, 'NAB', 'desert', 'livestock', 'nabataean', 'arab', 1, 1, 1, 0,
    { latentParent: 'Bostra' }),
  P('Rutba', 41.50, 32.80, 1.60, 'PAR', 'desert', 'livestock', 'zoroastrianism', 'arab', 1, 1, 1, 0,
    { latentParent: 'Syrian Desert' }),

  // --- v5.0: the wider world ------------------------------------------------
  // Greece and the islands (the Roman west of this stage)
  P('Corinth', 22.93, 37.94, 0.90, 'ROM', 'hills', 'wine', 'hellenism', 'greek', 4, 6, 3, 0),
  P('Athens', 23.73, 37.98, 0.85, 'ROM', 'coast', 'olive_oil', 'hellenism', 'greek', 5, 6, 3, 0),
  P('Sparta', 22.43, 37.07, 0.95, 'ROM', 'hills', 'livestock', 'hellenism', 'greek', 3, 3, 4, 0),
  P('Gortyn', 24.95, 35.06, 1.00, 'ROM', 'farmland', 'grain', 'hellenism', 'greek', 4, 4, 3, 0),
  P('Rhodes', 28.00, 36.25, 0.70, 'ROM', 'coast', 'wine', 'hellenism', 'greek', 4, 6, 3, 0),
  P('Halicarnassus', 27.68, 37.00, 0.95, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 3, 5, 2, 0),
  // Cyrenaica and the western desert
  P('Cyrene', 21.86, 32.82, 0.95, 'ROM', 'farmland', 'grain', 'hellenism', 'greek', 5, 5, 3, 0),
  P('Marmarica', 23.95, 32.05, 1.45, 'ROM', 'desert', 'livestock', 'hellenism', 'egyptian', 1, 1, 1, 0),
  P('Paraetonium', 27.24, 31.32, 1.25, 'ROM', 'desert', 'salt', 'egyptian', 'egyptian', 1, 2, 1, 0),
  // Upper Egypt: Syene and the first cataract (Elephantine's old garrison)
  P('Syene', 32.90, 24.09, 1.05, 'ROM', 'drylands', 'grain', 'egyptian', 'egyptian', 3, 4, 2, 0),
  // The Hejaz oases: Yathrib of the tribes, Khaybar of the Jewish farmers
  P('Yathrib', 39.61, 24.47, 1.15, 'NAB', 'desert', 'dates', 'nabataean', 'arab', 2, 2, 2, 0),
  P('Khaybar', 39.29, 25.70, 0.90, 'NAB', 'desert', 'dates', 'nabataean', 'arab', 2, 3, 1, 0),
  // (Khaybar's famous Jewish farmers arrive via the 614 bookmark's religion
  // overlay — a base-map 'judaism' would hand ancient Judaea a standing holy
  // casus belli against Nabataea that the ancient chapters never intended.)
  // Persis and the lower Gulf
  P('Persepolis', 52.60, 29.90, 1.15, 'PAR', 'drylands', 'silver', 'zoroastrianism', 'persian', 4, 4, 4, 0),
  P('Gabae', 51.67, 32.65, 1.15, 'PAR', 'drylands', 'livestock', 'zoroastrianism', 'persian', 3, 3, 3, 0),
  P('Gerrha', 49.70, 25.35, 1.40, 'CHX', 'desert', 'incense', 'nabataean', 'arab', 2, 4, 1, 0),
  // Berenice Troglodytica: the Red Sea port of the incense route — and the
  // seed that keeps Hegra's voronoi from bleeding across the water to claim
  // the African shore.
  P('Berenice', 34.90, 24.45, 1.00, 'ROM', 'desert', 'spices', 'egyptian', 'egyptian', 1, 3, 1, 0),

  // --- v5.4: the frame grows west and north ---------------------------------
  // Appended so no save ID shifts. Base owners are 66 CE, like everything
  // above: the Roman west, the Parthian Caspian corner, and the Sahara.
  // Italy & Sicily (the heart of the empire, and its granary)
  P('Roma', 12.48, 41.89, 0.80, 'ROM', 'farmland', 'grain', 'roman_cult', 'roman', 10, 9, 8, 2),
  P('Capua', 14.25, 41.02, 0.85, 'ROM', 'farmland', 'wine', 'roman_cult', 'roman', 6, 7, 5, 0),
  P('Tarentum', 17.24, 40.47, 0.95, 'ROM', 'coast', 'purple_dye', 'hellenism', 'greek', 4, 5, 3, 0),
  P('Brundisium', 17.94, 40.63, 0.90, 'ROM', 'coast', 'olive_oil', 'roman_cult', 'roman', 4, 5, 3, 0),
  P('Rhegium', 16.05, 38.45, 0.95, 'ROM', 'hills', 'timber', 'hellenism', 'greek', 3, 3, 3, 0),
  P('Panormus', 13.36, 38.05, 0.90, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 4, 5, 3, 0),
  P('Syracusae', 15.10, 37.10, 0.90, 'ROM', 'coast', 'grain', 'hellenism', 'greek', 5, 6, 3, 0),
  // Tripolitania and the Syrtic shore
  P('Oea', 13.30, 32.70, 1.00, 'ROM', 'coast', 'olive_oil', 'hellenism', 'phoenician', 3, 4, 2, 0),
  P('Leptis Magna', 14.50, 32.45, 1.00, 'ROM', 'coast', 'olive_oil', 'hellenism', 'phoenician', 4, 5, 3, 0),
  P('Macomades', 18.00, 30.30, 1.60, 'ROM', 'desert', 'livestock', 'hellenism', 'phoenician', 1, 2, 1, 0),
  // The southern Balkans and Thrace
  P('Dyrrhachium', 19.55, 41.20, 0.95, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 3, 4, 3, 0),
  P('Thessalonica', 22.95, 40.65, 0.90, 'ROM', 'coast', 'grain', 'hellenism', 'greek', 6, 7, 4, 0),
  // Name anachronism (SPEC-pinned, same class as Neapolis): Hadrian refounds
  // Uscudama/Orestias as Hadrianopolis in the 120s; the canon uses the name
  // the later chapters know. Rename needs a SPEC pass.
  P('Hadrianopolis', 26.55, 41.68, 1.20, 'ROM', 'farmland', 'grain', 'hellenism', 'greek', 3, 4, 3, 0),
  P('Byzantion', 28.75, 41.12, 0.75, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 6, 8, 4, 2),
  // Northern and western Anatolia
  P('Nicaea', 29.72, 40.43, 1.00, 'ROM', 'farmland', 'grain', 'hellenism', 'greek', 4, 5, 3, 0),
  P('Smyrna', 27.14, 38.42, 0.85, 'ROM', 'coast', 'wine', 'hellenism', 'greek', 5, 6, 3, 0),
  P('Ancyra', 32.85, 39.93, 1.60, 'ROM', 'steppe', 'livestock', 'hellenism', 'greek', 3, 3, 3, 0),
  P('Sinope', 35.15, 41.90, 0.90, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 3, 5, 2, 0),
  P('Trapezus', 39.72, 40.92, 1.00, 'ROM', 'coast', 'silver', 'hellenism', 'greek', 3, 4, 3, 0),
  // The Caucasus rim and the south Caspian
  P('Phasis', 41.95, 42.05, 1.20, 'ROM', 'marsh', 'timber', 'hellenism', 'greek', 2, 3, 2, 0),
  P('Caucasian Albania', 47.20, 41.20, 1.80, 'PAR', 'steppe', 'livestock', 'zoroastrianism', 'persian', 2, 2, 2, 0),
  P('Hyrcania', 52.55, 36.40, 1.30, 'PAR', 'coast', 'timber', 'zoroastrianism', 'persian', 3, 4, 3, 0),
  // The deep Sahara behind the Syrtic shore — and the seed that keeps the
  // Tripolitanian cells from claiming the map's whole southwest.
  P('Sahara', 16.50, 27.20, 2.50, 'WASTE', 'wasteland', 'salt', 'egyptian', 'egyptian', 1, 1, 1, 0,
    { impassable: true }),

  // --- v6.7: the southern borders drawn true (appended; no save ID shifts) --
  // Three latent border cells pin the Negev's modern frontiers, which the
  // sparse desert seeds let wander: without an Egyptian seed east of Sinai
  // Interior, the Israeli Negev cells bled 25-40 km across the 1906
  // Rafah-Taba line, Eilat's cell ran down the Egyptian gulf coast past
  // Taba, and Petra reached west over the Arabah. All three collapse latent
  // in every ancient era — the Sinai pair into the interior waste, Zoara
  // into Nabataean Petra, its real ancient sovereign.
  P('Kadesh Barnea', 34.30, 30.62, 1.10, 'NAB', 'desert', 'livestock', 'nabataean', 'arab', 1, 1, 1, 0,
    { latentParent: 'Sinai Interior' }),
  P('Dizahab', 34.62, 29.42, 1.10, 'NAB', 'coast', 'fish', 'nabataean', 'arab', 1, 1, 1, 0,
    { latentParent: 'Sinai Interior' }),
  P('Zoara', 35.50, 30.90, 0.90, 'NAB', 'desert', 'salt', 'nabataean', 'nabataean', 1, 1, 1, 0,
    { latentParent: 'Petra' }),
];

// ---------------------------------------------------------------------------
// Height primitives (renderer; all coords lon/lat). 32 entries (max 32 — full).
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
  { type: 'dome', c: [22.20, 32.60], r: 0.55, h: 0.50 },                     // Jebel Akhdar (Cyrenaica)
  { type: 'ridge', a: [22.30, 37.35], b: [22.35, 36.55], h: 0.70, w: 0.35 }, // Taygetus (Peloponnese)
  { type: 'ridge', a: [23.90, 35.25], b: [26.05, 35.20], h: 0.60, w: 0.28 }, // the White Mountains & Ida (Crete)
  { type: 'ridge', a: [37.80, 25.70], b: [39.70, 23.60], h: 0.85, w: 0.90 }, // Hejaz escarpment, south to Medina
  { type: 'ridge', a: [49.60, 31.60], b: [52.90, 29.40], h: 0.90, w: 1.20 }, // Zagros into Persis
  // v5.4: the mountains of the wider frame
  { type: 'ridge', a: [13.30, 42.45], b: [16.10, 40.05], h: 0.85, w: 0.75 }, // the Apennines
  { type: 'dome', c: [15.00, 37.73], r: 0.35, h: 1.00 },                     // Etna
  { type: 'ridge', a: [20.20, 40.60], b: [21.90, 38.70], h: 0.85, w: 0.70 }, // the Pindus
  { type: 'ridge', a: [35.50, 40.65], b: [41.20, 40.55], h: 0.90, w: 0.75 }, // the Pontic Alps
  { type: 'ridge', a: [40.80, 42.50], b: [48.60, 41.60], h: 1.00, w: 0.90 }, // the Great Caucasus (clipped)
  { type: 'ridge', a: [48.80, 38.40], b: [53.30, 36.15], h: 1.00, w: 0.70 }, // the Alborz above Hyrcania
];

// ---------------------------------------------------------------------------
// MAP_DATA export
// ---------------------------------------------------------------------------

export const MAP_DATA = {
  MAP_W, MAP_H, LON0, LON1, LAT0, LAT1, project,
  provinces: PROVINCES,
  coast: { land: [MAINLAND, CYPRUS, BALKANS, CRETE, RHODES, ITALY, SICILY], lakes: LAKES },
  rivers: RIVERS,
  heightPrimitives: HEIGHT_PRIMITIVES,
  // Land ferries/bridges only — armies may walk these. (None at present.)
  extraLinks: [],
  // Sea crossings: shown nowhere in land adjacency — armies need ships
  // (embark -> sail -> disembark). Kept as data for AI hints and tooltips.
  // v5.4 adds the three famous ferries of the new frame: Otranto (the via
  // Egnatia's sea leg), Messina, and the Bosporus.
  seaLinks: [
    ['Salamis', 'Seleucia Pieria'], ['Paphos', 'Ptolemais'],
    ['Brundisium', 'Dyrrhachium'], ['Rhegium', 'Syracusae'], ['Byzantion', 'Nicaea'],
  ],
  // Accidental raster adjacencies across open water (the province-ID Voronoi
  // cells touch where the real coastlines do not): severed in geometry.js.
  severLinks: [['Salamis', 'Seleucia Trachea'], ['Rhodes', 'Halicarnassus']],
};

// ---------------------------------------------------------------------------
// Validation (SPEC §4). Key lists hardcoded from SPEC §3 — do not import defines.
// ---------------------------------------------------------------------------

const TAG_KEYS = ['ROM', 'JUD', 'PAR', 'NAB', 'ARM', 'AGR', 'OSR', 'ADI', 'CHX', 'REB', 'WASTE'];
const TERRAIN_KEYS = ['coast', 'farmland', 'hills', 'mountains', 'desert', 'drylands', 'steppe', 'marsh', 'wasteland'];
const GOOD_KEYS = ['grain', 'wine', 'olive_oil', 'dates', 'balsam', 'incense', 'purple_dye', 'glass',
  'papyrus', 'silver', 'salt', 'spices', 'timber', 'fish', 'livestock',
  'oil']; // modern-era good: assigned only by bookmark `goods` overlays (SPEC §52)
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

    if (provs.length > 512) {
      warnings.push(`province count ${provs.length} exceeds renderer cap 512`);
    }
    if (MAP_DATA.heightPrimitives.length > 32) {
      warnings.push(`heightPrimitives count ${MAP_DATA.heightPrimitives.length} exceeds max 32`);
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
      if (p.habitation != null && !['uninhabited', 'frontier', 'rural', 'town', 'urban'].includes(p.habitation)) {
        warnings.push(`${p.name}: unknown habitation tier '${p.habitation}'`);
      }
      if (p.latentParent && (!names.has(p.latentParent) || p.latentParent === p.name)) {
        warnings.push(`${p.name}: invalid latent parent '${p.latentParent}'`);
      }
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

    for (const link of MAP_DATA.extraLinks.concat(MAP_DATA.seaLinks || [])) {
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
