import {
    PassData,
    PassType,
    TrainType,
    ProcessData,
    RawMaterial,
    PassConfig,
    MotorData
} from './hrsTypes';
import { recalculatePassV2 } from './hrsCoreV2';

// --- Constants ---
const STEEL_DENSITY = 0.00785; // g/mm³ -> kg/m / Area(mm²) ? Não, ajuste para densidade do aço
const THERMAL_EXPANSION_CARBON = 1.013; // Fator de dilatação térmica para aço carbono
const THERMAL_EXPANSION_COEFF = 0.000012; // Coeficiente linear aproximado

// Tabelas de referência (simplificadas)
const FT_DESBASTE = {
    '1_to_4': 0.20,
    'above_4': 0.15
};

const FA_VALUES = {
    'oval_round': 0.85,
    'box_box': 0.75,
    'flat': 0.80,
    'other': 0.85
};

// --- Geometric Calculations ---

/** Área de seção transversal por tipo de passe */
export const calcArea = (type: PassType, width: number, height: number): number => {
    switch (type) {
        case 'box':
        case 'flat':
        case 'square':
            return width * height * 0.98; // Fator de preenchimento típico
        case 'oval':
            return (Math.PI * width * height) / 4;
        case 'round':
            return (Math.PI * Math.pow((width + height) / 2, 2)) / 4;
        case 'diamond':
            return (width * height) / 2; // Losango
        case 'angle':
            // Aproximação para cantoneira (L) considerando espessura ~10% da largura/altura média
            // Área = (W*t + H*t - t^2)
            const t = Math.min(width, height) * 0.12; // Espessura estimada
            return (width * t) + (height * t) - (t * t);
        default:
            return width * height;
    }
};

/** Perímetro por tipo de passe */
export const calcPerimeter = (type: PassType, width: number, height: number): number => {
    switch (type) {
        case 'box':
        case 'flat':
        case 'square':
            return 2 * (width + height);
        case 'oval':
            // Aproximação de Ramanujan
            const a = width / 2;
            const b = height / 2;
            return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
        case 'round':
            return Math.PI * ((width + height) / 2);
        case 'diamond':
            return 2 * Math.sqrt(width * width + height * height);
        case 'angle':
            return 2 * (width + height); // Perímetro externo simplificado
        default:
            return 2 * (width + height);
    }
};

/** Largura do canal baseada no tipo de passe */
export const calcChannelWidth = (type: PassType, width: number): number => {
    switch (type) {
        case 'oval':
        case 'swedish_oval':
        case 'edge_oval':
            // Canal oval define a forma da barra — folga lateral mínima (~2%)
            return width * 1.02;
        case 'round':
            // Canal circular fecha completamente — sem folga lateral adicional
            return width * 1.01;
        case 'flat':
            // Mesa lisa: a barra se alarga livremente — canal efetivo muito mais largo
            return width * 1.20;
        case 'diamond':
            return width * 1.03;
        default:
            // Box / Square: folga lateral média de 5% sobre a largura da barra de saída
            return width * 1.05;
    }
};

/** Diâmetro no fundo da luz */
export function calculateDiameterBottomLuz(cylinderDiameter: number, luz: number, channelDepth: number): number {
    return cylinderDiameter - 2 * channelDepth;
}

/** Diâmetro de trabalho — Diâmetro do cilindro menos a profundidade do canal em ambos os lados.
 *  Para gaiola Hóriz: Dtrab = Dcil - 2 × channelDepth = Dcil - (Dcil - Luz) = Luz
 *  Portanto: Dtrab = Dcilin - (Dcilin - Luz) = Luz (para canal fechado - Box/Round)
 *  Na prática usa-se: Dtrab = Dcilin - luz_efetiva */
export function calculateWorkDiameter(cylinderDiameter: number, exitHeight: number, luz: number): number {
    // Usa a luz real em vez da altura da barra de saída (correto para canais com raio)
    const luzEfetiva = luz > 0 ? luz : exitHeight;
    return cylinderDiameter - luzEfetiva;
}

