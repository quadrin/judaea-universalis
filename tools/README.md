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

"Every latent cell is active in 1948" is a real invariant, not a description —
`smoke27` asserts it. A latent cell missing from that bookmark's
`activeProvinces` has no geometry of its own in ANY era: it comes back with zero
area and no neighbours, and the only symptom is a suite that reads the snapshot
reporting something odd elsewhere. Add a `latentParent` cell, add it there.

Since v6.8 (SPEC §160) the boot is minutes, not seconds — the ID pass is one
fullscreen draw over every texel against every seed, and this runs on
SwiftShader. Measured at v6.8: 74s to the start screen, 104s to a live
campaign (25.0M texels × 307 seeds), against 17s and 47s on the pre-§160
tree. The §205 frame is 46.0M × 373 — about 2.2× that work again — so the
timeouts in `dump-geometry.mjs` doubled with it. A slow dump is the frame's
cost and not a flaky selector.

## coastcheck.mjs — the coastline's invariants, and a picture of it

    node tools/coastcheck.mjs            check, and write $JU_OUT/coast.png
    JU_SCALE=3 JU_LAND_NAMES=MAINLAND,BRITAIN,... node tools/coastcheck.mjs

`validateMapData()` checks province seeds against the polygons; nothing checked
the polygons. MAINLAND is a single closed ring of ~900 points, and one
mis-ordered pair anywhere in it makes the canvas fill flip inside-out over the
crossed lobe — with every province seed still landing on "land" and every
downstream suite still green. This holds simplicity (no segment crosses another
in the same ring), disjointness (no landmass overlaps or nests inside another),
closure, and frame containment — then rasterises the mask to a PNG so the
result can be LOOKED at without a browser, a server and a WebGL context.

Run it after any edit to `coast.land`. It is the cheap half of the loop; the
browser is the expensive half.

## coastfit.mjs — how far the drawn coastline is from the real one

    curl -o /tmp/ne10m.geojson \
      https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_coastline.geojson
    node tools/coastfit.mjs /tmp/ne10m.geojson

The coastline is hand-traced, and hand-tracing has no error bar. This puts one
on it: for every ring vertex, the distance to the nearest real coastline
segment, in kilometres and in map pixels, with per-landmass medians and the
worst offenders named. At v6.8: median 1.7 km, p90 9.2 km over 921 vertices —
one map pixel is ~1.1 km, so the median vertex is within two pixels.

Deliberately NOT in `run-smoke.sh`: it needs a data file the repo does not
carry, and its answer is a judgement rather than a pass/fail.

READ THE OUTLIERS BEFORE FIXING THEM. The largest miss on the map is ~59 km at
the head of the Persian Gulf and it is correct — that is the 66 CE shoreline
near Charax, and the Shatt al-Arab has built roughly that much delta over it
since. The reference is a modern coastline; where this map is deliberately
ancient, a large number means the reference is late.

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

Since v6.8 (the frame reaches Britain, SPEC §160): 133 cells were added to the
atlas, all of them WASTE — no nation gained a province, and no war changed. But
a bigger province list moves every province-ordered RNG draw, so which member
of the accepted families shows up on a given run moved with it. The set did not
grow; it got smaller. Measured on the same 8-year harness, before and after:

    before   167 PAR + HAS BLEEDING · 67 SEL DEAD · 40 ATG BLEEDING
    after    67 SEL DEAD + ITU BLEEDING · 614 JUD BLEEDING

`ITU` is a new name in the list and belongs to the long-documented hovering
class: Ituraea is ONE province (dev 9→11) carrying a 3,000-man host, income
−0.5 → −0.1 (converging on break-even, not away from it) and treasury drifting
60→26 over eight years. Self-limiting, no spiral, the ARM/PAR/ARI/HYR family.
614 JUD BLEEDING is already accepted as coming and going.

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
`smoke127.mjs` owns the SPEC §197 estate favor bank and the asks (the seed,
the band rates, the one-object promise/payment contract, the ground scaling
measured by handing the crown the coast, the gates, the AI silence).
`smoke119.mjs` was rewritten in place to hold §198's split — the reform
trees on Crown, the Ideas of the Age with the ladders — keeping §188's
all-bookmark audit verbatim. `uitest41.mjs` drives the §197 court in a real
browser: the ground line and favor figure per estate, the one-press ask with
its toast, and the "Their ground" lever lighting the estates button on the
mapmode bar (which now follows the bus event rather than its own clicks).
`smoke130.mjs` owns the SPEC §202 chancery: the seat arithmetic, the load and
the four things that are not seats, the gates on both sides of the table, the
monthly bill in influence and opinion, the client strain and its floor, the
annulment, the decade a freed court will not kneel to the hand that freed it,
and the seeded-world invariant across all eight bookmarks. `uitest43.mjs`
drives the same section in a real browser: the Chancery block on The World
counting seats and moving when a bond is written, the annulment as a live
button where a dead "Houses Joined" plate used to sit, an overstretched
chancery naming itself, and the alliance button carrying the refusal in words.

