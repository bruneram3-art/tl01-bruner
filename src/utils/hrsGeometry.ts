import { PassType } from './hrsTypes';

/**
 * Gera o SVG Path para o contorno do CANAL (Ferramenta)
 * O canal geralmente é maior que a barra e define o limite máximo.
 */
export const getChannelPath = (
    type: PassType,
    width: number,
    height: number,
    radius: number,
    cx: number,
    cy: number
): string => {
    const w = width;
    const h = height;
    const r = radius || 0;

    switch (type) {
        case 'box':
        case 'flat':
            // Retângulo com raio nos cantos (fundo do canal)
            // Desenhando como um container aberto ou fechado? Vamos desenhar fechado para simplificar a visualização da área
            // M x,y ...
            return `
                M ${cx - w / 2 + r},${cy - h / 2}
                H ${cx + w / 2 - r}
                Q ${cx + w / 2},${cy - h / 2} ${cx + w / 2},${cy - h / 2 + r}
                V ${cy + h / 2 - r}
                Q ${cx + w / 2},${cy + h / 2} ${cx + w / 2 - r},${cy + h / 2}
                H ${cx - w / 2 + r}
                Q ${cx - w / 2},${cy + h / 2} ${cx - w / 2},${cy + h / 2 - r}
                V ${cy - h / 2 + r}
                Q ${cx - w / 2},${cy - h / 2} ${cx - w / 2 + r},${cy - h / 2}
                Z
            `;

        case 'oval':
            // Elipse aproximada
            return `
                M ${cx - w / 2},${cy}
                A ${w / 2},${h / 2} 0 1,0 ${cx + w / 2},${cy}
                A ${w / 2},${h / 2} 0 1,0 ${cx - w / 2},${cy}
                Z
            `;

        case 'round':
            return `
                M ${cx - w / 2},${cy}
                A ${w / 2},${w / 2} 0 1,0 ${cx + w / 2},${cy}
                A ${w / 2},${w / 2} 0 1,0 ${cx - w / 2},${cy}
                Z
            `;

        case 'diamond':
        case 'square': // Quadrado diagonal
            // Losango
            return `
                M ${cx},${cy - h / 2}
                L ${cx + w / 2},${cy}
                L ${cx},${cy + h / 2}
                L ${cx - w / 2},${cy}
                Z
            `;

        case 'angle':
            // "L" Channel - Cantoneira
            // Espessura estimada do canal (visual) = 20% da largura
            const t = Math.min(w, h) * 0.2;
            const x = cx - w / 2;
            const y = cy - h / 2;

            // Desenho simplificado de um L com espessura
            return `
                M ${x},${y}
                H ${x + w}
                V ${y + t}
                H ${x + t}
                V ${y + h}
                H ${x}
                Z
            `;

        default:
            return '';
    }
};

/**
 * Gera o SVG Path para a BARRA (Produto)
 * A barra tem dimensões calculadas (widening, elongation) que podem ser menores que o canal.
 */
export const getBarPath = (
    type: PassType,
    width: number,
    height: number,
    cx: number,
    cy: number
): string => {
    // A lógica é similar, mas usa as dimensões REAIS da barra de saída
    return getChannelPath(type, width, height, 0, cx, cy);
};
