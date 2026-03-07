import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Info, ChevronDown } from 'lucide-react';

interface HealthProps {
    score: number;
    issues: {
        missingMetas: number;
        dateErrors: number;
        totalOrders: number;
    };
}

export const HealthIndicator: React.FC<HealthProps> = ({ score, issues }) => {
    const isGood = score >= 95;
    const isWarning = score < 95 && score >= 80;

    const colorClass = isGood
        ? 'bg-emerald-500 text-white shadow-emerald-200'
        : isWarning
            ? 'bg-amber-500 text-white shadow-amber-200'
            : 'bg-rose-500 text-white shadow-rose-200';

    const [showDetails, setShowDetails] = React.useState(false);

    return (
        <div className="relative">
            <div
                onClick={() => setShowDetails(!showDetails)}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg ${colorClass}`}
            >
                {isGood ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Saúde dos Dados</span>
                    <span className="text-lg font-black">{score.toFixed(0)}%</span>
                </div>
                <ChevronDown size={16} className={`transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </div>

            {showDetails && (
                <div className="absolute top-full right-0 mt-4 w-72 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 z-50 animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                        <Info size={14} className="text-blue-500" /> Diagnóstico Técnico
                    </h4>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-500 uppercase">Total de Ordens</span>
                            <span className="font-black text-slate-800 dark:text-white">{issues.totalOrders}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-500 uppercase">Itens sem Meta</span>
                            <span className={`font-black ${issues.missingMetas > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {issues.missingMetas}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-500 uppercase">Erros de Data</span>
                            <span className={`font-black ${issues.dateErrors > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {issues.dateErrors}
                            </span>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-medium text-slate-400 italic leading-relaxed">
                                {score === 100
                                    ? "Excelente! Todos os dados estão íntegros e mapeados."
                                    : "Atenção: Dados incompletos podem distorcer as simulações de custo e produtividade."}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