`smoke131.mjs` owns the SPEC §203 panel sort: the ladders' tab declared as
`tech`/Technology/`tabTech` with the stylesheet's filter rule following it and
no `coin` left anywhere (panel, stylesheet, or a bookmark's `uiTerms`); the
doctrine needles resolving to Crown between the realm's facts and its reforms;
the institutions folded in under the ladders inside the Ideas of the Age block
with the surcharge banner no longer naming another tab; and the four ways
nothing went blank, including the folded block hiding only when both halves
have. `uitest38.mjs` grew the browser's answer to the same three moves, and
`uitest8.mjs` drives the ladders through the renamed tab. Neither §203 nor its
suites touch the sim: `node tools/autorun.mjs 8` is unaffected by a tab.

`smoke132.mjs` owns the SPEC §204 pair: The Chapters resolving to the Missions
tab above the tree (hidden at a foreign court, title still from
`uiTerms.chapters`, both tab tooltips swapping the claim), and the pattern
line, milestone strip and arms pipeline resolving to the Host under *How We
Muster* — `milestoneStrip` called once and only into that block, the military
card keeping a musters line that names the tab in the chapter's own word, and
one `getTech()` a pass feeding both hosts. `uitest38.mjs` and `uitest8.mjs`
carry the browser half; `uitest31.mjs` opens the chapters panel on the tab that
now holds it.

`smoke134.mjs` owns the SPEC §207 drumbeat: one mission completion per realm
per monthly pass, then a rest of `MISSION_PACE_MONTHS` before the next may
land. If you write a suite that forces a world and expects the pass to pay
for it, do what smoke111/116/120/126/129 now do — pump `checkMissions` in a
loop (each call is one synthetic month) instead of calling it twice, and pump
the no-free-lunch sections too, or a free node hides behind whichever era
objective absorbs the first beat. Note the rule the suite pins hardest: a
month whose checks all FAIL charges no rest, so the fail-then-fix idiom
(smoke16's Third House) still completes on the very next call.

Since SPEC §206 (the south and the east get their history: 27 dated world
cards on the §205 ground): the 8-year set is byte-identical — the cards that
fire inside any 8-year window move opinions and modifiers, not trajectories.
The runs that §206 actually lives in are the long ones, and their accepted
lines move BY DESIGN: `node tools/autorun.mjs 105 167bce` now reports
`ROM SNOWBALL | PAR SNOWBALL | GBA DEAD` — the first two are §111's
documented point, and Bactria dying is the scripted Saka breakthrough of
−129 doing its work (Saba also ends that century at three cells because
Himyar seceded from it on schedule; both convergences are what smoke133
pins). `node tools/autorun.mjs 60 614ce` comes back with no anomalies and
Persia 58→41 provinces — the southern transfer to the caliphate firing in
real flow. `node tools/autorun.mjs 295 132ce` reports the §105-documented
third-century client deaths (OSR/ADI/CHX — kingdoms that did not survive
that century either) plus `HDR DEAD`, which is Shammar Yuharish's union of
300 doing exactly what its inscription says: Himyar ends that run at eight
cells with the frankincense country absorbed. If GBA stops dying in the
105 run, HDR stops dying in the 295, or SAK/HMY stop appearing at all,
look at the §206 cards before the sim.

Since v7.4 (SPEC §205: the frame holds all of Iran and all of Ethiopia; 67
new cells, twelve new courts): the 8-year harness, run against a
clean-worktree baseline in the same environment, came back with 167, 66, 132
and 614 clean on both trees, `67 SEL DEAD` and `529 JUD DEAD + SAM
DEBT-SPIRAL` byte-identical (accepted by design), and the baseline's `40
OSR/HER/ATG BLEEDING` cluster absent from the new tree — the set got
smaller. The one new flag, `1948 ISR BLEEDING` on the harness seed, was
sampled across three further seeds and did not reproduce on any (22
provinces held, demobilized, no flags): it is the §160 drift class — a
bigger province list moves every province-ordered draw — not a 1948 balance
change, and the accepted set is unchanged. Every §205 court ends its era's
run unflagged. BOOT_MS doubled to 480s with the frame (the ID pass is 46.0M
texels × 373 seeds now); dump-geometry's timeout doubled with it.

SPEC §207 (the mission drumbeat: one completion a month, a 2-month rest
between) re-ran the full 8-year harness and came back exactly the §205
families — 167 none · 67 SEL DEAD · 40 none · 66 none · 132 none · 529 JUD
DEAD + SAM DEBT-SPIRAL · 614 JUD BLEEDING · 1948 ISR BLEEDING (the
harness-seed flag §205 already sampled as drift). The number worth
remembering is the one that set the pace: a first draft with a THREE-month
rest pushed the 167 chain's war-score mission past its transient window on
the harness seed (month 11 → month 25), and fourteen reward-starved months
tipped the knife-edge all-AI Maccabean run to HAS DEAD — a flag no accepted
family carries. A pace sweep (0/1/2/3 → alive/alive/alive/dead) picked 2.
If a future edit makes an underdog die in the harness, check whether a
war-score mission slid out of its window before blaming the armies.

**The §202 harness note is that there is no harness note.** `node
tools/autorun.mjs 8`, run on the pre-§202 tree and on this one in the same
environment, produced **byte-identical output** — every bookmark, every
trajectory, every anomaly flag, not merely the same accepted families. That is
the section's own contract working: no bookmark seats a court over its
establishment (Parthia's four bonds against five seats in 40 BCE is the
tightest fit on the map), no seeded client system carries strain (`freeClients`
is 3 because the King of Kings holds exactly three), and the AI never opens a
bond on its own initiative — so the only court that ever meets the ceiling is
one a player is spending. If a future edit makes this harness move, look at the
chancery's dials before the armies: `smoke130`'s seeded-world clause is the
canary and it fails loudly.

## UI battery state (v6.8)

Since SPEC §160 every suite carries `BOOT_MS` (default 240s, override with
`JU_BOOT_TIMEOUT`) on its `.bm-card` wait. `main.js` awaits `initRenderer()`
and `computeGeometry()` before `showStartScreen()`, so the carousel is gated on
the province-raster pass: 74s at this frame on SwiftShader against 17s before.
The old 20-second wait meant all 37 suites died on that one line before
asserting anything. Everything after it is unaffected — the nation cards land
about a second later — so this is the only timeout that moved.

Budget accordingly: a full `run-ui.sh` on software GL is over an hour, mostly
spent booting. Run the suites your change touches.

### The v5.4 "known failing tail" was the timeout all along

Everything below this line dates from v5.4 and attributes uitest3, 5, 8, 10,
16, 17, 19, 20, 21 and 28 to "modal-timing/lobby timeouts under software GL",
verified to fail identically on pre-change trees. That verification was sound
and the conclusion was wrong: they share ONE cause, and it is the `.bm-card`
wait, not modals or the lobby.

Measured at v6.8, the full 37-suite battery run against the PRE-§160 tree
(793eebe) with nothing changed but `BOOT_MS`:

    36 / 37 ALL PASS — the only failure is uitest23

Every suite in the documented tail passes. The pre-§160 start screen takes
17.5s against a 20-second wait — 2.5 seconds of margin — so which suites fell
over depended on machine load, which is exactly what "fails identically on the
base tree" looks like from the inside. Treat the paragraphs below as history.

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
applied forward. The shared arc must also FIT the chapter (SPEC §178): the
generation gate scales off `chapterSpan` so that gate + 22 (the son) + 5 (room
to proclaim) stays inside the horizon — a new MLI chapter wants a span of at
least 31 years, or the crown is arithmetic-dead content even with the package
registered. And seating the Davidide is a real succession, not a flag: the
shared arc crowns him, 132 seats him as heir, 614 crowns its own — if you add
a fourth road, it must put a man on the throne, not just raise
`davidicThrone`.

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

Since v6.9 (SPEC §163–§169: foreign courts, intrigue, standing, institutions,
estate geography, ages, and the sacred systems) the seeded trajectories moved
again, for two reasons worth separating.

The first is ordinary stream drift. `courts.js` raises risings, `ages.js`
starts unions, and `institutions.js` changes when the AI can afford its next
tech level — so every province-ordered draw downstream lands differently, and
the small-realm bleeders drift on and off the line exactly as ARI/HYR and
ARM/PAR always have. Accepted as of v6.9: 167 PAR BLEEDING · 67 ROM SNOWBALL +
SEL DEAD · 40 HER and/or ATG BLEEDING-or-DEBT-SPIRAL · 66 AGR BLEEDING (a
two-province client, the ARM class) · 132 none · 529 JUD DEAD (by design,
§162) + SAM DEBT-SPIRAL + GHA BLEEDING · 614 none · 1948 none.

The second was not drift and is worth remembering. The first draft of §166 gave
every institution a list of stat modifiers and handed them to every court on
the map at seed. The harness caught it in one run — 167 BCE went from a clean
sheet to an all-AI Hasmonean Judaea tripling its size in eight years — and a
three-way bisect (institutions alone, courts alone, standing alone) put the
entire change on the modifiers rather than on the tech price. **Run the bisect
before believing a single-system explanation**: turning one system off does not
restore the baseline when the others are still perturbing the RNG stream, which
is exactly what made the first two attempts at that diagnosis wrong.


Since v7.0 (SPEC §172) the Diaspora is no longer an off-map power. `POWERS` for
167 BCE, 66 CE and 132 CE is now undefined rather than a one-entry roster, and
the nation panel's "Powers Beyond the Map" section hides itself for those three
chapters. `smoke34` and `smoke36` both used the Diaspora as their fixture for
the powers engine's tag-gating contract — a pact or an ask offered to one house
refuses every other — because it was the only power those chapters had. Both now
test that contract against 614's Türk Khaganate, which gates on `tags: ['BYZ']`
in exactly the same way. The contract did not change; only the fixture did.

SPEC §183 seats the §119 fork tree in the mission panel as standing
hypotheticals — thirty missions across the eight chapters, flagged
`hypothetical: true` with a `fork: 'chapter/forkId'` annotation. Two contracts
matter when touching them. Their checks read the SAME flags the fork cards set
(or mirror the fork's own trigger arithmetic; or read `retiredChapters` for a
road that is a recorded absence) — never a re-derivation — so renaming a marker
flag breaks a road silently everywhere except `smoke116.mjs`, whose
completability pass builds each chapter's world-state by hand and fails on the
one hypothetical that no longer pays. And the chains stay append-only: every
hypothetical sits after the last real objective so the `missionIdx` done-prefix
and `smoke16`'s raw index into the 132/614 tables keep meaning what they always
meant. AI-only chains (Vespasian's ladder above all) carry none, which is what
keeps the §177 ladder pin true. The suite also enforces one-medallion-per-cell
on every player tree — the check that found the §177/§179 curriculum nodes
stacking two-deep at 167 and 132, which is why three of those now declare rows.

SPEC §184 badges the fork cards at the table. `entryFork(chapterId, eventId)`
in `chapter_paths.js` is the single lookup behind the event window's chip, the
Compendium's badge and row, and the multiplayer payload's pre-resolved
`fork: { question }` — it is the §119 tree indexed by entry card, so it cannot
drift from the chains. If you add a fork, its entry gets the badge for free;
if you rename an entry card, `smoke83` still fails first (the card no longer
exists) and `smoke117` holds the lookup itself: every declared entry resolves
to its own fork, everything else — other chapters' cards, the shared pool,
nulls — stays bare. `uitest39` deals a fork card and a plain card through
`helpers.fireEvent` in a real browser and reads the chip off the live modal.

SPEC §185 makes every seated Jewish court a playable standard — `ADI` in
67 BCE, 40 BCE, 66 CE and 132 CE, `AGR` in 66 CE — and the roster pins moved
with it: `smoke23` and `uitest3` now expect
`HAS / HYR,ARI,ADI / HER,ATG,ADI / JUD,AGR,ADI / JUD,ADI / SAM / JUD / ISR`,
`smoke101` covers the five new statecraft seat rows, `smoke112` the three new
curricula (seven new idea groups), and `smoke116`'s completability worlds pay
Adiabene's and Agrippa's roads beside the principals'. The batch re-measured
the harness on the four touched chapters, 8 years, and found the v6.9
accepted-anomaly line above had already drifted on the base tree: 132 ran
`JUD: SNOWBALL` at the parent commit with the doc still saying "132 none".
Post-§185 the four chapters read: 67 `SEL: DEAD` (accepted, and ROM's
snowball happens not to fire this stream) · 40 none · 66 none (AGR's
accepted bleed closes — the client now starts with the opinions and the
small treasury the chapter always implied) · 132 `JUD: BLEEDING` (the
RNG-stream shift flips the base tree's SNOWBALL to the historical
direction; all-AI Bar Kokhba losing ground is the record, not a wound).
No new anomaly class appears on any of the four.

The full battery at §185: 115 of 116 headless suites ALL PASS, and
`uitest3` passes in a real browser with the widened rosters card for card.
The one red suite, `smoke90`, fails IDENTICALLY on the pre-change tree
(a worktree at the parent commit, same command): its 167 crown-cost run
loses three cards to seeded drift (`ev_sc_the_bid_for_a_province`,
`ev_sc_quartered_on_the_city`, `ev_jerusalem_terms`) against an allowance
of two, on both trees, byte for byte — pre-existing, not a §185
regression, and it needs its own pass.

SPEC §186 gives 1948 its donor courts (`bookmark.financialAid.donors` — the
arsenal list minus Prague, which sold and never funded): any other court may
petition one for financial aid at the donor's regard bar, and a grant is an
ordinary §24 subsidy row wearing an `aid` marker, sized to the donor's own
books. `smoke118.mjs` owns the contract — the gates and their reasons, the
grant's double-entry, the no-anchor/no-liveness-floor contrast with §181's
pipeline, the war/embargo ruptures, the AI's own petitions, and the save
round-trip. In the 8-year all-AI harness the mechanic surfaces exactly once:
Lebanon dips under the poverty floor, petitions the one donor whose seeded
regard clears the bar, and ends the run ~60 talents richer with one more
regiment, while Paris pays it from net its books actually clear (FRA
treasury 234→232). Every other row is byte-identical to the pre-§186 tree —
Israel reaches no donor's bar without a player courting it, which is the
design — and the accepted family stays `1948 none`.

SPEC §191 gives the land war three arms instead of two. `js/data/units.js` is
the new source of truth — the arm table, the shot's pattern names, the matchup
triangle, the eighteen faces as bare `d` strings, and the sound cue keys — and
it imports only `tech.js`, so the sim, the map's canvas and the SVG icon set
all read one table. Three things are worth knowing before touching it.

**The faces are path data, not markup.** `UNIT_GLYPHS` holds one `d` string per
pattern, all subpaths in it, because the same string is handed to `new Path2D()`
in `overlay.js` and dropped into a `<path d>` by `icons.js`' `unitIcon()`. A
`<circle>` or a `fill=` attribute in there breaks the canvas silently — every
face is arcs and lines only, and `smoke122` asserts it (`/^M/`, no `<>`).

**The triangle and §181's armor are different halves, on purpose.**
`armorPips` still answers "who has more tanks" as a signed quantity and still
lands in `b.last.armA/armD`; `armPips` answers "what is each side's army FOR"
from the arm shares and lands in `mixA/mixD`. Nothing double-counts because
each side scores its own row of `MATCHUPS`. The anti-armor term inside
`armPips` is deliberately a COUNT (`antiArmorPips`), not a share: four
anti-tank regiments against four tanks have to be worth something whatever
fraction of the host they are, and a share-product buries them at 0.1.

**The gait is the part that reaches the whole world.** A column marches at its
slowest arm, so the moment the AI establishment holds any guns, most stacks
everywhere contain one. The first draft priced the shot at 0.75 and that alone
flipped `smoke79`'s thirty-year 66 CE run: a global quarter-speed tax on AI
campaigning, wearing a unit trait's clothes. Confirmed by neutralising the
table (all arms 1.0 → suite green), then shipped at 0.85/1.25, which keeps the
tradeoff visible on the clock (4 days horse / 5 foot / 6 with guns) without
throttling the world. If a later pass wants slower guns, re-measure `smoke79`
and the harness, not just `smoke122`.

The AI picks its arm by DEFICIT against a 75/15/10 establishment, not off a
regiment-count residue. The residue version shipped first and produced 5%
artillery in one chapter and 25% in another purely from where each realm's
muster happened to sit modulo eight — a court whose count landed wrong fielded
a host the triangle answers outright.

The batch measured the harness on three chapters, 8 years, against the parent
commit: 167 BCE none → none, 1948 none → none, 66 CE none → `AGR: BLEEDING`.
Battle counts moved both ways on the stream shift (167 down 162→118, 1948 down
53→29, 66 up 83→108), which is the signature of a reseeded RNG rather than a
direction. Agrippa's flag is the mild kind: three provinces at start and three
at the end, treasury UP (40→60), a brigade still standing (3.8k men against the
base tree's 990) and an income line a talent under water because of it — the
client keeps its army in this stream instead of shedding it at the §52 poverty
threshold. Accepted and recorded; it is not a wound and it is not new physics.

One inherited pin needed widening. `smoke103` (§154) asserted the whole text
of `const docA = doctrinePips(A.gen, phase, false) + airA + armA;` — §181 had
already had to update it once when it added `armA`, and §191 adding `mixA` made
it read as a regression a third time. It now pins up to `airA` and stops: the
claim that suite exists for is that air rides the roll unconditionally, not how
many neighbours the term has. Verified the narrowed pin still bites by making
`airA` phase-conditional again — it fails, which is the whole point of it.

The full battery at §191, measured on the tree merged with main's
§186-§190: **122 of 122 headless suites ALL PASS**, including `smoke90`,
whose 167 crown-cost drift documented above happens to land inside its
allowance on this stream (it is stream-sensitive, not fixed — treat the note
above as still open). The roster landed while §186-§190 were being written,
so it yields the numbering: this section is §191 and its suite is `smoke122`.
Nothing else overlapped — the aid pipe and the schools never touch
`regiments`, and none of main's four new suites reads a unit pattern. `smoke122` is the new contract for this section, and a
browser pass over the three §191 surfaces — the map counters with a rifle, a
tank and a gun flying at once; the province panel's three recruit buttons named
Rifle Brigades / Armored Corps / Gun Regiments, each with its own face; and a
live battle window showing 10 rifles + 4 guns against 5 rifles + 5 tanks with a
`+3 arms` chip on the gun line in the fire phase — passes with no page errors.

Since §193 (a scripted peace binds the courts that signed it): `helpers.endWar`
settles the two courts it NAMES and leaves the war standing for everyone else,
so a chapter card can no longer march an ally home from a war it never signed
away — 614's February 628 is the case that named the rule. Two harness-visible
consequences. Rhodes now signs one map per delegation instead of spending a
single `endWar(EGY, ISR)` on the whole coalition, and the 8-year 1948 run comes
out of it unmoved: same anomalies, same per-nation trajectories, the same 32
battles, and only the war line differs — five courts now settle out where one
dissolution used to cover them. And the `war` bus event has always been three
things — a declaration, an
ending, and a court settling OUT of a war that goes on (SPEC §67/§74/§193) —
while the counter bucketed the third as a declaration. The 1948 line therefore
read `8 started` for three wars the moment the armistice went per-pair. It now
reports `3 started, 1 ended, 5 settled out`, which is what §67 and §74 have
been doing quietly since v6.9.

Measured against the parent commit: `node tools/autorun.mjs 8` is identical on
every bookmark, anomalies and all (67 SEL DEAD + HYR BLEEDING · 40 OSR/HER/ATG
BLEEDING · 529 JUD DEAD — the documented families), and `node tools/autorun.mjs
16 614ce` — long enough to walk past Khosrow's murder — matches the parent
nation for nation, because the all-AI stream settles the great war through the
ordinary AI table years before 628 is on the calendar. That run is also the
counter's own witness: what it used to report as `2 started, 1 ended` was one
war ending and two courts settling out of others, and it now says so. The battery is **123 of 123 headless suites ALL PASS**; `smoke123`
is the new contract, and `smoke59`'s 614 stage-clearing moved with the feature
(it takes a settlement per pair now, which is the rule seen from a test's side).

Since §194 (the sea has a western half): fifteen Mediterranean communities
join the dispersion — Asia Minor and the islands, Greece, Italy and Sicily,
Africa west of Cyrene, Sepharad and Gaul — pure data through the §172/§175/
§176 machinery, each keyed to a cell that exists and windowed on its own
history (the consul's circular of 139 BCE at one end; 1306/1492/1493/1541,
the 1944 deportations and the Maghreb's 1952/1962/1967 at the other). The
harness cannot see it: the dispersion is player-only, and `node
tools/autorun.mjs 4 66ce` / `4 1948ce` are **byte-identical** before and
after the change, anomalies and all. `smoke109`'s era-page counts re-pinned
with the arithmetic in the margin (167 BCE opens 13→18, spans 20→29); the
battery is **124 of 124 headless suites ALL PASS**; `smoke124` is the new
contract.

The §194 set was then measured for power, chapter by chapter, against the
§176 tuning (every open community's four asks summed at boot, theoretical
full-farm, next to `incomeBreakdown` gross): new-set silver is 2-7% of gross
where the crown is solvent, the pauper chapters are dominated by the old
eastern set regardless (Alexandria alone out-earns the whole new fifteen),
the 66/132 additions are all Rome-hosted and war-locked below their own ask
bars, 614's farmable western remainder sustains ~1 talent and ~2 influence a
month, and no new community sends men on day one anywhere. The envelope is
pinned in `smoke124` (size ≤ 3, start ≤ 50, the war gate at 66 CE, the
volunteer bar at 66 and 1948) so a future edit cannot quietly move it.

The world-backdrop batch (eight new content packages, ninety-five dated
`world: true` cards: `events_167bce_republic.js`, `events_67bce_world.js`,
`events_40bce_world.js`, `events_66ce_world.js`, `events_132ce_west.js`,
`events_529ce_world.js`, `events_614ce_west.js`, `events_1948_coldwar.js`)
gives every chapter the OTHER half of its century — the Republic's own wars
from Andriscus to Spartacus, Caesar's Gaul, the Augustan west to the
Teutoburg, the Flavian frontiers to Dacia Capta, the western spine of the
third-to-fifth centuries (Abritus, Adrianople, the frozen Rhine, the sack of
410), the age of Justinian's successions from Gelimer's coup to Heraclius'
fleet, the Christian West legislating about the Jews from Sisebut to the
Seventeenth Toledo, and the cold war from the Berlin airlift to the flag
coming down. All of it follows §104's admission rule (it happens whichever
way the revolt went) and §111's transfer discipline (the only ownership
changes are the ones the inter-chapter atlases already assumed: Macedonia
−148, Numantia −133, Caesar's Gaul −52, Dacia 106, and the evacuation of
Dacia 271 — each by explicit list, off the named losers only). One test pin
moved with the content, exactly as it should: smoke74's "next world event
after 370" is now Adrianople (378), not Cunctos populos (380).

Measured against the parent commit, 8-year harness: five bookmarks
byte-identical or drift-only, and the anomaly set stays inside the accepted
families — 67's come-and-go HYR bleed closes (SEL DEAD stands), 40 and the
rest unchanged, and 529 re-adds the v6.9-documented SAM DEBT-SPIRAL
(self-limiting: income converges positive while debt-desertion sheds the
host). Zero stderr on every run. The long runs, each against a baseline
worktree where the README documents no prior number: `105 167bce` reports
ROM+PAR SNOWBALL (the §111 target outcome, verbatim); `295 132ce` retires
OSR/ADI/CHX (the documented third-century client deaths) with GOT going
1 → 3 on the evacuation of Dacia; `92 529ce` comes back a strict subset of
its baseline (JUD SNOWBALL on both trees — the §162 rising — while the
baseline's GHA and BGD deaths do not happen here); `82 614ce` is clean;
`45 67bce` adds the flags the Alesia card exists to create (ROM SNOWBALL
returns — the long-documented scripted-annexation class — and the free
Gallic tribes end as they ended); and `55 1948ce` keeps IRQ's pre-existing
gulf-arc snowball while the one-province bleeding flag migrates POR → SUI
with the stream (the hovering class swapping members). A catch-up
firecheck boots all eight chapters at their horizons: 95/95 cards fire,
zero guarded warnings. On the tree merged with §194 the battery is
**124 of 124 headless suites ALL PASS**, smoke74's moved pin and §194's
smoke124 both included.

Since §195 (a community with no cell is written to from its host's court):
the dispersion gained a second kind of seat — `tag` instead of `prov` — for
hosts past the map's edge, and a Dispersion section on foreign courts'
Abroad tabs: a court-hosted community (the Jews of America, on Truman's
§180 off-map seat) carries its full ask block there, and communities living
on that court's soil render as rows that jump to their province (Attlee's
Britain lists London beside Tripoli, the BMA being the 1948 fact). London
(from 1656) and America (size 5, stand-in dev 40, opening 60 — past the
volunteer bar on day one, deliberately: Machal) are the two entries. The
harness still cannot see any of it — `node tools/autorun.mjs 4 1948ce` is
**byte-identical** before and after — and a browser pass over both panels
renders the section with no page errors. `smoke125` is the new contract,
and `smoke124`'s §194 pins moved with the feature (37 entries, exactly one
seat each). On the tree merged with the world backdrop above, the battery
is **125 of 125 headless suites ALL PASS**.

Since §196 (the chairs take their turn): the five §185 client chairs get
the §187/§192 treatment — fifteen objectives (one expansion branch per
chair over ground the tag does not start with, court branches from the
houses' own documented deeds) and six roads not taken riding forks the
chapters already chart. No new fork was drawn, so `chapter_paths.js`,
`smoke83` and `smoke117` stand exactly as §192 left them, and the
principal tables did not move by a single index — `smoke2`, `smoke3`,
`smoke16`, `smoke111`, `smoke112` all green unmoved. The AI symmetry
(§102) was measured, not assumed: `node tools/autorun.mjs 8` on 67bce,
40bce, 66ce and 132ce is **byte-identical** to the parent tree on all
four — the new thresholds sit past what an AI-held chair reaches in the
window, so the trees grew reasons for a player without moving the AI's
furniture at all. `smoke126` is the new contract: the grown chains at
11/11/12/14/11 with 2/2/3/4/2 roads, every §196 node dressed and seated,
every conquest target foreign at boot, nothing accomplished on day one,
the forced worlds paying every declared modifier, the off-record rule
live (a road stays dark when only history's marker is set), and the
one-node-per-cell guard finally run over EVERY playable side of every
bookmark — the check §187 and §183 each wished for after finding a
collision in a second-playable tree by hand. `smoke116` moved with the
feature (one new world marker, `speakerForTheNation`; six new roads pay
beside the fifty-eight old ones). On the tree merged with main's §195
(the court-hosted communities), the battery is **126 of 126 headless
suites ALL PASS**, their smoke125 and this section's smoke126 both
included.

The SPEC §197–198 batch (the estates can be asked; the reforms come home
to the Crown) is player-only on both halves and measured as such:
`monthlyFactions` returns before the favor bank for every AI hand, the asks
live behind the same gate, and the reforms move is a panel-template affair
the sim never reads. `node tools/autorun.mjs 4 66ce` and `4 1948ce` against
a clean-HEAD baseline worktree are **byte-identical**, anomalies and all.
`smoke127` is the new contract (renumbered twice as main's §195 and
§196 landed first), `smoke119` is rewritten in place to the §198
contract, and the browser suites the batch touches — uitest8, uitest15,
uitest37, uitest38 (its §188 section rewritten to the split), uitest41
(new) — all come back ALL PASS on SwiftShader with zero page errors. On
the tree merged with §195 and §196, the battery is **127 of 127
headless suites ALL PASS**.

Since §200 (the trees grow to the size of their chapters): every playable
side out to 18–23 mission nodes — 278 across the fifteen playable sides, up
from 201 — plus five new forks with ten new cards, including the two wars of independence
the roster never offered (Agrippa against Rome in the year of the four
emperors, Adiabene against the King of Kings). Both follow the §61 vassal
rule exactly: the bond severs first, then `declareWar(…, 'independence')`,
so the overlord can only restore the yoke through the subjugation clause.
The other three forks are the diadem (167), Herod's testament (40) and
Julian's offer to rebuild the Temple in 363 (132).

The pass found four defect classes the suite could not previously see.
Chapters fold the map their own way (§47 merges, era foundings), so a
mission naming a province its own chapter never seats is uncompletable for
ever, silently — four new branches had it and are repointed at ground those
chapters have, and `smoke129` now resolves every province every mission of
every playable side names through `ctx.prov`, the same lookup `controls()`
uses, so era renames and `p.canon` aliases resolve instead of reading as
holes. A stray comma before a closing bracket is an ELISION rather than a
syntax error: `filter` and `map` skip holes silently while `find` walks into
one and hands `undefined` to its predicate, so one misplaced comma in each
of four packages took out five suites with stack traces pointing at innocent
code — `smoke129` now walks every era chain by index, which is the only
check that sees a hole. `smoke74`'s date-and-trigger rule caught all five
new terminals (a card with both has its trigger silently ignored, so each
would have fired on its month whether or not the fork was answered); they
carry era windows now. And `smoke66` reads a chapter's victory strand as
"banner to end of file", so cards appended at the tail inherit the strand's
sovereign-and-capital rule — the new fork terminals moved above the banner,
where the chapter body is.

Measured against the parent commit, 8-year harness on all eight bookmarks:
the anomaly set is exactly the documented accepted families and nothing
else — `67 SEL DEAD`, `40 OSR/HER/ATG BLEEDING`, `529 JUD DEAD + SAM
DEBT-SPIRAL` (the v6.9 self-limiting spiral), the other five clean — with
zero stderr on every run. The new thresholds sit past what an AI reaches in
an eight-year window, so the trees grew reasons for a player without moving
the AI's furniture.

`smoke129` is the new contract; `smoke39` caught the five new terminals
single-optioned before any of it ran (v6.1: anything the player answers
offers at least two answers) and they now deal a real choice apiece. The
moved pins: `smoke2` (21 at 66, 22 at 132), `smoke3` (23 at 67), `smoke111`
(21 nodes, cols/rows vectors extended), `smoke112` (21), `smoke116` (73
roads not taken), `smoke126` (the §196 chairs re-counted), `uitest2` (21
medallions). On the tree merged with main's §197-§199 the battery is **129 of 129 headless suites ALL PASS**, their smoke127 and smoke128
and this section's smoke129 all included.

---

## §201 — every chapter argues about something

§190 built the quarrel engine for the Pharisees and the Sadducees and left
seven chapters with a Faith tab that showed an expectation gauge, a pilgrim
road and nothing about the argument each of them is actually about. The
engine is unchanged; the content became a table of quarrels keyed by id,
and each bookmark maps its courts to one (`schools: { HER: 'fence_and_gate' }`).
The poles were renamed `oral`/`written` to `hi`/`lo`, matching the doctrine
axes — in 1948 neither side is an oral tradition.

Seven quarrels: the Hasmonean pair (167 from 140 BCE, both brothers in 67),
Herod's Sanhedrin against his imported priesthood, the offering for Caesar
and what followed it in 66, Akiva's schools against the Nasi's war office in
132, the Samaritan Council of Seven against the Gerizim priesthood in 529,
the academies against a restored altar in 614, and the letter of June in
1948. Two courts had no second religious seat and both absences were bugs:
Herod's roster was the one court in the game where the altar had no voice,
in the reign that rebuilt the Temple, and 1948 had three secular seats and
nobody who could have signed the status quo letter. They gain **the House of
Boethus** and **the Religious Bloc**, with estate ground and — because §197
requires every seated party to be askable — authored asks apiece.

Two latent Hasmonean assumptions came out with the generalization, both now
regression-tested: the shared breach line charged `pilgrimMult` against
ascents a Temple-less chapter does not have (a quarrel may now override the
shared effects and text, and 1948 does), and the office branch would have
docked an Israeli cabinet legitimacy every month for not appointing a High
Priest — it is gated on §169's own Temple test now, which is the same
anachronism that gate was built for arriving by a different door. The
`priestly: false` sweep also reached further, because the office panel now
appears at courts §190 never looked at: Herod's Idumean family and hired
swords and Antigonus' Parthian party come off a ballot they were never
eligible for.

`smoke121` is the contract, grown a §201 section that walks all eight
bookmarks — the declared quarrel convenes, both its sides are real seats of
that court, the needle is labelled at both ends with the chapter's own
names, every chapter opens *Unruled*, no ruling id collides across chapters,
and ruling every dispute one way reaches the pole in every quarrel.
`uitest40` drives two chapters in a real browser: the Hasmonean quarrel in
167 and the Status Quo in 1948, two headings and two sets of poles. Merged
with main's §197-§200 the battery is **129 of 129 headless suites ALL
PASS**, `smoke127`, `smoke128` and `smoke129` all included.
