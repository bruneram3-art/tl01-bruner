const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const directoryPath = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli\\2026\\02_Fevereiro';
const files = fs.readdirSync(directoryPath);
const targetFile = files.find(f => f.includes('06') && f.includes('.xlsx') && !f.startsWith('~'));
const fullPath = path.join(directoryPath, targetFile);

console.log(`Lendo: ${fullPath}`);
const workbook = XLSX.readFile(fullPath, { cellDates: false });
const sheet = workbook.Sheets['TL1'];
const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

// Print headers
console.log("Headers:", json[3]); // Assuming header is at index 3 (row 4)

for (let i = 330; i <= 345; i++) {
    if (json[i]) {
        if (json[i][3] && String(json[i][3]).includes('90')) {
            console.log(`Linha ${i + 1}:`);
            console.log(json[i]);
            // Convert excel dates
            const inicio = json[i][33];
            const termino = json[i][34];
            const terminoFinal = json[i][35];
            console.log(`  Raw Início: ${inicio}`);
            console.log(`  Raw Término: ${termino}`);
            console.log(`  Raw Término Final: ${terminoFinal}`);
            console.log(`  Date Início: ${new Date((inicio - 25569) * 86400 * 1000).toISOString()}`);
            console.log(`  Date Término: ${new Date((termino - 25569) * 86400 * 1000).toISOString()}`);
            console.log(`  Date Término Final: ${new Date((terminoFinal - 25569) * 86400 * 1000).toISOString()}`);
        }
    }
}
