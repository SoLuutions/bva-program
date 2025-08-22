// Vercel Serverless Function: Validate reviewer token and return hidden pricing URL
// Env vars required:
//  - REVIEWER_TOKENS        e.g. "RVW-ALPHA123,RVW-BETA456,RVW-GAMMA789"
//  - REVIEWER_PRICING_URL   e.g. "https://command-results.passion.io/pricing?reviewer=1"

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
  
    const { token } = req.body || {};
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }
  
    const raw = process.env.REVIEWER_TOKENS || '';
    const whitelist = raw.split(',').map(s => s.trim()).filter(Boolean);
    const targetUrl = process.env.REVIEWER_PRICING_URL || '';
  
    if (!whitelist.length || !targetUrl) {
      res.status(500).json({ error: 'Reviewer access is not configured' });
      return;
    }
  
    const match = whitelist.find(t => t.toLowerCase() === String(token).toLowerCase());
    if (!match) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  
    // Optional: add logging here (e.g., console.log, Vercel Analytics, or a KV write)
  
    res.status(200).json({ ok: true, url: targetUrl });
  };
  