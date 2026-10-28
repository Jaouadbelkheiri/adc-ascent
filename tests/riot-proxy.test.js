const {test}=require('node:test');const assert=require('node:assert/strict');
test('Riot Worker sync paginates and preserves correct timeline checkpoint timestamps',async()=>{
 const mod=await import('../worker/riot-proxy.js');
 const timeline={info:{frames:[{timestamp:590000,participantFrames:{'3':{minionsKilled:60,xp:4000,totalGold:4500}}},{timestamp:605000,participantFrames:{'3':{minionsKilled:75,jungleMinionsKilled:2,xp:5300,totalGold:5200}}},{timestamp:904000,participantFrames:{'3':{minionsKilled:121,jungleMinionsKilled:1,xp:7300,totalGold:7700}}}]}};
 assert.equal(mod.summarizeTimeline(timeline,3).at10.cs,77);
 assert.equal(mod.summarizeTimeline(timeline,3).at15.xp,7300);
 const old=global.fetch;const paths=[];
 global.fetch=async (url,opts)=>{paths.push(url);assert.equal(opts.headers['X-Riot-Token'],'test-key');const u=new URL(url);
  let body;if(u.pathname.includes('/by-riot-id/'))body={puuid:'puuid'};
  else if(u.pathname.includes('/by-puuid/'))body=['EUW1_42'];
  else if(u.pathname.endsWith('/timeline'))body=timeline;
  else body={metadata:{matchId:'EUW1_42'},info:{gameDuration:1830,gameCreation:1782000000000,gameVersion:'26.21',queueId:420,participants:[{puuid:'puuid',teamId:100,participantId:3,championName:'Jinx',teamPosition:'BOTTOM',kills:4,win:true,challenges:{skillshotsDodged:7}},{puuid:'other',teamId:100,kills:2}]}};
  return {ok:true,json:async()=>body};};
 try{const req=new Request('https://worker.example/api/sync?gameName=User&tagLine=EUW&region=EUW1&start=20&count=10',{headers:{Authorization:'Bearer private'}});
  const res=await mod.default.fetch(req,{ADC_ACCESS_TOKEN:'private',RIOT_API_KEY:'test-key',ALLOWED_ORIGINS:'null'});
  assert.equal(res.status,200);const body=await res.json();assert.equal(body.requestedStart,20);assert.equal(body.matches.length,1);assert.equal(body.matches[0].timelineSummary.at10.cs,77);assert.equal(body.matches[0].info.participants[0].challenges.skillshotsDodged,7);assert.equal(body.matches[0].info.teamKills,6);
  assert(paths.some(p=>p.includes('start=20')));
 }finally{global.fetch=old;}
});
