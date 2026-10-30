// Roster audit, October 2026. These original game compositions refine the
// existing identities; notes distinguish an object association from a flag.
import { G,I,B,D,S,p,l,c,r,g,rep,mirror,ring,star,branch,crown,eagle,lion,weapon,bow,anchor,tiara,referenceAnimal } from './armorial_masters.js';

function carved(d,ink=I) { return p(d,ink)+l(d,B,.8); }
function stone(type='gate') {
  const tower=(x,y,w,h,cren=true)=>p(`M${x} ${y+h}V${y}${cren?`h${w*.2}v8h${w*.2}v-8h${w*.2}v8h${w*.2}v-8h${w*.2}`:`h${w}`}v${h}Z`,I)
    +rep(Math.floor((h-10)/10),i=>l(`M${x+1} ${y+14+i*10}h${w-2}m${-w*.7} 0v9m${w*.4} 0v-9`,B,.8));
  if(type==='aksum')return p('M69 174V37C69 11 123 11 123 37V174Z',I)
    +p('M76 38Q96 23 116 38V45H76Z',B)+l('M77 37Q96 27 115 37M75 48H117',D,1)
    +rep(8,i=>r(77,53+i*12,12,7,D)+r(103,53+i*12,12,7,D)+l(`M71 ${49+i*12}H121M94 ${49+i*12}v11`,B,1))
    +p('M85 174V153H108V174Z',D)+l('M96 155V172M86 163H106',G,.9)+r(60,174,72,5,G);
  if(type==='nuraghe')return p('M42 172 55 62H137L150 172Z',I)+p('M49 47H143V61H49Z',G)
    +rep(10,i=>l(`M${55-i*.8} ${66+i*10}H${137+i*.8}`,B,1)+rep(5,j=>l(`M${57+j*17-i*.5+(i%2?8:0)} ${66+i*10}v9`,B,.65)))
    +p('M77 172V129Q96 102 115 129V172Z',D)+l('M70 172V128Q96 92 122 128V172M56 44H137',G,2)+r(34,172,124,5,G);
  if(type==='terp')return p('M20 163Q96 116 172 163Z',B)+l('M28 160Q96 130 164 160',G,1.4)
    +p('M42 107V155H147V107Z',I)+p('M26 110 92 49 166 110 155 119 92 66 37 120Z',G)
    +rep(11,i=>l(`M${47+i*9} ${106-Math.max(0,5-Math.abs(i-5))*2}V153`,B,1.2))
    +p('M82 155V117Q93 108 104 117V155Z',D)+l('M39 105 92 60 152 109M48 162H141',D,1)
    +rep(3,i=>l(`M21 ${172+i*5}q12-7 24 0t24 0t24 0t24 0t24 0t24 0`,I,1.1));
  if(type==='hillfort')return p('M21 174 96 28 171 174Z',B)+p('M33 168 96 45 159 168Z',I)
    +p('M28 145 49 112H142L164 145Z',G)+l('M40 126H151M36 138H157M48 153H145',D,1.2)
    +rep(12,i=>l(`M${43+i*9} 127v10`,D,1))+p('M83 172V145Q96 129 109 145V172Z',D)
    +l('M45 110 96 49 147 110M67 105 96 68 126 105M26 174H169',G,1.4);
  if(type==='palace')return p('M32 171V87H160V171Z',I)+tower(29,60,32,111)+tower(131,60,32,111)
    +p('M60 87V67H74V80H88V62H104V80H118V67H132V87Z',I)
    +[65,90,115].map(x=>p(`M${x} 171V121Q${x+9} 99 ${x+18} 121V171Z`,D)+l(`M${x-3} 171V121Q${x+9} 91 ${x+21} 121V171`,G,1.2)).join('')
    +rep(4,i=>l(`M62 ${92+i*8}H130`,B,.7))+r(22,172,149,5,G);
  if(type==='oasis')return tower(24,57,41,116)+tower(127,44,41,129)+p('M65 173V91H127V173Z',I)
    +rep(7,i=>l(`M65 ${101+i*10}H127m-41 0v9m20 0v-9`,B,.9))
    +p('M80 173V130L96 112 112 130V173Z',D)+l('M74 173V129L96 104 118 129V173M24 177H168',G,2)
    +r(38,95,9,17,D)+r(144,76,8,18,D)+r(140,110,9,13,D);
  if(type==='watchtower')return tower(53,28,86,145)+p('M80 173V139Q96 115 112 139V173Z',D)
    +r(83,59,25,29,D)+l('M91 60V86M83 73H107M72 173V137Q96 102 120 137V173',G,2)
    +rep(3,i=>p(`M${59+i*24} 39v8l7 4 7-4v-8Z`,B))+r(43,174,106,5,G);
  return tower(type==='cilicia'?29:24,56,38,117)+tower(type==='cilicia'?125:130,56,38,117)
    +p('M62 173V93H130V173Z',I)+r(60,87,72,9,G)
    +rep(7,i=>l(`M63 ${101+i*10}H129m-46 0v9m24 0v-9`,B,.8))
    +p(type==='cilicia'?'M77 173V121L96 105 115 121V173Z':'M77 173V126Q96 100 115 126V173Z',D)
    +l('M70 173V125Q96 89 122 125V173',G,1.8)+r(36,91,10,20,D)+r(146,91,10,20,D)
    +r(18,174,156,5,G)+star(96,72,type==='ammon'?8:4,9,4,G);
}
function petra() {
  return p('M23 173V83H169V173Z',I)+r(18,173,156,6,G)
    +rep(6,i=>r(32+i*24,111,7,59,G)+r(29+i*24,106,13,5,I)+l(`M${35+i*24} 115v48`,B,1))
    +p('M76 173V116H116V173Z',D)+r(21,96,150,9,G)
    +p('M18 92 52 58H72L43 87H18ZM174 92 140 58H120L149 87H174Z',I)
    +p('M76 96V60Q96 38 116 60V96Z',I)+p('M72 58 96 39 120 58Z',G)
    +r(88,28,16,11,G)+p('M84 14H108L104 28H88Z',I)
    +[33,58,82,105,130,155].map(x=>r(x,66,5,27,G)+l(`M${x+2} 67v24`,B,.7)).join('')
    +p('M91 66H101V89H91Z',D)+l('M23 89H69M124 89H169M24 103H168M25 170H167',B,1)
    +rep(6,i=>l(`M${33+i*24} 161h7m-7 4h7`,B,.9));
}
function temple(type='classical') {
  const n=type==='ionic'?4:6, x=type==='ionic'?49:31, step=type==='ionic'?30:25;
  return p('M18 67 96 23 174 67Z',I)+p('M38 60 96 29 153 60Z',B)
    +l('M47 57 96 34 144 57',G,1.2)+r(20,68,152,11,G)
    +rep(n,i=>{const a=x+i*step;return r(a,86,9,72,I)+r(a-4,80,17,7,G)+r(a-4,158,17,7,G)
      +l(`M${a+3} 90v64m3-64v64`,B,.8)+(type==='ionic'?g(l('M-8 0C-25 0-21-15-10-12C-1-11-3 0-10-2M17 0C34 0 30-15 19-12C10-11 12 0 19-2M-10-12H19',I,2),`translate(${a} 78)`):'');})
    +r(19,166,154,6,G)+r(12,174,168,5,I)+r(86,100,20,65,D);
}
function stele(type='mesha') {
  return p(type==='tanit'?'M36 177V55L96 15 156 55V177Z':'M49 176 47 65C47 26 67 17 96 17C126 17 147 35 146 63L143 176Z',I)
    +l(type==='tanit'?'M45 170V58L96 25 147 58V170Z':'M56 170V62Q56 26 96 27Q136 27 136 62V170Z',B,1.5)
    +(type==='tanit'?ring(96,68,13,G,5)+l('M65 94H127',G,5)+p('M96 99 129 152H63Z',G)+p('M96 115 116 145H76Z',D)
      :rep(12,i=>rep(9,j=>{const x=61+j*7.4,y=53+i*9;return l(`M${x} ${y}l${2+(i*3+j)%4} ${((i+j)%3)-1}m-1 2l${((i+j)%2)*2-1} 2`,B,.7);}))
      +l('M52 90 60 98 56 110M133 36 123 51 125 70M141 144 127 151 121 170M57 164 67 151',D,.7));
}
function ship(type='bithynia') {
  const oared=['suiones','tartessos','pirate'].includes(type),merchant=['characene','armorican'].includes(type);
  const hull=type==='suiones'?'M22 93C29 124 62 145 96 145C130 145 163 124 170 93L164 121C152 151 122 164 96 163C70 164 40 151 28 121Z'
    :type==='tartessos'?'M20 119Q96 154 172 119L161 145Q96 177 31 145Z'
    :merchant?'M20 127Q96 154 173 122L159 151Q104 181 45 158Z':'M17 130 144 136 171 116 168 138 145 158 45 158 27 148Z';
  const ribs=rep(10,i=>l(`M${38+i*12} ${141+Math.sin(i*Math.PI/9)*9}l${3-i*.7} 10`,G,1.2));
  const rig=l(type==='armorican'?'M95 28V145M43 45H148':'M98 22V144M44 45H151M98 27 32 131M100 29 161 128',G,2);
  const sail=type==='armorican'?p('M43 49Q96 37 149 49L142 117Q96 103 50 117Z',B)
    +rep(6,i=>l(`M${47+i*19} 50l4 64`,I,.9))+rep(4,i=>l(`M48 ${60+i*15}Q96 ${49+i*15} 145 ${60+i*15}`,I,.9))
    +l('M45 50 141 113M147 50 51 113',G,1)
    :p(type==='characene'?'M45 49Q98 63 151 49L145 114Q98 99 51 114Z':'M48 49Q99 59 150 49L143 108Q96 97 55 108Z',I)
    +rep(5,i=>l(`M${58+i*20} 54v49`,B,.9))+rep(3,i=>l(`M53 ${65+i*16}Q97 ${73+i*14} 147 ${65+i*16}`,B,1));
  const ends=oared?l(type==='suiones'?'M25 117 17 48Q15 28 30 34Q41 41 30 47M167 117 175 48Q177 28 162 34Q151 41 162 47':'M24 128 18 70Q14 55 24 55M168 128 174 70Q178 55 168 55',G,4):'';
  const oars=rep(type==='massalia'?9:7,i=>l(`M${39+i*17} 138l-17 30m-2-1 5 3`,I,1.5));
  const extra=type==='bithynia'?p('M97 22 119 42 99 40Z','#ae3b44'):type==='vandal'?p('M91 69H104V82H117V95H104V114H91V95H78V82H91Z',D)
    :type==='massalia'?p('M143 142 181 135 181 142 151 149Z',G)+c(161,128,2,I)
    :type==='tartessos'?ring(96,63,15,G,3)+c(96,63,9,I):'';
  return (oared?ends:rig+sail)+oars+p(hull,B)+l(hull,G,1.6)+ribs+extra
    +rep(2,i=>l(`M22 ${177+i*6}q12-6 24 0t24 0t24 0t24 0t24 0t24 0`,I,1));
}
function winged(archer=false) {
  const wing=p('M82 80C56 73 36 69 13 62L20 81 78 108Z',G)
    +rep(12,i=>p(`M${17+i*5.1} ${67+i*2}l${5+i*.2} 27 6 2-${5+i*.2}-27Z`,I))
    +rep(7,i=>l(`M${28+i*7} ${72+i*1.9}l3 10`,B,.9));
  const disc=ring(96,101,24,G,5)+p('M84 124 67 168H125L108 124Z',G)
    +rep(7,i=>l(`M${83+i*4} 128l${(i-3)*3} 33`,D,.8))+l('M80 139H112M76 150H116M71 160H121',I,1);
  const figure=p('M87 77V55Q79 50 86 40L87 27H103L108 42 102 54 105 67 118 75 114 83 101 77 104 102H85Z',I)
    +p('M85 27 86 20 91 23 95 17 100 23 105 20 107 27Z',G)+p('M101 42 113 46 105 50Z',G)
    +l('M94 58 92 93M88 61H101M88 66H102M88 71H103M88 83H101M88 89H102M87 47 92 50M92 51 97 54',B,1)
    +c(100,40,1.2,D)+p('M87 65 72 58 63 43 57 47 65 67 84 78Z',I)
    +(archer?l('M60 31Q28 60 60 87M60 31 67 59 60 87M33 59H91',G,2):ring(56,50,11,G,3));
  return wing+g(wing,'translate(192 0) scale(-1 1)')+disc+figure+l('M73 117C59 143 44 131 43 120M119 117C133 143 148 131 149 120',G,3);
}
function fireAltar() {
  return p('M67 93H125V107H111V147H128V157H64V147H81V107H67Z',I)+r(57,158,78,9,G)+r(49,170,94,7,I)
    +p('M95 29C111 50 128 61 113 78Q96 94 80 78C64 64 84 53 84 38Q88 55 94 56C91 45 100 39 95 29Z',G)
    +l('M95 46C110 61 116 69 105 78M87 63Q78 72 90 80M84 111V143M108 111V143M89 112V142M103 112V142M62 162H130',B,1.3)
    +r(72,94,48,4,G)+rep(6,i=>l(`M${77+i*7} 98v7`,D,.7));
}
function seatedArcher() {
  return p('M95 104H133V113H126V154H119V116H105V157H98V114Z',B)+l('M95 110H133M102 119V148M123 118V150',I,1)
    +p('M95 97 110 95 119 104 110 116 96 117 87 136 79 151 68 155 66 149 74 143 81 119Z',G)
    +p('M101 104 118 109 118 133 130 150 129 157 118 158 112 151 105 133 104 118 93 114Z',I)
    +p('M96 61 109 68 111 93 118 103 94 113 78 104 81 81 72 86 62 105 55 102 65 74 82 67Z',I)
    +p('M89 61 80 51 82 36 95 27 108 34 111 47 104 58 103 67Z',G)
    +p('M78 36 84 22 104 19 116 30 111 38 97 33Z',I)+l('M84 25 105 24M90 41 99 39M99 49 105 47M88 51 94 58M85 69 84 94M92 70 90 103M100 73 101 101M88 122 82 138M111 120 112 133',B,1.4)
    +c(101,41,1.3,D)+p('M104 44 115 47 106 50Z',I)
    +p('M88 74 75 66 62 65 49 69 45 75 52 79 65 74 81 85Z',G)
    +l('M45 40Q17 71 44 107M45 40 51 73 44 107M23 73H79',G,2.3)
    +p('M50 72 57 69 63 71 61 77 54 79Z',I)+l('M67 159H134',G,2);
}
function arethusa() {
  const head=p('M112 37C129 45 133 63 125 76L126 88 137 99 133 104 124 106 126 113 121 117 123 125 116 133 101 134 98 148 118 157 107 165 80 159 69 149 75 127C57 113 57 91 60 73C60 50 77 32 98 32Z',I)
    +p('M60 85C43 67 57 43 75 36C91 20 120 28 128 46L117 63 99 69 84 65 75 92Z',G)
    +rep(13,i=>{const x=62+(i%5)*12,y=46+Math.floor(i/5)*13;return l(`M${x} ${y}q-8-8-11 0q0 9 9 6q4-3-1-6`,B,1);})
    +l('M82 68Q98 79 115 66M81 75Q96 87 116 75M90 112Q88 132 81 143M103 130 99 140M120 92 127 94M121 110 128 110M112 86 121 84M110 82 118 80',B,1.1)
    +c(119,87,1.5,D)+ring(93,112,4,G,1.5)+l('M96 114 96 125',G,1.4);
  const dolphin=referenceAnimal('dolphin',I,B);
  return head+g(dolphin,'translate(9 20) scale(.22) rotate(-45 96 96)')+g(dolphin,'translate(141 8) scale(.22) rotate(65 96 96)')
    +g(dolphin,'translate(140 134) scale(.22) rotate(135 96 96)')+g(dolphin,'translate(12 139) scale(.22) rotate(220 96 96)');
}

