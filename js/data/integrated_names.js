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
