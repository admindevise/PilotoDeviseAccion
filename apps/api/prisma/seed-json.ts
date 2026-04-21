import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const jsonDir = path.join(__dirname, '../../../data/json_extraidos');

async function main() {
  console.log('Seeding database with generated JSON files...');

  // Ensure an admin user exists for general assignments
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@dis.com.co' },
    update: {},
    create: {
      email: 'admin@dis.com.co',
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No JSON files found in data/json_extraidos/');
    return;
  }

  for (const file of files) {
    console.log(`\nProcessing file: ${file}`);
    const filePath = path.join(jsonDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    await processFideicomiso(data, adminUser.id);
  }

  console.log('\nJSON Seeding complete.');
}

function mapArea(areaStr: string | undefined): any {
  if (!areaStr) return undefined;
  const a = areaStr.toUpperCase();
  if (a.includes('LEGAL') || a.includes('CONTRACTU')) return 'LEGAL';
  if (a.includes('FACTURA') || a.includes('COMISION') || a.includes('RENDIMIENTO')) return 'FACTURACION';
  if (a.includes('CONTAB') || a.includes('DISPONIBLE')) return 'CONTABILIDAD';
  if (a.includes('COMERCIAL') || a.includes('BENEFICIARIO')) return 'COMERCIAL';
  return 'OPERATIVA';
}

async function processFideicomiso(data: any, adminUserId: string) {
  const fData = data.fideicomiso;
  if (!fData || !fData.codigoPrincipal) {
    console.error('Invalid JSON structure: missing fideicomiso.codigoPrincipal');
    return;
  }

  // Delete existing if any, to ensure clean state for this fideicomiso
  const existingFid = await prisma.fideicomiso.findUnique({
    where: { codigoPrincipal: fData.codigoPrincipal }
  });

  if (existingFid) {
    console.log(`Deleting existing records for Fideicomiso ${fData.codigoPrincipal} to refresh data...`);
    await prisma.fideicomiso.delete({ where: { id: existingFid.id } });
  }

  // Create Fideicomiso
  const fideicomiso = await prisma.fideicomiso.create({
    data: {
      codigoPrincipal: fData.codigoPrincipal,
      nombre: fData.nombre,
      fiduciariaAdmin: fData.fiduciariaAdmin,
      fechaConstitucion: new Date(fData.fechaConstitucion),
      tipologia: fData.tipologia as any,
      estado: fData.estado,
      descripcion: fData.descripcion,
    },
  });

  console.log(`Created Fideicomiso: ${fideicomiso.codigoPrincipal}`);

  // Create Codigos
  if (data.codigosFideicomiso) {
    for (const c of data.codigosFideicomiso) {
      await prisma.codigoFideicomiso.upsert({
        where: { codigo: c.codigo },
        update: { fideicomisoId: fideicomiso.id, tipo: c.tipo, vigenciaDesde: new Date(c.vigenciaDesde), vigenciaHasta: c.vigenciaHasta ? new Date(c.vigenciaHasta) : null, motivoCambio: c.motivoCambio },
        create: {
          fideicomisoId: fideicomiso.id,
          codigo: c.codigo,
          tipo: c.tipo,
          vigenciaDesde: new Date(c.vigenciaDesde),
          vigenciaHasta: c.vigenciaHasta ? new Date(c.vigenciaHasta) : null,
          motivoCambio: c.motivoCambio,
        },
      });
    }
  }

  // Create Fideicomitentes
  if (data.fideicomitentes) {
    for (const f of data.fideicomitentes) {
      await prisma.fideicomitente.create({
        data: {
          fideicomisoId: fideicomiso.id,
          nombre: f.nombre,
          nit: f.nit,
          tipo: f.tipo,
          vigenciaDesde: new Date(f.vigenciaDesde),
          documentoFuente: f.documentoFuente,
        }
      });
    }
  }

  // Create Documentos
  const docsMap = new Map();
  if (data.documentos) {
    for (const doc of data.documentos) {
      const created = await prisma.documento.create({
        data: {
          fideicomisoId: fideicomiso.id,
          tipo: doc.tipo as any,
          formatoOriginal: doc.formatoOriginal as any,
          nombreArchivo: doc.nombreArchivo,
          rutaAlmacenamiento: doc.rutaAlmacenamiento,
          contextoUsuario: doc.contextoUsuario,
          clasificacion: doc.clasificacion as any,
          cargadoPorId: adminUserId,
        }
      });
      docsMap.set(doc.nombreArchivo, created.id);
    }
  }

  // Create Contratos
  const contratoMap = new Map();
  if (data.contratos) {
    for (const c of data.contratos) {
      const created = await prisma.contrato.create({
        data: {
          fideicomisoId: fideicomiso.id,
          tipo: c.tipo as any,
          numero: c.numero,
          fechaFirma: new Date(c.fechaFirma),
          fechaVigencia: new Date(c.fechaVigencia),
          resumen: c.resumen,
          partes: c.partes as any,
        }
      });
      contratoMap.set(`${c.tipo}-${c.numero}`, created.id);
    }
  }

  // Create Reglas Comision
  if (data.reglasComision) {
    for (const r of data.reglasComision) {
      // Find a dummy parent contract if requested
      const dummyContrato = await prisma.contrato.findFirst({ where: { fideicomisoId: fideicomiso.id } });
      
      await prisma.reglaComision.create({
        data: {
          fideicomisoId: fideicomiso.id,
          contratoId: dummyContrato?.id || '',
          tipo: r.tipo as any,
          nombre: r.nombre,
          formula: r.formula,
          formulaDetalle: r.formulaDetalle as any,
          periodicidad: r.periodicidad as any,
          condiciones: r.condiciones,
          clausulaFuente: r.clausulaFuente,
          vigenciaDesde: new Date(r.vigenciaDesde),
          vigenciaHasta: r.vigenciaHasta ? new Date(r.vigenciaHasta) : null,
          confianzaExtraccion: r.confianzaExtraccion || 1.0,
        }
      });
    }
  }

  // Create Convenciones
  if (data.convencionesFideicomiso) {
    for (const c of data.convencionesFideicomiso) {
      await prisma.convencionFideicomiso.create({
        data: {
          fideicomisoId: fideicomiso.id,
          tipo: c.tipo as any,
          nombre: c.nombre,
          descripcion: c.descripcion,
          parametros: c.parametros as any,
          vigenciaDesde: new Date(c.vigenciaDesde),
          vigenciaHasta: c.vigenciaHasta ? new Date(c.vigenciaHasta) : null,
          registradoPor: adminUserId,
        }
      });
    }
  }

  // Create Movimientos Contables
  if (data.movimientosContables) {
    await prisma.movimientoContable.createMany({
      data: data.movimientosContables.map((m: any) => ({
        fideicomisoId: fideicomiso.id,
        origenERP: m.origenERP as any,
        fecha: new Date(m.fecha),
        cuenta: m.cuenta,
        nombreCuenta: m.nombreCuenta,
        terceroNit: m.terceroNit,
        terceroNombre: m.terceroNombre,
        tipoComprobante: m.tipoComprobante,
        numeroComprobante: m.numeroComprobante,
        concepto: m.concepto,
        debito: m.debito,
        credito: m.credito,
        saldo: m.saldo,
        periodoContable: m.periodoContable,
      }))
    });
  }

  // Create Facturas and Recaudos
  if (data.facturas) {
    const aggregatedFacturas = new Map<string, any>();
    
    for (const f of data.facturas) {
      if (aggregatedFacturas.has(f.numeroFactura)) {
        const existing = aggregatedFacturas.get(f.numeroFactura);
        existing.monto += f.monto || 0;
        existing.iva += f.iva || 0;
        existing.total += f.total || 0;
        existing.concepto += ' | ' + (f.concepto || '');
        if (f.recaudos && f.recaudos.length > 0) {
          if (!existing.recaudos) existing.recaudos = [];
          existing.recaudos.push(...f.recaudos);
        }
      } else {
        // Clone so we don't mutate original
        aggregatedFacturas.set(f.numeroFactura, JSON.parse(JSON.stringify(f)));
      }
    }
    
    for (const f of aggregatedFacturas.values()) {
      const factura = await prisma.factura.create({
        data: {
          fideicomisoId: fideicomiso.id,
          numeroFactura: f.numeroFactura,
          fecha: new Date(f.fecha),
          concepto: f.concepto,
          monto: f.monto || 0,
          iva: f.iva || 0,
          total: f.total || 0,
          estado: f.estado as any,
          periodoContable: f.periodoContable,
          codigoSuper: f.codigoSuper,
          recaudos: f.recaudos ? {
            create: f.recaudos.map((r: any) => ({
              fecha: new Date(r.fecha),
              monto: r.monto,
              referencia: r.referencia,
              medioPago: r.medioPago,
            }))
          } : undefined
        }
      });
    }
  }

  // Create Conciliaciones
  const concilMap = new Map();
  if (data.conciliaciones) {
    for (const c of data.conciliaciones) {
      const created = await prisma.conciliacion.create({
        data: {
          fideicomisoId: fideicomiso.id,
          periodo: c.periodo,
          tipo: c.tipo as any,
          estado: c.estado as any,
          resumen: c.resumen as any,
        }
      });
      concilMap.set(c.periodo, created);

      if (c.resultadosConciliacion) {
        for (const res of c.resultadosConciliacion) {
          const resCreated = await prisma.resultadoConciliacion.create({
            data: {
              conciliacionId: created.id,
              periodo: res.periodo,
              estado: res.estado as any,
              montoEsperado: res.montoEsperado,
              montoRegistrado: res.montoRegistrado,
              discrepancia: res.discrepancia,
              confianza: res.confianza || 1.0,
              evidencia: res.evidencia as any,
              razonamiento: res.razonamiento,
              variableMacro: res.variableMacro as any,
            }
          });
          
          // Store resId on the map using a synthetic key for matching with hallazgos if needed
          // But hallazgos in JSON usually stand alone. We'll link randomly if appropriate, but let's just create them separately or link if matching.
        }
      }
    }
  }

  // Create Hallazgos
  if (data.hallazgos) {
    for (const h of data.hallazgos) {
      // Find a matching resultadoConciliacion by impact/discrepancy if possible to link them
      const matchRes = await prisma.resultadoConciliacion.findFirst({
        where: { 
          conciliacion: { fideicomisoId: fideicomiso.id },
          discrepancia: h.impactoEconomico > 0 ? h.impactoEconomico : undefined
        }
      });

      // Avoid creating if we already used this resultadoConciliacionId
      let resId = null;
      if (matchRes) {
        const existingHallazgo = await prisma.hallazgo.findUnique({ where: { resultadoConciliacionId: matchRes.id } });
        if (!existingHallazgo) resId = matchRes.id;
      }

      const hallazgo = await prisma.hallazgo.create({
        data: {
          fideicomisoId: fideicomiso.id,
          resultadoConciliacionId: resId,
          tipo: h.tipo as any,
          severidad: h.severidad as any,
          categoria: h.categoria as any,
          area: mapArea(h.area),
          titulo: h.titulo,
          descripcion: h.descripcion,
          razonamiento: typeof h.razonamiento === 'string' ? h.razonamiento : JSON.stringify(h.razonamiento),
          fuentes: h.fuentes as any,
          reglaAplicada: h.reglaAplicada as any,
          variableMacro: h.variableMacro as any,
          impactoEconomico: h.impactoEconomico,
          estado: h.estado as any,
          resoluciones: h.resolucionesHallazgo ? {
            create: h.resolucionesHallazgo.map((r: any) => ({
              tipo: r.tipo as any,
              explicacion: r.explicacion,
              resueltoPorId: adminUserId, // Use admin instead of raw 'SISTEMA' if id is required
            }))
          } : undefined
        }
      });
    }
  }

  // Create Eventos Timeline
  if (data.eventosTimeline) {
    await prisma.eventoTimeline.createMany({
      data: data.eventosTimeline.map((e: any) => ({
        fideicomisoId: fideicomiso.id,
        tipo: e.tipo as any,
        fecha: new Date(e.fecha),
        titulo: e.titulo,
        descripcion: e.descripcion,
        metadatos: e.metadatos as any,
      }))
    });
  }

  // Create Entradas Conocimiento
  if (data.entradasConocimiento) {
    await prisma.entradaConocimiento.createMany({
      data: data.entradasConocimiento.map((e: any) => ({
        fideicomisoId: fideicomiso.id,
        tipo: e.tipo as any,
        titulo: e.titulo,
        contenido: e.contenido,
        metadatos: e.metadatos as any,
      }))
    });
  }

  // Create Audit Logs
  if (data.auditLogs) {
    await prisma.auditLog.createMany({
      data: data.auditLogs.map((a: any) => ({
        userId: adminUserId,
        accion: a.accion,
        entidad: a.entidad,
        entidadId: a.entidadId,
        cambios: a.cambios as any,
      }))
    });
  }

  // Variables Macroeconomicas
  if (data.variablesMacroeconomicas) {
    for (const v of data.variablesMacroeconomicas) {
      const variable = await prisma.variableMacroeconomica.upsert({
        where: { codigo: v.codigo },
        update: { nombre: v.nombre, periodicidad: v.periodicidad, unidad: v.unidad, fuenteOficial: v.fuenteOficial },
        create: {
          codigo: v.codigo,
          nombre: v.nombre,
          periodicidad: v.periodicidad as any,
          unidad: v.unidad,
          fuenteOficial: v.fuenteOficial,
        }
      });

      if (v.valoresHistoricosVariable) {
        for (const h of v.valoresHistoricosVariable) {
          // Check existing to avoid duplicates based on dates
          const exists = await prisma.valorHistoricoVariable.findFirst({
            where: {
              variableId: variable.id,
              vigenciaDesde: new Date(h.vigenciaDesde),
            }
          });
          if (!exists) {
            await prisma.valorHistoricoVariable.create({
              data: {
                variableId: variable.id,
                valor: h.valor,
                vigenciaDesde: new Date(h.vigenciaDesde),
                vigenciaHasta: h.vigenciaHasta ? new Date(h.vigenciaHasta) : null,
                normaLegal: h.normaLegal,
                registradoPor: adminUserId,
              }
            });
          }
        }
      }
    }
  }

  console.log(`Successfully imported all data for ${fideicomiso.codigoPrincipal}\n`);
}

main()
  .catch((e) => {
    console.error('JSON Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
