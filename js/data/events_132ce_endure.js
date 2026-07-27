// Judaea Universalis — three hundred years of a state that should not exist,
// 150–425 CE. Content package. Zero imports; concatenated onto EVENTS_132.
//
// SPEC §118 found that the redemption road — Bar Kokhba wins, the state is
// restored — had its last card at 163 in a chapter running to 425, and closed
// the gap. This package is the rung above that: not "the redemption survived"
// but "the redemption survived long enough to watch both its neighbours become
// something new, and had to decide what it was in relation to them".
//
// The three centuries after 136 are the worst possible three centuries in which
// to be a small state with its own god. Rome Christianises: by 325 the empire
// next door is holding councils about the correct reading of Jewish scripture,
// and by 380 that reading is the law. Persia goes the other way: Ardashir in
// 224 replaces a tolerant Arsacid house with a Zoroastrian state church, and
// Kartir's inscription names the Jews on a list of things he struck at.
// A Judaea that wins in 136 spends the fourth century between two universalising
// empires, each of which has an official answer to a question this state exists
// to keep open.
//
// And the quiet one, which is the best card here: the Talmud is a diaspora
// artifact. The Mishnah was closed around 200 by a Patriarch who had no state,
// no Temple and no army, and its whole method — a portable homeland made of
// argument — is a response to not having a country. A Judaea with a king, a
// Temple and a Sanhedrin sitting in Jerusalem has much less reason to build one.
// Winning the war may cost this civilisation its most durable creation, and the
// card lets the player make that trade knowingly.
//
// TRIGGERS. Bands and conditions, never fixed years except the 425 terminal.
// Ruler `gov` and `age` do real gating work here: a long reign is what lets an
// institution be founded, and a weak one is what lets a rival centre form.
//
// Source spine: Kartir's inscription at Naqsh-e Rostam; Codex Theodosianus
// XVI.8; Canon 1 of Nicaea on the Paschal reckoning.

const _warned = new Set();
function warnOnce(k, e) { if (_warned.has(k)) return; _warned.add(k); console.warn('[events_132ce_endure] ' + k, e || ''); }
function guard(k, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + k, e); } }; }
function safeTrigger(k, fn) { return function (ctx) { try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + k, e); return false; } }; }

function alive(ctx, tag) { const t = ctx.game.tags && ctx.game.tags[tag]; return !!(t && t.alive !== false); }
function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }
function holds(ctx, tag, name) {
  try { const p = ctx.prov(name); return !!p && !p.impassable && p.owner === tag && p.controller === tag; }
  catch (e) { warnOnce('holds', e); return false; }
}
function rulerAt(ctx, tag, key, min) {
  const t = ctx.game.tags && ctx.game.tags[tag];
  const r = t && t.ruler;
  return !!r && Number(r[key] || 0) >= min;
}

// The redemption held: sovereign, in Jerusalem, on the road SPEC §118 opened.
function redeemed(ctx) {
  if (!alive(ctx, 'JUD')) return false;
  const t = ctx.game.tags.JUD;
  return !(t && t.overlord) && holds(ctx, 'JUD', 'Jerusalem') && flag(ctx, 'redemptionEra');
}

function endurance(ctx) {
  if (!redeemed(ctx)) return 0;
  const n = ctx.helpers.countControlled(ctx, 'JUD', {});
  if (n >= 14) return 2;
  if (n >= 9) return 1;
  return 0;
}

