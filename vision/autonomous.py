#!/usr/bin/env python3
"""Automatic post-game projectile *candidate* detection, optional attack-aware intervals."""
import argparse,json
from pathlib import Path
from auto_detect import detect_candidates
from analyze import analyze_dodge,track_roi
from attack_kiting import attack_aware_kiting

def analyze(video,player_roi=None,enemy_roi=None,attack_events=None,viewport=None,max_seconds=120):
 import cv2
 found=detect_candidates(video,roi=viewport,max_seconds=max_seconds)
 tracks={}
 if player_roi or enemy_roi:
  cap=cv2.VideoCapture(str(video))
  dur=min(max_seconds,cap.get(cv2.CAP_PROP_FRAME_COUNT)/max(1,cap.get(cv2.CAP_PROP_FPS)))
  if player_roi:tracks['player']=track_roi(cap,0,player_roi,dur,hz=12)
  if enemy_roi:tracks['enemy']=track_roi(cap,0,enemy_roi,dur,hz=12)
  cap.release()
 events=[]
 for c in found['candidates']:
  e={'id':c['id'],'kind':'skillshot','status':'projectile_candidate','metric_id':'MEC-03.2',
   'source':'automatic_visual_detector','evidence_level':'unverified_proxy','confidence':'low',
   'start_s':c['start'],'end_s':c['end'],'speed_px_s':c['speed_px_s'],'linearity':c['linearity'],
   'review_required':True}
  if tracks.get('player'):
   check=analyze_dodge({'start':c['start'],'player':tracks['player'],'projectile':c['track']})
   if check['status'] not in ('insufficient_evidence','not_assessable'):e.update(check)
  events.append(e)
 if tracks.get('player') and tracks.get('enemy') and attack_events:
  events.append({'id':'attack-aware-1','kind':'kiting',**attack_aware_kiting({
   'player':tracks['player'],'enemy':tracks['enemy'],'attacks':attack_events})})
 return {'schema':'adc-ascent.mechanics.v1','generated_by':'automatic_visual_candidate_pipeline_v2',
  'video':video.name,'mode':'automatic_projectile_candidates','autonomous_projectile_detection':True,
  'coverage':{'processed_skillshots':len(found['candidates']),'projectile_candidates':len(found['candidates']),
   'assessable_skillshots':sum(e['status'] in ('dodge_candidate','collision_candidate') for e in events),
   'attack_aware_windows':sum(e['status']=='attack_aware_candidate' for e in events),
   'verified_metrics':0,'all_45_automatically_scored':False},
  'events':events,'status':'review_required','detector':found['detector'],
  'disclaimer':found['limitations']+' No automatic certification.'}

def cli():
 p=argparse.ArgumentParser()
 p.add_argument('--video',required=True,type=Path)
 p.add_argument('--output',type=Path)
 p.add_argument('--player-roi',nargs=4,type=int)
 p.add_argument('--enemy-roi',nargs=4,type=int)
 p.add_argument('--viewport',nargs=4,type=int)
 p.add_argument('--attack-events',type=Path)
 p.add_argument('--max-seconds',type=int,default=120)
 a=p.parse_args()
 if not 1<=a.max_seconds<=3600:p.error('max-seconds must be 1..3600')
 attacks=json.loads(a.attack_events.read_text()) if a.attack_events else None
 report=analyze(a.video,a.player_roi,a.enemy_roi,attacks,a.viewport,a.max_seconds)
 dest=a.output or a.video.with_suffix('.auto-mechanics.json')
 dest.write_text(json.dumps(report,indent=2))
 print(json.dumps({'report':str(dest),'coverage':report['coverage']}))
if __name__=='__main__':cli()
