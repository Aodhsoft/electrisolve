// Vercel Serverless Function — /api/quicktips
// Fast, cheap Haiku-powered quick tips for the homepage search bar.
// Protected with rate limiting + spam/troll filtering to control API cost.

// Simple in-memory rate limiter (per warm instance). Resets on cold start.
// Not bulletproof, but blocks the obvious bill-running abuse.
const RATE = {};
const WINDOW_MS = 60 * 1000;   // 1 minute window
const MAX_PER_WINDOW = 8;       // max AI calls per IP per minute
const MAX_PER_DAY = 60;         // soft daily ceiling per IP
const DAY_MS = 24 * 60 * 60 * 1000;

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}

function rateCheck(ip) {
  const now = Date.now();
  let r = RATE[ip];
  if (!r) { r = RATE[ip] = { hits: [], dayStart: now, dayCount: 0 }; }
  // reset daily counter
  if (now - r.dayStart > DAY_MS) { r.dayStart = now; r.dayCount = 0; }
  // prune old hits outside the window
  r.hits = r.hits.filter(t => now - t < WINDOW_MS);
  if (r.hits.length >= MAX_PER_WINDOW) return { ok: false, reason: 'rate' };
  if (r.dayCount >= MAX_PER_DAY) return { ok: false, reason: 'daily' };
  r.hits.push(now);
  r.dayCount++;
  return { ok: true };
}

// Spam / troll / junk detection — runs BEFORE any paid API call
function looksLikeSpam(q) {
  const s = q.trim();
  if (s.length < 4) return 'too short';
  if (s.length > 400) return 'too long';
  // mostly non-letters (gibberish / symbol spam)
  const letters = (s.match(/[a-zA-Z]/g) || []).length;
  if (letters / s.length < 0.4) return 'gibberish';
  // same char repeated a lot (aaaaaaa, !!!!!!)
  if (/(.)\1{6,}/.test(s)) return 'repeated chars';
  // no spaces in a long string = likely junk
  if (s.length > 30 && !s.includes(' ')) return 'no spaces';
  // url / link spam
  if (/(https?:\/\/|www\.|\.(com|net|org|ru|xyz)\b)/i.test(s)) return 'links';
  // obvious abuse / off-topic spam keywords
  const bad = ['viagra','casino','crypto','bitcoin','porn','sex','loan','seo service','buy followers'];
  const low = s.toLowerCase();
  if (bad.some(b => low.includes(b))) return 'spam keywords';
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Server not configured.' }); return; }

  // 1) Rate limit
  const ip = clientIp(req);
  const rc = rateCheck(ip);
  if (!rc.ok) {
    res.status(429).json({ error: 'rate_limited', message: rc.reason === 'daily' ? 'Daily limit reached. Please try again tomorrow or post a job for full help.' : 'Too many requests — please wait a moment.' });
    return;
  }

  try {
    const { query = '' } = req.body || {};
    if (!query.trim()) { res.status(400).json({ error: 'No query.' }); return; }

    // 2) Spam / troll filter — reject before spending on the API
    const spam = looksLikeSpam(query);
    if (spam) {
      res.status(200).json({ isElectrical: false, severity: null, summary: null, tips: null, callPro: null, callProReason: null, filtered: true });
      return;
    }

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
          content: 'You are a helpful electrician assistant. A homeowner typed: "' + query.trim() + '". Respond ONLY with valid JSON, no markdown: {"isElectrical": true, "severity": "high|medium|low", "summary": "One sentence plain-English explanation", "tips": ["First quick safe check","Second quick check","Third quick check"], "callPro": true, "callProReason": "One sentence on when to call a pro"}. If the query is not electrical, set isElectrical to false and other fields to null. Keep tips short, one sentence each, safe for a homeowner.'
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
