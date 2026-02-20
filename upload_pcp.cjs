const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- Configurações ---
const SUPABASE_URL = 'https://tyrxbarucopizpcalooh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnhiYXJ1Y29waXpwY2Fsb29oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDQ0OTUsImV4cCI6MjA2NzU4MDQ5NX0.ycJzhslzMyD0DQWWu5hY09SucH94OTwWI60oIqm-EB8';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE_NETWORK_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli';

// --- Funções Auxiliares ---

function getMonthName(monthIndex) {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIndex];
}

function findLatestFile() {
    console.log('--- Buscando arquivo na rede ---');
    try {
        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = now.getMonth();
        const monthNum = String(monthIndex + 1).padStart(2, '0');
        const monthName = getMonthName(monthIndex);

        const yearPath = path.join(BASE_NETWORK_PATH, String(year));
        if (!fs.existsSync(yearPath)) {
            console.error(`❌ Pasta do ano não encontrada: ${yearPath}`);
            return null;
        }

        const yearDirs = fs.readdirSync(yearPath);
        const monthFolder = yearDirs.find(dir => dir.startsWith(`${monthNum}_`));
        if (!monthFolder) {
            console.error(`❌ Pasta do mês (${monthNum}_) não encontrada em ${yearPath}`);
            return null;
        }

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
                if (rev > maxRev) {
                    maxRev = rev;
                    latestFile = file;
                }
            }
        });

        if (!latestFile) {
            console.error('❌ Nenhum arquivo com "Revisão_XX" encontrado.');
            return null;
        }

        const fullFilePath = path.join(fullMonthPath, latestFile);
        const stats = fs.statSync(fullFilePath);
        return {
            path: fullFilePath,
            metadata: {
                year,
                month: monthName,
                revision: maxRev,
                source: fullFilePath,
                fileName: latestFile,
                modifiedAt: stats.mtime
            }
        };
    } catch (error) {
        console.error('Erro na resolução do caminho:', error.message);
        return null;
    }
}

function excelSerialToDate(serial) {
    if (!serial || typeof serial !== 'number' || serial <= 40000) return null;
    const utcDays = Math.floor(serial) - 25569;
    const utcValue = utcDays * 86400 * 1000;
    const date = new Date(utcValue);
    // Preservar horas e minutos da fração decimal
    const fractionalDay = serial - Math.floor(serial);
    const totalSeconds = Math.round(fractionalDay * 86400);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    date.setUTCHours(hours, minutes, seconds);
    return date;
}

function excelSerialToISO(serial) {
    const date = excelSerialToDate(serial);
    if (!date) return null;
    // Formato YYYY-MM-DD
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getColumnValue(row, keys, asNumber) {
    for (const key of keys) {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            if (asNumber) {
                const val = parseFloat(String(row[key]).replace(/,/g, '.'));
                if (!isNaN(val)) return val;
            } else {
                return row[key];
            }
        }
    }
    return asNumber ? 0 : '';
}

