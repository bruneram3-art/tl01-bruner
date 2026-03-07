const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tyrxbarucopizpcalooh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnhiYXJ1Y29waXpwY2Fsb29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDQ0OTUsImV4cCI6MjA2NzU4MDQ5NX0.ycJzhslzMyD0DQWWu5hY09SucH94OTwWI60oIqm-EB8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTotal() {
    try {
        const { data, error } = await supabase
            .from('pcp_data')
            .select('producao_planejada');

        if (error) {
            console.error('Erro:', error);
            return;
        }

        const total = data.reduce((sum, r) => sum + (parseFloat(r.producao_planejada) || 0), 0);
        console.log(`Total de registros: ${data.length}`);
        console.log(`Produção Total em pcp_data: ${total.toFixed(2)} t`);
    } catch (e) {
        console.error('Erro fatal:', e.message);
    }
}

checkTotal();
