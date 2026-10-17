# Court insignia brief — Judaea Universalis

The current direction is **one large, centered insignia on a solid field**.
Use rich, saturated colours and broad geometric shapes. Review the actual rendered flag
at 14, 24 and 34px in [`tools/flags.html`](tools/flags.html).

## 1. Artwork and rendering

Every catalog and revival court needs explicit artwork in `FLAGS`.
Full-field designs live in `js/ui/flag_art.js` and are spread into the table
in `js/ui/icons.js`. Use the module's `standard(field, motif, options)` helper:

```js
XXX: standard('#234e87', device, { emblem: 'device-name', scale: 1.18 }),
```

The result uses `{viewBox: '0 0 96 96', flatBanner: true, body}`. `body` is
SVG content; the app provides the outer SVG. Legacy bare SVG strings still
work on their original 24-unit grid. New art should use full-field standards.

## 2. Composition

- Fill the square with one solid background colour.
- Place one device in the center; aim for 60–80% of the square's width or
  height, keeping clear space around it.
- Use one ink, normally bright gold, ivory or white. Use the field colour for open
  spaces inside a device when needed.
- Omit borders, corner brackets, edge patterns, scattered stars, wreaths,
  decorative stripes and extra badges on ancient standards.
- Keep modern national flag layouts where specified; their stripes and
  cantons are part of the flag itself.

The browser check measures the transformed device bounds to catch small,
off-center or edge-filling artwork. Optical adjustments can use `dx`/`dy`.
A larger viewBox provides drawing coordinates, not more display pixels.

## 3. Drawing style

Use solid silhouettes and broad strokes. Do not put dark outlines around
light shapes. Avoid eyes, faces, drawn fur, tiny limbs and pictorial scenes.
An animal that reads as clip art should become an abstract regional mark or
an object such as a bow, spear, anchor, altar or torc.

No cloth, folds, lighting, shading, gradients, filters, shadows, raster images,
external references or network loads. SVG paths, rectangles, circles, polygons
and groups suffice. The renderer scopes IDs for older rich SVG artwork;
that compatibility is not a reason to add effects to new flags.

## 4. Required prominent designs

| Court | Device and field |
| --- | --- |
| Byzantium | Gold Chi-Rho alone on purple |
| Modern Israel | White field, two blue stripes, blue Magen David |
| Kingdom of Israel | Gold Magen David on blue |
| Judaea | Broad Arch of Titus menorah with a polygonal stepped base, gold on blue |
| Hasmonean Judaea | Cornucopias and pomegranate, entirely gold on blue |
| Galilee | Earlier beige zodiac roundel on baby blue |
| Phoenicia | Gold angular Phoenician letter on purple, matching the supplied reference |
| Rome | Gold SPQR on red, without an eagle or wreath |
| Assyria / Persia | Simplified winged figure and disc |
| Babylonia | Gold eight-pointed star on blue |
| Samaria | Geometric Mount Gerizim on green |
| Qedar | Drawn bow; no small camel illustration |
| Saba | Abstract horns and disc; no frontal bull face |

## 5. Identity and coverage

All 210 catalog/revival courts need their own artwork. Related courts may
share a device with distinct fields; compare courts that appear together.
Runtime rebrands, chapter overrides and saved-game identities must continue
to work. Known courts must never use the synthetic saved-court fallback.

`smoke186` and `smoke213` check completeness, uniqueness, both SVG data shapes,
old saves and runtime identity. `uitest72` checks SVG validity, actual sizes,
centering, monochrome Hasmonean art and real desktop/mobile UI consumers.

## 6. Subject matter

Ancient and alternative banners are original game insignia inspired by period
motifs. Do not present them as attested historical flags. Follow the user's
specified designs even where they deliberately use a later symbol. Distinguish
a documented motif from an invented game device in explanatory notes.

## 7. Review

Inspect the full roster and the 14/24/34px samples, not just enlarged artwork.
Look for cramped shapes, faces, accidental visual jokes, poor contrast and
edge ornaments. Keep the requested centered composition through every UI
consumer.

