import React, { useState, useEffect, useMemo } from 'react';
import { Bell, AlertTriangle, Check, X, Settings, TrendingUp, TrendingDown } from 'lucide-react';

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
    forecastMetrics?: {
        rendimento: number;
        gas: number;
        energia: number;
        producao: number;
    };
    goals?: {
        rendimento: number;
        gas: number;
        energia: number;
        producao: number;
    };
}

export const SmartAlerts: React.FC<Props> = ({ rules, onUpdateRules, currentMetrics, forecastMetrics, goals }) => {
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

    const predictiveAlerts = useMemo(() => {
        if (!forecastMetrics || !goals) return [];
        const alerts: { metric: string; msg: string; type: 'warning' | 'critical'; suggestion: string }[] = [];

        // Energia (Goal is MAX)
        if (forecastMetrics.energia > goals.energia) {
            const diff = ((forecastMetrics.energia - goals.energia) / goals.energia) * 100;
            alerts.push({
                metric: 'ENERGIA',
                msg: `Tendência de estouro: +${diff.toFixed(1)}% vs Meta`,
                type: diff > 5 ? 'critical' : 'warning',
                suggestion: `Reduzir consumo médio para ${(goals.energia - (forecastMetrics.energia - goals.energia)).toFixed(1)} kWh/t`
            });
        }

        // Gás (Goal is MAX)
        if (forecastMetrics.gas > goals.gas) {
            const diff = ((forecastMetrics.gas - goals.gas) / goals.gas) * 100;
            alerts.push({
                metric: 'GÁS',
                msg: `Tendência de estouro: +${diff.toFixed(1)}% vs Meta`,
                type: diff > 5 ? 'critical' : 'warning',
                suggestion: `Reduzir consumo médio para ${(goals.gas - (forecastMetrics.gas - goals.gas)).toFixed(1)} m³/t`
            });
        }

        // Rendimento (Goal is MIN)
        if (forecastMetrics.rendimento < goals.rendimento) {
            const diff = goals.rendimento - forecastMetrics.rendimento;
            alerts.push({
                metric: 'RENDIMENTO',
                msg: `Tendência de queda: -${diff.toFixed(1)}% vs Meta`,
                type: diff > 1 ? 'critical' : 'warning',
                suggestion: `Aumentar rendimento para ${(goals.rendimento + diff).toFixed(1)}%`
            });
        }

        // Produção (Goal is MIN)
        if (forecastMetrics.producao < goals.producao) {
            const diff = ((goals.producao - forecastMetrics.producao) / goals.producao) * 100;
            alerts.push({
                metric: 'PRODUÇÃO',
                msg: `Tendência de baixa: -${diff.toFixed(1)}% vs Meta`,
                type: diff > 10 ? 'critical' : 'warning',
                suggestion: `Aumentar ritmo médio`
            });
        }


        return alerts;
    }, [forecastMetrics, goals]);

    const activeReactiveAlertsCount = localRules.filter(checkAlert).length;
    const totalAlerts = activeReactiveAlertsCount + predictiveAlerts.length;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl transition-all ${totalAlerts > 0 ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                title="Smart Alerts 2.0"
            >
                <Bell size={18} />
                {totalAlerts > 0 && (
                    <span className={`absolute -top-1 -right-1 flex h-4 w-4 rounded-full items-center justify-center text-[10px] text-white font-bold border-2 border-white ${predictiveAlerts.some(a => a.type === 'critical') ? 'bg-rose-600' : 'bg-amber-500'}`}>
                        {totalAlerts}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-0 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                                <Settings size={16} className="text-blue-600" />
                                Smart Alerts 2.0
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        </div>

                        <div className="max-h-[80vh] overflow-y-auto p-4 space-y-6">

                            {/* Predictive Alerts Section */}
                            {predictiveAlerts.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                        <TrendingUp size={12} /> Tendências Futuras (Previsão)
                                    </h4>
                                    <div className="space-y-3">
                                        {predictiveAlerts.map((alert, idx) => (
                                            <div key={idx} className={`p-4 rounded-xl border-l-4 shadow-sm ${alert.type === 'critical' ? 'bg-rose-50 border-rose-500' : 'bg-amber-50 border-amber-400'}`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-xs font-black ${alert.type === 'critical' ? 'text-rose-700' : 'text-amber-700'}`}>{alert.metric}</span>
                                                    {alert.type === 'critical' && <AlertTriangle size={14} className="text-rose-500" />}
                                                </div>
                                                <p className="text-sm font-bold text-slate-700 mb-2">{alert.msg}</p>
                                                <div className="text-xs bg-white/50 p-2 rounded-lg font-medium text-slate-600 border border-black/5">
                                                    💡 Sugestão: {alert.suggestion}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reactive (Standard) Alerts Section */}
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                    <Bell size={12} /> Monitoramento em Tempo Real
                                </h4>
                                <div className="space-y-3">
                                    {localRules.map(rule => {
                                        const isTriggered = checkAlert(rule);
                                        return (
                                            <div key={rule.id} className={`p-3 rounded-xl border transition-all ${isTriggered ? 'bg-rose-50 border-rose-100 shadow-sm' : 'bg-white border-slate-100'}`}>
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
                                                    <span className="text-slate-600">Limite</span>
                                                    <span className="font-mono bg-slate-50 px-1.5 rounded text-xs border border-slate-200 font-bold text-slate-700">
                                                        {rule.condition === 'less_than' ? '<' : '>'}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        value={rule.value}
                                                        onChange={(e) => handleChangeValue(rule.id, Number(e.target.value))}
                                                        className="w-20 px-2 py-1 text-center font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                                    />
                                                    {isTriggered && <AlertTriangle size={14} className="text-rose-500 ml-auto animate-pulse" />}
                                                </div>
                                                {isTriggered && (
                                                    <div className="mt-2 pt-2 border-t border-rose-100 text-xs font-bold text-rose-600 flex items-center gap-1">
                                                        <AlertTriangle size={12} />
                                                        Valor Atual: {currentMetrics[rule.metric].toFixed(1)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
