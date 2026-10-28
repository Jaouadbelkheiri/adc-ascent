/* Browser-local rubric evidence evaluator. Imported approval labels are not authenticated. */
(()=>{'use strict';
const KEY='adc-ascent-metric-observations-v1';let observations=[];
try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(x))observations=x.slice(-20000)}catch{}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const panel=()=>{
 const r=window.ADC_SCORING.scoreAll(observations);
 return '<section class="panel margintop"><div class="panel-header"><div><div class="eyebrow">ASSESSMENT EVIDENCE</div><h3 class="panel-title">45-Metric Gate Calculator</h3></div><span class="chip">'+r.scored_metrics+'/45 qualified</span></div><div class="panel-body stack"><p class="help">Gate calculation uses submitted approved observations only; detection candidates never promote. Imported approval labels have not been cryptographically authenticated.</p><label class="field">Import observation JSON array <input type="file" id="scoring-input" accept=".json,application/json"></label><button class="btn ghost" id="scoring-clear">Clear imported assessment evidence</button><div class="table-wrap"><table><thead><tr><th>Metric</th><th>Qualified tier</th><th>Approved observations at F</th></tr></thead><tbody>'+r.metrics.map(m=>'<tr><td>'+esc(m.id)+' · '+esc(m.name)+'</td><td>'+esc(m.highest_qualified_tier||'Unassessed')+'</td><td>'+m.gates[0].verified+' / '+m.gates[0].assessed+'</td></tr>').join('')+'</tbody></table></div></div></section>';
};
const old=window.ADC_MECHANICS?.page;
if(old)window.ADC_MECHANICS.page=(...a)=>old(...a)+panel();
document.addEventListener('change',async e=>{if(e.target.id!=='scoring-input')return;try{
 const a=JSON.parse(await e.target.files[0].text());if(!Array.isArray(a)||a.length>20000)throw Error('Expected at most 20,000 observations');
 observations=a;localStorage.setItem(KEY,JSON.stringify(a));window.adcAppRender?.();
}catch(err){alert('Import failed: '+err.message)}});
document.addEventListener('click',e=>{if(e.target.id!=='scoring-clear')return;if(confirm('Clear assessment evidence?')){observations=[];localStorage.removeItem(KEY);window.adcAppRender?.()}});
})();