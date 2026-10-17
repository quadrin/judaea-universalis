// Primary-text anchors identify the attested crisis. Choices and simulation
// outcomes are alternatives, not assertions that all those choices occurred.
const info = (ctx, key) => ctx.helpers.historicalCrisisInfo(ctx, key);
const pick = (key, choice) => ctx => ctx.helpers.chooseHistoricalCrisis(ctx, key, choice);
const saved = (ctx, key) => ctx.game.flags.historicalCrises?.[key];
const chip = (icon, label) => ({ icon, label });
const macc = [{ label: '1 Maccabees 10:1–66', url: 'https://www.biblegateway.com/passage/?search=1%20Maccabees%2010&version=NRSVUE' }];
const brothers = [{ label: 'Josephus, Antiquities 14.1.2–14.2.1 (§§4–21)', url: 'https://penelope.uchicago.edu/josephus/ant-14.html' }];
const testament = [{ label: 'Josephus, Antiquities 17.8–11 (§§188–323)', url: 'https://penelope.uchicago.edu/josephus/ant-17.html' }];

export const BALAS_EVENT = {
  id: 'ev_balas_vs_demetrius', title: 'Two Kings Bid for Jonathan',
  forTag: 'HAS', date: { y: -152, m: 6 }, major: true,
  when: ctx => info(ctx, 'balas').exists,
  desc: 'Alexander Balas has landed at Ptolemais, claiming to be a son of Antiochus IV. Demetrius I and the claimant both seek Jonathan’s support. Alexander offers the high priesthood; Demetrius promises extensive concessions.\n\nA rival Seleucid court will fight for the crown. Our decision determines whom we support, but the armies decide who can honour the bargain.',
  historical: 'Jonathan accepted Alexander’s offer of the high priesthood in 152 BCE. Alexander defeated Demetrius in 150 BCE. His claimed parentage was disputed; the game does not treat it as proven.', sources: macc,
  aiOption: ctx => info(ctx, 'balas').canFund ? 0 : 2,
  options: [
    { label: 'Accept the priesthood and supply Alexander', when: ctx => info(ctx, 'balas').canFund,
      stakes: [chip('coins', '−100'), chip('spears', '−1,000'), chip('laurel', 'Back Balas')],
      tooltip: 'Transfer 100 talents and 1,000 manpower to Alexander’s new court at Ptolemais. His civil war is real; this does not automatically enrol us. Jonathan becomes high priest now: +10 legitimacy and −1 unrest for three years. Victory at Antioch and peace can make that settlement permanent.', effects: pick('balas', 'fund') },
    { label: 'Accept Demetrius’s offer instead', when: ctx => info(ctx, 'balas').canBackKing,
      stakes: [chip('laurel', 'Back Demetrius'), chip('coins', 'Tax concessions if he wins')],
      tooltip: 'Requires peace with Demetrius. Relations improve with his court and worsen with Balas. If Demetrius retains Antioch after the civil war, receive ten years of +10% income. No royal grant is paid before he wins.', effects: pick('balas', 'king') },
    { label: 'Promise neither claimant our support', stakes: [chip('shield', 'Neutral')],
      tooltip: 'The rival court still lands and fights, but we commit no resources and receive no promised reward.', effects: pick('balas', 'neutral') },
  ],
};

export const EVENTS_BALAS = [{
  id: 'ev_balas_the_royal_promise', title: 'The Royal Promise', forTag: 'HAS',
  minYear: -152, maxYear: -140, major: true,
  trigger: ctx => saved(ctx, 'balas')?.status === 'war' && !!info(ctx, 'balas').winner,
  desc: 'The war for the Seleucid throne has ended and Antioch answers to a surviving court. Jonathan’s bargain now has a king who can honour it—or a victorious rival who remembers our choice.',
  historical: 'Alexander confirmed Jonathan’s standing at Ptolemais in 150 BCE. A different victor, or a refusal to back either king, follows the campaign’s choices.', sources: macc,
  aiOption: ctx => info(ctx, 'balas').canHonour ? 0 : 1,
  options: [
    { label: 'Confirm the bargain with our victorious candidate', when: ctx => info(ctx, 'balas').canHonour,
      stakes: [chip('scroll', 'Royal agreement')],
      tooltip: 'Balas confirms Jonathan’s high priesthood: +10 legitimacy, +20 governance, permanent −1 unrest. Demetrius instead grants +10% income for ten years. Requires our supported candidate to hold Antioch and be at peace with us.', effects: pick('balas', 'honour') },
    { label: 'Make a fresh approach without the old promises', stakes: [chip('laurel', '−5 legitimacy')],
      tooltip: 'Close the old bargain. −5 legitimacy and −20 opinion with the winner. No unearned office, tax concession, territorial transfer or forced peace.', effects: pick('balas', 'settle') },
  ],
}];

