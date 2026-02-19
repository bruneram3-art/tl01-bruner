const XLSX = require('xlsx');
const path = require('path');

const fp = path.join('\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli', '2026', '02_Fevereiro', 'Plano LCP Produção_Fevereiro_Revisão_04.xlsx');

const wb = XLSX.readFile(fp);

// Usa TL1
const sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'tl1') || wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const rawArray = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Find header row
let hdrIdx = 0;
for (let i = 0; i < 15; i++) {
    if (rawArray[i] && rawArray[i].some(c => String(c).toUpperCase() === 'OP')) {
        hdrIdx = i;
        break;
    }
}

const headers = rawArray[hdrIdx].map((h, idx) => String(h || '').trim() || `Col_${idx}`);

// Build data
const dataRows = rawArray.slice(hdrIdx + 1).map(row => {
    const obj = {};
    headers.forEach((h, idx) => { if (!h.startsWith('Col_')) obj[h] = row[idx]; });
    return obj;
});

// Filter empties/totals
const processed = dataRows.filter(row => {
    const vals = Object.values(row);
    const hasData = vals.some(v => v !== null && v !== undefined && String(v).trim() !== '');
    const isNotTotal = !vals.some(v => String(v).toLowerCase().includes('total') || String(v).toLowerCase().includes('soma'));
    return hasData && isNotTotal;
});

console.log(`Total rows processed: ${processed.length}`);

// Calculate total production WITHOUT month filter
const inicioCol = headers.find(h => h.toLowerCase().includes('início') || h.toLowerCase().includes('inicio'));
let totalProdAll = 0;
let totalProdQtdeReal = 0;
let totalProdAcab = 0;

processed.forEach(row => {
    const qtdeReal = parseFloat(String(row['Qtde REAL (t)'] || '0').replace(/,/g, '.')) || 0;
    const prodAcab = parseFloat(String(row['Prod. Acab. (t)'] || '0').replace(/,/g, '.')) || 0;
    totalProdQtdeReal += qtdeReal;
    totalProdAcab += prodAcab;
    // Same logic as upload: priority Qtde REAL > Prod. Acab.
    totalProdAll += qtdeReal > 0 ? qtdeReal : prodAcab;
});

console.log(`\nSEM filtro de mês:`);
console.log(`  Soma Qtde REAL (t): ${totalProdQtdeReal.toFixed(1)}`);
console.log(`  Soma Prod. Acab. (t): ${totalProdAcab.toFixed(1)}`);
console.log(`  Soma combinada (prioridade Qtde REAL): ${totalProdAll.toFixed(1)}`);

// Now apply month filter (same as upload_pcp.cjs)
function excelSerialToDate(serial) {
    if (!serial || typeof serial !== 'number' || serial <= 40000) return null;
    const utcDays = Math.floor(serial) - 25569;
    return new Date(utcDays * 86400 * 1000);
}

