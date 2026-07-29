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

SPEC §108 (occupation is not possession) changed WHEN the Maccabean
greater-kingdom strand opens, not whether: `holds` requires ownership as well
as control, so the strand opens at the settlement — where uti possidetis makes
the conquest real — rather than at the first occupation. The 8-year set is
unchanged and `node tools/autorun.mjs 105 167bce` still reports no anomalies
and no stderr. If a Hasmonean card ever seems not to fire, check whether it is
asking `holds` (the inheritance taken) or `controls` (the army is here now);
both are correct, for different cards.

SPEC §109 adds `smoke77.mjs` (released states are one piece of connected land).
It is the first suite that boots from the geometry SNAPSHOT rather than a stub
geometry, and deliberately so: the older peace-table suites (`smoke47`,
`smoke53`) build `neighbors` as empty sets, on which every contiguity bug is
invisible. If you touch the release machinery, run smoke77 — and note that a
release changing size is not automatically a regression: it may be the
contiguity rule declining to hand over a pocket on the other side of the map.

SPEC §110–§111 add `smoke78.mjs`. It covers two unrelated pieces of work that
landed together, and the second half of it is slow on purpose: the last section
runs a hundred all-AI years of the 167 chapter to prove the Maccabean
succession does not skip brothers when the player diverges. Expect it to take
appreciably longer than any other suite.

Two things worth knowing before you read a failure in it. First, the pen
sections assert *absences* as well as presences — Khan Yunis, Qalqilya,
Tulkarm, Gadora and Hatra must have NO Hebrew entry, so adding one to the table
is a test failure by design rather than by accident. Second, `node
tools/autorun.mjs 105 167bce` now reports ROM and PAR as SNOWBALL. That is not
a regression to chase: the harness measures growth, and Rome and Parthia
growing over the second century BCE is the thing §111 exists to make happen.
The 8-year set is unchanged.

SPEC §112 adds `smoke79.mjs` (a rising has to end). Its last section plays
thirty AI years of the 66 CE chapter, so it is slower than most; the sections
before it are pure `monthlyRisings` ticks and are instant. Note that it
deliberately asserts what does NOT burn out as well as what does — a dead
owner's province, a pretender's host, and a band inside its grace period all
keep what they took, and loosening any of those is a test failure by design.

SPEC §113 adds `smoke80.mjs` (the Levant without a Lebanon). It plays the whole
1948 chapter twice — fifty-four years each — so it is one of the two slowest
headless suites, beside smoke78. What it is really guarding is mutual
exclusion: the historical northern arc and the alternate one must never both
run in the same campaign, and a card that starts firing on both roads will show
up here as an intruder rather than as a missing event.

SPEC §114 adds `smoke81.mjs` (the kingdom that kept the Galilee). Like smoke80
its real subject is mutual exclusion — there are now THREE outcomes in the 132
chapter and a card that opens on two of them is a regression even though it
will look like extra content. Its last section plays 299 years and is the
slowest thing in the battery; the sections before it are direct predicate
checks and are instant.

SPEC §116–§117 add `smoke82.mjs`. It is the only suite that deliberately boots
BOTH geometries — the real snapshot for the contiguity assertions and the older
suites' synthetic bead chain for the restraint — because the first draft of the
peace-table rule passed on the real map and broke six suites on the fake one.
If you tighten `geomIsMapLike` or remove the `keep`-predicate exemption, this is
where it will show up. Note also that §117 changes attrition for every army with
a long line, so a balance shift in the 105-year runs after touching supply is
expected rather than alarming.

SPEC §118–§119 add `smoke83.mjs` (the branching path tree) and `tools/paths.mjs`
(the renderer). smoke83 is fast — it is static analysis, not simulation — and it
is the suite to run after touching ANY branch predicate or terminal card. Its
sharpest assertion is that `KNOWN_GAPS` equals the set of roads with no ending,
so finishing a road means deleting its gap entry in the same commit. Note the
marker check reads the content packages as TEXT: the effect wrapper hides
`setFlag` from `String()`, so a runtime check would silently pass.

SPEC §120 adds `events_40bce_alternates.js` and two cards to
`events_1948_region.js`, closing the gaps smoke83 had been failing. If you add a
content package, add it to smoke83's SOURCES map in the same commit — the marker
check reads files by name and will report a live road as dead otherwise, which
is exactly what happened when this batch landed.

SPEC §121 adds `smoke84.mjs` (the generation horizon and the 167 continuation).
Its last section plays 175 AI years, so it sits with smoke78/80/81 among the
slow suites. If you add a chapter, give its bookmark a `generationHorizon` in
the same commit — smoke84 asserts every one of them has it, because a chapter
without one lets its revolt cards fire a century later.

