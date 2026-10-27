'use strict';
/** A standalone, independently authored ADC training taxonomy. These are proposed coaching assessments, not Riot ranks. */
window.ADC_DATA = (() => {
const specs = [
 {id:'MEC',name:'Mechanics',icon:'target',description:'Farming precision, input execution and movement under pressure.',components:[
 ['Last Hitting',[
 ['Uncontested CS Capture','Secure safely available minions in controlled waves','last-hit clean waves while adjusting to minion health and attack timing','Drill / VOD'],
 ['Under-Tower Farming','Secure or correctly concede tower CS','manage tower shots, minion preparation and enemy pressure','Drill / VOD'],
 ['Contested Farming','Balance farm value against opponent threats','decide whether to secure or concede contested minions','VOD']]],
 ['Attack Execution',[
 ['Orbwalking Precision','Attack and move without unnecessary canceled attacks','maintain precise attack-move cycles under growing combat pressure','Drill / VOD'],
 ['Targeting Accuracy','Direct basic attacks to the intended safe target','select and switch appropriate targets among minions and champions','Drill / VOD'],
 ['Ability Sequencing','Use champion abilities in effective order','execute the appropriate champion-specific ability and auto-attack sequences','Drill / VOD']]],
 ['Spacing',[
 ['Range Control','Respect enemy threat range while dealing damage','tether enemy ranges without entering avoidable retaliation windows','VOD'],
 ['Skillshot Evasion','Evade legitimately threatening skillshots','identify a dodgeable trajectory and move to a safe location','VOD'],
 ['Kiting Execution','Maintain efficient damage and movement during pursuit','sustain attack-move execution against threatening pursuers','Drill / VOD']]]]},
 {id:'LAN',name:'Laning',icon:'swords',description:'Wave control, trades, coordinated lane plans and resets.',components:[
 ['Wave Management',[
 ['Wave State Recognition','Read wave momentum and predict future states','identify the wave state and predict its likely evolution','Scenario / VOD'],
 ['Wave Manipulation','Execute appropriate freeze, shove and slow push','choose and execute an appropriate wave-management plan','Drill / VOD'],
 ['Crash & Bounce Timing','Build productive crashes and wave bounces','time a crash or bounce around reset and lane pressure','Scenario / VOD']]],
 ['Trading',[
 ['Trade Window Recognition','Identify favorable or dangerous trades','recognize trading windows from cooldowns, waves and positions','Scenario / VOD'],
 ['Trade Execution','Carry out trades with efficient resources and damage','execute the chosen trade while managing retaliation and minions','Drill / VOD'],
 ['Support Synchronization','Coordinate decisions with allied support','adapt trades and wave plans to support movement and abilities','VOD']]],
 ['Lane Tempo',[
 ['Level Spike Control','Anticipate and use critical experience thresholds','act correctly around level transitions and support timing','Scenario / VOD'],
 ['Recall Optimization','Choose productive resets relative to waves and purchases','decide whether to stay, crash, recall or delay','Scenario / VOD'],
 ['Gank Risk Management','Manage position using available map information','position safely under jungle and support threat uncertainty','Scenario / VOD']]]]},
 {id:'MAC',name:'Macro',icon:'map',description:'Information management, resource allocation and objective conversion.',components:[
 ['Map Intelligence',[
 ['Jungle Tracking','Reason about likely enemy jungle position','make calibrated predictions from legitimately visible clues','Scenario / VOD'],
 ['Map Awareness','Recognize relevant map changes and react','identify and act on important visible map events','Scenario / VOD'],
 ['Vision Utilization','Use visible and unknown map areas appropriately','choose actions based on ward coverage and fog uncertainty','Scenario / VOD']]],
 ['Resource Allocation',[
 ['Midgame Wave Collection','Collect appropriate waves without unjustified deaths','allocate to safe midgame waves while respecting threats','Scenario / VOD'],
 ['Rotation Efficiency','Time map movements around valuable resources','choose effective rotations with minimal unnecessary losses','Scenario / VOD'],
 ['Economy Conversion','Convert earned gold into suitable purchases','make patch-aware item purchases around planned fights','Riot data / VOD']]],
 ['Objective Control',[
 ['Objective Preparation','Prepare waves, recalls and access before objectives','organize wave and resource timing before an objective','Riot data / VOD'],
 ['Cross-Map Decisions','Choose valuable trades instead of hopeless contests','evaluate contest-versus-trade decisions in map context','Scenario / VOD'],
 ['Advantage Conversion','Turn winning positions into persistent map value','convert kills or pressure into structures, waves or objectives','Riot data / VOD']]]]},
 {id:'TFC',name:'Teamfighting',icon:'shield',description:'Threat recognition, damage uptime and fight timing.',components:[
 ['Threat Management',[
 ['Threat Identification','Prioritize enemy spells and champions threatening you','recognize relevant enemy engage and damage threats','Scenario / VOD'],
 ['Pre-Fight Positioning','Select safe useful positions before combat','position according to threats, allies, terrain and access','Scenario / VOD'],
 ['Defensive Resource Awareness','Account for summoners and protective cooldowns','plan around available defensive tools and enemy resources','Scenario / VOD']]],
 ['Damage Execution',[
 ['Safe Damage Uptime','Exploit safe windows without unnecessary exposure','deal useful damage while respecting changing lethal threats','VOD'],
 ['Target Accessibility','Choose realistic safe targets','attack the highest-value safely reachable target','Scenario / VOD'],
 ['Defensive Ability Timing','Use survival tools when they are valuable','time defensive abilities and summoners under pressure','Drill / VOD']]],
 ['Fight Decisions',[
 ['Fight Entry Timing','Enter or decline fights at useful moments','select sound fight-entry windows from available information','Scenario / VOD'],
 ['Disengage & Re-entry','Exit danger and return when safe','disengage and re-enter fights through changing threats','Scenario / VOD'],
 ['Avoidable Death Management','Reduce unjustified deaths without excessive passivity','distinguish justified risk from avoidable lethal decisions','VOD']]]]},
 {id:'CMP',name:'Competitive Mastery',icon:'brain',description:'Champion knowledge, strategic decisions and deliberate practice.',components:[
 ['Champion Expertise',[
 ['Matchup Knowledge','Prepare and adapt to ADC/support matchups','construct matchup plans based on abilities and lane patterns','Scenario / VOD'],
 ['Power Spike Recognition','Identify meaningful level, item and ability thresholds','recognize and exploit power-spike windows','Riot data / VOD'],
 ['Build Adaptation','Choose suitable items for patch and matchup','justify item paths from team, enemy and timing context','Riot data / VOD']]],
 ['Strategic Decision Making',[
 ['Risk Assessment','Compare available options and likely downsides','select actions with appropriate risk and payoff','Scenario / VOD'],
 ['Win Condition Recognition','Identify and update plausible winning routes','adapt the team win condition as match state evolves','Scenario / VOD'],
 ['Disadvantage Management','Choose disciplined decisions from a deficit','preserve comeback options without reckless play','Scenario / VOD']]],
 ['Deliberate Improvement',[
 ['Error Diagnosis','Find actual controllable causes of mistakes','identify the root cause before knowing or privileging the result','Review'],
 ['Skill Transfer','Carry reviewed corrections into later matches','show correction of an earlier issue in new situations','Drill / VOD'],
 ['Session Discipline','Plan and complete high-quality training sessions','maintain a focused practice process without overplaying','Practice log']]]]}];
let metricCounter=0;
const ATTRS=specs.map(a=>({...a,components:a.components.map((c,ci)=>({id:`${a.id}-${String(ci+1).padStart(2,'0')}`,name:c[0],metrics:c[1].map((m,mi)=>({id:`${a.id}-${String(ci+1).padStart(2,'0')}.${mi+1}`,name:m[0],definition:m[1],challenge:m[2],source:m[3],ordinal:++metricCounter}))}))}));
const TIERS=[
 {name:'F',accuracy:60,count:6,sessions:1,context:'in a predictable, low-pressure introductory scenario'},
 {name:'E',accuracy:65,count:8,sessions:1,context:'in a standard repeatable practice scenario'},
 {name:'D',accuracy:70,count:10,sessions:2,context:'in two distinct, straightforward game-like contexts'},
 {name:'C',accuracy:74,count:12,sessions:2,context:'while managing one additional opponent or resource constraint'},
 {name:'B',accuracy:78,count:14,sessions:3,context:'under realistic lane or skirmish pressure'},
 {name:'A',accuracy:82,count:16,sessions:3,context:'across complex matchups and changing cooldown states'},
 {name:'S',accuracy:86,count:20,sessions:4,context:'in demanding real-game scenarios with several competing threats'},
 {name:'Ascendant',accuracy:88,count:24,sessions:4,context:'in high-pressure, varied scenarios with uncertain information'},
 {name:'Sovereign',accuracy:90,count:28,sessions:5,context:'under coordinated threats and multi-stage decision chains'},
 {name:'Monarch',accuracy:92,count:32,sessions:6,context:'across diverse, difficult post-game-reviewed situations with durable skill transfer'}
];
const CHAMPIONS=[
 {name:'Jinx',type:'Scaling hypercarry',contracts:['Weapon Selection','Lane Survival','Item & Reset Spikes','Damage Resets','Threat Spacing','Matchup Adaptation']},
 {name:"Kai'Sa",type:'Burst and dive follow-up',contracts:['Plasma & Isolated Q','Trade Coordination','Evolution Planning','Burst Windows','Ultimate Discipline','Matchup Adaptation']},
 {name:'Ezreal',type:'Mobile skillshot carry',contracts:['Q & Auto Integration','Lane Poke & Wave','Item Timing','Spell-weave Uptime','Arcane Shift Control','Matchup Adaptation']},
 {name:'Caitlyn',type:'Range and lane control',contracts:['Headshot & Trap Chains','Range-pressure Lanes','Item Timing','Siege Execution','Net & Trap Defense','Matchup Adaptation']},
 {name:'Ashe',type:'Utility and setup',contracts:['Slow & Attack Control','Lane Poke','Power Spike Timing','Sustained Output','Hawkshot & Positioning','Arrow Setup']},
 {name:'Draven',type:'Aggressive snowball',contracts:['Axe Catching','Lane Pressure','Cash-in Planning','High-risk Combat','Axe-safe Positioning','Matchup Adaptation']},
 {name:'Jhin',type:'Burst and utility',contracts:['Fourth Shot Planning','Wave & Trade Rhythm','Item Timing','Ability Follow-up','Trap & Ult Safety','Matchup Adaptation']},
 {name:'Lucian',type:'Early trading and mobility',contracts:['Passive Weaving','Lane Combos','Item Timing','Burst Execution','Dash Discipline','Matchup Adaptation']},
 {name:'Miss Fortune',type:'Lane poke and AoE',contracts:['Q Bounce Control','Lane Pressure','Ultimate Windows','AoE Positioning','Survival Planning','Matchup Adaptation']},
 {name:'Samira',type:'Dive execution',contracts:['Style Building','Engage Coordination','Ultimate Readiness','Reset Combat','Defensive Timing','Matchup Adaptation']},
 {name:'Sivir',type:'Waveclear and team utility',contracts:['Q & Ricochet','Wave Priority','Item Timing','DPS Uptime','Spell Shield Timing','Matchup Adaptation']},
 {name:'Twitch',type:'Stealth and positioning',contracts:['Poison Stacking','Lane Windows','Item Timing','Ambush Execution','Stealth Safety','Matchup Adaptation']},
 {name:'Varus',type:'Poke and on-hit',contracts:['Blight Management','Lane Harass','Build Identity','Ultimate Follow-up','Threat Management','Matchup Adaptation']},
 {name:'Vayne',type:'Duelist and scaling',contracts:['Tumble & Silver Bolts','Weak-side Lane','Item Timing','Target Focus','Condemn & Stealth','Matchup Adaptation']},
 {name:'Xayah',type:'Feather control',contracts:['Feather Placement','Lane Trade Setup','Item Timing','Feather Pull Execution','Ultimate Safety','Matchup Adaptation']},
 {name:'Zeri',type:'Mobile sustained carry',contracts:['Attack Accuracy','Lane Scaling','Item Timing','Extended Fight Uptime','Wall & Dash Safety','Matchup Adaptation']},
 {name:'Aphelios',type:'Weapon rotation',contracts:['Weapon Cycle Planning','Lane Matchups','Item Timing','Weapon Combos','Threat Positioning','Matchup Adaptation']},
 {name:'Kalista',type:'Mobile aggressive lane',contracts:['Martial Poise Control','Early Lane Pressure','Item Timing','Rend Management','Oathsworn Coordination','Matchup Adaptation']},
 {name:"Kog'Maw",type:'Protected hypercarry',contracts:['Range Activation','Lane Survival','Item Spikes','Sustained DPS','Peel Coordination','Matchup Adaptation']},
 {name:'Nilah',type:'Melee-range bot carry',contracts:['Range & Q Control','Experience Advantage','Item Timing','All-in Windows','Defensive Mobility','Matchup Adaptation']},
 {name:'Smolder',type:'Stack-scaling marksman',contracts:['Stacking Execution','Lane Survival','Upgrade Timings','Teamfight Damage','Threat Avoidance','Matchup Adaptation']}
];
const ALL=ATTRS.flatMap(a=>a.components.flatMap(c=>c.metrics.map(m=>({...m,attribute:a.id,attributeName:a.name,component:c.id,componentName:c.name}))));
const metricById=id=>ALL.find(m=>m.id===id);
const championByName=name=>CHAMPIONS.find(c=>c.name===name);
return {ATTRS,ALL,TIERS,CHAMPIONS,metricById,championByName};
})();
