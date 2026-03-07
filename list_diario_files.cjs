const fs = require('fs');
const path = require('path');

const DIARIO_DIR = "\\\\brqbnwvfs02vs\\Departamentos\\GEM\\Utilidades\\2026\\03- CONTROLE DE ENERGÉTICOS\\";

function listDiarioFiles() {
    try {
        if (!fs.existsSync(DIARIO_DIR)) {
            console.error('❌ Diretório não encontrado:', DIARIO_DIR);
            return;
        }

        console.log(`--- Arquivos em ${DIARIO_DIR} ---`);
        const files = fs.readdirSync(DIARIO_DIR);

        files.forEach(file => {
            const fullPath = path.join(DIARIO_DIR, file);
            try {
                const stats = fs.statSync(fullPath);
                console.log(`${stats.mtime.toISOString()} | ${file}`);
            } catch (e) {
                console.log(`[Erro ao ler stats] | ${file}`);
            }
        });

    } catch (error) {
        console.error('Erro:', error.message);
    }
}

listDiarioFiles();