export const EVENTS_132_ENDURE = [

  {
    id: 'ev_e_the_book_not_written',
    title: 'The Book That Need Not Be Written',
    desc: 'The Patriarch has brought a proposal that the council finds difficult to '
      + 'take seriously and cannot quite dismiss. He wants the oral law written down — '
      + 'all of it, the rulings and the minority opinions and the reasoning, ordered by '
      + 'subject, fixed, and copied. The objection is obvious and everyone makes it: why? '
      + 'The court sits. The Temple stands. A man with a question walks to Jerusalem and '
      + 'asks it, and gets an answer from the men authorised to give one, and that is what '
      + 'the oral law is FOR — it is oral because there is somewhere to go. Writing it down '
      + 'is what you would do if there were not. The Patriarch does not have a good answer '
      + 'to this. He says only that he has been reading the chronicles of the last war and '
      + 'has begun to think about what would have been left if it had gone the other way, '
      + 'and that the answer appears to be nothing, and that this troubles him.',
    forTag: 'JUD',
    major: true,
    minYear: 185,
    maxYear: 235,
    trigger: safeTrigger('ev_e_the_book_not_written', (ctx) => {
      if (endurance(ctx) < 1 || flag(ctx, 'mishnahAnswered')) return false;
      // A settled reign is what lets an institution get founded at all.
      return rulerAt(ctx, 'JUD', 'gov', 4) || rulerAt(ctx, 'JUD', 'age', 55);
    }),
    aiOption: 1,
    historical: 'Judah ha-Nasi closed the Mishnah around 200 CE, in a Judaea with no state, no Temple and no army. The Talmuds that grew out of it carried Jewish law through eighteen centuries without a country.',
    options: [
      {
        label: 'Write it. A country can be lost; a book is harder to burn',
        tooltip: 'The Mishnah is compiled under a state that does not need it. Costs 60 talents and a decade of the sages\' attention (−10% income, 120 months). +12 legitimacy, +2 stability, Sages +30, +1 zeal — and the civilisation acquires the thing that lets it survive the loss of everything else.',
        effects: guard('ev_e_book:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', { id: 'the_written_law', name: 'The Written Law', months: 120, effects: { incomeMult: 0.90, legitimacyAdd: 0.2 } });
          h.adjust(ctx, 'JUD', { legitimacy: 12, stability: 2 });
          h.factionShift(ctx, 'JUD', 'sages', 30);
          h.doctrine(ctx, 'zeal', 1);
          h.setFlag(ctx, 'mishnahAnswered', true);
          h.setFlag(ctx, 'mishnahWritten', true);
          h.chronicle(ctx, 'era', 'The oral law is written down in a country that has a court to ask instead. The Patriarch is asked why and says he would rather it existed and were unnecessary.');
        }),
      },
      {
        label: 'The court sits. Let the law stay in the mouths of the living',
        tooltip: 'The proposal is declined on the strongest possible grounds: there is a state, so there is no need. +3 stability, +20 Sages, +1 authority, no cost — and the law now depends entirely on the survival of the institution that holds it. If Jerusalem ever falls again, nothing portable survives.',
        effects: guard('ev_e_book:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 3 });
          h.factionShift(ctx, 'JUD', 'sages', 20);
          h.doctrine(ctx, 'authority', 1);
          h.setFlag(ctx, 'mishnahAnswered', true);
          h.setFlag(ctx, 'lawStaysOral', true);
          h.chronicle(ctx, 'ruler', 'The council declines to write the oral law down. There is a court in Jerusalem to ask, and there has been for four hundred years, and there is no reason to think there will not be.');
        }),
      },
    ],
  },

  {
    id: 'ev_e_between_two_churches',
    title: 'Between Two Churches',
    desc: 'Both neighbours have acquired official truths within a lifetime of each '
      + 'other and neither of them has room in it for this country. In the east the '
      + 'Arsacids are gone and the house of Sasan rules with a fire priesthood at its '
      + 'shoulder; there is an inscription cut at Naqsh-e Rostam in which a chief mobad '
      + 'lists the faiths he struck at, and the Jews are on it by name, between the '
      + 'Buddhists and the Christians. In the west the empire that spent three hundred '
      + 'years killing a Jewish sect has been captured by it, and the bishops are '
      + 'holding councils in Greek about the correct reading of books written in Hebrew '
      + 'in this city. Neither empire is planning a war over this. That is what makes '
      + 'it new. They are simply both, in their separate directions, becoming places '
      + 'where a state like this one is an anomaly requiring explanation.',
    forTag: 'JUD',
    major: true,
    minYear: 226,
    maxYear: 400,
    trigger: safeTrigger('ev_e_between_two_churches', (ctx) => {
      if (endurance(ctx) < 1 || flag(ctx, 'twoChurchesAnswered')) return false;
      return alive(ctx, 'ROM') || alive(ctx, 'PAR') || alive(ctx, 'SAS');
    }),
    aiOption: 2,
    historical: 'Kartir\'s inscription names the Jews among the faiths he struck at; the Theodosian Code assembled a century of Roman legislation restricting them. Neither empire ever needed a war to make the position untenable.',
    options: [
      {
        label: 'Lean west. Rome argues about our books; that is a kind of standing',
        tooltip: '+35 Roman opinion, +12% income from the western trade, +2 alignment westward — and the empire that reads your scripture also claims to have superseded it. +1 unrest in every province and a permanent argument the crown cannot win on its own ground.',
        effects: guard('ev_e_churches:0', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', { id: 'the_western_hearing', name: 'The Western Hearing', months: 240, effects: { incomeMult: 1.12, unrestAll: 1 } });
          h.doctrine(ctx, 'alignment', 2);
          if (alive(ctx, 'ROM')) { const t = ctx.game.tags.ROM; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.min(200, (t.opinion.JUD || 0) + 35); } }
          h.setFlag(ctx, 'twoChurchesAnswered', true);
          h.setFlag(ctx, 'leanedWest', true);
          h.chronicle(ctx, 'era', 'Jerusalem takes the western hearing. The bishops go on holding councils about its books and go on not inviting it.');
        }),
      },
      {
        label: 'Lean east. Persia persecutes by decree and forgets to enforce it',
        tooltip: '+35 Persian opinion, +10% manpower from the eastern communities, −2 alignment. The Sasanian state is arbitrary rather than systematic and a good century there is better than a bad one in Rome — but the fire priesthood is patient, and a king who converts is a king who kills.',
        effects: guard('ev_e_churches:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', { id: 'the_eastern_hearing', name: 'The Eastern Hearing', months: 240, effects: { manpowerMult: 1.10, unrestAll: 1 } });
          h.doctrine(ctx, 'alignment', -2);
          for (const tag of ['PAR', 'SAS']) if (alive(ctx, tag)) { const t = ctx.game.tags[tag]; if (t) { t.opinion = t.opinion || {}; t.opinion.JUD = Math.min(200, (t.opinion.JUD || 0) + 35); } }
          h.setFlag(ctx, 'twoChurchesAnswered', true);
          h.setFlag(ctx, 'leanedEast', true);
          h.chronicle(ctx, 'era', 'Jerusalem takes the eastern hearing, on the reasoning that a persecution nobody enforces is preferable to a toleration nobody means.');
        }),
      },
      {
        label: 'Neither. Be the third thing, and pay for it',
        tooltip: 'The expensive answer and the only one that keeps the question open: no patron, no protector, and both empires filing this state under anomalies. −15% income, +2 unrest everywhere (permanent), +15 legitimacy, +3 zeal, Sages +30. Nobody will ever be able to say this country belonged to either of them.',
        effects: guard('ev_e_churches:2', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', { id: 'the_third_thing', name: 'The Third Thing', months: 240, effects: { incomeMult: 0.85, unrestAll: 2, legitimacyAdd: 0.2 } });
          h.adjust(ctx, 'JUD', { legitimacy: 15 });
          h.factionShift(ctx, 'JUD', 'sages', 30);
          h.doctrine(ctx, 'zeal', 3);
          h.setFlag(ctx, 'twoChurchesAnswered', true);
          h.setFlag(ctx, 'theThirdThing', true);
          h.chronicle(ctx, 'era', 'Judaea declines both hearings. It will be a small state between two official truths, and will pay the difference every year, which it does.');
        }),
      },
    ],
  },

  {
    id: 'ev_e_the_king_and_the_nasi',
    title: 'The Crown and the Chair',
    desc: 'There are two seats of authority in this country and everyone has been '
      + 'politely not mentioning it for a generation. The crown governs, taxes, raises '
      + 'the army and appoints. The Patriarch\'s chair fixes the calendar, ordains, '
      + 'answers the diaspora and is written to from Babylonia and Alexandria by people '
      + 'who do not write to the palace. In a country with no state the chair was the '
      + 'only Jewish authority there was, which is why it acquired all of that; the '
      + 'state has now existed for a hundred and fifty years and nobody has ever taken '
      + 'any of it back. The two men are on good terms. Their successors may not be, and '
      + 'the constitutional question is entirely unanswered, and the last time this '
      + 'country left a question like that unanswered the brothers went to war and Rome '
      + 'arbitrated.',
    forTag: 'JUD',
    major: true,
    minYear: 250,
    maxYear: 400,
    trigger: safeTrigger('ev_e_the_king_and_the_nasi', (ctx) => {
      if (endurance(ctx) < 1 || flag(ctx, 'chairAnswered')) return false;
      // A strong governor forces the question; a weak one has it forced on him.
      return rulerAt(ctx, 'JUD', 'gov', 5) || !rulerAt(ctx, 'JUD', 'infl', 3);
    }),
    aiOption: 0,
    historical: 'The Patriarchate held exactly this authority in a Judaea with no state, and Rome abolished it in 425 on the death of Gamaliel VI, ending the office.',
    options: [
      {
        label: 'One authority. The chair answers to the crown',
        tooltip: 'The calendar, ordination and the correspondence come under the palace. +3 stability, +2 authority, +8% income — and the diaspora notices that the rulings now come from a government. Sages −30, and the academies of Babylonia begin quietly deciding for themselves.',
        effects: guard('ev_e_chair:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 3 });
          h.addTagModifier(ctx, 'JUD', { id: 'one_authority', name: 'One Authority', months: 240, effects: { incomeMult: 1.08 } });
          h.factionShift(ctx, 'JUD', 'sages', -30);
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'chairAnswered', true);
          h.setFlag(ctx, 'chairSubordinated', true);
          h.chronicle(ctx, 'ruler', 'The Patriarch\'s chair is brought under the crown. The letters from Babylonia thin out over the following decade and nobody can say precisely when they stopped.');
        }),
      },
      {
        label: 'Two authorities, and put it in writing before anyone dies',
        tooltip: 'The division formalised while both men still like each other: the crown governs the country, the chair holds the calendar and the diaspora. +10 legitimacy, +30 Sages, −1 authority, no tax gain — and a second centre of power that is now constitutionally entitled to exist.',
        effects: guard('ev_e_chair:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 10, stability: 1 });
          h.factionShift(ctx, 'JUD', 'sages', 30);
          h.doctrine(ctx, 'authority', -1);
          h.setFlag(ctx, 'chairAnswered', true);
          h.setFlag(ctx, 'twoAuthorities', true);
          h.chronicle(ctx, 'era', 'Crown and chair divide the authority in writing. It is the first Jewish constitutional settlement in four hundred years and it holds for as long as both parties want it to.');
        }),
      },
    ],
  },

  {
    id: 'ev_e_three_hundred_years',
    title: 'The Year the Office Was Abolished',
    desc: 'In the other history a rescript arrives from Ravenna this year abolishing the '
      + 'Patriarchate of the Jews, the last Patriarch having died without a confirmed '
      + 'successor, and the tax that supported it is redirected to the imperial treasury. '
      + 'It is a short document about an administrative office and it ends the only '
      + 'recognised Jewish authority in the Roman world; after it there is no Jewish '
      + 'institution anywhere that any state acknowledges, and there will not be for '
      + 'fifteen hundred years. No such rescript arrives here. There is nothing to '
      + 'abolish, because the office was never the only thing left.',
    forTag: 'JUD',
    world: true,
    major: true,
    date: { y: 425, m: 1 },
    when: (ctx) => redeemed(ctx),
    aiOption: 0,
    options: [
      {
        label: 'Let the chronicle say what did not happen',
        tooltip: 'Three centuries after Betar. The record closes on a state that outlived the empire\'s conversion, the Arsacids, and the office it never needed.',
        effects: guard('ev_e_three_hundred:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 12, stability: 2 });
          h.chronicle(ctx, 'era', flag(ctx, 'mishnahWritten')
            ? 'Three hundred years after Betar the state stands and so does the book it did not need. One of them will turn out to have been the more durable and there is no way to know which from here.'
            : 'Three hundred years after Betar the state stands, and the law is still in the mouths of living men, because there has always been a court in Jerusalem to ask.');
          h.setFlag(ctx, 'redemptionEndured', true);
        }),
      },
    ],
  },

];
