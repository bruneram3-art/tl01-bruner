import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Lightbulb, TrendingUp, Zap, AlertCircle, CheckCircle2, Flame, Scissors, Package, Trophy, BookOpen, X, ArrowRight } from 'lucide-react';
import { getBitolasFromSupabase, getProductByBitola } from '../services/supabaseClient';

// Constantes do processo
const STEEL_DENSITY = 7850; // kg/m³
const SHEAR_LOSS_PER_CHANNEL = 0.25; // metros
const SAW_LOSS_PER_PIECE = 0.50; // metros

// Interfaces baseadas na especificação do usuário
interface MetallicYieldInputs {
    productLinearMass: number; // kg/m
    billetArea: number;        // mm²
    billetLength: number;      // m
    fireLossPerc: number;      // %
    headCropMM: number;        // mm
    customerLength: number;    // m
    cuttingMode: 'shear' | 'saw' | string;
    shearChannels: number;
    sawPieces: number; // Será mapeado para commercialBarsQty internamente se for dinâmico
}

interface MetallicYieldResults {
    billetLinearMass: number;
    rawBilletWeight: number;
    fireLossKg: number;
    netBilletWeight: number;
    headCropKg: number;
    availableProductWeight: number;
    totalBarLength: number;
    commercialBarsQty: number;
    sh2RemainderM: number;
    sh2LossKg: number;
    finishingLossM: number;
    finishingLossKg: number;
    finalProductWeight: number;
    totalLossKg: number;
    laminatorYield: number;
    finalYield: number;
}

const STEEL_DENSITY_KG_PER_MM2_M = 0.00785;

// Função de otimização isolada (Ref. Usuário)
function optimizeCuttingForClientLength(totalBarLength: number, customerLength: number) {
    if (isNaN(totalBarLength) || isNaN(customerLength) || customerLength <= 0 || totalBarLength <= 0) {
        return { numPieces: 0, remainderM: totalBarLength > 0 ? totalBarLength : 0 };
    }
    const numPieces = Math.floor(totalBarLength / customerLength);
    const remainderM = totalBarLength % customerLength;
    return { numPieces, remainderM };
}

// Função Principal de Cálculo (Ref. Usuário com Ajuste em SawPieces)
export function calculateMetallicYieldMetrics(inputs: MetallicYieldInputs): MetallicYieldResults {
    const {
        productLinearMass, billetArea, billetLength, fireLossPerc, headCropMM,
        customerLength, cuttingMode, shearChannels
    } = inputs;

    // 1. Dados do Tarugo
    const billetLinearMass = billetArea * STEEL_DENSITY_KG_PER_MM2_M;
    const rawBilletWeight = billetLength * billetLinearMass;

    // 2. Perda ao Fogo
    const fireLossKg = rawBilletWeight * (fireLossPerc / 100);
    const netBilletWeight = rawBilletWeight - fireLossKg;

    // 3. Desponte de Cabeça (SH1)
    const headCropKg = (headCropMM / 1000) * billetLinearMass;

    // 4. Peso disponível para virar produto
    const availableProductWeight = netBilletWeight - headCropKg;

    // 5. Comprimento Total Laminado (Teórico)
    const totalBarLength = productLinearMass > 0 ? availableProductWeight / productLinearMass : 0;

    // 6. Otimização no Leito (SH2)
    const optimizationResult = optimizeCuttingForClientLength(totalBarLength, customerLength);
    const commercialBarsQty = optimizationResult.numPieces;
    const sh2RemainderM = optimizationResult.remainderM;
    const sh2LossKg = sh2RemainderM * productLinearMass;

    // 7. Perda de Acabamento (Corte Final)
    // Agora "shearChannels" representa a "Quantidade de Cortes" para ambos os modos
    let finishingLossM = 0;
    const cutCount = shearChannels || 0;

    if (cuttingMode === 'shear') {
        // Modo Navalha: 0.25m por corte
        finishingLossM = cutCount * 0.250;
    } else if (cuttingMode === 'saw') {
        // Modo Serra: 0.50m por corte
        finishingLossM = cutCount * 0.500;
    }
    const finishingLossKg = finishingLossM * productLinearMass;

    // 8. Totais
    const soldProductWeight = (commercialBarsQty * customerLength * productLinearMass);
    const finalProductWeight = soldProductWeight - finishingLossKg;
    const totalLossKg = fireLossKg + headCropKg + sh2LossKg + finishingLossKg;

    // 9. Rendimentos

    // Rendimento Laminador (Desconsidera acabamento)
    // Fórmula Ref: ((Raw - Fogo - Ponta - Sobra) / Raw) * 100
    const laminatorYield = (rawBilletWeight > 0)
        ? ((rawBilletWeight - fireLossKg - headCropKg - sh2LossKg) / rawBilletWeight) * 100
        : 0;

    // Rendimento Global Final
    const finalYield = (rawBilletWeight > 0)
        ? (finalProductWeight / rawBilletWeight) * 100
        : 0;

    return {
        billetLinearMass,
        rawBilletWeight,
        fireLossKg,
        netBilletWeight,
        headCropKg,
        availableProductWeight,
        totalBarLength,
        commercialBarsQty,
        sh2RemainderM,
        sh2LossKg,
        finishingLossM,
        finishingLossKg,
        finalProductWeight,
        totalLossKg,
        laminatorYield,
        finalYield
    };
}

