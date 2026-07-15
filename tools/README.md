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
trims it. The Drill doctrine still gives the Severus phase its historical
Roman edge. Since v3.1 the 167 Terms-from-Antioch end is an event card
(auto-accepted by aiOption in harness runs) that keeps only the provinces of
the faith — the anomaly set is unchanged, but an all-AI HAS no longer inherits
occupied Syria.

## geom-snapshot.json

Real map geometry (adjacency, centroids, coastal flags, offshore anchors)
dumped from the browser's WebGL province raster so headless tools get true
pathing. REGENERATE whenever js/data/map_data.js changes: serve the repo,
boot any bookmark in a browser with window._ctx, and save the value of

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
20 headless suites and 19 browser suites at v3.5. Run both runners plus
`node tools/autorun.mjs 8` before shipping; `smoke20.mjs` owns the background-
history/state-aware-conquest contract.
