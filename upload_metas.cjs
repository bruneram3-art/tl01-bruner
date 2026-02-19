const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações do Supabase
const SUPABASE_URL = 'https://tyrxbarucopizpcalooh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnhiYXJ1Y29waXpwY2Fsb29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDQ0OTUsImV4cCI6MjA2NzU4MDQ5NX0.ycJzhslzMyD0DQWWu5hY09SucH94OTwWI60oIqm-EB8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuração do Caminho de Rede
const BASE_NETWORK_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli';

function getMonthName(monthIndex) {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIndex];
}

function findLatestFile() {
    console.log('--- Iniciando busca dinâmica de arquivo ---');
    try {
        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = now.getMonth(); // 0-11
        const monthNum = String(monthIndex + 1).padStart(2, '0');
        const monthName = getMonthName(monthIndex);

        // 1. Build Year Path
        const yearPath = path.join(BASE_NETWORK_PATH, String(year));

        if (!fs.existsSync(yearPath)) {
            console.error(`❌ Pasta do ano não encontrada: ${yearPath}`);
            return null;
        }

        // 2. Find Month Folder (looks for "02_*")
        const yearDirs = fs.readdirSync(yearPath);
        const monthFolder = yearDirs.find(dir => dir.startsWith(`${monthNum}_`));

        if (!monthFolder) {
            console.error(`❌ Pasta do mês (iniciando com ${monthNum}_) não encontrada em ${yearPath}`);
            return null;
        }

        const fullMonthPath = path.join(yearPath, monthFolder);

        // 3. Find Latest Revision File ("Revisão_XX")
        const files = fs.readdirSync(fullMonthPath);
        const revRegex = /Revisão_(\d+)/i;

        let latestFile = null;
        let maxRev = -1;

        files.forEach(file => {
            if (!file.endsWith('.xlsx') || file.includes('~$')) return;

            const match = file.match(revRegex);
            if (match) {
                const rev = parseInt(match[1], 10);
                if (rev > maxRev) {
                    maxRev = rev;
                    latestFile = file;
                }
            }
        });

        if (!latestFile) {
            console.error('❌ Nenhum arquivo com "Revisão_XX" encontrado.');
            return null;
        }

        const fullFilePath = path.join(fullMonthPath, latestFile);

        return {
            path: fullFilePath,
            metadata: {
                year,
                month: monthName,
                revision: maxRev,
                source: fullFilePath
            }
        };

    } catch (error) {
        console.error('Erro na resolução do caminho:', error.message);
        return null;
    }
}

async function uploadMetas() {
    const fileInfo = findLatestFile();

    if (!fileInfo) {
        console.error('❌ Abortando: Arquivo não encontrado.');
        return;
    }

    const { path: FILE_PATH, metadata } = fileInfo;

    console.log(`📂 Arquivo Selecionado: ${FILE_PATH}`);
    console.log(`ℹ️  Metadados: Ano=${metadata.year}, Mês=${metadata.month}, Rev=${metadata.revision}`);

    try {
        const workbook = XLSX.readFile(FILE_PATH);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`✅ Lidas ${data.length} linhas do Excel.`);

        const records = data.map(row => {
            const sap = String(row['Código SAP2'] || row['SAP'] || row['sap'] || '').trim();
            const bitola = String(row['Bitola'] || row['BITOLA'] || '').trim();
            const familia = String(row['Família'] || row['FAMILIA'] || '').trim();

            const cleanNum = (val) => {
                if (typeof val === 'number') return val;
                if (!val) return 0;
                let s = String(val).replace(',', '.');
                return parseFloat(s) || 0;
            };

            const gas = cleanNum(row['GN'] || row['Meta Gás'] || row['gas']);
            const energia = cleanNum(row['EE'] || row['Meta Energia'] || row['energia']);
            const rm = cleanNum(row['RM'] || row['Rendimento'] || row['rm']);

            if (!sap && !bitola) return null;

            return {
                sap: sap,
                bitola: bitola,
                familia: familia,
                massa_linear: cleanNum(row['MASSA LINEAR']),
                gas: gas,
                energia: energia,
                rm: rm,
                // Novos campos de metadados
                mes_referencia: metadata.month,
                ano_referencia: metadata.year,
                revisao: metadata.revision,
                origem_arquivo: metadata.source
            };
        }).filter(r => r !== null && r.sap);

        // Deduplicar por SAP
        const uniqueRecords = [];
        const seenSaps = new Set();
        records.forEach(r => {
            if (!seenSaps.has(r.sap)) {
                seenSaps.add(r.sap);
                uniqueRecords.push(r);
            }
        });

        console.log(`🔄 Preparando ${uniqueRecords.length} registros únicos...`);

        // Envia em lotes
        const BATCH_SIZE = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
            const batch = uniqueRecords.slice(i, i + BATCH_SIZE);
            console.log(`   Envio lote ${i} a ${i + batch.length}...`);

            const { error } = await supabase
                .from('metas_producao')
                .upsert(batch, { onConflict: 'sap' });

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
