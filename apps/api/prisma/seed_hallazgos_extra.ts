import { PrismaClient, TipoHallazgo, SeveridadHallazgo, CategoriaHallazgo, AreaHallazgo } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding extra balance hallazgos...');

  const b3VirreyId = '3d953993-a347-4c75-9754-a5b005d90e56';
  const royal26Id = '465a0959-21b0-42ed-86b0-58af56dab018';

  const newHallazgos = [
    {
      fideicomisoId: b3VirreyId,
      tipo: TipoHallazgo.DISCREPANCIA_MONTO,
      severidad: SeveridadHallazgo.ALTO,
      categoria: CategoriaHallazgo.CONSISTENCIA,
      area: AreaHallazgo.CONTABILIDAD,
      titulo: 'Discrepancia en saldos: Comisiones causadas vs pagadas (Deuda 0)',
      descripcion: 'Se encontró una discrepancia de $42,710,388. El extracto de comisiones causadas y pagadas arroja esta diferencia, pero el total de deuda reportado es $0. No se tiene claridad de qué sucedió con los 42 millones.',
      razonamiento: 'Se calcularon las comisiones causadas reportadas (157,899,078) menos las comisiones pagadas reportadas (115,188,690), lo que resulta en un saldo pendiente teórico de 42,710,388. Sin embargo, el valor registrado como "Total Deuda" en el mismo periodo es de 0. Esta inconsistencia requiere verificación del auxiliar contable para ubicar este faltante.',
      fuentes: JSON.stringify([{ fuente: 'Estado de Cuenta - Comisiones', seccion: 'Resumen', version: '1' }]),
      impactoEconomico: 42710388,
    },
    {
      fideicomisoId: b3VirreyId,
      tipo: TipoHallazgo.DISCREPANCIA_MONTO,
      severidad: SeveridadHallazgo.MEDIO,
      categoria: CategoriaHallazgo.CONSISTENCIA,
      area: AreaHallazgo.CONTABILIDAD,
      titulo: 'Discrepancia aritmética en cálculo de Deuda Total',
      descripcion: 'Existe una diferencia de $6,545,066 entre el total de deuda reportado en la tabla (26,559,729) y el cálculo aritmético manual de los números presentes en la tabla (20,014,663).',
      razonamiento: 'Al revisar los rubros que componen la deuda en el periodo reportado: comisiones causadas (1,220,998,762) menos comisiones pagadas (1,203,054,818) más intereses de mora (2,070,719), el resultado aritmético manual fue de 20,014,663. Sin embargo, en el resumen tabular la deuda reportada es de 26,559,729. Discrepancia calculada: 26,559,729 - 20,014,663 = 6,545,066.',
      fuentes: JSON.stringify([{ fuente: 'Estado de Cuenta - Comisiones', seccion: 'Tabla Resumen 2', version: '1' }]),
      impactoEconomico: 6545066,
    },
    {
      fideicomisoId: royal26Id,
      tipo: TipoHallazgo.DISCREPANCIA_MONTO,
      severidad: SeveridadHallazgo.BAJO,
      categoria: CategoriaHallazgo.CONSISTENCIA,
      area: AreaHallazgo.CONTABILIDAD,
      titulo: 'Discrepancia en cálculo manual vs Total Deuda tabular',
      descripcion: 'Al igual que en otros fideicomisos, se encontró una diferencia matemática de $94,075 entre el valor Reportado como Total Deuda y el valor calculado sumando y restando los rubros de la propia tabla.',
      razonamiento: 'Los rubros reportados en tabla: comisiones causadas (23,295,5002) menos pagadas (14,514,3506) más intereses (69,919,610) menos saldos a favor (2,988,791) arrojan como deuda total calculada: 157,731,106. Por otro lado, la tabla presenta un Total Deuda de 157,825,181. Esta diferencia de 94,075 se categoriza como divergencia de sumatoria tabular.',
      fuentes: JSON.stringify([{ fuente: 'Estado de Cuenta - Comisiones (Royal 26)', seccion: 'Resumen', version: '1' }]),
      impactoEconomico: 94075,
    },
  ];

  for (const h of newHallazgos) {
    await prisma.hallazgo.create({ data: h as any });
  }

  console.log('Successfully seeded extra hallazgos.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
