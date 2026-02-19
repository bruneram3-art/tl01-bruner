const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tyrxbarucopizpcalooh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnhiYXJ1Y29waXpwY2Fsb29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDQ0OTUsImV4cCI6MjA2NzU4MDQ5NX0.ycJzhslzMyD0DQWWu5hY09SucH94OTwWI60oIqm-EB8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
    console.log('Fetching 1 row from pcp_data...');
    const { data, error } = await supabase.from('pcp_data').select('*').limit(1);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('Row found. Keys:', Object.keys(data[0]));
        console.log('Sample Row:', data[0]);
    } else {
        console.log('Table is empty or no access.');
    }
}

checkSchema();
