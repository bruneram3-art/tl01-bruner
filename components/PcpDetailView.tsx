import React, { useState, useMemo, useEffect } from 'react';
import {
    Boxes, Flame, Zap, Activity, Clock, BarChart4,
    Search, Filter, Download, ArrowLeft, MoreHorizontal,
    ChevronDown, ChevronUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { DiagnosticPanel } from './DiagnosticPanel';
import { DataIntegrityPanel } from './DataIntegrityPanel';

interface PcpDetailViewProps {
    data: any[];
    fileName: string;
    onBack: () => void;
    totals: {
        totalProducao: number;
        avgGas: number;
        avgEE: number;
        avgProd: number;
        totalSetupHoras: number;
        avgUtilizacao?: number;
    };
    metasMap?: Record<string, any>; // Mapa de metas opcional
}

// Lista EXATA das 32 colunas esperadas na ordem correta
const EXPECTED_COLUMNS = [
    'OP',
    'Código SAP2',
    'Descrição',
    'Familia',
    'Bitolas',
    'Destino',
    'Produt. Nom t/h',
    'IU (%)',
    'IE (%)',
    'Produt. Plan t/h',
    'Prod. Acab. (t)',
    'Tarugos (t)',
    'Qtde REAL (t)',
    'Cart. Atraso+ M0',
    'Cart. M1',
    'Cart. Futura',
    'Prod - Cart. Total',
    'Qtd Campanha',
    'Setup',
    'Atrasos/ Ganhos',
    'Paradas Progr',
    'Produção Apontada',
    'Real - Prev',
    'Dia da Semana',
    'Início',
    'Término',
    'Termino Final',
    'Peças',
    'Aço',
    'Código MP',
    'Descrição MP',
    'Origem Tarugos',
    'Meta Gás (m³)', // Coluna calculada
    'Meta Energia (kWh)', // Coluna calculada
    'Gás Natural (m³)',
    'Energia Elétrica (kWh)',
    'Rendimento (%)',
    'Utilização (%)',
    'Produtividade (t/h)'
];

export const PcpDetailView: React.FC<PcpDetailViewProps> = ({ data, fileName, onBack, totals, metasMap }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [diagnostic, setDiagnostic] = useState({
        metasCount: 0,
        pcpCount: 0,
        metasMapKeysCount: 0,
        sampleMetasKeys: [] as string[],
        samplePcpSaps: [] as string[],
        samplePcpBitolas: [] as string[],
        sampleMetasValues: [] as string[],
        matchTestResult: ""
    });

    // Lista de metas faltantes para exportação
    const [missingMetas, setMissingMetas] = useState<any[]>([]);

    const handleExportMissing = () => {
        if (missingMetas.length === 0) {
            alert("Não há metas faltantes para exportar!");
            return;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(missingMetas);

        // Ajusta largura das colunas
        const wscols = [
            { wch: 15 }, // SAP
            { wch: 20 }, // Bitola
            { wch: 15 }, // Familia
            { wch: 40 }, // Descricao
            { wch: 15 }, // Meta Gas
            { wch: 15 }, // Meta Energia
            { wch: 15 }  // Rendimento
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Metas Faltantes");
        XLSX.writeFile(wb, "Metas_Faltantes_Preencher.xlsx");
    };

    // Mapa de metas normalizado para facilitar busca
    const normalizedMetasMap = useMemo(() => {
        if (!metasMap) return {};
        const map: Record<string, any> = {};
        Object.values(metasMap).forEach((meta: any) => {
            // Adiciona por SAP
            const sap = String(meta.sap || meta.SAP || "").trim();
            if (sap) {
                map[sap] = meta;
                map[sap.toUpperCase()] = meta;
                const noZeros = sap.replace(/^0+/, '');
                if (noZeros !== sap) {
                    map[noZeros] = meta;
                }
            }

            // Adiciona por Bitola
            const bitola = String(meta.bitola || meta.BITOLA || "").trim();
            if (bitola) {
                map[bitola] = meta;
                map[bitola.toUpperCase()] = meta;
                const bitolaWithDot = bitola.replace(',', '.');
                if (bitolaWithDot !== bitola) {
                    map[bitolaWithDot] = meta;
                }
            }
        });
        return map;
    }, [metasMap]);

    // Debug simplificado para performance
    useEffect(() => {
        if (!data || data.length === 0) return;

        let matchCount = 0;
        let totalMetas = 0;
        const missing: any[] = [];
        const seenMissing = new Set<string>();

        if (metasMap) {
            data.forEach(row => {
                const sapKey = Object.keys(row).find(k => {
                    const normalized = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return k === 'Código SAP2' || k === 'Codigo SAP2' || k === 'Código' || k === 'Codigo' || (normalized.includes('sap') && !normalized.includes('mp'));
                });
                const sap = sapKey ? String(row[sapKey] || "").trim() : "";

                const bitolaKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'bitolas' || k.toLowerCase().trim() === 'bitola');
                const bitola = bitolaKey ? String(row[bitolaKey] || "").trim() : "";
                const descricao = row['Descrição'] || row['Descricao'] || '';

                let found = normalizedMetasMap[sap] || normalizedMetasMap[sap.replace(/^0+/, '')];

                if (!found && bitola) {
                    found = normalizedMetasMap[bitola] || normalizedMetasMap[bitola.replace(',', '.')];
                    if (!found && metasMap) {
                        const hasFuzzy = Object.keys(metasMap).some(k =>
                            k && (k.includes(bitola) || bitola.includes(k))
                        );
                        if (hasFuzzy) found = true;
                    }
                }

                if (found) {
                    matchCount++;
                } else {
                    if (sap || bitola) {
                        const opKey = Object.keys(row).find(k => k.toLowerCase() === 'op');
                        const op = opKey ? String(row[opKey] || "") : "";
                        const normalize = (s: string) => String(s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                        if (!normalize(sap).includes('m03') && !normalize(op).includes('m03')) {
                            const key = sap || bitola;
                            if (!seenMissing.has(key)) {
                                seenMissing.add(key);
                                const prodRealKey = Object.keys(row).find(k =>
                                    (k.toLowerCase().includes('qtde') || k.toLowerCase().includes('real')) &&
                                    k.toLowerCase().includes('(t)')
                                );
                                const prodVal = prodRealKey ? (parseFloat(String(row[prodRealKey]).replace(',', '.')) || 0) : 0;

                                missing.push({
                                    'Código SAP2': sap,
                                    'Bitola': bitola,
                                    'Família': row['Familia'] || '',
                                    'Descrição': descricao,
                                    'Produção (t)': prodVal.toFixed(3),
                                    'Meta Gás': '',
                                    'Meta Energia': '',
                                    'Rendimento': ''
                                });
                            }
                        }
                    }
                }
            });
            totalMetas = data.length;
        }

        const successRate = totalMetas > 0 ? ((matchCount / totalMetas) * 100).toFixed(1) : "0.0";
        setMissingMetas(missing);

        setDiagnostic({
            metasCount: metasMap ? Object.keys(metasMap).length : 0,
            pcpCount: data.length,
            metasMapKeysCount: metasMap ? Object.keys(metasMap).length : 0,
            sampleMetasKeys: [],
            samplePcpSaps: [],
            samplePcpBitolas: [],
            sampleMetasValues: [],
            matchTestResult: `✅ DETECTADO NO BANCO!\n\nTaxa de Sucesso: ${matchCount} de ${totalMetas} linhas (${successRate}%)\n\nItens Faltantes: ${missing.length}`
        });

    }, [data, metasMap, normalizedMetasMap]);

    const ALWAYS_SHOW_COLUMNS = [
        'Meta Gás (m³)', 'Meta Energia (kWh)', 'Gás Natural (m³)', 'Energia Elétrica (kWh)',
        'Rendimento (%)', 'Utilização (%)', 'Produtividade (t/h)'
    ];

    const allColumns = useMemo(() => {
        if (data.length === 0) return EXPECTED_COLUMNS;
        const actualColumns = Object.keys(data[0]);
        return EXPECTED_COLUMNS.filter(col =>
            actualColumns.some(ac => ac === col) || ALWAYS_SHOW_COLUMNS.includes(col)
        );
    }, [data]);

    // Helpers
    const cleanNumber = (val: any) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        if (typeof val === 'string' && !val.includes(',') && !isNaN(parseFloat(val))) {
            return parseFloat(val);
        }
        let str = String(val).replace(/[^\d,.-]/g, '').trim();
        str = str.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    };

    const excelSerialToDate = (serial: number): string => {
        const utcDays = Math.floor(serial) - 25569;
        const utcValue = utcDays * 86400 * 1000;
        const date = new Date(utcValue);
        const fractionalDay = serial - Math.floor(serial);
        const totalSeconds = Math.round(fractionalDay * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        const hoursStr = String(hours).padStart(2, '0');
        const minutesStr = String(minutes).padStart(2, '0');
        return `${day}/${month}/${year}, ${hoursStr}:${minutesStr}`;
    };

    const isDateColumn = (colName: string): boolean => {
        const dateColumns = ['início', 'inicio', 'término', 'termino', 'termino final', 'data', 'date'];
        return dateColumns.some(dc => colName.toLowerCase().includes(dc));
    };

    const isCodeColumn = (colName: string): boolean => {
        const codeColumns = ['op', 'código sap', 'codigo sap', 'código mp', 'codigo mp'];
        return codeColumns.some(cc => colName.toLowerCase().includes(cc));
    };

    const numberToWeekday = (num: number): string => {
        const weekdays = ['', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        if (num >= 1 && num <= 7) return weekdays[num];
        return String(num);
    };

    // Formata o valor da célula para exibição
    const formatCellValue = (value: any, colName: string = '', row: any) => {
        if (colName === 'Meta Gás (m³)' || colName === 'Meta Energia (kWh)' ||
            colName === '_calc_meta_gas' || colName === '_calc_meta_energia' ||
            colName === 'Rendimento (%)' || colName === 'Massa Linear') {

            if (!metasMap || Object.keys(metasMap).length === 0) {
                return <span title="Nenhuma meta carregada no sistema!" className="text-red-400 font-bold cursor-help">ERR</span>;
            }

            const sapKey = Object.keys(row).find(k => {
                const normalized = String(k).toLowerCase().trim();
                return k === 'Código SAP2' || k === 'Codigo SAP2' || k === 'Código' || k === 'Codigo' ||
                    (normalized.includes('sap') && !normalized.includes('mp') && !normalized.includes('descricao'));
            });
            const sap = sapKey ? String(row[sapKey] || "").trim() : "";

            const bitolaKey = Object.keys(row).find(k => {
                const normalized = String(k).toLowerCase().trim();
                return normalized === 'bitolas' || normalized === 'bitola' || normalized === 'dimensão' || normalized === 'dimensao';
            });
            const bitola = bitolaKey ? String(row[bitolaKey] || "").trim() : "";

            const normalizeKey = (k: string) => String(k).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const prodKey = Object.keys(row).find(k => {
                const n = normalizeKey(k);
                return n === 'qtde real (t)' || n === 'prod. acab. (t)' ||
                    n === 'prod acab (t)' || n.includes('producao') || n.includes('produção') ||
                    (n.includes('qtde') && n.includes('real')) || (n.includes('prod') && n.includes('(t)'));
            });
            let producao = prodKey ? cleanNumber(row[prodKey]) : 0;
            if (producao === 0) {
                const tarugoKey = Object.keys(row).find(k => normalizeKey(k).includes('tarugo'));
                if (tarugoKey) producao = cleanNumber(row[tarugoKey]);
            }

            let meta = null;
            if (sap) meta = normalizedMetasMap[sap] || normalizedMetasMap[sap.replace(/^0+/, '')];
            if (!meta && bitola) meta = normalizedMetasMap[bitola] || normalizedMetasMap[bitola.replace(',', '.')];
            if (!meta && bitola) {
                const cleanBitola = bitola.toLowerCase().replace(/\s/g, '');
                const foundKey = Object.keys(metasMap).find(k => {
                    const cleanK = k.toLowerCase().replace(/\s/g, '');
                    return cleanK === cleanBitola || cleanK.includes(cleanBitola) || cleanBitola.includes(cleanK);
                });
                if (foundKey) meta = metasMap[foundKey];
            }

            if (meta) {
                if (colName === 'Rendimento (%)') {
                    const rm = cleanNumber(meta.rm || meta.rendimento || meta['Rendimento (%)']);
                    return rm > 0 ? rm.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%' : '-';
                }
                if (colName === 'Massa Linear') {
                    let ml = cleanNumber(meta.massa_linear || meta.massa || meta['Massa Linear'] || 0);
                    // Correção de escala (g/m -> kg/m ou erro de vírgula)
                    if (ml > 50) ml /= 1000;
                    return ml > 0 ? ml.toLocaleString('pt-BR', { minimumFractionDigits: 3 }) : '-';
                }
                if (colName.includes('Gás') || colName.includes('Energia')) {
                    const isGas = colName.includes('Gás');
                    let metaVal = 0;
                    if (isGas) {
                        metaVal = meta.gas || meta.Gas || meta.GAS || meta['Gás Natural (m³)'] ||
                            meta['Meta Gás'] || meta['Consumo Gás'] || meta['meta_gas'] || 0;
                    } else {
                        metaVal = meta.energia || meta.Energia || meta.ENERGIA || meta['Energia Elétrica (kWh)'] ||
                            meta['Meta Energia'] || meta['Consumo Energia'] || meta['meta_energia'] || 0;
                    }

                    const specificVal = cleanNumber(metaVal);
                    if (specificVal > 0) {
                        if (producao > 0) {
                            return (specificVal * producao).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
                        } else {
                            return <span title={`Meta Específica: ${specificVal}`} className="text-slate-400 text-xs italic">({specificVal.toFixed(2)})</span>;
                        }
                    } else {
                        const availableKeys = Object.keys(meta).join(', ');
                        return <span title={`Valor zerado. Chaves na meta: ${availableKeys}`} className="text-amber-500 cursor-help font-bold">!</span>;
                    }
                }
            }
            return '-';
        }

        if (value === null || value === undefined) return '-';
        if (value === '') return '-';

        if (typeof value === 'number' && isDateColumn(colName)) {
            if (value > 1000 && value < 100000) return excelSerialToDate(value);
        }

        if (colName.toLowerCase().includes('dia da semana') && typeof value === 'number') {
            return numberToWeekday(value);
        }

        if (colName === 'IU (%)' || colName === 'IE (%)') {
            let numVal = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
            if (typeof numVal === 'number' && !isNaN(numVal)) {
                if (Math.abs(numVal) <= 1 && numVal !== 0) numVal *= 100;
                return numVal.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
            }
        }

        if (isCodeColumn(colName)) return String(value);

        if (colName === 'Produtividade (t/h)') {
            let val = typeof value === 'number' ? value : cleanNumber(value);
            // Correção heurística: se > 500, assume kg/h -> t/h
            if (val > 500) val /= 1000;
            return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        if (typeof value === 'number') {
            return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return String(value);
    };

    const filteredData = data.filter(row =>
        Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortConfig) return 0;
        const valA = a[sortConfig.key] || "";
        const valB = b[sortConfig.key] || "";
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(100);

    // Reinicia página ao filtrar
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sortConfig]);

    // Dados paginados
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    const footerTotalsResult = useMemo(() => {
        const sums: Record<string, number> = {};
        sortedData.forEach(row => {
            const prodRealKey = Object.keys(row).find(k =>
                (k.toLowerCase().includes('qtde') || k.toLowerCase().includes('real')) &&
                k.toLowerCase().includes('(t)')
            );
            const prod = prodRealKey ? (parseFloat(String(row[prodRealKey]).replace(',', '.')) || 0) : 0;
            let gasMeta = 0;
            let eeMeta = 0;

            const sapKey = Object.keys(row).find(k => {
                const normalized = String(k).toLowerCase().trim();
                return k === 'Código SAP2' || k === 'Codigo SAP2' || k === 'Código' || k === 'Codigo' ||
                    (normalized.includes('sap') && !normalized.includes('mp') && !normalized.includes('descricao'));
            });
            const sap = sapKey ? String(row[sapKey] || "").trim() : "";

            const bitolaKey = Object.keys(row).find(k => {
                const normalized = String(k).toLowerCase().trim();
                return normalized === 'bitolas' || normalized === 'bitola' || normalized === 'dimensão' || normalized === 'dimensao';
            });
            const bitola = bitolaKey ? String(row[bitolaKey] || "").trim() : "";

            let meta = null;
            if (sap) meta = normalizedMetasMap[sap] || normalizedMetasMap[sap.replace(/^0+/, '')];
            if (!meta && bitola) meta = normalizedMetasMap[bitola] || normalizedMetasMap[bitola.replace(',', '.')];

            // Lógica simplificada para totais - sem fallback fuzzy pesado aqui

            if (meta) {
                const g = typeof meta.gas === 'number' ? meta.gas : parseFloat(String(meta.gas || meta['Gás Natural (m³)'] || '0').replace(',', '.'));
                const e = typeof meta.energia === 'number' ? meta.energia : parseFloat(String(meta.energia || meta['Energia Elétrica (kWh)'] || '0').replace(',', '.'));
                if (!isNaN(g)) gasMeta = g;
                if (!isNaN(e)) eeMeta = e;
            }

            allColumns.forEach(col => {
                if (['Qtde REAL (t)', 'Prod. Acab. (t)', 'Tarugos (t)', 'Peças', 'Produção Apontada'].includes(col)) {
                    const val = parseFloat(String(row[col] || '0').replace(',', '.')) || 0;
                    sums[col] = (sums[col] || 0) + val;
                }
                if (col === 'Meta Gás (m³)') sums[col] = (sums[col] || 0) + (gasMeta * prod);
                if (col === 'Meta Energia (kWh)') sums[col] = (sums[col] || 0) + (eeMeta * prod);
            });
        });
        return sums;
    }, [sortedData, normalizedMetasMap, allColumns]);

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(sortedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PCP Detalhado");
        XLSX.writeFile(wb, "PCP_Detalhado_Export.xlsx");
    };

    const StatCard = ({ title, value, unit, icon, color }: any) => (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{title}</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-slate-800">{value}</span>
                    <span className="text-[10px] font-bold text-slate-400">{unit}</span>
                </div>
            </div>
            <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 text-current`}>
                {icon}
            </div>
        </div>
    );

    return (
        <div className="p-6 min-h-screen bg-slate-50">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">↯ PCP ORIGINAL: ABA TL1</span>
                            <span className="text-[10px] text-slate-400">({fileName})</span>
                        </div>
                        <h1 className="text-lg font-black text-slate-800">{data.length} REGISTROS (MÊS VIGENTE)</h1>
                        <p className="text-[10px] text-slate-400">{allColumns.length} colunas carregadas</p>
                    </div>
                </div>

                {/* Controles de Paginação no Topo */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                    <span className="text-xs font-bold text-slate-500 mr-2">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                    >
                        <ChevronUp className="rotate-[-90deg]" size={16} />
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 rounded hover:bg-slate-100 disabled:opacity-50"
                    >
                        <ChevronDown className="rotate-[-90deg]" size={16} />
                    </button>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="ml-2 text-xs border-l pl-2 border-slate-200 outline-none"
                    >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={500}>500</option>
                    </select>
                </div>
            </div>

            {/* Painel de Integridade de Dados */}
            <DataIntegrityPanel data={data} metasMap={metasMap || {}} />

            {/* KPI Cards (Cálculo Dinâmico Ponderado) */}
            <div className="grid grid-cols-6 gap-4 mb-6">
                <StatCard
                    title="PRODUÇÃO"
                    value={Math.round(footerTotalsResult['Qtde REAL (t)'] || footerTotalsResult['Prod. Acab. (t)'] || totals.totalProducao).toLocaleString('pt-BR')}
                    unit="t"
                    icon={<Boxes size={20} className="text-blue-600" />}
                    color="bg-blue-500"
                />
                <StatCard
                    title="GÁS NATURAL"
                    value={((footerTotalsResult['Meta Gás (m³)'] || 0) / (footerTotalsResult['Qtde REAL (t)'] || 1)).toFixed(2)}
                    unit="m³/t"
                    icon={<Flame size={20} className="text-orange-500" />}
                    color="bg-orange-500"
                />
                <StatCard
                    title="ENERGIA ELÉT."
                    value={((footerTotalsResult['Meta Energia (kWh)'] || 0) / (footerTotalsResult['Qtde REAL (t)'] || 1)).toFixed(1)}
                    unit="kWh/t"
                    icon={<Zap size={20} className="text-amber-500" />}
                    color="bg-amber-500"
                />
                <StatCard
                    title="PRODUTIVIDADE"
                    value={totals.avgProd.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    unit="t/h"
                    icon={<Activity size={20} className="text-emerald-500" />}
                    color="bg-emerald-500"
                />
                <StatCard
                    title="SETUP TOTAL"
                    value={totals.totalSetupHoras.toFixed(1)}
                    unit="h"
                    icon={<Clock size={20} className="text-purple-500" />}
                    color="bg-purple-500"
                />
                <StatCard
                    title="UTILIZAÇÃO"
                    value={(totals.avgUtilizacao || 0).toFixed(1)}
                    unit="%"
                    icon={<BarChart4 size={20} className="text-cyan-500" />}
                    color="bg-cyan-500"
                />
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-slate-100 flex items-center gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar (OP, SAP, Família...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </div>
                <button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700 transition-colors"
                >
                    <Download size={14} /> Exportar
                </button>
                {missingMetas.length > 0 && (
                    <button
                        onClick={handleExportMissing}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-xs rounded-xl hover:bg-rose-700 transition-colors ml-2 shadow-sm font-bold"
                        title={`${missingMetas.length} itens sem meta encontrada. Clique para baixar planilha de preenchimento.`}
                    >
                        <Download size={14} /> Baixar {missingMetas.length} Faltantes
                    </button>
                )}
            </div>

            {/* Table - Com scroll horizontal */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="overflow-x-auto" style={{ maxHeight: '65vh' }}>
                    <table className="w-full text-left" style={{ minWidth: `${allColumns.length * 120}px` }}>
                        <thead className="bg-gradient-to-r from-blue-600 to-blue-500 text-white sticky top-0 z-10">
                            <tr>
                                {allColumns.map((colName, idx) => (
                                    <th
                                        key={idx}
                                        className="px-3 py-3 text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                                        title={colName}
                                    >
                                        {colName}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {paginatedData.map((row, rowIdx) => (
                                <tr key={rowIdx} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                                    {allColumns.map((colName, colIdx) => (
                                        <td
                                            key={colIdx}
                                            className="px-3 py-2 text-[10px] font-semibold text-slate-700 whitespace-nowrap"
                                            title={String(row[colName] || '')}
                                        >
                                            {formatCellValue(row[colName], colName, row)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 font-bold text-slate-800 sticky bottom-0 z-10 shadow-inner">
                            <tr>
                                {allColumns.map((col, idx) => {
                                    const val = footerTotalsResult[col];
                                    let content = '';

                                    if (val !== undefined && val !== 0) {
                                        content = val.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
                                    }

                                    if (idx === 0) content = 'TOTAIS';

                                    return (
                                        <td key={idx} className="px-3 py-3 text-[10px] whitespace-nowrap border-t-2 border-slate-300 bg-slate-100">
                                            {content}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    </table>

                    {sortedData.length === 0 && (
                        <div className="p-10 text-center text-slate-400">
                            <p>Nenhum dado encontrado para sua busca.</p>
                        </div>
                    )}
                </div>

                {/* Footer Pagination Info */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
                    <span>Mostrando {paginatedData.length} registros de {sortedData.length}</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 bg-white border rounded hover:bg-slate-100 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 bg-white border rounded hover:bg-slate-100 disabled:opacity-50"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
