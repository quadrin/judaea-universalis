// Judaea Universalis — shared culture/religion province-name layers.
// DOM-free, dependency-free. Keys are MAP_DATA canonical province names.
//
// This is a deliberately conservative Jewish pen, not a Hebrew-name
// generator. It combines attested Biblical Hebrew names with established
// names used by Jewish communities (Mahoza, Netzivin, Aram Tzova, Kushta,
// Saloniki, Izmir, Adrianople, Tripoli). A bookmark's own integratedNames table remains authoritative,
// so period-specific foundations and modern Israeli choices can override it.
//
// Source spine:
// - Hebrew Bible: Joshua 12–13; Ezekiel 27 and 30; Ezra 6.
// - Encyclopaedia Iranica, "Talmud ii" and "Mada'en" (Mahoza/Ctesiphon).
// - Oxford Classical Dictionary, "Leontopolis, temple of" (Temple of Onias).
// - National Library of Israel community archives (Kushta/Istanbul, Saloniki,
//   Izmir, Adrianople/Edirne, Tripoli, and the Italian communities).
// - Academy of the Hebrew Language place-name and transliteration guidance.
//
// Transliteration here is unpointed ASCII throughout (Gush Halav, not Gush
// Ḥalav; Hims, not Ḥims). That is the file's existing practice and the thing a
// signpost at chip size can actually be read as; the underlying forms are the
// same.
export const JEWISH_INTEGRATED_NAMES = Object.freeze({
  // Judaea, Galilee, Philistia, and the coast.
  'Jerusalem': 'Yerushalayim',
  'Jericho': 'Yeriho',
  'Lydda': 'Lod',
  'Joppa': 'Yafo',
  'Engaddi': 'Ein Gedi',
  'Machaerus': 'Mikhvar',
  'Sepphoris': 'Tzippori',
  'Jotapata': 'Yodfat',
  'Tiberias': 'Tverya',
  'Gischala': 'Gush Halav',
  'Gaza': 'Azza',
  'Ascalon': 'Ashkelon',
  'Azotus': 'Ashdod',
  'Jamnia': 'Yavneh',
  'Hebron': 'Hevron',
  'Adora': 'Adorayim',
  'Sebaste': 'Shomron',
  'Neapolis': 'Shechem',
  'Antipatris': 'Afek',
  'Caesarea Maritima': 'Kesariya',
  'Dora': 'Dor',
  'Ptolemais': 'Akko',
  'Scythopolis': 'Beit She\'an',
  'Safed': 'Tzfat',
  'Bethlehem': 'Beit Lehem',
  'Beersheba': 'Be\'er Sheva',
  'Oboda': 'Avdat',
  'Masada': 'Metzada',
  'Tarichaea': 'Migdal',
  'Rafah': 'Rafiah',
  'Jenin': 'Ein Ganim',
  'Ramallah': 'Ramah',
  'Rhinocolura': 'Nahal Mitzrayim',

  // The Jordan valley, Transjordan, and northern Arabia.
  'Pella': 'Pehal',
  'Gadara': 'Gader',
  'Gerasa': 'Gerash',
  'Philadelphia': 'Rabbat Ammon',
  'Batanea': 'Bashan',
  'Gamala': 'Gamla',
  'Aila': 'Eilat',
  'Dumatha': 'Dumah',
  'Medaba': 'Medva',
  'Tayma': 'Tema',
  'Zoara': 'Tzoar',
  'Petra': 'Rekem',
  'Bostra': 'Botzrah',
  'Caesarea Philippi': 'Panias',
  'Yathrib': 'Yatrib',
  'Khaybar': 'Heivar',

  // Phoenicia and Syria: Biblical forms plus Aleppo's Jewish communal name.
  'Tyre': 'Tzor',
  'Sidon': 'Tzidon',
  'Byblos': 'Geval',
  'Aradus': 'Arvad',
  'Damascus': 'Damesek',
  'Beroea': 'Aram Tzova',
  'Palmyra': 'Tadmor',
  'Antioch': 'Antiokhiya',
  'Samosata': 'Shimshat',
  'Tarsus': 'Tarsos',
  'Berytus': 'Berotai',
  'Tripolis': 'Trablus',
  // SPEC §225's districts, in the same register as the cities over them:
  // Baalbek is the Ba'al Gad of Joshua's northern list, and the rest keep the
  // Hebrew forms of the names they are already known by.
  'Heliopolis': 'Ba\'al Gad',
  'Nabatieh': 'Nabatiya',
  'Chouf': 'Shuf',
  'Jounieh': 'Yuniya',
  'Batroun': 'Batrun',
  'Akkar': 'Arka',   // the Arkite of Genesis 10:17, on the plain the district is named for
  'Mount Hermon': 'Har Hermon',
  'Quneitra': 'Kuneitra',
  'Emesa': 'Hims',
  'Laodicea': 'Ludkia',
  'Apamea': 'Afamia',

  // Egypt: names in the Hebrew Bible and Egyptian Jewish memory.
  'Alexandria': 'Alexandria of Egypt',
  'Pelusium': 'Sin',
  'Leontopolis': 'Beit Honio',
  'Memphis': 'Nof',
  'Thebes': 'No-Amon',
  'Syene': 'Seveneh',

  // The eastern diaspora. Province-scale names deliberately use the nearby
  // Jewish city or regional name where that is what Jewish sources preserve.
  'Nisibis': 'Netzivin',
  'Seleucia-Ctesiphon': 'Mahoza',
  'Babylon': 'Bavel',
  'Charax': 'Meshan',
  'Ecbatana': 'Ahmeta',
  'Susa': 'Shushan',
  'Gazaca': 'Ginzak',
  'Gabae': 'Yahudiya',
  'Assur': 'Ashur',
  'Uruk': 'Erech',
  'Edessa': 'Urhai',
  'Carrhae': 'Haran',
  'Singara': 'Sinjar',
  'Arbela': 'Hadyab',
  'Nehardea': 'Neharde\'a',
  'Dura-Europos': 'Dura',
  'Amida': 'Amid',

  // Greece, Anatolia, Italy, and North Africa: durable names used along the
  // Mediterranean diaspora road. These are communal exonyms and later city
  // names, not a claim that every form was coined in Biblical Hebrew.
  'Athens': 'Atuna',
  'Corinth': 'Korintos',
  'Rhodes': 'Rodos',
  'Salamis': 'Salamina',
  'Paphos': 'Pafos',
  'Cyrene': 'Kirene',
  'Oea': 'Tripoli',
  'Capua': 'Kapua',
  'Tarentum': 'Taranto',
  'Brundisium': 'Brindisi',
  'Rhegium': 'Reggio',
  'Panormus': 'Palermo',
  'Syracusae': 'Siracusa',
  'Roma': 'Romi',
  'Dyrrhachium': 'Durazzo',
  'Thessalonica': 'Saloniki',
  'Hadrianopolis': 'Adrianople',
  'Byzantion': 'Kushta',
  'Nicaea': 'Iznik',
  'Smyrna': 'Izmir',
  'Ancyra': 'Ankara',
  'Sinope': 'Sinop',
  'Trapezus': 'Trabzon',
  'Iconium': 'Konya',
  'Attalia': 'Antalya',
  'Caesarea Mazaca': 'Kayseri',
  'Melitene': 'Malatya',
  'Halicarnassus': 'Bodrum',
  'Phasis': 'Poti',
  'Hyrcania': 'Gorgan',
});

