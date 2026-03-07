import XLSX from 'xlsx';
import fs from 'fs';

const filePath = "c:\\Users\\40000398\\OneDrive - ArcelorMittal\\Desktop\\Plano LCP Produção_Fevereiro_Revisão_00.xlsx";

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    console.log("Abas encontradas:", workbook.SheetNames);

    let sheetName = workbook.SheetNames.find(name => {
        const n = name.toLowerCase();
        return n.includes('tl1') || n.includes('tl01') || n.includes('pcp');
    }) || workbook.SheetNames[0];

    console.log(`Aba selecionada: "${sheetName}"`);
    let worksheet = workbook.Sheets[sheetName];
    const rawArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    console.log("Primeiras 5 linhas (bruto):");
    console.log(JSON.stringify(rawArray.slice(0, 5), null, 2));

    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(25, rawArray.length); i++) {
        const row = rawArray[i];
        if (row && Array.isArray(row) && row.some((cell) => {
            const val = String(cell || '').toUpperCase().trim();
            return val === 'OP' || val === 'ORDEM' || val === 'ORDEM DE PRODUCAO';
        })) {
            headerRowIndex = i;
            break;
        }
    }

    console.log(`Índice do cabeçalho: ${headerRowIndex}`);

    if (headerRowIndex !== -1) {
        const headers = rawArray[headerRowIndex].map((h, idx) => String(h || '').trim() || `Col_${idx}`);
        console.log("Cabeçalhos:", headers);

        const dataRows = rawArray.slice(headerRowIndex + 1).map((row) => {
            const obj = {};
            headers.forEach((header, idx) => {
                if (header && !header.startsWith('Col_')) obj[header] = row[idx] ?? '';
            });
            return obj;
        });

        const processed = dataRows.filter((row) => {
            const values = Object.values(row);
            const hasData = values.some(v => String(v).trim() !== '');
            const isNotTotal = !values.some(v => String(v).toLowerCase().includes('total'));
            return hasData && isNotTotal;
        });

        console.log(`Total de linhas processadas: ${processed.length}`);
        if (processed.length > 0) {
            console.log("Primeira linha processada:", processed[0]);
        }
    } else {
        console.log("ERRO: Cabeçalho 'OP' não encontrado!");
    }

} catch (e) {
    console.error("Erro fatal:", e.message);
}
