// api/test-connection.js
export default async function handler(req, res) {
    console.log('🧪 Testing NocoDB connection');
    
    const token = process.env.NOCODB_API_TOKEN;
    console.log('🔑 Token exists:', !!token);
    console.log('🔑 Token length:', token ? token.length : 0);
    
    if (!token) {
        return res.status(500).json({ 
            error: 'No NOCODB_API_TOKEN found',
            env: Object.keys(process.env).filter(key => key.includes('NOCODB'))
        });
    }
    
    try {
        // Test: Get records (this is what actually works based on your curl)
        const tableUrl = 'https://app.nocodb.com/api/v2/tables/mwkq2v9p5kju2py/records?offset=0&limit=1&viewId=vw3go5awrqlpeevz';
        console.log('🎯 Testing table URL:', tableUrl);
        
        const resp = await fetch(tableUrl, {
            method: 'GET',
            headers: {
                'xc-token': token,
            },
        });
        
        console.log('📥 Response status:', resp.status);
        
        const data = await resp.text();
        console.log('📥 Raw response:', data.substring(0, 500) + '...');
        
        let parsedData = {};
        try {
            parsedData = JSON.parse(data);
        } catch (e) {
            console.error('❌ Parse error:', e);
        }
        
        if (resp.ok) {
            return res.status(200).json({
                success: true,
                message: 'NocoDB connection successful',
                tableInfo: parsedData,
                tokenLength: token.length
            });
        } else {
            return res.status(resp.status).json({
                error: 'NocoDB connection failed',
                status: resp.status,
                response: parsedData || data,
                tokenLength: token.length
            });
        }
    } catch (error) {
        console.error('💥 Connection test error:', error);
        return res.status(500).json({
            error: 'Connection test failed',
            details: error.message,
            tokenExists: !!token
        });
    }
}