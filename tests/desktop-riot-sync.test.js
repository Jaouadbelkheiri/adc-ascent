const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {createService,validate}=require('../desktop/riot-sync');
const crypto={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from('encrypted:'+s),decryptString:b=>b.toString().slice(10)};
test('rejects unsafe proxy URLs',()=>{for(const endpoint of ['http://example.com','https://localhost:8000','https://user:pass@example.com','file:///etc/passwd'])assert.throws(()=>validate({endpoint,riotId:'P#EUW',region:'EUW1'}));});
test('encrypts token; automatically imports newest and paginated older history without exposing token',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'adc-sync-')),events=[],starts=[];
 const fetchImpl=async (u,opts)=>{assert.equal(opts.headers.Authorization,'Bearer private-secret');const start=Number(new URL(u).searchParams.get('start'));starts.push(start);return {ok:true,json:async()=>({matches:[{metadata:{matchId:'EUW1_'+start}}],timelineCandidates:[],requestedStart:start,nextStart:start>=20?null:start+10,hasMore:start<20})}};
 const sync=createService({userData:temp,safeStorage:crypto,send:(a,b)=>events.push({a,b}),fetchImpl,periodMs:9999999});
 sync.configure({endpoint:'https://example.workers.dev',riotId:'P#EUW',region:'EUW1',token:'private-secret',autoEnabled:false});
 assert.doesNotMatch(fs.readFileSync(path.join(temp,'riot-sync-settings.json'),'utf8'),/private-secret/);
 await sync.sync();await sync.sync();assert.deepEqual(starts,[0,10,0,20]);assert.equal(sync.status().historyDone,true);
 assert.equal(events.filter(e=>e.a==='riot:sync-result').length,4);
 assert(!JSON.stringify(events).includes('private-secret'));
 sync.disable();fs.rmSync(temp,{recursive:true,force:true});
});
