// /api/systeme/register
// Creates/updates a contact, tags it, and enrolls it into a course using Systeme.io Public API.

const API_BASE = (process.env.SYSTEME_API_BASE || 'https://api.systeme.io').replace(/\/$/, '');
const API_KEY  = process.env.SYSTEME_API_KEY;
const COURSE_ID = process.env.SYSTEME_COURSE_ID;
const TAG_ID = process.env.SYSTEME_TAG_ID;             // required in your env per your note
const TAG_NAME = process.env.SYSTEME_TAG_NAME || '';   // optional fallback (will create/find by name)

// ----- tiny fetch helper
async function sio(path, { method='GET', body, contentType='application/json' } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'X-API-Key': API_KEY,
      ...(contentType ? { 'Content-Type': contentType } : {})
    },
    body: body ? (contentType?.includes('json') ? JSON.stringify(body) : body) : undefined,
  });
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch { data = raw; }
  return { ok: res.ok, status: res.status, statusText: res.statusText, data };
}

// ----- pull contact field slugs once so we only send fields you actually have
async function getFieldSlugs() {
  const out = new Set();
  const r = await sio('/api/contact_fields');
  if (r.ok && Array.isArray(r.data?.items)) {
    r.data.items.forEach(f => { if (f?.slug) out.add(f.slug); });
  }
  return out;
}

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  if (!API_KEY)   return res.status(500).json({ error: 'SYSTEME_API_KEY missing' });
  if (!COURSE_ID) return res.status(500).json({ error: 'SYSTEME_COURSE_ID missing' });
  if (!TAG_ID && !TAG_NAME) return res.status(500).json({ error: 'Need SYSTEME_TAG_ID or SYSTEME_TAG_NAME' });

  const { name='', email='', company='', phone='' } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing required field: email' });

  // split name to first/last
  const [firstName, ...rest] = (name || '').trim().split(/\s+/);
  const lastName = rest.join(' ');

  try {
    // 1) Discover field slugs present in your account
    const slugs = await getFieldSlugs();

    // 2) Create contact (minimal)
    let create = await sio('/api/contacts', {
      method: 'POST',
      body: {
        email,
        name: name || undefined,
        // send only fields you actually have
        ...(slugs.size ? {
          fields: [
            ...(slugs.has('first_name') && firstName ? [{ slug: 'first_name', value: firstName }] : []),
            ...(slugs.has('last_name')  && lastName  ? [{ slug: 'last_name',  value: lastName  }] : []),
            ...(slugs.has('company')    && company   ? [{ slug: 'company',    value: company   }] : []),
            ...(slugs.has('phone_number') && phone   ? [{ slug: 'phone_number', value: phone   }] : []),
          ]
        } : {})
      }
    });

    // If exists/invalid, try lookup by email
    let contact;
    if (create.ok) {
      contact = create.data;
    } else {
      // If creation failed because it exists or other validation, try lookup
      const lookup = await sio(`/api/contacts?email=${encodeURIComponent(email)}`);
      if (!lookup.ok || !lookup.data?.items?.length) {
        return res.status(502).json({
          error: 'Systeme.io upstream error (create/lookup)',
          status: create.status, statusText: create.statusText, details: create.data
        });
      }
      contact = lookup.data.items[0];

      // Ensure fields are patched for existing contacts (merge-patch)
      const fieldsPayload = [];
      if (slugs.has('first_name') && firstName) fieldsPayload.push({ slug: 'first_name', value: firstName });
      if (slugs.has('last_name')  && lastName)  fieldsPayload.push({ slug: 'last_name',  value: lastName  });
      if (slugs.has('company')    && company)   fieldsPayload.push({ slug: 'company',    value: company   });
      if (slugs.has('phone_number') && phone)   fieldsPayload.push({ slug: 'phone_number', value: phone   });
      if (fieldsPayload.length) {
        await sio(`/api/contacts/${contact.id}`, {
          method: 'PATCH',
          contentType: 'application/merge-patch+json',
          body: { fields: fieldsPayload }
        });
      }
    }

    const contactId = contact?.id;
    if (!contactId) {
      return res.status(502).json({ error: 'Could not resolve contact ID', details: contact });
    }

    // 3) Tag the contact
    let tagId = TAG_ID;
    if (!tagId && TAG_NAME) {
      // find or create by name (one-time)
      const list = await sio(`/api/tags?limit=100&order=asc`);
      const found = (list.ok && Array.isArray(list.data?.items))
        ? list.data.items.find(t => String(t.name).toLowerCase() === TAG_NAME.toLowerCase())
        : null;
      if (found) tagId = found.id;
      else {
        const created = await sio('/api/tags', { method: 'POST', body: { name: TAG_NAME } });
        if (created.ok) tagId = created.data?.id;
      }
    }
    if (tagId) {
      await sio(`/api/contacts/${contactId}/tags`, { method: 'POST', body: { tagId } });
    }

    // 4) Enroll in course
    const enroll = await sio(`/api/school/courses/${COURSE_ID}/enrollments`, {
      method: 'POST',
      body: { contactId }
    });
    if (!enroll.ok) {
      return res.status(502).json({
        error: 'Systeme.io upstream error (enroll)',
        status: enroll.status, statusText: enroll.statusText, details: enroll.data
      });
    }

    return res.status(200).json({ ok: true, contactId, enrolled: true, courseId: COURSE_ID, tagged: !!tagId });
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
}
