import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Systeme.io Registration Relay (Vercel Serverless Function)
 *
 * Supports two modes (configure one):
 *  1) WEBHOOK mode: forwards the user payload to a Systeme.io form/webhook URL
 *     - Set: SYSTEME_WEBHOOK_URL
 *  2) API mode: calls a Systeme.io API endpoint with a Bearer token
 *     - Set: SYSTEME_API_BASE, SYSTEME_API_TOKEN
 *
 * Expected JSON payload from your frontend: { name, email, company, phone }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res
      .setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      .status(200)
      .end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || origin || '*');
  res.setHeader('Vary', 'Origin');

  const { name, email, company, phone } = (req.body || {}) as Record<string, string>;

  if (!name || !email || !company || !phone) {
    return res.status(400).json({ error: 'Missing required fields: name, email, company, phone' });
  }

  const usingWebhook = !!process.env.SYSTEME_WEBHOOK_URL;
  const usingApi = !!(process.env.SYSTEME_API_BASE && process.env.SYSTEME_API_TOKEN);

  if (!usingWebhook && !usingApi) {
    return res.status(500).json({ error: 'Server not configured. Set SYSTEME_WEBHOOK_URL or SYSTEME_API_BASE + SYSTEME_API_TOKEN.' });
  }

  try {
    let upstreamResp: Response;

    if (usingWebhook) {
      // Mode 1: Forward to Systeme.io form/webhook (most common)
      upstreamResp = await fetch(process.env.SYSTEME_WEBHOOK_URL as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, phone }),
      });
    } else {
      // Mode 2: Call Systeme.io API (example placeholder)
      // NOTE: Replace path/fields with your actual Systeme.io API endpoint/contract.
      const apiUrl = `${process.env.SYSTEME_API_BASE!.replace(/\/$/, '')}/contacts`;
      upstreamResp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SYSTEME_API_TOKEN}`,
        },
        body: JSON.stringify({
          name,
          email,
          // Map custom fields according to your Systeme.io account setup:
          // Example: tags, funnels, custom fields, etc.
          metadata: {
            company,
            phone,
            source: 'pwa-registration'
          }
        }),
      });
    }

    if (!upstreamResp.ok) {
      const text = await upstreamResp.text();
      return res.status(502).json({ error: 'Systeme.io upstream error', details: text.slice(0, 2000) });
    }

    // Try to parse a JSON response; ignore if not JSON
    let data: any = null;
    try { data = await upstreamResp.json(); } catch {}

    return res.status(200).json({ ok: true, data });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
}
