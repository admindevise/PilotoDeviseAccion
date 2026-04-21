import * as xlsx from 'xlsx';
import * as path from 'path';

const excelPath = path.resolve(__dirname, '../../data/fideicomisos_fuentes/BalancesConsolidado.xlsx');

async function main() {
    const wb = xlsx.readFile(excelPath);
    let otherTypes = new Set();
    
    for (const s of wb.SheetNames) {
        if(s === 'Dashboard' || s === 'CONSOLIDADO') continue;
        const sheet = wb.Sheets[s];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        let dataStartIndex = -1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i] && rows[i].length > 0 && String(rows[i][0]).toUpperCase().includes('IDENTIFICACION')) {
                dataStartIndex = i + 1; break;
            }
        }
        if (dataStartIndex === -1) continue;

        for(let i = dataStartIndex; i < rows.length; i++) {
            let noDcto = String(rows[i][4] || '').trim().toUpperCase();
            if(!noDcto || noDcto === 'UNDEFINED' || noDcto === 'NULL') continue;

            if (!noDcto.startsWith('F') && !noDcto.startsWith('RCJ') && !noDcto.startsWith('NC') && !noDcto.startsWith('SAF') && !noDcto.includes('SUBTOTAL') && !noDcto.includes('TOTAL') && noDcto !== 'NO. DCTO.') {
                otherTypes.add({ sheet: s, doc: noDcto, desc: rows[i][5] });
            }
        }
    }
    console.log('Other items found:');
    console.log(Array.from(otherTypes).slice(0, 50));
}

main().catch(console.error);
