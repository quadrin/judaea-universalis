# Judaea Universalis

**▶ Play it now: https://quadrin.github.io/judaea-universalis/**

An EU4-style grand-strategy game set in the ancient Near East. Eight bookmarks:
**The Maccabean Revolt, 167 BCE** (Hasmonean Judaea or the Seleucid Empire),
**The Judaean Civil War, 67 BCE** (Hyrcanus or Aristobulus, with Pompey inbound),
**Herod's Rise, 40 BCE** (Herod or Antigonus, with Parthia in Syria),
**The Great Revolt, 66 CE** (Judaea or Rome), **The Kitos War, 115 CE**
(Judaea or Rome), **The Bar Kokhba Revolt, 132 CE** (Judaea or Rome),
**The Persian Gambit, 614 CE** (the Return or Byzantium), and **The War of
Independence, 1948** (Israel or Jordan).

Zero dependencies, no build step: browser ES modules + WebGL2.

## Run

```sh
python3 -m http.server 8613 --directory .
# open http://localhost:8613
```

## What's in the slice

- Province map of the Eastern Mediterranean (~95 provinces, Judaea at city/district density),
  GPU-generated province-ID texture, EU4-style mapmode shaders, heightmap relief, parchment
  crossfade at strategic zoom.
- Mapmodes: political, terrain, religion, culture, development, unrest.
- Pausable daily tick (5 speeds), monthly economy/manpower, armies, battles, sieges, attrition.
- Flagship system: unrest → revolt, plus a ~25-event scripted chain from Josephus
  (Beth Horon, Vespasian's landing, the Zealot coup, the Year of the Four Emperors, the Temple).
- Win/loss per side; alt-history window for a surviving Judaea.
- Save/load (yearly autosave + Continue button) and monarch-point sinks (develop provinces,
  buy stability, call reserves).
- A realm panel behind the topbar flag: your ruler and their skills (which drive monthly
  monarch points), religion/culture/capital, stability, legitimacy, war exhaustion, economy,
  manpower & armies, allies/wars/truces — plus the central levers (reserves, stability, loans)
  and five national decisions (festival, rites, trade expeditions, drills, resettlement)
  for peacetime play.
- EU4-style peace negotiation for non-scripted wars: build a deal from occupied provinces
  (highlighted gold on the map while you negotiate), an indemnity, humiliation, or
  subjugation into a tribute-paying client kingdom — priced against your war score; losing
  AIs sue for peace, AI-vs-AI wars settle themselves, and five-year truces follow every
  treaty. Fabricate claims and declare war from a foreign province's diplomacy block.
- Mortal rulers with heirs, regencies and succession crises; mission trees per playable
  nation; a shared pool of random events; holy sites and wonders that pay their keeper.
- A war overview (score broken into battles / occupation / events, who holds what), a
  sortable ledger of nations (L), a diplomatic map mode, and save export/import.
- A painterly map: hand-inked organic province borders (sub-texel shader melt of the ID
  staircase), procedural terrain grain per province (dunes, crags, fields, reeds), sandy
  beaches and a breathing coastal foam line.
- Armies that march: standards (pole + rippling pennant) slide along their path day by day
  instead of teleporting, battles rock and spark, sieges smoke — and clicking a battle (on
  the map or in the outliner) opens a live battle window with the day's dice, both hosts
  army by army, morale and the running butcher's bill.
- Co-op multiplayer with no server: the host's browser runs the world and friends join
  over a direct WebRTC link by swapping invite/reply codes (⚔ Multiplayer on the title
  screen). Everyone rules the host's nation together — any player can move the armies,
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
- Eight chapters spanning twenty-one centuries: the Maccabean Revolt (167 BCE), the
  Judaean Civil War (67 BCE), Herod's Rise (40 BCE), the Great Revolt (66 CE), the
  Kitos War (115 CE — the diaspora rises behind Trajan's back), the Bar Kokhba
  Revolt (132 CE), the Persian Gambit (614 CE — Jerusalem changes hands in the last
  great war of antiquity), and the War of Independence (1948 — five armies, every
  border, and the armistice lines becoming a state).
- Formable nations: win the brothers' war as Hyrcanus or Aristobulus and restore
  Hasmonean Judaea; break Antigonus as Herod and proclaim the Kingdom of Judaea —
  the whole realm (map color, armies, wars, treaties, your own throne) takes the
  new banner, with a requirement checklist in the Decisions panel and a permanent
  founding bonus. Endgame crowns too: the Kingdom of Israel for any victorious
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
  Pompey's settlement, Rome suing after Beth Horon, the emperor's terms in
  the Kitos War, Hadrian letting go, Persia returning the Cross — arrives as
  an event card you may accept or refuse, offered exactly once.
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
  marching. The whole 39-suite verification battery ships in `tools/tests/`.
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
- The sound of the age, synthesized from nothing (no audio files): parchment
  and chimes for events, clashing steel for battles, horns for war and bells
  for good news — under a generative score that improvises on a breathing
  drone: a lyre and a ney in Dorian while you're at peace, Freygish with
  frame drums when war comes (a military snare in 1948), faster and harder
  as your armies fight. Speaker and note buttons (bottom-left) mute the lot
  or just the music; both choices persist.

## Architecture

See `SPEC.md`. `main.js` is the boot/frame loop; `js/map/` rendering; `js/sim/` DOM-free
simulation; `js/ui/` chrome; `js/data/` defines, map data, and the 66 CE scenario.
