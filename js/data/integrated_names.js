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
