const XLSX = require('xlsx');

const FILE_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli\\2026\\03_Março\\Plano LCP Produção_Março_Prévia_02.xlsx';

function getColumnValue(row, keys, asNumber) {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            if (asNumber) {
                const val = parseFloat(String(row[key]).replace(/,/g, '.'));
                if (!isNaN(val)) return { val, key }; // Retorna o valor e a chave usada
            } else {
                return { val: row[key], key };
            }
        }
    }
    return { val: asNumber ? 0 : '', key: null };
}

function debugMapping() {
    const workbook = XLSX.readFile(FILE_PATH);
    const worksheet = workbook.Sheets['TL1'];
    const rawArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    let headerRowIndex = -1;
    for (let i = 0; i < 20; i++) {
        const row = rawArray[i];
        if (row && row.some(cell => String(cell).toUpperCase() === 'OP')) {
            headerRowIndex = i;
            break;
        }
    }

    const headers = rawArray[headerRowIndex].map((h, idx) => {
        const header = String(h || '').trim();
        return header || `Col_${idx}`;
    });

    const dataRows = rawArray.slice(headerRowIndex + 1).map(row => {
        const obj = {};
        headers.forEach((header, idx) => {
            if (header && !header.startsWith('Col_')) {
                obj[header] = row[idx] !== undefined && row[idx] !== null ? row[idx] : '';
            }
        });
        return obj;
    });

    const prodKeys = ['Qtde REAL (t)', 'producao_planejada', '_ai_producao', 'Prod. Acab. (t)', 'Producao', 'Produção', 'Qtd. Planejada', 'Quantidade'];

    console.log('--- Debug de Mapeamento de Produção (Primeiras 10 linhas) ---');
    dataRows.slice(0, 10).forEach((row, i) => {
        const result = getColumnValue(row, prodKeys, true);
        console.log(`Linha ${i}: Valor: ${result.val} | Chave Usada: ${result.key} | Qtde REAL: ${row['Qtde REAL (t)']} | Prod. Acab: ${row['Prod. Acab. (t)']}`);
    });
}

debugMapping();
