import json
import math
import tempfile
import unittest
from pathlib import Path
from analyze import classify,analyze_dodge,analyze_kiting,process_video

class MechanicsTests(unittest.TestCase):
    def tracks(self,cy=100,move=True):
        times=[i/10 for i in range(11)]
        return {'start':0,'player_radius_px':12,'projectile_radius_px':5,
          'player':[{'t':t,'x':100,'y':100+(80*max(0,t-.2) if move else 0)} for t in times],
          'projectile':[{'t':t,'x':200*t,'y':cy} for t in times]}
    def test_sidestep_is_candidate(self):
        self.assertEqual(analyze_dodge(self.tracks())['status'],'dodge_candidate')
    def test_still_player_collision_candidate(self):
        self.assertEqual(analyze_dodge(self.tracks(move=False))['status'],'collision_candidate')
    def test_projectile_that_was_never_aimed_is_not_dodge(self):
        self.assertEqual(analyze_dodge(self.tracks(cy=200))['status'],'not_a_threat')
    def test_insufficient_evidence_is_not_a_failure(self):
        self.assertEqual(analyze_dodge({'player':[],'projectile':[]})['status'],'insufficient_evidence')
    def test_no_false_auto_promotion(self):
        e=classify({'skillshots':[self.tracks()]})
        self.assertEqual(e['coverage']['candidate_dodges'],1)
        self.assertEqual(e['coverage']['verified_metrics'],0)
        self.assertFalse(e['coverage']['all_45_automatically_scored'])
    def test_kiting_is_separation_proxy_not_attack_knowledge(self):
        tracks=[{'t':i*.2,'x':100+i*10,'y':100} for i in range(6)]
        enemy=[{'t':i*.2,'x':0,'y':100} for i in range(6)]
        out=analyze_kiting({'player':tracks,'enemy':enemy})
        self.assertEqual(out['status'],'spacing_proxy')
        self.assertIsNone(out['attack_weaving_score'])
    def test_seeded_video_tracker_on_synthetic_sequence(self):
        import cv2
        import numpy as np
        with tempfile.TemporaryDirectory() as folder:
            output=str(Path(folder)/'synthetic.avi')
            w=cv2.VideoWriter(output,cv2.VideoWriter_fourcc(*'MJPG'),20,(320,180))
            self.assertTrue(w.isOpened())
            for frame in range(40):
                img=np.zeros((180,320,3),np.uint8)
                x=130+int(frame*.4);y=80+(max(0,frame-8)*2)
                cv2.rectangle(img,(x,y),(x+20,y+20),(50,220,90),-1)
                cv2.line(img,(x+2,y+5),(x+18,y+17),(255,255,255),2)
                px=25+frame*4
                cv2.rectangle(img,(px,88),(px+10,98),(50,80,230),-1)
                cv2.line(img,(px+2,89),(px+8,97),(255,255,255),1)
                w.write(img)
            w.release()
            # Check that a reproducible video can be decoded and tracked from seeded ROIs.
            info=process_video(Path(output),{'skillshots':[{'at':0,'seconds':1,'player':[130,80,21,21],'projectile':[25,88,11,11]}]})
            self.assertGreaterEqual(len(info['skillshots'][0]['player']),5)
            self.assertGreaterEqual(len(info['skillshots'][0]['projectile']),5)

if __name__=='__main__':unittest.main()
