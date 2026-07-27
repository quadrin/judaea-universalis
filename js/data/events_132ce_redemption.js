// Judaea Universalis — the redeemed kingdom, 212–425 (SPEC §118).
// Content package. Zero imports; all effects run through ctx.helpers at
// runtime. Concatenated onto EVENTS_132 by the era registry.
//
// Found by building the branching path tree (SPEC §119) rather than by playing:
// the 132 chapter has three roads, and the LAST card on its best one is
// `ev2_second_generation` at 163 CE. The chapter runs to 425. So a Judaea that
// actually wins Bar Kokhba — holds Jerusalem, throws Rome out, restores the
// state the revolt was fought for — gets two hundred and sixty-two years of
// silence, while the defeat road runs to `ev2_patriarchate_ends` in 425 and the
// Galilee road of §114 runs to 425 beside it. The road a player would most want
// to reach is the one that stops first, which is close to the worst possible
// arrangement of authorial effort.
//
// This is that road's third and fourth centuries, and the material is the
// richest counterfactual in the game, because the thing that changes is not a
// battle. It is that the Roman Empire becomes Christian while a sovereign
// Jewish state is standing in Jerusalem with the Temple Mount in its hands.
// Every piece of fourth-century legislation about Jews assumes a people inside
// the empire who cannot answer back in any language it has to hear. None of it
// has a subject here. Nicaea fixes Easter away from a calendar that a foreign
// government keeps and publishes. Theodosius makes Nicene Christianity the
// religion of the state next door to the one place its founder's execution is
// a matter of municipal record.
//
// The Jewish half is drawn from the sources the victory road already uses —
// the Mishnaic material on the courts and the calendar, the Amoraic academies,
// the tannaitic debate on the Three Oaths that `ev2_stirrings_152` reads. The
// Roman half is straight history: the Constitutio Antoniniana, the Decian
// libelli, Valerian at Edessa, Nicaea's paschal canon, Cunctos Populos. What
// the counterfactual adds is one fact — a state — and then follows what that
// fact does to each of them in turn.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_132ce_redemption] ' + key, e || '');
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
  const t = ctx.game.tags && ctx.game.tags[tag];
  return !!(t && t.alive !== false);
}

function flag(ctx, key) {
  return !!(ctx.game.flags && ctx.game.flags[key]);
}

function findJudRomWar(game) {
  for (const w of (game && game.wars) || []) {
    if (!w) continue;
    const all = (w.attackers || []).concat(w.defenders || []);
    if (all.indexOf('JUD') !== -1 && all.indexOf('ROM') !== -1) return w;
  }
  return null;
}

// The same predicate the victory road has always used, restated here because a
// content package imports nothing. Sovereign, holding the city, not at war for
// it — and, for this file's purposes, having actually reached the redemption.
function judaeaStands(ctx) {
  const t = ctx.game.tags && ctx.game.tags.JUD;
  return alive(ctx, 'JUD')
    && !(t && t.overlord)
    && ctx.helpers.controls(ctx, 'JUD', 'Jerusalem')
    && !findJudRomWar(ctx.game);
}
function redeemed(ctx) {
  // SPEC §119: the first road entered is the road. A Judaea that settled for
  // the hills and later took the city back is playing the Galilee chapter, and
  // does not also get this one.
  if (flag(ctx, 'galileeKingdom')) return false;
  return judaeaStands(ctx) && (flag(ctx, 'redemptionEra') || flag(ctx, 'freedomEra'));
}

const JEWISH_HEART = ['Jerusalem', 'Jericho', 'Hebron', 'Lydda', 'Emmaus',
  'Sepphoris', 'Tiberias', 'Scythopolis'];

function stir(ctx, names, mod) {
  let touched = 0;
  for (const n of names) {
    if (!ctx.helpers.controls(ctx, 'JUD', n)) continue;
    ctx.helpers.addProvinceModifier(ctx, n, mod);
    touched++;
  }
  return touched;
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[a];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[b] = Math.max(-200, Math.min(200, val));
}

