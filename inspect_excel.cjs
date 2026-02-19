const XLSX = require('xlsx');
const path = require('path');

const fp = path.join('\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli', '2026', '02_Fevereiro', 'Plano LCP Produção_Fevereiro_Revisão_04.xlsx');

console.log('Lendo:', fp);
const wb = XLSX.readFile(fp);

console.log('=== SHEETS ===');
console.log('Abas:', wb.SheetNames);

// Verifica se existe TL1/TL01
const tlSheet = wb.SheetNames.find(name =>
    name.toLowerCase() === 'tl1' ||
    name.toLowerCase() === 'tl01' ||
    name.toLowerCase() === 'tl 1' ||
    name.toLowerCase() === 'tl 01'
);
const tlPartial = wb.SheetNames.find(name =>
    name.toLowerCase().includes('tl1') ||
    name.toLowerCase().includes('tl01')
);

console.log('TL Sheet (exact):', tlSheet || 'NÃO ENCONTRADA');
console.log('TL Sheet (partial):', tlPartial || 'NÃO ENCONTRADA');

// Para cada aba, mostra headers e contagem
wb.SheetNames.forEach(s => {
    const ws = wb.Sheets[s];
    const d = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log(`\n--- Aba: "${s}" | Linhas totais: ${d.length} ---`);

    if (d.length > 0) {
        // Encontra linha do cabeçalho (que contém "OP")
        let hdrIdx = 0;
        for (let i = 0; i < Math.min(15, d.length); i++) {
            if (d[i] && d[i].some(c => String(c).toUpperCase() === 'OP')) {
                hdrIdx = i;
                console.log(`  Header row (contém "OP"): linha ${i}`);
                break;
            }
        }

        const headers = d[hdrIdx].filter(h => h !== '');
        console.log(`  Headers (${headers.length}):`, headers);
        console.log(`  Data rows after header: ${d.length - hdrIdx - 1}`);

        // Mostra a primeira linha de dados
        if (d.length > hdrIdx + 1) {
            const firstDataRow = d[hdrIdx + 1];
            const headersFull = d[hdrIdx];
            const obj = {};
            headersFull.forEach((h, idx) => {
                if (h !== '') obj[h] = firstDataRow[idx];
            });
            console.log('  Primeira linha de dados:', JSON.stringify(obj, null, 2));
        }
    }
});
