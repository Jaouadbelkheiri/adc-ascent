# No-API-key player search: administrator setup

The desktop and website users only enter their Riot ID and server. `worker/public-api.mjs` holds the Riot integration. **Never commit the API key** or return it to the renderer.

1. Obtain a Riot developer key for private prototyping and **appropriate Riot approval for public use**. Riot prohibits unrestricted public products using development/personal keys. The provided Worker is **disabled by default**.
2. `cd worker`; copy `wrangler.public.toml.example` to `wrangler.public.toml`; `npx wrangler secret put RIOT_API_KEY --config wrangler.public.toml`; set allowed website origins and `PUBLIC_SEARCH_ENABLED` according to your approved use.
3. `npx wrangler deploy --config wrangler.public.toml` (Wrangler v4.36+). Test `https://adc-ascent-api.jaouadbelkheiri7.workers.dev/health` first. The frontend should report *backend not configured* until the secret is set and search enabled.
4. On the Windows app, open Find Player and enter `GameName#Tag`, server. Select **Track my matches** for background sync.
5. For public traffic use Riot production access, appropriately configured Cloudflare WAF/Turnstile, more robust global rate limits, logging and monitoring. Per-location Worker rate limiting is approximate.

Endpoints:

- `GET /health` — public sanitized connection status
- `GET /api/profile?riotId=GameName%23Tag&region=EUW1` — Riot ID → PUUID and rank/profile
- `GET /api/matches?riotId=GameName%23Tag&region=EUW1&start=0&count=5` — normalized completed match data

Caching: account identifiers 10 minutes, profiles/rank up to 5/2 minutes, match ID pages 45 seconds, historical match details and timelines 24 hours. Responses preserve ADC and off-role match distinction. No hidden live-game information or invented 45-metric certifications. Do not rely on CORS alone for rate limiting/access control.
