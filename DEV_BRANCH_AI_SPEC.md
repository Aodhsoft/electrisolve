# AI Diagnosis — Tier 2 implementation spec

Server-side endpoint (/api/diagnose) the post-job flow calls. NEVER call the API from the browser.

## Endpoint behavior
- Accepts: homeowner text description + optional photo (base64)
- Calls Claude with text + image
- Returns structured JSON, saved to the job record

## API call structure
```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `You are an electrical diagnostic assistant for ElectriSolve. A homeowner describes an electrical problem (with optional photo). Return ONLY a valid JSON object, no markdown, no preamble, with this exact shape:
{
  "diagnosis": "plain-language description of the likely problem",
  "severity": "low" | "medium" | "high" | "emergency",
  "scope": "what work is likely required",
  "cost_range_usd": { "low": number, "high": number },
  "permit_required": boolean,
  "safety_warning": "string or null — non-null only if there is an immediate hazard"
}
Base cost estimates on US residential electrical rates. If the description suggests an immediate danger (burning smell, sparks, shock, smoke), set severity to "emergency" and populate safety_warning. You are not a substitute for an in-person licensed inspection — frame estimates as preliminary.`,
    messages: [
      {
        role: "user",
        content: [
          // include this image block ONLY if a photo was uploaded
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: photoBase64 } },
          { type: "text", text: homeownerDescription }
        ]
      }
    ]
  })
});

const data = await response.json();
const raw = data.content.find(b => b.type === "text")?.text ?? "";
const diagnosis = JSON.parse(raw.replace(/```json|```/g, "").trim());
```

## Requirements
- Wrap JSON.parse in try/catch; on failure retry ONCE, then fall back to "diagnosis pending manual review" rather than erroring the user out
- If no photo, OMIT the image content block entirely (don't send an empty one)
- Validate media_type matches the actual upload (jpeg/png/webp)
- Store parsed object on the job record so contractors see scope/severity/cost before bidding
- ALWAYS render "preliminary — verify with a licensed electrician" disclaimer alongside AI output

## NOTE vs existing endpoint
The live /api/diagnose returns a richer/different schema (title, quickFixes[], tradeRequired, etc).
Reconcile before shipping: pick ONE schema. The quickFixes feature is a homeowner retention play —
don't drop it without deciding to. Easiest path: keep existing endpoint, ADD the cost_range_usd/
permit_required fields if missing, and save the whole object to the job record.