## 8. The courts

The complete current roster is in [`tools/flags.html`](tools/flags.html):
210 catalog/revival courts with 96px previews and 14/24/34px samples.
`js/ui/flag_art.js` supplies 171 full-field designs. The table below
is an older motif reference, rather than the coverage checklist.

`NEW` is a marker from the older reference table, not the current review status. Everything
else is long-standing and is listed so you can match the house hand and avoid
collisions.

| Tag | Court | Capital | Field | | Current subject |
|---|---|---|---|---|---|
| `ISL` | Israel | Sebaste | `#3e8460` | NEW | the four-horned altar Jeroboam built at Bethel — "and he offered |
| `JDH` | Judah | Jerusalem | `#2858a8` | NEW | the lion of the blessing — "Judah is a lion's whelp... he couched |
| `ASR` | Assyria | Nineveh | `#7e282c` | NEW | the god Ashur in the winged disk — the standard that flew over |
| `BBL` | Babylon | Babylon | `#603e96` | NEW | the marru, Marduk's spade — the triangular blade on its shaft |
| `MIZ` | Egypt | Memphis | `#d6b248` | NEW | the pschent, the double crown — the tall white crown of the south |
| `DMS` | Aram-Damascus | Damascus | `#a8783c` | NEW | the forked lightning of Hadad, the storm god the Aramean kings |
| `TYR` | Tyre and Sidon | Tyre | `#7a2c7a` | NEW | the murex, the sea snail the city boiled by the ten thousand to |
| `PLS` | Philistia | Gaza | `#b46476` | NEW | the feathered headdress of the Sea Peoples, drawn rank on |
| `MOB` | Moab | Medaba | `#96744c` | NEW | the stele of Mesha — the black basalt slab on which a Moabite king |
| `AMO` | Ammon | Philadelphia | `#848c54` | NEW | the citadel of Rabbah on its hill — the round tower the kingdom |
| `EDM` | Edom | Petra | `#984e40` | NEW | Sela, the rock. "Thou that dwellest in the clefts of the rock, |
| `HMT` | Hamath | Emesa | `#ba9660` | NEW | the double-headed eagle of the Neo-Hittite cities, cut in relief |
| `QDR` | Qedar | Dumatha | `#c6a060` | NEW | the dromedary of the incense road. The Assyrian annals count |
| `URA` | Urartu | Tigranocerta | `#5c8494` | NEW | the sacred tree of Haldi, the palmette that stands on every |
| `PHR` | Phrygia | Ancyra | `#a0946c` | NEW | the cap. Every later people who wanted to say "freedman" or |
| `LYD` | Lydia | Smyrna | `#cea858` | NEW | the double axe. Herodotus has the Heraclid kings of Sardis |
| `ELA` | Elam | Susa | `#8c6ca4` | NEW | the serpent of Inshushinak, who guards Susa. Elamite kings sat on |
| `MDA` | Media | Ecbatana | `#7a60b0` | NEW | the akinakes, the short iron sword with the lobed pommel and the |
| `PAS` | Persia | Persepolis | `#9658b0` | NEW | the fire altar — the stepped plinth, the stepped crown and the |
| `TAB` | Tabal | Tyana | `#829276` | NEW | the grapes and the grain of the Ivriz relief, where the king of |
| `CRC` | Carchemish | Zeugma | `#947e68` | NEW | the pomegranate of Kubaba, the city's own goddess, who is |
| `ROM` | Rome | Antioch | `#a82424` |  | the legionary aquila — feathered wings raised beside the head, |
| `JUD` | Judaea | Jerusalem | `#24529e` |  | the seven-branched menorah of the Temple — parchment branches |
| `PAR` | Parthia | Seleucia-Ctesiphon | `#00786e` |  | the strung recurve bow and arrow of the Arsacid drachms. |
| `NAB` | Nabataea | Petra | `#c47c28` |  | the crow-stepped facade of Petra's tombs, an urn above. |
| `ARM` | Armenia | Tigranocerta | `#7a3e96` |  | the twin peaks of Ararat under the Artaxiad star. |
| `AGR` | Kingdom of Agrippa II | Caesarea Philippi | `#d67878` |  | the royal diadem — gold band, parchment gem and hanging ties. |
| `SEL` | Seleucid Empire | Antioch | `#ceb250` |  | the dynastic anchor of Seleucus I, gold ring and stock. |
| `PTO` | Ptolemaic Egypt | Alexandria | `#5a8cbe` |  | the eagle on the thunderbolt (tetradrachm reverse) — gold |
| `HAS` | Hasmonean Judaea | Jerusalem | `#2860aa` |  | crossed double cornucopiae of the prutot, pomegranate between. |
| `HYR` | Hyrcanus' Judaea | Hebron | `#5284c4` |  | the palm branch of the high-priestly coins — paired fronds |
| `ARI` | Aristobulus' Judaea | Jerusalem | `#1a3c80` |  | the usurper's diadem over a bared sword. |
| `OSR` | Osrhoene | Edessa | `#569484` |  | the crescent and star of the Edessan coins. |
| `ADI` | Adiabene | Arbela | `#8a60a0` |  | the royal tiara of the converted house. |
| `CHX` | Characene | Charax | `#5c98ac` |  | a merchant hull riding the Gulf swell. |
| `CMG` | Commagene | Samosata | `#b05c3a` |  | the star above the sacred mountain of the royal sanctuary. |
| `CYZ` | Cyzicene Syria | Damascus | `#8e5ea8` |  | the Seleucid anchor divided by the rival diadem. |
| `ITU` | Ituraea | Chalcis | `#708444` |  | the recurved bow of the mountain archers. |
| `HER` | Herod's Judaea | Hebron | `#946c2a` |  | the anchor of the Herodian coinage. |
| `ATG` | Antigonus' Judaea | Jerusalem | `#1e5260` |  | the seven-branched menorah of his last coins — drawn |
| `PNT` | Pontus | Sinope | `#006e8c` |  | the star and crescent of the Mithridatic royal badge, |
| `SAM` | Samaria | Neapolis | `#5c96c4` |  | Mount Gerizim under the altar fire. Their Torah's tenth |
| `BYZ` | Byzantium | Antioch | `#6e3082` |  | the chi-rho of the labarum, gold on parchment roundel. |
| `SAS` | Sasanian Persia | Seleucia-Ctesiphon | `#bc802c` |  | the fire altar of the drachm reverses. |
| `GHA` | Ghassanids | Bostra | `#962c34` |  | the cross of the phylarchs over a lance pennon. |
| `RSH` | Rashidun Caliphate | Hegra | `#267448` |  | the liwa of the conquest — the standard on its |
| `ISR` | Israel | Joppa | `#2468c4` |  | the real flag — white field, two blue stripes, blue Star of David. |
| `EGY` | Egypt | Memphis | `#2e804e` |  | the green royal flag — crescent and three stars. |
| `JOR` | Transjordan | Philadelphia | `#804828` |  | Transjordan — and Jordan (SPEC §107): the Hashemite tricolor, red chevron, |
| `SYR` | Syria | Damascus | `#588068` |  | green-white-black, three red stars. |
| `LEB` | Lebanon | Berytus | `#aa2842` |  | red-white-red and the cedar — three tiers of boughs on a trunk. |
| `IRQ` | Iraq | Seleucia-Ctesiphon | `#484850` |  | black-white-green, red trapezoid, two seven-pointed stars. |
| `TUR` | Turkey | Iconium | `#c85448` |  | the red flag, white crescent and star. |
| `GRC` | Greece | Corinth | `#346ab4` |  | the laurel wreath — two branches meeting under an open |
| `SAU` | Saudi Arabia | Hegra | `#28743c` |  | green, the sword beneath the creed (a calligraphy band). |
| `IRN` | Iran | Ecbatana | `#889446` |  | green-white-red, the sun of the lion-and-sun in gold. |
| `UK` | Britain | Salamis | `#9c405c` |  |  |
| `ITA` | Italy | Roma | `#2e8b57` |  | il Tricolore, full-field. |
| `MLI` | Kingdom of Israel | Jerusalem | `#2e46ac` |  | the Star of David whole and centered — |
| `UAR` | United Arab Republic | Memphis | `#1a6036` |  | United Arab Republic (formable): the two-star pan-Arab tricolor. |
| `PRJ` | Priestly Republic of Judaea | Jerusalem | `#3a6084` |  | the facade of the House as the tetradrachms drew |
| `RPJ` | Republic of Judaea | Jerusalem | `#963c36` |  | the chalice of the revolt's own silver — the only coinage of |
| `EPJ` | Ethnarchy of Judaea | Jerusalem | `#687e42` |  | the letter under seal. It is the office's whole instrument, |
| `KGJ` | Kingdom of Judaea | Jerusalem | `#a47828` |  | a diadem laid across the sword that won it, with no priestly |
| `PKJ` | Priestly Kingdom of Judaea | Jerusalem | `#7e4296` |  | one head, two offices — the diadem above, the mitre |
| `JEM` | Judaean Empire | Jerusalem | `#563e94` |  | ---- the two empires (SPEC §250) ------------------------------------------ |
| `IEM` | Israelite Empire | Jerusalem | `#1e3496` |  |  |
| `SAR` | Syrian Arab Republic | Damascus | `#46765c` |  | Syria after the secession of 1961 (SPEC §105): the independence flag of |
| `HEZ` | Hezbollah | Heliopolis | `#bea222` | NEW | the device on the party's own banner — the raised arm gripping |
| `LUK` | The Host of Lukuas | Cyrene | `#965c8a` | NEW | the Cyrenean rising of 115, which threw down the |
| `CAR` | Carthage | Carthago | `#943460` |  | --- the political west (SPEC §173) ------------------------------------- |
| `NUM` | Numidia | Cirta | `#b08c48` |  | the free horse of the royal coinage. |
| `MAU` | Mauretania | Volubilis | `#96602c` |  | the crescent over the Atlas, the far west's own sky. |
| `GRM` | The Garamantes | Garama | `#bc9e60` |  | the chariot wheel of the desert crossings, rock-carved |
| `MAS` | Massalia | Massilia | `#5a8ca0` |  | the galley prow that carried the west's oldest Greeks. |
| `CTB` | The Celtiberians | Numantia | `#9c5430` |  | the round caetra and the falcata that kept Numantia. |
| `LUS` | Lusitania | Bracara | `#7c6e3a` |  | crossed javelins behind the small shield of the raiding bands. |
| `AVN` | The Arverni | Avaricum | `#466e3c` |  | the boar of the Gaulish standards, bristles up. |
| `AED` | The Aedui | Augustodunum | `#608254` |  | the vergobret's torc, ends open — power handed over yearly. |
| `SEQ` | The Sequani | Vesontio | `#687c60` |  | the carnyx, the boar-headed trumpet of the Gaulish charge. |
| `BLG` | The Belgae | Durocortorum | `#426256` |  | the sheaf of spears of the bravest third. |
| `ARO` | The Armoricans | Darioritum | `#4e767c` |  | the leather sail of the Veneti, riding the tide. |
| `AQT` | The Aquitani | Burdigala | `#8c7c44` |  | the oak of the deep-forest country between river and mountains. |
| `NOR` | Noricum | Virunum | `#6e788c` |  | the sword on the anvil — the steel every legion bought. |
| `BOI` | The Boii | Boiohaemum | `#808c5a` |  | the bull of the herds that named Bohemia. |
| `BRT` | The Britons | Britannia | `#3c786e` |  | the La Tène triskele of the island bronzes. |
| `CAL` | Caledonia | Caledonia | `#5a5082` |  | the crescent and V-rod, cut on symbol stones nobody has read. |
| `HIB` | Hibernia | Hibernia | `#328250` |  | the triple spiral, older on that island than every kingdom of it. |
| `SUE` | The Suebi | Semnones | `#646e78` |  | the knot itself, combed high on every free head. |
| `CHE` | The Cherusci | Teutoburgium | `#827864` |  | the forest where the eagles went down — three standards, one broken. |
| `CHA` | The Chatti | Chatti | `#6e6450` |  | the shield and the spade — others go to battle, these go to war. |
| `FRS` | The Frisii | Frisia | `#788c96` |  | the terp above the tide — a house the sea walks around. |
| `CIM` | The Cimbri | Cimbria | `#8c96a0` |  | the brazen bull the priestesses carried to the Raudine plain. |
| `SCN` | The Suiones | Scandia | `#96a08c` |  | the ship-kings' hull, strong in oars and men. |
| `GOT` | The Gothones | Gothiscandza | `#6e8296` |  | the ring-hilted spear of the kings at the river mouth. |
| `AES` | The Aestii | Aestii | `#be9646` |  | the amber they alone gather, strung above the sea. |
| `DLM` | The Delmatae | Delminium | `#826478` |  | the hill fort ringed with dry stone, five times conquered. |
| `SCO` | The Scordisci | Singidunum | `#645064` |  | the thureos shield that reached Delphi twice. |
| `DRD` | Dardania | Naissus | `#5a5a78` |  | the watchtower above Macedon's road. |
| `THR` | Thrace | Philippopolis | `#aa5a6e` |  | the pelta and the two javelins of the peltast. |
| `DAC` | Dacia | Sarmizegetusa | `#c46e2c` |  | the draco — wolf's head, serpent's tail, wind for a voice. |
| `BOS` | The Bosporan Kingdom | Panticapaeum | `#4682aa` |  | the Spartocid trident-tamga of the straits. |
| `SCY` | Scythia | Tauria | `#96823c` |  | the drawn bow and the gorytos that emptied itself and left. |
| `SRM` | Sarmatia | Sarmatia | `#786432` |  | the tamga of the lance-bearing clans. |
| `VEN` | The Venedae | Venedia | `#647864` |  | the pine forest east of everyone's maps. |
| `OST` | The Ostrogoths | Ravenna | `#5a5aa0` |  | the Amal eagle of the cloisonné fibulae, wings squared. |
| `VAN` | The Vandals | Carthago | `#3c648c` |  | the sail that took Carthage's sea and Rome's grain. |
| `VIS` | The Visigoths | Toletum | `#967828` |  | Toledo's votive crown, hung above the altar on chains. |
| `FRK` | The Franks | Lutetia | `#28508c` |  | the francisca, thrown once, at the start, to break the line. |
| `BGD` | Burgundy | Lugdunum | `#8c4632` |  | the law-book under the crown — the code that outlived the kingdom. |
| `GEP` | The Gepids | Singidunum | `#785a3c` |  | the great eagle buckle of the Tisza graves. |
| `LMB` | The Lombards | Mediolanum | `#508278` |  | the Iron Crown — a band of gold around a nail of iron. |
| `SAX` | The Saxons | Teutoburgium | `#a08c6e` |  | the two seaxes, points down, the island's new heraldry. |
| `AVA` | The Avar Khaganate | Sirmium | `#aa5028` |  | the horse-tail tug before the ring. |
| `SLV` | The Sclaveni | Venedia | `#6e9646` |  | the broad axe and the oak sprig of the river peoples. |
| `TRK` | The Western Turks | Sarmatia | `#5078be` |  | the wolf standard of the Ashina above the bow. |
| `BGR` | The Bulgar Hordes | Phanagoria | `#8c6ea0` |  | the Dulo tamga — IYI, cut on every stone they left. |
| `FRA` | France | Lutetia | `#2846a0` |  | the real flags, same muted palette as the rest of the chapter -- |
| `SPA` | Spain | Toletum | `#ba3a22` |  |  |
| `POR` | Portugal | Olisipo | `#24743a` |  |  |
| `NLD` | The Netherlands | Batavia | `#dc7828` |  |  |
| `DEN` | Denmark | Selandia | `#be2c2c` |  |  |
| `SWE` | Sweden | Scandia | `#326eaa` |  |  |
| `POL` | Poland | Gothiscandza | `#c8505a` |  |  |
| `CZE` | Czechoslovakia | Boiohaemum | `#5468ac` |  |  |
| `SOV` | The Soviet Union | Hyperborea | `#b41c1c` |  |  |
| `GER` | Occupied Germany | Mogontiacum | `#323236` |  |  |
| `AUT` | Austria | Carnuntum | `#a86c6c` |  |  |
| `HUN` | Hungary | Aquincum | `#749456` |  |  |
| `YUG` | Yugoslavia | Singidunum | `#566096` |  |  |
| `ALB` | Albania | Dyrrhachium | `#82282c` |  |  |
| `BUL` | Bulgaria | Serdica | `#5a966e` |  |  |
| `ROU` | Romania | Tomis | `#c8aa46` |  |  |
| `IRL` | Ireland | Hibernia | `#148c3c` |  |  |
| `SUI` | Switzerland | Genava | `#c83c46` |  |  |
| `BEL` | Belgium | Atuatuca | `#bc9c3c` |  | the Low Countries' missing pair, in the same flag hand as their |
| `LUX` | Luxembourg | Luxembourg | `#7896b9` |  |  |
| `KSH` | Kush | Meroe | `#a4602c` |  | ---- the political east and south (SPEC §205) ---- |
| `NOB` | Nubia | Napata | `#965838` |  | the drawn bow of Ta-Seti, the Land of the Bow — the oldest name |
| `BLM` | The Blemmyes | Blemmyae | `#ba8c4c` |  | crossed camel-lances over the desert moon. |
| `AXM` | Aksum | Aksum | `#785428` |  | the great stele of the royal field, its false door at the foot, |
| `SAB` | Saba | Marib | `#b48232` |  | the bull's head of Almaqah between the ibex horns of the temple |
| `HMY` | Himyar | Zafar | `#9c6a30` |  | the crowned eagle of the Zafar reliefs over the crescent. |
| `HDR` | Hadramawt | Shabwa | `#8c7440` |  | the incense burner of the Shabwa altars, coals alight. |
| `OMA` | Oman | Omana | `#ac4234` |  | the dhow that worked the strait before anyone wrote its name. |
| `SAK` | Sakastan | Phrada | `#9678aa` |  | the pointed cap of the Saka tigraxauda, tall on every coin |
| `GBA` | Bactria | Antiochia Margiana | `#60969e` |  | the war elephant of the royal tetradrachms. |
| `CHO` | Chorasmia | Chorasmia | `#828c64` |  | the walled oasis of the lower Oxus — towered ramparts square |
| `HEP` | The Hephthalites | Chorasmia | `#a06450` |  | the crescent-and-trident tamga of their drachms. |
| `ETH` | Ethiopia | Shewa | `#3c6e3c` |  | the real flags, same muted palette as the chapter's west -- |
| `YEM` | Yemen | Zafar | `#822828` |  |  |
| `AFG` | Afghanistan | Artacoana | `#465a46` |  |  |
| `PAK` | Pakistan | Makuran | `#286442` |  |  |
| `LBR` | Liberia | Kru Coast | `#2e4282` |  |  |
| `USA` | The United States |  | `#3c5aa0` |  | the 48-star field, at chip scale. |
| `REB` | Rebels |  | `#606060` |  | a tattered banner on a bare gold pole. |
| `USR` | The Rival Purple |  | `#964268` |  | the vexillum — the square banner hung from |
| `USV` | The Second Purple |  | `#765c8a` |  | the same vexillum, hung the other way — a |
| `LST` | The Lestai |  | `#7a3e38` |  | the sica, the short curved knife a highway robber |
| `PIR` | The Peiratai |  | `#2e4c58` |  | a galley under sail, the bronze ram at the |

---

## 9. How to hand work back

Add or revise the entry in `js/ui/flag_art.js`, preserving explicit tag
assignments and the current renderer contract. Add a short note where the
motif needs explanation; label invented game devices accurately. Verify
coverage with `smoke213` and inspect the gallery at game sizes. Do not copy
an old outlined glyph from `icons.js` as a new full-field design.