/** Diâmetro de projeto (inclui dilatação térmica) */
export function calculateProjectDiameter(workDiameter: number, thermalFactor: number): number {
    return workDiameter * thermalFactor;
}

/** Ângulo de contato */
export function calculateContactAngle(entryHeight: number, exitHeight: number, workDiameter: number): number {
    const deltaH = entryHeight - exitHeight;
    if (workDiameter <= 0 || deltaH <= 0) return 0;
    return Math.acos(1 - deltaH / workDiameter);
}

/** Coeficiente de atrito (simplificado) */
export function calculateFrictionCoeff(temperature: number): number {
    if (temperature > 1000) return 0.35;
    if (temperature > 800) return 0.40;
    return 0.45;
}

/** Velocidade no ponto neutro */
export function calculateNeutralPointSpeed(motorRotation: number, workDiameter: number, gearRatio: number): number {
    if (gearRatio <= 0) return 0;
    const cylinderRPM = motorRotation / gearRatio;
    return (Math.PI * workDiameter * cylinderRPM) / 60000; // mm/min -> m/s
}

/** Velocidade de saída baseada na conservação de volume */
export function calculateExitSpeed(entryArea: number, exitArea: number, entrySpeed: number): number {
    if (exitArea <= 0) return 0;
    return (entryArea / exitArea) * entrySpeed;
}

/** Elongação (alongamento) */
export function calculateElongation(entryArea: number, exitArea: number): number {
    if (exitArea <= 0) return 0;
    return entryArea / exitArea;
}

/** Alargamento (spread) */
export function calculateWidening(exitWidth: number, entryWidth: number): number {
    return exitWidth - entryWidth;
}

/** 
 * Spread empírico - modelo simplificado de Wusatowski.
 * Calcula a largura de saída da barra considerando o espalhamento lateral.
 * Δw = C × Δh^a × (D/h_mean)^b × (w/h)^c
 */
export function calculateSpreadWidth(
    entryWidth: number,
    entryHeight: number,
    exitHeight: number,
    rollDiameter: number,
    channelType: PassType
): number {
    const deltaH = entryHeight - exitHeight;
    if (deltaH <= 0 || rollDiameter <= 0) return entryWidth;

    const hMean = (entryHeight + exitHeight) / 2;
    if (hMean <= 0) return entryWidth;

    // Constantes empíricas (Wusatowski simplificado para aço C a quente)
    const C = 0.35;
    const a = 0.78;
    const b = 0.40;
    const c = -0.60;

    let spread = C
        * Math.pow(deltaH, a)
        * Math.pow(rollDiameter / hMean, b)
        * Math.pow(Math.max(entryWidth / entryHeight, 0.1), c);

    // Limitar spread por tipo de passe
    // Ovais e redondos têm contenção lateral → spread reduzido
    switch (channelType) {
        case 'round':
            spread *= 0.3; // Canal circular contém fortemente
            break;
        case 'oval':
        case 'swedish_oval':
        case 'edge_oval':
            spread *= 0.5; // Canal oval contém parcialmente
            break;
        case 'flat':
            spread *= 1.2; // Mesa lisa libera mais spread
            break;
        case 'diamond':
            spread *= 0.6;
            break;
        default:
            break; // box/square: spread padrão
    }

    return entryWidth + spread;
}

/** Coeficiente de deformação */
export function calculateDeformationCoeff(entryArea: number, exitArea: number): number {
    if (exitArea <= 0 || entryArea <= 0) return 0;
    return Math.log(entryArea / exitArea);
}

/** Redução percentual */
export function calculateReduction(entryArea: number, exitArea: number): number {
    if (entryArea <= 0) return 0;
    return ((entryArea - exitArea) / entryArea) * 100;
}

/** Razão rei médio / rei fundo canal */
export function calculateReiRatio(exitArea: number, channelArea: number): number {
    if (channelArea <= 0) return 0;
    return exitArea / channelArea;
}

