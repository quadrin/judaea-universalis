// Judaea Universalis — event chain: The Keepers, 529 CE (SPEC §136).
// Content package. Zero imports; every effect runs through ctx.helpers, every
// effects() body is guarded so nothing can throw in the tick loop.
//
// This is the opening chain — the five cards of 529–531 that carry the rising
// from the statute that caused it to the phylarch who ended it, plus the terms
// card the imperial player can be offered. The four forks (Gerizim, the Jews,
// Ctesiphon, the Taheb) and the long tail to 614 are separate packages.
//
// The register is deliberately different from every other chapter in this game.
// The 66 and 132 chapters open with an army; this one opens with a law, because
// that is what this enemy actually did. Justinian did not besiege Samaria. He
// legislated it out of the right to inherit, to testify, and to hold what it
// held, and then sent soldiers to enforce a statute. The war ends and the
// statute does not, which is the thing the chapter is about.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_529ce] ' + key, e || '');
}

// The letters this court answers to NOW (SPEC §135).
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

function flag(ctx, k) { return !!(ctx.game.flags && ctx.game.flags[k]); }

function dateGE(ctx, y, m) {
  const d = ctx.game.date;
  return d.y > y || (d.y === y && d.m >= m);
}

function holds(ctx, tag, name) {
  try {
    const held = who(ctx, tag);
    const p = ctx.prov(name);
    return !!p && !p.impassable && p.owner === held && p.controller === held;
  } catch (e) { warnOnce('holds', e); return false; }
}

// The rising still has a state behind it: alive, nobody's client, and holding
// the town its king was crowned in.
function risingStands(ctx) {
  const t = ctx.game.tags && ctx.game.tags[who(ctx, 'SAM')];
  return alive(ctx, 'SAM') && !(t && t.overlord)
    && ctx.helpers.controls(ctx, 'SAM', 'Neapolis');
}

// The four hill provinces, for the cards that price a decision in villages.
const HILL_COUNTRY = ['Neapolis', 'Jenin', 'Tulkarm', 'Qalqilya'];

function stir(ctx, names, mod) {
  for (const n of names) ctx.helpers.addProvinceModifier(ctx, n, mod);
}

