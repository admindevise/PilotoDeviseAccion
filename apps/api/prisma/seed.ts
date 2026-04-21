import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ============================================================
  // USERS
  // ============================================================
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@dis.com.co' },
    update: {},
    create: {
      email: 'admin@dis.com.co',
      name: 'Administrador DIS',
      role: 'ADMIN',
    },
  });

  const gerenteUser = await prisma.user.upsert({
    where: { email: 'gerente@dis.com.co' },
    update: {},
    create: {
      email: 'gerente@dis.com.co',
      name: 'Gerente de Fideicomiso',
      role: 'GERENTE_FIDEICOMISO',
    },
  });

  const analistaUser = await prisma.user.upsert({
    where: { email: 'analista@dis.com.co' },
    update: {},
    create: {
      email: 'analista@dis.com.co',
      name: 'Analista Contable',
      role: 'ANALISTA_CONTABLE',
    },
  });

  // ============================================================
  // VARIABLES MACROECONÓMICAS
  // ============================================================
  const smmlv = await prisma.variableMacroeconomica.upsert({
    where: { codigo: 'SMMLV' },
    update: {},
    create: {
      codigo: 'SMMLV',
      nombre: 'Salario Mínimo Mensual Legal Vigente',
      periodicidad: 'ANUAL',
      unidad: 'COP',
      fuenteOficial: 'Decreto Gobierno Nacional',
    },
  });

  const iva = await prisma.variableMacroeconomica.upsert({
    where: { codigo: 'IVA' },
    update: {},
    create: {
      codigo: 'IVA',
      nombre: 'Impuesto al Valor Agregado',
      periodicidad: 'ANUAL',
      unidad: '%',
      fuenteOficial: 'Estatuto Tributario',
    },
  });

  const trm = await prisma.variableMacroeconomica.upsert({
    where: { codigo: 'TRM' },
    update: {},
    create: {
      codigo: 'TRM',
      nombre: 'Tasa Representativa del Mercado',
      periodicidad: 'DIARIA',
      unidad: 'COP/USD',
      fuenteOficial: 'Banco de la República',
    },
  });

  await prisma.variableMacroeconomica.upsert({
    where: { codigo: 'UVR' },
    update: {},
    create: {
      codigo: 'UVR',
      nombre: 'Unidad de Valor Real',
      periodicidad: 'DIARIA',
      unidad: 'COP',
      fuenteOficial: 'Banco de la República',
    },
  });

  await prisma.variableMacroeconomica.upsert({
    where: { codigo: 'IPC' },
    update: {},
    create: {
      codigo: 'IPC',
      nombre: 'Índice de Precios al Consumidor',
      periodicidad: 'MENSUAL',
      unidad: '%',
      fuenteOficial: 'DANE',
    },
  });

  // SMMLV historical values
  const smmlvValues = [
    { valor: 1000000, desde: '2022-01-01', hasta: '2022-12-31', norma: 'Decreto 1724 de 2021' },
    { valor: 1160000, desde: '2023-01-01', hasta: '2023-12-31', norma: 'Decreto 2613 de 2022' },
    { valor: 1300000, desde: '2024-01-01', hasta: '2024-12-31', norma: 'Decreto 2292 de 2023' },
    { valor: 1423500, desde: '2025-01-01', hasta: '2025-12-31', norma: 'Decreto 1667 de 2024' },
  ];

  for (const v of smmlvValues) {
    await prisma.valorHistoricoVariable.create({
      data: {
        variableId: smmlv.id,
        valor: v.valor,
        vigenciaDesde: new Date(v.desde),
        vigenciaHasta: new Date(v.hasta),
        normaLegal: v.norma,
        registradoPor: adminUser.id,
      },
    });
  }

  // IVA historical values
  const ivaValues = [
    { valor: 19, desde: '2017-01-01', hasta: null, norma: 'Ley 1819 de 2016 - Reforma Tributaria' },
  ];

  for (const v of ivaValues) {
    await prisma.valorHistoricoVariable.create({
      data: {
        variableId: iva.id,
        valor: v.valor,
        vigenciaDesde: new Date(v.desde),
        vigenciaHasta: v.hasta ? new Date(v.hasta) : null,
        normaLegal: v.norma,
        registradoPor: adminUser.id,
      },
    });
  }

  // ============================================================
  // FIDEICOMISOS PILOTO
  // ============================================================

  // Fideicomiso 1: FA-5999 Vimarsa Colombia
  const fid1 = await prisma.fideicomiso.upsert({
    where: { codigoPrincipal: 'FA-5999' },
    update: {},
    create: {
      codigoPrincipal: 'FA-5999',
      nombre: 'Fideicomiso de Administración Vimarsa Colombia',
      fiduciariaAdmin: 'Fiduciaria Piloto S.A.',
      fechaConstitucion: new Date('2022-12-15'),
      tipologia: 'FA',
      estado: 'ACTIVO',
      descripcion: 'Fideicomiso de administración y pagos para Vimarsa Colombia SAS.',
    },
  });

  await prisma.codigoFideicomiso.upsert({
    where: { codigo: 'FA-5999' },
    update: {},
    create: {
      fideicomisoId: fid1.id,
      codigo: 'FA-5999',
      tipo: 'PRINCIPAL',
      vigenciaDesde: new Date('2022-12-15'),
    },
  });

  await prisma.fideicomitente.create({
    data: {
      fideicomisoId: fid1.id,
      nombre: 'Vimarsa Colombia SAS',
      nit: '901234567-1',
      tipo: 'FIDEICOMITENTE',
      vigenciaDesde: new Date('2024-09-10'),
    },
  });

  // Commission rules for FA-5999
  const contrato1 = await prisma.contrato.create({
    data: {
      fideicomisoId: fid1.id,
      tipo: 'CONTRATO_FIDUCIA',
      numero: 'Contrato Original',
      fechaFirma: new Date('2022-12-15'),
      fechaVigencia: new Date('2022-12-15'),
      partes: [
        { nombre: 'Ciudad Ruitoque SAS', nit: '900123456-1', rol: 'Fideicomitente' },
        { nombre: 'Fiduciaria Piloto S.A.', nit: '800111222-3', rol: 'Fiduciaria' },
      ],
      resumen: 'Contrato de fiducia mercantil de administración y pagos.',
    },
  });

  const otrosi1 = await prisma.contrato.create({
    data: {
      fideicomisoId: fid1.id,
      tipo: 'OTROSI_FIDUCIA',
      numero: 'Otrosí No. 1',
      fechaFirma: new Date('2024-09-10'),
      fechaVigencia: new Date('2024-09-10'),
      partes: [
        { nombre: 'Vimarsa Colombia SAS', nit: '901234567-1', rol: 'Fideicomitente (cesionario)' },
        { nombre: 'Fiduciaria Piloto S.A.', nit: '800111222-3', rol: 'Fiduciaria' },
      ],
      resumen: 'Modifica fideicomitente por cesión y duplica comisión de administración.',
    },
  });

  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid1.id,
      contratoId: contrato1.id,
      tipo: 'ADMINISTRACION_MENSUAL',
      nombre: 'Comisión de administración mensual',
      formula: '2 SMMLV',
      formulaDetalle: { base: 'SMMLV', multiplicador: 2, tipo: 'fijo' },
      periodicidad: 'MENSUAL',
      clausulaFuente: 'Cláusula Cuarta - Comisiones',
      vigenciaDesde: new Date('2022-12-15'),
      vigenciaHasta: new Date('2024-09-09'),
      confianzaExtraccion: 0.95,
      validada: true,
      validadaPor: gerenteUser.id,
      validadaEn: new Date('2025-01-15'),
    },
  });

  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid1.id,
      contratoId: otrosi1.id,
      tipo: 'ADMINISTRACION_MENSUAL',
      nombre: 'Comisión de administración mensual (post Otrosí No. 1)',
      formula: '4 SMMLV',
      formulaDetalle: { base: 'SMMLV', multiplicador: 4, tipo: 'fijo' },
      periodicidad: 'MENSUAL',
      clausulaFuente: 'Otrosí No. 1 - Cláusula Segunda - Modificación de comisiones',
      vigenciaDesde: new Date('2024-09-10'),
      confianzaExtraccion: 0.98,
      validada: true,
      validadaPor: gerenteUser.id,
      validadaEn: new Date('2025-01-15'),
    },
  });

  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid1.id,
      contratoId: contrato1.id,
      tipo: 'CESION_DERECHOS',
      nombre: 'Comisión por cesión de derechos fiduciarios',
      formula: '0.5 SMMLV',
      formulaDetalle: { base: 'SMMLV', multiplicador: 0.5, tipo: 'fijo' },
      periodicidad: 'POR_EVENTO',
      condiciones: 'Por cada cesión de derechos fiduciarios registrada',
      clausulaFuente: 'Cláusula Cuarta - Numeral 3 - Comisiones ocasionales',
      vigenciaDesde: new Date('2022-12-15'),
      confianzaExtraccion: 0.92,
      validada: true,
      validadaPor: gerenteUser.id,
      validadaEn: new Date('2025-01-15'),
    },
  });

  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid1.id,
      contratoId: contrato1.id,
      tipo: 'SUSCRIPCION_OTROSI',
      nombre: 'Comisión por suscripción de otrosí',
      formula: '1 SMMLV',
      formulaDetalle: { base: 'SMMLV', multiplicador: 1, tipo: 'fijo' },
      periodicidad: 'POR_EVENTO',
      condiciones: 'Por cada otrosí suscrito al contrato de fiducia',
      clausulaFuente: 'Cláusula Cuarta - Numeral 3 - Comisiones ocasionales',
      vigenciaDesde: new Date('2022-12-15'),
      confianzaExtraccion: 0.90,
      validada: true,
      validadaPor: gerenteUser.id,
      validadaEn: new Date('2025-01-15'),
    },
  });

  // Convención contable
  await prisma.convencionFideicomiso.create({
    data: {
      fideicomisoId: fid1.id,
      tipo: 'CONTABLE',
      nombre: 'Tratamiento contable de comisiones',
      descripcion: 'Las comisiones se registran como gasto directo del fideicomiso en la cuenta 51151801001.',
      parametros: {
        cuentaComision: '51151801001',
        flujoContable: 'DIRECTO',
      },
      vigenciaDesde: new Date('2022-12-15'),
      registradoPor: gerenteUser.id,
    },
  });

  // Fideicomiso 2: Hotel B3 Virrey (con múltiples códigos)
  const fid2 = await prisma.fideicomiso.upsert({
    where: { codigoPrincipal: 'FA-658' },
    update: {},
    create: {
      codigoPrincipal: 'FA-658',
      nombre: 'Fideicomiso Hotel B3 Virrey',
      fiduciariaAdmin: 'Fiduciaria Piloto S.A.',
      fechaConstitucion: new Date('2018-03-20'),
      tipologia: 'FA',
      estado: 'ACTIVO',
      descripcion: 'Fideicomiso de administración hotelera con cuentas en participación.',
    },
  });

  await prisma.codigoFideicomiso.upsert({
    where: { codigo: 'FA-658' },
    update: {},
    create: {
      fideicomisoId: fid2.id,
      codigo: 'FA-658',
      tipo: 'PRINCIPAL',
      vigenciaDesde: new Date('2018-03-20'),
    },
  });

  await prisma.codigoFideicomiso.upsert({
    where: { codigo: '13527' },
    update: {},
    create: {
      fideicomisoId: fid2.id,
      codigo: '13527',
      tipo: 'ALIAS',
      vigenciaDesde: new Date('2018-03-20'),
      vigenciaHasta: new Date('2022-06-30'),
      motivoCambio: 'Cambio de tipología Superintendencia',
    },
  });

  // Fideicomiso 3: FA-5931 Sautari
  const fid3 = await prisma.fideicomiso.upsert({
    where: { codigoPrincipal: 'FA-5931' },
    update: {},
    create: {
      codigoPrincipal: 'FA-5931',
      nombre: 'Fideicomiso de Administración Sautari',
      fiduciariaAdmin: 'Fiduciaria Piloto S.A.',
      fechaConstitucion: new Date('2021-07-01'),
      tipologia: 'FA',
      estado: 'ACTIVO',
      descripcion: 'Fideicomiso de administración con comisiones variables por monetización de divisas.',
    },
  });

  await prisma.codigoFideicomiso.upsert({
    where: { codigo: 'FA-5931' },
    update: {},
    create: {
      fideicomisoId: fid3.id,
      codigo: 'FA-5931',
      tipo: 'PRINCIPAL',
      vigenciaDesde: new Date('2021-07-01'),
    },
  });

  // Timeline events for FA-5999
  const timelineEvents = [
    {
      fideicomisoId: fid1.id,
      tipo: 'CONSTITUCION' as const,
      fecha: new Date('2022-12-15'),
      titulo: 'Constitución del fideicomiso',
      descripcion: 'Contrato de fiducia mercantil suscrito con Ciudad Ruitoque SAS.',
    },
    {
      fideicomisoId: fid1.id,
      tipo: 'CESION' as const,
      fecha: new Date('2024-07-11'),
      titulo: 'Cesión de derechos a Vimarsa Colombia',
      descripcion: 'Cesión total de derechos fiduciarios de Ciudad Ruitoque a Vimarsa Colombia SAS.',
    },
    {
      fideicomisoId: fid1.id,
      tipo: 'OTROSI' as const,
      fecha: new Date('2024-09-10'),
      titulo: 'Otrosí No. 1 firmado',
      descripcion: 'Modifica fideicomitente a Vimarsa Colombia y duplica comisión de administración a 4 SMMLV.',
    },
  ];

  // ============================================================
  // BASE DE CONOCIMIENTO (MOCK DATA)
  // ============================================================
  const entradasConocimiento = [
    {
      fideicomisoId: fid1.id,
      tipo: 'REGLA_NEGOCIO' as const,
      titulo: 'Tratamiento de Cobro por Cesión de Derechos (Vimarsa)',
      contenido: 'Según el Otrosí No. 1, al momento de ceder derechos fiduciarios, las partes cesionarias asumen el costo del estudio de viabilidad por un valor equivalente a 0.5 SMMLV por cesión, debitable directamente de los rendimientos financieros.',
    },
    {
      fideicomisoId: fid2.id,
      tipo: 'PRECEDENTE_CONTABLE' as const,
      titulo: 'Devolución de IVA en Comisiones Facturadas',
      contenido: 'Dado el régimen tributario del Hotel B3 Virrey, los pagos de comisiones fiduciarias asociadas a la gestión hotelera sí causan IVA del 19%. Sin embargo, es deducible si se declara con la cuenta contable 24080105.',
    },
    {
      fideicomisoId: fid3.id,
      tipo: 'RESOLUCION_HALLAZGO' as const,
      titulo: 'Cálculo de Comisión Variable por Monetización',
      contenido: 'En la auditoría Q3-2023 se detectó un desajuste por tipos de cambio TRM asincrónicos. Se determinó que la TRM aplicable para el corte debe ser la del día de la monetización, no la del último día hábil del mes.',
    },
  ];

  for (const entrada of entradasConocimiento) {
    await prisma.entradaConocimiento.create({ data: entrada });
  }

  // ============================================================
  // CONCILIACIÓN Y HALLAZGOS (REVENUE OPORTUNITIES MOCK DATA)
  // ============================================================
  const conciliacion = await prisma.conciliacion.create({
    data: {
      fideicomisoId: fid1.id,
      periodo: '2024-10',
      tipo: 'PERIODICA',
      estado: 'COMPLETADA',
      resumen: { totalEvaluado: 45000000, discrepanciasDetectadas: 2 },
    },
  });

  const res1 = await prisma.resultadoConciliacion.create({
    data: {
      conciliacionId: conciliacion.id,
      periodo: '2024-10',
      estado: 'OPORTUNIDAD_REVENUE',
      evidencia: { lineasRevisadas: [14, 15] },
      razonamiento: 'Se detectaron 3 cesiones de derechos en el mes, pero facturación reporta cobro por 0.',
      montoEsperado: 1950000, // 1.5 SMMLV (3 * 0.5)
      montoRegistrado: 0,
      discrepancia: 1950000,
    }
  });

  const res2 = await prisma.resultadoConciliacion.create({
    data: {
      conciliacionId: conciliacion.id,
      periodo: '2024-10',
      estado: 'OPORTUNIDAD_REVENUE',
      evidencia: { pagosContratistas: 12 },
      razonamiento: 'Falta cobro de comisiones por suscripción de 2 contratos adicionales no contabilizados.',
      montoEsperado: 2600000, // 2 SMMLV (2 * 1)
      montoRegistrado: 0,
      discrepancia: 2600000,
    }
  });

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

  // ============================================================
  // CONTABILIDAD Y FACTURACIÓN (FASE 2 MOCK DATA)
  // ============================================================
  const factura1 = await prisma.factura.create({
    data: {
      fideicomisoId: fid1.id,
      numeroFactura: 'FE-8501',
      fecha: new Date('2024-10-05'),
      concepto: 'Comisión Administración - Septiembre 2024',
      monto: 2600000,
      iva: 494000,
      total: 3094000,
      estado: 'PAGADA',
      periodoContable: '2024-09',
    }
  });

  const factura2 = await prisma.factura.create({
    data: {
      fideicomisoId: fid1.id,
      numeroFactura: 'FE-8605',
      fecha: new Date('2024-11-05'),
      concepto: 'Comisión Administración - Octubre 2024',
      monto: 2600000,
      iva: 494000,
      total: 3094000,
      estado: 'PENDIENTE',
      periodoContable: '2024-10',
    }
  });

  await prisma.recaudo.create({
    data: {
      facturaId: factura1.id,
      fecha: new Date('2024-10-15'),
      monto: 3094000,
      referencia: 'TR-15542008',
      medioPago: 'TRANSFERENCIA',
    }
  });

  await prisma.movimientoContable.createMany({
    data: [
      {
        fideicomisoId: fid1.id,
        origenERP: 'SIFI',
        fecha: new Date('2024-10-05'),
        cuenta: '41503501',
        nombreCuenta: 'Ingresos por Comisiones Fiduciarias (Admon)',
        concepto: 'Causación Factura FE-8501',
        debito: 0,
        credito: 2600000,
        periodoContable: '2024-10',
      },
      {
        fideicomisoId: fid1.id,
        origenERP: 'SIFI',
        fecha: new Date('2024-10-05'),
        cuenta: '24080105',
        nombreCuenta: 'IVA Generado en Servicios',
        concepto: 'Causación IVA Factura FE-8501',
        debito: 0,
        credito: 494000,
        periodoContable: '2024-10',
      },
      {
        fideicomisoId: fid1.id,
        origenERP: 'SIFI',
        fecha: new Date('2024-10-15'),
        cuenta: '11100501',
        nombreCuenta: 'Bancos Moneda Nacional',
        concepto: 'Recaudo Factura FE-8501 TR-15542008',
        debito: 3094000,
        credito: 0,
        periodoContable: '2024-10',
      }
    ]
  });

  // ============================================================
  // AUDIT LOGS (FASE 3 MOCK DATA)
  // ============================================================
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        accion: 'UPDATE_VARIABLE',
        entidad: 'VariableMacroeconomica',
        entidadId: smmlv.id,
        cambios: { valorAnterior: 1300000, valorNuevo: 1423500 },
        ip: '192.168.1.15',
        createdAt: new Date('2024-12-28T08:30:00Z'),
      },
      {
        userId: gerenteUser.id,
        accion: 'VALIDATE_RULE',
        entidad: 'ReglaComision',
        entidadId: 'fid1-regla-cesion',
        cambios: { estadoAnterior: 'PENDIENTE', estadoNuevo: 'VALIDADA' },
        ip: '192.168.1.42',
        createdAt: new Date('2025-01-15T14:20:00Z'),
      },
      {
        userId: analistaUser.id,
        accion: 'CREATE_CONCILIACION',
        entidad: 'Conciliacion',
        entidadId: conciliacion.id,
        cambios: { periodo: '2024-10', tipo: 'PERIODICA' },
        ip: '10.0.0.5',
        createdAt: new Date('2024-11-02T09:15:00Z'),
      }
    ]
  });

  console.log('Seed completed successfully!');
  console.log(`  Users: ${3}`);
  console.log(`  Variables macro: ${5}`);
  console.log(`  Fideicomisos: ${3}`);
  console.log(`  Contratos: ${2}`);
  console.log(`  Reglas comisión: ${4}`);
  console.log(`  Entradas conocimiento: ${entradasConocimiento.length}`);
  console.log(`  Eventos timeline: ${timelineEvents.length}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
