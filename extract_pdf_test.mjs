import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFParser from 'pdf2json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pdfPath = path.join(__dirname, 'plano de cambio', 'chato 2.pdf');

const pdfParser = new PDFParser(this, 1);

pdfParser.on("pdfParser_dataError", errData => console.error("Error parsing pdf", errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    const textData = pdfParser.getRawTextContent();
    console.log("--- PDF TEXT BEGIN ---");
    console.log(textData);
    console.log("--- PDF TEXT END ---");
});

console.log("Loading PDF from:", pdfPath);
pdfParser.loadPDF(pdfPath);
