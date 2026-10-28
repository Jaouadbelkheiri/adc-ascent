"""Post-game heuristic discovery of bright linear moving projectile candidates.
No claim of exhaustive League ability detection or skill verification."""
import math
from pathlib import Path

def segments(frame):
 import cv2
 hsv=cv2.cvtColor(frame,cv2.COLOR_BGR2HSV)
 mask=cv2.inRange(hsv,(0,105,125),(179,255,255))
 mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))
 count,_,stats,centers=cv2.connectedComponentsWithStats(mask,8)
 result=[]
 for i in range(1,count):
  x,y,w,h,area=map(int,stats[i])
  if 10<=area<=360 and 2<=w<=38 and 2<=h<=38:
   result.append((float(centers[i][0]),float(centers[i][1])))
 return result

def linearity(points):
 if len(points)<4:return 0.
 x0,y0=points[0];x1,y1=points[-1];dx=x1-x0;dy=y1-y0
 travel=math.hypot(dx,dy)
 if travel<1:return 0.
 err=sum(abs((x-x0)*dy-(y-y0)*dx)/travel for x,y in points)/len(points)
 length=sum(math.dist(a,b) for a,b in zip(points,points[1:]))
 return max(0,min(1,(travel/max(length,1))*(1-min(1,err/max(10,travel*.15)))))

def detect_candidates(video:Path,min_track=5,max_seconds=180,sample_fps=12,roi=None):
 import cv2
 cap=cv2.VideoCapture(str(video))
 if not cap.isOpened():raise ValueError('Unable to open video')
 fps=cap.get(cv2.CAP_PROP_FPS)
 if fps<=0:raise ValueError('Unknown frame rate')
 skip=max(1,round(fps/sample_fps));effective=fps/skip
 total=int(min(cap.get(cv2.CAP_PROP_FRAME_COUNT),max_seconds*fps))
 tracks=[];active=[];processed=0
 for fr in range(0,total,skip):
  cap.set(cv2.CAP_PROP_POS_FRAMES,fr)
  ok,frame=cap.read()
  if not ok:break
  x0=y0=0
  if roi:
   x0,y0,w,h=map(int,roi)
   if min(w,h)<10 or x0<0 or y0<0 or x0+w>frame.shape[1] or y0+h>frame.shape[0]:raise ValueError('Invalid viewport')
   frame=frame[y0:y0+h,x0:x0+w]
  t=fr/fps
  blobs=[(x+x0,y+y0) for x,y in segments(frame)]
  unused=set(range(len(blobs)))
  for tr in active:
   old=tr['points'][-1];prev=tr['points'][-2] if len(tr['points'])>1 else None
   vx=old['x']-prev['x'] if prev else 0;vy=old['y']-prev['y'] if prev else 0
   want=(old['x']+vx,old['y']+vy)
   j=min(unused,key=lambda k:math.dist(blobs[k],want),default=None)
   if j is not None and math.dist(blobs[j],want)<=max(16,70/effective):
    x,y=blobs[j];tr['points'].append({'t':round(t,3),'x':round(x,2),'y':round(y,2)})
    tr['last']=processed;unused.remove(j)
  active=[tr for tr in active if tr['last']>=processed-2]
  for j in unused:
   x,y=blobs[j];tr={'points':[{'t':round(t,3),'x':round(x,2),'y':round(y,2)}],'last':processed}
   tracks.append(tr);active.append(tr)
  processed+=1
 cap.release();out=[]
 for tr in tracks:
  pts=tr['points']
  if len(pts)<min_track:continue
  span=pts[-1]['t']-pts[0]['t']
  if span<.12:continue
  xy=[(p['x'],p['y']) for p in pts];speed=math.dist(xy[0],xy[-1])/span;straight=linearity(xy)
  if speed<35 or straight<.72:continue
  out.append({'id':f'auto-shot-{len(out)+1}','track':pts,'start':pts[0]['t'],'end':pts[-1]['t'],
   'speed_px_s':round(speed,1),'linearity':round(straight,3),
   'status':'unclassified_projectile_candidate','confidence':'low','review_required':True})
 return {'schema':'adc-ascent.projectiles.v1','detector':'hsv-motion-linear-v1','video':video.name,
  'sampling_fps':round(effective,2),'processed_frames':processed,'candidates':out,
  'recall_guaranteed':False,'limitations':'Bright linear motion proxy only; not all projectiles. Camera movement, VFX, HUD and occlusions create errors.'}