function rose() {
  return p('M96 24C122 20 136 42 129 62L148 48C158 78 137 101 106 108L99 165H90L87 108C56 101 35 78 45 48L64 62C57 42 71 20 96 24Z',I)
    +p('M95 38C77 32 64 53 80 69C94 82 108 62 100 53C91 41 79 56 88 61',G)
    +l('M95 38C77 32 64 53 80 69C94 82 108 62 100 53C91 41 79 56 88 61M63 59Q61 85 87 99M130 61Q131 86 106 99M87 107H106M96 110V160',B,1.5)
    +p('M92 145C66 149 50 132 50 119C69 116 90 126 92 145ZM101 136C101 114 121 107 140 109C137 125 122 138 101 136Z',G)
    +l('M55 122 86 140M108 132 135 113',B,1);
}
function pomegranate() {
  return p('M74 56 64 33 85 43 96 23 107 43 128 33 118 56C162 82 153 143 115 163Q96 173 77 163C39 143 30 82 74 56Z',I)
    +p('M96 69C124 68 144 91 139 119Q133 148 109 158L96 160Z',G)
    +l('M73 57Q96 65 119 57M68 77C46 105 61 141 80 152M96 70V159M118 78Q143 105 127 136',B,1.4)
    +rep(7,i=>rep(4,j=>g(p('M-2-3Q2-5 4-1Q6 3 2 5Q-2 4-2-3Z',B),`translate(${103+j*7} ${83+i*10}) rotate(${(i+j)%2*35})`)));
}
function grainAndGrapes() {
  const wheat=l('M54 166V37',G,3)+rep(8,i=>p(`M53 ${57+i*11}Q26 ${48+i*11} 32 ${30+i*11}Q53 ${34+i*11} 53 ${57+i*11}ZM57 ${57+i*11}Q84 ${48+i*11} 78 ${30+i*11}Q57 ${34+i*11} 57 ${57+i*11}Z`,I)+l(`M35 ${36+i*11} 52 ${53+i*11}M74 ${36+i*11} 58 ${53+i*11}`,B,.8));
  return wheat+l('M121 165V54Q140 15 159 35Q170 54 151 61Q136 60 143 47',G,2.5)
    +p('M116 67 103 47 115 46 117 34 129 45 141 40 138 54 152 62 137 67 130 78Z',I)
    +rep(6,i=>rep(5-Math.floor(i/2),j=>c(110+j*11+i*3,85+i*12,6.4,i%2?B:G)+l(`M${108+j*11+i*3} ${82+i*12}q-3 0-3 3`,I,.8)));
}
function bull(type) {
  if(type==='saba')return p('M61 72C20 69 15 32 29 18C27 51 49 51 69 52ZM131 72C172 69 177 32 163 18C165 51 143 51 123 52Z',I)
    +p('M53 73 73 57H119L139 73 128 118 117 149 96 161 75 149 64 118Z',G)
    +p('M76 126Q96 116 116 126L111 146Q96 158 81 146Z',I)
    +mirror(p('M65 82 43 76 48 97 69 101Z',I)+p('M71 88 86 91 82 98 72 95Z',D)+l('M75 105 81 120M81 132V140',D,1.5))
    +l('M89 74 96 90 103 74M96 98V120M88 146H104',B,1.5)+r(65,163,62,7,G);
  const front=p('M60 69 76 54H116L132 69 122 116 112 148 96 157 80 148 70 116Z',G)
    +mirror(p('M72 70C35 70 27 44 31 26C40 49 52 49 77 52Z',I)+p('M68 77 43 71 49 92 72 99Z',B))
    +p('M80 125Q96 119 112 125L109 144Q96 155 83 144Z',I)
    +mirror(p('M72 87 86 91 82 98 74 96Z',D)+l('M76 103 84 114M84 131V139',D,1.4))
    +l('M89 73 96 94 103 73M96 102V119M91 145H101',B,1.4);
  return type==='cimbri'?r(91,148,10,31,B)+front+ring(96,167,6,G,2):front
    +mirror(l('M65 76Q53 101 65 115M72 67 64 63M77 59 74 53',I,1.2));
}
function roundShield(type='oval') {
  const oval=type==='thureos',d=oval?'M66 24Q96 13 126 24Q146 92 125 168Q96 180 67 168Q46 92 66 24Z':'M96 35A63 63 0 1 0 96 161A63 63 0 1 0 96 35Z';
  return p(d,I)+l(d,B,2)+p(oval?'M73 31Q96 24 119 31Q135 92 119 161Q96 169 73 161Q57 92 73 31Z':'M96 43A55 55 0 1 0 96 153A55 55 0 1 0 96 43Z',G)
    +l(oval?'M96 34V160M73 93H119':'M96 48V148M46 98H146',B,2)+c(96,98,14,I)+ring(96,98,10,D,1.4)
    +rep(oval?16:20,i=>{const a=i*Math.PI*2/(oval?16:20);return c(96+Math.cos(a)*(oval?28:58),98+Math.sin(a)*(oval?65:58),1.6,B);});
}
function incense() {
  return p('M56 77H136V92H124L114 106H104V147H130V158H62V147H88V106H78L68 92H56Z',I)+r(51,159,90,9,G)+r(45,171,102,6,I)
    +l('M63 83H129M75 94H117M92 108V144M100 108V144M69 153H123',B,1.3)
    +rep(6,i=>p(`M${63+i*12} 76l-3-6 5-5 5 5-3 6Z`,G))
    +l('M77 59C53 42 86 41 72 24M99 58C76 40 111 33 94 15M119 59C101 46 135 37 120 22',I,2);
}
function hornedAltar() {
  return p('M45 165H147V178H45ZM53 149H139V164H53ZM63 70H129L135 148H57ZM52 56H140V70H52Z',I)
    +mirror(p('M52 57C39 42 42 29 52 22C61 29 65 42 64 57Z',G)+p('M77 57C72 42 75 34 82 30C89 36 91 45 89 57Z',G))
    +l('M67 77 64 143M126 77 129 143M57 62H135M60 156H132M52 171H140',B,1.4)
    +rep(5,i=>l(`M65 ${85+i*12}H127`,B,.7));
}
function menorah() {
  return [65,44,22].map(rad=>l(`M${96-rad} 47V63A${rad} ${rad} 0 0 0 ${96+rad} 63V47`,G,6)).join('')
    +r(92,45,8,108,G)+[87,109,130].map(y=>p(`M87 ${y}H105L108 ${y+5}H84Z`,I)).join('')
    +[-65,-44,-22,0,22,44,65].map(dx=>p(`M${96+dx-8} 33H${96+dx+8}L${96+dx+5} 47H${96+dx-5}Z`,I)+l(`M${96+dx-6} 39h12`,B,1)).join('')
    +p('M76 151H116L130 161 117 168H75L62 161ZM65 170H127L143 179H49Z',G)
    +l('M96 51V151M35 58V65Q36 123 88 127M55 55V64Q55 102 88 105M77 53V63Q77 81 88 83',I,.9);
}
function magen() {
  return l('M96 28 155 131H37ZM96 166 37 63H155Z',G,10)
    +l('M96 29 152 128H40M96 164 40 66H152',I,1.4)+l('M96 39 142 121M96 155 50 75',B,1.1);
}
function sun(type='star') {
  if(type==='palmyra')return rep(24,i=>g(p(i%2?'M92 59 96 16 100 59Z':'M91 60 96 8 101 60Z',G),`rotate(${i*15} 96 96)`))
    +ring(96,96,36,G,5)+c(96,96,28,I)+p('M89 78 96 72 103 78 108 96 101 113H91L84 96Z',G)+l('M91 84 101 84M91 104H101',B,1.2);
  return rep(8,i=>g(p('M90 69 96 15 102 69 96 60Z',I),`rotate(${i*45} 96 96)`))
    +rep(8,i=>g(l('M96 38V65',B,1.3),`rotate(${i*45} 96 96)`))
    +ring(96,96,26,G,5)+c(96,96,16,I)+rep(4,i=>g(l('M89 73Q96 64 103 73M89 119Q96 128 103 119',G,1),`rotate(${i*90} 96 96)`));
}
function zodiac() {
  const signs=[
    'M-5 8V-3C-18-18-23 2-13 2M-5-3C8-18 13 2 3 2',
    'M-10-10Q-10 0 0 0Q10 0 10-10M0 0A7 7 0 1 0 0 14A7 7 0 1 0 0 0',
    'M-8-9H8M-8 10H8M-5-8V9M5-8V9',
    'M-9-1Q-14-9-6-10Q4-9 0-3Q-4 2-11-1M9 1Q14 9 6 10Q-4 9 0 3Q4-2 11 1',
    'M-10 10Q-18-2-8-4Q0-4-5 3Q-11 7-10 10M-5 3C15 6 11-16 1-13C-6-11 4 6 12 5',
    'M-12 10V-8Q-7-12-5-6V10M-5-6Q1-14 3-6V10M3-5Q13-12 12-2L6 11 14 12',
    'M-12 9H12M-12 4H-5Q-9-8 0-9Q9-8 5 4H12',
    'M-12 10V-8Q-7-12-5-6V10M-5-6Q1-14 3-6V10M3-5Q8-14 9-5V8L15 10 12 3',
    'M-10 10 10-10M0-10H10V0M-9-2 2 9',
    'M-12-8V8M-12-5Q-4-15 0-2V11Q15 18 13 5Q7-4 0 6',
    'M-13-5-7-10-1-5 5-10 11-5M-13 5-7 0-1 5 5 0 11 5',
    'M-9-11Q2 0-9 11M9-11Q-2 0 9 11M-10 0H10'
  ];
  return c(96,96,79,I)+ring(96,96,74,B,1)+ring(96,96,48,B,1.5)
    +rep(12,i=>g(l('M96 23V47',B,1),`rotate(${i*30+15} 96 96)`))
    +signs.map((s,i)=>{const a=(i*30-90)*Math.PI/180;return g(l(s,'#538bad',1.5),`translate(${96+Math.cos(a)*60} ${96+Math.sin(a)*60}) scale(.73)`);}).join('')
    +sun().replaceAll(I,'#98ceec').replaceAll(G,'#538bad').replaceAll(B,'#538bad').replace('<path','<path').replace(/^/,'<g transform="translate(57.6 57.6) scale(.4)">')+'</g>';
}
function headDress() {
  return rep(9,i=>g(p('M89 96C88 69 84 36 96 15C108 36 104 69 103 96Z',I)+l('M96 25V93M92 43l4 5 4-5M92 60l4 5 4-5M92 76l4 5 4-5',B,.9),`rotate(${(i-4)*8} 96 106)`))
    +p('M45 103Q96 87 147 103L142 125Q96 113 50 125Z',G)+l('M50 107Q96 94 142 107M50 116Q96 103 142 116',D,1.3)
    +p('M53 127 63 127 57 166 47 157ZM139 127 129 127 135 166 145 157Z',B)
    +rep(12,i=>c(57+i*7,111-Math.sin(i*Math.PI/11)*8,1.7,I));
}
function rock(type='edom') {
  const ds=type==='sela'?['M24 168 40 64 77 27 89 99 110 65 135 40 169 168Z','M42 156 54 70 73 44 78 118 63 158Z','M102 158 126 63 142 120 155 158Z']
    :type==='atlas'?['M17 168 66 87 87 113 119 39 176 168Z','M96 109 119 47 147 119 121 100Z','M35 159 65 101 80 129 66 120Z']
    :['M27 170 43 104 63 67 72 28 96 56 111 110 135 65 165 170Z','M46 163 62 102 77 48 83 91 71 155Z','M112 163 137 81 146 128 152 164Z'];
  return p(ds[0],B)+p(ds[1],I)+p(ds[2],G)
    +l(type==='sela'?'M38 161 47 108M86 119 101 88M121 88 113 136M148 125 156 151':'M51 140 65 111M94 104 105 136M131 121 142 153',D,1.1)
    +(type==='atlas'?p('M95 24A22 22 0 1 0 111 61A26 26 0 0 1 95 24Z',I):'')+l('M21 174H173',G,1.5);
}
function chariot() {
  return [56,142].map(x=>ring(x,147,26,G,4)+ring(x,147,22,B,1)+c(x,147,5,I)+rep(8,i=>g(l(`M${x} 124V170`,I,1.2),`rotate(${i*45} ${x} 147)`))).join('')
    +p('M43 102H138L147 128H56Z',I)+l('M56 125H156M80 102V132M47 107H138M143 116 174 93M152 118 178 99',B,2)
    +p('M79 91 87 74 106 76 115 96 128 99 125 107 108 104 99 89 91 98 78 98Z',G)
    +p('M85 75 86 47 98 42 107 49 108 76Z',I)+c(97,33,9,I)+p('M87 27 91 20 106 22 108 31Z',B)
    +l('M92 51V68M105 55 123 54 132 70M125 55 154 57M87 81 78 101',D,1.3);
}
function labyrinth() {
  // A seven-circuit classical labyrinth: explicit connected walls and an
  // open entrance, rather than the former square spiral.
  return l('M96 177V153H78C44 153 25 129 25 96C25 55 54 22 96 22C138 22 167 55 167 96C167 129 148 153 114 153H108V165H119C157 165 179 134 179 96C179 49 144 10 96 10C48 10 13 49 13 96C13 134 35 165 73 165H84V177M96 141H78C52 141 37 122 37 96C37 62 61 34 96 34C131 34 155 62 155 96C155 122 140 141 114 141H108V129H114C132 129 143 115 143 96C143 69 124 46 96 46C68 46 49 69 49 96C49 115 60 129 78 129H96V117H78C68 117 61 108 61 96C61 76 75 58 96 58C117 58 131 76 131 96C131 108 124 117 114 117H108V105H114C117 105 119 101 119 96C119 82 110 70 96 70C82 70 73 82 73 96C73 101 75 105 78 105H96V93H85Q85 82 96 82Q107 82 107 93V96',I,3.4);
}

