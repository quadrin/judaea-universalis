import { REFERENCE_MASTERS } from './reference_masters.js';
// Original engraved masters. Coordinates are 192 units; callers retain every
// contour at every size. Shared construction is varied by the object's form.
export const G = '#e7bc64', I = '#f4e6be', B = '#bb8045', D = '#49372d', S = '#d5e2e7';
export const p = (d, fill = G) => `<path d="${d}" fill="${fill}"/>`;
export const l = (d, ink = D, w = 1.4) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const c = (x,y,r,fill=G) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
export const r = (x,y,w,h,fill=G) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
export const g = (body,t) => `<g transform="${t}">${body}</g>`;
export const rep = (n,f) => Array.from({length:n},(_,i)=>f(i)).join('');
export const mirror = s => s+g(s,'translate(192 0) scale(-1 1)');
export const ring = (x,y,rad,ink=G,w=2) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="${ink}" stroke-width="${w}"/>`;
export function star(x,y,n=5,rad=12,inner=5,ink=G) {
  return p(rep(n*2,i=>{const a=-Math.PI/2+i*Math.PI/n,h=i%2?inner:rad;return `${i?'L':'M'}${(x+Math.cos(a)*h).toFixed(3)} ${(y+Math.sin(a)*h).toFixed(3)}`;})+'Z',ink);
}
export function branch(type='olive',ink=G) {
  return l('M96 170C55 151 29 105 37 49',ink,2.3)
    +rep(9,i=>{const t=i/8,x=36+60*t*t,y=49+113*t,a=-18+45*t;
      const leaf=type==='oak'?p('M0 0C-6 0-8-3-7-6C-15-4-19-11-14-15C-20-20-15-27-9-23C-7-31 1-27 0-19C8-22 12-15 6-10C12-7 6-1 0 0Z',ink)
        :p('M0 0C-11-1-19-9-18-16C-8-16-1-7 0 0ZM0 0C7-10 16-12 23-9C20 0 10 3 0 0Z',ink);
      return g(leaf+l('M-12-12 0 0 17-7',B,.6),`translate(${x} ${y}) rotate(${a}) scale(${1-t*.2})`);
    });
}
export function crown(type='royal',ink=G) {
  const base=p('M49 66Q96 78 143 66L147 82Q96 95 45 82Z',ink)
    +l('M48 73Q96 85 144 73',D,1.2)+rep(9,i=>c(53+i*10.7,78+Math.sin(i*Math.PI/8)*6,1.6,I));
  if(type==='mural')return p('M46 52V30H61V40H76V25H91V40H105V25H120V40H135V30H150V52L143 76H53Z',ink)+l('M51 58H145M61 42V58M78 43V58M95 42V58M112 42V58M129 42V58',D,1)+base;
  if(type==='laurel')return g(branch('olive',ink),'translate(10 -8) scale(.5)')+g(branch('olive',ink),'translate(182 -8) scale(-.5 .5)');
  return p('M47 64 37 30 60 44 77 24 96 42 115 24 132 44 155 30 145 64Z',ink)
    +mirror(l('M51 59 45 40 63 52 77 33 87 48',I,1.5))
    +[37,77,115,155].map((x,i)=>c(x,i===0||i===3?29:24,4,ink)).join('')
    +p('M91 8H101V17H110V26H101V36H91V26H82V17H91Z',ink)+base;
}
export function shield(body,field='#224b88',shape='heater') {
  const d=shape==='round'?'M96 51A52 52 0 1 0 96 155A52 52 0 1 0 96 51Z':'M45 49Q96 61 147 49V104C147 139 121 161 96 174C71 161 45 139 45 104Z';
  const id='shield-'+[...body+field+shape].reduce((h,ch)=>Math.imul(h^ch.charCodeAt(0),16777619)>>>0,2166136261).toString(16);
  return `<defs><clipPath id="${id}">${p(d,I)}</clipPath></defs>`+p(d,G)+g(p(d,field),'translate(5.76 6.24) scale(.94)')+`<g clip-path="url(#${id})">${body}</g>`;
}
export function referenceAnimal(name,ink=G,cut=D) {
  return REFERENCE_MASTERS[name].replaceAll('__INK__',ink).replaceAll('__CUT__',cut);
}
export function eagle({ink=G,cut=D,two=false,raised=false}={}) {
  return g(referenceAnimal('eagle',ink,cut),raised?'translate(0 -3) scale(1 1.025)':'');
}
export function lion(ink=G,cut=D,{sword=false,twoTails=false}={}) {
  return referenceAnimal('lion',ink,cut)
    +(twoTails?l('M135 121C173 135 181 100 161 97Q146 96 153 82',ink,3):'')
    +(sword?g(weapon('sword'),'translate(4 -6) scale(.35 .65)'):'');
}
export function weapon(type='sword',ink=I) {
  let blade;
  if(type==='falcata')blade=p('M89 124C65 94 70 69 94 46C109 32 113 20 107 12C143 27 131 57 110 77C97 92 94 108 100 124Z',ink)+l('M91 114C79 88 111 59 116 38',B,1.3);
  else if(type==='axe'||type==='francisca')blade=p(type==='axe'?'M91 38C66 31 38 39 35 58C46 79 66 84 91 71Z':'M91 38C74 22 44 26 33 40L41 71C62 63 75 69 91 58Z',ink)+l('M42 45Q64 38 83 46M43 65Q61 59 78 62',B,1.3);
  else if(type==='spear')blade=p('M96 11C78 34 78 51 92 66H100C114 51 114 34 96 11Z',ink)+l('M96 19V65',B,1.3);
  else if(type==='sabre')blade=p('M91 119C64 101 65 66 80 31L88 19C82 58 76 87 101 111Z',ink)+l('M83 43Q70 87 96 111',B,1.3);
  else blade=p(type==='seax'?'M84 24H101V97L88 124 84 118Z':'M96 11 104 25V113L96 126 88 113V25Z',ink)+l('M96 25V111M91 28V104',B,1.1);
  if(type==='spear')return blade+r(93,64,6,108,B)+rep(5,i=>l(`M92 ${65+i*3}H100`,G,1));
  if(type==='axe'||type==='francisca')return r(91,22,8,149,B)+l('M94 27V163',I,.8)+blade+rep(5,i=>l(`M91 ${132+i*5}H99`,D,1));
  return blade+p('M72 121Q96 114 120 121L117 131H75Z',G)+r(91,131,10,31,B)
    +rep(6,i=>l(`M91 ${134+i*4}l10 2`,D,1))+p('M87 162H105L109 169 102 177H90L83 169Z',G)+c(96,169,3,I);
}
export function bow(type='quiver') {
  const b=l('M64 19C26 48 28 72 47 95C26 119 28 146 64 175',G,5)
    +l('M64 19 91 95 64 175',I,1.6)+l('M33 95H136',I,2)+p('M136 88 151 95 136 102Z',I)
    +l('M45 79 50 83M44 109 49 105M42 90 49 94',B,1.3);
  return b+(type==='quiver'?p('M111 103 142 109 131 169 103 163Z',B)+l('M111 109 140 115M109 116 138 122M116 104 127 58M124 106 138 62M132 108 147 68',I,2)+rep(3,i=>p(`M${125+i*10} ${59+i*5}l-4-7 6 2 2 7Z`,I)):'');
}
export function anchor(type='stock',ink=G) {
  return ring(96,31,12,ink,6)+r(92,44,8,106,ink)+p('M59 66H133V74H59Z',ink)
    +p(type==='stock'?'M96 158C64 155 38 130 37 102L57 116 51 125Q67 145 96 146Q125 145 141 125L135 116 155 102C154 130 128 155 96 158Z':'M96 158C53 153 27 134 24 112L49 118 43 125Q63 143 96 143Q129 143 149 125L143 118 168 112C165 134 139 153 96 158Z',ink)
    +l('M96 51V142M65 69H127M49 120Q64 143 88 149M143 120Q128 143 104 149',I,1.2)
    +l('M87 49H105M87 56H105M88 133H104',B,1.2);
}
export function tiara(style='artaxiad') {
  const f=style==='adiabene'?'#283747':'#9b2942';
  return p(style==='adiabene'?'M48 61 53 30 75 48 96 22 117 48 139 30 144 61 136 144H56Z':'M50 60 60 25 78 44 96 15 114 44 132 25 142 60 135 143H57Z')
    +p('M56 88 48 137 34 164 29 153 40 88ZM136 88 144 137 158 164 163 153 152 88Z',I)
    +p('M59 62Q96 70 133 62L129 132H63Z',I)+star(96,92,8,24,11,f)
    +rep(11,i=>c(66+i*6,136,1.8,f))+l('M63 120H129M62 127H130M68 72 66 113M124 72 126 113',B,1.2)
    +mirror(p('M79 89Q72 81 68 88Q68 95 78 96Z',G)+l('M73 86 79 91',B,1));
}
