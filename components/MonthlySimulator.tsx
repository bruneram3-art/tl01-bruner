import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
    FileText, Calendar, Boxes, Flame, Zap, Percent,
    Weight, BarChart3, Clock, UploadCloud, ChevronLeft, Target,
    Activity, TrendingUp, BarChart, Sliders, DollarSign, ArrowRight,
    CheckCircle2, Repeat, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, BarChart as RechartsBarChart, Bar, Cell
} from 'recharts';
import { MetricCard } from './MetricCard';
import { HealthIndicator } from './HealthIndicator';
import { SmartAnalyst } from './SmartAnalyst';
interface Props {
    metasMap: Record<string, any>;
    costs: {
        gas: number;
        energy: number;
        material: number;
    };
    onBack?: () => void;
}

const OEECard: React.FC<{ metrics: any }> = ({ metrics }) => {
    const oee = metrics.oee || { availability: 0, performance: 0, quality: 0, score: 0 };

    return (
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl mb-8">
            <div className="absolute top-0 right-0 p-10 opacity-5">
                <BarChart3 size={100} />
            </div>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight italic">Performance OEE</h3>
                        <p className="text-blue-200/50 text-[10px] font-black uppercase tracking-widest mt-1">Eficiência Global Experimental</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-5xl font-black text-blue-400 leading-none">{oee.score}%</span>
                        <span className="text-[9px] font-black text-blue-200/30 uppercase tracking-[0.2em] mt-2">Score Final</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-blue-200/50">
                            <span>Disponibilidade</span>
                            <span>{(oee.availability * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${oee.availability * 100}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-blue-200/50">
                            <span>Performance</span>
                            <span>{(oee.performance * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${oee.performance * 100}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-blue-200/50">
                            <span>Qualidade</span>
                            <span>{(oee.quality * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${oee.quality * 100}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ComparisonCard: React.FC<{
    title: string;
    plan: number;
    real: number;
    unit: string;
    inverse?: boolean;
}> = ({ title, plan, real, unit, inverse }) => {
    const delta = real - plan;
    const percent = plan > 0 ? (delta / plan) * 100 : 0;
    // Se inverse=true (ex: consumo), delta positivo é ruim
    const isBetter = inverse ? delta <= 0 : delta >= 0;

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-1 h-full ${isBetter ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">{title}</h4>
            <div className="flex items-end justify-between mb-3">
                <div>
                    <span className="text-2xl font-black text-slate-800 dark:text-white">
                        {real.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-xs font-bold text-slate-400 ml-1">{unit}</span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black shadow-sm ${isBetter ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {isBetter ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(percent).toFixed(1)}%
                </div>
            </div>
            <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="uppercase text-slate-400">Meta/Plano:</span>
                    <span className="text-slate-600 dark:text-slate-300">{plan.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {unit}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${isBetter ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(100, Math.max(10, (real / plan) * 100))}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export const MonthlySimulator: React.FC<Props> = ({ metasMap, costs, onBack }) => {
    const [pcpData, setPcpData] = useState<any[]>([]);
    const [fileName, setFileName] = useState<string>("");
    const [referenceDate, setReferenceDate] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Estados de Simulação (What-if)
    const [prodAdjust, setProdAdjust] = useState<number>(1); // Multiplicador de produtividade
    const [gasPriceAdjust, setGasPriceAdjust] = useState<number>(costs.gas || 2.5); // Preço do gás R$/m3

    // Estados para Comparativo (Realizado)
    const [realPcpData, setRealPcpData] = useState<any[]>([]);
    const [realFileName, setRealFileName] = useState<string>("");
    const [isComparing, setIsComparing] = useState(false);

    // Estados para o Drill-down
    const [selectedDetail, setSelectedDetail] = useState<{
        title: string;
        type: 'gas' | 'energy' | 'rm' | 'prod' | 'setup';
        unit: string;
        color: string;
        ops: Array<{ op: string, bitola: string, value: number, unit: string }>;
    } | null>(null);

    // --- Helpers Sincronizados com App.tsx ---
    const cleanNumber = (val: any): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const str = String(val).trim();
        if (!str) return 0;

        // Se tem vírgula, assume padrão BR (vírgula é decimal)
        if (str.includes(',')) {
            const cleaned = str.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
            const n = parseFloat(cleaned);
            return isNaN(n) ? 0 : n;
        }

        // Se tem apenas ponto, decide se é decimal ou milhar
        if (str.includes('.')) {
            const parts = str.split('.');
            if (parts.length > 2) {
                return parseFloat(str.replace(/\./g, '')) || 0;
            }
            const lastPart = parts[1];
            if (lastPart.length !== 3) {
                return parseFloat(str) || 0;
            } else {
                return parseFloat(str) || 0;
            }
        }

        const res = parseFloat(str.replace(/[^\d.-]/g, ''));
        return isNaN(res) ? 0 : res;
    };

    // REVERSÃO: Normalize simplificada para evitar problemas com caracteres especiais (pontos, parênteses)
    const normalize = (s: any) => String(s || "").toLowerCase().trim();

    const getColumnValue = useCallback((row: any, possibleNames: string[], isNumber: boolean = false): any => {
        if (!row) return isNumber ? 0 : '';

        // 1. Tentativa Exata
        for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null) {
                return isNumber ? cleanNumber(row[name]) : row[name];
            }
        }

        // 2. Tentativa Normalizada e Parcial
        const rowKeys = Object.keys(row);
        const normPossible = possibleNames.map(n => normalize(n)).filter(n => n.length > 0);

        for (const target of normPossible) {
            const foundKey = rowKeys.find(key => {
                const k = normalize(key);
                return k === target || k.includes(target) || target.includes(k);
            });

            if (foundKey && (row[foundKey] !== undefined && row[foundKey] !== null)) {
                return isNumber ? cleanNumber(row[foundKey]) : row[foundKey];
            }
        }

        return isNumber ? 0 : '';
    }, []);

    const excelSerialToDate = (serial: number): Date => {
        const utcDays = Math.floor(serial) - 25569;
        const utcValue = utcDays * 86400 * 1000;
        const date = new Date(utcValue);

        const fractionalDay = serial - Math.floor(serial);
        const totalSeconds = Math.round(fractionalDay * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        date.setUTCHours(hours, minutes, seconds);
        return date;
    };

    const processPcpFile = (file: File): Promise<{ data: any[], date: string }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = event.target?.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    console.log("Planilha lida. Abas:", workbook.SheetNames);

                    let sheetName = workbook.SheetNames[0];
                    const tlSheet = workbook.SheetNames.find(name => {
                        const n = name.toLowerCase();
                        return n === 'tl1' || n === 'tl01' || n === 'tl 1' || n === 'tl 01';
                    });

                    if (tlSheet) sheetName = tlSheet;
                    else {
                        const tlPartial = workbook.SheetNames.find(name => {
                            const n = name.toLowerCase();
                            return n.includes('tl1') || n.includes('tl01');
                        });
                        if (tlPartial) sheetName = tlPartial;
                    }

                    console.log("Aba selecionada:", sheetName);
                    let worksheet = workbook.Sheets[sheetName];
                    const rawArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
                    console.log("Total linhas brutas:", rawArray.length);

                    let headerRowIndex = -1;
                    for (let i = 0; i < Math.min(50, rawArray.length); i++) {
                        const row = rawArray[i];
                        if (row && Array.isArray(row) && row.some((cell: any) => {
                            const val = String(cell || '').toUpperCase().trim();
                            return val === 'OP' || val === 'ORDEM' || val === 'ORDEM DE PRODUCAO' || val === 'Nº OP';
                        })) {
                            headerRowIndex = i;
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                        console.warn("Cabeçalho não encontrado. Usando linha 0.");
                        headerRowIndex = 0;
                    }

                    const headers = rawArray[headerRowIndex].map((h: any, idx: number) => String(h || '').trim() || `Col_${idx}`);
                    const dataRows = rawArray.slice(headerRowIndex + 1).map((row: any[]) => {
                        const obj: any = {};
                        headers.forEach((header: string, idx: number) => {
                            if (header && !header.startsWith('Col_')) obj[header] = row[idx] ?? '';
                        });
                        return obj;
                    });

                    const processed = dataRows.filter((row: any) => {
                        const values = Object.values(row);
                        const hasData = values.some(val => val !== null && val !== undefined && String(val).trim() !== '');
                        const isNotTotal = !values.some(val =>
                            String(val).toLowerCase().includes('total') ||
                            String(val).toLowerCase().includes('soma')
                        );
                        return hasData && isNotTotal;
                    });

                    console.log("Linhas processadas (pré-filtro):", processed.length);

                    let refMonthKey = "";
                    const inicioCol = headers.find(h => {
                        const n = normalize(h);
                        return n.includes('inicio') || n.includes('início') || n.includes('data');
                    });

                    if (inicioCol && processed.length > 0) {
                        const monthCounts: Record<string, number> = {};
                        processed.forEach((row: any) => {
                            const inicioVal = row[inicioCol];
                            if (typeof inicioVal === 'number' && inicioVal > 40000) {
                                const dt = excelSerialToDate(inicioVal);
                                const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
                                monthCounts[key] = (monthCounts[key] || 0) + 1;
                            }
                        });

                        let maxCount = 0;
                        Object.entries(monthCounts).forEach(([k, c]) => {
                            if (c > maxCount) { maxCount = c; refMonthKey = k; }
                        });
                        console.log("Mês sugerido:", refMonthKey, "com", maxCount, "registros");
                    }

                    if (refMonthKey && inicioCol) {
                        const [y, m] = refMonthKey.split('-').map(Number);
                        const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
                        const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59));

                        const filtered = processed.filter((row: any) => {
                            const inicioVal = row[inicioCol];
                            const terminoColLocal = headers.find(h => normalize(h).includes('término') || normalize(h).includes('termino'));
                            const terminoVal = row[terminoColLocal];

                            if (typeof inicioVal !== 'number' || inicioVal <= 40000) return true;

                            const dInicio = excelSerialToDate(inicioVal);
                            const dTermino = typeof terminoVal === 'number' && terminoVal > 40000 ? excelSerialToDate(terminoVal) : null;

                            const startsInMonth = dInicio >= monthStart && dInicio <= monthEnd;
                            const overlapsMonthStart = dInicio < monthStart && dTermino && dTermino > monthStart;

                            return startsInMonth || overlapsMonthStart;
                        });

                        // Se o filtro retornar vazio por erro de lógica, retorna o processado normal
                        if (filtered.length > 0) {
                            console.log("Resultados filtrados por mês:", filtered.length);
                            resolve({ data: filtered, date: refMonthKey });
                            return;
                        }
                    }

                    resolve({ data: processed, date: refMonthKey || "" });
                } catch (err) {
                    console.error("Erro no processamento:", err);
                    reject(err);
                }
            };
            reader.onerror = (e) => {
                console.error("Erro no FileReader:", e);
                reject(e);
            };
            reader.readAsArrayBuffer(file);
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessing(true);
        try {
            const result = await processPcpFile(file);
            setPcpData(result.data);
            setReferenceDate(result.date);
            setFileName(file.name);
        } catch (err) {
            console.error(err);
            alert("Erro ao ler o arquivo PCP.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRealFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessing(true);
        try {
            const result = await processPcpFile(file);
            setRealPcpData(result.data);
            setRealFileName(file.name);
            setIsComparing(true);
        } catch (err) {
            console.error(err);
            alert("Erro ao ler o arquivo do Realizado.");
        } finally {
            setIsProcessing(false);
        }
    };

    const calculateMetrics = useCallback((data: any[], isWhatIf: boolean = false) => {
        let tp = 0, tg = 0, te = 0, trm = 0, crm = 0, ts = 0, tpr = 0, cpr = 0, tml = 0, cml = 0;
        let totalNominalProd = 0;
        let qualityOrders = 0;
        let setupCount = 0;
        let lastOrder: any = null;
        const bitolaVolumes: Record<string, number> = {};
        const bitolasSemMeta = new Set<string>();
        let dateErrors = 0;

        const detailGas: any[] = [];
        const detailEE: any[] = [];
        const detailRM: any[] = [];
        const detailProd: any[] = [];
        const detailSetup: any[] = [];

        data.forEach(row => {
            const prod = getColumnValue(row, ['Qtde REAL (t)', '_ai_producao', 'Prod. Acab. (t)', 'producao_planejada', 'Producao', 'Produção', 'Qtd. Planejada', 'Quantidade'], true);
            tp += prod;

            const inicio = getColumnValue(row, ['Início', 'Inicio'], true);
            const termino = getColumnValue(row, ['Término', 'termino'], true);
            if (inicio > 0 && termino > 0 && termino < inicio) dateErrors++;

            const s = getColumnValue(row, ['_ai_setup', 'Setup', 'Tempo Setup', 'Minutos Setup', 'SETUP (min)', 'TP SETUP'], true);
            ts += s;
            if (s > 0) setupCount++;

            let produtividade = getColumnValue(row, ['Produt. Plan t/h', 'Produt. Nom t/h', 'Produtividade (t/h)', 'Produtividade', '_ai_produtividade', 't/h', 'Prod/h', 'Ton/h', 'Produtividade Real'], true);
            if (isWhatIf) produtividade *= prodAdjust;

            if (produtividade > 0 && prod > 0) {
                const horas = prod / produtividade;
                tpr += prod;
                cpr += horas;
                totalNominalProd += prod;
            }

            const sap = String(getColumnValue(row, ['_ai_sap', 'Código SAP', 'Código SAP2', 'SAP', 'Codigo SAP2', 'Código', 'CODIGO', 'SKU']) || "").trim();
            const bitola = String(getColumnValue(row, ['Bitola', 'BITOLA', 'Bitolas', 'Dimensão', 'DIMENSAO', 'BIT']) || "").trim();
            if (bitola) bitolaVolumes[bitola] = (bitolaVolumes[bitola] || 0) + prod;

            let meta = metasMap[sap] || metasMap[sap.replace(/^0+/, '')] || metasMap[bitola] || metasMap[bitola.replace(',', '.')];
            if (!meta && bitola) {
                const fuzzyKey = Object.keys(metasMap).find(k => k && (k.includes(bitola) || bitola.includes(k)));
                if (fuzzyKey) meta = metasMap[fuzzyKey];
            }

            if (meta) {
                const gasMeta = getColumnValue(meta, ['gas'], true);
                const eeMeta = getColumnValue(meta, ['energia'], true);
                tg += prod * gasMeta;
                te += prod * eeMeta;
                const rm = getColumnValue(meta, ['rm'], true);
                if (rm > 0) { trm += rm; crm++; }

                // OEE Quality
                const rowRM = getColumnValue(row, ['RM', 'Rendimento', 'Rendimento Real'], true);
                if (rowRM >= (rm || 98.5)) qualityOrders++;
            } else if (prod > 0 && bitola) {
                bitolasSemMeta.add(bitola);
            }

            // Drill-down coletores
            const op = String(getColumnValue(row, ['OP', 'ORDEM', 'NR ORDEM', 'NR OP'], true) || "S/N");
            if (s > 0) detailSetup.push({ op, bitola, value: s / 60, unit: 'h' });
            if (meta && prod > 0) {
                detailGas.push({ op, bitola, value: getColumnValue(meta, ['gas'], true), unit: 'm³/t' });
                detailEE.push({ op, bitola, value: getColumnValue(meta, ['energia'], true), unit: 'kWh/t' });
                const rm = getColumnValue(meta, ['rm'], true);
                if (rm > 0) detailRM.push({ op, bitola, value: rm, unit: '%' });
            }
            if (produtividade > 0 && prod > 0) detailProd.push({ op, bitola, value: produtividade, unit: 't/h' });

            const terminoStr = getColumnValue(row, ['Término'], false);
            if (terminoStr) {
                const dt = typeof terminoStr === 'number' ? excelSerialToDate(terminoStr) : new Date(terminoStr);
                const tTime = dt.getTime();
                if (!isNaN(tTime) && (!lastOrder || tTime >= lastOrder.time)) {
                    lastOrder = { desc: bitola || 'Item', time: tTime, timeStr: dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) };
                }
            }
        });

        const totalSetupHoras = ts / 60;
        const setupGasPenalty = totalSetupHoras * 800;
        tg += setupGasPenalty;
        const totalGasCost = tg * gasPriceAdjust;

        return {
            totalProd: tp,
            avgGas: tp > 0 ? tg / tp : 0,
            avgEE: tp > 0 ? te / tp : 0,
            avgRM: crm > 0 ? trm / crm : 0,
            avgProd: cpr > 0 ? tpr / cpr : 0,
            totalSetup: totalSetupHoras,
            setupCount,
            gasCost: totalGasCost,
            setupGasPenalty,
            lastOrder,
            health: {
                score: data.length > 0 ? Math.max(0, 100 - ((bitolasSemMeta.size / data.length) * 100) - ((dateErrors / data.length) * 50)) : 100,
                issues: { missingMetas: bitolasSemMeta.size, dateErrors, totalOrders: data.length }
            },
            bitolaVolumes,
            oee: {
                availability: Math.min(1, (cpr / 720)),
                performance: totalNominalProd > 0 ? (tp / totalNominalProd) : 1,
                quality: data.length > 0 ? qualityOrders / data.length : 0,
                score: Math.round(((Math.min(1, (cpr / 720)) + (totalNominalProd > 0 ? tp / totalNominalProd : 1) + (qualityOrders / (data.length || 1))) / 3) * 100)
            },
            details: {
                gas: detailGas.sort((a, b) => b.value - a.value).slice(0, 15),
                energy: detailEE.sort((a, b) => b.value - a.value).slice(0, 15),
                rm: detailRM.sort((a, b) => a.value - b.value).slice(0, 15),
                prod: detailProd.sort((a, b) => b.value - a.value).slice(0, 15),
                setup: detailSetup.sort((a, b) => b.value - a.value).slice(0, 15)
            }
        };
    }, [metasMap, prodAdjust, gasPriceAdjust]);

    const metrics = useMemo(() => calculateMetrics(pcpData, true), [pcpData, calculateMetrics]);
    const realMetrics = useMemo(() => isComparing ? calculateMetrics(realPcpData, false) : null, [realPcpData, isComparing, calculateMetrics]);

    const isWhatIfModeActive = prodAdjust !== 1 || gasPriceAdjust !== (costs.gas || 2.5);

    const smartInsights = useMemo(() => {
        const insights: any[] = [];
        const volumes = metrics.bitolaVolumes || {};
        const sortedBitolas = Object.entries(volumes).sort((a, b) => (b[1] as number) - (a[1] as number));
        if (sortedBitolas.length > 0) {
            const [topBitola, topVol] = sortedBitolas[0];
            const percent = (Number(topVol) / metrics.totalProd) * 100;
            if (percent > 30) insights.push({ type: 'tip', text: `Atenção à Bitola ${topBitola}: Ela representa ${percent.toFixed(0)}% do plano.` });
        }
        if (metrics.totalSetup > 100) insights.push({ type: 'warning', text: `Alto tempo de setup previsto (${metrics.totalSetup.toFixed(0)}h).` });
        if (isWhatIfModeActive) insights.push({ type: 'tip', text: `Simulação ativa: Produtividade @ ${(((prodAdjust || 1) - 1) * 100).toFixed(0)}% | Gás @ R$ ${(gasPriceAdjust || 0).toFixed(2)}` });

        if (isComparing && realMetrics) {
            const deltaProd = ((metrics.totalProd / realMetrics.totalProd) - 1) * 100;
            if (Math.abs(deltaProd) > 10) {
                insights.push({
                    type: deltaProd > 0 ? 'positive' : 'warning',
                    text: `Diferença de Produção: Plano está ${Math.abs(deltaProd).toFixed(1)}% ${deltaProd > 0 ? 'acima' : 'abaixo'} do Realizado.`
                });
            }

            const setupDiff = realMetrics.setupCount - metrics.setupCount;
            if (setupDiff > 0) {
                insights.push({
                    type: 'warning',
                    text: `Impacto Operacional: Foram realizados ${setupDiff} setups a mais do que o planejado originalmente.`
                });
            }

            const gasDelta = ((realMetrics.avgGas / metrics.avgGas) - 1) * 100;
            if (gasDelta > 5) {
                insights.push({
                    type: 'warning',
                    text: `Consumo de Gás: O consumo real está ${gasDelta.toFixed(1)}% acima do planejado. Verifique se foi devido aos setups extras.`
                });
            }
        }
        return insights;
    }, [metrics, realMetrics, isComparing, prodAdjust, gasPriceAdjust, isWhatIfModeActive]);

    const waterfallData = useMemo(() => {
        if (!isComparing || !realMetrics) return [];

        const gasPrice = gasPriceAdjust || 2.5;
        const matPrice = costs.material || 4500;

        const setupDeltaHrs = realMetrics.totalSetup - metrics.totalSetup;
        const setupImpact = -(setupDeltaHrs * 800 * gasPrice);

        const realHrs = realMetrics.totalProd / (realMetrics.avgProd || 1);
        const planHrsAtRealVolume = realMetrics.totalProd / (metrics.avgProd || 1);
        const speedDeltaHrs = realHrs - planHrsAtRealVolume;
        const speedImpact = -(speedDeltaHrs * 1500 * gasPrice);

        const rmDelta = (realMetrics.avgRM - metrics.avgRM) / 100;
        const yieldImpact = rmDelta * realMetrics.totalProd * matPrice;

        const planCost = metrics.gasCost;

        const s1 = setupImpact >= 0 ? [planCost, planCost + setupImpact] : [planCost + setupImpact, planCost];
        const s2 = speedImpact >= 0 ? [planCost + setupImpact, planCost + setupImpact + speedImpact] : [planCost + setupImpact + speedImpact, planCost + setupImpact];
        const s3 = yieldImpact >= 0 ? [planCost + setupImpact + speedImpact, planCost + setupImpact + speedImpact + yieldImpact] : [planCost + setupImpact + speedImpact + yieldImpact, planCost + setupImpact + speedImpact];

        const totalImpact = setupImpact + speedImpact + yieldImpact;

        return [
            { name: 'Plano', value: [0, planCost], color: '#3b82f6' },
            { name: 'Setups', value: s1, color: setupImpact >= 0 ? '#10b981' : '#f43f5e', type: setupImpact >= 0 ? 'gain' : 'loss', realVal: setupImpact },
            { name: 'Velocidade', value: s2, color: speedImpact >= 0 ? '#10b981' : '#f43f5e', type: speedImpact >= 0 ? 'gain' : 'loss', realVal: speedImpact },
            { name: 'Rendimento', value: s3, color: yieldImpact >= 0 ? '#10b981' : '#f43f5e', type: yieldImpact >= 0 ? 'gain' : 'loss', realVal: yieldImpact },
            { name: 'Real', value: [0, planCost + totalImpact], color: '#1e293b' }
        ];
    }, [metrics, realMetrics, isComparing, gasPriceAdjust, costs.material]);

    const optimizationSuggestions = useMemo(() => {
        const bitolasPos: Record<string, number[]> = {};
        pcpData.forEach((row, idx) => {
            const b = String(getColumnValue(row, ['Bitola'], true) || "").trim();
            if (b) {
                if (!bitolasPos[b]) bitolasPos[b] = [];
                bitolasPos[b].push(idx);
            }
        });

        const suggestions: any[] = [];
        let setupsSaved = 0;

        // Lógica de Sequenciamento Inteligente (Matriz de Transição)
        const bitolaNames = Object.keys(bitolasPos);
        const sortedSequence: string[] = [];
        if (bitolaNames.length > 0) {
            let current = bitolaNames[0];
            sortedSequence.push(current);
            const remaining = bitolaNames.slice(1);

            while (remaining.length > 0) {
                let bestIdx = 0;
                let minDiff = Infinity;
                const currV = parseFloat(current.replace(/[^\d.]/g, '')) || 0;

                for (let i = 0; i < remaining.length; i++) {
                    const nextV = parseFloat(remaining[i].replace(/[^\d.]/g, '')) || 0;
                    const diff = Math.abs(currV - nextV);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestIdx = i;
                    }
                }
                current = remaining.splice(bestIdx, 1)[0];
                sortedSequence.push(current);
            }
        }

        Object.entries(bitolasPos).forEach(([bitola, positions]) => {
            if (positions.length > 1) {
                let gaps = 0;
                for (let i = 0; i < positions.length - 1; i++) {
                    if (positions[i + 1] - positions[i] > 1) gaps++;
                }
                if (gaps > 0) {
                    setupsSaved += gaps;
                    suggestions.push({
                        bitola,
                        text: `Ordens de ${bitola} estão dispersas. O agrupamento economizaria ${gaps} setups.`,
                        priority: gaps
                    });
                }
            }
        });

        if (sortedSequence.length > 3) {
            suggestions.push({
                bitola: "SEQUÊNCIA",
                text: `Ordem recomendada para reduzir impacto de transição: ${sortedSequence.slice(0, 5).join(' → ')}...`,
                priority: 10
            });
        }

        const gasSaved = setupsSaved * 800 * 1.5; // 1.5h de setup médio estimado
        return {
            list: suggestions.slice(0, 3),
            totalSaved: setupsSaved,
            financialSaving: gasSaved * (gasPriceAdjust || 2.5)
        };
    }, [pcpData, gasPriceAdjust]);

    const chartData = useMemo(() => {
        const grouped: Record<string, any> = {};
        const dateKeywords = ['Início', 'Inicio', 'Data', 'ENTREGA', 'FIM', 'PREVISAO', 'PREVISÃO', 'INICIADO', 'TERMINADO'];
        pcpData.forEach(row => {
            let d = getColumnValue(row, dateKeywords, false);
            let dateKey = "S/D";
            if (typeof d === 'number') {
                const dt = excelSerialToDate(d);
                dateKey = String(dt.getDate()).padStart(2, '0');
            }
            if (!grouped[dateKey]) grouped[dateKey] = { day: dateKey, prod: 0 };
            let prod = getColumnValue(row, ['Qtde REAL (t)', '_ai_producao', 'Prod. Acab. (t)', 'producao_planejada', 'Producao', 'Produção', 'Qtd. Planejada', 'Quantidade'], true);
            grouped[dateKey].prod += prod;
        });
        return Object.values(grouped).sort((a, b) => parseInt(a.day) - parseInt(b.day));
    }, [pcpData]);

    const monthLabel = useMemo(() => {
        if (!referenceDate) return "";
        const [y, m] = referenceDate.split('-');
        const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        return `${months[parseInt(m) - 1]} / ${y}`;
    }, [referenceDate]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
            <div className="max-w-[1600px] mx-auto space-y-8">
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-6">
                        <button onClick={() => onBack?.()} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-500">
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Simulador de PCP Mensal</h1>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{monthLabel || "Aguardando Importação"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        {pcpData.length > 0 && (
                            <button
                                onClick={() => {
                                    const wsData = [
                                        ['Relatório de Simulação PCP', monthLabel],
                                        [''],
                                        ['Métrica', 'Planejado', 'Realizado', 'Desvio %'],
                                        ['Produção (t)', metrics.totalProd, realMetrics?.totalProd || '-', isComparing ? (((realMetrics?.totalProd || 0) / metrics.totalProd) - 1) * 100 : '-'],
                                        ['Gás (m³/t)', metrics.avgGas, realMetrics?.avgGas || '-', isComparing ? (((realMetrics?.avgGas || 0) / metrics.avgGas) - 1) * 100 : '-'],
                                        ['Setups (#)', metrics.setupCount, realMetrics?.setupCount || '-', isComparing ? realMetrics.setupCount - metrics.setupCount : '-'],
                                        [''],
                                        ['Impactos Financeiros (R$)'],
                                        ['Setup Extra', waterfallData[1]?.realVal || 0],
                                        ['Perda Velocidade', waterfallData[2]?.realVal || 0],
                                        ['Perda Rendimento', waterfallData[3]?.realVal || 0],
                                        [''],
                                        ['Sugestões de Otimização'],
                                        ...optimizationSuggestions.list.map(s => [s.bitola, s.text])
                                    ];
                                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, "Resumo");
                                    XLSX.writeFile(wb, `Relatorio_PCP_${monthLabel.replace(/\s/g, '')}.xlsx`);
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                            >
                                <UploadCloud size={16} className="rotate-180" />
                                Exportar Relatório
                            </button>
                        )}
                        {pcpData.length > 0 && (
                            <div className="flex items-center gap-4 py-2 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-black uppercase text-slate-400">Dados:</span>
                                <HealthIndicator score={metrics.health.score} issues={metrics.health.issues} />
                            </div>
                        )}
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end mr-4">
                                <span className="text-[10px] font-black uppercase text-blue-500 tracking-tighter mb-1">PCP Base (Plano)</span>
                                <input type="file" id="sim-upload" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                                <label htmlFor="sim-upload" className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${pcpData.length > 0 ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-900 text-white'}`}>
                                    <FileText size={14} />
                                    <span>{fileName ? fileName.slice(0, 15) + '...' : 'Importar Plano'}</span>
                                </label>
                            </div>

                            {pcpData.length > 0 && (
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black uppercase text-emerald-500 tracking-tighter mb-1">Opcional: Importar Realizado</span>
                                    <input type="file" id="real-upload" className="hidden" accept=".xlsx,.xls" onChange={handleRealFileUpload} />
                                    <label htmlFor="real-upload" className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${isComparing ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                        <CheckCircle2 size={14} />
                                        <span>{realFileName ? realFileName.slice(0, 15) + '...' : 'Comparar Real'}</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {pcpData.length > 0 ? (
                    <>
                        {/* Painel de Controles de Simulação (What-if) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                                    <Sliders size={20} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-black uppercase text-slate-500">Produtividade Plan.</span>
                                        <span className={`text-xs font-black ${prodAdjust >= 1 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {prodAdjust === 1 ? 'Original' : `${((prodAdjust - 1) * 100).toFixed(0)}%`}
                                        </span>
                                    </div>
                                    <input
                                        type="range" min="0.5" max="1.5" step="0.05" value={prodAdjust}
                                        onChange={(e) => setProdAdjust(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                                    <DollarSign size={20} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-black uppercase text-slate-500">Preço Gás Natural</span>
                                        <span className="text-xs font-black text-amber-500">R$ {gasPriceAdjust.toFixed(2)}/m³</span>
                                    </div>
                                    <input
                                        type="range" min="1.0" max="5.0" step="0.1" value={gasPriceAdjust}
                                        onChange={(e) => setGasPriceAdjust(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-blue-600 rounded-2xl p-4 text-white shadow-lg">
                                <div className="flex items-center gap-3">
                                    <Activity size={20} className="text-blue-200" />
                                    <div>
                                        <span className="text-[10px] font-black uppercase opacity-60 block">Custo Gás Previsto</span>
                                        <span className="text-xl font-black">R$ {metrics.gasCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>
                                {isWhatIfModeActive && (
                                    <button
                                        onClick={() => { setProdAdjust(1); setGasPriceAdjust(costs.gas || 2.5); }}
                                        className="bg-white/20 hover:bg-white/30 text-xs font-bold px-3 py-1 rounded-lg transition-colors"
                                    >
                                        Limpar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Banner Principal */}
                        {/* ... (anterior) */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                            {/* ... */}
                            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                                <Calendar size={120} />
                            </div>
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                        <Target className="text-blue-300" size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-3xl font-black tracking-tight uppercase mb-1">Simulação: {monthLabel}</h2>
                                        <p className="text-blue-100/70 text-[10px] font-black tracking-[0.2em] uppercase">Arquivo: {fileName} • {pcpData.length} ordens identificadas</p>
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md border border-white/10 px-6 py-4 rounded-2xl hidden md:block text-right">
                                    <span className="text-[10px] font-black uppercase text-blue-200 block mb-1">Previsão de Produção</span>
                                    <div className="flex items-baseline gap-2 justify-end">
                                        <span className="text-4xl font-black">{metrics.totalProd.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                                        <span className="text-xl font-bold opacity-60">t</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Analista Inteligente */}
                        <SmartAnalyst insights={smartInsights} />

                        {/* Painel de OEE */}
                        <OEECard metrics={metrics} />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
                            <MetricCard
                                title="Produção Total"
                                value={metrics.totalProd.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                unit="t"
                                icon={<Boxes className="text-blue-600" />}
                                color="text-blue-600"
                                indicator={metrics.lastOrder ? {
                                    label: "Último Material",
                                    value: `${metrics.lastOrder.desc} @ ${metrics.lastOrder.timeStr}`,
                                    color: "text-blue-600"
                                } : undefined}
                            />
                            <MetricCard
                                title="Consumo Gás"
                                value={metrics.avgGas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                unit="m³/t"
                                inverse
                                icon={<Flame className="text-orange-600" />}
                                color="text-orange-600"
                                onClick={() => setSelectedDetail({
                                    title: "Auditoria de Gás Natural",
                                    type: 'gas',
                                    unit: 'm³/t',
                                    color: 'bg-orange-500',
                                    ops: metrics.details.gas
                                })}
                            />
                            <MetricCard
                                title="Consumo Energia"
                                value={metrics.avgEE.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                unit="kWh/t"
                                inverse
                                icon={<Zap className="text-yellow-600" />}
                                color="text-amber-600"
                                onClick={() => setSelectedDetail({
                                    title: "Auditoria de Energia Elétrica",
                                    type: 'energy',
                                    unit: 'kWh/t',
                                    color: 'bg-amber-500',
                                    ops: metrics.details.energy
                                })}
                            />
                            <MetricCard
                                title="Rendimento Med."
                                value={metrics.avgRM.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                unit="%"
                                icon={<Target className="text-emerald-600" />}
                                color="text-emerald-600"
                                onClick={() => setSelectedDetail({
                                    title: "Piores Rendimentos do Mês",
                                    type: 'rm',
                                    unit: '%',
                                    color: 'bg-emerald-500',
                                    ops: metrics.details.rm
                                })}
                            />
                            <MetricCard title="Massa Linear" value={metrics.avgML.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} unit="kg/m" icon={<Weight className="text-slate-800" />} color="text-slate-800" />
                            <MetricCard
                                title="Produtividade"
                                value={metrics.avgProd.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                unit="t/h"
                                icon={<BarChart3 className="text-purple-600" />}
                                color="text-purple-600"
                                onClick={() => setSelectedDetail({
                                    title: "Auditoria de Produtividade",
                                    type: 'prod',
                                    unit: 't/h',
                                    color: 'bg-purple-500',
                                    ops: metrics.details.prod
                                })}
                            />
                            <MetricCard
                                title="Setup Total"
                                value={metrics.totalSetup.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                unit="h"
                                icon={<Clock className="text-indigo-600" />}
                                color="text-indigo-600"
                                indicator={{
                                    label: "Impacto (+800m³/h)",
                                    value: `+${(metrics.setupGasPenalty || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m³`,
                                    color: "text-indigo-600"
                                }}
                                onClick={() => setSelectedDetail({
                                    title: "Impacto de Setup e Paradas",
                                    type: 'setup',
                                    unit: 'h',
                                    color: 'bg-indigo-500',
                                    ops: metrics.details.setup
                                })}
                            />
                        </div>

                        {/* Seção de Comparativo Plano vs Real */}
                        {isComparing && realMetrics && (
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border-2 border-emerald-100 dark:border-emerald-900/30">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-600">
                                            <Repeat size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Comparativo: Plano vs Realizado</h3>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Comparando {fileName} com {realFileName}</p>
                                        </div>
                                    </div>
                                    <div className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                        Modo Comparativo Ativo
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <ComparisonCard
                                        title="Produção Total"
                                        plan={metrics.totalProd}
                                        real={realMetrics.totalProd}
                                        unit="t"
                                        inverse={false}
                                    />
                                    <ComparisonCard
                                        title="Rendimento Médio"
                                        plan={metrics.avgRM}
                                        real={realMetrics.avgRM}
                                        unit="%"
                                        inverse={false}
                                    />
                                    <ComparisonCard
                                        title="Consumo de Gás"
                                        plan={metrics.avgGas}
                                        real={realMetrics.avgGas}
                                        unit="m³/t"
                                        inverse={true}
                                    />
                                    <ComparisonCard
                                        title="Setup Total"
                                        plan={metrics.totalSetup}
                                        real={realMetrics.totalSetup}
                                        unit="h"
                                        inverse={true}
                                    />
                                </div>

                                {/* Gráfico Waterfall Financeiro */}
                                <div className="mt-12 bg-slate-50 dark:bg-slate-800/30 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                                            <TrendingUp size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Onde a performance "vazou"? (R$)</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Impacto financeiro por fator de desvio</p>
                                        </div>
                                    </div>
                                    <div className="h-[350px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsBarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                                                <Tooltip
                                                    cursor={{ fill: 'transparent' }}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const d = payload[0].payload;
                                                            return (
                                                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700">
                                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{d.name}</p>
                                                                    <p className={`text-xl font-black ${d.type === 'loss' ? 'text-rose-500' : d.type === 'gain' ? 'text-emerald-500' : 'text-blue-500'}`}>
                                                                        {d.type === 'loss' ? '' : d.type === 'gain' ? '+' : ''} R$ {(d.realVal || (Array.isArray(d.value) ? d.value[1] - d.value[0] : d.value)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                                                    </p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="value" strokeWidth={0}>
                                                    {waterfallData.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </RechartsBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-3 gap-8 mt-8 pb-4">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impacto Setup</p>
                                            <p className={`text-lg font-black ${waterfallData[1]?.type === 'loss' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {waterfallData[1]?.type === 'loss' ? '-' : '+'} R$ {waterfallData[1]?.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Eficiência de Prod.</p>
                                            <p className={`text-lg font-black ${waterfallData[2]?.type === 'loss' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {waterfallData[2]?.type === 'loss' ? '-' : '+'} R$ {waterfallData[2]?.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rendimento (RM)</p>
                                            <p className={`text-lg font-black ${waterfallData[3]?.type === 'loss' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {waterfallData[3]?.type === 'loss' ? '-' : '+'} R$ {waterfallData[3]?.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Otimizador de Mix */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-5">
                                <Activity size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-10">
                                    <div className="flex items-center gap-6">
                                        <div className="p-5 bg-blue-500/20 rounded-2xl text-blue-400">
                                            <Zap size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black uppercase tracking-tight">Otimizador de Mix (IA)</h3>
                                            <p className="text-blue-200/50 text-xs font-bold uppercase tracking-widest mt-1">Algoritmo de Agrupamento por Bitola</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Economia Máxima Estimada</p>
                                        <p className="text-4xl font-black text-emerald-400">R$ {optimizationSuggestions.financialSaving.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {optimizationSuggestions.list.map((s: any, i: number) => (
                                        <div key={i} className="bg-white/5 hover:bg-white/10 p-8 rounded-3xl border border-white/10 transition-all border-l-4 border-l-blue-500">
                                            <p className="text-[10px] font-black uppercase text-blue-400 mb-2">Bitola: {s.bitola}</p>
                                            <p className="text-sm font-bold text-slate-200 mb-6 leading-relaxed">{s.text}</p>
                                            <div className="flex items-center gap-3 text-xs font-black text-emerald-400 uppercase">
                                                <div className="p-1.5 bg-emerald-400/10 rounded-lg">
                                                    <CheckCircle2 size={16} />
                                                </div>
                                                Ganho de Eficiência
                                            </div>
                                        </div>
                                    ))}
                                    {optimizationSuggestions.list.length === 0 && (
                                        <div className="md:col-span-3 py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-sm bg-white/5 rounded-3xl border border-white/5">
                                            O mix atual de {monthLabel} já está otimizado com base na sequência do Excel.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Painel Lateral de Drill-down (Auditoria) */}
                        {selectedDetail && (
                            <div className="fixed inset-0 z-[100] flex justify-end">
                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedDetail(null)} />
                                <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-right duration-300 border-l border-slate-100 dark:border-slate-800 flex flex-col">
                                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 ${selectedDetail.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                                                <Target size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase leading-none">{selectedDetail.title}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Detalhamento por Ordem de Produção (Top 15)</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setSelectedDetail(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 uppercase font-black text-[10px] tracking-widest">Fechar</button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                                        {selectedDetail.ops.map((item, idx) => (
                                            <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-blue-200 transition-all">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OP: {item.op}</span>
                                                    <span className="font-black text-slate-800 dark:text-white text-sm uppercase">{item.bitola}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-slate-900 dark:text-white">
                                                        {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">{item.unit}</span>
                                                </div>
                                            </div>
                                        ))}

                                        {selectedDetail.type === 'gas' && (
                                            <div className="mt-8 p-6 bg-orange-50 dark:bg-orange-500/10 rounded-3xl border border-orange-100 dark:border-orange-500/20">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-orange-500 rounded-lg text-white">
                                                        <Flame size={16} />
                                                    </div>
                                                    <h4 className="text-xs font-black text-orange-800 dark:text-orange-400 uppercase">Consideração de Gás</h4>
                                                </div>
                                                <p className="text-[11px] leading-relaxed text-orange-700/80 dark:text-orange-300/60 font-medium">
                                                    Os valores acima são unitários por OP. O consumo consolidado total também considera a penalidade de **800 m³/h** aplicada aos períodos de setup identificados.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                        <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest italic">
                                            As metas de auditoria são baseadas nos cadastros técnicos de engengenharia.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase flex items-center gap-2">
                                        <BarChart3 className="text-blue-500" /> Curva de Produção Diária
                                    </h3>
                                </div>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Area type="monotone" dataKey="prod" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSim)" name="Produção (t)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3 mb-6">
                                    <Activity className="text-indigo-500" /> Ordens do Mês
                                </h3>
                                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar text-xs">
                                    {pcpData.slice(0, 50).map((row, idx) => (
                                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-blue-200 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getColumnValue(row, ['OP', 'ORDEM', 'NR ORDEM', 'LOTE', 'NR OP', 'Nº OP', 'PROD'])}</span>
                                                <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{getColumnValue(row, ['Bitola', 'Dimensão'])} - {getColumnValue(row, ['Qualidade', 'Aço'])}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-slate-800 dark:text-white">{getColumnValue(row, ['Qtde REAL (t)', '_ai_producao', 'Prod. Acab. (t)', 'producao_planejada', 'Producao', 'Produção', 'Qtd. Planejada', 'Quantidade'], true).toLocaleString('pt-BR')} <span className="text-[9px] text-slate-400">t</span></p>
                                            </div>
                                        </div>
                                    ))}
                                    {pcpData.length > 50 && (
                                        <p className="text-center text-[10px] font-bold text-slate-400 uppercase pt-4 tracking-widest">+ {pcpData.length - 50} ordens ocultas</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <label
                        htmlFor="sim-upload"
                        className="bg-white dark:bg-slate-900 rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/10 transition-all group"
                    >
                        <div className="w-24 h-24 bg-blue-50 dark:bg-blue-500/10 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                            <UploadCloud size={48} className="text-blue-500" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-4">Pronto para simular?</h2>
                        <p className="text-slate-500 max-w-md mx-auto mb-12 text-lg">
                            Clique aqui para fazer o upload de um arquivo PCP e iniciar a análise.
                        </p>
                        <div className="flex items-center gap-8 text-slate-400">
                            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest"><CheckCircle size={14} className="text-emerald-500" /> Cálculo Automático</div>
                            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest"><CheckCircle size={14} className="text-emerald-500" /> Gráficos de Produção</div>
                            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest"><CheckCircle size={14} className="text-emerald-500" /> Sem Impacto no Banco</div>
                        </div>
                    </label>
                )}
            </div>
        </div>
    );
};

const CheckCircle = ({ size, className }: { size: number, className: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);
