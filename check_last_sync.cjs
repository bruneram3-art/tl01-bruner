const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tyrxbarucopizpcalooh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnhiYXJ1Y29waXpwY2Fsb29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDQ0OTUsImV4cCI6MjA2NzU4MDQ5NX0.ycJzhslzMyD0DQWWu5hY09SucH94OTwWI60oIqm-EB8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        const { data, error } = await supabase
            .from('pcp_data')
            .select('data_sincronizacao')
            .order('data_sincronizacao', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error:', error);
        } else {
            console.log('Latest Sync:', data.length > 0 ? data[0].data_sincronizacao : 'No data');
            const now = new Date();
            console.log('Current Time:', now.toISOString());
        }
    } catch (err) {
        console.error('Exception:', err);
    }
}

check();
