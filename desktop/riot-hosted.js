'use strict';
/** Client for the managed ADC ASCENT Worker. The user's PC needs NO Riot API key. */
const DEFAULT_ENDPOINT='https://adc-ascent-api.jaouadbelkheiri7.workers.dev';
function createHostedClient({fetchImpl=fetch}={}){
 async function get(path,config,params={}){
  const endpoint=config.endpoint||DEFAULT_ENDPOINT;
  const url=new URL(path,endpoint);
  url.search=new URLSearchParams({riotId:config.riotId,region:config.region,...params}).toString();
  const response=await fetchImpl(url.href,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(35000)});
  let data;try{data=await response.json();}catch{throw Error('ADC ASCENT backend returned an unreadable response');}
  if(!response.ok){const err=Error(data?.error||`ADC ASCENT backend returned HTTP ${response.status}`);err.status=response.status;err.retryAfter=data?.retryAfter||null;throw err;}
  return data;
 }
 return {lookup:config=>get('/api/profile',config),page:(config,start,count=5)=>get('/api/matches',config,{start:String(start),count:String(count)})};
}
module.exports={createHostedClient,DEFAULT_ENDPOINT};
