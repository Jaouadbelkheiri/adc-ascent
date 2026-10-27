const test=require('node:test');const assert=require('node:assert/strict');const {candidates,recordingRanges}=require('../teamfights');
const kill=(t,x=1000,y=2000)=>({type:'CHAMPION_KILL',timestamp:t,position:{x,y},killerId:1,victimId:2,assistingParticipantIds:[3]});
test('clusters nearby multikills but not isolated or distant kills',()=>{const tl={info:{frames:[{events:[kill(100000),kill(112000,1200),kill(118000,1100),kill(130000,9000),kill(150000,9000)]}]}};const a=candidates(tl);assert.equal(a.length,1);assert.equal(a[0].kills,3);assert.equal(a[0].confidence,'heuristic');});
test('recording offset maps game event time into recording time',()=>{const a=recordingRanges([{startMs:60000,endMs:90000}],30);assert.equal(a[0].recordingStartSec,30);assert.equal(a[0].recordingEndSec,60)});
test('invalid timeline returns empty',()=>assert.deepEqual(candidates({}),[]));
