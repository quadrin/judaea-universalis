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
    // each: {name, color:[r,g,b], moveCost:1..2.5, defBonus:0|1|2 (dice), attrition:0..5,
    //         impassable?:true (wasteland only)}
  },
  GOODS: { grain, wine, olive_oil, dates, balsam, incense, purple_dye, glass, papyrus,
           silver, salt, spices, timber, fish, livestock },
    // each: {name, price (ducat-like "talents" per unit), color:[r,g,b]}
  RELIGIONS: { judaism, samaritanism, hellenism, roman_cult, nabataean, zoroastrianism, egyptian },
    // each: {name, color, group}   groups: 'judaic' | 'pagan' | 'iranic'
    // judaism.name = 'Second Temple Judaism'
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
  provinces: [ ...see schema... ],      // id = index+1; TARGET 92-100 entries, HARD CAP 110
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
  holy:'temple_mount'|null, wonder:'temple'|null, impassable:false }
```

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
- **Wasteland (WASTE, impassable):** Syrian Desert, Arabian Desert, Sinai Interior, Eastern Desert, Libyan Desert. Big weights (1.6-2.2).

Dev guidance: metropolis 8-12 total-ish per component listed above; ordinary 3-5/3-5/2-4;
desert towns 1-2. Unlisted attribute = your best historical judgment. You may ADD up to ~8
filler provinces for map coverage (e.g. Upper Galilee interior, Auranitis, Cilicia Trachea)
— but never rename canonical ones.

## 5. Renderer package — `js/map/*` (one agent)

### 5.1 `renderer.js` — `export async function initRenderer(canvas, MAP_DATA, DEFINES)`

Returns:
```js
{ idArray,            // Uint8Array(MAP_W*MAP_H), province id per pixel, 0=sea, row 0 = north
  provIdAt(mapX, mapY),          // clamped nearest-pixel lookup into idArray
  setProvinceColors(primary, secondary, flags),
      // Uint8Array((N+1)*4) RGBA ×2  +  Uint8Array(N+1) bitfield:
      // bit0 = diagonal stripes of `secondary` over primary (occupation)
      // bit1 = gray cross-hatch (impassable wasteland)
  setMapmodeParams({relief=1, flat=0}),   // relief: terrain shading strength 0..1
  setSelected(provId),                    // 0 = none; animated highlight
  render(camera, timeMs),
  resize() }
```

WebGL2, single fullscreen-quad main pass each frame + one-time generation passes:

1. **Land mask** (CPU, offscreen 2D canvas at MAP_W×MAP_H): fill `coast.land` polygons white,
   punch `coast.lakes` black → texture (LINEAR, mipmaps ON — mips reused for sea depth &
   coast falloff). Also a **decor canvas**: rivers as stroked polylines (alpha), → texture.
2. **Province-ID pass** (FBO, RGBA8, MAP_W×MAP_H, NEAREST): fragment shader loops seeds
   (uniform `vec4 uSeeds[128]` = x,y,weight,unused + `uSeedCount`), warped weighted nearest:
   `d = length(px + warp(px)*18.0 - seed.xy) / seed.z` where `warp` = 2-octave value-noise
   fbm pair (same warp for all seeds — organic borders). Land-mask < 0.5 → id 0. Encode id
   in R channel (id/255). Then `readPixels` → build `idArray` (handle GL y-flip: idArray row
   0 must be NORTH).
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
  firedEvents: {}, flags: {}, rngSeed,
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
−10. At `revoltFireAt`: spawn rebels — **judaism-religion province → army for JUD** (if JUD
alive & at war with owner; else REB) sized `dev.mp·rebelSizePerDev` regiments; province
controller flips to spawner ONLY if no garrison. Emit `'notify'`.

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

## 7. `js/core/bus.js` (done) — events catalog

`day {date}`, `month {date}`, `mapclick {mapX,mapY,sx,sy,provId,armyId}`, `maprightclick
{...same minus armyId}`, `select provId|0`, `selectArmy armyId|null`, `mapmode str`,
`notify {title,text,type,provName?}`, `event {instanceId,event,forTag}`, `eventResolved`,
`battleStart/battleEnd {prov, winnerTag?}`, `siegeStart/siegeEnd {provId, by}`,
`provinceOwner {provId,from,to}`, `provinceController {provId,from,to}`, `war {...}`,
`speed n`, `pause bool`, `gameover {result,title,text,score}`.

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
  loaded game never re-runs setup.
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
    their own `ui` state and `playerTag`, then emit `day`/`month` locally so every panel
    refreshes. Guest actions are proxied: reads (`get*/explain*/can*/evaluate*`) run
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
