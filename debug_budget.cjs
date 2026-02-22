const XLSX = require('xlsx');
const path = require('path');

const filePath = path.resolve(__dirname, 'orçamento.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('Abas disponíveis:', workbook.SheetNames);

const sheetName = 'TL1'; // O usuário mencionou TL1
if (workbook.SheetNames.includes(sheetName)) {
    const worksheet = workbook.Sheets[sheetName];
    // Pegar um intervalo que inclua a tabela BUD_V1.2
    // Baseado na imagem, a tabela BUD_V1.2 começa por volta da linha 25
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0 }); // Pegar tudo primeiro para localizar

    data.slice(0, 40).forEach((row, idx) => {
        console.log(`Linha ${idx + 1}:`, row);
    });
} else {
    console.log(`Aba ${sheetName} não encontrada.`);
}
