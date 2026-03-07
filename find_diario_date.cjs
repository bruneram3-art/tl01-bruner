const XLSX = require('xlsx');

const EXCEL_PATH = "\\\\brqbnwvfs02vs\\Departamentos\\GEM\\Utilidades\\2026\\03- CONTROLE DE ENERGÉTICOS\\NOVO DIARIO DE BORDO 2026 REV 01.xlsx";

function excelDateToISO(serial) {
    if (!serial || isNaN(serial)) return null;
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
}

function findDate() {
    try {
        const wb = XLSX.readFile(EXCEL_PATH);
        const sheet = wb.Sheets['Produção'];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const targetDate = '2026-03-06';
        const targetDatePrev = '2026-03-05';

        console.log(`Buscando ${targetDatePrev} e ${targetDate}...`);

        rows.forEach((row, i) => {
            const dt = excelDateToISO(row[0]);
            if (dt === targetDate || dt === targetDatePrev) {
                console.log(`Linha ${i}: ${dt} | ${JSON.stringify(row)}`);
            }
        });
    } catch (err) {
        console.error('Erro:', err.message);
    }
}

findDate();
