# Judaea Universalis

**▶ Play it now: https://quadrin.github.io/judaea-universalis/**

An EU4-style grand-strategy game set in the ancient Near East. Five bookmarks:
**The Maccabean Revolt, 167 BCE** (Hasmonean Judaea or the Seleucid Empire),
**The Judaean Civil War, 67 BCE** (Hyrcanus or Aristobulus, with Pompey inbound),
**Herod's Rise, 40 BCE** (Herod or Antigonus, with Parthia in Syria),
**The Great Revolt, 66 CE** (Judaea or Rome), and **The Bar Kokhba Revolt, 132 CE**
(Judaea or Rome).

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

## Architecture

See `SPEC.md`. `main.js` is the boot/frame loop; `js/map/` rendering; `js/sim/` DOM-free
simulation; `js/ui/` chrome; `js/data/` defines, map data, and the 66 CE scenario.
