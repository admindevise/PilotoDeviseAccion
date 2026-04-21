import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const facturas = await prisma.factura.findMany({ include: { recaudos: true } });

  let facturadoAll = 0;
  let carteraAll = 0;
  let recaudadoCappedAll = 0;
  let recaudadoRawAll = 0;

  for (const f of facturas) {
    const recSum = f.recaudos.reduce((s, r) => s + r.monto, 0);

    // Summing everything blindly
    facturadoAll += f.total;
    recaudadoRawAll += recSum;
    
    // Cartera = max(0, total - recaudo) taking ALL facturas
    if (f.total > recSum) {
      carteraAll += (f.total - recSum);
    }

    recaudadoCappedAll += Math.min(f.total, recSum);
  }

  console.log("Facturado All:       ", facturadoAll);
  console.log("Recaudado Raw All:   ", recaudadoRawAll);
  console.log("Recaudado Capped All:", recaudadoCappedAll);
  console.log("Cartera All:         ", carteraAll);
  
  console.log("\nWhat if we exclude ANULADAS for Cartera?");
  let carteraActive = 0;
  let facturadoActive = 0;
  let recaudadoRawActive = 0;
  
  for (const f of facturas) {
    if (f.estado.startsWith('ANULADA')) continue;
    
    const recSum = f.recaudos.reduce((s, r) => s + r.monto, 0);
    facturadoActive += f.total;
    recaudadoRawActive += recSum;
    
    if (f.total > recSum) {
      carteraActive += (f.total - recSum);
    }
  }

  console.log("Facturado Active:    ", facturadoActive);
  console.log("Recaudado Raw Active:", recaudadoRawActive);
  console.log("Cartera Active:      ", carteraActive);

  console.log("\nExpected Facturado: 2283819620");
  console.log("Expected Recaudado: 2107478505");
  console.log("Expected Cartera:   212695281");
}

main().catch(console.error).finally(() => prisma.$disconnect());
