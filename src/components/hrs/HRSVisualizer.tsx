import React from 'react';
import { useHRS } from './HRSContext';
import { PassType } from '../../utils/hrsTypes';

const SHAPE_COLORS: Record<PassType, { fill: string; stroke: string }> = {
    oval: { fill: 'rgba(239, 68, 68, 0.2)', stroke: '#ef4444' },
    round: { fill: 'rgba(59, 130, 246, 0.2)', stroke: '#3b82f6' },
    box: { fill: 'rgba(234, 179, 8, 0.2)', stroke: '#eab308' },
    flat: { fill: 'rgba(34, 197, 94, 0.2)', stroke: '#22c55e' },
    square: { fill: 'rgba(168, 85, 247, 0.2)', stroke: '#a855f7' },
    diamond: { fill: 'rgba(236, 72, 153, 0.2)', stroke: '#ec4899' },
    angle: { fill: 'rgba(99, 102, 241, 0.2)', stroke: '#6366f1' },
    edge_oval: { fill: 'rgba(239, 68, 68, 0.2)', stroke: '#f87171' },
    swedish_oval: { fill: 'rgba(239, 68, 68, 0.2)', stroke: '#dc2626' },
};

const SHAPE_LABELS: Record<PassType, string> = {
    oval: 'Oval',
    round: 'Redondo',
    box: 'Caixa',
    flat: 'Mesa Lisa',
    square: 'Quadrado',
    diamond: 'Losango',
    angle: 'Cantoneira (L)',
    edge_oval: 'Borda Oval',
    swedish_oval: 'Oval Sueco',
};

import { getChannelPath, getBarPath, calculateEngineeredChannel } from '../../utils/hrsGeometry';

// ... (SHAPE_COLORS and SHAPE_LABELS remain same)

