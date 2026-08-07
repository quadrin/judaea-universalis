// js/data/map_data.js — Judaea Universalis: the Roman world, 66 CE.
// Owns MAP_DATA (SPEC §2, §4) and validateMapData(). DOM-free, zero imports.
// Frame: lon 11°W–63.5°E, lat 3–58°N. Equirectangular, y=0 at north.

// v5.0: the frame grows all around — west to Cyrenaica and Greece, south to
// the Hejaz and Upper Egypt, east to Persis and the lower Gulf.
// v5.4: the frame grows again — west to Rome, Sicily and Tripolitania, north
// to the Black Sea, the Bosporus, the Caucasus rim and the south Caspian.
// v6.8 (SPEC §160): west to the Atlantic and north to Britain — the whole
// Roman world, the Maghreb, Iberia, Gaul, the home islands, the Rhine and
// Danube, the Pontic steppe and the Caspian's whole rim.
// v7.4 (SPEC §205): east to hold ALL of Iran (the Makran shore, Sistan and
// the Khorasan marches to 63.5°E) and south to hold ALL of Ethiopia (the
// highlands to 3°N) — and with them everything the rectangle must then carry:
// Nubia and the middle Nile, the Horn and the Gulf of Aden, Arabia entire
// from the Hejaz to Ras al-Hadd, the Persian Gulf's two mouths, Margiana and
// the Oxus, the Aral, and the Sahel from the Niger bend to Lake Chad.
//
// Density is unchanged, a fourth time: ~97.5 px/°lon and ~115.2 px/°lat,
// exactly the numbers v5.0 shipped. Only the world got bigger, so nothing
// sized in map units — seed spacing, sprite scale, label metrics — had to
// move.
//
// The ceilings stay measured, not assumed. MAX_TEXTURE_SIZE is 8192 on
// SwiftShader, the weakest thing that will ever run this (SPEC §157) — 7264
// still fits. The texture bill at this frame is ~629 MB in the §158–159
// narrowed formats (smoke104 keeps the arithmetic executable); the §156
// costing said a frame this size was affordable and not worth it, and §205
// is the section where it became worth it. Neither number is what makes a
// map: the coastline below is, and it is the part traced by hand.
const MAP_W = 7264;
const MAP_H = 6337;
const LON0 = -11.0;
const LON1 = 63.5;
const LAT0 = 3.0;
const LAT1 = 58.0;

function project(lon, lat) {
  return [
    ((lon - LON0) / (LON1 - LON0)) * MAP_W,
    ((LAT1 - lat) / (LAT1 - LAT0)) * MAP_H,
  ];
}

// ---------------------------------------------------------------------------
// Coastline. ONE mainland polygon, plus the island landmasses.
//
// v6.8: the mainland ring is now the whole of Afro-Eurasia inside the frame.
// It used to be three rings — Anatolia+Africa, the Balkans, Italy — because
// the old top edge at 42.5°N cut Europe apart above the Adriatic and the
// Bosporus separated it from Asia. At 58°N none of those cuts exist: Italy
// joins Gaul over the Ligurian shore, Gaul joins the Balkans over the Alps,
// and Europe joins Asia across the steppe north of the Black Sea. So MAINLAND
// absorbed BALKANS (reversed, to match its handedness) and ITALY, and the
// Mediterranean became what it geographically is — an inlet, not an edge.
//
// The ring is traced with the water always on the same side, entering and
// leaving each sea rather than jumping: Mediterranean, Adriatic, Aegean,
// Marmara, Black Sea, the Maeotic lake (Azov), the Gulfs of Suez and Aqaba,
// the whole Red Sea, the Gulf of Aden and the Arabian Sea, the Persian Gulf
// with both its mouths (the head near Charax is the 66 CE shoreline), the
// Gulf of Guinea, the Atlantic, the North Sea and the Baltic. Frame edges
// close it. (v7.4: the Caspian left the ring — landlocked at this frame, it
// lives with the lakes as the closed inland sea it geographically is.)
//
// Because it is one loop, an edit anywhere in it can make it cross itself, and
// a crossed ring fills inside-out over the crossed lobe with no other symptom.
// `node tools/coastcheck.mjs` is the guard: it holds simplicity, disjointness
// and containment, and draws the mask so the result can be looked at.
//
// The Bosporus, Dardanelles, Messina, Dover, Bonifacio, Bab el-Mandeb and
// Hormuz straits are drawn a few pixels wide so the seas stay connected
// water; armies cross only by seaLink ferries.
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
  [12.60, 32.80], [12.08, 32.93],                                 // Sabratha, Zuwarah
  // v6.8: the Maghreb — the Syrtis Minor, Africa Proconsularis, Numidia and
  // the two Mauretanias, then the Atlantic shore of Africa to the west edge.
  [11.50, 33.18], [11.11, 33.50],                                 // Ras Ajdir, Zarzis
  [10.98, 33.83], [10.60, 33.86],                                 // Girba (Djerba) fused to its shore
  [10.10, 33.88], [10.07, 34.30],                                 // Tacape (Gabes), head of the Syrtis Minor
  [10.42, 34.55], [10.76, 34.74],                                 // Thaenae, Sfax
  [10.95, 35.20], [11.06, 35.50],                                 // the Thysdrus shore, Ruspina
  [10.83, 35.78], [10.64, 35.83],                                 // Leptis Minor, Hadrumetum
  [10.55, 36.10], [10.62, 36.40],                                 // Neapolis, the gulf of Hammamet
  [10.85, 36.80], [11.03, 37.08],                                 // the promontory of Mercury (Cape Bon)
  [10.57, 36.82], [10.32, 36.86],                                 // the gulf of Carthage, Carthago
  [10.06, 37.06], [9.87, 37.28], [9.75, 37.35],                   // Utica, Hippo Diarrhytus, Cape Blanc
  [9.20, 37.20], [8.76, 36.96],                                   // the Numidian border, Thabraca
  [8.20, 36.93], [7.77, 36.90],                                   // Hippo Regius
  [7.25, 37.09], [6.91, 36.88],                                   // Cape de Garde, Rusicade
  [6.30, 36.90], [5.77, 36.82],                                   // Chullu, Igilgili
  [5.07, 36.75], [4.55, 36.85],                                   // Saldae, the Kabylian shore
  [3.91, 36.92], [3.06, 36.79],                                   // Rusuccuru, Icosium
  [2.20, 36.60], [1.30, 36.52],                                   // Caesarea Mauretaniae, Cartennae
  [0.09, 35.93], [-0.64, 35.71], [-0.92, 35.79],                  // Arsenaria, Portus Magnus, Cape Falcon
  [-1.38, 35.30], [-1.86, 35.10], [-2.23, 35.10],                 // Siga, Ad Fratres, the Mulucha
  [-2.94, 35.29], [-2.97, 35.45],                                 // Rusadir, the Three Forks cape
  [-3.93, 35.25], [-4.75, 35.20],                                 // the Rif shore
  [-5.31, 35.89], [-5.60, 35.78],                                 // Septem, the strait's African side
  [-5.80, 35.79], [-5.93, 35.79],                                 // Tingis, the Ampelusian cape
  // The Atlantic shore of Mauretania Tingitana, southward
  [-6.03, 35.47], [-6.15, 35.19],                                 // Zilis, Lixus
  [-6.60, 34.26], [-6.84, 34.03],                                 // Thamusida, Sala
  [-7.62, 33.60], [-8.50, 33.25],                                 // the Anfa shore, the Oum er-Rbia
  [-9.24, 32.30], [-9.77, 31.51],                                 // the Safi cliffs, Mogador
  [-9.88, 30.63], [-9.60, 30.42],                                 // Cape Ghir, the Sous mouth
  [-10.18, 29.38], [-10.70, 29.00],                               // the Ifni shore, the Draa approaches
  [-11.00, 28.70],                                                // cut at the west edge, above Cape Draa
  // v7.4: the west edge runs south past the Saharan shore — the coast bulges
  // west of 11°W from Cape Draa to Liberia, so the frame edge is the boundary
  // until the Guinea coast swings back inside it at Cape Mount.
  [-11.00, 6.70],
  // The Gulf of Guinea coast, eastward: the Grain, Ivory, Gold and Slave
  // coasts of the later charts — in 66 CE the shore below the charts' edge.
  [-10.79, 6.28], [-10.02, 5.85],                                 // Cape Mesurado, the Kru shore
  [-9.00, 5.00], [-7.72, 4.37],                                   // Cape Palmas
  [-6.60, 4.75], [-5.25, 5.05],                                   // the Ivory shore
  [-4.02, 5.25], [-3.10, 5.08],                                   // the Ebrie lagoons
  [-2.09, 4.74],                                                  // Cape Three Points
  [-1.25, 5.08], [-0.20, 5.55],                                   // the Gold Coast
  [0.65, 5.80], [1.25, 6.13],                                     // the Volta mouth, the Keta lagoon
  [2.45, 6.35], [3.40, 6.42],                                     // the Slave Coast lagoons
  [4.55, 6.20], [5.30, 5.55],                                     // the bight of Benin
  [6.08, 4.28],                                                   // the Niger's delta, Cape Formoso
  [7.15, 4.42], [8.30, 4.80],                                     // the Oil Rivers, the Calabar estuary
  [8.98, 4.10],                                                   // Ambas bay, under the Chariot of the Gods
  [9.62, 3.92],                                                   // the Wouri estuary (Douala)
  [9.88, 3.00],                                                   // cut at the south edge, by Campo
  // Frame: south edge east across the forest, the lakes country and the
  // Cushitic marches to the Indian Ocean shore of Azania
  [46.50, 3.00],
  // The Azanian and Somali coast, northeastward to the Horn
  [47.30, 4.15], [48.05, 4.95],                                   // the Benadir shore
  [48.53, 5.35], [49.15, 6.55],                                   // Hobyo
  [49.85, 7.98], [50.55, 9.30],                                   // Eyl, the Hafun approaches
  [51.40, 10.45],                                                 // Ras Hafun — Africa's easternmost cape
  [51.28, 11.82],                                                 // Cape Aromata (Guardafui)
  // The Gulf of Aden's south shore, westward: the far-side ports of the
  // Periplus — Opone behind, Malao, Avalites at the strait
  [50.60, 11.95], [49.18, 11.28],                                 // Bosaso
  [47.95, 11.15], [46.55, 10.70],                                 // the Maydh shore
  [45.01, 10.44],                                                 // Malao (Berbera)
  [44.25, 10.42], [43.47, 11.36],                                 // Zeila
  [43.15, 11.59], [42.55, 11.53],                                 // the gulf of Tadjoura
  [43.10, 11.98],                                                 // Obock, the strait approaches
  [43.32, 12.48],                                                 // Ras Siyyan — Bab el-Mandeb, African side
  // The African Red Sea shore, northwestward: the Danakil coast, Adulis,
  // the Beja shore, to Berenice where the old frame's coast begins
  [42.73, 13.02], [42.00, 13.70],                                 // Assab, the Danakil shore
  [41.20, 14.55], [40.20, 14.95],                                 // the Buri approaches
  [39.72, 15.15], [39.47, 15.62],                                 // Adulis' bay, Massawa
  [39.12, 16.55], [38.62, 17.75],                                 // the Dahlak-facing shore
  [37.60, 18.60], [37.33, 19.10],                                 // Suakin
  [37.22, 19.62], [37.05, 20.60],                                 // Port Sudan's roadstead
  [36.85, 21.60], [36.55, 22.20],                                 // the Beja shore
  [35.58, 23.25],                                                 // toward Foul Bay
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
  // v6.8: the head is drawn SQUARE, not as a point. It used to taper to a
  // single vertex, which left the gulf ~3 px wide at 29.5° — narrow enough
  // that whether Eilat and Aila touched salt water at all came down to which
  // way the domain warp happened to push the border, and moving the frame
  // moved the warp's phase and took Aqaba's shoreline away. The real head is
  // about 5 km across with a town on either bank; draw it that way.
  [34.88, 29.48], [34.90, 29.54],                                 // the west bank, Eilat's shore
  [35.02, 29.54],                                                 // the head of the Gulf of Aqaba
  // Aqaba east shore, southward, then the Arabian Red Sea coast
  [35.05, 29.33], [34.90, 28.90], [34.80, 28.45], [34.78, 28.05],
  [35.15, 27.55], [35.55, 27.30], [36.10, 26.55], [36.50, 26.10], [36.90, 25.55],
  [37.20, 25.10], [37.60, 24.65], [38.05, 24.05],                 // toward Yanbu
  [38.55, 23.70],
  // v7.4: the Arabian Red Sea coast continues south — the Hejaz shore, the
  // Asir, the Tihama of the incense kingdoms — to the strait.
  [39.05, 22.70], [39.15, 21.48],                                 // Jeddah's roadstead
  [39.80, 20.30], [41.08, 19.13],                                 // the Asir shore
  [41.80, 17.90], [42.55, 16.90],                                 // the farther Tihama
  [42.62, 15.75], [42.93, 14.80],                                 // the Sabaean coast, Muza's roadstead
  [43.20, 13.95], [43.25, 13.32],                                 // Mocha's shore
  [43.48, 12.68],                                                 // Bab el-Mandeb, Arabian side
  // The south Arabian coast, eastward: Eudaemon Arabia, the Hadhramaut
  // shore, the incense terraces of Dhofar, to Arabia's eastern cape
  [44.30, 12.62], [45.03, 12.78],                                 // Eudaemon Arabia (Aden)
  [45.95, 13.30], [47.40, 13.65],                                 // the Abyan and Ahwar shore
  [48.18, 13.98], [49.13, 14.53],                                 // Qana's coast, Mukalla
  [50.20, 14.95], [51.24, 15.21],                                 // the Mahra shore
  [52.23, 15.65],                                                 // Cape Syagros (Ras Fartak)
  [52.50, 16.05], [53.55, 16.80],                                 // the Qamar bay
  [54.10, 17.02], [54.70, 16.98],                                 // Moscha (Salalah), Mirbat
  [55.45, 17.60], [56.30, 18.20],                                 // the Sawqirah bight
  [57.70, 19.00], [57.75, 19.80],                                 // the Duqm shore
  [58.55, 20.40],                                                 // Masirah fused to its shore
  [59.10, 21.35], [59.58, 21.90],                                 // the sands' seaward edge
  [59.80, 22.52],                                                 // Ras al-Hadd — Arabia's eastern cape
  // The Gulf of Oman shore, northwestward to the strait
  [59.45, 22.75], [58.59, 23.62],                                 // Qalhat, Muscat
  [57.85, 23.95], [56.75, 24.36],                                 // the Batinah shore, Sohar
  [56.36, 25.20], [56.27, 25.65],                                 // the Shimaliyah coast
  [56.38, 26.20],                                                 // Ras Musandam — the strait of Hormuz
  // The Persian Gulf's south shore, southwestward: the pirate coast of the
  // later charts, the pearl banks, to the Qatar thumb
  [56.05, 25.95], [55.95, 25.75],                                 // the Musandam west side
  [55.55, 25.55], [55.28, 25.28],                                 // the Trucial lagoons (Dubai)
  [54.90, 24.85], [54.38, 24.45],                                 // Abu Dhabi's islands, fused
  [53.60, 24.08],                                                 // the Khor al-Udaid shore
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
  [51.60, 28.30], [52.40, 27.65], [53.10, 27.05],                 // the Persis shore
  // v7.4: the Persian coast continues past the old frame — the Carmanian
  // shore, Qeshm fused to it on the Euboea rule, the strait of Hormuz, and
  // the Makran coast of Gedrosia to the east edge.
  [53.85, 26.75], [54.65, 26.52],                                 // the Laristan shore, Bandar-e Lengeh
  [55.25, 26.58],                                                 // Qeshm's western point, fused
  [55.95, 26.65], [56.28, 26.90],                                 // Qeshm's seaward shore
  [56.62, 27.02],                                                 // Harmozeia's bay (Bandar Abbas)
  [56.95, 26.80], [57.35, 26.30],                                 // the Kuhestak shore
  [57.77, 25.65],                                                 // Jask
  [58.80, 25.45], [60.10, 25.32],                                 // the Makran shore
  [60.62, 25.28],                                                 // Tis (Chabahar)
  [61.60, 25.12], [62.33, 25.12],                                 // the Gwatar bay, Gwadar
  [63.05, 25.22],                                                 // toward Pasni
  [63.50, 25.28],                                                 // the Makran coast, cut at the east edge
  // Frame: east edge north to the corner — Gedrosia, Arachosia's marches,
  // Margiana and the steppe all run off the map's east — then the top edge
  // west across the Sarmatian plain to the Baltic. The Caspian no longer
  // touches this edge: with the frame at 63.5°E it is landlocked, and it
  // lives with the lakes below as the closed inland sea it geographically is.
  [63.50, 58.00], [24.35, 58.00],
  // v6.8: the Baltic's east shore — the gulf of Riga, Courland, the amber
  // coast of the Aestii, and the Suebian sea's south shore westward.
  [24.30, 57.72], [24.38, 57.30],                                 // the Livonian shore
  [24.10, 57.02],                                                 // the Duna's mouth
  [23.55, 57.05], [23.10, 57.20],                                 // the gulf's south shore
  [22.78, 57.50], [22.59, 57.76],                                 // the Courland cape (Kolka)
  [21.55, 57.40], [21.18, 56.90],                                 // the amber coast
  [21.01, 56.51], [21.05, 56.00],                                 // the Libavian shore
  [21.13, 55.71], [20.95, 55.28],                                 // the Chronus' mouth, the Curonian spit
  [20.50, 54.98], [19.95, 54.95],                                 // Sambia, the amber staple
  [19.40, 54.60], [18.95, 54.42],                                 // the Vistula lagoon
  [18.70, 54.38], [18.82, 54.75],                                 // the Vistula's mouth, the Hel spit
  [18.40, 54.72], [17.55, 54.75],                                 // the bay of the Gothones
  [16.70, 54.55], [15.57, 54.19],                                 // the Pomeranian shore
  [14.70, 54.10], [14.25, 53.93],                                 // Usedom, the Viadua's (Oder) mouth
  [13.75, 54.05], [13.42, 54.42],                                 // Rugen fused to the shore
  [12.55, 54.20], [12.10, 54.18],                                 // the Mecklenburg bay
  [11.35, 54.10], [10.90, 54.02],                                 // the bay of the Lubeck shore
  [10.75, 54.30], [10.15, 54.42],                                 // Fehmarn fused, the Kiel bight
  [9.95, 54.72], [9.43, 54.83],                                   // the Schlei, the Angli shore
  // The Cimbric peninsula: up the Baltic side, round the Skaw, down the ocean
  [9.42, 55.05], [9.50, 55.52],                                   // the Little Belt
  [9.90, 55.85], [10.20, 56.15],                                  // the Cimbrian east coast
  [10.55, 56.30], [10.95, 56.45],                                 // the Djursland cape
  [10.30, 56.60], [10.30, 57.00],                                 // the Limfjord approaches
  [10.55, 57.45], [10.62, 57.73],                                 // the Skaw — the Kattegat's north gate
  [9.96, 57.60], [9.20, 57.15],                                   // the Jammer bay
  [8.60, 56.70], [8.13, 56.05],                                   // the Nissum bight
  [8.13, 55.55], [8.45, 55.47],                                   // the Cimbric ocean shore
  [8.60, 55.05], [8.90, 54.55],                                   // the Wadden flats
  [8.65, 54.30], [8.90, 53.90],                                   // Eiderstedt, the Albis' (Elbe) mouth
  // The ocean shore of Germania Inferior and Gallia Belgica, westward
  [8.50, 53.60], [8.20, 53.55],                                   // the Visurgis and Jade bays
  [7.20, 53.60], [7.00, 53.32],                                   // the Frisian isles fused, the Amisia
  [6.50, 53.42], [6.05, 53.42],                                   // the Frisian shore
  [5.40, 53.20], [5.20, 52.90],                                   // the Flevo lake's gate
  [4.60, 52.60], [4.55, 52.35],                                   // the dune coast of the Batavi
  [4.10, 51.98], [3.85, 51.65],                                   // the Rhenus' mouth, the Scaldis isles
  [3.55, 51.42], [3.20, 51.35],                                   // the Scaldis' mouth
  [2.92, 51.23], [2.42, 51.06],                                   // the Menapian shore
  [1.85, 50.95], [1.61, 50.73],                                   // Portus Itius, Gesoriacum
  [1.55, 50.20], [0.75, 49.90],                                   // the Samara's mouth, the Caletian cliffs
  [0.20, 49.44], [-0.25, 49.30],                                  // the Sequana's estuary, the Calvados shore
  [-1.15, 49.35], [-1.60, 49.70],                                 // the Unelli peninsula and its cape
  [-1.85, 49.20], [-1.50, 48.62],                                 // its west side, the bay of the Abrincatui
  [-2.02, 48.65], [-2.75, 48.53],                                 // Aletum, the Armorican north shore
  [-3.55, 48.68], [-4.05, 48.72],                                 // the Osismii coast
  [-4.65, 48.45], [-4.78, 48.33],                                 // the Iroise, the Armorican point
  [-4.55, 48.10], [-4.74, 48.04],                                 // the Brest roads, the Raz
  [-4.35, 47.80], [-3.95, 47.80],                                 // the bay of Audierne, Penmarch
  [-3.37, 47.72], [-3.12, 47.48],                                 // the Veneti harbours, the Quiberon bay
  [-2.55, 47.50], [-2.20, 47.27],                                 // the Morbihan, the Liger's estuary
  [-1.95, 46.95], [-1.80, 46.50],                                 // the Pictonian march
  [-1.35, 46.30], [-1.15, 46.15],                                 // the Santonian shore
  [-1.05, 45.58], [-1.20, 44.90],                                 // the Garumna's estuary
  [-1.30, 44.20], [-1.45, 43.60],                                 // the Landes shore
  [-1.78, 43.38], [-2.20, 43.32],                                 // Aquitania's last cape, the Vascones
  // The Cantabrian and Gallaecian shore of Hispania, westward
  [-3.00, 43.40], [-3.80, 43.46],                                 // Flaviobriga, Portus Victoriae
  [-4.50, 43.42], [-5.70, 43.56],                                 // the Cantabrian coast, Gigia
  [-6.55, 43.58], [-7.30, 43.72],                                 // the Astur shore
  [-7.86, 43.76], [-8.30, 43.60],                                 // the Ortegal cape, the Artabrian gulf
  [-8.42, 43.37], [-8.90, 43.32],                                 // Brigantium, the Nerian coast
  [-9.28, 42.90], [-8.95, 42.55],                                 // the Nerian cape (Finisterre)
  [-8.85, 42.24], [-8.72, 41.87],                                 // Vigo's ria, the Minius' mouth
  [-8.78, 41.50], [-8.67, 41.14],                                 // the Bracaran shore, Cale
  [-8.90, 40.60], [-8.85, 40.15],                                 // Aeminium, the Munda
  [-9.05, 39.60], [-9.42, 39.35],                                 // the Lusitanian shore
  [-9.50, 38.78], [-9.15, 38.70],                                 // the Rock of the Moon, Olisipo on the Tagus
  [-8.90, 38.50], [-8.80, 38.10],                                 // the Callipus' mouth
  [-8.85, 37.50], [-8.95, 37.05],                                 // the Cuneus shore
  [-8.90, 36.99], [-7.90, 37.02],                                 // the Sacred Promontory, the Cuneus coast
  [-7.40, 37.18], [-6.85, 37.00],                                 // the Anas' mouth, the Onuba shore
  [-6.35, 36.80], [-6.28, 36.53],                                 // the Baetis' mouth, Gades
  [-6.05, 36.18], [-5.60, 36.01],                                 // Baelo, Iulia Traducta
  // Through the Pillars: the Mediterranean shore of Hispania, eastward
  [-5.35, 36.13], [-4.42, 36.72],                                 // Calpe, Malaca
  [-3.70, 36.74], [-2.92, 36.75],                                 // the Baetican shore, Abdera
  [-2.45, 36.83], [-1.90, 36.95],                                 // Portus Magnus, the Charidemus cape
  [-1.32, 37.55], [-0.99, 37.60],                                 // the Bastetanian coast, Carthago Nova
  [-0.65, 38.18], [-0.48, 38.35],                                 // the Palos cape, Lucentum
  [0.19, 38.73], [0.05, 38.95],                                   // the Dianium cape
  [-0.32, 39.45], [-0.27, 39.68],                                 // Valentia, Saguntum
  [0.03, 39.98], [0.40, 40.36],                                   // the Ilercavonian shore
  [0.72, 40.62], [0.87, 40.72], [0.68, 40.80],                    // the Iberus' delta
  [1.25, 41.12], [2.17, 41.39],                                   // Tarraco, Barcino
  [2.80, 41.67], [3.15, 41.88], [3.32, 42.32],                    // the Laletanian shore, Emporiae, the Aphrodisium
  // Gallia Narbonensis and the Ligurian shore
  [3.05, 42.52], [3.05, 43.02],                                   // Ruscino, the Narbonese lagoons
  [3.70, 43.35], [4.15, 43.55],                                   // Agatha, the Rhodanus' western arm
  [4.85, 43.35], [5.05, 43.32],                                   // the Rhodanus delta, the Marian ditches
  [5.37, 43.30], [5.93, 43.09],                                   // Massilia, Telo Martius
  [6.65, 43.15], [7.12, 43.52],                                   // the Argenteus shore, Antipolis
  [7.27, 43.70], [7.75, 43.79],                                   // Nicaea, the Ligurian corniche
  [8.30, 44.10], [8.75, 44.40],                                   // Albingaunum, Vada Sabatia
  [8.93, 44.41], [9.85, 44.10],                                   // Genua, Luna
  [10.30, 43.55], [10.50, 43.00],                                 // the Pisan shore, Populonium
  [11.10, 42.42], [11.80, 42.10],                                 // Cosa, the Etruscan coast
  // Italy, absorbed from the old ITALY ring: the Tyrrhenian shore, the toe,
  // the gulf of Taranto, the heel, and the Adriatic coast back north.
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
  [15.15, 41.95], [14.70, 42.15],                                 // the Frentanian shore
  [14.22, 42.47], [14.00, 42.65],                                 // Aternum
  [13.85, 43.00], [13.51, 43.62],                                 // the Picene shore, Ancona
  [13.20, 43.75], [12.57, 44.07],                                 // the Conero behind, Ariminum
  [12.28, 44.42], [12.50, 44.85],                                 // Ravenna's lagoons, the Padus delta
  [12.42, 45.20], [12.35, 45.43],                                 // the Venetic lagoon
  [13.10, 45.63], [13.75, 45.65],                                 // Aquileia's shore, Tergeste
  [13.60, 45.23], [13.85, 44.87],                                 // Parentium, Pola
  [14.12, 45.09], [14.45, 45.33],                                 // Istria's east side, Tarsatica
  // Dalmatia and the Illyrian coast, southeastward down the Adriatic
  [14.90, 44.99], [15.23, 44.12],                                 // the Liburnian shore, Iader
  [15.90, 43.72], [16.44, 43.51],                                 // Scardona, Salona
  [17.20, 43.03], [17.60, 42.92],                                 // the Naro's mouth
  [18.09, 42.65], [18.55, 42.42],                                 // Epidaurum, the Rhizonic gulf
  [18.90, 42.28], [19.10, 42.09], [19.30, 41.95],                 // Butua, Olcinium, the Drilon
  // Absorbed from the old BALKANS ring, reversed: it was traced with the water
  // on the other hand, because it used to be its own island of a landmass.
  [19.58, 41.80], [19.45, 41.32], [19.48, 40.95],                 // the Illyrian coast, Dyrrhachium
  [19.40, 40.45], [19.65, 40.15],                                 // the bay of Aulon
  [20.20, 39.70], [20.75, 39.35], [20.75, 38.95],                 // the Ionian coast, Epirus
  [21.05, 38.35], [21.25, 38.30],                                 // the gulf of Patras
  [21.12, 37.95], [21.30, 37.40], [21.55, 36.95],                 // the western coast, Elis
  [21.85, 36.72], [22.15, 36.85],                                 // the Messenian gulf
  [22.38, 36.42], [22.55, 36.72],                                 // Tainaron, the Laconian gulf
  [23.10, 36.43], [23.05, 36.90], [22.78, 37.32],                 // Malea, the Argolic gulf
  [23.18, 37.30], [23.15, 37.60], [23.45, 37.95],                 // the Argolid, the Saronic gulf
  [24.04, 37.68], [24.06, 38.10],                                 // Sounion, the Marathon shore
  [24.15, 38.48], [23.70, 38.65], [23.30, 38.85],                 // Euboea fused as a lobe
  [22.95, 38.95], [23.05, 39.30], [22.85, 39.65], [22.60, 40.10], // the Thessalian coast
  [22.60, 40.48], [22.85, 40.50], [23.05, 40.30],                 // the Thermaic gulf
  [23.70, 40.05], [23.35, 40.25], [23.70, 40.55], [24.00, 40.72], // Chalkidiki, one lobe
  [24.60, 40.78], [25.30, 40.85], [26.00, 40.72], [26.35, 40.55], // the Thracian Aegean coast
  [26.05, 40.10], [26.20, 40.05], [26.55, 40.30], [26.80, 40.55], // the Gallipoli peninsula
  [27.30, 40.85], [27.50, 40.95], [28.00, 40.97], [28.60, 40.97], // the Marmara north shore
  [28.95, 41.00], [29.05, 41.05],                                 // Byzantion on the strait
  [29.02, 41.25], [28.60, 41.35],                                 // the Bosporus mouth (Europe)
  [28.15, 41.60], [28.05, 42.10],                                 // the Thracian Black Sea coast
  // v6.8: the Black Sea's west shore, northward — Moesia, the Danube's delta,
  // the Greek colonies of the liman coast.
  [27.75, 42.35], [27.47, 42.50],                                 // Apollonia Pontica, the bay of Burgas
  [27.72, 42.72], [27.92, 43.19],                                 // Mesambria, Odessus
  [28.15, 43.40], [28.47, 43.38],                                 // the Tirizian cape (Kaliakra)
  [28.58, 43.75], [28.65, 44.17],                                 // Callatis, Tomis
  [28.85, 44.60], [29.10, 44.85],                                 // the Histrian lagoon
  [29.67, 45.22], [29.72, 45.55],                                 // the Danuvius' delta
  [30.20, 45.90], [30.35, 46.20],                                 // the Tyras' liman
  [30.75, 46.48], [31.53, 46.62],                                 // the Hypanis liman
  [31.90, 46.70], [32.55, 46.55],                                 // Olbia, the Borysthenes' liman
  [33.10, 46.30], [33.68, 46.16],                                 // the isthmus into the Tauric Chersonese
  // The Tauric Chersonese (Crimea), round from the isthmus
  [33.30, 45.80], [32.55, 45.35],                                 // the Tarkhankut cape
  [33.37, 45.19], [33.53, 44.61],                                 // Kerkinitis, Chersonesus Taurica
  [34.16, 44.50], [34.85, 44.82],                                 // the Tauric range's shore
  [35.38, 45.03], [36.05, 45.13],                                 // Theodosia, the Kimmerian shore
  [36.47, 45.35],                                                 // Panticapaeum, on the Kimmerian Bosporus
  // The Maeotic lake (the sea of Azov), round from the strait
  [35.85, 45.55], [35.20, 45.85],                                 // the Arabat bar
  [34.80, 46.17], [35.60, 46.55],                                 // the Maeotic north shore
  [36.79, 46.76], [37.55, 47.10],                                 // the Sarmatian shore
  [38.35, 47.25], [39.30, 47.12],                                 // Tanais, on the Don's delta
  [38.90, 46.90], [38.28, 46.71],                                 // the shore of the Maeotae
  [38.18, 46.05], [37.60, 45.55],                                 // the Achilles' bar, the Hypanis' mouth
  [37.15, 45.30], [36.75, 45.28],                                 // Phanagoria, the strait's Asian side
  // The Black Sea's east shore, southward: the Sindic and Colchian coast
  [37.32, 44.89], [37.78, 44.72],                                 // Gorgippia, the Sindic harbour
  [38.35, 44.42], [39.08, 44.10],                                 // the Cercetian shore
  [39.73, 43.58], [40.25, 43.35],                                 // the Achaean coast
  [41.02, 43.00], [41.55, 42.55],                                 // Dioscurias, the Colchian marsh
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

