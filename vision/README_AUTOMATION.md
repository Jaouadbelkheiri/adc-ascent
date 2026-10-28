# Experimental automated mechanics (v0.4)

**Automatic projectile candidates**: Run after a match:

\`\`\`bash
python -m pip install -r vision/requirements.txt
python vision/autonomous.py --video saved_game.webm --max-seconds 120
\`\`\`

The report \`saved_game.auto-mechanics.json\` imports into Mechanics Lab. Capture Studio has an **Auto-scan projectile candidates** button.

The colour/geometry/motion heuristic does **not** recognize all skillshots. It will miss some projectiles and may identify particles or UI animations. Crop HUD areas with \`--viewport X Y W H\`. Without calibrated player tracking, it cannot assign dodge or collision outcomes.

**Attack-aware kiting**: Supply \`--player-roi X Y W H --enemy-roi X Y W H --attack-events attacks.json\`, where attacks.json is an array of timestamped \`{ "t": 1.2, "type": "attack_launch", "confidence": "verified" }\` observations. Actual attack events must be established by a trusted detector/review. Attack commands are not verified basic attacks. The output measures movement *between* the indicated attacks and retains evidence provenance.

**45-metric scoring**: \`metric-scoring.js\` evaluates all 45 defined metric gates from approved, source-attributed observations. Missing data never becomes invented scores; complex judgement still needs an assessed VOD, calibrated review, or validated detector. Component ranks are calculated only from all three qualifying metrics. Offline imported records are not cryptographically verified, so this is a personal evidence calculator, not a professional or Riot ranking system.

Validation: \`npm test\` and \`python -m unittest discover -s vision -p "test_*.py"\`. Synthetic footage tests are not equivalent to precision/recall validation on real League matches.
