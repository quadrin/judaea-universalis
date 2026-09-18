// js/data/iron_age_map.js — the Levant's provinces drawn along its landscape,
// for the three Iron Age chapters (SPEC §271).
//
// The base atlas divides the Levant by weighted Voronoi between seeds placed
// for 66 CE, and that arithmetic knows nothing about the ground: Gadora's
// cell crossed the Jordan to touch Jericho and Shechem, Medaba's Moab ran
// unbroken from the Dead Sea to the Hauran, and the Jezreel — one valley —
// was cut three ways between the hill towns around it. Under Roman toparchy
// names that reads as an administrative map. Under the names of Kings and
// Chronicles it reads as a mistake, because the Iron Age's provinces WERE its
// landscapes — the hill country, the Shephelah, the Negeb, the Arabah, the
// plain, the valley of Jezreel, Gilead, Bashan, the plateau of Moab — and
// their borders were the things a traveller could see: a river, a ridge, the
// edge of a valley, the foot of a range.
//
// So the Iron Age chapters draw them. This file is a list of rings, in the
// exact form of the §232 country rings that draw the borders of Europe, and
// it rides on `bookmark.mapRegions`: a per-chapter lever, painted AFTER the
// atlas's own `countryRegions`, read by the renderer's ID pass only for a
// chapter that ships it. A pixel inside a ring is contested only by that
// ring's own cells, and a ring's cells claim nothing outside it, so the ring
// IS the border, to the pixel; inside a ring the member cells still divide
// the ground by weighted Voronoi, which is the right tool between two towns
// of one valley. Outside every ring nothing changes, and a chapter without
// the lever renders the atlas raster byte for byte — the nine later chapters
// keep every border they had.
//
// THE LINES ARE GEOGRAPHIC, NOT POLITICAL. A ring is a landscape unit, not a
// kingdom: the Jezreel is one ring whoever holds Megiddo, and the coastal
// plain is one ring whether Gaza pays Jerusalem or Nineveh. Ownership stays
// in the chapters' own tables. Where a border is a river the ring follows the
// river the map draws (the Jordan, the Yarmuk, the Jabbok, the Arnon, the
// Zered, the Yarkon, the Kishon, the Litani); where it is a range it follows
// the relief the map draws (the Carmel, the Lebanon and Anti-Lebanon crests,
// the Judean watershed, the rift escarpments); where it is the edge of a
// valley or the foot of a range it is traced from the ground.
//
// PAINT ORDER IS THE TOPOLOGY, as in §232: rings fill in array order and a
// later ring overwrites an earlier one. Neighbouring rings here SHARE their
// vertices along every land border, so the order decides nothing on land and
// no seam is left to heal; every seaward and lakeward edge overshoots into
// water and the land mask clips it, so the coasts keep their hand-drawn
// accuracy and the Dead Sea's shores stay where the lake polygon puts them.
//
// WHO IS LISTED. Every cell a ring names has its seed inside the ring —
// smoke187 holds it — and every cell the Iron Age chapters play in the Levant
// is named by exactly one ring. Latent cells folded into a member (Kiryat
// Shmona into Dan, Esbus into Rabbah, Zoara and Shobak into Sela) are listed
// beside their parent, so the parent keeps the ground it keeps in every other
// chapter. Latent cells whose seed sits in one landscape while their parent
// sits in another (Herzliya north of the Yarkon, Qalqilya on the Sharon's
// edge, Ma'alot on the Galilee ridge, Wadi Rum in the Hisma) are deliberately
// NOT listed: an unlisted seed claims nothing inside a ring, and that is the
// point — the parent does not reach across the line for it. They fold to
// their parents with no ground of their own, which is what a folded cell is.
//
// Seeds and weights are untouched. Nothing sized in map units moves, and the
// same rings serve all three chapters because the ground is the same in 931,
// 732 and 597; only the owners differ, and those are the chapters' own.
//
// DOM-free, zero imports, data only.

