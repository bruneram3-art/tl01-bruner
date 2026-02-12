import React from 'react';
import { X, Play, Pause, Headphones, Calendar } from 'lucide-react';

interface Props {
    onClose: () => void;
}

export const PodcastModal: React.FC<Props> = ({ onClose }) => {
    const episodes = [
        { title: "Episódio 1: Mercado do Aço & Tendências 2026", duration: "12:40", date: "10/02/2026" },
        { title: "Episódio 2: Otimizando o Consumo de Gás Natural", duration: "08:15", date: "03/02/2026" },
        { title: "Episódio 3: Eficiência Energética na Trefilação", duration: "15:30", date: "27/01/2026" },
        { title: "Episódio 4: Gestão de Ativos e Manutenção Preditiva", duration: "18:00", date: "20/01/2026" },
        { title: "Episódio 5: Liderança em Chão de Fábrica", duration: "11:20", date: "13/01/2026" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-8 text-white flex justify-between items-start relative overflow-hidden shrink-0">

                    {/* Decorative Circles */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-32 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-16 -mb-24 blur-3xl"></div>

                    <div className="relative z-10 flex items-center gap-5">
                        <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/20">
                            <Headphones size={32} className="text-white" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-purple-200 uppercase tracking-widest mb-1 block">Industrial Predictor</span>
                            <h2 className="text-2xl font-black tracking-tight">Podcast Exclusivo</h2>
                            <div className="flex items-center gap-2 mt-2 text-purple-100 text-sm font-medium">
                                <span className="bg-white/20 px-2 py-0.5 rounded-md text-xs font-bold text-white">Novo</span>
                                <span>• {episodes.length} Episódios Disponíveis</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="relative z-10 p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Últimos Lançamentos</h3>
                        <span className="text-xs font-bold text-purple-600 cursor-pointer hover:underline">Ver todos</span>
                    </div>

                    <div className="space-y-3">
                        {episodes.map((ep, idx) => (
                            <div key={idx} className="group relative bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    {/* Play Button */}
                                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:to-pink-500 group-hover:text-white transition-all shadow-inner group-hover:shadow-purple-500/30">
                                        <Play size={20} className="ml-1 fill-current" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 text-base leading-tight mb-1 truncate group-hover:text-purple-700 transition-colors">
                                            {ep.title}
                                        </h4>
                                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <ClockIcon size={12} /> {ep.duration}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} /> {ep.date}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Arrow */}
                                    <div className="w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 transform translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                                        <Play size={12} className="fill-purple-500 text-purple-500" />
                                    </div>
                                </div>

                                {/* Audio Player Placeholder (Expandable in future) */}
                                <div className="mt-0 h-0 overflow-hidden group-focus-within:h-auto group-focus-within:mt-4 transition-all">
                                    <audio controls className="w-full h-8 mt-2">
                                        <source src="" type="audio/mpeg" />
                                        Your browser does not support the audio element.
                                    </audio>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-100 text-center shrink-0">
                    <p className="text-xs font-semibold text-slate-400">
                        Ouça também no <span className="text-[#1DB954] font-bold cursor-pointer hover:underline">Spotify</span> e <span className="text-[#FA243C] font-bold cursor-pointer hover:underline">Apple Podcasts</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

const ClockIcon = ({ size }: { size: number }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);
