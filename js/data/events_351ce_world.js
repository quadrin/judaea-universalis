// Judaea Universalis — world spine: 351–410 (SPEC §235, following §104's rule).
// Content package. Zero imports; every effect runs through ctx.helpers.
//
// The age's own calendar, on its own clock, whatever the Galilee is doing:
// the civil war ending, the church of the empire tearing itself apart over a
// word, the philosopher on the Rhine and then on the throne, Amida, the peace
// that gave away Nisibis, the Danube crossing, Adrianople, the edict that made
// one creed the law, the synagogue at Callinicum, and the morning the Goths
// were inside Rome. The division of 395 opens the collapse package beside this
// one (SPEC §238), because it is the first card of that arc rather than the
// last of this one.
//
// Half of these are here because a chapter about a Jewish rising in a
// Christianizing empire needs the empire's Christianization to be visible as
// events and not merely as a curve. The other half are here because they are
// what the fourth century did while nobody in the Galilee could affect any of
// it, which is the other half of what this chapter is about.

const _warned = new Set();
function warnOnce(key, e) {
  if (_warned.has(key)) return;
  _warned.add(key);
  console.warn('[events_351ce_world] ' + key, e || '');
}

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

function mod(ctx, tag, id, name, effects, months) {
  if (!alive(ctx, tag)) return;
  ctx.helpers.addTagModifier(ctx, tag, {
    id, name, months: Number.isFinite(months) ? months : -1, effects,
  });
}

// ── the west's next two purples (SPEC §253) ─────────────────────────────────
//
// This chapter opens on a civil war and then narrates seventy more years in
// which the Roman world has, by the sources' own count, four more of them —
// and it showed exactly one. Magnus Maximus held Britain, Gaul and Spain for
// five years and was recognized as an Augustus by the government he had
// rebelled against; Eugenius held Italy for two and was beaten by a wind.
// Both are §239 pairs on the banner Magnentius gives back in 353.
const MAXIMUS_WEST = [
  'Britannia',
  'Lutetia', 'Rotomagus', 'Samarobriva', 'Gesoriacum', 'Durocortorum',
  'Augusta Treverorum', 'Colonia Agrippina', 'Mogontiacum', 'Argentorate',
  'Batavia', 'Atuatuca', 'Vesontio', 'Genava',
  'Lugdunum', 'Augustodunum', 'Avaricum', 'Limonum', 'Condate', 'Darioritum',
  'Burdigala', 'Tolosa', 'Narbo', 'Nemausus', 'Massilia',
  'Tarraco', 'Caesaraugusta', 'Barcino', 'Emporiae', 'Valentia', 'Numantia',
  'Salmantica', 'Toletum', 'Carthago Nova', 'Corduba', 'Hispalis', 'Malaca',
  'Gades', 'Emerita', 'Olisipo', 'Bracara', 'Asturica',
];
// Eugenius' court is Italy and the Alpine passes: he was made by a Frankish
// general who did not want the purple himself, and he never held anything the
// army of Italy did not hold for him.
const EUGENIUS_ITALY = [
  'Mediolanum', 'Genua', 'Bononia', 'Ravenna', 'Pisae', 'Ancona', 'Aquileia',
  'Roma', 'Capua', 'Genava', 'Augusta Vindelicorum', 'Virunum',
];

function raiseWesternClaim(ctx, spec) {
  const g = ctx.game;
  const h = ctx.helpers;
  if (g.tags.USR) return null;
  const rome = who(ctx, 'ROM');
  const ground = spec.provinces.filter((n) => {
    const p = ctx.prov(n);
    return p && !p.impassable && p.owner === rome;
  });
  if (!ground.length) return null;
  const claim = h.secedeTag(ctx, rome, 'USR', {
    provinces: ground,
    share: spec.share,
    name: spec.name,
    color: spec.color,
    opinion: -180,
    stability: spec.stability,
    legitimacy: spec.legitimacy,
    ruler: spec.ruler,
  });
  if (!claim) return null;
  h.declareWar(ctx, rome, 'USR', spec.war);
  for (const w of g.wars || []) {
    const all = (w && (w.attackers || []).concat(w.defenders || [])) || [];
    if (all.indexOf('USR') >= 0 && all.indexOf(rome) >= 0) w.noNegotiation = true;
  }
  if (spec.modifier) h.addTagModifier(ctx, 'USR', spec.modifier);
  if (spec.army) {
    const at = ground.indexOf(spec.army.at) >= 0 ? spec.army.at : ground[0];
    h.spawnArmy(ctx, 'USR', at, spec.army.opts);
  }
  return claim;
}
function settleWesternClaim(ctx, line, winner) {
  if (!ctx.game.tags.USR) return false;
  ctx.helpers.dissolveTag(ctx, 'USR', who(ctx, 'ROM'), { chronicle: line, winner: !!winner });
  return true;
}
// Who won (SPEC §252). Maximus lost because Theodosius marched faster than
// anyone expected and his own Alpine garrisons changed sides; the Frigidus was
// decided on the second day by a wind out of the mountains that blew the
// western army's own arrows back into its faces, which every source on both
// sides agrees about and none of them can explain away. Neither is a
// certainty, and the second is barely a lean.
function theodosiusTakesTheWest(ctx) {
  return ctx.helpers.verdict(ctx, 'maximusWar', 0.75, {
    recorded: 'ROM', war: ['ROM', 'USR'], sway: 0.3,
  });
}
function theWindRises(ctx) {
  return ctx.helpers.verdict(ctx, 'frigidus', 0.6, {
    recorded: 'ROM', war: ['ROM', 'USR'], sway: 0.35,
  });
}

