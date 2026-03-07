const XLSX = require('xlsx');

const EXCEL_PATH = "\\\\brqbnwvfs02vs\\Departamentos\\GEM\\Utilidades\\2026\\03- CONTROLE DE ENERGÉTICOS\\NOVO DIARIO DE BORDO 2026 REV 01.xlsx";

function searchAll() {
    try {
        const wb = XLSX.readFile(EXCEL_PATH);
        const targetSerial = 46087; // 2026-03-06

        wb.SheetNames.forEach(name => {
            const sheet = wb.Sheets[name];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            data.forEach((row, i) => {
                if (row.includes(targetSerial)) {
                    console.log(`[${name}] Linha ${i}: ${JSON.stringify(row)}`);
                }
            });
        });
    } catch (err) {
        console.error('Erro:', err.message);
    }
}

searchAll();
