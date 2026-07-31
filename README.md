# Judaea Universalis

**▶ Play it now: https://quadrin.github.io/judaea-universalis/**

An EU4-style grand-strategy game set in the ancient Near East. Seven bookmarks:
**The Maccabean Revolt, 167 BCE** (Hasmonean Judaea or the Seleucid Empire),
**The Judaean Civil War, 67 BCE** (Hyrcanus or Aristobulus, with Pompey inbound),
**Herod's Rise, 40 BCE** (Herod or Antigonus, with Parthia in Syria),
**The Great Revolt, 66 CE** (Judaea or Rome), **The Bar Kokhba Revolt, 132 CE**
(Judaea or Rome), **The Persian Gambit, 614 CE** (the Return or Byzantium),
and **The War of Independence, 1948** (Israel or Jordan).

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

- Province map of the whole Roman world — the Atlantic to the Caspian, Britain
  to the Sahara (~307 permanent cells, Judaea at city/district density),
  GPU-generated province-ID texture, EU4-style mapmode shaders, heightmap
  relief, parchment crossfade at strategic zoom.
- A political west in every chapter: eight per-era maps seat some 65 courts on
  the ground beyond the old frame — Carthage, Masinissa's Numidia and the
  Arverni hegemony in 167 BCE; the Ostrogoths, Vandals, Franks and Moorish
  kings in 529 (Justinian no longer holds an Italy he hadn't reconquered yet);
  the Avar khaganate and the Sclaveni in 614; Stalin's Europe in 1948, Paris
  to Moscow under their 1948 names. Every one is a living AI court — convening,
  electing, dying, fighting its own wars — and every western province carries a
  levy share (1 / 0.2 / 0.1 by century) so Rome's Rhine legions stay on the
  Rhine instead of doubling the army it brings to Judaea.
- Mapmodes: political, diplomatic, trade, terrain, religion, culture,
  development, unrest, estates, and the dispersion — where the Jewish
  communities of the diaspora are, how large, and how they regard your crown.
- The realm panel is six tabs behind a pinned header — Crown, Court, Coin,
  Host, Faith, World — so the ruler, the four numbers you watch and the five
  levers stay put while twenty sections take turns underneath them.
- Pausable daily tick (5 speeds), monthly economy/manpower, armies, battles, sieges, attrition.
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
- A foreign court's decision is not yours to make: events that dramatize another realm's
  choice (what Rome decrees, what the Nasi ordains, what Cairo funds) now arrive for
  everyone else as a single-button notice naming the deciding court — the historical
  course simply happens. Play the deciding nation and the full choice is yours.
- **The Compendium** (📖 on the title screen): the game's own wiki, generated live from
  the data — every chapter with its timeline and every event's printed consequences,
  the playable standards with their guidance and win/loss contracts, every nation of
  every era (temperament, national character, rulers, crowns), the formable nations
  with requirement checklists, and the shared pool of omens. It can never go stale,
  because it reads the same modules the engine plays — and it lives on the title
  screen alone, where campaigns are chosen rather than fought.
- Mortal rulers with heirs, regencies and succession crises; mission trees per playable
  nation; a shared pool of random events; holy sites and wonders that pay their keeper.
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
- A war overview (score broken into battles / occupation / war goal / events, who holds what), a
  sortable ledger of nations (L), a diplomatic map mode, and the saved-campaign shelf.
- A painterly map: hand-inked organic province borders (sub-texel shader melt of the ID
  staircase), procedural terrain grain per province (dunes, crags, fields, reeds), sandy
  beaches and a breathing coastal foam line.
- Armies that march: standards (pole + rippling pennant) slide along their path day by day
  instead of teleporting, battles rock and spark, sieges smoke — and clicking a battle (on
  the map or in the outliner) opens a live battle window with the day's dice, both hosts
  army by army, morale and the running butcher's bill.
- Co-op multiplayer: the host's browser runs the world and friends join over a direct
  WebRTC link by typing a six-character invite code like `KFR-2M9` (⚔ Multiplayer on the
  title screen) — there is nothing to send back. With no cloud configured it falls back to
  the original hand-carried codes, so the game still plays with nothing behind it.
  You can host a **new** campaign or **continue a saved one** — pick it off the shelf in
  the lobby and your friends join the war already in progress, on the saved date with the
  saved armies. Everyone rules the host's nation together — any player can move the armies,
  spend the treasury, and steer the clock. Story event cards appear on every screen;
  the host makes the choice, and every toast the realm receives reaches all players.
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
  and wars of the 1950s. These events launch pressure against the realm that
  actually holds a region; they do not hand historical provinces across a map
  the player has already changed.
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
  People in Arms faces the Arab Legion — fifty-one groups across the eight
  chapters, three tiers each, bought with the ladder's own point, with locked
  cards that tell you exactly which rung opens them ("Unlocked at The Third
  Wall (8)"). The AI buys its side's curriculum on the same terms, and every
  playable side's mission tree grew two branches that assign it: master the
  era's named art, and take up its ideas.
- **The mission tree shows the roads not taken.** Every playable side's tree
  now carries the chapter's alternate-history forks as standing hypotheticals —
  thirty spectral medallions across the eight chapters naming the pages history
  never wrote (a Jewish king seated at Antioch, the coast subjugated, the eagle
  refused, the House that stood, the Levant without a Lebanon), each desc
  teaching exactly what state of the world makes those cards arrive, each
  paying a bonus on arrival. They complete off the same flags the fork cards
  themselves set, and they are counted apart — "2 of 7 accomplished · 1 of 6
  roads history never took" — because a hypothetical no campaign reaches is
  not a failure. And the fork cards themselves say so at the table: every
  event card that opens a road of the path tree is dealt wearing a dashed
  violet badge — "the road forks here" — whose tooltip asks the fork's own
  question, in singleplayer, on multiplayer guests' mirrored cards, and on
  the same card's page in the Compendium.
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
  marching. The full verification battery — 117 headless sim suites and 39
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
  bar on it. It is twenty communities on the map now — Alexandria, Babylon,
  Nehardea, Antioch, Cyrene, Rome, the House of Adiabene, the temple at
  Leontopolis — and you reach them by clicking the province they live in. Ask
  for letters (what a congregation at the centre of an empire hears before the
  provinces do), for silver, for a word with their patrons, or for their sons.
  What you can ask depends on how big they are, how they regard your crown, and
  whether their empire is watching. **Every one of them is a hostage**: each
  request can be intercepted, and when it is, the reprisal falls on them and
  they remember whose asking caused it. Alexandria's community ends in 117 with
  the Kitos War and Babylon's outlasts everything, so where your friends are
  changes across a long campaign.
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

## Architecture

See `SPEC.md`. `main.js` is the boot/frame loop; `js/map/` rendering; `js/sim/` DOM-free
simulation; `js/ui/` chrome; `js/data/` defines, map data, and the 66 CE scenario.
