/** Cloudflare Worker: private, read-only Riot match-v5 adapter.
 * Secrets: RIOT_API_KEY, ADC_ACCESS_TOKEN. Never send Riot API keys to the client.
 * Deploy only after registering the app and obtaining valid Riot credentials.
 */
import {candidates} from './teamfight-logic.js';
const PLATFORM={EUW1:'europe',EUN1:'europe',TR1:'europe',RU:'europe',NA1:'americas',BR1:'americas',LA1:'americas',LA2:'americas',OC1:'sea',JP1:'asia',KR:'asia',VN2:'sea',TW2:'sea',SG2:'sea',PH2:'sea',TH2:'sea'};
function headers(request,env){const origin=request.headers.get('Origin')||'';const permitted=(env.ALLOWED_ORIGINS||'http://localhost:8080,http://127.0.0.1:8080,null').split(',').map(s=>s.trim());return {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':permitted.includes(origin)?origin:'null','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,OPTIONS','Vary':'Origin'};}
function result(body,status,h){return new Response(JSON.stringify(body),{status,headers:h});}
async function riot(url,key){const r=await fetch(url,{headers:{'X-Riot-Token':key,'Accept':'application/json'}});if(!r.ok){const err=new Error(r.status===429?'Riot rate limit exceeded':`Riot request failed (${r.status})`);err.status=r.status;throw err;}return r.json();}
export default {async fetch(request,env){const h=headers(request,env);if(request.method==='OPTIONS')return new Response(null,{status:204,headers:h});const u=new URL(request.url);if(u.pathname==='/health')return result({status:'ok',riotConfigured:!!env.RIOT_API_KEY},200,h);
 if(u.pathname!=='/api/sync'||request.method!=='GET')return result({error:'Not found'},404,h);
 if(!env.ADC_ACCESS_TOKEN||!env.RIOT_API_KEY)return result({error:'Server secrets not configured'},503,h);
 if(request.headers.get('Authorization')!=='Bearer '+env.ADC_ACCESS_TOKEN)return result({error:'Unauthorized'},401,h);
 const gameName=(u.searchParams.get('gameName')||'').trim(),tagLine=(u.searchParams.get('tagLine')||'').trim(),region=(u.searchParams.get('region')||'EUW1').toUpperCase(),count=Math.min(10,Math.max(1,Number(u.searchParams.get('count'))||10));const route=PLATFORM[region];
 if(!route||!gameName||!tagLine||gameName.length>60||tagLine.length>12)return result({error:'Invalid Riot ID or platform'},400,h);
 try{const key=env.RIOT_API_KEY;const acct=await riot(`https://${route}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,key);
 const ids=await riot(`https://${route}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(acct.puuid)}/ids?start=0&count=${count}`,key);
 // Pace requests rather than firing many concurrent calls against developer API rate limits.
 const matches=[],timelineCandidates=[];
 for(const id of ids){try{const m=await riot(`https://${route}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(id)}`,key);const own=m.info?.participants?.find(p=>p.puuid===acct.puuid);if(own && (own.teamPosition==='BOTTOM'||own.individualPosition==='BOTTOM'))matches.push({metadata:{matchId:m.metadata?.matchId},info:{participants:[own],gameDuration:m.info?.gameDuration,gameCreation:m.info?.gameCreation}});}catch(e){if(e.status===429)throw e;}}
 for(const m of matches.slice(0,3)){try{const timeline=await riot(`https://${route}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(m.metadata.matchId)}/timeline`,key);for(const c of candidates(timeline))timelineCandidates.push({...c,matchId:m.metadata.matchId});}catch(e){if(e.status===429)throw e;}}
 return result({gameName,tagLine,puuid:acct.puuid,region,matches,timelineCandidates,notes:'Post-game only. Timeline markers are unverified candidates.'},200,h);
 }catch(e){return result({error:e.message},e.status===429?429:e.status===404?404:502,h);}
 }};