export const MetallicYieldSimulator: React.FC = () => {
    // ========== ESTADOS DE ENTRADA ==========
    const [productFamily, setProductFamily] = useState<string>('Angle');
    const [selectedBitola, setSelectedBitola] = useState<string>('');
    const [productLinearMass, setProductLinearMass] = useState<number>(0);
    const [availableBitolas, setAvailableBitolas] = useState<any[]>([]);
    const [loadingBitolas, setLoadingBitolas] = useState(false);

    const [clientLength, setClientLength] = useState<number | string>('');
    const [billetLength, setBilletLength] = useState<number | string>('');
    const [billetSection, setBilletSection] = useState<string>('152x152');
    const [rawArea, setRawArea] = useState<number>(23104);
    const [initialTemp, setInitialTemp] = useState<number>(1200);
    const [steelGrade, setSteelGrade] = useState<string>('ASTM A572 G50');
    const [scaleLossPct, setScaleLossPct] = useState<number>(1.5);

    const [cutMode, setCutMode] = useState<'shear' | 'saw'>('shear');
    const [shearChannels, setShearChannels] = useState<number>(1);
    // Estado do Modal de Explicação
    const [showExplanation, setShowExplanation] = useState(false);
    const [headCropSH1, setHeadCropSH1] = useState<number>(100);

    const [targetLengths, setTargetLengths] = useState([65, 60, 48, 36]);

    // ========== CARREGAR BITOLAS DO BD ==========
    useEffect(() => {
        // Reseta a seleção atual quando muda a família para evitar confusão
        setSelectedBitola('');
        setProductLinearMass(0);
        loadBitolas();
    }, [productFamily]);

    // Mapeamento de Família -> Prefixo da Bitola (confirmado pelo usuário)
    const FAMILY_PREFIX: Record<string, string> = {
        'Angle': 'K',
        'Channel': 'U',
        'Flat': 'CH',
        'Round': 'RD',
        'Square': 'QD',
        'Beans': 'I'
    };

    const loadBitolas = async () => {
        setLoadingBitolas(true);
        try {
            const allBitolas: any[] = await getBitolasFromSupabase();
            const prefix = FAMILY_PREFIX[productFamily];

            let filtered = allBitolas;

            if (prefix) {
                filtered = allBitolas.filter(b => {
                    const name = (b.bitola || '').toUpperCase().trim();
                    return name.startsWith(prefix);
                });
            }
            // Se não tiver prefixo definido, mostra tudo (fallback)

            setAvailableBitolas(filtered);

            // LOG DIAGNÓSTICO: Mostrar todos os prefixos existentes no banco
            const prefixos = [...new Set(allBitolas.map(b => {
                const name = (b.bitola || '').toUpperCase().trim();
                return name.substring(0, 3); // Primeiros 3 caracteres
            }))].sort();
            console.log('📊 [DIAGNÓSTICO] Prefixos existentes no BD:', prefixos);
            console.log(`📊 [DIAGNÓSTICO] Filtro aplicado: família="${productFamily}" → prefixo="${prefix}"`);
            console.log(`📊 [DIAGNÓSTICO] Resultado: ${filtered.length} de ${allBitolas.length} bitolas`);
            if (filtered.length === 0 && allBitolas.length > 0) {
                console.log('📊 [DIAGNÓSTICO] Exemplos de bitolas no BD:', allBitolas.slice(0, 10).map(b => b.bitola));
            }
        } catch (error) {
            console.error('Erro ao carregar bitolas:', error);
        } finally {
            setLoadingBitolas(false);
        }
    };

    const handleBitolaChange = async (bitola: string) => {
        setSelectedBitola(bitola);

        if (!bitola) {
            setProductLinearMass(0);
            return;
        }

        try {
            const productData = await getProductByBitola(bitola);
            if (productData) {
                console.log('📦 Dados do produto carregados:', productData);

                if (productData.massa_linear) {
                    setProductLinearMass(Number(productData.massa_linear));
                    console.log('✅ Massa linear carregada:', productData.massa_linear);
                }
                else if (productData.massaLinear) {
                    setProductLinearMass(Number(productData.massaLinear));
                    console.log('✅ Massa linear carregada:', productData.massaLinear);
                }
                else {
                    console.log('⚠️ Campo de massa linear não encontrado. Insira manualmente.');
                    console.log('💡 Campos disponíveis:', Object.keys(productData));
                }

                if (productData.rm) {
                    console.log('📊 Rendimento esperado (RM):', productData.rm, '%');
                }
            }
        } catch (error) {
            console.error('❌ Erro ao buscar dados do produto:', error);
        }
    };



    // ========== OPTIMIZATION CALCULATIONS (Memoized to prevent infinite loops) ==========
    const optimalBilletLength = useMemo(() => {
        // console.log('⚡ Calculating optimalBilletLength with clientLength:', clientLength, 'productLinearMass:', productLinearMass);

        try {
            const cLen = Number(clientLength) || 0;
            // Se não tiver dados do produto ou cliente, retorna o input atual (ou 0)
            if (productLinearMass <= 0 || cLen <= 0 || rawArea <= 0) {
                // console.log('⚠️ Early return: missing data');
                return Number(billetLength) || 0;
            }

            // Constraint: Maximum Billet Length capability (Standard furnace limit)
            const currentInput = Number(billetLength);
            const MAX_BILLET_LENGTH = currentInput > 0 ? currentInput * 1.05 : 12.0;

            // 1. Calculate Billet Linear Mass (kg/m)
            const billetLinearMass = (rawArea) * STEEL_DENSITY_KG_PER_MM2_M;
            if (billetLinearMass <= 0) return 0; // Prevent div by zero

            // 2. Calculate optimal number of bars that fit
            const approxRawMPerBar = (cLen * productLinearMass * 1.05) / billetLinearMass;

            // Prevent infinite loop
            if (approxRawMPerBar <= 0.01) return 0;

            const maxN = Math.floor(MAX_BILLET_LENGTH / approxRawMPerBar) + 5; // buffer

            let bestN = 0;
            let bestLength = 0;

            for (let n = 1; n <= maxN; n++) {
                // Finishing Loss logic
                let totalFinishingLossM = 0;
                if (cutMode === 'shear') {
                    totalFinishingLossM = shearChannels * SHEAR_LOSS_PER_CHANNEL;
                } else {
                    totalFinishingLossM = n * SAW_LOSS_PER_PIECE;
                }

                const targetProductLength = (n * cLen) + totalFinishingLossM;
                const targetProductWeight = targetProductLength * productLinearMass;

                const headCropKg = (headCropSH1 / 1000) * billetLinearMass;
                const requiredRawWeight = (targetProductWeight + headCropKg) / (1 - (scaleLossPct / 100));
                const requiredLength = requiredRawWeight / billetLinearMass;

                if (requiredLength <= MAX_BILLET_LENGTH) {
                    bestN = n;
                    bestLength = requiredLength;
                } else {
                    break; // Exceeded max length
                }
            }

            const result = Math.floor(bestLength * 100) / 100;
            // console.log('✅ Optimal length calculated:', result);
            return result;
        } catch (error) {
            console.error('❌ Error in optimalBilletLength calculation:', error);
            return 0;
        }
    }, [productLinearMass, rawArea, billetLength, clientLength, cutMode, shearChannels, headCropSH1, scaleLossPct]);

    // ========== CÁLCULOS PRINCIPAIS (Hook Atualizado) ==========
    const calculations = useMemo(() => {
        // console.log('🧮 Calculating metrics with clientLength:', clientLength, 'billetLength:', billetLength);

        // AUTO-FILL LOGIC: Use optimal length if user input is empty
        const effectiveBilletLength = Number(billetLength) || (optimalBilletLength > 0 ? optimalBilletLength : 0);

        const inputs: MetallicYieldInputs = {
            productLinearMass,
            billetArea: rawArea,
            billetLength: effectiveBilletLength,
            fireLossPerc: scaleLossPct,
            headCropMM: headCropSH1,
            customerLength: Number(clientLength) || 0,
            cuttingMode: cutMode,
            shearChannels,
            sawPieces: 0 // Ignorado pela função ajustada em favor do calculado
        };
        return calculateMetallicYieldMetrics(inputs);
    }, [productLinearMass, rawArea, billetLength, optimalBilletLength, scaleLossPct, headCropSH1, clientLength, cutMode, shearChannels]);

    // Show suggestion if difference > 5cm OR if billet length is not defined yet  
    const showOptimizationSuggestion = useMemo(() => {
        return optimalBilletLength > 0 && (Number(billetLength) === 0 || Math.abs(Number(billetLength) - optimalBilletLength) > 0.05);
    }, [optimalBilletLength, billetLength]);

    const optimalScenario = useMemo(() => {
        console.log('🕹️ Calculating optimalScenario, showOptimizationSuggestion:', showOptimizationSuggestion);
        if (!showOptimizationSuggestion || optimalBilletLength <= 0) {
            console.log('⚠️ Skipping optimalScenario calculation');
            return null;
        }

        try {
            const inputs: MetallicYieldInputs = {
                productLinearMass,
                billetArea: rawArea,
                billetLength: optimalBilletLength,
                fireLossPerc: scaleLossPct,
                headCropMM: headCropSH1,
                customerLength: Number(clientLength) || 0,
                cuttingMode: cutMode,
                shearChannels,
                sawPieces: 0
            };
            const result = calculateMetallicYieldMetrics(inputs);
            console.log('✅ optimalScenario calculated:', result.finalYield);
            return result;
        } catch (error) {
            console.error('❌ Error calculating optimalScenario:', error);
            return null;
        }
    }, [showOptimizationSuggestion, optimalBilletLength, rawArea, productLinearMass, clientLength, scaleLossPct, headCropSH1, cutMode, shearChannels]);

    // ========== OTIMIZAÇÃO DO LEITO (SH2) - Análise e Decisão ==========
    const bedOptimizationAnalysis = useMemo(() => {
        // 1. Calcular métricas para todas as opções
        const analysis = [0, 1, 2, 3].map(idx => {
            const targetLen = targetLengths[idx] || 0;
            if (targetLen <= 0) return null;

            const totalLen = calculations.totalBarLength;
            const numBars = Math.floor(totalLen / targetLen);
            const remainder = totalLen % targetLen;

            // Simulação do RM
            const projectedSh2LossKg = remainder * calculations.billetLinearMass;
            // Remover a perda SH2 atual do total e adicionar a projetada
            const currentLossWithoutSh2 = calculations.totalLossKg - calculations.sh2LossKg;
            const adjustedTotalLoss = currentLossWithoutSh2 + projectedSh2LossKg;

            const projectedYield = calculations.rawBilletWeight > 0
                ? ((calculations.rawBilletWeight - adjustedTotalLoss) / calculations.rawBilletWeight) * 100
                : 0;

            return { idx, targetLen, numBars, remainder, projectedYield };
        }).filter((opt): opt is NonNullable<typeof opt> => opt !== null);

        // 2. Determinar a Melhor Opção
        // Ordenar por Comprimento (Descrescente)
        const sortedByLength = [...analysis].sort((a, b) => b.targetLen - a.targetLen);

        // Critério: Primeiro (maior) que tem RM >= 96.4% E sobra segura (<= 0.5m)
        let bestOption = sortedByLength.find(opt => opt.projectedYield >= 96.4 && opt.remainder <= 0.50);

        // Fallback: Se nenhum atende, pega o de Maior RM
        if (!bestOption && analysis.length > 0) {
            bestOption = [...analysis].sort((a, b) => b.projectedYield - a.projectedYield)[0];
        }

        return { analysis, bestOption };
    }, [targetLengths, calculations]);

    // ========== AUTO-AJUSTE: Quantidade de Cortes ==========
    useEffect(() => {
        // Sempre atualiza a quantidade de cortes baseada na recomendação (Navalha ou Serra)
        if (bedOptimizationAnalysis.bestOption) {
            const recommendedBars = bedOptimizationAnalysis.bestOption.numBars;
            // Atualiza se for diferente e maior que 0
            if (recommendedBars > 0 && shearChannels !== recommendedBars) {
                setShearChannels(recommendedBars);
            }
        }
    }, [bedOptimizationAnalysis.bestOption, shearChannels]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Hero Header */}
                <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-8 md:p-12 overflow-hidden">
                    <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>

                    <div className="relative flex items-center gap-6">
                        <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg">
                            <Settings className="text-white" size={48} strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                                Simulador de Rendimento da Bitola
                            </h1>
                            <p className="text-blue-100 text-lg font-medium">
                                Otimize perdas e maximize lucros com análise em tempo real
                            </p>
                        </div>
                        <div className="hidden lg:flex items-center gap-4">
                            <button
                                onClick={() => setShowExplanation(true)}
                                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 hover:scale-105 active:scale-95"
                            >
                                <BookOpen size={20} />
                                <span className="text-sm font-bold">Entenda o Cálculo</span>
                            </button>
                            <div className="text-center bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl">
                                <div className="text-3xl font-black text-white">{calculations.finalYield.toFixed(1)}%</div>
                                <div className="text-xs text-blue-100 font-semibold">Rendimento Global</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seção 1: Família do Produto */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 md:p-8 transition-all hover:shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-lg shadow-lg">
                            1
                        </div>
                        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 uppercase tracking-wide">
                            Família do Produto
                        </h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-3">
                            {['Angle', 'Channel', 'Flat', 'Round', 'Square', 'Beans'].map(fam => (
                                <button
                                    key={fam}
                                    onClick={() => setProductFamily(fam)}
                                    className={`px-6 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${productFamily === fam
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 scale-105'
                                        : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-emerald-300 hover:scale-105 hover:shadow-md'
                                        }`}
                                >
                                    {fam}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                                    <Package size={14} className="text-blue-500" />
                                    Bitola (Perfil)
                                </label>
                                <select
                                    value={selectedBitola}
                                    onChange={(e) => handleBitolaChange(e.target.value)}
                                    disabled={loadingBitolas || availableBitolas.length === 0}
                                    className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-700 font-semibold focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all disabled:bg-slate-100"
                                >
                                    <option value="">
                                        {loadingBitolas
                                            ? 'Carregando...'
                                            : availableBitolas.length === 0
                                                ? `Nenhum produto "${productFamily}" cadastrado`
                                                : 'Selecione a Bitola'}
                                    </option>
                                    {availableBitolas.map((bitola, idx) => (
                                        <option key={idx} value={bitola.bitola}>
                                            {bitola.bitola} ({bitola.sap})
                                        </option>
                                    ))}
                                </select>
                                {!loadingBitolas && availableBitolas.length === 0 && (
                                    <p className="text-xs text-amber-600 font-semibold mt-2 flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        Família "{productFamily}" não encontrada no arquivo de Metas. Inclua produtos com prefixo "{FAMILY_PREFIX[productFamily]}" e re-importe.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                                    <TrendingUp size={14} className="text-emerald-500" />
                                    Massa Linear do Produto (kg/m)
                                </label>
                                <input
                                    type="number"
                                    value={productLinearMass || ''}
                                    onChange={(e) => setProductLinearMass(Number(e.target.value))}
                                    placeholder="Ex: 5.0"
                                    className="w-full px-4 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl text-emerald-700 font-bold focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all placeholder:text-emerald-300"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seção 2: Detalhes do Tarugo */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 md:p-8 transition-all hover:shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white font-black text-lg shadow-lg">
                            2
                        </div>
                        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 uppercase tracking-wide">
                            Detalhes do Tarugo e Processo
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <InputField
                            label="Comprimento do Cliente (m)"
                            value={clientLength}
                            onChange={setClientLength}
                        />

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wide">
                                Comp. Tarugo (m)
                            </label>
                            <input
                                type="number"
                                value={billetLength === '' && optimalBilletLength > 0 ? optimalBilletLength : billetLength}
                                onChange={(e) => setBilletLength(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-4 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl text-amber-900 font-extrabold text-lg focus:outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all placeholder:text-amber-300/50 shadow-inner"
                                placeholder="Auto"
                            />
                        </div>

                        <SelectField
                            label="Seção do Tarugo"
                            value={billetSection}
                            onChange={(val) => {
                                setBilletSection(val);
                                if (val === '152x152') setRawArea(23104);
                                if (val === '130x130') setRawArea(16900);
                            }}
                            options={[
                                { value: '152x152', label: '152×152 mm' },
                                { value: '130x130', label: '130×130 mm' }
                            ]}
                        />

                        <InputField label="Área Tarugo Bruta (mm²)" value={rawArea} onChange={setRawArea} />
                        <OutputField label="Massa Linear Tarugo (kg/m)" value={`${calculations.billetLinearMass.toFixed(2)} kg/m`} />
                        <OutputField label="Peso Bruto Tarugo (kg)" value={calculations.rawBilletWeight.toFixed(2)} />
                        <OutputField label="Peso Líquido (kg)" value={`${calculations.netBilletWeight.toFixed(2)} kg`} highlight />
                        <InputField label="Temp. Inicial (°C)" value={initialTemp} onChange={setInitialTemp} />
                        <InputField label="Grau de Aço" value={steelGrade} onChange={setSteelGrade} type="text" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Perda ao Fogo (%)" value={scaleLossPct} onChange={setScaleLossPct} step={0.1} />
                            <OutputField label="Comp. Total Laminado (m)" value={`${calculations.totalBarLength.toFixed(2)} m`} highlight />
                        </div>
                    </div>
                </div>

                {/* Seção 2.1: Painel Inteligente de Decisão (Novo) */}
                {optimalScenario && showOptimizationSuggestion && (
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl shadow-2xl p-0.5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="bg-white rounded-[1.4rem] p-6 relative overflow-hidden">
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>

                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600">
                                    <Zap size={24} fill="currentColor" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Oportunidade de Otimização</h3>
                                    <p className="text-sm font-medium text-slate-500">Detectamos um cenário mais eficiente para este produto.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                {/* Card Atual */}
                                <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 opacity-70 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cenário Atual</span>
                                        <span className="px-2 py-1 bg-slate-200 text-slate-600 text-[10px] font-black uppercase rounded-lg">Padrão</span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-700 mb-1">
                                        {(Number(billetLength) || optimalBilletLength || 0).toFixed(2)}m
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-sm font-bold text-slate-500">Rendimento:</span>
                                        <span className="text-sm font-black text-slate-700">{calculations.finalYield.toFixed(2)}%</span>
                                    </div>
                                    <div className="text-xs font-medium text-slate-400">
                                        Perda Total: {calculations.totalLossKg.toFixed(1)} kg/tarugo
                                    </div>
                                </div>

                                {/* Card Otimizado */}
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 shadow-lg relative group cursor-pointer" onClick={() => setBilletLength(optimalBilletLength)}>
                                    <div className="absolute top-3 right-3 animate-pulse">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                    </div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                            <TrendingUp size={12} /> Sugestão IA
                                        </span>
                                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg">
                                            +{optimalScenario ? (optimalScenario.finalYield - calculations.finalYield).toFixed(2) : '0.00'}%
                                        </span>
                                    </div>
                                    <div className="text-3xl font-black text-emerald-700 mb-1">{optimalBilletLength.toFixed(2)}m</div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-sm font-bold text-emerald-600/70">Rendimento:</span>
                                        <span className="text-lg font-black text-emerald-700">{optimalScenario ? optimalScenario.finalYield.toFixed(2) : '0.00'}%</span>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); setBilletLength(optimalBilletLength); }}
                                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                                    >
                                        <CheckCircle2 size={16} />
                                        Aplicar Otimização
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Seção 3: Configuração */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 md:p-8 transition-all hover:shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white font-black text-lg shadow-lg">
                            3
                        </div>
                        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 uppercase tracking-wide">
                            Configuração do Processo
                        </h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-6 bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-2xl">
                            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Scissors size={16} className="text-orange-500" />
                                Modo de corte
                            </span>
                            <div className="flex gap-4">
                                <RadioButton label="Navalha" checked={cutMode === 'shear'} onChange={() => setCutMode('shear')} />
                                <RadioButton label="Serra" checked={cutMode === 'saw'} onChange={() => setCutMode('saw')} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Quantidade de Cortes" value={shearChannels} onChange={setShearChannels} />
                            <OutputField label="Perda Calculada" value={`${calculations.finishingLossM.toFixed(2)} m (${calculations.finishingLossKg.toFixed(2)} kg)`} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                                    <Flame size={14} className="text-orange-500" />
                                    Desponte de Cabeça (SH1) (mm)
                                </label>
                                <div className="flex gap-3">
                                    <input
                                        type="number"
                                        value={headCropSH1}
                                        onChange={(e) => setHeadCropSH1(Number(e.target.value))}
                                        className="flex-1 px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 font-semibold focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                                    />
                                    <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl text-amber-700 font-black whitespace-nowrap flex items-center">
                                        {calculations.headCropKg.toFixed(2)} kg
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seção 4: Otimização */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 md:p-8 transition-all hover:shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black text-lg shadow-lg">
                            4
                        </div>
                        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 uppercase tracking-wide">
                            Otimização do Leito (SH2)
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Renderização baseada no Hook de Análise */}
                        {[0, 1, 2, 3].map((idx) => {
                            const targetLen = targetLengths[idx] || 0;
                            const metrics = bedOptimizationAnalysis.analysis.find(m => m.idx === idx);
                            const isRecommended = bedOptimizationAnalysis.bestOption?.idx === idx;

                            const numBars = metrics?.numBars || 0;
                            const remainder = metrics?.remainder || 0;
                            const isEfficient = remainder <= 0.50;

                            return (
                                <div key={idx} className={`relative flex gap-3 transition-all p-3 rounded-2xl ${isRecommended
                                    ? 'bg-blue-50/50 ring-4 ring-blue-100 shadow-sm z-10'
                                    : 'hover:bg-slate-50'
                                    }`}>
                                    {isRecommended && (
                                        <div className="absolute -top-3 -right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1 z-20 animate-in zoom-in">
                                            <Trophy size={10} fill="currentColor" /> RECOMENDADO
                                        </div>
                                    )}

                                    <div className="flex-1 space-y-2">
                                        <label className={`text-xs font-bold uppercase tracking-wide ${isRecommended ? 'text-blue-700' : 'text-slate-600'}`}>
                                            Comprimento Alvo {idx + 1} (m)
                                        </label>
                                        <input
                                            type="number"
                                            value={targetLengths[idx]}
                                            onChange={(e) => {
                                                const newLengths = [...targetLengths];
                                                newLengths[idx] = Number(e.target.value);
                                                setTargetLengths(newLengths);
                                            }}
                                            className={`w-full px-4 py-4 border-2 rounded-2xl font-semibold focus:outline-none focus:ring-4 transition-all ${isRecommended
                                                ? 'bg-white border-blue-400 text-blue-900 focus:ring-blue-200'
                                                : 'bg-white border-slate-200 text-slate-800 focus:ring-slate-100'
                                                }`}
                                        />
                                    </div>
                                    <div className={`mt-auto px-4 py-3 border-2 rounded-2xl font-black whitespace-nowrap flex flex-col items-end min-w-[130px] justify-center transition-colors ${targetLen === 0 ? 'bg-slate-50 border-slate-200 text-slate-400' :
                                        isRecommended
                                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                                            : isEfficient
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                : 'bg-red-50 border-red-200 text-red-700'
                                        }`}>
                                        <span className="text-lg leading-tight">{numBars} barras</span>
                                        {targetLen > 0 && metrics && (
                                            <>
                                                <span className={`text-[10px] uppercase font-bold mt-1 ${isRecommended ? 'text-blue-600' : isEfficient ? 'text-emerald-600' : 'text-red-500'
                                                    }`}>
                                                    Sobra: {remainder.toFixed(2)}m
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-medium">
                                                    RM: {metrics.projectedYield.toFixed(2)}%
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Seção 5: Dados da Barra */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 md:p-8 transition-all hover:shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white font-black text-lg shadow-lg">
                            5
                        </div>
                        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 uppercase tracking-wide">
                            Dados da Barra
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <OutputField label="Comprimento Total (m)" value={`${calculations.totalBarLength.toFixed(2)} m`} highlight />
                        <OutputField label="Peso Total Comml. (kg)" value={`${(calculations.commercialBarsQty * (Number(clientLength) || 0) * productLinearMass).toFixed(2)} kg`} highlight />
                        <OutputField label="Barras Comerciais" value={calculations.commercialBarsQty} highlight />
                        <OutputField label="Sobra SH2 (m)" value={`${calculations.sh2RemainderM.toFixed(2)} m`} />
                        <OutputField label="Comp. Final Cliente (m)" value={`${(calculations.commercialBarsQty * (Number(clientLength) || 0)).toFixed(2)} m`} />
                    </div>
                </div>

                {/* Resumo de Rendimento */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <YieldCard
                        title="Rendimento do Laminador"
                        value={calculations.laminatorYield}
                        icon={<Zap />}
                        color="from-blue-500 to-indigo-600"
                    />
                    <YieldCard
                        title="Rendimento do Acabamento"
                        value={calculations.finalYield / (calculations.laminatorYield || 1) * 100}
                        icon={<CheckCircle2 />}
                        color="from-purple-500 to-pink-600"
                    />
                    <YieldCard
                        title="Rendimento Metálico Global"
                        value={calculations.finalYield}
                        icon={<TrendingUp />}
                        color="from-emerald-500 to-teal-600"
                        highlight
                    />
                </div>

                {/* Tabela de Perdas */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 md:p-8">
                    <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 uppercase mb-6">
                        Detalhamento de Perdas
                    </h3>

                    <div className="overflow-x-auto rounded-2xl border-2 border-slate-100">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-slate-100 to-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black text-slate-700 uppercase">Tipo de Perda</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase">(%)</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase">(kg)</th>
                                    <th className="px-6 py-4 text-right text-xs font-black text-slate-700 uppercase">(m)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-100">
                                <LossRow label="Perda ao Fogo" pct={calculations.rawBilletWeight > 0 ? (calculations.fireLossKg / calculations.rawBilletWeight) * 100 : 0} kg={calculations.fireLossKg} meters="—" />
                                <LossRow label="Desponte (SH1)" pct={calculations.rawBilletWeight > 0 ? (calculations.headCropKg / calculations.rawBilletWeight) * 100 : 0} kg={calculations.headCropKg} meters={(calculations.headCropKg > 0 && calculations.billetLinearMass > 0 ? calculations.headCropKg / calculations.billetLinearMass : 0).toFixed(3)} />
                                <LossRow label="Sobra Leito (SH2)" pct={calculations.rawBilletWeight > 0 ? (calculations.sh2LossKg / calculations.rawBilletWeight) * 100 : 0} kg={calculations.sh2LossKg} meters={calculations.sh2RemainderM.toFixed(3)} />
                                <LossRow label="Perda Acabamento" pct={calculations.rawBilletWeight > 0 ? (calculations.finishingLossKg / calculations.rawBilletWeight) * 100 : 0} kg={calculations.finishingLossKg} meters={calculations.finishingLossM.toFixed(3)} />
                                <tr className="bg-gradient-to-r from-red-50 to-orange-50">
                                    <td className="px-6 py-4 text-sm font-black text-red-900 uppercase">Total de Perdas</td>
                                    <td className="px-6 py-4 text-sm font-black text-red-600 text-right">{(calculations.rawBilletWeight > 0 ? (calculations.totalLossKg / calculations.rawBilletWeight) * 100 : 0).toFixed(2)} %</td>
                                    <td className="px-6 py-4 text-sm font-black text-red-600 text-right">{calculations.totalLossKg.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm font-black text-slate-400 text-right">—</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL DE EXPLICAÇÃO DO CÁLCULO */}
            {showExplanation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col relative animate-in zoom-in-95 duration-300 border border-white/50">
                        {/* Header do Modal */}
                        <div className="sticky top-0 bg-white/90 backdrop-blur-xl p-6 border-b border-slate-100 flex justify-between items-center z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                                    <BookOpen size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">Entenda o Cálculo</h3>
                                    <p className="text-sm text-slate-500 font-medium">Passo a passo matemático do cenário atual</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowExplanation(false)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="p-6 md:p-8 space-y-8 bg-slate-50/50">

                            {/* Player de Áudio - Podcast NotebookLM */}
                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center gap-6">
                                <div className="p-4 bg-white/10 rounded-full animate-pulse">
                                    <BookOpen size={32} />
                                </div>
                                <div className="flex-1 space-y-2 text-center md:text-left">
                                    <h4 className="text-lg font-bold text-white flex items-center justify-center md:justify-start gap-2">
                                        🎧 Ouça a Explicação do Especialista (IA)
                                        <span className="bg-blue-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Novo</span>
                                    </h4>
                                    <p className="text-sm text-slate-300 max-w-xl">
                                        Entenda os conceitos fundamentais de rendimento metálico enquanto acompanha os cálculos na tela. Gerado com tecnologia Google NotebookLM.
                                    </p>

                                    {/* Player Real */}
                                    <audio controls className="w-full mt-4 h-10 rounded-lg opacity-90 hover:opacity-100 transition-opacity">
                                        <source src="/audio/explicacao_rendimento.m4a" type="audio/mp4" />
                                        Seu navegador não suporta o elemento de áudio.
                                    </audio>
                                    <p className="text-[10px] text-slate-400 mt-1 italic">
                                        * Áudio gerado via NotebookLM.
                                    </p>
                                </div>
                            </div>

                            {/* Passo 1: O Início */}
                            <div className="relative pl-8 border-l-4 border-blue-200 space-y-4">
                                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-sm"></div>
                                <h4 className="text-lg font-black text-blue-800">1. O Início (Tarugo Bruto)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                                        <p className="text-xs text-slate-500 font-bold uppercase">Peso do Tarugo</p>
                                        <p className="text-2xl font-black text-slate-800">{calculations.rawBilletWeight.toFixed(2)} kg</p>
                                        <p className="text-xs text-slate-400 mt-1">Baseado na área ({rawArea} mm²) e comprimento ({Number(billetLength).toFixed(2)} m)</p>
                                    </div>
                                </div>
                            </div>

                            {/* Passo 2: Perdas Inevitáveis */}
                            <div className="relative pl-8 border-l-4 border-orange-200 space-y-4">
                                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-sm"></div>
                                <h4 className="text-lg font-black text-orange-800">2. Perdas Inevitáveis (Fogo e Ponta)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute right-0 top-0 p-2 text-orange-100"><Flame size={40} /></div>
                                        <p className="text-xs text-orange-600 font-bold uppercase">Perda ao Fogo ({scaleLossPct}%)</p>
                                        <p className="text-xl font-black text-orange-700">-{calculations.fireLossKg.toFixed(2)} kg</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute right-0 top-0 p-2 text-orange-100"><Scissors size={40} /></div>
                                        <p className="text-xs text-orange-600 font-bold uppercase">Desponte SH1 ({headCropSH1}mm)</p>
                                        <p className="text-xl font-black text-orange-700">-{calculations.headCropKg.toFixed(2)} kg</p>
                                    </div>
                                </div>
                            </div>

                            {/* Passo 3: Transformação em Comprimento */}
                            <div className="relative pl-8 border-l-4 border-purple-200 space-y-4">
                                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-purple-500 rounded-full border-4 border-white shadow-sm"></div>
                                <h4 className="text-lg font-black text-purple-800">3. Laminação (Massa Disponível)</h4>
                                <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-lg bg-gradient-to-r from-purple-50 to-white">
                                    <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-slate-500 uppercase">Massa Útil</p>
                                            <p className="text-xl font-black text-slate-800">{(calculations.netBilletWeight - calculations.headCropKg).toFixed(2)} kg</p>
                                        </div>
                                        <ArrowRight className="text-purple-300" />
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-purple-600 uppercase">Divisão</p>
                                            <p className="text-sm font-bold text-purple-500">÷ {productLinearMass} kg/m</p>
                                        </div>
                                        <ArrowRight className="text-purple-300" />
                                        <div className="text-center bg-purple-100 px-4 py-2 rounded-xl border border-purple-200">
                                            <p className="text-xs font-bold text-purple-700 uppercase">Comp. Total (Laminado)</p>
                                            <p className="text-2xl font-black text-purple-900">{calculations.totalBarLength.toFixed(2)} m</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-center text-slate-400 mt-4 italics">
                                        "É aqui que descobrimos o tamanho da 'tripa' de aço antes de cortar nas barras do cliente."
                                    </p>
                                </div>
                            </div>

                            {/* Passo 4: Otimização e Cortes */}
                            <div className="relative pl-8 border-l-4 border-emerald-200 space-y-4">
                                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-sm"></div>
                                <h4 className="text-lg font-black text-emerald-800">4. Otimização e Cortes Finais (SH2)</h4>
                                <p className="text-sm text-slate-600">
                                    Otimizamos o leito para obter <strong>{calculations.commercialBarsQty} barras</strong> de {clientLength}m.
                                    O que não virou barra é perda.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                        <p className="text-xs text-red-600 font-bold uppercase">Sobra do Leito (Ponta Final)</p>
                                        <div className="flex justify-between items-end">
                                            <p className="text-xl font-black text-red-700">{calculations.sh2RemainderM.toFixed(2)} m</p>
                                            <p className="text-sm font-bold text-red-400">({calculations.sh2LossKg.toFixed(2)} kg)</p>
                                        </div>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                        <p className="text-xs text-red-600 font-bold uppercase">Perda de Acabamento (Cortes)</p>
                                        <div className="flex justify-between items-end">
                                            <p className="text-xl font-black text-red-700">{calculations.finishingLossM.toFixed(2)} m</p>
                                            <p className="text-sm font-bold text-red-400">({calculations.finishingLossKg.toFixed(2)} kg)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Passo 5: Resultado Final */}
                            <div className="relative pl-8">
                                <div className="absolute -left-[13px] top-0 w-6 h-6 bg-slate-800 rounded-full border-4 border-white shadow-sm"></div>
                                <h4 className="text-lg font-black text-slate-800">5. O Veredito (Rendimento)</h4>
                                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl hover:scale-[1.01] transition-transform">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="space-y-1">
                                            <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Peso Final do Produto</p>
                                            <p className="text-3xl font-black">{calculations.finalProductWeight.toFixed(2)} kg</p>
                                        </div>
                                        <div className="h-px w-full md:w-px md:h-12 bg-slate-700"></div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Peso do Tarugo</p>
                                            <p className="text-3xl font-black text-slate-400">{calculations.rawBilletWeight.toFixed(2)} kg</p>
                                        </div>
                                        <div className="bg-emerald-500 text-slate-900 px-6 py-3 rounded-2xl font-black text-2xl shadow-lg shadow-emerald-900/50">
                                            = {calculations.finalYield.toFixed(2)}%
                                        </div>
                                    </div>
                                    <p className="text-center text-slate-500 text-xs mt-6 font-mono">
                                        (Peso Produto / Peso Tarugo) * 100
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ========== COMPONENTES AUXILIARES ==========

const InputField = ({ label, value, onChange, type = 'number', step, disabled = false }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</label>
        <input
            type={type}
            step={step}
            value={value}
            onChange={(e) => {
                const val = e.target.value;
                if (type === 'number') {
                    onChange(val === '' ? '' : Number(val));
                } else {
                    onChange(val);
                }
            }}
            disabled={disabled}
            className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-800 font-semibold focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
        />
    </div>
);

const SelectField = ({ label, value, onChange, options }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-700 font-semibold focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
        >
            {options.map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const OutputField = ({ label, value, highlight = false }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</label>
        <div className={`px-4 py-4 rounded-2xl font-bold ${highlight
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 text-emerald-700'
            : 'bg-slate-50 border-2 border-slate-200 text-slate-600'
            }`}>
            {value}
        </div>
    </div>
);

const RadioButton = ({ label, checked, onChange }: any) => (
    <label className="flex items-center gap-2 cursor-pointer group">
        <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 group-hover:border-blue-400'
            }`}>
            {checked && <div className="w-2 h-2 bg-white rounded-full" />}
        </div>
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <input type="radio" className="hidden" checked={checked} onChange={onChange} />
    </label>
);

const YieldCard = ({ title, value, icon, color, highlight = false }: any) => (
    <div className={`relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-6 transition-all hover:scale-105 ${highlight ? 'ring-4 ring-emerald-200' : ''
        }`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5 rounded-3xl`}></div>
        <div className="relative space-y-4">
            <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
                {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
            </div>
            <div>
                <div className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-2">{title}</div>
                <div className={`text-4xl font-black bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
                    {value.toFixed(2)}%
                </div>
            </div>
        </div>
    </div>
);

const LossRow = ({ label, pct, kg, meters }: any) => (
    <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-6 py-4 text-sm font-semibold text-slate-700">{label}</td>
        <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">{pct.toFixed(2)} %</td>
        <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">{kg.toFixed(2)}</td>
        <td className="px-6 py-4 text-sm font-bold text-slate-600 text-right">{meters}</td>
    </tr>
);
