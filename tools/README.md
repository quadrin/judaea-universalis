# tools/

Developer tooling. Plain Node, zero dependencies — none of this ships to the
browser.

## autorun.mjs — the balance harness

    node tools/autorun.mjs [years] [bookmarkId]

Runs every bookmark (or one) with EVERY nation on AI for N game years
(default 8) against the real map adjacency, then prints each nation's
trajectory (provinces, dev, income, treasury, troops, manpower, reforms)
and anomaly flags:

- SNOWBALL     provinces grew >=1.6x AND by >=4 (often scripted: Pompey, Gindarus)
- DEBT-SPIRAL  treasury below -200 at the end
- BLEEDING     negative net income at mid-run AND end
- EXHAUSTED    manpower zero with almost no army
- DEAD         eliminated

Accepted flags (by design, do not "fix"): SEL dies in 67 BCE (Pompey's
arc), ROM snowballs in 67/40 BCE (scripted annexations), and HAS/HER/ATG
bleed while their fight-to-the-death scripted wars run (plunder-funded
underdogs), HYR/ARI (the brothers' stalemate, 67 BCE) run mildly negative
until debt-desertion rebalances them — self-limiting, no spiral, and only
Pompey's arrival truly settles that war. ARM hovers a hair below
break-even (poor mountain kingdom).

The far eras: in 115 CE the all-AI diaspora rising is never crushed (JUD
SNOWBALL) — even with scattered-command penalties and larger Roman relief
columns, Rome's field army is locked against Parthia and the AI cannot play
Turbo's reduction; a human ROM can, while a human JUD is trying to achieve
exactly this. In 132 CE the prepared opening now lets the all-AI Return survive
past its campaign horizon, although a long post-campaign run leaves it bleeding
and in debt after the hidden armories expire; the playable campaign has already
resolved by then. In 614 CE the Persian-backed Return runs clean through the
eight-year window. 1948 runs clean: the coalition invades, the truces bite,
Rhodes freezes the fighting, and the postwar guarantee/rearmament system builds
the regional establishments instead of leaving rich states demobilized.

Since v2.4 (development growth) the small-token realms breathe a little
differently: PAR's two-province western outpost in 167 BCE hovers a hair
below break-even (accepted, same class as ARM), and ROM-in-40-BCE dropped
OFF the bleeding list — growing towns pay for the armies that once
bankrupted them. ARI/HYR (67 BCE) drift on and off the BLEEDING line from
version to version as sim tuning shifts (the runs themselves are seeded);
either brother is the documented stalemate case. Since v2.9 (doctrines)
two more self-limiting bleeds sit in the accepted set: ATG in 40 BCE
(the fight-to-the-death class above) and JUD in 66 CE — the all-AI
Great Revolt now ends negotiated with Judaea intact but keeping its
wartime host, which costs a hair more than peace pays; debt-desertion
trims it. The Drill doctrine still gives the Severus phase its
historical Roman edge. Since v3.1 the 167 Terms-from-Antioch end is an
event card (auto-accepted by aiOption in harness runs) that keeps only
the provinces of the faith — an all-AI HAS no longer inherits occupied
Syria. Since v3.4 (the deepened 40 BCE chain) Sosius arrives with two
real legions and Herod's coast pays customs, so HER sits off the
bleeding list while ROM drifts on and off the SNOWBALL/BLEEDING lines
with the seeded chaos (the v2.4 victorious-overstretch class); ATG
BLEEDING remains the accepted 40bce constant. Court factions (SPEC §34)
are player-only and leave every all-AI trajectory untouched. Since v3.5
(the provincial-response rebalance: Rome's first answer to Bar Kokhba is
provincial and passive for a year) the all-AI 132 CE war ends negotiated
with a rump Judaea in debt rather than JUD DEAD — the 66 CE class:
self-limiting, debt-desertion zeroes its host, and a human ROM still
crushes the revolt easily. PAR-in-167 also dropped off the bleeding
line (the merchant marine pays for its outpost). The accepted set as of
v3.7: 167 HAS BLEEDING · 67 ROM SNOWBALL + SEL DEAD + HYR BLEEDING ·
40 ATG BLEEDING · 66 JUD BLEEDING · 115 JUD SNOWBALL · 132 JUD
DEBT-SPIRAL,BLEEDING · 614 none · 1948 none.

Since v5.3 (scaling administration, pattern-priced upkeep, fuel): the
occupied-land admin exemption and the 40 BCE `adminMult` credits leave the
set a strict subset of the v5.0 baseline. Accepted as of v5.3:
167 PAR BLEEDING (the two-province outpost drifted back on with v5.0's
wider map) · 67 ROM SNOWBALL + SEL DEAD (both brothers sit OFF the
bleeding line — occupied land no longer bills their clerks) · 40 none ·
66 none · 132 JUD BLEEDING · 614 JUD SNOWBALL (the all-AI Return has
ridden the Persian tide since v5.0) · 1948 none.

Since v5.4 (the frame grows to Rome and the Caspian; ROM + PNT enter 167,
ITA enters 1948): 167 Rome banks quietly in Italy and starts no wars —
no new 167 flag. 67's ROM SNOWBALL retires arithmetically (with the
Roman west on the map, Pompey's annexations no longer clear the 1.6×
ratio). 132's rump Judaea returns to its long-documented
DEBT-SPIRAL,BLEEDING class (seeded drift, self-limiting). 614's Return
adds a post-subsidy BLEEDING to its accepted SNOWBALL — treasury still
rises throughout (plunder-funded, the 66/132 class); the supply trains
carry adminMult 0.5 while they run. Accepted as of v5.4:
167 PAR BLEEDING · 67 SEL DEAD + ARI (or HYR) BLEEDING · 40 none ·
66 none · 132 JUD DEBT-SPIRAL,BLEEDING · 614 JUD SNOWBALL,BLEEDING ·
1948 none.

