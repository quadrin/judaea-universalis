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
    // SPEC §121 pushed this out from −64. The chapter used to stop at Pompey
    // and leave a surviving Hasmonean state sixty-eight silent years; it now
    // runs to the year the NEXT chapter's history ended without it.
    lastYear: 6,
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
        id: 'the_charter',
        question: 'The Greek chancery is embraced and the Hellenizers hold the court. Does the city take a constitution?',
        roads: [
          Object.freeze({
            id: 'greek_jerusalem', name: 'Antioch-at-Jerusalem',
            marker: 'greekJerusalem', entry: 'ev_hz_antioch_at_jerusalem',
            terminal: 'ev_hz_the_greek_jerusalem',
            note: 'SPEC §171. The road the chapter never had: a polis constitution laid over the '
              + 'Temple state, the ephebate question, the families walking out to the wilderness, '
              + 'and a settlement two generations on that neither party expected.',
          }),
          Object.freeze({
            id: 'charter_refused', name: 'It Was Given at Sinai',
            marker: 'charterRefused', entry: 'ev_hz_antioch_at_jerusalem',
            terminal: 'ev_hz_antioch_at_jerusalem',
            note: 'The petition is refused in the one language that ends the argument, and the '
              + 'chancery stays a tool of the crown rather than a constitution. The road is one '
              + 'card long by design: refusing is the end of the question, and the technology '
              + 'surcharge for refusing it (SPEC §166) is what the realm keeps paying instead.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_line_continues',
        question: 'A Hasmonean Judaea reaches the year Parthia sweeps Syria. Which empire?',
        roads: [
          Object.freeze({
            id: 'western_march', name: 'The Western March',
            marker: 'westernMarch', entry: 'ev_w_the_year_parthia_came',
            terminal: 'ev_w_the_year_of_the_other_history',
            note: 'SPEC §121. Judaea anchors the Arsacid frontier and takes the war with Rome '
              + 'that answer has always cost. The largest bet in the chapter, with a documented '
              + 'outcome — Ventidius, within two years.',
          }),
          Object.freeze({
            id: 'declined_the_march', name: 'Declined in Writing',
            marker: 'declinedTheMarch', entry: 'ev_w_the_year_parthia_came',
            terminal: 'ev_w_the_year_of_the_other_history',
            note: 'SPEC §121. The envoys go away with gifts and Antioch is told they did. The '
              + 'useful thing was never which empire you choose but being seen to have chosen.',
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
      Object.freeze({
        id: 'where_the_king_sits',
        question: 'A Jewish king holds Antioch. Where does the empire keep its capital?',
        requires: 'seleucidSuccessor',
        roads: [
          Object.freeze({
            id: 'seat_jerusalem', name: 'The Slow Capital',
            marker: 'seatJerusalem', entry: 'ev_x_where_the_king_sits',
            terminal: 'ev_x_what_the_empire_was_for',
            note: 'SPEC §125. The court refuses the Orontes and governs an empire at the speed '
              + 'of a courier out of the hills, because the alternative is a Temple whose king '
              + 'is three hundred miles away.',
          }),
          Object.freeze({
            id: 'seat_antioch', name: 'The Seat at Antioch',
            marker: 'seatAntioch', entry: 'ev_x_where_the_king_sits',
            terminal: 'ev_x_what_the_empire_was_for',
            note: 'SPEC §125. The machinery finally fits the realm, and the office the state was '
              + 'founded on no longer fits the man holding it.',
          }),
          Object.freeze({
            id: 'two_courts', name: 'Two Courts',
            marker: 'twoCourts', entry: 'ev_x_where_the_king_sits',
            terminal: 'ev_x_what_the_empire_was_for',
            note: 'SPEC §125. Winters on the Orontes, festivals in Jerusalem, two chanceries and '
              + 'a duplicated government called temporary for sixty years.',
          }),
        ],
      }),
    ],
  }),

  Object.freeze({
    id: '67bce',
    title: 'The War of the Brothers',
    // SPEC §123 pushed this out from −29 to the same 6 CE hinge every chapter
    // of this period now runs to.
    lastYear: 6,
    forks: [
      Object.freeze({
        id: 'pompeys_arbitration',
        question: 'Who answers Pompey, and does anyone refuse him?',
        roads: [
          Object.freeze({
            id: 'hyrcanus', name: 'Pompey Chooses the Elder',
            marker: 'submittedHYR', entry: 'ev4_embassy_hyr',
            terminal: 'ev4_c_the_year_the_petition_came',
            note: 'The historical road: Hyrcanus submits, Antipater rises, and the house ends '
              + 'with Herod\'s queen.',
          }),
          Object.freeze({
            id: 'aristobulus', name: 'The Younger Brother\'s Answer',
            marker: 'submittedARI', entry: 'ev4_embassy_ari',
            terminal: 'ev4_c_the_year_the_petition_came',
            note: 'The same settlement reached through the soldier rather than the priest.',
          }),
          Object.freeze({
            id: 'sovereign', name: 'The Kingdom They Never Renamed',
            marker: 'neverRenamed', entry: 'ev4_v_eagle_refused',
            terminal: 'ev4_c_the_year_nobody_petitioned',
            note: 'Rome is refused and the kingdom keeps its gates: the whole ev4_v_* branch.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_client_succession',
        question: 'A throne Rome gave has to be given again. Who decides?',
        requires: 'submittedHYR',
        roads: [
          Object.freeze({
            id: 'settled_in_rome', name: 'The Settled Succession',
            marker: 'successionSettled', entry: 'ev4_c_the_succession_a_client_cannot_have',
            terminal: 'ev4_c_the_year_the_petition_came',
            note: 'SPEC §123. The crown is carried to Italy and settled in public — a crown '
              + 'taken to Rome is a crown admitted to be on loan, and it is still a crown.',
          }),
          Object.freeze({
            id: 'withheld', name: 'An Unsettled House',
            marker: 'successionWithheld', entry: 'ev4_c_the_succession_a_client_cannot_have',
            terminal: 'ev4_c_the_year_the_petition_came',
            note: 'SPEC §123. The will stays in Jerusalem and every notable in Judaea begins '
              + 'quietly making arrangements of his own.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_augustan_question',
        question: 'A court with no patron meets the settlement of the East.',
        requires: 'neverRenamed',
        roads: [
          Object.freeze({
            id: 'signed_as_a_power', name: 'Signed as a Power',
            marker: 'signedAsAPower', entry: 'ev4_c_nothing_to_apologise_for',
            terminal: 'ev4_c_the_year_nobody_petitioned',
            note: 'SPEC §123. A treaty between states: no subsidy, no protection, and no clause '
              + 'anybody can later read as a leash.',
          }),
          Object.freeze({
            id: 'took_the_friendship', name: 'Friend and Ally',
            marker: 'tookTheFriendship', entry: 'ev4_c_nothing_to_apologise_for',
            terminal: 'ev4_c_the_year_nobody_petitioned',
            note: 'SPEC §123. The kingdom that refused the eagle takes the subsidy and the word '
              + 'that comes with it; the country knows the date.',
          }),
        ],
      }),
    ],
  }),

  Object.freeze({
    id: '40bce',
    title: 'The Parthian Interlude',
    // SPEC §124 pushed this out from 6 CE to the spring of 66 — the year the
    // sacrifices ceased in the history the next chapter opens on.
    lastYear: 66,
    forks: [
      Object.freeze({
        id: 'who_wears_the_crown',
        question: 'Antigonus or Herod?',
        roads: [
          Object.freeze({
            id: 'herod', name: 'The Senate Names a King',
            marker: 'herodKing', entry: 'ev5_senate',
            terminal: 'ev5_p_the_spring_of_sixty_six',
            note: 'The historical road, ending at Berytus with the sons.',
          }),
          Object.freeze({
            id: 'hasmonean', name: 'Mattathias, High Priest',
            marker: 'hasmoneanHolds', entry: 'ev5_atg_crowned',
            terminal: 'ev5_k_the_year_the_other_country_rose',
            note: 'The last Hasmonean holds the throne against Rome. SPEC §120 carries it from '
              + 'Actium to 6 CE — the year it does NOT become a province, because Rome annexed '
              + 'thrones it found embarrassing rather than thrones it found inconvenient.',
          }),
          Object.freeze({
            id: 'greater_herod', name: 'Too Large to Be a Favour',
            marker: 'largerThanTheFavour', entry: 'ev5_h_too_large_to_be_a_favour',
            terminal: 'ev5_k_the_year_the_other_country_rose',
            note: 'SPEC §120. A Herod who took Damascus or Petra has outgrown the word client. '
              + 'ev5_provincia used to depose him on the historical schedule regardless; it now '
              + 'stands aside, and this road gets its own 6 CE.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_statue',
        question: 'Caligula wants his image in the Temple. What does this country have to answer with?',
        roads: [
          Object.freeze({
            id: 'statue_refused', name: 'The Field at Ptolemais',
            marker: 'statueRefused', entry: 'ev5_p_the_statue_and_the_crowd',
            terminal: 'ev5_p_the_spring_of_sixty_six',
            note: 'SPEC §124. A province with no instrument but the crowd: Petronius writes that '
              + 'it would have to be depopulated first, and the emperor dies before the statue '
              + 'goes up.',
          }),
          Object.freeze({
            id: 'statue_erected', name: 'The Abomination',
            marker: 'statueErected', entry: 'ev5_p_the_statue_and_the_crowd',
            terminal: 'ev5_p_the_spring_of_sixty_six',
            note: 'SPEC §124. The order is carried out, and nothing in this province for the '
              + 'next twenty-six years is separable from that sentence.',
          }),
          Object.freeze({
            id: 'order_never_given', name: 'The Order That Was Never Given',
            marker: 'orderNeverGiven', entry: 'ev5_k_the_order_that_was_never_given',
            terminal: 'ev5_k_the_year_the_other_country_rose',
            note: 'SPEC §124. A kingdom has an ambassador. The statue is talked out of existence '
              + 'at a dinner — the most expensive meal in the chapter and the cheapest war never '
              + 'fought.',
          }),
          Object.freeze({
            id: 'refused_in_advance', name: 'We Said So First',
            marker: 'refusedInAdvance', entry: 'ev5_k_the_order_that_was_never_given',
            terminal: 'ev5_k_the_year_the_other_country_rose',
            note: 'SPEC §124. The kingdom refuses before it is asked, in writing, with its army '
              + 'on the border — a thing a kingdom can do and a province cannot.',
          }),
        ],
      }),
    ],
  }),

  Object.freeze({
    id: '66ce',
    title: 'The Great Revolt',
    // SPEC §122 pushed this out from 96. Both roads used to stop at Domitian's
    // death; both now run to 130, the year Aelia was founded in the history
    // that produced Bar Kokhba.
    lastYear: 130,
    forks: [
      Object.freeze({
        id: 'how_the_revolt_ends',
        question: 'Does the House fall, or does the Second Kingdom begin?',
        roads: [
          Object.freeze({
            id: 'house_falls', name: 'The Ninth of Av',
            marker: 'templeBurned', entry: 'ev_temple_burns',
            terminal: 'ev_a_a_city_with_another_name',
            note: 'Rome storms the city; the sages begin again at Yavneh, and SPEC §122 carries '
              + 'the road on to the surveyors laying out Aelia in 130.',
          }),
          Object.freeze({
            id: 'second_kingdom', name: 'The House That Stood',
            marker: 'secondKingdom', entry: 'ev_house_that_stood',
            terminal: 'ev_b_no_aelia',
            note: 'Twelve cards that were written and, until SPEC §112 gave risings an ending, '
              + 'had never once been reachable in play — and SPEC §122 carries them on to a 130 '
              + 'in which there is no ruin to found a colony on.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_east_rises_without_a_state',
        question: 'Cyrene is burning and the letters reach Yavneh. Does the land rise?',
        requires: 'templeBurned',
        roads: [
          Object.freeze({
            id: 'joined_the_rising', name: 'The Hour Has Come',
            marker: 'joinedTheRising', entry: 'ev_a_the_east_is_burning',
            terminal: 'ev_a_a_city_with_another_name',
            note: 'SPEC §122. Judaea rises with the diaspora while Trajan is across the Tigris, '
              + 'and the schools that opposed it are broken by it.',
          }),
          Object.freeze({
            id: 'refused_the_rising', name: 'The Hour Has Not Come',
            marker: 'refusedTheRising', entry: 'ev_a_the_east_is_burning',
            terminal: 'ev_a_a_city_with_another_name',
            note: 'SPEC §122. The academy forbids it in writing. The land is spared what Cyrene '
              + 'is not, and the communities that burned know who answered them and how.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_flank_of_trajans_war',
        question: 'Trajan is at the Gulf and the East has risen behind him. A kingdom sits on the road home.',
        requires: 'secondKingdom',
        roads: [
          Object.freeze({
            id: 'road_held_open', name: 'The Road Held Open',
            marker: 'roadHeldOpen', entry: 'ev_b_the_flank_of_the_war',
            terminal: 'ev_b_no_aelia',
            note: 'SPEC §122. The army comes home through a Jewish kingdom, and the communities '
              + 'that rose know exactly who did not come.',
          }),
          Object.freeze({
            id: 'road_shut', name: 'The Road Is Shut',
            marker: 'roadShut', entry: 'ev_b_the_flank_of_the_war',
            terminal: 'ev_b_no_aelia',
            note: 'SPEC §122. Neutrality with teeth: a neutral on your retreat route is a threat '
              + 'by geometry whatever it intends.',
          }),
          Object.freeze({
            id: 'rose_with_the_east', name: 'With the Whole East',
            marker: 'roseWithTheEast', entry: 'ev_b_the_flank_of_the_war',
            terminal: 'ev_b_no_aelia',
            note: 'SPEC §122. The kingdom rises with the emperor on the wrong side of it, and '
              + 'the army that took Ctesiphon has to come home through a hostile country.',
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
      Object.freeze({
        id: 'a_state_or_a_nation',
        question: 'Four Jews in five live under other kings. Does the crown speak for them?',
        requires: 'secondKingdom',
        roads: [
          Object.freeze({
            id: 'speaker_for_the_nation', name: 'Speaker for the Nation',
            marker: 'speakerForTheNation', entry: 'ev_n_the_greater_nation',
            terminal: 'ev_n_what_the_house_was_for',
            note: 'SPEC §125. Jerusalem claims to answer for Jews who are subjects of other '
              + 'kings. No ancient state has made the claim and no law covers it.',
          }),
          Object.freeze({
            id: 'state_not_nation', name: 'A Country, Not a People',
            marker: 'stateNotNation', entry: 'ev_n_the_greater_nation',
            terminal: 'ev_n_what_the_house_was_for',
            note: 'SPEC §125. Sovereignty stops at the frontier — and Babylonia, asked nothing '
              + 'and owed nothing, begins deciding for itself.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_second_government',
        question: 'The war is over and the emergency with it. Does the priestly settlement survive peace?',
        requires: 'secondKingdom',
        roads: [
          Object.freeze({
            id: 'temple_state', name: 'The Temple-State',
            marker: 'settlementTempleState', entry: 'ev_s_the_second_government',
            terminal: 'ev_s_the_argument_at_sixty',
            note: 'SPEC §130. The ancient constitution restored — the only one of the four with '
              + 'a working precedent, and it hands the country back to the four houses that '
              + 'Pesachim 57a curses by name.',
          }),
          Object.freeze({
            id: 'the_lottery', name: 'The Lot',
            marker: 'settlementLottery', entry: 'ev_s_the_second_government',
            terminal: 'ev_s_the_argument_at_sixty',
            note: 'SPEC §130. What the Zealots actually did in 67, kept: the High Priesthood by '
              + 'lot, and hereditary priestly power ends in an afternoon.',
          }),
          Object.freeze({
            id: 'the_jubilee', name: 'The Jubilee Enforced',
            marker: 'settlementJubilee', entry: 'ev_s_the_second_government',
            terminal: 'ev_s_the_argument_at_sixty',
            note: 'SPEC §130. Leviticus 25 applied — the Sicarii burned the debt archives in 66 '
              + 'and Simon bar Giora proclaimed liberty. Obeying the Torah and destroying the '
              + 'credit system are the same act.',
          }),
          Object.freeze({
            id: 'no_ruler_but_god', name: 'No Ruler But God',
            marker: 'settlementNoRuler', entry: 'ev_s_the_second_government',
            terminal: 'ev_s_the_argument_at_sixty',
            note: 'SPEC §130. Judas the Galilean\'s doctrine, held sixty years and never once '
              + 'implemented, because implementing it means having no state to implement it '
              + 'with. Menahem came in royal dress and his own side killed him.',
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
      Object.freeze({
        id: 'the_book_or_the_court',
        question: 'The Patriarch wants the oral law written down. A state that has a court to ask does not need one.',
        requires: 'redemptionEra',
        roads: [
          Object.freeze({
            id: 'mishnah_written', name: 'The Written Law',
            marker: 'mishnahWritten', entry: 'ev_e_the_book_not_written',
            terminal: 'ev_e_three_hundred_years',
            note: 'SPEC §125. The Mishnah is compiled by a civilisation that does not need it, '
              + 'which is the only condition under which it can be compiled cheaply.',
          }),
          Object.freeze({
            id: 'law_stays_oral', name: 'In the Mouths of the Living',
            marker: 'lawStaysOral', entry: 'ev_e_the_book_not_written',
            terminal: 'ev_e_three_hundred_years',
            note: 'SPEC §125. Declined on the strongest grounds available — there is a state, so '
              + 'there is no need — and nothing portable survives if the state ever stops.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_house_itself',
        question: 'The altar stands on the cleared Mount. Is a sanctuary built over it, and at what scale?',
        requires: 'redemptionEra',
        roads: [
          Object.freeze({
            id: 'built_great', name: 'On Herod\'s Footings',
            marker: 'houseBuiltGreat', entry: 'ev_h_the_house_itself',
            terminal: 'ev_e_three_hundred_years',
            note: 'SPEC §126. Building large is agreeing with Herod, which is a judgement the '
              + 'revolt did not think it was going to have to make.',
          }),
          Object.freeze({
            id: 'built_small', name: 'What the Country Can Pay For',
            marker: 'houseBuiltSmall', entry: 'ev_h_the_house_itself',
            terminal: 'ev_e_three_hundred_years',
            note: 'SPEC §126. Zerubbabel\'s answer, and the old men who saw the first one wept '
              + 'at it (Ezra 3:12).',
          }),
          Object.freeze({
            id: 'house_declined', name: 'The Altar Is Enough',
            marker: 'houseDeclined', entry: 'ev_h_the_house_itself',
            terminal: 'ev_e_three_hundred_years',
            note: 'SPEC §126. The Ezra move held deliberately: offerings resume in the open air '
              + 'and no building is raised that a defeat could turn into rubble again.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_accession',
        question: 'The founder left no rule of succession. What is the house of Kosiba?',
        requires: 'redemptionEra',
        roads: [
          Object.freeze({
            id: 'kosiba_crown', name: 'The Crown of Beit Kosiba',
            marker: 'kosibaCrowned', entry: 'ev_bk_the_accession',
            terminal: 'ev_bk_bar_kokhba_or_bar_koziba',
            note: 'SPEC §128. The diadem in one generation where the Hasmoneans took three, '
              + 'from a worse starting position: this house cannot even claim Joarib.',
          }),
          Object.freeze({
            id: 'kosiba_david', name: 'The Davidic Marriage',
            marker: 'kosibaMarriedDavid', entry: 'ev_bk_the_accession',
            terminal: 'ev_bk_bar_kokhba_or_bar_koziba',
            note: 'SPEC §128. Herod\'s move: marry the pedigree you do not have. Needs the east '
              + 'open, costs a generation, and hands the Exilarchate a permanent claim.',
          }),
          Object.freeze({
            id: 'kosiba_two_houses', name: 'Two Houses',
            marker: 'kosibaTwoHouses', entry: 'ev_bk_the_accession',
            terminal: 'ev_bk_bar_kokhba_or_bar_koziba',
            note: 'SPEC §128. Shimon and Eleazar made hereditary, as the coins implied — the '
              + 'Hasmonean collapse run in reverse, which nobody has tried.',
          }),
          Object.freeze({
            id: 'kosiba_nasi', name: 'The Prince of Ezekiel',
            marker: 'kosibaNasiConstitution', entry: 'ev_bk_the_accession',
            terminal: 'ev_bk_bar_kokhba_or_bar_koziba',
            note: 'SPEC §128. A hereditary office engineered not to be a monarchy (Ezek. 44–46), '
              + 'which walks around the Davidic objection because Ezekiel\'s prince was never '
              + 'David\'s heir — and which forbids the land leases the founder lived on.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_grass_on_akivas_cheeks',
        question: 'Victory inverted the record. What becomes of a century of the academies\' own recorded doubt?',
        requires: 'beitKosibaSettled',
        roads: [
          Object.freeze({
            id: 'doubt_suppressed', name: 'Collect the Copies',
            marker: 'doubtSuppressed', entry: 'ev_bk_grass_on_akivas_cheeks',
            terminal: 'ev_bk_bar_kokhba_or_bar_koziba',
            note: 'SPEC §128. A clean founding, bought by teaching the one institution this '
              + 'civilisation keeps everything in that its records are negotiable.',
          }),
          Object.freeze({
            id: 'doubt_preserved', name: 'Shelve It With Everything Else',
            marker: 'doubtPreserved', entry: 'ev_bk_grass_on_akivas_cheeks',
            terminal: 'ev_bk_bar_kokhba_or_bar_koziba',
            note: 'SPEC §128. An honest tradition, and a book every rival for three hundred '
              + 'years can quote from.',
          }),
          Object.freeze({
            id: 'doubt_canonized', name: 'The Canonised Doubt',
            marker: 'doubtCanonized', entry: 'ev_bk_grass_on_akivas_cheeks',
            terminal: 'ev_bk_bar_kokhba_or_bar_koziba',
            note: 'SPEC §128. The dissent read out at the founding every year, on the grounds '
              + 'that a redeemer who cannot be criticised is an idol. Costs legitimacy '
              + 'permanently and buys the one thing no other answer does.',
          }),
        ],
      }),
    ],
  }),

  Object.freeze({
    id: '529ce',
    title: 'The Keepers',
    // SPEC §136 shipped the opening chain — 529–531, the statute to the
    // phylarch — with two forks live and every road of both declared open,
    // because their terminals belonged to a tail nobody had written. SPEC §151
    // is that tail: the 531–614 cards the gap list was waiting for, and the
    // two forks §136 charted and left empty. The chapter now has no declared
    // gaps, which is the first time it has been able to say so.
    lastYear: 614,
    forks: [
      Object.freeze({
        id: 'what_kind_of_rising',
        question: 'A people that has never had a king is offered one. Does it take him?',
        roads: [
          Object.freeze({
            id: 'crowned_and_the_charioteer', name: 'A King in Israel',
            marker: 'niciasKilled', entry: 'ev529_the_games_at_neapolis',
            terminal: 'ev529_the_last_rising',
            note: 'SPEC §136. The diadem, the races, and the charioteer executed for winning. '
              + 'The historical road, and the point of no return: a court that kills a sportsman '
              + 'in front of four thousand witnesses has told the empire what it claims to be. '
              + 'It runs to the fourth rising in ninety years, which is the last one the '
              + 'sources on either side bother to record.',
          }),
          Object.freeze({
            id: 'crowned_and_the_palm', name: 'Let Him Take the Palm',
            marker: 'niciasSpared', entry: 'ev529_the_games_at_neapolis',
            terminal: 'ev529_sergius_of_caesarea',
            note: 'SPEC §136. The crown without the sentence. A rising that can still be '
              + 'negotiated with — and a king the men who crowned him have watched flinch. '
              + 'It ends where being negotiable finally pays: the 551 easing, obtained by a '
              + 'Christian bishop on the grounds that the persecution had become inefficient.',
          }),
          Object.freeze({
            id: 'no_king', name: 'The Torah Has No King in It',
            marker: 'crownRefused', entry: 'ev529_the_games_at_neapolis',
            terminal: 'ev529_the_office_they_never_filled',
            note: 'SPEC §136. The priesthood\'s answer and the older one. It costs the rising '
              + 'the thing a crown buys and gains it the thing a crown costs: there is nobody '
              + 'for the empire to send to Constantinople in a box. Its terminal is its own '
              + 'and not a shared one, because forty-four years later the sons of the men who '
              + 'wanted a crown have an argument nobody could have made in 529.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_mountain',
        question: 'There is a church on the summit and a commandment to build the altar there.',
        roads: [
          Object.freeze({
            id: 'altar_rebuilt', name: 'The Altar on the Mountain',
            marker: 'gerizimCleared', entry: 'ev529_gerizim',
            terminal: 'ev529_the_wall_on_the_summit',
            note: 'SPEC §136. The theology, taken. It is also a garrison on a bare rock with '
              + 'one road up it, which is why the captains asked the crown to say out loud what '
              + 'it was buying. The 132 chapter has this identical decision on a different '
              + 'mountain, and the two claims annihilate each other. It ends where the mountain '
              + 'is answered for the last time — Procopius\' wall, built by whoever holds the '
              + 'rock in 536.',
          }),
          Object.freeze({
            id: 'villages_first', name: 'The Villages First',
            marker: 'gerizimLeft', entry: 'ev529_gerizim',
            terminal: 'ev529_what_the_villages_kept',
            note: 'SPEC §136. The summit left to its garrison and the men kept where the '
              + 'fighting is. A rising that will not take the mountain has to explain, every '
              + 'year, what it is for — and it is answered in 614 by whether there is still a '
              + 'community in those villages when the Persians come up the coast road.',
          }),
        ],
      }),
      Object.freeze({
        id: 'ctesiphon',
        question: 'The rising is broken and the refugees have reached the Persian court. '
          + 'What do they offer?',
        roads: [
          Object.freeze({
            id: 'the_promise', name: 'Fifty Thousand Men',
            marker: 'ctesiphonPromised', entry: 'ev529_the_letter_to_ctesiphon',
            terminal: 'ev529_the_year_the_peace_broke',
            note: 'SPEC §151. The offer Malalas records, made in the community\'s own names. '
              + 'It buys a friendly file in one chancery and a hostile one in the other, and '
              + 'the invasion it asks for arrives in 540, three hundred miles north, for '
              + 'entirely Persian reasons.',
          }),
          Object.freeze({
            id: 'the_men_not_the_letter', name: 'Send the Men, Not the Letter',
            marker: 'sentTheYoungMen', entry: 'ev529_the_letter_to_ctesiphon',
            terminal: 'ev529_the_year_the_peace_broke',
            note: 'SPEC §151. Service in the east without a signature anywhere. The remittances '
              + 'come home for thirty years and the muster rolls do not.',
          }),
          Object.freeze({
            id: 'no_pretext', name: 'A People That Is a Pretext',
            marker: 'ctesiphonRefused', entry: 'ev529_the_letter_to_ctesiphon',
            terminal: 'ev529_the_year_the_peace_broke',
            note: 'SPEC §151. The delegation disowned in writing, in a letter meant to be read '
              + 'by the dux. It buys nothing and removes the one charge the statute did not '
              + 'already contain.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_two_houses',
        question: 'Caesarea is in the street in 556 and so are the Jews of the same city. '
          + 'Is this one rising or two?',
        roads: [
          Object.freeze({
            id: 'rose_together', name: 'Both Houses, or Neither',
            marker: 'roseWithTheJews', entry: 'ev529_the_praetorium_at_caesarea',
            terminal: 'ev529_the_last_rising',
            note: 'SPEC §151. The one thing in four hundred years the two Israelite communities '
              + 'did together, and the chapter\'s hardest fork: the schism is not settled, it is '
              + 'simply not mentioned for a week. The Eleazarite line has no liturgy for it.',
          }),
          Object.freeze({
            id: 'rose_alone', name: 'The Quarter Rises Alone',
            marker: 'roseAlone', entry: 'ev529_the_praetorium_at_caesarea',
            terminal: 'ev529_the_last_rising',
            note: 'SPEC §151. The rising is ours and so is the punishment. The distinction '
              + 'between the two quarters is entirely lost on the troops sent to restore order.',
          }),
          Object.freeze({
            id: 'quarter_shut', name: 'A Riot With a Governor\'s Body in It',
            marker: 'quarterKeptShut', entry: 'ev529_the_praetorium_at_caesarea',
            terminal: 'ev529_what_the_villages_kept',
            note: 'SPEC §151. The quarter held indoors and the dux told so in writing. It is '
              + 'the road that buys the most years and costs the most to say out loud, and it '
              + 'is answered by the count in 614 rather than by anything in 556.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_taheb',
        question: 'The restorer of Deuteronomy 18:18 has a claimant in the villages. '
          + 'Is the age the age?',
        roads: [
          Object.freeze({
            id: 'taheb_proclaimed', name: 'The Fanuta Is Over',
            marker: 'tahebProclaimed', entry: 'ev529_the_taheb',
            terminal: 'ev529_what_the_villages_kept',
            note: 'SPEC §151. A state that answers to a prophecy rather than to a council, '
              + 'which is a more dangerous thing than a king and is understood as such by '
              + 'everybody including the High Priest, who is present and does not put his hand '
              + 'on him.',
          }),
          Object.freeze({
            id: 'taheb_awaited', name: 'The Office Kept Open',
            marker: 'tahebAwaited', entry: 'ev529_the_taheb',
            terminal: 'ev529_what_the_villages_kept',
            note: 'SPEC §151. The priesthood\'s oldest function, which is to decline to certify. '
              + 'An expectation nobody has spent is an expectation still available in 614.',
          }),
          Object.freeze({
            id: 'taheb_is_the_people', name: 'The Keeping Is the Restoration',
            marker: 'tahebIsThePeople', entry: 'ev529_the_taheb',
            terminal: 'ev529_what_the_villages_kept',
            note: 'SPEC §151. The Council of Seven\'s answer: a people still here in the morning '
              + 'has done the thing the prophecy describes. It is not popular and it is not '
              + 'overturned, and it is the same claim the chapter\'s victory condition makes.',
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
      Object.freeze({
        id: 'what_stands_on_the_mount',
        question: 'The platform is cleared and the genealogies exist. Is the altar rebuilt?',
        roads: [
          Object.freeze({
            id: 'altar_restored', name: 'The Altar Restored',
            marker: 'altarRestored', entry: 'ev_t_the_altar_rebuilt',
            terminal: 'ev_t_what_was_built_instead',
            note: 'SPEC §125. Sacrifice resumes for the first time since Titus — and both '
              + 'neighbours acquire a standing theological reason to want the city.',
          }),
          Object.freeze({
            id: 'mount_kept_empty', name: 'Swept, and Left as It Is',
            marker: 'mountKeptEmpty', entry: 'ev_t_the_altar_rebuilt',
            terminal: 'ev_t_what_was_built_instead',
            note: 'SPEC §125. A cleared platform offends nobody: the state stays an '
              + 'administrative fact rather than a claim, and the generation that took the '
              + 'city dies without seeing it.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_window_of_628',
        question: 'Both empires have destroyed each other and neither can field an army in Syria. Does the kingdom move?',
        roads: [
          Object.freeze({
            id: 'took_the_ground', name: 'The Empty Ground',
            marker: 'tookTheEmptyGround', entry: 'ev_w_both_empires_died',
            terminal: 'ev_t_what_was_built_instead',
            note: 'SPEC §126. The same vacuum the Rashidun walked into, entered first. It is the '
              + 'only decade in the chapter when this state can expand at all.',
          }),
          Object.freeze({
            id: 'depth_not_reach', name: 'Depth, Not Reach',
            marker: 'depthNotReach', entry: 'ev_w_both_empires_died',
            terminal: 'ev_t_what_was_built_instead',
            note: 'SPEC §126. The window is spent on walls and stores instead of ground, on the '
              + 'reasoning that whoever fills the vacuum will arrive either way.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_line_of_jehoiachin',
        question: 'A throne in Jerusalem and a man with the pedigree for it, in one polity, for the first time since 586 BCE.',
        requires: 'oneCrownBothCentres',
        roads: [
          Object.freeze({
            id: 'david_crowned', name: 'The Crown of David',
            marker: 'davidCrowned', entry: 'ev_d_the_crown_of_david',
            terminal: 'ev_d_the_morning_after',
            note: 'SPEC §126. A son of David is crowned with the offerings going up, and the '
              + 'kingdom spends every morning afterwards explaining what that did and did not '
              + 'mean.',
          }),
          Object.freeze({
            id: 'david_declined', name: 'The Pedigree Honoured, the Crown Kept',
            marker: 'davidDeclined', entry: 'ev_d_the_crown_of_david',
            terminal: 'ev_d_the_morning_after',
            note: 'SPEC §126. The line is acknowledged and seated and not enthroned — the '
              + 'Hasmonean answer, given by a house that knows what it cost them.',
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
        id: 'the_absorption',
        question: 'The population doubles in under four years. What is it paid for with?',
        roads: [
          Object.freeze({
            id: 'development_towns', name: 'The Development Towns',
            marker: 'developmentTowns', entry: 'ev_ab_the_gates',
            terminal: 'ev_ab_what_the_decade_made',
            note: 'SPEC §171. The gates open, the camps are rebuilt in place as towns on borrowed '
              + 'money, and the decade ends with the founding establishment making room.',
          }),
          Object.freeze({
            id: 'the_camps_held', name: 'The Camps Hold',
            marker: 'campsHeld', entry: 'ev_ab_the_gates',
            terminal: 'ev_ab_what_the_decade_made',
            note: 'Rationing tightened and the building deferred. The treasury survives and the '
              + 'camps become a political constituency that remembers — the fault line the state '
              + 'is still arguing about.',
          }),
        ],
      }),
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
              + 'simply exists afterwards. It has no terminal because it IS the chapter\'s '
              + 'main line from 1961 on: everything after it is written for a separate Syria.',
          }),
          Object.freeze({
            id: 'union_holds', name: 'One Cabinet, Two Countries',
            marker: 'unionHeldByForce', entry: 'ev_i_secession',
            terminal: 'ev_i_what_the_union_was',
            note: 'SPEC §120. The paratroops land at Latakia and this time they do not '
              + 'surrender. The road existed as an option and went nowhere; it now runs to '
              + 'a 2000 that asks what the union was.',
          }),
        ],
      }),
      Object.freeze({
        id: 'the_oldest_question',
        question: 'The state administers a large population that holds no citizenship in it. What is the arrangement?',
        roads: [
          Object.freeze({
            id: 'one_citizenship', name: 'One State, One Citizenship',
            marker: 'oneCitizenship', entry: 'ev_z_the_question_that_came_back',
            terminal: 'ev_z_what_the_century_asked',
            note: 'SPEC §125. Annexation with the franchise attached. The occupation costs stop '
              + 'and the electorate is not the one the founders drew up.',
          }),
          Object.freeze({
            id: 'the_settled_line', name: 'Two States, One Border',
            marker: 'theSettledLine', entry: 'ev_z_the_question_that_came_back',
            terminal: 'ev_z_what_the_century_asked',
            note: 'SPEC §125. The hill country and Gaza change hands and the letters of '
              + 'recognition are exchanged; the withdrawal is irreversible whether or not the '
              + 'recognition holds.',
          }),
          Object.freeze({
            id: 'settled_later', name: 'To Be Settled Later',
            marker: 'settledLater', entry: 'ev_z_the_question_that_came_back',
            terminal: 'ev_z_what_the_century_asked',
            note: 'SPEC §125. The arrangements continue and are not called permanent. Every '
              + 'other answer stays open and every one of them gets more expensive.',
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
// The Keepers' five roads were the standing entry here from SPEC §136 until
// §151 wrote the 531–614 tail they were waiting for. What closed them is
// recorded in the chapter above rather than here, which is the only state a
// to-do list is allowed to end in.
export const KNOWN_GAPS = Object.freeze([
  Object.freeze({
    chapter: '1948ce', fork: 'the_union', road: 'secession',
    why: 'Not an unfinished road but the chapter\'s main line: after September 1961 every '
      + 'later card is written for a separate Syria, so the secession has no ending of its own '
      + 'to reach — it simply becomes the spine. Its counterpart, the union held by force, is '
      + 'the one that needed a terminal and now has one (SPEC §120).',
  }),
]);
