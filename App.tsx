
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import {
  Flame, Zap, Boxes, Clock, Activity, CheckCircle,
  UploadCloud, Calendar, Database, FileText, Info,
  BarChart4, Percent, PlayCircle, Weight, Timer, BarChart3
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Line, Legend
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
  savePcpToSupabase
} from './services/supabaseClient';
import { ScenarioComparator } from './components/ScenarioComparator';
import { PcpDetailView } from './components/PcpDetailView';
import { MetallicYieldSimulator } from './components/MetallicYieldSimulator';
import { PodcastView } from './components/PodcastView';
import { HRSSimulator } from './src/pages/HRSSimulator';


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
  price?: number;
  isYield?: boolean;
}

const ForecastCard: React.FC<ForecastCardProps> = ({
  title, value, ritmo, unit, icon, colorClass, onValueChange, showSpecific, specUnit, producaoAcumulada, meta, plannedValue, price, isYield
}) => {
  const [localValue, setLocalValue] = useState(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused && Math.round(parseFloat(localValue) || 0) !== Math.round(value)) {
      setLocalValue(Math.round(value).toString());
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

  // Valor formatado para exibição (com pontos de milhar)
  const displayValue = isFocused ? localValue : Math.round(currentNumValue).toLocaleString('pt-BR');
  const specAcum = producaoAcumulada > 0 ? currentNumValue / producaoAcumulada : 0;

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
    <div className="glass-card rounded-[2rem] overflow-hidden relative group">
      <div className={`h-1.5 w-full ${colorClass} opacity-80`} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 text-current`}>{icon}</div>
            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">{title}</h3>
          </div>
          {isWaste && wasteCost > 0 && (
            <div className="px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg text-right animate-pulse">
              <span className="text-[10px] font-bold text-rose-500 uppercase block tracking-widest">Desperdício</span>
              <span className="text-sm font-black text-rose-600">- R$ {wasteCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4 divide-x divide-slate-100">
          <div className="space-y-1 px-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block truncate">Acumulado Real</span>
            <div className="flex items-baseline gap-1 bg-slate-50 p-1.5 rounded-lg border border-transparent focus-within:border-blue-200 transition-all">
              <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleInputChange}
                onBlur={commitChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-lg font-black text-slate-900 outline-none"
              />
              <span className="text-[10px] font-bold text-slate-400 shrink-0">{unit}</span>
            </div>
          </div>

          <div className="space-y-1 px-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block truncate">Meta (PCP)</span>
            <div className="flex items-baseline gap-1 py-1.5">
              <span className={`text-xl font-black ${plannedValue && currentNumValue >= plannedValue ? 'text-emerald-500' : 'text-amber-500'}`}>
                {plannedValue ? Math.round(plannedValue).toLocaleString() : '-'}
              </span>
              <span className="text-[10px] font-bold text-slate-300">{unit}</span>
            </div>
          </div>

          <div className="space-y-1 pl-3">
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest block truncate">Prev. Fechamento</span>
            <div className="flex items-baseline gap-1 py-1.5">
              <span className="text-xl font-black text-blue-600">
                {isYield
                  ? Math.round(ritmo).toLocaleString()
                  : Math.round(currentNumValue + ritmo).toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-blue-300">{unit}</span>
            </div>
          </div>
        </div>

        {(showSpecific || isYield) && (
          <div className="mt-4 pt-4 border-t border-slate-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[8px] font-bold text-slate-400 uppercase block">{isYield ? 'Real' : 'Consumo Esp. Real'}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${isWaste ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {(isYield ? currentNumValue : specAcum).toFixed(2).replace('.', ',')}
                  </span>
                  {(specUnit || unit) && <span className="text-[10px] font-bold text-slate-400">{specUnit || unit}</span>}
                </div>
              </div>
              {meta !== undefined && meta > 0 && (
                <div>
                  <span className="text-[8px] font-bold text-slate-400 uppercase block">Meta Calculada</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500">{meta.toFixed(2).replace('.', ',')}</span>
                    <span className="text-[10px] font-bold text-slate-300">{specUnit || unit}</span>
                  </div>
                </div>
              )}
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
  const [metaData, setMetaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [currentView, setCurrentView] = useState<'dashboard' | 'forecast' | 'simulator' | 'pcp_details' | 'metallic_yield'>('dashboard');
  const [manualAcum, setManualAcum] = useState({ producao: 0, gn: 0, ee: 0, rm: 0 });
  const [supabaseStatus, setSupabaseStatus] = useState<'online' | 'offline' | 'pending'>('pending');

  const [corteDate, setCorteDate] = useState(new Date().toISOString().split('T')[0]);
  const [missingSaps, setMissingSaps] = useState<string[]>([]);
  const [showCostConfig, setShowCostConfig] = useState(false);
  const [costs, setCosts] = useState({ gas: 2.10, energy: 0.45, material: 1500.00 });
  const [pcpSecondary, setPcpSecondary] = useState<any[]>([]);
  const [showComparator, setShowComparator] = useState(false);
  const [alertRules, setAlertRules] = useState([
    { id: '1', metric: 'rendimento', condition: 'less_than', value: 94, active: true },
    { id: '2', metric: 'gas', condition: 'greater_than', value: 20, active: false },
    { id: '3', metric: 'energia', condition: 'greater_than', value: 50, active: false },
  ]);

  const cleanNumber = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let str = String(val).replace(/[^\d,.-]/g, '').trim().replace(/\./g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
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

  useEffect(() => {
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
          setPcpData(data);
        }
      });
  }, []);

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
    // Garante formato YYYY-MM-DD para comparação string segura (sem timezone)
    const corteStr = new Date(corteDate).toISOString().split('T')[0];

    // Futuro (Remaining)
    let remainingProd = 0;
    let remainingGas = 0;
    let remainingEE = 0;
    let remainingSetup = 0;

    // Passado (Planejado até o corte)
    let pastProd = 0;
    let pastGas = 0;
    let pastEE = 0;

    pcpData.forEach(row => {
      const rawDate = getColumnValue(row, ['_ai_data', 'Início', 'Inicio', 'Data', 'Data Início'], false);
      const rowDateStr = getRowDateStr(rawDate);

      // Se data inválida ou maior que corte -> Futuro
      // Comparação de string YYYY-MM-DD funciona perfeitamente: "2026-02-10" > "2026-02-09"
      const isFuture = !rowDateStr || (rowDateStr > corteStr);

      const prod = getColumnValue(row, ['Qtde REAL (t)', '_ai_producao', 'Prod. Acab. (t)', 'Producao', 'Produção', 'Qtd. Planejada', 'Quantidade'], true);
      const setup = getColumnValue(row, ['_ai_setup', 'Setup'], true);
      const sap = getColumnValue(row, ['_ai_sap', 'Código SAP', 'Código SAP2', 'SAP', 'Codigo SAP2'], false);

      // Busca SAP genérica (mesmo método do calculateMetrics)
      let sapStr = sap ? String(sap).trim() : '';
      if (!sapStr) {
        const sapKey = Object.keys(row).find(k => normalize(k).includes('sap') || normalize(k).includes('codigo'));
        sapStr = sapKey ? String(row[sapKey] || "").trim() : "";
      }

      const bitolaKey = Object.keys(row).find(k => normalize(k).includes('bitola'));
      const bitola = bitolaKey ? String(row[bitolaKey] || "").trim() : "";

      let meta = null;

      // 1. Tenta pelo SAP exato
      if (sapStr) {
        meta = metasMap[sapStr] || metasMap[sapStr.replace(/^0+/, '')];
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

      const gas = meta ? prod * cleanNumber(meta.gas || meta['Gás Natural (m³)'] || 0) : 0;
      const energy = meta ? prod * cleanNumber(meta.energia || meta['Energia Elétrica (kWh)'] || 0) : 0;

      if (isFuture) {
        remainingProd += prod;
        remainingSetup += setup;
        remainingGas += gas;
        remainingEE += energy;
      } else {
        pastProd += prod;
        pastGas += gas;
        pastEE += energy;
      }
    });

    return {
      producao: remainingProd, gas: remainingGas, energia: remainingEE, setup: remainingSetup,
      metaProd: pastProd, metaGas: pastGas, metaEE: pastEE
    };
  }, [corteDate, pcpData, manualAcum, metasMap, getColumnValue]);

  const referenceMonth = useMemo(() => {
    if (pcpData.length === 0) return "Nenhum dado carregado";
    const firstDate = getColumnValue(pcpData[0], ['_ai_data', 'Início', 'Inicio', 'Data'], false);
    if (!firstDate) return "Indeterminado";
    const parts = String(firstDate).split('/');
    if (parts.length < 3) return "Indeterminado";
    const monthIndex = parseInt(parts[1]) - 1;
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return `${months[monthIndex]} / ${parts[2]}`;
  }, [pcpData, getColumnValue]);


  const calculateMetrics = useCallback((data: any[]) => {
    let tp = 0, tg = 0, te = 0, trm = 0, crm = 0, ts = 0, tpr = 0, cpr = 0, tml = 0, cml = 0;

    data.forEach(row => {
      // Busca produção com nomes variados (Prioridade para Qtde REAL)
      const prod = getColumnValue(row, ['Qtde REAL (t)', '_ai_producao', 'Prod. Acab. (t)', 'Producao', 'Produção', 'Qtd. Planejada', 'Quantidade'], true);
      tp += prod;

      // Busca setup
      const setup = getColumnValue(row, ['_ai_setup', 'Setup', 'Tempo Setup', 'Minutos Setup'], true);
      ts += setup;

      // Busca produtividade e corrige escala (sanidade)
      let produtividade = getColumnValue(row, ['_ai_produtividade', 'Produtividade', 'Produtividade (t/h)', 't/h', 'Prod/h', 'Ton/h', 'Produtividade Real'], true);

      // Correção heurística de escala:
      // Se > 500, provavelmente está em kg/h (ex: 60000) -> divide por 1000
      // Se após isso ainda > 300, pode ser erro de vírgula ou unidade menor -> divide novamente
      if (produtividade > 500) produtividade /= 1000;

      if (produtividade > 0) {
        // Média PONDERADA pela produção (Volume / Taxa = Horas -> ponderação correta seria: Total Prod / Total Horas)
        // Mas como não temos horas explícitas sempre, vamos usar a média ponderada pelo volume produzido
        // Ou manter aritmética? Usuário reclamou de média estranha.
        // Vamos acumular horas estimadas: horas = Produção / Produtividade
        const horas = prod / produtividade;
        if (horas > 0) {
          tpr += prod; // Total Toneladas onde houve produtividade reportada
          cpr += horas; // Total Horas Calculadas
        }
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

      // Busca massa linear (Linha > Meta)
      let massaLinear = getColumnValue(row, ['_ai_massa_linear', 'Massa Linear', 'g/m', 'kg/m', 'Peso Linear', 'Massa Teórica', 'Massa', 'Peso'], true);
      if (massaLinear === 0 && meta) {
        massaLinear = cleanNumber(meta.massa_linear || meta.massa || meta['Massa Linear'] || meta['kg/m'] || 0);
      }

      // Correção heurística para Massa Linear
      // Aumentado limiar para 500 para evitar dividir tarugos/perfis pesados (ex: 130 kg/m)
      // Se vier 250, assume-se 250 kg/m (Perfil Pesado) e não 0.25 kg/m (Fio 6mm em g/m)
      // Para fios finos, deve-se usar input em kg/m (0.xxx) ou g/m > 500.
      if (massaLinear > 500) massaLinear /= 1000;

      if (massaLinear > 0) {
        tml += massaLinear * prod; // Acumula (Massa * Produção) para média ponderada
        cml += prod;               // Acumula o volume de produção considerado
      }

      if (meta) {
        const gasMeta = cleanNumber(meta.gas || meta['Gás Natural (m³)'] || 0);
        const eeMeta = cleanNumber(meta.energia || meta['Energia Elétrica (kWh)'] || 0);

        tg += prod * gasMeta;
        te += prod * eeMeta;

        const rm = cleanNumber(meta.rm || meta.rendimento || 0);
        if (rm > 0) { trm += rm; crm++; }
      }
    });

    const avgGas = tp > 0 ? tg / tp : 0;
    const custoExtraGas = tp > 0 ? Math.max(0, (tg - (tp * avgGas)) * costs.gas) : 0;

    return {
      totalProducao: Math.round(tp),
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
    };
  }, [metasMap, costs, getColumnValue]);

  const calculatedTotals = useMemo(() => calculateMetrics(pcpData), [pcpData, calculateMetrics]);
  const secondaryTotals = useMemo(() => calculateMetrics(pcpSecondary), [pcpSecondary, calculateMetrics]);

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

      return {
        data: dataStr ? String(dataStr) : '',
        producao: prod,
        gas: meta ? prod * cleanNumber(meta.gas || meta['Gás Natural (m³)'] || 0) : 0,
        energia: meta ? prod * cleanNumber(meta.energia || meta['Energia Elétrica (kWh)'] || 0) : 0,
        gasEspecifico: meta ? cleanNumber(meta.gas || meta['Gás Natural (m³)'] || 0) : 0,
        energiaEspecifica: meta ? cleanNumber(meta.energia || meta['Energia Elétrica (kWh)'] || 0) : 0,
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

    // Converte para array e calcula médias ponderadas
    return Object.values(groupedByDate).map((item: any) => ({
      data: item.data.split('/')[0], // Só o dia
      producao: item.producao,
      gas: item.gas,
      energia: item.energia,
      gasEspecifico: item.producao > 0 ? item.gasEspecificoSum / item.producao : 0,
      energiaEspecifica: item.producao > 0 ? item.energiaEspecificaSum / item.producao : 0
    })).sort((a, b) => {
      // Ordena por data
      const [diaA, mesA] = a.data.split('/').map(Number);
      const [diaB, mesB] = b.data.split('/').map(Number);
      return (mesA * 100 + diaA) - (mesB * 100 + diaB);
    });
  }, [pcpData, metasMap, getColumnValue]);

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
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(10, rawArray.length); i++) {
            const row = rawArray[i];
            if (row && row.some((cell: any) => String(cell).toUpperCase() === 'OP')) {
              headerRowIndex = i;
              console.log(`Cabeçalho encontrado na linha ${i + 1}`);
              break;
            }
          }

          // Extrai cabeçalhos
          const headers = rawArray[headerRowIndex].map((h: any, idx: number) => {
            const header = String(h || '').trim();
            return header || `Col_${idx}`;
          });

          console.log("Cabeçalhos encontrados:", headers.filter(h => !h.startsWith('Col_')));

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
          if (refMonth >= 0 && refYear > 0 && inicioCol) {
            // Define limites para a lógica principal
            const monthStart = new Date(Date.UTC(refYear, refMonth, 1, 0, 0, 0));
            const monthEnd = new Date(Date.UTC(refYear, refMonth + 1, 0, 23, 59, 59));

            // Permite pegar ordens que começam no último dia do mês anterior (transição)
            const toleranceStart = new Date(monthStart);
            toleranceStart.setDate(toleranceStart.getDate() - 1);
            toleranceStart.setUTCHours(23, 0, 0, 0); // Pega apenas ordens do final do dia anterior

            console.log(`Filtrando mês ${refMonth + 1}/${refYear} com tolerância de início.`);

            // 1. Filtra os dados
            filteredByMonth = processed.filter((row: any) => {
              const inicioVal = row[inicioCol];

              // Mantém setups/paradas sem data se forem relevantes
              if (typeof inicioVal !== 'number' || inicioVal <= 40000) {
                const desc = String(row['Descrição'] || row['Cart. Futura'] || '').toLowerCase();
                const isRelevant = desc.includes('setup') || desc.includes('troca') || desc.includes('preventiva');
                const op = String(row['OP'] || '');
                if (op === 'M03' || op === 'OP' || op === '-') return false;
                return isRelevant;
              }

              const date = excelSerialToDate(inicioVal);

              // Aceita se for dentro do mês OU se for a transição do mês anterior (> 23h do dia anterior)
              if (date >= monthStart && date <= monthEnd) return true;
              if (date >= toleranceStart && date < monthStart) return true;

              return false;
            });

            // 2. Ordena por data para garantir que achamos a última corretamente
            filteredByMonth.sort((a, b) => {
              const valA = typeof a[inicioCol] === 'number' ? a[inicioCol] : 0;
              const valB = typeof b[inicioCol] === 'number' ? b[inicioCol] : 0;
              return valA - valB;
            });

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

                // Atualiza a coluna de término e término final
                lastRow[terminoCol] = endOfMonthSerial;

                const terminoFinalCol = headers.find(h => h.toLowerCase().includes('final'));
                if (terminoFinalCol) {
                  lastRow[terminoFinalCol] = endOfMonthSerial;
                }

                // Opcional: Recalcular produção baseado na produtividade?
                // Por enquanto manteremos apenas a extensão do tempo para fechar o calendário

                // Atualiza no array
                filteredByMonth[lastOrderIndex] = lastRow;
              }
            }

            console.log(`Linhas finais: ${filteredByMonth.length}`);
          }

          console.log(`Linhas processadas: ${filteredByMonth.length}`);
          if (filteredByMonth.length > 0) {
            console.log("Colunas finais:", Object.keys(filteredByMonth[0]));
            console.log("Primeira linha:", filteredByMonth[0]);
          }

          if (type === 'pcp') {
            setPcpData(filteredByMonth);

            if (filteredByMonth.length > 0) {
              setSuccessMsg(`Arquivo carregado! ${filteredByMonth.length} registros. Sincronizando com banco...`);

              const normalizedPcp = filteredByMonth.map(row => ({
                sap: String(getColumnValue(row, ['_ai_sap', 'Código SAP', 'Código SAP2', 'SAP', 'Codigo SAP2'], false) || "").trim(),
                op: String(getColumnValue(row, ['OP', 'Ordem'], false) || "").trim(),
                descricao: String(getColumnValue(row, ['Descrição', 'Descricao'], false) || "").trim(),
                bitola: String(getColumnValue(row, ['Bitola', 'BITOLA', 'Dimensão'], false) || "").trim(),
                inicio: getRowDateStr(getColumnValue(row, ['_ai_data', 'Início', 'Inicio', 'Data', 'Data Início'], false)),
                producao_planejada: getColumnValue(row, ['Qtde REAL (t)', '_ai_producao', 'Prod. Acab. (t)', 'Producao', 'Produção', 'Qtd. Planejada', 'Quantidade'], true),
                setup: getColumnValue(row, ['_ai_setup', 'Setup'], true),
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
        } else {
          // Processamento e Upload de Metas para o Supabase
          const rawMetas = XLSX.utils.sheet_to_json(worksheet);
          console.log("Metas raw carregadas:", rawMetas);

          // Normaliza os dados para o formato esperado pelo banco
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
  }, [metaData, navigate]);

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

  const handleToggleView = (view: 'dashboard' | 'forecast' | 'simulator' | 'pcp_details' | 'metallic_yield' | 'podcast' | 'hrs') => {
    if (view === 'hrs') {
      navigate('/simulador-hrs');
      return;
    }
    setCurrentView(view as any);
    navigate('/'); // Garante que volta para a rota base ao clicar nos botões do header
  };

  const DashboardContentValues = () => (
    <>
      {successMsg && <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center gap-3 mb-8 text-emerald-800 font-bold"><CheckCircle size={20} /> {successMsg}</div>}

      {currentView === 'forecast' ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="glass rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 animate-float">
            <div className="flex flex-wrap items-center gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Data de Referência (Corte)</label>
                <input type="date" value={corteDate} onChange={(e) => setCorteDate(e.target.value)} className="glass-input px-6 py-3 font-black text-slate-800 focus:ring-4 focus:ring-blue-100/50 transition-all text-lg" />
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 max-w-xs">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 flex items-center gap-1"><Info size={12} /> Como funciona?</p>
                <p className="text-xs text-blue-800 font-medium leading-relaxed">Insira o acumulado real até <b>{new Date(corteDate).toLocaleDateString()}</b>. O sistema somará o plano PCP do dia seguinte em diante.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl shadow-slate-200 min-w-[280px]">
              <div className="p-3 bg-white/10 rounded-xl"><Timer size={24} /></div>
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status da Previsão</span><span className="text-lg font-black uppercase tracking-tight">Híbrida: Real + PCP</span></div>
            </div>

            {/* Novo Box de Status do Banco */}
            <div className={`flex items-center gap-4 p-6 rounded-2xl shadow-xl min-w-[240px] transition-all duration-500 ${supabaseStatus === 'online' ? 'bg-emerald-600 shadow-emerald-200 text-white' : supabaseStatus === 'offline' ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900'}`}>
              <div className="p-3 bg-white/20 rounded-xl"><Database size={24} /></div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-1 opacity-80">Base de Metas</span>
                <span className="text-lg font-black uppercase tracking-tight">
                  {supabaseStatus === 'pending' ? 'Carregando...' : supabaseStatus === 'offline' ? 'Offline' : `${metaData.length} Itens (OK)`}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <ForecastCard title="Produção" value={manualAcum.producao} ritmo={hybridForecast.producao} plannedValue={hybridForecast.metaProd} onValueChange={(v) => setManualAcum(p => ({ ...p, producao: v }))} unit="t" icon={<Boxes size={20} />} colorClass="bg-blue-500 text-blue-500" producaoAcumulada={manualAcum.producao} />
            <ForecastCard title="Gás Natural" value={manualAcum.gn} ritmo={hybridForecast.gas} plannedValue={hybridForecast.metaGas} onValueChange={(v) => setManualAcum(p => ({ ...p, gn: v }))} unit="m³" icon={<Flame size={20} />} colorClass="bg-orange-500 text-orange-500" showSpecific specUnit="m³/t" producaoAcumulada={manualAcum.producao} meta={calculatedTotals.metaMedGas} price={costs.gas} />
            <ForecastCard title="Energia (EE)" value={manualAcum.ee} ritmo={hybridForecast.energia} plannedValue={hybridForecast.metaEE} onValueChange={(v) => setManualAcum(p => ({ ...p, ee: v }))} unit="kWh" icon={<Zap size={20} />} colorClass="bg-amber-500 text-amber-500" showSpecific specUnit="kWh/t" producaoAcumulada={manualAcum.producao} meta={calculatedTotals.metaMedEE} price={costs.energy} />
            <ForecastCard title="Rendimento" value={manualAcum.rm} ritmo={manualAcum.rm} onValueChange={(v) => setManualAcum(p => ({ ...p, rm: v }))} unit="%" icon={<Percent size={20} />} colorClass="bg-emerald-500 text-emerald-500" producaoAcumulada={manualAcum.producao} meta={calculatedTotals.metaMedRM} price={costs.material} isYield />
          </div>
        </div>
      ) : currentView === 'simulator' ? (
        <ScenarioSimulator baseData={calculatedTotals} costs={costs} onClose={() => handleToggleView('dashboard')} />
      ) : currentView === 'pcp_details' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <PcpDetailView
            data={pcpData}
            fileName={fileName}
            onBack={() => handleToggleView('dashboard')}
            totals={calculatedTotals}
            metasMap={metasMap}
          />
        </div>
      ) : currentView === 'metallic_yield' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-auto">
          <MetallicYieldSimulator />
        </div>
      ) : currentView === 'podcast' ? (
        <PodcastView />
      ) : (
        <div className="space-y-10 animate-in fade-in duration-700">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-10">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="p-2 bg-slate-900 rounded-lg text-white"><Info size={20} /></div><h2 className="text-xl font-black tracking-tight text-slate-800 uppercase">Contexto Operacional</h2></div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100"><div className={`w-2 h-2 rounded-full ${supabaseStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'}`} /><span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Database: {supabaseStatus}</span></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-50">
              <div className="p-8"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Mês de Referência</span><div className="flex items-center gap-2"><Calendar size={18} className="text-blue-500" /><span className="text-lg font-black text-slate-800">{referenceMonth}</span></div></div>
              <div className="p-8"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Sincronização</span><div className="flex items-center gap-2"><Database size={18} className="text-emerald-500" /><span className="text-lg font-black text-slate-800">{supabaseStatus === 'online' ? 'Conectado' : 'Offline'}</span></div></div>
              <div className="p-8"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fonte de Dados</span><div className="flex items-center gap-2"><FileText size={18} className="text-amber-500" /><span className="text-sm font-bold text-slate-800 truncate">{fileName || "Nenhum arquivo"}</span></div></div>
              <div className="p-8"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Volume de Dados</span><div className="flex items-center gap-2"><Activity size={18} className="text-purple-500" /><span className="text-lg font-black text-slate-800">{pcpData.length} Registros</span></div></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
            <MetricCard title="Produção Total" value={calculatedTotals.totalProducao.toLocaleString()} unit="t" icon={<Boxes className="text-blue-600" />} color="bg-blue-600" />
            <MetricCard title="Consumo Gás (Plan)" value={calculatedTotals.avgGas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit="m³/t" icon={<Flame className="text-orange-600" />} color="bg-orange-600" />
            <MetricCard title="Consumo Energia (Plan)" value={calculatedTotals.avgEE.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit="kWh/t" icon={<Zap className="text-yellow-600" />} color="bg-yellow-600" />
            <MetricCard title="Rendimento Med." value={calculatedTotals.avgRM.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit="%" icon={<Percent className="text-emerald-600" />} color="bg-emerald-600" />
            <MetricCard title="Massa Linear" value={calculatedTotals.avgMassaLinear.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} unit="kg/m" icon={<Weight className="text-slate-800" />} color="bg-slate-800" />
            <MetricCard title="Produtividade" value={calculatedTotals.avgProd.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit="t/h" icon={<BarChart4 className="text-purple-600" />} color="bg-purple-600" />
            <MetricCard title="Setup" value={calculatedTotals.totalSetupHoras.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} unit="h" icon={<Clock className="text-indigo-600" />} color="bg-indigo-600" />
          </div>
          {pcpData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gráfico 1: Gás Natural vs Produção */}
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-xl">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 mb-6 uppercase tracking-tight">
                  Consumo Específico de Gás
                </h3>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={1.5} />
                      <XAxis
                        dataKey="data"
                        axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                        height={30}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="left"
                        axisLine={{ stroke: '#3b82f6', strokeWidth: 2 }}
                        tickLine={false}
                        tick={{ fill: '#3b82f6', fontSize: 12, fontWeight: 700 }}
                        domain={[0, 'auto']}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={{ stroke: '#fb923c', strokeWidth: 2 }}
                        tickLine={false}
                        tick={{ fill: '#fb923c', fontSize: 12, fontWeight: 700 }}
                        domain={[0, (dataMax: number) => Math.max(dataMax * 3, 100)]} // Força a escala a ser 3x maior para a linha baixar
                      />
                      <Tooltip
                        formatter={tooltipFormatter}
                        contentStyle={{
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                          borderRadius: '20px',
                          border: '2px solid #e2e8f0',
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
                          padding: '16px',
                          fontWeight: 600
                        }}
                        labelStyle={{ fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={50}
                        wrapperStyle={{ paddingBottom: '20px' }}
                        iconType="circle"
                        formatter={(value) => <span style={{ fontWeight: 700, fontSize: '14px' }}>{value}</span>}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="producao"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="url(#colorProd)"
                        name="Produção (t)"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="gasEspecifico"
                        stroke="#fb923c"
                        strokeWidth={3}
                        dot={false}
                        name="Gás Natural (m³/t)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 2: Energia vs Produção */}
              <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-xl">
                <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-yellow-600 mb-6 uppercase tracking-tight">
                  Consumo Específico de Energia
                </h3>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorProd2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={1.5} />
                      <XAxis
                        dataKey="data"
                        axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                        height={30}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="left"
                        axisLine={{ stroke: '#3b82f6', strokeWidth: 2 }}
                        tickLine={false}
                        tick={{ fill: '#3b82f6', fontSize: 12, fontWeight: 700 }}
                        domain={[0, 'auto']}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={{ stroke: '#f59e0b', strokeWidth: 2 }}
                        tickLine={false}
                        tick={{ fill: '#f59e0b', fontSize: 12, fontWeight: 700 }}
                        domain={[0, (dataMax: number) => Math.max(dataMax * 3, 200)]} // Força a escala a ser 3x maior para a linha baixar
                      />
                      <Tooltip
                        formatter={tooltipFormatter}
                        contentStyle={{
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                          borderRadius: '20px',
                          border: '2px solid #e2e8f0',
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
                          padding: '16px',
                          fontWeight: 600
                        }}
                        labelStyle={{ fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={50}
                        wrapperStyle={{ paddingBottom: '20px' }}
                        iconType="circle"
                        formatter={(value) => <span style={{ fontWeight: 700, fontSize: '14px' }}>{value}</span>}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="producao"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="url(#colorProd2)"
                        name="Produção (t)"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="energiaEspecifica"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={false}
                        name="Energia (kWh/t)"
                      />
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
  const isFullScreen = location.pathname === '/simulador-hrs';

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 selection:bg-blue-200 ${isFullScreen ? 'overflow-hidden' : 'pb-20'}`}>
      {!isFullScreen && (
        <header className="backdrop-blur-xl bg-white/50 border-b border-white/40 sticky top-0 z-50 px-8 py-4 shadow-lg">
          <DashboardHeader
            onFileUpload={handleFileUpload} pcpLoaded={pcpData.length > 0} metasLoaded={metaData.length > 0}
            onGenerate={() => handleToggleView('forecast')} onSave={() => setSuccessMsg("Dados Salvos!")}
            loading={loading} hasForecast={pcpData.length > 0} currentView={currentView} onToggleView={handleToggleView}
            onConfigCosts={() => setShowCostConfig(true)}
            healthScore={healthScore}
            healthIssues={healthIssues}
            // @ts-ignore
            onUploadSecondary={(file) => handleFileUpload(file, 'pcp_sec')}
            hasSecondary={pcpSecondary.length > 0}
            onOpenComparator={() => { setShowComparator(true); navigate('/comparator'); }}
            // @ts-ignore
            alertRules={alertRules}
            // @ts-ignore
            onUpdateAlertRules={setAlertRules}
            currentMetrics={{
              rendimento: calculatedTotals.avgRM,
              gas: calculatedTotals.avgGas,
              energia: calculatedTotals.avgEE,
              producao: calculatedTotals.totalProducao
            }}
            supabaseStatus={supabaseStatus}
          />
        </header>
      )}

      <main className={isFullScreen ? "h-screen w-screen overflow-hidden" : "max-w-[1600px] mx-auto px-8 py-10"} id="dashboard-content">
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
          {/* @ts-ignore */}
          <Route path="/comparator" element={<ScenarioComparator pcpA={pcpData} pcpB={pcpSecondary} onClose={() => navigate('/')} />} />
          {/* @ts-ignore */}
          {/* @ts-ignore */}
          <Route path="/simulador-hrs" element={<HRSSimulator />} />
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
