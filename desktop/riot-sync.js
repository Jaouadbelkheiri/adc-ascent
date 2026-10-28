'use strict';
/** Background post-game Riot history sync. Secrets are encrypted at rest using Electron safeStorage.
 * The renderer receives only match data and status, never the stored proxy bearer token.
 */
const fs=require('node:fs');const path=require('node:path');
const PERIOD_MS=3*60*1000;
function validate(config){
 const raw=String(config.endpoint||'').trim().replace(/\/$/,'');let u;
 try{u=new URL(raw)}catch{throw Error('Enter a valid HTTPS Riot proxy URL');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash)throw Error('Riot proxy must be an HTTPS base URL');
 const riotId=String(config.riotId||'').trim(),region=String(config.region||'EUW1').toUpperCase();
 if(!/^.{1,60}#[^#]{1,12}$/.test(riotId))throw Error('Enter Riot ID as GameName#Tag');
 if(!/^(EUW1|EUN1|NA1|BR1|KR|JP1|OC1|TR1|RU|LA1|LA2|VN2|TW2|SG2|PH2|TH2)$/.test(region))throw Error('Unsupported Riot platform');
 return {endpoint:u.origin,riotId,region,autoEnabled:config.autoEnabled!==false};
}
function createService({userData,safeStorage,send,fetchImpl=fetch,periodMs=PERIOD_MS}){
 const configFile=path.join(userData,'riot-sync-settings.json');
 let config=null,token=null,timer=null,busy=false,lastError=null,lastSyncedAt=null,historyCursor=null,historyDone=false,pagesScanned=0;
 function status(){return {configured:!!config&&!!token,autoEnabled:!!config?.autoEnabled,riotId:config?.riotId||'',region:config?.region||'EUW1',endpoint:config?.endpoint||'',lastSyncedAt,historyCursor,historyDone,pagesScanned,busy,lastError};}
 function notify(){send('riot:status',status());}
 function read(){try{const saved=JSON.parse(fs.readFileSync(configFile,'utf8'));
  if(saved.token&&safeStorage.isEncryptionAvailable()){
   config=validate(saved);token=safeStorage.decryptString(Buffer.from(saved.token,'base64'));lastSyncedAt=saved.lastSyncedAt||null;historyCursor=Number.isInteger(saved.historyCursor)?saved.historyCursor:null;historyDone=!!saved.historyDone;pagesScanned=Number(saved.pagesScanned||0);
  }
 }catch{config=null;token=null;}}
 function persist(){if(!config||!token)return;
  if(!safeStorage.isEncryptionAvailable())throw Error('OS credential encryption unavailable; cannot persist proxy token safely');
  fs.mkdirSync(userData,{recursive:true});const tmp=configFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify({...config,token:safeStorage.encryptString(token).toString('base64'),lastSyncedAt,historyCursor,historyDone,pagesScanned}),{mode:0o600});fs.renameSync(tmp,configFile);
 }
 function configure(args){const validated=validate(args);const nextToken=String(args.token||'').trim();if(!safeStorage.isEncryptionAvailable())throw Error('OS secure credential storage is unavailable. Use manual session-only sync.');
  if(!nextToken&&(!token||validated.endpoint!==config?.endpoint))throw Error('Enter your private proxy access token');
  token=nextToken||token;const identityChanged=validated.riotId!==config?.riotId||validated.region!==config?.region;
  config=validated;lastError=null;if(identityChanged){historyCursor=null;historyDone=false;pagesScanned=0;}persist();schedule();notify();return status();
 }
 async function page(start){const [gameName,tagLine]=config.riotId.split('#');const u=new URL(config.endpoint+'/api/sync');u.search=new URLSearchParams({gameName,tagLine,region:config.region,start:String(start),count:'10'}).toString();
  const response=await fetchImpl(u.href,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(35000)});
  let body;try{body=await response.json()}catch{throw Error('Riot proxy returned invalid JSON')}
  if(!response.ok)throw Error(body?.error||`Riot proxy HTTP ${response.status}`);
  if(!Array.isArray(body.matches)||body.requestedStart!==start||!Array.isArray(body.timelineCandidates))throw Error('Riot proxy returned unexpected sync format');
  send('riot:sync-result',body);pagesScanned+=1;return body;
 }
 async function sync({older=false}={}){if(busy)return {skipped:'already syncing'};if(!config||!token)throw Error('Configure your proxy and Riot ID first');busy=true;lastError=null;notify();try{
  let latest=null,history=null;
  if(!older){latest=await page(0);if(historyCursor===null){historyCursor=latest.nextStart;historyDone=!latest.hasMore;}}
  if((older||!historyDone)&&historyCursor!==null&&historyCursor>0){history=await page(historyCursor);historyCursor=history.nextStart;historyDone=!history.hasMore;}
  lastSyncedAt=new Date().toISOString();persist();return {latest:latest?.matches.length||0,older:history?.matches.length||0,historyDone};
 }catch(e){lastError=String(e.message||e).slice(0,280);throw e;}finally{busy=false;notify();}}
 function schedule(){if(timer){clearInterval(timer);timer=null;}if(config?.autoEnabled){timer=setInterval(()=>{sync().catch(()=>{});},periodMs);timer.unref?.();}}
 function start(){read();schedule();notify();if(config?.autoEnabled)setTimeout(()=>sync().catch(()=>{}),5000);}
 function disable(){if(timer)clearInterval(timer);timer=null;config=null;token=null;historyCursor=null;historyDone=false;lastError=null;try{fs.unlinkSync(configFile)}catch{}notify();return status();}
 function stop(){if(timer)clearInterval(timer);timer=null;}
 return {start,configure,status,sync,disable,stop};
}
module.exports={createService,validate,PERIOD_MS};
