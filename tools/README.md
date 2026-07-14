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
arc), JUD dies in 132 CE (history), ROM snowballs in 67/40 BCE (scripted
annexations) and bleeds in 40 BCE while it does (fresh conquests sit at
high autonomy and pay almost nothing — victorious overstretch), HAS/HER/ATG
bleed while their fight-to-the-death scripted wars run (plunder-funded
underdogs), HYR/ARI (the brothers' stalemate, 67 BCE) run mildly negative
until debt-desertion rebalances them — self-limiting, no spiral, and only
Pompey's arrival truly settles that war. ARM hovers a hair below
break-even (poor mountain kingdom).

The far eras: in 115 CE the all-AI diaspora rising is never crushed (JUD
SNOWBALL) — with Rome's field army locked against Parthia, the AI cannot
play Turbo's part; a human ROM ends it easily, a human JUD achieves
exactly this. In 614 CE longer runs show JUD SNOWBALL — the scripted
Return (Jerusalem by event, Persian-backed gains) holding a small state.
1948 runs clean: the coalition invades, the truces bite, and the Rhodes
armistice freezes the lines on schedule.

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
trims it. Bar Kokhba still dies on schedule (132 CE JUD DEAD) — the
Drill doctrine exists precisely so that arc holds.

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
