import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContratoService {
  constructor(private readonly prisma: PrismaService) {}

  async findByFideicomiso(fideicomisoId: string, query: { tipo?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { fideicomisoId };
    if (query.tipo) where.tipo = query.tipo;

    const [items, total] = await Promise.all([
      this.prisma.contrato.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaFirma: 'desc' },
        include: {
          reglasComision: true,
          documento: { select: { id: true, nombreArchivo: true, tipo: true } },
        },
      }),
      this.prisma.contrato.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(
    fideicomisoId: string,
    data: {
      tipo: string;
      numero?: string;
      fechaFirma: string | Date;
      fechaVigencia: string | Date;
      partes: unknown;
      resumen?: string;
      documentoId?: string;
    },
  ) {
    const fideicomiso = await this.prisma.fideicomiso.findUnique({ where: { id: fideicomisoId } });
    if (!fideicomiso) {
      throw new NotFoundException(`Fideicomiso ${fideicomisoId} not found`);
    }

    const contrato = await this.prisma.contrato.create({
      data: {
        fideicomisoId,
        tipo: data.tipo as any,
        numero: data.numero,
        fechaFirma: new Date(data.fechaFirma),
        fechaVigencia: new Date(data.fechaVigencia),
        partes: data.partes as any,
        resumen: data.resumen,
        documentoId: data.documentoId,
      },
      include: { reglasComision: true },
    });

    // Create timeline event
    await this.prisma.eventoTimeline.create({
      data: {
        fideicomisoId,
        tipo: data.tipo === 'OTROSI_FIDUCIA' || data.tipo === 'OTROSI_PARALELO' ? 'OTROSI' : 'CONSTITUCION',
        fecha: new Date(data.fechaFirma),
        titulo: `Contrato ${data.tipo} ${data.numero || ''} registrado`,
        descripcion: data.resumen || undefined,
        referenciaId: contrato.id,
        referenciaTipo: 'Contrato',
      },
    });

    return { data: contrato };
  }

  async findOne(id: string) {
    const contrato = await this.prisma.contrato.findUnique({
      where: { id },
      include: {
        fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
        reglasComision: true,
        documento: true,
      },
    });

    if (!contrato) {
      throw new NotFoundException(`Contrato ${id} not found`);
    }

    return { data: contrato };
  }

  async getReglas(contratoId: string) {
    const contrato = await this.prisma.contrato.findUnique({ where: { id: contratoId } });
    if (!contrato) {
      throw new NotFoundException(`Contrato ${contratoId} not found`);
    }

    const reglas = await this.prisma.reglaComision.findMany({
      where: { contratoId },
      orderBy: { vigenciaDesde: 'desc' },
    });

    return { data: reglas, meta: { count: reglas.length } };
  }
}
