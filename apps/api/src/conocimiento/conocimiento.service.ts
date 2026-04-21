import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConocimientoService {
  constructor(private readonly prisma: PrismaService) {}

  async findByFideicomiso(
    fideicomisoId: string,
    query: { tipo?: string; page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (fideicomisoId !== 'all') {
      where.fideicomisoId = fideicomisoId;
    }
    if (query.tipo) where.tipo = query.tipo;

    const [items, total] = await Promise.all([
      this.prisma.entradaConocimiento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          tipo: true,
          titulo: true,
          metadatos: true,
          fuentes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.entradaConocimiento.count({ where }),
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
      contenido: string;
      metadatos?: unknown;
      fuentes?: unknown;
    },
  ) {
    const fideicomiso = await this.prisma.fideicomiso.findUnique({ where: { id: fideicomisoId } });
    if (!fideicomiso) {
      throw new NotFoundException(`Fideicomiso ${fideicomisoId} not found`);
    }

    const entrada = await this.prisma.entradaConocimiento.create({
      data: {
        fideicomisoId,
        tipo: data.tipo as any,
        titulo: data.titulo,
        contenido: data.contenido,
        metadatos: data.metadatos as any,
        fuentes: data.fuentes as any,
      },
    });

    return { data: entrada };
  }

  async search(query: { q: string; fideicomisoId?: string; tipo?: string; limit?: number }) {
    const limit = query.limit || 20;
    const searchTerm = query.q;

    const where: Record<string, unknown> = {};
    if (query.fideicomisoId) where.fideicomisoId = query.fideicomisoId;
    if (query.tipo) where.tipo = query.tipo;

    // Text search using contains (in production, use full-text search or pgvector)
    where.OR = [
      { titulo: { contains: searchTerm, mode: 'insensitive' } },
      { contenido: { contains: searchTerm, mode: 'insensitive' } },
    ];

    const items = await this.prisma.entradaConocimiento.findMany({
      where,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
      },
    });

    return {
      data: items,
      meta: { count: items.length, query: searchTerm },
    };
  }
}
