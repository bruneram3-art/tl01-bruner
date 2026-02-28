import React from 'react';
import { Upload, Factory, Target, Activity, Smartphone, LayoutDashboard, BarChart4, History, DollarSign, TrendingUp, Sparkles, Zap, Headphones, Monitor, FileText, ExternalLink } from 'lucide-react';
import { AuditLogModal } from './AuditLogModal';
import { HealthScorePanel } from './HealthScorePanel';
import { HelpCenterModal } from './HelpCenterModal';
import { generatePDFReport } from '../services/ReportService';
import { SmartAlerts } from './SmartAlerts';

interface Props {
  onFileUpload: (file: File, type: 'pcp' | 'metas') => void;
  pcpLoaded: boolean;
  metasLoaded: boolean;
  onGenerate: () => void;
  onSave: () => void;
  loading: boolean;
  hasForecast: boolean;
  currentView: 'dashboard' | 'forecast' | 'simulator' | 'pcp_details' | 'metallic_yield' | 'podcast' | 'hrs';
  onToggleView: (view: 'dashboard' | 'forecast' | 'simulator' | 'pcp_details' | 'metallic_yield' | 'podcast' | 'hrs') => void;
  onConfigCosts: () => void;
  healthScore?: number;
  healthIssues?: any[];
  missingSaps?: string[];
  pcpData?: any[];
  onMetaSaved?: () => void;
  onUploadSecondary?: (file: File) => void;
  hasSecondary?: boolean;
  onOpenComparator?: () => void;
  currentMetrics?: {
    rendimento: number;
    gas: number;
    energia: number;
    producao: number;
  };
  supabaseStatus?: 'pending' | 'online' | 'offline';
  costs?: {
    gas: number;
    energy: number;
    material: number;
  };
  forecastMetrics?: {
    rendimento: number;
    gas: number;
    energia: number;
    producao: number;
    futureRM?: number;
  };
  goals?: {
    rendimento: number;
    gas: number;
    energia: number;
    producao: number;
  };
  manualAcum?: {
    rm: number;
    gn: number;
    ee: number;
    producao: number;
  };
  corteDate?: string;
  onInstallApp?: () => void;
}

