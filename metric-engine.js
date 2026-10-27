/* Evidence coverage for all ADC ASCENT metrics. Never substitutes statistics for skill proof. */
(function(root,factory){const api=factory(root.ADC_DATA);if(typeof module==='object'&&module.exports)module.exports=api;root.ADC_EVIDENCE=api;})(typeof window==='undefined'?globalThis:window,function(data){
'use strict';
const measured={
'MEC-01.1':['cs','duration','cs/min (whole match, not uncontested accuracy)'],
'MAC-02.3':['goldEarned','totalGoldSpent','gold/purchase timeline (not purchase quality)'],
'MAC-03.1':['objectiveTimeline','events','objective timestamps (not preparation quality)'],
'MAC-03.3':['objectiveTimeline','events','post-fight objectives (not decision quality)'],
'CMP-01.2':['items','purchase_times','item timing (not correct power-spike recognition)'],
'CMP-01.3':['items','inventory','purchased items (not build correctness)']
};
const vision={
'MEC-03.1':['relative range trajectory','proxy of spacing; attack range requires champion and patch model'],
'MEC-03.2':['projectile trajectories','dodge candidates, not verified dodges'],
'MEC-03.3':['opponent-relative trajectories','retreat movement, not verified kiting'],
'MEC-02.1':['attack animations / attacks','requires attack-event detection to evaluate orbwalking'],
'MEC-02.2':['target events','requires attack-target detection'],
'MEC-02.3':['ability cast events','requires champion-specific event detection'],
'TFC-01.2':['player/enemy positions','visual position proxy, not fight decision quality'],
'TFC-02.1':['attack events and threat model','requires attack-event + enemy cooldown evidence'],
'TFC-02.2':['target events','requires target identification and threat model'],
'TFC-02.3':['defensive spell animations','requires validated spell recognition'],
'TFC-03.2':['fight movement','retreat/re-entry candidate, not strategy proof']
};
const RULES=data.ALL.map(m=>({id:m.id,name:m.name,attribute:m.attribute,component:m.component,
 method:vision[m.id]?'visual_prototype':measured[m.id]?'riot_telemetry':'human_review_required',
 required:vision[m.id]?vision[m.id][0]:measured[m.id]?measured[m.id][0]:'decision context and rubric',
 limitation:vision[m.id]?vision[m.id][1]:measured[m.id]?measured[m.id][2]:'No reliable automatic inference from match summaries or unreviewed video.'}));
function summarize(reports=[],matches=[]){
 const events=reports.flatMap(r=>Array.isArray(r.events)?r.events:[]);
 const latest=matches[matches.length-1]||{};
 const dodges=events.filter(e=>e.kind==='skillshot'&&e.status==='dodge_candidate');
 const hits=events.filter(e=>e.kind==='skillshot'&&e.status==='collision_candidate');
 const kites=events.filter(e=>e.kind==='kiting'&&e.status==='spacing_proxy');
 return RULES.map(r=>{
  let status='needs_review',value=null,source='rubric';
  if(r.id==='MEC-03.2'&&(dodges.length+hits.length)){status='candidate';value={numerator:dodges.length,denominator:dodges.length+hits.length,unit:'dodge candidate rate'};source='video_trajectory';}
  else if(r.id==='MEC-03.3'&&kites.length){status='proxy';value={number:Math.round(kites.reduce((n,e)=>n+(e.retreat_movement_share_pct||0),0)/kites.length),unit:'retreat movement %'};source='video_trajectory';}
  else if(r.id==='MEC-01.1'&&matches.length){const cs=Number(latest.cs),minutes=Number(latest.duration);if(Number.isFinite(cs)&&Number.isFinite(minutes)&&minutes>0){status='telemetry';value={number:Math.round(cs/minutes*100)/100,unit:'CS/min (not last-hit accuracy)'};source='match_log';}}
  return {...r,status,value,source,masteryScore:null,certified:false};
 });
}
function validateReport(report){return !!(report&&report.schema==='adc-ascent.mechanics.v1'&&Array.isArray(report.events)&&report.events.length<=20000&&report.events.every(e=>['skillshot','kiting'].includes(e.kind)&&typeof e.status==='string'));}
return Object.freeze({RULES,summarize,validateReport});
});
