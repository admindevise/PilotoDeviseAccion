import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fid = await prisma.fideicomiso.findFirst({
    where: { codigoPrincipal: 'FA-2594' },
    include: { conocimiento: true }
  });

  if (!fid) {
    console.log('Fideicomiso FA-2594 no encontrado');
    return;
  }

  console.log(`FA-2594 tiene ${fid.conocimiento.length} entradas de conocimiento.`);

  if (fid.conocimiento.length === 0) {
    console.log('Generando entradas de conocimiento para FA-2594...');
    await prisma.entradaConocimiento.createMany({
      data: [
        {
          fideicomisoId: fid.id,
          tipo: 'REGLA_NEGOCIO',
          titulo: 'Facturación por Sub-arrendamiento Comercial',
          contenido: 'La convención de facturación con el operador matriz indica que si excede ocupación 80% anualizada, se debe facturar recargo del 2% al mes vencido.',
          metadatos: { origen: 'Contrato Hotelero', area: 'Facturación' },
          fuentes: { contrto: 'OTROSI-2' }
        },
        {
          fideicomisoId: fid.id,
          tipo: 'RESOLUCION_HALLAZGO',
          titulo: 'Procedimiento de Subfacturación Masiva',
          contenido: 'Se estableció como protocolo cruzar mensualmente las facturas reales emitidas contra la base gravable proyectada en el anexo de concesión para evitar los huecos fiscales detectados en 2024.',
          metadatos: { origen: 'Auditoría', impacto: 'Critico' },
          fuentes: { hallazgo: 'Subfacturacion de 101 meses' }
        }
      ]
    });
    console.log('Entradas generadas con éxito.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
