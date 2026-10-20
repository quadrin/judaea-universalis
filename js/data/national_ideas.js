// National paths unlock actions. Existing reforms and era ideas remain valid.
export const NATIONAL_IDEAS = {
  maritime: { name: 'Maritime Leagues', icon: 'ship', point: 'infl',
    desc: 'Build a network of foreign ports, protect its privileges and assemble a league fleet.',
    tiers: [
      { name: 'Overseas Factors', icon: 'amphora', desc: 'Negotiate up to four foreign warehouses. Pay the host rent; collect trade at their markets. Blockades suspend the privilege.' },
      { name: 'Harbor Concessions', icon: 'anchor', desc: 'Upgrade warehouses into supply bases. Friendly concession ports can supply expeditions by sea; hostility, occupation or blockade closes them.' },
      { name: 'The Maritime League', icon: 'ship', desc: 'Invite smaller port courts into a league, commission their ships and contest disloyal rival concessions. Members can withdraw.' },
    ] },
  dynasty: { name: 'Dynastic Ambition', icon: 'laurel', point: 'infl',
    desc: 'Shelter a claimant, negotiate an inheritance or fight to install a dependent crown.',
    tiers: [
      { name: 'A Court in Exile', icon: 'laurel', desc: 'Shelter up to two named claimants to reachable hereditary courts. Their households require monthly funding.' },
      { name: 'Succession Compacts', icon: 'scroll', desc: 'A friendly heirless crown may accept your claimant as heir. The agreement ends if its terms are broken; accession opens a protection offer.' },
      { name: 'The War for the Crown', icon: 'swords', desc: 'Press a claimant’s cause in a succession war. An accepted client settlement installs the claimant. A restored ruler can grow strong enough to defy you.' },
    ] },
  colonies: { name: 'Military Colonies', icon: 'helmet', point: 'mar',
    desc: 'Settle soldiers, build local reserves and decide how much power their commanders should keep.',
    tiers: [
      { name: 'Veterans on the Land', icon: 'grain', desc: 'Fund a six-month settlement using 1,000 manpower. Each colony accumulates local recruits, but reserves 40% autonomy.' },
      { name: 'Military Districts', icon: 'helmet', desc: 'Give a colony a named commander and larger reserves. Districts cost upkeep; unpaid or alienated commanders can mutiny.' },
      { name: 'The Common Command', icon: 'swords', desc: 'Mobilize a district under its own general, or negotiate its return to central administration. Integrating an unwilling commander risks a rising.' },
    ] },
  subversion: { name: 'Subversion', icon: 'dagger', point: 'infl',
    desc: 'Develop contacts inside rival provinces and choose when to risk exposing them.',
    tiers: [
      { name: 'Local Contacts', icon: 'quill', desc: 'Maintain up to three provincial networks. Strength grows with funding; counterintelligence and unpaid agents increase exposure.' },
      { name: 'A Party in the Streets', icon: 'flame', desc: 'Prepare a six-month rising where unrest or a weak throne makes rebellion possible. The target can uncover and purge the operation.' },
      { name: 'The Keys to the City', icon: 'tower', desc: 'Buy collaboration during a siege, or negotiate a disaffected frontier governor’s defection during war. Both require developed networks and preparation.' },
    ] },
  federation: { name: 'Federated Rule', icon: 'scales', point: 'gov',
    desc: 'Charter self-governing cities, negotiate common service and decide whether to centralize.',
    tiers: [
      { name: 'City Charters', icon: 'bricks', desc: 'Grant non-capital cities fiscal, levy or naval charters. Their councils retain autonomy and save money or recruits for agreed contributions.' },
      { name: 'The Federal Council', icon: 'scales', desc: 'Two loyal chartered cities can pool their reserves for a common army. Cities with low loyalty refuse to contribute.' },
      { name: 'One Commonwealth', icon: 'scroll', desc: 'Begin twelve-month negotiations to integrate a chartered city. Fund its supporters or renew its privileges if opposition threatens rebellion.' },
    ] },
};

export const nationalIdeaCost = owned => [60, 100, 150][owned] || 0;
export const nationalIdeaLevel = (tag, key) => Math.max(0, Math.min(3, tag?.nationalIdeas?.[key] | 0));
export function nationalIdeaSlots(tag, bookmark) {
  return (tag?.tech?.gov || 0) >= (bookmark?.techBase || 0) + 3 ? 3 : 2;
}