export const EVENTS_132_REDEMPTION = [

  {
    id: 'ev2_r_citizens_of_nowhere',
    title: 'Citizens of Somewhere Else',
    worldLabel: 'Caracalla makes everyone a Roman except one nation',
    desc: 'The Constitutio Antoniniana makes every free man in the empire a Roman '
      + 'citizen at a stroke — an act of breathtaking generosity performed, everyone '
      + 'agrees, entirely for the inheritance tax. It also does something nobody in '
      + 'the chancery thought about, because the chancery does not think about the '
      + 'Jews of the East as a foreign policy question: it draws a line that a Jewish '
      + 'state is on the far side of. Yesterday the Jews of Alexandria and Antioch and '
      + 'Rome were provincials of an unusual kind. Today they are Roman citizens with '
      + 'relatives who are subjects of a foreign king, and that king has an army, and '
      + 'the question of which loyalty comes first has stopped being theological.',
    forTag: 'both',
    decider: 'JUD',
    date: { y: 212, m: 7 },
    world: true,
    major: true,
    when: safeTrigger('ev2_r_citizens_of_nowhere:when', (ctx) => redeemed(ctx)),
    aiOption: 0,
    historical: 'There was no Jewish state, so there was no second loyalty to have a view about, and the edict passed over the Jews as a tax measure like everyone else.',
    options: [
      {
        label: 'Say plainly that a Roman Jew owes Rome his taxes and us nothing',
        tooltip: 'The court publishes a renunciation of any claim on Jews who are subjects of another power: −10 legitimacy at home (the zealots call it an abandonment), but Rome\'s opinion +40 and "No Second Loyalty" permanently (−0.5 unrest in every Jewish province anywhere on the map, +6% income from a trade nobody now has a reason to interdict). The diaspora is left safer and further away.',
        effects: guard('ev2_r_citizens_of_nowhere:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: -10 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'no_second_loyalty', name: 'No Second Loyalty', months: -1,
            effects: { unrestAll: -0.5, incomeMult: 1.06 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', 40);
          h.doctrine(ctx, 'zeal', -1);
          h.setFlag(ctx, 'noSecondLoyalty', true);
          h.chronicle(ctx, 'era', 'The court renounces any claim on Jews who are Rome\'s citizens: a Roman Jew owes Rome his taxes and Jerusalem nothing but his prayers.');
        }),
      },
      {
        label: 'Claim them: every Jew has a country now, whatever his papers say',
        tooltip: 'The court declares itself the protector of Jews everywhere, which is what a state is for and what an empire cannot tolerate. +25 legitimacy, +2 zeal, "The Protection" permanently (+10% income from the half-shekel arriving as a national tax, −1 unrest in Jewish provinces JUD holds) — and Rome\'s opinion to −70, with every Jewish community inside the empire taking +1 unrest as a suspect population. A claim that helps the people who are near you and endangers the people who are not.',
        effects: guard('ev2_r_citizens_of_nowhere:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 25 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_protection', name: 'The Protection', months: -1,
            effects: { incomeMult: 1.1 },
          });
          stir(ctx, JEWISH_HEART, {
            id: 'a_country_now', name: 'A Country Now', months: -1, effects: { unrest: -1 },
          });
          if (alive(ctx, 'ROM')) {
            setOpinion(ctx, 'ROM', 'JUD', -70);
            h.addTagModifier(ctx, 'ROM', {
              id: 'a_suspect_population', name: 'A Suspect Population', months: -1,
              effects: { unrestAll: 0.25 },
            });
          }
          h.doctrine(ctx, 'zeal', 2);
          h.setFlag(ctx, 'theProtection', true);
          h.chronicle(ctx, 'era', 'Jerusalem declares itself the protector of Jews everywhere; the half-shekel comes home as a national tax and every Jewish quarter in the empire is filed, that week, as a foreign interest.');
        }),
      },
    ],
  },

  {
    id: 'ev2_r_the_certificate',
    title: 'The Certificate',
    worldLabel: 'Decius requires the empire to sacrifice',
    desc: 'Decius requires every inhabitant of the empire to sacrifice before a '
      + 'magistrate and collect a certificate saying he has done it — not a persecution '
      + 'of anybody in particular, which is what makes it so effective, but a loyalty '
      + 'audit of everyone at once. Jews inside the empire have an exemption three '
      + 'centuries old, resting entirely on the argument that theirs is an ancient '
      + 'ancestral cult and the Romans respect antiquity above almost everything. That '
      + 'argument survives contact with a great many things. What nobody has tested is '
      + 'whether it survives contact with a Jewish army on the Euphrates flank, and '
      + 'there are magistrates in Syria who have decided to find out.',
    forTag: 'both',
    decider: 'JUD',
    date: { y: 250, m: 4 },
    world: true,
    major: true,
    when: safeTrigger('ev2_r_the_certificate:when', (ctx) => redeemed(ctx) && alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'The exemption held, because the argument from antiquity was all it had ever rested on and nothing had come along to complicate it.',
    options: [
      {
        label: 'Buy the exemption: an embassy, and a very large gift',
        tooltip: 'The old instrument, used by a state that can afford it: −300 treasury, Rome\'s opinion +30, and the exemption is confirmed in writing for the first time (+1 stability, "The Rescript on the Ancient Cult" permanently: −0.5 unrest in every Jewish province anywhere). Bought protection is protection, and the receipt is worth more than the argument it replaces.',
        effects: guard('ev2_r_the_certificate:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: -300, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'rescript_ancient_cult', name: 'The Rescript on the Ancient Cult', months: -1,
            effects: { unrestAll: -0.5 },
          });
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { treasury: 300 });
            setOpinion(ctx, 'ROM', 'JUD', 30);
          }
          h.setFlag(ctx, 'certificateBought', true);
          h.chronicle(ctx, 'era', 'The exemption from the Decian sacrifice is bought outright and, for the first time in three centuries, written down.');
        }),
      },
      {
        label: 'Let the argument stand on its own feet, and see',
        tooltip: 'No embassy and no gift. The exemption holds in most places and fails in some: +15 legitimacy for the refusal to pay for what is owed by right, +1 zeal — but every Jewish province the empire holds takes +1.5 unrest for 120 months, and the chronicle records the towns where the magistrates did not agree. Rome\'s opinion is unchanged; it never noticed being defied.',
        effects: guard('ev2_r_the_certificate:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15 });
          h.doctrine(ctx, 'zeal', 1);
          if (alive(ctx, 'ROM')) {
            h.addTagModifier(ctx, 'ROM', {
              id: 'the_magistrates_who_disagreed', name: 'The Magistrates Who Did Not Agree',
              months: 120, effects: { unrestAll: 0.4 },
            });
          }
          h.setFlag(ctx, 'certificateRefused', true);
          h.chronicle(ctx, 'era', 'Jerusalem sends no embassy and no gift; the ancient-cult exemption holds where the magistrate is old and fails where he is ambitious, and the names of those towns are written down.');
        }),
      },
    ],
  },

  {
    id: 'ev2_r_the_emperor_in_a_cage',
    title: 'The Emperor in a Cage',
    worldLabel: 'Valerian is taken at Edessa and the Roman East is open',
    desc: 'Shapur takes a Roman emperor alive at Edessa — not kills, takes — and the '
      + 'relief carved at Naqsh-e Rustam shows him using the man as a mounting block, '
      + 'which is a detail the Persians included on purpose and every court in the '
      + 'world has now heard about. The Roman East has no field army worth the name '
      + 'between Antioch and the desert. For the first time since the revolt there is '
      + 'nothing at all standing between a Jewish army and the coast, and the generals '
      + 'have brought a map to the council, and the sages have brought the Three Oaths, '
      + 'and both of them intend to be heard before the week is out.',
    forTag: 'both',
    decider: 'JUD',
    date: { y: 260, m: 8 },
    world: true,
    major: true,
    when: safeTrigger('ev2_r_the_emperor_in_a_cage:when', (ctx) =>
      redeemed(ctx) && alive(ctx, 'ROM')),
    aiOption: 1,
    historical: 'There was no Jewish army to have the argument. Palmyra had one, took the opportunity, and was destroyed for it fifteen years later.',
    options: [
      {
        label: 'Take the coast while there is nobody on it',
        tooltip: 'The generals win the council: war with Rome, +20,000 manpower and +12% morale for 60 months, +2 conquest. The coast is there for the taking and the taking is real — but Rome recovers from everything, it has a longer memory than any court in the East, and the road back to the desert is shorter than the road to Antioch. This is the Palmyrene answer, and it is worth remembering what happened to Palmyra.',
        effects: guard('ev2_r_the_emperor_in_a_cage:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { manpower: 20000, legitimacy: 10 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'nobody_on_the_coast', name: 'Nobody On the Coast', months: 60,
            effects: { moraleMult: 1.12 },
          });
          h.doctrine(ctx, 'conquest', 2);
          if (alive(ctx, 'ROM') && !findJudRomWar(ctx.game)) {
            h.declareWar(ctx, 'JUD', 'ROM', 'The Opportunity of Edessa');
          }
          h.setFlag(ctx, 'tookTheCoast', true);
          h.chronicle(ctx, 'era', 'With a Roman emperor in a Persian cage and no field army between Antioch and the desert, Jerusalem takes the coast.');
        }),
      },
      {
        label: 'Hold, and be the one thing in the East that still works',
        tooltip: 'The sages win: no war. +2 stability, +20 legitimacy, "The Quiet Kingdom" permanently (+15% income, −0.75 unrest everywhere) as the trade of a collapsing East reroutes through the one government still answering its correspondence, and Rome\'s opinion +50 toward a neighbour that did not take its chance. The Three Oaths are read aloud in the council and enter the law.',
        effects: guard('ev2_r_the_emperor_in_a_cage:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { stability: 2, legitimacy: 20 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_quiet_kingdom', name: 'The Quiet Kingdom', months: -1,
            effects: { incomeMult: 1.15, unrestAll: -0.75 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', 50);
          h.doctrine(ctx, 'conquest', -2);
          h.setFlag(ctx, 'theQuietKingdom', true);
          h.chronicle(ctx, 'era', 'Jerusalem does not take its chance. The Three Oaths are read in council and enter the law, and the trade of a collapsing East reroutes through the one government in it still answering letters.');
        }),
      },
    ],
  },

  {
    id: 'ev2_r_the_paschal_canon',
    title: 'A Canon Aimed at a Government',
    worldLabel: 'Nicaea fixes Easter away from a calendar a state keeps',
    desc: 'The council settles the date of Easter, and the reasoning is put in writing '
      + 'by the emperor himself: it is unbecoming that the holiest of feasts should '
      + 'follow the custom of the Jews, who are blinded in mind, and the Church should '
      + 'have nothing in common with them. In the history where the Jews are a '
      + 'dispersed people this is a theological insult with administrative '
      + 'consequences. Here the calendar it is separating from is not a custom. It is '
      + 'published annually by a government, from a court, over a seal, and the '
      + 'intercalation is announced by courier to communities in six countries. Nicaea '
      + 'has not corrected an error. It has declined to receive a foreign state\'s mail, '
      + 'and everyone in the room understands the difference.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 325, m: 6 },
    world: true,
    major: true,
    when: safeTrigger('ev2_r_the_paschal_canon:when', (ctx) => redeemed(ctx) && alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'The canon separated the calendars and the Jewish reckoning went on being kept, by a patriarch, at Rome\'s pleasure, for another century.',
    options: [
      {
        label: 'Keep publishing the calendar, and let them not read it',
        tooltip: 'The intercalation goes out by courier as it has for two centuries: +15 legitimacy, and "The Courier and the Seal" permanently (−0.5 unrest in every Jewish province anywhere on the map, +5% income) — the diaspora keeps one calendar and one address, whatever Nicaea has resolved not to notice. Rome\'s opinion −20 and no more; ignoring a canon is not defying it.',
        effects: guard('ev2_r_the_paschal_canon:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 15 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'courier_and_seal', name: 'The Courier and the Seal', months: -1,
            effects: { unrestAll: -0.5, incomeMult: 1.05 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', -20);
          h.setFlag(ctx, 'calendarPublished', true);
          h.chronicle(ctx, 'era', 'The calendar goes out by courier as it has for two centuries; Nicaea has resolved not to read it, which is not the same as it not arriving.');
        }),
      },
      {
        label: 'Answer the canon in the language it was written in',
        tooltip: 'A public reply from the court, circulated in Greek, on what the council has actually done and to whom: +25 legitimacy, +2 zeal, and every Jewish province anywhere −1 unrest as the communities read it — but Rome\'s opinion to −90 and "The Reply" gives the empire\'s own Jewish quarters +1 unrest permanently. Being right in public is a thing a state can do and a diaspora cannot, and the diaspora pays part of the bill.',
        effects: guard('ev2_r_the_paschal_canon:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 25 });
          h.doctrine(ctx, 'zeal', 2);
          stir(ctx, JEWISH_HEART, {
            id: 'the_reply', name: 'The Reply', months: -1, effects: { unrest: -1 },
          });
          if (alive(ctx, 'ROM')) {
            setOpinion(ctx, 'ROM', 'JUD', -90);
            h.addTagModifier(ctx, 'ROM', {
              id: 'the_reply_read_aloud', name: 'The Reply, Read Aloud', months: -1,
              effects: { unrestAll: 0.3 },
            });
          }
          h.setFlag(ctx, 'canonAnswered', true);
          h.chronicle(ctx, 'era', 'Jerusalem answers the paschal canon in Greek and in public — a thing a state can do and a scattered people cannot — and the empire\'s Jewish quarters pay part of the price for it.');
        }),
      },
    ],
  },

  {
    id: 'ev2_r_cunctos_populos_next_door',
    title: 'The Religion of the State Next Door',
    worldLabel: 'Theodosius legislates a faith into a neighbour of its own subject',
    desc: 'Cunctos Populos makes Nicene Christianity the religion of the Roman state '
      + 'and everyone else a heretic by statute. The drafting is confident and the '
      + 'reach is total and there is one country it stops at, which is the country '
      + 'where the events in question are municipal records. Jerusalem has an '
      + 'archive. It has a Temple Mount whose status is an administrative fact rather '
      + 'than a prophecy. It has a court that can be written to and, more awkwardly, '
      + 'written from. An empire whose official account of the world requires the '
      + 'Jewish state to have ended three hundred years ago now shares a frontier with '
      + 'it, exchanges customs officials with it, and has to decide what its own '
      + 'pilgrims are permitted to do when they arrive at a border post and are asked '
      + 'their business.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 380, m: 3 },
    world: true,
    major: true,
    when: safeTrigger('ev2_r_cunctos_populos_next_door:when', (ctx) =>
      redeemed(ctx) && alive(ctx, 'ROM')),
    aiOption: 0,
    historical: 'The empire legislated, the Jews had no state to be a frontier with, and the theology and the map agreed with each other for fifteen centuries.',
    options: [
      {
        label: 'Open the city to pilgrims and charge them properly',
        tooltip: 'Christian pilgrimage to a Jerusalem under Jewish administration, taxed at the gate: +400 treasury, "The Pilgrim Toll" permanently (+18% income), Rome\'s opinion +35 — and −1 stability plus +1 unrest in the Jewish heartland for 240 months, because the sight of what they come to see, and what they say when they see it, is not nothing. The richest answer and the most uncomfortable one.',
        effects: guard('ev2_r_cunctos_populos_next_door:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { treasury: 400, stability: -1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'the_pilgrim_toll', name: 'The Pilgrim Toll', months: -1,
            effects: { incomeMult: 1.18 },
          });
          stir(ctx, JEWISH_HEART, {
            id: 'what_they_say_when_they_see_it', name: 'What They Say When They See It',
            months: 240, effects: { unrest: 1 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', 35);
          h.setFlag(ctx, 'pilgrimToll', true);
          h.chronicle(ctx, 'era', 'Jerusalem opens its gates to Christian pilgrimage and taxes it at the door: the most profitable decision the kingdom ever takes and the one it argues about longest.');
        }),
      },
      {
        label: 'Close the Mount, and let the empire explain the border to itself',
        tooltip: 'The Temple Mount is shut to foreign pilgrimage: +20 legitimacy, +2 authority, "The Mount Is Not a Destination" permanently (−0.5 unrest in the Jewish heartland, +6% morale) — but no toll, Rome\'s opinion to −60, and a permanent frontier problem (+0.5 unrest in JUD\'s border provinces). An empire that cannot get to the place its theology is about will keep arriving at the question from other directions.',
        effects: guard('ev2_r_cunctos_populos_next_door:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 20 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'mount_not_a_destination', name: 'The Mount Is Not a Destination', months: -1,
            effects: { moraleMult: 1.06, unrestAll: 0.5 },
          });
          stir(ctx, JEWISH_HEART, {
            id: 'the_mount_is_shut', name: 'The Mount Is Shut', months: -1,
            effects: { unrest: -0.5 },
          });
          if (alive(ctx, 'ROM')) setOpinion(ctx, 'ROM', 'JUD', -60);
          h.doctrine(ctx, 'authority', 2);
          h.setFlag(ctx, 'mountClosed', true);
          h.chronicle(ctx, 'era', 'The Temple Mount is closed to foreign pilgrimage; an empire whose theology is about a place it cannot enter begins arriving at the question from other directions.');
        }),
      },
    ],
  },

  {
    id: 'ev2_r_three_hundred_years',
    title: 'Three Hundred Years',
    worldLabel: 'The kingdom the revolt was fought for is older than the revolt',
    desc: 'This is the year the office of the patriarch would have lapsed, in the world '
      + 'where there was no state to hold it — a chair left unfilled by an emperor\'s '
      + 'decision, its tax redirected, its authority dispersed into academies and '
      + 'communities and eventually into a library. Nobody in Jerusalem knows that, and '
      + 'nobody would find it plausible. What they know is that the kingdom is three '
      + 'hundred years old this spring; that the men who took the city are further from '
      + 'the living than the destruction of the First House was from them; that there '
      + 'are courts and roads and a customs service and an argument in the assembly '
      + 'about grain prices which has been running, in one form or another, since '
      + 'before anybody\'s grandfather. The miracle has become an administration. That '
      + 'is not a fall from grace. It is the only thing a miracle can turn into if it '
      + 'is going to last, and the alternative — which they cannot see and we can — was '
      + 'a very long time in libraries.',
    forTag: 'both',
    decider: 'JUD',
    date: { y: 425, m: 5 },
    world: true,
    major: true,
    when: safeTrigger('ev2_r_three_hundred_years:when', (ctx) => redeemed(ctx)),
    aiOption: 0,
    historical: 'Theodosius II let the patriarchate lapse on Gamaliel VI\'s death and took its revenue; the nation carried on without a head, and without a country, for fifteen hundred years.',
    options: [
      {
        label: 'Keep the year, and read the whole account in the assembly',
        tooltip: 'The chapter closes on the redemption: +30 legitimacy, +1 stability, and "Three Hundred Years" permanently (+12% income, −1 unrest everywhere, +0.15 legitimacy a month). Every choice this road made is read out with it — the loyalty question of 212, the certificate, whether the coast was taken, whether the canon was answered, and what was done with the Mount.',
        effects: guard('ev2_r_three_hundred_years:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'JUD', { legitimacy: 30, stability: 1 });
          h.addTagModifier(ctx, 'JUD', {
            id: 'three_hundred_years', name: 'Three Hundred Years', months: -1,
            effects: { incomeMult: 1.12, unrestAll: -1, legitimacyAdd: 0.15 },
          });
          const account = [];
          account.push(flag(ctx, 'theProtection')
            ? 'it claimed every Jew alive'
            : (flag(ctx, 'noSecondLoyalty') ? 'it let Rome keep its own citizens' : ''));
          account.push(flag(ctx, 'certificateBought')
            ? 'it bought the exemption and kept the receipt'
            : (flag(ctx, 'certificateRefused') ? 'it refused to pay for what was owed by right' : ''));
          account.push(flag(ctx, 'tookTheCoast')
            ? 'it took the coast when Rome was on its knees'
            : (flag(ctx, 'theQuietKingdom') ? 'it declined the coast and grew rich on the declining' : ''));
          account.push(flag(ctx, 'canonAnswered')
            ? 'it answered Nicaea in Greek'
            : (flag(ctx, 'calendarPublished') ? 'it went on publishing a calendar nobody would read' : ''));
          account.push(flag(ctx, 'pilgrimToll')
            ? 'it opened the city and taxed the pilgrims'
            : (flag(ctx, 'mountClosed') ? 'it shut the Mount and let the empire work around it' : ''));
          const said = account.filter(Boolean).join('; ');
          h.setFlag(ctx, 'threeHundredYears', true);
          h.chronicle(ctx, 'era', 'The kingdom is three hundred years old'
            + (said ? ': ' + said + '. ' : '. ')
            + 'The miracle has become an administration, which is the only thing a miracle can turn into if it is going to last.');
        }),
      },
    ],
  },
];
