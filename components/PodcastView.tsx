import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Headphones, Calendar, Clock, Mic2, Star, Share2, Plus, Edit2, Trash2, X, Upload, Save, CheckCircle, Activity, FileText } from 'lucide-react';

interface Podcast {
    id: number;
    title: string;
    description: string;
    duration: string;
    date: string;
    host: string;
    category: string;
    audioUrl?: string;
    transcription?: string;
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
            audioUrl: "/audio/daily_briefing.wav"
        },
        {
            id: 1,
            title: "Mercado do Aço & Tendências 2026",
            description: "Uma análise profunda sobre o cenário econômico global e como as novas tecnologias de hidrogênio verde estão impactando a produção de aço.",
            duration: "12:40",
            date: "10/02/2026",
            host: "Ana Silva",
            category: "Mercado",
            audioUrl: "/audio/explicacao_rendimento.m4a",
            transcription: `## 1. O CONCEITO FUNDAMENTAL: O QUE É RENDIMENTO METÁLICO?

Imagine que o Rendimento Metálico é a nota de eficiência da nossa fábrica. É a resposta para a pergunta: "De todo o aço que compramos (Tarugo), quanto realmente virou produto vendável e quanto virou sucata?"

A fórmula básica é simples:
Rendimento (%) = (Peso do Produto Final / Peso do Tarugo Bruto) * 100

Se temos um Rendimento de 96,40%, significa que aproveitamos quase tudo. Se for 90%, estamos jogando dinheiro fora. Nosso objetivo é sempre maximizar esse percentual.

---

## 2. A JORNADA DO AÇO: ONDE PERDEMOS PESO?

O aço passa por uma "dieta forçada" durante o processo. Vamos entender cada etapa onde ele perde massa:

### A. Perda ao Fogo (Scale Loss) - O "Suor" do Forno
Quando o tarugo entra no forno de reaquecimento, a superfície oxida com o calor intenso, formando a carepa (aquela casquinha). Isso é inevitável.
- Típico: 0.5% a 1.0% do peso.
- Impacto: É peso que evapora ou cai como pó. Não recuperamos.

### B. Desponte de Cabeça (Crop Loss - SH1) - A "Limpeza" Inicial
Ao passar pelas gaiolas do desbaste, a ponta do tarugo pode estar fria ou deformada. A tesoura inicial (SH1) corta esse pedaço para garantir que o aço que entra no trem intermediário perfeitamente.
- Típico: 100mm a 200mm.
- Impacto: É sucata pesada. Necessário para evitar sucata, mas ruim para o rendimento.

### C. Sobra do Leito (Bed Loss - SH2) - O "Resto" da Divisão
Esta é a perda mais estratégica. O laminador produz uma barra contínua de centenas de metros.
Precisamos cortar isso em barras comerciais (ex: 12 metros) para o cliente.
A matemática é cruel: Se produzimos 100 metros e o cliente quer barras de 12m, teremos 8 barras (96m) e sobrará 4 metros.
- Esses 4 metros são a Sobra do Leito. É sucata gerada porque o comprimento total não era múltiplo perfeito do pedido do cliente.
- Como evitar? Planejando o tamanho do Tarugo para que a divisão seja exata! É aqui que entra o Simulador de Rendimento.

### D. Perda de Acabamento (Cutting Loss) - corte da cabeça da barra com qualidade ruim gerada na sh3
Cada vez que a serra ou tesoura corta a cabeça da barra perdemos na navalha cerca de 250 mm e na serra 500mm por cabeça de barra.
- Parece pouco? Em mil barras, isso vira toneladas no final do mês!

---

## 3. A LÓGICA DO "CÁLCULO OTIMIZADO"

O segredo não é apenas medir as perdas, é PREVÊ-LAS. O sistema de simulação faz o caminho inverso:
1. Pega o pedido do cliente (ex: barras de 12m).
2. Olha para o tarugo disponível.
3. Calcula todas as perdas inevitáveis (Fogo, Ponta).
4. Simula a laminação virtualmente.
5. Descobre qual seria a sobra no leito.

Se a sobra for grande (ex: 3 metros), o sistema alerta: "Ei, mude o comprimento do tarugo ou mude o número de barras no leito!".
Ao ajustar isso, transformamos o que seria sucata em produto vendido.

---

## 4. O FUTURO
Com ferramentas inteligentes, não precisamos mais "chutar" o melhor cenário. O algoritmo testa centenas de combinações em milissegundos e diz:
"Para este pedido, use um tarugo de 10.45 metros. Seu rendimento subirá de 92% para 97.5%."

Isso é eficiência. Isso é o estado da arte na laminação.`
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
    ]);

    const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(null);
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

        if (isEditing && currentPodcast.id !== undefined) {
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

                                    {activeEpisodeId === ep.id && (
                                        <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full bg-purple-500" style={{ width: `${progress}%` }} />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(ep)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Edit2 size={18} /></button>
                                    <button onClick={() => handleDelete(ep.id)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"><Trash2 size={18} /></button>
                                    {ep.transcription && (
                                        <button onClick={() => { setActiveTranscription(ep.transcription || null); setIsTranscriptionOpen(true); }} className="p-2 hover:bg-slate-50 rounded-lg text-emerald-600"><FileText size={18} /></button>
                                    )}
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
