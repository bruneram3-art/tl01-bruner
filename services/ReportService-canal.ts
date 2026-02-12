import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDFReport = async (elementId: string, title: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Elemento não encontrado:', elementId);
        return;
    }

    try {
        // 1. Captura o canvas em alta resolução
        const canvas = await html2canvas(element, {
            scale: 2, // Melhora a qualidade (Retina)
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // 2. Calcula dimensões para A4
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        // 3. Adiciona Cabeçalho Profissional
        pdf.setFillColor(30, 41, 59); // Slate-800
        pdf.rect(0, 0, pdfWidth, 20, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('INDUSTRIAL PREDICTOR PRO', 10, 12);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Relatório Executivo: ${title}`, pdfWidth - 10, 12, { align: 'right' });

        // 4. Adiciona a imagem do Dashboard
        // Se a imagem for maior que uma página, precisaríamos de lógica multi-página.
        // Por enquanto, assumimos que cabe ou escalamos.
        let heightLeft = imgHeight;
        let position = 25; // Margem superior

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);

        // 5. Rodapé
        const date = new Date().toLocaleString('pt-BR');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139); // Slate-500
        pdf.text(`Gerado em: ${date} • Confidencial`, 10, pdfHeight - 5);
        pdf.text('Página 1 de 1', pdfWidth - 10, pdfHeight - 5, { align: 'right' });

        // 6. Salva
        pdf.save(`Relatorio_PCP_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF. Verifique o console.');
    }
};
