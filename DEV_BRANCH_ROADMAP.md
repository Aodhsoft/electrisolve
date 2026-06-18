# ElectriSolve — Dev Branch Roadmap (Tier 2: real backend)
# Handoff prompt for moving from frontend demo -> real product.

## BUILD PRIORITIES (in order)

### 1. Persistence + auth (FIRST)
- Supabase (recommended) for DB + auth. Real sign-up/sign-in for homeowners AND contractors.
- Persist: user accounts, posted jobs, bids, messages, contractor profiles.
- NOTE: current "login" is fake (just shows dashboard). All seeded conversations/jobs are
  frontend JS that resets on reload — these become DB tables.

### 2. Payments
- Stripe Billing for 3 tiers: $79 Starter / $179 Pro / $349 Company.
- Gate contractor dashboard behind active subscription. Handle subscribe/cancel/renewal.

### 3. Live AI diagnosis (CORE DIFFERENTIATOR) — ALREADY PARTLY BUILT
- /api/diagnose already EXISTS and works (Sonnet, server-side key, rate-limited + spam-filtered).
- Current output keys: title, summary, severity, severityReason, scope, estimatedCost,
  timeToComplete, tradeRequired, permitRequired, safetyWarning, quickFixes[], whenToCallPro.
- Spec below proposes a slightly different schema (diagnosis/cost_range_usd/etc). DECIDE: either
  migrate to the new schema OR map the new fields onto existing ones. Don't build a 2nd endpoint blindly.
- TODO for Tier 2: save the parsed diagnosis to the job record so contractors see it before bidding.

### 4. License verification
- Colorado DORA license check before contractor activation. "Verified" badge only after pass.
- NOTE: DORA has no official public API — likely need their lookup site / DORA data download /
  a 3rd-party licensing API. Budget for manual review fallback.

### 5. Marketplace trust + liveness
- Seed 5 real sample jobs. Homeowner review/rating flow tied to completed jobs.
- Connect dashboard stats (new jobs, active bids, won) to real data.

## KEEP existing design + structure. Additions, not redesign.

## ALREADY DONE (don't rebuild):
- /api/diagnose + /api/quicktips serverless functions (server-side key, rate limit, spam filter)
- Full messaging UI both sides (contractor.html + messages.html), quote builder, milestone payments
- WS1-5 trust features, why.html pitch page, funding.html calculator
- Verification GATE UI on job submission (demo only — needs real Twilio SMS + address API for Tier 2)

## DURABLE RATE LIMITING + SMS — see DEV_BRANCH_REDIS_SPEC.md (Upstash Redis + Twilio)

## AI DIAGNOSIS SPEC (proposed Tier 2 schema)
See DEV_BRANCH_AI_SPEC.md (saved alongside this file).

## CRITICAL CARRYOVERS
- API key NEVER in browser. Always server-side (process.env.ANTHROPIC_API_KEY). Already done this way.
- Cost ranges are ESTIMATES not quotes — keep "preliminary, verify with licensed electrician"
  disclaimer prominent in UI. Legal protection + honest expectations.
- Public AI endpoints are billable — keep the rate limiting + spam filter when refactoring.
- Model string in use: claude-sonnet-4-6 (diagnosis), claude-haiku-4-5-20251001 (quicktips).
