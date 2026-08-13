// Judaea Universalis — the years the chain skips: 73–128 CE (SPEC §240).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The Great Revolt's chapter has thirty-three dated cards and eighteen of them
// fall inside the war. What comes after is the Flavian emperors dying in
// order, and then §122's continuation picks the thread up again at 98. The
// sixty years in between contain the whole of what the nation actually did
// with its defeat, and the chapter had almost none of it: the calendar moving
// from a hilltop fire to a man on a road, the blessing that decided who was
// inside the congregation, the morning the doorkeeper was taken off the study
// house, and the argument in which a majority of men overruled a voice from
// heaven and were held to have been right.
//
// Three of the twelve presume the House fell, and say so with a `when` gate
// (SPEC §75): on the road where the Second Kingdom stands, the half-shekel has
// somewhere to go, the desert has no sicarii in it, and no emperor is being
// asked for permission to rebuild anything. They retire into the divergence
// ledger rather than forcing the old rails onto a map that went the other way.
//
// Sources: Josephus, War VII, for Cyrene and Catullus; Mishnah Rosh Hashanah I
// and II for the fire-signals and the messengers; Berakhot 28b for the
// deposition of Rabban Gamaliel and the doorkeeper; Bava Metzia 59b for the
// oven of Akhnai; Cassius Dio LXVIII–LXIX for Nabataea, Hadrian's tour and the
// ban; Genesis Rabbah 64 for the permission that was given and withdrawn.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_66ce_years] ' + key, e || '');
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function safeWhen(key, fn) {
  return function (ctx) {
    try { return !!fn(ctx); } catch (e) { warnOnce('when:' + key, e); return false; }
  };
}

// Addressed to whoever is playing the chapter — the rising, Agrippa's kingdom
// or the house beyond the Tigris — so the modifiers land on the chair that
// answered the card.
function P(ctx) { return ctx.game.playerTag; }

