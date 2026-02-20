const { createClient } = require('@supabase/supabase-js');

// --- Configurações ---
const SUPABASE_URL = 'https://tyrxbarucopizpcalooh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnhiYXJ1Y29waXpwY2Fsb29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDQ0OTUsImV4cCI6MjA2NzU4MDQ5NX0.ycJzhslzMyD0DQWWu5hY09SucH94OTwWI60oIqm-EB8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function addMissingColumns() {
    console.log("🔍 Verificando e adicionando colunas faltantes no Supabase...");

    // Lista de colunas a adicionar
    const columnsToAdd = [
        { name: 'termino', type: 'date' },
        { name: 'pecas', type: 'numeric' },
        { name: 'massa_linear', type: 'numeric' },
        { name: 'produtividade', type: 'numeric' },
        { name: 'iu', type: 'numeric' },
        { name: 'ie', type: 'numeric' },
        { name: 'familia', type: 'text' },
        { name: 'aco', type: 'text' },
        { name: 'codigo_mp', type: 'text' },
        { name: 'descricao_mp', type: 'text' },
        { name: 'origem_tarugos', type: 'text' },
        { name: 'destino', type: 'text' },
        { name: 'produtividade_nominal', type: 'numeric' },
        { name: 'tarugos', type: 'numeric' },
        { name: 'carteira_m1', type: 'numeric' },
        { name: 'carteira_futura', type: 'numeric' },
        { name: 'atrasos_ganhos', type: 'numeric' },
        { name: 'producao_apontada', type: 'numeric' },
        { name: 'dia_semana', type: 'text' },
        { name: '_original_prod', type: 'numeric' },
        { name: '_original_end_date', type: 'date' },
        { name: '_trim_ratio', type: 'numeric' }
    ];

    for (const col of columnsToAdd) {
        console.log(`➡️ Tentando adicionar coluna: ${col.name} (${col.type})...`);

        // O Supabase JS Client não tem comando DDL direto (ALTER TABLE).
        // Precisamos usar SQL via RPC ou uma query direta se tivermos privilégios, 
        // mas como estamos usando a chave ANON/SERVICE de um cliente, o jeito mais seguro
        // é tentar fazer um RPC (se existir) ou instruir o usuário.

        // HACK: Em projetos Supabase, podemos rodar SQL via POSTREST se tivermos uma função para isso,
        // mas aqui vamos usar um truque: tentar fazer um select na coluna. Se der erro, ela não existe.

        const { error } = await supabase.from('pcp_data').select(col.name).limit(1);

        if (error && error.message.includes('dt does not exist')) { // Erro típico de coluna inexistente
            console.log(`   ⚠️ Coluna ${col.name} não existe. Precisaria ser criada.`);
        } else if (error) {
            console.log(`   ❓ Erro ao verificar ${col.name}: ${error.message}`);
        } else {
            console.log(`   ✅ Coluna ${col.name} já existe.`);
        }
    }

    console.log("\n⚠️ IMPORTANTE: O Supabase Client (JS) não permite criar colunas (DDL) diretamente por segurança.");
    console.log("   Vou fornecer o SQL exato para você rodar no Editor SQL do Supabase.");
}

addMissingColumns();

const sqlCommand = `
-- Rode este comando no SQL Editor do Supabase para criar todas as colunas de uma vez:

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

console.log(sqlCommand);