/** Pressão máxima estimada (simplificada) */
export function calculateMaxPressure(frictionCoeff: number, deformCoeff: number, temperature: number): number {
    // Resistência base do aço a quente (MPa) - simplificado
    const baseResistance = temperature > 1000 ? 80 : temperature > 900 ? 100 : 120;
    return baseResistance * (1 + frictionCoeff) * (1 + deformCoeff * 0.5);
}

/** Força de laminação */
export function calculateRollingForce(
    maxPressure: number,
    contactLength: number,
    meanWidth: number
): number {
    return (maxPressure * contactLength * meanWidth) / 1e6; // N -> MN
}

/** Comprimento de contato (arco de contato) */
export function calculateContactLength(workDiameter: number, entryHeight: number, exitHeight: number): number {
    const deltaH = entryHeight - exitHeight;
    if (deltaH <= 0 || workDiameter <= 0) return 0;
    return Math.sqrt((workDiameter / 2) * deltaH);
}

/** Torque em vazio - Tabela por diâmetro do cilindro (doc 1_torque_em_vazio) */
export function calculateVacuumTorque(cylinderDiameter: number): number {
    // Tabela extraída do doc: diâmetro (mm) -> torque em vazio (kNm)
    if (cylinderDiameter <= 350) return 2.0;
    if (cylinderDiameter <= 400) return 3.0;
    if (cylinderDiameter <= 450) return 4.5;
    if (cylinderDiameter <= 500) return 6.0;
    if (cylinderDiameter <= 550) return 8.0;
    if (cylinderDiameter <= 600) return 10.0;
    if (cylinderDiameter <= 650) return 13.0;
    if (cylinderDiameter <= 700) return 16.0;
    if (cylinderDiameter <= 750) return 20.0;
    return 25.0;
}

/** Fator de carga para desbaste */
export function calculateLoadFactor(passNumber: number, trainType: TrainType): number {
    if (trainType === 'desbaste') {
        return passNumber <= 4 ? FT_DESBASTE['1_to_4'] : FT_DESBASTE['above_4'];
    }
    return 0.10; // Intermediário/acabador padrão
}

/** FA automático */
export function getDefaultFA(channelType: PassType): number {
    switch (channelType) {
        case 'oval': return FA_VALUES['oval_round'];
        case 'round': return FA_VALUES['oval_round'];
        case 'box': return FA_VALUES['box_box'];
        case 'flat': return FA_VALUES['flat'];
        default: return FA_VALUES['other'];
    }
}

/** Torque do motor */
export function calcMotorTorque(powerKW: number, rpmNominal: number): number {
    if (rpmNominal <= 0) return 0;
    return (powerKW * 9.5493) / rpmNominal; // kNm
}

/** Dilatação térmica linear — fórmula real: α = 1 + coeff × (T - 20) */
export function calculateThermalDilation(temperature: number, steelType: string): number {
    if (temperature <= 0) return THERMAL_EXPANSION_CARBON; // fallback sem temperatura
    const coeff = steelType === 'high_alloy' ? 11e-6 : 12e-6;
    return 1 + coeff * (temperature - 20);
}

/** Correção Luz Sem Carga → Luz sob Carga (LIC = LSC + F/K)
 *  F = força de laminação (MN), K = constante de mola da gaiola (MN/mm)
 *  A diferença LSC-LIC depende da deformação elástica da gaiola sob carga.
 */
export function calculateLuzSobCarga(
    luzSemCarga: number,
    rollingForce: number,
    springConstant: number
): number {
    if (springConstant <= 0 || rollingForce <= 0) return luzSemCarga;
    return luzSemCarga + (rollingForce / springConstant);
}

/** Diâmetro do canal acabador para vergalhão redondo (doc 6_diametro) */
export function calculateFinishDiameter(linearMassKgM: number): number {
    // Diâmetro = raiz(4 * kg/m nominal / (π * 0.00785)) * 1.013
    return Math.sqrt((4 * linearMassKgM) / (Math.PI * STEEL_DENSITY)) * THERMAL_EXPANSION_CARBON;
}

// --- Ângulo de agarre / ponto neutro ---

/** Ângulo de agarre máximo */
export function calculateGripAngle(frictionCoeff: number): number {
    return Math.atan(frictionCoeff);
}