export const EVENTS_BROTHERS = [
  {
    id: 'ev67_the_brothers_accord', title: 'An Oath in the Temple', forTag: 'HYR',
    date: { y: -67, m: 6 }, when: ctx => info(ctx, 'brothers').exists, major: true, aiOption: 0,
    desc: 'Hyrcanus and Aristobulus can settle their struggle without another siege. Aristobulus would hold the crown; Hyrcanus would surrender his claim and Jerusalem in return for security. The agreement needs both brothers’ assent.\n\nHyrcanus would retain a dependent administration in his remaining lands. Accepting ends the war between the brothers and restricts his foreign policy.',
    historical: 'Josephus records Hyrcanus’s defeat near Jericho, his agreement to retire while Aristobulus ruled, and an oath in the Temple. Antipater subsequently persuaded Hyrcanus to reopen his claim with Nabataean help. The retained dependent administration is a gameplay abstraction of the settlement.', sources: brothers,
    options: [
      { label: 'Offer to recognize Aristobulus’s crown', stakes: [chip('laurel', 'Yield the crown'), chip('tower', 'Jerusalem'), chip('scroll', 'His answer required')],
        tooltip: 'If Aristobulus agrees: end the war, cede our uncontested Jerusalem, become his client with 5% tribute for ten years, and sign a six-month truce. Outside allies keep their own wars. Hyrcanus keeps his remaining administration. No terms take effect before the other court agrees.', effects: pick('brothers', 'offer') },
      { label: 'Continue the struggle for the crown', stakes: [chip('swords', 'Continue war')],
        tooltip: 'Refuse this settlement and continue the current war. No free army or immediate bonus.', effects: pick('brothers', 'fight') },
    ],
  },
  {
    id: 'ev67_aristobulus_answers', title: 'One Crown, Two Brothers', forTag: 'ARI',
    minYear: -67, maxYear: -66, major: true,
    trigger: ctx => info(ctx, 'brothers').canAccept,
    desc: 'Hyrcanus offers to recognize our crown and yield Jerusalem. His remaining administration would answer to us, and our armies would stop fighting. We can accept his submission or seek a complete victory in the field.',
    historical: 'Aristobulus accepted the original agreement with Hyrcanus. Its survival here depends on both courts’ decisions.', sources: brothers,
    aiOption: 0,
    options: [
      { label: 'Accept his submission and end the war', stakes: [chip('laurel', '+15 legitimacy'), chip('tower', 'Jerusalem'), chip('scroll', '5% tribute')],
        tooltip: 'White peace returns occupations; uncontested Jerusalem passes to our crown. Hyrcanus becomes our client with 5% tribute for ten years. Six-month truce; his outside alliances end.', effects: pick('brothers', 'accept') },
      { label: 'There will be no separate administration', stakes: [chip('swords', 'Continue war')],
        tooltip: 'Reject the offer. The current war continues without any territorial transfer.', effects: pick('brothers', 'reject') },
    ],
  },
  {
    id: 'ev67_antipater_reopens_the_claim', title: 'Antipater Has Not Forgotten', forTag: 'HYR',
    minYear: -67, maxYear: -64, major: true,
    trigger: ctx => saved(ctx, 'brothers')?.status === 'accord' && info(ctx, 'brothers').canRise,
    desc: 'Antipater argues that the agreement has made Hyrcanus dependent on his brother’s goodwill. He urges a renewed claim. The truce has expired; reopening the succession would mean an actual war of independence. Keeping the oath would leave Aristobulus’s settlement intact.',
    historical: 'Antipater persuaded Hyrcanus to seek Aretas III’s help against Aristobulus. The existing Price of Petra event handles Nabataea’s territorial price if the renewed war remains active.', sources: brothers,
    aiOption: 0,
    options: [
      { label: 'Reopen the claim', stakes: [chip('swords', 'War of independence')],
        tooltip: 'Use the ordinary independence declaration: leave the brother’s wars, sever clientship and declare war. Nabataean support still requires its own agreement; no free intervention is granted here.', effects: pick('brothers', 'rise') },
      { label: 'Keep the oath', stakes: [chip('scales', '+1 stability'), chip('scroll', 'Remain a client')],
        tooltip: 'Keep the settlement and gain 1 stability. Later historical war cards cannot restart a quarrel settled by clientship.', effects: pick('brothers', 'keep') },
    ],
  },
];

