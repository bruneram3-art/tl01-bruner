/**
 * HRS Simulator - Type Definitions
 * Mapeamento fiel ao programa original Sistema HRS v2.9
 */

export type PassType = 'box' | 'oval' | 'round' | 'square' | 'diamond' | 'flat' | 'angle'; // angle = cantoneira, flat = chato, square = quadrado, diamond = losango
export type SteelType = 'carbon' | 'high_alloy';
export type TrainType = 'desbaste' | 'intermediario' | 'acabador';

// --- Raw Material (Matéria Prima) ---
export interface RawMaterial {
    type: 'billet' | 'round'; // quadrado ou redondo
    width: number;       // Largura do tarugo (mm)
    height: number;      // Altura do tarugo (mm)
    corner: number; // raio de canto
    length: number;
    temperature: number; // Temperatura inicial (°C)
    material: SteelType;
}

// --- Process Data (Processo) ---
export interface ProcessData {
    thermalExpansionFactor: number; // Fator dilatação térmica (1.013 carbono)
    sampleMeasurement: number;     // Medição de amostras
    finishDiameter: number;        // Diâmetro canal acabador (mm)
}

// --- Losses Data (Perdas) ---
export interface LossesData {
    oxidationLoss: number;   // Perda por oxidação (%)
    cropLoss: number;        // Perda por desponte (%)
    cobbleLoss: number;      // Perda por sucata (%)
    totalLoss: number;       // Perda total (%) - calculated
}

// --- Block Data (Blocos) ---
export interface BlockData {
    id: string;
    label: string;
    numberOfPasses: number;
    startDiameter: number;  // mm
    endDiameter: number;    // mm
}

// --- Pass Data (Dados completos do passe ~50 campos) ---
export interface PassData {
    id: string;

    // === SEÇÃO: Canal (entrada do usuário) ===
    channelType: PassType;         // Tipo de Passe
    luz: number;                    // Luz (mm)
    luzProj: number;                // Luz de Projeto (mm)
    radiusConcordance: number;      // Raio na concordância (mm)
    wideningFactor: number;         // Fator de Alargamento (FA)
    cylinderDiameter: number;       // Diâmetro dos Cilindros (mm)
    temperature: number;            // Temperatura (°C)
    motorRotation: number;          // Rotação do Motor (rpm)
    distanceNextPass: number;       // Distância até o Passe Seguinte (m)
    timeNextPass: number;           // Tempo até o passe seguinte (s)

    // === SEÇÃO: Barra na Entrada (verde) ===
    entryBarWidth: number;          // Barra entrada - Largura (mm)
    entryBarHeight: number;         // Barra entrada - Altura (mm)

    // === SEÇÃO: Barra na Saída (verde) ===
    exitBarWidth: number;           // Barra saída - Largura (mm)
    exitBarHeight: number;          // Barra saída - Altura (mm)

    // === SEÇÃO: Deformação (calculada) ===
    entryArea: number;              // Área na Entrada (mm²)
    exitArea: number;               // Área de Saída (mm²)
    reduction: number;              // Redução (%)
    entryLuz: number;               // Luz da Entrada (mm)
    initialWidth: number;           // Largura Inicial (mm)
    elongation: number;             // Alongamento
    widening: number;               // Alargamento (mm)
    deformationCoeff: number;       // Coeficiente de Deformação
    barOccupiedArea: number;        // Área Ocupada da Barra (mm²)
    channelArea: number;            // Área (Ocupada) do Canal (mm²)
    channelWidth: number;           // Largura do Canal (mm)
    halfWidthHeight: number;        // Altura Meia Largura (mm)
    halfBarHeight: number;          // Altura Meia Barra (mm)

    // === SEÇÃO: Parâmetros de Passe (calculada) ===
    reiMedioOverReiFundo: number;   // Rei médio / Rei fundo canal
    barWidthOverChannelWidth: number;   // Largura barra / Largura canal
    barWidthOverBarHeight: number;      // Largura barra / Altura barra

    // === SEÇÃO: Parâmetros Geométricos (calculada) ===
    diameterBottomLuz: number;      // Diâmetro no fundo da Luz (mm)
    workDiameter: number;           // Diâmetro de Trabalho (mm)
    projectDiameter: number;        // Diâmetro de Projeto (mm)
    careerDiameter: number;         // Diâmetro de Carreira (mm)
    contactAngle: number;           // Ângulo do Contato (rad)
    gearRatio: number;              // Relação de engrenagem
    cylinderRelation: number;       // Relação do Cilindro (mm)
    transmissionRatio: number;      // Relação de Transmissão
    neutralPointSpeed: number;      // Velocidade de Ponto Neutro (m/s)
    exitSpeed: number;              // Velocidade da Saída (m/s)
    maxPressure: number;            // Pressão máxima (MPa)
    perimeter: number;              // Perímetro (mm)
    thermalDilation: number;        // Dilatação/Temperatura (°C)

    // === SEÇÃO: Diâmetro Efetivo Cilindro (calculada) ===
    effectiveAngle: number;         // Ângulo
    frictionCoeff: number;          // Coeficiente de Atrito
    effectiveContactAngle: number;  // Ângulo de Contato (rad)
    neutralPoint: number;           // Ponto neutro (rad)
    contactOverGripAngle: number;   // Âng. contato / Ângulo agarre (%)

    // === SEÇÃO: Esforço de Passe (calculada) ===
    rollingForce: number;           // Força de laminação (MN)
    vacuumTorque: number;           // Torque em Vazio (kNm)
    loadFactor: number;             // Fator de carga (%)
}

export interface PassConfig {
    trainType: TrainType;
    passNumber: number;
    data: PassData;
}

export interface MotorData {
    id: string;
    trainType: TrainType;
    label: string;
    power: number;             // Potência (kW)
    nominalRotation: number;   // Rotação nominal (rpm)
    maxRotation: number;       // Rotação máxima (rpm)
    gearRatio: number;         // Relação de engrenagem
    efficiency: number;        // Eficiência (%)
    nominalTorque: number;     // Torque nominal (kNm) - calculated
    maxTorque: number;         // Torque máximo (kNm) - calculated
}

export interface HRSProject {
    name: string;
    rawMaterial: RawMaterial;
    process: ProcessData;
    losses: LossesData;
    passes: PassConfig[];
    motors: MotorData[];
    blocks: BlockData[];
}

export type SelectedNodeType =
    | 'geral'
    | 'materia_prima'
    | 'secao'
    | 'processo'
    | 'perdas'
    | 'blocos'
    | string; // pass ID or motor ID

export interface HRSContextType {
    project: HRSProject;
    selectedNode: SelectedNodeType;
    setSelectedNode: (node: SelectedNodeType) => void;
    updateProjectField: (field: keyof HRSProject, value: any) => void;
    updateRawMaterial: (field: keyof RawMaterial, value: any) => void;
    updateProcess: (field: keyof ProcessData, value: any) => void;
    updateLosses: (field: keyof LossesData, value: any) => void;
    updatePass: (passId: string, field: keyof PassData, value: any) => void;
    updateMotor: (motorId: string, field: keyof MotorData, value: any) => void;
    addPass: (trainType: TrainType) => void;
    removePass: (passId: string) => void;
    addBlock: () => void;
    removeBlock: (blockId: string) => void;
    recalculateAll: () => void;
    newProject: () => void;
}
