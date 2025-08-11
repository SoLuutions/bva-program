export default async function handler(req, res) {
    console.log('🚀 API handler called');
    console.log('📋 Request method:', req.method);
    console.log('📋 Request headers:', req.headers);
    console.log('📋 Request body:', req.body);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        console.log('✅ Handling OPTIONS preflight request');
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        console.log('❌ Invalid method:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { name, email, company, phone } = req.body || {};
    console.log('📝 Extracted data:', { name, email, company, phone });
    
    if (!name || !email) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ error: 'Name and email are required.' });
    }

    const token = process.env.NOCODB_API_TOKEN;
    console.log('🔑 API Token exists:', !!token);
    console.log('🔑 API Token length:', token ? token.length : 0);
    
    if (!token) {
        console.error('❌ No NOCODB_API_TOKEN found in environment');
        return res.status(500).json({ error: 'Server configuration error - missing API token' });
    }
  
    try {
        const url = 'https://app.nocodb.com/api/v2/tables/mwkq2v9p5kju2py/records';
        console.log('🎯 NocoDB URL:', url);
        
        const payload = {
            Name: name,
            Email: email,
            Company: company || null,
            Phone: phone || null,
        };
        console.log('📦 NocoDB payload:', payload);
        
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xc-token': token,
            },
            body: JSON.stringify(payload),
        };
        console.log('⚙️ Request options (token hidden):', {
            ...requestOptions,
            headers: { ...requestOptions.headers, 'xc-token': '[HIDDEN]' }
        });
  
        console.log('📡 Sending request to NocoDB...');
        const resp = await fetch(url, requestOptions);
        
        console.log('📥 NocoDB response status:', resp.status);
        console.log('📥 NocoDB response ok:', resp.ok);
        console.log('📥 NocoDB response headers:', [...resp.headers.entries()]);
        
        const responseText = await resp.text();
        console.log('📥 NocoDB raw response:', responseText);
        
        let data = {};
        try {
            data = JSON.parse(responseText);
            console.log('📥 NocoDB parsed response:', data);
        } catch (parseError) {
            console.error('❌ Failed to parse NocoDB response:', parseError);
            return res.status(500).json({ error: 'Invalid response from database' });
        }
        
        if (!resp.ok) {
            console.error('❌ NocoDB error response:', data);
            return res.status(resp.status).json({ 
                error: data?.message || data?.msg || data?.error || 'Failed to create record',
                details: data 
            });
        }
        
        console.log('✅ Record created successfully:', data);
        return res.status(201).json({ 
            ok: true, 
            id: data?.Id || data?.id || null,
            record: data 
        });
    } catch (e) {
        console.error('💥 API Error:', e);
        console.error('💥 Error stack:', e.stack);
        return res.status(500).json({ 
            error: 'Server error',
            details: e.message 
        });
    }
}