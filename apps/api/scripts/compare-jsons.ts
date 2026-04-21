import * as fs from 'fs';
import * as path from 'path';

function getTotals(filePath: string) {
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let facturado = 0;
  let recaudado = 0;
  let pending_strict = 0; // only pending items
  
  if (data.facturas) {
    const factMap = new Map();
    for (const f of data.facturas) {
      if (factMap.has(f.numeroFactura)) {
        factMap.get(f.numeroFactura).recaudos.push(...(f.recaudos || []));
      } else {
        const nf = JSON.parse(JSON.stringify(f));
        if (!nf.recaudos) nf.recaudos = [];
        factMap.set(f.numeroFactura, nf);
      }
    }
    for (const f of factMap.values()) {
      const invTotal = f.total ? f.total : ((f.monto || 0) + (f.iva || 0));
      let invRec = 0;
      for (const r of f.recaudos) {
        invRec += r.monto;
        recaudado += r.monto;
      }
      // only include non-anuladas
      if (f.estado !== 'ANULADA' && f.estado !== 'ANULADA_NC') {
         facturado += invTotal;
         
         if (f.estado === 'PENDIENTE') {
            pending_strict += invTotal;
         } else if (f.estado === 'PARCIAL') {
            pending_strict += Math.max(0, invTotal - invRec);
         }
      }
    }
  }
  return { id: data.fideicomiso?.codigoPrincipal || 'UNKNOWN', facturado, recaudado, pending_strict };
}

const dir = path.resolve(__dirname, '../../../data/json_extraidos');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let totalF = 0;
let totalR = 0;
let totalP = 0;
for (const f of files) {
  const t = getTotals(path.join(dir, f));
  if (t) {
    console.log(t);
    totalF += t.facturado;
    totalR += t.recaudado;
    totalP += t.pending_strict;
  }
}
console.log({ totalFacturado: totalF, totalRecaudado: totalR, carteraPendiente: totalP });
