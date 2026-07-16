// js/data/trade.js — trade routes (SPEC §20). DOM-free data + pure lookups.
// Ancient arteries of the Levant: each route pays its stops monthly. A stop
// under occupation or siege earns nothing; on a sea route a blockaded harbor
// earns nothing either. The chokepoint's holder draws a double share.

export const TRADE_ROUTES = [
  {
    id: 'incense', name: 'The Incense Road', color: [206, 158, 92], value: 12,
    stops: ['Petra', 'Oboda', 'Gaza'], chokepoint: 'Petra',
    blurb: 'Frankincense and myrrh out of Arabia, camel-borne to the sea.',
  },
  {
    id: 'kings_highway', name: "The King's Highway", color: [168, 112, 54], value: 9,
    stops: ['Bostra', 'Gerasa', 'Medaba', 'Petra'], chokepoint: 'Gerasa',
    blurb: 'The old spine of Transjordan, tolls at every crossing.',
  },
  {
    id: 'via_maris', name: 'The Via Maris', color: [122, 44, 122], value: 12,
    stops: ['Pelusium', 'Rhinocolura', 'Gaza', 'Ascalon', 'Joppa', 'Ptolemais', 'Tyre'], chokepoint: 'Gaza',
    blurb: 'The way of the sea: Egypt to Syria along the coast road.',
  },
  {
    id: 'grain_fleets', name: 'The Grain Fleets', color: [92, 130, 168], value: 12, sea: true,
    stops: ['Alexandria', 'Joppa', 'Tyre', 'Salamis', 'Antioch'], chokepoint: 'Alexandria',
    blurb: 'Alexandrian grain and glass on the summer winds.',
  },
  {
    id: 'silk_desert', name: 'The Desert Crossing', color: [196, 186, 140], value: 8,
    stops: ['Damascus', 'Palmyra'], chokepoint: 'Palmyra',
    blurb: 'Palmyrene caravans stitching Rome to Parthia.',
  },
  {
    id: 'gulf_road', name: 'The Gulf Road', color: [92, 152, 172], value: 10, sea: false,
    stops: ['Charax', 'Uruk', 'Babylon', 'Seleucia-Ctesiphon'], chokepoint: 'Charax',
    blurb: 'India\'s cargoes, unloaded at Charax and poled up the rivers.',
  },
  // v5.4: the west is on the map — the greatest sea lane of antiquity joins.
  {
    id: 'annona', name: 'The Annona', color: [222, 196, 110], value: 12, sea: true,
    stops: ['Alexandria', 'Syracusae', 'Roma'], chokepoint: 'Alexandria',
    blurb: 'The grain that feeds Rome: Egypt to Italy by way of Sicily.',
  },
];

// name -> [{route, isChokepoint}] for quick per-province lookups.
export function tradeIndex() {
  const idx = new Map();
  for (const r of TRADE_ROUTES) {
    for (const stop of r.stops) {
      if (!idx.has(stop)) idx.set(stop, []);
      idx.get(stop).push({ route: r, isChokepoint: r.chokepoint === stop });
    }
  }
  return idx;
}
