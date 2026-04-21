import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const code = 'FA-658';
  const facturas = await prisma.factura.findMany({
    where: { fideicomiso: { codigoPrincipal: code } },
    include: { recaudos: true }
  });
  console.log(`Facturas for ${code}:`, facturas.length);
  const sumFacturas = facturas.reduce((sum, f) => sum + f.total, 0);
  console.log(`Sum Total:`, sumFacturas);

  const sumRecaudos = facturas.reduce((s, f) => s + f.recaudos.reduce((sr, r) => sr + r.monto, 0), 0);
  console.log(`Sum Recaudos for these facturas:`, sumRecaudos);

  // Unlinked recaudos?
  const recaudos = await prisma.recaudo.findMany({
    where: { factura: { fideicomiso: { codigoPrincipal: code } } }
  });
  console.log(`Total Recaudos for ${code}:`, recaudos.length);
  const totalSumRecaudos = recaudos.reduce((sum, r) => sum + r.monto, 0);
  console.log(`Total Sum Recaudos:`, totalSumRecaudos);
}

main().catch(console.error).finally(() => prisma.$disconnect());