SPEC §122 extends `smoke84.mjs` to the 66 CE continuation. The assertion worth
knowing about is that the two arcs must REFUSE each other — `ev_a_*` for the
fallen House, `ev_b_*` for the standing one — so a card that starts firing on
both roads shows up here rather than as extra content in a playthrough.

SPEC §123–§124 add `events_67bce_after.js` and `events_40bce_bridge.js`, closing
the last two chapter edges. Note the design rule they establish: thematic
overlap between two chapters' packages is fine, because a campaign only ever
plays one chain. What is never fine is a chapter that stops before its own
history does.

SPEC §125 adds `smoke85.mjs` and five content packages — `events_167bce_empire.js`,
`events_66ce_nation.js`, `events_132ce_endure.js`, `events_614ce_third.js`,
`events_1948_question.js` — the rung above each chapter's best road. All five are
in smoke83's SOURCES map, per the rule §120 established above.

What smoke85 is for is the failure mode a content package actually fails by,
which is never a crash. The guards see to that: every effect is wrapped, so a
faction id that does not exist in the chapter shifts nothing, a modifier key the
engine never reads does nothing, and a tooltip promising that territory changes
hands sits above effects that hand over nothing — and all three pass a suite that
only checks for exceptions. So smoke85 checks the promise: faction ids against
the bookmark's own list, modifier keys against the set sim/economy, sim/military
and sim/unrest actually look up, and the withdrawal option against the map. It
also holds the two structural rules — every card windowed so §121's horizon
cannot retire it, and every answer to a card leaving a mark distinct from its
siblings, since the terminal reads those marks back.

SPEC §126 adds four content packages and extends `smoke85.mjs` to cover them.
Two notes worth carrying forward. First, `events_annexation.js` is the first
content package that belongs to no chapter — it is keyed on the player tag like
the omen pool, so the registry decides which chapters play it and the cards'
`maxYear` decides when; smoke85 checks both halves, because either alone is a
bug. Second, smoke85's modifier-key check no longer reads from a list somebody
typed. It reads `resolveTagMult`/`resolveTagAdd` call sites out of `js/sim/`
and knows that `taxMult` and `unrest` are province-scope, so a key that is
misspelled, absent, or applied at the wrong scope all fail the same way. The
typed list had already produced one false negative and hidden seven dead keys.

SPEC §127 adds `smoke86.mjs` (the court that changes hands) and gives faction
defs `fromYear` / `untilYear` / `succeeds`. If you add a windowed faction to a
bookmark, note that `factionDefs` returns the list BY IDENTITY when no def in
it declares a window — smoke73 asserts `factionDefs(MLI) === factionDefs(JUD)`
to prove a formed crown keeps the same court, and an unconditional `filter()`
breaks it while changing nothing observable. Cards may keep naming a departed
faction: `shiftFaction` routes through `succeeds` to whoever holds the seat.

SPEC §128 adds `smoke87.mjs`, `events_132ce_kosiba.js`, and one engine
capability worth knowing about before you write a card: an event option may
declare `when(ctx)`, and the option is then not shown at all rather than shown
and refused. The mask is computed once at fire time and stored on the pending
entry, so it rides the save and cannot shift while a modal is open.

The part to be careful with is indices. Everything downstream — the modal, the
multiplayer mirror, `resolveEventOption` — works in ORIGINAL option indices and
renders a subset; the button carries the real index, not its position in the
filtered list. If you touch that path, smoke87's "survives the round trip"
section is the one that catches an off-by-one, and the symptom it prevents is a
player clicking one constitution and the state adopting another.

Two smaller notes. A card with neither `trigger` nor `date` is never scheduled
and is fired by another card's effects (`helpers.fireEvent`) — smoke85 exempts
those from the window rule rather than failing them. And smoke39's rule that
every non-`world` player-facing card offers at least two answers applies to
these too: a card that is conceptually a single beat still needs a real second
answer, not a `world: true` flag to duck the check.

SPEC §129 adds `smoke88.mjs` and the `LUK` tag — the diaspora rising of
115–117, which is spawned at runtime by content rather than declared in a
bookmark's `activeTags`, exactly as `SAR` is in 1948. If you are looking for
why it is not in the 66 bookmark, that is why.

The spawner lives in two content packages in duplicate (`events_66ce_after.js`
and `events_66ce_nation.js`) because both are zero-import by contract. It is
idempotent — six option effects call it and only the first raises anything —
and smoke88 pins that, because a second rising would mean a second war and a
second army stack on the same ground.

