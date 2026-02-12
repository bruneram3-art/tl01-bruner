import { GoogleGenAI, Type } from "@google/genai";
import { PCPData, MetaData, ForecastResult } from "../types";

// Parser atualizado
const parseRowDate = (dateStr: string): Date | null => {
    try {
        if (!dateStr || dateStr === 'N/A' || dateStr === '-') return null;
        const cleanStr = dateStr.replace(/,/g, '').trim().split(' ')[0];
        const parts = cleanStr.split('/');
        if (parts.length !== 3) return null;
        
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; 
        const yearPart = parseInt(parts[2]);
        let year = yearPart;
        if (yearPart < 100) year = yearPart > 50 ? 1900 + yearPart : 2000 + yearPart;

        return new Date(year, month, day);
    } catch {
        return null;
    }
};

const getBoundsFromFilename = (filename: string) => {
    if (!filename) return null;
    const lower = filename.toLowerCase();
    
    const months = [
        { name: 'janeiro', index: 0 }, { name: 'fevereiro', index: 1 }, 
        { name: 'março', index: 2 }, { name: 'marco', index: 2 }, 
        { name: 'abril', index: 3 }, { name: 'maio', index: 4 }, 
        { name: 'junho', index: 5 }, { name: 'julho', index: 6 }, 
        { name: 'agosto', index: 7 }, { name: 'setembro', index: 8 }, 
        { name: 'outubro', index: 9 }, { name: 'novembro', index: 10 }, 
        { name: 'dezembro', index: 11 }
    ];

    const foundMonth = months.find(m => lower.includes(m.name));
    if (!foundMonth) return null;

    const yearMatch = lower.match(/20[2-9][0-9]/);
    const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

    const startDate = new Date(year, foundMonth.index, 1, 0, 0, 0);
    const endDate = new Date(year, foundMonth.index + 1, 0, 23, 59, 59);

    return {
        startDate,
        endDate,
        startStr: startDate.toLocaleString('pt-BR'),
        endStr: endDate.toLocaleString('pt-BR'),
        monthName: startDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    };
};

const getMonthBoundsFromData = (dateStr: string) => {
    const date = parseRowDate(dateStr);
    if (!date) return null;
    const year = date.getFullYear();
    if (year < 2020 || year > 2030) return null;
    const startDate = new Date(year, date.getMonth(), 1, 0, 0, 0);
    const endDate = new Date(year, date.getMonth() + 1, 0, 23, 59, 59);
    return {
        startDate,
        endDate,
        startStr: startDate.toLocaleString('pt-BR'),
        endStr: endDate.toLocaleString('pt-BR'),
        monthName: startDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    };
};

export const getIndustrialForecast = async (
  pcpData: any[],
  metaData: MetaData[],
  filename: string = "",
  calculatedTotals?: { totalGasCalculado: number; totalEnergiaCalculada: number; totalProducao: number }
): Promise<ForecastResult[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-pro-preview";
  
  let bounds = getBoundsFromFilename(filename);
  if (!bounds) {
      for (const record of pcpData) {
          bounds = getMonthBoundsFromData(record.data);
          if (bounds) break;
      }
  }

  // Filtragem
  let filteredData = pcpData;
  if (bounds) {
      filteredData = pcpData.filter(row => {
          const rowDate = parseRowDate(row.data);
          if (!rowDate) return true; 
          if (rowDate.getFullYear() < bounds.startDate.getFullYear()) return true;
          if (rowDate.getFullYear() === bounds.startDate.getFullYear() && rowDate.getMonth() < bounds.startDate.getMonth()) return true;
          if (rowDate.getTime() <= bounds.endDate.getTime()) return true;
          return false;
      });
  }

  // Instrução focada na distribuição dos valores já calculados
  const systemInstruction = `
    Você é um Engenheiro de PCP Sênior.
    
    CONTEXTO:
    Já calculamos matematicamente o consumo TOTAL absoluto previsto para este período com base no mix de produtos (SAP).
    
    TOTAIS MANDATÓRIOS (Não recalcule a soma total, apenas distribua):
    - Produção Total: ${calculatedTotals?.totalProducao?.toFixed(2) || 'N/A'} t
    - Gás Natural TOTAL: ${calculatedTotals?.totalGasCalculado?.toFixed(0) || 'N/A'} m³
    - Energia Elétrica TOTAL: ${calculatedTotals?.totalEnergiaCalculada?.toFixed(0) || 'N/A'} kWh

    TAREFA:
    Gere um sequenciamento diário para o mês de ${bounds ? bounds.monthName : 'referência'}.
    Ao gerar as colunas 'gasPrevisto' e 'energiaPrevista' para cada dia, certifique-se de que a SOMA de todos os dias se aproxime dos Totais Mandatórios acima.
    
    Lógica de Distribuição:
    - Dias com maior produção devem ter maior consumo de Gás e Energia.
    - Se a produção for zero (parada), o consumo deve ser residual ou zero.

    VARIÁVEIS DE SAÍDA:
    1. Produção (t)
    2. Gás Natural (m³)
    3. Energia Elétrica (kWh)
    4. Produtividade (t/h)
    5. Utilização (%)
    6. Setup (min)

    Saída esperada: JSON puro (Array).
  `;

  const prompt = `
    DADOS DE PCP (Mix de Produtos e Datas): 
    ${JSON.stringify(filteredData.slice(0, 80))}
    
    INSTRUÇÃO:
    Distribua o consumo total de Gás (${calculatedTotals?.totalGasCalculado?.toFixed(0)} m³) e Energia (${calculatedTotals?.totalEnergiaCalculada?.toFixed(0)} kWh) proporcionalmente à produção diária planejada no JSON de saída.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            data: { type: Type.STRING, description: "Data DD/MM/YY" },
            producaoPrevista: { type: Type.NUMBER },
            gasPrevisto: { type: Type.NUMBER, description: "Proporcional à produção do dia" },
            energiaPrevista: { type: Type.NUMBER, description: "Proporcional à produção do dia" },
            produtividadePrevista: { type: Type.NUMBER },
            utilizacaoPrevista: { type: Type.NUMBER },
            setupPrevisto: { type: Type.NUMBER },
            insights: { type: Type.STRING }
          },
          required: ["data", "producaoPrevista", "gasPrevisto", "energiaPrevista", "produtividadePrevista", "utilizacaoPrevista", "setupPrevisto", "insights"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("IA retornou resposta vazia");
  return JSON.parse(text.trim());
};