## geom-snapshot.json

Real map geometry (adjacency, centroids, coastal flags, offshore anchors)
dumped from the browser's WebGL province raster so headless tools get true
pathing. The snapshot is FULL-RESOLUTION: dump it from the 1948 bookmark,
where every latent cell is active, so it carries every permanent cell's own
geometry. Headless consumers fold it per bookmark through
buildProvinceMapping (autorun's foldGeom) — the same collapse computeGeometry
performs from the live raster. REGENERATE whenever js/data/map_data.js
changes: serve the repo, boot the 1948 bookmark in a browser with
window._ctx, and save the value of

    JSON.stringify({
      neighbors: _ctx.geom.neighbors.map(s => [...s]),
      centroids: _ctx.geom.centroids.map(c => c ? [c.x, c.y] : null),
      coastal: _ctx.geom.coastal.map(b => b ? 1 : 0),
      offshore: _ctx.geom.offshore.map(c => c ? [c.x, c.y] : null),
      areas: [..._ctx.geom.areas],
    })

to this file (a Playwright script that does exactly this lives in the dev
scratchpad; any browser console works too).

## tests/

The full verification battery, in-repo (SPEC §33). `smoke*.mjs` are
headless sim suites (no browser): `sh tools/tests/run-smoke.sh`.
`uitest*.mjs` are Playwright suites and need (1) the game served at
http://127.0.0.1:8613 and (2) `JU_PW_DIR` pointing at a directory whose
node_modules contains playwright. Chromium defaults to `/opt/pw-browsers/chromium`;
set `JU_CHROMIUM` to another executable when needed:
`JU_PW_DIR=... JU_CHROMIUM=... sh tools/tests/run-ui.sh`. Screenshots land in `JU_OUT`
(default /tmp). Every feature batch since v1.5 keeps its assertions here —
21 headless suites and 20 browser suites at v3.6. Run both runners plus
`node tools/autorun.mjs 8` before shipping; `smoke20.mjs` owns the background-
history/state-aware-conquest contract; `smoke21.mjs` owns demobilization,
peace-aware war chapters, era-gated works, and merchant-shipping economics.

## UI battery state (v5.4 audit)

v5.4 ran the full browser battery and repaired the stale suites it could
attribute: uitest2 and uitest5's carousel (eight→seven cards, stale since
v5.1 retired Kitos), uitest11 (Tel Aviv 30→25 dev, stale since the v4.1
subdivision), uitest13 (GRC had shipped without flag art since v5.0; GRC,
PNT and ITA emblems added). uitest3, 8, 10, 16, 17, 19, 20 and uitest5's
multiplayer section fail identically on the pre-v5.3 tree in this
environment (modal-timing/lobby timeouts under software GL) — pre-existing,
not regressions; they need their own pass.
