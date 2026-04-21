import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const facturas = await prisma.factura.findMany({
    include: { fideicomiso: true }
  });
  const recaudos = await prisma.recaudo.findMany({
    include: { factura: { include: { fideicomiso: true } } }
  });

  const totalsByFideicomiso: Record<string, { facturado: number, recaudado: number }> = {};

  for (const f of facturas) {
    const code = f.fideicomiso.codigoPrincipal;
    if (!totalsByFideicomiso[code]) totalsByFideicomiso[code] = { facturado: 0, recaudado: 0 };
    totalsByFideicomiso[code].facturado += f.total;
  }

  for (const r of recaudos) {
    const code = r.factura?.fideicomiso?.codigoPrincipal || 'UNKNOWN';
    if (!totalsByFideicomiso[code]) totalsByFideicomiso[code] = { facturado: 0, recaudado: 0 };
    totalsByFideicomiso[code].recaudado += r.monto;
  }

  console.log(totalsByFideicomiso);
}

main().catch(console.error).finally(() => prisma.$disconnect());