export const IRON_AGE_REGIONS = [
  // ------------------------------------------------------------------------
  // The north: the Phoenician coast, the Beqaa, the Hula.
  // ------------------------------------------------------------------------
  {
    // The strip between the sea and the Lebanon crest, from the Ladder of
    // Tyre at Ras Naqoura to the Eleutherus gap below the Akkar. Jabal Amil
    // (Nabatieh), the Chouf and the Qadisha highland lie under the crest and
    // belong with the cities at their feet, as they did under Hiram.
    name: 'The Phoenician coast',
    cells: ['Tyre', 'Nabatieh', 'Sidon', 'Chouf', 'Berytus', 'Jounieh',
      'Byblos', 'Batroun', 'Tripolis', 'Bsharri', 'Akkar'],
    ring: [
      [35.00, 33.09],                                 // sea off Ras Naqoura
      [35.12, 33.09], [35.30, 33.12], [35.50, 33.12], // the Ladder of Tyre ridge
      [35.52, 33.20], [35.52, 33.32],                 // the rift's west lip to the Litani bend
      [35.62, 33.40], [35.80, 33.60], [35.95, 33.85], // the Lebanon crest
      [36.05, 34.10], [36.20, 34.40], [36.35, 34.60], // …to the Homs gap
      [36.30, 34.75], [36.00, 34.72],                 // the Eleutherus to its mouth
      [35.60, 34.70],                                 // sea
    ],
  },
  {
    // The Beqaa between the two crests: Zobah's country, with Baalbek folded
    // into it in these chapters. Hermon's north foot closes it on the south.
    name: 'The Beqaa',
    cells: ['Chalcis', 'Heliopolis'],
    ring: [
      [35.52, 33.32], [35.62, 33.40], [35.80, 33.60], [35.95, 33.85], // the Lebanon crest (shared)
      [36.05, 34.10], [36.20, 34.40], [36.35, 34.60],
      [36.55, 34.55], [36.65, 34.40],                 // the Homs gap's east side
      [36.45, 34.05], [36.25, 33.65], [36.05, 33.35], // the Anti-Lebanon crest
      [35.95, 33.35], [35.70, 33.45],                 // Hermon's north foot (shared with the Hula)
    ],
  },
  {
    // The Hula and Hermon's south flank, with the north of the Golan: Dan's
    // ground, the end of the proverb. Kiryat Shmona, Mount Hermon and
    // Quneitra fold into it.
    name: 'The Hula',
    cells: ['Caesarea Philippi', 'Kiryat Shmona', 'Mount Hermon', 'Quneitra'],
    ring: [
      [35.52, 33.32], [35.70, 33.45], [35.95, 33.35], // Hermon's south flank (shared with the Beqaa)
      [36.00, 33.20],                                 // the Golan's north
      [35.85, 33.05], [35.70, 33.06],                 // the line above Hazor
      [35.50, 33.06], [35.50, 33.12], [35.52, 33.20], // the rift's west lip (shared with the Galilee)
    ],
  },
  {
    // The Hula's south end, the Rosh Pinna sill and the lake's north shore:
    // Hazor, the head of all those kingdoms.
    name: 'Hazor',
    cells: ['Safed'],
    ring: [
      [35.50, 33.06], [35.70, 33.06],                 // the line above Hazor (shared with the Hula)
      [35.72, 32.92],                                 // the Golan's edge (shared with Bashan)
      [35.63, 32.86], [35.58, 32.80], [35.53, 32.86], // the lake, well inside the water (shared with Bashan and Chinnereth)
      [35.50, 32.92], [35.46, 33.00],                 // the Galilee's east foot (shared)
    ],
  },
  // ------------------------------------------------------------------------
  // The Galilee and the valley.
  // ------------------------------------------------------------------------
  {
    // The Meron massif from the Ladder of Tyre to the Beit HaKerem valley,
    // between the Acre plain and the rift: Kedesh of Naphtali.
    name: 'The Upper Galilee',
    cells: ['Gischala'],
    ring: [
      [35.12, 33.09], [35.30, 33.12], [35.50, 33.12], // the Ladder of Tyre (shared with Phoenicia)
      [35.50, 33.06], [35.46, 33.00], [35.50, 32.92], // the rift lip and the Galilee's east foot (shared)
      [35.45, 32.88], [35.30, 32.90], [35.18, 32.93], // the Beit HaKerem valley (shared with the Lower Galilee)
      [35.17, 33.02],                                 // the Acre plain's edge (shared)
    ],
  },
  {
    // The Acre plain from Ras Naqoura to the Kishon's mouth at Haifa, inland
    // to the Galilee's foot. Nahariya folds into Akko.
    name: 'The Acre plain',
    cells: ['Ptolemais', 'Nahariya'],
    ring: [
      [35.00, 33.09],                                 // sea
      [35.12, 33.09], [35.17, 33.02], [35.18, 32.93], // the Galilee's foot (shared)
      [35.20, 32.85],                                 // the Zebulun valley's east edge (shared)
      [35.12, 32.78],                                 // the Kishon's mouth at Haifa
      [35.03, 32.80],                                 // sea, the bay
    ],
  },
  {
    // The Nazareth hills between the Beit HaKerem and the Jezreel: Shimron,
    // with Jotapata's crag folded into it.
    name: 'The Lower Galilee',
    cells: ['Sepphoris', 'Jotapata'],
    ring: [
      [35.20, 32.85], [35.18, 32.93],                 // the Zebulun valley's east edge (shared)
      [35.30, 32.90], [35.45, 32.88],                 // the Beit HaKerem valley (shared)
      [35.50, 32.92], [35.50, 32.86],                 // the Galilee's east foot, above Ginosar
      [35.48, 32.78], [35.45, 32.72],                 // the Arbel and Poriya heights (shared with Chinnereth)
      [35.40, 32.68], [35.25, 32.72], [35.12, 32.72], // the Nazareth ridge's south foot (shared with the Jezreel)
      [35.12, 32.78],                                 // the Kishon at Haifa (shared)
    ],
  },
  {
    // The lake's west and south shore, from Ginosar round to the Jordan's
    // outflow: Chinnereth, with Rakkath's district folded into it.
    name: 'Chinnereth',
    cells: ['Tiberias', 'Tarichaea'],
    ring: [
      [35.50, 32.92], [35.53, 32.86], [35.58, 32.80], // Ginosar, then the water (shared with Hazor)
      [35.58, 32.72],                                 // the water, down the lake's axis (shared with Bashan)
      [35.58, 32.66], [35.50, 32.64],                 // the outflow's west bank (shared with Gilead and Beth-Shean)
      [35.45, 32.72], [35.48, 32.78], [35.50, 32.86], // the Arbel heights (shared with the Lower Galilee and the Jezreel)
    ],
  },
  {
    // One valley, one province: the Jezreel from the Jokneam pass to the
    // Harod's fall toward Beth-Shean, between the Nazareth ridge and the
    // Carmel–Gilboa line.
    name: 'The Jezreel',
    cells: ['Afula'],
    ring: [
      [35.12, 32.72], [35.25, 32.72], [35.40, 32.68], // the Nazareth ridge's foot (shared)
      [35.45, 32.72], [35.50, 32.64],                 // Tabor's east and the outflow (shared with Chinnereth)
      [35.42, 32.60],                                 // the Harod's fall (shared with Beth-Shean)
      [35.42, 32.50], [35.30, 32.52], [35.20, 32.55], // the Gilboa and Menashe foot (shared with Ibleam)
      [35.10, 32.62], [35.05, 32.68],                 // the Jokneam pass and the Carmel's foot
    ],
  },
  {
    // The Beth-Shean valley and the Jordan's west bank down to the Damiya
    // ford, under the escarpment of the Samarian hills.
    name: 'The Beth-Shean valley',
    cells: ['Scythopolis'],
    ring: [
      [35.42, 32.60], [35.50, 32.64],                 // the Harod (shared with the Jezreel)
      [35.58, 32.66],                                 // the Jordan's outflow (shared with Chinnereth)
      [35.60, 32.60], [35.60, 32.50], [35.58, 32.30], // the river, drawn a hair east so the seed keeps its bank
      [35.52, 32.12],                                 // the Damiya ford (shared with Gilead and Jericho)
      [35.40, 32.12], [35.40, 32.24],                 // the escarpment's foot (shared with Jericho and Ephraim)
      [35.42, 32.35], [35.40, 32.48], [35.42, 32.50], // the escarpment (shared with Manasseh and Ibleam)
    ],
  },
  // ------------------------------------------------------------------------
  // The coast and the hill country west of the Jordan.
  // ------------------------------------------------------------------------
  {
    // The Sharon from the Yarkon to the Carmel headland, with the Carmel's
    // own west slope: Dor's coast and Aphek's springs. The modern coast
    // towns fold into their parents.
    name: 'The Sharon',
    cells: ['Antipatris', 'Kfar Saba', 'Dora', 'Caesarea Maritima', 'Hadera', 'Netanya'],
    ring: [
      [34.70, 32.12],                                 // sea off the Yarkon's mouth
      [34.90, 32.09], [34.97, 32.07], [34.98, 32.05], // the Yarkon to its springs (shared with the plain)
      [35.00, 32.20], [34.98, 32.26], [34.98, 32.36], // the hills' foot (shared with Ephraim and Manasseh)
      [35.02, 32.45], [35.05, 32.55], [35.10, 32.62], // the Menashe hills' foot (shared with Ibleam)
      [35.05, 32.68], [35.12, 32.72],                 // the Jokneam pass and the Carmel's south-east foot (shared with the Jezreel)
      [35.12, 32.78],                                 // the Carmel's north face (shared with the Lower Galilee)
      [35.03, 32.80],                                 // the Kishon's mouth (shared with the Acre plain)
      [35.00, 32.88],                                 // sea, round the Carmel headland
      [34.85, 32.85],                                 // sea
    ],
  },
  {
    // The northern Samarian hills from the Jezreel's rim to the Dothan
    // valley: Ibleam, where Jehu's arrow finds Ahaziah.
    name: 'Ibleam',
    cells: ['Jenin'],
    ring: [
      [35.10, 32.62], [35.20, 32.55], [35.30, 32.52], [35.42, 32.50], // the Jezreel's rim (shared)
      [35.40, 32.48], [35.42, 32.35],                 // the escarpment (shared with Beth-Shean)
      [35.30, 32.33], [35.15, 32.38],                 // the Dothan valley (shared with Manasseh)
      [35.02, 32.45], [35.05, 32.55],                 // the Sharon's edge (shared)
    ],
  },
  {
    // The hills of Manasseh from the Dothan valley to the Shechem pass:
    // Tirzah, and Samaria's hill fifty years before Omri buys it.
    name: 'Manasseh',
    cells: ['Sebaste', 'Tulkarm'],
    ring: [
      [35.02, 32.45], [35.15, 32.38], [35.30, 32.33], [35.42, 32.35], // the Dothan line (shared with Ibleam)
      [35.40, 32.24],                                 // the escarpment (shared with Beth-Shean)
      [35.25, 32.26], [35.10, 32.24], [34.98, 32.26], // the Shechem pass line (shared with Ephraim)
      [34.98, 32.36],                                 // the Sharon's edge (shared)
    ],
  },
  {
    // Gerizim and Ebal and the hills of Ephraim south to Shiloh, from the
    // Sharon's edge to the rift: Shechem, where the kingdom splits.
    name: 'Ephraim',
    cells: ['Neapolis'],
    ring: [
      [34.98, 32.26], [35.10, 32.24], [35.25, 32.26], [35.40, 32.24], // the Shechem pass line (shared)
      [35.40, 32.12],                                 // the escarpment's foot (shared with Beth-Shean)
      [35.35, 32.02],                                 // the rift's lip above Jericho's plain (shared)
      [35.20, 32.00], [35.05, 32.02],                 // the Shiloh line (shared with Benjamin)
      [34.98, 32.05], [35.00, 32.20],                 // the Sharon's edge (shared)
    ],
  },
  {
    // The plateau of Benjamin, from the Shiloh line to the saddle north of
    // Jerusalem: Bethel, the calf and the border.
    name: 'Benjamin',
    cells: ['Ramallah'],
    ring: [
      [34.98, 32.05], [35.05, 32.02], [35.20, 32.00], [35.35, 32.02], // the Shiloh line (shared with Ephraim)
      [35.32, 31.90],                                 // the rift's lip (shared with Jericho)
      [35.28, 31.84], [35.10, 31.84], [35.02, 31.86], // the saddle north of Jerusalem (shared with the hills)
      [35.02, 32.02],                                 // the Shephelah's head (shared)
    ],
  },
  {
    // The lower Jordan valley from the Damiya ford to the Dead Sea, and the
    // plain of Jericho under the escarpment.
    name: 'Jericho',
    cells: ['Jericho'],
    ring: [
      [35.40, 32.12], [35.52, 32.12],                 // the Damiya ford (shared with Beth-Shean)
      [35.56, 31.95], [35.50, 31.82],                 // the river, drawn a hair east (shared with the Balqa)
      [35.53, 31.70],                                 // the Dead Sea's head, in the water (shared with Moab)
      [35.35, 31.72], [35.28, 31.80],                 // the wilderness edge (shared with the wilderness)
      [35.28, 31.84],                                 // (shared with the hills)
      [35.32, 31.90], [35.35, 32.02],                 // the rift's lip (shared with Benjamin and Ephraim)
    ],
  },
  {
    // The Judean ridge from the saddle north of Jerusalem to the Beersheba
    // valley, between the Shephelah's inner foot and the wilderness edge:
    // Jerusalem, Bethlehem, Hebron and Adoraim, with Arad's basin folded in.
    name: 'The Judean hills',
    cells: ['Jerusalem', 'Bethlehem', 'Hebron', 'Adora', 'Arad'],
    ring: [
      [35.02, 31.86], [35.10, 31.84], [35.28, 31.84], // the saddle (shared with Benjamin)
      [35.28, 31.80], [35.28, 31.62], [35.29, 31.45], [35.31, 31.26], // the wilderness edge (shared)
      [35.15, 31.20], [34.92, 31.30],                 // the Beersheba valley (shared with the Negeb)
      [34.94, 31.50], [35.04, 31.70],                 // the Shephelah's inner foot (shared)
    ],
  },
  {
    // The wilderness of Judah and the Dead Sea shore, from Jericho's plain to
    // the Zoar road: En-Gedi, with Masada's crag folded into it.
    name: 'The wilderness of Judah',
    cells: ['Engaddi', 'Masada'],
    ring: [
      [35.28, 31.80], [35.35, 31.72], [35.53, 31.70], // the edge of Jericho's plain (shared)
      [35.53, 31.45], [35.55, 31.25], [35.46, 31.12], // the water, along the lake's axis
      [35.31, 31.26], [35.29, 31.45], [35.28, 31.62], // the wilderness edge (shared with the hills)
    ],
  },
  {
    // The Shephelah — the foothills between the plain and the ridge, from
    // the Aijalon valley to Lachish: Aijalon, Gezer, Beth-Shemesh and Gath,
    // with Modi'in's hills folded into Gezer.
    name: 'The Shephelah',
    cells: ['Emmaus', 'Lydda', "Modi'in Hills", 'Beit Shemesh', 'Kiryat Gat'],
    ring: [
      [34.88, 32.00], [35.02, 32.02],                 // the Aijalon valley's head (shared with the plain and Benjamin)
      [35.02, 31.86], [35.04, 31.70], [34.94, 31.50], // the ridge's foot (shared with the hills)
      [34.92, 31.30],                                 // (shared with the hills and the Negeb)
      [34.75, 31.38],                                 // the Besor's head (shared with the plain and the Negeb)
      [34.70, 31.55], [34.78, 31.75], [34.82, 31.90], // the plain's edge (shared with the plain)
    ],
  },
  {
    // The coastal plain south of the Yarkon to the Rafah line: the five
    // cities, Joppa, and the Besor country. The modern towns fold into
    // their parents.
    name: 'The coastal plain',
    cells: ['Joppa', 'Jamnia', 'Rishon LeZion', 'Rehovot', 'Azotus', 'Ascalon',
      'Gaza', 'Khan Yunis', 'Rafah'],
    ring: [
      [34.70, 32.12],                                 // sea off the Yarkon's mouth
      [34.90, 32.09], [34.97, 32.07],                 // the Yarkon (shared with the Sharon)
      [34.98, 32.05], [35.02, 32.02],                 // the Aijalon valley's head (shared with Benjamin)
      [34.88, 32.00],                                 // (shared with the Shephelah)
      [34.82, 31.90], [34.78, 31.75], [34.70, 31.55], // the Shephelah's edge (shared)
      [34.75, 31.38],                                 // the Besor's head (shared)
      [34.60, 31.30], [34.40, 31.25],                 // the Besor (shared with the Negeb)
      [34.25, 31.22],                                 // the Rafah line
      [34.15, 31.35],                                 // sea
    ],
  },
  {
    // The Negeb from the Beersheba valley south over the highland to the
    // Paran wilderness, between the Rafah–Taba line and the Arabah: the
    // Negeb of Judah, with Beersheba, Elusa, Dimona and Mitzpe Ramon folded.
    name: 'The Negeb',
    cells: ['Oboda', 'Beersheba', 'Elusa', 'Dimona', 'Mitzpe Ramon'],
    ring: [
      [34.92, 31.30], [35.15, 31.20], [35.31, 31.26], // the Beersheba valley (shared with the hills)
      [35.46, 31.12], [35.50, 31.13],                 // the lake's south, in the water (shared)
      [35.55, 30.98],                                 // the Zered's mouth: Zoar's plain (shared with Moab and Edom)
      [35.42, 30.85], [35.30, 30.85], [35.20, 30.60], // the highland's east edge (shared with the Arabah)
      [35.00, 30.20], [34.85, 29.90],
      [34.72, 30.30], [34.55, 30.70], [34.42, 31.05], // the Rafah–Taba line
      [34.40, 31.25], [34.60, 31.30], [34.75, 31.38], // the Besor (shared with the plain and the Shephelah)
    ],
  },
  {
    // The Arabah from the Dead Sea's south to the Gulf, and Ezion-Geber at
    // its head: Solomon's fleet port, and Jehoshaphat's wreck. Eilat and
    // Paran fold into it.
    name: 'The Arabah',
    cells: ['Aila', 'Eilat', 'Paran'],
    ring: [
      [35.42, 30.85], [35.40, 30.60], [35.35, 30.20], // Edom's escarpment foot (shared with Edom)
      [35.25, 29.85], [35.30, 29.60], [35.30, 29.35], // the Gulf's east shore (shared with Edom)
      [35.15, 29.30], [34.95, 29.40],                 // the Gulf, in the water
      [34.85, 29.55], [34.85, 29.90],                 // the Sinai line
      [35.00, 30.20], [35.20, 30.60], [35.30, 30.85], // the highland's east edge (shared with the Negeb)
    ],
  },
  // ------------------------------------------------------------------------
  // East of the Jordan.
  // ------------------------------------------------------------------------
  {
    // The Golan and the Bashan plain, from Hermon's foot to the Yarmuk and
    // east to the Leja: Bashan, with Gamala's crag folded into it.
    name: 'Bashan',
    cells: ['Batanea', 'Gamala'],
    ring: [
      [35.58, 32.80], [35.63, 32.86], [35.72, 32.92], // the water, then the Golan's edge (shared with Hazor)
      [35.70, 33.06], [35.85, 33.05], [36.00, 33.20], // the Hula's edge (shared)
      [36.35, 33.05], [36.40, 32.70],                 // the Leja's west
      [36.20, 32.66], [35.95, 32.72], [35.75, 32.70], // the Yarmuk (shared with Gilead)
      [35.62, 32.66],                                 // the Yarmuk's mouth
      [35.58, 32.72],                                 // the water (shared with Chinnereth)
    ],
  },
  {
    // Gilead between the Yarmuk and the Jabbok, from the Jordan to the
    // desert's edge: Gilead's dome, Jabesh in the valley, Jazer on the
    // upper Jabbok.
    name: 'Gilead',
    cells: ['Gadara', 'Pella', 'Gerasa'],
    ring: [
      [35.58, 32.72], [35.62, 32.66],                 // the outflow's east bank to the Yarmuk's mouth (shared with Bashan)
      [35.75, 32.70], [35.95, 32.72], [36.20, 32.66], // the Yarmuk (shared with Bashan)
      [36.25, 32.40],                                 // the desert's edge
      [36.10, 32.15], [36.00, 32.19], [35.85, 32.23], [35.70, 32.21], // the Jabbok (shared with Ammon and the Balqa)
      [35.58, 32.17],                                 // the Jabbok's mouth
      [35.52, 32.12], [35.58, 32.30], [35.60, 32.50], [35.60, 32.60], // the river (shared with Beth-Shean)
      [35.58, 32.66],
    ],
  },
  {
    // The Balqa south of the lower Jabbok and west of the Ammonite plateau,
    // down to the Heshbon line: the ground the chapters call Ramoth-Gilead.
    name: 'The Balqa',
    cells: ['Gadora'],
    ring: [
      [35.58, 32.17], [35.70, 32.21], [35.85, 32.23], // the lower Jabbok (shared with Gilead)
      [35.82, 32.05], [35.78, 31.78],                 // the plateau's edge (shared with Ammon)
      [35.60, 31.78], [35.50, 31.82],                 // the Heshbon line to the river (shared with Moab)
      [35.56, 31.95], [35.52, 32.12],                 // the river (shared with Jericho)
    ],
  },
  {
    // Ammon: the plateau inside the Jabbok's bend, Rabbah at its springs,
    // Heshbon on its south rim. Esbus and Zarqa fold into Rabbah.
    name: 'Ammon',
    cells: ['Philadelphia', 'Esbus', 'Zarqa'],
    ring: [
      [35.85, 32.23], [36.00, 32.19], [36.10, 32.15], // the Jabbok (shared with Gilead)
      [36.25, 32.05], [36.30, 31.80],                 // the desert's edge
      [36.15, 31.72], [35.95, 31.75], [35.78, 31.78], // the Heshbon line (shared with Moab)
      [35.82, 32.05],                                 // the plateau's edge (shared with the Balqa)
    ],
  },
  {
    // The plateau of Moab from the Heshbon line to the Zered, the Mishor and
    // the country beyond the Arnon: Kir-Hareseth, with Machaerus and Kir of
    // Moab folded into it.
    name: 'Moab',
    cells: ['Medaba', 'Machaerus', 'Characmoba'],
    ring: [
      [35.50, 31.82], [35.60, 31.78], [35.78, 31.78], // the Heshbon line (shared with the Balqa)
      [35.95, 31.75], [36.15, 31.72], [36.30, 31.80], // (shared with Ammon)
      [36.55, 31.45], [36.45, 31.00],                 // the desert's edge, out to the Sirhan steppe
      [35.95, 30.90], [35.75, 30.93], [35.55, 30.98], // the Zered (shared with Edom)
      [35.50, 31.13],                                 // Zoar's plain (shared with the Negeb)
      [35.59, 31.25], [35.56, 31.45], [35.53, 31.70], // the water, along the lake's axis
    ],
  },
  {
    // Edom from the Zered to the Hisma, the red highland above the Arabah:
    // Sela, with Zoar, Shobak and Auara folded into it.
    name: 'Edom',
    cells: ['Petra', 'Zoara', 'Shobak', 'Auara'],
    ring: [
      [35.55, 30.98], [35.75, 30.93], [35.95, 30.90], [36.45, 31.00], // the Zered (shared with Moab)
      [36.50, 30.40], [36.20, 29.80],                 // the desert's edge
      [35.95, 29.35], [35.30, 29.35],                 // the Hisma's south
      [35.30, 29.60],                                 // the Gulf's east shore (shared with the Arabah)
      [35.25, 29.85], [35.35, 30.20], [35.40, 30.60], [35.42, 30.85], // the escarpment foot (shared with the Arabah)
    ],
  },
];

// Chapter -> ring list. The ground is the same in all three centuries; only
// the owners differ, and those are each chapter's own tables. The registry
// (js/data/compendium.js) attaches an entry as `bookmark.mapRegions`; a
// chapter absent here draws nothing and renders the atlas raster unchanged.
export const MAP_REGIONS = {
  '931bce': IRON_AGE_REGIONS,
  '732bce': IRON_AGE_REGIONS,
  '597bce': IRON_AGE_REGIONS,
};