// v6.8: the islands. BALKANS and ITALY are gone from this list — the frame
// that reaches Britain joins both to the mainland ring above. What is left is
// what is genuinely an island at 58°N.

// Britain, clipped by the top edge across Caithness and Sutherland. The
// Roman-era shoreline is not the modern one in two places that matter and are
// drawn as they were: the Wash and the Fens reach further inland, and the
// Solent still has Vectis fused to it at this resolution. Mona, Vectis and
// Kintyre are fused rather than cut, on the same rule as Euboea.
const BRITAIN = [
  [-3.60, 58.00],                                                 // cut at the top edge, the Caithness shore
  [-3.05, 57.70], [-2.05, 57.70],                                 // the Moray firth, the Taexali shoulder
  [-1.78, 57.50], [-2.09, 57.15],                                 // Devana, the Mounth
  [-2.45, 56.75], [-2.85, 56.45],                                 // the Tava's firth
  [-2.65, 56.05], [-3.10, 55.95],                                 // the Bodotria, the Votadini shore
  [-2.15, 55.75], [-1.70, 55.30],                                 // the Tuede, the Bernician coast
  [-1.40, 54.95], [-1.14, 54.63],                                 // the Vedra's mouth, the Tesa
  [-0.60, 54.48], [-0.38, 54.28],                                 // the Whitby cliff, the Parisian shore
  [-0.08, 54.12], [-0.19, 53.90],                                 // Ocelum promontory, the Holderness bight
  [0.10, 53.60],                                                  // the Abus' mouth
  [0.35, 53.20], [0.30, 52.92],                                   // the Lindsey shore, the Metaris
  [0.10, 52.78], [0.60, 52.97],                                   // the fen edge, the Icenian corner
  [1.30, 52.95], [1.75, 52.75],                                   // the north Icenian shore, the Norfolk cape
  [1.70, 52.45], [1.30, 52.00],                                   // the Gariennus, the Trinovantian coast
  [1.10, 51.75], [0.90, 51.85],                                   // the Idumanian estuary
  [0.75, 51.55], [0.90, 51.45],                                   // Camulodunum's water, the Tamesis' mouth
  [1.40, 51.38], [1.42, 51.15],                                   // the north Cantian shore, Rutupiae
  [1.05, 50.90], [0.35, 50.82],                                   // Dubris, the Regnensian coast
  [-0.75, 50.78], [-1.10, 50.72],                                 // Noviomagus, the Solent
  [-1.55, 50.72], [-2.05, 50.60],                                 // Vectis fused, the Purbeck
  [-2.45, 50.57], [-3.05, 50.70],                                 // the Durotrigan cliffs, the Isca
  [-3.55, 50.42], [-4.15, 50.35],                                 // the Dumnonian shore, Tamara's sound
  [-5.05, 50.05], [-5.72, 50.07],                                 // the Lizard, Belerion
  [-5.05, 50.55], [-4.20, 51.05],                                 // the Cornish north shore, the Taw
  [-3.40, 51.20], [-2.95, 51.40],                                 // the Sabrina's estuary, the levels
  [-2.75, 51.55], [-3.00, 51.55],                                 // the Avona, the Silurian bank
  [-4.20, 51.60], [-4.95, 51.72],                                 // Gower, the Demetian bay
  [-5.25, 51.72], [-5.30, 51.88],                                 // the Octapitarum cape
  [-4.66, 52.09], [-4.10, 52.45],                                 // the Teifi's mouth, the Cardigan bay
  [-4.05, 52.75], [-4.70, 52.80],                                 // the Ardudwy sands, the Lleyn point
  [-4.35, 53.13], [-4.65, 53.32],                                 // the Seiont, Mona fused
  [-3.85, 53.35],                                                 // the Conovian shore
  [-3.05, 53.42], [-3.05, 53.75],                                 // the Deva's mouth, the Belisama
  [-3.05, 54.10], [-3.55, 54.20],                                 // the Setantian coast, the Duddon
  [-3.40, 54.80], [-3.60, 54.98],                                 // the Cumbrian shore, the Ituna
  [-4.40, 54.87], [-4.75, 54.68],                                 // the Novantian bay and its cape
  [-5.00, 54.90], [-4.85, 55.35],                                 // the Rerigonian gulf, the Damnonian coast
  [-4.75, 55.72], [-5.15, 55.95],                                 // the Clota's firth
  [-5.55, 56.10], [-5.35, 56.45],                                 // Kintyre fused, the Epidian shore
  [-5.65, 56.68], [-5.90, 57.10],                                 // Lorn, the Morvern coast
  [-5.65, 57.55], [-5.35, 57.85],                                 // the Caledonian west shore
  [-5.15, 58.00],                                                 // cut at the top edge, the Sutherland side
];

