// Judaea Universalis — the house of David, shared by every Jewish chapter
// (SPEC §138). Content package: zero imports, keyed on the player tag like the
// annexation question and the omens.
//
// Proclaiming the Kingdom of Israel is proclaiming the united monarchy, and the
// united monarchy is David's. Until now the formable asked for twenty-five
// provinces, six named cities, stability and legitimacy — a conquest checklist
// that any sufficiently large Jewish state could tick, which made the greater
// crown a reward for arithmetic rather than for a title.
//
// It is also the one objection this game's own history keeps making. The
// Hasmoneans were priests of the course of Joarib and not of Judah, and their
// kingship was attacked on exactly that ground for a century: Josephus (Ant.
// XIII.288–298) has the Pharisee Eleazar tell John Hyrcanus to be content with
// the high priesthood, and the quarrel that produced runs through the civil war
// of 67 to Pompey. Herod, who had no descent at all, married Mariamne the
// Hasmonean to buy a pedigree, and then killed her and her sons because a
// borrowed title is a standing rival. The Exilarchs of Babylonia claimed descent
// from Jehoiachin for eight hundred years and were the one Jewish authority
// nobody argued with about legitimacy. Bar Kokhba was called Nasi and never
// King, and the coins of both revolts say Freedom and Redemption rather than
// any man's name.
//
// So the crown of Israel now costs a dynasty rather than a war, and the cheapest
// road to it is Herod's: marry the line and wait a generation for the grandson.
//
// STRUCTURE. Two cards. The first asks the question once, when a Jewish crown
// has grown large enough for it to bite, and its four answers are the four
// answers the period actually produced. The second collects on the marriage a
// generation later, because a wedding is not a pedigree — the son is.
//
// STANDING DOWN. Two chapters own this question already and ask it better, with
// their own courts and their own consequences: the accession of Beit Kosiba in
// 132 (SPEC §128) and the crown of David in 614 (SPEC §126). Where those arcs
// are live, this package keeps quiet and reads their answer instead.

function T(ctx) { return ctx.game.tags[ctx.game.playerTag]; }

function jewishCrown(ctx) {
  const t = T(ctx);
  return !!t && t.alive !== false && t.religion === 'judaism';
}

function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }

// The chapters that ask this question in their own voice. While either arc is
// running, the shared cards stay shut — a court does not get asked twice.
function ownArcRuns(ctx) {
  return flag(ctx, 'redemptionEra')          // 132: the accession of Beit Kosiba
    || flag(ctx, 'oneCrownBothCentres');     // 614: the line of Jehoiachin
}

// A crown big enough for the question to bite: sovereign, seated in Jerusalem,
// and past the point where it is plainly a rising rather than a kingdom.
function seatedCrown(ctx) {
  const t = T(ctx);
  if (!t || t.overlord) return false;
  const h = ctx.helpers;
  // Reach, not composition (SPEC §146): the Jerusalem half of this test is
  // already `controls`, and a crown that has taken the city and ten provinces
  // has arrived whether or not a treaty has caught up. Counting owned here
  // would have shut the dynastic question against 614's Jewish state for most
  // of the Persian war, which is exactly the reign it is meant to ask about.
  return h.controls(ctx, ctx.game.playerTag, 'Jerusalem')
    && h.countControlled(ctx, ctx.game.playerTag, {}) >= 10;
}

function rulerAt(ctx, key, min) {
  const t = T(ctx);
  const r = t && t.ruler;
  return !!r && Number(r[key] || 0) >= min;
}

// The east open enough to fetch a bride from Babylonia: the line is kept there
// and has been since the exile, so the marriage needs a road to Nehardea.
function eastOpen(ctx) {
  const g = ctx.game;
  const me = g.playerTag;
  for (const k of ['PAR', 'SAS', 'ADI', 'OSR', 'CHX']) {
    const t = g.tags[k];
    if (!t || !t.alive) continue;
    if ((t.atWarWith || []).indexOf(me) >= 0) continue;
    return true;
  }
  return false;
}

