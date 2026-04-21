import * as fs from 'fs';
import * as path from 'path';

const jsonDir = path.join(process.cwd(), '../../data/json_extraidos');
const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));

let duplicates = 0;
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(jsonDir, file), 'utf-8'));
  const seenFacturas = new Set();
  if (data.facturas) {
    for (const f of data.facturas) {
      if (seenFacturas.has(f.numeroFactura)) {
        console.log('Duplicate factura in JSON:', f.numeroFactura, 'in file', file);
        duplicates++;
      }
      seenFacturas.add(f.numeroFactura);
    }
  }
}
console.log('Total duplicates:', duplicates);
