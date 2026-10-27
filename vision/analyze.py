#!/usr/bin/env python3
"""ADC ASCENT post-game mechanics prototype.

Can classify trajectories from a detector (fully unattended *after detections exist*)
or track seeded ROIs from a video using OpenCV (annotation-assisted).
Never certifies a mastery rank or claims every projectile was found.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
from statistics import median


def distance(a, b):
    return math.hypot(a[0]-b[0], a[1]-b[1])


def point(item):
    if isinstance(item, dict):
        if 'x' in item: return (float(item['x']), float(item['y']))
        return (float(item['cx']), float(item['cy']))
    return (float(item[0]), float(item[1]))


def xy_at(track, t):
    """Linear interpolation; never extrapolate outside a visible track."""
    data=sorted(track, key=lambda x: x['t'])
    if not data or t < data[0]['t'] or t > data[-1]['t']: return None
    for a,b in zip(data,data[1:]):
        if a['t'] <= t <= b['t']:
            v=0 if b['t']==a['t'] else (t-a['t'])/(b['t']-a['t'])
            pa,pb=point(a),point(b)
            return (pa[0]+v*(pb[0]-pa[0]),pa[1]+v*(pb[1]-pa[1]))
    return point(data[-1])


def trend(track, time, window=0.18):
    start=xy_at(track,time)
    end=xy_at(track,time+window)
    if start is None or end is None or window<=0: return None
    return ((end[0]-start[0])/window,(end[1]-start[1])/window)


def analyze_dodge(event):
    """Recognize a *candidate*, never assert real-game collision from video alone."""
    p=event.get('player',[]); proj=event.get('projectile',[])
    initial=sorted(proj,key=lambda x:x['t'])
    if len(initial)<5 or len(p)<5:
        return {'status':'insufficient_evidence','reason':'At least 5 detections for player and projectile needed'}
    t0=float(event.get('start',initial[0]['t']))
    o=xy_at(proj,t0); pc=xy_at(p,t0)
    v=trend(proj,t0,0.2)
    if not o or not pc or not v:
        return {'status':'insufficient_evidence','reason':'No aligned early trajectory for both objects'}
    speed=math.hypot(*v)
    if speed<5:
        return {'status':'insufficient_evidence','reason':'Projectile trajectory unresolvable'}
    toward=((pc[0]-o[0])*v[0]+(pc[1]-o[1])*v[1])/(speed*speed)
    closest=t0+toward
    radius=float(event.get('player_radius_px',12))+float(event.get('projectile_radius_px',5))
    if toward<=0 or toward>1.75 or xy_at(proj,closest) is None:
        return {'status':'not_assessable','reason':'No clear forward interception within observed trajectory'}
    predicted=(o[0]+v[0]*toward,o[1]+v[1]*toward)
    aim_error=distance(predicted,pc)
    if aim_error>radius*1.1:
        return {'status':'not_a_threat','reason':'Initial flight path did not threaten the initial player position','initial_miss_px':round(aim_error,2)}
    pp=xy_at(p,closest); actual_proj=xy_at(proj,closest)
    if pp is None or actual_proj is None:
        return {'status':'insufficient_evidence','reason':'Tracking ended before potential intersection'}
    sep=distance(pp,actual_proj)
    dt=max(0,closest-t0)
    shift=distance(pc,pp)
    # Detection uncertainty is essential: no definitive collision status from a 2D projection.
    outcome='dodge_candidate' if sep>radius*1.3 and shift>radius*0.35 else ('collision_candidate' if sep<radius*0.75 else 'uncertain')
    return {'status':outcome,'metric_id':'MEC-03.2','source':'post_game_visual_trajectory',
       'evidence_level':'unverified_proxy','confidence':'moderate' if outcome!='uncertain' else 'low',
       'reaction_latency_ms':None,'time_to_intercept_s':round(dt,3),
       'observed_separation_px':round(sep,2),'collision_envelope_px':round(radius,2),
       'player_displacement_px':round(shift,2),
       'caveat':'Visual approximation: camera, sprite centers, animation and hitboxes can invalidate the result.'}


def analyze_kiting(event):
    """Measure retreat/separation only; attacking efficiency needs attack-event detection."""
    player=event.get('player',[]); enemy=event.get('enemy',[])
    if len(player)<5 or len(enemy)<5:
        return {'status':'insufficient_evidence','reason':'Player and enemy require at least five aligned observations'}
    t0=max(player[0]['t'],enemy[0]['t']); t1=min(player[-1]['t'],enemy[-1]['t'])
    if t1-t0<0.35:return {'status':'insufficient_evidence','reason':'Too little overlapping footage'}
    n=max(5,int((t1-t0)*10)); times=[t0+(t1-t0)*i/(n-1) for i in range(n)]
    sep=[distance(xy_at(player,t),xy_at(enemy,t)) for t in times]
    moves=[distance(xy_at(player,a),xy_at(player,b)) for a,b in zip(times,times[1:])]
    changes=[b-a for a,b in zip(sep,sep[1:])]
    moving=[i for i,d in enumerate(moves) if d>1]
    retreat=sum(changes[i]>1 for i in moving)
    score=round(100*retreat/len(moving),1) if moving else None
    return {'status':'spacing_proxy' if moving else 'insufficient_evidence','metric_id':'MEC-03.3',
      'source':'post_game_visual_trajectory','evidence_level':'unverified_proxy',
      'separation_start_px':round(sep[0],1),'separation_end_px':round(sep[-1],1),
      'relative_separation_gain_px':round(sep[-1]-sep[0],1),
      'retreat_movement_share_pct':score,'attack_weaving_score':None,
      'caveat':'This is separation/movement, NOT verified kiting or attack-move timing. Requires attack-event detections.'}


def classify(traces):
    events=[]
    for i,e in enumerate(traces.get('skillshots',[])):
        events.append({'id':str(e.get('id',f'shot-{i+1}')),'kind':'skillshot',**analyze_dodge(e)})
    for i,e in enumerate(traces.get('kiting_windows',[])):
        events.append({'id':str(e.get('id',f'kite-{i+1}')),'kind':'kiting',**analyze_kiting(e)})
    assessed=[x for x in events if x['kind']=='skillshot' and x['status'] in ('dodge_candidate','collision_candidate')]
    success=sum(x['status']=='dodge_candidate' for x in assessed)
    kite=[e for e in events if e['status']=='spacing_proxy']
    return {'schema':'adc-ascent.mechanics.v1','generated_by':'opencv_trajectory_prototype',
        'video':traces.get('video'), 'mode':traces.get('mode','external_tracks'),
        'autonomous_projectile_detection':False,
        'coverage':{'processed_skillshots':len(traces.get('skillshots',[])),
                    'assessable_skillshots':len(assessed),'candidate_dodges':success,
                    'candidate_hits':len(assessed)-success,'unassessable_skillshots':len(traces.get('skillshots',[]))-len(assessed),
                    'dodge_candidate_rate_pct':round(100*success/len(assessed),1) if assessed else None,
                    'kiting_windows_with_spacing_proxy':len(kite),
                    'verified_metrics':0,'all_45_automatically_scored':False},
        'events':events,'status':'review_required',
        'disclaimer':'Trajectory candidates are not validated in-game mechanics or ranked certification. Review original clips.'}


def track_roi(cap, at, roi, end, hz=10):
    """Template-based 2D trajectory tracker; scores intentionally conservative."""
    import cv2, numpy as np
    cap.set(cv2.CAP_PROP_POS_MSEC,1000*at)
    ok,frame=cap.read()
    if not ok:return []
    x,y,w,h=map(int,roi)
    if min(w,h)<4 or x<0 or y<0 or x+w>frame.shape[1] or y+h>frame.shape[0]:return []
    template=frame[y:y+h,x:x+w].copy()
    if template.std()<3:return []
    track=[]; cur=(x,y); t=at
    while t<=end+1e-6:
        cap.set(cv2.CAP_PROP_POS_MSEC,round(t*1000));ok,img=cap.read()
        if not ok:break
        pad=max(36,int(0.8*max(w,h)+65/hz))
        lx=max(0,cur[0]-pad);ly=max(0,cur[1]-pad)
        rx=min(img.shape[1],cur[0]+w+pad);ry=min(img.shape[0],cur[1]+h+pad)
        search=img[ly:ry,lx:rx]
        if search.shape[0]<h or search.shape[1]<w:break
        response=cv2.matchTemplate(search,template,cv2.TM_CCOEFF_NORMED)
        _,best,_,loc=cv2.minMaxLoc(response)
        if not math.isfinite(best) or best<0.73:break
        cur=(lx+loc[0],ly+loc[1]);track.append({'t':round(t,3),'x':cur[0]+w/2,'y':cur[1]+h/2,'tracking_score':round(best,3)})
        t+=1/hz
    return track


def process_video(video, calibrations):
    import cv2
    cap=cv2.VideoCapture(str(video))
    if not cap.isOpened(): raise ValueError('Cannot open video; use a compatible MP4/WebM file')
    duration=cap.get(cv2.CAP_PROP_FRAME_COUNT)/max(1,cap.get(cv2.CAP_PROP_FPS))
    result={'video':str(video.name),'mode':'seeded_visual_tracking','skillshots':[],'kiting_windows':[]}
    for i,e in enumerate(calibrations.get('skillshots',[])):
        start=float(e['at']);end=min(duration,start+float(e.get('seconds',2)))
        out={'id':e.get('id',f'shot-{i+1}'),'start':start,
          'player_radius_px':e.get('player_radius_px',12),'projectile_radius_px':e.get('projectile_radius_px',5)}
        for key in ('player','projectile'):
            out[key]=track_roi(cap,start,e[key],end)
        result['skillshots'].append(out)
    for i,e in enumerate(calibrations.get('kiting_windows',[])):
        start=float(e['at']);end=min(duration,start+float(e.get('seconds',4)))
        out={'id':e.get('id',f'kite-{i+1}')}
        for key in ('player','enemy'):out[key]=track_roi(cap,start,e[key],end)
        result['kiting_windows'].append(out)
    cap.release();return result


def calibrate(video, shot_times, kite_times):
    import cv2
    cap=cv2.VideoCapture(str(video))
    if not cap.isOpened():raise ValueError('Video cannot be opened')
    data={'skillshots':[],'kiting_windows':[]}
    for kind,times,labels in [('skillshots',shot_times,['player','projectile']),('kiting_windows',kite_times,['player','enemy'])]:
        for i,t in enumerate(times):
            cap.set(cv2.CAP_PROP_POS_MSEC,1000*t);ok,frame=cap.read()
            if not ok:raise ValueError(f'Cannot read frame at {t}s')
            entry={'at':t,'seconds':2 if kind=='skillshots' else 4}
            for label in labels:
                roi=cv2.selectROI(f'{kind}: mark {label}, ENTER to confirm',frame,fromCenter=False,showCrosshair=True)
                cv2.destroyAllWindows()
                if roi[2]<=0 or roi[3]<=0:raise ValueError(f'ROI selection cancelled for {label}')
                entry[label]=[int(v) for v in roi]
            data[kind].append(entry)
    cap.release();return data


def main():
    ap=argparse.ArgumentParser(description='Post-game mechanical trajectory analysis (experimental; review required)')
    ap.add_argument('--tracks',type=Path,help='JSON trajectory detections (from any user-supplied model)')
    ap.add_argument('--video',type=Path,help='MP4/WebM recording for seeded tracking')
    ap.add_argument('--calibration',type=Path,help='Existing seed ROI JSON')
    ap.add_argument('--shot-times',default='',help='Comma-separated video seconds; opens ROI selection GUI')
    ap.add_argument('--kite-times',default='',help='Comma-separated video seconds; opens ROI selection GUI')
    ap.add_argument('--output',type=Path,help='Output report JSON')
    a=ap.parse_args()
    if not a.tracks and not a.video:ap.error('Supply --tracks or --video')
    if a.tracks:traces=json.loads(a.tracks.read_text(encoding='utf8'))
    else:
        path=a.calibration or a.video.with_suffix('.calibration.json')
        if not path.exists():
            def parse(s):return [float(x) for x in s.split(',') if x.strip()]
            if not (a.shot_times or a.kite_times):
                ap.error('Need --calibration or --shot-times/--kite-times to seed object tracking')
            seeds=calibrate(a.video,parse(a.shot_times),parse(a.kite_times))
            path.write_text(json.dumps(seeds,indent=2),encoding='utf8')
        traces=process_video(a.video,json.loads(path.read_text(encoding='utf8')))
    report=classify(traces)
    dest=a.output or (a.video or a.tracks).with_suffix('.mechanics.json')
    dest.write_text(json.dumps(report,indent=2),encoding='utf8')
    print(json.dumps({'report':str(dest),'coverage':report['coverage']},indent=2))

if __name__=='__main__':main()