/** Ponto neutro (rad) */
export function calculateNeutralPoint(contactAngle: number, frictionCoeff: number): number {
    if (frictionCoeff <= 0) return 0;
    return contactAngle / 2 - (contactAngle / (4 * frictionCoeff));
}

// --- Full Pass Recalculate ---

/** Cria um PassData com valores padrão */
export function createDefaultPass(id: string): PassData {
    return {
        id,
        channelType: 'box',
        luz: 0, luzProj: 0,
        radiusConcordance: 0,
        wideningFactor: 1.0,
        cylinderDiameter: 0,
        temperature: 0,
        motorRotation: 0,
        distanceNextPass: 0,
        timeNextPass: 0,
        // Barra
        entryBarWidth: 0, entryBarHeight: 0,
        exitBarWidth: 0, exitBarHeight: 0,
        // Deformação
        entryArea: 0, exitArea: 0, reduction: 0,
        entryLuz: 0, initialWidth: 0,
        elongation: 0, widening: 0,
        deformationCoeff: 0,
        barOccupiedArea: 0, channelArea: 0,
        channelWidth: 0,
        // Validação e Correções
        luzSobCarga: 0, frValidationDelta: 0, frValidationWarning: null,
        halfWidthHeight: 0, halfBarHeight: 0,
        // Parâmetros de Passe
        reiMedioOverReiFundo: 0,
        barWidthOverChannelWidth: 0,
        barWidthOverBarHeight: 0,
        // Geométricos
        diameterBottomLuz: 0, workDiameter: 0,
        projectDiameter: 0, careerDiameter: 0,
        contactAngle: 0, gearRatio: 1,
        cylinderRelation: 0, transmissionRatio: 0,
        neutralPointSpeed: 0, exitSpeed: 0,
        maxPressure: 0, perimeter: 0, thermalDilation: 0,
        // Diâmetro Efetivo
        effectiveAngle: 0, frictionCoeff: 0.4,
        effectiveContactAngle: 0, neutralPoint: 0,
        contactOverGripAngle: 0,
        // Esforço
        rollingForce: 0, vacuumTorque: 0, loadFactor: 0,
    };
}

