import group0 from './generated_court_assets_00.js';
import group1 from './generated_court_assets_01.js';
import group2 from './generated_court_assets_02.js';
import group3 from './generated_court_assets_03.js';
import group4 from './generated_court_assets_04.js';
import group5 from './generated_court_assets_05.js';
import group6 from './generated_court_assets_06.js';
import group7 from './generated_court_assets_07.js';
import group8 from './generated_court_assets_08.js';
import group9 from './generated_court_assets_09.js';
import group10 from './generated_court_assets_10.js';
import group11 from './generated_court_assets_11.js';
import group12 from './generated_court_assets_12.js';
import group13 from './generated_court_assets_13.js';
const images = {...group0,...group1,...group2,...group3,...group4,...group5,...group6,...group7,...group8,...group9,...group10,...group11,...group12,...group13};
export const GENERATED_COURT_ASSETS = Object.freeze({"ADI":"adiabene-tiara","AED":"aeduan-torc","AES":"amber-necklace","AMM":"ammonite-citadel","AMO":"ammonite-citadel","AQT":"oak-sprigs","ARM":"artaxiad-tiara","ARO":"armorican-ship","ASR":"assyria-ashur","ASY":"assyria-ashur","ATH":"athenian-owl","AVA":"horsetail-standard","AVN":"gaulish-boar","AXM":"aksum-stela","BAL":"seleucid-anchor","BGD":"lawbook","BIT":"bithynian-galley","BLG":"belgic-javelins","BLM":"crossed-javelins","BOI":"boian-bull","BOS":"trident","BRT":"la-tene-roundel","CAL":"pictish-crescent","CAP":"cappadocian-rock","CAR":"tanit","CHA":"shield-spade","CHE":"broken-standards","CHO":"oasis-gate","CHX":"characene-ship","CIL":"cilician-gate","CIM":"cimbrian-bull","CMG":"nemrut-reliefs","COR":"pegasus","CRC":"pomegranate","CTB":"celtiberian-caetra","CYP":"oxhide-ingot","CYR":"silphium","CYZ":"seleucid-anchor","DAC":"dacian-draco","DEC":"classical-temple","DLM":"hillfort","DMS":"damascus-thunderbolt","DMT":"seleucid-anchor","DRD":"dardanian-watchtower","EDM":"atlas-rock","EME":"emesa-baetyl","ETR":"etruscan-mask","FRK":"francisca","FRS":"terp","GAL":"galilean-zodiac","GBA":"bactrian-elephant","GEP":"gepid-eagle-fibula","GLT":"galatian-torc","GOT":"ringed-spear","GRM":"desert-chariot","HDR":"incense-burner","HEL":"greek-torch","HMT":"hamath-winged-sun","HMY":"himyarite-eagle","IBE":"falcata","IDU":"atlas-rock","ION":"classical-temple","ISL":"israel-horned-altar","ITU":"ituraean-quiver","KSH":"meroitic-pyramids","LKH":"lakhmid-palace","LMB":"lombard-crown","LST":"falcata","LUK":"fallen-column","LUS":"lusitanian-caetra","LYD":"lydian-lion-bull","MAS":"hellenistic-galley","MAU":"atlas-rock","MDA":"medean-sword","MED":"medean-sword","MIL":"milesian-lion","MIZ":"egyptian-double-crown","MOA":"moabite-stele","MOB":"moabite-stele","NAB":"petra","NOB":"nobian-double-bows","NOR":"anvil-sword","NUM":"numidian-horse","OMA":"omani-dhow","OST":"eagle-buckle","PAR":"parthian-archer","PAS":"faravahar","PHL":"philistine-headdress","PHR":"phrygian-cap","PIR":"pirate-ship","PLM":"palmyrene-sun","PLS":"philistine-headdress","PRG":"cista-mystica","PRS":"persian-fire-altar","QDR":"qedar-bow","REB":"greek-torch","RHO":"rhodian-rose","SAB":"bull-head","SAK":"steppe-cap","SAS":"sasanian-altar","SAX":"crossed-seaxes","SCN":"suiones-boat","SCO":"thureos","SCY":"bow-quiver","SEL":"seleucid-anchor","SEQ":"carnyx","SLV":"slavic-axe","SMN":"samnite-spears","SRD":"nuraghe","SUE":"suebian-head","SYC":"arethusa","TAB":"grain-grapes","TAR":"tarentine-dolphin","THR":"thracian-pelta","TRK":"wolf-standard","TRT":"tartessian-ship","TYR":"tyrian-murex","URA":"urartian-tree","USR":"roman-standard","USV":"roman-standard","VAN":"vandal-ship","VEN":"pine-trees","VIS":"votive-crown"});

export function enrichGeneratedCourtStandards(flags) {
  for (const [tag, id] of Object.entries(GENERATED_COURT_ASSETS)) {
    const original = flags[tag];
    if (!original || !images[id]) throw new Error('Missing court image: ' + tag);
    const originalMotifNote = original.note || '';
    const displayNote = tag === 'QDR' ? 'A strung composite bow with a wrapped grip and a single arrow, referring to Qedar’s archery traditions. An original court composition.'
      : tag === 'OST' ? 'An eagle-shaped metal fitting with garnet-style inlays and pearl pendants, adapted from Migration-period jewellery. The composition uses the established eagle association rather than copying the cited buckle.'
      : originalMotifNote.replace(/ The engraved game composition now retains[^.]*\./g, '');
    flags[tag] = {...original, viewBox:'0 0 192 192', detailed:true, imageAsset:id,
      originalMotifNote, note:displayNote,
      body:`<rect width="192" height="192" fill="${original.fieldColor}"/><g data-emblem="${original.emblem}" data-generated-art="${id}"><image x="7" y="7" width="178" height="178" preserveAspectRatio="xMidYMid meet" href="${images[id]}"/></g>`};
  }
}
