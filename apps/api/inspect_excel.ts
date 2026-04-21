import * as xlsx from 'xlsx';
import * as path from 'path';

const excelPath = path.resolve(__dirname, '../../data/fideicomisos_fuentes/BalancesConsolidado.xlsx');

async function main() {
  console.log(`Reading Excel file: ${excelPath}`);
  
  const workbook = xlsx.readFile(excelPath);
  console.log("Sheet Names:", workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    if (sheetName === 'CONSOLIDADO') continue; // We will look at this separately
    
    console.log(`\n========= Sheet: ${sheetName} =========`);
    const sheet = workbook.Sheets[sheetName];
    // Read the first ~5 rows to see the column structure
    const data = xlsx.utils.sheet_to_json(sheet, { range: 0, header: 1 });
    console.log(data.slice(8, 15));
  }
}

main().catch(console.error);
