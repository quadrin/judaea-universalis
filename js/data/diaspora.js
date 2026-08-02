// Judaea Universalis — the communities of the dispersion (SPEC §172). Content
// package: zero imports, read by js/sim/diaspora.js.
//
// WHY THIS FILE REPLACED A PANEL ROW. The Diaspora used to be an off-map power
// (SPEC §55): one entry in "The Powers Beyond the Map", with a standing bar and
// two asks — silver, and volunteers. That is the wrong shape for it in one
// specific way, and the way matters.
//
// The powers beyond the map are beyond the map because they are: the Senate in
// a century the frame does not reach, a khaganate on the far side of the
// Caucasus. The dispersion is not beyond the map. Alexandria is ON the map,
// and it is the second city of the world; so is Babylon, so is Nehardea, so is
// Cyrene, so is Rome. Making them one abstract bar meant that the largest
// Jewish population in the world was a number in a panel, while the province it
// lived in sat there on the board owned by somebody else and told you nothing.
//
// So each community is a PLACE now. You click Alexandria and you can write to
// the Jews of Alexandria — and what you can ask for depends on how large that
// community is, how it feels about your crown, and whether the empire that owns
// the province is currently paying attention.
//
// KEYED ON THE CANONICAL NAME. `prov` is the map's own name for the cell, not
// the era's label, so one entry speaks to every chapter: Seleucia-Ctesiphon is
// Baghdad in 1948 and Memphis is Cairo, and the community in it is continuous
// in a way the label is not. `ctx.prov()` resolves both.
//
// EACH ENTRY:
//   prov     canonical province name
//   tag      INSTEAD of prov (SPEC §195): the community lives under a court,
//            not on a cell — an off-map host like 1948's United States. It is
//            written to from that court's own nation panel, the way §180's
//            off-map seats carry their own envoys.
//   name     what the panel calls them
//   size     1-5. Scales everything they can give and how long they take to
//            recover from giving it.
//   dev      tag entries only: silver is pegged to the host province's
//            development (§176), and a community with no province needs a
//            stand-in for what its world is worth.
//   from     the year the community is there in strength (BCE negative)
//   until    …and the year it is not, or null for "still there"
//   start    opening standing toward a Jewish crown, 0-100
//   blurb    one line, printed in the panel
//
// The windows are the load-bearing part and they are not decoration. The
// Alexandrian community — the largest in the world, a third of a city of half a
// million — is destroyed in the Kitos War of 115-117 and never recovers; a
// campaign that reaches 117 CE loses the biggest node on this list, and should.
// Leontopolis is a temple Vespasian closes in 73. Babylon and Nehardea go the
// other way: they outlast everything, which is why the centre of the Jewish
// world moves east, and why the 614 chapter can still write to them.
//
// AND THE EAST HAS AN END TOO (SPEC §176). The first draft left the eastern
// windows open forever, which handed the 1948 chapter a dispersion that no
// longer existed to be written to: Salonica five years after the deportations,
// and Baghdad as a standing silver farm through decades in which the real
// community was stripped, airlifted and gone. So the modern closes are on the
// list now, each on its own date, the same way 117 is. Iraq ends in 1952 —
// the Denaturalisation Law of March 1950 opens a one-year exit and Operations
// Ezra and Nehemiah fly the community out entire, twenty-five centuries in
// fourteen months of charters. Syria's halved community is sealed under an
// exit ban by 1950 — hostages in the literal sense, not correspondents.
// Lebanon, the one Arab republic whose community GROWS after 1948, holds
// until the aftermath of 1967; Iran thins but stands until the Revolution in
// 1979. Rome and the Turkish cities stay open: nobody is expelled from Rome
// or Istanbul, and a window that closed itself out of tidiness would be the
// same lie in the other direction. The 1948 chapter plays the departure it
// can see — the asks still work while the communities are still there, which
// in 1948-51 they were, and the absorption chain (events_1948_absorption.js)
// answers for where they went.
//
// AND THE SEA HAS A WESTERN HALF (SPEC §194). The first list stopped, with
// its chapters' centre of gravity, at Cyprus: ten communities east of the
// island, five in Egypt and Cyrenaica, and the whole European shore held four
// cells — Rome, Salonica, Corinth, Byzantion — with nothing at all west of
// Sicily. The period's own documents enumerate more. When Simon's envoys came
// home in 139 BCE, Rome circulated a letter to the free cities commanding
// that the Jews be left in peace, and the address list (1 Macc 15) is a map
// of the Greek sea: Sparta, Rhodes, Gortyna, Caria, Pamphylia, Cyprus,
// Cyrene. Agrippa's letter in Philo (Legatio 281-2) makes the same survey a
// century later — Cilicia, Attica, Argos, Corinth, Euboea, Crete. So the
// address book carries its western half now: Asia Minor and the islands,
// Greece, Italy and Sicily, Africa west of Cyrene, Sepharad and Gaul. Same
// rules, same honesty about the ends — the Aegean deportations of 1944 close
// Rhodes and Crete the way 1943 closed Salonica; the expulsions close the
// Latin west centuries before the modern chapter (France 1306, Sepharad
// 1492, Sicily 1493, Naples 1541), so the 1948 dispersion map draws that
// whole shore as memory, hatched per §175 rather than forgotten; and the
// Maghreb closes the way the east closes, one date per flag, while Volubilis
// stays open, because Morocco is the one community of the Arab world that
// never entirely goes.
//
// AND THE NILE HAS A SPRING (SPEC §207). When §203 carried the frame south
// to the Ethiopian highlands, it carried it to the one community this list
// could not have held before: the Beta Israel of the Semien and the Tana
// country, who kept the Orit without ever hearing of the Talmud, and who
// did not reliably know — for a thousand years at a stretch — whether any
// other Israel was left alive. Their window opens where the 132 chapter's
// own world spine puts it (ev2_takkaze_refusers, 345: the withdrawal of
// those who refused Ezana's Cross) and closes the way the east closes, on
// the year the community actually went: Operation Solomon, 24-25 May 1991,
// the whole remnant to Lod in thirty-six hours. The 1948 chapter plays both
// airlifts (events_1948_region.js), and the honest hedge about the origin
// is written on the entry itself.