/** Recalcula todos os campos derivados de um passe */
export function recalculatePass(
    pass: PassData,
    prevArea: number,
    prevWidth: number,
    prevHeight: number,
    process: ProcessData,
    passNumber: number,
    trainType: TrainType,
    gearRatioMotor: number,
    springConstant: number = 5
): PassData {
    const p = { ...pass };

    // Barra de entrada = saída do passe anterior
    p.entryBarWidth = prevWidth;
    p.entryBarHeight = prevHeight;

    // Área de entrada
    p.entryArea = prevArea;
    p.entryLuz = prevHeight;
    p.initialWidth = prevWidth;

    // Dilatação térmica
    p.thermalDilation = p.temperature > 0
        ? calculateThermalDilation(p.temperature, 'carbon')
        : THERMAL_EXPANSION_CARBON;

    // Dimensões de saída baseadas no canal e orientação
    const luzEfetiva = p.luzProj > 0 ? p.luzProj : p.luz;

    if (p.orientation === 'V') {
        // Em gaiola Vertical, a Luz (Gap) atua na LARGURA física da barra
        p.exitBarWidth = luzEfetiva;
        // Spread na direção vertical (height) quando gaiola é V
        p.exitBarHeight = calculateSpreadWidth(
            p.entryBarHeight, p.entryBarWidth, luzEfetiva,
            p.cylinderDiameter, p.channelType
        );
    } else {
        // Em gaiola Horizontal (padrão), a Luz atua na ALTURA física da barra
        p.exitBarHeight = luzEfetiva;
        // Spread empírico na largura
        p.exitBarWidth = calculateSpreadWidth(
            p.entryBarWidth, p.entryBarHeight, luzEfetiva,
            p.cylinderDiameter, p.channelType
        );
    }

    // Área de saída
    p.exitArea = calcArea(p.channelType, p.exitBarWidth, p.exitBarHeight);

    // Deformação
    p.reduction = calculateReduction(p.entryArea, p.exitArea);
    p.elongation = calculateElongation(p.entryArea, p.exitArea);
    p.widening = calculateWidening(p.exitBarWidth, p.entryBarWidth);
    p.deformationCoeff = calculateDeformationCoeff(p.entryArea, p.exitArea);

    // Canal
    p.channelWidth = calcChannelWidth(p.channelType, p.exitBarWidth);
    p.channelArea = calcArea(p.channelType, p.channelWidth, p.exitBarHeight + p.radiusConcordance * 2);
    p.barOccupiedArea = p.exitArea;
    p.halfWidthHeight = p.exitBarHeight / 2;
    p.halfBarHeight = p.exitBarHeight / 2;

    // Parâmetros de passe
    p.reiMedioOverReiFundo = calculateReiRatio(p.exitArea, p.channelArea);
    p.barWidthOverChannelWidth = p.channelWidth > 0 ? p.exitBarWidth / p.channelWidth : 0;
    p.barWidthOverBarHeight = p.exitBarHeight > 0 ? p.exitBarWidth / p.exitBarHeight : 0;

    // Geométricos
    const channelDepth = (p.cylinderDiameter - p.luz) / 2;
    p.diameterBottomLuz = calculateDiameterBottomLuz(p.cylinderDiameter, p.luz, channelDepth);
    p.workDiameter = calculateWorkDiameter(p.cylinderDiameter, p.exitBarHeight, p.luz);
    p.projectDiameter = calculateProjectDiameter(p.workDiameter, p.thermalDilation);
    p.careerDiameter = p.cylinderDiameter;

    // Ângulo de contato
    p.contactAngle = calculateContactAngle(p.entryBarHeight, p.exitBarHeight, p.workDiameter);

    // Relações
    p.gearRatio = gearRatioMotor;
    p.cylinderRelation = p.cylinderDiameter > 0 ? p.exitBarHeight / p.cylinderDiameter : 0;
    p.transmissionRatio = p.gearRatio;

    // Velocidades
    p.neutralPointSpeed = calculateNeutralPointSpeed(p.motorRotation, p.workDiameter, p.gearRatio);
    p.exitSpeed = calculateExitSpeed(p.entryArea, p.exitArea, p.neutralPointSpeed);

    // Fricção e ângulos
    p.frictionCoeff = calculateFrictionCoeff(p.temperature);
    p.effectiveAngle = p.contactAngle;
    p.effectiveContactAngle = p.contactAngle;
    p.neutralPoint = calculateNeutralPoint(p.contactAngle, p.frictionCoeff);
    const gripAngle = calculateGripAngle(p.frictionCoeff);
    p.contactOverGripAngle = gripAngle > 0 ? (p.contactAngle / gripAngle) * 100 : 0;

    // Pressão e Força
    p.maxPressure = calculateMaxPressure(p.frictionCoeff, p.deformationCoeff, p.temperature);
    const contactLength = calculateContactLength(p.workDiameter, p.entryBarHeight, p.exitBarHeight);
    const meanWidth = (p.entryBarWidth + p.exitBarWidth) / 2;
    p.rollingForce = calculateRollingForce(p.maxPressure, contactLength, meanWidth);

    // Torque e Carga
    p.vacuumTorque = calculateVacuumTorque(p.cylinderDiameter);

    // Fator de carga: torque necessário / torque médio de referência do trem
    // Torque necessário ≈ F × R_trabalho (MN × m/2 = MNm = 1000 kNm)
    const R_work = p.workDiameter > 0 ? (p.workDiameter / 2) / 1000 : 0.25; // m
    const torqueNecessario = p.rollingForce * R_work * 1000; // kNm
    const torqueRef = trainType === 'desbaste' ? 12.0
        : trainType === 'intermediario' ? 5.0 : 2.5; // kNm de referência por trem
    p.loadFactor = torqueRef > 0 ? Math.min(torqueNecessario / (torqueRef * 100), 1.0) : 0;

    // Perímetro
    p.perimeter = calcPerimeter(p.channelType, p.exitBarWidth, p.exitBarHeight);

    // Correção LSC → LIC (Luz sob carga)
    if (p.importedLuzSemCarga != null && p.importedLuzSemCarga > 0) {
        p.luzSobCarga = calculateLuzSobCarga(
            p.importedLuzSemCarga, p.rollingForce, springConstant
        );
    } else {
        p.luzSobCarga = p.luz;
    }

    // Validação cruzada: FR calculado vs FR importado
    if (p.importedFr != null && p.importedFr > 0) {
        p.frValidationDelta = p.reduction - p.importedFr;
        if (Math.abs(p.frValidationDelta) > 2) {
            p.frValidationWarning = `FR calculado (${p.reduction.toFixed(1)}%) difere do plano (${p.importedFr.toFixed(1)}%) em ${Math.abs(p.frValidationDelta).toFixed(1)}%`;
        } else {
            p.frValidationWarning = null;
        }
    } else {
        p.frValidationDelta = 0;
        p.frValidationWarning = null;
    }

    // Tempo até próx. passe
    if (p.exitSpeed > 0 && p.distanceNextPass > 0) {
        p.timeNextPass = p.distanceNextPass / p.exitSpeed;
    }

    return p;
}

