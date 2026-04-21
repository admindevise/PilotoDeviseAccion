import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FacturaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { estado?: string; fideicomisoId?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.estado) where.estado = query.estado;
    if (query.fideicomisoId) where.fideicomisoId = query.fideicomisoId;

    const [items, total] = await Promise.all([
      this.prisma.factura.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
          _count: { select: { recaudos: true } },
        },
      }),
      this.prisma.factura.count({ where }),
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
    const factura = await this.prisma.factura.findUnique({
      where: { id },
      include: {
        fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
        recaudos: { orderBy: { fecha: 'desc' } },
      },
    });

    if (!factura) {
      throw new NotFoundException(`Factura ${id} not found`);
    }

    return { data: factura };
  }
}
