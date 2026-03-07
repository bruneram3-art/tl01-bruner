const fs = require('fs');
const path = require('path');

const pdfParse = require('./node_modules/pdf-parse/index.js');

const pdfPath = path.join(__dirname, 'plano de cambio', 'chato 2.pdf');
let dataBuffer = fs.readFileSync(pdfPath);

pdfParse(dataBuffer).then(function (data) {
    console.log("=== TOTAL PÁGINAS:", data.numpages, "===");
    console.log("--- PDF CONTENT START ---");
    console.log(data.text);
    console.log("--- PDF CONTENT END ---");
}).catch(err => {
    console.error("Error parsing PDF:", err.message);
});
