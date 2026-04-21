import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all conciliaciones...');

  const conciliaciones = await prisma.conciliacion.findMany({
    include: {
      resultados: true,
      fideicomiso: {
        include: {
          hallazgos: true,
        },
      },
    },
  });

  console.log(`Found ${conciliaciones.length} conciliaciones.`);

  for (const conc of conciliaciones) {
    const totalReglas = conc.resultados.length;
    const conciliados = conc.resultados.filter((r) => r.estado === 'CONCILIADO').length;
    const discrepancias = conc.resultados.filter((r) => r.estado === 'DISCREPANCIA' || r.estado === 'ANOMALIA' || r.estado === 'OPORTUNIDAD_REVENUE').length;

    const hallazgos = conc.fideicomiso?.hallazgos?.length || 0;
    const oportunidades = conc.fideicomiso?.hallazgos?.filter(h => h.categoria === 'REVENUE' || h.tipo === 'OPORTUNIDAD_REVENUE' || h.subcategoria === 'REVENUE_NO_CAPTURADO' || h.subcategoria === 'CARTERA_VENCIDA').length || 0;

    // keep existing resumen data if any, but override these 3 fields
    const currentResumen = typeof conc.resumen === 'object' && conc.resumen !== null ? conc.resumen : {};
    
    const updatedResumen = {
      ...currentResumen,
      totalReglas,
      conciliados,
      discrepancias,
      hallazgos,
      oportunidades,
    };

    console.log(`Updating Conciliacion ${conc.id} - ${conc.periodo}: ${totalReglas} Reglas, ${hallazgos} Hallazgos, ${oportunidades} Oportunidades`);

    await prisma.conciliacion.update({
      where: { id: conc.id },
      data: {
        resumen: updatedResumen,
      },
    });
  }

  console.log('Update completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error updating conciliaciones:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
