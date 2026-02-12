import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Activity, ArrowRight, RotateCcw, X } from 'lucide-react';

interface Props {
    baseData: {
        totalProducao: number;
        avgGas: number; // m³/t
        avgEE: number;  // kWh/t
        avgRM: number; // % (e.g., 95)
        [key: string]: any; // Allow other properties
    };
    costs: {
        gas: number;
        energy: number;
        material: number;
    };
    onClose: () => void;
}

export const ScenarioSimulator: React.FC<Props> = ({ baseData, costs, onClose }) => {
    const [prodVar, setProdVar] = useState(0); // % Variação Produção
    const [gasEffVar, setGasEffVar] = useState(0); // % Variação Eficiência Gás (Negativo é bom = consome menos)
    const [energyEffVar, setEnergyEffVar] = useState(0); // % Variação Eficiência Energia
    const [yieldVar, setYieldVar] = useState(0); // Variação Rendimento (p.p.)

    // Cálculos Simulados
    const simulated = useMemo(() => {
        // Safe guard for empty data
        if (!baseData || baseData.totalProducao <= 0) {
            return {
                producao: 0,
                totalCost: 0,
                costDiff: 0,
                costPerTon: 0,
                baseCostPerTon: 0
            };
        }

        const newProd = baseData.totalProducao * (1 + prodVar / 100);

        // Eficiência: Se melhora 10% (-10%), o consumo específico cai 10%.
        const newSpecGas = baseData.avgGas * (1 + gasEffVar / 100);
        const newSpecEE = baseData.avgEE * (1 + energyEffVar / 100);

        // Rendimento: Base + Variação (p.p.)

        // Base
        let currentYield = baseData.avgRM || 0;
        if (currentYield === 0) currentYield = 94.5; // Fallback se não vier do input

        // Custo Base (Assumindo que o custos totais originais não vieram prontos, calculamos agora)
        const baseGasCost = baseData.totalProducao * baseData.avgGas * costs.gas;
        const baseEECost = baseData.totalProducao * baseData.avgEE * costs.energy;

        const baseCarga = baseData.totalProducao / (currentYield / 100);
        const basePerda = baseCarga - baseData.totalProducao;
        const baseCostMaterial = basePerda * (costs.material || 0);

        const baseTotalCost = baseGasCost + baseEECost + baseCostMaterial;

        // Novos Cálculos
        const newYield = Math.min(100, Math.max(0, currentYield + yieldVar));

        const newCarga = newProd / (newYield / 100);
        const newPerda = newCarga - newProd;
        const newCostMaterial = newPerda * (costs.material || 0);

        const newTotalGas = newProd * newSpecGas;
        const newTotalEE = newProd * newSpecEE;

        const newCostGas = newTotalGas * costs.gas;
        const newCostEE = newTotalEE * costs.energy;
        const newTotalCost = newCostGas + newCostEE + newCostMaterial;

        const costDiff = newTotalCost - baseTotalCost;

        return {
            producao: newProd,
            totalCost: newTotalCost,
            costDiff,
            costPerTon: newTotalCost / newProd,
            baseCostPerTon: baseTotalCost / baseData.totalProducao
        };
    }, [baseData, costs, prodVar, gasEffVar, energyEffVar, yieldVar]);

    const costPerTonDiff = simulated.costPerTon - simulated.baseCostPerTon;

    const formatMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatNum = (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-32 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                            <Calculator size={32} className="text-blue-300" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight uppercase">Simulador de Cenários</h2>
                            <p className="text-blue-200 font-medium">Ajuste as variáveis e projete o impacto financeiro.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-colors text-slate-300 hover:text-white"
                        title="Fechar Simulador"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    {/* Controls */}
                    <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-blue-200">Volume de Produção</label>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${prodVar >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                    {prodVar > 0 ? '+' : ''}{prodVar}%
                                </span>
                            </div>
                            <input
                                type="range" min="-30" max="30" step="5" value={prodVar}
                                onChange={(e) => setProdVar(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-orange-200">Consumo Específico Gás</label>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${gasEffVar <= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                    {gasEffVar > 0 ? '+' : ''}{gasEffVar}% ({gasEffVar <= 0 ? 'Melhor' : 'Pior'})
                                </span>
                            </div>
                            <input
                                type="range" min="-20" max="20" step="1" value={gasEffVar}
                                onChange={(e) => setGasEffVar(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-yellow-200">Consumo Específico Energia</label>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${energyEffVar <= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                    {energyEffVar > 0 ? '+' : ''}{energyEffVar}% ({energyEffVar <= 0 ? 'Melhor' : 'Pior'})
                                </span>
                            </div>
                            <input
                                type="range" min="-20" max="20" step="1" value={energyEffVar}
                                onChange={(e) => setEnergyEffVar(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-emerald-200">Rendimento Metálico</label>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${yieldVar >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                    {yieldVar > 0 ? '+' : ''}{yieldVar} p.p.
                                </span>
                            </div>
                            <input
                                type="range" min="-5" max="5" step="0.1" value={yieldVar}
                                onChange={(e) => setYieldVar(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-1">
                                <span>-5%</span>
                                <span>Base: {((baseData as any).avgRM || 94.5).toFixed(1)}%</span>
                                <span>+5%</span>
                            </div>
                        </div>

                        <button
                            onClick={() => { setProdVar(0); setGasEffVar(0); setEnergyEffVar(0); setYieldVar(0); }}
                            className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        >
                            <RotateCcw size={14} /> Resetar Variáveis
                        </button>
                    </div>

                    {/* Results High Level */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white/10 p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Custo Total Projetado</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-white">{formatMoney(simulated.totalCost)}</span>
                                </div>
                            </div>

                            <div className={`mt-4 p-3 rounded-xl flex items-center gap-3 ${simulated.costDiff <= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                                {simulated.costDiff <= 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                                <div>
                                    <span className="text-xs font-bold uppercase block opacity-80">{simulated.costDiff <= 0 ? 'Economia Potencial' : 'Aumento de Custo'}</span>
                                    <span className="text-lg font-black">{formatMoney(Math.abs(simulated.costDiff))}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Custo por Tonelada</span>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-black text-white">{formatMoney(simulated.costPerTon)}</span>
                                    <span className="text-sm font-medium text-slate-400">/ ton</span>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Base Atual</span>
                                    <span className="text-sm font-bold text-slate-300">{formatMoney(simulated.baseCostPerTon)}/t</span>
                                </div>
                                <ArrowRight size={16} className="text-slate-500" />
                                <div className={`text-left ${costPerTonDiff <= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                    <span className="text-[10px] font-bold uppercase block">Variação</span>
                                    <span className="text-sm font-bold">{costPerTonDiff > 0 ? '+' : ''}{formatMoney(costPerTonDiff)}/t</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