// Hibernia, whole — the one large island in the frame no Roman army ever
// landed on, and the westernmost land the map holds.
const HIBERNIA = [
  [-6.05, 55.20], [-5.45, 54.85],                                 // the Robogdian cape, the Ards
  [-5.55, 54.45], [-6.10, 54.05],                                 // the Strangford lough, Carlingford
  [-6.05, 53.60], [-6.10, 53.35],                                 // the Buvinda's mouth, Eblana
  [-6.00, 52.95], [-6.05, 52.55],                                 // the Menapian shore, the Sacred cape
  [-6.95, 52.20], [-7.55, 52.10],                                 // the Brigantine harbours
  [-8.15, 51.85], [-8.45, 51.62],                                 // the Iernus, the Old Head
  [-9.45, 51.45], [-10.20, 51.75],                                // the Notium cape, the Kenmare water
  [-10.40, 52.10], [-9.75, 52.55],                                // the Dingle point, the Senus' mouth
  [-9.55, 53.05], [-10.15, 53.42],                                // the Ausoban bay, Connemara
  [-9.90, 53.85], [-10.05, 54.25],                                // Clew bay, the Erris head
  [-9.30, 54.30], [-8.60, 54.35],                                 // the Nagnatan shore
  [-8.60, 54.65], [-8.30, 54.62],                                 // the Donegal bay
  [-8.75, 55.10], [-7.55, 55.25],                                 // the Rosses, the Boreum cape
  [-7.10, 55.05], [-6.60, 55.20],                                 // the Argita's lough, the Bann
];

// Sardinia and Corsica, across the strait of Bonifacio (~0.13° of water kept,
// on the Messina rule).
const SARDINIA = [
  [9.20, 41.25], [9.55, 41.13],                                   // the Bonifacio side, the Gallura
  [9.65, 40.85], [9.75, 40.55],                                   // Olbia, the eastern shore
  [9.70, 40.05], [9.60, 39.55],                                   // the Ogliastra, the Sarrabus
  [9.55, 39.15], [9.12, 39.20],                                   // Carales
  [8.85, 38.90], [8.65, 39.10],                                   // the Chersonesus cape, Sulci
  [8.40, 39.35], [8.45, 39.90],                                   // the Sulcitan coast, Tharros
  [8.35, 40.25], [8.20, 40.55],                                   // the gulf of Oristano, Bosa
  [8.20, 40.85], [8.30, 41.10],                                   // Turris Libisonis, the Asinara gulf
  [8.75, 41.13],
];

const CORSICA = [
  [9.35, 42.98], [9.45, 42.70],                                   // the Sacred cape, the eastern plain
  [9.55, 42.15], [9.40, 41.75],                                   // Aleria, Portus Syracusanus
  [9.28, 41.38], [8.80, 41.55],                                   // the Bonifacio strait, the Valinco gulf
  [8.60, 41.92], [8.68, 42.35],                                   // Aiacium, the Balagne
  [8.75, 42.60], [9.15, 42.72],                                   // Calvi, the Nebbio
];

// The Balearic isles, as one — Mallorca carries the province.
const BALEARES = [
  [2.37, 39.55], [2.65, 39.75], [3.15, 39.95], [3.45, 39.75],
  [3.15, 39.35], [2.75, 39.30], [2.50, 39.42],
];

// Scandia, clipped by the top edge — in the ancient geographers an island, and
// at this frame it genuinely is one. Norway's last 2 px below 58°N are not
// drawn: a sliver that thin reads as a rendering fault, not as a coast.
const SCANDIA = [
  [11.60, 58.00],                                                 // cut at the top edge, the Bohuslan shore
  [11.75, 57.72], [12.05, 57.35],                                 // the Gota's mouth, the Halland coast
  [12.55, 56.70], [12.80, 56.25],                                 // the Halland shore
  [12.85, 55.90], [12.95, 55.55],                                 // the Sound, the Scanian corner
  [13.60, 55.38], [14.20, 55.40],                                 // the south Scanian shore, the Hano bay
  [14.65, 56.05], [15.55, 56.10],                                 // the Blekinge coast
  [16.30, 56.30], [16.45, 56.70],                                 // the sound behind Oland
  [16.65, 57.30], [16.55, 57.75],                                 // the Smaland shore
  [16.90, 58.00],                                                 // cut at the top edge, the Braviken
];