export const HEROD_SUCCESSION = {
  id: 'ev5_herod_dies', title: 'The King’s Last Will', forTag: 'both',
  decider: ctx => info(ctx, 'herod').parent || 'HER',
  date: { y: -4, m: 4 }, after: 'ev67a_the_eagle_over_the_gate', when: ctx => info(ctx, 'herod').exists,
  major: true,
  desc: 'Herod’s final testament divides his kingdom among Archelaus, Antipas and Philip, subject to Augustus’s confirmation. Antipas can invoke an earlier will that named him king instead. Neither the family’s claims nor the final division settles what Rome will accept.\n\nThe division uses only land our court still owns and controls. An undivided kingdom requires a different settlement.',
  historical: 'Herod died in 4 BCE. Augustus ultimately gave Archelaus an ethnarchy, Antipas Galilee and Peraea, and Philip the northeastern territories. Antipas argued for an earlier will. Confirmation of one undivided kingdom is a playable alternative, not the recorded result.', sources: testament,
  aiOption: ctx => info(ctx, 'herod').canDivide && !ctx.game.flags.kingdomWhole ? 0 : info(ctx, 'herod').canPetition ? 1 : 2,
  options: [
    { label: 'Accept the final division', when: ctx => info(ctx, 'herod').canDivide,
      stakes: [chip('laurel', 'Archelaus'), chip('split', 'Separate tetrarchies')],
      tooltip: 'Archelaus rules the remaining realm as ethnarch. Eligible Galilee/Peraea and northeastern provinces leave under Antipas and Philip, with local armies and proportional treasury/manpower shares. Roman clients remain Roman clients; independent realms remain independent. Foreign and occupied provinces are untouched.', effects: pick('herod', 'divide') },
    { label: 'Take Antipas’s earlier will to Augustus', when: ctx => info(ctx, 'herod').canPetition,
      stakes: [chip('coins', '−100'), chip('laurel', 'Antipas'), chip('scroll', 'Rome must agree')],
      tooltip: 'Transfer 100 talents to Rome and install Antipas as claimant. Rome independently chooses whether to confirm one client kingdom at 15% tribute or insist on division. Previous diplomatic preparation matters.', effects: pick('herod', 'petition') },
    { label: 'Acclaim Antipas without imperial confirmation', stakes: [chip('laurel', '−20 legitimacy'), chip('scales', '−1 stability'), chip('swords', 'Intervention risk')],
      tooltip: 'Install Antipas over the undivided realm. Rome can refuse confirmation; continued resistance ends Roman clientship and may bring a Roman war. Existing truces and recognition still bind Rome.', effects: pick('herod', 'defy') },
  ],
};

