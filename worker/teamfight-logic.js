export function candidates(timeline,{maxGapMs=25000,radius=2800,minKills=3}={}){
 const events=(timeline?.info?.frames||[]).flatMap(f=>f.events||[]).filter(e=>e.type==='CHAMPION_KILL'&&Number.isFinite(e.timestamp)&&Number.isFinite(e.position?.x)&&Number.isFinite(e.position?.y)).sort((a,b)=>a.timestamp-b.timestamp);
 const groups=[];for(const e of events){const g=groups.at(-1);const same=g&&e.timestamp-g.at(-1).timestamp<=maxGapMs&&g.some(p=>Math.hypot(p.position.x-e.position.x,p.position.y-e.position.y)<=radius);if(same)g.push(e);else groups.push([e]);}
 return groups.filter(g=>g.length>=minKills).map((g,i)=>({id:`fight-${i+1}-${g[0].timestamp}`,startMs:Math.max(0,g[0].timestamp-10000),endMs:g.at(-1).timestamp+12000,kills:g.length,participantIds:[...new Set(g.flatMap(e=>[e.killerId,e.victimId,...(e.assistingParticipantIds||[])].filter(x=>Number.isInteger(x)&&x>0)))],confidence:'heuristic',source:'riot_match_timeline'}));
}
