import React from 'react';
import {
    ChevronRight, ChevronDown,
    Folder, FileText, Database,
    Cpu, Layers, Box, Plus, Trash2, Settings, AlertTriangle, Grid3X3
} from 'lucide-react';
import { useHRS } from './HRSContext';
import { TrainType } from '../../utils/hrsTypes';

const TRAIN_LABELS: Record<TrainType, string> = {
    desbaste: 'Trens de Desbaste',
    intermediario: 'Trens Intermediários',
    acabador: 'Trens Acabadores',
};

export const HRSSidebar = () => {
    const { project, selectedNode, setSelectedNode, addPass, removePass, addBlock, removeBlock } = useHRS();
    const [openFolders, setOpenFolders] = React.useState<Record<string, boolean>>({
        laminador: true, dados: true, trens: true, desbaste: true,
        intermediario: true, motores: false, blocos: false,
    });

    const toggle = (id: string) => setOpenFolders(prev => ({ ...prev, [id]: !prev[id] }));

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
            <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Navegador do Projeto
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
                                        label={`${trainType === 'desbaste' ? 'Desbaste' : trainType === 'intermediario' ? 'Intermediário' : 'Acabador'} #${idx + 1}`}
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
