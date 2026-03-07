import React from 'react';
import { Sparkles, TrendingDown, TrendingUp, AlertCircle, Lightbulb } from 'lucide-react';

interface InsightProps {
    insights: Array<{
        type: 'warning' | 'tip' | 'positive';
        text: string;
    }>;
}

export const SmartAnalyst: React.FC<InsightProps> = ({ insights }) => {
    if (insights.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900/50 dark:to-slate-900 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-500/10 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200/50">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">Analista Inteligente</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Insights automáticos do plano de produção</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.map((insight, idx) => (
                    <div
                        key={idx}
                        className={`p-5 rounded-[1.5rem] border flex gap-3 transition-all hover:scale-[1.02] ${insight.type === 'warning'
                                ? 'bg-rose-50 border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/20'
                                : insight.type === 'tip'
                                    ? 'bg-amber-50 border-amber-100 dark:bg-amber-500/5 dark:border-amber-500/20'
                                    : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20'
                            }`}
                    >
                        <div className={`mt-1 h-fit p-1.5 rounded-lg shrink-0 ${insight.type === 'warning' ? 'text-rose-600 bg-rose-100' :
                                insight.type === 'tip' ? 'text-amber-600 bg-amber-100' :
                                    'text-emerald-600 bg-emerald-100'
                            }`}>
                            {insight.type === 'warning' ? <AlertCircle size={14} /> :
                                insight.type === 'tip' ? <Lightbulb size={14} /> :
                                    <TrendingUp size={14} />}
                        </div>
                        <p className={`text-[13px] font-bold leading-relaxed ${insight.type === 'warning' ? 'text-rose-900 dark:text-rose-300' :
                                insight.type === 'tip' ? 'text-amber-900 dark:text-amber-300' :
                                    'text-emerald-900 dark:text-emerald-300'
                            }`}>
                            {insight.text}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};
