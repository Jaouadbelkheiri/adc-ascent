import unittest,tempfile
from pathlib import Path
import cv2,numpy as np
from auto_detect import detect_candidates
from attack_kiting import attack_aware_kiting
from autonomous import analyze
class AutoTests(unittest.TestCase):
 def video(self,name,move=True):
  writer=cv2.VideoWriter(str(name),cv2.VideoWriter_fourcc(*'MJPG'),20,(320,200))
  self.assertTrue(writer.isOpened())
  for i in range(50):
   frame=np.zeros((200,320,3),np.uint8)
   if move:cv2.rectangle(frame,(15+i*3,80),(23+i*3,88),(0,25,255),-1)
   writer.write(frame)
  writer.release()
 def test_auto_motion_candidate(self):
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'synthetic.avi';self.video(path)
   result=detect_candidates(path,max_seconds=3)
   self.assertGreaterEqual(len(result['candidates']),1)
   report=analyze(path,max_seconds=3)
   self.assertTrue(report['autonomous_projectile_detection'])
   self.assertEqual(report['coverage']['verified_metrics'],0)
 def test_blank_video(self):
  with tempfile.TemporaryDirectory() as d:
   path=Path(d)/'blank.avi';self.video(path,False)
   self.assertEqual(detect_candidates(path,max_seconds=3)['candidates'],[])
 def test_attack_aware_with_valid_timestamps(self):
  p=[{'t':i*.2,'x':100+i*5,'y':100} for i in range(12)]
  e=[{'t':i*.2,'x':150+i*3,'y':100} for i in range(12)]
  a=[{'t':.4,'type':'attack_launch','confidence':'verified'},{'t':1.,'type':'attack_launch','confidence':'verified'}]
  result=attack_aware_kiting({'player':p,'enemy':e,'attacks':a})
  self.assertEqual(result['status'],'attack_aware_candidate')
  self.assertEqual(result['verified_attacks'],2)
  self.assertFalse(result['mastery_certified'])
if __name__=='__main__':unittest.main()
