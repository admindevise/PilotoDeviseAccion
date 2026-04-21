import * as xlsx from 'xlsx';
import * as path from 'path';

const excelPath = path.resolve(__dirname, '../../data/fideicomisos_fuentes/BalancesConsolidado.xlsx');
const wb = xlsx.readFile(excelPath);

let b3causadoSum = 0;
let uniqueSet = new Set<string>();
let allFidsCausadoSum = 0;
let allFidsCount = 0;

for (const s of wb.SheetNames) {
    if (s === 'Dashboard' || s === 'CONSOLIDADO') continue;
    const sheet = wb.Sheets[s];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    let dataStartIndex = -1;
    for (let i = 0; i < rows.length; i++) {
        if (rows[i] && rows[i].length > 0 && String(rows[i][0]).toUpperCase().includes('IDENTIFICACION')) {
            dataStartIndex = i + 1; break;
        }
    }

    if(dataStartIndex === -1) continue;

    for(let i = dataStartIndex; i < rows.length; i++) {
        const row = rows[i] as any[];
        let noDcto = String(row[4] || '').trim().toUpperCase();
        const causado = parseFloat(String(row[6]).replace(/[^0-9.-]+/g,"")) || 0;
        
        if (noDcto && !noDcto.startsWith('RCJ') && !noDcto.startsWith('NC') && !noDcto.startsWith('SAF') && !noDcto.includes('SUBTOTAL') && !noDcto.includes('TOTAL') && noDcto !== 'NO. DCTO.') {
            if (!uniqueSet.has(noDcto)) {
                if (s.includes('B3Virrey')) {
                    b3causadoSum += causado;
                }
                allFidsCausadoSum += causado;
                uniqueSet.add(noDcto);
                allFidsCount++;
            }
        }
    }
}
console.log(`Unique Facturas in B3Virrey: (Count logic here is global unique so let's ignore the exact split, B3 sum is: ${b3causadoSum})`);
console.log(`Total Unique Facturas across ALL: ${allFidsCount}`);
console.log(`Sum of Causado for ALL Fideicomisos: ${allFidsCausadoSum}`);
