import * as fs from 'fs';
import * as path from 'path';

const jsonPath = path.join(process.cwd(), '../../data/json_extraidos/auditoria_44764_v3.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

const facturasByNumber: Record<string, any[]> = {};
if (data.facturas) {
  for (const f of data.facturas) {
    if (!facturasByNumber[f.numeroFactura]) facturasByNumber[f.numeroFactura] = [];
    facturasByNumber[f.numeroFactura].push(f);
  }
}

for (const num of Object.keys(facturasByNumber)) {
  const items = facturasByNumber[num];
  if (items.length > 1) {
    console.log(`\n--- Factura ${num} (${items.length} items) ---`);
    let sumTotal = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      console.log(`Item ${i + 1}: Concepto = "${it.concepto}", Total = ${it.total}, Recaudos = ${it.recaudos ? it.recaudos.length : 0}`);
      sumTotal += it.total;
    }
    console.log(`  => Suma Total de items: ${sumTotal}`);
  }
}
