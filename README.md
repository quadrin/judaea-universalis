# Judaea Universalis

**▶ Play it now: https://quadrin.github.io/judaea-universalis/**

An EU4-style grand-strategy game set in the ancient Near East. Three bookmarks:
**The Maccabean Revolt, 167 BCE** (Hasmonean Judaea or the Seleucid Empire),
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
- EU4-style peace negotiation for non-scripted wars: build a deal from occupied provinces,
  an indemnity and humiliation, priced against your war score; losing AIs sue for peace,
  AI-vs-AI wars settle themselves, and five-year truces follow every treaty. Declare war
  from a foreign province's diplomacy block (at a stability cost).

## Architecture

See `SPEC.md`. `main.js` is the boot/frame loop; `js/map/` rendering; `js/sim/` DOM-free
simulation; `js/ui/` chrome; `js/data/` defines, map data, and the 66 CE scenario.
