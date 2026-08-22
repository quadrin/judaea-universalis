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

Since §228 (Jordan, Syria and Iraq re-rastered) two more flags sit in the
accepted set at the default eight years, and both are the seeded stream moving
rather than anything breaking. `132ce JUD: DEBT-SPIRAL` is the Return holding
ALL eight of its provinces to the end instead of losing two, and paying for the
host that holds them — the README's own "bleeding and in debt after the hidden
armories expire", arrived at a year or two earlier. `1948ce ETH: BLEEDING` is
Ethiopia, six provinces and an income near zero, four thousand kilometres from
anything this section touched. Adding cells changes the province count and the
folded centroids, and every campaign after that draws different numbers; the
ancient chapters' ADJACENCY is what §228 holds fixed, and smoke153 holds it.
Re-run once more on the merged tree that carries this section AND the crown
war's §226: the anomaly set is the union of the two notes and nothing else —
`167bce PAR`, `67bce SEL`, `40bce HER` (the crown war's own documented move),
`132ce JUD`, `529ce JUD` and `1948ce ETH`.

Since §230 (the neighbours' country at the resolution Judea is played at) the
set moves again, and for the reason §228 already wrote down: this section adds
twenty-five districts to the ancient chapters, so the province counts and the
folded centroids move, and every seeded campaign after that draws a different
stream. What §230 holds fixed is DEVELOPMENT — every realm in every chapter
opens on the total it always had, which `smoke155` checks tag by tag — not the
eight-year trajectory that total then produces.

Measured on the merged tree at the default eight years — and once more after
§230's seed retune, which re-rolls the stream again: the union of the two runs
is `167bce PAR` and `167bce HAS`, `67bce SEL` (dead, Pompey's arc), `67bce
ARI`, `67bce ITU`, `40bce ADI`, `132ce JUD`, `529ce JUD`, and the post-retune
run is a strict subset of it (`167bce PAR · 67bce SEL, ITU · 40bce ADI · 529ce
JUD` — HAS, ARI and the 132 rump drift off with the stream, as members of the
come-and-go families do). After the withdrawal of the three Decapolis cells
(§230 again) the set re-rolls once more: `67bce SEL, ARI · 40bce ADI · 132ce
JUD · 529ce JUD, SAM`. The one new name, `529ce SAM: DEBT-SPIRAL`, is the
threshold catching a treasury the two prior §230 runs left at −154 and −194:
the arc is identical in all three (income −2 recovering past zero while
debt-desertion trims the war-bloated 9,000 to 1,000), Samaria's four cells are
pixel-identical across them, and the flag is the ARI/HYR self-limiting class
landing a seed's width past −200. The §231 silhouette restoration (the sown
Levant's child seeds pulled inside their own fold-families) re-rolled the
stream once more and the set came back the smallest of the day — `167bce HAS ·
67bce SEL, ITU · 529ce JUD` — a strict subset of the documented families. Every one is in a family this file already documents,
and three deserve a word because they are new *names* in an old family:

- `67bce ITU` — Ituraea, two provinces and nine development, treasury 60 → 32.
  This is the two-province-outpost class that `167bce PAR` has occupied since
  v5.0: too small for the flag to mean anything, self-limiting, no spiral.
- `40bce ADI` — Adiabene, four provinces since Arrapha became its own district.
  Income reads −0.2 while the treasury RISES 70 → 165, which is the ARM/GHA
  hovering class: the flag reads the operating ledger, the purse disagrees.
- `529ce JUD` is not a death. The Keepers' chapter seats no Jewish state in 529
  by design (§162) — JUD is a dormant court with zero provinces until the rising
  at Caesarea in 556 — so an eight-year all-AI run reports it DEAD every time.

`40bce HER` and `1948ce ETH` dropped off; both are come-and-go members of the
same hovering families, and neither is near anything this section touched.

The §232 reading (the drawn European borders, the Belgium/Luxembourg carve,
and 1948's consolidation): `167bce PAR · 529ce JUD` at eight years, with
`66ce` and `1948ce` clean — the smallest set yet, and both names are charter
members of documented families (PAR the two-province-outpost class it has
occupied since v5.0, 529's JUD the dormant-by-design court). The west's
raster changed under every ancient chapter and no western court tripped a
flag; 1948's consolidated background — thirty-one courts, fifteen of them
now one-province states — runs without a mark, and the war still reaches
Rhodes on schedule.

Run the 1948 chapter out to its full length (`node tools/autorun.mjs 55 1948ce`)
and LEB BLEEDING is in the accepted set from §224 onward. Lebanon comes out of
1975 carrying The Civil War permanently (−40% income), the Green Line, the
Party of God and the security belt, and it now fights the 1982 war on its own
account rather than summoning Riyadh and Baghdad under a 1950 treaty that
should have lapsed at Camp David. A state the chapter has dissolved into
militias running a small deficit thirty years later is the model working. It
does not spiral — the treasury stays near zero and debt-desertion trims the
army — and nothing else in the chapter is flagged at 55 years.

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
pathing. The snapshot is FULL-RESOLUTION: it is computed under an IDENTITY
province mapping (SPEC §232), so it carries every permanent cell's own
geometry regardless of what any bookmark folds. It used to be dumped from a
live 1948 campaign because 1948 was the one chapter with every latent cell
active — until §232 made 1948 also the chapter that CONSOLIDATES the
established world into one province per country, and "full resolution" and
"the 1948 profile" stopped being the same thing. Headless consumers fold it
per bookmark through buildProvinceMapping (autorun's foldGeom) — the same
collapse computeGeometry performs from the live raster. REGENERATE whenever
js/data/map_data.js changes: serve the repo and run
`tools/tests/dump-geometry.mjs`, which boots the title screen under
Playwright, computes computeGeometry(window._renderer.idArray, MAP_DATA,
identity) in-page, writes the snapshot, prints Sinai's measured
bounds/neighbors, and leaves a Sinai screenshot in `/tmp`. Any browser
console works too — the same three imports, no campaign needed.

"Every latent cell is active in 1948" is still a real invariant — `smoke27`
asserts it — but it now guards CONTENT (a district that no chapter can reach
is a district nobody wrote for) rather than the snapshot, which no longer
depends on any bookmark's profile. §232's consolidation keeps the British and
Irish city cells in `activeProvinces` and then folds them, so the invariant
and the one-province United Kingdom coexist.

Since v6.8 (SPEC §160) the boot is minutes, not seconds — the ID pass is one
fullscreen draw over every texel against every seed, and this runs on
SwiftShader. Measured at v6.8: 74s to the start screen, 104s to a live
campaign (25.0M texels × 307 seeds), against 17s and 47s on the pre-§160
tree. The §205 frame is 46.0M × 373 — about 2.2× that work again — so the
timeouts in `dump-geometry.mjs` doubled with it. A slow dump is the frame's
cost and not a flaky selector. (§232's identity dump no longer starts a
campaign at all, which gives a few of those minutes back.)

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

The SPEC §226 batch (Herod's collar, the crown war, the yoke thrown off)
re-ran the full 8-year harness against the parent tree in the same environment.
**Seven of the eight bookmarks came back byte identical.** 40 BCE is the one
that moves, and only because it is the chapter that changed: `HER.overlord =
'ROM'` at setup puts 15% of Herod's revenue into Rome's ledger from July of 40,
which perturbs the seeded stream from the first month.

Its flag moves inside the family the chapter has always had. §225's parent run
comes back `40bce HER: SNOWBALL` (Herod 8→14 provinces, Antigonus reduced to
13); this one comes back `40bce HER: BLEEDING` (Herod held at 8, Antigonus at
21, both hosts at zero by the eighth year). Both are the long-documented
40 BCE class — *"HAS/HER/ATG bleed while their fight-to-the-death scripted wars
run (plunder-funded underdogs)"* — and the pair has traded places on this
bookmark before with nothing more than a redrawn province list behind it. The
same batch against §224's tree, one commit earlier, was byte identical on seven
bookmarks with the anomaly set identical on all eight; the northern frontier's
ten new cells moved the draw between them.

One deliberate cause sits underneath the seeded part. Before §226 the AI settled
the crown war as ROME, because §61 promoted Herod's overlord to the head of his
side — and Rome's reach is the Mediterranean, so the treaty it wrote could take
half of Judaea. Now the claimant holds his own pen and demands only what his own
territory can reach (§116), which is Idumea and a stretch of coast. A crown war
that grinds for three years while its patron wins the wider one is the shape the
chapter is about, and the underdog bleeding through it is the accepted flag, not
a regression. The clause itself NEVER FIRES in an all-AI run: the planner takes
it only at 80 war score, which is why 67 BCE (the documented brothers'
stalemate) is byte identical too. If 40 BCE ever comes back with `ATG DEAD` or
`HER DEAD` and one fewer war, that is the clause firing, and it is the model
working rather than a regression — but check it against this note first.

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
`smoke151.mjs` owns the SPEC §226 batch (Herod's collar on day one, the crown
war's pen and its whole-kingdom clause in both Judaean civil wars, and the
client's own war of independence).
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

`smoke138.mjs` owns the SPEC §211 civil band: the three strands (`civil:
'govt'|'region'|'court'`) every playable chain now carries beside its war
ladder. Two of its mechanisms are worth knowing before you read a failure in
it. Its pay test builds a **maximal realm** — every dial to its stop, the
whole map owned — and asserts every civil node completes there; a node that
does not is dead content, which is the one mission bug that never throws. That
realm has to be **re-asserted before every pass**, because the missions above
the band pay out as they complete and some of those rewards shift a faction or
spend a treasury, so a snapshot decays out from under the band it is testing.
And its AI-hand run boots each chapter **with somebody else on the throne**, to
prove the government and region strands are earnable without a court:
`monthlyFactions` runs for the player alone, so that run must leave the court
table *absent* rather than full — fill it and any check reading `t.factions`
directly instead of through `factionApproval` will fake its own reachability.
It also owns the crown: `MLI` lives in `FORMABLES` rather than a bookmark, so
it is proclaimed per chapter and checked there — and its pay test covers the
whole 22-node chain, not just the band, because a stub tree is where dead
content hides. Three things the maximal realm has to do that are easy to
forget when extending it: seat an **heir** (succession rungs are dead
without one), **convert** the provinces it grants to the tag's own religion
(several chains count land "keeping the Law", not land held), and resolve the
court through the engine's `factionDefs` rather than the bookmark's table —
a formed crown inherits its origin's court and appears in no bookmark's
`factions` at all.

Adding missions to a playable chain means updating the exact node counts in
`smoke129`'s PRINCIPALS, `smoke126`'s GROWTH, `smoke120`'s spine/branch/chain
census for the crown, and the index-based layout
assertions in `smoke111` (which pin the whole col/row string), plus the
totals in `smoke2` and `smoke3`.

`smoke134.mjs` owns the SPEC §207 drumbeat: one mission completion per realm
per monthly pass, then a rest of `MISSION_PACE_MONTHS` before the next may
land. If you write a suite that forces a world and expects the pass to pay
for it, do what smoke111/116/120/126/129 now do — pump `checkMissions` in a
loop (each call is one synthetic month) instead of calling it twice, and pump
the no-free-lunch sections too, or a free node hides behind whichever era
objective absorbs the first beat. Note the rule the suite pins hardest: a
month whose checks all FAIL charges no rest, so the fail-then-fix idiom
(smoke16's Third House) still completes on the very next call.

`smoke137.mjs` owns the SPEC §210 conversion: the Idumean cult of Qos seated
in the 167 chapter only, the standing heathen charge it puts on the south
country, and `ev_idumea_policy` moving the makeup rather than the paint. Two
traps if you touch this. First, the base atlas MUST stay Jewish at Adora and
Hebron — the suite asserts `MAP_DATA` directly, because a §210 that leaked
into the atlas would hand the other seven chapters an unconverted Idumea in
centuries where the conversion is a settled fact. Second, any card that gives
a province a faith must go through `helpers.changeFaith` and not through
`p.religion =`: since §56 the communal-unrest rows read the MAKEUP, and the
next `normalizePop` writes the old majority's faith back over a province whose
label alone was changed.

Since SPEC §210 (Idumea keeps the cult of Qos until the covenant): the seeded
8-year 167 run is NOT byte-identical with the runs before it, and that is
expected. Hebron and Adora open the chapter under the Seleucids, where a pagan
cult is a same-group heretic (1.5) and the Law was a heathenism (3), so the
two cells start 1.5 unrest quieter than they used to from the first month —
which moves revolt rolls, which moves the shared RNG stream, which moves the
whole world. `node tools/autorun.mjs 8 167bce` now reports `167bce PAR:
BLEEDING`, the v5.3-accepted two-province Parthian outpost, and the Hasmoneans
grow 3→4 and live. A 15-seed sweep across both trees pins that flag as drift
rather than as this section: 6 of 15 seeds before, 5 of 15 after, flipping in
both directions on individual seeds. If you re-tune anything here, sweep seeds
before believing a single run — the 167 chapter's own court sits close enough
to the line to throw a one-seed flag on either tree.

`smoke140.mjs` owns the SPEC §213 works: the program table audited against
1948's own base..ceiling window (every unlock a military rung, every
prerequisite on the same court's roster and opening no later than what needs
it, every effects key one the sim consumes, every `works` an arm §181 gates)
and every other chapter proven to have no works at all; the five refusals in
their own words; the arc (charged once at the start, billed thereafter as the
`develop` row of `incomeBreakdown` — `monthlyPrograms` moves clocks and never
touches a treasury — and delivered permanently into `t.ideas`); the arm-by-arm
gate, where a delivered Nesher opens `raiseAirWing` while `recruitRegiment`
still refuses the tanks; the sale in both directions with the §181 fee landing
in the treasury that paid for the shops; the Lavi's two endings; the AI's
one-at-a-time rule and its bankruptcy branch; and a pre-§213 save reviving with
an empty book. If you add a program, that suite is where its numbers are
checked — and note that Israel's only prerequisite-free work is the Uzi, so a
test that wants two lines running has to deliver it first.

`uitest44.mjs` drives the same section in a real browser: The Works of Our Own
drawn on the Host below How We Muster, a locked card naming its rung and the
Lavi naming the two works it owes, one press starting a line (months, progress
bar, Abandon button, and the monthly bill appearing in the block) and one press
closing it again, the summary line flipping from "Every gated arm is still an
import" to "We build our own aircraft" to "…aircraft and armor — and sell to
others" as works land, and 167 BCE drawing no block at all while its Host keeps
How We Muster.

Since SPEC §213 (the works of one's own): the 8-year set is **byte-identical**
on every bookmark, and so is `node tools/autorun.mjs 57 1948ce` — no AI court
reaches mar 20 with a comfortable purse inside either window, because `aiTech`
will not race the age and this chapter's AI spends its martial points on
reforms and era ideas first. That is the honest report, not a bug: the works
are a player decision in practice and a rare AI one. If a future tuning pass
loosens the AI's point spending and 1948's trajectories start moving, the
programs are the first place to look.

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

## The constitutions a fork adopts (SPEC §214)

`smoke141` is the new headless suite. It holds three things that are easy to
break from different directions: the GOV_TYPES table (every government named,
described, effective and archetyped, with the four STARTING constitutions
pinned to the effects every bookmark is balanced against), the rule that no
file decides a succession question by matching a government NAME — it greps
`realm.js`, `crisis.js`, `revolt.js`, `military.js`, `courts.js` and
`nation_panel.js` for `govType === '...'` in code — and every option of the five
fork cards that ask what kind of state this is — sixteen of them, fifteen
adopting a constitution — fired through the live cards rather than read off a
table in the suite.

If a new government is added, it needs `archetype` or the §163 foreign-court
seats fall back to the King's Men, and smoke141's court section says so by
name. If a new fork road adopts one, write `setGovernment` at the option's own
call site and name the constitution in its tooltip; both are checked as text,
on the same reasoning as smoke83's road markers.

## The tree stands as long as the realm does (SPEC §215)

`smoke142` is the new headless suite, and it is a bug-fix contract rather than
a feature's: it holds the two conditions under which the mission tree may
leave the panel. It may leave when the realm dies. It may not leave because a
chapter verdict landed (`endGame` keeps the campaign running and
`checkMissions` keeps working the chain — the panel read was the only surface
that treated `g.result` as an ending), and it may not leave because the player
proclaimed a crown whose formable carries no chain of its own (`missionsFor`
now falls back down the §102 lineage the way every other bookmark table
already does, after the formable's own chain rather than before it).

If you add a formable, it does not need a `missions` list — the crown will
keep the chain the realm was already working. If you give it one, that chain
wins, and `smoke120`'s §189 section is where a chapter filter goes wrong.

## Two Jewish states at one table (SPEC §216)

`smoke143` is the headless half: the lobby's two pure decisions
(`chapterChairs` / `resolveSeat` in `js/net/mp_state.js` — which of a
chapter's standards a campaign can seat, and what an unpicked or impossible
pick falls back to), the chair rule itself (`isHumanChair` / `humanChairs` in
`sim/military.js`), a card addressed to a seated rival court being dealt to it
rather than resolving itself, the §70 decider notice measured against the
audience instead of the host, `factions.js` and `courts.js` dividing the map at
the seated chairs, the two courts' demand books not colliding on the
`pharisees` id both brothers of 67 BCE authored, and a mid-table save reviving
as a solo campaign.

Every section of that suite has its single-chair twin, and that is the thing to
keep true when touching any of it: `humanTags` is `[playerTag]` in solo play,
in every save and in every autorun, so all of this is a no-op unless a guest is
actually sitting somewhere else. If a change here moves a solo campaign, it is
wrong — the balance harness is the second opinion, and it came back **byte
identical on all eight bookmarks** (`node tools/autorun.mjs 8`, diffed against
the parent tree).

It caught one, and it is the trap to know about if you generalize anything else
from "the player" to "a seated chair". An autorun empties the protagonist chair
by setting `ai` on it, so a rule rewritten as "not a human chair, therefore a
foreign court" is TRUE of that tag in the harness — `courts.js` began convening
three parties for a court that has never had any, the seeded stream moved, and
every trajectory on every bookmark moved a little with it. `courtSeats` keeps
excluding `g.playerTag` unconditionally and only adds the guests; smoke143
pins it.

`uitest45` is the browser half and needs two contexts, so it is the slowest
suite in the battery: 67 BCE hosted as Hyrcanus with the guest seated on
Aristobulus over real WebRTC (the hand-carried invite flow, no cloud), both
chairs human, each convening its own estates, the guest marching an
Aristobulan army through the host, and `ev4_embassy_ari` — a real card from the
chapter's own chain — dealt to the guest with live buttons whose answer lands
in the host's world. `uitest5` is the co-op suite and is deliberately untouched:
the default table is still one realm and many hands on the tiller.

The suite grew a second half after the first table played it and reported that
one player's spending came out of the other's purse. It did not — every action
already ran under the guest's own crown, and `smoke143` proves it action by
action — but the *books* did not follow: five cooldown ledgers keyed by what was
acted upon with nobody in the key as the actor, so the guest's festival shut the
host's out, one court's forgers idled the other's, and an envoy rebuffed
rebuffed both. The dispersion was worse than a key: standing was one number per
community, so both crowns courted Alexandria out of one bar.

If you add a cooldown, **put the acting realm in the key**. If you add anything
a crown earns with somebody outside its own borders, ask whether a second crown
would share it. The sweep that found these lives in the suite's second half:
after the guest acts, the host must still be able to do the same thing.

## A crown of its own (SPEC §218)

`smoke145` owns releasing a client state: the two abstractions a grant is made
out of, the five things that can never be granted, the five refusals in words,
the grant itself, contiguity against the real map, the second grant enlarging
the first client, determinism, the save, and the action as the panel presses
it.

Three things to know before you read a failure in it.

It boots from the geometry **snapshot** rather than a stub, for the reason
smoke77 documents: the contiguity rule is invisible on an empty adjacency
graph, and this section leans on it twice (the Decapolis and Greece are the two
pockets of one identity, and only one of them may be offered).

Its setups **make peace first**. Every chapter opens with its own war running,
and a grant is a peacetime act by design (the rule §61 already applies to
weaving a union, pointed the other way) — so a section that forgets `peace(ctx)`
fails with the wartime refusal rather than with anything it was testing.

And its determinism section is the canary for the harness claim. Nothing in
§218 touches the seeded stream: the state's tag is a hash of identity and
bookmark, its ethnarch a hash of tag and seat. A granting campaign and a
non-granting one must draw the same next three numbers, and two campaigns on
different seeds must seat the same court under the same man. If you make any
of it roll, that suite fails and `node tools/autorun.mjs 8` stops being byte
identical — which it is, on all eight bookmarks, because no AI court ever
grants a crown out of its own realm. The one call site is the player's own
action, and smoke145 reads the AI half of `js/sim/` as text to keep it that
way.

## The collar comes off (SPEC §219)

`smoke146` owns releasing a client kingdom. Its central assertion is an
`inventory()` helper — every province with its controller and autonomy, every
regiment with its strength and station, the ruler, treasury, manpower,
technology, reforms and constitution, serialized before and after — and the
test is that the string is IDENTICAL across the release. If you ever make this
act move anything besides `overlord`, that is where it will fail, and it is
supposed to.

Three things to know if you touch it.

It builds its subject with §218 (`withClient()` seats a Phoenician state on the
coast and then frees it), so a break in `releaseClientCore` fails this suite in
its setup rather than in an assertion. Read smoke145 first when both go red.

Its 66 CE section is the age clause, not decoration: Rome opens the Great
Revolt holding Agrippa by script, and the point is that a collar can be struck
in a chapter whose `clientKingdoms` switch is on OR off — §142 gates making
clients, never unmaking them. If you add a mechanic gate to `freeClientInfo`,
that section is what tells you.

And its strain section collars living courts until it is one past
`DIPLOMACY.freeClients` rather than naming three tags, because which small
courts are alive in 167 BCE is a bookmark detail that has moved before. The
first draft named ITU, which is not seated in that chapter, and quietly tested
three collars against a three-collar allowance.

`uitest47` carries the browser half of both §218 and §219 in one boot — the
grant makes the client, the last section lets it go — which is worth keeping
that way: booting this frame on SwiftShader costs more than every assertion in
the suite put together.

## A banner nobody is flying (SPEC §221)

`smoke11` grew the section, and it is the suite to run after touching
`switchTagCore`, `formableList` or `FORMABLES`.

The assertion worth knowing about is not the crown, it is the debt. Bonds
recorded against a court survive it — `diploBonds` skips the dead rather than
forgetting them — so the suite deliberately gives the doomed court an ally
before killing it and checks the entry is gone once the banner changes hands.
If `freeBanner` is ever weakened, the failure reads "the dead revolt's
alliances do not come with its name" rather than as something mysterious three
sections later.

Two things a new formable of this shape needs. It must be player-only: the AI
still refuses any tag that exists at all (`aiFormNation` was deliberately left
on the older gate), which is what keeps `node tools/autorun.mjs 8` byte
identical. And if the chapter already has a mission table under the target tag
— 66 CE has one under `JUD` — the formed crown inherits it through
`missionsFor`, which is the intended behaviour and not a bug to route around;
nodes already satisfied on the day of the proclamation complete on the next
monthly pass.

## A treaty that runs both ways (SPEC §222)

`smoke147` owns it: the concession list at the peace table, the losing crown
buying its ending, the net ledger, and the peacetime deed.

Two traps if you read a failure in it.

Its `losing()` helper builds the war **by hand** after `declareWar` — forcing
`attackers`/`defenders` to one court each — for the reason smoke38's §220
section documents: a war declared on a client drags the protector in, and a
protector's development changes every number the table computes.

And its peacetime section opens by asserting a province *cannot* be given away,
which is not a bug in the fixture. This suite runs on the synthetic bead
geometry, where "next door" means the neighbouring province id, so a fresh
Judaea is genuinely bound to nobody and adjacent to nobody who governs. The
section then opens each road to a recipient in turn — a neighbour, then an
ally — which is a better test of the rule than a map where both happen to be
true at once.

The claim that keeps the harness still is narrow and worth preserving: a deal
with no `concessions` in it runs through arithmetic identical to the old code
(`offered` is zero, `net` is `cost`), and `buildAiPeaceProvinces` is untouched,
so no AI ever offers or expects one.

## What §229 does to the trajectories

The mission overhaul reaches the harness through the AI, because §102's
symmetry is preserved: a court with no panel to click still banks its chain on
the calendar, so it now meets **harder** bars (musters ×1.4, purses ×1.5,
development ×1.25, war score +10/+25 → +20/+40) and, when it meets them, keeps
**permanent** modifiers where forty-nine of them used to expire. Every all-AI
economy moves a little as a result, and the seeded runs move with them.

An all-AI run seats nobody, so `isHumanChair` is false everywhere and every
chain banks on the calendar — which is the only thing a run with no hands can
mean, and keeps the harness measuring the sim rather than the panel.

`node tools/autorun.mjs 8`, measured against §228's own tree (the re-raster
moved the map under this comparison, so the §226 numbers this section first
carried are not the ones to read it by). The set gets SHORTER by three:

- **40 HER: BLEEDING** and **132 JUD: DEBT-SPIRAL** and **529 SAM:
  DEBT-SPIRAL** all clear. Permanent rewards are worth more to a court that
  can meet the bars than the expiring ones were, and these three can.
- **167 PAR: BLEEDING**, **67 SEL: DEAD**, **529 JUD: DEAD** and **1948 ETH:
  BLEEDING** are unchanged from §228 — all four are §228's own accepted set.
- **67 AED: EXHAUSTED** is the one addition, and it is the smallest court on
  the board: a three-province Aeduan chiefdom in an all-AI 67 BCE, income 0.6,
  no army and no treasury either way, whose manpower pool now empties instead
  of ending the run at 909. The §2.4 small-token class — GRM, MAS, CTB, LUS,
  AVN, SEQ, BLG — drifts in and out of these lines run to run; this is one of
  them crossing it.

Accepted as of §229: 167 PAR BLEEDING · 67 SEL DEAD + AED EXHAUSTED ·
529 JUD DEAD · 1948 ETH BLEEDING · everything else clean.

## §235 — the sixth chapter, and what the harness says about it

`smoke158.mjs` owns The Rising Against Gallus (351 CE): the chapter registered
and sorted sixth in the carousel, the three-town start with Tiberias left in
the Empire's hands, the era signposts (Aelia, Diocaesarea, Diospolis,
Nicopolis, Constantinople), the thirty-month window on Rome's books at month
one, both wars running, the twelve fork markers and their distinctness from
132's, the fourth century declared as a drift that dips under Julian, the moon
and the reckoning convening with both seats seated, and the victory contract
answering at both ends.

Three existing suites gained the chapter rather than a new file, because they
are the places the game counts itself: `smoke83` learned which files carry the
chain (that mapping is deliberately written twice), `smoke116` gained a forced
world that pays all six of its roads, and `smoke119`, `smoke121` and `smoke129`
took the chapter into their per-chapter tables.

## §238 — the West comes apart

`smoke159.mjs` owns the collapse arc (`events_351ce_collapse.js`): the eight
dated cards registered once each, every province name in all four transfer
lists resolving on the chapter's own map (a typo here does not throw — it
silently leaves Egypt in the western Empire for ever), the line of 395 checked
province by province from both sides, the war and its score following the
ground east while a Gothic war stays west, the five courts arriving in order
on ground of their own with the West shrinking monotonically and still holding
Italy in 439, the East never losing a province to any of it, and the whole arc
run over ground Rome no longer holds without throwing or seating a kingdom on
somebody else's provinces.

The harness is unaffected at the default eight years: the arc's first card is
dated 395 and `autorun 8` on this chapter stops in 359.

## §239 — the rival purple, and one new accepted flag

`smoke160.mjs` owns the civil-war courts: the `USR` banner (defined, emblemed,
and seated by no chapter's roster), the `dissolveTagCore` primitive from both
ends — ground, garrisons and treasury folded home, the civil war ended with
the man who was fighting it, every OTHER war inherited by the survivor, the
third party re-pointed at a country that exists, the letters forwarded, and a
human chair moved rather than deleted — and then all five scripted civil wars
played through: Magnentius (351, standing at chapter start), Vitellius (69),
Palmyra (269), Carausius (286) and the Heraclii (608). Each one raises the
court, holds ground, fights the government it is claiming from, and gives it
all back when the card that settles it fires.

**`351ce ROM: SNOWBALL` joins the accepted set**, and it is the scripted class
the file already documents (Pompey, Gindarus): Rome opens this chapter holding
111 provinces because Magnentius holds the other 80, and takes them back by
card at Mursa and Lugdunum — 111→191 by 353, which is 1.7× and trips the
threshold. It is the chapter's own history arriving on schedule. The other
three chapters this section touches re-roll their seeded streams from the year
the split fires (69, 269, 608) and come back inside the long-documented
families: `66ce ADI: BLEEDING`, `132ce JUD: SNOWBALL`, `529ce JUD: DEAD`.

`node tools/autorun.mjs 8 351ce` comes back with **no anomalies**. The shape of
it is worth writing down: the all-AI rising neither dies nor grows — three
provinces at the start and three at the end, an army ground down from six
thousand to almost nothing, a treasury that never leaves the low double digits,
and both opening wars settled by the ordinary AI peace path within the window.
That is the chapter working. The rising has no economy to snowball with and no
government to spiral into debt with, and the interesting failure modes it does
have — the towns burned, the century converting the province out from under a
Jewish state — belong to a human's decisions and to `faithDrift`, neither of
which an eight-year all-AI run exercises.

`smoke167.mjs` and `uitest52.mjs` own §247's old names. The headless suite is
mostly a *catalog validator*, and deliberately so: `js/data/revivals.js` names
provinces, cultures, faiths, constitutions, name pools and idea keys in
strings, and nothing at runtime can tell a typo from a province that simply
changed hands — the row just never appears, in silence. So every core and land
is checked to be a real map cell, every reference to resolve, no tag to collide
with the 142 in `DEFINES.TAGS`, and no two countries to claim the same core
(the invariant the core-outranks-a-land arbitration rests on, without which
Assyria deletes Kurdistan by being two lines higher in the file).

The second contract is the one that caught a real bug during the section:
**every chapter must be able to raise something**. Cores are checked against
each bookmark's own `buildProvinceMapping`, because a core that is a LATENT
cell outside 1948 — Nineveh folds into Hatra, Characmoba into Medaba — is a
country that cannot be raised in seven of nine chapters and says nothing about
it. Assyria was written with Nineveh and now asks for Assur and Arbela, which
exist in all nine.

`uitest52.mjs` is the browser half: the congress on a beaten Seleucid empire
lists *Restore Phoenicia* beside the culture buckets, marked and carrying its
historical case in the tooltip; at +28 war score it moves to the dimmed block
below with the reason in the row, where a forced click moves no total; and at
+100 ticking it prices the treaty, burns its six provinces solid on the map,
and signing puts Phoenicia on the board under a suffete. Screenshots land in
`JU_OUT` as `ju-246-peace-table.png` and `ju-246-after.png`.

Neither runner's numbers move: revivals are a peace-table term a human takes,
and the AI does not originate releases, so `node tools/autorun.mjs 8` is
untouched by the section — the accepted anomaly families above stand unchanged.

**The section then retired the culture buckets it was written beside**, and
three older suites moved with them rather than being deleted, which is the
distinction worth keeping. `smoke53` proved §76's "a state can be raised from
land no fallen court remembers" through a `kind: 'create'` row; the contract is
unchanged and now runs through the catalog. `smoke145` proved §218 offers the
Phoenician coast as a state of its own people; it does, and the state is now
called Phoenicia. `smoke77`'s second block is the one that needed real work: it
proved §109's "a state grows along its own border" by planting a synthetic
cultural state on a `releaseIdentity`, which no longer exists. It is rebuilt on
the path that survives — Nabataea's ten-province homeland is one piece with an
articulation at Hegra, so removing Hegra leaves a seven-province north and a
two-province south, and a Nabataea seated beside the smaller pocket is offered
that pocket rather than the larger one. Same contract, same numbers asserted,
different vehicle.

One consequence shows up in the suites themselves and is worth knowing before
you write another: **a release table opened the day war is declared is now
empty**, because every old name carries a war-score threshold and the culture
bucket that used to fill the list unconditionally is gone. `smoke77` sets
`war.warscore` before asking, in all three of its blocks, for that reason and
no other.

`smoke168.mjs` owns §248's client kingdoms. The suite is mostly about the
NEGATIVE space, which is the part that is easy to get wrong: it establishes
that a free Adiabene can ally, guarantee and declare, then puts the collar on
the same court and shows all three refused — so every bar is demonstrably the
collar's doing and not some other refusal that was there all along. It holds
both sides of the alliance table (a free crown cannot ally somebody else's
client either), the §75 case of a collar whose holder is dead, and the three
things a client keeps: it is still called into its lord's war, still fights it,
and can still be declared ON.

Two of its assertions are worth knowing about before touching this code. The
independence rising fires from under the collar and must go on doing so — it
works because `declareIndependenceCore` strikes the bond BEFORE calling
`declareWar`, so a bar keyed on `t.overlord` never sees it, and anything that
reorders those two lines turns a documented exit into a dead end. And a
guarantee the client RECEIVES has to survive the collar: only the ones it gave
lapse, because striking the other direction would cancel a third crown's
commitment that crown never agreed to give up.

Since §251 (the rest of the civil wars) the anomaly set gains exactly one name
at the default eight years, and it is a chapter's own weather rather than a
regression. `40bce ATG: BLEEDING` is Antigonus — this file's documented
"HAS/HER/ATG bleed while their fight-to-the-death scripted wars run" family,
landing on a run where it had not landed before. Only ONE of that section's ten
new civil wars falls inside an eight-year window at all: Labienus takes thirteen
Anatolian provinces off Rome in September 40 and gives them back in June 39, so
the 40 BCE chapter draws a different stream from its second month onwards. The
trajectory is the family's, not a spiral — twenty-one provinces held start to
finish, treasury at zero rather than the parent commit's −51, eleven thousand
men in the field rather than eight. Every other anomaly on every other chapter
is byte-identical to the parent commit, 66 CE included, where the empire of the
Gauls is raised and dissolved inside the window without moving a single line.

`smoke171.mjs` owns §251's ten arcs, and the thing to know before adding an
eleventh is that `USR` is ONE tag. The suite runs four chapters twice each on
that banner precisely because a claim left standing silently cancels the next
one: `secedeTag` refuses a banner somebody is already flying, and the failure
mode is not an exception but a later civil war that quietly never happens. If
you add an arc, add its settling card in the same commit, and check that no
other arc in that chapter overlaps its years.

§252 (the world's own verdict) puts a draw under six of §251's ten arcs, which
means **the anomaly set is now a distribution rather than a number**. Run the
harness twice with different seeds and the 40 BCE chapter may settle Labienus
in 39 or in 38, 66 CE may end with the Rhine Roman or with a frontier on it,
and the Yemen may finish 1970 as a republic or as an Imamate. None of those
moves a Judaean trajectory — every one of them is a foreign court's own
century — but a diff against a parent commit is only meaningful at the SAME
seed, which is what `rngSeed: 1234567` in `runBookmark` is for. Do not "fix" a
flag that appears at one seed and not another until you have run both.

`smoke172.mjs` owns the draw. Two things in it are load-bearing and easy to
break. The distribution assertions boot a fresh game per seed, because a
verdict is answered ONCE and remembered — asking the same game four hundred
times measures nothing. And the "nothing telegraphs" block greps the shipped
card text for percentages: if you write a tooltip that prices its own odds,
that suite is what tells you, and the fix is to describe what may happen
rather than how often.

§253 adds a second rival banner (`USV`) and four more civil wars, and the one
thing to know before adding a fifth is what `smoke172` had to learn the hard
way: **the 351 chapter boots with a claimant already on the banner.** Magnentius
is raised by the bookmark's own first tick, so any arc that raises `USR` in that
chapter has to be tested with `ev351w_magnentius_falls` played first — otherwise
`secedeTag` refuses the banner, the raise returns null, the flag its card sets
is false, and BOTH roads of the verdict close. The symptom is a suite reporting
"exactly one road is open (none)", which reads like a gate bug and is a
sequencing one.

§254 replaces §207's mission metronome with a measured difficulty ladder, and
that moves the balance harness for a reason worth stating plainly: an AI court
now banks every mission it has earned in the month it earns it, where before it
banked one and rested two. Chains that used to take a decade to pay out can pay
out in a season, so the seeded trajectories step — compare against the parent
commit at the SAME seed and expect the mission-fed numbers (points, treasury,
manpower) to arrive earlier rather than differently.

Measured at the default eight years against `00a0b52`, the anomaly set gains
four names and loses none:

    167bce  none                        →  PAR: BLEEDING
    40bce   ATG: BLEEDING               →  HER: DEBT-SPIRAL | ATG: BLEEDING | KSH: EXHAUSTED
    66ce    none                        →  ADI: BLEEDING
    132ce   JUD: SNOWBALL               →  JUD: SNOWBALL,BLEEDING
    67bce / 351ce / 529ce / 614ce / 1948ce   unmoved

All four are courts spending earlier rather than differently, which is the
mechanism working: `167bce PAR`, `40bce HER` and `66ce ADI` are come-and-go
members of families this file documents by name above, and `132ce JUD` is the
Return holding its provinces to the end and paying for the host that holds
them — now paying a season or two sooner because its chain banks on time
instead of a medallion a quarter.

`40bce KSH: EXHAUSTED` is the one genuinely new name in that chapter. It is the
same court and the same state the 67 chapter has carried for many sections
(`67bce KSH: EXHAUSTED`, unmoved on this run) — Kush at the bottom of the map,
manpower spent with almost no army, far from anything §254 or §255 touches and
reachable from either side of a nudge. Watch it; do not treat it as a
regression unless it starts costing the chapter something.

A caution for whoever measures next: an earlier draft of this note claimed
`40bce ATG` STOPS bleeding. It does not, and never did — the claim came from
reading a stale harness dump rather than a fresh baseline. Run `00a0b52`
(or whatever the parent actually is) in a `git worktree` and diff the two
`=== anomalies ===` blocks; do not compare against a file in a scratch
directory whose provenance you cannot name.

`smoke173.mjs` owns the ladder. The one thing to know before touching
`mission_cost.js` is that the probe must stay a QUESTION: it builds a throwaway
ctx over shallow copies and a dead rng, and the suite asserts that measuring a
tree moves no province, no tag, no army, no flag and no seeded state. If you
give the probe the live game by accident, every panel repaint becomes a turn.

§255's guard has one trap in it, and `smoke7` is where you find out. The rule
reads naturally as "a client leaves any war its lord is not in" — and that
sentence ends Herod's war for the crown in the first month of the 40 chapter,
because Rome collars him from setup and then stays out of the fighting (§226).
The implemented rule fires on the collar CHANGING, tracked by `t.lordSeen`, so
a bookmark that opens with both the collar and the war in place is untouched.
If you widen it, the symptom is not a §248 suite failure — it is `smoke7`
reporting that Rome never enters the war, the alliance is never sealed, and
Parthian Syria never falls, three chapters' worth of consequences downstream of
a war that was quietly cancelled before it started.

## §256 — the provinces the Republic made, measured

Two numbers matter for this section and both were taken against a `git worktree`
of the parent commit, not against a scratch file.

**The default window does not move.** `node tools/autorun.mjs 8` is
**byte-identical** across all nine bookmarks before and after. The earliest card
in `events_167bce_provinces.js` is the Carthaginian ultimatum of 149 — eighteen
game years past the chapter's opening date — so the eight-year harness never
reaches the package at all. If that run ever stops being identical, something
other than this section moved.

**The full chapter does what the section exists to do.** `node tools/autorun.mjs
175 167bce`, baseline versus new:

| | baseline | new |
|---|---|---|
| ROM provinces | 30 → 49 | 30 → 100 |
| ROM development | 335 → 1324 | 335 → 3037 |
| wars started/ended | 52 / 51 | 35 / 33 |
| battles | 1551 | 1107 |

`ROM SNOWBALL` and `PAR SNOWBALL` are both in the baseline and are §111's own
documented outcome for the long 167 run. Three anomaly names are new and all
three ARE the scripted transfers, which is the accepted class this file has
carried since v3.1: `MAU SNOWBALL` is Bocchus and Bogud being paid the Masaesyli
marches after Thapsus (5 → 9 provinces, all of them handed over by one card),
and `MAS`, `AVN` and `ARO DEAD` are Massalia stripped in 49 and Gaul conquered
in 52. `CAR`, `GRC`, `NUM` and `PTO` vanish from the table rather than appearing
as DEAD, because `dissolveTag` deletes the court instead of marking it dead —
the same thing §239's usurper purples do, and not a new behaviour.

The war and battle counts FALLING is the section working, not breaking. In the
baseline a living Carthage, a living Numidia, a living Achaean League and a
living Ptolemaic Egypt spend the first century BCE fighting each other and
their neighbours across an Africa and a Greece that history had already made
Roman. They are provinces now by the time those wars would have started.

Whoever measures next: `HAS` comes back DEAD on the baseline 175-year run and
alive at one province on the new one. That is seeded drift in an all-AI run of a
chapter whose playable window closes in 140 BCE, not a balance claim — the
package touches no Judaean card and no Seleucid one. Do not cite it either way.

The battery on the merged tree: **174 of 174 headless suites ALL PASS**, with
`smoke174.mjs` the new contract. The 52 `uitest*.mjs` files need the `playwright`
npm package, which is not installed in the container this section was written
in; they fail identically on the parent commit and were not measured here.

## §257 — the wars, and the rest of the conquest, measured

Same two numbers, same method: a `git worktree` of the parent, not a scratch
file.

**The default window still does not move.** `node tools/autorun.mjs 8` is
byte-identical across all nine bookmarks. The earliest card in
`events_167bce_conquest.js` is the Achaean League's defiance in 146 BCE,
twenty-one game years past the opening date.

**The full chapter**, `node tools/autorun.mjs 175 167bce`, across the three
trees:

| | parent of §256 | §256 | §257 |
|---|---|---|---|
| ROM provinces | 30 → 49 | 30 → 100 | 30 → 135 |
| ROM development | 335 → 1324 | 335 → 3037 | 335 → 4398 |
| wars started / ended | 52 / 51 | 35 / 33 | 47 / 44 |
| battles | 1551 | 1107 | 1609 |

The war count going back UP is the section working. §256 replaced emergent
second-century wars in an unhistorical Africa and Greece with provinces, and
the count fell; §257 puts the wars the Republic actually fought in their place,
and it comes back past where it started. Zero stderr on the run.

**The anomaly set is long and every name in it is a scripted conquest.**
`ROM`, `PAR` and `MAU SNOWBALL` are documented above (§111's outcome, and
Bocchus being paid after Thapsus). The DEAD list — `MAS CTB LUS AVN AED SEQ BLG
ARO NOR CHE CHA FRS DLM SCO DRD` — is, court by court: Massalia stripped in 49,
Celtiberia and Lusitania finished by the Cantabrian war of 19, the five Gallic
peoples by Alesia and the Rhine, Noricum annexed without a war in 15, the three
German peoples by Drusus, and the Delmatae, Scordisci and Dardani by Illyricum
and Moesia. Every one is a card in `events_167bce_conquest.js` with a date on
it. `GBA` is the pre-existing Greco-Bactrian death this file has documented
since §205.

Do NOT "fix" any of them, and do not read the length of the list as a
regression: a 173-year run of a chapter that now contains the Roman conquest of
the Mediterranean is supposed to end with the Mediterranean's other courts off
the board. The names to watch are ones NOT on that list — a court dying that no
card kills.

The battery on the merged tree: **175 of 175 headless suites ALL PASS**, with
`smoke175.mjs` the new contract. The `uitest*.mjs` files still need the
`playwright` npm package, absent from this container, and were not measured.

