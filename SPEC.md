# JUDAEA UNIVERSALIS — Vertical Slice SPEC v1

EU4-style grand strategy, Near East antiquity. This slice ships ONE bookmark — **The Great
Revolt, 66 CE** — playable as **JUD (Judaea, hard)** or **ROM (Rome, moderate)**, with:
province map (WebGL, EU4 "quasi-3D" look), 6 mapmodes, pausable daily tick + monthly economy,
armies/battles/sieges, unrest & revolt as the flagship system, a scripted historical event
chain (Josephus), and win/loss.

This document is the AUTHORITATIVE contract. `main.js` (already written, read it) is the
authoritative consumer of every cross-module API. If SPEC and main.js seem to disagree,
main.js wins — code so that main.js works unmodified.

---

## 0. Hard rules for every module

- Plain **ES modules**, browser-native, **zero dependencies**, no build step, no TypeScript
  syntax. Served by `python3 -m http.server` from the repo root. Target latest Chrome.
- **Write ONLY the files assigned to you.** Never touch files owned by other modules.
- `js/sim/*` and `js/data/*` must be **DOM-free** (no `window`/`document`/canvas). They may
  use the bus and rng.
- Colors in data are `[r,g,b]` arrays, 0–255.
- Provinces are referenced by **canonical name strings** in data/content and by **integer id**
  (1..N, array index) in sim/render. `id = index in MAP_DATA.provinces + 1`. Id 0 = sea.
- Every module must fail soft: unknown name → `console.warn` once, skip; never throw in the
  render/tick loop.
- Dates: `{y, m (1-12), d (1-30)}`. Every month has exactly **30 days**. Display real month
  names. Start date 66-06-01 CE.

## 1. File map & ownership

| Owner agent | Files |
|---|---|
| (done) | `main.js`, `js/core/bus.js`, `js/core/rng.js`, `SPEC.md` |
| defines | `js/data/defines.js` |
| map-data | `js/data/map_data.js` |
| renderer | `js/map/renderer.js`, `js/map/camera.js`, `js/map/geometry.js`, `js/map/mapmodes.js`, `js/map/overlay.js`, `js/map/labels.js` |
| sim | `js/sim/init.js`, `js/sim/tick.js`, `js/sim/economy.js`, `js/sim/military.js`, `js/sim/unrest.js`, `js/sim/events.js`, `js/sim/ai.js` (internal split may vary; **public exports pinned below**) |
| ui | `index.html`, `styles.css`, `js/ui/ui.js` (+ any extra `js/ui/*.js` it imports itself) |
| content | `js/data/bookmark_66ce.js`, `js/data/events_66ce.js` |

## 2. Map projection & constants

Equirectangular, tuned distortion-free at ~32°N:

```
LON0=29.0  LON1=50.0  LAT0=25.5  LAT1=38.5
MAP_W=2048 MAP_H=1496          // map units == province-ID texture pixels
x = (lon - LON0) / (LON1 - LON0) * MAP_W
y = (LAT1 - lat) / (LAT1 - LAT0) * MAP_H     // y=0 at TOP (north)
```

`MAP_DATA` exports these constants and `project(lon, lat) -> [x, y]`.
`idArray` indexing: `idArray[y * MAP_W + x]`, row 0 = north.

## 3. `js/data/defines.js` — export `const DEFINES`

