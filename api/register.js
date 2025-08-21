export default async function handler(req, res) {
    // ---- CORS (always set before any early returns)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // cache preflight for a day
  
    // Preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  
    // Simple health check (useful for testing)
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true, message: 'Register API ready' });
    }
  
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    // ---- Body parsing (be defensive)
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    } else if (!body || typeof body !== 'object') {
      body = {};
    }
  
    const name   = body.name   ?? body.Name   ?? '';
    const email  = body.email  ?? body.Email  ?? '';
    const company= body.company?? body.Company?? null;
    const phone  = body.phone  ?? body.Phone  ?? null;
  
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
  
    // Basic email sanity (same as frontend)
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
    if (!emailOk) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
  
    const token = process.env.NOCODB_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'Server configuration error - missing API token' });
    }
  
    // ---- Build NocoDB request
    const url = 'https://app.nocodb.com/api/v2/tables/mwkq2v9p5kju2py/records';
    const payload = {
      Name: name,
      Email: email,
      Company: company || null,
      Phone: phone || null,
    };
  
    // Timeout guard (Node 18+ has global fetch)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s
  
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xc-token': token,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
  
      const text = await resp.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; }
      catch {
        // If NocoDB misbehaves and returns non-JSON
        return res.status(502).json({ error: 'Invalid response from database', raw: text });
      }
  
      if (!resp.ok) {
        // Common NocoDB fields: message/msg/error
        const msg = data?.message || data?.msg || data?.error || 'Failed to create record';
        return res.status(resp.status).json({ error: msg, details: data });
      }
  
      // Try to normalize ID casing
      const id = data?.Id ?? data?.id ?? data?.ID ?? null;
  
      return res.status(201).json({
        ok: true,
        id,
        record: data,
      });
    } catch (err) {
      const aborted = err?.name === 'AbortError';
      return res.status(aborted ? 504 : 500).json({
        error: aborted ? 'Upstream timeout' : 'Server error',
        details: err?.message || String(err),
      });
    } finally {
      clearTimeout(timeout);
    }
  }
  