// The Danish isles as one lobe: Funen, Zealand, Lolland and Falster, with the
// Great Belt fused and the Little Belt kept as the water that makes them
// islands at all.
const DANISH_ISLES = [
  [9.80, 55.30], [10.05, 55.60],                                  // the Little Belt, north Funen
  [10.60, 55.60], [10.75, 55.35],                                 // the Odense fjord, the Great Belt
  [11.10, 55.55], [11.20, 55.95],                                 // Zealand's west coast, the Sejero bay
  [11.75, 56.05], [12.35, 56.05],                                 // the Isefjord, the Sound's north gate
  [12.62, 55.70], [12.45, 55.35],                                 // the Sound, Zealand's south shore
  [12.15, 54.95], [11.55, 54.65],                                 // Mon, Falster
  [11.05, 54.72], [10.75, 54.90],                                 // Lolland, the Femer belt
  [10.30, 55.05], [9.90, 55.05],                                  // south Funen, back to the Little Belt
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

// Socotra — Dioscurida of the Periplus, the dragon's-blood island off the
// Horn. The one new landmass of the v7.4 frame that is genuinely an island.
const SOCOTRA = [
  [53.30, 12.70], [53.78, 12.66], [54.20, 12.70], [54.52, 12.58],
  [54.38, 12.35], [53.85, 12.30], [53.42, 12.42],
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
  // v7.4: the Caspian, whole and landlocked. The v6.8 frame cut it at 53.5°E
  // and drew it as a notch of the mainland ring, open at the map's edge; at
  // 63.5°E nothing cuts it, so it is what it geographically is — a closed
  // inland sea. The tracing is v5.4/v6.8's own, unchanged, plus the southeast
  // shore (Cheleken to the Gorgan bay) the old edge used to stand in for.
  // computeGeometry classifies it open sea by AREA (a landlocked body over
  // ~3 sq° is an inland sea, not a lake), so Hyrcania keeps its harbor.
  [
    // the south shore, westward: Hyrcania, Tabaristan, Gilan
    [54.02, 36.88], [53.40, 36.70], [52.20, 36.62], [51.40, 36.72], [50.60, 36.90],
    [50.00, 37.15], [49.55, 37.45],
    // the west shore, northward: Talysh, the Kura mouth, Absheron, Derbent
    [49.30, 37.90], [48.90, 38.40], [48.85, 38.90], [49.15, 39.40],
    [49.35, 39.85], [50.30, 40.25],
    [49.80, 40.60], [49.55, 41.10], [48.95, 41.55], [48.55, 42.00],
    [48.29, 42.06],
    [47.85, 42.60], [47.50, 42.98], [47.60, 43.60], [47.55, 43.95],
    [47.15, 44.45], [47.35, 45.35],
    // the north shore, eastward: the Rha's delta, the Rhymnus' mouth
    [47.95, 45.65], [48.60, 45.75], [49.10, 46.05], [49.55, 46.40],
    [50.30, 46.75], [51.20, 46.95], [51.90, 47.05],
    // the east shore, southward: Mangyshlak, the Kara-Bogaz bar, Cheleken
    [52.60, 46.65], [53.10, 45.95], [52.20, 45.45], [51.60, 45.32],
    [50.28, 44.51], [50.90, 44.00], [51.15, 43.65], [51.75, 43.10],
    [52.35, 42.55], [52.70, 41.85], [52.97, 40.60], [52.97, 40.02],
    [53.12, 39.44], [53.30, 38.80],
    // the southeast shore the old frame edge cut: the Turkmen coast, the
    // Atrek's mouth, the Gorgan bay
    [53.62, 38.30], [53.90, 37.70], [53.85, 37.30],
  ],
  // The Aral — the Oxus' own sea, over the inland-sea floor like the Caspian
  [
    [58.40, 45.15], [58.30, 44.30], [58.65, 43.75], [59.35, 43.60], [60.15, 43.70],
    [60.90, 43.95], [61.25, 44.45], [61.05, 45.10], [61.35, 45.65], [61.55, 46.10],
    [61.00, 46.40], [60.25, 46.45], [59.55, 46.28], [58.95, 45.92], [58.55, 45.60],
  ],
  // Lake Tana, the Blue Nile's spring
  [
    [36.92, 12.28], [37.30, 12.35], [37.58, 12.18], [37.52, 11.85], [37.15, 11.72], [36.88, 11.95],
  ],
  // Lake Turkana, clipped just above the south edge so it stays landlocked
  [
    [35.85, 4.55], [36.12, 4.40], [36.05, 3.55], [36.18, 3.10], [35.90, 3.10], [35.82, 3.85],
  ],
  // The Hamun of Sistan, where the Helmand dies
  [
    [61.05, 31.40], [61.45, 31.28], [61.32, 30.88], [60.95, 31.02],
  ],
  // Lake Chad — Ptolemy's lake beyond the desert, where the Chari dies
  [
    [13.60, 13.90], [14.40, 14.10], [14.90, 13.75], [14.60, 13.15], [13.85, 13.25],
  ],
];

// ---------------------------------------------------------------------------
// Rivers (downstream point order; widths 1-3).
// ---------------------------------------------------------------------------

const RIVERS = [
  // v7.4: the Nile carries its whole in-frame length now — the White Nile in
  // at the south edge, the Sudd it barely survives, the confluence at the
  // site of Soba/Khartoum, the six cataracts' great S-bend past Napata, and
  // only then the Egypt every earlier frame started with.
  {
    name: 'Nile', width: 3,
    points: [
      [31.62, 3.05], [31.60, 4.85], [30.55, 6.50], [30.50, 7.90],   // Bahr al-Jabal, into the Sudd
      [31.05, 9.35], [31.66, 9.55],                                 // out of the marsh at Malakal
      [32.10, 11.50], [32.48, 13.20], [32.55, 15.60],               // the White Nile reach, the confluence
      [33.43, 16.55], [33.98, 17.70],                               // past Meroe's island, the Atbara mouth
      [33.90, 18.90], [33.32, 19.54],                               // toward Abu Hamed
      [32.30, 19.15], [31.85, 18.55],                               // the great bend, past Napata
      [31.00, 18.85], [30.48, 19.17],                               // the Dongola reach
      [30.45, 20.20], [30.90, 21.05], [31.35, 21.79],               // the cataract country
      [31.63, 22.34], [32.20, 22.95],
      [32.87, 23.50], [32.90, 24.09], [32.75, 24.70], [32.55, 25.15],
      [32.60, 25.50], [32.64, 25.72], [32.72, 26.19], [32.24, 26.05], [31.70, 26.56],
      [31.18, 27.18], [30.75, 28.10], [31.10, 29.07], [31.25, 29.85], [31.20, 30.20],
    ],
  },
  {
    name: 'Blue Nile', width: 2,
    points: [
      [37.20, 11.68],                                               // out of Lake Tana
      [37.85, 11.15], [38.10, 10.55], [37.60, 9.95],                // the gorge around Gojjam
      [36.60, 10.10], [35.55, 10.70], [34.70, 11.55],
      [33.95, 12.65], [33.20, 13.70], [32.90, 14.75], [32.55, 15.60],
    ],
  },
  {
    name: 'Atbara', width: 1,
    points: [[38.40, 13.55], [37.45, 14.55], [36.40, 15.55], [35.20, 16.65], [33.98, 17.70]],
  },
  {
    name: 'Awash', width: 1,
    points: [[38.65, 8.95], [39.35, 9.30], [40.05, 9.90], [40.80, 10.70], [41.40, 11.10], [41.78, 11.22]],
  },
  {
    name: 'Omo', width: 1,
    points: [[37.45, 8.60], [36.90, 7.40], [36.30, 6.30], [36.10, 5.30], [36.00, 4.62]],
  },
  {
    name: 'Jubba', width: 1,
    points: [[42.10, 4.20], [42.35, 3.60], [42.55, 3.05]],
  },
  {
    name: 'Shebelle', width: 1,
    points: [[39.85, 7.10], [40.90, 6.30], [42.10, 5.55], [43.40, 4.85], [44.80, 3.85], [45.50, 3.05]],
  },
  // The Nigir of Ptolemy: up out of the Guinea highlands, north to the
  // desert's edge, the bend at the caravan crossing, and down to its delta.
  {
    name: 'Nigir', width: 2,
    points: [
      [-10.60, 9.25], [-9.95, 10.60], [-8.30, 12.20], [-6.30, 13.80],
      [-4.80, 15.20], [-3.55, 16.30], [-2.85, 16.90],               // toward the bend
      [-1.45, 16.92], [0.00, 16.45], [0.95, 15.55],                 // the bend, turning south
      [2.10, 14.30], [3.30, 12.60], [4.40, 10.60], [5.55, 8.60],
      [6.30, 6.60], [6.08, 4.35],                                   // to the delta
    ],
  },
  {
    name: 'Chari', width: 1,
    points: [[16.80, 9.00], [15.90, 10.50], [15.20, 11.90], [14.72, 12.98]],
  },
  // The rivers of the Iranian east and the Oxus world
  {
    name: 'Oxus', width: 3,
    points: [
      [63.50, 39.10], [62.85, 39.65], [62.30, 40.10], [61.55, 40.75],
      [60.85, 41.25], [60.30, 41.85], [60.05, 42.60], [59.75, 43.20], [59.62, 43.60],
    ],
  },
  {
    name: 'Murghab', width: 1,
    points: [[63.35, 35.55], [62.85, 36.20], [62.35, 36.85], [61.97, 37.58], [61.70, 38.15]],
  },
  {
    name: 'Hari', width: 1,
    points: [[63.50, 34.28], [62.20, 34.38], [61.30, 34.55], [60.95, 35.30], [60.70, 36.10], [60.48, 37.00], [60.42, 37.52]],
  },
  {
    name: 'Helmand', width: 2,
    points: [[63.50, 30.60], [62.55, 30.75], [61.85, 30.92], [61.44, 31.15]],
  },
  {
    name: 'Atrek', width: 1,
    points: [[58.30, 37.15], [57.30, 37.60], [56.20, 37.85], [55.10, 37.95], [54.30, 37.70], [53.92, 37.42]],
  },
  {
    name: 'Karun', width: 1,
    points: [[49.55, 32.60], [49.05, 32.05], [48.70, 31.55], [48.67, 31.30], [48.20, 30.90], [47.72, 30.62]],
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
  // v6.8 rivers of the western and northern frame. Named as the Romans named
  // them where they had a name; the mouths are pinned to the coastline above,
  // because a river that stops a pixel short of its own delta draws a gap.
  {
    name: 'Rhenus', width: 3,
    points: [
      [9.55, 46.65], [9.25, 47.10], [9.45, 47.55],                  // the Alpine headwaters, the Brigantine lake
      [8.60, 47.60], [7.85, 47.55], [7.60, 48.00],                  // the Rhine knee at Basilia
      [7.75, 48.58], [8.10, 49.00], [8.45, 49.50],                  // Argentorate, the Palatine reach
      [8.27, 50.00], [7.60, 50.36], [7.10, 50.74],                  // Mogontiacum, Confluentes
      [6.96, 50.94], [6.20, 51.60], [5.86, 51.84],                  // Colonia, the Batavian island
      [4.90, 51.95], [4.10, 51.98],                                 // the delta, into the ocean
    ],
  },
  {
    name: 'Danuvius', width: 3,
    points: [
      [8.52, 47.95], [9.80, 48.55], [11.00, 48.75], [12.10, 48.75], // the Suebian springs, Regina Castra
      [13.45, 48.57], [14.50, 48.35], [15.60, 48.25], [16.40, 48.15],
      [16.91, 48.11], [17.75, 47.75], [18.75, 47.80], [19.05, 47.55], // Carnuntum, the Pannonian bend
      [18.95, 46.60], [19.05, 45.85], [19.61, 45.25], [20.35, 44.90], // Aquincum's reach, the Savus' meeting
      [21.30, 44.65], [22.30, 44.55], [22.70, 44.05],                 // the Iron Gates
      [23.60, 43.80], [25.40, 43.62], [26.90, 44.05],                 // the Moesian bank, Durostorum
      [27.90, 44.60], [28.85, 45.15], [29.67, 45.22],                 // the delta
    ],
  },
  {
    name: 'Savus', width: 1,
    points: [[14.15, 46.10], [15.20, 45.85], [16.37, 45.49], [17.50, 45.20], [18.70, 45.05], [20.35, 44.90]],
  },
  {
    name: 'Rhodanus', width: 2,
    points: [
      [6.85, 46.40], [6.15, 46.20], [5.30, 45.90], [4.83, 45.76],   // the Lemannus lake, Lugdunum
      [4.80, 45.10], [4.75, 44.35], [4.65, 43.95], [4.85, 43.35],   // the Vienne reach, the delta
    ],
  },
  {
    name: 'Liger', width: 2,
    points: [
      [4.05, 44.85], [3.90, 45.75], [2.95, 46.55], [2.40, 47.08],   // the Cevennes springs, Avaricum's reach
      [1.90, 47.90], [0.70, 47.40], [-0.55, 47.42], [-1.55, 47.28], // Cenabum, Caesarodunum, Iuliomagus
      [-2.20, 47.27],
    ],
  },
  {
    name: 'Sequana', width: 2,
    points: [[4.70, 47.80], [3.55, 48.30], [2.35, 48.85], [1.55, 49.10], [1.10, 49.44], [0.20, 49.44]],
  },
  {
    name: 'Garumna', width: 2,
    points: [[0.70, 42.85], [1.44, 43.60], [0.60, 44.35], [-0.57, 44.85], [-0.75, 45.20], [-1.05, 45.58]],
  },
  {
    name: 'Albis', width: 2,
    points: [
      [15.20, 50.05], [14.42, 50.08], [13.85, 50.80], [13.10, 51.35], // the Bohemian springs, the Sudeten gate
      [12.20, 51.85], [11.65, 52.15], [10.60, 53.05], [9.95, 53.55],
      [8.90, 53.90],
    ],
  },
  {
    name: 'Viadua', width: 2,
    points: [[18.30, 49.85], [17.55, 50.45], [16.90, 51.10], [15.60, 51.90], [14.60, 52.60], [14.55, 53.30], [14.25, 53.93]],
  },
  {
    name: 'Vistula', width: 2,
    points: [[19.15, 49.60], [19.95, 50.05], [20.55, 51.30], [21.05, 52.25], [19.90, 53.05], [18.95, 53.75], [18.70, 54.38]],
  },
  {
    name: 'Borysthenes', width: 3,
    points: [
      [32.30, 55.15], [31.20, 54.20], [30.60, 53.15], [30.30, 52.15], // the Venedic springs
      [30.90, 51.20], [30.52, 50.45], [32.10, 49.40],                 // the Pripet meeting, the Kyivan reach
      [33.60, 48.50], [35.00, 48.45], [35.15, 47.75],                 // the rapids
      [34.10, 47.10], [32.55, 46.60], [31.90, 46.65],                 // into the liman
    ],
  },
  {
    name: 'Tyras', width: 1,
    points: [[24.55, 49.05], [26.20, 48.55], [27.60, 48.30], [28.85, 47.30], [29.90, 46.70], [30.35, 46.20]],
  },
  {
    name: 'Tanais', width: 2,
    points: [
      [38.15, 54.30], [38.90, 53.35], [39.70, 52.30], [40.55, 51.35],
      [42.40, 50.60], [43.85, 49.60], [42.10, 48.50], [40.55, 47.75], [39.30, 47.12],
    ],
  },
  {
    name: 'Rha', width: 3,
    points: [
      [32.55, 57.25], [34.45, 57.05], [35.90, 56.86], [37.35, 57.00], // the Valdai springs, Tver's reach
      [38.85, 57.65], [40.95, 57.62], [43.10, 56.55], [44.00, 56.33], // the great northern bend
      [45.65, 55.85], [47.50, 55.90], [49.10, 55.75], [49.40, 54.65], // Kazan's reach
      [48.35, 53.50], [50.10, 53.20], [48.80, 51.80], [47.40, 50.35], // the Samara bend
      [46.05, 49.30], [44.80, 48.70], [46.10, 47.55], [47.30, 46.85], // the Volgograd elbow
      [48.05, 46.35], [48.60, 45.75],                                 // Astrakhan's reach, the delta
    ],
  },
  {
    name: 'Rhymnus', width: 1,
    points: [[53.50, 51.35], [52.35, 51.20], [51.40, 51.20], [51.90, 50.10], [51.55, 49.05], [51.40, 48.00], [51.90, 47.05]],
  },
  {
    name: 'Iberus', width: 2,
    points: [[-4.05, 42.95], [-3.10, 42.60], [-2.00, 42.45], [-0.88, 41.65], [0.10, 41.15], [0.72, 40.62], [0.87, 40.72]],
  },
  {
    name: 'Tagus', width: 2,
    points: [[-1.65, 40.35], [-3.05, 40.10], [-4.02, 39.86], [-5.60, 39.60], [-7.05, 39.45], [-8.35, 39.00], [-9.15, 38.70]],
  },
  {
    name: 'Baetis', width: 2,
    points: [[-2.95, 37.95], [-3.80, 37.90], [-4.78, 37.88], [-5.55, 37.60], [-6.00, 37.38], [-6.20, 37.05], [-6.35, 36.80]],
  },
  {
    name: 'Durius', width: 2,
    points: [[-2.95, 41.85], [-4.20, 41.60], [-5.45, 41.60], [-6.55, 41.35], [-7.55, 41.20], [-8.67, 41.14]],
  },
  {
    name: 'Anas', width: 1,
    points: [[-2.90, 38.90], [-4.30, 38.95], [-5.55, 38.95], [-6.34, 38.92], [-7.00, 38.20], [-7.40, 37.18]],
  },
  {
    name: 'Padus', width: 3,
    points: [
      [7.15, 44.70], [7.68, 45.07], [8.65, 45.10], [9.65, 45.10],
      [10.30, 45.05], [11.00, 45.05], [11.80, 44.95], [12.50, 44.85],
    ],
  },
  {
    name: 'Tamesis', width: 1,
    points: [[-1.70, 51.70], [-1.05, 51.60], [-0.09, 51.51], [0.45, 51.45], [0.90, 51.45]],
  },
  {
    name: 'Hebrus', width: 1,
    points: [[23.70, 42.25], [24.75, 42.14], [25.65, 41.90], [26.25, 41.55], [26.35, 41.00], [26.05, 40.72]],
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
  P('Adora', 34.95, 31.40, 0.95, 'ROM', 'hills', 'livestock', 'judaism', 'idumean', 2, 2, 2, 0),
  P('Sebaste', 35.19, 32.28, 0.80, 'ROM', 'hills', 'wine', 'hellenism', 'greek', 4, 4, 3, 0),
  // Name anachronism (SPEC-pinned): Flavia Neapolis was founded 72/73 CE; in 66 the
  // town below Gerizim was Shechem (Josephus' Mabartha). Rename needs a SPEC pass.
  P('Neapolis', 35.27, 32.22, 0.75, 'ROM', 'hills', 'olive_oil', 'samaritanism', 'samaritan', 4, 4, 4, 0,
    { holy: 'gerizim' }),
  P('Antipatris', 34.93, 32.10, 0.75, 'ROM', 'farmland', 'grain', 'judaism', 'judean', 3, 4, 3, 0),
  P('Caesarea Maritima', 34.94, 32.49, 0.75, 'ROM', 'coast', 'fish', 'hellenism', 'greek', 6, 7, 4, 0),
  P('Dora', 34.98, 32.62, 0.75, 'ROM', 'coast', 'purple_dye', 'hellenism', 'phoenician', 3, 4, 2, 0),
  P('Ptolemais', 35.11, 32.91, 0.82, 'ROM', 'coast', 'glass', 'hellenism', 'phoenician', 4, 5, 3, 0),
  P('Scythopolis', 35.50, 32.50, 0.80, 'ROM', 'farmland', 'grain', 'hellenism', 'greek', 4, 5, 3, 0),
  P('Pella', 35.61, 32.45, 0.80, 'ROM', 'hills', 'wine', 'hellenism', 'greek', 3, 3, 3, 0),
  P('Gadara', 35.68, 32.65, 0.75, 'ROM', 'hills', 'olive_oil', 'hellenism', 'greek', 4, 4, 3, 0),
  P('Gerasa', 35.89, 32.28, 0.90, 'ROM', 'hills', 'wine', 'hellenism', 'greek', 4, 4, 3, 0),
  P('Philadelphia', 35.93, 31.95, 0.90, 'ROM', 'drylands', 'livestock', 'hellenism', 'greek', 2, 3, 2, 0),
  // --- Kingdom of Agrippa II (AGR) -----------------------------------------
  P('Caesarea Philippi', 35.69, 33.25, 0.70, 'AGR', 'hills', 'livestock', 'hellenism', 'aramean', 3, 4, 2, 0),
  P('Batanea', 36.25, 32.90, 1.10, 'AGR', 'farmland', 'grain', 'judaism', 'galilean', 3, 4, 4, 0),
  P('Gamala', 35.74, 32.90, 0.75, 'AGR', 'hills', 'olive_oil', 'judaism', 'galilean', 3, 3, 3, 2),
  // --- Phoenicia (ROM) ------------------------------------------------------
  P('Tyre', 35.25, 33.26, 0.75, 'ROM', 'coast', 'purple_dye', 'hellenism', 'phoenician', 5, 8, 3, 0),
  P('Sidon', 35.42, 33.56, 0.75, 'ROM', 'coast', 'glass', 'hellenism', 'phoenician', 4, 6, 3, 0),
  P('Berytus', 35.53, 33.88, 0.75, 'ROM', 'coast', 'timber', 'hellenism', 'phoenician', 4, 5, 3, 0),
  P('Byblos', 35.70, 34.11, 0.75, 'ROM', 'coast', 'timber', 'hellenism', 'phoenician', 2, 3, 2, 0),
  P('Tripolis', 35.90, 34.42, 0.80, 'ROM', 'coast', 'fish', 'hellenism', 'phoenician', 2, 3, 1, 0),
  P('Aradus', 35.97, 34.85, 0.85, 'ROM', 'coast', 'fish', 'hellenism', 'phoenician', 3, 4, 2, 0),
  // --- Syria & Anatolia (ROM) ----------------------------------------------
  P('Damascus', 36.30, 33.51, 0.90, 'ROM', 'drylands', 'grain', 'hellenism', 'aramean', 5, 5, 4, 0),
  P('Chalcis', 35.93, 33.73, 1.00, 'ROM', 'hills', 'wine', 'hellenism', 'aramean', 2, 2, 1, 0),
  P('Emesa', 36.72, 34.73, 1.00, 'ROM', 'drylands', 'grain', 'hellenism', 'aramean', 3, 3, 3, 0),
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
  P('Petra', 35.44, 30.32, 1.20, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 3, 5, 1, 2,
    { wonder: 'petra' }),
  P('Bostra', 36.48, 32.52, 1.10, 'NAB', 'drylands', 'grain', 'nabataean', 'nabataean', 2, 3, 1, 0),
  P('Oboda', 34.78, 30.79, 1.30, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 1, 1, 0, 0),
  P('Aila', 35.08, 29.62, 1.10, 'NAB', 'desert', 'spices', 'nabataean', 'nabataean', 2, 2, 0, 0),
  P('Hegra', 37.95, 26.80, 1.80, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 1, 2, 1, 0),
  P('Dumatha', 39.87, 29.80, 2.00, 'NAB', 'desert', 'livestock', 'nabataean', 'arab', 1, 1, 1, 0),
  P('Medaba', 35.80, 31.72, 0.95, 'NAB', 'drylands', 'livestock', 'nabataean', 'nabataean', 1, 2, 2, 0),
  // --- Parthia & the east (PAR) --------------------------------------------
  P('Edessa', 38.79, 37.16, 0.95, 'OSR', 'hills', 'grain', 'hellenism', 'aramean', 4, 5, 4, 0),
  P('Carrhae', 39.03, 36.87, 1.00, 'OSR', 'drylands', 'grain', 'hellenism', 'aramean', 3, 3, 3, 0),
  P('Nisibis', 41.22, 37.07, 1.10, 'ADI', 'drylands', 'grain', 'zoroastrianism', 'aramean', 4, 5, 4, 0),
  P('Singara', 41.85, 36.33, 1.20, 'PAR', 'drylands', 'livestock', 'zoroastrianism', 'aramean', 2, 3, 2, 0),
  P('Hatra', 42.72, 35.59, 1.50, 'PAR', 'desert', 'livestock', 'hellenism', 'aramean', 1, 2, 1, 0),
  P('Arbela', 44.01, 36.19, 1.10, 'ADI', 'hills', 'grain', 'judaism', 'aramean', 2, 2, 3, 0),
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
  // Egypt's Eastern Desert is the ground between the Nile and the Red Sea —
  // NOT the Sinai peninsula and not north-west Arabia. Its old weight let the
  // cell jump both gulfs and swallow the peninsula's tip and the Tabuk
  // approaches; the envelope below (provinceRasterRegions) holds it to its own
  // side of the water, and the lighter weight keeps it from fighting Thebes
  // and Myos Hormos for the coast.
  P('Eastern Desert', 32.80, 27.20, 1.20, 'WASTE', 'wasteland', 'salt', 'egyptian', 'egyptian', 1, 1, 1, 0,
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
  P('Nahariya', 35.10, 32.99, 0.68, 'ROM', 'coast', 'fish', 'hellenism', 'phoenician', 1, 1, 1, 0,
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
  P('Beersheba', 34.79, 31.25, 0.72, 'NAB', 'drylands', 'livestock', 'nabataean', 'idumean', 1, 1, 0, 0,
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
  P('Paran', 34.88, 29.92, 0.95, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 1, 0, 0, 0,
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
  P('Azraq', 37.20, 32.00, 1.15, 'NAB', 'desert', 'livestock', 'nabataean', 'arab', 1, 0, 0, 0,
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
  P('Zoara', 35.50, 30.90, 0.90, 'NAB', 'desert', 'salt', 'nabataean', 'nabataean', 1, 1, 0, 0,
    { latentParent: 'Petra' }),

  // --- v6.8: the western and northern frame (SPEC §160) ---------------------
  // Appended, so no save ID shifts. These cells exist because the frame moved:
  // without a seed in Gaul the weighted diagram hands Gaul to Sabratha, and
  // Britain to whichever Italian cell wins the argument. Every one of them
  // carries real terrain, goods, culture and faith.
  //
  // OWNERSHIP IS DELIBERATELY WASTE, and this is the seam this commit stops
  // at. Rome held most of this ground in 66 CE, the base atlas's year — but
  // the base owner is what every bookmark inherits unless its `owners` table
  // says otherwise, so shipping these as ROM would hand Rome ~90 provinces in
  // 167 BCE, 67 BCE, 40 BCE and every other chapter at once. That is not a
  // cartography change; it is a balance change to eight tuned campaigns, and
  // it belongs in its own section with its own harness run. Until then the
  // west is on the map as what this game currently models it as: land, with
  // people and produce on it, outside every state the chapters play.
  //
  // The gating the plan called for is the second half: one always-on cell per
  // region, and finer cells latent beneath it, so a bookmark that wants
  // Londinium as its own province activates it and every bookmark that does
  // not never sees a British province at all.
  //
  // -- Africa: the Maghreb from the Syrtis Minor to the Atlantic ------------
  P('Carthago', 10.20, 36.72, 0.85, 'WASTE', 'coast', 'grain', 'punic', 'phoenician', 6, 7, 4, 1,
    { habitation: 'urban', settleable: false }),
  P('Hadrumetum', 10.55, 35.75, 0.90, 'WASTE', 'coast', 'olive_oil', 'punic', 'phoenician', 4, 5, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Thysdrus', 10.70, 35.28, 1.00, 'WASTE', 'farmland', 'olive_oil', 'punic', 'phoenician', 3, 4, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Tacape', 9.95, 33.98, 1.20, 'WASTE', 'coast', 'dates', 'punic', 'mauri', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Capsa', 8.70, 34.42, 1.30, 'WASTE', 'drylands', 'dates', 'punic', 'mauri', 2, 2, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Theveste', 8.12, 35.40, 1.10, 'WASTE', 'hills', 'olive_oil', 'punic', 'mauri', 3, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Hippo Regius', 7.65, 36.70, 0.95, 'WASTE', 'coast', 'grain', 'punic', 'phoenician', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Cirta', 6.61, 36.30, 1.15, 'WASTE', 'hills', 'grain', 'punic', 'mauri', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Saldae', 4.95, 36.55, 1.05, 'WASTE', 'coast', 'timber', 'punic', 'mauri', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Icosium', 3.06, 36.60, 1.10, 'WASTE', 'coast', 'fish', 'punic', 'mauri', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Caesarea Mauretaniae', 1.90, 36.30, 1.10, 'WASTE', 'coast', 'grain', 'punic', 'mauri', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Portus Magnus', -0.60, 35.45, 1.20, 'WASTE', 'coast', 'fish', 'punic', 'mauri', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Volubilis', -5.55, 34.07, 1.15, 'WASTE', 'hills', 'olive_oil', 'punic', 'mauri', 3, 3, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Tingis', -5.70, 35.55, 0.95, 'WASTE', 'coast', 'purple_dye', 'punic', 'phoenician', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Sala', -6.70, 33.95, 1.05, 'WASTE', 'coast', 'fish', 'punic', 'mauri', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Atlas', -6.20, 31.60, 1.60, 'WASTE', 'mountains', 'silver', 'punic', 'mauri', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Gaetulia', -4.50, 30.20, 1.70, 'WASTE', 'drylands', 'livestock', 'punic', 'mauri', 1, 1, 1, 0,
    { habitation: 'frontier', settleable: false }),
  P('Western Sahara', -5.00, 25.60, 2.40, 'WASTE', 'wasteland', 'salt', 'punic', 'mauri', 1, 1, 1, 0,
    { impassable: true }),
  P('Numidian Sahara', 4.00, 28.20, 2.40, 'WASTE', 'wasteland', 'salt', 'punic', 'mauri', 1, 1, 1, 0,
    { impassable: true }),
  P('Garama', 12.50, 26.30, 1.80, 'WASTE', 'desert', 'dates', 'punic', 'mauri', 1, 2, 1, 0,
    { habitation: 'frontier', settleable: false }),
  // -- Hispania -------------------------------------------------------------
  P('Gades', -6.20, 36.60, 0.85, 'WASTE', 'coast', 'purple_dye', 'punic', 'phoenician', 4, 5, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Corduba', -4.78, 37.88, 1.00, 'WASTE', 'farmland', 'olive_oil', 'roman_cult', 'iberian', 5, 6, 3, 0,
    { habitation: 'urban', settleable: false }),
  P('Hispalis', -5.95, 37.39, 0.90, 'WASTE', 'farmland', 'grain', 'punic', 'iberian', 4, 5, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Malaca', -4.42, 36.78, 0.85, 'WASTE', 'coast', 'fish', 'punic', 'phoenician', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Carthago Nova', -1.10, 37.68, 1.00, 'WASTE', 'coast', 'silver', 'punic', 'iberian', 4, 5, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Toletum', -4.02, 39.86, 1.20, 'WASTE', 'hills', 'livestock', 'druidic', 'iberian', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Emerita', -6.34, 38.92, 1.15, 'WASTE', 'farmland', 'grain', 'roman_cult', 'iberian', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Olisipo', -8.95, 38.78, 0.95, 'WASTE', 'coast', 'fish', 'druidic', 'iberian', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Bracara', -8.30, 41.55, 1.00, 'WASTE', 'hills', 'timber', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Asturica', -6.06, 42.46, 1.20, 'WASTE', 'mountains', 'silver', 'druidic', 'celtic', 2, 4, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Tarraco', 1.20, 41.20, 0.85, 'WASTE', 'coast', 'wine', 'roman_cult', 'iberian', 4, 5, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Caesaraugusta', -0.88, 41.65, 1.10, 'WASTE', 'farmland', 'grain', 'roman_cult', 'iberian', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Valentia', -0.55, 39.42, 0.90, 'WASTE', 'coast', 'wine', 'punic', 'iberian', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Numantia', -2.45, 41.75, 1.10, 'WASTE', 'hills', 'livestock', 'druidic', 'celtic', 2, 2, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Salmantica', -5.66, 40.97, 1.20, 'WASTE', 'drylands', 'livestock', 'druidic', 'celtic', 2, 2, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Barcino', 2.05, 41.55, 0.85, 'WASTE', 'coast', 'wine', 'roman_cult', 'iberian', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Emporiae', 2.95, 42.15, 0.85, 'WASTE', 'coast', 'fish', 'hellenism', 'greek', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Baleares', 2.90, 39.60, 0.80, 'WASTE', 'coast', 'olive_oil', 'punic', 'phoenician', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  // -- Gallia, the Rhine and the Alpine provinces ---------------------------
  P('Narbo', 2.95, 43.20, 0.90, 'WASTE', 'coast', 'wine', 'roman_cult', 'celtic', 4, 5, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Massilia', 5.45, 43.42, 0.80, 'WASTE', 'coast', 'wine', 'hellenism', 'greek', 4, 6, 3, 0,
    { habitation: 'urban', settleable: false }),
  P('Nemausus', 4.36, 43.84, 0.85, 'WASTE', 'farmland', 'wine', 'roman_cult', 'celtic', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Tolosa', 1.44, 43.60, 1.05, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Burdigala', -0.58, 44.84, 1.10, 'WASTE', 'farmland', 'wine', 'druidic', 'celtic', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Lugdunum', 4.83, 45.76, 0.95, 'WASTE', 'farmland', 'wine', 'roman_cult', 'celtic', 5, 6, 4, 0,
    { habitation: 'urban', settleable: false }),
  P('Augustodunum', 4.30, 46.95, 1.05, 'WASTE', 'hills', 'livestock', 'druidic', 'celtic', 3, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Avaricum', 2.40, 47.08, 1.05, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 3, 4, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Limonum', 0.34, 46.58, 1.05, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Condate', -1.68, 48.11, 1.05, 'WASTE', 'hills', 'livestock', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Darioritum', -2.76, 47.72, 0.95, 'WASTE', 'coast', 'fish', 'druidic', 'celtic', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Lutetia', 2.35, 48.85, 1.00, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Rotomagus', 1.10, 49.35, 0.95, 'WASTE', 'coast', 'timber', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Samarobriva', 2.30, 49.89, 0.95, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Gesoriacum', 1.85, 50.55, 0.90, 'WASTE', 'coast', 'fish', 'druidic', 'celtic', 2, 3, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Durocortorum', 4.03, 49.25, 1.05, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Augusta Treverorum', 6.64, 49.76, 0.95, 'WASTE', 'hills', 'wine', 'roman_cult', 'celtic', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Colonia Agrippina', 6.96, 50.94, 0.95, 'WASTE', 'farmland', 'grain', 'germanic_cult', 'germanic', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Mogontiacum', 8.27, 50.00, 0.95, 'WASTE', 'farmland', 'wine', 'roman_cult', 'celtic', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Argentorate', 7.75, 48.58, 0.95, 'WASTE', 'farmland', 'timber', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Batavia', 5.60, 51.90, 1.00, 'WASTE', 'marsh', 'fish', 'germanic_cult', 'germanic', 1, 2, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Vesontio', 6.02, 47.24, 0.95, 'WASTE', 'hills', 'salt', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Genava', 6.15, 46.20, 0.95, 'WASTE', 'hills', 'timber', 'druidic', 'celtic', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Augusta Vindelicorum', 10.90, 48.37, 1.10, 'WASTE', 'hills', 'livestock', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Virunum', 14.35, 46.70, 1.10, 'WASTE', 'mountains', 'silver', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  // -- Italia beyond the old frame, and the Tyrrhenian islands --------------
  P('Mediolanum', 9.19, 45.46, 0.90, 'WASTE', 'farmland', 'grain', 'roman_cult', 'roman', 5, 6, 4, 0,
    { habitation: 'urban', settleable: false }),
  P('Genua', 8.93, 44.52, 0.85, 'WASTE', 'coast', 'timber', 'roman_cult', 'roman', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Bononia', 11.35, 44.50, 0.90, 'WASTE', 'farmland', 'grain', 'roman_cult', 'roman', 4, 5, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Ravenna', 12.10, 44.40, 0.85, 'WASTE', 'marsh', 'fish', 'roman_cult', 'roman', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Pisae', 10.45, 43.75, 0.85, 'WASTE', 'coast', 'timber', 'roman_cult', 'roman', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Ancona', 13.35, 43.55, 0.85, 'WASTE', 'coast', 'fish', 'roman_cult', 'roman', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Aquileia', 13.20, 45.80, 0.90, 'WASTE', 'coast', 'wine', 'roman_cult', 'roman', 4, 5, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Aleria', 9.10, 42.20, 0.85, 'WASTE', 'hills', 'timber', 'roman_cult', 'roman', 2, 2, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Caralis', 9.15, 39.45, 1.00, 'WASTE', 'coast', 'grain', 'punic', 'phoenician', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Turris Libisonis', 8.70, 40.70, 1.00, 'WASTE', 'hills', 'silver', 'punic', 'phoenician', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  // -- Britannia and Hibernia -----------------------------------------------
  // Britannia and Hibernia are the always-on cells. Everything finer here is
  // latent beneath them, so 167 BCE has an island and not a province list.
  P('Britannia', -1.60, 52.30, 1.60, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Londinium', -0.09, 51.51, 0.85, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 4, 5, 3, 0,
    { habitation: 'town', settleable: false, latentParent: 'Britannia' }),
  P('Camulodunum', 0.85, 51.85, 0.85, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 3, 4, 3, 0,
    { habitation: 'town', settleable: false, latentParent: 'Britannia' }),
  P('Durovernum', 1.05, 51.20, 0.80, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false, latentParent: 'Britannia' }),
  P('Venta Belgarum', -1.31, 51.02, 0.90, 'WASTE', 'farmland', 'livestock', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false, latentParent: 'Britannia' }),
  P('Corinium', -1.97, 51.72, 0.95, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false, latentParent: 'Britannia' }),
  P('Isca Dumnoniorum', -3.53, 50.72, 1.00, 'WASTE', 'hills', 'livestock', 'druidic', 'celtic', 2, 2, 3, 0,
    { habitation: 'rural', settleable: false, latentParent: 'Britannia' }),
  P('Dumnonia', -4.80, 50.38, 0.95, 'WASTE', 'coast', 'silver', 'druidic', 'celtic', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false, latentParent: 'Britannia' }),
  P('Isca Silurum', -2.95, 51.62, 0.95, 'WASTE', 'hills', 'silver', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false, latentParent: 'Britannia' }),
  P('Cambria', -3.75, 52.55, 1.05, 'WASTE', 'mountains', 'livestock', 'druidic', 'celtic', 1, 2, 3, 0,
    { habitation: 'rural', settleable: false, latentParent: 'Britannia' }),
  P('Deva', -2.89, 53.19, 0.95, 'WASTE', 'hills', 'salt', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false, latentParent: 'Britannia' }),
  P('Lindum', -0.54, 53.23, 1.00, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false, latentParent: 'Britannia' }),
  P('Eboracum', -1.08, 53.96, 1.00, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 3, 3, 3, 0,
    { habitation: 'town', settleable: false, latentParent: 'Britannia' }),
  P('Brigantia', -2.20, 54.55, 1.15, 'WASTE', 'mountains', 'livestock', 'druidic', 'celtic', 1, 2, 3, 0,
    { habitation: 'rural', settleable: false, latentParent: 'Britannia' }),
  P('Caledonia', -4.20, 56.55, 1.50, 'WASTE', 'mountains', 'livestock', 'druidic', 'celtic', 1, 1, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Caledonia Ultima', -4.00, 57.45, 1.30, 'WASTE', 'mountains', 'timber', 'druidic', 'celtic', 1, 1, 2, 0,
    { habitation: 'frontier', settleable: false, latentParent: 'Caledonia' }),
  P('Hibernia', -6.70, 53.20, 1.35, 'WASTE', 'farmland', 'livestock', 'druidic', 'celtic', 1, 2, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Hibernia Occidentalis', -9.00, 53.35, 1.30, 'WASTE', 'hills', 'livestock', 'druidic', 'celtic', 1, 1, 2, 0,
    { habitation: 'frontier', settleable: false, latentParent: 'Hibernia' }),
  P('Mumu', -8.60, 52.15, 1.20, 'WASTE', 'hills', 'livestock', 'druidic', 'celtic', 1, 2, 2, 0,
    { habitation: 'rural', settleable: false, latentParent: 'Hibernia' }),
  // -- Germania, the Cimbric peninsula and the Suebian sea ------------------
  P('Chatti', 9.30, 51.10, 1.20, 'WASTE', 'hills', 'timber', 'germanic_cult', 'germanic', 1, 2, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Teutoburgium', 8.60, 52.20, 1.20, 'WASTE', 'hills', 'timber', 'germanic_cult', 'germanic', 1, 2, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Frisia', 6.30, 53.05, 1.10, 'WASTE', 'marsh', 'fish', 'germanic_cult', 'germanic', 1, 2, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Semnones', 12.80, 52.40, 1.35, 'WASTE', 'hills', 'timber', 'germanic_cult', 'germanic', 1, 1, 3, 0,
    { habitation: 'frontier', settleable: false }),
  P('Boiohaemum', 14.42, 49.85, 1.20, 'WASTE', 'hills', 'timber', 'germanic_cult', 'germanic', 1, 2, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Cimbria', 9.30, 56.20, 1.10, 'WASTE', 'hills', 'livestock', 'germanic_cult', 'germanic', 1, 2, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Selandia', 11.60, 55.72, 0.95, 'WASTE', 'coast', 'fish', 'germanic_cult', 'germanic', 1, 2, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Scandia', 13.80, 56.20, 1.20, 'WASTE', 'hills', 'timber', 'germanic_cult', 'germanic', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Gothiscandza', 18.90, 53.30, 1.30, 'WASTE', 'marsh', 'timber', 'germanic_cult', 'germanic', 1, 1, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Aestii', 22.60, 55.20, 1.30, 'WASTE', 'marsh', 'glass', 'germanic_cult', 'germanic', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  // -- Illyricum, the Danube, Thrace and Dacia ------------------------------
  P('Salona', 16.60, 43.60, 0.95, 'WASTE', 'coast', 'wine', 'hellenism', 'illyrian', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Delminium', 17.60, 43.75, 1.05, 'WASTE', 'mountains', 'livestock', 'thracian_cult', 'illyrian', 1, 2, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Siscia', 16.37, 45.49, 1.05, 'WASTE', 'farmland', 'grain', 'thracian_cult', 'illyrian', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Carnuntum', 16.91, 48.11, 1.05, 'WASTE', 'farmland', 'grain', 'druidic', 'celtic', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Aquincum', 19.05, 47.40, 1.10, 'WASTE', 'farmland', 'grain', 'thracian_cult', 'illyrian', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Sirmium', 19.61, 45.00, 1.00, 'WASTE', 'farmland', 'grain', 'thracian_cult', 'illyrian', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Singidunum', 20.46, 44.82, 0.95, 'WASTE', 'farmland', 'grain', 'thracian_cult', 'illyrian', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Naissus', 21.90, 43.32, 1.05, 'WASTE', 'hills', 'silver', 'thracian_cult', 'thracian', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Serdica', 23.32, 42.70, 1.00, 'WASTE', 'hills', 'grain', 'thracian_cult', 'thracian', 2, 3, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Philippopolis', 24.75, 42.14, 1.00, 'WASTE', 'farmland', 'wine', 'thracian_cult', 'thracian', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Novae', 25.40, 43.62, 1.05, 'WASTE', 'farmland', 'grain', 'thracian_cult', 'thracian', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Tomis', 28.45, 44.17, 1.00, 'WASTE', 'coast', 'grain', 'hellenism', 'greek', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Sarmizegetusa', 23.20, 45.52, 1.15, 'WASTE', 'mountains', 'silver', 'thracian_cult', 'thracian', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Napoca', 23.60, 46.77, 1.15, 'WASTE', 'hills', 'silver', 'thracian_cult', 'thracian', 1, 2, 3, 0,
    { habitation: 'rural', settleable: false }),
  // -- The Pontic steppe, the Tauric Chersonese and Sarmatia ----------------
  P('Tyras', 30.05, 46.40, 1.00, 'WASTE', 'coast', 'grain', 'hellenism', 'greek', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Olbia', 31.80, 46.95, 1.10, 'WASTE', 'steppe', 'grain', 'hellenism', 'greek', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Chersonesus', 33.75, 44.85, 0.95, 'WASTE', 'coast', 'fish', 'hellenism', 'greek', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Panticapaeum', 36.10, 45.25, 0.95, 'WASTE', 'coast', 'grain', 'hellenism', 'greek', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  // The Asian side of the Kimmerian Bosporus needs its own seed: without one
  // Panticapaeum's cell jumped the strait and the piece it took over there was
  // nearly three times the size of the piece holding its own seed.
  P('Phanagoria', 37.60, 45.10, 1.00, 'WASTE', 'marsh', 'fish', 'hellenism', 'greek', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Tauria', 34.30, 45.55, 1.00, 'WASTE', 'steppe', 'livestock', 'steppe_cults', 'sarmatian', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Tanais', 39.05, 47.30, 1.10, 'WASTE', 'marsh', 'fish', 'hellenism', 'greek', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Scythia', 32.50, 48.30, 1.80, 'WASTE', 'steppe', 'grain', 'steppe_cults', 'sarmatian', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Sarmatia', 38.00, 50.20, 2.00, 'WASTE', 'steppe', 'livestock', 'steppe_cults', 'sarmatian', 1, 1, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Borysthenia', 29.50, 51.50, 1.80, 'WASTE', 'marsh', 'timber', 'steppe_cults', 'sarmatian', 1, 1, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Roxolania', 43.50, 48.50, 2.00, 'WASTE', 'steppe', 'livestock', 'steppe_cults', 'sarmatian', 1, 1, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Aorsia', 49.50, 47.00, 1.90, 'WASTE', 'steppe', 'livestock', 'steppe_cults', 'sarmatian', 1, 1, 1, 0,
    { habitation: 'frontier', settleable: false }),
  P('Rha', 45.00, 54.00, 2.20, 'WASTE', 'marsh', 'timber', 'steppe_cults', 'sarmatian', 1, 1, 1, 0,
    { habitation: 'frontier', settleable: false }),
  P('Hyperborea', 35.50, 55.50, 2.20, 'WASTE', 'marsh', 'timber', 'steppe_cults', 'sarmatian', 1, 1, 1, 0,
    { habitation: 'frontier', settleable: false }),
  P('Venedia', 26.50, 53.50, 1.60, 'WASTE', 'marsh', 'timber', 'steppe_cults', 'sarmatian', 1, 1, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Ripaea', 51.50, 53.50, 2.00, 'WASTE', 'hills', 'timber', 'steppe_cults', 'sarmatian', 1, 1, 1, 0,
    { habitation: 'frontier', settleable: false }),
  P('Ustyurt', 52.00, 43.50, 1.80, 'WASTE', 'wasteland', 'salt', 'steppe_cults', 'sarmatian', 1, 1, 1, 0,
    { impassable: true }),

  // --- v7.4: the eastern and southern frame (SPEC §205) ---------------------
  // Appended, so no save ID shifts. These cells exist because the frame moved
  // to hold all of Iran and all of Ethiopia — and everything the rectangle
  // then carries: Nubia, the Horn, Arabia entire, the Oxus lands, the Sahel.
  // OWNERSHIP IS DELIBERATELY WASTE, on §160's rule: the base owner is what
  // every bookmark inherits, and handing Parthia its whole east (or Kush its
  // whole Nile) in the base atlas would rewrite eight tuned campaigns at
  // once. js/data/political_maps.js seats the courts per era, with the levy
  // shares that pay for them (SPEC §173, §205).
  //
  // -- Ariana: the Iranian east from Carmania to the Makran and Herat -------
  P('Carmana', 57.05, 30.10, 1.40, 'WASTE', 'drylands', 'livestock', 'zoroastrianism', 'persian', 3, 3, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Harmozeia', 56.35, 27.30, 1.10, 'WASTE', 'coast', 'spices', 'zoroastrianism', 'persian', 3, 5, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Tis', 60.60, 25.55, 1.30, 'WASTE', 'coast', 'fish', 'zoroastrianism', 'persian', 2, 3, 1, 0,
    { habitation: 'rural', settleable: false }),
  P('Pura', 60.35, 27.40, 1.50, 'WASTE', 'drylands', 'dates', 'zoroastrianism', 'persian', 2, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Makuran', 62.85, 26.30, 1.40, 'WASTE', 'mountains', 'livestock', 'zoroastrianism', 'persian', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Zranka', 61.20, 30.80, 1.20, 'WASTE', 'farmland', 'grain', 'zoroastrianism', 'persian', 3, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Phrada', 62.15, 32.40, 1.40, 'WASTE', 'drylands', 'livestock', 'zoroastrianism', 'persian', 2, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Artacoana', 62.20, 34.55, 1.20, 'WASTE', 'farmland', 'grain', 'zoroastrianism', 'persian', 4, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Dasht-e Kavir', 54.80, 34.30, 2.00, 'WASTE', 'wasteland', 'salt', 'zoroastrianism', 'persian', 1, 1, 1, 0,
    { impassable: true }),
  P('Dasht-e Lut', 58.80, 31.30, 2.00, 'WASTE', 'wasteland', 'salt', 'zoroastrianism', 'persian', 1, 1, 1, 0,
    { impassable: true }),
  // -- Margiana, Parthyene and the Oxus world -------------------------------
  P('Antiochia Margiana', 61.95, 37.58, 1.10, 'WASTE', 'farmland', 'grain', 'zoroastrianism', 'persian', 4, 5, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Nisa', 58.35, 37.85, 1.20, 'WASTE', 'drylands', 'wine', 'zoroastrianism', 'persian', 3, 3, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Hecatompylos', 57.00, 35.85, 1.30, 'WASTE', 'drylands', 'livestock', 'zoroastrianism', 'persian', 3, 3, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Chorasmia', 60.60, 41.90, 1.50, 'WASTE', 'farmland', 'grain', 'zoroastrianism', 'persian', 3, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Dahae', 55.20, 39.80, 1.70, 'WASTE', 'steppe', 'livestock', 'steppe_cults', 'sarmatian', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Karakum', 58.50, 39.60, 2.20, 'WASTE', 'wasteland', 'salt', 'zoroastrianism', 'persian', 1, 1, 1, 0,
    { impassable: true }),
  P('Kyzylkum', 62.30, 43.60, 2.10, 'WASTE', 'wasteland', 'salt', 'steppe_cults', 'sarmatian', 1, 1, 1, 0,
    { impassable: true }),
  P('Massagetae', 59.20, 47.50, 1.90, 'WASTE', 'steppe', 'livestock', 'steppe_cults', 'sarmatian', 1, 1, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Issedones', 59.50, 52.50, 2.10, 'WASTE', 'steppe', 'livestock', 'steppe_cults', 'sarmatian', 1, 1, 1, 0,
    { habitation: 'frontier', settleable: false }),
  // -- Arabia's interior and the Hejaz south --------------------------------
  P('Macoraba', 39.85, 21.45, 1.30, 'WASTE', 'drylands', 'incense', 'nabataean', 'arab', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Asir', 42.50, 19.20, 1.50, 'WASTE', 'hills', 'livestock', 'nabataean', 'arab', 2, 2, 3, 0,
    { habitation: 'frontier', settleable: false }),
  P('Yamama', 46.75, 24.60, 1.70, 'WASTE', 'desert', 'dates', 'nabataean', 'arab', 2, 2, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Rub al-Khali', 50.50, 20.00, 2.40, 'WASTE', 'wasteland', 'salt', 'nabataean', 'arab', 1, 1, 1, 0,
    { impassable: true }),
  // -- Arabia Felix: the incense kingdoms -----------------------------------
  P('Najran', 44.20, 17.55, 1.20, 'WASTE', 'drylands', 'incense', 'south_arabian', 'south_arabian', 3, 4, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Marib', 45.35, 15.45, 1.10, 'WASTE', 'drylands', 'incense', 'south_arabian', 'south_arabian', 4, 6, 3, 1,
    { habitation: 'town', settleable: false }),
  P('Zafar', 44.40, 14.15, 1.00, 'WASTE', 'hills', 'incense', 'south_arabian', 'south_arabian', 4, 5, 4, 0,
    { habitation: 'town', settleable: false }),
  P('Muza', 43.35, 13.60, 0.95, 'WASTE', 'coast', 'spices', 'south_arabian', 'south_arabian', 3, 5, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Eudaemon Arabia', 45.05, 12.95, 0.95, 'WASTE', 'coast', 'spices', 'south_arabian', 'south_arabian', 3, 5, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Shabwa', 47.05, 15.35, 1.30, 'WASTE', 'desert', 'incense', 'south_arabian', 'south_arabian', 3, 5, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Moscha', 54.10, 17.35, 1.30, 'WASTE', 'coast', 'incense', 'south_arabian', 'south_arabian', 2, 4, 1, 0,
    { habitation: 'rural', settleable: false }),
  P('Dioscurida', 53.90, 12.50, 1.00, 'WASTE', 'coast', 'incense', 'south_arabian', 'south_arabian', 1, 3, 1, 0,
    { habitation: 'rural', settleable: false }),
  // -- Oman -----------------------------------------------------------------
  P('Omana', 58.45, 23.55, 1.20, 'WASTE', 'coast', 'fish', 'nabataean', 'arab', 3, 4, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Mazun', 56.60, 24.35, 1.20, 'WASTE', 'farmland', 'dates', 'nabataean', 'arab', 3, 4, 3, 0,
    { habitation: 'rural', settleable: false }),
  // -- Nubia: the middle Nile -----------------------------------------------
  P('Napata', 31.85, 18.70, 1.30, 'WASTE', 'drylands', 'livestock', 'kushite', 'kushite', 3, 3, 3, 0,
    { habitation: 'town', settleable: false }),
  P('Meroe', 33.72, 16.80, 1.10, 'WASTE', 'drylands', 'grain', 'kushite', 'kushite', 4, 5, 4, 0,
    { habitation: 'town', settleable: false }),
  P('Soba', 32.75, 15.30, 1.20, 'WASTE', 'farmland', 'grain', 'kushite', 'kushite', 3, 4, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Blemmyae', 35.60, 20.60, 1.60, 'WASTE', 'desert', 'livestock', 'kushite', 'cushitic', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  // The Dodekaschoinos: Lower Nubia's river strip, the twelve-schoinoi land
  // between the first and second cataracts. It is the one walkable road
  // between Egypt and Kush — every army either way marched it — so its cell
  // exists to keep Syene and Napata neighbors while the desert on both banks
  // stays the wall it really was. (Seeded on the river; the Nubian Desert's
  // seed sits east of it so the waste cannot claim the water road.)
  P('Dodekaschoinos', 31.85, 22.40, 1.00, 'WASTE', 'desert', 'grain', 'kushite', 'kushite', 1, 2, 1, 0,
    { habitation: 'frontier', settleable: false }),
  P('Nubian Desert', 34.30, 21.20, 1.60, 'WASTE', 'wasteland', 'salt', 'kushite', 'kushite', 1, 1, 1, 0,
    { impassable: true }),
  // The marsh that stopped Nero's centurions (Seneca NQ VI.8): the White
  // Nile disappears into it, and so does every army that tries.
  P('The Sudd', 31.00, 8.20, 2.00, 'WASTE', 'marsh', 'fish', 'african_cults', 'kushite', 1, 1, 1, 0,
    { impassable: true }),
  // -- Aethiopia: the highlands and the Horn --------------------------------
  P('Aksum', 38.72, 14.12, 1.00, 'WASTE', 'mountains', 'livestock', 'south_arabian', 'aksumite', 4, 4, 4, 0,
    { habitation: 'town', settleable: false }),
  P('Adulis', 39.50, 15.40, 0.95, 'WASTE', 'coast', 'spices', 'south_arabian', 'aksumite', 3, 5, 2, 0,
    { habitation: 'town', settleable: false }),
  P('Tana', 37.40, 12.60, 1.20, 'WASTE', 'mountains', 'grain', 'south_arabian', 'aksumite', 3, 3, 3, 0,
    { habitation: 'rural', settleable: false }),
  P('Shewa', 38.80, 9.30, 1.30, 'WASTE', 'mountains', 'grain', 'south_arabian', 'aksumite', 3, 3, 4, 0,
    { habitation: 'rural', settleable: false }),
  P('Kaffa', 36.40, 7.50, 1.40, 'WASTE', 'hills', 'spices', 'african_cults', 'aksumite', 2, 3, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Danakil', 40.80, 13.30, 1.60, 'WASTE', 'desert', 'salt', 'african_cults', 'cushitic', 1, 2, 1, 0,
    { habitation: 'frontier', settleable: false }),
  P('Avalites', 43.10, 10.80, 1.20, 'WASTE', 'coast', 'incense', 'african_cults', 'cushitic', 2, 3, 1, 0,
    { habitation: 'rural', settleable: false }),
  P('Malao', 45.05, 9.90, 1.30, 'WASTE', 'coast', 'incense', 'african_cults', 'cushitic', 2, 3, 1, 0,
    { habitation: 'rural', settleable: false }),
  P('Opone', 50.80, 10.30, 1.50, 'WASTE', 'coast', 'incense', 'african_cults', 'cushitic', 1, 3, 1, 0,
    { habitation: 'rural', settleable: false }),
  P('Ogaden', 44.30, 7.60, 1.80, 'WASTE', 'drylands', 'livestock', 'african_cults', 'cushitic', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Azania', 44.40, 4.20, 1.60, 'WASTE', 'drylands', 'livestock', 'african_cults', 'cushitic', 1, 2, 1, 0,
    { habitation: 'frontier', settleable: false }),
  // -- Nigritia: the Sahel from the Niger bend to Darfur --------------------
  P('Nigritae', -4.20, 16.20, 1.70, 'WASTE', 'steppe', 'grain', 'african_cults', 'west_african', 2, 2, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Air', 8.20, 18.20, 1.80, 'WASTE', 'desert', 'salt', 'african_cults', 'mauri', 1, 2, 1, 0,
    { habitation: 'frontier', settleable: false }),
  P('Agisymba', 15.30, 13.10, 1.80, 'WASTE', 'steppe', 'livestock', 'african_cults', 'west_african', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Jebel Marra', 24.30, 13.30, 1.70, 'WASTE', 'hills', 'livestock', 'african_cults', 'west_african', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Noba', 29.80, 13.00, 1.70, 'WASTE', 'drylands', 'livestock', 'african_cults', 'kushite', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Majabat', -6.80, 20.80, 2.20, 'WASTE', 'wasteland', 'salt', 'african_cults', 'mauri', 1, 1, 1, 0,
    { impassable: true }),
  P('Tanezrouft', 1.20, 21.50, 2.20, 'WASTE', 'wasteland', 'salt', 'african_cults', 'mauri', 1, 1, 1, 0,
    { impassable: true }),
  P('Tenere', 11.50, 18.80, 2.20, 'WASTE', 'wasteland', 'salt', 'african_cults', 'mauri', 1, 1, 1, 0,
    { impassable: true }),
  P('Tibesti', 17.80, 21.20, 2.00, 'WASTE', 'wasteland', 'salt', 'african_cults', 'mauri', 1, 1, 1, 0,
    { impassable: true }),
  // -- Guinea: the forest coast and the gold country ------------------------
  P('Bambuk', -10.20, 12.90, 1.50, 'WASTE', 'hills', 'silver', 'african_cults', 'west_african', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Guinea Highlands', -9.10, 9.40, 1.60, 'WASTE', 'hills', 'timber', 'african_cults', 'west_african', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Kru Coast', -9.30, 5.80, 1.40, 'WASTE', 'coast', 'fish', 'african_cults', 'west_african', 1, 2, 1, 0,
    { habitation: 'frontier', settleable: false }),
  P('Volta', -1.20, 7.60, 1.50, 'WASTE', 'farmland', 'grain', 'african_cults', 'west_african', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Niger Delta', 6.30, 5.40, 1.30, 'WASTE', 'marsh', 'fish', 'african_cults', 'west_african', 2, 3, 2, 0,
    { habitation: 'rural', settleable: false }),
  P('Theon Ochema', 9.60, 4.75, 1.30, 'WASTE', 'mountains', 'timber', 'african_cults', 'west_african', 1, 2, 2, 0,
    { habitation: 'frontier', settleable: false }),
  P('Great Forest', 17.00, 4.40, 2.50, 'WASTE', 'marsh', 'timber', 'african_cults', 'west_african', 1, 1, 1, 0,
    { impassable: true }),
  // --- v7.7 (SPEC §225): the northern frontier at the resolution it is played
  // Lebanon was six cells — Tyre, Sidon, Beirut, Byblos, Tripoli and the Beqaa
  // — for a country the size of Israel's coastal plain, which the 1948 chapter
  // then fights three wars over: the civil war of 1975, the Syrian occupation,
  // and Peace for Galilee. Every one of them was decided at a resolution the
  // map could not show. And the Golan was worse: Caesarea Philippi ran from
  // the Litani across the Hermon massif to the Damascus road as ONE cell, and
  // the label 1948 hung on Batanea — Quneitra — sat fifty kilometres east of
  // the town it named, out in the Hauran.
  //
  // Sixteen districts where there were nine. Latent everywhere else, exactly
  // like the modern Israeli cells above: their pixels, clicks and adjacency
  // resolve to the ancient province in the seven older chapters, which are
  // still played on the atlas they were written for.
  //
  // Lebanon south to north: Jabal Amil, the Chouf, the Kesrouan, the coast
  // between Byblos and Tripoli, the Qadisha highland, the Akkar plain, and the
  // northern Beqaa — which is Heliopolis, and keeps its own name.
  P('Nabatieh', 35.44, 33.34, 0.50, 'ROM', 'hills', 'olive_oil', 'hellenism', 'phoenician', 1, 1, 1, 0,
    { latentParent: 'Tyre' }),
  P('Chouf', 35.55, 33.66, 0.55, 'ROM', 'mountains', 'olive_oil', 'hellenism', 'phoenician', 1, 1, 1, 0,
    { latentParent: 'Sidon' }),
  P('Jounieh', 35.62, 33.96, 0.52, 'ROM', 'coast', 'fish', 'hellenism', 'phoenician', 1, 1, 1, 0,
    { latentParent: 'Berytus' }),
  P('Batroun', 35.76, 34.26, 0.60, 'ROM', 'coast', 'wine', 'hellenism', 'phoenician', 1, 1, 0, 0,
    { latentParent: 'Byblos' }),
  P('Bsharri', 35.96, 34.14, 0.50, 'ROM', 'mountains', 'timber', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Tripolis' }),
  P('Akkar', 36.06, 34.48, 0.52, 'ROM', 'farmland', 'grain', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Tripolis' }),
  // Heliopolis of Syria: the great temple platform, and the northern Beqaa
  // under it. The low weight is load-bearing: Chalcis' old cell ran east to
  // the Palmyra road because nothing is seeded on the Syrian steppe between
  // Damascus, Emesa and Palmyra, and splitting the Beqaa in two inherits that
  // reach rather than inventing it. A seed out there would fix the border and
  // cost the ancient map the Damascus–Palmyra road, which is a worse trade
  // than a wide desert cell; the pair together cover exactly the ground the
  // one cell covered before. The one cell here with an ancient identity too large to file
  // under a modern district name, so it keeps the ancient one and 1948 shows
  // Baalbek over it — the same arrangement Caesarea Philippi has with Banias.
  P('Heliopolis', 36.10, 33.92, 0.68, 'ROM', 'drylands', 'grain', 'hellenism', 'aramean', 2, 1, 1, 0,
    { latentParent: 'Chalcis' }),
  // The Golan, told apart: the massif, and the plateau town the atlas kept
  // putting out in the Hauran.
  P('Mount Hermon', 35.79, 33.36, 0.52, 'AGR', 'mountains', 'livestock', 'hellenism', 'aramean', 1, 1, 0, 0,
    { latentParent: 'Caesarea Philippi' }),
  P('Quneitra', 35.74, 33.10, 0.50, 'AGR', 'hills', 'grain', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Caesarea Philippi' }),
  // And the central Upper Galilee, which Gischala held alone from the Acre
  // plain to the Hula: Tarshiha and the villages of the Ma'alot ridge.
  P("Ma'alot", 35.26, 33.00, 0.55, 'ROM', 'hills', 'olive_oil', 'hellenism', 'phoenician', 1, 1, 1, 0,
    { latentParent: 'Ptolemais' }),

  // --- v7.8 (SPEC §228): Jordan, Syria and Iraq at the same resolution ------
  // §225 gave Lebanon and the Golan thirteen districts where they had six.
  // East and north of them the atlas was still the ancient one, and the three
  // states 1948 actually fights beside and against were drawn in cells the
  // size of provinces: Iraq was TEN cells for four hundred thousand square
  // kilometres, with no Mosul on it at all and single cells of 88,000 raster
  // units; Syria was seventeen, with nothing between Aleppo and the Tigris but
  // Palmyra and a wasteland; Jordan's whole eastern Badia was one cell called
  // Azraq, and its whole south was Petra.
  //
  // It shows in the national outlines, which is what the eye reads first. A
  // border between two states is a Voronoi arc between their nearest seeds, so
  // where the seeds are two hundred kilometres apart the arc has nothing to
  // follow: Susa's cell crossed the Tigris into Maysan, Carrhae and Zeugma
  // came down over the Euphrates into the Jazira, and the impassable Syrian
  // Desert reached south-west across the Baghdad road into Jordan. Every one
  // of the twenty-three cells below is seeded INSIDE the cell it comes out of,
  // so the seven older chapters fold back to exactly the map they had — and
  // where the cell it comes out of belongs to the wrong country in 1948, the
  // new cell is the fix for that border.
  //
  // Iraq: the north (Mosul, Kirkuk, Sulaymaniyah), the middle Euphrates and
  // Diyala (Ramadi, Baquba), the Shia south (Najaf, Kut, Samawa, Amara) and
  // the western desert road (Nukhayb). Nineveh keeps its own name, the way
  // Heliopolis does; the rest take the names 1948 knows them by.
  P('Nineveh', 43.06, 36.2, 1.15, 'PAR', 'hills', 'grain', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Hatra' }),
  P('Kirkuk', 44.24, 35.76, 0.90, 'ADI', 'hills', 'grain', 'judaism', 'aramean', 2, 2, 1, 0,
    { latentParent: 'Arbela' }),
  P('Sulaymaniyah', 44.69, 35.72, 0.80, 'ADI', 'mountains', 'livestock', 'judaism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Arbela' }),
  P('Baquba', 44.46, 33.6, 0.70, 'PAR', 'farmland', 'dates', 'judaism', 'judean', 1, 1, 1, 0,
    { latentParent: 'Nehardea' }),
  P('Ramadi', 43.49, 33.41, 1.15, 'PAR', 'desert', 'dates', 'judaism', 'judean', 1, 1, 1, 0,
    { latentParent: 'Nehardea' }),
  P('Najaf', 44.37, 32.21, 1.30, 'PAR', 'drylands', 'dates', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Babylon' }),
  P('Kut', 45.76, 32.15, 1.15, 'PAR', 'farmland', 'grain', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Uruk' }),
  P('Samawa', 45.43, 31.32, 1.15, 'PAR', 'drylands', 'dates', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Uruk' }),
  // Maysan and its marshes. Susa's cell has always crossed the Tigris here,
  // which is right for Elam and wrong for a map with an Iraq on it.
  P('Amara', 47.41, 32.05, 1.50, 'PAR', 'marsh', 'fish', 'zoroastrianism', 'persian', 1, 1, 1, 0,
    { latentParent: 'Susa' }),
  P('Nukhayb', 41.95, 32.34, 1.70, 'PAR', 'desert', 'livestock', 'zoroastrianism', 'arab', 1, 1, 1, 0,
    { latentParent: 'Rutba' }),

  // Syria: the north-west (Idlib), the Euphrates bend (Manbij, Raqqa), the
  // Jazira (Hasakah), the Homs country (Salamiyah, Qusayr), the Ghouta
  // (Douma) and the Jabal Druze (Suwayda). Manbij and Raqqa come out of cells
  // that are Turkish in 1948, which is the Euphrates border they fix.
  P('Idlib', 36.79, 36.01, 0.90, 'ROM', 'hills', 'olive_oil', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Beroea' }),
  P('Manbij', 37.92, 36.74, 0.70, 'ROM', 'drylands', 'grain', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Zeugma' }),
  // Sergiopolis: the pilgrim city on the steppe south of the Euphrates bend,
  // which is where this cell's seed had to sit to leave Beroea–Carrhae alone.
  // 1948 shows Raqqa over it — the district capital forty kilometres north.
  P('Rusafa', 38.72, 35.39, 0.80, 'OSR', 'drylands', 'grain', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Palmyra' }),
  P('Hasakah', 40.89, 36.67, 1.00, 'ADI', 'drylands', 'grain', 'zoroastrianism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Nisibis' }),
  P('Salamiyah', 36.90, 34.88, 0.62, 'ROM', 'steppe', 'livestock', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Emesa' }),
  P('Qusayr', 36.55, 34.60, 0.60, 'ROM', 'farmland', 'grain', 'hellenism', 'aramean', 1, 1, 1, 0,
    { latentParent: 'Emesa' }),
  P('Douma', 36.62, 33.66, 0.70, 'ROM', 'farmland', 'olive_oil', 'hellenism', 'aramean', 1, 2, 1, 0,
    { latentParent: 'Damascus' }),
  P('Suwayda', 36.62, 32.62, 0.68, 'NAB', 'hills', 'wine', 'nabataean', 'nabataean', 1, 1, 1, 0,
    { latentParent: 'Bostra' }),

  // Jordan: the kingdom's own north (Zarqa, Mafraq), the desert road east to
  // the Iraqi frontier (Ruwayshid — out of the impassable Syrian Desert,
  // which is the cell that used to reach across the Badia), and the south
  // (Shobak, and Mudawwara on the Saudi line).
  P('Zarqa', 36.00, 31.99, 0.85, 'ROM', 'drylands', 'livestock', 'hellenism', 'greek', 1, 1, 1, 0,
    { latentParent: 'Philadelphia' }),
  P('Mafraq', 36.12, 32.32, 0.50, 'NAB', 'drylands', 'grain', 'nabataean', 'nabataean', 1, 1, 1, 0,
    { latentParent: 'Bostra' }),
  P('Ruwayshid', 38.75, 32.5, 1.70, 'WASTE', 'desert', 'salt', 'nabataean', 'arab', 1, 1, 1, 0,
    { latentParent: 'Syrian Desert' }),
  P('Shobak', 35.55, 30.6, 1.10, 'NAB', 'hills', 'livestock', 'nabataean', 'nabataean', 1, 1, 0, 0,
    { latentParent: 'Zoara' }),
  P('Wadi Rum', 35.72, 29.44, 0.85, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 1, 1, 0, 0,
    { latentParent: 'Aila' }),
  // --- SPEC §230: ground the ancient theatre had no cell for ---------------
  // Appended, like every cell since §225, so no pre-§230 id moves. These are
  // NOT latent: they are provinces in all eight chapters, because the places
  // are Hellenistic and Nabataean ones the modern map merely inherited. Each
  // takes its development out of the province it was carved from, above.
  // Three that shipped here — Hippos, Abila, Dion — were withdrawn the same
  // day (§230): they carved the junction where Gamala meets Batanea and where
  // Mafraq folds into Gerasa, and pinched those display-unions into claws in
  // every chapter that merges them. The sown country stays at Gadara's grain.
  P('Esbus', 35.85, 31.82, 0.62, 'ROM', 'hills', 'grain', 'hellenism', 'greek', 1, 1, 1, 0), // out of Philadelphia — Heshbon of the Ammonite plateau
  P('Characmoba', 35.70, 31.18, 0.95, 'NAB', 'hills', 'livestock', 'nabataean', 'nabataean', 1, 1, 0, 0), // out of Medaba — Kir of Moab, on the plateau above the Dead Sea
  P('Auara', 35.33, 29.95, 1.00, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 1, 1, 0, 0), // out of Petra — Humayma, the cistern town of the Hisma
  P('Elusa', 34.68, 31.08, 0.60, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 1, 0, 0, 0), // out of Oboda — Haluza, first of the Negev caravan towns
  P('Dedan', 37.70, 26.10, 1.50, 'NAB', 'desert', 'incense', 'nabataean', 'nabataean', 1, 1, 0, 0), // out of Hegra — the Lihyanite oasis south of Hegra; seed cheated down the valley so the pair splits the corridor instead of nesting
  P('Sirhan', 38.45, 30.85, 1.00, 'NAB', 'desert', 'livestock', 'nabataean', 'arab', 1, 0, 0, 0), // out of Dumatha — the wadi road from the Hauran to the Jawf, seeded on the wadi axis
];

// ---------------------------------------------------------------------------
// Regions — the named lands this map is written in (SPEC §5.6).
//
// A realm is not a blob with one middle. Judaea holding Greece is Judaea AND
// Judaean Greece, and the nation label used to average the two together and
// land in the sea between them: the centre of mass of a country in two places
// points at neither of them. So the nation tier names a court once per REGION
// it holds — its own name over the region its seat is in, "[Adjective]
// [Region]" over every other one it holds enough of to read.
//
// The lines are geographic, not political, and therefore the same in 167 BCE
// and in 1948, because the ground is. Where a modern state is finer than a
// classical region (Portugal inside Hispania, the Netherlands on the Rhine)
// nothing is lost: the label sits at the court's OWN holdings inside the
// region, so PORTUGAL still prints over Portugal. A region only supplies the
// word for somebody else's ground.
//
// Two boundaries are worth stating because a reader will check them. The
// Jordan is a boundary: everything west of it (with the Galilee panhandle) is
// Judaea, everything east — Peraea, the Golan, the Decapolis, Moab, the Hauran
// — is Transjordan, which is what makes AGRIPPA II print over the Golan and
// TRANSJORDAN over Amman without either needing a table of its own. And the
// Negev is its own land rather than the tail of either, because it has
// belonged with Petra and with Beersheba in different centuries of this game.
//
// Every province belongs to exactly one region; validateMapData holds that.
// ---------------------------------------------------------------------------

const REGIONS = {
  'Judaea': ['Jerusalem', 'Jericho', 'Emmaus', 'Lydda', 'Joppa', 'Masada', 'Engaddi',
    'Sepphoris', 'Jotapata', 'Tiberias', 'Tarichaea', 'Gischala',
    'Gaza', 'Ascalon', 'Azotus', 'Jamnia', 'Hebron', 'Adora', 'Sebaste', 'Neapolis',
    'Antipatris', 'Caesarea Maritima', 'Dora', 'Ptolemais', 'Scythopolis',
    'Safed', 'Nahariya', 'Afula', 'Hadera', 'Netanya', 'Herzliya', 'Kfar Saba',
    'Rishon LeZion', 'Rehovot', 'Modi\'in Hills', 'Jenin', 'Tulkarm', 'Qalqilya',
    'Ramallah', 'Bethlehem', 'Beit Shemesh', 'Kiryat Gat', 'Khan Yunis', 'Rafah',
    'Kiryat Shmona', "Ma'alot"],
  'Transjordan': ['Esbus', 'Characmoba', 'Gadora', 'Machaerus', 'Pella', 'Gadara', 'Gerasa', 'Philadelphia',
    'Caesarea Philippi', 'Batanea', 'Gamala', 'Medaba', 'Bostra', 'Azraq', 'Zoara',
    'Mount Hermon', 'Quneitra',
    'Suwayda', 'Zarqa', 'Mafraq', 'Ruwayshid'],
  'Negev': ['Auara', 'Elusa', 'Oboda', 'Aila', 'Kadesh Barnea', 'Beersheba', 'Arad', 'Dimona',
    'Mitzpe Ramon', 'Paran', 'Eilat', 'Shobak', 'Wadi Rum'],
  'Phoenicia': ['Tyre', 'Sidon', 'Berytus', 'Byblos', 'Tripolis', 'Aradus',
    'Nabatieh', 'Chouf', 'Jounieh', 'Batroun', 'Bsharri', 'Akkar'],
  'Syria': ['Damascus', 'Chalcis', 'Emesa', 'Apamea', 'Antioch', 'Seleucia Pieria',
    'Laodicea', 'Beroea', 'Cyrrhus', 'Palmyra', 'Zeugma', 'Samosata', 'Dura-Europos',
    'Syrian Desert', 'Rutba', 'Heliopolis',
    'Idlib', 'Manbij', 'Salamiyah', 'Qusayr', 'Douma'],
  'Arabia': ['Dedan', 'Sirhan', 'Petra', 'Hegra', 'Tayma', 'Dumatha', 'Yathrib', 'Khaybar', 'Gerrha',
    'Arabian Desert', 'Macoraba', 'Asir', 'Yamama', 'Rub al-Khali'],
  'Egypt': ['Pelusium', 'Rhinocolura', 'Alexandria', 'Athribis', 'Leontopolis', 'Memphis',
    'Arsinoe', 'Oxyrhynchus', 'Thebes', 'Myos Hormos', 'Syene', 'Berenice', 'Paraetonium',
    'Libyan Desert', 'Eastern Desert', 'Sinai Interior', 'Dizahab'],
  'Cyrenaica': ['Cyrene', 'Marmarica'],
  'Cyprus': ['Salamis', 'Paphos'],
  'Anatolia': ['Tarsus', 'Melitene', 'Iconium', 'Tyana', 'Pisidia', 'Attalia',
    'Seleucia Trachea', 'Caesarea Mazaca', 'Nicaea', 'Smyrna', 'Ancyra', 'Sinope',
    'Trapezus', 'Halicarnassus'],
  'Armenia': ['Tigranocerta', 'Sophene', 'Amida'],
  'Caucasus': ['Phasis', 'Caucasian Albania'],
  'Assyria': ['Edessa', 'Carrhae', 'Nisibis', 'Singara', 'Hatra', 'Arbela', 'Assur',
    'Nineveh', 'Kirkuk', 'Sulaymaniyah', 'Hasakah', 'Rusafa'],
  'Babylonia': ['Seleucia-Ctesiphon', 'Babylon', 'Nehardea', 'Uruk', 'Charax',
    'Baquba', 'Ramadi', 'Najaf', 'Kut', 'Samawa', 'Amara', 'Nukhayb'],
  'Persia': ['Ecbatana', 'Gazaca', 'Susa', 'Persepolis', 'Gabae', 'Hyrcania'],
  'Greece': ['Corinth', 'Athens', 'Sparta', 'Thessalonica', 'Gortyn', 'Rhodes'],
  'Thrace': ['Hadrianopolis', 'Byzantion', 'Philippopolis', 'Serdica', 'Novae'],
  'Illyria': ['Dyrrhachium', 'Salona', 'Delminium', 'Siscia', 'Sirmium', 'Singidunum',
    'Naissus'],
  'Dacia': ['Sarmizegetusa', 'Napoca', 'Tomis'],
  'Pannonia': ['Carnuntum', 'Aquincum', 'Virunum'],
  'Italy': ['Roma', 'Capua', 'Tarentum', 'Brundisium', 'Rhegium', 'Mediolanum', 'Genua',
    'Bononia', 'Ravenna', 'Pisae', 'Ancona', 'Aquileia'],
  'Sicily': ['Panormus', 'Syracusae'],
  'Sardinia': ['Caralis', 'Turris Libisonis', 'Aleria'],
  'Africa': ['Carthago', 'Hadrumetum', 'Thysdrus', 'Tacape', 'Capsa', 'Theveste',
    'Hippo Regius', 'Cirta', 'Oea', 'Leptis Magna', 'Macomades'],
  'Mauretania': ['Saldae', 'Icosium', 'Caesarea Mauretaniae', 'Portus Magnus', 'Volubilis',
    'Tingis', 'Sala', 'Atlas', 'Gaetulia'],
  'Sahara': ['Sahara', 'Western Sahara', 'Numidian Sahara', 'Garama'],
  'Hispania': ['Gades', 'Corduba', 'Hispalis', 'Malaca', 'Carthago Nova', 'Toletum',
    'Emerita', 'Olisipo', 'Bracara', 'Asturica', 'Tarraco', 'Caesaraugusta', 'Valentia',
    'Numantia', 'Salmantica', 'Barcino', 'Emporiae', 'Baleares'],
  'Gaul': ['Narbo', 'Massilia', 'Nemausus', 'Tolosa', 'Burdigala', 'Lugdunum',
    'Augustodunum', 'Avaricum', 'Limonum', 'Condate', 'Darioritum', 'Lutetia', 'Rotomagus',
    'Samarobriva', 'Gesoriacum', 'Durocortorum', 'Augusta Treverorum', 'Vesontio', 'Genava'],
  'Britain': ['Britannia', 'Londinium', 'Camulodunum', 'Durovernum', 'Venta Belgarum',
    'Corinium', 'Isca Dumnoniorum', 'Dumnonia', 'Isca Silurum', 'Cambria', 'Deva', 'Lindum',
    'Eboracum', 'Brigantia', 'Caledonia', 'Caledonia Ultima'],
  'Hibernia': ['Hibernia', 'Hibernia Occidentalis', 'Mumu'],
  'Germania': ['Colonia Agrippina', 'Mogontiacum', 'Argentorate', 'Batavia',
    'Augusta Vindelicorum', 'Chatti', 'Teutoburgium', 'Frisia', 'Semnones', 'Boiohaemum'],
  'Scandinavia': ['Cimbria', 'Selandia', 'Scandia'],
  'Venedia': ['Gothiscandza', 'Aestii', 'Venedia'],
  'Scythia': ['Tyras', 'Olbia', 'Chersonesus', 'Panticapaeum', 'Phanagoria', 'Tauria',
    'Tanais', 'Scythia', 'Borysthenia'],
  'Sarmatia': ['Sarmatia', 'Roxolania', 'Aorsia', 'Rha', 'Hyperborea', 'Ripaea', 'Ustyurt',
    'Massagetae', 'Issedones', 'Kyzylkum'],
  // -- v7.4 (SPEC §205): the named lands of the eastern and southern frame --
  'Ariana': ['Carmana', 'Harmozeia', 'Tis', 'Pura', 'Makuran', 'Zranka', 'Phrada',
    'Artacoana', 'Dasht-e Kavir', 'Dasht-e Lut'],
  'Margiana': ['Antiochia Margiana', 'Nisa', 'Hecatompylos', 'Chorasmia', 'Dahae', 'Karakum'],
  'Arabia Felix': ['Najran', 'Marib', 'Zafar', 'Muza', 'Eudaemon Arabia', 'Shabwa',
    'Moscha', 'Dioscurida'],
  'Oman': ['Omana', 'Mazun'],
  'Nubia': ['Napata', 'Meroe', 'Soba', 'Dodekaschoinos', 'Blemmyae', 'Nubian Desert', 'The Sudd'],
  'Aethiopia': ['Aksum', 'Adulis', 'Tana', 'Shewa', 'Kaffa', 'Danakil', 'Avalites',
    'Malao', 'Opone', 'Ogaden', 'Azania'],
  'Nigritia': ['Nigritae', 'Air', 'Agisymba', 'Jebel Marra', 'Noba', 'Majabat',
    'Tanezrouft', 'Tenere', 'Tibesti'],
  'Guinea': ['Bambuk', 'Guinea Highlands', 'Kru Coast', 'Volta', 'Niger Delta',
    'Theon Ochema', 'Great Forest'],
};

// ---------------------------------------------------------------------------
// Height primitives (renderer; all coords lon/lat). The cap is
// MAX_HEIGHT_PRIMS in js/map/renderer.js — 64 since SPEC §157, 80 since §205
// (the eastern and southern frame wanted twelve ranges §157's headroom could
// not hold; the uniform budget holds 80 with room, and smoke104 checks it).
// v5.4 had filled the old cap of 32 exactly, so an extended map would have
// rendered the Alps, the Pyrenees and the Atlas as flat plates with one
// console line to explain it. smoke104 holds the two numbers together;
// validateMapData warns against the same 80.
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
  // The Caucasus was clipped by the old 42.5° top edge and drawn along it;
  // with the frame past it, this is the range's real line.
  { type: 'ridge', a: [39.90, 43.45], b: [48.30, 41.35], h: 1.00, w: 0.90 }, // the Great Caucasus
  { type: 'ridge', a: [48.80, 38.40], b: [53.30, 36.15], h: 1.00, w: 0.70 }, // the Alborz above Hyrcania
  // --- v6.8: the mountains of the western and northern frame ---------------
  { type: 'ridge', a: [6.00, 45.20], b: [13.60, 47.10], h: 1.00, w: 1.00 },  // the Alps
  { type: 'ridge', a: [-1.70, 43.30], b: [3.10, 42.45], h: 0.95, w: 0.45 },  // the Pyrenees
  { type: 'ridge', a: [5.90, 46.30], b: [7.60, 47.55], h: 0.55, w: 0.30 },   // the Jura
  { type: 'dome',  c: [2.95, 45.20], r: 1.40, h: 0.70 },                     // the Massif Central
  { type: 'ridge', a: [6.90, 47.90], b: [7.60, 49.10], h: 0.55, w: 0.28 },   // the Vosges
  { type: 'dome',  c: [6.20, 50.25], r: 1.00, h: 0.40 },                     // the Arduenna silva
  { type: 'dome',  c: [-3.40, 48.30], r: 0.95, h: 0.30 },                    // the Armorican massif
  { type: 'ridge', a: [-7.00, 43.15], b: [-3.40, 43.05], h: 0.80, w: 0.40 }, // the Cantabrian range
  { type: 'dome',  c: [-3.60, 40.60], r: 2.20, h: 0.55 },                    // the Iberian meseta
  { type: 'ridge', a: [-6.10, 37.05], b: [-1.80, 37.45], h: 0.80, w: 0.45 }, // the Baetic range
  { type: 'dome',  c: [-7.55, 40.30], r: 0.65, h: 0.60 },                    // the Herminian mount
  { type: 'ridge', a: [-8.90, 31.00], b: [-3.40, 32.60], h: 0.95, w: 0.70 }, // the High Atlas
  { type: 'ridge', a: [-5.40, 35.20], b: [1.60, 36.30], h: 0.60, w: 0.40 },  // the Rif and the Tell
  { type: 'ridge', a: [-0.90, 33.60], b: [6.20, 35.10], h: 0.60, w: 0.50 },  // the Saharan Atlas and the Aures
  { type: 'ridge', a: [-5.20, 56.50], b: [-3.20, 57.60], h: 0.75, w: 0.50 }, // the Caledonian highlands
  { type: 'ridge', a: [-2.50, 53.20], b: [-2.25, 55.00], h: 0.50, w: 0.30 }, // the Pennine spine
  { type: 'dome',  c: [-3.75, 52.50], r: 0.60, h: 0.55 },                    // the Cambrian mountains
  { type: 'dome',  c: [14.00, 49.75], r: 1.30, h: 0.50 },                    // the Hercynian forest of Bohemia
  { type: 'ridge', a: [19.00, 49.35], b: [25.50, 45.45], h: 0.90, w: 0.80 }, // the Carpathians
  { type: 'ridge', a: [14.50, 45.85], b: [20.10, 41.95], h: 0.85, w: 0.60 }, // the Dinaric range
  { type: 'ridge', a: [22.50, 43.05], b: [27.40, 42.75], h: 0.70, w: 0.40 }, // Haemus
  { type: 'dome',  c: [24.40, 41.60], r: 1.00, h: 0.70 },                    // Rhodope
  { type: 'ridge', a: [33.70, 44.60], b: [35.10, 44.95], h: 0.55, w: 0.25 }, // the Tauric range of the Chersonese
  { type: 'dome',  c: [14.60, 57.20], r: 0.90, h: 0.35 },                    // the Scandian uplands
  { type: 'dome',  c: [52.80, 43.60], r: 1.20, h: 0.35 },                    // the Ustyurt plateau
  { type: 'dome',  c: [45.20, 53.20], r: 2.00, h: 0.22 },                    // the Volga upland
  { type: 'dome',  c: [34.50, 55.40], r: 2.40, h: 0.18 },                    // the Valdai rise
  // --- v7.4: the mountains of the eastern and southern frame (SPEC §205).
  // §157's 64 was filled to 59 by v6.8 and this frame needs a dozen more, so
  // the renderer's cap rises to 80 — still comfortably inside the guaranteed
  // 224-vec4 uniform floor smoke104 checks (80×2+16 = 176).
  { type: 'dome',  c: [38.40, 10.60], r: 3.00, h: 1.00 },                    // the Ethiopian highlands
  { type: 'ridge', a: [39.70, 23.60], b: [43.70, 13.80], h: 0.95, w: 0.85 }, // the Sarawat: Asir into Yemen
  { type: 'ridge', a: [46.80, 15.20], b: [52.20, 16.30], h: 0.55, w: 0.60 }, // the Hadhramaut plateau
  { type: 'ridge', a: [56.10, 26.10], b: [59.30, 22.95], h: 0.85, w: 0.55 }, // the Hajar of Oman
  { type: 'ridge', a: [54.20, 37.80], b: [60.90, 35.30], h: 0.85, w: 0.60 }, // the Kopet Dagh
  { type: 'ridge', a: [57.50, 26.90], b: [63.30, 26.60], h: 0.75, w: 0.80 }, // the Makran ranges
  { type: 'ridge', a: [57.20, 34.20], b: [60.20, 29.60], h: 0.80, w: 0.80 }, // the east-Iranian rim (Qohestan)
  { type: 'dome',  c: [46.80, 9.60], r: 1.90, h: 0.55 },                     // the Somali plateau
  { type: 'basin', a: [40.00, 14.60], b: [41.90, 11.90], h: -0.35, w: 0.55 },// the Danakil depression
  { type: 'dome',  c: [17.80, 20.90], r: 1.10, h: 0.75 },                    // the Tibesti massif
  { type: 'dome',  c: [8.40, 17.90], r: 0.80, h: 0.55 },                     // the Air massif
  { type: 'dome',  c: [24.30, 13.10], r: 0.80, h: 0.60 },                    // Jebel Marra
];

// ---------------------------------------------------------------------------
// MAP_DATA export
// ---------------------------------------------------------------------------

export const MAP_DATA = {
  MAP_W, MAP_H, LON0, LON1, LAT0, LAT1, project,
  // SPEC §232: the warp is sampled in the v5.0 frame's own coordinates. The
  // border wobble is a noise field over PIXEL positions, and §160's frame
  // growth moved the origin (12°E, 42.5°N → 11°W, 58°N) — so every border on
  // the old map re-rolled its jitter under unchanged seeds, which is where
  // Gerasa's triangle went. Density never changed at any growth, so the old
  // phase is one translation away: this anchor is the OLD origin's position
  // in the CURRENT projection, and the renderer subtracts it before sampling.
  // §205 kept the origin, so v5.x is the only phase there has ever been.
  warpAnchor: project(12.0, 42.5),
  // These mainland cells must contain their seed in a single land component.
  // The renderer repairs any weighted-Voronoi spill across the gulfs.
  // v6.8 adds the narrow-water cells the new frame created. Each of these has
  // a strait a few pixels wide on one side, and a weighted cell will happily
  // step over one: measured before the repair, Tingis and Gades traded pixels
  // across the Pillars, Cimbria and Selandia across the Little Belt.
  contiguousProvinces: ['Sinai Interior', 'Dizahab', 'Eilat',
    'Tingis', 'Gades', 'Cimbria', 'Selandia', 'Scandia', 'Panticapaeum',
    'Caledonia', 'Hibernia', 'Durovernum', 'Gesoriacum',
    // SPEC §173: Malaca's weighted cell won a stray lobe on the Algerian
    // coast across the Alboran sea (the §160 "one I left wrong on purpose").
    // While all three cells were WASTE the defect was latent; the day the
    // west got owners it became Spanish pixels in Africa and a walkable
    // false border. The repair detaches the African fragment at the source.
    'Malaca',
    // SPEC §205: the two famous straits of the new frame are each a few
    // pixels of water, and a weighted cell steps over a few pixels. Both
    // sides of Bab el-Mandeb and Hormuz hold to their own shore, and the
    // island cell keeps to its island. Measured on the first §205 raster,
    // three more cells won Malaca-class stray lobes across open water —
    // Gerrha across the Persian Gulf to the Carmanian shore, Asir across
    // the Red Sea to the African one, Danakil back across the Assab-Mocha
    // narrows — so all three hold to the shore their seed sits on.
    'Avalites', 'Muza', 'Harmozeia', 'Mazun', 'Dioscurida',
    'Gerrha', 'Asir', 'Danakil'],
  // The Sinai peninsula is connected to both Africa and Arabia around the
  // heads of its gulfs, so component repair alone cannot stop a large
  // weighted cell leaking into mainland Egypt or Arabia. This envelope follows
  // the Mediterranean coast, the 1906 Rafah–Taba line, and both gulf shores.
  provinceRasterRegions: {
    // Egypt's Eastern Desert: the Nile's east bank to the Red Sea shore, north
    // to the head of the Gulf of Suez and south toward the Berenice road. The
    // ring stays west of both gulfs, so the peninsula belongs to Sinai and the
    // Tabuk side of the Gulf of Aqaba belongs to Arabia.
    'Eastern Desert': [
      [31.25, 30.15], [32.55, 30.00], [34.20, 27.70],
      [35.05, 24.60], [32.80, 24.10], [31.20, 26.90],
    ],
    'Sinai Interior': [
      [32.53, 31.08], [34.28, 31.36], [34.99, 29.55],
      [34.25, 27.70], [32.52, 29.94],
    ],
    // SPEC §205: the Rub al-Khali is the empty quarter, not the coasts. Its
    // huge weighted cell reached BOTH Arabian shores on the first raster —
    // sealing Oman off the Gulf road and Dhofar off the Hadhramaut one — and
    // no army ever failed to march a coast because the interior was empty.
    // The envelope holds it inland; the coastal strips fall to Gerrha, Mazun,
    // Omana, Moscha and Shabwa, whose shores they are.
    'Rub al-Khali': [
      [44.80, 21.80], [54.80, 23.00], [55.60, 20.00],
      [52.50, 17.60], [47.80, 16.80], [45.00, 17.80],
    ],
  },
  provinces: PROVINCES,
  // The named lands (SPEC §5.6): region -> canonical province names. Labels
  // read it; nothing in the sim does.
  regions: REGIONS,
  // MAINLAND first: `onLand` and the ID pass both scan in this order, and it
  // is the ring that answers for most of the frame.
  coast: {
    land: [MAINLAND, BRITAIN, HIBERNIA, SICILY, SARDINIA, CORSICA, CYPRUS,
      CRETE, BALEARES, SCANDIA, DANISH_ISLES, RHODES, SOCOTRA],
    lakes: LAKES,
  },
  rivers: RIVERS,
  heightPrimitives: HEIGHT_PRIMITIVES,
  // Land ferries/bridges only — armies may walk these.
  // SPEC §205: the Oxus road — Chorasmia's walled oases are ringed by the
  // Karakum and Kyzylkum on the map exactly as in life, and in life the road
  // in was the river through the sands. First actual use of this facility.
  extraLinks: [['Antiochia Margiana', 'Chorasmia']],
  // Sea crossings: shown nowhere in land adjacency — armies need ships
  // (embark -> sail -> disembark). Kept as data for AI hints and tooltips.
  // v5.4 adds the three famous ferries of the new frame: Otranto (the via
  // Egnatia's sea leg), Messina, and the Bosporus.
  // v6.8 adds the crossings of the western frame: the Channel, the Irish Sea,
  // the Pillars of Hercules, the two Tyrrhenian islands, the Balearics, the
  // African crossing from Sicily, and the Danish belts.
  seaLinks: [
    ['Salamis', 'Seleucia Pieria'], ['Paphos', 'Ptolemais'],
    ['Brundisium', 'Dyrrhachium'], ['Rhegium', 'Syracusae'], ['Byzantion', 'Nicaea'],
    ['Durovernum', 'Gesoriacum'], ['Deva', 'Hibernia'], ['Dumnonia', 'Darioritum'],
    ['Tingis', 'Gades'], ['Panormus', 'Carthago'], ['Caralis', 'Carthago'],
    ['Aleria', 'Pisae'], ['Aleria', 'Turris Libisonis'], ['Baleares', 'Tarraco'],
    ['Cimbria', 'Selandia'], ['Selandia', 'Scandia'],
    ['Panticapaeum', 'Phanagoria'],
    // The crossing the diagram had been walking: the Adriatic passage to
    // Dalmatia. (No Alboran ferry — those two still share a false land border,
    // see the note on severLinks below.)
    ['Tarentum', 'Salona'],
    // v7.4 (SPEC §205): the crossings of the eastern and southern frame. The
    // Periplus' own ferry at Bab el-Mandeb (the strait's shortest crossing,
    // Avalites to Muza), the strait of Hormuz, and the run out to Dioscurida
    // from the Horn.
    ['Avalites', 'Muza'], ['Harmozeia', 'Mazun'], ['Dioscurida', 'Opone'],
    // The Adulis-Muza run is the Periplus' main Red Sea crossing, and the
    // one Kaleb's army sailed in 525.
    ['Adulis', 'Muza'],
  ],
  // Accidental raster adjacencies across open water (the province-ID Voronoi
  // cells touch where the real coastlines do not): severed in geometry.js.
  // v6.8: two more, both measured on the real raster rather than guessed at.
  // The Channel is ~0.6° at Dover and the diagram still bridged it 300 km west,
  // where Armorica and the Belgic shore face each other across the widest part
  // of it: Condate and Venta Belgarum came back land-adjacent, so an army could
  // WALK from Gaul to Britain. Bonifacio is 0.13° and joined Corsica to
  // Sardinia the same way. Both are ferries above, and neither is a land
  // border.
  // And five more the Channel fix could not see. That check compared
  // LANDMASSES, and merging MAINLAND/BALKANS/ITALY into one ring made Europe,
  // Africa and Asia the same landmass — so every crossing except the island
  // ones went invisible to it. The test that finds these instead walks the
  // land mask: shortest land route between two centroids against the straight
  // line. A genuine neighbour walks it directly; a false border has to go the
  // long way round. Measured detours below.
  //
  // Everything else that looked suspicious came back genuine and is NOT here:
  // Genua|Pisae round the gulf of Genoa (0.9x), Isca Dumnoniorum|Isca Silurum
  // round the head of the Severn (0.9x), Tauria|Tanais round the Maeotic
  // shore (1.0x), Semnones|Cimbria (0.9x), Aorsia|Caucasian Albania (0.9x).
  severLinks: [['Salamis', 'Seleucia Trachea'], ['Rhodes', 'Halicarnassus'],
    ['Condate', 'Venta Belgarum'], ['Aleria', 'Turris Libisonis'],
    ['Capua', 'Salona'], ['Tarentum', 'Salona'],           // the Adriatic, 2.6x and 2.4x
    ['Hyrcania', 'Ustyurt'],                               // the Caspian, 2.2x
    // SPEC §173: the Alboran false borders §160 left wrong on purpose (land
    // detours of 20.3x and 28.6x — Malaca's stray lobe on the Algerian coast,
    // now also repaired at the raster by `contiguousProvinces` above). §160
    // could not sever them without smoke90 losing a thirteen-card strand of
    // the royal century, and deferred both to "the section that gives the
    // west owners". This is that section: with the west owned, the crowned
    // run's RNG stream and AI distances moved anyway, smoke90's seed sampling
    // was re-measured against the severed map, and no army walks from
    // Mauretania to Baetica dry-shod. The belt (severLinks) backs the braces
    // (the raster repair), so the border stays severed even if a future
    // weight change regrows the lobe.
    ['Portus Magnus', 'Malaca'], ['Volubilis', 'Malaca'],
    // SPEC §205: the belt to the contiguousProvinces braces above — both new
    // straits stay water even if a future weight change regrows a lobe, and
    // the three measured stray-lobe crossings (Gerrha over the Gulf, Asir
    // over the Red Sea twice, the Assab-Mocha narrows) stay severed too.
    ['Avalites', 'Muza'], ['Harmozeia', 'Mazun'],
    ['Gerrha', 'Harmozeia'], ['Asir', 'Blemmyae'], ['Asir', 'Adulis'],
    ['Muza', 'Danakil'], ['Adulis', 'Muza']],
};

// ---------------------------------------------------------------------------
// Validation (SPEC §4). Key lists hardcoded from SPEC §3 — do not import defines.
// ---------------------------------------------------------------------------

const TAG_KEYS = ['ROM', 'JUD', 'PAR', 'NAB', 'ARM', 'AGR', 'OSR', 'ADI', 'CHX', 'REB', 'WASTE'];
const TERRAIN_KEYS = ['coast', 'farmland', 'hills', 'mountains', 'desert', 'drylands', 'steppe', 'marsh', 'wasteland'];
const GOOD_KEYS = ['grain', 'wine', 'olive_oil', 'dates', 'balsam', 'incense', 'purple_dye', 'glass',
  'papyrus', 'silver', 'salt', 'spices', 'timber', 'fish', 'livestock',
  'oil']; // modern-era good: assigned only by bookmark `goods` overlays (SPEC §52)
const RELIGION_KEYS = ['judaism', 'samaritanism', 'hellenism', 'roman_cult', 'nabataean', 'zoroastrianism', 'egyptian',
  // v6.8: the western and northern frame (SPEC §160). Base-atlas keys only —
  // christianity, islam and the rest still arrive through bookmark overlays.
  'druidic', 'germanic_cult', 'punic', 'thracian_cult', 'steppe_cults',
  // v7.4: the eastern and southern frame (SPEC §205).
  'kushite', 'south_arabian', 'african_cults'];
const CULTURE_KEYS = ['judean', 'galilean', 'samaritan', 'idumean', 'nabataean', 'arab', 'aramean',
  'phoenician', 'greek', 'egyptian', 'roman', 'armenian', 'persian',
  'celtic', 'iberian', 'mauri', 'germanic', 'thracian', 'illyrian', 'sarmatian',
  // v7.4 (SPEC §205)
  'kushite', 'aksumite', 'south_arabian', 'cushitic', 'west_african'];

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
    // MAX_HEIGHT_PRIMS in js/map/renderer.js. This file imports nothing by
    // design, so the number is copied rather than read — and it was left at 32
    // when §157 raised the renderer to 64, which meant the FIRST primitive
    // this frame added would have been reported as over a cap that no longer
    // existed. smoke104 asserts the two agree, so the copy cannot drift again.
    if (MAP_DATA.heightPrimitives.length > 80) {
      warnings.push(`heightPrimitives count ${MAP_DATA.heightPrimitives.length} exceeds max 80`);
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

    // Regions (SPEC §5.6): a partition, not a covering. A province in no
    // region would be labelled by its own name at the nation tier, and one in
    // two would be counted twice toward both — either way the map lies about
    // who holds what, so both are warnings and the harness holds them at zero.
    const regioned = new Map();
    for (const [region, members] of Object.entries(MAP_DATA.regions || {})) {
      if (!Array.isArray(members) || !members.length) {
        warnings.push(`region '${region}' is empty`);
        continue;
      }
      for (const nm of members) {
        if (!names.has(nm)) warnings.push(`region '${region}' references unknown province '${nm}'`);
        else if (regioned.has(nm)) warnings.push(`${nm}: in two regions ('${regioned.get(nm)}' and '${region}')`);
        else regioned.set(nm, region);
      }
    }
    for (const p of provs) {
      if (!regioned.has(p.name)) warnings.push(`${p.name}: belongs to no region`);
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
