import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Check, X, Settings } from 'lucide-react';

export interface AlertRule {
    id: string;
    metric: 'rendimento' | 'gas' | 'energia' | 'producao';
    condition: 'less_than' | 'greater_than';
    value: number;
    active: boolean;
}

interface Props {
    rules: AlertRule[];
    onUpdateRules: (rules: AlertRule[]) => void;
    currentMetrics: {
        rendimento: number;
        gas: number;
        energia: number;
        producao: number;
    };
}

export const SmartAlerts: React.FC<Props> = ({ rules, onUpdateRules, currentMetrics }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [localRules, setLocalRules] = useState<AlertRule[]>(rules);

    // Sync external rules
    useEffect(() => setLocalRules(rules), [rules]);

    const handleToggle = (id: string) => {
        const updated = localRules.map(r => r.id === id ? { ...r, active: !r.active } : r);
        setLocalRules(updated);
        onUpdateRules(updated);
    };

    const handleChangeValue = (id: string, val: number) => {
        const updated = localRules.map(r => r.id === id ? { ...r, value: val } : r);
        setLocalRules(updated);
        onUpdateRules(updated);
    };

    const checkAlert = (rule: AlertRule) => {
        if (!rule.active) return false;
        const current = currentMetrics[rule.metric];
        if (rule.condition === 'less_than') return current < rule.value;
        if (rule.condition === 'greater_than') return current > rule.value;
        return false;
    };

    const activeAlertsCount = localRules.filter(checkAlert).length;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl transition-all ${activeAlertsCount > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                title="Configurar Alertas Inteligentes"
            >
                <Bell size={18} />
                {activeAlertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 bg-rose-600 rounded-full items-center justify-center text-[10px] text-white font-bold border-2 border-white">
                        {activeAlertsCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 p-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Settings size={16} className="text-blue-500" />
                                Monitoramento Ativo
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>

                        <div className="space-y-3">
                            {localRules.map(rule => {
                                const isTriggered = checkAlert(rule);
                                return (
                                    <div key={rule.id} className={`p-3 rounded-xl border ${isTriggered ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isTriggered ? 'text-rose-600' : 'text-slate-500'}`}>
                                                {rule.metric.toUpperCase()}
                                            </span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={rule.active} onChange={() => handleToggle(rule.id)} />
                                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-600">Avisar se</span>
                                            <span className="font-mono bg-white px-1 rounded text-xs border border-slate-200">
                                                {rule.condition === 'less_than' ? '<' : '>'}
                                            </span>
                                            <input
                                                type="number"
                                                value={rule.value}
                                                onChange={(e) => handleChangeValue(rule.id, Number(e.target.value))}
                                                className="w-16 px-1 py-0.5 text-center font-bold text-slate-700 bg-white border border-slate-200 rounded focus:ring-2 focus:ring-blue-100 outline-none"
                                            />
                                            {isTriggered && <AlertTriangle size={14} className="text-rose-500 ml-auto" />}
                                        </div>
                                        {isTriggered && (
                                            <div className="mt-2 text-[10px] font-bold text-rose-500 flex items-center gap-1">
                                                <AlertTriangle size={10} />
                                                Valor Atual: {currentMetrics[rule.metric].toFixed(1)}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
