/* ADC ASCENT — Post-match fight candidates from Riot match-v5 timeline.
   A candidate is NOT proof that a fight happened or that positioning was wrong. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ADC_TEAMFIGHTS=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function candidates(timeline,options={}){
  const maxGapMs=options.maxGapMs??25000, radius=options.radius??2800,minKills=options.minKills??3;
  const events=(timeline?.info?.frames||[]).flatMap(f=>f.events||[])
   .filter(e=>e.type==='CHAMPION_KILL'&&Number.isFinite(e.timestamp)&&Number.isFinite(e.position?.x)&&Number.isFinite(e.position?.y))
   .sort((a,b)=>a.timestamp-b.timestamp);
  const groups=[];
  for(const e of events){let group=groups.at(-1);const near=group&&e.timestamp-group.at(-1).timestamp<=maxGapMs && group.some(p=>Math.hypot(p.position.x-e.position.x,p.position.y-e.position.y)<=radius);
   if(near)group.push(e);else groups.push([e]);}
  return groups.filter(g=>g.length>=minKills).map((g,index)=>({id:`fight-${index+1}-${g[0].timestamp}`,startMs:Math.max(0,g[0].timestamp-10000),endMs:g.at(-1).timestamp+12000,kills:g.length,participantIds:[...new Set(g.flatMap(e=>[e.killerId,e.victimId,...(e.assistingParticipantIds||[])].filter(x=>Number.isInteger(x)&&x>0)))],description:`${g.length} nearby champion kills — review candidate`,confidence:'heuristic',source:'riot_match_timeline'}));
 }
 function recordingRanges(events,recordingStartsAtGameSeconds=0){const offset=Number(recordingStartsAtGameSeconds)||0;return events.map(e=>({...e,recordingStartSec:Math.max(0,e.startMs/1000-offset),recordingEndSec:Math.max(0,e.endMs/1000-offset)})).filter(e=>e.recordingEndSec>0);}
 return {candidates,recordingRanges};
});
