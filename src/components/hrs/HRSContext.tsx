import React, { createContext, useContext, useState, useCallback } from 'react';
import {
    HRSProject, HRSContextType, SelectedNodeType, PassConfig,
    TrainType, PassData, PassType, RawMaterial, MotorData, ProcessData,
    LossesData, BlockData, ImportedPassPlan
} from '../../utils/hrsTypes';
import {
    recalculateAllPasses, createDefaultPass, calcMotorTorque
} from '../../utils/hrsFormulas';

// --- Defaults ---

const DEFAULT_RAW_MATERIAL: RawMaterial = {
    type: 'billet',
    width: 130,
    height: 130,
    corner: 5,
    length: 12000,
    temperature: 1150,
    material: 'carbon',
};

const DEFAULT_PROCESS: ProcessData = {
    thermalExpansionFactor: 1.013,
    sampleMeasurement: 2,
    finishDiameter: 0,
    springConstant: 5, // MN/mm - constante de mola padrão da gaiola
};

const DEFAULT_LOSSES: LossesData = {
    oxidationLoss: 1.5, cropLoss: 2.0, cobbleLoss: 0.5,
    totalLoss: 4.0,
};

const createDefaultMotors = (): MotorData[] => {
    const motors: MotorData[] = [];
    // 6 motores desbaste
    for (let i = 1; i <= 6; i++) {
        const power = 1500;
        const rpm = 1200;
        motors.push({
            id: `motor_desbaste_${i}`, trainType: 'desbaste', label: `Motor Desbaste #${i}`,
            power, nominalRotation: rpm, maxRotation: rpm * 1.25,
            gearRatio: 3.5, efficiency: 95,
            nominalTorque: calcMotorTorque(power, rpm),
            maxTorque: calcMotorTorque(power, rpm) * 1.5,
        });
    }
    // 4 motores intermediário
    for (let i = 1; i <= 4; i++) {
        const power = 800;
        const rpm = 1500;
        motors.push({
            id: `motor_intermediario_${i}`, trainType: 'intermediario', label: `Motor Intermediário #${i}`,
            power, nominalRotation: rpm, maxRotation: rpm * 1.2,
            gearRatio: 2.8, efficiency: 94,
            nominalTorque: calcMotorTorque(power, rpm),
            maxTorque: calcMotorTorque(power, rpm) * 1.5,
        });
    }
    // 7 motores acabador
    for (let i = 1; i <= 7; i++) {
        const power = 500;
        const rpm = 1800;
        motors.push({
            id: `motor_acabador_${i}`, trainType: 'acabador', label: `Motor Acabador #${i}`,
            power, nominalRotation: rpm, maxRotation: rpm * 1.22,
            gearRatio: 2.0, efficiency: 93,
            nominalTorque: calcMotorTorque(power, rpm),
            maxTorque: calcMotorTorque(power, rpm) * 1.5,
        });
    }
    return motors;
};

const createDefaultProject = (): HRSProject => {
    const passes: PassConfig[] = [];

    let globalPassIdx = 1;

    // 6 passes de desbaste (tarugo 130x130 → redução progressiva)
    const desbasteLuz = [95, 80, 65, 55, 45, 38];
    const desbasteTypes: PassType[] = ['box', 'box', 'oval', 'round', 'oval', 'round'];
    const desbasteTemp = [1100, 1090, 1080, 1070, 1060, 1050];
    const desbasteRPM = [40, 50, 60, 70, 85, 100];
    const desbasteCylDiam = [550, 550, 550, 550, 550, 550];
    for (let i = 0; i < 6; i++) {
        passes.push({
            trainType: 'desbaste', passNumber: globalPassIdx,
            data: {
                ...createDefaultPass(`pass_${globalPassIdx}`),
                channelType: desbasteTypes[i], luz: desbasteLuz[i], luzProj: desbasteLuz[i],
                radiusConcordance: 8, wideningFactor: 0.85,
                cylinderDiameter: desbasteCylDiam[i], temperature: desbasteTemp[i],
                motorRotation: desbasteRPM[i], distanceNextPass: 5.0,
            }
        });
        globalPassIdx++;
    }

    // 4 passes intermediários (7 a 10)
    const interLuz = [28, 22, 18, 14];
    const interTypes: PassType[] = ['oval', 'round', 'oval', 'round'];
    const interTemp = [1040, 1030, 1020, 1010];
    const interRPM = [150, 200, 260, 340];
    for (let i = 0; i < 4; i++) {
        passes.push({
            trainType: 'intermediario', passNumber: globalPassIdx,
            data: {
                ...createDefaultPass(`pass_${globalPassIdx}`),
                channelType: interTypes[i], luz: interLuz[i], luzProj: interLuz[i],
                radiusConcordance: 3, wideningFactor: 0.85,
                cylinderDiameter: 400, temperature: interTemp[i],
                motorRotation: interRPM[i], distanceNextPass: 3.0,
            }
        });
        globalPassIdx++;
    }

    // 7 passes acabadores (11 a 17)
    const acabLuz = [12, 10, 8.5, 7, 6, 5, 4.2];
    const acabTypes: PassType[] = ['oval', 'round', 'oval', 'round', 'oval', 'round', 'round'];
    const acabTemp = [1000, 995, 990, 985, 980, 975, 970];
    const acabRPM = [450, 550, 680, 850, 1050, 1300, 1600];
    for (let i = 0; i < 7; i++) {
        passes.push({
            trainType: 'acabador', passNumber: globalPassIdx,
            data: {
                ...createDefaultPass(`pass_${globalPassIdx}`),
                channelType: acabTypes[i], luz: acabLuz[i], luzProj: acabLuz[i],
                radiusConcordance: 1.5, wideningFactor: 0.85,
                cylinderDiameter: 350, temperature: acabTemp[i],
                motorRotation: acabRPM[i], distanceNextPass: 1.5,
            }
        });
        globalPassIdx++;
    }

    const project: HRSProject = {
        name: 'Projeto Laminador HRS',
        rawMaterial: { ...DEFAULT_RAW_MATERIAL },
        process: { ...DEFAULT_PROCESS },
        losses: { ...DEFAULT_LOSSES },
        passes,
        motors: createDefaultMotors(),
        blocks: [],
    };

    const motors = project.motors.map(m => ({ trainType: m.trainType, gearRatio: m.gearRatio }));
    const recalcPasses = recalculateAllPasses(project.passes, project.rawMaterial, project.process, motors);
    return { ...project, passes: recalcPasses };
};

