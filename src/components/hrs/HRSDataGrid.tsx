import React, { useState, useCallback } from 'react';
import { useHRS } from './HRSContext';
import { PassData, PassType, RawMaterial, SteelType, MotorData, ProcessData, LossesData } from '../../utils/hrsTypes';

const CHANNEL_TYPE_LABELS: Record<PassType, string> = {
    oval: 'Oval', round: 'Redondo', box: 'Caixa', flat: 'Mesa Lisa',
    square: 'Quadrado', diamond: 'Losango', angle: 'Cantoneira (L)',
};
const STEEL_TYPE_LABELS: Record<SteelType, string> = {
    carbon: 'Ao Carbono / baixa liga', high_alloy: 'Alta liga',
};

// --- Reusable Cell Components ---

const EditableCell = ({ value, onChange }: { value: number | string; onChange: (v: any) => void }) => {
    const [editing, setEditing] = useState(false);
    const [localVal, setLocalVal] = useState(String(value));

    const commit = useCallback(() => {
        setEditing(false);
        const num = parseFloat(localVal);
        if (!isNaN(num)) onChange(num);
    }, [localVal, onChange]);

    if (editing) {
        return (
            <input
                autoFocus type="text" value={localVal}
                onChange={e => setLocalVal(e.target.value)}
                onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()}
                className="w-full px-3 py-1.5 border-none outline-none bg-yellow-50 text-xs text-blue-800 font-mono focus:ring-2 focus:ring-inset focus:ring-blue-500"
            />
        );
    }
    return (
        <div onClick={() => { setEditing(true); setLocalVal(String(value)); }}
            className="w-full px-3 py-1.5 text-xs text-blue-800 font-mono cursor-text hover:bg-yellow-50 min-h-[28px]">
            {typeof value === 'number' ? value.toFixed(2) : value}
        </div>
    );
};

const ReadOnlyCell = ({ value }: { value: number }) => (
    <div className="w-full px-3 py-1.5 text-xs text-gray-600 font-mono bg-gray-50/50 min-h-[28px]">
        {value.toFixed(value > 100 ? 1 : value > 1 ? 2 : 4)}
    </div>
);

// --- Section Header ---
const SectionHeader = ({ title, color = 'blue' }: { title: string; color?: string }) => {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-50/70 text-blue-800',
        green: 'bg-green-50/70 text-green-800',
        yellow: 'bg-yellow-50/70 text-yellow-800',
        purple: 'bg-purple-50/70 text-purple-800',
        red: 'bg-red-50/70 text-red-800',
        orange: 'bg-orange-50/70 text-orange-800',
        teal: 'bg-teal-50/70 text-teal-800',
        gray: 'bg-gray-100 text-gray-700',
    };
    return (
        <tr className={`border-b border-gray-300 ${colorClasses[color] || colorClasses.blue}`}>
            <td className="border-r border-gray-200 px-3 py-1.5 text-xs font-bold" colSpan={3}>
                {title}
            </td>
        </tr>
    );
};

// --- Row Components ---
type RowData = { variable: string; value: number; unit: string };
type EditableRowData = { variable: string; field: string; unit: string };

const CalcRow: React.FC<{ row: RowData; idx: number }> = ({ row, idx }) => (
    <tr className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
        <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-700">{row.variable}</td>
        <td className="border-r border-gray-200 px-0 py-0"><ReadOnlyCell value={row.value} /></td>
        <td className="px-3 py-1.5 text-xs text-gray-500">{row.unit}</td>
    </tr>
);

// --- Grid Table Container ---
const GridTable = ({ children }: { children: React.ReactNode }) => (
    <table className="w-full text-left border-collapse">
        <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
                <th className="border-b border-r border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 w-1/2">Variável</th>
                <th className="border-b border-r border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 w-1/3">Valor</th>
                <th className="border-b border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600">Un.</th>
            </tr>
        </thead>
        <tbody>{children}</tbody>
    </table>
);

