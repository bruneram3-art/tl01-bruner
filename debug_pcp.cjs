const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const BASE_NETWORK_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli';

function excelSerialToDate(serial) {
    if (!serial || typeof serial !== 'number' || serial <= 40000) return null;
    const utcDays = Math.floor(serial) - 25569;
    const utcValue = utcDays * 86400 * 1000;
    const date = new Date(utcValue);
    const fractionalDay = serial - Math.floor(serial);
    const totalSeconds = Math.round(fractionalDay * 86400);
    date.setUTCHours(Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60), totalSeconds % 60);
    return date;
}

// Find the file
const now = new Date();
const year = now.getFullYear();
const monthIndex = now.getMonth();
const monthNum = String(monthIndex + 1).padStart(2, '0');

const yearPath = path.join(BASE_NETWORK_PATH, String(year));
const yearDirs = fs.readdirSync(yearPath);
const monthFolder = yearDirs.find(dir => dir.startsWith(`${monthNum}_`));
const fullMonthPath = path.join(yearPath, monthFolder);
const files = fs.readdirSync(fullMonthPath);
const revRegex = /Revisão_(\d+)/i;
let latestFile = null;
let maxRev = -1;
files.forEach(file => {
    if (!file.endsWith('.xlsx') || file.includes('~$')) return;
    const match = file.match(revRegex);
    if (match) {
        const rev = parseInt(match[1], 10);
        if (rev > maxRev) { maxRev = rev; latestFile = file; }
    }
});

const FILE_PATH = path.join(fullMonthPath, latestFile);
console.log(`Arquivo: ${latestFile}`);

const workbook = XLSX.readFile(FILE_PATH);
let sheetName = 'TL1';
if (!workbook.Sheets[sheetName]) {
    sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('tl1')) || workbook.SheetNames[0];
}
console.log(`Aba: ${sheetName}`);

const worksheet = workbook.Sheets[sheetName];
const rawArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

// Find header row
let headerRowIndex = 0;
for (let i = 0; i < Math.min(15, rawArray.length); i++) {
    if (rawArray[i] && rawArray[i].some(cell => String(cell).toUpperCase() === 'OP')) {
        headerRowIndex = i;
        break;
    }
}

const headers = rawArray[headerRowIndex].map((h, idx) => String(h || '').trim() || `Col_${idx}`);

// Find key column indices
const qtdeRealIdx = headers.indexOf('Qtde REAL (t)');
const prodAcabIdx = headers.indexOf('Prod. Acab. (t)');
const inicioIdx = headers.findIndex(h => h.toLowerCase().includes('início') || h.toLowerCase().includes('inicio'));
const terminoIdx = headers.findIndex(h => h === 'Término' || h === 'Termino');
const bitolaIdx = headers.findIndex(h => h === 'Bitolas' || h === 'Bitola');
const descIdx = headers.indexOf('Descrição');
const opIdx = headers.indexOf('OP');

console.log(`\nÍndices: Qtde REAL=${qtdeRealIdx}, Prod.Acab=${prodAcabIdx}, Início=${inicioIdx}, Término=${terminoIdx}, Bitola=${bitolaIdx}, Desc=${descIdx}, OP=${opIdx}`);

// Process data rows
const dataRows = rawArray.slice(headerRowIndex + 1);

// Filter: remove empty and totals
const processed = dataRows.filter(row => {
    const hasData = row.some(val => val !== null && val !== undefined && String(val).trim() !== '');
    const isNotTotal = !row.some(val => String(val).toLowerCase().includes('total') || String(val).toLowerCase().includes('soma'));
    return hasData && isNotTotal;
});

console.log(`\nTotal linhas brutas: ${rawArray.length}`);
console.log(`Linhas após filtro (sem vazias/totais): ${processed.length}`);

// Detect reference month
const monthCounts = {};
processed.forEach(row => {
    const inicioVal = row[inicioIdx];
    if (typeof inicioVal === 'number' && inicioVal > 40000) {
        const date = excelSerialToDate(inicioVal);
        const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
});
console.log(`\nContagem de meses:`, monthCounts);

let refMonth = -1, refYear = -1;
let maxCount = 0;
Object.entries(monthCounts).forEach(([key, count]) => {
    if (count > maxCount) { maxCount = count; refMonth = parseInt(key.split('-')[1]); refYear = parseInt(key.split('-')[0]); }
});
console.log(`Mês de referência: ${refMonth + 1}/${refYear} (${maxCount} registros)`);

// Filter by month - STRICT (no tolerance)
const monthStart = new Date(Date.UTC(refYear, refMonth, 1, 0, 0, 0));
const monthEnd = new Date(Date.UTC(refYear, refMonth + 1, 0, 23, 59, 59));

const filtered = processed.filter(row => {
    const inicioVal = row[inicioIdx];
    if (typeof inicioVal !== 'number' || inicioVal <= 40000) {
        const desc = String(row[descIdx] || '').toLowerCase();
        const isRelevant = desc.includes('setup') || desc.includes('troca') || desc.includes('preventiva');
        const op = String(row[opIdx] || '');
        if (op === 'M03' || op === 'OP' || op === '-') return false;
        return isRelevant;
    }
    const date = excelSerialToDate(inicioVal);
    return date >= monthStart && date <= monthEnd;
});

console.log(`Linhas filtradas para ${refMonth + 1}/${refYear}: ${filtered.length}`);

// Calculate totals - try both columns
let sumQtdeReal = 0;
let sumProdAcab = 0;
let lastTermino = 0;
let lastBitola = '';
let lastDesc = '';
let lastTerminoDate = '';

filtered.forEach(row => {
    const qtdeReal = parseFloat(String(row[qtdeRealIdx]).replace(/,/g, '.')) || 0;
    const prodAcab = parseFloat(String(row[prodAcabIdx]).replace(/,/g, '.')) || 0;
    sumQtdeReal += qtdeReal;
    sumProdAcab += prodAcab;

    const terminoVal = row[terminoIdx];
    if (typeof terminoVal === 'number' && terminoVal > 40000) {
        if (terminoVal >= lastTermino) {
            lastTermino = terminoVal;
            lastBitola = String(row[bitolaIdx] || '').trim();
            lastDesc = String(row[descIdx] || '').trim();
            lastTerminoDate = excelSerialToDate(terminoVal).toISOString();
        }
    }
});

console.log(`\n========= RESULTADOS =========`);
console.log(`Soma "Qtde REAL (t)": ${sumQtdeReal.toFixed(2)}`);
console.log(`Soma "Prod. Acab. (t)": ${sumProdAcab.toFixed(2)}`);
console.log(`Último Material (por Término):`);
console.log(`  Bitola: ${lastBitola}`);
console.log(`  Descrição: ${lastDesc}`);
console.log(`  Término: ${lastTerminoDate}`);
console.log(`==============================`);

// Show last 5 items by termino
const sortedByTermino = filtered.filter(r => typeof r[terminoIdx] === 'number' && r[terminoIdx] > 40000)
    .sort((a, b) => b[terminoIdx] - a[terminoIdx])
    .slice(0, 5);

console.log(`\nÚltimas 5 ordens por Término:`);
sortedByTermino.forEach((row, i) => {
    const date = excelSerialToDate(row[terminoIdx]);
    console.log(`  ${i + 1}. Bitola="${row[bitolaIdx]}" | Desc="${row[descIdx]}" | Término=${date.toISOString()} | QTD=${row[qtdeRealIdx]}`);
});
