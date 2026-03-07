
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import {
  Flame, Zap, Boxes, Clock, Activity, CheckCircle,
  UploadCloud, Calendar, Database, FileText, Info,
  BarChart4, Percent, PlayCircle, Weight, Timer, BarChart3, HelpCircle, Target, Trophy, Sparkles
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Line, Legend,
  ReferenceLine, ReferenceDot, Label
} from 'recharts';
import * as XLSX from 'xlsx';
import { DashboardHeader } from './components/DashboardHeader';
import { MetricCard } from './components/MetricCard';
import { CostConfigModal } from './components/CostConfigModal';
import { ScenarioSimulator } from './components/ScenarioSimulator';
import {
  getMetasFromSupabase,
  updateMetasInSupabase,
  ensureTableColumns,
  getPcpFromSupabase,
  savePcpToSupabase,
  supabase
} from './services/supabaseClient';
import { getSyncQueue, clearSyncQueueItem, initDB } from './services/db';
import { ScenarioComparator } from './components/ScenarioComparator';
import { PcpDetailView } from './components/PcpDetailView';
import { MetallicYieldSimulator } from './components/MetallicYieldSimulator';
import { PodcastView } from './components/PodcastView';
import { MonthlySimulator } from './components/MonthlySimulator';
import { AnnualBudget } from './components/AnnualBudget';
import { HRSSimulator } from './src/pages/HRSSimulator';
import { getBudgetForDate } from './services/BudgetService';


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

// --- Componente de Cartão de Previsão ---
interface ForecastCardProps {
  title: string;
  value: number;
  ritmo: number;
  unit: string;
  icon: React.ReactNode;
  colorClass: string;
  onValueChange: (v: number) => void;
  showSpecific?: boolean;
  specUnit?: string;
  producaoAcumulada: number;
  meta?: number;
  plannedValue?: number; // Valor Planejado (PCP) até a data
  plannedProduction?: number; // Produção Planejada (PCP) até a data
  futureProduction?: number; // Produção Futura Planejada
  futureRM?: number; // Rendimento Médio Futuro Planejado
  price?: number;
  isYield?: boolean;
}

