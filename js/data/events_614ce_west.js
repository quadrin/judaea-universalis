// Judaea Universalis — the West beyond the war, 616–694 CE (SPEC §104's
// rule applied to the 614 chapter). Content package. Zero imports; all
// effects run through ctx.helpers at runtime. Concatenated onto EVENTS_614
// by the era registry.
//
// The 614 chapter's world spine is the duel of the empires and then the
// caliphate — thirty-three dated cards, and every one of them east of the
// Adriatic. The West it never looks at was spending the same century
// legislating about the same people this game is about: Sisebut's edict of
// 616 is the first forced conversion of Jews by any Christian king, Toledo
// wrote exclusion into a coronation oath, Dagobert baptized Gaul's Jews at
// Heraclius' own written urging — the emperor of the chapter's opening
// scene, reaching into Paris — and the century closes with Egica declaring
// Spain's Jews slaves seventeen years before an army their sons would not
// fight for arrives at the straits. Beside that runs the ordinary weather
// of the age: the first Slavic king, the Bulgars twice, a Lombard writing
// law, an island choosing its Easter. A chapter about what the eastern
// empires do to the Jews between them should let the player hear the
// western half of the same century.
//
// The rule for admission is §104's: it must happen whichever way the
// Gambit went. Nothing here moves a border; the successions scripted are
// the ones the sources date, on courts the bookmark seats and no card
// ever touched.
//
// Source spine: Isidore of Seville, Historia Gothorum and the council
// acta of Toledo IV, VI and XVII; Fredegar for Samo, Dagobert and the
// emperor's letter; Paul the Deacon for Rothari; Bede for Whitby;
// Nicephorus and Theophanes for Kubrat and Asparuh; the Pereshchepina
// treasure for the rings archaeology checked.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_614ce_west] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135); see events_167bce_world.js.
function who(ctx, tag) {
  return (ctx && ctx.helpers && ctx.helpers.livingTag) ? ctx.helpers.livingTag(ctx, tag) : tag;
}

function guard(key, fn) {
  return function (ctx) {
    try { fn(ctx); } catch (e) { warnOnce('effects:' + key, e); }
  };
}

function alive(ctx, tag) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, tag)];
  return !!(t && t.alive !== false);
}

function stir(ctx, names, mod) {
  for (const n of names) ctx.helpers.addProvinceModifier(ctx, n, mod);
}

function setOpinion(ctx, a, b, val) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, a)];
  if (!t) return;
  if (!t.opinion || typeof t.opinion !== 'object') t.opinion = {};
  t.opinion[who(ctx, b)] = Math.max(-200, Math.min(200, val));
}

// The cities of Visigothic Spain the councils legislate for.
const SPAIN = ['Toletum', 'Emerita', 'Hispalis', 'Corduba'];

