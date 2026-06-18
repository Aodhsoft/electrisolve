export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' }); return; }
  try {
    const { description = '', location = '', duration = '', imageBase64 = null, imageType = null } = req.body || {};
    if (!description && !imageBase64) { res.status(400).json({ error: 'No description or image provided.' }); return; }
    const userContent = [];
    if (imageBase64 && imageType) { userContent.push({ type: 'image', source: { type: 'base64', media_type: imageType, data: imageBase64 } }); }
    const prompt = 'You are an expert residential electrician AI. A homeowner reports: "' + (description || 'See photo') + '" - location: ' + (location || 'unspecified') + ' - duration: ' + (duration || 'unspecified') + '. Return ONLY valid JSON, no markdown, with these exact keys: title (short, max 10 words), summary (2-3 sentences plain English), severity (high|medium|low), severityReason (one sentence), scope (brief professional work needed), estimatedCost (range like $200-400), timeToComplete (like 2-4 hours), tradeRequired (Licensed electrician|Master electrician|Journeyman electrician), permitRequired (true or false), safetyWarning (null or a string), quickFixes (array of 3-5 objects each with title, detail, and difficulty which is easy or moderate), whenToCallPro (one sentence). For quickFixes: give specific safe steps addressing the EXACT symptoms, not generic advice. Good example for kitchen breaker tripping with dishwasher: unplug counter appliances like microwave air fryer toaster before running the dishwasher. Bad: reset the breaker. If dangerous (smoke, sparking, burning smell, shock) set safetyWarning and give minimal quickFixes. Friendly encouraging tone like a knowledgeable neighbor.';
    userContent.push({ type: 'text', text: prompt });
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, messages: [{ role: 'user', content: userContent }] })
    });
    if (!anthropicRes.ok) { const errText = await anthropicRes.text(); res.status(502).json({ error: 'AI service error', detail: errText.substring(0, 300) }); return; }
    const data = await anthropicRes.json();
    const raw = (data.content || []).map(function(c){ return c.text || ''; }).join('').replace(/```json|```/g, '').trim();
    let diag;
    try { diag = JSON.parse(raw); } catch (e) { res.status(502).json({ error: 'Parse error', raw: raw.substring(0, 300) }); return; }
    res.status(200).json(diag);
  } catch (e) {
    res.status(500).json({ error: 'Server error', detail: String(e).substring(0, 300) });
  }
}
