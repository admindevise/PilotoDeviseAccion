import { PrismaClient, TipoDocumento, FormatoOriginal, OrigenERP, TipoContrato, TipoComision, PeriodicidadComision, TipoConvencion, TipoHallazgo, SeveridadHallazgo, CategoriaHallazgo, SubcategoriaHallazgo, EstadoHallazgo, AreaHallazgo } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@dis.com.co' } });
  if (!adminUser) throw new Error("Admin user not found. Please run regular seed first.");

  const jsonPath = path.resolve(__dirname, '../../../data/json_extraidos/auditoria_44764_v3.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // 1. Fideicomiso
  const fid = await prisma.fideicomiso.upsert({
    where: { codigoPrincipal: data.fideicomiso.codigoPrincipal },
    update: {
      nombre: data.fideicomiso.nombre,
      fiduciariaAdmin: data.fideicomiso.fiduciariaAdmin,
      fechaConstitucion: new Date(data.fideicomiso.fechaConstitucion),
      tipologia: data.fideicomiso.tipologia as any,
      estado: data.fideicomiso.estado,
      descripcion: data.fideicomiso.descripcion,
    },
    create: {
      codigoPrincipal: data.fideicomiso.codigoPrincipal,
      nombre: data.fideicomiso.nombre,
      fiduciariaAdmin: data.fideicomiso.fiduciariaAdmin,
      fechaConstitucion: new Date(data.fideicomiso.fechaConstitucion),
      tipologia: data.fideicomiso.tipologia as any,
      estado: data.fideicomiso.estado,
      descripcion: data.fideicomiso.descripcion,
    }
  });

  console.log(`Fideicomiso upserted: ${fid.codigoPrincipal}`);

  // 2. CodigosFideicomiso
  for (const c of data.codigosFideicomiso) {
    await prisma.codigoFideicomiso.upsert({
      where: { codigo: c.codigo },
      update: {
        tipo: c.tipo,
        vigenciaDesde: new Date(c.vigenciaDesde),
        vigenciaHasta: c.vigenciaHasta ? new Date(c.vigenciaHasta) : null,
        motivoCambio: c.motivoCambio,
      },
      create: {
        fideicomisoId: fid.id,
        codigo: c.codigo,
        tipo: c.tipo,
        vigenciaDesde: new Date(c.vigenciaDesde),
        vigenciaHasta: c.vigenciaHasta ? new Date(c.vigenciaHasta) : null,
        motivoCambio: c.motivoCambio,
      }
    });
  }

  // 3. Fideicomitentes
  await prisma.fideicomitente.deleteMany({ where: { fideicomisoId: fid.id }});
  for (const f of data.fideicomitentes) {
    await prisma.fideicomitente.create({
      data: {
        fideicomisoId: fid.id,
        nombre: f.nombre,
        nit: f.nit,
        tipo: f.tipo === "CESIONARIO" ? "CESIONARIO" : f.tipo === "BENEFICIARIO" ? "BENEFICIARIO" : "FIDEICOMITENTE",
        vigenciaDesde: new Date(f.vigenciaDesde),
        vigenciaHasta: f.vigenciaHasta ? new Date(f.vigenciaHasta) : null,
        documentoFuente: f.documentoFuente,
      }
    });
  }

  // 4. Documentos
  await prisma.documento.deleteMany({ where: { fideicomisoId: fid.id }});
  for (const d of data.documentos) {
    await prisma.documento.create({
      data: {
        fideicomisoId: fid.id,
        tipo: d.tipo as TipoDocumento,
        formatoOriginal: d.formatoOriginal as FormatoOriginal,
        nombreArchivo: d.nombreArchivo,
        rutaAlmacenamiento: d.rutaAlmacenamiento,
        contextoUsuario: d.contextoUsuario,
        clasificacion: d.clasificacion,
        cargadoPorId: adminUser.id,
        procesado: true,
      }
    });
  }

  // 5. Contratos
  await prisma.reglaComision.deleteMany({ where: { fideicomisoId: fid.id }});
  await prisma.contrato.deleteMany({ where: { fideicomisoId: fid.id }});
  const contMap = new Map();
  for (const c of data.contratos) {
    const cont = await prisma.contrato.create({
      data: {
        fideicomisoId: fid.id,
        tipo: c.tipo as TipoContrato,
        numero: c.numero,
        fechaFirma: new Date(c.fechaFirma),
        fechaVigencia: new Date(c.fechaVigencia),
        resumen: c.resumen,
        partes: c.partes,
      }
    });
    contMap.set(c.tipo, cont.id);
  }

  // 6. ReglasComision
  for (const r of data.reglasComision) {
    let cId = contMap.values().next().value;
    if (r.documentoFuente?.includes('Contrato') || r.documentoFuente?.includes('Modificación Integral')) cId = contMap.get('CONTRATO_FIDUCIA') || cId;
    
    let tipoFinal = r.tipo as TipoComision;
    
    let versionLabel = "v1 (Contrato Original)";
    if (r.nombre.includes("EFECTIVAMENTE facturada")) versionLabel = "v? (Tarifa observada, sin soporte)";

    const formulaDetalleObj = typeof r.formulaDetalle === 'object' && r.formulaDetalle !== null
      ? { ...r.formulaDetalle, version: versionLabel }
      : { base: 'SMLMV', version: versionLabel };

    await prisma.reglaComision.create({
      data: {
        fideicomisoId: fid.id,
        contratoId: cId,
        tipo: tipoFinal,
        nombre: r.nombre,
        formula: r.formula,
        formulaDetalle: formulaDetalleObj,
        periodicidad: r.periodicidad as PeriodicidadComision,
        condiciones: r.condiciones,
        clausulaFuente: r.clausulaFuente,
        vigenciaDesde: new Date(r.vigenciaDesde),
        vigenciaHasta: r.vigenciaHasta ? new Date(r.vigenciaHasta) : null,
        confianzaExtraccion: r.confianzaExtraccion,
        validada: true,
        validadaPor: adminUser.id,
      }
    });
  }

  // 7. ConvencionesFideicomiso
  await prisma.convencionFideicomiso.deleteMany({ where: { fideicomisoId: fid.id }});
  for (const cv of data.convencionesFideicomiso) {
    await prisma.convencionFideicomiso.create({
      data: {
        fideicomisoId: fid.id,
        tipo: cv.tipo as TipoConvencion,
        nombre: cv.nombre,
        descripcion: cv.descripcion,
        parametros: cv.parametros,
        vigenciaDesde: new Date(cv.vigenciaDesde),
        vigenciaHasta: cv.vigenciaHasta ? new Date(cv.vigenciaHasta) : null,
        registradoPor: adminUser.id,
      }
    });
  }

  // 8. MovimientosContables
  if(data.movimientosContables) {
    await prisma.movimientoContable.deleteMany({ where: { fideicomisoId: fid.id }});
    for (const m of data.movimientosContables) {
      await prisma.movimientoContable.create({
        data: {
          fideicomisoId: fid.id,
          origenERP: m.origenERP as OrigenERP,
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
        }
      });
    }
  }

  // 9. Facturas and recaudos
  if(data.facturas) {
    await prisma.factura.deleteMany({ where: { fideicomisoId: fid.id }});
    
    // Aggregate duplicate facturas (which are actually line items for a single physical invoice)
    const aggregatedFacturas = new Map<string, any>();
    
    for (const f of data.facturas) {
      if (aggregatedFacturas.has(f.numeroFactura)) {
        const existing = aggregatedFacturas.get(f.numeroFactura);
        existing.monto += f.monto || 0;
        existing.iva += f.iva || 0;
        existing.total += (f.total || (f.monto + (f.iva || 0))) || 0;
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
      const fact = await prisma.factura.create({
        data: {
          fideicomisoId: fid.id,
          numeroFactura: f.numeroFactura,
          fecha: new Date(f.fecha),
          concepto: f.concepto,
          monto: f.monto || 0,
          iva: f.iva || 0,
          total: f.total || ((f.monto || 0) + (f.iva || 0)),
          estado: f.estado,
          periodoContable: f.periodoContable,
          codigoSuper: f.codigoSuper,
        }
      });

      if (f.recaudos && f.recaudos.length > 0) {
        for (const rec of f.recaudos) {
          await prisma.recaudo.create({
            data: {
              facturaId: fact.id,
              fecha: new Date(rec.fecha),
              monto: rec.monto,
              referencia: rec.referencia,
              medioPago: rec.medioPago,
            }
          });
        }
      }
    }
  }

  // 10. Conciliaciones and res
  if(data.conciliaciones) {
    await prisma.conciliacion.deleteMany({ where: { fideicomisoId: fid.id }});
    for (const cc of data.conciliaciones) {
      const conc = await prisma.conciliacion.create({
        data: {
          fideicomisoId: fid.id,
          periodo: cc.periodo,
          tipo: cc.tipo,
          estado: cc.estado,
          resumen: cc.resumen,
          completadaEn: new Date(),
        }
      });

      if (cc.resultadosConciliacion) {
        for (const rc of cc.resultadosConciliacion) {
          await prisma.resultadoConciliacion.create({
            data: {
              conciliacionId: conc.id,
              periodo: rc.periodo,
              estado: rc.estado as any,
              montoEsperado: rc.montoEsperado,
              montoRegistrado: rc.montoRegistrado,
              discrepancia: rc.discrepancia,
              confianza: rc.confianza,
              evidencia: rc.evidencia,
              razonamiento: rc.razonamiento,
              variableMacro: rc.variableMacro,
            }
          });
        }
      }
    }
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

  // 11. Hallazgos
  await prisma.hallazgo.deleteMany({ where: { fideicomisoId: fid.id }});
  // Subcategoria mapping for Royal 26 hallazgos
  const subcategoriaMap: Record<string, SubcategoriaHallazgo> = {
    'H-001': 'REVENUE_NO_CAPTURADO', // Subfacturación sistémica 3→1 SMMLV
    'H-002': 'CARTERA_VENCIDA',      // 69 facturas emitidas sin recaudo
    'H-005': 'REVENUE_NO_CAPTURADO', // Intereses de mora no gestionados
    'H-006': 'CARTERA_VENCIDA',      // 4 años sin cobro, facturas emitidas
    'H-008': 'REVENUE_NO_CAPTURADO', // Comisiones asamblea nunca facturadas
    'H-011': 'REVENUE_NO_CAPTURADO', // Subfacturación 2016 (2.5 vs 3 SMMLV)
    'H-012': 'REVENUE_NO_CAPTURADO', // Comisión CCP posiblemente no facturada
    'H-015': 'REVENUE_NO_CAPTURADO', // Cesiones posiblemente no facturadas
  };

  for (const h of data.hallazgos) {
    const areaE = h.area ? h.area as AreaHallazgo : 'OPERATIVA';
    let severidadE: SeveridadHallazgo = 'INFORMATIVO';
    if(h.severidad === 'BAJA' || h.severidad === 'BAJO') severidadE = 'BAJO';
    if(h.severidad === 'MEDIA' || h.severidad === 'MEDIO') severidadE = 'MEDIO';
    if(h.severidad === 'ALTA' || h.severidad === 'ALTO') severidadE = 'ALTO';
    if(h.severidad === 'CRITICO' || h.severidad === 'CRITICA') severidadE = 'CRITICO';

    await prisma.hallazgo.create({
      data: {
        fideicomisoId: fid.id,
        tipo: h.tipo as TipoHallazgo,
        severidad: severidadE,
        categoria: h.categoria as CategoriaHallazgo,
        subcategoria: subcategoriaMap[h.id] || 'ANOMALIA',
        area: areaE,
        titulo: h.titulo.substring(0, 100).replace(/^(OPERATIVA|FACTURACION|CONTABILIDAD|LEGAL)\s*:\s*/i, ''),
        descripcion: h.descripcion_operativa || h.descripcion,
        razonamiento: JSON.stringify({
          reglaCitada: h.regla_citada,
          variableAplicada: h.variable_aplicada,
          calculoEsperado: formatCalculo(h.calculo_esperado),
          evidenciaEncontrada: Array.isArray(h.evidencia_encontrada) 
            ? h.evidencia_encontrada.map((e: string) => `- ${e}`).join('\n') 
            : h.evidencia_encontrada,
          conclusion: h.conclusion,
          riesgoIdentificado: h.riesgo
        }, null, 2),
        fuentes: h.documentos_fuente || h.fuentes,
        impactoEconomico: h.impacto_economico !== undefined ? h.impacto_economico : null,
        estado: h.estado as EstadoHallazgo,
      }
    });
  }

  console.log('Seed de FA-2594 (Hotel Urban Royal 26) completado correctamente!');
}

main()
  .catch((e) => {
    console.error('Seed falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
