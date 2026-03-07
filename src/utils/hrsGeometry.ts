import { PassType } from './hrsTypes';

/**
 * Calcula ângulo de flanco dinâmico para canais trapezoidais (Box/Flat).
 */
function calculateFlankAngle(channelDepth: number, type: PassType): number {
    const baseAngle = type === 'flat' ? 2 : 7; // graus
    const depthFactor = Math.min(channelDepth / 60, 1.2);
    const angle = baseAngle + depthFactor * 10;
    return angle * (Math.PI / 180);
}

/**
 * Geometria de Engenharia v2.0 (Determinística)
 * Usa exatamente as dimensões importadas (sem dilatação térmica ou fatores inventados).
 */
export const calculateEngineeredChannel = (
    type: PassType,
    barWidth: number,
    barHeight: number,
    thermalFactor: number = 1.0 // Abandoned, kept for API compatibility
) => {
    // Usamos os valores EXATOS, como o usuário importou no PDF.
    const w = barWidth;
    const h = barHeight;

    let toolW = w;
    let toolH = h;
    let flankAngle = 0;

    const channelDepth = h / 2;

    switch (type) {
        case 'box':
        case 'square':
            flankAngle = calculateFlankAngle(channelDepth, type);
            // Largura do topo da estria (flancos)
            break;
        case 'flat':
            flankAngle = calculateFlankAngle(channelDepth, type);
            break;
        // Demais canais apenas usam W e H exatos
    }

    return { toolW, toolH, flankAngle };
};

export const getChannelPath = (
    type: PassType,
    barWidth: number,
    barHeight: number,
    radius: number,
    cx: number,
    cy: number
): string => {
    // Usamos altura/largura diretamente para o desenho do canal
    const { toolW, toolH, flankAngle } = calculateEngineeredChannel(type, barWidth, barHeight);

    switch (type) {
        case 'flat': {
            const h = toolH;
            const wBase = toolW;
            const collar = 150; // Mesa lisa é muito larga

            const yTop = cy - h / 2;
            const yBottom = cy + h / 2;

            // Retorna duas linhas paralelas (o topo e o fundo da mesa lisa)
            return `M ${cx - wBase / 2 - collar},${yTop} H ${cx + wBase / 2 + collar} M ${cx - wBase / 2 - collar},${yBottom} H ${cx + wBase / 2 + collar}`;
        }
        case 'box':
        case 'square': {
            const h = toolH;
            const wBase = toolW;
            const deltaX = (h / 2) * Math.tan(flankAngle);
            const topW = wBase + deltaX * 2;
            const collar = 40;

            const yTop = cy - h / 2;
            const yBottom = cy + h / 2;
            const r = Math.min(radius || 4, wBase / 4);

            return `M ${cx - topW / 2 - collar},${yTop} H ${cx - topW / 2} L ${cx - wBase / 2},${yBottom - r} Q ${cx - wBase / 2},${yBottom} ${cx - wBase / 2 + r},${yBottom} H ${cx + wBase / 2 - r} Q ${cx + wBase / 2},${yBottom} ${cx + wBase / 2},${yBottom - r} L ${cx + topW / 2},${yTop} H ${cx + topW / 2 + collar} M ${cx - topW / 2 - collar},${yTop} H ${cx + topW / 2 + collar}`;
        }

        case 'oval':
        case 'swedish_oval':
        case 'edge_oval': {
            const collar = 30;
            // Arco para oval
            return `M ${cx - toolW / 2 - collar},${cy} H ${cx - toolW / 2} Q ${cx},${cy + toolH} ${cx + toolW / 2},${cy} H ${cx + toolW / 2 + collar} M ${cx - toolW / 2 - collar},${cy} H ${cx - toolW / 2} Q ${cx},${cy - toolH} ${cx + toolW / 2},${cy} H ${cx + toolW / 2 + collar}`;
        }

        case 'round': {
            const collar = 25;
            const R = toolW / 2;
            return `M ${cx - R - collar},${cy} H ${cx - R} A ${R},${R} 0 0,0 ${cx + R},${cy} H ${cx + R + collar} M ${cx - R - collar},${cy} H ${cx - R} A ${R},${R} 0 0,1 ${cx + R},${cy} H ${cx + R + collar}`;
        }

        default:
            return `M ${cx - barWidth},${cy} H ${cx + barWidth}`;
    }
};

export const getBarPath = (
    type: PassType,
    width: number,
    height: number,
    cx: number,
    cy: number
): string => {
    // Garantimos que a barra no desenho seja SEMPRE condizente com o tipo de canal
    switch (type) {
        case 'round': {
            const r = Math.min(width, height) / 2;
            return `M ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} Z`;
        }
        case 'oval':
        case 'swedish_oval':
        case 'edge_oval': {
            const rx = width / 2;
            const ry = height / 2;
            return `M ${cx - rx},${cy} A ${rx},${ry} 0 1,0 ${cx + rx},${cy} A ${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`;
        }
        case 'diamond': {
            return `M ${cx},${cy - height / 2} L ${cx + width / 2},${cy} L ${cx},${cy + height / 2} L ${cx - width / 2},${cy} Z`;
        }
        default: {
            // Box, Square, Flat
            const r = Math.min(2, width * 0.05);
            const x = cx - width / 2;
            const y = cy - height / 2;
            return `M ${x + r},${y} h ${width - 2 * r} a ${r},${r} 0 0 1 ${r},${r} v ${height - 2 * r} a ${r},${r} 0 0 1 -${r},${r} h ${-(width - 2 * r)} a ${r},${r} 0 0 1 -${r},-${r} v ${-(height - 2 * r)} a ${r},${r} 0 0 1 ${r},-${r} Z`;
        }
    }
};

