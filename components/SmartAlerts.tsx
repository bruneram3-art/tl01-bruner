import React, { useState, useEffect, useMemo } from 'react';
import { Bell, AlertTriangle, X, Save, MessageSquare, Target, Activity, Trash2 } from 'lucide-react';
import { saveKPIJustification, getKPIJustifications, deleteKPIJustification } from '../services/supabaseClient';

interface Props {
    currentMetrics?: {
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
    monthRef?: string;
}

export const SmartAlerts: React.FC<Props> = ({ currentMetrics, forecastMetrics, goals, monthRef = new Date().toISOString().slice(0, 7) }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [justifications, setJustifications] = useState<Record<string, string>>({});
    const [savingKPI, setSavingKPI] = useState<string | null>(null);

    // Buscar justificativas existentes ao carregar ou mudar o mês
    const loadJustifications = async () => {
        if (monthRef) {
            const data = await getKPIJustifications(monthRef);
            const map: Record<string, string> = {};
            data.forEach((item: any) => {
                map[item.kpi_type] = item.justification;
            });
            setJustifications(map);
        }
    };

    useEffect(() => {
        loadJustifications();
    }, [monthRef]);

    const handleSaveJustification = async (kpi: string) => {
        const text = justifications[kpi];
        if (!text) return;
        setSavingKPI(kpi);
        try {
            await saveKPIJustification(kpi, text, monthRef);
            alert('Justificativa salva com sucesso!');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar justificativa.');
        } finally {
            setSavingKPI(null);
        }
    };

    const handleDeleteJustification = async (kpi: string) => {
        if (!confirm('Deseja realmente excluir esta justificativa?')) return;
        setSavingKPI(kpi);
        try {
            await deleteKPIJustification(kpi, monthRef);
            setJustifications(prev => {
                const next = { ...prev };
                delete next[kpi];
                return next;
            });
            alert('Justificativa removida!');
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir justificativa.');
        } finally {
            setSavingKPI(null);
        }
    };

    // --- LOGICA DE ALERTAS AUTOMATICOS (ORÇAMENTO) ---
    const activeAlerts = useMemo(() => {
        if (!currentMetrics || !goals) return [];
        const alerts: { kpi: string; label: string; real: number; meta: number; unit: string; type: 'critical' | 'warning' }[] = [];

        // 1. Rendimento (Menor que Meta = Alerta)
        if (currentMetrics.rendimento > 0 && currentMetrics.rendimento < goals.rendimento) {
            alerts.push({ kpi: 'rendimento', label: 'Rendimento', real: currentMetrics.rendimento, meta: goals.rendimento, unit: '%', type: 'critical' });
        }

        // 2. Gás (Maior que Meta = Alerta)
        if (currentMetrics.gas > goals.gas && goals.gas > 0) {
            alerts.push({ kpi: 'gas', label: 'Consumo Gás', real: currentMetrics.gas, meta: goals.gas, unit: 'm³/t', type: 'critical' });
        }

        // 3. Energia (Maior que Meta = Alerta)
        if (currentMetrics.energia > goals.energia && goals.energia > 0) {
            alerts.push({ kpi: 'energia', label: 'Consumo Energia', real: currentMetrics.energia, meta: goals.energia, unit: 'kWh/t', type: 'critical' });
        }

        // 4. Produção (Menor que Meta PCP acumulada = Alerta)
        if (currentMetrics.producao > 0 && currentMetrics.producao < goals.producao) {
            alerts.push({ kpi: 'producao', label: 'Volume Produção', real: currentMetrics.producao, meta: goals.producao, unit: 't', type: 'warning' });
        }

        return alerts;
    }, [currentMetrics, goals]);

    const totalAlertCount = activeAlerts.length;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-2xl transition-all duration-300 ${totalAlertCount > 0
                    ? 'bg-rose-50 text-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.2)] animate-pulse border border-rose-200'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'}`}
                title="Alertas de Orçamento"
            >
                <Bell size={20} strokeWidth={2.5} />
                {totalAlertCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 rounded-full items-center justify-center text-[10px] text-white font-black bg-rose-600 border-2 border-white shadow-lg">
                        {totalAlertCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-14 w-[420px] bg-white rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-slate-100 z-50 p-0 animate-in fade-in zoom-in-95 slide-in-from-top-4 overflow-hidden">

                        {/* Header do Modal */}
                        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-white text-lg flex items-center gap-2">
                                    <Target size={20} className="text-rose-500" />
                                    Desvios de Orçamento (PCP)
                                </h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Mês de Ref: {monthRef}</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                            {activeAlerts.length === 0 ? (
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Activity size={32} />
                                    </div>
                                    <p className="text-slate-500 font-bold">Tudo sob controle!</p>
                                    <p className="text-slate-400 text-xs mt-1">Nenhum desvio detectado contra o orçamento.</p>
                                </div>
                            ) : (
                                activeAlerts.map((alert, idx) => (
                                    <div key={idx} className={`p-5 rounded-3xl border transition-all ${alert.type === 'critical' ? 'bg-white border-rose-100 shadow-sm' : 'bg-white border-amber-100 shadow-sm'}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${alert.type === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    <AlertTriangle size={18} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-tight">{alert.label}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-rose-500 font-bold text-sm">{alert.real.toFixed(1)}{alert.unit}</span>
                                                        <span className="text-slate-300 text-xs">vs</span>
                                                        <span className="text-slate-500 font-bold text-xs">Meta {alert.meta.toFixed(1)}{alert.unit}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${alert.type === 'critical' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                                                Fora do Plano
                                            </div>
                                        </div>

                                        {/* Área de Justificativa */}
                                        <div className="space-y-3 pt-4 border-t border-slate-50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <MessageSquare size={12} className="text-blue-500" />
                                                    Justificativa do Desvio
                                                </div>
                                                {justifications[alert.kpi] && (
                                                    <button
                                                        onClick={() => handleDeleteJustification(alert.kpi)}
                                                        className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-all"
                                                        title="Excluir Justificativa"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            <textarea
                                                value={justifications[alert.kpi] || ''}
                                                onChange={(e) => setJustifications({ ...justifications, [alert.kpi]: e.target.value })}
                                                placeholder="Descreva o motivo deste desvio..."
                                                className="w-full p-4 text-xs bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-300 outline-none resize-none h-24 transition-all"
                                            />
                                            <button
                                                onClick={() => handleSaveJustification(alert.kpi)}
                                                disabled={savingKPI === alert.kpi}
                                                className="w-full py-3 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                            >
                                                {savingKPI === alert.kpi ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <><Save size={14} /> SALVAR JUSTIFICATIVA</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer informativo */}
                        <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                Monitoramento Automático vs Orçamento
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