function mod(ctx, id, name, effects, months) {
  ctx.helpers.addTagModifier(ctx, P(ctx), {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

// The road this campaign took. `templeBurned` is set by the chapter's own
// chain; on the Second Kingdom road it never is, and the three cards that
// presume an ended sacrifice retire instead of firing into a world with an
// altar still smoking in it.
function fell(ctx) { return !!(ctx.game.flags && ctx.game.flags.templeBurned); }

export const EVENTS_66_YEARS = [

  // ── 73 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_the_weavers_in_the_desert',
    title: 'The Weavers in the Desert',
    desc: 'It is over everywhere except Cyrene, where a weaver named Jonathan has persuaded '
      + 'two thousand of the poorer sort to follow him into the desert to be shown signs and '
      + 'apparitions. The governor sends cavalry. Most of them are killed in open country '
      + 'with no cover and no water, and Jonathan is taken alive.\n\n'
      + 'What he does next is the part that travels. Under questioning he names the richest '
      + 'Jews of Cyrene as his backers, and then the richest of Alexandria, and then Josephus '
      + 'in Rome — and the governor, who would like a conspiracy, believes all of it and '
      + 'executes three thousand people on the strength of it. The emperor eventually sees '
      + 'through the whole affair and has Jonathan burned. The lesson has already been '
      + 'learned in every Jewish quarter from Egypt to Asia, and the lesson is that after a '
      + 'defeat the dangerous man is not the soldier. It is the enthusiast with a list.',
    forTag: 'player',
    date: { y: 73, m: 4 },
    when: safeWhen('weavers', fell),
    aiOption: 1,
    historical: 'Josephus records Jonathan the Weaver, the desert massacre, the denunciations and Catullus\' three thousand — and his own name on the list.',
    options: [
      {
        label: 'Write to every congregation: no more prophets in the desert',
        tooltip: '+12 governance points, +6 legitimacy, and "The Circular Against Signs" (−0.8 unrest everywhere) for twelve years. The next man with apparitions finds nobody willing to walk out with him.',
        effects: guard('weavers:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, legitimacy: 6 });
          mod(ctx, 'circular_against_signs', 'The Circular Against Signs', { unrestAll: -0.8 }, 144);
          h.chronicle(ctx, 'era', 'A circular goes to every congregation in the west: whoever '
            + 'promises signs in the wilderness is to be refused a following, and the refusing '
            + 'is a duty.');
        }),
      },
      {
        label: 'Send advocates to defend the men he named',
        tooltip: '−60 talents on lawyers and bribes in two provinces: +10 legitimacy, +8 influence points, and "The Defence of the Accused" (+5% income) for ten years. A community that will pay for its own is a community that holds.',
        effects: guard('weavers:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -60, legitimacy: 10, infl: 8 });
          mod(ctx, 'defence_of_accused', 'The Defence of the Accused', { incomeMult: 1.05 }, 120);
          h.chronicle(ctx, 'era', 'Advocates are paid for in Cyrene and Alexandria on behalf of '
            + 'men denounced by a weaver under questioning. Some of them live.');
        }),
      },
      {
        label: 'Cyrene is a long way away',
        tooltip: '+20 talents unspent and +6 governance points, with −6 legitimacy. The letters keep arriving for three years and go unanswered.',
        effects: guard('weavers:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 20, gov: 6, legitimacy: -6 });
          h.chronicle(ctx, 'era', 'The letters from Cyrene go unanswered. They are kept, and '
            + 'read out again forty years later by people who were children when they came.');
        }),
      },
    ],
  },

  // ── 76 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_the_widows_and_the_land',
    title: 'The Widows and the Land',
    desc: 'The courts are jammed with one kind of case. A man went out with the levy and did '
      + 'not come back, and nobody saw him die, and his wife cannot remarry because she cannot '
      + 'prove she is a widow — and his field cannot be inherited, sold or worked by anybody '
      + 'because the title belongs to a man who is legally still alive. Multiply by a '
      + 'generation of war and the result is thousands of women who cannot marry and thousands '
      + 'of fields nobody may plough.\n\n'
      + 'The strict answer is that a death needs two witnesses. The sages who look at what the '
      + 'strict answer produces begin, carefully, to find reasons why one witness will do — a '
      + 'woman\'s testimony, hearsay, a name on a list. It is the largest deliberate loosening '
      + 'of the law of evidence anybody in this tradition has ever attempted, and it is done '
      + 'entirely so that the fields can be sown.',
    forTag: 'player',
    date: { y: 76, m: 6 },
    aiOption: 0,
    historical: 'The rabbinic relaxation of the proof of a husband\'s death — one witness, hearsay, even the wife\'s own report — is explicitly framed in the sources as a remedy for wartime disappearances.',
    options: [
      {
        label: 'One witness is enough. Publish the ruling',
        tooltip: '+15 governance points and "The Fields Sown Again" (+8% income, +6% growth, −0.6 unrest everywhere) for fifteen years.',
        effects: guard('widows:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'fields_sown_again', 'The Fields Sown Again', { incomeMult: 1.08, growthMult: 1.06, unrestAll: -0.6 }, 180);
          h.setFlag(ctx, 'oneWitnessRule', true);
          h.chronicle(ctx, 'era', 'The ruling goes out: one witness to a man\'s death is '
            + 'enough. Marriages are made that summer and fields are ploughed that had stood '
            + 'four years.');
        }),
      },
      {
        label: 'Buy the disputed land into the crown and lease it out',
        tooltip: '−70 talents: "The Crown Leases" (+10% income) for fifteen years, and −5 legitimacy — the state now owns a great deal of land whose owners may yet walk home.',
        effects: guard('widows:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -70, legitimacy: -5 });
          mod(ctx, 'the_crown_leases', 'The Crown Leases', { incomeMult: 1.10 }, 180);
          h.chronicle(ctx, 'era', 'The untitled fields are bought into the crown and leased '
            + 'back to whoever will work them. Some of the owners come home, later, and find '
            + 'a tenant.');
        }),
      },
      {
        label: 'The law of evidence is not a thing to bend',
        tooltip: '+10 legitimacy with the strict houses and "The Waiting Fields" (−8% income, −4% growth) for ten years. The rule holds and so does the damage.',
        effects: guard('widows:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10 });
          mod(ctx, 'the_waiting_fields', 'The Waiting Fields', { incomeMult: 0.92, growthMult: 0.96 }, 120);
          h.chronicle(ctx, 'era', 'The requirement of two witnesses stands. So do the fields, '
            + 'and so do the women, for another ten years.');
        }),
      },
    ],
  },

  // ── 78 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_the_messengers_of_the_new_moon',
    title: 'The Messengers of the New Moon',
    desc: 'The month used to be announced by fire. Witnesses came in, the court heard them, '
      + 'and a torch was waved on the Mount of Olives, and then on the next hill, and the next, '
      + 'until the signal reached the Euphrates in a night and the whole nation knew which day '
      + 'was which. It stopped because the Samaritans learned to light fires on the wrong '
      + 'nights, and a nation that could be given a false new moon by anybody with a torch '
      + 'and a grievance could not keep a calendar that way.\n\n'
      + 'So it is done by messengers now: men on the roads for a week to tell Babylon what the '
      + 'court decided, which is slower, dearer, and impossible to counterfeit. The east is '
      + 'therefore always a day behind, and keeps two days of every festival to be safe, which '
      + 'it will still be doing two thousand years from now because nobody ever quite gets '
      + 'round to stopping.',
    forTag: 'player',
    date: { y: 78, m: 9 },
    aiOption: 0,
    historical: 'The Mishnah records the fire-signals, the Samaritan interference, and the switch to messengers — the origin of the diaspora\'s second festival day.',
    options: [
      {
        label: 'Pay for the messengers, and pay for good ones',
        tooltip: '−35 talents a decade in riders and remounts: +12 governance points and "One Calendar" (+7% income, −0.5 unrest everywhere) for twenty years. Whatever else fragments, the year does not.',
        effects: guard('moon:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -35, gov: 12 });
          mod(ctx, 'one_calendar', 'One Calendar', { incomeMult: 1.07, unrestAll: -0.5 }, 240);
          h.setFlag(ctx, 'calendarByMessenger', true);
          h.chronicle(ctx, 'era', 'The new moon goes out by rider instead of by fire. It is '
            + 'slower and it cannot be forged, and the nation keeps one year.');
        }),
      },
      {
        label: 'Give the east a reckoning it can calculate for itself',
        tooltip: '+15 governance points and "The Reckoned Month" (+5% income) for twenty years, and −6 legitimacy: a calendar anybody can compute is a calendar that needs no court, which some of the court has noticed.',
        effects: guard('moon:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15, legitimacy: -6 });
          mod(ctx, 'the_reckoned_month', 'The Reckoned Month', { incomeMult: 1.05 }, 240);
          h.chronicle(ctx, 'era', 'The rules of the reckoning are written down and sent east so '
            + 'the communities can compute the month themselves. It is efficient, and it gives '
            + 'away the one thing the court could not be bypassed on.');
        }),
      },
      {
        label: 'Let each region watch its own sky',
        tooltip: '+40 talents saved and +5 governance points, with "Two Reckonings" (+0.7 unrest everywhere) for twelve years. Within a generation the festivals are days apart from one end of the nation to the other.',
        effects: guard('moon:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 40, gov: 5 });
          mod(ctx, 'two_reckonings', 'Two Reckonings', { unrestAll: 0.7 }, 144);
          h.chronicle(ctx, 'era', 'Each region is left to watch its own sky. Within a '
            + 'generation the Passovers of the east and the west are different weeks.');
        }),
      },
    ],
  },

  // ── 85 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_the_blessing_against_the_heretics',
    title: 'The Blessing Against the Heretics',
    desc: 'The daily prayer is eighteen benedictions and there is a proposal to make it '
      + 'nineteen. The new one is a curse — against informers, against the sectarians, against '
      + 'those who have separated themselves — and the mechanism is not theological but '
      + 'practical: a man who leads the prayer must say all of it, and a man who will not say '
      + 'that one cannot lead the prayer, and everybody standing behind him will notice which '
      + 'words he skipped.\n\n'
      + 'It is a filter, deliberately built, at the one point in the week where the whole '
      + 'community is standing in the same room. Whoever cannot say it will stop coming. Nobody '
      + 'is expelled, nobody is tried, and within a generation two things that were arguing '
      + 'inside one house are arguing across a street.',
    forTag: 'player',
    date: { y: 85, m: 7 },
    aiOption: 1,
    historical: 'The birkat ha-minim was added to the daily prayer under Gamaliel II. It is the closest thing the period has to a formal act of separation, and it was executed as a liturgical detail.',
    options: [
      {
        label: 'Adopt it, and word it as widely as it will go',
        tooltip: '+10 legitimacy, +12 governance points, and "The Nineteenth Benediction" (−0.7 unrest everywhere, +4% income) for twenty years. The congregation is smaller and there is no longer any argument about who is in it.',
        effects: guard('blessing:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, gov: 12 });
          mod(ctx, 'nineteenth_benediction', 'The Nineteenth Benediction', { unrestAll: -0.7, incomeMult: 1.04 }, 240);
          h.setFlag(ctx, 'birkatHaminim', true);
          h.chronicle(ctx, 'era', 'A nineteenth benediction is added to the daily prayer. '
            + 'Nobody is expelled from anything. Within a generation the people who could not '
            + 'say it are worshipping somewhere else.');
        }),
      },
      {
        label: 'Adopt it, and aim it only at informers',
        tooltip: '+8 governance points, +6 legitimacy, and "Against the Informers" (−0.5 unrest everywhere) for twenty years. The men who denounce their neighbours to a governor are named; the men who merely believe strangely are not.',
        effects: guard('blessing:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 8, legitimacy: 6 });
          mod(ctx, 'against_informers', 'Against the Informers', { unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'era', 'The new benediction is worded against informers and against '
            + 'nobody else. It is read out in that form for four hundred years, and argued '
            + 'about for the rest.');
        }),
      },
      {
        label: 'A prayer is not a court',
        tooltip: '+10 governance points and "One Roof, Several Arguments" (+5% income, +0.5 unrest everywhere) for fifteen years. Everybody keeps coming, including the people the proposal was about.',
        effects: guard('blessing:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10 });
          mod(ctx, 'one_roof', 'One Roof, Several Arguments', { incomeMult: 1.05, unrestAll: 0.5 }, 180);
          h.chronicle(ctx, 'era', 'The proposal is refused: a prayer is not a court and a '
            + 'congregation is not a roll. Everybody goes on standing in the same room.');
        }),
      },
    ],
  },

  // ── 88 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_the_road_the_shekel_takes',
    title: 'The Road the Half-Shekel Takes Now',
    desc: 'Every Jewish household in the empire pays two drachmae a year to the fiscus, and '
      + 'the money goes to the temple of Jupiter on the Capitol. That is settled, humiliating '
      + 'and not the interesting question. The interesting question is the other collection — '
      + 'the one the communities went on making after the House burned, out of habit and then '
      + 'out of stubbornness, which nobody now has a destination for.\n\n'
      + 'It is a great deal of money arriving in a country with no Temple to receive it. It '
      + 'can go to the academy, which would make the school the fiscal centre of the nation '
      + 'and settle the question of who leads it for three centuries. It can go to the poor of '
      + 'the land, which is what it was for before there were priests. Or it can be refused, '
      + 'and the communities can keep it — which would make the diaspora self-sufficient in '
      + 'the one respect it has never been.',
    forTag: 'player',
    date: { y: 88, m: 4 },
    when: safeWhen('shekel', fell),
    aiOption: 0,
    historical: 'The voluntary collections continued after 70 and were eventually gathered by the Patriarch\'s apostoloi — the aurum coronarium the empire later tried repeatedly to intercept.',
    options: [
      {
        label: 'To the academy, and let the school become the centre',
        tooltip: '+12 governance points and "The Purse of the Academy" (+9% income, −0.5 unrest everywhere) for twenty-five years. Whoever presides over the school now presides over the nation\'s revenue.',
        effects: guard('shekel:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12 });
          mod(ctx, 'purse_of_academy', 'The Purse of the Academy', { incomeMult: 1.09, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'academyPurse', true);
          h.chronicle(ctx, 'era', 'The collections are directed to the academy. A school with '
            + 'a treasury is an institution; an institution with a treasury is a government.');
        }),
      },
      {
        label: 'To the poor of the land, as it was before there were priests',
        tooltip: '+12 legitimacy, +1 stability, and "The Poor of the Land" (−0.9 unrest everywhere, +5% growth) for twenty years.',
        effects: guard('shekel:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12, stability: 1 });
          mod(ctx, 'poor_of_the_land', 'The Poor of the Land', { unrestAll: -0.9, growthMult: 1.05 }, 240);
          h.chronicle(ctx, 'era', 'The collections go to the poor of the land, distributed town '
            + 'by town. It is the oldest use the money ever had.');
        }),
      },
      {
        label: 'Tell them to keep it',
        tooltip: '+10 influence points and "The Self-Supporting Communities" (+6% income, +4% trade) for twenty-five years, and −8 legitimacy: the land has just told the diaspora it does not need it.',
        effects: guard('shekel:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 10, legitimacy: -8 });
          mod(ctx, 'self_supporting', 'The Self-Supporting Communities', { incomeMult: 1.06, tradeMult: 1.04 }, 300);
          h.chronicle(ctx, 'era', 'The communities are told to keep their collections and spend '
            + 'them where they live. Some of them never send anything again.');
        }),
      },
    ],
  },

  // ── 90 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_the_guards_off_the_door',
    title: 'The Day the Guards Were Taken Off the Door',
    desc: 'There has been a doorkeeper on the study house for years, and a rule behind him: no '
      + 'student whose inside is not like his outside may come in. It is a sincere rule about '
      + 'sincerity and it has been administered by a man with a list.\n\n'
      + 'The president is deposed for humiliating a colleague in public once too often, a '
      + 'younger man is put in the chair, and the first act of the new administration is to '
      + 'take the doorkeeper off the door. Benches are brought in, and brought in again. The '
      + 'accounts disagree about how many — four hundred, seven hundred — and agree on the '
      + 'part that matters: that on the same day, with the room three times as full as it had '
      + 'ever been, the tractate they had been unable to finish for years was finished.',
    forTag: 'player',
    date: { y: 90, m: 5 },
    aiOption: 0,
    historical: 'Berakhot 28b records the deposition of Rabban Gamaliel, the removal of the doorkeeper, and the hundreds of benches added that morning.',
    options: [
      {
        label: 'Open the doors and pay for the benches',
        tooltip: '−40 talents on the building and the stipends: +15 governance points and "The Open Study House" (+8% income, +5% growth, −0.5 unrest everywhere) for twenty-five years.',
        effects: guard('guards:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -40, gov: 15 });
          mod(ctx, 'open_study_house', 'The Open Study House', { incomeMult: 1.08, growthMult: 1.05, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'openStudyHouse', true);
          h.chronicle(ctx, 'era', 'The doorkeeper is taken off the study house and the benches '
            + 'go in. Learning stops being a qualification and becomes a road.');
        }),
      },
      {
        label: 'Open them, and restore the deposed president beside the new one',
        tooltip: '+10 governance points, +8 legitimacy, and "Two in the Chair" (+6% income, −0.6 unrest everywhere) for twenty years. Nobody is destroyed and the rotation is written into the rules.',
        effects: guard('guards:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 10, legitimacy: 8 });
          mod(ctx, 'two_in_the_chair', 'Two in the Chair', { incomeMult: 1.06, unrestAll: -0.6 }, 240);
          h.chronicle(ctx, 'era', 'The doors are opened and the deposed president is seated '
            + 'again beside the man who replaced him, three weeks in four. It is an absurd '
            + 'arrangement and it holds for a generation.');
        }),
      },
      {
        label: 'The rule was there for a reason',
        tooltip: '+8 legitimacy and "The Kept Threshold" (−0.4 unrest everywhere) for fifteen years, with −10 governance points. The room stays small, and so does the number of men in the country who can read a contract.',
        effects: guard('guards:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 8, gov: -10 });
          mod(ctx, 'kept_threshold', 'The Kept Threshold', { unrestAll: -0.4 }, 180);
          h.chronicle(ctx, 'era', 'The doorkeeper stays. The study house remains a small room '
            + 'containing the right people.');
        }),
      },
    ],
  },

  // ── 95 ─────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_not_in_heaven',
    title: 'Not in Heaven',
    desc: 'The dispute is about an oven made in sections with sand between them: clean or '
      + 'unclean. One man is right and everyone knows he is right, and he is outvoted. So he '
      + 'calls for proof. A carob tree moves a hundred cubits. A stream runs backwards. The '
      + 'walls of the study house lean inward and are told, by a third party, that this is '
      + 'none of their business, and stop halfway out of respect for everyone. Then a voice '
      + 'comes out of heaven and says that the law is as this man says.\n\n'
      + 'And the president of the court stands up and quotes a verse: it is not in heaven. '
      + 'The Torah was given at Sinai and it is not in heaven now; we do not listen to voices; '
      + 'we follow the majority. The tradition preserves this as a victory and preserves the '
      + 'cost in the same breath — the man who was right is excommunicated, and everything he '
      + 'had ruled pure is burned in front of him.',
    forTag: 'player',
    date: { y: 95, m: 9 },
    aiOption: 0,
    historical: 'Bava Metzia 59b. It is the founding statement that revelation does not settle law after Sinai — and the same passage records what the ruling did to the man who was overruled.',
    options: [
      {
        label: 'The majority decides. Write it into the rules of the court',
        tooltip: '+18 governance points and "Not in Heaven" (+7% income, −0.6 unrest everywhere) for thirty years. A nation whose law can be settled by a count of hands has a procedure that outlives every institution it currently possesses.',
        effects: guard('heaven:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 18 });
          mod(ctx, 'not_in_heaven', 'Not in Heaven', { incomeMult: 1.07, unrestAll: -0.6 }, 360);
          h.setFlag(ctx, 'notInHeaven', true);
          h.chronicle(ctx, 'era', 'The court rules that the law is settled by the majority and '
            + 'not by a voice from heaven. It is the most consequential procedural decision '
            + 'anybody in this century makes.');
        }),
      },
      {
        label: 'The majority decides, and nobody is excommunicated for losing',
        tooltip: '+14 governance points, +8 legitimacy, and "The Minority Recorded" (+5% income, −0.8 unrest everywhere) for thirty years. The losing opinion is written down beside the winning one, which is why anybody can ever change their mind again.',
        effects: guard('heaven:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 14, legitimacy: 8 });
          mod(ctx, 'minority_recorded', 'The Minority Recorded', { incomeMult: 1.05, unrestAll: -0.8 }, 360);
          h.setFlag(ctx, 'notInHeaven', true);
          h.chronicle(ctx, 'era', 'The majority rules and the minority opinion is written into '
            + 'the record under the name of the man who held it. Nothing is burned.');
        }),
      },
      {
        label: 'When heaven speaks, the court sits down',
        tooltip: '+12 legitimacy and "The Voice Obeyed" (−0.5 unrest everywhere) for twenty years, with −12 governance points. Every future dispute now has an appeal, and the appeal is to whoever can produce a sign.',
        effects: guard('heaven:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12, gov: -12 });
          mod(ctx, 'the_voice_obeyed', 'The Voice Obeyed', { unrestAll: -0.5 }, 240);
          h.chronicle(ctx, 'era', 'The court defers to the voice. Within ten years there are '
            + 'four men in the country who can produce one.');
        }),
      },
    ],
  },

  // ── 106 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_the_rock_becomes_a_province',
    title: 'The Rock Becomes a Province',
    desc: 'The last Nabataean king dies and the Sixth Legion walks into Petra. There is no war '
      + 'and no siege; the province of Arabia is proclaimed, a new road is surveyed from '
      + 'Bostra to the Red Sea, and a kingdom that had held the incense trade for four hundred '
      + 'years by knowing where the water was is simply administered out of existence.\n\n'
      + 'What that does to everybody else on this coast is arithmetic. The caravan tolls that '
      + 'used to be split between Petra and the ports now run north up a Roman road to a Roman '
      + 'customs house. The desert frontier that Nabataean cavalry used to hold on their own '
      + 'account is now a Roman frontier with legions on it. And there is one fewer buffer '
      + 'state between anybody in this region and the empire, which was the only real service '
      + 'a buffer state ever performed.',
    forTag: 'player',
    date: { y: 106, m: 3 },
    world: true,
    worldLabel: 'Rome annexes Nabataea; Arabia becomes a province',
    aiOption: 1,
    historical: 'Trajan annexed the Nabataean kingdom in 106 CE without a recorded war and built the Via Nova Traiana through it within a decade.',
    options: [
      {
        label: 'Buy into the new road before the tolls are set',
        tooltip: '−50 talents placed with the contractors and the caravan houses: "The New Road" (+9% income, +7% trade) for twenty years.',
        effects: guard('rock:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -50 });
          mod(ctx, 'the_new_road', 'The New Road', { incomeMult: 1.09, tradeMult: 1.07 }, 240);
          h.chronicle(ctx, 'era', 'Money goes into the new Arabian road before the tolls are '
            + 'fixed. When they are fixed, some of them are ours.');
        }),
      },
      {
        label: 'Take in whoever will not live under a prefect',
        tooltip: '−30 talents in settlement: +8 legitimacy and "The Caravan Families" (+6% income, +5% trade, +3% manpower) for fifteen years. Petra\'s guides, drovers and water-masters are worth more than Petra.',
        effects: guard('rock:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -30, legitimacy: 8 });
          mod(ctx, 'caravan_families', 'The Caravan Families', { incomeMult: 1.06, tradeMult: 1.05, manpowerMult: 1.03 }, 180);
          h.chronicle(ctx, 'era', 'The caravan families who will not live under a prefect are '
            + 'settled on this side of the line, with their routes and their water in their '
            + 'heads.');
        }),
      },
      {
        label: 'Note what happened to a kingdom nobody went to war with',
        tooltip: '+12 governance points, +8 martial points, and "What Happened at Petra" (+5% manpower, −0.4 unrest everywhere) for fifteen years. The lesson is circulated to every officer in the country.',
        effects: guard('rock:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, mar: 8 });
          mod(ctx, 'what_happened_at_petra', 'What Happened at Petra', { manpowerMult: 1.05, unrestAll: -0.4 }, 180);
          h.chronicle(ctx, 'era', 'The annexation of Petra is written up and circulated: no '
            + 'war, no siege, no casus belli, and a four-hundred-year-old kingdom gone in a '
            + 'summer.');
        }),
      },
    ],
  },

  // ── 112 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_the_schools_beyond_the_river',
    title: 'The Schools Beyond the River',
    desc: 'Students are leaving. Not many yet — a dozen a year, the ones with family on the '
      + 'other side — and they are going east, to Nisibis and to Nehardea, where there are '
      + 'houses of study now with real libraries and teachers who trained here. The reasons '
      + 'they give are all practical. There is no imperial tax on a Jew in Arsacid territory. '
      + 'There is no governor who might decide next spring that an assembly of thirty men is '
      + 'a conspiracy. There is land.\n\n'
      + 'The court can regard this as a drain or as a deposit. A second centre is a hedge '
      + 'against the first one being destroyed, which this nation now has direct experience '
      + 'of; it is also the beginning of two authorities, and two authorities will eventually '
      + 'produce two answers to the same question, and then somebody will have to decide which '
      + 'of them the nation follows.',
    forTag: 'player',
    date: { y: 112, m: 6 },
    aiOption: 1,
    historical: 'The Babylonian academies grew out of Judaean teaching in exactly this period. Within two centuries the eastern centre was the larger of the two, and it outlived the western one by five hundred years.',
    options: [
      {
        label: 'Forbid ordination outside the land',
        tooltip: '+10 legitimacy, +8 governance points, and "The Land Ordains" (−0.4 unrest everywhere) for twenty years, with −6% income as the eastern communities decide what they think of that.',
        effects: guard('schools:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, gov: 8 });
          mod(ctx, 'the_land_ordains', 'The Land Ordains', { unrestAll: -0.4, incomeMult: 0.94 }, 240);
          h.setFlag(ctx, 'ordinationInLandOnly', true);
          h.chronicle(ctx, 'era', 'It is ruled that a man may be ordained only in the land. The '
            + 'east complies, sends its best students west for a season, and quietly begins '
            + 'appointing its own men under another title.');
        }),
      },
      {
        label: 'Fund them, staff them, and keep one chain of tradition',
        tooltip: '−55 talents east: +12 influence points, +10 governance points, and "The Two Houses" (+8% income, +4% trade) for twenty-five years. A nation with two libraries is a nation that can lose one.',
        effects: guard('schools:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -55, infl: 12, gov: 10 });
          mod(ctx, 'the_two_houses', 'The Two Houses', { incomeMult: 1.08, tradeMult: 1.04 }, 300);
          h.setFlag(ctx, 'easternAcademies', true);
          h.chronicle(ctx, 'era', 'Money and teachers go east to the schools at Nisibis and '
            + 'Nehardea. One chain of tradition, two libraries, and four hundred miles of '
            + 'somebody else\'s empire between them.');
        }),
      },
      {
        label: 'Let them go and say nothing',
        tooltip: '+6 governance points. Within a century the centre of gravity of the nation\'s learning is on the wrong side of a hostile frontier, and nobody ever decided that it should be.',
        effects: guard('schools:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 6 });
          h.chronicle(ctx, 'era', 'The students go east and nothing is said about it. The '
            + 'movement is not reversed, and nobody at any point decides that it should not '
            + 'be.');
        }),
      },
    ],
  },

  // ── 119 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_the_emperor_who_said_yes',
    title: 'The Emperor Who Said Yes',
    desc: 'The new emperor has given away Mesopotamia, Assyria and Armenia inside a year of '
      + 'taking the purple, on the sound argument that his predecessor conquered more than the '
      + 'empire can garrison. He is a Hellenist, a builder, a restorer of cities, and he has '
      + 'reportedly said — to an embassy, in the hearing of witnesses — that the House in '
      + 'Jerusalem may be rebuilt.\n\n'
      + 'The country goes up like dry grass. And then the difficulties begin: neighbours '
      + 'petition against it, the permission is not withdrawn but is amended — build it '
      + 'elsewhere, or build it to different dimensions — and the amendment is understood by '
      + 'everybody as the refusal it is. There is a crowd in the valley of Beth Rimmon waiting '
      + 'to be told, and a sage is sent to tell them in language calculated not to start the '
      + 'war on that afternoon.',
    forTag: 'player',
    date: { y: 119, m: 4 },
    when: safeWhen('emperor', fell),
    aiOption: 1,
    historical: 'Genesis Rabbah 64 records the permission, the petition against it, the amended terms and the crowd at Beth Rimmon. Thirteen years later the country rose.',
    options: [
      {
        label: 'Begin anyway, on the ground, and dare them to stop it',
        tooltip: '+15 legitimacy and "The Foundations Laid" (+6% manpower, +1.5 unrest everywhere) for eight years. Whatever the amendment says, there are men digging.',
        effects: guard('yes:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 15 });
          mod(ctx, 'foundations_laid', 'The Foundations Laid', { manpowerMult: 1.06, unrestAll: 1.5 }, 96);
          h.setFlag(ctx, 'foundationsLaid', true);
          h.chronicle(ctx, 'era', 'Ground is broken on the Mount on the strength of a '
            + 'permission that has already been amended. Nobody stops it for eleven months.');
        }),
      },
      {
        label: 'Send the sage to Beth Rimmon and let the crowd down gently',
        tooltip: '+12 governance points, +8 legitimacy, and "The Valley Dispersed" (−1.0 unrest everywhere) for twelve years. The war does not begin this afternoon, which is the entire objective.',
        effects: guard('yes:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 12, legitimacy: 8 });
          mod(ctx, 'valley_dispersed', 'The Valley Dispersed', { unrestAll: -1.0 }, 144);
          h.chronicle(ctx, 'era', 'A sage is sent down to the valley of Beth Rimmon to tell a '
            + 'waiting crowd that the permission has been amended. He tells them a parable '
            + 'about a lion and a bird, and they go home.');
        }),
      },
      {
        label: 'Take the amended terms and build what is allowed',
        tooltip: '−80 talents: +10 legitimacy, +1 stability, and "The House That Was Allowed" (+7% festival draw, +5% income, −0.6 unrest everywhere) for twenty years. It is not the House and it is a house.',
        effects: guard('yes:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -80, legitimacy: 10, stability: 1 });
          mod(ctx, 'house_allowed', 'The House That Was Allowed', { pilgrimMult: 1.07, incomeMult: 1.05, unrestAll: -0.6 }, 240);
          h.setFlag(ctx, 'amendedHouse', true);
          h.chronicle(ctx, 'era', 'The amended permission is taken up and something is built '
            + 'under it — smaller, and not quite where it was, and standing.');
        }),
      },
    ],
  },

  // ── 123 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_the_restorer_of_the_world',
    title: 'The Restorer of the World',
    desc: 'The emperor is coming east on his second circuit and the coins struck for it say '
      + 'RESTITVTOR — restorer of Achaea, of Asia, of Arabia, of Africa. He arrives, he looks '
      + 'at a city, he pays for an aqueduct or a temple or a colonnade, and the city puts up '
      + 'an inscription and renames a tribe after him. It is the largest programme of imperial '
      + 'benefaction anybody has ever run and it is entirely sincere.\n\n'
      + 'The country will be on the itinerary. What is being decided now is what to ask for: '
      + 'the works, which are real money and would be visible for four centuries; the '
      + 'privileges, which are worth more and photograph worse; or nothing, on the calculation '
      + 'that a city which asks a Hellenizing emperor for gifts gets rebuilt in his taste and '
      + 'that this has been tried before, here, and produced a war.',
    forTag: 'player',
    date: { y: 123, m: 5 },
    aiOption: 0,
    historical: 'Hadrian\'s eastern tours rebuilt cities across the Greek east on a scale nobody matched. The city he founded on Jerusalem\'s ruins was, from his side, the same programme.',
    options: [
      {
        label: 'Ask for the aqueducts and the roads',
        tooltip: '+90 talents\' worth of imperial works: "The Emperor\'s Works" (+9% income, +6% growth) for twenty-five years, with +0.6 unrest everywhere for six over whose name is on them.',
        effects: guard('restorer:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: 90 });
          mod(ctx, 'the_emperors_works', 'The Emperor\'s Works', { incomeMult: 1.09, growthMult: 1.06, unrestAll: 0.6 }, 300);
          h.chronicle(ctx, 'era', 'The aqueducts and the roads are asked for and granted. Every '
            + 'one of them carries the emperor\'s name cut into the stone at the head of it.');
        }),
      },
      {
        label: 'Ask for privileges, not buildings',
        tooltip: '+14 influence points and "The Confirmed Privileges" (+7% income, −0.5 unrest everywhere) for twenty-five years. Nothing to look at, and nothing anybody can point to and object to either.',
        effects: guard('restorer:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { infl: 14 });
          mod(ctx, 'confirmed_privileges', 'The Confirmed Privileges', { incomeMult: 1.07, unrestAll: -0.5 }, 300);
          h.setFlag(ctx, 'hadrianicPrivileges', true);
          h.chronicle(ctx, 'diplomacy', 'The embassy asks for confirmations rather than '
            + 'colonnades, and gets them in writing. There is nothing to photograph and '
            + 'nothing to resent.');
        }),
      },
      {
        label: 'Ask for nothing at all',
        tooltip: '+10 legitimacy and "Nothing Asked" (−0.6 unrest everywhere) for fifteen years, and −8 influence points. The imperial party notices the omission and draws its own conclusions.',
        effects: guard('restorer:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 10, infl: -8 });
          mod(ctx, 'nothing_asked', 'Nothing Asked', { unrestAll: -0.6 }, 180);
          h.chronicle(ctx, 'era', 'The court asks the emperor for nothing. It is noted in his '
            + 'secretariat, in a file, beside the other things that are noted.');
        }),
      },
    ],
  },

  // ── 128 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev66y_the_knife_and_the_law',
    title: 'The Knife and the Law',
    desc: 'The rescript is about castration. It extends an old law against mutilating slaves '
      + 'and boys, it is aimed at the priests of Cybele and at fashionable Roman households '
      + 'with tastes the emperor disapproves of, and it is drafted by lawyers who defined the '
      + 'offence by what is done rather than by why. Circumcision falls inside the definition. '
      + 'The penalty is the same as for murder.\n\n'
      + 'Nobody in the chancery appears to have set out to abolish a nation. That is what makes '
      + 'it dangerous: an edict aimed at somebody else, which as drafted makes it a capital '
      + 'crime to do the thing this people does to every son on the eighth day, and which no '
      + 'one in Rome will think of as a Jewish measure until Jewish objections make it one.',
    forTag: 'player',
    date: { y: 128, m: 8 },
    world: true,
    worldLabel: 'An imperial rescript on mutilation catches circumcision in its definition',
    aiOption: 0,
    historical: 'The Hadrianic ban is attested in the Historia Augusta and in the exemption Antoninus Pius later granted for Jewish sons alone. Its role in the causes of Bar Kokhba\'s war is debated and was never doubted in the land.',
    options: [
      {
        label: 'Send an embassy and ask for the exemption in the text',
        tooltip: '−65 talents on the mission: +12 influence points and "The Exemption Sought" (−0.5 unrest everywhere, +4% income) for twelve years. It takes twenty years and a different emperor, and it eventually works.',
        effects: guard('knife:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { treasury: -65, infl: 12 });
          mod(ctx, 'exemption_sought', 'The Exemption Sought', { unrestAll: -0.5, incomeMult: 1.04 }, 144);
          h.setFlag(ctx, 'circumcisionEmbassy', true);
          h.chronicle(ctx, 'diplomacy', 'An embassy goes west to ask that the sons of Israel be '
            + 'named in the exemption. The answer will come from a different emperor, in a '
            + 'different reign, and it will be yes.');
        }),
      },
      {
        label: 'Say nothing to Rome and nothing to anybody. Keep doing it',
        tooltip: '+12 legitimacy and "The Eighth Day" (+6% manpower, +1.0 unrest everywhere) for twelve years. A law nobody has been asked to enforce is a law that is sometimes not enforced.',
        effects: guard('knife:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { legitimacy: 12 });
          mod(ctx, 'the_eighth_day', 'The Eighth Day', { manpowerMult: 1.06, unrestAll: 1.0 }, 144);
          h.chronicle(ctx, 'era', 'No embassy is sent and no exception is asked for. The eighth '
            + 'day goes on being the eighth day, quietly, in every village in the country.');
        }),
      },
      {
        label: 'Have the sages rule on what may be deferred and what may not',
        tooltip: '+15 governance points and "The Ruling on the Rescript" (−0.7 unrest everywhere, +5% income) for fifteen years. A community that has decided in advance what it will and will not risk does not have to decide it in a doorway.',
        effects: guard('knife:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, P(ctx), { gov: 15 });
          mod(ctx, 'ruling_on_rescript', 'The Ruling on the Rescript', { unrestAll: -0.7, incomeMult: 1.05 }, 180);
          h.chronicle(ctx, 'era', 'The sages rule in advance on what may be deferred under a '
            + 'threat and what may not. It is written down before anybody is standing in a '
            + 'doorway with a soldier in it.');
        }),
      },
    ],
  },
];
