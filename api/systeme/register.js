// /api/systeme/register (Node/Next.js style handler)

const API_BASE = (process.env.SYSTEME_API_BASE || 'https://api.systeme.io').replace(/\/$/, '');
const API_KEY  = process.env.SYSTEME_API_KEY;           // ← REQUIRED (header: X-API-Key)
const COURSE_ID = process.env.SYSTEME_COURSE_ID;        // ← REQUIRED (the School course ID to enroll into)
const TAG_ID = process.env.SYSTEME_TAG_ID || '';        // ← OPTIONAL (a tag to assign)

async function sio(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, statusText: res.statusText, data };
}

export default async function handler(req, res) {
  // CORS (keep your permissive defaults)
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  if (!API_KEY)   return res.status(500).json({ error: 'SYSTEME_API_KEY missing' });
  if (!COURSE_ID) return res.status(500).json({ error: 'SYSTEME_COURSE_ID missing' });

  const { name, email, company, phone, password } = req.body || {};
  if (!name || !email || !company || !phone) {
    return res.status(400).json({ error: 'Missing required fields: name, email, company, phone' });
  }

  try {
    // 1) Create contact (or find if it exists)
    let create = await sio('/api/contacts', {
      method: 'POST',
      body: {
        name,
        email,
        // Systeme allows extra info via "fields" or "metadata".
        // If you’ve created custom fields, match their slugs here.
        fields: [
          { slug: 'company',      value: company },
          { slug: 'phone_number', value: phone },
        ],
        // Password is NOT standard for contacts; keep but harmless if ignored
        password: password || undefined,
      },
    });

    // If contact already exists (e.g., 409), look it up by email
    let contact;
    if (create.ok) {
      contact = create.data;
    } else if (create.status === 409 || create.status === 400) {
      const lookup = await sio(`/api/contacts?email=${encodeURIComponent(email)}`);
      if (!lookup.ok || !lookup.data?.items?.length) {
        return res.status(502).json({
          error: 'Systeme.io upstream error (lookup)',
          status: lookup.status, statusText: lookup.statusText, details: lookup.data
        });
      }
      contact = lookup.data.items[0];
    } else {
      return res.status(502).json({
        error: 'Systeme.io upstream error (create contact)',
        status: create.status, statusText: create.statusText, details: create.data
      });
    }

    const contactId = contact?.id || contact?.data?.id || contact?.contact?.id;
    if (!contactId) {
      return res.status(502).json({ error: 'Could not resolve contact ID', details: contact });
    }

    // 2) (Optional) tag the contact
    if (TAG_ID) {
      await sio(`/api/contacts/${contactId}/tags`, {
        method: 'POST',
        body: { tagId: TAG_ID }
      });
      // Don’t fail the whole flow if tag fails; it’s non-blocking
    }

    // 3) Enroll in School course
    const enroll = await sio(`/api/school/courses/${COURSE_ID}/enrollments`, {
      method: 'POST',
      body: { contactId } // Some tenants accept { email }, but contactId is the safest
    });
    if (!enroll.ok) {
      return res.status(502).json({
        error: 'Systeme.io upstream error (enroll)',
        status: enroll.status, statusText: enroll.statusText, details: enroll.data
      });
    }

    return res.status(200).json({
      ok: true,
      contactId,
      enrolled: true,
      courseId: COURSE_ID
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
}
