import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("==========================================");
  console.log("REPORTE DE FACTURAS Y RECAUDOS POR FIDEICOMISO");
  console.log("==========================================");

  const fideicomisos = await prisma.fideicomiso.findMany({
    select: {
      id: true,
      codigoPrincipal: true,
      nombre: true,
      _count: {
        select: {
          facturas: true,
        },
      },
    }
  });

  for (const f of fideicomisos) {
    const facturas = await prisma.factura.findMany({
      where: { fideicomisoId: f.id },
      include: {
        _count: {
          select: { recaudos: true }
        }
      }
    });

    let countRecaudos = 0;
    for (const fact of facturas) {
      countRecaudos += fact._count.recaudos;
    }

    console.log(`Fideicomiso: ${f.codigoPrincipal} - ${f.nombre}`);
    console.log(`- Total Facturas: ${f._count.facturas}`);
    console.log(`- Total Recaudos: ${countRecaudos}`);
    console.log("------------------------------------------");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
