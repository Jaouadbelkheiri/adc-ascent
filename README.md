# ADC ASCENT — Standalone ADC Training & Replay Studio (v0.3)

Independent **personal** League of Legends ADC development app. Not integrated with ARISE, not affiliated with Riot Games, and not a clone of Replay.gg or Mobalytics.

## What's implemented

| Module | Current implementation |
|---|---|
| ADC skill tree | All 45 ADC metrics, 15 components and 5 attributes; F → Monarch curriculum with manual performance evidence and tier requirements. |
| Champion Forge | Primary, secondary, optional flex; six tailored contracts each. |
| Missions | Daily training, skill focus, reflection, XP. |
| Match history | Manual matches, Riot match-v5 JSON imports, and **optional automatic read-only Riot sync** via private Cloudflare Worker. |
| VOD Review | Local video selection, timestamps, decision rubric, metric links, review history. |
| Windows video recorder | Electron app captures the **League game window**, when the user starts recording. WebM saved to `Videos/ADC ASCENT/`. |
| Highlight markers | Manual markers during capture; post-game *teamfight candidates* from Riot timeline kill clusters. |
| Teamfight clips | Exports candidate clips using FFmpeg if installed. Requires selecting the correct match and setting recording/game time alignment. |
| APM | **Opt-in**, foreground-only Windows input-action counter, five-second samples and a simple chart. Counts aggregate keyboard/mouse presses, not effective APM; does not retain individual keys. |
| Backup | Local browser backup/restore. Video files stay on disk, outside the JSON backup. |

### Reality check: all 45 metrics are supported for **review evidence**, not fully automated measurements

A Riot match timeline cannot reveal precisely timed skillshot evasion, animation cancellations, attack-click inputs, or the correctness of 45 tactical decisions. Only a subset of metrics have readily available API evidence; the other metrics currently require drills and manually reviewed footage. **Seeded, post-game projectile trajectory classification and opponent-relative movement proxies ARE implemented. Autonomous detection of every skillshot, true attack-aware kiting, AI VOD coaching and independently verified Monarch certifications are NOT implemented.** Teamfight kill clusters are heuristic review suggestions, not verified fight detection.

## Run as a website

From this folder:

```bash
python -m http.server 8080
```

Open http://localhost:8080. The website supports the skill tree, match logging, manual VOD review and timeline JSON imports. Browser mode does **not** include desktop recording or game APM.

## Windows desktop recorder (Electron)

On Windows with Node.js 22+:

```bash
npm install
npm start
```

Open **Capture Studio** while a League match is running. Choose optional system audio (may include sound from other applications) and input APM, then select **Start recording**. The recorder requests League window capture; optional audio uses system loopback and may include other desktop sounds. Click **Stop & save** when finished. The WebM recording and its metadata JSON are written locally to `%USERPROFILE%\\Videos\\ADC ASCENT\\`.

