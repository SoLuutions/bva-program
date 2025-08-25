// /api/reviewer/verify.js — NocoDB-backed implementation
// - Case-insensitive token allowlist (REVIEWER_TOKENS) [optional]
// - Single-use enforcement in NocoDB table (required)
// - Expiry check via REVIEWER_TOKEN_EXPIRY (YYYY-MM-DD)
//
// Required ENV:
//   NOCODB_BASE_URL=https://your-nocodb.example.com
//   NOCODB_API_TOKEN=xxxxx  (Personal Access Token; will be sent as 'xc-token' header)
//   NOCODB_TABLE_ID=tbl_xxx  (Table ID or slug for Tokens table)
// Columns expected in the NocoDB table:
//   token (TEXT, unique)
//   used (BOOLEAN, default false)
//   used_at (DATETIME, nullable)
//   used_ip (TEXT, nullable)
//   used_ua (TEXT, nullable)
//
// Optional ENV:
//   REVIEWER_TOKENS=RVW-2025-001,... (comma-separated allowlist; if set, token must be in this list)
//   REVIEWER_TOKEN_EXPIRY=2025-09-30
//   REVIEWER_SUCCESS_URL=...
//
// API used:
//   GET  /api/v2/tables/{tableId}/records?where=(token,eq,THE_TOKEN)
//   PATCH /api/v2/tables/{tableId}/records/{rowId}
//
const DEFAULT_EXPIRY = '2025-09-30';

async function ncFetch(path, init) {
  const base = process.env.NOCODB_BASE_URL;
  const token = process.env.NOCODB_API_TOKEN;
  if (!base || !token) throw new Error('Missing NOCODB_BASE_URL or NOCODB_API_TOKEN');
  const url = base.replace(/\/$/, '') + path;
  const headers = Object.assign(
    { 'xc-token': token },
    init && init.headers ? init.headers : {}
  );
  const resp = await fetch(url, { ...init, headers });
  return resp;
}

module.exports = async (req, res) => {
  const start = Date.now();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = (() => {
      try { return req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); }
      catch { return {}; }
    })();
    const tokenInput = (body.token || '').toString().trim();
    const norm = tokenInput.toUpperCase();

    const ua = req.headers['user-agent'] || '';
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      (req.socket && req.socket.remoteAddress) || '';

    const tableId = process.env.NOCODB_TABLE_ID;
    if (!tableId) {
      return res.status(500).json({ error: 'Server misconfigured (no NOCODB_TABLE_ID).' });
    }

    const EXPIRY = (process.env.REVIEWER_TOKEN_EXPIRY || DEFAULT_EXPIRY).trim();
    const SUCCESS_URL = process.env.REVIEWER_SUCCESS_URL || 'https://command-results.passion.io/checkout/361d3339-e248-4257-aad9-aee65055cf83';
    const listRaw = (process.env.REVIEWER_TOKENS || '').trim();
    const allowList = listRaw ? listRaw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : null;

    if (!norm) {
      log('fail', { reason: 'missing_token', ua, ip });
      return res.status(400).json({ error: 'Please enter your reviewer token.' });
    }

    // Optional allowlist check (keeps invites scoped by wave)
    if (allowList && !allowList.includes(norm)) {
      log('fail', { reason: 'not_in_allowlist', ua, ip, token: norm });
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }

    // Expiry check (inclusive)
    const exp = new Date(`${EXPIRY}T23:59:59Z`);
    if (Number.isNaN(exp.getTime()) || Date.now() > +exp) {
      log('fail', { reason: 'expired', ua, ip, token: norm, expiry: EXPIRY });
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }

    // Look up token in NocoDB (store tokens uppercase for simplicity)
    const where = `(token,eq,${encodeURIComponent(norm)})`;
    const listResp = await ncFetch(`/api/v2/tables/${encodeURIComponent(tableId)}/records?where=${where}`, {
      method: 'GET'
    });
    if (!listResp.ok) {
      const text = await listResp.text().catch(() => '');
      log('error', { reason: 'nocodb_list_failed', status: listResp.status, body: text });
      return res.status(500).json({ error: 'Token lookup failed.' });
    }
    const listJson = await listResp.json();
    const rows = Array.isArray(listJson.list) ? listJson.list : [];
    if (!rows.length) {
      log('fail', { reason: 'not_found', ua, ip, token: norm });
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }
    const row = rows[0]; // unique token ensures single row
    const rowId = row.Id || row.id || row._id || row._rowId || row.row_id || row['Id'];
    const used = !!(row.used);

    if (used) {
      log('fail', { reason: 'already_used', ua, ip, token: norm });
      return res.status(400).json({ error: 'This token has already been used.' });
    }

    // Mark used
    const payload = {
      used: true,
      used_at: new Date().toISOString(),
      used_ip: ip,
      used_ua: ua
    };
    const patchResp = await ncFetch(`/api/v2/tables/${encodeURIComponent(tableId)}/records/${encodeURIComponent(rowId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!patchResp.ok) {
      const text = await patchResp.text().catch(() => '');
      log('error', { reason: 'nocodb_patch_failed', status: patchResp.status, body: text, token: norm });
      return res.status(500).json({ error: 'Could not activate token. Please try again.' });
    }

    log('success', { ua, ip, token: norm, duration_ms: Date.now() - start });
    return res.status(200).json({ ok: true, url: SUCCESS_URL });
  } catch (err) {
    log('error', { reason: 'exception', message: err && err.message });
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }

  function log(status, extra) {
    try {
      console.log(JSON.stringify({ ts: new Date().toISOString(), status, ...extra }));
    } catch {}
  }
};
