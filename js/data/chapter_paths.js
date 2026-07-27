// Judaea Universalis — the branching path tree (SPEC §119). Data only, zero
// imports, zero DOM. The map of what each chapter can become.
//
// Every chapter in this game asks one or more questions it will not ask twice —
// does the Temple burn, does Pompey get an answer, is there a Lebanon — and
// then plays out a different set of cards depending on the answer. Until now
// that structure existed only as predicates scattered through seven content
// packages (`judaeaStands`, `romanAftermath`, `judaeaEndures`, `noLebanon`,
// `judaeaFree`), each re-derived from live state at the point of use, and
// nothing anywhere said how many roads a chapter had or whether they all went
// somewhere.
//
// This file says it. It does NOT re-implement the predicates — that would be
// two sources of truth for the same question and they would drift within a
// month. What it records is the evidence: the FLAG each road sets when it is
// taken, the card that opens the road, and the card that closes it. A test can
// then check the tree against the chain it claims to describe — every marker is
// really set by a live card, every named card really exists, no two exclusive
// roads fire in one campaign, and every road actually ends somewhere.
//
// That last check is why this file exists. Assembling it found, without a
// single game being played, that the 132 chapter's REDEMPTION road — the one a
// player most wants to reach, where Bar Kokhba wins and the state is restored —
// had its last card at 163 CE in a chapter that runs to 425. Two hundred and
// sixty-two silent years on the best outcome in the game, while both losing
// roads ran to the end. SPEC §118 is that gap closed; this file is the thing
// that found it, and the thing that will find the next one.
//
// A road is: { id, name, marker, entry, terminal, note }
//   marker    the flag that is set if and only if this road was taken. The
//             tree's whole claim to being true rests on this: a flag no live
//             card sets is a road that no longer exists.
//   entry     the card that opens the road.
//   terminal  the card that closes it, at or near the chapter's last year.
//             `null` is a declared gap, not an omission — see GAPS below.
//   note      what the road is, in one line, for the renderer.
//
// A fork is one question, asked once, with two or more mutually exclusive
// roads. Forks within a chapter are independent of each other: 167 asks about
// Lysias and about Sidetes separately, and the answers do not interact.

