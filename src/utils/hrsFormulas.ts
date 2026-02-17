import {
    PassData,
    PassType,
    TrainType,
    ProcessData,
    RawMaterial,
    PassConfig,
    MotorData
} from './hrsTypes';

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

/** Largura do canal baseada no tipo e geometria */
export const calcChannelWidth = (type: PassType, width: number): number => {
    // Retorna a largura física do canal na ferramenta.
    // Geralmente projeta-se o canal com uma folga para permitir o alargamento (spread) livre.
    // Assumimos aqui uma folga padrão de ~4% em relação à largura nominal da barra de saída.
    // Se a barra alargar mais que isso, haverá sobreenchimento visual.
    return width * 1.04;
};

/** Diâmetro no fundo da luz */
export function calculateDiameterBottomLuz(cylinderDiameter: number, luz: number, channelDepth: number): number {
    return cylinderDiameter - 2 * channelDepth;
}

/** Diâmetro de trabalho */
export function calculateWorkDiameter(cylinderDiameter: number, exitHeight: number): number {
    return cylinderDiameter - exitHeight;
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

/** Dilatação térmica linear */
export function calculateThermalDilation(temperature: number, steelType: string): number {
    if (steelType === 'carbon') return THERMAL_EXPANSION_CARBON;
    return 1 + THERMAL_EXPANSION_COEFF * temperature;
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
        channelWidth: 0, halfWidthHeight: 0, halfBarHeight: 0,
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
    gearRatioMotor: number
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

    // Dimensões de saída baseadas no canal
    const luzEfetiva = p.luzProj > 0 ? p.luzProj : p.luz;
    p.exitBarHeight = luzEfetiva;
    p.exitBarWidth = p.entryBarWidth * p.wideningFactor; // Simplificação do alargamento

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
    p.workDiameter = calculateWorkDiameter(p.cylinderDiameter, p.exitBarHeight);
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
    p.loadFactor = calculateLoadFactor(passNumber, trainType);

    // Perímetro
    p.perimeter = calcPerimeter(p.channelType, p.exitBarWidth, p.exitBarHeight);

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

    // Se billet for quadrado
    if (rawMaterial.type === 'billet') {
        prevArea = rawMaterial.width * rawMaterial.height;
    }

    // Tipo anterior inicial
    let prevType: PassType | 'billet' = rawMaterial.type;

    return passes.map(passConf => {
        // Encontra motor correspondente
        const motor = motors.find(m => m.trainType === passConf.trainType);
        const gearRatio = motor ? motor.gearRatio : 1;
        const currentType = passConf.data.channelType;

        // Lógica de Vireador (Twist 90º) Automático
        // Se a barra anterior for "achatada" (Oval/Flat) e entrar num perfil fechado (Redondo/Quadrado/Losango/Oval),
        // geralmente vira-se 90 graus para atacar a altura menor.
        // Regra simplificada: Se anterior for Oval/Flat e atual for Redondo/Quadrado/Diamond/Oval, inverte W e H.
        let inputWidth = prevWidth;
        let inputHeight = prevHeight;

        // Se Oval -> Redondo/Quadrado/Diamond/Oval, vira 90 graus
        if ((prevType === 'oval' || prevType === 'flat') &&
            ['round', 'square', 'diamond', 'oval'].includes(currentType)) {
            // Inverte W e H (Vireador)
            inputWidth = prevHeight;
            inputHeight = prevWidth;
        }
        // Se Diamond -> Square, vira também (ataca arestas opostas)
        if (prevType === 'diamond' && currentType === 'square') {
            inputWidth = prevHeight;
            inputHeight = prevWidth;
        }

        const newData = recalculatePass(
            passConf.data,
            prevArea,
            inputWidth, // Usa dimensões rotacionadas se aplicável
            inputHeight,
            process,
            passConf.passNumber,
            passConf.trainType,
            gearRatio
        );

        // Atualiza para o próximo loop
        prevArea = newData.exitArea;
        prevWidth = newData.exitBarWidth;
        prevHeight = newData.exitBarHeight;
        prevType = currentType;

        return { ...passConf, data: newData };
    });
}