export const DIASPORA = [
  // ── Egypt ────────────────────────────────────────────────────────────────
  {
    prov: 'Alexandria', name: 'The Jews of Alexandria', size: 5,
    from: -300, until: 117, start: 55,
    blurb: 'Two of the five quarters, their own ethnarch and council, and a synagogue so '
      + 'large the sources say a man at the back could not hear the blessing and had to be '
      + 'signalled with a flag. The largest Jewish community in the world.',
  },
  {
    prov: 'Leontopolis', name: 'The House of Onias', size: 2,
    from: -160, until: 73, start: 45,
    blurb: 'A second temple, in Egypt, founded by a high priest who lost the first one — '
      + 'with its own altar, its own courses, and a military colony of Jewish soldiers '
      + 'settled around it by the Ptolemies.',
  },
  {
    prov: 'Memphis', name: 'The Jews of Memphis', size: 2,
    from: -300, until: 117, start: 45,
    blurb: 'Older than the Ptolemies and older than the Greeks: Jewish soldiers and '
      + 'traders in the old capital, on papyrus, in Aramaic, since the Persians.',
  },
  // ── The roof of Africa (SPEC §207) ───────────────────────────────────────
  {
    // The Beta Israel. Their origin is genuinely argued — refusers of Ezana's
    // conversion withdrawing upcountry, Agaw judaizers of the following
    // centuries, or an older Israelite seed, as the community's own tradition
    // holds; the first unambiguous outside attestation is medieval, in royal
    // chronicles that call them ayhud and announce their final defeat once a
    // generation. This game takes its own spine at its word: the window opens
    // the year the 132 chapter's withdrawal card fires (ev2_takkaze_refusers,
    // 345), five years after Ezana strikes the Cross on his gold, and closes
    // on the year the community actually went — Operation Solomon, 24-25 May
    // 1991, 14,325 people in thirty-six hours, the whole remnant to Lod.
    // Start 40: devotion in isolation, toward a ledger they do not know
    // exists.
    prov: 'Tana', name: 'The Beta Israel', size: 2,
    from: 345, until: 1991, start: 40,
    blurb: 'Behind the Takkaze, on mountain ambas the empires cannot be bothered to '
      + 'climb: a people who keep the Orit without the Talmud, with monks, with the '
      + 'Sigd fast of longing for Jerusalem — and with no way of knowing, for a '
      + 'thousand years at a stretch, whether any other Israel is left alive.',
  },
  // ── Cyrenaica ────────────────────────────────────────────────────────────
  {
    prov: 'Cyrene', name: 'The Jews of Cyrene', size: 3,
    from: -300, until: 117, start: 50,
    blurb: 'One of the four orders of the city by Strabo\'s count. In 115 they will rise, '
      + 'and the rising will be put down so thoroughly that the province has to be '
      + 're-colonised.',
  },
  {
    prov: 'Berenice', name: 'The Community at Berenice', size: 1,
    from: -250, until: 117, start: 45,
    blurb: 'A small, rich, well-organised congregation that voted honours to its patrons '
      + 'on stone, in Greek, like any other civic body in Cyrenaica.',
  },
  // ── Syria and Asia ───────────────────────────────────────────────────────
  {
    prov: 'Antioch', name: 'The Jews of Antioch', size: 4,
    from: -300, until: null, start: 50,
    blurb: 'Settled since Seleucus, with the bronze doors of the great synagogue said to '
      + 'be spoils the city gave back. The largest community in Syria, and the most '
      + 'exposed when Syria turns.',
  },
  {
    // Halved by flight after the Aleppo pogrom of 1947 and the war; the
    // remnant is sealed under an exit ban that runs into the 1990s — held
    // hostage, not writing letters. The window shuts in 1950.
    prov: 'Damascus', name: 'The Jews of Damascus', size: 2,
    from: -200, until: 1950, start: 50,
    blurb: 'A community large enough that Josephus makes its massacre a number, and old '
      + 'enough that Paul is sent there to find synagogues already waiting.',
  },
  {
    // Lebanon is the one Arab republic whose community GROWS after 1948,
    // taking in Syrian and Iraqi refugees — until the 1958 crisis starts the
    // decline and the aftermath of 1967 finishes it.
    prov: 'Tyre', name: 'The Jews of Tyre', size: 1,
    from: -200, until: 1968, start: 40,
    blurb: 'Merchants and dyers in a city that has never quite decided whether the '
      + 'people up the coast are neighbours or competitors.',
  },
  // …and Asia Minor, where the attestation is the period's own paperwork:
  // Antiochus III plants two thousand Jewish families westward as garrison
  // colonists (Josephus, Ant. 12.147), and the Ionian cities spend the next
  // two centuries petitioning to have their Jews' citizenship unsaid, all the
  // way to Agrippa's tribunal — and losing.
  {
    // On stone to the end — the Jewish epitaphs of Cilicia run into the sixth
    // century — and then the Arab wars turn the province into the devastated
    // march between two empires, and the window shuts with the cities
    // themselves.
    prov: 'Tarsus', name: 'The Jews of Tarsus', size: 2,
    from: -200, until: 650, start: 45,
    blurb: 'Settled westward by the kings, who knew that garrison colonists who keep '
      + 'covenants are worth the land they cost. A city of Stoics and linen-weavers — one '
      + 'of its Jewish sons will spend his life writing letters to Corinth, Thessalonica '
      + 'and Rome.',
  },
  {
    // Izmir's community was never expelled: it thins toward Israel after 1948
    // on its own feet, like Istanbul's, and the window stays open on the same
    // rule as Rome's.
    prov: 'Smyrna', name: 'The Jews of Smyrna', size: 2,
    from: -250, until: null, start: 40,
    blurb: 'Citizens of Ionia since the second Antiochus said they were — a grant the '
      + 'Greek cities have petitioned every power since to unsay, and none has. The '
      + 'harbour hears everything the Aegean carries, and repeats most of it.',
  },
  // ── Mesopotamia and Persia: the half that outlasts everything ────────────
  // …until 1952. The four Iraqi windows close together: registration under
  // the Denaturalisation Law opens in March 1950, the property freeze of
  // March 1951 takes everything not already carried, and Ezra and Nehemiah
  // fly the community to Lod entire by early 1952. The oldest continuously
  // settled diaspora on earth ends in fourteen months of charter flights.
  {
    prov: 'Babylon', name: 'The Jews of Babylon', size: 4,
    from: -580, until: 1952, start: 60,
    blurb: 'Five centuries settled and counting. They did not come back when they were '
      + 'invited to, and they have never stopped sending the half-shekel.',
  },
  {
    prov: 'Nehardea', name: 'The Academy at Nehardea', size: 3,
    from: -580, until: 1952, start: 65,
    blurb: 'Where the half-shekel of the whole east is gathered before it goes up, behind '
      + 'walls the community garrisons itself. In time the law will be written here.',
  },
  {
    prov: 'Seleucia-Ctesiphon', name: 'The Jews of the Twin Cities', size: 3,
    from: -280, until: 1952, start: 55,
    blurb: 'At the King of Kings\' own doorstep, which is the whole of their advantage and '
      + 'the whole of their danger.',
  },
  {
    prov: 'Arbela', name: 'The House of Adiabene', size: 2,
    from: -20, until: 1952, start: 75,
    blurb: 'Not a community but a converted royal house: Queen Helena and her sons, who '
      + 'endowed Jerusalem, fed it in the famine, and sent men to die on its walls.',
  },
  {
    // Qamishli sits on the Syrian side of the Jazira in 1948: it goes out
    // with Damascus, under the same ban.
    prov: 'Nisibis', name: 'The Jews of Nisibis', size: 2,
    from: -100, until: 1950, start: 55,
    blurb: 'The strongpoint on the road east, where the Temple tax of the eastern '
      + 'communities is banked under guard before the caravan takes it up.',
  },
  // Iran is not Iraq: the community thins toward Tehran and Tel Aviv after
  // 1948, but it stands — synagogues open, dues collected — until the
  // Revolution. Both Persian windows close in 1979.
  {
    prov: 'Susa', name: 'The Jews of Susa', size: 1,
    from: -400, until: 1979, start: 50,
    blurb: 'Shushan the palace, where the story is set that the eastern communities read '
      + 'aloud once a year and everyone else has to have explained.',
  },
  {
    prov: 'Ecbatana', name: 'The Jews of Ecbatana', size: 1,
    from: -400, until: 1979, start: 45,
    blurb: 'In the summer capital of dead empires, keeping the calendar and the accounts '
      + 'of whoever is currently ruling.',
  },
  // ── The west ─────────────────────────────────────────────────────────────
  {
    prov: 'Roma', name: 'The Jews of Rome', size: 3,
    from: -60, until: null, start: 40,
    blurb: 'Across the Tiber, in a dozen congregations that do not agree with each other, '
      + 'with the ear of anyone who wants the eastern vote — and no protection at all when '
      + 'the mood turns.',
  },
  {
    // In 536 the Jews of Naples hold their stretch of the walls against
    // Belisarius to the end — Procopius says so, a little surprised. The
    // kingdom of Naples expels them in 1541, the last expulsion of the Latin
    // west, and the window carries Campania to it and no further.
    prov: 'Capua', name: 'The Jews of Campania', size: 2,
    from: -50, until: 1541, start: 40,
    blurb: 'Campania is where the east steps ashore in Italy: the grain fleet docks here, '
      + 'and every envoy, pretender and rumour out of Judaea lands among these '
      + 'congregations days before Rome has heard.',
  },
  {
    // Held longer than almost anywhere in the Latin west — and then the
    // Decree of 1492 runs wherever Aragon rules, and the island's dozens of
    // communities go out together in the winter of 1493.
    prov: 'Syracusae', name: 'The Jews of Sicily', size: 2,
    from: -50, until: 1493, start: 40,
    blurb: 'Dyers, quarrymen and dealers in a Greek city under Roman law, their dead in '
      + 'painted catacombs beside everyone else\'s. Popes will write more letters about '
      + 'Sicily\'s Jews than about its governors.',
  },
  {
    // Deported to Auschwitz in the spring and summer of 1943. The window is
    // already shut when the 1948 chapter opens, and the map hatches it
    // (§175) — the first draft left Salonica writable five years after,
    // which was not an oversight this game could keep.
    prov: 'Thessalonica', name: 'The Jews of Salonica', size: 2,
    from: -140, until: 1943, start: 40,
    blurb: 'On the road that carries everything between the two halves of the empire, '
      + 'which is why every traveller with news stops here first.',
  },
  {
    prov: 'Salamis', name: 'The Jews of Cyprus', size: 2,
    from: -200, until: 117, start: 45,
    blurb: 'Numerous enough on a small island to matter, and in 117 numerous enough to '
      + 'rise — after which no Jew may set foot on Cyprus on pain of death.',
  },
  {
    prov: 'Corinth', name: 'The Jews of Corinth', size: 1,
    from: -100, until: null, start: 40,
    blurb: 'A synagogue by the harbour of a city that exists because two seas nearly '
      + 'touch, hearing everything from both of them.',
  },
  {
    // Half of Athens' Jews survived the occupation on papers the police chief
    // and the archbishop forged for them, and the community stands today — so
    // the window stays open, and 1948's writable Greece is Athens, not
    // Salonica, which is the plain postwar fact.
    prov: 'Athens', name: 'The Jews of Athens', size: 1,
    from: -100, until: null, start: 40,
    blurb: 'A small congregation in the city of the schools, which pays them the '
      + 'compliment it pays everybody: it argues with them daily in the agora, and keeps '
      + 'an altar spare in case it has missed a god.',
  },
  {
    // The record in Laconia fades out of the late Roman centuries, and Alaric
    // burns what is left of the city in 396. Kept open past that, the window
    // would put a writable Sparta in Justinian's Greece, which nobody attests.
    prov: 'Sparta', name: 'The Kinsmen at Sparta', size: 1,
    from: -170, until: 396, start: 50,
    blurb: 'The kings here once wrote to the High Priest that Spartans and Jews are '
      + 'brothers, both of the stock of Abraham — an embassy\'s genealogy, gravely renewed '
      + 'by treaty ever since. When a deposed High Priest had nowhere left in the world, '
      + 'he came here to die on the strength of it.',
  },
  {
    // Deported on the last boats of July 1944 — seventeen hundred people, the
    // longest run any deportation made, and the war over within the year. The
    // same rule as Salonica: the 1948 map hatches it.
    prov: 'Rhodes', name: 'The Jews of Rhodes', size: 1,
    from: -170, until: 1944, start: 40,
    blurb: 'A congregation in the island republic whose harbour law is the sea\'s law and '
      + 'whose news is the sea\'s news. Rome\'s letter commanding the free cities to leave '
      + 'the Jews in peace went to Rhodes by name.',
  },
  {
    // The last community of Crete — the Jews of Chania, entire — went down
    // with the ship deporting them, torpedoed on 9 June 1944. Twenty-one
    // centuries end in one hull, and the window ends with them.
    prov: 'Gortyn', name: 'The Jews of Crete', size: 1,
    from: -170, until: 1944, start: 40,
    blurb: 'Island Jews on the grain road between Alexandria and Greece, named in Rome\'s '
      + 'circular beside Gortyna\'s own magistrates. A historian of the great revolt will '
      + 'marry a daughter of this community.',
  },
  {
    prov: 'Byzantion', name: 'The Jews of Byzantion', size: 1,
    from: -100, until: null, start: 40,
    blurb: 'A modest congregation in a well-placed town — which in a few centuries will '
      + 'be the least modest position in the world to hold.',
  },
  // ── Africa west of Cyrene ────────────────────────────────────────────────
  // The Maghreb ends the way the east ends (§176): one date per flag, each
  // the year the community actually went. Tripoli 1952 — the pogroms of 1945
  // and 1948, then thirty thousand sail for Haifa in three years and Libyan
  // independence closes the gate on a remnant: the Iraq rule, applied west.
  // Constantine 1962 — Algeria's Jews are French citizens by decree, and when
  // France goes they go with it, entire, in one summer. Tunis 1967 — the
  // exodus that begins at independence becomes final the week of the June
  // war, with the Great Synagogue's furniture burning in the street. Only
  // Volubilis stays open: Morocco thins from a quarter-million toward a
  // remnant, but it is the one community of the Arab world that never
  // entirely goes.
  {
    // Punic Carthage attests no community; Roman Carthage does, thickly — a
    // Jewish necropolis at Gamart, and Africa's church fathers arguing
    // against the synagogue for whole careers. The window opens with the
    // captives of 70, four years into the Great Revolt's own chapter, which
    // is when the story says the west received them.
    prov: 'Carthago', name: 'The Jews of Carthage', size: 3,
    from: 70, until: 1967, start: 45,
    blurb: 'The refounded city is Rome\'s Africa, second in the west only to Rome — and '
      + 'its community, the story runs, was swelled by captives of the fallen House sold '
      + 'west. Africa\'s lawyers will spend whole careers arguing against them, which is '
      + 'its own kind of respect.',
  },
  {
    prov: 'Oea', name: 'The Jews of Tripolitania', size: 2,
    from: -50, until: 1952, start: 45,
    blurb: 'Traders on the Tripoli shore, with cousins in the hill country who farm the '
      + 'terraces, keep the Law, and have never seen a city. Empires hold this coast '
      + 'lightly; the communities hold on regardless.',
  },
  {
    prov: 'Cirta', name: 'The Jews of Cirta', size: 2,
    from: 200, until: 1962, start: 40,
    blurb: 'Jews of the Numidian capital, leaving Latin epitaphs like any other citizens '
      + 'of the stone-cutting town. They will outlast the kings, the legions, the Vandals '
      + 'and the conquest, and leave only when the last empire does.',
  },
  {
    // The oldest Hebrew inscription of the far west is a woman's epitaph
    // here — Matrona, a rabbi's daughter. When the roads move to Fez, the
    // community moves with them; the canonical cell carries it the way
    // Memphis carries Cairo.
    prov: 'Volubilis', name: 'The Jews of the Farthest West', size: 2,
    from: 200, until: null, start: 45,
    blurb: 'Past here there is only ocean. A tombstone in Hebrew at the edge of the '
      + 'inhabited world marks the community at the end of every road — and at the end of '
      + 'every era on this map, it is still there.',
  },
  // ── Sepharad and Gaul ────────────────────────────────────────────────────
  // The Latin west closes by expulsion, centuries before the modern chapter:
  // 1306 takes Narbonne with the rest of Philip's France, the Decree of 1492
  // takes Sepharad and, in 1493, Sicily, and Naples follows in 1541. So the
  // 1948 dispersion map draws this whole shore as memory — hatched, per
  // §175's rule, not forgotten. The one window still open on it is
  // Marseille, and that is not a courtesy: in the 1948 chapter the port is
  // the departure's own pier, the camps above the harbour shipping the
  // Maghreb's and Europe's Jews east.
  {
    // Attested the way the west attests things: by legislation against them.
    // The bishops in council at Elvira write their canons around 305;
    // Sisebut's forced baptisms fall in the very years the 614 chapter
    // plays — a community whose host is converting it by force is exactly
    // the hostage problem §172 built; and the Decree of 1492 closes it.
    prov: 'Corduba', name: 'The Jews of Sepharad', size: 2,
    from: 300, until: 1492, start: 45,
    blurb: 'The community calls the country Sepharad and will one day insist its fathers '
      + 'came west with the first exile. The bishops in council have already ruled that '
      + 'Christians must stop dining with them — a canon nobody needs against dinners '
      + 'that are not happening.',
  },
  {
    // Twice attested by a Gregory: Tours' — the refugees of Clermont's
    // forced conversions row for Marseille in 576 — and the Great's,
    // rebuking the bishops of Arles and Marseille in 591 for baptisms at
    // sword-point. Open to the end, because the community is.
    prov: 'Massilia', name: 'The Jews of Massilia', size: 1,
    from: 450, until: null, start: 40,
    blurb: 'The old Greek port takes in whoever the interior drives out, to the fury of '
      + 'the interior\'s bishops and the quiet satisfaction of the port\'s shipowners. A '
      + 'community that lives with one foot on the pier.',
  },
  {
    // Septimania: Visigothic while Spain is, so Sisebut's statutes reach
    // here too — and French by 1306, when the general expulsion closes it.
    prov: 'Narbo', name: 'The Jews of Narbonne', size: 1,
    from: 460, until: 1306, start: 40,
    blurb: 'Merchants and vine-growers of the Gothic province between Spain and Gaul, '
      + 'answering to whichever crown holds the pass this generation. Crowns pass; the '
      + 'community keeps the ledgers.',
  },
  // ── The Atlantic world (SPEC §195) ───────────────────────────────────────
  // Two hosts the 1948 chapter cannot be honest without. England expelled its
  // medieval community in 1290 and readmitted Jews under the Protector in
  // 1656; the gap falls between this game's bookmarks, so the single window
  // opens at the Resettlement and tells no lie to any chapter. And the United
  // States is not on the map at all — the frame ends at the Atlantic — but it
  // is a seated court on the ledger (§180), and in 1948 it hosts the largest
  // Jewish community there has ever been. A community with no cell is written
  // to from its host court's own panel, which is where §180 already keeps the
  // envoys of an off-map power.
  {
    prov: 'Londinium', name: 'The Jews of London', size: 3,
    from: 1656, until: null, start: 45,
    blurb: 'Bankers, tailors and members of Parliament, readmitted by Cromwell and never '
      + 'since molested by the law — a community whose host both wrote the charter of the '
      + 'return and closed the gates of the Land, and which argues both facts in '
      + 'committee.',
  },
  {
    // The stand-in development (§176 needs one where no cell exists) is 40,
    // the richest host on the list: one gathering is 80 talents on the
    // five-year clock — real money beside §186's government credits without
    // double-writing them, because the appeal and the Export-Import Bank
    // were different purses in fact. The risk roll is historical too: the
    // procurement network's ships were seized and its buyers indicted, and
    // the reprisal fell on the community's own men. And the volunteer bar is
    // MET on day one — the one community devoted enough from the start —
    // because Machal was: the flyers and gunners of 1948 came off these
    // docks while the State Department's embargo stood.
    tag: 'USA', name: 'The Jews of America', size: 5, dev: 40,
    from: 1880, until: null, start: 60,
    blurb: 'Five million, in the one great host that never expelled anybody: the '
      + 'community that fills the appeal in a single dinner, argues with itself in two '
      + 'languages, and can put a word into the White House by Tuesday. The old rules of '
      + 'the dispersion bend here; the asks do not.',
  },
];

