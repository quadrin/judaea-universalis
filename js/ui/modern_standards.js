// Court portraits are separate from flags. A saved flag key selects its
// matching regime portrait; ancient Greece and Oman keep their own masters.
import {G,I,B,D,S,p,l,c,r,g,rep,mirror,ring,star,branch,crown,shield,eagle,lion,weapon} from './armorial_masters.js';
import { REFERENCE_MASTERS } from './reference_masters.js';
import { referenceAnimal } from './armorial_masters.js';
import { NATIONAL_DEVICES as N } from './national_devices.js';
const red='#ad293d',blue='#173e78',green='#17604b',black='#25282c';
const wreath=(type='olive',ink=G)=>g(branch(type,ink),'translate(7 16) scale(.92)')+g(branch(type,ink),'translate(185 16) scale(-.92 .92)');
const crescent=(x=96,y=83,rad=48,ink=I)=>p(`M${x+rad*.3} ${y-rad}A${rad} ${rad} 0 1 0 ${x+rad*.7} ${y+rad*.85}A${rad*1.04} ${rad*1.04} 0 0 1 ${x+rad*.3} ${y-rad}Z`,ink);
const royal=(s,field=blue)=>g(crown(),'translate(38 -1) scale(.6)')+shield(s,field);
const smallLion=(ink=G,opts={})=>g(lion(ink,D,opts),'translate(47 47) scale(.5)');
const cross=(ink=I)=>p('M88 67H104V94H131V110H104V137H88V110H61V94H88Z',ink);
const wheat=()=>g(branch('olive',G),'translate(10 11) scale(.9)')+g(branch('olive',G),'translate(182 11) scale(-.9 .9)');
const redStar=(x,y,rad)=>star(x,y,5,rad,rad*.44,red).replace('<path','<path stroke="'+G+'" stroke-width="1.4"');
function harp() {
  return p('M55 42Q94 20 144 51L134 70 118 76 100 156 83 172 69 165 73 151 79 70 65 61 54 67 48 53Z',G)
    +p('M79 67 124 73 105 141 91 154 83 154Z',blue)
    +rep(9,i=>l(`M${79+i*5} ${65+i*.6}  ${80+i*1.7} ${151-i*1.8}`,I,1.1))
    +l('M59 46Q96 31 136 53M62 54Q95 43 127 60M76 72 73 151M91 161 107 151',B,1.3)
    +p('M68 57C62 66 64 79 76 89L80 76 76 64Z',I);
}
function swordsAndKhanjar() {
  const swords=g(weapon('sabre'),'translate(4 12) rotate(-44 96 96)')+g(weapon('sabre'),'translate(188 12) scale(-1 1) rotate(-44 96 96)');
  return swords+p('M90 60H102L105 91 116 103 113 126Q108 149 90 167L77 165 82 151 92 126 88 104 85 96Z',I)
    +p('M82 91Q96 86 110 91L114 101H78Z',G)+p('M85 42 96 35 107 42 102 60H90Z',I)
    +l('M95 64V88M88 97H105M97 111Q107 131 86 156M90 116 96 122M88 142 96 147',B,1.3)
    +rep(4,i=>c(95,69+i*5,1.7,G));
}
function greatEagle() {
  const stripes=rep(7,i=>r(63+i*10,94,5,53,i%2?I:red));
  return g(eagle({ink:B,cut:D}),'translate(1 6) scale(.99)')
    +p('M65 84H127V119Q126 143 96 156Q66 143 65 119Z',I)
    +p('M69 102H123V120Q122 140 96 151Q70 140 69 120Z',red)
    +rep(6,i=>r(73+i*8,102,4,23,I))+p('M73 125H77V134L73 130ZM81 125H85V141L81 138ZM89 125H93V147L89 145ZM97 125H101V146L97 148ZM105 125H109V140L105 143ZM113 125H117V130L113 135Z',I)
    +r(69,86,54,16,blue)+g(branch('olive',G),'translate(13 91) scale(.37)')
    +rep(13,i=>g(l('M133 135 155 153',I,1)+p('M129 132 136 133 132 138Z',I),`rotate(${(i-6)*3} 134 135)`))
    +rep(13,i=>{const row=i<3?0:i<8?1:2,j=i<3?i:i<8?i-3:i-8,n=row===0?3:5;return star(96+(j-(n-1)/2)*11,19+row*10,5,3.5,1.5,I);})
    +p('M54 51Q96 37 138 51L133 59Q96 47 59 59Z',I)+l('M64 52Q96 43 128 52',B,.7);
}
function lionSun() {
  return rep(24,i=>g(p('M94 61 96 28 98 61Z',G),`rotate(${i*15} 96 92)`))+c(96,92,32,G)
    +l('M84 86Q89 80 93 86M100 86Q106 80 111 86M96 90V99M89 106Q97 112 105 106',D,1)
    +g(referenceAnimal('passant',G,D),'translate(7 31) scale(.9)')+g(weapon('sword'),'translate(12 14) scale(.35 .68)');
}
function cog() {return rep(18,i=>g(p('M89 20H103L106 40H86Z',B),`rotate(${i*20} 96 96)`))+ring(96,96,60,B,12)+ring(96,96,46,I,3);}
function fascio() {
  return rep(7,i=>r(77+i*6,42,4,118,G))+l('M72 65H122M72 77H122M72 128H122M72 140H122',B,4)
    +p('M116 56Q144 45 156 63L149 85Q134 83 116 89Z',I)+l('M124 64Q143 56 151 67M79 46V156',B,1)
    +p('M83 18H109L104 36H88Z',G)+p('M96 6 103 18H89Z',I);
}
function royalCrescent() {
  return g(crown(),'translate(41 -2) scale(.57)')+wreath()+crescent(87,105,46,G)
    +[[-6,-28],[21,0],[-6,28]].map(([x,y])=>star(106+x,105+y,5,8,3.5,G)).join('');
}
function falcon(stars=2,ink=G) {
  return eagle({ink,cut:D})+shield(p('M77 81H115V123Q115 142 96 152Q77 142 77 123Z',I)
    +rep(stars,i=>star(96+(i-(stars-1)/2)*12,108,5,4,1.7,green)),red).replace(/^/,'<g transform="translate(53 53) scale(.45)">')+'</g>';
}
function mosque() {
  return wheat()+p('M57 151V84H135V151Z',I)+p('M68 84Q70 53 96 49Q122 53 124 84Z',G)
    +p('M80 151V111Q96 87 112 111V151Z',green)+l('M74 89H118M70 158H122M80 167H112M96 39V50M91 42H101',B,1.2)
    +[48,137].map(x=>p(`M${x} 153V61L${x+7} 45 ${x+14} 61V153Z`,I)+l(`M${x+3} 70h8m-8 9h8m-8 9h8`,B,1)).join('')
    +[42,151].map(x=>l(`M${x} 65V113`,G,2)+p(`M${x} 66h15l-4 12 4 12H${x}Z`,G)).join('');
}
function soviet() {
  return wheat()+c(96,96,44,blue)+ring(96,96,44,G,2)+l('M52 96H140M59 77H133M59 115H133M96 52C67 70 67 122 96 140C125 122 125 70 96 52Z',G,1)
    +p('M72 67 86 56 106 76 98 85 89 76 66 107 58 100 81 68Z',G)
    +p('M118 62C150 96 124 139 91 132L67 151 59 142 82 124C113 135 135 97 118 62Z',G)
    +redStar(96,20,13)+l('M43 143 69 155M36 119 58 130M35 91 54 102M149 143 123 155M156 119 134 130M157 91 138 102',red,7);
}
function yugoslav() {
  return wheat()+rep(5,i=>r(72+i*10,104,7,48,G))
    +rep(5,i=>p(`M${75+i*10} 81q-11 12-5 24q6 7 12 0q7-12-7-24Z`,red))
    +p('M67 154Q96 167 125 154L130 166Q96 182 62 166Z',blue)+redStar(96,29,16)
    +l('M77 111V149M87 111V149M97 111V149M107 111V149M117 111V149',I,.8);
}
function romanian() {
  return wheat()+c(96,90,45,blue)+p('M52 111 77 73 91 92 114 64 141 111Z',I)
    +p('M66 134 78 95 90 134ZM113 137 122 98 134 137Z',green)
    +p('M88 139 96 92 104 139H99L96 113 93 139Z',B)+l('M85 117H107M84 126H109M80 139H112',D,1)
    +c(106,60,12,G)+p('M64 153Q96 164 128 153L132 165Q96 181 60 165Z',red);
}
function landscapeLiberia() {
  return shield(p('M53 55H139V104Q139 142 96 165Q53 142 53 104Z',I)
    +c(110,76,18,G)+rep(10,i=>g(l('M110 54V49',G,1.2),`rotate(${i*36} 110 76)`))
    +p('M56 116Q96 98 136 116V126Q96 111 56 127Z',blue)
    +p('M68 109H121L113 120H78Z',B)+l('M96 77V109',D,1.8)+p('M93 79 72 103H93ZM99 83 117 103H99Z',I)
    +l('M68 93V121',B,3)+p('M68 93Q48 81 48 96Q57 88 68 96Q79 84 85 96Q83 80 68 93Z',green),blue)
    +p('M83 28Q96 14 109 28L126 22 116 35 96 41 76 35 66 22Z',I)+l('M70 174H122',G,2);
}
function armAndRifle() {
  return ring(123,130,29,green,2)+l('M95 130H151M123 101C109 116 109 144 123 159C137 144 137 116 123 101M101 115H145M101 145H145',green,1)
    +p('M53 159V115L72 94 78 67 73 54 77 46 84 46 88 58 88 89 78 114 78 159Z',green)
    +p('M72 47 66 39 67 30 73 28 77 37 80 23 87 24 89 37 94 25 100 29 96 46 88 58 79 55Z',green)
    +p('M75 29 68 22 111 12 145 12V19H124L109 26 109 32 102 33 100 24 84 30 88 38 81 42Z',green)
    +l('M62 118V153M78 97 72 107M78 35 85 43M82 27 89 34M91 31 95 37',I,1)
    +p('M36 171V104H45V163H94V171ZM104 171V163H151V104H160V171Z',green);
}
const make=(field,emblem,motif,note,source=null)=>({viewBox:'0 0 192 192',flatBanner:true,fieldColor:field,detailed:true,emblem,note,source,
  body:r(0,0,192,192,field)+`<g data-emblem="${emblem}">${motif}</g>`});
