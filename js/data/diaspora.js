// Judaea Universalis — the communities of the dispersion (SPEC §172). Content
// package: zero imports, read by js/sim/diaspora.js.
//
// WHY THIS FILE REPLACED A PANEL ROW. The Diaspora used to be an off-map power
// (SPEC §55): one entry in "The Powers Beyond the Map", with a standing bar and
// two asks — silver, and volunteers. That is the wrong shape for it in one
// specific way, and the way matters.
//
// The powers beyond the map are beyond the map because they are: the Senate in
// a century the frame does not reach, a khaganate on the far side of the
// Caucasus. The dispersion is not beyond the map. Alexandria is ON the map,
// and it is the second city of the world; so is Babylon, so is Nehardea, so is
// Cyrene, so is Rome. Making them one abstract bar meant that the largest
// Jewish population in the world was a number in a panel, while the province it
// lived in sat there on the board owned by somebody else and told you nothing.
//
// So each community is a PLACE now. You click Alexandria and you can write to
// the Jews of Alexandria — and what you can ask for depends on how large that
// community is, how it feels about your crown, and whether the empire that owns
// the province is currently paying attention.
//
// KEYED ON THE CANONICAL NAME. `prov` is the map's own name for the cell, not
// the era's label, so one entry speaks to every chapter: Seleucia-Ctesiphon is
// Baghdad in 1948 and Memphis is Cairo, and the community in it is continuous
// in a way the label is not. `ctx.prov()` resolves both.
//
// EACH ENTRY:
//   prov     canonical province name
//   name     what the panel calls them
//   size     1-5. Scales everything they can give and how long they take to
//            recover from giving it.
//   from     the year the community is there in strength (BCE negative)
//   until    …and the year it is not, or null for "still there"
//   start    opening standing toward a Jewish crown, 0-100
//   blurb    one line, printed in the panel
//
// The windows are the load-bearing part and they are not decoration. The
// Alexandrian community — the largest in the world, a third of a city of half a
// million — is destroyed in the Kitos War of 115-117 and never recovers; a
// campaign that reaches 117 CE loses the biggest node on this list, and should.
// Leontopolis is a temple Vespasian closes in 73. Babylon and Nehardea go the
// other way: they outlast everything, which is why the centre of the Jewish
// world moves east, and why the 614 chapter can still write to them.