function pennon(type='cross') {
  const banner=type==='liwa'?p('M60 47H162L149 69 162 91H60Z',I)+l('M65 52H150M65 86H151M74 57V81',B,1)
    :p('M60 44H164L147 63 162 84H60Z',I)+p('M80 49H90V58H99V68H90V78H80V68H71V58H80Z',G)
    +rep(9,i=>l(`M${66+i*10} 86v9`,G,.9));
  return l('M50 28V175',B,5)+l('M48 31V174',G,1)+p('M50 10 59 24 50 33 41 24Z',I)+banner
    +l('M59 45Q38 54 41 76M59 82Q41 99 61 111Q77 120 63 145',G,2)+r(43,173,14,5,G);
}
function vignette(type) {
  if(type==='cista')return p('M51 86Q96 71 141 86V156Q96 175 51 156Z',B)+rep(8,i=>l(`M${57+i*11} 88V157`,G,1))
    +rep(5,i=>l(`M52 ${95+i*13}Q96 ${85+i*13} 140 ${95+i*13}`,I,1))+p('M46 78Q96 61 146 78L140 86Q96 73 52 86Z',G)
    +l('M96 76C57 72 47 41 75 30C96 20 126 31 124 49C121 65 93 59 98 43Q103 33 111 42',I,5)
    +p('M111 35 123 38 128 45 114 49 107 43Z',I)+c(118,41,1,D)
    +l('M62 38 57 27M71 31 70 20M86 28 89 18M101 30 108 20',G,1.1);
  if(type==='amber')return l('M27 40Q96 135 165 40',G,2)
    +rep(11,i=>{const a=(i-5)*.22,x=96+Math.sin(a)*74,y=58+Math.cos(a)*49;return g(p('M-8-9 6-12 12 0 6 13-8 10-12-1Z',i%3===0?I:i%3===1?G:B)+l('M-6-7Q0-12 6-7M-6 4 4 8',D,.7),`translate(${x} ${y}) rotate(${-a*50})`);})
    +l('M28 154q11-6 22 0t22 0t22 0t22 0t22 0t22 0M28 166q11-6 22 0t22 0t22 0t22 0t22 0t22 0',I,1.2);
  if(type==='hair')return p('M121 27C67 9 28 56 39 105L65 165 127 165 135 128C98 126 79 105 88 83C95 66 116 68 112 83C107 100 87 87 98 79C82 89 94 112 116 104C153 91 146 45 121 27Z',G)
    +rep(6,i=>l(`M${110-i*5} ${31+i*4}C${45-i*2} ${27+i*8} ${39+i*3} ${81+i*5} ${72+i*4} ${150+i}`,D,1))
    +l('M115 36C137 46 141 77 123 88M114 117 124 124M63 153 69 163M76 150 84 164M91 151 99 164',I,1.3);
  if(type==='lawbook')return p('M31 69Q67 54 93 73V165Q67 147 31 159ZM99 73Q125 54 161 69V159Q125 147 99 165Z',I)
    +l('M37 78Q68 65 88 80V153Q68 141 37 150ZM105 80Q126 65 155 78V150Q127 141 105 153ZM96 75V167',B,1.5)
    +rep(7,i=>l(`M44 ${86+i*8}q23-7 36 1M113 ${87+i*8}q17-8 35-2`,B,.9))
    +g(crown(),'translate(27 -2) scale(.72)');
  if(type==='horsetail')return l('M96 25V177',B,6)+ring(96,27,12,G,3)+c(96,27,5,I)
    +p('M84 47Q96 38 108 47L130 110 151 157C128 154 111 135 105 117L107 168 96 150 85 168 87 117C81 135 64 154 41 157L62 110Z',G)
    +rep(11,i=>l(`M${82+i*2.8} 52Q${59+i*7} 118 ${50+i*9} ${146+(i%3)*5}`,i%2?B:I,1));
  if(type==='bulgar')return p('M28 41 42 25 56 41 53 155 40 171 27 155ZM136 41 150 25 164 41 165 155 152 171 139 155Z',I)
    +l('M40 47V150M152 47V150',B,1.3)+p('M68 39 96 84 124 39 133 45 104 95V162H88V95L59 45Z',G)
    +rep(6,i=>l(`M89 ${109+i*7}H103`,B,.8))+p('M96 167 105 176 96 185 87 176Z',G);
  if(type==='broken')return mirror(g(p('M53 52H90V100H53Z',I)+l('M71 33V143L62 153 66 171',B,4)
    +p('M53 49 54 38 66 46 72 31 81 46 90 39 90 49Z',G)+l('M61 62H82M61 68H82M61 74H82',B,1),'rotate(-12 70 95)'))
    +p('M76 138 96 125 116 138 109 150 96 142 83 150Z',G);
  if(type==='pyramids')return p('M19 174 72 34 110 174Z',I)+p('M72 34 118 174H104Z',B)
    +p('M91 174 132 67 176 174Z',G)+p('M132 67 166 174H153Z',B)
    +p('M53 174V146L65 135 78 146V174Z',B)+p('M60 174V148L65 143 71 148V174Z',D)
    +l('M31 158 69 53M103 154 132 80M26 178H180M55 140H76M111 166H154',G,1.2)+ring(149,34,12,G,2.5);
  if(type==='cap')return p('M48 145C70 98 66 51 96 14C121 54 117 99 144 145L152 164Q96 185 40 164Z',I)
    +p('M96 14C104 77 108 127 130 150L144 145C117 99 121 54 96 14Z',G)
    +p('M48 148Q96 167 144 148L148 161Q96 179 44 161Z',B)
    +rep(13,i=>g(p('M0-3 4 2 0 7-4 2Z',I),`translate(${51+i*7.5} ${155+Math.sin(i*Math.PI/12)*9})`))
    +l('M92 35C82 76 84 115 64 146M51 145Q96 164 141 145',B,1.2);
  return '';
}