// The Keepers' pen (SPEC §147). The layer above answers for every JEWISH state
// alike; the Samaritans had nothing but the nine names their own chapter wrote
// down, so a Samaritan realm that took the coast integrated Caesarea and the
// signpost went on reading Caesarea.
//
// It is a separate register and not a copy, because the difference between the
// two pens is the whole argument of the 529 chapter (§136). The editorial rule
// here is: **where the Torah names a place, this pen writes the Torah's name.**
// The Samaritan canon is the Pentateuch and nothing else — no Joshua, no Kings,
// no Ezekiel, none of the books the Jewish table above draws half its entries
// from — and where the Torah is silent the pen falls back on Samaritan Aramaic,
// the language of the Defter and the chronicles.
//
// That rule does most of the work by itself, and it lands hardest on one city.
// The Torah never says *Jerusalem*. It says **Shalem**, once, of Melchizedek's
// town (Gen. 14:18), and thereafter only "the place which the LORD shall
// choose" — which this people reads, and has always read, as Gerizim. So the
// Keepers' pen does not write Yerushalayim. It writes the one name its own
// scripture gives, and declines the argument.
//
// Three more places where the two canons diverge and the pen follows the Torah:
// Hebron is **Kiryat Arba** (Gen. 23:2, "Kiryat Arba, that is Hevron"),
// Bethlehem is **Efrat** (Gen. 35:19, "Ephrath, which is Bethlehem"), and
// Ramallah's hill is **Luza** (Gen. 28:19, "Luz was the name of the city at
// first"). Each is the older half of a gloss the Torah itself supplies.
//
// Honesty about what this is: Shalem, Kiryat Arba, Efrat and Luza are Torah
// names applied by editorial choice, not attestations of Samaritan daily
// speech — the community's own later sources say Jerusalem like everyone else.
// The rule is a claim about what this pen is FOR, in the same spirit as the
// note above that the Jewish table's Mediterranean entries are communal
// exonyms rather than Biblical coinages.
//
// Sources: the Samaritan Pentateuch for the Torah forms; Samaritan Aramaic for
// Qisri, Pahel, Garshu and the rest; Abu'l-Fath's Kitab al-Tarikh for the later
// toponyms of the hill country, which is a fourteenth-century chronicle and
// late for a sixth-century chapter — flagged rather than leaned on.
// Transliteration is unpointed ASCII, as above.
export const SAMARITAN_INTEGRATED_NAMES = Object.freeze({
  // The mountain and the hill country: the four provinces and their approaches.
  'Neapolis': 'Shechem',
  'Sebaste': 'Shomron',
  'Jenin': 'Ein Ganim',
  'Tulkarm': 'Tur Karma',
  'Qalqilya': 'Qalqilya',
  'Antipatris': 'Migdal Afeq',
  'Afula': 'Ophel',
  'Ramallah': 'Luza',

  // Palaestina Prima: the coast, the Shephelah, and the city they do not call
  // by the name the other pen calls it.
  'Jerusalem': 'Shalem',
  'Jericho': 'Yeriho',
  'Emmaus': 'Ammaus',
  'Lydda': 'Lod',
  'Joppa': 'Yafo',
  'Jamnia': 'Yavne',
  'Azotus': 'Ashdod',
  'Ascalon': 'Ashqelon',
  'Gaza': 'Azza',
  'Hebron': 'Kiryat Arba',
  'Adora': 'Adorayim',
  'Bethlehem': 'Efrat',
  'Beit Shemesh': 'Beit Shemesh',
  'Engaddi': 'Ein Gedi',
  'Masada': 'Metzada',
  'Beersheba': 'Be\'er Sheva',
  'Caesarea Maritima': 'Qisri',
  'Dora': 'Dor',

  // Palaestina Secunda: the lake, the Galilee, and the Golan.
  'Scythopolis': 'Beit She\'an',
  'Ptolemais': 'Akko',
  'Sepphoris': 'Tzippori',
  'Jotapata': 'Yodfat',
  'Tiberias': 'Tveria',
  'Tarichaea': 'Migdal',
  'Gischala': 'Gush Halav',
  'Safed': 'Tzfat',
  'Caesarea Philippi': 'Dan',
  'Batanea': 'Bashan',
  'Gamala': 'Golan',
  'Gadara': 'Gadar',
  'Pella': 'Pahel',

  // Palaestina Tertia, the Negev road and Arabia.
  'Petra': 'Reqem',
  'Oboda': 'Avdat',
  'Aila': 'Elat',
  'Zoara': 'Tzoar',
  'Medaba': 'Medva',
  'Philadelphia': 'Rabbat Ammon',
  'Gerasa': 'Garshu',
  'Bostra': 'Botzra',
  'Machaerus': 'Mekhvar',
  'Gadora': 'Gedor',
  'Rhinocolura': 'Nahal Mitzrayim',
  'Dumatha': 'Dumah',
  'Tayma': 'Tema',
  'Kadesh Barnea': 'Kadesh Barnea',

  // Phoenice and Syria.
  'Tyre': 'Tzor',
  'Sidon': 'Tzidon',
  'Byblos': 'Geval',
  'Berytus': 'Berot',
  'Aradus': 'Arvad',
  'Tripolis': 'Trablus',
  'Damascus': 'Damesek',
  'Emesa': 'Hims',
  'Palmyra': 'Tadmor',
  'Beroea': 'Halab',
  'Antioch': 'Antiokhia',
  'Chalcis': 'Halkis',
  'Heliopolis': 'Ba\'al Gad',
  'Mount Hermon': 'Har Hermon',

  // Egypt, where the community kept synagogues from the Ptolemies onward and
  // argued its case before them (Josephus, Ant. XIII.74-79). Mof rather than
  // the Jewish table's Nof: both are attested, and Mof is the older spelling.
  'Pelusium': 'Sin',
  'Memphis': 'Mof',
  'Thebes': 'No Amon',
  'Alexandria': 'Aleksandria',
});