export const EVENTS_DAVID = [

  {
    id: 'ev_hd_the_house_that_is_not_davids',
    title: 'The House That Is Not David\'s',
    desc: 'The question has been asked in the street for a generation and it has now '
      + 'been asked in the chamber, which is different. The realm is large, the crown is '
      + 'secure, the succession is orderly — and the man who wears it is not of Judah, and '
      + 'every person in the room can name the verse. The sceptre shall not depart from '
      + 'Judah, nor a lawgiver from between his feet. It is not a fringe reading. It is the '
      + 'reading, and the schools have taught it in every generation since the exile without '
      + 'anybody needing to make a point of it, because until this house there was no house '
      + 'for it to be a point about.\n\n'
      + 'What the chamber wants is not an argument. It is a policy. The archives can be '
      + 'searched, a marriage can be arranged, or the crown can say plainly what it thinks '
      + 'it is — and whatever is said this week will be quoted at every accession this house '
      + 'ever has.',
    forTag: 'player',
    major: true,
    maxYear: 1799,
    trigger: (ctx) => {
      try {
        if (!jewishCrown(ctx) || flag(ctx, 'davidicAnswered') || ownArcRuns(ctx)) return false;
        return seatedCrown(ctx);
      } catch (e) { return false; }
    },
    aiOption: 3,
    historical: 'The Hasmoneans never answered it. They took the diadem, the schools went on '
      + 'objecting, and the objection was still live when Pompey arrived to arbitrate between '
      + 'two of their brothers.',
    options: [
      {
        label: 'Send to Babylonia. The line is kept at Nehardea',
        when: (ctx) => {
          try { return eastOpen(ctx); } catch (e) { return false; }
        },
        tooltip: 'Herod\'s move, made deliberately rather than in a panic: a marriage into the '
          + 'exilarchic house, which has kept the descent from Jehoiachin in writing since the '
          + 'exile. The payoff is not the wedding — it is the grandson, so this is a generation '
          + 'of nothing followed by a title nobody can argue with. +10 legitimacy now, and the '
          + 'eastern communities warm to us (+30 opinion with the eastern courts). The Exilarchate '
          + 'acquires an interest in this succession and every one after it.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers;
            const g = ctx.game;
            const me = g.playerTag;
            h.adjust(ctx, me, { legitimacy: 10 });
            h.addTagModifier(ctx, me, {
              id: 'the_babylonian_marriage', name: 'The Babylonian Marriage', months: -1,
              effects: { legitimacyAdd: 0.15 },
            });
            for (const k of ['PAR', 'SAS', 'ADI']) {
              const t = g.tags[k];
              if (!t || !t.alive) continue;
              if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
              t.opinion[me] = Math.min(200, (t.opinion[me] || 0) + 30);
            }
            h.setFlag(ctx, 'davidicAnswered', true);
            h.setFlag(ctx, 'davidicMarriage', true);
            h.setFlag(ctx, 'davidicMarriageYear', g.date.y);
            h.setFlag(ctx, 'exilarchateHasAClaim', true);
            h.chronicle(ctx, 'ruler', 'A daughter of the exilarchic house is fetched from '
              + 'Babylonia and married into the crown. The genealogy travels with her, copied '
              + 'four times, and the men who carry it do not hurry.');
          } catch (e) { /* content guard */ }
        },
      },
      {
        label: 'Search the archives. Someone in this house is of Judah',
        tooltip: 'The cheap road, and the one every dynasty in history has taken: commission '
          + 'the genealogists and let them find what they have been asked to find. +20 legitimacy '
          + 'at once and +2 authority — and it is not believed by the people whose belief matters. '
          + 'The schools file their objection in writing, where it will keep: −25 with the party '
          + 'of the law, +1 unrest everywhere, permanently. It does not seat a Davidide; it only '
          + 'says one is seated.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers;
            const me = ctx.game.playerTag;
            h.adjust(ctx, me, { legitimacy: 20 });
            h.addTagModifier(ctx, me, {
              id: 'the_commissioned_genealogy', name: 'The Commissioned Genealogy', months: -1,
              effects: { unrestAll: 1 },
            });
            h.doctrine(ctx, 'authority', 2);
            for (const party of ['sages', 'pharisees', 'hasideans', 'priesthood']) {
              h.factionShift(ctx, me, party, -25);
            }
            h.setFlag(ctx, 'davidicAnswered', true);
            h.setFlag(ctx, 'davidicForged', true);
            h.chronicle(ctx, 'era', 'The genealogists are commissioned and return, in due course, '
              + 'with the answer they were commissioned to return. The schools read it carefully '
              + 'and say nothing, at length.');
          } catch (e) { /* content guard */ }
        },
      },
      {
        label: 'A prince, not a king. Ezekiel wrote the office we can hold',
        tooltip: 'Chapters 44 to 46: a nasi who brings his offerings like any man and may not '
          + 'take the people\'s land. It walks around the objection entirely, because Ezekiel\'s '
          + 'prince was never David\'s heir. +25 legitimacy, +2 stability, −1 unrest everywhere '
          + 'and +30 with the party of the law, permanently — and it forecloses the crown of '
          + 'Israel, deliberately and in writing, because a house that has said this cannot '
          + 'later say it is the united monarchy restored.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers;
            const me = ctx.game.playerTag;
            h.adjust(ctx, me, { legitimacy: 25, stability: 2 });
            h.addTagModifier(ctx, me, {
              id: 'the_prince_of_ezekiel', name: 'The Prince of Ezekiel', months: -1,
              effects: { unrestAll: -1, incomeMult: 1.05 },
            });
            h.doctrine(ctx, 'authority', -2);
            for (const party of ['sages', 'pharisees', 'hasideans', 'priesthood']) {
              h.factionShift(ctx, me, party, 30);
            }
            h.setFlag(ctx, 'davidicAnswered', true);
            h.setFlag(ctx, 'davidicRenounced', true);
            h.chronicle(ctx, 'era', 'The crown takes the office of Ezekiel\'s prince and writes '
              + 'the limits of it into the law itself. It is the only answer of the four that '
              + 'closes a door the house can never reopen.');
          } catch (e) { /* content guard */ }
        },
      },
      {
        label: 'The house stands on what it won. Let them keep objecting',
        tooltip: 'The Hasmonean answer, which is to say no answer: the diadem stays, the schools '
          + 'go on saying what they say, and the state runs on the fact of itself. +1 stability '
          + 'and +1 authority — nothing is conceded and nothing is spent. The objection stays '
          + 'live, which means it is available to every rival this house ever has, and the '
          + 'crown of Israel stays out of reach until the question is answered properly.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers;
            const me = ctx.game.playerTag;
            h.adjust(ctx, me, { stability: 1 });
            h.doctrine(ctx, 'authority', 1);
            // Deliberately does NOT set davidicAnswered: the question is not
            // settled, it is postponed, and a later reign may take it up.
            h.setFlag(ctx, 'davidicDeferred', true);
            h.chronicle(ctx, 'ruler', 'The chamber is thanked for its interest. The diadem stays '
              + 'where it is and so does the objection.');
          } catch (e) { /* content guard */ }
        },
      },
    ],
  },

  {
    id: 'ev_hd_the_son_of_the_marriage',
    title: 'The Son of the Marriage',
    desc: 'He is twenty-six and has been in the chancery since he was eighteen, and the '
      + 'thing about him that matters is on a sheet of parchment in the treasury rather than '
      + 'in anything he has done. His mother came from Nehardea with a genealogy, and the '
      + 'genealogy runs — the delegation will read it aloud if invited, and will read it '
      + 'aloud if not — from Jehoiachin, who was king in Jerusalem, in an unbroken line to '
      + 'the boy who does the eastern correspondence.\n\n'
      + 'This is the entire reason the marriage was made, and it has taken a generation to '
      + 'arrive, and now that it has arrived the council has discovered what it costs. A '
      + 'house that seats him has the title and can never again be told it does not. It also '
      + 'concedes, in the same act, that the title came from Babylonia — and Babylonia will '
      + 'be at every accession from now on, holding the parchment.',
    forTag: 'player',
    major: true,
    maxYear: 1799,
    trigger: (ctx) => {
      try {
        if (!jewishCrown(ctx) || !flag(ctx, 'davidicMarriage')) return false;
        if (flag(ctx, 'davidicSonAnswered') || ownArcRuns(ctx)) return false;
        const y0 = Number((ctx.game.flags || {}).davidicMarriageYear);
        if (!Number.isFinite(y0)) return false;
        // A generation, and a court steady enough to hold a succession.
        return (ctx.game.date.y - y0) >= 22 && seatedCrown(ctx);
      } catch (e) { return false; }
    },
    aiOption: 0,
    historical: 'Herod married Mariamne for the pedigree, and then had her killed in 29 BCE and '
      + 'her two sons by her in 7 BCE, because a son with a better title than his father is a '
      + 'rival before he is an heir.',
    options: [
      {
        label: 'Seat him. The house of David returns to the throne it left',
        tooltip: 'What the marriage was arranged for, collected: +35 legitimacy and +0.3 a month '
          + 'permanently, −1 unrest everywhere, and no rival can ever again say this house has no '
          + 'title to what it holds. It is also the requirement for proclaiming the Kingdom of '
          + 'Israel, which is the united monarchy and therefore David\'s. The price is the one the '
          + 'Babylonians came to name: a recognised Exilarchate interest in every succession after '
          + 'this one. −1 authority.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers;
            const me = ctx.game.playerTag;
            h.adjust(ctx, me, { legitimacy: 35, stability: 1 });
            h.addTagModifier(ctx, me, {
              id: 'the_line_of_jehoiachin', name: 'The Line of Jehoiachin', months: -1,
              effects: { legitimacyAdd: 0.3, unrestAll: -1 },
            });
            h.doctrine(ctx, 'authority', -1);
            for (const party of ['sages', 'pharisees', 'hasideans', 'priesthood']) {
              h.factionShift(ctx, me, party, 25);
            }
            h.setFlag(ctx, 'davidicSonAnswered', true);
            h.setFlag(ctx, 'davidicThrone', true);
            h.setFlag(ctx, 'exilarchateHasAClaim', true);
            h.chronicle(ctx, 'era', 'The son of the Babylonian marriage is seated, and the house '
              + 'becomes — in law, in the genealogies, and in the one register this civilisation '
              + 'keeps everything in — the house of David. The delegation from Nehardea stays for '
              + 'the ceremony and leaves with a copy of the record.');
          } catch (e) { /* content guard */ }
        },
      },
      {
        label: 'He does the eastern correspondence very well. The crown stays where it is',
        tooltip: 'Herod\'s actual answer, minus the murders: the pedigree kept as an ornament and '
          + 'the succession kept in the senior line. +2 stability from a succession nobody has to '
          + 'argue about, and the eastern communities draw the obvious conclusion about what their '
          + 'daughter was for — −25 opinion with the eastern courts, −20 with the party of the '
          + 'law. The crown of Israel stays out of reach.',
        effects: (ctx) => {
          try {
            const h = ctx.helpers;
            const g = ctx.game;
            const me = g.playerTag;
            h.adjust(ctx, me, { stability: 2 });
            for (const k of ['PAR', 'SAS', 'ADI']) {
              const t = g.tags[k];
              if (!t || !t.alive || !t.opinion) continue;
              t.opinion[me] = Math.max(-200, (t.opinion[me] || 0) - 25);
            }
            for (const party of ['sages', 'pharisees', 'hasideans', 'priesthood']) {
              h.factionShift(ctx, me, party, -20);
            }
            h.setFlag(ctx, 'davidicSonAnswered', true);
            h.setFlag(ctx, 'davidicSonPassedOver', true);
            h.chronicle(ctx, 'ruler', 'The son of the Babylonian marriage is confirmed in the '
              + 'chancery and passed over for the succession. Nehardea is informed by letter and '
              + 'replies, at length, about something else.');
          } catch (e) { /* content guard */ }
        },
      },
    ],
  },

];
