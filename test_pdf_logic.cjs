
const fs = require('fs');

/**
 * Simulação refinada do PdfImportService com proteção de desbaste
 */
function testParseHrcPlan(text) {
    const plans = [];
    const isChatoPlan = /CHATO|PADR[ÃA]O:\s*CH\b/i.test(text.substring(0, 1500));

    console.log("Plano Chato detectado:", isChatoPlan);

    for (let i = 1; i <= 15; i++) {
        const cadRegex = new RegExp(`(?:CAD|G|MLG)\\s*0?${i}\\b`, 'i');
        const cadMatch = text.match(cadRegex);

        if (!cadMatch) continue;

        const startIndex = cadMatch.index;
        const matchedCadText = cadMatch[0];
        const afterBlock = text.substring(startIndex, startIndex + 500);

        // Novo range de busca (100 antes, 200 depois)
        const typeBlock = text.substring(Math.max(0, startIndex - 100), startIndex + 200).toUpperCase();

        let isFlat = false;
        let isEdge = false;

        // E Match (Altura de mesa lisa)
        const eMatch = afterBlock.match(/\b(?:E|ESPESSURA|ESP|THICKNESS)\s*[:\-\s]?\s*([\d,.]+)/i);
        if (eMatch) isFlat = true;

        if (i >= 7) {
            // No acabamento, aceitamos o raio ampliado
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
            // No desbaste, ignoramos CILINDRO do cabeçalho
            if (/\b(?:MESA\s*LISA)\b/i.test(typeBlock)) {
                isFlat = true;
            }
        }

        plans.push({
            passNumber: i,
            gaiola: matchedCadText,
            isFlat,
            isEdge,
            orientation: /\bV\b|\(\d+-V\)/i.test(afterBlock.substring(0, 100)) ? 'V' : 'H'
        });
    }
    return plans;
}

const pdfText = fs.readFileSync('c:/Users/40000398/OneDrive - ArcelorMittal/Desktop/n8n/parsed_pdf.txt', 'utf8');
const results = testParseHrcPlan(pdfText);

console.log("\n--- RESULTADOS DO TESTE DE PROTEÇÃO DO DESBASTE ---");
results.forEach(p => {
    let type = "Caixa/Quadrado (Padrão)";
    if (p.isFlat) type = "Mesa Lisa (Flat)";
    else if (p.isEdge) type = "Passe Borda (Edge)";

    console.log(`Gaiola ${p.passNumber} (${p.orientation}): ${type} [Ref: ${p.gaiola}]`);
});

const g1 = results.find(r => r.passNumber === 1);
const g2 = results.find(r => r.passNumber === 2);
const g7 = results.find(r => r.passNumber === 7);
const g8 = results.find(r => r.passNumber === 8);

console.log("\n--- VALIDAÇÃO FINAL ---");
if (g1 && !g1.isFlat) console.log("✅ G1 protegida (não é Flat).");
else console.log("❌ G1 FALHOU: Ficou como Flat.");

if (g2 && !g2.isEdge) console.log("✅ G2 protegida (não é Borda).");
else console.log("❌ G2 FALHOU: Ficou como Borda.");

if (g7 && g7.isFlat) console.log("✅ G7 mantida como Mesa Lisa.");
else console.log("❌ G7 FALHOU: Deveria ser Mesa Lisa.");

if (g8 && g8.isEdge) console.log("✅ G8 mantida como Borda.");
else console.log("❌ G8 FALHOU: Deveria ser Borda.");
