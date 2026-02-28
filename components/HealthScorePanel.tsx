import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Info, X, ChevronDown, ChevronUp, Save, Loader } from 'lucide-react';
import { updateMetasInSupabase } from '../services/supabaseClient';

interface HealthIssue {
    type: 'error' | 'warning' | 'info';
    message: string;
    deduction: number;
}

interface Props {
    score: number;
    issues: HealthIssue[];
    missingSaps?: string[];
    pcpData?: any[];
    onMetaSaved?: () => void;
}

interface MetaForm {
    gas: string;
    energia: string;
    rm: string;
}

export const HealthScorePanel: React.FC<Props> = ({ score, issues, missingSaps = [], pcpData = [], onMetaSaved }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedIssue, setExpandedIssue] = useState<number | null>(null);
    const [metaForms, setMetaForms] = useState<Record<string, MetaForm>>({});
    const [saving, setSaving] = useState<Record<string, boolean>>({});
    const [saved, setSaved] = useState<Record<string, boolean>>({});
    const [error, setError] = useState<Record<string, string>>({});

    const getColor = (s: number) => {
        if (s >= 90) return 'text-emerald-500';
        if (s >= 70) return 'text-amber-500';
        return 'text-rose-500';
    };

    const getBgColor = (s: number) => {
        if (s >= 90) return 'bg-emerald-500';
        if (s >= 70) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    const isMissingMetaIssue = (issue: HealthIssue) =>
        issue.type === 'error' && issue.message.toLowerCase().includes('sem meta');

    const getProductInfo = (sap: string) => {
        const row = pcpData.find(r => {
            const rowSap = String(
                r.sap || r['Código SAP2'] || r['Código SAP'] || r.SAP || r.op || ''
            ).trim();
            return rowSap === sap || rowSap.replace(/^0+/, '') === sap;
        });
        if (!row) return { desc: sap, bitola: '' };
        const desc = String(row.descricao || row['Descrição'] || row['Descrição MP'] || sap).trim();
        const bitola = String(row.bitola || row['Bitolas'] || '').trim();
        return { desc, bitola };
    };

    const handleFormChange = (sap: string, field: keyof MetaForm, value: string) => {
        setMetaForms(prev => ({
            ...prev,
            [sap]: { ...prev[sap], gas: prev[sap]?.gas ?? '', energia: prev[sap]?.energia ?? '', rm: prev[sap]?.rm ?? '', [field]: value }
        }));
        setSaved(prev => ({ ...prev, [sap]: false }));
        setError(prev => ({ ...prev, [sap]: '' }));
    };

    const handleSave = async (sap: string) => {
        const form = metaForms[sap];
        if (!form) return;

        const gas = parseFloat(form.gas);
        const energia = parseFloat(form.energia);
        const rm = parseFloat(form.rm);

        if ((!form.gas && !form.energia && !form.rm)) {
            setError(prev => ({ ...prev, [sap]: 'Preencha pelo menos um campo.' }));
            return;
        }

        setSaving(prev => ({ ...prev, [sap]: true }));
        setError(prev => ({ ...prev, [sap]: '' }));

        try {
            const payload: any = { sap };
            if (!isNaN(gas) && form.gas) payload.gas = gas;
            if (!isNaN(energia) && form.energia) payload.energia = energia;
            if (!isNaN(rm) && form.rm) payload.rm = rm;

            await updateMetasInSupabase([payload]);
            setSaved(prev => ({ ...prev, [sap]: true }));
            onMetaSaved?.();
        } catch (err: any) {
            setError(prev => ({ ...prev, [sap]: 'Erro ao salvar. Tente novamente.' }));
        } finally {
            setSaving(prev => ({ ...prev, [sap]: false }));
        }
    };

    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (score / 100) * circumference;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="group relative flex items-center gap-3 px-4 py-2 rounded-xl bg-white/50 hover:bg-white border border-white/60 hover:border-blue-100 transition-all shadow-sm hover:shadow-md"
            >
                <div className="relative w-10 h-10 flex items-center justify-center">
                    <svg className="transform -rotate-90 w-full h-full">
                        <circle
                            cx="20" cy="20" r="18"
                            stroke="currentColor" strokeWidth="3"
                            fill="transparent"
                            className="text-slate-200"
                        />
                        <circle
                            cx="20" cy="20" r="18"
                            stroke="currentColor" strokeWidth="3"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className={`${getColor(score)} transition-all duration-1000 ease-out`}
                        />
                    </svg>
                    <span className={`absolute text-[10px] font-black ${getColor(score)}`}>
                        {Math.round(score)}
                    </span>
                </div>
                <div className="text-left hidden md:block">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Confiabilidade</span>
                    <span className={`text-sm font-black ${getColor(score)}`}>
                        {score >= 90 ? 'Excelente' : score >= 70 ? 'Atenção' : 'Crítico'}
                    </span>
                </div>
            </button>

            {/* Modal de Detalhes */}
            {isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="glass-card w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Header do Modal */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-xl ${getBgColor(score)} bg-opacity-10 ${getColor(score)}`}>
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Saúde dos Dados</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Diagnóstico de Qualidade</p>
                                </div>
                            </div>
                            <button onClick={() => { setIsOpen(false); setExpandedIssue(null); }} className="p-2 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Score Ring */}
                        <div className="px-8 pt-8 pb-4">
                            <div className="flex justify-center mb-6">
                                <div className="relative w-28 h-28 flex items-center justify-center">
                                    <svg className="transform -rotate-90 w-full h-full">
                                        <circle cx="56" cy="56" r="50" stroke="currentColor" strokeWidth="7" fill="transparent" className="text-slate-100" />
                                        <circle
                                            cx="56" cy="56" r="50"
                                            stroke="currentColor" strokeWidth="7"
                                            fill="transparent"
                                            strokeDasharray={2 * Math.PI * 50}
                                            strokeDashoffset={2 * Math.PI * 50 - (score / 100) * 2 * Math.PI * 50}
                                            strokeLinecap="round"
                                            className={`${getColor(score)} transition-all duration-1000 ease-out`}
                                        />
                                    </svg>
                                    <div className="absolute text-center">
                                        <span className={`text-3xl font-black ${getColor(score)}`}>{Math.round(score)}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Issues List */}
                            <div className="space-y-2 mb-4">
                                {issues.length === 0 ? (
                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                                        <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <h4 className="font-bold text-emerald-700 text-sm">Dados Perfeitos!</h4>
                                            <p className="text-emerald-600/80 text-xs mt-1">Todas as validações passaram com sucesso.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Problemas Encontrados</h4>
                                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                                            {issues.map((issue, idx) => {
                                                const isMissing = isMissingMetaIssue(issue);
                                                const isExpanded = expandedIssue === idx;

                                                return (
                                                    <div key={idx} className="rounded-xl border border-slate-100 overflow-hidden">
                                                        {/* Issue Row */}
                                                        <div
                                                            className={`p-3 bg-slate-50 flex items-start justify-between gap-3 ${isMissing ? 'cursor-pointer hover:bg-rose-50/50 hover:border-rose-200 transition-colors' : ''}`}
                                                            onClick={() => isMissing && setExpandedIssue(isExpanded ? null : idx)}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                {issue.type === 'error' ? (
                                                                    <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                                                                ) : (
                                                                    <Info className="text-amber-500 shrink-0 mt-0.5" size={16} />
                                                                )}
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-700">{issue.message}</p>
                                                                    {isMissing && (
                                                                        <p className="text-xs text-rose-500 font-medium mt-0.5">
                                                                            {isExpanded ? 'Clique para fechar' : 'Clique para ver e preencher as metas'}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-xs font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md">
                                                                    -{issue.deduction}%
                                                                </span>
                                                                {isMissing && (
                                                                    <span className="text-slate-400">
                                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Expandable: Lista de produtos sem meta */}
                                                        {isMissing && isExpanded && missingSaps.length > 0 && (
                                                            <div className="border-t border-rose-100 bg-white">
                                                                <div className="px-4 py-3 bg-rose-50/60 border-b border-rose-100">
                                                                    <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                                                                        📋 Preencha as metas abaixo — serão salvas no banco
                                                                    </p>
                                                                </div>
                                                                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                                                                    {missingSaps.map((sap) => {
                                                                        const { desc, bitola } = getProductInfo(sap);
                                                                        const form = metaForms[sap] || { gas: '', energia: '', rm: '' };
                                                                        const isSaving = saving[sap];
                                                                        const isSaved = saved[sap];
                                                                        const errMsg = error[sap];

                                                                        return (
                                                                            <div key={sap} className="p-4">
                                                                                {/* Produto Info */}
                                                                                <div className="flex items-center justify-between mb-3">
                                                                                    <div>
                                                                                        <p className="text-sm font-black text-slate-800">{desc !== sap ? desc : sap}</p>
                                                                                        <p className="text-xs text-slate-400 font-mono">
                                                                                            SAP: {sap}{bitola ? ` · Bitola: ${bitola}` : ''}
                                                                                        </p>
                                                                                    </div>
                                                                                    {isSaved && (
                                                                                        <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg">
                                                                                            <CheckCircle size={12} />
                                                                                            Salvo!
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Formulário Inline */}
                                                                                <div className="grid grid-cols-3 gap-2 mb-2">
                                                                                    <div>
                                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                                                            Gás (m³/t)
                                                                                        </label>
                                                                                        <input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            min="0"
                                                                                            placeholder="ex: 35.5"
                                                                                            value={form.gas}
                                                                                            onChange={e => handleFormChange(sap, 'gas', e.target.value)}
                                                                                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                                                            Energia (kWh/t)
                                                                                        </label>
                                                                                        <input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            min="0"
                                                                                            placeholder="ex: 120"
                                                                                            value={form.energia}
                                                                                            onChange={e => handleFormChange(sap, 'energia', e.target.value)}
                                                                                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all"
                                                                                        />
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                                                            RM (%)
                                                                                        </label>
                                                                                        <input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            min="0"
                                                                                            max="100"
                                                                                            placeholder="ex: 96.5"
                                                                                            value={form.rm}
                                                                                            onChange={e => handleFormChange(sap, 'rm', e.target.value)}
                                                                                            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all"
                                                                                        />
                                                                                    </div>
                                                                                </div>

                                                                                {errMsg && (
                                                                                    <p className="text-xs text-rose-500 font-medium mb-2">{errMsg}</p>
                                                                                )}

                                                                                <button
                                                                                    onClick={() => handleSave(sap)}
                                                                                    disabled={isSaving || isSaved}
                                                                                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${isSaved
                                                                                            ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                                                                            : 'bg-rose-600 hover:bg-rose-700 text-white hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed'
                                                                                        }`}
                                                                                >
                                                                                    {isSaving ? (
                                                                                        <><Loader size={12} className="animate-spin" /> Salvando...</>
                                                                                    ) : isSaved ? (
                                                                                        <><CheckCircle size={12} /> Meta Salva</>
                                                                                    ) : (
                                                                                        <><Save size={12} /> Salvar Meta</>
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Se o issue for "sem meta" mas missingSaps estiver vazio */}
                                                        {isMissing && isExpanded && missingSaps.length === 0 && (
                                                            <div className="p-4 bg-white border-t border-slate-100 text-center">
                                                                <p className="text-sm text-slate-500">Nenhum produto identificado. Recarregue os dados.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-8 pb-6 bg-slate-50/50 border-t border-slate-100 pt-4 flex flex-col gap-3 text-center">
                            <p className="text-xs text-slate-400 font-medium">
                                A pontuação é calculada baseada na completude e consistência dos dados importados.
                            </p>
                            <button
                                onClick={() => { setIsOpen(false); setExpandedIssue(null); }}
                                className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