export const EVENTS_351_WORLD = [

  // ── 353 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_magnentius_falls',
    title: 'The Usurper at Lugdunum',
    worldLabel: 'Magnentius kills himself at Lugdunum; the civil war ends',
    desc: 'Two years after Mursa, run out of Italy and then out of Gaul, Magnentius kills his '
      + 'remaining family and then himself in a house at Lugdunum. Constantius is sole '
      + 'Augustus of the whole Roman world for the first time since his father died, and the '
      + 'purges begin immediately: the notary Paulus, called The Chain, is sent west to find '
      + 'out who corresponded with whom.\n\n'
      + 'For the East this means the field army is finally available. It also means the field '
      + 'army is what Mursa left of it.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 353, m: 8 },
    world: true,
    aiOption: 0,
    historical: 'Magnentius died on 10 August 353. Constantius ruled alone until 361.',
    options: [
      {
        label: 'One Augustus again',
        tooltip: 'Rome: +1 stability, +8,000 manpower, and the eastern establishment can be '
          + 'reinforced again ("The West Settled", +10% reinforcement for 36 months).',
        effects: guard('ev351w_magnentius_falls:0', (ctx) => {
          const h = ctx.helpers;
          // The court goes off the map with the man (SPEC §239). Gaul and
          // Britain — whatever is left of the usurper's obedience — answer to
          // Constantius from this month, the war between the two purples ends
          // because one of them has stopped existing, and the tag is free for
          // the next claimant a chapter needs it for.
          if (alive(ctx, 'USR')) {
            h.dissolveTag(ctx, 'USR', 'ROM', {
              chronicle: 'Magnentius kills his family and then himself in a house at Lugdunum; '
                + 'the provinces that obeyed him are Constantius\' again, and the western field '
                + 'army is a memory with a paymaster.',
            });
          }
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { stability: 1, manpower: 8000 });
            mod(ctx, 'ROM', 'the_west_settled', 'The West Settled', { reinforceMult: 1.1 }, 36);
          }
          h.setFlag(ctx, 'civilWarOver', true);
          h.chronicle(ctx, 'era', 'Magnentius dies at Lugdunum and the Roman world has one '
            + 'emperor again, with about two-thirds of the soldiers it had three years ago.');
        }),
      },
    ],
  },

  // ── 355 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_the_council_at_milan',
    title: 'The Council at Milan',
    worldLabel: 'Constantius makes the bishops sign, and exiles the ones who will not',
    desc: 'The emperor summons the western bishops to Milan and requires them to condemn '
      + 'Athanasius of Alexandria. Most sign. Those who refuse — Lucifer of Cagliari, Eusebius '
      + 'of Vercelli, Dionysius of Milan — are exiled, and when one of them cites the canons, '
      + 'Constantius is reported to have answered: what I will, let that be the canon.\n\n'
      + 'The church that this century is handing the Empire is not one church. It is two '
      + 'parties with the same buildings, and the emperor is on the side that will lose within '
      + 'thirty years. Every bishop in Palestine is currently choosing.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 355, m: 3 },
    world: true,
    aiOption: 0,
    historical: 'The Council of Milan (355) exiled the bishops who would not condemn '
      + 'Athanasius. The Arian controversy occupied the imperial government for most of the '
      + 'century.',
    options: [
      {
        label: 'What the emperor wills is the canon',
        tooltip: 'Rome: −1 stability and "The Church Divided" (−6% income and +0.5 unrest in '
          + 'Christian provinces, 60 months).',
        effects: guard('ev351w_the_council_at_milan:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { stability: -1 });
            mod(ctx, 'ROM', 'the_church_divided', 'The Church Divided',
              { incomeMult: 0.94, unrestAll: 0.5 }, 60);
          }
          h.setFlag(ctx, 'churchDivided', true);
          h.chronicle(ctx, 'era', 'At Milan the emperor requires the bishops to sign, and the '
            + 'ones who will not are exiled. The church of the Empire is now two parties.');
        }),
      },
    ],
  },
  {
    id: 'ev351w_julian_to_gaul',
    title: 'The Student Is Sent to Gaul',
    worldLabel: 'Julian is made Caesar and sent to hold the Rhine',
    desc: 'Having killed one cousin, Constantius promotes the other: Julian, twenty-three, a '
      + 'student of philosophy at Athens with no military experience whatsoever, is made '
      + 'Caesar, married to the emperor\'s sister and sent to Gaul, where the Rhine frontier '
      + 'has collapsed and forty-five cities are said to be in barbarian hands.\n\n'
      + 'The appointment is meant as a figurehead with a competent staff. Everyone in the '
      + 'consistory who arranged it will spend the next six years being surprised.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 355, m: 11 },
    world: true,
    aiOption: 0,
    historical: 'Julian was made Caesar on 6 November 355 and sent to Gaul, where he proved '
      + 'unexpectedly capable.',
    options: [
      {
        label: 'A Caesar for the west',
        tooltip: 'Rome: the western frontier is somebody\'s job again — "The Rhine Attended" '
          + '(+6% morale, 72 months).',
        effects: guard('ev351w_julian_to_gaul:0', (ctx) => {
          const h = ctx.helpers;
          mod(ctx, 'ROM', 'the_rhine_attended', 'The Rhine Attended', { moraleMult: 1.06 }, 72);
          h.chronicle(ctx, 'era', 'Julian is made Caesar and sent to Gaul, which the consistory '
            + 'regards as a safe way to store him.');
        }),
      },
    ],
  },

  // ── 357 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_strasbourg',
    title: 'The Field at Strasbourg',
    worldLabel: 'Julian breaks the Alamanni at Strasbourg and takes their king',
    desc: 'Thirteen thousand Romans against a confederation several times that number, and the '
      + 'philosopher wins it: the Alamannic line breaks, the survivors drown in the Rhine, and '
      + 'Chnodomarius the king is taken alive and sent to Constantius, who has him kept in a '
      + 'camp on the Caelian hill until he dies of it.\n\n'
      + 'Ammianus was there, and the account he gives is the best battle narrative in Latin '
      + 'after Caesar. The soldiers begin, quietly, to talk about their Caesar in a way that '
      + 'will be reported east.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 357, m: 8 },
    world: true,
    aiOption: 0,
    historical: 'Strasbourg (Argentoratum), August 357: Ammianus XVI.12, and the making of '
      + 'Julian\'s reputation.',
    options: [
      {
        label: 'The Rhine holds, and a legend starts',
        tooltip: 'Rome: +1 stability and "The Caesar\'s Reputation" (+8% morale, 48 months). '
          + 'The Alamanni: −6,000 manpower and their king is taken.',
        effects: guard('ev351w_strasbourg:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { stability: 1 });
            mod(ctx, 'ROM', 'the_caesars_reputation', 'The Caesar\'s Reputation', { moraleMult: 1.08 }, 48);
          }
          if (alive(ctx, 'SUE')) h.adjust(ctx, 'SUE', { manpower: -6000, stability: -1 });
          h.chronicle(ctx, 'era', 'Julian breaks the Alamanni at Strasbourg and sends their king '
            + 'to Rome in a cage, and the army of Gaul begins to have opinions.');
        }),
      },
    ],
  },

  // ── 359 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_amida',
    title: 'Seventy-Three Days at Amida',
    worldLabel: 'Shapur takes Amida after a seventy-three-day siege',
    desc: 'The King of Kings comes over the Tigris with the Chionite horse beside him and, '
      + 'having failed to force a crossing where he intended, sits down in front of Amida '
      + 'instead. The city holds for seventy-three days, which nobody expected, and falls, '
      + 'which everybody did. Ammianus is inside it and escapes at night through a postern '
      + 'with two companions, and his account is the reason we know what a fourth-century '
      + 'siege was actually like.\n\n'
      + 'Ursicinus, who told the court exactly what would happen and was not listened to, is '
      + 'blamed for it and dismissed. The best general in the East ends his career as the '
      + 'scapegoat for a decision taken by eunuchs, and the eastern army has lost seven '
      + 'legions in one summer.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 359, m: 10 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Amida fell in October 359 (Ammianus XIX). Ursicinus was cashiered for it; '
      + 'Shapur lost so many men taking it that he could not exploit the victory.',
    options: [
      {
        label: 'The city falls and the general is blamed',
        tooltip: 'Rome: −12,000 manpower, −1 stability and "The East Bled White" (−10% '
          + 'reinforcement and −6% discipline, 48 months). Persia: +200 talents and −8,000 '
          + 'manpower — the siege cost the King a third of his army.',
        effects: guard('ev351w_amida:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { manpower: -12000, stability: -1 });
            mod(ctx, 'ROM', 'the_east_bled_white', 'The East Bled White',
              { reinforceMult: 0.9, disciplineMult: 0.94 }, 48);
            h.killGeneral(ctx, 'ROM', 'Ursicinus');
          }
          if (alive(ctx, 'SAS')) h.adjust(ctx, 'SAS', { treasury: 200, manpower: -8000 });
          h.setFlag(ctx, 'amidaFell', true);
          h.chronicle(ctx, 'era', 'Amida falls after seventy-three days. Ursicinus, who predicted '
            + 'it, is dismissed for it.');
        }),
      },
    ],
  },

  // ── 360–361 ────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_julian_augustus',
    title: 'The Army at Paris',
    worldLabel: 'The army of Gaul proclaims Julian Augustus',
    desc: 'Constantius, needing troops for the Persian war and disliking his cousin\'s '
      + 'popularity, orders the best units of the Gallic army east. The units are largely '
      + 'Frankish and Alamannic auxiliaries who enlisted on the express condition that they '
      + 'would not be sent beyond the Alps. They surround the palace at Paris instead, and '
      + 'raise Julian on a shield.\n\n'
      + 'He writes to Constantius proposing terms. Constantius replies that he will accept his '
      + 'submission. Both armies begin to march, and the Roman world prepares for its second '
      + 'civil war in ten years — which is averted in November by a fever at Mopsucrenae.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 360, m: 2 },
    world: true,
    aiOption: 0,
    historical: 'Julian was proclaimed Augustus at Paris in February 360. Constantius died of '
      + 'fever on 3 November 361 while marching against him.',
    options: [
      {
        label: 'A second civil war, and then a fever',
        tooltip: 'Rome: −1 stability and "The Purple Disputed" (−8% reinforcement, 24 months). '
          + 'Nobody on this map has to be told what a Roman civil war is worth to them.',
        effects: guard('ev351w_julian_augustus:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { stability: -1 });
            mod(ctx, 'ROM', 'the_purple_disputed', 'The Purple Disputed', { reinforceMult: 0.92 }, 24);
          }
          h.chronicle(ctx, 'era', 'The army of Gaul raises Julian on a shield at Paris, and the '
            + 'Empire arranges its second civil war in a decade.');
        }),
      },
    ],
  },
  {
    id: 'ev351w_the_temples_reopen',
    title: 'The Temples Reopen',
    worldLabel: 'Julian, sole Augustus, restores the old cults',
    desc: 'Constantius dies at Mopsucrenae in Cilicia and names Julian his heir with his last '
      + 'breath, which saves everybody a war. The new Augustus enters Constantinople in '
      + 'December and begins, immediately and methodically, to take his family\'s religion out '
      + 'of the government: the temples reopened, the sacrifices restored, the exiled bishops '
      + 'of every faction recalled at once on the correct assumption that they will fight each '
      + 'other, the clergy stripped of their exemptions, and Christian teachers forbidden to '
      + 'teach the classics on the grounds that they do not believe them.\n\n'
      + 'He is thirty and he has, though nobody knows it, twenty months.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 361, m: 12 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Julian ruled alone from November 361 to June 363 and attempted a systematic '
      + 'restoration of the old cults.',
    options: [
      {
        label: 'The century pauses',
        tooltip: 'The drift of the age slows sharply while he reigns. Rome: +6% income (the '
          + 'clergy pay tax again) and +0.5 unrest in Christian provinces, 24 months.',
        effects: guard('ev351w_the_temples_reopen:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            mod(ctx, 'ROM', 'the_old_cults_restored', 'The Old Cults Restored',
              { incomeMult: 1.06, unrestAll: 0.5 }, 24);
          }
          h.setFlag(ctx, 'apostateReigns', true);
          h.chronicle(ctx, 'era', 'Julian reopens the temples and takes the exemptions off the '
            + 'clergy, and for twenty months the fourth century runs backwards.');
        }),
      },
    ],
  },

  // ── 363 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_the_peace_of_jovian',
    title: 'A Spear Outside Samarra',
    worldLabel: 'Julian dies in Persia; Jovian buys peace with five provinces and Nisibis',
    desc: 'The expedition goes brilliantly as far as Ctesiphon and then has nowhere to go: the '
      + 'city cannot be stormed, the fleet is burned on the emperor\'s own order, and the army '
      + 'marches north through country Shapur has stripped, harassed every mile. On the 26th '
      + 'of June a spear takes Julian in the side during a skirmish nobody planned. He dies '
      + 'that night, talking philosophy, aged thirty-one.\n\n'
      + 'The army elects Jovian, a guards officer, who is thirty miles from starving and signs '
      + 'what he is given: thirty years of peace, five provinces beyond the Tigris, the '
      + 'fortresses of Singara and Castra Maurorum, and Nisibis — Nisibis, which had held '
      + 'against Shapur three times, evacuated of its entire population by imperial order. '
      + 'Ammianus says the Empire had never before given up a foot of ground taken in war.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 363, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Julian died on 26 June 363; Jovian\'s treaty ceded the trans-Tigris provinces '
      + 'and Nisibis, whose population was expelled and resettled at Amida.',
    options: [
      {
        label: 'The peace of shame',
        tooltip: 'Persia takes Nisibis and Singara outright: Rome −1 stability, −10 legitimacy; '
          + 'Persia +1 stability, +15 legitimacy. The old cults lose their patron and the '
          + 'century resumes.',
        effects: guard('ev351w_the_peace_of_jovian:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'SAS')) {
            for (const n of ['Nisibis', 'Singara']) {
              const p = ctx.prov && ctx.prov(n);
              if (p && p.owner === who(ctx, 'ROM')) h.changeOwner(ctx, n, 'SAS');
            }
            h.adjust(ctx, 'SAS', { stability: 1, legitimacy: 15 });
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { stability: -1, legitimacy: -10 });
          h.setFlag(ctx, 'apostateReigns', false);
          h.setFlag(ctx, 'jovianPeace', true);
          h.chronicle(ctx, 'era', 'Julian dies outside Samarra and Jovian signs away Nisibis to '
            + 'get the army home. The Empire has never done that before.');
        }),
      },
    ],
  },

  // ── 376–378 ────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_the_goths_cross',
    title: 'The Crossing at the Danube',
    worldLabel: 'The Goths ask to cross the Danube, and are let in',
    desc: 'Something has come out of the east that the Goths cannot fight — the Huns, though '
      + 'nobody on the Danube has a word for them yet — and the Tervingi arrive on the far '
      + 'bank in numbers no source is willing to guess at, asking for land and for baptism and '
      + 'offering soldiers. Valens, who needs soldiers, agrees.\n\n'
      + 'The reception is handled by officials who see a commercial opportunity. The refugees '
      + 'are disarmed selectively, fed at prices that reach the level of selling children for '
      + 'dog meat, and finally moved inland by a commander who invites their leaders to dinner '
      + 'and tries to murder them at it. By spring there is a Gothic army loose in Thrace with '
      + 'nothing left to lose.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 376, m: 9 },
    world: true,
    aiOption: 0,
    historical: 'The Gothic crossing of 376 and its mismanagement: Ammianus XXXI.4-5.',
    options: [
      {
        label: 'They are let in, and then robbed',
        tooltip: 'Rome: +6,000 manpower and "The Balkans Ungoverned" (+1 unrest everywhere and '
          + '−8% income, 60 months). The Goths: +1 stability and +8,000 manpower.',
        effects: guard('ev351w_the_goths_cross:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { manpower: 6000 });
            mod(ctx, 'ROM', 'the_balkans_ungoverned', 'The Balkans Ungoverned',
              { unrestAll: 1, incomeMult: 0.92 }, 60);
          }
          if (alive(ctx, 'GOT')) h.adjust(ctx, 'GOT', { stability: 1, manpower: 8000 });
          h.chronicle(ctx, 'era', 'The Goths are let across the Danube and then sold food at the '
            + 'price of their children, and by spring there is an army in Thrace.');
        }),
      },
    ],
  },
  {
    id: 'ev351w_adrianople',
    title: 'The Ninth of August',
    worldLabel: 'Valens and the eastern field army are destroyed at Adrianople',
    desc: 'Valens does not wait for his nephew\'s western army, which is four days away, '
      + 'because he has been told the Goths number ten thousand and because his court has '
      + 'been making remarks about Gratian\'s victories. The Roman line arrives hot and thirsty '
      + 'after an eight-mile march, deploys badly, and is caught in the flank by Gothic cavalry '
      + 'returning from foraging.\n\n'
      + 'Two-thirds of the eastern army dies on the field, along with thirty-five tribunes, '
      + 'both masters of soldiers, and the emperor, whose body was never found. Ammianus, who '
      + 'ends his history here, calls it the worst defeat since Cannae and is not exaggerating '
      + 'for effect.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 378, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Adrianople, 9 August 378. The eastern field army was annihilated; Theodosius '
      + 'settled the Goths inside the Empire as federates four years later.',
    options: [
      {
        label: 'The worst defeat since Cannae',
        tooltip: 'Rome: −18,000 manpower, −2 stability, −15 legitimacy and "After Adrianople" '
          + '(−15% reinforcement and −8% morale, 84 months). The Goths: +2 stability, +20 '
          + 'legitimacy.',
        effects: guard('ev351w_adrianople:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { manpower: -18000, stability: -2, legitimacy: -15 });
            mod(ctx, 'ROM', 'after_adrianople', 'After Adrianople',
              { reinforceMult: 0.85, moraleMult: 0.92 }, 84);
          }
          if (alive(ctx, 'GOT')) h.adjust(ctx, 'GOT', { stability: 2, legitimacy: 20 });
          h.setFlag(ctx, 'adrianople', true);
          h.chronicle(ctx, 'era', 'An emperor and two-thirds of the eastern army are destroyed '
            + 'at Adrianople by people the Empire admitted as refugees two years ago.');
        }),
      },
    ],
  },

  // ── 380 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_cunctos_populos',
    title: 'Cunctos Populos',
    worldLabel: 'Theodosius makes one creed the law of the Empire',
    desc: 'The edict is issued at Thessalonica and it is two sentences long. All peoples under '
      + 'our clemency shall practise the religion which the divine Peter delivered to the '
      + 'Romans; those who follow it shall be called catholic Christians; the rest are '
      + 'demented and insane, shall bear the infamy of heresy, and must expect divine '
      + 'vengeance first and then our own, which we shall inflict in accordance with the '
      + 'divine judgement.\n\n'
      + 'This is not the beginning of Christian empire — that was seventy years ago. It is the '
      + 'end of the arrangement in which what a subject believed was, in the last analysis, a '
      + 'matter between the subject and the gods. Everything the next thousand years does to '
      + 'minorities is downstream of these two sentences.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 380, m: 2 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Cod. Theod. XVI.1.2, 27 February 380. Judaism remained a licit religion — the '
      + 'only one — and was legislated about with increasing sharpness for the next century.',
    options: [
      {
        label: 'One creed, one law',
        tooltip: 'Rome: +1 stability, +10 legitimacy and "The Law of the Creed" (+8% conversion '
          + 'and −0.5 unrest in Christian provinces, permanent). Every non-Christian court in '
          + 'the Empire\'s reach now lives in a legal category.',
        effects: guard('ev351w_cunctos_populos:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { stability: 1, legitimacy: 10 });
            mod(ctx, 'ROM', 'the_law_of_the_creed', 'The Law of the Creed',
              { convertMult: 1.08, unrestAll: -0.5 });
          }
          h.setFlag(ctx, 'oneCreedOneLaw', true);
          h.chronicle(ctx, 'era', 'Theodosius makes one creed the law of the Empire in two '
            + 'sentences, and everything after this is a footnote to them.');
        }),
      },
    ],
  },

  // ── 383 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_magnus_maximus',
    title: 'The Army in Britain Names Its Own',
    worldLabel: 'Magnus Maximus is acclaimed in Britain; the west has its own Augustus',
    desc: 'The army of Britain proclaims its commander, and this time the acclamation '
      + 'does not stay on the island: Maximus crosses to Gaul with the British '
      + 'garrison, the Gallic army comes over to him without a battle, and the '
      + 'reigning emperor of the west is run down and killed at Lyon by his own '
      + 'cavalry commander. What follows is the part the century finds interesting. '
      + 'Maximus does not march on Italy. He settles at Trier, governs Britain, Gaul '
      + 'and Spain competently for five years, executes a Spanish bishop for heresy — '
      + 'the first execution of a Christian by a Christian government for belief, '
      + 'which the bishops of Gaul protest and the precedent survives anyway — and '
      + 'writes to Constantinople asking to be recognized. And he is: for five years '
      + 'there are three Augusti, one of whom got the title by killing the last man '
      + 'who held it, and everyone signs everyone else\'s laws.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 383, m: 6 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Maximus was acclaimed in Britain in 383, killed Gratian at Lyon, ruled the west from Trier for five years and was recognized as Augustus; Theodosius destroyed him at Aquileia in 388.',
    options: [
      {
        label: 'Recognize him, and sign each other\'s laws',
        tooltip: 'Britain, Gaul and Spain go over to a court of their own — recognized, competent and at war with the government it left. Rome −10 legitimacy and "The Third Augustus" (−15% income, −10% manpower) while it lasts.',
        effects: guard('ev351w_magnus_maximus:0', (ctx) => {
          const h = ctx.helpers;
          const claim = raiseWesternClaim(ctx, {
            provinces: MAXIMUS_WEST,
            share: 0.35,
            name: 'The West of Magnus Maximus',
            color: [110, 126, 156],
            stability: 1,
            legitimacy: 45,
            war: 'The War of the Third Augustus',
            ruler: { name: 'Magnus Maximus', title: 'Augustus', gov: 3, infl: 3, mar: 4, age: 48 },
            modifier: {
              id: 'the_army_of_britain', name: 'The Army of Britain', months: -1,
              effects: { moraleMult: 1.06, incomeMult: 1.05, manpowerMult: 0.9 },
            },
            army: {
              at: 'Augusta Treverorum',
              opts: {
                inf: 12, cav: 4, name: 'The Army of the West',
                general: { name: 'Magnus Maximus', fire: 3, shock: 3, maneuver: 3 },
              },
            },
          });
          if (alive(ctx, 'ROM') && claim) {
            h.adjust(ctx, 'ROM', { legitimacy: -10 });
            mod(ctx, 'ROM', 'the_third_augustus', 'The Third Augustus',
              { incomeMult: 0.85, manpowerMult: 0.9 }, -1);
          }
          h.setFlag(ctx, 'magnusMaximus', !!claim);
          h.chronicle(ctx, 'era', 'The army of Britain names its own and the west follows him without a battle: '
            + 'for five years the Roman world has three Augusti, and they sign each other\'s laws.');
        }),
      },
    ],
  },

  // ── 388 · the two roads out of Aquileia ────────────────────────────────────
  {
    id: 'ev351w_aquileia',
    verdict: 'maximusWar',
    title: 'Faster Than Anyone Expected',
    worldLabel: 'Theodosius destroys Maximus at Aquileia; the west comes home',
    desc: 'Theodosius comes west by forced march with a field army full of Goths, and '
      + 'the five-year settlement comes apart in about six weeks. The Alpine '
      + 'garrisons change sides, the fleet does not fight, and Maximus is taken at '
      + 'Aquileia, stripped of the purple and beheaded in front of an army that had '
      + 'acclaimed him. The son he had made a colleague is hunted down in Gaul '
      + 'afterwards. What the west remembers is not the execution but the arithmetic '
      + 'behind it: the man who won marched an eastern army into the western '
      + 'provinces to settle who governed them, and did it twice in six years.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 388, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    when: (ctx) => !!ctx.helpers.getFlag(ctx, 'magnusMaximus') && theodosiusTakesTheWest(ctx),
    options: [
      {
        label: 'Stripped of the purple in front of his own army',
        tooltip: 'The western court folds back into the empire — ground, garrisons and treasury — and the war ends with it. Rome +12 legitimacy, +1 stability, and "The Third Augustus" lifts.',
        effects: guard('ev351w_aquileia:0', (ctx) => {
          const h = ctx.helpers;
          settleWesternClaim(ctx, 'Maximus is taken at Aquileia and beheaded in front of the army '
            + 'that acclaimed him; Britain, Gaul and Spain answer the east again.', false);
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: 12, stability: 1 });
            h.removeModifier(ctx, 'ROM', 'the_third_augustus');
          }
          h.setFlag(ctx, 'magnusMaximus', false);
        }),
      },
    ],
  },

  {
    id: 'ev351w_maximus_holds',
    verdict: 'maximusWar',
    title: 'The Passes Are Held',
    worldLabel: 'Maximus holds the Alps; the west keeps its own Augustus',
    desc: 'The forced march is the whole plan, and this time the passes are held by '
      + 'men who have not been paid to lose them. Theodosius fights his way as far as '
      + 'the Julian Alps, loses a season and a good part of a field army he cannot '
      + 'replace with anything but more Goths, and signs what the chanceries call a '
      + 'concord: three Augusti, three courts, one law, and a border on the Alps that '
      + 'nobody describes as a border. Maximus goes back to Trier and governs Britain, '
      + 'Gaul and Spain for as long as his health lasts. Every western general for the '
      + 'next thirty years takes the lesson, which is not that the west can win, but '
      + 'that the east can be made to stop.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 388, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    when: (ctx) => !!ctx.helpers.getFlag(ctx, 'magnusMaximus') && !theodosiusTakesTheWest(ctx),
    options: [
      {
        label: 'Three Augusti, one law, and a line on the Alps',
        tooltip: 'The western court stays on the map and the war between them ends. Rome −8 legitimacy and −10,000 manpower, and "The Third Augustus" becomes permanent; the west takes "The Concord of the Alps" (+5% income, +5% morale).',
        effects: guard('ev351w_maximus_holds:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const rome = who(ctx, 'ROM');
          g.wars = (g.wars || []).filter((w) => {
            if (!w) return false;
            const all = (w.attackers || []).concat(w.defenders || []);
            return !(all.indexOf('USR') >= 0 && all.indexOf(rome) >= 0);
          });
          for (const t of [g.tags[rome], g.tags.USR]) {
            if (t && Array.isArray(t.atWarWith)) {
              t.atWarWith = t.atWarWith.filter((x) => x !== 'USR' && x !== rome);
            }
          }
          if (g.tags.USR) {
            h.addTagModifier(ctx, 'USR', {
              id: 'the_concord_of_the_alps', name: 'The Concord of the Alps', months: -1,
              effects: { incomeMult: 1.05, moraleMult: 1.05 },
            });
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: -8, manpower: -10000 });
          h.setFlag(ctx, 'maximusStands', true);
          h.chronicle(ctx, 'era', 'The Julian passes are held and the east signs a concord instead of a peace: '
            + 'three Augusti, one law, and a line on the Alps that nobody calls a border.');
        }),
      },
    ],
  },

  // ── 388 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_callinicum',
    title: 'The Synagogue at Callinicum',
    worldLabel: 'Ambrose stops the emperor from making a bishop pay for a burned synagogue',
    desc: 'A mob at Callinicum on the Euphrates, led by the local bishop, burns the synagogue. '
      + 'Theodosius does what Roman emperors have done about arson for four hundred years: he '
      + 'orders the bishop to rebuild it at his own expense. Ambrose of Milan writes to him, '
      + 'and then preaches at him in his own cathedral with the emperor in the congregation, '
      + 'and refuses to celebrate the eucharist until the order is withdrawn.\n\n'
      + 'The order is withdrawn. The significance is not the building; it is the principle '
      + 'established in front of everybody, that the ordinary protection of law does not, in '
      + 'this specific case, apply — and that an emperor who says otherwise can be made to '
      + 'stop saying it by a bishop.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 388, m: 12 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Ambrose, Ep. 40-41. Theodosius rescinded the order. The precedent runs through '
      + 'the whole subsequent legislation on synagogues.',
    options: [
      {
        label: 'The order is withdrawn',
        tooltip: 'Every Jewish court on this map: −10 legitimacy and "The Protection Withdrawn" '
          + '(+0.5 unrest everywhere, 120 months). Rome: −5 legitimacy, and the Church +1 '
          + 'notch of whatever it is the Church now has.',
        effects: guard('ev351w_callinicum:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          for (const k of Object.keys(g.tags || {})) {
            const t = g.tags[k];
            if (!t || t.alive === false || t.religion !== 'judaism') continue;
            h.adjust(ctx, k, { legitimacy: -10 });
            h.addTagModifier(ctx, k, {
              id: 'the_protection_withdrawn', name: 'The Protection Withdrawn', months: 120,
              effects: { unrestAll: 0.5 },
            });
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: -5 });
          h.setFlag(ctx, 'callinicum', true);
          h.chronicle(ctx, 'era', 'The emperor orders a burned synagogue rebuilt at the arsonist\'s '
            + 'expense, and is talked out of it from his own pulpit.');
        }),
      },
    ],
  },

  // ── 392 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_eugenius',
    title: 'The Rhetoric Master in Purple',
    worldLabel: 'Arbogast raises Eugenius in Italy; the west has a court of its own again',
    desc: 'The western emperor is found hanged in his own residence at Vienne, and the '
      + 'Frankish general who had reduced him to a signature says it was suicide, '
      + 'which it may have been. What Arbogast does next is the century in one '
      + 'gesture: he cannot take the purple himself — a Frank cannot be Augustus, and '
      + 'everyone including Arbogast agrees — so he puts it on a professor of '
      + 'rhetoric from the palace secretariat and governs through him. Eugenius is a '
      + 'Christian who reopens the subsidies to the old temples because his support '
      + 'is in a Senate that still keeps them, which turns a constitutional quarrel '
      + 'into the last religious war the Roman state fights against itself. The east '
      + 'does not answer his letters. Both sides spend two years preparing, and the '
      + 'preparation is the point: nobody in this century argues about anything for '
      + 'two years without an army.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 392, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Valentinian II was found hanged at Vienne in May 392; Arbogast raised Eugenius in August and the two courts fought at the Frigidus in September 394.',
    options: [
      {
        label: 'A professor in purple, and a Frank behind him',
        tooltip: 'Italy and the Alpine passes go over to a court of their own, at war with the east. Rome −8 legitimacy and "The Altar Reopened" (−10% income, +0.5 unrest everywhere) while it lasts.',
        effects: guard('ev351w_eugenius:0', (ctx) => {
          const h = ctx.helpers;
          const claim = raiseWesternClaim(ctx, {
            provinces: EUGENIUS_ITALY,
            share: 0.3,
            name: 'The Court of Eugenius',
            color: [140, 116, 128],
            stability: 0,
            legitimacy: 30,
            war: 'The War of the Frigidus',
            ruler: { name: 'Eugenius', title: 'Augustus', gov: 4, infl: 3, mar: 1, age: 44 },
            modifier: {
              id: 'the_senate_and_the_altars', name: 'The Senate and the Altars', months: -1,
              effects: { incomeMult: 1.06, moraleMult: 1.05, legitimacyAdd: -0.05 },
            },
            army: {
              at: 'Mediolanum',
              opts: {
                inf: 10, cav: 4, name: 'The Army of Italy',
                general: { name: 'Arbogast', fire: 3, shock: 4, maneuver: 3 },
              },
            },
          });
          if (alive(ctx, 'ROM') && claim) {
            h.adjust(ctx, 'ROM', { legitimacy: -8 });
            mod(ctx, 'ROM', 'the_altar_reopened', 'The Altar Reopened',
              { incomeMult: 0.9, unrestAll: 0.5 }, -1);
          }
          h.setFlag(ctx, 'eugenius', !!claim);
          h.chronicle(ctx, 'era', 'A Frankish general who cannot wear the purple puts it on a professor of rhetoric: '
            + 'Italy has a court of its own, the old altars have their subsidies back, and the east stops answering letters.');
        }),
      },
    ],
  },

  // ── 394 · the two roads out of the Frigidus ────────────────────────────────
  {
    id: 'ev351w_frigidus',
    verdict: 'frigidus',
    title: 'The Wind Out of the Mountains',
    worldLabel: 'The Frigidus: the west is beaten by a wind, and the old altars close',
    desc: 'Two days in a river valley in the Julian Alps. On the first, the eastern '
      + 'army\'s Gothic federates are sent up the valley and destroyed — ten thousand '
      + 'of them, which both sides afterwards describe as a saving. On the second, a '
      + 'wind comes down off the mountains into the western line so hard that its own '
      + 'arrows come back into its faces and its shields cannot be held; the front '
      + 'breaks, Arbogast kills himself in the hills two days later, and Eugenius is '
      + 'brought to Theodosius\'s tent and beheaded there. Every account on both sides '
      + 'reports the wind and none of them can explain it away — the Christians call '
      + 'it a judgment and the pagans call it the weather, and neither party has ever '
      + 'quite let it go. The subsidies to the temples end that autumn and are never '
      + 'restored.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 394, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    when: (ctx) => !!ctx.helpers.getFlag(ctx, 'eugenius') && theWindRises(ctx),
    options: [
      {
        label: 'A judgment, or the weather',
        tooltip: 'The western court folds back into the empire and the war ends with it. Rome +12 legitimacy, +1 stability, −8,000 manpower for the Gothic dead, and "The Altar Reopened" lifts. The empire is one government for the last four months it will ever be one.',
        effects: guard('ev351w_frigidus:0', (ctx) => {
          const h = ctx.helpers;
          settleWesternClaim(ctx, 'The Frigidus: a wind out of the mountains blows the west\'s own '
            + 'arrows back into its faces, Arbogast kills himself in the hills, and the old altars lose '
            + 'their subsidies for ever.', false);
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: 12, stability: 1, manpower: -8000 });
            h.removeModifier(ctx, 'ROM', 'the_altar_reopened');
          }
          h.setFlag(ctx, 'eugenius', false);
        }),
      },
    ],
  },

  {
    id: 'ev351w_frigidus_still',
    verdict: 'frigidus',
    title: 'The Valley Is Still',
    worldLabel: 'The west holds the Frigidus; Italy keeps its court and its altars',
    desc: 'The first day goes the same way — ten thousand federates sent up a valley '
      + 'and destroyed, which the eastern staff had priced in. The second day the air '
      + 'does not move. Without the wind the western line is a line: veteran, dug in '
      + 'across a defile, with the best general of the age behind it, and by evening '
      + 'the eastern army has spent itself against it and has nothing left to spend. '
      + 'Theodosius, whose health is worse than his court admits, withdraws to '
      + 'Constantinople and dies within the year all the same, and the settlement his '
      + 'successors sign is the one nobody wanted: two empires in fact and in law, '
      + 'the western one governed by a Frankish general through a professor of '
      + 'rhetoric, with the subsidies to the old temples still being paid.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 394, m: 9 },
    world: true,
    major: true,
    aiOption: 0,
    when: (ctx) => !!ctx.helpers.getFlag(ctx, 'eugenius') && !theWindRises(ctx),
    options: [
      {
        label: 'Withdraw, and sign what can be signed',
        tooltip: 'The western court stays on the map and the war ends. Rome −12 legitimacy, −1 stability and −12,000 manpower; "The Altar Reopened" becomes permanent, and the west takes "The Line at the Defile" (+6% morale, +5% income).',
        effects: guard('ev351w_frigidus_still:0', (ctx) => {
          const h = ctx.helpers;
          const g = ctx.game;
          const rome = who(ctx, 'ROM');
          g.wars = (g.wars || []).filter((w) => {
            if (!w) return false;
            const all = (w.attackers || []).concat(w.defenders || []);
            return !(all.indexOf('USR') >= 0 && all.indexOf(rome) >= 0);
          });
          for (const t of [g.tags[rome], g.tags.USR]) {
            if (t && Array.isArray(t.atWarWith)) {
              t.atWarWith = t.atWarWith.filter((x) => x !== 'USR' && x !== rome);
            }
          }
          if (g.tags.USR) {
            h.addTagModifier(ctx, 'USR', {
              id: 'the_line_at_the_defile', name: 'The Line at the Defile', months: -1,
              effects: { moraleMult: 1.06, incomeMult: 1.05 },
            });
          }
          if (alive(ctx, 'ROM')) h.adjust(ctx, 'ROM', { legitimacy: -12, stability: -1, manpower: -12000 });
          h.setFlag(ctx, 'eugeniusStands', true);
          h.chronicle(ctx, 'era', 'The valley is still on the second morning and the western line holds: '
            + 'the east withdraws, and the empire is two governments in law as well as in fact.');
        }),
      },
    ],
  },

  // ── 410 ────────────────────────────────────────────────────────────────────
  {
    id: 'ev351w_alaric_in_rome',
    title: 'The Gate Is Opened at Night',
    worldLabel: 'Alaric\'s Goths enter Rome',
    desc: 'Somebody opens the Salarian gate on the night of the 24th of August, and for three '
      + 'days the Goths are inside Rome. By the standards of the century the sack is '
      + 'restrained — Alaric is a Christian of a sort and the great basilicas are spared — and '
      + 'by any other standard it does not matter in the slightest. The city has not been '
      + 'entered by an enemy for eight hundred years.\n\n'
      + 'Jerome, in Bethlehem, stops dictating his commentary on Ezekiel. Augustine, in '
      + 'Africa, starts writing about a different city entirely. Nobody in the East loses a '
      + 'soldier over it, and everybody in the East understands that something has ended.',
    forTag: 'both',
    decider: 'ROM',
    date: { y: 410, m: 8 },
    world: true,
    major: true,
    aiOption: 0,
    historical: 'Rome was sacked on 24 August 410, the first time since the Gauls in 390 BCE.',
    options: [
      {
        label: 'Eight hundred years',
        tooltip: 'Rome: −20 legitimacy, −1 stability and "The City Entered" (−8% morale, 120 '
          + 'months). Every court on the map revises, quietly, what it thought was permanent.',
        effects: guard('ev351w_alaric_in_rome:0', (ctx) => {
          const h = ctx.helpers;
          if (alive(ctx, 'ROM')) {
            h.adjust(ctx, 'ROM', { legitimacy: -20, stability: -1 });
            mod(ctx, 'ROM', 'the_city_entered', 'The City Entered', { moraleMult: 0.92 }, 120);
          }
          h.setFlag(ctx, 'romeSacked', true);
          h.chronicle(ctx, 'era', 'The Goths are inside Rome for three days, and every court on '
            + 'the map spends the winter reconsidering what it thought could not happen.');
        }),
      },
    ],
  },
];
