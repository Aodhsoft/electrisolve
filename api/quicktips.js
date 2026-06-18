// Vercel Serverless Function — /api/quicktips
// Fast, cheap Haiku-powered quick tips for the homepage search bar.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server not configured.' }); return; }

  try {
    const { query = '' } = req.body || {};
    if (!query.trim()) { res.status(400).json({ error: 'No query.' }); return; }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are a helpful electrician assistant. A homeowner typed: "${query}"

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "isElectrical": true,
  "severity": "high|medium|low",
  "summary": "One sentence plain-English explanation of what's likely happening",
  "tips": [
    "First quick thing to check or try yourself (specific, actionable)",
    "Second quick check (specific, actionable)",
    "Third quick check (specific, actionable)"
  ],
  "callPro": true,
  "callProReason": "One sentence on when to call a pro vs handle yourself"
}

If the query is not electrical, set isElectrical to false and all other fields to null.
Keep tips short — one sentence each. Focus on safe, simple checks a homeowner can do.`
        }]
      })
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      res.status(502).json({ error: 'AI service error', detail: errText.substring(0, 200) });
      return;
    }

    const data = await anthropicRes.json();
    const raw = (data.content || []).map(c => c.text || '').join('').replace(/```json|```/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { res.status(502).json({ error: 'Parse error' }); return; }

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'Server error', detail: String(e).substring(0, 200) });
  }
}
