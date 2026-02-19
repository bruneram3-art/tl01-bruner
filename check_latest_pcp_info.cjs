const fs = require('fs');
const path = require('path');

const BASE_NETWORK_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli';

function getMonthName(monthIndex) {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIndex];
}

function checkLatest() {
    console.log('--- Verificando arquivo mais recente na rede ---');
    try {
        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = now.getMonth();
        const monthNum = String(monthIndex + 1).padStart(2, '0');
        const monthName = getMonthName(monthIndex);

        const yearPath = path.join(BASE_NETWORK_PATH, String(year));
        if (!fs.existsSync(yearPath)) {
            console.error(`❌ Pasta do ano não encontrada: ${yearPath}`);
            return;
        }

        const yearDirs = fs.readdirSync(yearPath);
        const monthFolder = yearDirs.find(dir => dir.startsWith(`${monthNum}_`));
        if (!monthFolder) {
            console.error(`❌ Pasta do mês (${monthNum}_) não encontrada em ${yearPath}`);
            return;
        }

        const fullMonthPath = path.join(yearPath, monthFolder);
        const files = fs.readdirSync(fullMonthPath);
        const revRegex = /Revisão_(\d+)/i;

        let latestFile = null;
        let maxRev = -1;

        files.forEach(file => {
            if (!file.endsWith('.xlsx') || file.includes('~$')) return;
            const match = file.match(revRegex);
            if (match) {
                const rev = parseInt(match[1], 10);
                if (rev > maxRev) {
                    maxRev = rev;
                    latestFile = file;
                }
            }
        });

        if (!latestFile) {
            console.error('❌ Nenhum arquivo com "Revisão_XX" encontrado.');
            return;
        }

        const fullFilePath = path.join(fullMonthPath, latestFile);
        const stats = fs.statSync(fullFilePath);

        console.log(`✅ Arquivo Encontrado: ${latestFile}`);
        console.log(`📅 Revisão: ${maxRev}`);
        console.log(`🕒 Modificado em: ${stats.mtime.toLocaleString('pt-BR')}`);
        console.log(`📂 Caminho completo: ${fullFilePath}`);

    } catch (error) {
        console.error('Erro ao verificar:', error.message);
    }
}

checkLatest();
