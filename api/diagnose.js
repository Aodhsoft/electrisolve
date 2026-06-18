// Vercel Serverless Function — /api/diagnose
// Sonnet-powered full job diagnosis. Protected with rate limiting + spam filtering.

const RATE = {};
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;        // diagnosis is heavier — stricter than quicktips
const MAX_PER_DAY = 30;
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
  if (now - r.dayStart > DAY_MS) { r.dayStart = now; r.dayCount = 0; }
  r.hits = r.hits.filter(t => now - t < WINDOW_MS);
  if (r.hits.length >= MAX_PER_WINDOW) return { ok: false, reason: 'rate' };
  if (r.dayCount >= MAX_PER_DAY) return { ok: false, reason: 'daily' };
  r.hits.push(now); r.dayCount++;
  return { ok: true };
}
function looksLikeSpam(q) {
  const s = (q || '').trim();
  if (!s) return null; // image-only requests allowed
  if (s.length < 4) return 'too short';
  if (s.length > 800) return 'too long';
  const letters = (s.match(/[a-zA-Z]/g) || []).length;
  if (letters / s.length < 0.4) return 'gibberish';
  if (/(.)\1{6,}/.test(s)) return 'repeated chars';
  if (/(https?:\/\/|www\.|\.(com|net|org|ru|xyz)\b)/i.test(s)) return 'links';
  const bad = ['viagra','casino','crypto','bitcoin','porn','sex','loan','seo service','buy followers'];
  const low = s.toLowerCase();
  if (bad.some(b => low.includes(b))) return 'spam keywords';
  return null;
}

// Hate-speech / abuse gate. Pattern-based first pass; the AI vision+text moderation
// (moderationCheck below) is the real backstop. Collapses leetspeak/spacing evasions.
function looksAbusive(q) {
  const s = (q || '').toLowerCase();
  if (!s.trim()) return false;
  // collapse common obfuscation: spaces/dots/dashes between letters, leet digits
  const norm = s
    .replace(/[\s._\-*]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/@/g, 'a').replace(/\$/g, 's');
  // Slur/hate stems kept minimal; matches the obfuscation-collapsed string.
  const stems = ['nigg','n1gg','faggot','fagot','retard','kike','spic','chink','wetback','tranny','beaner','coon','dyke','gook','raghead','sandnigg','whitepower','heilhitler','kkk'];
  if (stems.some(t => norm.includes(t))) return true;
  // explicit threats / violence directed language
  if (/\b(kill|murder|rape|lynch)\s+(you|them|all|the)\b/.test(s)) return true;
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' }); return; }
  const ip = clientIp(req);
  const rc = rateCheck(ip);
  if (!rc.ok) { res.status(429).json({ error: 'rate_limited', message: rc.reason === 'daily' ? 'Daily analysis limit reached. Please try again tomorrow.' : 'Too many requests — please wait a moment before analyzing again.' }); return; }
  try {
    const { description = '', location = '', duration = '', imageBase64 = null, imageType = null } = req.body || {};
    if (!description && !imageBase64) { res.status(400).json({ error: 'No description or image provided.' }); return; }
    const spam = looksLikeSpam(description);
    if (spam) { res.status(400).json({ error: 'invalid_input', message: 'Please describe your electrical issue in plain English so we can help.' }); return; }
    if (looksAbusive(description)) { res.status(400).json({ error: 'content_blocked', message: 'Your submission contains language that violates our community guidelines and was not posted.' }); return; }
    const userContent = [];
    if (imageBase64 && imageType) { userContent.push({ type: 'image', source: { type: 'base64', media_type: imageType, data: imageBase64 } }); }
    const prompt = 'You are an expert residential electrician AI that also screens submissions for a public job board. A homeowner reports: "' + (description || 'See photo') + '" - location: ' + (location || 'unspecified') + ' - duration: ' + (duration || 'unspecified') + '.' + (imageBase64 ? ' An image is attached.' : '') + ' FIRST screen the submission. Return ONLY valid JSON, no markdown. Include a "moderation" object with these keys: appropriate (true only if the text AND any image are a genuine, good-faith electrical/home-repair issue suitable for a public board), isElectrical (true if it concerns an electrical or home-repair problem), reason (short phrase if not appropriate, else null). Set appropriate=false if the image is a meme, screenshot, joke, selfie, unrelated photo, offensive/explicit/violent imagery, or anything not a real electrical problem; or if the text is hateful, abusive, harassing, sexual, threatening, gibberish, advertising, or otherwise not a sincere repair request. If moderation.appropriate is false, set all diagnosis fields to null. If appropriate is true, ALSO return these diagnosis keys: title (short, max 10 words), summary (2-3 sentences plain English), severity (high|medium|low), severityReason (one sentence), scope (brief professional work needed), estimatedCost (range like $200-400), timeToComplete (like 2-4 hours), tradeRequired (Licensed electrician|Master electrician|Journeyman electrician), permitRequired (true or false), safetyWarning (null or a string), quickFixes (array of 3-5 objects each with title, detail, and difficulty which is easy or moderate), whenToCallPro (one sentence). For quickFixes give specific safe steps addressing the EXACT symptoms, not generic advice. If dangerous (smoke, sparking, burning smell, shock) set safetyWarning and give minimal quickFixes. Friendly encouraging tone like a knowledgeable neighbor.';
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
    // Enforce AI moderation verdict server-side
    if (diag && diag.moderation && diag.moderation.appropriate === false) {
      res.status(400).json({ error: 'content_blocked', message: 'This submission was flagged by our content check and was not posted. Please submit a genuine electrical issue.', reason: diag.moderation.reason || null });
      return;
    }
    res.status(200).json(diag);
  } catch (e) {
    res.status(500).json({ error: 'Server error', detail: String(e).substring(0, 300) });
  }
}
