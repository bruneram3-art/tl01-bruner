const fs = require('fs');
const path = require('path');

const PARENT_DIR = "\\\\brqbnwvfs02vs\\Departamentos\\GEM\\Utilidades\\2026\\";

function listParent() {
    try {
        if (!fs.existsSync(PARENT_DIR)) {
            console.error('❌ Diretório não encontrado:', PARENT_DIR);
            return;
        }

        console.log(`--- Arquivos em ${PARENT_DIR} ---`);
        const items = fs.readdirSync(PARENT_DIR);

        items.forEach(item => {
            const fullPath = path.join(PARENT_DIR, item);
            try {
                const stats = fs.statSync(fullPath);
                console.log(`${stats.mtime.toISOString()} | ${stats.isDirectory() ? '[DIR]' : '     '} | ${item}`);
            } catch (e) {
                console.log(`[Erro] | ${item}`);
            }
        });

    } catch (error) {
        console.error('Erro:', error.message);
    }
}

listParent();
