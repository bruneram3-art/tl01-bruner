import React, { useState } from 'react';
import { X, Book, HelpCircle, Search, Shield, Activity, TrendingUp, History, Database, Cpu, Target } from 'lucide-react';

interface Props {
    onClose: () => void;
}

const TOPICS = [
    {
        id: 'reliability',
        title: 'Confiabilidade dos Dados',
        icon: <Shield size={18} />,
        content: (
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-800">O que é a Confiabilidade?</h3>
                <p className="text-slate-600 leading-relaxed">
                    A Confiabilidade é um indicador de 0 a 100% que mede a qualidade técnica dos dados importados.
                    Um score baixo não significa que seus números estão "errados", mas que podem haver falhas na estrutura
                    que comprometem a precisão da IA.
                </p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="font-bold text-slate-700 mb-2">Como é calculado?</h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Começa em <b>100%</b>.
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <b>-5%</b> por cada produto sem meta cadastrada (PCP existe, mas não sabemos o alvo).
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <b>-10%</b> se houverem registros com produção zerada (possível falha de leitura).
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            <b>-5%</b> por outliers extremos (ex: Setup &gt; 10h num único dia).
                        </li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: 'simulator',
        title: 'Simulador de Cenários',
        icon: <Cpu size={18} />,
        content: (
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-800">Como usar o Simulador?</h3>
                <p className="text-slate-600 leading-relaxed">
                    O Simulador permite projetar o impacto financeiro de mudanças operacionais antes que elas aconteçam.
                    É uma ferramenta de "E se?" (What If).
                </p>

                <h4 className="font-bold text-slate-700 mt-4">Variáveis Ajustáveis:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border border-slate-100 rounded-lg">
                        <span className="text-blue-600 font-bold block mb-1">Volume de Produção</span>
                        <p className="text-xs text-slate-500">Aumentar ou diminuir a carga da fábrica. Impacta custos variáveis totais.</p>
                    </div>
                    <div className="p-3 border border-slate-100 rounded-lg">
                        <span className="text-orange-600 font-bold block mb-1">Eficiência (Gás/EE)</span>
                        <p className="text-xs text-slate-500">Melhoria técnica no consumo específico. Ex: Queimadores mais eficientes.</p>
                    </div>
                    <div className="p-3 border border-slate-100 rounded-lg">
                        <span className="text-emerald-600 font-bold block mb-1">Rendimento Metálico</span>
                        <p className="text-xs text-slate-500">Redução de perdas/sucata. Impacta diretamente o custo da carga metálica.</p>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'forecast',
        title: 'Previsão Híbrida',
        icon: <TrendingUp size={18} />,
        content: (
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-800">Entendendo a Previsão</h3>
                <p className="text-slate-600 leading-relaxed">
                    O sistema utiliza uma abordagem <b>Híbrida</b> para projetar o fechamento do mês com máxima precisão.
                </p>
                <div className="flex items-center gap-4 my-4 p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-900 font-medium">
                    <span>Acumulado Real (Passado)</span>
                    <span className="text-blue-300">+</span>
                    <span>Planejamento PCP (Futuro)</span>
                    <span className="text-blue-300">=</span>
                    <span>Previsão de Fechamento</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm">
                    Isso significa que conforme o mês avança, a previsão se torna cada vez mais uma "medicao" e menos uma "estimativa",
                    corrigindo automaticamente desvios do plano original.
                </p>
            </div>
        )
    },
    {
        id: 'audit',
        title: 'Auditoria & Rastreabilidade',
        icon: <History size={18} />,
        content: (
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-800">Quem mudou o quê?</h3>
                <p className="text-slate-600 leading-relaxed">
                    Para garantir a integridade industrial, todas as alterações em <b>Metas</b> e <b>Custos</b> são registradas no banco de dados.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-slate-600">
                    <li>O log registra o <b>Valor Antigo</b> e o <b>Novo Valor</b>.</li>
                    <li>Identifica o usuário (ou sistema) responsável.</li>
                    <li>Agrupa alterações sequenciais em "Sessões" para facilitar a leitura.</li>
                </ul>
            </div>
        )
    },
    {
        id: 'formulas',
        title: 'Fórmulas (Explicadas p/ Todos)',
        icon: <Book size={18} />,
        content: (
            <div className="space-y-6">
                <h3 className="text-xl font-bold text-slate-800">Como o sistema calcula as coisas?</h3>
                <p className="text-slate-600">
                    Aqui está um guia super simples para entender de onde vêm os números.
                </p>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                            <tr>
                                <th className="p-4 font-black">O que é?</th>
                                <th className="p-4 font-black">A Conta Simples</th>
                                <th className="p-4 font-black">Exemplo Prático</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr className="hover:bg-slate-50/50">
                                <td className="p-4">
                                    <span className="font-bold text-blue-600 block">Consumo Gás (GN)</span>
                                    <span className="text-xs text-slate-500">Quanto gás gastei pra fazer 1 tonelada?</span>
                                </td>
                                <td className="p-4 font-mono text-slate-600 bg-slate-50/30">
                                    Gás Total ÷ Produção
                                </td>
                                <td className="p-4 text-slate-600">
                                    Gastei 100m³ de gás pra fazer 10 toneladas.<br />
                                    <b>100 ÷ 10 = 10 m³/t</b>
                                </td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="p-4">
                                    <span className="font-bold text-amber-600 block">Energia (EE)</span>
                                    <span className="text-xs text-slate-500">Quanta luz gastei pra fazer 1 tonelada?</span>
                                </td>
                                <td className="p-4 font-mono text-slate-600 bg-slate-50/30">
                                    Energia Total ÷ Produção
                                </td>
                                <td className="p-4 text-slate-600">
                                    Gastei 500kWh pra fazer 10 toneladas.<br />
                                    <b>500 ÷ 10 = 50 kWh/t</b>
                                </td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="p-4">
                                    <span className="font-bold text-emerald-600 block">Rendimento (RM)</span>
                                    <span className="text-xs text-slate-500">Quanto de produto bom saiu do forno?</span>
                                </td>
                                <td className="p-4 font-mono text-slate-600 bg-slate-50/30">
                                    (Peso Final ÷ Peso Inicial) × 100
                                </td>
                                <td className="p-4 text-slate-600">
                                    Coloquei 100kg de metal, saiu 95kg de peça boa.<br />
                                    <b>(95 ÷ 100) × 100 = 95%</b>
                                </td>
                            </tr>
                            <tr className="hover:bg-slate-50/50">
                                <td className="p-4">
                                    <span className="font-bold text-purple-600 block">Produtividade</span>
                                    <span className="text-xs text-slate-500">Qual a velocidade da fábrica?</span>
                                </td>
                                <td className="p-4 font-mono text-slate-600 bg-slate-50/30">
                                    Produção ÷ Horas Trabalhadas
                                </td>
                                <td className="p-4 text-slate-600">
                                    Fiz 1000 peças em 10 horas.<br />
                                    <b>1000 ÷ 10 = 100 peças/hora</b>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-sm flex gap-3 items-start">
                    <Book className="shrink-0 mt-0.5" size={16} />
                    <p>
                        <b>Dica de Ouro:</b> No simulador, quando você muda a "Eficiência", você está mexendo diretamente
                        nestas continhas de divisão. Se a eficiência melhora, o número de baixo da divisão aumenta, e o custo cai!
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'database',
        title: 'Integração de Dados',
        icon: <Database size={18} />,
        content: (
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-slate-800">Fluxo de Dados</h3>
                <p className="text-slate-600 leading-relaxed">
                    O Industrial Predictor PRO funciona conectando duas fontes vitais de informação:
                </p>
                <div className="space-y-3 mt-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded text-slate-600"><Activity size={16} /></div>
                        <div>
                            <span className="font-bold text-slate-800 block">1. Planilha PCP (.xlsx)</span>
                            <p className="text-sm text-slate-500">Contém o plano de produção diário, setup e mix de produtos. É volátil e muda todo dia.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded text-slate-600"><Target size={16} /></div>
                        <div>
                            <span className="font-bold text-slate-800 block">2. Banco de Metas (Supabase)</span>
                            <p className="text-sm text-slate-500">Contém os padrões técnicos (Consumo Esp., Rendimento) de cada produto (SAP). É persistente e seguro.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
];

export const HelpCenterModal: React.FC<Props> = ({ onClose }) => {
    const [activeTopic, setActiveTopic] = useState(TOPICS[0]);
    const [search, setSearch] = useState("");

    const filteredTopics = TOPICS.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[75vh] flex overflow-hidden">

                {/* Sidebar */}
                <div className="w-1/3 bg-slate-50 border-r border-slate-100 p-6 flex flex-col hidden md:flex">
                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Book className="text-blue-600" />
                            Central de Ajuda
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">Documentação do Sistema</p>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar tópico..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {filteredTopics.map(topic => (
                            <button
                                key={topic.id}
                                onClick={() => setActiveTopic(topic)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${activeTopic.id === topic.id ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-slate-600 hover:bg-white hover:shadow-sm hover:border hover:border-slate-100'}`}
                            >
                                <div className={`p-2 rounded-lg ${activeTopic.id === topic.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                    {topic.icon}
                                </div>
                                <span className="font-bold text-sm">{topic.title}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col relative w-full">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors z-10">
                        <X size={24} />
                    </button>

                    <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar">
                        <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500 key={activeTopic.id}">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl hidden md:block">
                                    {React.cloneElement(activeTopic.icon as React.ReactElement, { size: 40 })}
                                </div>
                                <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">{activeTopic.title}</h1>
                            </div>

                            <div className="prose prose-slate prose-lg">
                                {activeTopic.content}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-50 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col text-xs font-bold text-slate-400 uppercase tracking-widest text-center md:text-left">
                            <span>Industrial Predictor PRO v2.0</span>
                            <span className="font-medium normal-case text-slate-300">Atualizado: {new Date().toLocaleDateString()}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 w-full md:w-auto"
                        >
                            Fechar Central
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
