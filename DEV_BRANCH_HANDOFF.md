# ElectriSolve — Dev Branch Handoff (copy-paste this whole block to the dev-branch Claude)

You're picking up ElectriSolve, an AI electrical-diagnostics + contractor-leads marketplace.
The static front end is built and deployed (Vercel, github.com/Aodhsoft/electrisolve). Your job is
the backend + revenue path. Read BUILD_PROGRESS.md, DEV_BRANCH_ROADMAP.md, and DEV_BRANCH_AI_SPEC.md
in the repo first — they have the full state. Keep the existing design; these are ADDITIONS.

## IMPORTANT — what already exists (do NOT rebuild):
- /api/diagnose (Claude Sonnet) and /api/quicktips (Haiku) serverless functions. Server-side key,
  rate limiting, and spam filtering already implemented. KEEP these protections in any refactor.
- /api/diagnose ALREADY returns a rich schema: title, summary, severity, severityReason, scope,
  estimatedCost, timeToComplete, tradeRequired, permitRequired, safetyWarning, quickFixes[], whenToCallPro.
  >> DO NOT build a second diagnosis endpoint. The quickFixes[] array is a deliberate homeowner-retention
     feature — do not silently drop it. To add the cleaner schema fields (cost_range_usd as {low,high},
     etc.), EXTEND the existing endpoint and decide on ONE unified schema. See DEV_BRANCH_AI_SPEC.md.
- Full messaging UI (contractor.html + messages.html), quote builder, milestone payments, WS1-5 trust
  features, why.html pitch page, funding.html calculator.
- Job-submission verification gate: phone/address FORMAT validation + a 6-digit code modal. This is
  DEMO UI ONLY (accepts any 6 digits). Wiring it to a real SMS service is YOUR Tier 2 task.

## BUILD PRIORITIES (in order):

1. PERSISTENCE + AUTH (first). Supabase for DB + auth. Real sign-up/sign-in for homeowners AND
   contractors. Persist: accounts, jobs, bids, messages, contractor profiles. (Current login is fake;
   all seeded jobs/conversations are frontend JS that resets on reload — convert to DB tables.)

2. PAYMENTS. Stripe Billing, 3 tiers: $79 Starter / $179 Pro / $349 Company. Gate contractor dashboard
   behind active subscription. Handle subscribe/cancel/renewal.

3. LIVE AI DIAGNOSIS (core differentiator — endpoint already exists, see above). Tier 2 task: SAVE the
   parsed diagnosis to the job record so contractors see scope/severity/cost before bidding. Reconcile
   the schema per DEV_BRANCH_AI_SPEC.md. Keep the "preliminary — verify with a licensed electrician"
   disclaimer in the UI (legal protection; cost ranges are ESTIMATES not quotes).

4. LICENSE VERIFICATION. Colorado DORA check before contractor activation; "verified" badge only after
   pass. REALITY CHECK: DORA has no clean real-time public API — plan for a periodic data import or a
   3rd-party licensing-verification service, with a manual-review fallback. Not a one-afternoon job.

5. MARKETPLACE TRUST + LIVENESS. Seed 5 real sample jobs. Homeowner review/rating flow tied to completed
   jobs. Connect dashboard stats (new jobs, active bids, won) to real data.

## NON-NEGOTIABLES:
- API key NEVER in the browser. Always process.env.ANTHROPIC_API_KEY server-side.
- Keep rate limiting + spam filtering on all billable AI endpoints.
- Real SMS verification needs Twilio (~$0.0079/text) + address validation API — both paid Tier 2.
- Models in use: claude-sonnet-4-6 (diagnose), claude-haiku-4-5-20251001 (quicktips).
- In the AI spec, media_type must be validated against the actual upload (jpeg/png/webp) — do NOT
  hardcode image/jpeg even though the example shows it.

## DURABLE RATE LIMITING + REAL SMS (priority alongside #1 Persistence)
See DEV_BRANCH_REDIS_SPEC.md. Swaps the in-memory limiter + demo verify gate for Upstash Redis +
real Twilio SMS. Key points: preserve existing limits (quicktips 8/min,60/day; diagnose 5/min,30/day),
keep spam pre-filter running FIRST, rate-limit SMS *sends* per phone+IP (the expensive abuse vector),
rate limiting fails OPEN (in-memory backup) but SMS verification fails CLOSED. Normalize phone to
digits-only before keying Redis.