// Detect reference month
const monthCounts = {};
processed.forEach(row => {
    const v = row[inicioCol];
    if (typeof v === 'number' && v > 40000) {
        const d = excelSerialToDate(v);
        const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
});

let bestKey = '', maxCount = 0;
Object.entries(monthCounts).forEach(([k, c]) => { if (c > maxCount) { maxCount = c; bestKey = k; } });
const [refYear, refMonth] = bestKey.split('-').map(Number);
console.log(`\nMês ref: ${refMonth + 1}/${refYear}`);

const monthStart = new Date(Date.UTC(refYear, refMonth, 1, 0, 0, 0));
const monthEnd = new Date(Date.UTC(refYear, refMonth + 1, 0, 23, 59, 59));
const toleranceStart = new Date(monthStart);
toleranceStart.setDate(toleranceStart.getDate() - 1);
toleranceStart.setUTCHours(23, 0, 0, 0);

let totalProdFiltered = 0;
let excludedRows = [];

processed.forEach((row, idx) => {
    const inicioVal = row[inicioCol];
    const qtdeReal = parseFloat(String(row['Qtde REAL (t)'] || '0').replace(/,/g, '.')) || 0;
    const prodAcab = parseFloat(String(row['Prod. Acab. (t)'] || '0').replace(/,/g, '.')) || 0;
    const prod = qtdeReal > 0 ? qtdeReal : prodAcab;

    let included = false;

    if (typeof inicioVal !== 'number' || inicioVal <= 40000) {
        const desc = String(row['Descrição'] || row['Cart. Futura'] || '').toLowerCase();
        const isRelevant = desc.includes('setup') || desc.includes('troca') || desc.includes('preventiva');
        const op = String(row['OP'] || '');
        if (op === 'M03' || op === 'OP' || op === '-') {
            included = false;
        } else {
            included = isRelevant;
        }
    } else {
        const date = excelSerialToDate(inicioVal);
        if (date >= monthStart && date <= monthEnd) included = true;
        else if (date >= toleranceStart && date < monthStart) included = true;
    }

    if (included) {
        totalProdFiltered += prod;
    } else if (prod > 0) {
        excludedRows.push({
            op: row['OP'],
            descricao: String(row['Descrição'] || '').substring(0, 50),
            bitola: row['Bitolas'] || row['Bitola'],
            qtdeReal, prodAcab,
            inicio: inicioVal,
            inicioDate: typeof inicioVal === 'number' && inicioVal > 40000 ? excelSerialToDate(inicioVal).toISOString().split('T')[0] : 'N/A'
        });
    }
});

console.log(`\nCOM filtro de mês:`);
console.log(`  Produção filtrada: ${totalProdFiltered.toFixed(1)}`);
console.log(`  Diferença vs Qtde REAL total: ${(totalProdQtdeReal - totalProdFiltered).toFixed(1)}`);

console.log(`\n--- LINHAS EXCLUÍDAS COM PRODUÇÃO (${excludedRows.length} linhas) ---`);
excludedRows.forEach(r => {
    console.log(`  OP: ${r.op} | ${r.descricao} | Bitola: ${r.bitola} | QtdeReal: ${r.qtdeReal} | ProdAcab: ${r.prodAcab} | Início: ${r.inicioDate}`);
});
const excludedProd = excludedRows.reduce((s, r) => s + (r.qtdeReal > 0 ? r.qtdeReal : r.prodAcab), 0);
console.log(`  Total produção excluída: ${excludedProd.toFixed(1)}`);

// Show last order info
const filtered = processed.filter(row => {
    const inicioVal = row[inicioCol];
    if (typeof inicioVal !== 'number' || inicioVal <= 40000) {
        const desc = String(row['Descrição'] || '').toLowerCase();
        const op = String(row['OP'] || '');
        if (op === 'M03' || op === 'OP' || op === '-') return false;
        return desc.includes('setup') || desc.includes('troca') || desc.includes('preventiva');
    }
    const d = excelSerialToDate(inicioVal);
    return (d >= monthStart && d <= monthEnd) || (d >= toleranceStart && d < monthStart);
});

filtered.sort((a, b) => {
    const va = typeof a[inicioCol] === 'number' ? a[inicioCol] : 0;
    const vb = typeof b[inicioCol] === 'number' ? b[inicioCol] : 0;
    return va - vb;
});

// Find last order with valid date
let lastIdx = -1;
for (let i = filtered.length - 1; i >= 0; i--) {
    if (typeof filtered[i][inicioCol] === 'number' && filtered[i][inicioCol] > 40000) {
        lastIdx = i;
        break;
    }
}

if (lastIdx >= 0) {
    const last = filtered[lastIdx];
    const terminoCol = headers.find(h => h.toLowerCase().includes('término') || h.toLowerCase().includes('termino'));
    const terminoFinalCol = headers.find(h => h.toLowerCase().includes('termino final') || h.toLowerCase() === 'termino final');
    console.log(`\n--- ÚLTIMA ORDEM (index ${lastIdx}) ---`);
    console.log(`  OP: ${last['OP']}`);
    console.log(`  Descrição: ${last['Descrição']}`);
    console.log(`  Bitola: ${last['Bitolas'] || last['Bitola']}`);
    console.log(`  Qtde REAL: ${last['Qtde REAL (t)']}`);
    console.log(`  Prod. Acab.: ${last['Prod. Acab. (t)']}`);
    console.log(`  Produt. Plan t/h: ${last['Produt. Plan t/h']}`);
    console.log(`  Início: ${excelSerialToDate(last[inicioCol])?.toISOString()}`);
    if (terminoCol) console.log(`  Término: ${last[terminoCol]} -> ${typeof last[terminoCol] === 'number' && last[terminoCol] > 40000 ? excelSerialToDate(last[terminoCol])?.toISOString() : 'N/A'}`);
    if (terminoFinalCol) console.log(`  Termino Final: ${last[terminoFinalCol]} -> ${typeof last[terminoFinalCol] === 'number' && last[terminoFinalCol] > 40000 ? excelSerialToDate(last[terminoFinalCol])?.toISOString() : 'N/A'}`);

    // Calculate extended production
    const endOfMonth = new Date(Date.UTC(refYear, refMonth + 1, 0, 23, 59, 59));
    const currentTermino = typeof last[terminoCol] === 'number' && last[terminoCol] > 40000 ? excelSerialToDate(last[terminoCol]) : null;
    const produtividadePlan = parseFloat(last['Produt. Plan t/h'] || '0');
    const prodAtual = parseFloat(String(last['Qtde REAL (t)'] || last['Prod. Acab. (t)'] || '0')) || 0;

    if (currentTermino && produtividadePlan > 0) {
        const horasExtras = (endOfMonth.getTime() - currentTermino.getTime()) / (1000 * 3600);
        const prodExtra = horasExtras * produtividadePlan;
        console.log(`\n  Cálculo de extensão:`);
        console.log(`    Término atual: ${currentTermino.toISOString()}`);
        console.log(`    Fim do mês: ${endOfMonth.toISOString()}`);
        console.log(`    Horas extras: ${horasExtras.toFixed(1)}h`);
        console.log(`    Produtividade Plan: ${produtividadePlan} t/h`);
        console.log(`    Produção extra: ${prodExtra.toFixed(1)}t`);
        console.log(`    Produção final: ${(prodAtual + prodExtra).toFixed(1)}t (era ${prodAtual}t)`);
    }
}
