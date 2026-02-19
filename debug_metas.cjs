const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Base path configuration
const BASE_NETWORK_PATH = '\\\\brqbnwvfs02vs\\Publico\\Pcp\\Programação da Produção\\Danieli';

function getMonthName(monthIndex) {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIndex];
}

function findLatestFile() {
    console.log('--- Iniciando busca dinâmica de arquivo ---');
    try {
        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = now.getMonth(); // 0-11
        const monthNum = String(monthIndex + 1).padStart(2, '0');
        const monthName = getMonthName(monthIndex);

        // 1. Build Year Path
        const yearPath = path.join(BASE_NETWORK_PATH, String(year));
        console.log(`1. Buscando pasta do ano: ${yearPath}`);

        if (!fs.existsSync(yearPath)) {
            console.error(`❌ Pasta do ano não encontrada: ${yearPath}`);
            return null;
        }

        // 2. Find Month Folder (looks for "02_*" format)
        const yearDirs = fs.readdirSync(yearPath);
        const monthFolder = yearDirs.find(dir => dir.startsWith(`${monthNum}_`));

        if (!monthFolder) {
            console.error(`❌ Pasta do mês (iniciando com ${monthNum}_) não encontrada em ${yearPath}`);
            return null;
        }

        const fullMonthPath = path.join(yearPath, monthFolder);
        console.log(`2. Pasta do mês encontrada: ${fullMonthPath}`);

        // 3. Find Latest Revision File
        // Pattern: looks for "Revisão_XX" in the filename
        const files = fs.readdirSync(fullMonthPath);
        const revRegex = /Revisão_(\d+)/i;

        let latestFile = null;
        let maxRev = -1;

        files.forEach(file => {
            if (!file.endsWith('.xlsx') || file.includes('~$')) return; // Ignore temps/non-excel

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
            return null;
        }

        const fullFilePath = path.join(fullMonthPath, latestFile);
        console.log(`3. Arquivo mais recente: ${latestFile} (Rev ${maxRev})`);

        return {
            path: fullFilePath,
            metadata: {
                year,
                month: monthName,
                revision: maxRev,
                source: fullFilePath
            }
        };

    } catch (error) {
        console.error('Erro na resolução do caminho:', error.message);
        return null;
    }
}

// Main execution
const fileInfo = findLatestFile();

if (fileInfo) {
    const FILE_PATH = fileInfo.path;

    console.log('\n--- Metadados Extraídos ---');
    console.log(`Mês de Referência: ${fileInfo.metadata.month}`);
    console.log(`Ano: ${fileInfo.metadata.year}`);
    console.log(`Revisão: ${fileInfo.metadata.revision}`);
    console.log(`Origem: ${fileInfo.metadata.source}`);
    console.log('---------------------------\n');

    console.log(`Lendo conteúdo do arquivo...`);

    try {
        const workbook = XLSX.readFile(FILE_PATH);
        console.log('Abas disponíveis:', workbook.SheetNames);

        // Tenta encontrar uma aba que pareça ser a de dados
        // Palavras-chave: "Base", "Dados", "Geral", "Planilha", "LCP"
        const potentialSheets = ['Base', 'Dados', 'Geral', 'Planilha', 'Detalhado', 'Programação'];
        let targetSheet = workbook.SheetNames.find(name =>
            potentialSheets.some(keyword => name.toLowerCase().includes(keyword.toLowerCase()))
        );

        if (!targetSheet) {
            console.log('⚠️ Nenhuma aba óbvia encontrada. Lendo a segunda aba (índice 1) se existir...');
            targetSheet = workbook.SheetNames.length > 1 ? workbook.SheetNames[1] : workbook.SheetNames[0];
        }

        console.log(`\nLendo aba: ${targetSheet}`);
        const worksheet = workbook.Sheets[targetSheet];

        // Lê como array de arrays para ver a estrutura crua
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log(`Total de linhas (raw): ${rawData.length}`);

        console.log('\n--- Primeiras 10 linhas (Raw) ---');
        rawData.slice(0, 10).forEach((row, i) => {
            console.log(`Linha ${i}:`, JSON.stringify(row));
        });

    } catch (err) {
        console.error('Erro ao ler arquivo Excel:', err.message);
    }
} else {
    console.log('Aborted due to file lookup failure.');
}
