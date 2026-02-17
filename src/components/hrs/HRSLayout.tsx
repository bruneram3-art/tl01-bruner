import React, { useState } from 'react';
import {
    File, Settings, PenTool, HelpCircle,
    Save, FolderOpen, Play,
} from 'lucide-react';
import { useHRS } from './HRSContext';

interface HRSLayoutProps {
    children: React.ReactNode;
}

export const HRSLayout: React.FC<HRSLayoutProps> = ({ children }) => {
    const { newProject, recalculateAll, selectedNode } = useHRS();
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const menuItems = [
        {
            label: 'Arquivo', items: [
                { label: 'Novo Projeto', action: () => { newProject(); setActiveMenu(null); } },
                { label: 'Salvar', action: () => { setActiveMenu(null); } },
                { label: 'Salvar Como...', action: () => { setActiveMenu(null); } },
            ]
        },
        {
            label: 'Editar', items: [
                { label: 'Desfazer', action: () => setActiveMenu(null) },
                { label: 'Refazer', action: () => setActiveMenu(null) },
            ]
        },
        {
            label: 'Exibir', items: [
                { label: 'Barra de Ferramentas', action: () => setActiveMenu(null) },
                { label: 'Barra de Status', action: () => setActiveMenu(null) },
            ]
        },
        {
            label: 'Laminador', items: [
                { label: 'Recalcular Tudo', action: () => { recalculateAll(); setActiveMenu(null); } },
            ]
        },
        {
            label: 'Ferramentas', items: [
                { label: 'Desenho do Canal', action: () => setActiveMenu(null) },
            ]
        },
        {
            label: 'Ajuda', items: [
                { label: 'Sobre HRS Web', action: () => { alert('HRS Web Simulator v1.0\nBaseado no HRS BR 2.9'); setActiveMenu(null); } },
            ]
        },
    ];

    // Close menus on click outside
    const handleBackdropClick = () => setActiveMenu(null);

    // Status bar text
    const getStatusText = () => {
        if (selectedNode === 'geral') return 'Dados Gerais';
        if (selectedNode === 'materia_prima') return 'Matéria Prima';
        if (selectedNode === 'secao') return 'Seção Inicial';
        if (selectedNode.startsWith('pass_')) return `Passe: ${selectedNode.replace('pass_', '').replace('_', ' #')}`;
        return 'Pronto';
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100 text-sm font-sans">
            {/* Click-away overlay */}
            {activeMenu && <div className="fixed inset-0 z-40" onClick={handleBackdropClick} />}

            {/* Top Menu Bar */}
            <div className="bg-white border-b border-gray-300 flex items-center px-2 py-1 select-none relative z-50">
                {menuItems.map((menu) => (
                    <div
                        key={menu.label}
                        className={`relative px-3 py-1 cursor-pointer rounded-sm text-gray-700 ${activeMenu === menu.label ? 'bg-blue-100' : 'hover:bg-gray-200'}`}
                        onClick={() => setActiveMenu(activeMenu === menu.label ? null : menu.label)}
                    >
                        {menu.label}
                        {activeMenu === menu.label && (
                            <div className="absolute top-full left-0 bg-white border border-gray-400 shadow-lg min-w-[200px] z-50 text-left py-1">
                                {menu.items.map((item) => (
                                    <div
                                        key={item.label}
                                        className="px-4 py-1.5 hover:bg-blue-100 cursor-pointer text-gray-800 text-xs"
                                        onClick={(e) => { e.stopPropagation(); item.action(); }}
                                    >
                                        {item.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="bg-gray-50 border-b border-gray-300 flex items-center px-2 py-1.5 gap-1 shadow-sm">
                <button className="p-1.5 hover:bg-gray-200 rounded text-blue-600 transition-colors" title="Novo Projeto" onClick={newProject}><File size={16} /></button>
                <button className="p-1.5 hover:bg-gray-200 rounded text-yellow-600 transition-colors" title="Abrir"><FolderOpen size={16} /></button>
                <button className="p-1.5 hover:bg-gray-200 rounded text-blue-800 transition-colors" title="Salvar"><Save size={16} /></button>
                <div className="w-px h-5 bg-gray-300 mx-1" />
                <button className="p-1.5 hover:bg-gray-200 rounded text-green-600 transition-colors" title="Recalcular" onClick={recalculateAll}><Play size={16} /></button>
                <button className="p-1.5 hover:bg-gray-200 rounded text-purple-600 transition-colors" title="Ferramentas"><PenTool size={16} /></button>
                <button className="p-1.5 hover:bg-gray-200 rounded text-orange-600 transition-colors" title="Configurações"><Settings size={16} /></button>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 overflow-hidden relative">
                {children}
            </div>

            {/* Status Bar */}
            <div className="bg-gray-200 border-t border-gray-300 px-3 py-1 text-xs text-gray-600 flex justify-between">
                <span>{getStatusText()}</span>
                <span>Módulo: TÉCNICO</span>
            </div>
        </div>
    );
};
