const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = './meta lcp.xlsx';

console.log(`Lendo arquivo: ${FILE_PATH}`);

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0]; // Pega a primeira aba
    console.log(`Lendo aba: ${sheetName}`);

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Total de linhas: ${data.length}`);

    if (data.length > 0) {
        // Pega as chaves (cabeçalhos) da primeira linha
        const headers = Object.keys(data[0]);
        console.log('Cabeçalhos encontrados:', headers);

        // Procura coluna de Bitola
        const bitolaHeader = headers.find(h => h.toLowerCase().includes('bitola'));

        if (bitolaHeader) {
            console.log(`\nColuna de Bitola identificada: "${bitolaHeader}"`);
            console.log('--- Primeiros 10 valores de Bitola (EXATOS) ---');

            data.slice(0, 10).forEach((row, i) => {
                const val = row[bitolaHeader];
                // Mostra valor, tipo, e representação JSON para ver caracteres invisíveis
                console.log(`${i + 1}: "${val}" (Tipo: ${typeof val}) -> JSON: ${JSON.stringify(val)}`);

                if (typeof val === 'string') {
                    // Análise de caracteres (hex) para ver espaços diferentes, etc.
                    const charCodes = val.split('').map(c => c.charCodeAt(0));
                    console.log(`    Codes: [${charCodes.join(', ')}]`);
                }
            });
        } else {
            console.log('\n❌ NÃO encontrei coluna com nome "Bitola".');
        }
    } else {
        console.log('Planilha vazia.');
    }

} catch (err) {
    console.error('Erro ao ler arquivo:', err.message);
}
