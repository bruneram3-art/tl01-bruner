import React, { useEffect, useState, useMemo } from 'react';
import { X, History, User, Search, Terminal, ArrowRight, Server, Clock, Activity, FileJson } from 'lucide-react';
import { getAuditLog, AuditLogEntry } from '../services/supabaseClient';

interface Props {
    sap: string;
    onClose: () => void;
}

export const AuditLogModal: React.FC<Props> = ({ sap, onClose }) => {
    const [rawLogs, setRawLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        getAuditLog(sap)
            .then((data: any) => {
                setRawLogs(data || []);
                setLoading(false);
            })
            .catch((err: any) => {
                console.error(err);
                setLoading(false);
            });
    }, [sap]);

    // Lógica de Agrupamento e Filtro
    const groupedLogs = useMemo(() => {
        let filtered = rawLogs;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = rawLogs.filter(l =>
                l.sap.toLowerCase().includes(lower) ||
                (l.changed_by || "").toLowerCase().includes(lower) ||
                l.field_changed.toLowerCase().includes(lower)
            );
        }

        // Agrupar por Sessão (Mesmo user, mesmo range de 5 min)
        const groups: { id: string, user: string, time: string, items: AuditLogEntry[] }[] = [];

        filtered.forEach(log => {
            const logTime = new Date(log.changed_at || "").getTime();
            const lastGroup = groups[groups.length - 1];

            // Se o último grupo for do mesmo user e menos de 5 min de diferença
            if (lastGroup &&
                lastGroup.user === (log.changed_by || 'Sistema') &&
                Math.abs(new Date(lastGroup.time).getTime() - logTime) < 5 * 60 * 1000) {
                lastGroup.items.push(log);
            } else {
                groups.push({
                    id: Math.random().toString(36),
                    user: log.changed_by || 'Sistema',
                    time: log.changed_at || "",
                    items: [log]
                });
            }
        });

        return groups;

    }, [rawLogs, searchTerm]);

    const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const formatDateFull = (dateStr: string) => new Date(dateStr).toLocaleString('pt-BR');

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-700/50 rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden font-mono text-slate-300">

                {/* Header Terminal Style */}
                <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20">
                            <Terminal size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-emerald-400 tracking-wider">SYSTEM_AUDIT_LOG.LOG</h2>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <Server size={10} />
                                <span>SERVER_NODE_01</span>
                                <span className="w-1 h-1 bg-slate-600 rounded-full" />
                                <span>{rawLogs.length} ENTRIES</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="SEARCH QUERY..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-slate-900 border border-slate-800 text-xs text-emerald-500 pl-9 pr-3 py-1.5 rounded focus:outline-none focus:border-emerald-500/50 transition-all w-48 focus:w-64 placeholder:text-slate-700"
                            />
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded transition-colors text-slate-600">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
                            <Activity className="animate-pulse text-emerald-500" size={48} />
                            <p className="text-xs tracking-widest text-emerald-500/50">INITIALIZING SEQUENCE...</p>
                        </div>
                    ) : groupedLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-30">
                            <FileJson size={64} />
                            <p className="text-sm">NO_DATA_FOUND</p>
                        </div>
                    ) : (
                        groupedLogs.map((group) => (
                            <div key={group.id} className="relative pl-6 border-l border-slate-800">
                                {/* Timeline Dot */}
                                <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-slate-950" />

                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
                                            {formatDateFull(group.time)}
                                        </span>
                                        <span className="text-slate-600 text-[10px]">SESSION_ID: {group.id.substring(2, 8).toUpperCase()}</span>
                                    </div>

                                    <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
                                        <div className="flex items-center gap-3 mb-4 border-b border-slate-800/50 pb-3">
                                            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded">
                                                <User size={14} />
                                            </div>
                                            <span className="text-sm font-bold text-blue-400">USER: {group.user.toUpperCase()}</span>
                                            <span className="text-[10px] text-slate-500 ml-auto flex items-center gap-1">
                                                <Clock size={10} /> {formatTime(group.time)}
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            {group.items.map((log, idx) => (
                                                <div key={idx} className="group/item flex items-center justify-between hover:bg-white/5 p-2 rounded transition-colors text-xs border-b border-slate-800/30 last:border-0">
                                                    <div className="flex items-center gap-3 w-1/3">
                                                        <span className="font-bold text-amber-500/80 w-24 truncate">{log.sap}</span>
                                                        <span className="text-slate-500 opacity-50">::</span>
                                                        <span className="text-slate-400 uppercase tracking-wider text-[10px]">{log.field_changed}</span>
                                                    </div>

                                                    <div className="flex flex-1 items-center gap-4 text-center">
                                                        <span className="flex-1 text-rose-400/70 line-through decoration-rose-500/30">{String(log.old_value)}</span>
                                                        <ArrowRight size={12} className="text-slate-600" />
                                                        <span className="flex-1 font-bold text-emerald-400">{String(log.new_value)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Status Bar */}
                <div className="bg-slate-950 p-2 border-t border-slate-800 flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                    <span>STATUS: MONITORING</span>
                    <span>MEM: 14MB OK</span>
                </div>
            </div>
        </div>
    );
};
