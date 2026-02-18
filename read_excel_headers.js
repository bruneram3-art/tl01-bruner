
import xlsx from 'xlsx';
const { readFile, utils } = xlsx;
import { join } from 'path';

const filePath = join(process.cwd(), 'meta lcp.xlsx');
try {
    const workbook = readFile(filePath);
    console.log('Sheets:', workbook.SheetNames);

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n--- Sheet: ${sheetName} ---`);
        if (data.length > 0) {
            console.log('Headers:', data[0]);
            console.log('First Row:', data[1]);
        } else {
            console.log('Empty sheet');
        }
    });
} catch (error) {
    console.error('Error reading file:', error.message);
}
