import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    ChevronLeft, Save, TrendingUp, DollarSign, Activity, Zap,
    Flame, Boxes, AlertCircle, CheckCircle2, Calculator, Repeat
} from 'lucide-react';
import { getGlobalBudget, saveGlobalBudget } from '../services/supabaseClient';
import { TL1_BUDGET_2026 } from '../services/BudgetService';

interface Props {
    onBack: () => void;
}

interface BudgetEntry {
    month: number;
    kpi_name: string;
    valor_orcado: number;
    valor_realizado: number;
}

const KPIS = [
    { id: 'producao', label: 'Produção', unit: 't', icon: <Boxes size={18} />, color: 'text-blue-500' },
    { id: 'gas', label: 'GN', unit: 'm³/t', icon: <Flame size={18} />, color: 'text-orange-500' },
    { id: 'energia', label: 'EE', unit: 'kWh/t', icon: <Zap size={18} />, color: 'text-yellow-500' },
    { id: 'rendimento', label: 'RM', unit: '%', icon: <Activity size={18} />, color: 'text-emerald-500' },
];

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const AnnualBudget: React.FC<Props> = ({ onBack }) => {
    const [year] = useState(2026);
    const [data, setData] = useState<BudgetEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Ref para garantir que o salvamento automático use sempre a versão mais recente dos dados
    const dataRef = useRef<BudgetEntry[]>([]);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        fetchBudget();
    }, [year]);

    const fetchBudget = async () => {
        setLoading(true);
        const result = await getGlobalBudget(year);
        setData(result);
        setLoading(false);
    };

    const handleValueChange = (month: number, kpi: string, type: 'orc' | 'real', value: string) => {
        const numValue = parseFloat(value.replace(',', '.')) || 0;

        setData(prev => {
            const existingIdx = prev.findIndex(d => d.month === month && d.kpi_name === kpi);
            const newData = [...prev];

            if (existingIdx >= 0) {
                newData[existingIdx] = {
                    ...newData[existingIdx],
                    [type === 'orc' ? 'valor_orcado' : 'valor_realizado']: numValue
                };
            } else {
                newData.push({
                    month,
                    kpi_name: kpi,
                    valor_orcado: type === 'orc' ? numValue : 0,
                    valor_realizado: type === 'real' ? numValue : 0
                });
            }
            return newData;
        });
    };

    const handleImportDefaultBudget = () => {
        if (!confirm('Deseja carregar as metas padrão de 2026? Isso substituirá os valores orçados atuais.')) return;

        const newData: BudgetEntry[] = [...data];

        TL1_BUDGET_2026.forEach(bud => {
            const kpiMappings = [
                { kpi: 'producao', val: bud.producao },
                { kpi: 'rendimento', val: bud.rendimento },
                { kpi: 'energia', val: bud.energia },
                { kpi: 'gas', val: bud.gas }
            ];

            kpiMappings.forEach(({ kpi, val }) => {
                const existingIdx = newData.findIndex(d => d.month === bud.month && d.kpi_name === kpi);
                if (existingIdx >= 0) {
                    newData[existingIdx] = { ...newData[existingIdx], valor_orcado: val };
                } else {
                    newData.push({ month: bud.month, kpi_name: kpi, valor_orcado: val, valor_realizado: 0 });
                }
            });
        });

        setData(newData);
    };

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        setSaveStatus('idle');
        try {
            // Usamos a Ref para garantir que pegamos os dados mais recentes após o processamento do React
            const currentData = dataRef.current;
            const entriesToSave = currentData.map(d => ({ ...d, year }));
            await saveGlobalBudget(entriesToSave);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
        } finally {
            setSaving(false);
        }
    };

    const getValue = (month: number, kpi: string, type: 'orc' | 'real') => {
        const entry = data.find(d => d.month === month && d.kpi_name === kpi);
        if (!entry) return '';
        const val = type === 'orc' ? entry.valor_orcado : entry.valor_realizado;
        return val === 0 ? '' : val.toString().replace('.', ',');
    };

    const calculateAccumulated = useMemo(() => {
        // Encontra o último mês com algum dado realizado preenchido
        const lastMonthWithReal = data.reduce((max, d) =>
            d.valor_realizado > 0 ? Math.max(max, d.month) : max, -1
        );

        // Se não houver dados reais, mostramos o acumulado do ano todo para o orçado.
        // Se houver, limitamos ambos ao período com dados (ex: Jan-Mar).
        const limitMonth = lastMonthWithReal === -1 ? 11 : lastMonthWithReal;

        const accum: Record<string, {
            orcSum: number, realSum: number,
            orcWeighted: number, realWeighted: number,
            totalProdOrc: number, totalProdReal: number
        }> = {};

        KPIS.forEach(kpi => {
            accum[kpi.id] = { orcSum: 0, realSum: 0, orcWeighted: 0, realWeighted: 0, totalProdOrc: 0, totalProdReal: 0 };
        });

        // Pegamos a produção de cada mês para usar como peso
        const prodByMonth: Record<number, { orc: number, real: number }> = {};
        for (let m = 0; m < 12; m++) {
            const entry = data.find(d => d.month === m && d.kpi_name === 'producao');
            prodByMonth[m] = {
                orc: entry?.valor_orcado || 0,
                real: entry?.valor_realizado || 0
            };
        }

        data.forEach(d => {
            if (accum[d.kpi_name] && d.month <= limitMonth) {
                const p = prodByMonth[d.month];
                if (d.kpi_name === 'producao') {
                    accum[d.kpi_name].orcSum += d.valor_orcado;
                    accum[d.kpi_name].realSum += d.valor_realizado;
                } else {
                    // Médias ponderadas limitadas ao período preenchido
                    accum[d.kpi_name].orcWeighted += (d.valor_orcado * p.orc);
                    accum[d.kpi_name].realWeighted += (d.valor_realizado * p.real);
                    accum[d.kpi_name].totalProdOrc += p.orc;
                    accum[d.kpi_name].totalProdReal += p.real;
                }
            }
        });

        const result: Record<string, { orc: number, real: number }> = {};
        KPIS.forEach(kpi => {
            if (kpi.id === 'producao') {
                result[kpi.id] = { orc: accum[kpi.id].orcSum, real: accum[kpi.id].realSum };
            } else {
                result[kpi.id] = {
                    orc: accum[kpi.id].totalProdOrc > 0 ? accum[kpi.id].orcWeighted / accum[kpi.id].totalProdOrc : 0,
                    real: accum[kpi.id].totalProdReal > 0 ? accum[kpi.id].realWeighted / accum[kpi.id].totalProdReal : 0
                };
            }
        });

        return result;
    }, [data]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando Orçamento...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Local */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4 md:gap-6">
                    <button onClick={onBack} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-500 group">
                        <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <DollarSign className="text-emerald-500" />
                            Gestão de Orçamento Anual
                        </h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Exercício {year} • Planejado vs Realizado</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                    <button
                        onClick={handleImportDefaultBudget}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all border border-blue-200"
                    >
                        <Repeat size={14} />
                        Carregar Metas 2026
                    </button>
                    {saveStatus === 'success' && (
                        <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs animate-in slide-in-from-right-4">
                            <CheckCircle2 size={16} />
                            Salvo!
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex items-center gap-3 px-10 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${saving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 hover:shadow-emerald-500/20'
                            }`}
                    >
                        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
                        {saving ? 'Gravando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>

            {/* Tabela de Orçamento */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse table-fixed min-w-[2000px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="p-6 text-left border-b border-slate-100 dark:border-slate-800 xl:sticky left-0 bg-slate-100 dark:bg-slate-800 z-30 w-64 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">KPI / Mês</span>
                                </th>
                                {MONTHS.map(month => (
                                    <th key={month} colSpan={2} className="p-4 text-center border-b border-l border-slate-100 dark:border-slate-800 w-40">
                                        <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">{month}</span>
                                    </th>
                                ))}
                                <th colSpan={3} className="p-4 text-center border-b border-l border-slate-50 dark:border-slate-800 bg-blue-100 dark:bg-blue-900 xl:sticky right-0 z-30 w-96 shadow-[-5px_0_15px_rgba(0,0,0,0.1)]">
                                    <span className="text-xs font-black text-blue-700 dark:text-blue-200 uppercase tracking-tight">Acumulado Anual</span>
                                </th>
                            </tr>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                <th className="p-2 border-b border-slate-100 dark:border-slate-800 xl:sticky left-0 bg-slate-100 dark:bg-slate-800 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"></th>
                                {MONTHS.map(m => (
                                    <React.Fragment key={m}>
                                        <th className="p-2 text-[10px] font-black uppercase text-slate-400 border-b border-l border-slate-100 dark:border-slate-800">Orçado</th>
                                        <th className="p-2 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">Real</th>
                                    </React.Fragment>
                                ))}
                                <th className="p-2 text-[10px] font-black uppercase text-blue-600 border-b border-l border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900 xl:sticky right-[256px] z-30 w-32 border-l-2">Orçado</th>
                                <th className="p-2 text-[10px] font-black uppercase text-blue-600 border-b border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900 xl:sticky right-[128px] z-30 w-32">Real</th>
                                <th className="p-2 text-[10px] font-black uppercase text-blue-700 border-b border-blue-200 dark:border-blue-800 bg-blue-100 dark:bg-blue-900 xl:sticky right-0 z-30 w-32">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {KPIS.map(kpi => {
                                const accOrc = calculateAccumulated[kpi.id].orc;
                                const accReal = calculateAccumulated[kpi.id].real;
                                const saldo = accReal - accOrc;
                                const saldoColor = saldo > 0 ? 'text-emerald-600 dark:text-emerald-400' : saldo < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400';

                                return (
                                    <tr key={kpi.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                        <td className="p-6 border-b border-slate-100 dark:border-slate-800 xl:sticky left-0 bg-white dark:bg-slate-900 z-20 font-bold group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors shadow-[5px_0_10px_-5px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 ${kpi.color} shadow-inner`}>
                                                    {kpi.icon}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none mb-1">{kpi.label}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.unit}</span>
                                                </div>
                                            </div>
                                        </td>
                                        {MONTHS.map((_, mIdx) => (
                                            <React.Fragment key={mIdx}>
                                                <td className="p-2 border-b border-l border-slate-100 dark:border-slate-800">
                                                    <input
                                                        type="text"
                                                        value={getValue(mIdx, kpi.id, 'orc')}
                                                        onChange={(e) => handleValueChange(mIdx, kpi.id, 'orc', e.target.value)}
                                                        placeholder="0,00"
                                                        className="w-full bg-transparent text-center text-sm font-black text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded-lg py-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                    />
                                                </td>
                                                <td className="p-2 border-b border-slate-100 dark:border-slate-800">
                                                    <input
                                                        type="text"
                                                        value={getValue(mIdx, kpi.id, 'real')}
                                                        onChange={(e) => handleValueChange(mIdx, kpi.id, 'real', e.target.value)}
                                                        placeholder="0,00"
                                                        className="w-full bg-transparent text-center text-sm font-black text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded-lg py-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                    />
                                                </td>
                                            </React.Fragment>
                                        ))}
                                        <td className="p-4 border-b border-l-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-slate-900 text-center text-base font-black text-blue-700 dark:text-blue-300 xl:sticky right-[256px] z-20 w-32 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)]">
                                            {accOrc.toLocaleString('pt-BR', { maximumFractionDigits: kpi.id === 'producao' ? 0 : 2 })}
                                        </td>
                                        <td className="p-4 border-b border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-slate-900 text-center text-base font-black text-blue-700 dark:text-blue-300 xl:sticky right-[128px] z-20 w-32">
                                            {accReal.toLocaleString('pt-BR', { maximumFractionDigits: kpi.id === 'producao' ? 0 : 2 })}
                                        </td>
                                        <td className={`p-4 border-b border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-slate-900 text-center text-base font-black xl:sticky right-0 z-20 w-32 ${saldoColor}`}>
                                            {(saldo > 0 ? '+' : '') + saldo.toLocaleString('pt-BR', { maximumFractionDigits: kpi.id === 'producao' ? 0 : 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Calculator size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="max-w-xl">
                        <h3 className="text-2xl font-black uppercase tracking-tight italic mb-2">Resumo de Performance</h3>
                        <p className="text-blue-100 font-medium">
                            Os valores orçados servem como base para as notificações e alertas inteligentes do sistema.
                            Mantenha o orçamento atualizado para garantir a precisão dos Insights Gemini e Score de Performance.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white/10 backdrop-blur-md p-4 lg:p-6 rounded-[1.5rem] border border-white/20 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1 truncate">Total Produção (Orc)</p>
                            <p className="text-xl lg:text-2xl font-black truncate">{calculateAccumulated['producao'].orc.toLocaleString('pt-BR')} t</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-4 lg:p-6 rounded-[1.5rem] border border-white/20 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1 truncate">Rendimento Médio</p>
                            <p className="text-xl lg:text-2xl font-black truncate">{calculateAccumulated['rendimento'].orc.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-4 lg:p-6 rounded-[1.5rem] border border-white/20 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-200 mb-1 truncate">Consumo Médio GN</p>
                            <p className="text-xl lg:text-2xl font-black truncate">{calculateAccumulated['gas'].orc.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m³/t</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-4 lg:p-6 rounded-[1.5rem] border border-white/20 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-200 mb-1 truncate">Consumo Médio EE</p>
                            <p className="text-xl lg:text-2xl font-black truncate">{calculateAccumulated['energia'].orc.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWh/t</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