// What a community will do for a crown, and what asking costs it. Sizes scale
// the yield — silver also by the host province's development (§176) — and
// standing gates access.
export const DIASPORA_ASKS = [
  {
    id: 'silver',
    name: 'Ask for silver',
    verb: 'The half-shekel, gathered early',
    desc: 'The communities\' dues, collected ahead of the festival and sent up with the '
      + 'caravan instead of with the pilgrims.',
    need: 35,
    standing: -12,
    cd: 60,
    infl: 5,
    // Per point of size × the HOST province's development (SPEC §176). The
    // half-shekel is gathered out of what the community's city is worth: a
    // flat per-size rate paid Berenice like a small Alexandria and every ask
    // like a mint, and at 22 a size point on a 30-month clock the dispersion
    // out-earned the realm's own tax rolls. Now Alexandria at dev 28 sends
    // real silver, a desert port at dev 5 sends a gesture, and a city that
    // is sacked — or grows — sends what it has. The clock is a generation's
    // patience, not a festival's.
    treasuryPerDev: 0.4,
    risk: 0.15,
  },
  {
    id: 'volunteers',
    name: 'Ask for men',
    verb: 'Young men, and passage for them',
    desc: 'Sons of the community who would rather be counted in the Land than safe where '
      + 'they are. Their families will not all forgive it.',
    need: 55,
    standing: -20,
    cd: 48,
    infl: 12,
    manpowerPer: 420,
    risk: 0.3,
    war: true,
  },
  {
    id: 'intercession',
    name: 'Ask them to speak for us',
    verb: 'A word with the men who decide',
    desc: 'The community\'s patrons, its ethnarch, and whoever it has spent thirty years '
      + 'being useful to — turned, for once, on our behalf.',
    need: 45,
    standing: -10,
    cd: 36,
    infl: 15,
    opinionPer: 6,
    risk: 0.2,
  },
  {
    id: 'letters',
    name: 'Ask for letters',
    verb: 'What they hear, and who from',
    desc: 'What a congregation at the centre of an empire knows before the provinces do: '
      + 'what the court intends, what the price of grain will be, whose command is ending.',
    need: 25,
    standing: -6,
    cd: 24,
    infl: 0,
    inflPer: 7,
    risk: 0.08,
  },
];

