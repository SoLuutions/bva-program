// api/subscribe.js (Vercel) — Upsert subscriber to Mailchimp with double opt-in.
// Env required: MAILCHIMP_API_KEY (e.g., xxxxx-us21), MAILCHIMP_AUDIENCE_ID

import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { email, fname, company, phone, tags = [], consent, source } = req.body || {};
    if (!email || !consent) {
      return res.status(400).json({ message: 'Email and consent are required.' });
    }

    const API_KEY = process.env.MAILCHIMP_API_KEY;
    const LIST_ID = process.env.MAILCHIMP_AUDIENCE_ID;
    if (!API_KEY || !LIST_ID) {
      return res.status(500).json({ message: 'Server not configured (missing Mailchimp env vars).' });
    }

    const parts = API_KEY.split('-');
    const dc = parts[1]; // e.g., "us21"
    if (!dc) {
      return res.status(500).json({ message: 'Invalid Mailchimp API key (missing data center suffix).' });
    }

    const emailLower = String(email).toLowerCase();
    const subscriberHash = crypto.createHash('md5').update(emailLower).digest('hex');

    const body = {
      email_address: emailLower,
      status_if_new: 'pending', // double opt-in
      status: 'pending',
      merge_fields: {
        FNAME: fname || '',
        COMPANY: company || '',
        PHONE: phone || '',
      },
      tags,
    };

    // Idempotent upsert
    const resp = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${LIST_ID}/members/${subscriberHash}`, {
      method: 'PUT',
      headers: {
        'Authorization': `apikey ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await resp.json();
    if (!resp.ok) {
      return res.status(resp.status).json({ message: result.detail || 'Mailchimp error', mc: result });
    }

    // Optional: annotate source
    if (source) {
      try {
        await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${LIST_ID}/members/${subscriberHash}/notes`, {
          method: 'POST',
          headers: {
            'Authorization': `apikey ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note: `Source: ${source}` }),
        });
      } catch (e) {}
    }

    // Ensure tags active even for existing members
    if (tags.length) {
      try {
        await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${LIST_ID}/members/${subscriberHash}/tags`, {
          method: 'POST',
          headers: {
            'Authorization': `apikey ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tags: tags.map(t => ({ name: t, status: 'active' })) }),
        });
      } catch (e) {}
    }

    return res.status(200).json({ message: 'Success. Please confirm via email.' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}
