# Judaea Universalis

An EU4-style grand-strategy vertical slice set in the Roman Near East. This build ships one
bookmark — **The Great Revolt, 66 CE** — playable as **Judaea** (hard) or **Rome** (moderate).

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

## Architecture

See `SPEC.md`. `main.js` is the boot/frame loop; `js/map/` rendering; `js/sim/` DOM-free
simulation; `js/ui/` chrome; `js/data/` defines, map data, and the 66 CE scenario.
