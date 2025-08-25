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