function standingStandard(type='wreath') {
  return l('M96 18V178M49 58H143',G,5)+p('M52 61H140V130L129 122 118 130 107 122 96 130 85 122 74 130 63 122 52 130Z',I)
    +l('M57 66H135V121M61 71H131',B,1)+rep(8,i=>c(59+i*10,63,1.3,B))
    +(type==='wreath'?g(branch(),'translate(57 67) scale(.4)')+g(branch(),'translate(135 67) scale(-.4 .4)')
      :g(weapon('spear'),'translate(68 71) scale(.3)')+l('M66 91H124M66 105H114',B,2))
    +(type==='wreath'?c(96,26,10,G)+ring(96,26,6,I,1):p('M85 31 89 17 109 15 116 23 112 32 100 29 95 38Z',G)+c(107,23,1,D))
    +rep(5,i=>l(`M92 ${142+i*6}H100`,B,1));
}

export const REVISED_COURTS = Object.freeze(('PHO PHL IDU MOA AMM GAL NAB ARD PLM EME DEC ASY BAB ELM MED PRS CIL CAP ION HEL CYP KMT ISL JDH AIS ASR BBL MIZ PAS ROM JUD SEL PTO CYZ BAL BYZ DMT SMN ACH RHO MLI LUK CAR BOS REB USR USV LST PIR CMG BIT CRT DMS MOB AMO EDM QDR ELA MDA TAB CRC PAR ARM ADI CHX LKH GHA RSH TRT SRD IBE SYC PRG MAU GRM MAS BLG ARO AQT NOR BOI SUE CHE CHA FRS CIM SCN GOT AES DLM SCO DRD VEN VAN FRK BGD SAX AVA SLV BGR KSH NOB BLM AXM SAB HDR SAK CHO').split(' '));