export const DashboardHeader: React.FC<Props> = ({
  onFileUpload,
  pcpLoaded,
  metasLoaded,
  onGenerate,
  onSave,
  loading,
  hasForecast,
  currentView,
  onToggleView,
  onConfigCosts,
  healthScore,
  healthIssues,
  missingSaps,
  pcpData,
  onMetaSaved,
  onUploadSecondary,
  hasSecondary,
  onOpenComparator,
  currentMetrics,
  supabaseStatus,
  forecastMetrics,
  goals,
  manualAcum,
  corteDate,
  costs,
  onInstallApp
}) => {
  const [showAudit, setShowAudit] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);

  const handleExportPDF = () => {
    generatePDFReport('dashboard-content', 'Previsão de Fechamento');
  };

  const isMetasLoading = supabaseStatus === 'pending';
  const isPcpDisabled = isMetasLoading || (supabaseStatus === 'online' && !metasLoaded);

  return (
    <>
      {/* Header Principal com Glassmorphism */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-6 mb-6 z-20">
        {/* Background Effects (Clipped) */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative">
          {/* Top Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
            {/* Logo e Título */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg ring-4 ring-white/30">
                <Factory className="text-white" size={32} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  Industrial Predictor
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 text-sm rounded-full font-black shadow-lg">
                    <Sparkles size={14} fill="currentColor" />
                    PRO
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-500 to-cyan-400 text-white text-[10px] rounded-full font-black shadow-lg animate-pulse ml-2">
                    ANTIGRAVITY ACTIVE 🚀
                  </span>
                </h1>
                <p className="text-white/80 text-sm font-semibold mt-1">
                  Módulo de Previsão de Recursos e Performance
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Smart Alerts (Auto-Ref Based on Budget) */}
              <SmartAlerts
                currentMetrics={currentMetrics}
                forecastMetrics={forecastMetrics}
                goals={goals}
                monthRef={corteDate ? corteDate.slice(0, 7) : undefined}
              />

              {/* Health Score */}
              {healthScore !== undefined && (
                <HealthScorePanel
                  score={healthScore}
                  issues={healthIssues || []}
                  missingSaps={missingSaps}
                  pcpData={pcpData}
                  onMetaSaved={onMetaSaved}
                />
              )}

              {/* Gemini Button */}
              <button
                onClick={() => (window as any).triggerGeminiAnalysis?.()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-black rounded-xl transition-all shadow-xl hover:scale-110 active:scale-95 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <Sparkles size={18} className="animate-pulse" />
                <span>Insights Gemini</span>
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => document.documentElement.classList.toggle('dark')}
                className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-full transition-all shadow-lg hover:rotate-45"
                title="Alternar Modo Escuro"
              >
                <Zap size={20} />
              </button>

              {/* Install PWA Button */}
              {onInstallApp && (
                <button
                  onClick={onInstallApp}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-black rounded-xl transition-all shadow-xl hover:scale-110 active:scale-95 animate-bounce-subtle"
                  title="Instalar no Celular"
                >
                  <Smartphone size={18} />
                  <span>Instalar App</span>
                </button>
              )}



              {/* Help Button */}
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white text-lg font-black rounded-full transition-all shadow-lg hover:scale-110"
                title="Como funciona?"
              >
                ?
              </button>




              {/* Comparator */}
              {onUploadSecondary && hasSecondary && (
                <button
                  onClick={onOpenComparator}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-slate-900 text-sm font-black rounded-xl shadow-lg hover:scale-105 transition-all"
                >
                  <Activity size={16} />
                  Comparar Cenários
                </button>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-wrap gap-2">
            <NavButton icon={<LayoutDashboard size={18} />} label="Dashboard" active={currentView === 'dashboard'} onClick={() => onToggleView('dashboard')} />
            <NavButton icon={<BarChart4 size={18} />} label="Forecast" active={currentView === 'forecast'} onClick={() => onToggleView('forecast')} />
            <NavButton icon={<TrendingUp size={18} />} label="Simulador" active={currentView === 'simulator'} onClick={() => onToggleView('simulator')} />
            {pcpLoaded && (<NavButton icon={<LayoutDashboard size={18} />} label="Tabela PCP" active={currentView === 'pcp_details'} onClick={() => onToggleView('pcp_details')} />)}
            <NavButton icon={<Zap size={18} />} label="Rendimento Metálico" active={currentView === 'metallic_yield'} onClick={() => onToggleView('metallic_yield')} />
            {/* Botão Podcast */}
            <NavButton
              icon={<Headphones size={18} />}
              label="Podcast"
              active={currentView === 'podcast'}
              onClick={() => onToggleView('podcast')}
              badge="NEW"
            />
            {/* Botão Simulador HRC */}
            <NavButton
              icon={<Monitor size={18} />}
              label="Simulador HRC"
              active={currentView === 'hrs'}
              onClick={() => onToggleView('hrs')}
              badge="BETA"
            />
          </div>
        </div>
      </div>

      {/* Secondary Actions Bar */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Upload Section */}
          <div className="flex flex-wrap items-center gap-3">
            <UploadButton
              label={isPcpDisabled ? "Carregando Metas..." : "Upload PCP"}
              icon={isPcpDisabled ? <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" /> : <Upload size={16} />}
              loaded={pcpLoaded}
              onChange={(file: any) => onFileUpload(file, 'pcp')}
              accept=".xlsx,.xls"
              disabled={isPcpDisabled}
            />
            <UploadButton
              label="Upload Metas"
              icon={<Target size={16} />}
              loaded={metasLoaded}
              onChange={(file: any) => onFileUpload(file, 'metas')}
              accept=".xlsx,.xls"
            />
            {onUploadSecondary && !hasSecondary && (
              <UploadButton
                label="Cenário 2"
                icon={<Activity size={16} />}
                loaded={false}
                onChange={onUploadSecondary}
                accept=".xlsx,.xls"
                variant="secondary"
              />
            )}
          </div>


          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton
              label="Configurar Custos"
              icon={<DollarSign size={16} />}
              onClick={onConfigCosts}
              variant="outline"
            />
            <ActionButton
              label="Acessar n8n"
              icon={<ExternalLink size={16} />}
              onClick={() => window.open('http://localhost:5678', '_blank')}
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            />
            <ActionButton
              label="Histórico"
              icon={<History size={16} />}
              onClick={() => setShowAudit(true)}
              variant="outline"
            />

            {/* Relatório Inteligente (PDF) */}
            {forecastMetrics && goals && (
              <ActionButton
                label="Relatório PDF"
                icon={<FileText size={16} />}
                onClick={() => {
                  import('../services/SmartReportService').then(mod => {
                    mod.generateSmartPDFReport({
                      currentMetrics,
                      forecastMetrics,
                      goals,
                      manualAcum: {
                        producao: manualAcum?.producao || 0,
                        rendimento: manualAcum?.rm || 0,
                        gas: manualAcum?.gn || 0,
                        energia: manualAcum?.ee || 0
                      },
                      corteDate,
                      costs
                    });
                  });
                }}
                variant="primary"
                className="from-indigo-600 to-blue-600 shadow-indigo-200"
              />
            )}

            <ActionButton
              label="Gerar Previsão"
              icon={<BarChart4 size={16} />}
              onClick={onGenerate}
              disabled={!pcpLoaded || !metasLoaded || loading}
              loading={loading}
              variant="primary"
            />
            <ActionButton
              label="Salvar no BD"
              icon={<Upload size={16} />}
              onClick={onSave}
              disabled={!hasForecast || loading}
              loading={loading}
              variant="success"
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAudit && <AuditLogModal onClose={() => setShowAudit(false)} />}
      {showHelp && <HelpCenterModal onClose={() => setShowHelp(false)} />}
    </>
  );
};

// ========== COMPONENTES AUXILIARES ==========

const NavButton = ({ icon, label, active, onClick, badge }: any) => (
  <button
    onClick={onClick}
    className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${active
      ? 'bg-white text-indigo-600 shadow-xl scale-105'
      : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
      }`}
  >
    {icon}
    {label}
    {badge && (
      <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 text-xs font-black rounded-full shadow-lg">
        {badge}
      </span>
    )}
  </button>
);

const UploadButton = ({ label, icon, loaded, onChange, accept, variant = 'primary', disabled = false }: any) => (
  <label className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${disabled
    ? 'bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-not-allowed opacity-70'
    : loaded
      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg cursor-pointer hover:scale-105'
      : variant === 'secondary'
        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg cursor-pointer hover:scale-105'
        : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-400 cursor-pointer hover:scale-105'
    }`}>
    {icon}
    {label}
    {loaded && !disabled && <span className="ml-1">✓</span>}
    <input
      type="file"
      accept={accept}
      onChange={(e) => !disabled && e.target.files?.[0] && onChange(e.target.files[0])}
      className="hidden"
      disabled={disabled}
    />
  </label>
);

const ActionButton = ({ label, icon, onClick, disabled = false, loading = false, variant = 'outline', className = '' }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${variant === 'primary'
      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
      : variant === 'success'
        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
        : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-400'
      } ${className}`}
  >
    {loading ? (
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
    ) : (
      icon
    )}
    {label}
  </button>
);
