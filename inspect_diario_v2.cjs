const XLSX = require('xlsx');
const fs = require('fs');

const EXCEL_PATH = "\\\\brqbnwvfs02vs\\Departamentos\\GEM\\Utilidades\\2026\\03- CONTROLE DE ENERGÉTICOS\\NOVO DIARIO DE BORDO 2026 REV 01.xlsx";

function excelDateToISO(serial) {
    if (!serial || isNaN(serial)) return null;
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
}

function inspectSheets() {
    try {
        const wb = XLSX.readFile(EXCEL_PATH);
        ['Produção', 'Gás Natural', 'Consumo Energia Elétrica'].forEach(sheetName => {
            console.log(`\n--- Aba: ${sheetName} ---`);
            const sheet = wb.Sheets[sheetName];
            if (!sheet) {
                console.log('❌ Aba não encontrada');
                return;
            }
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            let headerIdx = rows.findIndex(r => r && r.includes('Data'));
            if (headerIdx === -1) {
                console.log('❌ Cabeçalho "Data" não encontrado');
                return;
            }

            const lastRows = rows.slice(-10);
            lastRows.forEach((row, i) => {
                const dt = excelDateToISO(row[0]);
                console.log(`Fila ${rows.length - 10 + i}: ${dt} | ${JSON.stringify(row)}`);
            });
        });
    } catch (err) {
        console.error('Erro:', err.message);
    }
}

inspectSheets();
