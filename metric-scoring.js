/* Forty-five metric gate evaluator. Only approved evidence qualifies. */
(function(root,factory){const api=factory(root.ADC_DATA);if(typeof module==='object'&&module.exports)module.exports=api;root.ADC_SCORING=api;})(typeof window==='undefined'?globalThis:window,function(data){
'use strict';
const GATES=[['F',.60,6,1],['E',.65,8,1],['D',.70,10,2],['C',.74,12,2],['B',.78,14,3],['A',.82,16,3],['S',.86,20,4],['Ascendant',.88,24,4],['Sovereign',.90,28,5],['Monarch',.92,32,6]];
const METRICS=data.ALL.map(m=>({id:m.id,name:m.name,component:m.component,attribute:m.attribute}));
const SOURCES=new Set(['calibrated_review','verified_drill','validated_video_detector','riot_event_with_verified_context']);
function scoreMetric(id,observations=[]){
 const relevant=observations.filter(o=>o.metric_id===id&&typeof o.session_id==='string'&&o.session_id.trim()&&o.eligible===true&&Number.isInteger(o.difficulty)&&o.difficulty>=0&&o.difficulty<10&&Number.isFinite(o.quality)&&o.quality>=0&&o.quality<=4);
 const gates=GATES.map(([rank,threshold,n,s],level)=>{
  const dedup=new Map();for(const o of relevant.filter(x=>x.difficulty>=level)){const key=String(o.evidence_id||'').trim();if(key&&!dedup.has(key))dedup.set(key,o);}
  const values=[...dedup.values()],approved=values.filter(o=>SOURCES.has(o.source)&&o.review_status==='approved');
  const sessions=new Set(approved.map(o=>o.session_id));const good=approved.filter(o=>o.quality>=3).length;
  const ratio=approved.length?good/approved.length:null;
  return {rank,difficulty:level,required:n,min_sessions:s,minimum_accuracy:threshold,assessed:values.length,verified:approved.length,
    sessions:sessions.size,successes:good,accuracy:ratio===null?null:Math.round(ratio*1000)/10,
    passed:approved.length>=n&&sessions.size>=s&&ratio>=threshold,
    evidence_status:approved.length?'verified_observations':values.length?'provisional_only':'missing'};
 });
 return {metric_id:id,highest_qualified_tier:gates.reduce((v,g)=>g.passed?g.rank:v,null),gates};
}
function scoreAll(observations=[]){
 const metrics=METRICS.map(m=>({...m,...scoreMetric(m.id,observations)}));
 const components=[...new Set(METRICS.map(m=>m.component))].map(name=>{
  const children=metrics.filter(m=>m.component===name);
  const level=Math.min(...children.map(m=>GATES.findIndex(g=>g[0]===m.highest_qualified_tier)));
  return {component:name,attribute:children[0].attribute,rank:level>=0?GATES[level][0]:null,metrics:children.map(m=>m.id)};
 });
 const attributes=[...new Set(METRICS.map(m=>m.attribute))].map(name=>{
  const children=components.filter(c=>c.attribute===name),level=Math.min(...children.map(c=>GATES.findIndex(g=>g[0]===c.rank)));
  return {attribute:name,rank:level>=0?GATES[level][0]:null};
 });
 return {schema:'adc-ascent.scoring.v1',total_metrics:metrics.length,scored_metrics:metrics.filter(m=>m.highest_qualified_tier!==null).length,
  metrics,components,attributes,policy:'Evidence-only. Never infer unobserved skill performance.'};
}
return Object.freeze({GATES,METRICS,scoreMetric,scoreAll});
});
