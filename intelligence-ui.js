/* Automatic Riot statistic coverage for all 45 ADC curriculum metrics.
   Never turn a statistical proxy into a verified mastery certificate. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let filter='ALL';
function panel(matches=[]){const src=matches.filter(m=>m.source==='riot_api'&&m.signals);const covered=window.ADC_INTELLIGENCE.coverage(src);
 const rows=covered.rows.filter(r=>filter==='ALL'||r.attribute===filter);
 return `<section class="panel margintop" id="automatic-performance"><div class="panel-header"><div><div class="eyebrow">AUTOMATIC RIOT EVIDENCE / 45 METRICS</div><h3 class="panel-title">Match Intelligence & Evidence Coverage</h3></div><span class="chip">${covered.measured}/45 with measurements</span></div>
 <div class="panel-body stack"><p class="metric-desc">Riot match history is imported automatically once your companion is configured. Every curriculum metric is shown; only API-observable indicators are populated. These are <b>performance indicators, not verified F → Monarch skill certifications</b>. Video-dependent decisions remain unassessed until reviewed.</p>
 <div class="grid cols4"><div class="data-pill">${src.length} API matches with extracted signals</div><div class="data-pill">${covered.measured} metrics with statistical evidence</div><div class="data-pill">${covered.needsReview} metrics requiring reviewed gameplay</div><div class="data-pill">${45-covered.measured-covered.needsReview} waiting for API fields</div></div>
 <div class="actions">${['ALL','Mechanics','Laning','Macro','Teamfighting','Competitive Mastery'].map(a=>`<button class="btn ghost sm" data-intelligence-attr="${esc(a)}" ${filter===a?'aria-pressed="true"':''}>${esc(a)}</button>`).join('')}</div>
 <div class="table-wrap"><table><thead><tr><th>Metric</th><th>Automatic evidence</th><th>Latest</th><th>Coverage / interpretation</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.id)}</strong> · ${esc(r.name)}</td><td>${r.status==='automatically_measured'?'<span class="chip">Riot measured</span>':r.status==='awaiting_riot_data'?'<span class="chip muted-chip">Not reported yet</span>':'<span class="chip muted-chip">VOD / trial required</span>'}</td><td>${r.latest===null?'—':esc(r.latest)+' '+esc(r.signal||'')}</td><td><span class="help">${esc(r.interpretation)}</span>${r.sampleCount?`<span class="help"> · ${r.sampleCount} games</span>`:''}</td></tr>`).join('')}</tbody></table></div>
 <p class="help">Riot's reported skillshot-dodge count does not say which threats were dodgeable. Damage, farming, and death statistics do not establish whether positioning or decisions were correct. No guessed or low-confidence score is promoted to a verified rank.</p></div></section>`;
}
document.addEventListener('click',e=>{const a=e.target.closest('[data-intelligence-attr]');if(!a)return;filter=a.dataset.intelligenceAttr;window.adcAppRender?.();});
window.ADC_INTELLIGENCE_UI={panel};
})();
