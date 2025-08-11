// api/find-tables.js
export default async function handler(req, res) {
    console.log('🔍 Finding all tables and projects');
    
    const token = process.env.NOCODB_API_TOKEN;
    
    if (!token) {
        return res.status(500).json({ error: 'No NOCODB_API_TOKEN found' });
    }
    
    try {
        // First, get all projects
        console.log('📋 Getting projects...');
        const projectsResp = await fetch('https://app.nocodb.com/api/v2/meta/projects', {
            headers: { 'xc-token': token }
        });
        
        if (!projectsResp.ok) {
            const errorText = await projectsResp.text();
            return res.status(projectsResp.status).json({
                error: 'Failed to get projects',
                details: errorText
            });
        }
        
        const projects = await projectsResp.json();
        console.log('📋 Projects found:', projects);
        
        // Get tables for each project
        const allTables = [];
        
        for (const project of projects.list || []) {
            console.log(`📊 Getting tables for project: ${project.title} (${project.id})`);
            
            try {
                const tablesResp = await fetch(`https://app.nocodb.com/api/v2/meta/projects/${project.id}/tables`, {
                    headers: { 'xc-token': token }
                });
                
                if (tablesResp.ok) {
                    const tables = await tablesResp.json();
                    console.log(`📊 Tables in ${project.title}:`, tables);
                    
                    for (const table of tables.list || []) {
                        allTables.push({
                            projectId: project.id,
                            projectTitle: project.title,
                            tableId: table.id,
                            tableName: table.title,
                            tableTitle: table.table_name
                        });
                    }
                }
            } catch (tableError) {
                console.error(`❌ Error getting tables for project ${project.id}:`, tableError);
            }
        }
        
        return res.status(200).json({
            success: true,
            projects: projects.list || [],
            allTables: allTables,
            message: 'Look for your registration table in the allTables array'
        });
        
    } catch (error) {
        console.error('💥 Error finding tables:', error);
        return res.status(500).json({
            error: 'Failed to find tables',
            details: error.message
        });
    }
}