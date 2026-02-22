
import { jsPDF } from 'jspdf';
import { getBudgetForDate } from './BudgetService';

interface ReportData {
    currentMetrics: {
        rendimento: number;
        gas: number;
        energia: number;
        producao: number;
    };
    forecastMetrics: {
        rendimento: number;
        gas: number;
        energia: number;
        producao: number;
    };
    goals: {
        rendimento: number;
        gas: number;
        energia: number;
        producao: number;
    };
    manualAcum: {
        rendimento: number;
        gas: number;
        energia: number;
        producao: number;
    };
    corteDate?: string;
}

export const generateSmartPDFReport = (data: ReportData) => {
    console.log("📄 [PDF] Iniciando geração do relatório...", data);

    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let cursorY = 25;

        // Função auxiliar para formatação segura
        const formatDecimal = (val: any) => {
            const num = parseFloat(val);
            if (isNaN(num)) return "0,00";
            return num.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };

        // Cores do Design System Corporativo
        const COLORS = {
            primary: [15, 23, 42],     // Slate 900 (Deep Navy)
            secondary: [79, 70, 229],   // Indigo 600 (Accent)
            danger: [220, 38, 38],      // Red 600
            success: [22, 163, 74],     // Green 600
            textMain: [30, 41, 59],     // Slate 800
            textLight: [100, 116, 139],  // Slate 500
            bgGray: [248, 250, 252],    // Slate 50
            border: [226, 232, 240]     // Slate 200
        };

        // Buscar orçamento do mês baseado na data de corte
        const budget = data.corteDate ? getBudgetForDate(data.corteDate) : null;
        let formattedCorteDate = "";
        try {
            formattedCorteDate = data.corteDate ? new Date(data.corteDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Mês Atual';
        } catch (e) {
            formattedCorteDate = "Data Inválida";
        }

        // --- BARRA LATERAL DE DESTAQUE (DESIGN MODERNO) ---
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(10, 15, 2, 35, 'F');

        // --- CABEÇALHO ---
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.text("Relatório de Performance Industrial", margin, cursorY);

        cursorY += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
        doc.text("Predictor PRO | Inteligência Operacional", margin, cursorY);

        cursorY += 12;
        doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
        doc.line(margin, cursorY, pageWidth - margin, cursorY);

        cursorY += 15;

        // --- INFOS DO RELATÓRIO ---
        doc.setFillColor(COLORS.bgGray[0], COLORS.bgGray[1], COLORS.bgGray[2]);
        doc.rect(margin, cursorY, pageWidth - (margin * 2), 22, 'F');

        doc.setFontSize(9);
        doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        doc.setFont('helvetica', 'normal');
        doc.text(`DATA DE GERAÇÃO:`, margin + 5, cursorY + 7);
        doc.text(`DATA DE REFERÊNCIA:`, margin + 110, cursorY + 7);

        doc.setFontSize(11);
        doc.setTextColor(COLORS.textMain[0], COLORS.textMain[1], COLORS.textMain[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(`${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin + 5, cursorY + 14);
        doc.text(formattedCorteDate || "Mês Atual", margin + 110, cursorY + 14);

        cursorY += 35;

        // --- 1. RESUMO EXECUTIVO ---
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.text("1. Resumo de Indicadores Chave (KPIs)", margin, cursorY);
        cursorY += 8;

        const colWidth = (pageWidth - (margin * 2)) / 5;
        const metrics = [
            {
                name: 'Produção (t)',
                real: data.currentMetrics.producao,
                manual: data.manualAcum.producao,
                goal: data.goals.producao,
                forecast: data.forecastMetrics.producao,
                budget: budget?.producao || 0,
                isMin: true
            },
            {
                name: 'Rendimento (%)',
                real: data.currentMetrics.rendimento,
                manual: data.manualAcum.rendimento,
                goal: data.goals.rendimento,
                forecast: data.forecastMetrics.rendimento,
                budget: budget?.rendimento || 0,
                isMin: true
            },
            {
                name: 'Gás (m³/t)',
                real: data.currentMetrics.gas,
                manual: data.manualAcum.gas,
                goal: data.goals.gas,
                forecast: data.forecastMetrics.gas,
                budget: budget?.gas || 0,
                isMin: false
            },
            {
                name: 'Energia (kWh/t)',
                real: data.currentMetrics.energia,
                manual: data.manualAcum.energia,
                goal: data.goals.energia,
                forecast: data.forecastMetrics.energia,
                budget: budget?.energia || 0,
                isMin: false
            },
        ];

        // Cabeçalho da Tabela - Estilo Dark Premium
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(margin, cursorY, pageWidth - (margin * 2), 12, 'F');

        doc.setFontSize(10);
        doc.setTextColor(255);
        doc.setFont('helvetica', 'bold');
        doc.text("Indicador", margin + 5, cursorY + 8);
        doc.text("Realizado", margin + colWidth + 2, cursorY + 8);
        doc.text("Meta (PCP)", margin + (colWidth * 2) + 2, cursorY + 8);
        doc.text("Prev. Fechamento", margin + (colWidth * 3) + 2, cursorY + 8);
        doc.text("Orçamento", margin + (colWidth * 4) + 2, cursorY + 8);

        cursorY += 12;

        // Linhas da Tabela
        metrics.forEach((m, i) => {
            // Fundo Alternado Sutil
            if (i % 2 !== 0) {
                doc.setFillColor(COLORS.bgGray[0], COLORS.bgGray[1], COLORS.bgGray[2]);
                doc.rect(margin, cursorY, pageWidth - (margin * 2), 14, 'F');
            }

            // Linha inferior para cada célula para dar estrutura
            doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
            doc.line(margin, cursorY + 14, pageWidth - margin, cursorY + 14);

            doc.setFontSize(10);
            doc.setTextColor(COLORS.textMain[0], COLORS.textMain[1], COLORS.textMain[2]);
            doc.setFont('helvetica', 'bold');
            doc.text(m.name, margin + 5, cursorY + 9);

            const isYield = m.name.toLowerCase().includes('rendimento');
            const isGas = m.name.toLowerCase().includes('gás');
            const isEnergy = m.name.toLowerCase().includes('energia');
            const isProducao = m.name.toLowerCase().includes('produção');

            // Lógica de exibição e cálculo
            let displayRealValue = m.manual;
            let displayPlanoCorteValue = m.goal; // Usar a meta oficial para consistência com os cards
            let displayForecastValue = isYield ? (data.forecastMetrics.rendimento > 0 ? data.forecastMetrics.rendimento : m.manual) : (m.manual + m.forecast);

            // Se for Gás ou Energia, converter para específico (Valor / Produção)
            if ((isGas || isEnergy)) {
                if (data.manualAcum.producao > 0) {
                    displayRealValue = m.manual / data.manualAcum.producao;
                }

                // Converter Meta (PCP) para valor específico se for Gás ou Energia
                if (data.goals.producao > 0) {
                    displayPlanoCorteValue = m.goal / data.goals.producao;
                }

                const totalProduction = data.manualAcum.producao + data.forecastMetrics.producao;
                if (totalProduction > 0) {
                    displayForecastValue = (m.manual + m.forecast) / totalProduction;
                }
            }

            // Valor Realizado
            doc.setFont('helvetica', 'normal');
            doc.text(displayRealValue > 0 ? formatDecimal(displayRealValue) : "0,00", margin + colWidth + 2, cursorY + 9);

            // Meta (PCP)
            doc.text(displayPlanoCorteValue > 0 ? formatDecimal(displayPlanoCorteValue) : "0,00", margin + (colWidth * 2) + 2, cursorY + 9);

            // Previsão de Fechamento com Alerta
            const isBad = m.isMin ? displayForecastValue < m.goal : displayForecastValue > m.goal;
            const statusColor = isBad ? COLORS.danger : COLORS.success;

            doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.text(formatDecimal(displayForecastValue), margin + (colWidth * 3) + 2, cursorY + 9);

            // Orçamento
            doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
            doc.setFont('helvetica', 'normal');
            doc.text(m.budget > 0 ? formatDecimal(m.budget) : "0,00", margin + (colWidth * 4) + 2, cursorY + 9);

            cursorY += 14;
        });

        // --- 2. DESTAQUE VISUAL (CARDS) ---
        cursorY += 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.text("2. Visão Executiva de Performance", margin, cursorY);
        cursorY += 10;

        const cardWidth = (pageWidth - (margin * 2) - 15) / 4;
        const cardHeight = 65;
        const cardMargin = 5;

        const cardColors = {
            producao: [59, 130, 246], // Blue
            gas: [249, 115, 22],      // Orange
            energia: [245, 158, 11],  // Amber
            rendimento: [16, 185, 129] // Emerald
        };

        const drawCard = (x: number, y: number, title: string, color: number[], dataObj: any) => {
            // Shadow/Border principal
            doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
            doc.setLineWidth(0.1);
            doc.setFillColor(255, 255, 255);
            // Retângulo arredondado (x, y, w, h, rx, ry)
            doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'FD');

            // Barra superior colorida
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(x, y, cardWidth, 2, 'F');

            // Título
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(COLORS.textMain[0], COLORS.textMain[1], COLORS.textMain[2]);
            doc.text(title.toUpperCase(), x + 5, y + 10);

            // Subtítulo "ACUMULADO REAL"
            doc.setFontSize(6);
            doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
            doc.text("ACUMULADO REAL", x + 5, y + 18);

            // Valor Principal - AJUSTE DINÂMICO DE FONTE
            const mainVal = dataObj.mainValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            let mainFontSize = 15;
            if (mainVal.length > 10) mainFontSize = 12;
            if (mainVal.length > 13) mainFontSize = 10;

            doc.setFontSize(mainFontSize);
            doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
            doc.setFont('helvetica', 'bold');
            doc.text(mainVal, x + 5, y + 28);

            // Unidade - POSICIONAMENTO DINÂMICO
            const mainValWidth = doc.getTextWidth(mainVal);
            doc.setFontSize(7);
            doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
            doc.text(dataObj.unit, x + 5 + mainValWidth + 2, y + 28);

            // Grid Inferior (Meta e Previsão)
            doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
            doc.line(x + 5, y + 35, x + cardWidth - 5, y + 35);

            // Labels Meta/Prev
            doc.setFontSize(5.5);
            doc.text("META (PCP)", x + 5, y + 42);
            doc.text("PREV. FECHAMENTO", x + cardWidth / 2 + 1, y + 42);

            // Valores Meta/Prev - AJUSTE DE FONTE
            let finalGoal = dataObj.goalValue;
            let goalUnitStr = "";

            // Segurança: Se a meta vier como volume total (> 500) converter para específico
            const upperTitle = title.toUpperCase();
            if (upperTitle.includes('GÁS') || upperTitle.includes('ENERGIA') || upperTitle.includes('GAS')) {
                if (finalGoal > 500) {
                    const producaoTarget = dataObj.targetProd || 14157;
                    finalGoal = finalGoal / producaoTarget;
                }
                goalUnitStr = upperTitle.includes('GÁS') || upperTitle.includes('GAS') ? " m³/t" : " kWh/t";
            }

            const goalStr = finalGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + goalUnitStr;
            const forecastStr = dataObj.forecastValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            let subFontSize = 8;
            if (goalStr.length > 8 || forecastStr.length > 8) subFontSize = 7;
            if (goalStr.length > 10 || forecastStr.length > 10) subFontSize = 6;

            doc.setFontSize(subFontSize);
            doc.setFont('helvetica', 'bold');

            // Meta em verde
            doc.setTextColor(COLORS.success[0], COLORS.success[1], COLORS.success[2]);
            doc.text(goalStr, x + 5, y + 48);

            // Previsão em azul/indigo
            doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
            doc.text(forecastStr, x + cardWidth / 2 + 1, y + 48);

            // Rodapé do Card (Valores Específicos)
            if (dataObj.hasSpec) {
                doc.setFontSize(5);
                doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
                doc.setFont('helvetica', 'normal');

                doc.text("REAL", x + 5, y + 56);
                doc.text("META", x + cardWidth / 2 - 5, y + 56);
                doc.text("PREVISAL", x + cardWidth - 12, y + 56);

                const rSpec = dataObj.realSpec.toFixed(2);
                const gSpec = dataObj.goalSpec.toFixed(2);
                const fSpec = dataObj.forecastSpec.toFixed(2);

                let specFontSize = 7;
                if (rSpec.length > 6 || gSpec.length > 6 || fSpec.length > 6) specFontSize = 6;

                doc.setFontSize(specFontSize);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(COLORS.textMain[0], COLORS.textMain[1], COLORS.textMain[2]);
                doc.text(rSpec, x + 5, y + 61);
                doc.text(gSpec, x + cardWidth / 2 - 5, y + 61);
                doc.text(fSpec, x + cardWidth - 12, y + 61);
            }
        };

        // Preparar dados para os cards
        const totalProdForecast = data.manualAcum.producao + data.forecastMetrics.producao;

        // --- LINHA ÚNICA (4 CARDS) ---
        // Card Produção
        drawCard(margin, cursorY, "Produção", cardColors.producao, {
            mainValue: data.manualAcum.producao,
            unit: "t",
            goalValue: data.goals.producao,
            forecastValue: totalProdForecast,
            hasSpec: false
        });

        // Card Gás
        const gasRealSpec = data.manualAcum.producao > 0 ? data.manualAcum.gas / data.manualAcum.producao : 0;
        const gasForecastSpec = totalProdForecast > 0 ? (data.manualAcum.gas + data.forecastMetrics.gas) / totalProdForecast : 0;
        drawCard(margin + cardWidth + 5, cursorY, "Gás Natural", cardColors.gas, {
            mainValue: gasRealSpec, // Valor principal agora é o específico
            unit: "m³/t",
            goalValue: data.goals.gas,
            forecastValue: gasForecastSpec,
            targetProd: data.goals.producao, // Adicionado para cálculo de segurança
            hasSpec: false
        });

        // Card Energia
        const eeRealSpec = data.manualAcum.producao > 0 ? data.manualAcum.energia / data.manualAcum.producao : 0;
        const eeForecastSpec = totalProdForecast > 0 ? (data.manualAcum.energia + data.forecastMetrics.energia) / totalProdForecast : 0;
        drawCard(margin + (cardWidth + 5) * 2, cursorY, "Energia (EE)", cardColors.energia, {
            mainValue: eeRealSpec, // Valor principal agora é o específico
            unit: "kWh/t",
            goalValue: data.goals.energia,
            forecastValue: eeForecastSpec,
            targetProd: data.goals.producao, // Adicionado para cálculo de segurança
            hasSpec: false
        });

        // Card Rendimento
        drawCard(margin + (cardWidth + 5) * 3, cursorY, "Rendimento", cardColors.rendimento, {
            mainValue: data.manualAcum.rendimento,
            unit: "%",
            goalValue: data.goals.rendimento,
            forecastValue: data.forecastMetrics.rendimento > 0 ? data.forecastMetrics.rendimento : data.manualAcum.rendimento,
            hasSpec: false
        });


        // --- NOTA DE RODAPÉ E PÁGINA ---
        cursorY += cardHeight + 15;
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        doc.setFont('helvetica', 'italic');
        doc.text("* Valores destacados em vermelho indicam desvio em relação à meta planejada.", margin, cursorY);

        // Rodapé de segurança
        doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        doc.text("Industrial Predictor Pro - Documento Reservado", margin, pageHeight - 10);
        doc.text(`Página 1 de 1`, pageWidth - margin - 15, pageHeight - 10);

        // Salvar o Arquivo
        const pdfFileName = formattedCorteDate ? `Report_Performance_${formattedCorteDate.replace(/\//g, '-')}` : `Report_Performance_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`;
        doc.save(`${pdfFileName}.pdf`);
        console.log("✅ [PDF] Relatório gerado com sucesso!");
    } catch (err) {
        console.error("❌ [PDF] Erro fatal ao gerar o relatório:", err);
        alert("Erro ao gerar PDF: " + (err instanceof Error ? err.message : String(err)));
    }
};

