import React from 'react';

interface DiagnosticPanelProps {
    metasCount: number;
    pcpCount: number;
    metasMapKeysCount: number;
    sampleMetasKeys: string[];
    samplePcpSaps: string[];
    samplePcpBitolas: string[];
    sampleMetasValues?: string[]; // Valores SAP das primeiras metas
    matchTestResult?: string; // Resultado do teste de match
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({
    metasCount,
    pcpCount,
    metasMapKeysCount,
    sampleMetasKeys,
    samplePcpSaps,
    samplePcpBitolas,
    sampleMetasValues = [],
    matchTestResult = "Aguardando teste..."
}) => {
    return (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white p-6 rounded-2xl shadow-2xl max-w-md z-50 border-2 border-yellow-400">
            <h3 className="text-sm font-black mb-4 text-yellow-300 uppercase tracking-wider flex items-center gap-2">
                🔍 Painel de Diagnóstico
            </h3>

            <div className="space-y-3 text-xs font-mono">
                <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-yellow-300 font-bold mb-1">📊 Dados Carregados:</div>
                    <div className="pl-3 space-y-1">
                        <div>• Metas no Supabase: <span className="text-green-400 font-bold">{metasCount}</span></div>
                        <div>• Linhas PCP: <span className="text-blue-400 font-bold">{pcpCount}</span></div>
                        <div>• Chaves no MetasMap: <span className="text-purple-400 font-bold">{metasMapKeysCount}</span></div>
                    </div>
                </div>

                <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-yellow-300 font-bold mb-1">🔑 Amostras de Chaves:</div>
                    <div className="pl-3 space-y-2">
                        <div>
                            <div className="text-slate-400">Metas (primeiras 5):</div>
                            <div className="text-green-300 text-[10px] break-all">{sampleMetasKeys.join(', ')}</div>
                        </div>
                        <div>
                            <div className="text-slate-400">SAPs no PCP (primeiras 5):</div>
                            <div className="text-blue-300 text-[10px] break-all">{samplePcpSaps.join(', ')}</div>
                        </div>
                        <div>
                            <div className="text-slate-400">Bitolas no PCP (primeiras 5):</div>
                            <div className="text-purple-300 text-[10px] break-all">{samplePcpBitolas.join(', ')}</div>
                        </div>
                        {sampleMetasValues.length > 0 && (
                            <div>
                                <div className="text-slate-400">SAPs nas Metas (primeiros 5):</div>
                                <div className="text-yellow-300 text-[10px] break-all">{sampleMetasValues.join(', ')}</div>
                            </div>
                        )}
                    </div>
                </div>

                {matchTestResult && (
                    <div className="bg-slate-800 p-3 rounded-lg">
                        <div className="text-yellow-300 font-bold mb-1">🎯 Teste de Match:</div>
                        <div className="text-white text-[10px] leading-relaxed whitespace-pre-line">{matchTestResult}</div>
                    </div>
                )}

                <div className="text-[10px] text-slate-400 border-t border-slate-700 pt-2 mt-2">
                    ℹ️ Verifique o Console (F12) para logs detalhados
                </div>
            </div>
        </div>
    );
};
