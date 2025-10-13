// /api/reviewer/verify.js
const crypto = require('crypto');

const DEFAULT_EXPIRY = '2025-10-30';
const COOKIE_NAME = 'rvw_receipt';

function env(k, d = null) { return process.env[k] ?? d; }

function parseList(csv) {
  return (csv || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
}

function signReceipt(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return data + '.' + mac;
}

function verifyReceipt(token, cookieVal, secret) {
  if (!cookieVal) return false;
  const parts = cookieVal.split('.');
  if (parts.length != 2) return false;
  try {
    const [dataB64, mac] = parts;
    const calc = crypto.createHmac('sha256', secret).update(dataB64).digest('base64url');
    if (calc !== mac) return false;
    const obj = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    return obj && obj.token === token;
  } catch { return false; }
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
    const ua = req.headers['user-agent'] || '';
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || '';

    const tokenInput = (body.token || '').toString().trim();
    const norm = tokenInput.toUpperCase();

    const list = parseList(env('REVIEWER_TOKENS', ''));
    const EXPIRY = (env('REVIEWER_TOKEN_EXPIRY', DEFAULT_EXPIRY) || DEFAULT_EXPIRY).trim();
    const SECRET = env('REVIEWER_TOKEN_SECRET', '');

    // ✅ NEW: hardcoded redirect page
    const SUCCESS_URL = 'https://1a01-gary.systeme.io/80e7228b-reviewers';

    // Basic validations
    if (!norm) return json(res, 400, { error: 'Please enter your reviewer token.' });
    if (!list.length) return json(res, 500, { error: 'Token service not configured.' });

    const exp = new Date(`${EXPIRY}T23:59:59Z`);
    if (Number.isNaN(exp.getTime()) || Date.now() > +exp)
      return json(res, 400, { error: 'Invalid or expired token.' });
    if (!list.includes(norm))
      return json(res, 400, { error: 'Invalid or expired token.' });

    // Reuse guard
    const cookieHeader = req.headers['cookie'] || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(s => s.trim().split('=').map(decodeURIComponent)).filter(kv => kv.length === 2));
    const existing = SECRET ? cookies[COOKIE_NAME] : null;
    if (SECRET && verifyReceipt(norm, existing, SECRET))
      return json(res, 400, { error: 'This token has already been used on this device.' });

    // Success — set cookie and redirect
    const payload = { token: norm, at: new Date().toISOString(), ua };
    const headers = {};
    if (SECRET) {
      const signed = signReceipt(payload, SECRET);
      const cookie = `${COOKIE_NAME}=${encodeURIComponent(signed)}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
      headers['Set-Cookie'] = cookie;
    }

    res.writeHead(302, { Location: SUCCESS_URL, ...headers });
    return res.end();

  } catch (err) {
    console.error('verify error', err);
    return json(res, 500, { error: 'Something went wrong. Please try again.' });
  }

  function json(res, code, obj, extraHeaders = {}) {
    res.statusCode = code;
    for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
  }
};
