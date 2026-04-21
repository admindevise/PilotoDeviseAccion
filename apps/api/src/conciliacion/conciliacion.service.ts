import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConciliacionService {
  private readonly logger = new Logger(ConciliacionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { estado?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.estado) where.estado = query.estado;

    const [items, total] = await Promise.all([
      this.prisma.conciliacion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { iniciadaEn: 'desc' },
        include: {
          fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
          _count: { select: { resultados: true } },
        },
      }),
      this.prisma.conciliacion.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findByFideicomiso(
    fideicomisoId: string,
    query: { estado?: string; page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { fideicomisoId };
    if (query.estado) where.estado = query.estado;

    const [items, total] = await Promise.all([
      this.prisma.conciliacion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { iniciadaEn: 'desc' },
        include: {
          _count: { select: { resultados: true } },
        },
      }),
      this.prisma.conciliacion.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async trigger(
    fideicomisoId: string,
    data: { periodo: string; tipo: string },
  ) {
    const fideicomiso = await this.prisma.fideicomiso.findUnique({
      where: { id: fideicomisoId },
    });
    if (!fideicomiso) {
      throw new NotFoundException(`Fideicomiso ${fideicomisoId} not found`);
    }

    const conciliacion = await this.prisma.conciliacion.create({
      data: {
        fideicomisoId,
        periodo: data.periodo,
        tipo: data.tipo,
        estado: 'EN_PROGRESO',
      },
    });

    // Create timeline event
    await this.prisma.eventoTimeline.create({
      data: {
        fideicomisoId,
        tipo: 'CONCILIACION_EJECUTADA',
        fecha: new Date(),
        titulo: `Conciliación ${data.tipo} iniciada para periodo ${data.periodo}`,
        referenciaId: conciliacion.id,
        referenciaTipo: 'Conciliacion',
      },
    });

    // Trigger AI pipeline asynchronously
    this.executeReconciliationPipeline(conciliacion.id, fideicomisoId, data.periodo).catch(
      (err) => this.logger.error(`Pipeline error for conciliacion ${conciliacion.id}: ${err.message}`),
    );

    return { data: conciliacion };
  }

  private async executeReconciliationPipeline(
    conciliacionId: string,
    fideicomisoId: string,
    periodo: string,
  ) {
    try {
      // Fetch documents for this fideicomiso
      const documentos = await this.prisma.documento.findMany({
        where: { fideicomisoId },
        select: { id: true, nombreArchivo: true, textoExtraido: true, contextoUsuario: true },
      });

      // Fetch existing commission rules
      const contratos = await this.prisma.contrato.findMany({
        where: { fideicomisoId },
        include: { reglasComision: true },
      });
      const existingRules = contratos.flatMap((c) => c.reglasComision);

      // Fetch macro variables valid for the period
      const periodoDate = new Date(`${periodo}-01`);
      const macroValues = await this.prisma.valorHistoricoVariable.findMany({
        where: {
          vigenciaDesde: { lte: periodoDate },
          OR: [
            { vigenciaHasta: null },
            { vigenciaHasta: { gte: periodoDate } },
          ],
        },
        include: { variable: true },
      });

      // Dynamically import ai-engine to avoid hard dependency at module load
      // @ts-ignore - ai-engine is a runtime dependency not compiled for this service
      const { runReconciliationPipeline } = await import('@fideicomiso/ai-engine');

      const report = await runReconciliationPipeline({
        fideicomisoId,
        periodo,
        documents: documentos
          .filter((d) => d.textoExtraido)
          .map((d) => ({
            id: d.id,
            filename: d.nombreArchivo,
            content: d.textoExtraido!,
            userContext: d.contextoUsuario || undefined,
          })),
        existingRules: existingRules as any,
        macroVariables: macroValues.map((v) => ({
          codigo: v.variable.codigo,
          valor: v.valor,
          anio: v.vigenciaDesde.getFullYear(),
        })),
        onProgress: (state) => {
          this.logger.log(`Conciliacion ${conciliacionId}: ${state.phase} (${state.progress}%)`);
        },
      });

      // Persist results
      for (const resultado of report.resultadosConciliacion) {
        await this.prisma.resultadoConciliacion.create({
          data: {
            conciliacionId,
            reglaComisionId: resultado.reglaComisionId.startsWith('extracted-')
              ? undefined
              : resultado.reglaComisionId,
            estado: resultado.estado as any,
            montoEsperado: resultado.montoEsperado,
            montoRegistrado: resultado.montoRegistrado,
            discrepancia: resultado.discrepancia,
            confianza: resultado.confianza,
            razonamiento: resultado.razonamiento,
            periodo,
            evidencia: resultado.evidencia as any,
          },
        });
      }

      // Create hallazgos from anomalies
      for (const anomalia of report.anomalias) {
        await this.prisma.hallazgo.create({
          data: {
            fideicomisoId,
            tipo: anomalia.tipo as any,
            severidad: anomalia.severidad as any,
            categoria: anomalia.categoria as any,
            titulo: anomalia.descripcion.slice(0, 200),
            descripcion: anomalia.descripcion,
            razonamiento: anomalia.recomendacion,
            fuentes: anomalia.evidencia,
            impactoEconomico: anomalia.impactoEconomico || 0,
            estado: 'ABIERTO',
          },
        });
      }

      // Update conciliacion as completed
      await this.prisma.conciliacion.update({
        where: { id: conciliacionId },
        data: {
          estado: 'COMPLETADA',
          completadaEn: new Date(),
          resumen: {
            ...report.resumen,
            tokensUsed: report.tokensUsed,
          } as any,
        },
      });

      this.logger.log(
        `Conciliacion ${conciliacionId} completed: ${report.resumen.conciliados} conciliados, ${report.resumen.discrepancias} discrepancias`,
      );
    } catch (err) {
      await this.prisma.conciliacion.update({
        where: { id: conciliacionId },
        data: { estado: 'ERROR' },
      });
      throw err;
    }
  }

  async findOne(id: string) {
    const conciliacion = await this.prisma.conciliacion.findUnique({
      where: { id },
      include: {
        fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
        _count: { select: { resultados: true } },
      },
    });

    if (!conciliacion) {
      throw new NotFoundException(`Conciliacion ${id} not found`);
    }

    return { data: conciliacion };
  }

  async getResultados(
    conciliacionId: string,
    query: { estado?: string; page?: number; limit?: number },
  ) {
    const conciliacion = await this.prisma.conciliacion.findUnique({
      where: { id: conciliacionId },
    });
    if (!conciliacion) {
      throw new NotFoundException(`Conciliacion ${conciliacionId} not found`);
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { conciliacionId };
    if (query.estado) where.estado = query.estado;

    const [items, total] = await Promise.all([
      this.prisma.resultadoConciliacion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reglaComision: {
            select: { id: true, nombre: true, tipo: true, formula: true },
          },
          hallazgo: {
            select: { id: true, tipo: true, severidad: true, estado: true },
          },
        },
      }),
      this.prisma.resultadoConciliacion.count({ where }),
    ]);

    // Compute summary statistics
    const summary = {
      conciliados: items.filter((r) => r.estado === 'CONCILIADO').length,
      discrepancias: items.filter((r) => r.estado === 'DISCREPANCIA').length,
      noEncontrados: items.filter((r) => r.estado === 'NO_ENCONTRADO').length,
      noFacturados: items.filter((r) => r.estado === 'NO_FACTURADO').length,
      oportunidades: items.filter((r) => r.estado === 'OPORTUNIDAD_REVENUE').length,
      anomalias: items.filter((r) => r.estado === 'ANOMALIA').length,
    };

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), summary },
    };
  }
}
