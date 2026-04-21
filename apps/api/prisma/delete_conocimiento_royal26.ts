import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fid = await prisma.fideicomiso.findFirst({
    where: { codigoPrincipal: 'FA-2594' },
  });

  if (!fid) {
    console.log('Fideicomiso FA-2594 no encontrado');
    return;
  }

  const deleted = await prisma.entradaConocimiento.deleteMany({
    where: {
      fideicomisoId: fid.id,
      titulo: {
        in: [
          'Facturación por Sub-arrendamiento Comercial',
          'Procedimiento de Subfacturación Masiva'
        ]
      }
    }
  });

  console.log(`Borradas ${deleted.count} entradas sintéticas de FA-2594.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
