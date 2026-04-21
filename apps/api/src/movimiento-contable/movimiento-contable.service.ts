import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MovimientoContableService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    fideicomisoId?: string;
    periodoContable?: string;
    cuenta?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.fideicomisoId) where.fideicomisoId = query.fideicomisoId;
    if (query.periodoContable) where.periodoContable = query.periodoContable;
    if (query.cuenta) where.cuenta = { startsWith: query.cuenta };

    const [items, total] = await Promise.all([
      this.prisma.movimientoContable.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
        },
      }),
      this.prisma.movimientoContable.count({ where }),
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
    const movimiento = await this.prisma.movimientoContable.findUnique({
      where: { id },
      include: {
        fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
      },
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento contable ${id} not found`);
    }

    return { data: movimiento };
  }
}
