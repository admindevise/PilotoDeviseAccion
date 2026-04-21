import { PrismaClient, EstadoResultado } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding mock conciliation data for FA-2594 and FA-5999...');

  // 1. FA-2594 (Hotel Urban Royal 26) - has a conciliation but 0 resultados
  const fid2594 = await prisma.fideicomiso.findUnique({
    where: { codigoPrincipal: 'FA-2594' },
    include: { conciliaciones: true }
  });

  if (fid2594 && fid2594.conciliaciones.length > 0) {
    const conc = fid2594.conciliaciones[0];
    const currResultados = await prisma.resultadoConciliacion.count({ where: { conciliacionId: conc.id } });
    
    if (currResultados === 0) {
      console.log(`Adding mock resultados to FA-2594 Conciliacion ${conc.id}...`);
      await prisma.resultadoConciliacion.createMany({
        data: [
          {
            conciliacionId: conc.id,
            periodo: '2024-10',
            estado: 'DISCREPANCIA' as EstadoResultado,
            montoEsperado: 3900000,
            montoRegistrado: 1300000,
            discrepancia: 2600000,
            evidencia: { lineasRevisadas: [4, 5] },
            razonamiento: 'Facturación por 1 SMMLV en lugar de 3 SMMLV.',
          },
          {
            conciliacionId: conc.id,
            periodo: '2024-10',
            estado: 'OPORTUNIDAD_REVENUE' as EstadoResultado,
            montoEsperado: 1300000,
            montoRegistrado: 0,
            discrepancia: 1300000,
            evidencia: { facturasPendientes: 12 },
            razonamiento: 'Falta cobro de intereses de mora por facturas impagas.',
          },
          {
            conciliacionId: conc.id,
            periodo: '2024-10',
            estado: 'CONCILIADO' as EstadoResultado,
            montoEsperado: 500000,
            montoRegistrado: 500000,
            discrepancia: 0,
            evidencia: { lineasRevisadas: [10] },
            razonamiento: 'Comisión por expedición de certificados cobrada correctamente.',
          }
        ]
      });
    }
  }

  // 2. FA-5999 (Vimarsa) - missing conciliation entirely
  const fid5999 = await prisma.fideicomiso.findUnique({
    where: { codigoPrincipal: 'FA-5999' },
    include: { conciliaciones: true }
  });

  if (fid5999 && fid5999.conciliaciones.length === 0) {
    console.log(`Adding mock Conciliacion to FA-5999...`);
    const newConc = await prisma.conciliacion.create({
      data: {
        fideicomisoId: fid5999.id,
        periodo: '2024-11',
        tipo: 'PERIODICA',
        estado: 'COMPLETADA',
        resumen: { totalEvaluado: 12000000, discrepanciasDetectadas: 2 },
        completadaEn: new Date(),
      }
    });

    await prisma.resultadoConciliacion.createMany({
      data: [
        {
          conciliacionId: newConc.id,
          periodo: '2024-11',
          estado: 'CONCILIADO' as EstadoResultado,
          montoEsperado: 2600000,
          montoRegistrado: 2600000,
          discrepancia: 0,
          evidencia: { pagosRevisados: 1 },
          razonamiento: 'Comisión de administración cobrada de acuerdo a Otrosí.',
        },
        {
          conciliacionId: newConc.id,
          periodo: '2024-11',
          estado: 'DISCREPANCIA' as EstadoResultado,
          montoEsperado: 1950000,
          montoRegistrado: 0,
          discrepancia: 1950000,
          evidencia: { lineasRevisadas: [22] },
          razonamiento: 'No se facturaron las comisiones correspondientes a cesiones de derechos.',
        }
      ]
    });
  }

  console.log('Mock data added successfully.');
}

main()
  .catch((e) => {
    console.error('Error adding mock conciliations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
