
import React, { useMemo, useState } from 'react';
import { AlertTriangle, AlertCircle, Check, XCircle, Search, FileBarChart, ZapOff, X, Copy } from 'lucide-react';

interface DataIntegrityProps {
    data: any[];
    metasMap: Record<string, any>;
}

interface Issue {
    type: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    count: number;
    items: any[]; // Lista dos itens problemáticos
}

export const DataIntegrityPanel: React.FC<DataIntegrityProps> = ({ data, metasMap }) => {
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

    // Função auxiliar para normalizar chaves
    const normalize = (s: string) => String(s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // ANÁLISE DE DADOS
    const analysis = useMemo(() => {
        const issues: Issue[] = [];
        const missingMetaItems: any[] = [];
        const divergenceItems: any[] = [];
        const zeroConsumptionItems: any[] = [];

        data.forEach(row => {
            // Extração de dados com flexibilidade de nomes de colunas
            const sapKey = Object.keys(row).find(k => k.toLowerCase().includes('sap') && !k.toLowerCase().includes('desc'));
            const sap = sapKey ? String(row[sapKey] || "").trim() : "";

            const bitolaKey = Object.keys(row).find(k => k.toLowerCase().includes('bitola'));
            const bitola = bitolaKey ? String(row[bitolaKey] || "").trim() : "";

            const opKey = Object.keys(row).find(k => k.toLowerCase() === 'op');
            const op = opKey ? String(row[opKey] || "") : "S/N";

            // === REGRA DE EXCEÇÃO: M03 ===
            // Se for Material Indireto/M03, ignoramos na auditoria
            if (normalize(sap).includes('m03') || normalize(op).includes('m03')) {
                return;
            }

            const prodRealKey = Object.keys(row).find(k => normalize(k).includes('real') && normalize(k).includes('(t)'));
            const prodReal = prodRealKey ? parseFloat(String(row[prodRealKey]).replace(',', '.')) || 0 : 0;

            const prodApontadaKey = Object.keys(row).find(k => normalize(k).includes('apontada') || normalize(k).includes('planejada'));
            const prodApontada = prodApontadaKey ? parseFloat(String(row[prodApontadaKey]).replace(',', '.')) || 0 : 0;

            // 1. Validação de Metas (CRÍTICO)
            let hasMeta = false;
            if (metasMap) {
                if (metasMap[sap] || metasMap[sap.replace(/^0+/, '')]) hasMeta = true;
                else if (metasMap[bitola] || metasMap[bitola.replace(',', '.')]) hasMeta = true;
                else if (bitola && Object.keys(metasMap).some(k => k.includes(bitola) || bitola.includes(k))) hasMeta = true;
            }

            if (!hasMeta && (sap || bitola)) {
                missingMetaItems.push({
                    op,
                    sap,
                    bitola,
                    desc: row['Descrição'] || row['descricao'] || '-',
                    detail: '❌ Não Cadastrado (Faltam todas as metas)',
                    impact: prodReal > 0 ? prodReal : prodApontada
                });
            }

            // 2. Divergência de Produção (WARNING)
            if (prodReal > 5 && prodApontada > 0) {
                const diffPct = Math.abs(prodReal - prodApontada) / prodApontada;
                if (diffPct > 0.20) { // 20%
                    divergenceItems.push({
                        op,
                        sap,
                        bitola,
                        desc: row['Descrição'] || row['descricao'] || '-',
                        detail: `⚠️ Var. ${(diffPct * 100).toFixed(0)}% (Real ${prodReal.toFixed(1)} / Plan ${prodApontada.toFixed(1)})`
                    });
                }
            }

            // 3. Consumo Zero (INFO/WARNING)
            if (hasMeta) {
                const meta = metasMap[sap] || metasMap[bitola];
                if (meta) {
                    const gas = meta.gas || meta['Gás Natural (m³)'];
                    // Verifica se meta é explícita zero (e não apenas undefined)
                    if (gas !== undefined && parseFloat(gas) === 0) {
                        zeroConsumptionItems.push({
                            sap,
                            bitola,
                            desc: row['Descrição'] || '-',
                            detail: '⚠️ Meta de Gás/Energia zerada'
                        });
                    }
                }
            }
        });

        // Monta o relatório final
        if (missingMetaItems.length > 0) {
            issues.push({
                type: 'critical',
                title: 'Produtos sem Meta Cadastrada',
                description: 'O cálculo financeiro e de consumo será impreciso para estes itens.',
                count: missingMetaItems.length,
                items: missingMetaItems
            });
        }

        if (divergenceItems.length > 0) {
            issues.push({
                type: 'warning',
                title: 'Divergência: Real vs Apontado',
                description: 'Ordens com variação superior a 20% entre realizado e planejado.',
                count: divergenceItems.length,
                items: divergenceItems
            });
        }

        if (zeroConsumptionItems.length > 0) {
            issues.push({
                type: 'info',
                title: 'Metas Zeradas/Suspeitas',
                description: 'Produtos cadastrados mas com consumo específico igual a zero.',
                count: zeroConsumptionItems.length,
                items: zeroConsumptionItems
            });
        }

        return issues;
    }, [data, metasMap]);

    if (analysis.length === 0) return null;

    const healthScore = Math.max(0, 100 - (analysis.reduce((acc, issue) => acc + (issue.type === 'critical' ? 10 : issue.type === 'warning' ? 5 : 2) * issue.count, 0) / data.length * 100));

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-emerald-500';
        if (score >= 70) return 'text-amber-500';
        return 'text-rose-500';
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <FileBarChart size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Auditoria de Dados</h3>
                        <p className="text-xs text-slate-500">Análise automática de consistência do PCP</p>
                    </div>
                </div>

                <div className="text-right">
                    <div className={`text-2xl font-black ${getScoreColor(healthScore)}`}>
                        {healthScore.toFixed(0)}%
                    </div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Score de Saúde</div>
                </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.map((issue, idx) => (
                    <div key={idx} className={`rounded-xl border p-4 flex flex-col ${issue.type === 'critical' ? 'bg-rose-50 border-rose-100' :
                        issue.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                            'bg-blue-50 border-blue-100'
                        }`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className={`p-1.5 rounded-lg ${issue.type === 'critical' ? 'bg-rose-200 text-rose-700' :
                                issue.type === 'warning' ? 'bg-amber-200 text-amber-700' :
                                    'bg-blue-200 text-blue-700'
                                }`}>
                                {issue.type === 'critical' ? <XCircle size={16} /> :
                                    issue.type === 'warning' ? <AlertTriangle size={16} /> :
                                        <AlertCircle size={16} />}
                            </div>
                            <span className={`text-xs font-black px-2 py-1 rounded-full ${issue.type === 'critical' ? 'bg-rose-200 text-rose-800' :
                                issue.type === 'warning' ? 'bg-amber-200 text-amber-800' :
                                    'bg-blue-200 text-blue-800'
                                }`}>
                                {issue.count} CASOS
                            </span>
                        </div>

                        <h4 className={`font-bold text-sm mb-1 ${issue.type === 'critical' ? 'text-rose-800' :
                            issue.type === 'warning' ? 'text-amber-800' :
                                'text-blue-800'
                            }`}>{issue.title}</h4>

                        <p className={`text-xs mb-3 flex-grow ${issue.type === 'critical' ? 'text-rose-600' :
                            issue.type === 'warning' ? 'text-amber-600' :
                                'text-blue-600'
                            }`}>{issue.description}</p>

                        <div className="mt-auto pt-3 border-t border-black/5">
                            <button
                                onClick={() => setSelectedIssue(issue)}
                                className="text-xs font-bold underline opacity-70 hover:opacity-100 transition-opacity w-full text-left"
                            >
                                Ver lista completa ({issue.items.length})
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL DE DETALHES */}
            {selectedIssue && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedIssue(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className={`p-5 border-b flex justify-between items-center rounded-t-2xl ${selectedIssue.type === 'critical' ? 'bg-rose-50' : selectedIssue.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                            }`}>
                            <div>
                                <h3 className={`font-bold text-lg ${selectedIssue.type === 'critical' ? 'text-rose-800' : selectedIssue.type === 'warning' ? 'text-amber-800' : 'text-blue-800'
                                    }`}>{selectedIssue.title}</h3>
                                <p className="text-xs text-slate-500 font-medium">Total de {selectedIssue.count} ocorrências encontradas</p>
                            </div>
                            <button onClick={() => setSelectedIssue(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="p-0 overflow-y-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3">OP</th>
                                        <th className="px-6 py-3">Produto / Identificação</th>
                                        <th className="px-6 py-3 text-right">Detalhe</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedIssue.items.map((item, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 font-mono text-xs font-bold text-slate-600">{item.op || '-'}</td>
                                            <td className="px-6 py-3 text-slate-600">
                                                <div className="font-medium">{item.sap || item.bitola || 'S/N'}</div>
                                                {item.desc && <div className="text-[10px] text-slate-400">{item.desc}</div>}
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono text-xs font-bold text-slate-500">
                                                <div>{item.detail || '-'}</div>
                                                {item.impact > 0 && (
                                                    <div className="text-[10px] mt-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block border border-blue-100">
                                                        Impacto: {item.impact.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t bg-slate-50 rounded-b-2xl flex justify-between items-center">
                            <div className="text-sm font-bold text-slate-600">
                                Impacto Total: <span className="text-blue-700 text-lg ml-1">{selectedIssue.items.reduce((acc, item) => acc + (item.impact || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t</span>
                            </div>
                            <button onClick={() => setSelectedIssue(null)} className="px-5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
