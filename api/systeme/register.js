export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, company, phone, password } = req.body || {};
  if (!name || !email || !company || !phone) {
    return res.status(400).json({ error: 'Missing required fields: name, email, company, phone' });
  }

  const usingWebhook = !!process.env.SYSTEME_WEBHOOK_URL;
  const usingApi     = !!(process.env.SYSTEME_API_BASE && process.env.SYSTEME_API_TOKEN);
  if (!usingWebhook && !usingApi) {
    return res.status(500).json({
      error: 'Server not configured. Set SYSTEME_WEBHOOK_URL or SYSTEME_API_BASE + SYSTEME_API_TOKEN.'
    });
  }

  try {
    let upstreamResp;

    if (usingWebhook) {
      // Attempt JSON first
      upstreamResp = await fetch(process.env.SYSTEME_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, phone, password }),
      });

      if (!upstreamResp.ok) {
        // Fallback to form-encoded
        const form = new URLSearchParams({ name, email, company, phone, password });
        upstreamResp = await fetch(process.env.SYSTEME_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        });
      }
    } else {
      // Direct API
      const apiUrl = `${process.env.SYSTEME_API_BASE.replace(/\/$/, '')}/contacts`;
      upstreamResp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SYSTEME_API_TOKEN}`,
        },
        body: JSON.stringify({
          name,
          email,
          password, // optional, if Systeme.io ignores it, no harm
          metadata: { company, phone, source: 'pwa-registration' }
        }),
      });
    }

    const text = await upstreamResp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!upstreamResp.ok) {
      return res.status(502).json({ error: 'Systeme.io upstream error', details: String(data).slice(0, 2000) });
    }

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
}