// Costs are paid only after live validation; the same definitions drive the UI.
export const NATIONAL_ACTIONS = {
  warehouse: { group: 'maritime', tier: 1, name: 'Foreign warehouse', icon: 'amphora', target: 'foreign_port', cost: { gold: 80, infl: 25 }, desc: 'Rent a warehouse: 12 trade power and collection rights in this market, for 2 talents a month paid to its host. Requires a home port and host opinion of at least 0.' },
  harbor: { group: 'maritime', tier: 2, name: 'Harbor concession', icon: 'anchor', target: 'warehouse', cost: { gold: 100, infl: 40 }, desc: 'Upgrade to 24 trade power and a sea supply base. Rent rises to 3 talents a month; the host must have at least 25 opinion.' },
  league: { group: 'maritime', tier: 3, name: 'Invite port court', icon: 'ship', target: 'warehouse', cost: { gold: 100, infl: 50 }, desc: 'Invite an independent port court no larger than your realm. Requires a harbor concession and 60 opinion. League loyalty falls during blockades or diplomatic hostility.' },
  league_ships: { group: 'maritime', tier: 3, name: 'Commission league ships', icon: 'ship', target: 'warehouse', cost: { gold: 60, infl: 20 }, desc: 'The member contributes 60 talents and 500 manpower; a two-ship league fleet is fitted out over six months. Requires 60 loyalty. Once every two years per port.' },
  contest_port: { group: 'maritime', tier: 3, name: 'Contest a concession', icon: 'dove', target: 'rival_port', cost: { gold: 120, infl: 60 }, desc: 'Replace a rival league’s concession when its loyalty falls below 50 and the host prefers you by at least 30 opinion. Requires 60 host opinion and a free warehouse slot.' },
  close_warehouse: { group: 'maritime', tier: 1, name: 'Relinquish concession', icon: 'xmark', target: 'warehouse', cost: {}, desc: 'End rent and all trading, supply and league rights at this port.' },
  claimant: { group: 'dynasty', tier: 1, name: 'Shelter a claimant', icon: 'laurel', target: 'crown', cost: { gold: 100, infl: 35 }, desc: 'Maintain a named candidate at 2 talents a month. Only reachable independent hereditary courts in an age with client kingdoms qualify. At most two candidates.' },
  compact: { group: 'dynasty', tier: 2, name: 'Succession compact', icon: 'scroll', target: 'claimant', cost: { gold: 80, infl: 50 }, desc: 'An heirless crown with 100 opinion accepts the candidate as heir for ten years. The target must be smaller than your realm. Accession makes the candidate eligible for a protection offer.' },
  press_claim: { group: 'dynasty', tier: 3, name: 'Press the claim', icon: 'swords', target: 'claimant', cost: { gold: 150, infl: 60 }, desc: 'Declare a succession war for this claimant. Truces, recognition, alliances and existing foreign-policy restrictions still apply.' },
  install_claimant: { group: 'dynasty', tier: 3, name: 'Install claimant', icon: 'laurel', target: 'claimant', cost: {}, desc: 'Conclude the claimant’s war with an accepted client-kingdom settlement and seat your candidate. The normal peace acceptance and warscore rules apply.' },
  protect_heir: { group: 'dynasty', tier: 2, name: 'Offer royal protection', icon: 'shield', target: 'claimant', cost: {}, desc: 'After peaceful accession, offer the new ruler clientship through the normal diplomatic acceptance rules and influence price.' },
  dismiss_claimant: { group: 'dynasty', tier: 1, name: 'Dismiss claimant', icon: 'xmark', target: 'claimant', cost: {}, desc: 'Stop paying the household. Withdraw a pending succession compact; a claimant already crowned keeps their throne.' },
  colony: { group: 'colonies', tier: 1, name: 'Veteran settlement', icon: 'grain', target: 'own_province', cost: { gold: 100, manpower: 1000, mar: 25 }, desc: 'Build a military colony over six months. It accumulates 100 local recruits monthly, up to 2,000, and reserves 40% autonomy. At most four colonies.' },
  colony_muster: { group: 'colonies', tier: 1, name: 'Call local recruits', icon: 'spears', target: 'colony', cost: {}, desc: 'Spend 1,000 stored recruits on an infantry regiment through the province’s recruitment queue. Ordinary recruitment time still applies.' },
  district: { group: 'colonies', tier: 2, name: 'Military district', icon: 'helmet', target: 'colony', cost: { gold: 80, mar: 40 }, desc: 'Appoint a named commander; reserves grow by 200 monthly to 4,000. The district costs 2 talents a month and depends on its commander’s loyalty.' },
  district_army: { group: 'colonies', tier: 3, name: 'Commission field command', icon: 'swords', target: 'colony', cost: { gold: 40, mar: 30 }, desc: 'Spend 2,000 stored recruits to raise a two-regiment host led by the district commander. That commander leaves the district for the field. Once every two years.' },
  integrate_district: { group: 'colonies', tier: 3, name: 'Integrate district', icon: 'scroll', target: 'colony', cost: { gold: 80, gov: 50 }, desc: 'A district with at least 70 loyalty accepts central administration: the colony closes, stored recruits join the manpower pool, and autonomy falls to 15%.' },
  support_colony: { group: 'colonies', tier: 1, name: 'Fund local supporters', icon: 'coins', target: 'colony', cost: { gold: 40, infl: 20 }, desc: 'Restore 20 loyalty. Once every six months at this colony.' },
  contact: { group: 'subversion', tier: 1, name: 'Recruit contacts', icon: 'quill', target: 'foreign_province', cost: { gold: 60, infl: 25 }, desc: 'Build a provincial network for 2 talents monthly. Strength grows by five monthly, or three under a stable government. At most three networks. Human-controlled courts can only be targeted during war.' },
  rising: { group: 'subversion', tier: 2, name: 'Prepare a rising', icon: 'flame', target: 'network', cost: { gold: 100, infl: 40 }, desc: 'Requires 40 network strength and either 2 unrest or less than 50 legitimacy. After six months, local rebels rise if the conditions still hold. Preparation increases exposure.' },
  gates: { group: 'subversion', tier: 3, name: 'Buy the city’s keys', icon: 'tower', target: 'network', cost: { gold: 120, infl: 50 }, desc: 'Requires 70 network strength and your side actively besieging this enemy province. After three months, collaborators remove 75% of its garrison and add 25 siege progress.' },
  governor: { group: 'subversion', tier: 3, name: 'Negotiate governor defection', icon: 'dove', target: 'network', cost: { gold: 200, infl: 75 }, desc: 'Prepare six months of negotiations with a governor during war. Requires 80 network strength, a non-capital province on your border, 40% autonomy, unrest or a weak throne, at most 15 development and a level-one fort or less. Success transfers the province and adds aggression; a purge or improved local conditions can stop it.' },
  counterspy: { group: 'subversion', tier: 1, name: 'Counterintelligence', icon: 'shield', target: 'none', cost: { gold: 40, gov: 25 }, desc: 'For twelve months, hostile networks develop more slowly and accumulate exposure. A target court can also fund purges when it detects a network.' },
  recall_contact: { group: 'subversion', tier: 1, name: 'Recall contacts', icon: 'xmark', target: 'network', cost: {}, desc: 'Close the network and abandon its pending operation.' },
  charter: { group: 'federation', tier: 1, name: 'Grant city charter', icon: 'bricks', target: 'own_province', cost: { gold: 60, gov: 30 }, desc: 'Choose fiscal, levy or naval service. The city keeps at least 45% autonomy and retains a share of production, saving funds or recruits for contributions. At most five cities.' },
  city_service: { group: 'federation', tier: 1, name: 'Request city service', icon: 'amphora', target: 'city', cost: { infl: 10 }, desc: 'A loyal city pays up to 40 saved talents, supplies 1,000 stored recruits, or builds a warship from 60 saved talents and 500 recruits. Naval service needs a shipyard.' },
  council_muster: { group: 'federation', tier: 2, name: 'Federal muster', icon: 'spears', target: 'city', cost: { gold: 30, infl: 30 }, desc: 'At least two cities with 60 loyalty pool up to 4,000 stored recruits into a common host at the selected city. Each contributor loses five loyalty and retains the right to refuse later calls.' },
  centralize_city: { group: 'federation', tier: 3, name: 'Integrate city charter', icon: 'scroll', target: 'city', cost: { gold: 120, gov: 75 }, desc: 'With at least two chartered cities and 70 local loyalty, begin twelve-month integration. Loyalty falls by 25 immediately and two each month; low loyalty can cause rebellion.' },
  support_city: { group: 'federation', tier: 1, name: 'Negotiate council support', icon: 'dove', target: 'city', cost: { gold: 40, infl: 20 }, desc: 'Restore 20 loyalty. Once every six months per city.' },
  renew_charter: { group: 'federation', tier: 3, name: 'Renew city privileges', icon: 'scales', target: 'city', cost: { infl: 20 }, desc: 'Abandon integration and restore 20 loyalty. The charter’s autonomy and service obligations continue.' },
};
