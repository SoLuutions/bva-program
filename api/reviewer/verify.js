// /api/reviewer/verify.js — ENV-only allowlist (no DB); optional per-device receipt via HMAC cookie
// ENV:
//   REVIEWER_TOKENS=RVW-2025-001,RVW-2025-002,...
//   REVIEWER_TOKEN_EXPIRY=2025-09-30
//   REVIEWER_SUCCESS_URL=https://...
//   REVIEWER_TOKEN_SECRET=change_me   // used to sign per-device cookie receipts (optional)
const crypto = require('crypto');

const DEFAULT_EXPIRY = '2025-09-30';
const COOKIE_NAME = 'rvw_receipt';

function env(k, d=null){ return process.env[k] ?? d; }

function parseList(csv){
  return (csv || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
}

function signReceipt(payload, secret){
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return data + '.' + mac;
}

function verifyReceipt(token, cookieVal, secret){
  if (!cookieVal) return false;
  const parts = cookieVal.split('.');
  if (parts.length != 2) return false;
  try{
    const [dataB64, mac] = parts;
    const calc = crypto.createHmac('sha256', secret).update(dataB64).digest('base64url');
    if (calc !== mac) return false;
    const obj = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8'));
    return obj && obj.token === token;
  }catch{ return false; }
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
    const SUCCESS_URL = env('REVIEWER_SUCCESS_URL', '');
    const SECRET = env('REVIEWER_TOKEN_SECRET', '');

    // Basic validations
    if (!norm) {
      log('fail', { reason: 'missing_token', ua, ip });
      return json(res, 400, { error: 'Please enter your reviewer token.' });
    }
    if (!list.length) {
      log('error', { reason: 'empty_allowlist' });
      return json(res, 500, { error: 'Token service not configured.' });
    }
    // expiry (inclusive)
    const exp = new Date(`${EXPIRY}T23:59:59Z`);
    if (Number.isNaN(exp.getTime()) || Date.now() > +exp) {
      log('fail', { reason: 'expired', ua, ip, token: norm, expiry: EXPIRY });
      return json(res, 400, { error: 'Invalid or expired token.' });
    }
    // allowlist check
    if (!list.includes(norm)) {
      log('fail', { reason: 'not_in_allowlist', ua, ip, token: norm });
      return json(res, 400, { error: 'Invalid or expired token.' });
    }

    // Per-device reuse guard (optional)
    const cookieHeader = req.headers['cookie'] || '';
    const cookies = Object.fromEntries(cookieHeader.split(';').map(s => s.trim().split('=').map(decodeURIComponent)).filter(kv => kv.length===2));
    const existing = SECRET ? cookies[COOKIE_NAME] : null;
    if (SECRET && verifyReceipt(norm, existing, SECRET)) {
      log('fail', { reason: 'already_activated_on_device', ua, ip, token: norm });
      return json(res, 400, { error: 'This token has already been used on this device.' });
    }

    // Success path — set receipt cookie (httpOnly) if SECRET provided
    const payload = { token: norm, at: new Date().toISOString(), ua };
    const headers = {};
    if (SECRET) {
      const signed = signReceipt(payload, SECRET);
      const cookie = `${COOKIE_NAME}=${encodeURIComponent(signed)}; HttpOnly; Path=/; Max-Age=${60*60*24*365}; SameSite=Lax`;
      headers['Set-Cookie'] = cookie;
    }

    log('success', { ua, ip, token: norm, duration_ms: Date.now() - start });
    return json(res, 200, { ok: true, url: SUCCESS_URL }, headers);
  } catch (err) {
    log('error', { reason: 'exception', message: err && err.message, stack: err && err.stack });
    return json(res, 500, { error: 'Something went wrong. Please try again.' });
  }

  function json(res, code, obj, extraHeaders={}){
    res.status(code);
    for (const [k,v] of Object.entries(extraHeaders)) res.setHeader(k, v);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
  }

  function log(status, extra) {
    try { console.log(JSON.stringify({ ts: new Date().toISOString(), status, ...extra })); } catch {}
  }
};
