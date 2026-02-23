import React from 'react';
import { TrendingUp, TrendingDown, Minus, Sparkles, HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface Props {
  title: string;
  value: string | number;
  unit: string;
  trend?: number;
  meta?: number;
  icon: React.ReactNode;
  color: string;
  inverse?: boolean;
  indicator?: {
    label: string;
    value: string;
    color?: string;
    details?: Array<{ name: string, date: string }>;
  };
  helpText?: string;
}

// --- Componente de Tooltip Elegante ---
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div
      className="relative inline-flex items-center ml-1.5 align-middle select-none"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div className={`p-1 rounded-full transition-all duration-300 ${isVisible ? 'bg-blue-500 text-white scale-110' : 'bg-slate-100 text-slate-400'}`}>
        <HelpCircle className="w-2.5 h-2.5 cursor-help" />
      </div>
      {isVisible && (
        <div className="absolute bottom-full right-0 mb-3 w-72 p-4 bg-slate-800 text-white text-[13px] font-medium leading-relaxed rounded-2xl z-[1000] shadow-[0_20px_50px_rgba(0,0,0,0.3)] pointer-events-none border border-slate-700 animate-in fade-in zoom-in-95 slide-in-from-bottom-2">
          <div className="relative z-10 text-center break-words">{text}</div>
          <div className="absolute top-full right-3 -mt-1 border-[6px] border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
};

export const MetricCard: React.FC<Props> = ({ title, value, unit, trend, meta, icon, color, inverse = false, indicator, helpText }) => {
  let deviation = 0;
  let isGood = false;
  let showDeviation = false;

  if (meta !== undefined && meta > 0) {
    const numericValue = typeof value === 'string'
      ? parseFloat(value.replace(/\./g, '').replace(',', '.'))
      : value;

    if (!isNaN(numericValue)) {
      deviation = ((numericValue - meta) / meta) * 100;
      showDeviation = true;

      // Para produção, maior ou igual é bom. Para consumos (inverse), menor ou igual é bom.
      if (inverse) {
        isGood = numericValue <= meta;
      } else {
        isGood = numericValue >= meta;
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
    'text-indigo-600': 'from-indigo-500 to-purple-600',
    'text-slate-800': 'from-slate-700 to-slate-900',
    'text-yellow-600': 'from-yellow-400 to-amber-500',
    'text-orange-600': 'from-orange-500 to-red-600',
  };

  const gradient = gradientMap[color] || 'from-blue-500 to-indigo-600';

  return (
    <div className="group relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 transition-all hover:shadow-2xl hover:scale-105 z-10 hover:z-[999]">
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
              {deviation >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
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
        <div className="flex items-center mb-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">{title}</h3>
          {helpText && <InfoTooltip text={helpText} />}
        </div>

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
              {meta.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {unit}
            </span>
          </div>
        )}

        {/* Indicador Extra (ex: Impacto Setup ou Volume Aparado) */}
        {indicator && (
          <div className="mt-3 pt-3 border-t-2 border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{indicator.label}</span>
              <span className={`text-[11px] font-black leading-tight ${indicator.color || 'text-slate-600'}`}>
                {indicator.value}
              </span>
            </div>
            {indicator.details && indicator.details.length > 0 && (
              <div className="flex flex-col gap-1 mt-1 p-2 bg-slate-50/50 rounded-lg">
                {indicator.details.map((detail, idx) => (
                  <div key={idx} className="flex flex-col gap-0.5 text-[10px] pb-1 border-b border-slate-200/50 last:border-0 last:pb-0">
                    <span className="font-semibold text-slate-600 truncate" title={detail.name}>{detail.name}</span>
                    <div className="flex items-center text-left whitespace-nowrap">
                      <span className="font-medium text-amber-600">Término: {detail.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
