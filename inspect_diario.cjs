const XLSX = require('xlsx');
const path = require('path');

const fp = "\\\\brqbnwvfs02vs\\Departamentos\\GEM\\Utilidades\\2026\\03- CONTROLE DE ENERGÉTICOS\\NOVO DIARIO DE BORDO 2026 REV 01.xlsx";

try {
    console.log('Tentando ler arquivo:', fp);
    const wb = XLSX.readFile(fp);

    console.log('✅ Sucesso ao abrir o arquivo!');
    console.log('=== ABAS ENCONTRADAS ===');
    console.log(wb.SheetNames);

    // Ler as primeiras linhas da primeira aba para mostrar dados
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    console.log(`\n--- Mostrando primeiras 5 linhas da aba "${firstSheetName}" ---`);
    data.slice(0, 5).forEach((row, i) => {
        console.log(`Linha ${i}:`, JSON.stringify(row));
    });

} catch (err) {
    console.error('❌ Erro ao acessar o arquivo:', err.message);
}