// ============ VIEW: GERAL ============
const GeneralView = () => {
    const { project, updateProjectField } = useHRS();
    return (
        <>
            <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Parâmetros Gerais
            </div>
            <div className="flex-1 overflow-auto">
                <GridTable>
                    <SectionHeader title="Projeto" color="blue" />
                    <tr className="border-b border-gray-200 bg-white">
                        <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-800 font-medium">Nome do Projeto</td>
                        <td className="border-r border-gray-200 px-0 py-0" colSpan={2}>
                            <input type="text" value={project.name}
                                onChange={e => updateProjectField('name', e.target.value)}
                                className="w-full px-3 py-1.5 border-none outline-none bg-transparent text-xs text-blue-800 font-mono"
                            />
                        </td>
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-700">Quantidade de Passes</td>
                        <td className="border-r border-gray-200 px-0 py-0"><ReadOnlyCell value={project.passes.length} /></td>
                        <td className="px-3 py-1.5 text-xs text-gray-500"></td>
                    </tr>
                    <tr className="border-b border-gray-200 bg-white">
                        <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-700">Quantidade de Motores</td>
                        <td className="border-r border-gray-200 px-0 py-0"><ReadOnlyCell value={project.motors.length} /></td>
                        <td className="px-3 py-1.5 text-xs text-gray-500"></td>
                    </tr>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-700">Quantidade de Blocos</td>
                        <td className="border-r border-gray-200 px-0 py-0"><ReadOnlyCell value={project.blocks.length} /></td>
                        <td className="px-3 py-1.5 text-xs text-gray-500"></td>
                    </tr>
                </GridTable>
            </div>
        </>
    );
};

