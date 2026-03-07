const fs = require('fs');
const path = require('path');

const BASE_NETWORK_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli';

function listPrevias() {
    try {
        const previasPath = path.join(BASE_NETWORK_PATH, '2026', '03_Março', 'Prévias');
        if (!fs.existsSync(previasPath)) {
            console.error('❌ Pasta Prévias não encontrada');
            return;
        }

        console.log(`--- Arquivos em ${previasPath} ---`);
        const files = fs.readdirSync(previasPath);

        files.forEach(file => {
            const fullPath = path.join(previasPath, file);
            const stats = fs.statSync(fullPath);
            console.log(`${stats.mtime.toISOString()} | ${file}`);
        });

    } catch (error) {
        console.error('Erro:', error.message);
    }
}

listPrevias();
