// api/subscribe.js (CommonJS) — Mailchimp upsert with required fields
// ENV required in Vercel → Project Settings → Environment Variables:
//   MAILCHIMP_API_KEY   (looks like xxxxx-us21; the part after '-' is your server prefix)
//   MAILCHIMP_AUDIENCE_ID  (a.k.a. List ID)

const crypto = require('node:crypto');

async function mcFetch(dc, path, options = {}) {
  const API_KEY = process.env.MAILCHIMP_API_KEY;
  const url = `https://${dc}.api.mailchimp.com/3.0${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `apikey ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }
  });
  let json = {};
  try { json = await resp.json(); } catch (e) { }
  return { resp, json };
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
    const {
      email, fname, lname, jobtitle, company, phone,
      consent, tags = [], source
    } = req.body || {};

    // Basic validation
    if (!email || !consent) {
      return res.status(400).json({ message: 'Email and consent are required.' });
    }
    // Your Mailchimp audience requires these two:
    if (!lname || !jobtitle) {
      return res.status(400).json({ message: 'Last name (lname) and job title (jobtitle) are required.' });
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

    // ⚠️ If your MC merge tag codes differ, change LNAME / JOBTITLE to the exact codes in your Audience.
    const merge_fields = {
      FNAME: fname || '',
      LNAME: lname,
      JOBTITLE: jobtitle,
      COMPANY: company || '',
      PHONE: phone || '',
    };

    const body = {
      email_address: emailLower,
      status_if_new: 'pending', // double opt-in (change to "subscribed" only if compliant for you)
      status: 'pending',
      merge_fields,
      tags,
    };

    // Idempotent upsert
    const put = await mcFetch(dc, `/lists/${LIST_ID}/members/${subscriberHash}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    if (!put.resp.ok) {
      return res.status(put.resp.status).json({
        message: put.json.detail || 'Mailchimp error',
        mc: put.json,
        sent: body
      });
    }

    // Optional: note the source
    if (source) {
      await mcFetch(dc, `/lists/${LIST_ID}/members/${subscriberHash}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: `Source: ${source}` }),
      }).catch(() => { });
    }

    // Optional: ensure tags active even if member pre-existed
    if (tags.length) {
      await mcFetch(dc, `/lists/${LIST_ID}/members/${subscriberHash}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tags: tags.map(t => ({ name: t, status: 'active' })) }),
      }).catch(() => { });
    }

    return res.status(200).json({ message: 'Success. Please confirm via email.' });
  } catch (err) {
    console.error('subscribe error', err);
    return res.status(500).json({ message: 'Runtime error', error: String((err && err.message) || err) });
  }
};
