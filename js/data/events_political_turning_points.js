// Historical episodes with explicitly alternative outcomes. Display data is
// serializable; foreign courts resolve their own decisions through the engine.
const I = (ctx, key) => ctx.helpers.politicalCrisisInfo(ctx, key);
const R = (ctx, key) => I(ctx, key).record;
const S = (icon, label) => ({ icon, label });
function O(key, choice, label, stakes, tooltip, when, actor) {
  return { label, stakes, tooltip, ...(when ? { when } : {}), effects: ctx => ctx.helpers.choosePoliticalCrisis(ctx, key, choice, actor) };
}
const macc11 = [{ label: '1 Maccabees 11:1–19', url: 'https://www.biblegateway.com/passage/?search=1%20Maccabees%2011%3A1-19&version=NRSVUE' }];
const macc13 = [{ label: '1 Maccabees 12:39–53; 13:12–30', url: 'https://www.biblegateway.com/passage/?search=1%20Maccabees%2012%3A39-53%3B13%3A12-30&version=NRSVUE' }];
const arabia = [{ label: 'Cassius Dio 68.14; annexation in 106 CE', url: 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cassius_Dio/68*.html' }];
const lakhmid = [{ label: 'Encyclopaedia Iranica: Lakhmids', url: 'https://www.iranicaonline.org/articles/lakhmids/' }];
const peace = [{ label: 'James Howard-Johnston, The Last Great War of Antiquity (2021)', url: 'https://global.oup.com/academic/product/the-last-great-war-of-antiquity-9780198830191' }];
const goods = [{ label: 'Luxembourg Agreement, 1952; UN Treaty Series, volume 162', url: 'https://treaties.un.org/doc/Publication/UNTS/Volume%20162/v162.pdf' }];
const C = (id, title, forTag, key, statuses, desc, options, extra = {}) => ({
  id, title, forTag, major: true, desc, options, aiOption: 0,
  trigger: ctx => statuses.includes(R(ctx, key)?.status), ...extra,
});

export const EVENTS_EGYPT145 = [
  { id: 'ev145_egypt_changes_sides', title: 'Ptolemy Changes Sides', forTag: 'PTO', date: { y: -145, m: 3 }, major: true,
    when: ctx => I(ctx, 'egypt').exists, aiOption: ctx => I(ctx, 'egypt').canSwitch ? 0 : 1,
    desc: 'Ptolemy VI’s marriage alliance with Alexander Balas no longer settles Egypt’s interests in Syria. Demetrius II offers another candidate for the Seleucid crown. Changing sides would create a new rival court and commit Egypt to war against its former ally.',
    historical: 'Ptolemy VI turned against Alexander Balas, supported Demetrius II and transferred Cleopatra Thea’s marriage to Demetrius. The precise map and the survival of either king follow this campaign.', sources: macc11,
    options: [
      O('egypt', 'switch', 'Support Demetrius II against Alexander', [S('swords', 'Change sides'), S('laurel', 'Rival court')], 'Demetrius receives a coastal court and 20% of Balas’s treasury and muster rolls as defections. Egypt joins his real war. No automatic conquest or defeat of Balas.', ctx => I(ctx, 'egypt').canSwitch),
      O('egypt', 'loyal', 'Keep our agreement with Alexander', [S('scroll', 'Keep allegiance')], 'Preserve the existing alignment. Egypt does not create a replacement claimant or start this war.'),
    ] },
  C('ev145_jonathans_alignment', 'Egypt Requires an Answer', 'HAS', 'egypt', ['switched'],
    'Egypt has changed sides. We can abandon Alexander, fight for him, or ask Ptolemy to recognize our neutrality. An office granted by Balas and friendship with Egypt can no longer be treated as the same policy.', [
      O('egypt', 'align', 'Accommodate Egypt and Demetrius', [S('quill', '−20 influence'), S('scroll', 'Passage agreements')], 'Leave Balas’s alliances and joint wars; lose his priesthood concession modifier. Gain reciprocal passage with Egypt and Demetrius for three years. Requires peace with those courts.', ctx => I(ctx, 'egypt').canAlign),
      O('egypt', 'defend', 'Defend Alexander in the field', [S('swords', 'Join Balas’s war')], 'Enter the current war on Alexander’s side. Existing truces and restrictions on foreign policy still apply.', ctx => I(ctx, 'egypt').canDefend),
      O('egypt', 'neutral', 'Ask Egypt to accept our neutrality', [S('scroll', 'Egypt must agree')], 'Ptolemy decides whether to grant reciprocal safe passage or reject the request. No free alliance or automatic peace.'),
    ], { minYear: -145, maxYear: -140, trigger: ctx => R(ctx, 'egypt')?.alignment === 'pending', sources: macc11,
      historical: 'Jonathan had supported Alexander. These three diplomatic responses are alternatives built around Egypt’s attested change of allegiance.' }),
  C('ev145_neutrality_answer', 'Jonathan’s Request for Neutrality', 'PTO', 'egypt', ['switched'],
    'Jonathan asks to remain outside our war against Alexander, with reciprocal passage for the next three years. We can accept that arrangement or treat his refusal to align as a diplomatic rebuff.', [
      O('egypt', 'permit', 'Accept neutrality and safe passage', [S('scroll', '36 months passage')], 'Grant reciprocal military passage for three years. It grants movement, not an alliance, supply or participation in wars.'),
      O('egypt', 'deny', 'Require a clearer allegiance', [S('laurel', '−40 opinion')], 'Reject the request. Egypt’s opinion falls by 40. No declaration of war is forced.'),
    ], { minYear: -145, maxYear: -140, trigger: ctx => R(ctx, 'egypt')?.alignment === 'requested', sources: macc11,
      historical: 'The neutrality agreement is a playable alternative to the recorded alignment.' }),
];

export const TRYPHON_INVITATION = {
  id: 'ev_tryphon', title: 'Tryphon’s Invitation', forTag: 'HAS', minYear: -143, maxYear: -142, major: true,
  trigger: ctx => I(ctx, 'tryphon').exists, aiOption: ctx => I(ctx, 'tryphon').canAttend ? 0 : 2,
  desc: 'Tryphon invites Jonathan into Ptolemais and asks him to dismiss most of his army. Entering with a small escort would put our ruler in his hands. A substantial escort would cost more and make an ambush harder. Refusal may bring a punitive campaign.',
  historical: 'Jonathan entered Ptolemais with a thousand men; Tryphon captured him and killed his escort. Simon later paid the requested ransom, but Jonathan was not released. Retaining an escort or refusing the meeting are alternative choices.', sources: macc13,
  options: [
    O('tryphon', 'attend', 'Attend with the requested escort', [S('spears', 'Commit 1,000'), S('laurel', 'Ruler at risk')], 'Reserve 1,000 manpower as an escort. Tryphon’s court decides whether to honour the meeting. An ambush loses the escort and captures Jonathan; Simon takes the government.', ctx => I(ctx, 'tryphon').canAttend),
    O('tryphon', 'escort', 'Insist on keeping a substantial escort', [S('coins', '−40'), S('spears', 'Commit 3,000')], 'Reserve 3,000 manpower and spend 40 talents. If ambushed, Jonathan escapes: 1,000 men are lost and 2,000 return as an actual field army. An honoured meeting returns all reserved manpower.', ctx => I(ctx, 'tryphon').canEscort),
    O('tryphon', 'refuse', 'Refuse to enter the city', [S('shield', 'Keep the ruler'), S('swords', 'Campaign risk')], 'The ruler remains at home. Tryphon’s court may declare a legal punitive war or abandon the demand.'),
  ],
};
export const EVENTS_TRYPHON = [
  C('ev143_the_meeting', 'The Meeting at Ptolemais', 'both', 'tryphon', ['meeting'],
    'Jonathan has accepted the invitation. His escort has been reserved from his country’s muster rolls. The court holding Ptolemais now decides whether to honour the meeting or attempt the ambush.', [
      O('tryphon', 'ambush', 'Attempt to seize Jonathan', [S('laurel', 'Capture or escape')], 'A small escort is lost and Jonathan is captured. A substantial escort foils the capture but loses 1,000 men.'),
      O('tryphon', 'honour', 'Honour the meeting', [S('scroll', 'Return the escort')], 'Return the reserved escort and improve relations. Jonathan keeps his command and government.'),
    ], { minYear: -143, maxYear: -140, decider: ctx => I(ctx, 'tryphon').host || 'SEL', sources: macc13,
      historical: 'The recorded meeting ended in Jonathan’s capture. Honouring it is an alternative outcome.' }),
  C('ev143_the_ransom', 'One Hundred Talents for Jonathan', 'HAS', 'tryphon', ['captive'],
    'Simon holds the government while Jonathan remains captive. Tryphon demands a hundred talents. Payment will buy a decision from the captor, not a guarantee that Jonathan comes home.', [
      O('tryphon', 'ransom', 'Pay the ransom', [S('coins', '−100'), S('laurel', 'Release not guaranteed')], 'Transfer 100 talents to the captor. That court decides whether to release Jonathan or betray the agreement.', ctx => I(ctx, 'tryphon').canRansom),
      O('tryphon', 'withhold', 'Do not send the ransom', [S('laurel', 'Simon succeeds')], 'Jonathan does not return. Simon’s acting government becomes the succession; no ransom is paid.'),
    ], { minYear: -143, maxYear: -140, aiOption: ctx => I(ctx, 'tryphon').canRansom ? 0 : 1, sources: macc13,
      historical: 'Simon paid the ransom in the account of 1 Maccabees; Tryphon nevertheless killed Jonathan.' }),
  C('ev143_the_captors_answer', 'The Ransom Has Arrived', 'both', 'tryphon', ['ransom'],
    'The ransom has been transferred. We can return Jonathan and end the detention or keep the money and end his life. His government cannot decide this answer for us.', [
      O('tryphon', 'betray', 'Keep the ransom; Jonathan does not return', [S('laurel', 'Simon remains')], 'The historical betrayal. Jonathan is dead and Simon remains ruler.'),
      O('tryphon', 'release', 'Release Jonathan', [S('dove', 'Restore the captive')], 'Return Jonathan to his former office if Simon still holds the acting government. The ransom stays paid.'),
    ], { minYear: -143, maxYear: -140, decider: ctx => I(ctx, 'tryphon').host || 'SEL', sources: macc13,
      historical: 'Release after payment is an explicitly alternative outcome.' }),
  C('ev143_the_refused_invitation', 'Jonathan Will Not Come', 'both', 'tryphon', ['refused'],
    'Jonathan refuses to enter Ptolemais. We can answer with a punitive expedition when our treaties permit, or abandon the invitation and its demands.', [
      O('tryphon', 'invade', 'Declare a punitive war', [S('swords', 'Actual war')], 'Declare war against Jonathan’s court. Existing truces, recognition and client restrictions apply.', ctx => I(ctx, 'tryphon').canInvade),
      O('tryphon', 'abandon', 'Abandon the demand', [S('shield', 'No new war')], 'Leave Jonathan in office without opening this war.'),
    ], { minYear: -143, maxYear: -140, decider: ctx => I(ctx, 'tryphon').host || 'SEL', sources: macc13,
      historical: 'This is the alternative branch in which Jonathan refused the historical meeting.' }),
];

function clientChain(key, prefix, court, empire, year, title, sources, history) {
  const chip = key === 'arabia' ? 'Arabia' : 'Hira';
  return [
    { id: prefix, title, forTag: empire, date: { y: year, m: 3 }, when: ctx => I(ctx, key).exists, major: true, aiOption: 0,
      desc: `The court of ${chip} can be incorporated into direct imperial administration, or retained under a client dynasty. An imperial demand is not itself a transfer of its provinces: the local court must answer.`, historical: history, sources,
      options: [O(key, 'demand', 'Demand direct administration', [S('flag', 'Seek annexation')], 'The local court decides whether to submit, negotiate or resist. No occupied or foreign land is transferred by this demand.'),
        O(key, 'confirm', 'Offer to retain a client monarchy', [S('laurel', '10% tribute')], 'Offer a ten-year client agreement with 10% tribute. The local court can accept or resist.')] },
    C(prefix + '_answer', 'The Imperial Demand', court, key, ['demand'],
      'The empire demands direct rule. Submission ends this court and transfers its country to the imperial government. A funded embassy can ask for a client dynasty instead. Resistance means a real war.', [
        O(key, 'accept', 'Accept direct administration', [S('flag', 'Transfer the realm')], 'Only uncontested land can be incorporated. Armies and resources follow the existing annexation machinery. Two human chairs cannot be merged.', ctx => I(ctx, key).canAbsorb),
        O(key, 'negotiate', 'Negotiate a client dynasty', [S('coins', '−100'), S('scroll', 'Imperial answer required')], 'Pay a 100-talent embassy to the empire. Its court may approve a client settlement or insist on annexation.', ctx => I(ctx, key).canNegotiate),
        O(key, 'resist', 'Resist incorporation', [S('swords', 'War for the crown')], 'Declare independence from the empire or defend the kingdom by war. Existing truces and commitments still bind us.', ctx => I(ctx, key).canResist),
      ], { minYear: year, maxYear: year + 6, sources, historical: history,
        trigger: ctx => { const i = I(ctx, key); return i.record?.status === 'demand' && (i.canAbsorb || i.canNegotiate || i.canResist); } }),
    C(prefix + '_client', 'A Client Crown Can Remain', court, key, ['offer_client'],
      'The empire offers to preserve a separate monarchy under its authority. Accepting keeps the map under our administration, but binds our foreign policy and charges tribute.', [
        O(key, 'client', 'Accept the client settlement', [S('laurel', 'Keep the court'), S('coins', '10% tribute')], 'Become or remain an imperial client with a ten-year 10% tribute pact. Outside alliances end.', ctx => I(ctx, key).canClient),
        O(key, 'resist', 'Refuse imperial authority', [S('swords', 'War for independence')], 'Declare a legal war of independence. No provinces are granted automatically.', ctx => I(ctx, key).canResist),
      ], { minYear: year, maxYear: year + 6, sources, historical: history,
        trigger: ctx => { const i = I(ctx, key); return i.record?.status === 'offer_client' && (i.canClient || i.canResist); } }),
    C(prefix + '_petition', 'The Client’s Embassy', empire, key, ['petition'],
      'The embassy has paid for a hearing. We can retain a client court at 10% tribute, or maintain our demand for direct administration.', [
        O(key, 'reject', 'Maintain the demand for direct rule', [S('flag', 'Annexation demanded')], 'Return the question to the local court. No province transfers before its answer.'),
        O(key, 'approve', 'Approve a client dynasty', [S('laurel', 'Client crown'), S('coins', '10% tribute')], 'Preserve a dependent court. At Hira, a nominated heir or local council replaces the old ruler.', ctx => I(ctx, key).canClient),
      ], { minYear: year, maxYear: year + 6, sources, historical: history, aiOption: 0 }),
    C(prefix + '_ultimatum', 'The Embassy Has Failed', court, key, ['ultimatum'],
      'The empire has rejected the embassy’s request. It still demands direct administration. The choice is now submission or resistance.', [
        O(key, 'accept', 'Submit to direct administration', [S('flag', 'Transfer the realm')], 'Accept annexation of an uncontested realm.', ctx => I(ctx, key).canAbsorb),
        O(key, 'resist', 'Resist', [S('swords', 'War')], 'Declare a legal resistance war.', ctx => I(ctx, key).canResist),
      ], { minYear: year, maxYear: year + 6, sources, historical: history,
        trigger: ctx => { const i = I(ctx, key); return i.record?.status === 'ultimatum' && (i.canAbsorb || i.canResist); } }),
  ];
}
function observer(key, actor, year, sources) {
  const funded = (ctx, gold, manpower = 0) => {
    const tag = ctx.helpers.livingTag(ctx, actor), t = ctx.game.tags[tag];
    return !!(t?.alive && t.treasury >= gold && t.manpower >= manpower);
  };
  return C(`ev_${key}_response_${actor}`, 'The Buffer Kingdom’s Fate', actor, key, ['annexed', 'client', 'resisting'],
    'The empire and its neighbouring court have answered each other. We must decide what this means for our own roads, alliances and relations with the empire.', [
      O(key, 'recognize', 'Recognize the new arrangement', [S('scroll', '+15 imperial opinion')], 'Accept the outcome diplomatically. No payment or military commitment.', null, actor),
      O(key, 'road', 'Negotiate access and a road concession', [S('coins', '−60'), S('scroll', '10 years passage')], 'After annexation, transfer 60 talents to the empire for reciprocal passage and +15% trade for ten years. Requires peace.', ctx => R(ctx, key)?.status === 'annexed' && funded(ctx, 60)
        && !ctx.game.tags[ctx.helpers.livingTag(ctx, actor)].atWarWith.includes(I(ctx, key).empire), actor),
      O(key, 'support', 'Fund the surviving resistance', [S('coins', '−100'), S('spears', '−1,000')], 'Transfer resources to a resisting court. Imperial opinion falls by 50. Support does not automatically enrol us in its war.', ctx => R(ctx, key)?.status === 'resisting' && !!I(ctx, key).court && funded(ctx, 100, 1000), actor),
      O(key, 'shelter', 'Shelter the displaced court', [S('coins', '−50'), S('flag', 'Restoration claims')], 'After annexation, host the former court: gain claims on its former lands and one diplomatic seat for ten years. Imperial opinion falls by 40.', ctx => R(ctx, key)?.status === 'annexed' && funded(ctx, 50), actor),
    ], { minYear: year, maxYear: year + 10, sources,
      trigger: ctx => {
        const r = R(ctx, key), tag = ctx.helpers.livingTag(ctx, actor), i = I(ctx, key);
        return !!(r && ['annexed', 'client', 'resisting'].includes(r.status) && ctx.game.tags[tag]?.alive
          && ![i.court, i.empire].includes(tag) && !r.reactions.some(v => ctx.helpers.livingTag(ctx, v.tag) === tag));
      }, historical: 'The imperial episode is historical; these neighbouring diplomatic responses are playable alternatives.' });
}
const ARABIA_CHAIN = clientChain('arabia', 'ev66y_the_rock_becomes_a_province', 'NAB', 'ROM', 106, 'The Fate of Nabataea', arabia,
    'Rome annexed Nabataea in 106 CE. The nature and extent of military resistance are uncertain; the game permits a negotiated monarchy or an actual resistance war.');
export const ARABIA_ENTRY = ARABIA_CHAIN[0];
export const EVENTS_ARABIA106 = [
  ...ARABIA_CHAIN.slice(1),
  ...['JUD', 'AGR', 'ADI'].map(t => observer('arabia', t, 106, arabia)),
];
export const EVENTS_LAKHMID602 = [
  ...clientChain('lakhmid', 'ev602_the_crown_at_hira', 'LKH', 'SAS', 602, 'The Last Lakhmid King', lakhmid,
    'Khosrow II ended al-Nuʿman III’s rule and abolished the Lakhmid kingdom in 602. Retaining a replacement dynasty or successful resistance are alternative outcomes.'),
  observer('lakhmid', 'SAM', 602, lakhmid), observer('lakhmid', 'JUD', 602, lakhmid),
];

export const PEACE628_ENTRY = {
  id: 'ev_p_khosrow_falls', title: 'A Peace Made Between Empires', forTag: 'SAS', major: true, minYear: 628, maxYear: 630,
  trigger: ctx => I(ctx, 'peace628').exists, aiOption: 0, sources: peace,
  historical: 'Khosrow II was overthrown in 628; Kavad II sought peace. Persian withdrawal restored Roman territories. Continued war or a settlement preserving an independent local court are alternatives.',
  desc: 'After the fighting around Nineveh, the Persian court can depose Khosrow and seek peace under Kavad II, or continue the imperial war. A peace offer still needs the Roman court’s answer.',
  options: [
    O('peace628', 'offer', 'Depose Khosrow and seek peace', [S('laurel', 'Kavad II'), S('scales', '−1 stability')], 'Install Kavad II, lose 20 legitimacy and 1 stability, and send terms to the Roman court. No local court’s provinces are ceded by this offer.'),
    O('peace628', 'continue', 'Keep Khosrow and continue the war', [S('swords', 'Continue war')], 'The existing war continues. This branch does not impose the historical deposition or peace.'),
  ],
};
export const EVENTS_PEACE628 = [
  C('ev628_roman_terms', 'The Persian Peace Offer', 'BYZ', 'peace628', ['offered'],
    'Kavad II asks to end the imperial war. We can require restoration of Persian-held Roman territory, accept an armistice at the current ownership, or continue fighting. Land governed by an independent local court is a separate question.', [
      O('peace628', 'restore', 'Restore the Roman territories and end the war', [S('flag', 'Persian withdrawal'), S('dove', 'Peace')], 'Restore eligible Roman territories currently owned by Persia, then end the bilateral imperial war. Third-party land and third-party occupations are untouched.'),
      O('peace628', 'armistice', 'Accept an armistice without territorial restoration', [S('dove', 'Status quo peace')], 'End the bilateral imperial war and return occupations without additional ownership transfers.'),
      O('peace628', 'reject', 'Continue the campaign', [S('swords', 'Continue war')], 'Reject the offer. The historical peace is not forced.'),
    ], { minYear: 628, maxYear: 632, sources: peace, historical: 'Restoration accompanied the historical peace; an armistice preserving Persian acquisitions is an alternative.' }),
  C('ev628_the_local_court', 'Our Place in Their Peace', 'JUD', 'peace628', ['settled'],
    'The empires have settled their own war. The surviving local government must now seek recognition, accept Roman clientship, or refuse the imperial settlement. Persian sponsorship no longer supplies a secure answer.', [
      O('peace628', 'petition', 'Seek recognition and written guarantees', [S('coins', '−75'), S('scroll', 'Imperial answer required')], 'Pay a 75-talent embassy. The Roman court independently decides whether to recognize this state and guarantee it for ten years.', ctx => I(ctx, 'peace628').canRequest),
      O('peace628', 'submit', 'Accept protected local government', [S('laurel', 'Keep administration'), S('coins', '10% tribute')], 'End the Persian partnership and any bilateral Roman war. Become a Roman client with ten years of 10% tribute.', ctx => I(ctx, 'peace628').canSubmit),
      O('peace628', 'resist', 'Refuse imperial authority', [S('swords', 'Risk intervention')], 'Leave imperial partnerships and shared wars. Rome decides whether to enforce its settlement when treaties permit.'),
    ], { minYear: 628, maxYear: 634, trigger: ctx => R(ctx, 'peace628')?.local === 'pending' && I(ctx, 'peace628').localPending,
      sources: peace, historical: 'A surviving independent Jewish government here is a campaign alternative, not a claim about the historical treaty.' }),
  C('ev628_recognition', 'The Local Court’s Petition', 'BYZ', 'peace628', ['settled'],
    'A local government asks for recognition and a ten-year guarantee. We can settle the relationship by agreement, or refuse and leave it to answer the imperial demand again.', [
      O('peace628', 'recognize', 'Recognize the state and guarantee its independence', [S('scroll', 'Recognition'), S('shield', '10-year guarantee')], 'Exchange recognition, settle any bilateral war at status quo, and add an actual ten-year imperial guarantee.', ctx => I(ctx, 'peace628').localEligible),
      O('peace628', 'refuse', 'Refuse independent status', [S('laurel', 'Demand clientship')], 'The local court must accept clientship or resist.'),
    ], { minYear: 628, maxYear: 634, trigger: ctx => R(ctx, 'peace628')?.local === 'petition',
      aiOption: ctx => { const i = I(ctx, 'peace628'); return (ctx.game.tags[i.rome]?.opinion?.[i.actor] || 0) >= 40 && ctx.game.tags[i.actor]?.legitimacy >= 50 ? 0 : 1; },
      sources: peace, historical: 'Recognition with these guarantees is an alternative negotiated settlement.' }),
  C('ev628_petition_refused', 'The Empire Will Not Recognize Us', 'JUD', 'peace628', ['settled'],
    'The emperor has refused independent status. We can retain local government under his authority or reject the demand and face possible intervention.', [
      O('peace628', 'submit', 'Accept the client agreement', [S('coins', '10% tribute')], 'Become a Roman client at 10% tribute.', ctx => I(ctx, 'peace628').canSubmit),
      O('peace628', 'resist', 'Refuse the demand', [S('swords', 'Risk intervention')], 'Refuse clientship and leave the enforcement decision to Rome.'),
    ], { minYear: 628, maxYear: 634, trigger: ctx => R(ctx, 'peace628')?.local === 'refused' && I(ctx, 'peace628').localPending, sources: peace,
      historical: 'This decision follows the campaign’s alternative local petition.' }),
  C('ev628_enforcement', 'Enforce the Settlement?', 'BYZ', 'peace628', ['settled'],
    'The local government rejects imperial authority. We can enforce our demand by war or leave an independent state in place.', [
      O('peace628', 'enforce', 'Enforce the settlement', [S('swords', 'Declare war')], 'Declare a real war when truces, recognition and foreign-policy restrictions permit. No automatic conquest.'),
      O('peace628', 'leave', 'Leave the local government independent', [S('dove', 'No intervention')], 'Close the dispute without tribute or forced annexation.'),
    ], { minYear: 628, maxYear: 638, trigger: ctx => R(ctx, 'peace628')?.local === 'resisting' && ctx.helpers.canPoliticalIntervention(ctx, 'peace628'),
      sources: peace, historical: 'This enforcement question is an alternative consequence of refusing the settlement.' }),
];

export const REPARATIONS_ENTRY = {
  id: 'ev_ab_the_reparations', title: 'The Luxembourg Agreement', forTag: 'ISR', date: { y: 1952, m: 9 }, major: true,
  when: ctx => I(ctx, 'reparations').exists, aiOption: 2, sources: goods,
  historical: 'Israel and West Germany signed the agreement on 10 September 1952; it entered into force in March 1953. Deliveries included ships, industrial equipment and other goods. Project priorities and numerical costs are game abstractions.',
  desc: 'The proposed agreement would deliver industrial goods over twelve years. Its political opposition is real, and the deliveries are not cash in the treasury. Choose a priority for the programme, then seek the German government’s signature. Completed deliveries can be invested in provinces through Court → Objectives → Chapter strategy.',
  options: [
    O('reparations', 'shipping', 'Prioritize shipping and trade', [S('anchor', 'Ports and shipyards')], 'After Germany signs and the agreement enters into force: goods can fund shipyards and +1 production at selected coastal provinces. Each project costs 96 delivered goods.'),
    O('reparations', 'industry', 'Prioritize electricity and industry', [S('lamp', 'Industrial works')], 'Goods can fund markets and +1 production in selected uncontested provinces. Each project costs 96 delivered goods.'),
    O('reparations', 'housing', 'Prioritize housing and absorption', [S('structures', 'Housing and manpower')], 'Goods can fund +1 tax, +1 manpower development, and permanent −1 local unrest in selected provinces. Each project costs 96 delivered goods.'),
    O('reparations', 'decline', 'Reject the agreement', [S('laurel', '+12 legitimacy')], 'No goods or signature. +1 stability, Revisionists +25 approval and Coalition −10. Continued austerity reduces income by 8% for eight years.'),
  ],
};
export const EVENTS_REPARATIONS = [
  C('ev1952_german_signature', 'The Agreement with Israel', 'GER', 'reparations', ['offered'],
    'Israel has agreed to negotiate a programme of industrial deliveries. Signing commits our treasury to eight units of goods per funded, unobstructed delivery month for twelve years. The recipient invests those goods in its chosen programme.', [
      O('reparations', 'sign', 'Sign the Luxembourg Agreement', [S('coins', '8 per delivery month'), S('hourglass', '12 years')], 'Fund actual goods through the economy ledger. Deliveries begin after entry into force and pause without a safe port, under embargo, in a bilateral war or when unfunded.', ctx => I(ctx, 'reparations').canSign),
      O('reparations', 'reject', 'Do not sign', [S('scroll', 'No deliveries')], 'Reject the proposed agreement. No cost or goods are created.'),
    ], { minYear: 1952, maxYear: 1954, sources: goods,
      historical: 'The Federal Republic signed the agreement. Refusal is an alternative outcome; the simulated monthly budget is not a historical exchange rate.' }),
];