SPEC §130 adds `smoke89.mjs`, `events_66ce_settlement.js`, and two engine
pieces worth knowing: `helpers.faction` / `helpers.factionAtLeast` (read a
court, which content could not do before) and `helpers.setConstitution` /
`constitutionOf` (a write-once per-chapter store under `game.constitutions`,
which rides the save because `doSave` stringifies the whole game object).

Two traps. First, `allowedOptions` returns NULL to mean "every option is
open" — a test that writes `allowedOptions(...) || []` reads that as "none are
open" and will fail in the confusing direction. Use the full index list as the
fallback. Second, road markers must stay as literal `setFlag` calls at each
call site even when a helper writes everything else about the decision:
smoke83's anti-drift check reads packages as text, and a marker written inside
a helper makes a live road look dead. This is now the second batch that has
hit it.

SPEC §131 fixes the 1948 withdrawal, and the lesson is narrower than the bug:
`events_1948.js` already owns the definition of the armistice line in two
lists, and §125 assembled a third from memory. If a chapter has already drawn a
border, copy that border — the zero-import rule means duplicating the list, not
inventing one.

SPEC §132 adds `uitest37.mjs`. Two things to know if you touch the realm panel.
The panel refreshes on the `day` signal, so ANY section that assigns
`innerHTML` unconditionally will eat clicks at speed — always go through
`setHtml`, which skips the write when the markup is unchanged. And the panel
defers refreshes while a pointer is held inside it; the catch-up is queued with
`setTimeout` rather than run from `pointerup`, because `pointerup` fires before
`click` and a rebuild there recreates the bug one step later.

Writing UI tests for this class: pausing the game around the click — which
every older test does — hides the bug completely. Reproduce the mechanism
instead: hold the button down, `bus.emit('day')`, release. And scroll first,
because `page.mouse` does not auto-scroll the way `locator.click()` does and
these buttons sit below the fold.

SPEC §133 adds `DEFINES.DIASPORA` and `helpers.isDiaspora`. If you write a card
that awards territory by religion, exclude them — Leontopolis, Arbela,
Nehardea and Khaybar are Jewish and were never Judaean, and the engine's
contiguity guard is skipped whenever a card supplies its own `keep` predicate.

SPEC §134: `helpers.fireEvent` now delegates to `sim/events.js`'s `fireEvent`
rather than reimplementing it. If you find yourself adding a second way to
queue a card, don't — the duplicate had drifted three features behind the
original (the §128 option mask, the §70 decider notice, and the
war-already-settled retirement) and the drift was invisible because the card it
broke was the only one in the game fired that way.

SPEC §135 adds `livingTag` (sim/military.js) and `game.tagAliases`. Rule for
content: **never compare a tag with `===` and a literal.** A realm can proclaim
a greater crown at any point in the century, `switchTagCore` rewrites the whole
state to the new three letters, and every predicate holding the old ones goes
quiet — the 167 chain lost twenty-two cards to this, the 66 chain eighteen, and
the 67 chapter's entire Roman-civil-war branch was unreachable by construction.
Route the tag through `who(ctx, tag)` (the local wrapper each package keeps over
`ctx.helpers.livingTag`) before it is compared to a province owner, a war side,
`playerTag`, or a `game.tags` key. `simHelpers` already does this for every
entry that takes a tag, so a card that reaches the world through `h.adjust`,
`h.controls`, `h.countControlled` and friends is safe without doing anything.

One exception, and it is in the file headers: the 1948 packages keep a raw
`alive` on purpose. That chapter's whole subject is which banner Cairo and
Damascus are flying, so forwarding would make `alive('UAR')` true after the
union has come apart. It resolves its cast by name instead (`egyTag`, `syrTag`,
`syrOwn`, SPEC §105) and always did.

`smoke90.mjs` is the guard, and its last section is the one that matters: it
plays 167 BCE to 6 CE twice from one seed, once taking the Kingdom of Israel and
once not, and asserts the crowned run does not lose a strand. If you add a
chapter gate keyed on a tag, that test is where its absence will show up.

SPEC §136 adds an eighth chapter (`bookmark_529ce.js`, `events_529ce.js`) and the
`SAM` tag. Two things to know if you touch it. The four hill provinces are only
four because the bookmark declares `activeProvinces` — Jenin is a latent cell of
Neapolis and Tulkarm and Qalqilya are latent cells of SEBASTE, so dropping that
line silently hands the community's farmland to the Christian garrison town five
miles away and the chapter still boots. And the victory contract counts
`religion === 'samaritanism'` provinces rather than owned ones on purpose: this is
the one chapter where the player's people can outlive the player's state, and a
`countControlled` shortcut would quietly turn the survival win back into a border
win. `smoke91.mjs` guards both.

