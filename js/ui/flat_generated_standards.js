import {FLAT_GENERATED_IMAGES,FLAT_GENERATED_COURTS} from './flat_generated_images.js';
import {agrippaInscription} from './judaean_standards.js';
export {FLAT_GENERATED_IMAGES,FLAT_GENERATED_COURTS};
const field=color=>`<rect width="192" height="192" fill="${color}"/>`;
const captions={
 HAS:'Double cornucopias filled with fruit and foliage around a red pomegranate with its natural pointed calyx. A detailed generated interpretation of the Hasmonean device.',
 PHO:'An ivory ancient Phoenician aleph on purple, retaining its left-facing angle crossed by a vertical stroke. The flag composition is an original game interpretation.',
 LMB:'A segmented gold crown with gem-set panels and an inner band. A retrospective Iron Crown reference; its exact early history is disputed.',
 MIZ:'The Egyptian double crown, combining the red crown and white crown on deep blue. The emblem is an original game interpretation, not an attested flag.',
 NAB:'A sandstone Petra-inspired façade with columns, central urn and broken pediment. The detailed flag composition is an original game interpretation.',
 RHO:'A red Rhodian rose with layered petals, paired green leaves and a side bud. The detailed flag composition is an original game interpretation.',
};
const image=(id,emblem,roman=false)=>`<g data-emblem="${emblem}" data-flat-generated="${id}"><image x="${roman?16:7}" y="${roman?0:7}" width="${roman?160:178}" height="${roman?160:178}" preserveAspectRatio="xMidYMid meet" href="${FLAT_GENERATED_IMAGES[id]}"/></g>`;
export function enrichFlatGeneratedStandards(flags,{romanWordmark=''}={}){
 for(const [tag,id] of Object.entries(FLAT_GENERATED_COURTS)){
  const original=flags[tag];
  if(!original||!FLAT_GENERATED_IMAGES[id])throw new Error('Missing generated flat court: '+tag);
  let device=image(id,original.emblem,tag==='ROM');
  if(tag==='AGR')device+=`<g transform="translate(28.8 0) scale(.7 1)">${agrippaInscription()}</g>`;
  if(tag==='ROM'){
   if(!romanWordmark)throw new Error('Roman wordmark missing');
   device+=`<g data-inscription="SPQR" transform="translate(22.6 127) scale(1.5 .9)"><path d="${romanWordmark}" fill="#f1ead7"/></g>`;
  }
  flags[tag]={...original,viewBox:'0 0 192 192',detailed:true,imageAsset:id,
   artworkStyle:'detailed-flat-generated',note:captions[tag]||original.note,body:field(original.fieldColor)+device};
 }
 // Founding devices remain identical through formation and chapter changes.
 for(const [tag,baseTag,kingdom] of [['EPJ','JUD',false],['KGJ','JUD',true],['EPJ_BK','JUD_BK',false],['KGJ_BK','JUD_BK',true]]){
  const original=flags[tag],base=flags[baseTag];
  if(!original||!base?.imageAsset)throw new Error('Missing inherited flat master: '+tag);
  const device=base.body.slice(base.body.indexOf('<g data-emblem='));
  const border=kingdom?'<path d="M14 38V14H38M154 14H178V38M178 154V178H154M38 178H14V154" fill="none" stroke="#f1ead7" stroke-width="2.8"/>'
   :Array.from({length:4},(_,side)=>`<g transform="rotate(${side*90} 96 96)">${Array.from({length:7},(_,i)=>`<circle cx="${16+i*7}" cy="14" r="1.4" fill="#f1ead7"/>`).join('')}</g>`).join('');
  flags[tag]={...original,viewBox:'0 0 192 192',detailed:true,imageAsset:base.imageAsset,artworkStyle:base.artworkStyle,
   source:base.source,note:original.note,body:field(original.fieldColor)+`<g data-emblem="${original.emblem}">${device}${border}</g>`};
 }
}
