const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://tyrxbarucopizpcalooh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnhiYXJ1Y29waXpwY2Fsb29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDQ0OTUsImV4cCI6MjA2NzU4MDQ5NX0.ycJzhslzMyD0DQWWu5hY09SucH94OTwWI60oIqm-EB8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const candidateColumns = [
    'sap', 'SAP', 'Código SAP', 'Codigo SAP', 'codigo_sap',
    'bitola', 'Bitolas', 'Bitola', 'bitolas',
    'producao', 'Producao', 'Produção', 'Prod. Acab. (t)', 'qtd_real', 'quantidade',
    'familia', 'Familia', 'família',
    'inicio', 'Inicio', 'Início', 'data_inicio',
    'termino', 'Termino', 'Término', 'data_termino',
    'status', 'Status',
    'descricao', 'Descricao', 'Descrição'
];

async function checkColumns() {
    console.log('--- Verificando existência de colunas na tabela pcp_data ---');

    for (const col of candidateColumns) {
        // Tenta selecionar apenas essa coluna
        const { error } = await supabase.from('pcp_data').select(col).limit(1);

        if (error) {
            // Se der erro de "Could not find column", ela não existe
            // console.log(`❌ ${col}: ${error.message}`);
        } else {
            console.log(`✅ ${col} EXISTE!`);
        }
    }
    console.log('--- Verificação concluída ---');
}

checkColumns();
