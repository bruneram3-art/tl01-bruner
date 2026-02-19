const { createClient } = require('@supabase/supabase-js');

// --- Configurações ---
const SUPABASE_URL = 'https://tyrxbarucopizpcalooh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnhiYXJ1Y29waXpwY2Fsb29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDQ0OTUsImV4cCI6MjA2NzU4MDQ5NX0.ycJzhslzMyD0DQWWu5hY09SucH94OTwWI60oIqm-EB8'; // Usando a chave que tenho acesso (ANON)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function tryDirectSqlExecution() {
    const sql = `
        ALTER TABLE pcp_data 
        ADD COLUMN IF NOT EXISTS termino DATE,
        ADD COLUMN IF NOT EXISTS pecas NUMERIC,
        ADD COLUMN IF NOT EXISTS massa_linear NUMERIC,
        ADD COLUMN IF NOT EXISTS produtividade NUMERIC,
        ADD COLUMN IF NOT EXISTS iu NUMERIC,
        ADD COLUMN IF NOT EXISTS ie NUMERIC,
        ADD COLUMN IF NOT EXISTS familia TEXT,
        ADD COLUMN IF NOT EXISTS aco TEXT,
        ADD COLUMN IF NOT EXISTS codigo_mp TEXT,
        ADD COLUMN IF NOT EXISTS descricao_mp TEXT,
        ADD COLUMN IF NOT EXISTS origem_tarugos TEXT,
        ADD COLUMN IF NOT EXISTS destino TEXT,
        ADD COLUMN IF NOT EXISTS produtividade_nominal NUMERIC,
        ADD COLUMN IF NOT EXISTS tarugos NUMERIC,
        ADD COLUMN IF NOT EXISTS carteira_m1 NUMERIC,
        ADD COLUMN IF NOT EXISTS carteira_futura NUMERIC,
        ADD COLUMN IF NOT EXISTS atrasos_ganhos NUMERIC,
        ADD COLUMN IF NOT EXISTS producao_apontada NUMERIC,
        ADD COLUMN IF NOT EXISTS dia_semana TEXT;
    `;

    console.log("🚀 Tentando executar SQL via RPC 'exec_sql'...");

    // Tenta RPC comum 'exec_sql'
    let { data, error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
        console.log(`❌ RPC 'exec_sql' falhou: ${error.message}`);
        console.log("   --> Tentando RPC 'run_sql'...");
        // Tenta fallback 'run_sql'
        let { data: d2, error: e2 } = await supabase.rpc('run_sql', { sql: sql });

        if (e2) {
            console.log(`❌ RPC 'run_sql' também falhou: ${e2.message}`);
            console.log("\n⚠️ CONCLUSÃO: Não consigo alterar a estrutura do banco com a chave ANON/PUBLIC atual.");
            console.log("   Você PRECISA rodar o SQL manualmente no painel do Supabase.");
        } else {
            console.log("✅ Sucesso via 'run_sql'!");
        }
    } else {
        console.log("✅ Sucesso via 'exec_sql'!");
    }
}

tryDirectSqlExecution();
