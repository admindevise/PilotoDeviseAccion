import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('======================================================');
  console.log('🔄 INICIANDO RESET DE HALLAZGOS Y BITÁCORA');
  console.log('======================================================\n');

  console.log('1. Eliminando todos los hallazgos actuales (esto borrará la bitácora por cascada)...');
  await prisma.hallazgo.deleteMany({});
  console.log('✅ Hallazgos y bitácoras eliminadas.\n');

  console.log('2. Recreando 2 hallazgos mock iniciales de FA-5999 (del seed original)...');
  const fid1 = await prisma.fideicomiso.findUnique({ where: { codigoPrincipal: 'FA-5999' }});
  
  if (fid1) {
    const res1 = await prisma.resultadoConciliacion.findFirst({
      where: { estado: 'OPORTUNIDAD_REVENUE', montoEsperado: 1950000 }
    });
    const res2 = await prisma.resultadoConciliacion.findFirst({
      where: { estado: 'OPORTUNIDAD_REVENUE', montoEsperado: 2600000 }
    });

    if (res1) {
      await prisma.hallazgo.create({
        data: {
          fideicomisoId: fid1.id,
          resultadoConciliacionId: res1.id,
          tipo: 'COMISION_NO_FACTURADA',
          severidad: 'ALTO',
          categoria: 'REVENUE',
          area: 'FACTURACION',
          titulo: 'Comisión por cesión de derechos fiduciarios omitida',
          descripcion: 'No se facturaron las comisiones correspondientes a 3 cesiones de derechos fiduciarios durante el mes de Octubre 2024.',
          razonamiento: 'Se detectaron movimientos notariales de cesión (3 eventos) que según la cláusula cuarta ameritan facturación independiente que no figura en la cuenta PUC 4150.',
          fuentes: ['Extracto Bancario Bancolombia Octubre', 'Registro de Cesiones Notaría 45'],
          impactoEconomico: 1950000,
          estado: 'ABIERTO',
        }
      });
    }

    if (res2) {
      await prisma.hallazgo.create({
        data: {
          fideicomisoId: fid1.id,
          resultadoConciliacionId: res2.id,
          tipo: 'COMISION_NO_FACTURADA',
          severidad: 'MEDIO',
          categoria: 'REVENUE',
          area: 'COMERCIAL',
          titulo: 'Omisión en cobro por firma de acuerdos paralelos',
          descripcion: 'Se gestionaron 2 acuerdos paralelos comerciales que no causaron la comisión preestablecida.',
          razonamiento: 'La auditoría de contratos reportó la firma de contratos de arrendamiento bajo el fideicomiso FA-5999, para los cuales no se generó instrucción de cobro fiduciario.',
          fuentes: ['Matriz de Contratos Vimarsa', 'ERP Cuentas por Cobrar'],
          impactoEconomico: 2600000,
          estado: 'ABIERTO',
        }
      });
    }
    console.log('✅ Hallazgos mock recreados.\n');
  } else {
    console.log('⚠️ No se encontró FA-5999 para hallazgos mock.\n');
  }

  const scripts = [
    { name: 'Vimarsa (FA-5999)', file: 'seed_fa5999.ts' },
    { name: 'Hotel B3 Virrey (FA-658)', file: 'seed_fa658.ts' },
    { name: 'Tío Conejo', file: 'seed_tio_conejo.ts' },
    { name: 'Sautari (FA-5931)', file: 'seed_sautari.ts' },
    { name: 'Royal 26 (FA-44764)', file: 'seed_44764.ts' },
    { name: 'Hallazgos Extra (Discrepancias)', file: 'seed_hallazgos_extra.ts' },
    { name: 'Hallazgos Contables (Automáticos)', file: 'seed_hallazgos_contables.ts' }
  ];

  console.log('3. Ejecutando scripts de seed de hallazgos...\n');
  
  for (const script of scripts) {
    console.log(`⏳ Ejecutando: ${script.name}...`);
    try {
      execSync(`npx ts-node ${path.join(__dirname, script.file)}`, { stdio: 'inherit' });
      console.log(`✅ ${script.name} completado.\n`);
    } catch (error) {
      console.error(`❌ Error en ${script.name}:`, error.message);
    }
  }

  console.log('======================================================');
  console.log('🎉 RESET DE HALLAZGOS FINALIZADO EXITOSAMENTE');
  console.log('======================================================');
}

main()
  .catch((e) => {
    console.error('Error general durante el reset:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