export const DIASPORA = [
  // ── Egypt ────────────────────────────────────────────────────────────────
  {
    prov: 'Alexandria', name: 'The Jews of Alexandria', size: 5,
    from: -300, until: 117, start: 55,
    blurb: 'Two of the five quarters, their own ethnarch and council, and a synagogue so '
      + 'large the sources say a man at the back could not hear the blessing and had to be '
      + 'signalled with a flag. The largest Jewish community in the world.',
  },
  {
    prov: 'Leontopolis', name: 'The House of Onias', size: 2,
    from: -160, until: 73, start: 45,
    blurb: 'A second temple, in Egypt, founded by a high priest who lost the first one — '
      + 'with its own altar, its own courses, and a military colony of Jewish soldiers '
      + 'settled around it by the Ptolemies.',
  },
  {
    prov: 'Memphis', name: 'The Jews of Memphis', size: 2,
    from: -300, until: 117, start: 45,
    blurb: 'Older than the Ptolemies and older than the Greeks: Jewish soldiers and '
      + 'traders in the old capital, on papyrus, in Aramaic, since the Persians.',
  },
  // ── Cyrenaica ────────────────────────────────────────────────────────────
  {
    prov: 'Cyrene', name: 'The Jews of Cyrene', size: 3,
    from: -300, until: 117, start: 50,
    blurb: 'One of the four orders of the city by Strabo\'s count. In 115 they will rise, '
      + 'and the rising will be put down so thoroughly that the province has to be '
      + 're-colonised.',
  },
  {
    prov: 'Berenice', name: 'The Community at Berenice', size: 1,
    from: -250, until: 117, start: 45,
    blurb: 'A small, rich, well-organised congregation that voted honours to its patrons '
      + 'on stone, in Greek, like any other civic body in Cyrenaica.',
  },
  // ── Syria and Asia ───────────────────────────────────────────────────────
  {
    prov: 'Antioch', name: 'The Jews of Antioch', size: 4,
    from: -300, until: null, start: 50,
    blurb: 'Settled since Seleucus, with the bronze doors of the great synagogue said to '
      + 'be spoils the city gave back. The largest community in Syria, and the most '
      + 'exposed when Syria turns.',
  },
  {
    prov: 'Damascus', name: 'The Jews of Damascus', size: 2,
    from: -200, until: null, start: 50,
    blurb: 'A community large enough that Josephus makes its massacre a number, and old '
      + 'enough that Paul is sent there to find synagogues already waiting.',
  },
  {
    prov: 'Tyre', name: 'The Jews of Tyre', size: 1,
    from: -200, until: null, start: 40,
    blurb: 'Merchants and dyers in a city that has never quite decided whether the '
      + 'people up the coast are neighbours or competitors.',
  },
  // ── Mesopotamia and Persia: the half that outlasts everything ────────────
  {
    prov: 'Babylon', name: 'The Jews of Babylon', size: 4,
    from: -580, until: null, start: 60,
    blurb: 'Five centuries settled and counting. They did not come back when they were '
      + 'invited to, and they have never stopped sending the half-shekel.',
  },
  {
    prov: 'Nehardea', name: 'The Academy at Nehardea', size: 3,
    from: -580, until: null, start: 65,
    blurb: 'Where the half-shekel of the whole east is gathered before it goes up, behind '
      + 'walls the community garrisons itself. In time the law will be written here.',
  },
  {
    prov: 'Seleucia-Ctesiphon', name: 'The Jews of the Twin Cities', size: 3,
    from: -280, until: null, start: 55,
    blurb: 'At the King of Kings\' own doorstep, which is the whole of their advantage and '
      + 'the whole of their danger.',
  },
  {
    prov: 'Arbela', name: 'The House of Adiabene', size: 2,
    from: -20, until: null, start: 75,
    blurb: 'Not a community but a converted royal house: Queen Helena and her sons, who '
      + 'endowed Jerusalem, fed it in the famine, and sent men to die on its walls.',
  },
  {
    prov: 'Nisibis', name: 'The Jews of Nisibis', size: 2,
    from: -100, until: null, start: 55,
    blurb: 'The strongpoint on the road east, where the Temple tax of the eastern '
      + 'communities is banked under guard before the caravan takes it up.',
  },
  {
    prov: 'Susa', name: 'The Jews of Susa', size: 1,
    from: -400, until: null, start: 50,
    blurb: 'Shushan the palace, where the story is set that the eastern communities read '
      + 'aloud once a year and everyone else has to have explained.',
  },
  {
    prov: 'Ecbatana', name: 'The Jews of Ecbatana', size: 1,
    from: -400, until: null, start: 45,
    blurb: 'In the summer capital of dead empires, keeping the calendar and the accounts '
      + 'of whoever is currently ruling.',
  },
  // ── The west ─────────────────────────────────────────────────────────────
  {
    prov: 'Roma', name: 'The Jews of Rome', size: 3,
    from: -60, until: null, start: 40,
    blurb: 'Across the Tiber, in a dozen congregations that do not agree with each other, '
      + 'with the ear of anyone who wants the eastern vote — and no protection at all when '
      + 'the mood turns.',
  },
  {
    prov: 'Thessalonica', name: 'The Jews of Salonica', size: 2,
    from: -140, until: null, start: 40,
    blurb: 'On the road that carries everything between the two halves of the empire, '
      + 'which is why every traveller with news stops here first.',
  },
  {
    prov: 'Salamis', name: 'The Jews of Cyprus', size: 2,
    from: -200, until: 117, start: 45,
    blurb: 'Numerous enough on a small island to matter, and in 117 numerous enough to '
      + 'rise — after which no Jew may set foot on Cyprus on pain of death.',
  },
  {
    prov: 'Corinth', name: 'The Jews of Corinth', size: 1,
    from: -100, until: null, start: 40,
    blurb: 'A synagogue by the harbour of a city that exists because two seas nearly '
      + 'touch, hearing everything from both of them.',
  },
  {
    prov: 'Byzantion', name: 'The Jews of Byzantion', size: 1,
    from: -100, until: null, start: 40,
    blurb: 'A modest congregation in a well-placed town — which in a few centuries will '
      + 'be the least modest position in the world to hold.',
  },
];

