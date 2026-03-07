const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli\\2026\\03_Março\\Plano LCP Produção_Março_Prévia_02.xlsx';

function excelSerialToDate(serial) {
    if (!serial || typeof serial !== 'number' || serial <= 40000) return null;
    const utcDays = Math.floor(serial) - 25569;
    const utcValue = utcDays * 86400 * 1000;
    return new Date(utcValue);
}

function analyzeData() {
    const workbook = XLSX.readFile(FILE_PATH);
    const worksheet = workbook.Sheets['TL1'];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Encontrar cabeçalho
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

    const counts = {};
    let totalProd = 0;

    data.slice(headerIdx + 1).forEach(row => {
        const inicio = row[inicioIdx];
        const prod = parseFloat(row[prodIdx]) || 0;
        if (typeof inicio === 'number' && inicio > 40000) {
            const date = excelSerialToDate(inicio);
            const dateKey = date.toISOString().split('T')[0];
            counts[dateKey] = (counts[dateKey] || 0) + prod;
            totalProd += prod;
        }
    });

    console.log('Distribuição de Produção por Data:');
    Object.keys(counts).sort().forEach(date => {
        console.log(`${date}: ${counts[date].toFixed(1)} t`);
    });
    console.log(`Total Bruto: ${totalProd.toFixed(1)} t`);
}

analyzeData();
