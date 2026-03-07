import * as pdfjsLib from 'pdfjs-dist';
import * as fs from 'fs';

// This is a scratch script intended to be run in a node environment
// to debug the PDF text extraction output.
async function debugPdf(filePath: string) {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    console.log(`--- DEBUG PDF: ${filePath} ---`);
    console.log(`Pages: ${pdf.numPages}`);

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        console.log(`\n--- PAGE ${i} ---`);
        console.log(pageText);
    }
}

// Since we are in a browser-based project, we'll try to use a similar logic
// but as a standalone node script we might need to install dependencies.
// Instead, I will create a temporary TS file to analyze the logic.
