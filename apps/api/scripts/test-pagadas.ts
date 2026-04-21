import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const facturas = await prisma.factura.findMany({ include: { recaudos: true } });

  let missingPagadas = 0;
  for (const f of facturas) {
    if (f.estado === 'PAGADA') {
      const sum = f.recaudos.reduce((s, r) => s + r.monto, 0);
      if (f.total > sum) {
         missingPagadas += (f.total - sum);
      }
    }
  }
  console.log("Missing amounts in PAGADA facturas: ", missingPagadas);
}

main().catch(console.error).finally(() => prisma.$disconnect());
