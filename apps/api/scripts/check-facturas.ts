import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const facturas = await prisma.factura.findMany();
  console.log("Facturas:", facturas.length);
  const recaudos = await prisma.recaudo.findMany();
  console.log("Recaudos:", recaudos.length);
  const totalFacturado = facturas.reduce((sum, f) => sum + f.total, 0);
  const totalRecaudado = recaudos.reduce((sum, r) => sum + r.monto, 0);
  console.log("Total Facturado:", totalFacturado);
  console.log("Total Recaudado:", totalRecaudado);
}
main().catch(console.error).finally(() => prisma.$disconnect());
