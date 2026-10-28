'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {createHostedClient,DEFAULT_ENDPOINT}=require('../desktop/riot-hosted.js');
test('hosted API sends no Riot credentials and encodes account input',async()=>{
 const seen=[];const c=createHostedClient({fetchImpl:async(url,opts)=>{seen.push({url,opts});return new Response(JSON.stringify({gameName:'An ADC',tagLine:'EUW',ranked:[]}),{status:200});}});
 const p=await c.lookup({riotId:'An ADC#EUW',region:'EUW1',endpoint:DEFAULT_ENDPOINT});assert.equal(p.gameName,'An ADC');assert.equal(seen[0].opts.headers['X-Riot-Token'],undefined);assert.match(seen[0].url,/riotId=An\+ADC%23EUW/);
});
test('hosted API rejects non-OK and preserves helpful message',async()=>{const c=createHostedClient({fetchImpl:async()=>new Response(JSON.stringify({error:'Backend not configured'}),{status:503})});await assert.rejects(c.lookup({riotId:'X#EUW',region:'EUW1'}),/Backend not configured/);});
