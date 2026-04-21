import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecaudoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { facturaId?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.facturaId) where.facturaId = query.facturaId;

    const [items, total] = await Promise.all([
      this.prisma.recaudo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          factura: { 
            include: { 
              fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } }
            } 
          },
        },
      }),
      this.prisma.recaudo.count({ where }),
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
    const recaudo = await this.prisma.recaudo.findUnique({
      where: { id },
      include: {
        factura: {
          include: {
            fideicomiso: { select: { id: true, codigoPrincipal: true, nombre: true } },
          },
        },
      },
    });

    if (!recaudo) {
      throw new NotFoundException(`Recaudo ${id} not found`);
    }

    return { data: recaudo };
  }
}
