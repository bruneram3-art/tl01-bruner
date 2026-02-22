const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Configurações do Supabase
const SUPABASE_URL = 'https://tyrxbarucopizpcalooh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnhiYXJ1Y29waXpwY2Fsb29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDQ0OTUsImV4cCI6MjA2NzU4MDQ5NX0.ycJzhslzMyD0DQWWu5hY09SucH94OTwWI60oIqm-EB8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EXCEL_PATH = "\\\\brqbnwvfs02vs\\Departamentos\\GEM\\Utilidades\\2026\\03- CONTROLE DE ENERGÉTICOS\\NOVO DIARIO DE BORDO 2026 REV 01.xlsx";

// Função para converter data do Excel (serial) para YYYY-MM-DD
function excelDateToISO(serial) {
    if (!serial || isNaN(serial)) return null;
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
}

async function runSync() {
    try {
        console.log('📖 Lendo Diário de Bordo:', EXCEL_PATH);
        const wb = XLSX.readFile(EXCEL_PATH);

        const dataMap = new Map();

        // 1. Processar Produção
        const sheetProd = wb.Sheets['Produção'];
        if (sheetProd) {
            const rows = XLSX.utils.sheet_to_json(sheetProd, { header: 1 });
            let headerIdx = rows.findIndex(r => r.includes('Data'));
            if (headerIdx !== -1) {
                const headers = rows[headerIdx];
                const colProd = headers.indexOf('Laminação (t)');
                const colTL02 = headers.indexOf('TL02 (t)');

                rows.slice(headerIdx + 1).forEach(row => {
                    const dt = excelDateToISO(row[0]);
                    if (dt) {
                        dataMap.set(dt, {
                            data: dt,
                            producao_laminacao: parseFloat(row[colProd]) || 0,
                            producao_tl02: parseFloat(row[colTL02]) || 0,
                            consumo_gas_tl01: 0,
                            consumo_gas_tl02: 0,
                            consumo_energia_total: 0
                        });
                    }
                });
            }
        }

        // 2. Processar Gás Natural
        const sheetGas = wb.Sheets['Gás Natural'];
        if (sheetGas) {
            const rows = XLSX.utils.sheet_to_json(sheetGas, { header: 1 });
            let headerIdx = rows.findIndex(r => r.includes('Data'));
            if (headerIdx !== -1) {
                const headers = rows[headerIdx];
                const colGasTL01 = headers.indexOf('Laminação TL01 (m³)');
                const colGasTL02 = headers.indexOf('Laminação TL02 (Calculado) (m³)');
                const colPCS = headers.indexOf('PCS(kcal/m³)');

                rows.slice(headerIdx + 1).forEach(row => {
                    const dt = excelDateToISO(row[0]);
                    if (dt && dataMap.has(dt)) {
                        const entry = dataMap.get(dt);
                        entry.consumo_gas_tl01 = parseFloat(row[colGasTL01]) || 0;
                        entry.consumo_gas_tl02 = parseFloat(row[colGasTL02]) || 0;
                        entry.pcs_gn = parseFloat(row[colPCS]) || 0;
                    }
                });
            }
        }

        // 3. Processar Energia (Com a fórmula específica)
        const sheetEE = wb.Sheets['Consumo Energia Elétrica'];
        if (sheetEE) {
            const rows = XLSX.utils.sheet_to_json(sheetEE, { header: 1 });
            let headerIdx = rows.findIndex(r => r.includes('Data'));
            if (headerIdx !== -1) {
                const headers = rows[headerIdx];
                const colEntrada2 = headers.indexOf('Entrada 2 SWG (Danieli)    (kWh)');
                const colETA03 = headers.indexOf('ETA 03     (kWh)');
                const colPonte = headers.indexOf('Ponte Rolante (kWh)');

                rows.slice(headerIdx + 1).forEach(row => {
                    const dt = excelDateToISO(row[0]);
                    if (dt && dataMap.has(dt)) {
                        const vEntrada = parseFloat(row[colEntrada2]) || 0;
                        const vETA03 = parseFloat(row[colETA03]) || 0;
                        const vPonte = parseFloat(row[colPonte]) || 0;

                        // FÓRMULA SOLICITADA: Entrada 2 - ETA 03 - Ponte Rolante
                        dataMap.get(dt).consumo_energia_total = vEntrada - vETA03 - vPonte;
                    }
                });
            }
        }

        const finalData = Array.from(dataMap.values()).filter(d =>
            d.producao_laminacao > 0 || d.consumo_gas_tl01 > 0 || d.consumo_energia_total !== 0
        );

        console.log(`🚀 Sincronizando ${finalData.length} registros com o Supabase...`);

        // Upsert no banco
        const { error } = await supabase
            .from('diario_bordo_real')
            .upsert(finalData);

        if (error) throw error;

        console.log('✅ Sincronização concluída com sucesso!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Erro na sincronização:', err.message);
        process.exit(1);
    }
}

runSync();