export const CHAPTER_PATHS = Object.freeze([

  Object.freeze({
    id: '167bce',
    title: 'The Maccabean Revolt',
    lastYear: -64,
    forks: [
      Object.freeze({
        id: 'the_lysias_expedition',
        question: 'Does the regent march, or has the war already been settled?',
        roads: [
          Object.freeze({
            id: 'expedition', name: 'The Boy King Takes the Field',
            marker: 'royalExpedition', entry: 'ev_royal_expedition',
            terminal: 'ev_jerusalem_terms',
            note: 'Lysias comes south with the elephants and the arc runs to the Honorable Terms.',
          }),
          Object.freeze({
            id: 'settled_early', name: 'The War It Belonged To Was Already Settled',
            marker: null, entry: null, terminal: null,
            retired: 'ev_royal_expedition',
            note: 'A Judaea at peace by −162 never sees the expedition. The engine RETIRES the card '
              + 'with that reason and shows the player the page — this road is a recorded absence, '
              + 'which is why it has no marker and needs no cards.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_settlement_with_sidetes',
        question: 'How does Judaea settle with the last Seleucid who matters?',
        roads: [
          Object.freeze({
            id: 'terms_by_siege', name: 'The Honorable Terms',
            marker: 'jerusalemTerms', entry: 'ev_sidetes_siege',
            terminal: 'ev_hyrcanus_east',
            note: 'The king invests the city and the terms are what end the siege.',
          }),
          Object.freeze({
            id: 'terms_by_letter', name: 'The King Who Cannot Besiege You',
            marker: 'sidetesAccord', entry: 'ev_w_sidetes_summons',
            terminal: 'ev_hyrcanus_east',
            note: 'SPEC §115. A Judaea already at peace gets the letter instead of the towers, '
              + 'and pays. Same destination, no siege.',
          }),
          Object.freeze({
            id: 'refused', name: 'Taken From Enemies, Not Borrowed',
            marker: 'sidetesRefused', entry: 'ev_w_sidetes_summons',
            terminal: 'ev_jerusalem_terms',
            note: 'The demand is refused, the treaty breaks, and the original arc becomes '
              + 'reachable again on the road it was written for.',
          }),
        ],
      }),
    ],
  }),

  Object.freeze({
    id: '67bce',
    title: 'The War of the Brothers',
    lastYear: -29,
    forks: [
      Object.freeze({
        id: 'pompeys_arbitration',
        question: 'Who answers Pompey, and does anyone refuse him?',
        roads: [
          Object.freeze({
            id: 'hyrcanus', name: 'Pompey Chooses the Elder',
            marker: 'submittedHYR', entry: 'ev4_embassy_hyr', terminal: 'ev4_mariamne',
            note: 'The historical road: Hyrcanus submits, Antipater rises, and the house ends '
              + 'with Herod\'s queen.',
          }),
          Object.freeze({
            id: 'aristobulus', name: 'The Younger Brother\'s Answer',
            marker: 'submittedARI', entry: 'ev4_embassy_ari', terminal: 'ev4_mariamne',
            note: 'The same settlement reached through the soldier rather than the priest.',
          }),
          Object.freeze({
            id: 'sovereign', name: 'The Kingdom They Never Renamed',
            marker: 'neverRenamed', entry: 'ev4_v_eagle_refused', terminal: 'ev4_v_never_renamed',
            note: 'Rome is refused and the kingdom keeps its gates: the whole ev4_v_* branch.',
          }),
        ],
      }),
    ],
  }),

  Object.freeze({
    id: '40bce',
    title: 'The Parthian Interlude',
    lastYear: 6,
    forks: [
      Object.freeze({
        id: 'who_wears_the_crown',
        question: 'Antigonus or Herod?',
        roads: [
          Object.freeze({
            id: 'herod', name: 'The Senate Names a King',
            marker: 'herodKing', entry: 'ev5_senate', terminal: 'ev5_berytus',
            note: 'The historical road, ending at Berytus with the sons.',
          }),
          Object.freeze({
            id: 'hasmonean', name: 'Mattathias, High Priest',
            marker: 'hasmoneanHolds', entry: 'ev5_atg_crowned', terminal: null,
            note: 'The last Hasmonean holds the throne against Rome. GAP: no terminal — the '
              + 'road runs out before the chapter does, and ev5_her_leash suggests a further '
              + 'branch that was never given an ending either.',
          }),
        ],
      }),
    ],
  }),

  Object.freeze({
    id: '66ce',
    title: 'The Great Revolt',
    lastYear: 96,
    forks: [
      Object.freeze({
        id: 'how_the_revolt_ends',
        question: 'Does the House fall, or does the Second Kingdom begin?',
        roads: [
          Object.freeze({
            id: 'house_falls', name: 'The Ninth of Av',
            marker: 'templeBurned', entry: 'ev_temple_burns', terminal: 'ev_yavneh_academy',
            note: 'Rome storms the city; the sages begin again at Yavneh.',
          }),
          Object.freeze({
            id: 'second_kingdom', name: 'The House That Stood',
            marker: 'secondKingdom', entry: 'ev_house_that_stood',
            terminal: 'ev_children_of_the_war',
            note: 'Twelve cards that were written and, until SPEC §112 gave risings an ending, '
              + 'had never once been reachable in play.',
          }),
        ],
      }),
      Object.freeze({
        id: 'what_kind_of_kingdom',
        question: 'If the House stood, what kind of state is it?',
        requires: 'secondKingdom',
        roads: [
          Object.freeze({
            id: 'altar', name: 'The Kingdom of the Altar',
            marker: 'kingdomOfTheAltar', entry: 'ev_kind_priest_king', terminal: 'ev_kind_priest_king',
            note: 'Priest-king; the altar is the state.',
          }),
          Object.freeze({
            id: 'chamber', name: 'The Commonwealth of the Chamber',
            marker: 'commonwealthOfTheChamber', entry: 'ev_kind_commonwealth',
            terminal: 'ev_kind_commonwealth',
            note: 'Legitimacy stops depending on a life.',
          }),
          Object.freeze({
            id: 'useful', name: 'The Kingdom Worth More Standing',
            marker: 'worthMoreStanding', entry: 'ev_kind_useful_kingdom',
            terminal: 'ev_kind_useful_kingdom',
            note: 'Rome decides the client is cheaper than the province.',
          }),
        ],
      }),
    ],
  }),

  Object.freeze({
    id: '132ce',
    title: 'The Bar Kokhba Revolt',
    lastYear: 425,
    forks: [
      Object.freeze({
        id: 'how_the_revolt_ends',
        question: 'Does Judaea keep Jerusalem, keep the hills, or keep nothing?',
        roads: [
          Object.freeze({
            id: 'redemption', name: 'The Years of the Redemption',
            marker: 'redemptionEra', entry: 'ev2_era_of_redemption',
            terminal: 'ev2_r_three_hundred_years',
            note: 'The revolt wins. SPEC §118 carries it 212–425; before that its last card '
              + 'was at 163 and the best outcome in the game was also the emptiest.',
          }),
          Object.freeze({
            id: 'galilee', name: 'The Kingdom in the Hills',
            marker: 'galileeKingdom', entry: 'ev2_g_kingdom_in_the_hills',
            terminal: 'ev2_g_what_the_office_was_for',
            note: 'SPEC §114. Beaten out of the city, not out of the hills — the outcome the '
              + 'chapter produced most often and described not at all.',
          }),
          Object.freeze({
            id: 'aftermath', name: 'Syria Palaestina',
            marker: 'patriarchateEnded', entry: 'ev2_syria_palaestina',
            terminal: 'ev2_patriarchate_ends',
            note: 'The historical road, ending with the chair left unfilled in 425.',
          }),
        ],
      }),
    ],
  }),

  Object.freeze({
    id: '614ce',
    title: 'The Persian Conquest',
    lastYear: 692,
    forks: [
      Object.freeze({
        id: 'whose_century',
        question: 'Does the charter hold, or does the Rashidun century arrive?',
        roads: [
          Object.freeze({
            id: 'charter', name: 'The Davidic Charter',
            marker: 'charterDavidic', entry: 'ev_p_v_charter', terminal: 'ev_p_v_outlived',
            note: 'Jerusalem is governed by Jews under Persian licence and the licence holds.',
          }),
          Object.freeze({
            id: 'third_power', name: 'A Kingdom Apart',
            marker: 'kingdomApart', entry: 'ev_p_v_third_power', terminal: 'ev_p_v_outlived',
            note: 'Neither empire\'s client: the state that outlived both the courts that made it.',
          }),
          Object.freeze({
            id: 'rashidun', name: 'The Conquest Century',
            marker: 'arabiaConsolidated', entry: 'ev_p_rashidun', terminal: 'ev_p_dome_rock',
            note: 'The historical road, ending on the Mount in 691.',
          }),
        ],
      }),
    ],
  }),

  Object.freeze({
    id: '1948ce',
    title: 'The War of Independence',
    lastYear: 2000,
    forks: [
      Object.freeze({
        id: 'is_there_a_lebanon',
        question: 'Does a Lebanese state survive to have its settlement collapse?',
        roads: [
          Object.freeze({
            id: 'lebanon_lives', name: 'The Bus at Ain al-Rummaneh',
            marker: 'lebanonCivilWar', entry: 'ev_i_cairo_agreement', terminal: 'ev_i_the_mire',
            note: 'The historical northern arc, nine major cards from 1969 to the Mire.',
          }),
          Object.freeze({
            id: 'no_lebanon', name: 'The Levant Without a Lebanon',
            marker: 'noLebanonArc', entry: 'ev_l_nowhere_to_regroup',
            terminal: 'ev_l_what_the_north_cost',
            note: 'SPEC §113. An occupier inherits the confessional arithmetic and the Guard '
              + 'comes to the Beqaa anyway.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_union',
        question: 'Does the union with Egypt come apart?',
        roads: [
          Object.freeze({
            id: 'secession', name: 'The Syrian Arab Republic',
            marker: null, tagMarker: 'SAR', entry: 'ev_i_secession', terminal: null,
            note: 'September 1961: Syria walks out under a new tag. This road is proved by a '
              + 'STATE rather than a flag — nothing is written down, the Syrian Arab Republic '
              + 'simply exists afterwards. GAP: no declared terminal; the road merges back into '
              + 'the chapter\'s common spine rather than ending.',
          }),
        ],
      }),
    ],
  }),

]);

// Roads that knowingly have no ending yet, with why. A test asserts this list
// matches reality exactly: close one of these and forget to remove it here, or
// let a new road go unfinished, and the suite fails. It is a to-do list the
// build enforces rather than a comment nobody rereads.
export const KNOWN_GAPS = Object.freeze([
  Object.freeze({
    chapter: '40bce', fork: 'who_wears_the_crown', road: 'hasmonean',
    why: 'A surviving Antigonus has no ending, and ev5_her_leash — the Herod who outgrows his '
      + 'leash — reads as a further road that was never given one either. The 40 chapter runs '
      + 'to 6 CE and this road stops well before it.',
  }),
  Object.freeze({
    chapter: '1948ce', fork: 'the_union', road: 'secession',
    why: 'Not a true gap so much as a fork with one road: the union coming apart has no '
      + 'counterpart card for a union that HOLDS, so there is nothing for it to be exclusive '
      + 'with and nothing for it to end against.',
  }),
]);
