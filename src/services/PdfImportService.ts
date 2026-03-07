import * as pdfjsLib from 'pdfjs-dist';

// Use CDN for worker to avoid Vite/bundler configuration issues with web workers
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ImportedPassPlan {
    passNumber: number;
    gaiola: string;
    luzSemCarga: number | null;
    largura: number | null;
    altura: number | null;
    fr: number | null;
    isFlat: boolean;
    isEdge: boolean;
}

export class PdfImportService {
    public static async extractTextFromFile(file: File): Promise<string> {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    }

    public static parseHrcPlan(text: string): ImportedPassPlan[] {
        const plans: ImportedPassPlan[] = [];
        console.log("--- PARSE REGEX (SIMPLIFICADO) ---");

        // Loop direto por gaiolas 1 a 20
        for (let i = 1; i <= 20; i++) {
            // Regex básico para encontrar a gaiola
            const cadRegex = new RegExp(`(?:CAD|G)\\s*0?${i}\\b`, 'i');
            const cadMatch = text.match(cadRegex);

            if (!cadMatch) continue;

            const startIndex = cadMatch.index!;
            const matchedCadText = cadMatch[0];
            // Aumentado afterBlock para 1200 e beforeBlock para 1500 para garantir que pegamos LUZ/L/A/E
            // A LUZ muitas vezes vem bem antes (acima) do CAD no PDF
            const afterBlock = text.substring(startIndex, startIndex + 1200);
            const beforeBlock = text.substring(Math.max(0, startIndex - 1500), startIndex);

            // Verificar se é DUMMY
            if (/DUMMY/i.test(afterBlock.substring(0, 50)) || /DUMMY/i.test(beforeBlock.substring(beforeBlock.length - 50))) {
                console.log(`Passe ${i} ignorado (DUMMY detectado)`);
                continue;
            }

            let luzSemCarga: number | null = null;
            // Tenta pegar LUZ por palavra-chave ou por padrão de cilindro (NC/XXXX/ML + Valor)
            const luzRegex = /LUZ\s*[:\-\s]?\s*([\d,.]+)/i;
            // No acabamento, a luz aparece como "ML   14,5  15,0" ou após o código do cilindro "0159   23,5  24,0"
            const cylinderLuzRegex = /(?:\b\d{4}\b|NC|ML)\s+([\d,.]+)/i;

            const contextForLuz = beforeBlock + afterBlock;
            const luzMatch = contextForLuz.match(luzRegex);
            const cylMatch = contextForLuz.match(cylinderLuzRegex);

            if (luzMatch) {
                luzSemCarga = parseFloat(luzMatch[1].replace(',', '.'));
            } else if (cylMatch) {
                luzSemCarga = parseFloat(cylMatch[1].replace(',', '.'));
            }

            let largura: number | null = null;
            const lMatch = afterBlock.match(/\b(?:L|LARGURA|LARG|WIDTH)\s*[:\-\s]?\s*([\d,.]+)/i);
            if (lMatch) largura = parseFloat(lMatch[1].replace(',', '.'));

            let altura: number | null = null;
            let isFlat = false;
            let isEdge = false;

            // Detectar se o plano é CHATO (CH)
            const isChatoPlan = /CHATO|PADR[ÃA]O:\s*CH\b/i.test(text.substring(0, 2000));

            const aMatch = afterBlock.match(/\b(?:A|ALTURA|ALT|HEIGHT)\s*[:\-\s]?\s*([\d,.]+)/i);
            // Melhorado regex de 'E' para ser mais flexível e aceitar valores imediatos (ex: E15.0)
            const eMatch = afterBlock.match(/\b(?:E|ESPESSURA|ESP|THICKNESS)\s*[:\-\s]?\s*([\d,.]+)/i) ||
                afterBlock.match(/\bE\s?(\d+[.,]\d+)/i);

            if (eMatch) {
                altura = parseFloat(eMatch[1].replace(',', '.'));
                isFlat = true;
            } else if (aMatch) {
                altura = parseFloat(aMatch[1].replace(',', '.'));
            }

            // Detectar flat/borda por keywords explícitas (sem \b para ML pois pode estar colado como MLG7)
            const typeBlock = text.substring(Math.max(0, startIndex - 100), startIndex + 200).toUpperCase();

            if (i >= 7) {
                if (/(?:ML|MESA\s*LISA|CILINDRO|CILIN|CIL|PAR\s*CIL)/i.test(typeBlock)) {
                    isFlat = true;
                }

                const isVertical = /\bV\b|\(\d+-V\)/i.test(afterBlock.substring(0, 100));
                if (/\b(?:BORDA|PASSE\s*BORDA|EDGING|EDGE)\b/i.test(typeBlock)) {
                    isEdge = true;
                } else if (isChatoPlan && isVertical && !isFlat) {
                    isEdge = true;
                }
            } else {
                // No desbaste (G1-G6), só é flat se for explícito e muito próximo
                // Isso evita que a palavra "CILINDROS" do cabeçalho quebre tudo
                if (/\b(?:MESA\s*LISA)\b/i.test(typeBlock)) {
                    isFlat = true;
                }
            }

            const frRegex = /\b(?:FR|REDUÇÃO|REDUÇAO|RED|RED\.)\s*[:\-\s]?\s*([\d,.]+)\s*%/i;
            const frMatch = afterBlock.match(frRegex);
            const fr = frMatch ? parseFloat(frMatch[1].replace(',', '.')) : null;

            plans.push({
                passNumber: i,
                gaiola: matchedCadText.toUpperCase().replace(/\s+/g, ''),
                luzSemCarga,
                largura,
                altura,
                fr,
                isFlat,
                isEdge
            });
        }

        return plans;
    }

    // Método dummy para manter compatibilidade com o resto do código
    public static parseStructuredPlan(lines: any[]): ImportedPassPlan[] {
        const text = lines.map(line => line.map((t: any) => t.text).join(' ')).join('\n');
        return this.parseHrcPlan(text);
    }

    public static async extractStructuredText(file: File): Promise<any[]> {
        const text = await this.extractTextFromFile(file);
        // Simular estrutura mínima apenas para o parseStructuredPlan rodar
        return [[{ text, x: 0, y: 0, width: 0 }]];
    }
}
