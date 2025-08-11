// api/register.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
    const { name, email, company, phone } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });
  
    try {
      // v2 CREATE endpoint using your tableId
      const url = 'https://app.nocodb.com/api/v2/tables/mwkq2v9p5kju2py/records';
  
      // Map to your actual NocoDB column names (adjust as needed)
      const payload = {
        fields: {
          Name: name,
          Email: email,
          Company: company || null,
          Phone: phone || null,
        }
      };
  
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xc-token': process.env.NOCODB_API_TOKEN, // keep this in Vercel env
        },
        body: JSON.stringify(payload),
      });
  
      const data = await resp.json();
      if (!resp.ok) {
        return res.status(resp.status).json({ error: data?.msg || 'Failed to create record' });
      }
  
      // v2 returns a record object; return something simple to the client
      return res.status(201).json({ ok: true, id: data?.id || null });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  