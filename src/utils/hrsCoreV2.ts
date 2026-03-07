import { PassData, ProcessData, PassType, TrainType } from './hrsTypes';
import { calculateEngineeredChannel } from './hrsGeometry';

/**
 * HRS Core v2.0 - Motor de Cálculo Metalúrgico
 * Baseado em princípios clássicos de conformação mecânica.
 */

export interface GeometryV2 {
    area: number;
    perimeter: number;
    width: number;
    height: number;
}

// Cálculos físicos teóricos espúrios (Wusatowski, Ekelund, Mola) foram removidos
// para garantir que o simulador reflete 100% da realidade do manual de calibração (PDF).

export interface GeometryV2 {
    area: number;
    perimeter: number;
    width: number;
    height: number;
}

export function calculateBarGeometryV2(
    type: PassType,
    w: number,
    h: number,
    radius: number = 0
): GeometryV2 {
    let area = 0;
    let perimeter = 0;

    switch (type) {
        case 'round': {
            const r = Math.min(w, h) / 2;
            area = Math.PI * r * r;
            perimeter = 2 * Math.PI * r;
            break;
        }
        case 'oval':
        case 'swedish_oval':
        case 'edge_oval': {
            const a = w / 2;
            const b = h / 2;
            area = Math.PI * a * b;
            const hTerm = Math.pow(a - b, 2) / Math.pow(a + b, 2);
            perimeter = Math.PI * (a + b) * (1 + (3 * hTerm) / (10 + Math.sqrt(4 - 3 * hTerm)));
            break;
        }
        case 'box':
        case 'square':
        case 'flat':
        default: {
            const r = Math.min(radius, w / 2, h / 2);
            area = (w * h) - (4 * r * r) + (Math.PI * r * r);
            perimeter = 2 * (w + h) - (8 * r) + (2 * Math.PI * r);
            break;
        }
        case 'diamond': {
            area = (w * h) / 2;
            perimeter = 2 * Math.sqrt(w * w + h * h);
            break;
        }
    }

    return { area, perimeter, width: w, height: h };
}


/**
 * FUNÇÃO MESTRA: Recalcula um passe completo usando lógica v2.0 (Determinística)
 * Regra Ouro: Sem tentativa de "adivinhar" física. Se o PDF de calibração mandou 
 * Largura X e Altura Y com Luz Z, desenhamos e calculamos ESTRITAMENTE isso.
 */
export function recalculatePassV2(
    data: PassData,
    prevArea: number,
    inputWidth: number,
    inputHeight: number,
    process: ProcessData,
    passNumber: number,
    trainType: TrainType,
    gearRatio: number
): PassData {
    // 1. DADOS ESTÁTICOS / IMPORTADOS (SEM PREDIÇÃO ACADÊMICA)
    const currentLuz = data.importedLuzSemCarga ?? data.luz;

    // Se veio do PDF (importedLargura), essa é a lei. Senão tenta usar a digitada.
    const finalExitW = data.importedLargura ?? data.exitBarWidth ?? inputWidth;

    // Altura final = Altura do projeto (importedAltura) ou a própria Luz
    const finalExitH = data.importedAltura ?? data.exitBarHeight ?? currentLuz ?? inputHeight;

    // 2. CANAL (ENGINEERING GEOMETRY - APENAS P/ DESENHO E ÁREA TEÓRICA)
    const { toolW, toolH } = calculateEngineeredChannel(data.channelType, finalExitW, finalExitH, 1.0);
    const channelGeom = calculateBarGeometryV2(data.channelType, toolW, toolH, data.radiusConcordance);

    // 3. RESULTADOS FINAIS (Constância de Massa/Volume baseada nos dados REAIS da planta)
    const entryGeom = calculateBarGeometryV2('box', inputWidth, inputHeight);
    const exitGeom = calculateBarGeometryV2(data.channelType, finalExitW, finalExitH, data.radiusConcordance);

    let elongation = 1.0;
    let reduction = 0.0;
    if (entryGeom.area > 0 && exitGeom.area > 0 && entryGeom.area > exitGeom.area) {
        elongation = entryGeom.area / exitGeom.area;
        reduction = (1 - (1 / elongation)) * 100;
    }

    // Validação FR (se houver importedFr na planilha)
    let frWarning: string | null = null;
    let frDelta = 0;
    if (data.importedFr) {
        frDelta = reduction - data.importedFr;
        if (Math.abs(frDelta) > 2.5) {
            frWarning = `Desvio FR: ${frDelta.toFixed(1)}% vs Plano`;
        }
    }

    return {
        ...data,
        luz: currentLuz, // Força amarração à luz do plano
        entryBarWidth: inputWidth,
        entryBarHeight: inputHeight,
        exitBarWidth: exitGeom.width,
        exitBarHeight: exitGeom.height,
        entryArea: entryGeom.area,
        exitArea: exitGeom.area,
        reduction: reduction,
        elongation: elongation,
        rollingForce: 0, // Falsa física removida
        luzSobCarga: currentLuz, // Falso ajuste de mola removido
        channelArea: channelGeom.area || 1, // Previne divisão por zero
        channelWidth: toolW,
        barOccupiedArea: exitGeom.area,
        loadFactor: 0, // Falsa carga removida
        frValidationDelta: frDelta,
        frValidationWarning: frWarning,
        perimeter: exitGeom.area > 0 ? exitGeom.perimeter : 0,
    };
}
