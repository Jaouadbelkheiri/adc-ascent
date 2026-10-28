# ADC ASCENT v0.7 — Unified Analytics Hub

The default **Analytics Hub** now unifies player profile, match history, champion performance, game-by-game trends, recent-versus-previous comparisons, personal build snapshots, and automatic evidence coverage. It is independently implemented from Riot match data and local records. It does **not** scrape proprietary OP.GG, U.GG, Mobalytics, DeepLoL or League of Graphs metrics, nor does it claim their proprietary ratings.

**New pages:** Analytics Hub (default) and existing Training Command, Skill Tree, Champion Forge, Training Plan, Match History, Capture Studio, Mechanics Lab, VOD Review Lab and Performance Insights.

**Data:** The Windows companion can discover a player's PUUID from Riot ID and backfill match history with a personal API key. Future imports preserve available participant gold, damage, vision, item snapshots, runes and kill participation. Older imported matches may have fewer fields until reimported. Benchmarks are only against the player's own imported games. Build snapshots are *final inventories*, not item order or best meta builds.

**Reliability:** Recent versus previous comparisons require at least 5 games in each sample. Missing data display as dashes, not zero scores. Riot statistical signals remain distinct from verified mastery evidence. This is a post-game coaching application, not an official Riot product or replacement for OP.GG, U.GG, DeepLoL, League of Graphs or Mobalytics.

Run `npm install && npm start` for the Windows desktop application. For the local web UI, run `npm run web`; match auto-sync requires Electron and a valid Riot API key.

---

# ADC ASCENT — Standalone ADC Training & Replay Studio (v0.6)

Independent **personal** League of Legends ADC development app. Not integrated with ARISE, not affiliated with Riot Games, and not a clone of Replay.gg or Mobalytics.

## Automatic match detection and 45-metric evidence (v0.6)

ADC ASCENT can **automatically import your completed matches while the Windows companion is running**, including games played before installing it where match-v5 still makes the history available. It imports player statistics, available Riot challenge counters, 10- and 15-minute timeline snapshots, and teamfight review candidates. It automatically deduplicates records by Riot match ID and gradually paginates older history. Newest games are checked every **three minutes**; backfill processes another page per poll, respecting Riot's rate limits. This does not imply that every historically played match exists on Riot's API.

**One-time setup — recommended personal desktop mode (no proxy required):**

1. Create a developer account at <https://developer.riotgames.com/> and obtain a Riot Developer API key. A development key deactivates after 24 hours; register this personal app for a longer-lived personal key if eligible.
2. On your Windows computer, install Node.js 22+, then run `npm install` and `npm start` in the project directory.
3. Go to **Capture Studio → Match Sync**, choose **Personal desktop API key**, enter your full Riot ID (`GameName#Tag`), your LoL platform (EUW/EUNE/etc), and paste your Riot Developer API key.
4. Click **Find my profile**. The app queries the Riot Account API for your PUUID and, when available, retrieves your summoner level, icon and Solo/Duo rank. Confirm that the displayed profile is yours.
5. Click **Save & enable sync**. The Windows companion encrypts the key using Electron `safeStorage` and stores it locally. It polls recent completed matches every three minutes while the desktop app is running and paginates older matches gradually. **All eligible LoL match roles are archived**; ADC performance analysis is filtered to bottom-lane marksmen games, excluding off-role samples.
6. Open **Performance Insights** for ADC statistics, recent-vs-previous trend summaries, champion samples and 45-metric evidence coverage. Use **Sync now** and **Backfill history** if necessary.

**Advanced proxy mode:** To avoid keeping your Riot API key on the PC, the existing Cloudflare Worker remains available. Configure `worker/wrangler.toml.example`, set `RIOT_API_KEY` and `ADC_ACCESS_TOKEN` as Worker secrets, deploy using Wrangler, then choose **Cloudflare proxy** in Capture Studio and enter the Worker URL and access token. The proxy also returns all played roles while marking ADC eligibility.

**Credential safeguards:** The personal key is sent only from Electron's main process to official `*.api.riotgames.com` hosts over HTTPS, never embedded in the page, local backups or GitHub. The locally encrypted key is never returned to the renderer. Disconnect in the app to delete it. This does **not** require your Riot password or Riot Sign On. It does require a valid API key and a network connection. No real user match history can be retrieved without these.

**Scope and evidence integrity:** Riot `skillshotsDodged`, CS/min, damage/min, gold/min, vision score/min, deaths/10min, and lane checkpoints are genuine post-game indicators when available, **not** measurements of dodge success rate, correct spacing, wave decisions, or all 45 tactical skills. The 45-metric table indicates measured / not reported / VOD-required and does **not** fabricate grades, confidence, or verified F → Monarch certifications. No API exists that automatically and reliably certifies all 45 skills. Some visual mechanics can be analyzed from user-recorded video, but require better validated models and proper player context.

**Optional post-game recording analysis:** In Capture Studio, enable **Auto-analyze recorded gameplay when it ends**. After you manually authorize game-window recording and stop, the companion runs the experimental projectile-candidate scanner over up to the first 10 minutes, then sends the resulting unverified events to Mechanics Lab. Unattended game-window capture still requires explicit screen-sharing authorization; the app cannot silently start screen recording. If Python/OpenCV isn't installed, recording still succeeds but video analysis fails with a diagnostic. Vision candidate detection is not validated dodge/kiting scoring.

**Safety:** Analysis happens after the match, with no injection or game-memory scraping. The private Worker requires a bearer token and CORS restrictions; do not deploy an open public data proxy. Do not share tokens or `.webm` recordings publicly. Video analysis and input-APM functionality have not been verified against a real Windows League installation in this environment.

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

## Alternative Riot match sync through Cloudflare (optional)

1. Create a Riot Developer Portal app, review current Riot requirements, and obtain API credentials appropriate for your use case.
2. In `worker/`, copy `wrangler.toml.example` to `wrangler.toml`.
3. Run `npx wrangler secret put RIOT_API_KEY` and `npx wrangler secret put ADC_ACCESS_TOKEN` (choose a long unique token).
4. Run `npx wrangler deploy` from `worker/` (or `npx wrangler deploy --config worker/wrangler.toml` from this folder).
5. In **Capture Studio**, enter your Worker HTTPS URL, Riot ID and the personal access token. Only the Worker sees `RIOT_API_KEY`. The access token is held in the capture form, not in a backup. Riot sync is read-only, fetches up to ten match IDs per page with timelines for eligible ADC matches, and progressively backfills history.

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

## Experimental autonomous mechanical analysis (v0.4)

Open **Capture Studio → Auto-scan projectile candidates** after recording. The scanner runs locally on up to two minutes of footage and imports low-confidence visual motion candidates into Mechanics Lab. It no longer requires a manual projectile timestamp for *candidate discovery*. It does **not** know every spell's collision box, distinguish all VFX, or automatically certify a dodge. See [`vision/README_AUTOMATION.md`](vision/README_AUTOMATION.md) for the CLI and limitations.

`vision/attack_kiting.py` introduces attack-aware interval analysis from timestamped, provenance-labelled attack events (rather than only separation). It does not yet autonomously identify confirmed basic attacks in arbitrary footage. `metric-scoring.js` calculates F → Monarch gate qualification across all 45 metrics from eligible, reviewed evidence while preserving missing/unverified status; it does not conjure the missing observations.
