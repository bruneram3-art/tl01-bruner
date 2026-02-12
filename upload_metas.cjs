const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase (mesmas do seu projeto)
const SUPABASE_URL = 'https://tyrxbarucopizpcalooh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnhiYXJ1Y29waXpwY2Fsb29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDQ0OTUsImV4cCI6MjA2NzU4MDQ5NX0.ycJzhslzMyD0DQWWu5hY09SucH94OTwWI60oIqm-EB8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FILE_PATH = './meta lcp.xlsx';

async function uploadMetas() {
    console.log(`📂 Lendo arquivo: ${FILE_PATH}`);

    try {
        const workbook = XLSX.readFile(FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`✅ Lidas ${data.length} linhas do Excel.`);

        // Mapeia para o formato do banco
        // Precisa corresponder às colunas do banco metas_producao
        // Assumindo: sap, bitola, gas, energia, rm (rendimento)

        const records = data.map(row => {
            // Tenta identificar colunas de várias formas
            const sap = String(row['Código SAP2'] || row['SAP'] || row['sap'] || '').trim();
            const bitola = String(row['Bitola'] || row['BITOLA'] || '').trim();
            const familia = String(row['Família'] || row['FAMILIA'] || '').trim();

            // Tratamento de números (troca vírgula por ponto)
            const cleanNum = (val) => {
                if (typeof val === 'number') return val;
                if (!val) return 0;
                let s = String(val).replace(',', '.');
                return parseFloat(s) || 0;
            };

            const gas = cleanNum(row['GN'] || row['Meta Gás'] || row['gas']);
            const energia = cleanNum(row['EE'] || row['Meta Energia'] || row['energia']);
            const rm = cleanNum(row['RM'] || row['Rendimento'] || row['rm']);

            // Só adiciona se tiver SAP ou Bitola
            if (!sap && !bitola) return null;


            return {
                sap: sap, // Chave primária provável ou identificador
                bitola: bitola,
                familia: familia, // Include familia
                massa_linear: cleanNum(row['MASSA LINEAR']), // Include massa_linear
                gas: gas,
                energia: energia,
                rm: rm
            };
        }).filter(r => r !== null && r.sap); // Garante que tem SAP

        // Deduplicar por SAP (mantém o primeiro encontrado)
        const uniqueRecords = [];
        const seenSaps = new Set();

        records.forEach(r => {
            if (!seenSaps.has(r.sap)) {
                seenSaps.add(r.sap);
                uniqueRecords.push(r);
            }
        });

        console.log(`🔄 Preparando ${uniqueRecords.length} registros únicos para envio (de ${records.length} originais)...`);

        // Envia em lotes
        const BATCH_SIZE = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
            const batch = uniqueRecords.slice(i, i + BATCH_SIZE);
            console.log(`   Envio lote ${i} a ${i + batch.length}...`);

            const { error } = await supabase
                .from('metas_producao')
                .upsert(batch, { onConflict: 'sap' }); // Assumindo SAP como chave única, ou o banco decide

            if (error) {
                console.error(`❌ Erro no lote ${i}:`, error.message);
                errorCount += batch.length;
            } else {
                successCount += batch.length;
            }
        }

        console.log(`\n🎉 Processo finalizado!`);
        console.log(`✅ Sucesso: ${successCount}`);
        console.log(`❌ Erros: ${errorCount}`);

    } catch (err) {
        console.error('❌ Erro fatal:', err);
    }
}

uploadMetas();
