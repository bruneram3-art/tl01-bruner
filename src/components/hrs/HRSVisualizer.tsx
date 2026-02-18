noimport React from 'react';
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
};

const SHAPE_LABELS: Record<PassType, string> = {
    oval: 'Oval', round: 'Redondo', box: 'Caixa', flat: 'Mesa Lisa',
    square: 'Quadrado', diamond: 'Losango', angle: 'Cantoneira (L)',
};

import { getChannelPath } from '../../utils/hrsGeometry';

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

    if (selectedPass) {
        // Bar Dimensions
        width = selectedPass.data.exitBarWidth || selectedPass.data.luz;
        height = selectedPass.data.exitBarHeight || selectedPass.data.luz;

        // Tool Dimensions
        toolWidth = selectedPass.data.channelWidth || width * 1.05; // Fallback se não calculado
        toolHeight = selectedPass.data.luzProj || height * 1.05;    // Fallback
        toolRadius = selectedPass.data.radiusConcordance || 0;

        channelType = selectedPass.data.channelType;
        area = selectedPass.data.exitArea;
        perimeter = selectedPass.data.perimeter;
        showProfile = true;
    } else if (selectedNode === 'materia_prima' || selectedNode === 'secao') {
        showProfile = true;
        // Billet = box, Round = round
        channelType = project.rawMaterial.type === 'billet' ? 'box' : 'round';
    }

    // SVG dimensions and scaling
    const svgSize = 280;
    // Scale based on the larger of Tool or Bar to fit everything
    const maxDim = Math.max(width, height, toolWidth, toolHeight, 1);
    const scale = (svgSize * 0.6) / maxDim;
    const cx = svgSize / 2;
    const cy = svgSize / 2;

    const colors = SHAPE_COLORS[channelType];

    const renderShape = () => {
        // 1. Draw Channel (Ferramenta/Tool) - Only if it's a pass
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

        // 2. Draw Bar (Produto)
        const barPath = getChannelPath(
            channelType,
            width * scale,
            height * scale,
            // If it's a pass, calculate radius roughly proportional (or use corner for RM)
            selectedPass ? Math.max(0, toolRadius - 1) * scale : (project.rawMaterial.corner || 0) * scale,
            cx, cy
        );

        return (
            <g>
                {/* TOOL LAYER (Back) */}
                {selectedPass && (
                    <path
                        d={channelPath}
                        fill="#f1f5f9"
                        stroke="#475569"
                        strokeWidth={1}
                        strokeDasharray="4 2"
                    />
                )}

                {/* BAR LAYER (Front) */}
                <path
                    d={barPath}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={2}
                />
            </g>
        );
    };

    // Grid lines
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
                {/* Width dimension */}
                <line x1={cx - scaledW / 2} y1={cy + scaledH / 2 + 20} x2={cx + scaledW / 2} y2={cy + scaledH / 2 + 20}
                    stroke="#64748b" strokeWidth={1} markerStart="url(#arrowL)" markerEnd="url(#arrowR)" />
                <text x={cx} y={cy + scaledH / 2 + 34} textAnchor="middle" fontSize={10} fill="#475569" fontWeight={600}>
                    {width.toFixed(1)}
                </text>
                {/* Height dimension */}
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
                Visualização 2D
            </div>
            <div className="flex-1 flex items-center justify-center p-3">
                <div className="bg-white border border-gray-300 shadow-sm relative overflow-hidden" style={{ width: svgSize, height: svgSize }}>
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
                            {/* Type label */}
                            <text x={8} y={16} fontSize={10} fill="#94a3b8" fontWeight={600}>{SHAPE_LABELS[channelType]}</text>
                        </svg>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            Selecione um passe
                        </div>
                    )}
                    <div className="absolute bottom-1 right-2 text-[10px] text-gray-400 font-mono">
                        Scale: 1:{Math.round(1 / scale)}
                    </div>
                </div>
            </div>
            {/* Profile Properties Panel */}
            <div className="border-t border-gray-300 bg-white p-3">
                <h4 className="text-xs font-bold text-gray-700 mb-2">Propriedades do Perfil</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {[
                        { label: 'Área', value: `${area.toFixed(1)} mm²` },
                        { label: 'Perímetro', value: `${perimeter.toFixed(1)} mm` },
                        { label: 'Largura', value: `${width.toFixed(1)} mm` },
                        { label: 'Altura', value: `${height.toFixed(1)} mm` },
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
                </div>
            </div>
        </div>
    );
};