// A crown's own pen, shared across bookmarks (SPEC §110). The religion table
// above answers for every Jewish state alike, which is right for Judaea,
// Adiabene and the rest — and wrong for the one crown whose whole claim is
// that it is NOT another Judaea. `MLI`, the proclaimed Kingdom of Israel,
// aliases to the era's Jewish tag in all six bookmarks, so taking the greatest
// title in the game changed precisely nothing on the map.
//
// So it gets a register of its own: not city names but the TRIBAL ALLOTMENTS
// of Joshua 13–19. A proclaimed Israel does not rename Sepphoris to Tzippori,
// which is only a municipality with better spelling — it writes Nahalat
// Zevulun across it, and the map stops being a list of towns and becomes the
// territorial frame the books describe. This is the ancient-era version of the
// instinct the 1948 table already states, that an Israel which takes the hill
// country "writes the names the books of Kings remember".
//
// Keyed by tag, so a future formable can have a pen without another copied
// table. A bookmark's own `integratedNames` entry still describes the era; this
// layer wins where it names a province and stands aside where it does not.
export const TAG_INTEGRATED_NAMES = Object.freeze({
  MLI: Object.freeze({
    'Sebaste': 'Har Ephraim',
    'Scythopolis': 'Nahalat Yissakhar',
    'Gamala': 'Golan',
    'Batanea': 'Bashan',
    'Caesarea Philippi': 'Dan',
    'Ptolemais': 'Nahalat Asher',
    'Sepphoris': 'Nahalat Zevulun',
    'Joppa': 'Nahalat Dan',
    'Gadara': 'Gil\'ad',
    'Philadelphia': 'Nahalat Gad',
    'Medaba': 'Nahalat Re\'uven',
    'Hebron': 'Nahalat Yehudah',
  }),
});