// ============ VIEW: MATÉRIA PRIMA ============
const RawMaterialView = () => {
    const { project, updateRawMaterial } = useHRS();
    const rm = project.rawMaterial;
    return (
        <>
            <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Matéria Prima
            </div>
            <div className="flex-1 overflow-auto">
                <GridTable>
                    <SectionHeader title={rm.type === 'billet' ? "Tarugo (Quadrado)" : "Tarugo (Redondo)"} color="orange" />

                    {/* Linha Tipo de Perfil (Billet vs Round) */}
                    <tr className="border-b border-gray-200 bg-white">
                        <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-800 font-medium">Formato</td>
                        <td className="border-r border-gray-200 px-0 py-0">
                            <select value={rm.type}
                                onChange={e => updateRawMaterial('type', e.target.value)}
                                className="w-full px-3 py-1.5 border-none bg-transparent text-xs text-blue-800 font-mono cursor-pointer"
                            >
                                <option value="billet">Quadrado (Billet)</option>
                                <option value="round">Redondo</option>
                            </select>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-gray-500"></td>
                    </tr>

                    {/* Linha Tipo de Aço */}
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                        <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-800 font-medium">Tipo de Aço</td>
                        <td className="border-r border-gray-200 px-0 py-0">
                            <select value={rm.material}
                                onChange={e => updateRawMaterial('material', e.target.value)}
                                className="w-full px-3 py-1.5 border-none bg-transparent text-xs text-blue-800 font-mono cursor-pointer"
                            >
                                {Object.entries(STEEL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-gray-500"></td>
                    </tr>

                    {([
                        { variable: 'Largura', field: 'width' as keyof RawMaterial, unit: 'mm' },
                        { variable: 'Altura', field: 'height' as keyof RawMaterial, unit: 'mm' },
                        { variable: 'Raio de Canto', field: 'corner' as keyof RawMaterial, unit: 'mm' },
                        { variable: 'Comprimento', field: 'length' as keyof RawMaterial, unit: 'mm' },
                        { variable: 'Temperatura', field: 'temperature' as keyof RawMaterial, unit: '°C' },
                    ]).map((row, idx) => (
                        <tr key={row.field} className={`border-b border-gray-200 hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                            <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-800 font-medium">{row.variable}</td>
                            <td className="border-r border-gray-200 px-0 py-0">
                                <EditableCell value={rm[row.field] as number} onChange={v => updateRawMaterial(row.field, v)} />
                            </td>
                            <td className="px-3 py-1.5 text-xs text-gray-500">{row.unit}</td>
                        </tr>
                    ))}
                    <CalcRow row={{ variable: 'Área da Seção', value: rm.width * rm.height, unit: 'mm²' }} idx={0} />
                </GridTable>
            </div>
        </>
    );
};

// ============ VIEW: SEÇÃO INICIAL ============
const SectionView = () => {
    const { project } = useHRS();
    const rm = project.rawMaterial;
    const area = rm.width * rm.height;
    const perimeter = 2 * (rm.width + rm.height);
    return (
        <>
            <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Seção Inicial
            </div>
            <div className="flex-1 overflow-auto">
                <GridTable>
                    <SectionHeader title="Dimensões do Tarugo" color="purple" />
                    {([
                        { variable: 'Largura', value: rm.width, unit: 'mm' },
                        { variable: 'Altura', value: rm.height, unit: 'mm' },
                        { variable: 'Área', value: area, unit: 'mm²' },
                        { variable: 'Perímetro', value: perimeter, unit: 'mm' },
                        { variable: 'Temperatura', value: rm.temperature, unit: '°C' },
                    ]).map((row, idx) => <CalcRow key={row.variable} row={row} idx={idx} />)}
                </GridTable>
            </div>
        </>
    );
};

// ============ VIEW: PROCESSO ============
const ProcessView = () => {
    const { project, updateProcess } = useHRS();
    const proc = project.process;
    return (
        <>
            <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Processo
            </div>
            <div className="flex-1 overflow-auto">
                <GridTable>
                    <SectionHeader title="Parâmetros de Processo" color="purple" />
                    {([
                        { variable: 'Fator de Dilatação Térmica', field: 'thermalExpansionFactor' as keyof ProcessData, unit: '' },
                        { variable: 'Medição de Amostras', field: 'sampleMeasurement' as keyof ProcessData, unit: '' },
                        { variable: 'Diâmetro Canal Acabador', field: 'finishDiameter' as keyof ProcessData, unit: 'mm' },
                    ]).map((row, idx) => (
                        <tr key={row.field} className={`border-b border-gray-200 hover:bg-blue-50 ${idx % 2 ? 'bg-gray-50/50' : 'bg-white'}`}>
                            <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-800 font-medium">{row.variable}</td>
                            <td className="border-r border-gray-200 px-0 py-0">
                                <EditableCell value={proc[row.field] as number} onChange={v => updateProcess(row.field, v)} />
                            </td>
                            <td className="px-3 py-1.5 text-xs text-gray-500">{row.unit}</td>
                        </tr>
                    ))}
                </GridTable>
            </div>
        </>
    );
};

// ============ VIEW: PERDAS ============
const LossesView = () => {
    const { project, updateLosses } = useHRS();
    const l = project.losses;
    return (
        <>
            <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Perdas
            </div>
            <div className="flex-1 overflow-auto">
                <GridTable>
                    <SectionHeader title="Perdas no Processo" color="red" />
                    {([
                        { variable: 'Perda por Oxidação', field: 'oxidationLoss' as keyof LossesData, unit: '%' },
                        { variable: 'Perda por Desponte', field: 'cropLoss' as keyof LossesData, unit: '%' },
                        { variable: 'Perda por Sucata', field: 'cobbleLoss' as keyof LossesData, unit: '%' },
                    ]).map((row, idx) => (
                        <tr key={row.field} className={`border-b border-gray-200 hover:bg-blue-50 ${idx % 2 ? 'bg-gray-50/50' : 'bg-white'}`}>
                            <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-800 font-medium">{row.variable}</td>
                            <td className="border-r border-gray-200 px-0 py-0">
                                <EditableCell value={l[row.field] as number} onChange={v => updateLosses(row.field, v)} />
                            </td>
                            <td className="px-3 py-1.5 text-xs text-gray-500">{row.unit}</td>
                        </tr>
                    ))}
                    <CalcRow row={{ variable: 'Perda Total', value: l.totalLoss, unit: '%' }} idx={0} />
                </GridTable>
            </div>
        </>
    );
};

// ============ VIEW: PASSE COMPLETO (~50 variáveis) ============
const PassDetailView = ({ passData, passLabel }: { passData: PassData; passLabel: string }) => {
    const { updatePass, recalculateAll, project } = useHRS();
    const id = passData.id;
    const [activeTab, setActiveTab] = useState<'canal' | 'motor'>('canal');

    // Find associated motor
    const passConfig = project.passes.find(p => p.data.id === id);
    const motor = passConfig ? project.motors.find(m => m.trainType === passConfig.trainType) : null;

    const p = passData;

    return (
        <>
            <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>Passe: {passLabel} — Dimensões {p.exitBarWidth.toFixed(1)} mm x {p.exitBarHeight.toFixed(1)} mm / Redução: {p.reduction.toFixed(2)}%</span>
                <span className="text-xs text-blue-600 cursor-pointer hover:underline font-bold" onClick={recalculateAll}>
                    Recalcular
                </span>
            </div>

            {/* Tabs Canal / Motor */}
            <div className="flex border-b border-gray-300 bg-gray-50">
                <button
                    className={`px-4 py-1.5 text-xs font-semibold border-r border-gray-300 ${activeTab === 'canal' ? 'bg-white text-blue-700 border-b-2 border-b-blue-500' : 'text-gray-500 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('canal')}
                >Canal</button>
                <button
                    className={`px-4 py-1.5 text-xs font-semibold ${activeTab === 'motor' ? 'bg-white text-blue-700 border-b-2 border-b-blue-500' : 'text-gray-500 hover:bg-gray-100'}`}
                    onClick={() => setActiveTab('motor')}
                >Motor</button>
            </div>

            <div className="flex-1 overflow-auto">
                {activeTab === 'canal' ? (
                    <GridTable>
                        {/* === CANAL === */}
                        <SectionHeader title="Canal" color="blue" />
                        {([
                            { variable: 'Tipo de Passe', field: 'channelType', unit: '' },
                            { variable: 'Luz', field: 'luz', unit: 'mm' },
                            { variable: 'Luz de Projeto', field: 'luzProj', unit: 'mm' },
                            { variable: 'Raio na Concordância', field: 'radiusConcordance', unit: 'mm' },
                            { variable: 'Fator de Alargamento', field: 'wideningFactor', unit: '' },
                            { variable: 'Diâmetro dos Cilindros', field: 'cylinderDiameter', unit: 'mm' },
                            { variable: 'Temperatura', field: 'temperature', unit: '°C' },
                            { variable: 'Rotação do Motor', field: 'motorRotation', unit: 'rpm' },
                            { variable: 'Distância até o Passe Seguinte', field: 'distanceNextPass', unit: 'm' },
                            { variable: 'Tempo até o passe seguinte', field: 'timeNextPass', unit: 's' },
                        ] as { variable: string; field: keyof PassData; unit: string }[]).map((row, idx) => (
                            <tr key={row.field} className={`border-b border-gray-200 hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-800 font-medium">{row.variable}</td>
                                <td className="border-r border-gray-200 px-0 py-0">
                                    {row.field === 'channelType' ? (
                                        <select value={p.channelType}
                                            onChange={e => updatePass(id, 'channelType', e.target.value as PassType)}
                                            className="w-full px-3 py-1.5 border-none bg-transparent text-xs text-blue-800 font-mono cursor-pointer"
                                        >
                                            {Object.entries(CHANNEL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                        </select>
                                    ) : (
                                        <EditableCell value={p[row.field] as number} onChange={v => updatePass(id, row.field, v)} />
                                    )}
                                </td>
                                <td className="px-3 py-1.5 text-xs text-gray-500">{row.unit}</td>
                            </tr>
                        ))}

                        {/* === BARRA NA ENTRADA === */}
                        <SectionHeader title="Barra na Entrada" color="green" />
                        {([
                            { variable: 'Largura', value: p.entryBarWidth, unit: 'mm' },
                            { variable: 'Altura', value: p.entryBarHeight, unit: 'mm' },
                        ]).map((row, idx) => <CalcRow key={row.variable} row={row} idx={idx} />)}

                        {/* === BARRA NA SAÍDA === */}
                        <SectionHeader title="Barra na Saída" color="green" />
                        {([
                            { variable: 'Largura', value: p.exitBarWidth, unit: 'mm' },
                            { variable: 'Altura', value: p.exitBarHeight, unit: 'mm' },
                        ]).map((row, idx) => <CalcRow key={row.variable} row={row} idx={idx} />)}

                        {/* === DEFORMAÇÃO === */}
                        <SectionHeader title="Deformação" color="yellow" />
                        {([
                            { variable: 'Área na Entrada', value: p.entryArea, unit: 'mm²' },
                            { variable: 'Área de Saída', value: p.exitArea, unit: 'mm²' },
                            { variable: 'Redução', value: p.reduction, unit: '%' },
                            { variable: 'Luz da Entrada', value: p.entryLuz, unit: 'mm' },
                            { variable: 'Largura Inicial', value: p.initialWidth, unit: 'mm' },
                            { variable: 'Alongamento', value: p.elongation, unit: '' },
                            { variable: 'Alargamento', value: p.widening, unit: 'mm' },
                            { variable: 'Coeficiente de Deformação', value: p.deformationCoeff, unit: '' },
                            { variable: 'Área Ocupada da Barra', value: p.barOccupiedArea, unit: 'mm²' },
                            { variable: 'Área do Canal', value: p.channelArea, unit: 'mm²' },
                            { variable: 'Largura do Canal', value: p.channelWidth, unit: 'mm' },
                            { variable: 'Altura Meia Largura', value: p.halfWidthHeight, unit: 'mm' },
                            { variable: 'Altura Meia Barra', value: p.halfBarHeight, unit: 'mm' },
                        ]).map((row, idx) => <CalcRow key={row.variable} row={row} idx={idx} />)}

                        {/* === PARÂMETROS DE PASSE === */}
                        <SectionHeader title="Parâmetros de Passe" color="teal" />
                        {([
                            { variable: 'Rei médio / Rei fundo canal', value: p.reiMedioOverReiFundo, unit: '' },
                            { variable: 'Largura barra / Largura canal', value: p.barWidthOverChannelWidth, unit: '' },
                            { variable: 'Largura barra / Altura barra', value: p.barWidthOverBarHeight, unit: '' },
                        ]).map((row, idx) => <CalcRow key={row.variable} row={row} idx={idx} />)}

                        {/* === PARÂMETROS GEOMÉTRICOS === */}
                        <SectionHeader title="Parâmetros Geométricos" color="purple" />
                        {([
                            { variable: 'Diâmetro no fundo da Luz', value: p.diameterBottomLuz, unit: 'mm' },
                            { variable: 'Diâmetro de Trabalho', value: p.workDiameter, unit: 'mm' },
                            { variable: 'Diâmetro de Projeto', value: p.projectDiameter, unit: 'mm' },
                            { variable: 'Diâmetro de Carreira', value: p.careerDiameter, unit: 'mm' },
                            { variable: 'Ângulo do Contato', value: p.contactAngle, unit: 'rad' },
                            { variable: 'Relação de engrenagem', value: p.gearRatio, unit: '' },
                            { variable: 'Relação do Cilindro', value: p.cylinderRelation, unit: '' },
                            { variable: 'Relação de Transmissão', value: p.transmissionRatio, unit: '' },
                            { variable: 'Velocidade de Ponto Neutro', value: p.neutralPointSpeed, unit: 'm/s' },
                            { variable: 'Velocidade da Saída', value: p.exitSpeed, unit: 'm/s' },
                            { variable: 'Pressão máxima', value: p.maxPressure, unit: 'MPa' },
                            { variable: 'Perímetro', value: p.perimeter, unit: 'mm' },
                            { variable: 'Dilatação/Temperatura', value: p.thermalDilation, unit: '' },
                        ]).map((row, idx) => <CalcRow key={row.variable} row={row} idx={idx} />)}

                        {/* === DIÂMETRO EFETIVO CILINDRO === */}
                        <SectionHeader title="Diâmetro Efetivo Cilindro" color="orange" />
                        {([
                            { variable: 'Ângulo', value: p.effectiveAngle, unit: 'rad' },
                            { variable: 'Coeficiente de Atrito', value: p.frictionCoeff, unit: '' },
                            { variable: 'Ângulo de Contato', value: p.effectiveContactAngle, unit: 'rad' },
                            { variable: 'Ponto neutro', value: p.neutralPoint, unit: 'rad' },
                            { variable: 'Âng. contato / Ângulo agarre', value: p.contactOverGripAngle, unit: '%' },
                        ]).map((row, idx) => <CalcRow key={row.variable} row={row} idx={idx} />)}

                        {/* === ESFORÇO DE PASSE === */}
                        <SectionHeader title="Esforço de Passe" color="red" />
                        {([
                            { variable: 'Força de Laminação', value: p.rollingForce, unit: 'MN' },
                            { variable: 'Torque em Vazio', value: p.vacuumTorque, unit: 'kNm' },
                            { variable: 'Fator de Carga', value: p.loadFactor * 100, unit: '%' },
                        ]).map((row, idx) => <CalcRow key={row.variable} row={row} idx={idx} />)}
                    </GridTable>
                ) : (
                    /* === ABA MOTOR === */
                    <GridTable>
                        <SectionHeader title={motor ? motor.label : 'Motor não associado'} color="orange" />
                        {motor ? ([
                            { variable: 'Potência', value: motor.power, unit: 'kW' },
                            { variable: 'Rotação Nominal', value: motor.nominalRotation, unit: 'rpm' },
                            { variable: 'Rotação Máxima', value: motor.maxRotation, unit: 'rpm' },
                            { variable: 'Relação de Engrenagem', value: motor.gearRatio, unit: '' },
                            { variable: 'Eficiência', value: motor.efficiency, unit: '%' },
                            { variable: 'Torque Nominal', value: motor.nominalTorque, unit: 'kNm' },
                            { variable: 'Torque Máximo', value: motor.maxTorque, unit: 'kNm' },
                        ]).map((row, idx) => <CalcRow key={row.variable} row={row} idx={idx} />) : (
                            <tr><td colSpan={3} className="px-3 py-4 text-xs text-gray-400 text-center">Nenhum motor associado a este trem</td></tr>
                        )}
                    </GridTable>
                )}
            </div>
        </>
    );
};

// ============ VIEW: MOTOR (standalone) ============
const MotorDetailView = ({ motor }: { motor: MotorData }) => {
    const { updateMotor } = useHRS();
    const id = motor.id;

    return (
        <>
            <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Parâmetros: {motor.label}
            </div>
            <div className="flex-1 overflow-auto">
                <GridTable>
                    <SectionHeader title="Dados do Motor" color="orange" />
                    {([
                        { variable: 'Potência', field: 'power' as keyof MotorData, unit: 'kW' },
                        { variable: 'Rotação Nominal', field: 'nominalRotation' as keyof MotorData, unit: 'rpm' },
                        { variable: 'Rotação Máxima', field: 'maxRotation' as keyof MotorData, unit: 'rpm' },
                        { variable: 'Relação de Engrenagem', field: 'gearRatio' as keyof MotorData, unit: '' },
                        { variable: 'Eficiência', field: 'efficiency' as keyof MotorData, unit: '%' },
                    ]).map((row, idx) => (
                        <tr key={row.field} className={`border-b border-gray-200 hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                            <td className="border-r border-gray-200 px-3 py-1.5 text-xs text-gray-800 font-medium">{row.variable}</td>
                            <td className="border-r border-gray-200 px-0 py-0">
                                <EditableCell value={motor[row.field] as number} onChange={v => updateMotor(id, row.field, v)} />
                            </td>
                            <td className="px-3 py-1.5 text-xs text-gray-500">{row.unit}</td>
                        </tr>
                    ))}
                    <SectionHeader title="Valores Calculados" color="green" />
                    {([
                        { variable: 'Torque Nominal', value: motor.nominalTorque, unit: 'kNm' },
                        { variable: 'Torque Máximo', value: motor.maxTorque, unit: 'kNm' },
                    ]).map((row, idx) => <CalcRow key={row.variable} row={row} idx={idx} />)}
                </GridTable>
            </div>
        </>
    );
};

// ============ MAIN DATAGRID ============
export const HRSDataGrid = () => {
    const { project, selectedNode } = useHRS();

    const selectedPass = project.passes.find(p => p.data.id === selectedNode);
    const selectedMotor = project.motors.find(m => m.id === selectedNode);

    const getPassLabel = () => {
        if (!selectedPass) return '';
        const typeLabel = selectedPass.trainType === 'desbaste' ? 'Desbaste' : 'Intermediário';
        return `${typeLabel} #${selectedPass.passNumber}`;
    };

    return (
        <div className="flex-1 bg-white flex flex-col h-full border-r border-gray-300 min-w-0">
            {selectedNode === 'geral' ? (
                <GeneralView />
            ) : selectedNode === 'materia_prima' ? (
                <RawMaterialView />
            ) : selectedNode === 'secao' ? (
                <SectionView />
            ) : selectedNode === 'processo' ? (
                <ProcessView />
            ) : selectedNode === 'perdas' ? (
                <LossesView />
            ) : selectedPass ? (
                <PassDetailView passData={selectedPass.data} passLabel={getPassLabel()} />
            ) : selectedMotor ? (
                <MotorDetailView motor={selectedMotor} />
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                    Selecione um item no navegador
                </div>
            )}
        </div>
    );
};