SPEC §151 adds that chapter's 531–614 tail (`events_529ce_roads.js`) and closes
the five roads §136 declared open, so `KNOWN_GAPS` no longer names the Keepers at
all. Two things to know. The tail's cards gate on **people, not ground** — every
trigger asks `afterTheRising`, which wants a live tag and at least one province
of that Torah anywhere, because a chapter whose victory condition counts people
cannot gate its own second half on holding a capital. And the 551 easing is a
modifier swap rather than a paragraph: it removes `the_statutes` and adds
`the_statutes_eased`, which is the only card in the game that repeals part of a
chapter's opening condition. `smoke100.mjs` owns both, and also owns the claim
that the chapter charts fourteen roads with no gaps; if you add a road there,
that suite's count is the thing that will tell you.

SPEC §137 changes two long-standing behaviours, and both are the kind that a later
"cleanup" would revert without noticing. `monthlyIncorporation` no longer voids a
union when war comes — it sets `incorporating.suspended` and stops the clock — and
the devotion gate deliberately runs BEFORE the war branch so a client who turns
mid-war still breaks it. And `thawProgress` now reaches further than
`thawReachPlain` when the victim is much lighter than the taker (`deference`), which
is why a small neighbour's grudge ceiling can come off entirely while an equal's
still stops at half. `smoke92.mjs` guards both; `smoke40.mjs` carries the wartime
rule for the vassal loop.

SPEC §138 gates the Kingdom of Israel on `game.flags.davidicThrone`. Three roads
raise it — the shared `events_house_of_david.js` arc, 132's grandson of the
Davidic marriage, and 614's crown of David — and the shared cards stand down
while either bespoke arc runs (`ownArcRuns`). If you add a chapter where MLI is
formable, it must also play the shared package or the formable is dead content
there; `smoke93.mjs` asserts that pairing directly, which is the §135 lesson
applied forward.

### The unpause that was a race

Fifteen browser suites wrapped a click in `game.paused = false` … click …
`game.paused = true`. That is a leftover from the blanket pause queue the engine
used to keep: no action is gated on `g.paused` any more (it is only set by
`endGame`, toggled by `togglePause`, and read for display), so the unpause bought
nothing — and it cost a great deal. Between the unpause and the click the clock
runs, a scripted card fires, `fireEvent` pauses the game and opens the event
modal, and the modal's scrim intercepts the click. Playwright then retries for
thirty seconds and the suite dies with

    <div class="modal-scrim"></div> from <div id="event-modal">…</div>
    intercepts pointer events

which reads like a UI bug and is not one. Eleven suites failed this way, all of
them intermittently, because whether a card fires in that window depends on the
date the test happens to reach.

So: **do not unpause to make a click land.** Clicks land while paused. The four
places that still unpause do it deliberately, to let time pass (`speed = 5`
followed by a `waitForTimeout`), and the three in-`evaluate` toggles are
synchronous — no clock runs inside a single `page.evaluate`, so neither shape can
race.

### The other five, and what they were really testing

Once the unpause race was gone, five suites were left red, and none of them was
failing at a bug. Three had been quietly invalidated by rules the engine grew:

- **§116, a demand has to be somewhere.** `uitest2` occupied Dura-Europos, Hatra
  and Singara in a war with Parthia; `uitest22` occupied Petra and Bostra in a
  war with Nabataea from a 167 BCE start whose only neighbour on the map is the
  Seleucid king; `uitest30` picked the richest Roman province anywhere, which
  since the frame grew to Italy is Rome. None of the three is land-reachable
  from Judaea, so the peace table correctly offered no rows and the suites hung
  on checkboxes that could never exist. All three now demand from a neighbour.
  **If you write a peace-table fixture, occupy something that borders you.**
- **§93, a shelf instead of a downloads folder.** `uitest3` was still asking for
  `[data-ref="import"]` and `[data-ref="export"]`, which have not existed since
  the save UI moved to the shelf. It now asserts the shelf — and asks
  `shelfList()` rather than the saves *modal*, because the modal merges the
  local shelf with the cloud and reports a read error when there is no worker to
  reach, which would make the assertion a test of this machine's network.
- **A relay test that could not see its own card.** `uitest5` emitted a
  synthetic event on the host and then waited for the guest's modal to be
  *hidden*. Any real scripted card arriving behind it left the modal open and the
  suite died — on "Menahem at the Gates", which tells you nothing. It now freezes
  the host's clock and waits on its own card by title at both ends.

Two lessons worth keeping. Assert on **your own fixture**, not on a container
being empty — a shared modal holds other people's cards. And when a test waits on
storage, wait for the **write to land**: `doSave` is async and a reload issued
straight after `saveRequest` aborts it, which a fixed `waitForTimeout(300)` lost
intermittently and invisibly.
