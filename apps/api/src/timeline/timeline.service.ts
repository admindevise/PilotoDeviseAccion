import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async findByFideicomiso(
    fideicomisoId: string,
    query: { tipo?: string; page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { fideicomisoId };
    if (query.tipo) where.tipo = query.tipo;

    const [items, total] = await Promise.all([
      this.prisma.eventoTimeline.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.eventoTimeline.count({ where }),
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
      titulo: string;
      descripcion?: string;
      fecha?: string | Date;
      referenciaId?: string;
      referenciaTipo?: string;
    },
  ) {
    const fideicomiso = await this.prisma.fideicomiso.findUnique({
      where: { id: fideicomisoId },
    });
    if (!fideicomiso) {
      throw new NotFoundException(`Fideicomiso ${fideicomisoId} not found`);
    }

    const evento = await this.prisma.eventoTimeline.create({
      data: {
        fideicomisoId,
        tipo: data.tipo as any,
        titulo: data.titulo,
        descripcion: data.descripcion,
        fecha: data.fecha ? new Date(data.fecha) : new Date(),
        referenciaId: data.referenciaId,
        referenciaTipo: data.referenciaTipo,
      },
    });

    return { data: evento };
  }
}