// ---------------------------------------------------------------------------
// The window, in one place (SPEC §175).
//
// This predicate existed twice — once in js/sim/diaspora.js as `communityDef`
// and once inline in the Compendium (js/ui/wiki.js) — and the two had already
// drifted: the Compendium tested only the chapter's OPENING year, so 167 BCE
// listed thirteen communities and silently omitted the seven whose windows
// open inside it, Leontopolis among them. A player looking at the era page was
// told the House of Onias was not in this game. It is; Onias founds it seven
// years in.
//
// So the window is a function now, exported from the data it belongs to, and
// the sim, the map and the Compendium all call it. `yearsAt` converts BCE
// years to astronomical ones on both sides of every comparison, because -160
// is one year, not minus-one-hundred-and-sixty of them.
export function yearsAt(y) { return y < 0 ? y + 1 : y; }

/** Is this community present in `year`? */
export function openAt(d, year) {
  if (!d) return false;
  const y = yearsAt(year);
  if (Number.isFinite(d.from) && y < yearsAt(d.from)) return false;
  if (Number.isFinite(d.until) && d.until !== null && y >= yearsAt(d.until)) return false;
  return true;
}

/** Has this community's window CLOSED by `year` — as against never opening? */
export function shutBy(d, year) {
  if (!d || !Number.isFinite(d.until) || d.until === null) return false;
  return yearsAt(year) >= yearsAt(d.until);
}

