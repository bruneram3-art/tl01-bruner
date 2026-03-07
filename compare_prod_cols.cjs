const XLSX = require('xlsx');
const fs = require('fs');

const FILE_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli\\2026\\03_Março\\Plano LCP Produção_Março_Prévia_02.xlsx';

function analyzeProductionColumns() {
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
    const realIdx = headers.indexOf('Qtde REAL (t)');
    const acabIdx = headers.indexOf('Prod. Acab. (t)');
    const inicioIdx = headers.indexOf('Início');

    let totalReal = 0;
    let totalAcab = 0;
    let count = 0;

    console.log('Comparação de Colunas (Primeiras 20 linhas com dados):');
    data.slice(headerIdx + 1).forEach(row => {
        const valReal = parseFloat(row[realIdx]) || 0;
        const valAcab = parseFloat(row[acabIdx]) || 0;
        const inicio = row[inicioIdx];

        if (valReal > 0 || valAcab > 0) {
            if (count < 20) {
                console.log(`Linha ${count}: Qtde REAL: ${valReal} | Prod. Acab: ${valAcab} | Dif: ${valReal - valAcab}`);
            }
            totalReal += valReal;
            totalAcab += valAcab;
            count++;
        }
    });

    console.log(`\nTotal Acumulado 'Qtde REAL (t)': ${totalReal.toFixed(2)} t`);
    console.log(`Total Acumulado 'Prod. Acab. (t)': ${totalAcab.toFixed(2)} t`);
}

analyzeProductionColumns();