/** Recalcula a cascata inteira de passes */
export function recalculateAllPasses(
    passes: PassConfig[],
    rawMaterial: RawMaterial,
    process: ProcessData,
    motors: { trainType: TrainType; gearRatio: number }[]
): PassConfig[] {
    let prevArea = rawMaterial.width * rawMaterial.height; // Inicial
    let prevWidth = rawMaterial.width;
    let prevHeight = rawMaterial.height;

    // Tipo anterior inicial
    let absoluteIndex = 0;

    return passes.map(passConf => {
        absoluteIndex++;

        // Determina orientação da gaiola atual.
        // Override manual tem prioridade; caso contrário usa alternância padrão:
        // Passes ÍMPARES = Horizontal (H), passes PARES = Vertical (V).
        // Isso corresponde ao padrão oval-redondo da maioria dos laminadores de barras.
        let currentOrientation: 'H' | 'V' = 'H';
        if (passConf.data.orientation) {
            currentOrientation = passConf.data.orientation;
        } else {
            currentOrientation = (absoluteIndex % 2 === 0) ? 'V' : 'H';
        }

        const motor = motors.find(m => m.trainType === passConf.trainType);
        const gearRatio = motor ? motor.gearRatio : 1;

        // --- DELEGA PARA O MOTOR v2.0 ---
        // Tratamos a rotação 90 graus se for V
        let inputW = prevWidth;
        let inputH = prevHeight;

        // Se for V, o que era largura vira altura para o cálculo do GAP
        if (currentOrientation === 'V') {
            inputW = prevHeight;
            inputH = prevWidth;
        }

        const calculatedData = recalculatePassV2(
            { ...passConf.data, orientation: currentOrientation },
            prevArea,
            inputW,
            inputH,
            process,
            passConf.passNumber,
            passConf.trainType,
            gearRatio
        );

        // Ajusta a saída para o sistema de coordenadas universal (Sempre deitado)
        let finalExitW = calculatedData.exitBarWidth;
        let finalExitH = calculatedData.exitBarHeight;

        if (currentOrientation === 'V') {
            // Inverte de volta para manter o padrão "barra deitada" no visualizador
            // Mas somente se a altura calculada (gap) for maior que a largura (spread)
            if (calculatedData.exitBarHeight > calculatedData.exitBarWidth) {
                finalExitW = calculatedData.exitBarHeight;
                finalExitH = calculatedData.exitBarWidth;
            }
        }

        const newData: PassData = {
            ...calculatedData,
            exitBarWidth: finalExitW,
            exitBarHeight: finalExitH
        };

        // Atualiza para o próximo loop
        prevArea = newData.exitArea;
        prevWidth = newData.exitBarWidth;
        prevHeight = newData.exitBarHeight;

        return { ...passConf, data: newData };
    });
}
