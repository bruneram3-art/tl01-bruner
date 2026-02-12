import React from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  unit: string;
  trend?: number;
  meta?: number;
  icon: React.ReactNode;
  color: string;
  inverse?: boolean;
}

export const MetricCard: React.FC<Props> = ({ title, value, unit, trend, meta, icon, color, inverse = false }) => {
  let deviation = 0;
  let isGood = false;
  let showDeviation = false;

  if (meta !== undefined && meta > 0) {
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    if (!isNaN(numericValue)) {
      deviation = ((numericValue - meta) / meta) * 100;
      showDeviation = true;
      if (inverse) {
        isGood = deviation <= 0;
      } else {
        isGood = deviation >= 0;
      }
    }
  }

  // Mapear cores para gradientes
  const gradientMap: Record<string, string> = {
    'text-blue-600': 'from-blue-500 to-indigo-600',
    'text-emerald-600': 'from-emerald-500 to-teal-600',
    'text-amber-600': 'from-amber-500 to-orange-600',
    'text-purple-600': 'from-purple-500 to-pink-600',
    'text-rose-600': 'from-rose-500 to-red-600',
    'text-cyan-600': 'from-cyan-500 to-blue-600',
  };

  const gradient = gradientMap[color] || 'from-blue-500 to-indigo-600';

  return (
    <div className="group relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 transition-all hover:shadow-2xl hover:scale-105 overflow-hidden">
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-all duration-300 rounded-3xl`}></div>

      <div className="relative">
        {/* Header com Icon e Trend */}
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg shadow-${color.split('-')[1]}-200/50 group-hover:scale-110 transition-all`}>
            {React.cloneElement(icon as React.ReactElement, { className: 'text-white', size: 24, strokeWidth: 2.5 })}
          </div>

          {/* Desvio da Meta ou Trend */}
          {showDeviation ? (
            <div className={`flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full shadow-md ${isGood
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                : 'bg-gradient-to-r from-rose-500 to-red-500 text-white animate-pulse'
              }`}>
              {deviation > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(deviation).toFixed(1)}%
              {!isGood && <span className="ml-1">⚠️</span>}
            </div>
          ) : trend !== undefined && (
            <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${trend > 0
                ? 'bg-emerald-50 text-emerald-600'
                : trend < 0
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-slate-100 text-slate-500'
              }`}>
              {trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        {/* Título */}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{title}</h3>

        {/* Valor Principal */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className={`text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${gradient}`}>
            {value}
          </span>
          <span className="text-lg font-semibold text-slate-400">{unit}</span>
        </div>

        {/* Meta (se houver) */}
        {meta !== undefined && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t-2 border-slate-100">
            <Sparkles size={12} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase">Meta:</span>
            <span className="text-sm font-black text-slate-700">
              {meta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {unit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
