
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Gera um relatório PDF a partir de um elemento HTML.
 * @param elementId ID do elemento HTML a ser capturado.
 * @param title Título do relatório.
 */
export const generatePDFReport = async (elementId: string, title: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.error(`Elemento com ID ${elementId} não encontrado.`);
      alert("Erro ao gerar PDF: Elemento não encontrado.");
      return;
    }

    // Feedback visual
    const originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'wait';

    // Captura o elemento como canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Melhor resolução
      useCORS: true, // Permitir imagens externas se houver
      logging: false,
      backgroundColor: '#ffffff' // Fundo branco
    });

    const imgData = canvas.toDataURL('image/png');

    // Cria o PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 297; // Largura A4 paisagem
    const pageHeight = 210; // Altura A4 paisagem
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    // Adiciona a primeira página
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Se o conteúdo for maior que uma página, adiciona mais páginas
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Adiciona rodapé/cabeçalho extra se necessário (opcional)
    const date = new Date().toLocaleDateString('pt-BR');
    pdf.setFontSize(10);
    pdf.setTextColor(150);
    pdf.text(`Relatório Gerado em: ${date}`, 10, pageHeight - 10);
    pdf.text("Industrial Predictor Pro", imgWidth - 50, pageHeight - 10);

    // Salva o arquivo
    pdf.save(`${title.replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`);

    // Restaura cursor
    document.body.style.cursor = originalCursor;

  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Ocorreu um erro ao gerar o relatório PDF. Verifique o console para mais detalhes.");
    document.body.style.cursor = 'default';
  }
};
