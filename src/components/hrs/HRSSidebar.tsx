import React from 'react';
import {
    ChevronRight, ChevronDown,
    Folder, FileText, Database,
    Cpu, Layers, Box, Plus, Trash2, Settings, AlertTriangle, Grid3X3, UploadCloud, Download, FileOutput
} from 'lucide-react';
import { useHRS } from './HRSContext';
import { TrainType, PassType } from '../../utils/hrsTypes';
import { PdfImportService } from '../../services/PdfImportService';
import { getChannelPath, getBarPath, calculateEngineeredChannel } from '../../utils/hrsGeometry';
import { calcArea } from '../../utils/hrsFormulas';

const TRAIN_LABELS: Record<TrainType, string> = {
    desbaste: 'Trens de Desbaste',
    intermediario: 'Trens Intermediários',
    acabador: 'Trens Acabadores',
};

export const HRSSidebar = () => {
    const { project, selectedNode, setSelectedNode, addPass, removePass, addBlock, removeBlock, importPassPlan } = useHRS();
    const [openFolders, setOpenFolders] = React.useState<Record<string, boolean>>({
        laminador: true, dados: true, trens: true, desbaste: true,
        intermediario: true, motores: false, blocos: false,
    });
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = React.useState(false);

    const toggle = (id: string) => setOpenFolders(prev => ({ ...prev, [id]: !prev[id] }));

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsImporting(true);
            // Tentar extração estruturada primeiro (preserva x,y)
            let plans: import('../../services/PdfImportService').ImportedPassPlan[] = [];
            try {
                const structuredLines = await PdfImportService.extractStructuredText(file);
                plans = PdfImportService.parseStructuredPlan(structuredLines);
            } catch (e) {
                console.warn('Extração estruturada falhou, usando fallback regex:', e);
            }
            // Fallback: se o parse estruturado não encontrou passes, usar regex puro
            if (plans.length === 0) {
                const text = await PdfImportService.extractTextFromFile(file);
                plans = PdfImportService.parseHrcPlan(text);
            }
            if (plans.length > 0) {
                importPassPlan(plans);
                alert(`Plano importado com sucesso! ${plans.length} passes encontrados.`);
            } else {
                alert('Nenhum dado válido encontrado no PDF.');
            }
        } catch (error) {
            console.error('Erro ao importar PDF:', error);
            alert('Falha ao importar o PDF.');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

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

    const handleExportHTMLReport = () => {
        const passesAnalyzed = project.passes;

        let reportHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Relatório de Análise Técnica HRC - ${project.name || 'Projeto'}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 20px; background: #f8fafc; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; }
                    .header h1 { color: #1e293b; margin: 0 0 5px 0; }
                    .pass-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; page-break-inside: avoid; }
                    .pass-header { background: #f1f5f9; padding: 12px 20px; font-weight: bold; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
                    .pass-body { display: flex; padding: 20px; gap: 20px; }
                    .pass-drawing { flex: 0 0 200px; display: flex; flex-direction: column; align-items: center; border-right: 1px solid #e2e8f0; padding-right: 20px; }
                    .pass-details { flex: 1; }
                    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
                    .metric { background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 14px; }
                    .metric strong { color: #475569; display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .analysis-box { padding: 12px; border-radius: 6px; font-size: 14px; margin-bottom: 10px; }
                    .analysis-box.ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
                    .analysis-box.warn { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
                    @media print { body { background: white; } .pass-card { box-shadow: none; border: 1px solid #ccc; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Análise Técnica de Plano de Câmbio</h1>
                    <p>Simulador HRC - Data de Geração: ${new Date().toLocaleDateString()}</p>
                </div>
        `;

        let previousHrcArea = calcArea(project.rawMaterial.type === 'billet' ? 'box' : 'round', project.rawMaterial.width, project.rawMaterial.height);

        passesAnalyzed.forEach(p => {
            const data = p.data;
            const motor = project.motors.find(m => m.trainType === p.trainType);
            const passeLabel = `${p.trainType === 'desbaste' ? 'Desbaste' : p.trainType === 'intermediario' ? 'Intermediário' : 'Acabador'} #${p.passNumber}`;

            // Drawings — usar dimensões importadas, calculadas, ou baseadas na luz, com mínimo de 10mm
            const width = data.importedLargura || data.exitBarWidth || data.luz || data.entryBarWidth || 10;
            const height = data.importedAltura || data.exitBarHeight || data.luz || data.entryBarHeight || 10;

            // Lógica de Calibração HRC (Roll Pass Design)
            const { toolW, toolH } = calculateEngineeredChannel(data.channelType, width, height, project.process.thermalExpansionFactor);

            const toolWidth = toolW;
            const toolHeight = toolH;
            const toolRadius = data.radiusConcordance || 0;

            const svgSize = 160;
            const cx = svgSize / 2;
            const cy = svgSize / 2;

            const TARGET = svgSize * 0.70;
            const scaleX = TARGET / Math.max(toolWidth, width, 1);
            const scaleY = TARGET / Math.max(toolHeight, height, 1);

            // ESCALA UNIFORME: Preserva o aspecto visual (Oval parece Oval, Flat parece Flat)
            const finalScale = Math.min(scaleX, scaleY);
            const finalScaleX = finalScale;
            const finalScaleY = finalScale;

            const colors = SHAPE_COLORS[data.channelType] || { fill: '#ddd', stroke: '#999' };

            const channelPath = getChannelPath(data.channelType, toolWidth * finalScaleX, toolHeight * finalScaleY, toolRadius * Math.min(finalScaleX, finalScaleY), cx, cy);
            const barPath = getBarPath(data.channelType, width * finalScaleX, height * finalScaleY, cx, cy);

            // Calibração Geométrica Real HRC (Puxando direto do motor V2)
            const currentHrcArea = data.exitArea;
            const entryArea = data.entryArea;
            let reducaoHRC = data.reduction;

            // Usar dados importados OU calculados como fallback
            const luzDisplay = data.importedLuzSemCarga?.toFixed(1) || data.luz?.toFixed(1) || '-';
            const frDisplay = data.importedFr != null ? data.importedFr.toFixed(1) + '%' : (data.reduction > 0 ? data.reduction.toFixed(1) + '% (calc)' : '-');
            const preenchimentoCanal = (data.barOccupiedArea / (data.channelArea || 1)) * 100;

            let preenchimentoHTML = '';
            if (preenchimentoCanal > 100.5) {
                preenchimentoHTML = `
                    <div class="analysis-box warn">
                        <strong>⚠️ Alerta de Vazamento (Overfill)</strong><br/>
                        A taxa de preenchimento é de <b>${preenchimentoCanal.toFixed(1)}%</b>. O canal está superlotado.<br/>
                        <i>Explicação Técnica HRC:</i> O volume de metal excede a capacidade do canal. Risco crítico de rebarba longitudinal e danos graves às guias de entrada da próxima gaiola.
                    </div>`;
            } else if (preenchimentoCanal < 85) {
                preenchimentoHTML = `
                    <div class="analysis-box warn">
                        <strong>⚠️ Alerta de Sub-preenchimento (Underfill)</strong><br/>
                        A taxa de preenchimento é de <b>${preenchimentoCanal.toFixed(1)}%</b>. O material está muito folgado no canal.<br/>
                        <i>Consequência:</i> Instabilidade dimensional e risco da barra "capotar" no canal por falta de apoio nas paredes laterais.
                    </div>`;
            } else {
                preenchimentoHTML = `
                    <div class="analysis-box ok">
                        <strong>✅ Preenchimento Correto</strong><br/>
                        Taxa de preenchimento de <b>${preenchimentoCanal.toFixed(1)}%</b>. O metal preenche o canal de forma estável, garantindo a precisão dimensional sem forçar as guias.
                    </div>`;
            }

            const fatorCargaStr = (data.loadFactor * 100).toFixed(1);
            let motorHTML = '';
            if (motor) {
                if (data.loadFactor > 0.9) {
                    motorHTML = `
                        <div class="analysis-box warn">
                            <strong>⚠️ Alerta de Sobrecarga do Motor</strong><br/>
                            Com as guias e luz atuais, a Força de Laminação exigida atinge ${data.rollingForce.toFixed(2)} MN, resultando num fator de carga de <b>${fatorCargaStr}%</b> no motor (${motor.label}).<br/>
                            <i>Ação recomendada:</i> Reduzir o passe ou verificar pré-aquecimento, pois o motor está próximo do desarme por sobre-torque.
                        </div>`;
                } else {
                    motorHTML = `
                        <div class="analysis-box ok">
                            <strong>✅ Esforço de Motor OK</strong><br/>
                            O motor da gaiola operará folgado a ${fatorCargaStr}% da sua capacidade nominal (${motor.power} kW). Operação segura.
                        </div>`;
                }
            } else {
                motorHTML = `<div class="analysis-box">Nenhum motor associado para calcular carga.</div>`;
            }

            reportHTML += `
                <div class="pass-card">
                    <div class="pass-header">
                        <span>${passeLabel}</span>
                        <span style="font-size: 12px; font-weight: normal; color: #64748b;">Gaiola / Tipo: ${{ 'box': 'Caixa', 'flat': 'Chato', 'oval': 'Oval', 'round': 'Redondo', 'diamond': 'Losango', 'square': 'Quadrado', 'angle': 'Ângulo', 'edge_oval': 'Oval Canto', 'swedish_oval': 'Oval Sueco' }[data.channelType] || data.channelType}</span>
                    </div>
                    <div class="pass-body">
                        <div class="pass-drawing">
                            <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" style="background: #0f172a; border: 1px solid #1e293b; border-radius: 4px;">
                                <defs>
                                    <linearGradient id="hotMetalGradientReport" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" style="stop-color: #fb923c; stop-opacity: 1" />
                                        <stop offset="50%" style="stop-color: #f97316; stop-opacity: 1" />
                                        <stop offset="100%" style="stop-color: #ea580c; stop-opacity: 1" />
                                    </linearGradient>
                                    <filter id="glowReport">
                                        <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <!-- Ferramenta (Canal) -->
                                <path d="${channelPath}" fill="rgba(255,255,255,0.05)" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3,3" />
                                <text x="${cx}" y="${cy - (toolHeight * finalScaleY) / 2 - 5}" text-anchor="middle" font-size="8" fill="#ffffff" font-weight="bold">CANAL</text>
                                
                                <!-- Perfil (Material) -->
                                <g filter="url(#glowReport)">
                                    <path d="${barPath}" fill="url(#hotMetalGradientReport)" stroke="#fb923c" stroke-width="1" />
                                    <text x="${cx}" y="${cy}" font-size="9" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle" style="text-shadow: 0px 1px 2px rgba(0,0,0,0.8)">MATERIAL</text>
                                </g>
                                
                                <text x="${cx}" y="${cy + (toolHeight * finalScaleY) / 2 + 12}" font-size="9" font-weight="bold" fill="#64748b" text-anchor="middle">${width.toFixed(1)} × ${height.toFixed(1)} mm</text>
                            </svg>
                            <span style="font-size: 11px; color: #64748b; margin-top: 5px;">Visualização Metalúrgica (Padrão HRC)</span>
                        </div>
                        <div class="pass-details">
                            <div class="metrics-grid">
                                <div class="metric"><strong>Gap (Luz):</strong> ${luzDisplay} mm</div>
                                <div class="metric"><strong>Redução (FR):</strong> ${frDisplay}</div>
                                <div class="metric"><strong>Largura Saída:</strong> ${width.toFixed(1)} mm</div>
                                <div class="metric"><strong>Altura Saída:</strong> ${height.toFixed(1)} mm</div>
                                <div class="metric"><strong>Área de Entrada:</strong> ${entryArea.toFixed(1)} mm²</div>
                                <div class="metric"><strong>Área de Saída:</strong> ${currentHrcArea.toFixed(1)} mm²</div>
                                <div class="metric"><strong>Redução Geométrica Real:</strong> ${reducaoHRC.toFixed(1)}%</div>
                            </div>
                            <h4>Pareceres Técnicos HRC:</h4>
                            ${preenchimentoHTML}
                            ${motorHTML}
                        </div>
                    </div>
                </div>
            `;

            // Avança a área do passe anterior para o próximo passe baseando-se nesta saída
            previousHrcArea = currentHrcArea;
        });

        reportHTML += `
                <div style="text-align: center; margin-top: 30px;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Imprimir Relatório Otimizado</button>
                    <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">Feche esta aba para voltar ao sistema.</p>
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([reportHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    const passesByTrain = React.useMemo(() => {
        const map: Record<TrainType, typeof project.passes> = { desbaste: [], intermediario: [], acabador: [] };
        project.passes.forEach(p => map[p.trainType].push(p));
        return map;
    }, [project.passes]);

    interface TreeItemProps {
        id: string; label: string; icon: React.ReactNode; level: number;
        isSelected?: boolean; onClick?: () => void; children?: React.ReactNode;
        onAdd?: () => void; onRemove?: () => void;
    }

    const TreeItem: React.FC<TreeItemProps> = ({ id, label, icon, level, isSelected, onClick, children, onAdd, onRemove }) => {
        const hasChildren = !!children;
        const isOpen = openFolders[id] ?? false;

        return (
            <div className="select-none">
                <div
                    className={`flex items-center py-1 pr-2 rounded-sm cursor-pointer group ${isSelected ? 'bg-blue-200 font-bold' : 'hover:bg-blue-100'}`}
                    style={{ paddingLeft: `${level * 16}px` }}
                    onClick={() => {
                        if (hasChildren) toggle(id);
                        onClick?.();
                    }}
                >
                    <span className="mr-1 text-gray-500 w-4 h-4 flex items-center justify-center">
                        {hasChildren && (isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
                    </span>
                    <span className="mr-1.5">{icon}</span>
                    <span className="text-gray-700 truncate text-xs flex-1">{label}</span>
                    {onAdd && (
                        <button onClick={(e) => { e.stopPropagation(); onAdd(); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-green-200 rounded" title="Adicionar">
                            <Plus size={12} className="text-green-600" />
                        </button>
                    )}
                    {onRemove && (
                        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-200 rounded" title="Remover">
                            <Trash2 size={12} className="text-red-500" />
                        </button>
                    )}
                </div>
                {hasChildren && isOpen && <div>{children}</div>}
            </div>
        );
    };

    return (
        <div className="w-56 bg-white border-r border-gray-300 h-full flex flex-col flex-shrink-0">
            <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                <span>Navegador do Projeto</span>
            </div>
            <div className="p-2 border-b border-gray-100 flex flex-col gap-2 justify-center">
                <input
                    type="file"
                    accept=".pdf"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                />
                <button
                    onClick={handleImportClick}
                    disabled={isImporting}
                    className="w-full flex justify-center items-center gap-2 py-1.5 px-3 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium disabled:opacity-50"
                >
                    <UploadCloud size={16} />
                    {isImporting ? 'Importando...' : 'Importar Plano PDF'}
                </button>
                <button
                    onClick={handleExportHTMLReport}
                    className="w-full flex justify-center items-center gap-2 py-1.5 px-3 bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition-colors text-sm font-medium border border-purple-200"
                >
                    <FileOutput size={16} />
                    Gerar Relatório Detalhado
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                <TreeItem id="laminador" label="Laminador" icon={<Database size={14} className="text-blue-600" />} level={0}>
                    <TreeItem id="dados" label="Dados" icon={<Folder size={14} className="text-yellow-500" />} level={1}>
                        <TreeItem
                            id="geral" label="Geral" level={2}
                            icon={<FileText size={14} className="text-gray-500" />}
                            isSelected={selectedNode === 'geral'}
                            onClick={() => setSelectedNode('geral')}
                        />
                        <TreeItem
                            id="materia_prima" label="Matéria Prima" level={2}
                            icon={<Box size={14} className="text-orange-500" />}
                            isSelected={selectedNode === 'materia_prima'}
                            onClick={() => setSelectedNode('materia_prima')}
                        />
                        <TreeItem
                            id="secao" label="Seção Inicial" level={2}
                            icon={<Layers size={14} className="text-indigo-500" />}
                            isSelected={selectedNode === 'secao'}
                            onClick={() => setSelectedNode('secao')}
                        />
                        <TreeItem
                            id="processo" label="Processo" level={2}
                            icon={<Settings size={14} className="text-purple-500" />}
                            isSelected={selectedNode === 'processo'}
                            onClick={() => setSelectedNode('processo')}
                        />
                        <TreeItem
                            id="perdas" label="Perdas" level={2}
                            icon={<AlertTriangle size={14} className="text-red-500" />}
                            isSelected={selectedNode === 'perdas'}
                            onClick={() => setSelectedNode('perdas')}
                        />
                    </TreeItem>
                    <TreeItem id="trens" label="Trens" icon={<Folder size={14} className="text-yellow-500" />} level={1}>
                        {(['desbaste', 'intermediario', 'acabador'] as TrainType[]).map(trainType => (
                            <TreeItem
                                key={trainType}
                                id={trainType}
                                label={TRAIN_LABELS[trainType]}
                                icon={<Cpu size={14} className="text-green-600" />}
                                level={2}
                                onAdd={() => addPass(trainType)}
                            >
                                {passesByTrain[trainType].map((pc, idx) => (
                                    <TreeItem
                                        key={pc.data.id}
                                        id={pc.data.id}
                                        label={`${trainType === 'desbaste' ? 'Desbaste' : trainType === 'intermediario' ? 'Intermediário' : 'Acabador'} #${pc.passNumber}`}
                                        icon={<Layers size={12} className="text-teal-500" />}
                                        level={3}
                                        isSelected={selectedNode === pc.data.id}
                                        onClick={() => setSelectedNode(pc.data.id)}
                                        onRemove={passesByTrain[trainType].length > 1 ? () => removePass(pc.data.id) : undefined}
                                    />
                                ))}
                            </TreeItem>
                        ))}
                    </TreeItem>
                    <TreeItem id="motores" label="Motores" icon={<Folder size={14} className="text-yellow-500" />} level={1}>
                        {project.motors.map((motor) => (
                            <TreeItem
                                key={motor.id}
                                id={motor.id}
                                label={motor.label}
                                icon={<Cpu size={12} className="text-orange-500" />}
                                level={2}
                                isSelected={selectedNode === motor.id}
                                onClick={() => setSelectedNode(motor.id)}
                            />
                        ))}
                    </TreeItem>
                    <TreeItem
                        id="blocos" label="Blocos" level={1}
                        icon={<Folder size={14} className="text-yellow-500" />}
                        onAdd={addBlock}
                    >
                        {project.blocks.map((block) => (
                            <TreeItem
                                key={block.id}
                                id={block.id}
                                label={block.label}
                                icon={<Grid3X3 size={12} className="text-blue-500" />}
                                level={2}
                                isSelected={selectedNode === block.id}
                                onClick={() => setSelectedNode(block.id)}
                                onRemove={() => removeBlock(block.id)}
                            />
                        ))}
                    </TreeItem>
                </TreeItem>
            </div>
        </div>
    );
};