const original=(subject)=>`An original game court portrait using ${subject}. The composition is an adaptation, not a facsimile of a dated official seal; the separate national flag retains its established game design.`;
const deviceSource=code=>['flag-icons vector contours (MIT)',`https://github.com/lipis/flag-icons/blob/main/flags/1x1/${code}.svg`];

export const MODERN_COURT_ART = {
  USA:make(blue,'american-eagle',REFERENCE_MASTERS.usa,'The Great Seal eagle with its thirteen-striped shield, constellation, olive branch, arrows and outlined motto. The outer seal disc is omitted; the complete device contours remain.'),
  SAU:make('#165d31','saudi-calligraphy',N.sa,'Outlined Saudi inscription and sword contours, preserving the source lettering and counters rather than substituting decorative strokes.',deviceSource('sa')),
  ALB:make(red,'albanian-double-eagle',N.al,'The complete double-headed Albanian eagle, with its feathered wings, open beaks, claws and curled tail contours.',deviceSource('al')),
  POR:make(green,'portuguese-armillary-arms',N.pt,'The Portuguese shield and armillary sphere, retaining the small shields, bezants, castles and interlaced armillary bands.',deviceSource('pt')),
  LEB:make(I,'lebanese-cedar',N.lb,'A reference-traced cedar with irregular branching, roots and interior spaces, replacing the stacked-triangle tree.',deviceSource('lb')),
  IRN:make(green,'iranian-lion-sun',lionSun(),original('the royal lion, sword and radiant sun rather than an isolated sun disc')),
  IRN_IR:make(I,'iranian-republic-emblem',N.ir,'The complete outlined Iranian republican device, fitted as a separate regime-specific court portrait.',deviceSource('ir')),
  EGY:make(green,'egyptian-royal-crescent',royalCrescent(),original('a royal crown above a crescent and three stars')),
  EGY_REP:make(red,'egyptian-republic-eagle',N.eg,'A separate republican eagle portrait adapted from the full feathered vector device. This game adaptation does not claim that every detail reproduces the first republican arms.',deviceSource('eg')),
  SYR:make(green,'syrian-republic-falcon',falcon(3),original('a falcon and three-star shield')),
  SAR:make(red,'syrian-arab-falcon',falcon(3,S),original('a silver falcon and three-star shield for the Syrian Arab Republic')),
  UAR:make(black,'united-arab-eagle',falcon(2),original('a two-star shield on an eagle for the United Arab Republic')),
  SYR_BAATH:make(red,'syrian-baath-falcon',falcon(3,I),original('a three-star republican falcon, distinct from the preceding governments')),
  SYR_FAR:make(blue,'syrian-federation-falcon',falcon(1),original('a single-star falcon for the game\'s federation variant')),
  IRQ:make(black,'iraqi-royal-star',royal(star(96,107,8,35,21,I),red),original('the royal crown and a large eight-pointed star on a shield')),
  IRQ_REP:make(I,'iraqi-republic-sun',star(96,96,8,75,43,red)+c(96,96,30,G)+ring(96,96,25,B,2),original('the eight-pointed republican star and solar disc')),
  IRQ_BAATH:make(black,'iraqi-baath-eagle',falcon(3),original('a three-star shield and republican eagle')),
  UK:make(blue,'british-crowned-lion',g(crown(),'translate(41 -2) scale(.58)')+g(lion(),'translate(8 31) scale(.87)'),original('a crowned heraldic lion, retaining its articulated paws and mane')),
  FRA:make(blue,'french-fasces',wreath('oak')+g(fascio(),'translate(13 3) scale(.86)'),original('the republican fasces with oak and olive branches')),
  ITA:make('#345448','italian-star-cog',cog()+wreath()+star(96,90,5,44,20,I)+l('M96 47 105 76 135 76 111 94 120 124 96 105 72 124 81 94 57 76 87 76Z',red,2),original('a white star, cogwheel and agricultural branches for republican Italy')),
  SPA:make(I,'spanish-eagle-quartering',g(eagle({ink:black,cut:B}),'translate(0 0)')+shield(p('M65 70H96V112H65ZM96 112H127V145H96Z',red)
    +p('M96 70H127V112H96ZM65 112H96V145H65Z',I)
    +[[-15,-17],[15,20]].map(([x,y])=>g(p('M85 86V70H90V75H94V67H99V75H103V70H108V86ZM88 87H105V101H88Z',G)+p('M94 101V93H99V101Z',D),`translate(${x} ${y}) scale(.92)`)).join('')
    +g(lion(red,D),'translate(86 56) scale(.22)')+g(lion(red,D),'translate(55 98) scale(.22)'),red),
    'An original Spanish court composition: a dark eagle carrying quartered castle-and-lion imagery. It avoids presenting the present constitutional royal arms as the official seal of occupied-era Europe.'),
  NLD:make(blue,'dutch-crowned-lion',royal(smallLion(G,{sword:true}),blue),original('a crowned gold lion, sword and blue shield')),
  DEN:make(red,'danish-three-lions',royal(rep(3,i=>g(lion(blue,D),'translate(63 '+(57+i*30)+') scale(.27 .18)'))+rep(9,i=>p(`M${67+i%3*27} ${80+Math.floor(i/3)*30}q-4-6-6-1q-1 4 6 8q7-4 6-8q-2-5-6 1Z`,red)),G),original('three blue lions and red hearts on a crowned gold shield')),
  SWE:make(blue,'swedish-three-crowns',shield([[-25,-15],[25,-15],[0,35]].map(([x,y])=>g(crown(),'translate('+(65+x)+' '+(75+y)+') scale(.32)')).join(''),blue)+g(crown(),'translate(42 -1) scale(.56)'),original('three gold crowns on blue with a royal crown above')),
  POL:make(red,'polish-white-eagle',eagle({ink:I,cut:B}),original('an uncrowned white eagle for the postwar court')),
  CZE:make(red,'czechoslovak-lion',lion(I,D,{twoTails:true})+g(shield(cross(I),blue),'translate(62 69) scale(.23)'),original('a two-tailed silver lion with a small cross-bearing shield')),
  SOV:make(red,'soviet-globe-wheat',soviet(),original('a globe, hammer and sickle, wheat and a red star; no fabricated motto lettering')),
  GER:make(I,'german-eagle-court',eagle({ink:black,cut:B}), 'A neutral German eagle game portrait. The occupied 1948 court has no newly invented unified-government seal; the existing occupation-era game flag remains separate.'),
  AUT:make(red,'austrian-eagle',eagle({ink:black,cut:B})+g(crown('mural'),'translate(67 28) scale(.3)')
    +g(shield(r(48,88,100,30,I),red),'translate(63 65) scale(.34)')+l('M52 147 65 158 70 151M140 147 127 158 122 151',S,3),original('a black eagle, mural crown, red-white-red shield and broken chain links')),
  HUN:make(green,'hungarian-kossuth-shield',shield(p('M49 62H96V147H49Z',red)+rep(4,i=>r(50,68+i*18,46,9,I))+p('M96 62H143V145H96Z',red)
    +p('M99 139Q108 118 116 133Q128 111 142 138V149H99Z',green)+p('M115 81H122V95H136V103H122V114H131V122H122V137H115V122H106V114H115V103H101V95H115Z',I),red),original('an uncrowned divided shield with bars, a double cross and hills')),
  YUG:make(red,'yugoslav-five-torches',yugoslav(),original('five torches beneath a red star, surrounded by grain for the postwar federation')),
  BUL:make(green,'bulgarian-lion-wheat',wheat()+g(lion(I,D),'translate(26 28) scale(.74)')+redStar(96,20,13)+g(cog(),'translate(64 125) scale(.32)'),original('a lion, wheat, red star and an industrial cog')),
  ROU:make(blue,'romanian-landscape',romanian(),original('a mountain landscape, fir trees, sun and derrick inside a grain surround')),
  IRL:make(blue,'irish-harp',harp(),original('a gold harp with nine individually drawn strings and a carved forepillar')),
  SUI:make(red,'swiss-cross-shield',shield(cross(I),red),original('the equal-armed white cross as a shield device')),
  BEL:make(black,'belgian-crowned-lion',royal(smallLion(G),black),original('a crowned gold lion on a black shield')),
  LUX:make(blue,'luxembourg-lion',royal(rep(6,i=>{const w=i<4?90:i===4?74:48;return r(96-w/2,61+i*16,w,8,I);})+smallLion(red,{twoTails:true}),blue),original('a crowned red lion over silver-and-blue bars')),
  HEJ:make(red,'hejazi-crowned-star',wheat()+g(crown(),'translate(38 -1) scale(.6)')+star(96,110,7,45,20,I),original('a Hashemite-style crown and seven-pointed star; this arrangement is a game invention')),
  KUR:make(red,'kurdish-rayed-sun',rep(21,i=>g(p('M92 63 96 14 100 63Z',G),`rotate(${i*360/21} 96 96)`))+c(96,96,40,G)+ring(96,96,34,I,1.2),original('a twenty-one-rayed sun with separately outlined rays')),
  ALW:make('#2d6282','alawite-coastal-star',rep(12,i=>g(p('M93 70 96 23 99 70Z',G),`rotate(${i*30} 96 96)`))+star(96,96,12,40,30,I)+l('M39 161q14-7 28 0t28 0t28 0t28 0',I,2),original('a coastal sun-star above a wave; this is an invented regional device, not an attested state seal')),
  DRZ:make(I,'druze-five-colour-star',rep(5,i=>{const a=(i*72-90)*Math.PI/180,b=a+Math.PI/5,cc=a-Math.PI/5;return p(`M96 96L${96+Math.cos(cc)*32} ${96+Math.sin(cc)*32}L${96+Math.cos(a)*78} ${96+Math.sin(a)*78}L${96+Math.cos(b)*32} ${96+Math.sin(b)*32}Z`,['#258247','#ad293d','#dfb748','#2c5c9a','#f4e6be'][i]);})+l('M96 18 114 71 170 72 125 107 142 165 96 132 50 165 67 107 22 72 78 71Z',B,1),original('the five-coloured Druze star in a single interlocking composition')),
  ISR:make(blue,'israeli-menorah-branches',wreath()+[44,29,15].map(rad=>l(`M${96-rad} 57V74A${rad} ${rad} 0 0 0 ${96+rad} 74V57`,I,5)).join('')
    +r(93,57,6,86,I)+rep(7,i=>p(`M${47+i*15} 47h9l-2 10h-5Z`,I))+p('M83 142H109L119 151H73ZM72 154H120L130 163H62Z',I),original('a seven-branched menorah and olive branches; no invented Hebrew inscription is supplied')),
  JOR:make(red,'jordanian-royal-eagle',g(crown(),'translate(40 -3) scale(.58)')+g(eagle(),'translate(12 32) scale(.87)')+g(shield(star(96,105,7,29,12,I),red),'translate(55 62) scale(.43)'),original('a royal crown, eagle and seven-pointed star shield')),
  TUR:make(red,'turkish-crescent-star',crescent(83,96,65,I)+star(129,96,5,29,12,I),original('the crescent and five-pointed star as a full court device')),
  YEM:make(red,'yemeni-royal-device',g(crown(),'translate(42 -2) scale(.56)')+g(swordsAndKhanjar(),'translate(15 34) scale(.84)')+rep(5,i=>star(57+i*20,76-Math.sin(i*Math.PI/4)*13,5,5,2,I)),original('a royal crown, crossed blades and five stars; this is a game adaptation for the royal court')),
  AFG:make(black,'afghan-mosque',mosque(),original('a domed mosque, minarets, flanking standards and grain; no fabricated Arabic lettering')),
  ETH:make(green,'ethiopian-crowned-lion',g(crown(),'translate(42 -3) scale(.56)')+g(referenceAnimal('passant',G,D),'translate(4 29) scale(.88)')
    +l('M144 52V160',I,3)+p('M140 34H148V43H157V51H148V62H140V51H131V43H140Z',G),original('a crowned lion with a cross-topped staff and a curved blade')),
  PAK:make(green,'pakistani-agricultural-shield',wreath()+crescent(88,36,20,I)+star(116,32,5,10,4,I)
    +g(shield(l('M96 65V153M52 107H140',I,2)+g(branch(),'translate(49 67) scale(.2)')+g(branch('oak'),'translate(103 67) scale(.2)')+g(branch(),'translate(51 110) scale(.2)')+g(branch('oak'),'translate(105 110) scale(.2)'),green),'translate(26 29) scale(.73)'),original('a crescent and star above an agricultural quartered shield and floral branches')),
  LBR:make(blue,'liberian-landscape',landscapeLiberia(),original('a sailing ship, palm, sun and dove in a shield composition')),
  HEZ:make('#e1c741','hezbollah-court-device',armAndRifle(),'A redrawn game adaptation of the existing arm, rifle and globe device, retaining separate finger and globe contours. Lettering is omitted rather than replaced with invented text.'),
  GRC_MOD:make(blue,'greek-royal-cross',g(crown(),'translate(39 -2) scale(.59)')+shield(cross(I),blue),original('a royal crown and white cross on a blue shield for the modern Kingdom of Greece')),
  OMA_MOD:make(red,'omani-khanjar',swordsAndKhanjar(),original('the sheathed khanjar over crossed curved swords, separate from the ancient maritime court')),
};

