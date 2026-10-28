/** ADC ASCENT public-style search API.
 * Riot credentials ONLY live in Cloudflare Worker secrets, never the renderer.
 * Do not enable anonymous access with Riot development or personal keys.
 * Worker rate limit binding is required to enable the API.
 */
const ROUTES=Object.freeze({EUW1:'europe',EUN1:'europe',TR1:'europe',RU:'europe',NA1:'americas',BR1:'americas',LA1:'americas',LA2:'americas',OC1:'sea',JP1:'asia',KR:'asia',VN2:'sea',TW2:'sea',SG2:'sea',PH2:'sea',TH2:'sea'});
const ALLOWED=new Set(Object.keys(ROUTES));
const json=(obj,status=200,extra={})=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...extra}});
function errorFromRiot(status,retryAfter){
 const err=new Error(status===404?'Riot account not found':status===429?'Riot rate limit reached':status===401||status===403?'Backend Riot credential missing, invalid, or expired':'Riot is temporarily unavailable');
 err.status=status===404?404:status===429?429:503;
 err.retryAfter=retryAfter;return err;
}
export function queryParams(search){
 const riotId=String(search.get('riotId')||'').trim();
 const hash=riotId.lastIndexOf('#');
 const name=riotId.slice(0,hash),tag=riotId.slice(hash+1);
 const region=String(search.get('region')||'EUW1').toUpperCase();
 if(hash<=0||!name||!tag||name.length>60||tag.length>12||!ALLOWED.has(region))throw Object.assign(Error('Enter a valid GameName#Tag and supported server'),{status:400});
 const countText=search.get('count'),startText=search.get('start');
 const count=countText===null?5:Number(countText),start=startText===null?0:Number(startText);
 if(!Number.isInteger(count)||count<1||count>5||!Number.isSafeInteger(start)||start<0||start>5000)throw Object.assign(Error('Invalid pagination; count must be 1–5'),{status:400});
 return {riotId,name,tag,region,cluster:ROUTES[region],count,start};
}
function headers(request,env){
 const origin=request.headers.get('Origin');const allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
 return {'Vary':'Origin',...(origin&&allowed.includes(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}:{})};
}
function normalizedMember(p){return {metadata:{matchId:p.id},info:{participants:[p.player],gameDuration:p.duration,gameCreation:p.createdAt,gameEndTimestamp:p.endedAt,gameVersion:p.version,queueId:p.queueId,gameMode:p.gameMode,isADC:p.isADC,role:p.role,teamKills:p.teamKills},timelineSummary:p.timelineSummary||null,timelineStatus:p.timelineStatus||null};}
function bottom(p){return (p.teamPosition==='BOTTOM'||p.individualPosition==='BOTTOM')&&p.teamPosition!=='UTILITY'&&p.individualPosition!=='UTILITY';}
function summary(t,participantId){const frames=t?.info?.frames||[];function at(minutes){const time=minutes*60000;const f=frames.find(x=>x.timestamp>=time);if(!f||f.timestamp>time+90000)return null;const p=f.participantFrames?.[String(participantId)];return p?{actualTimestampMs:f.timestamp,cs:(p.minionsKilled||0)+(p.jungleMinionsKilled||0),xp:p.xp??null,gold:p.totalGold??null,level:p.level??null}:null;}return {at10:at(10),at15:at(15)};}
function fights(t,id){const events=(t?.info?.frames||[]).flatMap(f=>(f.events||[]).filter(e=>e.type==='CHAMPION_KILL').map(e=>({...e,timestamp:Number(e.timestamp||f.timestamp)}))).sort((a,b)=>a.timestamp-b.timestamp);const out=[];for(let i=0;i<events.length;i++){const same=events.slice(i).filter(e=>e.timestamp-events[i].timestamp<=25000&&(!e.position||!events[i].position||Math.hypot(e.position.x-events[i].position.x,e.position.y-events[i].position.y)<=2800));if(same.length<3||out.some(x=>Math.abs(x.startMs-events[i].timestamp)<25000))continue;out.push({id:id+':'+events[i].timestamp,matchId:id,startMs:Math.max(0,events[i].timestamp-12000),endMs:same.at(-1).timestamp+10000,kills:same.length,source:'timeline_heuristic'});}return out.slice(0,30);}
export function createHandler({fetchImpl=fetch,cache=null}={}){
 async function riot(cluster,path,key,ttlSeconds=0){
  const url=`https://${cluster}.api.riotgames.com${path}`;
  const ck=new Request(url.replace('api.riotgames.com','cache.adcascent.invalid'));
  if(ttlSeconds&&cache){try{const hit=await cache.match(ck);if(hit)return hit.json();}catch{}}
  const response=await fetchImpl(url,{headers:{'X-Riot-Token':key,Accept:'application/json'},signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw errorFromRiot(response.status,response.headers?.get('Retry-After'));
  const data=await response.json();
  if(ttlSeconds&&cache){try{await cache.put(ck,json(data,200,{'Cache-Control':`public, max-age=${ttlSeconds}`}));}catch{}}
  return data;
 }
 async function profile(q,key){
  const account=await riot(q.cluster,`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(q.name)}/${encodeURIComponent(q.tag)}`,key,600);
  if(!account?.puuid)throw Object.assign(Error('Riot account lookup returned no PUUID'),{status:502});
  let summoner=null,ranked=[];
  try{summoner=await riot(q.region.toLowerCase(),`/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(account.puuid)}`,key,300);}catch(e){if(e.status===429)throw e;}
  try{ranked=await riot(q.region.toLowerCase(),`/lol/league/v4/entries/by-puuid/${encodeURIComponent(account.puuid)}`,key,120);}catch(e){if(e.status===429)throw e;}
  return {gameName:account.gameName||q.name,tagLine:account.tagLine||q.tag,puuid:account.puuid,region:q.region,profileIconId:summoner?.profileIconId??null,summonerLevel:summoner?.summonerLevel??null,ranked:Array.isArray(ranked)?ranked.map(({queueType,tier,rank,leaguePoints,wins,losses})=>({queueType,tier,rank,leaguePoints,wins,losses})):[]};
 }
 return async function handle(request,env){const cors=headers(request,env);const u=new URL(request.url);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(u.pathname==='/health')return json({status:'ok',riotConfigured:!!env.RIOT_API_KEY,searchEnabled:env.PUBLIC_SEARCH_ENABLED==='true'},200,cors);
  if(request.method!=='GET'||!['/api/profile','/api/matches'].includes(u.pathname))return json({error:'Not found'},404,cors);
  const origin=request.headers.get('Origin');if(origin&&!String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).includes(origin))return json({error:'Origin not allowed'},403,cors);
  if(env.PUBLIC_SEARCH_ENABLED!=='true')return json({error:'Riot search backend is not enabled yet. The administrator must configure a suitable Riot API key and access controls.'},503,cors);
  if(!env.RIOT_API_KEY||!env.SEARCH_RATE_LIMITER)return json({error:'Backend Riot credential or rate limiter is not configured'},503,cors);
  try{
   const q=queryParams(u.searchParams);
   const ip=request.headers.get('CF-Connecting-IP')||'unidentified';const limit=await env.SEARCH_RATE_LIMITER.limit({key:ip+':'+u.pathname});
   if(!limit.success)return json({error:'Too many searches. Try again shortly.'},429,{...cors,'Retry-After':'60'});
   const key=env.RIOT_API_KEY;
   if(u.pathname==='/api/profile')return json(await profile(q,key),200,{...cors,'Cache-Control':'private, max-age=60'});
   const acct=await riot(q.cluster,`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(q.name)}/${encodeURIComponent(q.tag)}`,key,600);
   if(!acct?.puuid)throw Object.assign(Error('Riot account not found'),{status:404});
   const ids=await riot(q.cluster,`/lol/match/v5/matches/by-puuid/${encodeURIComponent(acct.puuid)}/ids?start=${q.start}&count=${q.count}`,key,45);
   const matches=[],timelineCandidates=[];
   for(const id of ids){
    const m=await riot(q.cluster,`/lol/match/v5/matches/${encodeURIComponent(id)}`,key,86400);
    const own=m.info?.participants?.find(p=>p.puuid===acct.puuid);
    if(!own||Number(m.info?.gameDuration||0)<300)continue;
    const item={id,player:own,duration:m.info.gameDuration,createdAt:m.info.gameCreation,endedAt:m.info.gameEndTimestamp,version:m.info.gameVersion,queueId:m.info.queueId,gameMode:m.info.gameMode,isADC:bottom(own),role:own.teamPosition||own.individualPosition||'UNKNOWN',teamKills:m.info.participants.filter(p=>p.teamId===own.teamId).reduce((n,p)=>n+Number(p.kills||0),0),timelineSummary:null};
    try{const t=await riot(q.cluster,`/lol/match/v5/matches/${encodeURIComponent(id)}/timeline`,key,86400);item.timelineSummary=summary(t,own.participantId);timelineCandidates.push(...fights(t,id));}catch(e){if(e.status===429)throw e;item.timelineStatus='unavailable';}
    matches.push(normalizedMember(item));
   }
   return json({gameName:acct.gameName||q.name,tagLine:acct.tagLine||q.tag,puuid:acct.puuid,region:q.region,requestedStart:q.start,scannedIds:ids.length,nextStart:ids.length===q.count?q.start+ids.length:null,hasMore:ids.length===q.count,matches,timelineCandidates,notes:'Completed games only. These are match indicators, not verified mastery ranks.'},200,cors);
  }catch(e){return json({error:e.status===400||e.status===404?e.message:e.status===429?'Riot API rate limit reached':e.status===503?'Riot backend unavailable; administrator may need to refresh its API key':'Unable to retrieve Riot data',retryAfter:e.retryAfter||null},e.status===400?400:e.status===404?404:e.status===429?429:503,{...cors,...(e.retryAfter?{'Retry-After':e.retryAfter}:{})});}
 };
}
export default {async fetch(request,env){const cache=typeof caches==='undefined'?null:caches.default;return createHandler({cache})(request,env);}};
