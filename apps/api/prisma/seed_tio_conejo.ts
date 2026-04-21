import { PrismaClient, TipoDocumento, FormatoOriginal, OrigenERP, TipoContrato, TipoComision, PeriodicidadComision, TipoConvencion, TipoHallazgo, SeveridadHallazgo, CategoriaHallazgo, SubcategoriaHallazgo, EstadoHallazgo, AreaHallazgo } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@dis.com.co' } });
  if (!adminUser) throw new Error("Admin user not found. Please run regular seed first.");

  const jsonPath = path.resolve(__dirname, '../../../data/json_extraidos/auditoria_fideicomiso_altos_tio_conejo (1).json');
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
        tipo: f.tipo,
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

  // Eliminar dependencias en orden correcto para evitar P2003
  await prisma.hallazgo.deleteMany({ where: { fideicomisoId: fid.id }});
  await prisma.conciliacion.deleteMany({ where: { fideicomisoId: fid.id }});
  await prisma.reglaComision.deleteMany({ where: { fideicomisoId: fid.id }});
  
  // 5. Contratos
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
    if (r.documentoFuente.includes('Contrato')) cId = contMap.get('CONTRATO_FIDUCIA') || cId;
    if (r.documentoFuente.includes('Otrosí')) cId = contMap.get('OTROSI_FIDUCIA') || cId;
    
    await prisma.reglaComision.create({
      data: {
        fideicomisoId: fid.id,
        contratoId: cId,
        tipo: r.tipo as TipoComision,
        nombre: r.nombre,
        formula: r.formula,
        formulaDetalle: r.formulaDetalle,
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

  // 9. Facturas and recaudos
  await prisma.factura.deleteMany({ where: { fideicomisoId: fid.id }});
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
        total: f.total || (f.monto + (f.iva || 0)),
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

  // 10. Conciliaciones and res
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

  // 11. Hallazgos
  const formatCalculo = (obj: any, indent = 0): string => {
    if (!obj) return '';
    if (typeof obj !== 'object') return String(obj);
    let result = '';
    const spaces = '  '.repeat(indent);
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        result += `${spaces}- **${key}**:\n${formatCalculo(value, indent + 1)}`;
      } else {
        result += `${spaces}- **${key}**: ${value}\n`;
      }
    }
    return result;
  };

  // Subcategoria mapping for Tio Conejo hallazgos
  const subcategoriaMap: Record<string, SubcategoriaHallazgo> = {
    'H-001': 'CARTERA_VENCIDA',  // Comisiones facturadas, pendientes de recaudo
    'H-003': 'RIESGO_NEGATIVO',  // Subfacturación mensual FC70-63568
  };

  for (const h of data.hallazgos) {
    const razonamientoObj = {
      reglaCitada: h.regla_citada || null,
      variableAplicada: h.variable_aplicada || null,
      calculoEsperado: h.calculo_esperado ? formatCalculo(h.calculo_esperado) : null,
      evidenciaEncontrada: Array.isArray(h.evidencia_encontrada) ? h.evidencia_encontrada.join('\n') : (h.evidencia_encontrada || null),
      conclusion: h.conclusion || null,
      riesgoIdentificado: h.riesgo || null,
    };

    await prisma.hallazgo.create({
      data: {
        fideicomisoId: fid.id,
        tipo: h.tipo as TipoHallazgo,
        severidad: h.severidad as SeveridadHallazgo,
        categoria: h.categoria as CategoriaHallazgo,
        subcategoria: subcategoriaMap[h.id] || 'ANOMALIA',
        area: h.area ? h.area as AreaHallazgo : null,
        titulo: h.titulo,
        descripcion: h.descripcion_operativa || h.descripcion,
        razonamiento: JSON.stringify(razonamientoObj),
        fuentes: h.documentos_fuente || h.fuentes,
        reglaAplicada: h.reglaAplicada,
        variableMacro: h.variableMacro,
        impactoEconomico: typeof h.impacto_economico === 'number' ? h.impacto_economico : (h.impactoEconomico || null),
        estado: h.estado as EstadoHallazgo,
      }
    });
  }

  console.log('Seed de Tio Conejo completado correctamente!');
}

main()
  .catch((e) => {
    console.error('Seed falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
