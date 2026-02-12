import React, { useState, useEffect } from 'react';
import { DollarSign, Save, X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (gasPrice: number, energyPrice: number, materialPrice: number) => void;
    initialGasPrice: number;
    initialEnergyPrice: number;
    initialMaterialPrice: number;
}

export const CostConfigModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialGasPrice, initialEnergyPrice, initialMaterialPrice }) => {
    const [gasPrice, setGasPrice] = useState(initialGasPrice);
    const [energyPrice, setEnergyPrice] = useState(initialEnergyPrice);
    const [materialPrice, setMaterialPrice] = useState(initialMaterialPrice);

    useEffect(() => {
        if (isOpen) {
            setGasPrice(initialGasPrice);
            setEnergyPrice(initialEnergyPrice);
            setMaterialPrice(initialMaterialPrice);
        }
    }, [isOpen, initialGasPrice, initialEnergyPrice, initialMaterialPrice]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-card w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                            <DollarSign size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Configuração de Custos</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        Defina os custos unitários para calcular o impacto financeiro da produção.
                    </p>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Preço do Gás (R$/m³)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={gasPrice}
                                    onChange={(e) => setGasPrice(parseFloat(e.target.value) || 0)}
                                    className="glass-input w-full pl-10 pr-4 py-3 font-black text-lg text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Preço da Energia (R$/kWh)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={energyPrice}
                                    onChange={(e) => setEnergyPrice(parseFloat(e.target.value) || 0)}
                                    className="glass-input w-full pl-10 pr-4 py-3 font-black text-lg text-slate-800"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Preço da Carga Metálica (R$/t)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                <input
                                    type="number"
                                    step="10.00"
                                    value={materialPrice}
                                    onChange={(e) => setMaterialPrice(parseFloat(e.target.value) || 0)}
                                    className="glass-input w-full pl-10 pr-4 py-3 font-black text-lg text-slate-800"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-200/50 rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={() => { onSave(gasPrice, energyPrice, materialPrice); onClose(); }}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                    >
                        <Save size={18} />
                        Salvar Configuração
                    </button>
                </div>
            </div>
        </div>
    );
};