// Repair literal flag placeholders as well as adding court portraits. These
// remain flags, with the full source device in the appropriate colour field.
const flag=(field,key,motif,note,source=null)=>({...make(field,key,motif,note,source),detailed:false});
export const MODERN_FLAG_REPAIRS={
  USA:flag('#ffffff','american-48-star-flag',rep(7,i=>r(0,i*192/13*2,192,192/13,'#b22234'))+r(0,0,84,192/13*7,'#3c3b6e')
    +rep(6,row=>rep(8,col=>star(6+col*10.2,8+row*17.4,5,3.1,1.3,'#ffffff'))),'The United States flag with thirteen stripes and forty-eight individual stars for the 1948 chapter.'),
  SAU:flag('#165d31','saudi-national-flag',N.sa,'The Saudi flag with the complete outlined inscription and sword, replacing decorative placeholder strokes.',deviceSource('sa')),
  ALB:flag('#e41e20','albanian-national-flag',N.al,'The Albanian flag with the complete double-headed eagle contours.',deviceSource('al')),
  LEB:flag('#ffffff','lebanese-national-flag',r(0,0,192,48,'#ee161f')+r(0,144,192,48,'#ee161f')+g(N.lb,'translate(48 48) scale(.5)'), 'The Lebanese flag with its fully outlined cedar, fitted within the white band.',deviceSource('lb')),
  POR:flag('#ff0000','portuguese-national-flag',r(0,0,76.8,192,'#006600')+g(N.pt,'translate(19.2 38.4) scale(.6)'), 'The Portuguese flag with the complete armillary sphere and shield at the colour division.',deviceSource('pt')),
  IRN_IR:flag('#ffffff','iranian-republic-flag',r(0,0,192,64,'#239f40')+r(0,128,192,64,'#da0000')+g(N.ir,'translate(52.8 52.8) scale(.45)'), 'The game republican tricolour with the full outlined central Iranian device.',deviceSource('ir')),
};
