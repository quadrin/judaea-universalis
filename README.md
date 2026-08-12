# Judaea Universalis

**▶ Play it now: https://quadrin.github.io/judaea-universalis/**

An EU4-style grand-strategy game set in the ancient Near East. Nine bookmarks,
every one played from an Israelite side:
**The Maccabean Revolt, 167 BCE** (Hasmonean Judaea),
**The Judaean Civil War, 67 BCE** (Hyrcanus, Aristobulus, or Adiabene),
**Herod's Rise, 40 BCE** (Herod, Antigonus, or Adiabene),
**The Great Revolt, 66 CE** (Judaea, Agrippa II's kingdom, or Adiabene),
**The Bar Kokhba Revolt, 132 CE** (Judaea or Adiabene),
**The Rising Against Gallus, 351 CE** (the Galilee, while the Empire fights itself),
**The Keepers, 529 CE** (Samaria under Justinian),
**The Persian Gambit, 614 CE** (the Return),
and **The War of Independence, 1948** (Israel).

Zero dependencies, no build step: browser ES modules + WebGL2.

## Run

```sh
python3 -m http.server 8613 --directory .
# open http://localhost:8613
```

## Saves

Saved campaigns go into your browser's own database (IndexedDB) and are listed
in **▤ Saved campaigns** on the title screen, or behind the amphora in the
topbar while you play. Click one to load it, or Delete to remove it (two taps,
so a mis-tap costs nothing). There is nothing to configure and nothing to
download — the old export/import-a-file buttons are gone.

Two things worth knowing: clearing this site's data in your browser settings
removes them (the game asks the browser to mark them as worth keeping, which
Chrome grants silently and Firefox prompts for), and they are per-browser. If
you want them to follow you between devices, set up the optional cloud below.

## The cloud (optional)

Six-character invite codes and save-syncing between devices are backed by one
small key-value service — a ~180-line Cloudflare Worker in
[`server/`](server/README.md), the only server this game has. **Saves work
without it.** Deploy it once and point the game at it:

```sh
cd server && npx wrangler kv namespace create JU   # paste the id into wrangler.toml
npx wrangler deploy
```

Then set `DEFAULT_ENDPOINT` in `js/net/cloud.js`. You can also pass
`?cloud=https://ju-cloud.<you>.workers.dev` in the URL, but an endpoint that
arrives that way is used for the multiplayer handshake only until you accept it
in the Saves panel — a shared link should not be able to redirect your saves.

**Without it nothing is broken**: saves live in your browser as described above,
and multiplayer falls back to hand-carried invite/reply codes. Nothing about the
static site, the zero dependencies, or the missing build step changes.

## What's in the slice

- Province map of the whole classical world — the Atlantic to the edge of
  India's approaches, Britain to the Horn of Africa: all of Iran to the
  Makran and Merv, all of Ethiopia to the lakes, Nubia, Arabia entire, the
  Sahel to the Gulf of Guinea (~415 permanent cells, Judaea at city/district
  density), GPU-generated province-ID texture, EU4-style mapmode shaders,
  heightmap relief, parchment crossfade at strategic zoom. Europe's country
  borders are DRAWN, not grown: nineteen hand-traced 1948 rings that the
  raster obeys to the pixel (SPEC §232), so France is France-shaped — and in
  the 1948 chapter every established country plays as one province under its
  own name, while the theatre keeps the districts the war is fought in.
- A political west — and, beyond the Euphrates and the cataracts, a political
  east and south — in every chapter: nine per-era maps seat some 77 courts
  on the ground beyond the original theater. Carthage, Masinissa's Numidia
  and the Arverni hegemony in 167 BCE; Kush under its warrior queens, the
  Periplus' own cast of 66 CE (Zoscales' Aksum, Charibael's Himyar-and-Saba,
  Eleazus' frankincense kingdom), Sakastan and Greco-Bactria on the Helmand;
  the Tervingi in the Dacia Rome gave up, the Alamanni on the far Rhine bank
  and a post-Meroitic Nile in 351; the Ostrogoths, Vandals, Franks and
  Moorish kings in 529 (Justinian no longer holds an Italy he hadn't
  reconquered yet — and Kaleb of Aksum holds the Yemen he took four years
  before); the Avar khaganate and the Sclaveni
  in 614; Stalin's Europe in 1948, Paris to Moscow under their 1948 names,
  with Haile Selassie's Ethiopia, the Imam's Yemen and one-year-old Pakistan
  at the map's new edges. Every one is a living AI court — convening,
  electing, dying, fighting its own wars — and every province beyond the
  theater carries a levy share (1 / 0.2 / 0.1 by century) so Rome's Rhine
  legions stay on the Rhine instead of doubling the army it brings to Judaea.
- Map labels that name the ground: zoom in for province names, out for nations —
  one name per *region* a court holds rather than one per court, so a realm in two
  places reads **JUDAEA** at home and **JUDAEAN GREECE** across the sea instead of
  averaging the two into one label floating in the water between them.
- Mapmodes: political, diplomatic, trade, terrain, religion, culture,
  development, unrest, estates, and the dispersion — where the Jewish
  communities of the diaspora are, how large, and how they regard your crown.
- The realm panel is seven tabs behind a pinned header — Crown, Missions,
  Court, Technology, Host, Faith, World — so the ruler, the four numbers you
  watch and the five levers stay put while twenty sections take turns
  underneath them. Each section is filed by what it *is*: the doctrine needles
  are a portrait of the realm and hang on Crown beside faith and tongue; the
  world's way of doing things is a surcharge on every rung of every ladder and
  so is listed under the ladders it taxes; the chapter you are living through
  is what history asks of you and sits above the mission tree that asks the
  rest; and the patterns your three arms muster as are the army's business,
  read on the Host even though the ladders that buy them are on Technology.
- Pausable daily tick (5 speeds), monthly economy/manpower, armies, battles, sieges, attrition.
- Three land arms with eighteen soldiers between them, and each one has a face,
  a gait and a weakness. **The foot** holds the line, **the horse** breaks it,
  **the shot** — slingers, archers, bolt engines, naphtha crews, cannon,
  anti-tank guns — outranges both. They answer each other in a triangle: the
  shot breaks a formed line, the line brakes a charge, the charge rides down
  the shot. Every pattern flies its own emblem on the map (a spear at 167 BCE,
  a barded cataphract under the Hasmoneans, a tank in 1948), marches at its
  own pace — a column keeps its slowest arm's, so an ordinary hop is four days
  for horse, five for foot and six once the guns are along — and makes its own
  noise when you put it on the road or into the line: tramping feet, a
  four-beat canter of hooves, diesel and track clatter. Armor is the century's
  exception: nothing on foot stops it, and the guns, the sky and broken ground
  are what do.
- Flagship system: unrest → revolt, plus a ~25-event scripted chain from Josephus
  (Beth Horon, Vespasian's landing, the Zealot coup, the Year of the Four Emperors, the Temple).
- Win/loss per side; alt-history window for a surviving Judaea.
- A shelf of saved campaigns (yearly autosave + a row per press of the quill), listed
  with nation, date and chapter, loadable in one click from the title screen or
  mid-campaign. They live in your browser's own database — nothing to set up, nothing to
  download, and no file to hunt for when you want to play again. Optionally copied to a
  cloud so they follow you between devices. Monarch-point sinks too (develop provinces,
  buy stability, call reserves).
- A realm panel behind the topbar flag: your ruler and their skills (which drive monthly
  monarch points), religion/culture/capital, stability, legitimacy, war exhaustion, economy,
  manpower & armies, allies/wars/truces — plus the central levers (reserves, stability, loans)
  and five national decisions (festival, rites, trade expeditions, drills, resettlement)
  for peacetime play.
- Province names follow integration, not occupation. Every Jewish state in every
  bookmark inherits a shared pen of more than sixty Hebrew and historic Jewish names,
  from Yerushalayim and Tzor to Mahoza, Shushan, Saloniki and Kushta; bookmark-specific
  choices such as Herod's foundations and 1948 Israel's Nitzana override it.
- EU4-style peace negotiation for non-scripted wars: build a deal from occupied provinces
  (highlighted gold on the map while you negotiate), an indemnity, humiliation, or
  subjugation into a tribute-paying client kingdom — priced against your war score; losing
  AIs sue for peace, AI-vs-AI wars settle themselves, and five-year truces follow every
  treaty. Victorious courts now negotiate according to their character and war aim:
  conquerors press claims, containment wars dismantle rivals, overlords restore the yoke,
  and spare leverage buys clients, reparations, prestige or gold. Exhausted coalition
  members initiate their own separate offers, and an overreaching player demand may return
  as an affordable counteroffer instead of a flat refusal. Fabricating a claim from a
  foreign province's diplomacy block costs 30 influence points up front and takes four
  months before the claim becomes a usable casus belli.
- Diplomatic wars now name a concrete **war goal** — conquest, a pressed claim,
  liberation, independence, containment, a punitive coalition, or succession.
  Holding the objective after a six-month grace period generates ticking war score
  (up to 25); the war overview shows its controller and contribution. The peace table
  discounts demands that fulfill the stated purpose and makes unrelated annexations
  costlier, while historical scripted wars keep their authored score rules.
- Win hard enough and the treaty can force the enemy to **free states**: restore a fallen
  court, return an old homeland to a still-living neutral country, or create a new cultural
  state from enemy territory even when no country there was recently conquered. Every
  package is priced by development against war score and the one-treaty dismemberment cap;
  the old master keeps its capital, remembers the loss, and plots reconquest. Liberation
  earns no infamy. The same congress can transfer one of the enemy's direct client kingdoms
  to you intact — its land, ruler and army survive while its tribute and war duty change hands.
- **The chancery has only so many envoys.** A standing bond is an establishment, not a
  purchase: every alliance, guarantee, royal marriage, subsidy and client kingdom takes one
  of your realm's seats (four, plus influence technology, plus a ruler who is good at this).
  With the seats spent, the next offer is refused — and so is theirs, because a court whose
  own chancery is full has no envoy to spare for you. What you keep past the establishment is
  billed monthly in influence, and every court that owes you nothing thinks a little less of
  you for it. The peace table is the exception, because a treaty is force and not diplomacy:
  a subjugation clause lands on you whatever your establishment can staff. Client kingdoms
  bring their own pressure on top — hold more collars than you can attend to, or collars that
  weigh too much of the realm, and every client's regard sinks toward a floor below what a
  union needs, so a wide client empire can be held but not digested. And a state you freed at
  your own table will not kneel to the hand that freed it for a generation, which is what
  stopped "free four nations, collar them with their own gratitude, and eat them one by one"
  from being the cheapest expansion in the game. The 1948 chapter, whose diplomacy is blocs
  and pacts, keeps none of this.
- **A crown of its own.** Every road to a client kingdom used to run through somebody else's
  country — subjugate them at the peace table, take an enemy's vassal at a congress, offer an
  ally the collar. So a realm sitting on foreign towns it will never digest had two answers,
  hold them or lose them, and never the one the ancient east actually used: hand the ground
  its own crown and keep the tribute. Now a province of yours can be **released as a client
  kingdom** from its own panel. A court you conquered rises again on its own homeland under
  its own name; land whose people are not your people becomes a new state of its culture and
  faith, seated at its best town under an **ethnarch** of its own; and a second grant of the
  same people joins the client you already made instead of founding a rival to it. The land
  goes at its own autonomy with the conqueror's mark struck off, pays you the client's 15%,
  follows you to war, takes a chancery seat — and can be woven back into the realm years
  later, once it is devoted enough. It costs influence and no infamy at all: nobody was
  conquered. What you may never let go of is the capital, a living court's old homeland
  (that is a cession, and it is agreed at a table with them), ground an enemy army is
  standing in, more than half the realm at once — or your own people, because a state carved
  out of your own is a secession and secessions are suffered rather than granted.
- **And the collar comes off.** A client kingdom used to have exactly three exits and none of
  them was yours: you died, you ate them, or they rose and won. **Release Them** now sits
  beside Incorporate on the client's own panel and does the opposite thing — nothing moves
  except the fealty. They keep every province at the autonomy it had, every regiment where it
  was standing, their court, their treasury and their laws, and walk off with the lot. The
  tribute stops, your chancery seat comes back, the collars you keep chafe less for it, and
  they remember the hand that struck it — though they will not take that hand's collar again
  for a decade, so it is not a move to make twice. It costs no influence at all: the price is
  the client. The one thing that refuses it is a war, because a client that walks out of one
  has not been freed, it has deserted.
- **The crown is one.** Two courts claiming one throne is the oldest shape in this game's
  material — Hyrcanus and Aristobulus in 67 BCE, Antigonus and Herod in 40 — and the engine
  used to see a border dispute. A chapter now names its **claimants**, and the war between
  them is a crown war: its pen belongs to the claimant rather than to whichever great power
  is fighting beside him, so Rome and Parthia settle no Jewish crowns and a client claimant
  is not handed a junior's withdrawal form for the one war his chapter is about. And its
  table can write the answer both men say they are fighting for. **Take the whole kingdom**
  at 80 war score: the loser renounces, every province of his passes at once whether your
  armies are standing in it or not, his host disperses, and his court passes into memory.
  One flat price, because a kingdom is one thing and not a list of towns — the old road
  (occupy every acre and demand all of it) priced Antigonus' Judaea at more war score than
  exists. It replaces every other term, the world counts it once rather than by the acre,
  and it is symmetric: the AI signs it too, so a crown war lost badly enough is a crown lost.
- **And the collar can be thrown off from below.** A client kingdom's exits all belonged to
  somebody else — the lord dies, the lord absorbs you, the lord lets you go, or (for an AI
  alone) you rise and win. A human client had no move at all, which is a strange thing to
  hand a player whose chapter starts him in a collar: Herod is Rome's client from the first
  day of 40 BCE, and Adiabene rides in Parthia's train in three bookmarks with *stand free
  of every overlord* written into its own victory text. **Throw Off the Yoke** now sits on
  your overlord's own panel. The bond breaks first and the war follows — an ordinary war of
  independence, no infamy for the soil you are standing on, and if you lose it the yoke goes
  back on at the table. It costs no influence; the price is the war. Not in the middle of
  somebody else's, because a crown that breaks its word while its levies stand in another
  man's line has not won its freedom, it has changed sides.
- **The peace table runs both ways now, and there is a deed that needs no table.** Every
  term used to point one direction — you could demand provinces, gold, reparations, a
  humiliation, a collar — so a realm that was *losing* had exactly one move, a white peace,
  and one answer: *they believe they are winning, and will not settle for nothing*. That is
  not how these wars ended. Now you can lay your own provinces on the table beside what you
  ask, and any of them will do: not just what their armies occupy, not just what they can
  march to, not just what is worth having. Colonised wasteland, a frontier cell, your own
  capital. Each is credited at exactly what they would have paid to take it, the treaty
  settles on the difference, and they sign when the offer covers what their war has earned
  — or refuse and name the number. And outside a war entirely, **Give It Away** on your own
  province hands it to the court that governs next door or to one you are sworn to: no war,
  no treaty, no price, and a court that will not forget it. Not while an enemy stands in the
  province, not while a war is running, and never the last province of the realm.
- A foreign court's decision is not yours to make: events that dramatize another realm's
  choice (what Rome decrees, what the Nasi ordains, what Cairo funds) now arrive for
  everyone else as a single-button notice naming the deciding court — the historical
  course simply happens. Play the deciding nation and the full choice is yours.
  And where both answers belonged to a court nobody can play — whether Uthman burns
  the variant leaves, whether Rome deifies Vespasian, whether al-Hajjaj's catapults
  pause for the sanctuary at Mecca — the campaign rolls for it instead of asking:
  the recorded course two times in three, the road the chronicles did not take the
  rest. Twenty-five such cards, from the ambush that killed Sidetes to Black
  September. The roll is the campaign's own seeded stream, so a replay, a reload
  and a multiplayer guest all see the same world.
- **The Compendium** (📖 on the title screen): the game's own wiki, generated live from
  the data — every chapter with its timeline and every event's printed consequences,
  the playable standards with their guidance and win/loss contracts, every nation of
  every era (temperament, national character, rulers, crowns), the formable nations
  with requirement checklists, and the shared pool of omens. It can never go stale,
  because it reads the same modules the engine plays — and it lives on the title
  screen alone, where campaigns are chosen rather than fought.
- Mortal rulers with heirs, regencies and succession crises; mission trees per playable
  nation; a shared pool of random events; holy sites and wonders that pay their keeper.
- **A crown can be taken from the court that wore it.** Forming a nation used to require a
  banner nobody had *ever* flown, which quietly reserved every crown on the map for the
  court that started with it — beat that court out of existence and its name sat in the
  records forever, unusable. Now a banner is free when nobody is flying it, and the crown
  the rule exists for is Agrippa II's. The last Herodian spent his life as king of a Golan
  valley and two towns Nero was feeling generous about, while his family asked Caesar for
  Judaea entire; play him, put the rising down, hold Jerusalem and the country at Jericho,
  Sepphoris and Tiberias, and — with Caesar content, or having stopped asking him — you
  **proclaim the Kingdom of Judaea** and are styled King of the Jews. It pays like a kingdom
  rather than a client: levies, a treasury, and the custody of the vestments that made the
  Herodian title worth more than a governorship. The dead court's debts do not come with its
  name, so nobody inherits a rival's alliances along with the crown.
- **Statecraft**: twenty repeatable decisions that arrive because you rule, not because the
  weather turned — and they open as the realm grows. A small state argues about judges who
  disagree on ancestral custom, a garrison nobody has paid, and a second city that wants a
  charter. A larger one rules people who are not its own: a shut temple whose city petitions
  every year, a contractor bidding to farm a province's taxes, a client king dead with three
  claimants, and whose likeness — if any — goes on the coin. A realm with no enemy left faces
  the most dangerous questions it will ever face: what to do with veterans who have no war, a
  diaspora that writes as though you were a power, a High Priesthood that has become an
  auction, and a prophet in the desert whom arresting would not disperse. Every one has two
  or three answers with a real price on both sides, and the whole pool speaks as one channel
  so a campaign that has outrun its own chapter still has something to answer.
- **And one card is gated on a town rather than on a century.** Somewhere in the first ten
  years of most chapters, a letter arrives four months stale from Tingis, where the purple is
  boiled: a Jew called Ikus who teaches boys their numbers has proved something he cannot get
  anyone to restate, and has stopped losing wagers — not seldom, but never. The town concluded
  Jewish magic and flogged him in the market. Send for the man, send for the theorem and never
  mind the man, send a letter under your seal and a purse for his back, or agree that Tingis
  is a long way from here. Every campaign gets the letter once, on a month of its own — it
  may reach you in your first winter or in your ninth — except 1948, which never does,
  because by then the map calls the town Tangier.
- A war overview (score broken into battles / occupation / war goal / events, who holds what), a
  sortable ledger of nations (L), a diplomatic map mode, and the saved-campaign shelf.
- A painterly map: hand-inked organic province borders (sub-texel shader melt of the ID
  staircase), procedural terrain grain per province (dunes, crags, fields, reeds), sandy
  beaches and a breathing coastal foam line.
- Armies that march: standards (pole + rippling pennant) slide along their path day by day
  instead of teleporting, battles rock and spark, sieges smoke — and clicking a battle (on
  the map or in the outliner) opens a live battle window with the day's dice, both hosts
  army by army, morale and the running butcher's bill.
- Multiplayer: the host's browser runs the world and friends join over a direct
  WebRTC link by typing a six-character invite code like `KFR-2M9` (⚔ Multiplayer on the
  title screen) — there is nothing to send back. With no cloud configured it falls back to
  the original hand-carried codes, so the game still plays with nothing behind it.
  You can host a **new** campaign or **continue a saved one** — pick it off the shelf in
  the lobby and your friends join the war already in progress, on the saved date with the
  saved armies.
  Two ways to share a world, chosen per guest in the lobby. **A throne each** is the
  default wherever the chapter has more than one standard: Hyrcanus against Aristobulus,
  Herod against Antigonus, Judaea beside Agrippa's kingdom or Adiabene, Samaria beside
  Himyar. Each of you rules your own realm — your own treasury, court, missions, armies
  and event cards to answer — in the one world, on one clock. Your court's
  decisions are yours alone; world history and the doings of foreign courts
  reach both of you and either can answer for the table. A card stops the
  world for everybody, and nobody can start it again while a dispatch is still
  open at the other throne. Or seat a guest
  **beside you** and you share a nation: any player can move the armies, spend the
  treasury and steer the clock, story cards appear on every screen with the host
  making the choice, and every toast the realm receives reaches all of you.
- A title screen that breathes: one chapter at a time in a sliding carousel (arrows, dots,
  swipe) instead of a wall of cards.
- Wars that actually end: annihilating or utterly dominating an enemy closes the war
  (winners keep what the sword holds), a chapter's verdict signs the peace, and even
  fight-to-the-death scripted wars open to negotiation at 75% war score. The full
  game-over card appears only if your nation is truly wiped out — historical verdicts
  are chronicled in a toast and the campaign sails on.
- Stacks: armies of one nation sharing a province march under a single banner with a
  count badge — click it to grab the whole host, right-click to move it as one, and
  merge-all to make it one army.
- Reform trees (three five-tier idea lines as monarch-point sinks), a hired court
  (advisors per point pool; generals earn epithets from their victories), navies
  (build ships at your harbors, carry armies over the sea, blockade enemy ports,
  fight broadsides), and five trade routes whose stops and chokepoints pay whoever
  holds them — with a trade mapmode to read it all.
- A living world: nations have personalities (cautious Characene, rapacious Rome —
  and the great powers are ponderous, slow to anger but relentless once roused),
  armies sized to what treasuries can actually pay, and a wider east — Osrhoene,
  Adiabene and Characene as Parthian client kingdoms astride the new Gulf Road.
- **Every seated Jewish court is a chair.** The rosters offer every Jewish
  nation a chapter puts on the map, not only the rebels: Adiabene — the house
  beyond the Tigris whose kings took the God of Israel — is playable in
  67 BCE, 40 BCE, 66 CE and 132 CE; Agrippa II's kingdom fights its
  impossible war as a playable standard in 66 CE; and in 529 the client
  kingdom of Himyar — the house beyond the strait that took the same God a
  century before the negus broke it for the choice — plays the far end of
  the Keepers' century: a Christian client crown on a Jewish country, an
  Aksumite garrison that history says will mutiny, and eight convict ships
  due in 570 for whatever is still broken. Each carries its own court
  of estates (Arbela's Fire Priests give way to the Proselyte House as the
  dynasty converts; Agrippa seats the Pious, the Stewards and the Babylonian
  Horse; Zafar seats the Negus' Men against the House of Yazan), its own
  mission tree with roads not taken, its own ideas of the
  age, first-moves guidance, and a dated client's contract — be seated at
  Arbela, or Caesarea Philippi, or Zafar, when the age reads its verdict,
  and freer or richer for the bonuses.
- Conquest has a price: infamy that sours every court, defensive coalitions that
  league against a rampaging conqueror, and overextension unrest when too much of
  the realm is freshly seized land.
- The Chronicle (topbar lamp, C key): the era's history — wars, peaces, crowns,
  coalitions, fallen nations — recorded newest-first under year headings. Foreign
  affairs arrive as quiet "News from abroad" toasts; only your own wars sound the
  alarm. Balance is enforced by an all-AI harness (`tools/autorun.mjs`) that replays
  every bookmark and flags snowballs, debt spirals and dead economies.
- The world keeps moving after the local chapter turns: a separate world-history
  clock follows Parthia, Roman civil wars, Actium and Augustus, Hadrian's
  succession, the rise of the Rashidun Caliphate, and the coups, pacts, unions,
  and wars of the 1950s — and, since the map grew south and east, the far
  ends of it too: the Saka breaking Greek Bactria and Sakastan taking its
  name, Himyar rising out of old Saba, the one-eyed Kandake burying the head
  of Augustus under a temple doorsill and getting her treaty on Samos, the
  Periplus written down port by port, Ezana's Cross and the fall of Meroe,
  Kaleb's Yemen lost to Abraha and then to Wahriz's eight convict ships, the
  hijra to the king in whose land no one is wronged, Badhan's province
  transferred by letter, the Nubian archers signing the Baqt at Dongola, and
  the 1950s of Tehran, Asmara and Sana'a. These events launch pressure
  against the realm that actually holds a region; they do not hand
  historical provinces across a map the player has already changed.
- Technology: three ladders (government, influence, military) bought with monarch
  points, EU4-style — keeping pace with the age is cheap, racing ahead costs +50% a
  level. Military tech is the biggest lever on the battlefield and unlocks new
  patterns of soldier (Tribal Levies → Professional Legions → … → Rifle Brigades and
  Armored Corps); armies remember what they were raised as, and you modernize them
  for gold when the art advances.
- **Every rung has a name, and the ladders sell ideas.** Each bookmark names its
  technology levels in the era's own vocabulary (167 BCE climbs from The Shepherd
  Slingers to The Royal Phalanx; 1948 from The Mandate Departments to The Planned
  Decade), and reaching a named rung unlocks **ideas of the age** — EU4's idea
  groups, catered to each chapter and each side of it. The Maccabees study the
  Zeal of Phinehas and, eventually, The Greek Art of War; the Seleucid king
  answers with The Royal Cities and The Seleucid Phalanx; the Fourth Philosophy
  faces the Flavian Method, the Keepers' Torah faces Justinian's Codex, and the
  People in Arms faces the Arab Legion — seventy groups across the nine
  chapters, three tiers each, bought with the ladder's own point, with locked
  cards that tell you exactly which rung opens them ("Unlocked at The Third
  Wall (8)") — and they are read where they are bought: the Ideas block sits
  directly under the Technology block on the same tab of the realm panel, in
  every chapter, so the card naming a rung and the ladder climbing toward it
  are one screen. The AI buys its side's curriculum on the same terms, and every
  playable side's mission tree grew two branches that assign it: master the
  era's named art, and take up its ideas.
- **The mission tree shows the roads not taken.** Every playable side's tree
  now carries the chapter's alternate-history forks as standing hypotheticals —
  eighty-two spectral medallions across the nine chapters naming the pages
  history never wrote (a Jewish king seated at Antioch, the coast subjugated,
  the eagle refused, the House that stood, the Levant without a Lebanon), each
  desc teaching exactly what state of the world makes those cards arrive, each
  paying a bonus on arrival. They complete off the same flags the fork cards
  themselves set, and they are counted apart — "2 of 7 accomplished · 1 of 6
  roads history never took" — because a hypothetical no campaign reaches is
  not a failure. And the fork cards themselves say so at the table: every
  event card that opens a road of the path tree is dealt wearing a dashed
  violet badge — "the road forks here" — whose tooltip asks the fork's own
  question, in singleplayer, on multiplayer guests' mirrored cards, and on
  the same card's page in the Compendium.
- **Accomplishments are claimed, not collected.** The mission tree used to run
  itself — read the world every month, decide you had done something, pay you,
  and tell you afterwards. Now a mission whose terms are met goes gold, says
  **Claim** under its name, and waits: nothing is banked and nothing is paid
  until you click it, the Missions tab wears a badge for what it owes you, and
  the terms have to still hold at the moment you click. Lose the province in
  April and March's accomplishment goes with it. The chapter's own drumbeat
  still spaces the claims out, so which branch you bank first is a decision.
  (The AI has no panel to click, so its chains go on banking on the calendar —
  the symmetry is the point: it earns exactly what you earn.)
- **Harder asks, and rewards you keep.** Every muster, purse, development and
  war-score bar in the game went up — twenty thousand men becomes twenty-eight
  thousand — and every mission modifier is now **permanent**: the manpower
  bonus, the discipline drill, the coinage. Point grants run 25–120 instead of
  a flat 25, talents and manpower doubled. What a chapter asks of a realm is
  now what the realm keeps. The descriptions were cut to the ask at the same
  time — a median of 196 characters down to 95, the essays moved off the
  tooltip where the Compendium already tells the story — and where a check
  counts something the desc prints the number the check asks for, so the two
  cannot drift.
- **The road not taken is X'd out, and the fork says which you chose.** A
  hypothetical is one road of one fork, and the roads of a fork are one
  question asked once. Watch the Temple burn and *The House That Stood* is
  struck through with an ✕ — with the branch hanging off it — and its tooltip
  names the road your campaign actually took. Under the tree, **The Forks**
  writes the whole either/or out: each question, the road taken with a check,
  the roads it cost struck through, and every answer still on the table while
  the question is open.
- **The thin trees made thick.** The lighter chapters caught up on forks,
  major decisions and conquest branches: Herod's Rise grew from two forks to
  five (Cleopatra's demand for the balsam groves of Jericho, the musters of
  Actium with the verdict read at Rhodes, and the old man in Babylon on the
  Hasmonean road), the war of the brothers from three to seven (the price of
  Petra coming due under a Roman survey, Crassus at the treasury doors on his
  way to Carrhae, and the sovereign kingdom's two Roman civil wars, now
  charted), and the Persian Gambit from four to seven (the Exilarchate under
  one crown or two houses, the caliph's categories renegotiated in the fitna,
  and the Other Israel — the first Israelite state ever positioned to repeal
  Justinian's statutes against the Keepers of Gerizim, or keep them running
  under a new seal). Thirteen expansion missions beside them, every target the
  era's own: the Decapolis grants, Jannaeus' coast, the twelve cities of Moab,
  the Ladder of Tyre, the King's Highway, the granary of Egypt, and the coast
  road out of the Samaritan hills.
- **The heavy chapters take their turn.** The Great Revolt, Bar Kokhba and 1948
  get the same pass: Menahem's royal robes and the granaries of Jerusalem
  (sealed under one ledger, or burned by the factions before Titus ever
  closes the ring), the Nasi's letters — iron or mercy, billed either way two
  winters later — and the letters east that Babylonia never got, the Altalena
  answered five years after the cannon, and the shilumim vote with the windows
  breaking. Beside them, the conquests the wars reached for: the cities that
  killed their Jews, the client king's Golan, Bar Kokhba's port and the
  Arabian legion's nest, the strip to Rafah and the Hebron hills Allon begged
  for.
- Seven chapters spanning twenty-one centuries: the Maccabean Revolt (167 BCE),
  the Judaean Civil War (67 BCE), Herod's Rise (40 BCE), the Great Revolt (66 CE),
  the Bar Kokhba Revolt (132 CE), the Persian Gambit (614 CE — Jerusalem changes
  hands in the last great war of antiquity), and the War of Independence (1948 —
  five armies, every border, and the armistice lines becoming a state).
- Formable nations: win the brothers' war as Hyrcanus or Aristobulus and restore
  Hasmonean Judaea; break Antigonus as Herod and proclaim the Kingdom of Judaea —
  the whole realm (map color, armies, wars, treaties, your own throne) takes the
  new banner, with a requirement checklist in the Decisions panel and a permanent
  founding bonus. Endgame crowns too: the Kingdom of Israel for a fully
  independent, stable Jewish realm that consolidates the historic heartland,
  not merely any victorious revolt,
  Jewish arc, the United Arab Republic through a victorious Arab campaign or
  the 1958 Egyptian-Syrian union, and the Roman Empire restored for a Heraclius
  who takes Ctesiphon.
- A living land: towns grow each January (markets, granaries, capitals and low
  autonomy help; war and unrest freeze it), and you can develop provinces with
  monarch points at prices that scale with size. Deeper diplomacy: monthly
  subsidies, guarantees of independence that pull you into your ward's defensive
  wars, and war reparations at the peace table.
- The map speaks each era's language: in 1948 the labels read Tel Aviv-Jaffa,
  Latrun, Amman, Cairo and Baghdad, and the modern cities carry modern
  populations — while the sim keeps its canonical ancient keys underneath.
- Provinces that are subdivisions of an ancient region in one bookmark become
  their own borders in another: 1948 splits the Levant into 28 modern
  districts and cells (Netanya, Ramallah, Beersheba, Dimona, Mitzpe Ramon,
  Eilat, Gaza's Khan Yunis and Rafah, the Galilee panhandle, Jordan's Azraq
  Badia, Iraq's Rutba desert…) over the very same land raster, redistributing
  — not inventing — their development. Every 1948 nation wears its real
  shape: Lebanon holds the Beqaa, Syria holds Qamishli and the Golan, Jordan
  reaches its eastern panhandle — and Israel's modern borders are actually
  formable: the greater verdict — From Dan to Eilat — requires marching the
  Arabah and holding Eilat, just as Operation Uvda did. The ancient eras keep
  the same honesty: Masada and Machaerus don't exist before Jannaeus builds
  them and never return after Rome razes them, Modi'in stands in 167 BCE as
  the rebels' home village, and Betar stands in 132 CE for the last stand. Empty land is real land now: every province sits on a habitation
  ladder (uninhabited → frontier → rural → town → urban), and a settlement
  project spends influence to raise a settleable province one rung — founding on
  the frontier so you can then develop what you founded. Only prosperity makes
  the final leap to a metropolis. And wasteland does not exist in 1948: the
  Sinai, the Syrian and Arabian deserts open as sovereign frontier — crossable,
  settleable, and brutal to campaign through — while the ancient eras keep
  their walls.
- Governments: monarchies crown heirs (and suffer regencies), republics vote
  every four years — Rome is a republic until the emperors, and 1948 Israel
  elects its head of government — theocracies never anoint a child, and tribal
  confederations field every tent's sons. Forming a nation adopts its
  constitution.
- **And a constitution you choose becomes a country of its own.** The forks
  that ask what kind of state this is — the Hasmonean diadem, the settlement
  after the Great Revolt, the accession of Beit Kosiba, the line of Jehoiachin
  — used to leave the same three letters on the map in the same blue whichever
  answer you gave. Each of the ten answers now has a crown you can proclaim:
  the Temple-State, the Commonwealth of the Lot, the Jubilee Commonwealth, the
  Freedom of Zion, the Priest-Kingdom, the Judaean Commonwealth, the Crown of
  Judaea, the House of David, the Two Houses, the Patriarchate. Each has its
  own name, colour and emblem, its own founding payoff and national ideas, and
  its own thirteen-node mission tree — the temple-state restoring the
  twenty-four courses and collecting the half-shekel from three continents,
  the Lot keeping an honest register of every priestly house in the country,
  the Jubilee coming through a sabbatical year at peace and unable to borrow,
  Freedom of Zion holding a state with no ally and no address, Ezekiel's prince
  obeying 46:18 while the founder's own leases sit in the room next door.
  Taking the crown *is* adopting the constitution — the Lot's proclamation
  abolishes your heir, the Jubilee's starts an election clock — and none of
  them closes the road to the Kingdom of Israel, which ends the constitution
  when you proclaim it, because a kingdom is what it is.
- Armies wear their age on the map: antiquity's swallow-tailed standards, the
  lance ages' pennons, and squared modern brigade flags with rifle or tank
  glyphs — and modern armies march half again as fast and break fortress walls
  with artillery, while Bar Kokhba's war stays hill forts and patience.
- Armies know their age too: recruiting raises the era's actual pattern
  (Rifle Brigades in 1948, Drilled Spearmen in 66 CE — never "infantry"), and
  each generation carries doctrines that ride the battle dice: the shieldwall
  holds, professional drill presses assaults and sieges, lancers charge,
  muskets volley, and combined arms does it all. Equal ages cancel; a
  generation's edge is felt.
- The land wears its works: markets, granaries, walls, shrines and airfields
  appear as tiny glyphs on their provinces, fleets ride at anchor — and in
  1948 the Airfield building bases air wings that park as visible warplanes,
  rebase between your fields, and lend their +1 to the fire die over any
  friendly battle within two provinces. Fields that fall burn the wings on
  the ground.
- You can always sue for peace — every war, even the scripted fights to the
  death, hears your envoys: white peace when even, territory when winning,
  refusal when you're beaten. And scripted endings stopped gifting empires:
  the Terms from Antioch are now an offer you may accept (Judaea keeps the
  hills of the faith it holds — not half of occupied Syria) or refuse and
  fight on for everything.
- Nothing decides for you: every "the enemy concedes" ending in every era —
  Pompey's settlement, Rome suing after Beth Horon, Hadrian letting go,
  Persia returning the Cross — arrives as an event card you may accept or
  refuse, offered exactly once.
- The Mount stands bare after 70 CE — and Bar Kokhba's Judaea or the
  Persian-era Return can crown its mission chain by raising the Third
  Temple: hold Jerusalem rich and steady, spend 300 talents, and the House
  (and its wonder-star on the map, and its monthly yield) returns.
- The game tells you how to play it: every standard names three first moves,
  the campaign's signature system, its win/loss contract, and the first dated
  pressure; the contract and next danger clock stay pinned beside your armies.
  Event choices print their consequences instead of hiding them behind hover.
  H opens a one-page primer, winning enemies send ultimatums you may accept or
  refuse, and a battle going wrong has a Withdraw button — shattered, but
  marching. The full verification battery — 125 headless sim suites and 40
  Playwright browser suites — ships in `tools/tests/`.
- Armies can be stood down from the outliner when the treasury needs relief;
  troops demobilized in controlled home territory mostly return to manpower.
  Peace changes the event timeline too: later canonical battle phases retire
  instead of firing after their war has already ended.
- Coastal provinces can build shipyards and commission a five-berth merchant
  marine. Civilian hulls earn trade while their home port is controlled, open,
  and unblocked. Future infrastructure stays out of earlier building lists
  until the required technology exists.
- The 1948 chapter no longer freezes at Rhodes: the armed armistice suppresses
  random border wars while the Arab League's 1950 joint-defense treaty builds
  a mutual guarantee web, rival staffs slow coordination, and threatened states
  turn their treasuries into peacetime forces. The 1955 arms agreement raises
  both Egyptian and Israeli readiness for the next war.
- Navies age like armies: hulls are laid down to the era's pattern —
  Penteconters through Trireme Squadrons to Destroyer Flotillas — hit harder
  each generation, and re-rig at anchor when the art advances. Fleets take
  admirals and wings take squadron commanders (both rolled like generals);
  fleets and air wings sit in the outliner beside your armies with counts,
  cargo, rearm clocks and hire buttons.
- Wings fly with their crews aboard, and they carry bombs: raid any hostile
  presence in range — thin an enemy host, soften walls you besiege, crack a
  garrison — then rearm for twelve days. Enemy fighters in range contest the
  sky (raids driven off, or downed). The raid plays out on the map: a plane
  in your colors sweeps the target, bombs blossom, smoke climbs — with
  engines, a falling whistle and the thump of bombs in the soundtrack.
- Every flag is a door: click a nation's chip anywhere — the ledger, a war
  overview, a battle window, a province panel, the outliner, another court's
  treaty rows — and that nation's panel opens read-only: their ruler and heir,
  purse and armies, technology and reforms, seated advisors, their whole web
  of treaties (walkable court to court), and how they feel about you. Your
  own flag in the corner of a foreign panel, or the topbar flag, brings you
  home.
- The realm divided: every playable crown seats two or three estates and court
  factions —
  Pharisees and Sadducees, Zealots and the peace party, Senate and legions,
  the Blues and Greens of the Hippodrome, the Coalition and the Revisionists
  of 1948 — each with an approval bar in the realm panel that drifts with the
  era's politics. Loyal estates (60–79) grant half their boon and devoted
  ones (80+) grant it in full; discontent estates (21–40) exact half their
  bane and hostile ones (20−) exact it in full. Estates at 35 or less send
  demand cards you may grant or refuse, and an appeasement lever pays an
  estate's price once a year. Scripted
  history moves the court: fire on the Altalena and the Revisionists remember;
  burn the list of the Forty-Five and the Sanhedrin does. Your politics only —
  the AI's courts stay offstage.
- The thin eras made thick: Herod's Rise, the Persian Gambit and 1948
  roughly double their scripted chains — the cisterns of Masada, Silo's
  winter and the basket-men at the caves; Benjamin of Tiberias, the ships
  for Carthage and the intercepted letter that benched Persia's best
  marshal; Spitfires over
  Tel Aviv, the roads from Lydda, the secret wire to Amman and the ballot
  under fire.
- Wars end honestly: objectives retire into a single settled line once the
  chapter's verdict is in, a freshly declared war refuses white peace for a
  year unless the aggressor is actually losing, and defying Persia over
  Jerusalem in 614 brings a punitive column to your border, not a paper war.
- The peace table stands beside the map, not over it: the terms card docks
  to the left with no dimming scrim, and the map itself negotiates — click
  a gold-pulsing occupied province to demand it (it burns solid gold in the
  deal), click again to strike it from the terms.
- **The realm has a character.** The game was already remembering what you
  chose — 165 narrative flags across seven eras — and reading almost none of
  it back. Four doctrine axes now do: the Wall and the Gate (zealous ←→
  accommodating), the Two Horizons (westward ←→ eastward), the Crown and the
  Council, the Sword and the Purse. They're computed from the choices you
  already made — raze Gerizim or spare it, the Law as a wall or a gate, Rome's
  friendship or the King of Kings' covenant — and shown as four needles in the
  realm panel, each tooltip listing the decisions that put them there. Only
  choices count: the flags every option of an event sets record that a thing
  happened, not what you picked, and they stay out.
- **Historical friends put quarrels down.** A grudge over taken land used to be
  permanent while you held it. Now it matures: every month the two courts are
  neither at war nor rivals, the wound closes a little — halfway for strangers,
  nearly all the way for pairs the era names historical friends, and once
  mended they will ally with you again *without* the land going back. Take
  Jerusalem back from Persia in 614 and Ctesiphon will hate you for it, and
  then, if you keep facing east and never name them an enemy, forgive you.
  Swing west and the old friendship lapses with the horizon it depended on. So
  "we choose not to rival them" is a real move: you can name up to two rivals
  for cheap claims and a martial dividend, and the price is that no wound
  between you will ever close.
- **A province rises for a reason.** Five kinds of rising instead of one:
  separatists under the old flag (read straight off the grudge book — the game
  already knew who lost that province), a named pretender who bleeds your
  legitimacy monthly and takes your throne if they hold the capital six months,
  religious risings for the altar, national risings that go over to a
  co-religionist neighbor, and peasants — the biggest hosts and the most
  brittle. Each can send a demands card: buy the province back from itself,
  marry the claim into the house, seal a writ of toleration.
- **And a rising can walk off the edge of the governed world.** Nobody governs
  the frontier at the rim — Gaetulia, Scythia, the Danakil — so nobody comes for
  a band that takes it. One that is still standing there two years later stops
  being a rising: the camp becomes a state, λῃσταί inland under an *archilestes*,
  πειραταί on a coast under an *archipirata* and three hulls, governed by the
  shortest constitution on the map (the men keep the chief who feeds them). Once
  a campaign, at most, and only out where there was nothing — rebels may sit in
  Carthage for eight years and found nothing at all.
- **The Road Not Taken** (Chronicle → second tab): your campaign set beside
  the record it was given. Every turning where this age chose otherwise — what
  the chronicles say, what you did — every scripted chapter that never got
  written because the world had changed, and the alternate worlds those choices
  opened, from the Eagle Refused to the Lines We Drew Ourselves. It needed no
  new authoring: every event already carried the historical course in the
  option its AI takes.
- **What kind of kingdom.** Winning a bookmark used to produce one state with
  one set of modifiers. Now the victory strand asks what you became: 66 CE's
  Second Kingdom becomes the Kingdom of the Altar, the Commonwealth of the
  Chamber, or a state Worth More Standing; the 614 Return becomes the east's
  western wall, a kingdom apart from both empires, or the one polity everybody
  finds it cheaper to deal with than to conquer. And the sandbox chapters that
  follow are addressed to that realm — a zealous crown is set to purifying the
  land, a conciliar one to governing rather than winning, and any realm sitting
  on land it took in war can be asked for the hardest objective in the game:
  mend that quarrel without giving the land back.
- **Offer your protection.** A client kingdom used to require a war — the peace
  table's knee-bending clause, or taking someone else's vassal off them. Now a
  sworn ally who is at most half your size and genuinely devoted to you can
  simply be asked to come under your wing: their court, army and laws stand,
  their tribute and their wars become yours, and because nobody was conquered
  it costs no infamy at all. They say yes on devotion alone if they adore you,
  and at a lower bar if they're much smaller or fighting a war they can't win.
  Ask and be refused, and they won't hear it again for five years.
- **…but a court has only so many envoys.** Every standing bond — alliance,
  guarantee, royal marriage, subsidy, client kingdom — occupies one seat of a
  realm's diplomatic establishment, and the establishment is small: four seats,
  plus what influence technology and a capable ruler add. Fill it and the next
  offer is refused, by you or by them; keep more than it can staff and the
  extra envoys are paid for monthly in influence while every court you owe
  nothing thinks less of you for the sprawl. Client kingdoms chafe on top of
  that: past three collars — the King of Kings' own client system is the
  measure — or once your clients together weigh half the realm, every one of
  them cools month by month toward a floor below what an incorporation needs.
  You can hold a wide client empire. You cannot swallow it. And a nation you
  freed at the peace table will not accept your collar for a generation: the
  gratitude liberation earns is real, and it is not a down payment.
- **Recognition, not alliance.** In 1948 no Arab capital will sign a military
  pact with Israel — not at the start, not after a warm decade, not after the
  treaty on the lawn. What is on offer instead is the thing that actually got
  signed: recognition. An exchange of letters ends the state of war between
  two courts, retires the era's rivalry, and forbids either from declaring war
  on the other while it stands — and obliges neither army to fight for the
  other. Tearing it up is possible and public: their opinion collapses,
  your own country marks you down for it, and only then is the road back to
  war open. Camp David's treaty and the Arava treaty of 1994 sign real ones.
- **The region's other histories.** The chain after the armistice used to be
  Israel's alone. Now the Ba'ath takes Damascus and Baghdad (and each state
  rebrands in place, down to Assad's Syria flying the hawk of the federation
  rather than Baghdad's three stars); Karameh makes the fedayeen a fact and
  Black September becomes an actual civil war in the kingdom, with a rebel
  host the Legion has to beat; Lebanon's war runs from the bus at Ain
  al-Rummaneh through the Syrian Deterrent Force taking the Beqaa, Litani,
  the 1982 invasion with real divisions on the northern border, the camps and
  their commission, and the withdrawal that invents the next adversary; and
  the age of wars between armies ends in the two uprisings, the sealed rooms
  of 1991, and the letters of 1993. Greece, meanwhile, finally flies its own
  modern flag in 1948 instead of the ancient laurel wreath.
- **A Hebrew name waits for people, not only for paperwork.** The victors'
  pens (names following integration) asked for a schoolhouse or a settlement.
  A Jewish pen now asks for both: full integration AND a Jewish community
  living in the town. The road to it is the campaign's own — the absorption
  of the great immigration into the frontier towns, or the choice to keep the
  newcomers on the coast and leave the map's names as the war left them.
- **Crises that brew.** Nothing in this game falls over in a month any more.
  A king who ages without naming an heir sets the court whispering; if he then
  dies heirless the question is open, the houses married into yours discover a
  sudden interest in your constitution, and — if nobody settles it — a
  pretender raises the old banner in the provinces and every marriage contract
  becomes a casus belli. The same clock runs under the books: late pay, then
  creditors at the door and your advisers walking out, then bankruptcy, which
  repudiates the debts, empties the chest and sends a quarter of the army
  home. Each era adds its own: 1948 has The Closed Sea (what a blockade does
  to a state that imports its war), 66 CE has The Factions in the City. The
  realm panel shows what is brewing, how hot it is, and exactly what it is
  costing you.
- **The pressure short of war.** In 1948 the Western powers do not raise
  punitive leagues — that is not what they did. A court that dislikes you
  closes its markets, and each closed market takes another bite out of your
  trade. A court that detests you AND has hulls at sea can blockade your
  coast: every port you hold earns half of everything — customs, markets,
  shipyards, the routes through the harbor — and the treasury starts falling
  toward the crisis clock. Both are public, both are reversible, and the Arab
  League's boycott of Israel is exactly this, played by the AI.
- **The arsenal is somebody else's.** Nothing in the 1948 theater builds its
  own tanks or aircraft: armor and air wings are imports, raised only under a
  weapons transfer agreement with an arsenal state — America, Russia, Britain,
  France, Czechoslovakia — signed at the supplier's regard and cut by cooling,
  war, or embargo (1967 is de Gaulle signing something). The Arab states open
  under the real treaty system; Israel opens under nobody and buys its way from
  Prague to Paris to Washington. The United States itself sits off the map but
  on the ledger: click its flag there and Truman's court opens like any other —
  courtable, embargo-capable, intrigue-able, unconquerable. And at the end of
  the French road, if you hold the deep Negev, something can rise at Dimona
  that the budget calls a textile factory.
- **…until the works are yours.** The other answer to an embargo is to build
  the thing yourself, and 1948 lets you: eight named programs, each opened by
  a rung of the military ladder and by whatever your shops delivered before
  it, each paid for in talents, martial points and years of a monthly
  development line on the ledger. The Uzi, the Shafrir, the Gabriel and the
  missile boats, the Nesher (the fighter the supplier was paid for and never
  delivered, built anyway), the Merkava, the Kfir, the Ofek — and the Lavi,
  which needs an aircraft industry *and* a tank industry, sits at the top of
  the ladder and the top of the budget, and can be abandoned mid-flight for
  Washington's gratitude, exactly as the Knesset abandoned it 12–11. A
  delivered work ends the import for **its own arm only**: your own fighter
  buys the sky and not the ground. Build both and you need no supplier at
  all — and other courts start signing weapons transfer agreements with
  *you*, at your regard, for a fee that lands in your treasury. Nasser's
  Helwan is on the same table, priced against Egypt's own books, and the AI
  closes a line the month its purse turns over, which is what happened.
- **The purse is somebody else's too.** The other thing the great powers
  signed was credits: in 1948 any court may petition Washington, Moscow,
  London or Paris for financial aid from the donor's own panel — granted at
  the donor's regard for you, sized to the donor's own purse (the American
  package is the deep one, which is the plain 1948 fact), and paid monthly
  for a year down the ordinary subsidy pipe. Asking leaves a mark, each
  donor hears one petition every thirty months, and a granted package runs
  its term whatever the friendship does after — only war or an embargo
  stops the checks. The AI petitions too, when it is poor: the British
  subvention that paid the Arab Legion emerges from the seeded book instead
  of being scripted. Israel's own road is the historical one — court Truman
  past the bar and the Export-Import credits of January '49 arrive on
  schedule, or mend two years of fences with London for a smaller purse.
- **No rifle brigades at Masada.** Every age now declares how far up the
  technology ladder it can climb: the ancient bookmarks stop at professional
  legions, 614 at thematic regulars, and only 1948 reaches rifle brigades and
  armored corps. Banking martial points no longer buys you a century.
- **A poor country stays poor.** A treasury holds about eighteen months of its
  own income; anything far past that drains away into palaces, walls and
  salaries. So minors no longer bank thousands for decades — and absorbing a
  client brings a quarter of its coffers, capped at a year of its income,
  instead of the whole chest.
- **The crown is new; the country is not.** Proclaiming a kingdom used to empty
  half your panel. Now a formed nation remembers what it was: the estates keep
  convening, the age keeps stating its objectives — and the crown brings its
  own payoff (coin, men, ministries and a modifier that says what this kingdom
  is FOR) plus a fresh mission chain addressed to the new identity.
- **The crown speaks in the age it was crowned in.** The Kingdom of Israel can
  be proclaimed in six of the nine chapters, and it used to read the same four
  missions in all of them. Those four are still the spine — settle the crown,
  muster the kingdom, hold the land of the twelve, build rather than merely
  hold — but each chapter now hangs three of its own off the crowning: finish
  the Seleucid throne and take Simon's harbours in 167 BCE; hold the Greek
  cities of the Jordan, bring Petra under the crown and get an answer out of
  Babylonia in 67; keep the balsam groves Cleopatra took and build the harbour
  Herod would have built in 40; take the procurators' coast, absorb the last
  Herodian's tetrarchy and endow a House that never burned in 66; unmake Aelia
  between the sea and the Jordan and raise the Third House in 132; raise the
  altar on the swept Mount, reach the Exilarchate and watch the southern road
  in 614. Eighteen in all — and because the Third House is now one of them,
  taking the greater crown no longer costs you the mission the chapter is
  about.
- **Playable on a phone, properly.** The handheld pass: one tools button in the
  topbar opens a sheet with the chronicle, the ledger, the primer, the quill
  and your saved campaigns — a phone could not previously save its own game,
  because those buttons are hidden at 390px and there is no keyboard to press
  C, L or H. The floating sound toggles moved into that sheet instead of
  sitting on top of the mapmode grid and every panel; the buttons you actually
  play with are thumb-sized; long values stack instead of running through their
  labels; the title screen's era card fits the screen; and in landscape the
  panels become a full-height side panel so the map keeps half the screen.
- **Nobody else had a court.** Every foreign power was a treasury, an army and an
  opinion score, and the only bad thing that ever happened to one was you. Now
  every court on the map convenes: two or three parties by constitution (a
  monarchy has the King's Men, the Great Houses and the Soldiers; a republic the
  Senate, the People and the Legions), drifting on the same rules your own
  estates drift on — whether the army is paid, whether the war is going, what was
  lost this year, whose boot is on which province. And when a court spends long
  enough on the floor it does something: reverses its policy, deposes whoever is
  on the throne, loses a province to a neighbour, or comes apart into civil war.
  It is chronicled, it reaches you as news from abroad, and you did not cause it.
- **You can interfere in anyone's politics.** Three operations, priced in
  influence and gold, aimed at a named party at a named foreign court. Pay into
  it and they warm to you. Pay against it and — because a court's own pressure
  clock counts the parties on the floor — a decade of your money is a policy
  reversed, then a ruler removed, then a province gone, then a civil war you
  arranged. A third of the time the letters are read at the other end, and then
  it is public and expensive. Or back a claimant outright and open their
  succession. This is the period's own diplomacy: the Pharisees invited
  Demetrius, Antipater ran Hyrcanus, Herod bought a Senate — all of it was in
  the game as scripted cards you watched, and none of it was a verb you had.
- **Institutions, and a geography of being behind.** Thirteen ways of running a
  state — the polis, coined money, the standing army, the Greek chancery, Roman
  law, the established faith, the codex, the diwan, gunpowder, industry, a
  general staff, total mobilization, the national idea — each born in a real
  place in a real year, spreading province by province and along the trade
  routes. Every one alive in the world that your realm has not taken up makes
  every level of every technology ladder dearer. Embracing costs, moves your
  estates, and buys you nothing except that you stop paying the surcharge.
  **And the Hellenizer quarrel finally has teeth**: the Greek chancery stops at
  the edge of the Jewish hill country and will not cross it, so a Hasmonean
  Judaea is structurally behind until it either schools its own provinces or
  takes the Greek coast — which is exactly how the Hasmoneans stopped being
  behind, and nobody had to write it as an event.
- **The estates have ground under them.** The Pharisees used to stand at 62
  everywhere at once. Now every party has a strength in every province, read off
  what the province is — town or country, coast or hills, its faith against its
  ruler's, a trade stop, a fort, a holy site. It decides how much each estate's
  mood is actually worth at your court, it puts a named party in the unrest
  breakdown ("the Hellenizers hold this ground, and they are furious"), and it
  has its own mapmode. The point: **take the Greek coast and the Hellenizers go
  from 5% of your realm's political ground to 33% of it**, whether or not they
  like you. Conquest became an act of domestic politics.
- **Am I winning.** A standing table ranks every court of the age by
  development, income, army, technology and the clients that answer to it. The
  realm panel prints where you sit. A small court now wants a wider margin
  before it starts a war with a great one, and the powers everybody has heard of
  are the ones your agents can reach without a shared border.
- **The age itself changes.** Four ages, with boundaries at the years the rule
  changed rather than the years a textbook starts a chapter: Pompey's settlement
  in 63 BCE, the conquest in 640, Berlin in 1878. In the Age of Kingdoms a
  client kingdom is a status a house holds for two centuries. In the Age of
  Provinces it is a waiting room — pressure builds every month you stay one, and
  your overlord eventually rules your land directly whether you consent or not.
  Being large, being devoted, or fighting their war beside them slows it; being
  small hurries it. Herod died a king and his son's country became a prefecture,
  and now that is a rule rather than a script.
- **The hope, the office and the ascents.** A messianic expectation that pays
  real manpower and morale while it runs and takes your legitimacy apart on the
  first setback — the only system here where success is dangerous. The High
  Priesthood as an office with an occupant, seated from one of the parties at
  your court, paying you legitimacy while the two of you agree and costing it
  while you do not, and worse than either while it stands empty. And the ascents
  as a line in the ledger: three festivals a year and the half-shekel from every
  community in the world, paying more while the country is expecting something
  and very nearly stopping the month a war closes the roads.
- **The years, and the eye.** Weather stopped being a coin. A climate cycle
  wanders between drought and abundance over about a generation and bends the
  odds on harvests and failed rains in both directions — and because it is
  computed from the date and the campaign's seed, two players on one seed get
  the same decade of drought. Meanwhile the great powers notice you in
  proportion to what you have actually taken from them: hold enough of somebody
  else's empire and foreign courts start moving against you on a thinner margin
  than they would otherwise accept. A campaign that conquers nothing is never
  noticed at all.
- **Two roads the chapters did not have.** The Maccabean chapter had forty
  cards about refusing the Greek way of doing things and none about taking it —
  so there is now a Greek Jerusalem: petition the charter, argue about where a
  Jew who is also a citizen stops, watch the purists walk out to camps in the
  wilderness, and end up with the wealthiest Jewish state that ever existed and
  the least sure what it is. It is gated on the Hellenizers being strong AND the
  Greek chancery actually embraced, because before institutions existed this
  branch could only have been flavour. And 1948 gets the decade it was missing:
  the gates, the ma'abarot, the money from Germany, and the bill in 1959 — the
  population doubling in under four years, with nowhere to put anyone and no
  money, which is the largest thing the state did in its first decade and was
  previously one line about schoolhouses.
- **Write to the dispersion.** The Diaspora used to be one row in a panel with a
  bar on it. It is thirty-seven communities now — Alexandria, Babylon,
  Nehardea, Antioch, Cyrene, Rome, the House of Adiabene, the temple at
  Leontopolis, and the sea's whole western half besides: Smyrna and Tarsus,
  Athens and the Kinsmen at Sparta, Rhodes and Crete, Campania and Sicily,
  Carthage, Tripoli and Constantine, Sepharad, Marseille and the farthest west
  at Volubilis — and you reach them by clicking the province they live in. Ask
  for letters (what a congregation at the centre of an empire hears before the
  provinces do), for silver, for a word with their patrons, or for their sons.
  What you can ask depends on how big they are, how they regard your crown, and
  whether their empire is watching. **Every one of them is a hostage**: each
  request can be intercepted, and when it is, the reprisal falls on them and
  they remember whose asking caused it. Alexandria's community ends in 117 with
  the Kitos War and Babylon's outlasts everything, so where your friends are
  changes across a long campaign — the Aegean deportations of 1944 and the
  expulsions of 1306-1541 mean the 1948 map draws half that sea as memory,
  hatched where Sepharad and Sicily and Rhodes once answered, while the
  Maghreb's windows close on their own dates (Tripoli 1952, Constantine 1962,
  Tunis 1967) and Morocco's never quite does. And the dispersion reaches past
  the map's own edge: London (from the Resettlement of 1656) and the Jews of
  America — the largest community there has ever been, seated on Truman's
  off-map court — are written to from their host's own panel, where a foreign
  court's Abroad tab now lists every community under its flag. Their sons
  answer on day one in 1948, because Machal did; Attlee's Britain lists
  Tripoli beside London, because the British Military Administration really
  held it.
- **Idumea has its own gods.** Hyrcanus' famous offer to the conquered south —
  the covenant or the road, kinship instead of tribute — used to convert a
  country the map had already drawn as Jewish, because the atlas is painted for
  66 CE and by then it had been Jewish for a century and a half. In the
  Maccabean chapter Adora and Hebron now swear by Qos, whose name is half the
  Idumean names on the Marisa ostraca and stands at the head of Herod's family
  tree, and a foreign altar under a Jewish crown costs what a foreign altar
  costs: a standing +3 unrest in each, from the day you take the south until
  the day you do something about it. Take the covenant and the people convert,
  not the paint — they become Jews of Idumean stock, which is exactly how an
  Idumean house ends up on the throne three generations later — and the
  standing 3 becomes a 1 that expires. Leave them tributaries and you keep the
  double assessment and the unrest together, forever. It bites at the peace
  table too: the Terms from Antioch return everything that is not of the faith,
  so an Idumea you took but never converted goes back to Antioch with the rest
  of the occupied towns — unless your own missionaries got there first.
- The sound of the age, synthesized from nothing (no audio files): parchment
  and chimes for events, clashing steel for battles, horns for war and bells
  for good news — under a sweeping generative score. A warm string pad
  strides through slow chord progressions (peace in Adonai Malakh, the
  majestic synagogue mode; war in Freygish), a heroic refrain returns on the
  quiet stretches and hardens as the fighting does, and harp arpeggios carry
  the bars between. Each chapter keeps its own lead voice — kinnor plucks
  and a soft horn in antiquity, a breathing reed in the middle ages, a horn
  ensemble in 1948, where Hava Nagila itself takes a turn as the refrain.
  Speaker and note buttons (bottom-left) mute the lot or just the music;
  both choices persist.
- **The mission tree stays on the board.** Two ways it used to vanish from a
  campaign still being played. Winning your chapter emptied it — even though
  the verdict deliberately leaves the campaign running, and the sim went on
  quietly completing missions and toasting you for a tree no longer on any
  screen. And proclaiming a crown that carries no chain of its own — Herod's
  Kingdom of Judaea, Jordan's United Arab Republic, Byzantium's restored Rome
  — took the tree with it, because the era's chain was filed under the name
  the proclamation had just retired. The tree now leaves the panel when the
  realm does, and a new crown that brings no chain keeps the one you were
  already working, accomplishments and all.
- **The Rising Against Gallus, 351 CE.** A ninth chapter, and the only one
  whose antagonist has no army. In the spring of 351 Constantius II went west
  with the field army to fight a usurper, left the East to a twenty-five-year-
  old cousin, and lost fifty thousand Roman soldiers to other Roman soldiers at
  Mursa in September; Shapur II was over the border every summer. In the middle
  of that window a garrison at Diocaesarea — Sepphoris — was disarmed in the
  night and a man named Patricius was raised up, and the whole affair lasted one
  season and got a sentence and a half in Ammianus. You get three towns, a chest
  of stolen weapons, no government at all, and thirty months before the Empire
  is free again. The Patriarch of the Jews lives three miles down the shore in
  the Empire's own city and has everything to lose; the real enemy is the fourth
  century itself, running as a conversion curve that no battle touches and that
  dips only for the twenty months Julian reopens the temples and offers to
  rebuild the Temple. Six forks — what the man is called, whether the Patriarch
  answers, who keeps the calendar after Hillel's tables exist, what to do about
  the Emperor's offer, what terms the bishops get, and who fills the
  patriarchate when Constantinople stops — and a victory condition that counts
  the provinces still keeping the Torah in 400 rather than the provinces held.
  The court is seated as **Galilee**, at Diocaesarea, under a standard of its
  own: the zodiac roundel of the synagogue floors at Hammat Tiberias, Beth
  Alpha and Sepphoris, on the light blue of the lake. The Keepers' chapter
  dresses the same court the same way — Judaea was struck off the map in 135,
  and a chapter that renames a country should not still be flying the other
  one's menorah. A Galilee that fights its way to Jerusalem may proclaim the
  **Kingdom of Israel** like the risings of 66, 132 and 614: the chapter plays
  the House of David road, so it can seat the king that crown asks for.

## Architecture

See `SPEC.md`. `main.js` is the boot/frame loop; `js/map/` rendering; `js/sim/` DOM-free
simulation; `js/ui/` chrome; `js/data/` defines, map data, and the 66 CE scenario.