export function reviseCourtStandards(flags) {
  const drawings={
    PHO:l('M145 40 42 96 145 152M96 37V157',G,12)+l('M141 41 46 96 141 150M93 40V153',I,1.3),
    PHL:headDress(), IDU:rock(), MOA:stele(), AMM:stone('ammon'), GAL:zodiac(), NAB:petra(),
    ARD:p('M91 20H134L110 70H142L51 174 76 105H47Z',G)+l('M95 25H125L101 76H129L63 159',I,1.5),
    PLM:sun('palmyra'), EME:p('M54 161 59 88 84 25 112 31 135 90 144 161Z',I)
      +p('M86 32 109 39 128 96 136 155 121 155 99 70Z',B)+l('M65 151 70 96 88 49M76 113 88 87M105 128 113 140',D,1.4)+star(98,95,8,11,5,G)+r(48,164,103,8,G),
    DEC:temple(), ASY:winged(true), BAB:g(sun(),'rotate(22.5 96 96)'), ELM:referenceAnimal('serpent',I,D),
    MED:weapon(), PRS:fireAltar(), CIL:stone('cilicia'), CAP:rock()+p('M82 172V118L96 101 110 118V172Z',D), ION:temple('ionic'),
    HEL:g(weapon('spear'),'translate(26 52) scale(.73)')+p('M70 80H122L114 98H78Z',I)
      +p('M97 14C107 38 126 41 119 62C114 84 80 85 73 64C65 45 89 34 88 18C94 25 94 34 96 39Z',G)+l('M98 34Q118 55 106 67M84 50Q75 63 91 70',I,1.2),
    CYP:p('M42 34Q96 56 150 34C134 80 134 112 150 158Q96 136 42 158C58 112 58 80 42 34Z',I)
      +l('M49 43Q96 62 143 43M49 149Q96 130 143 149M53 55Q65 96 53 137M139 55Q127 96 139 137',B,1.3)
      +l('M73 66 68 75M116 122 122 130M77 121 83 124M111 69 117 74',G,1.5),
    KMT:ring(96,51,28,G,12)+p('M89 77H103V111H136V125H103V176H89V125H56V111H89Z',G)
      +l('M96 84V171M62 115H92M100 115H131M78 36Q93 18 113 38M72 45Q65 67 83 74',I,1.2),
    ISL:hornedAltar(), JDH:lion(), AIS:g(magen(),'rotate(0 96 96)'), ASR:winged(true), BBL:sun(),
    MIZ:p('M63 112V81C63 62 78 62 78 41C78 9 110 8 114 37C119 60 109 76 126 104L130 115Z',I)
      +p('M55 101H123L133 67H150V151Q96 174 55 151Z',G)+l('M59 112H124L139 76H146M60 149Q96 165 145 149M82 28Q96 16 107 31M80 49V74',B,1.5)
      +l('M58 114C30 115 29 76 50 78C66 78 66 96 55 96',I,5),
    PAS:winged(false), ROM:g(eagle({raised:true}),'translate(20 0) scale(.8)')+p('M48 144H144V166H48Z',G)
      +g(flags.ROM.body.match(/<path d="([^"]+)"/)[0]+' fill="'+D+'"/>','translate(11 103) scale(1.7 .95)'),
    JUD:menorah(), SEL:anchor('stock','#6c217b'), PTO:eagle({raised:true})+p('M42 162H150L139 169H112L121 176H79L87 169H53Z',G),
    CYZ:g(anchor('curved'),'translate(7 -4) scale(.93)')+g(crown('laurel'),'translate(50 2) scale(.48)'),
    BAL:g(anchor(),'translate(15 13) scale(.84)')+g(crown(),'translate(44 -2) scale(.54)'),
    BYZ:p('M85 23H105V30H99V165H107V172H79V165H87V30H79V23Z',G)
      +p('M96 23H109C158 23 157 85 109 85H98V75H108C142 75 141 34 108 34H98Z',G)
      +l('M49 50 143 151M49 151 143 50',G,10)+l('M51 48 145 149M51 149 145 48M94 29V165',I,1.4),
    DMT:g(anchor('curved',S),'translate(0 8) scale(1 .93)')+l('M67 37Q96 19 125 37M69 42Q96 25 123 42',S,4),
    SMN:g(weapon('spear'),'rotate(-27 96 100)')+g(weapon('spear'),'rotate(27 96 100)'),
    ACH:l('M39 165 77 27 117 165M52 115H103M107 33 158 165M158 33 107 165',G,9)
      +l('M41 163 77 34 114 164M109 36 156 163M156 36 109 163',I,1), RHO:rose(), MLI:magen(),
    LUK:g(temple('ionic'),'translate(28 26) scale(.7)')+p('M87 80 104 72 95 99 110 108 91 128 79 111 91 97Z',D)
      +g(crown(),'translate(14 99) scale(.55) rotate(-16 96 96)'), CAR:stele('tanit'),
    BOS:l('M96 27V172M53 38V74Q53 95 96 95Q139 95 139 74V38',G,9)
      +[53,96,139].map((x,i)=>p(`M${x} ${i===1?12:22}l-11 24 11-5 11 5Z`,I)).join('')
      +l('M96 40V167M58 48V73Q58 87 86 90M134 48V73Q134 87 106 90',I,1.3),
    REB:p('M86 91H106L102 166 96 176 90 166Z',B)+rep(7,i=>l(`M89 ${110+i*7}H103`,G,1))
      +p('M67 78H125L117 98H75Z',I)+p('M96 13C108 44 137 44 126 70C123 87 73 91 65 69C56 48 83 32 83 16C94 25 93 38 94 40Z',G)
      +l('M100 35Q130 58 110 73M78 49Q63 69 88 76',I,1.8),
    USR:standingStandard(), USV:standingStandard('frontier'), LST:g(weapon('sabre'),'rotate(-30 96 96)'), PIR:ship('pirate'),
    CMG:rock('sela')+star(96,20,8,10,4,G)+[47,96,145].map((x,i)=>g(p('M-13 3Q-15-11 0-13Q15-11 13 3L19 30H-19Z',I)+p('M-13-4-10-18 0-26 10-18 13-4Z',G)+l('M-6 0H6M-7 6 0 11 7 6M0 13V28',B,1),`translate(${x} ${116+(i===1?-20:0)})`)).join(''),
    BIT:ship('bithynia'), CRT:labyrinth(), DMS:mirror(p('M83 37 63 18 55 23 66 40 48 65 57 73 80 50Z',I))
      +l('M96 19V172M44 82 96 121 148 82',G,7)+p('M96 10 86 31H106Z',I)+l('M79 144H113M82 153H110M86 162H106',B,2),
    MOB:stele(), AMO:stone('ammon'), EDM:rock('sela'), QDR:g(bow(),'translate(13 0) scale(.9 1)'), ELA:g(referenceAnimal('serpent',G,D),'translate(192 0) scale(-1 1)'),
    MDA:g(weapon(),'translate(18 -5) scale(.82 1)'), TAB:grainAndGrapes(), CRC:pomegranate(), PAR:seatedArcher(), ARM:tiara(), ADI:tiara('adiabene'),
    CHX:ship('characene'), LKH:stone('palace')+p('M92 35H100V45H110V53H100V64H92V53H82V45H92Z',G), GHA:pennon(), RSH:pennon('liwa'), TRT:ship('tartessos'), SRD:stone('nuraghe'),
    IBE:weapon('falcata'), SYC:arethusa(), PRG:vignette('cista'), MAU:rock('atlas'), GRM:chariot(), MAS:ship('massalia'),
    BLG:g(weapon('spear'),'rotate(-15 96 96)')+g(weapon('spear'),'rotate(15 96 96)')+l('M81 117 110 125M80 124 109 132',G,3),
    ARO:ship('armorican'), AQT:branch('oak')+g(branch('oak'),'translate(192 0) scale(-1 1)')+l('M96 175V142',G,4),
    NOR:g(weapon(),'translate(31 -2) scale(.68 .82)')+p('M40 130H152L142 146H109V161H126V171H65V161H82V146H61Z',G)+l('M48 136H144M88 149H103',I,1.4),
    BOI:bull('boii'), SUE:vignette('hair'), CHE:vignette('broken'),
    CHA:g(roundShield('thureos'),'translate(-13 4) scale(.9)')+l('M145 50V138',B,4)+p('M132 133H158V153Q145 176 132 153Z',I)+l('M136 139H154M145 141V162',B,1), FRS:stone('terp'), CIM:bull('cimbri'), SCN:ship('suiones'),
    GOT:weapon('spear')+ring(96,103,22,G,5)+l('M79 88 113 118M79 118 113 88',B,2), AES:vignette('amber'),
    DLM:stone('hillfort'), SCO:g(weapon('spear'),'translate(-66 0)')+roundShield('thureos'), DRD:stone('watchtower'), VEN:g(p('M28 159 54 104H42L65 64H54L78 19 102 64H91L114 104H102L127 159H87V177H69V159Z',I)+l('M78 57V166M78 100 60 91M78 129 101 117',B,1.2),'translate(24 0)')
      +g(p('M24 159 46 111H36L55 78H45L65 43 85 78H75L94 111H84L106 159H70V177H57V159Z',G),'translate(-17 0)'),
    VAN:ship('vandal'), FRK:g(weapon('francisca'),'rotate(18 96 96)'), BGD:vignette('lawbook'),
    SAX:g(weapon('seax'),'rotate(-25 96 96)')+g(weapon('seax'),'rotate(25 96 96)'), AVA:vignette('horsetail'),
    SLV:g(weapon('axe'),'rotate(17 96 96)')+g(branch('oak'),'translate(5 65) scale(.6)'), BGR:vignette('bulgar'),
    KSH:vignette('pyramids'), NOB:g(bow('plain'),'translate(-10 0)')+g(bow('plain'),'translate(202 0) scale(-1 1)'),
    BLM:g(weapon('spear'),'rotate(-25 96 96)')+g(weapon('spear'),'rotate(25 96 96)')+p('M125 19A27 27 0 1 0 144 67A31 31 0 0 1 125 19Z',I),
    AXM:stone('aksum'), SAB:bull('saba'), HDR:incense(), SAK:vignette('cap'), CHO:stone('oasis'),
  };
  const descriptions={
    PAR:'An actual seated archer, with a drawn bow, throne, trouser folds and a separate diademed head, replacing the isolated bow and empty seat.',
    SYC:'An Arethusa-inspired profile with dressed hair, earring and four dolphins; the portrait is an original drawing after the recorded coin motif.',
    CRT:'A seven-circuit labyrinth with an open entrance and connected curved walls, replacing the square spiral.',
    JDH:'A rampant lion with articulated paws, a curling tufted tail, separate mane locks and an open mouth, engraved in gold and ivory.',
    ROM:'A raised-wing aquila above the retained outlined SPQR inscription on its own crossbar. Feather groups, head, claws and tail remain separate contours.',
    MOA:'A weathered round-headed stele with varied surviving incision fragments and cracks. The marks supply surface texture, not a transcription.',
    MOB:'A round-headed Mesha-stele-inspired stone with irregular worn incision fragments. No readable inscription or invented transcription is asserted.',
    ELM:'A coiled serpent with a separate open head, scales and intertwined body contours. This is a heraldic game adaptation of the existing Elamite snake association, not a copy of an Elamite seal.',
    ELA:'A coiled serpent with retained scale, jaw and knotted-body contours, mirrored for this court. The snake-throne association remains a regional art analogy; the heraldic composition is a game adaptation.',
    BLG:'Two leaf-bladed javelins cross at a bound grip, with separate sockets, shafts and ferrules. This is an invented military composition for the Belgic court.',
    CHE:'Two military standards on broken, angled staffs, retaining hanging cloth and separate crown-like finials. This is an invented narrative device for the Cherusci.',
    AQT:'Two lobed oak sprigs with internal leaf veins and individual branches form an invented landscape device for the Aquitanian court.',
    LUK:'A broken classical column and fallen diadem replace the generic axe. This is an invented game device for the revolt.',
    GAL:'Twelve individually drawn zodiac signs surround a solar centre on the established baby-blue field. This is a retrospective synagogue-mosaic game composition.',
    ISL:'The established four-horned altar, retaining four distinct horns, its block, mouldings and stepped footing, with internal carved detail.',
    JUD:'A seven-branched menorah with seven separate cups, collared branch joins and a polygonal stepped footing. This refines the existing general Judaean identity.',
    AIS:'The established gold Magen David, with interlaced-looking bands and fine engraved edges. Its use for this alternative kingdom is a game identity.',
    MLI:'The established gold Magen David on blue, retaining the alternative Kingdom of Israel identity with outlined, engraved bands.',
  };
  for(const tag of REVISED_COURTS) {
    const old=flags[tag], motif=drawings[tag];
    if(!old||!motif)throw new Error('Missing revised court master: '+tag);
    flags[tag]={...old,viewBox:'0 0 192 192',detailed:true,
      note:descriptions[tag]||`${old.note||old.emblem.replaceAll('-',' ')+'.'} The engraved game composition now retains the object's internal construction and individual contours. It is not evidence of an attested flag.`,
      body:r(0,0,192,192,old.fieldColor)+`<g data-emblem="${old.emblem}" data-art-revision="2026-10">${motif}</g>`};
  }
  // The formable Judaean crowns inherit the complete general menorah. Their
  // chapter-specific Bar Kokhba masters remain untouched.
  for(const tag of ['EPJ','KGJ']) {
    const old=flags[tag],frame=tag==='EPJ'?rep(20,i=>c(15+i*8.5,13,1.4,G)+c(179,20+i*8,1.4,G))
      :l('M13 43V13H43M149 13H179V43M13 149V179H43M149 179H179V149',G,2);
    flags[tag]={...old,viewBox:'0 0 192 192',body:r(0,0,192,192,old.fieldColor)+frame+flags.JUD.body.slice(flags.JUD.body.indexOf('<g data-emblem=')),note:flags.JUD.note};
  }
}
