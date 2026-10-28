"""Attack-timestamp-aware kiting computation from source-attributed replay evidence.
Commands or health bar drops are not automatically confirmed basic attacks."""
from analyze import xy_at,distance

def attack_aware_kiting(event):
 player=sorted(event.get('player',[]),key=lambda p:p['t'])
 enemy=sorted(event.get('enemy',[]),key=lambda p:p['t'])
 attacks=sorted(event.get('attacks',[]),key=lambda a:a['t'])
 if len(player)<5 or len(enemy)<5 or len(attacks)<2:
  return {'status':'insufficient_evidence','reason':'Requires two trajectories and two attack events'}
 start=max(player[0]['t'],enemy[0]['t']);end=min(player[-1]['t'],enemy[-1]['t'])
 valid=[a for a in attacks if start<=a['t']<=end and a.get('type') in ('attack_landed','attack_launch','attack_command')]
 intervals=[]
 for a,b in zip(valid,valid[1:]):
  if b['t']<=a['t']:continue
  pa=xy_at(player,a['t']);pb=xy_at(player,b['t']);ea=xy_at(enemy,a['t']);eb=xy_at(enemy,b['t'])
  if None in (pa,pb,ea,eb):continue
  movement=distance(pa,pb)
  intervals.append({'from_s':a['t'],'to_s':b['t'],'attack_interval_s':round(b['t']-a['t'],3),
   'player_displacement_px':round(movement,2),'separation_change_px':round(distance(pb,eb)-distance(pa,ea),2),
   'moved_between_attacks':movement>=8})
 if not intervals:return {'status':'insufficient_evidence','reason':'No aligned attack intervals'}
 confirmed=sum(a.get('type') in ('attack_launch','attack_landed') and a.get('confidence')=='verified' for a in valid)
 return {'status':'attack_aware_candidate','kind':'kiting','metric_id':'MEC-03.3',
  'source':'post_game_attack_event_timeline',
  'evidence_level':'verified_attack_events' if confirmed==len(valid) else 'attack_hypothesis',
  'attacks_observed':len(valid),'verified_attacks':confirmed,'attack_intervals':intervals,
  'moving_between_attacks_pct':round(100*sum(i['moved_between_attacks'] for i in intervals)/len(intervals),1),
  'median_interval_s':sorted(i['attack_interval_s'] for i in intervals)[len(intervals)//2],
  'mastery_certified':False,'caveat':'Attack commands are not proven attacks. No automatic certification without calibrated visual detection and threat context.'}
