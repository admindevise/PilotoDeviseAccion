/// <reference types="node" />

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("==========================================");
  console.log("INDICADORES CLAVE (CONSOLIDADO DB)");
  console.log("==========================================");

  const facturas = await prisma.factura.findMany({
    include: {
      recaudos: true
    }
  });

  let totalFacturado = 0;
  let totalRecaudado = 0;
  let totalAdeudado = 0; // Cartera Pendiente
  let totalIntereses = 0; // Not currently tracked in our simple DB schema, but good placeholder
  let numFacturasTotal = facturas.length;
  let numRecaudosTotal = 0;

  for (const f of facturas) {
    totalFacturado += f.total;
    
    let recaudoPorFactura = 0;
    for (const r of f.recaudos) {
      recaudoPorFactura += r.monto;
      numRecaudosTotal++;
    }
    
    totalRecaudado += recaudoPorFactura;
    
    // Simplistic calculation for cartera
    const pendiente = f.total - recaudoPorFactura;
    if (pendiente > 0) {
      totalAdeudado += pendiente;
    }
  }

  const porcentajeRecaudo = totalFacturado > 0 ? (totalRecaudado / totalFacturado) : 0;
  const numFideicomisos = await prisma.fideicomiso.count();

  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  });

  console.log(`TOTAL FACTURADO:     ${formatter.format(totalFacturado)}`);
  console.log(`TOTAL RECAUDADO:     ${formatter.format(totalRecaudado)}`);
  console.log(`CARTERA PENDIENTE:   ${formatter.format(totalAdeudado)}`);
  console.log(`No. FACTURAS TOTAL:  ${numFacturasTotal}`);
  console.log(`% RECAUDO GLOBAL:    ${porcentajeRecaudo.toFixed(4)}`);
  console.log(`FIDEICOMISOS:        ${numFideicomisos}`);
  console.log(`No. RECAUDOS TOTAL:  ${numRecaudosTotal}`);
  console.log("==========================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