export const EVENTS_614_WEST = [

  // ── V1 · 616 ──────────────────────────────────────────────────────────────
  {
    id: 'ev614_w_sisebut',
    title: 'The King Who Baptizes by Edict',
    worldLabel: 'Sisebut orders the Jews of Spain baptized or gone',
    desc: 'Sisebut of the Visigoths is the most literate king in the West — he '
      + 'writes Latin verse on lunar eclipses, corresponds with bishops as an '
      + 'equal, and his court at Toledo is the nearest thing the century has to '
      + 'an academy west of Constantinople. He is also the first Christian king '
      + 'anywhere to order every Jew in his kingdom baptized, on pain of exile '
      + 'and forfeiture. Tens of thousands pass through the fonts under the '
      + 'edict; the sincerity of a conversion demanded at swordpoint is a '
      + 'problem the kingdom will bequeath to every reign that follows it, in '
      + 'the form of a baptized population whose Christianity the councils '
      + 'never stop legislating about — which is an admission, renewed '
      + 'annually, of what the edict actually produced. The verdict that '
      + 'survives is Isidore of Seville\'s, the king\'s own friend and the '
      + 'greatest scholar of the age: he had zeal, but not according to '
      + 'knowledge. It is the West\'s first experiment in solving its oldest '
      + 'minority by decree. It will not be the last, and the failure is '
      + 'never once read as a reason not to repeat it.',
    forTag: 'both',
    decider: 'VIS',
    date: { y: 616, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Sisebut decreed baptism or exile for the Jews of Spain around 616 — the first forced-conversion edict of any Christian king; Isidore judged it zeal without knowledge.',
    options: [
      {
        label: 'Zeal, but not according to knowledge',
        tooltip: 'The Visigoths gain +5 legitimacy with their bishops and "The Baptized at Swordpoint" (−5% income permanently) as capital and craft go underground or abroad; Toletum, Emerita, Hispalis and Corduba carry "The Edict of 616" (+2 unrest for 60 months).',
        effects: guard('ev614_w_sisebut:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'VIS')) {
            h.adjust(ctx, 'VIS', { legitimacy: 5 });
            h.addTagModifier(ctx, 'VIS', {
              id: 'baptized_at_swordpoint', name: 'The Baptized at Swordpoint', months: -1,
              effects: { incomeMult: 0.95 },
            });
          }
          stir(ctx, SPAIN, {
            id: 'edict_of_616', name: 'The Edict of 616', months: 60,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'sisebutEdict', true);
          h.chronicle(ctx, 'era', 'Sisebut orders the Jews of Spain baptized or gone — the first such edict of any Christian king; Isidore calls it zeal without knowledge.');
        }),
      },
    ],
  },

  // ── V2 · 623 ──────────────────────────────────────────────────────────────
  {
    id: 'ev614_w_samo',
    title: 'The Merchant King of the Wends',
    worldLabel: 'Samo the Frank is elected king of the Slavs',
    desc: 'The Wends — the Slavs of the middle Danube — have lived for a '
      + 'generation as the Avars\' infantry and the Avars\' larder, their '
      + 'sons drafted for the khagan\'s wars and their winters spent hosting '
      + 'his horsemen. This year they rise, and the rising acquires an '
      + 'unlikely head: Samo, a Frankish merchant who came south with a '
      + 'trading caravan and stayed to fight, with the trader\'s advantages — '
      + 'he knows the roads, the prices, and what a Frankish army will '
      + 'actually do as opposed to announce. The Wends elect him king; he '
      + 'reigns thirty-five years, takes twelve Wendish wives with a '
      + 'merchant\'s thoroughness, and when King Dagobert eventually marches '
      + 'against him — the pretext, fittingly, a plundered caravan — Samo\'s '
      + 'people destroy the Frankish main column at the fortress of '
      + 'Wogastisburg, wherever that was; the chroniclers lost the place and '
      + 'kept the result. It is the first Slavic state in history: born '
      + 'between the hammer of the Franks and the anvil of the Avars, '
      + 'governed by a man who understood both as only their customers do.',
    forTag: 'both',
    decider: 'SLV',
    date: { y: 623, m: 6 },
    world: true,
    aiOption: 0,
    historical: 'Samo led the Wendish revolt against the Avars around 623 and was elected king; he beat Dagobert\'s Franks at Wogastisburg in 631 and reigned thirty-five years.',
    options: [
      {
        label: 'The customer becomes the king',
        tooltip: 'The Sclaveni seat Samo: +10 legitimacy, +1 stability, and "The First Kingdom" (+5% discipline for 60 months). The Avars −10 legitimacy — the larder has armed itself, and the khagan\'s infantry now has its own flag.',
        effects: guard('ev614_w_samo:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SLV')) {
            h.setRuler(ctx, 'SLV', { name: 'Samo', title: 'King of the Wends', gov: 3, infl: 3, mar: 3, age: 40 });
            h.adjust(ctx, 'SLV', { legitimacy: 10, stability: 1 });
            h.addTagModifier(ctx, 'SLV', {
              id: 'the_first_kingdom', name: 'The First Kingdom', months: 60,
              effects: { disciplineMult: 1.05 },
            });
          }
          if (alive(ctx, 'AVA')) h.adjust(ctx, 'AVA', { legitimacy: -10 });
          h.setFlag(ctx, 'samoKing', true);
          h.chronicle(ctx, 'era', 'The Wends rise against the Avars and elect a Frankish merchant their king; the first Slavic state is born between the hammer and the anvil.');
        }),
      },
    ],
  },

  // ── V3 · 629 ──────────────────────────────────────────────────────────────
  {
    id: 'ev614_w_dagobert',
    title: 'The Last Working Merovingian',
    worldLabel: 'Chlothar II dies; Dagobert rules the Franks from Paris',
    desc: 'Chlothar II — who reunited the Frankish realm by winning the queens\' '
      + 'feud, and then paid for it by chartering his own nobility\'s '
      + 'privileges — dies, and his son Dagobert gathers the whole kingdom '
      + 'and moves the court to Paris. He is the last Merovingian anyone will '
      + 'accuse of governing: he rides circuit through Burgundy dispensing '
      + 'justice that terrifies the local grandees, mints good coin under '
      + 'the goldsmith Eligius — a craftsman so honest the age makes him a '
      + 'saint, which says something about the age — and founds Saint-Denis, '
      + 'the abbey where every French king for eleven centuries will be '
      + 'buried. After him the dynasty\'s long twilight begins: kings '
      + 'crowned as children, dead young of the family\'s thinning blood, '
      + 'reigning from a wagon while the mayors of the palace rule from a '
      + 'desk. The formula the chronicles will settle on — the do-nothing '
      + 'kings — is not yet true, but any court that reads the Franks '
      + 'closely can see where the weight is moving: the dynasty will '
      + 'reign for another century, which is not the same as ruling for '
      + 'one.',
    forTag: 'both',
    decider: 'FRK',
    date: { y: 629, m: 4 },
    world: true,
    aiOption: 0,
    historical: 'Chlothar II died in 629 and Dagobert I ruled the united realm from Paris — the last effective Merovingian; Saint-Denis and Eligius\'s coinage are his monuments.',
    options: [
      {
        label: 'Justice that terrifies the grandees',
        tooltip: 'The Franks seat Dagobert: +1 stability and "The Court at Paris" (+5% income for 120 months) — good coin, kept accounts, and an abbey for the dynasty\'s bones. The weight is already moving toward the mayors.',
        effects: guard('ev614_w_dagobert:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'FRK')) {
            h.setRuler(ctx, 'FRK', { name: 'Dagobert I', title: 'King of the Franks', gov: 4, infl: 3, mar: 3, age: 26 });
            h.adjust(ctx, 'FRK', { stability: 1 });
            h.addTagModifier(ctx, 'FRK', {
              id: 'court_at_paris', name: 'The Court at Paris', months: 120,
              effects: { incomeMult: 1.05 },
            });
          }
          h.setFlag(ctx, 'dagobertCrowned', true);
          h.chronicle(ctx, 'era', 'Dagobert takes the united Frankish realm to Paris and governs it — the last Merovingian anyone will accuse of that.');
        }),
      },
    ],
  },

  // ── V4 · 632 ──────────────────────────────────────────────────────────────
  {
    id: 'ev614_w_paris_letter',
    title: 'The Emperor\'s Letter Reaches Paris',
    worldLabel: 'At Heraclius\' urging, Dagobert orders Gaul\'s Jews baptized',
    desc: 'Fredegar\'s chronicle preserves the transmission precisely: the '
      + 'emperor Heraclius, learned in the stars, has read there that his '
      + 'empire will be laid waste by a circumcised people, and sends to '
      + 'Dagobert king of the Franks asking that all the Jews of his kingdom '
      + 'be baptized into the catholic faith — which Dagobert promptly did. '
      + 'The emperor\'s astrology has misidentified its circumcised people; '
      + 'the armies that answer the stars\' description are at this moment '
      + 'riding out of Arabia, and Heraclius will live to know it. But the '
      + 'letter is the thing itself: the victor of the Persian war, the man '
      + 'who carried the Cross back to Jerusalem and then broke his oath to '
      + 'the Jews of Tiberias, now exporting the policy by post to the '
      + 'furthest Christian kingdom he can reach. Toledo legislates, '
      + 'Constantinople decrees, Paris obliges by return of courier. For '
      + 'the communities of Gaul — older than the Franks, older than the '
      + 'faith now baptizing them — the lesson is the one the whole '
      + 'century keeps teaching: there is no western border behind which '
      + 'the question is not asked.',
    forTag: 'both',
    decider: 'FRK',
    date: { y: 632, m: 1 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Fredegar records that Heraclius, warned by the stars of a circumcised people, wrote to Dagobert to baptize the Jews of Gaul, and that Dagobert did so, around 632.',
    options: [
      {
        label: 'Paris obliges by return of courier',
        tooltip: 'Lutetia, Massilia and Narbo carry "The Frankish Edict" (+1 unrest for 48 months); the Franks +3 legitimacy with their bishops. The emperor\'s astrology has misread its circumcised people, and the armies answering the description are already riding.',
        effects: guard('ev614_w_paris_letter:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'FRK')) h.adjust(ctx, 'FRK', { legitimacy: 3 });
          stir(ctx, ['Lutetia', 'Massilia', 'Narbo'], {
            id: 'the_frankish_edict', name: 'The Frankish Edict', months: 48,
            effects: { unrest: 1 },
          });
          h.setFlag(ctx, 'dagobertEdict', true);
          h.chronicle(ctx, 'era', 'Heraclius reads a circumcised people in the stars and writes to Paris; Dagobert baptizes the Jews of Gaul by return of courier, while the actual armies ride out of Arabia.');
        }),
      },
    ],
  },

  // ── V5 · 635 ──────────────────────────────────────────────────────────────
  {
    id: 'ev614_w_kubrat',
    title: 'Old Great Bulgaria',
    worldLabel: 'Kubrat unites the Bulgars and breaks the Avar yoke',
    desc: 'Kubrat of the Onogur Bulgars was raised a hostage in Constantinople, '
      + 'baptized there, and sent home a friend of Heraclius — the empire\'s '
      + 'standard investment in a steppe prince, and this one pays out. He '
      + 'unites the Bulgar clans between the Sea of Azov and the Kuban, '
      + 'throws off the Avar overlordship that has taxed them for a century, '
      + 'and rules a steppe khanate the Greeks dignify as Old Great '
      + 'Bulgaria, trading horses and holding the door against whatever '
      + 'comes off the deeper steppe. He keeps faith with Heraclius to the '
      + 'end of both their lives — and archaeology will one day confirm the '
      + 'friendship in the bluntest way possible: the grave found at '
      + 'Pereshchepina carries the emperor\'s own gifts, rings with '
      + 'Heraclius\' monogram on the fingers of a steppe king. The dying '
      + 'advice the chronicles give him — that his sons hold together or be '
      + 'scattered — is recorded precisely because they scattered: one son '
      + 'will take his horde to the Volga, and one, Asparuh, toward the '
      + 'Danube, where the empire will meet the family again on much worse '
      + 'terms.',
    forTag: 'both',
    decider: 'BGR',
    date: { y: 635, m: 6 },
    world: true,
    aiOption: 0,
    historical: 'Kubrat united the Onogur Bulgars and broke with the Avars around 635, keeping lifelong faith with Heraclius; the Pereshchepina grave carries the emperor\'s monogrammed rings.',
    options: [
      {
        label: 'The emperor\'s rings on a steppe king\'s fingers',
        tooltip: 'The Bulgars seat Kubrat: +10 legitimacy, +1 stability, and Byzantium\'s opinion of the horde rises to +80 — a friend at the empire\'s back door. The Avars −10 legitimacy: the yoke is broken from the east as well.',
        effects: guard('ev614_w_kubrat:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'BGR')) {
            h.setRuler(ctx, 'BGR', { name: 'Kubrat', title: 'Khan of Great Bulgaria', gov: 3, infl: 3, mar: 4, age: 30 });
            h.adjust(ctx, 'BGR', { legitimacy: 10, stability: 1 });
          }
          if (alive(ctx, 'BYZ')) setOpinion(ctx, 'BYZ', 'BGR', 80);
          if (alive(ctx, 'AVA')) h.adjust(ctx, 'AVA', { legitimacy: -10 });
          h.setFlag(ctx, 'oldGreatBulgaria', true);
          h.chronicle(ctx, 'era', 'Kubrat unites the Bulgars and breaks the Avar yoke, keeping lifelong faith with Heraclius; his sons will scatter, one of them toward the Danube.');
        }),
      },
    ],
  },

  // ── V6 · 638 ──────────────────────────────────────────────────────────────
  {
    id: 'ev614_w_toledo',
    title: 'The Council Writes It Into the Oath',
    worldLabel: 'Toledo decrees: none but Catholics may live in Spain',
    desc: 'The Sixth Council of Toledo assembles under King Chintila — the '
      + 'same month, as it happens, that the new power out of Arabia is '
      + 'pressing on Jerusalem, though no one in Toledo knows what that '
      + 'will one day have to do with Spain. The bishops and the king '
      + 'together enact the century\'s most complete answer to Sisebut\'s '
      + 'unfinished experiment: it is decreed that none but Catholics may '
      + 'dwell in the kingdom of the Goths, and — the genuinely new '
      + 'instrument — every future king, before he may take the throne, '
      + 'must swear an oath to enforce the laws against the baptized and '
      + 'unbaptized alike. Exclusion is now written into the coronation '
      + 'itself: a constitutional oath against a people, the first of its '
      + 'kind anywhere, and a form with a very long posterity. The '
      + 'practical effect, reign by reign, is what it has always been — '
      + 'flight, concealment, and conversions whose sincerity the next '
      + 'council must legislate about in its turn, which admits in canon '
      + 'law what no one will say aloud: the policy does not work, and '
      + 'cannot, and will therefore be renewed.',
    forTag: 'both',
    decider: 'VIS',
    date: { y: 638, m: 1 },
    world: true,
    aiOption: 0,
    historical: 'The Sixth Council of Toledo under Chintila decreed in January 638 that only Catholics might live in Spain, and bound every future king by coronation oath to enforce it.',
    options: [
      {
        label: 'An oath written into the coronation',
        tooltip: 'The Visigoths seat Chintila and gain +5 legitimacy with the council; Toletum, Emerita, Hispalis and Corduba carry "The Sixth Council" (+2 unrest for 60 months). The policy does not work, cannot, and will therefore be renewed.',
        effects: guard('ev614_w_toledo:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'VIS')) {
            h.setRuler(ctx, 'VIS', { name: 'Chintila', title: 'King of the Visigoths', gov: 2, infl: 3, mar: 1, age: 50 });
            h.adjust(ctx, 'VIS', { legitimacy: 5 });
          }
          stir(ctx, SPAIN, {
            id: 'the_sixth_council', name: 'The Sixth Council', months: 60,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'sixthToledo', true);
          h.chronicle(ctx, 'era', 'Toledo decrees that none but Catholics may live in Spain and writes the enforcement into the coronation oath itself — a constitutional oath against a people.');
        }),
      },
    ],
  },

  // ── V7 · 643 ──────────────────────────────────────────────────────────────
  {
    id: 'ev614_w_rothari',
    title: 'The Law Is Written Down in a Lombard\'s Latin',
    worldLabel: 'Rothari issues his Edict; Lombard law goes on parchment',
    desc: 'Rothari, duke of Brescia raised to the Lombard throne by marriage '
      + 'and election, is an Arian in a kingdom drifting catholic, a '
      + 'conqueror who has taken the Ligurian coast from the empire — and, '
      + 'this November, the author of the thing that outlasts all of it: '
      + 'the Edict, three hundred and eighty-eight chapters of Lombard '
      + 'custom written down in rough provincial Latin, the whole '
      + 'unwritten law of a migrating people fixed to parchment at one '
      + 'stroke. It is a tariff of wounds above all — so much for a '
      + 'severed finger, so much for a knocked-out tooth, graded by the '
      + 'victim\'s rank — and the preamble says exactly why: the wergild '
      + 'exists so that the feud can end, composition instead of vengeance, '
      + 'a price list as an instrument of peace. The deeper change is the '
      + 'one the Romans of Italy notice: a people that writes its law down '
      + 'has begun to answer to it. The warlords\' kingdom is becoming a '
      + 'state, and states, unlike warlords, keep records, collect '
      + 'evenly, and can be dealt with.',
    forTag: 'both',
    decider: 'LMB',
    date: { y: 643, m: 11 },
    world: true,
    aiOption: 0,
    historical: 'Rothari issued the Edict of 388 chapters on 22 November 643 — Lombard custom written in Latin, wergilds graded to end the feud by composition.',
    options: [
      {
        label: 'A price list as an instrument of peace',
        tooltip: 'The Lombards seat Rothari: +10 legitimacy, +1 stability, and "The Edict of Rothari" (−0.5 unrest across the realm permanently) — the feud ends at the price list, and the warlords\' kingdom becomes a state.',
        effects: guard('ev614_w_rothari:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'LMB')) {
            h.setRuler(ctx, 'LMB', { name: 'Rothari', title: 'King of the Lombards', gov: 4, infl: 2, mar: 4, age: 37 });
            h.adjust(ctx, 'LMB', { legitimacy: 10, stability: 1 });
            h.addTagModifier(ctx, 'LMB', {
              id: 'edict_of_rothari', name: 'The Edict of Rothari', months: -1,
              effects: { unrestAll: -0.5 },
            });
          }
          h.setFlag(ctx, 'edictOfRothari', true);
          h.chronicle(ctx, 'era', 'Rothari writes the whole unwritten law of the Lombards onto parchment in one edict; a people that writes its law down has begun to answer to it.');
        }),
      },
    ],
  },

  // ── V8 · 664 ──────────────────────────────────────────────────────────────
  {
    id: 'ev614_w_whitby',
    title: 'The Island Chooses Its Easter',
    worldLabel: 'At Whitby, the English take the Roman reckoning',
    desc: 'At the abbey of Whitby on the Northumbrian coast, King Oswiu sits in '
      + 'judgment on the question that has divided his own household: his '
      + 'kingdom keeps the Easter of the Irish monks who converted it, his '
      + 'queen keeps the Roman date, and in some years the king is feasting '
      + 'the resurrection while the queen is still fasting Lent at the same '
      + 'table. The debate is conducted by proxies — Colman for Iona and the '
      + 'old computus, Wilfrid for Rome, at his most lawyerly — and it turns, '
      + 'as every reader of this game\'s other centuries will recognize, on '
      + 'the question that is never only about the date: whose authority '
      + 'fixes the calendar fixes everything downstream of it. Oswiu rules '
      + 'for Rome, on the stated reasoning that Peter holds the keys and he '
      + 'would rather not quarrel with the doorkeeper. Colman takes his '
      + 'monks home to Iona rather than comply. Nicaea cut the churches\' '
      + 'Easter loose from the Jewish reckoning three centuries ago; Whitby '
      + 'is the same operation at the world\'s far edge, the calendar\'s '
      + 'long schism reaching the last island — and the English church, '
      + 'having chosen the center, will spend the next century exporting '
      + 'missionaries and canon law back at the continent with a convert\'s '
      + 'thoroughness.',
    forTag: 'both',
    decider: 'SAX',
    date: { y: 664, m: 9 },
    world: true,
    aiOption: 0,
    historical: 'Oswiu ruled for the Roman Easter at Whitby in 664, preferring not to quarrel with the keeper of the keys; Colman withdrew to Iona with his monks.',
    options: [
      {
        label: 'Better not to quarrel with the doorkeeper',
        tooltip: 'The Saxons seat Oswiu and gain +5 legitimacy — the island joins the center\'s calendar, and Britannia carries "The Roman Computus" (−1 unrest for 60 months) as the two Easters stop feuding at the king\'s own table.',
        effects: guard('ev614_w_whitby:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SAX')) {
            h.setRuler(ctx, 'SAX', { name: 'Oswiu', title: 'King of Northumbria', gov: 3, infl: 3, mar: 3, age: 52 });
            h.adjust(ctx, 'SAX', { legitimacy: 5 });
          }
          stir(ctx, ['Britannia'], {
            id: 'roman_computus', name: 'The Roman Computus', months: 60,
            effects: { unrest: -1 },
          });
          h.setFlag(ctx, 'synodOfWhitby', true);
          h.chronicle(ctx, 'era', 'At Whitby the English choose the Roman Easter — the calendar\'s long schism reaches the last island, and the question was never only the date.');
        }),
      },
    ],
  },

  // ── V9 · 681 ──────────────────────────────────────────────────────────────
  {
    id: 'ev614_w_asparukh',
    title: 'A New People South of the River',
    worldLabel: 'Asparuh\'s Bulgars cross the Danube; the empire pays tribute',
    desc: 'Kubrat\'s sons scattered as their father warned, and the one named '
      + 'Asparuh has brought his horde to the Danube delta, into the marshes '
      + 'the empire cannot flood and cannot ride. Constantine IV — fresh '
      + 'from breaking the Arab siege with fire — takes the fleet and army '
      + 'north to expel him, and the campaign dissolves into the century\'s '
      + 'bleakest comedy: the emperor, tormented by gout, leaves for the '
      + 'baths at Mesembria, the army reads the departure as flight and '
      + 'unravels, and the Bulgars come out of the marsh onto a frontier '
      + 'suddenly made of running men. Asparuh crosses in force, takes the '
      + 'country between the river and the mountains, and organizes the '
      + 'Slavic tribes there as subjects and buffer both. The treaty that '
      + 'follows does what no treaty has done: the empire concedes the '
      + 'settlement and pays an annual tribute — a barbarian state '
      + 'recognized on imperial soil, inside the Danube the empire has '
      + 'called its border for seven hundred years. Every chancery notes '
      + 'the terms. The state founded in that marsh will outlast the '
      + 'empire that licensed it.',
    forTag: 'both',
    decider: 'BGR',
    date: { y: 681, m: 5 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Constantine IV\'s campaign against Asparuh collapsed in 680 when his departure for the baths broke the army; the treaty of 681 conceded the settlement and paid tribute.',
    options: [
      {
        label: 'Recognized, on imperial soil, for tribute',
        tooltip: 'The Bulgars seat Asparuh: +15 legitimacy, +100 talents of tribute, and "The Danube State" (+10% manpower permanently). Byzantium −10 legitimacy and −100 talents; Novae and Tomis carry "The Bulgar Settlement" (+2 unrest for 60 months).',
        effects: guard('ev614_w_asparukh:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'BGR')) {
            h.setRuler(ctx, 'BGR', { name: 'Asparuh', title: 'Khan of the Bulgars', gov: 3, infl: 2, mar: 4, age: 40 });
            h.adjust(ctx, 'BGR', { legitimacy: 15, treasury: 100 });
            h.addTagModifier(ctx, 'BGR', {
              id: 'the_danube_state', name: 'The Danube State', months: -1,
              effects: { manpowerMult: 1.1 },
            });
          }
          if (alive(ctx, 'BYZ')) h.adjust(ctx, 'BYZ', { legitimacy: -10, treasury: -100 });
          stir(ctx, ['Novae', 'Tomis'], {
            id: 'bulgar_settlement', name: 'The Bulgar Settlement', months: 60,
            effects: { unrest: 2 },
          });
          h.setFlag(ctx, 'bulgarsCrossDanube', true);
          h.chronicle(ctx, 'era', 'Asparuh\'s Bulgars cross the Danube and the empire signs for it with tribute; the state founded in that marsh will outlast the empire that licensed it.');
        }),
      },
    ],
  },

  // ── V10 · 694 ─────────────────────────────────────────────────────────────
  {
    id: 'ev614_w_egica',
    title: 'The Seventeenth Council Declares a People Enslaved',
    worldLabel: 'Toledo XVII: the Jews of Spain are declared slaves',
    desc: 'The century of Visigothic legislation arrives at its terminus. King '
      + 'Egica comes to the Seventeenth Council of Toledo with an accusation '
      + 'sized to the age\'s new fears: the Jews of Spain — baptized and '
      + 'unbaptized alike — have conspired with their brethren overseas, in '
      + 'the lands the caliphate now rules, to deliver the kingdom to its '
      + 'enemies. No evidence survives because none was presented; the '
      + 'council\'s eighth canon convicts a people entire. The sentence is '
      + 'the century\'s worst text: their goods forfeit, themselves declared '
      + 'perpetual slaves, dispersed among Christian masters, their '
      + 'children to be taken from them at the age of seven and raised '
      + 'apart. Whether the machinery of a failing kingdom ever enforced '
      + 'the whole of it, the parchment neither knows nor cares. Seventeen '
      + 'years later the Berber and Arab army crosses at the straits, and '
      + 'the kingdom that spent a century legislating against a tenth of '
      + 'its people falls in a single campaign — and the chroniclers of '
      + 'both faiths will spend the next thousand years arguing about who '
      + 'opened which gate to the conquerors. The council\'s answer '
      + 'arrived first: it had already named the traitors, in advance, '
      + 'in law, without evidence. Some verdicts convict the judge.',
    forTag: 'both',
    decider: 'VIS',
    date: { y: 694, m: 11 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Egica\'s Seventeenth Council of Toledo in November 694 declared the Jews of Spain enslaved and their children removable at seven, on an unevidenced conspiracy charge; the kingdom fell to the crossing of 711.',
    options: [
      {
        label: 'Some verdicts convict the judge',
        tooltip: 'The Visigoths seat Egica: −5 legitimacy, −1 stability, and "The Seventeenth Council" (−10% income for 120 months) as flight and concealment take the kingdom\'s craft with them; the cities of Spain carry +3 unrest for 120 months.',
        effects: guard('ev614_w_egica:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'VIS')) {
            h.setRuler(ctx, 'VIS', { name: 'Egica', title: 'King of the Visigoths', gov: 2, infl: 2, mar: 2, age: 54 });
            h.adjust(ctx, 'VIS', { legitimacy: -5, stability: -1 });
            h.addTagModifier(ctx, 'VIS', {
              id: 'seventeenth_council', name: 'The Seventeenth Council', months: 120,
              effects: { incomeMult: 0.9 },
            });
          }
          stir(ctx, SPAIN, {
            id: 'the_enslavement_decree', name: 'The Enslavement Decree', months: 120,
            effects: { unrest: 3 },
          });
          h.setFlag(ctx, 'seventeenthToledo', true);
          h.chronicle(ctx, 'era', 'Toledo declares the Jews of Spain slaves and their children removable at seven, without evidence; seventeen years before the straits are crossed, the council has named its traitors in advance.');
        }),
      },
    ],
  },
];
