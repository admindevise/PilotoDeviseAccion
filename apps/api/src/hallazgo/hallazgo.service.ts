import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit-table';

const VALID_TRANSITIONS: Record<string, string[]> = {
  ABIERTO: ['EN_GESTION', 'DESCARTADO'],
  EN_GESTION: ['RESUELTO', 'DESCARTADO', 'EXCEPCION'],
  RESUELTO: [],
  DESCARTADO: ['ABIERTO'],
  EXCEPCION: [],
};

@Injectable()
export class HallazgoService {
  constructor(private readonly prisma: PrismaService) {}

  async findByFideicomiso(
    fideicomisoId: string,
    query: {
      estado?: string;
      severidad?: string;
      categoria?: string;
      tipo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 1000;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { fideicomisoId };
    if (query.estado) where.estado = query.estado;
    if (query.severidad) where.severidad = query.severidad;
    if (query.categoria) where.categoria = query.categoria;
    if (query.tipo) where.tipo = query.tipo;

    const [items, total] = await Promise.all([
      this.prisma.hallazgo.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ severidad: 'asc' }, { createdAt: 'desc' }],
        include: {
          asignadoA: { select: { id: true, name: true } },
          _count: { select: { resoluciones: true } },
        },
      }),
      this.prisma.hallazgo.count({ where }),
    ]);

    // Compute aggregations
    const byEstado = await this.prisma.hallazgo.groupBy({
      by: ['estado'],
      where: { fideicomisoId },
      _count: true,
    });

    const bySeveridad = await this.prisma.hallazgo.groupBy({
      by: ['severidad'],
      where: { fideicomisoId },
      _count: true,
    });

    const totalImpacto = await this.prisma.hallazgo.aggregate({
      where: { fideicomisoId, impactoEconomico: { not: null } },
      _sum: { impactoEconomico: true },
    });

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        aggregations: {
          byEstado: byEstado.reduce((acc, g) => ({ ...acc, [g.estado]: g._count }), {}),
          bySeveridad: bySeveridad.reduce((acc, g) => ({ ...acc, [g.severidad]: g._count }), {}),
          totalImpactoEconomico: totalImpacto._sum.impactoEconomico || 0,
        },
      },
    };
  }

  async findAll(query: {
    estado?: string;
    severidad?: string;
    categoria?: string;
    tipo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 1000;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.estado) where.estado = query.estado;
    if (query.severidad) where.severidad = query.severidad;
    if (query.categoria) where.categoria = query.categoria;
    if (query.tipo) where.tipo = query.tipo;

    const [items, total] = await Promise.all([
      this.prisma.hallazgo.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ severidad: 'asc' }, { createdAt: 'desc' }],
        include: {
          fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
          asignadoA: { select: { id: true, name: true } },
        },
      }),
      this.prisma.hallazgo.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const hallazgo = await this.prisma.hallazgo.findUnique({
      where: { id },
      include: {
        fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
        resultadoConciliacion: true,
        asignadoA: { select: { id: true, name: true, email: true } },
        resoluciones: {
          include: {
            resueltoPor: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        historialCambios: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!hallazgo) {
      throw new NotFoundException(`Hallazgo ${id} not found`);
    }

    return { data: hallazgo };
  }

  async changeEstado(id: string, data: { estado: string; asignadoAId?: string; justificacion?: string; userId?: string }) {
    const hallazgo = await this.prisma.hallazgo.findUnique({ where: { id } });
    if (!hallazgo) {
      throw new NotFoundException(`Hallazgo ${id} not found`);
    }

    const allowed = VALID_TRANSITIONS[hallazgo.estado] || [];
    if (!allowed.includes(data.estado)) {
      throw new BadRequestException(
        `Invalid state transition from ${hallazgo.estado} to ${data.estado}. Allowed: ${allowed.join(', ')}`,
      );
    }

    const updateData: Record<string, unknown> = { estado: data.estado };
    if (data.asignadoAId) updateData.asignadoAId = data.asignadoAId;

    const updated = await this.prisma.hallazgo.update({
      where: { id },
      data: updateData,
      include: {
        asignadoA: { select: { id: true, name: true } },
      },
    });

    // Log state change in historial
    if (data.userId) {
      await this.prisma.historialCambioHallazgo.create({
        data: {
          hallazgoId: id,
          tipo: 'CAMBIO_ESTADO',
          campo: 'estado',
          valorAnterior: hallazgo.estado,
          valorNuevo: data.estado,
          justificacion: data.justificacion || `Cambio de estado de ${hallazgo.estado} a ${data.estado}`,
          userId: data.userId,
        },
      });
    }

    return { data: updated };
  }

  async addResolucion(
    hallazgoId: string,
    data: {
      tipo: string;
      explicacion: string;
      adjuntos?: unknown;
      resueltoPorId: string;
    },
  ) {
    const hallazgo = await this.prisma.hallazgo.findUnique({ where: { id: hallazgoId } });
    if (!hallazgo) {
      throw new NotFoundException(`Hallazgo ${hallazgoId} not found`);
    }

    const resolucion = await this.prisma.resolucionHallazgo.create({
      data: {
        hallazgoId,
        tipo: data.tipo as any,
        explicacion: data.explicacion,
        adjuntos: data.adjuntos as any,
        resueltoPorId: data.resueltoPorId,
      },
      include: {
        resueltoPor: { select: { id: true, name: true } },
      },
    });

    // Automatically transition hallazgo state based on resolution type
    const newEstado =
      data.tipo === 'DESCARTADO' ? 'DESCARTADO'
      : data.tipo === 'EXCEPCION_ACEPTADA' ? 'EXCEPCION'
      : 'RESUELTO';

    await this.prisma.hallazgo.update({
      where: { id: hallazgoId },
      data: { estado: newEstado },
    });

    // Log resolution in historial for traceability
    await this.prisma.historialCambioHallazgo.create({
      data: {
        hallazgoId,
        tipo: 'RESOLUCION',
        campo: 'estado',
        valorAnterior: hallazgo.estado,
        valorNuevo: newEstado,
        justificacion: `[${data.tipo.replace(/_/g, ' ')}] ${data.explicacion}`,
        userId: data.resueltoPorId,
        metadata: { tipoResolucion: data.tipo, resolucionId: resolucion.id },
      },
    });

    // Create timeline event
    await this.prisma.eventoTimeline.create({
      data: {
        fideicomisoId: hallazgo.fideicomisoId,
        tipo: 'HALLAZGO_RESUELTO',
        fecha: new Date(),
        titulo: `Hallazgo resuelto: ${hallazgo.titulo}`,
        descripcion: data.explicacion,
        referenciaId: hallazgoId,
        referenciaTipo: 'Hallazgo',
      },
    });

    return { data: resolucion };
  }

  // ============================================================
  // BITÁCORA DE GESTIÓN — Edición con Trazabilidad Completa
  // ============================================================

  private readonly EDITABLE_FIELDS: Record<string, { tipo: string; validate?: (v: string) => boolean }> = {
    severidad: { tipo: 'CAMBIO_SEVERIDAD', validate: (v) => ['CRITICO', 'ALTO', 'MEDIO', 'BAJO', 'INFORMATIVO'].includes(v) },
    categoria: { tipo: 'CAMBIO_CATEGORIA', validate: (v) => ['CONCILIACION', 'REVENUE', 'ANOMALIA', 'CONSISTENCIA'].includes(v) },
    subcategoria: { tipo: 'CAMBIO_SUBCATEGORIA', validate: (v) => ['REVENUE_NO_CAPTURADO', 'CARTERA_VENCIDA', 'RIESGO_NEGATIVO', 'ANOMALIA'].includes(v) },
    area: { tipo: 'CAMBIO_AREA', validate: (v) => ['LEGAL', 'CONTABILIDAD', 'FACTURACION', 'COMERCIAL', 'OPERATIVA'].includes(v) },
    impactoEconomico: { tipo: 'CAMBIO_IMPACTO_ECONOMICO' },
    validacion: { tipo: 'CAMBIO_VALIDACION', validate: (v) => ['PENDIENTE', 'CONFIRMADO', 'PARCIALMENTE_CONFIRMADO', 'FALSO_POSITIVO'].includes(v) },
  };

  async updateHallazgo(
    id: string,
    data: {
      cambios: Record<string, unknown>;
      justificacion: string;
      userId: string;
    },
  ) {
    const hallazgo = await this.prisma.hallazgo.findUnique({ where: { id } });
    if (!hallazgo) {
      throw new NotFoundException(`Hallazgo ${id} not found`);
    }

    if (!data.justificacion?.trim()) {
      throw new BadRequestException('Se requiere una justificación para cada cambio');
    }

    const updateData: Record<string, unknown> = {};
    const historialEntries: Array<{
      hallazgoId: string;
      tipo: string;
      campo: string;
      valorAnterior: string;
      valorNuevo: string;
      justificacion: string;
      userId: string;
    }> = [];

    for (const [campo, nuevoValor] of Object.entries(data.cambios)) {
      const fieldConfig = this.EDITABLE_FIELDS[campo];
      if (!fieldConfig) {
        throw new BadRequestException(`El campo '${campo}' no es editable`);
      }

      const valorStr = String(nuevoValor);
      if (fieldConfig.validate && !fieldConfig.validate(valorStr)) {
        throw new BadRequestException(`Valor '${valorStr}' no válido para el campo '${campo}'`);
      }

      const valorAnterior = (hallazgo as any)[campo];
      if (String(valorAnterior) === valorStr) continue; // Skip unchanged

      // Handle type conversion for numeric fields
      if (campo === 'impactoEconomico') {
        updateData[campo] = nuevoValor === null ? null : parseFloat(valorStr);
      } else {
        updateData[campo] = nuevoValor;
      }

      historialEntries.push({
        hallazgoId: id,
        tipo: fieldConfig.tipo,
        campo,
        valorAnterior: valorAnterior != null ? String(valorAnterior) : 'null',
        valorNuevo: valorStr,
        justificacion: data.justificacion,
        userId: data.userId,
      });
    }

    if (Object.keys(updateData).length === 0) {
      return { data: hallazgo, cambios: [] };
    }

    // Update hallazgo fields
    const updated = await this.prisma.hallazgo.update({
      where: { id },
      data: updateData,
      include: {
        fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
        asignadoA: { select: { id: true, name: true } },
      },
    });

    // Create historial entries for each changed field
    const createdHistorial = await Promise.all(
      historialEntries.map((entry) =>
        this.prisma.historialCambioHallazgo.create({
          data: entry as any,
          include: { user: { select: { id: true, name: true } } },
        }),
      ),
    );

    return { data: updated, cambios: createdHistorial };
  }

  async addComentario(
    hallazgoId: string,
    data: {
      contenido: string;
      tipo?: 'COMENTARIO' | 'NOTA_GESTION';
      userId: string;
    },
  ) {
    const hallazgo = await this.prisma.hallazgo.findUnique({ where: { id: hallazgoId } });
    if (!hallazgo) {
      throw new NotFoundException(`Hallazgo ${hallazgoId} not found`);
    }

    if (!data.contenido?.trim()) {
      throw new BadRequestException('El comentario no puede estar vacío');
    }

    const comentario = await this.prisma.historialCambioHallazgo.create({
      data: {
        hallazgoId,
        tipo: data.tipo || 'COMENTARIO',
        justificacion: data.contenido,
        userId: data.userId,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return { data: comentario };
  }

  async updateConfianzaIA(
    hallazgoId: string,
    data: { confianzaIA: number; notasRevisor?: string; userId: string },
  ) {
    const hallazgo = await this.prisma.hallazgo.findUnique({ where: { id: hallazgoId } });
    if (!hallazgo) {
      throw new NotFoundException(`Hallazgo ${hallazgoId} not found`);
    }

    if (data.confianzaIA < 1 || data.confianzaIA > 5) {
      throw new BadRequestException('La confianza IA debe ser entre 1 y 5');
    }

    const updateData: Record<string, unknown> = { confianzaIA: data.confianzaIA };
    if (data.notasRevisor !== undefined) {
      updateData.notasRevisor = data.notasRevisor;
    }

    const updated = await this.prisma.hallazgo.update({
      where: { id: hallazgoId },
      data: updateData,
    });

    // Log the AI confidence rating
    await this.prisma.historialCambioHallazgo.create({
      data: {
        hallazgoId,
        tipo: 'NOTA_GESTION',
        campo: 'confianzaIA',
        valorAnterior: hallazgo.confianzaIA ? String(hallazgo.confianzaIA) : 'null',
        valorNuevo: String(data.confianzaIA),
        justificacion: data.notasRevisor || `Calificación de confianza IA: ${data.confianzaIA}/5`,
        userId: data.userId,
      },
    });

    return { data: updated };
  }

  async getHistorial(hallazgoId: string) {
    const hallazgo = await this.prisma.hallazgo.findUnique({ where: { id: hallazgoId } });
    if (!hallazgo) {
      throw new NotFoundException(`Hallazgo ${hallazgoId} not found`);
    }

    const historial = await this.prisma.historialCambioHallazgo.findMany({
      where: { hallazgoId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: historial };
  }

  async generatePdfReport(res: any) {
    const hallazgos = await this.prisma.hallazgo.findMany({
      include: {
        fideicomiso: { select: { codigoPrincipal: true, nombre: true } },
      },
      orderBy: [{ severidad: 'asc' }, { createdAt: 'desc' }],
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-hallazgos.pdf');
    doc.pipe(res);

    // Modern Header
    doc.rect(0, 0, doc.page.width, 80).fill('#0f172a'); // slate-900 matching the UI sidebar
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('Reporte Consolidado de Hallazgos', 40, 25);
    doc.fontSize(10).font('Helvetica').text(`Generado el: ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`, 40, 55);
    
    doc.moveDown(4);
    doc.fillColor('#0f172a');

    // Section 1: Summary Table
    doc.fontSize(14).font('Helvetica-Bold').text('1. Resumen de Hallazgos', { underline: false });
    doc.moveDown(0.5);

    const formatCurrency = (val: number | null) => val ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val) : 'N/A';

    const table = {
      headers: [
        { label: 'Fideicomiso', property: 'fideicomiso', width: 70, align: 'left' },
        { label: 'Título', property: 'titulo', width: 200, align: 'left' },
        { label: 'Área', property: 'area', width: 60, align: 'left' },
        { label: 'Severidad', property: 'severidad', width: 65, align: 'center' },
        { label: 'Estado', property: 'estado', width: 60, align: 'center' },
        { label: 'Impacto ($)', property: 'impacto', width: 65, align: 'right' },
      ],
      datas: hallazgos.map((h) => ({
        fideicomiso: h.fideicomiso.codigoPrincipal,
        titulo: h.titulo,
        area: h.area || 'N/A',
        severidad: h.severidad,
        estado: h.estado,
        impacto: formatCurrency(h.impactoEconomico),
      })),
    };

    await doc.table(table, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155'),
      prepareRow: () => doc.font('Helvetica').fontSize(8).fillColor('#475569'),
    });

    doc.addPage();

    // Section 2: Detailed Breakdown
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('2. Detalle de Hallazgos', { underline: false });
    doc.moveDown(1);

    for (let i = 0; i < hallazgos.length; i++) {
        const h = hallazgos[i];
        
        // Ensure we don't split cards awkwardly
        if (doc.y > doc.page.height - 150) {
            doc.addPage();
        }

        // Draw card background
        const cardY = doc.y;
        doc.rect(40, cardY, doc.page.width - 80, 2).fill('#3b82f6'); // blue-500 accent line
        doc.moveDown(0.5);

        // Header of the card
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text(`Hallazgo #${i + 1}: ${h.titulo}`);
        doc.moveDown(0.2);
        
        // Metadata row
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569')
            .text(`Fideicomiso: `, { continued: true }).font('Helvetica').text(`${h.fideicomiso.codigoPrincipal} - ${h.fideicomiso.nombre}    `, { continued: true })
            .font('Helvetica-Bold').text(`Área: `, { continued: true }).font('Helvetica').text(`${h.area || 'N/A'}    `, { continued: true })
            .font('Helvetica-Bold').text(`Estado: `, { continued: true }).font('Helvetica').text(`${h.estado}`);
            
        doc.moveDown(0.2);
        doc.font('Helvetica-Bold').text(`Severidad: `, { continued: true }).font('Helvetica').text(`${h.severidad}    `, { continued: true })
            .font('Helvetica-Bold').text(`Impacto Económico: `, { continued: true }).font('Helvetica').text(`${formatCurrency(h.impactoEconomico)}`);

        doc.moveDown(0.5);

        // Details
        doc.font('Helvetica-Bold').fillColor('#0f172a').text('Descripción:');
        doc.font('Helvetica').fillColor('#334155').text(h.descripcion, { align: 'justify' });
        doc.moveDown(0.3);

        doc.font('Helvetica-Bold').fillColor('#0f172a').text('Razonamiento (Motor Devise):');
        doc.font('Helvetica').fillColor('#334155').text(h.razonamiento, { align: 'justify' });
        doc.moveDown(0.3);

        if (h.fuentes) {
          doc.font('Helvetica-Bold').fillColor('#0f172a').text('Evidencias / Fuentes:');
          try {
            const parsedFuentes = JSON.parse(h.fuentes as string);
            for (const f of parsedFuentes) {
                doc.font('Helvetica').fillColor('#334155').text(`• Fuente: ${f.fuente || 'N/A'}, Sección: ${f.seccion || 'N/A'}`, { indent: 10 });
            }
          } catch(e) {
            doc.font('Helvetica').fillColor('#334155').text(`• ${h.fuentes}`, { indent: 10 });
          }
        }
        
        doc.moveDown(1.5);
    }

    doc.end();
  }

  async generatePdfReportForFideicomiso(fideicomisoId: string, res: any) {
    const fideicomiso = await this.prisma.fideicomiso.findUnique({
      where: { id: fideicomisoId },
    });
    if (!fideicomiso) {
      throw new NotFoundException(`Fideicomiso ${fideicomisoId} not found`);
    }

    const hallazgos = await this.prisma.hallazgo.findMany({
      where: { fideicomisoId },
      orderBy: [{ severidad: 'asc' }, { createdAt: 'desc' }],
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=reporte-auditoria-${fideicomiso.codigoPrincipal}.pdf`,
    );
    doc.pipe(res);

    const formatCurrency = (val: number | null | undefined) =>
      val != null
        ? new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
          }).format(val)
        : '$ 0';

    let totalEvidencias = 0;
    const evidenciasPerHallazgo: Record<string, any[]> = {};
    for (const h of hallazgos) {
      evidenciasPerHallazgo[h.id] = [];
      if (h.fuentes) {
        try {
          const parsed =
            typeof h.fuentes === 'string'
              ? JSON.parse(h.fuentes as string)
              : h.fuentes;
          if (Array.isArray(parsed)) {
            totalEvidencias += parsed.length;
            evidenciasPerHallazgo[h.id] = parsed;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    const totalImpactoValue = hallazgos.reduce(
      (sum, h) => sum + (h.impactoEconomico || 0),
      0,
    );
    const criticasCount = hallazgos.filter((h) => h.severidad === 'CRITICO')
      .length;
    const altaCount = hallazgos.filter((h) => h.severidad === 'ALTO').length;
    const mediaCount = hallazgos.filter((h) => h.severidad === 'MEDIO').length;
    const bajaCount = hallazgos.filter((h) => h.severidad === 'BAJO').length;

    const criticasImpacto = hallazgos
      .filter((h) => h.severidad === 'CRITICO')
      .reduce((sum, h) => sum + (h.impactoEconomico || 0), 0);
    const altaImpacto = hallazgos
      .filter((h) => h.severidad === 'ALTO')
      .reduce((sum, h) => sum + (h.impactoEconomico || 0), 0);
    const mediaImpacto = hallazgos
      .filter((h) => h.severidad === 'MEDIO')
      .reduce((sum, h) => sum + (h.impactoEconomico || 0), 0);
    const bajaImpacto = hallazgos
      .filter((h) => h.severidad === 'BAJO')
      .reduce((sum, h) => sum + (h.impactoEconomico || 0), 0);

    const path = require('path');
    const logoDarkPath = path.resolve(
      process.cwd(),
      '../../data/AccionLogo.png',
    );
    const logoLightPath = logoDarkPath; // Usually standard logo works on white too or user has AccionLogo.png

    // ==========================================
    // PORTADA (PAGE 1)
    // ==========================================
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#172033');

    try {
      doc.image(logoDarkPath, 40, 40, { width: 120 });
    } catch (e) {
      doc
        .fillColor('#ffffff')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('ACCION', 40, 40);
    }

    doc
      .fillColor('#94a3b8')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('GENERADO EL', 0, 40, { align: 'right', width: doc.page.width - 40 });
    doc
      .fillColor('#ffffff')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(
        `${new Date().toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}, ${new Date().toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        0,
        55,
        { align: 'right', width: doc.page.width - 40 },
      );

    doc.moveDown(15);
    const pillY = 320;
    doc
      .roundedRect(40, pillY, 190, 25, 12)
      .fillColor('#3f1d24')
      .fill();
    doc
      .fillColor('#f43f5e')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('REPORTE DE AUDITORÍA', 55, pillY + 8);

    doc
      .fillColor('#94a3b8')
      .fontSize(14)
      .font('Helvetica')
      .text(fideicomiso.codigoPrincipal, 40, pillY + 45);
    doc
      .fillColor('#ffffff')
      .fontSize(32)
      .font('Times-Bold')
      .text(`FIDEICOMISO ${fideicomiso.nombre.toUpperCase()}`, 40, pillY + 70);

    doc
      .fillColor('#cbd5e1')
      .fontSize(14)
      .font('Helvetica')
      .text('Hallazgos de auditoría con detalle de evidencias', 40, doc.y + 15);

    doc.moveDown(3);
    doc
      .fillColor('#94a3b8')
      .fontSize(10)
      .font('Helvetica')
      .text(`Período: 30 de oct de 2022 — 29 de nov de 2025`); // Adjust to real data if present
    doc.moveDown(0.5);
    doc.text(`Auditor: Sistema Devise Auditor`);

    const cardWidth = 110;
    const cardHeight = 70;
    const cardY = 650;
    const spacing = 15;

    const drawDarkCard = (
      x: number,
      title: string,
      value: string,
      valueColor: string,
    ) => {
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 8).fill('#1e293b');
      doc
        .fillColor('#94a3b8')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(title, x + 15, cardY + 15);
      doc
        .fillColor(valueColor)
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(value, x + 15, cardY + 35);
    };

    drawDarkCard(40, 'HALLAZGOS', hallazgos.length.toString(), '#ffffff');
    drawDarkCard(
      40 + cardWidth + spacing,
      'IMPACTO TOTAL',
      formatCurrency(totalImpactoValue),
      '#f43f5e',
    );
    drawDarkCard(
      40 + (cardWidth + spacing) * 2,
      'CRÍTICAS',
      criticasCount.toString(),
      '#f43f5e',
    );
    drawDarkCard(
      40 + (cardWidth + spacing) * 3,
      'EVIDENCIAS',
      totalEvidencias.toString(),
      '#ffffff',
    );

    // ==========================================
    // RESUMEN EJECUTIVO (PAGE 2)
    // ==========================================
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');

    try {
      doc.image(logoLightPath, doc.page.width - 160, 40, { width: 120 });
    } catch (e) {
      doc
        .fillColor('#000000')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('ACCION', doc.page.width - 150, 40);
    }

    doc
      .fillColor('#1e293b')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('RESUMEN EJECUTIVO', 40, 50);
    doc
      .moveTo(40, 75)
      .lineTo(doc.page.width - 40, 75)
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();

    doc
      .roundedRect(40, 100, 240, 90, 8)
      .fill('#fff1f2')
      .strokeColor('#fecdd3')
      .lineWidth(1)
      .stroke();
    doc
      .fillColor('#be123c')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('IMPACTO FINANCIERO TOTAL', 55, 120);
    doc
      .fillColor('#9f1239')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(formatCurrency(totalImpactoValue), 55, 145);

    doc
      .roundedRect(300, 100, 255, 90, 8)
      .fill('#f8fafc')
      .strokeColor('#e2e8f0')
      .lineWidth(1)
      .stroke();
    doc
      .fillColor('#334155')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('TOTAL HALLAZGOS', 315, 120);
    doc
      .fillColor('#0f172a')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(hallazgos.length.toString(), 315, 145);
    doc
      .fillColor('#64748b')
      .fontSize(10)
      .font('Helvetica')
      .text(`${totalEvidencias} evidencias documentadas`, 355, 160);

    doc
      .fillColor('#1e293b')
      .fontSize(11)
      .font('Times-Bold')
      .text('DESGLOSE POR SEVERIDAD', 40, 230);

    const drawSeverityCard = (
      x: number,
      y: number,
      title: string,
      count: string,
      impact: string,
      color: string,
    ) => {
      doc.roundedRect(x, y, 115, 75, 6).fill('#f8fafc');
      doc.rect(x, y, 4, 75).fill(color);
      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica')
        .text(title, x + 15, y + 15);
      doc
        .fillColor('#0f172a')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(count, x + 15, y + 30);
      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica')
        .text(impact, x + 15, y + 55);
    };

    drawSeverityCard(
      40,
      255,
      'CRÍTICA',
      criticasCount.toString(),
      formatCurrency(criticasImpacto),
      '#ef4444',
    );
    drawSeverityCard(
      165,
      255,
      'ALTA',
      altaCount.toString(),
      formatCurrency(altaImpacto),
      '#f97316',
    );
    drawSeverityCard(
      290,
      255,
      'MEDIA',
      mediaCount.toString(),
      formatCurrency(mediaImpacto),
      '#eab308',
    );
    drawSeverityCard(
      415,
      255,
      'BAJA',
      bajaCount.toString(),
      formatCurrency(bajaImpacto),
      '#3b82f6',
    );

    doc
      .fillColor('#1e293b')
      .fontSize(11)
      .font('Times-Bold')
      .text('ÍNDICE DE HALLAZGOS', 40, 360);
    doc.moveDown(1);

    const getSeverityColor = (sev: string) => {
      switch (sev) {
        case 'CRITICO':
          return '#ef4444';
        case 'ALTO':
          return '#f97316';
        case 'MEDIO':
          return '#eab308';
        case 'BAJO':
          return '#3b82f6';
        default:
          return '#94a3b8';
      }
    };

    const indexTable = {
      headers: [
        { label: '#', property: 'idx', width: 25, align: 'center' },
        { label: 'Título', property: 'titulo', width: 235, align: 'left' },
        {
          label: 'Severidad',
          property: 'severidad',
          width: 70,
          align: 'center',
        },
        {
          label: 'Evidencias',
          property: 'evidencias',
          width: 70,
          align: 'center',
        },
        { label: 'Impacto', property: 'impacto', width: 100, align: 'right' },
      ],
      datas: hallazgos.map((h, i) => ({
        idx: (i + 1).toString(),
        titulo:
          h.titulo.length > 55 ? h.titulo.substring(0, 52) + '...' : h.titulo,
        severidad: h.severidad === 'CRITICO' ? 'CRÍTICA' : h.severidad,
        evidencias: evidenciasPerHallazgo[h.id].length.toString(),
        impacto: formatCurrency(h.impactoEconomico),
      })),
    };

    await doc.table(indexTable, {
      x: 40,
      y: doc.y,
      prepareHeader: () =>
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff'),
      prepareRow: (row, indexColumn, indexRow, rectRow) => {
        doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
        if (indexColumn === 4 && row.impacto !== '$ 0') {
          doc.fillColor('#ef4444').font('Helvetica-Bold');
        }
        if (indexColumn === 2 && indexRow !== undefined) {
          doc
            .fillColor(getSeverityColor(hallazgos[indexRow].severidad))
            .font('Helvetica-Bold');
        }
        return doc;
      },
    });

    // ==========================================
    // DETALLES POR HALLAZGO
    // ==========================================
    for (let i = 0; i < hallazgos.length; i++) {
      const h = hallazgos[i];
      doc.addPage();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');

      try {
        doc.image(logoLightPath, doc.page.width - 160, 40, { width: 120 });
      } catch (e) {}

      doc
        .fillColor('#1e293b')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(`HALLAZGO #${i + 1}`, 40, 50);
      doc
        .moveTo(40, 75)
        .lineTo(doc.page.width - 40, 75)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      doc.moveDown(3);
      const contentY = doc.y;

      const drawPill = (
        x: number,
        y: number,
        text: string,
        bgColor: string,
        txtColor: string,
      ) => {
        let theText = text;
        if (theText === 'DISCREPANCIA MONTO') theText = 'Discrepancia Monto';
        if (theText === 'INCONSISTENCIA FUENTES')
          theText = 'Inconsistencia Fuentes';
        doc
          .roundedRect(x, y, doc.widthOfString(theText) + 20, 20, 10)
          .fill(bgColor);
        doc
          .fillColor(txtColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(theText, x + 10, y + 6);
        return x + doc.widthOfString(theText) + 30;
      };

      let nx = 40;
      nx = drawPill(
        nx,
        contentY,
        h.severidad === 'CRITICO' ? 'CRÍTICA' : h.severidad,
        getSeverityColor(h.severidad),
        '#ffffff',
      );
      nx = drawPill(
        nx,
        contentY,
        h.tipo.replace(/_/g, ' '),
        '#f1f5f9',
        '#475569',
      );
      nx = drawPill(
        nx,
        contentY,
        h.estado.replace(/_/g, ' '),
        '#f1f5f9',
        '#475569',
      );

      if (h.impactoEconomico) {
        doc
          .fillColor('#64748b')
          .fontSize(9)
          .font('Helvetica')
          .text('IMPACTO', 0, contentY, {
            align: 'right',
            width: doc.page.width - 40,
          });
        doc
          .fillColor('#b91c1c')
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(formatCurrency(h.impactoEconomico), 0, contentY + 12, {
            align: 'right',
            width: doc.page.width - 40,
          });
      }

      doc.moveDown(4);
      doc
        .fillColor('#0f172a')
        .fontSize(16)
        .font('Times-Bold')
        .text(h.titulo, 40, doc.y);
      doc.moveDown(0.5);
      doc
        .fillColor('#64748b')
        .fontSize(10)
        .font('Helvetica')
        .text(`Período: 30 de oct de 2022 — 29 de jun de 2025`); // Or dynamic if exists
      doc.moveDown(2);

      // Descripción
      doc
        .fillColor('#1e293b')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('DESCRIPCIÓN');
      doc.moveDown(0.5);
      doc
        .fillColor('#475569')
        .fontSize(10)
        .font('Helvetica')
        .text(h.descripcion, { align: 'justify', lineGap: 3 });
      doc.moveDown(2);

      // Documentos Fuente (fuentes is an array of strings)
      const evidencias = evidenciasPerHallazgo[h.id];
      doc
        .fillColor('#1e293b')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`DOCUMENTOS FUENTE (${evidencias.length})`);
      doc.moveDown(0.5);

      if (evidencias.length > 0) {
        const fuentesTable = {
          headers: [
            { label: '#', property: 'idx', width: 30, align: 'center' },
            { label: 'Referencia Documental', property: 'ref', width: 485, align: 'left' },
          ],
          datas: evidencias.map((ev: any, eIdx: number) => ({
            idx: (eIdx + 1).toString(),
            ref: typeof ev === 'string' ? ev : (ev.documento || ev.fuente || JSON.stringify(ev)),
          })),
        };

        await doc.table(fuentesTable, {
          x: 40,
          prepareHeader: () =>
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a'),
          prepareRow: () => {
            doc.font('Helvetica').fontSize(9).fillColor('#334155');
            return doc;
          },
        });
      }

      // Razonamiento Motor Devise (structured JSON from razonamiento field)
      doc.moveDown(2);
      let razonamientoObj: any = null;
      if (h.razonamiento) {
        try {
          razonamientoObj = typeof h.razonamiento === 'string' ? JSON.parse(h.razonamiento) : h.razonamiento;
        } catch (e) {
          // razonamiento is plain text, not JSON
        }
      }

      if (razonamientoObj && typeof razonamientoObj === 'object') {
        doc
          .fillColor('#1e293b')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('RAZONAMIENTO MOTOR DEVISE');
        doc.moveDown(1);

        const sectionLabels: Record<string, string> = {
          reglaCitada: 'Regla Citada',
          variableAplicada: 'Variable Aplicada',
          calculoEsperado: 'Cálculo Esperado',
          evidenciaEncontrada: 'Evidencia Encontrada',
          conclusion: 'Conclusión',
          riesgoIdentificado: 'Riesgo Identificado',
        };

        for (const [key, label] of Object.entries(sectionLabels)) {
          const val = razonamientoObj[key];
          if (!val) continue;

          if (doc.y > doc.page.height - 120) {
            doc.addPage();
          }

          doc
            .fillColor('#1e293b')
            .fontSize(9)
            .font('Helvetica-Bold')
            .text(label.toUpperCase());
          doc.moveDown(0.3);

          const valStr = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val).replace(/\\n/g, '\n');
          doc
            .fillColor('#475569')
            .fontSize(8)
            .font('Helvetica')
            .text(valStr, { align: 'justify', lineGap: 2 });
          doc.moveDown(1);
        }
      } else if (h.razonamiento) {
        // Plain text razonamiento fallback
        if (doc.y > doc.page.height - 120) {
          doc.addPage();
        }
        doc
          .fillColor('#1e293b')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('RAZONAMIENTO MOTOR DEVISE');
        doc.moveDown(0.5);
        doc
          .fillColor('#475569')
          .fontSize(9)
          .font('Helvetica')
          .text(h.razonamiento, { align: 'justify', lineGap: 2 });
        doc.moveDown(1);
      }
    }

    doc.end();
  }
}
