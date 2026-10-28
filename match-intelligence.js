/* Riot post-game evidence — automatically measured statistics are NOT mastery certifications. */
(function(root,factory){const api=factory(root.ADC_DATA);if(typeof module==='object'&&module.exports)module.exports=api;root.ADC_INTELLIGENCE=api;})(typeof window==='undefined'?globalThis:window,function(data){
'use strict';
const SIGNALS={
 'MEC-01.1':['csPerMinute','CS/min','Farm secured per minute; not available-minion capture rate'],
 'MEC-03.2':['skillshotsDodged','Skillshots dodged','Riot-reported dodges; no dodgeable-opportunity denominator'],
 'LAN-01.1':['csAt10','CS at 10 minutes','Lane farm checkpoint; not wave-state recognition'],
 'LAN-01.2':['csAt15','CS at 15 minutes','Lane farm checkpoint; not wave-manipulation judgment'],
 'LAN-03.1':['xpAt10','XP at 10 minutes','Early XP checkpoint; not level-spike usage'],
 'LAN-03.2':['goldAt15','Gold at 15 minutes','Gold checkpoint; not recall-decision correctness'],
 'MAC-01.3':['visionScorePerMinute','Vision score/min','Vision activity proxy; not safe fog-of-war decision quality'],
 'MAC-02.1':['csAt15','CS at 15 minutes','Farm checkpoint; does not isolate midgame resource allocation'],
 'MAC-02.3':['goldPerMinute','Gold/min','Economy generation; not optimal spending decisions'],
 'MAC-03.3':['turretPlatesTaken','Turret plates','Objective contribution proxy; not strategic conversion quality'],
 'TFC-02.1':['damagePerMinute','Champion damage/min','Output proxy; cannot establish safe opportunities or uptime'],
 'TFC-03.3':['deathsPer10','Deaths per 10 min','Survival outcome; deaths are not automatically mistakes'],
 'CMP-01.2':['goldAt15','Gold at 15 minutes','Economy checkpoint; not recognition of power spikes'],
 'CMP-03.3':['gamesTracked','Matches tracked','Practice volume; not practice-session discipline']
};
const isNumber=x=>typeof x==='number'&&Number.isFinite(x);
const present=(x)=>isNumber(x)?x:null;
function extract(match){
 const p=match?.info?.participants?.[0]||match?.participant||{};
 const ch=p.challenges||{};
 const dur=Number(match?.info?.gameDuration||match?.durationSeconds||0);
 const minutes=dur>20000?dur/60000:dur/60;
 const cs=Number(p.totalMinionsKilled||0)+Number(p.neutralMinionsKilled||0);
 const timeline=match?.timelineSummary||{};
 const first=timeline.at10||{},second=timeline.at15||{};
 const get=(v)=>isNumber(v)?Math.round(v*100)/100:null;
 const values={
  csPerMinute:minutes>0&&isNumber(p.totalMinionsKilled)?get(cs/minutes):null,
  skillshotsDodged:present(ch.skillshotsDodged),
  csAt10:present(first.cs),csAt15:present(second.cs),
  xpAt10:present(first.xp),goldAt15:present(second.gold),
  visionScorePerMinute:minutes>0&&isNumber(p.visionScore)?get(p.visionScore/minutes):null,
  goldPerMinute:minutes>0&&isNumber(p.goldEarned)?get(p.goldEarned/minutes):null,
  turretPlatesTaken:present(ch.turretPlatesTaken),
  damagePerMinute:minutes>0&&isNumber(p.totalDamageDealtToChampions)?get(p.totalDamageDealtToChampions/minutes):null,
  deathsPer10:minutes>0&&isNumber(p.deaths)?get(p.deaths*10/minutes):null,
  gamesTracked:1
 };
 return {matchId:String(match?.metadata?.matchId||match?.matchId||''),champion:p.championName||'',patch:match?.info?.gameVersion||'',queueId:match?.info?.queueId||null,signals:values};
}
function coverage(matches=[]){
 const rows=data.ALL.map(m=>{const spec=SIGNALS[m.id];const values=spec?matches.map(x=>x?.signals?.[spec[0]]).filter(isNumber):[];
 const recent=values.length?values[0]:null;
 return {id:m.id,name:m.name,attribute:m.attribute,component:m.component,status:values.length?'automatically_measured':spec?'awaiting_riot_data':'requires_vod_or_trial',source:values.length?'riot_match_v5':'none',signal:spec?spec[1]:null,interpretation:spec?spec[2]:'No reliable Riot API measurement of this decision; requires VOD, drills, or calibrated review.',sampleCount:values.length,latest:recent};});
 return {schema:'adc-ascent.automatic-coverage.v1',total:rows.length,measured:rows.filter(x=>x.status==='automatically_measured').length,needsReview:rows.filter(x=>x.status==='requires_vod_or_trial').length,rows};
}
/** Role-specific trend reports: descriptive, not a hidden skill rating. */
function summary(records=[]){
 const all=records.filter(m=>m?.source==='riot_api').sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
 const adc=all.filter(m=>m.isADC!==false);
 const newest=adc.slice(0,10),previous=adc.slice(10,20);
 const mean=(a,select)=>{const nums=a.map(select).filter(isNumber);return nums.length?Math.round(nums.reduce((x,y)=>x+y,0)*100/nums.length)/100:null};
 const sample=(a)=>({games:a.length,winRate:a.length?Math.round(a.filter(m=>m.win).length*1000/a.length)/10:null,csPerMinute:mean(a,m=>m.signals?.csPerMinute),goldPerMinute:mean(a,m=>m.signals?.goldPerMinute),damagePerMinute:mean(a,m=>m.signals?.damagePerMinute),deathsPer10:mean(a,m=>m.signals?.deathsPer10),skillshotsDodgedPerGame:mean(a,m=>m.signals?.skillshotsDodged)});
 const byChampion=[...new Set(adc.map(m=>m.champion))].map(champion=>({champion,...sample(adc.filter(m=>m.champion===champion))})).sort((a,b)=>b.games-a.games);
 const a=sample(newest),b=sample(previous),changes={};
 if(newest.length>=5&&previous.length>=5){for(const key of ['csPerMinute','goldPerMinute','damagePerMinute','deathsPer10'])if(isNumber(a[key])&&isNumber(b[key]))changes[key]=Math.round((a[key]-b[key])*100)/100;}
 const reviewPrompts=[];
 if(isNumber(changes.csPerMinute)&&changes.csPerMinute<-.4)reviewPrompts.push('CS/min has decreased relative to your previous games. Review available farming opportunities; raw CS/min does not prove poor last-hitting.');
 if(isNumber(changes.deathsPer10)&&changes.deathsPer10>.25)reviewPrompts.push('Deaths per 10 minutes increased. Review positioning and decisions before the deaths rather than assuming each was avoidable.');
 if(!reviewPrompts.length)reviewPrompts.push('Select a match and review a lane decision, a midgame rotation, and a teamfight entry. Stats alone do not assess decision quality.');
 return {totalMatches:all.length,adcMatches:adc.length,otherRoles:all.length-adc.length,recent:a,previous:b,changes,byChampion,reviewPrompts};
}
function updateRecord(record,match){const e=extract(match);return {...record,signals:e.signals,patch:e.patch,queueId:e.queueId,source:'riot_api'};}
return Object.freeze({SIGNALS,extract,coverage,summary,updateRecord});
});
