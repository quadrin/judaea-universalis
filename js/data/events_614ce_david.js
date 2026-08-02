// Judaea Universalis — the line of Jehoiachin, 640–690 CE. Content package.
// Zero imports; concatenated onto EVENTS_614.
//
// Every Jewish state in this game has ruled without the one qualification that
// the tradition actually specifies. The Hasmoneans were priests and the crown
// they took in 104 was the standing grievance against them for a century — the
// throne of Israel belongs to the house of David and they were of the house of
// Joarib. Bar Kokhba's title on his own coins is Nasi, Prince, not king, and
// the Davidic claim was never made for him; Akiva read him out of Numbers 24
// as the star, which is a messianic argument and not a genealogical one, and
// Yohanan ben Torta's reply about grass growing from Akiva's cheeks is in the
// record because somebody thought the distinction mattered.
//
// The Exilarch is the exception. The Resh Galuta of Babylonia claimed direct
// male descent from Jehoiachin, the last king of Judah, who was carried to
// Babylon in 597 and released from prison there in 561 and given a seat above
// the other kings (2 Kings 25:27–30) — the last verses of the book, and
// pointedly the last thing it says. The line is written down: Seder Olam Zutta
// gives it, Sherira Gaon's epistle gives it, and it was recognised by the
// Sasanian state, which seated the Exilarch at court with rank.
//
// So a Jewish kingdom that unites both centres arrives at a situation that has
// not existed since 586 BCE: a throne, and a man with the pedigree for it, in
// the same polity. Everything the tradition promises about the restoration of
// the house of David becomes, abruptly, an administrative question with a name
// attached — and the state that answers it has to live in whatever world the
// answer creates. If a son of David is crowned in Jerusalem with the offerings
// going up, then either the days have come or they have not, and if they have
// not, the kingdom must explain that every morning for as long as it lasts.
//
// TRIGGERS. Conditions, not dates. The pedigree card needs both centres in one
// polity; the coronation needs a ruler with the standing to hand over a crown
// or the age to be thinking about who gets it next.
//
// Source spine: 2 Kings 25:27–30; Seder Olam Zutta; Sherira Gaon's Epistle;
// Josephus, Ant. XIII.372 for the Hasmonean grievance.

const _warned = new Set();
function warnOnce(k, e) { if (_warned.has(k)) return; _warned.add(k); console.warn('[events_614ce_david] ' + k, e || ''); }
function guard(k, fn) { return function (ctx) { try { fn(ctx); } catch (e) { warnOnce('effects:' + k, e); } }; }
function safeTrigger(k, fn) { return function (ctx) { try { return !!fn(ctx); } catch (e) { warnOnce('trigger:' + k, e); return false; } }; }

function alive(ctx, tag) { const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)]; return !!(t && t.alive !== false); }
function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }
function holds(ctx, tag, name) {
  try {
    const held = who(ctx, tag);
    const p = ctx.prov(name);
    return !!p && !p.impassable && p.owner === held && p.controller === held;
  } catch (e) { warnOnce('holds', e); return false; }
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
function rulerAt(ctx, tag, key, min) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  const r = t && t.ruler;
  return !!r && Number(r[key] || 0) >= min;
}

function thirdPower(ctx) {
  if (!alive(ctx, 'JUD')) return false;
  const t = ctx.game.tags.JUD;
  if (t && t.overlord) return false;
  if (!holds(ctx, 'JUD', 'Jerusalem')) return false;
  return flag(ctx, 'charterDavidic') || flag(ctx, 'kingdomApart');
}

// Both centres in one polity, however that was arranged.
function bothCentres(ctx) {
  return flag(ctx, 'oneCrownBothCentres') || flag(ctx, 'twoHousesOnePeople');
}

