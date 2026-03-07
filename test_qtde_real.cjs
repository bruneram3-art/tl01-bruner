const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli\\2026\\03_Março\\Plano LCP Produção_Março_Prévia_02.xlsx';

function excelSerialToDate(serial) {
    if (!serial || typeof serial !== 'number' || serial <= 40000) return null;
    const utcDays = Math.floor(serial) - 25569;
    const utcValue = utcDays * 86400 * 1000;
    return new Date(utcValue);
}

function simulateFilter() {
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
    const terminoIdx = headers.indexOf('Término');
    const prodIdx = headers.indexOf('Qtde REAL (t)');

    // Filtro de Mês: Março/2026
    const refYear = 2026;
    const refMonth = 2; // Março
    const monthStart = new Date(Date.UTC(refYear, refMonth, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(refYear, refMonth + 1, 0, 23, 59, 59));
    const earlyGracePeriod = new Date(monthStart);
    earlyGracePeriod.setUTCDate(earlyGracePeriod.getUTCDate() - 10);

    let filteredTotal = 0;
    let count = 0;

    data.slice(headerIdx + 1).forEach(row => {
        const inicioVal = row[inicioIdx];
        const prod = parseFloat(row[prodIdx]) || 0;

        if (typeof inicioVal === 'number' && inicioVal > 40000) {
            const date = excelSerialToDate(inicioVal);
            const dTermino = typeof row[terminoIdx] === 'number' ? excelSerialToDate(row[terminoIdx]) : null;

            const startsInMonth = date >= monthStart && date <= monthEnd;
            const overlapsMonthStart = date < monthStart && dTermino && dTermino > monthStart;
            const isInitialTransition = date >= earlyGracePeriod && date < monthStart;

            if (startsInMonth || overlapsMonthStart || isInitialTransition) {
                // Se for a última linha e precisar de trim (como no script), mas aqui vamos somar bruto primeiro
                filteredTotal += prod;
                count++;
            }
        }
    });

    console.log(`Linhas no filtro: ${count}`);
    console.log(`Total Produção Bruta (Qtde REAL (t)): ${filteredTotal.toFixed(2)} t`);
}

simulateFilter();