export const HRSVisualizer = () => {
    const { project, selectedNode } = useHRS();
    const selectedPass = project.passes.find(p => p.data.id === selectedNode);

    // Determine dimensions and shape
    let width = project.rawMaterial.width;
    let height = project.rawMaterial.height;
    let channelType: PassType = 'box';
    let area = width * height;
    let perimeter = 2 * (width + height);
    let showProfile = false;

    // Channel Tool Dimensions (Ferramenta)
    let toolWidth = 0;
    let toolHeight = 0;
    let toolRadius = 0;
    let fillRate = 0;

    if (selectedPass) {
        let rawW = selectedPass.data.exitBarWidth;
        let rawH = selectedPass.data.exitBarHeight;
        channelType = selectedPass.data.channelType;

        // Para passes verticais (V), a Luz atua na largura → a barra sai com W < H.
        // No corte transversal, exibimos sempre com a maior dimensão na horizontal.
        // Exceção: diamond e oval edge são intencionalmente mais altos.
        const forceHorizontal = !['diamond', 'edge_oval'].includes(channelType);
        if (forceHorizontal && rawH > rawW) {
            width = rawH;
            height = rawW;
        } else {
            width = rawW;
            height = rawH;
        }

        // Geometria precisa do Canal baseada no material
        // Usar fator térmico dinâmico calculado por passe (α = f(T)) em vez do fixo
        const thermalF = selectedPass.data.thermalDilation || project.process.thermalExpansionFactor;
        const { toolW, toolH } = calculateEngineeredChannel(channelType, width, height, thermalF);

        toolWidth = selectedPass.data.channelWidth || toolW;
        toolHeight = toolH;
        toolRadius = selectedPass.data.radiusConcordance || 0;

        area = selectedPass.data.exitArea;
        perimeter = selectedPass.data.perimeter;
        showProfile = true;

        // Fill Rate Calculation (%)
        if (selectedPass.data.channelArea > 0) {
            fillRate = (selectedPass.data.barOccupiedArea / selectedPass.data.channelArea) * 100;
        }
    } else if (selectedNode === 'materia_prima' || selectedNode === 'secao') {
        showProfile = true;
        channelType = project.rawMaterial.type === 'billet' ? 'box' : 'round';
    }

    // SVG dimensions and scaling - Aumentado para 0.8 para melhor visibilidade
    const svgSize = 280;
    const maxDim = Math.max(width, height, toolWidth, toolHeight, 1);
    const scale = (svgSize * 0.8) / maxDim;
    const cx = svgSize / 2;
    const cy = svgSize / 2;

    const renderShape = () => {
        let channelPath = '';
        if (selectedPass) {
            channelPath = getChannelPath(
                channelType,
                toolWidth * scale,
                toolHeight * scale,
                toolRadius * scale,
                cx, cy
            );
        }

        // AGORA CHAMANDO A FUNÇÃO CORRETA PARA A BARRA
        const barPath = getBarPath(
            channelType,
            width * scale,
            height * scale,
            cx, cy
        );

        return (
            <g>
                <defs>
                    <linearGradient id="hotMetalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#fb923c', stopOpacity: 1 }} />
                        <stop offset="50%" style={{ stopColor: '#f97316', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#ea580c', stopOpacity: 1 }} />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* BACKGROUND: BRANCO LIMPO (ALTO CONTRASTE) */}
                <rect x="0" y="0" width={svgSize} height={svgSize} fill="#ffffff" rx="4" stroke="#e2e8f0" />

                {/* CENTERLINES (TECNICO CAD) */}
                <g stroke="#94a3b8" strokeWidth="1" strokeDasharray="5,3,1,3" opacity="0.6">
                    <line x1={0} y1={cy} x2={svgSize} y2={cy} />
                    <line x1={cx} y1={0} x2={cx} y2={svgSize} />
                </g>

                {/* CAMADA DO CANAL (TOOL) */}
                {selectedPass && (
                    <g>
                        <path
                            d={channelPath}
                            fill="#f8fafc"
                            stroke="#334155"
                            strokeWidth={2}
                        />
                        <text x={cx} y={cy - (toolHeight * scale) / 2 - 12} textAnchor="middle" fontSize={11} fill="#475569" fontWeight={700} className="uppercase">
                            CANAL {channelType}
                        </text>
                    </g>
                )}

                {/* DIMENSIONS (CAD LABELS) */}
                {selectedPass && (
                    <g style={{ pointerEvents: 'none' }}>
                        <text x={cx} y={cy + (height * scale) / 2 + 25} textAnchor="middle" fontSize={11} fill="#64748b" fontWeight={600}>
                            L: {width.toFixed(1)} mm
                        </text>
                        <text x={cx + (width * scale) / 2 + 10} y={cy} textAnchor="start" dominantBaseline="middle" fontSize={11} fill="#64748b" fontWeight={600}>
                            A: {height.toFixed(1)} mm
                        </text>
                    </g>
                )}

                {/* BAR LAYER (MATERIAL) */}
                <g filter="url(#glow)">
                    <path
                        d={barPath}
                        fill="url(#hotMetalGradient)"
                        stroke="#c2410c"
                        strokeWidth={1}
                    />
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="white" fontWeight={900} style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.8)' }}>
                        {width.toFixed(0)}x{height.toFixed(0)}
                    </text>
                </g>
            </g>
        );
    };

    const gridSpacing = svgSize / 14;
    const gridLines = [];
    for (let i = 1; i < 14; i++) {
        const pos = i * gridSpacing;
        const isCenter = i === 7;
        gridLines.push(
            <line key={`h${i}`} x1={0} y1={pos} x2={svgSize} y2={pos}
                stroke={isCenter ? '#94a3b8' : '#f1f5f9'} strokeWidth={isCenter ? 1 : 0.5} />,
            <line key={`v${i}`} x1={pos} y1={0} x2={pos} y2={svgSize}
                stroke={isCenter ? '#94a3b8' : '#f1f5f9'} strokeWidth={isCenter ? 1 : 0.5} />,
        );
    }

    // Dimension markers
    const renderDimensions = () => {
        if (!showProfile) return null;
        const scaledW = width * scale;
        const scaledH = height * scale;

        return (
            <>
                <line x1={cx - scaledW / 2} y1={cy + scaledH / 2 + 20} x2={cx + scaledW / 2} y2={cy + scaledH / 2 + 20}
                    stroke="#64748b" strokeWidth={1} markerStart="url(#arrowL)" markerEnd="url(#arrowR)" />
                <text x={cx} y={cy + scaledH / 2 + 34} textAnchor="middle" fontSize={10} fill="#475569" fontWeight={600}>
                    {width.toFixed(1)}
                </text>
                <line x1={cx + scaledW / 2 + 20} y1={cy - scaledH / 2} x2={cx + scaledW / 2 + 20} y2={cy + scaledH / 2}
                    stroke="#64748b" strokeWidth={1} markerStart="url(#arrowU)" markerEnd="url(#arrowD)" />
                <text x={cx + scaledW / 2 + 32} y={cy + 4} textAnchor="middle" fontSize={10} fill="#475569" fontWeight={600}
                    transform={`rotate(90, ${cx + scaledW / 2 + 32}, ${cy + 4})`}>
                    {height.toFixed(1)}
                </text>
            </>
        );
    };

    return (
        <div className="w-[340px] bg-gray-100 flex flex-col h-full flex-shrink-0">
            <div className="p-2 border-b border-gray-200 bg-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Visualização 2D (Corte Transversal)
            </div>
            <div className="flex-1 flex items-center justify-center p-3">
                <div className="bg-slate-900 border border-slate-700 shadow-xl relative overflow-hidden" style={{ width: svgSize, height: svgSize }}>
                    {showProfile ? (
                        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
                            <defs>
                                <marker id="arrowR" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                    <path d="M0,0 L6,3 L0,6" fill="#64748b" />
                                </marker>
                                <marker id="arrowL" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
                                    <path d="M6,0 L0,3 L6,6" fill="#64748b" />
                                </marker>
                                <marker id="arrowU" markerWidth="6" markerHeight="6" refX="3" refY="1" orient="auto">
                                    <path d="M0,6 L3,0 L6,6" fill="#64748b" />
                                </marker>
                                <marker id="arrowD" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
                                    <path d="M0,0 L3,6 L6,0" fill="#64748b" />
                                </marker>
                            </defs>
                            {gridLines}
                            {renderShape()}
                            {renderDimensions()}
                            {selectedPass?.data.importedLargura || selectedPass?.data.importedAltura ? (
                                <text x={cx} y={cy + (height * scale) / 2 + 45} textAnchor="middle" fontSize={11} fill="#94a3b8" fontWeight={700} className="select-none">
                                    P/C: {selectedPass.data.importedLargura ? `L${selectedPass.data.importedLargura.toFixed(1)}` : ''}
                                    {selectedPass.data.importedAltura ? ` A${selectedPass.data.importedAltura.toFixed(1)}` : ''}
                                </text>
                            ) : null}
                            <text x={8} y={16} fontSize={10} fill="#475569" fontWeight={700}>{SHAPE_LABELS[channelType]}</text>
                        </svg>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                            Selecione um passe
                        </div>
                    )}
                    {fillRate > 0 && (
                        <div className="absolute top-2 right-2 bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 rounded text-[10px] text-orange-400 font-bold">
                            PREENCHIMENTO: {fillRate.toFixed(1)}%
                        </div>
                    )}
                    <div className="absolute bottom-1 right-2 text-[10px] text-gray-600 font-mono">
                        Scale: 1:{Math.round(1 / scale)}
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-300 bg-white p-3">
                <h4 className="text-xs font-bold text-gray-700 mb-2">Propriedades do Perfil</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {[
                        { label: 'Área Barra', value: `${area.toFixed(1)} mm²` },
                        { label: 'Perímetro', value: `${perimeter.toFixed(1)} mm` },
                        { label: 'Largura Barra', value: `${width.toFixed(1)} mm` },
                        { label: 'Altura Barra', value: `${height.toFixed(1)} mm` },
                        ...(selectedPass ? [
                            { label: 'Preenchimento', value: `${fillRate.toFixed(1)}%` },
                            { label: 'Largura Canal', value: `${toolWidth.toFixed(1)} mm` }
                        ] : [])
                    ].map(item => (
                        <div key={item.label} className="flex justify-between text-xs">
                            <span className="text-gray-500">{item.label}:</span>
                            <span className="text-gray-800 font-mono font-medium">{item.value}</span>
                        </div>
                    ))}
                    {selectedPass && (
                        <div className="flex justify-between text-xs col-span-2 pt-1 border-t border-gray-100 mt-1">
                            <span className="text-gray-500">Redução:</span>
                            <span className="text-red-600 font-mono font-bold">{selectedPass.data.reduction.toFixed(1)}%</span>
                        </div>
                    )}
                    {selectedPass?.data.frValidationWarning && (
                        <div className={`col-span-2 mt-1 px-2 py-1 rounded text-[10px] font-semibold ${Math.abs(selectedPass.data.frValidationDelta) > 5
                            ? 'bg-red-100 text-red-700 border border-red-300'
                            : 'bg-amber-100 text-amber-700 border border-amber-300'
                            }`}>
                            ⚠ {selectedPass.data.frValidationWarning}
                        </div>
                    )}
                    {selectedPass?.data.luzSobCarga > 0 && selectedPass?.data.importedLuzSemCarga && (
                        <div className="flex justify-between text-xs col-span-2 mt-0.5">
                            <span className="text-gray-500">LIC (corrigida):</span>
                            <span className="text-blue-600 font-mono font-medium">{selectedPass.data.luzSobCarga.toFixed(2)} mm</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
