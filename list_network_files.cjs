const fs = require('fs');
const path = require('path');

const BASE_NETWORK_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli';

function listAll() {
    try {
        const now = new Date();
        const year = 2026; // Forçano 2026
        const monthNum = '03'; // Forçando Março
        const yearPath = path.join(BASE_NETWORK_PATH, String(year));
        const yearDirs = fs.readdirSync(yearPath);
        const monthFolder = yearDirs.find(dir => dir.startsWith(`${monthNum}_`));

        if (!monthFolder) {
            console.error('❌ Pasta do mês não encontrada');
            return;
        }

        const fullMonthPath = path.join(yearPath, monthFolder);
        console.log(`--- Arquivos em ${fullMonthPath} ---`);
        const files = fs.readdirSync(fullMonthPath);

        files.forEach(file => {
            const fullPath = path.join(fullMonthPath, file);
            const stats = fs.statSync(fullPath);
            console.log(`${stats.mtime.toISOString()} | ${file}`);
        });

    } catch (error) {
        console.error('Erro:', error.message);
    }
}

listAll();
