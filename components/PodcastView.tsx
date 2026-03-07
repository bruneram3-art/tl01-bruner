import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Headphones, Calendar, Clock, Mic2, Star, Share2, Plus, Edit2, Trash2, X, Upload, Save, CheckCircle, Activity, FileText, Check } from 'lucide-react';
import { getPodcastsFromSupabase, savePodcastToSupabase, deletePodcastFromSupabase, PodcastEntry } from '../services/supabaseClient';

interface Podcast {
    id: number | string;
    title: string;
    description: string;
    duration: string;
    date: string;
    host: string;
    category: string;
    audioUrl?: string;
    transcription?: string;
}

const STATIC_EPISODES: Podcast[] = [
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
        audioUrl: "/audio/notebook_briefing.mp3",
        transcription: "..."
    }
];

export const PodcastView: React.FC = () => {
    const [episodes, setEpisodes] = useState<Podcast[]>(STATIC_EPISODES);
    const [isLoading, setIsLoading] = useState(true);
    const [activeEpisodeId, setActiveEpisodeId] = useState<number | string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(false);
    const [activeTranscription, setActiveTranscription] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPodcast, setCurrentPodcast] = useState<Partial<Podcast>>({});
    const [isEditing, setIsEditing] = useState(false);

    // Ref para o objeto Audio para evitar problemas de hidratação/SSR
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !audioRef.current) {
            audioRef.current = new Audio();

            const audio = audioRef.current;
            const updateProgress = () => {
                if (audio && audio.duration) {
                    setProgress((audio.currentTime / audio.duration) * 100);
                }
            };

            const handleEnded = () => {
                setIsPlaying(false);
                setProgress(0);
            };

            audio.addEventListener('timeupdate', updateProgress);
            audio.addEventListener('ended', handleEnded);

            return () => {
                audio.removeEventListener('timeupdate', updateProgress);
                audio.removeEventListener('ended', handleEnded);
                audio.pause();
            };
        }
    }, []);

    // Carrega os podcasts do Supabase com fallback para estáticos
    useEffect(() => {
        const loadPodcasts = async () => {
            try {
                const data = await getPodcastsFromSupabase();
                if (data && data.length > 0) {
                    setEpisodes(data as Podcast[]);
                } else {
                    setEpisodes(STATIC_EPISODES);
                }
            } catch (error) {
                console.error("Erro ao carregar podcasts:", error);
                setEpisodes(STATIC_EPISODES);
            } finally {
                setIsLoading(false);
            }
        };
        loadPodcasts();
    }, []);

    // Carrega o texto do Briefing gerado pelo n8n automaticamente
    useEffect(() => {
        fetch('/audio/daily_briefing.txt')
            .then(res => res.ok ? res.text() : null)
            .then(text => {
                if (text) {
                    setEpisodes(prev => prev.map(ep =>
                        ep.id === 0 ? { ...ep, transcription: text } : ep
                    ));
                }
            })
            .catch(() => { }); // Silencioso se o arquivo não existir
    }, []);


    const togglePlay = (podcast: Podcast) => {
        if (!audioRef.current) return;
        const audio = audioRef.current;

        if (activeEpisodeId === podcast.id) {
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
            } else {
                audio.play().catch(console.error);
                setIsPlaying(true);
            }
        } else {
            setActiveEpisodeId(podcast.id);
            setIsPlaying(true);
            audio.src = podcast.audioUrl || '/audio/explicacao_rendimento.m4a';
            audio.play().catch(console.error);
        }
    };

    const handleAddNew = () => {
        setCurrentPodcast({
            title: '',
            description: '',
            duration: '',
            date: new Date().toLocaleDateString('pt-BR'),
            host: '',
            category: 'Geral',
            audioUrl: ''
        });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const handleEdit = (podcast: Podcast) => {
        setCurrentPodcast({ ...podcast });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number | string) => {
        if (window.confirm('Tem certeza que deseja excluir este episódio?')) {
            try {
                if (typeof id === 'string') {
                    await deletePodcastFromSupabase(id);
                }
                setEpisodes(prev => prev.filter(p => p.id !== id));
            } catch (err) {
                alert("Erro ao excluir podcast: " + err);
            }
        }
    };

    const handleSave = async () => {
        if (!currentPodcast.title || !currentPodcast.description) {
            alert("Por favor, preencha os campos obrigatórios.");
            return;
        }

        try {
            const podcastToSave: PodcastEntry = {
                id: currentPodcast.id as string,
                title: currentPodcast.title || '',
                description: currentPodcast.description || '',
                duration: currentPodcast.duration || '00:00',
                date: currentPodcast.date || new Date().toLocaleDateString('pt-BR'),
                host: currentPodcast.host || 'Sistema',
                category: currentPodcast.category || 'Geral',
                audio_url: currentPodcast.audioUrl || '',
                transcription: currentPodcast.transcription || ''
            };

            const result = await savePodcastToSupabase(podcastToSave);

            if (result && result.length > 0) {
                const saved = { ...result[0], audioUrl: result[0].audio_url } as Podcast;
                if (isEditing) {
                    setEpisodes(prev => prev.map(p => p.id === saved.id ? saved : p));
                } else {
                    setEpisodes(prev => [saved, ...prev]);
                }
            }
            setIsModalOpen(false);
        } catch (err) {
            alert("Erro ao salvar podcast no Supabase: " + err);
        }
    };

    const extractBullets = (transcription?: string) => {
        if (!transcription) return [];
        const lines = transcription.split('\n');
        const bullets = lines
            .filter(line => line.trim().startsWith('## '))
            .map(line => line.replace(/^##\s+/, '').replace(/^\d+\.\s*/, '').trim());
        return bullets.slice(0, 3);
    };

    const handleShareWhatsApp = async (ep: Podcast) => {
        const audioUrl = ep.audioUrl || '/audio/daily_briefing.mp3';
        const fullAudioUrl = window.location.origin + audioUrl;

        if (navigator.share && navigator.canShare) {
            try {
                const response = await fetch(audioUrl);
                const blob = await response.blob();
                const fileType = audioUrl.endsWith('.mp3') ? 'audio/mpeg' : blob.type || 'audio/mpeg';
                const file = new File([blob], audioUrl.split('/').pop() || 'podcast.mp3', { type: fileType });

                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: ep.title,
                        text: ep.description,
                    });
                    return;
                }
            } catch (error) {
                console.error('Erro ao compartilhar arquivo:', error);
            }
        }

        const text = `*Episódio:* ${ep.title}\n\n${ep.description}\n\nOuça: ${fullAudioUrl}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleDownload = async (ep: Podcast) => {
        const audioUrl = ep.audioUrl || '/audio/daily_briefing.mp3';
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = audioUrl.split('/').pop() || 'podcast.mp3';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-2xl mb-10">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 rounded-full -mr-32 -mt-64 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/20 rounded-full -ml-32 -mb-48 blur-3xl"></div>

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-6 md:p-12 gap-6 md:gap-10">
                    <div className="flex-1 w-full max-w-2xl text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-xs font-bold uppercase tracking-widest mb-6">
                            <Headphones size={14} /> Predictor Cast
                        </div>
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-4 md:mb-6 leading-tight break-words">
                            A Voz da Indústria <br className="hidden md:block" /> <span className="text-purple-200">Inteligente</span>
                        </h1>
                        <p className="text-base md:text-lg text-purple-100 font-medium leading-relaxed mb-6 md:mb-8 max-w-xl mx-auto lg:mx-0">
                            Insights semanais, entrevistas com especialistas e as últimas tendências do setor siderúrgico e industrial, direto no seu dashboard.
                        </p>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 md:gap-4">
                            <button onClick={handleAddNew} className="px-6 py-3 md:px-8 md:py-4 bg-white text-purple-600 rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-3">
                                <Plus size={20} /> Novo
                            </button>
                            <button className="px-6 py-3 md:px-8 md:py-4 bg-purple-800/50 hover:bg-purple-800/70 border border-purple-400/30 text-white rounded-2xl font-bold transition-all backdrop-blur-md whitespace-nowrap">
                                Explorar Todos
                            </button>
                        </div>
                    </div>

                    <div className="hidden md:flex relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-600 to-transparent z-10 rounded-3xl"></div>
                        <div className="w-80 h-80 bg-gradient-to-br from-fuchsia-400 to-purple-800 rounded-3xl shadow-2xl rotate-3 flex items-center justify-center border-4 border-white/10">
                            <Mic2 size={120} className="text-white/20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Star size={24} className="text-yellow-500 fill-yellow-500" /> Episódios
                    </h3>

                    {episodes.map((ep) => (
                        <div key={ep.id} className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300">
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <button
                                    onClick={() => togglePlay(ep)}
                                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${activeEpisodeId === ep.id && isPlaying ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                                >
                                    {activeEpisodeId === ep.id && isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                                </button>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{ep.category}</span>
                                        <span className="text-xs font-bold text-slate-400">{ep.date}</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-800">{ep.title}</h4>
                                    <p className="text-sm text-slate-500 line-clamp-2">{ep.description}</p>

                                    {/* Bullets Inteligentes (Extraídos da Transcrição) */}
                                    {ep.transcription && extractBullets(ep.transcription).length > 0 && (
                                        <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <h5 className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center gap-1">
                                                <Star size={12} className="text-purple-400" /> Destaques do Episódio
                                            </h5>
                                            <ul className="space-y-1.5 pl-1">
                                                {extractBullets(ep.transcription).map((bullet, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-xs font-medium text-slate-600">
                                                        <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                                        <span className="line-clamp-1">{bullet}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {activeEpisodeId === ep.id && (
                                        <div className="w-full h-1 bg-slate-100 rounded-full mt-4 overflow-hidden">
                                            <div className="h-full bg-purple-500" style={{ width: `${progress}%` }} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 shrink-0">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleShareWhatsApp(ep)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold rounded-xl transition-all"
                                            title="Compartilhar"
                                        >
                                            <Share2 size={16} /> <span className="text-xs">Enviar</span>
                                        </button>
                                        <button
                                            onClick={() => handleDownload(ep)}
                                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                                            title="Baixar MP3"
                                        >
                                            <Upload size={16} className="rotate-180" />
                                        </button>
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        {ep.transcription && (
                                            <button onClick={() => { setActiveTranscription(ep.transcription || null); setIsTranscriptionOpen(true); }} className="flex-1 p-2 bg-slate-50 hover:bg-purple-50 hover:text-purple-600 rounded-xl text-slate-400 flex items-center justify-center transition-colors" title="Ler Narração">
                                                <FileText size={18} />
                                            </button>
                                        )}
                                        <button onClick={() => handleEdit(ep)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors" title="Editar">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(ep.id)} className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-xl text-slate-400 transition-colors" title="Excluir">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={16} /> Status</h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs font-bold mb-1"><span>Eficiência</span><span>94%</span></div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full w-[94%]" /></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-xl p-8">
                        <h2 className="text-2xl font-black mb-6">{isEditing ? 'Editar' : 'Novo'} Episódio</h2>
                        <div className="space-y-4">
                            <input type="text" value={currentPodcast.title} onChange={e => setCurrentPodcast({ ...currentPodcast, title: e.target.value })} className="w-full p-3 border rounded-xl" placeholder="Título" />
                            <textarea value={currentPodcast.description} onChange={e => setCurrentPodcast({ ...currentPodcast, description: e.target.value })} className="w-full p-3 border rounded-xl h-24" placeholder="Descrição" />
                            <div className="flex gap-4">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 p-3 font-bold text-slate-400">Cancelar</button>
                                <button onClick={handleSave} className="flex-1 p-3 bg-purple-600 text-white font-black rounded-xl italic">Salvar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isTranscriptionOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h2 className="font-black text-xl">Texto da Narração</h2>
                            <button onClick={() => setIsTranscriptionOpen(false)}><X size={24} /></button>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            {activeTranscription?.split('\n').map((line, i) => (
                                <p key={i} className={`mb-4 ${line.startsWith('##') ? 'text-xl font-black mt-6' : 'text-slate-700'}`}>
                                    {line.replace(/^##\s+/, '')}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
