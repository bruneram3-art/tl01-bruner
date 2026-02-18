
import jsPDF from 'jspdf';
import { LayoutDashboard, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

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
}

export const generateSmartPDFReport = (data: ReportData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let cursorY = 20;

    // --- CABEÇALHO ---

    // Título Principal
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 37, 36); // Slate 800
    doc.text("Relatório de Performance Industrial", margin, cursorY);

    cursorY += 10;
    doc.setFontSize(12);
    doc.setTextColor(100); // Gray
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, cursorY);

    cursorY += 15;
    doc.setDrawColor(200);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 15;

    // --- 1. RESUMO EXECUTIVO (TABELA) ---

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text("1. Resumo Executivo (Real vs Meta vs Previsão)", margin, cursorY);
    cursorY += 10;

    const colWidth = (pageWidth - (margin * 2)) / 4;
    const metrics = [
        { name: 'Produção (t)', real: data.currentMetrics.producao, goal: data.goals.producao, forecast: data.forecastMetrics.producao, isMin: true },
        { name: 'Rendimento (%)', real: data.currentMetrics.rendimento, goal: data.goals.rendimento, forecast: data.forecastMetrics.rendimento, isMin: true },
        { name: 'Gás (m³/t)', real: data.currentMetrics.gas, goal: data.goals.gas, forecast: data.forecastMetrics.gas, isMin: false },
        { name: 'Energia (kWh/t)', real: data.currentMetrics.energia, goal: data.goals.energia, forecast: data.forecastMetrics.energia, isMin: false },
    ];

    // Table Header
    doc.setFontSize(10);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, cursorY, pageWidth - (margin * 2), 10, 'F');
    doc.text("Métrica", margin + 5, cursorY + 7);
    doc.text("Realizado", margin + colWidth + 5, cursorY + 7);
    doc.text("Meta", margin + (colWidth * 2) + 5, cursorY + 7);
    doc.text("Previsão Fechamento", margin + (colWidth * 3) + 5, cursorY + 7);
    cursorY += 10;

    // Table Rows
    metrics.forEach((m, i) => {
        // Zebra striping
        if (i % 2 === 0) {
            doc.setFillColor(252, 252, 252);
            doc.rect(margin, cursorY, pageWidth - (margin * 2), 10, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.text(m.name, margin + 5, cursorY + 7);

        doc.setFont('helvetica', 'normal');
        doc.text(m.real.toFixed(1), margin + colWidth + 5, cursorY + 7);
        doc.text(m.goal.toFixed(1), margin + (colWidth * 2) + 5, cursorY + 7);

        // Forecast Color Logic
        const isBad = m.isMin ? m.forecast < m.goal : m.forecast > m.goal;
        doc.setTextColor(isBad ? 220 : 0, isBad ? 20 : 100, isBad ? 60 : 0); // Red if bad
        doc.setFont('helvetica', 'bold');
        doc.text(m.forecast.toFixed(1), margin + (colWidth * 3) + 5, cursorY + 7);

        doc.setTextColor(0); // Reset
        cursorY += 10;
    });

    cursorY += 15;

    // --- 2. ANÁLISE DE DESVIOS E PLANO DE AÇÃO ---

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("2. Pontos de Atenção e Plano de Recuperação", margin, cursorY);
    cursorY += 10;

    let hasAlerts = false;

    metrics.forEach(m => {
        const isBad = m.isMin ? m.forecast < m.goal : m.forecast > m.goal;

        if (isBad) {
            hasAlerts = true;

            // Calcular desvio
            const diff = Math.abs(m.forecast - m.goal);
            const diffPercent = (diff / m.goal) * 100;

            // Calcular sugestão
            // Ex: Se Gás está 105 e meta é 100, diff é 5.
            // O plano é recuperar esse gap. O texto é sugestivo.
            let suggestion = "";
            if (m.name.includes("Gás")) {
                suggestion = `Reduzir consumo imediato para compensar o desvio de ${diff.toFixed(1)} m³/t.`;
            } else if (m.name.includes("Energia")) {
                suggestion = `Otimizar sequenciamento para economizar ${diff.toFixed(1)} kWh/t no acumulado.`;
            } else if (m.name.includes("Produção")) {
                suggestion = `Aumentar ritmo médio operacional em ${diffPercent.toFixed(1)}% para recuperar a meta.`;
            } else {
                suggestion = `Revisar parâmetros de processo para ajustar desvio de ${diffPercent.toFixed(1)}%.`;
            }

            // Renderizar Bloco de Alerta
            doc.setFillColor(255, 240, 240); // Light Red Background
            doc.rect(margin, cursorY, pageWidth - (margin * 2), 25, 'F');
            doc.setDrawColor(255, 200, 200);
            doc.rect(margin, cursorY, pageWidth - (margin * 2), 25, 'S');

            // Ícone/Texto de Alerta
            doc.setTextColor(200, 0, 0);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`⚠ ALERTA CRÍTICO: ${m.name}`, margin + 5, cursorY + 8);

            // Detalhe do Desvio
            doc.setTextColor(60, 60, 60);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Previsão de fechamento com desvio de ${diffPercent.toFixed(1)}% em relação à meta.`, margin + 5, cursorY + 14);

            // Plano de Ação
            doc.setTextColor(0, 100, 0); // Green
            doc.setFont('helvetica', 'bold');
            doc.text(`SUGESTÃO: ${suggestion}`, margin + 5, cursorY + 20);

            cursorY += 30;
        }
    });

    if (!hasAlerts) {
        doc.setFillColor(240, 255, 240); // Light Green
        doc.rect(margin, cursorY, pageWidth - (margin * 2), 20, 'F');
        doc.setTextColor(0, 150, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text("✅ Nenhuma tendência crítica identificada. Operação dentro das metas.", margin + 5, cursorY + 12);
        cursorY += 30;
    }

    // --- 3. OBSERVAÇÕES DO GESTOR ---

    if (cursorY > pageHeight - 60) {
        doc.addPage();
        cursorY = 20;
    }

    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("3. Observações e Encaminhamentos", margin, cursorY);
    cursorY += 15;

    // Linhas para escrever
    doc.setDrawColor(200);
    doc.line(margin, cursorY, pageWidth - margin, cursorY); cursorY += 10;
    doc.line(margin, cursorY, pageWidth - margin, cursorY); cursorY += 10;
    doc.line(margin, cursorY, pageWidth - margin, cursorY); cursorY += 10;

    // Rodapé
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Industrial Predictor Pro - Relatório Confidencial", margin, pageHeight - 10);

    // Download
    doc.save(`Relatorio_Performance_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
};
