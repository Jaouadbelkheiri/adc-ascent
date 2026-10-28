/** Read-only Riot API proxy. Keep RIOT_API_KEY and ADC_ACCESS_TOKEN in Worker secrets.
 * Account ID -> paginated match-v5 -> eligible ADC matches -> post-game timeline snapshots.
 * No live-game data, hidden information, or official skill-rank inference.
 */
import {candidates} from './teamfight-logic.js';
const PLATFORM={EUW1:'europe',EUN1:'europe',TR1:'europe',RU:'europe',NA1:'americas',BR1:'americas',LA1:'americas',LA2:'americas',OC1:'sea',JP1:'asia',KR:'asia',VN2:'sea',TW2:'sea',SG2:'sea',PH2:'sea',TH2:'sea'};
function headers(request,env){const origin=request.headers.get('Origin')||'';const permitted=(env.ALLOWED_ORIGINS||'http://localhost:8080,http://127.0.0.1:8080,null').split(',').map(s=>s.trim());return {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':permitted.includes(origin)?origin:'null','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,OPTIONS','Vary':'Origin'};}
function result(body,status,h){return new Response(JSON.stringify(body),{status,headers:h});}
async function riot(url,key){const r=await fetch(url,{headers:{'X-Riot-Token':key,'Accept':'application/json'}});if(!r.ok){const err=new Error(r.status===429?'Riot rate limit exceeded':`Riot request failed (${r.status})`);err.status=r.status;err.retryAfter=r.headers.get('Retry-After');throw err;}return r.json();}
export function summarizeTimeline(timeline,participantId){
 const frames=timeline?.info?.frames||[];
 function snapshot(minute){const target=minute*60000;const f=frames.find(x=>x.timestamp>=target)||null;
  if(!f||f.timestamp>target+90000)return null;
  const p=f.participantFrames?.[String(participantId)]||f.participantFrames?.[participantId];
  if(!p)return null;
  return {actualTimestampMs:f.timestamp,cs:(p.minionsKilled||0)+(p.jungleMinionsKilled||0),xp:p.xp??null,gold:p.totalGold??null,level:p.level??null};}
 return {at10:snapshot(10),at15:snapshot(15)};
}
function bottom(p){return p && (p.teamPosition==='BOTTOM'||p.individualPosition==='BOTTOM') && p.teamPosition!=='UTILITY' && p.individualPosition!=='UTILITY';}
export default {async fetch(request,env){const h=headers(request,env);if(request.method==='OPTIONS')return new Response(null,{status:204,headers:h});const u=new URL(request.url);
 if(u.pathname==='/health')return result({status:'ok',riotConfigured:!!env.RIOT_API_KEY},200,h);
 if(u.pathname!=='/api/sync'||request.method!=='GET')return result({error:'Not found'},404,h);
 if(!env.ADC_ACCESS_TOKEN||!env.RIOT_API_KEY)return result({error:'Server secrets not configured'},503,h);
 if(request.headers.get('Authorization')!=='Bearer '+env.ADC_ACCESS_TOKEN)return result({error:'Unauthorized'},401,h);
 const gameName=(u.searchParams.get('gameName')||'').trim(),tagLine=(u.searchParams.get('tagLine')||'').trim();
 const region=(u.searchParams.get('region')||'EUW1').toUpperCase();
 const count=Math.min(10,Math.max(1,Math.floor(Number(u.searchParams.get('count'))||10)));
 const start=Math.floor(Number(u.searchParams.get('start'))||0),route=PLATFORM[region];
 if(!route||!gameName||!tagLine||gameName.length>60||tagLine.length>12||!Number.isSafeInteger(start)||start<0||start>10000)return result({error:'Invalid Riot ID, platform, or pagination'},400,h);
 try{const key=env.RIOT_API_KEY;const acct=await riot(`https://${route}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,key);
 const ids=await riot(`https://${route}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(acct.puuid)}/ids?start=${start}&count=${count}`,key);
 const matches=[],timelineCandidates=[];
 for(const id of ids){
  const m=await riot(`https://${route}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(id)}`,key);
  const own=m.info?.participants?.find(p=>p.puuid===acct.puuid);
  if(!bottom(own)||Number(m.info?.gameDuration||0)<300)continue;
  const entry={metadata:{matchId:m.metadata?.matchId},info:{participants:[own],gameDuration:m.info?.gameDuration,gameCreation:m.info?.gameCreation,gameEndTimestamp:m.info?.gameEndTimestamp,gameVersion:m.info?.gameVersion,queueId:m.info?.queueId,gameMode:m.info?.gameMode,teamKills:m.info?.participants?.filter(p=>p.teamId===own.teamId).reduce((s,p)=>s+Number(p.kills||0),0)}};
  try{const timeline=await riot(`https://${route}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(id)}/timeline`,key);
   entry.timelineSummary=summarizeTimeline(timeline,own.participantId);
   for(const c of candidates(timeline))timelineCandidates.push({...c,matchId:id});
  }catch(e){if(e.status===429)throw e;entry.timelineStatus='unavailable';}
  matches.push(entry);
 }
 return result({gameName,tagLine,puuid:acct.puuid,region,requestedStart:start,scannedIds:ids.length,nextStart:ids.length===count?start+ids.length:null,hasMore:ids.length===count,matches,timelineCandidates,notes:'Post-game summary. Statistical indicators are not certified decision-quality scores.'},200,h);
 }catch(e){return result({error:e.message,retryAfter:e.retryAfter||null},e.status===429?429:e.status===404?404:502,h);}
 }};
