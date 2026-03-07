const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli\\2026\\03_Março\\Plano LCP Produção_Março_Prévia_02.xlsx';

function excelSerialToDate(serial) {
    if (!serial || typeof serial !== 'number' || serial <= 40000) return null;
    const utcDays = Math.floor(serial) - 25569;
    const utcValue = utcDays * 86400 * 1000;
    return new Date(utcValue);
}

function analyzeFirstRows() {
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
    const inicioIdx = headers.indexOf('Início');
    const prodIdx = headers.indexOf('Qtde REAL (t)');
    const descIdx = headers.indexOf('Descrição');
    const opIdx = headers.indexOf('OP');

    console.log('Primeiras 15 linhas de produção detectadas:');
    let count = 0;
    data.slice(headerIdx + 1).forEach(row => {
        const inicio = row[inicioIdx];
        const prod = parseFloat(row[prodIdx]) || 0;
        const op = row[opIdx];
        const desc = row[descIdx];

        if (typeof inicio === 'number' && inicio > 40000 && prod > 0 && count < 15) {
            const date = excelSerialToDate(inicio);
            console.log(`[${count}] OP: ${op} | Data: ${date.toISOString()} | Prod: ${prod} t | Desc: ${desc}`);
            count++;
        }
    });
}

analyzeFirstRows();
