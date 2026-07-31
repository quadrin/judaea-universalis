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
  (`showStartScreen(..., saveTools)`) — **retired by §93**, which replaced both
  buttons with a shelf that needs no files at all; the AI now integrates its conquests (establish
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
    any channel the players like. **Superseded as the default by §93**: those codes now
    ride through a cloud room and the player types six characters instead. The transport
    below is unchanged, and this hand-carried flow remains the fallback whenever no cloud
    is configured or reachable. Google STUN for NAT traversal (pure config, no code
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
  unconditionally). The current warmth ladder and effect scaling are defined
  in SPEC §81. Effects remain plain tag modifiers
  (`faction_<id>_boon/_bane`, months: 2, refreshed each court session,
  self-expiring). An estate left at 35 or under sends a **demand card** every
  two years (dyn_faction_* — the
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
- **The Estates block** (nation_panel `refreshFactions`, styles `np-fac-*`):
  name, state word and approval, an approval bar, explicit current consequence,
  tooltips carrying the whole warmth ladder, and the appeasement lever with its
  cost and cooldown in the tooltip. Self-only — a foreign court's politics
  stay offstage.
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
  written Al-Quds. Symmetric and data-driven; later bookmark pens extend
  the same rule into the ancient chapters.
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
can never drift from the game it describes. The title screen's 📖 Compendium
button alone opens it — the library is where you choose a war, not where you
fight one.

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
- **Chrome**: the 📖 Compendium button beside Multiplayer on the title
  screen — the only door. In play the topbar keeps its campaign chrome
  (no book button, no `W` binding), and `bindGame` closes any open codex
  so a campaign never starts under it. In passing, the start screen's
  pick wrapper now forwards its third argument — the Veteran dial actually
  reaches `initGame` again (it had been silently dropped).
- **Regression contract**: `uitest29.mjs` — title-screen open, the seven
  chapters, chapter → timeline → event drill-down with printed consequences,
  back/home navigation, nations and formables pages, the in-play negatives
  (no topbar button, `W` inert), and zero page errors.

## 72. The invasions that must actually arrive — the Ridda road and Pompey's patience

Two report-driven repairs (v8.6). "The Islamic invasions and the Roman
conquests don't trigger": both were real, and both were gates, not clocks.

- **The desert road** (`events_614ce.js`): the Rashidun awakening now runs
  `riddaSettlesTheNorth` — Hegra, Tayma and Dumatha, Ghassan's Arabian
  outposts, pass to Medina at the succession (the historical Ridda sweep,
  632–633), with the player's owned or controlled oases always exempt. Before
  this the Caliphate owned only Yathrib and Khaybar; every exit was neutral
  Ghassanid land or impassable waste, `canEnter` refused all of it, and the
  campaign armies spent the whole war parked at Medina while "The Conquest of
  Iraq" timed out at zero war score. `stagingProvince` now prefers the
  northernmost owned oasis (Dumatha first), so the mustered hosts stand at
  the frontier in reach of Uruk, Bostra and Petra. The campaign events call
  the Ridda sweep again (idempotent) to heal saves that awakened before the
  fix.
- **The Ghassanid screen**: if Ghassan still bars the road at Bostra or
  Dumatha when the Levant campaign opens and no war has already swept it in,
  the columns open one (Mu'tah's memory) — a neutral client on the only gate
  out of Arabia can no longer stop the conquest without a battle.
- **A generational horizon** (`ai.js` `monthlyWarDiplomacy`): AI-vs-AI wars
  may carry `war.settleMonths` — the two Conquest wars set 84 months — so the
  scripted struggle for the Near East no longer white-peaces on the default
  36-month clock while history still expects Yarmouk, Qadisiyyah and the fall
  of Ctesiphon. A decisive score (±50) still settles any war early.
- **The hollowed house**: Khosrow's fall extends "The House Eats Itself" to
  60 months with real teeth (morale ×0.85, reinforcement ×0.75, aiPassive),
  and the Plague of Sheroe halves the Sasanian muster rolls — the empire the
  Arab columns meet is the one the sources describe, not a fully rearmed
  Persia. The awakening also grants "The Diwan of the Conquests" (240 months,
  maintenance ×0.5, income ×1.25): ghanima pays the field army five oasis
  towns never could, so the event-mustered hosts stop melting to debt
  desertion before reaching the settled lands. Victories must still be
  fought — nothing here transfers a settled province by script.
- **Pompey's patience** (`events_67bce.js`): the political spine of the Roman
  settlement — both Three Embassies cards, both "Pompey Requires an Answer"
  ultimata, the arbitration, and The Roman in the Sanctuary — no longer
  declares `requiresWar`. Those gates listed the brothers' war beside Rome's
  own; a player who signed an early peace with their brother put `ARI|HYR` in
  `_settledWars`, and the engine then retired the entire chain unfired — Rome
  never demanded, never subjugated, never conquered. The ultimata are
  politics, not battle phases: they now come at peace or at war (each
  bilateral card still requires its court alive; the embassies require both,
  since the scene is the rivalry itself; the arbitration's own trigger still
  demands the live dispute). Genuine battle phases of the brothers' war
  (Aretas' price, Honi, the paschal beasts) keep their gates — a treaty still
  retires those.
- **Release nations, visible** (`ui.js`): the peace table always shows the
  "Force them to release nations" section — with the release rows when a
  fallen court qualifies, and otherwise with an empty-state line explaining
  what would qualify (or, in a separate peace, that releases wait for the
  full congress). The mechanic (SPEC §69) was invisible in every war where
  nothing qualified, which read as "the feature doesn't exist."
- **Regression contract**: `smoke49.mjs` — the Ridda transfer and the
  frontier muster, a marchable path from Dumatha onto the rivers, the
  84-month horizons, the Ghassanid screen, the player-oasis exemption, the
  deepened Sasanian collapse, and the Pompey chain surviving an early
  brothers' peace through to Rome's war. `uitest29.mjs` additionally drives
  the release section's empty state before any court has fallen.

## 73. Standing rivalries — the AIs go to war with one another

"The AIs should still go to war with one another too; like Rome against the
Seleucids." They couldn't, structurally: `monthlyOpinionDrift` pulled every
pair toward neutral (or +60 for allies), so even bookmark-authored hatreds
(SEL–PTO −80, SEL–PAR −50/−60) mellowed past the opportunistic-war gate
(opinion < −50) within two or three game years — after the opening insults,
organic AI-vs-AI war became impossible and the world went quiet around the
player.

- **The data** (`bookmark.rivalries`, each era): pairs of courts whose enmity
  is the era's weather. 167: SEL–PTO, SEL–PAR, ROM–SEL. 67: ROM–PAR,
  ARM–PAR. 40/66/132: ROM–PAR. 614: RSH–BYZ, RSH–SAS (deliberately NOT
  BYZ–SAS — their great war is fully evented and history's exhausted peace
  should hold after 628). 1948: ISR–EGY, ISR–SYR, EGY–IRQ (the Arab cold
  war; non-adjacent pairs chill opinions without opening a land war, since
  opportunistic wars still require adjacency).
- **The climate** (`areRivals`, military.js; `BALANCE.rivalOpinion` −60):
  drift now cools rivals toward the baseline from both directions — a warmed
  rival pair slides back down, an event-chilled one recovers only to the
  baseline, never to neutral. An alliance, if one is ever forged across a
  rivalry, outranks it (+60 still wins). Recomputed live from the bookmark;
  no save schema change.
- **The seed** (makeCtx): rivalry pairs the bookmark's setup left un-authored
  are seeded at the baseline on bind — fresh games and old saves alike —
  so the enmity is live from the first month. Authored opinions always win.
- **The strike** (`aiConsiderWar`; `BALANCE.rivalRatioMult` 0.85): rivals
  need 15% less overmatch, and a rival war is the one adventure a court at
  stability 0 will still ride out for (non-rival adventures still demand a
  settled court at stability ≥ 1 — that gate is now enforced per-target).
  Everything else stands: adjacency, truces, the −50 opinion gate, infamy,
  war exhaustion, the monthly dice. Peace remains the norm; the difference
  is that the era's great enmities no longer rust shut.
- **The Compendium**: each chapter page lists its standing rivalries under
  the playable standards, straight from the data.
- **Regression contract**: `smoke50.mjs` — seeding (authored values
  untouched), two-sided drift toward the baseline, a real declaration
  through `runMonthlyAI` when a rival weakens (the Syrian Wars resume),
  the stability-0 non-rival negative, and the 614 seeds landing without
  waking the dormant Caliphate. All-AI autorun anomaly flags are unchanged
  from the documented accepted set across all seven eras.

## 74. The junior partner's peace — a withdrawal, not the coalition's pen

"When we peace with a war we got pulled into, our conquered provinces of the
enemy flip to [the enemy] — and our ally still has to win their war."
Reproduced, and it was worse than reported: a court CALLED into a war got the
same peace table as the war's leader. A junior's "separate peace" with an
enemy member struck that enemy out of the ALLY's war, five-year-truced the
ally to it, and reverted the ally's occupations — while leaving the junior
still at war with the rest. A junior's full-congress deal settled (or
white-peaced) the entire war over the leader's head.

- **The withdrawal table** (`peaceDealInfo.exit`): when `byTag` is not its
  side's leader (first living member), the table becomes a withdrawal. Only
  provinces the junior's OWN men hold are demandable (the ally's occupations
  are not theirs to spend), priced by the ordinary war score; gold may be
  demanded; subjugation, releases, humiliation, reparations and the
  separate-peace chips are the congress's instruments and vanish
  (`evaluatePeaceDeal` also strips them from any submitted deal). A white
  withdrawal is easier to buy (`PEACE.withdrawWhiteGrace` 15): the enemy is
  glad to shed a coalition member — but a junior losing badly still cannot
  simply walk.
- **The execution** (`withdrawFromWar`, the mirror of `releaseFromWar` seen
  from inside the coalition): cessions apply first, then status quo strictly
  between the leaver (and its own clients in the war) and the ENEMY side;
  the leaver and its clients drop out; truces bind the LEAVER to each enemy
  — never the ally. The leader's fronts, occupations, war and diplomatic
  standing are untouched, and the war continues without the junior.
- **The AI is structurally unaffected**: every AI negotiation path
  (`sendUltimatum`, the auto-settle in `monthlyWarDiplomacy`) already
  negotiates as a side leader, so `exit` never triggers for it. A war whose
  humans have all withdrawn becomes pure-AI and settles on the ordinary
  clock.
- **UI**: the junior's dialog is titled "Withdraw from …", explains that the
  war is the leader's to finish and the coalition fights on, retitles the
  province section "Keep what our men hold", and drops the leader-grade
  rows. The send button reads "Withdraw from the war" / "Withdraw on these
  terms".
- **Regression contract**: `smoke51.mjs` — the junior's table shape, keeping
  a demanded province on exit, the ally's war/occupations/truces untouched
  (both the terms and the white variants), leader tables unchanged
  (congress + separate chips), stripped leader-grade terms, and the
  losing-junior refusal.

## 75. The yoke settles the quarrel — vassal-aware canon, and unions that hold

Three sibling reports: a junior's peace handing it land its ally conquered
(fixed by §74's own-holdings rule), canon Roman events forcing a crown to
war with its own client, and vassal integration unraveling from ordinary
opinion drift.

- **The bond refuses the sword** (`declareWar`): a crown and its client
  cannot go to war while the bond stands — the guard returns null and warns
  once. The independence rising (`vassalIndependence`) remains the one legal
  road: it severs the bond FIRST and then declares. Without this, a scripted
  event could set Aristobulus at war with a vassal Hyrcanus while tribute
  still flowed between them.
- **Dated chapters declare the world they require** (`event.when`,
  events.js): a dated event may carry a `when(ctx)` predicate; if its month
  arrives in a world that no longer fits — a court vassalized instead of
  rival, a dynasty already settled — it retires silently, exactly like a
  dated battle phase whose war was already settled (SPEC §37).
- **The 67 BCE canon respects a settled house** (`underOneRoof`,
  `hyrFreeOfAri`): when either brother holds the other as a client, the
  Parthian flood no longer installs Antigonus by script, declares no
  fraternal war, and does not invade a Hyrcanid court that answers to its
  brother rather than Rome (the Syrian front against Rome still opens); the
  night flight, Herod's crown (`ev4_king_without_kingdom`) and the caves of
  Arbela retire (`when: hyrFreeOfAri` — the Herodian strand presumes a free
  Hyrcanid court); Sosius' expedition retires entirely
  (`when: !underOneRoof`) — a settled house gives him no war to fight, and
  `ev4_city_stormed` stays self-gated behind his flag. With both courts
  free, every one of these fires exactly as before.
- **Unions that hold** (`monthlyIncorporation`, `VASSALS
  .incorporateKeepOpinion` 60): starting the union still takes near-devotion
  (80); KEEPING it now takes only that the court not turn against us. The
  old check reused the start threshold, so ordinary −1/month drift unraveled
  every union mid-weave and the influence was lost to simple neglect — the
  reported bug. And while the union is being woven, the weavers tend the
  court (`monthlyOpinionDrift`): the client's opinion of the weaving
  overlord drifts TOWARD the union threshold instead of down to
  indifference. Real ruptures — insults, grudges, infamy slides below the
  keep line, or any war — still break it, and the influence is still lost.
- **Regression contract**: `smoke52.mjs` — the bond guard (both directions,
  and the severed rising still declaring), the flood with a settled house
  (Rome front opens; no coup, no fraternal war, no invasion of the client),
  the dated retirements (no cards, no Herod, no Sosius, no legions — and the
  free-house control still firing on schedule), and the union surviving a
  natural dip, drifting back up mid-weave, and still breaking on true
  disaffection. `smoke40`'s vassal-loop contract updated to the keep
  threshold.

## 76. Free states and transferred clients — the congress can redraw sovereignty

The original release term knew only one story: a tag existed when the
bookmark opened, was swallowed whole, and could later be restored. That made
the row disappear in most ordinary wars and could not express either a new
state or the transfer of an enemy's client kingdom.

- **Three roads to freedom** (`releasableNations`):
  1. `restore` — the §69 case: a dead historical court receives the era-start
     homeland the enemy holds;
  2. `return` — a living non-belligerent receives its old homeland back. The
     territory need not be occupied, recently conquered, or taken in the
     present war; the recipient keeps its current ruler, army, government and
     diplomatic bonds;
  3. `create` — enemy-owned non-capital land without a surviving historical
     claimant is grouped by culture + faith into a new cultural state. Its
     deterministic `Fxxx` tag is derived from bookmark and identity and is
     also stored as `releaseIdentity`, so a save/reload or later treaty finds
     the same state instead of inventing a duplicate. The live court carries
     its own name, color, capital, era technology, government, treasury,
     manpower and defensive host; ordinary systems need no static tag entry.
  Historical claims take precedence over cultural creation, so release rows
  never overlap. The enemy capital remains excluded. War participants cannot
  receive land through the release corridor; their fate belongs to the war
  itself.
- **One dismemberment budget** (`evaluatePeaceDeal`): cessions, returned or
  created states, and transferred clients all count their development against
  `peaceDevCap`; each release is priced at max(10, 0.5 × development).
  Cessions still win any overlap. Liberation earns no infamy, while the old
  master records the ordinary conquest grudge and receives a five-year truce
  against a revived or new court.
- **Transfer their clients** (`transferableVassals`,
  `PEACE.transferVassalBase` 15, `transferVassalPerDev` 0.25, max 80): every
  living direct client of an enemy-side sovereign appears at the full
  congress. The term changes only `overlord`: the client keeps all provinces,
  armies, ruler and institutions; unfinished incorporation by the old lord is
  voided; outside alliances are cleared; the old lord is truce-bound and the
  new lord-client pair is not. A forced transfer sours the client (−25 toward
  the new lord), the former lord (−50 toward the victor), and carries modest
  infamy because it is conquest by proxy.
- **Mutual exclusions and authority**: subjugating the enemy leader
  supersedes cessions, releases and client transfers — the whole political
  house is preserved under one yoke. New states and client transfers belong
  only to the full congress: separate-peace and junior-withdrawal tables
  expose neither.
- **UI**: the release section distinguishes "Restore", "Return lands to" and
  "Create"; each tooltip explains whether the court is revived, preserved, or
  made new. A second section lists transferable clients, their old overlord,
  development and price. Ticked state and client territory burns gold on the
  map beside direct cessions.
- **Regression contract**: `smoke53.mjs` — return of an unoccupied province
  to a living neutral court without rebooting its government; deterministic
  new-state creation with land, court, technology, host, truce and zero
  infamy; transfer of Agrippa from Rome to Judaea with land/court/army intact
  and correct truce direction; the separate-congress and subjugation
  exclusions. The original §69 restoration contract remains in
  `smoke47.mjs`.

## 77. The other court has terms — AI statecraft at the peace table

The peace system had grown broader than the mind using it. An AI victor still
knew one treaty: take every occupied province the score could buy, then add
reparations. It never restored a court, transferred a client, reimposed the
yoke after an independence war, initiated a separate peace, or answered an
overreaching demand with anything but silence.

- **One treaty planner** (`buildAiPeaceDeal`, ai.js): ultimatums, autonomous
  AI wars and separate corridors now use the same personality-aware builder.
  Every attempted clause is passed back through `evaluatePeaceDeal`; the AI
  pays the player's escalating province price and shares the same war-score
  and development caps. Claims and co-religionist land lead ordinary
  conquests. Containment and coalition wars prefer restoration, new buffer
  states and transferred clients. Winning an independence war restores the
  client bond when the score can bear it. Rivals and aggressive courts value
  humiliation; cautious courts prefer reparations; rounded indemnities spend
  only the leverage left after political terms.
- **Ultimatums have content**: `sendUltimatum` describes the live evaluated
  package — cessions, releases, recognition, client fealty, reparations,
  humiliation and gold — rather than promising generic "submission." The
  accepting option reuses the captured legal deal; refusal still leaves the
  war and its eight-month demand clock intact.
- **Coalition members seek their own door** (`sendSeparatePeaceOffer`,
  `settleAiSeparatePeace`): the bilateral score from §67 is now agency, not
  merely a player UI. A member whose own fields are lost, or whose war
  exhaustion has broken its court, offers a scoped treaty and five-year truce.
  Human victors receive a two-choice event and must consent; all-AI wars sign
  one such exit per monthly pass. The rest of the coalition, its occupations
  and its war survive exactly as §67 requires.
- **A refusal can become a negotiation** (`buildAiCounteroffer`,
  `sendAiCounteroffer`): when a player's non-white demand exceeds the score,
  the defending court pares back only clauses actually requested. It prefers
  treasury and prestige concessions to permanent losses, then offers the
  cheapest legal territorial clauses that fit. The resulting two-choice card
  signs only after re-validating the live front; if the war changes before the
  seals are set, the offer lapses instead of executing stale terms. The usual
  six-month envoy cooldown begins when the original demand is refused.
- **Regression contract**: `smoke54.mjs` — containment produces a legal
  release package, a victor with no sensible cession takes an enemy client,
  occupied Lebanon initiates a separate offer to a human and leaves alone on
  acceptance, the same corridor settles autonomously in an all-AI war, and an
  excessive multi-province demand returns as an affordable one-province
  counteroffer whose acceptance ends the war.

## 78. Fight for what was declared — war goals and ticking score

Wars had reasons in their names and penalties at declaration, but the
battlefield and treaty table did not remember those reasons. A claimant could
ignore the claimed province, a liberator could annex an unrelated frontier,
and a defender gained nothing from holding the place the aggressor said the
war was about.

- **A persisted objective** (`war.goal`, `makeWarGoal`): ordinary diplomatic
  wars now store a typed, save-safe contract alongside the compact `war.cb`.
  Supported purposes are `claim`, `conquest`, `holy`/`liberation`,
  `independence`, `containment`, `coalition`, and `succession`. Claims remember
  the exact fabricated province; liberation targets the defender's land of the
  attacker's faith; independence centers on the rebel homeland; the remaining
  political wars target the relevant capital. Old saves reconstruct a missing
  goal from their CB. Scripted wars with no explicit CB deliberately receive
  no inferred goal, preserving every authored campaign arc.
- **Ticking war score** (`advanceWarGoal`, `warGoalInfo`): after a six-month
  grace period, the side controlling a majority of the objective's development
  earns one point per month, up to ±25 from the attacker's perspective.
  Control can reverse and work the accumulated score back the other way.
  `sideComponents` carries the positive half into the proper side's gross
  score; the ordinary final ±100 clamp remains. The tick records its last game
  month, so repeated score refreshes cannot double-pay it and a revived old
  save is not charged retroactively for years under a controller it never
  recorded.
- **The stated purpose governs the peace** (`goalProvinceAdjustment`,
  `goalReleaseAdjustment`, `goalTransferAdjustment`,
  `goalSubjugateAdjustment`): the declared conquest province and
  co-religionist liberation targets receive favored cession prices; land
  outside a territorial goal is costlier. Containment and coalition wars make
  release and client-transfer clauses cheaper while making direct annexation
  dearer. A victorious former overlord receives favored terms to restore the
  yoke after an independence rising; a succession claimant receives the same
  preference for submission. The adjusted rows feed the one shared
  `peaceDealInfo`/`evaluatePeaceDeal` path, so UI previews, player offers,
  counteroffers, and autonomous AI treaties all pay the same prices.
- **The AI obeys the political direction** (`buildAiPeaceDeal`): goal-aligned
  provinces sort before unrelated occupations. An independence rebel can no
  longer subjugate the former overlord; only the defending old lord seeks to
  restore that bond. Succession victors prefer the discounted crown, while
  containment, coalition, holy and independence wars cannot fall through to
  the generic "small client" appetite.
- **Visible contract** (`getWarInfo`, war overview and peace dialog): the war
  card names the objective, its target provinces, current controller, accrued
  ticking score and the separate "From war goal" contribution. Peace rows mark
  favored war-goal terms and demands outside the mandate in both their inline
  labels and tooltips.
- **Regression contract**: `smoke55.mjs` proves exact claim targeting,
  grace-period and reversible ticking, war-overview exposure, favored target
  pricing and the unrelated-land premium, independence settlement direction,
  succession submission, and the no-goal boundary for scripted wars.
  `uitest30.mjs` stages a live pressed claim and drives the objective from the
  outliner through the war overview into its goal-marked peace row.

## 79. A claim is an operation, not a button

Fabricating a claim used to spend 30 influence and grant the permanent
diplomatic fact in the same click. The price existed, but the papers had no
time, no exposure, and no interval in which the player still lacked a legal
pretext for war.

- **Paid when begun** (`CLAIM_FABRICATION`, `startClaimFabrication`): the
  operation costs 30 influence immediately, applies the existing −20 opinion
  hit to the target court, starts the existing twelve-month per-country
  cooldown, and writes `{provId, against, monthsLeft}` to the acting nation’s
  `claimFabrications` array. Repeated clicks cannot spend twice or create a
  duplicate operation.
- **Four months before it speaks** (`monthlyClaimFabrications`, tick.js): one
  month is removed during each ordinary monthly block. Until the fourth tick,
  `hasClaim` remains false, `casusBelli` cannot use the papers, and declaring
  war still pays the no-CB cost (unless some other pretext exists). Completion
  moves the province into the ordinary `claims` array and notifies the player.
  If the province has become the fabricator’s own land before completion, the
  spent operation lapses instead of creating a claim on oneself.
- **Save-safe progress** (`initGame`, `reviveGame`): every court starts with an
  empty operation list; older saves receive one during revival, while an
  in-progress operation survives serialization with its exact remaining
  months.
- **UI** (province diplomacy block): the button prints the up-front influence
  price and four-month duration before commitment, then becomes
  `Fabricating… Xm` with a tooltip explaining that the claim is not yet a
  casus belli. Only completion changes it to `Claim Held`.
- **Regression contract**: `smoke56.mjs` covers up-front cost, the absence of
  an early CB, opinion and cooldown effects, duplicate-click safety, three
  incomplete monthly ticks, save/revive at one month remaining, completion
  through the real tick loop, and the own-province lapse. `uitest2.mjs`
  drives the pending and completed labels in the live province panel.

## 80. A crown must have a kingdom — Israel formation balance

The Kingdom of Israel is an endgame consolidation, not a cosmetic reward for
surviving the opening war. Both JUD→MLI and HAS→MLI now require the realm to:

- own and control Jerusalem, Hebron, Neapolis, Sepphoris, Tiberias, and
  Adora — Judaea, Samaria, Galilee, and Idumaea;
- own and control at least 25 provinces, of which at least 12 follow Judaism;
- owe fealty to no overlord, be at peace, hold stability 2, and hold
  legitimacy 85.

The stricter checklist is live in the Decisions tooltip. Ownership as well as
control matters, so a temporary occupation cannot manufacture a crown.

## 81. Warm estates have a stake; cold estates have teeth

The internal factions introduced in SPEC §34 now behave as graduated estates
rather than binary switches. Approval has five visible bands:

- **devoted, 80–100** — the estate's full authored benefit;
- **loyal, 60–79** — half of that benefit;
- **content, 41–59** — no modifier;
- **discontent, 21–40** — half of the authored penalty;
- **hostile, 0–20** — the full penalty.

Scaling respects effect semantics. Additive values scale from zero; multiplier
values scale from neutral `1`, so a `manpowerMult: 1.15` boon becomes `1.075`
while loyal and the full `1.15` while devoted. The same bookmark definitions,
monthly drift, event shifts, demand cards, yearly appeasement cooldowns, and
save fields remain authoritative, preserving old campaigns.

The nation panel now calls the institution **Estates**, colors all five bands,
and prints the active consequence beneath each approval bar. Demands begin at
35 approval, inside the discontent band, so a cooling estate first creates a
measurable penalty and then escalates into politics. `smoke18.mjs` verifies all
five bands, exact half/full arithmetic, demands, appeasement, event shifts, and
the AI-offstage rule; `uitest19.mjs` verifies the renamed panel, consequence
rows, threshold crossing, cooldown, and foreign-court privacy.

## 82. The army eats, or it breaks — supply lines and the invasions that cross the water

Two halves of one contract: every army must trace its bread, and an AI that
cannot march to its enemy plans a real amphibious operation instead of
shrugging. Ports, corridors, fleets and encirclements all become strategy.

**Supply lines** (`js/sim/supply.js`, `monthlySupply` before the month's
reinforcement). An army is IN SUPPLY when a chain of provinces controlled by
its own side — its realm, its co-belligerents, or its occupation troops —
connects it to:

- **controlled home territory** (owner and controller both its own), or
- **an unblockaded friendly port**, provided the side keeps at least one
  warship afloat and an open harbor in home territory holds the far end of
  the lane. The army's own square is part of the chain even in enemy hands
  (the host stands there), but it only counts as a PORT once actually held —
  a landing force besieging the beach town starves until the gates open, and
  a hostile squadron riding off the harbor cuts the lane even while the army
  still controls its landing province.

Out of supply (`army.oosMonths` counts the months):

- **no reinforcements** (`monthlyReinforce` skips the army entirely);
- **morale mends at a quarter pace** (`moraleRecoveryMult 0.25`), and after
  `weakenAtMonths` (3) the host is breaking — morale capped at half its
  maximum;
- **mounting attrition**: +`attritionBase` (2%) the first month, +1%/month
  further to +8%, on top of terrain and hostile-land attrition (ceiling 15);
  the organized-siege-camp attrition cap applies only to a camp that is
  itself supplied — a cut-off besieger melts like any other host.

Rebels are exempt (banditry IS their supply), as are armies aboard fleets and
the armies of a nation with no land at all — the 167 BCE guerrilla loss
condition stays the bookmark's own. The trace is a UI contract too:
selecting an army draws its route on the map (grain-gold dashes home, a
dotted sea lane from embarkation port to home harbor, a red cut at the break
point), the outliner badges cut-off armies with ✂ and the tooltip names the
penalties, and the unit inspector prints the line's state for any army a
commander's glasses can see. `getSupplyStatus` serves the traced route, the
break province, the reason (`corridor`/`blockade`/`noFleet`/`noHomePort`),
and the penalty text.

**AI naval invasions** (`js/sim/invasion.js`, `aiNavalOperation` from
`runTagAI`; one operation per court in `tag.aiState.navalOp`, save-safe). A
warring AI whose enemy has no province reachable overland (`canEnter` refuses
the neutral ground between them — the case that wants ships):

1. **chooses a beachhead** on the enemy coast: ports first, low
   fortifications, weak defenders, no hostile squadron at the anchorage, a
   short crossing;
2. **musters** its largest free army (≥ `minMen` 4,000) at a staging port and
   gathers every idle squadron there, merging them into one armada
   (`mergeFleetsCore`);
3. **builds the missing hulls** — never conjures them: real 6-month yard
   queues, real talents, up to `maxShipsBuilding` keels at once, shortest
   queues first, and `pickRecruitProv` now recruits AWAY from a yard with a
   hull building so the FIFO province queue cannot bury a keel behind months
   of infantry. A realm with harbors but no yard digs the shipyard first;
4. **sails escorted**: a hostile fleet stronger than the armada ×
   `escortRatio` postpones the crossing (and raises the yard order to match);
   one that appears mid-crossing, or waits off the beach, turns the armada
   for home. The expedition is bounded (`maxShips` 8): a mustering army that
   outgrew its hulls splits at the quay and the force that FITS sails, the
   surplus standing as garrison and second wave;
5. **lands and fights** for the beachhead through the ordinary battle and
   siege machinery — the player sees "Invasion!" when the shore is theirs;
6. **reinforces**: `aiSealift` ferries idle armies that cannot march to the
   overseas front onto the nearest friendly coast beside it.

A stalled operation is abandoned after `patienceMonths` (30) — but hulls
sliding down the ways ARE progress and rewind the clock. Scripted lulls
(`aiPassive`) freeze the muster without leaking the armada; a peace mid-
crossing recalls the fleet and puts the troops ashore at home. In 167 BCE
this machinery is what finally ships Rome east: neutral Hellas bars the
road, so the Senate lays keels for thirty months and lands on the Seleucid
coast the honest way.

**Regression contract**: `smoke57.mjs` — the home trace, the named corridor
break, all three penalties measured against a supplied twin, the breaking-
point morale cap, the rebel exemption, save/revive, the sea lane's three
states (noFleet / port / blockade with the army still controlling its
province), and the full Roman invasion: recognition, staging port, low-fort
beachhead, keels laid at real yards, no fleet before the queues deliver, the
legion genuinely aboard, the landing waiting thirty-two months for the
shipbuilding, and the captured beachhead tracing supply home across the sea.

## 83. The second act — sandbox chapters after the verdict

Winning a bookmark closes the historical chapter without closing the campaign
(SPEC §32). Now the campaign answers with a SECOND ACT (`js/sim/chapters.js`,
`monthlyChapters` after the victory check; ledger on `game.chapters`, plain
data, save-safe): a few months after a WON verdict the game generates a
**chapter** — three world-aware objectives drawn from the sandbox families
(regional hegemony, holy sites, trade dominance, dynastic survival,
federation, imperial defense), always one territorial, one internal, one
diplomatic or economic, each sized to the realm as it actually stands:

- **territorial**: control and keep the era's sanctuaries for a year
  (`holyPlaces` — Jerusalem and Gerizim in the ancient chapters); take and
  hold a share of the region's real capitals (`capitals`, nearest first,
  more of them each chapter); humble the strongest rival by holding its
  capital or outliving its banners (`rivalCapital`); or simply extend the
  realm's writ (`provCount`, current + 3 + 2 per chapter);
- **internal**: every estate at 60+ approval held for months together
  (`estates`, when the era has estates); weather a two-front coalition with
  the capital in hand (`survive`); stability +2 with legitimacy 70+ held
  (`stability`); or raise the land itself (`devGain`);
- **diplomatic/economic**: merchant hulls afloat and an income target held
  (`trade`, coastal realms); loyal client kingdoms kept a year (`clients`);
  or warm alliances kept a year (`allies`).

Objectives are typed parameters, never functions, so a mid-chapter save
revives whole. Progress is honest: hold-type objectives count consecutive
months (`holdMonths`/`needMonths`), counters read the live world every month,
and every objective prints its progress in the realm panel ("The Chapters")
and rides the outliner beside the campaign clocks. Completing all three
seals the chapter: a **permanent but restrained reward** (one of five
modifiers — +5% income, +5% manpower, +3% morale, +10% reinforcement, or
accruing legitimacy — cycling by chapter), +1 stability, +25 to every pool, a
chronicle entry, and after `betweenMonths` a HARDER successor chapter
generated against the world as it now stands (used kinds are not repeated
while fresh ones remain). An objective that lapses (`deadlineMonths` 96) is
**replaced in place** with a small legitimacy setback — the sandbox's
failures create setbacks and new asks, never a second game-over screen. The
whole system is the human player's: an AI-driven chair (autoruns, observer
campaigns) never opens it, the same offstage rule as the estates.

**Regression contract**: `smoke58.mjs` — nothing before the verdict, the
grace, the three slots, the named seal, the year-long keeping of the holy
places completing chapter 1, the permanent modifier, the harder successor
asking something new, mid-chapter save/revive, the lapse-and-replace with
its legitimacy cost and no game over, and the AI-offstage rule.

## 84. The client's war and the client's prize — and a conquest that actually rises

Four sibling reports from the 614 chair. "A lot of the Rise of Islam events
show up even when they aren't declaring war" — the conquest strand's dated
world cards fired on the calendar into any world, narrating campaigns a
yoked or extinguished Caliphate was not fighting. "They got turned into a
vassal by the Sasanians lol" — the desert tag's tiny development priced the
subjugation clause around 30 war score, an intact empire took it, and the
entire era switched itself off. "If my vassal conquers land, the peace deal
should be able to cede it to my vassal" — every cession went to the
pen-holder. And "when a country declares war on my vassal, it should have me
negotiate the peace, not withdraw" — the attacked client was listed first on
its side, so §74's leader rule handed the OVERLORD the junior's withdrawal
table for a war fought over its own client's land.

- **The overlord holds the pen** (`sideLeaderOf`, military.js): a war side's
  leader is its first living member promoted through any overlord standing
  on the same side (bounded for client chains). `peaceDealInfo` uses it for
  BOTH sides — the lord of an attacked client gets the full congress and the
  client gets the junior's table, and attacking someone's client means
  negotiating with (subjugating, humiliating, indemnifying) the protecting
  crown. Every AI path (`sendUltimatum`, sue-for-peace, auto-settle,
  AI separate peaces) leads with the same promotion.
- **Directed spoils** (`peaceDealInfo.cessionRecipients`,
  `deal.provinceTo`): the leader's table lists its own direct clients
  marching in this war; each demanded province may name one as recipient —
  same war-score price, owner/controller/grudge/claim-satisfaction land on
  the actual taker, +10 opinion from the gifted client, and the pen-holder
  keeps the treaty's whole infamy (no laundering conquest through a client).
  Recipients are re-validated live in `evaluatePeaceDeal`; AI counteroffers
  preserve them for whatever provinces survive the pare-back. The dialog
  grows a per-row "to us / to <client>" picker; naming a recipient implies
  demanding the province.
- **The conquest strand is gated on the living world** (`when` on the dated
  614 cards, §75's own mechanism): the awakening cards need a tag that can
  still rise (`caliphateCanRise` — dormant yes, yoked no); the campaign
  cards also need a target the declaration can actually land on (live owner
  of the rivers/the Levant, no client bond, no wet-ink truce); the pressure,
  fleet, fitna and Dome cards need a FREE caliphate (`freeCaliphate`) plus
  their own stage (the City still Roman for the sea war, the Second Fitna
  flag for al-Hajjaj's stones, someone actually holding Jerusalem for the
  Dome). In a diverged world they retire silently instead of popping.
- **The conquest that actually threatens**: the awakening now grants 30,000
  manpower, "The Armies of the Ridda" for the first decade (+15% morale,
  +8% discipline, +15% reinforcement), and the diwan's misr system
  (`manpowerMult` 2 for the conquest generation) — the peninsula's tribes
  migrate into the muster rolls that five oasis towns could never feed.
  Campaign spawns grow to their historical weight (Khalid's mobile guard
  answers the Yarmouk concentration), the AI's target force rises to 42
  regiments, and while the conquests run a mauled field force at war is
  refilled by "The Tribes Answer the Call" (repeatable, drawn from the
  real manpower pool, silent for every court but Medina's own player).
- **No Dominion but God's** (`noSubjugation` modifier flag, read by
  `peaceDealInfo` via `tagModifierFlag`): for the conquest generation the
  Caliphate cannot be broken to a client kingdom at any peace table — the
  clause is refused outright, for AI and human victors alike (destroy it or
  take its land instead; after ~651 the clause returns). For campaigns
  already carrying the yoke, "No Yoke but God's" (`ev_p_yoke_broken`)
  severs an AI-imposed bond in a quiet month — mutual −150 opinion, a
  remustered army, the truce held but the tribute dead. A HUMAN overlord's
  prize is never script-broken: the player's wars are their own to win and
  keep.

**Regression contract**: `smoke59.mjs` — the promoted defender/enemy
leaders, the client's junior table, directed spoils end-to-end (validation,
ownership, grudge-on-taker, infamy-on-penholder, opinion, truce), the
refused subjugation clause and its post-fervor return, the yoke-breaking
rising (AI yes, human no), the tribal levies' gate and draw, the yoked
world's cards retiring silently with no phantom war, and the live rails
still firing the real war with its generational settlement horizon.

## 85. The realm has a character — the doctrine axes

The game already remembered what the player chose. A hundred and
sixty-five narrative flags were being set by event options across seven
eras, and a hundred and two of them were never read by anything — not by
a trigger, not by the sim, not by the UI. Worse, the content had already
been written in opposed pairs (`gerizimRazed`/`gerizimSpared`,
`lawIsAWall`/`lawIsAGate`, `alignedRome`/`alignedParthia`,
`altarRaised`/`altarDeferred`), so the moral architecture of every
alternate timeline was sitting in the data with no consumer.

`js/sim/doctrine.js` is the consumer. Four tensions of the age, each
running −10..+10:

| axis | the question | poles |
|---|---|---|
| `zeal` | The Wall and the Gate | Zealous ←→ Accommodating |
| `alignment` | The Two Horizons | Westward ←→ Eastward |
| `authority` | The Crown and the Council | Crowned ←→ Conciliar |
| `conquest` | The Sword and the Purse | Martial ←→ Mercantile |

- **Two sources, summed**: `FLAG_AXES` maps the flags the existing content
  already sets (the retrofit), and `helpers.doctrine(ctx, axis, delta)`
  persists explicit pushes on `game.doctrine` for new content that has no
  flag in the table. Flag-derived scores are computed fresh on every read,
  so no save is migrated and an absent `game.doctrine` is simply an
  undecided realm.
- **Only choice-discriminating flags are mapped.** Ninety of the game's
  flags are set by *every* option of their event — they record that a
  thing happened, not what was chosen — and a doctrine built on those
  would measure the calendar rather than the player. Those belong to the
  §89 ledger instead.
- **Bands**: ±2 is a commitment, ±6 a conviction, and the middle band is
  genuinely middling (a realm that has not committed reads as *Undecided*,
  not as balanced-by-design). `lean(ctx, id, sign, strong)` is the gate
  the rest of the sim uses; `axisOf` the raw read.
- **The realm panel** grows *The Character of the Realm*: four needles
  between named poles, each tooltip listing the decisions that put it
  there. The player's own court only — a foreign realm's convictions are
  its business, like its estates (§34).

Consumed by §86 (an affinity may be gated on the realm's horizon), §87
(a zealous realm faces more risings for the altar, a crowned one more
pretenders), §88 (the second act's objectives), §89 (the page's header)
and §90 (which world the victory strand opens into).

**Regression contract**: `smoke60.mjs` — opposed choices cancel exactly, a
false flag is unset rather than its opposite, non-discriminating flags stay
out, multi-axis flags land on every axis they name, scores clamp, an
unknown axis is refused rather than invented, and a save round-trip keeps
both halves.

## 86. Historical friends — a wound left alone closes

§67 made a grudge permanent for as long as the taker held the land. That
is true of a wound and false of a memory. Persia armed the Return, took
Jerusalem with Jewish troops, handed the city over — and took it back
three years later and gave it to the Christians. Win it back by the sword
and Ctesiphon should hate you for it, and then, if you do not go on
choosing Ctesiphon for an enemy, come back to you: the two courts need
each other against Constantinople far more than they need the grievance.

- **Maturity** (`thawProgress`, military.js): every month the two courts
  are neither at war nor rivals, the grudge entry's `thaw` counter
  advances. The ceiling rises with it — `thawReachPlain` (half the way)
  for strangers, `thawReachAffinity` (nearly all of it) for pairs a
  bookmark names historical friends. A realm high on the `conquest` axis
  matures at `thawMartialPenalty` speed: the same quiet buys a realm that
  lives by the sword less.
- **Reconciled** (`reconciled`): affinity plus `thawAllyAt` maturity takes
  the ceiling off entirely and drops the pair back into ordinary opinion
  drift. The land is still ours and the book still records it — a fresh
  seizure reopens the whole wound — but the grievance has stopped being
  the thing that governs the relationship, and an alliance is on the table
  again *without giving the land back*. This is the one exception to §67's
  flat refusal.
- **What stops it**: a fresh seizure (`recordGrudge` winds `thaw` to zero),
  a war between them, or a rivalry named by either court (which simply
  holds the clock still, so unsaying it resumes from where it stopped).
- **`bookmark.affinities`**, per era, some gated on doctrine:
  `['JUD', 'SAS', { axis: 'alignment', sign: -1 }]` — the Return keeps
  Persia's friendship by facing east and loses it by swinging west. Rome's
  client stays Rome's client (40 BCE), Aretas is the brothers' friend
  either way (67 BCE), Amman's secret wire survives 1948.
- **Declared rivalries** make "we choose not to rival them" an actual
  choice. `game.rivals[tag]` holds up to `rivalMax` named enemies; naming
  one costs `rivalDeclareInfl` and pays `rivalMarPerMonth` martial points
  and `rivalClaimMult` on claims against them, against their regard
  collapsing to the cold baseline, no alliance, and no thaw. Unsaying it
  costs more than saying it and leaves a cooldown. `areRivals` reads the
  declared book on top of the era's own `rivalries` (§73), so a named
  rivalry is a rivalry everywhere the bookmark's own pairs are; the age's
  standing pairs are not the player's to declare or to unsay.
- **The player sees the clock**: the diplomacy status line reads "They
  remember 2 lost provinces · mending 44%", and the tooltip says plainly
  whether the wound is closing and what would hold it open.

**Regression contract**: `smoke61.mjs` — the wound opens exactly as §67
left it, quiet years close a friend's and an alliance follows, strangers
stop halfway and still refuse, a named rivalry freezes the clock without
resetting it, a fresh seizure reopens everything, war holds it open, a
martial realm heals slower, a doctrine-gated affinity lapses with the
doctrine, and an older save with no rival book and no thaw stamp behaves
exactly as §67 left it until the quiet months accrue.

## 87. A province rises for a reason — five kinds of rising

Unrest had exactly one outlet: a threshold crossed and men appearing with
no name for their grievance. But the reasons were already in the game's
state. `js/sim/revolt.js` reads them and raises a band with a cause
attached. Five kinds, tried in order of specificity:

1. **separatist** — the §67 grudge book already records which court lost
   this exact province, so a separatist rising is that memory finding a
   body (`dispossessedOf`). It marches under the old flag where that flag
   is hostile and in reach, and raises the colors itself where it is not.
   Larger and steadier than an ordinary band.
2. **national** — the old rule, kept exactly, and promoted above the
   grievances below it: a province does not raise its own banner when its
   co-religionists' army is over the next hill.
3. **pretender** — a crown below `pretenderLegitimacy`, or one held by a
   regent, breeds a named claimant (republics settle this with ballots).
   `game.pretenders[tag]` tracks the live claim; `monthlyPretenders`
   bleeds `pretenderDrain` legitimacy a month while it stands, restores
   `pretenderBeatenLegitimacy` when the host is destroyed, and crowns the
   claimant in the player's place if it holds the capital for
   `pretenderHoldMonths` — old ruler deposed, heir cleared, legitimacy
   reset to `pretenderCrownedLegitimacy`, −1 stability, the bands sent
   home and the capital answering the new crown.
4. **religious** — a heterodox province with nobody marching to its aid
   rises for its altar.
5. **peasant** — the floor. The biggest hosts and the most brittle
   (morale ×0.7).

The doctrine axes bend the odds without deciding them: a zealous realm
faces more risings for the altar, a crowned realm more pretenders. Risings
in the player's own realm send a demands card once per kind (`dyn_rising_*`,
the §33 ultimatum machinery) — buy the province back from itself, marry the
claim into the house, seal a writ of toleration — and the answers push the
axes in turn. The eight-band throttle, the thirty-month cooldown and §40's
border-defection rule are untouched, and the province keeps a `revoltType`
stamp the panel reads.

**Regression contract**: `smoke62.mjs` — all five kinds and their order, a
fallen house raising no separatists, the usurpation end-to-end, the broken
host, the throttle, the doctrine tilt, and the save. `smoke25.mjs` (the
border rule) passes unchanged.

## 88. The second act knows which realm won it

§83's generated chapters asked every winner the same four questions, which
made the second act a checklist. §85 knows what kind of realm took the
bookmark, so `chapters.js` offers seven doctrine objectives — each once,
before the generic ladder resumes:

- **The Purified Land** / **The Peace of the Communities** (`zeal`) — bring
  the land under one altar, or keep every province of another faith below
  3 unrest. Emptying the realm of them is explicitly not how the second is
  passed.
- **The Undoubted Crown** / **The Chamber Sits** (`authority`) — legitimacy
  90+, an heir seated and no claimant in the field (§87); or unbroken
  months at peace with every court at +1 stability.
- **The Sword's Own Measure** / **The Ledgers of the Age** (`conquest`) —
  ground that was not ours when the chapter opened (snapshotted in
  `params.baseline`), or an income target held through a year with no war
  anywhere.
- **The Mended Quarrel** — bring a court whose land we hold all the way to
  reconciliation (§86). The hardest diplomatic objective in the game and
  the only one that cannot be bought: waiting is the mechanism, not naming
  them an enemy is the price, and the panel shows the wound's maturity as
  its progress.
- **The Covenant of the King of Kings** / **The Friendship of the West**
  (`alignment`) — a warm alliance with a court on the chosen side, read off
  the era's own geography (capital centroids) rather than a tag list.

The reward pool doubles to ten so a long sandbox stops repeating at chapter
six, and the epigraph names the realm the chapter is being asked of. An
undecided realm still gets exactly the ladder §83 gave it.

**Regression contract**: `smoke63.mjs` — the undecided ladder first, then
each gate, each evaluator's real failure mode, and ten chapters with ten
different seals.

## 89. The Road Not Taken — the campaign beside its record

The game generated an alternate history every time it was played and never
showed it to anyone. `js/sim/divergence.js` keeps the ledger, and it needs
no new authoring to do it: every scripted event already carries the
historical course, because `aiOption` is what the AI does when it holds
this decision and the §70 decider notices are built on exactly that promise
("the historical course simply happens").

- **A turning** is a spine event resolved with any option other than its
  `aiOption`. Both halves are already on the card, and the entry keeps
  what the chronicles say, what this age did instead, and when. Only
  `major` events and ones an author explicitly annotates get in — texture
  stays out — and a §70 notice is never counted as a choice this realm
  made, because acknowledging is not choosing.
- **`historical:`** is optional prose an author may attach saying what the
  record actually looked like; twelve pivotal turnings across six eras
  carry one. Without it the ledger prints the option labels.
- **A chapter that never came**: a dated event retired by §75's `when`
  gate or by a settled war is logged with its reason — a page of the
  script that never got written.
- **The strands**: two dozen flags the content already gates on are named,
  so the page can say which world the campaign is actually in rather than
  only the turnings that got it there.
- **The Chronicle (C)** grows a second page — *The Record* and *The Road
  Not Taken* — the latter headed by the §85 axes and the realm's epithet.

**Regression contract**: `smoke64.mjs` — both halves recorded, agreement
recording nothing, an authored line outranking the label, texture excluded,
a notice excluded, one entry per event, the retired chapter, the live
strands, ordering, and an older save starting an empty ledger rather than
inventing a history it did not have.

## 90. What kind of kingdom, what kind of return

The alt-history strands established that Judaea survived. They never asked
what Judaea *became*, so every winning campaign in an era arrived at the
same state with the same modifiers. §85 knows the difference, so the strand
now asks — three mutually exclusive identity cards per era, each with a
permanent modifier, a strand flag registered on the §89 page, its own
`historical:` line, and a push on the axes that chose it.

- **66 CE**: *The Kingdom of the Altar* (zealous and crowned — a sacral
  monarchy, harder army, angrier minorities, Rome filing it under
  unfinished business); *The Commonwealth of the Chamber* (conciliar —
  quieter country, softer army, no single death that changes anything);
  *Worth More Standing* (mercantile or accommodating — expensive to invade
  and profitable to leave alone, and Rome warms to it).
- **614 CE**: *The Western Wall of the East* (facing east — Ctesiphon's
  Levantine flank, with the manpower and the Byzantine hatred that come
  with it); *A Kingdom Apart* (zealous — neither empire's road runs
  through it, and the standing army is a real line in the budget); *The
  Kingdom Everyone Prefers Intact* (mercantile — safe roads, honest coin,
  three empires that have all done the arithmetic).

**Exclusivity is settled at trigger time, not effect time.** All three are
evaluated in the same monthly pass and the flag their effects set does not
exist until one is answered, so the guard reads `firedEvents`, which
`fireEvent` stamps the moment a card fires. First sibling to match closes
the door on the others in the same loop.

**Regression contract**: `smoke65.mjs` — the cards exist with their record
attached, an undecided winner is offered none, character alone is not
enough (the state must stand), each identity's modifier does what it says,
exactly one card is offered to a realm that qualifies for several, and no
strand on the §89 page is keyed on a flag nothing writes.

## 91. No strand card in a world it does not fit

The alternate-timeline strands (§7.8–8.5, §90) are the worlds that outran the
record, and every one of them gated on the same two questions: is the realm
alive, and does it hold the capital. None of them asked whether it was still
SOVEREIGN. 67 BCE's `freeOfRome` had it right from the start (`!t.overlord`);
the other five eras simply never implemented it, and the result was a court
that had bent the knee at a peace table drawing cards congratulating it on
its independence.

Three defects, one shape:

- **No sovereignty check.** `judaeaFree` (66 CE), `judaeaStands` (132 CE),
  `returnStands` (614), `hasmoneanWorld`/`hasmoneanHolds`/`greaterHerod`
  (40 BCE) all now require the strand's realm to answer to nobody. A client
  kingdom sitting in its own capital is the chronicle repeated, not the world
  that outran it — which is precisely what the Second Kingdom, the Standing
  State, the Return and the Hasmonean Restoration are each about.
- **No world check at all.** The 167 BCE greater-victory strand gated only on
  `alive(HAS)`, so a Hasmonean state that had lost Jerusalem still drew cards
  announcing it had conquered Syria. New shared gate `greaterVictory` —
  alive, no overlord, seated in Jerusalem — on all ten cards. The worst of
  them, `ev_yoke_reversed`, asked for a war score of 75 and nothing else:
  Antioch sued for terms to a court whose capital it was occupying. It now
  wants the capital, the sovereignty, and actual ground in Coele-Syria.
- **No capital check.** Four 67 BCE cards (the Parthian embassy, the
  Pharsalus wager, the caravan tribute, the Actium choice) asked only
  `freeOfRome`, so a Hasmonean driven out of Jerusalem still drew the
  sovereign's cards. New `seatedHasmonean` = `freeOfRome` + holds the city.

Note that `controls()` reads the CONTROLLER, not the owner: a Maccabean
Jerusalem still legally owned by Antioch is correctly seated, which is the
whole of 164 BCE. A card firing in a true world and being read after the
world changed is not this bug and is not prevented.

**Regression contract**: `smoke66.mjs`, deliberately data-driven — it reads
each strand's region out of the package source, builds the most permissive
world the strand could ask for, proves the strand fires there, then puts a
collar on the realm and proves NOTHING fires, and repeats it with the capital
lost. A card added to a strand tomorrow is covered without anyone remembering
to add a case.

## 92. The offered collar — clientship without a war

Every road to a client kingdom ran through a battlefield: the peace table's
subjugation clause (§16), or §76's transfer of somebody else's vassal. But a
small state beside a large friendly one has always had a third option, and it
is the one most of the real client kingdoms of this map actually took — ask
for the protection before the alternative arrives.

`Offer Our Protection` (province panel diplomacy, `offerClientship`) is that
road. The gate is deliberately narrow:

- a **sworn ally** — no other relationship earns the hearing;
- at most `clientOfferDevShare` (half) of our development;
- whose opinion of us is `clientOfferMinOpinion` (120) or better;
- neither of us their overlord already, and we are not somebody's client
  ourselves — a client does not go collecting clients;
- `clientOfferInfl` (100) influence to send it.

**Whether they say yes** is shown before it is asked, because this is a
decade-long mistake to make blind. They accept at `clientOfferAcceptOpinion`
(150) on devotion alone, or at the lower bar if they are much smaller than us
(`clientOfferSmallShare`) or **threatened** — at war with a power half again
their size, which is the calculus that produced most historical clientage.

**On acceptance** the bond replaces every other: their outside alliances
break, the alliance that made it possible becomes the fealty, they pay the
ordinary `tributeShare` and their wars are ours, and their court, army and
laws all stand. It costs **no infamy** — nobody was conquered, and that
distinction is the entire reason the mechanism exists. It costs a little of
their pride (`clientOfferAcceptOpinionHit`).

**On refusal** the influence is spent anyway, their regard drops by
`clientOfferRefuseOpinion`, and they will not hear the question again for
`clientOfferCdMonths` (five years).

**Regression contract**: `smoke67.mjs` — the gate in each of its clauses, the
too-great court, the already-spoken-for court, devotion alone being
insufficient, a losing war turning a refusal into an acceptance, the bond
replacing outside alliances, the absence of infamy, the refusal's cooldown,
and the save.

## 93. The shelf and the six-character invite — one small cloud, two old problems

Two things in this game asked the player to move a wall of text by hand, and
both are gone. They were the same problem wearing different clothes: a static
site has nowhere to put a small piece of state for a moment, so it made the
player carry it. Now there is somewhere to put it.

**The shelf is the browser's own database** (`js/core/shelf.js`). No account, no
endpoint, no setup, and above all no file to download and hunt for later:
campaigns go into IndexedDB and load from the panel with a click. localStorage
was the obvious place and is the wrong one — it caps near 5MB per origin and
counts UTF-16, so a ~104KB save costs ~208KB of that budget and a dozen
campaigns throw `QuotaExceededError`, which is the single failure that loses
somebody's game. IndexedDB on the same browser reports ~1GB. Anything the old
build left in localStorage is migrated across the first time the shelf is read,
and the original is deleted **only after** the copy has committed — an early
version of that migration mistook "no such record" for "already there" and
deleted the source without writing the destination, which `uitest33.mjs` caught.
On the first save the game calls `navigator.storage.persist()`, so the origin is
not evicted under storage pressure; the panel says which of the two states it
got. If IndexedDB cannot be opened at all, the same API falls back to
localStorage and the panel says the store is the smaller one.

**A cloud is optional and additive** (`server/worker.js`, ~180 lines over one
Cloudflare KV namespace) — the only server this game has ever had. Configure one and every save is
copied there as well, so campaigns follow the player between devices; configure
nothing and the game is complete. It stores two kinds of thing and understands
neither:

    room:<CODE>       one WebRTC offer, and its answer once posted. TTL 15 min.
    save:<who>:<id>   one campaign body; its display metadata rides in KV's
                      metadata slot, so the saves list is a single list() call.

`<who>` is `SHA-256(player key)` truncated to 32 hex characters. **The player
key is never written to the shelf** — it arrives in `X-JU-Key`, is hashed, and
is discarded. Possession of the key is the entire authorization model: no
accounts, no email, no password, nothing to reset, nothing to administer.
`smoke68.mjs` drives the real worker over an in-memory KV and holds that wall:
a second key sees an empty shelf, a truncated key is refused outright, and the
raw key appears nowhere in the store.

**The client** (`js/net/cloud.js`) is plain `fetch` at seven routes — nothing
in it is Cloudflare-specific. The endpoint comes from `DEFAULT_ENDPOINT`, from
`localStorage`, or from a `?cloud=<url>` link. **With no endpoint the module
reports "off" and every caller falls back to what the game did before** —
hand-carried invite codes, device-local saves. An unconfigured deploy plays
exactly as it always did; that is a contract, and `uitest32.mjs`'s last clause
is the one that proves it.

**Trust is split by what the endpoint is asked to carry**, because the two uses
are not comparable:

| | carries | trusted from a link? |
| --- | --- | --- |
| rooms | an SDP offer and its answer, dead in 15 minutes | yes |
| saves | the campaign, under the player key in a header | **no** |

An endpoint that arrived in a `?cloud=` link is used for ROOMS ONLY, held in
`sessionStorage`, until the player accepts it in the saves panel — which is an
explicit button next to a plain statement of what accepting means. Without that
split, a crafted invite link would silently redirect somebody's saves *and their
player key* to a stranger's server, which is a far worse bargain than the
convenience is worth. `cloudEndpoint()` is the trusted one (accepted, or baked
into `DEFAULT_ENDPOINT`); `roomEndpoint()` also accepts the link's. `?cloud=`
with an empty value clears both. An operator who edits `DEFAULT_ENDPOINT` sees
no prompt at all — the question exists only for endpoints the player did not
choose.

**The hand-carried code is packed** (`js/net/sdp.js`). With no cloud, a code
still has to carry the whole session description — but almost none of it needs
to travel. Both ends are this game opening one ordered data channel, so the
boilerplate is known on both sides; what cannot be guessed is the ICE ufrag
(~4), the ICE password (~24), the DTLS fingerprint (32 bytes, irreducible) and
the candidates (~20 each). A code is those fields behind a `JU2.` prefix, and
the far side rebuilds a complete SDP around them, using `9` / `0.0.0.0` — the
standard placeholders for a session whose addresses come from candidates.

**832 characters became 105** on a LAN offer, ~150 with a reflexive candidate.
That is roughly the floor: a hash does not compress, and going below it means
not sending the connection details at all — which is exactly what a
six-character room code does, by keeping them on a server instead.

`packSdp` returns null for anything it cannot faithfully rebuild — no
fingerprint, no candidates, audio or video, more than one m-section — and `enc`
falls back to the literal `JU1.` form rather than mint a code that will not
connect. `dec` accepts both forms forever, so a player on an older build can
still be joined. A damaged code is refused whole (`unpackSdp` catches; an early
version let `atob` throw out of the lobby instead).

**The invite link.** "Copy a link instead" beside the code yields
`…/?cloud=<endpoint>&join=<CODE>`; main.js hands `join` to `lobby.openJoin()`,
which opens the join screen with the code already in and the handshake already
running. Carrying the endpoint is what lets a friend who has configured nothing
reach the room — and it is safe precisely because of the split above.

- **The invite code is six characters.** The host parks its offer in a room and
  is shown `KFR-2M9`; the guest types it, fetches the offer, and posts its
  answer to the same room; the host collects that by polling (1.5s) and the
  channel opens. **There is no reply code** — the round trip that used to run
  back through a chat window now runs through the room. The alphabet drops I,
  L, O, 0 and 1, and input is uppercased and stripped, so a code survives being
  read aloud. A room takes one answer and refuses the second (409): an invite
  is for one guest, and the host mints another for the next.
  - The old flow is not deleted, it is demoted. `manualMode` renders the
    original offer/reply textareas, and the lobby enters it three ways: no
    cloud configured, a cloud that failed to take the offer (once, then for the
    rest of the session), or the player asking for it — which is the LAN and
    air-gapped case, and still works with nothing behind the game at all.

- **Saves are a shelf, not a downloads folder.** Export-to-file and
  import-from-file are gone; `▤/☁ Saved campaigns` on the title screen and the
  scroll beside the topbar quill open the same panel (`js/ui/saves.js`), which
  lists every campaign with its nation, date, chapter, kind and where it lives,
  and loads any of them in one click. Loading from the title screen starts the
  world directly; loading from inside a running campaign routes through
  `sessionStorage` and a reload, because this chrome binds its game once
  (`bindGame` is deliberately one-shot) and the save is already on both shelves,
  so nothing is lost crossing it.
  - **Ids**: `auto-<chapter>` (the January autosave, overwritten each year) and
    `manual-<chapter>-<stamp>` (the quill, a new row per press). Capped at 30 on
    the device and 24 in the cloud, oldest pruned. A prune never takes the write
    that triggered it: KV's list is eventually consistent and may not show it
    yet. **Saves written before this section still load** — see the migration
    above.
  - **Hosting a save.** The lobby's campaign step offers "Start a new one" or
    "Continue a save": pick one off the shelf and the chapter and nation selects
    step aside, because the save decides both. `onHostStart` receives the
    resolved `{game, entry, meta}` and `startMultiplayerHost` ships that world
    to the guests instead of a fresh `initGame` — they join mid-war, on the
    saved date, with the saved armies. The human seats are re-established
    **after** the load, since `reviveGame` deliberately collapses a save back to
    a solo campaign (§18). The lobby payload carries `resumed`, so the guest is
    told they are joining a campaign already under way and where it has reached.
    The lobby reads the shelf through hoisted closures rather than the
    `saveTools` object, which is not built until the title screen goes up.
  - **Deleting** is on every row: a two-tap control ("Delete" -> "Delete for
    good?", disarming itself after four seconds) rather than a bare ✕ with a
    tooltip, because a tooltip never appears on a phone and a campaign is not
    something to lose to a mis-tap. It removes the body from this device AND
    from the cloud copy, if there is one.
  - **Local first, cloud extra.** The device always gets the write, and the
    toast reports what actually happened ("Kept on this device", "Kept on this
    device and in the cloud", "…the cloud copy did not go through") rather than
    claiming success it did not have. A campaign that is here is *labelled* as
    here, with the cloud copy noted beside it; only a save this browser has
    never seen is listed as living elsewhere, and loading it brings it home.
  - **Continue** reads this device's shelf on its own. If a cloud is configured
    its list is started at boot and awaited against a 5s budget just before the
    title screen — by which time the renderer and geometry work has already
    burned most of it — so a campaign continued on the phone is the one the
    laptop offers, and a dead network costs a moment rather than the title
    screen. Past the budget, Continue offers the newest campaign already here.

- **The player code** is the account: twenty characters, minted on first run,
  shown (masked) in the saves panel with Copy, and typed into a second device to
  bring the shelf across. It is a password in every sense that matters and the
  panel says so.

**Regression contract**: `uitest33.mjs` — **the default experience, with
nothing configured at all**: a bare URL, an empty shelf that asks for no setup,
a save that goes into IndexedDB and not localStorage, the tab closing and coming
back, loading with a click, many campaigns across several chapters, deleting,
and a legacy localStorage save being migrated and still playing. `smoke68.mjs` —
the worker itself, headless: room mint
/ fetch / answer-once / expiry, the shelf's write-list-read-delete, ordering,
the prune, and the separation between two players. `uitest32.mjs` — two real
browsers joining over an invite link with no blob on screen, code normalization
(` kfr-2m9 ` looks up, `nope` is named as malformed), **the link-provided
endpoint being refused the saves until accepted**, a campaign written to the
cloud and loaded back from the title screen and from mid-campaign, a second
device that knows only the player code, and the no-cloud fallback rendering the
old flow unchanged. Both suites run the REAL worker over an in-memory KV
(`tools/tests/ju-cloud-mock.mjs`) — no Cloudflare account, no network.
`uitest34.mjs` — a campaign played, marked, saved, then hosted: the picker
standing in for both selects, the guest told it is already under way, and both
sides landing in the SAVED world (same date, same treasury mark, same armies)
rather than a fresh chapter — then still live, with orders crossing the link.
`uitest5.mjs` continues to drive the hand-carried path.

Note for whoever runs the battery: `uitest32.mjs` holds two browser contexts up
at once and its waits are set to 60s for that reason — the structural waits are
generous on purpose, not hiding a slow path.

## 94. One Jewish map across all seven bookmarks

The bookmark pens in §66 grew one town at a time and repeated the same dozen
Hebrew names in seven files. They also stopped at the old core: a Hasmonean
Damascus, Adiabene in Egypt, or Israel in Babylonia could integrate the land
without ever putting its own names on the map. The EU4 promise is larger than
that — a culture carries a map with it.

- **One inherited pen** (`js/data/integrated_names.js`):
  `JEWISH_INTEGRATED_NAMES` carries more than sixty attested Hebrew names and
  established Jewish exonyms. It covers the dense Judaean and Galilean map,
  but deliberately keeps going: Tzor, Tzidon, Geval, Arvad, Damesek and Aram
  Tzova in Syria; Sin, Beit Honio, Nof, No-Amon and Seveneh in Egypt; Netzivin,
  Mahoza, Bavel, Meshan, Ahmeta, Shushan, Ginzak, Yahudiya, Ashur and Erech in
  the east; Saloniki and Kushta on the diaspora's Mediterranean road.
- **Religion, not a tag whitelist** (`resolveDisplayName`, military.js): any
  living tag whose current state religion is Judaism inherits that pen. That
  includes every Judaean identity, modern Israel, the Kingdom of Israel
  formable, and Adiabene; a future Jewish bookmark or a realm that changes
  religion needs no new code and no copied table.
- **Local history still wins**: a bookmark's `integratedNames[tag]` is checked
  first. Herod therefore writes his actual foundations, and 1948 Israel writes
  Nitzana rather than the shared ancient Avdat. Modern cells that reuse ancient
  canonical keys also keep Tel Aviv-Jaffa, Petah Tikva and Haifa rather than
  collapsing back to Yafo, Afek and Dor. The shared table is a fallback, not a
  flattening of the seven eras.
- **Ownership is still insufficient**: every name waits on exactly the §66
  threshold — full integration or a completed settlement into the owner's
  culture — and reverts to the bookmark's era name on a change of hands.
- **The list is curated, not generated**: no automatic translation or
  transliteration routine invents names for unattested places. The source spine
  is the Hebrew Bible (Joshua 12–13, Ezekiel 27 and 30, Ezra 6), the Academy of
  the Hebrew Language's place-name/transliteration guidance, Encyclopaedia
  Iranica for Jewish Babylonia, Oxford's account of the Temple of Onias, and
  National Library of Israel collection notes for Kushta and Saloniki.
- **Regression contract** (`smoke44.mjs`): all shared keys are real canonical
  provinces, the table stays above sixty entries and reaches all five outside
  regions, every bookmark inherits Damesek through an active Jewish state,
  1948's Nitzana beats shared Avdat while its three modern metro overrides
  survive, an unintegrated conquest stays in the era's language, settlement
  earns the name, and a non-Jewish state does not.

## 95. The schoolhouse AND the settlers — the Hebrew pen's second half

§66 let a pen write on integration OR a settlement; §94 handed every Jewish
state one shared table of sixty-odd names. Together they produced a claim the
game did not mean to make: a fully integrated Arab town with no Jewish
resident in it signed itself in Hebrew. Integration is a state's work; a name
is a place's people.

- **The rule** (`resolveDisplayName`, military.js): a JEWISH pen — the shared
  table of §94 or a bookmark's local one, whichever supplies the word — now
  requires BOTH halves at once: `integration` at 1 AND a living community of
  the owner's own religion and culture in the province (`ownersCommunity`,
  read from `p.pop`; provinces with no makeup answer from their own
  religion/culture overlay, which is what the makeup would have said). Every
  other pen keeps the older integration-or-culture threshold: a fully
  integrated Jordanian Jerusalem is still written Al-Quds, and the Hashemite
  pen owes nobody a census.
- **The resolver runs when the answer can change**: to owner change,
  integration and settlement, save reconciliation, the trigger list adds
  `helpers.addPopulation` — the olim land and the signposts go up the same
  month; an evacuation (the Sinai settlements at Washington) takes them down
  the same month.
- **The road is in the campaign, not the console**: `ev_i_development_towns`
  (1950–61, "Tents, Then Tin, Then Towns") settles the mass immigration in
  the frontier towns Israel actually holds — Bir Saba, al-Majdal, Isdud,
  Lydda, al-Faluja, Ayn Shams, Umm Rashrash and the rest — planting the
  community the pen has been waiting for. Its other option keeps the
  newcomers on the coast: more money, no unrest, and a map that keeps its
  1948 names, which is a real choice about what kind of state was built.
- **Regression contract**: `smoke42.mjs` (integration alone is not enough,
  the community arriving is, settlement alone is not, settled-and-integrated
  is), `smoke44.mjs` (both halves across all seven bookmarks; a non-Jewish
  pen still writes on integration alone), `smoke46.mjs`, and `smoke72.mjs`
  (the absorption event as the in-campaign road).

## 96. Recognition, not alliance — the peace available across an old line

Some enmities never end in a pact. No Arab capital was ever going to put its
name under a military alliance with Israel, in 1948 or after Washington in
1979; what was signed instead was recognition — an exchange of letters that
turns an armistice into a peace and obliges neither army to fight for the
other. The game had only the alliance, so a warmed-up Egypt could be talked
into a defensive pact, which is the one thing that could not happen.

- **The bar** (`allianceBarred`, military.js): a bookmark may declare
  `diplomacy.noAlliance: [{ between, and, why }]` — blocs whose members may
  never ally ACROSS the line, in either direction, formables included (the
  Kingdom of Israel; the UAR). The bar answers before every other reason in
  the panel, refuses inside `offerAlliance` itself rather than only greying a
  button, and is honored by scripted pacts through `helpers.allianceBarred`.
- **Recognition** (`recognizeCore`): era-gated by `diplomacy.recognition`
  (1948 only — the ancient bookmarks have no such instrument and show no
  button). Signing costs influence and a court warm enough to receive the
  letters; it ends a strictly BILATERAL war where it stands (a wider
  coalition war must be settled at its own table first), retires the era
  rivalry, and lifts both courts to the recognition floor. While it stands,
  `declareWar` refuses in both directions — the single choke point, so the
  player action, the AI's wars of opportunity, its coalitions and its
  containment wars all obey it — and the AI skips a recognized neighbor
  before it ever gets there.
- **Renouncing it** (`renounceRecognitionCore`) is an act of state: the
  other court's opinion collapses and the renouncer's public mandate falls.
  It is the only road back to war, and everyone watches you take it.
- **The treaties sign real ones**: the Treaty of Washington recognizes Egypt
  and Israel to each other (alongside its permanent peace restraint), and
  the Arava treaty of 1994 does the same for Jordan — the mechanic and the
  history are the same object.
- **Regression contract**: `smoke72.mjs` — the bar in both directions and
  only across the line, the era gate, the letters ending a bilateral war and
  forbidding the next one, the refusal and its two-year cooldown, the panel's
  reasons, the renunciation's costs, and both treaties.

## 97. After the armistice — the arcs the region actually had

The 1948 chain ran from the declaration to the rotation agreement of 1986
through Israel's own history. The region's other histories were missing: the
party that took Damascus and Baghdad, the organizations that became a state
inside two other states, and the uprisings that ended the age of wars between
armies. These fire on the world's clock (`world: true`, with `decider` set to
the court whose decision it is, so a player elsewhere gets a notice rather
than someone else's choice) and gate on the world they find (`when`), so a
campaign that diverged does not have the old rails forced back onto it.

- **The republics turn**: the Ramadan revolution (1963), the eighth of March
  in Damascus (1963), the seventeenth of July in Baghdad (1968), the
  Corrective Movement (1970) and the hall in Baghdad (1979). Each rebrands
  its state in place where history did (SPEC §68): `SYR_BAATH`, then
  `SYR_FAR` — Assad's Syria under the hawk of the federation, which is also
  how the two Ba'athist banners stay apart at chip size — and `IRQ_BAATH`.
  The Iran–Iraq war (1980) is a real war on the map, and the debt it leaves
  is why the army goes south in 1990.
- **The fedayeen years**: Karameh (1968) makes the organizations a fact, the
  Cairo Agreement (1969) licenses them in Lebanon, Black September (1970) is
  now an actual civil war — a rebel host in the kingdom, not a modifier —
  and Ajloun (1971) either clears it and sends the organizations north, or
  does not, and keeps them.
- **The Lebanese war** (1975–85): the bus at Ain al-Rummaneh, the Syrian
  Deterrent Force taking the Beqaa and Tripoli on the map, Litani and the
  security belt, Peace for Galilee — a declared war with real formations,
  drawing in a Syria that holds the Beqaa — Sabra and Shatila with its
  commission, and the withdrawal that invents the next adversary.
- **The uprisings and the peace**: the First Intifada (1987), Jordan's
  disengagement (1988), the Gulf War's thirty-nine warheads and the sealed
  rooms (1991), Oslo's letters (1993), the Arava treaty (1994), the square
  in Tel Aviv (1995), and the second uprising (2000).
- **The banner over Athens**: 1948's Greece flies `GRC_MOD`, the modern nine
  stripes and cross, rebranded at bookmark setup; the laurel wreath stays
  with the leagues and cities of the ancient chapters.
- **Regression contract**: `smoke72.mjs` — every arc's map-visible outcome
  (rebrands and rulers, the rebel hosts spawning and clearing, the Beqaa
  changing hands, the 1982 war and its Syrian front, the Iraqi army after
  the hundred hours, the uprising modifiers lifting at Oslo) and the modern
  Greek banner.

## 98. Crises that brew — the succession, the books, and the era's own

A state does not fall over in a month. It runs a deficit for two years and
then cannot pay the garrison; a king ages without naming an heir and the
court spends a decade deciding what happens next. `js/sim/crisis.js` is the
slow clock under those sentences.

- **Heat and stages**: every crisis carries HEAT (0–100) on the tag
  (`t.crises[id] = {heat, stage}` — plain save data), rising while its cause
  holds and falling while it does not. Stages bite at 34 / 67 / 100, each
  owning exactly one tag modifier (`crisis_<id>`) that is replaced on a stage
  change and removed when the crisis ends, so nothing leaks into a save.
  Stages fall with hysteresis (12 heat), so a realm that fixes its books
  climbs out instead of flickering. The player gets a card at each new stage
  (dynamic event, cooldown 24 months); other courts' crises are world news.
- **A plateau, not a countdown**: `pressure()` may return `{delta, cap}`. A
  living king with no son yet is a RISK — it brews to the whispers and stops
  (cap 45). What pushes past it is an event: a regency, a pretender in the
  field, belief collapsing, or the heirless death itself, which `rulerDies`
  raises to 70 outright (`raiseCrisisTo`). The same shape gates 1948's Closed
  Sea: closed markets alone plateau; a naval blockade takes it all the way.
- **The succession** (every age with heirs; 1948 turns it off with
  `mechanics.succession: false`): whispers → two claims, one throne → the
  succession war, which raises an actual pretender host through the §87
  rising machinery. While it stands at stage 2+, a house bound by ROYAL
  MARRIAGE holds a `succession` casus belli (`successionClaim`) — the war
  goal that already existed and that the AI presses toward subjugation
  (`pressSuccession`, ai.js). A court with no marriage needs the thing to be
  past arguing: stage 3, with a pretender in the field.
- **The books** (every age with money): the pay is late → the creditors call
  (unpaid advisers walk out) → bankruptcy, which repudiates the debts, empties
  the chest, costs 2 stability and 20 legitimacy, and sends a quarter of the
  army home. Then it cools: bankruptcy is a moment, not a permanent state.
- **The era's own**: a bookmark may declare `crises: [...]` in the same shape.
  1948 has **The Closed Sea** (what a blockade does to a state that imports
  its war) and 66 CE has **The Factions in the City** (three courts in one
  Jerusalem, the granaries burned, war inside the walls).
- **Regression contract**: `smoke73.mjs` — the plateau, the heirless death,
  the stages and their modifiers, the pretender the third stage raises, the
  claims it hands to married houses, the full bankruptcy sequence and its
  cooling, and both era crises.

## 99. The ladder ends where the age does

Racing ahead of the age was meant to be expensive, not a road to rifle
brigades at Masada. `TECH_MAX` is the ladder's length; `bookmark.techCeiling`
is how much of it a century can climb.

- 167/67/40 BCE and 66/132 CE stop at 9 — professional legions.
  614 CE stops at 13 — thematic regulars, the last pattern that age knew.
  1948 runs to the top, because it is the age that really had them.
- `cappedGen` (tech.js) holds any military level to the ceiling, so `tagGen`,
  `navalGen`, recruitment, modernization and every UI label field the era's
  pattern even if a save or a scripted gift pushed the level higher. The
  player's ladder refuses the purchase in the age's own words, and no
  unreachable "next pattern" is dangled in the panel; `aiTech` never buys past
  it either.

## 99b. The Eastern Desert is Egypt's, and only Egypt's

The atlas cell named for Egypt's Eastern Desert was drawn with a weight that
let it jump both gulfs: it held the ground between the Nile and the Red Sea,
the southern half of the Sinai peninsula, and a wedge of north-west Arabia
around the Tabuk approaches — one province bordering Aila and Hegra at once.

- The seed is lighter (1.8 → 1.2) and carries a `provinceRasterRegions`
  envelope (SPEC §95's machinery) that follows the Nile's east bank, the head
  of the Gulf of Suez and the Red Sea shore. Everything it used to hold beyond
  that goes back to the land it belongs to: the peninsula's tip to Sinai
  Interior (which now reaches Ras Muhammad at 27.7° N), the Arabian side to
  the Hejaz cells, and the western fringe to Libyan Desert and Thebes.
- `tools/geom-snapshot.json` was regenerated from the browser raster
  (`tools/tests/dump-geometry.mjs`) — the adjacency really changed: Eastern
  Desert's neighbors are now Libyan Desert, Myos Hormos and Thebes, and
  nothing else.

## 100. The pressure short of war — embargo and blockade

Western capitals did not raise leagues against Middle Eastern states over
border wars. They closed markets, suspended credit, and — when they meant it —
put destroyers across the approaches.

- **No league where the era had none**: `coalitionAgainst` is gated by
  `mechanics.coalitions`, which 1948 sets false. The punitive league, the
  hegemon containment and the defensive coalition all fall silent there.
- **Embargo** (`js/sim/embargo.js`, era-gated by `diplomacy.embargo`): a court
  closes its markets to another. The first embargo takes a quarter of the
  target's trade income and each further court a tenth more, floored at 30%.
  It is public (−40 opinion), reversible (+20), and rides `game.embargoes`.
- **Blockade**: an embargoing court WITH HULLS AT SEA can close a coast. Every
  coastal province the target holds earns half its ordinary revenue — customs,
  market turnover, shipyard hulls and the routes through the harbor alike —
  and what is left of its trade is cut again. This is the instrument that
  empties a treasury, and it feeds 1948's Closed Sea crisis (§98).
- **The AI reaches for what it has**: in an age without leagues a court that
  detests a neighbor (opinion ≤ −80) signs a letter instead of a declaration,
  runs at most two at once, never embargoes a state it is already at war with
  (the war IS the embargo), and lifts them when relations warm. Blockades
  need the bottom of the opinion scale and a fleet.
- **Regression contract**: `smoke73.mjs` and `uitest35.mjs`.

## 101. What a treasury can hold, and what an heir inherits

Two related exploits: an untouched minor banked thousands for decades, and
whoever absorbed it took the lot.

- **The hoard ceiling**: a court may hold `hoardCapMonths` (18) of its own
  gross income, never less than `hoardCapFloor` (150). Six percent of the
  EXCESS drains every month into palaces, walls, salaries and the pockets of
  the men who count it — so a treasury settles where the drain meets the
  surplus instead of climbing forever. Rich realms can still save for a
  campaign; poor ones cannot pretend to be rich. The ledger names the line
  ("The court consumes").
- **The inherited share**: incorporating a client brings
  `inheritTreasuryShare` (25%) of its coffers, capped at a year of that
  client's own income — the rest was already owed, spent, or is in somebody's
  cellar. The chronicle says how much reached the capital.
- **Regression contract**: `smoke73.mjs` — the floor, the drain, the settling
  point, and the capped inheritance.

## 102. The crown is new; the country is not

Forming a nation used to hand out the same +10% income and quietly empty the
panel: the estates vanished, the objectives went blank, and the mission chain
stopped, because every one of those tables is keyed by tag.

- **Lineage** (`switchTagCore`): a formed nation records what it was
  (`t.lineage`, `t.formedFrom`). `contentForTag` walks that chain, so the
  estates keep convening, the era keeps stating its objectives, and anything
  else addressed to the predecessor keeps answering.
- **Its own programme**: a formable may carry `missions: [...]` written against
  the NEW tag; `missionsFor` prefers the bookmark's own table and falls back to
  the crown's. The Kingdom of Israel gets four (settle the crown, muster the
  kingdom, the land of the twelve, build rather than hold) and the restored
  Hasmonean crown three; forming resets the chain to its first line.
- **Its own payoff**: each crown now pays differently — coin, men and
  ministries (`bonus.grant`) plus a second permanent modifier that says what
  that kingdom is FOR. The Kingdom of Israel's Law Is the Charter (manpower,
  belief, discipline), the Hasmonean Priestly Crown (order and belief),
  Herod's Builder King (trade and belief, no levies), the UAR's One Republic,
  Two Capitals, and Rome's The Name Restored.
- **Regression contract**: `smoke73.mjs` — the estates surviving the
  proclamation, the objectives still answering, the new mission chain in the
  panel from its first line, and the crowns paying differently.

## 103. The phone campaign

Every batch since v6 added chrome — crises, recognition, embargo, chapters,
doctrine — and all of it was designed at 1440px. On a 390px phone the topbar
sheds its four tool buttons by design (`max-width: 430px`), and a phone has no
keyboard, so the chronicle, the ledger, the primer, the quill and the shelf of
saved campaigns had no way in at all: **a handheld campaign could not save
itself.** This section is the handheld pass.

- **The tools sheet** (`.tb-more` → `#tools-sheet`): one button in the topbar,
  shown wherever the tool buttons are hidden OR the floating sound buttons are
  (every coarse pointer under 900px), opens a grid of 44px+ tiles —
  Chronicle · Ledger · How to play · Save · Campaigns · Music · Sound. Each
  tile calls exactly the handler its desktop button calls, so there is one
  behavior and two doors. Escape closes it before anything else.
- **The sound toggles stop covering the game**: `#ju-sound-btn` and
  `#ju-music-btn` are fixed at z-9999, which put them on top of the mapmode
  grid (grown to three rows since the trade and diplomatic modes) and on top of
  the first row of every bottom sheet. On handhelds they stand down and the
  sheet carries both toggles instead; the mapmode grid gets its corner back.
- **Thumb-sized where it counts**: the coarse-pointer pass already gave small
  controls invisible 40px pads. The buttons a campaign is actually played with
  — `.pp-dip`, `.pp-build-btn`, `.np-fac-btn`, the peace table's own controls —
  have visible bounds in two-column grids, where an oversized pad would overlap
  its neighbour, so they get real height (40px / 36px) instead.
- **Rows that stack**: a long value (three communities in one province, "22
  provinces · 183 dev") used to wrap back under its own label. On a sheet the
  label and value stack.
- **Landscape is a side panel, not a sheet**: at 844×390 a bottom sheet left a
  strip of map. Under `(pointer: coarse) and (orientation: landscape)` the
  province and realm panels stand full-height on the left at ≤58% width, and
  the mapmode grid and group toggle move to the right, clear of each other.
- **The title screen fits**: `.bm-card` was a fixed 310px inside a carousel
  viewport of `100vw − 128px`, so every phone read the era blurb with its right
  edge sliced off. The card is fluid now, and the map's own controls hide while
  the title screen is up instead of showing through it on tall screens.
- **Regression contract**: `uitest36.mjs` — a real 390×844 touch context that
  checks the title card fits, the tools button appears where the tool buttons
  do not, every shed tool is on the sheet, the ledger opens from it, the quill
  writes a campaign to the shelf and the shelf opens again, diplomacy buttons
  are thumb-sized, a long value stacks, nothing spills sideways, and landscape
  really becomes a side panel.

## 104. What spreads without a state behind it

Two bookmarks had a hole in them of the same shape. The 132 CE chapter — whose
conventional dates are the ones historians reach for when asked when Judaism and
Christianity became two religions — contained the string `christianity` exactly
zero times, while its world clock stopped in 166 and left every campaign that
survived running on triggers keyed to Judaea's own state in front of a world
that had stopped happening. The 614 CE chapter rendered religion entirely as
politics (who holds Jerusalem, who gets the Cross, whose churches burn) in an
age whose two great powers each had a state church. And the engine underneath
both had exactly one conversion path: a state spending influence to convert a
province it already owned, to the faith it already held. Nothing modelled a
religion crossing a border on its own, which is the only way the largest
religious change of the period actually happened.

### The drift (`monthlyFaithDrift`, `sim/realm.js`)

- **A declarative table, per bookmark.** Content owns the politics, the engine
  owns the arithmetic: `faithDrift: { christianity: { from, resistedBy, core,
  seeds, seedOwner, seedShare, curve, vigor, spreadsAlong, monthlyCap } }`.
  `curve(year, ctx)` is the age's own pull — near zero when Bar Kokhba's coins
  are struck, steepest through the third century, all but complete by
  Theodosius. Gated by `mechanics.faithDrift`; a bookmark with no table pays
  nothing.
- **It moves people, never map paint.** Every write goes through
  `driftPopToReligion` on `p.pop` shares, and `p.religion` changes only when the
  largest community changes — so a province is converting for two centuries
  before it is converted, and the last Jewish quarter of a Christianized city
  stays on the map because it is a real community and not a label.
- **Arrival is not growth.** A faith does not seep in a hundredth of a soul at a
  time: a congregation is founded — at a `seeds` city, anywhere a `seedOwner`
  crown rules, or wherever there is a real congregation within reach — and then
  grows logistically like every other congregation. `spreadsAlong: 'trade'`
  makes a shared route count as adjacency, which is how an urban, sea-lane
  religion reached Alexandria before it reached the Negev.
- **Resistance is the whole point.** `from` communities convert freely;
  `resistedBy` communities convert at what their cohesion leaves, and only once
  the faith is the weather outside — measured against what is *left* to convert
  freely, not against the province. How hard it presses depends on whether it
  has the state: a faith spreading on its own credit barely touches a resisting
  community (three hundred years of preaching did not empty the Galilee), while
  a faith that IS the owner's establishment — Theodosius after 380, a caliphal
  governor with an assessment roll — presses everything left the moment it runs
  out of easy ground. That is the difference between an argument and a tax.
- **`core` is the remnant that never goes.** Every faith on this map outlasted
  the empire that pressed it; a mechanic that lets one vanish to the last
  household is telling a lie about all of them.
- **It is not reversible.** `convertProvince` can still reclaim a province's
  state faith outright, and the drift resumes the following month. A player can
  change where a religion goes, and how fast, and never whether.
- **Calibration**: seeded at ~1% in 132, the Greek east passes 2% around 250,
  8% around 300, a third by 350 and two thirds by 400, with the Galilee, Gerizim
  and Babylonia still their own — near enough to the demographic estimates, and
  the resistance clause is what makes the shape rather than the totals.

### The god-fearers

The *theosebeis* — gentiles who kept the sabbath and the ethics without
accepting circumcision — are a third share inside `p.pop`
(`godfearers`, seeded in the synagogue cities of the Greek east), drawn on
monthly by both claimants. `bookmark.godfearers.weigh(ctx)` returns each
mission's pull; the engine scales it by that mission's presence on the ground
and moves the pool. Judaism's pull rises with a standing Judaean state, a
Sanhedrin with an address, a calendar the Land still fixes, and a proselyte
statute the state defended — and it is **zero, permanently**, once the mission
is barred.

This turns `ev2_antoninus_rescript` from a relief card into the hinge of the
chapter. Read the rescript twice: Jews may circumcise *their own sons* — and
whoever circumcises a man not of that nation suffers the penalty of the
castrator. `ev2_proselyte_ban` is that second clause. Accepting it buys real
quiet and closes the mission field forever; refusing keeps the field under a
capital statute. Nothing later reopens it, because nothing later did.

### The suspicion a foreign patron buys

`foreignPatron: { christianity: { patron: 'BYZ', freedFlag } }` (614) states
both halves of the Sasanian asymmetry with one rule: a large congregation whose
co-religionists rule a power its own crown is fighting carries unrest, and one
whose co-religionists rule nowhere does not. It explains Shapur II's
persecutions and it explains why Persian Jews, having no emperor over the
border, were generally safer than Persian Christians — and `ev_p_not_romes_church`
clears it permanently by schism, which is precisely why the synod was held.

### The content

- **The Christian thread** (`events_132ce_faith.js`, eight cards): Bar Kosiba
  putting the oath to men who will not curse a rival messiah; the fifteen
  circumcised bishops of Jerusalem and the gentile sixteenth; the proselyte
  clause; Marcion expelled and the Hebrew scriptures kept, so the two go on
  disputing the same inheritance; Trypho; the fourteenth day, which is the
  churches of Asia taking their year from a court in Galilee; who stayed with
  the sick in the plague; and Melito preaching the deicide charge in the city
  with the largest synagogue in the empire.
- **The world spine** (`events_132ce_world.js`, nineteen cards, 175–425): the
  two civil wars an eastern court must choose sides in, Ardashir, the universal
  citizenship, the crisis, Decius's certificates, Valerian kneeling, Palmyra and
  Aurelian, Armenia converting a decade before Constantine, the Great
  Persecution through Milan, Nicaea's calendar clause, Julian's foundations, and
  *Cunctos populos*. The rule for admission is that it happens whichever way the
  revolt went; the two that do not (`ev2_gallus_revolt`, `ev2_patriarchate_ends`)
  carry `when` gates and retire into the ledger instead.
- **Persia** (`events_614ce_persia.js`, five cards): the apostate marzban, the
  catholicate left vacant rather than martyred, the synod that cuts the middle
  term out of the charge, the broken oath at Tiberias and the baptism decree,
  and the jizya as a gradient rather than a sword — which hands `islam` to the
  same drift engine with `seedOwner: 'RSH'`, because Islam arrived with a
  government and Christianity did not.

### Housekeeping the spine required

- **Era windows**: all thirty-four triggered cards in the 132 chain now carry
  `minYear`/`maxYear`. They did not need them while the clock stopped at 166; a
  campaign that reaches the fourth century must not be handed Akiva's arrest
  because the world finally satisfied a predicate a hundred and fifty years late.
- **`retireAffinityCore`**: an event may now annul one of a bookmark's inherited
  friendships, mirroring `retiredRivalries`. Ardashir uses it — the bond that
  offered Bar Kokhba silver was Arsacid, and it dies with the Arsacids.
- **The religion mapmode stripes the largest minority** at 20% or more, so the
  drift is legible while it is still happening rather than only when a province
  flips.
- **The divergence page says what a long retirement list means** before the
  reader decides for themselves: in a surviving Judaea those pages are the
  measure of the divergence, not a tally of losses.
- **Two decisions on the open questions.** There is no `endDate` in the engine
  and the spine needs none — the last world card is the horizon in practice. And
  132's `techCeiling` stays at 9: a fourth-century campaign still fielding the
  professional legion is very nearly right, and a Bar Kokhba campaign that could
  rush its way to armored lancers would not be.
- **Regression contract**: `smoke74.mjs`.

## 105. The region's own quarrels

Four threads the 1948 chapter had the shape of but not the substance of, plus
the engine operation the map had never had.

### A union that comes apart (`secedeTagCore`)

Every political change the game could model was a conquest, a rename
(`switchTagCore`) or a peace-table release. None of those is what happened in
Damascus on the 28th of September 1961, and the absence had a real cost: the
1958 card merged Syria into the UAR and **nothing ever dissolved it**, so a
campaign that saw the union form lost the entire Syrian arc — the Ba'ath,
Assad, the Golan, Lebanon — because every one of those cards gated on a tag
that no longer existed.

`secedeTagCore(ctx, from, to, {provinces, share, ruler, flag, opinion})` splits
a state: the parent survives, a named set of its provinces leaves under its own
banner with the garrisons standing on them, a share of the treasury and the
muster rolls, the institutional inheritance (tech, reforms) — and none of the
parent's wars, because walking out of a union is the whole point. A secession
with no province behind it is a proclamation and is refused.

`ev_i_secession` (September 1961) breaks the union **into Egypt and Syria**:
Syria leaves as a genuinely new tag — **SAR**, the Syrian Arab Republic, the
name it took that week and kept for the rest of the century — and what is left
goes back to being Egypt under the Free Officers' banner. If the union never
formed, Syria takes the new name in place. Either way SAR exists from 1961 and
the Syrian arc answers to it. The refusal branch holds the union by force, and
in that world the 1963 and 1979 Syrian cards correctly retire, because the
republic whose officers made them does not exist.

- **A decider may be a function.** Damascus is SYR, then SAR, or the union, and
  a `decider` fixed at authoring time cannot name a court whose name the
  century decides. `fireEvent` now resolves `ev.decider(ctx)` when it is a
  function; a string behaves exactly as before, and the wiki (which reads the
  chain with no world to resolve against) omits the badge rather than guessing.
- **SAR breaks apart in its turn**: `ev_i_brotherhood_uprising` (1979) and
  `ev_i_hama` (1982), whose second option is the one where the republic of
  officers keeps its capital and loses the country around it.

### Suez as a crisis rather than a headline

The chain had the nationalization and then a decade of silence. Now:
`ev_i_sevres` (the collusion protocol, and a refusal branch that means no
campaign at all), `ev_i_kadesh` (the drop at the Mitla and the hundred hours),
`ev_i_port_said` (the ultimatum arriving on the schedule it was written to) and
`ev_i_suez_ultimatum` (Eisenhower, the withdrawal, UNEF and the open Straits —
which is also where the 1967 tripwire gets set).

### Eli Cohen

`ev_i_kamel_amin_thaabet` and `ev_i_marjeh_square`. Running him produces the
Damascus file; extracting him instead keeps the officer and retires the
hanging card for good. The eucalyptus story is in the card's prose and flagged
as unsupported, because it is: what is documented is duller and worth more.

### Tehran, and the border it reaches

`ev_i_iranian_revolution` (February 1979) turns the most reliably aligned
capital between Ankara and the Indus into the one that will still be arming
Israel's enemies in fifty years — a theocracy, a purged officer corps, and
opinion at −180. `ev_i_hostage_crisis` follows.

The point of putting it here is the junction: **`ev_i_hezbollah` requires both
the revolution and the 1982 occupation.** Neither alone produces it, which is
the whole causal claim the chain was making in prose ("an adversary that did
not exist in 1982") without ever modelling. From it: `ev_i_barracks` (1983),
`ev_i_accountability` (1993), `ev_i_grapes_of_wrath` (1996, and Qana), and
`ev_i_blue_line` (May 2000), which lifts every modifier the occupation was
carrying and retires the rounds that belonged to the zone.

### Two engine repairs the batch turned up

- **The balance harness was running a different game.** `autorun.mjs` imported
  each era's events module by name, so it never saw anything concatenated onto
  a chapter in `compendium.js` — including §104's world spine and Christian
  thread. It reads `compendium.ERAS` now, so a package is in the harness the
  day it is registered, and the numbers describe the game people play.
- **A pen written mid-campaign made a province unaddressable.** `ctx.prov` and
  `ctx.provId` indexed names at boot; once Israel finished integrating
  Jerusalem it became Yerushalayim, and content that walked the province list
  and addressed a province by its own `p.name` silently missed. Both now fall
  back to the live board and cache the hit.

- **Regression contract**: `smoke75.mjs`.

## 106. The royal century

The Maccabean chapter carries the revolt magnificently and then thins out
exactly where the state it made becomes a kingdom. It had Hyrcanus dying full
of years, Aristobulus taking the diadem, Salome opening the prisons and
crowning Jannaeus — and then, for a twenty-seven-year reign, three cards: the
citrons at the altar, the Seleucid king the rebels invited, and the eight
hundred crosses. The wars were missing entirely. And Salome Alexandra — the
only woman ever to rule this kingdom, the only Hasmonean to die in bed with the
country at peace — was crowned by the deathbed card and then had nothing happen
in her nine years at all. Four hundred years of dynasty ended in a flag.

`events_167bce_kings.js` is that century, ten cards from 103 to 67 BCE.

### The wars of Alexander Jannaeus

- **Asophon** (−103): the new king besieges Ptolemais, Ptolemais sends to
  Cyprus, and Ptolemy Lathyrus destroys the Judaean army on the Jordan. Eight
  years after it started calling itself a kingdom, Judaea has no army.
- **Ananias** (−102): Cleopatra III comes north to a country lying open, and a
  Jewish general in Egyptian service tells her that annexing Judaea would cost
  her Alexandria. She listens. The refusal branch is the world where she does
  not — and Egypt buys a province at the price the general named.
- **Gaza** (−96): a year's siege, a gate opened by treachery, and the choice
  between levelling the city (the record) and keeping the terminus of the
  incense road. The largest Jewish state between Solomon and 1948, and an army
  that has learned to do this at Gaza is one a king can be tempted to use at
  home.
- **Obodas** (−93): the ravines, the camels driven into the defile, and a king
  who reaches Jerusalem alone — which turns a quarrel about a festival into six
  years of civil war between Jews.

### The queen

- **A queen cannot offer the sacrifice** (−76): the crown and the high
  priesthood — the fusion the whole Hasmonean idea rests on — come apart
  because a woman cannot stand at the altar. It is meant as an administrative
  convenience and it is the end of the dynasty's constitutional premise.
- **Simeon ben Shetach** (−75): the Pharisees back in the Chamber, a house of
  study in every town — and the reckoning against the men who advised the
  crosses, which is precisely where her younger son gets his party. The pardon
  branch is the one card in the chain that materially changes 67 BCE.
- **The queen's establishment** (−74): she doubles the army, garrisons the
  fortresses, pays the neighbouring princes, and then fights nobody for nine
  years. Peace bought with a standing army is still bought.
- **Tigranes at Ptolemais** (−69): the largest army the kingdom has ever had
  pointed at it, turned back by presents and by Lucullus taking Tigranocerta a
  thousand miles away. The first time Judaea's fate is decided by a Roman
  general who has never heard of it.
- **Twenty-two fortresses** (−68) and **the last reign that ended in bed**
  (−67): Aristobulus leaves the city at night, the queen dies at seventy-three,
  and the brothers meet at Jericho — which is the exact state the 67 BCE
  chapter opens in, with a pretender host in the field and Hyrcanus II on the
  throne. The council branch averts the war and hands Pompey one state instead
  of two, which is not the same as handing him a problem.

Every card resolves the crown at runtime, so a campaign that formed a greater
kingdom still gets its royal century, and one with nobody in Jerusalem retires
it rather than narrating a king who is not there.

### One bug the batch turned up

`spawnAt` picks the first province a tag CONTROLS — which is correct for a
state and silently useless for rebels, who control nothing. Two cards in §105
and two here would have opened a civil war with no army in it. Both files now
carry `spawnRebels`, which asks only whether there is passable ground.

- **Regression contract**: `smoke76.mjs`.

## 107. The preposition

"Transjordan" is not a name, it is a direction: the land ACROSS the Jordan, as
seen by draftsmen standing in Jerusalem. The chapter opened with the tag named
Transjordan and it stayed Transjordan forever — through the annexation of the
West Bank, Black September, the disengagement of 1988 and the treaty at Wadi
Araba, all of which the chain already narrates using the word "Jordan" in their
own prose. Only the state's name never moved.

`ev_i_kingdom_of_jordan` (April 1949) renames the tag in place. What makes it
worth a section rather than a one-line edit is that the rename is a **map fact,
not a calendar fact**: Amman dropped the preposition because the kingdom now
stood on both banks, and a Legion pushed back over the river has no reason to
stop being the country across it. So the card is `date` + `when`, gated on
Jordan holding at least three of the West Bank cells, and its opposite number —
`ev_i_still_transjordan` — carries the complementary gate. Exactly one fires;
the other retires into the divergence ledger, which is where a player who took
the hill country will find the page the kingdom never got.

The banner does not change: the Hashemite tricolour has been the same since
1928 and serves both names.

### Two test-coverage gaps this turned up

- **`smoke39` read the era files, not the registry** — the same gap the balance
  harness had in §105. Its invariant (nothing the player is asked to answer may
  offer one answer) was therefore silently not applied to any concatenated
  package. Pointed at `compendium.ERAS`, it immediately caught `ev2_trypho`
  from §104, which was a one-option card the player was being asked to decide.
  Both are fixed; the sweep across all seven chapters is now clean.
- The general lesson, twice over: **a test or tool that names era files by hand
  stops seeing content the moment a chapter becomes more than one package.**
  Anything walking the chains should read `compendium.ERAS`.

- **Regression contract**: `smoke75.mjs` (the §107 section).

## 108. Occupation is not possession

`ctx.helpers.controls(tag, province)` is true the moment an army is standing
there. That is the right test for a campaign — settle behind our own lines,
the Akra is ours this month, the front has reached the lake — and it is the
wrong test for a card that says an inheritance has been TAKEN.

The whole greater-kingdom strand of the Maccabean chapter was built on it.
"Damascus, Which David Took" fired because a column was outside the walls;
"The Gates of the Sea" laid down a permanent fleet at Tyre and granted harbor
dues in a harbor that uti possidetis would hand back to Antioch the moment the
war was settled; the Philistine coast and the cities of the nations were
claimed by marching through them. Worse, the strand's own gate had it too:
Jerusalem OPENS this bookmark under Seleucid ownership — the Akra is a royal
garrison — so `greaterVictory` was satisfied the first month a Maccabean force
held the city, years before any treaty said so, and every card behind the gate
came with it.

`holds(ctx, tag, name)` is the honest predicate: the province is ours on the
map **and** nobody is occupying it. The strand now runs on it — `holds`,
`holdsAny`, `countHeldOf` — including its gate, and the per-province loops
inside its effects agree with the triggers that admitted them. The royal
century's Gaza card asks the same question, since its own effect is the
annexation.

Nothing is lost by this: the war's settlement applies uti possidetis, so a
Judaea that has actually won the city owns it. The strand opens at the peace
instead of at the first patrol, which is when those cities actually opened
their gates.

The revolt-era checks that really do mean control keep it — a card about
where the army is standing this month should ask where the army is standing
this month.

- **Regression contract**: `smoke76.mjs` (the §108 section), which reproduces
  the reported case directly: mid-war, occupying every great city and owning
  none of them, five cards fired before and none fire now.

## 109. A released state has to be somewhere

Both release paths at the peace table group the enemy's provinces by an
ABSTRACTION — the nation that was born owning them (`eraOwnerOf`), or the
culture and faith that live in them — and neither abstraction knows anything
about geography. Against the Seleucid empire that produced, in one row, a
"Greek State" of twenty-two provinces in five disconnected pieces: nine in
Anatolia, five in the Decapolis, three on the Philistine coast, three on the
Syrian coast and two in Samaria. That is not a country. It is a census
category with a flag. Four of thirteen rows on that table were broken the
same way.

A release is now resolved to one piece of connected land before it is offered:

- `landComponents` partitions a group over the land adjacency the armies walk.
  An island pocket is its own piece and usually loses to a mainland one, which
  is right — a state released across a sea it cannot march is the same bug
  wearing a boat.
- `contiguousRelease` picks which piece. A state that already exists and holds
  land is enlarged by a piece **touching what it already has**, so a second
  treaty grows a country instead of scattering it; among several touching
  pieces the most valuable wins. A state being created or restored from
  nothing takes its largest piece and is seated inside it. The living-state
  lookup goes by `releaseIdentity` rather than by the generated tag, which can
  collide.
- Provinces outside the chosen piece simply stay with the enemy. The row lists
  exactly what it contains, so the table is not lying about the deal.

The same thirteen rows now read as countries: an Aramean state around
Damascus, the Phoenician coast from Dora to Aradus, a Judean state, Greek
Anatolia, Galilee, the Persian heartland.

### The degenerate graph

A bare headless harness builds `neighbors` as an array of empty sets, which is
indistinguishable from a map where every province is an island — and would
have fragmented every release into single provinces (it did: `smoke47` failed
nine assertions the first time). A graph with no edges at all cannot answer
the contiguity question, so `geomHasEdges` declines to ask it. `smoke77`
covers this explicitly, and runs everything else against the real snapshot,
because the bug is invisible on the empty graph the older peace-table suites
build.

`secedeTagCore` takes an authored province list rather than deriving one, so
the engine cannot fix it — but the authored list must still describe a
country, and `smoke77` pins the 1961 Syrian secession as one contiguous piece.
That check catches an author, not a bug.

- **Regression contract**: `smoke77.mjs`.

## 110. The pen widens, and the crown gets one of its own

The integrated-names table (§95) was audited against the list of provinces a
Jewish state can plausibly hold, and seventy-three of them had no Hebrew entry.
Most of those absences are correct — the file is a deliberately conservative
pen, not a Hebrew-name generator, and a town with no attestation stays under
the name the era gives it. Seventeen were not. They are now in:

- **The Judaean gaps the file simply missed**: Masada → Metzada, Tarichaea →
  Migdal, Jenin → Ein Ganim, Ramallah → Ramah, Rafah → Rafiah.
- **The southern and desert frontier**: Rhinocolura → Nahal Mitzrayim, Petra →
  Rekem, Bostra → Botzrah, Caesarea Philippi → Panias.
- **Arabia**: Yathrib → Yatrib, Khaybar → Heivar — the two towns of the Hijaz
  with real Jewish settlement behind the name.
- **The Syrian and Phoenician coast**: Berytus → Berotai, Tripolis → Trablus,
  Emesa → Hims, Laodicea → Ludkia, Apamea → Afamia.
- **Roma → Romi**, which is what the rabbinic sources call it, and which a
  Jewish state that ever holds the city has earned the right to write.

Five candidates were deliberately refused: Khan Yunis, Qalqilya, Tulkarm,
Gadora and Hatra have no defensible Hebrew name, and inventing one would break
the rule the file exists to enforce. `smoke78` asserts their absence, so the
refusal is a contract rather than an oversight.

Transliteration is unpointed ASCII throughout — Gush Halav, not Gush Ḥalav;
Hims, not Ḥims. That was already the file's practice and it is now stated at
the top of it and asserted in the suite, because a table half in ASCII and half
in combining diacritics sorts and greps as two tables.

**A crown pen.** `TAG_INTEGRATED_NAMES` is a second, higher-precedence layer
keyed by tag. It exists for the Kingdom of Israel (`MLI`), which is not merely
a Jewish state but a specific claim: that the twelve tribes are restored. A
state making that claim does not sign Sebaste "Shomron"; it signs it
**Har Ephraim**, and Scythopolis **Nahalat Yissakhar**, and Joppa
**Nahalat Dan**. Twelve provinces carry the allotment names. Where the crown
table is silent the shared Hebrew pen still applies — Jericho is Yeriho to the
Kingdom of Israel as to anyone else — so the crown pen is an overlay, not a
replacement. Resolution order in `resolveDisplayName` is: crown pen, then the
bookmark's own `integratedNames`, then the shared Jewish table.

**The condition, relaxed.** `ownersCommunity` used to require the province to
hold a community of the crown's *exact* culture. That is wrong for the same
reason a nation is not a village: the Herodian kingdom's court culture is
idumean and Adiabene's is assyrian, so between them those two Jewish states
could satisfy the condition on three provinces on the entire map and never
wrote a Hebrew signpost anywhere. The test is now the culture **group**
(`sameKind`), so a judean congregation satisfies an idumean crown and a
Babylonian one satisfies Adiabene. It is a relaxation, not an abolition: a
hellenized Jewish community of the same faith but a different group still does
not, which `smoke78` pins in both directions.

- **Regression contract**: `smoke78.mjs` (the §110 sections) and `smoke46.mjs`,
  whose MLI assertion now expects the allotment name.

## 111. A century in which only Judaea happened

Two bugs, reported from one playthrough. A 167 game in which Judaea did very
well kept Judah Maccabee in the seat from age 26 to age 56 and then handed the
realm to John Hyrcanus, his great-nephew, skipping two brothers. And Rome —
in the century of Carthage, the Gracchi, Marius, Sulla and Mithridates — sat on
eleven provinces in Italy from the first month to the last.

**Both had the same shape of cause.** The chapter's history was written as
Judaea's history and nothing else's. `ev_elasa` deliberately declines to march
a dominant Judah to his death (a kingdom that has overshadowed the rising is
not killed by the calendar — correct), but nothing else was ever going to bury
him, while `ev_death_of_simon` is a bare date card that installs Hyrcanus over
whoever happens to be ruling. So the divergence killed the succession without
replacing it. And the chain contained, verifiably, **zero** `world: true`
cards: outside Judaea the century was empty by construction.

`events_167bce_world.js` is the fix, in two halves.

**The house is mortal.** `ev_w_generation_passes` is a repeatable card driven
by a sequence table giving each of the three ruling brothers the year by which
he is overdue if the wars have spared him — Judah −152, Jonathan −140, Simon
−128. A man still in the seat past his year is not immortal; he is a man the
script forgot to bury. The card seats the next brother with the correct heir
named, sets the flag the rest of the chain reads, and does not fire again on
the man it just installed. It is a *backstop*: where the scripted deaths do
fire, they fire first and this never triggers. Both options seat the same
successor, because the order of the house is not negotiable in the sources —
the choice is how it is done. Succession by right of blood is free and
immediate and offends the priesthood; confirmation by the great assembly at
Jerusalem (as the assembly of 140 confirmed Simon, on bronze tablets on Mount
Zion) costs 40 talents and a year of slack in the field and buys legitimacy,
stability and the Hasideans.

**The world outside.** Seven `world: true` notices now span −146 to −64:
Carthage and Corinth burned in one year; the expulsion of the Jews from Rome in
139; **Mithridates I of Parthia entering Seleucia** in 141; the Attalid will in
133; the Asiatic Vespers in 88; Tigranes taking Antioch in 83; and Pompey
organizing the East in 64 — which is the exact position the 67 BCE chapter
opens from. Plus `ev_w_senate_asks`, a choice card that fires only when Judaea
holds fourteen provinces or more: the Senate noticing that its small friendly
kingdom has become a power is the Roman half of a divergent game.

**The empire is eaten in two bites, and they do not overlap.** The first draft
of the Tigranes card handed Armenia every remaining Seleucid province, which
produced a 56-province Armenian empire that never existed — a balance anomaly
manufactured by the very file meant to fix one. The century actually had two
distinct dismemberments and the chain now carries both, by explicit province
list rather than a latitude cut: everything east of the Euphrates goes to
Parthia in 141 and never comes back; Syria, Phoenicia, Cilicia and Commagene go
to Tigranes in 83 and come off him, to Rome, in 64. Commagene and the
Cappadocian marches stay client kingdoms; Rome stops at the Euphrates as the
Pompey–Phraates settlement said; a Seleucid rump survives in the south rather
than the map going blank. `transfer()` never takes a province off a living
court that is not one of the two dying ones, so a world card rearranges the
empires history rearranged and does not confiscate the player's conquests.

Over 105 all-AI years the chapter now reads as a century: Rome 11 → 27,
Parthia 2 → 18, Armenia 4 → 28 → 5, the Seleucid empire 74 → 29. The autorun
harness flags Rome and Parthia as snowballing, which is the correct reading of
a heuristic that measures growth: over a hundred years those two are supposed
to grow, and before this file neither did at all.

- **Regression contract**: `smoke78.mjs` (the §111 sections), which reproduces
  the reported succession by seating an overdue Judah, runs a hundred AI years
  end to end and asserts the order Judah → Jonathan → Simon → Hyrcanus, and
  pins the dismemberment arc bite by bite.

## 112. A rising has to end

Reported as a question about missing events, and it turned out not to be a
content problem at all. Every chapter was audited by running it twice — once as
history plays it, once as a Judaea that has plainly won — and diffing which
cards fire. The 66 CE chapter came back with a hole the size of the chapter:
after the Year of the Four Emperors in 69, thirty-three years passed in which
the only major cards were foreign emperors dying. The Ninth of Av, Masada,
Judaea Capta and Yavneh never fired. Neither did the survival branch.

**The cause was one line of state.** Jerusalem's owner was `JUD` and its
controller was `REB`. Judaea was alive, had no overlord, and had settled its war
with Rome — and a rebel band was sitting in the capital that nobody would ever
remove. `judaeaFree` asks whether Judaea *controls* Jerusalem, so the Second
Kingdom never opened; `ev_temple_burns` wants `ROM`, `AGR` or `NAB` as
controller, so the Temple never burned. The chapter was frozen in a third state
that neither branch describes.

**And it could not recover.** Income and manpower (`economy.js`) and every
recruitment order (`recruitment.js`, which stalls with `Enemy occupation`)
require a province to be owned AND controlled. A realm whose provinces are all
rebel-held earns nothing, grows nothing and can raise nothing — so it can never
build the army it would need to take its own country back. The probe found
Judaea owning sixteen provinces, controlling zero, with zero men under arms, and
staying that way for the rest of the chapter. That is a terminal state with no
exit, and it hits a player exactly as hard as the AI.

The rules had exactly one way for a rising to end: be beaten in the field. That
is complete for a pretender — `monthlyPretenders` crowns him or buries the
question — but a peasant or religious band that took a town and was left alone
had no ending at all.

`monthlyRisings` is that ending. A band holding a province with nobody
contesting it burns out: once the grievance that raised it is spent
(`rebelBurnoutUnrest`) and the grace period is over (`rebelBurnoutMonths`) it
loses `rebelBurnoutRate` of its men a month, and when the last of them is gone
the province answers to its owner again with a year's cooldown before anything
can rise there afresh. `rebelHoldMaxMonths` is a hard ceiling no rising passes,
angry or not.

Three refusals are as much the design as the rule:

- **A dead owner gets nothing back.** Burn-out restores a province to its owner;
  a court that no longer exists is not handed a country by the tick.
- **A pretender is settled by his own clock**, not this one.
- **A band in a battle is left to the field — but only up to the ceiling.** An
  unbounded exemption is the same immortality bug in miniature: one stale
  `inBattle` and the province is held for good. The suite pins this, because the
  first draft had exactly that hole and four provinces stayed rebel-held forever
  on a flag nothing was going to clear.

None of this makes a rising harmless. A province that is still angry keeps what
it took for years, the burn-out only starts after two calm years, and a realm
that has genuinely lost its country still has to wait.

**What it unlocked, with no other change and no help given to the AI.** In 66 CE
a plain AI Judaea now recovers Jerusalem, rebuilds from zero men to thirty
thousand, and plays the Second Kingdom arc that was written for it and had never
once been reachable: the House That Stood, the Victors' Quarrel, the Negotiated
Peace, Crown or Council, the Diaspora Homecoming, the Flavian Grudge, Parthia's
offer, the Academy and the Altar, the Commonwealth of the Chamber, Domitian's
rescript, the Eagles Going Home, the Children of the War. In 132 CE eight more
canonical cards arrive — Syria Palaestina, the Shemad, the Ten Martyrs, Judah
ben Bava, the Rescript of Antoninus, the proselyte ban, the Sanhedrin at Usha,
and Yehuda ha-Nasi. The `autorun` anomaly list gets shorter, not longer: 40 BCE
and 614 CE lose their BLEEDING flags entirely.

- **Regression contract**: `smoke79.mjs`, which pins the burn-out, all three
  refusals, the locked-out-of-its-own-country case end to end, and the 66 CE
  chapter reaching an ending in one branch or the other.

### Still open, and the shape they share

The audit found the same disease elsewhere, and it is worth naming: **the
chapters are written for two outcomes, and the simulation's commonest result is
neither.** A rump that survives without its capital, or a victor with a rebel in
it, falls between the branches and gets nothing.

- **132 CE**: `ev2_betar` needs Judaea reduced to one or two provinces;
  `judaeaStands` needs Jerusalem. A Judaea that survives the revolt at six
  provinces without the city gets neither ending. `romanAftermath` — the gate on
  the world thread, including the patriarchate ending in 425 — requires
  `countControlled(JUD) === 0`, so a surviving rump also silences three
  centuries of world history.
- **1948**: nine major world cards, the whole Lebanon arc from the Cairo
  Agreement to the Mire, are guarded `when: alive(LEB)`. An Israel that annexes
  Lebanon erases fifty years of the region and gets nothing in its place.
- **167 BCE**: `ev_royal_expedition` carries `requiresWar: ['HAS','SEL']`, so a
  Judaea at peace by −162 loses the whole Lysias arc; `ev_jerusalem_terms` and
  `ev_hyrcanus_east` both need `sidetesBesieges`, so a Judaea strong enough that
  Antiochus VII never besieges Jerusalem loses both.

## 113. The Levant without a Lebanon

The first of the three holes §112 named, closed. The 1948 chapter's whole
northern arc — nine major world cards, the Cairo Agreement of 1969 through the
Mire — is guarded `when: alive(LEB)`. The guard itself is right: a state that
does not exist cannot have its confessional settlement collapse. But `when`
retires a card rather than holding it, so an Israel (or a Syria) that took
Beirut before 1969 deleted fifty years of the region's history and got nothing
whatever in its place. No militias, no Guard in the Beqaa, no eighteen years in
the south. Silence, in the loudest corner of the map.

`events_1948_levant.js` is the third outcome. Its premise is that none of the
forces the Lebanon arc is about actually need Lebanon to exist:

- **The fedayeen went to Lebanon in 1970 because Lebanon was the one state too
  weak to refuse them.** With no such state they go somewhere that can refuse
  them, and refusing them is a decision with a price — seal the frontier and
  they become Damascus's problem and yours is a permanent garrison bill, or let
  them into the camps under your own administration and be inside the problem
  rather than beyond it.
- **Mount Lebanon's confessional arithmetic does not dissolve on annexation.**
  It becomes the annexer's arithmetic: rule through the militias that already
  exist, which is cheap and contracts a debt that comes due in somebody else's
  massacre, or administer nine provinces directly and argue about the cost at
  home every year. The second answer is the expensive one and it is the one that
  works, which is the whole content of the choice.
- **The Revolutionary Guard came for the Shia of the south**, and under a direct
  occupation that community's grievance is not mediated by a Lebanese state at
  all. The Guard's argument gets easier to make, not harder, and the resistance
  it builds is aimed at the occupier from the first day rather than at a
  government down the road. The occupation produces the adversary faster than
  the history that did not happen would have.
- **The truck still goes through the wire.** `ev_i_barracks` is explicitly about
  the multinational force that came to guarantee a peace between Lebanese
  factions, so its guard now also refuses the annexed road; `ev_l_the_lesson`
  is that road's version, aimed at an occupation headquarters on the coast, as
  Tyre was in November 1983. Same building coming down, same absence of an
  address to retaliate against.
- **And it ends the way occupations end.** The Long North offers the two real
  answers — hold the line because withdrawal teaches the wrong lesson, and pay
  for it monthly forever; or pull back to a frontier fewer men can hold, take
  the legitimacy hit, and let the Party of God claim the credit. The century
  then closes on the northern question with the settlement each answer earned:
  quieter for the state that administered, still in debt for the state that
  farmed it out, and unanswered for the one that never chose.

The arc requires a real occupation, not a border adjustment: `occupier()` wants
four of the nine provinces before it will call anyone the possessor of a
country, and a living Lebanon closes the whole branch however much ground is
held. The two arcs are mutually exclusive by construction, which matters more
than either of them — a branch that fired in both would be worse than the hole
it was written for.

- **Regression contract**: `smoke80.mjs`, which plays the chapter out twice and
  asserts 9/9 historical cards with zero alternates when Lebanon lives, 6/6
  alternates with zero historical when it does not, and that one province in the
  north buys nothing.

## 114. The kingdom that kept the Galilee

The second of §112's three holes. The 132 chapter tests for two outcomes with
two predicates, and they do not meet in the middle:

- `judaeaStands` — alive, no overlord, **controls Jerusalem**, no war with Rome.
  Gates the victory branch: the Era of Redemption, the Third House, the Second
  Generation, the succession of the Nasi, the Antonine reckoning.
- `romanAftermath` — Rome alive, Rome holds Jerusalem, and Judaea **controls
  nothing at all**. Gates the defeat branch: the fifteenth bishop, the rising
  against Gallus, the patriarchate lapsing in 425.

The commonest result of actually playing the chapter is neither. A revolt beaten
out of the city but not out of the hills leaves a sovereign Jewish state of half
a dozen Galilean provinces with a Roman Aelia twenty-five miles away — the
victory gate fails on the city, the defeat gate fails on the state. A traced
campaign ran from 132 to 431 in exactly that position: alive, no overlord, six
provinces, war settled, and not one card in three centuries with anything to say
about the Jewish–Roman question. The world spine ran past it beautifully — the
Decian edict, Milan, Nicaea, Julian's Temple, Cunctos Populos — and none of it
was addressed to the Jewish state sitting in the middle of the map.

`events_132ce_galilee.js` is that third outcome, gated on `judaeaEndures`:
sovereign, not holding Jerusalem, not at war for it, and holding at least two
provinces of its own. It is also the most interesting of the three roads,
because it is the one furthest from what happened.

- **The Kingdom in the Hills** (140) ends the revolt without a Betar and without
  a triumph. Sign the frontier agreement the governor will sign — a state that
  trades has to know where it ends — or sign nothing, and keep the claim to the
  city in the open at the price of a border where something can always start
  again.
- **The Prince and the Patriarch** (163) asks the question the office never got
  to be asked. Where there is no state the Nasi *is* the Jewish polity; where
  there is one, he is either the ruler or a rival to him. Fuse the offices as
  the Hasmoneans fused crown and altar, or keep two chairs and pay for it in the
  time a state with two heads spends deciding which one is speaking.
- **A Law Code for a Country That Has One** (200). The redaction happens either
  way; what differs is what it is *for*. Edit the Mishnah as enforceable law and
  the courts sit on it within a year — and the diaspora academies quietly begin
  keeping their own. Edit it whole, sacrificial orders and all, and it stays the
  nation's rather than the government's, which is what made it portable.
- **The Mountain and the Toll** (250) is the choice a treasury creates. Buy every
  Jew's permit into Aelia and make the ninth of Av a national act performed by a
  state, or forbid the purchase and leave the mountain unvisited by your own
  people for generations. The sages record the refusal and the wound in the same
  sentence.
- **A Neighbour, Not a Minority** (390). The Christian empire has an apparatus
  ready for the Jewish question — synagogue law, a theology of the fallen
  Temple, a settled practice of legislating for people who cannot answer back in
  any language it has to hear. None of it works on a state with ambassadors and
  a frontier. Treat with it as a power, and every Jewish community inside the
  empire acquires a foreign patron, which changes what can safely be done to
  them; or legislate as though it were not there, and discover that the sentence
  has no legal subject.
- **What the Office Was For** (425) is the answer to `ev2_patriarchate_ends`.
  Theodosius II could decline to fill a chair held at his pleasure. He cannot
  vacate one in a country he does not govern, and the year passes in the Galilee
  without anybody noticing it was supposed to be the end of something.

The three roads are mutually exclusive by construction and the suite checks it
in both directions: retaking Jerusalem leaves this branch at once and enters the
victory one, losing everything enters the defeat one, and a war still running
means no settlement has been chosen at all.

- **Regression contract**: `smoke81.mjs`, which pins the three-way exclusion
  province by province and plays 299 years to assert the chapter finishes on
  exactly one road.

## 115. The third road through Sidetes

The last of §112's holes, and the smallest — two cards, but two of the chapter's
best. `ev_jerusalem_terms`, the Honorable Terms, requires `findWar(HAS, SEL)`:
an **active** war, at −133 or later. That is right for the road it was written
for, where the king is outside the walls and the terms are what ends the siege.
It is silently wrong for a Judaea that beat the Seleucids to a peace years
earlier: there is no war to find, so the card waits inside its trigger forever,
and `ev_hyrcanus_east` chains off a flag it therefore never sets.

Worth separating from the Lysias arc, which looks like the same bug and is not.
`ev_royal_expedition` carries `requiresWar: ['HAS','SEL']`, and the engine
handles that case properly: when the war has been settled the card is retired
with the recorded reason *"the war it belonged to was already settled"* and the
player is shown that page in the ledger. Verified in a traced campaign — it
lands there at −162 with Beth-Zechariah beside it. That is a divergence the
game tells you about. The Sidetes case records nothing at all, because a trigger
that never fires was never retired.

Note also what is *not* the cause. `sidetesBesieges` is set on both roads:
`ev_sidetes_siege` is a plain dated card with no guard, so it always fires. The
block is one line further down, and only that line.

`ev_w_sidetes_summons` is the third road. Sidetes' purpose does not change
because there is a treaty — he came to put the Seleucid house back together and
Judaea is the piece that got away. What changes is the instrument: a king who
cannot besiege a state he is at peace with sends a letter instead, and the
letter asks for exactly what the siege would have asked for — the arrears, the
tribute for Joppa and Gazara, a garrison in the citadel or its money value,
and a closing line about the army of the East mustering at Antioch this spring.

Pay it, and Judaea arrives at the position the Honorable Terms produced without
a siege ever happening: treaty intact, walls up, a tribute on the ledger, and
Rome fifteen points cooler toward a friend that pays Antioch. Refuse it in
Simon's words — the cities were taken from enemies, not borrowed — and the
treaty breaks, the army turns south, and the whole original arc becomes
reachable again on the road it was written for.

`ev_hyrcanus_east` now accepts either settlement. The anabasis follows a
settlement with Sidetes, and there is more than one way to reach one.

- **Regression contract**: the 167 audit no longer reports `ev_jerusalem_terms`
  or `ev_hyrcanus_east` among the cards a victorious Judaea loses.

## 116. A demand has to be somewhere

Reported from a played game: Iraq annexing parts of Egypt, Turkey parts of
Lebanon. Tracing 1948 to 2002 reproduced worse — Egypt ending the century
owning **Hyrcania, Gabae and Susa in central Iran**, and Jordan owning Hatra and
Charax.

The cause is one missing question. `peaceDealInfo` built its demandable list
from occupation alone: it asked who *controlled* a province and never asked
where it was. So an army that had walked somewhere through a coalition war —
and the alliance graph makes coalition wars large — could put whatever it was
standing in on the table. §109 gave released states a land border on the grounds
that a state has to be somewhere; an annexation is the same claim from the other
direction and never got the same rule.

The rule: a demand must be land-reachable from the claimant's own country,
counting the other demands as stepping stones. A corridor is a country's arm, so
an advance may run outward through a chain of demanded provinces — otherwise
nothing beyond the first rank could ever be taken — but it may not *begin* on
the far side of a country nobody is taking. `endWarBySword` gets the same rule
under `annexable`, since uti possidetis has the same hole.

**The restraint is the hard part, and it is load-bearing.** Two exemptions:

- **A geometry can be real and still be meaningless.** The older suites build a
  line of beads where province `i` borders `i±1`. Those edges exist, so
  `geomHasEdges` — which §109 added for the opposite problem, an adjacency graph
  with *no* edges — cannot tell them from a map. The first draft of this rule
  applied to them and broke six suites. The fix is not to detect a fake map but
  to ask a better question: `geomIsMapLike` requires an average degree of 3,
  because a real province borders four to six others and a bead borders two.
  Nothing real lands near the threshold, so it needs no tuning. An earlier
  attempt — "stand aside if the rule would strike out every demand" — is
  recorded here as rejected: it was blunt enough to hand over central Iran in
  the very case the rule exists for, whenever that case was all a winner held.
- **An authored border is not second-guessed.** A scripted settlement that
  supplies its own `keep` predicate has drawn the line by hand — Rhodes says
  exactly which cells sit inside the 1949 lines — and the engine does not
  overrule the author.

After the rule, the traced campaign has nothing non-adjacent anywhere. What
remains (Iraq taking Susa, Egypt reaching Hebron, Syria taking Tripoli) is
land-adjacent and a question of appetite rather than of geography — see the
note at the end of §117.

## 117. The length of the line costs something

The same game, second complaint: Israel invading deep into Iraq, Saudi Arabia
and Egypt on foot. It is not a bug in any single rule; it is the absence of one.
`traceSupply` floods the adjacency graph to depth 64 — larger than the map — so
a host was as well fed at the Gulf as at home. Supply was a yes/no fact about a
wagon and never a question of how far the wagon had come, and desert attrition
of 4%/month is not by itself an argument against anything.

The fix is deliberately **not** a hard cutoff. A radius that fails at N
provinces would strand scripted armies mid-campaign and turn a balance question
into a correctness bug. Instead the line still holds at any length and simply
costs more the longer it is: `monthlySupply` records `supplyReach` (the route
length home) on every army, and past `reachComfort` the attrition pass adds
`reachAttrition` per further province, to a cap. Terrain compounds it, so the
crossing of a desert to reach somewhere far is charged twice, which is correct.

A host fourteen provinces out over ground it controls the whole way now loses
roughly six times what the same host loses at home. The march remains possible —
it should be; armies did march — and it is now something a campaign has to
afford rather than something it gets for nothing.

- **Regression contract**: `smoke82.mjs`, which pins both rules and, at least as
  importantly, both of §116's exemptions. It boots the real map for the
  geography and the bead chain for the restraint, because a suite that only ever
  saw one of them would not have caught the first draft.

### Still open

One absurdity survives both fixes, and it is neither geography nor logistics.
The Suez card declares `UK vs EGY`, and the alliance graph drags the Baghdad
Pact — Iraq, Turkey, Iran — into a two-year land war against Egypt, Jordan,
Syria, Lebanon and Saudi Arabia. Everything after that is downstream: the
absurd-looking annexations were absurd *because* of who was at war, not only
because of where they were. A coalition member called into somebody else's war
should be able to decline it, or to settle out of it early, and until it can,
the 1948 chapter will keep producing regional land grabs that no participant
ever wanted.

## 118. The best road was the emptiest

Found by building the path tree of §119 rather than by playing: the 132 chapter
has three roads, and the last card on its best one — `ev2_second_generation` —
is at **163 CE**, in a chapter that runs to 425. A Judaea that actually wins Bar
Kokhba, holds Jerusalem and restores the state the revolt was fought for got two
hundred and sixty-two years of silence, while the defeat road ran to
`ev2_patriarchate_ends` in 425 and the Galilee road of §114 ran to 425 beside
it. The outcome a player most wants to reach was the one that stopped first,
which is close to the worst possible arrangement of authorial effort.

`events_132ce_redemption.js` is that road's third and fourth centuries. The
material is the richest counterfactual in the game, because what changes is not
a battle: it is that the Roman Empire becomes Christian while a sovereign Jewish
state is standing in Jerusalem with the Temple Mount in its hands. Every piece
of fourth-century legislation about Jews assumes a people inside the empire who
cannot answer back in any language it has to hear, and none of it has a subject
here.

- **Citizens of Somewhere Else** (212). Caracalla makes every free man a Roman
  citizen and, without anyone in the chancery noticing, draws a line a Jewish
  state is on the far side of. Renounce any claim on Jews who are Rome's
  subjects — safer for them, and further away — or claim them, which is what a
  state is for and what an empire cannot tolerate.
- **The Certificate** (250). The Decian sacrifice is a loyalty audit of
  everyone at once, and the Jewish exemption rests entirely on an argument from
  antiquity that has never been tested against a Jewish army on the Euphrates
  flank. Buy the exemption and get it written down for the first time in three
  centuries, or let the argument stand on its own feet and record the towns
  where the magistrates did not agree.
- **The Emperor in a Cage** (260). Shapur takes Valerian alive and the Roman
  East has no field army between Antioch and the desert. The generals bring a
  map and the sages bring the Three Oaths. Take the coast — the Palmyrene
  answer, and it is worth remembering what happened to Palmyra — or hold, and be
  the one government in the East still answering its correspondence.
- **A Canon Aimed at a Government** (325). Nicaea fixes Easter away from the
  Jewish reckoning, and the emperor puts the reason in writing. Here that
  calendar is not a custom: it is published annually by a government, over a
  seal, by courier, to six countries. The council has not corrected an error, it
  has declined to receive a foreign state's mail.
- **The Religion of the State Next Door** (380). Cunctos Populos legislates a
  faith whose founding events are, twenty-five miles away, municipal records in
  somebody else's archive. Open the city to Christian pilgrimage and tax it at
  the gate — the most profitable decision the kingdom ever takes and the one it
  argues about longest — or shut the Mount and let the empire arrive at the
  question from other directions.
- **Three Hundred Years** (425). The year the patriarchate would have lapsed,
  passing unnoticed in a kingdom older than the revolt that made it. The
  chronicle reads back every choice the road made. The miracle has become an
  administration, which is the only thing a miracle can turn into if it is going
  to last.

**And the roads now lock.** The trace that proved this package also exposed the
thing the tree exists to catch: a Judaea that lost Jerusalem, took the Galilee
road, and later retook the city played two chapters at once, because all three
predicates read live state and live state moves. The rule is now explicit in
both files — **the first road entered is the road**. `judaeaEndures` stands down
once `redemptionEra` is set; `redeemed` stands down once `galileeKingdom` is.
The marker flag is what makes a road a road rather than a description of this
month.

## 119. The branching path tree

Seven chapters, twelve forks, twenty-four roads, and until now no document said
so. The structure existed only as predicates scattered through the content
packages — `judaeaStands`, `romanAftermath`, `judaeaEndures`, `noLebanon`,
`judaeaFree` — each re-derived from live state at the point of use, with nothing
anywhere recording how many roads a chapter had or whether they all went
somewhere.

`js/data/chapter_paths.js` records it, and deliberately does **not** reimplement
the predicates: two sources of truth for the same question drift within a month.
What it stores is the evidence — the flag each road sets when taken (or the tag
it seats, for the 1961 secession, which is proved by a state existing rather
than by anything written down), the card that opens it, and the card that closes
it.

`smoke83.mjs` checks the map against the ground: every named card exists in the
chain, every marker is a flag some live card actually writes, no two roads in a
fork answer to the same flag, no terminal falls outside its chapter, and the
declared gap list matches the real gaps exactly.

Two details are load-bearing. The marker check is **static** — it reads the
content packages as text, because every effect body is wrapped in `guard(key,
fn)` and `String(option.effects)` returns the wrapper rather than the `setFlag`
inside it; a runtime check would pass on markers nothing sets. And it accepts
both idioms in the codebase, the helper and a direct write to `g.flags`, because
the first draft knew only the helper and declared a live road dead.

Writing the tree found four things before any of it ran:

1. **132's redemption road ended at 163** in a chapter that runs to 425 — closed
   by §118.
2. **`uarBrokeUp` does not exist.** I had recorded a flag for the Syrian
   secession that nothing sets; the road is marked by the `SAR` tag instead.
3. **40 BCE's Hasmonean road has no ending.** A surviving Antigonus stops well
   before the chapter does, and `ev5_her_leash` reads as a further road nobody
   finished either.
4. **1948's union fork has one road.** The union coming apart has no counterpart
   for a union that holds, so there is nothing for it to be exclusive with.

3 and 4 are in `KNOWN_GAPS`, which the suite asserts is exactly the set of
roads without terminals — a to-do list the build enforces rather than a comment
nobody rereads. Close one and forget to remove it, or add an unfinished road and
forget to declare it, and the suite fails.

- **Renderer**: `node tools/paths.mjs [chapter] [--gaps]`. It prints and does not
  validate; a renderer that also validated would be trusted for the wrong reason.
- **Regression contract**: `smoke83.mjs`.

## 120. The roads that stopped early

The path tree of §119 declared two gaps and the suite has been failing them ever
since, which is what a to-do list the build enforces is for. Both are closed
here, and closing them turned up a third thing nobody had declared at all.

**40 BCE had two unfinished roads, not one.** The chapter runs to 6 CE, where
`ev5_provincia` deposes Archelaus and makes Judaea a province, and the
historical Herodian road runs all the way there. The Hasmonean road — a player
who beat both Herod and Rome to keep the last Hasmonean on the throne — stopped
at −32, leaving thirty-eight silent years across Actium and the whole Augustan
settlement. And `ev5_her_leash` and `ev5_her_incense`, which fire at −26 and −25
for a Herod who has outgrown his leash into Damascus or Petra, turned out to be
a *third* road that also stopped — and worse than stopped, because
`ev5_provincia` was a bare dated card with no guard, so a kingdom running to
Damascus was handed to a prefect from Caesarea on exactly the schedule of one
that never left the hills.

Both endings turn on the same historical point, which is the interesting thing
about the chapter: **Rome in this period annexed thrones it found embarrassing,
not thrones it found inconvenient.** Judaea became a province because Archelaus
was bad at the job and his own notables petitioned to be rid of him, not because
Rome wanted the ground. Commagene, Cappadocia, Emesa and Nabataea all continued
for decades on exactly that basis, and the difference was almost never military.

- **The Patron at the Bottom of the Sea** (−31). Actium leaves a king seated by
  Parthian cavalry with no Roman friend at all. Go to Rhodes and make Herod's
  argument without Herod — a king who kept faith with one Roman will keep it
  with another — or send nobody, keep the eastern alliance, and go on a list
  that the young man in Italy is in no hurry to act on.
- **The Settlement of the East** (−20). Augustus files every throne between the
  Taurus and the desert, and the question the clerks ask is boring and decisive:
  what is the yield, who complains, how often. Answer with audited books and be
  administratively invisible, or answer that a kingdom is not a province with a
  king on it — dignity is real and it is not free.
- **The Year It Did Not Become a Province** (6 CE) closes it. No prefect, no
  census, no fourth philosophy, and the reason is not strength: it is that
  nobody came to Rome about this one.
- **Too Large to Be a Favour** (−20) and **No Prefect for This One** (6 CE) do
  the same for the greater Herod. Garrison the desert road at your own expense
  and let Antioch do the arithmetic on what that saves, or mint your own coin
  and sign your letters as an equal — the one thing the old arrangement never
  permitted was saying out loud that it had changed.

**And two guards that were missing.** `ev5_provincia` now fires only on the road
it is about; stated positively, because the negative form announced the
annexation of Judaea in a year when a Hasmonean king was sitting in Jerusalem
and the effects then silently did nothing. `ev5_census` hangs off
`judaeaProvincia` rather than off the calendar, because the census is what a
prefect does on arriving and there is no Quirinius without a Coponius.

**1948's union fork had two roads and the tree recorded one.**
`ev_i_secession` already offered "Cairo lands the paratroops at Latakia" — the
union held by force — and that road then went nowhere while the chapter carried
on addressing a Syria which, on it, is a province of Egypt. **One Cabinet, Two
Countries** (1966) and **What the Union Was** (2000) finish it. What a surviving
union changes is not military: it is that the most populous Arab state and the
most ideologically committed one are the same government, so the arguments
conducted between Cairo and Damascus for forty years are now conducted inside
one cabinet, with no border to lose them across and no second capital to defect
to. Consolidate into one general staff, or give Damascus its own ministries and
watch the money come home from Beirut.

**A rule the terminals taught.** Both new endings first re-ran the predicate
that had opened their road, and both were silently deleted by it: `when` retires
rather than waits, so a kingdom that lost Petra in 12 BCE lost its 6 CE as well.
The §119 rule applies to terminals too — **the first road entered is the road**.
A terminal tests the marker and that the court still exists, not the geography
of twenty-six years earlier.

The remaining declared gap is the Syrian secession, and it is not an unfinished
road: after September 1961 every later card in the chapter is written for a
separate Syria, so it has no ending of its own to reach because it has become
the spine.

- **Regression contract**: `smoke83.mjs`, whose gap list now names one road
  instead of two, and which caught `events_40bce_alternates.js` missing from its
  own source map the moment the file was added.

## 121. A chapter that does not stop at its own edge

Asked as a question: what happens if you play 167 all the way forward to what
ought to be Herod's time? Traced, the answer was nothing, twice over.

**The chain stops and the clock does not.** The last card in the 167 chain is
`ev_w_pompey_organizes` in −64, and no bookmark declares an end date, so a
campaign played on from there simply ticks. The probe drew sixty-eight silent
years covering Caesar, the Ides, Antony and Cleopatra, the Parthian sweep of 40,
the entire reign of Herod, Actium and the Augustan settlement of the East.

**And what did fire in that span was wrong.** `ev_rededication`,
`ev_akra_falls` and `ev_bronze_tablets` — the rededication of the Temple, the
fall of the Akra, the tablets on Mount Zion — went off in **49 BCE**, a hundred
and eighteen years after the revolt they belong to, because some later war
finally satisfied their conditions. Thirty-two of the chain's forty-four
triggered cards carry no era window at all, so windowing them individually was
thirty-two judgement calls.

### The generation horizon

One field instead. A bookmark may declare `generationHorizon`: the year after
which its own **undated** trigger cards stop belonging to anybody. `canFire`
refuses them past it. Two exemptions are deliberate — a dated card *is* windowed
by its date, and a card that declares its own `maxYear` is a chapter saying "this
one legitimately runs late", which is exactly what 132's fourth-century arcs do.
All seven chapters now declare one.

### The continuation

The obvious repair would have been to hand a 167 game the 67 and 40 chains,
which already contain that history in detail — and it is wrong. Those chapters
are written for a world their own bookmarks create: HYR and ARI quarrelling over
a throne, ATG seated by Parthian cavalry, HER bidding for it in Rome. In a 167
continuation none of those courts exist. HAS is still the Jewish state *because
it never lost*, which is the entire premise of having played that far, and
handing it the war of the brothers would be handing it somebody else's chapter.

`events_167bce_after.js` is the same history asked of a different state, and the
difference is the point. A Hasmonean Judaea intact in 63 BCE holds something no
other court in the East has: a treaty with Rome cut in 161 by Judah Maccabee and
renewed by every ruler since — older than the province of Asia, older than Roman
Syria, older than the careers of every man now arguing about the frontier.

- **The Oldest Treaty in the East** (−63). Pompey's commission expects a king
  explaining he was always Rome's friend, produced at the moment it becomes
  useful; it gets a bronze tablet and a century of renewals. Stand on it and pay
  what friendship costs, or submit it and add nothing — and leave a commission
  that cannot close a file, which Rome is extremely good at reopening.
- **The Governor Who Needed Money** (−53). Crassus takes the Temple treasure and
  dies at Carrhae fourteen months later. Take the road east while there is no
  road west, or refill the chamber from your own revenue and enter the theft as
  a debt — the most useful thing about an outrage being that nobody has to be
  reminded of it.
- **The Year Parthia Came** (−40). The year that in the other history put a
  Hasmonean on the throne with Parthian help. There is already a Hasmonean on
  the throne, so what arrives is not a crown but a frontier. Anchor the Arsacid
  march and take the war that answer has always cost — Ventidius, within two
  years — or send the envoys away with gifts and make sure Antioch is told.
- **A Hundred Years of Friendship** (−20). Augustus reads the accounts summary
  first and the treaty afterwards, out of curiosity.
- **The Year of the Other History** (6 CE). The year Judaea became a province,
  passing without a prefect: the clerks in Antioch open the file, find nothing
  that needs doing, and close it. That is the whole event, and it is the point.

The 167 chapter's `lastYear` in the path tree moves from −64 to 6, and its
Parthian question becomes a two-road fork like any other.

- **Regression contract**: `smoke84.mjs`, which asserts every chapter declares a
  horizon, that the three late-firing cards have no window of their own so the
  horizon is what stops them, and which plays 175 years to confirm all five
  continuation cards fire and no revolt card fires past −60.

## 122. Both roads out of the Great Revolt keep going

The 66 chapter's last card is `ev_domitian_dies` in 96, and then the same
silence §121 found at the edge of 167. What makes this edge worse is that 66 has
**two roads**, and both arrive at 96 with unfinished business — so a single
continuation would have been wrong twice over.

The road where the House fell ends at Yavneh, with a nation that has just
discovered it can survive without a Temple and does not yet know for how long.
The road where the House stood — which SPEC §112 made reachable at all — ends
with a sovereign Jewish kingdom holding a Roman frontier and a Parthian border,
thirty years before the largest war Rome ever fought on it.

Both run into the same three decades, and those decades contain the event that
decides everything after them: **Trajan's Parthian war of 114–117 and the rising
that broke it.** The diaspora revolt was retired as a playable chapter in v5.1
(SPEC §50) for good reasons — it barely touched Judaea proper and wore a frame
it never fit. It fits perfectly here, because here it is not the chapter. It is
the question each road has to answer, from opposite ends of the same war.

**The fallen road** answers it as a subject people whose surviving authority is
a school. *A School, and a Century to Fill* (100) asks what Yavneh decides the
nation is FOR now that the answer is no longer "to hold the country": the Law,
which can be carried — or a debt kept in the curriculum, every tractate on
sacrifice taught as law in abeyance, which keeps the nation mobilisable and is
precisely what Rome will eventually notice. Then *The East Is Burning* (116):
Cyrene is being depopulated, Salamis is destroyed, and the letters are arriving
at an academy that has spent thirty years teaching that the nation survives by
not doing this. Rise, and be quoted for a thousand years by people who did not
have to decide — or forbid it in writing and be hated for it by the communities
that burned. *A City With Another Name* (130) closes on the surveyors, and a
nation that kept the debt **and** refused the rising is the most dangerous
combination the board can produce.

**The standing road** answers it as a state on the invasion route. *The Soldier
Emperor* (98) brings staff officers asking friendly questions about roads,
granaries and fords: build them and be inside Rome's war planning, which is
protection and a commitment nobody asked you to sign — or answer politely and
build nothing, because a kingdom off the supply route is also off the retreat
route. Then *The Flank of the War* (116), the three-way fork the chapter was
always missing: hold the corridor open and let the army come home through a
Jewish kingdom; shut it and sit on it, since a neutral on your retreat route is
a threat by geometry whatever it intends; or rise with the whole East while the
emperor is at the Persian Gulf. *No City of Another Name* (130) closes it — the
imperial party is received, shown the sights, given a very good dinner, and the
only Roman mark on Jerusalem this century is an improved aqueduct.

The two arcs refuse each other structurally: `houseFell` requires
`templeBurned && !secondKingdom`, `houseStood` the reverse. Neither re-tests
live geography, per §119 — a road entered in 70 CE is still the road a player is
on in 115 whatever the map has done since.

The chapter's `lastYear` moves from 96 to 130 and it gains two forks, one per
road, which is the shape the remaining chapter edges want too.

- **Regression contract**: `smoke84.mjs` (the §122 section), which asserts the
  continuation is two arcs rather than one, that each forks, and that the arcs
  refuse each other.

## 123. The last act of the war of the brothers

The 67 chapter's last cards are `ev4_mariamne` and `ev4_v_never_renamed` around
−30, and then the edge §121 and §122 have found twice already. Thirty-five years
to 6 CE, the year Judaea became a province in the history this chapter is a
tributary of.

It looks at first as though the 40 chapter already covers this ground, and in
the codebase it does. **In play it does not**, and that distinction is the whole
design: a campaign started at 67 BCE never sees a single card from the 40
chapter, because chapters are chains attached to bookmarks and a player only
ever has one. Thematic overlap between two packages is a filing question.
Silence in a played campaign is a missing chapter.

The chapter leaves two very different worlds behind it, and they want different
last acts.

**The submitted roads** end with Herod on the throne and his queen dead, a
kingdom that exists because Rome decided it should. *The Succession a Client
Cannot Have* (−10) is the question every client dynasty faces and almost none
survives: settle it in Rome now, in public, and admit the crown is on loan — or
keep the will at home and let every notable in the country make arrangements of
his own. *The Year the Petition Came* (6 CE) is what that decides. The
delegation is not rebels; it is the respectable sort, with property and Greek,
arguing that the dynasty is expensive and arbitrary and worse at collecting
taxes than Roman clerks would be. It is an extremely good case made in a
language the men hearing it use for everything, and the only answer available is
in the same language.

**The sovereign road** — the kingdom that refused the eagle and kept its gates —
arrives at the Augustan settlement in a position no other court in the East is
in. Every throne there is explaining that it backed the wrong Roman; Jerusalem
never backed a Roman, and has no patron to invoke, no apology to make and no
debt on either side. *Nothing to Apologise For* (−20): treat with Rome as a
power and sign nothing that says client, or take the friendship and the subsidy
and the word that comes with them, which the country will go on knowing the date
of. *The Year Nobody Petitioned* (6 CE) closes it — the petition worked in the
other history because there was a court of appeal above the king, and here there
is not, so the complaints go to the assembly and are heard badly by the
complainants' own neighbours. Which is the ordinary condition of self-government
and nobody's idea of a triumph.

## 124. The sixty years to the Revolt

The last edge. §120 gave all three of the 40 chapter's roads a 6 CE and then all
three stopped there, sixty years short of the Great Revolt.

Those years contain the best-documented near-miss of the period, and it is why
this bridge was worth writing rather than merely owed. In 40 CE Caligula ordered
his statue set up in the Temple. Petronius was given an army and told to do it,
and spent a year not doing it — marching slowly, holding hearings, and finally
writing to the emperor that the province would have to be depopulated first,
because the population had come out in tens of thousands and lain down in the
fields through the sowing season and said it would die instead. Caligula ordered
him to commit suicide. The order and the news of Caligula's assassination
crossed in transit.

That is a story about a **province**, and it is a completely different story
about a **kingdom** — which is exactly why three roads arriving here was worth
having:

- **The province has no instrument but the crowd.** *A Post for Men on the Way
  Up, or Down* (26) sets the terms: the standards come out of Jerusalem after
  five days of people offering their necks, and the province learns it can say
  no — or the aqueduct is built with Temple money and the grievance goes into a
  ledger nobody reads until 66. Then *The Statue and the Crowd* (40), where the
  delay holds or it does not; and *The Spring of Sixty-Six*, which prices sixty
  years of that ledger into the revolt the next chapter opens on.
- **A kingdom has an army, a treasury and an ambassador.** *A King Between* (26)
  asks whether to govern through the priesthood or around it — the second is
  efficient, modern, and builds precisely the constituency that stopped the
  sacrifices in the other history. *The Order That Was Never Given* (40) spends
  the friendship: the statue is talked out of existence at a dinner by somebody
  the emperor likes, the most expensive meal in the chapter and the cheapest war
  never fought — or the kingdom refuses in advance, in writing, with its army on
  the border, which a province cannot do at all. *The Year the Other Country
  Rose* (66) closes on a kingdom where the liturgy that war began over is not in
  the book, and the year is remembered, where it is remembered at all, for a
  poor harvest.

With this every chapter edge in the game is closed. `67bce` runs to 6 CE,
`40bce` to 66, `66ce` to 130, `167bce` to 6, and 132, 614 and 1948 already ran
to their own horizons.

- **Regression contract**: `smoke83.mjs` (the tree, which now carries both
  chapters' new forks and their extended `lastYear`).

## 125. The rung above the best road

§118 through §124 closed the chapter **edges** — seven chapters that stopped
before their own history did, four of them on the road a player most wants to
reach. Every chapter now runs to its horizon. This section is the other axis,
and it is the one the edge work kept walking past: a chapter can run all the way
to its last year and still never ask the question that **winning** creates.

The success roads all end the same way, which is the tell. The state survives,
the chronicle says so, and nothing in the remaining decades is addressed to the
fact that it survived. `ev_diadem_in_dust` puts a Jewish king in Antioch and the
chain has no card that says what that is. `secondKingdom` leaves the Temple
standing in a world where four Jews in five live under other kings, and nothing
asks what the crown owes them. `redemptionEra` runs to 425 through the two
centuries in which both neighbours acquire official truths, and the arc that
§118 built for it never mentions either. Winning is the least examined thing in
the game.

Five packages, one per chapter with a road worth the question. Each is the rung
**above** that road: it fires only on the road, it charges for what the road
won, and it closes on a terminal dated to the chapter's own `lastYear`.

**The empire that should not exist** (`events_167bce_empire.js`, 130 BCE–6 CE).
The 167 chain's success ladder is eleven rungs and every one of them is a place
— the hills, the Philistine coast, the Greek cities, Damascus, Tyre and Sidon,
Antioch. Then it stops. A Judaea holding Antioch, Damascus and the coast is not
a kingdom that won its war; it is the thing that replaced the Seleucid empire,
and the chain neither says so nor charges for it. The charge is the whole
package, and every item on the bill is one the Hasmoneans actually hit at a
fraction of the scale. *The Kingdom That Replaced an Empire* is a chancery
problem: the state's entire vocabulary of itself is the vocabulary of a people
who were being crushed and stopped being crushed, and none of it has a word for
governing Cilicians. *Where the King Sits* is the question Constantine answered
at Byzantium four centuries later and answered the other way — Antioch has half
a million people, a mint and the archives; Jerusalem has the Temple. *An Army
Judaea Cannot Raise* is Jannaeus' Pisidians and Cilicians made structural rather
than episodic: the levy is farmers who came out because the war was about them,
and they will not garrison a Cilician pass for three years. *The Altar and the
Throne* is Hyrcanus' refusal in a world where it cannot work — the Day of
Atonement is a fixed date, the service requires one man in one building, there
is no provision for a deputy, and Antioch is three hundred miles away. The
terminal reads the realm's own gentile share back to it: a state founded to keep
Israel from being dissolved into the nations, governing more of the nations than
of Israel, and nobody chose it in a single year.

**The nation larger than the state** (`events_66ce_nation.js`, 75–130 CE). The
one question only a surviving Temple can ask. Every adult male of Israel sent a
half-shekel a year to a building most of them never saw, and Rome understood
exactly what that was — which is why, when the Temple burned, Vespasian did not
abolish the levy but redirected it to Jupiter Capitolinus. The *fiscus Judaicus*
is the Roman state conceding that the Temple tax was a fiscal instrument worth
capturing. So a Judaea whose Temple still stands holds a revenue stream, a
census and a claim of allegiance running through every major city of an empire
it does not govern, and *The Half-Shekel of the World* asks whether taking the
money makes the state a foreign power taxing Rome's subjects. *More of Us Are
Elsewhere* asks the constitutional version: a state governs the people inside
its borders, and this one has been answering lawsuits from outside them for two
generations. Then *The Nation Moves Without the State* — the Kitos War, arriving
as a question rather than a chapter. A hundred thousand people have moved on the
assumption that a Jewish state existing at all meant something, and if it does
not mean this, the council will have to say what it does mean.

**Three hundred years of a state that should not exist**
(`events_132ce_endure.js`, 150–425 CE). The worst possible three centuries in
which to be a small state with its own god. Rome Christianises and by 380 its
reading of Jewish scripture is law; Ardashir replaces a tolerant Arsacid house
with a state church whose chief mobad cut an inscription at Naqsh-e Rostam
listing the faiths he struck at, with the Jews on it by name. *Between Two
Churches* is that position, and its third option — be neither, and pay — is the
expensive one that keeps the question open. But the best card here is the quiet
one. **The Talmud is a diaspora artifact.** The Mishnah was closed around 200 by
a Patriarch with no state, no Temple and no army, and its whole method — a
portable homeland made of argument — is a response to not having a country. A
Judaea with a king, a Temple and a Sanhedrin in Jerusalem has much less reason
to build one, and *The Book That Need Not Be Written* lets the player make that
trade knowingly: winning the war may cost this civilisation its most durable
creation. *The Crown and the Chair* is the constitutional question the
Patriarchate creates once there is also a state, left unanswered by two men on
good terms whose successors may not be.

**The third power** (`events_614ce_third.js`, 620–692 CE). A different problem
from the other four, because this state cannot beat either neighbour and both of
them know it. Survival is not strength; it is being worth more intact than
absorbed. *The Altar on the Mount* is the whole problem in miniature — the thing
the return was for, and the single act most likely to make both empires decide
the state cannot be left standing. *Worth More Standing* converts a geographic
accident into a policy and makes the kingdom structurally dependent on the war
between its neighbours continuing. The terminal is the year the Dome went up in
the other history, and it asks what is on that platform instead.

**The question that came back** (`events_1948_question.js`, 1967–2000). The same
rung as the other four — a Jewish state larger than the institutions it was
built out of, deciding what it is in relation to the people it now governs who
are not of it. In 167 that card is `ev_law_of_the_nations` and it fires when the
realm passes fifteen provinces with a gentile majority. It is the oldest live
question in this game and the 1948 chapter is the one place where it is not
history, so the rule here is stricter than elsewhere: the card presents the
positions as their own advocates state them, with mechanical costs and no
authorial verdict; the `historical:` line reports what was argued and by whom
without adjudicating; and no option is rewarded for being correct. A player who
wants the game to agree with them will not find it doing so. That is the same
standard the codebase applies to Pompey and to the Temple — the difference is
only that this one is still going on.

### What the integration turned up

Three defects, all of the same species: a content package cannot crash, because
every effect is wrapped and every trigger is guarded, so everything it gets
wrong fails **silently** instead.

- `declareWar(ctx, atk, def, name, cb)` takes the war's name as a string in its
  fourth argument. The march for the diaspora passed `{ name: '…' }`, which put
  `[object Object] begins` in the chronicle and in the war notification. Nothing
  threw; the war was real; only the name was gone.
- A modifier declared `aiPassive: 0`, which is not a key sim/economy,
  sim/military or sim/unrest ever looks up. The tooltip promised a standing
  invitation to any neighbour who can count, and the engine stored a number
  nothing read.
- *Two states: withdraw to a defensible line* promised that provinces beyond the
  line are released and delivered no territorial effect at all, which made the
  costly option of a three-way question the free one. It now hands the hill
  country back to Jordan and Gaza and the Sinai to Egypt through the same
  `changeOwner` path the chapter's own Sinai withdrawal uses, and exchanges
  letters of recognition under §96 — the engine already knows how to buy peace
  with paper, and "trade the rest for recognition" is exactly that transaction.
  The two answers that are not withdrawals are asserted to move no border.

The tree gains five forks and twelve roads, 41 to 53, still with exactly one
declared gap.

- **Regression contract**: `smoke85.mjs`. It checks the class above rather than
  the exceptions: every faction id against the chapter's own bookmark, every
  modifier key against the set the sim actually reads, every card windowed so
  §121's horizon cannot retire it before its band opens, every answer leaving a
  mark distinct from its siblings (the terminals read those marks back), each
  entry card firing on the road and on neither an early year nor a lost
  campaign, and the withdrawal measured against the map instead of its tooltip.

## 126. What a state does with what it took

§125 gave five chapters the rung above their best road and stopped there, at
the question winning creates. This is the layer under that: what the state
actually *does* between winning and being asked about it. Four packages, and
one of them is not a chapter's at all.

**The House, and the window it was built in** (`events_132ce_house.js`,
137–210 CE). Two things the redemption road was missing. The first is an
expansion ladder — 167 has eleven rungs from the Gophna hills to Antioch and
132 has none, so a Judaea that beat Julius Severus has an army, a frontier and
nothing to do with either. But the ladder cannot be the Hasmonean one, because
the situation is inverted: Judah expanded into a vacuum, and Bar Kokhba would
be expanding against an empire at the height of its power that has temporarily
lost a war. Hadrian recalled Severus from Britain and spent three and a half
years and enough men that he dropped the customary "I and the army are well"
from his address to the Senate. An empire that pays that much to lose comes
back, so every rung on this ladder is also a clock and the cards say so.

The second is the House. The chapter already raises an altar on the cleared
Mount, which is the Ezra move and correct as far as it goes — Ezra set up the
altar and resumed the offerings in the seventh month before the foundation was
laid at all (Ezra 3:2–6). A sanctuary is a different order of undertaking and
brings three problems the altar does not. **Purity**: anyone who has touched a
corpse is unclean and the only remedy is the water of the red heifer (Num. 19);
Mishnah Parah 3:5 counts the heifers ever prepared and reaches nine, the last
three generations ago, its ashes gone with the sanctuary. A priest may approach
an open-air altar in a state the Heikhal will not tolerate — so the altar could
be raised on a Nasi's ruling and the House cannot. **Scale**: Herod's House was
a Hellenistic monument and everyone knew what it was for; Zerubbabel's made the
old men who had seen the first one weep. Building small is a judgement on
Herod, and building large is agreeing with him. **The priesthood**: the
revolt's own coinage names Eleazar the Priest beside Simon, a constitutional
arrangement nobody wrote down, and who appoints the High Priest of a restored
House is the question that broke the Hasmoneans, arriving two hundred years
early.

**The window both empires left open** (`events_614ce_power.js`, 628–690 CE).
§125 treated this state as a buffer that cannot expand, and that was a design
choice rather than a fact — wrong for one specific decade, and it is the most
important decade in the chapter. The war of 602–628 ended without a winner:
Khosrow II murdered by his own nobility, a dozen Persian rulers in four years
including two queens, the currency collapsed and the Nahrawan flooded;
Heraclius won and was bankrupt, plague-struck and a generation of manpower
short. Neither empire could field an army in Syria in 634, which is the whole
reason the Arab conquest moved at the speed it did — not that the Rashidun were
unstoppable but that the ground in front of them was empty. A Jewish state
holding Jerusalem in 630 with an army in being is standing in that same empty
ground, and the game should let it act on that.

The prize is not Damascus. It is **Babylonia** — the largest Jewish population
in the world, there a thousand years, richer and more numerous than the one in
Palestine, and with its own government in the Exilarch and the academies. There
has been no single Jewish authority over both centres since the First Temple. A
state that takes Mesopotamia from a collapsing Persia does not gain a province;
it gains, or collides with, the other half of its own people, and the
Exilarch's claim is at least as good as Jerusalem's. The precedent is real: Mar
Zutra II is said to have held an independent Jewish state around Mahoza for
some seven years about 495–502, before Kavad crucified him on the bridge at
Ctesiphon.

**The line of Jehoiachin** (`events_614ce_david.js`, 640–690 CE). Every Jewish
state in this game has ruled without the one qualification the tradition
actually specifies. The Hasmoneans were of the house of Joarib and the crown
they took in 104 was the standing grievance against them for a century. Bar
Kokhba's title on his own coins is Nasi, not king; Akiva read him out of
Numbers 24 as the star, which is a messianic argument and not a genealogical
one, and Yohanan ben Torta's reply about grass growing from Akiva's cheeks is
in the record because somebody thought the distinction mattered. The Exilarch
is the exception — the Resh Galuta claimed direct male descent from Jehoiachin,
released from a Babylonian prison in 561 and given a seat above the other kings
in the last verses of Kings, and the line is written down in Seder Olam Zutta
and in Sherira Gaon and was recognised by the Sasanian state. So a kingdom that
unites both centres reaches a situation that has not existed since 586 BCE: a
throne, and a man with the pedigree for it, in the same polity. If a son of
David is crowned in Jerusalem with the offerings going up, then either the days
have come or they have not — and if they have not, the kingdom must explain
that every morning for as long as it lasts.

**Annexation** (`events_annexation.js`), which belongs to no chapter. The
engine already annexes: `p.integration` climbs in three steps of 0.34 under a
program and at 1.0 the owner writes its own name on the map. What it does
silently is the only part anyone would remember — a Jewish state absorbing a
town that is not Jewish has to decide what the people in it now are, and the
engine emitted a notification saying the province was 34% integrated. That
decision is not invented for this game. It was made twice and both times by a
Hasmonean: Hyrcanus took Idumea and gave its people circumcision or the road
(Ant. XIII.257–8), and Aristobulus did the same to the Itureans a generation
later. It is the only large-scale forced conversion in Jewish history and it is
the direct cause of the most consequential fact of the next two centuries,
which is that the man who ruled Judaea from 37 to 4 BCE was the grandson of a
converted Idumean. The policy worked, in the sense that Idumea became Jewish
and stayed Jewish through the destruction. It also produced Herod. Both are the
same fact and the package refuses to separate them: one card sets a standing
policy the first time it matters, and two later cards collect on it.

The pool is keyed on the player rather than on a chapter, so the registry says
where it plays — every antique chapter, never 1948 — and the cards say when.

### The engine gained one lever and lost seven dead ones

`integrateMult`. Integration now answers to a realm-wide multiplier the way
conversion already did, one line in `realm.js` mirroring the one above it. A
standing policy on the conquered is exactly a claim about how fast a province
stops being foreign, and the only lever content had was `convertMult`, which
changes the religion and not the allegiance. They are different questions and
the Hasmoneans answered them separately.

And a correction to §125, found by making `smoke85`'s key check derive its
vocabulary from the engine instead of from a list somebody typed:

- **`aiPassive` is a real key.** §125 reported it as one no part of the sim
  reads. `sim/ai.js` reads it, as a boolean. What shipped was `aiPassive: 0` —
  the key spelled right and the value spelled falsy. The Frontier of the Levy
  now declares it `true`, which is what a crown that has drawn its border where
  its own farmers will stand is telling the world.
- **`taxMult` is province-scope.** It is read by `provMult()` in
  `sim/economy.js`, which walks a *province's* modifiers and is never handed a
  tag's. Seven tag modifiers across §125 and §126 declared it — the Antioch
  seat, the two courts, the hired shields, the settled line, the crown's
  appointment, the road, one authority — and every one was a cost or a reward a
  tooltip had already promised the player. They are folded into `incomeMult`,
  the lever that exists at tag scope, and the tooltips now say what the numbers
  do. Two of them changed meaning honestly in the process: Two Courts is a net
  −5% rather than +8% gross and −12% net, because that is what one multiplier
  can say, and it is the truer statement anyway — the second capital earns less
  than the duplicated government costs.

The check that found them is the interesting part. A hand-written whitelist is
the same bug one level up, and it had already produced a false negative on
`aiPassive`; the suite now reads `resolveTagMult`/`resolveTagAdd` call sites out
of the sim and knows which keys are province-only, so a key can be wrong by
being misspelled, by not existing, or by being applied at the wrong scope, and
all three fail.

- **Regression contract**: `smoke85.mjs`, extended — the same structural
  sections now cover eight packages, plus a section for the shared pool
  (registered in six chapters, absent from 1948, windowed shut before it
  regardless) and the scope check above.

## 127. A court is not a fixed cast

Reported, and correct: the Pharisee/Sadducee split is a live court mechanic in
the 67 BCE chapter and invisible in 167.

It was not entirely absent. The 167 chain has `ev_pharisee_breach` in −114 —
Hyrcanus asked to lay down the priesthood, the sage Eleazar's insolence, the
king going over to the Sadducees — and it has Salome's deathbed and her
restoration of the schools in the royal century package. What it did not have
was a **party**. The court panel showed the Hasideans, the Hellenizers and the
Brothers' Captains, in −167 and identically in 6 CE, because `factionDefs` read
a flat per-bookmark table with no time in it. So the most consequential court
event in the chapter moved no faction, the panel offered no way to court either
party, and the breach was a chronicle entry with a modifier attached.

That was defensible while the chapter stopped at Pompey. §121 and §125 carried
it to 6 CE, and the years they added are precisely the years of the quarrel:
Hyrcanus' breach, Jannaeus' war on his own subjects — the six thousand pelted
with citrons at the festival, the eight hundred crosses — and Salome's nine
years of Pharisee government. The chapter played all of it with the Hasideans
still on the panel, a party attested fighting for the Law in the 160s (1 Macc
2:42, 7:13) and gone from the record within a generation.

**The mechanic.** A faction def may declare `fromYear` and `untilYear`, exactly
as an event declares its era window, and `factionDefs` filters by the calendar.
The Hasideans and the Hellenizers hold their seats until −140; the Pharisees
and the Sadducees take them from −140, which is about when Josephus first names
the schools (Ant. XIII.171). The Brothers' Captains declare no window and sit
through both. A chapter that declares no windows at all is untouched, and gets
its list back by identity so nothing allocates per month and a formed crown
still keeps the same men (§102).

Two rules make it a succession rather than a reshuffle:

- **`succeeds`.** A new party seeds at its predecessor's standing rather than
  at neutral. The Pharisees are not a constituency this court has never met;
  as far as the crown's relationship with the pious goes they are the same men
  under a name the record starts using around 140. Reseeding them at 50 would
  hand a king who spent thirty years courting the Hasideans a clean slate he
  did not earn, and give one who spent thirty years affronting them an amnesty.
- **The heir rule.** `shiftFaction` resolves a departed id through the
  succession chain to whoever now holds the seat. Thirteen cards of the 167
  chain name the Hasideans and can fire after the 140s — the eight hundred
  crosses, the deathbed, the admonition, the Law of the Nations — and every one
  of them means *the pious party*. Without this they would shift a faction that
  is no longer seated and do nothing whatever, which is the same silence this
  section is about. An id that never existed still fails soft.

The cards that know which century they are in say so directly: the breach now
moves both parties in opposite directions (Sadducees +30 / Pharisees −35, or
Pharisees +25 / Sadducees −15), and §125's empire package, all of whose cards
fire between −130 and −6, no longer promises Hasidean favour in 120 BCE.

The two new defs are written for the century they sit in rather than copied
from 67 BCE. The Pharisees' demand is the one Hyrcanus actually refused — let
the crown suffice thee — and their drift improves if the offices were ever
divided. The Sadducees' is the counter-demand, that the Temple be governed from
the Temple under the written Law and nothing added to it, and their drift
improves while the crown holds the priesthood and a solvent treasury.

- **Regression contract**: `smoke86.mjs` — the seats change hands on the year
  they should and not a year early, standing carries across, a card naming a
  departed party lands on its heir, an unknown id still lands nowhere, the
  panel renders what is actually seated, and the chapter with no windows is
  bit-for-bit unaffected.

## 128. Beit Kosiba, and an answer a world can withhold

The redemption road wins a war and inherits a problem the war was not about.
Shimon ben Kosiba left no rule of succession. What survives of him is a
signature — *Shimon ben Kosiba, Nasi Yisrael* — on leases of state land at Ein
Gedi, on letters promising to put his own commanders in irons, on requisitions
for the Four Species and a great deal about wheat. Twenty years of a man who
wrote about everything, and not one word about an heir. In the history that
happened the omission cost nothing, because there was no after. Here there is,
and it was the chapter's largest unexamined liability: a state founded on one
man's authority, with no rule for transferring it, arriving at the year that
man dies.

Four cards, and the rest of the chapter reads off what they decided.

### The engine first: an option a world can close

Every card in this game offered all of its answers. That is right almost
everywhere and wrong for an accession. A house cannot marry into the line of
Jehoiachin if it cannot reach Babylonia, and showing that option greyed out is
a **different card** from not showing it: one says you failed to arrange this,
the other says it was never on the table.

So an option may now declare `when(ctx)`. The mask is computed once, at the
moment the card fires — an answer that was open when the question was asked
stays open while the player thinks, which is the rule `decider` already
follows. Indices stay the originals the whole way: the pending entry carries
the mask, the modal renders a subset and puts the real index on the button, the
multiplayer mirror masks the same way, and `resolveEventOption` refuses
anything outside it. An off-by-one between what is rendered and what resolves
would silently adopt the wrong constitution, so the round trip is the thing the
suite actually tests. A card whose every option closes falls back to offering
all of them, because an unanswerable card holds the pause open forever.

### I. The Prince Is Mortal

Fires when the founder dies, or reaches an age where the council cannot pretend
he will not — roughly 150–178. It does not fork the constitution. It puts the
question on the table and lays out the four documents that are actually in the
archive: the Hasmonean settlement, a marriage contract, the two-named coinage,
and a scroll of Ezekiel open at the forty-fourth chapter.

What it *does* decide is who is standing in the room, because the house does
not choose in the abstract — it chooses under pressure from whoever is
strongest on the day. Put the question formally and the schools and the country
are strong enough to force answers a soldier would not offer. Decline to raise
it while the old man lives and the captains settle it in the antechamber before
dawn, which is faster, quieter, and narrows the constitution to whatever a
soldier can see the point of.

### II. The Accession

Fired by the card above rather than scheduled — a succession is not a month.
Which answers appear depends on the state, which is the point.

- **The crown.** Always available. The Hasmoneans waited sixty years of de
  facto rule before Aristobulus put on the diadem; this house can do it in one
  generation and skip the pretence, from a worse starting position, because the
  Hasmoneans could at least claim Joarib. The sages will say so in every
  generation, in writing, and the writing is what survives.
- **The marriage.** Needs the east reachable, because the line is kept in
  Babylonia and somebody has to go and get it. Herod's move exactly: marry the
  pedigree you do not have. The payoff is not the marriage, it is the grandson,
  so it is a generation of nothing followed by a claim nobody can argue with —
  and whoever holds the Exilarchate now holds a permanent claim on this
  succession. Herod's version ended with him killing his wife and later her
  sons.
- **The two houses.** Needs a priesthood organised enough to be made
  hereditary. Shimon and Eleazar, as the coins implied, on both sides — the
  arrangement the Hasmoneans collapsed into one office and paid for a century,
  run in reverse, which nobody has tried.
- **The prince of Ezekiel.** Needs the sages. Take the founder's own title and
  give it a constitution: chapters 44 to 46, a nasi who brings his offerings
  like anyone else, holds no priestly office, and — 46:16–18 — may leave his
  inheritance to his sons but may not take the people's land. A hereditary
  office deliberately engineered not to be a monarchy, which walks around the
  Davidic objection entirely, because Ezekiel's prince was never supposed to be
  David's heir.

  And it has a barb. The founder leased the land of Israel in his own name, as
  Nasi, and the leases are in the next room, and the rents are a material part
  of what the state runs on. That is arguably the precise thing 46:18 forbids.
  So the option fires a second card nobody enjoys: regularise the founder's
  practice as a special case — a gloss on the constitution in its first year,
  named after the man it is about — or stop, and tell the treasury to find the
  money elsewhere at −15% income forever. A constitution that cost something in
  its first year is a constitution people believe in.

### III. The Grass on Akiva's Cheeks

180–225, once the state is boring. A victory inverts the entire memory. Akiva
stops being the sage who erred and becomes the one who saw; Yohanan ben Torta,
who told him grass would grow from his cheeks before the son of David came, is
no longer sober judgement but a man who was wrong in public and got it written
down. A young sage has collected every recorded doubt into one volume — the
finger-cutting test, the objection that the founder was making Israel
blemished, the death of Eleazar of Modi'in on a suspicion nobody substantiated
— and brought it to court himself, unasked.

Suppress it and the founding is clean, at a price the crown does not pay: the
academies have learned that their records are negotiable, and they are the
institution this civilisation keeps everything in. Preserve it and the
tradition is honest and every rival for three hundred years has a Jewish book
to quote from. Or canonise the doubt — read the objections at the founding
festival every year, beside the account of the victory, on the grounds that a
redeemer who cannot be criticised is an idol. It costs legitimacy permanently
and cannot be undone, and it buys the one thing no other answer does.

### IV. Bar Kokhba or Bar Koziba

The pun was always there and it is one letter: son of a star, son of a lie. It
was Rome's joke first and then the sages', and for a century it has been
nobody's, because the man won. It fires on the first serious defeat after the
founding generation is dead, in any century — a broken frontier, a column
somewhere it should not be, and a preacher in the Galilee using the other
spelling in public to crowds and not being arrested nearly fast enough, because
the men who would have to arrest him are waiting to hear the answer.

This is where the constitution earns out. A crowned house has nothing but force
and confirms the joke by using it. A married-in house points at the pedigree,
which is slow and real. Two houses put a priest up to say the offerings are
still going up, and the state loses a frontier without losing its founding. The
prince of Ezekiel has the best answer available and the most humiliating: he
was never the redemption, he was a magistrate under a constitution, and
magistrates lose battles. It is the most abject sentence the state has ever
published and it ends the matter in a season. A house that never settled the
question at all has nothing to say, and the other spelling spreads through a
year in which nobody in authority contradicts it.

The second answer is silence, and it is a bet on the constitution rather than a
use of it: a founding that can be stated in one sentence survives being
ignored, and one that cannot discovers that the only sentence in circulation is
the preacher's.

### What the rest of the chapter does with it

The 425 redemption terminal already read the campaign back as a list — the
loyalty question of 212, the certificate, the coast, the canon, the Mount. The
constitution joins that list and is read last, because it is the only entry
about the state rather than about a year. The endure terminal, which falls in
the year Rome abolished the Patriarchate, now names what this history has
instead of an office to abolish. And *The Crown and the Chair* stands down
entirely under either written answer: a house that wrote its constitution in
the 150s does not discover in 300 that the constitutional question is open, and
firing that card afterwards would have the chapter contradict its own campaign.

The tree gains two forks and seven roads, 60 to 67.

- **Regression contract**: `smoke87.mjs` — the mask closes and opens on the
  state, survives the round trip to resolution by original index, cannot be
  defeated by asking for a closed index, and never touches an ungated card;
  the question opens on age or on a vacant seat and fires the accession the
  same morning; only the Ezekiel road raises the leases; the defeat card waits
  for a defeat and answers in five different ways; and the terminals read all
  four constitutions back.

## 129. The rising is not Judaea

Reported, and it was true of every road: the diaspora revolt of 115–117 was
modelled as something the player's own state did.

Three cards across two packages offered to rise with the diaspora, and what
that meant mechanically was that **Judaea declares war on Rome** while Cyrene,
Cyprus, Egypt and Babylonia received a `+3 unrest` province modifier for
ninety-six months. The communities that actually rose were never a belligerent.
They were weather on somebody else's provinces, and the only army in the field
under a Jewish flag was the player's.

That is backwards, and it is backwards about the one thing this war is famous
for. The Kitos War happened **without Judaea**. It began in Cyrenaica among
Greek-speaking communities that had never been governed from Jerusalem and
answered to nobody there; Eusebius says the Jews of Cyrene appointed a king of
their own, whom he names Lukuas and Dio names Andreas. Judaea proper stayed
quiet, which is why it still had a population to lose in 132. The question the
period actually put to a Jewish state was never *whether to rise*. It was
whether to join somebody else's rising — and a game that renders the rising as
the player's own war cannot ask it.

**The rising is now a state.** `LUK`, the Host of Lukuas, secedes from Rome
with its own colour, its own king and its own war, on every road and whatever
Judaea decides. It is Jewish and Greek-speaking, and that pairing is the
argument: a player who joins this war is allying with a foreign power that
happens to share his religion, which is exactly the relationship the second
century was trying to work out and could not.

The ground is the ground it took. Cyrenaica, Egypt and Cyprus are the Roman
half and always rise. Mesopotamia rose against Trajan's *occupying army*, so
those cells join only if Rome is standing on them — a Parthian Babylonia has no
occupation to rise against, and the card does not pretend otherwise. A world in
which Rome holds no Cyrenaica gets no Cyrenean rising at all, and the cards
fall back to the old behaviour rather than inventing a state out of nothing.

**Judaea's answer is an alliance, not an identity.** Where a card used to have
the crown declare its own war, it now joins the rising's: both are at war with
Rome, neither with the other, allies on both sides of the ledger, and the
rising thinks well of the kingdom that came. Refusing leaves the kingdom at
peace and the rising in the field, which is the historical shape and the more
uncomfortable one — the flags that later cards read (`joinedTheRising`,
`refusedTheRising`, `roadHeldOpen`, `roadShut`, `roseWithTheEast`) are
unchanged, so everything downstream still prices the decision the same way.

Worth noting what did *not* need changing: the prose. Every one of these
options already said *joins the rising*, and the tooltips already described a
diaspora fighting with a homeland beside it. The cards had been describing the
right war for two batches; only the mechanics were describing a different one.

The 132 chapter is untouched, and correctly so — it treats the revolt as
already-happened backstory, thinning the synagogue communities of the Greek
east and barring Jews from Cyprus, which is exactly what it should do with a
war fought fifteen years before it opens.

- **Regression contract**: `smoke88.mjs` — the tag exists and is neither
  Judaea's name nor its colour; the rising raises on all five answers across
  both roads including the two where Judaea refuses; it takes Cyrenaica, Egypt
  and Cyprus and leaves Jerusalem alone; Babylonia joins only under occupation;
  joining produces two allied belligerents rather than one; the spawner is
  idempotent across the six places that call it; and no Roman ground means no
  rising rather than a phantom one.

## 130. The second government

Winning the Great Revolt ended the chapter's story. It should start one.

Victory in 70 would have settled nothing, and the war itself is the proof. The
priestly aristocracy under Ananus ben Ananus formed a provisional government in
66; in the winter of 67–68 the Zealots and their Idumean allies came through
the gates in the snow, killed him, and left him unburied. Two governments in
eighteen months, in sequence rather than in competition, and the second was
still there when Titus arrived. A Judaea that WINS has those same three parties
inside the same walls with the one thing they all agreed about — Rome — taken
away from them.

So the chapter gains a second fork, after the one that asks what kind of state
this is. That one is about character. This one is about the constitution, and
every answer is something somebody in Jerusalem actually did or actually argued
for between 66 and 70:

- **The temple-state.** High Priest, Sanhedrin, the constitution Judaea had
  under Persia and the Ptolemies and most of the Hasmonean century. The only
  one of the four with a working precedent, which is the argument for it — and
  it hands the country back to the four priestly houses that Pesachim 57a
  curses by name, in a baraita remembered because everybody agreed with it.
- **The lottery.** The Zealots did this in 67 and drew Phanni ben Samuel of
  Aphtia, a stonecutter, who had to be taught the duties. Josephus calls it the
  abrogation of the Law. Read the other way it is a principle with a text
  behind it: the office belongs to God's choice and not to four families'
  arithmetic. It ends hereditary priestly power in an afternoon.
- **The Jubilee.** Simon bar Giora proclaimed liberty for slaves; the Sicarii
  burned the debt archives in 66, which Josephus says was the point of taking
  the Record Office at all. Both are Leviticus 25, a law that had fallen out of
  use precisely because it is unusable. A state that enforces it obeys the
  Torah and destroys its own credit system in the same act, and the men who
  lose by it are the men who funded the war.
- **No ruler but God.** Judas the Galilean's doctrine, held for sixty years and
  never once implemented, because implementing it means having no state to
  implement it with. Not a religious monarchy — the refusal of monarchy, and
  its own people enforced it: when Menahem came into the Temple in royal dress,
  Eleazar ben Ananias' men killed him for it.

**Which are offered is produced by the room, not picked from a menu.** The
temple-state is always available, because an exhausted elite reaches for the
last arrangement that worked. The lottery needs the Zealots. The Jubilee needs
the Zealots *and* the Peace Party broken, because it is their ledgers that
burn. No ruler but God needs the Zealots overwhelming and nobody else left
standing to institute anything, which is the honest gate: it is not a policy a
government adopts, it is what is left when there is no government to adopt one.

### One value, not a scatter of booleans

A decision that steers sixty years of content — including content nobody has
written — cannot live as four flags. The settlement is stored once, by name,
under `constitutions['66ce']`, and the store is **write-once**: a constitution
that can be silently replaced is not a constitution, and a second write is
refused and reported rather than applied. The 132 chapter's accession moved
onto the same store in the same batch, reading `constitutions['132ce']` and
falling back to its flags for campaigns saved before it existed.

The road markers stay written literally at each call site, because smoke83
reads content packages as **text** to prove every road on the path tree is
still set by a live card, and a marker written through a helper is invisible to
it. That is a real constraint and it is the second time it has bitten.

### One small engine change

`helpers.faction(ctx, tag, id)` and `helpers.factionAtLeast(...)`. Content
could always MOVE a faction and never ask where one stood, which meant no card
could be gated on the court that would have to live with it. The read returns
null where no court sits — factions convene only in the player's own court —
rather than a misleading 50, and it resolves a departed party through
`succeeds` exactly as `shiftFaction` does.

### Reconciling what was already written

Four cards assumed a temple-state and became incoherent under the radical
settlements:

- **The half-shekel.** A government that cancelled the debts of the men who
  forward the money collects a great deal less of it: the levy still arrives
  and the modifier drops from +20% to +6%, with a chronicle line about
  Alexandria remitting what it cannot be seen to withhold. And a state founded
  on the illegitimacy of the census gains a fourth answer nobody else can give
  — Exodus 30 makes the half-shekel a ransom against being numbered, so it
  refuses the largest revenue any Jewish government ever had a claim on, and
  gains nothing but consistency.
- **The Kitos War.** A revolutionary government marching for Alexandria is
  making a different appeal from a temple-state's, and the proclamation that
  goes out is not the one the council drafted first — more manpower, less
  money, and both halves of that city reading it carefully.
- **Agrippa II.** He survives a Jewish victory with a dynastic claim, a
  treasury, and the right to appoint the High Priest, and each settlement
  implies a different answer. The temple-state has an office to fit him into
  and buys the claim out. The lottery cannot: his one prerogative was the
  appointment and there is no longer any appointment to make, which is the
  politest letter anyone ever used to abolish an office. The Jubilee looks at a
  Herodian estate and sees land under the law. A state with no ruler but God
  has no category for a king, including the category of exile.
- **The annexation pool.** A government founded on cancelling debt cannot open
  a tribute roll on somebody else, and one that refuses the census cannot
  assess one; both are closed by their own first principle. And *one law for
  the citizen and the stranger* stops being the generous answer under the
  Jubilee and becomes the obvious one, because it is the same chapter of
  Leviticus the state already lives under.

The tree gains a fork and four roads, 67 to 71.

- **Regression contract**: `smoke89.mjs` (the §130 sections) — the read agrees
  with the push and returns null where no court sits; each of the four gates
  opens and closes on the right court; the store is write-once and reports a
  refusal; and every reconciled card branches on the settlement rather than
  assuming one.

## 131. The line was wrong

Reported: the armistice line in the 1948 withdrawal option is wrong, Mitzpe
Ramon and Eilat are missing, and the West Bank looks strange around Jerusalem.
All three, and the third is a consequence of the first two.

§125 assembled its own list of what lay beyond the line instead of using the
one the chapter already keeps. `events_1948.js` defines `WEST_BANK` — fifteen
cells, "the cells the Arab Legion actually held in 1949" — and
`ARMISTICE_1949_ISR_GAINS`, the territory outside Israel's 15-May holdings that
is inside the 1949 line. §125 used neither.

**It forgot the Jerusalem corridor.** It handed back eight hill towns and left
Lydda, Emmaus, Beit Shemesh and the Modi'in Hills out of the reckoning
entirely — and two of those are in the chapter's own list of territory *inside*
the line. The result on the map is the thing the report describes: an Israeli
Jerusalem sitting as an island in a Jordanian West Bank, which is not what the
armistice produced and not a shape any border has ever had. The corridor is the
whole reason the city was holdable.

**And it ignored the Negev.** Beersheba, Arad, Oboda, Dimona, Mitzpe Ramon,
Paran and Eilat all begin the chapter in Egyptian or Jordanian hands and are
all inside the 1949 line. Umm Rashrash was taken in Operation Uvda in March
1949 and is the reason the state has a Red Sea coast at all. A withdrawal
defined without any of them is not a withdrawal to the armistice line; it is a
withdrawal to a vague memory of one.

The option now gives back what falls outside the line — the Samarian and
Judaean hills to Jordan, Gaza and anything held beyond it to Egypt — and keeps
what falls inside it, corridor and Negev together, and the chronicle counts
both so the southern half of the border is said out loud instead of inferred
from the map.

**Jerusalem** is the one cell the map cannot honestly resolve. The armistice
divided the city and there is a single province here. It stays with the state
that holds it and the corridor stays with it, and the card says in as many
words what the communiqué said: the status of Jerusalem is reserved for a later
negotiation, there is no later negotiation scheduled, and both delegations sign
anyway.

- **Regression contract**: `smoke89.mjs` (the §131 section) — everything beyond
  the line changes hands, nothing inside it does, Umm Rashrash is still held
  under the name the province actually carries, the capital is not left an
  island, and no district is handed to a state that has ceased to exist.

## 132. One click is one click

Reported: the realm panel's buttons need pressing two or three times — hiring a
court, upgrading the military.

Not the handlers. Those are delegated once on the panel root and never rebound,
which is the right shape and was never the problem. The problem is that
`refresh()` runs on the `day` signal — every simulated day, forty milliseconds
apart at the fastest speed — and several sections rewrote their own
`innerHTML` **unconditionally**, whether anything had changed or not. A click
is only delivered when mousedown and mouseup land on the same element, so a
rebuild between the two detaches the button and the browser dispatches no click
at all. Press again and you are simply rolling the dice a second time.

The panel already had `setHtml`, which skips the write when the markup is
identical, and most sections used it. Five did not: the court, the technology
ladders, the reform trees, the great powers, and the foreign-court views of the
first two. The court and the ladders are exactly the two the report named.

So every section writes through `setHtml` now, and in the steady state the
panel touches no DOM at all between ticks.

That alone would leave a smaller version of the same race — monarch points
accrue, a `disabled` class flips, and the section legitimately rebuilds under
the finger. So the panel also **defers refreshes while a pointer is down inside
it**: the day still ticks, the sim is untouched, and the panel catches up the
moment the button is released. The catch-up is queued behind the click rather
than run from `pointerup`, because `pointerup` is dispatched *before* `click`
and rebuilding there would be the same bug moved one step later.

### Why no test caught it

Every existing UI test around these buttons pauses the game for the instant of
the click — `paused = false`, click, `paused = true` — which is precisely the
condition under which the bug cannot happen.

`uitest37.mjs` reproduces the mechanism instead of the timing: it holds the
button down, emits the real `day` signal the clock sends, and releases. Against
the code as it was, the technology press and the advisor press are both
swallowed (5 → 5, 0 → 0) and the decision press survives — which matches the
report exactly, because the decisions section was already writing through
`setHtml`.

One harness note worth keeping: the panel scrolls and these buttons sit well
below the fold, so raw `page.mouse` coordinates land outside the viewport and
nothing is pressed at all. `locator.click()` scrolls; `page.mouse` does not.

## 133. Two rules that excluded the game's own subject

Two reports, unrelated to each other and to §132, both of the same shape: a
rule written for the general case that happens to exclude every Jewish state.

**Royal marriages.** `royalMarriageInfo` required `govType === 'monarchy'` on
both sides. `JUD`, `HAS` and `HYR` are all typed `theocracy`, so no Jewish
state in any chapter could ever arrange a match with anybody — the mechanic was
unreachable for the entire subject of the game. It is also wrong for the
period: Herod married Mariamne the Hasmonean precisely to buy the pedigree he
lacked, Berenice married Polemo of Cilicia, Drusilla married Azizus of Emesa,
and the Hasmonean and Nabataean houses dealt in daughters for a century.

What the mechanic needs is a ruling **house**, not the word monarchy. A
republic elects and a tribal confederation acclaims, so neither has one; a
theocracy has a named head and, in this period, a dynasty behind him. Both are
allowed now and the other two still are not. The heir bonus is untouched and
still only reaches houses that have heirs, so a theocracy marries for the
alliance and not for the cradle — which is the honest arrangement and the one
the sources describe.

**Leontopolis.** Seven peace cards award the winner every province it holds
that is Jewish by religion — `keep: (p) => p.religion === 'judaism'`. Four
provinces on this map are Jewish by religion and were never part of the land:
Leontopolis, Onias' temple settlement in the Heliopolite nome, which was a
Ptolemaic military colony that Vespasian closed in 73; Arbela in Adiabene,
whose royal house converted under Izates; Nehardea in Babylonia; and Khaybar in
the Hijaz. A peace treaty handing Judaea a district of Egypt because there is a
synagogue in it is not a border, and the engine's own contiguity check —
which §116 added for exactly this class of absurdity — is deliberately skipped
whenever a card supplies its own `keep`.

`DEFINES.DIASPORA` names the four and `helpers.isDiaspora` reads it, and all
seven predicates now exclude them. This is about **territory only**: the cards
that mourn the Temple in every Jewish province are right to include all four,
and still do.

- **Regression contract**: `uitest37.mjs` for §132; `smoke40.mjs` (extended)
  for the marriage rule, which now also asserts that a theocracy may marry, two
  of them may marry each other, and a tribal confederation still may not.

## 134. A card fired by a card had no gates

Reported: the Davidic marriage did not trigger for Bar Kokhba. Two defects
behind it, both introduced by §128, and the first is the opposite of what the
report describes — which is how it stayed hidden.

**The mask never reached the accession.** §128 gave options a `when(ctx)` gate
and computed the mask in `fireEvent`. There are *two* functions by that name:
the engine's, in `sim/events.js`, and a second copy inside `simHelpers` that
content calls to fire one card from another. The helper queued its own pending
entry with its own copy of the pause-and-emit dance and knew nothing about the
mask — so `ev_bk_the_accession`, which is fired only that way because a
succession is not a month, had **every one of its gates ignored**. A house with
a hostile Parthia and no road to Babylonia was still shown the marriage; a
court with no sages was still shown the prince of Ezekiel. The helper now
delegates to the real thing, which also hands it the decider notice (§70), the
war-already-settled retirement, and the silent AI resolution — none of which
the duplicate had. Two implementations of one verb, and the second was three
features behind.

**And the road went nowhere.** The option says in as many words that the payoff
is not the marriage but the grandson, and that whoever holds the Exilarchate
holds a standing claim on the succession from that day. Neither existed. Taking
it set a flag, added a legitimacy trickle, and earned a line in a chronicle
three centuries later; there was no grandson, no Exilarchate, and no claim. It
was the only one of the four constitutions whose stated mechanism was
unimplemented, which is a fair reading of "did not trigger" whichever half the
report meant.

*The Grandson of Jehoiachin* is that card. The boy is thirty-one and runs the
treasury's eastern correspondence, the genealogy has been copied four times by
men who did not travel eight hundred miles to watch it filed, and there is a
delegation in the city being extremely courteous. Three answers: let the
succession pass to him and take the pedigree at the price the Babylonians came
to name — a recognised Exilarchate interest in every accession afterwards; keep
the crown where it is and let the pedigree be an ornament, which tells the
eastern communities exactly what their daughter was for; or Herod's arithmetic,
open only to a court with no sages left to object, which removes the claimants
and the claim together and does to its own house the thing the Hasmoneans were
destroyed for.

And *Bar Kokhba or Bar Koziba* now reads which of those happened. A house that
collected on the pedigree answers the pun by pointing at the man on the seat; a
house that left the genealogy in a chest is pointing at a document belonging to
a cousin it declined to crown, and the preacher in the Galilee has already read
it.

- **Regression contract**: `smoke87.mjs` (the §134 section) — the mask reaches
  a card fired through the helper and through the card before it; the grandson
  fires on the Davidic road and on no other; and a collected pedigree answers
  the name better than a shelved one.

## 135. The reward for winning was the chapter going quiet

Reported: a lot of the scripted content in the earlier bookmarks shows up but
does not trigger — the Roman civil wars, Judaea conquering new places.

Both examples are the same defect, and the defect is that **a greater crown
changes the realm's three letters and nothing in the content knows.**

`switchTagCore` is complete about state: provinces, armies, fleets, wars,
warscores, opinions, truces, subsidies, the player's own chair, all rewritten
from the old tag to the new one, and `lineage` recorded so the survivor can say
what it used to be. What it cannot rewrite is the *content*, because the content
is written against literal strings. `greaterVictory` asks whether **HAS** owns
Jerusalem. `playerHasmonean` returns a tag only if the player is **HYR** or
**ARI**. `judaeaFree`, `standing`, `redeemed`, `returnStands`, `thirdPower`,
`hasmoneanHolds` all ask after a fixed set of letters, `findJudRomWar` matches
war sides by them, and `forTag`/`decider` are compared to `playerTag` with `===`.

So every one of those predicates answers **no** the moment the player takes the
crown — and the crown is what a chapter played well leads to. Restore Hasmonean
Judaea is the point of winning the brothers' war. Proclaim the Kingdom of Israel
wants twenty-five provinces, which is the same conquest the greater-victory
strand is *about*. The two things the player is rewarded for doing are the two
things that switch the rest of the chapter off, and nothing says so: the cards
stay listed in the Compendium, where a player can read the ones they will never
be shown.

Measured against the live chains — same seed, same conquests, crowned run
against uncrowned:

| chapter | crown | cards lost |
|---|---|---|
| 167 BCE | HAS → MLI | **22** — the whole royal century (Asophon, Obodas, Gaza, Medaba, Samaria, the twenty-two fortresses, Salome, Simeon ben Shetach), the Akra, the bronze tablets, Gerizim, the Idumea policy, Sidetes' summons, Hyrcanus in the east |
| 66 CE | JUD → MLI | **18** — the entire Second Kingdom road including `ev_house_that_stood`, which opens it |
| 132 CE | JUD → MLI | **13** — including `ev2_era_of_redemption`, the entry to the best outcome in the game |
| 614 CE | JUD → MLI | **7** — the third-power arc |
| 40 BCE | HER → JUD | 2 |
| 67 BCE | HYR → HAS | 1 measured, and the whole sovereign road unreachable by construction |

That last row is the reported one. The `ev4_v_*` branch — the eagle refused,
the choice between Caesar and Pompey, the wager at Pharsalus, Antony or
Octavian, Actium, the kingdom they never renamed — is six cards about the Roman
civil wars, gated behind `playerHasmonean`, which returns `null` for a restored
HAS. A player who wins the 67 chapter the way the chapter asks can never see
any of them.

**The forwarding address.** `lineage` reads the relation from the survivor's
side, which is the right shape for a bookmark table and the wrong shape for a
trigger: a trigger is holding the *old* name and needs to know who wears it. So
`switchTagCore` now also writes `game.tagAliases`, and `livingTag(ctx, tag)`
resolves in one hop. Chains collapse as they form (HYR → HAS → MLI leaves both
pointing at MLI), a banner revived by later content clears its own entry because
a tag that exists answers for itself, and a court that merely *died* is not
forwarded anywhere — content must still see it dead.

Three layers use it:

- **The engine.** `fireEvent` resolves `forTag` and `decider` before comparing
  them to the player. A card is addressed to a court, not to three letters.
- **The helpers.** Every `simHelpers` entry that names a court — `adjust`,
  `controls`, `countControlled`, `addTagModifier`, `spawnArmy`, `spawnFleet`,
  `declareWar`, `endWar`, `setRuler`, `faction`… — resolves its tag argument.
- **The content's own predicates.** A package imports nothing, so it reaches the
  lookup through `ctx.helpers.livingTag` behind a local `who(ctx, tag)`, and its
  `alive`, `holds`, `crown`, `provsOf`, `ruler`, `rulerAt`, `findWar` and the
  chapter gates above all go through it. `who` tolerates a ctx with no helpers,
  because the suites read content cold.

The province strings need no work: `switchTagCore` already migrated them, which
is exactly why resolving the *argument* is sufficient.

**1948 is the exception, deliberately.** Everywhere else a rename is the same
court under new letters, so `alive('HAS')` should mean "is the Hasmonean state
still a going concern" and answer yes when it is called Israel. In the modern
chapter the rename IS the subject: Cairo becomes the United Arab Republic and
back again, Damascus walks out of the union as the Syrian Arab Republic, and a
dozen cards turn on which of those banners is flying this decade — `syrOwn`
excludes the union on purpose. So the 1948 packages keep a raw `alive`, and go
on resolving their cast name by name through `egyTag` / `syrTag` / `syrOwn`,
which is the workaround §105 already built there and the reason this chapter
was the only one that lost nothing to the defect. The engine-level and
helper-level resolution still apply to it, because those receive a tag and
return a court rather than answering a question about a name.

After the fix the same measurement gives 1 / 0 / 0 / 0 / 0 / 0, the single
remainder being one card of seeded drift (`ev_k_gaza`, whose trigger asks
whether Gaza is already ours). Two chapters gain content that was unreachable
before. The eight-year balance harness is byte-identical to the pre-change run.

- **Regression contract**: `smoke90.mjs` — the address itself (chains,
  revivals, a dead tag that is not forwarded); a card addressed to the old name
  reaching the new court, as a card and as a decider notice; the helpers
  following the crown; the strand gates of 167, 67 and 66 answering the same
  under either banner; and the end-to-end claim, which plays 167 to 6 CE twice
  from one seed and asserts the royal century survives the proclamation.

## 136. The Keepers, 529 CE — the chapter whose player is not Jewish

Every bookmark in this game is a Jewish state. This one is a rival Israelite
tradition that regards Jerusalem as a usurpation, and building it is worth doing
precisely because it inverts assumptions the other seven chapters share without
ever having had to say them out loud.

**What was already in the tree.** More than the design assumed. `samaritanism`
is a live religion in the judaic group and `samaritan` a live culture in the
israelite group; four provinces on the map already carry both — Neapolis, Jenin,
Tulkarm, Qalqilya, a tight cluster in the central hill country. And **Gerizim is
already a holy site**: `map_data.js` puts `holy: 'gerizim'` on Neapolis and
`realm.js` keys `HOLY_FAITH = { temple_mount: 'judaism', gerizim: 'samaritanism' }`,
so `monthlyHolySites` already pays a same-faith *controller* and already docks
every realm of that faith while the mountain is in the wrong hands. The mountain
is a live mechanic before a single card fires, and the empire starts holding it.

**The start position.** Four hill provinces, landlocked, no port. Two of the four
are latent cells of **Sebaste** — Herod's Greek foundation five miles from
Neapolis, still a Christian garrison town in 529 — so the bookmark must declare
`activeProvinces: ['Jenin', 'Tulkarm', 'Qalqilya']` or the community's own
farmland is folded into the thing watching it. Caesarea Maritima, twenty miles
west, is the provincial capital, the seat of the dux, the port, and historically
the Samaritan quarter where both the 484 and 556 risings actually began. On three
sides: Jewish provinces. The Jews are a live tag, not a faction, because the
chapter's hardest fork needs them able to refuse.

**529 rather than 484.** Justa's rising under Zeno is the alternative; 529 is
the better start because it is the last real chance and because Justinian makes
a more legible antagonist than Zeno. Horizon 529 → 614, where the next chapter
opens — and the Samaritans who were still there in 614 sided with Persia.

**The chapter opens with a law.** No other chapter does. Justinian did not
besiege Samaria; he legislated it out of the right to inherit, to testify and to
hold what it held (`Cod. Iust.` I.v.12, 17, 21), ordered the synagogues down, and
then sent soldiers to enforce a statute. So `the_statutes` is a permanent opening
modifier on the player, and the war ends without repealing it. That is the enemy:
**the war continues by statute after it ends by sword.**

The opening chain, 529–531, ships five cards:

- **The Law Arrives Before the Soldiers** — the rescript, read in Caesarea.
- **The Games at Neapolis** — Julianus ben Sabar crowned, races held, the
  Christian charioteer Nicias executed for winning. It is petty, which is what
  makes it the point of no return: a king demonstrates he is a king by killing a
  sportsman. Three answers, one of which refuses the diadem on the grounds that
  the Torah it keeps has no king in it — and buys the one thing a rising without
  a king has, which is nobody to send to Constantinople in a box.
- **The Bishop's Fingers** — the churches burn and the bishop of Neapolis is
  mutilated. The player may restrain it, **and restraint does not help**: the
  option moves Byzantium's opinion by exactly zero, because the response was
  ordered before the first roof went. It buys quiet villages and a clean
  conscience, and the card says so.
- **The Mountain** — Zeno's Church of St Mary Theotokos on the summit, garrisoned,
  with the community barred from the top of its own mountain. Clearing it is the
  whole theology and a garrison on a bare rock with one road up it. This is the
  same decision the 132 chapter makes about Moriah, on a mountain that makes it a
  fraud. **Per §119 the two chapters do not know about each other**; each is its
  own world and the contradiction stands unarbitrated, which is how the bookmarks
  already treat each other's outcomes.
- **The Phylarch** — Theodorus with al-Harith ibn Jabalah's Ghassanids, which is
  where it ended in the history that happened. `GHA` is an antagonist here rather
  than the background client it is in 614. The third answer sends an embassy to
  al-Harith himself, a Christian Arab king paid late by Constantinople: it does
  not buy an ally, it buys a season.

**The empire is not playable**, and that is the house rule rather than an
omission: every chapter is played from an Israelite side. 614 keeps a full
Byzantine court — factions, objectives, a victory branch — and never offers the
chair, and this chapter does the same. What §136 changes is that the Israelite
side is no longer necessarily the Jewish one. `uitest3` used to call that
invariant the "Jewish-only roster"; it now says Israelite, and means the same
thing it always did.

**The victory contract is the thing no other chapter has to write.** In 132,
losing means the state ends and the people continue. Here it is closer to the
reverse. So the survival win counts **provinces of the Keepers' Torah wherever
their banner flies** — four still on the map in 614 wins, whoever owns them, and
a community that has lost its state entirely can still clear the bar. The loss is
the mirror: no province of that Torah anywhere, however much ground is held.
Procopius says a hundred thousand dead and Malalas says twenty; the direction is
the same either way, and there are roughly eight hundred Samaritans alive today.

**Factions**, three of them documented institutions rather than inventions: the
Eleazarite High Priesthood (which will bless a rising and will not anoint a
king), the Council of Seven (three priests and four laymen — the constitutional
party, dated variously to the third or fourth century, and the chapter takes no
position on the date), the Crowned Party, and the Quietists — who are not a
strawman, because the community's own chronicles are ambivalent about the men who
led the risings and Arsenius, who converted and became a favourite at Justinian's
court, is what that position looks like when it wins.

**The pen is its own.** `JEWISH_INTEGRATED_NAMES` is the wrong pen here and that
is most of the point; `SAM` writes Shechem, Shomron, Ein Ganim. The shared antique
pool is registered like any other chapter's, and the annexation cards stay shut on
their own `jewishCrown` gate rather than misfiring — the honest answer until
somebody writes the Samaritan version of that question.

This pass ships the foundation and the opening chain. The four forks the design
calls for — the mountain, the Jews (556: the joint rising at Caesarea and the
governor Stephanus killed in his own praetorium), Ctesiphon (Samaritans urging
Kavad to invade after 531), and the Taheb (the restorer of Deut. 18:18, which is
a far more dangerous state than a king) — are charted on the §119 tree with two
forks live and every road declared in `KNOWN_GAPS`, because their terminals belong
to the 531–614 tail: Sergius of Caesarea easing the disabilities in 551, the joint
rising of 556, and the last revolt under Justin II in 572/3.

- **Regression contract**: `smoke91.mjs` — the chapter is registered and sorted
  into the carousel; four hill provinces, with the two that are latent cells of
  Sebaste actually activated; Gerizim keyed to samaritanism while the Mount stays
  keyed to Judaism; the statute in force at month one; the five opening cards
  reaching a player, with restraint at the bishop's card buying no goodwill; the
  survival win counting people rather than provinces at both ends; and the
  annexation pool staying shut for a crown that is not Jewish.

## 137. Two dials, neither of them a block

Reported: hostile countries invade just as you are almost integrating a vassal —
not something to prevent, but it should be dialled back. And: countries with less
development, low stability or other troubles should not hold a grievance against
you forever behind a negative favourability cap, because they are too scared to
declare war anyway.

Both are real, and both turn out to be mechanics working exactly as written and
producing something nobody chose.

### 137a. The union and the war

`incorporateInfo` will only START a union from a court at peace. `aiConsiderWar`
hunts a stable, unengaged neighbour with a strength ratio in its favour. Those are
the same court. So the twenty to forty months a weaving takes — `incorporateMonthsBase`
plus half a month per point of the client's development — were also exactly the
months an opportunistic AI is looking for, and `monthlyIncorporation` answered a
declaration by setting `incorporating = null` and keeping the influence.

The mechanic's own precondition was the window it was most likely to be destroyed
in, and the destruction was total: thirty months of work and several hundred
influence, to a war the player did not start and could not have avoided by playing
better, because avoiding it means not being at peace.

**War now suspends the weaving.** The clock stops, `suspended` goes on the entry,
the months already run are kept, and the clock starts again at peace. The panel
button reads *Held by war… 30m* instead of counting down at nothing.

This does not prevent the invasion and does not make it cheap. The union advances
not at all for the length of the war — against a long one that is worse than the
old rule felt, because the player watches it sit there. And the devotion gate now
runs BEFORE the suspension rather than after it, so a client whose opinion falls
below `incorporateKeepOpinion` during the fighting still breaks the union: a war
that costs you your client's affection still costs you the union. What it no longer
does is delete the work for the fact of the war alone.

### 137b. Deference

§67 caps what goodwill can buy while the taker sits on the land. §86 lets the wound
close over ten quiet years, halfway for strangers and nearly all the way for
historical friends. Neither knows anything about the two courts' relative size.

So a four-province neighbour with a permanent grievance against a power six times
its weight sat at a −50 ceiling forever: it would never declare, never accept a
gift past the cap, and never stop. That is not what small states do. They
accommodate — and the ones with troubles at home accommodate fastest, because a
grievance is a policy and a policy has to be paid for.

`deference(ctx, victim, taker)` measures the gap in **developed weight** — the same
sum the force limit is built on — and returns how much of the *remaining* reach the
gap is worth:

- at or above `deferDevRatio` (0.6) of the taker's weight: **zero**, and nothing
  changes. That is every rivalry the chapters are actually about — Judaea and Rome,
  the brothers, the two empires.
- below it, rising to `deferMax` (0.85) at `deferFloorRatio` (0.15) or less.
- plus `deferStabilityBonus` per point of stability below zero. Only instability
  counts: a steady small realm may nurse its grievance as long as it likes.

`thawProgress` then reaches `base + (1 − base) × deference` instead of `base`, so a
wide enough gap can lift the ceiling off entirely, and an equal court still stops at
half.

**The clock is untouched, and that is the point.** A state that has just lost land
is furious whatever its size: a fresh grudge still caps at −100 or worse, and no
amount of goodwill buys past it. What changed is the persistence, not the fury.

- **Regression contract**: `smoke92.mjs` — the union surviving an invasion with its
  clock stopped and resuming at peace, and still ending for a broken bond or a
  client whose devotion breaks mid-war; deference exactly zero between equals,
  lifting the ceiling for a minnow, lifting it further for an unsteady one, and
  doing nothing at all to a wound that is still fresh. `smoke40.mjs` carries the
  updated wartime rule.

## 138. The crown of Israel costs a dynasty

Reported: the Kingdom of Israel should only be formable with a Davidic
descendant on the throne — and that should be an option in every chapter where
you play Judaea.

The formable asked for twenty-five provinces, six named cities, twelve Jewish
provinces, independence, stability 2, legitimacy 85 and peace. All of it is
arithmetic. Any sufficiently large Jewish state could tick it, which made the
greater crown a reward for conquest — and MLI is not a conquest. It is the
**united monarchy**, and the united monarchy is David's.

It is also the one objection this game's own history will not stop making. The
Hasmoneans were priests of the course of Joarib and not of Judah, and their
kingship was attacked on that ground for a century — Josephus, *Ant.*
XIII.288–298, has the Pharisee Eleazar tell John Hyrcanus to be content with the
high priesthood, and the quarrel that produced runs through the civil war of 67
to Pompey's arbitration. Herod, who had no descent at all, married Mariamne the
Hasmonean for a pedigree and then killed her and her sons, because a borrowed
title is a standing rival. The Exilarchs of Babylonia claimed descent from
Jehoiachin for eight hundred years and were the one Jewish authority nobody
argued with about legitimacy. Bar Kokhba was Nasi and never King. Both revolts'
coins say *Freedom* and *Redemption* and no man's name.

**`events_house_of_david.js`** is a shared package, keyed on the player's own
religion like the annexation question, and it joins the antique pool — so it
plays in all six chapters that can proclaim MLI and stays shut for the Keepers,
who reject the claim outright and have no king in their Torah.

Two cards, because a wedding is not a pedigree:

- **The House That Is Not David's**, asked once of a sovereign crown seated in
  Jerusalem with ten provinces. Four answers, all of which the period produced.
  *Send to Babylonia* — Herod's move made deliberately, gated (§128) on a road
  east, because the line is kept at Nehardea; it buys a generation of nothing
  and then a title nobody can argue with. *Search the archives* — the cheap road
  every dynasty in history has taken; it says a Davidide is seated without
  seating one, and the schools file their objection in writing, where it keeps.
  *A prince, not a king* — Ezekiel 44–46, which walks around the objection
  because Ezekiel's prince was never David's heir, and **forecloses the crown of
  Israel permanently and in writing**. And *the house stands on what it won* —
  the Hasmonean non-answer, which deliberately does not set `davidicAnswered`:
  it postpones the question rather than settling it, and a later reign may take
  it up.
- **The Son of the Marriage**, a generation (22 years) later. Seating him raises
  `davidicThrone` and hands the Exilarchate a recognised interest in every
  succession afterwards. Passing him over is Herod's actual answer minus the
  murders, and leaves the crown out of reach.

**Two chapters already ask this better and keep asking it.** The accession of
Beit Kosiba (§128) and the crown of David (§126) have their own courts and their
own consequences; both now raise the same `davidicThrone`, and the shared cards
stand down while either arc runs, so no court is asked the question twice.

The formable requirement is deliberately listed **first**, so the decision's
checklist tooltip leads with the thing that is not arithmetic.

- **Regression contract**: `smoke93.mjs` — the gate refusing a crown that meets
  every other requirement and granting it the moment a Davidide is seated; the
  package reaching all six chapters that can form MLI and shutting itself for a
  crown that keeps a different Torah; the arc end to end, including the eastern
  gate on the marriage and the generation between the wedding and the son;
  Ezekiel foreclosing it and the Hasmonean answer merely postponing it; and both
  bespoke arcs raising the shared flag while the shared cards stand down.
  `smoke12.mjs` carries the updated unlock.

## 139. Three letters outlive their century

Reported: rename the Jewish state in the 529 chapter to Galilee, "since it's not
Judea."

It isn't. `JUD` holds Tiberias, Sepphoris, Tarichaea and Gischala — four towns
around a lake, none of them within sixty miles of Jerusalem — and the chapter
was still labelling that court **Judaea**, because the tag's static definition
in `defines.js` says so and nothing had ever needed to disagree.

By 529 *Judaea* is a Roman provincial label with no Jewish polity behind it.
Hadrian struck the name off after 135; the hill country is Christian Palaestina
Prima; Jews enter the city one day a year to mourn on the ninth of Ab. What is
left of the nation is in the north, and had been for four hundred years: the
Sanhedrin to Usha, Sepphoris and then Tiberias, the patriarchate with it until
Theodosius II let the office lapse around 425, and the Palestinian Talmud closed
at Tiberias with Sepphoris beside it, a century before this chapter opens. Its
ruler in the chapter is already Mar Zutra, **Head of the Academy** — not a king,
and not in Jerusalem. Only the label was still lying.

(Two hedges the first draft of this section did not make. The redaction is
placed at Tiberias, with Sepphoris beside it and Nezikin attributed to Caesarea
— a city this same map gives the Empire — so *these four towns* was one town too
many in each direction and is not claimed. And the patriarchate *lapsed*: CTh
16.8.22 of 415 strips Gamaliel VI's rank and 16.8.29 of 429 legislates "after
the cessation of the patriarchs", which is a decline and a non-appointment
rather than a documented act of abolition, and the scholarship divides on which
it was.)

Calling that court Judaea is the same class of error as calling the Keepers
Jews, which is the error this whole chapter exists to refuse (§136).

### The lens, not the write

A tag is three letters that persist across chapters. What the people under them
call themselves does not. The fix is a per-chapter lens:

```js
tagTweaks: {
  JUD: { name: 'Galilee', capital: 'Tiberias', description: '…' },
},
```

`tagDef(ctx, tag)` in `military.js` is the only reader, and it **never writes**.
That is the load-bearing part. `DEFINES` is one object imported once by
`main.js` and shared by the start screen, the compendium, the save shelf and
every campaign begun without a page reload — a chapter that renamed the tag in
place would rename it everywhere, including for the next chapter the player
started. The lens costs one object spread on a hit and nothing at all for the
seven chapters that declare no tweaks.

The name lands in `game.tags[key].name` at `initGame`, which is enough for every
display surface, because the UI already resolves names live-first — `flagChip`,
the topbar, the province panel, the outliner, the wiki's `tagName`, the lobby
and the save shelf all read `live.name || def.name`. The start screen and the
tag-backfill in `reconcileGameProvinces` take the lens directly, since neither
has a live tag to read.

### Healing a save without a flag

`reviveGame` re-applies the era name, but only where the court's name still
equals its **static** name. That comparison is the whole migration: a save
written before the chapter declared the tweak carries the static name and is
exactly the case worth healing, while a crown proclaimed in play (§135) or a
revolution that called `rebrandTag` wrote its own name over the top and must
keep it. A stored flag would have had to stay in step with both; the comparison
cannot fall out of step with anything.

### The seat was wrong too, and not only on the label

The lens carries a capital because the label was the smaller half. `JUD`'s
static capital is Jerusalem, which in 529 is the Empire's — so the nation panel
read *Capital: Jerusalem (lost)* for a state that had never held it, and six
consumers were reading a seat this chapter's court does not sit in:
`yearlyGrowth`'s capital bonus (never paid), `aiDevelop` and `aiAirPower`
(anchored on somebody else's city), `vantage` and the AI's shipyard search
(rallying nowhere), `capitalId` for chapter distance scoring, the pretender's
prize in `revolt.js` (which wanted the capital and never asked who owned it —
see §140, which is the bug that fell out of this one), and `releasableNations`,
which protects a crown's own capital from the peace table. All eight now read
`tagDef`.

`dynamicCapital` — the seat a state released at the peace table is given — is
untouched and keeps its existing precedence at both call sites.

### The prose that was already right

Almost none of the chapter's player-facing text names this court, so almost
none of it changed. What the sweep had to protect was the other three senses of
the word: *the Judaean desert* where Sabas' monasteries are (a real place, and
it belongs to the Byzantine church faction), *the Jewish text* of Deuteronomy
27:4 that reads Ebal where the Samaritan reads Gerizim (a people's scripture),
and the declared fork named **The Jews** (a people, not a state — the 556 rising
at Caesarea). None of those is Galilee and none of them moved.

`smoke94.mjs` holds the line: Galilee in 529 with its seat at Tiberias, Judaea
in every other chapter that seats `JUD`, `DEFINES` unmutated after booting the
529 chapter, and a stale save healed on load while a rebranded court is not.

## 140. A claim is answered in the seat the crown owns, or it is not answered

This fell out of §139 and is older than it.

`monthlyPretenders` resolved the crown's capital and then asked one question
about it — *is it held by rebels?* It never asked who **owned** it. And
`crownThePretender` ends with `changeControllerCore(ctx, cap, tag)`: the seat
answers to the new crown, because the chronicle line it prints says "it is now
their crown". That sentence is only true of a capital that was theirs.

So a court whose nominal capital is somebody else's city could be handed a
foreign province by its own succession crisis — no war, no siege, no notice to
the owner. Which courts? Every court that does not sit in its own capital, and
the game is full of them: `JUD` in 132 and 614 is seated at a Jerusalem that
Rome and the Empire hold, `HYR` at a Hebron that Herod's line holds, `SEL` and
`ROM` both at Antioch. §139 did not create this. What §139 did was move the
target: before it, a `JUD` pretender in 529 was crowned in **Byzantine
Jerusalem**, so the theft aimed at the Empire; after it, the seat is Tiberias,
which the Samaritan player will normally have taken first.

The guard is the one the model always assumed:

```js
function claimSeat(ctx, tag) {
  const name = tagDef(ctx, tag).capital || null;
  const cap = name ? ctx.byId(ctx.provId(name)) : null;
  return cap && cap.owner === tag ? cap : null;
}
```

### The half that the guard broke

Adding it was not enough, and the review is what caught this. `monthlyRisings`
exempts a pretender's band from the ordinary burn-out for as long as the claim
is open (§112), on a premise it states outright: *a pretender's host is settled
by its own clock, not this one.* The owner guard makes that premise **false**
for exactly the courts it protects — a crown with no seat of its own reaches no
verdict, so the claim never closes, so the exemption never lifts, so the band
sits on the province for ever at nought legitimacy.

Measured before the second fix: `JUD` in 132 and 614 — both **playable** — held
a rebel province for the full 240-month horizon against a 72-month ceiling. A
player would have had no exit but destroying a host the burn-out was written to
dissolve.

So the exemption asks the same question the clock does. Where no verdict is
reachable, the ordinary burn-out is the only ending there is, and it arrives at
45 months rather than never.

The lesson is the general one about guards: a rule that stops something from
happening has to be checked against every rule that was *waiting* for it to
happen. `smoke94.mjs` pins both halves — the theft refused, the legitimate
crowning still fired, and the unsettleable claim ending inside the ceiling in
both chapters where the player can be the court it happens to.

## 141. The modern chapter had three cells and two capitals that were not modern

Reported: make sure the modern successors in 1948 have modern names.

Mostly they did. The 1948 chapter renames more than a hundred provinces —
Beroea to Aleppo, Emesa to Homs, Seleucia-Ctesiphon to Baghdad, Byzantion to
Istanbul, Memphis to Cairo, down to Turkish orthography for Diyarbakır, Elazığ
and İzmir — and every tag in it already carries a modern name. Two things had
been missed, and the audit is worth writing down because "mostly" was doing
real work.

### Three cells still answering to antiquity

Every province of every foreign country in the chapter carried its 1948 name
except three:

- **Pisidia → Isparta.** The worst of them: an ancient *region*, not a town, and
  the only cell in Anatolia with no modern name at all while twenty-four
  neighbours had theirs. It sits at 30.55E in the lakes, which is Isparta to
  the decimal.
- **Palmyra → Tadmur.** Syria's own name for it, and the one classical survival
  among fifteen Syrian cells renamed around it.
- **Pella → Tabaqat Fahl.** The Decapolis city; its Jordanian neighbours Jerash,
  Irbid and Salt were all already modern.

What the sweep had to *not* do is louder than what it did. Alexandria, Damascus,
Gaza, Tarsus, Paphos, Khaybar, Tayma, Athens, Corinth, Sparta and Rhodes are the
modern names, not merely the ancient ones. The Phoenician three — Byblos, Sidon
and Tyre — are the English exonyms this chapter uses everywhere else it says
Aleppo, Beirut and Nablus rather than Halab, Bayrut and Nablus' Arabic. And
Lydda keeps the form the events of 1948 are written under. A blanket
Arabic-or-Hebrew pass would have been *less* modern, not more.

### Two courts governed from the wrong city

A tag's static seat is its ancient one, and for most of this chapter that lands
correctly anyway: Memphis is Cairo, Berytus is Beirut, Philadelphia is Amman,
Seleucia-Ctesiphon is Baghdad, and Joppa is Tel Aviv — which is where Israel's
government actually sat in May 1948. Two did not.

**Turkey's static seat is Iconium**, and Turkey has not been governed from Konya
in this chapter's lifetime; the capital moved to Ankara in 1923, and Ankara is
on this map. **Greece's is Corinth**, which has never been the capital of
anything modern; Athens is on this map too.

The seat is not decoration (§139): it takes the growth bonus, anchors AI
development and the muster search, is the ground a succession crisis is decided
on (§140), and is the province the peace table refuses to hand over. Both were
quietly running the wrong city. `tagTweaks` fixes it in two lines, keyed by
**canonical** map name because that is what the growth index looks up
(`capitals[p.canon || p.name]`).

Saudi Arabia, Iran and Britain are left alone, because the right answer is not
on this map: Riyadh, Tehran and London are all outside the frame, and inventing
a seat is worse than an ancient one that at least resolves to a city the state
holds.

### What the audit also turned up, and did not fix

`yearlyGrowth` keys its capital index by province NAME with last-write-wins, so
a capital claimed by more than one tag pays its bonus to whichever tag is
defined last in `defines.js` — **including tags that do not exist in the
chapter being played**. The sharpest case is 167 BCE: the Seleucid Empire is the
chapter's antagonist, it is seated at Antioch, and it has never once received
its own capital's growth bonus, because `BYZ` — five centuries away and not on
that map — owns the `Antioch` key. The same holds for Rome at Antioch, for a
Hasmonean or Bar Kokhba Judaea at Jerusalem (MLI owns that key), for Parthia and
Persia at Ctesiphon, for Hyrcanus at Hebron, for Syria at Damascus and Egypt at
Memphis in 1948.

This change neither causes it nor worsens it — rebuilding the index the old way
and the new way across all eight chapters differs in exactly two entries, both
of them a court gaining a bonus it never had. The fix is to drop the index and
ask each province directly, but that moves growth in every chapter, so it is
recorded here rather than taken.

`smoke94.mjs` pins the three names, the seat of every court that has one on this
map, the fact that the static definitions are untouched, that no two courts of
the chapter claim the same seat, and — the assertion that would have caught a
mistake — that Greece keeps the name its own setup gives it, across a save,
because a seat tweak must not disturb a rebrand.

## 142. The twentieth century does not make clients

Reported: you also shouldn't be able to make client kingdoms in 1948.

You could, by three roads, and all three are now shut for that chapter.

The institution the peace table calls **subjugation** — a beaten crown left
alive and sworn to the victor — belongs to the world of Herod and Agrippa. The
twentieth century settled its wars a different way. 1948 ended in armistice
lines signed at Rhodes, and no belligerent came out of it owing fealty to
another; the arrangements that did look like clientage, the mandates, were
expiring rather than being founded. Egypt held Gaza and Jordan annexed the West
Bank, and both of those are **occupation** and **annexation**, which this table
still does. What it will not do is write a sovereign state into somebody's
crown.

`mechanics: { clientKingdoms: false }` — the same per-chapter switch that
already turns off conversion, royal marriage, coalitions and the dynastic
succession crisis in this chapter. Three gates read it:

- **The yoke**, in `peaceDealInfo`. The refusal is at the info layer, which is
  what makes it hold: the AI's own peace search keys off `info.canSubjugate`,
  and `executePeaceDeal` re-derives `!!d.subjugate && info.canSubjugate` rather
  than trusting the deal handed to it, so a hand-built demand cannot route past
  the panel.
- **The collar**, in `clientOfferInfo` — SPEC §92's offer to a small friendly
  neighbour, the one road to a vassal that costs no infamy. `offerClientshipCore`
  returns through the same info, so the core refuses with the panel.
- **The inheritance**, in `transferableVassals` — taking somebody else's client
  is still acquiring one. This bars the *acquiring*, not the *having*: a chapter
  that starts with vassals and switches the mechanic off keeps them.

### The rule that was waiting on it

§140's lesson, applied before it could bite: a rule that stops something from
happening has to be checked against every rule that was waiting for it.

`chapters.js` picks a diplomatic chapter objective, and from the second chapter
onward its default is **The League of Crowns** — *maintain N loyal client
kingdoms*. In a chapter that cannot make one, that is a contract the age has
just made impossible, handed to the player automatically. It is now gated on the
same switch and falls through to **The Bound Standards**, the alliance
objective, which this age has plenty of material for.

The rest of the vassal machinery needed nothing: every other consumer is a
read-only *do we have any* that answers zero — war-joining, cession recipients,
the embargo exemption, §61 incorporation and §137's suspension all degrade
quietly. No 1948 mission asks for a client. The one AI path that writes an
overlord only *restores* a bond whose independence declaration failed, and
cannot mint a new one.

`smoke94.mjs` walks all three roads with every precondition but the age itself
satisfied — so only the mechanic can be doing the refusing — checks that the
core refuses with the panel and that a forced deal creates nobody, checks the
objective gate, and checks that the other seven chapters still keep their
clients.

## 143. A culture group has no century in it

Reported: if a ruler dies in 1948 in Italy or somewhere else, their successor
sounds like they have an ancient name.

They did. `rollCourtier` — the function that seats a successor when a ruler
dies, picks the two candidates a republic votes between, and fills an heir —
chose its pool with one line:

```js
const cul = ctx.DEFINES.CULTURES[t.culture];
const pool = (cul && GENERAL_NAMES[cul.group]) || GENERAL_NAMES.hellenic;
```

A culture group has no century in it. So in the chapter that runs from 1948 to
1956, four of the twelve courts were staffed from antiquity:

| | culture → group | who succeeded |
|---|---|---|
| **Italy** | `roman` → `latin` | Marcus Ulpius, Quintus Petillius, Aulus Larcius |
| **Greece** | `greek` → `hellenic` | Nikanor, Apollonios, Antigonos |
| **Britain** | `greek` → `hellenic` | *the same Hellenistic pool* |
| **Iran** | `persian` → `iranian` | Vologases, Pacorus, Artabanus — Parthian kings |

Israel, the Arab states and Turkey were fine: the chapter's author had written
`israeli`, `arab_modern` and `turkish` pools of real 1948 commanders. The four
background powers never got one, and nothing complained, because a name is not
an assertion the tests knew how to check.

The same line appears in `rollGeneral`, so it was not only successions — every
Italian army raised in 1948 was commanded by a Flavian legate.

### Per chapter, not per culture

The obvious fix is to give Italy a modern culture, and for Italy it would work,
because ITA plays in exactly one chapter. **GRC does not.** Greece is on the
map in 167 BCE and again in 1948, twenty-one centuries apart, under the same
three letters — and Nikanor is *right* in one of them. Whatever names that tag,
it has to be the chapter.

So it rides the lens §139 already built. `tagDef` merges arbitrary keys, so the
chapter says `names` beside `capital` and one resolver reads it:

```js
tagTweaks: {
  GRC: { capital: 'Athens', names: 'greek_modern' },
  ITA: { names: 'italian' },
  UK:  { names: 'british' },
  IRN: { names: 'iranian_modern' },
}
```

`courtNamePool(ctx, tag)` replaces the duplicated idiom at all three sites —
`rollCourtier`, `rollGeneral`, and the advisor fallback in `getCourt`, where a
chapter's dated `advisorEras` still wins because it is the more specific thing.

The four new pools hold men who actually held these commands in the years the
chapter runs, which is the standard the three existing modern pools already set:
Messe, Marras, Trezzani and Cadorna; Papagos, Tsakalotos, Ventiris and Ghikas;
Montgomery, Slim, Crocker and Dempsey, with MacMillan, Barker, Cunningham and
Stockwell out of Palestine Command; Razmara, Zahedi, Arfa and Amir-Ahmadi.

One thing deliberately not done. These pools are soldiers, and the game draws
rulers from the same list, so an Italian succession seats Marshal Messe rather
than a De Gasperi. That conflation is the existing convention — Israel's pool is
Yadin and Sadeh and it names Israel's rulers too — and splitting rulers from
generals is a change to every chapter, not to this one.

`smoke94.mjs` asserts that no 1948 court draws from any of the eight ancient
pools, that the successor and the general a court actually produces both come
from its own, that GRC in 167 BCE is still Hellenistic and the Hasmoneans still
Hasmonean, and that a chapter naming no pool — 529 — is left entirely on its
culture groups.

## 144. A war has a life before it has an exit

Reported: the Seleucids just declared war on me, only to immediately offer a
white peace.

They did, and it reproduces in one month.

`monthlyWarDiplomacy` gave a losing AI leader two roads to sue the player:

```js
const sueAt = 15 / caution;
if (ws > -40 && !(ws <= -10 && warExhaustion >= sueAt)) continue;
```

A **rout** — warscore at −40 or worse — or **weariness**, at −10 with exhaustion
past a caution-scaled bar. The rout road is fine. The weariness road had no
clock on it at all, and that is the bug, because `warExhaustion` is a **standing
quantity and not this war's ledger**. A power that arrived already tired from
somewhere else satisfied the exhaustion half on the day war was declared, and
needed only a single lost skirmish to satisfy the other half. At −12 the terms
such a court will accept are nothing whatever, so what the player sees is a
declaration of war followed by an offer of white peace.

The Seleucids are the sharpest case in the game and not a coincidence. The
opportunistic-war gate does check weariness — `aiConsiderWar` refuses to declare
above `warExhaustion > 5` — but the Seleucid wars of 167 are **scripted**, and a
scripted `declareWar` bypasses that gate entirely. So SEL could enter a war it
had no business starting, at 18 weariness, and sue the following month.

### The asymmetry is the fix

A court being **routed** may sue the month the rout happens; that is what a rout
means. A court that is merely **tired** must have actually fought this war:

```js
const routed = ws <= -40;
const weary  = ws <= -10 && warExhaustion >= sueAt && runFor >= grace;
if (!routed && !weary) continue;
```

`BALANCE.warSueGraceMonths` is twelve — a year of campaigning before "we are
tired of this" is a sentence a court has earned. It sits beside the existing
36-month AI-vs-AI settlement horizon (`w.settleMonths`), which is a different
clock for a different question and is untouched.

The same asymmetry goes on the separate-peace road, which needed it more: that
one's weariness clause fires at `row.ws >= 0`, a standing start, so a coalition
member who arrived tired could offer to buy its way out of a war nobody had
fought yet, for nothing.

### What this deliberately does not do

It does not stop a weary court from *declaring*. Scripted wars are the chapter's
to write, and 167 wants the Seleucids to come whatever state they are in — the
whole shape of that chapter is an empire overcommitted in three directions. What
it stops is the empire arriving and immediately asking to leave. If a scripted
war should not be fought at all, that is a decision for the card that writes it,
not for the peace clerk.

`smoke95.mjs` reproduces the report exactly — weariness 18, one lost skirmish,
their own declaration — and asserts silence for eleven months and a feeler in
the twelfth; that a routed court still sues in month one, tired or not; that a
fresh court losing narrowly never sues at all; and that the grace is a define
rather than a literal.

## 145. The number on the chrome is not the number the treasury moves

Reported: occasionally, with a positive talent flow, my income still goes down.

Not occasionally. Exactly, and by a lot. A Hasmonean court sitting on 8,000
talents reads **+0.4 a month** on the topbar while the treasury falls by **470**.

The topbar and the realm panel both rendered `t.income - t.expenses`. That pair
is the **operating ledger** — taxes and trade against upkeep, administration,
interest and tribute — and it was never the whole purse. Two other flows move
the treasury and appear in neither half:

- **The court's own consumption** (§101). A reserve past eighteen months of
  gross income drains six per cent of the excess every month. That is the
  mechanic doing exactly what it was written to do; it simply was not on the
  chrome.
- **Subsidies and reparations**, in and out. They are in `bd.net` and in neither
  `t.income` nor `t.expenses`, so they push the other way — the treasury rising
  faster than the headline claims.

`explainIncome` was honest the whole time. It lists *The court consumes (reserve
past its means)* and totals a **Monthly balance** of `bd.net - bleed`, which is
the true figure. But the breakdown is behind a click, and the number the player
actually reads was the ledger.

### Measured, not re-derived

```js
const opened = num(t.treasury);
…
t.netFlow = Math.round((num(t.treasury) - opened) * 100) / 100;
```

`netFlow` is the difference the treasury saw between the start and end of the
month. It cannot disagree with itself, and it needs no maintenance when a future
flow is added — anything that moves the purse is in it by construction, which is
the property the old subtraction lacked.

### Why not simply fold the bleed into `expenses`

Because two callers read that pair as a solvency test. `crisis.js` raises fiscal
heat on `income < expenses`, and `ai.js` sheds a regiment a month on the same
comparison. A court draining a hoard is not insolvent — it is **rich**, and the
drain is the consequence of being rich. Folding the bleed in would have told
both systems the opposite of the truth and started disbanding armies in the
treasuries that least needed it. So the operating ledger stays exactly as it
was, and only the display changes.

Both panels also gained an **Other flows** line, so the tooltip explains the gap
rather than leaving the player to find the breakdown; and both fall back to the
old subtraction for the one month a pre-§145 save has no measurement yet.

`smoke96.mjs` pins the reported case at four treasury levels, asserts that a
court consuming a vast hoard still reads as solvent to the crisis and AI checks,
that the headline and the breakdown now agree, that four ordinary realms under
the cap see no phantom discrepancy, and that an old save loads without one.

## 146. Ruling and standing on are different verbs

Reported, with a screenshot: **What Does the Law Say of the Nations?** fired on a
Hasmonean state in December 153 BCE that had annexed none of the land the card
is about. The outliner in the same picture shows why — two sieges in progress,
Pisidia and Attalia at 30%, and five detachments of the Levy of Emmaus spread
across Anatolia. The occupied cells were enough.

```js
const all = countControlled(ctx, 'HAS', {});
if (all < 15) return false;
return all - countControlled(ctx, 'HAS', { religion: 'judaism' }) >= all / 2;
```

`countControlled` answers *where are my flags this month*, and there was no
helper that answered anything else. So a card whose first sentence is **"Israel
rules multitudes now who have never kept a Sabbath"** was asking where the army
was standing. A province under siege pays the besieger no tax, keeps no Sabbath
for him, and goes home at the peace table.

`countOwned` is the missing counterpart — and the strongest evidence that it was
missing is that **two content packages had already written it by hand**.
`events_40bce.js` and `events_614ce.js` each carry a private, byte-identical
`countOwned(ctx, tag)` because the frozen contract offered no way to ask. It is
on the contract now, with the religion filter and the §135 forwarding the
hand-rolled copies lack.

### The split, which is the whole of the work

The first pass swept every realm-size count in the game and it was wrong. Two
different questions were wearing the same helper, and only one of them was
misusing it:

**Composition — what the realm IS.** These now count owned:

- `ev_law_of_the_nations`, the reported card
- `gentileShare()` in the 167 empire chain and the same function in the shared
  annexation pool — *how much of the realm is not of the covenant*
- `otherShare()` in 1948, whose own comment said it was "the same measure
  `ev_law_of_the_nations` takes in 130 BCE", and which was wrong the same way
- the annexation question's ten-province gate, which sits in the same condition
  as `gentileShare`
- **the embassies of the powers**, because a chancery sends an ambassador to a
  state and not to an army standing in somebody else's country

**Reach — how far the arm extends.** These keep counting held, and the revert is
as deliberate as the change:

- `imperial()` in 167, whose own comment turns on *a Jewish king **sitting** in
  Antioch*
- `reach()` in 66 and 1948, `power()` and `standing()` in 614, `endurance()` and
  `grasp()` in 132 — the comments read *a Levantine power*, *a regional power*,
  *the hills, the country, the province and its coast*
- `seatedCrown()` in the House of David pool, whose Jerusalem half is **already**
  `controls` — counting the other half by ownership would have shut the dynastic
  question against 614's Jewish state for most of the Persian war, which is
  precisely the reign it exists to ask about

A rising that has taken Damascus by force **is** a regional power, whatever the
treaty says. That is not the error the report describes. The error is claiming a
realm *rules* people it is merely camped among.

Three families were never in question and keep control: a rising is crushed when
somebody else is standing on it (the `=== 0` checks in 132, the `=== 1` in 66);
the formables say *Hold twelve provinces* on the label and mean it; and
`countControlledOf` in the 167 package, whose name only looks similar — it walks
named cities through `controls`, which is right for *are we standing in Antioch*.

The distinction to carry forward: **holding** is a fact about this month and
reverses when the siege lifts; **owning** is a fact about the realm and survives
the peace. An occupied province is still yours, and a realm does not shrink in
the eyes of its own chroniclers because somebody is camped in it.

### Cost

Measured rather than assumed, and the narrowing is why it is small. With the
first, wider sweep, 614's Jewish state lost a third of its development in half
the sampled seeds and the Hasmoneans picked up a BLEEDING flag. With the split
above, seven of eight chapters are byte-identical to an untouched tree, 614 is
identical across four independent seeds, and only 40 BCE moves: across six seeds
Herod's provinces are flat (8.0 → 8.2) and his development unchanged, with a
modest drift down in treasuries and no anomaly flag appearing anywhere.

`smoke97.mjs` reproduces the screenshot — a four-province Hasmonean realm
standing on twenty-six gentile cells it has not annexed — and asserts the card
stays shut; then annexes that same land and asserts it fires, so the question is
still real. It holds the fixture's Jerusalem in both halves, because the card
also sits behind `greaterVictory` and the negative would otherwise pass for the
wrong reason. It pins each function on the correct side of the split by name,
and it pins the two hand-rolled copies as the evidence they are.

## 147. The Keepers get a pen of their own

Requested: Samaritan names for the provinces the Samaritan state integrates.

`resolveDisplayName` has three layers — a crown's own pen (§110), the chapter's
`integratedNames` table, and a **shared layer keyed on the owner's religion**.
The shared layer existed only for `judaism`. So every Jewish realm in every
chapter could write its own signposts across a hundred and forty provinces,
while the Samaritans had the nine names their own chapter had written by hand: a
Keeper state that took the coast integrated Caesarea and the signpost went on
reading Caesarea.

`SAMARITAN_INTEGRATED_NAMES` is that layer, on the same footing and keyed the
same way — on the faith rather than the tag, so a Samaritan state in any chapter,
or formed in one, is answered without another copied table.

### Not a copy, because the difference is the argument

It would have been half an hour's work to clone the Jewish table. That would
have been wrong, because the distance between the two pens is what the 529
chapter is *about* (§136).

The editorial rule: **where the Torah names a place, this pen writes the Torah's
name.** The Samaritan canon is the Pentateuch and nothing else — no Joshua, no
Kings, no Ezekiel, none of the books the Jewish table draws half its entries
from. Where the Torah is silent the pen falls back on Samaritan Aramaic, the
language of the Defter and the chronicles.

That rule does most of the work by itself, and it lands hardest on one city. The
Torah never says *Jerusalem*. It says **Shalem**, once, of Melchizedek's town
(Gen. 14:18), and thereafter only "the place which the LORD shall choose" —
which this people reads, and has always read, as Gerizim. So the Keepers' pen
does not write Yerushalayim. It writes the one name its own scripture gives, and
declines the argument.

Three more divergences follow the same rule, each the older half of a gloss the
Torah itself supplies: Hebron is **Kiryat Arba** (Gen. 23:2, "Kiryat Arba, that
is Hevron"), Bethlehem is **Efrat** (Gen. 35:19, "Ephrath, which is Bethlehem"),
and Ramallah's hill is **Luza** (Gen. 28:19, "Luz was the name of the city at
first"). Egypt's Memphis is **Mof** rather than the Jewish table's Nof — both
attested, Mof the older spelling.

**Honesty about what this is.** Shalem, Kiryat Arba, Efrat and Luza are Torah
names applied by editorial choice, not attestations of Samaritan daily speech;
the community's own later sources say Jerusalem like everyone else. The rule is
a claim about what this pen is *for*, in the same spirit as the existing note
that the Jewish table's Mediterranean entries are communal exonyms rather than
Biblical coinages. Abu'l-Fath's *Kitab al-Tarikh* supplies some hill-country
toponyms and is a fourteenth-century chronicle — late for a sixth-century
chapter, and flagged rather than leaned on.

### What was deliberately not changed

The Jewish pen waits for **both halves** — full integration *and* a community of
the owner's own kind — on the reasoning that a Hebrew name on a town where no
Jew lives is a claim rather than a signpost. Every other pen keeps the older,
looser threshold. The same argument plainly applies to the Keepers, and more
sharply, since being few is their whole situation. It is not applied here: the
chapter already ships nine Samaritan names under the looser rule, tightening it
would change shipped behaviour, and the request was for names on integrated
conquests. Recorded as a question rather than answered by a side effect.

`smoke98.mjs` takes twelve provinces across the map and reads the signpost off
each, asserts the four divergences against the Jewish pen in both directions,
checks the chapter's own table still outranks the shared one, checks a Jewish
realm is untouched — including that it still waits for a community before
writing Akko on a Christian town — and validates every key against the canonical
province list.

## 148. A house is not a house in its first summer

Reported, with a screenshot: **The House That Is Not David's** arrived on
1 August 166 BCE. Eleven months into the Maccabean revolt. Eighteen hundred men
in the field, four talents in the purse, a battle running at Lydda on its fifth
day, and the outliner still calling it *Insurgency in the Hills*.

The card opens:

> The question has been asked in the street for a generation and it has now been
> asked in the chamber, which is different. **The realm is large, the crown is
> secure, the succession is orderly** — and the man who wears it is not of Judah.

None of that was true, and the gate never checked any of it. Its own comment
claimed the last clause — *"past the point where it is plainly a rising rather
than a kingdom"* — and then tested only sovereignty, Jerusalem, and ten
provinces. A rising that overruns ten provinces in its first summer satisfies
that exactly, which is what the Maccabees had done.

So the gate now asks for each thing the card says out loud. A generation
(twenty years) since the chapter opened; no regency, because that is the
opposite of an orderly succession; stability at least 1 and legitimacy at least
50, because that is what *secure* means.

The generation is the load-bearing one, and it needed a new helper to ask:
`chapterYears(ctx)`. A content package may not import the sim and cannot see
`ctx.bookmark`, so a **shared** package — one that plays in every chapter and
knows none of them — had no way to tell a dynasty from a rising. That is the
same shape of gap as §146's missing `countOwned`: the contract could not express
the question, so the card asked a different one.

Twenty years fits inside every chapter that can reach this card with room to
spare — 167 runs 107 years, 67 runs 42, 40 runs 50, 66 runs 34, 614 runs 86 —
and it puts the question where the history put it. The revolt opens in 167;
Simon wins independence in 142 and Aristobulus takes the diadem in 104. The
quarrel over whether the house of Joarib may wear it belongs to that century,
not to its first campaign season. With the chapter opening in month 11, the
question now becomes askable in month 11 of 147 BCE.

`smoke93.mjs` walks the boundary — nineteen years, nineteen years and eleven
months, twenty years exactly — reproduces the reported August 166 case against a
crown that meets every other test, and checks that a regency, an unsettled realm
and a disbelieved crown each shut it again.

## 149. A client cannot take the field against its own lord

Reported: why do coalitions get waged *with* a country I just vassalized?

Because §75 was enforced in one direction only. `declareWar` refuses to **open**
a war between an overlord and its client — it has always done that, and says so
in its own comment: *the yoke is the settlement of that quarrel.* But a war is a
persistent list of belligerents, and the bond can be made **afterwards**: by the
peace table's subjugation clause, by a scripted overlord, by content, or by the
AI restoring a client whose independence declaration failed. Nothing ever went
back and looked at the wars already running.

So a court could be your client on Tuesday and marching against you in a league
on Wednesday, with tribute flowing the other way the whole time.

`enforceVassalPeace` runs monthly, off `updateTagLife`, and makes the rule an
**invariant** rather than a check at one door. Where a client stands on the far
side of a war from its lord it leaves the war — not the war being cancelled,
because everyone else's quarrel is their own. Its own clients go with it, having
only ever been there under its banner; occupations between it and its lord's
side revert; and a side emptied by the bond dissolves the war for want of an
enemy.

Reproduced and pinned in `smoke99.mjs`: the league forms with three members, one
becomes our client, the war continues without it and with the other two. A
client fighting *beside* its lord — the ordinary case — is untouched.

## 150. A siege does not outlive the war that raised it

Reported in the same breath: why is the Seleucid Empire still occupying my
territory when I peaced out with them?

Occupation reverted. It always did — every path was checked: the full congress,
the separate peace, the junior partner's withdrawal, and the war ended by the
sword all call `changeControllerCore(p, p.owner)` on the fronts they settle, and
armies are given a road home. That was not what the player was looking at.

**A siege in progress is not occupation, and nothing lifted it.** The camp
stayed on the province after the war that raised it had ended: the outliner went
on listing *Pisidia 30%*, and the map went on striping the cell, because the
political layer stripes on

```js
p.controller !== p.owner || p.siege
```

To the player that is indistinguishable from an enemy still sitting on their
land — and in the only sense the screen could show, the enemy was.

`liftSiegesBetween(ctx, a, b)` clears every siege whose besieger is on one of
two named sides and whose province is held by the other, and it is called from
all four exits: `dissolveWar` (so the congress and the sword both get it),
`releaseFromWar`, `withdrawFromWar`, and §149's bond sweep. Scoped rather than
global, so a separate peace lifts the leaver's camps and leaves standing the
siege of a court that is still fighting.

The two reports arrived together and were two different bugs behind one
appearance, which is worth recording: the sim was right about who held the
ground and wrong about who was camped on it, and the map could not tell the
player which of those it was drawing.

## 151. The Keepers' roads: a chapter that stopped in its second year

§136 shipped the eighth chapter and charted it honestly, which is why the
problem was visible from the day it landed: five roads, every one of them
declared open in `KNOWN_GAPS`, on a chapter that runs from 529 to 614. The
opening chain ends with the phylarch in 531. After that the Keepers had
eighty-three years of nothing — no card, no decision, no terminal — while the
tree said, in writing, that this was known and deliberate.

`node tools/paths.mjs --gaps` printed five of the six entries in the whole game
under one chapter's name. That is what the gap list is for; it is also what it
is for that the list should eventually be empty.

**The tail is not a campaign, because the war is over.** This is the shape the
chapter forced. Justinian did not settle Samaria in 531 — he broke a rising and
left the statute standing, and the thing §136 is about is that *the war
continues by statute after it ends by sword*. So the 531–614 package is a series
of decisions taken by a people getting smaller, on the dates the sources supply:

- **531 — the letter to Ctesiphon.** Malalas has the refugees at Kavad's court
  offering fifty thousand men for a Persian invasion of Palaestina. Kavad died
  that September and the Eternal Peace followed; nothing came of it except that
  Constantinople remembered. Three roads: the promise under the elders' own
  names, service in the east with nothing signed anywhere, and the delegation
  disowned in a letter written to be read by the dux.
- **536 — the wall on the summit.** Procopius (*Buildings* V.vii) writes the
  emperor rebuilding the church on Gerizim and running a wall round it as
  praise. Whoever holds the rock pays for masonry that grows nothing, and the
  side that stops paying has conceded the mountain. This is the altar road's
  terminal and it was named as such in the gap it closes.
- **540 — the year the peace broke.** Khusrau comes down the Euphrates and
  burns Antioch. It is the invasion the refugees asked for, nine years late,
  three hundred miles north, for entirely Persian reasons, and it does not come
  south. That is the whole lesson of asking, and it is the Ctesiphon fork's
  terminal.
- **551 — Sergius of Caesarea.** Novel 129: the disabilities eased after a
  Christian bishop of the city where the rescript was read argued that the
  persecution had become inefficient. **This one had to be a mechanic.** The
  statute is the chapter's enemy and it is a live modifier, so the card removes
  `the_statutes` and replaces it with `the_statutes_eased`; refusing the relief
  leaves it byte-identical. A card that said the law was eased and moved nothing
  would be the chapter lying about its own subject.
- **556 — the praetorium at Caesarea.** The Samaritans and Jews of the city rose
  together and killed the proconsul Stephanus in his own hall. Four centuries of
  schism, two Torahs that do not agree at Deuteronomy 27:4, and one afternoon in
  which the elders decide whether this is their rising, somebody else's riot, or
  the first thing the two houses of Israel have ever done together. This is the
  fork §136 called *the Jews*, and it is the chapter's hardest.
- **572 — the last rising**, under Justin II, answered by another constitution
  rather than a settlement. There is no fifth rising in any chronicle on either
  side, and not because the grievance was settled.
- **614 — what the villages kept.** The Persians on the coast road, and a
  chapter that has been asking since 529 what is left to meet them.

**The Taheb has no date, because that is what it is.** The restorer of
Deut. 18:18 ends the Fanuta — the age of the turning-away that began when Eli
carried the ark to Shiloh — and brings the hidden vessels out of the mountain,
and nothing any empire has legislated survives contact with that. It is a more
dangerous state than a king and everybody in the card knows it, including the
High Priest, who is present at the proclamation and does not put his hand on the
man. The community has been here: Josephus has a claimant taking a crowd up
Gerizim under Pilate to show them the vessels, and Pilate met them on the slope
with cavalry. Three roads — proclaimed, the office kept open, and the Council of
Seven's ruling that a people still here in the morning has already done what the
prophecy describes, which is the same claim the chapter's victory condition
makes.

**The road with no king on it got its own terminal, as its gap demanded.** The
declared gap for `no_king` said a shared ending would misdescribe it, and that
holds: forty-four years on, the constitution that comes down from the capital
names the people and cannot name the head, and the sons of the men who wanted a
crown in 529 point out that a thing which cannot be beheaded also cannot be
recognised, treated with or given terms. It may still take one, late, which is
how that road ends.

The chapter now charts **five forks and fourteen roads, none of them open**, and
`KNOWN_GAPS` is down to the single 1948 entry that is not a gap at all.

- **Regression contract**: `smoke100.mjs` — the gap list is empty and every one
  of the fourteen roads ends at a card the chain plays; the 551 easing really
  replaces the statute and the refusal really does not; each fork is reachable
  in the world it was written for and no other (Ctesiphon after 531 and not
  during the war, the Taheb only once the phylarch is answered, the empty office
  only for a community that declined the diadem); the 614 card obeys the
  chapter's own contract by counting people, so it fires for a community with
  one province of its Torah and no state and retires when there is nobody left;
  and eighty-five years are walked month by month without a guarded failure.
  `smoke83.mjs` reads the new file for markers, `smoke85.mjs` holds it to the
  package contract, and `smoke94.mjs` now asserts the chapter declares nothing
  open rather than asserting it declares five.

## 152. Twenty-three years of weather: the shelf a finished chapter leaves

Reported as boredom, which is the hardest kind of bug to act on until you
count it. The game ships **645 cards and 623 of them fire once.** Fifteen
repeat; twelve of those are the generic pool; and every one of the twelve is
something that happens **to** a realm — the rains fail, a comet is read, the
earth moves, raiders cross the border. They are weather.

That is fine while a chapter is running, because the scripted chain is the
game and the pool is the murmur underneath it. It stops being fine the moment
the chain runs out, and then the murmur **is** the game: a twelve-card deck
dealt at roughly two a year to a player who has seen all twelve.

The part worth stating plainly is that **playing well makes it worse.** The
chapters end where the sources end. The kingdom does not. A player who outruns
history reaches the empty shelf sooner than one who does not, which means the
game's own reward for competence is the thinnest content it has.

**So the fix is not more weather.** `events_statecraft.js` is twenty
repeatable cards of the other kind — the decisions a state's own success
produces. Nothing in it is an omen. Every card is somebody in the player's own
service asking for a ruling that only exists because the conquests worked: the
collectors, the garrisons, the conquered cities, the client courts, the
veterans of a war that is over, and a priesthood that has become worth buying.

**Three bands, and no dates anywhere in the file.** There is no year in which
a realm acquires an administration; there is a size at which it must have one.

- **A court and collectors** (4–19 provinces, two years in). Judges who
  disagree about ancestral custom, a garrison nobody has paid, a tithe that
  came in short, a second city that would like a charter, four standards of
  weight in one market, a land register coming apart at the folds, a road that
  can be mended or moved.
- **Ruling people who are not yours** (10+ provinces, 3+ of another faith). A
  shut temple whose city has petitioned properly this time, a contractor
  bidding for a province's taxes, a client king dead with three claimants, the
  language the chancery publishes in, a city billing you for its billets, and
  whose likeness — if any — goes on the coin.
- **Nobody left to fight** (18+ provinces, at peace, an army in being).
  Historically the most dangerous band there is: veterans to settle, keep or
  hire out; a diaspora that writes as though you were a power; a High
  Priesthood that has become an auction; a prophet in the desert whom arresting
  would not disperse; a muster roll where half the men have never fought; a
  frontier that has not paid for eleven years; a household that has become a
  hereditary administration.

Band one **closes at twenty provinces**, which is the half of the banding that
does real work: a short tithe is not an empire's problem, and a realm that has
grown past a question should stop being asked it.

**A shared package cannot name a faction.** Every chapter names its own court,
and `factionShift` against an id the bookmark never defined is a silent no-op
that reads as content — the exact failure class §125's suite was written to
catch. So the file names **roles** — strict, worldly, soldiers — and carries
one table mapping every playable court in the game to its three seats. The
table runs deliberately ahead of `playableTags`, covering the Seleucid Friends
of the King, the Senate and the Church as well, because a tag reachable by
forming or switching must not draw cards whose politics do nothing. The 167
pair are named at their **early** ids on purpose: `seatedHeir` walks
`succeeds`, so 'hasideans' resolves to the Pharisees after 140 without this
table having to know the room changed.

**One voice at a time.** Twenty repeatable cards on generic-pool odds would be
a queue, not a texture. Every option writes the month the pool may next speak
into one shared key, so the whole package behaves as a single channel with a
nine-month silence after any answer, on top of each card's own multi-year
cooldown. Measured over a rich twenty-one-year peace in 167: **~17 statecraft
cards, 10–11 of them distinct, beside ~30 generic** — and a different set per
seed, which is the replay-divergence the backlog asked for.

**What is deliberately absent.** Whether to force the conquered to convert is
already asked, properly and once, as a standing policy by
`ev_a_what_these_people_now_are` (§130). A repeatable version would let a
player re-litigate Hyrcanus's ruling every four years, which is the opposite
of what that card is for.

Every card carries `maxYear: 1799` for the same reason the generic and
annexation pools do, and here it is load-bearing rather than decorative: §121
retires an undated triggered card the year its chapter passes the generation
horizon, and **this pool exists for the campaign that has passed it.**

- **Regression contract**: `smoke101.mjs` — the pool is on all seven antique
  shelves and none of 1948; every card really repeats, is really bounded, and
  outlives the latest antique horizon; every seat the role table names exists
  in the bookmark it claims, for every playable court; no dead or mis-scoped
  modifier key, with both vocabularies read out of the sim rather than listed
  in the test; every option of every card resolves clean in every court,
  records itself, and hushes the pool; every tooltip that mentions talents
  moves exactly that many, checked **behaviourally**, because `guard()` means
  the option's own source says nothing about what it does; the bands gate on
  size rather than the calendar, including band one closing and an army with a
  war to fight not being idle; and twenty-one years of peace through the real
  scheduler deal at least six different cards without one guarded failure.
  `autorun.mjs` reports no new anomaly class — the run's flags move within the
  set `tools/README.md` already accepts, because adding cards shifts the RNG
  draw sequence downstream.

## 153. The Gulf War was a number change

Reported precisely: `ev_i_gulf_war` fired on 1991-01 if Iraq and Israel were
both alive, and **that was the whole condition**. It then applied −60% income,
−40% manpower, and shrank every Iraqi army to 35% of its men. There was no
coalition, no invasion and no war. The player watched a modifier land.

The worst case was the one that gave the shape away: an Iraq that took the
1980 card's second answer and **never fought Iran** — no eight years, no Gulf
loans, no debt, and therefore no reason on earth to go and take somebody's
oil — was flattened in 1991 anyway, because it was 1991.

**The chain the calendar was standing in for.** `events_1948_gulf.js` is nine
cards, and every link is a condition:

> the eight years → the debt → the wells → the coalition → the war

Break any link and the rest does not happen. Keeping the river treaty in 1980
means August 1990 never arrives. Accepting the creditors' schedule in 1990
disarms Iraq and there is no November. Withdrawing from the coast in the
autumn buys sanctions and a surviving, hostile regime. Digging in produces a
war that is **actually fought on the map**.

**The debt is a number now.** `t.loans` is the engine's own visible drain —
`LOAN_INTEREST_PER_MONTH` is 3 talents each, the realm panel prints the count,
and nothing clears them but repayment. Crossing the Shatt al-Arab takes Iraq to
the five-loan ceiling, and the loans **survive the 1988 cease-fire**, which is
the entire causal link to Kuwait. It used to be a line of prose and a one-off
−200.

**The coalition is the cast this chapter has.** There is no USA tag and there
should not be; 1948 models Washington off-map by long-standing choice. So the
thirty-five states assemble out of the on-map powers genuinely in the
coalition — Saudi Arabia hosting, the United Kingdom, and Egypt and Syria, who
between them sent some fifty thousand men to fight another Arab army. The
American weight arrives as what the map can show: an airfield on the Gulf coast
that was not there in the summer, wings standing on it, and a second echelon in
December.

**The Iran–Iraq war is a contest.** Iraq used to get thirteen regiments and a
fire-3/shock-3 general against an Iran holding `manpowerMult: 1.15` and **no
military penalty whatsoever**, and then the ordinary war sim ran. Of course it
won. The asymmetry now runs both ways: Iraq has the equipment and the shallow
bench (`milPowerMult: 1.12`, `manpowerMult: 0.85`), Iran has the bodies and no
officers left to use them (`manpowerMult: 1.60`, `reinforceMult: 1.35`,
`milPowerMult: 0.82`). That last number is not a fudge — `milPowerMult`
multiplies at exactly the point `genMult` does, and UNIT_GENS gen 4 over gen 5
is 2.3/2.8 = 0.82. Iranian regiments fight **one full generation below their
pattern**, which is what an executed officer corps and unmaintained American
kit actually cost.

**A ceiling on how far Baghdad can push**, because the Shia south is why it
could not hold Iranian ground: hold two Iranian core provinces and
`ev_g_the_shia_south` offers occupation at a real price to the rear
(−20% reinforcement, −15% morale, +2 unrest everywhere) or a pull-back to the
frontier that trades the war aims for the country. The eight-year clock then
fires in 1988 — a cease-fire on the starting line if neither capital fell, and
a **different card** if one did, which sets `gulfDecided` so the 1990s play
from a Gulf with one power in it instead of two.

**The outcome is not written down.** Nothing in the package shrinks an army;
the regression suite greps for exactly that. The aftermath **asks** which way
it went: `ev_g_the_risings` fires when a coalition army is standing on Iraqi
ground (or Baghdad's exhaustion has run the string out), and
`ev_g_the_regime_holds` fires when nobody is and Iraq still holds the coast —
a 1990s with a hostile regional power intact and everyone's fuel bill doubled,
because `FUEL.importMult` is already 2 for a realm holding no oil. Both were
interesting; only one used to be possible.

`ev_i_gulf_war` keeps the Scud dilemma, which was the good part, and now gates
on `coalitionWar`. Its five weeks of air are a real bombardment modifier
(−25% reinforcement, −15% army power, 12 months) on a war already running,
rather than a verdict.

- **Regression contract**: `smoke102.mjs` — the package is on 1948 and nowhere
  else; no card shrinks an army by hand and the old ruin is gone from the Scud
  card; the Scud card cannot fire on the calendar alone; each of the four ways
  to break the chain really breaks it; withdrawal is a real third road with a
  surviving regime; **both** 1991 outcomes are reachable and mutually
  exclusive; the Iran–Iraq asymmetry runs both ways and the Iranian penalty is
  one UNIT_GENS rung to two decimal places; the overreach ceiling is shut on
  the frontier and open inside Iran; every option of every card resolves clean;
  and thirteen years are walked month by month through the real scheduler
  without a guarded failure. `smoke72.mjs` §97 was **updated, not deleted**:
  its old assertion — *a hundred hours undo eight years of army* — encoded the
  behaviour this section removes, and now asserts the new contract, that the
  army is untouched and the bombardment is on the books.

## 154. Air power was a boolean

`airCoverFor` returned true or false, and that was the whole of air power:

```js
const docA = doctrinePips(A.gen, phase, false) + (phase === 'fire' && airA ? 1 : 0);
```

One wing in range: +1 to the die, fire phase only. Twenty wings: +1 to the die,
fire phase only. One enemy wing anywhere in the ring: cancelled to nothing. A
wing cost 40 talents, 1 a month, and half a talent of fuel — so an entire air
force was worth less than one doctrine level, which gives +1 in **every** phase
and costs points once.

**Air is now a signed quantity.** `airWingsInRange` counts, `airNet` returns the
difference between two sides, and `airNetAgainst` asks the same question from
one court's chair against everyone hostile to it. One side's pips are the
other's absence of them.

- **Pips**: `ceil(net / 2)` to a cap of 4, in **every phase**. The first net
  wing is the pip cover was always worth; every two beyond it is another.
- **Interdiction**: 2 net wings against a column cost it a quarter of its
  march, 4 cost half.
- **Sieges**: 3 net wings double the camp's rate; 3 against it stall the camp
  to a quarter, because the besieger is the one in the open.
- **Attrition**: 2 net wings bleed a hostile host monthly with no battle at
  all, which is what an air force that is never fought is for.

**Two arms, and the sequence between them.** Fighters contest the ring and do
nothing else — no pips, no interdiction, no bombs. Strike wings do all the work
and only fly where nobody has taken the sky. So an enemy who buys fighters and
no bombers **grounds yours without gaining anything**, which is a real trade.
Where neither side has a fighter the air is uncontested and everybody's bombers
fly, which is the ordinary case and the one every existing save lands in: a
wing with no `kind` is a strike wing, because that is what every wing raised
before this was.

Wings cost **90**, not 40 — more than three cavalry regiments. An air force is
the thing a realm builds *instead of* an army, which is the actual 1948–73
choice, and at 40 talents it was neither.

**Scope is load-bearing.** Interdiction and attrition apply only on ground the
army's own side does not hold. Unscoped they were a standing weather condition
over the whole world: the 1948 map is small enough that two hops covers a
country, so once every state had a wing or two, every column everywhere was
permanently slowed and every garrison sitting at home was permanently bleeding.

- **Regression contract**: `smoke103.mjs` — the count is a count and it is
  signed; pips scale, cap, and are added in whatever phase is being resolved;
  one enemy fighter grounds four bombers and gains nothing, two fighters take
  the sky back, and evenly contested air lets both sides fly; a kindless wing
  reads as strike; the boolean still answers its own question; interdiction
  bites on a hostile destination and **not** on a march through our own
  country; the siege and attrition terms are really wired and every threshold
  is tunable in DEFINES; and raising a wing picks an arm while the AI buys its
  first fighter before its first bomber. `smoke24.mjs` had the paused-orders
  bill written down as `- 90`; it now reads the prices out of DEFINES, because
  that assertion failed for a change it was never about.

### `smoke80.mjs` §113 — resolved: the counterfactual has to be held

Six
assertions about *which cards fire* in the Lebanon-annexed world now fail, and
the cause is worth writing down because it is not in the air code.

The scenario kills Lebanon at t=0. But `bookmark.setup` has already enrolled
Lebanon in the War of Independence with a host, so clearing its provinces and
flipping `alive` left a landless belligerent still in the war — and the
scenario only ever held because Israel happened to finish the job before 2002.
Removing the army, the war entries and the `atWarWith` list does not fix it
either: Lebanon ends the run holding Nazareth, Netanya and Yavne, which a dead
landless court can only acquire through the free-states liberation restoring a
fallen court after an AI war goes the other way.

So a **content-gating** test was a hostage to **combat balance**.

**The evidence decided it.** Retuning the pips was the live alternative, and it
was measured rather than guessed. `autorun.mjs` across every bookmark reports
no anomaly outside the set `tools/README.md` already accepts — and 1948, the
one chapter where aircraft exist at all, reports **none**. Then the scenario
itself was run at four seeds: Lebanon survives at one of them and is gone at
the other three. The arrangement was always a coin-flip on fifty-four years of
AI war; it simply drew a lucky seed until §154 reshuffled the wars.

So the fix is on the test, and it is not the test being edited until it agrees.
§113 asks ONE question — when Lebanon is not on the map, does the alternate arc
run and the historical arc stay silent? It does not ask whether Israel can hold
Lebanon annexed for fifty-four years, and it never could, because the
free-states clause exists precisely to restore fallen courts. `play()` now
re-asserts the premise each day. Holding the counterfactual is what defines a
counterfactual; letting a liberation quietly end it is how the question got
lost in the first place.

## 155. A scale only a human could climb

§154 made air power a quantity and gave it thresholds: three net wings to
double a siege, four to halve a column's march, two to bleed a host that nobody
is fighting. Then `aiAirPower` capped every AI court at **two wings,
nationally, at the capital, forever** — a number chosen when air was a boolean
worth one pip, and never revisited.

The arithmetic is worth spelling out, because it is the whole defect. Two wings
apiece, and §154's own fighter-first rule buys the first as a fighter. So every
AI ring tied one fighter to one fighter, which under `airNet` is *contested
evenly: both fly*, so both sides' strike wings counted — one against one. **Net
zero.** Air scaled beautifully for a human who builds six wings and was inert
between AI courts, which is very close to the boolean §154 replaced.

It also poisoned the evidence. §154's balance note said 1948 reported no
anomalies, and that reads as *the tuning is sound*. What it actually meant was
that air cancelled itself out everywhere the harness could see.

**What a court wants now scales with what it can pay for**: `2 + income/12`, to
a ceiling of `AIR.aiWingCap` (8) — above the siege threshold, so an AI can
cross it. The fuel line (§52) already punishes an air force a treasury cannot
feed, so this is a want and the treasury guard still has the last word.

**Fighters are matched, not out-bought.** A third fighter against an enemy who
owns one is 90 talents that will never drop a bomb; none at all means the first
court that buys one owns your sky for free. One is the floor, theirs is the
ceiling.

**And a court whose hangars are full lays another runway.** Wings die on the
ground when their field falls, so an air force on one field is one siege from
not existing — spreading it is survival as much as reach.

Measured over forty years of all-AI 1948: **45 wings across 51 airfields**,
Egypt and Jordan at 2 fighters and 6 strike wings each, Turkey at 5 and 2. Net
wings now reach four and five, so §154's thresholds are live rather than
decorative. `autorun` across all eight bookmarks reports no anomaly outside the
accepted set.

**One consequence worth naming rather than burying**: across that run Israel
built no wings at all. Its AI income sits near 11 a month against a 90-talent
wing and a 210-talent guard, so the one state whose identity in this period is
air supremacy cannot afford an air force under AI management. A human ISR
prioritises differently and the chapter plays as intended, but the AI's
economic weighting for 1948 is now visibly out of step with its history, and
that is a real finding this section does not fix.

- **Regression contract**: `smoke103.mjs` — the flat two-wing cap is gone, the
  want scales with income, the ceiling sits above the siege threshold so it can
  actually be crossed, the fighter rule matches rather than out-buys, and a
  court with full hangars lays another field while skipping the ones it holds,
  is building, or is losing.

## 156. The ceiling was never measured

`MAX_TEXTURE_SIZE` appeared exactly once in this codebase, as prose in
`map_data.js`: *"4046px stays under the common 4096 MAX_TEXTURE_SIZE floor."*
`gl.getParameter` was never called anywhere in `js/` or `main.js`. Every
framing decision the project has made was made against an assumption, on every
device, since the beginning — and nobody could see whether the assumption was
even true.

`initRenderer` now asks. It reports the device's real ceiling, compares it
against `max(MAP_W, MAP_H)`, and a device that genuinely cannot hold the map is
**told so** instead of failing to an unexplained black screen.

**But the ceiling was never the binding constraint, and the audit is the
finding.** The frame worth reaching — lon −25..54, lat 0..60, which brings in
Britain, Iberia, north Africa and the Urals — does fit an 8192 ceiling at
today's density, at **7702 × 6913** with no coarsening at all. That part of the
proposal is correct.

What it costs is not what a single-texture estimate says. `initRenderer`
allocates **four** textures at full map size — `landTex`, `decorTex`, `idTex`,
`heightTex` — and the two built from canvases carry mipmaps, a third again
each. So:

```
                        today (4046×2189)      proposed (7702×6913)
  four RGBA8 planes          158 MB                   948 MB
  …with ID as RG8,
    relief as R8             120 MB                   694 MB
```

Not 76 MB today and not 302 MB after. **948 MB is inside the range already
rejected as unshippable for 16384**, and narrowing the province-ID plane to
RG8 (an id fits in 16 bits) and relief to R8 saves 254 MB and still leaves 694.

So raising the ceiling is not the unlock; it is the cheap half. The frame
extension needs the texture *formats* reworked first, or a density that falls
off outside the core, and that decision belongs before the cartography rather
than after it — the coastline tracing is the expensive, irreversible part and
should not be done twice.

- **Regression contract**: `smoke104.mjs` — the query exists and gates on the
  real number; the frame, density and long axis are read out of `MAP_DATA`
  rather than written down; the renderer really allocates four full-size
  textures with two mipmapped; and the two bills above are **computed**, so a
  number that decides whether something ships cannot drift silently in a
  comment the way the 4096 did.

## 157. The relief array was full, and the ceiling was 8192 all along

Two findings, one of which retires the assumption §156 could only measure the
absence of.

**The relief pass was out of room.** `heightPrimitives` is capped by a bare
`32` written into the fragment shader twice — `uniform vec4 uPrimA[32]`, `for
(int i = 0; i < 32; i++)` — and into the fill code three times more. SPEC §53
records v5.4 growing the frame to Rome and the Caspian and filling *"the
renderer's cap at exactly 32."* It spent the last slot. `MAP_DATA` carries
exactly 32 today.

That is a silent failure waiting for the next frame. Line 810 warns **once** and
drops the extras, so a map extended to Atlantic Europe would render the Alps,
the Pyrenees, the Atlas, the Carpathians and the Scandinavian spine as flat
plates, with one console line to explain it. Any conversation about expanding
the frame that does not start here is planning cartography onto a renderer that
will throw it away.

The cap is now one named constant, `MAX_HEIGHT_PRIMS = 64`, interpolated into
the shader and read by the fill. 64 primitives cost 128 vec4 of fragment
uniform, 144 with the pass's other uniforms — inside the **224 that GLES 3.0
guarantees every WebGL2 device**, so it fits the floor rather than a hope about
hardware. `initRenderer` measures `MAX_FRAGMENT_UNIFORM_VECTORS` anyway and
says so if a device cannot hold it, for the same reason §156 measures the
texture ceiling.

**And the texture ceiling is 8192.** §156 could add the query but not the
answer, because nothing here runs WebGL. Compiling the widened shader in a real
browser finally produced the number the project has been guessing at since the
beginning:

```
  MAX_TEXTURE_SIZE            8192      (the comment assumed a 4096 floor)
  MAX_FRAGMENT_UNIFORM_VECTORS 4096      (the GLES 3.0 floor is 224)
  glGetError                      0      (the widened relief pass compiles)
```

Measured on **SwiftShader** — a software rasteriser, and about the most
conservative thing that will ever run this game. The 4096 in `map_data.js` was
not a constraint; it was a guess, and it was wrong by a factor of two on the
weakest plausible device. The frame that reaches Britain and the Urals fits
that ceiling at current density (§156: 7702 × 6913). What still does not fit is
the **memory** — 948 MB in RGBA8, 694 MB with the ID plane at RG8 and relief at
R8 — so the format rework remains the live blocker, and the coastline remains
the expensive irreversible part that should not be traced twice.

- **Regression contract**: `smoke104.mjs` — the cap is a named constant of at
  least 64, no `32` survives in the shader, the declarations and loop and fill
  all read the one constant, and the pass fits the guaranteed 224-vec4 floor.
  Shader compilation itself is verified in a browser rather than headlessly,
  because a template-literal boundary error would emit `${MAX_HEIGHT_PRIMS}`
  into GLSL and fail only at runtime.

## 158. Half the format rework, and why the other half is not here

§156 costed the frame that reaches Britain at 948 MB in RGBA8 and said
narrowing the two generated planes would take 254 MB off it. Half of that is
now done and the other half is a measured wall rather than a plan.

**Neither plane ever used four channels.** The ID pass writes
`vec4(lo/255, hi/255, 0, 1)` and the main pass reads
`texelFetch(uId, ip, 0).rg`. The relief pass writes a grey and is read as `.r`
in three places. So half the ID plane and three quarters of the relief plane
have always been zeroes occupying video memory.

**The relief plane is now R8, and it is verified in a browser.** `glGetError`
0, the page renders, 104 suites green. That is **25 MB back at today's frame
and 152 MB at the target frame** — the single largest saving available in the
renderer, and it costs nothing: a fragment may write a `vec4` to a narrower
target and the extra channels are discarded, which is what was already
happening to the alpha.

**The ID plane at RG8 does not work, and this is the finding.** It raises
`GL_INVALID_OPERATION` — 1282, measured on SwiftShader — and the map goes
black. Isolated by bisection, both directions:

```
  ID RG8   + height R8      → 1282
  ID RG8   + height RGBA8   → 1282
  ID RGBA8 + height R8      → 0      ← shipped
```

The obvious suspect was the CPU readback: `gl.readPixels(..., gl.RGBA,
UNSIGNED_BYTE, ...)` against an RG8 framebuffer. Narrowing that to `gl.RG` with
a two-byte-per-texel buffer **did not clear it**, so the cause is upstream of
the read — framebuffer completeness or attachment support for RG8 colour
targets on this driver, which needs `IMPLEMENTATION_COLOR_READ_FORMAT` queried
and the FBO status checked. That is a real investigation and it is not done.

So the ledger for the target frame stands at **948 → 796 MB**, not 694. The ID
plane's 101 MB is still there and still recoverable, and until somebody
resolves 1282 the honest number is the larger one.

- **Regression contract**: `smoke104.mjs` keeps the projection arithmetic. The
  format change itself is verified in a browser, because a GL error is
  invisible headlessly — which is exactly how this one would have shipped
  silently as a black map.

## 159. The 1282 was mine, three lines below where I was looking

§158 shipped the relief plane at R8, left the ID plane at RGBA8, and recorded
`GL_INVALID_OPERATION` as an unresolved driver question — "framebuffer
completeness or RG8 colour-attachment support on this driver." It was neither.
It was the repair path, and the bisection that looked so clean was pointing at
the right texture for the wrong reason.

**RG8 was never the problem.** Built standalone in a browser, an RG8 colour
attachment is `FRAMEBUFFER_COMPLETE`, reports `IMPLEMENTATION_COLOR_READ_FORMAT`
of `RG`, and reads back with **zero** error as RGBA, as RG, and as the
implementation pair. Three formats, no complaint. That measurement is what
turned the search around: if the target is fine, the error is something the
app does to it.

**`repairDisconnectedProvinceRaster` writes the raster back.** When the
province raster has disconnected fragments, the corrected `idArray` is packed
into the staging buffer and uploaded with `texSubImage2D`. §158 narrowed the
`readPixels` and did not narrow the write — so the code read two bytes a texel
and then pushed **four-byte RGBA into an RG8 texture**, which is
`INVALID_OPERATION` exactly as specified. The error was three lines below the
one I was reading, in the branch that only runs when the raster needs repairing,
which is why it never looked like part of the ID pass.

All three paths now agree on two bytes a texel: the target, the readback, and
the write-back.

**Verified by pixels, not by error codes.** A clean `glGetError` says nothing
about whether the map is *right*, and the province-ID plane drives every colour
on screen. Screenshots of the compositor output before and after are
**byte-identical** — same SHA1, 0 of 145,633 sampled bytes differing — so the
narrowed plane is not merely quiet, it is the same map.

**The ledger closes where §156 projected it.** The frame that reaches Britain:

```
  §156 projection   948 → 694 MB
  §158 (half)       948 → 796 MB
  now               948 → 694 MB      ✓
```

101 MB back from the ID plane, on top of §158's 152 MB from relief, and 18 MB
off the CPU staging buffer as a side effect. Today's frame drops from 158 MB to
**120 MB**. Memory is no longer the blocker on extending the frame; the
coastline is.

- **Regression contract**: `smoke104.mjs` holds the arithmetic. The format
  itself is verified in a browser and by screenshot comparison, because this
  bug passed 104 headless suites twice — once as a black map, once as a false
  conclusion about the driver.

## 160. The frame reaches Britain, and two things the move broke on the way

§159 closed the memory ledger and said the blocker was no longer memory but the
coastline. The coastline is traced.

**The frame.** lon 11°W–53.5°E, lat 23.5–58°N, at **6288 × 3975** — the same
density every version since v5.0 has shipped (97.5 px/°lon, 115.2 px/°lat), so
nothing measured in map units had to move. It holds the whole Roman world: the
Maghreb and the Atlantic shore of Africa, Iberia, Gaul, Britain and Ireland,
the Rhine and the Danube, the Baltic, the Pontic steppe with Crimea and the
Maeotic lake, and the Caspian entire.

Not the frame §156 costed. That one was lon −25..54 / lat 0..60 — 7702 × 6913,
694 MB, and what the extra 368 MB buys is the Urals and the far side of the
Sahara. This one is **326 MB**, and it reaches the home islands. Both numbers
are computed in `smoke104`, so the next person to propose a frame gets
arithmetic instead of a memory.

**One ring, where there were three.** The old top edge at 42.5°N cut Europe
apart above the Adriatic, so the atlas carried MAINLAND, BALKANS and ITALY as
separate landmasses. At 58°N none of those cuts exist — Italy joins Gaul over
the Ligurian shore, Gaul joins the Balkans over the Alps, and Europe joins Asia
across the steppe north of the Black Sea. So the three merged into one ring of
921 vertices, BALKANS reversed to match the others' handedness, and the
Mediterranean became what it geographically is: an inlet, not an edge.

That is the part with no undo, and it needed a tool, because a coastline is the
one thing here that cannot be read from source. **`tools/coastcheck.mjs`** holds
what a ring must be — simple, disjoint, closed, inside the frame — and
rasterises the mask to a PNG so it can be *looked* at without a browser, a
server and a WebGL context. A crossed ring fills inside-out over the crossed
lobe and has no other symptom; every province seed still lands on "land", and
every downstream suite stays green.

**And the tracing has an error bar now.** `tools/coastfit.mjs` measures every
vertex against a real coastline (Natural Earth 10m, fetched on demand — it is a
measurement, not a gate). Median **1.7 km**, p90 9.2 km, over 921 vertices; one
map pixel is about 1.1 km, so the median vertex is within two pixels of the
real coast. It paid for itself immediately: Britain came back at median 1.8 km
with a **46.6 km** worst vertex — the Tees an inland pixel, Cardigan Bay drawn
fifty kilometres out to sea, the Mounth a whole Aberdeenshire west of itself.
Corrected, Britain is median 1.4 km, p90 5.5, worst 12.4.

Read the outliers before believing them. The largest miss on the map is 59 km
at the head of the Persian Gulf, and it is *correct*: that is the 66 CE
shoreline near Charax, and the Shatt al-Arab has built about that much delta
over it since. Where this map is deliberately ancient, a big number means the
reference is late.

### The two things the move broke

Neither was in the plan, and neither is about cartography. Both are the same
shape: **a constant that was a fraction of something that moved.**

**The Red Sea and the Persian Gulf stopped being seas.** `computeGeometry`
decided open sea by size — "any id-0 component ≥1% of the map" — and 1% of a
map that grew 2.8× is a threshold that grew 2.8× while the seas did not. At the
new frame the Persian Gulf (16.9 sq°) and the Red Sea with both its gulfs (11.0
sq°) fell under it and were silently reclassified as **lakes**: no coastal flag,
no offshore anchor, no navy and no blockade from Charax to Berenice to Eilat.
Nothing announced it. One assertion in `smoke30` caught it, by luck, because it
happened to name Eilat's shoreline.

The rule is now the one the comment always claimed: **open sea is water that
runs off the frame**, plus a floor in square degrees rather than in map
fractions. Both tests are scale-free, and measured across the change they
classify every component identically on the old frame and the new one — the
four seas all reach an edge, the five lakes are all landlocked and all under
1 sq°.

**Aqaba lost its shoreline.** The Gulf of Aqaba's head was drawn as a point, so
the gulf tapered to ~3 px at 29.5°N, and whether Eilat and Aila touched salt
water at all came down to which way the domain warp pushed the border. The warp
is a function of absolute pixel position, so moving the frame moved its phase,
and Jordan's only port quietly became inland. The head is drawn square now,
about 5 km across with a town on either bank, which is what it is.

### What is on the new ground, and what is deliberately not

133 new cells: the Maghreb from the Syrtis Minor to the Atlantic, Hispania,
Gaul with the Rhine and the Alpine provinces, northern Italy and the Tyrrhenian
islands, Britannia and Hibernia, Germania and the Cimbric peninsula, the Danube
and Thrace and Dacia, the Pontic steppe and the Tauric Chersonese. 22 new
rivers, from the Rhenus and the Danuvius to the Rha and the Baetis. 27 new
relief primitives into the slots §157 opened — the Alps, the Pyrenees, the
Atlas, the Caledonian highlands, the Carpathians — bringing the atlas to 59 of
the renderer's 64. Five new base religions and seven new cultures, because a map
that reaches Britain and calls the Britons Roman-cult in 167 BCE is lying in the
one place a player can check.

Britannia, Caledonia and Hibernia are the always-on cells; the fourteen finer
ones are latent beneath them, so 167 BCE gets an island and not a province list.

**Ownership is WASTE, and that is the seam this stops at.** Rome held most of
this ground in 66 CE, the base atlas's year — but the base owner is what every
bookmark inherits unless its `owners` table overrides, so shipping these as ROM
would hand Rome ninety-odd provinces in 167 BCE, 67 BCE, 40 BCE and every other
chapter at once. That is not a cartography change; it is a balance change to
eight tuned campaigns, and it belongs in its own section with its own harness
run. Until then the west is on the map as what this game currently models it as:
land, with people and produce on it, outside every state the chapters play.

### The new blocker is boot time

Memory is not it, and neither is the ceiling. The ID pass is one fullscreen draw
over every texel against every seed: 25.0M × 307 here against 8.9M × 174 before,
about five times the work. Measured on SwiftShader — a software rasteriser, the
most conservative thing that will ever run this — against the pre-§160 tree in
the same environment, same server, same Chromium:

```
                        before      after
  start screen          17.5 s      74.4 s
  live campaign         46.5 s     103.6 s
```

A real GPU does this in a fraction of it. But that is the number to beat next,
and the fix is a spatial structure for the seed search rather than 307 linear
distance tests per pixel.

- **Regression contract**: `smoke104` pins the DENSITY rather than the width and
  height — pinning 4046×2189 is what made it fail on a correct frame change —
  and holds both memory ledgers as arithmetic, plus the renderer's
  `MAX_HEIGHT_PRIMS` against the copy `validateMapData` checks (§157 raised one
  and left the other at 32, which the first new primitive would have tripped).
  `smoke27` asserts that 1948 activates *every* latent cell instead of counting
  to 31 — 1948 is the full-resolution bookmark the geometry snapshot is dumped
  from, so a latent cell missing from it has no geometry in any era, which is
  exactly how the British cells came back with zero area. `smoke29`'s theater is
  a region now, not a name list that would have grown by ninety. `coastcheck`
  runs the ring invariants; `coastfit` measures the tracing.
- **`smoke81` was luck.** It asserted the six-card Galilee arc on seed 7 of a
  299-year all-AI run. Adding cells moves the RNG stream, and seed 7 stopped
  being a lucky draw — but the pre-§160 tree fires 0 of 6 on seed 11, so the
  assertion was always a claim about the seed rather than about the road. It
  samples three seeds now and requires a majority; 5 of 6 sampled seeds run the
  arc end to end.

### Two the first commit missed

Both found after §160 shipped, both by asking a question the suites did not.

**An army could walk from Gaul to Britain.** The Channel is ~0.6° wide at
Dover and the ferry is a `seaLink`, but the weighted diagram bridged it three
hundred kilometres west — where Armorica and the Belgic shore face each other
across the widest part of it, `Condate` and `Venta Belgarum` came back
*land-adjacent* on the real raster. Bonifacio did the same between Corsica and
Sardinia. Neither shows up in `validateMapData`, which checks seeds; neither
shows up in `coastcheck`, which checks polygons; and neither shows up in any
suite, because a false adjacency is a perfectly ordinary-looking edge. What
finds it is comparing every cross-landmass edge in the raster against the
landmass each seed actually sits on — three pairs, of which Messina was already
known and accepted. Both new ones are severed and both have ferries.

**The whole browser battery stopped being runnable.** `main.js` awaits
`initRenderer()` and `computeGeometry()` before `showStartScreen()`, so the
bookmark carousel is gated on the full province-raster pass — 74s here against
17s before — and all 37 suites wait for `.bm-card` on a 20-second timeout.
Every one of them died on that line, identically, before asserting anything.
The wait is one named constant now (`BOOT_MS`, 42 occurrences across 36 files);
`uitest26` passes unchanged behind it, which is what says the failures were the
timeout and not the frame.

The real fix is not a longer timeout. It is that **nothing on the start screen
needs the raster** — the carousel is a list of bookmarks, and the geometry is
not wanted until a campaign begins. Deferring `initRenderer` past
`showStartScreen` would make the start screen instant and put the cost behind a
loading state where it belongs, and it is the same work as the seed-search
optimisation above: the boot path is now the thing to fix, and it is not
cartography.

### §160 cut Greece off the map

The worst of the three, found only because I went looking for defects of a
class rather than for defects.

`canEnter` (js/sim/military.js) ends in `return false` — an army may enter its
own ground, an enemy's, or an ally's, and nothing else. Unowned ground falls
through. That line had never once executed: **every WASTE cell in the game was
also `impassable: true`** — all nine of them were deep desert — so the
impassable check above it always fired first. The fall-through was dead code
that read as deliberate.

§160 put 130 unowned-but-*passable* cells on the map, and the dead code woke up
as a wall. Four of them — Philippopolis, Serdica, Naissus, Novae — sit on the
ground between Thrace and Macedonia, which is to say across the via Egnatia.
Measured on the shipped snapshot: **Byzantion could reach 152 of 307
provinces.** Thessalonica, Dyrrhachium, Corinth, Athens and Sparta were a land
island in every one of the eight chapters — no march, no reinforcement, no
supply chain reaching them, and an AI whose `bfsDistances` could not see them
at all. The 1948 Greek state was cut off from Europe.

Nothing caught it, and the reason is worth writing down: every check this
project owns looks at a *local* property. `validateMapData` checks seeds.
`coastcheck` checks polygons. `smoke31` checks that latent groups are
contiguous. A realm severed in half is not a shape any of them has a question
about. Even the balance harness stayed green — an all-AI run where Greece never
moves looks like an all-AI run where Greece had nothing to do.

The fix is one line and it is a rule, not a patch: **unclaimed land nobody
governs is walkable by anyone.** Passage is not possession; entering unowned
ground takes nothing and claims nothing. With it, Byzantion reaches 268 of 307
— the remainder being islands, which are supposed to be islands, and the nine
impassable deserts.

The balance harness came back *cleaner* than before the fix: the anomaly set
dropped to `67 SEL DEAD + ITU BLEEDING`, both long-accepted, with 614's JUD
bleed gone. A world whose roads connect is a world the AI plays better.

- **Regression contract**: `smoke104` now names the five stranded provinces and
  asserts each is land-reachable from Byzantion, that the mainland is one
  walkable body, and that Britain is still an island — a connectivity check,
  which is the shape of question nothing was asking. `smoke81` samples six
  seeds rather than three, because that assertion ESTIMATES A RATE and three
  samples cannot estimate one near two thirds; it also now asserts the arc
  never collapses below 5 of 6 and that a short run is short by the final
  gated card rather than one from the middle.

### Five more false borders, and the one I did not sever

The Channel fix in §160 compared LANDMASSES — and merging MAINLAND, BALKANS
and ITALY into one ring had made Europe, Africa and Asia the same landmass, so
that check went blind to every crossing except the island ones. The test that
actually finds them walks the land mask: shortest land route between two
centroids against the straight line. A genuine neighbour walks it directly; a
false border has to go the long way round.

Adjacency diffing first, to know what is even mine. Across the whole frame
change, §160 altered exactly **two** edges between pre-existing provinces: it
removed `Hadrianopolis | Thessalonica` (the via Egnatia — the Greece outage
above) and added `Eastern Desert | Sinai Interior` (both impassable, inert).
So the Bosporus, Dead Sea, Gulf of Aqaba and Gulf of Issus borders an audit
turns up are **pre-existing**, not this frame's doing, and are left alone —
`Byzantion | Nicaea` is a 19.9x detour and contradicts this file's own comment
about ferries, but severing it re-routes eight tuned chapters and belongs to
whoever owns that decision.

Severed here, all involving a §160 cell: `Capua | Salona` and
`Tarentum | Salona` across the Adriatic (2.6x, 2.4x), and `Hyrcania | Ustyurt`
across the Caspian (2.2x). The same test **cleared** everything else that
looked wrong on a naive water-crossing screen — Genua|Pisae round the gulf of
Genoa (0.9x), Isca Dumnoniorum|Isca Silurum round the head of the Severn
(0.9x), Tauria|Tanais round the Maeotic shore (1.0x), Semnones|Cimbria (0.9x).
A screen that only asks "does the line cross water" reports all of those.

**And one is knowingly left wrong.** `Portus Magnus | Malaca` and
`Volubilis | Malaca` cross the Alboran sea at detours of 20.3x and 28.6x —
Malaca's cell wins a stray lobe on the Algerian coast. Severing them breaks
`smoke90`: the 167 BCE crowned run loses a thirteen-card strand of the royal
century, `ev_samaria_falls` through `ev_k_salome_dies`.

That is not drift, and the measurements are what settle it. The base map loses
at most **1** card across four seeds; this map without the Alboran severing
loses **0**; with it, **13** — and re-adding either edge alone restores 0. The
crown is enacted at the identical date either way (−145/9, 30 provinces), so it
is not a timing shift. Severing the Alboran makes Africa's land route to Iberia
run the whole way round through Sinai and the steppe, which moves every AI
distance query in the game, and something downstream of the proclamation is
fragile to that.

Two bad trades were available: ship a red suite to hide a map defect, or weaken
a test that four seeds and two maps say is well calibrated. Neither. The defect
is written down where the data lives, with the reproduction, and it is latent —
all three cells are WASTE, so no army in any chapter can walk it today. The
likely proper fix is to stop the lobe at its source (`Malaca` in
`contiguousProvinces`, so the repair detaches the African fragment instead of
adjacency being patched afterwards) and then to find what in the crowned run
depends on that distance. It belongs with the section that gives the west
owners, which is the day it stops being latent.

## 162. Galilee was not a kingdom in 529

The Keepers opened with a Jewish state in the Galilee: `JUD` held Tiberias,
Sepphoris, Tarichaea and Gischala outright, with no overlord, a treasury and a
standing army called the Watch of Tiberias. There was no Jewish polity anywhere
between Bar Kokhba and 1948, and the chapter's own comment says what the
community actually had — "the patriarchate is a century lapsed, the academy at
Tiberias is what governs, and the Palestinian Talmud was closed at Tiberias" —
and then hands it four sovereign provinces anyway. The map contradicted the
paragraph above it. The 132 CE chain is built on the same fact from the other
side: `ev2_g_what_the_office_was_for` turns on Theodosius II letting the
patriarchate lapse in 425.

**So the towns start Byzantine and the court starts dormant.** The Galilee is
Palaestina Secunda; the RELIGIONS overlay is untouched, so these stay Jewish
provinces under an empire legislating against them, which is the situation. JUD
keeps its seat in `activeTags` and owns nothing, on exactly the pattern 167 BCE
uses for the Seleucid successors — five courts that exist and wait.

**Deferred, not deleted.** The one circumstance in four centuries that could put
a Jewish polity back on the map is already in this chapter:
`ev529_the_praetorium_at_caesarea`, July 556, where both houses of Israel came
out in the same street, killed the proconsul Stephanus in his own hall, and his
widow carried the case to Constantinople. Option 0 — "Send word to the Jewish
quarter. Both houses, or neither" — already set `roseWithTheJews` and moved
opinion. It now also hands the four academy towns out of the Empire's hands,
grants a treasury and raises the Watch of Tiberias. The options that leave the
Jews out of it do not: answer alone and the chapter has one house in it.

An entity that appears out of a joint revolt is a truer thing than one that was
always simply there — and it makes the fork at Caesarea cost something.

- **Regression contract**: `smoke94` inverted. It used to assert the court held
  four provinces and that its declared seat was one it owned; it now asserts the
  court holds NOTHING at the opening date, that all four towns are Justinian's,
  that JUD is nonetheless seated and dormant, and that the seat names an academy
  town rather than Jerusalem. A new section holds the formation itself: only
  option 0 of the praetorium sets `galileeRestored` and only option 0 names the
  four towns — the two that answer alone must not.

## 163. Nobody else had a court

`js/sim/factions.js` says it in its own header, and has since §34: "Player-only,
the same rule as ultimatums: AI realms keep their politics offstage." One line
enforces it — `activeDefs` returns null for every tag that is not
`g.playerTag` — and everything downstream inherits the silence.
`factionApproval` reads null for Antioch. `shiftFaction` is a no-op against
Rome. `monthlyFactions` returns on its first statement for thirty-nine of the
forty courts on the map.

The consequence is not that foreign courts were simple. It is that nothing bad
could ever happen inside one **for reasons of its own**. Bankruptcy and a dead
king were the only two internal clocks the world had, and both were written for
everybody. Otherwise a foreign power was a treasury, an army, an opinion score
and an aggression multiplier, and the only thing that ever went wrong for it
was the player.

**So every court that is not the player's now convenes too, in `js/sim/courts.js`.**
Not the same machinery: the bookmarks' estates are hand-authored, era-windowed
constituencies with boons, banes, demand cards and an appeasement price, and
handing that to forty tags would mean authoring three hundred estates and
putting the player's carefully-priced modifier stream on every throne in the
game. A foreign court is a cheaper thing on identical arithmetic — two or three
parties by constitution (a monarchy has the King's Men, the Great Houses and
the Soldiers; a republic has the Senate, the People and the Legions; a
theocracy and a tribal confederation have their own), approval 0–100, the same
four bands at the same four numbers, drifting monthly on signals the engine was
already computing: stability, legitimacy, war exhaustion, whether the army is
paid, land lost this year, land under somebody else's boot.

What the bottom of that scale produces is not a modifier. It is an event in the
world, on a pressure clock, escalating:

- **a policy reversed** — aggression collapses, the angriest grudge warms a
  step, and a court that was coming for somebody stops
- **the court purged** — the ruler is removed through the ordinary §98
  succession, so an heir inherits, a republic holds an emergency election, and
  a court with nobody named gets the full crisis
- **a province defects** — to a neighbour of its own faith or people, or under
  its own banner through the §87 rising machinery
- **a civil war** — hosts in the field against the throne

Every one is chronicled and carried by a "News from abroad" toast, and the
foreign court's own panel shows the bars that produced it. The player did not
cause it and cannot be blamed for it, which is exactly what makes it worth
watching for.

**Two numbers this cost, both found by running it.** The first draft used
`factions.js`'s flat ±0.3 regression toward 50. That is correct for
hand-authored drift rules written against a flat pull — the author keeps them
under 0.3 and steers with scripted shifts — but generated rules cannot stay
under a cliff they cannot see, and a stable solvent realm drifts about +0.6.
Every court on the map sat pinned at 100 within a decade. Regression is now
proportional (`50 + drift/0.04`), which has no cliff: a good year rests a court
at loyal, one thing wrong rests it at discontent, and only an unpaid army in a
losing war reaches hostile.

The second was worse and the balance harness caught it. With the first draft's
thresholds the Seleucid Empire lost ten provinces in the first eight years of
the 167 chapter and the all-AI Maccabees went from three provinces to eleven
without declaring a single war. A chapter's opening is balanced against the
antagonist it was authored with; a system that quietly dismantles that
antagonist is not adding drama, it is rewriting the scenario. The clock is now
once-a-generation rather than once-a-decade, thresholds scale with realm size
(an empire absorbs discontent that would tear a kingdom apart), and nothing
fires at all during the first six years of a chapter.

- **Regression contract**: `smoke105` asserts courts convene at five or more
  foreign capitals and at none of the player's; that the bars spread across
  bands rather than saturating; that no outcome fires inside the grace period;
  and that over ninety years the world's courts do produce the authored ladder.

## 164. Half the pleasure of a rival's civil war is having caused it

The diplomacy a player could do to a foreign court was a closed list: subsidise,
guarantee, rival, league against, take as a client, or fight. Every one is a
transaction between two rulers conducted in daylight. None of them reaches
inside the other court.

Which is a strange hole for this period, because reaching inside somebody
else's court is most of what happened in it. The Pharisee rebels invited
Demetrius III to invade their own country. Antipater ran Hyrcanus for twenty
years. Both Hasmonean brothers sent money to Rome and Scaurus took four hundred
talents from one of them. Herod bought a Senate. All of it is in this game
already — as scripted cards, fired on dates, with the player watching. The verbs
existed in the fiction and not in the hands.

**`js/sim/intrigue.js` puts three of them in the hands**, priced in influence
and gold and aimed at a named party at a named foreign court, which §163 has
now given every court to aim at:

- **Patronize** — raise a party. Cheap, open, deniable; their court warms to you
  slightly. This is how you buy a friendly neighbour without a treaty.
- **Subvert** — lower a party. This is the one that matters, because §163's
  pressure clock counts hostile parties: a court you have been paying against
  for a decade reverses its policy, then loses its ruler, then loses a province,
  then comes apart. A third of the time the letters are intercepted, and then it
  is public, expensive, and remembered.
- **Back a claimant** — not a nudge. It opens the §98 succession crisis at the
  stage where the houses married into theirs discover an interest in their
  constitution, and where the throne is already weak it puts a banner in the
  field. Caught at that, you are not a rival; you are an enemy.

Two rules the whole file obeys. You cannot reach a court you have no way of
reaching — a shared border, a war, a treaty, or the target being one of the
powers everybody has heard of (§165). And this is the **player's** verb: the AI
runs no operations against the player or against each other, for the same
reason it raises no punitive coalitions (§59). An unseen system quietly
wrecking your court is not a mechanic, it is a bug report. What the AI gets
instead is §163 — courts that come apart honestly, whether or not anybody paid.

- **Regression contract**: `smoke105` asserts subversion moves the target party
  and then cools the channel; that patronage moves it the other way; that we
  cannot run agents in our own court or against rebels; and that an empty purse
  buys nobody.

## 165. Am I winning

There was a ledger listing every nation with its numbers, and up to two rivals a
player could name. There was no answer anywhere to "am I winning" that did not
require reading a table and doing the arithmetic — and, more to the point, no
answer the **world** had. Nothing in the sim knew that Rome was the biggest
thing on the map and Characene was not. Every court weighed every other court by
the only number it had: how many men are in the field this month.

`js/sim/standing.js` scores each living court quarterly on development (weighted
down for land somebody else's army is standing on, per §146), income, army,
technology and the clients that answer to it, and ranks them. The top seats are
the powers of the age — at most eight, and **never more than half the room**,
because a chapter with nine courts in it has no top eight, and the first draft
cheerfully told a sixth-of-nine Judaea it was one of the powers, which is
exactly the flattery a standing table exists to refuse.

Three uses, and no more. The realm panel prints "6 of 9 · minor" so the player
knows what kind of game they are in. `deference()` returns the extra margin a
court wants before starting a war with someone above it, wired into the one
place in `ai.js` that decides an opportunistic declaration as a multiplier on
the ratio it already computes — so a border kingdom with a lucky levy stops
treating an empire as a fair fight. And everyone has heard of the courts at the
top table, which is what lets §164's agents work in a capital they do not
border.

It is not score. Nobody wins by being first; the bookmarks keep their own
victory contracts and this number appears in none of them.

## 166. Nothing made anyone structurally behind

Technology was three ladders bought with monarch points, capped per era, priced
by one formula over a level and a baseline. Nothing in it knew where anybody
was. Judaea climbed the same stairs as Rome at the same conceptual rate, and the
only reason Judaea was behind was that Judaea had fewer points.

"Behind" is not a point total in this period. It is a place. The Greek way of
running a government arose in Alexandria and Antioch and spread outward from
them, and a kingdom in the hills was behind because of where the hills were —
and could stop being behind by adopting something, at a price its own people
would make it pay. A game about the second century BCE that cannot represent
that is missing its own subject.

**Thirteen institutions** (`js/data/institutions.js`) are born in a place in a
year and spread province by province — faster inside one realm, faster into a
rich province, faster once the world is already doing it, and along the trade
routes, which is how the chancery actually reached Judaea rather than walking
fifteen cells at five years a cell. A realm may **embrace** one once a third of
its development knows it. Every institution alive in the world that a realm has
**not** embraced adds 15% to every level of every ladder it buys, capped at 90%.
An institution older than three centuries at the chapter's opening is furniture:
everybody has it and nobody pays for it.

**The Greek chancery is why the file exists.** The quarrel between the
Hellenizers and the pious was flavour: an estate bar, a doctrine axis, forty
event cards, and no mechanical teeth anywhere — a player could keep the
Hellenizers on the floor for a century and pay nothing for it. Now refusing the
chancery means paying more for technology for as long as you refuse, and
embracing it moves the Hasideans, the Pharisees, the Sages and the villages
against you in one transaction.

**And the wall is the faith, not the map.** The first draft derived resistance —
anything born outside your religious group met a slower rate — and got two
things wrong at once. It gave 1948 Israel a wall against Industry and the
National Idea because Christians invented them, which is not a subtle mistake;
and a *rate* multiplier, however small, converges given a century, so the
chancery still saturated the Judaean hill country before 167 BCE opened, which
is the wrong history arrived at more slowly. Resistance is now **authored** —
the polis, the chancery, Roman law, the established faith and the diwan carry
it; coined money, gunpowder and a factory do not — and it is a **ceiling**, not
a slope. An alien province tops out below the threshold that counts, and only
two things carry it past: paying to school the place, or the state itself
adopting the thing, after which its own administration propagates it.

The consequence worth naming, because nobody authored it: **a Hasmonean Judaea
that takes the Greek coast inherits the chancery**, at full strength, in the
cities that already had it. Taking Ptolemais and Ascalon is how you stop being
behind — and it is how the Hasmoneans stopped being behind. Jewish Joppa, on the
same shoreline, does not carry it, because the wall was never geographic.

**An institution grants no modifier.** The first draft gave each one three to
nine permanent multiplicative buffs, handed to every court on the map at seed,
and the harness caught it in a single run: the 167 chapter went from a clean
sheet to an all-AI Judaea tripling its size in eight years, and the bisect put
the whole change on the stat lines rather than on the price. What embracing buys
is that you stop paying more for technology than the world does. That is a real,
legible, sufficient reward — the point of the system is that being behind is
expensive, not that being ahead is a stat line — and it means this file cannot
quietly re-tune eight chapters that were balanced without it.

## 167. A faction with no geography cannot be fought over

The estates were a bar in a panel. The Pharisees stood at 62 everywhere at once;
the Hellenizers stood at 31 in Ptolemais and at 31 in the Judaean hills, which
is the one thing they demonstrably did not do. So the estates could be courted,
appeased and offended, and they could never be **fought over** — and taking a
Greek city, the most politically loaded act available in this period, was
arithmetic about province counts.

`js/sim/estates.js` gives every party a strength in every province, computed
from what the province **is**: town or country, coast or hills or desert, its
faith against its ruler's, a trade stop, a fort, a holy site, its development,
the capital. The weights are authored per party in `js/data/estate_ground.js`;
the signals are read off the province. Nothing is stored, so a town that grows
or a faith that drifts moves the politics with it and no save format changes.

Three things ride on it, and nothing else does:

1. **Influence.** A party's weight at court is the development-weighted share of
   the realm that is its ground, and `factions.js` scales each estate's boon and
   bane by it. A party holding no ground barely reaches the ledger; one holding
   half your development cannot be ignored at any approval. **This is the line
   that makes conquest domestic politics**: take the Greek coast in 167 BCE and
   the Hellenizers go from 4.8% of your realm's political ground to 33% of it,
   whether or not they like you.
2. **Local unrest.** A province whose dominant party is hostile has a reason to
   riot, and the row in the unrest breakdown **names the party**, so the panel
   says who is angry here rather than reporting a number.
3. **A mapmode.** `estates` colours every province by whichever party of its
   ruler's court holds that ground, shaded by how firmly — one palette per
   *seat*, so it reads as "who runs this province" inside each realm rather than
   pretending the Seleucid Phalanx and the Judaean Hasideans are the same thing.

**Neutral at an even share, and that is a contract.** Shares sum to one across
the seats at a court, so a party holding exactly its even share must scale
authored effects by exactly 1.0 — otherwise this module silently re-tunes every
boon and bane in eight bookmarks. The first draft returned 0.865 for a perfectly
balanced court and `smoke18` failed on the next run. What §81 still guarantees,
and what `smoke18` now checks, is the **ladder**: devoted pays exactly twice
what loyal pays, hostile exacts exactly twice what discontent exacts, and the
influence factor is asserted separately.

## 168. Time did not change the world's character

The 167 BCE chapter runs a hundred and seventy-three years, to 6 CE. Faction
windowing (§127) already knew the people in the room change over that span. The
**world** did not. A campaign in 160 BCE and the same campaign in 1 BCE played by
identical rules: client kingship worked the same, annexation cost the same, the
peace table offered the same menu. The only difference was who was alive.

That is the one structural thing separating this from a game where 1444 and 1750
feel like different centuries — and for this map it is not a matter of taste, it
is the actual subject. The eastern Mediterranean went from a world of Hellenistic
kingdoms, where client kingship was a durable legal status a dynasty held for two
centuries, to a world of Roman provinces, where being a client meant being in a
waiting room. Herod died a king. His son was deposed and the country became a
prefecture ten years later. Nobody's stats changed; the rules did.

`js/sim/ages.js` declares four ages with boundaries at the dates the rule
changed, not the dates a textbook opens a chapter — **−63** (Pompey's settlement
of the East, the year the region acquired a power that annexed clients as
policy), **640** (the conquest, after which it did not for four centuries), and
**1878** (Berlin, after which a protectorate is a stage rather than a station).
Each age does very little, deliberately, and all of it to one thing: what
happens to a client kingdom over time.

In the **Age of Kingdoms** nothing erodes. In the **Age of Provinces** a client
accumulates absorption pressure every month it stays a client, and when the
pressure fills, its overlord takes it into direct rule through the ordinary §61
union machinery, so land, court and army are handled exactly as any union
handles them. Being large, being genuinely devoted, or fighting the lord's war
beside it slows the clock; being small hurries it. The **Age of the Faiths**
eases it — the caliphates and the empire ruled through tributary princes again
— and the **Age of Nations** brings it back harder.

One line in `military.js` had to change for any of this to happen: the check
that unravels a union when the client's devotion cools now exempts unions the
calendar started. A union woven out of devotion needs the devotion to hold; an
annexation the age itself is performing does not, because nobody asked the
client. If that check applied to both, the Age of Provinces could never occur —
a client being taken into direct rule against its will is by definition a client
whose opinion has just collapsed.

**An age carries no stat modifiers.** It would have been easy to give each one a
list of effects, and that is exactly the mistake §166 made and had to undo:
eight chapters were balanced without this file, and an age that quietly hands
every court +6% income has rewritten all of them. An age changes a rule.

- **Regression contract**: `smoke105` asserts the four boundaries, that no age
  carries effects, that a client in the Age of Kingdoms is not being digested
  while one in the Age of Provinces is, that the turn of the age is chronicled,
  and — the one that matters — that a calendar annexation survives the opinion
  check that correctly unravels a voluntary one.

## 169. The hope, the office and the ascents

Three things the game kept as prose and never as arithmetic, all about the same
institution, all cheap once §163–§167 exist to hang them on.

**The expectation.** Bar Kokhba was hailed "son of a star" by Akiva, and Rabbi
Yohanan ben Torta told him grass would grow on his cheeks first. Both are event
cards. Neither made the realm a state *carrying a messianic expectation*, which
is a specific and terrible condition and not a flavour text: a movement that has
declared its king fields men it does not have and cannot survive being wrong,
because the claim is falsifiable and everybody is watching. `js/sim/sacred.js`
carries it as a 0–100 gauge that pays manpower and morale at the top, charges
unrest the whole way, takes legitimacy and a point of stability out of you on
**every setback in proportion to how high it is**, and cools if nothing arrives.
It is the only system in this game where success is dangerous.

**The office.** The High Priesthood is what the period fought over — Jason
bought it, Menelaus outbid him, Jonathan took it out of a Seleucid civil war,
Herod appointed and deposed at will, and by the first century it was an auction.
It was one statecraft card. It is now an office with an occupant, seated from
one of the parties at court, paying the crown legitimacy every month while the
two of them agree and costing it while they do not — and standing empty is worse
than either. Seating it moves every party in the room, because there is one
office and everybody knows who did not get it.

**The ascents.** Three festivals a year and the half-shekel from every community
in the world is an economy, and it now appears as a line in the income
breakdown. It pays more while the expectation is high, it very nearly stops
while a war closes the roads, and an occupied shrine draws nobody — which is
exactly the pressure that makes a pious realm think twice about a campaign.

**The gate is a flag, not a year.** The first run of this file offered 1948
Israel a High Priest from the Coalition. The office exists where it historically
existed: a Samaritan realm has one unconditionally (it is the SAM standard's
whole constitution, §136), and a Jewish realm has one while the House stands —
before 70, or after that chapter's own chain has raised the altar again
(`altarRaised` in 132, `altarRestored` in 614). No year test would have caught
1948 on its own.

- **Regression contract**: `smoke106` asserts the Temple gate answers correctly
  in all eight chapters, that the expectation pays and then punishes, and that
  the ascents fall when the roads close and stop when the shrine is occupied.

## 170. The years, and the eye

Two pressures the world applies over time, neither of which existed, and both
about the same absence: a campaign twenty years into going well felt identical
to one two years in.

**The years.** The generic pool has good harvests and failed rains and rolls
each independently at a flat monthly chance, which makes weather a coin.
Weather in this region is not a coin, it is a cycle, and every agrarian state in
it knew that. A slow climate index now wanders between drought and abundance
over roughly a generation, computed from the date and the campaign's seed — so
it stores nothing, cannot drift across a save, and two players on one seed get
the same decade of drought, which is what makes it a fact about the world rather
than about your luck. An event may declare `weather: 'good' | 'bad'` and its odds
are multiplied accordingly; at the extremes a bountiful harvest is 1.6× as
likely and a failed rain 0.4×, and in a drought decade the reverse. The realm
panel says what kind of years these are, which is the difference between bad
luck and a bad decade you can plan around.

**The eye.** Empires apply pressure proportional to how much of a problem you
are. A revolt that takes two hill forts is a governor's problem; one that takes
Jerusalem, mints coinage and beats a legion is an emperor's, and the response is
not the same size. The game had this as authored escalation inside individual
chains — Severus sent for from Britain, Vespasian given the East — which is
right for the scripted war and does nothing for the campaign that has outrun its
own chapter. `attention` is that as a system: it rises from what the player has
actually done (land held that a top-table court used to own, infamy, a climb up
the standing table), decays while they are quiet, and thins the margin a foreign
court wants before it will move against them, by at most 45%.

It is deliberately not a difficulty setting. `attentionThreat` returns exactly
1 for every court that is not the player's and exactly 1 for a player who has
taken nothing from anybody, so a quiet campaign runs on the numbers the AI used
before this file existed. A player who takes half the east is noticed whether or
not they wanted to be.

## 171. Two roads the chapters did not have

**The Greek Jerusalem (167 BCE).** The Maccabean chapter had forty cards about
refusing the Greek way of doing things and none about taking it, which is not a
balanced chapter — it is a chapter with one road and a lot of scenery. And it
left the game unable to represent what the sources are most anxious about: the
Hellenizing party had a real programme, real support in the priestly
aristocracy and the coastal cities, and came within one Seleucid civil war of
winning. Jason bought the High Priesthood and a charter for an
Antioch-at-Jerusalem — a polis constitution laid over the Temple state, with a
gymnasium under the citadel — and Menelaus outbid him three years later.

Before §166 this branch could only have been flavour, because refusing the
Hellenizers cost nothing but a modifier. Now refusing the Greek chancery is a
standing surcharge on every technology level, and the chancery will not cross
into the Jewish hill country by itself — so a crown that wants to stop being
structurally behind has exactly two roads, and this is the second. The branch
is gated on both conditions at once (the party strong at court AND the chancery
actually embraced), because neither alone is a programme. Four cards: the
charter, the ephebate and where a Jew who is also a citizen stops, the families
walking out to the wilderness camps, and the settlement two generations later —
the wealthiest Jewish state that ever existed and the least sure what it is.

**The absorption (1948).** The chapter already asked whether the newcomers go to
the frontier or stay on the coast, because §66's Hebrew pen needs a community
living in a town before it will rename it. That is one choice with one
consequence, and it left out the thing that dominated the decade: the population
roughly doubled in three and a half years — some 688,000 arrivals against
650,000 residents — with nowhere to put them and no money. The ma'abarot held
upward of 200,000 people at their peak in 1951; rationing ran to 1959; the
reparations agreement was signed while the Knesset's windows were being broken
from outside; and the argument about who absorbed whom was still running at Wadi
Salib in 1959 and has not stopped since.

Four cards, capacity against cohesion, and no free answer. Open the gates and
the camps and the ration book cost you order and money; set a quota and you are
a state that told Jews in camps to wait, on the record. Then: borrow against the
future and rebuild the camps as towns, or hold them another year. Then: take the
money from Germany, or refuse it. Then the bill, in 1959.

## 172. The dispersion is not beyond the map

The Diaspora was one row in "The Powers Beyond the Map" (§55): a standing bar
and two asks, silver and volunteers.

The powers beyond the map are beyond it because they are — a Senate in a century
the frame does not reach, a khaganate past the Caucasus. The dispersion is not.
Alexandria is **on the board**, and it is the second city of the world; so are
Babylon, Nehardea, Antioch, Cyrene and Rome. Modelling them as one abstract bar
meant the largest Jewish population on earth was a number in a panel while the
province it lived in sat on the map owned by somebody else and told you nothing.

**So each community is a place.** Twenty of them (`js/data/diaspora.js`), keyed
on the canonical province name so one entry speaks to every chapter —
Seleucia-Ctesiphon is Baghdad in 1948 and Memphis is Cairo, and the community is
continuous in a way the label is not. Click the province and you can write to
them. Four things to ask for, in rising order of what it costs them: **letters**
(what a congregation at the centre of an empire hears first), **silver** (the
half-shekel gathered early), **a word with their patrons**, and **their sons**.
Yields scale with the community's size, 1 to 5.

**The windows are load-bearing, not decoration.** Alexandria — a third of a city
of half a million, the largest community in the world — is destroyed in the
Kitos War and ends in 117; a campaign that reaches that year loses the biggest
node on the list, and should. Leontopolis is a temple Vespasian closes in 73.
Babylon and Nehardea go the other way and outlast everything, which is why the
centre of the Jewish world moves east and why a 614 chapter can still write to
them.

**The communities are hostages, and that is the point.** Every one lives inside
somebody else's empire. Every request carries a detection roll, and when it
fails the price lands on **them** — a standing reprisal modifier on their
province, their standing toward you falls, and their ruler's opinion of you
falls with it. Standing itself is not a pool to drain: it recovers toward a
target computed from what kind of crown you are (do you hold the holy places, is
the country expecting a deliverer, is their host at war with you), minus what
you have already asked of them. A crown that empties every community in the
world in one decade finds none of them answering in the next.

**War makes it dangerous, not impossible.** The first draft made a hostile host
a hard block, and it killed the feature in the chapter the sources talk about
most: 66 CE opens with Judaea at war with Rome, so every community from
Alexandria to Rome itself went dark on the first tick. That is also the wrong
history — Adiabene sent men to the revolt while Rome was prosecuting it, and
money moved past hostile customs for four centuries. A war now raises the
standing a community must have before it will take the risk and roughly doubles
the chance the letter is read. The cheapest ask still works; the expensive ones
have to be earned.

`POWERS` for the three ancient Jewish chapters is now empty, and the panel
section hides itself when a chapter declares no off-map power — which is
correct, because there was never anything else in it for them.

## 173. The west gets owners, and the levy is what pays for it

§160 closed with a seam it named out loud: 133 new cells from the Atlantic to
the Volga, every one deliberately WASTE, because "the base owner is what every
bookmark inherits unless its `owners` table overrides, so shipping these as ROM
would hand Rome ninety-odd provinces in every chapter at once. That is not a
cartography change; it is a balance change to eight tuned campaigns, and it
belongs in its own section with its own harness run." This is that section.

**Eight political maps** (`js/data/political_maps.js`), one per bookmark,
covering the same 130 ownable cells, merged UNDER each chapter's own tables —
the registry attaches them (`compendium.js` sets `bookmark.political`, the same
place the event pairing lives, so the bookmarks keep their zero-import
property), and `initGame` reads chapter first, political map second, base atlas
last. A chapter can always overrule a cell, and the base atlas stays WASTE.
Latent cells inherit through `latentParent` exactly as chapter tables do, so
`'Britannia': 'UK'` answers for Londinium in 1948 without naming it.

**Sixty-five new courts**, each with an emblem (`icons.js` FLAGS — Tanit's
sign for Carthage, the Pictish crescent-and-V-rod, the draco, the Dulo tamga,
the Iron Crown, and eighteen real 1948 flags), a constitution (`GOV_OF` — the
Aedui elect a vergobret, Tacitus' Suiones and Gothones obey kings and their
neighbors will not), a temperament (`PERSONALITIES` — the Avars ponderous, the
1948 west at 0.05 aggression because nobody in Paris marches on the Levant), a
faith and tongue, and a general-name pool that is not the hellenic fallback:
twenty-seven new pools in `GENERAL_NAMES`, attested men only, from Maharbal to
Mummolus to Máel Cobo to de Lattre de Tassigny. A dead king in Carthage seats
Hasdrubal, not Nikanor — §143's bug class, closed before it opened.

None of it is scripted. The courts convene under §163, come apart under §163,
elect and crown under §98, and fight their own §144 wars: the reconquest of
Italy is not an event chain, it is a Justinian with a fleet and an Ostrogothic
succession crisis in the same decade, which is roughly what it was.

### The levy is what pays for it

Unchecked, giving Rome its west in 66 CE is **+87% manpower** on the raw rolls
(measured: +98% on manpower dev, +75% on force-limit dev) — in the one chapter
Rome is the antagonist of, describing an army that never existed, because the
Rhine legions were the reason the Rhine stayed put. So a province now carries
the share of itself its owner can actually draw on:

- **1** — every province the eight campaigns were tuned against (no entry in
  any table; `levyOf` returns 1 for every save ever written)
- **0.2** — governed interior: taxed, quiet, its garrison its own
- **0.1** — standing frontier: the men are already spent holding the line

Which band depends on the century: Hispania is a frontier in 167 BCE (two
praetorian armies bleed for it every summer) and an interior in 66 CE (one
legion, mostly roads); the Rhine, the Danube, Britannia and occupied Germany
hold the 0.1 the era they carry legions or occupation statutes. The share is
set at initGame from the era's map and constant for the campaign — conquering
the far west hands any crown exactly what it handed Rome, so the anti-snowball
tuning cannot be farmed sideways.

It reads in five places — manpower pool, force limit, tax, production, and the
administration bill (symmetric, or the far west would be a pure liability) —
plus the two censuses that must weigh the same political world: hegemon
containment (unweighted, the owned west would grow the world denominator by a
third and quietly loosen a tuned lever) and the AI's establishment floor.
Local facts stay physical: supply, sieges, rebel size, peace pricing and
development itself never see the share.

**Measured on the shipped tables** (smoke107 pins the corridor): Rome's 83 new
provinces in 66 CE come to **+16.0% manpower and +14.6% force limit**. The
all-AI harness, run per chapter against a clean-worktree baseline at identical
length: 167 (12y), 40, 132 and 614 come back with **no anomalies**; 66's `AGR
BLEEDING` reproduces on the baseline tree byte-for-flag (pre-existing, not
this section's); 529's `JUD DEAD` is §162's dormant Galilee, dead by design
until the praetorium rising; and 67's long-accepted `SEL DEAD` stands while
its companion flag moved from `ITU BLEEDING` to `HYR BLEEDING` — the same
civil-war chapter flagging a different weary belligerent after 130 new cells
moved every RNG stream, which is the drift class §160's smoke81 note already
described. Two findings DID come out of the harness and were fixed rather
than accepted. Seeding ROM–LUS and ROM–CTB as standing rivalries handed
Lusitania five Spanish provinces per half-century, because Rome's AI rallies
east and never once marched to defend Baetica — Viriathus winning the whole
war instead of a decade of it; the Iberian wars are left to opinion drift,
possible but not destiny (smoke78's "Rome does not sit still" is green again,
30 → 32 over the royal century). And a seated Albania flagged `DEAD` from its
first month — its one cell is sealed, so the court owned nothing the
simulation can count. ALB paints Dyrrhachium and is deliberately not seated:
a sealed country keeps sealed politics, on the same painted-not-seated
pattern as Arabia's 132 rump.

### Three of the eight are corrections, not fills

- **529**: the chapter's own owners table gave Justinian Rome, Sicily and
  Tripolitania in the second year of his reign — the west he holds only in
  histories his reign has not written yet. Belisarius sails in 533. Italy,
  Dalmatia and Provence are Athalaric's (Amalasuintha governing), Carthage and
  the islands are Hilderic's (his deposition next year is the casus belli),
  and the interior Maghreb answers to the Moorish kings the Vandals never
  broke — Masuna's actual title, "king of the Moors and Romans", on his
  actual 508 inscription. Burgundy gets its last five years; the Gepids keep
  Transylvania; the chapter loses about 100 development of Byzantine Italy at
  full levy and the harness stayed clean.
- **614**: Capua was Benevento's, not the exarch's; Liguria, the Pentapolis
  and Sardinia were imperial and are now drawn so; Spania survives at Malaca
  at the 0.1 enclave share; and the Balkans behind Thessalonica are what the
  sources mourn — an Avar ring from Sirmium to the steppe and Sclaveni in the
  cities, with Byzantine Salona, Philippopolis and Cherson holding as 0.1
  enclaves at the end of sea lanes. Africa alone is interior at 0.2, which is
  why Africa is where Heraclius came from.
- **1948**: Dyrrhachium, Phasis and Caucasian Albania were WASTE — "sealed
  borders", conflating shut with ownerless. They are ALB and SOV now, still
  impassable (sealed means sealed), the hatch over a sovereign color reading
  exactly right. The whole west wears its 15-May names — Lutetia is Paris,
  Aquincum is Budapest, Roxolania is Stalingrad — under the same
  metropolis rule as Memphis → Cairo.

Where no state existed, none was invented: the Baleares in 167 (the slingers
hire out to everyone and answer to no one), Gaetulia beyond the limes in 66,
the far Volga forest until the Slavs reach it. Unowned-but-passable stands,
per §160: passage is not possession.

### What the seam dragged out from under the map

- **The border field was five bits.** The country-border shader compared
  `flags >> 3` — 30 owner classes plus WASTE — and mapmodes clamped live tags
  past the thirtieth into one class: the Cherusci and the Chatti would have
  touched with no line between them, silently, in every §173 era (167 seats
  49 courts). The class now rides lookA's ALPHA byte (8 bits, 254 owners,
  255 = WASTE), which was uploaded as a constant 255 and read by nobody.
  One texel fetch the shader was already paying for; no new texture.
- **The Alboran defect stopped being latent.** §160 left `Portus Magnus |
  Malaca` and `Volubilis | Malaca` unsevered — Malaca's stray lobe on the
  Algerian coast — because severing them broke smoke90's thirteen-card royal
  strand, and deferred the fix to "the section that gives the west owners".
  Owned, the lobe would have been Spanish pixels in Africa and a walkable
  false border. Fixed at the source (`Malaca` in `contiguousProvinces`, so
  the raster repair detaches the African fragment) with the severed pair as
  the belt to those braces; the snapshot regenerated; smoke90 re-measured
  green across its seed sample — with the west owned, every AI distance moved
  anyway, and the fragility §160 could not localize did not reproduce.
- **Two pre-existing orphans, seen and left.** 132 CE inherits six Nabataean
  cells (Oboda to Tayma) from the base atlas with NAB unseated — provincia
  Arabia is 26 years old that spring and those cells should be Rome's; and
  529 owns Yathrib and Khaybar to a dormant RSH by design. Both predate this
  section; the first belongs to whoever next opens the 132 chapter.

- **Regression contract**: `smoke107` boots all eight eras and asserts every
  painted cell resolves to a seated court, the coverage floor, the levy
  bands (old cells exactly 1, new cells 0.2/0.1), Rome's 83 and the +16%/+15%
  corridor, all three chapters' corrections, the 1948 names, the >31-court
  class field, the name-pool fallback rule, and Masinissa. `smoke3` pins
  Rome's 169-province ledger row; `smoke29`/`smoke41` pin the sealed borders
  as owned-and-shut; `smoke46` requires emblem art for every seated tag, which
  is now sixty-five more than it was. Two older suites needed their premises
  told about this section rather than their claims changed: `smoke94`'s "529
  names no pool" now resolves through the static per-court pens first (that
  is the catalog's chain, and the chapter still declares nothing), and
  `smoke84`'s forward-play extends its own the-line-survives hand into the
  chapter's final spring — on the new RNG stream a §87 rising held Jerusalem
  the one June the terminal card checks, which made a 63,000-tick assertion
  into a claim about a seed.

## 174. Winning free is not conquest

Reported: win the Maccabean Revolt and the world leagues against you for it.
The chain was mechanical. Every settlement priced its cessions in infamy
(`infamyForDev`, dev/2 per §59's retuning), Hasmonea's victory kept a
heartland of fifteen-odd hill towns, and the sum crossed the coalition
threshold in one stroke — so the courts that had just watched a people throw
off its own yoke read the liberation as a rampage, soured monthly under the
§21 opinion pressure, and `coalitionAgainst` leagued them into "The Coalition
against Judaea" before Simon's brass tablets were up on Mount Zion. The same
arc waited for every rising: the Great Revolt, Bar Kokhba, the Keepers, and
any AI client that won its §61 independence war and took its own hinterland
at the table.

The rule now: **a people that frees itself has conquered nobody.**

- **The freedom marker** (`war.independenceSide`, military.js): 'att', 'def'
  or null — which side of this war fights for its own freedom. `declareWar`
  stamps 'att' whenever the CB is `independence` (the §61 rising declares,
  so the rising is the attacker); the five scripted risings set it by hand in
  their bookmarks — the Maccabean Revolt, the Great Revolt, the Bar Kokhba
  Revolt and the Rising of the Keepers on the attack, 1948's War of
  Independence on the defense (Egypt declares; the new state defends). Plain
  save data; `independenceSideOf(war)` reconstructs old saves from `war.cb`.
- **The land freedom stands on** (`liberatedSoil`, military.js): a province
  of the taker's own faith outside the §133 diaspora — exactly the line the
  authored concessions have always drawn with their `keep` predicates
  ("Judea keeps its hills" was never all of Syria). Both settlement doors
  honor it: `endWarBySword` (the scripted armistices and the sword) and
  `executePeaceDeal` (the one treaty mind, §77) charge no infamy when the
  winning side is the war's freedom side AND the ceded province is that
  soil.
- **The exemption is the homeland, not the war.** Alien land taken in the
  same settlement still prices as conquest — a rising that reaches 75%
  domination and swallows Antioch has left liberation behind, and the §21
  anti-snowball league still answers it. Subjugation, client transfers and
  humiliation keep their prices too (re-yoking a rebel at the table remains
  the overlord's odium, per §59's retuning): only the freed homeland is
  free.
- **Nothing else moved.** The coalition wiring is untouched — the gate was
  always the infamy, and the freed simply no longer carry any for their own
  soil. The 1948 chapter keeps its §100 `mechanics.coalitions: false`
  besides; the marker there guards the opinion-pressure side of the ledger.

- **Regression contract**: `smoke108` — the Maccabean settlement (marker
  present, hills kept, zero infamy, no league — and the control: the same
  hostile courts at infamy 35 still march, proving the gate is the infamy,
  not the wiring); the homeland/alien split to exact arithmetic in one
  authored total settlement; the generic independence CB at the peace table
  (same-faith town free, alien town priced) with the CB auto-stamp; all five
  scripted markers across their bookmarks; and the old-save reconstruction
  shims. One older suite had its premise told about this section rather than
  its claim changed: `smoke8` dictates a fat three-province peace through
  the Great Revolt's plumbing to test PLAIN conquest infamy, so it now
  strips the revolt's freedom marker first — the ordinary war of expansion
  it always meant to model. The eight-era harness was measured against the
  unchanged base on the same seeds and produced the identical anomaly set,
  line for line — the all-AI campaigns do not feel this section, because
  the courts it exempts were never the ones the anomaly flags watch.`node tools/autorun.mjs 8 <chapter>`, before and after, on the four chapters
where Rome is a power:

- **66 CE** — anomaly flags identical.
- **67 BCE** — `ROM: SNOWBALL` *disappears*. Rome starts large, so it stops
  growing 1.6× inside eight years. `ARI: BLEEDING` appears, which is the
  documented brothers'-stalemate class (tools/README.md).
- **40 BCE** — `HER: BLEEDING | ATG: DEBT-SPIRAL` becomes `ATG: BLEEDING`.
- **132 CE** — `JUD: SNOWBALL` appears at two seeds of four.

The last one was worth chasing rather than shrugging at, and the answer is
executable. Re-run 132 CE with the western map in place and **every levy set to
zero** — Rome's income, manpower, force limit and establishment then identical
to the pre-§173 baseline — and the all-AI Return still runs 8→17 provinces at
seed 4242. The swing is not Rome getting stronger. It is that nine more courts
consume the seeded RNG stream differently, and the all-AI Bar Kokhba run sits on
a boundary this project already documents as drifting version to version.

- **Regression contract**: `smoke107` asserts that no chapter leaves passable
  ground ownerless (the three cells 1948 seals deliberately excepted), that
  `west.js` names no eastern province outside the ten Italian and Tripolitanian
  cells the late chapters have to reassign, that the base atlas still ships the
  west as WASTE, that every western court reaches `activeTags` and a real seat
  in `game.tags` rather than painting scenery, that none of them falls back to
  the engine's default twenty-regiment establishment, that `west.js` never sets
  ROM's or BYZ's, that 529 opens with Ravenna Gothic and Carthage Vandal, that
  the levy defaults to 1, is clamped to a share, sits only on Roman or Byzantine
  ground, survives a pre-§173 save, and does not follow a conqueror who takes
  the province off the command that pays for it — plus the three-column
  arithmetic above.

## 175. The panel you cannot read, and the map you cannot see

Two complaints about the same thing, which is that this game had grown faster
than its windows onto itself.

**The realm panel had twenty top-level sections.** Every one of them was correct
to add — estates, institutions, the ages, the sacred offices, the powers beyond
the map, doctrines, crises, technology, reforms — and every one of them made the
panel worse. A player looking for the treasury scrolled past the High
Priesthood to find it. And one row of it was visibly broken: the three buttons
that anoint a High Priest read `Hasid…`, `…eller…`, `…ners'`.

**And the dispersion was invisible.** §172 put twenty communities on the board
from Cyrene to Ecbatana and gave each one a panel block — reachable only by
clicking the exact province it lives in. Twenty cells out of three hundred and
seven, with nothing to tell you which. The largest Jewish population on earth
was a thing you had to already know about.

### The tabs

Six: **Crown, Court, Coin, Host, Faith, World**. Above them and outside all of
them, pinned: the ruler and their skills, the heir, the four numbers you check
every few seconds — provinces·development, stability, treasury, manpower — and
the five levers. Tabs improve a crowded panel by hiding things, which is only an
improvement if what you look at constantly never moves.

Three things about the implementation are load-bearing:

- **The panel is never re-templated.** `refs` is harvested exactly once in
  `build()` and every later update patches those nodes. A tab switch that
  rewrote `innerHTML` — which is how the Chronicle modal does its tabs — would
  detach every ref and the panel would stop updating for the rest of the
  campaign without saying so. A switch flips one attribute.
- **The filter is an attribute, not the `.hidden` class.** Each section already
  toggles `.hidden` from the sim (the Temple falls, a chapter is won, a client
  is annexed). If tabs used the same class the two would fight and sections
  would reappear on the next tick. `#nation-panel[data-tab='court']` hides
  everything whose `data-tab` is not `court`; both resolve to
  `display:none !important`, so whichever says hide wins — which is right in
  every combination.
- **The tab probe is first in the click chain and does not refresh.** That chain
  falls through sixteen `closest()` probes and ends at the war overview, so a
  tab button inside a war row's ancestry would have opened the war screen. And
  a switch changes no game state: the sections it reveals were rewritten by the
  last daily pass like every other section.

**A tab that would be empty does not appear.** Six of the twenty sections are
absent in most chapters — the Powers exist in two of eight, the Chapters only
after a won campaign, the sacred offices only where a Temple stands. Every tab
but Faith is anchored to a section present in every chapter; Faith is allowed to
vanish, because the Temple does not stand in most of these centuries. When the
open tab disappears under the player — Jerusalem falls, or a flag chip swaps the
panel to a foreign court and hides ten sections — the strip falls back rather
than showing a blank panel.

### An icon button and a text button are different shapes

`.np-fac-btn` is a 26px square. Four call sites want exactly that: the estates'
appeasement laurel, the institution's scales, the intrigue coins and flame, the
pretender's star. The fifth put party names in it — *The Temple Priesthood*,
*The Peace Party* — and `.pp-build-btn` underneath supplies
`white-space: nowrap; overflow: hidden` and centres its content, so the label
was clipped at **both** ends. `The Zealots` became `ealo`.

The fix is a separate class and not a width override, because widening the
shared one would reflow the four lists that want the square. Measured in the
browser rather than asserted: the three buttons are 75, 95 and 127px, and
`scrollWidth === clientWidth` on all three.

### The dispersion, as a mapmode

Tenth in the bar. It colours the communities by **how they regard this crown**,
cold slate through to warm gold, with **size** deciding how far off the
parchment each is pushed — so Alexandria at five reads heavier than Corinth at
one even when both are lukewarm, and the ramp lands exactly on full at five
rather than clamping four and five to the same shade. Everything else is pale.

A community whose window has **shut** is hatched rather than forgotten: a
campaign that reaches 117 watches Alexandria, Memphis, Cyrene, Berenice and
Cyprus go out in one war, and the map should carry that. A community inside the
player's own borders is striped — the sim drops it the moment its province
becomes yours, which on the map would otherwise be a cell that quietly stopped
existing.

It reads only the content package and the province's own saved record — no
`ctx.helpers`, no sim call — because two suites build `computeMapmodeColors` a
bare `{ game, DEFINES }` context, and because `standingTarget` is O(provinces)
per call and this runs on every simulated day. There is no new rendering
behaviour: the flags byte is full (three effect bits and a 5-bit owner class,
`31 << 3 | 7 = 255` exactly), so this is fill, stripe and hatch, which is all it
needs.

### Three things that were quietly wrong

- **The Compendium's era page hid seven communities.** It filtered by the
  chapter's opening *instant*, so 167 BCE — which runs to 6 CE — listed the
  thirteen you start with and omitted the seven whose windows open inside it.
  One of them is the House of Onias at Leontopolis, which Onias founds seven
  years in and which the game offers from that year on. **This is what a player
  meant by "Leontopolis is diaspora too": the data was right and the page was
  lying about it.** The window is now one exported predicate in
  `js/data/diaspora.js` that the sim, the map and the Compendium all call — it
  had been written out twice and the copies had already drifted — and the page
  measures a chapter by its horizon *and* its last dated card, because
  `generationHorizon` is where a chapter's undated cards expire and not where
  the chapter ends. The page also prints the province now: *The House of
  Adiabene* is not a place you can find on a map.
- **The province panel contradicted its own rule.** It said "We are at war with
  their empire — no letter reaches them," which is the rule §172 says it
  *removed*, and which the sim does not implement: a war raises the standing an
  ask needs and roughly doubles its risk, and `smoke106` asserts the cheapest
  ask still gets through. In 66 CE — the chapter the feature exists for, which
  opens at war with Rome — every community under Rome told the player the
  feature was switched off while the live buttons sat underneath it.
- **`uitest3` asserted eight mapmode buttons and there were nine.** Stale since
  trade and estates landed, and failing on main. It asserts ten now.

- **Regression contract**: `smoke109` asserts every section belongs to a
  declared tab, every tab owns at least one section, the stylesheet carries a
  filter rule for every tab (without one, that tab hides nothing and the panel
  shows all twenty sections at once), that nothing after `build()` rewrites the
  shell, that the seat buttons no longer wear the icon class while the four
  icon buttons still do, that the era window exists in exactly one place and
  that 167 BCE reaches twenty communities over its span against thirteen on its
  opening date, that the war copy is gone, and that the mapmode is registered
  in `MODE_PARAMS`, is safe on a bare context, separates all five community
  sizes monotonically, and hatches Alexandria in 132 CE but not Babylon.
  `uitest38` measures the rest in a browser, where layout actually happens.

## 176. The half-shekel is weighed, and the east empties

Two fixes to §172's dispersion, reported from play as one complaint — "the
diaspora money thing is too strong" — and one anachronism found while fixing
it. They share a section because they share a root: the communities were
modelled as places, but their silver was minted and their windows in the
modern chapter never closed.

### The silver is weighed, not minted

The silver ask paid a flat 22 talents per point of community size, every 30
months, at 5 influence a letter. Alexandria at size five was 110 talents on a
clock shorter than most wars — against a tax system where one point of tax
development pays one talent a **year**, so one ask of one community out-earned
the annual tax rolls of a mid-sized realm, and a crown that worked the list
could float its whole treasury on the dispersion without holding a province
more. That is backwards twice: it out-earned the game, and it paid the same
for Berenice — five development points of desert port — as for a fifth of the
second city of the world.

So the half-shekel is **gathered out of what the community's city is worth**:
`treasuryPerDev: 0.4` per point of the host province's *current* development,
still scaled by size, on a 60-month clock — a generation's patience, not a
festival's. Alexandria (dev 28, size 5) sends 56 talents where it sent 110;
Babylon (dev 15, size 4) sends 24 where it sent 88; Berenice sends 2, which
is what a size-one congregation in a dev-5 port has to send. With the doubled
cooldown the sustained rate lands at roughly a quarter of what shipped. Two
dynamics come free: a sacked city sends less until it recovers, and 1948
Baghdad — dev 28 under its own name — sends more than ancient Hilla, which is
the right shape for the century in both directions. The rate reads through
`devTotal` at ask time (`yieldOf` takes the province now); the flat
`treasuryPer` is still honoured for any content that declares it, and the
other three asks keep their per-size rates — letters were never the exploit.

### The east empties

The windows §172 called load-bearing had a hole where the twentieth century
should be. Nine eastern entries shipped `until: null` — "still there" — so the
1948 chapter offered the Jews of Salonica five years after the deportations,
and Baghdad as a standing silver farm through the very decades in which the
real community was denaturalised, frozen out of its property, airlifted to
Lod entire, and gone. The chapter that owns the absorption of those arrivals
(§171) was also the chapter most flattered by pretending they had never left.

The closes are data now, each on its own date, exactly as 117 is:

- **Iraq, 1952** — Babylon, Nehardea, Seleucia-Ctesiphon, Arbela. The
  Denaturalisation Law of March 1950 opens a one-year exit; the property
  freeze of March 1951 takes everything not already carried; Ezra and
  Nehemiah fly out some 120,000 people by early 1952. Twenty-five centuries,
  ended in fourteen months of charter flights.
- **Syria, 1950** — Damascus, and Nisibis (Qamishli is on the Jazira's
  Syrian side in this chapter). Halved by flight after the Aleppo pogrom and
  the war, then sealed under an exit ban that runs into the 1990s: hostages
  in the literal sense, not correspondents.
- **Salonica, 1943** — deported to Auschwitz five years before the chapter
  opens. Shut before 1948 begins, which the mapmode shows from the first
  day: hatched, not forgotten, per §175's own rule.
- **Lebanon, 1968** — Tyre. The one Arab republic whose community *grows*
  after 1948, taking in Syrian and Iraqi refugees, until the 1958 crisis
  starts the decline and the aftermath of 1967 finishes it.
- **Iran, 1979** — Susa and Ecbatana. Iran is not Iraq: the community thins
  toward Tehran and Tel Aviv but stands — synagogues open, dues collected —
  until the Revolution, which the chapter's 2005 horizon reaches.

Rome, Antioch, Byzantion and Corinth stay open. Nobody was expelled from Rome
or Istanbul, and a window that closed itself out of tidiness would be the
same lie in the other direction. The timing does honest work inside the
chapter: through the 1948-51 war years the eastern communities are still
present and still answer — which is the history, and is when their sons and
silver mattered — and then they go out on their own clock whatever the player
does, because a community's destruction was never something the player's
paperwork could veto (§172 accepted this for the Kitos War; 1952 is the same
rule). On an old save the next read simply finds the window shut.

**And the chapter plays Israel's end of it.** A fifth card in the absorption
chain, `ev_ab_ezra_and_nehemiah`, dated to the Denaturalisation Law (March
1950), firing for a player Israel while Baghdad is still Iraq's to legislate
for — a conquered or fallen Baghdad passes no law, and the card stays in the
drawer. Two answers, priced like the rest of the chain: fly them out entire
(−80 treasury for the charters, +2,000 reserves, two years of +12% manpower
/ +8% growth with the ma'abarot overflowing at +0.6 unrest; Iraq keeps the
frozen property, +120 talents against a ten-year −8% production drag on a
Baghdad that traded its merchant class for a warehouse receipt), or meter
the airlift to the camps (+6%/+4% quietly — but the registry runs on
Baghdad's deadline, not Israel's: −8 legitimacy, three years of unrest among
the stranded of Baghdad, and −6 standing with every community still on the
board, written straight onto the province records a zero-import package can
reach, because the dispersion hears that the ships were made to wait).

- **Regression contract**: `smoke110` pins the ask data (60-month clock,
  dev-pegged rate, no flat rate left), the arithmetic (Babylon pays
  dev × size × 0.4 exactly, and less than the 88 it used to; Rome and Cyrene,
  both size 3, differ by their cities; ten points of growth raise the
  gathering by four talents a size point), every modern close date and the
  ancient years none of them may disturb, the 1948 chapter's reads (Salonica
  unwritable and hatched from the first day, Baghdad writable in May 1948
  and gone by 1953, Iran standing until 1979, the era page listing Babylon
  but not Salonica), and both answers of the new card — including that it
  will not fire once Baghdad is not Iraq's.

## 177. The chains grow branches, and the ladders own their price

Two of the realm panel's oldest fixtures still wore their v2 dress. The
missions were a flat text list — §102 built real chains with real rewards and
the panel printed them like a shopping receipt — and the Technology block was
three rows of "Advance to 6" with a number you could not see coming. Both
systems had grown honest depth (branching objectives in everything the
chapters ask, the era baseline, the ahead-of-age markup, the §166 surcharge,
the pattern generations) and neither window showed it. EU4 solved both
displays a decade ago: the mission TREE, and the technology screen that
tells you what the level costs, why, and what it unlocks. This section is
that parity pass.

### Two shapes, one table

`bookmark.missions[TAG]` keeps its shape; a mission MAY now declare
`requires: [ids]` (and `col`, `row`, `icon` for the panel). A chain where no
mission declares anything is the old LADDER — each mission implicitly
requires its predecessor, completes strictly in order, and renders as one
column. A chain where any mission does is a TREE: a mission unlocks when
every prerequisite is done, a mission with none is a root, and parallel
branches advance independently — a stalled siege no longer holds the
building program hostage, which is the entire point of drawing these as
trees.

The record moved: `t.missionsDone` is the list of completed ids in table
order, and `t.missionIdx` is maintained as the longest completed PREFIX of
the table — NOT the count. On a ladder that is exactly the old cursor, so
every save and every test that reads or writes it keeps its meaning; and
because the seed rule runs the other way too (the first `missionIdx`
missions are always treated as done), a ladder-era save — or a test that
forces a chain forward by hand — still means what it always meant. The
monthly pass keeps its three-step guard, but as three completion WAVES
judged against each wave's opening state: parallel branches may land in the
same wave, a cascade straight to the capstone stays impossible, and the AI
earns its branches on the same terms as the player (§102's symmetry,
untouched).

**The retrofit rule for the shipped chains: never stricter.** Every branched
mission's `requires` is a subset of its old ladder predecessors, so any
state a campaign could reach before, it can still reach — the branches only
loosen. Twelve chains branched (both sides of 167, 132, 67, 40, 529, 614,
1948, and Israel's 1948 fan-out south/north/road); Rome's 66 CE chain
stayed a ladder ON PURPOSE, because Vespasian's method WAS a sequence —
coast, Galilee, the ring, the city, the desert forts — and a tree would be
a lie about it. The formables' chains stay ladders too and render fine as
single columns.

### The tree on the panel

Missions moved out of Crown into their own tab (the §175 gating applies: the
tab steps aside at a foreign court, after the verdict, and in a chapter
whose tag has no chain). The renderer is one CSS grid of medallions —
`icon` in a parchment roundel, name under it, a green check on the
accomplished, gold ring on the workable, dusk on the locked — with the
connectors drawn by an SVG stretched over the grid whose viewBox is in GRID
UNITS (one cell = 1×1, `preserveAspectRatio="none"`), so a line lands
wherever its cells do without measuring a single pixel;
`vector-effect: non-scaling-stroke` keeps the strokes from smearing under
the non-uniform scale, and the rows are fixed-height for exactly this
reason. `getMissions` hands the panel finished layout — declared columns
clamped to EU4's five, rows derived one below the deepest parent — and
resolves `requires` to names so a locked tooltip can say what comes first.

### The ladders own their price

`techInfo` now carries what the EU4 dress needs, all of it computed from
the tables that own the formulas rather than re-invented in the panel: the
points on hand and the monthly gain (the tick's own arithmetic — base 2,
ruler skill, advisor capped at 3 and silent while the treasury is ruined,
the §86 rivalry drill for martial), the months to affordability, what each
ladder ALREADY pays (from `computeTechEffects`, so the panel can never
drift from the sim), and the military ladder's milestones — every pattern
generation with the doctrine it learns and a `beyond` flag where the §99
ceiling puts it past every century of the chapter.

The Coin tab wears it accordingly: the §166 surcharge as a red banner
across the top (EU4's institutions penalty bar), then one card per ladder —
level badge, era chip that goes red-on-red when racing history, the
already-paying line, a progress bar filling toward the price with the ETA
in its tooltip, the same buy button on the same `data-tech` click path —
and under Military the milestone strip, lit/waiting/struck-through. And
since the Coin tab claims to be "the purse and the ledger", it finally
carries the ledger: `explainIncome`'s labeled lines (taxes, production,
trade, tribute, maintenance, interest, the §145 court consumption), the
same rows the topbar tooltip reads, as a table with the monthly balance
ruled off at the bottom. Foreign courts keep the old modest read — levels,
pattern, no buttons, no purse.

- **Regression contract**: `smoke111` pins the tree view (six 66 CE nodes,
  root-only start, cols `1,0,1,2,1,0`, rows derived one below the deepest
  parent, requires resolved to ids and names), branch independence (the
  Parthian mission completes while Samaria waits, `missionIdx` stays at the
  done prefix and `missionsDone` keeps table order), the ladder contract
  (Rome's chain is no tree; a forced `missionIdx` seeds the first N done
  with exactly the next rung workable), the save round-trip (done lists
  ride saves; a ladder-era save with only the cursor seeds correctly), and
  the dressed `techInfo` (have/gain/eta on every row, the surcharge at top
  level, five milestones with JUD's mar-5 reaching exactly the level-4
  pattern, beyond-flags respecting the ceiling, the gain matching the
  tick). `uitest2` counts the six medallions on the tree; `uitest8` and
  `uitest37` hold the Coin tab's buy path to one press, unchanged.

## 178. The world is not beyond the map

§55 built "The Powers Beyond the Map": standing bars in a panel section, an
envoy button, asks. §172 already pulled one row out of it — the Diaspora —
for the reason in its own title: it was not beyond the map. This section
retires the panel entirely, because by §173 that argument had quietly
consumed the rest of the roster. When the west got owners, France and
Czechoslovakia became seated courts **while their power-bars kept running**
— `ensurePowers` seeds a standing for every living tag, so France held a
standing with France. The USSR bar shadowed the seated SOV; the 614
khaganates shadowed the seated AVR and TRK. Of everything the system ever
declared, all but two were on the board already, one (the UN) was never a
country, and exactly one — the United States — was genuinely beyond the
frame.

A parallel diplomacy is not a free oddity; it is a tax on every future
verb. Standing (0–100) ran beside opinion (−200..+200), courting beside
`improveRelations`, pacts beside alliances, power trade beside trade
agreements and embargoes — and the copy was always the poorer one, because
the real ledger of verbs kept growing (§96 recognition, §100 embargoes,
§163 courts, §164 intrigue, §165 standing) and the power panel got none of
it. You could subvert a party in Paris but not in Washington, embargo
London but not be embargoed by it, watch Prague's court convulse but not
the one court whose elections mattered most to the age.

**So the United States is a court now — an off-map seat.** `offmap: true`
on its TAGS entry; seated by 1948's `activeTags`; owns no cell and never
will. What an off-map seat is, in five rules:

- **Alive without land.** `updateTagLife` exempts it the way it exempts
  REB. A seat cannot fall, which is what "beyond the map" actually meant.
- **Beyond every army.** `declareWar` refuses a war with an off-map seat
  from either chair. The AI could never reach one anyway — its wars of
  opportunity walk province adjacency — so the bar is for scripts and
  players, and it closes the loophole rather than trusting the geometry.
- **No alliances.** An ally who can never march is a lie in the ledger.
  The offer is refused with its own reason, like the bookmark's bloc bars.
- **A real court.** `courtSeats` waives its two-province floor for seats,
  so Washington convenes the same §163 parties as everyone else — and
  §164's reach rule already lets agents work any court at the top table,
  so Truman's Senate can be patronized like a Seleucid one. The seat is
  opened the way every court is opened: **from the ledger**, clicking the
  flag chip. That chip row is the whole replacement UI for the old panel.
- **An economy in one number.** The def carries `offmap: { dev, income }`;
  `incomeBreakdown` returns the stipend as its own line, so the ledger,
  the §165 standing table and the treasury tick all see the same money —
  the United States outweighs every court of the age, which is the plain
  1948 fact the old system modeled as a 0–100 bar. The treasury is capped
  (a court that never spends should not compound forever), manpower and
  force limit stay at zero (the seat sends no sons to this map), and the
  §59 containment census skips off-map weight in both its numerators and
  denominators — a tuned lever must not loosen because Washington exists.

Everything else is the ordinary machinery, deliberately: envoys and gifts
move its opinion, §100 lets it close its markets (the Neutrality Act IS an
embargo, and the AI can sign one), §96 recognition replaces the old
"press for full recognition" ask, subsidies replace "ask for credits" in
the one direction money actually flowed, and §179 replaces the arms asks —
which were the entire reason the powers existed.

**The migration.** `js/sim/powers.js` and `js/data/powers.js` are deleted;
the panel section, its `uiTerms.powers` titles, the wiki block, the
`powerIn` ledger row and the tick pass go with them. Pre-§178 saves carry
`game.powers` and possibly mounted `power_pact_*` / `power_*` modifiers
whose removal path died with the system: `reviveGame` drops the book and
strips those modifiers, and `makeCtx` seats any off-map tag the bookmark
declares that the save predates — so a 1947-vintage save loads into a
world that has a Washington, exactly as §55's own backfill once ran the
other way. The 614 khaganate asks (a wartime host for gold, tribute for
the rear) fold into the verbs the seated TRK and AVR already answer:
alliance and the call to arms, gifts and subsidies.

- **Regression contract**: `smoke112` — the USA is seated, alive, landless
  and top-table in 1948; it survives `updateTagLife`; war and alliance are
  refused with reasons; its court convenes and answers intrigue; the
  ledger row and stipend agree with `incomeBreakdown`; a pre-§178 save
  revives with the seat present, the book gone and the pact modifiers
  stripped; and the ancient chapters seat nothing off-map. `smoke34` and
  `smoke36` (the §55/§57 contracts) become tombstones asserting the old
  machinery is really gone; `smoke106` keeps its §172 claims without the
  deleted import. The balance harness needed one premise told: a seat's
  zero manpower is its design, not a famine, so `autorun` skips off-map
  tags in the anomaly flags — with that, 1948 comes back **none**, and the
  full sweep matches the accepted families except 132's long-accepted JUD
  flag reading SNOWBALL, which reproduces on the clean pre-§178 tree at
  the harness seed (the §160 drift class again, not this section's).

## 179. The arsenal is somebody else's

§154 priced an air force at what it displaces. This section prices it at
what it was in 1948: **an import**. The 101 Squadron flew Avia S-199s out
of crates from Žatec; the Legion's guns and officers were British; Egypt's
Spitfires were British; and the pattern of every armored battalion in the
theater was decided in somebody else's capital. Nothing on this map from
Cairo to Damascus to Tel Aviv could roll a tank or a fighter out of its own
works — and the game let every one of them do it for talents, as if the
Negev had a Renault works the sources forgot.

**The arms market** (`bookmark.armsMarket`, declared by 1948 alone). The
bookmark names its **arsenals** — USA, SOV, UK, FRA, CZE, the states whose
works actually exported in this period. Everyone else is a **client**: to
raise the gated arms — air wings, and armor (below) — a client needs a
standing **weapons transfer agreement** with an arsenal.

- **One supplier at a time.** The pattern an army is built on is one
  country's — spares, calibers, doctrine and the men who teach it. Signing
  with a second drops the first, and the first notices (−10 opinion).
- **Signed in the supplier's court.** The agreement rides the supplier's
  own panel (open it from the ledger, §178), and the bar is the
  **supplier's regard for you** — you are asking to be sold to, so it is
  their opinion of you (≥ 50) that opens the door, not yours of them. The
  signing fee lands in the supplier's treasury: the money is real and it
  moves.
- **It lives only while the friendship does.** The pipeline dies — with a
  notice — when the supplier's regard drops below the floor (25), when war
  comes between the two courts, when the supplier is gone, or when the
  supplier signs a §100 embargo: an embargo IS the cutoff, which is what
  1967 was — de Gaulle did not march on anybody, he signed something. But a
  standing deal also **anchors** the supplier's monthly drift at 40 (§57's
  pact floor, reborn): purchasing missions and spares contracts keep a door
  from swinging shut by pure neglect, so a pipeline dies the loud ways —
  war, embargo, a scripted rupture striking below the floor in one blow —
  and not because two AI courts forgot each other. Without the anchor,
  ordinary drift toward zero cut every treaty-system deal inside four
  years and the region quietly disarmed itself before its own wars.
- **The opening book is the treaty system of May '48.** Egypt, Transjordan
  and Iraq under Britain (the Anglo-Egyptian, Anglo-Jordanian and
  Anglo-Iraqi treaties — the Legion had British officers ON the board
  already); Syria and Lebanon under France; Turkey and Greece under the
  Truman doctrine; Iran under Britain. **Israel under nobody** — the state
  opens inside the §58 `arms_embargo` modifier with the market shut, which
  was always the historical opening position and is now a mechanical one.
  The script bootstraps the rest: the First Truce card signs ISR→CZE in
  both of its answers (the Messerschmitts landed regardless of what the
  cabinet thought of Bernadotte's count), and the 1955 arms-race card
  signs EGY→SOV, the deal that actually ended the era.
- **The AI plays it.** A clientless AI court signs monthly with the
  friendliest arsenal that will have it, paying the same fee at the same
  bar; arsenal AI is passive — a market, not a policy — and its §100
  embargo AI is the policy. The gate sits in `recruitRegiment` and
  `raiseAirWing` themselves, so the AI cannot build around it any more
  than the player can.

**Armor is an arm now, not a costume.** The §29 pattern table already
calls generation-5 cavalry "Armored Corps" — and then hands it identical
battle math at 25 talents, so the 1948 chapter's tanks were rifle brigades
in a different font. Now: mounted regiments at pattern 5+ are **armor**.
In the **shock phase** the side with the armor advantage adds
`ceil(net / 2)` pips, capped at 3 — §154's signed-quantity design brought
down to the ground, fire belonging to the sky and shock to the tanks, and
one Sherman platoon against nothing being worth the pip cover always was.
An armored regiment prices at 50 and four months (an `ARMOR` defines
block, every threshold tunable). Every earlier chapter has a tech ceiling
of 13 or lower — pattern 3 at best — so no cataphract, no dragoon and no
seed of the seven tuned campaigns can see any of this arithmetic.

The recruit buttons carry the gate and say why when it is shut ("no arms
supplier — win an arsenal court's favor first"); the Host tab names your
supplier and its temperature; the supplier's court panel carries the
agreement chip with the full terms in the tooltip.

- **Regression contract**: `smoke113` — the market gates wings and armor
  for clients and not for arsenals; the starting book matches the treaty
  system; signing pays the supplier and switching costs the old one;
  regard, war and embargo each kill a live pipeline with notice; the AI
  signs its own deals and builds only behind them; armor pips scale, cap,
  and appear only in shock; the armor price and months read from DEFINES;
  and a pre-§179 save loads with the book intact and every antique
  chapter's cavalry untouched.

## 180. The textile factory

The chapter's script mentions it exactly once. `ev_i_eshkol`, June 1963,
in a subordinate clause: "in the south something unphotographed hums at
Dimona." This section is that hum as an arc and a fork, because it is the
largest single decision the state made in the whole period and the game
had no card for it — while the province itself has sat on the map since
§141, opening **Egyptian**, in the deep Negev the state must first win.

Five cards, one fork. The arc is gated the way the thing was actually
gated: on Paris, and on money, and on the desert being yours.

1. **`ev_i_dimona_offer`** (October 1957 — the Sèvres debt, a year old).
   Fires only if Israel owns Dimona and the French pipeline is warm (FRA
   is the supplier, or her regard ≥ 55). Break ground — 150 talents, 20
   influence, and **The Program**, a standing modifier that quietly eats
   5% of everything until the arc resolves — or decline, and the card
   does not come back: a state that passes on 1957's terms is a different
   state, and the fork records it by never opening.
2. **`ev_i_dimona_cover`** (December 1960 — the U-2 frame, the State
   Department's question). The answer on the record: **"It is a textile
   factory"** — the cover holds, Washington's regard −15, and the flag
   remembers the sentence — or Ben-Gurion's Knesset formula, "for
   peaceful purposes," which admits the reactor and costs less regard,
   because a half-truth spoken in parliament is a different instrument
   than a tarpaulin.
3. **`ev_i_dimona_visits`** (May 1963 — Kennedy's letters, every one of
   them polite). Curated Saturdays for American scientists (+15 regard,
   the tour shows what the schedule permits) or refusal (−20, and the
   letters get shorter).
4. **`ev_i_dimona_ready`** (triggered, 1966 or later). **The Basement.**
   Three roads out, and the fork `the_basement` records which was taken:
   - *"We will not be the first to introduce them"* — *nuclear_opacity*:
     a permanent deterrent (1), and the modifier on the ledger is named
     **The Textile Factory**, because by 1966 the joke WAS the policy.
   - *The open test* — *the_open_test*: deterrent (2), and the world
     recoils — every arsenal court's regard −40, aggression +20, and
     whatever pipeline feeds you will probably die of the opinion floor
     it just fell through. Stronger, and priced like it.
   - *Seal the basement* — *the_sealed_basement*: the scientists disperse
     to the universities (+20 governance and influence points), no
     deterrent, The Program ends. All three roads end the 5% drain.
5. **`ev_i_dimona_vanunu`** (October 1986, opacity only). The technician
   talks to the Sunday Times; ambiguity survives its own photograph. One
   answer; the world's regard dips; the deterrent does not.

**What a deterrent is.** `resolveTagAdd(ctx, tag, 'deterrent')`, read in
exactly one place: the `needed` ratio in `aiConsiderWar`, beside §165
deference — a hostile court wants ×(1 + 0.6·deterrent) more edge before an
opportunistic war on a state whose desert hums. Scripted wars ignore it:
Yom Kippur fires on its date whatever sits in the basement, which is the
period's own bitter finding about what the basement bought and what it
did not.

- **Regression contract**: `smoke114` — the offer gates on Dimona's owner
  and the French pipeline and prices the ground-breaking; The Program
  drains until resolution and not after; each road sets its marker, its
  deterrent and its bill; the deterrent multiplies the AI's needed ratio
  and leaves scripted declarations alone; Vanunu fires only under
  opacity; and the fork registry knows all three roads.
