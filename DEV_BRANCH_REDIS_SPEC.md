# ElectriSolve — Durable Rate Limiting + Real SMS Verification (Tier 2)

Replace the in-memory rate limiter and demo verification with production versions backed by
Upstash Redis. The current in-memory limiter resets on cold starts and isn't shared across
serverless instances — it stops casual abuse only. This closes that gap.

## 1. Upstash Redis setup
- Create an Upstash Redis DB (free tier ok to start). Get REST URL + token.
- Env vars (NEVER hardcode): UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN.
- Use @upstash/redis + @upstash/ratelimit — HTTP-based, built for serverless, no connection pooling.

## 2. Migrate rate limiting on BOTH AI endpoints (api/quicktips.js, api/diagnose.js)
- Replace in-memory counters with @upstash/ratelimit sliding-window limiters.
- PRESERVE limits: quicktips 8/min AND 60/day; diagnose 5/min AND 30/day.
  (Two windows per endpoint = two limiter instances, both must pass.)
- Key by client IP from x-forwarded-for; it can be a comma list — take the FIRST entry, trim it.
- KEEP the spam/gibberish pre-filter, and run it BEFORE the rate-limit check so junk costs neither a
  Redis command nor an API call. (Also helps stay under Upstash free-tier daily command cap.)
- On limit exceeded: HTTP 429 with the SAME friendly message the UI already handles
  ({error:'rate_limited', message:'...'}). index.html already renders 429 — don't change that contract.

## 3. Real SMS verification (replace accept-any-6-digits demo in post-job.html flow)
- On submit: generate random 6-digit code, store in Redis keyed by phone w/ 10-min TTL (SETEX).
  Send via Twilio (or similar); creds in env vars.
- On entry: look up code, compare, on match DELETE key + allow post.
- Rate-limit code SENDS per phone (e.g. 3 / 15 min) AND per IP — SMS-bombing is the expensive
  abuse vector (each send costs real $). This matters more than the read-side limit.
- Limit verification ATTEMPTS per code (e.g. 5) then invalidate — prevents brute force.
- Remove the "demo — accepts any 6 digits" label (verify-demo-note) from post-job.html once live.

## 4. KEEP
- Existing modal HTML/CSS + front-end flow (verify-overlay, verify-code, verify-phone-last4,
  verify-error, submitVerifyCode/openVerifyGate/closeVerifyGate). This is a backend swap; UX
  unchanged except the code is now real.
- Server-side-only secrets. Nothing new exposed to the browser.

## WATCH OUT (decisions to make explicit)
- Redis outage: DON'T hard-fail the whole endpoint. RECOMMENDED: rate limiting fails OPEN with the
  existing in-memory limiter as backup (availability > perfect limiting on the cheap read path).
  But SMS verification should fail CLOSED — if you can't store/verify a code, do NOT let the job post
  (a broken verifier that waves everything through is worse than a brief error). Make both explicit.
- Upstash free tier has a daily command cap — spam pre-filter first is what keeps you under it.
- x-forwarded-for behind Vercel = comma-separated; first entry is the client.
- Phone keys: normalize to digits-only (strip +, spaces, dashes) before using as a Redis key, or
  '7205550100' and '(720) 555-0100' become different keys and verification breaks.
- TTL on the rate-limit keys themselves so abandoned IPs don't accumulate (sliding-window handles this).
- Consider a global per-day SMS spend ceiling (across ALL phones) as a backstop against a coordinated
  SMS-bomb that rotates phone numbers — one more key, cheap insurance on your Twilio bill.
