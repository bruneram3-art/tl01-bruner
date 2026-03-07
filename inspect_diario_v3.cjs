const XLSX = require('xlsx');

const EXCEL_PATH = "\\\\brqbnwvfs02vs\\Departamentos\\GEM\\Utilidades\\2026\\03- CONTROLE DE ENERGÉTICOS\\NOVO DIARIO DE BORDO 2026 REV 01.xlsx";

function excelDateToISO(serial) {
    if (!serial || isNaN(serial)) return null;
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
}

function inspectOtherSheets() {
    try {
        const wb = XLSX.readFile(EXCEL_PATH);
        const targetDate = '2026-03-06';

        ['BASE DE DADOS', 'Flash', 'Fechamento GN ', 'Fechamento EE'].forEach(sheetName => {
            console.log(`\n--- Aba: ${sheetName} ---`);
            const sheet = wb.Sheets[sheetName];
            if (!sheet) {
                console.log('❌ Aba não encontrada');
                return;
            }
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            rows.forEach((row, i) => {
                const dt = excelDateToISO(row[0]);
                if (dt === targetDate) {
                    console.log(`Linha ${i}: ${JSON.stringify(row)}`);
                }
            });

            // Se não encontrou por data na coluna 0, tenta buscar o texto "06/03" ou similar
            if (rows.length > 0) {
                console.log(`Primeiras 5 linhas:`, rows.slice(0, 5));
                console.log(`Últimas 5 linhas:`, rows.slice(-5));
            }
        });
    } catch (err) {
        console.error('Erro:', err.message);
    }
}

inspectOtherSheets();
