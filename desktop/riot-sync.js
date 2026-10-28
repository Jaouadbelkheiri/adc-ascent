'use strict';
/** Background post-game Riot history sync. Secrets are encrypted at rest using Electron safeStorage.
 * The renderer receives only match data and status, never the stored proxy bearer token.
 */
const fs=require('node:fs');const path=require('node:path');
const PERIOD_MS=3*60*1000;
const {createDirectClient}=require('./riot-direct.js');
const {createHostedClient,DEFAULT_ENDPOINT}=require('./riot-hosted.js');
function validate(config){
 const mode=['hosted','direct','proxy'].includes(config.mode)?config.mode:'proxy';
 const riotId=String(config.riotId||'').trim(),region=String(config.region||'EUW1').toUpperCase();
 if(!/^.{1,60}#[^#]{1,12}$/.test(riotId))throw Error('Enter Riot ID as GameName#Tag');
 if(!/^(EUW1|EUN1|NA1|BR1|KR|JP1|OC1|TR1|RU|LA1|LA2|VN2|TW2|SG2|PH2|TH2)$/.test(region))throw Error('Unsupported Riot platform');
 let endpoint='';
 if(mode==='hosted'){endpoint=DEFAULT_ENDPOINT;}else if(mode==='proxy'){
  const raw=String(config.endpoint||'').trim().replace(/\/$/,'');let u;
  try{u=new URL(raw)}catch{throw Error('Enter a valid HTTPS Riot proxy URL');}
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash)throw Error('Riot proxy must be an HTTPS base URL');
  endpoint=u.origin;
 }
 return {mode,endpoint,riotId,region,autoEnabled:config.autoEnabled!==false};
}
function createService({userData,safeStorage,send,fetchImpl=fetch,periodMs=PERIOD_MS}){
 const configFile=path.join(userData,'riot-sync-settings.json');
 let config=null,token=null,timer=null,busy=false,lastError=null,lastSyncedAt=null,historyCursor=null,historyDone=false,pagesScanned=0,profile=null;
 const direct=createDirectClient({fetchImpl});const hosted=createHostedClient({fetchImpl});
 function status(){return {configured:!!config&&(config.mode==='hosted'||!!token),mode:config?.mode||'hosted',autoEnabled:!!config?.autoEnabled,riotId:config?.riotId||'',region:config?.region||'EUW1',endpoint:config?.endpoint||'',lastSyncedAt,historyCursor,historyDone,pagesScanned,busy,lastError,profile};}
 function notify(){send('riot:status',status());}
 function read(){try{const saved=JSON.parse(fs.readFileSync(configFile,'utf8'));
  if(saved.mode==='hosted'||(saved.token&&safeStorage.isEncryptionAvailable())){
   config=validate(saved);token=saved.mode==='hosted'?null:safeStorage.decryptString(Buffer.from(saved.token,'base64'));lastSyncedAt=saved.lastSyncedAt||null;historyCursor=Number.isInteger(saved.historyCursor)?saved.historyCursor:null;historyDone=!!saved.historyDone;pagesScanned=Number(saved.pagesScanned||0);profile=saved.profile||null;
  }
 }catch{config=null;token=null;}}
 function persist(){if(!config)return;
  if(config.mode!=='hosted'&&!safeStorage.isEncryptionAvailable())throw Error('OS credential encryption unavailable; cannot persist API token');
  fs.mkdirSync(userData,{recursive:true});const tmp=configFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify({...config,token:config.mode==='hosted'?null:safeStorage.encryptString(token).toString('base64'),lastSyncedAt,historyCursor,historyDone,pagesScanned,profile}),{mode:0o600});fs.renameSync(tmp,configFile);
 }
 function configure(args){const validated=validate(args);const nextToken=String(args.token||'').trim();
  if(validated.mode!=='hosted'){if(!safeStorage.isEncryptionAvailable())throw Error('OS secure credential storage is unavailable');if(!nextToken&&(!token||validated.endpoint!==config?.endpoint||validated.mode!==config?.mode))throw Error(validated.mode==='direct'?'Enter your Riot Developer API key':'Enter your private proxy access token');}
  token=validated.mode==='hosted'?null:(nextToken||token);const identityChanged=validated.riotId!==config?.riotId||validated.region!==config?.region||validated.mode!==config?.mode;
  config=validated;lastError=null;if(identityChanged){historyCursor=null;historyDone=false;pagesScanned=0;profile=null;}persist();schedule();notify();return status();
 }
 async function page(start){if(config.mode==='hosted'){const body=await hosted.page(config,start,5);if(!Array.isArray(body.matches)||body.requestedStart!==start)throw Error('Unexpected hosted match response');send('riot:sync-result',body);pagesScanned++;return body;}if(config.mode==='direct'){const body=await direct.page(config,token,start);send('riot:sync-result',body);pagesScanned++;return body;}const [gameName,tagLine]=config.riotId.split('#');const u=new URL(config.endpoint+'/api/sync');u.search=new URLSearchParams({gameName,tagLine,region:config.region,start:String(start),count:'10'}).toString();
  const response=await fetchImpl(u.href,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(35000)});
  let body;try{body=await response.json()}catch{throw Error('Riot proxy returned invalid JSON')}
  if(!response.ok)throw Error(body?.error||`Riot proxy HTTP ${response.status}`);
  if(!Array.isArray(body.matches)||body.requestedStart!==start||!Array.isArray(body.timelineCandidates))throw Error('Riot proxy returned unexpected sync format');
  send('riot:sync-result',body);pagesScanned+=1;return body;
 }
 async function sync({older=false}={}){if(busy)return {skipped:'already syncing'};if(!config||(config.mode!=='hosted'&&!token))throw Error('Choose your Riot ID and server in Find Player first');busy=true;lastError=null;notify();try{
  let latest=null,history=null;
  if(config.mode==='hosted'){profile=await hosted.lookup(config);send('riot:profile',profile);}
  if(config.mode==='direct'){try{profile=await direct.lookup(config,token);send('riot:profile',profile);}catch(e){if(e.status===429||e.status===403||e.status===401||e.status===404)throw e;}}
  if(!older){latest=await page(0);if(historyCursor===null){historyCursor=latest.nextStart;historyDone=!latest.hasMore;}}
  if((older||!historyDone)&&historyCursor!==null&&historyCursor>0){history=await page(historyCursor);historyCursor=history.nextStart;historyDone=!history.hasMore;}
  lastSyncedAt=new Date().toISOString();persist();return {latest:latest?.matches.length||0,older:history?.matches.length||0,historyDone};
 }catch(e){lastError=String(e.message||e).slice(0,280);throw e;}finally{busy=false;notify();}}
 function schedule(){if(timer){clearInterval(timer);timer=null;}if(config?.autoEnabled){timer=setInterval(()=>{sync().catch(()=>{});},periodMs);timer.unref?.();}}
 function start(){read();schedule();notify();if(config?.autoEnabled)setTimeout(()=>sync().catch(()=>{}),5000);}
 async function lookup(args){const proposed=validate(args);if(proposed.mode==='hosted')return hosted.lookup(proposed);if(proposed.mode!=='direct')throw Error('Use Find Player for managed lookup');const key=String(args.token||'').trim()||(config?.mode==='direct'&&config.riotId===proposed.riotId&&config.region===proposed.region?token:null);if(!key)throw Error('Enter a Riot Developer API key');return direct.lookup(proposed,key);}
 function disable(){if(timer)clearInterval(timer);timer=null;config=null;token=null;profile=null;historyCursor=null;historyDone=false;lastError=null;try{fs.unlinkSync(configFile)}catch{}notify();return status();}
 function stop(){if(timer)clearInterval(timer);timer=null;}
 return {start,configure,status,sync,lookup,disable,stop};
}
module.exports={createService,validate,PERIOD_MS};
