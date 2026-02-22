const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const directoryPath = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli\\2026\\02_Fevereiro';
const files = fs.readdirSync(directoryPath);
const targetFile = files.find(f => f.includes('06') && f.includes('.xlsx') && !f.startsWith('~'));
const fullPath = path.join(directoryPath, targetFile);

const workbook = XLSX.readFile(fullPath, { cellDates: false });
const sheet = workbook.Sheets['TL1'];
const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

for (let i = 0; i <= 20; i++) {
    if (json[i]) {
        console.log(`Linha ${i + 1}: ${json[i][3]} | Qtde: ${json[i][20]} | Início: ${json[i][33]} | Término: ${json[i][34]}`);
    }
}
