import * as fs from 'fs';
import * as path from 'path';

const jsonDir = path.join(process.cwd(), '../../data/json_extraidos');
const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));

let totalFacturado = 0;
let cantFacturas = 0;
let totalRecaudado = 0;
let cantRecaudos = 0;
let totalIva = 0;

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(jsonDir, file), 'utf-8'));
  
  if (data.facturas) {
    for (const f of data.facturas) {
      cantFacturas++;
      totalFacturado += f.total;
      totalIva += (f.iva || 0);
      
      if (f.recaudos) {
        for (const r of f.recaudos) {
          cantRecaudos++;
          totalRecaudado += r.monto;
        }
      }
    }
  }
}

console.log({
  cantFacturas,
  totalFacturado,
  totalSubtotal: totalFacturado - totalIva,
  totalIva,
  cantRecaudos,
  totalRecaudado
});