const ForecastCard: React.FC<ForecastCardProps> = ({
  title, value, ritmo, unit, icon, colorClass, onValueChange, showSpecific, specUnit, producaoAcumulada, meta, plannedValue, plannedProduction, futureProduction, futureRM, price, isYield
}) => {
  const [localValue, setLocalValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const valNum = parseFloat(localValue.replace(/\./g, '').replace(',', '.')) || 0;
    if (!isFocused && Math.abs(valNum - value) > 0.01) {
      setLocalValue(value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove tudo que não é número, vírgula ou ponto
    const raw = e.target.value.replace(/[^\d.,]/g, '');
    if (raw.length > 10) return;
    setLocalValue(raw);
  };

  const commitChange = () => {
    setIsFocused(false);
    // Limpa pontos de milhar e troca vírgula por ponto
    const cleaned = localValue.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      onValueChange(num);
      setLocalValue(Math.round(num).toString());
    } else if (localValue === "") {
      onValueChange(0);
      setLocalValue('0');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const currentNumValue = parseFloat(localValue.replace(/\./g, '').replace(',', '.')) || 0;

  // Valor formatado para exibição
  const displayValue = isFocused ? localValue : currentNumValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: isYield ? 2 : 1
  });
  const specAcum = (producaoAcumulada > 0 && !isYield) ? currentNumValue / producaoAcumulada : 0;

  // Box 2: Meta PCP (Esp.) - Usando a produção planejada do passado
  const specMeta = (plannedProduction && plannedProduction > 0 && !isYield) ? (plannedValue || 0) / plannedProduction : (meta || 0);

  // Box 3: Previsão Fechamento (Esp.)
  const totalProdForecast = producaoAcumulada + (futureProduction || 0);
  let specForecast = 0;

  if (isYield) {
    // Para Rendimento, fazemos a média ponderada entre o Real do passado e o Meta do futuro
    specForecast = totalProdForecast > 0
      ? (currentNumValue * producaoAcumulada + (futureRM || 0) * (futureProduction || 0)) / totalProdForecast
      : (meta || 0);
  } else {
    // Para Consumos (Gás/Energia), somamos os volumes (Real + Futuro) e dividimos pela produção total
    specForecast = totalProdForecast > 0 ? (currentNumValue + ritmo) / totalProdForecast : 0;
  }

  // Cálculo de Desperdício Financeiro
  let wasteCost = 0;
  let isWaste = false;

  if (meta && price && producaoAcumulada > 0) {
    if (isYield) {
      if (currentNumValue > 0 && currentNumValue < meta) {
        isWaste = true;
        const cargaReal = producaoAcumulada / (currentNumValue / 100);
        const cargaTeorica = producaoAcumulada / (meta / 100);
        const perdaTon = cargaReal - cargaTeorica;
        wasteCost = perdaTon * price;
      }
    } else {
      if (specAcum > meta) {
        isWaste = true;
        const diffSpec = specAcum - meta;
        const excessoTotal = diffSpec * producaoAcumulada;
        wasteCost = excessoTotal * price;
      }
    }
  }

  // Proteção contra valores infinitos ou NaN
  if (!isFinite(wasteCost) || isNaN(wasteCost)) {
    wasteCost = 0;
    isWaste = false;
  }

  return (
    <div className="glass-card rounded-[2rem] relative group z-10 hover:z-[999] transition-all duration-300">
      <div className={`h-1.5 w-full ${colorClass} opacity-80 rounded-t-[2rem]`} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 text-current`}>{icon}</div>
            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">{title}</h3>
          </div>
          <div className="flex flex-col items-end gap-1">
            {price && currentNumValue > 0 && (
              <div className={`px-3 py-1.5 rounded-xl border ${isWaste && wasteCost > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'} transition-all`}>
                <span className={`text-[9px] font-black uppercase tracking-widest block ${isWaste && wasteCost > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {isWaste && wasteCost > 0 ? 'Desperdício' : 'Custo Acumulado'}
                </span>
                <span className={`text-sm font-black ${isWaste && wasteCost > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {isWaste && wasteCost > 0 ? '- ' : ''}R$ {(isWaste && wasteCost > 0 ? wasteCost : (currentNumValue * price)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}
            {!isWaste && price && (
              <span className="text-[10px] font-bold text-slate-400 mr-2">
                Total Proj: R$ {((currentNumValue + ritmo) * price).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {/* Linha 1: Acumulado Real (Destaque total para o campo de input) */}
          <div className="space-y-1">
            <div className="flex items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Acumulado Real</span>
              <InfoTooltip text="Volume total registrado do início do mês até a data de hoje." />
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border-2 border-transparent focus-within:border-blue-400 focus-within:bg-white transition-all shadow-sm">
              <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleInputChange}
                onBlur={commitChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-3xl font-black text-slate-900 outline-none"
              />
              <span className="text-sm font-bold text-slate-400 bg-white px-2 py-1 rounded-lg shadow-sm shrink-0">{unit}</span>
            </div>
          </div>

          {/* Linha 2: Meta e Previsão (Lado a lado com mais espaço) */}
          <div className="grid grid-cols-2 gap-4 divide-x divide-slate-100">
            <div className="space-y-1">
              <div className="flex items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Meta (PCP)</span>
                <InfoTooltip text="Objetivo definido pelo PCP para o acumulado do mês." />
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black ${plannedValue && currentNumValue >= plannedValue ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {plannedValue ? Math.round(plannedValue).toLocaleString() : '-'}
                </span>
                <span className="text-xs font-bold text-slate-300">{unit}</span>
              </div>
            </div>

            <div className="space-y-1 pl-4">
              <div className="flex items-center">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block">Prev. Fechamento</span>
                <InfoTooltip text="Estimativa do valor final do mês com base no ritmo e projeções." />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-600">
                  {isYield
                    ? ritmo.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
                    : (currentNumValue + ritmo).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs font-bold text-blue-300">{unit}</span>
              </div>
            </div>
          </div>
        </div>

        {(showSpecific || isYield) && (
          <div className="mt-6 pt-6 border-t border-slate-50">
            <div className="grid grid-cols-3 gap-2 px-1">
              <div>
                <div className="flex items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">Real</span>
                  <InfoTooltip text="Consumo ou rendimento real por tonelada produzida (Mês)." />
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-lg font-black ${isWaste ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {(isYield ? currentNumValue : specAcum).toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{specUnit || unit}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">Meta (PCP)</span>
                  <InfoTooltip text="Objetivo de consumo específico ou rendimento definido pelo plano." />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-slate-500">
                    {specMeta.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{specUnit || unit}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center">
                  <span className="text-[10px] font-bold text-blue-500 uppercase block truncate">Previsão</span>
                  <InfoTooltip text="Expectativa de fechamento do indicador específico ao fim do mês." />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-black text-blue-600">
                    {specForecast.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] font-bold text-blue-300">{specUnit || unit}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Componente Dashboard Wrapper (Antigo App Content) ---
const DashboardWrapper: React.FC = () => {
  const navigate = useNavigate(); // Hook de navegação
  const [pcpData, setPcpData] = useState<any[]>([]);
  const [pcpSecondary, setPcpSecondary] = useState<any[]>([]);
  const [diarioBordoData, setDiarioBordoData] = useState<any[]>([]);
  const [metaData, setMetaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [metaFileName, setMetaFileName] = useState<string>("");
  const [currentView, setCurrentView] = useState<'dashboard' | 'forecast' | 'simulator' | 'pcp_details' | 'metallic_yield'>('dashboard');
  const [manualAcum, setManualAcum] = useState({ producao: 0, gn: 0, ee: 0, rm: 0 });

  const [supabaseStatus, setSupabaseStatus] = useState<'online' | 'offline' | 'pending'>('pending');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Efeito Online/Offline e Sincronização
  useEffect(() => {
    const processSyncQueue = async () => {
      if (!navigator.onLine) return;
      const queue = await getSyncQueue();
      if (queue.length === 0) return;

      console.log(`🔄 [SYNC] Processando fila offline (${queue.length} iten(s))...`);
      for (const item of queue) {
        try {
          if (item.action === 'insert') {
            await supabase.from(item.table).insert(item.data);
          } else if (item.action === 'update') {
            await supabase.from(item.table).upsert(item.data);
          }
          if (item.id) await clearSyncQueueItem(item.id);
        } catch (err) {
          console.error(`❌ [SYNC] Erro sincronizando item ${item.id}:`, err);
        }
      }
      console.log('✅ [SYNC] Sincronização concluída com sucesso!');
      fetchData(); // Atualiza a tela com os dados confirmados do Supabase
    };

    const handleOnline = () => {
      setIsOffline(false);
      processSyncQueue();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) processSyncQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getLocalDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [corteDate, setCorteDate] = useState(getLocalDate());
  const [lastRealDate, setLastRealDate] = useState<string>("");
  const [utilidadesLastModified, setUtilidadesLastModified] = useState<string>("");
  const [missingSaps, setMissingSaps] = useState<string[]>([]);
  const [showCostConfig, setShowCostConfig] = useState(false);
  const [costs, setCosts] = useState({ gas: 2.10, energy: 0.45, material: 1500.00 });
  const [showComparator, setShowComparator] = useState(false);
  const [n8nStatus, setN8nStatus] = useState<'online' | 'offline'>('offline');

  // N8N Health Check Ping
  useEffect(() => {
    const checkN8nHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch('http://localhost:5678/healthz', {
          method: 'GET',
          mode: 'no-cors',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        // Em 'no-cors', res.ok é false e res.type é 'opaque', mas se não caiu no catch, o servidor está respondendo.
        if (res.type === 'opaque' || res.ok) {
          setN8nStatus('online');
        } else {
          setN8nStatus('offline');
        }
      } catch (e) {
        setN8nStatus('offline');
      }
    };

    checkN8nHealth();
    const interval = setInterval(checkN8nHealth, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  // Efeito Realtime
  useEffect(() => {
    const channel = supabase
      .channel('public:db_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pcp_upload' },
        (payload) => {
          console.log('Realtime PCP update:', payload);
          setLoading(true);
          // Pequeno delay para garantir que o n8n terminou de processar
          setTimeout(() => {
            fetchData();
            // Feedback visual simples via console ou toast customizado
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-5 font-bold flex items-center gap-2';
            toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Dados atualizados em tempo real!';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
          }, 1500);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metas_upload' },
        (payload) => {
          console.log('Realtime Metas update:', payload);
          setLoading(true);
          setTimeout(fetchData, 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const cleanNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).trim();
    if (!str) return 0;

    // Se tem vírgula, assume padrão BR (vírgula é decimal)
    if (str.includes(',')) {
      const cleaned = str.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    }

    // Se tem apenas ponto, decide se é decimal ou milhar
    if (str.includes('.')) {
      const parts = str.split('.');
      // Se tiver mais de um ponto, é certamente separador de milhar
      if (parts.length > 2) {
        return parseFloat(str.replace(/\./g, '')) || 0;
      }
      // Se tiver apenas um ponto e 3 dígitos depois (e nada antes que pareça decimal), 
      // pode ser milhar ou decimal. Decisão: se o número total for pequeno (< 1000) e tiver ponto, 
      // provavelmente é decimal (ex: 36.19). Se for grande e terminar em .000, provavelmente milhar.
      // Em sistemas industriais, m³/t e % costumam ser decimais.
      const lastPart = parts[1];
      if (lastPart.length !== 3) {
        // Decimal US (ex: 123.45 ou 123.4)
        return parseFloat(str) || 0;
      } else {
        // Ambiguidade (ex: 1.234). Se for rendimento ou consumo, tratamos como milhar se > 100? 
        // Melhor: se tiver ponto e apenas um, e não for .000, tratamos como decimal.
        return parseFloat(str) || 0;
      }
    }

    const res = parseFloat(str.replace(/[^\d.-]/g, ''));
    return isNaN(res) ? 0 : res;
  };

  // REVERSÃO: Normalize simplificada para evitar problemas com caracteres especiais (pontos, parênteses)
  const normalize = (s: any) => String(s || "").toLowerCase().trim();

  // Função auxiliar para buscar valor em colunas com nomes variados
  const getColumnValue = useCallback((row: any, possibleNames: string[], isNumber: boolean = false): any => {
    if (!row) return isNumber ? 0 : '';

    // 1. Tentativa Exata
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null) {
        return isNumber ? cleanNumber(row[name]) : row[name];
      }
    }

    // 2. Tentativa Normalizada (Case Insensitive)
    const rowKeys = Object.keys(row);
    for (const name of possibleNames) {
      const target = normalize(name);
      // Procura chave que contenha o nome alvo (ex: 'codigo sap' em 'Cod. SAP')
      // A normalização agora preserva pontos, então 'cod. sap' bate com 'cod. sap'
      const foundKey = rowKeys.find(key => {
        const k = normalize(key);
        return k === target || k.includes(target) || target.includes(k);
      });

      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return isNumber ? cleanNumber(row[foundKey]) : row[foundKey];
      }
    }

    return isNumber ? 0 : '';
  }, []);

  // Função de recarregamento de dados
  const fetchData = useCallback(async () => {
    // Garante que as colunas massa_linear e familia existam no banco
    ensureTableColumns();
    console.log("🔍 [SISTEMA] Iniciando busca de Metas...");
    getMetasFromSupabase()
      .then(metas => {
        if (metas && metas.length > 0) {
          console.log(`✅ [SISTEMA] ${metas.length} Metas carregadas com sucesso.`);
          setMetaData(metas);
          setSupabaseStatus('online');
        } else {
          console.warn("⚠️ [SISTEMA] Nenhuma meta encontrada no banco.");
          setSupabaseStatus('online');
        }
      })
      .catch((err) => {
        console.error("❌ [SISTEMA] Erro crítico ao buscar metas:", err);
        setSupabaseStatus('offline');
      });

    // Busca o PCP automaticamente
    getPcpFromSupabase()
      .then(data => {
        if (data && data.length > 0) {
          console.log(`✅ [SISTEMA] ${data.length} registros de PCP carregados.`);

          const mappedData = data.map((row: any) => ({
            ...row,
            'Código SAP2': row.sap,
            'OP': row.op,
            'Descrição': row.descricao,
            'Bitolas': row.bitola,
            'Familia': row.familia,
            'Aço': row.aco,
            'Código MP': row.codigo_mp,
            'Descrição MP': row.descricao_mp,
            'Origem Tarugos': row.origem_tarugos,
            'Destino': row.destino,
            'Início': row.inicio,
            'Término': row.termino,
            'Dia da Semana': row.dia_semana,
            'Prod. Acab. (t)': row.producao_planejada,
            'Produção Apontada': row.producao_apontada,
            'Tarugos (t)': row.tarugos,
            'Peças': row.pecas,
            'Massa Linear': row.massa_linear,
            'Produtividade (t/h)': row.produtividade,
            'Produt. Nom t/h': row.produtividade_nominal,
            'IU (%)': row.iu,
            'IE (%)': row.ie,
            'Setup': row.setup,
            'Atrasos/ Ganhos': row.atrasos_ganhos,
            'Cart. M1': row.carteira_m1,
            'Cart. Futura': row.carteira_futura
          }));

          setPcpData(mappedData);

          const firstRow = data[0];
          if (firstRow && firstRow.revisao_arquivo && !fileName) {
            let label = `Revisão ${firstRow.revisao_arquivo} (Supabase)`;
            if (firstRow.data_modificacao_arquivo) {
              let dateStr = firstRow.data_modificacao_arquivo;
              if (!dateStr.endsWith('Z') && !dateStr.includes('+')) dateStr += 'Z';
              const fileDate = new Date(dateStr);
              if (!isNaN(fileDate.getTime())) {
                const formattedDate = fileDate.toLocaleString('pt-BR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
                });
                label = `Revisão ${firstRow.revisao_arquivo} (${formattedDate})`;
              }
            }
            setFileName(label);
          }
        }
      });

    // --- NOVO: Busca dados reais do Diário de Bordo ---
    try {
      const { data: realData, error: realError } = await supabase
        .from('diario_bordo_real')
        .select('*')
        .order('data', { ascending: true });

      if (realError) throw realError;

      if (realData && realData.length > 0) {
        console.log(`✅ [DIARIO] ${realData.length} registros reais carregados para cálculo.`);
        setDiarioBordoData(realData);

        const sorted = [...realData].sort((a, b) => b.data.localeCompare(a.data));
        setLastRealDate(sorted[0].data);

        const newestChange = [...realData].sort((a, b) =>
          (b.data_modificacao_arquivo || b.created_at || b.data_sincronizacao || "").localeCompare(a.data_modificacao_arquivo || a.created_at || a.data_sincronizacao || "")
        )[0];

        if (newestChange && (newestChange.data_modificacao_arquivo || newestChange.created_at || newestChange.data_sincronizacao)) {
          const syncDate = new Date(newestChange.data_modificacao_arquivo || newestChange.created_at || newestChange.data_sincronizacao);
          setUtilidadesLastModified(syncDate.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
          }));
        }

        // Variáveis para acumulado
        const corteStr = corteDate; // Usar a string diretamente do input, evita erro de UTC (ex: 2026-03-07 virar 06)
        const monthStart = `${corteStr.substring(0, 7)}-01`;
        let sumProd = 0;
        let sumGasRaw = 0;
        let sumEE = 0;
        let totalFatorPCS = 0;
        let countFatorPCS = 0;
        let totalPCSFallback = 0;
        let countPCSFallback = 0;

        realData.forEach(row => {
          if (row.data >= monthStart && row.data <= corteStr) {
            sumProd += parseFloat(row.producao_laminacao) || 0;
            sumGasRaw += parseFloat(row.consumo_gas_tl01) || 0;
            sumEE += parseFloat(row.consumo_energia_total) || 0;

            const fPCS = parseFloat(row.fator_pcs);
            if (!isNaN(fPCS) && fPCS > 0) {
              totalFatorPCS += fPCS;
              countFatorPCS++;
            }

            const vPCS = parseFloat(row.pcs_gn) || 0;
            if (vPCS > 0) {
              totalPCSFallback += vPCS;
              countPCSFallback++;
            }
          }
        });

        // Cálculo do Fator Final: Média da Coluna M (Fator PCS) ou fallback para PCS/9500
        let fatorAplicado = 1;
        if (countFatorPCS > 0) {
          fatorAplicado = totalFatorPCS / countFatorPCS;
        } else if (countPCSFallback > 0) {
          fatorAplicado = (totalPCSFallback / countPCSFallback) / 9500;
        }

        const sumGasCorrected = sumGasRaw * fatorAplicado;

        console.log(`📊 [CÁLCULO] Fator Aplicado (Média Col M): ${fatorAplicado.toFixed(6)}, Gas Raw: ${sumGasRaw.toFixed(0)}, Gas Corrigido: ${sumGasCorrected.toFixed(0)}`);

        setManualAcum(prev => {
          const newState = {
            producao: sumProd,
            gn: sumGasCorrected,
            ee: sumEE,
            rm: prev.rm || 0
          };
          console.log(`📊 [STATE] Novo manualAcum:`, newState);
          return newState;
        });

        // --- CÁLCULO DE ONTEM VS HOJE ---
        // Pega os dois últimos dias com produção
        const validDays = [...realData]
          .filter(r => parseFloat(r.producao_laminacao) > 0)
          .sort((a, b) => b.data.localeCompare(a.data));

        if (validDays.length >= 2) {
          const today = validDays[0];
          const yesterday = validDays[1];

          // Yield (Rendimento)
          // Na tabela diario_bordo_real normalmente temos 'rm_real' ou algo que nos de o rendimento?
          // Como o DB não tem a coluna RM clara no select (*), usamos o acumulado manualAcum ou chartData depois.
          // Mas podemos calcular o gás específico
          const gnTodayReal = parseFloat(today.consumo_gas_tl01) || 0;
          const prodTodayReal = parseFloat(today.producao_laminacao) || 0;
          const gnYestReal = parseFloat(yesterday.consumo_gas_tl01) || 0;
          const prodYestReal = parseFloat(yesterday.producao_laminacao) || 0;

          const specGnToday = prodTodayReal > 0 ? (gnTodayReal * fatorAplicado) / prodTodayReal : 0;
          const specGnYest = prodYestReal > 0 ? (gnYestReal * fatorAplicado) / prodYestReal : 0;

          (window as any).__gasOntem = specGnYest;
          (window as any).__gasHoje = specGnToday;
        }

      }
    } catch (err) {
      console.warn("⚠️ [DIARIO] Erro ao buscar dados reais do Diário de Bordo:", err);
    }
  }, [corteDate]);

  // Efeito inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Efeito Realtime
  useEffect(() => {
    const channel = supabase
      .channel('public:db_changes_main')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pcp_data' },
        (payload) => {
          console.log('Realtime PCP update:', payload);
          setLoading(true);
          setTimeout(() => {
            fetchData();
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-5 font-bold flex items-center gap-2';
            toast.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> Dados atualizados em tempo real!';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
          }, 1500);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'metas_producao' },
        (payload) => {
          console.log('Realtime Metas update:', payload);
          setLoading(true);
          setTimeout(fetchData, 1000);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'diario_bordo_real' },
        (payload) => {
          console.log('Realtime Diário de Bordo update:', payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);


  const metasMap = useMemo(() => {
    const map: Record<string, any> = {};
    if (!metaData || metaData.length === 0) return map;

    metaData.forEach((m) => {
      // Tenta várias chaves possíveis para o SAP (Snake Case, Camel Case, Pt-Br, English)
      const sap = String(
        m.sap || m.SAP || m.Sap ||
        m['Código SAP'] || m['Codigo SAP'] || m['codigo_sap'] || m['cod_sap'] ||
        m.material || m.Material || m.MATNR ||
        m.item || m.Item || ""
      ).trim();

      const bitola = String(
        m.bitola || m.BITOLA || m.Bitola || m['Bitola'] ||
        m.dimensao || m.Dimensao || m['Dimensão'] || m['Dimensao'] ||
        m.size || m.Size || ""
      ).trim();

      if (sap) {
        map[sap] = m;
        map[sap.toLowerCase()] = m;
        map[sap.toUpperCase()] = m;

        // Remove zeros à esquerda para garantir match (ex: 00123 -> 123)
        const noZeros = sap.replace(/^0+/, '');
        if (noZeros !== sap && noZeros) map[noZeros] = m;
      }

      if (bitola) {
        map[bitola] = m;
        // Variações de pontuação (K5.1 vs K5,1)
        map[bitola.replace(',', '.')] = m;
        map[bitola.replace('.', ',')] = m;
        map[bitola.toLowerCase()] = m;
      }
    });

    console.log(`🗺️ [MAPA] Indexado ${Object.keys(map).length} chaves de busca para metas.`);
    return map;
  }, [metaData]);

  const monthlyBudget = useMemo(() => {
    return getBudgetForDate(corteDate);
  }, [corteDate]);

  // --- Efeito para calcular produtos faltantes (Desacoplado do Upload) ---
  useEffect(() => {
    if (!pcpData || pcpData.length === 0) return;

    console.log("🔄 [VALIDAÇÃO] Recalculando produtos sem meta...");
    const missing = new Set<string>();

    pcpData.forEach(row => {
      const sap = String(getColumnValue(row, ['_ai_sap', 'Código SAP', 'SAP', 'Codigo SAP2', 'Material', 'Código SAP2'], false) || "").trim();
      const op = String(getColumnValue(row, ['OP', 'Ordem'], false) || "").trim();
      const desc = String(getColumnValue(row, ['Descrição', 'Descricao'], false) || "").trim();
      const bitola = String(getColumnValue(row, ['Bitola', 'BITOLA', 'Dimensão'], false) || "").trim();

      // Ignora M03 e indiretos
      if (normalize(sap).includes('m03') || normalize(op).includes('m03') || normalize(desc).includes('m03')) return;

      // Verifica no mapa (que já indexou variações)
      let hasMeta = false;

      if (metasMap[sap]) hasMeta = true;
      if (!hasMeta && sap && metasMap[sap.replace(/^0+/, '')]) hasMeta = true;
      if (!hasMeta && sap && metasMap[sap.toLowerCase()]) hasMeta = true;

      // Se falhar o SAP, tenta Bitola
      if (!hasMeta && bitola) {
        if (metasMap[bitola]) hasMeta = true;
        if (metasMap[bitola.replace(',', '.')]) hasMeta = true;
        if (metasMap[bitola.toLowerCase()]) hasMeta = true;
      }

      if (!hasMeta) {
        // Se realmente não achou nada, marca como faltante
        missing.add(sap || op || bitola || "Sem ID");
      }
    });

    const arr = Array.from(missing);
    console.log(`❌ [VALIDAÇÃO] Encontrados ${arr.length} produtos sem meta.`);
    setMissingSaps(arr);

  }, [pcpData, metasMap, getColumnValue]);

  // Helper: retorna YYYY-MM-DD ou null
  const getRowDateStr = (val: any): string | null => {
    if (!val) return null;
    let date: Date | null = null;

    // Serial Excel
    if (typeof val === 'number' && val > 30000) {
      const utc_days = Math.floor(val - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      // Ajuste fuso: adiciona minutos do offset para garantir dia correto UTC
      date_info.setMinutes(date_info.getMinutes() + date_info.getTimezoneOffset());
      date = new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate() + 1);
    }
    // String
    else if (typeof val === 'string') {
      if (val.includes('T')) date = new Date(val.split('T')[0]);
      else if (val.includes('/')) {
        const parts = val.split('/');
        if (parts.length === 3) date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
      else if (val.includes('-')) date = new Date(val);
    }

    if (date && !isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return null;
  };

  const hybridForecast = useMemo(() => {
    // Garante formato YYYY-MM-DD para comparação string segura sem alterar o dia por causa do Timezone UTC
    const corteStr = corteDate;

    // Futuro (Remaining)
    let remainingProd = 0;
    let remainingGas = 0;
    let remainingEE = 0;
    let remainingSetup = 0;
    let remainingRMTotal = 0;
    let remainingRMCount = 0;

    // Passado (Planejado até o corte)
    let pastProd = 0;
    let pastGas = 0;
    let pastEE = 0;
    let pastRMTotal = 0;
    let pastRMCount = 0;

    pcpData.forEach(row => {
      const rawDate = getColumnValue(row, ['_ai_data', 'Início', 'Inicio', 'Data', 'Data Início'], false);
      const rowDateStr = getRowDateStr(rawDate);
      const isFuture = !rowDateStr || (rowDateStr > corteStr);

      const prod = getColumnValue(row, ['Qtde REAL (t)', '_ai_producao', 'Prod. Acab. (t)', 'Producao', 'Produção', 'Qtd. Planejada', 'Quantidade'], true);
      const setup = getColumnValue(row, ['_ai_setup', 'Setup'], true);
      const sap = getColumnValue(row, ['_ai_sap', 'Código SAP', 'Código SAP2', 'SAP', 'Codigo SAP2'], false);

      let sapStr = sap ? String(sap).trim() : '';
      if (!sapStr) {
        const sapKey = Object.keys(row).find(k => normalize(k).includes('sap') || normalize(k).includes('codigo'));
        sapStr = sapKey ? String(row[sapKey] || "").trim() : "";
      }

      const bitolaKey = Object.keys(row).find(k => normalize(k).includes('bitola'));
      const bitola = bitolaKey ? String(row[bitolaKey] || "").trim() : "";

      let meta = null;
      if (sapStr) {
        meta = metasMap[sapStr] || metasMap[sapStr.replace(/^0+/, '')];
      }
      if (!meta && bitola) {
        meta = metasMap[bitola] || metasMap[bitola.replace(',', '.')];
        if (!meta) {
          const fuzzyKey = Object.keys(metasMap).find(k => k && (k.includes(bitola) || bitola.includes(k)));
          if (fuzzyKey) meta = metasMap[fuzzyKey];
        }
      }

      const gas = meta ? prod * cleanNumber(meta.gas || meta['Gás Natural (m³)'] || 0) : 0;
      const energy = meta ? prod * cleanNumber(meta.energia || meta['Energia Elétrica (kWh)'] || 0) : 0;
      const rm = meta ? getColumnValue(meta, ['rm', 'RM', 'Rendimento', 'Yield'], true) : 0;

      if (isFuture) {
        remainingProd += prod;
        remainingSetup += setup;
        remainingGas += gas;
        remainingEE += energy;
        if (rm > 0) {
          remainingRMTotal += rm;
          remainingRMCount++;
        }
      } else {
        pastProd += prod;
        pastGas += gas;
        pastEE += energy;
        if (rm > 0) {
          pastRMTotal += rm;
          pastRMCount++;
        }
      }
    });

    return {
      producao: remainingProd,
      gas: remainingGas,
      energia: remainingEE,
      setup: remainingSetup,
      futureRM: remainingRMCount > 0 ? (remainingRMTotal / remainingRMCount) : 0,
      metaProd: pastProd,
      metaGas: pastGas,
      metaEE: pastEE,
      metaRM: pastRMCount > 0 ? (pastRMTotal / pastRMCount) : 0
    };
  }, [corteDate, pcpData, metasMap, getColumnValue]);

  useEffect(() => {
    // Sincroniza com PCP apenas como fallback inicial se NÃO tivermos dados carregados do Diário de Bordo
    // Se diarioBordoData tiver itens, o fetchData já cuidou de definir os valores reais (com PCS)
    if (diarioBordoData.length === 0 && hybridForecast.metaProd > 0 && manualAcum.producao === 0) {
      setManualAcum({
        producao: hybridForecast.metaProd,
        gn: hybridForecast.metaGas,
        ee: hybridForecast.metaEE,
        rm: hybridForecast.metaRM
      });
    }
  }, [diarioBordoData.length, hybridForecast.metaProd, hybridForecast.metaGas, hybridForecast.metaEE, hybridForecast.metaRM]);

  const referenceMonth = useMemo(() => {
    if (!corteDate) return "Indeterminado";
    const [year, month] = corteDate.split('-');
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const monthIndex = parseInt(month) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${months[monthIndex]} / ${year}`;
    }
    return "Indeterminado";
  }, [corteDate]);


  const calculateMetrics = useCallback((data: any[]) => {
    let tp = 0, tg = 0, te = 0, trm = 0, crm = 0, ts = 0, tpr = 0, cpr = 0, tml = 0, cml = 0, tcut = 0, textended = 0;
    const cutDetails: Array<{ name: string, date: string }> = [];

    let lastOrder: any = null;

    data.forEach(row => {
      const prod = getColumnValue(row, ['Qtde REAL (t)', 'producao_planejada', '_ai_producao'], true);
      const originalProd = getColumnValue(row, ['_original_prod'], true);

      // Usando o valor já processado/ajustado (prod) para o total principal.
      // Se houver originalProd > prod, significa que houve um corte (aparamento).
      tp += prod;

      if (originalProd > 0 && originalProd !== prod) {
        // Se houve aparamento (corte porque passou do mês)
        if (originalProd > prod) {
          const cutVol = originalProd - prod;
          tcut += cutVol; // Restaurado conforme solicitado pelo usuário
        } else {
          // Se houve extensão (falta no fim do mês, então aumenta)
          const addedVol = prod - originalProd;
          textended += addedVol;
        }

        // Armazena detalhes da última alteração
        let desc = getColumnValue(row, ['Descrição', 'Descricao', 'Material'], false) || getColumnValue(row, ['Bitolas', 'Bitola', 'Dimensão'], false) || getColumnValue(row, ['sap', 'SAP'], false) || 'Item Desconhecido';
        let dateStr = 'Fim do Mês';

        if (typeof corteDate === 'string' && corteDate.includes('-')) {
          const [year, month] = corteDate.split('-');
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          dateStr = `${String(lastDay).padStart(2, '0')}/${month}/${year.slice(-2)} às 23:59`;
        }
        cutDetails.push({ name: String(desc).trim(), date: dateStr });
      }

      // Busca setup
      const setup = getColumnValue(row, ['_ai_setup', 'Setup', 'Tempo Setup', 'Minutos Setup'], true);
      ts += setup;

      // Busca produtividade - PRIORIDADE nas colunas reais do PCP Excel
      // O PCP tem: 'Produt. Nom t/h' e 'Produt. Plan t/h' que já estão em t/h
      let produtividade = getColumnValue(row, [
        'Produt. Plan t/h', 'Produt. Nom t/h',  // PCP Excel (PRIORIDADE)
        'Produtividade (t/h)', 'Produtividade',  // Colunas calculadas
        '_ai_produtividade',                      // Supabase AI
        't/h', 'Prod/h', 'Ton/h', 'Produtividade Real'
      ], true);

      // NENHUMA correção heurística de escala - os dados do PCP já estão em t/h
      // Se o valor for claramente absurdo (> 1000 t/h é impossível), ignora
      if (produtividade > 1000) produtividade = 0;

      if (produtividade > 0 && prod > 0) {
        // Média PONDERADA: Total Produção / Total Horas (onde horas = prod / produtividade)
        const horas = prod / produtividade;
        tpr += prod;  // Total Toneladas com produtividade válida
        cpr += horas; // Total Horas Calculadas
      }

      // Busca SAP para consultar metas
      const sapKey = Object.keys(row).find(k => normalize(k).includes('sap') || normalize(k).includes('codigo'));
      const sap = sapKey ? String(row[sapKey] || "").trim() : "";

      const bitolaKey = Object.keys(row).find(k => normalize(k).includes('bitola'));
      const bitola = bitolaKey ? String(row[bitolaKey] || "").trim() : "";

      let meta = null;

      // 1. Tenta pelo SAP exato
      if (sap) {
        meta = metasMap[sap] || metasMap[sap.replace(/^0+/, '')];
      }

      // 2. Tenta pela Bitola (Exata ou Fuzzy)
      if (!meta && bitola) {
        meta = metasMap[bitola] || metasMap[bitola.replace(',', '.')];

        // 3. Busca Fuzzy (contém)
        if (!meta) {
          const fuzzyKey = Object.keys(metasMap).find(k => k && (k.includes(bitola) || bitola.includes(k)));
          if (fuzzyKey) meta = metasMap[fuzzyKey];
        }
      }

      // Busca massa linear - PRIORIDADE no dado da própria linha, fallback para meta
      let massaLinear = getColumnValue(row, [
        'Massa Linear', 'kg/m', 'g/m', 'Peso Linear',  // Colunas diretas
        '_ai_massa_linear', 'Massa Teórica', 'Massa', 'Peso'
      ], true);
      if (massaLinear === 0 && meta) {
        massaLinear = cleanNumber(meta.massa_linear || meta.massa || meta['Massa Linear'] || meta['kg/m'] || 0);
      }

      // NENHUMA correção de escala - o dado deveria chegar em kg/m
      // Se parece estar em g/m (valor > 500 como 617 para CA-50 10mm que é 0.617 kg/m)
      // essa heurística é perigosa porque perfis pesados existem (ex: 130 kg/m para tarugos)
      // REMOVIDA: if (massaLinear > 500) massaLinear /= 1000;

      if (massaLinear > 0 && prod > 0) {
        tml += massaLinear * prod; // Acumula (Massa * Produção) para média ponderada
        cml += prod;               // Acumula o volume de produção considerado
      }

      if (meta) {
        // Usa getColumnValue para ser tolerante a variações de nome de coluna no objeto Meta também
        const gasMeta = getColumnValue(meta, ['gas', 'Gas', 'GAS', 'Gás Natural (m³)', 'Consumo Gás', 'GN'], true);
        const eeMeta = getColumnValue(meta, ['energia', 'Energia', 'EE', 'Energia Elétrica (kWh)', 'Consumo Energia'], true);

        tg += prod * gasMeta;
        te += prod * eeMeta;

        const rm = getColumnValue(meta, ['rm', 'RM', 'meta.rendimento', 'Rendimento', 'Yield'], true);
        if (rm > 0) { trm += rm; crm++; }
      }

      // NOVO: Rastrear o último material da programação (o que está rodando/terminando por último)
      const terminoStr = getColumnValue(row, ['Término', 'termino', 'Termino Final'], false);
      if (terminoStr) {
        let tTime = 0;
        let tDateStr = 'Fim do Mês';

        if (typeof terminoStr === 'number' && terminoStr > 40000) {
          // local excel numeric serial
          const utcDays = Math.floor(terminoStr) - 25569;
          const dateInfo = new Date(utcDays * 86400 * 1000);
          const fractionalDay = terminoStr - Math.floor(terminoStr);
          const totalSeconds = Math.round(fractionalDay * 86400);
          dateInfo.setUTCHours(Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60), totalSeconds % 60);
          tTime = dateInfo.getTime();
          tDateStr = dateInfo.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        } else {
          // database ISO string
          const tDate = new Date(terminoStr);
          tTime = tDate.getTime();
          tDateStr = tDate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        }

        // Preserva o item com o maior tempo de término no mês de referência
        if (!isNaN(tTime) && (!lastOrder || tTime >= lastOrder.time)) {
          lastOrder = {
            desc: String(getColumnValue(row, ['Bitola', 'BITOLA', 'Bitolas', 'Dimensão', 'Dimensao'], false) || getColumnValue(row, ['Descrição', 'Descricao'], false) || 'Item sem nome').trim(),
            time: tTime,
            timeStr: tDateStr
          };
        }
      }
    });


    // DEBUG: Log detalhado ao console para diagnosticar cálculos
    console.log('📊 DIAGNÓSTICO MÉTRICAS:', {
      totalProducao: tp,
      produtividade: { totalProdComProd: tpr, totalHorasCalc: cpr, media: cpr > 0 ? (tpr / cpr).toFixed(2) : 'N/A' },
      massaLinear: { somaML_x_Prod: tml, somaProdComML: cml, media: cml > 0 ? (tml / cml).toFixed(3) : 'N/A' },
      metas: {
        gasTotal: tg,
        energiaTotal: te,
        rendimentoAcum: trm,
        contagemComMeta: crm
      }
    });

    // DEBUG: Amostrar os primeiros 10 registros para verificar
    const sampleDebug = data.slice(0, 10).map(row => {
      const prod = getColumnValue(row, ['Qtde REAL (t)', '_ai_producao', 'Prod. Acab. (t)'], true);

      const sapKey = Object.keys(row).find(k => normalize(k).includes('sap') || normalize(k).includes('codigo'));
      const sap = sapKey ? String(row[sapKey] || "").trim() : "";

      // Simula busca de meta
      let metaFound = null;
      if (sap) metaFound = metasMap[sap] || metasMap[sap.replace(/^0+/, '')];

      const debugMeta = metaFound ? {
        gas: metaFound.gas || metaFound['Gás Natural (m³)'],
        energia: metaFound.energia || metaFound['Energia Elétrica (kWh)'],
        gas_parsed: cleanNumber(metaFound.gas || metaFound['Gás Natural (m³)']),
        energia_parsed: cleanNumber(metaFound.energia || metaFound['Energia Elétrica (kWh)'])
      } : 'SEM META';

      return {
        sap,
        prod,
        meta: debugMeta
      };
    });
    console.log('📊 AMOSTRA DADOS (Metas):', sampleDebug);


    // Cálculo do Impacto de Gás pelo Setup (800m³/h)
    const totalSetupHours = ts / 60;
    const setupGasPenalty = totalSetupHours * 800;

    // Adiciona penalidade ao Total de Gás
    tg += setupGasPenalty;

    const avgGas = tp > 0 ? tg / tp : 0;
    const custoExtraGas = tp > 0 ? Math.max(0, (tg - (tp * avgGas)) * costs.gas) : 0;

    return {
      totalProducao: tp,
      totalTrimmed: tcut,
      totalExtended: textended,
      cutDetails,
      avgGas: avgGas,
      avgEE: tp > 0 ? te / tp : 0,
      avgRM: crm > 0 ? (trm / crm) : 0, // Removido * 100 pois o dado já vem em % (ex: 96.5) ou precisa ser ajustado na exibição
      totalSetupHoras: ts / 60,
      avgProd: cpr > 0 ? (tpr / cpr) : 0, // Agora: Total Produção / Total Horas (t/h real médio)
      avgMassaLinear: cml > 0 ? (tml / cml) : 0,
      metaGas: avgGas,
      metaEE: tp > 0 ? (te / tp) : 0,
      metaRM: crm > 0 ? (trm / crm) : 0,
      custoExtraGas,
      metaMedGas: avgGas,
      metaMedEE: tp > 0 ? te / tp : 0,
      metaMedRM: crm > 0 ? trm / crm : 0,
      totalCustoGas: tp * avgGas * costs.gas,
      totalCustoEnergia: tp * (tp > 0 ? te / tp : 0) * costs.energy,
      setupGasPenalty,
      lastOrder // Exportando o último pedido para o card
    };
  }, [metasMap, costs, getColumnValue]);

  const calculatedTotals = useMemo(() => calculateMetrics(pcpData), [pcpData, calculateMetrics]);
  const secondaryTotals = useMemo(() => calculateMetrics(pcpSecondary), [pcpSecondary, calculateMetrics]);

  // Envia o valor exato do card PRODUCAO TOTAL para o servidor local E persiste no Supabase
  // para que o n8n possa ler via Supabase (confiável) ou GET /api/forecast (fallback local)
  useEffect(() => {
    if (calculatedTotals.totalProducao > 0) {
      const valor = Math.round(calculatedTotals.totalProducao);

      const previsaoGas = calculatedTotals.avgGas;
      const previsaoEnergia = calculatedTotals.avgEE;

      // 1. Servidor local (para leitura imediata se dashboard estiver aberto)
      fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previsaoFechamento: valor,
          previsaoGas: Number(previsaoGas.toFixed(2)),
          previsaoEnergia: Number(previsaoEnergia.toFixed(2))
        })
      }).catch(() => { });

      // 2. Supabase (persistente - n8n lê daqui mesmo com dashboard fechado)
      supabase
        .from('forecast_cache')
        .upsert({
          id: 'current',
          previsao_fechamento: valor,
          previsao_gas: Number(previsaoGas.toFixed(2)),
          previsao_energia: Number(previsaoEnergia.toFixed(2)),
          updated_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) console.warn('⚠️ [FORECAST] Erro ao salvar no Supabase:', error.message);
          else console.log(`✅ [FORECAST] Valor ${valor}t (GN: ${previsaoGas.toFixed(2)}, EE: ${previsaoEnergia.toFixed(2)}) salvo no Supabase forecast_cache`);
        });
    }
  }, [calculatedTotals.totalProducao, manualAcum, hybridForecast]);

  // --- Ontem vs Hoje & Preditor ---
  const { contextData, predictorNotice } = useMemo(() => {
    let gasVarHtml = null;
    let rmVarHtml = null;
    let premiumGoalReached = false;
    let notice = "";

    // Como diarioBordoData guarda o real e chartData também processa isso
    // Vamos usar (window as any).__gasOntem gerado no fetchData para o Gás
    const gasHoje = (window as any).__gasHoje || 0;
    const gasOntem = (window as any).__gasOntem || 0;

    if (gasOntem > 0 && gasHoje > 0) {
      const p = ((gasHoje - gasOntem) / gasOntem) * 100;
      if (p < 0) {
        gasVarHtml = { text: `🟢 ${Math.abs(p).toFixed(1)}% melhor que média de ontem`, color: 'text-emerald-500' };
      } else if (p > 0) {
        gasVarHtml = { text: `🔴 ${Math.abs(p).toFixed(1)}% acima da média de ontem`, color: 'text-rose-500' };
      }
    }

    // Para rendimento, analisamos o fechamento atual vs meta
    if (calculatedTotals.metaMedRM > 0 && calculatedTotals.avgRM >= calculatedTotals.metaMedRM) {
      premiumGoalReached = true;
      rmVarHtml = { text: `🟢 Atingiu a Meta Premium Corporativa`, color: 'text-emerald-500' };
    } else if (calculatedTotals.metaMedRM > 0) {
      const needed = calculatedTotals.metaMedRM - calculatedTotals.avgRM;
      rmVarHtml = { text: `🔴 -${needed.toFixed(1)}% abaixo da meta estabelecida`, color: 'text-amber-500' };
    }

    // Preditor
    if (premiumGoalReached) {
      notice = "Aviso do Preditor: O rendimento metálico atual superou a meta premium corporativa! Excelente performance.";
      if (gasVarHtml && gasVarHtml.text.includes('🔴')) {
        notice += " No entanto, atenção ao consumo térmico que está subindo em relação a ontem.";
      }
    } else {
      if (gasVarHtml && gasVarHtml.text.includes('🟢')) {
        notice = "Aviso do Preditor: O consumo de gás melhorou em relação a ontem! Mantenha a estabilidade térmica.";
      } else if (gasVarHtml && gasVarHtml.text.includes('🔴')) {
        notice = "Aviso do Preditor: O consumo térmico está elevado hoje. Considere revisar configurações de queima do forno.";
      } else {
        notice = "Aviso do Preditor: Operação estável. Foco em manter o ritmo de laminação para bater a meta semanal.";
      }
    }

    return {
      contextData: { gasVar: gasVarHtml, rmVar: rmVarHtml, premiumGoalReached },
      predictorNotice: notice
    };
  }, [calculatedTotals, diarioBordoData]);

  const chartData = useMemo(() => {
    // Função auxiliar para converter serial Excel em Data
    const excelSerialToDate = (serial: number) => {
      const utc_days = Math.floor(serial - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate() + 1); // +1 dia ajuste fuso
    };

    // Primeiro, mapeia todos os dados
    const rawData = pcpData.map(row => {
      let dataStr = getColumnValue(row, ['_ai_data', 'Início', 'Inicio', 'Data'], false);

      // Se for número serial do Excel (ex: 46053.99), converte para DD/MM/YYYY
      if (typeof dataStr === 'number' && dataStr > 40000) {
        const date = excelSerialToDate(dataStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        dataStr = `${day}/${month}/${year}`;
      }
      // Se for string com data e hora (ex: "2024-02-01T10:00:00" ou "01/02/2024 10:00")
      else if (typeof dataStr === 'string' && (dataStr.includes('T') || dataStr.includes(' '))) {
        // Tenta remover a hora
        dataStr = dataStr.split('T')[0].split(' ')[0];
        // Se ainda estiver em formato YYYY-MM-DD, converte para DD/MM/YYYY para padronizar
        if (dataStr.includes('-')) {
          const parts = dataStr.split('-');
          if (parts[0].length === 4) { // YYYY-MM-DD
            dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }
      }

      const prod = getColumnValue(row, ['Qtde REAL (t)', '_ai_producao', 'Prod. Acab. (t)', 'Producao', 'Produção', 'Qtd. Planejada', 'Quantidade'], true);
      const sap = getColumnValue(row, ['_ai_sap', 'Código SAP', 'Código SAP2', 'SAP', 'Codigo SAP2'], false);
      const massaLinear = getColumnValue(row, ['_ai_massa_linear', 'Massa Linear'], true);

      const setup = getColumnValue(row, ['_ai_setup', 'Setup', 'Tempo Setup', 'Minutos Setup'], true);
      const tsHours = setup / 60;
      const setupGasPenalty = tsHours * 800; // 800m3/h penalty during setup 

      let meta = null;
      if (sap) {
        const sapStr = String(sap).trim();
        meta = metasMap[sapStr] || metasMap[sapStr.replace(/^0+/, '')];
      }

      if (!meta) {
        const bitolaKey = Object.keys(row).find(k => normalize(k).includes('bitola'));
        const bitola = bitolaKey ? String(row[bitolaKey] || "").trim() : "";
        if (bitola) {
          meta = metasMap[bitola] || metasMap[bitola.replace(',', '.')];
        }
      }

      // Calculate dynamic gas per day (Base theoretical + Setup Penalty)
      const baseGasTotal = meta ? prod * cleanNumber(meta.gas || meta['Gás Natural (m³)'] || 0) : 0;
      const finalGasTotal = baseGasTotal + setupGasPenalty;
      const finalGasEspecifico = prod > 0 ? (finalGasTotal / prod) : 0;

      return {
        data: dataStr ? String(dataStr) : '',
        producao: prod,
        gas: finalGasTotal,
        energia: meta ? prod * cleanNumber(meta.energia || meta['Energia Elétrica (kWh)'] || 0) : 0,
        gasEspecifico: finalGasEspecifico, // Uses dynamic consumption based on setup 
        energiaEspecifica: meta ? cleanNumber(meta.energia || meta['Energia Elétrica (kWh)'] || 0) : 0, // Energy remains theoretical for now as requested
        massaLinear: massaLinear
      };
    });

    // Agrupa por data e soma
    const groupedByDate: Record<string, any> = {};
    rawData.forEach(item => {
      const dateKey = item.data;
      if (!dateKey) return;

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          data: dateKey,
          producao: 0,
          gas: 0,
          energia: 0,
          gasEspecificoSum: 0,
          energiaEspecificaSum: 0,
          count: 0
        };
      }

      groupedByDate[dateKey].producao += item.producao;
      groupedByDate[dateKey].gas += item.gas;
      groupedByDate[dateKey].energia += item.energia;
      groupedByDate[dateKey].gasEspecificoSum += item.gasEspecifico * item.producao; // Ponderado
      groupedByDate[dateKey].energiaEspecificaSum += item.energiaEspecifica * item.producao; // Ponderado
      groupedByDate[dateKey].count++;
    });

    // Mesclar eventos do Diário de Bordo Real
    diarioBordoData.forEach(row => {
      const dbDate = new Date(row.data);
      if (isNaN(dbDate.getTime())) return;

      const day = String(dbDate.getUTCDate()).padStart(2, '0');
      const month = String(dbDate.getUTCMonth() + 1).padStart(2, '0');
      const year = dbDate.getUTCFullYear();
      const dateKey = `${day}/${month}/${year}`;

      if (groupedByDate[dateKey] && row.comentario) {
        groupedByDate[dateKey].evento = row.comentario;
      }
    });

    // Converte para array e calcula médias ponderadas
    return Object.values(groupedByDate).map((item: any) => {
      const gasMetaDiaria = item.producao > 0 ? item.gasEspecificoSum / item.producao : 0;
      const eeMetaDiaria = item.producao > 0 ? item.energiaEspecificaSum / item.producao : 0;

      return {
        data: item.data.split('/')[0], // Só o dia
        producao: item.producao,
        gas: item.gas,
        energia: item.energia,
        gasEspecifico: item.producao > 0 ? item.gas / item.producao : 0,
        gasMeta: gasMetaDiaria,
        energiaEspecifica: item.producao > 0 ? item.energia / item.producao : 0,
        energiaMeta: eeMetaDiaria,
        // Diferença para o gráfico de sombra
        gasLoss: Math.max(0, (item.gas / item.producao) - gasMetaDiaria),
        eeLoss: Math.max(0, (item.energia / item.producao) - eeMetaDiaria)
      };
    }).sort((a, b) => {
      // Ordena por data (considerando apenas o dia para este gráfico mensal)
      return parseInt(a.data) - parseInt(b.data);
    });
  }, [pcpData, diarioBordoData, metasMap, getColumnValue]);

  // --- Lógica da IA Gemini Sob Demanda ---
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  (window as any).triggerGeminiAnalysis = async () => {
    if (isAnalysing) return;
    setIsAnalysing(true);
    setAiReport(null);
    setCurrentView('dashboard'); // Garante que estamos no dashboard para ver o relatório

    try {
      // Coleta o contexto atual para a IA
      const context = {
        mes: referenceMonth,
        producaoTotal: calculatedTotals.totalProducao,
        gasMedio: calculatedTotals.avgGas,
        gasMeta: calculatedTotals.metaMedGas,
        eeMedio: calculatedTotals.avgEE,
        eeMeta: calculatedTotals.metaMedEE,
        rendimento: calculatedTotals.avgRM,
        rendimentoMeta: calculatedTotals.metaMedRM,
        desperdicioGas: calculatedTotals.custoExtraGas,
        principaisSapsFaltantes: missingSaps.slice(0, 5)
      };

      // Chamada fictícia/simulada (você pode conectar ao seu webhook n8n real aqui)
      // Exemplo: await fetch('SUA_URL_N8N', { method: 'POST', body: JSON.stringify(context) });

      // Simulação de resposta inteligente para demonstração imediata
      setTimeout(() => {
        const report = `### 🧠 Análise Estratégica Gemini - ${referenceMonth}
        
* **Eficiência Térmica (Gás):** Identifiquei que o consumo de gás está **${context.gasMedio > context.gasMeta ? 'acima' : 'dentro'}** da meta. O impacto financeiro estimado de desvio é de **R$ ${context.desperdicioGas.toLocaleString()}**. Sugerimos auditar os setups de 800m³/h.
* **Rendimento Metálico:** Sua média de **${context.rendimento.toFixed(2)}%** está alinhada com o mix de produtos.
* **Gargalos:** Existem **${missingSaps.length}** produtos sem meta, o que pode mascarar ineficiências em lotes específicos.

**Recomendação:** Focar na otimização térmica durante as primeiras 2 horas pós-setup.`;
        setAiReport(report);
        setIsAnalysing(false);
      }, 2000);

    } catch (error) {
      console.error("Erro na análise Gemini:", error);
      setIsAnalysing(false);
    }
  };

  const handleFileUpload = useCallback((file: File, type: 'pcp' | 'metas' | 'pcp_sec') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // 1. Tentar encontrar a aba correta - PRIORIDADE para TL1/TL01
        let sheetName = workbook.SheetNames[0];

        // Lista de abas disponíveis para debug
        console.log("Abas disponíveis:", workbook.SheetNames);

        // Primeiro: tenta encontrar TL1 ou TL01 exatamente
        const tlSheet = workbook.SheetNames.find(name =>
          name.toLowerCase() === 'tl1' ||
          name.toLowerCase() === 'tl01' ||
          name.toLowerCase() === 'tl 1' ||
          name.toLowerCase() === 'tl 01'
        );

        if (tlSheet) {
          sheetName = tlSheet;
        } else {
          // Segundo: tenta encontrar abas que contenham 'tl1' ou 'tl01'
          const tlPartial = workbook.SheetNames.find(name =>
            name.toLowerCase().includes('tl1') ||
            name.toLowerCase().includes('tl01')
          );
          if (tlPartial) {
            sheetName = tlPartial;
          }
        }

        if (sheetName) console.log(`Aba selecionada: ${sheetName}`);
        let worksheet = workbook.Sheets[sheetName];

        if (type === 'pcp' || type === 'pcp_sec') {
          if (type === 'pcp') setFileName(file.name);

          // Log do range original para debug
          console.log(`Range da planilha: ${worksheet['!ref']}`);

          // Lê como array de arrays primeiro para analisar estrutura
          const rawArray = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
          }) as any[][];

          console.log(`Total de linhas brutas: ${rawArray.length}`);

          // Encontra a linha do cabeçalho (linha que contém "OP")
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(25, rawArray.length); i++) {
            const row = rawArray[i];
            if (row && Array.isArray(row) && row.some((cell: any) => {
              const val = String(cell || '').toUpperCase().trim();
              return val === 'OP' || val === 'ORDEM' || val === 'ORDEM DE PRODUCAO';
            })) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex === -1) {
            console.warn("Cabeçalho 'OP' não encontrado nas primeiras 25 linhas. Usando linha 0 como fallback.");
            headerRowIndex = 0;
          }

          const headers = rawArray[headerRowIndex].map((h: any, idx: number) => String(h || '').trim() || `Col_${idx}`);
          console.log("Cabeçalhos detectados no Simulador:", headers);

          const dataRows = rawArray.slice(headerRowIndex + 1).map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header: string, idx: number) => {
              if (header && !header.startsWith('Col_')) obj[header] = row[idx] ?? '';
            });
            return obj;
          });

          const processed = dataRows.filter((row: any) => {
            const values = Object.values(row);
            return values.some(v => String(v).trim() !== '') &&
              !values.some(v => String(v).toLowerCase().includes('total'));
          });
          if (type === 'pcp_sec') {
            setPcpSecondary(processed);
            setShowComparator(true);
          } else { // Original PCP logic
            // Função auxiliar para converter serial do Excel para Date
            const excelSerialToDate = (serial: number): Date => {
              const utcDays = Math.floor(serial) - 25569;
              const utcValue = utcDays * 86400 * 1000;
              const date = new Date(utcValue);

              const fractionalDay = serial - Math.floor(serial);
              const totalSeconds = Math.round(fractionalDay * 86400);
              const hours = Math.floor(totalSeconds / 3600);
              const minutes = Math.floor((totalSeconds % 3600) / 60);
              const seconds = totalSeconds % 60;

              date.setUTCHours(hours, minutes, seconds);
              return date;
            };

            // Converte linhas de dados em objetos
            const dataRows = rawArray.slice(headerRowIndex + 1).map((row: any[]) => {
              const obj: any = {};
              headers.forEach((header: string, idx: number) => {
                // Ignora colunas sem nome real
                if (header && !header.startsWith('Col_')) {
                  obj[header] = row[idx] !== undefined && row[idx] !== null ? row[idx] : '';
                }
              });
              return obj;
            });

            // Filtra linhas vazias e totais
            const processed = dataRows.filter((row: any) => {
              const values = Object.values(row);
              const hasData = values.some(val => val !== null && val !== undefined && String(val).trim() !== '');
              const isNotTotal = !values.some(val =>
                String(val).toLowerCase().includes('total') ||
                String(val).toLowerCase().includes('soma')
              );
              return hasData && isNotTotal;
            });

            // Detecta o mês de referência analisando todas as datas (moda)
            let refMonth = -1;
            let refYear = -1;
            const inicioCol = headers.find(h => h.toLowerCase().includes('início') || h.toLowerCase().includes('inicio'));

            if (inicioCol && processed.length > 0) {
              const monthCounts: Record<string, number> = {};

              processed.forEach((row: any) => {
                const inicioVal = row[inicioCol];
                if (typeof inicioVal === 'number' && inicioVal > 40000) { // > 40000 garante datas recentes (após 2009)
                  const date = excelSerialToDate(inicioVal);
                  const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
                  monthCounts[key] = (monthCounts[key] || 0) + 1;
                }
              });

              // Encontra o mês com mais registros
              let maxCount = 0;
              let bestMonthKey = '';

              Object.entries(monthCounts).forEach(([key, count]) => {
                if (count > maxCount) {
                  maxCount = count;
                  bestMonthKey = key;
                }
              });

              if (bestMonthKey) {
                const [yearStr, monthStr] = bestMonthKey.split('-');
                refYear = parseInt(yearStr);
                refMonth = parseInt(monthStr);
                console.log(`Mês de referência detectado (moda): ${refMonth + 1}/${refYear} com ${maxCount} registros`);
              }
            }

            // Filtra apenas dados do mês de referência
            let filteredByMonth = processed;

            // Define limites para a lógica principal baseada no mês detectado
            const monthStart = new Date(Date.UTC(refYear, refMonth, 1, 0, 0, 0));
            const monthEnd = new Date(Date.UTC(refYear, refMonth + 1, 0, 23, 59, 59));

            if (refMonth >= 0 && refYear > 0 && inicioCol) {
              // Define um limite de tolerância para o início do mês (ex: 10 dias antes)

              // Define um limite de tolerância para o início do mês (ex: 10 dias antes)
              // Isso garante que as "primeiras linhas" do Excel, mesmo que do fim do mês passado, sejam incluídas.
              const earlyGracePeriod = new Date(monthStart);
              earlyGracePeriod.setUTCDate(earlyGracePeriod.getUTCDate() - 10);

              // 1. Filtra os dados
              filteredByMonth = processed.filter((row: any) => {
                const inicioVal = row[inicioCol];
                const terminoColLocal = headers.find(h => h.toLowerCase().includes('término') || h.toLowerCase().includes('termino'));
                const dTermino = typeof row[terminoColLocal] === 'number' ? excelSerialToDate(row[terminoColLocal]) : null;

                // Mantém setups/paradas sem data se forem relevantes
                if (typeof inicioVal !== 'number' || inicioVal <= 40000) {
                  const desc = String(row['Descrição'] || row['Cart. Futura'] || '').toLowerCase();
                  const isRelevant = desc.includes('setup') || desc.includes('troca') || desc.includes('preventiva');
                  const op = String(row['OP'] || '');
                  if (op === 'M03' || op === 'OP' || op === '-') return false;
                  return isRelevant;
                }

                const date = excelSerialToDate(inicioVal);

                // CRITÉRIO DE INCLUSÃO RELAXADO:
                // 1. Começa dentro do mês
                const startsInMonth = date >= monthStart && date <= monthEnd;
                // 2. Começou antes mas terminou dentro (transição)
                const overlapsMonthStart = date < monthStart && dTermino && dTermino > monthStart;
                // 3. É uma das "primeiras linhas" do arquivo (iniciou nos últimos 10 dias do mês anterior)
                const isInitialTransition = date >= earlyGracePeriod && date < monthStart;

                return startsInMonth || overlapsMonthStart || isInitialTransition;
              });

              // 2. Ordena por data
              filteredByMonth.sort((a, b) => {
                const valA = typeof a[inicioCol] === 'number' ? a[inicioCol] : 0;
                const valB = typeof b[inicioCol] === 'number' ? b[inicioCol] : 0;
                return valA - valB;
              });

              // 2A. Decisão Técnica: Inclusão INTEGRAL da primeira ordem.
              // Removido qualquer trimming que ajustasse proporcionalmente a produção da primeira ordem.
              console.log("Incluindo primeira ordem integralmente (inclusive se iniciada no mês anterior).");

              // 3. Extender a última ordem para o final do mês
              // Encontra o índice da última ordem que tem data válida (ignora setups finais sem data)
              let lastOrderIndex = -1;
              for (let i = filteredByMonth.length - 1; i >= 0; i--) {
                const row = filteredByMonth[i];
                if (typeof row[inicioCol] === 'number' && row[inicioCol] > 40000) {
                  lastOrderIndex = i;
                  break;
                }
              }

              if (lastOrderIndex >= 0) {
                const lastRow = filteredByMonth[lastOrderIndex];
                const terminoCol = headers.find(h => h.toLowerCase().includes('término') || h.toLowerCase().includes('termino'));

                if (terminoCol) {
                  console.log("Estendendo última ordem para o fim do mês...");
                  // Calcula o serial do Excel para o fim do mês (Data JS -> Excel Serial)
                  // Fim do mês ja calculado em monthEnd
                  // Excel Serial = (UnixTimestamp / 86400000) + 25569
                  const endOfMonthSerial = (monthEnd.getTime() / 86400000) + 25569;

                  // --- Lógica de preenchimento (Gap Filling) e Corte (Trimming): Proporcional ---
                  const originalEndSerial = lastRow[terminoCol];
                  const originalStartSerial = lastRow[inicioCol];

                  if (typeof originalEndSerial === 'number' && typeof originalStartSerial === 'number' && endOfMonthSerial !== originalEndSerial) {
                    const originalDuration = originalEndSerial - originalStartSerial;
                    const newDuration = endOfMonthSerial - originalStartSerial;

                    if (originalDuration > 0 && newDuration > 0) {
                      const ratio = newDuration / originalDuration;

                      // Encontra a coluna de Produção original
                      const prodCol = headers.find(h =>
                        h === 'Qtde REAL (t)' || h === 'Prod. Acab. (t)' ||
                        h.includes('Producao') || h.includes('Produção') || h.includes('Qtd')
                      );

                      if (prodCol) {
                        const currentProd = cleanNumber(lastRow[prodCol]);

                        // Desativado a pedido do usuário: manter a Qtde REAL idêntica ao arquivo original
                        // const newProd = currentProd * ratio;
                        const appliedRatio = 1.0;
                        const newProd = currentProd; // Mantém original

                        const op = lastRow['OP'] || lastRow['Ordem'] || "N/A";
                        const action = ratio > 1 ? "Estendendo" : "Aparando";
                        const debugInfo = ` | Ajuste Desativado (Original: ${currentProd.toFixed(1)})`;
                        (window as any).__GAP_DEBUG = debugInfo;

                        console.log(`${action} última ordem de ${(originalDuration * 24).toFixed(2)}h para ${(newDuration * 24).toFixed(2)}h.`);
                        console.log(`Produção mantida em ${currentProd.toFixed(1)} (Fator seria: ${ratio.toFixed(4)}, Aplicado: ${appliedRatio.toFixed(4)})`);

                        // Armazenar os valores originais para exibição no frontend (dashboard)
                        lastRow['_original_prod'] = currentProd;
                        lastRow['_original_end_serial'] = originalEndSerial;
                        lastRow['_trim_ratio'] = appliedRatio;

                        lastRow[prodCol] = newProd;
                      }
                    }
                  } else if (typeof originalEndSerial !== 'number' || typeof originalStartSerial !== 'number') {
                    console.warn("Ajuste ignorado: Data de início ou fim original inválida.");
                  }

                  // Atualiza a coluna de término e término final
                  lastRow[terminoCol] = endOfMonthSerial;

                  const terminoFinalCol = headers.find(h => h.toLowerCase().includes('final'));
                  if (terminoFinalCol) {
                    lastRow[terminoFinalCol] = endOfMonthSerial;
                  }

                  // Atualiza no array
                  filteredByMonth[lastOrderIndex] = lastRow;
                }
              }

              console.log(`Linhas finais: ${filteredByMonth.length}`);
            }

            if (type === 'pcp') {
              setPcpData(filteredByMonth);

              if (filteredByMonth.length > 0) {
                let msg = `Arquivo carregado! ${filteredByMonth.length} registros. Sincronizando com banco...`;
                if ((window as any).__GAP_DEBUG) {
                  msg += (window as any).__GAP_DEBUG;
                }
                setSuccessMsg(msg);

                const normalizedPcp = filteredByMonth.map(row => ({
                  sap: String(getColumnValue(row, ['_ai_sap', 'Código SAP', 'Código SAP2', 'SAP', 'Codigo SAP2'], false) || "").trim(),
                  op: String(getColumnValue(row, ['OP', 'Ordem'], false) || "").trim(),
                  descricao: String(getColumnValue(row, ['Descrição', 'Descricao'], false) || "").trim(),
                  bitola: String(getColumnValue(row, ['Bitola', 'BITOLA', 'Dimensão'], false) || "").trim(),
                  inicio: getRowDateStr(getColumnValue(row, ['_ai_data', 'Início', 'Inicio', 'Data', 'Data Início'], false)),
                  producao_planejada: getColumnValue(row, ['Qtde REAL (t)', 'producao_planejada', '_ai_producao'], true),
                  setup: getColumnValue(row, ['_ai_setup', 'Setup'], true),

                  // --- Metadados e Ajustes Especiais ---
                  _original_prod: row['_original_prod'] || null,
                  _original_end_date: row['_original_end_serial'] ? excelSerialToDate(row['_original_end_serial']).toISOString().split('T')[0] : null,
                  _trim_ratio: row['_trim_ratio'] || null,

                  data_sincronizacao: new Date().toISOString()
                }));

                savePcpToSupabase(normalizedPcp)
                  .then(() => {
                    setSuccessMsg(`Sincronização concluída! ${filteredByMonth.length} registros salvos no Supabase.`);
                    setCurrentView('pcp_details');
                    navigate('/');
                  })
                  .catch(err => {
                    console.error("Erro ao sincronizar PCP:", err);
                    setSuccessMsg(`Dados carregados localmente, mas erro ao salvar no banco: ${err.message}`);
                  });
              }
            } else {
              setPcpSecondary(processed);
              setShowComparator(true);
            }
          }
        } else {
          // Processamento e Upload de Metas para o Supabase
          setMetaFileName(file.name);
          const rawMetas = XLSX.utils.sheet_to_json(worksheet);
          console.log("Metas raw carregadas:", rawMetas);

          // Normaliza os dados para o formato esperado pelo banco
          const normalizedMetas = rawMetas.map((row: any) => {
            // Helper para busca fuzzy se a busca exata falhar
            const findColumnValueFuzzy = (row: any, keywords: string[]) => {
              // 1. Tenta busca exata primeiro (usando a lista conhecida)
              const exact = getColumnValue(row, keywords, true);
              if (exact > 0) return exact;

              // 2. Busca Fuzzy: Procura nas chaves da linha algo que contenha as palavras
              const foundKey = Object.keys(row).find(k => {
                const normalizedK = String(k).toLowerCase();
                return keywords.some(kw => normalizedK.includes(kw.toLowerCase()));
              });

              if (foundKey) return cleanNumber(row[foundKey]);
              return 0;
            };

            const sap = getColumnValue(row, ['SAP', 'Código SAP', 'Material', 'Codigo SAP2', 'Produto', 'Código', 'Codigo', 'Item'], false);
            const bitola = getColumnValue(row, ['Bitola', 'BITOLA', 'Dimensão', 'Dimensao', 'Bit.'], false);
            const familia = getColumnValue(row, ['Família', 'Familia', 'Family', 'Grupo'], false);
            const massaLinear = getColumnValue(row, ['Massa Linear', 'Massa', 'Peso Linear', 'Massa (kg/m)', 'kg/m', 'g/m'], true);

            // Busca Gás e Energia de forma ULTRA robusta (Agora com siglas GN e EE)
            const gas = findColumnValueFuzzy(row, ['GN', 'Gás', 'Gas', 'Natural', 'Consumo', 'Meta', 'Específico', 'Esp.', 'm3/t', 'm³/t', 'm3']);
            const energia = findColumnValueFuzzy(row, ['EE', 'Energia', 'Elétrica', 'Eletrica', 'kWh', 'Meta Energia', 'Específico Energia', 'kWh/t', 'Specific']);

            const rm = getColumnValue(row, ['Rendimento (%)', 'RM', 'Rentabilidade', 'Yield', 'Rendimento'], true);

            // Só retorna se tiver pelo menos o SAP OU Bitola
            if (!sap && !bitola) return null;

            return {
              sap: String(sap || bitola || "").trim(),
              bitola: String(bitola || "").trim(),
              gas: gas,
              energia: energia,
              rm: rm,
              ...(familia ? { familia: String(familia).trim() } : {}),
              ...(massaLinear ? { massa_linear: massaLinear } : {})
            };
          }).filter((m: any) => m !== null);

          const uniqueMetasMap = new Map();
          normalizedMetas.forEach((m: any) => {
            const key = m.sap ? m.sap : `BITOLA_${m.bitola}`;
            uniqueMetasMap.set(key, m);
          });
          const uniqueMetas = Array.from(uniqueMetasMap.values());

          if (uniqueMetas.length > 0) {
            setMetaData(uniqueMetas); // Atualiza estado local // Atualiza estado local
            setSuccessMsg(`Carregando ${uniqueMetas.length} metas únicas para o banco de dados...`);

            // Envia para o Supabase
            updateMetasInSupabase(uniqueMetas)
              .then(() => {
                setSuccessMsg("Metas atualizadas no banco de dados com sucesso!");
                setSupabaseStatus('online'); // Assume online se deu certo
              })
              .catch(err => {
                console.error("Erro ao salvar metas:", err);
                setSuccessMsg(`Erro no banco: ${err.message || JSON.stringify(err)}. Dados locais OK.`);
              });
          } else {
            alert("Não foi possível identificar colunas de metas (SAP, Gás, Energia) no arquivo.");
          }
        }
      } catch (err) {
        console.error("Erro ao ler arquivo:", err);
        alert("Erro ao ler o arquivo. Verifique o console (F12) para detalhes.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [metaData, navigate, pcpData]);

  // --- Lógica PWA: Instalação ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('✅ App pronto para instalação PWA');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 70;
    const isRightSwipe = distance < -70;

    if (isLeftSwipe) {
      // Avançar View
      if (currentView === 'dashboard') handleToggleView('forecast');
      else if (currentView === 'forecast') handleToggleView('simulator');
    }
    if (isRightSwipe) {
      // Voltar View
      if (currentView === 'simulator') handleToggleView('forecast');
      else if (currentView === 'forecast') handleToggleView('dashboard');
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleDemo = () => {
    setFileName("DEMO_OPERACIONAL_2024.xlsx");
    setMetaData([{ sap: "SAP-001", gas: 15.5, energia: 42.0, rm: 0.96 }, { sap: "SAP-002", gas: 22.1, energia: 55.3, rm: 0.94 }]);
    const demoPcp = [];
    for (let i = 1; i <= 30; i++) {
      demoPcp.push({
        _ai_sap: i % 2 === 0 ? "SAP-001" : "SAP-002",
        _ai_producao: 70 + Math.random() * 50,
        _ai_data: `${i < 10 ? '0' + i : i}/05/2024`,
        _ai_setup: Math.random() > 0.8 ? 45 : 0,
        _ai_produtividade: 1.1 + Math.random() * 0.5,
        _ai_utilizacao: 80 + Math.random() * 15,
        _ai_massa_linear: 12.15 + (Math.random() * 0.5)
      });
    }
    setPcpData(demoPcp);
  };

  const tooltipFormatter = (value: number) => {
    return [value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), ""];
  };

  const { healthScore, healthIssues } = useMemo(() => {
    let score = 100;
    const issues: any[] = [];
    const total = Math.max(1, pcpData.length);

    if (missingSaps.length > 0) {
      // Penalidade Proporcional: 5% de erro = -20 pontos (Peso 400)
      const pct = missingSaps.length / total;
      const deduction = Math.min(60, Math.round(pct * 400));
      score -= deduction;
      issues.push({ type: 'error', message: `${missingSaps.length} produtos sem meta cadastrada`, deduction });
    }

    const zeroProdCount = pcpData.filter(r => r._ai_producao <= 0).length;
    if (zeroProdCount > 0) {
      // Penalidade Leve: 10% de registros zerados = -10 pontos
      const deduction = Math.min(20, Math.round((zeroProdCount / total) * 100));
      score -= deduction;
      issues.push({ type: 'warning', message: `${zeroProdCount} registros com produção zerada`, deduction });
    }

    const crazyDeals = pcpData.filter(r => r._ai_setup > 600).length;
    if (crazyDeals > 0) {
      score -= 5;
      issues.push({ type: 'warning', message: `${crazyDeals} registros com setup > 10h`, deduction: 5 });
    }

    if (pcpData.length === 0) return { healthScore: 100, healthIssues: [] };
    return { healthScore: Math.floor(Math.max(0, score)), healthIssues: issues };
  }, [pcpData, missingSaps]);

  const handleToggleView = (view: 'dashboard' | 'forecast' | 'simulator' | 'pcp_details' | 'metallic_yield' | 'podcast' | 'hrs' | 'budget') => {
    setCurrentView(view as any);
    switch (view) {
      case 'budget': navigate('/orcamento'); break;
      case 'hrs': navigate('/simulador-hrs'); break;
      case 'simulator': navigate('/simulador'); break;
      case 'pcp_details': navigate('/pcp-detalhes'); break;
      case 'metallic_yield': navigate('/rendimento'); break;
      case 'podcast': navigate('/podcast'); break;
      case 'forecast': navigate('/previsao'); break;
      default: navigate('/'); break;
    }
  };

  const DashboardContentValues = () => (
    <>
      {successMsg && <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center gap-3 mb-8 text-emerald-800 font-bold"><CheckCircle size={20} /> {successMsg}</div>}

      {/* --- AVISO DO PREDITOR REMOVIDO POR SOLICITAÇÃO --- */}

      {/* Painel de IA Gemini (Aparece sob demanda) */}
      {(isAnalysing || aiReport) && (
        <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-200 backdrop-blur-xl p-8 rounded-[2.5rem] mb-10 animate-in zoom-in-95 duration-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4">
            <button onClick={() => setAiReport(null)} className="text-secondary hover:text-foreground transition-colors">✕</button>
          </div>

          <div className="flex items-start gap-6 relative z-10">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg animate-pulse">
              <Sparkles size={28} />
            </div>

            <div className="flex-1 space-y-4">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                Análise Estratégica Gemini
                {isAnalysing && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin ml-2" />}
              </h3>

              {isAnalysing ? (
                <div className="space-y-2">
                  <div className="h-4 bg-blue-200/50 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-blue-200/50 rounded w-1/2 animate-pulse"></div>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                  {aiReport?.split('\n').map((line, i) => (
                    <p key={i} className={line.startsWith('#') ? 'text-lg font-black text-blue-700 mt-4' : ''}>
                      {line.replace(/###|[*]/g, '')}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Decorative gradients */}
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>
        </div>
      )}

      {effectiveView === 'forecast' ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="glass rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 animate-float">
            <div className="flex flex-wrap items-center gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Data de Referência (Corte)</label>
                <input type="date" value={corteDate} onChange={(e) => setCorteDate(e.target.value)} className="glass-input px-6 py-3 font-black text-foreground focus:ring-4 focus:ring-blue-100/50 transition-all text-lg" />
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 max-w-xs">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Info size={12} /> Como funciona?</p>
                <p className="text-xs text-blue-800 dark:text-blue-200 font-medium leading-relaxed">Insira o acumulado real até <b>{new Date(corteDate).toLocaleDateString()}</b>. O sistema somará o plano PCP do dia seguinte em diante.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-200 min-w-[280px]">
              <div className="p-3 bg-white/10 rounded-xl"><Timer size={24} /></div>
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status da Previsão</span><span className="text-lg font-black uppercase tracking-tight">Híbrida: Real + PCP</span></div>
            </div>

            {/* Box: Fonte de Dados Utilidades (Real) */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 min-w-[240px] group relative">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 group-hover:scale-110 transition-transform duration-300">
                <Activity size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Base Utilidades</span>
                    <div className="group/path relative inline-block">
                      <Info size={12} className="text-slate-300 cursor-help hover:text-blue-500 transition-colors" />
                      <div className="absolute left-0 bottom-full mb-3 hidden group-hover/path:block bg-slate-900 text-white text-[11px] p-3 rounded-xl shadow-2xl z-[100] whitespace-nowrap border border-slate-700 animate-in fade-in zoom-in-95 backdrop-blur-md">
                        <div className="font-bold text-amber-400 mb-1">Caminho na Rede:</div>
                        <code className="text-[10px] opacity-90">\\brqbnwvfs02vs\Departamentos\GEM\Utilidades\2026\03- CONTROLE DE ENERGÉTICOS</code>
                        <div className="absolute top-full left-3 -mt-1 border-[6px] border-transparent border-t-slate-900" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-black tracking-widest">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    CONECTADO
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-800 dark:text-white truncate">
                    Diário de Bordo {lastRealDate ? `(Até ${lastRealDate.split('-').reverse().slice(0, 2).join('/')})` : '(Real)'}
                  </span>
                  {utilidadesLastModified && (
                    <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                      Salvo na rede em: {utilidadesLastModified}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Box: Fonte de Dados PCP (Plano) */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 min-w-[220px]">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><FileText size={20} /></div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Base PCP</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-800 dark:text-white truncate" title={fileName || "Automático"}>
                    {fileName || "Automático"}
                  </span>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black tracking-widest ${n8nStatus === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    N8N {n8nStatus === 'online' ? 'OK' : 'OFF'}
                  </div>
                </div>
              </div>
            </div>

            {/* Box: Fonte de Dados Metas (Banco) */}
            <div className={`flex items-center gap-4 p-5 rounded-2xl shadow-xl min-w-[220px] border transition-all duration-500 ${supabaseStatus === 'online' ? 'bg-emerald-100/50 border-emerald-100' : 'bg-amber-100/50 border-amber-100'}`}>
              <div className={`p-3 rounded-xl ${supabaseStatus === 'online' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'}`}>
                <Database size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Base de Metas</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black truncate ${supabaseStatus === 'online' ? 'text-emerald-700' : 'text-amber-700'}`} title={metaFileName || "Banco de Dados"}>
                    {metaFileName || (supabaseStatus === 'online' ? `${metaData.length} Itens (OK)` : 'Carregando...')}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${supabaseStatus === 'online' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <ForecastCard
              title="Produção"
              value={manualAcum.producao}
              ritmo={hybridForecast.producao}
              plannedValue={hybridForecast.metaProd}
              onValueChange={(v) => setManualAcum(p => ({ ...p, producao: v }))}
              unit="t"
              icon={<Boxes size={20} />}
              colorClass="bg-blue-500 text-blue-500"
              producaoAcumulada={manualAcum.producao}
            />
            <ForecastCard
              title="Gás Natural"
              value={manualAcum.gn}
              ritmo={hybridForecast.gas}
              plannedValue={hybridForecast.metaGas}
              plannedProduction={hybridForecast.metaProd}
              futureProduction={hybridForecast.producao}
              onValueChange={(v) => setManualAcum(p => ({ ...p, gn: v }))}
              unit="m³"
              icon={<Flame size={20} />}
              colorClass="bg-orange-500 text-orange-500"
              showSpecific specUnit="m³/t"
              producaoAcumulada={manualAcum.producao}
              meta={calculatedTotals.metaMedGas}
              price={costs.gas}
            />
            <ForecastCard
              title="Energia (EE)"
              value={manualAcum.ee}
              ritmo={hybridForecast.energia}
              plannedValue={hybridForecast.metaEE}
              plannedProduction={hybridForecast.metaProd}
              futureProduction={hybridForecast.producao}
              onValueChange={(v) => setManualAcum(p => ({ ...p, ee: v }))}
              unit="kWh"
              icon={<Zap size={20} />}
              colorClass="bg-amber-500 text-amber-500"
              showSpecific specUnit="kWh/t"
              producaoAcumulada={manualAcum.producao}
              meta={calculatedTotals.metaMedEE}
              price={costs.energy}
            />
            <ForecastCard
              title="Rendimento"
              value={manualAcum.rm}
              ritmo={manualAcum.rm} // Para Yield, o ritmo é exibido como a previsão final ponderada internamente
              plannedValue={hybridForecast.metaRM}
              plannedProduction={hybridForecast.metaProd}
              futureProduction={hybridForecast.producao}
              futureRM={hybridForecast.futureRM}
              onValueChange={(v) => setManualAcum(p => ({ ...p, rm: v }))}
              unit="%"
              icon={<Percent size={20} />}
              colorClass="bg-emerald-500 text-emerald-500"
              producaoAcumulada={manualAcum.producao}
              meta={calculatedTotals.metaMedRM}
              price={costs.material}
              isYield
            />
          </div>
        </div>
      ) : effectiveView === 'simulator' ? (
        <ScenarioSimulator baseData={calculatedTotals} costs={costs} onClose={() => handleToggleView('dashboard')} />
      ) : effectiveView === 'pcp_details' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <PcpDetailView
            data={pcpData}
            fileName={fileName}
            onBack={() => handleToggleView('dashboard')}
            totals={calculatedTotals}
            metasMap={metasMap}
          />
        </div>
      ) : effectiveView === 'metallic_yield' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-auto">
          <MetallicYieldSimulator />
        </div>
      ) : effectiveView === 'podcast' ? (
        <PodcastView />
      ) : (
        <div className="space-y-10 animate-in fade-in duration-700">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-10">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="p-2 bg-slate-900 rounded-lg text-white"><Info size={20} /></div><h2 className="text-xl font-black tracking-tight text-slate-800 uppercase">Contexto Operacional</h2></div>
              <div className="flex items-center gap-4">
                {isOffline && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-full border border-rose-200 shadow-sm animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-[10px] font-black uppercase text-rose-700 tracking-widest">Modo Offline (PWA)</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                  <div className={`w-2 h-2 rounded-full ${supabaseStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Database: {supabaseStatus}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-50">
              <div className="p-8"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Mês de Referência</span><div className="flex items-center gap-2"><Calendar size={18} className="text-blue-500" /><span className="text-lg font-black text-slate-800">{referenceMonth}</span></div></div>
              <div className="p-8"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Sincronização</span><div className="flex items-center gap-2"><Database size={18} className="text-emerald-500" /><span className="text-lg font-black text-slate-800">{supabaseStatus === 'online' ? 'Conectado' : 'Offline'}</span></div></div>
              <div className="p-8">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fonte de Dados</span>
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-amber-500" />
                  <span className="text-sm font-bold text-slate-800 truncate flex items-center gap-2">
                    {fileName || "Automático"}
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider ${n8nStatus === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      <div className={`w-1.5 h-1.5 flex-shrink-0 rounded-full ${n8nStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      N8N {n8nStatus === 'online' ? 'ATIVO' : 'OFFLINE'}
                    </div>
                  </span>
                </div>
              </div>
              <div className="p-8"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Volume de Dados</span><div className="flex items-center gap-2"><Activity size={18} className="text-purple-500" /><span className="text-lg font-black text-slate-800">{pcpData.length} Registros</span></div></div>
            </div>
          </div>

          {/* NOVO: Card de Orçamento Mensal (Prometido) */}
          {monthlyBudget && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-2xl mb-10 overflow-hidden relative group animate-in fade-in slide-in-from-top-4 duration-1000">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                      <Target className="text-blue-400" size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight uppercase leading-none mb-1">Orçamento do Mês</h2>
                      <p className="text-slate-400 text-[10px] font-black tracking-[0.2em] uppercase">Target Corporativo Consolidado</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-slate-300">
                    <Trophy size={16} className="text-amber-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{referenceMonth}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-12">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Produção</span>
                    <div className="flex items-baseline gap-1 whitespace-nowrap">
                      <span className="text-2xl md:text-3xl font-black text-white">{monthlyBudget.producao.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      <span className="text-xs md:text-sm font-bold text-slate-400">t</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Gás Natural</span>
                    <div className="flex items-baseline gap-1 whitespace-nowrap">
                      <span className="text-2xl md:text-3xl font-black text-orange-400">{monthlyBudget.gas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-xs md:text-sm font-bold text-slate-400">m³/t</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Energia (EE)</span>
                    <div className="flex items-baseline gap-1 whitespace-nowrap">
                      <span className="text-2xl md:text-3xl font-black text-amber-400">{monthlyBudget.energia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-xs md:text-sm font-bold text-slate-400">kWh/t</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Yield (RM)</span>
                    <div className="flex items-baseline gap-1 whitespace-nowrap">
                      <span className="text-2xl md:text-3xl font-black text-emerald-400">{monthlyBudget.rendimento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-xs md:text-sm font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
            <MetricCard
              title="Produção Total"
              value={calculatedTotals.totalProducao.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              unit="t"
              meta={monthlyBudget?.producao}
              icon={<Boxes className="text-blue-600" />}
              color="text-blue-600"
              helpText="Soma total da produção prevista para o mês, unindo dados reais e planejamento PCP."
              indicator={calculatedTotals.lastOrder ? {
                label: "Último Material",
                value: `${calculatedTotals.lastOrder.desc} @ ${calculatedTotals.lastOrder.timeStr}`,
                color: "text-blue-600",
                details: calculatedTotals.totalTrimmed > 0
                  ? [{ name: `Aparado do mês (-${Math.round(calculatedTotals.totalTrimmed)}t)`, date: calculatedTotals.cutDetails[0]?.date || 'Fim do Mês' }]
                  : calculatedTotals.totalExtended > 0
                    ? [{ name: `Preenchido no mês (+${Math.round(calculatedTotals.totalExtended)}t)`, date: calculatedTotals.cutDetails[0]?.date || 'Fim do Mês' }]
                    : undefined
              } : (calculatedTotals.totalTrimmed > 0 ? {
                label: "Volume Aparado (Mês)",
                value: `-${calculatedTotals.totalTrimmed.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t`,
                color: "text-rose-500",
                details: calculatedTotals.cutDetails
              } : calculatedTotals.totalExtended > 0 ? {
                label: "Volume Preenchido (Mês)",
                value: `+${calculatedTotals.totalExtended.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t`,
                color: "text-emerald-500",
                details: calculatedTotals.cutDetails
              } : undefined)}
            />
            <MetricCard
              title="Consumo Gás (Plan)"
              value={calculatedTotals.avgGas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              unit="m³/t"
              meta={monthlyBudget?.gas}
              inverse
              icon={<Flame className="text-orange-600" />}
              color="text-orange-600"
              helpText="Média ponderada do consumo de gás natural previsto por tonelada produzida."
              indicator={{
                label: "Custo Total Plan.",
                value: `R$ ${calculatedTotals.totalCustoGas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
                color: "text-orange-600"
              }}
            />
            <MetricCard
              title="Consumo Energia (Plan)"
              value={calculatedTotals.avgEE.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              unit="kWh/t"
              meta={monthlyBudget?.energia}
              inverse
              icon={<Zap className="text-yellow-600" />}
              color="text-amber-600"
              helpText="Média ponderada do consumo de energia elétrica previsto por tonelada produzida."
              indicator={{
                label: "Custo Total Plan.",
                value: `R$ ${calculatedTotals.totalCustoEnergia.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
                color: "text-amber-600"
              }}
            />
            <MetricCard
              title="Rendimento Med."
              value={calculatedTotals.avgRM.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              unit="%"
              meta={monthlyBudget?.rendimento}
              icon={<Percent className="text-emerald-600" />}
              color="text-emerald-600"
              helpText="Rendimento metálico médio esperado com base no mix de produtos planejado."
            />
            <MetricCard title="Massa Linear" value={calculatedTotals.avgMassaLinear.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} unit="kg/m" icon={<Weight className="text-slate-800" />} color="text-slate-800" helpText="Massa linear média do mix de produtos (peso por metro)." />
            <MetricCard title="Produtividade" value={calculatedTotals.avgProd.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit="t/h" icon={<BarChart4 className="text-purple-600" />} color="text-purple-600" helpText="Capacidade média de produção horária prevista para o mix atual." />
            <MetricCard
              title="Setup"
              value={calculatedTotals.totalSetupHoras.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              unit="h"
              icon={<Clock className="text-indigo-600" />}
              color="text-indigo-600"
              helpText="Tempo total estimado para trocas de bitola e preparações de máquina no mês."
              indicator={{
                label: "Impacto (+800m³/h)",
                value: `+${(calculatedTotals.setupGasPenalty || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m³`,
                color: "text-indigo-600"
              }}
            />
          </div>
          {pcpData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gráfico 1: Gás Natural vs Produção */}
              <div className="glass-card p-8 rounded-[2.5rem] border-border shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                    <Flame className="text-orange-500" /> Monitoramento Térmico
                  </h3>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-secondary">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Produção</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-500 rounded-full"></div> Gás Plan.</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-destructive rounded-sm opacity-30"></div> Estouro Meta</div>
                  </div>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="data"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--secondary)', fontSize: 11, fontWeight: 700 }}
                      />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#3b82f6', fontSize: 11, fontWeight: 700 }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#f97316', fontSize: 11, fontWeight: 700 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)',
                          borderRadius: '1.5rem',
                          color: 'var(--foreground)',
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="producao" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" name="Produção (t)" />
                      <Area yAxisId="right" type="stepAfter" dataKey="gasLoss" stroke="transparent" fillOpacity={1} fill="url(#colorLoss)" name="Ineficiência" stackId="loss" />
                      <Line yAxisId="right" type="monotone" dataKey="gasMeta" stroke="var(--secondary)" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Meta Específica" />
                      <Line yAxisId="right" type="monotone" dataKey="gasEspecifico" stroke="#f97316" strokeWidth={4} dot={{ r: 4, fill: '#f97316' }} name="Gás m³/t" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Energia vs Produção */}
              <div className="glass-card p-8 rounded-[2.5rem] border-border shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                    <Zap className="text-amber-500" /> Eficiência Elétrica
                  </h3>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-secondary">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Produção</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-500 rounded-full"></div> Energia Plan.</div>
                  </div>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorEE" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="data"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--secondary)', fontSize: 11, fontWeight: 700 }}
                      />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#3b82f6', fontSize: 11, fontWeight: 700 }} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#f59e0b', fontSize: 11, fontWeight: 700 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)',
                          borderRadius: '1.5rem',
                          color: 'var(--foreground)',
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="producao" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" name="Produção (t)" />
                      <Line yAxisId="right" type="monotone" dataKey="energiaMeta" stroke="var(--secondary)" strokeDasharray="5 5" strokeWidth={1} dot={false} name="Meta Específica" />
                      <Line yAxisId="right" type="monotone" dataKey="energiaEspecifica" stroke="#f59e0b" strokeWidth={4} dot={{ r: 4, fill: '#f59e0b' }} name="Energia kWh/t" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-[2.5rem] border border-slate-200 p-24 text-center shadow-xl shadow-slate-200/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-10">
                  <div className="absolute inset-0 bg-blue-500 blur-[60px] opacity-10 rounded-full animate-pulse"></div>
                  <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 ring-4 ring-slate-50 relative">
                    <BarChart3 className="text-blue-600" size={64} strokeWidth={1.5} />
                  </div>
                </div>

                <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">
                  Painel de Inteligência <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Industrial</span>
                </h2>

                <p className="text-slate-500 max-w-xl mb-12 text-lg leading-relaxed font-medium">
                  Acompanhe métricas em tempo real, simule cenários de produção e otimize recursos com precisão baseada em dados.
                </p>

                <div className="flex flex-col items-center gap-6">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <input
                      type="file"
                      id="pcp-upload-hero"
                      className="hidden"
                      accept=".xlsx, .xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'pcp');
                      }}
                    />
                    <label
                      htmlFor="pcp-upload-hero"
                      className="group relative px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 flex items-center gap-3 cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <UploadCloud size={20} className="text-blue-400" />
                      <span>Upload PCP</span>
                    </label>

                    {/* Secondary button */}
                    <div className="px-6 py-4 rounded-xl border border-slate-200 text-slate-400 font-bold bg-white cursor-not-allowed hidden sm:block opacity-60 hover:opacity-80 transition-opacity" title="Em breve">
                      Conectar Banco de Dados
                    </div>
                  </div>

                  <button onClick={handleDemo} className="text-slate-400 text-xs font-bold hover:text-blue-600 transition-colors flex items-center gap-2 group/demo">
                    <PlayCircle size={14} className="group-hover/demo:text-blue-500 transition-colors" />
                    Ou carregar dados de exemplo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  const location = useLocation();
  const isFullScreen = location.pathname.includes('/simulador-');

  // Derivar currentView da URL para garantir consistência no Android (HashRouter)
  // Com HashRouter, useLocation().pathname retorna o caminho correto (ex: '/rendimento')
  const urlToViewMap: Record<string, typeof currentView> = {
    '/previsao': 'forecast',
    '/simulador': 'simulator',
    '/pcp-detalhes': 'pcp_details',
    '/rendimento': 'metallic_yield',
    '/podcast': 'podcast',
  };
  const viewFromUrl = urlToViewMap[location.pathname];
  const effectiveView = viewFromUrl || currentView;


  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-blue-900 selection:bg-blue-500/30 transition-colors duration-500 ${isFullScreen ? 'overflow-hidden' : 'pb-20'}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {!isFullScreen && (
        <header className="backdrop-blur-xl bg-white/50 dark:bg-slate-900/50 border-b border-white/40 dark:border-slate-800 lg:sticky lg:top-0 lg:z-50 px-4 md:px-8 py-4 shadow-lg">
          <DashboardHeader
            onFileUpload={handleFileUpload} pcpLoaded={pcpData.length > 0} metasLoaded={metaData.length > 0}
            onGenerate={() => handleToggleView('forecast')} onSave={() => setSuccessMsg("Dados Salvos!")}
            loading={loading} hasForecast={pcpData.length > 0} currentView={currentView} onToggleView={handleToggleView}
            onConfigCosts={() => setShowCostConfig(true)}
            healthScore={healthScore}
            healthIssues={healthIssues}
            missingSaps={missingSaps}
            pcpData={pcpData}
            onMetaSaved={fetchData}
            // @ts-ignore
            onUploadSecondary={(file) => handleFileUpload(file, 'pcp_sec')}
            hasSecondary={pcpSecondary.length > 0}
            onOpenComparator={() => { setShowComparator(true); navigate('/comparator'); }}
            currentMetrics={{
              rendimento: manualAcum.rm,
              gas: manualAcum.producao > 0 ? manualAcum.gn / manualAcum.producao : 0,
              energia: manualAcum.producao > 0 ? manualAcum.ee / manualAcum.producao : 0,
              producao: manualAcum.producao
            }}
            supabaseStatus={supabaseStatus}
            forecastMetrics={{
              rendimento: manualAcum.rm,
              futureRM: hybridForecast.futureRM,
              gas: hybridForecast.gas,
              energia: hybridForecast.energia,
              producao: hybridForecast.producao
            }}
            goals={{
              rendimento: calculatedTotals.metaMedRM,
              gas: hybridForecast.metaGas,
              energia: hybridForecast.metaEE,
              producao: hybridForecast.metaProd
            }}
            manualAcum={manualAcum}
            corteDate={corteDate}
            costs={costs}
            onInstallApp={deferredPrompt ? handleInstallApp : undefined}
          />
        </header>
      )}

      <main className={isFullScreen ? "h-screen w-screen overflow-hidden" : "max-w-[1700px] mx-auto px-8 py-10"} id="dashboard-content">
        {/* DEBUG PANEL - ATIVO (Solicitação do Usuário) - Ocultar em FullScreen */}
        {!isFullScreen && (
          <div className="bg-slate-900 text-emerald-400 p-4 mb-6 rounded-xl font-mono text-xs shadow-lg border border-emerald-900/50 overflow-x-auto">
            <h3 className="font-bold text-white mb-2 border-b border-emerald-900 pb-1">🔍 DIAGNÓSTICO DE DADOS (SUPABASE)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><span className="text-slate-400">Status Conexão:</span> <span className="font-bold">{supabaseStatus}</span></p>
                <p><span className="text-slate-400">Total Metas Baixadas:</span> <span className="font-bold text-white">{metaData.length}</span></p>
                <p><span className="text-slate-400">Total Indexado no Mapa:</span> <span className="font-bold text-white">{Object.keys(metasMap).length}</span></p>
                <p><span className="text-slate-400">Produtos Falhos (Missing):</span> <span className="font-bold text-red-400">{missingSaps.length}</span></p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Chaves da 1ª Meta (Raw do Banco):</p>
                <div className="bg-black/50 p-2 rounded text-amber-300 break-all">
                  {metaData.length > 0 ? JSON.stringify(Object.keys(metaData[0] || {})) : 'Nenhum dado carregado'}
                </div>
              </div>
            </div>
          </div>
        )}
        <Routes>
          <Route path="/" element={<DashboardContentValues />} />
          <Route path="/previsao" element={<DashboardContentValues />} />
          <Route path="/simulador-pcp-mensal" element={<MonthlySimulator metasMap={metasMap} costs={costs} onBack={() => navigate('/')} />} />
          <Route path="/orcamento" element={<AnnualBudget onBack={() => navigate('/')} />} />
          {/* @ts-ignore */}
          <Route path="/comparator" element={<ScenarioComparator pcpA={pcpData} pcpB={pcpSecondary} onClose={() => navigate('/')} />} />
          {/* @ts-ignore */}
          <Route path="/simulador-hrs" element={<HRSSimulator />} />
          <Route path="/simulador" element={<ScenarioSimulator baseData={calculatedTotals} costs={costs} onClose={() => navigate('/')} />} />
          <Route path="/pcp-detalhes" element={<div className="animate-in fade-in slide-in-from-bottom-4 duration-700 p-8"><PcpDetailView data={pcpData} fileName={fileName} onBack={() => navigate('/')} totals={calculatedTotals} metasMap={metasMap} /></div>} />
          <Route path="/rendimento" element={<div className="animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-auto p-8"><MetallicYieldSimulator /></div>} />
          <Route path="/podcast" element={<div className="p-8"><PodcastView /></div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <CostConfigModal
        isOpen={showCostConfig}
        onClose={() => setShowCostConfig(false)}
        initialGasPrice={costs.gas}
        initialEnergyPrice={costs.energy}
        initialMaterialPrice={costs.material}
        onSave={(g, e, m) => setCosts({ gas: g, energy: e, material: m })}
      />
    </div >
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <DashboardWrapper />
    </Router>
  );
};

export default App;
