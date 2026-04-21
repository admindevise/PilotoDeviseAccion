import { PrismaClient, PeriodicidadVariable } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding historical macroeconomic variables from 2000 to 2026...');

  // Ensure Base Variables exist
  const variables = [
    { codigo: 'SMMLV', nombre: 'Salario Mínimo Mensual Legal Vigente', periodicidad: 'ANUAL' as PeriodicidadVariable, unidad: 'COP', fuente: 'Ministerio de Trabajo' },
    { codigo: 'IVA', nombre: 'Impuesto al Valor Agregado', periodicidad: 'ANUAL' as PeriodicidadVariable, unidad: '%', fuente: 'Estatuto Tributario Nacional' },
    { codigo: 'IPC', nombre: 'Índice de Precios al Consumidor (Anualizado)', periodicidad: 'MENSUAL' as PeriodicidadVariable, unidad: '%', fuente: 'DANE' },
    { codigo: 'TRM', nombre: 'Tasa Representativa del Mercado', periodicidad: 'DIARIA' as PeriodicidadVariable, unidad: 'COP/USD', fuente: 'Banco de la República' },
    { codigo: 'UVR', nombre: 'Unidad de Valor Real', periodicidad: 'DIARIA' as PeriodicidadVariable, unidad: 'COP', fuente: 'Banco de la República' },
  ];

  const varMap: Record<string, string> = {};

  for (const v of variables) {
    const upserted = await prisma.variableMacroeconomica.upsert({
      where: { codigo: v.codigo },
      update: { nombre: v.nombre, periodicidad: v.periodicidad, unidad: v.unidad, fuenteOficial: v.fuente },
      create: { codigo: v.codigo, nombre: v.nombre, periodicidad: v.periodicidad, unidad: v.unidad, fuenteOficial: v.fuente }
    });
    varMap[v.codigo] = upserted.id;
  }

  // Clear existing history to avoid duplicates
  await prisma.valorHistoricoVariable.deleteMany({});
  console.log('Cleared existing history.');

  const historyData: any[] = [];

  // 1. SMMLV
  const smmlv_history = [
    { year: 2018, val: 781242, incre: '5,9%' },
    { year: 2019, val: 828116, incre: '6,0%' },
    { year: 2020, val: 877803, incre: '6,0%' },
    { year: 2021, val: 908526, incre: '3,5%' },
    { year: 2022, val: 1000000, incre: '10,07%' },
    { year: 2023, val: 1160000, incre: '16,0%' },
    { year: 2024, val: 1300000, incre: '12,0%' },
    { year: 2025, val: 1423500, incre: '9,5%' },
    { year: 2026, val: 1750905, incre: '23,0%' },
  ];

  smmlv_history.forEach(item => {
    historyData.push({
      variableId: varMap['SMMLV'],
      valor: item.val,
      vigenciaDesde: new Date(`${item.year}-01-01T00:00:00Z`),
      vigenciaHasta: new Date(`${item.year}-12-31T23:59:59Z`),
      normaLegal: `Incremento del ${item.incre}`
    });
  });

  // 2. IVA
  historyData.push({
    variableId: varMap['IVA'],
    valor: 14,
    vigenciaDesde: new Date('1995-01-01T00:00:00Z'),
    vigenciaHasta: new Date('2000-12-31T23:59:59Z'),
    normaLegal: 'Estatuto Tributario'
  });
  historyData.push({
    variableId: varMap['IVA'],
    valor: 15,
    vigenciaDesde: new Date('2001-01-01T00:00:00Z'),
    vigenciaHasta: new Date('2002-12-31T23:59:59Z'),
    normaLegal: 'Estatuto Tributario'
  });
  historyData.push({
    variableId: varMap['IVA'],
    valor: 16,
    vigenciaDesde: new Date('2003-01-01T00:00:00Z'),
    vigenciaHasta: new Date('2016-12-31T23:59:59Z'),
    normaLegal: 'Incremento gobierno'
  });
  historyData.push({
    variableId: varMap['IVA'],
    valor: 19,
    vigenciaDesde: new Date('2017-01-01T00:00:00Z'),
    vigenciaHasta: null,
    normaLegal: 'Ley 1819 de 2016 - Reforma Tributaria'
  });

  // 3. IPC (End of year %)
  const ipc_history = [
    { year: 2019, val: 3.80, note: '' },
    { year: 2020, val: 1.61, note: 'Bajo histórico por pandemia' },
    { year: 2021, val: 5.62, note: '' },
    { year: 2022, val: 13.12, note: 'Pico en 23 años' },
    { year: 2023, val: 9.28, note: 'Inicio corrección' },
    { year: 2024, val: 5.20, note: '' },
    { year: 2025, val: 5.10, note: 'Desaceleración' },
  ];
  
  ipc_history.forEach(item => {
    historyData.push({
      variableId: varMap['IPC'],
      valor: item.val,
      vigenciaDesde: new Date(`${item.year}-01-01T00:00:00Z`),
      vigenciaHasta: new Date(`${item.year}-12-31T23:59:59Z`),
      normaLegal: item.note ? item.note : `Reporte DANE ${item.year}`
    });
  });

  // 4. TRM (Jan 1 Avg)
  // Utilizaremos el Promedio Anual dictado por el usuario
  const trm_history = [
    { year: 2000, val: 2087 },
    { year: 2005, val: 2320 },
    { year: 2010, val: 1897 },
    { year: 2015, val: 2746 },
    { year: 2018, val: 2956 },
    { year: 2019, val: 3281 },
    { year: 2020, val: 3693 },
    { year: 2021, val: 3743 },
    { year: 2022, val: 4255 },
    { year: 2023, val: 4325 },
    { year: 2024, val: 4100 },
    { year: 2025, val: 4052.86 },
    { year: 2026, val: 3682.00 }, // proyectado
  ];
  
  trm_history.forEach(item => {
    historyData.push({
      variableId: varMap['TRM'],
      valor: item.val,
      vigenciaDesde: new Date(`${item.year}-01-01T00:00:00Z`),
      vigenciaHasta: new Date(`${item.year}-12-31T23:59:59Z`),
      normaLegal: `TRM Promedio Anual ${item.year}`
    });
  });

  // Insert all
  await prisma.valorHistoricoVariable.createMany({
    data: historyData
  });

  console.log(`Successfully seeded ${historyData.length} historical variable records.`);
}

main()
  .catch((e) => {
    console.error('Error seeding macro variables:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
