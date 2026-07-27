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

The SPEC §95–97 batch (the pen's second half, recognition instead of
alliance, and the region's own arcs) re-ran the full 8-year harness against
the pre-batch tree in the same environment: the anomaly set came back
IDENTICAL except for 614's GHA, which drifted back onto the come-and-go
bleeding line documented at v5.9 (treasury still rising, 50→139 over the
run — the ARM/PAR hovering class). Nothing in the batch reaches an all-AI
trajectory by design: the new cards are world events on the 1963–2000 clock,
well past an eight-year run from 1948; recognition is opt-in per bookmark and
never signed by an AI on its own initiative; and the tightened Jewish pen
moves labels, not ledgers. Accepted as of §97:
167 PAR BLEEDING · 67 ROM SNOWBALL + SEL DEAD · 40 none · 66 none ·
132 JUD BLEEDING · 614 GHA BLEEDING (comes and goes) · 1948 none.

The SPEC §98–§102 batch (crises, the era's tech ceiling, embargo and
blockade, the hoard ceiling, formable payoffs) re-ran the harness after
regenerating the snapshot for the redrawn Egyptian Eastern Desert. The set
stays inside the accepted families, with two notes: 132's all-AI Bar Kokhba
rising comes back SNOWBALL rather than DEBT-SPIRAL (the same "the AI cannot
play Turbo's reduction" class documented for 115 CE, and self-limiting), and
the ancient sets drift by a flag or two because the crisis clock perturbs the
seeded stream — a four-seed sample of 66 CE and 132 CE showed no deaths and no
snowballs at all. Accepted as of §102: 167 PAR BLEEDING · 67 ROM SNOWBALL +
SEL DEAD · 40 HER (and/or ATG) BLEEDING · 66 JUD (and/or PAR/AGR) BLEEDING ·
132 JUD SNOWBALL or DEBT-SPIRAL,BLEEDING · 614 none · 1948 none.

The 1948 line is worth its own sentence: the embargo AI is deliberately
narrow (opinion ≤ −80, at most two letters per court, never against a state it
is already at war with, lifted when relations warm). An earlier, looser tuning
had every capital embargoing every other, every state pinned at the Closed
Sea's third stage, and the whole bookmark bleeding — the flags came back
`1948 EGY BLEEDING · SYR BLEEDING`. If that pair reappears, look at the
embargo book first (`game.embargoes`), not at the armies.

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

to this file. `tools/tests/dump-geometry.mjs` performs that Playwright boot,
writes the snapshot, prints Sinai's measured bounds/neighbors, and leaves a
Sinai screenshot in `/tmp`; any browser console works too.

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

Since v5.8 (verdicts no longer force-peace the verdict-holder's wars):
harness campaigns fight past their verdicts until the ordinary AI
settlement closes them, so the 40 BCE death-war underdogs return to the
bleeding line and 614's Return trades its snowball for the same
self-limiting bleed. All within the long-documented accepted families.
Accepted as of v5.8: 167 PAR BLEEDING · 67 SEL DEAD + ARI (or HYR)
BLEEDING · 40 HER and/or ATG BLEEDING · 66 none · 132 JUD
DEBT-SPIRAL,BLEEDING · 614 JUD BLEEDING (SNOWBALL comes and goes) ·
1948 none.

Since v5.9 (pre-existing works & starting fleets, SPEC §58) the seeded
establishments bill real upkeep, and Byzantium's changed ledger nudges
614's Ghassanids a hair below break-even — treasury still rising
(50→391 over the run), the ARM/PAR hovering class, drifting on and off
the line with the seeds like ARI/HYR. Accepted as of v5.9:
167 PAR BLEEDING · 67 SEL DEAD + ARI (or HYR) BLEEDING · 40 HER and/or
ATG BLEEDING · 66 none · 132 JUD DEBT-SPIRAL,BLEEDING · 614 JUD
BLEEDING (SNOWBALL comes and goes) + GHA BLEEDING (comes and goes) ·
1948 none.

Since v6.0 (anti-snowball, SPEC §59): the punitive coalition and hegemon
containment are HUMAN-only, so no all-AI trajectory starts a new war —
but the AI now arms with the times (dev-scaled targets, the infamy arms
race), and 66 CE's Parthia therefore keeps a wartime host against an
infamous scripted Rome and drifts onto the bleeding line (treasury flat
at ~190, the self-limiting debt-desertion class of 66/132 JUD). 614's
come-and-go flags sat off the v6.0 run. Accepted as of v6.0:
167 PAR BLEEDING · 67 SEL DEAD + ARI (or HYR) BLEEDING · 40 HER and/or
ATG BLEEDING · 66 PAR BLEEDING (comes and goes) · 132 JUD
DEBT-SPIRAL,BLEEDING · 614 JUD/GHA BLEEDING and JUD SNOWBALL (all come
and go) · 1948 none.

Since v6.3 (the vassal loop + liberation, SPEC §61): a fallen province
whose owner fights on the besieger's side goes home to its owner, so
allied and client land earns through a war instead of sitting occupied.
66 CE's books improve overall (PAR off the bleeding line, treasury
rising), and the flag migrates to AGR — Rome's client, whose liberated
lands now genuinely return to it — running a hair negative with a flat
treasury and a debt-deserting host: the ARM/PAR hovering class, comes
and goes with the seeds. Accepted as of v6.3: 167 PAR BLEEDING ·
67 SEL DEAD + ARI (or HYR) BLEEDING · 40 HER and/or ATG BLEEDING ·
66 PAR and/or AGR BLEEDING (come and go) · 132 JUD
DEBT-SPIRAL,BLEEDING · 614 JUD/GHA BLEEDING and JUD SNOWBALL (all come
and go) · 1948 none.

The SPEC §82–83 batch (supply lines, AI naval invasions, sandbox
chapters) re-ran the full 8-year harness: the anomaly set came back a
strict subset of the accepted families (167 PAR · 67 SEL DEAD + ARI ·
40 HER + ATG · 66 AGR · 132 JUD BLEEDING · 614 none · 1948 none). The
supply contract exempts rebels and landless nations by design, so no
all-AI trajectory starved; chapters are human-only and invisible to
autoruns; and AI-vs-AI wars in the harness stay overland, so the
invasion planner idles there (its coverage lives in smoke57's Roman
expedition). `smoke57.mjs` owns supply + invasions, `smoke58.mjs` owns
chapters, `uitest31.mjs` drives the ✂ badge, the drawn route with its
break, and The Chapters panel in a real browser. `uitest36.mjs` owns the phone pass (SPEC §103) and is the one to run when
touching chrome: it boots a real 390×844 touch context, and its landscape
section resizes to 844×390 in the same run. `smoke76.mjs` owns the SPEC §106 royal century (the wars of Alexander Jannaeus,
the nine years of Salome Alexandra, and the hand-off into the 67 BCE chapter).
`smoke75.mjs` owns the SPEC §105 batch (the secession primitive and the
UAR breaking into Egypt and Syria, the SAR tag and its own breakup, the Suez
crisis, Eli Cohen, the Iranian revolution, and the northern border from the
Beqaa to the Blue Line). `smoke74.mjs` owns the SPEC §104 religion batch (the
ambient faith drift and its resistance clause, the god-fearer pool and the
permanence of the barred mission, the era windows on the 132 chain, the world
spine to 425 and the `when`-gated cards that retire out of it, the affinity a
change of dynasty annuls, and the Sasanian foreign-patron rule and its schism).
`smoke73.mjs` owns the SPEC §98–102 batch (crises, the tech
ceiling, embargo/blockade, the hoard ceiling and the formable payoffs), and
`smoke72.mjs` owns the SPEC §95–97 batch (the pen's second half and its absorption road,
the alliance bar and recognition, and every map-visible outcome of the
Ba'athist, fedayeen, Lebanese and uprising arcs).

## UI battery state (v5.4 audit)

v5.4 ran the full browser battery and repaired the stale suites it could
attribute: uitest2 and uitest5's carousel (eight→seven cards, stale since
v5.1 retired Kitos), uitest11 (Tel Aviv 30→25 dev, stale since the v4.1
subdivision), uitest13 (GRC had shipped without flag art since v5.0; GRC,
PNT and ITA emblems added). uitest3, 8, 10, 16, 17, 19, 20 and uitest5's
multiplayer section fail identically on the pre-v5.3 tree in this
environment (modal-timing/lobby timeouts under software GL) — pre-existing,
not regressions; they need their own pass.

The SPEC §69–71 batch re-ran the full battery: the v5.4 set above fails
unchanged, and two more suites were verified to fail IDENTICALLY on the
pre-change base tree in this environment (a worktree at the parent
commit, same server, same Chromium): uitest21 (the objectives pin and
the printed-consequences assertion — the same modal-timing class) and
uitest28 (the bombsight sortie's `cd=0` — the click lands but the raid
does not fly under software GL; the sim path is covered green by
smoke33 and smoke39's order-strike section). Every other suite passes,
including uitest22 (the peace table, now with the release section),
uitest23, and the new uitest29.

The SPEC §95–97 batch added `uitest35.mjs` (the 1948 diplomacy panel: Offer
Alliance refused in the bookmark's own words, Recognize offered beside it and
waiting on the coalition war, the letters signed by clicking, the button
flipping to Withdraw Recognition, Declare War greying out with it, and the
modern Greek chip in the ledger) and re-ran the suites its changes touch —
uitest2, 11, 13, 22, 25, 31, 33 and 35 all pass. The long tail documented
above (uitest3, 5, 8, 10, 16, 17, 19, 20, 21, 28) still fails identically on
the pre-batch tree in this environment and was not re-run in full.

## ju-cloud-mock.mjs — the cloud shelf, on localhost

    node tools/tests/ju-cloud-mock.mjs [port]          # standalone
    import { startCloudMock } from './ju-cloud-mock.mjs'  # from a suite

Serves `server/worker.js` — the real deployed code, not a reimplementation —
over an in-memory stand-in for Cloudflare KV. Node 22 already provides
`Request`/`Response`/`crypto.subtle`, which is the whole of the Workers runtime
the worker touches, so the routing, the `SHA-256(player key)` namespacing, the
prune and the room lifecycle all run exactly as they do in production.

`startCloudMock(port)` resolves to `{url, kv, stop}`; `kv._store` is the raw
Map, which is how `smoke68.mjs` expires a room early and how `uitest32.mjs`
proves the player code never reaches the store.

Two suites use it: `smoke68.mjs` (headless, the worker's own contract) and
`uitest32.mjs` (two browsers joining by six-character code, then a campaign
written to the cloud, loaded back, and picked up on a second "device"). Neither
needs a Cloudflare account, and neither talks to the network.

`uitest33.mjs` is the one to run when touching saves at all: it drives the
DEFAULT experience — a bare `http://…/` with no query string, no cloud, no
configuration — through save, reload, load, many campaigns across chapters,
delete, and the migration of a legacy localStorage save into IndexedDB. It
needs only the game server; it does not use the cloud mock.

The SPEC §104 religion batch (ambient faith drift, the god-fearer pool, the
world spine to 425, and the Sasanian coercion axis) re-ran the full 8-year
harness: the anomaly set came back a strict subset of the accepted families —
167 PAR BLEEDING · 67 ROM SNOWBALL + SEL DEAD · 40 HER BLEEDING · 66 JUD
BLEEDING · 132 JUD SNOWBALL · 614 none · 1948 none. Nothing in the batch can
reach an eight-year trajectory by design: the drift's curve is near zero before
the third century, the world spine's first card is in 175, and the god-fearer
pool moves shares rather than ledgers. Two longer runs were made instead, and
both completed clean with no warnings on stderr: `node tools/autorun.mjs 295
132ce` (to 427 CE — the whole spine, 71 wars, no anomaly beyond the documented
132 JUD SNOWBALL) and `node tools/autorun.mjs 60 614ce` (to 674 CE, no
anomalies). Those two are the runs to repeat when touching the drift table, the
faith pass or the spine, because an eight-year harness cannot see any of them.

The SPEC §105 batch fixed the harness itself: `autorun.mjs` used to import each
era's events module by name, so it ran every chapter WITHOUT any package
concatenated onto it in `compendium.js` — which since §104 meant the 132 CE
world spine and Christian thread were absent from the balance numbers
entirely. It reads `compendium.ERAS` now. Re-running the 8-year harness with
the registry actually wired in gives an anomaly set that is a strict subset of
the accepted families: 167 PAR + HAS BLEEDING · 67 ROM SNOWBALL + SEL DEAD ·
40 HER BLEEDING · 66 none · 132 JUD SNOWBALL · 614 GHA BLEEDING (the
documented come-and-go line) · 1948 none.

Two long runs stay the ones to repeat when touching either batch, and both are
now genuinely loading the new content: `node tools/autorun.mjs 295 132ce`
(to 427 CE, clean, no stderr) and `node tools/autorun.mjs 55 1948ce` (to 2003,
no anomalies, clean). Note that the 295-year 132 run now retires the small
Tigris client kingdoms — ADI bleeds and CHX dies somewhere in the third
century. That is the world spine doing its job (Ardashir, the crisis, Palmyra)
rather than a regression: those kingdoms did not survive the third century
either. It is far outside the eight-year contract and is recorded here so the
next person does not go looking for a bug.

The SPEC §106 royal century re-ran the 8-year harness with no change to the
anomaly set (167 PAR + HAS BLEEDING · 67 ROM SNOWBALL + SEL DEAD · 40 HER
BLEEDING · 66 none · 132 JUD SNOWBALL · 614 GHA BLEEDING · 1948 none), which is
expected: the new cards begin in 103 BCE, sixty-four years past an eight-year
run. The run that exercises them is `node tools/autorun.mjs 105 167bce` — it
reaches 62 BCE, fires all ten cards on their historical dates (Asophon −102,
Gaza −96, Obodas −93, the queen's reign −76 to −67), ends with Hyrcanus II on
the throne and the brothers' war open, and reports NO anomalies and no stderr.
That is the run to repeat when touching the Hasmonean chain.

SPEC §107 (Transjordan becomes Jordan in April 1949, gated on the kingdom
actually holding both banks) extends `smoke75.mjs` rather than adding a suite.
It also repaired `smoke39.mjs`, which read the era event FILES by name and so
never applied its "no single-option player events" invariant to any package
concatenated in `compendium.js` — the same class of gap as the autorun fix in
§105. Pointed at the registry it caught a real violation in §104 content. If
you write a tool or a suite that walks the event chains, read `compendium.ERAS`;
naming `events_<era>.js` by hand now misses most of three chapters.
