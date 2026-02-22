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

const now = new Date();
const year = now.getFullYear();
const monthNum = String(now.getMonth() + 1).padStart(2, '0');
const yearPath = path.join(BASE_NETWORK_PATH, String(year));
const yearDirs = fs.readdirSync(yearPath);
const monthFolder = yearDirs.find(dir => dir.startsWith(`${monthNum}_`));
const fullMonthPath = path.join(yearPath, monthFolder);
const files = fs.readdirSync(fullMonthPath);
let latestFile = null, maxRev = -1;
files.forEach(file => {
    if (!file.endsWith('.xlsx') || file.includes('~$')) return;
    const match = file.match(/Revisão_(\d+)/i);
    if (match) { const rev = parseInt(match[1]); if (rev > maxRev) { maxRev = rev; latestFile = file; } }
});
const FILE_PATH = path.join(fullMonthPath, latestFile);
const workbook = XLSX.readFile(FILE_PATH);
const worksheet = workbook.Sheets['TL1'];
const rawArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

let headerRowIndex = 0;
for (let i = 0; i < 15; i++) {
    if (rawArray[i] && rawArray[i].some(cell => String(cell).toUpperCase() === 'OP')) { headerRowIndex = i; break; }
}
const headers = rawArray[headerRowIndex].map((h, idx) => String(h || '').trim() || `Col_${idx}`);

const qtdeRealIdx = headers.indexOf('Qtde REAL (t)');
const prodAcabIdx = headers.indexOf('Prod. Acab. (t)');
const inicioIdx = headers.findIndex(h => h.toLowerCase().includes('início') || h.toLowerCase().includes('inicio'));
const terminoIdx = headers.findIndex(h => h === 'Término' || h === 'Termino');
const bitolaIdx = headers.findIndex(h => h === 'Bitolas' || h === 'Bitola');
const descIdx = headers.indexOf('Descrição');
const opIdx = headers.indexOf('OP');

const monthStart = new Date(Date.UTC(2026, 1, 1, 0, 0, 0)); // Feb 1
const monthEnd = new Date(Date.UTC(2026, 2, 0, 23, 59, 59)); // Feb 28

const filtered = rawArray.slice(headerRowIndex + 1).filter(row => {
    const hasData = row.some(val => val !== null && val !== undefined && String(val).trim() !== '');
    const isNotTotal = !row.some(val => String(val).toLowerCase().includes('total') || String(val).toLowerCase().includes('soma'));
    if (!hasData || !isNotTotal) return false;

    const inicioVal = row[inicioIdx];
    if (typeof inicioVal !== 'number' || inicioVal <= 40000) {
        const op = String(row[opIdx] || '');
        if (op === 'M03' || op === 'OP' || op === '-') return false;
        const desc = String(row[descIdx] || '').toLowerCase();
        return desc.includes('setup') || desc.includes('troca') || desc.includes('preventiva');
    }
    const date = excelSerialToDate(inicioVal);
    return date >= monthStart && date <= monthEnd;
});

// Now find items where Término goes beyond month
let sumProdAcabInMonth = 0;
let sumProdAcabAll = 0;
let sumQtdeRealInMonth = 0;
let sumQtdeRealAll = 0;
let overflowItems = [];

filtered.forEach(row => {
    const prodAcab = parseFloat(String(row[prodAcabIdx]).replace(/,/g, '.')) || 0;
    const qtdeReal = parseFloat(String(row[qtdeRealIdx]).replace(/,/g, '.')) || 0;
    const terminoVal = row[terminoIdx];

    sumProdAcabAll += prodAcab;
    sumQtdeRealAll += qtdeReal;

    if (typeof terminoVal === 'number' && terminoVal > 40000) {
        const tDate = excelSerialToDate(terminoVal);
        if (tDate > monthEnd) {
            overflowItems.push({
                bitola: row[bitolaIdx],
                desc: row[descIdx],
                inicio: excelSerialToDate(row[inicioIdx])?.toISOString(),
                termino: tDate.toISOString(),
                prodAcab,
                qtdeReal
            });
        } else {
            sumProdAcabInMonth += prodAcab;
            sumQtdeRealInMonth += qtdeReal;
        }
    } else {
        sumProdAcabInMonth += prodAcab;
        sumQtdeRealInMonth += qtdeReal;
    }
});

console.log(`\n=== SOMAS COMPLETAS (330 linhas) ===`);
console.log(`Prod. Acab. (t) TOTAL: ${sumProdAcabAll.toFixed(2)}`);
console.log(`Qtde REAL (t) TOTAL:   ${sumQtdeRealAll.toFixed(2)}`);

console.log(`\n=== SOMAS SEM OVERFLOW (Término <= 28/02) ===`);
console.log(`Prod. Acab. (t): ${sumProdAcabInMonth.toFixed(2)}`);
console.log(`Qtde REAL (t):   ${sumQtdeRealInMonth.toFixed(2)}`);

console.log(`\n=== ITENS COM OVERFLOW (Término > 28/02) ===`);
overflowItems.forEach(item => {
    console.log(`  Bitola=${item.bitola} | Desc=${item.desc} | Início=${item.inicio} | Término=${item.termino} | ProdAcab=${item.prodAcab} | QtdeReal=${item.qtdeReal}`);
});
console.log(`Total overflow Prod.Acab: ${overflowItems.reduce((s, i) => s + i.prodAcab, 0).toFixed(2)}`);
console.log(`Total overflow QtdeReal:  ${overflowItems.reduce((s, i) => s + i.qtdeReal, 0).toFixed(2)}`);