export const EVENTS_614_DAVID = [

  {
    id: 'ev_d_the_line_of_jehoiachin',
    title: 'The Line of Jehoiachin',
    desc: 'The Exilarch has sent his genealogy. It is not a gesture and it is not a '
      + 'boast; it is a legal document, copied and witnessed, and it has been kept '
      + 'continuously by an institution the Persian court recognised and seated with rank '
      + 'for four hundred years. It runs male line from the head of the present house back '
      + 'through the Babylonian generations to Jehoiachin, king of Judah, who was carried '
      + 'off in the eighth year of Nebuchadnezzar and released from prison in the '
      + 'thirty-seventh year of his captivity and given a seat above the other kings who '
      + 'were with him in Babylon — which is the last thing the book of Kings records '
      + 'before it stops, and the sages have always held that it stops there on purpose. '
      + 'The covering letter is four lines long and asks nothing. The council has read it '
      + 'as asking the only question there is, because the man on the throne of this '
      + 'kingdom is not of that house, and neither was Simon, and neither was Judah, and '
      + 'neither has anyone been for twelve hundred years.',
    forTag: 'JUD',
    major: true,
    minYear: 640,
    maxYear: 685,
    trigger: safeTrigger('ev_d_the_line', (ctx) => thirdPower(ctx) && bothCentres(ctx) && !flag(ctx, 'pedigreeAnswered')),
    aiOption: 0,
    historical: 'The Exilarchate claimed unbroken male descent from Jehoiachin and was recognised as such by the Sasanian state. No Hasmonean, and no leader of either revolt, ever claimed the descent.',
    options: [
      {
        label: 'Enter it in the record and say nothing further',
        tooltip: 'The document is filed, verified and left alone. +1 stability, +10 Exilarch\'s house — and a genealogy in the archive that every party in the kingdom now knows is there. The question returns.',
        effects: guard('ev_d_line:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 1 });
          h.factionShift(ctx, 'JUD', 'exilarch', 10);
          h.setFlag(ctx, 'pedigreeAnswered', true);
          h.setFlag(ctx, 'pedigreeFiled', true);
          h.chronicle(ctx, 'era', 'The Exilarch\'s genealogy is verified and entered in the archive of the kingdom. No comment is appended to it, which is itself read as a comment.');
        }),
      },
      {
        label: 'Dispute it. Twelve hundred years is a long time to keep a list',
        tooltip: 'The pedigree examined by the crown\'s own scholars with instructions to find the gap. +2 authority, +20 with the reigning house\'s partisans — and a public quarrel about descent that the kingdom cannot win cleanly and that the academies of the east will adjudicate. Exilarch\'s house −35, +2 unrest in the eastern provinces.',
        effects: guard('ev_d_line:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'JUD', { id: 'the_disputed_line', name: 'The Disputed Line', months: 240, effects: { unrestAll: 2 } });
          h.factionShift(ctx, 'JUD', 'exilarch', -35);
          h.factionShift(ctx, 'JUD', 'fighters', 15);
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'pedigreeAnswered', true);
          h.setFlag(ctx, 'pedigreeDisputed', true);
          h.chronicle(ctx, 'era', 'The crown puts its scholars on the Exilarch\'s genealogy. They report in eleven months and their report is not published.');
        }),
      },
    ],
  },

  {
    id: 'ev_d_the_crown_of_david',
    title: 'The Crown of David',
    desc: 'It has taken two years to get to a room where this can be said and it is now '
      + 'being said. There is a throne in Jerusalem and there is a man whose right to it '
      + 'is written down and witnessed and older than any other claim in the Jewish world, '
      + 'and the two things are in the same kingdom for the first time since Nebuchadnezzar. '
      + 'The reigning house did not take the crown by fraud. It took it out of a war, which '
      + 'is how the Hasmoneans took theirs, and the objection to the Hasmoneans is written '
      + 'in every book the sages have produced since. The Exilarch has been scrupulous and '
      + 'has asked for nothing. He has also not gone home. Everybody in the room understands '
      + 'what is actually being decided, which is not who wears a diadem: it is whether the '
      + 'restoration of the house of David is a thing that has now happened, in this city, '
      + 'this year, with witnesses — and what the kingdom will be obliged to be on the '
      + 'morning after it says so.',
    forTag: 'JUD',
    major: true,
    minYear: 645,
    maxYear: 690,
    trigger: safeTrigger('ev_d_the_crown', (ctx) => {
      if (!thirdPower(ctx) || !flag(ctx, 'pedigreeFiled') || flag(ctx, 'davidAnswered')) return false;
      // A ruler secure enough to hand a crown over, or old enough to be thinking
      // about who takes it next.
      return rulerAt(ctx, 'JUD', 'infl', 4) || rulerAt(ctx, 'JUD', 'age', 60);
    }),
    aiOption: 1,
    historical: 'No Davidide was ever crowned. The Exilarchate remained a communal office under Persian and then Muslim rule until the eleventh century.',
    options: [
      {
        label: 'Let him be crowned. The house of David returns to the throne of Israel',
        tooltip: 'The Exilarch takes the crown and the kingdom dates its documents from the restoration. The realm becomes THE HOUSE OF DAVID (+0.12 legitimacy a month, −0.25 unrest everywhere), +40 legitimacy, +4 stability, +0.4 legitimacy a month, Exilarch\'s house +50, Priests +30, and every Jewish community on earth hears within the year (+20% income). It also means the days have come, and they have not: a permanent +3 unrest as an expectation the state cannot meet, renewed in every generation.',
        effects: guard('ev_d_crown:0', (ctx) => {
          const h = ctx.helpers;
          const t = ctx.game.tags.JUD;
          const old = (t && t.ruler) || {};
          h.setRuler(ctx, 'JUD', {
            name: 'David ben Zakkai', title: 'King of Israel, of the House of David',
            gov: Math.max(3, Number(old.gov || 3)), infl: 6,
            mar: Math.max(2, Number(old.mar || 2) - 1), age: 44,
          });
          h.adjust(ctx, 'JUD', { legitimacy: 40, stability: 4 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_house_restored', name: 'The House of David Restored', months: -1, effects: { legitimacyAdd: 0.4, incomeMult: 1.20, unrestAll: 3 } });
          h.factionShift(ctx, 'JUD', 'exilarch', 50);
          h.factionShift(ctx, 'JUD', 'priests', 30);
          h.factionShift(ctx, 'JUD', 'fighters', -25);
          h.doctrine(ctx, 'zeal', 3);
          h.doctrine(ctx, 'authority', 2);
          h.setGovernment(ctx, 'JUD', 'davidic');
          h.setFlag(ctx, 'davidAnswered', true);
          h.setFlag(ctx, 'davidCrowned', true);
          // The shared title (SPEC §138).
          h.setFlag(ctx, 'davidicThrone', true);
          h.chronicle(ctx, 'era', 'A son of David is crowned in Jerusalem for the first time since Zedekiah. The kingdom begins dating its documents from the restoration and discovers within a year what it has promised.');
        }),
      },
      {
        label: 'He is offered it and declines. The throne waits for the one who is sent',
        tooltip: 'The crown offered in public and refused in public, which settles it far better than never offering. +25 legitimacy, +3 stability, Exilarch\'s house +40, +2 zeal — the reigning house rules with the Davidide\'s open blessing and nobody has claimed the days have come. The claim stays alive and unspent for whoever comes later.',
        effects: guard('ev_d_crown:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 25, stability: 3 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_crown_declined', name: 'The Crown Declined', months: -1, effects: { legitimacyAdd: 0.25, unrestAll: -1 } });
          h.factionShift(ctx, 'JUD', 'exilarch', 40);
          h.factionShift(ctx, 'JUD', 'priests', 20);
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'davidAnswered', true);
          h.setFlag(ctx, 'davidDeclined', true);
          h.chronicle(ctx, 'era', 'The crown is offered to the house of David in the court of the sanctuary and declined there, on the ground that the one who is sent will not need to be offered it.');
        }),
      },
      {
        label: 'The throne was won in a war and stays with the house that won it',
        tooltip: 'The Hasmonean answer, given knowingly and with the precedent on the table. The realm becomes THE DIADEM — a crown out of a war with no title under it (+0.05 legitimacy a month, +4% morale, +1 envoy). +3 authority, +30 with the army, no change of ruler — and the same objection that ran against the Hasmoneans for a century, now in writing, with a living claimant to attach it to. −20 legitimacy, Exilarch\'s house −45, +2 unrest in the east.',
        effects: guard('ev_d_crown:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: -20 });
          h.addTagModifier(ctx, 'JUD', { id: 'won_in_a_war', name: 'Won in a War', months: -1, effects: { unrestAll: 2, disciplineMult: 1.05 } });
          h.factionShift(ctx, 'JUD', 'fighters', 30);
          h.factionShift(ctx, 'JUD', 'exilarch', -45);
          h.doctrine(ctx, 'authority', 3);
          h.doctrine(ctx, 'zeal', -1);
          // The Hasmonean answer takes the Hasmonean constitution with it
          // (SPEC §212): a crown out of a war, with no title under it.
          h.setGovernment(ctx, 'JUD', 'diadem');
          h.setFlag(ctx, 'davidAnswered', true);
          h.setFlag(ctx, 'davidRefused', true);
          h.chronicle(ctx, 'era', 'The reigning house keeps the throne it won. The Exilarch is confirmed in every honour except the one, and the sages begin writing about the Hasmoneans again.');
        }),
      },
    ],
  },

  {
    id: 'ev_d_the_morning_after',
    title: 'The Morning After the Restoration',
    desc: 'The first year was a festival. The second was quieter. It is now the fourth, '
      + 'and the letters arriving at the palace have changed in character: they are no '
      + 'longer congratulations, they are questions. If the house of David is restored and '
      + 'the offerings go up and the exiles are gathering, then the prophets said certain '
      + 'other things would follow, and they have not followed. The nations have not come '
      + 'up to the mountain. The swords are still swords. A delegation from a community in '
      + 'the far east of the old Persian lands has sold everything and walked here and '
      + 'wants to be told which year it is in the reckoning of the age to come, and the '
      + 'palace has no answer that will not either lie to them or break something. The '
      + 'king, who did not seek this, has asked the council for a formula. There is no '
      + 'formula. There is only what the kingdom decides to say.',
    forTag: 'JUD',
    major: true,
    minYear: 649,
    maxYear: 692,
    trigger: safeTrigger('ev_d_morning', (ctx) => thirdPower(ctx) && flag(ctx, 'davidCrowned') && !flag(ctx, 'expectationAnswered')),
    aiOption: 1,
    options: [
      {
        label: 'Say that the days have begun and that they are long',
        tooltip: 'The restoration declared real and unfolding rather than complete. +20 legitimacy, +2 zeal, Priests +30 — and a claim the kingdom is now permanently accountable to: +2 unrest everywhere and a −25 legitimacy shock every time the state suffers a visible defeat.',
        effects: guard('ev_d_morning:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 20 });
          h.addTagModifier(ctx, 'JUD', { id: 'the_days_have_begun', name: 'The Days Have Begun', months: -1, effects: { unrestAll: 2, legitimacyAdd: 0.3 } });
          h.factionShift(ctx, 'JUD', 'priests', 30);
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'expectationAnswered', true);
          h.setFlag(ctx, 'daysBegun', true);
          h.chronicle(ctx, 'era', 'The kingdom rules that the days have begun and are long. The delegation from the east is housed at state expense and does not go home.');
        }),
      },
      {
        label: 'Say that a king is a king and the redemption is still to come',
        tooltip: 'The claim deliberately narrowed while it can still be narrowed. −15 legitimacy and Priests −30 for a disappointment delivered in public — and the state stops being accountable to a prophecy: +4 stability, −2 unrest everywhere (permanent), +2 authority. The kingdom survives on ordinary terms.',
        effects: guard('ev_d_morning:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: -15, stability: 4 });
          h.addTagModifier(ctx, 'JUD', { id: 'a_king_is_a_king', name: 'A King Is a King', months: -1, effects: { unrestAll: -2, incomeMult: 1.06 } });
          h.factionShift(ctx, 'JUD', 'priests', -30);
          h.factionShift(ctx, 'JUD', 'exilarch', 15);
          h.doctrine(ctx, 'authority', 2);
          h.doctrine(ctx, 'zeal', -2);
          h.setFlag(ctx, 'expectationAnswered', true);
          h.setFlag(ctx, 'aKingIsAKing', true);
          h.chronicle(ctx, 'era', 'The council rules that a king of the house of David is a king, and that the redemption is a separate matter and is still to come. The reading is not popular and is never revised.');
        }),
      },
    ],
  },

];
