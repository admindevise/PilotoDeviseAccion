import { PrismaClient, TipoHallazgo, SeveridadHallazgo, CategoriaHallazgo, SubcategoriaHallazgo, AreaHallazgo, EstadoHallazgo, TipoDocumento, FormatoOriginal } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@dis.com.co' } });
  if (!adminUser) throw new Error("Admin user not found. Please run regular seed first.");

  const jsonPath = path.resolve(__dirname, '../../../data/json_extraidos/auditoria_inicial_FA5999.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // 1. Fideicomiso
  let codigoP = "FA-5999"; 
  const match = data.fideicomiso.nombre.match(/^(FA-\d+)/);
  if(match) codigoP = match[1];

  const nombreLimpio = data.fideicomiso.nombre.replace(/^(FA-\d+\s*)/, '').trim();

  const fid = await prisma.fideicomiso.upsert({
    where: { codigoPrincipal: codigoP },
    update: {
      nombre: nombreLimpio,
      fiduciariaAdmin: data.fideicomiso.fiduciariaAdmin,
      fechaConstitucion: new Date(data.fideicomiso.fechaConstitucion),
      tipologia: 'FA',
      estado: 'ACTIVO',
      descripcion: data.fideicomiso.descripcion,
    },
    create: {
      codigoPrincipal: codigoP,
      nombre: nombreLimpio,
      fiduciariaAdmin: data.fideicomiso.fiduciariaAdmin,
      fechaConstitucion: new Date(data.fideicomiso.fechaConstitucion),
      tipologia: 'FA',
      estado: 'ACTIVO',
      descripcion: data.fideicomiso.descripcion,
    }
  });

  console.log(`Fideicomiso upserted: ${fid.codigoPrincipal}`);

  // 2. Codigos Fideicomiso
  for (const c of data.codigosFideicomiso) {
    await prisma.codigoFideicomiso.upsert({
      where: { codigo: c.codigo.toString() },
      update: {
        tipo: c.tipo as any,
        vigenciaDesde: new Date(c.vigenciaDesde),
      },
      create: {
        fideicomisoId: fid.id,
        codigo: c.codigo.toString(),
        tipo: c.tipo as any,
        vigenciaDesde: new Date(c.vigenciaDesde),
      }
    });
  }

  // 3. Fideicomitentes & Beneficiarios
  await prisma.fideicomitente.deleteMany({ where: { fideicomisoId: fid.id }});
  
  for (const f of data.fideicomitentes) {
    await prisma.fideicomitente.create({
      data: {
        fideicomisoId: fid.id,
        nombre: f.nombre,
        nit: f.nit.replace(/\./g, ''),
        tipo: f.tipo as any,
        vigenciaDesde: new Date(f.vigenciaDesde),
      }
    });
  }

  // 4. Documentos Analizados
  await prisma.documento.deleteMany({ where: { fideicomisoId: fid.id }});
  for (const [index, d] of data.documentos.entries()) {
    let fmt: FormatoOriginal = "PDF";
    if (d.formatoOriginal === 'XLSX') fmt = "XLSX";
    if (d.formatoOriginal === 'TXT' || d.formatoOriginal === 'CSV') fmt = "DOCX";
    if (d.formatoOriginal?.includes('ZIP')) fmt = "PDF_ZIP";

    await prisma.documento.create({
      data: {
        fideicomisoId: fid.id,
        tipo: d.tipo as any,
        formatoOriginal: fmt,
        nombreArchivo: d.nombreArchivo,
        rutaAlmacenamiento: d.rutaAlmacenamiento,
        contextoUsuario: d.contextoUsuario,
        clasificacion: d.clasificacion,
        cargadoPorId: adminUser.id,
        procesado: true,
      }
    });
  }

  function formatCalculo(obj: any, indent = 0): string {
    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }
    return Object.entries(obj).map(([k, v]) => {
      const spaces = '  '.repeat(indent);
      const label = k.replace(/_/g, ' ');
      if (typeof v === 'object' && v !== null) {
        return `${spaces}- **${label}**:\n${formatCalculo(v, indent + 1)}`;
      }
      return `${spaces}- **${label}**: ${v}`;
    }).join('\n');
  }

  // 5. Hallazgos
  await prisma.hallazgo.deleteMany({ where: { fideicomisoId: fid.id }});
  
  // Subcategoria mapping for Vimarsa hallazgos
  const subcategoriaMap: Record<string, SubcategoriaHallazgo> = {
    'H-001': 'RIESGO_NEGATIVO',  // Ambigüedad 2 vs 4 SMMLV, riesgo de devolución
    'H-004': 'RIESGO_NEGATIVO',  // Cobro apertura cuenta sin base contractual
    'H-014': 'RIESGO_NEGATIVO',  // Cobro $6.19M en cuenta obsoleta
  };

  for (const h of data.hallazgos) {
    let areaE: AreaHallazgo = 'OPERATIVA';
    const areastr = h.area.toLowerCase();
    if(areastr.includes("comision") || areastr.includes("rendimiento")) areaE = 'FACTURACION';
    if(areastr.includes("contable") || areastr.includes("reversion")) areaE = 'CONTABILIDAD';
    if(areastr.includes("contractu") || areastr.includes("beneficiario")) areaE = 'LEGAL';

    let sevE: SeveridadHallazgo = 'INFORMATIVO';
    if(h.severidad === 'BAJA' || h.severidad === 'BAJO') sevE = 'BAJO';
    if(h.severidad === 'MEDIA' || h.severidad === 'MEDIO') sevE = 'MEDIO';
    if(h.severidad === 'ALTA' || h.severidad === 'ALTO') sevE = 'ALTO';

    await prisma.hallazgo.create({
      data: {
        fideicomisoId: fid.id,
        tipo: 'INCONSISTENCIA_FUENTES',
        severidad: sevE,
        categoria: 'CONSISTENCIA',
        subcategoria: subcategoriaMap[h.id] || 'ANOMALIA',
        area: areaE,
        titulo: h.titulo.substring(0, 100),
        descripcion: h.descripcion_operativa,
        razonamiento: JSON.stringify({
          reglaCitada: h.regla_citada,
          variableAplicada: h.variable_aplicada,
          calculoEsperado: formatCalculo(h.calculo_esperado),
          evidenciaEncontrada: h.evidencia_encontrada ? h.evidencia_encontrada.map((e: string) => `- ${e}`).join('\n') : '',
          conclusion: h.conclusion,
          riesgoIdentificado: h.riesgo
        }),
        fuentes: h.documentos_fuente,
        impactoEconomico: h.impacto_economico || null,
        estado: 'ABIERTO',
      }
    });
  }

  // 6. Reglas (Comisiones)
  // Mapping the "comisiones_fiduciarias" block into some representative Reglas
  await prisma.reglaComision.deleteMany({ where: { fideicomisoId: fid.id }});
  
  await prisma.contrato.deleteMany({ where: { fideicomisoId: fid.id }});

  // Find a contrato to attach rules to
  const contratoPrin = await prisma.contrato.create({
    data: {
      fideicomisoId: fid.id,
      tipo: 'CONTRATO_FIDUCIA',
      numero: "Contrato Principal - FA5999",
      fechaFirma: new Date(data.fideicomiso.fechaConstitucion),
      fechaVigencia: new Date(data.fideicomiso.fechaConstitucion),
      partes: [],
    }
  });
  
  const contratoOtrosi = await prisma.contrato.create({
    data: {
      fideicomisoId: fid.id,
      tipo: 'OTROSI_FIDUCIA',
      numero: "Otrosí No. 1 - FA5999",
      fechaFirma: new Date('2024-09-01'), // approx 
      fechaVigencia: new Date('2024-09-01'),
      partes: [],
    }
  });

  // Comision 2022
  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid.id,
      contratoId: contratoPrin.id,
      tipo: 'ADMINISTRACION_MENSUAL',
      nombre: 'Comisión Mensual 2022 (Proporcional Dic)',
      formula: '$2,760,800 COP (calculada de base $2.32M SMLV)',
      formulaDetalle: { base: 'SMLMV', multiplicador: 2.32, version: "v1" },
      periodicidad: 'MENSUAL',
      clausulaFuente: 'Anexo Comisiones',
      vigenciaDesde: new Date('2022-12-01'),
      vigenciaHasta: new Date('2022-12-31'),
      validada: true,
      validadaPor: adminUser.id,
    }
  });

  // Comision 2023
  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid.id,
      contratoId: contratoPrin.id,
      tipo: 'ADMINISTRACION_MENSUAL',
      nombre: 'Comisión Mensual 2023',
      formula: '$2,760,800 COP (calculada de base $2.32M SMLV)',
      formulaDetalle: { base: 'SMLMV', multiplicador: 2.32, version: "v1.1" },
      periodicidad: 'MENSUAL',
      clausulaFuente: 'Anexo Comisiones',
      vigenciaDesde: new Date('2023-01-01'),
      vigenciaHasta: new Date('2023-12-31'),
      validada: true,
      validadaPor: adminUser.id,
    }
  });

  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid.id,
      contratoId: contratoPrin.id,
      tipo: 'INICIAL_ESTRUCTURACION',
      nombre: 'Comisión Estructuración Inicial',
      formula: '$2,380,000 COP',
      formulaDetalle: { base: 'Fijo', multiplicador: 1, version: "v1" },
      periodicidad: 'UNICA',
      clausulaFuente: 'Anexo Comisiones',
      vigenciaDesde: new Date('2023-01-01'),
      vigenciaHasta: new Date('2023-01-31'),
      validada: true,
      validadaPor: adminUser.id,
    }
  });

  // Comision 2024 ene-ago
  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid.id,
      contratoId: contratoPrin.id,
      tipo: 'ADMINISTRACION_MENSUAL',
      nombre: 'Comisión Mensual 2024 (Ene-Ago)',
      formula: '$3,094,000 COP (calculada de base $2.6M SMLV)',
      formulaDetalle: { base: 'SMLMV', multiplicador: 2.6, version: "v1.2" },
      periodicidad: 'MENSUAL',
      clausulaFuente: 'Anexo Comisiones',
      vigenciaDesde: new Date('2024-01-01'),
      vigenciaHasta: new Date('2024-08-31'),
      validada: true,
      validadaPor: adminUser.id,
    }
  });

  // Comision 2024 sep-dic Otrosi
  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid.id,
      contratoId: contratoOtrosi.id,
      tipo: 'ADMINISTRACION_MENSUAL',
      nombre: 'Comisión Mensual 2024 (Sep-Dic)',
      formula: '$6,188,000 COP (calculada de base $5.2M SMLV)',
      formulaDetalle: { base: 'SMLMV', multiplicador: 5.2, version: "v2" },
      periodicidad: 'MENSUAL',
      clausulaFuente: 'Otrosí No 1',
      vigenciaDesde: new Date('2024-09-01'),
      vigenciaHasta: new Date('2024-12-31'),
      validada: true,
      validadaPor: adminUser.id,
    }
  });

  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid.id,
      contratoId: contratoOtrosi.id,
      tipo: 'SUSCRIPCION_OTROSI',
      nombre: 'Comisión Estructuración Otrosí No. 1',
      formula: '$3,570,000 COP',
      formulaDetalle: { base: 'Fijo', multiplicador: 1, version: "v2" },
      periodicidad: 'UNICA',
      clausulaFuente: 'Otrosí No 1',
      vigenciaDesde: new Date('2024-09-01'),
      vigenciaHasta: new Date('2024-09-30'),
      validada: true,
      validadaPor: adminUser.id,
    }
  });

  // Comision 2025
  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid.id,
      contratoId: contratoOtrosi.id,
      tipo: 'ADMINISTRACION_MENSUAL',
      nombre: 'Comisión Mensual 2025',
      formula: '$6,775,860 COP (calculada de base $5.69M SMLV)',
      formulaDetalle: { base: 'SMLMV', multiplicador: 5.69, version: "v2.1" },
      periodicidad: 'MENSUAL',
      clausulaFuente: 'Otrosí No 1',
      vigenciaDesde: new Date('2025-01-01'),
      validada: true,
      validadaPor: adminUser.id,
    }
  });

  await prisma.reglaComision.create({
    data: {
      fideicomisoId: fid.id,
      contratoId: contratoOtrosi.id,
      tipo: 'OTRA',
      nombre: 'Comisión Apertura Cuenta Bancaria',
      formula: '$1,190,000 COP',
      formulaDetalle: { base: 'Fijo', multiplicador: 1, version: "v2" },
      periodicidad: 'UNICA',
      clausulaFuente: 'Otrosí No 1',
      vigenciaDesde: new Date('2025-01-01'),
      validada: true,
      validadaPor: adminUser.id,
    }
  });

  // 7. Eventos Timeline (Hitos)
  await prisma.eventoTimeline.deleteMany({ where: { fideicomisoId: fid.id }});
  
  await prisma.eventoTimeline.createMany({
    data: [
      {
        fideicomisoId: fid.id,
        tipo: 'CONSTITUCION',
        fecha: new Date('2022-12-26'),
        titulo: 'Constitución del Fideicomiso',
        descripcion: 'Firma del contrato original entre Ciudad Ruitoque S.A.S. y Acción Sociedad Fiduciaria.',
      },
      {
        fideicomisoId: fid.id,
        tipo: 'CESION',
        fecha: new Date('2024-06-05'),
        titulo: 'Cesión Total de Derechos Fiduciarios',
        descripcion: 'Cesión del 100% de la posición contractual de Ciudad Ruitoque a Vimarsa Colombia S.A.S. por valor de $40M COP.',
      },
      {
        fideicomisoId: fid.id,
        tipo: 'OTROSI',
        fecha: new Date('2024-09-01'),
        titulo: 'Suscripción Otrosí No. 1',
        descripcion: 'Cambio de nombre a Vimarsa Colombia. Inclusión de Bloom Crowdfunding como beneficiario condicionado ($4,200M). Duplicación de comisión.',
      }
    ]
  });

  console.log('Seed de FA5999 completado correctamente!');
}

main()
  .catch((e) => {
    console.error('Seed falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
