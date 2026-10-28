/* ADC ASCENT Analytics Hub — descriptive metrics derived from the user's own Riot matches.
   Does not copy proprietary scores or claim rank-wide benchmarks without a reference dataset. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ADC_ANALYTICS=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const num=x=>finite(x)?x:null;
const round=(v,d=2)=>finite(v)?Math.round(v*10**d)/10**d:null;
const mean=xs=>{const v=xs.filter(finite);return v.length?round(v.reduce((a,b)=>a+b,0)/v.length):null};
const ratio=(a,b)=>b?round(a/b*100,1):null;
const safeDiv=(a,b)=>finite(a)&&finite(b)&&b>0?round(a/b):null;
const time=x=>new Date(`${x||''}T12:00:00Z`).getTime();
const queues={420:'Solo/Duo',440:'Flex',400:'Normal Draft',430:'Normal Blind',490:'Quickplay',1700:'Arena'};
function enrich(p={},info={}){
  const teamKills=Number(info.teamKills);
  const items=Array.from({length:7},(_,i)=>p[`item${i}`]).filter(x=>Number.isInteger(x)&&x>0);
  return {gold:num(p.goldEarned),damage:num(p.totalDamageDealtToChampions),vision:num(p.visionScore),wardsPlaced:num(p.wardsPlaced),wardsKilled:num(p.wardsKilled),damageToObjectives:num(p.damageDealtToObjectives),damageToTurrets:num(p.damageDealtToTurrets),totalDamageTaken:num(p.totalDamageTaken),teamKills:finite(teamKills)?teamKills:null,killParticipation:finite(teamKills)&&teamKills>0?round((Number(p.kills||0)+Number(p.assists||0))/teamKills*100,1):null,items,perkStyles:Array.isArray(p.perks?.styles)?p.perks.styles.map(x=>x.style).filter(Number.isInteger):[],summonerSpells:[p.summoner1Id,p.summoner2Id].filter(Number.isInteger),lane:p.teamPosition||p.individualPosition||info.role||'UNKNOWN'};
}
function norm(m){
 const dur=Number(m.duration),min=finite(dur)&&dur>0?dur:null;
 const d=m.detail||{},s=m.signals||{};
 const damage=finite(d.damage)?d.damage:null,gold=finite(d.gold)?d.gold:null,vision=finite(d.vision)?d.vision:null;
 const cs=m.cs==null?null:finite(Number(m.cs))?Number(m.cs):null;
 return {id:m.id,riotMatchId:m.riotMatchId||null,date:m.date||'',champion:m.champion||'Unknown',win:!!m.win,queueId:m.queueId??null,queue:queues[m.queueId]||'Unspecified',role:m.role||d.lane||'UNKNOWN',isADC:m.isADC!==false,kills:Number(m.kills)||0,deaths:Number(m.deaths)||0,assists:Number(m.assists)||0,duration:min,cs,csPerMinute:finite(s.csPerMinute)?s.csPerMinute:safeDiv(cs,min),goldPerMinute:finite(s.goldPerMinute)?s.goldPerMinute:safeDiv(gold,min),damagePerMinute:finite(s.damagePerMinute)?s.damagePerMinute:safeDiv(damage,min),deathsPer10:finite(s.deathsPer10)?s.deathsPer10:safeDiv((Number(m.deaths)||0)*10,min),visionPerMinute:finite(s.visionScorePerMinute)?s.visionScorePerMinute:safeDiv(vision,min),gold,damage,vision,killParticipation:num(d.killParticipation),csAt10:num(s.csAt10),csAt15:num(s.csAt15),goldAt15:num(s.goldAt15),xpAt10:num(s.xpAt10),skillshotsDodged:num(s.skillshotsDodged),items:Array.isArray(d.items)?d.items:[],perkStyles:Array.isArray(d.perkStyles)?d.perkStyles:[],source:m.source||'manual',patch:m.patch||'',demo:!!m.demo};
}
function select(records=[],filters={}){
 let a=records.map(norm).filter(m=>filters.role==='ALL'||m.isADC);
 if(filters.queue==='RANKED')a=a.filter(m=>m.queueId===420||m.queueId===440);
 if(filters.queue==='SOLO')a=a.filter(m=>m.queueId===420);
 if(filters.queue==='FLEX')a=a.filter(m=>m.queueId===440);
 if(filters.champion&&filters.champion!=='ALL')a=a.filter(m=>m.champion===filters.champion);
 if(filters.result==='WIN')a=a.filter(m=>m.win);
 if(filters.result==='LOSS')a=a.filter(m=>!m.win);
 a.sort((a,b)=>time(b.date)-time(a.date)||String(b.id).localeCompare(String(a.id)));
 if(Number(filters.last)>0)a=a.slice(0,Number(filters.last));
 return a;
}
function aggregate(games=[]){const n=games.length,w=games.filter(m=>m.win).length;return {games:n,wins:w,losses:n-w,winRate:ratio(w,n),kda:n?round((games.reduce((s,m)=>s+m.kills+m.assists,0))/Math.max(1,games.reduce((s,m)=>s+m.deaths,0))):null,kills:mean(games.map(m=>m.kills)),deaths:mean(games.map(m=>m.deaths)),assists:mean(games.map(m=>m.assists)),csPerMinute:mean(games.map(m=>m.csPerMinute)),goldPerMinute:mean(games.map(m=>m.goldPerMinute)),damagePerMinute:mean(games.map(m=>m.damagePerMinute)),visionPerMinute:mean(games.map(m=>m.visionPerMinute)),killParticipation:mean(games.map(m=>m.killParticipation)),csAt10:mean(games.map(m=>m.csAt10)),csAt15:mean(games.map(m=>m.csAt15)),goldAt15:mean(games.map(m=>m.goldAt15)),skillshotsDodged:mean(games.map(m=>m.skillshotsDodged))};}
function byChampion(games){return [...new Set(games.map(m=>m.champion))].map(champion=>({champion,...aggregate(games.filter(m=>m.champion===champion))})).sort((a,b)=>b.games-a.games||a.champion.localeCompare(b.champion));}
function compare(games){const recent=games.slice(0,10),previous=games.slice(10,20);const a=aggregate(recent),b=aggregate(previous);const deltas={};for(const k of ['winRate','csPerMinute','goldPerMinute','damagePerMinute','visionPerMinute','deaths','kda'])deltas[k]=recent.length>=5&&previous.length>=5&&finite(a[k])&&finite(b[k])?round(a[k]-b[k]):null;return {recent:a,previous:b,deltas,comparable:recent.length>=5&&previous.length>=5};}
function insights(games){const out=[];const diff=compare(games);if(games.length<5)return [{kind:'info',title:'Build a baseline',text:'Import at least five ADC matches to begin personal trend comparisons. No score is estimated from missing data.',metric:null}];
 const {deltas}=diff;
 if(finite(deltas.csPerMinute)&&deltas.csPerMinute<-.45)out.push({kind:'review',title:'Farming trend declined',text:`CS/min decreased by ${Math.abs(deltas.csPerMinute).toFixed(2)} versus the previous 10 games. Review available CS and lane pressure before deciding why.`,metric:'MEC-01.1'});
 if(finite(deltas.deaths)&&deltas.deaths>.6)out.push({kind:'review',title:'More deaths recently',text:`Deaths/game increased by ${deltas.deaths.toFixed(1)}. Review deaths for avoidable positioning and vision errors; not every death is a mistake.`,metric:'TFC-03.3'});
 if(finite(deltas.goldPerMinute)&&deltas.goldPerMinute< -45)out.push({kind:'review',title:'Economy trend declined',text:`Gold/min decreased by ${Math.abs(deltas.goldPerMinute).toFixed(0)}. Compare recalls, wave access and game context.`,metric:'MAC-02.3'});
 if(!out.length){const recent=games.slice(0,10);const small=recent.filter(m=>m.csPerMinute!==null).length;out.push({kind:'info',title:'Focus your next review',text:`${games.length} ADC games available. Review one early recall, one midgame rotation and one teamfight. ${small} of the latest ${recent.length} games have farm data.`,metric:'LAN-03.2'});}
 return out;
}
function evidence(games){const fields=['csPerMinute','goldPerMinute','damagePerMinute','visionPerMinute','killParticipation','csAt10','csAt15','goldAt15','xpAt10','skillshotsDodged'];return fields.map(key=>({key,available:games.filter(x=>finite(x[key])).length,total:games.length}));}
return Object.freeze({enrich,norm,select,aggregate,byChampion,compare,insights,evidence,queues});
});