Pinned keys (values are the defines agent's to tune; other agents rely on the KEYS):

```js
DEFINES = {
  SPEED_MS: {1:900, 2:450, 3:220, 4:100, 5:40},   // ms of real time per game day
  DAYS_PER_MONTH: 30,
  MONTH_NAMES: ['January',...,'December'],
  TERRAINS: { coast, farmland, hills, mountains, desert, drylands, steppe, marsh, wasteland:
    // each: {name, color:[r,g,b], moveCost:1..2.5, defBonus:0|1|2 (dice), attrition:0..5}
  },
  HABITATION: { uninhabited, frontier, rural, town, urban },
    // each: {name, level:0..4}; independent of terrain, ownership and passability
  GOODS: { grain, wine, olive_oil, dates, balsam, incense, purple_dye, glass, papyrus,
           silver, salt, spices, timber, fish, livestock },
    // each: {name, price (ducat-like "talents" per unit), color:[r,g,b]}
  RELIGIONS: { judaism, samaritanism, hellenism, roman_cult, nabataean, zoroastrianism, egyptian },
    // each: {name, color, group}   groups: 'judaic' | 'pagan' | 'iranic'
    // judaism.name = 'Judaism'
  CULTURES: { judean, galilean, samaritan, idumean, nabataean, arab, aramean, phoenician,
              greek, egyptian, roman, armenian, persian },
    // each: {name, color, group}  groups: israelite, syrian, hellenic, arab, egyptian, latin, iranian, armenian
  TAGS: {
    ROM: {name:'Rome',            color:[168,36,36],  religion:'roman_cult', culture:'roman',  capital:'Antioch'},
    JUD: {name:'Judaea',          color:[36,82,158],  religion:'judaism',    culture:'judean',  capital:'Jerusalem'},
    PAR: {name:'Parthia',         color:[0,120,110],  religion:'zoroastrianism', culture:'persian', capital:'Seleucia-Ctesiphon'},
    NAB: {name:'Nabataea',        color:[196,124,40], religion:'nabataean',  culture:'nabataean', capital:'Petra'},
    ARM: {name:'Armenia',         color:[122,62,150], religion:'zoroastrianism', culture:'armenian', capital:'Tigranocerta'},
    AGR: {name:'Kingdom of Agrippa II', color:[214,120,120], religion:'judaism', culture:'galilean', capital:'Caesarea Philippi'},
    REB: {name:'Rebels',          color:[96,96,96],   religion:'hellenism',  culture:'greek', capital:''},
    WASTE:{name:'Wasteland',      color:[70,66,60]},
    // each may also carry: ideas:{disciplineMult, moraleMult, siegeBonus, hillDefBonus,
    //   incomeMult, manpowerMult, reinforceMult} (all optional, default 1 or 0),
    //   description:'one-liner for start screen / tooltips'
  },
  BASE: {  // balance constants, sim reads these — defines agent sets sane values
    regSize:1000, regCost:{inf:10, cav:25}, maintPerReg:0.35,
    moraleBase:3.0, moraleRecoveryPerMonth:0.6,
    taxPerDevPerYear:1.0, prodMult:0.6,          // income scale
    mpPerDev:250, mpRecoveryMonths:60,           // manpower pool scale
    supportLimitBase:8, supportLimitPerDev:0.8,  // regiments supportable in province
    fortGarrisonPerLevel:1000, siegePerFortLevel:? ,
    unrestRevoltThreshold:5, revoltFireAt:100, rebelSizePerDev:0.4,
    warExhaustionMax:20,
    startTreasury:{...per tag via bookmark, keep 0 here}
  },
  UNREST: { heathen:3, sameGroupHeretic:1.5, wrongCultureGroup:1, occupied:3,
            perWarExhaustion:0.25, perNegativeStability:1, perPositiveStability:-0.75 },
}
```

## 4. `js/data/map_data.js` — export `const MAP_DATA`, `function validateMapData()`

```js
MAP_DATA = {
  MAP_W, MAP_H, LON0, LON1, LAT0, LAT1, project(lon,lat),
  provinces: [ ...see schema... ],      // id = index+1; renderer cap 512
  coast: { land: [ [ [lon,lat], ... ], ... ],   // filled land polygons (mainland(s), Cyprus, Arabia edge)
           lakes: [ ...same, punched out... ] },// Dead Sea, Sea of Galilee, Lake Urmia(optional)
  rivers: [ { name, width:1..3, points:[[lon,lat],...] }, ... ],  // Nile+Delta arms, Jordan, Litani, Orontes, Euphrates, Tigris, Balikh/Khabur optional
  heightPrimitives: [ ... MAX 24 ... ],
  extraLinks: [ ['Salamis','Seleucia Pieria'], ['Paphos','Ptolemais'] ],  // strait/ferry adjacency, by name
}
```

Province schema (static; sim copies/extends at runtime):

```js
{ name:'Jerusalem', lon:35.23, lat:31.78, weight:0.9,   // Voronoi weight: 0.7 small city .. 1.8 huge desert
  terrain:'hills', good:'wine', religion:'judaism', culture:'judean',
  dev:{tax:8, prod:6, mp:8}, owner:'JUD', fort:3,
  holy:'temple_mount'|null, wonder:'temple'|null,
  habitation:null|'uninhabited'|'frontier'|'rural'|'town'|'urban',
  settleable:true, impassable:false }
```

`habitation`, `owner`, `terrain`, and `impassable` are separate axes. A cell may be
uninhabited but sovereign-owned, desert but passable, or temporarily impassable yet
settleable. A null static habitation tier is inferred from each bookmark's development.

heightPrimitives (renderer consumes; ALL coords lon/lat):
```js
{type:'ridge', a:[lon,lat], b:[lon,lat], h:0.35..1.0, w:kmish-in-degrees(0.2..1.5)}
{type:'dome',  c:[lon,lat], r:deg, h:...}
{type:'basin', a:[lon,lat], b:[lon,lat], h:-0.2..-0.6, w:deg}   // Jordan rift / Dead Sea
```
Must include: Lebanon & Anti-Lebanon ridges, Mt Hermon dome, Judean-Samarian highlands ridge,
Galilee dome, Carmel, Jordan rift basin (Galilee→Dead Sea→Arabah), Edomite plateau, Taurus arc
(2-3 ridges along S Anatolia), Zagros (SE), Armenian highlands dome, Sinai domes, Hejaz edge.

`validateMapData()` → array of warning strings (empty = ok). Must check: every seed lands
inside a land polygon (point-in-polygon), seeds ≥ 6 map-units apart, every `owner` is a known
tag, every terrain/good/religion/culture key exists in the pinned DEFINES key lists (hardcode
the key lists locally to avoid importing defines), extraLinks names resolve.

### Canonical province table (names are EXACT strings; content agent references them)

Region · name (owner, terrain, good, religion/culture hints). Coordinates: use real historical
locations. Owners at 1 June 66 CE:

- **Judea (JUD):** Jerusalem (hills, fort 3, holy temple_mount, wonder temple, dev 8/6/8, judaism/judean), Jericho (drylands, balsam), Emmaus (hills), Lydda (farmland), Joppa (coast), Masada (desert, fort 3, salt), Engaddi (desert, balsam), Gadora (hills; Perea district, judaism/judean), Machaerus (desert, fort 2, salt), and in Galilee: Sepphoris (hills, judaism/galilean), Jotapata (hills, fort 2, olive_oil), Tiberias (coast(lake), fish), Tarichaea (coast(lake), fish), Gischala (hills, olive_oil). *(14 provinces)*
- **Judea region under ROM:** Gaza (coast, incense), Ascalon (coast, wine), Azotus (coast), Jamnia (farmland, judaism), Hebron (hills, judaism), Adora (hills; Idumea, judaism/idumean), Sebaste (hills, hellenism/samaritan-mixed→hellenism/greek), Neapolis (hills, holy 'gerizim', samaritanism/samaritan), Antipatris (farmland), Caesarea Maritima (coast, dev 6/7/4, hellenism/greek), Dora (coast, purple_dye), Ptolemais (coast, glass), Scythopolis (farmland, grain, hellenism/greek), Pella, Gadara, Gerasa, Philadelphia (Decapolis: hills/drylands, hellenism/greek, wine/olive_oil/livestock).
- **AGR:** Caesarea Philippi (hills), Batanea (farmland, grain), Gamala (hills, fort 2, judaism/galilean).
- **Phoenicia (ROM):** Tyre (coast, purple_dye, dev 5/8/3), Sidon (coast, glass), Berytus (coast, timber), Byblos (coast, timber), Tripolis (coast), Aradus (coast, fish).
- **Syria (ROM):** Damascus (drylands, dev 6/7/5), Chalcis (hills), Emesa (drylands), Apamea (farmland), Antioch (farmland, dev 9/10/6, fort 2, hellenism/greek), Seleucia Pieria (coast), Laodicea (coast, wine), Beroea (drylands), Cyrrhus (hills), Palmyra (desert, spices, dev 4/7/2, aramean), Zeugma (hills), Samosata (hills; Commagene), Tarsus (farmland, silver), Melitene (mountains), Iconium (steppe), Tyana (steppe), Pisidia (mountains), Attalia (coast).
- **Egypt (ROM):** Pelusium (coast, salt), Rhinocolura (desert), Alexandria (coast, dev 10/12/6, fort 2, wonder 'library', hellenism/greek), Athribis (farmland, grain, egyptian), Leontopolis (farmland, grain, judaism/judean — Oniad temple district), Memphis (farmland, papyrus), Arsinoe (farmland, grain), Oxyrhynchus (farmland, papyrus), Thebes (drylands, grain), Myos Hormos (desert, spices — Red Sea port).
- **Cyprus (ROM):** Salamis (coast, timber), Paphos (coast).
- **Nabataea (NAB):** Petra (desert, incense, dev 4/8/3, fort 2, wonder 'petra'), Bostra (drylands, grain), Oboda (desert, incense), Aila (desert, spices), Hegra (desert, incense), Dumatha (desert, livestock), Medaba (drylands, livestock, nabataean but judaism-minority → religion nabataean).
- **Parthia (PAR):** Edessa (hills; Osrhoene, aramean), Carrhae (drylands), Nisibis (drylands, judaism-minority → aramean/zoroastrianism your call, prefer zoroastrianism + aramean culture), Singara (drylands), Hatra (desert), Arbela (hills; Adiabene — judaism! royal converts, culture aramean), Seleucia-Ctesiphon (farmland, dev 8/9/6, fort 2), Babylon (farmland, dates), Nehardea (farmland, dates, judaism/judean — Babylonian diaspora), Charax (marsh, spices), Ecbatana (mountains), Dura-Europos (drylands, fort 1).
- **Armenia (ARM):** Tigranocerta (mountains, fort 2), Sophene (mountains).
- **Initially unowned and impassable:** Syrian Desert, Arabian Desert, Sinai Interior, Eastern Desert, Libyan Desert. These start `WASTE` and `uninhabited`, but those states are explicit rather than consequences of their terrain. Big weights (1.6-2.2).

Dev guidance: metropolis 8-12 total-ish per component listed above; ordinary 3-5/3-5/2-4;
desert towns 1-2. Unlisted attribute = your best historical judgment. You may ADD up to ~8
filler provinces for map coverage (e.g. Upper Galilee interior, Auranitis, Cilicia Trachea)
— but never rename canonical ones.

## 5. Renderer package — `js/map/*` (one agent)

### 5.1 `renderer.js` — `export async function initRenderer(canvas, MAP_DATA, DEFINES)`

Returns:
```js
{ idArray,            // Uint16Array(MAP_W*MAP_H), province id per pixel, 0=sea, row 0 = north
  provIdAt(mapX, mapY),          // clamped nearest-pixel lookup into idArray
  setProvinceColors(primary, secondary, flags),
      // Uint8Array((N+1)*4) RGBA ×2  +  Uint8Array(N+1) bitfield:
      // bit0 = diagonal stripes of `secondary` over primary (occupation)
      // bit1 = gray cross-hatch (uninhabited or impassable land)
  setMapmodeParams({relief=1, flat=0}),   // relief: terrain shading strength 0..1
  setSelected(provId),                    // 0 = none; animated highlight
  render(camera, timeMs),
  resize() }
```

WebGL2, single fullscreen-quad main pass each frame + one-time generation passes:

1. **Land mask** (CPU, offscreen 2D canvas at MAP_W×MAP_H): fill `coast.land` polygons white,
   punch `coast.lakes` black → texture (LINEAR, mipmaps ON — mips reused for sea depth &
   coast falloff). Also a **decor canvas**: rivers as stroked polylines (alpha), → texture.
2. **Province-ID pass** (FBO, RGBA8, MAP_W×MAP_H, NEAREST): fragment shader loops up to
   512 seeds stored in a 1-row `RGBA32F` texture (`x,y,weight,unused`), warped weighted nearest:
   `d = length(px + warp(px)*18.0 - seed.xy) / seed.z` where `warp` = 2-octave value-noise
   fbm pair (same warp for all seeds — organic borders). Land-mask < 0.5 → id 0. Encode id
   low byte in R and high byte in G. Then `readPixels` → build the `Uint16Array` (handle GL
   y-flip: idArray row 0 must be NORTH).
3. **Heightmap pass** (FBO RGBA8): height = coastFalloff (from land-mask mip sample) +
   Σ primitives (uniform array, MAX 24: ridge = distance-to-segment gaussian; dome = radial;
   basin = negative ridge) + 2-octave fbm detail scaled by local height. Encode 0..1 in R
   (sea ≈ 0.05, plains ≈ 0.25).
4. **Main pass** per frame: uniforms `uOffsetScale` (camera), `uTime`, `uZoom`, `uSelected`,
   `uPaper` (parchment blend = smoothstep on zoom), `uRelief`. Samples: idTex (texelFetch),
   heightTex, landMask (+mips), decorTex, and two `(N+1)×1` RGBA lookup textures (colorA/
   colorB) + flags texture + owner-index texture (R = owner tag index, for border class).
   - **Fill:** colorA over terrain-tinted relief; NW light `normalize(vec3(-0.5,-0.7,0.6))`,
     normals from height gradient (offset samples).
   - **Border melt (v1.7):** the ID lookup coordinate gets a static fbm wobble
     (`JITTER_AMP` ≈ 1.35 texels, wavelength ≈ 5 texels) before `texelFetch`, so the
     NEAREST staircase reads as a hand-inked organic line. Wobbled fragments that land on
     id 0 inside the coastline paint `COAST_SAND` beach instead of sea.
   - **Terrain grain (v1.7):** an `(N+1)×1` R8 lookup maps id → terrain class; per-class
     procedural detail (dune bands, craggy ridges, rolling hills, field patches, reed
     bands, speckle) modulates the land color, fading in past parchment zoom.
   - **Borders:** compare id to +1px x/y texels → province border (thin, dark 35%); if owner
     index differs → country border (2px, darker). Border strength ↑ in paper mode.
   - **Stripes/hatch** for flags bits (screen-space 45° stripes, 8px period).
   - **Selected:** brighten fill + pulsing rim (uTime).
   - **Sea:** deep→shallow gradient via land-mask high-LOD mip, faint animated noise; paper
     mode → flat parchment-blue with darker coast line. A breathing foam line brightens the
     water just offshore (land-mask band × animated fbm), gone in paper mode (v1.7).
   - **Rivers:** darken/tint where decor alpha > 0.
   - **Paper mode:** desaturate & lift colors toward parchment `#e8dcc0`, kill relief except
     faint hillshade, boost borders, add paper-grain noise (hash of map coords).
- Canvas sized to container × devicePixelRatio. `UNPACK_FLIP_Y_WEBGL=false` everywhere;
  handle orientation explicitly. NEAREST for id texture, LINEAR elsewhere. All shaders
  `precision highp float;`. Guard `gl===null` with a visible error div.
- Before first `setProvinceColors` call, render provinces in neutral tan so the start screen
  backdrop already shows the map.

### 5.2 `camera.js` — `export function createCamera(container, MAP_DATA)`

```js
{ x, y,                 // map coords at screen center
  zoom,                 // screen px per map unit, clamp [0.35, 8], wheel-zoom to cursor
  screenToMap(sx,sy)->[x,y], mapToScreen(x,y)->[sx,sy],
  onClick(cb), onRightClick(cb),     // cb(mapX, mapY, sx, sy); click = <5px pointer travel;
                                     // right-click must preventDefault contextmenu
  centerOn(x,y,zoom?),               // smooth-ish (lerp over ~300ms ok, or instant)
  update(dt), viewport:{w,h}, handleResize() }
```
Left-drag pans. Edge clamping: keep map roughly on screen. Attach listeners to `container`.

### 5.3 `geometry.js` — `export function computeGeometry(idArray, MAP_DATA)`

Single pass over idArray (compare right & down neighbors):
```js
{ neighbors,   // Array(N+1) of Set<int>, land adjacency + extraLinks merged (by name)
  centroids,   // Array(N+1) of {x,y} (pixel-mass centroid, map coords)
  areas,       // Int32Array(N+1) pixel counts
  bbox }       // Array(N+1) of {x0,y0,x1,y1}
```
Ignore id 0. Wasteland provinces stay IN neighbors (sim filters impassable for pathing).

### 5.4 `mapmodes.js` — `export function computeMapmodeColors(ctx, mode)`

Returns `{primary, secondary, flags, params:{relief, flat}}` sized (N+1). Modes:
- `political`: owner tag color; controller≠owner → secondary=controller color + stripe bit;
  wasteland → hatch bit. relief 0.55.
- `terrain`: DEFINES.TERRAINS color per province. relief 1.0.
- `religion`: religion color. relief 0.35.
- `culture`: culture color (group-tinted: mix culture color 70% with group-mate hue). relief 0.35.
- `development`: total dev → 5-step green ramp (low #d8d2b0 → high #1e7a2e). relief 0.3.
- `unrest`: 0 → quiet gray-green; ramp yellow→red at unrest 10+; provinces with
  revoltProgress>0 pulse via secondary+stripe. relief 0.3.

### 5.5 `overlay.js` — `export function createOverlay(canvas, geom, MAP_DATA, DEFINES)`

```js
{ draw(game, camera, timeMs, dayFrac),
  hitTestArmy(sx, sy, game, camera) -> armyId|null,
  hitTestBattle(sx, sy, game, camera) -> provId|0 }   // battle-disc click (v1.7)
```
2D canvas, cleared each frame, sized like main canvas, `pointer-events:none` (CSS: ui agent).
Draws (map→screen via camera): army standards (pole + swallow-tailed pennant in the tag
color, white men count "12k", tiny morale bar, gold outline if selected — read
`game.ui.selectedArmy`; the cloth ripples while marching, gold finial marks a general),
movement arrows (path polyline through centroids, arrowhead), battle icon (⚔ on white disc,
rocking with an expanding ripple ring and sparks) where `game.battles` live, siege icon
(tower glyph + progress arc + rising smoke) on besieged provinces, gold ✦ on wonder
provinces when zoom > 1.5. Cull off-screen. Hit test = chip rects, topmost first.
**Marching interpolation (v1.7):** mid-hop armies slide from their province centroid toward
`path[0]` by `(hopTotal − moveDaysLeft + dayFrac) / hopTotal` (`hopTotal` is stamped by
`moveArmiesDaily` when a hop begins; `dayFrac` is main.js's sub-day accumulator fraction).
Chips, arrows and picking all share the interpolated position.

### 5.6 `labels.js` — `export function createLabels(el, MAP_DATA, geom)`

`{ update(ctx, camera, mapmode) }` — ctx may be null pre-game (then clear). Absolutely
positioned divs in `#labels-layer` (pointer-events:none). Zoom ≥ ~1.1: province names at
centroids, font scaled by sqrt(area)·zoom, clamped 9-22px, hidden if < 9. Zoom < ~1.1: tag
names (owner-weighted centroid over owned provinces, size ~ sqrt(total area), letter-spaced
serif caps in darkened tag color). Recompute cheaply every call (N≈100); reuse divs.

## 6. Sim package — `js/sim/*` (one agent; public API pinned, internals free)

### 6.1 `init.js` exports

```js
export function initGame({DEFINES, MAP_DATA, geom, bookmark, events, playerTag, rngSeed}) -> game
export function makeCtx({game, DEFINES, MAP_DATA, geom, bus, bookmark, events}) -> ctx
export function gameActions(ctx) -> actions
export const simHelpers   // also attached as ctx.helpers
```

`ctx = { game, DEFINES, MAP_DATA, geom, bus, bookmark, events, rng, helpers,
         prov(name)->province|null, provId(name)->id|0, byId(id)->province }`

`initGame`: builds runtime provinces from MAP_DATA (owner=controller=static owner), tags from
DEFINES.TAGS (skip WASTE; REB always alive), then calls `bookmark.setup(ctx)` — NOTE:
initGame must construct a temp ctx internally or accept that main calls makeCtx first;
IMPLEMENT: initGame builds game fully except bookmark.setup, and makeCtx runs
`bookmark.setup(ctx)` exactly once (guard with `game.flags._setupDone`).

### 6.2 Game state schema (exact)

```js
game = {
  bookmarkId:'66ce', playerTag, over:false, result:null,
  date:{y:66,m:6,d:1}, speed:2, paused:true,
  nextRecruitId:1,
  tags: { [tag]: { tag, name, color, religion, culture, alive:true, ai:(tag!==playerTag),
    treasury, income:0, expenses:0, manpower, maxManpower,
    stability:0,            // -3..+3
    legitimacy:50,          // 0..100
    warExhaustion:0,        // 0..20
    points:{gov:0, infl:0, mar:0},
    ideas:{...from DEFINES.TAGS[tag].ideas},
    modifiers:[ {id, name, months, effects:{}} ],   // months -1 = permanent
    atWarWith:[], allies:[], opinion:{[tag]:0},     // -200..200
    aiState:{} } },
  provinces: [ null, { id, name, x, y, terrain, good, religion, culture,
    dev:{tax,prod,mp}, owner, controller, autonomy:0.25, unrest:0, revoltProgress:0,
    habitation:'uninhabited'|'frontier'|'rural'|'town'|'urban', settleable:true,
    unitQueue:[], // one FIFO line for land regiments, warships, and air wings
    fort, garrison, maxGarrison, siege:null,   // {by:tag, progress:0-100, breach:0-3, days:0}
    modifiers:[], holy, wonder, impassable } ],
  armies: { [id]: { id, tag, name, prov, path:[], moveDaysLeft:0,
    regiments:{inf, cav}, men, morale, maxMorale,
    general:null|{name, fire:0-5, shock:0-5, maneuver:0-5},
    inBattle:false, retreating:false } },
  nextArmyId:1, nextEventInstance:1,
  battles: [ {id, prov, atk:[armyIds], def:[armyIds], day:0, ...} ],
  wars: [ {id, name, attackers:[], defenders:[], warscore:{}, started:{y,m,d}} ],
  pendingEvents: [ {instanceId, eventId, forTag} ],
  firedEvents: {}, flags: {}, rngSeed, rngState, // cursor advances with every draw; saves resume exactly
  ui: { selectedProv:0, selectedArmy:null },   // sim never reads; ui/overlay share it
}
```

### 6.3 `tick.js` — `export function tickDay(ctx)`

Order: advance date → army movement (decrement moveDaysLeft; on arrival pop path; entering
enemy-controlled province with no defender → start siege or auto-occupy if fort 0 after
~10 days) → battles (daily round) → sieges (daily progress) → date-triggered events → if
`d===1`: monthly block → emit `'day'` (and `'month'`).

Monthly block: economy (income = Σ owned&controlled (tax·(1-autonomy)·taxPerDev/12 +
good.price·prod·prodMult/12); expenses = maintenance; treasury can go negative → morale
penalty scale) → manpower regen → reinforcements (drain manpower) → morale recovery →
attrition (terrain attrition + over-supportLimit, worse in enemy territory) → unrest &
revolt progression → rebel spawns → monthly triggered events → AI → war exhaustion drift →
`bookmark.checkVictory(ctx)` → monarch points +(3..5 each)/month.

**Battles** (internals yours; requirements): daily round, d10 + general shock (or fire on
alternating 3-day phases if you like) + terrain defBonus for defender + river/fort skip;
casualties & morale damage scale with enemy men & discipline; morale ≤ 0 → rout: loser
retreats to nearest friendly-controlled province (path via BFS), 30% morale, `retreating`
until arrival. Winner gets warscore. Stackwipe if no retreat option. Multiple armies same
side stack. `discipline = ideas.disciplineMult × modifier effects`.

**Sieges**: attacker army ≥ garrison/1000 regiments idles in hostile fort province →
`siege={by,...}`; progress/day = f(besieger regiments vs fort level, breach from monthly
d14-style roll; JUD ideas.fortDefense? use ideas keys present); at 100 → controller flips to
besieger (`helpers.changeController`), garrison resets to 20%, emit `'siegeEnd'`. Fort 0
provinces: occupied after ~10 days unopposed presence. Besieged Jerusalem with
`flags.faminePenalty` (set by events) → garrison decays faster.

**Unrest** (flagship): per §3 UNREST keys: religion (heathen/heretic by group), culture
group, occupied-by-enemy, war exhaustion, stability (sign-dependent), modifiers, garrison
> 0 → −1. `unrest>threshold` → `revoltProgress += (unrest-threshold)·2` monthly, else decay
−10. At `revoltFireAt`: spawn rebels sized `dev.mp·rebelSizePerDev` regiments. A rising
may join a living co-religionist power at war with its owner only when the province directly
borders land that power owns or controls. Ancient Judaean successor tags also treat the base
map's JUD province group as their homeland, so the revolt can survive there while landless.
Every other rising remains REB; province controller flips to the spawner ONLY if no garrison.
Emit `'notify'`.

**Pathfinding**: BFS over geom.neighbors excluding impassable; enemy tags may not enter
provinces of tags they're not at war with (allies of war-partners ok; keep simple:
at-war-with-owner OR owner==self OR owner shares your war side). moveDaysLeft per hop =
`4 + dist/24 · terrain.moveCost(dest)` days-ish (tune).

**AI** (monthly): per AI tag at war: gather idle armies into stacks at rally points
(`bookmark.aiHints[tag].rally` names), target = nearest enemy-controlled province weighted
by dev & fort (prefer low fort early), path & go; if adjacent enemy stack > 1.4× strength →
retreat toward nearest own fort. Recruit inf up to `aiHints.targetRegiments` while treasury
> 50. Respect tag modifier `aiPassive` (armies hold, no new offensives). REB armies: attack
nearest owner-controlled province, else siege in place. Non-warring AI tags idle.

### 6.4 `simHelpers` (content agent's toolkit — signatures FROZEN)

```js
helpers.spawnArmy(ctx, tag, provName, {inf, cav=0, name, general:{name,fire,shock,maneuver}|null}) -> armyId
helpers.removeArmy(ctx, armyId)
helpers.changeOwner(ctx, provName, tag, {alsoController=true})
helpers.changeController(ctx, provName, tag)
helpers.addProvinceModifier(ctx, provName, {id, name, months, effects:{unrest, taxMult, prodMult, supplyMult}})
helpers.addTagModifier(ctx, tag, {id, name, months, effects:{disciplineMult, moraleMult, unrestAll,
    incomeMult, manpowerMult, reinforceMult, siegeBonus, aiPassive}})
helpers.removeModifier(ctx, scopeTagOrProvName, id)
helpers.adjust(ctx, tag, {treasury, manpower, stability, legitimacy, warExhaustion, gov, infl, mar})  // deltas, clamped
helpers.declareWar(ctx, atk, def, name)
helpers.setFlag(ctx, key, val) / helpers.getFlag(ctx, key)
helpers.notify(ctx, {title, text, type:'info'|'war'|'good'|'bad', provName})
helpers.endGame(ctx, {result:'win'|'loss', title, text, score})
helpers.killGeneral(ctx, tag, generalName)          // removes general from any army
helpers.armiesOf(ctx, tag) -> [army]
helpers.controls(ctx, tag, provName) -> bool
helpers.countControlled(ctx, tag, {religion}) -> int   // provinces controlled, optional religion filter
```

### 6.5 Event engine (`events.js` internals; event OBJECT schema frozen)

```js
{ id:'ev_beth_horon', title:'The Road from Beth Horon', desc:'...(2-6 sentences, sourced tone)',
  forTag:'JUD'|'ROM'|'player'|'both',   // who sees popup; 'both' -> player sees, AI auto-picks
  date:{y,m},                // fire on 1st of that month, OR:
  trigger(ctx)->bool,        // checked monthly (after date events); use with `chance`
  chance:0.5,                // optional monthly probability gate when trigger true
  once:true,                 // default true
  major:true,                // non-player events still toast the player
  aiOption:0 | (ctx)=>idx,
  options:[ {label:'...', tooltip:'...', effects(ctx){...}} ]  // 1-3 options
}
```
Firing: push to `game.pendingEvents`; if `forTag` is player (or 'both'/'player') → pause game,
emit `'event'` with `{instanceId, event, forTag}`; AI events apply `aiOption` silently (toast
if major). `actions.chooseEventOption(instanceId, idx)` applies effects, removes pending,
emits `'eventResolved'`. Queue multiple; UI shows one modal at a time (ui's job).

### 6.6 `gameActions(ctx)` (frozen)

```js
{ setSpeed(n), togglePause(), setMapmode? NO (ui-local),
  recruit(provId, type),            // 'inf'|'cav'; player-controlled&owned only; cost from BASE
  moveArmy(armyId, provId),         // BFS path; ignore invalid silently (toast why via notify)
  mergeArmies(fromId, intoId),
  chooseEventOption(instanceId, idx),
  requestParthianAid(),             // JUD only: costs 50 infl; opinion-scaled chance → subsidy/manpower or PAR joins later via event flag 'parthianSympathy'
  explainUnrest(provId) -> [{label, value}],
  explainIncome(tag) -> [{label, value}] }
```

The application binds `gameActions(ctx)` directly. Pausing stops the simulation
clock, not player commands: splits, merges, development, purchases and issued
movement paths take effect immediately. Time-based work commits its cost and
enters its ordinary construction or recruitment queue immediately, but its
remaining time advances only through the live daily/monthly clock.

## 7. `js/core/bus.js` (done) — events catalog

`day {date}`, `month {date}`, `mapclick {mapX,mapY,sx,sy,provId,armyId}`, `maprightclick
{...same minus armyId}`, `select provId|0`, `selectArmy armyId|null`, `mapmode str`,
`notify {title,text,type,provName?}`, `event {instanceId,event,forTag}`, `eventResolved`,
`battleStart/battleEnd {prov, winnerTag?}`, `siegeStart/siegeEnd {provId, by}`,
`provinceOwner {provId,from,to}`, `provinceController {provId,from,to}`, `war {...}`,
`actionTaken {name}`, `speed n`, `pause bool`, `gameover {result,title,text,score}`.

Emitters: sim emits game-state events; main emits mapclick/maprightclick; ui emits
mapmode/select/selectArmy and calls actions.

## 8. UI package — `index.html`, `styles.css`, `js/ui/ui.js` (one agent)

### 8.1 DOM contract (index.html EXACT skeleton — main.js getElementById's these)

```html
<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Judaea Universalis — The Great Revolt</title>
<link rel="stylesheet" href="styles.css"></head>
<body>
 <div id="app">
  <div id="map-container">
    <canvas id="map-canvas"></canvas>
    <canvas id="overlay-canvas"></canvas>
    <div id="labels-layer"></div>
  </div>
  <div id="ui-root">
    <div id="topbar"></div>
    <div id="province-panel" class="hidden"></div>
    <div id="outliner"></div>
    <div id="mapmode-bar"></div>
    <div id="toast-container"></div>
    <div id="event-modal" class="hidden"></div>
    <div id="gameover-modal" class="hidden"></div>
    <div id="tooltip" class="hidden"></div>
    <div id="start-screen"><div class="loading">Loading the Eastern Mediterranean…</div></div>
  </div>
 </div>
 <script type="module" src="main.js"></script>
</body></html>
```

CSS essentials: `#map-container` fills viewport; `#overlay-canvas`, `#labels-layer`
**pointer-events:none**; `#ui-root` children positioned absolutely & pointer-events:auto only
on panels; `.hidden{display:none}`.

### 8.2 `ui.js` — `export function initUI(staticCtx)` where
`staticCtx = {DEFINES, MAP_DATA, geom, bus, renderer, camera, overlay, labels}`

Returns `{ showStartScreen(bookmark, onPick), bindGame(ctx, actions) }`.

- **Start screen:** title, bookmark blurb, two nation cards (from `bookmark.playableTags`:
  tag, blurb, difficulty) → `onPick(tag)`, hide screen.
- **bindGame** wires everything: topbar (player flag/name; treasury, income tooltip via
  actions.explainIncome; manpower; stability; legitimacy; gov/infl/mar points; date; pause
  + speed 1-5 buttons; update on `'day'`), mapmode-bar (6 buttons → emit `'mapmode'`),
  province panel (opens on `'mapclick'` with provId & no armyId: name, owner/controller
  flags, terrain, dev, religion, culture, good, unrest with `explainUnrest` tooltip, fort +
  garrison bar, siege progress, revolt progress bar, recruit inf/cav buttons w/ costs —
  disabled unless player owns & controls), outliner (right: player armies (name, men,
  morale bar; click → select + camera.centerOn), sieges, battles, wars with warscore),
  event modal (parchment card: title, body, option buttons with tooltips → 
  `actions.chooseEventOption`; show one at a time, drain `game.pendingEvents` for player),
  toasts (from `'notify'`, click → centerOn if provName; auto-fade 6s; color by type),
  gameover modal (`'gameover'`: big verdict, score, "Continue observing" unhides), tooltip
  system (elements with `data-tt` attr; follow mouse).
- **Selection & orders:** ui owns selection state → writes `game.ui.selectedProv/selectedArmy`,
  emits `'select'`/`'selectArmy'`. `'mapclick'` with armyId → select army (own armies only
  selectable). `'maprightclick'` with an army selected → `actions.moveArmy`. Esc: close
  panel/deselect. Space: togglePause. Keys 1-5: speed. Clicking sea (provId 0) deselects.
- **Keyboard listener** on window; ignore when event modal open (except Enter = option 0? no
  — keep it simple, buttons only).

### 8.3 Look & feel

EU4-inspired antiquity skin, pure CSS: near-black wood panels (#1d1710 → #2a2118 gradients),
parchment texture cards (#e8dcc0, subtle inset shadows), gold trim (#c9a227 1px borders +
corner accents), serif display font stack (`'Iowan Old Style','Palatino Linotype',Georgia,serif`),
small-caps headers, unicode glyphs for icons (🪙 ⚔ 🛡 ▣ ☧ etc. sparingly, tasteful). Buttons:
beveled, hover glow. Panels ~280-340px wide. Toasts top-right below topbar. It should look
striking, not like a bootstrap demo. Dark scrollbars. No external assets/fonts.

## 9. Content package — `js/data/bookmark_66ce.js`, `js/data/events_66ce.js` (one agent)

### 9.1 `BOOKMARK_66` export

```js
{ id:'66ce', name:'The Great Revolt', startDate:{y:66,m:6,d:1},
  blurb:'2-3 sentence scene-setter',
  playableTags:[ {tag:'JUD', difficulty:'Hard', blurb:'...'},
                 {tag:'ROM', difficulty:'Moderate', blurb:'...'} ],
  setup(ctx),          // treasuries, manpower, stability, opinions, wars (ROM vs JUD already at war),
                       // starting armies+generals, starting modifiers (e.g. JUD 'Religious Fervor'
                       // moraleMult 1.15 / 36 months; ROM 'Distant Priorities' — small aiPassive
                       // window until Cestius event), Temple treasury lump sum to JUD
  aiHints:{ ROM:{rally:['Antioch','Caesarea Maritima'], targetRegiments:45},
            JUD:{rally:['Jerusalem','Jotapata'], targetRegiments:28}, ... },
  checkVictory(ctx),   // monthly; use helpers.endGame. Rules below.
}
```

Victory (implement exactly):
- **JUD player:** WIN if on 1 Jan 71 JUD controls Jerusalem AND ≥6 judaism-religion provinces
  ("A Negotiated Peace" — Vespasian, secure on his throne, accepts a client Judaea). Early
  WIN if warscore vs ROM ≥ 50 before that. LOSS when JUD controls 0 provinces, or Jerusalem
  lost AND total JUD army men < 3000. Masada-epilogue flavor on the way down.
- **ROM player:** WIN when JUD controls 0 provinces (score by date: before 70 = triumph).
  LOSS if on 1 Jan 74 JUD still controls Jerusalem.
- Both: game continues after win for observation (`game.over=true` stops victory checks).

Starting armies (guidance, tune freely): JUD ~15k Jerusalem (Eleazar ben Simon 2/3/1),
~8k Galilee (Josephus ben Matthias 1/2/4 at Jotapata), ~4k Masada (Menahem? via event),
militia bits. ROM: Cestius Gallus (1/1/1) ~18k at Antioch, garrisons Caesarea/Scythopolis
~4k, Agrippa II small force (AGR ally of ROM). PAR/NAB/ARM at peace, armies token.

### 9.2 `EVENTS_66` — ~20-26 events, Josephus-grounded (BJ 2-7). Required spine:

1. `ev_sacrifices_cease` 66-06 JUD: Eleazar halts the imperial sacrifice — choice: embrace
   (legitimacy+, ROM opinion−−, fervor modifier) / hesitate (stability−).
2. `ev_menahem` 66-07 JUD: Menahem seizes Masada armory, struts in royal robes — arm the
   Sicarii (spawn 4k Masada + unrest Jerusalem) / strike him down (Menahem dies, Sicarii
   sulk to Masada, unrest−).
3. `ev_greek_city_massacres` 66-08 both/major: Caesarea & the Greek cities — unrest +
   province modifiers in mixed-religion provinces, both sides' warExhaustion+.
4. `ev_cestius_marches` 66-10 ROM: Cestius' AI unleashed (remove ROM aiPassive; if ROM is
   AI, force-path his stack toward Jerusalem via helpers — spawn reinforcements at Ptolemais).
5. `ev_beth_horon` trigger: Cestius' army retreats from Judea hills / takes 40% casualties
   near Jerusalem before 67 — JUD: legions ambushed at Beth Horon: ROM army −8k men, JUD
   +mar points, +legitimacy, captured engines (+siegeBonus modifier 24mo), major.
6. `ev_organizing_the_revolt` 66-12 JUD: appoint regional commanders — Josephus fortifies
   Galilee (+1 fort Jotapata/Gischala/Tarichaea, via province modifier or direct fort+1) OR
   concentrate on Jerusalem (+garrison, Galilee unrest+).
7. `ev_vespasian_arrives` 67-02 both/major: Nero sends Vespasian — spawn ~35k at Ptolemais
   + 15k (Titus) at Caesarea, generals Vespasian 5/5/4, Titus 4/5/5; remove any ROM passivity.
8. `ev_jotapata_falls` trigger (ROM controls Jotapata): Josephus surrenders & prophesies —
   killGeneral Josephus; ROM choice: spare him (flavor, +infl) / execute (−legitimacy? inverse).
9. `ev_gischala_falls` trigger (ROM controls Gischala): John of Gischala flees to Jerusalem
   — Jerusalem unrest+3 modifier 'Zealot Coup', JUD stability−1, spawn 2k Jerusalem (John 2/3/2).
10. `ev_zealot_coup` 68-02 JUD (if Jerusalem JUD): Zealots seize the Temple, Idumeans at the
    gates — admit Idumeans (spawn 5k, unrest+, stability−) / resist (civil strife: Jerusalem
    garrison −30%).
11. `ev_nero_dies` 68-06 both/major: Nero falls; empire trembles.
12. `ev_year_of_four_emperors` 69-01 both/major: ROM gets aiPassive + reinforceMult 0.5 for
    12 months ("The legions look west"); JUD breathing room — the alt-history window.
13. `ev_simon_bar_giora` 69-04 JUD: admit Simon (spawn 6k Jerusalem, Simon 3/4/2, unrest+2
    'Faction Strife' modifier) / bar the gates (stability−1 but no strife).
14. `ev_vespasian_emperor` 69-07 both/major: Vespasian proclaimed; Titus takes command —
    ROM stability+, remove passivity, Titus becomes lead general if not present.
15. `ev_famine_in_jerusalem` trigger (Jerusalem under siege ≥ 60 days): famine — garrison
    decay flag, unrest+, grim Josephus-toned text.
16. `ev_temple_burns` trigger (ROM takes control of Jerusalem): 9th of Av — the Temple in
    flames. JUD legitimacy −40, all-province unrest event for judaism provinces, JUD
    'Broken Covenant' moraleMult 0.85; ROM +score. Major, both. (Rabbinic-future flavor
    line: "at Yavneh, the sages begin again.")
17. `ev_masada_epilogue` trigger (JUD controls only Masada): the Sicarii hold the rock —
    flavor; sets up the loss with dignity.
18. `ev_parthian_posture` trigger (flag parthianSympathy && JUD warscore ≥ 25): PAR masses
    on the Euphrates — ROM must garrison east: ROM 'Eastern Anxiety' aiPassive 6mo OR PAR
    declares war (chance) — the big alt-history swing.
19. `ev_adiabene_convoy` 67-? JUD flavor: Queen Helena's house sends grain & silver
    (+treasury, +manpower).
20. `ev_negotiated_peace` — fired by checkVictory on JUD win date (flavor text for the win).
Plus 3-6 more flavor events (diaspora prayers, Sepphoris opens its gates to Rome — flips
Sepphoris to ROM control 67-01 if ROM army within 2 hops, Nabataean archers join Rome,
Tarichaea lake fight, coin minting "Year One of the Freedom of Zion" +legitimacy).

Tone: grounded, specific, quotable — Josephus as source; no caricature. Dates approximate to
history. Effects only via `helpers.*` and direct reads of `ctx.game`.

## 10. Boot sequence (see main.js — already written)

`initRenderer` → `computeGeometry` → `createCamera/Overlay/Labels` → `initUI` →
`showStartScreen` → on pick: `initGame` → `makeCtx` (runs bookmark.setup) → `gameActions` →
`bindGame` → rAF loop: camera.update → sim ticks by accumulator → mapmode colors on dirty →
renderer.render → overlay.draw → labels.update.

## 11. Definition of done (every agent)

- Files parse as ES modules (mentally lint; no stray TS types, no JSX, matched braces).
- Exports EXACTLY as pinned; no extra cross-module imports beyond: defines←nothing,
  map_data←nothing, map/*←(bus? no — pure), sim←core+data schemas via ctx args,
  ui←bus only via staticCtx, content←nothing (uses ctx.helpers at runtime).
- No console spam per-frame; warn once patterns.
- Self-review pass before finishing: re-read your files checking every SPEC-pinned
  signature; state in your final report any deviation.

---

## 12. v1.1 additions (loop closers)

- **Save/load.** `init.js` exports `SAVE_VERSION` and `reviveGame(saved)` (schema-default
  merge; always resumes paused). main.js persists `{v, game}` to localStorage key
  `ju_save_66ce` on the topbar save button (bus `'saveRequest'`) and each January (autosave).
  Start screen shows a Continue button via `showStartScreen(bookmark, onPick, continueInfo?)`.
  Both bookmark-setup guards (`flags._setupDone`, `flags._bookmarkSetupRan`) serialize, so a
  loaded game never re-runs setup. `rngState` is plain game data updated after every random
  draw, so saves resume the stream exactly; pre-`rngState` saves fall back to `rngSeed`.
- **Monarch-point sinks** (actions): `devProvince(provId, 'tax'|'prod'|'mp')` — 50
  gov/infl/mar respectively, +1 dev, cap 15, own+controlled only, emits `'provinceDev'`;
  `buyStability()` — 75 gov; `callReserves()` — 50 mar, +2,000 manpower. AI buys stability
  under 1 and reserves under 20% pool (ai.js `aiSpendPoints`).
- **Peace & truces** (military.js): superseded in v1.4 by the negotiated-peace deal
  builder (§14) — `makePeace`'s wind-down machinery (status-quo reversion, atWarWith
  rebuild, 5-year truces in `game.truces`, stranded armies walk home) lives on inside
  `executePeaceDeal`. `truceActive` blocks `declareWar`. Wars flagged `noNegotiation`
  (the bookmark's scripted war) only resolve through events/victory. UI: dove button on
  outliner war rows → `#peace-modal`.

## 13. v1.2: multiple bookmarks

- Years may be NEGATIVE = BCE (no year 0; tick skips -1 → 1). All UI renders through
  `fmtYear`. Event/bookmark dates use negative years, e.g. `{y:-167, m:11}`.
- A bookmark file may additionally provide:
  - `owners: { 'Province Name': 'TAG', ... }` — political overrides applied by initGame on
    top of map_data's 66 CE defaults. MUST cover every province owned by a tag absent from
    this bookmark (else it keeps a ghost owner; fails soft but looks wrong).
  - `activeTags: ['SEL', 'PTO', ...]` — tags in play; all others (except REB) are never
    created for this game. WASTE is not a tag.
- main.js keeps a registry: `{bookmark, events}` pairs; saves are per-bookmark
  (`ju_save_<id>`, wrapper `{v, savedAt, game}`); the newest save shows as Continue.
- Start screen is two-step: bookmark cards → nation cards (startscreen.js §8.2 still owns it).
- 167 BCE tags in DEFINES: SEL (Seleucid Empire), PTO (Ptolemaic Egypt), HAS (Hasmonean
  Judaea). Content: `js/data/bookmark_167bce.js` (BOOKMARK_167), `js/data/events_167bce.js`
  (EVENTS_167), same schemas as §9.

## 14. v1.4: the realm panel, rulers & negotiated peace

- **Rulers.** Every tag (except REB) carries `ruler: {name, title, gov, infl, mar}`
  (skills 0-6), assigned in `makeCtx` from `bookmark.rulers[tag]`; missing entries (and
  pre-ruler saves) get a 2/2/2 ruling council. Monthly monarch-point gain = 2 + the
  matching skill (tick.js).
- **Nation panel** (`js/ui/nation_panel.js`, `#nation-panel` in index.html): opened by
  clicking the topbar flag. Ruler & skills, religion/culture/capital/realm, stability,
  legitimacy, war exhaustion, treasury & loans, manpower & armies, allies/wars (dove →
  peace dialog)/truces, the central levers (call reserves, restore order, take/repay
  loan) and the national decisions. Esc / swipe-down closes; bottom sheet on phones.
- **National decisions** (init.js `DECISIONS`; actions `getDecisions()` /
  `enactDecision(key)`): grand festival, great public rites, trade expeditions, army
  drill, resettlement (peacetime-only). Effects run through ordinary tag modifiers;
  cooldowns live in `game.diploCooldowns['decision:<key>']`.
- **Negotiated peace, EU4-style** (military.js `PEACE`, `peaceDealInfo`,
  `evaluatePeaceDeal`, `executePeaceDeal`; actions `getPeaceInfo(warId)`,
  `evaluatePeace(warId, deal)`, `offerPeaceDeal(warId, deal)` with
  `deal = {provinces:[ids], gold, humiliate}`): demand provinces your side occupies
  (≈0.9 warscore per dev, min 4), an indemnity (10 warscore per 100 talents, capped by
  the enemy treasury) and humiliation (15 warscore; ±legitimacy, points, stability).
  Accepted when your warscore covers the price; a refusal costs a 6-month envoy
  cooldown (`diploCooldowns['peace:<warId>']`). Empty deal = white peace, accepted per
  the old thresholds (enemy ws ≤ 5, or war-weary at WE ≥ 15 and ws ≤ 15). The fixed
  `PEACE_TERMS` / `offerPeace(level)` API from §12 is removed.
- **Declaring war**: action `declareWarOn(tag)` (−2 stability, −5 legitimacy, −100
  enemy opinion; allies join per `declareWar`), surfaced as a Declare War button in the
  province panel's diplomacy block; truces and alliances gate it (`getDiplomacy` grew
  `canWar`/`whyNotWar`).
- **Living wars** (ai.js `monthlyWarDiplomacy`): an AI leader losing to the player
  (ws ≤ −40, or ws ≤ −10 at WE ≥ 15) sues for peace via toast every 6 months; AI-AI
  negotiable wars auto-resolve at |ws| ≥ 50 or 36 months — the winner takes what its
  score covers, everything else reverts.
- **Portrait phones**: instead of shedding them, the topbar wraps to two rows —
  row 1: flag · treasury · manpower · pause/speed; row 2: stability · legitimacy ·
  G/I/M points · date (styles.css portrait media block; `.tb-break` in topbar.js).

## 15. v1.5: living realms — succession, integration, casus belli, missions, clients, 132 CE

- **Mortal rulers & succession** (`js/sim/realm.js`): rulers carry `age`; tags may carry
  `heir {name, gov, infl, mar, age}` and `regency` flag. Each January everyone ages; a
  monthly actuarial roll (rising past age 50, cap 2%/month) can kill a ruler. On death:
  adult heir crowned (−10 legitimacy), child heir → Regency Council rules until 16
  (−20), no heir → a rolled courtier usurps (−25, −1 stability). Courts without an heir
  eventually designate one. Content hooks: `helpers.setRuler / setHeir / rulerDies`;
  the 66 CE chain now swaps Nero → Galba → Vitellius → Vespasian (heir Titus), and the
  167 BCE chain seats Judah → Jonathan → Simon and Lysias' regency → Demetrius.
  Bookmark `rulers[tag]` entries may carry `age` and `heir`.
- **Post-conquest integration**: ceded provinces arrive at ≥0.6 autonomy with a
  24-month `recent_conquest` (+3 unrest) modifier. Actions: `getIntegration(provId)`,
  `establishRule(provId)` (25 gov → −0.15 autonomy, +2 unrest 6mo) and
  `convertProvince(provId)` (50 infl → `p.conversion {by, monthsLeft:12}`, +3 unrest;
  `monthlyIntegration` flips `p.religion` on completion; occupation pauses, a change of
  owner voids). Province panel grows an Integration block.
- **Claims & casus belli**: `t.claims [provId]`; `fabricateClaim(provId)` (30 infl,
  −20 owner opinion, 12-month per-owner cooldown in `diploCooldowns['claim:<TAG>']`).
  `casusBelli(atk, def)` → claim (war costs nothing) beats holy war (−1 stability;
  target owns co-religionist land); no CB stays −2 stability −5 legitimacy. Wars carry
  `war.cb`. Peace: claimed provinces cost ×0.7, co-religionist ×0.8.
- **Opportunistic AI wars** (`ai.js aiConsiderWar`): a stable (stab ≥1, WE ≤5, ≥8k men,
  not a client, at peace) AI power may declare on an adjacent realm it despises
  (opinion ≤ −50) when clearly stronger (×1.6, or ×1.2 if the target is already at
  war) — 8%/month when all gates pass, best CB applied.
- **Missions** (`realm.js checkMissions`): `bookmark.missions[TAG]` = linear chain of
  `{id, name, desc, rewardText, check(ctx), reward(ctx)}`; progress in `t.missionIdx`;
  checked monthly for every tag with a chain (AI included), toast on player completion.
  Action `getMissions()` feeds the nation panel's Missions section. 5-6 missions per
  playable tag in all three bookmarks.
- **Generic event pool** (`js/data/events_generic.js`, merged into every bookmark's
  list in main.js): ~12 repeatable state-keyed events (harvests, drought, plague,
  earthquake, comet, corruption, raiders, pilgrims, windfalls, games, moneylenders,
  a veteran commander). Engine support: `once:false` + `cooldownMonths` (next-allowed
  month index stored in `game.flags._evCd`).
- **Client kingdoms**: `t.overlord`; peace deals gain `subjugate` (cost 25 + 0.25 ×
  enemy-leader dev, cap 100; replaces province demands — a client keeps its lands).
  Clients pay 15% of income as tribute (economy.js `TRIBUTE_SHARE`, shown in the income
  breakdown), stand with their overlord (`sameSide`), join wars both directions
  (declareWar pulls vassals and the defender's overlord), never start wars, and cannot
  be allied/attacked by their overlord. A dead overlord frees its clients. AGR starts
  as Rome's client in 66 CE. `requestParthianAid` is surfaced in the nation panel (JUD).
- **Third bookmark** (`js/data/bookmark_132ce.js`, `events_132ce.js`): The Bar Kokhba
  Revolt, 132 CE — activeTags ROM/JUD/PAR/ARM, Arabia is Roman, JUD holds a 7-province
  hill-country core; rulers Hadrian and Simon bar Kosiba; ~13 events (Aelia Capitolina,
  the decrees, Akiva's star, the lost legion, Julius Severus, the Method, Betar, the
  Parthian shadow); victory mirrors 66 CE (hold Jerusalem + 6 provinces of the faith to
  136, or ±50 warscore; Rome must extinguish the rising by 137).

## 16. v1.6: reading the game — war overview, ledger, diplomatic mapmode, QoL, holy sites, 67 BCE

- **War overview** (`#war-modal`): clicking a war row (outliner or realm panel) opens the
  war's anatomy — sides with flags, duration & CB, the score bar, and the net breakdown
  battles / occupation / events (`military.js sideComponents`, action `getWarInfo(warId)`),
  plus who occupies what and a button into the peace dialog. Doves still negotiate directly.
- **Ledger** (`#ledger-modal`, action `getLedger()`): every living nation's provinces, dev,
  net income, treasury, troops, manpower and war exhaustion; sortable by column, player row
  highlighted, clients marked. Topbar scroll button or `L`.
- **Diplomatic mapmode** (7th button, `mapmodes.js 'diplomatic'`): colors relative to the
  player — realm, clients (lightened), overlord's house, allies green, war-enemies red,
  truces gold, neutrals gray; our claims striped gold. While the peace dialog is open the
  demandable provinces pulse gold in EVERY mapmode (`game.ui.peaceHighlight`, bus event
  `'peaceHighlight'`), and clicking a row flies the camera there.
- **QoL**: merge-all button on the selected outliner army (action `mergeAllInto`); `N`
  toggles the realm panel, `L` the ledger; the player's ruler deaths arrive as event
  cards (runtime `ctx.dynEvents` registry — never saved, stale `dyn_*` pendings dropped
  on revive); export/import save as a JSON file from the start screen
  (`showStartScreen(..., saveTools)`); the AI now integrates its conquests (establish
  rule / convert, `ai.js aiIntegration`) and drills when flush at war. 66 CE gained
  `activeTags` so other eras' tags never ghost into it.
- **Holy sites & wonders** (`realm.js monthlyHolySites`): a holy site controlled by its
  own faith yields +1 of every monarch point and +0.3 legitimacy a month; in the hands of
  another religious group it drains every realm of that faith (−0.2/month, floor 25).
  Wonders pay their keeper monthly: the Temple +1 gov & +0.2 legitimacy, the Library +1
  influence, Petra +2 talents. Province-panel tooltips explain the yields.
- **Fourth bookmark** (`bookmark_67bce.js`, `events_67bce.js`): The Judaean Civil War,
  67 BCE — new tags HYR/ARI (defines + flag emblems), the Hasmonean kingdom split between
  the brothers, Seleucid rump Syria, Ptolemaic Egypt, Nabataean Damascus, Roman Cilicia.
  The central war is NEGOTIABLE — the first bookmark fought with the full diplomacy kit
  (subjugate your brother!). Event arc: Salome dies, Antipater, Aretas' price (Medaba for
  8,000 lances), Honi the Circle-Drawer, the paschal pig, Tigranes kneels, Pompey annexes
  Syria (SEL extinguished by event), the three embassies, Pompey's demands (submit as a
  client or defy — AI Hyrcanus submits, AI Aristobulus defies), the arbitration, the Holy
  of Holies. Victory: unify the kingdom and hold Jerusalem free by 60 BCE (180), as a
  Roman client (100), beat Rome's intervention at +40 warscore (200); the book closes at
  55 BCE either way.

## 17. v1.7: the beautiful war — graphics upgrade & battle window

- **Smooth borders** (renderer.js FS_MAIN): a static sub-texel fbm wobble on the ID-texture
  lookup melts the NEAREST staircase into hand-inked organic border lines; wobbled id-0
  fragments inside the coastline become `COAST_SAND` beaches.
- **Terrain grain** (renderer.js): id → terrain-class R8 lookup (unit 7) drives per-class
  procedural detail under the relief light — dune bands (desert), craggy ridges (mountains),
  rolling lumps (hills), soft field patches (farmland), reed bands (marsh), speckle
  (coast/steppe/drylands). Fades in past parchment zoom, off in flat mapmodes.
- **Coastal foam** (renderer.js): a breathing bright line just offshore, animated by uTime.
- **Marching armies** (military.js + overlay.js + main.js): `moveArmiesDaily` stamps
  `army.hopTotal` when a hop begins; the overlay interpolates chips/arrows/picking along the
  hop by whole days plus the frame loop's sub-day fraction (`overlay.draw(..., dayFrac)`).
  Armies now walk the map instead of teleporting per province.
- **Army standards** (overlay.js): rounded-rect chips became pole-and-pennant standards in
  the tag color — rippling cloth while marching, gold finial when a general leads, unchanged
  hit boxes.
- **Combat FX** (overlay.js): battles pulse an expanding ripple ring, rock the crossed
  swords and fling sparks; sieges breathe rising smoke wisps.
- **Battle window** (`#battle-modal`, action `getBattleInfo(provId)` → `military.js
  battleInfo`): opened from the outliner battle row or by clicking the battle disc on the
  map (`overlay.hitTestBattle` → mapclick payload `battleProv`). Shows the day, fire/shock
  phase, terrain (+def die), both hosts army by army with morale bars and generals, the
  day's dice (`battle.last`, stamped each `battleRound`) and the running butcher's bill
  (`battle.casAtk/casDef`). Re-renders on each game day; closes itself when the field falls
  silent; Escape closes it first.

## 20. v2.0: the deep game — reforms, the court, navies, trade, Herod's Rise

- **Reform trees** (`js/data/ideas.js`, actions `getIdeas`/`buyIdea`): three five-tier
  lines — The Way of the Sword (martial), The Art of Rule (government), The Voice of
  Heaven (influence) — bought in order at 50+25·tier of the matching point. Unlocked
  tiers merge (Mult keys multiply, others add) over the tag's static national bonuses
  into `tag.ideas`, the map `resolveTagMult`/`resolveTagAdd` already consult. New
  consumption hooks: `siegeMult`, `convertMult`, `legitimacyAdd`. The AI enacts one
  affordable tier a month above a 150-point buffer. Realm panel: tier pips + buy button.
- **The court** (`GENERAL_TRAITS` in military.js; `getCourt`/`hireAdvisor`/
  `dismissAdvisor`): generals earn epithets from their second victory (35%/win, max
  two) — Methodical/Fearsome/Swift/Old Veteran bump pips permanently at gain,
  Engineer gives +30% siege progress live. One advisor seat per point pool: +skill
  (1-3)/month, wage skill×2 talents (deep debt empties the court), two culture-named
  candidates per empty seat.
- **Navies** (`js/sim/navy.js`; geometry.js coastal detection): open sea = any id-0
  component ≥1% of the map (the Med is an INTERIOR sea on this land-framed map; the
  Dead Sea and Galilee are specks and don't count); coastal provinces get an offshore
  anchor where fleets ride. **Armies need ships to cross water**: the old Cyprus
  strait `extraLinks` became `seaLinks` (no land adjacency), accidental raster
  bridges are cut via `severLinks`, and a refused march to an overseas coast tells
  the player to build ships and embark. Ships cost 30t (0.5t upkeep, hulls rot in
  deep debt), carry 1,000 men each; fleets sail port-to-port (straight-line hops,
  `hopTotal` for the overlay), embark/disembark armies (`a.aboard` leaves land play;
  hostile-shore landings engage at once), fight daily broadsides where hostile
  squadrons share an anchorage (a sunk fleet drowns 3/4 of its cargo), and blockade —
  +0.5/day siege progress and a silenced harbor. UI: outliner Fleets section
  (select → right-click a coast to sail), bobbing hull-and-sail overlay chips, Build
  Ship on owned harbors in the province panel.
- **Trade routes** (`js/data/trade.js`, `economy.js tradeIncome`, trade mapmode): five
  routes — the Incense Road (Petra), the King's Highway (Gerasa), the Via Maris
  (Gaza), the Grain Fleets (Alexandria, sea), the Desert Crossing (Palmyra). Each stop
  pays its owner value/stops monthly, double at the chokepoint; occupied, besieged, or
  (sea) blockaded stops pay nothing. Folded into `incomeBreakdown.trade`. The coins
  mapmode paints stops in route colors, chokepoints brighter.
- **Fifth bookmark** (`bookmark_40bce.js`, `events_40bce.js`): Herod's Rise, 40 BCE —
  new tags HER (anchor emblem) and ATG (menorah emblem); Parthian-held inner Syria,
  Roman coast, Cleopatra's Egypt; the War for the Crown (ATG+PAR vs HER, to the death);
  five missions a side; the Rome arc (the flight, Rex Iudaeorum — Rome joins by
  decree), Gindarus (Parthian Syria falls Roman, Parthia exits), the Hasmonean bride,
  the sabbatical year, Cleopatra's price, the axe for a king.

## 19. v1.9: wars that end & stacks that obey

- **Wars end properly** (`military.js`):
  - `dissolveWar(ctx, war)` — the extracted war-dissolution tail (splice, `atWarWith`
    rebuild, 5-year truces, stranded armies march home, `'war'` bus event); the peace
    deal now calls it.
  - `endWarBySword(ctx, war, winnersKey, opts)` — ends a war without a treaty.
    `'att'`/`'def'`: uti possidetis — the winning side takes OWNERSHIP of every enemy
    province it controls (autonomy 0.6 + recent-conquest unrest, like a cession);
    everything else reverts. `null`: white peace, all occupations revert.
  - `updateWarscores` sweeps monthly: a war whose entire side is dead ends by the sword
    (no more eternal wars against extinguished nations), and a `noNegotiation` war whose
    score reaches **±75** opens to the peace table (`noNegotiation` lifts, `_negOpened`
    guards the once-only notify "Envoys may cross the lines") — total victory in a
    scripted fight-to-the-death war is no longer a dead end.
  - `helpers.endGame` closes every war the player is in, then decides HOW to tell the
    player: the full VICTORIA/DEFEAT card appears only when the player's nation is
    actually dead. A verdict while the nation still stands is *chronicled* — `g.result`
    is recorded, the game pauses, and a good/bad toast carries the narrative ("…the
    campaign continues") — sandbox play goes on.
  - `checkElimination` (military.js, monthly in tick.js) owns the true game-over: when
    the player's tag dies (`alive === false` — no provinces, no armies) it fires the
    "Nation Extinguished" card once (`flags._eliminated` survives "continue observing"),
    ends the player's wars, and sets `g.over`.

- **Stack banners** (`overlay.js`, `main.js`, `ui.js`): same-tag armies sharing a
  province and a hop (same `path[0]` + `moveDaysLeft`) share ONE banner — total men on
  the cloth, men-weighted morale bar, and a gold-ringed count badge; the largest army
  carries the standard. `hitTestStack` returns `{id, ids}`; the mapclick payload carries
  `armyIds`, and clicking a banner selects the WHOLE stack (`selectArmyStack`) so one
  right-click marches the host together; shift/group-mode toggles the stack in and out
  of a larger group. The outliner still lists armies singly, and its merge-all button
  turns a selected stack into one real army.

## 18. v1.8: the carousel & the shared world — start-screen slider, multiplayer

- **Bookmark carousel** (`startscreen.js`, `.ss-carousel`): the bookmark step shows ONE
  chapter card at a time in a sliding track — ‹ › arrow buttons, dots, ArrowLeft/Right,
  touch swipe. The active card carries `.current`; clicking an off-slide card slides it in
  first. The 2×2 grid that overflowed small windows is gone.

- **Multiplayer** — no lobby server, ever (the game is a static site). The host's browser
  IS the server; guests connect browser-to-browser over WebRTC.
  - **Transport** (`js/net/rtc.js`): one `RTCPeerConnection` + one ordered DataChannel per
    guest. Manual signaling: the host mints an *invite code* (base64 SDP, `JU1.` prefix),
    the guest pastes it and mints a *reply code*, the host accepts it — codes travel over
    any channel the players like. Google STUN for NAT traversal (pure config, no code
    dependency); ICE gathering is capped at 3.5s so offline/LAN still works. JSON
    messages; anything big is chunked at 48KB and reassembled (`{_c,i,n,s}` envelopes).
    `setHandlers()` lets the lobby hand a live peer to main.js for the game phase.
  - **Lobby** (`js/ui/lobby.js`, `#mp-lobby`, opened from the start screen's ⚔ Multiplayer
    button): host picks chapter + nation and mints one invite per guest (up to 3). The
    campaign is CO-OP: every guest rules the host's nation together with the host — one
    realm, many hands on the tiller (guests do not pick a nation). Begin ships each guest
    `{t:'start', yourTag: hostTag, bookmarkId, game}`.
  - **Model — host-authoritative** (main.js `mp` block): the host runs the sim; guests
    never tick (`mp.role === 'guest'` skips the tick loop). Host broadcasts `{t:'snap',
    game}` — promptly (250ms throttle) when dirty, as a 1.2s heartbeat otherwise. Guests
    apply snapshots by *mutating the game object in place* (ctx closures survive), keeping
    their own `ui` state and assigned `playerTag` while that tag exists, then emit
    `day`/`month` locally so every panel refreshes. A `tagSwitched` remaps every matching
    host-side guest chair and sends `{t:'chair'}`; snapshots fall back to the authoritative
    chair if a stale assigned tag was replaced. Guest actions are proxied: reads
    (`get*/explain*/can*/evaluate*`) run
    against the local mirror; everything else is sent as `{t:'cmd', name, args}` and
    executed on the host under the guest's chair (a scoped `playerTag` swap). Toasts
    raised by a guest's command are captured (scoped `bus.emit` shim) and forwarded as
    `{t:'toast'}` instead of showing on the host. Game-over verdicts relay as `{t:'over'}`.
  - **Sim contract**: `game.humanTags` lists every human nation (with shared rule that
    is just the host's tag); each has `ai:false` so `runMonthlyAI` leaves them alone (the
    AI already keys off `t.ai`). The nation only reverts to the AI when NO human sits it
    — with shared rule the host always does. `reviveGame` resets `ai` from `playerTag`
    and collapses `humanTags` — a save written mid-multiplayer always loads as a solo
    campaign.
  - **Shared eyes**: the host relays every toast (`{t:'toast'}`), event card
    (`{t:'event'}` — display fields only, effects never cross the wire), event
    resolution (`{t:'eventDone'}`) and verdict (`{t:'over'}`) to the guests. Guests see
    the SAME event card read-only (`createEventModal.showRemote` — disabled options +
    "The host speaks for the realm…"), and it closes when the host chooses
    (`closeRemote` on `eventResolved`). Toasts raised by a guest's own command are
    captured before the bus and routed only to that guest — never double-sent.
  - **Known v1 limits** (documented, deliberate): the host holds the pen — guests see
    event cards but the host clicks; there is no reconnect — a dropped guest rejoins
    via a fresh invite in a new lobby.

## 21. v2.1: the living world — balance, the wider east, personalities, coalitions, the chronicle

- **Balance harness** (`tools/autorun.mjs`, zero deps): runs every bookmark with the
  whole world on AI (`game.tags[playable].ai = true`) for N game years against the REAL
  map adjacency (`tools/geom-snapshot.json`, regenerated from the browser's
  `window._ctx.geom` whenever map_data changes — see `tools/README.md`), resolving
  player-facing event cards via their `aiOption`. Prints per-nation trajectories
  (provinces, dev, income, treasury, troops, manpower, reforms) and flags anomalies:
  DEAD, SNOWBALL (provs ≥ max(4, start×1.6)), DEBT-SPIRAL (< −200t), BLEEDING
  (negative income at mid AND end), EXHAUSTED. The accepted flag set (scripted history
  doing its job — Rome wins its wars, doomed underdogs are doomed) is documented in
  `tools/README.md`; any run that adds a NEW flag is a regression.
- **The wider east** (map_data): a political carve-out of Parthia's western marches —
  Osrhoene (OSR: Edessa, Carrhae), Adiabene (ADI: Nisibis, Arbela, Assur — the
  historical Jewish-convert kingdom), Characene (CHX: Charax, the Gulf port,
  incomeMult 1.15) — all clients of PAR in the four later bookmarks, plus four new
  provinces (Amida, Assur, Uruk, Tayma) and the Gulf Road trade route
  (Charax→Uruk→Babylon→Seleucia-Ctesiphon, chokepoint Charax). Buffer states make the
  east political terrain: coalitions, defections, a Parthia that can fray at the edges.
- **AI personalities** (`DEFINES.PERSONALITIES`, `personality(ctx, tag)` in ai.js):
  per-tag `aggression` (scales war appetite: chance 0.08×aggr/month), `caution`
  (scales the strength edge demanded, the sue-for-peace threshold `15/caution`, and
  ally-shyness), and `ponderous` — the great-power texture (ROM/PAR/SEL): giants need
  a 1.9× edge to bother declaring but reinforce at 1.5× once committed. Armies are
  now governed by affordability (`income×0.75/maintPerReg` caps the recruit target,
  peacetime keeps a half-strength standing army, debt causes proportional desertion),
  so client kingdoms field real armies and nobody death-spirals on upkeep.
- **Anti-snowball** (SPEC-anchored in military.js/unrest.js): conquest earns
  **infamy** (`tag.aggression` += ceded dev/3, decays 1/month, nation-panel row with
  a warning at 30+). While infamy ≥20 every non-client, non-ally court sours monthly
  (−aggr/15 opinion, grudges stop drifting back); at ≥30 `coalitionAgainst()` leagues
  the fearful (opinion ≤ −75) into a defensive coalition that joins `declareWar`
  against the expander en masse ("The coalition marches"). The AI stops declaring
  above 40 infamy (digestion pause). **Overextension**: when autonomy-0.6+ land holds
  >15% of a realm's dev, every province gains an Overextension unrest row (share×3).
- **The chronicle + news from abroad** (`chronicle()` in the military.js leaf,
  `ctx.helpers.chronicle` for content): `game.chronicle` records the era as plain data
  — `{y, m, kind, text}`, capped at 400 — wars declared/ended (both `endWarBySword`
  and `executePeaceDeal` chronicle every ending, silent or not), peace terms, ruler
  successions, coalitions leaguing, chapter verdicts, and the fall of nations
  (detected as an alive→dead transition in `updateTagLife`). The Chronicle screen
  (topbar lamp, C key) lists it newest-first under year headings; saves and MP
  snapshots carry the book for free, and guests read it via the local `get*` query
  path. Toast filtering: events among AI courts arrive as quiet "News from abroad"
  info toasts; only the player's own wars sound the "War!" alarm.

## 22. v2.2: the long arc — technology, unit patterns, and three far eras

- **Technology ladders** (`js/data/tech.js`, actions `getTech`/`buyTech`): three
  EU4-style ladders bought level by level with the matching monarch point —
  government (+3% income, −0.03 unrest per level), influence (+5% trade, +4%
  fleet strength, +0.01 legitimacy/mo per level), military (+4% army strength,
  +2% manpower, +1 siege bonus per 6 levels). Cost 250+15·L points; the AGE
  expects `bookmark.techBase` (+1 per 25 game years) — level era+1 is a free
  grace level, each level beyond costs +50%/level (the ahead-of-time penalty).
  Effects fold into `tag.ideas` inside `applyReformsToTag` (base ideas + reform
  tiers + tech), so every `resolveTagMult/Add` consumer works unchanged; new
  consumers: `tradeMult` (tradeIncome), `navalMult` (broadsides), `milPowerMult`
  (battle). The AI buys the cheapest affordable level monthly but never races
  the age. Realm-panel Technology block; ledger Tech column; pre-tech saves
  join the age at 3.
- **Unit patterns & modernization** (`UNIT_GENS`, `army.gen`, `modernizeArmy`):
  six pattern generations — Tribal Levies → Drilled Spearmen (mil 4) →
  Professional Legions (6) → Thematic Regulars (10) → Musket Battalions (14) →
  Rifle Brigades / Armored Corps (19) — each a battle-strength mult
  (1.0→2.8). Armies remember the pattern they were raised to; splits inherit
  it, merges blend by men, Modernize re-equips for 6t per regiment per
  generation crossed (outliner button; the AI re-equips its cheapest stale
  army monthly). In `sideStats`, effective discipline = `disciplineOf ×
  milPowerMult × genMult(a.gen)` — tech is the single biggest lever on the
  field, exactly as ordered.
- **Era plumbing**: bookmarks may now carry `techBase`, `techTweaks`
  (per-tag level nudges — Rome's legions run mar+2 from 67 BCE on),
  `religions` and `cultures` (per-province overlays applied in initGame — a
  Christian 614, an Islamic 1948), and `helpers.endWar(ctx, a, b, winnersKey)`
  for scripted armistices (Hadrian's withdrawal, Kavad's peace, Rhodes —
  'def' freezes the lines uti possidetis where the defenders' side stands).
- **115 CE, The Kitos War** (`bookmark_115ce.js`): the diaspora rises behind
  Trajan's Parthian campaign. Two simultaneous wars (Trajan vs Osroes;
  the Rising, noNegotiation until Hadrian). Playable JUD (Very Hard)/ROM.
- **614 CE, The Persian Gambit** (`bookmark_614ce.js`): new tags BYZ/SAS/GHA,
  christianity; the last great war of antiquity with the Jewish revolt riding
  the Persian advance. Jerusalem falls by event; the Betrayal of 617 is a real
  choice (submit, or defy and fight both empires); Heraclius' counteroffensive,
  Nineveh, and the fall of the House of Sasan close the arc. Playable JUD/BYZ.
- **1948, The War of Independence** (`bookmark_1948.js`): tags ISR/EGY/JOR/SYR/
  LEB/IRQ/SAU/TUR/IRN/UK, islam, modern culture groups and name pools, the map
  in its ancient names (Joppa=Tel Aviv, Emmaus=Latrun, Philadelphia=Amman).
  Tech 19: Rifle Brigades and Armored Corps. The coalition invades on day one;
  the truces, the Altalena, the Burma Road, Bernadotte, Yoav/Hiram/Horev, and
  the Rhodes armistice that ends the war on the lines held. Playable ISR/JOR.

## 23. v2.3: a new banner — formable nations & the true flag

- **Formable nations** (`js/data/formables.js`, `switchTagCore` in military.js):
  when a court fulfills a greater crown's requirements it may take a new tag
  outright, EU4-style. `switchTagCore(ctx, from, to)` rewrites every reference
  in the world — provinces (owner/controller/siege/conversion), armies, fleets,
  wars and their warscore keys, every court's atWarWith/allies/overlord/opinion,
  the truce and cooldown books (pair keys re-sorted), and the player's own
  chair (playerTag/humanTags) — then the caller rebuilds `t.ideas` via
  applyReformsToTag so the new banner's national ideas replace the old, applies
  the formable's bonus (legitimacy/stability/permanent modifier), and emits
  `tagSwitched` (the topbar re-binds) + `provinceOwner` (the map repaints).
  The chronicle records the day ('X is no more: the banners of Y rise').
  Formables surface through the existing Decisions panel with a live ✓/✗
  requirement checklist in the tooltip; forming costs nothing but the doing.
  Shipped: HYR→HAS and ARI→HAS (67 BCE — reunite the brothers' war under one
  throne: Jerusalem, 12 provinces, the rival broken, legitimacy 50),
  ATG→HAS and HER→JUD (40 BCE). A formable with `ai: true` may be taken by an
  AI court the month it qualifies; the four dynastic restorations ship
  player-only — the 67/40 BCE event chains reference the dynasts by tag, and
  in testing an AI Aristobulus legitimately formed Hasmonean Judaea the moment
  Pompey made his brother a client, orphaning the scripted arc.
- **The flag of Israel** (icons.js): the ISR chip now renders the real flag —
  white field, two horizontal stripes and the Star of David in flag blue
  (#0038b8) — as a full-field emblem; `.fchip` gains `overflow: hidden` so
  full-field emblems clip to the chip's rounded corners.

## 24. v2.4: the living land — growth, deeper diplomacy, new crowns, era names

- **Development growth** (`yearlyGrowth` in economy.js, each January): every
  settled province rolls for +1 dev — 5% base, +4% each for market/granary,
  +6% at a capital, up to +4.5% for low autonomy; halved at war, frozen under
  occupation/siege/unrest>4; government tech scales the whole curve
  (`growthMult`, +4%/level). The player is toasted when their towns grow.
- **Deliberate development** (`developCore`, action `devProvince`): +1 tax/prod/mp
  bought with the matching monarch point pool at 50+5×dev — the province-panel
  buttons now price live and explain refusals. The AI develops its capital
  when a pool nears the 999 cap (points otherwise wasted).
- **Deeper diplomacy** (SPEC §24 additions to the frozen action contract):
  - **Subsidies** (`g.subsidies`, `sendSubsidy`/`cancelSubsidy`): 10 talents a
    month for 12 months, +20 opinion; both ledgers carry the flow through
    `incomeBreakdown` (subsIn/subsOut rows in the income tooltip);
    `monthlySubsidies` counts them down and lets deep-debt payers default.
  - **Guarantees** (`t.guarantees`, `guaranteeNation`/`revokeGuarantee`): 50
    influence, +15 opinion — and `declareWar` pulls every guarantor of the
    defender into the defense ("A guarantee is honored").
  - **War reparations** (peace term, 15 warscore): the loser pays 8 talents a
    month for 24 months, riding the subsidy pipe with `reparation: true`
    (uncancelable; defaults only in deep debt). The AI takes reparations with
    leftover warscore when the land is already spoken for.
- **New formables**: JUD→MLI and HAS→MLI (**Kingdom of Israel** — Jerusalem,
  15 provinces, legitimacy 70, at peace: the endgame crown of every Jewish
  arc, including a chained HYR→HAS→MLI), EGY→UAR and JOR→UAR (**United Arab
  Republic** — crush Israel and hold both Jerusalem and Tel Aviv), BYZ→ROM
  (**Restore the Roman Empire** — hold Antioch, Alexandria, Jerusalem and
  Ctesiphon in 614). New tags MLI/UAR with emblems (crowned star; crescent
  and star). All player-only.
- **Era place-names** (`bookmark.provinceNames`): initGame renames `p.name` to
  the era's name and keeps `p.canon` as the content key; makeCtx aliases both
  in `prov()`/`provId()`, so every label, panel, toast and battle title speaks
  1948 (Tel Aviv-Jaffa, Latrun, Amman, Cairo, Baghdad…) while content packages
  keep addressing Joppa. `bookmark.devTweaks` overlays modern populations
  (Cairo 14 tax dev, Tel Aviv 12) — the 1948 armies are sized like 1948.
  Note: the province mesh itself is one canonical raster for all eras by
  design; a true per-era re-mesh (different border shapes) would need per-era
  Voronoi seed sets and geometry snapshots — a possible future project.

## 25. v2.5: constitutions & the face of war — government types, era units

- **Government types** (`DEFINES.GOV_TYPES` + `GOV_OF` defaults +
  `bookmark.govTypes` overrides; state `t.govType`/`t.electionIn`): monarchy
  (heirs, regencies, +0.05 legitimacy/mo), republic (elections every 48
  months — the incumbent must beat the field; emergency election when a head
  of government dies in office; no heirs, no regencies; +5% income), theocracy
  (the elders never anoint a child — a senior priest bridges to the waiting
  heir; +20% conversion), tribal (+10% manpower). Effects fold into `t.ideas`
  in applyReformsToTag like reforms/tech/formables. Rome is a REPUBLIC in the
  three BCE bookmarks (bookmark.govTypes) and an empire after; Judaea rules by
  High Priest (theocracy); Israel, Syria, Lebanon and Turkey vote in 1948;
  forming a nation adopts the new crown's constitution (a proclaimed UAR
  votes; the Kingdom of Israel crowns). Realm-panel Government row shows the
  type and the election countdown; elections are chronicled and toasted.
- **Era units on the map** (SPEC §25, `army.gen` consumed by the overlay and
  the movement/siege math):
  - **Banners wear their age**: antiquity flies the swallow-tailed standard
    (unchanged, gens 0–2), the lance ages a pointed pennon (gen 3), the
    modern ages a squared brigade flag with a unit glyph — crossed rifles for
    infantry stacks, a tank silhouette for armor-heavy ones (gens 4–5).
  - **Motorized march** (`genSpeed`, hopDays): gen 3 ×1.1, gen 4 ×1.25,
    gen 5 ×1.5 — trucks beat sandals; antiquity marches exactly as before.
  - **Modern firepower vs old walls** (tickSieges): a gen-4 stack sieges +25%
    faster, a gen-5 stack (artillery and air support, abstracted) +50%.
  Aircraft/artillery are deliberately abstracted into siege power and march
  speed rather than separate unit types — each bookmark keeps its own feel
  (the 1948 war is fast and wall-breaking; Bar Kokhba is still a war of
  hill forts and patience).

## 26. v2.6: the map remembers — era names everywhere, a flag for every nation

- **Era-proper names in every bookmark** (`bookmark.provinceNames`, SPEC §24
  machinery): the three BCE bookmarks now speak pre-Herodian — Straton's Tower
  (not yet Caesarea), Aphek (not yet Antipatris), Samaria (not yet Sebaste),
  Shechem (Flavia Neapolis is founded 72 CE — so 66 CE says Shechem too),
  Panion, Rakkath (Tiberias is founded 20 CE), Magdala, Mazaca,
  Seleucia-on-Tigris (Ctesiphon is still a camp across the river). 614 CE
  speaks Byzantine and Sasanian: Constantia, Hamadan, Circesium, Maishan.
  115/132 CE keep the canonical (Roman) layer, which is their era. Canonical
  names remain the content keys via p.canon aliases; prose in missions and
  event tooltips was retouched where it named a renamed town.
- **A flag for every nation** (icons.js FLAGS — 32 of 32 tags): the 1948 tags
  fly their real flags chip-size — Egypt's crescent and three stars, the
  Hashemite chevron and seven-pointed star, Syria's three red stars, the
  Lebanese cedar, Iraq's two-star trapezoid flag, the Turkish crescent-star,
  Saudi Arabia's creed-and-sword, Iran's lion-and-sun tricolor, the Union
  Flag, and the UAR's two-star pan-Arab tricolor. The ancient courts get
  parchment-and-gold emblems: Petra's crow-stepped tomb facade (NAB), Ararat
  under the Artaxiad star (ARM), the high priest's twelve-stone breastplate
  (HYR), the usurper's diadem over a sword (ARI), the Edessan crescent-star
  coin (OSR), the royal tiara of the converted house (ADI), a merchant hull
  on the Gulf swell (CHX), and the phylarchs' cross over a lance pennon (GHA).
  The `.fchip-abbr` text fallback no longer appears anywhere in play.

## 27. v2.7: the sound of the age — synthesized SFX & a generative score

All audio lives in `js/ui/sound.js` (`initSound(bus, getGame)`, called from
main.js) and is **synthesized from nothing** — oscillators, filtered white
noise, envelopes, and a feedback-delay reverb bus. Zero assets, zero network
fetches, and the sim never knows sound exists (pure bus listener; the module
is UI-layer and headless tests never load it). Everything is a silent no-op
until the first user gesture (`pointerdown`/`keydown`, once, capture) creates
the lazy `AudioContext`.

- **SFX palette** (each a small recipe over `tone()`/`noise()` primitives):
  ui ticks, a parchment-whoosh + chime for event cards, a metallic clash for
  battles joined, rising/falling three-note motifs for battles won/lost,
  siege drums, a horn swell for war declared and a cadence for peace, a bell
  for good fortune, a low thud for bad, a fanfare on victory or a formable
  proclaimed (`tagSwitched`), a lament on elimination, and a quill scratch on
  save. Per-category cooldowns (`COOLDOWN_MS`) keep dense months from
  stuttering; cues about foreign wars are filtered to the player's own.
- **The generative score**: a procedural ensemble that improvises the era's
  mood, sharing the SFX context and master bus. The foundation is a drone —
  an open fifth (D2+A2 saws, slightly detuned) breathing through a slow-LFO
  lowpass, with a third voice (F2) that wakes outside antiquity to darken the
  fifth into a minor triad. Above it a **lyre** plucks a random-walk melody
  (triangle + sine sub-octave, occasional open-fifth double-stops) and a
  **ney** wanders in occasional glided phrases with a breath-noise halo. A
  200 ms lookahead scheduler (`scheduleAhead`, 0.6 s horizon) beats at 0.75 s
  in peace, 0.55 s at war, 0.44 s in battle, and a slow `sin(i/21)` "breath"
  wave leaves near-silent bars so the score never wallpapers.
- **The mood machine** (`pollMood`, read every scheduler tick): *peace* plays
  Dorian; *war* (any living enemy) and *battle* (player army in `g.battles`)
  switch to **Freygish** (Ahava Rabbah) and wake the drums — a frame-drum
  heartbeat in the ancient eras, rim ticks in battle, and in the modern era
  (y ≥ 1900) a military snare on the off-bars. Mode, tempo, drone level, and
  filter all crossfade; nothing hard-cuts.
- **Controls & persistence**: two fixed buttons bottom-left — the speaker
  (`#ju-sound-btn`, `ju_muted`) mutes everything; the beamed-note
  (`#ju-music-btn`, `ju_music`) silences only the score (music gain ramps
  over 0.4 s; the scheduler stops scheduling and clamps `nextBeat` on resume
  so re-enabling never burst-schedules the silent gap). `window._sound.music`
  exposes `{on/off/toggle/state()}` for tests and debugging.

## 28. v2.8: the open court — every flag is a door

Clicking a nation's flag chip, anywhere one appears, opens that nation's
realm panel. The panel (`nation_panel.js`) now serves two masters:
`open()` is the player's own realm as before; `open(tag)` renders any
foreign court **read-only**.

- **Linked chips**: `flagChip(tag, DEFINES, size, link)` grew a fourth
  argument; with `link` the chip gains `.fchip-link` (pointer cursor, gold
  hover glow) and `data-open-tag`. A single document-level **capture-phase**
  listener in ui.js resolves every such click — capture so the chip wins
  over whatever row it sits in (a war row that would open the war overview,
  a sortable ledger header) — closes any covering modal, and opens the
  court. REB and WASTE never link. Linked surfaces: the ledger, the war
  overview's sides, the battle window's army rows, the province panel's
  owner and diplomacy chips, the outliner's war rows, and every diplomacy
  row inside the realm panel itself — so you can walk the treaty graph
  court by court.
- **The foreign view**: ruler & skills, heir, religion/culture/capital,
  government (with election countdown), realm size, stability, legitimacy,
  war exhaustion, infamy, treasury, loans, manpower and armies — plus two
  rows only envoys see: **Opinion of us** and **Standing** (at war with us /
  our client / our overlord / allied / truce until / no treaties). Their
  diplomacy renders with neutral pronouns ("pays tribute", "their word");
  their tech levels, muster pattern, reform pips and seated advisors render
  read-only (straight from `t.tech` / `t.reforms` / `t.advisors` — the
  panel imports `tech.js` and `ideas.js`, both zero-dep data modules).
  Every lever is hidden: actions, missions, decisions, buy buttons, the
  peace dove; war rows are clickable into the war overview only when the
  player fights in that war (getWarInfo answers from the player's side).
- **The way home**: a small chip of your own flag sits in the foreign
  panel's head; clicking it — or the topbar flag — returns to your own
  realm (the topbar flag only closes the panel when it is already showing
  your realm). `viewing()` exposes the foreign tag (null when home);
  Esc closes as ever, and a foreign court that dies mid-view falls back
  to your own realm on the next refresh.

## 29. v2.9: the arsenal of the age — doctrines, works on the map, air power

- **Recruiting speaks the age**: the province panel's recruit buttons (and the
  battle window's army compositions) use the pattern names — a 1948 barracks
  raises Rifle Brigades and Armored Corps; 66 CE Judaea drills spearmen. The
  words "infantry" and "cavalry" no longer appear in play; every army row
  names what its regiments were actually raised as (`army.gen`).
- **Doctrines** (`DOCTRINES` in tech.js, cumulative by generation): what each
  pattern KNOWS beyond raw power. A pip is worth a general's star, applied to
  the battle dice in battleRound and the siege clock:
  - gen 1 *Shieldwall* — +1 to the die when defending.
  - gen 2 *Professional Drill* — +1 when attacking, sieges +20%.
  - gen 3 *Shock Charge* — +1 in the shock phase.
  - gen 4 *Volley Fire* — +1 in the fire phase.
  - gen 5 *Combined Arms* — +1 in every phase (plus the SPEC §25 march speed
    and wall-breaking artillery).
  Shieldwall and Drill deliberately cancel in equal-generation fights so the
  scripted arcs hold (the first cut lacked Drill, and all-AI Bar Kokhba
  survived Rome — history requires otherwise); the edge appears when one side
  is a generation ahead. The battle window lists each side's doctrines in the
  die tooltip.
- **The land wears its works** (overlay.js): at label zoom every province
  draws a glyph row under its center — a market's gold awning, a granary
  silo, a crenellated tower, a shrine's pediment, an airfield's runway.
  Fleets already ride visibly at their anchors.
- **Air power** (SPEC §29 core): the Airfield building (120t, 10 months)
  gates on military tech 19 — the age of flight, reached only in 1948. Wings
  (`g.airwings`, `raiseAirWing`/`rebaseAirWing`/`sweepAirfields`) cost 40t
  + 1t/month, two per field, park as visible warplanes on the map in the
  owner's color, rebase freely between your own fields (province panel
  buttons), and add +1 to the fire-phase die for friendly battles within
  2 hops (`airCoverFor`; both sides flying cancels). Wings are destroyed on
  the ground when their field falls — the daily sweep checks control — and
  the AI paves a runway at its capital and fills the hangars once tech and
  treasury allow (`aiAirPower`). Upkeep rides the maintenance line;
  formables re-flag their wings; pre-air saves heal to empty skies.

## 30. v3.0: the bomber's moon — raids, and the works made beautiful

- **Bombing raids** (military.js `raidTargets`/`airRaidCore`, action
  `raidProvince`): a rearmed wing can strike any hostile presence within its
  range ring (AIR.rangeHops) — thinning a hostile host (3%, 40–350 men, and
  a −0.35 morale shock), softening walls its side besieges (+4 siege
  progress), or cracking a hostile garrison (−10%). Wings fly with their
  crews aboard — no troops attached, none needed. Each sortie costs
  AIR.raidCdDays (12) of rearming, counted down by the daily sweep. Enemy
  wings based within range of the target scramble: 32% of contested raids
  are driven off, 18% end with the raiding wing shot down (seeded rng).
  The AI flies every rearmed wing at the richest target in reach while at
  war. The province panel's airfield block grows raid buttons (✈ target,
  with what the bombs would do in the tooltip) and a rearming countdown;
  the victim player is told when their men are hit.
- **The raid on the map** (overlay `addRaidFx`, wired to the `airRaid` bus
  event in main.js): a plane in the raider's color sweeps from its field
  through the target and fades on the far side while three staggered bombs
  blossom — flash core, fire ring, climbing smoke — over ~2.4 s. A
  synthesized raid cue (engine drone, falling whistle, three bomb thumps)
  plays when the player's wings fly or the player's ground is hit.
- **The works made beautiful**: the v2.9 structure glyphs were redrawn —
  every building now sits on a soft ground shadow: the market's awning is
  striped gold with a crate set out front, the granary is a shaded silo
  under a straw cone with hoop bands, the walls became a gate tower with an
  arched gate, masonry courses and a shaded flank, the shrine a stepped
  three-column temple with a gilded pediment, and the runway gained
  threshold bars, a dashed centerline and edge lights. The warplane
  silhouette was rebuilt (elliptical fuselage, swept wings, tailplane,
  canopy glint, wing roundels) and is shared by the parked planes and the
  raid animation.

## 31. v3.1: the peace table and the sea — agency, eras afloat, parity aloft

- **The player can always sue for peace.** `offerPeaceDeal` no longer refuses
  scripted (noNegotiation) wars; the peace dialog, war overview, outliner and
  realm panel show the dove on every war. Whether the enemy LISTENS is still
  `evaluatePeaceDeal`'s affair — white peace when even, territory when
  winning, nothing when losing badly ("unless you're severely screwed"). The
  AI keeps its old counsel: it never initiates peace in a scripted war, so
  the all-AI harness arcs are untouched.
- **Scripted concessions stopped gifting Syria.** `endWarBySword` grew an
  `opts.keep(p)` predicate: occupied provinces failing it return to their
  owner instead of transferring (uti possidetis remains the default). The
  167 BCE "Terms from Antioch" is now an EVENT CARD fired once at 50% war
  score, not an auto-verdict: accept and the revolt ends with Judaea keeping
  only the provinces of the faith it holds (the decree's own words — the
  Law, the arms, the hills; Gaza goes home), or refuse (+5 legitimacy, the
  decree is never offered twice) and fight on for the whole inheritance —
  by the sword, at the table, or to the independence of 140 BCE.
- **Hulls speak the age** (`NAVAL_GENS`, same thresholds and power curve as
  the army ladder): Penteconters → Trireme Squadrons → Quinquereme Fleets →
  Dromon Flotillas → Galleon Squadrons → Destroyer Flotillas. New fleets are
  laid down to the builder's current pattern (`fleet.gen`); sea battles
  multiply the broadside by `genMult` (on top of influence tech's
  navalMult); old fleets re-rig at anchor for 4 talents per hull per
  generation (`modernizeFleetCore`, AI included via aiModernize). The
  shipyard button names the pattern it lays down.
- **Admirals & squadron commanders** (50 martial points each, `rollGeneral`
  names and pips): a fleet's admiral adds his seamanship (maneuver) to the
  sea-battle die; a wing's commander sharpens raids (+10% per fire pip) and
  slips interception (per maneuver pip). Hired from the outliner rows.
- **Fleets and wings are first-class in the outliner**: fleets show their
  hull count, pattern, cargo, admiral, embark/disembark/hire/re-rig buttons;
  air wings list by squadron name with base, rearm countdown and commander
  button, and click through to their field. On the map, parked planes carry
  a squadron count like an army banner's; fleets already sail with theirs.
- Save compat: pre-era fleets heal to gen 0 with no admiral.

## 32. v3.2: nothing decides for you — offers everywhere, and the Third House

- **Every warscore auto-verdict became an offer.** The audit after the Terms
  fix (SPEC §31) found five more "it just triggered" endings — 67 BCE "Rome
  Recoils" (+40 vs Rome), 66 CE "Rome Sues for Peace" (+50), 115 CE "The
  Fire Unquenched" (+40), 132 CE "Rome Lets Go" (+50), and 614 CE "The
  Empire Endures" (+35 vs Persia, mid-war). All five now fire ONCE as major
  event cards (flag-guarded in checkVictory, `helpers.fireEvent` — the
  bookmarks' fireEventById machinery exposed as a helper): accept and the
  war ends with the faith-filtered keep (judaism for the Jewish arcs,
  christianity for Heraclius — occupied land outside it returns) plus the
  original win verdict and score; refuse (+5 legitimacy, never offered
  twice) and the war continues. Timed and territorial goals remain campaign
  milestones, but the 132 CE endurance settlement is also an explicit offer:
  reaching January 136 changes no borders and ends no war until the player
  accepts; refusal preserves every occupation. The harness auto-accepts via
  aiOption; its anomaly set is unchanged.
- **The Mount stands bare after 70 CE** (`bookmark.wonderTweaks`): the
  canonical map gives Jerusalem the `temple` wonder (+1 governance point,
  +0.2 legitimacy a month to its keeper) — correct in 66 CE, wrong after
  the fire. The 115, 132, 614 and 1948 bookmarks now start Jerusalem with
  `wonder: null` (the Temple Mount holy site remains).
- **Raise the Third House** (SPEC §32 missions, JUD in 132 CE and 614 CE):
  the final mission of both chains — hold Jerusalem with 500 talents in the
  treasury and stability ≥ +1 — spends 300 talents, grants +20 legitimacy,
  and sets Jerusalem's wonder back to `temple`: the yield returns, and the
  wonder's gold star stands on the map again. Bar Kokhba's coins promised
  the facade; Nehemiah ben Hushiel dreamed the sacrifices resumed.

## 33. v3.3: the playable game — objectives, ultimatums, withdrawal, help

- **Objectives** (`bookmark.objectives[TAG]`, action `getObjectives`): every
  bookmark states its win and loss conditions per playable tag in plain
  lines, shown in a block at the top of the realm panel (Win: green, Lose:
  red). The player no longer discovers the era's victory rules by tripping
  them.
- **Ultimatums** (`sendUltimatum` in ai.js, SPEC §33): losing wars now have
  an exit the ENEMY opens. When the enemy leads a negotiable war at +40,
  every eight months their herald delivers a dynamic event card carrying
  their actual demands (the provinces of ours they control, budgeted by
  their score via peaceDealInfo; reparations at +60): accept and
  executePeaceDeal signs it as written, or send the herald home and fight
  on. Scripted (noNegotiation) wars send no heralds; all-AI wars are
  untouched (the harness holds its set).
- **Withdraw from battle** (`withdrawFromBattle`, action `withdrawBattle`,
  battle-window button): the player's whole side quits the field through
  the rout machinery — shattered (30 days), morale broken to 30%, marching
  for friendly ground — and the enemy keeps the field. The exit that every
  losing battle used to lack.
- **Help (H or ?)**: a one-page primer modal — hotkeys, monarch points,
  missions vs decisions, the peace table, flags-are-doors — plus a pointer
  on the title screen's hint line.
- **The suites live in the repo now** (`tools/tests/`): all 21 headless sim
  suites and 20 Playwright suites, with `run-smoke.sh` / `run-ui.sh`
  runners. Paths are portable: repo root derives from each file's location,
  the playwright install dir comes from `JU_PW_DIR`, screenshots go to
  `JU_OUT`. (A container rollback mid-session briefly lost three
  scratchpad-only suites — never again.)

## 34. v3.4: the realm divided — court factions, and the thin eras made thick

- **Court factions** (`js/sim/factions.js`, monthly via tick's `monthlyFactions`):
  every playable tag carries two-or-three internal parties defined by its
  bookmark (`bookmark.factions[TAG]` — content owns the politics, the engine
  owns the arithmetic). Approval runs 0-100 (seeded at `start`, default 50,
  stored in `t.factions`), drifts monthly — a slow regression to 50 plus the
  faction's own `drift(ctx, t)` closure, clamped to ±1.5 — and answers events
  through `helpers.factionShift(ctx, tag, id, delta)` (a quiet no-op for AI
  realms, unknown ids and eras without factions, so content calls it
  unconditionally). A devoted faction (65+) grants its `boon`, a hostile one
  (35−) exacts its `bane` — both plain tag modifiers (`faction_<id>_boon/_bane`,
  months: 2, refreshed each court session, self-expiring). A faction left at
  40 or under sends a **demand card** every two years (dyn_faction_* — the
  ultimatum machinery, SPEC §33): grant it (pay `demand.grant.cost` — points
  clamp at zero, treasury may go into debt — +12 approval) or refuse (−8).
  The **appeasement lever** (action `appeaseFaction`, realm-panel button)
  pays `appease.cost` in full for +10 approval, once a year per faction.
  PLAYER-ONLY, the ultimatum's rule: an AI-driven player tag (`t.ai`, the
  harness) seats no court, so the anomaly set is untouched. Save compat:
  `t.factions` heals to null and reseeds lazily; pending dyn_* cards drop on
  load as before.
- **Sixteen courts**: era-flavored faction sets for every victory-branch tag —
  Hasideans/Hellenizers/Captains (HAS) and Friends/Phalanx/Cities (SEL) in
  167; Pharisees/Antipater/Priesthood (HYR) and Sadducees/Captains/Priesthood
  (ARI) in 67; kin/Sanhedrin/hired swords (HER) and Priesthood/Parthian
  party/the Street (ATG) in 40; Zealots/Peace Party/Priesthood (JUD) and
  Senate/Legions/People (ROM) in 66, 115 and 132 with era-tuned texts (the
  rising's Host/Elders/Sages in 115, the Prince's Captains/Sages/Villages in
  132); Fighters/Exilarch/Priests (JUD) and Church/Army/Demes (BYZ) in 614;
  Coalition/Revisionists/Kibbutzim (ISR) and Palace/Legion/Tribes (JOR) in
  1948. Scripted events move them: the Altalena and Bernadotte affair swing
  the Revisionists, the Forty-Five breaks or wins the Sanhedrin, the piyyutim
  choose between the Priests and the Exilarch.
- **The Factions block** (nation_panel `refreshFactions`, styles `np-fac-*`):
  name, state word and approval (devoted green / content / hostile red), an
  approval bar, tooltips carrying the boon and bane, and the appeasement
  lever with its cost and cooldown in the tooltip. Self-only — a foreign
  court's politics stay offstage.
- **The thin eras made thick**: 40 BCE grows 10 → 22 events (the cisterns of
  Masada, Labienus Parthicus and the Cilician Gates, Antigonus' double-legend
  coins, the landing at Joppa, Silo's winter, the basket-men at the caves,
  Machaeras, the embrace at Samosata — Sosius' two legions and Antony's war
  chest, Pappus at Isana, the roof at Jericho, and the Forty-Five as the
  reign's first choice); 1948 grows 10 → 22 (Spitfires over Tel Aviv, the
  Old City's fall, Ad Halom, the Latrun assaults, the roads from Lydda,
  MAHAL/GAHAL, Kaukji's pocket, the All-Palestine Government, the secret
  wire to Amman, the Faluja pocket, the Jericho Conference, the ballot under
  fire); 115 CE grows 11 → 19 (the temples burn, the villages take sides,
  Appian's escape, Seleucia/Nisibis broken, the walls of Hatra, Hadrian's
  list, the decrees of mourning); 614 CE grows 11 → 19 (Benjamin of
  Tiberias, the reckoning at Mamilla, Zacharias goes east, the piyyutim,
  the ships for Carthage, the Khagan's bargain, the intercepted letter,
  the plague of Sheroe).
- **Objectives retire with the verdict** (playtest): once `g.result` is set,
  `getObjectives` returns a single settled line (green for the win, red for
  the loss) pointing at the Chronicle — no more live win/loss conditions
  outliving the chapter they decided.
- **A fresh grudge does not white-peace** (playtest): `evaluatePeaceDeal`
  refuses a white peace in a war's first year (`PEACE.freshWarMonths`)
  unless the enemy is actually losing (−10 warscore) or war-weary — no more
  declaring a war, shrugging, and shaking hands a month later. And the 614
  betrayal's defiance now spawns Persia's actual answer: a punitive column
  under Shahin at Damascus.
- **Verified**: smoke18 (the faction engine end-to-end, 35 assertions
  including harness-safety), smoke19 (the deepened chains, the defiance's
  teeth, the fresh-grudge rule, objectives retirement, events moving the
  1948 court), uitest19 (the Factions block renders, the lever pays and
  cools down, foreign courts stay hidden). Harness note: 40 BCE's accepted
  flags drift with Sosius' legions and Herod's customs revenue — HER drops
  off the bleeding list (the coast pays for his armies), ROM returns to it
  (victorious overstretch, the v2.4 class); every other bookmark's set is
  byte-identical.

## 35. v3.5: campaign readability and bookmark power balance

- **Campaign guidance** (`campaign_guidance.js`, action
  `getCampaignGuidance`): all sixteen playable standards have a signature
  system, exactly three concrete opening moves, and a chronological danger
  clock. The nation card joins that guidance to the bookmark's win/loss
  contract before selection; the outliner pins the contract and recomputes the
  next pressure from the live date. BCE arithmetic observes the missing year
  zero.
- **Consequences in the open** (`modals.js`): an event option's tooltip remains
  available to the tooltip system but is also printed beneath the option label,
  for both local and multiplayer-guest event cards. Decisions no longer depend
  on hover or memory.
- **Era-specific establishments** (`maintMult`): army upkeep and the AI's
  affordability ceiling now honor tag modifiers. Religious fervor and hidden
  armories make the 66 and 132 revolt hosts temporarily affordable; Hasmonean
  zeal does the same in 167. Antipater's credit and Roman senatorial credit
  finance the patronage wars of 67 and 40 BCE. In 614, Persian supply trains
  pay for the Return until either answer to the 617 betrayal removes them.
- **Revolt pacing**: the Kitos hosts suffer thirty months of scattered command
  (discipline and reinforcement penalties) while Turbo, Quietus, and the Cyprus
  reduction arrive as credible Roman relief columns. Bar Kokhba receives a
  short prepared-revolt window before the provincial response, while Severus's
  arrival still removes the restraint.
- **The armed armistice, 1949–56**: Rhodes applies five years of restraint in
  place of ahistorical random wars. The 1950 Joint Defence Council makes Egypt,
  Jordan, Syria, Lebanon, Iraq, and Saudi Arabia guarantee one another, with a
  reinforcement penalty for rival commands, and opens threat-driven peacetime
  recruitment bounded by per-state ceilings. The 1955 arms agreement fields
  Egyptian cadres, triggers an Israeli response, and raises the regional force
  calculation by 15%. The eight-year harness ends with no 1948 anomaly and
  materially larger postwar establishments rather than idle treasuries.

## 36. v3.6: the world keeps moving

- **World history is explicit metadata** (`event.world === true`): it uses the
  ordinary deterministic date scheduler, fired-event save state, event modal,
  and multiplayer relay. `nextWorldEvent` exposes the nearest unfired dated
  development; the outliner shows it as a blue world clock beside the local
  campaign pressure. A chapter verdict does not stop either scheduler.
- **Historical inertia, not historical determinism**: background events inspect
  live owners, surviving tags, current wars, and army preparation. They open
  wars, field armies, change rulers and governments, or apply pressure; they do
  not transfer provinces merely because an old atlas says a conquest occurred.
  Parthia's Media and Babylonia events were converted from automatic ownership
  changes to real campaigns.
- **Ancient continuations**: 67 BCE now continues through the First Triumvirate,
  Crassus's Parthian campaign, and Caesar's civil war; 40 BCE continues through
  Antony's eastern campaign, Actium, Alexandria, and Augustus; 115 CE can flow
  into Aelia Capitolina and a state-aware Bar Kokhba second chapter; 132 CE
  reaches the Antonine succession. Nero's death, the Four Emperors, Trajan's
  death, and the existing Roman–Persian turning points are classified as world
  history too.
- **614–651**: the dormant `RSH` tag records the Hijra and Arabian consolidation,
  activates with the Rashidun succession, and sends separate campaigns into
  Iraq and the Levant through the northern Arabian map edge. Yarmouk, Ctesiphon,
  Jerusalem, and the Sasanian horizon check the living map. Victories must still
  be fought; a Persia that survives strongly enough can defy 651.
- **1952–58**: Egypt's Free Officers replace the monarchy, the Baghdad Pact forms
  a rival northern bloc, Suez becomes a conditional live war, Egypt and Syria
  can form the UAR without first destroying Israel, and the Iraqi revolution
  breaks the monarchy's alignment. The older conquest-based UAR decision remains
  available as an alternate-history path.
- **Regression contract** (`smoke20.mjs`): verifies post-verdict scheduling,
  state-aware Parthian and Roman pressure, Rashidun activation and two-front
  campaigns, the no-free-Ctesiphon rule, the 1952 coup, Baghdad Pact, political
  UAR formation, and the Iraqi revolution. The browser suite verifies both local
  and world clocks; multiplayer event cards retain the world-history badge.

## 37. v3.7: demobilization, binding peace, and working harbors

- **Stand armies down** (`disbandArmyCore`, action `disbandArmy`): a confirmed
  outliner action permanently removes a safe army and therefore its monthly
  maintenance. Seventy-five percent of surviving men return to manpower when
  demobilized in owned, controlled territory; disbanding abroad returns none.
  Armies cannot vanish out of battle, rout, or a transport fleet.
- **Peace binds the script** (`event.requiresWar`): dissolving a war records
  each opposing pair in `_settledWars`. Dated and triggered battlefield phases
  declare the live war they require and retire silently after its treaty,
  rather than presenting stale sieges, offensives, or armistices. Political and
  world-history events that do not require the concluded campaign continue.
- **No anachronistic controls**: technology-gated buildings are omitted until
  their requirement is met, so ancient province panels no longer advertise a
  disabled airfield. Coastal-only works are likewise absent inland.
- **Shipyards and merchantmen**: the coastal shipyard costs 90 talents, raises
  local production 15%, and opens five civilian berths. Each 25-talent
  merchantman earns 0.75 trade per month at its home port; occupation, siege,
  or blockade suspends that income. The province panel and outliner expose the
  local and realm-wide merchant marine.
- **Panel fit**: recruitment is a wrapping two-column grid, buttons may break
  their labels, and the province panel clips horizontal overflow. Units remain
  readable without dragging the parchment sideways at narrow desktop and
  handheld widths.
- **Regression contract**: `smoke21.mjs` covers demobilization and manpower
  recovery, treaty-cancelled date/trigger events, technology visibility,
  coastal shipyards, merchant persistence, and trade income. `uitest20.mjs`
  owns panel width, ancient building visibility, merchant commissioning, and
  the confirmed stand-down control.

## 38. v3.8: the open table — the map negotiates

- **The peace card docks left** (`#peace-modal` overrides in styles.css): no
  scrim, `pointer-events: none` on the container, the card at the panel slot
  (12px, 56px) with its own scroll — the map stays fully visible for the
  whole negotiation. The war overview keeps its centered card and scrim;
  the overrides are the peace table's alone.
- **Map clicks negotiate** (`peaceProvToggle` bridge in ui.js): while the
  table is open, clicking a demandable province on the map writes it into
  the deal — the checkbox follows — and clicking it again strikes it from
  the terms. Every other map click is inert (no selections, no panels, no
  battle windows): the envoys have the floor until they are recalled (Esc
  or the button — the scrim click-away is gone with the scrim).
- **The terms read off the map** (`game.ui.peaceSelected`, mapmodes.js):
  provinces on the table keep their gold pulse; the ones already written
  into the deal burn SOLID gold, so the shape of the peace is visible at a
  glance. A hint line under the title teaches the interaction.
- **Verified**: `uitest22.mjs` — the docked card, the missing scrim, the
  map toggle round-trip (checkbox + peaceSelected + cost line), inert
  off-table clicks, and the war overview keeping its scrim.

## 39. v3.9: paused planning, armies muster

- **A pause stops time, not planning**: player actions execute immediately while
  the clock is stopped. Armies can split or merge, movement paths can be laid,
  development and other point purchases update at once, and multiplayer guest
  commands do the same on the host. Successful split, merge and movement orders
  are silent; refused orders may still explain why they failed. Movement,
  construction and production make no temporal progress until the clock resumes.
- **Military units take time**: infantry needs 2 months, cavalry 3, air wings
  4, and warships 6. Money and manpower are committed, displayed, and placed in
  the provincial production line as soon as the order is given—even while
  paused—but the first order's remaining months fall only while time runs.
  Scripted historical spawns remain immediate content effects; ordinary player
  and AI recruitment uses the timed system.
- **One provincial line** (`province.unitQueue`): land, naval, and air orders
  share one FIFO queue per province. Only its first entry counts down each
  month, so repeated purchases cannot all materialize together. Siege or enemy
  occupation stalls the line; ships still require a completed shipyard and
  wings a completed airfield. Queued wings reserve hangar capacity.
- **Visible work**: recruitment buttons state their duration and the province
  panel lists every order, its place, remaining months, and whether it is
  paused, waiting, or stalled. Completion creates the ordinary selectable map
  counter and announces it.
- **Regression contract**: `smoke24.mjs` covers immediate paused splits,
  resource and point commitment, FIFO land/ship/air completion dates, and save
  revival. `uitest23.mjs` covers the same path through real paused clicks and
  the rendered production line; the multiplayer suite proves a guest path is
  accepted while paused but cannot move its army until the host clock resumes.

## 40. v3.10: local revolts, not teleporting armies

- **Revolt defections are local**: an ordinary unrest-generated army joins a
  co-religionist belligerent only when its province shares a land border with
  territory that country owns or controls. Remote diaspora risings remain REB,
  rather than becoming free player armies across the map.
- **The ancient heartland survives occupation**: JUD, HAS and the other ancient
  Judaean successor tags may still receive a rising inside the base map's JUD
  province group even when they have temporarily lost every adjacent holding.
  This is a scenario-specific gameplay region, not a claim about modern borders.
- **Scripted history is unchanged**: named event reinforcements still arrive at
  the locations and dates stated on their event cards.
- **Regression contract**: `smoke25.mjs` proves that a distant Leontopolis
  revolt stays REB, border-adjacent Jamnia joins JUD, and occupied Jerusalem may
  still join HAS through the ancient-heartland exception.

## 41. v4.0: land before provinces

- **The map can grow**: province seeds live in a float texture instead of the
  old 128-entry uniform array. IDs use two texture channels and a `Uint16Array`,
  with a deliberate 512-cell renderer cap. IDs above 255 survive rendering,
  geometry, lookup and map hit-testing.
- **Land state is explicit**: habitation (`uninhabited`, `frontier`, `rural`,
  `town`, `urban`), sovereign owner, terrain, current passability and future
  settleability are separate fields. The terrain named wasteland no longer
  silently dictates all of them.
- **Empty land can lie inside a state**: political mode colors a cell by its
  sovereign owner even while an uninhabited cross-hatch remains. Truly unowned
  cells retain the WASTE color. The five existing deserts remain explicitly
  impassable, preserving every bookmark's current pathing and balance. In 1948,
  those cells belong to Syria, Saudi Arabia and Egypt, so the modern sovereign
  border includes its empty interior without turning it into productive land.
- **Bookmarks and saves survive**: static null habitation is inferred from the
  bookmark's era-specific development, so modern cities become urban without
  changing their permanent map key. Old saves reconstruct habitation and
  settleability on revival.
- **Foundation, not the settlement action**: this version establishes permanent
  land-state semantics and scalable IDs. Later versions may add latent cells,
  claims, surveys, settlements and administrative province regrouping without
  redefining ownership or terrain.
- **Regression contract**: `smoke26.mjs` covers tier inference, old-save revival,
  and sovereign-owned empty land. `uitest24.mjs` renders and hit-tests 260
  synthetic provinces, proving the high-byte ID path in a real browser.

## 42. v4.1: bookmark administrative geography — the modern south Levant

- **One raster, era-specific provinces**: a permanent land cell may be an
  invisible subdivision of an older province in one bookmark and an independent,
  playable province in another — same pixels, same stable ID, same save key. A
  cell carries a `latentParent` (a canonical province name); `js/data/map_profile.js`
  `buildProvinceMapping(MAP_DATA, bookmark)` resolves each cell to the province
  it belongs to in that era, collapsing latent cells into their parent unless the
  bookmark lists them in `activeProvinces`. The mapping resolves parent chains
  once and guards against cycles.
- **The map remaps in the shader, not the data**: the renderer uploads the
  mapping as a `uProvinceMap` lookup texture and the ID shader resolves every
  raster pixel (`cellIdAt` → `provinceOf` → `idAt`); `provIdAt` and
  `setProvinceMapping` mirror it on the CPU for hit-testing. `computeGeometry`
  takes the mapping so a collapsed cell's pixels, adjacency, coast and centroid
  fold into its parent and draw no internal border, while an activated cell gains
  its own area and movement node. `main.js` rebuilds the mapping, geometry, and
  renderer texture whenever a bookmark's active set changes.
- **21 modern cells in the southern Levant**: appended after the original theater
  (so old save IDs never shift), the 1948 bookmark activates Safed, Nahariya,
  Afula, Hadera, Netanya, Herzliya, Kfar Saba, Rishon LeZion, Rehovot, Modi'in
  Hills, Jenin, Tulkarm, Qalqilya, Ramallah, Bethlehem, Beit Shemesh, Kiryat
  Gat, Beersheba, Arad, Khan Yunis and Rafah as independent provinces with their
  own borders, clicks, labels, ownership (Israel, the West Bank, Gaza), and
  victory-count land. In every earlier bookmark those pixels resolve to their
  ancient parents (Gischala, Ptolemais, Caesarea, Joppa, Jamnia, Sebaste, Gaza…).
- **Subdivision, not new wealth**: `bookmark.devTweaks` redistributes each parent
  province's old development across its active children instead of duplicating
  regional income; `mapProfileMigration` (with `game.mapProfileVersion`) upgrades
  a pre-expansion save once, preserving any player-added development above the
  old coarse baseline and refreshing display names so a stale Gischala-as-Safed
  alias is dropped. Cities not yet founded in May 1948 (Modi'in Hills, Beit
  Shemesh, Kiryat Gat, Arad) start as sovereign `frontier` land rather than being
  back-filled. `reconcileGameProvinces` nulls latent cells and builds active ones
  on load; `makeProvinceState` (shared by init and reconcile) reads bookmark
  fields with latent-parent inheritance.
- **Regression contract**: `smoke27.mjs` covers profile mapping, collapsed vs
  activated geometry on a synthetic map, the redistributed 1948 development
  totals, separately-addressable Safed/Jish, and pre-expansion save
  reconciliation. `uitest25.mjs` proves all 21 modern cells own pixels, geometry
  and click IDs in a real browser, and that the same raw Safed pixel clicks
  through to Gischala in 66 CE.

## 43. v4.2: settle the land — the habitation ladder becomes playable

- **A settlement project**: `actions.settleProvince(provId)` raises a settleable
  province one habitation tier — clearing empty land into a `frontier`, growing a
  `frontier` into `rural`, a `rural` into a `town`. It spends influence
  (`DEFINES.SETTLEMENT.baseCost + perTier × target level`), runs for
  `SETTLEMENT.months`, applies a temporary "Newcomers Settling" unrest modifier,
  and on completion grants `SETTLEMENT.devReward` development. Only prosperity
  (yearly growth and `develop`) ever reaches `urban`; a project caps at `town`
  (`SETTLEMENT.maxTier`).
- **The empty-land loop closes**: uninhabited land could never be developed
  (economy gates it). Settling it to `frontier` makes it developable at last, so
  the land-state tiers introduced in v4.0 now drive a real decision: found on the
  frontier, then grow what you founded.
- **Honest gating and honest voiding**: `settlementInfo` refuses unsettleable
  land, impassable waste, foreign or occupied provinces, besieged provinces, a
  province already at the cap, a second concurrent project, and insufficient
  influence — each with its own reason. `monthlySettlement` (in the monthly tick,
  after construction) voids a project if the province is lost, occupied, changes
  owner, or turns impassable/unsettleable mid-work, exactly like conversion.
  `province.settlement` is `{by, monthsLeft, toTier}`, saved as plain data and
  defaulted to `null` on revival of pre-settlement saves.
- **In the panel**: the province's Integration block gains a "Settle the Land"
  control that states its cost and target tier, disables with the blocking reason
  when it cannot run, and gives way to a "Settlers arriving — N months" progress
  row while a project is under way.
- **Regression contract**: `smoke28.mjs` covers cost, a project running to
  completion with its tier rise and development reward, empty land becoming
  developable, the town cap, and refusal of foreign land, impassable waste, and
  unsettleable cells, plus occupation voiding and save revival. `uitest26.mjs`
  drives the panel control in a real browser: the offered, enabled button, its
  tier tooltip, the spent influence, and the progress row that replaces it.

## 44. v4.3: wasteland does not exist in 1948

- **The interiors open**: by May 1948 the five great deserts — Sinai Interior,
  Eastern Desert, Libyan Desert (Egypt), Arabian Desert (Saudi Arabia), Syrian
  Desert (Syria) — are administered sovereign territory with motor roads,
  pipelines and garrisons, not the trackless waste of antiquity. Egypt attacked
  *through* the Sinai and Operation Horev crossed back into it. The 1948
  bookmark overrides them to `impassable: false` and `habitation: 'frontier'`
  via the era-override tables `makeProvinceState` already reads (SPEC §42), so
  nothing on the 1948 map is unowned, impassable, or uninhabited — nothing
  hatches; every cell wears its sovereign's color.
- **Passable is not comfortable**: the cells keep their `wasteland` terrain,
  whose 2.5× movement cost and 5%/month attrition make deep-desert campaigns
  possible but punishing — a road, not a highway. Being frontier land, they are
  live settlement-project targets (SPEC §43): Egypt may settle the Sinai.
- **Ancient eras keep their walls**: every earlier bookmark leaves the deserts
  unowned (`WASTE`), impassable, and uninhabited — pathing and balance in the
  other seven bookmarks are untouched.
- **Old saves lift the wall**: `reconcileGameProvinces` now refreshes
  `p.impassable` from era data on every load (nothing mutates passability in
  play, so this is safe), and lifts an `uninhabited` habitation to the
  bookmark's override — while a tier the player *earned* (settlement, growth)
  is never clobbered.
- **Regression contract**: `smoke29.mjs` proves the 1948 map holds no unowned,
  impassable, or uninhabited cell; the Sinai bridges Egypt proper and the
  Negev on the real geometry snapshot; wasteland terrain still punishes the
  crossing; Egypt can settle the interior; 66 CE keeps its walls; and an old
  1948 save opens on load without losing an earned tier. `smoke26.mjs` pins
  the updated 1948 contract (open frontier, no hatch), and `smoke27.mjs`
  carries the desert development into Egypt's counted total.

## 45. v4.4: from Dan to Eilat — the Negev on the map

- **Four new permanent cells** complete the modern Israeli south: **Dimona**
  (parent Oboda), **Mitzpe Ramon** (parent Oboda), **Paran** (parent Aila) and
  **Eilat** (parent Aila) — appended after the existing cells so no save ID
  shifts, latent in every ancient bookmark (folding into the Nabataean Negev,
  never into waste), active in 1948. With them the armistice shape of Israel
  is actually formable: the map now carries the whole Negev triangle down to
  the Red Sea.
- **The 1948 south has claimants**: Egypt's deep-Negev claim (the Auja axis)
  holds Mitzpe Ramon and Dimona; Transjordan patrols the Arabah from Aqaba —
  Paran and Eilat. All four start as sovereign frontier (their towns are
  post-war foundations), so they are settlement-project targets after
  conquest.
- **The Uvda route is real**: on the regenerated raster, Eilat borders Paran —
  Israel can march Beersheba → the highlands → the Arabah → Eilat without
  taking Jordanian Aqaba, exactly as Operation Uvda did in March 1949. Eilat
  still faces Aila across the head of the gulf.
- **The greater verdict is honest at last**: "From Dan to Eilat" now requires
  *holding Eilat* (and Jerusalem, and 25+ provinces). Without the south the
  same position ends in "Independence" — the armistice, not the modern
  borders. The ISR objective text names the requirement.
- **Tooling**: `tools/geom-snapshot.json` is regenerated at full resolution
  (from a 1948 boot, where every latent cell is active — it had been stale
  since before v4.1, missing all modern cells) and `tools/autorun.mjs` now
  folds it per bookmark through `buildProvinceMapping`, mirroring what
  `computeGeometry` does from the live raster; the balance harness therefore
  exercises real modern-cell adjacency for the first time.
- **Regression contract**: `smoke30.mjs` proves the four cells' 1948 owners
  and tiers, the Uvda adjacency chain on the real snapshot (including that
  Eilat is coastal and meets Egyptian Sinai at the border), the ancient
  collapse into Oboda/Aila, and — end to end through `checkVictory` — that
  a Jerusalem-holding position without Eilat earns only "Independence"
  while adding the Negev and Eilat earns "From Dan to Eilat".

## 46. v4.5: the neighbors' modern shapes — the Levant borders drawn true

- **Three more latent cells** finish the theater's modern political geography:
  **Kiryat Shmona** (parent Caesarea Philippi) — Israel's Galilee panhandle,
  Hula marsh under Banias' ancient shadow, so the Syrian brigade at Banias
  invades across a real border instead of owning the panhandle; **Azraq**
  (parent Bostra) — Jordan's eastern Badia, bordering Saudi Dumatha along
  Wadi Sirhan, so the kingdom has its true desert east; **Rutba** (parent
  Syrian Desert) — Iraq's western desert from the Syrian border to the
  Euphrates approaches (Dura-Europos, Hatra, Nehardea, Babylon), so the
  Syrian Desert cell stops standing in for Iraqi Anbar. All three collapse
  latent in every ancient era; Azraq's pixels fold into Nabataean Bostra
  (the real Wadi Sirhan caravan range), Rutba's into the waste.
- **Two owner corrections** on existing cells: **Chalcis** is the Beqaa —
  era-named **Zahle** and Lebanese (Greater Lebanon's 1920 line put the
  valley in the republic), no longer a Syrian "Zabadani"; **Nisibis** is
  era-named Qamishli and passes from Iraq to **Syria** — the Jazira corner.
- **Fronts are not border errors**: Gischala (Jish) stays Lebanese-held —
  the central Galilee pocket really was Arab-held in May 1948, and the ISR
  mission (Operations Dekel and Hiram) exists to take it. Starting owners
  are the de facto lines of 15 May; the modern borders are what you *make*.
- **Thresholds track the new start**: Israel begins with 24 provinces (the
  panhandle joins the roster), so the greater verdict asks 26+ (with
  Jerusalem and Eilat) and the armistice 21+ — the same margins as before.
- **Regression contract**: `smoke27.mjs` counts all 28 modern cells and the
  redistributed development (ISR 205, JOR 170, EGY 189); `uitest25.mjs`
  renders, hit-tests and click-resolves all 28 in a real browser.

## 47. v4.6: every era wears its true map

- **A second profile lever**: alongside `bookmark.activeProvinces` (latent
  cells that become real provinces), `buildProvinceMapping` now honors
  `bookmark.mergeProvinces` — base cells that do NOT exist in that era fold
  into a named neighbor (`{'Masada': 'Engaddi'}`). Pixels, clicks, adjacency,
  labels and campaign state all follow: the era simply has no such province.
  Chain resolution handles merge→latent chains; `main.js` keys its profile
  cache on both levers so eras with identical activations but different
  merges never share a mapping.
- **The fortresses obey their construction dates**: in 167 BCE Masada and
  Machaerus are not yet built (Jannaeus raises them decades later) — their
  crags belong to Engaddi and Medaba. They stand from 67 BCE through 66 CE.
  After the Great Revolt razes Jotapata, Gamala, Machaerus and Masada
  (67–74 CE), the 115, 132 and 614 bookmarks fold them into Sepphoris,
  Batanea, Medaba and Engaddi — the razed fortress-towns never return.
- **History demands its villages**: 167 BCE activates the Modi'in cell as
  **Modi'in**, the village where the revolt began — it inherits Hasmonean
  ownership through its Lydda parent (the toparchy that held Modi'in,
  1 Macc 11:34), and Eleazar's band ("Men of Modein",
  3 inf) now musters at home; the third rebel province widened the front, so
  the band grew to match (all-AI HAS survives across seeds, still the
  bleeding underdog, never a snowball). 132 CE activates Beit Shemesh as
  **Betar**, Judean — the fortress village of the revolt's last stand.
  Districts persist even when their central town is unfounded: pre-20 CE
  eras keep the lakeshore as **Rakkath**, they do not erase it.
- **Regression contract**: `smoke31.mjs` pins every era's fortress dates,
  Modi'in's rebel ownership, Betar's Judean stand, Rakkath's survival, and —
  for all eight bookmarks — that every owners-table key names a real map
  cell. The autorun harness folds each era's mapping automatically.

## 48. v4.7: the music of the ages — lyre, klezmer, hora

- **Each age sings its own Jewish music**, chosen by bookmark (year-based
  fallback for saves without one). Still zero assets — everything is
  synthesized in the Web Audio ensemble of §27, which gains per-style beat
  tempos, an optional vibrato LFO on `musTone`, and a third mode:
  **Mi Sheberakh** (Ukrainian Dorian, the raised-4th klezmer mode) joins
  Dorian and Freygish (Ahava Rabbah).
- **The lyre age** (167 BCE, 67 BCE, 40 BCE, 66 CE): the kinnor court — the
  existing plucked random-walk melody, wandering ney phrases, and a frame
  drum that wakes in wartime. Peace speaks Dorian, war Freygish.
- **The klezmer age** (115, 132, 614 CE): a reedy clarinet (filtered square
  with vibrato) carries ornamented phrases — a grace note leaning in from
  above, a sobbing krekhts fall with a breath of noise at phrase ends —
  over an oom-pah bass (root/fifth on the beat, chord stabs off it). Peace
  speaks Mi Sheberakh, war Freygish; the drone thins to make room.
- **The hora age** (1948): peacetime alternates sets — sixteen bars of
  **Hava Nagila** (the traditional nigun is public domain; encoded as
  freygish degrees on an eighth-note grid in `HORA_TUNE`, with bass and
  offbeat claps), then sixteen bars of an **original** laid-back Tel Aviv
  groove (a I–bVII–IV vamp, backbeat, minor-pentatonic lead) in the spirit
  of 70s Israeli rock. No copyrighted melody is quoted — Kaveret's Golyat
  stays on the record shelf where it belongs. War keeps the tune under a
  military snare; battle thins the melody and hardens the kit.
- **Regression contract**: `uitest27.mjs` boots three chapters and proves
  each plays its style with notes actually scheduled (`music.state()` now
  reports `style`); `uitest14.mjs` — the §27 contract (gesture start, mood
  machine, toggle persistence) — passes unchanged.

## 49. v5.0: the wider world — the frame grows all around

- **The frame expands** from 29–50°E × 25.5–38.5°N to **21–53.5°E ×
  23.5–38.5°N** (raster 2048×1496 → 3168×1728 at unchanged density). New
  coastlines: Ionia and Caria, the Cyrenaican shoulder, both Red Sea shores
  south past Berenice and Yanbu, the Qatar thumb and the Trucial coast, the
  Persis shore — plus three new landmasses (a simplified Greece, Crete,
  Rhodes) beside Cyprus. Five new height primitives (Jebel Akhdar, Taygetus,
  the Cretan spine, the southern Hejaz escarpment, Zagros-into-Persis);
  the renderer's primitive cap rises 24 → 32.
- **Sixteen new permanent cells**: Corinth, Athens, Sparta, Gortyn (Crete),
  Rhodes, Halicarnassus, Cyrene, Marmarica, Paraetonium, Syene, Berenice,
  Yathrib, Khaybar, Persepolis, Gabae, Gerrha — appended so no save ID
  shifts. Berenice's seed also stops Hegra's voronoi bleeding across the
  Red Sea; a severLink keeps armies from walking the Rhodes strait.
- **A new tag**: **GRC** — the leagues and cities of Hellas in 167 BCE,
  the neutral Kingdom of Greece in 1948 (Rhodes is Greek since 1947;
  Cyrenaica is the British Military Administration, so UK holds Derna and
  Tobruk). Rome holds the west from 67 BCE; Byzantium in 614.
- **The Kitos War gets its first theater**: a new 115 CE event — *The Fire
  in the Pentapolis* — raises Cyrene for Judaea under Lukuas in June 115,
  with unrest rolling east through Marmarica and Paraetonium; the existing
  *King Out of Cyrene* event then marches him into Egypt over a land route
  that now actually exists (Cyrene → Marmarica → Paraetonium → Alexandria).
- **The Caliphate rises from its true home**: Yathrib and Khaybar start the
  614 chapter owned by the dormant RSH tag — quiet neutral oases — and the
  Hijra awakening now stages at Yathrib itself (Medina), converting it;
  Khaybar keeps its Jewish farmers, per the 614 religion overlay. The old
  Tayma bridge survives only for saves from the smaller map. In 1948 the
  Hejaz is Saudi (Yathrib wears the name Medina) and Iran holds Shiraz and
  Isfahan (Persepolis and Gabae).
- **Khaybar's base religion stays pagan-Arab**: a base-map `judaism` would
  hand ancient Judaea a standing holy casus belli against Nabataea that the
  ancient chapters never intended; the Jewish Khaybar of the sources enters
  with the 614 overlay.
- **Balance holds**: the 8-year all-AI autorun on the expanded map shows
  exactly the documented accepted flags — no era destabilizes. Rome's 66 CE
  ledger row grows to 66 provinces (`smoke3.mjs`); Egypt's 1948 development
  total to 207 (`smoke27.mjs`). The geometry snapshot is regenerated at the
  new resolution.

## 50. v5.1: the Kitos War retires from the carousel

- **The 115 CE chapter is no longer a playable era.** It was always the odd
  chapter out: a diaspora revolt — Cyrene, Cyprus, Egypt, Mesopotamia — that
  barely touched Judaea proper, wearing a "Judaea vs Rome" frame it never
  quite fit. `bookmark_115ce.js` and `events_115ce.js` are deleted (git
  history keeps them); the title carousel, the autorun harness, the music
  style map, the Kingdom of Israel formable, and the campaign guidance all
  drop the era. Seven chapters remain.
- **The map keeps everything the era taught it**: Cyrene, Marmarica and the
  western-desert route stay (they serve 67 BCE through 614 as Roman and
  Byzantine land, and 1948 as British Cyrenaica); the razed-fortress merges
  and every other v4.6 profile survive in the remaining eras.
- **Old 115 saves fail soft**: `readNewestSave` iterates the live bookmark
  list, so an orphaned Kitos save is simply never offered.
- **Tests follow**: the multi-era engine suites (`smoke16-19`, `smoke23`,
  `smoke31`) drop their 115 fixture rows; `uitest9` keeps its 614/1948
  sections; the carousel dot indices shift down in `uitest23/25/26/27`
  (1948 is dot 6, Bar Kokhba dot 4); `uitest3`'s roster table loses a row,
  and the card-count assertions in `uitest2/3` read seven.

## 51. v5.2: the score sweeps — chords, refrains, warm ensemble

- **The complaint**: the original drone score was atmospheric but sad,
  even a little creepy; the v4.7 klezmer and hora leads (squares, krekhts
  sobs, a looping tune) grated. The reference the score now chases is the
  EU4 songbook — sweeping, inspiring, intense, with occasional refrains on
  quieter stretches.
- **Harmony instead of a drone**: the pad is three persistent voices
  (root, fifth, third) that glide between chords of a slow progression —
  one chord per two bars. Peace strides **I–bVII–IV–I** in **Adonai
  Malakh** (the majestic synagogue mode — major with a flat seventh, so
  the Jewish identity survives the brightening); war marches
  **i–bVI–bVII–i** in Freygish; battle surges on the phrygian second.
- **A recurring refrain**: a rising heroic theme (arpeggio sweep, settling
  answer, high close) returns every so often — rarely in peace, insistently
  in war, fortissimo in battle. In 1948 the refrain alternates with one
  pass of **Hava Nagila** — the nigun returns as an event, not a loop.
- **Warm voices, no wailing**: the lead is per-age — kinnor plucks doubled
  by a soft horn, a gently breathing reed for the middle chapters, a
  detuned horn ensemble for 1948. No square waves, no krekhts, no oom-pah.
  Between refrains, harp arpeggios on the chord tones carry the quiet
  stretches; a low root pulse and the era's drums swell with the mood.
- **The contract holds**: `music.state()` still reports the style names,
  `uitest14` (gesture start, mood machine, toggle persistence) and
  `uitest27` (each chapter plays its style, notes actually scheduled) pass
  unchanged.

## 52. v5.3: every age by its own rules — era gates, oil, and honest books

The old-timey remnants stop leaking forward (and the modern ones stop
leaking back): mechanics, buildings, background events and the price of a
standing army now all know what year it is.

- **The first mechanics gate** (`bookmark.mechanics`, `mechanicOn(ctx, key)`
  in military.js): a bookmark may declare a whole mechanic off —
  `mechanics: { conversion: false }` in 1948 retires the Convert Faith
  action. `getIntegration` reports `showConvert` and the province panel
  drops the control entirely (absent, not greyed); `convertProvince` and the
  AI's monthly missionary pass honor the same helper. Everything unnamed
  stays on, so every other bookmark and every old save is untouched. No
  modern republic re-faiths a district by decree; integration in 1948 is
  schools, land and votes.
- **Buildings wear the face of their age** (`BUILDINGS.*.modern`,
  `buildingFace(def, marTech)`): at/after `modern.tech` (military) the same
  key keeps its cost, effects, glyph and save identity but changes its
  name, description and build time. Walls become the **Fortified Line**
  (trenches, pillboxes, wire — 12 months instead of 18), the shrine a
  **House of Worship**. Build menu, construction row, refusal messages and
  completion toasts all speak through the face; nobody rings a 1948 town
  with curtain walls.
- **The era-windowed murmur** (`event.minYear` / `event.maxYear`, honored in
  `canFire`): the generic pool splits into ten antique events
  (`maxYear: 1799` — comets read by astrologers, caravan tolls, pestilence
  and burial societies, Greco-Roman games) and ten modern twins
  (`minYear: 1900`) that speak the same mechanics in the language of 1948:
  **Epidemic** in the crowded quarters, **Incident on the Line**,
  **General Strike**, **A Line of Credit**, **The Reservoirs Fall**,
  **A Record Season**, an officer with a staff-college record whose name
  pool follows the player's culture, holy places drawing charter ships, and
  **The Concession Money** for oil states. Embezzlement and creditors stay
  timeless because their vices are. BCE years are negative, so the window
  arithmetic needs no special casing; `smoke32` proves both directions.
- **Oil** (`GOODS.oil`, `bookmark.goods` overlay, `DEFINES.FUEL`): a new
  bookmark lever re-goods provinces per era — no base-map cell carries oil,
  and 1948 assigns it to Kirkuk (Arbela), Khuzestan (Susa) and al-Hasa
  (Gerrha), at the priciest tier in the game (5.5). Gen-5 regiments and
  every air wing pay a monthly **fuel line** (`fuelExpense`): 0.2/regiment
  and 0.5/wing, **doubled** for a realm that controls no oil province —
  Israel imports; Iraq pumps. Oil-fired hulls bunker at 1.5× ship upkeep
  (`monthlyNavy`). The ancient chapters never reach the fuel generation, so
  the line is structurally zero there. The AI's affordability governor
  budgets for the dear case before it drills regiments it cannot fuel.
- **Upkeep grows with the age** (`UNIT_GENS[].upkeep`, `genUpkeepMult`):
  maintenance per regiment scales with the pattern the army was raised to —
  1.0 for Tribal Levies through 2.4 for Rifle Brigades / Armored Corps. An
  armored corps devours pay, parts and shells; 1948 no longer bills its
  establishment like 167 BCE. Armies remember their pattern, so a stale
  legion is cheap until modernized.
- **Administration: the books finally scale** (`BASE.adminPerDev` 0.03,
  `BASE.adminFreeDev` 40, `adminExpense`): every owned-AND-controlled dev
  point beyond the free allowance bills the treasury monthly. Small realms
  pay nothing; a snowballing empire pays for the bureaucracy that counts
  its new rolls (Rome's 66 CE ledger: ~20/month), and January's growth
  ratchet now raises costs alongside income. Occupied land drops off the
  bill — income already stops there, and billing it anyway made occupation
  a debt ratchet. `adminMult` joins `maintMult` as an era-financing lever:
  the 40 BCE Parthian favor and senatorial credit carry the client kings'
  clerks through their scripted death-war, keeping the accepted anomaly set
  intact (40 BCE actually comes up clean now, and both 67 BCE brothers sit
  off the bleeding line).
- **The ledger tells the truth**: `incomeBreakdown` carries `fuel` and
  `admin` fields, `explainIncome` prints Fuel and Administration rows, and
  `t.expenses` folds both in — the AI's debt-shedding reads the same
  number the player does.
- **Regression contract**: `smoke32.mjs` — the conversion gate both ways,
  building faces both ways, the 10/10/2 event-pool split with certain-fire
  probes in both eras, pattern-scaled maintenance, the import-vs-domestic
  fuel line, destroyer bunkerage, and administration (including the
  occupied-land exemption). The full battery and the 8-year all-AI autorun
  pass with the anomaly set a strict subset of the pre-change baseline.

## 53. v5.4: from Rome to the Caspian — the frame grows west and north

The 1948 request was "the whole world"; the renderer's answer is "as much
world as one raster can carry." A full globe needs ~35,000px of texture at
playable density (or a tiled/multi-resolution renderer) — that rewrite is
the staged path beyond this release. What ships is the maximum the current
architecture supports, and it changes every chapter.

- **The frame expands** from 21–53.5°E × 23.5–38.5°N to **12–53.5°E ×
  23.5–42.5°N** (raster 3168×1728 → 4046×2189 at unchanged density —
  deliberately under the common 4096 MAX_TEXTURE_SIZE floor). New coasts:
  the Italian peninsula and Sicily (the Messina, Otranto and Bosporus
  crossings are seaLink ferries over real water), the Gulf of Sirte and
  Tripolitania, the whole southern Balkans with Chalkidiki and the
  Gallipoli peninsula, the Sea of Marmara with both straits, the Black Sea
  south and east coasts, the Caucasus rim, and the Caspian corner with its
  Hyrcanian shore. Lakes Van and Urmia become whole; Lake Tatta (Tuz)
  joins. New rivers: Halys, Tiber, Axios; the Euphrates and Tigris grow
  their Armenian headwaters. Six new height primitives (Apennines, Etna,
  Pindus, Pontic Alps, Great Caucasus, Alborz) fill the renderer's cap at
  exactly 32. The camera's MIN_ZOOM drops 0.35 → 0.22 so a laptop still
  frames the whole stage.
- **Twenty-three new permanent cells** (appended; no save ID shifts):
  Roma, Capua, Tarentum, Brundisium, Rhegium; Panormus, Syracusae; Oea,
  Leptis Magna, Macomades; Dyrrhachium, Thessalonica, Hadrianopolis
  (name-anachronism pinned, the Neapolis class), Byzantion; Nicaea,
  Smyrna, Ancyra, Sinope, Trapezus; Phasis, Caucasian Albania, Hyrcania;
  and the Sahara waste that keeps Tripolitania's voronoi off the deep
  desert. 171 cells total (cap 512).
- **Two new tags.** **PNT — Pontus** (wary, spent: aggression 0.7): the
  Black Sea kingdom under Pharnaces' heirs in 167, and Mithridates VI
  restored at Zela in 67, holding Sinope, Trapezus and Colchis while
  Pompey gathers. **ITA — Italy** (1948): the neutral republic reborn from
  the war, seven provinces from Rome to Syracuse.
- **Rome enters 167 BCE**: the year after Pydna, Italy, Sicily,
  Tripolitania and Illyria are the Republic's — its shadow now lies ON the
  map (the 8-year all-AI run shows Rome banking quietly and starting no
  wars: Popillius' circle stays diplomacy). Hellas keeps the Aegean north;
  every later ancient chapter inherits the Roman west from the base map.
  614 hands the west to the Exarchate's Byzantium — and **Constantinople
  itself finally stands on the map** (Byzantion, BYZ, fort 2), with the
  Sasanian Caucasus and Hyrcania across the board.
- **1948 wears its true north and west**: Italy neutral; Turkey in its
  real shape (Edirne, Istanbul, Bursa, İzmir, Ankara, Sinop, Trabzon);
  Salonika Greek; Tripolitania joins Cyrenaica under the British Military
  Administration; Mazandaran Iranian. **The sealed borders**: Hoxha's
  Albania and the Soviet Caucasus (Dyrrhachium, Phasis, Caucasian Albania)
  are closed frontiers — WASTE-owned and impassable by bookmark overlay, a
  deliberate carve-out from the v4.3 "no wasteland in 1948" rule, which
  now applies to the playable theater (smoke29 pins both halves).
- **Balance holds**: the geometry snapshot is regenerated at the new
  resolution; the full smoke battery passes; the 8-year all-AI autorun
  shows the accepted set (tools/README) — 40 BCE and 66 CE run clean, 167
  gains no new flag with two new great powers on the map, 1948 runs clean
  with twelve tags. Rome's 66 CE ledger row grows 66 → 86 provinces
  (smoke3); 132's rump-Judaea debt returns to its long-documented class;
  614's Return keeps its Persian-tide snowball with a self-limiting
  post-subsidy bleed (Persian supply trains now carry adminMult 0.5).

## 54. v5.5: the map as bombsight, the glasses on every banner

- **Click-to-raid** (`ui.js` bombsight interception, overlay range ring):
  selecting a wing turns the map into a bombsight. A dashed ring shows its
  reach (grey while rearming), red reticles mark provinces holding hostile
  hosts or garrisons, and clicking a legal target — the province or an
  enemy banner on it — flies the sortie via the same `raidProvince` action
  the panel buttons use. The wing stays selected for the next sortie; the
  sim revalidates every click (`getWingRaidTargets` feeds legality).
- **The unit inspector** (`getUnitDetails`, `#inspect-modal`): clicking ANY
  banner, sail, or parked wing — friend or foe — opens the field-glasses
  card: composition in era pattern names, strength, morale bar, the
  general's pips, battle/retreat state. Foreign fleets and wings became
  hit-testable; ui.js decides select (own) vs inspect (foreign). Escape
  and scrim close it.
- **Warships wear their age** (`drawWarshipGlyph`): a ram-bowed oared
  galley for the ancient patterns, a tall-rigged two-master for sail, a
  grey destroyer with funnel, gun and stern pennant for the oil age — and
  the **merchant marine now rides visibly at its harbors** as small
  neutral tubs (round hull, working canvas, no banner), unmistakably not
  ships of the line.
- **Regression contract**: `smoke33.mjs` (inspector shapes for any
  ownership, bombsight legality and range) and `uitest28.mjs` (real
  Chromium clicks: inspector open/close, banner-click sortie flies and
  rearms, ship render staging, zero page errors).

## 55. v5.6: the powers beyond the map

The frame can only grow so far (SPEC §53) — but the world's weight can still
press on it. Off-map great powers are diplomatic entities, not tags: no
provinces, no armies, unkillable — a STANDING (0–100) with every court,
courting envoys, and asks that standing unlocks.

- **The engine** (`js/data/powers.js`, `js/sim/powers.js`): per-bookmark
  power definitions; state in `game.powers` (saves carry it free; reviveGame
  backfills). Courting costs influence on a cooldown (reusing the
  diploCooldowns book with `P:` keys) and may chill a rival's standing —
  the Cold War is a seesaw. Asks gate on standing, war state, a patron
  power's standing (`needsPower`), tag allowlists, and costs; their effects
  are ordinary adjustments and timed tag modifiers, so every downstream
  system already understands them. Standings drift one point a month back
  toward the era's baseline: friendship with the great must be tended.
- **1948**: the **United States** (credits and recognition — no arms; the
  Neutrality Act embargo IS its ask list), the **Soviet Union** (whose nod
  opens Prague), **Czechoslovakia** (the arms deal: hard currency for
  rifles, discipline and reinforcement — requires Moscow's standing),
  **France** (the quiet quays), and the **United Nations** (a wartime
  appeal steadies legitimacy and calms the streets). Courting Washington
  chills Moscow and vice versa.
- **614**: the **Western Khaganate** (Heraclius' Türk alliance: a wartime
  host for gold) and the **Avar Khaganate** (Byzantium buys its rear;
  Persia aims the horde west).
- **167/66/132**: the **Diaspora** — the communities of Alexandria,
  Babylon and Cyrene send silver and volunteers, but only to the House
  they love (asks are gated to the Jewish tags; Rome can court their
  goodwill, not their sons).
- **UI**: the nation panel grows "The Powers Beyond the Map" — standing
  bars, an Envoy button, and ask buttons with full terms in the tooltips.
  Player's own realm only.
- **Regression contract**: `smoke34.mjs` — roster per era, courting gain
  and rival chill, cooldowns, ask gates (standing / patron / war / funds),
  the Prague chain, Diaspora tag-gating, drift both directions, and the
  pre-powers save backfill.

## 56. v5.7: who actually lives here — population and integration

Faith and culture stop being map paint: a province carries its PEOPLE.

- **The makeup** (`js/sim/population.js`, `p.pop = [{r, c, n}]`): seeded at
  creation from development (`POP_PER_DEV` 2,500 × the bookmark's
  `popMult` — 2.5 for the crowded 20th century, 0.8 for 614, 1.0 for the
  ancient chapters) through a bookmark `pops` share table for the mixed
  cities, homogeneous elsewhere. 1948 seeds Jerusalem 60/32/8
  Jewish/Muslim/Christian, Haifa, Jaffa, Acre, Nazareth (whose Christian
  plurality overrides the blanket overlay), Tiberias, Safed and Beirut;
  66 CE seeds Caesarea's Greek-Jewish knife's edge, Scythopolis and
  Alexandria's three quarters. **The largest community IS the province's
  religion and culture** — every legacy consumer (mapmodes, holy war CBs,
  holy sites, conversion) keeps working. Communities read as people
  ("112k: 67k Jews · 39k Muslim Arabs"), in the panel's Population row —
  visible on any province, ours or theirs.
- **Communal unrest is proportional** (`computeUnrestBreakdown`): where a
  makeup exists, the old binary heathen/heretic/foreign-culture rows become
  the UNINTEGRATED minority share × the same UNREST weights — a 12%
  minority frets, it does not convulse; a 100% foreign conquest still
  bites for the full 3. Pre-population saves keep the classic rows.
- **Integrate** (`integrateProvince`, 25 governance, 12 months): schools,
  land titles and the civil service raise `p.integration` +34% per
  program (+1 unrest while it runs — "Reforms Resented"), scaling all
  communal tension by (1 − integration). It is THE tool of 1948, where
  conversion is era-gated off — integration in the modern age is
  citizenship, not baptism — and a gentler tool beside the missionaries
  everywhere else. The AI runs programs in its most valuable restless
  provinces once governance allows.
- **Conversion moves people**: completing the missionaries' year shifts
  every foreign-faith community to the state religion — keeping its
  tongue (Greek-speaking Jews, as history had them) — and the majority
  follows. Immigration is people too: `helpers.addPopulation` lands real
  souls (the MAHAL/GAHAL boats grow Jaffa and Haifa by 40,000), and
  drains them when events demand flight.
- **Regression contract**: `smoke35.mjs` — seeding and density per era,
  majority derivation, proportional tension and its integration scaling,
  the binary-parity case, the full Integrate loop, conversion-as-people,
  and immigration arithmetic. The autorun anomaly set is unchanged.

## 57. v5.8: blocs, contracts, and the arsenal abroad

The powers beyond the map (SPEC §55) learn three deeper relationships.

- **Pacts** (`signPactCore`/`leavePactCore`, `power.pact` defs): alignment
  with a power at high standing (75). A pact mounts a permanent tag
  modifier, pays monthly funding through the ledger, and anchors the
  standing drift at a floor of 70 — but **the rival's bloc closes** (one
  bloc at a time; signing chills the rival −20), walking out costs −10,
  and a pact left to rot below standing 45 dissolves on its own. 1948:
  *American Alignment* (grant-in-aid, +5% income) vs *Eastern Alignment*
  (fraternal aid, +8% reinforcement); 614: *The Steppe Alliance* for
  Byzantium; the Diaspora offers *One People* to the Jewish tags.
- **Trade agreements** (`signTradeCore`, `power.trade` defs): colder and
  cheaper — a monthly treasury flow (the *Dollar Trade*, the *Skoda
  Contracts*, the *Marseille Run*, the *Half-Shekel*) for as long as
  standing stays within 15 of the signing bar. Flows ride
  `incomeBreakdown.powerIn` → the net, `t.income`, and an
  "aid & trade" ledger row — the AI's affordability sees the same money
  the player does.
- **Matériel** (`effects.modernize`, new asks): buying upgrades, not just
  bonuses. *Re-equip from the Czech depots* (140 talents, Moscow's nod
  required) re-arms every stale formation to the nation's current
  pattern on the spot; *Soviet surplus armor* mounts a 24-month +6%
  power multiplier and martial points. The existing one-off deals stand.
- **UI**: pact and trade appear as the first chips of each power's row —
  ★ marks a standing pact (click to walk out), ⚖ a live agreement —
  with full terms in the tooltips.
- **No more auto-truce** (the reported glitch): a chapter verdict landing
  mid-war used to sword-peace every live war under the player, silently.
  `endGame` now only chronicles the verdict — wars keep running until the
  player (or a scripted armistice like Terms from Antioch, which calls
  `helpers.endWar` itself) actually ends them. The same pass protects
  multiplayer guests: a war with ANY human belligerent never auto-settles.
- **Regression contract**: `smoke36.mjs` — bloc exclusivity and the −20
  chill, permanent-modifier mount/unmount, ledger flows (13/month
  verified through incomeBreakdown and explainIncome), lapse-on-neglect
  for both relationship kinds, the pact floor at 70, both matériel
  purchases, and Diaspora tag-gating.

## 58. v5.9: the built world, and tubs that sail

Some bookmarks open onto a world already built — Herod's harbor is not
waiting for a construction order in 66 CE, and Israel does not invent the
airplane in June 1948. And the merchant marine stops being furniture: the
civilian hulls can sail.

- **The `buildings` overlay**: a bookmark may seed per-province works
  (`buildings: { 'Dora': ['shipyard'], ... }`), resolved through
  `bookmarkField` like owners and religions, so latent-parent inheritance
  works and every other bookmark is untouched. 1948 opens with the real
  infrastructure of May '48 (Haifa/Alexandria/Beirut/Famagusta shipyards;
  Tel Aviv, Cairo, Damascus, Baghdad, Amman and Nicosia airfields); 66
  and 132 CE with Sebastos, the port of Antioch and the Alexandrian grain
  machine; 167/67/40 BCE with the two great Hellenistic harbors; 614 with
  the Golden Horn and Alexandria.
- **Starting forces** (`helpers.spawnFleet`, `helpers.spawnAirWing`):
  setup-time siblings of `spawnArmy`, minting full-shape fleets and wings
  (gen from `navalGen`, wing gated on a real airfield). 1948 opens with
  the Sea Corps at Haifa, 101 Squadron at Tel Aviv, two REAF squadrons at
  Cairo, an Iraqi squadron at Baghdad, and Britain's Mediterranean Fleet
  and No. 32 Squadron on Cyprus; Rome's Classis Alexandrina and Classis
  Syriaca patrol 66/132; the Royal and Ptolemaic fleets open 167;
  Cleopatra's navy rides at Alexandria in 40; the Imperial Fleet holds
  the Horn in 614.
- **Merchant voyages** (`sendMerchantCore`, `merchantVoyagesDaily`):
  a hull may be SENT to any other friendly, working shipyard harbor.
  The berth cap drops 5 → 3 (`MERCHANT_SHIP_CAP`) — no stacking one
  boom port — and berths are RESERVED by inbound voyages, so two ports
  cannot promise the same anchorage (commissioning counts inbound too).
  Voyages (`g.merchantVoyages`, revive-backfilled) sail at 22 px/day
  (slower than war fleets), earn nothing at sea (income reads
  `p.merchantShips`, which the voyage leaves), and on arrival dock, or
  divert home if the port fell or filled, or — with no port open — are
  lost with a notice. Blockade seals the harbor mouth outbound too.
- **UI**: the province panel's merchant block grows "Send to <harbor> ·
  Nd" buttons (berth math in the tooltips); the outliner's civilian
  shipping row counts hulls at sea with per-voyage tooltips; the map
  draws the same neutral tub mid-passage, interpolated along its course.
- **Balance note**: the seeded establishments bill real upkeep and fuel.
  The autorun set is unchanged except 614's GHA, which drifts a hair
  below break-even (treasury still rising — the documented ARM/PAR
  hovering class) from Byzantium's changed ledger; accepted in
  tools/README.
- **Regression contract**: `smoke37.mjs` — overlay seeding across eras,
  spawn-helper shapes, the 1948 establishments, the 3-berth cap, berth
  reservation against inbound hulls, voyage arrival, divert-home,
  lost-at-sea, at-sea income exclusion, and the revive backfill.
  `smoke14/15/32` re-anchored to the seeded world.

## 59. v6.0: the world pushes back — anti-snowball and the Veteran dial

Every defensive mechanic before this section waited for the player to make
a mistake; a competent player never did, and beat the scripted enemy into
an unopposed snowball. v6.0 makes the world INITIATE. All dials live in
`DEFINES.BALANCE`; the two war initiators are HUMAN-ONLY by design, so the
all-AI harness histories (and every scripted arc) stand untouched.

- **Infamy retuned** (military.js, unrest.js): conquest earns dev/2 (was
  dev/3), subjugation +12 and humiliation +5 (both previously escaped
  infamy entirely); decay is 1/month at peace but 0.25 while the conqueror
  is still at war — the window can no longer be waited out mid-campaign.
- **The punitive coalition** (`coalitionPunitiveWars`, ai.js): against a
  HUMAN tag at infamy ≥ 30, the leagued courts (the existing
  `coalitionAgainst` set, minus truce-bound, busy and sworn realms) no
  longer wait to be attacked: once their combined strength clears 1.2× the
  expander's, the strongest free member declares (10%/month) and the whole
  league lands on the attacker side (`cb: 'coalition'` in `declareWar`).
- **Hegemon containment** (`hegemonContainment`, ai.js): the era's
  ponderous great powers watch the human player's share of world
  development (client kingdoms counted). Past 25% their courts sour
  2 opinion/month (one-time "the powers take notice" card); past 32% a
  watcher at peace, stable, and at ≥ 0.7× the player's strength may open a
  war of containment (6%/month × aggression, `cb: 'containment'`) — the
  ratio gates that protect ordinary neighbors do not protect a
  hegemon-in-the-making. The opinion slide also unlocks the ordinary
  opportunism path, so pressure arrives one way or the other.
- **The AI arms with the times** (aiRecruit): the bookmark's
  `targetRegiments` is now a floor, not a frozen ceiling — the AI aims for
  0.3 regiments per point of its own development, and any court BORDERING
  a tag at infamy ≥ 20 arms toward 0.7× that conqueror's regiment count
  (the arms race that ends "safe because strong"). Every fourth regiment
  raised is cavalry when the purse allows. All targets cap at the force
  limit and the old affordability governor.
- **The national force limit** (`forceLimitOf`, military.js; economy.js):
  8 regiments + 0.15/dev (`forceLimitMult` is the modifier lever). The
  overlimit FRACTION of the army pays 3× maintenance — the doomstack
  becomes an economic decision. The ledger shows the surcharge as its own
  line; the realm panel shows regiments/limit; the AI never exceeds it.
- **Conquest priced honestly** (military.js): province war-score cost
  gains a ×1.25 surcharge for land of another religious GROUP (before the
  claim/faith discounts); packages price superlinearly — each additional
  province in one treaty costs +15% more (cheapest-first ordering,
  `priceProvincePackage`) — and no single treaty may strip more than 40%
  of the losing side's development (floor 25 dev, so minors stay
  annexable; `peaceDevCap`). The AI's ultimatums and auto-settlements
  build their packages through the same pricer (`buildAiPeaceProvinces`).
- **War exhaustion wears the ranks** (monthlyMoraleRecovery): morale
  recovery scales by 1 − WE/40 (floor 0.4×) — at the WE cap of 20 the
  ranks mend at half pace, so the long war finally degrades the field
  host instead of resetting it monthly.
- **The Veteran dial** (start screen → `game.difficulty`,
  `DEFINES.HARD_AI` via `resolveTagMult`): a per-campaign challenge
  toggle on the nation-select screen. On Veteran every AI court (never
  humans, never rebels) earns +25% income and manpower and fights at +5%
  discipline. Saves carry it; pre-v6.0 saves revive as Normal.
- **Balance note**: the autorun set shifts by one flag — 66 CE PAR now
  BLEEDING (Parthia arms against an infamous Rome and keeps its wartime
  host; treasury flat, the self-limiting debt-desertion class). 614's
  come-and-go flags sat off this run. Accepted in tools/README.
- **Regression contract**: `smoke38.mjs` — force-limit math and the
  overlimit ledger line, package escalation, the alien surcharge, the
  treaty dev cap, war-time infamy decay, the punitive coalition marching
  on a human (and NOT on an AI realm), containment watch/souring/war,
  exhausted morale recovery, and the Veteran multipliers (AI-only,
  save-revive default). `smoke2` re-anchored to the dearer peace table.

## 60. v6.1: the choice and the cargo — event options everywhere, trade runs abroad

Two player-agency features. The scripted chains stop being railroads, and
the merchant marine learns to leave home.

- **Every player-facing scripted event offers a real choice.** All ~90
  single-option player events across the seven chains gain a second
  option with a genuine mechanical tradeoff (the Rhodes conference can
  now be refused; the truces can be fought through; the Old City's fall
  can be pressed or tempered). The CONTRACT: option 0 is always the
  historical course, byte-identical to the old single option, and every
  multi-option event pins `aiOption: 0` — so AI realms and the all-AI
  autorun harness walk exactly the old history. Alternative options
  never fork a scripted chain: any chain-critical operation option 0
  performs (endWar, setFlag, switchTag, spawns later events depend on)
  is replicated identically; alternates trade only in resources,
  modifiers, war score, opinion and legitimacy. World-history dispatches
  (`world: true`) remain single-option notices by design. `smoke39`
  enforces both halves of the contract structurally, forever.
- **Trade runs** (navy.js `TRADE_RUN`, SPEC §58 extended): a merchantman
  may be sent to a FRIENDLY FOREIGN shipyard harbor — the host court
  must hold us at opinion ≥ 25 — for a round trip: out under sail, a
  month trading in their market, home again, landing the profit as ONE
  lump sum at the home berth (10 + 1 × the foreign port's development,
  × tradeMult) instead of the docked monthly trickle. The run reserves
  its home berth for the whole trip; the foreign port lends an
  anchorage, never a berth. War with the host mid-market seizes ship
  and cargo; a market that closes en route turns her home empty; a
  fallen home port diverts her to the nearest open harbor of ours or
  she is sold abroad. Province-panel buttons list every foreign market,
  the closed ones greyed with the reason, so the opinion gate teaches
  itself.
- **The tub retextured**: the merchant marine draws as a miniature
  corbita — planked round belly, upswept stern post, steering oar,
  bellied cream sail with a terracotta stripe — and trails a wake under
  way. Dwelling traders ride at anchor in the foreign roads.
- **Regression contract**: `smoke39.mjs` — the opinion gate, the round
  trip and its lump payout, wartime seizure, the empty-handed return,
  home-berth reservation, and the two structural event-contract sweeps
  (no single-option player events; every multi-option event pins
  aiOption).

## 61. v6.3: the vassal loop — incorporation, loyalty, and the rising

Fealty stops being a flag on a tag and becomes a relationship with three
live edges, all keyed to the client's OPINION of its overlord
(`DEFINES.VASSALS`).

- **Incorporation** (`incorporateInfo`/`incorporateCore`/
  `monthlyIncorporation`, military.js; the Incorporate button in the
  diplomacy block): a client that has come to nearly LOVE its overlord
  (opinion ≥ 80), both courts at peace, can begin the union — a heavy
  influence price up front (75 + 2.5 × its development), then
  12 + dev/2 MONTHS of weaving that unravels (influence lost) if war
  touches either court, the bond breaks, or their affection cools below
  the gate. On completion its lands join the realm at ≥ 0.5 autonomy
  with a 12-month "Incorporated" adjustment (+1 unrest), its treasury
  transfers, half its standing host returns as manpower (no free
  doomstack; fleets and wings are struck), and the world counts the
  absorption at half a conquest's infamy. Subjugation leaves a court at
  −40 opinion, so the road from client to province runs through years
  of gifts and good faith — and then more years still.
- **Loyalty-gated war calls** (declareWar): a client below −25 opinion
  of its overlord stays home from the overlord's wars — attacking and
  defending both — with a "client stays home" notice for a player lord.
  The one half of the bargain that never lapses: an attack on the
  CLIENT itself still brings the overlord (and the client defends
  itself, however it feels).
- **The independence rising** (`vassalIndependence`, ai.js, monthly): an
  AI client at ≤ −75 opinion, at peace, no truce, with the strength to
  dare (its host plus every fellow client below −25, together ≥ 0.4 ×
  the overlord's) rolls 4%/month to SEVER the bond and declare its war
  of independence (`cb: 'independence'`), co-rebels on the attacker
  side. The severing is immediate — they are free unless the overlord
  wins and puts the yoke back on via the ordinary subjugation clause at
  the peace table. Works against AI and human overlords alike; opinions
  of −75 never arise in the scripted all-AI histories (a lord's infamy
  does not sour its own clients), so the autorun set stands.
- **Regression contract**: `smoke40.mjs` — the opinion and peacetime
  gates, pricing, full transfer effects and infamy of incorporation;
  the refusal, the loyal march, and the never-lapsing defense of the
  client; the rising, the immediate severing, and the subjugation road
  back.

## 62. v6.4: royal marriage — beds, cradles, and the succession

The old world's other diplomacy, for every chapter before 1948
(`mechanics.royalMarriage: false` era-gates the modern age off).

- **The match** (`royalMarriageInfo`/`royalMarriageCore`, military.js;
  the Royal Marriage button in the diplomacy block): two MONARCHIES,
  not at war, the other court at opinion ≥ 20, for 25 influence. Both
  courts warm +25 on the wedding day; the bond is mutual
  (`tag.marriages`) and lives until a house falls — or war between the
  married houses annuls it at −40 opinion both ways ("drawing the
  sword on kin is not forgotten"), announced when the player is party.
- **The cradle** (`heirChance`, realm.js): a heirless monarchy's
  monthly chance of an heir appearing (base 1.5%) is multiplied by
  1 + living marriages, capped at ×3 — the mechanical answer to the
  succession-crisis roulette: marry two houses and heirs come at
  triple the rate.
- All dials in `DIPLO` (marryCost/MinOpinion/OpinionGain/HeirBonus/
  HeirCap/WarBreakOpinion).
- **Regression contract**: in `smoke40.mjs` — the opinion and
  crowned-houses gates, mutual formation and its price, the doubled
  heir chance, war's annulment and its bitter memory, and the 1948
  era gate.

## 63. v6.5: the Galilee pocket — the lines of 15 May drawn true

§46 laid down the rule ("starting owners are the de facto lines of 15
May; the modern borders are what you *make*") and then broke it one
valley north: ISR opened holding Sepphoris and Jotapata — the heart of
the central Galilee pocket §46 itself calls "really Arab-held in May
1948" — so the Dekel/Hiram mission asked Israel to take a Nazareth it
already owned.

- **The pocket is carved out**: `Sepphoris` (Nazareth) and `Jotapata`
  join `Gischala` (Jish) in `LEB_LANDS` — the Lebanese proxy that has
  carried the Liberation Army since v4.5 — making the pocket contiguous
  from Nazareth through Sakhnin to Jish and the Lebanese border, exactly
  the ground Operations Dekel (July) and Hiram (October) existed to
  take. The `i_galilee` mission is now a real conquest, and Israel's
  modern-borders shape is *formed* in the north the way it is in the
  Negev.
- **The pocket has people and names**: Sepphoris overlays `christianity`
  (Nazareth's Christian plurality, its mixed-city table now 60/40
  Christian/Muslim with no 1948 Jewish community); Jotapata overlays
  `islam` and era-names **Sakhnin** — kibbutz Yodfat is a 1960
  foundation, and the map speaks 1948 (SPEC §24).
- **The pocket has defenders**: a 2-regiment ALA "First Yarmouk
  Regiment" garrisons Nazareth from the start; Kaukji himself still
  arrives by event (`ev_i_kaukji`, unchanged). Palmach Yiftach spawns at
  Safed — Operation Yiftach's actual ground — instead of inside the
  now-hostile pocket.
- **Thresholds hold**: Israel begins with 22 provinces (§46's 24 minus
  the pocket); the verdicts stay 26+ (greater) and 21+ (armistice) —
  the war still supplies the difference, it just supplies more of it.
- **Regression contract**: `smoke27.mjs` re-pins the redistributed 1948
  development (ISR 183, JOR 170, EGY 207); `smoke35.mjs` already proves
  Nazareth's Christian plurality names the province and still does.

## 64. v6.6: the plough and the flag — settlers people the land, and the waste can be won

Two answers to the same question — how does land become *yours*? By people,
and by presence.

- **Settlement plants the settler's people** (`monthlySettlement`,
  economy.js): a completed settlement project no longer just raises the
  habitation tier — the wagons carry the settler nation's own community
  (the tag's religion and culture), sized to lead the province's makeup
  (SPEC §56), so the majority — and with it the province's religion and
  culture — flips to the settler. Israel settling a conquered frontier
  makes it Jewish and Israeli; Jordan settling the Badia makes it Arab.
  Provinces without a makeup (old saves) flip the classic binary fields
  directly. A repeat project by the same people just grows them.
- **The unclaimed waste can be won** (SPEC §64's second half; economy.js
  `expeditionInfo/Start`, `monthlyExpeditions`, `annexInfo/Core`; all
  dials in `DEFINES.EXPEDITION`): wasteland nobody owns (owner WASTE)
  that shares a border with you can be taken in hand, in three steps that
  compose with everything above:
  1. **Occupy** — with an army of over 1,000 men standing in an adjacent
     province, detach 1,000 of them (and 50 talents of supplies) to march
     in and pitch camp: the cell's controller becomes yours while the
     land stays impassable to ordinary movement — the expedition IS the
     presence, no pathfinding through the void.
  2. **Develop** — the camp takes an ordinary settlement project though
     the land is unowned (the camp stands in for ownership); on
     completion the frontier tier is planted and — via the mechanic
     above — peopled by YOUR settlers.
  3. **Annex** — with the frontier planted, 50 governance points make the
     waste a province of the realm: owned, controller yours, impassable
     cleared. The terrain stays `wasteland` (2.5× movement, 5%/month
     attrition, v4.3's rule) — sovereign, harsh, and counted.
- **Camps live off the border**: the monthly check folds the expedition
  (and voids its settlement project) if you stop controlling every
  adjacent province, if the owner stops being WASTE, or if the tag dies.
  One camp per waste — a rival is refused while another power sits there.
- **Sealed frontiers refuse every column**: `bookmark.settleable` (the
  per-province boolean override init.js already honored) now guards the
  mechanic, and 1948 marks Dyrrhachium, Phasis and Caucasian Albania
  `settleable: false` — Hoxha's Albania and the Soviet Caucasus stay
  closed borders, not colonization targets. The Sahara, the one true
  waste of the 1948 map, is fair game from British Tripolitania.
- **UI** (province_panel.js "The Unclaimed Waste" block; init.js
  `getWasteland`/`sendExpedition`/`annexWasteland` actions): clicking an
  unclaimed waste offers Send an Expedition, then Plant a Settlement,
  then Annex the Land, each tooltip pricing its step; a camp/progress row
  shows whose flag flies over the tents. The AI does not yet mount
  expeditions — a human lever for now, like the factions (SPEC §34).
- **Regression contract**: `smoke41.mjs` — the culture flip on a settled
  conquest (Israeli Kiryat Gat), the full occupy → plant → annex flow in
  the 1948 Sahara on the real geometry snapshot (costs, the folded camp,
  the rival refusal, the planted people, the opened routes), and the
  sealed 1948 borders refusing the mechanic end to end.

## 65. v6.7: the southern borders drawn true — the Negev wears its real edges

The Negev triangle's OWNERS were right (v4.4) but its EDGES were not: the
weighted-Voronoi seeds thin out in the desert, and with the nearest
Egyptian seeds at El Arish and the deep Sinai interior, the Israeli
Negev cells bled 25-40 km west across the 1906 Rafah-Taba line, Eilat's
cell ran down the Egyptian gulf coast far past Taba, Jordanian Aqaba
curled around the gulf head onto the Sinai shore, and Petra reached west
over the Arabah into the Negev highlands.

- **Three latent border cells** (appended — no save ID shifts; latent in
  every ancient era like all modern cells): **Kadesh Barnea** (era name
  El Quseima; parent Sinai Interior) — the Egyptian side of the Auja
  axis, pinning the upper 1906 line; **Dizahab** (era name Taba; parent
  Sinai Interior) — the east-Sinai gulf coast from Taba south, so Eilat
  ends at the border and the west shore of the gulf is Egyptian;
  **Zoara** (era name Safi; parent Petra, its real ancient sovereign) —
  Jordan's Ghor es-Safi, holding the kingdom's side of the southern
  Dead Sea and upper Arabah. Both Sinai cells are Egyptian in 1948,
  Safi is Jordanian; all three open as frontier with token development.
- **Seed corrections beside the line**: Sinai Interior's anchor moves
  toward the border it now shares (34.05, 29.85 — it is a vast cell
  either way); Gaza sits at the real city (34.45, 31.50) and slims to
  0.75 weight, so the strip's east edge tracks ~34.6 instead of
  swallowing the Kiryat Gat approaches; Mitzpe Ramon firms to 1.0 (the
  highlands hold the Arabah rim against Petra); Paran and Eilat trim to
  0.95 and Aila to 1.10 so the triangle's tip is a port at the gulf
  head, not a smear along two coasts. Measured against the real 1906
  line, every crossing is now within ~6 km — inside the ID shader's own
  organic warp.
- **The map proves it**: at the armistice shape, the south reads as the
  textbook triangle — Beersheba to a point at Eilat, the diagonal
  against Sinai, the strip on the coast, Jordan across the Arabah.
- **Tooling**: `tools/geom-snapshot.json` regenerated at full resolution
  from a 1948 boot (174 cells); the Uvda chain and Eilat's coastal flag
  survive on the new raster, with Eilat now meeting Egyptian Sinai at
  the Taba cell rather than the distant interior.
- **Regression contract**: `smoke27.mjs` counts all 31 modern cells and
  the new totals (EGY 213, JOR 173, ISR 183); `smoke30.mjs` pins the
  Uvda chain against the Taba coast; `uitest25.mjs` renders, hit-tests
  and click-resolves all 31 in a real browser; the 8-year 1948 balance
  harness runs clean on the new geometry.

## 66. v6.8: the victors' pens wait on the schoolhouse — names follow integration

Conquest paints the map; it should not yet rewrite it. Newly annexed
provinces carry their original names until they are properly integrated.

- **The rule** (`resolveDisplayName`, military.js): a bookmark may carry
  `integratedNames: { TAG: { canon: name } }` — the name a state writes
  on a province. It applies only while that tag owns the province AND
  the land is truly theirs: `integration` at 1 (three Integrate
  programs, SPEC §56) or the province peopled by the owner's own
  culture (a completed settlement, SPEC §64). Otherwise the label is
  the era name (SPEC §24). The resolver runs at every moment the answer
  can change: owner change (`changeOwnerCore` — so a retaken town
  reverts on the spot), integration completion, settlement completion,
  and save reconciliation. Canonical names stay the content keys;
  `ctx.prov` answers to old and new labels alike. The player gets a
  toast when their signposts go up.
- **Integration is with a sovereign, not the soil**: both conquest
  paths (peace-table cession and uti possidetis) now zero
  `p.integration` and void any running program BEFORE the owner change,
  so an incoming owner cannot inherit a rename — or an integration —
  it never earned.
- **1948 opens under the names of 15 May**: Lydda (not Lod), al-Majdal
  (not Ashkelon), Isdud (not Ashdod), Bir Saba (not Be'er Sheva),
  al-Auja (not Nitzana), al-Faluja (not Kiryat Gat), Ayn Shams (not
  Beit Shemesh), Umm Rashrash (not Eilat). Israel's `integratedNames`
  supplies the Hebrew names it wrote after the war; the Hashemite pen
  gets its one longing — a fully integrated Jordanian Jerusalem is
  written Al-Quds. Symmetric, data-driven, and empty for the ancient
  bookmarks (zero behavior change there).
- **Save fidelity**: reconciliation re-resolves names after refreshing
  era data — earned renames survive a load, unearned ones cannot sneak
  in — and an annexed waste (SPEC §64) is no longer re-walled by the
  era's impassable override on load (a v6.6 latent bug, fixed).
- **Regression contract**: `smoke42.mjs` — the 15-May originals at
  start, conquest-alone not renaming, integration earning Be'er Sheva,
  reversion on a change of hands, the by-the-sword reset arriving
  unintegrated and unrenamed, settlers naming Kiryat Gat, Al-Quds, and
  the save round-trip keeping exactly what was earned.

## 67. v6.9: the separate peace — coalitions come apart one court at a time

A coalition war could only end all at once, at the leader's table. Now,
exhaust one member enough and you can negotiate them out of the war
alone — while the rest fight on. Rhodes, as it actually went: Egypt in
February, Lebanon in March, Jordan in April, Syria in July.

- **The bilateral ledger** (`separateWarscore`, military.js): a per-court
  score, distinct from the side score — occupation of THEIR land (up to
  60) and THEIR war exhaustion (1.5× WE, up to 20) push a member toward
  the door; land they hold of OUR side's holds them in (up to −60);
  side-pooled battle glory counts at half weight (±20) — a member shares
  its side's victories but feels its own burned fields entirely.
- **The scoped table** (`peaceDealInfo(ctx, war, byTag, enemyTag)`): with
  an enemy named, the deal builder prices against the bilateral score
  and offers only that court's provinces, gold and reparations; the dev
  cap scales to their realm alone; subjugation is refused ("a separate
  peace cannot break a crown — subjugation waits for the full
  congress"). The table exists only while at least one OTHER enemy
  remains alive — the last court standing negotiates the war's end, not
  an exit. White separate peaces follow the same acceptance rules
  (losing badly, or war-weary), judged bilaterally.
- **The exit** (`releaseFromWar`): the leaver is struck from its side;
  status quo reverts occupations between the leaver and our side ONLY —
  every other front keeps its lines; five-year truces (and the
  settled-war ledger the event chains consult) bind the leaver to our
  whole side; `atWarWith` rebuilds; stranded armies march home. Emits
  `war {left}` rather than `{ended}`. `dissolveWar` now shares these
  internals (`rebuildAtWarWith`/`setTruce`/`marchStrandedHome` — pure
  refactor, no behavior change).
- **Envoys cool per court** (init.js): a rebuffed offer locks that
  court's door for six months (`peace:<war>:<tag>`) — a door slammed in
  Amman does not close the one in Damascus.
- **UI** (the peace dialog): when the enemy is a coalition, a chip row —
  "The whole coalition" plus each court with its bilateral score —
  switches the table between the congress and each corridor; the scoped
  view retitles, explains that the rest fight on, and shows the separate
  score. Existing whole-war flow, AI deal-building and scripted wars are
  untouched (`noNegotiation` gates separate tables identically; all AI
  call sites use the unscoped forms). AI-initiated separate exits are
  future work — the AI accepts separate offers but does not yet make
  them.
- **Regression contract**: `smoke43.mjs` — the six 1948 corridors, the
  bilateral score under full occupation, the scoped table's contents and
  refusals, a ceding exit that leaves five armies fighting and Gaza's
  front untouched, the war-weary white exit, the last-court guard, and
  the subjugation refusal. The 8-year 1948 harness runs clean.

## 67. The lost lands are remembered — conquest grudges

A court whose provinces were taken in war does not warm to the taker
while the taker still sits on them. Both conquest paths — the peace
table (`executePeaceDeal`) and uti possidetis (`endWarBySword`) —
record the taken province on the loser: `tag.grudges[taker] =
{ provs: [ids], y, m }`.

- **The ceiling** (`grudgeCeiling`, military.js): while the taker owns
  any recorded province, the victim's opinion of them is capped at
  −(`grudgeCeilingBase` + `grudgeCeilingPerProv` × provinces held),
  floored at −`grudgeCeilingMax` (defaults: one province −100, deepening
  to −180). `addOpinion` refuses to let positive deltas cross the cap,
  so envoys, gifts, marriages and AI reciprocity all hit the same wall;
  values a scripted treaty set above the cap are not raised further but
  are pulled down by drift (`grudgeBite`/month) rather than clobbered.
- **Drift** (`monthlyOpinionDrift`, unrest.js): live-grudge pairs are
  excluded from the heal-toward-neutral pass — occupied patrimony does
  not fade to indifference. A grudge dies only when the land stops
  being the taker's: returned at a later peace, retaken in war, or
  either house falls. The entry is pruned monthly, and from then on the
  wound heals at the ordinary one point a month — restitution starts
  the clock, it does not finish it.
- **The player sees the wall**: the diplomacy panel's status line shows
  "They remember N lost provinces" with the held names in the tooltip;
  Improve Relations and Send Gift refuse at the cap with the reason,
  and alliance is refused outright while a grudge is live. Tag renames
  carry grudge books to the new name on both sides.
- **Regression contract**: `smoke45.mjs` — cession records the grudge
  and slams opinion to the cap, goodwill cannot cross the cap, drift
  neither heals the pair nor prunes a live grudge, the sword path
  records too, returning the land prunes the grudge and reopens normal
  healing, and the book survives a save round-trip.

## 68. The banner follows the state — flag artwork, rebrands, and the inherited pen

The flag chips are the game's heraldry; they must read true at 15px and
follow the state through its revolutions.

- **Artwork** (icons.js): emblem geometry is computed, not hand-plotted —
  `starPath` builds proper N-point stars (the five-, seven- and
  eight-pointed stars of the modern flags), `hexagram` builds the Star of
  David from two interlocked equilateral triangles on one center (ISR,
  and the crowned gold star of MLI), and `MENORAH` draws a true
  seven-branched lampstand — nested semicircular arms, seven lamps level
  on top — shared by two banners that never blur: Antigonus' coin die
  (ATG: gold branches, stepped foot) and, since the §69–71 batch, Judaea's
  own standard (JUD: parchment branches, splayed tripod foot — the Temple
  lampstand, replacing the Year One chalice, which lives on in the
  coinage events' prose). The Ptolemaic eagle is a gold
  raptor (no more parchment-bellied penguin), Hyrcanus flies the palm
  branch of the high-priestly coins, the Rashidun Caliphate has a liwa
  standard of its own, and the dead duplicate FLAGS keys (NAB/ARM/HYR/ARI
  were each defined twice; only the second ever rendered) are gone.
- **In-place rebrands** (`ctx.helpers.rebrandTag`): a revolution that
  keeps the tag can still change the state's name, banner and color.
  `tag.flag` names a FLAGS variant that `flagChip` prefers while set
  (pass the live `game` — every in-game call site does); `tag.name` and
  `tag.color` already win over DEFINES in the label and political
  layers. The helper emits `tagSwitched` so the chrome rebuilds at once,
  and the fields ride the save like any tag state. The Free Officers
  turn Egypt into the Republic of Egypt under the Arab Liberation
  tricolor (`EGY_REP`, the gold eagle); the July revolution raises
  Qasim's tricolor in Baghdad (`IRQ_REP`, the red star on gold).
  `switchTagCore` deletes any variant on a real tag switch — the new
  identity flies its own flag (a UAR formed from a rebranded Egypt does
  not inherit the eagle).
- **The inherited pen** (`resolveDisplayName`, military.js): an
  `integratedNames` entry may be a string naming another tag whose table
  it shares, so a formed nation keeps its predecessor's renames — MLI
  aliases the Hebrew pen in every bookmark that can form it, HAS/JUD
  alias their founders' in 67/40 BCE, and a UAR over the Jordan writes
  the Hashemite Arabic. Israel's 1948 pen also reaches for the Bible's
  own map beyond the armistice lines: Shechem (not Nablus), Shomron,
  Hevron, Yeriho, Akko.
- **Regression contract**: `smoke46.mjs` — the 1948 Shechem rename, the
  alias pen surviving a formable switch, the Free Officers rebrand
  (name, flag, chip, and the base flag restored on a later switchTag),
  the Iraqi revolution rebrand, and FLAGS coverage for every tag on
  every bookmark's map.

## 69. Force them to release nations — the peace table restores the fallen

A war won hard enough can now dismember the enemy the other way: not by
taking their land, but by giving it BACK to the courts they swallowed.

- **The term** (`releasableNations`/`eraOwnerOf`, military.js; `PEACE.releaseCostPerDev`
  0.5, `releaseCostMin` 10): a fallen court (tag in `game.tags`, `alive: false`,
  not a war participant) whose ERA-START lands the enemy currently owns can be
  restored as an independent state at the full congress table. Era-start
  ownership is recomputed live from the bookmark's `owners` table over the
  base map (latent parents honored) — static data, so no save schema is
  touched. The enemy always keeps the province bearing its own capital name
  (release dismembers an empire; it may not behead it), and a separate peace
  (SPEC §67) refuses releases the way it refuses subjugation.
- **Pricing**: each restoration costs `max(10, dev × 0.5)` war score, priced
  on the provinces it would actually receive — anything the same deal cedes to
  US is struck from the release first, and an emptied release drops out.
  Released development counts toward the one-treaty dev cap alongside
  cessions (dismemberment is dismemberment), and subjugation supersedes both.
- **The restoration** (`executePeaceDeal`): the freed provinces change owner
  and controller to the restored tag at ordinary autonomy (its own people come
  home, not a conquest — no `recent_conquest`, integration zeroed, conversion
  voided). The court revives independent: no overlord, war exhaustion 0,
  floors of 0 stability / 40 legitimacy / 25 talents / 2,000 manpower, a
  2/2/2 Council of the Restoration if it lost its ruler, a 2-regiment Army of
  the Restoration at its richest seat, and a five-year truce against its old
  master. It loves its liberator (+100 opinion, +50 back) and despises its
  jailer (−100) — and the old master records a conquest GRUDGE (SPEC §67) for
  every released province, so reconquest wars are a live threat. Liberation
  earns NO infamy: the world does not fear a conqueror who hands land back.
- **The AI**: accepts releases like any priced term (`evaluatePeaceDeal` is
  score-arithmetic) but never builds them into its own ultimatums or
  auto-settlements — the all-AI harness histories are untouched.
- **UI** (the peace dialog): a "Force them to release nations" section lists
  each restorable court with its province count, development and price; a
  ticked release burns the whole patrimony solid gold on the map beside the
  demanded provinces, and clicking the row flies the camera there.
- **Regression contract**: `smoke47.mjs` — releasable detection (dead yes,
  living no, WASTE/REB never), the capital carve-out, dev pricing, the
  war-score gate, cession-trumps-release, the full restoration (owner flips,
  independence, truce, opinions, grudge, the mustered host, the chronicle),
  and the separate-peace refusal. `uitest29.mjs` drives the section end to
  end in a real browser.

## 70. A foreign court's decision is not ours to make — decider notices

The `forTag: 'both'` pattern showed every player the same card — and let a
Judaean player choose how Rome celebrates its triumph. Now an event may
declare WHOSE choice it is.

- **The metadata** (`event.decider: 'TAG'`): the court whose government makes
  the choice between the options. ~129 events across the seven chains carry
  it (Rome's decrees and triumphs, the Nasi's ordinations, the Return's
  submission, Israel's truces, Antigonus' court, the Seleucid regency…).
  Genuinely two-sided beats (symmetric exactions, succession panics) stay
  undeclared and keep the open choice.
- **The notice** (`fireEvent`/`resolveEventOption`, events.js): when the
  player is NOT the decider (and the decider tag still exists — a formable
  that rewrote the tag falls back to the full choice), the pending entry pins
  the decider's own historical course (`aiOption`, function or index) at fire
  time. The modal shows ONE acknowledging button — the chosen course's label —
  under a line naming the deciding court; whatever index the UI reports,
  resolution applies the pinned course. The deciding player keeps the full
  choice; AI-audience events are untouched; pinned notices ride the save and
  the multiplayer relay (main.js collapses the options before they travel, so
  guests see the host's exact card).
- **The contract holds**: data keeps every option and every `aiOption` pin, so
  smoke39's structural sweeps and the all-AI harness walk exactly the old
  history. (smoke39's aiOption sweep now accepts the function form the engine
  always supported.)
- **Regression contract**: `smoke48.mjs` — the notice pins the course, a
  hostile UI index cannot steal it, the decider keeps its choice, the erased-
  decider fallback, function aiOption, the save round-trip, and — for all
  seven chains — every declared decider names a court of its era roster and
  pins its historical course. `uitest29.mjs` renders the single-button card.

## 71. The Compendium — the game's own wiki

Everything the chronicler knows, generated from the live data modules so it
can never drift from the game it describes. `W` in play, the topbar book, or
the title screen's 📖 Compendium button.

- **The registry** (`js/data/compendium.js`): the canonical `ERAS` list —
  every bookmark paired with its event chain (shared generic pool appended,
  exactly as the engine plays it) — now the single source of truth; main.js
  boots from it and the wiki reads it.
- **The codex** (`js/ui/wiki.js`, `#wiki-modal`; styles `.wiki-*`): a
  navigable parchment modal (home ⌂ / back ‹ / breadcrumb stack) openable
  with no game bound (title screen) or in play. Pages:
  - **Home** — the seven chapters (scripted/dated counts, playable chips),
    the Nations, the Formable Crowns, Omens & Incidents.
  - **Chapter** — year, blurb, the playable standards (ruler, guidance:
    signature system, opening moves, the danger clock; the win/loss
    contract), the powers beyond the map, and links into its timeline and
    event list.
  - **Timeline** — every dated event in calendar order under year headings
    (world-history rows marked), then the condition-fired events with their
    chance gates.
  - **Event** — full text, badges (world/major/recurring/decider), fire
    conditions (date, trigger, chance, cooldown, era window, requiresWar),
    audience, and EVERY option with its printed consequences — the
    historical course marked wherever an index aiOption pins it.
  - **Nations** — every court of every era (first-appearance order,
    formable-only crowns badged); each nation's page: faith, culture,
    capital, temperament (personalities), national character (ideas, in
    ±%), its chapters (with ruler and playable standard), and its crowns.
  - **Formables** — from/to chips, era availability, requirement checklist,
    founding bonus. **Omens & Incidents** — the shared pool, antique/
    modern/timeless.
- **Chrome**: topbar book button + `W` toggle + Escape in the close chain;
  title-screen button beside Multiplayer. In passing, the start screen's
  pick wrapper now forwards its third argument — the Veteran dial actually
  reaches `initGame` again (it had been silently dropped).
- **Regression contract**: `uitest29.mjs` — title-screen open, the seven
  chapters, chapter → timeline → event drill-down with printed consequences,
  back/home navigation, nations and formables pages, W/Escape in play, and
  zero page errors.
