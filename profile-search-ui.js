/* OP.GG-style player search: no user API credential in the normal flow. */
(()=>{'use strict';
const API='https://adc-ascent-api.jaouadbelkheiri7.workers.dev';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const platforms=[['EUW1','EU West'],['EUN1','EU Nordic & East'],['NA1','North America'],['KR','Korea'],['TR1','Turkey'],['BR1','Brazil'],['JP1','Japan'],['OC1','Oceania'],['LA1','Latin America North'],['LA2','Latin America South'],['VN2','Vietnam']];
let last=null,notice='',busy=false,selectedId='',selectedRegion='EUW1';
const companion=()=>window.adcCompanion;
const show=message=>{notice=message;const n=document.querySelector('#player-search-status');if(n)n.textContent=message;};
function page(profile){
 const riotId=selectedId||profile?.riotId||'';const region=selectedRegion||({EUW:'EUW1',EUNE:'EUN1',NA:'NA1',KR:'KR',TR:'TR1',BR:'BR1',JP:'JP1',OCE:'OC1',LAN:'LA1',LAS:'LA2'}[profile?.region]||'EUW1');
 const solo=last?.ranked?.find(r=>r.queueType==='RANKED_SOLO_5x5');
 return `<div class="page-intro"><div><div class="eyebrow">ADC ASCENT / SUMMONER INTELLIGENCE</div><h1>FIND YOUR <span class="tint">PLAYER PROFILE</span></h1><p>Search a Riot ID, view your ranked profile and import completed matches. No Riot Developer API key needed from players.</p></div></div>
 <section class="panel search-hero"><div class="panel-body"><form id="player-search-form" class="player-search-form">
 <div class="field search-wide"><label for="player-riot-id">Riot ID</label><input id="player-riot-id" name="riotId" placeholder="GameName#Tag" value="${esc(riotId)}" required maxlength="80" autocomplete="off" /></div>
 <div class="field"><label for="player-region">League server</label><select id="player-region">${platforms.map(([id,label])=>`<option value="${id}" ${id===region?'selected':''}>${label}</option>`).join('')}</select></div>
 <button class="btn search-action" type="submit" ${busy?'disabled':''}>${busy?'SEARCHING…':'FIND PLAYER'}</button></form>
 <div class="help" id="player-search-status" role="status" aria-live="polite">${esc(notice||'Enter GameName#Tag and press Find Player. The server handles Riot API access.')}</div></div></section>
 ${last?`<section class="panel marginbottom"><div class="panel-header"><div><div class="eyebrow">RIOT PROFILE / ${esc(last.region)}</div><h3 class="panel-title">${esc(last.gameName)}<span class="tint">#${esc(last.tagLine)}</span></h3></div><span class="chip">${solo?esc(`${solo.tier} ${solo.rank} · ${solo.leaguePoints} LP`):'RANK UNAVAILABLE'}</span></div><div class="panel-body"><div class="grid cols4 marginbottom">
 <div class="panel stat"><small>SUMMONER LEVEL</small><div class="value">${Number.isInteger(last.summonerLevel)?last.summonerLevel:'—'}</div><div class="hint">Riot player profile</div></div>
 <div class="panel stat"><small>SOLO RANK</small><div class="value" style="font-size:23px">${solo?esc(solo.tier+' '+solo.rank):'—'}</div><div class="hint">${solo?'Ranked solo/duo':'Not reported'}</div></div>
 <div class="panel stat"><small>RANKED WINS</small><div class="value">${solo?.wins??'—'}</div><div class="hint">Riot ranked entry</div></div>
 <div class="panel stat"><small>RANKED LOSSES</small><div class="value">${solo?.losses??'—'}</div><div class="hint">Riot ranked entry</div></div></div>
 <div class="actions"><button class="btn" type="button" data-player-action="track">TRACK MY MATCHES</button><button class="btn ghost" type="button" data-nav="analytics">VIEW ANALYTICS HUB</button></div>
 <p class="help margintop">Match sync includes all roles in history. ADC analytics use eligible bottom-lane matches only. Statistics never create unverified mastery grades.</p></div></section>`:''}
 <div class="grid cols3">
 <div class="panel"><div class="panel-body"><div class="eyebrow">01 / SEARCH</div><h3 class="margintop">Riot ID lookup</h3><p class="help margintop">Find your account through the managed backend. No login or player API key is required.</p></div></div>
 <div class="panel"><div class="panel-body"><div class="eyebrow">02 / SYNC</div><h3 class="margintop">Match history</h3><p class="help margintop">Import completed matches, champion stats and available timelines, then refresh for new games.</p></div></div>
 <div class="panel"><div class="panel-body"><div class="eyebrow">03 / IMPROVE</div><h3 class="margintop">ADC analysis</h3><p class="help margintop">Track performance trends and see which of the 45 skills have sufficient evidence for assessment.</p></div></div></div>`;
}
function values(){const riotId=document.querySelector('#player-riot-id')?.value.trim()||'';const region=document.querySelector('#player-region')?.value||'EUW1';if(!/^.{1,60}#[^#]{1,12}$/.test(riotId))throw Error('Enter Riot ID in the format GameName#Tag');selectedId=riotId;selectedRegion=region;return {mode:'hosted',riotId,region,autoEnabled:true};}
async function backend(path,args){const u=new URL(path,API);u.search=new URLSearchParams({riotId:args.riotId,region:args.region,...(args.start===undefined?{}:{start:String(args.start),count:'5'})}).toString();let response;try{response=await fetch(u.href,{headers:{Accept:'application/json'}});}catch{throw Error('Cannot reach the ADC ASCENT backend. Check the backend deployment and network connection.');}const data=await response.json().catch(()=>null);if(!response.ok)throw Error(data?.error||`Backend HTTP ${response.status}`);return data;}
async function lookup(){if(busy)return;busy=true;let args;try{args=values();show('Searching Riot account…');const p=companion()?await companion().invoke('riot:lookup',args):await backend('/api/profile',args);last=p;document.dispatchEvent(new CustomEvent('adc:riot-profile',{detail:p}));show('Profile found. Select Track my matches to begin syncing.');const target=document.querySelector('#player-riot-id');if(target)target.value=args.riotId;}catch(e){show('Profile lookup unavailable: '+e.message);}finally{busy=false;}}
async function track(){try{const args=values();show('Syncing your completed matches…');if(companion()){await companion().invoke('riot:configure',args);const result=await companion().invoke('riot:sync-now');show(`Tracking enabled. ${result.latest||0} recent matches imported. More history will load automatically while the app runs.`);}else{const result=await backend('/api/matches',{...args,start:0});document.dispatchEvent(new CustomEvent('adc:riot-sync',{detail:result}));show(`${result.matches?.length||0} games imported. Desktop companion is required for unattended background sync.`);}}
 catch(e){show('Match sync unavailable: '+e.message);}}
document.addEventListener('submit',e=>{if(e.target.id==='player-search-form'){e.preventDefault();lookup();}});
document.addEventListener('click',e=>{if(e.target.closest('[data-player-action="track"]'))track();});
window.ADC_PROFILE_UI={page};
})();