const doRecalc = (project: HRSProject): HRSProject => {
    const motors = project.motors.map(m => ({ trainType: m.trainType, gearRatio: m.gearRatio }));
    const recalcPasses = recalculateAllPasses(project.passes, project.rawMaterial, project.process, motors);
    return { ...project, passes: recalcPasses };
};

const HRSContext = createContext<HRSContextType | null>(null);

export const useHRS = (): HRSContextType => {
    const ctx = useContext(HRSContext);
    if (!ctx) throw new Error('useHRS must be used within HRSProvider');
    return ctx;
};

export const HRSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [project, setProject] = useState<HRSProject>(() => createDefaultProject());
    const [selectedNode, setSelectedNode] = useState<SelectedNodeType>('pass_1');

    const updateProjectField = useCallback((field: keyof HRSProject, value: any) => {
        setProject(prev => doRecalc({ ...prev, [field]: value }));
    }, []);

    const updateRawMaterial = useCallback((field: keyof RawMaterial, value: any) => {
        setProject(prev => doRecalc({
            ...prev, rawMaterial: { ...prev.rawMaterial, [field]: value }
        }));
    }, []);

    const updateProcess = useCallback((field: keyof ProcessData, value: any) => {
        setProject(prev => doRecalc({
            ...prev, process: { ...prev.process, [field]: value }
        }));
    }, []);

    const updateLosses = useCallback((field: keyof LossesData, value: any) => {
        setProject(prev => {
            const losses = { ...prev.losses, [field]: value };
            losses.totalLoss = losses.oxidationLoss + losses.cropLoss + losses.cobbleLoss;
            return { ...prev, losses };
        });
    }, []);

    const updatePass = useCallback((passId: string, field: keyof PassData, value: any) => {
        setProject(prev => {
            const updated = {
                ...prev,
                passes: prev.passes.map(pc =>
                    pc.data.id === passId
                        ? { ...pc, data: { ...pc.data, [field]: value } }
                        : pc
                ),
            };
            return doRecalc(updated);
        });
    }, []);

    const updateMotor = useCallback((motorId: string, field: keyof MotorData, value: any) => {
        setProject(prev => {
            const motors = prev.motors.map(m => {
                if (m.id !== motorId) return m;
                const updated = { ...m, [field]: value };
                if (field === 'power' || field === 'nominalRotation') {
                    updated.nominalTorque = calcMotorTorque(updated.power, updated.nominalRotation);
                    updated.maxTorque = updated.nominalTorque * 1.5;
                }
                return updated;
            });
            return doRecalc({ ...prev, motors });
        });
    }, []);

    const addPass = useCallback((trainType: TrainType) => {
        setProject(prev => {
            const newPassNum = prev.passes.length + 1;
            const newPass: PassConfig = {
                trainType, passNumber: newPassNum,
                data: createDefaultPass(`pass_${newPassNum}`),
            };
            const updated = { ...prev, passes: [...prev.passes, newPass] };
            updated.passes.sort((a, b) => {
                const order: Record<TrainType, number> = { desbaste: 0, intermediario: 1, acabador: 2 };
                return (order[a.trainType] - order[b.trainType]) || (a.passNumber - b.passNumber);
            });
            return doRecalc(updated);
        });
    }, []);

    const removePass = useCallback((passId: string) => {
        setProject(prev => doRecalc({
            ...prev, passes: prev.passes.filter(p => p.data.id !== passId)
        }));
    }, []);

    const addBlock = useCallback(() => {
        setProject(prev => {
            const newBlock: BlockData = {
                id: `block_${Date.now()}`,
                label: `Bloco ${prev.blocks.length + 1}`,
                numberOfPasses: 0, startDiameter: 0, endDiameter: 0,
            };
            return { ...prev, blocks: [...prev.blocks, newBlock] };
        });
    }, []);

    const removeBlock = useCallback((blockId: string) => {
        setProject(prev => ({
            ...prev, blocks: prev.blocks.filter(b => b.id !== blockId)
        }));
    }, []);

    const importPassPlan = useCallback((plans: ImportedPassPlan[]) => {
        setProject(prev => {
            let updatedPasses = [...prev.passes];

            // Ajustar quantidade de passes conforme o PDF
            if (plans.length > 0) {
                updatedPasses = plans.map(plan => {
                    // Tenta encontrar gaiola existente pelo número
                    const existing = prev.passes.find(p => p.passNumber === plan.passNumber);

                    const trainType: TrainType = plan.passNumber <= 6 ? 'desbaste'
                        : plan.passNumber <= 10 ? 'intermediario' : 'acabador';

                    const baseData = existing?.data || createDefaultPass(`pass_${plan.passNumber}`);

                    return {
                        trainType,
                        passNumber: plan.passNumber,
                        data: {
                            ...baseData,
                            id: `pass_${plan.passNumber}`,
                            importedFr: plan.fr,
                            importedLuzSemCarga: plan.luzSemCarga,
                            importedLargura: plan.largura,
                            importedAltura: plan.altura,
                            gaiolaName: plan.gaiola, // Preserva o nome exato do PDF (ex: CAD1, G2)

                            // SINCRONIA: Se o plano tem o dado, ele SOBRESCREVE o simulado para garantir fidelidade
                            luz: plan.luzSemCarga !== null ? plan.luzSemCarga : baseData.luz,
                            luzProj: plan.luzSemCarga !== null ? plan.luzSemCarga : baseData.luzProj,
                            largura: plan.largura !== null ? plan.largura : baseData.largura,
                            altura: plan.altura !== null ? plan.altura : baseData.altura,

                            // Se o plano detectou que o passe é Flat (Mesa Lisa) ou Borda (Edge), força o tipo
                            channelType: plan.isFlat ? 'flat' : plan.isEdge ? 'edge_oval' : baseData.channelType,
                        }
                    };
                });
            }

            return doRecalc({ ...prev, passes: updatedPasses });
        });
    }, []);


    const optimizeLuzForPass = useCallback((passId: string) => {
        setProject(prev => {
            const passConfig = prev.passes.find(pc => pc.data.id === passId);
            if (!passConfig || passConfig.data.importedFr == null) return prev;

            const targetFr = passConfig.data.importedFr;
            let bestLuz = passConfig.data.luz;
            let currentReduction = passConfig.data.reduction;

            // Simple iterative search for the luz that match the target reduction (FR)
            // Reduction = (AreaEntry - AreaExit) / AreaEntry
            // Increasing Luz decreases Reduction.
            for (let i = 0; i < 50; i++) {
                const diff = currentReduction - targetFr;
                if (Math.abs(diff) < 0.05) break;

                // Adjustment factor
                const adjustment = diff * 0.5;
                bestLuz += adjustment;

                // Create temporary project to calculate the new reduction
                const tempProject = {
                    ...prev,
                    passes: prev.passes.map(pc =>
                        pc.data.id === passId
                            ? { ...pc, data: { ...pc.data, luz: bestLuz, luzProj: bestLuz } }
                            : pc
                    )
                };
                const recalculated = doRecalc(tempProject);
                const updatedPass = recalculated.passes.find(pc => pc.data.id === passId);
                if (!updatedPass) break;
                currentReduction = updatedPass.data.reduction;
            }

            return doRecalc({
                ...prev,
                passes: prev.passes.map(pc =>
                    pc.data.id === passId
                        ? { ...pc, data: { ...pc.data, luz: bestLuz, luzProj: bestLuz } }
                        : pc
                )
            });
        });
    }, []);

    const recalculateAll = useCallback(() => {
        setProject(prev => doRecalc(prev));
    }, []);

    const newProject = useCallback(() => {
        setProject(createDefaultProject());
        setSelectedNode('pass_1');
    }, []);

    return (
        <HRSContext.Provider value={{
            project, selectedNode, setSelectedNode,
            updateProjectField, updateRawMaterial, updateProcess, updateLosses,
            updatePass, updateMotor,
            addPass, removePass, addBlock, removeBlock,
            recalculateAll, newProject, importPassPlan,
            optimizeLuzForPass
        }}>
            {children}
        </HRSContext.Provider>
    );
};
