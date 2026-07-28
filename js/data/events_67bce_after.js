// Judaea Universalis — after the war of the brothers, 20 BCE–6 CE (SPEC §123).
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_67 by the era registry.
//
// The 67 chapter's last cards are `ev4_mariamne` and `ev4_v_never_renamed`
// around −30, and then the edge §121 and §122 have now found twice: no end
// date, a clock that runs on, and nothing in it. Thirty-five years to 6 CE, the
// year Judaea became a province in the history the chapter is a tributary of.
//
// It looks at first like the 40 chapter already covers this ground, and in the
// codebase it does. In PLAY it does not, and that distinction is the whole
// design: a campaign started at 67 BCE never sees a single card from the 40
// chapter, because chapters are chains attached to bookmarks and a player only
// ever has one. Thematic overlap between two packages is a filing question.
// Silence in a played campaign is a missing chapter.
//
// The 67 chapter leaves two very different worlds behind it, and they want
// different last acts:
//
//   The submitted roads — whichever brother answered Pompey — end with Herod on
//   the throne and his queen dead, a kingdom that exists because Rome decided
//   it should. Its remaining question is the one every client dynasty faces and
//   almost none survives: the succession.
//
//   The sovereign road — `ev4_v_never_renamed`, the kingdom that refused the
//   eagle and kept its gates — ends with something no other outcome in the game
//   produces at this date: a Jewish state that never became anybody's client,
//   arriving at the Augustan settlement with nothing to apologise for and no
//   patron to invoke.
//
// Source spine: Josephus, Antiquitates XVI–XVII and Bellum I for the succession
// and the will; Dio LIV for the settlement of the East; Braund on the friendly
// king for what actually decided whether a throne continued.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_67bce_after] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135). A realm that has taken a
// greater crown files its provinces, armies and wars under the new tag, while
// this chapter was written against the old one; the sim keeps the forwarding
// address and hands it back through ctx.helpers. Defensive about `helpers`
// because the content packages are also read cold, with no game to resolve
// against.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function safeTrigger(key, fn) {
  return function (ctx) {
    try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + key, e); return false; }
  };
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[b] = Math.max(-200, Math.min(200, val));
}

// Whichever Jewish court this chapter left standing.
// The tag whichever of these courts is still standing wears NOW (SPEC §135):
// `alive` answers under the old name, but the provinces, armies and wars are
// filed under the new one, so the letters this returns have to be the live ones.
function crown(ctx) {
  for (const t of ['HER', 'HYR', 'ARI', 'HAS', 'JUD']) {
    const held = who(ctx, t);
    if (alive(ctx, held)) return held;
  }
  return null;
}

// The two worlds the chapter can end in. Markers, not geography — §119.
function clientKingdom(ctx) {
  return (flag(ctx, 'submittedHYR') || flag(ctx, 'submittedARI'))
    && !flag(ctx, 'neverRenamed') && !!crown(ctx);
}
function neverSubmitted(ctx) {
  return flag(ctx, 'neverRenamed') && !!crown(ctx);
}

