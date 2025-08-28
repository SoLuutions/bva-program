// api/subscribe.js — robust merge-field handling for Mailchimp (Vercel / Node 18+)
import crypto from 'node:crypto';

const MC_REQUIRED_PLACEHOLDERS = {
  text: 'N/A',
  number: 0,
  phone: '000',
  date: '1970-01-01',
  birthday: '01/01',
  zip: '00000',
  website: 'https://example.com'
};

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
  const json = await resp.json().catch(() => ({}));
  return { resp, json };
}

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { FNAME: '', LNAME: '' };
  if (parts.length === 1) return { FNAME: parts[0], LNAME: '' };
  return { FNAME: parts.slice(0, -1).join(' '), LNAME: parts.slice(-1)[0] };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const {
      email, lname, jobtitle, consent
    } = req.body || {};

    if (!email || !consent) {
      return res.status(400).json({ message: 'Email and consent are required.' });
    }
    if (!lname || !jobtitle) {
      return res.status(400).json({ message: 'Last name (lname) and job title (jobtitle) are required.' });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }

  const API_KEY = process.env.MAILCHIMP_API_KEY;
  const LIST_ID = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!API_KEY || !LIST_ID) {
    return res.status(500).json({ message: 'Server not configured (missing Mailchimp env vars).' });
  }
  const parts = API_KEY.split('-');
  const dc = parts[1];
  if (!dc) {
    return res.status(500).json({ message: 'Invalid Mailchimp API key (missing data center suffix).' });
  }

  // 1) Fetch merge field schema to know what's required and their tags/types
  const { resp: mfResp, json: mfJson } = await mcFetch(dc, `/lists/${LIST_ID}/merge-fields?count=100`);
  if (!mfResp.ok) {
    return res.status(502).json({ message: 'Failed to read merge fields from Mailchimp.', mc: mfJson });
  }

  // Build merge_fields using known aliases + schema
  let merge_fields = {};

  // Common aliases
  const alias = {
    FNAME: fname,
    LNAME: lname,
    JOBTITLE: jobtitle,
    COMPANY: company,
    PHONE: phone
  };
  if (!alias.FNAME && !alias.LNAME && req.body?.name) {
    const split = splitName(req.body.name);
    alias.FNAME = split.FNAME;
    alias.LNAME = split.LNAME;
  }

  // Map alias into existing tags
  if (Array.isArray(mfJson.merge_fields)) {
    for (const f of mfJson.merge_fields) {
      const tag = String(f.tag || '').toUpperCase();
      if (!tag) continue;
      let val = undefined;

      // Try exact alias by tag
      if (alias.hasOwnProperty(tag)) {
        val = alias[tag];
      } else {
        // Try label-based loose mapping (e.g., "Job Title" -> JOBTITLE)
        const label = String(f.name || '').toLowerCase();
        if (/job.?title/.test(label)) val = jobtitle;
        else if (/company|organization/.test(label)) val = company;
        else if (/phone|mobile|tel/.test(label)) val = phone;
        else if (/first.?name/.test(label)) val = alias.FNAME;
        else if (/last.?name/.test(label)) val = alias.LNAME;
      }

      // If required and still empty, set placeholder based on field type
      if ((f.required === true || f.required === 'true') && (val === undefined || val === null || String(val).trim() === '')) {
        const type = String(f.type || 'text').toLowerCase();
        val = MC_REQUIRED_PLACEHOLDERS[type] ?? 'N/A';
      }

      // If we have any value, set it
      if (val !== undefined && val !== null && String(val).length > 0) {
        merge_fields[tag] = val;
      }
    }
  }

  // Ensure we at least send common fields if present
  if (alias.FNAME && !merge_fields.FNAME) merge_fields.FNAME = alias.FNAME;
  if (alias.LNAME && !merge_fields.LNAME) merge_fields.LNAME = alias.LNAME;
  if (jobtitle && !merge_fields.JOBTITLE) merge_fields.JOBTITLE = jobtitle;
  if (company && !merge_fields.COMPANY) merge_fields.COMPANY = company;
  if (phone && !merge_fields.PHONE) merge_fields.PHONE = phone;

  merge_fields.LNAME = lname;
  merge_fields.JOBTITLE = jobtitle;

  const emailLower = String(email).toLowerCase();
  const subscriberHash = crypto.createHash('md5').update(emailLower).digest('hex');

  // 2) Upsert
  const body = {
    email_address: emailLower,
    status_if_new: 'pending', // double opt-in
    status: 'pending',
    merge_fields,
    tags
  };

  const { resp: putResp, json: putJson } = await mcFetch(dc, `/lists/${LIST_ID}/members/${subscriberHash}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });

  if (!putResp.ok) {
    return res.status(putResp.status).json({ message: putJson.detail || 'Mailchimp error', mc: putJson, sent: body });
  }

  // 3) Optional note
  if (source) {
    await mcFetch(dc, `/lists/${LIST_ID}/members/${subscriberHash}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note: `Source: ${source}` })
    }).catch(() => { });
  }

  // 4) Ensure tags active even for existing members
  if (tags.length) {
    await mcFetch(dc, `/lists/${LIST_ID}/members/${subscriberHash}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags: tags.map(t => ({ name: t, status: 'active' })) })
    }).catch(() => { });
  }

  return res.status(200).json({ message: 'Success. Please confirm via email.' });
} catch (err) {
  return res.status(500).json({ message: err.message || 'Server error' });
}