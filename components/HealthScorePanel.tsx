import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface HealthIssue {
    type: 'error' | 'warning' | 'info';
    message: string;
    deduction: number;
}

interface Props {
    score: number;
    issues: HealthIssue[];
}

export const HealthScorePanel: React.FC<Props> = ({ score, issues }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Color logic
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

    const circumference = 2 * Math.PI * 18; // r=18
    const offset = circumference - (score / 100) * circumference;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="group relative flex items-center gap-3 px-4 py-2 rounded-xl bg-white/50 hover:bg-white border border-white/60 hover:border-blue-100 transition-all shadow-sm hover:shadow-md"
            >
                <div className="relative w-10 h-10 flex items-center justify-center">
                    {/* Ring Background */}
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
                    <div className="glass-card w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
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
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="flex justify-center mb-8">
                                <div className="relative w-32 h-32 flex items-center justify-center">
                                    <svg className="transform -rotate-90 w-full h-full">
                                        <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                                        <circle
                                            cx="64" cy="64" r="58"
                                            stroke="currentColor" strokeWidth="8"
                                            fill="transparent"
                                            strokeDasharray={2 * Math.PI * 58}
                                            strokeDashoffset={2 * Math.PI * 58 - (score / 100) * 2 * Math.PI * 58}
                                            strokeLinecap="round"
                                            className={`${getColor(score)} transition-all duration-1000 ease-out`}
                                        />
                                    </svg>
                                    <div className="absolute text-center">
                                        <span className={`text-4xl font-black ${getColor(score)}`}>{Math.round(score)}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {issues.length === 0 ? (
                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-start gap-3">
                                        <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <h4 className="font-bold text-emerald-700 text-sm">Dados Perfeitos!</h4>
                                            <p className="text-emerald-600/80 text-xs mt-1">Todas as validações passaram com sucesso. Você pode confiar totalmente nesta simulação.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Problemas Encontrados</h4>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                            {issues.map((issue, idx) => (
                                                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-3 group hover:border-rose-200 transition-colors">
                                                    <div className="flex items-start gap-3">
                                                        {issue.type === 'error' ? (
                                                            <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                                                        ) : (
                                                            <Info className="text-amber-500 shrink-0 mt-0.5" size={16} />
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-700">{issue.message}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md shrink-0">
                                                        -{issue.deduction}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-4 text-center">
                            <p className="text-xs text-slate-400 font-medium">
                                A pontuação é calculada baseada na completude e consistência dos dados importados.
                            </p>
                            <button
                                onClick={() => setIsOpen(false)}
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
