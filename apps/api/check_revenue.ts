import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const jsonDir = path.resolve(__dirname, '../../data/json_extraidos');

async function main() {
  const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(jsonDir, file), 'utf-8'));
    if (!data.fideicomiso || !data.fideicomiso.codigoPrincipal) continue;
    
    const fidCode = data.fideicomiso.codigoPrincipal;
    
    if (fidCode !== 'FA-2594') continue; // only focus on the one with discrepancies
    
    const fid = await prisma.fideicomiso.findUnique({ where: { codigoPrincipal: fidCode } });
    if (!fid) {
      console.log(`${fidCode}: Not found in DB`);
      continue;
    }
    
    const dbFacturas = await prisma.factura.findMany({ where: { fideicomisoId: fid.id }, include: { recaudos: true } });
    const dbFacturasMap = new Set(dbFacturas.map(f => f.numeroFactura));
    
    if (data.facturas) {
      for (const f of data.facturas) {
        if (!dbFacturasMap.has(f.numeroFactura)) {
          console.log(`Missing Factura in DB: ${f.numeroFactura} - Total: ${f.total}`);
        }
      }
    }
    
    // Check if there are facturas in DB but not in JSON
    const jsonFacturasMap = new Set((data.facturas || []).map((f: any) => f.numeroFactura));
    for (const f of dbFacturas) {
      if (!jsonFacturasMap.has(f.numeroFactura)) {
        console.log(`Extra Factura in DB: ${f.numeroFactura} - Total: ${f.total}`);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