- **League detection** is opt-in and only reminds you to start manually; browsers may require a user gesture for screen capture. It is not unattended auto-record.
- No game-memory access, injected code, or unauthorized game state extraction is implemented.
- For APM, a bundled PowerShell helper uses Windows OS foreground and button-state APIs, counts aggregate keyboard/mouse press edges in the `League of Legends` foreground process, and never stores key identities or text. This feature is experimental and must be reviewed for Riot/Vanguard compatibility before relying on it in ranked play. Turn it off if uncertain.
- For teamfight **clip extraction**, install [FFmpeg](https://ffmpeg.org/download.html) and add `ffmpeg` to PATH. The heuristic markers use champion kills within 25 seconds and ~2800 game units; fights without several kills can be missed, and multikills may be false positives.
- Recordings are **WebM**; for Windows installers use the GitHub Actions **Package Windows Recorder** workflow on a repository containing this source. It produces an NSIS installer / portable EXE (not pre-built in this ZIP).

## Automatic Riot match sync (optional)

1. Create a Riot Developer Portal app, review current Riot requirements, and obtain API credentials appropriate for your use case.
2. In `worker/`, copy `wrangler.toml.example` to `wrangler.toml`.
3. Run `npx wrangler secret put RIOT_API_KEY` and `npx wrangler secret put ADC_ACCESS_TOKEN` (choose a long unique token).
4. Run `npx wrangler deploy` from `worker/` (or `npx wrangler deploy --config worker/wrangler.toml` from this folder).
5. In **Capture Studio**, enter your Worker HTTPS URL, Riot ID and the personal access token. Only the Worker sees `RIOT_API_KEY`. The access token is held in the capture form, not in a backup. Riot sync is read-only and loads up to ten matches and fight candidates from up to three recent ADC games.

A public deployment needs an authentication, rate-limiting and access-control review beyond this single-user bearer-token proxy. Riot's public/development key limits and policies apply; never commit secrets.

## Teamfight recording alignment

If game time was **05:00** when your recording started, set the *in-game seconds at beginning* to **300**. An event at 10:00 in the game then maps to 05:00 in your recording. Select the matching Riot match before adding markers or extracting clips. Incorrect offset means incorrect clips. Manual review is required.

## GitHub repository

A separate GitHub repository is recommended, e.g. `adc-ascent`. Upload this directory into that **new** repository, not into `arise` or `ranked-life-app`. From the project folder:

```bash
git init -b main
git add .
git commit -m "Initial ADC ASCENT standalone recorder and skill tracker"
git remote add origin https://github.com/YOUR_USERNAME/adc-ascent.git
git push -u origin main
```

GitHub Actions workflows included: `Verify ADC ASCENT` (Node tests) and `Package Windows Recorder` (Windows desktop executable). Use a **private** repo initially while reviewing capture compliance and privacy.

## Security and accuracy

- No passwords or Riot API keys in the repository.
- Video capture requires permission and uses the League game window only.
- APM is an approximate OS input rate, not a proven performance metric; input rate can be inflated by unnecessary actions.
- A high win rate, CS count, damage value, or APM is not itself proof of ADC mastery.
- F → Monarch refers to a private learning curriculum, **not** Riot rank, Riot hidden MMR, or a validated coaching certification.
- User-owned video and match information remain local unless the user explicitly connects a Worker.
- Distinguish “source data,” “heuristic recommendation,” and “verified evidence” in future scoring improvements.

## Testing

```bash
npm test
python test_app.py
```

Riot reference: https://developer.riotgames.com/docs/lol · General policy: https://support-developer.riotgames.com/hc/en-us/articles/22698591841939-General-Policies

## Mechanics Lab — Post-game trajectory analyzer (v0.3)

**Working components:** interactive clip calibration (seed bounding boxes) → OpenCV video tracking → estimated projectile interception / avoidance candidates → movement-separation proxy → JSON report → Mechanics Lab UI. The system does **not** independently discover all projectiles, recognize attack events, estimate true human reaction time, or confirm actual League collisions. False positives are expected. Review every candidate against the original footage. It never automatically certifies any of the F–Monarch gates.

### Requirements on the Windows recording computer

```powershell
py -3 -m pip install -r vision/requirements.txt
npm install
npm start
```

In **Capture Studio**, choose a saved `.webm` recording. Enter one or more video timestamps in the **Dodge & Kiting Analysis** section (`65.2,88.7`). Click **Analyze selected recording**. OpenCV opens a frame for each timestamp; drag a rectangle around the player and then the visible projectile (for skillshots) or enemy (for kiting windows). Press Enter after each rectangle. The tool tracks the seeded objects automatically and writes a `.mechanics.json` report next to the recording; the app imports it into **Mechanics Lab**.

This is **annotation-assisted** automation. If a video cannot be opened or tracking quality is low, the event will be marked insufficient/uncertain. Setting multiple timestamps does not make new unseen projectiles detectable. For a more autonomous system, supply externally produced labeled object trajectories with the same schema and run:

```bash
python vision/analyze.py --tracks vision/example-tracks.json
```

The input detector requires temporal `player`, `projectile`, and optional `enemy` observations in screen coordinates. See `vision/example-tracks.json`. Without validated, patch-aware models trained to recognize League champion/projectile/attack animations across many champions, reliable end-to-end automatic dodging and all 45 skill scores are **not yet possible**. The master metric coverage matrix therefore uses `telemetry`, `candidate`, `proxy`, or `needs review`, and **never automatically updates ranked mastery**.

Run automated checks with `npm test` and `python -m unittest discover -s vision -p test_analyze.py`.
