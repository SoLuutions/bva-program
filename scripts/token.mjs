// scripts/seedTokens.mjs — Seed NocoDB with tokens from .env or inline list
// Usage:
//   node scripts/seedTokens.mjs
// Requires:
//   NOCODB_BASE_URL, NOCODB_API_TOKEN, NOCODB_TABLE_ID
// Reads tokens from:
//   REVIEWER_TOKENS env (comma-separated) OR inline `TOKENS` array below.

import 'dotenv/config';

const BASE = process.env.NOCODB_BASE_URL;
const API_TOKEN = process.env.NOCODB_API_TOKEN;
const TABLE_ID = process.env.NOCODB_TABLE_ID;

if (!BASE || !API_TOKEN || !TABLE_ID) {
  console.error('Missing NOCODB_BASE_URL / NOCODB_API_TOKEN / NOCODB_TABLE_ID');
  process.exit(1);
}

const TOKENS = (process.env.REVIEWER_TOKENS || 'RVW-2025-001,RVW-2025-002').split(',')
  .map(s => s.trim().toUpperCase())
  .filter(Boolean);

async function nc(path, init = {}) {
  const url = BASE.replace(/\/$/, '') + path;
  const headers = { ...(init.headers || {}), 'xc-token': API_TOKEN, 'Content-Type': 'application/json' };
  const resp = await fetch(url, { ...init, headers });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`NocoDB error ${resp.status}: ${t}`);
  }
  return resp.json();
}

// Create missing tokens; ignore those that already exist.
for (const token of TOKENS) {
  try {
    // Look up
    const where = `(token,eq,${encodeURIComponent(token)})`;
    const list = await nc(`/api/v2/tables/${encodeURIComponent(TABLE_ID)}/records?where=${where}`, { method: 'GET' });
    if (Array.isArray(list.list) && list.list.length) {
      console.log(`Exists: ${token}`);
      continue;
    }
    // Create
    await nc(`/api/v2/tables/${encodeURIComponent(TABLE_ID)}/records`, {
      method: 'POST',
      body: JSON.stringify({ token, used: false })
    });
    console.log(`Created: ${token}`);
  } catch (e) {
    console.error(`Failed: ${token} —`, e.message);
  }
}

console.log('Done.');