/** The entry keyed on a canonical province name, or null. */
export function communityOf(provName) {
  if (!provName) return null;
  for (const d of DIASPORA) if (d.prov === provName) return d;
  return null;
}

/** The entry hosted by a COURT rather than a cell (SPEC §195), or null. */
export function tagCommunityOf(tag) {
  if (!tag) return null;
  for (const d of DIASPORA) if (d.tag === tag) return d;
  return null;
}

/** Every community present in `year`, largest first. */
export function communitiesAt(year) {
  return DIASPORA.filter((d) => openAt(d, year)).slice().sort((a, b) => b.size - a.size);
}

/**
 * Every community a chapter running from `y0` to `y1` will ever be able to
 * write to, largest first. This is what an era page wants: a chapter is a span
 * of years and not an instant, and a list built from the opening date alone is
 * a list of the communities you happen to start with.
 */
export function communitiesBetween(y0, y1) {
  const last = Number.isFinite(y1) ? y1 : y0;
  return DIASPORA
    .filter((d) => {
      // Present at some point inside [y0, y1]: its window opens on or before
      // the chapter ends, and closes on or after the chapter begins.
      const from = Number.isFinite(d.from) ? yearsAt(d.from) : -Infinity;
      const until = (Number.isFinite(d.until) && d.until !== null) ? yearsAt(d.until) : Infinity;
      return from <= yearsAt(last) && until > yearsAt(y0);
    })
    .slice()
    .sort((a, b) => b.size - a.size);
}