export const EVENTS_529 = [

  // ── 1 ──────────────────────────────────────────────────────────────────────
  // The chapter opens with a statute. No other chapter in this game does.
  {
    id: 'ev529_the_legislation',
    title: 'The Law Arrives Before the Soldiers',
    worldLabel: 'Justinian legislates against the Keepers',
    desc: 'The rescript is read out in Caesarea and copied to every city of the two '
      + 'Palaestinas, and the clerks reading it are bored, because it is the fourth such '
      + 'document in a reign that is two years old. The Keepers may not inherit. They may '
      + 'not testify — not against a Christian, not for one, not in a matter between two of '
      + 'their own. They may not receive by will or by gift. Their synagogues are to be '
      + 'pulled down and no new ones raised. A man who converts recovers everything on the '
      + 'day of his baptism, and the law is careful to say so twice.\n\n'
      + 'There is no army in this. There is a notary, a copy, and a schedule of dates by '
      + 'which the buildings are to be gone. The elders of Neapolis have read it four times '
      + 'looking for the clause that makes it survivable and have not found one, and in the '
      + 'villages men are asking a question nobody in this community has asked aloud since '
      + 'Alexander: what is the point of obeying a law that has decided you should not exist.',
    forTag: 'both',
    date: { y: 529, m: 3 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'The legislation stood. Codex Justinianus I.v.12, 17 and 21 stripped the '
      + 'community of inheritance, testimony and property, and the risings that answered it '
      + 'were put down without any of it being repealed.',
    options: [
      {
        label: 'There is no clause. Take the hills',
        tooltip: 'The rising is what the statute is answered with. The Keepers: +1 stability, '
          + '+10 legitimacy, "The Answer to the Statute" (+8% morale, +10% manpower, 48 months). '
          + 'The crowned party +20, the quietists −20.',
        effects: guard('ev529_the_legislation:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { stability: 1, legitimacy: 10 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'answer_to_the_statute', name: 'The Answer to the Statute', months: 48,
            effects: { moraleMult: 1.08, manpowerMult: 1.1 },
          });
          h.factionShift(ctx, 'SAM', 'crowned', 20);
          h.factionShift(ctx, 'SAM', 'quietists', -20);
          h.setFlag(ctx, 'statuteAnswered', true);
          h.chronicle(ctx, 'era', 'The rescript is read in Caesarea and answered in the hills. '
            + 'Nobody in either place is surprised by the other.');
        }),
      },
      {
        label: 'Petition. The law has been softened before',
        tooltip: 'Envoys, money and the memory of Zeno\'s reign, which also legislated and also '
          + 'relented. −40 talents, +1 stability, and the statute\'s bite eases for four years '
          + '(the income penalty halves). The quietists +25, the crowned party −25 — and the '
          + 'schedule of demolitions does not stop.',
        effects: guard('ev529_the_legislation:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -40, stability: 1 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_petition', name: 'The Petition', months: 48,
            effects: { incomeMult: 1.12 },
          });
          h.factionShift(ctx, 'SAM', 'quietists', 25);
          h.factionShift(ctx, 'SAM', 'crowned', -25);
          h.setFlag(ctx, 'statutePetitioned', true);
          h.chronicle(ctx, 'era', 'The community petitions rather than rises. The demolitions '
            + 'continue on schedule, politely.');
        }),
      },
    ],
  },

  // ── 2 ──────────────────────────────────────────────────────────────────────
  // A king demonstrates he is a king by killing a sportsman.
  {
    id: 'ev529_the_games_at_neapolis',
    title: 'The Games at Neapolis',
    desc: 'They crowned him in the town below the mountain, which has no palace and no mint '
      + 'and no precedent, and then they did the one thing that makes a crown legible to '
      + 'everybody in the eastern Mediterranean at once: they held races.\n\n'
      + 'The hippodrome at Neapolis is not much of a hippodrome. It does not matter. A man in '
      + 'a diadem sat in the box, the factions were given their colours, the province watched '
      + 'a king do what kings do, and for one afternoon the Keepers had a state with a '
      + 'calendar of public spectacles like anybody else. Then Nicias won. He is a Christian, '
      + 'he is a local, he is very good, and the crowd — which had been enjoying itself — '
      + 'stopped enjoying itself. The king had him taken from the track and executed.\n\n'
      + 'It is a petty thing. It is also the point of no return, and everyone in the box knows '
      + 'it: a rising can be negotiated with, and a court that kills a charioteer in front of '
      + 'four thousand witnesses has told the empire what it is claiming to be.',
    forTag: 'SAM',
    major: true,
    minYear: 529,
    maxYear: 532,
    trigger: safeTrigger('ev529_games', (ctx) => alive(ctx, 'SAM')
      && !flag(ctx, 'kingAtNeapolis')
      && ctx.helpers.controls(ctx, 'SAM', 'Neapolis')
      && dateGE(ctx, 529, 5)),
    aiOption: 0,
    historical: 'Julianus ben Sabar was crowned at Neapolis, held games, and executed the '
      + 'victorious Christian charioteer Nicias. Malalas XVIII records it as the moment the '
      + 'rising became a rebellion the state had to answer.',
    options: [
      {
        label: 'A king is a king. Take him off the track',
        tooltip: 'The crown is unambiguous and so is the war: the rising\'s constitution '
          + 'becomes THE DIADEM (+0.05 legitimacy a month, +4% morale, +1 envoy), +15 '
          + 'legitimacy, +1 stability, '
          + '"A King in Israel" (+10% morale, +8% manpower, 36 months). The crowned party +30, '
          + 'the priesthood −25 — and the empire is no longer dealing with a tax revolt.',
        effects: guard('ev529_games:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 15, stability: 1 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'a_king_in_israel', name: 'A King in Israel', months: 36,
            effects: { moraleMult: 1.1, manpowerMult: 1.08 },
          });
          h.factionShift(ctx, 'SAM', 'crowned', 30);
          h.factionShift(ctx, 'SAM', 'priesthood', -25);
          h.doctrine(ctx, 'authority', 2);
          h.setGovernment(ctx, 'SAM', 'diadem');
          h.setFlag(ctx, 'kingAtNeapolis', true);
          h.setFlag(ctx, 'niciasKilled', true);
          h.notify(ctx, {
            title: 'The Games at Neapolis', type: 'war', provName: 'Neapolis',
            text: 'A crown, a hippodrome, and a dead charioteer. The empire will read all three '
              + 'as one sentence.',
          });
          h.chronicle(ctx, 'ruler', 'Julianus ben Sabar is crowned at Neapolis and holds races. '
            + 'The winner is executed for winning, which is how everyone learns the crown is serious.');
        }),
      },
      {
        label: 'Let him take the palm',
        tooltip: 'The king keeps the diadem and loses the afternoon: the rising\'s '
          + 'constitution is THE DIADEM either way, +5 legitimacy only, the '
          + 'crowned party +10, and the priesthood does not object (+10). A rising that can be '
          + 'negotiated with is a rising the empire may still negotiate with — but the men who '
          + 'put the diadem on him have watched him flinch in public.',
        effects: guard('ev529_games:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 5 });
          h.factionShift(ctx, 'SAM', 'crowned', 10);
          h.factionShift(ctx, 'SAM', 'priesthood', 10);
          h.setGovernment(ctx, 'SAM', 'diadem');
          h.setFlag(ctx, 'kingAtNeapolis', true);
          h.setFlag(ctx, 'niciasSpared', true);
          h.chronicle(ctx, 'ruler', 'Julianus is crowned at Neapolis, and the Christian charioteer '
            + 'takes his palm and goes home. Both facts are reported to Caesarea in the same letter.');
        }),
      },
      {
        label: 'No crown. The Torah has no king in it',
        tooltip: 'The priesthood\'s answer, and the older one: no diadem, no races, no box. '
          + 'The rising is governed by PRIESTHOOD AND ASSEMBLY (−0.4 unrest everywhere, and '
          + 'one fewer envoy, because the empire is being asked to correspond with an office). '
          + '+20 legitimacy, the priesthood +30 and the Council of Seven +20, the crowned party '
          + '−40 — and the rising keeps the one advantage a rising without a king has, which is '
          + 'that there is nobody for the empire to send to Constantinople in a box.',
        effects: guard('ev529_games:2', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { legitimacy: 20 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'no_head_to_take', name: 'No Head to Take', months: -1,
            effects: { unrestAll: -0.5 },
          });
          h.factionShift(ctx, 'SAM', 'priesthood', 30);
          h.factionShift(ctx, 'SAM', 'council', 20);
          h.factionShift(ctx, 'SAM', 'crowned', -40);
          h.doctrine(ctx, 'authority', -2);
          h.setGovernment(ctx, 'SAM', 'gerousia');
          h.setFlag(ctx, 'crownRefused', true);
          h.chronicle(ctx, 'era', 'The diadem is declined in the name of a Torah that has no king '
            + 'in it. The empire discovers that there is no one man to defeat.');
        }),
      },
    ],
  },

  // ── 3 ──────────────────────────────────────────────────────────────────────
  // Restraint should not help. That is the card.
  {
    id: 'ev529_the_bishops_fingers',
    title: 'The Bishop\'s Fingers',
    desc: 'It is not being ordered. That is the first thing to understand about it, and the '
      + 'second is that it makes no difference: the churches of Samaria are burning because '
      + 'the men burning them have spent two years watching their own buildings come down on '
      + 'a schedule, with a notary present. At Neapolis they took the bishop, Ammonas, and '
      + 'cut off his fingers.\n\n'
      + 'The court has an hour in which restraint is still possible, and the men in it are '
      + 'divided along exactly the line you would expect, except for one thing: the Quietists '
      + 'are not arguing that restraint will help. They are arguing that it is right and that '
      + 'it will not help, which is a harder case and an honest one. Constantinople has '
      + 'already decided what this rising is. What is being decided in this room is only what '
      + 'the people in it will have done.',
    forTag: 'SAM',
    major: true,
    minYear: 529,
    maxYear: 533,
    trigger: safeTrigger('ev529_bishop', (ctx) => alive(ctx, 'SAM')
      && (flag(ctx, 'kingAtNeapolis') || flag(ctx, 'crownRefused'))
      && !flag(ctx, 'bishopAnswered')
      && dateGE(ctx, 529, 7)),
    aiOption: 0,
    historical: 'The churches of Samaria burned and the bishop of Neapolis was mutilated. '
      + 'Neither the burning nor any restraint changed the imperial response, which was already '
      + 'in motion.',
    options: [
      {
        label: 'Let it burn',
        tooltip: 'The province is cleared of the empire\'s buildings and the empire is told so: '
          + '+60 talents of church plate, "The Churches Down" (+10% morale, 24 months), the '
          + 'crowned party +25 — and every Christian village in reach remembers it: +2 unrest in '
          + 'the hill country for 60 months, and −40 opinion with Byzantium and Ghassan alike.',
        effects: guard('ev529_bishop:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.adjust(ctx, 'SAM', { treasury: 60 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_churches_down', name: 'The Churches Down', months: 24,
            effects: { moraleMult: 1.1 },
          });
          stir(ctx, HILL_COUNTRY, {
            id: 'the_burning', name: 'The Burning', months: 60, effects: { unrest: 2 },
          });
          h.factionShift(ctx, 'SAM', 'crowned', 25);
          h.factionShift(ctx, 'SAM', 'quietists', -25);
          h.doctrine(ctx, 'zeal', 2);
          for (const k of ['BYZ', 'GHA']) {
            const t = g.tags[who(ctx, k)];
            if (t && t.opinion) t.opinion[who(ctx, 'SAM')] = Math.max(-200, (t.opinion[who(ctx, 'SAM')] || 0) - 40);
          }
          h.setFlag(ctx, 'bishopAnswered', true);
          h.setFlag(ctx, 'churchesBurned', true);
          h.chronicle(ctx, 'war', 'The churches of Samaria burn and the bishop of Neapolis loses '
            + 'his fingers. The dispatches reach Constantinople in eleven days.');
        }),
      },
      {
        label: 'Stop it. Post a guard on every church',
        tooltip: 'Restraint, and it does not help — which is the point. −30 talents and −15 '
          + 'martial points to hold the men back, the Council of Seven +25 and the quietists +20, '
          + 'the crowned party −20. Byzantium\'s opinion of us does not move, because the '
          + 'response was decided in Constantinople before the first roof went. What it buys is '
          + 'real and it is not military: the Christian villages of the hill country stay quiet '
          + '(no unrest), and a court that can restrain its own men has something to offer a '
          + 'negotiation that never comes.',
        effects: guard('ev529_bishop:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -30, mar: -15, legitimacy: 5 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_guard_on_the_churches', name: 'The Guard on the Churches', months: -1,
            effects: { unrestAll: -0.75 },
          });
          h.factionShift(ctx, 'SAM', 'council', 25);
          h.factionShift(ctx, 'SAM', 'quietists', 20);
          h.factionShift(ctx, 'SAM', 'crowned', -20);
          h.doctrine(ctx, 'zeal', -1);
          h.setFlag(ctx, 'bishopAnswered', true);
          h.setFlag(ctx, 'churchesGuarded', true);
          h.chronicle(ctx, 'era', 'The court posts guards on the churches of Samaria and holds its '
            + 'own men back. The imperial response, already ordered, arrives on schedule.');
        }),
      },
    ],
  },

  // ── 4 ──────────────────────────────────────────────────────────────────────
  // The theology, and it is militarily worthless.
  {
    id: 'ev529_gerizim',
    title: 'The Mountain',
    desc: 'Zeno built the Church of St Mary Theotokos on the summit in the eighties and put a '
      + 'garrison in it, and the community has been barred from the top of its own mountain '
      + 'for two generations. This is not one grievance among several. Their Torah\'s tenth '
      + 'commandment is the command to build the altar there; their Deuteronomy 27:4 reads '
      + 'Gerizim where the Jewish text reads Ebal; the mountain is not where they worship, it '
      + 'is what they are.\n\n'
      + 'The captains have been asked for an assessment and have given an honest one, which '
      + 'is that the summit is a bare rock with one road up it, that holding it means holding '
      + 'a garrison on ground that grows nothing and drinks cistern water, and that every man '
      + 'up there is a man not in the villages when the phylarch\'s horse comes. They are not '
      + 'arguing against it. They are making sure the crown knows what it is buying.',
    forTag: 'SAM',
    major: true,
    minYear: 529,
    maxYear: 545,
    trigger: safeTrigger('ev529_gerizim', (ctx) => risingStands(ctx)
      && !flag(ctx, 'gerizimAnswered')
      && (flag(ctx, 'kingAtNeapolis') || flag(ctx, 'crownRefused'))),
    aiOption: 0,
    historical: 'The rising took the mountain and could not hold it. Justinian rebuilt the '
      + 'church afterwards and walled it, and Procopius (Buildings V.vii) describes the wall as '
      + 'the emperor\'s answer to the whole question.',
    options: [
      {
        label: 'Clear the summit. The altar goes back where the Torah says',
        tooltip: 'The church comes down and the altar is rebuilt on the rock: +25 legitimacy, '
          + '+2 stability, "The Altar on the Mountain" (+0.4 legitimacy a month and +10% manpower, '
          + 'permanent) — the whole community can see it from the fields. It also costs a garrison '
          + 'that cannot come down: −8% reinforcement while it stands, and Byzantium and Ghassan '
          + 'both take it as the sentence it is (−30 opinion each).',
        effects: guard('ev529_gerizim:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.adjust(ctx, 'SAM', { legitimacy: 25, stability: 2 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_altar_on_the_mountain', name: 'The Altar on the Mountain', months: -1,
            effects: { legitimacyAdd: 0.4, manpowerMult: 1.1, reinforceMult: 0.92 },
          });
          h.addProvinceModifier(ctx, 'Neapolis', {
            id: 'the_summit_held', name: 'The Summit Held', months: -1,
            effects: { unrest: -1.5 },
          });
          h.factionShift(ctx, 'SAM', 'priesthood', 35);
          h.factionShift(ctx, 'SAM', 'crowned', 15);
          h.factionShift(ctx, 'SAM', 'quietists', -20);
          h.doctrine(ctx, 'zeal', 2);
          for (const k of ['BYZ', 'GHA']) {
            const t = g.tags[who(ctx, k)];
            if (t && t.opinion) t.opinion[who(ctx, 'SAM')] = Math.max(-200, (t.opinion[who(ctx, 'SAM')] || 0) - 30);
          }
          h.setFlag(ctx, 'gerizimAnswered', true);
          h.setFlag(ctx, 'gerizimCleared', true);
          h.notify(ctx, {
            title: 'The Altar on the Mountain', type: 'good', provName: 'Neapolis',
            text: 'The church on the summit is down and the altar is where the Torah says to '
              + 'build it. Every village in the hill country can see the smoke of the offering.',
          });
          h.chronicle(ctx, 'era', 'The summit of Gerizim is cleared and the altar rebuilt. It is '
            + 'the first offering on that rock since before the churches came, and it is visible '
            + 'from every field in Samaria.');
        }),
      },
      {
        label: 'Leave the summit. Hold the villages',
        tooltip: 'The captains\' answer: the mountain is theology and the villages are the people. '
          + '+15% reinforcement and −1 unrest in the hill country (permanent) — every man stays '
          + 'where the fighting is. The priesthood −30 and the crowned party −15: a rising that '
          + 'will not take the mountain has to explain, every year, what it is for.',
        effects: guard('ev529_gerizim:1', (ctx) => {
          const h = ctx.helpers;
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_villages_first', name: 'The Villages First', months: -1,
            effects: { reinforceMult: 1.15, unrestAll: -1 },
          });
          h.factionShift(ctx, 'SAM', 'priesthood', -30);
          h.factionShift(ctx, 'SAM', 'crowned', -15);
          h.factionShift(ctx, 'SAM', 'council', 25);
          h.factionShift(ctx, 'SAM', 'quietists', 15);
          h.doctrine(ctx, 'zeal', -1);
          h.setFlag(ctx, 'gerizimAnswered', true);
          h.setFlag(ctx, 'gerizimLeft', true);
          h.chronicle(ctx, 'era', 'The summit is left to its garrison and the men go back to the '
            + 'villages. The priests ask what the rising is for, and go on asking.');
        }),
      },
    ],
  },

  // ── 5 ──────────────────────────────────────────────────────────────────────
  // Where it ended in the history that happened.
  {
    id: 'ev529_the_phylarch',
    title: 'The Phylarch',
    desc: 'Theodorus the dux has the field force and the roads, which was always going to be '
      + 'enough eventually, and eventually is not a thing a four-province rising can outlast. '
      + 'What changes the arithmetic is the other column: al-Harith ibn Jabalah, phylarch of '
      + 'the Ghassanids, federate of the empire, with horse the hill country has no answer to '
      + 'and no reason to expect, because the Arabs of the desert edge are not who anyone in '
      + 'Neapolis has been watching.\n\n'
      + 'They will come up the Jezreel road and they will not besiege anything. They will take '
      + 'the villages, in the open, in the harvest, one after another, and the men in the hills '
      + 'will have to come down to them or watch. In the history that happened this is where it '
      + 'ends: the king defeated near his own mountain, killed, and his jewelled diadem carried '
      + 'to Constantinople in a box, where it was recorded in an inventory.',
    forTag: 'SAM',
    major: true,
    minYear: 529,
    maxYear: 536,
    requiresWar: ['SAM', 'BYZ'],
    trigger: safeTrigger('ev529_phylarch', (ctx) => alive(ctx, 'SAM')
      && !flag(ctx, 'phylarchAnswered') && dateGE(ctx, 530, 4)),
    aiOption: 0,
    historical: 'Theodorus and al-Harith ibn Jabalah broke the rising; Julianus was killed near '
      + 'Gerizim and his crown sent to Constantinople.',
    options: [
      {
        label: 'Meet him in the open. They will not be allowed the harvest',
        tooltip: 'The rising fights the battle it is offered rather than the one it wants: '
          + '+3,000 men to the muster now and "The Field at Jezreel" (+12% morale, 18 months) — '
          + 'and the phylarch is met on ground that suits his horse, not our hills: −10% discipline '
          + 'for the same 18 months. The crowned party +25.',
        effects: guard('ev529_phylarch:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { manpower: 3000 });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_field_at_jezreel', name: 'The Field at Jezreel', months: 18,
            effects: { moraleMult: 1.12, disciplineMult: 0.9 },
          });
          h.factionShift(ctx, 'SAM', 'crowned', 25);
          h.factionShift(ctx, 'SAM', 'quietists', -15);
          h.doctrine(ctx, 'conquest', 1);
          h.setFlag(ctx, 'phylarchAnswered', true);
          h.setFlag(ctx, 'metThePhylarch', true);
          h.chronicle(ctx, 'war', 'The Keepers come down to the Jezreel road to meet the phylarch\'s '
            + 'horse, because the alternative is watching the harvest burn from above it.');
        }),
      },
      {
        label: 'Give him the villages. Keep the hills and the men',
        tooltip: 'The harvest is lost and the host is not: −80 talents and +2 unrest in the hill '
          + 'country for 36 months, and "The Hills Keep Their Men" (+1 hill defense and +12% '
          + 'reinforcement, 36 months). The Council of Seven +20 and the crowned party −25 — '
          + 'the villages that are being given up are administered by the Seven, and they are '
          + 'the ones who have to say so to the villagers.',
        effects: guard('ev529_phylarch:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'SAM', { treasury: -80 });
          stir(ctx, HILL_COUNTRY, {
            id: 'the_lost_harvest', name: 'The Lost Harvest', months: 36, effects: { unrest: 2 },
          });
          h.addTagModifier(ctx, 'SAM', {
            id: 'the_hills_keep_their_men', name: 'The Hills Keep Their Men', months: 36,
            effects: { hillDefBonus: 1, reinforceMult: 1.12 },
          });
          h.factionShift(ctx, 'SAM', 'council', 20);
          h.factionShift(ctx, 'SAM', 'crowned', -25);
          h.setFlag(ctx, 'phylarchAnswered', true);
          h.setFlag(ctx, 'gaveTheVillages', true);
          h.chronicle(ctx, 'war', 'The phylarch takes the villages of the plain unopposed. The host '
            + 'is still in the hills at the end of the season, which has never happened before.');
        }),
      },
      {
        label: 'Send to al-Harith. He is a federate, not a Roman',
        tooltip: 'The one move the empire does not expect: an embassy to the phylarch himself, who '
          + 'is a Christian Arab king paid late by Constantinople and perfectly capable of doing '
          + 'the arithmetic. −120 talents and −25 influence points; the Ghassanid opinion of us '
          + 'rises 60 and their war effort slows ("The Phylarch Is Unhurried", their reinforcement '
          + '−25% for 24 months). It does not buy an ally. It buys a season.',
        effects: guard('ev529_phylarch:2', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          h.adjust(ctx, 'SAM', { treasury: -120, infl: -25 });
          h.addTagModifier(ctx, 'GHA', {
            id: 'the_phylarch_unhurried', name: 'The Phylarch Is Unhurried', months: 24,
            effects: { reinforceMult: 0.75 },
          });
          const gha = g.tags[who(ctx, 'GHA')];
          if (gha && gha.opinion) {
            const me = who(ctx, 'SAM');
            gha.opinion[me] = Math.min(200, (gha.opinion[me] || 0) + 60);
          }
          h.factionShift(ctx, 'SAM', 'council', 15);
          h.factionShift(ctx, 'SAM', 'quietists', 15);
          h.setFlag(ctx, 'phylarchAnswered', true);
          h.setFlag(ctx, 'phylarchBought', true);
          h.chronicle(ctx, 'diplomacy', 'An embassy goes to al-Harith with more gold than the '
            + 'community can spare. The phylarch\'s riders are notably unhurried for a season, and '
            + 'no letter about it survives on either side.');
        }),
      },
    ],
  },

  // ── 6 ──────────────────────────────────────────────────────────────────────
  // The imperial player's terms card, fired by BOOKMARK_529.checkVictory at
  // +50 war score (SPEC §32). Never fires on its own.
  {
    id: 'ev529_the_crown_to_constantinople',
    title: 'The Crown to Constantinople',
    desc: 'The rising is beaten and the province is asking what happens now, which is a '
      + 'question with two answers and no third. The diadem is in a box on the dux\'s table, '
      + 'itemised, and will go west whatever is decided — that part is administration.\n\n'
      + 'What is not administration is the schedule of demolitions, which is still running, '
      + 'and the statutes, which are still on the books, and the estates of Samaria, which are '
      + 'worked by people the law says may not inherit and which produced nothing this year. '
      + 'The bishops would like the law enforced to the letter. The landowners would like their '
      + 'tenants to have a reason to bring in a harvest. Both delegations are orthodox, both '
      + 'are in the room, and the emperor is in Constantinople codifying the very law they are '
      + 'arguing about.',
    forTag: 'BYZ',
    major: true,
    minYear: 529,
    maxYear: 560,
    aiOption: 0,
    historical: 'The legislation stood. Sergius, bishop of Caesarea, later persuaded Justinian '
      + 'to ease some of the disabilities — a Christian bishop being the one who got the '
      + 'persecution relaxed — but not until the 550s, and not for long.',
    options: [
      {
        label: 'The law to the letter',
        tooltip: 'The statutes enforced as written and the demolitions completed: +15 legitimacy, '
          + 'the Church +30 — and Samaria stops being an asset. −10% income permanently and +1.5 '
          + 'unrest in the hill country forever, because a province of people with nothing to '
          + 'inherit is a province with nothing to lose.',
        effects: guard('ev529_terms:0', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'BYZ', { legitimacy: 15 });
          h.addTagModifier(ctx, 'BYZ', {
            id: 'the_statutes_enforced', name: 'The Statutes Enforced', months: -1,
            effects: { incomeMult: 0.9 },
          });
          stir(ctx, HILL_COUNTRY, {
            id: 'nothing_to_inherit', name: 'Nothing to Inherit', months: -1,
            effects: { unrest: 1.5 },
          });
          h.factionShift(ctx, 'BYZ', 'church', 30);
          h.factionShift(ctx, 'BYZ', 'landowners', -25);
          h.setFlag(ctx, 'statutesEnforced', true);
          h.chronicle(ctx, 'era', 'The statutes are enforced to the letter in Samaria. The '
            + 'assessment for the following year is submitted with a note explaining why it is '
            + 'lower, and the note is not answered.');
        }),
      },
      {
        label: 'The law bends where the rents are',
        tooltip: 'Inheritance quietly restored in the province and the demolitions allowed to '
          + 'lapse, on the grounds — never written down — that a tenant with heirs farms harder. '
          + '+8% income permanently and the hill country calms (−1 unrest). The landowners +30, '
          + 'the Church −30 and −10 legitimacy: the bishops write to Constantinople, and the '
          + 'emperor codifying the law is not going to enjoy the letter.',
        effects: guard('ev529_terms:1', (ctx) => {
          const h = ctx.helpers;
          h.adjust(ctx, 'BYZ', { legitimacy: -10 });
          h.addTagModifier(ctx, 'BYZ', {
            id: 'the_law_bends', name: 'The Law Bends Where the Rents Are', months: -1,
            effects: { incomeMult: 1.08 },
          });
          stir(ctx, HILL_COUNTRY, {
            id: 'the_quiet_assessment', name: 'The Quiet Assessment', months: -1,
            effects: { unrest: -1 },
          });
          h.factionShift(ctx, 'BYZ', 'landowners', 30);
          h.factionShift(ctx, 'BYZ', 'church', -30);
          h.setFlag(ctx, 'statutesEased', true);
          h.chronicle(ctx, 'era', 'The demolitions in Samaria are allowed to lapse and inheritance '
            + 'is quietly restored. Nothing is repealed; the file is simply not reopened.');
        }),
      },
    ],
  },

];
