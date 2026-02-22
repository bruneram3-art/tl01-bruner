const XLSX = require('xlsx');
const path = require('path');

const fp = "\\\\brqbnwvfs02vs\\Departamentos\\GEM\\Utilidades\\2026\\03- CONTROLE DE ENERGÉTICOS\\NOVO DIARIO DE BORDO 2026 REV 01.xlsx";

const sheetsToInspect = ['Consumo Energia Elétrica', 'Produção', 'Gás Natural'];

try {
    console.log('Inspecionando abas específicas no arquivo:', fp);
    const wb = XLSX.readFile(fp);

    sheetsToInspect.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        if (!ws) {
            console.log(`\n❌ Aba "${sheetName}" não encontrada!`);
            return;
        }

        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        console.log(`\n--- Aba: "${sheetName}" | Linhas: ${data.length} ---`);

        // Tenta encontrar a linha de cabeçalho (geralmente contém "Data")
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(20, data.length); i++) {
            if (data[i] && data[i].some(cell => String(cell).toLowerCase().includes('data'))) {
                headerRowIdx = i;
                break;
            }
        }

        console.log(`Cabeçalhos (Linha ${headerRowIdx}):`, JSON.stringify(data[headerRowIdx]));
        console.log(`Exemplo Dados (Linha ${headerRowIdx + 1}):`, JSON.stringify(data[headerRowIdx + 1]));
        console.log(`Exemplo Dados (Linha ${headerRowIdx + 2}):`, JSON.stringify(data[headerRowIdx + 2]));
    });

} catch (err) {
    console.error('❌ Erro:', err.message);
}