export const EVENTS_67_AFTER = [

  // ═══ THE CLIENT KINGDOM ══════════════════════════════════════════════════

  {
    id: 'ev4_c_the_succession_a_client_cannot_have',
    title: 'The Succession a Client Cannot Have',
    worldLabel: 'A throne Rome gave has to be given again',
    desc: 'The king is old and the sons are numerous and the will has been rewritten '
      + 'six times, which is not in itself remarkable; every dynasty in the world does '
      + 'this. What is remarkable is that none of it is binding. A kingdom that exists '
      + 'because the Senate voted it into existence is a kingdom whose succession the '
      + 'Senate confirms, and everybody involved knows it — the sons, the court, the '
      + 'ambassadors, and above all the notables of the country, who have worked out '
      + 'that there is now a court of appeal above their king and have started '
      + 'rehearsing what they would say to it. The king knows they have. That is why '
      + 'the will keeps being rewritten, and why two of the sons are already dead, and '
      + 'why nobody at this court sleeps well.',
    forTag: 'both',
    decider: (ctx) => crown(ctx) || 'HER',
    date: { y: -10, m: 4 },
    world: true,
    major: true,
    when: safeTrigger('ev4_c_the_succession:when', (ctx) => clientKingdom(ctx)),
    aiOption: 0,
    historical: 'Herod rewrote his will repeatedly, executed three sons, and the settlement was decided in Rome anyway — after which his ethnarch lasted ten years.',
    options: [
      {
        label: 'Settle it in Rome now, in public, while there is time',
        tooltip: 'The king takes the succession to the emperor himself rather than leaving it to be litigated over his body: −200 talents, −10 legitimacy at home (a crown carried to Italy is a crown admitted to be on loan) — but +2 stability, Rome\'s opinion +50, and "The Settled Succession" permanently (−1 unrest everywhere, +8% income). The humiliating answer, and the one that keeps the kingdom.',
        effects: guard('ev4_c_the_succession:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: -200, legitimacy: -10, stability: 2 });
          h.addTagModifier(ctx, me, {
            id: 'the_settled_succession', name: 'The Settled Succession', months: -1,
            effects: { unrestAll: -1, incomeMult: 1.08 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, 50);
          h.setFlag(ctx, 'successionSettled', true);
          h.chronicle(ctx, 'ruler', 'The succession is carried to Italy and settled in public: a crown taken to Rome is a crown admitted to be on loan, and it is still a crown afterwards.');
        }),
      },
      {
        label: 'Keep the will at home and let the country find out when it must',
        tooltip: 'The kingdom asserts that its own throne is its own business: +20 legitimacy, +1 authority — and "An Unsettled House" permanently (+1 unrest everywhere, −0.1 legitimacy a month), because a court where the succession is undecided is a court every notable in the country is quietly making arrangements about. The proud answer, and the one that puts the question in front of a Roman magistrate eventually anyway.',
        effects: guard('ev4_c_the_succession:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 20 });
          h.addTagModifier(ctx, me, {
            id: 'an_unsettled_house', name: 'An Unsettled House', months: -1,
            effects: { unrestAll: 1, legitimacyAdd: -0.1 },
          });
          h.doctrine(ctx, 'authority', 1);
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, -25);
          h.setFlag(ctx, 'successionWithheld', true);
          h.chronicle(ctx, 'ruler', 'The will stays in Jerusalem and the country is told nothing; every notable in Judaea begins quietly making arrangements of his own.');
        }),
      },
    ],
  },

  {
    id: 'ev4_c_the_year_the_petition_came',
    title: 'The Year the Petition Came',
    worldLabel: 'The notables of Judaea write to Rome about their own king',
    desc: 'This is the year the client kingdom finds out what a client kingdom is. A '
      + 'delegation of the leading men of the country — not rebels, not zealots, the '
      + 'respectable sort, with property and Greek and connections — goes to Rome and '
      + 'asks to be governed by the province of Syria instead. Their case is not that '
      + 'the dynasty is illegitimate; it is that it is expensive, arbitrary, and worse '
      + 'at collecting taxes than Roman clerks would be. It is an extremely good case '
      + 'and it is made in a language the men hearing it use for everything. The '
      + 'kingdom\'s answer has to be made in the same language, this year, or the '
      + 'answer will be made for it.',
    forTag: 'both',
    decider: (ctx) => crown(ctx) || 'HER',
    date: { y: 6, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev4_c_the_petition:when', (ctx) => clientKingdom(ctx)),
    aiOption: 0,
    historical: 'The petition succeeded. Archelaus was deposed to Vienne, Judaea became a province of the third rank, and Coponius arrived from Caesarea.',
    options: [
      {
        label: 'Answer in their language: the books, the roads, the yield',
        tooltip: 'The kingdom argues its case on administration rather than on right, which is the only argument available: −250 talents on the audit and the delegation, and the crown survives. +25 legitimacy, +1 stability, "The Petition Answered" permanently (+12% income, −1 unrest everywhere). A kingdom that settled its succession in −10 wins this easily; one that withheld the will is answering two questions at once.',
        effects: guard('ev4_c_the_petition:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          const settled = flag(ctx, 'successionSettled');
          h.adjust(ctx, me, { treasury: -250, legitimacy: 25, stability: settled ? 2 : 1 });
          h.addTagModifier(ctx, me, {
            id: 'the_petition_answered', name: 'The Petition Answered', months: -1,
            effects: { incomeMult: 1.12, unrestAll: settled ? -1 : -0.5 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, settled ? 60 : 20);
          h.setFlag(ctx, 'petitionAnswered', true);
          h.chronicle(ctx, 'era', settled
            ? 'The petition is answered in the language it was written in — audited books, a road survey, a yield — and the crown that settled its own succession six years ago wins the argument in a morning.'
            : 'The petition is answered on the accounts, at length and at expense, by a court that is also still arguing about its own succession.');
        }),
      },
      {
        label: 'Answer on right, and lose the argument to men who brought ledgers',
        tooltip: 'The kingdom argues that a throne is not an administrative arrangement. It is correct and it is beside the point: −30 legitimacy, −1 stability, Rome\'s opinion −50, and "Governed From Caesarea" permanently (−15% income, +1 unrest everywhere) as the province takes over the parts of the job it can. The crown remains, in the sense that a crown can remain.',
        effects: guard('ev4_c_the_petition:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: -30, stability: -1 });
          h.addTagModifier(ctx, me, {
            id: 'governed_from_caesarea', name: 'Governed From Caesarea', months: -1,
            effects: { incomeMult: 0.85, unrestAll: 1 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, -50);
          h.setFlag(ctx, 'petitionLost', true);
          h.chronicle(ctx, 'era', 'The kingdom answers that a throne is not an administrative arrangement. It is right, and the men with the ledgers take over the parts of the job they can.');
        }),
      },
    ],
  },

  // ═══ THE KINGDOM THAT NEVER SUBMITTED ════════════════════════════════════

  {
    id: 'ev4_c_nothing_to_apologise_for',
    title: 'Nothing to Apologise For',
    worldLabel: 'Augustus settles the East and finds one court with no patron',
    desc: 'Every throne in the settlement is explaining itself, and the explanations '
      + 'all have the same shape: we backed a Roman, it was the wrong Roman, here is '
      + 'why that was reasonable at the time. It is a form of words the commission has '
      + 'heard forty times this year and has a standard response to. Jerusalem has '
      + 'nothing to say in that form, because Jerusalem never backed a Roman. It '
      + 'refused the eagle when the eagle was offered, kept its gates through two '
      + 'civil wars that were fought partly on its border, and arrives at the tent '
      + 'with no patron to invoke, no apology to make, and no debt on either side. '
      + 'The commission has no standard response to that at all, and has to send to '
      + 'the emperor, who is interested.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: -20, m: 5 },
    world: true,
    major: true,
    when: safeTrigger('ev4_c_nothing_to_apologise:when', (ctx) =>
      neverSubmitted(ctx) && alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'No court in the East was in this position. Every one of them had a Roman patron, which is why the settlement took the shape it did.',
    options: [
      {
        label: 'Treat with Rome as a power, and sign nothing that says client',
        tooltip: 'A treaty between states rather than a grant to a friend: +30 legitimacy, +2 authority, "Signed as a Power" permanently (+12% income, +8% morale) — and Rome\'s opinion settles at a wary +15, which is what respect looks like when it is not affection. No subsidy, no protection, and no clause anybody can later read as a leash.',
        effects: guard('ev4_c_nothing_to_apologise:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { legitimacy: 30 });
          h.addTagModifier(ctx, me, {
            id: 'signed_as_a_power', name: 'Signed as a Power', months: -1,
            effects: { incomeMult: 1.12, moraleMult: 1.08 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, 15);
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'signedAsAPower', true);
          h.chronicle(ctx, 'era', 'The treaty is written between states rather than granted to a friend; there is no subsidy in it, no protection, and no clause anybody can later read as a leash.');
        }),
      },
      {
        label: 'Take the friendship, the subsidy, and the word that comes with them',
        tooltip: 'The kingdom accepts the standard settlement after all: +400 talents of subsidy, Rome\'s opinion +65, "Friend and Ally" permanently (+10% income, −1 unrest everywhere, +1 stability) — and −20 legitimacy, because the one thing this road was ever about was not doing this, and the country knows the date it stopped being true.',
        effects: guard('ev4_c_nothing_to_apologise:1', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          h.adjust(ctx, me, { treasury: 400, legitimacy: -20, stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'friend_and_ally_67', name: 'Friend and Ally', months: -1,
            effects: { incomeMult: 1.1, unrestAll: -1 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', me, 65);
          h.doctrine(ctx, 'alignment', 2);
          h.setFlag(ctx, 'tookTheFriendship', true);
          h.chronicle(ctx, 'era', 'The kingdom that refused the eagle takes the subsidy and the word that comes with it; the country knows the date, and will go on knowing it.');
        }),
      },
    ],
  },

  {
    id: 'ev4_c_the_year_nobody_petitioned',
    title: 'The Year Nobody Petitioned',
    worldLabel: 'The year the client kingdom fell, in a country that never was one',
    desc: 'In the history this chapter is a tributary of, this is the year the leading '
      + 'men of Judaea went to Rome and asked to be governed by Syria instead — and '
      + 'got their wish, and a prefect, and a census, and everything that came of '
      + 'those. The petition worked because there was a court of appeal above the '
      + 'king, which there was because the king had been given his throne by the '
      + 'people being petitioned. Neither thing is true here. There is no higher court '
      + 'to write to, so nobody writes; the notables of the country take their '
      + 'complaints to the assembly, where they are heard badly and at length by their '
      + 'own neighbours, which is the ordinary condition of self-government and is '
      + 'nobody\'s idea of a triumph. It is simply the alternative, and this is the '
      + 'year the difference between them becomes visible.',
    forTag: 'both',
    decider: (ctx) => crown(ctx) || 'HAS',
    date: { y: 6, m: 7 },
    world: true,
    major: true,
    when: safeTrigger('ev4_c_the_year_nobody_petitioned:when', (ctx) => neverSubmitted(ctx)),
    aiOption: 0,
    historical: 'The petition came, and it worked.',
    options: [
      {
        label: 'Let the assembly hear them badly, and close the chapter',
        tooltip: 'The chapter ends with the kingdom intact and self-governing: +25 legitimacy, +1 stability, "No Court of Appeal" permanently (+10% income, −0.75 unrest everywhere). A kingdom that signed as a power carries it proudly; one that took the subsidy carries it with an asterisk its own citizens supply.',
        effects: guard('ev4_c_the_year_nobody_petitioned:0', (ctx) => {
          const h = ctx.helpers;
          const me = crown(ctx);
          if (!me) return;
          const proud = flag(ctx, 'signedAsAPower');
          h.adjust(ctx, me, { legitimacy: 25, stability: 1 });
          h.addTagModifier(ctx, me, {
            id: 'no_court_of_appeal', name: 'No Court of Appeal', months: -1,
            effects: { incomeMult: 1.1, unrestAll: proud ? -0.75 : -0.4 },
          });
          h.setFlag(ctx, 'nobodyPetitioned', true);
          h.chronicle(ctx, 'era', proud
            ? 'Nobody writes to Rome, because there is nobody above the king to write to; the complaints go to the assembly and are heard badly by the complainants\' own neighbours.'
            : 'Nobody writes to Rome. The complaints go to the assembly instead, along with a good deal of comment about the subsidy.');
        }),
      },
    ],
  },
];
