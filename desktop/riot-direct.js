'use strict';
/** Personal, server-side (Electron main process) Riot API adapter.
 * Riot API keys never reach a hosted site, page URL, export or match event.
 * All data comes from completed games only.
 */
const PLATFORM=Object.freeze({EUW1:'europe',EUN1:'europe',TR1:'europe',RU:'europe',NA1:'americas',BR1:'americas',LA1:'americas',LA2:'americas',OC1:'sea',JP1:'asia',KR:'asia',VN2:'sea',TW2:'sea',SG2:'sea',PH2:'sea',TH2:'sea'});
const encode=encodeURIComponent;
function splitRiotId(riotId){const i=riotId.lastIndexOf('#');if(i<1||i===riotId.length-1)throw Error('Use GameName#Tag');return [riotId.slice(0,i),riotId.slice(i+1)];}
function bottom(p){return p&&(p.teamPosition==='BOTTOM'||p.individualPosition==='BOTTOM')&&p.teamPosition!=='UTILITY'&&p.individualPosition!=='UTILITY';}
function summarizeTimeline(timeline,participantId){const frames=timeline?.info?.frames||[];
 function at(minutes){const target=minutes*60000,frame=frames.find(f=>Number(f.timestamp)>=target);if(!frame||frame.timestamp>target+90000)return null;const p=frame.participantFrames?.[String(participantId)];if(!p)return null;return {actualTimestampMs:frame.timestamp,cs:(p.minionsKilled||0)+(p.jungleMinionsKilled||0),xp:p.xp??null,gold:p.totalGold??null,level:p.level??null};}
 return {at10:at(10),at15:at(15)};}
function findFightCandidates(timeline,matchId){const events=(timeline?.info?.frames||[]).flatMap(f=>(f.events||[]).filter(e=>e.type==='CHAMPION_KILL').map(e=>({...e,timestamp:Number(e.timestamp||f.timestamp)}))).sort((a,b)=>a.timestamp-b.timestamp);const out=[];
 for(let i=0;i<events.length;i++){const nearby=events.slice(i).filter(e=>e.timestamp-events[i].timestamp<=25000&&(!e.position||!events[i].position||Math.hypot((e.position.x||0)-(events[i].position.x||0),(e.position.y||0)-(events[i].position.y||0))<=2800));if(nearby.length<3)continue;const participants=new Set();for(const e of nearby){participants.add(e.killerId);participants.add(e.victimId);for(const a of e.assistingParticipantIds||[])participants.add(a);}
 const id=matchId+':'+events[i].timestamp;if(!out.some(x=>Math.abs(x.startMs-events[i].timestamp)<25000))out.push({id,matchId,startMs:Math.max(0,events[i].timestamp-12000),endMs:nearby.at(-1).timestamp+10000,kills:nearby.length,participantIds:[...participants].filter(Number.isFinite),source:'timeline_heuristic'});}
 return out.slice(0,50);}
function createDirectClient({fetchImpl=fetch}={}){
 let cached={key:'',account:null};
 async function get(path,region,key,platform=false){const cluster=platform?region:PLATFORM[region];if(!cluster)throw Error('Unknown League platform');const uri=`https://${cluster.toLowerCase()}.api.riotgames.com${path}`;const response=await fetchImpl(uri,{headers:{'X-Riot-Token':key,'Accept':'application/json'},signal:AbortSignal.timeout(25000)});
  if(!response.ok){const status=response.status;const reason=status===403||status===401?'Riot API key rejected or expired':status===404?'Riot ID or account not found':status===429?'Riot API rate limit reached':`Riot API request failed (${status})`;const err=Error(reason);err.status=status;err.retryAfter=response.headers?.get?.('Retry-After')||null;throw err;}
  return response.json();}
 async function account(config,key){const [gameName,tagLine]=splitRiotId(config.riotId);const identity=config.region+'|'+config.riotId;if(cached.account&&cached.key===identity)return cached.account;const cluster=PLATFORM[config.region];const a=await get(`/riot/account/v1/accounts/by-riot-id/${encode(gameName)}/${encode(tagLine)}`,config.region,key);if(!a.puuid)throw Error('Riot did not return an account PUUID');cached={key:identity,account:{gameName:a.gameName||gameName,tagLine:a.tagLine||tagLine,puuid:a.puuid,region:config.region,cluster}};return cached.account;}
 async function lookup(config,key){const a=await account(config,key);let summoner=null,ranked=[];
  try{summoner=await get(`/lol/summoner/v4/summoners/by-puuid/${encode(a.puuid)}`,config.region,key,true)}catch(e){if(e.status===429||e.status===403||e.status===401)throw e;}
  try{ranked=await get(`/lol/league/v4/entries/by-puuid/${encode(a.puuid)}`,config.region,key,true)}catch(e){if(e.status===429||e.status===403||e.status===401)throw e;}
  return {gameName:a.gameName,tagLine:a.tagLine,puuid:a.puuid,region:config.region,profileIconId:summoner?.profileIconId??null,summonerLevel:summoner?.summonerLevel??null,ranked:Array.isArray(ranked)?ranked.map(({queueType,tier,rank,leaguePoints,wins,losses})=>({queueType,tier,rank,leaguePoints,wins,losses})):[]};}
 async function page(config,key,start,count=10){const a=await account(config,key);const limit=Math.min(10,Math.max(1,count));const ids=await get(`/lol/match/v5/matches/by-puuid/${encode(a.puuid)}/ids?start=${start}&count=${limit}`,config.region,key);const matches=[],timelineCandidates=[];
  for(const id of ids){const m=await get(`/lol/match/v5/matches/${encode(id)}`,config.region,key);const own=m.info?.participants?.find(p=>p.puuid===a.puuid);if(!own||Number(m.info?.gameDuration||0)<300)continue;
   const entry={metadata:{matchId:m.metadata?.matchId||id},info:{participants:[own],gameDuration:m.info.gameDuration,gameCreation:m.info.gameCreation,gameEndTimestamp:m.info.gameEndTimestamp,gameVersion:m.info.gameVersion,queueId:m.info.queueId,gameMode:m.info.gameMode,isADC:!!bottom(own),role:own.teamPosition||own.individualPosition||'UNKNOWN',teamKills:m.info.participants.filter(p=>p.teamId===own.teamId).reduce((s,p)=>s+Number(p.kills||0),0)}};
   try{const timeline=await get(`/lol/match/v5/matches/${encode(id)}/timeline`,config.region,key);entry.timelineSummary=summarizeTimeline(timeline,own.participantId);timelineCandidates.push(...findFightCandidates(timeline,id));}catch(e){if(e.status===429||e.status===403||e.status===401)throw e;entry.timelineStatus='unavailable';}
   matches.push(entry);
  }
  return {gameName:a.gameName,tagLine:a.tagLine,puuid:a.puuid,region:config.region,requestedStart:start,scannedIds:ids.length,nextStart:ids.length===limit?start+ids.length:null,hasMore:ids.length===limit,matches,timelineCandidates,notes:'Post-game statistics; not direct proof of mechanical or decision mastery.'};}
 return {lookup,page};
}
module.exports={createDirectClient,PLATFORM,splitRiotId,summarizeTimeline,findFightCandidates};
