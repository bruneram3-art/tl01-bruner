import React, { useState } from 'react';
import { Play, Pause, Headphones, Calendar, Clock, Mic2, Star, Share2, Plus, Edit2, Trash2, X, Upload, Save, CheckCircle, Activity } from 'lucide-react';

interface Podcast {
    id: number;
    title: string;
    description: string;
    duration: string;
    date: string;
    host: string;
    category: string;
    audioUrl?: string;
}

export const PodcastView: React.FC = () => {
    const [episodes, setEpisodes] = useState<Podcast[]>([
        {
            id: 0,
            title: "⚡ Briefing Diário AI: Predictor PRO",
            description: "Resumo operacional gerado automaticamente com os principais insights de produção, custos e eficiência das últimas 24 horas.",
            duration: "01:30",
            date: new Date().toLocaleDateString('pt-BR'),
            host: "Gemini AI",
            category: "Inteligência",
            audioUrl: "/audio/daily_briefing.mp3"
        },
        {
            id: 1,
            title: "Mercado do Aço & Tendências 2026",
            description: "Uma análise profunda sobre o cenário econômico global e como as novas tecnologias de hidrogênio verde estão impactando a produção de aço.",
            duration: "12:40",
            date: "10/02/2026",
            host: "Ana Silva",
            category: "Mercado",
            audioUrl: "/audio/explicacao_rendimento.m4a"
        },
        {
            id: 2,
            title: "Otimizando o Consumo de Gás Natural",
            description: "Dicas práticas de engenheiros seniores sobre como reduzir o consumo específico de gás nos fornos de reaquecimento sem perder produtividade.",
            duration: "08:15",
            date: "03/02/2026",
            host: "Carlos Mendes",
            category: "Técnico",
            audioUrl: "/audio/explicacao_rendimento.m4a"
        },
        {
            id: 3,
            title: "Eficiência Energética na Trefilação",
            description: "Estudo de caso da planta de Piracicaba: como a substituição de motores e o controle de demanda reduziram a conta de energia em 15%.",
            duration: "15:30",
            date: "27/01/2026",
            host: "Ana Silva",
            category: "Eficiência",
            audioUrl: "/audio/explicacao_rendimento.m4a"
        },
        {
            id: 4,
            title: "Gestão de Ativos e Manutenção Preditiva",
            description: "Entenda como a IoT e sensores de vibração estão mudando o jogo da manutenção, evitando paradas não planejadas.",
            duration: "18:00",
            date: "20/01/2026",
            host: "Roberto Costa",
            category: "Manutenção",
            audioUrl: "/audio/explicacao_rendimento.m4a"
        },
        {
            id: 5,
            title: "Liderança em Chão de Fábrica",
            description: "Como engajar equipes operacionais e criar uma cultura de segurança e alta performance.",
            duration: "11:20",
            date: "13/01/2026",
            host: "Maria Oliveira",
            category: "Gestão",
            audioUrl: "/audio/explicacao_rendimento.m4a"
        },
    ]);

    const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audio] = useState(new Audio());
    const [progress, setProgress] = useState(0);

    const togglePlay = (podcast: Podcast) => {
        if (activeEpisodeId === podcast.id) {
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
            } else {
                audio.play();
                setIsPlaying(true);
            }
        } else {
            // Se for um novo episódio
            setActiveEpisodeId(podcast.id);
            setIsPlaying(true);

            // Usa a URL do podcast ou o padrão
            audio.src = podcast.audioUrl || '/audio/explicacao_rendimento.m4a';
            audio.play();
        }
    };

    // Efeito para atualizar o progresso
    React.useEffect(() => {
        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', () => {
            setIsPlaying(false);
            setProgress(0);
        });

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.pause();
        };
    }, [audio]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPodcast, setCurrentPodcast] = useState<Partial<Podcast>>({});
    const [isEditing, setIsEditing] = useState(false);

    const handleAddNew = () => {
        setCurrentPodcast({
            title: '',
            description: '',
            duration: '',
            date: new Date().toLocaleDateString('pt-BR'),
            host: '',
            category: 'Geral'
        });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const handleEdit = (podcast: Podcast) => {
        setCurrentPodcast({ ...podcast });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir este episódio?')) {
            setEpisodes(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleSave = () => {
        if (!currentPodcast.title || !currentPodcast.description) {
            alert("Por favor, preencha os campos obrigatórios.");
            return;
        }

        if (isEditing && currentPodcast.id) {
            setEpisodes(prev => prev.map(p => p.id === currentPodcast.id ? currentPodcast as Podcast : p));
        } else {
            const newId = Math.max(...episodes.map(e => e.id), 0) + 1;
            setEpisodes(prev => [{ ...currentPodcast, id: newId } as Podcast, ...prev]);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-2xl mb-10">
                {/* Background Decorations */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 rounded-full -mr-32 -mt-64 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/20 rounded-full -ml-32 -mb-48 blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between p-12 gap-10">
                    <div className="flex-1 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-xs font-bold uppercase tracking-widest mb-6">
                            <Headphones size={14} /> Industrial Predictor Cast
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
                            A Voz da Indústria <br /> <span className="text-purple-200">Inteligente</span>
                        </h1>
                        <p className="text-lg text-purple-100 font-medium leading-relaxed mb-8 max-w-xl">
                            Insights semanais, entrevistas com especialistas e as últimas tendências do setor siderúrgico e industrial, direto no seu dashboard.
                        </p>
                        <div className="flex items-center gap-4">
                            <button onClick={handleAddNew} className="px-8 py-4 bg-white text-purple-600 rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center gap-3">
                                <Plus size={20} /> Novo Episódio
                            </button>
                            <button className="px-8 py-4 bg-purple-800/50 hover:bg-purple-800/70 border border-purple-400/30 text-white rounded-2xl font-bold transition-all backdrop-blur-md">
                                Explorar Todos
                            </button>
                        </div>
                    </div>

                    {/* Visual Element */}
                    <div className="hidden md:flex relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-600 to-transparent z-10 rounded-3xl"></div>
                        <div className="w-80 h-80 bg-gradient-to-br from-fuchsia-400 to-purple-800 rounded-3xl shadow-2xl rotate-3 flex items-center justify-center border-4 border-white/10">
                            <Mic2 size={120} className="text-white/20" />
                        </div>
                        <div className="absolute -bottom-6 -right-6 bg-white text-purple-600 p-4 rounded-2xl shadow-xl z-20 flex items-center gap-3">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500">
                                        Uses
                                    </div>
                                ))}
                            </div>
                            <div className="text-left">
                                <span className="block text-sm font-black text-slate-800">+1.2k</span>
                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Ouvintes</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* Main List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <Star size={24} className="text-yellow-500 fill-yellow-500" /> Episódios em Destaque
                        </h3>
                        <div className="flex gap-2">
                            <span className="cursor-pointer text-xs font-bold px-3 py-1 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors">Mais Recentes</span>
                            <span className="cursor-pointer text-xs font-bold px-3 py-1 bg-white rounded-lg text-slate-400 hover:bg-slate-50 transition-colors">Mais Ouvidos</span>
                        </div>
                    </div>

                    {episodes.map((ep) => (
                        <div key={ep.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-purple-100 transition-all duration-300 relative">
                            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                {/* Play Circle */}
                                <div className="shrink-0">
                                    <button
                                        onClick={() => togglePlay(ep)}
                                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-inner ${activeEpisodeId === ep.id && isPlaying
                                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-purple-500/30 scale-110'
                                            : 'bg-slate-100 text-slate-400 group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:to-fuchsia-500 group-hover:text-white group-hover:shadow-purple-500/30'
                                            }`}
                                    >
                                        {activeEpisodeId === ep.id && isPlaying ? (
                                            <Pause size={28} className="fill-current" />
                                        ) : (
                                            <Play size={28} className="ml-1 fill-current" />
                                        )}
                                    </button>
                                </div>

                                {/* Info */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-wider border border-purple-100">
                                            {ep.category}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <Calendar size={12} /> {ep.date}
                                        </span>
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-800 group-hover:text-purple-600 transition-colors leading-tight">
                                        {ep.title}
                                    </h4>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2">
                                        {ep.description}
                                    </p>
                                    <div className="flex items-center gap-4 pt-2">
                                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md">
                                            <Clock size={12} /> {ep.duration}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <Mic2 size={12} /> {ep.host}
                                        </span>

                                        {activeEpisodeId === ep.id && (
                                            <div className="flex-1 max-w-[150px] ml-4 flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-purple-500 rounded-full transition-all duration-300"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <Activity size={12} className="text-purple-500 animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex md:flex-col gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all md:translate-x-2 group-hover:translate-x-0">
                                    <button onClick={() => handleEdit(ep)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(ep.id)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-rose-500 transition-colors" title="Excluir">
                                        <Trash2 size={18} />
                                    </button>
                                    <button className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-purple-600 transition-colors" title="Compartilhar">
                                        <Share2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Categories */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Top Categorias</h4>
                        <div className="space-y-2">
                            {['Mercado & Estratégia', 'Eficiência Energética', 'Manutenção 4.0', 'Inovação & Tech', 'Gestão de Pessoas'].map((cat, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
                                    <span className="font-bold text-slate-600 group-hover:text-purple-600 transition-colors">{cat}</span>
                                    <span className="text-xs font-bold bg-slate-100 text-slate-400 px-2 py-1 rounded-md group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">{8 + idx} eps</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Status */}
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h5 className="font-black text-slate-800 text-lg">Status do Sistema</h5>
                                <p className="text-sm text-slate-400 font-bold">Monitoramento em Tempo Real</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Temperatura Forno A</span>
                                    <span className="text-slate-800 font-black text-xl">1.450°C</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                                    <div className="bg-gradient-to-r from-orange-400 to-red-600 h-full w-[85%] rounded-full shadow-lg shadow-red-500/30 animate-pulse"></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Eficiência Energética</span>
                                    <span className="text-emerald-600 font-black text-xl">94.2%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                                    <div className="bg-gradient-to-r from-emerald-400 to-green-500 h-full w-[94%] rounded-full shadow-lg shadow-emerald-500/30"></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Disponibilidade</span>
                                    <span className="text-blue-600 font-black text-xl">99.8%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                                    <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full w-[99%] rounded-full shadow-lg shadow-blue-500/30"></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                                <span>Última sincronização:</span>
                                <span className="flex items-center gap-1 text-emerald-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Agora
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Edição/Criação */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                {isEditing ? <Edit2 className="text-purple-600" /> : <Plus className="text-green-600" />}
                                {isEditing ? 'Editar Episódio' : 'Novo Episódio'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={24} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Upload Area (Simulada) */}
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-purple-400 hover:bg-purple-50/50 transition-all cursor-pointer group">
                                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Upload size={32} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-700 mb-1">Upload do Arquivo de Áudio</h4>
                                <p className="text-slate-400 text-sm">Arraste e solte ou clique para selecionar (MP3, WAV)</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Título</label>
                                    <input
                                        type="text"
                                        value={currentPodcast.title}
                                        onChange={e => setCurrentPodcast({ ...currentPodcast, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                                        placeholder="Ex: Tendências 2026"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Apresentador(a)</label>
                                    <input
                                        type="text"
                                        value={currentPodcast.host}
                                        onChange={e => setCurrentPodcast({ ...currentPodcast, host: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                                        placeholder="Ex: Ana Silva"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Categoria</label>
                                    <select
                                        value={currentPodcast.category}
                                        onChange={e => setCurrentPodcast({ ...currentPodcast, category: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                                    >
                                        <option value="Geral">Geral</option>
                                        <option value="Mercado">Mercado</option>
                                        <option value="Técnico">Técnico</option>
                                        <option value="Eficiência">Eficiência</option>
                                        <option value="Manutenção">Manutenção</option>
                                        <option value="Gestão">Gestão</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Duração</label>
                                    <input
                                        type="text"
                                        value={currentPodcast.duration}
                                        onChange={e => setCurrentPodcast({ ...currentPodcast, duration: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                                        placeholder="Ex: 12:40"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                                    <textarea
                                        value={currentPodcast.description}
                                        onChange={e => setCurrentPodcast({ ...currentPodcast, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-600 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all h-24 resize-none"
                                        placeholder="Resumo do episódio..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <Save size={18} />
                                {isEditing ? 'Salvar Alterações' : 'Criar Episódio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
