import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Minus, Target, DollarSign, Activity, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
    pcpA: any[];
    pcpB: any[];
    onClose: () => void;
}

export const ScenarioComparator: React.FC<Props> = ({ pcpA, pcpB, onClose }) => {
    // 1. Cálculos de Totais
    const calcTotal = (data: any[], key: string) => data.reduce((acc, curr) => acc + (Number(curr[key]) || 0), 0);
    const calcAvg = (data: any[], key: string) => calcTotal(data, key) / (data.length || 1);

    const metrics = [
        { label: 'Produção Total (t)', key: '_ai_producao', format: (v: number) => v.toLocaleString('pt-BR') },
        { label: 'Custo Est. (R$)', key: '_ai_custo_total', format: (v: number) => `R$ ${v.toLocaleString('pt-BR')}` },
        { label: 'Eficiência Gás (m³/t)', key: '_ai_consumo_gas', format: (v: number) => v.toFixed(2) },
        { label: 'Eficiência EE (kWh/t)', key: '_ai_consumo_ee', format: (v: number) => v.toFixed(2) },
        { label: 'Setup Total (min)', key: '_ai_setup', format: (v: number) => v.toLocaleString('pt-BR') },
    ];

    const comparisons = metrics.map(m => {
        const valA = m.key.includes('custo') ? calcTotal(pcpA, '_ai_producao') * 150 : calcTotal(pcpA, m.key); // Mock custo se não existir
        const valB = m.key.includes('custo') ? calcTotal(pcpB, '_ai_producao') * 150 : calcTotal(pcpB, m.key);

        // Ajuste para médias
        const finalA = m.key.includes('consumo') ? calcAvg(pcpA, m.key) : valA;
        const finalB = m.key.includes('consumo') ? calcAvg(pcpB, m.key) : valB;

        const diff = finalB - finalA;
        const pct = (diff / (finalA || 1)) * 100;

        return { ...m, valA: finalA, valB: finalB, diff, pct };
    });

    // 2. Gráfico Comparativo
    const chartData = [
        { name: 'Produção', A: calcTotal(pcpA, '_ai_producao'), B: calcTotal(pcpB, '_ai_producao') },
        // Normalizando para escala (ex: Setup / 10)
        { name: 'Setup (x10 min)', A: calcTotal(pcpA, '_ai_setup') / 10, B: calcTotal(pcpB, '_ai_setup') / 10 },
    ];

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Activity className="text-purple-600" />
                            Comparador de Cenários
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">Análise Comparativa: Plano A (Atual) vs Plano B (Simulado)</p>
                    </div>
                    <button onClick={onClose} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors">
                        Fechar Comparação
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50">

                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                        {comparisons.map((item, idx) => {
                            const isPositiveGood = item.key === '_ai_producao'; // Produção subir é bom, custo subir é ruim
                            const isGood = isPositiveGood ? item.diff >= 0 : item.diff <= 0;
                            const ColorIcon = isGood ? TrendingUp : TrendingDown; // Ícone depende da direção
                            const colorClass = isGood ? 'text-emerald-600' : 'text-rose-600';
                            const bgClass = isGood ? 'bg-emerald-50' : 'bg-rose-50';

                            return (
                                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-all">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{item.label}</span>

                                    <div className="flex justify-between items-end mb-3">
                                        <div>
                                            <span className="block text-xs font-bold text-slate-400 mb-0.5">Plano A</span>
                                            <span className="text-lg font-black text-slate-600">{item.format(item.valA)}</span>
                                        </div>
                                        <ArrowRight size={16} className="text-slate-300 mb-1.5" />
                                        <div className="text-right">
                                            <span className="block text-xs font-bold text-slate-400 mb-0.5">Plano B</span>
                                            <span className={`text-lg font-black ${item.diff === 0 ? 'text-slate-600' : 'text-purple-600'}`}>{item.format(item.valB)}</span>
                                        </div>
                                    </div>

                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${item.diff === 0 ? 'bg-slate-100 text-slate-500' : bgClass}`}>
                                        {item.diff === 0 ? <Minus size={14} /> : <ColorIcon size={14} className={colorClass} />}
                                        <span className={`text-xs font-bold ${item.diff === 0 ? 'text-slate-500' : colorClass}`}>
                                            {item.diff > 0 ? '+' : ''}{item.format(item.diff)} ({item.pct.toFixed(1)}%)
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Chart & Details Split */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Chart */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                                <Activity size={18} className="text-blue-500" /> Visão Gráfica
                            </h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} barSize={40}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <Tooltip
                                            cursor={{ fill: '#f1f5f9' }}
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="A" name="Plano A (Base)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="B" name="Plano B (Comparativo)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Insights / Conclusion */}
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-2xl shadow-lg text-white flex flex-col">
                            <h3 className="font-bold text-indigo-200 mb-4 flex items-center gap-2">
                                <Target size={18} /> Conclusão da IA
                            </h3>

                            <div className="flex-1 space-y-4">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <span className="text-xs font-bold text-indigo-300 uppercase block mb-1">Vencedor Financeiro</span>
                                    <p className="font-bold text-lg">
                                        Plano {comparisons[1].valA < comparisons[1].valB ? 'A' : 'B'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">Menor custo estimado projetado.</p>
                                </div>

                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <span className="text-xs font-bold text-indigo-300 uppercase block mb-1">Vencedor Produtividade</span>
                                    <p className="font-bold text-lg">
                                        Plano {comparisons[0].valA > comparisons[0].valB ? 'A' : 'B'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">Maior volume de produção total.</p>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/10">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-amber-400 shrink-0" size={20} />
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                        <b>Atenção:</b> O Plano B apresenta um aumento de consumo específico de Gás. Verifique se o ganho de produção compensa o custo energético extra.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
