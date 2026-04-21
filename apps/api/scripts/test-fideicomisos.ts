import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const facturas = await prisma.factura.findMany({ include: { recaudos: true } });

  let facturadoAll = 0;
  let recaudadoExpectedLike = 0;
  let carteraExpectedLike = 0;

  for (const f of facturas) {
    facturadoAll += f.total;
    
    const recSum = f.recaudos.reduce((s, r) => s + r.monto, 0);

    // Maybe recaudado is not capped? What if we don't cap?
    // What if the user ignores overpayments?
    // Let's cap at f.total, BUT do we ignore negative?
    
    // What if Recaudado includes ONLY recaudos from PAGADA, PARCIAL, PENDIENTE?
    // Or what if we just print the difference per Fideicomiso?
  }

  const fids = {};
  for(const f of facturas) {
    if(!fids[f.fideicomisoId]) fids[f.fideicomisoId] = { facturado: 0, recaudado: 0, cartera: 0, carteraCapped: 0, recaudosRaw: 0 };
    fids[f.fideicomisoId].facturado += f.total;
    const rec = f.recaudos.reduce((s, r) => s + r.monto, 0);
    fids[f.fideicomisoId].recaudosRaw += rec;
    fids[f.fideicomisoId].recaudado += Math.min(f.total, rec);
    if(f.total > rec && !f.estado.startsWith('ANULADA')) {
      fids[f.fideicomisoId].cartera += (f.total - rec);
    }
  }

  const fidNames = await prisma.fideicomiso.findMany();
  for(const fn of fidNames) {
    if(fids[fn.id]) {
      console.log(fn.codigoPrincipal);
      console.log("  Facturado: ", fids[fn.id].facturado);
      console.log("  Rec Raw:   ", fids[fn.id].recaudosRaw);
      console.log("  Rec Capped:", fids[fn.id].recaudado);
      console.log("  Cartera:   ", fids[fn.id].cartera);
    }
  }

}

main().catch(console.error).finally(() => prisma.$disconnect());
