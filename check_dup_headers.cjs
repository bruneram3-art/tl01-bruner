const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli\\2026\\03_Março\\Plano LCP Produção_Março_Prévia_02.xlsx';

function findDuplicateHeaders() {
    const workbook = XLSX.readFile(FILE_PATH);
    const worksheet = workbook.Sheets['TL1'];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    let headerIdx = -1;
    for (let i = 0; i < 20; i++) {
        if (data[i] && data[i].includes('OP')) {
            headerIdx = i;
            break;
        }
    }

    const headers = data[headerIdx];
    const headerCounts = {};
    const duplicates = [];

    headers.forEach((h, idx) => {
        const name = String(h || '').trim();
        if (name) {
            if (headerCounts[name]) {
                headerCounts[name].push(idx);
                if (headerCounts[name].length === 2) duplicates.push(name);
            } else {
                headerCounts[name] = [idx];
            }
        }
    });

    console.log('Colunas Duplicadas Encontradas:');
    duplicates.forEach(name => {
        console.log(`- ${name} nos índices: ${headerCounts[name].join(', ')}`);
    });

    const target = 'Qtde REAL (t)';
    if (headerCounts[target]) {
        console.log(`\nValores para as colunas '${target}':`);
        const idxs = headerCounts[target];
        data.slice(headerIdx + 1, headerIdx + 11).forEach((row, rIdx) => {
            const vals = idxs.map(i => row[i]);
            console.log(`Linha ${rIdx}: ${vals.join(' | ')}`);
        });
    }
}

findDuplicateHeaders();