// --- Função Principal ---
async function uploadPCP() {
    const fileInfo = findLatestFile();
    if (!fileInfo) {
        console.error('❌ Abortando: Arquivo não encontrado.');
        return;
    }

    const { path: FILE_PATH, metadata } = fileInfo;
    console.log(`📂 Arquivo: ${metadata.fileName}`);
    console.log(`   Revisão: ${metadata.revision} | Mês: ${metadata.month} | Ano: ${metadata.year}`);

    try {
        const workbook = XLSX.readFile(FILE_PATH);
        console.log(`   Abas disponíveis: ${workbook.SheetNames.join(', ')}`);

        // === PASSO 1: Selecionar a aba correta (mesmo critério do App.tsx) ===
        // Prioridade: TL1/TL01 > primeira aba
        let sheetName = workbook.SheetNames[0];
        const tlSheet = workbook.SheetNames.find(name =>
            name.toLowerCase() === 'tl1' || name.toLowerCase() === 'tl01' ||
            name.toLowerCase() === 'tl 1' || name.toLowerCase() === 'tl 01'
        );
        if (tlSheet) {
            sheetName = tlSheet;
        } else {
            const tlPartial = workbook.SheetNames.find(name =>
                name.toLowerCase().includes('tl1') || name.toLowerCase().includes('tl01')
            );
            if (tlPartial) sheetName = tlPartial;
        }

        console.log(`   Aba selecionada: "${sheetName}"`);
        const worksheet = workbook.Sheets[sheetName];

        // === PASSO 2: Ler como array de arrays (igual manual) ===
        const rawArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        console.log(`   Total linhas brutas: ${rawArray.length}`);

        // === PASSO 3: Encontrar linha do cabeçalho (contém "OP") ===
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(15, rawArray.length); i++) {
            const row = rawArray[i];
            if (row && row.some(cell => String(cell).toUpperCase() === 'OP')) {
                headerRowIndex = i;
                break;
            }
        }
        console.log(`   Header encontrado na linha: ${headerRowIndex}`);

        // === PASSO 4: Extrair headers ===
        const headers = rawArray[headerRowIndex].map((h, idx) => {
            const header = String(h || '').trim();
            return header || `Col_${idx}`;
        });
        const realHeaders = headers.filter(h => !h.startsWith('Col_'));
        console.log(`   Headers reais encontados (${realHeaders.length}):`, realHeaders);

        // === PASSO 5: Converter linhas em objetos (igual manual) ===
        const dataRows = rawArray.slice(headerRowIndex + 1).map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
                if (header && !header.startsWith('Col_')) {
                    obj[header] = row[idx] !== undefined && row[idx] !== null ? row[idx] : '';
                }
            });
            return obj;
        });

        // === PASSO 6: Filtrar linhas vazias e totais (igual manual) ===
        const processed = dataRows.filter(row => {
            const values = Object.values(row);
            const hasData = values.some(val => val !== null && val !== undefined && String(val).trim() !== '');
            const isNotTotal = !values.some(val =>
                String(val).toLowerCase().includes('total') ||
                String(val).toLowerCase().includes('soma')
            );
            return hasData && isNotTotal;
        });

        console.log(`   Linhas após filtro (sem vazias/totais): ${processed.length}`);

        // === PASSO 7: Detectar mês de referência (moda das datas — igual manual) ===
        const inicioCol = headers.find(h => h.toLowerCase().includes('início') || h.toLowerCase().includes('inicio'));
        let refMonth = -1;
        let refYear = -1;

        if (inicioCol && processed.length > 0) {
            const monthCounts = {};
            processed.forEach(row => {
                const inicioVal = row[inicioCol];
                if (typeof inicioVal === 'number' && inicioVal > 40000) {
                    const date = excelSerialToDate(inicioVal);
                    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
                    monthCounts[key] = (monthCounts[key] || 0) + 1;
                }
            });

            let maxCount = 0;
            let bestMonthKey = '';
            Object.entries(monthCounts).forEach(([key, count]) => {
                if (count > maxCount) {
                    maxCount = count;
                    bestMonthKey = key;
                }
            });

            if (bestMonthKey) {
                const [yearStr, monthStr] = bestMonthKey.split('-');
                refYear = parseInt(yearStr);
                refMonth = parseInt(monthStr);
                console.log(`   Mês de referência (moda): ${refMonth + 1}/${refYear} com ${maxCount} registros`);
            }
        }

        // === PASSO 8: Filtrar por mês de referência (igual manual) ===
        let filteredByMonth = processed;
        if (refMonth >= 0 && refYear > 0 && inicioCol) {
            const monthStart = new Date(Date.UTC(refYear, refMonth, 1, 0, 0, 0));
            const monthEnd = new Date(Date.UTC(refYear, refMonth + 1, 0, 23, 59, 59));
            const toleranceStart = new Date(monthStart);
            toleranceStart.setDate(toleranceStart.getDate() - 1);
            toleranceStart.setUTCHours(23, 0, 0, 0);

            filteredByMonth = processed.filter(row => {
                const inicioVal = row[inicioCol];
                if (typeof inicioVal !== 'number' || inicioVal <= 40000) {
                    const desc = String(row['Descrição'] || row['Cart. Futura'] || '').toLowerCase();
                    const isRelevant = desc.includes('setup') || desc.includes('troca') || desc.includes('preventiva');
                    const op = String(row['OP'] || '');
                    if (op === 'M03' || op === 'OP' || op === '-') return false;
                    return isRelevant;
                }
                const date = excelSerialToDate(inicioVal);
                if (date >= monthStart && date <= monthEnd) return true;
                if (date >= toleranceStart && date < monthStart) return true;
                return false;
            });

            filteredByMonth.sort((a, b) => {
                const valA = typeof a[inicioCol] === 'number' ? a[inicioCol] : 0;
                const valB = typeof b[inicioCol] === 'number' ? b[inicioCol] : 0;
                return valA - valB;
            });

            console.log(`   Linhas filtradas para ${refMonth + 1}/${refYear}: ${filteredByMonth.length}`);

            // === PASSO 8B: Extensão da última ordem até o fim do mês ===
            // Igual ao manual: estende a última ordem para preencher até o fim do mês
            // monthEnd já definido acima na linha do filtro de mês
            const terminoCol = headers.find(h => h.toLowerCase().includes('término') || h.toLowerCase().includes('termino'));

            if (terminoCol) {
                // Encontra a última ordem com data válida
                let lastOrderIndex = -1;
                for (let i = filteredByMonth.length - 1; i >= 0; i--) {
                    const row = filteredByMonth[i];
                    if (typeof row[inicioCol] === 'number' && row[inicioCol] > 40000) {
                        lastOrderIndex = i;
                        break;
                    }
                }

                if (lastOrderIndex >= 0) {
                    const lastRow = filteredByMonth[lastOrderIndex];
                    const terminoSerial = lastRow[terminoCol];
                    const currentTermino = excelSerialToDate(terminoSerial);
                    const produtividadePlan = parseFloat(lastRow['Produt. Plan t/h'] || '0');

                    if (currentTermino && currentTermino.getTime() !== monthEnd.getTime()) {
                        const originalDuration = (currentTermino.getTime() - excelSerialToDate(lastRow[inicioCol]).getTime());
                        const newDuration = (monthEnd.getTime() - excelSerialToDate(lastRow[inicioCol]).getTime());

                        if (originalDuration > 0 && newDuration > 0) {
                            const ratio = newDuration / originalDuration;

                            const prodAtual = parseFloat(String(lastRow['Qtde REAL (t)'] || lastRow['Prod. Acab. (t)'] || '0')) || 0;

                            // TRAVA DE SEGURANÇA: Limitar o ajuste a no máximo 5x (evitar erros bizarros)
                            const maxRatio = prodAtual < 1 ? 100 : 5;
                            const appliedRatio = Math.min(ratio, maxRatio);

                            const prodNova = prodAtual * appliedRatio;

                            const action = appliedRatio > 1 ? "Extensão" : "Corte (Trimming)";
                            const paramSinal = appliedRatio > 1 ? "+" : "";

                            console.log(`\n   📐 ${action} da última ordem (Proporcional):`);
                            console.log(`      ${lastRow['Descrição']} (${lastRow['Bitolas'] || lastRow['Bitola']})`);
                            console.log(`      Duração: ${(originalDuration / 3600000).toFixed(2)}h -> ${(newDuration / 3600000).toFixed(2)}h`);
                            console.log(`      Fator: ${ratio.toFixed(4)} (Aplicado: ${appliedRatio.toFixed(4)})`);
                            console.log(`      Produção: ${prodAtual.toFixed(2)} -> ${prodNova.toFixed(2)} t (${paramSinal}${(prodNova - prodAtual).toFixed(2)}t)`);

                            // Armazenar os valores originais para exibição no frontend (dashboard)
                            lastRow['_original_prod'] = prodAtual;
                            lastRow['_original_end_serial'] = terminoSerial;
                            lastRow['_trim_ratio'] = appliedRatio;

                            // Atualiza produção na linha raw
                            lastRow['Qtde REAL (t)'] = prodNova;
                            lastRow['Prod. Acab. (t)'] = prodNova;
                        }
                        // Atualiza término para fim do mês
                        const endOfMonthSerial = (monthEnd.getTime() / 86400000) + 25569;
                        lastRow[terminoCol] = endOfMonthSerial;
                        const terminoFinalCol = headers.find(h => h.toLowerCase().includes('final'));
                        if (terminoFinalCol) lastRow[terminoFinalCol] = endOfMonthSerial;
                        filteredByMonth[lastOrderIndex] = lastRow;
                    }
                }
            }
        }

        // === PASSO 9: Normalizar para o schema do Supabase (igual manual: App.tsx L1112-1121) ===
        // Schema: id, op, inicio, sap, bitola, producao_planejada, setup, descricao, revisao_arquivo, data_modificacao_arquivo, data_sincronizacao
        const records = filteredByMonth.map(row => ({
            // --- Colunas Principais ---
            sap: String(getColumnValue(row, ['Código SAP', 'Código SAP2', 'SAP', 'Codigo SAP2'], false) || '').trim(),
            op: String(getColumnValue(row, ['OP', 'Ordem'], false) || '').trim(),
            descricao: String(getColumnValue(row, ['Descrição', 'Descricao'], false) || '').trim(),
            bitola: String(getColumnValue(row, ['Bitolas', 'Bitola', 'BITOLA', 'Dimensão'], false) || '').trim(),
            familia: String(getColumnValue(row, ['Familia', 'Família'], false) || '').trim(),

            // --- Datas ---
            inicio: excelSerialToISO(getColumnValue(row, ['Início', 'Inicio', 'Data', 'Data Início'], false)),
            termino: excelSerialToISO(getColumnValue(row, ['Término', 'Termino', 'Data Término'], false)),
            termino_final: excelSerialToISO(getColumnValue(row, ['Termino Final', 'Término Final'], false)),
            dia_semana: String(getColumnValue(row, ['Dia da Semana'], false) || '').trim(),

            // --- Produção e Métricas ---
            producao_planejada: getColumnValue(row, ['Qtde REAL (t)', 'Prod. Acab. (t)', 'Producao', 'Produção', 'Qtd. Planejada', 'Quantidade'], true),
            producao_apontada: getColumnValue(row, ['Produção Apontada'], true),
            pecas: getColumnValue(row, ['Peças', 'Pecas'], true),
            massa_linear: getColumnValue(row, ['Massa Linear', 'Massa'], true),
            real_prev: getColumnValue(row, ['Real - Prev', 'Real Prev', 'Real - Prev.'], true),
            qtd_campanha: getColumnValue(row, ['Qtd Campanha'], true),

            // --- Produtividade ---
            produtividade: getColumnValue(row, ['Produtividade', 'Produtividade (t/h)', 'Produt. Plan t/h'], true),
            produtividade_nominal: getColumnValue(row, ['Produt. Nom t/h'], true),
            iu: getColumnValue(row, ['IU', 'IU (%)'], true),
            ie: getColumnValue(row, ['IE', 'IE (%)'], true),
            setup: getColumnValue(row, ['Setup', 'Tempo Setup'], true),
            atrasos_ganhos: getColumnValue(row, ['Atrasos/ Ganhos'], true),
            paradas_progr: getColumnValue(row, ['Paradas Progr', 'Paradas Programadas', 'Paradas Progr.'], true),

            // --- Matéria Prima e Outros ---
            tarugos: getColumnValue(row, ['Tarugos (t)'], true),
            aco: String(getColumnValue(row, ['Aço', 'Aco'], false) || '').trim(),
            codigo_mp: String(getColumnValue(row, ['Código MP', 'Codigo MP'], false) || '').trim(),
            descricao_mp: String(getColumnValue(row, ['Descrição MP'], false) || '').trim(),
            origem_tarugos: String(getColumnValue(row, ['Origem Tarugos'], false) || '').trim(),
            destino: String(getColumnValue(row, ['Destino'], false) || '').trim(),

            // --- Carteira ---
            carteira_m1: getColumnValue(row, ['Cart. M1'], true),
            carteira_futura: getColumnValue(row, ['Cart. Futura'], true),
            cart_atraso_m0: getColumnValue(row, ['Cart. Atraso+ M0', 'Cart. Atraso+M0'], true),
            prod_cart_total: getColumnValue(row, ['Prod - Cart. Total'], true),

            // --- Metadados e Ajustes Especiais ---
            _original_prod: row['_original_prod'] || null,
            _original_end_date: row['_original_end_serial'] ? excelSerialToDate(row['_original_end_serial']).toISOString().split('T')[0] : null,
            _trim_ratio: row['_trim_ratio'] || null,

            // --- Metadados do Arquivo ---
            revisao_arquivo: metadata.revision,
            data_modificacao_arquivo: metadata.modifiedAt.toISOString(),
            data_sincronizacao: new Date().toISOString()
        }));

        console.log(`\n🔄 Preparando ${records.length} registros para envio...`);

        // Mostra amostra
        if (records.length > 0) {
            console.log('   Amostra (1º registro):', JSON.stringify(records[0], null, 2));
            const totalProd = records.reduce((sum, r) => sum + (r.producao_planejada || 0), 0);
            console.log(`   Produção total calculada: ${totalProd.toFixed(1)} t`);
        }

        // === PASSO 10: Limpar e enviar ===
        console.log('🗑️  Limpando dados antigos...');
        const { error: delError } = await supabase.from('pcp_data').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (delError) console.error('   Erro ao limpar:', delError);

        const BATCH_SIZE = 100;
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from('pcp_data').insert(batch);

            if (error) {
                console.error(`❌ Erro no lote ${i}:`, error.message);
                // Log a primeira chave problemática
                if (error.message.includes('Could not find')) {
                    console.error('   Payload keys:', Object.keys(batch[0]));
                }
                errorCount += batch.length;
            } else {
                successCount += batch.length;
            }
        }

        console.log(`\n🎉 Upload PCP finalizado!`);
        console.log(`✅ Sucesso: ${successCount}`);
        console.log(`❌ Erros: ${errorCount}`);
        console.log(`📊 Arquivo: ${metadata.fileName} | Revisão: ${metadata.revision} | Mês: ${metadata.month}/${metadata.year}`);

    } catch (err) {
        console.error('❌ Erro fatal:', err);
    }
}

uploadPCP();
