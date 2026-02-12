const XLSX = require('xlsx');

const FILE_PATH = './meta lcp.xlsx';

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Procurando "K5" na coluna Bitola...`);

    const k5Rows = data.filter(r => String(r['Bitola']).includes('K5'));

    if (k5Rows.length > 0) {
        console.log(`Encontrados ${k5Rows.length} registros com K5.`);
        k5Rows.slice(0, 5).forEach((row, i) => {
            const val = row['Bitola'];
            console.log(`${i + 1}: "${val}" -> Codes: [${String(val).split('').map(c => c.charCodeAt(0)).join(', ')}]`);
        });
    } else {
        console.log('NENHUM registro com "K5" encontrado na coluna Bitola.');

        // Tenta procurar em TODAS as colunas
        console.log('Procurando "K5" em QUALQUER coluna...');
        const anyK5 = data.filter(r => Object.values(r).some(v => String(v).includes('K5')));
        if (anyK5.length > 0) {
            console.log(`Encontrados ${anyK5.length} registros em outras colunas.`);
            console.log('Exemplo:', anyK5[0]);
        }
    }

} catch (err) {
    console.error(err);
}