export const EVENTS_HEROD_SUCCESSION = [
  HEROD_SUCCESSION,
  {
    id: 'ev_herod_rome_answers', title: 'The Herodian Petition', forTag: 'ROM', minYear: -4, maxYear: 6, major: true,
    trigger: ctx => ['petition', 'defied'].includes(saved(ctx, 'herod')?.status) && !!info(ctx, 'herod').rome,
    desc: 'Antipas claims Herod’s undivided kingdom under an earlier will. The final testament divided it. Confirming a single client would preserve one government; insisting on the final division would leave several smaller rulers answering to Rome.',
    historical: 'Augustus heard the rival claims and divided the kingdom. Confirmation of Antipas over the whole kingdom is an alternative outcome.', sources: testament,
    aiOption: ctx => {
      const i = info(ctx, 'herod'), t = ctx.game.tags[i.parent], rom = ctx.game.tags[i.rome];
      return i.record?.status === 'petition' && t?.legitimacy >= 50
        && (rom?.opinion?.[i.parent] || 0) >= 40 && ctx.game.flags.successionSettled ? 0 : 1;
    },
    options: [
      { label: 'Confirm Antipas as king of one client realm', when: ctx => info(ctx, 'herod').canRatify,
        stakes: [chip('laurel', 'One client'), chip('coins', '15% tribute')],
        tooltip: 'The undivided kingdom becomes or remains our client at 15% tribute. Antipas receives the royal title. No land is ceded.', effects: pick('herod', 'ratify') },
      { label: 'Insist on the final division', stakes: [chip('split', 'Demand partition')],
        tooltip: 'Reject the undivided claim. The successor court must decide whether to accept division or resist; Rome does not acquire provinces automatically.', effects: pick('herod', 'refuse') },
    ],
  },
  {
    id: 'ev_herod_the_imperial_verdict', title: 'Augustus Insists on Division', forTag: 'both',
    decider: ctx => info(ctx, 'herod').parent || 'HER', minYear: -4, maxYear: 6, major: true,
    trigger: ctx => saved(ctx, 'herod')?.status === 'rejected' && !!info(ctx, 'herod').parent,
    desc: 'Rome refuses to confirm Antipas over the whole kingdom. We can accept the final division, or refuse imperial arbitration and face the possibility of armed intervention.',
    historical: 'Augustus divided the kingdom after hearing the claims. Refusal followed by a succession war is an alternative branch.', sources: testament,
    aiOption: ctx => info(ctx, 'herod').canDivide ? 0 : 1,
    options: [
      { label: 'Accept the partition', when: ctx => info(ctx, 'herod').canDivide,
        stakes: [chip('split', 'Separate tetrarchies')], tooltip: 'Carry out the final division on eligible land still owned and controlled by this court.', effects: pick('herod', 'accept_division') },
      { label: 'Refuse the verdict and imperial authority', stakes: [chip('laurel', '−15 legitimacy'), chip('swords', 'Risk war with Rome')],
        tooltip: 'End our Roman clientship and patron agreement, if any; Rome’s opinion falls by 80. Rome then decides whether to intervene when its diplomatic commitments permit.', effects: pick('herod', 'resist') },
    ],
  },
  {
    id: 'ev_herod_roman_intervention', title: 'Enforce the Herodian Settlement?', forTag: 'ROM', minYear: -4, maxYear: 10, major: true,
    trigger: ctx => ctx.helpers.canImperialIntervention(ctx),
    desc: 'The successor court refuses our settlement and governs without our authority. Our diplomatic commitments now permit intervention. We can enforce the verdict by war or leave the undivided kingdom independent.',
    historical: 'Roman intervention in the unrest after Herod’s death is attested. This particular war over an undivided Antipan kingdom is an alternative outcome.', sources: testament,
    aiOption: ctx => (ctx.game.tags[info(ctx, 'herod').rome]?.atWarWith || []).length >= 2 ? 1 : 0,
    options: [
      { label: 'Enforce the settlement by war', stakes: [chip('swords', 'Declare war')], tooltip: 'Declare a real war against the successor court. No automatic conquest, ruler replacement or treaty outcome.', effects: pick('herod', 'enforce') },
      { label: 'Leave this kingdom to its own affairs', stakes: [chip('shield', 'Independent kingdom')], tooltip: 'Accept the continued existence of the independent, undivided kingdom. No tribute or forced partition.', effects: pick('herod', 'leave') },
    ],
  },
];