// What a community will do for a crown, and what asking costs it. Sizes scale
// the yield; standing gates access.
export const DIASPORA_ASKS = [
  {
    id: 'silver',
    name: 'Ask for silver',
    verb: 'The half-shekel, gathered early',
    desc: 'The communities\' dues, collected ahead of the festival and sent up with the '
      + 'caravan instead of with the pilgrims.',
    need: 35,
    standing: -12,
    cd: 30,
    infl: 5,
    // per point of size
    treasuryPer: 22,
    risk: 0.15,
  },
  {
    id: 'volunteers',
    name: 'Ask for men',
    verb: 'Young men, and passage for them',
    desc: 'Sons of the community who would rather be counted in the Land than safe where '
      + 'they are. Their families will not all forgive it.',
    need: 55,
    standing: -20,
    cd: 48,
    infl: 12,
    manpowerPer: 420,
    risk: 0.3,
    war: true,
  },
  {
    id: 'intercession',
    name: 'Ask them to speak for us',
    verb: 'A word with the men who decide',
    desc: 'The community\'s patrons, its ethnarch, and whoever it has spent thirty years '
      + 'being useful to — turned, for once, on our behalf.',
    need: 45,
    standing: -10,
    cd: 36,
    infl: 15,
    opinionPer: 6,
    risk: 0.2,
  },
  {
    id: 'letters',
    name: 'Ask for letters',
    verb: 'What they hear, and who from',
    desc: 'What a congregation at the centre of an empire knows before the provinces do: '
      + 'what the court intends, what the price of grain will be, whose command is ending.',
    need: 25,
    standing: -6,
    cd: 24,
    infl: 0,
    inflPer: 7,
    risk: 0.08,
  },
];

// ---------------------------------------------------------------------------
// The window, in one place (SPEC §175).
//
// This predicate existed twice — once in js/sim/diaspora.js as `communityDef`
// and once inline in the Compendium (js/ui/wiki.js) — and the two had already
// drifted: the Compendium tested only the chapter's OPENING year, so 167 BCE
// listed thirteen communities and silently omitted the seven whose windows
// open inside it, Leontopolis among them. A player looking at the era page was
// told the House of Onias was not in this game. It is; Onias founds it seven
// years in.
//
// So the window is a function now, exported from the data it belongs to, and
// the sim, the map and the Compendium all call it. `yearsAt` converts BCE
// years to astronomical ones on both sides of every comparison, because -160
// is one year, not minus-one-hundred-and-sixty of them.
export function yearsAt(y) { return y < 0 ? y + 1 : y; }

/** Is this community present in `year`? */
export function openAt(d, year) {
  if (!d) return false;
  const y = yearsAt(year);
  if (Number.isFinite(d.from) && y < yearsAt(d.from)) return false;
  if (Number.isFinite(d.until) && d.until !== null && y >= yearsAt(d.until)) return false;
  return true;
}

/** Has this community's window CLOSED by `year` — as against never opening? */
export function shutBy(d, year) {
  if (!d || !Number.isFinite(d.until) || d.until === null) return false;
  return yearsAt(year) >= yearsAt(d.until);
}

/** The entry keyed on a canonical province name, or null. */
export function communityOf(provName) {
  if (!provName) return null;
  for (const d of DIASPORA) if (d.prov === provName) return d;
  return null;
}

/** Every community present in `year`, largest first. */
export function communitiesAt(year) {
  return DIASPORA.filter((d) => openAt(d, year)).slice().sort((a, b) => b.size - a.size);
}

/**
 * Every community a chapter running from `y0` to `y1` will ever be able to
 * write to, largest first. This is what an era page wants: a chapter is a span
 * of years and not an instant, and a list built from the opening date alone is
 * a list of the communities you happen to start with.
 */
export function communitiesBetween(y0, y1) {
  const last = Number.isFinite(y1) ? y1 : y0;
  return DIASPORA
    .filter((d) => {
      // Present at some point inside [y0, y1]: its window opens on or before
      // the chapter ends, and closes on or after the chapter begins.
      const from = Number.isFinite(d.from) ? yearsAt(d.from) : -Infinity;
      const until = (Number.isFinite(d.until) && d.until !== null) ? yearsAt(d.until) : Infinity;
      return from <= yearsAt(last) && until > yearsAt(y0);
    })
    .slice()
    .sort((a, b) => b.size - a.size);
}
